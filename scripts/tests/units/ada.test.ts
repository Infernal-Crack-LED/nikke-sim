// PER-UNIT KIT SPEC — `ada` (Ada, Attacker/RL/Electric, Burst III, cd 40s, ammo 6, chargeFrames 60,
// normalAttackMultiplier 61.3, chargeMultiplier 250). Kit-autonomy gauntlet 2026-07-24 (driver, sighted).
//
// One assertion group per KIT LINE (A1..A8 below), asserted against the SHIPPED override loaded from
// disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest-wrong model each
// assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.ada.skills, level-10 values):
//   S1 ■ entering Full Burst → all Burst-3 allies who previously burst:                  [A1]
//        ATK ▲ 60% of the skill user's ATK for 10 sec  (casterAtkPct, scoped stage 3)
//        True Damage ▲ 50% for 10 sec                  (trueDamagePct, scoped stage 3)  [A2]
//        Recovers 10% of damage as HP for 10 sec       (lifesteal — UNMODELED, no HP pool) [—]
//   S2 ■ during Full Burst → enemies nearest crosshair every 2 sec:                      [A3]
//        Flash Grenade Toss: 420% of final ATK as True Damage  (420% true dot, 2s, 10s)
//      ■ using Burst Skill → self:                                                       [A4]
//        Flash Grenade Toss activation time condition ▼ 1 sec for 10 sec
//        (modeled as a SECOND identical 420%/2s true stream on burstCast → combined 1/s in window)
//   BU ■ self:                                                                           [A5]
//        ATK ▲ 40% for 10 sec
//        True Damage ▲ 42% for 10 sec                                                    [A6]
//        Special Modification: Charge Speed ▼ 300% / Charge Damage ▲ 1500% for 1 round   [A7]
//        (weaponSwap: chargeTime 4s, chargeMultPct 1750, damagePct 61.3, 10s)
//   The grenades are True-flavored, so her S1/Burst True Damage ▲ buffs apply ONLY to them [A8]
//   (the engine gates trueDamagePct by flavor).
//
// Why each assertion discriminates (a test that cannot fail under the nearest-wrong model gates
// nothing). Probed against the live engine (.ada-probe / .ada-probe2, 2026-07-24):
//   A1  the U8 run-E scope fix: kit targets "Burst 3 allies who previously used their Burst
//       Skill", so the +60%-of-caster ATK grant must land on the stage-3 casters (ada+helm =
//       slots 2,3) and NOT on the B1/B2 casters (liter/crown = 0,1). The nearest-wrong is the
//       UNFILTERED burstCasters target, which the probe shows widens to {0,1,2,3} and is the
//       source of crown/rouge's old ~1.44 heat.
//   A2  same stage-3 scope on the True Damage ▲ 50% line (value 50 → slots {2,3}); the burst's
//       own True Damage ▲ 42% is a SEPARATE self-only line (value 42 → slot {2}, see A6).
//   A3  the baseline grenade is a 420% True-Damage dot every 2s for 10s, re-applied on every
//       Full Burst enter; removing both S2 blocks zeroes every skill2 instance.
//   A4  the burst rider (interval ▼1s) is encoded as a SECOND identical every-2s stream on her
//       own burstCast, so during her burst windows the combined rate is 1/s. Probe: 85 grenades
//       with the rider vs 55 without — the rider is LIVE (≈30 extra grenades), not inert.
//   A5  burst ATK ▲ 40% is self-only (slot {2}), one apply per burst cast, 10s.
//   A6  burst True Damage ▲ 42% is self-only (slot {2}), distinct from the S1 50% stage-3 grant.
//   A7  Special Modification swaps her weapon: her normal-bucket shots gain charge mult 17.50
//       (1750%) inside the window vs 2.50 (250%) base. Removing the swap zeroes every 17.50
//       instance and drops her total to ~0.825× — the swap is load-bearing. RESIDUAL (kit-status
//       F3): the swap has no maxShots cap, so it over-fires ~2 special shots/window vs the kit's
//       literal "1 round"; the board (0.99) leans on the 2nd shot, so the count is MEASUREMENT-GATED
//       (needs popup footage) and is pinned-as-is here, NOT certified kit-literal.
//   A8  True-flavor gating: changing the grenade dot's flavor true→normal drops grenade damage to
//       ~0.72× (early-window dmgUp 2.771 → 1.851), proving the S1/Burst True Damage ▲ buffs apply
//       to the grenades BECAUSE they are true-flavored.
//
// Fixture: controlComp('ada') = liter B1 / crown B2 / ada B3 / helm B3, boss Fire, focus ada.
// ada needs the real rotation to cast her burst at all (a lone B3 makes ZERO Full Bursts); helm
// is the second stage-3 caster that makes the A1/A2 scope discrimination observable. Deterministic
// (no seed).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
/** controlComp slot order: liter 0 / crown 1 / ada 2 / helm 3. */
const ADA = 2;
const STAGE3_CASTERS = [2, 3]; // ada + helm — the Burst-3 casters in this comp
const NON_STAGE3 = [0, 1]; // liter (B1) + crown (B2) — must NEVER receive ada's S1 grant

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp('ada'),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual patches (nearest-wrong models) -------------------------------------------
/** A1 nearest-wrong: S1's burstCasters target with the stage-3 filter removed (unfiltered). */
const adaUnfilteredS1 = withPatchedOverride('ada', (ov) => {
  let patched = 0;
  for (const b of ov.skill1) {
    if (b.target?.kind === 'burstCasters') {
      delete b.target.stage;
      patched++;
    }
  }
  if (!patched) {
    throw new Error('ada S1 burstCasters block missing — fixture is stale');
  }
});
/** A4 nearest-wrong: the burstCast grenade rider removed (baseline FB-enter stream only). */
const adaNoRider = withPatchedOverride('ada', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => b.trigger?.kind !== 'burstCast');
  if (ov.skill2.length === before) {
    throw new Error('ada S2 burstCast rider missing — fixture is stale');
  }
});
/** A3 reference: both S2 grenade blocks removed (no grenades at all). */
const adaNoGrenade = withPatchedOverride('ada', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = [];
  if (!before) {
    throw new Error('ada S2 grenade blocks missing — fixture is stale');
  }
});
/** A7 nearest-wrong: the burst weaponSwap removed (no Special Modification). */
const adaNoSwap = withPatchedOverride('ada', (ov) => {
  let patched = 0;
  for (const b of ov.burst) {
    const before = b.effects.length;
    b.effects = b.effects.filter((e: any) => e.kind !== 'weaponSwap');
    if (b.effects.length !== before) {
      patched++;
    }
  }
  if (!patched) {
    throw new Error('ada burst weaponSwap missing — fixture is stale');
  }
});
/** A8 nearest-wrong: the grenade dot re-flavored true→normal (True Damage ▲ buffs no longer apply). */
const adaNormalFlavor = withPatchedOverride('ada', (ov) => {
  let patched = 0;
  for (const b of ov.skill2) {
    for (const e of b.effects) {
      if (e.kind === 'dot') {
        e.flavor = 'normal';
        patched++;
      }
    }
  }
  if (!patched) {
    throw new Error('ada S2 dot block missing — fixture is stale');
  }
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const unfilteredS1 = run({ ada: adaUnfilteredS1 });
const noRider = run({ ada: adaNoRider });
const noGrenade = run({ ada: adaNoGrenade });
const noSwap = run({ ada: adaNoSwap });
const normalFlavor = run({ ada: adaNormalFlavor });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const adaBuffs = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === ADA && b.stat === stat);
const adaDamage = (evs: SimEvent[], srcSlot: Damage['srcSlot']) =>
  dmg(evs).filter((d) => d.slug === 'ada' && d.srcSlot === srcSlot);
const adaBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'ada');
const targets = (list: BuffApply[]) =>
  [...new Set(list.map((b) => b.targetIdx))].sort(
    (a, b) => (a ?? -1) - (b ?? -1)
  );

