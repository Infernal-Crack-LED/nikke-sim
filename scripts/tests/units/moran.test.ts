// PER-UNIT KIT SPEC — `moran` (Moran, Defender/AR/Electric, Burst I, cd 40s, ammo 60, TREASURE).
// Kit-autonomy gauntlet 2026-07-25 (driver, sighted).
//
// One assertion group per KIT LINE (M1..M14 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest-wrong model
// each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.moran.skills, level-10 values):
//   S1 ■ start of battle → self: DEF ▲3.51% continuously per 1% HP lost          [M1 UNMODELED — defensive]
//      ■ landing 5 normal attacks WHILE WEAPON IS CHANGED → target:               [M2 — FIX (kit-status F2)]
//        47.18% of final ATK as additional damage (flatDamage rider, per-5-hits)
//      ■ Raptures appear → self: Fervor, Cooldown of Burst Skill ▼20s continuously [M3 — burstCdr 20, always on]
//   S2 ■ firing final bullet → 3 highest-ATK enemies: Taunt 4s                    [M4 UNMODELED — taunt inert]
//      ■ HP < 20% → self: Perseverance Max HP ▲91/69.84/51.09% 3s, 1×/battle each [M5 UNMODELED — HP-gate]
//      ■ entering Full Burst while in Fervor → all allies: Burst CD ▼7.48s         [M6 — team burstCdr 7.48]
//   BU ■ self: Changes the weapon in use — Damage 14.7% of final ATK, 10s          [M7 — weaponSwap, REPLACIVE]
//      ■ self: Recovers 36.14% of attack damage as HP for 10s                     [M8 UNMODELED — lifesteal]
//      ■ self: Attract — Taunts all enemies 10s                                   [M9 UNMODELED — taunt inert]
//      ■ self: Unlimited ammunition 10s                                           [M10 — unlimitedAmmo]
//      ■ self: Unable to take cover while using Burst Skill                       [M11 UNMODELED — no cover model]
//      ■ all allies: Damage Taken ▼35.14% for 10s                                 [M12 — damageTakenPct, INERT]
//      ■ all allies: DEF ▲14.85% of caster DEF for 10s                            [M13 UNMODELED — defensive]
//      ■ all allies: ATK ▲42.57% of caster ATK for 10s                            [M14 — casterAtkPct]
//
// Why each assertion discriminates (a test that cannot fail under the nearest-wrong model gates
// nothing). Probed against the live engine (.moran-probe.ts / .moran-probe2.ts, 2026-07-25 — 12
// bursts, 1369 swap shots, 270 rider hits over the 180s fight):
//   M2  THE FIX (kit-status F2). The rider is text-gated "while weapon is changed" (= her burst
//       weapon-swap window), but the shipped override carries fbGate:"inFb". She is Burst I, so her
//       swap starts at her OWN burst cast — which lands BEFORE the Full Burst window opens (the
//       B1→B2→B3 chain has to finish first). The two 10s windows are OFFSET: the swap window is
//       [cast, cast+10s], the FB window is [fbOpen, fbOpen+10s] with fbOpen > cast. So inFb both
//       misses the head of the swap (the [cast, fbOpen) gap) and over-runs its tail. The exact
//       primitive exists and is unused: swapGate:"swapped" (src/skills/types.ts:332, sim.ts:1684).
//       DISCRIMINATOR: with swapGate the rider fires in the pre-FB gap (probe: 3 hits at 4.70/5.12/
//       5.53s, FB opens 5.73s); with inFb ZERO rider hits land before fbOpen. The total rider count
//       is near-identical (270 vs 273 — equal-length windows, similar proc counts), so this is a
//       faithfulness fix on TIMING, board-neutral, NOT a fix for her 0.66 COLD. The magnitude/cadence
//       assertions below are FAITHFUL in shipped (green now); only the gate assertion is red pre-S3.
//   M3  Fervor is always active in solo raids (Raptures always present) → burstCdr 20 on her own
//       burstCast turns her 40s CD into an effective ~15s: she casts 12×/180s. Removing it halves her
//       casts (12 → 6). Nearest wrong: omitting Fervor (a 40s-CD model).
//   M6  the team burst-CDR 7.48s on FB entry (Fervor-gated, always on) is real rotation economy:
//       removing it drops crown 12 → 9 casts and moran 12 → 9. Nearest wrong: omitting it.
//   M7  REPLACIVE weapon swap, NOT an additive rider. Her base AR normalAttackMultiplier is 14.71 ≈
//       the swap 14.7 — the swap weapon hits for what her AR hits for (kit-status F3). The nearest
//       wrong model (the REFUTED F3) is extraHitDamagePct 14.7 additive on top of the 14.71 AR. The
//       STRUCTURAL proof it is wrong: it produces ZERO 14.7% normal-bucket shots — the weapon is
//       never replaced, she keeps firing 14.71% AR with a +14.7% rider stacked on top. It also
//       over-credits her total (+~9% here; the overshoot is muted relative to a pure per-shot
//       doubling because removing the swap also deadens the swap-gated M2 rider). Shipped keeps the
//       per-shot multiplier at 14.7 via weaponSwap.
//   M10 unlimitedAmmo rides the swap window: the 1369 swap shots are exactly the unlimited-ammo shots.
//   M12 Damage Taken ▼35.14% is an ally-side defensive reduction the engine treats as INERT (no HP
//       pool / nothing dies at scope lock). Asserted applied (48 buffs, 4 holders, 10s) AND inert
//       (removing it leaves EVERY unit's total byte-identical) — the helm-H4 fidelity pattern.
//   M14 casterAtkPct = a FLAT add of MORAN's ATK (0.4257×staticAtk ≈ 33,971), NOT a % of each ally's
//       own ATK. Reaches all four allies for 10s, once per cast per ally (48 = 12 casts × 4). Nearest
//       wrong: a self-only model (holder set collapses to moran).
//
// Inert / unmeasured (documented, NOT asserted): M1 DEF-per-HP-lost (HP-loss-gated; the partless boss
// never drops her HP, and DEF has no offensive consumer on her), M4/M9 taunts (no targeting model at
// scope lock), M5 Perseverance Max-HP phases (HP-gate, never fires; self survival, offensively inert),
// M8 lifesteal (no HP pool), M11 no-cover (no cover model), M13 DEF▲14.85% of caster DEF (defensive).
//
// Fixture: moran(AR B1) / crown(B2) / ada(RL B3) / helm(SR B3), boss Water (Electric-weak, the
// kit-status evidence basis), focus ada. moran is the Burst-I caster: she opens the chain and — with
// Fervor's effective ~15s CD — sustains 12 casts / 12 Full Bursts over 180s. Deterministic (no seed).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
const COMP = ['moran', 'crown', 'ada', 'helm'];
const MORAN = 0; // moran's slot in COMP

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;
type FbStart = Extract<SimEvent, { kind: 'fullBurstStart' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: COMP,
    bossElement: 'Water',
    focusSlug: 'ada',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res), res };
}

