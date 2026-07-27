// PER-UNIT KIT SPEC — `anis-star` (Anis: Star, Defender/RL/Electric, Burst I, cd 20s, ammo 6,
// chargeFrames 60, autofire DOWN_Charge). Kit-autonomy gauntlet 2026-07-24 (Tier 2: formation-gated).
//
// ⚠ EXACT SLUG `anis-star` — the RL/Defender/Electric/Burst-I "Anis: Star". NOT base `anis`
//   (RL/Iron) and NOT `anis-sparkling-summer` (SG/Supporter/Electric/Burst III). Approved
//   nicknames: aniss / star / ttanis. Never bare "Anis".
//
// Her kit is FORMATION-GATED like Rapi:RH. Two mutually-exclusive status sets:
//   • noB1  ("My Own Star", she is the SOLE Burst I):  self ATK 40.01% continuous + team burst
//             CDR 7.48s on Full Burst end; S2 caster-ATK rider 35.01% + burst self Attack Damage
//             35.2% ride on this status.
//   • hasB1 ("Everyone's Star", another Burst I present): the ATK riders are REPLACED by re-entering
//             burst at Stage 1 (reenterStage) + an ally Max-HP grant (casterMaxHpPct 15.02 → maxHpFlat).
// The reference-grade basis (kit-status: MEASURED, run A 0.94/0.95) is the noB1 side — the sim
// "cannot move sole-B1 comps", so the hasB1 branch is the dropped/defensive side. This spec therefore
// PINS the noB1 side as load-bearing and asserts the hasB1 side ONLY through the formation FLIP
// (each branch's signature buff present iff its formation holds).
//
// Kit (blablalink prose, data/characters.json → characters['anis-star'].skills):
//   S1 ■ start of battle, all allies: Burst Gauge filling speed ▲6% continuously              [A2]
//      ■ noB1 / self: My Own Star ATK ▲40.01%, continuous, cannot be removed                  [A1]
//      ■ noB1 / Full Burst end, all allies: Cooldown of Burst Skill ▼7.48 sec                 [A10]
//      ■ hasB1 / self: Everyone's Star re-enters Burst at Stage 1 (continuous)                [F2]
//      ■ landing a Full Charge attack, the target: 120.13% of final ATK as additional damage  [A3]
//   S2 ■ entering Full Burst (noB1), all allies: ATK ▲35.01% of caster ATK for 10 sec         [A9]
//      ■ entering Full Burst, self+lower-DEF allies: Projectile Explosion Damage ▲92.03% 10s  [A4]
//      ■ entering Full Burst, all allies: Attack Damage ▲34% for 10 sec                       [A5]
//   BU ■ self: Shooting Stars dot 40.01% of final ATK, 0.25s interval, 10s (projExplosion)    [A7]
//      ■ self: Charge time fixed at 0.7 sec for 10 sec  (chargeSpeedPct 30, SUBTRACTIVE)      [A8]
//      ■ noB1 / self: Attack Damage ▲35.2% for 10 sec                                         [A6]
//      ■ hasB1 / all allies: Max HP ▲15.02% of caster Max HP for 10 sec  (→ maxHpFlat)        [F2]
//
// UNMODELED (offensively inert vs the partless single boss; documented VERBATIM in the override's
// `unmodeled`, no `ignored` blocks): S1 "Cancels Everyone's/My Own Star" status-cancels; S2 hasB1
// full-charge heal (1.26% Max HP); burst Explosion Radius ▲100%; burst DEF ▲55.01%. No assertion.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   A1  the defining My Own Star self-buff. PIN value 40.01, self-scoped, continuous (no expiry);
//       removing it must DROP her total damage (live, not inert) and it must VANISH in a hasB1 comp.
//   A3  RL always full-charges (autofire DOWN_Charge), so the rider lands once per pull: count ==
//       shots at the exact kit magnitude 120.13. A burst-only or magazine-only trigger misses cadence.
//   A7  Shooting Stars is a 0.25s-interval dot: 40 ticks per 10s window at 15-frame spacing. Doubling
//       the interval halves the ticks — the per-window count is the discriminator.
//   A8  chargeSpeedPct 30 is the SUBTRACTIVE 0.7s fix (60f × (1−0.30) = 42f = 0.7s). PIN exact 30;
//       any other number moves her charge cadence off the kit's fixed 0.7s.
//   A9  casterAtkPct surfaces as a FLAT ATK grant (35.01% × caster ATK), NOT the raw 35.01 — so it is
//       discriminated by LINEAR SCALING: doubling the override magnitude (35.01→70.02) must exactly
//       double the applied value, proving 35.01 is the operative number.
//   F1/F2  the formation flip: atkPct 40.01 + casterAtkPct present iff noB1; maxHpFlat present iff
//       hasB1. A model that ignored formation would apply both sets always and fail one side.
//
// Fixture: anis-star as the SOLE Burst I (anis-star B1 / crown B2 / ada B3 / helm B3, boss Fire,
// focus ada) so the noB1 "My Own Star" branch fires — the reference-grade basis. The hasB1 run adds
// liter as a second Burst I. Deterministic (no seed); event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const WINDOW = 10 * FPS; // 10 sec buff/dot windows

