// PER-UNIT KIT SPEC — `snow-white` (Snow White, BASE unit — AR/Iron/Attacker, Burst III, cd 40s,
// ammo 60, hitsPerShot 1, chargeFrames 0). NOT snow-white-heavy-arms (SR/Water) — a different unit.
// kit-autonomy gauntlet 2026-07-25 (driver test, S2a).
//
// One assertion group per KIT LINE (SW1..SW5 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears ONLY to build COUNTERFACTUALS (the nearest-wrong model
// each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (data/characters.json → characters.snow-white.skills; level 10/10/10):
//   S1 "Determination" ■ every 30 normal-attack hits → the target: 82.8% final ATK additional dmg [SW1]
//                       ■ every 30 normal-attack hits → self: ATK ▲ 8.28% for 5 sec               [SW2]
//   S2 "Seven Dwarves: V&VI" ■ enemies within range: 144.73% final ATK as damage                  [SW3]
//                            ■ using this skill during Full Burst → self: Crit Rate ▲ 26.1% 10 sec [SW4]
//   BU "Seven Dwarves: I" ■ self: change weapon → charge cannon: 499.5% final ATK, Full Charge    [SW5]
//                            1000% of damage (= ×10 → 4995%), 1 ammo, Pierce
//
// Owner rulings baked into the shipped override (kit-audit Phase C, 2026-07-20 — ground truth this
// test PINS, not re-derives): SW3 fires on a 15s INTERNAL COOLDOWN (interval); SW4 is gained on
// FULL-BURST ENTRY (fullBurstEnter); SW5 is one DELAYED full-charge hit (flatDamage delaySec 5.5,
// chargeMultPct 1000 → ×10, core/pierce/rangeOk) — NOT a weaponSwap, so her AR keeps firing.
//
// Why each assertion discriminates (a test that cannot fail under the nearest-wrong model gates
// nothing):
//   SW1 hitCount-30 cadence: the rider fires once per 30 hits (≈ floor(shots/30) = 58 here), NOT
//       once per burst (6) or per Full Burst (11) — the prior bug was a passive ~1×/fight (inert).
//       Magnitude is the lvl-10 82.8, not the lvl-1 51.75.
//   SW2 "Affects self": the ATK buff targets ONLY snow-white (casterIdx===targetIdx), value 8.28
//       (not 5.17), for exactly 5s (300 frames) — a mis-read "allies/all" would spread targetIdx.
//   SW3 interval-15s vs the two nearest-wrong triggers: a fullBurstEnter trigger lands the SAME
//       count (11, FB cycle ≈ 15s) but at FB-ENTRY times (5.73, 23.4, …), NOT at exact multiples of
//       15 (15, 30, … 165); a burstCast (swap-gate) trigger fires only 6×. Proc TIMES discriminate
//       interval from fullBurstEnter; proc COUNT discriminates it from the swap-gate bug.
//   SW4 fullBurstEnter vs burstCast (THE trigger-identity pair): with another B3 (helm) in the comp,
//       Full Bursts happen 11× but snow-white casts B3 only 6×. The crit buff fires 11× (== FB count,
//       at FB-entry times), NOT 6× — a burstCast encoding under-credits by ~half.
//   SW5 ×10 multiplicative full-charge: mult.charge === 10 (chargeMultPct 1000 → Charge ×10) at
//       atkPct 499.5 — the additive mis-read (1499.5%, charge 1) is ~3-4× too small (footage). The
//       DELAYED landing (delaySec 5.5) puts the hit INSIDE the FB window → fbMajorApplied true; an
//       instant burstCast nuke lands BEFORE FB opens → fbMajorApplied false. core + rangeOk pinned.
//
// Fixture: the 720-kit-audit control comp (liter B1 / crown B2 / snow-white B3 / helm B3, boss Fire,
// focus snow-white) — snow-white needs a real rotation to cast her burst at all (a lone B3 makes ZERO
// Full Bursts). helm shares B3 so snow-white bursts every SECOND FB window (6 of 11). Deterministic.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
const SW = 'snow-white';
/** controlComp slot order: liter 0 / crown 1 / snow-white 2 / helm 3. */
const SW_IDX = 2;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp(SW),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res), swTotal: unitOf(res, SW).totalDamage };
}

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const swShots = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'shot' && (e as any).slug === SW);
const swBursts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'burstCast' && (e as any).slug === SW);
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart');
const swSlot = (evs: SimEvent[], slot: Damage['srcSlot']) =>
  dmg(evs).filter((d) => d.slug === SW && d.srcSlot === slot);

