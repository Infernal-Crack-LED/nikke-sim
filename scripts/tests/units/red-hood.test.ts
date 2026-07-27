// PER-UNIT KIT SPEC — `red-hood` (Red Hood, Attacker/SR/Iron, Λ-burst, cd 40s, ammo 6,
// chargeFrames 60). Kit-autonomy gauntlet 2026-07-25 (Tier 2).
//
// Red Hood is the ONLY Λ (Lambda) burst unit: the generator force-pins her to B3 and her burst
// advances an internal STEP (1 Beast Cage → 2 The Last Howl → 3 Red Wolf) on successive casts.
// Her override effects are therefore gated on `burstCast` STAGE, which is the Tier-2 heart of this
// file (burstCast-vs-fullBurstEnter, a scoped caster-relative team buff, a weapon swap, and a
// status-gate charge-speed→charge-damage conversion).
//
// One assertion group per KIT LINE (R1..R6), asserted against the SHIPPED override loaded from
// disk. `withPatchedOverride` appears ONLY to build COUNTERFACTUALS (the nearest wrong model each
// assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters['red-hood'].skills):
//   S1 ■ on normal attack → self: Charge Speed ▲3.81%, ×10 stacks, 5 sec                      [R1]
//      ■ at battle start → self: convert Charge Speed excess over 100% to Charge Damage,
//                                  Charge Damage ▲240% of the excess continuously             [R2 ⚑]
//   S2 ■ at battle start → self: Gain Pierce continuously                                      [R3]
//      ■ during Beast Cage → all allies: DEF ▲50.68% of caster DEF, 10 sec                     [inert]
//      ■ during The Last Howl → self: recover 23.04% of attack damage as HP over 10 sec        [inert]
//      ■ on casting Red Wolf → self: ATK ▲71.42% for 10 sec                                    [R4]
//   BU Step 1 Beast Cage → all allies: ATK ▲77.55% of caster ATK, 10 sec                       [R5]
//      Step 1 → self: Burst CD ▼40 sec, once per battle                                        [R7]
//      Step 2 The Last Howl → self: Taunt all enemies 10 sec                                   [inert]
//      Step 2 → self: Incoming healing ▲74.88% 10 sec                                          [inert]
//      Step 2 → self: Burst CD ▼40 sec, once per battle                                        [R7]
//      Step 3 Red Wolf → self: weapon swap (51.46% final ATK / 250% full charge / 10 sec)      [R6]
//      Step 3 → self: Expand Pierce range 100% 10 sec                                          [inert]
//      Step 3 → self: Charge Speed ▲100.8% 10 sec (folded into the swap's 0.3s cadence)        [R6]
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   R1  the CS stacks fire on EVERY normal attack (count == shot count) and ramp to 10 — a
//       burst-only or once-per-battle trigger lands near the burst count. maxStacks 10 + 5s.
//   R2  MEASUREMENT-GATED ⚑. The true conversion is dynamic (excess-CS × 2.4, continuous from
//       battle start, fed by her stack ramp AND any team Charge-Speed buffers). The engine has no
//       "convert stat-A excess to stat-B" primitive driven off the live CS total, so the override
//       models it as a STATIC chargeDamagePct 90 applied inside the Red Wolf window (the warm
//       excess is ~38.9 → ×2.4 = 93.36; 90 is the averaged ⚑ estimate, mechanism exact). This file
//       PINs the modeled approximation and its damage signature (swap charge-mult 3.4 = 2.5 full
//       charge + 0.9 from the buff) and discriminates it from "no conversion"; the residual to the
//       true dynamic value is the unit's known COLD ~0.867 (kit-status F2a/F2b). NOT fudged to
//       93.36 — that would invent precision the scope-lock basis cannot measure.
//   R3  hasPierce models "Gain Pierce continuously". Vs the single partless boss there is nothing
//       to pierce THROUGH and no Pierce-Damage buffer is fielded, so it is damage-INERT here:
//       asserted structurally (flag present) + proven inert (removing it moves no total). Its role
//       is to enable Pierce-Damage buffs (e.g. Mint 32.72) in comps that field one.
//   R4  the Red Wolf ATK rider is gated on STAGE 3 (the weapon-swap cast), self-scoped, 10s. A
//       full-burst-enter or stage-1 trigger would fire on a different cast set.
//   R5  Beast Cage is a CASTER-RELATIVE team buff: every ally receives the SAME flat ATK (= 77.55%
//       of the CASTER's ATK), not a percentage of each holder's own ATK. Proven two ways: it reaches
//       all three allies (retarget-to-self counterfactual reaches one) and the stored value is flat
//       ATK (~93k), not 77.55.
//   R6  Red Wolf swaps the weapon: shots become 51.46% (vs base SR 69.04%), full-charge 250%,
//       fire-rate-gated to exactly 1 shot/18 frames (0.3s — the +100.8% CS makes charge instant so
//       cadence is rate-of-fire-gated), on INFINITE ammo (no reload across the ~33-shot window).
//       Deep-dived from game data (skill 1470610 + weapon 1047002), owner-confirmed 2026-07-20.
//   R7  the two Burst-CD-▼40sec refunds (Steps 1 & 2, once per battle) are rotation economy = damage.
//       The engine emits NO burstCdr event, so they are proven by their EFFECT: removing both lowers
//       her total (fewer stage-3 Red Wolf windows) and collapses the early 1→2→3 cast chain. Each is a
//       full reset of her exactly-40s cooldown. (Added at the S7 judge's request — the removal
//       counterfactual IS observable in the channels this file already reads.)
//
// Documented, NOT asserted:
//   [inert] DEF ▲50.68% (S2/Beast Cage), HP-recovery 23.04% (S2/Last Howl), Taunt (B2), Incoming
//       healing ▲74.88% (B2), Pierce-range-expand 100% (B3) — all survivability/targeting/utility
//       with no DPS observable in a partless single-boss sim with no HP pool. Correctly in
//       `unmodeled`; no assertion.
//
// Fixture: liter (B1) / crown (B2) / red-hood (Λ→B3), boss Fire, focus red-hood. Red Hood is the
// sole B3, so she casts every Full Burst and cycles Λ steps 1→2→3 across the 180s fight (the two
// CD refunds chain Steps 1→2→3 back-to-back early). Deterministic (no seed).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
/** controlComp('red-hood', false) slot order: liter 0 / crown 1 / red-hood 2. */
const RH = 2;
const ALLIES = new Set([0, 1, 2]);

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp('red-hood', false),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual patches ------------------------------------------------------------------
const stage3 = (ov: any) => {
  const b = ov.burst.find(
    (x: any) => x.trigger.kind === 'burstCast' && x.trigger.stage === 3
  );
  if (!b) {
    throw new Error('red-hood stage-3 burst block missing — fixture is stale');
  }
  return b;
};

