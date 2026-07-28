// PER-UNIT KIT SPEC — `e-h` (E.H., Attacker/SMG/Wind, Burst III, cd 40s, ammo 120, SMG 1440rpm).
// Kit-autonomy gauntlet 2026-07-27; test-first (TDD transition step 3). Standalone unit (no base
// counterpart).
//
// One assertion group per KIT LINE (E1..E7 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters['e-h'].skills):
//   S1 ■ on obtaining 10 Scraps with <4 homemade magazines → self:                            [E1]
//        E1 removes the Scraps; E2 crafts 1 magazine (max 4, continuous);
//        E3 ATK ▲7.5% continuously × number of homemade magazines                            [E2]
//   S2 ■ self, scrap economy:
//        E1 start of battle: Scraps ▲10 (max 10)              ← resource pool SEED (soda       [E3]
//           precedent: a battle-start grant is resources[].initial, not a block)
//        E2 destructible projectile destroyed: Scraps ▲1 (max 10)   ← UNMODELED (no projectile
//        E3 enemy part destroyed: Scraps ▲5 (max 10)                  entities, no destructible
//        E4 enemy neutralized: Scraps ▲2 (max 10)                     parts, no adds in v1 — the
//           single immortal boss never fires any of these triggers; inert, documented verbatim
//           in the override's unmodeled, NO assertion (nothing to observe)                    [E5]
//        E5 on obtaining Scraps: Elemental Advantage Attack Damage ▲16.36% for 15 sec         [E4]
//   BU ■ self: changes the weapon in use.                                                     [E6]
//        Charge Time 0.4s; Damage 61% of final ATK; Full Charge Damage 250% of damage;
//        Max Ammunition 1 × homemade magazines; Duration 10s;
//        deactivates when the duration ends OR all rounds fired;
//        Additional Effect: ATK ▲430.05% for 10 sec                                          [E7]
//
// SCOPE NOTE (tier 2): in the v1 single-target scope the ONLY scrap source is the battle-start
// seed, so exactly ONE magazine is ever crafted and the scrap pool sits at 0 after frame 0. The
// dynamic links that need out-of-scope scrap events (magazine count → swap ammo/maxShots; later
// scrap gains → E5 refresh + further crafts) are encoded at their in-scope values (maxAmmo 1 /
// maxShots 1; fused-passive E5) and documented ⚑ in the override caveats — NOT silently dropped.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   E1/E2 the perResource ATK buff reads the LIVE magazine pool each frame. PIN: the baseAtk diff
//       vs the chain-broken counterfactual is EXACTLY staticAtk×0.075 (one magazine) — the
//       0-magazine world (scrap seed 0 → gate never passes) and the 4-magazine world (pool seeded
//       at the cap) both provably miss it, and the diff persists at t≈70s (continuous, no expiry).
//   E4  elemAdvantageDamagePct sits in the ELEMENT bucket (MEASURED 2026-07-14 battery 5,
//       privaty ratio 2.8244 vs Element-model 2.821): mult.elem is 1.2636 for t<15s and 1.1 after.
//       The Damage-Up-bucket counterfactual moves mult.dmgUp instead and changes the total; the
//       Fire-boss run (Wind has NO advantage vs Fire) is byte-identical with the line removed —
//       proving the advantage SCOPE, not a removal.
//   E6  the swap shot is the only atkPct-61 instance in the fight: exactly one per burst cast
//       (maxShots = magazine count = 1 — the no-maxShots counterfactual refires ~5× per 10s
//       window), at mult.charge 2.5 (the no-chargeMult counterfactual reads 1), landing <1s after
//       the cast (the 0.4s charge). The kit carries NO nuke line → zero burst-bucket damage.
//   E7  baseAtk diff vs the buff-removed counterfactual is EXACTLY staticAtk×4.3005 on aligned
//       in-window normals and EXACTLY 0 outside the window (10s expiry, not continuous); the swap
//       shot shares that final ATK and rides the +50% FB major (it lands inside the window the
//       cast opens, 0.4s later — unlike a cast-frame nuke, helm H7). The trigger is burstCast,
//       NOT fullBurstEnter: helm is the co-B3, so team Full Bursts occur on rotations E.H. did
//       NOT cast — her 430.05% application count equals HER cast count and is strictly less than
//       the team's Full Burst count (the fullBurstEnter counterfactual over-applies).
//
// JUDGMENT CALL (driver, concurred by S2b fable): the kit never states the burst CONSUMES a
// magazine — "Max Ammunition Capacity: 1 x the number of homemade magazines" reads as the live
// count, so magazines PERSIST and every cast loads 1 round. The consumption reading would leave
// later casts with 0 rounds (no scrap income to re-craft); the one-swap-shot-per-cast assertion
// (EVERY cast, not just the first) pins the persist reading.
//
// Fixture: the 720-kit-audit control shape — liter (B1, 20s) / crown (B2, 20s) / e-h (B3, 40s) /
// helm (B3, 40s), boss Iron (Wind beats Iron → the E4 advantage line is live; helm/crown/liter
// get no advantage, which the E4 Fire-scope pair also exploits), focus e-h. The co-B3 helm makes
// the burstCast-vs-fullBurstEnter discrimination observable (S2b fable). Deterministic (no seed) —
// event logs align index-for-index across counterfactual runs (ATK changes move no cadence: the
// boss is immortal and gauge is per-shot, not per-damage).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
/** Fixture slot order: liter 0 / crown 1 / e-h 2. */
const EH = 2;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(
  overrides: Record<string, any> = {},
  bossElement: 'Iron' | 'Fire' = 'Iron'
) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: ['liter', 'crown', 'e-h', 'helm'],
    bossElement,
    focusSlug: 'e-h',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, res, totals: totals(res) };
}

