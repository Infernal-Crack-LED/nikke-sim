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
//   L1/L2 Hero Vision Explosion Radius ▲ — the AoE RADIUS magnitude is inert vs one partless boss and
//         stays unmodeled. Its STACK COUNT is MODELED (2026-08-12) as a `heroVision` resource pool,
//         because that count is what gates the burst's two true-damage clauses (L10/L12) — see the
//         L1/L2 assertion group at the end of this file.
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
// discriminable from damage totals in this fixture. The Hero-Vision-max gate it sits behind IS
// behaviorally live, though — see L1/L2.
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
  if (!e || e.atkPct !== 132.45) {
    throw new Error('laplace S2a 132.45 rider missing — fixture is stale');
  }
  e.atkPct = 81.66;
});
/** L3 counterfactual B: the pre-gauntlet AGGRESSIVE reading — swapGate removed, so the rider
 *  fires on EVERY shot including the swap beam (the model the S7 judge ruled a REAL-GOTCHA). */
const laplaceS2NoGate = withPatchedOverride('laplace', (ov) => {
  const b = ov.skill2[0];
  if (!b || b.trigger.kind !== 'shotFired' || b.swapGate !== 'unswapped') {
    throw new Error(
      'laplace S2a shotFired+unswapped block missing — fixture is stale'
    );
  }
  delete b.swapGate;
});
/** L6 counterfactual: the base-kit First Damage (897.6). */
const laplaceBaseFirst = withPatchedOverride('laplace', (ov) => {
  const b = ov.burst.find(
    (x: any) => x.trigger.kind === 'burstCast' && x.target.kind === 'enemy'
  );
  const e = b && flatAtk(b);
  if (!e || e.atkPct !== 1455.72) {
    throw new Error('laplace burst First 1455.72 missing — fixture is stale');
  }
  e.atkPct = 897.6;
});
/** L7 counterfactual: the base-kit swap Normal Damage (14.52). Both Hero-Vision branches. */
const laplaceBaseSwap = withPatchedOverride('laplace', (ov) => {
  const es = ov.burst.filter(hasSwap).map(swapEff);
  if (!es.length || es.some((e: any) => e.damagePct !== 22.2)) {
    throw new Error('laplace weaponSwap 22.2 missing — fixture is stale');
  }
  es.forEach((e: any) => {
    e.damagePct = 14.52;
  });
});
/** L5/L8 reference: the swap weapon removed entirely. */
const laplaceNoSwap = withPatchedOverride('laplace', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !hasSwap(b));
  if (ov.burst.length === before) {
    throw new Error('laplace weaponSwap block missing — fixture is stale');
  }
});
/** L12 counterfactual: the 11.9% rider fully ungated (fires on EVERY shot, in or out of a window). */
const laplaceNoRiderGate = withPatchedOverride('laplace', (ov) => {
  const b = ov.burst.find(
    (x: any) => x.trigger.kind === 'shotFired' && x.swapGate === 'swapped'
  );
  if (!b || flatAtk(b).atkPct !== 11.9) {
    throw new Error('laplace 11.9 swap-gated rider missing — fixture is stale');
  }
  delete b.swapGate;
  delete b.resourceGate;
});
/** L1/L2 counterfactual: Hero Vision assumed permanently maxed (the pre-2026-08-12 model) — the
 *  stack gate stripped from both the rider and the beam's true flavor, so the whole fight runs as
 *  if she had 5 stacks from frame 0. */
