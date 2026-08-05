/**
 * quency (Quency) — SMG / Electric / Supporter / Burst II — BLIND kit spec test (S5).
 *
 * EXACT-SLUG GUARD: this is `quency` (SMG/Electric/Supporter/Burst II), NOT
 * `quency-escape-queen`. Burst stage II is taken from the packet's base stats.
 *
 * KIT (structure; prose quoted <=40 chars):
 *   skill1  "Activates after 60 normal attacks." Affects self.
 *           Duplicates 12.42% of the Max HP of the highest-Max-HP Nikke, 10 sec.
 *   skill2  Affects 2 ally unit(s) with the highest final ATK — ATK ▲ 16.11%, 5 sec.
 *   burst   Affects 2 ally unit(s) with the highest final ATK —
 *           Max HP ▲ 43.87% for 5 sec ; Critical Damage ▲ 29.9% for 10 sec.
 *
 * Quency carries ZERO damage lines. Every assertion below is buff identity, target
 * set, duration, or INERTNESS; any damage her override produces is invented (the
 * whole-kit block asserts no damage-producing effect kind exists in any slot).
 *
 * FIXTURE: controlComp('quency', true) — liter (B1) / crown (B2) / quency / helm (B3).
 *   Quency is Burst II and shares the stage-2 slot with crown, so she casts only on
 *   rotations where crown is on cooldown. The burst suite therefore OPENS with an
 *   explicit non-vacuity assertion that her burst fired at all; if that fails the
 *   fixture, not the override, is the finding.
 *
 * DURATIONS are read off buffApply.expiresFrame — the engine emits NO buffRemove on
 * natural time-lapse. Two techniques:
 *   - RELATIVE: Critical Damage (10 s) and Max HP (5 s) leave the SAME cast frame, so
 *     expiresFrame(crit) - expiresFrame(hp) must be exactly 300 frames. Authoring both
 *     at 10 s (or both at 5 s) collapses the delta -> RED.
 *   - ABSOLUTE: re-run with the duration patched by +D and require the FIRST apply's
 *     expiresFrame to move by exactly D*60. A wrong authored duration shifts the
 *     baseline and breaks the delta. Every patched run is damage-only, so the rotation
 *     timeline (gauge is per-shot, damage-independent) is byte-identical.
 *
 * SHAPE NOTE: the packet documents two CONFLICTING override shapes (slot -> Block[]
 * vs slot -> { blocks: Block[] }). blocksOf() resolves either, and all mutation is
 * in-place on nested objects, so the counterfactuals hold under both shapes.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js'; // path fixed: blind/ sits under kit-autonomy/, not tests/units/

/* eslint-disable @typescript-eslint/no-explicit-any */

const SLUG = 'quency';
const FPS = 60;

// ADAPTED FIXTURE (2026-08-03): controlComp('quency', true) fields crown as a second Burst II,
// and crown out-prioritizes quency for the B2 cast — quency casts ZERO times there, so every
// burst-slot assertion would be vacuous. Field quency as the SOLE B2 (liter B1 / quency B2 /
// emilia B3 / helm B3) so she casts every Full Burst cycle. This is a fixture correction, not a
// change to what is asserted.
function fixtureComp(): Opts {
  return {
    slugs: ['liter', 'quency', 'emilia', 'helm'],
    bossElement: 'Fire',
    focusSlug: 'emilia',
  } as Opts;
}

// Both caster- and target-scaled Max HP grants surface as flat HP on buffApply.
const HP_STATS = new Set([
  'maxHpFlat',
  'maxHpPct',
  'casterMaxHpPct',
  'targetMaxHpPct',
]);

const DAMAGE_KINDS = new Set([
  'flatDamage',
  'dot',
  'hitRepeat',
  'storedHit',
  'stackedNuke',
  'weaponSwap',
]);

type Ev = SimEvent & Record<string, any>;
type Opts = ReturnType<typeof controlComp>;

function run(opts: Opts) {
  const events: Ev[] = [];
  const o = opts as any;
  const res = runComp({
    ...o,
    cfg: { ...(o.cfg ?? {}), onEvent: (ev: Ev) => events.push(ev) },
  } as any);
  return { res, events };
}

