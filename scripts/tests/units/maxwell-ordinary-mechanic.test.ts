// PER-UNIT KIT SPEC — `maxwell-ordinary-mechanic` (Maxwell: Ordinary Mechanic, aka "mom";
// Supporter/SR/Wind, Burst II, cd 20s, ammo 6, chargeFrames 60). Kit-autonomy gauntlet
// 2026-07-31; from-scratch MODEL_ONLY build (no recording — simSupported was false).
//
// One assertion group per KIT LINE (M1..M7 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters['maxwell-ordinary-mechanic'].skills,
// level-10 datamined values):
//   S1 ■ Full Charge attack → all allies: Max HP ▲ 1% of the skill user's max HP, continuously,
//                                                stacks up to 30                              [M1]
//      ■ entering Burst Stage 3 → all allies: Attack Damage ▲ 10% for 5 sec                   [M2]
//   S2 ■ Burst Skill → all allies: ATK ▲ 1% of the skill user's final max HP for 15 sec       [M3]
//      ■ Burst Skill → self: Overcurrent: ATK ▲ 30% continuously, up to 5 stages              [M4]
//      ■ Full Charge attack → all allies: Fills Burst Gauge by 7.15%                          [M5]
//   BU ■ self: changes the weapon in use (Matis UberBuster): Damage 350% of final ATK,
//                  Full Charge Damage 300%, Max Ammunition 1, Gains Pierce,
//                  charge time fixed by Overcurrent stage (3/2.5/2/1.5/0.4 sec)               [M6]
//      ■ all allies: Attack Damage ▲ 25% for 10 sec                                           [M7]
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   M1  casterMaxHpPct arrives as a flat maxHpFlat grant keyed to the CASTER. Proven by value
//       (== 1% of mom's final Max HP), the stack cap (maxes at 30 despite ~68 full-charge shots,
//       so it is capped — not unlimited, not 1), the all-ally scope, the shotFired cadence (one
//       application per shot per ally) and the continuous (no-expiry) duration. Ally-granted Max
//       HP is offensively inert by the cindy e3 rule, so the line's only damage path is mom's OWN
//       stacks feeding her own M3 caster-Max-HP conversion basis — the buff-application signature
//       is the pin.
//   M2  stageEnter:3, NOT burstCast: the value-10 buff fires EXACTLY on the B3 caster's (ada's)
//       cast frames, which are distinct from mom's own B2 cast frames. A burstCast-keyed model
//       fires on mom's frames — the frame-set equality is the discriminator.
//   M3  the stat IS atkOfCasterMaxHpPct — "ATK ▲ 1% of the SKILL USER'S final max HP" is
//       CASTER-basis: it arrives as a FLAT casterAtkPct-routed ATK add of 1% of mom's LIVE Max HP
//       at each cast (owner ruling 2026-08-04: the shipped target-own atkOfMaxHpPct was a misread
//       of the caster-scaled kit text). Her own S1 stacks feed the basis (self-granted Max HP is
//       the one case the e3 rule admits), so the flat is uniform across all three allies per cast
//       and GROWS across successive casts as her stacks accrue. burstCast-keyed (mom's B2 frames),
//       all-ally scope, 15 sec.
//   M4  Overcurrent: self-ONLY scope (targetIdx === mom, no ally shares it), stack cap 5 (maxes
//       at 5 despite ~10 burst casts), continuous (no expiry), one stack per burst cast.
//   M5  gauge generation is carried by data/gauge-per-shot.json (helm-H3 precedent), NOT an
//       override block — the gauge pipeline emits no event, so it is pinned by reading the data
//       file. 7.15% → flatPerTrigger 715.
//   M6  the weapon swap shows up in the NORMAL bucket (the swap replaces the normal weapon): swap
//       shots carry atkPct 350 and mult.charge 3.0 (the 300% full-charge multiplier), base shots
//       carry 69.04 / 2.5. Presence + 350 + 300%-charge are pinned (these are constant across all
//       five Overcurrent bands). maxAmmo 1 / Pierce are inert/unpinnable in a single-target
//       no-Pierce-Up comp. The swap is now FIVE resourceGate-banded blocks (one per Overcurrent
//       stage), so the counterfactual helpers patch EVERY band.
//   M7  burstCast-keyed (mom's B2 frames), value 25 (≠ M2's 10), 10 sec (600 frames ≠ M2's 300),
//       all-ally scope.
//   M8  the swap's CHARGE TIME is fixed by the live Overcurrent stage (Stage 1 or below 3s / 2 2.5s
//       / 3 2s / 4 1.5s / 5 or above 0.4s) — encoded as five resourceGate-banded weaponSwap blocks
//       reading the 'overcurrent' resource pool that S2-B increments per cast (the laplace
//       oeStage exemplar). Slot order skill2→burst means the stack gained on cast N counts for
//       cast N's ladder, so the swap cadence ACCELERATES across the first five bursts. Pinned by
//       (a) the ladder out-shooting a fixed-3s counterfactual over the fight and (b) a late-fight
//       burst window (stage 5, 0.4s) out-shooting the first (stage 1, 3s). Red under any
//       fixed-charge-time model (constant spacing). This line was parked as a 'missing primitive'
//       in the first S3 pass; the S2b blind reviewer derived it as encodable and the engine verify
//       confirmed resourceGate exists — re-opened and modeled (faithful > fit).
//
// Fixture: liter (B1) / mom (B2) / ada (B3), boss Iron (Wind-advantaged for mom), focus mom. A
// minimal B1/B2/B3 chain so mom casts her burst (≈10× in 180s) AND a B3 casts (ada, cd 40 → 5×)
// to exercise the stageEnter:3 line. Deterministic (no seed). mom is slot 1 → casterIdx 1.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, unitOf, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const SLUG = 'maxwell-ordinary-mechanic';
const MOM = 1; // fixture slot order: liter 0 / mom 1 / ada 2

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: ['liter', SLUG, 'ada'],
    bossElement: 'Iron',
    focusSlug: SLUG,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, res };
}

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
/** mom's own buff applications (casterIdx === MOM), optionally by stat + value. */
const momBuffs = (evs: SimEvent[], stat: string, value?: number) =>
  buffs(evs).filter(
    (b) =>
      b.casterIdx === MOM &&
      b.stat === stat &&
      (value === undefined || b.value === value)
  );