// ---- counterfactual patches (nearest-wrong models) -------------------------------------------
const findBlock = (
  ov: any,
  slot: 'skill1' | 'skill2' | 'burst',
  pred: (b: any) => boolean
) => {
  const b = ov[slot].find(pred);
  if (!b) {
    throw new Error(`snow-white ${slot} block missing — fixture is stale`);
  }
  return b;
};
const isRider = (b: any) =>
  b.effects.some((e: any) => e.kind === 'flatDamage' && e.atkPct === 82.8);
const isAtkBuff = (b: any) =>
  b.effects.some((e: any) => e.kind === 'buff' && e.stat === 'atkPct');
const isS2Dmg = (b: any) =>
  b.effects.some((e: any) => e.kind === 'flatDamage' && e.atkPct === 144.73);
const isS2Crit = (b: any) =>
  b.effects.some((e: any) => e.kind === 'buff' && e.stat === 'critRatePct');
const isCannon = (b: any) =>
  b.effects.some((e: any) => e.kind === 'flatDamage' && e.atkPct === 499.5);

/** SW1 nearest-wrong: rider gated on burstCast (6×/fight) instead of every-30-hits (58×). */
const swS1BurstGated = withPatchedOverride(SW, (ov) => {
  findBlock(ov, 'skill1', isRider).trigger = { kind: 'burstCast' };
});
/** SW2 nearest-wrong: the ATK buff targets all allies instead of self only. */
const swS2Allies = withPatchedOverride(SW, (ov) => {
  findBlock(ov, 'skill1', isAtkBuff).target = { kind: 'allies' };
});
/** SW3 nearest-wrong #1: the 144.73% line scoped to Full Burst entry (fires at FB times, not 15s). */
const swS3FbEnter = withPatchedOverride(SW, (ov) => {
  findBlock(ov, 'skill2', isS2Dmg).trigger = { kind: 'fullBurstEnter' };
});
/** SW3 nearest-wrong #2: the prior swap-gate bug (fires per burstCast, ~6×). */
const swS3BurstGated = withPatchedOverride(SW, (ov) => {
  findBlock(ov, 'skill2', isS2Dmg).trigger = { kind: 'burstCast' };
});
/** SW4 nearest-wrong: crit gained on burstCast (6×) instead of fullBurstEnter (11×). */
const swS4BurstGated = withPatchedOverride(SW, (ov) => {
  findBlock(ov, 'skill2', isS2Crit).trigger = { kind: 'burstCast' };
});
/** SW4 nearest-wrong (S2b cross-family reviewer's reading): crit keyed to the S2 interval cast
 *  gated on being in FB — fires at the S2-cast times (15,30,…), NOT at FB-entry frames. */
