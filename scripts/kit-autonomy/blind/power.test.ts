/**
 * power (Power) — RL/Fire/Attacker/Burst III — BLIND kit spec (S5, written from kit prose alone).
 *
 * KIT (what the text says)
 *   skill1  "…when attacking with Full Charge. Affects self."
 *           Blood Fiend: ATK ▲ 6.4%, up to 5 stacks, 3 sec.
 *   skill2  "…after 18 normal attacks if Blood Fiend is at max stacks. Affects self."
 *           Explosion Radius ▲ 38.61% / 10 sec  +  "Reloads 100% of the magazine"  +  1x per battle.
 *   burst   1584% of final ATK on the single target; a SECOND 1584% instance gated on max stacks.
 *
 * WHOLE-PICTURE (why the kit's own numbers hang together — this picked the assertions)
 *   ammo 6, chargeFrames 60 (1.00s), release latency 22f, reloadFrames 141 (2.35s).
 *   In-magazine shot interval ~82f = 1.37s < 3s  -> stacks accrue 1..5, capping on shot 5 of 6.
 *   Magazine gap (reload + recharge) ~201-223f = 3.35-3.7s > 3s -> Blood Fiend LAPSES at every
 *   reload and rebuilds from 1. And 18 normal attacks = exactly 3 magazines, i.e. the skill2
 *   threshold lands on a shot where the pool is already at max — the kit is self-consistent.
 *   FLAG: this rests on the datamined cadence tuple (rate_of_fire / reloadFrames are the known-
 *   unreliable fields). The lapse assertion is the one that fails first if that tuple is wrong.
 *
 * FIXTURE  controlComp('power', false) — liter B1 + crown B2 still make the chain, so the B3 carry
 *   casts (a lone B3 makes ZERO full bursts). The fixed B3 slot is dropped DELIBERATELY: it is also
 *   a Burst III and would compete with power for the stage-3 cast, making "how many times did power
 *   actually cast" nondeterministic. With it out, power is the sole B3, so every fullBurstStart is
 *   preceded by exactly one power burst cast — that identity is what the burst test counts against.
 *
 * SHAPE-AGNOSTIC COUNTERFACTUALS: the packet documents an override slot as Block[] in one place and
 *   as CharacterSkills{blocks} in another, so every mutation goes through blocksOf()/clearSlot(),
 *   which handle both. power's slot index is DERIVED from her own self-buff event
 *   (casterIdx === targetIdx), never assumed from comp order.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js'; // path fixed 2026-08-03 (driver, shape ONLY): blind/ sits under kit-autonomy/, not tests/units/

const SLUG = 'power';

type Ev = SimEvent & Record<string, any>;
type Slot = 'skill1' | 'skill2' | 'burst';

function idxOf(ev: Ev): number | undefined {
  if (typeof ev.srcSlot === 'number') return ev.srcSlot;
  if (typeof ev.casterIdx === 'number') return ev.casterIdx;
  return undefined;
}

function blocksOf(slot: any): any[] {
  if (Array.isArray(slot)) return slot;
  if (slot && Array.isArray(slot.blocks)) return slot.blocks;
  return [];
}

function clearSlot(ov: any, slot: Slot): void {
  if (Array.isArray(ov[slot])) ov[slot] = [];
  else if (ov[slot] && Array.isArray(ov[slot].blocks)) ov[slot].blocks = [];
}

function eachBuff(ov: any, slot: Slot, fn: (eff: any) => void): void {
  for (const b of blocksOf(ov[slot])) {
    for (const e of b.effects ?? []) if (e.kind === 'buff') fn(e);
  }
}

function run(patched?: unknown) {
  const opts: any = controlComp(SLUG, false);
  if (patched) opts.overrides = { ...(opts.overrides ?? {}), [SLUG]: patched };
  const events: Ev[] = [];
  opts.cfg = {
    ...(opts.cfg ?? {}),
    onEvent: (ev: SimEvent) => {
      events.push(ev as Ev);
    },
  };
  const res = runComp(opts);
  return { res, events, total: totals(res)[SLUG] ?? 0 };
}

const isAtkStat = (s: unknown) => s === 'atkPct' || s === 'casterAtkPct';

// ---- hoisted runs (5 full 180s sims) ----
const base = run();
const noS1 = run(
  withPatchedOverride(SLUG, (ov: any) => {
    clearSlot(ov, 'skill1');
  }),
);
const shortBf = run(
  withPatchedOverride(SLUG, (ov: any) => {
    eachBuff(ov, 'skill1', (e) => {
      if (isAtkStat(e.stat)) e.durationSec = 0.05;
    });
  }),
);
const uncapBf = run(
  withPatchedOverride(SLUG, (ov: any) => {
    eachBuff(ov, 'skill1', (e) => {
      if (isAtkStat(e.stat)) e.maxStacks = 50;
    });
  }),
);
const noS2 = run(
  withPatchedOverride(SLUG, (ov: any) => {
    clearSlot(ov, 'skill2');
  }),
);

// Blood Fiend applies: SELF-cast (casterIdx === targetIdx) ATK buff on power. The self-cast filter
// is what separates it from liter's / crown's ally ATK buffs, which also land on power as atkPct.
const bf = base.events.filter(
  (e) =>
    e.kind === 'buffApply' &&
    e.targetSlug === SLUG &&
    e.casterIdx != null &&
    e.casterIdx === e.targetIdx &&
    isAtkStat(e.stat),
);
const powerIdx = bf.length ? (bf[0].casterIdx as number) : -1;
const powerDamage = base.events.filter(
  (e) => e.kind === 'damage' && idxOf(e) === powerIdx,
);
const burstHits = powerDamage.filter((e) =>
  String(e.bucket ?? '').toLowerCase().includes('burst'),
);
const fbStarts = base.events.filter((e) => e.kind === 'fullBurstStart').length;

describe('power — fixture sanity', () => {
  it('power is in the comp, deals damage, and the fixture actually bursts', () => {
    expect(unitOf(base.res, SLUG).totalDamage).toBeGreaterThan(0);
    expect(base.total).toBeGreaterThan(0);
    // Non-vacuity for every gated line below: both skill2 (18 attacks) and the burst rider need
    // max stacks, and the burst test needs at least one cast.
    expect(fbStarts).toBeGreaterThan(0);
    expect(powerIdx).toBeGreaterThanOrEqual(0);
  });
});

describe('power — skill1 Blood Fiend (ATK 6.4%, 5 stacks, 3 sec, self)', () => {
  it('applies a self-only stacking ATK buff capped at 5 stacks', () => {
    // Discriminates: an uncapped model (no maxStacks), and a wrong magnitude (e.g. 6.4 authored as
    // the 32% max-stack total, or a x10 typo).
    expect(bf.length).toBeGreaterThan(5);
    for (const e of bf) {
      expect(e.targetSlug).toBe(SLUG);
      expect(e.maxStacks ?? 1).toBe(5);
      // atkPct keeps its raw percentage; casterAtkPct is flat-resolved at apply time, so only the
      // percentage form is magnitude-checkable from the event (self-cast makes the two equivalent).
      if (e.stat === 'atkPct') expect(e.value).toBeCloseTo(6.4, 3);
    }
    expect(Math.max(...bf.map((e) => (e.stacks ?? 1) as number))).toBe(5);
  });

  it('grants nothing to allies — the whole kit is self/enemy scoped', () => {
    // Discriminates the SCOPE nearest-wrong: "Affects self" mis-encoded as target allies.
    const toOthers = base.events.filter(
      (e) =>
        e.kind === 'buffApply' &&
        idxOf(e) === powerIdx &&
        e.targetSlug != null &&
        e.targetSlug !== SLUG,
    );
    expect(toOthers).toHaveLength(0);
  });

  it('lapses across the reload gap and rebuilds from 1 stack (3 sec, not 10)', () => {
    // The 3 sec window is SHORTER than the ~3.35-3.7s magazine gap, so the pool must reset every
    // magazine. Under the nearest-wrong long-duration reading (10 sec) the buff never lapses:
    // exactly ONE apply would carry stacks === 1, and the first expiresFrame would sit past 600.
    const fromScratch = bf.filter((e) => (e.stacks ?? 1) === 1);
    expect(fromScratch.length).toBeGreaterThan(1);
    expect(bf[0].expiresFrame).toBeGreaterThan(120);
    expect(bf[0].expiresFrame).toBeLessThan(500);
  });

  it('is damage-positive and bounded by 5 x 6.4% = 32%', () => {
    // Upper bound is the arithmetic ceiling of the line: even permanently max-stacked it cannot
    // lift a pure-ATK-scaling kit past 1.32x. Catches an over-credited magnitude or an
    // always-on-at-max encoding of a buff the kit makes lapse.
    expect(base.total).toBeGreaterThan(noS1.total);
    expect(base.total / noS1.total).toBeGreaterThan(1.02);
    expect(base.total / noS1.total).toBeLessThan(1.33);
  });

  it('duration and stack cap are both load-bearing', () => {
    expect(shortBf.total).toBeLessThan(base.total);
    expect(uncapBf.total).toBeGreaterThan(base.total);
  });

  it('moves no teammate (ATK-only change cannot shift the rotation)', () => {
    // Burst gauge is per-shot, and skill1 changes ATK only — never shot count — so removing it
    // must leave every other unit byte-identical. (The skill2 counterfactual below deliberately
    // does NOT get this assertion: a free reload changes shots fired, hence gauge, hence timing.)
    const a = totals(base.res);
    const b = totals(noS1.res);
    for (const slug of Object.keys(a)) {
      if (slug !== SLUG) expect(b[slug]).toBe(a[slug]);
    }
  });
});

describe('power — skill2 (18 normal attacks at max stacks, once per battle)', () => {
  it('the free full-magazine reload adds fire time, and only ONE of them', () => {
    // "Reloads 100% of the magazine" is shot economy, not a defensive line: it skips one 141-frame
    // reload (~2.35s of a 180s fight, ~+1-2%). The upper bound is the discriminator for
    // "Activates 1 time(s) per battle": a hitCount:18 block with no once-per-battle gate fires
    // ~5x over the fight (~100 shots / 18), which lands near +7% — outside this band.
    expect(base.total).toBeGreaterThan(noS2.total);
    expect(base.total / noS2.total).toBeLessThan(1.04);
  });

  it('Explosion Radius is not encoded as a damage stat', () => {
    // Explosion RADIUS is area coverage, not damage per hit, and the boss is a single target with
    // no AoE modeled — so it is deliberately unmodeled. The nearest-wrong is folding 38.61% into a
    // Damage-Up stat (projectileExplosionPct is the tempting one — "only RL kits carry it"), which
    // would silently credit ~+2% for a line the kit never made a damage line.
    const dmgStats = new Set([
      'projectileExplosionPct',
      'attackDamagePct',
      'elementDamagePct',
      'trueDamagePct',
      'sustainedDamagePct',
      'chargeDamagePct',
      'chargeDamageMultPct',
      'critDamagePct',
      'coreDamagePct',
    ]);
    const bogus = base.events.filter(
      (e) =>
        e.kind === 'buffApply' &&
        idxOf(e) === powerIdx &&
        dmgStats.has(e.stat as string) &&
        Math.abs(((e.value as number) ?? 0) - 38.61) < 0.5,
    );
    expect(bogus).toHaveLength(0);
  });
});

describe('power — burst (1584% + a max-stack-gated second 1584%)', () => {
  it('lands TWO burst-bucket instances per cast', () => {
    // power is the sole Burst III in this fixture, so #casts === #fullBurstStart. The faithful
    // reading emits two damage instances per cast; the nearest-wrong (rider dropped, or the two
    // 1584% lines collapsed into one 1584% line) emits exactly one per cast.
    expect(burstHits.length).toBe(2 * fbStarts);
    expect(burstHits.length).toBeGreaterThanOrEqual(2);
  });

  it('burst-cast damage never takes the +50% Full Burst major', () => {
    // Verified fact: burst-cast damage lands BEFORE Full Burst begins. Both 1584% components are
    // parts of the same cast, so neither may carry the FB major.
    for (const e of burstHits) expect(Boolean(e.fbMajorApplied)).toBe(false);
  });

  it.skip('the two components are equal in magnitude (same 1584%, same frame, same buff state)', () => {
    // GAP: the harness cheat-sheet documents bucket / srcSlot / crit+core rates / inFullBurst /
    // fbMajorApplied / rangeApplied / mult on a damage event, but NOT the field holding the damage
    // amount. Guessing a name here would either false-RED or assert vacuously on 0s.
  });

  it.skip('burst hits do not core and do not take the +30% range bonus', () => {
    // GAP: the kit says nothing about core strike, and riders are engine-forced no-range — but the
    // exact crit/core-rate field names on a damage event are not in the blind packet.
  });

  it.skip('the second 1584% is GATED on max Blood Fiend stacks', () => {
    // GAP (modeling + testing). The schema has no block gate that reads a BUFF stack count; the
    // nearest primitive is mirroring stacks into a named resource + resourceGate{min:5}, which does
    // not decay with the 3 sec window. In practice the gate is satisfied at every cast (5 stacks are
    // reached on shot 5 of every magazine, long before the first burst), so an always-on encoding
    // and a gated encoding are behaviourally identical at scope lock — this asserts nothing today.
    // Discriminating it would need stacks forced below 5 at cast time, which is not reachable
    // shape-agnostically without knowing how the stack pool was authored.
  });
});
