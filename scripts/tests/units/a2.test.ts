// PER-UNIT KIT SPEC — `a2` (A2, Attacker/RL/Fire, Burst III, cd 40s, ammo 6 / reloadFrames 111 /
// chargeFrames 60 / chargeMultiplier 250; NieR:Automata collab, no base counterpart). Kit-autonomy
// gauntlet 2026-07-28 (from-scratch baseline authoring — there was NO shipped override; S3 authored
// the encoding this file pins).
//
// One assertion group per KIT LINE (A1..A6 below), asserted against the authored override loaded from
// disk. `withPatchedOverride` builds COUNTERFACTUALS only (the nearest wrong model each assertion must
// discriminate against) — never the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters['a2'].skills):
//   S1 ■ using Burst Skill → self: Charge Damage ▲110.44% for 15 sec.                         [A1]
//                            Explosion Radius ▲100.74% for 15 sec.   (UNMODELED — out of domain)
//   S2 ■ hitting a target with Full Charge → the target: 30.1% of final ATK as additional dmg. [A2]
//      ■ hitting a target with Full Charge → self: Damage to Parts ▲40.88% for 3 sec.          [A3]
//   BU ■ self: Mode B — own HP decreases every second while ATK and Charge Speed increase; if own
//        HP dips below 40%, Mode B is removed.                                                 [A4/A5]
//        Effect 1: Current HP ▼3.99% every 1 sec.   (UNMODELED — no HP pool; its offensive consequence
//                                                    — the <40% removal — is the DERIVED Mode B uptime)
//        Effect 2: ATK ▲15.19%.                                                              [A4]
//        Effect 3: Charge Speed ▲35.88%.                                                     [A5]
//
// Her damage identity: a charge RL whose burst is a pure SELF state (Mode B) — no burst damage. Mode B
// grants ATK + Charge Speed while it drains her HP; the drain removes Mode B once HP < 40%, so the buffs
// have a bounded uptime, NOT permanent. The sim models no HP pool, so the removal is captured as a
// DERIVED duration: HP decays 3.99% of CURRENT HP per second (compound), crossing 40% at
// t = ln(0.4)/ln(1-0.0399) = 22.5s. That closed-form (a consequence of the kit's own constants, not a
// board fit) is the Mode B uptime this file pins. S1's Charge Damage ▲ is additive flat points in the
// charge bucket (chargeDamagePct), the literal "Charge Damage ▲" reading — distinct from the multiplier
// stat (chargeDamageMultPct) that scales BASE charge damage.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates nothing):
//   A1  "Charge Damage ▲" = chargeDamagePct (additive flat points): an RL normal full-charge shot's
//       charge mult lifts from the bare 2.5 to 2.5 + 1.1044 = 3.6044 during the window. The nearest
//       wrong — chargeDamageMultPct — scales the BASE: 2.5 × (1 + 1.1044) = 5.261. Self-calibrating: the
//       lifted value must equal bare + 1.1044 (additive) and NOT bare × 2.1044 (multiplicative).
//   A2  the 30.1% rider fires on EVERY full charge = every RL pull (shotFired): proc count === shot count.
//       The nearest wrong trigger (lastBullet) fires once per magazine (~shots/6), provably fewer.
//   A3  partsDamagePct must be EXACTLY inert vs the partless scope-lock boss — byte-identical totals for
//       every unit (not "small"), while the buff itself is still applied (40.88, self, 3s).
//   A4  Mode B ATK ▲15.19% is a SELF burstCast buff with the DERIVED 22.5s duration — offensively live
//       (removing the burst state drops her total) and NOT permanent (a duration-less encoding over-credits
//       100% uptime vs the ~56% the HP drain allows, so the permanent counterfactual deals MORE).
//   A5  Mode B Charge Speed ▲35.88% is the companion self burstCast buff, same derived 22.5s window,
//       self-scoped — it shortens her charge time so she fires more often while Mode B is up.
//
// Fixture: the 720-kit-audit control comp (liter B1 / crown B2 / a2 B3 / helm B3, boss Fire, focus a2) —
// A2 needs a real rotation to cast her burst at all (a lone B3 makes zero Full Bursts). She shares B3 with
// helm and casts several times over 180s; focus (×2.5 burst gauge on a charge weapon) keeps her casting.
// Deterministic (no seed); event-log assertions over totals. controlComp slot order: liter 0 / crown 1 /
// a2 2 / helm 3.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
const SLOT_A2 = 2;
/** Mode B derived uptime: ln(0.4)/ln(1-0.0399) = 22.5s (compound 3.99%-of-current-HP drain to <40%). */
const MODE_B_SEC = 22.5;
const MODE_B_FRAMES = Math.round(MODE_B_SEC * FPS);

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;
type FbStart = Extract<SimEvent, { kind: 'fullBurstStart' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp('a2'),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual / discriminator patches ---------------------------------------------------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);