// ---- counterfactual / reference patches (nearest-wrong models) -------------------------------
/** M2 faithful encoding (the S3 fix): gate the rider to the weapon-swap window, not the FB window. */
const moranSwapGate = withPatchedOverride('moran', (ov) => {
  const b = ov.skill1.find((x: any) =>
    x.effects.some((e: any) => e.kind === 'flatDamage'),
  );
  if (!b)
    throw new Error('moran S1 flatDamage rider missing — fixture is stale');
  delete b.fbGate;
  b.swapGate = 'swapped';
});
/** M7 nearest-wrong (REFUTED kit-status F3): the 14.7 as an ADDITIVE extraHitDamagePct rider. */
const moranAdditive = withPatchedOverride('moran', (ov) => {
  const b = ov.burst.find((x: any) =>
    x.effects.some((e: any) => e.kind === 'weaponSwap'),
  );
  if (!b) throw new Error('moran burst weaponSwap missing — fixture is stale');
  b.effects = b.effects.filter((e: any) => e.kind !== 'weaponSwap');
  b.effects.push({
    kind: 'buff',
    stat: 'extraHitDamagePct',
    value: 14.7,
    durationSec: 10,
  });
});
/** M3 nearest-wrong: Fervor's burstCdr 20 removed (a 40s-CD model). */
const moranNoFervor = withPatchedOverride('moran', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) =>
      !b.effects.some((e: any) => e.kind === 'burstCdr' && e.seconds === 20),
  );
  if (ov.skill1.length === before)
    throw new Error('moran S1 Fervor burstCdr 20 missing — fixture is stale');
});
/** M6 nearest-wrong: the S2 team burst-CDR 7.48 removed. */
const moranNoTeamCdr = withPatchedOverride('moran', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) =>
      !b.effects.some((e: any) => e.kind === 'burstCdr' && e.seconds === 7.48),
  );
  if (ov.skill2.length === before)
    throw new Error('moran S2 burstCdr 7.48 missing — fixture is stale');
});
/** M12 reference: the ally Damage-Taken reduction removed (must be inert). */
const moranNoDmgTaken = withPatchedOverride('moran', (ov) => {
  let removed = 0;
  for (const b of ov.burst) {
    const before = b.effects.length;
    b.effects = b.effects.filter((e: any) => e.stat !== 'damageTakenPct');
    removed += before - b.effects.length;
  }
  if (!removed)
    throw new Error('moran burst damageTakenPct missing — fixture is stale');
});
/** M14 nearest-wrong: burst ATK grant scoped to self. */
const moranBurstSelf = withPatchedOverride('moran', (ov) => {
  const b = ov.burst.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'casterAtkPct'),
  );
  if (!b)
    throw new Error('moran burst casterAtkPct missing — fixture is stale');
  b.target = { kind: 'self' };
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const swapGate = run({ moran: moranSwapGate });
const additive = run({ moran: moranAdditive });
const noFervor = run({ moran: moranNoFervor });
const noTeamCdr = run({ moran: moranNoTeamCdr });
const noDmgTaken = run({ moran: moranNoDmgTaken });
const burstSelf = run({ moran: moranBurstSelf });

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const shots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot');
const moranCasts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'moran',
  );
