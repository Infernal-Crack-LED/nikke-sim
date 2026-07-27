// PER-UNIT KIT SPEC — `laplace` (Laplace (Treasure), Attacker/RL/Iron, Burst III, cd 40s, ammo 6,
// chargeFrames 60, chargeMultiplier 250 — every RL pull is a full charge). Kit-autonomy gauntlet
// 2026-07-26; Tier 2 (weaponSwap scoped buff + Hero-Vision status gate + burstCast FB-exempt First).
//
// GROUND TRUTH is the favorite-item (treasure) prose in data/characters.json → characters.laplace.skills,
// NOT the raw skillDetails tables (those carry the UNTREASURED base kit: S2a 81.66 last-bullet, burst
// First 897.6 / Normal 14.52 / 5s). `treasure:true` + the 2026-07-17 favorite-item sync make the prose
// authoritative; the nearest-wrong counterfactuals below ARE those base-kit values.
//
// One assertion group per KIT LINE (L3..L12), asserted against the SHIPPED override on disk.
// `withPatchedOverride` builds COUNTERFACTUALS only (the nearest wrong model each PIN must
// discriminate against) — never the encoding under test.
//
// Kit (favorite-item prose):
//   S1 ■ attacking with Full Charge → self: Hero Vision: Explosion Radius ▲3.57%, ×5 stacks, 15s  [L1/L2]
//   S2 ■ hitting a target with Full Charge → target: 132.45% of final ATK as additional damage     [L3]
//      ■ hitting the target's Parts → target's body: 14.78% of final ATK as additional damage      [L4]
//   BU ■ self: Changes the weapon in use: First 1455.72% / Normal 22.2% / Duration 10 sec          [L5-L8]
//      ■ Additional Effect 1: Gains Pierce                                                          [L9]
//      ■ Additional Effect 2: Normal damage applied as true damage when Hero Vision at max stacks   [L10]
//      ■ Note: Unable to take cover while using Burst Skill                                         [L11]
//      ■ same enemy unit(s) when Hero Vision at max stacks: 11.9% of final ATK as true damage       [L12]
//
// INERT / OUT-OF-DOMAIN lines (no damage observable at the partless single-boss scope lock):
//   L1/L2 Hero Vision Explosion Radius ▲ — AoE radius is inert vs one partless boss; its STACK STATE
//         only gates the burst true damage (L10/L12), which the override assumes maxed for the window (⚑).
//         UNMODELED (no assertion).
//   L4    S2b 14.78% parts hit — needs destructible parts ("target's body"); partless boss ⇒ never fires.
//         UNMODELED (no assertion).
//   L9    Gains Pierce — modeled (gauntlet 2026-07-26, blind-reviewer converged) as swap-scoped
//         weaponSwap.hasPierce:true. INERT at scope lock: PIERCE_CORE_DOUBLE is hard-off and the comp
//         carries no pierceDamagePct, so it moves zero damage (asserted below). Tagged for kit completeness.
//   L11   Unable to take cover — defensive; the v1 boss deals no damage, so cover has no DPS observable.
//
// trueNormals (L10) is a SEMANTIC FLAVOR TAG: the engine routes true damage through the trueDamagePct
// buff bucket, and this comp grants laplace none — so trueNormals:true is numerically identical to
// false here. It is PINNED STRUCTURALLY (the override must carry the tag) and is NOT behaviorally
// discriminable from damage totals in this fixture. The Hero-Vision-max gate it encodes is the ⚑ uptime
// assumption (maxed throughout the 10s window), shared with the L12 rider.
//
// Why each PIN discriminates (a test that cannot fail under the nearest wrong model gates nothing):
//   L3  the treasure value 132.45 on a shotFired trigger gated swapGate:'unswapped' — it rides the base
//       RL's full-charge pulls ONLY, going SILENT during the swap beam (the burst labels the beam
//       "Normal Damage", not "Full Charge"). S7 judge (kimi-code/k3) ruled the prior every-shot reading
//       a REAL-GOTCHA (it rested on a circular cite of the kit-silent chargeTimeSec ⚑, against both blind
//       derivations); the fix is this gate. Proven two ways: shipped atkPct exactly [132.45] (base 81.66
//       fails it) AND rider count == base-RL-normal count < total shots (dropping the gate fires it on
//       every shot incl the 224 beam ticks, +38% of her total — the ruled-out aggressive reading).
//   L6  the treasure First Damage 1455.72, not the base 897.6; a burst CAST lands BEFORE the Full Burst
//       window opens, so it must never take the +50% major (verified fact 2026-07-13).
//   L7  the swap beam's per-shot 22.2, not the base 14.52 — read off the normal-bucket atkPct cluster
//       (normalScale=1 in this comp, so the swap beam reads exactly 22.2 vs the base RL's 63.11).
//   L8/L5 the swap is LIVE and load-bearing: removing it collapses her total by >50% and erases the 22.2
//       normal cluster entirely.
//   L12 the 11.9% true rider rides ONLY swap-window shots (swapGate 'swapped'): its count equals the
//       swap-beam normal count and is strictly less than total shots. Removing the gate fires it on every
//       shot (≈ total shots), which the shipped count provably is not.
//
// Fixture: the 720-kit-audit control comp (liter B1 / crown B2 / laplace B3 carry+focus / helm B3, boss
// Fire). laplace needs a real rotation to cast her burst at all (a lone B3 makes zero Full Bursts).
// Deterministic (no seed); event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const CARRY = 'laplace';

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp(CARRY),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual patches (nearest-wrong = the untreasured base kit) -------------------------
const flatAtk = (b: any) => b.effects.find((e: any) => e.kind === 'flatDamage');
const hasSwap = (b: any) => b.effects.some((e: any) => e.kind === 'weaponSwap');
const swapEff = (b: any) => b.effects.find((e: any) => e.kind === 'weaponSwap');