/** Resolves a slot to its Block[] under EITHER documented override shape. */
function blocksOf(ov: any, slot: 'skill1' | 'skill2' | 'burst'): any[] {
  const s = ov?.[slot];
  if (!s) return [];
  if (Array.isArray(s)) return s;
  return Array.isArray(s.blocks) ? s.blocks : [];
}

const allBlocks = (ov: any): any[] =>
  ([] as any[]).concat(
    blocksOf(ov, 'skill1'),
    blocksOf(ov, 'skill2'),
    blocksOf(ov, 'burst'),
  );

function compWith(mutate: (ov: any) => void): Opts {
  const ov = withPatchedOverride(SLUG, mutate as any);
  const b = fixtureComp() as any;
  return { ...b, overrides: { ...(b.overrides ?? {}), [SLUG]: ov } } as Opts;
}

/** Untouched clone of the committed override (withPatchedOverride never writes disk). */
const OV: any = withPatchedOverride(SLUG, () => {});

function setBuffDuration(
  ov: any,
  slot: 'skill1' | 'skill2' | 'burst',
  pick: (e: any) => boolean,
  sec: number,
) {
  for (const b of blocksOf(ov, slot))
    for (const e of b.effects ?? [])
      if (e.kind === 'buff' && pick(e)) e.durationSec = sec;
}

function dropEffects(
  ov: any,
  slot: 'skill1' | 'skill2' | 'burst',
  pick: (e: any) => boolean,
) {
  for (const b of blocksOf(ov, slot))
    if (Array.isArray(b.effects)) b.effects = b.effects.filter((e: any) => !pick(e));
}

const applies = (evs: Ev[]) => evs.filter((e) => e.kind === 'buffApply');

const withStat = (evs: Ev[], stat: string, value?: number) =>
  applies(evs).filter(
    (e) =>
      e.stat === stat &&
      (value === undefined || Math.abs(Number(e.value) - value) < 1e-6),
  );

// casterIdx === null AND targetIdx === null are boss-held debuffs — excluded.
const hpApplies = (evs: Ev[]) =>
  applies(evs).filter((e) => HP_STATS.has(String(e.stat)) && e.casterIdx !== null);

/** skill1 is the kit's ONLY self-targeted Max HP grant. */
const selfHpApplies = (evs: Ev[]) =>
  hpApplies(evs).filter((e) => e.targetSlug === SLUG);

function groupBy(xs: Ev[], key: (e: Ev) => string): Ev[][] {
  const m = new Map<string, Ev[]>();
  for (const x of xs) {
    const k = key(x);
    const g = m.get(k);
    if (g) g.push(x);
    else m.set(k, [x]);
  }
  return [...m.values()];
}

const targetsOf = (g: Ev[]) => g.map((e) => String(e.targetSlug)).sort();

// Critical Damage 29.9% is unique to quency's burst — one group per cast
// (all targets of a cast share the same expiresFrame).
const critGroups = (evs: Ev[]) =>
  groupBy(withStat(evs, 'critDamagePct', 29.9), (e) => String(e.expiresFrame));

const s2Groups = (evs: Ev[]) =>
  groupBy(withStat(evs, 'atkPct', 16.11), (e) => String(e.expiresFrame));

const teamTotal = (res: any) =>
  Object.values(totals(res)).reduce((a: number, b: any) => a + Number(b), 0);

// ---------------------------------------------------------------- hoisted runs (9)
const base = run(fixtureComp());

const s1Dur20 = run(
  compWith((ov) => setBuffDuration(ov, 'skill1', (e) => HP_STATS.has(e.stat), 20)),
);
const s1Count120 = run(
  compWith((ov) => {
    for (const b of blocksOf(ov, 'skill1'))
      if (b.trigger && typeof b.trigger.count === 'number') b.trigger.count = 120;
  }),
);
const s1Gone = run(compWith((ov) => dropEffects(ov, 'skill1', () => true)));