// ---- counterfactual patches -------------------------------------------------------------------
const setResource = (ov: any, name: string, initial: number) => {
  const r = (ov.resources ?? []).find((x: any) => x.name === name);
  if (!r) {
    throw new Error(`e-h resource '${name}' missing — fixture is stale`);
  }
  r.initial = initial;
};

/** E1/E2 reference: battle-start scrap seed removed → the craft gate never passes → 0 magazines. */
const ehChainBroken = withPatchedOverride('e-h', (ov) =>
  setResource(ov, 'scrap', 0)
);
/** E1/E2 counterfactual: the magazine pool seeded at its cap (the over-credit world). */
const ehFourMag = withPatchedOverride('e-h', (ov) =>
  setResource(ov, 'magazine', 4)
);
/** E4 counterfactual: the same line in the Damage Up bucket instead of the Element bucket. */
const ehWrongBucket = withPatchedOverride('e-h', (ov) => {
  const e = ov.skill2
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'elemAdvantageDamagePct');
  if (!e) {
    throw new Error(
      'e-h S2 elemAdvantageDamagePct effect missing — fixture is stale'
    );
  }
  e.stat = 'attackDamagePct';
});
/** E4 scope pair: the line removed entirely (byte-identity vs shipped on the Fire boss). */
const ehNoElem = withPatchedOverride('e-h', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) => !b.effects.some((e: any) => e.stat === 'elemAdvantageDamagePct')
  );
  if (ov.skill2.length === before) {
    throw new Error(
      'e-h S2 elemAdvantageDamagePct block missing — fixture is stale'
    );
  }
});
/** E6 counterfactual: the swap's full-charge multiplier removed (an uncharged 61% shot). */
const ehNoChargeMult = withPatchedOverride('e-h', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'weaponSwap');
  if (!e || e.chargeMultPct === undefined) {
    throw new Error('e-h burst weaponSwap.chargeMultPct missing — stale');
  }
  delete e.chargeMultPct;
});
/** E6 counterfactual: the uses-based deactivation removed (duration-bound swap, refires). */
const ehNoMaxShots = withPatchedOverride('e-h', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'weaponSwap');
  if (!e || e.maxShots === undefined) {
    throw new Error('e-h burst weaponSwap.maxShots missing — stale');
  }
  delete e.maxShots;
});
/** E7 reference: the burst ATK ▲430.05% effect removed. */
const ehNoBurstAtk = withPatchedOverride('e-h', (ov) => {
  let removed = false;
  for (const b of ov.burst) {
    const before = b.effects.length;
    b.effects = b.effects.filter(
      (e: any) => !(e.kind === 'buff' && e.stat === 'atkPct')
    );
    removed ||= b.effects.length < before;
  }
  if (!removed) {
    throw new Error('e-h burst atkPct buff missing — fixture is stale');
  }
});
/** E7 counterfactual: the 430.05% block re-keyed to fullBurstEnter — over-applies on helm's
 *  rotations (the team Full Bursts E.H. did NOT cast). The co-B3 fixture exposes this. */