const distinctFrames = (bs: BuffApply[]) =>
  [...new Set(bs.map((b) => b.frame))].sort((a, b) => a - b);
const burstFrames = (evs: SimEvent[], slug: string) =>
  evs
    .filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === slug)
    .map((e) => e.frame)
    .sort((a, b) => a - b);
const momShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === SLUG);
const momDamage = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage' && e.slug === SLUG);
/** Swap shots: normal-bucket hits at the swap's 350% multiplier (base SR shots are 69.04%). */
const swapShots = (evs: SimEvent[]) =>
  momDamage(evs).filter((d) => Math.round(d.atkPct) === 350);

// ---- counterfactual patches (nearest-wrong models) -------------------------------------------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);

/** M1 reference: S1-A Max-HP stack line removed. */
const momNoS1A = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'casterMaxHpPct'));
  if (ov.skill1.length === before) {
    throw new Error('mom S1-A casterMaxHpPct block missing — fixture is stale');
  }
});
/** M2 counterfactual: S1-B re-keyed from stageEnter:3 to mom's OWN burstCast. */
const momS1BOnBurstCast = withPatchedOverride(SLUG, (ov) => {
  const b = ov.skill1.find((x: any) => x.trigger.kind === 'stageEnter');
  if (!b) {
    throw new Error('mom S1-B stageEnter block missing — fixture is stale');
  }
  b.trigger = { kind: 'burstCast' };
});
/** M3 reference: S2-A ATK-from-HP line removed. */
const momNoS2A = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasStat(b, 'atkOfCasterMaxHpPct'));
  if (ov.skill2.length === before) {
    throw new Error('mom S2-A atkOfCasterMaxHpPct block missing — fixture is stale');
  }
});
/** M3 counterfactual: the PRE-2026-08-04 model — target-own atkOfMaxHpPct (a percent stat
 *  re-read against each holder's own Max HP) instead of the caster-basis flat add. */