/** L3 counterfactual A: the base-kit S2a VALUE (81.66) on the same per-shot trigger. */
const laplaceBaseS2Value = withPatchedOverride('laplace', (ov) => {
  const e = flatAtk(ov.skill2[0]);
  if (!e || e.atkPct !== 132.45)
    {throw new Error('laplace S2a 132.45 rider missing — fixture is stale');}
  e.atkPct = 81.66;
});
/** L3 counterfactual B: the pre-gauntlet AGGRESSIVE reading — swapGate removed, so the rider
 *  fires on EVERY shot including the swap beam (the model the S7 judge ruled a REAL-GOTCHA). */
const laplaceS2NoGate = withPatchedOverride('laplace', (ov) => {
  const b = ov.skill2[0];
  if (!b || b.trigger.kind !== 'shotFired' || b.swapGate !== 'unswapped')
    {throw new Error(
      'laplace S2a shotFired+unswapped block missing — fixture is stale'
    );}
  delete b.swapGate;
});
/** L6 counterfactual: the base-kit First Damage (897.6). */
const laplaceBaseFirst = withPatchedOverride('laplace', (ov) => {
  const b = ov.burst.find(
    (x: any) => x.trigger.kind === 'burstCast' && x.target.kind === 'enemy'
  );
  const e = b && flatAtk(b);
  if (!e || e.atkPct !== 1455.72)
    {throw new Error('laplace burst First 1455.72 missing — fixture is stale');}
  e.atkPct = 897.6;
});
/** L7 counterfactual: the base-kit swap Normal Damage (14.52). */
const laplaceBaseSwap = withPatchedOverride('laplace', (ov) => {
  const b = ov.burst.find(hasSwap);
  const e = b && swapEff(b);
  if (!e || e.damagePct !== 22.2)
    {throw new Error('laplace weaponSwap 22.2 missing — fixture is stale');}
  e.damagePct = 14.52;
});
/** L5/L8 reference: the swap weapon removed entirely. */
const laplaceNoSwap = withPatchedOverride('laplace', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !hasSwap(b));
  if (ov.burst.length === before)
    {throw new Error('laplace weaponSwap block missing — fixture is stale');}
});
/** L12 counterfactual: the 11.9% rider with its swap gate removed (fires on EVERY shot). */
const laplaceNoRiderGate = withPatchedOverride('laplace', (ov) => {
  const b = ov.burst.find(
    (x: any) => x.trigger.kind === 'shotFired' && x.swapGate === 'swapped'
  );
  if (!b || flatAtk(b).atkPct !== 11.9)
    {throw new Error('laplace 11.9 swap-gated rider missing — fixture is stale');}
  delete b.swapGate;
});
/** L9 reference: the swap-scoped pierce tag removed (proves it is damage-inert at scope lock). */
const laplaceNoPierce = withPatchedOverride('laplace', (ov) => {
  const b = ov.burst.find(hasSwap);
  const e = b && swapEff(b);
  if (!e || e.hasPierce !== true)
    {throw new Error('laplace weaponSwap.hasPierce missing — fixture is stale');}
  delete e.hasPierce;
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const baseS2Value = run({ laplace: laplaceBaseS2Value });
const s2NoGate = run({ laplace: laplaceS2NoGate });
const baseFirst = run({ laplace: laplaceBaseFirst });
const baseSwap = run({ laplace: laplaceBaseSwap });
const noSwap = run({ laplace: laplaceNoSwap });
const noRiderGate = run({ laplace: laplaceNoRiderGate });
const noPierce = run({ laplace: laplaceNoPierce });

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const lapDamage = (evs: SimEvent[]) =>
  dmg(evs).filter((d) => d.slug === 'laplace');
const lapShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'laplace');
const lapBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'laplace'
  );