const ehFbEnter = withPatchedOverride('e-h', (ov) => {
  const b = ov.burst.find((x: any) =>
    x.effects.some((e: any) => e.kind === 'buff' && e.stat === 'atkPct')
  );
  if (!b) {
    throw new Error('e-h burst atkPct block missing — fixture is stale');
  }
  b.trigger = { kind: 'fullBurstEnter' };
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const chainBroken = run({ 'e-h': ehChainBroken });
const fourMag = run({ 'e-h': ehFourMag });
const wrongBucket = run({ 'e-h': ehWrongBucket });
const noChargeMult = run({ 'e-h': ehNoChargeMult });
const noMaxShots = run({ 'e-h': ehNoMaxShots });
const noBurstAtk = run({ 'e-h': ehNoBurstAtk });
const fbEnter = run({ 'e-h': ehFbEnter });
const baseFire = run({}, 'Fire');
const noElemFire = run({ 'e-h': ehNoElem }, 'Fire');

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const ehNormals = (evs: SimEvent[]) =>
  dmg(evs).filter(
    (d) => d.slug === 'e-h' && d.srcSlot === 'normal' && d.atkPct === 10.12
  );
/** The burst-weapon full-charge shot: the only atkPct-61 instance in the fight. */
const swapShots = (evs: SimEvent[]) =>
  dmg(evs).filter((d) => d.slug === 'e-h' && d.atkPct === 61);
const ehBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'e-h');
const ehShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'e-h');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart');
const eh430 = (evs: SimEvent[]) =>
  buffs(evs).filter(
    (b) =>
      b.key.includes(':burst:') && b.stat === 'atkPct' && b.value === 430.05
  );

const staticAtk = unitOf(base.res, 'e-h').staticAtk;
const elem9 = (d: Damage) => +d.mult.elem.toFixed(9);

