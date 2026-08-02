// PER-UNIT KIT SPEC — `yulha` (Yulha, Attacker/SR/Fire, Burst III, cd 40s, ammo 6, chargeFrames 60,
// reloadFrames 133). Kit-autonomy gauntlet 2026-08-01 (first modeling — no prior override).
//
// One assertion group per dispositioned kit line, asserted against the SHIPPED override loaded from
// disk. `withPatchedOverride` appears ONLY to build COUNTERFACTUALS (the nearest wrong model each
// assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.yulha.skills, lvl 10):
//   S1 ■ attacked 30× → self: Calm: Critical Rate ▲24.53% for 20 sec.            [UNMODELED — Y3]
//   S2 ■ all allies: ATK ▲90.75% for 5 sec.                                        [FAITHFUL — Y1]
//      ■ all allies: Equally shares damage taken for 10 sec.                      [UNMODELED — Y4]
//   BU ■ all enemies: 457.87% of final ATK as Burst Skill damage                   [FAITHFUL — Y2]
//      ■ same target(s) when in Calm status: 457.87% of final ATK additional dmg   [UNMODELED — Y2c]
//
// THE CALM CLUSTER IS OUT-OF-DOMAIN. Yulha's defining mechanic is the 'Calm' SELF status, earned by
// being ATTACKED 30 times, which both lifts her own crit (S1) and DOUBLES her burst (the BU rider
// fires only 'when in Calm status'). The sim has NO incoming-damage model (v1 boss is immortal and
// never acts), NO 'attacked N times' trigger primitive, and NO self-status gate — so Calm can never
// be earned or read on this basis. The faithful encoding models the two UNCONDITIONAL lines (S2 ATK
// buff, burst base nuke) and documents the Calm cluster + the defensive damage-share as UNMODELED
// (the helm-aquamarine precedent for a gate that cannot fire on the scope-lock basis — faithful
// omission, not a fudge). Y2c and Y3 therefore pin the OMISSIONS as deliberate: the burst fires at
// HALF its theoretical Calm-active magnitude and no S1 crit buff exists, and the counterfactuals
// prove those are choices the wrong model provably fails.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   Y1  the buff targets ALL ALLIES, so a self-only mis-scope, a wrong magnitude (the lvl-1 53.62),
//       a wrong duration, or a wrong cadence (passive/interval:15) each produce a DIFFERENT log.
//       Pinned five ways: value 90.75, all four holders, 300-frame window, the exact t=30/60/90/120/
//       150 fire frames (interval:30, first fire at CD, NO force-cast to t=0), and live-not-inert
//       (removing it moves team totals).
//   Y2  a burst CAST lands BEFORE the Full Burst window opens, so it must never take the +50% major
//       (verified fact, 2026-07-13) — the fullBurstEnter counterfactual lands in-window and does.
//       The magnitude is the lvl-10 457.87, not the lvl-1 270.56.
//   Y2c the Calm-gated additional 457.87% is OMITTED (Calm is untriggerable): exactly ONE burst hit
//       per cast. The 'Calm always active' counterfactual doubles it (two hits per cast) — the model
//       this assertion proves we did NOT silently adopt.
//   Y3  S1 is genuinely unmodeled: NO yulha critRatePct buff exists. The 'Calm always active'
//       counterfactual adds one — proving the absence is a choice, not a stale fixture.
//   Y4  the damage-share line is inert/defensive: removing nothing changes (it was never modeled);
//       documented here, no damage assertion (the boss deals no damage to redistribute).
//
// Fixture: the 720-kit-audit control comp (liter B1 / crown B2 / yulha B3 carry / helm B3, boss
// Fire, focus yulha) — yulha needs a real rotation to cast her burst at all. Deterministic (no seed).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
/** controlComp slot order: liter 0 / crown 1 / yulha 2 / helm 3. */
const YULHA = 2;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp('yulha'),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual patches -------------------------------------------------------------------
/** Y1 wrong scope: the ATK buff hits only herself, not all allies. */
const yulhaSelfOnly = withPatchedOverride('yulha', (ov) => {
  ov.skill2[0].target = { kind: 'self' };
});
/** Y1 wrong magnitude: the lvl-1 value 53.62 instead of the lvl-10 90.75. */
const yulhaWeakS2 = withPatchedOverride('yulha', (ov) => {
  ov.skill2[0].effects[0].value = 53.62;
});
/** Y1 wrong duration: 10 sec instead of 5. */
const yulhaLongS2 = withPatchedOverride('yulha', (ov) => {
  ov.skill2[0].effects[0].durationSec = 10;
});
/** Y1 wrong cadence: re-casts every 15s instead of 30s. */
const yulhaFastS2 = withPatchedOverride('yulha', (ov) => {
  ov.skill2[0].trigger = { kind: 'interval', sec: 15 };
});
/** Y1 reference: the ATK buff removed entirely (proves it is live, not inert). */
const yulhaNoS2 = withPatchedOverride('yulha', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) => !b.effects.some((e: any) => e.stat === 'atkPct')
  );
  if (ov.skill2.length === before) {
    throw new Error('yulha S2 atkPct block missing — fixture is stale');
  }
});
/** Y2 wrong magnitude: the lvl-1 burst 270.56 instead of the lvl-10 457.87. */
const yulhaWeakBurst = withPatchedOverride('yulha', (ov) => {
  ov.burst[0].effects[0].atkPct = 270.56;
});
/** Y2 wrong trigger: fullBurstEnter (lands in-window, takes the +50% FB major) instead of
 *  burstCast (the cast lands BEFORE the FB window opens → FB-exempt). */