const s2Dur10 = run(
  compWith((ov) => setBuffDuration(ov, 'skill2', (e) => e.stat === 'atkPct', 10)),
);
const s2Zero = run(
  compWith((ov) => {
    for (const b of blocksOf(ov, 'skill2'))
      for (const e of b.effects ?? [])
        if (e.kind === 'buff' && e.stat === 'atkPct') e.value = 0;
  }),
);

const bCritDur15 = run(
  compWith((ov) =>
    setBuffDuration(ov, 'burst', (e) => e.stat === 'critDamagePct', 15),
  ),
);
const bCritGone = run(
  compWith((ov) =>
    dropEffects(ov, 'burst', (e) => e.kind === 'buff' && e.stat === 'critDamagePct'),
  ),
);
const bHpGone = run(
  compWith((ov) =>
    dropEffects(ov, 'burst', (e) => e.kind === 'buff' && HP_STATS.has(e.stat)),
  ),
);

describe('quency — fixture sanity (non-vacuity)', () => {
  it('quency fires her SMG in the control comp (skill1 hit counter can accrue)', () => {
    expect(unitOf(base.res, SLUG).totalDamage).toBeGreaterThan(0);
  });

  it('quency actually casts her own burst (sole B2 in the adapted fixture)', () => {
    // If this is 0 every burst-slot assertion below would be vacuous.
    expect(critGroups(base.events).length).toBeGreaterThanOrEqual(1);
  });
});

describe('quency skill1 — "Activates after 60 normal attacks", self, 10 sec', () => {
  it('is a SELF-targeted hitCount:60 block (not an interval/passive, not ally-scoped)', () => {
    const bs = blocksOf(OV, 'skill1');
    expect(bs.length).toBeGreaterThanOrEqual(1);
    for (const b of bs) {
      expect(b.target?.kind).toBe('self');
      expect(b.trigger?.kind).toBe('hitCount');
      expect(b.trigger?.count).toBe(60);
    }
  });

  it('grants 12.42% Max HP for 10 sec (magnitude + duration authored literally)', () => {
    const hp = blocksOf(OV, 'skill1')
      .flatMap((b: any) => b.effects ?? [])
      .filter((e: any) => e.kind === 'buff' && HP_STATS.has(e.stat));
    expect(hp.length).toBe(1);
    expect(hp[0].value).toBeCloseTo(12.42, 6);
    expect(hp[0].durationSec).toBe(10);
  });

  it('re-fires many times over the fight (nearest-wrong: a one-shot passive)', () => {
    // A `passive` self-grant applies once at frame 0; a hit-count trigger on a
    // 120-round SMG re-applies dozens of times across 180 s.
    expect(selfHpApplies(base.events).length).toBeGreaterThanOrEqual(3);
  });

  it('the threshold is 60 hits — doubling it to 120 halves the activations', () => {
    const a = selfHpApplies(base.events).length;
    const b = selfHpApplies(s1Count120.events).length;
    expect(b).toBeGreaterThanOrEqual(1);
    expect(a).toBeGreaterThan(b);
    // Nearest-wrong count:120 ("attacks" read as trigger pulls) would make `a` equal `b`.
    expect(Math.abs(a - 2 * b)).toBeLessThanOrEqual(3);
  });

  it('lasts exactly 10 sec (first apply expiresFrame shifts by 600f when patched to 20 s)', () => {
    const b0 = selfHpApplies(base.events)[0];
    const p0 = selfHpApplies(s1Dur20.events)[0];
    expect(b0).toBeTruthy();
    expect(p0).toBeTruthy();
    expect(Number.isFinite(Number(b0.expiresFrame))).toBe(true);
    expect(Number(p0.expiresFrame) - Number(b0.expiresFrame)).toBe(10 * FPS);
  });

  it('is damage-INERT — quency has no HP->ATK consumer, so removing it moves nothing', () => {
    // RED if the grant were mis-encoded as an ATK/damage buff, or if it leaked into
    // any damage bucket. Teammates must be byte-identical too.
    expect(totals(s1Gone.res)).toEqual(totals(base.res));
  });

  it.skip('GAP: basis is "the Nikke with the highest Max HP", not the caster — no StatKey exists', () => {
    // The schema has highestAllyAtkPct for ATK but NO highest-ally Max HP analogue.
    // caster/targetMaxHpPct on a self target is exact ONLY when quency herself holds
    // the team's highest Max HP. Unassertable without the missing primitive.
  });

  it.skip('FLAG: "60 normal attacks" — rounds vs trigger pulls (hitsPerShot 2)', () => {
    // Engine convention: hitCount counts ROUNDS, so 60 = half a 120-round magazine
    // (30 pulls). If the kit means 60 PULLS the threshold is 120. Not prose-decidable.
  });
});