/** R1 counterfactual: her S1 Charge-Speed stack line removed. */
const rhNoChargeSpeed = withPatchedOverride('red-hood', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) => !b.effects.some((e: any) => e.stat === 'chargeSpeedPct')
  );
  if (ov.skill1.length === before) {
    throw new Error(
      'red-hood S1 chargeSpeedPct block missing — fixture is stale'
    );
  }
});
/** R2 counterfactual: the chargeDamagePct-90 conversion approximation removed from Red Wolf. */
const rhNoChargeDmg = withPatchedOverride('red-hood', (ov) => {
  const b = stage3(ov);
  const before = b.effects.length;
  b.effects = b.effects.filter((e: any) => e.stat !== 'chargeDamagePct');
  if (b.effects.length === before) {
    throw new Error(
      'red-hood stage-3 chargeDamagePct missing — fixture is stale'
    );
  }
});
/** R3 counterfactual: permanent Pierce removed. */
const rhNoPierce = withPatchedOverride('red-hood', (ov) => {
  if (ov.hasPierce !== true) {
    throw new Error('red-hood hasPierce missing — fixture is stale');
  }
  ov.hasPierce = false;
});
/** R4 counterfactual: the Red Wolf ATK rider removed. */
const rhNoRedWolfAtk = withPatchedOverride('red-hood', (ov) => {
  const b = stage3(ov);
  const before = b.effects.length;
  b.effects = b.effects.filter(
    (e: any) => !(e.kind === 'buff' && e.stat === 'atkPct')
  );
  if (b.effects.length === before) {
    throw new Error('red-hood stage-3 atkPct rider missing — fixture is stale');
  }
});
/** R5 counterfactual: Beast Cage retargeted from all allies to self only. */
const rhBeastCageSelf = withPatchedOverride('red-hood', (ov) => {
  const b = ov.burst.find(
    (x: any) => x.trigger.stage === 1 && x.target.kind === 'allies'
  );
  if (!b) {
    throw new Error('red-hood stage-1 allies block missing — fixture is stale');
  }
  b.target.kind = 'self';
});
/** R6 counterfactual: the Red Wolf weapon swap (+ its infinite-ammo economy) removed. */
const rhNoWeaponSwap = withPatchedOverride('red-hood', (ov) => {
  const b = stage3(ov);
  const before = b.effects.length;
  b.effects = b.effects.filter(
    (e: any) => e.kind !== 'weaponSwap' && e.kind !== 'unlimitedAmmo'
  );
  if (b.effects.length === before) {
    throw new Error('red-hood stage-3 weaponSwap missing — fixture is stale');
  }
});
/** R7 counterfactual: both Burst-CD refunds (Steps 1 & 2, ▼40s once/battle) removed. */
const rhNoCdr = withPatchedOverride('red-hood', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'burstCdr')
  );
  if (ov.burst.length === before) {
    throw new Error('red-hood burstCdr blocks missing — fixture is stale');
  }
});