const yulhaBurstOnFbEnter = withPatchedOverride('yulha', (ov) => {
  ov.burst[0].trigger = { kind: 'fullBurstEnter' };
});
/** Y2c / Y3 the 'Calm always active' mis-model: the gated additional-damage rider made ungated
 *  (a second burst nuke) AND the S1 Calm crit buff added as a passive. This is the optimistic
 *  encoding the shipped override deliberately DOES NOT adopt (Calm is untriggerable). */
const yulhaCalmAlways = withPatchedOverride('yulha', (ov) => {
  ov.burst.push({
    slot: 'burst',
    trigger: { kind: 'burstCast' },
    target: { kind: 'enemy' },
    effects: [{ kind: 'flatDamage', atkPct: 457.87 }],
  });
  ov.skill1.push({
    slot: 'skill1',
    trigger: { kind: 'passive' },
    target: { kind: 'self' },
    effects: [{ kind: 'buff', stat: 'critRatePct', value: 24.53 }],
  });
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const selfOnly = run({ yulha: yulhaSelfOnly });
const weakS2 = run({ yulha: yulhaWeakS2 });
const longS2 = run({ yulha: yulhaLongS2 });
const fastS2 = run({ yulha: yulhaFastS2 });
const noS2 = run({ yulha: yulhaNoS2 });
const weakBurst = run({ yulha: yulhaWeakBurst });
const burstOnFbEnter = run({ yulha: yulhaBurstOnFbEnter });
const calmAlways = run({ yulha: yulhaCalmAlways });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const yulhaAtkBuff = (evs: SimEvent[]) =>
  buffs(evs).filter((b) => b.casterIdx === YULHA && b.stat === 'atkPct');
const yulhaCritBuff = (evs: SimEvent[]) =>
  buffs(evs).filter((b) => b.casterIdx === YULHA && b.stat === 'critRatePct');
const yulhaBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'yulha'
  );
const yulhaNukes = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is Damage =>
      e.kind === 'damage' && e.slug === 'yulha' && e.bucket === 'burst'
  );