const momS2ATargetOwn = withPatchedOverride(SLUG, (ov) => {
  const b = ov.skill2.find((x: any) => hasStat(x, 'atkOfCasterMaxHpPct'));
  if (!b) {
    throw new Error('mom S2-A atkOfCasterMaxHpPct block missing — fixture is stale');
  }
  b.effects
    .filter((e: any) => e.stat === 'atkOfCasterMaxHpPct')
    .forEach((e: any) => (e.stat = 'atkOfMaxHpPct'));
});
/** M4 reference: S2-B Overcurrent line removed. */
const momNoS2B = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) => !(b.target.kind === 'self' && hasStat(b, 'atkPct'))
  );
  if (ov.skill2.length === before) {
    throw new Error('mom S2-B self atkPct block missing — fixture is stale');
  }
});
/** M4 counterfactual: Overcurrent re-scoped from self to ALL allies. */
const momS2BAllies = withPatchedOverride(SLUG, (ov) => {
  const b = ov.skill2.find(
    (x: any) => x.target.kind === 'self' && hasStat(x, 'atkPct')
  );
  if (!b) {
    throw new Error('mom S2-B self atkPct block missing — fixture is stale');
  }
  b.target = { kind: 'allies' };
});
/** All weaponSwap effects across the (now resourceGate-banded) burst blocks. */
const swapsOf = (ov: any) => {
  const swaps = ov.burst.flatMap((b: any) =>
    b.effects.filter((e: any) => e.kind === 'weaponSwap')
  );
  if (swaps.length === 0) {
    throw new Error('mom burst weaponSwap block missing — fixture is stale');
  }
  return swaps;
};
/** M6 reference: the weapon swap removed entirely (every band). */
const momNoSwap = withPatchedOverride(SLUG, (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'weaponSwap')
  );
  if (ov.burst.length === before) {
    throw new Error('mom burst weaponSwap block missing — fixture is stale');
  }
});
/** M6 counterfactual: swap damage halved (175% instead of 350%) on EVERY band. */
const momSwap175 = withPatchedOverride(SLUG, (ov) => {
  swapsOf(ov).forEach((e: any) => (e.damagePct = 175));
});
/** M6 counterfactual: swap full-charge multiplier 100% instead of 300% on EVERY band. */
const momSwapCharge100 = withPatchedOverride(SLUG, (ov) => {
  swapsOf(ov).forEach((e: any) => (e.chargeMultPct = 100));
});
/** M8 counterfactual: the Overcurrent charge-time ladder collapsed to a FIXED 3s charge — the
 *  nearest-wrong model (the pre-gauntlet encoding). The 'overcurrent' resource still tracks the
 *  stage (S2-B is untouched) but the single swap block ignores it and always charges 3s, so the
 *  cadence never accelerates. */