/** noB1 comp slot order: anis-star 0 / crown 1 / ada 2 / helm 3. */
const NOB1 = ['anis-star', 'crown', 'ada', 'helm'] as const;
const ANIS = 0;
/** hasB1 comp slot order: liter 0 / anis-star 1 / crown 2 / ada 3 / helm 4. */
const HASB1 = ['liter', 'anis-star', 'crown', 'ada', 'helm'] as const;
const ANIS_HB = 1;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(slugs: readonly string[], overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: [...slugs],
    bossElement: 'Fire',
    focusSlug: 'ada',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual patches (nearest-wrong model each PIN must discriminate against) ----------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);

/** A1 reference: her noB1 My Own Star self-ATK block removed entirely. */
const noMyOwnStar = withPatchedOverride('anis-star', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) => !(b.formation === 'noB1' && hasStat(b, 'atkPct'))
  );
  if (ov.skill1.length === before)
    {throw new Error('anis-star S1 noB1 atkPct block missing — fixture stale');}
});
/** A9 counterfactual: double the S2 caster-ATK magnitude (35.01 → 70.02). */
const doubleCaster = withPatchedOverride('anis-star', (ov) => {
  const e = ov.skill2
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'casterAtkPct');
  if (!e || e.value !== 35.01)
    {throw new Error('anis-star S2 casterAtkPct 35.01 missing — fixture stale');}
  e.value = 70.02;
});
/** A7 counterfactual: double the Shooting Stars interval (0.25s → 0.5s) → half the ticks. */
const halfDot = withPatchedOverride('anis-star', (ov) => {
  const dot = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'dot');
  if (!dot || dot.intervalSec !== 0.25)
    {throw new Error('anis-star burst dot 0.25s missing — fixture stale');}
  dot.intervalSec = 0.5;
});
/** A10 counterfactual: her noB1 team burst-CDR block removed entirely. */
const noCdr = withPatchedOverride('anis-star', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) =>
      !(
        b.formation === 'noB1' &&
        b.effects.some((e: any) => e.kind === 'burstCdr')
      )
  );
  if (ov.skill1.length === before)
    {throw new Error('anis-star S1 noB1 burstCdr block missing — fixture stale');}
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run(NOB1);
const noMOS = run(NOB1, { 'anis-star': noMyOwnStar });
const dblCaster = run(NOB1, { 'anis-star': doubleCaster });
const halfDotRun = run(NOB1, { 'anis-star': halfDot });
const noCdrRun = run(NOB1, { 'anis-star': noCdr });
const hasB1 = run(HASB1);

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const anisShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'anis-star');
const anisBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'anis-star'
  );
/** anis-caster buffApply events for a given stat. */
const anisBuff = (evs: SimEvent[], stat: string, casterSlot: number) =>
  buffs(evs).filter((b) => b.casterIdx === casterSlot && b.stat === stat);

/** Ticks of the Shooting Stars dot inside the FIRST full 10s burst window. */
function firstWindowTicks(evs: SimEvent[]): number {
  const firstCast = anisBursts(evs)[0];
  if (!firstCast) {return 0;}
  return dmg(evs).filter(
    (d) =>
      d.slug === 'anis-star' &&
      d.srcSlot === 'burst' &&
      d.frame >= firstCast.frame &&
      d.frame <= firstCast.frame + WINDOW
  ).length;
}