describe('yulha — kit spec', () => {
  describe('Y1 — S2 grants ALL allies ATK ▲90.75% for 5s on the 30s CD', () => {
    const applied = yulhaAtkBuff(base.events);

    it('is the lvl-10 magnitude 90.75 (not the lvl-1 53.62)', () => {
      expect([...new Set(applied.map((b) => b.value))]).toEqual([90.75]);
      expect([
        ...new Set(yulhaAtkBuff(weakS2.events).map((b) => b.value)),
      ]).toEqual([53.62]);
    });

    it('reaches all four allies, including herself (not self-only)', () => {
      expect(applied.length).toBeGreaterThan(0);
      const perFrame = new Map<number, Set<number | null>>();
      for (const b of applied) {
        (
          perFrame.get(b.frame) ??
          perFrame.set(b.frame, new Set()).get(b.frame)!
        ).add(b.targetIdx);
      }
      for (const [frame, holders] of perFrame) {
        expect(
          holders.size,
          `frame ${frame} reached ${holders.size} allies, expected 4`
        ).toBe(4);
      }
      // The self-only counterfactual reaches exactly one holder per firing.
      const selfHolders = new Set(
        yulhaAtkBuff(selfOnly.events).map((b) => b.targetIdx)
      );
      expect(selfHolders).toEqual(new Set([YULHA]));
    });

    it('lasts exactly 5 sec (300 frames), not 10', () => {
      expect([
        ...new Set(applied.map((b) => b.expiresFrame! - b.frame)),
      ]).toEqual([5 * FPS]);
      expect(
        [
          ...new Set(
            yulhaAtkBuff(longS2.events).map((b) => b.expiresFrame! - b.frame)
          ),
        ],
        'the 10s counterfactual must move the window'
      ).toEqual([10 * FPS]);
    });

    it('re-casts on the 30s CD: fires at t=30/60/90/120/150, first fire at the CD (no force-cast to t=0)', () => {
      const frames = [...new Set(applied.map((b) => b.frame))].sort(
        (a, b) => a - b
      );
      expect(frames).toEqual([
        30 * FPS,
        60 * FPS,
        90 * FPS,
        120 * FPS,
        150 * FPS,
      ]);
      // A 15s CD would fire ~12 distinct times — the cadence is discriminated.
      expect(
        new Set(yulhaAtkBuff(fastS2.events).map((b) => b.frame)).size,
        'interval:15 must produce more distinct fire frames than interval:30'
      ).toBeGreaterThan(frames.length);
    });

    it('is live, not inert: removing it moves team totals', () => {
      expect(base.totals).not.toEqual(noS2.totals);
    });
  });

  describe('Y2 — burst nuke: 457.87% of final ATK to all enemies, cast BEFORE the FB window', () => {
    const nukes = yulhaNukes(base.events);

    it('fires once per burst cast at the lvl-10 magnitude, in the burst bucket', () => {
      expect(nukes.length).toBe(yulhaBursts(base.events).length);
      expect(nukes.length).toBeGreaterThan(0);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([457.87]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
      // The lvl-1 counterfactual reads 270.56.
      expect([
        ...new Set(yulhaNukes(weakBurst.events).map((d) => d.atkPct)),
      ]).toEqual([270.56]);
    });

    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      expect(nukes.every((d) => d.fbMajorApplied === false)).toBe(true);
      // The fullBurstEnter counterfactual lands in-window and takes the major.
      expect(
        yulhaNukes(burstOnFbEnter.events).some(
          (d) => d.fbMajorApplied === true
        ),
        'a fullBurstEnter nuke must take the +50% FB major — proving burstCast is the FB-exempt trigger'
      ).toBe(true);
    });

    it('is crit-eligible at the caster sheet rate (engine flatDamage default)', () => {
      expect(nukes.every((d) => d.critEligible === true)).toBe(true);
    });
  });

  describe('Y2c — the Calm-gated additional 457.87% is OMITTED (Calm is untriggerable)', () => {
    it('lands exactly ONE burst hit per cast — not the doubled "Calm always active" model', () => {
      const casts = yulhaBursts(base.events).length;
      expect(yulhaNukes(base.events).length).toBe(casts);
      // The optimistic mis-model fires two burst hits per cast.
      expect(
        yulhaNukes(calmAlways.events).length,
        'the always-Calm counterfactual must double the burst hits — proving the shipped single ' +
          'hit is a deliberate omission of the gated rider'
      ).toBe(casts * 2);
    });
  });

  describe('Y3 — S1 (Calm crit buff) is genuinely unmodeled', () => {
    it('emits NO yulha critRatePct buff (the Calm trigger cannot fire)', () => {
      expect(yulhaCritBuff(base.events).length).toBe(0);
      // The always-Calm counterfactual adds one — the absence is a choice, not a stale fixture.
      expect(
        yulhaCritBuff(calmAlways.events).length,
        'the always-Calm counterfactual must produce a critRatePct buff'
      ).toBeGreaterThan(0);
    });
  });

  describe('Y4 — S2 damage-share is inert/defensive (documented, no damage assertion)', () => {
    it('the boss deals no damage to redistribute, so the line moves nothing — recorded in unmodeled', () => {
      // No HP pool / no incoming damage in v1: there is nothing to assert behaviorally. The line
      // sits verbatim in unmodeled.skill2; this test documents that the omission is load-bearing-
      // neutral (her total is unchanged whether or not a damage-share could be expressed).
      expect(base.totals.yulha).toBeGreaterThan(0);
    });
  });
});