describe('e-h — kit spec', () => {
  it('fixture sanity: E.H. and helm alternate B3 casts in the liter/crown chain', () => {
    expect(ehBursts(base.events).length).toBeGreaterThanOrEqual(2);
    // The co-B3 exists: more team Full Bursts than E.H. casts (helm casts the rest).
    expect(fbStarts(base.events).length).toBeGreaterThan(
      ehBursts(base.events).length
    );
  });

  describe('E1/E2 — S1: 10 Scraps craft exactly 1 magazine → ATK ▲7.5% × magazines, continuous', () => {
    it('lifts baseAtk by EXACTLY staticAtk×0.075 vs the chain-broken world (one magazine)', () => {
      const firstBase = ehNormals(base.events)[0].baseAtk;
      const firstBroken = ehNormals(chainBroken.events)[0].baseAtk;
      expect(firstBase - firstBroken).toBeCloseTo(staticAtk * 0.075, 4);
    });

    it('is continuous: the same exact diff holds at t≈70s (no wall-clock expiry)', () => {
      const at70 = (evs: SimEvent[]) => {
        const ns = ehNormals(evs).filter((d) => Math.abs(d.sec - 70) < 1);
        expect(ns.length).toBeGreaterThan(0);
        return ns[0].baseAtk;
      };
      expect(at70(base.events) - at70(chainBroken.events)).toBeCloseTo(
        staticAtk * 0.075,
        4
      );
    });

    it('DISCRIMINATING: neither the 0-magazine nor the 4-magazine world matches shipped', () => {
      const firstBase = ehNormals(base.events)[0].baseAtk;
      expect(firstBase).not.toBeCloseTo(
        ehNormals(chainBroken.events)[0].baseAtk,
        3
      );
      expect(firstBase).not.toBeCloseTo(
        ehNormals(fourMag.events)[0].baseAtk,
        3
      );
      // …and the 4-magazine over-credit is exactly 4× the in-scope magnitude.
      expect(
        ehNormals(fourMag.events)[0].baseAtk -
          ehNormals(chainBroken.events)[0].baseAtk
      ).toBeCloseTo(staticAtk * 0.3, 4);
    });

    it('is a passive self-buff with no wall-clock expiry (the perResource carrier)', () => {
      // casterIdx === EH excludes liter's ally-granted skill1 atkPct buff (same key shape).
      const applied = buffs(base.events).filter(
        (b) =>
          b.casterIdx === EH &&
          b.key.includes(':skill1:') &&
          b.stat === 'atkPct' &&
          b.targetIdx === EH
      );
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.casterIdx))]).toEqual([EH]);
      expect([...new Set(applied.map((b) => b.expiresFrame))]).toEqual([null]);
    });
  });

  describe('E4 — S2 E5: Elemental Advantage Attack Damage ▲16.36% for 15s on scrap gain', () => {
    it('lifts the ELEMENT bucket to 1.2636 while live (t<15s vs the Iron boss)', () => {
      const early = ehNormals(base.events).filter((d) => d.sec < 14);
      expect(early.length).toBeGreaterThan(0);
      expect([...new Set(early.map(elem9))]).toEqual([
        +(1.1 + 16.36 / 100).toFixed(9),
      ]);
    });

    it('expires at 15s: the element bucket returns to the bare 1.1 advantage major', () => {
      const late = ehNormals(base.events).filter(
        (d) => d.sec > 16 && d.sec < 40
      );
      expect(late.length).toBeGreaterThan(0);
      expect([...new Set(late.map(elem9))]).toEqual([+(1.1).toFixed(9)]);
    });

    it('is applied at frame 0 as a 15-second fused passive (battle-start scrap gain)', () => {
      const applied = buffs(base.events).filter(
        (b) => b.stat === 'elemAdvantageDamagePct' && b.targetIdx === EH
      );
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([16.36]);
      expect([...new Set(applied.map((b) => b.frame))]).toEqual([0]);
      expect([...new Set(applied.map((b) => b.expiresFrame))]).toEqual([
        15 * FPS,
      ]);
    });

    it('DISCRIMINATING: a Damage-Up-bucket encoding moves a different multiplier and total', () => {
      const early = ehNormals(wrongBucket.events).filter((d) => d.sec < 14);
      expect([...new Set(early.map(elem9))]).not.toContain(
        +(1.1 + 16.36 / 100).toFixed(9)
      );
      expect(base.totals['e-h']).not.toEqual(wrongBucket.totals['e-h']);
    });

    it('SCOPE: vs a Fire boss (no Wind advantage) the line contributes exactly nothing', () => {
      // Byte-identical totals for EVERY unit with the line removed — the buff is advantage-gated,
      // not a hidden unconditional damage term.
      expect(baseFire.totals).toEqual(noElemFire.totals);
    });
  });

  describe('E6 — burst: weapon change, 61% final ATK, full charge 250%, one round per magazine', () => {
    it('fires EXACTLY one 61% full-charge shot per burst cast (maxShots = magazines = 1)', () => {
      const bursts = ehBursts(base.events);
      const shots = swapShots(base.events);
      expect(shots.length).toBe(bursts.length);
      expect([...new Set(shots.map((d) => d.atkPct))]).toEqual([61]);
      expect([...new Set(shots.map((d) => d.srcSlot))]).toEqual(['normal']);
    });

    it('each swap shot is a full charge at ×2.5 (250% of damage)', () => {
      const shots = swapShots(base.events);
      expect([...new Set(shots.map((d) => d.mult.charge))]).toEqual([2.5]);
      const charged = ehShots(base.events).filter((s) => s.charged);
      expect(charged.length).toBe(shots.length);
    });

    it('each swap shot lands inside its cast window (<1s after the cast — the 0.4s charge)', () => {
      const bursts = ehBursts(base.events);
      const shots = swapShots(base.events);
      for (const c of bursts) {
        const inWindow = shots.filter(
          (d) => d.frame > c.frame && d.frame <= c.frame + 1 * FPS
        );
        expect(
          inWindow.length,
          `cast at ${c.sec.toFixed(2)}s produced no swap shot within 1s`
        ).toBe(1);
      }
    });

    it('DISCRIMINATING: without maxShots the swap refires inside the 10s window', () => {
      expect(swapShots(noMaxShots.events).length).toBeGreaterThan(
        ehBursts(noMaxShots.events).length
      );
    });

    it('DISCRIMINATING: without chargeMultPct the shot is uncharged (×1, not ×2.5)', () => {
      expect([
        ...new Set(swapShots(noChargeMult.events).map((d) => d.mult.charge)),
      ]).toEqual([1]);
    });

    it('the kit carries NO nuke line: zero burst-bucket damage from E.H.', () => {
      expect(
        dmg(base.events).filter((d) => d.slug === 'e-h' && d.bucket === 'burst')
          .length
      ).toBe(0);
    });
  });

  describe('E7 — burst additional effect: ATK ▲430.05% for 10s (final ATK, self)', () => {
    it('is applied once per cast, self-scoped, with a 10-second expiry', () => {
      const applied = eh430(base.events);
      expect(applied.length).toBe(ehBursts(base.events).length);
      expect([...new Set(applied.map((b) => b.casterIdx))]).toEqual([EH]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([EH]);
      expect([
        ...new Set(applied.map((b) => b.expiresFrame! - b.frame)),
      ]).toEqual([10 * FPS]);
    });

    it('DISCRIMINATING: keyed to HER burstCast, not fullBurstEnter (helm rotations stay clean)', () => {
      // Shipped: applications == her own casts, STRICTLY fewer than team Full Bursts.
      expect(eh430(base.events).length).toBeLessThan(
        fbStarts(base.events).length
      );
      // The fullBurstEnter counterfactual over-applies on helm's rotations.
      expect(eh430(fbEnter.events).length).toBeGreaterThan(
        ehBursts(fbEnter.events).length
      );
    });

    it('raises final ATK by EXACTLY 430.05% inside the window and 0 outside (aligned events)', () => {
      const nsBase = ehNormals(base.events);
      const nsNo = ehNormals(noBurstAtk.events);
      expect(nsBase.length).toBe(nsNo.length);
      const cast = ehBursts(base.events)[0];
      let inWindow = 0;
      let outWindow = 0;
      for (let i = 0; i < nsBase.length; i++) {
        const diff = nsBase[i].baseAtk - nsNo[i].baseAtk;
        // Strict upper bound: the buff is gone AT its expiresFrame (cast+600).
        if (
          nsBase[i].frame >= cast.frame &&
          nsBase[i].frame < cast.frame + 10 * FPS
        ) {
          expect(
            diff,
            `in-window normal at ${nsBase[i].sec.toFixed(2)}s`
          ).toBeCloseTo(staticAtk * 4.3005, 4);
          inWindow++;
        } else if (nsBase[i].frame < cast.frame) {
          expect(
            diff,
            `pre-cast normal at ${nsBase[i].sec.toFixed(2)}s`
          ).toBeCloseTo(0, 6);
          outWindow++;
        }
      }
      expect(inWindow).toBeGreaterThan(0);
      expect(outWindow).toBeGreaterThan(0);
    });

    it('the swap shot shares that final ATK and rides the +50% Full Burst major', () => {
      const shot = swapShots(base.events)[0];
      expect(shot.fbMajorApplied).toBe(true);
      expect(swapShots(base.events).every((d) => d.fbMajorApplied)).toBe(true);
      // Same effective ATK as the SMG normals inside the same window (the buff is live at cast).
      const cast = ehBursts(base.events)[0];
      const inWindow = ehNormals(base.events).find(
        (d) => d.frame >= cast.frame && d.frame < cast.frame + 10 * FPS
      )!;
      expect(shot.baseAtk).toBeCloseTo(inWindow.baseAtk, 6);
    });
  });
});