const swS4Interval = withPatchedOverride(SW, (ov) => {
  findBlock(ov, 'skill2', isS2Crit).trigger = { kind: 'interval', sec: 15 };
});
/** SW5 nearest-wrong #1: additive full-charge (no ×10 charge bucket). */
const swS5NoCharge = withPatchedOverride(SW, (ov) => {
  const e = findBlock(ov, 'burst', isCannon).effects.find(
    (x: any) => x.kind === 'flatDamage'
  );
  delete e.charge;
  delete e.chargeMultPct;
});
/** SW5 nearest-wrong #2: instant nuke (no delay) — lands before the FB window opens. */
const swS5Instant = withPatchedOverride(SW, (ov) => {
  const e = findBlock(ov, 'burst', isCannon).effects.find(
    (x: any) => x.kind === 'flatDamage'
  );
  delete e.delaySec;
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const s1BurstGated = run({ [SW]: swS1BurstGated });
const s2Allies = run({ [SW]: swS2Allies });
const s3FbEnter = run({ [SW]: swS3FbEnter });
const s3BurstGated = run({ [SW]: swS3BurstGated });
const s4BurstGated = run({ [SW]: swS4BurstGated });
const s4Interval = run({ [SW]: swS4Interval });
const s5NoCharge = run({ [SW]: swS5NoCharge });
const s5Instant = run({ [SW]: swS5Instant });

describe('snow-white (BASE, AR/Iron) — kit spec', () => {
  describe('SW1 — S1 every-30-hits rider deals 82.8% final ATK to the target', () => {
    const riders = swSlot(base.events, 'skill1');
    it('fires once per 30 hits (hitCount cadence), not per burst/FB', () => {
      const shots = swShots(base.events).length; // hitsPerShot 1 → hits === shots
      expect(
        riders.length,
        `${riders.length} riders vs ${shots} shots / ${swBursts(base.events).length} bursts`
      ).toBe(Math.floor(shots / 30));
      expect(riders.length).toBeGreaterThan(20); // 58 here — neither 6 (burst) nor 11 (FB) nor 1 (inert)
    });
    it('is the lvl-10 magnitude 82.8, in the skill bucket, crit-eligible', () => {
      expect([...new Set(riders.map((d) => d.atkPct))]).toEqual([82.8]);
      expect([...new Set(riders.map((d) => d.bucket))]).toEqual(['skill']);
      expect(riders.every((d) => d.critEligible)).toBe(true);
    });
    it('DISCRIMINATES: a burstCast-gated rider fires far fewer times', () => {
      expect(swSlot(s1BurstGated.events, 'skill1').length).toBe(
        swBursts(base.events).length
      );
      expect(swSlot(s1BurstGated.events, 'skill1').length).not.toBe(
        riders.length
      );
    });
  });

  describe('SW2 — S1 every-30-hits self ATK ▲ 8.28% for 5 sec', () => {
    const own = buffs(base.events).filter(
      (b) => b.stat === 'atkPct' && b.value === 8.28 && b.casterIdx === SW_IDX
    );
    it('targets ONLY snow-white (self), value 8.28, for exactly 5s', () => {
      expect(own.length).toBeGreaterThan(0);
      expect([...new Set(own.map((b) => b.targetIdx))]).toEqual([SW_IDX]);
      expect([
        ...new Set(own.map((b) => (b.expiresFrame ?? -1) - b.frame)),
      ]).toEqual([5 * FPS]);
    });
    it('shares the hitCount-30 cadence of the rider', () => {
      expect(own.length).toBe(swSlot(base.events, 'skill1').length);
    });
    it('DISCRIMINATES: an all-allies encoding spreads the holders beyond self', () => {
      const spread = buffs(s2Allies.events).filter(
        (b) => b.stat === 'atkPct' && b.value === 8.28 && b.casterIdx === SW_IDX
      );
      expect(new Set(spread.map((b) => b.targetIdx)).size).toBeGreaterThan(1);
    });
  });

  describe('SW3 — S2 144.73% "enemies within range" fires on a 15s internal cooldown', () => {
    const procs = swSlot(base.events, 'skill2');
    const times = procs.map((d) => +d.sec.toFixed(2));
    it('fires ~12×/180s at exact multiples of 15s (interval, first fire t=15)', () => {
      expect(procs.length).toBe(11); // t=15,30,…,165 (engine interval convention; ⚑ phase t=15 vs t=0)
      for (const t of times) {
        expect(t % 15).toBe(0);
      }
    });
    it('is the lvl-10 magnitude 144.73 in the skill bucket', () => {
      expect([...new Set(procs.map((d) => d.atkPct))]).toEqual([144.73]);
      expect([...new Set(procs.map((d) => d.bucket))]).toEqual(['skill']);
    });
    it('DISCRIMINATES vs fullBurstEnter: same count, but procs land at FB-ENTRY times, not 15s multiples', () => {
      const fbTimes = swSlot(s3FbEnter.events, 'skill2').map(
        (d) => +d.sec.toFixed(2)
      );
      expect(fbTimes).not.toEqual(times);
      expect(fbTimes.some((t) => t % 15 !== 0)).toBe(true);
    });
    it('DISCRIMINATES vs the swap-gate bug: burstCast fires only per burst (~6×)', () => {
      expect(swSlot(s3BurstGated.events, 'skill2').length).toBe(
        swBursts(base.events).length
      );
      expect(swSlot(s3BurstGated.events, 'skill2').length).not.toBe(
        procs.length
      );
    });
  });

  describe('SW4 — S2 Crit Rate ▲ 26.1% for 10s is gained on FULL-BURST ENTRY', () => {
    const crits = buffs(base.events).filter(
      (b) =>
        b.stat === 'critRatePct' && b.value === 26.1 && b.casterIdx === SW_IDX
    );
    it('fires once per Full Burst (== FB count), self-scoped, for 10s', () => {
      expect(crits.length).toBe(fbStarts(base.events).length);
      expect(crits.length).toBeGreaterThan(0);
      expect([...new Set(crits.map((b) => b.targetIdx))]).toEqual([SW_IDX]);
      expect([
        ...new Set(crits.map((b) => (b.expiresFrame ?? -1) - b.frame)),
      ]).toEqual([10 * FPS]);
    });
    it('lands exactly at the Full Burst entry frames', () => {
      const critFrames = [...new Set(crits.map((b) => b.frame))].sort(
        (a, b) => a - b
      );
      const fbFrames = [
        ...new Set(fbStarts(base.events).map((e) => e.frame)),
      ].sort((a, b) => a - b);
      expect(critFrames).toEqual(fbFrames);
    });
    it('DISCRIMINATES vs burstCast: fires only when snow-white casts B3 (6×, not 11×)', () => {
      const gated = buffs(s4BurstGated.events).filter(
        (b) =>
          b.stat === 'critRatePct' && b.value === 26.1 && b.casterIdx === SW_IDX
      );
      expect(gated.length).toBe(swBursts(base.events).length);
      expect(gated.length).not.toBe(crits.length);
    });
    it('DISCRIMINATES vs an inFb-gated S2 interval cast (S2b nearest-wrong): fires at S2-cast frames, not FB-entry frames', () => {
      const intFrames = [
        ...new Set(
          buffs(s4Interval.events)
            .filter(
              (b) =>
                b.stat === 'critRatePct' &&
                b.value === 26.1 &&
                b.casterIdx === SW_IDX
            )
            .map((b) => b.frame)
        ),
      ].sort((a, b) => a - b);
      const fbFrames = [
        ...new Set(fbStarts(base.events).map((e) => e.frame)),
      ].sort((a, b) => a - b);
      expect(intFrames).not.toEqual(fbFrames);
    });
  });

  describe('SW5 — burst charge cannon: 499.5% × 10 full-charge, delayed into FB, core+pierce+range', () => {
    const nukes = swSlot(base.events, 'burst');
    it('fires once per burst cast, in the burst bucket, at the 499.5% base', () => {
      expect(nukes.length).toBe(swBursts(base.events).length);
      expect(nukes.length).toBeGreaterThan(0);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([499.5]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
    });
    it('applies the ×10 full-charge MULTIPLIER (charge bucket = 10), not an additive coefficient', () => {
      expect([...new Set(nukes.map((d) => d.mult.charge))]).toEqual([10]);
    });
    it('DISCRIMINATES vs additive: dropping chargeMultPct collapses the charge bucket to 1', () => {
      expect([
        ...new Set(
          swSlot(s5NoCharge.events, 'burst').map((d) => d.mult.charge)
        ),
      ]).toEqual([1]);
    });
    it('lands INSIDE the FB window (delayed 5.5s) → takes the +50% FB major', () => {
      expect(nukes.every((d) => d.fbMajorApplied)).toBe(true);
      expect(nukes.every((d) => d.inFullBurst)).toBe(true);
    });
    it('DISCRIMINATES vs instant: an undelayed cast lands before FB opens → no FB major', () => {
      expect(
        swSlot(s5Instant.events, 'burst').every((d) => d.fbMajorApplied)
      ).toBe(false);
    });
    it('is core-eligible and range-eligible (rangeOk), unlike a default no-range rider', () => {
      expect(nukes.every((d) => d.coreEligible)).toBe(true);
      expect(nukes.some((d) => d.rangeApplied)).toBe(true);
    });
  });

  describe('inertness / whole-picture', () => {
    it('the cannon out-damages the skill riders (it is the dominant kit contribution)', () => {
      const cannonDmg = swSlot(base.events, 'burst').reduce(
        (s, d) => s + d.amount,
        0
      );
      const riderDmg = swSlot(base.events, 'skill1').reduce(
        (s, d) => s + d.amount,
        0
      );
      expect(cannonDmg).toBeGreaterThan(riderDmg);
    });
    it('snow-white contributes real damage in the control comp (kit is not inert overall)', () => {
      expect(base.swTotal).toBeGreaterThan(0);
    });
  });
});