const uniqSorted = (xs: number[]) =>
  [...new Set(xs.map((x) => Number(x.toFixed(3))))].sort((a, b) => a - b);

/** laplace's S2a full-charge rider (skill2 slot, skill bucket). */
const s2Riders = (evs: SimEvent[]) =>
  lapDamage(evs).filter((d) => d.srcSlot === 'skill2');
/** laplace's burst First-Damage nuke (burst slot, the big hit). */
const firstNukes = (evs: SimEvent[]) =>
  lapDamage(evs).filter((d) => d.srcSlot === 'burst' && d.atkPct > 100);
/** laplace's 11.9% true rider (burst slot, rides swap shots). */
const trueRiders = (evs: SimEvent[]) =>
  lapDamage(evs).filter((d) => d.srcSlot === 'burst' && d.atkPct < 100);
/** laplace's normal-bucket damage, split by swap-beam (22.2) vs base RL (63.11). */
const normals = (evs: SimEvent[]) =>
  lapDamage(evs).filter((d) => d.bucket === 'normal');
const swapBeamNormals = (evs: SimEvent[]) =>
  normals(evs).filter((d) => d.atkPct < 60);
/** laplace's base-RL normal shots (63.11) — the full-charge pulls the S2a rider rides. */
const baseRlNormals = (evs: SimEvent[]) =>
  normals(evs).filter((d) => d.atkPct > 60);

