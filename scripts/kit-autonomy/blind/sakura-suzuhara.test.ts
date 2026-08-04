/**
 * sakura-suzuhara — Sakura Suzuhara (SMG / Water / Supporter / Burst I, cd 40s,
 * ammo 120, reloadFrames 81, hitsPerShot 1, normalAttackMultiplier 8.1).
 * BLIND spec test: written from the kit prose alone, one assertion group per kit line.
 *
 * KIT (structural paraphrase):
 *   skill1 — after landing 120 normal attacks, affects THE TARGET(S):
 *            Damage Taken +17.18% for 5 sec.       -> boss-held debuff, team-wide lift
 *   skill2 — after landing 60 normal attacks, 2 lowest-HP-% allies:
 *            Incoming healing +15.18% for 10 sec.  -> no StatKey exists (GAP)
 *          — after landing 120 normal attacks, 2 lowest-HP-% allies:
 *            Damage Taken -14.97% for 10 sec.      -> ALLY defensive line, v1-inert (GAP)
 *   burst  — 2 lowest-HP-% allies: recovers 10.03% of the user final Max HP
 *            every 1 sec for 10 sec.               -> heal ticks:10, feeds on-recovery
 *                                                     consumers (crown)
 *
 * FIXTURE: controlComp('sakura-suzuhara', true) = liter(B1) / crown(B2) /
 * sakura(carry) / helm(B3). Sakura is a Burst I unit sitting in the carry slot, so
 * the comp holds TWO B1s; the burst group therefore OPENS with an explicit
 * non-vacuity check that sakura actually casts — if liter always wins stage 1 the
 * burst assertions test nothing, and that is itself the finding.
 * crown is in the comp deliberately: her 'when recovery takes effect' trigger is the
 * ONLY observable a heal has at scope lock (no HP pool is modeled and the engine
 * emits no recovery event kind), so the burst line is read through her.
 *
 * WHY EACH GROUP DISCRIMINATES:
 *  - skill1 scope: 'Affects the target(s)' = the BOSS. A boss-held debuff lifts EVERY
 *    unit; the nearest-wrong self/ally scoping lifts only sakura. So removing skill1
 *    must drop all firing units, and every emitted damageTakenPct must be boss-held
 *    (casterIdx===null && targetIdx===null).
 *  - skill1 trigger/duration: patched to the nearest-wrong values (hitCount 60,
 *    durationSec 10); each must raise team damage and the 60 variant must roughly
 *    double the activation count.
 *  - skill2 trap: the ALLY 'Damage Taken -14.97%' mis-encoded onto the boss is a
 *    team-wide damage CUT, and 'Incoming healing +' mis-encoded as a heal would fire
 *    crown's recovery consumer every 60 landed hits — a large over-credit. Both are
 *    caught by requiring skill2 to be byte-identical-neutral.
 *  - burst: a single instant heal (ticks:1) starves the on-recovery consumer; keying
 *    it to fullBurstEnter instead of burstCast would fire on rotations sakura never
 *    cast (two B1s in this comp).
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const SLUG = 'sakura-suzuhara';

type Slot = 'skill1' | 'skill2' | 'burst';
type LooseEffect = {
  kind?: string;
  stat?: string;
  value?: number;
  durationSec?: number;
  ticks?: number;
  intervalSec?: number;
};
type LooseBlock = {
  trigger?: { kind?: string; count?: number };
  target?: { kind?: string; count?: number };
  effects?: LooseEffect[];
};

// The packet documents the override slot as BOTH `slot: Block[]` and
// `slot: { blocks: Block[] }`. Every reader/patcher below accepts either shape so a
// counterfactual can never silently no-op on the wrong one; the shape is asserted once.
function slotBlocks(ov: unknown, slot: Slot): LooseBlock[] {
  const rec = ov as Record<string, unknown>;
  const s = rec[slot];
  if (Array.isArray(s)) return s as LooseBlock[];
  if (s && typeof s === 'object') {
    const nested = (s as { blocks?: unknown }).blocks;
    if (Array.isArray(nested)) return nested as LooseBlock[];
  }
  return [];
}

function clearSlot(ov: unknown, slot: Slot): void {
  const rec = ov as Record<string, unknown>;
  const s = rec[slot];
  if (Array.isArray(s)) {
    rec[slot] = [];
    return;
  }
  if (s && typeof s === 'object' && Array.isArray((s as { blocks?: unknown }).blocks)) {
    (s as { blocks: unknown[] }).blocks = [];
  }
}

const effectsOf = (blocks: LooseBlock[]): LooseEffect[] =>
  blocks.flatMap((b) => b.effects ?? []);

type BuffApply = {
  stat: string;
  value: number;
  casterIdx: number | null;
  targetIdx: number | null;
  targetSlug?: string;
};
const buffApplies = (evs: SimEvent[]): BuffApply[] =>
  evs.filter((e) => e.kind === 'buffApply') as unknown as BuffApply[];

// Boss-held debuffs are the ones with BOTH indices null (documented harness rule).
const bossDamageTaken = (evs: SimEvent[]): BuffApply[] =>
  buffApplies(evs).filter(
    (e) => e.stat === 'damageTakenPct' && e.casterIdx === null && e.targetIdx === null,
  );

const countKind = (evs: SimEvent[], kind: string): number =>
  evs.filter((e) => e.kind === kind).length;

const burstBucketHits = (evs: SimEvent[]): number =>
  (evs.filter((e) => e.kind === 'damage') as unknown as Array<{ bucket?: string }>).filter(
    (e) => e.bucket === 'burst',
  ).length;

function runWith(patched?: unknown): {
  res: ReturnType<typeof runComp>;
  events: SimEvent[];
} {
  const events: SimEvent[] = [];
  const opts = controlComp(SLUG, true) as unknown as {
    overrides?: Record<string, unknown>;
    cfg?: Record<string, unknown>;
  };
  if (patched) opts.overrides = { ...(opts.overrides ?? {}), [SLUG]: patched };
  opts.cfg = { ...(opts.cfg ?? {}), onEvent: (ev: SimEvent) => events.push(ev) };
  const res = runComp(opts as unknown as Parameters<typeof runComp>[0]);
  return { res, events };
}

const teamTotal = (res: ReturnType<typeof runComp>): number =>
  Object.values(totals(res)).reduce((a, b) => a + b, 0);

// ---- read-only clone of the shipped override (structural assertions) ----
const shipped = withPatchedOverride(SLUG, () => {});

// ---- counterfactuals; the mutation counters keep every patch non-vacuous ----
let dur10Patched = 0;
let count60Patched = 0;
let ticks1Patched = 0;

const ovNoS1 = withPatchedOverride(SLUG, (ov) => {
  clearSlot(ov, 'skill1');
});
const ovNoS2 = withPatchedOverride(SLUG, (ov) => {
  clearSlot(ov, 'skill2');
});
const ovNoBurst = withPatchedOverride(SLUG, (ov) => {
  clearSlot(ov, 'burst');
});
const ovDur10 = withPatchedOverride(SLUG, (ov) => {
  for (const eff of effectsOf(slotBlocks(ov, 'skill1'))) {
    if (eff.stat === 'damageTakenPct') {
      eff.durationSec = 10;
      dur10Patched += 1;
    }
  }
});
const ovCount60 = withPatchedOverride(SLUG, (ov) => {
  for (const b of slotBlocks(ov, 'skill1')) {
    if (b.trigger?.kind === 'hitCount') {
      b.trigger.count = 60;
      count60Patched += 1;
    }
  }
});
const ovTicks1 = withPatchedOverride(SLUG, (ov) => {
  for (const eff of effectsOf(slotBlocks(ov, 'burst'))) {
    if (eff.kind === 'heal') {
      eff.ticks = 1;
      ticks1Patched += 1;
    }
  }
});

// ---- hoisted runs (7 x 180s sims) ----
const base = runWith();
const noS1 = runWith(ovNoS1);
const noS2 = runWith(ovNoS2);
const noBurst = runWith(ovNoBurst);
const dur10 = runWith(ovDur10);
const count60 = runWith(ovCount60);
const ticks1 = runWith(ovTicks1);

describe('sakura-suzuhara — fixture and override-shape sanity', () => {
  it('the control comp runs and the loose slot readers see the shipped blocks', () => {
    expect(unitOf(base.res, SLUG).totalDamage).toBeGreaterThan(0);
    expect(slotBlocks(shipped, 'skill1').length).toBeGreaterThan(0);
    expect(slotBlocks(shipped, 'burst').length).toBeGreaterThan(0);
  });
});

describe('skill1 — 120 landed normal attacks: Damage Taken +17.18% on the target for 5 sec', () => {
  it('is authored as hitCount:120 / enemy / damageTakenPct 17.18 for 5 sec', () => {
    const carrier = slotBlocks(shipped, 'skill1').find((b) =>
      (b.effects ?? []).some((e) => e.stat === 'damageTakenPct'),
    );
    expect(carrier).toBeDefined();
    // trigger identity: the kit gives an explicit landed-hit threshold, so hitCount
    // is the primitive; interval/shotFired/fullBurstEnter would all de-couple the
    // debuff from her actual firing cadence.
    expect(carrier?.trigger?.kind).toBe('hitCount');
    expect(carrier?.trigger?.count).toBe(120);
    // target set: 'Affects the target(s)' is the enemy, never self/allies.
    expect(carrier?.target?.kind).toBe('enemy');
    const eff = (carrier?.effects ?? []).find((e) => e.stat === 'damageTakenPct');
    expect(eff?.value).toBeCloseTo(17.18, 3);
    // duration semantics: seconds, not rounds/stacks.
    expect(eff?.durationSec).toBe(5);
  });

  it('emits the debuff onto the BOSS at 17.18, never negative', () => {
    const boss = bossDamageTaken(base.events);
    expect(boss.length).toBeGreaterThan(0);
    for (const e of boss) {
      expect(e.value).toBeGreaterThan(0);
      expect(e.value).toBeCloseTo(17.18, 3);
    }
  });

  it('activation count is consistent with the 120-round SMG magazine cadence', () => {
    // whole-picture: ammo 120 at SMG cadence (~20 rounds/s) + 81f reload => ~7.4s per
    // magazine, so a 180s fight supports ~24 activations at full landing and fewer as
    // the landed fraction drops. Anything outside this band means the trigger is not
    // counting landed normal attacks.
    const n = bossDamageTaken(base.events).length;
    expect(n).toBeGreaterThanOrEqual(8);
    expect(n).toBeLessThanOrEqual(30);
  });

  it('fires on the 120th landed hit, not the 60th (nearest-wrong: hitCount 60)', () => {
    expect(count60Patched).toBeGreaterThan(0);
    const n120 = bossDamageTaken(base.events).length;
    const n60 = bossDamageTaken(count60.events).length;
    expect(n60).toBeGreaterThan(n120 * 1.5);
    expect(teamTotal(count60.res)).toBeGreaterThan(teamTotal(base.res));
  });

  it('holds for 5 sec, not 10 (nearest-wrong: durationSec 10)', () => {
    expect(dur10Patched).toBeGreaterThan(0);
    expect(teamTotal(dur10.res)).toBeGreaterThan(teamTotal(base.res));
  });

  it('lifts EVERY firing unit, not just sakura (nearest-wrong: self/ally scope)', () => {
    const withS1 = totals(base.res);
    const without = totals(noS1.res);
    let moved = 0;
    for (const [slug, dmg] of Object.entries(withS1)) {
      if (dmg === 0) continue;
      expect(dmg).toBeGreaterThan(without[slug]);
      moved += 1;
    }
    expect(moved).toBeGreaterThanOrEqual(3);
  });

  it('inertness: it is a damage-taken debuff, not a weapon-state modifier', () => {
    expect(countKind(noS1.events, 'shot')).toBe(countKind(base.events, 'shot'));
    expect(countKind(noS1.events, 'reload')).toBe(countKind(base.events, 'reload'));
  });
});

describe('skill2 — 60-hit Incoming healing +15.18% / 120-hit Damage Taken -14.97% on 2 lowest-HP allies', () => {
  it('carries no damage payload: emptying skill2 leaves every unit byte-identical', () => {
    const a = totals(base.res);
    const b = totals(noS2.res);
    for (const [slug, dmg] of Object.entries(a)) expect(b[slug]).toBe(dmg);
  });

  it('the ALLY Damage Taken -14.97% never reaches the boss as a debuff', () => {
    for (const e of bossDamageTaken(base.events)) {
      expect(e.value).toBeGreaterThan(0);
      expect(Math.abs(e.value - 14.97)).toBeGreaterThan(0.01);
    }
  });

  it('Incoming healing + is not mis-encoded as a heal or shield', () => {
    // a heal here would fire crown-style on-recovery consumers every 60 landed hits
    const s2 = effectsOf(slotBlocks(shipped, 'skill2'));
    expect(s2.some((e) => e.kind === 'heal')).toBe(false);
    expect(s2.some((e) => e.kind === 'shield')).toBe(false);
  });

  it.skip('Incoming healing +15.18% for 10 sec — GAP: no StatKey models incoming-healing scaling, and v1 has no HP pool, so the line has no observable', () => {});

  it.skip('Damage Taken -14.97% on allies for 10 sec — GAP: damageTakenPct is a BOSS-scoped stat; there is no ally-side damage-reduction primitive and the v1 boss deals no damage', () => {});
});

describe('burst — 2 lowest-HP-% allies recover 10.03% of the user max HP every 1 sec for 10 sec', () => {
  it('is authored as a burstCast heal, 10 ticks at 1 sec, onto 2 lowest-HP allies', () => {
    const carrier = slotBlocks(shipped, 'burst').find((b) =>
      (b.effects ?? []).some((e) => e.kind === 'heal'),
    );
    expect(carrier).toBeDefined();
    // trigger identity: her OWN burst cast. fullBurstEnter would fire on rotations a
    // different Burst I unit (liter, also in this comp) completed.
    expect(carrier?.trigger?.kind).toBe('burstCast');
    expect(carrier?.target?.kind).toBe('alliesLowestHp');
    expect(carrier?.target?.count).toBe(2);
    const heal = (carrier?.effects ?? []).find((e) => e.kind === 'heal');
    expect(heal?.ticks).toBe(10);
    expect(heal?.intervalSec ?? 1).toBe(1);
  });

  it('non-vacuity: sakura actually casts her own burst in the control comp', () => {
    const casts = base.events.filter((e) => e.kind === 'burstCast');
    expect(casts.length).toBeGreaterThan(0);
    // two Burst I units share this comp (liter + sakura); if liter always takes stage
    // 1 the rest of this group is vacuous, so localize that here.
    expect(casts.some((e) => JSON.stringify(e).includes(SLUG))).toBe(true);
  });

  it('the HoT is live and consumed by an on-recovery teammate', () => {
    expect(teamTotal(base.res)).toBeGreaterThan(teamTotal(noBurst.res));
  });

  it('is 10 recovery ticks, not one instant heal (nearest-wrong: ticks 1)', () => {
    expect(ticks1Patched).toBeGreaterThan(0);
    expect(teamTotal(base.res)).toBeGreaterThan(teamTotal(ticks1.res));
    expect(teamTotal(ticks1.res)).toBeGreaterThanOrEqual(teamTotal(noBurst.res));
  });

  it('inertness: the burst is pure sustain and adds no burst-bucket damage', () => {
    expect(burstBucketHits(base.events)).toBe(burstBucketHits(noBurst.events));
  });

  it.skip('target set 2-lowest-HP vs all allies — GAP: the heal models no HP amount and v1 resolves lowest-HP deterministically, so broadening the target set is unobservable unless the extra targets happen to carry an on-recovery consumer', () => {});
});