const castsOf = (evs: SimEvent[], slug: string) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === slug)
    .length;
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e): e is FbStart => e.kind === 'fullBurstStart');
/** moran's S1 rider hits: 47.18% flatDamage in the skill bucket, srcSlot skill1. */
const riderHits = (evs: SimEvent[]) =>
  dmg(evs).filter(
    (d) =>
      d.slug === 'moran' &&
      d.srcSlot === 'skill1' &&
      Math.abs(d.atkPct - 47.18) < 1e-6,
  );
/** moran's swapped-weapon normal shots: normal bucket at the swap's 14.7% (base AR is 14.71%). */
const swapShots = (evs: SimEvent[]) =>
  dmg(evs).filter(
    (d) =>
      d.slug === 'moran' &&
      d.bucket === 'normal' &&
      Math.abs(d.atkPct - 14.7) < 1e-6,
  );
const moranShots = (evs: SimEvent[]) =>
  shots(evs).filter((s) => s.slug === 'moran');
/** moran-cast buffApply by stat (key carries the raw kit magnitude). */
const moranBuff = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter(
    (b) => b.stat === stat && b.key.startsWith(`${MORAN}:burst`),
  );
const holders = (bs: BuffApply[]) => new Set(bs.map((b) => b.targetIdx));

describe('moran — kit spec', () => {
  describe('M2 — S1 47.18%-of-final-ATK rider fires every 5 normal hits WHILE WEAPON IS CHANGED', () => {
    it('is the kit magnitude, in the skill bucket, attributed to skill1 (live, not inert)', () => {
      const riders = riderHits(base.events);
      expect(
        riders.length,
        'no S1 rider hits — the per-5-hits proc never fired',
      ).toBeGreaterThan(0);
      expect([...new Set(riders.map((d) => d.atkPct))]).toEqual([47.18]);
      expect([...new Set(riders.map((d) => d.bucket))]).toEqual(['skill']);
      expect([...new Set(riders.map((d) => d.srcSlot))]).toEqual(['skill1']);
    });

    it('fires about once per 5 swapped-window shots (the hitCount:5 cadence)', () => {
      const riders = riderHits(base.events).length;
      const swaps = swapShots(base.events).length;
      expect(
        riders,
        `${riders} riders vs ${swaps} swap shots — expected ~1 per 5 (between 1/6 and 1/4)`,
      ).toBeGreaterThan(swaps / 6);
      expect(riders).toBeLessThan(swaps / 4);
    });

    // THE FIX (kit-status F2). Shipped gates the rider to the Full Burst window (fbGate:"inFb");
    // the kit says "while weapon is changed" = the swap window, which for this Burst-I unit opens at
    // her OWN cast — BEFORE the FB window opens. A faithful swapGate fires the rider in that pre-FB
    // gap; inFb cannot. RED against shipped (0 pre-FB hits), GREEN once S3 lands swapGate:"swapped".
    it('DISCRIMINATING (F2 fix): the rider lands in the pre-FB swap gap (swapGate, not inFb)', () => {
      const firstFb = fbStarts(base.events)[0]?.frame;
      expect(
        firstFb,
        'no Full Burst opened — fixture produced no rotation',
      ).toBeDefined();
      const preFb = riderHits(base.events).filter((d) => d.frame < firstFb!);
      expect(
        preFb.length,
        'shipped inFb gates the rider OUT of the pre-FB swap gap; a faithful swapGate fires it there',
      ).toBeGreaterThanOrEqual(1);
    });

    it('SANITY: the faithful swapGate moves the pre-FB count off zero without changing the kit magnitude', () => {
      const firstFb = fbStarts(swapGate.events)[0]?.frame;
      const preFb = riderHits(swapGate.events).filter(
        (d) => d.frame < firstFb!,
      );
      expect(
        preFb.length,
        'swapGate counterfactual should fire pre-FB riders',
      ).toBeGreaterThanOrEqual(1);
      expect([
        ...new Set(riderHits(swapGate.events).map((d) => d.atkPct)),
      ]).toEqual([47.18]);
    });
  });

  describe('M3 — S1 Fervor: Cooldown of Burst Skill ▼20s continuously (always on → effective ~15s CD)', () => {
    it('she sustains a burst roughly every rotation (≥10 casts over 180s), not a 40s CD', () => {
      expect(moranCasts(base.events).length).toBeGreaterThanOrEqual(10);
    });

    it('DISCRIMINATING: removing Fervor roughly halves her cast count', () => {
      const withFervor = moranCasts(base.events).length;
      const without = moranCasts(noFervor.events).length;
      expect(
        without,
        'noFervor counterfactual still cast as often — Fervor is inert',
      ).toBeLessThan(withFervor);
      expect(withFervor).toBeGreaterThanOrEqual(without * 1.5);
    });
  });

  describe('M6 — S2 entering Full Burst (Fervor) → all allies: Cooldown of Burst Skill ▼7.48s', () => {
    it('DISCRIMINATING: removing the team CDR drops the team burst cadence', () => {
      expect(castsOf(base.events, 'crown')).toBeGreaterThan(
        castsOf(noTeamCdr.events, 'crown'),
      );
      expect(moranCasts(base.events).length).toBeGreaterThan(
        moranCasts(noTeamCdr.events).length,
      );
    });
  });

  describe('M7 — burst Changes the weapon in use: 14.7% of final ATK, 10s (REPLACIVE weaponSwap)', () => {
    it('her normal-bucket shots become 14.7% inside the swap window (the weapon is replaced)', () => {
      const swaps = swapShots(base.events);
      expect(
        swaps.length,
        'no 14.7% swap shots — the weapon swap never fired',
      ).toBeGreaterThan(0);
      expect([...new Set(swaps.map((d) => d.atkPct))]).toEqual([14.7]);
    });

    it('DISCRIMINATING (F3 refuted): the additive extraHitDamagePct model produces NO 14.7 shots and over-credits her total', () => {
      // Structural proof: an additive rider never REPLACES the weapon, so no 14.7% normal shots exist.
      expect(
        swapShots(additive.events).length,
        'additive model must not replace the weapon',
      ).toBe(0);
      // Corroborating direction: stacking +14.7% on the 14.71 AR over-credits (the REFUTED F3). Muted
      // vs a pure per-shot doubling because removing the swap also deadens the swap-gated M2 rider.
      expect(
        additive.totals.moran,
        'additive 14.7 on top of the 14.71 AR must over-credit her total',
      ).toBeGreaterThan(base.totals.moran * 1.05);
    });
  });

  describe('M10 — burst Unlimited ammunition for 10s (rides the swap window)', () => {
    it('the swap-window shots are exactly the unlimited-ammo shots', () => {
      const unlimited = moranShots(base.events).filter(
        (s) => s.unlimitedAmmo,
      ).length;
      const swaps = swapShots(base.events).length;
      expect(unlimited, 'no unlimited-ammo shots fired').toBeGreaterThan(0);
      expect(unlimited).toBe(swaps);
    });
  });

  describe('M12 — burst grants all allies Damage Taken ▼35.14% for 10s (applied, engine-inert)', () => {
    const applied = moranBuff(base.events, 'damageTakenPct');

    it('is applied to all four allies at the kit magnitude for 10 sec', () => {
      expect(
        applied.length,
        'no burst damageTakenPct buff was applied',
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([-35.14]);
      expect(
        holders(applied).size,
        `reached ${holders(applied).size} allies, expected 4`,
      ).toBe(4);
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });

    it('is INERT against the partless boss: removing it changes NO unit total by a single point', () => {
      expect(noDmgTaken.totals).toEqual(base.totals);
    });
  });

  describe("M14 — burst grants all allies ATK ▲42.57% of MORAN's ATK (casterAtkPct, flat caster add)", () => {
    const applied = moranBuff(base.events, 'casterAtkPct');
    const expectedFlat = 0.4257 * unitOf(base.res, 'moran').staticAtk;

    it("is a FLAT add of moran's ATK (value ≈ 0.4257×staticAtk), reaching all four allies for 10s", () => {
      expect(applied.length, 'no burst casterAtkPct buff was applied').toBe(
        moranCasts(base.events).length * 4,
      );
      for (const b of applied) {
        expect(
          b.value,
          'casterAtkPct must record a flat ATK grant, not the raw 42.57',
        ).toBeGreaterThan(1000);
        expect(b.value).toBeCloseTo(expectedFlat, 4);
      }
      expect(
        holders(applied).size,
        `reached ${holders(applied).size} allies, expected 4`,
      ).toBe(4);
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });

    it('DISCRIMINATING: a self-only model collapses the holder set to moran alone', () => {
      const cf = moranBuff(burstSelf.events, 'casterAtkPct');
      expect(
        [...holders(cf)],
        'self-only counterfactual must reach only moran',
      ).toEqual([MORAN]);
    });
  });
});