const laplaceHeroVisionAssumed = withPatchedOverride('laplace', (ov) => {
  const gated = ov.burst.filter((b: any) => b.resourceGate);
  if (gated.length !== 3) {
    throw new Error(
      `laplace heroVision gates: expected 3 gated burst blocks, found ${gated.length} — fixture is stale`
    );
  }
  // drop the below-max beam branch entirely, then ungate the max-stack branch + the rider
  ov.burst = ov.burst.filter((b: any) => b.resourceGate?.max === undefined);
  ov.burst.forEach((b: any) => delete b.resourceGate);
});
/** L9 reference: the swap-scoped pierce tag removed (proves it is damage-inert at scope lock). */
const laplaceNoPierce = withPatchedOverride('laplace', (ov) => {
  const es = ov.burst.filter(hasSwap).map(swapEff);
  if (!es.length || es.some((e: any) => e.hasPierce !== true)) {
    throw new Error('laplace weaponSwap.hasPierce missing — fixture is stale');
  }
  es.forEach((e: any) => delete e.hasPierce);
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
const heroVisionAssumed = run({ laplace: laplaceHeroVisionAssumed });

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
      // Margin 0.2, not the pre-2026-08-12 0.3: the swap-economy fix (`sameWeapon` replacing
      // `trueNormals` as the magazine-refill marker) stopped her 999-round BEAM magazine leaking
      // back onto the base RL when the window closed — she used to spend the rest of the fight
      // reload-free on a 999-round rocket launcher, which inflated the no-swap gap. Her total is
      // 5.4% lower and the delta is now 0.265.
      const delta =
        Math.abs(base.totals.laplace - noSwap.totals.laplace) /
        noSwap.totals.laplace;
      expect(delta).toBeGreaterThan(0.2);
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

    it('fires once per MAX-STACK swap-beam shot, and strictly fewer than total shots (both gates live)', () => {
      const riders = trueRiders(base.events).length;
      // The rider carries TWO gates: swapGate 'swapped' (beam ticks only) and the heroVision
      // stack gate. Beam ticks are its ceiling, and the ticks of any window she opened below max
      // Hero Vision are excluded — see the L1/L2 group for that difference.
      expect(riders).toBeLessThanOrEqual(swapBeamNormals(base.events).length);
      expect(riders).toBeLessThan(lapShots(base.events).length);
      expect(riders).toBeGreaterThan(0);
    });

    it('DISCRIMINATING: removing BOTH gates fires it on EVERY shot', () => {
      expect(trueRiders(noRiderGate.events).length).toBe(
        lapShots(noRiderGate.events).length
      );
      expect(trueRiders(noRiderGate.events).length).toBeGreaterThan(
        trueRiders(base.events).length
      );
    });
  });

  describe('L1/L2 — Hero Vision "at max stacks" gates BOTH burst true-damage clauses', () => {
    // OWNER RULINGS 2026-08-12: Hero Vision stacks build from FULL CHARGE attacks, and her burst
    // beam does not charge — so she gains ZERO stacks during the 10s window and enters it with
    // whatever she built. Stacks REFRESH as a whole set on each new stack (game-wide, owner ruling
    // 2026-08-11 = modeling-priors prior 12), so the 15s clock is reset by her last pre-burst full
    // charge and outlasts the window: once open, the gate holds for the whole window. The only
    // over-credit the old "assume maxed" model carried is a cast made BEFORE she has landed 5 full
    // charges — in this fixture, the fight's first burst.
    //
    // Encoded with the EXISTING resource primitives (soda-twinkling-bunny precedent), not a new
    // engine gate: a `heroVision` pool capped at 5, +1 per base full-charge pull
    // (shotFired + swapGate 'unswapped' — the beam grants none), read by `resourceGate` on the
    // two clauses. APPROXIMATION, deliberate and documented: a resource does not expire, so the
    // pool is monotone. That matches the refresh rule at scope lock (she fires continuously, so
    // the 15s clock never lapses) and diverges only across a >15s firing pause, which the
    // continuous scope-lock fight does not contain.
    it('ENCODING: a heroVision pool (0..5) feeds off base full charges only, and gates both clauses', () => {
      const ov = loadOverride('laplace') as any;
      expect(ov.resources).toEqual([
        { name: 'heroVision', initial: 0, min: 0, max: 5 },
      ]);
      const feeder = ov.skill1.find((b: any) =>
        b.effects.some((e: any) => e.kind === 'resource')
      );
      expect(feeder.trigger.kind).toBe('shotFired');
      expect(
        feeder.swapGate,
        'the beam does not charge → grants no stacks'
      ).toBe('unswapped');
      expect(feeder.effects[0]).toEqual({
        kind: 'resource',
        name: 'heroVision',
        delta: 1,
      });
      // the beam splits into a max-stack (true-flavored) branch and a below-max (plain) branch
      const swaps = ov.burst.filter(hasSwap);
      expect(swaps).toHaveLength(2);
      const maxBranch = swaps.find((b: any) => b.resourceGate?.min === 5);
      const lowBranch = swaps.find((b: any) => b.resourceGate?.max === 4);
      expect(swapEff(maxBranch).trueNormals).toBe(true);
      expect(swapEff(lowBranch).trueNormals).toBeUndefined();
      expect(swapEff(maxBranch).damagePct).toBe(swapEff(lowBranch).damagePct);
    });

    it('BEHAVIORAL: she opens at least one window below max stacks — the beam still fires there', () => {
      // gate live ⇒ strictly fewer 11.9 riders than beam ticks; the beam itself never goes missing
      expect(trueRiders(base.events).length).toBeLessThan(
        swapBeamNormals(base.events).length
      );
      expect(swapBeamNormals(base.events).length).toBe(
        swapBeamNormals(heroVisionAssumed.events).length
      );
    });

    it('DISCRIMINATING: assuming Hero Vision permanently maxed (the prior model) over-credits her', () => {
      // every beam tick becomes rider-bearing, and her total rises — the exact over-credit the
      // rulings identified, now bounded rather than assumed away
      expect(trueRiders(heroVisionAssumed.events).length).toBe(
        swapBeamNormals(heroVisionAssumed.events).length
      );
      expect(heroVisionAssumed.totals.laplace).toBeGreaterThan(
        base.totals.laplace
      );
    });
  });
});