describe('quency skill2 — 2 highest-final-ATK allies, ATK ▲ 16.11% for 5 sec', () => {
  it('targets exactly 2 allies ranked by FINAL ATK, self not excluded', () => {
    const bs = blocksOf(OV, 'skill2');
    expect(bs.length).toBeGreaterThanOrEqual(1);
    for (const b of bs) {
      expect(b.target?.kind).toBe('alliesTopAtk');
      expect(b.target?.count).toBe(2);
      // Kit says "highest FINAL ATK" literally -> live-ATK ranking (A3 rule).
      expect(b.target?.byFinalAtk).toBe(true);
      expect(b.target?.excludeSelf ?? false).toBe(false);
    }
  });

  it('is a plain ATK% buff, NOT a caster-scaled flat ATK grant', () => {
    const raw = withStat(base.events, 'atkPct', 16.11);
    expect(raw.length).toBeGreaterThanOrEqual(2);
    const qIdx = critGroups(base.events)[0]?.[0]?.casterIdx;
    const flat = applies(base.events).filter(
      (e) =>
        e.casterIdx === qIdx &&
        (e.stat === 'casterAtkPct' || e.stat === 'highestAllyAtkPct'),
    );
    // casterAtkPct/highestAllyAtkPct re-emit as a FLAT ATK number; the kit line has no
    // "of the skill user's ATK" wording, so quency must emit none.
    expect(flat).toEqual([]);
  });

  it('hits exactly 2 distinct allies per activation and repeats over the fight', () => {
    const gs = s2Groups(base.events);
    expect(gs.length).toBeGreaterThanOrEqual(2); // rules out a one-shot/passive encoding
    for (const g of gs) {
      expect(g.length).toBe(2);
      expect(new Set(targetsOf(g)).size).toBe(2); // RED under target {kind:'allies'} (4 units)
    }
  });

  it('lasts exactly 5 sec (first apply expiresFrame shifts by 300f when patched to 10 s)', () => {
    const b0 = s2Groups(base.events)[0]?.[0];
    const p0 = s2Groups(s2Dur10.events)[0]?.[0];
    expect(b0).toBeTruthy();
    expect(p0).toBeTruthy();
    expect(Number(p0.expiresFrame) - Number(b0.expiresFrame)).toBe(5 * FPS);
  });

  it('the ATK buff actually moves team damage (zeroing it strictly lowers the total)', () => {
    expect(teamTotal(base.res)).toBeGreaterThan(teamTotal(s2Zero.res));
  });

  it.skip('FLAG: skill2 carries NO activation clause — cadence is outside the prose', () => {
    // No "Activates when/after ..." text. Repo convention for a clause-free skill line
    // is interval{sec: datamined skill cooldown}, and that cooldown is NOT in this
    // packet (the given "cd 20s" is the BURST cooldown). Trigger identity and cadence
    // are therefore a ⚑ — measurement/datamine-gated, not blind-assertable.
  });
});