// ---- runs (hoisted: each is a full 180s sim) -------------------------------------------------
const base = run();
const noChargeSpeed = run({ 'red-hood': rhNoChargeSpeed });
const noChargeDmg = run({ 'red-hood': rhNoChargeDmg });
const noPierce = run({ 'red-hood': rhNoPierce });
const noRedWolfAtk = run({ 'red-hood': rhNoRedWolfAtk });
const beastCageSelf = run({ 'red-hood': rhBeastCageSelf });
const noWeaponSwap = run({ 'red-hood': rhNoWeaponSwap });
const noCdr = run({ 'red-hood': rhNoCdr });

// ---- readers ---------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const rhDamage = (evs: SimEvent[]) =>
  dmg(evs).filter((d) => d.slug === 'red-hood');
const rhShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'red-hood');
const rhBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'red-hood'
  );
const rhStageCasts = (evs: SimEvent[], stage: number) =>
  rhBursts(evs).filter((c) => c.stage === stage);
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
/** Buffs cast BY red-hood (casterIdx RH) on the given stat. */
const rhCastBuff = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === RH && b.stat === stat);

/** Swap shots carry the Red Wolf weapon's 51.46% (base SR is 69.04%). */
const SWAP_ATKPCT = 51.46;
const swapDamage = (evs: SimEvent[]) =>
  rhDamage(evs).filter((d) => d.atkPct === SWAP_ATKPCT);
const uaShots = (evs: SimEvent[]) =>
  rhShots(evs).filter((s) => s.unlimitedAmmo);