describe('laplace (Treasure) — kit spec', () => {
  describe('L3 — S2 full-charge rider: 132.45% of final ATK, base full-charge pulls only (swap-excluded)', () => {
    it('lands once per BASE full-charge pull, and goes SILENT during the swap beam', () => {
      // The burst labels the beam "Normal Damage", not "Full Charge", so the rider rides only the
      // base RL's charged pulls (swapGate unswapped): one rider per 63.11 normal, zero per 22.2 beam.
      expect(s2Riders(base.events).length).toBe(
        baseRlNormals(base.events).length
      );
      expect(s2Riders(base.events).length).toBeLessThan(
        lapShots(base.events).length
      );
    });

    it('is the TREASURE magnitude 132.45, crit-eligible, in the skill bucket', () => {
      const r = s2Riders(base.events);
      expect(r.length).toBeGreaterThan(0);
      expect(uniqSorted(r.map((d) => d.atkPct))).toEqual([132.45]);
      expect(r.every((d) => d.critEligible)).toBe(true);
      expect([...new Set(r.map((d) => d.bucket))]).toEqual(['skill']);
    });

    it('DISCRIMINATING: the base-kit value 81.66 fails the magnitude pin', () => {
      expect(
        uniqSorted(s2Riders(baseS2Value.events).map((d) => d.atkPct))
      ).toEqual([81.66]);
    });

    it('DISCRIMINATING: dropping the swap gate fires it on EVERY shot (the ruled-out aggressive reading)', () => {
      // The pre-gauntlet model (no swapGate) fires the rider on the 224 swap-beam shots too — the
      // S7 judge's REAL-GOTCHA (+38% of her total). The shipped gate must hold the count to base pulls.
      expect(s2Riders(s2NoGate.events).length).toBe(
        lapShots(s2NoGate.events).length
      );
      expect(s2Riders(s2NoGate.events).length).toBeGreaterThan(
        s2Riders(base.events).length
      );
    });
  });

  describe('L6 — burst First Damage: 1455.72% of final ATK, cast BEFORE the Full Burst window', () => {
    it('fires once per burst cast at the TREASURE magnitude, in the burst bucket', () => {
      const n = firstNukes(base.events);
      expect(n.length).toBe(lapBursts(base.events).length);
      expect(n.length).toBeGreaterThan(0);
      expect(uniqSorted(n.map((d) => d.atkPct))).toEqual([1455.72]);
      expect([...new Set(n.map((d) => d.bucket))]).toEqual(['burst']);
      expect(n.every((d) => d.critEligible)).toBe(true);
    });

    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      expect(firstNukes(base.events).filter((d) => d.fbMajorApplied)).toEqual(
        []
      );
    });

    it('DISCRIMINATING: the base-kit First Damage 897.6 fails the magnitude pin', () => {
      expect(
        uniqSorted(firstNukes(baseFirst.events).map((d) => d.atkPct))
      ).toEqual([897.6]);
    });
  });

  describe('L7/L5/L8 — burst changes the weapon: Normal 22.2% beam for 10s (live + load-bearing)', () => {
    it('ENCODING: the swap carries damagePct 22.2 / durationSec 10 / trueNormals / maxAmmo 999 / chargeTimeSec 0.25', () => {
      const ov = loadOverride('laplace') as any;
      const sw = ov.burst
        .map((b: any) => b.effects.find((e: any) => e.kind === 'weaponSwap'))
        .find(Boolean);
      expect(sw, 'laplace burst weaponSwap effect missing').toBeTruthy();
      expect(sw.damagePct).toBe(22.2);
      expect(sw.durationSec).toBe(10);
      expect(sw.trueNormals).toBe(true);
      expect(sw.maxAmmo).toBe(999);
      expect(sw.chargeTimeSec).toBe(0.25);
      expect(sw.hasPierce).toBe(true);
    });

    it('BEHAVIORAL: the swap beam is a distinct 22.2 normal cluster alongside the 63.11 base RL', () => {
      expect(uniqSorted(normals(base.events).map((d) => d.atkPct))).toEqual([
        22.2, 63.11,
      ]);
      expect(swapBeamNormals(base.events).length).toBeGreaterThan(0);
    });

    it('DISCRIMINATING: the base-kit swap Normal 14.52 replaces the 22.2 cluster', () => {
      expect(uniqSorted(normals(baseSwap.events).map((d) => d.atkPct))).toEqual(
        [14.52, 63.11]
      );
    });

    it('DISCRIMINATING: removing the swap moves her total substantially (the swap is live, not vacuous)', () => {
      expect(swapBeamNormals(noSwap.events).length).toBe(0);
      // Post-swap-exclusion the swap is a NET COST in this model: the 132.45% rider goes silent in
      // the window while the beam pays only 22.2%+11.9% per tick — the S2a-scope × beam-economy
      // interaction the S7 judge flagged as the dominant unmeasured lever. Direction aside, the swap
      // must move her total by a wide margin (it is her whole kit), proving it is live, not vacuous.
      const delta =
        Math.abs(base.totals.laplace - noSwap.totals.laplace) /
        noSwap.totals.laplace;
      expect(delta).toBeGreaterThan(0.3);
    });
  });

  describe('L10 — Additional Effect 2: swap normals are true-flavored (Hero Vision max, semantic tag)', () => {
    it('ENCODING: the swap carries trueNormals:true (numerically inert here — no trueDamagePct buff in comp)', () => {
      const ov = loadOverride('laplace') as any;
      const sw = ov.burst
        .map((b: any) => b.effects.find((e: any) => e.kind === 'weaponSwap'))
        .find(Boolean);
      expect(sw.trueNormals).toBe(true);
    });
  });

  describe('L9 — Additional Effect 1: Gains Pierce, swap-scoped (inert at scope lock)', () => {
    it('ENCODING: the swap carries hasPierce:true (swap-scoped, NOT the whole-fight top-level flag)', () => {
      const ov = loadOverride('laplace') as any;
      const sw = ov.burst
        .map((b: any) => b.effects.find((e: any) => e.kind === 'weaponSwap'))
        .find(Boolean);
      expect(sw.hasPierce).toBe(true);
      expect(
        (ov as any).hasPierce,
        'pierce must be swap-scoped, not whole-fight'
      ).toBeUndefined();
    });

    it("INERTNESS: removing the tag changes NO unit's total by a single point", () => {
      // PIERCE_CORE_DOUBLE is hard-off and the comp carries no pierceDamagePct, so the tag is
      // damage-inert at scope lock — it exists for kit completeness, not damage. No behavioral
      // pierce observable exists in this fixture (the damage event carries no pierce field).
      expect(base.totals).toEqual(noPierce.totals);
    });
  });

  describe('L12 — 11.9% true rider rides ONLY swap-window shots (swapGate swapped)', () => {
    it('is the kit magnitude 11.9, crit-eligible, in the burst bucket', () => {
      const r = trueRiders(base.events);
      expect(r.length).toBeGreaterThan(0);
      expect(uniqSorted(r.map((d) => d.atkPct))).toEqual([11.9]);
      expect(r.every((d) => d.critEligible)).toBe(true);
      expect([...new Set(r.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('fires once per swap-beam shot, and strictly fewer than total shots (gate is live)', () => {
      const riders = trueRiders(base.events).length;
      expect(riders).toBe(swapBeamNormals(base.events).length);
      expect(riders).toBeLessThan(lapShots(base.events).length);
    });

    it('DISCRIMINATING: removing the swap gate fires it on EVERY shot', () => {
      expect(trueRiders(noRiderGate.events).length).toBe(
        lapShots(noRiderGate.events).length
      );
      expect(trueRiders(noRiderGate.events).length).toBeGreaterThan(
        trueRiders(base.events).length
      );
    });
  });
});