/** A1 reference: her S1 Charge Damage line removed entirely. */
const noS1 = withPatchedOverride('a2', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'chargeDamagePct'));
  if (ov.skill1.length === before) {
    throw new Error('a2 S1 chargeDamagePct block missing — fixture is stale');
  }
});
/** A1 counterfactual: the same line as the MULTIPLIER stat (scales BASE charge damage). */
const chargeMultStat = withPatchedOverride('a2', (ov) => {
  const e = ov.skill1
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'chargeDamagePct');
  if (!e) {
    throw new Error('a2 S1 chargeDamagePct effect missing — fixture is stale');
  }
  e.stat = 'chargeDamageMultPct';
});
/** A2 reference: her full-charge additional-damage rider removed. */
const noRider = withPatchedOverride('a2', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'flatDamage')
  );
  if (ov.skill2.length === before) {
    throw new Error('a2 S2 rider missing — fixture is stale');
  }
});
/** A2 counterfactual: the rider on a lastBullet trigger (once per magazine, not per full charge). */
const riderLastBullet = withPatchedOverride('a2', (ov) => {
  const b = ov.skill2.find((x: any) =>
    x.effects.some((e: any) => e.kind === 'flatDamage')
  );
  if (!b) {
    throw new Error('a2 S2 rider missing — fixture is stale');
  }
  b.trigger = { kind: 'lastBullet' };
});
/** A3 reference: her parts-damage line removed. */
const noParts = withPatchedOverride('a2', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasStat(b, 'partsDamagePct'));
  if (ov.skill2.length === before) {
    throw new Error('a2 S2 partsDamagePct block missing — fixture is stale');
  }
});
/** A4/A5 reference: the whole Mode B burst state removed. */
const noModeB = withPatchedOverride('a2', (ov) => {
  if (ov.burst.length === 0) {
    throw new Error('a2 burst Mode B missing — fixture is stale');
  }
  ov.burst = [];
});
/** A4 counterfactual: Mode B made PERMANENT (duration stripped) — over-credits 100% uptime. */
const permanentModeB = withPatchedOverride('a2', (ov) => {
  let touched = 0;
  for (const b of ov.burst) {
    for (const e of b.effects) {
      if (e.stat === 'atkPct' || e.stat === 'chargeSpeedPct') {
        delete e.durationSec;
        touched++;
      }
    }
  }
  if (touched < 2) {
    throw new Error('a2 burst Mode B buffs missing — fixture is stale');
  }
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const runNoS1 = run({ a2: noS1 });
const runChargeMult = run({ a2: chargeMultStat });
const runNoRider = run({ a2: noRider });
const runRiderLB = run({ a2: riderLastBullet });
const runNoParts = run({ a2: noParts });
const runNoModeB = run({ a2: noModeB });
const runPermanent = run({ a2: permanentModeB });

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const shotsA2 = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'a2');
const burstsA2 = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'a2');
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e): e is FbStart => e.kind === 'fullBurstStart');
const a2Normals = (evs: SimEvent[]) =>
  dmg(evs).filter((d) => d.slug === 'a2' && d.bucket === 'normal');
const riders = (evs: SimEvent[]) =>
  dmg(evs).filter((d) => d.slug === 'a2' && d.srcSlot === 'skill2');
/** Distinct normal-shot charge multipliers, rounded to 4 dp. */
const chargeMults = (evs: SimEvent[]) =>
  [
    ...new Set(
      a2Normals(evs).map((d) => Math.round(d.mult.charge * 1e4) / 1e4)
    ),
  ].sort((a, b) => a - b);