describe('anis-star (Anis: Star) — kit spec [Tier 2, formation-gated]', () => {
  describe('A1 — S1 My Own Star: self ATK ▲40.01%, continuous, self-scoped (noB1)', () => {
    const applied = anisBuff(base.events, 'atkPct', ANIS);

    it('is exactly 40.01%, held by Anis alone, with NO wall-clock expiry', () => {
      expect(
        applied.length,
        'no My Own Star atkPct buff applied'
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([40.01]);
      expect(
        [...new Set(applied.map((b) => b.targetIdx))],
        'self-scoped'
      ).toEqual([ANIS]);
      expect(
        [...new Set(applied.map((b) => b.expiresFrame))],
        'continuous'
      ).toEqual([null]);
    });

    it('is LIVE: removing it drops her total damage', () => {
      expect(base.totals['anis-star']).toBeGreaterThan(
        noMOS.totals['anis-star']
      );
    });

    it('DISCRIMINATING: the buff is absent when the block is removed', () => {
      expect(anisBuff(noMOS.events, 'atkPct', ANIS).length).toBe(0);
    });
  });

  describe('A2 — S1 team Burst Gauge filling speed ▲6%, all allies, continuous', () => {
    const applied = anisBuff(base.events, 'burstGenPct', ANIS);

    it('is exactly 6% on every ally, continuous (no expiry)', () => {
      expect([...new Set(applied.map((b) => b.value))]).toEqual([6]);
      expect(
        new Set(applied.map((b) => b.targetIdx)).size,
        'reaches all 4 allies'
      ).toBe(4);
      expect([...new Set(applied.map((b) => b.expiresFrame))]).toEqual([null]);
    });
  });

  describe('A3 — S1 full-charge rider: 120.13% of final ATK, once per pull (RL always full-charges)', () => {
    const riders = dmg(base.events).filter(
      (d) => d.slug === 'anis-star' && d.srcSlot === 'skill1'
    );

    it('lands exactly once per shot at the kit magnitude', () => {
      expect(riders.length).toBe(anisShots(base.events).length);
      expect(riders.length).toBeGreaterThan(0);
      expect([...new Set(riders.map((d) => d.atkPct))]).toEqual([120.13]);
    });
  });

  describe('A4 — S2 Projectile Explosion Damage ▲92.03% on Full Burst entry, all allies, 10s', () => {
    const applied = anisBuff(base.events, 'projectileExplosionPct', ANIS);

    it('is exactly 92.03% on all 4 allies for 10 sec', () => {
      expect(
        applied.length,
        'no FB-entry projectileExplosionPct applied'
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([92.03]);
      expect(new Set(applied.map((b) => b.targetIdx)).size).toBe(4);
      for (const b of applied) {expect(b.expiresFrame! - b.frame).toBe(WINDOW);}
    });
  });

  describe('A5 — S2 Attack Damage ▲34% on Full Burst entry, all allies, 10s (formation-independent)', () => {
    const applied = anisBuff(base.events, 'attackDamagePct', ANIS).filter(
      (b) => b.value === 34
    );

    it('is exactly 34% reaching all 4 allies for 10 sec', () => {
      expect(
        applied.length,
        'no FB-entry attackDamagePct 34 applied'
      ).toBeGreaterThan(0);
      expect(new Set(applied.map((b) => b.targetIdx)).size).toBe(4);
      for (const b of applied) {expect(b.expiresFrame! - b.frame).toBe(WINDOW);}
    });
  });

  describe('A6 — Burst Attack Damage ▲35.2%, self-scoped, 10s (noB1)', () => {
    const applied = anisBuff(base.events, 'attackDamagePct', ANIS).filter(
      (b) => b.value === 35.2
    );

    it('is exactly 35.2%, held by Anis alone, for 10 sec, once per burst cast', () => {
      expect(
        applied.length,
        'no burst attackDamagePct 35.2 applied'
      ).toBeGreaterThan(0);
      expect(
        [...new Set(applied.map((b) => b.targetIdx))],
        'self-scoped'
      ).toEqual([ANIS]);
      for (const b of applied) {expect(b.expiresFrame! - b.frame).toBe(WINDOW);}
    });
  });

  describe('A7 — Burst Shooting Stars: 40.01% dot, 0.25s interval, 10s (projectileExplosion flavor)', () => {
    const ticks = dmg(base.events).filter(
      (d) => d.slug === 'anis-star' && d.srcSlot === 'burst'
    );

    it('is the kit magnitude in the burst bucket', () => {
      expect(ticks.length).toBeGreaterThan(0);
      expect([...new Set(ticks.map((d) => d.atkPct))]).toEqual([40.01]);
      expect([...new Set(ticks.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('produces 40 ticks per 10s window (0.25s = 15-frame interval)', () => {
      expect(firstWindowTicks(base.events)).toBe(40);
    });

    it('DISCRIMINATING: doubling the interval halves the ticks per window', () => {
      expect(firstWindowTicks(halfDotRun.events)).toBe(20);
    });
  });

  describe('A8 — Burst charge time fixed at 0.7s → chargeSpeedPct 30 (SUBTRACTIVE), self, 10s', () => {
    const applied = anisBuff(base.events, 'chargeSpeedPct', ANIS);

    it('is exactly 30 (60f × (1−0.30) = 42f = 0.7s), self-scoped, 10s, once per cast', () => {
      expect(applied.length).toBe(anisBursts(base.events).length);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([30]);
      expect(
        [...new Set(applied.map((b) => b.targetIdx))],
        'self-scoped'
      ).toEqual([ANIS]);
      for (const b of applied) {expect(b.expiresFrame! - b.frame).toBe(WINDOW);}
    });
  });

  describe('A9 — S2 caster-ATK rider ▲35.01% of caster ATK on FB entry, all allies, 10s (noB1)', () => {
    const applied = anisBuff(base.events, 'casterAtkPct', ANIS);

    it('surfaces as a FLAT ATK grant from Anis, on all 4 allies, for 10 sec', () => {
      expect(
        applied.length,
        'no FB-entry casterAtkPct applied'
      ).toBeGreaterThan(0);
      expect(new Set(applied.map((b) => b.targetIdx)).size).toBe(4);
      for (const b of applied) {expect(b.expiresFrame! - b.frame).toBe(WINDOW);}
      // single consistent magnitude (35.01% of caster ATK), strictly positive
      const vals = [...new Set(applied.map((b) => b.value))];
      expect(vals.length).toBe(1);
      expect(vals[0]).toBeGreaterThan(0);
    });

    it('DISCRIMINATING: the magnitude scales linearly with the kit value (35.01 is operative)', () => {
      const baseVal = applied[0].value;
      const dblVal = anisBuff(dblCaster.events, 'casterAtkPct', ANIS)[0]?.value;
      expect(
        dblVal,
        'doubled override produced no casterAtkPct buff'
      ).toBeDefined();
      expect(dblVal! / baseVal).toBeCloseTo(2, 5);
    });
  });

  describe('A10 — S1 team Burst CDR ▼7.48s on Full Burst end (noB1)', () => {
    // burstCdr shortens allies' burst cooldowns; it emits no per-buff number to read directly, so it
    // is pinned by its EFFECT on cadence: with the line removed, Anis fits FEWER casts into 180s
    // (her 20s CD is no longer shaved by 7.48s each Full Burst end).
    it('removing the CDR strictly reduces her cast count over the fight', () => {
      const baseBursts = anisBursts(base.events).length;
      const noCdrBursts = anisBursts(noCdrRun.events).length;
      expect(baseBursts).toBeGreaterThan(0);
      expect(
        noCdrBursts,
        'CDR must let her cast more often than the raw 20s CD'
      ).toBeLessThan(baseBursts);
    });
  });

  describe("F1/F2 — formation flip: My Own Star (noB1) vs Everyone's Star (hasB1)", () => {
    it("noB1: My Own Star self-ATK present; Everyone's-Star Max HP (maxHpFlat) ABSENT", () => {
      expect(
        anisBuff(base.events, 'atkPct', ANIS).length,
        'My Own Star must fire when sole B1'
      ).toBeGreaterThan(0);
      expect(
        anisBuff(base.events, 'maxHpFlat', ANIS).length,
        "Everyone's Star must NOT fire when sole B1"
      ).toBe(0);
      expect(
        anisBuff(base.events, 'casterAtkPct', ANIS).length,
        'noB1 caster rider must fire'
      ).toBeGreaterThan(0);
    });

    it("hasB1: My Own Star self-ATK + noB1 caster rider ABSENT; Everyone's-Star Max HP present", () => {
      expect(
        anisBuff(hasB1.events, 'atkPct', ANIS_HB).length,
        'My Own Star must NOT fire with another B1'
      ).toBe(0);
      expect(
        anisBuff(hasB1.events, 'casterAtkPct', ANIS_HB).length,
        'noB1 caster rider must NOT fire'
      ).toBe(0);
      expect(
        anisBuff(hasB1.events, 'maxHpFlat', ANIS_HB).length,
        "Everyone's Star Max HP must fire"
      ).toBeGreaterThan(0);
    });

    it('the formation-independent lines (burstGen 6, projExplosion 92.03, Attack Damage 34) fire in BOTH', () => {
      for (const evs of [base.events, hasB1.events]) {
        const slot = evs === base.events ? ANIS : ANIS_HB;
        expect(anisBuff(evs, 'burstGenPct', slot).length).toBeGreaterThan(0);
        expect(
          anisBuff(evs, 'projectileExplosionPct', slot).length
        ).toBeGreaterThan(0);
        expect(
          anisBuff(evs, 'attackDamagePct', slot).filter((b) => b.value === 34)
            .length
        ).toBeGreaterThan(0);
      }
    });
  });
});