describe('ada — kit spec', () => {
  describe('A1 — S1 grants +60%-of-caster ATK to STAGE-3 burst casters only', () => {
    const grant = adaBuffs(base.events, 'casterAtkPct');

    it('lands on the Burst-3 casters (ada + helm), for 10 sec', () => {
      expect(
        grant.length,
        'no ada-cast casterAtkPct grant was applied'
      ).toBeGreaterThan(0);
      expect(targets(grant)).toEqual(STAGE3_CASTERS);
      for (const b of grant) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('does NOT reach the B1/B2 casters (liter/crown)', () => {
      const leaked = grant.filter((b) =>
        NON_STAGE3.includes(b.targetIdx ?? -1)
      );
      expect(
        leaked.map((b) => b.targetIdx),
        'S1 grant leaked to a non-stage-3 caster'
      ).toEqual([]);
    });

    it('DISCRIMINATING: an unfiltered burstCasters target would widen to the B1/B2 casters', () => {
      const widened = targets(adaBuffs(unfilteredS1.events, 'casterAtkPct'));
      expect(widened).not.toEqual(STAGE3_CASTERS);
      expect(
        widened.some((t) => NON_STAGE3.includes(t ?? -1)),
        'expected the unfiltered grant to reach liter/crown'
      ).toBe(true);
    });
  });

  describe('A2 — S1 grants True Damage ▲ 50% to the same stage-3 casters', () => {
    const grant = adaBuffs(base.events, 'trueDamagePct').filter(
      (b) => b.value === 50
    );

    it('is 50% on the Burst-3 casters (ada + helm), for 10 sec', () => {
      expect(
        grant.length,
        'no ada-cast trueDamagePct 50% grant'
      ).toBeGreaterThan(0);
      expect(targets(grant)).toEqual(STAGE3_CASTERS);
      for (const b of grant) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });
  });

  describe('A3 — S2 Flash Grenade is a 420% True-Damage dot re-applied every Full Burst enter', () => {
    const grenades = adaDamage(base.events, 'skill2');

    it('fires at the kit magnitude (420%) and is the only skill2 source', () => {
      expect(
        grenades.length,
        'no grenade damage in a 180s fight'
      ).toBeGreaterThan(0);
      expect([...new Set(grenades.map((d) => d.atkPct))]).toEqual([420]);
    });

    it('re-applies across the fight (one 10s stream per Full Burst enter, not a single cast)', () => {
      const fbCount = base.events.filter(
        (e) => e.kind === 'fullBurstStart'
      ).length;
      const spanSec =
        (grenades[grenades.length - 1].frame - grenades[0].frame) / FPS;
      expect(
        fbCount,
        'fixture produced too few Full Bursts to exercise the re-application'
      ).toBeGreaterThanOrEqual(5);
      expect(
        spanSec,
        'grenades must persist across the fight, not stop after one window'
      ).toBeGreaterThan(150);
    });

    it('INERTNESS-REF: removing both S2 blocks zeroes every grenade instance', () => {
      expect(adaDamage(noGrenade.events, 'skill2').length).toBe(0);
    });
  });

  describe('A4 — the burstCast rider doubles the grenade rate inside her burst windows', () => {
    it('is LIVE: more grenades with the rider than without it', () => {
      const withRider = adaDamage(base.events, 'skill2').length;
      const without = adaDamage(noRider.events, 'skill2').length;
      expect(
        withRider,
        `rider inert? ${withRider} grenades with vs ${without} without`
      ).toBeGreaterThan(without);
    });

    it('the rider adds the second interleaved stream (≈30 extra grenades over the fight)', () => {
      const delta =
        adaDamage(base.events, 'skill2').length -
        adaDamage(noRider.events, 'skill2').length;
      expect(
        delta,
        'a ▼1s interval reduction must roughly double the in-window rate'
      ).toBeGreaterThanOrEqual(20);
    });
  });

  describe('A5 — burst grants ATK ▲ 40% to SELF only', () => {
    const grant = adaBuffs(base.events, 'atkPct').filter((b) => b.value === 40);

    it('is 40% on ada alone, once per burst cast, for 10 sec', () => {
      expect(grant.length, 'no ada-cast atkPct 40% grant').toBeGreaterThan(0);
      expect(targets(grant)).toEqual([ADA]);
      expect(grant.length).toBe(adaBursts(base.events).length);
      for (const b of grant) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });
  });

  describe('A6 — burst grants True Damage ▲ 42% to SELF only (distinct from the S1 50% line)', () => {
    const grant = adaBuffs(base.events, 'trueDamagePct').filter(
      (b) => b.value === 42
    );

    it('is 42% on ada alone, once per burst cast', () => {
      expect(
        grant.length,
        'no ada-cast trueDamagePct 42% grant'
      ).toBeGreaterThan(0);
      expect(targets(grant)).toEqual([ADA]);
      expect(grant.length).toBe(adaBursts(base.events).length);
    });
  });

  describe('A7 — Special Modification swaps her weapon (charge mult 17.50 inside the window)', () => {
    const SWAP_CHARGE = 17.5; // chargeMultPct 1750 → ×17.5 charge multiplier
    const swappedShots = (evs: SimEvent[]) =>
      dmg(evs).filter(
        (d) =>
          d.slug === 'ada' &&
          d.bucket === 'normal' &&
          Math.abs(d.mult.charge - SWAP_CHARGE) < 1e-6
      );

    it('her normal-bucket shots reach the swapped ×17.50 charge multiplier', () => {
      const shots = swappedShots(base.events);
      expect(
        shots.length,
        'no swapped-charge shots — Special Modification never fired'
      ).toBeGreaterThan(0);
    });

    it('DISCRIMINATING: removing the weaponSwap zeroes every ×17.50 shot and drops her total', () => {
      expect(swappedShots(noSwap.events).length).toBe(0);
      expect(noSwap.totals.ada).toBeLessThan(base.totals.ada * 0.95);
    });

    // RESIDUAL (kit-status F3, MEASUREMENT-GATED): the swap has no maxShots cap, so it over-fires
    // ~2 special shots per window vs the kit's literal "for 1 round(s)". The board (≈0.99) leans on
    // the 2nd shot; capping to kit-literal drops the board to ~0.95. This pin records the CURRENT
    // (shipped) per-window count so any change is visible — it does NOT certify the count as
    // kit-literal. Resolving it needs popup footage (see manual-review/ada.md).
    it('PIN (current shipped cadence, F3 residual): ≥1 swapped shot per burst window', () => {
      const bursts = adaBursts(base.events);
      const shots = swappedShots(base.events);
      for (const cast of bursts) {
        const inWindow = shots.filter(
          (s) => s.frame >= cast.frame && s.frame <= cast.frame + 10 * FPS
        );
        expect(
          inWindow.length,
          `burst at ${(cast.frame / FPS).toFixed(1)}s produced no swapped shot`
        ).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('A8 — grenades are True-flavored, so the True Damage ▲ buffs apply only to them', () => {
    const grenadeSum = (evs: SimEvent[]) =>
      adaDamage(evs, 'skill2').reduce((s, d) => s + d.amount, 0);

    it('DISCRIMINATING: re-flavoring the grenades true→normal drops their damage (buffs stop applying)', () => {
      expect(grenadeSum(normalFlavor.events)).toBeLessThan(
        grenadeSum(base.events) * 0.9
      );
    });

    it('the True Damage ▲ buffs are live on the grenades in-window (dmgUp reflects them)', () => {
      const earlyBase = adaDamage(base.events, 'skill2')
        .slice(0, 4)
        .map((d) => d.mult.dmgUp);
      const earlyNormal = adaDamage(normalFlavor.events, 'skill2')
        .slice(0, 4)
        .map((d) => d.mult.dmgUp);
      expect(Math.min(...earlyBase)).toBeGreaterThan(Math.max(...earlyNormal));
    });
  });
});