describe('a2 — kit spec', () => {
  describe('A1 — S1 Charge Damage ▲110.44% is additive flat points in the charge bucket (15s, self, on burst)', () => {
    const applied = buffs(base.events).filter(
      (b) => b.casterIdx === SLOT_A2 && b.stat === 'chargeDamagePct'
    );

    it('is 110.44% for 15 sec, self-scoped, keyed to her OWN burstCast', () => {
      expect(applied.length).toBe(burstsA2(base.events).length);
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([110.44]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([SLOT_A2]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(15 * FPS);
      }
    });

    it('is keyed to burstCast, NOT fullBurstEnter (helm is co-B3, so team FBs out-number her casts)', () => {
      // A fullBurstEnter encoding would re-grant the buff on EVERY team Full Burst (helm carries
      // some rotations), inflating the apply count to the fullBurstStart count. The fixture must
      // make the two diverge for this to discriminate.
      const casts = burstsA2(base.events).length;
      const fbs = fbStarts(base.events).length;
      expect(casts, 'fixture must let helm out-cast a2').toBeLessThan(fbs);
      expect(
        applied.length,
        `${applied.length} applies vs ${casts} a2 casts / ${fbs} team FBs`
      ).toBe(casts);
    });

    it('lifts the RL normal full-charge mult ADDITIVELY: bare 2.5 → 2.5 + 1.1044 = 3.6044', () => {
      const mults = chargeMults(base.events);
      const bare = mults[0];
      const lifted = mults[mults.length - 1];
      expect(
        bare,
        'bare RL charge mult = chargeMultiplier 250 / 100'
      ).toBeCloseTo(2.5, 3);
      expect(lifted, 'additive flat points: bare + 110.44/100').toBeCloseTo(
        bare + 110.44 / 100,
        3
      );
    });

    it('DISCRIMINATING: the multiplier stat would scale BASE (2.5 × 2.1044 = 5.261), not add', () => {
      const liftedBase = chargeMults(base.events).slice(-1)[0];
      const liftedCf = chargeMults(runChargeMult.events).slice(-1)[0];
      // The counterfactual lifts to bare × (1 + 1.1044); the shipped line must NOT match that.
      expect(liftedCf).toBeGreaterThan(4); // multiplicative reading lands ~5.26
      expect(liftedBase).toBeLessThan(4); // additive reading lands ~3.60
      expect(liftedBase).not.toBeCloseTo(liftedCf, 1);
    });

    it('is offensively live: removing it drops her total', () => {
      expect(base.totals.a2).toBeGreaterThan(runNoS1.totals.a2);
    });
  });

  describe('A2 — S2 full-charge rider deals 30.1% of final ATK, once per full charge (shotFired)', () => {
    it('is the kit magnitude in the skill bucket, crit-eligible, no range, no core (engine rider convention)', () => {
      const r = riders(base.events);
      expect(r.length).toBeGreaterThan(0);
      expect([...new Set(r.map((d) => d.atkPct))]).toEqual([30.1]);
      expect([...new Set(r.map((d) => d.bucket))]).toEqual(['skill']);
      expect(r.every((d) => d.critEligible)).toBe(true);
      // Riders force noRange; the kit text lacks "core strike", so no core either.
      expect(r.every((d) => d.rangeApplied === false)).toBe(true);
      expect(r.every((d) => d.coreEligible === false)).toBe(true);
    });

    it('lands once per RL pull (every pull is a full charge), not once per magazine', () => {
      const shots = shotsA2(base.events).length;
      expect(riders(base.events).length).toBe(shots);
    });

    it('DISCRIMINATING: a lastBullet trigger fires far fewer times (once per magazine)', () => {
      expect(riders(runRiderLB.events).length).toBeLessThan(
        riders(base.events).length
      );
    });

    it('contributes damage (removing it drops her total)', () => {
      expect(base.totals.a2).toBeGreaterThan(runNoRider.totals.a2);
    });
  });

  describe('A3 — S2 Damage to Parts ▲40.88% is encoded but exactly inert vs the partless boss', () => {
    const applied = buffs(base.events).filter(
      (b) => b.casterIdx === SLOT_A2 && b.stat === 'partsDamagePct'
    );

    it('is applied (40.88, self-scoped, 3 sec) so the line is present, not dropped', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([40.88]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([SLOT_A2]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(3 * FPS);
      }
    });

    it("removing it changes NO unit's total by a single point", () => {
      expect(base.totals).toEqual(runNoParts.totals);
    });
  });

  describe('A4 — Mode B ATK ▲15.19% is a self burstCast buff with the DERIVED 22.5s uptime', () => {
    const applied = buffs(base.events).filter(
      (b) => b.casterIdx === SLOT_A2 && b.stat === 'atkPct'
    );

    it('is 15.19%, self-scoped, keyed to her OWN burstCast (not fullBurstEnter)', () => {
      const casts = burstsA2(base.events).length;
      const fbs = fbStarts(base.events).length;
      expect(casts, 'fixture must let helm out-cast a2').toBeLessThan(fbs);
      expect(
        applied.length,
        `${applied.length} applies vs ${casts} a2 casts / ${fbs} team FBs`
      ).toBe(casts);
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([15.19]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([SLOT_A2]);
    });

    it('carries the derived Mode B duration (HP drain to <40% = 22.5s), not permanent', () => {
      expect([
        ...new Set(applied.map((b) => b.expiresFrame! - b.frame)),
      ]).toEqual([MODE_B_FRAMES]);
    });

    it('is offensively live: removing the whole Mode B state drops her total', () => {
      expect(base.totals.a2).toBeGreaterThan(runNoModeB.totals.a2);
    });

    it('DISCRIMINATING: a permanent Mode B over-credits uptime, so it deals MORE than the derived window', () => {
      expect(runPermanent.totals.a2).toBeGreaterThan(base.totals.a2);
    });
  });

  describe('A5 — Mode B Charge Speed ▲35.88% is the companion self burstCast buff, same derived window', () => {
    const applied = buffs(base.events).filter(
      (b) => b.casterIdx === SLOT_A2 && b.stat === 'chargeSpeedPct'
    );

    it('is 35.88%, self-scoped, on the same derived 22.5s duration', () => {
      expect(applied.length).toBe(burstsA2(base.events).length);
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([35.88]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([SLOT_A2]);
      expect([
        ...new Set(applied.map((b) => b.expiresFrame! - b.frame)),
      ]).toEqual([MODE_B_FRAMES]);
    });

    it('shortens her charge while up: more shots with Mode B than with it removed', () => {
      expect(shotsA2(base.events).length).toBeGreaterThan(
        shotsA2(runNoModeB.events).length
      );
    });
  });
});