const momFixed3sCharge = withPatchedOverride(SLUG, (ov) => {
  ov.burst = ov.burst.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'weaponSwap')
  );
  ov.burst.push({
    slot: 'burst',
    trigger: { kind: 'burstCast' },
    target: { kind: 'self' },
    effects: [
      {
        kind: 'weaponSwap',
        damagePct: 350,
        chargeTimeSec: 3,
        chargeMultPct: 300,
        maxAmmo: 1,
        hasPierce: true,
        durationSec: 10,
      },
    ],
  });
});
/** M7 reference: the burst team Attack Damage buff removed. */
const momNoBurstBuff = withPatchedOverride(SLUG, (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !hasStat(b, 'attackDamagePct'));
  if (ov.burst.length === before) {
    throw new Error(
      'mom burst attackDamagePct block missing — fixture is stale'
    );
  }
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noS1A = run({ [SLUG]: momNoS1A });
const s1BOnBurstCast = run({ [SLUG]: momS1BOnBurstCast });
const noS2A = run({ [SLUG]: momNoS2A });
const s2ATargetOwn = run({ [SLUG]: momS2ATargetOwn });
const noS2B = run({ [SLUG]: momNoS2B });
const s2BAllies = run({ [SLUG]: momS2BAllies });
const noSwap = run({ [SLUG]: momNoSwap });
const swap175 = run({ [SLUG]: momSwap175 });
const swapCharge100 = run({ [SLUG]: momSwapCharge100 });
const fixed3sCharge = run({ [SLUG]: momFixed3sCharge });
const noBurstBuff = run({ [SLUG]: momNoBurstBuff });

const momMaxHp = unitOf(base.res, SLUG).maxHp;
const adaFrames = burstFrames(base.events, 'ada');
const momFrames = burstFrames(base.events, SLUG);

describe('maxwell-ordinary-mechanic — kit spec', () => {
  describe('M1 — S1 Full Charge grants all allies Max HP ▲ 1% of the user Max HP, stack 30, continuous', () => {
    const applied = momBuffs(base.events, 'maxHpFlat');

    it('is a flat grant of exactly 1% of mom final Max HP, to all three allies', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([
        (1 / 100) * momMaxHp,
      ]);
      expect([...new Set(applied.map((b) => b.targetIdx))].sort()).toEqual([
        0, 1, 2,
      ]);
    });

    it('caps at 30 stacks (not unlimited, not 1) despite far more than 30 full-charge shots', () => {
      const stacks = applied.map((b) => b.stacks);
      expect(Math.max(...stacks)).toBe(30);
      expect([...new Set(applied.map((b) => b.maxStacks))]).toEqual([30]);
      // ~68 shots in the fight → uncapped would reach ~68; the cap is what holds it at 30.
      expect(momShots(base.events).length).toBeGreaterThan(30);
    });

    it('is continuous (no wall-clock expiry) and fires on the shotFired cadence (one per shot per ally)', () => {
      expect([...new Set(applied.map((b) => b.expiresFrame))]).toEqual([null]);
      // each full-charge shot applies to all 3 allies → applications == shots × 3.
      expect(applied.length).toBe(momShots(base.events).length * 3);
    });

    it('DISCRIMINATING: removing the line strips every mom maxHpFlat grant', () => {
      expect(momBuffs(noS1A.events, 'maxHpFlat').length).toBe(0);
    });
  });

  describe('M2 — S1 entering Burst Stage 3 grants all allies Attack Damage ▲ 10% for 5 sec', () => {
    const applied = momBuffs(base.events, 'attackDamagePct', 10);

    it('fires EXACTLY on the B3 (ada) cast frames — stageEnter:3, not mom own-burstCast', () => {
      expect(adaFrames.length).toBeGreaterThan(0);
      expect(distinctFrames(applied)).toEqual(adaFrames);
      // …which are distinct from mom's own B2 cast frames.
      expect(distinctFrames(applied)).not.toEqual(momFrames);
    });

    it('reaches all three allies for 5 sec (300 frames)', () => {
      expect([...new Set(applied.map((b) => b.targetIdx))].sort()).toEqual([
        0, 1, 2,
      ]);
      expect([
        ...new Set(applied.map((b) => b.expiresFrame! - b.frame)),
      ]).toEqual([5 * FPS]);
    });

    it('DISCRIMINATING: re-keyed to mom own-burstCast, it fires on mom B2 frames instead', () => {
      const wrong = momBuffs(s1BOnBurstCast.events, 'attackDamagePct', 10);
      expect(distinctFrames(wrong)).toEqual(momFrames);
      expect(distinctFrames(wrong)).not.toEqual(adaFrames);
    });
  });

  describe("M3 — S2 Burst Skill grants all allies ATK ▲ 1% of the SKILL USER'S final Max HP for 15 sec", () => {
    // Caster-basis: a FLAT casterAtkPct-routed add of 1% of mom's LIVE Max HP, snapshotted at
    // each cast. Her own S1 stacks (self-granted maxHpFlat — the one case the e3 rule admits)
    // feed the basis, so the expected flat at a cast frame is 1% × (base + stacks × 1% base).
    const applied = momBuffs(base.events, 'casterAtkPct');
    const ownGrants = momBuffs(base.events, 'maxHpFlat').filter(
      (b) => b.targetIdx === MOM
    );
    const stacksAt = (f: number) => {
      const upTo = ownGrants.filter((b) => b.frame <= f);
      return upTo.length > 0 ? upTo[upTo.length - 1].stacks : 0;
    };
    const expectedFlat = (f: number) =>
      (1 / 100) * (momMaxHp + stacksAt(f) * (1 / 100) * momMaxHp);

    it('is a flat add of 1% of mom LIVE Max HP at each cast, uniform across all three allies', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect(distinctFrames(applied)).toEqual(momFrames);
      expect([...new Set(applied.map((b) => b.targetIdx))].sort()).toEqual([
        0, 1, 2,
      ]);
      expect([
        ...new Set(applied.map((b) => b.expiresFrame! - b.frame)),
      ]).toEqual([15 * FPS]);
      for (const b of applied) {
        expect(b.value).toBeCloseTo(expectedFlat(b.frame), 6);
      }
    });

    it('GROWS across casts as her S1 stacks accrue (the basis is live, snapshotted per cast)', () => {
      const perCast = momFrames.map(
        (f) => applied.find((b) => b.frame === f)!.value
      );
      expect(perCast.length).toBeGreaterThanOrEqual(2);
      for (let i = 1; i < perCast.length; i++) {
        expect(perCast[i]).toBeGreaterThanOrEqual(perCast[i - 1]);
      }
      expect(perCast[perCast.length - 1]).toBeGreaterThan(perCast[0]);
    });

    it('DISCRIMINATING: removing the line strips every mom casterAtkPct grant', () => {
      expect(momBuffs(noS2A.events, 'casterAtkPct').length).toBe(0);
    });

    it('DISCRIMINATING: the old target-own model (atkOfMaxHpPct) emits no flat add at all', () => {
      expect(momBuffs(s2ATargetOwn.events, 'casterAtkPct').length).toBe(0);
      expect(
        momBuffs(s2ATargetOwn.events, 'atkOfMaxHpPct', 1).length
      ).toBeGreaterThan(0);
    });
  });

  describe('M4 — S2 Burst Skill grants SELF Overcurrent: ATK ▲ 30% continuously, up to 5 stages', () => {
    const applied = momBuffs(base.events, 'atkPct', 30);

    it('is self-only (no ally shares the Overcurrent stack budget)', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([MOM]);
    });

    it('caps at 5 stacks despite ~10 burst casts, and is continuous (no expiry)', () => {
      expect(Math.max(...applied.map((b) => b.stacks))).toBe(5);
      expect([...new Set(applied.map((b) => b.maxStacks))]).toEqual([5]);
      expect(momFrames.length).toBeGreaterThan(5);
      expect([...new Set(applied.map((b) => b.expiresFrame))]).toEqual([null]);
      // one stack accrues per burst cast.
      expect(distinctFrames(applied)).toEqual(momFrames);
    });

    it('DISCRIMINATING (presence): removing the line strips the self atkPct grant', () => {
      expect(momBuffs(noS2B.events, 'atkPct', 30).length).toBe(0);
    });

    it('DISCRIMINATING (scope): re-scoped to allies, it lands on allies 0 and 2 too', () => {
      const wrong = momBuffs(s2BAllies.events, 'atkPct', 30);
      expect([...new Set(wrong.map((b) => b.targetIdx))].sort()).toEqual([
        0, 1, 2,
      ]);
    });
  });

  describe('M5 — S2 Full Charge fills Burst Gauge by 7.15% (gauge data, not an override block)', () => {
    it('is the datamined flat per-trigger term flatPerTrigger 715', () => {
      const gauge = JSON.parse(
        readFileSync(
          new URL('../../../data/gauge-per-shot.json', import.meta.url),
          'utf8'
        )
      );
      expect(
        gauge['maxwell-ordinary-mechanic'].flatPerTrigger,
        'kit 7.15% → flatPerTrigger 715'
      ).toBe(715);
    });

    it.skip('is unscaled by camera focus and suppressed during FB/chain — the gauge pipeline emits no event (helm-H3 gap)', () => {
      // Not assertable from the event log today; pinned by the data-file read above.
    });
  });

  describe('M6 — Burst changes the weapon (Matis UberBuster): 350% final ATK, 300% full charge, Pierce', () => {
    it('produces swap shots in the normal bucket at 350% with a ×3.0 full-charge multiplier', () => {
      const shots = swapShots(base.events);
      expect(shots.length).toBeGreaterThan(0);
      expect([...new Set(shots.map((d) => d.atkPct))]).toEqual([350]);
      expect([...new Set(shots.map((d) => d.mult.charge))]).toEqual([3]);
      expect([...new Set(shots.map((d) => d.bucket))]).toEqual(['normal']);
    });

    it('base (non-swap) SR shots stay at 69.04% / ×2.5 charge', () => {
      const baseShots = momDamage(base.events).filter(
        (d) => Math.abs(d.atkPct - 69.04) < 0.01
      );
      expect(baseShots.length).toBeGreaterThan(0);
      expect([...new Set(baseShots.map((d) => d.mult.charge))]).toEqual([2.5]);
    });

    it('DISCRIMINATING (presence): removing the swap leaves only 69.04% base shots', () => {
      expect(swapShots(noSwap.events).length).toBe(0);
    });

    it('DISCRIMINATING (damage): a 175% swap produces no 350% shots', () => {
      expect(swapShots(swap175.events).length).toBe(0);
      expect(
        momDamage(swap175.events).filter((d) => Math.round(d.atkPct) === 175)
          .length
      ).toBeGreaterThan(0);
    });

    it('DISCRIMINATING (full charge): a 100% full-charge swap drops mult.charge to 1.0', () => {
      const shots = swapShots(swapCharge100.events);
      expect(shots.length).toBeGreaterThan(0);
      expect([...new Set(shots.map((d) => d.mult.charge))]).toEqual([1]);
    });
  });

  describe('M7 — Burst grants all allies Attack Damage ▲ 25% for 10 sec', () => {
    const applied = momBuffs(base.events, 'attackDamagePct', 25);

    it('is burstCast-keyed (mom B2 frames), value 25, all allies, 10 sec (600 frames)', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect(distinctFrames(applied)).toEqual(momFrames);
      expect([...new Set(applied.map((b) => b.targetIdx))].sort()).toEqual([
        0, 1, 2,
      ]);
      expect([
        ...new Set(applied.map((b) => b.expiresFrame! - b.frame)),
      ]).toEqual([10 * FPS]);
    });

    it('DISCRIMINATING: removing the burst buff strips the value-25 grant (M2 value-10 remains)', () => {
      expect(momBuffs(noBurstBuff.events, 'attackDamagePct', 25).length).toBe(
        0
      );
      expect(
        momBuffs(noBurstBuff.events, 'attackDamagePct', 10).length
      ).toBeGreaterThan(0);
    });
  });

  describe('M8 — Burst swap charge time is fixed by the Overcurrent stage (3/2.5/2/1.5/0.4s ladder)', () => {
    const swapShotFrames = (evs: SimEvent[]) =>
      swapShots(evs)
        .map((d) => d.frame)
        .sort((a, b) => a - b);
    /** 350% swap shots landing inside the 10s (600f) window opening at a burst-cast frame. */
    const shotsInWindow = (frames: number[], start: number) =>
      frames.filter((f) => f >= start && f < start + 10 * FPS).length;

    it('accelerates the cadence: the ladder out-shoots a fixed-3s charge over the fight', () => {
      const ladder = swapShotFrames(base.events);
      const fixed = swapShotFrames(fixed3sCharge.events);
      expect(ladder.length).toBeGreaterThan(0);
      expect(fixed.length).toBeGreaterThan(0);
      // late-fight bursts (stage 5, 0.4s charge) land far more shots per 10s window than the
      // first burst (stage 1, 3s charge); summed over the fight the ladder beats the fixed model.
      expect(ladder.length).toBeGreaterThan(fixed.length);
    });

    it('a late-fight burst window (stage 5, 0.4s) out-shots the first (stage 1, 3s)', () => {
      expect(momFrames.length).toBeGreaterThanOrEqual(5);
      const frames = swapShotFrames(base.events);
      const first = shotsInWindow(frames, momFrames[0]);
      const fifth = shotsInWindow(frames, momFrames[4]);
      expect(first).toBeGreaterThan(0);
      expect(fifth).toBeGreaterThan(first);
    });

    it('DISCRIMINATING: under a fixed-3s charge the per-window count stays flat (no acceleration)', () => {
      // bucket against the FIXED run's OWN burst frames — burst timing differs between the two
      // runs (the ladder changes the sim dynamics), so the ladder-run windows would misalign.
      const fixedFrames = burstFrames(fixed3sCharge.events, SLUG);
      expect(fixedFrames.length).toBeGreaterThanOrEqual(5);
      const frames = swapShotFrames(fixed3sCharge.events);
      const first = shotsInWindow(frames, fixedFrames[0]);
      const fifth = shotsInWindow(frames, fixedFrames[4]);
      expect(first).toBeGreaterThan(0);
      // fixed charge => identical economy every window; the ladder's fifth-window lift is gone.
      expect(fifth).toBe(first);
    });
  });
});