describe('quency burst — 2 highest-final-ATK allies: Max HP ▲ 43.87%/5s, Crit DMG ▲ 29.9%/10s', () => {
  it('fires on her OWN burst cast and targets the same 2 highest-final-ATK allies', () => {
    const bs = blocksOf(OV, 'burst');
    expect(bs.length).toBeGreaterThanOrEqual(1);
    for (const b of bs) {
      // Nearest-wrong: fullBurstEnter — it would fire on rotations another stage-2/3
      // unit completes, over-crediting a burst quency never cast.
      expect(b.trigger?.kind).toBe('burstCast');
      expect(b.target?.kind).toBe('alliesTopAtk');
      expect(b.target?.count).toBe(2);
      expect(b.target?.byFinalAtk).toBe(true);
      expect(b.target?.excludeSelf ?? false).toBe(false);
    }
  });

  it('encodes "Max HP ▲ 43.87%" as the TARGET\'s own Max HP, not the caster\'s', () => {
    const eff = blocksOf(OV, 'burst')
      .flatMap((b: any) => b.effects ?? [])
      .filter((e: any) => e.kind === 'buff' && HP_STATS.has(e.stat));
    expect(eff.length).toBe(1);
    // "Max HP ▲ X%" is targetMaxHpPct per the schema; casterMaxHpPct is the
    // "X% of the skill user's Max HP" wording, which this line does not use.
    expect(eff[0].stat).toBe('targetMaxHpPct');
    expect(eff[0].value).toBeCloseTo(43.87, 6);
    expect(eff[0].durationSec).toBe(5);
  });

  it('grants Critical Damage ▲ 29.9% for 10 sec to exactly 2 distinct allies per cast', () => {
    const gs = critGroups(base.events);
    expect(gs.length).toBeGreaterThanOrEqual(1);
    for (const g of gs) {
      expect(g.length).toBe(2);
      expect(new Set(targetsOf(g)).size).toBe(2);
    }
    const eff = blocksOf(OV, 'burst')
      .flatMap((b: any) => b.effects ?? [])
      .filter((e: any) => e.kind === 'buff' && e.stat === 'critDamagePct');
    expect(eff.length).toBe(1);
    expect(eff[0].durationSec).toBe(10);
  });

  it('the two riders carry DIFFERENT windows: Max HP expires 300f before Crit DMG', () => {
    // Both leave the same cast frame, so expiresFrame(crit) - expiresFrame(hp) = 300.
    // RED under the common nearest-wrong of giving both riders one shared duration.
    const hp = hpApplies(base.events);
    const gs = critGroups(base.events);
    expect(gs.length).toBeGreaterThanOrEqual(1);
    for (const g of gs) {
      const want = Number(g[0].expiresFrame) - 5 * FPS;
      const batch = hp.filter((e) => Number(e.expiresFrame) === want);
      expect(batch.length).toBe(2);
      expect(targetsOf(batch)).toEqual(targetsOf(g)); // same 2 allies as the crit rider
    }
  });

  it('Critical Damage runs exactly 10 sec (patching to 15 s shifts expiry by 300f)', () => {
    const b0 = critGroups(base.events)[0]?.[0];
    const p0 = critGroups(bCritDur15.events)[0]?.[0];
    expect(b0).toBeTruthy();
    expect(p0).toBeTruthy();
    expect(Number(p0.expiresFrame) - Number(b0.expiresFrame)).toBe(5 * FPS);
  });

  it('the Critical Damage rider actually moves team damage', () => {
    expect(teamTotal(base.res)).toBeGreaterThan(teamTotal(bCritGone.res));
  });

  it('the ally Max HP grant is damage-INERT (ally-granted Max HP feeds no ATK conversion)', () => {
    expect(totals(bHpGone.res)).toEqual(totals(base.res));
  });
});

describe('quency — whole-kit shape', () => {
  it('authors all three slots', () => {
    expect(blocksOf(OV, 'skill1').length).toBeGreaterThanOrEqual(1);
    expect(blocksOf(OV, 'skill2').length).toBeGreaterThanOrEqual(1);
    expect(blocksOf(OV, 'burst').length).toBeGreaterThanOrEqual(1);
  });

  it('invents NO damage: the kit has zero damage lines, so no damage-producing effect exists', () => {
    const bad = allBlocks(OV)
      .flatMap((b: any) => b.effects ?? [])
      .filter((e: any) => DAMAGE_KINDS.has(String(e.kind)))
      .map((e: any) => e.kind);
    expect(bad).toEqual([]);
  });

  it('carries no ignored/unsupported effect blocks (skips belong in `note`/`unmodeled`)', () => {
    const bad = allBlocks(OV)
      .flatMap((b: any) => b.effects ?? [])
      .filter((e: any) => e.kind === 'ignored' || e.kind === 'unsupported')
      .map((e: any) => e.kind);
    expect(bad).toEqual([]);
  });
});