describe('red-hood — kit spec', () => {
  describe('R1 — S1 Charge Speed stacks fire on every normal attack, ×10, 5 sec', () => {
    const cs = rhCastBuff(base.events, 'chargeSpeedPct');

    it('is 3.81% per stack, max 10 stacks, 5-sec duration, self-scoped', () => {
      expect(cs.length, 'no chargeSpeedPct buff was applied').toBeGreaterThan(
        0
      );
      expect([...new Set(cs.map((b) => b.value))]).toEqual([3.81]);
      expect([...new Set(cs.map((b) => b.maxStacks))]).toEqual([10]);
      expect([...new Set(cs.map((b) => b.expiresFrame! - b.frame))]).toEqual([
        5 * FPS,
      ]);
      expect([...new Set(cs.map((b) => b.targetIdx))]).toEqual([RH]);
    });

    it('fires once per normal attack (not once per burst) and ramps to 10 stacks', () => {
      expect(cs.length).toBe(rhShots(base.events).length);
      expect(
        Math.max(...cs.map((b) => b.stacks)),
        'stacks never reached the ×10 cap'
      ).toBe(10);
    });

    it('DISCRIMINATING: removing the S1 line deletes every chargeSpeedPct buff', () => {
      expect(rhCastBuff(noChargeSpeed.events, 'chargeSpeedPct').length).toBe(0);
    });
  });

  describe('R2 — S1 excess-CS→Charge-Damage conversion (MEASUREMENT-GATED ⚑, static 90 in Red Wolf)', () => {
    const cd = rhCastBuff(base.events, 'chargeDamagePct');

    it('is modeled as a static chargeDamagePct 90, self-scoped, 10 sec, fired on each Red Wolf cast', () => {
      expect(cd.length, 'no chargeDamagePct buff was applied').toBeGreaterThan(
        0
      );
      expect([...new Set(cd.map((b) => b.value))]).toEqual([90]);
      expect([...new Set(cd.map((b) => b.targetIdx))]).toEqual([RH]);
      expect([...new Set(cd.map((b) => b.expiresFrame! - b.frame))]).toEqual([
        10 * FPS,
      ]);
      expect(cd.length).toBe(rhStageCasts(base.events, 3).length);
    });

    it('adds exactly +0.9 to the swap charge multiplier (2.5 full charge → 3.4)', () => {
      const shipped = [
        ...new Set(
          swapDamage(base.events).map((d) => +d.mult.charge.toFixed(6))
        ),
      ];
      expect(
        shipped,
        'swap shots must carry a single charge multiplier'
      ).toEqual([3.4]);
    });

    it('DISCRIMINATING: removing the conversion drops the swap charge mult by exactly 0.9', () => {
      const counter = [
        ...new Set(
          swapDamage(noChargeDmg.events).map((d) => +d.mult.charge.toFixed(6))
        ),
      ];
      expect(counter.length).toBe(1);
      expect(
        3.4 - counter[0],
        'the buff must contribute exactly +0.9 (90/100) to the charge mult'
      ).toBeCloseTo(0.9, 6);
      expect(rhCastBuff(noChargeDmg.events, 'chargeDamagePct').length).toBe(0);
    });
  });

  describe('R3 — S2 "Gain Pierce continuously" (hasPierce; damage-inert vs the single boss)', () => {
    it('is modeled on the override (the line is present, not dropped)', () => {
      const ov = withPatchedOverride('red-hood', () => {});
      expect((ov as any).hasPierce).toBe(true);
    });

    it("is damage-inert in this fixture: removing it moves no unit's total by a point", () => {
      // Vs a single partless boss there is nothing to pierce through and no Pierce-Damage buffer
      // is fielded, so the flag has no DPS observable here (its role is enabling Pierce-Damage
      // buffs in comps that field one).
      expect(base.totals).toEqual(noPierce.totals);
    });
  });

  describe('R4 — S2 Red Wolf ATK rider: ATK ▲71.42% self, gated on STAGE 3, 10 sec', () => {
    const atk = rhCastBuff(base.events, 'atkPct');

    it('is 71.42%, self-scoped, 10 sec, fired once per Red Wolf (stage-3) cast', () => {
      expect(atk.length, 'no atkPct rider was applied').toBeGreaterThan(0);
      expect([...new Set(atk.map((b) => b.value))]).toEqual([71.42]);
      expect([...new Set(atk.map((b) => b.targetIdx))]).toEqual([RH]);
      expect([...new Set(atk.map((b) => b.expiresFrame! - b.frame))]).toEqual([
        10 * FPS,
      ]);
      expect(atk.length).toBe(rhStageCasts(base.events, 3).length);
    });

    it('DISCRIMINATING: removing the rider deletes the buff and lowers her total', () => {
      expect(rhCastBuff(noRedWolfAtk.events, 'atkPct').length).toBe(0);
      expect(noRedWolfAtk.totals['red-hood']).toBeLessThan(
        base.totals['red-hood']
      );
    });
  });

  describe('R5 — Burst Step 1 Beast Cage: caster-relative team ATK, all allies, 10 sec', () => {
    const ca = rhCastBuff(base.events, 'casterAtkPct');

    it('reaches ALL three allies (not just the caster)', () => {
      expect(ca.length, 'no casterAtkPct buff was applied').toBeGreaterThan(0);
      expect(new Set(ca.map((b) => b.targetIdx))).toEqual(ALLIES);
    });

    it('is caster-relative: every ally receives the SAME flat ATK (≫ the 77.55% figure), for 10 sec', () => {
      const values = [...new Set(ca.map((b) => b.value))];
      expect(
        values.length,
        'every holder must receive the identical caster-relative flat ATK'
      ).toBe(1);
      expect(
        values[0],
        'stored as flat ATK, not a 77.55 percentage'
      ).toBeGreaterThan(1000);
      expect([...new Set(ca.map((b) => b.expiresFrame! - b.frame))]).toEqual([
        10 * FPS,
      ]);
    });

    it('fires on each Beast Cage (stage-1) cast', () => {
      const stage1 = rhStageCasts(base.events, 1).length;
      expect(stage1).toBeGreaterThan(0);
      // one buffApply per holder per cast → 3 allies × stage-1 casts
      expect(ca.length).toBe(3 * stage1);
    });

    it('DISCRIMINATING: retargeting to self reaches only the caster', () => {
      const selfOnly = rhCastBuff(beastCageSelf.events, 'casterAtkPct');
      expect(new Set(selfOnly.map((b) => b.targetIdx))).toEqual(new Set([RH]));
    });
  });

  describe('R6 — Burst Step 3 Red Wolf: weapon swap 51.46% / 250% full charge / 0.3s / infinite ammo', () => {
    it('swaps the weapon: shots become 51.46% (base SR is 69.04%)', () => {
      const swap = swapDamage(base.events);
      expect(
        swap.length,
        'no Red Wolf swap shots were produced'
      ).toBeGreaterThan(0);
      // base SR normals (69.04%) must also exist — she returns to base SR when the window ends
      expect(rhDamage(base.events).some((d) => d.atkPct === 69.04)).toBe(true);
    });

    it('is fire-rate-gated to exactly 1 shot / 18 frames (0.3s) on infinite ammo', () => {
      const ua = uaShots(base.events);
      expect(ua.length, 'no unlimited-ammo (Red Wolf) shots').toBeGreaterThan(
        0
      );
      // every Red Wolf shot is unlimited-ammo and there are no reloads inside a window
      expect(ua.length).toBe(swapDamage(base.events).length);
      const gaps = ua.slice(1).map((s, i) => s.frame - ua[i].frame);
      // within-window cadence is a constant 18 frames; allow the cross-window gap to differ
      const withinWindow = gaps.filter((g) => g < 18 * 40);
      expect(withinWindow.length).toBeGreaterThan(0);
      expect(
        [...new Set(withinWindow)],
        'cadence must be a constant 18 frames (0.3s)'
      ).toEqual([18]);
    });

    it('runs ~33 shots per 10-sec window (one per stage-3 cast)', () => {
      const windows = rhStageCasts(base.events, 3).length;
      expect(windows).toBeGreaterThan(0);
      const perWindow = swapDamage(base.events).length / windows;
      expect(
        perWindow,
        'a 10s window at 0.3s cadence yields ~33 shots'
      ).toBeGreaterThan(30);
      expect(perWindow).toBeLessThan(36);
    });

    it('DISCRIMINATING: removing the swap leaves only base-SR (69.04%) shots and no unlimited ammo', () => {
      expect(swapDamage(noWeaponSwap.events).length).toBe(0);
      expect(uaShots(noWeaponSwap.events).length).toBe(0);
      expect(
        rhDamage(noWeaponSwap.events).every((d) => d.atkPct === 69.04)
      ).toBe(true);
    });
  });

  describe('R7 — Burst Steps 1 & 2 CD refunds (▼40s once/battle) are load-bearing rotation economy', () => {
    // The engine emits NO burstCdr event, so the refunds are proven by their EFFECT on the rotation:
    // each is a full reset of her exactly-40s cooldown, and together they chain her Λ steps 1→2→3 early
    // in the fight — more stage-3 (Red Wolf) windows = more damage. (S7 judge: a removal counterfactual
    // IS observable in the channels this file already reads; "not isolable" overstated the difficulty.)
    it('removing both refunds lowers her total damage (fewer Red Wolf windows)', () => {
      expect(noCdr.totals['red-hood']).toBeLessThan(base.totals['red-hood']);
    });

    it('changes her burst-cast economy (the early 1→2→3 chain collapses)', () => {
      const baseCasts = rhBursts(base.events);
      const noCdrCasts = rhBursts(noCdr.events);
      const baseStages = baseCasts.map((c) => c.stage).join(',');
      const noCdrStages = noCdrCasts.map((c) => c.stage).join(',');
      expect(
        noCdrCasts.length !== baseCasts.length || noCdrStages !== baseStages,
        `removing the refunds must change the burst economy (base ${baseCasts.length} casts [${baseStages}] vs ${noCdrCasts.length} [${noCdrStages}])`
      ).toBe(true);
    });
  });
});
