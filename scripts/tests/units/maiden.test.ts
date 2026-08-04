// PER-UNIT KIT SPEC — `maiden` (Maiden, Attacker/SG/Electric, Burst III, cd 40s, ammo 9,
// 10 pellets/shot, reloadFrames 142). Kit-autonomy gauntlet 2026-08-03 (test-first
// re-derivation). ⚠ EXACT SLUG: `maiden` — the SG/Electric base unit, NOT `maiden-ice-rose`
// (RL/Electric "Maiden: Ice Rose", aka mir/xmaiden); the slug-disambiguation lint passes
// clean on the disambiguated full form.
// NOTE: this is a FROM-SCRATCH unit — there was no shipped override before this gauntlet
// (simSupported was false), so the harness cannot even load her until
// src/skills/overrides/maiden.json exists (the RED state of this suite: every assertion
// fails at load). Every assertion below PINS a kit line GREEN vs that override and RED vs
// the nearest-wrong counterfactual (withPatchedOverride), so the file discriminates exactly
// as a verification gauntlet would (yulha/admi precedent).
//
// Kit (blablalink prose, data/characters.json → characters.maiden.skills, lvl 10):
//   S1 ■ attacked 20× → self: Revenge: ATK ▲26.66% for 20 sec.                [UNMODELED — M3]
//   S2 ■ all enemies: Taunt for 10 sec. (cd 30s)                               [UNMODELED — M4]
//      ■ self: Critical Damage ▲152.84% for 10 sec.                            [FAITHFUL — M1]
//   BU ■ all enemies: 457.87% of final ATK as Burst Skill damage               [FAITHFUL — M2]
//      ■ same target(s) when in Revenge status: 457.87% additional damage      [UNMODELED — M2c]
//
// THE REVENGE CLUSTER IS OUT-OF-DOMAIN. Maiden's defining mechanic is the 'Revenge' SELF
// status, earned by being ATTACKED 20 times, which both lifts her own ATK (S1) and DOUBLES
// her burst (the BU rider fires only 'when in Revenge status' — the SAME kit archetype as
// yulha's 'Calm', identical 457.87 + 457.87 burst numbers). The sim has NO incoming-damage
// model (v1 boss is immortal and never acts), NO 'attacked N times' trigger primitive, and
// NO self-status gate — so Revenge can never be earned or read on this basis. In-game her S2
// taunt (10s per 30s) pulls enemy fire onto her, which is what feeds the attacked-counter —
// the taunt is the tanking half of that same out-of-domain loop. The faithful encoding models
// the two UNCONDITIONAL lines (S2 self crit-damage buff, burst base nuke) and documents the
// Revenge cluster + the taunt as UNMODELED (yulha/helm-aquamarine precedent for a gate that
// cannot fire on the scope-lock basis — faithful omission, not a fudge). M2c and M3 therefore
// pin the OMISSIONS as deliberate: the burst fires at HALF its theoretical Revenge-active
// magnitude and no S1 ATK buff exists, and the counterfactuals prove those are choices the
// wrong model provably fails.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model
// gates nothing):
//   M1  the buff is SELF-targeted, so an all-allies mis-scope, a wrong magnitude (the lvl-1
//       94.13), a wrong duration (20s), or a wrong cadence (interval:15) each produce a
//       DIFFERENT log. Pinned five ways: value 152.84, the sole holder is maiden herself,
//       600-frame window, the exact t=30/60/90/120/150 fire frames (interval:30 on the
//       datamined skillCooldownsSec.skill2 = 30, first fire at CD, NO force-cast to t=0 —
//       the yulha/rosanna-chic-ocean interval convention), and live-not-inert (removing it
//       moves her total: critDamagePct feeds the major bracket at critRate × 152.84pp per
//       in-window hit).
//   M2  a burst CAST lands BEFORE the Full Burst window opens, so it must never take the
//       +50% major (verified fact, 2026-07-13) — the fullBurstEnter counterfactual lands
//       in-window and does. The magnitude is the lvl-10 457.87, not the lvl-1 270.56.
//   M2c the Revenge-gated additional 457.87% is OMITTED (Revenge is untriggerable): exactly
//       ONE burst hit per cast. The 'Revenge always active' counterfactual doubles it (two
//       hits per cast) — the model this assertion proves we did NOT silently adopt.
//   M3  S1 is genuinely unmodeled: NO maiden atkPct buff exists (casterIdx = maiden). The
//       'Revenge always active' counterfactual adds one — proving the absence is a choice,
//       not a stale fixture. (The phantom arm is the optimistic encoding: an always-on
//       self ATK buff assuming Revenge uptime the sim cannot produce.)
//   M4  the taunt line is out-of-domain: the single partless boss already takes everyone's
//       attacks and the sim models no enemy targeting/aggro, so the line moves nothing —
//       recorded verbatim in unmodeled, no damage assertion (documented, load-bearing-neutral).
//
// Fixture: the 720-kit-audit control comp (liter B1 / crown B2 / maiden B3 carry / helm B3,
// boss Fire, focus maiden) — maiden needs a real rotation to cast her burst at all (helm is
// the co-B3; they alternate stage-III casts, as in the yulha fixture). Electric vs the Fire
// control boss is elementally neutral. Deterministic (no seed); event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
/** controlComp slot order: liter 0 / crown 1 / maiden 2 / helm 3. */
const MAIDEN = 2;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp('maiden'),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual patches -------------------------------------------------------------------
/** M1 wrong magnitude: the lvl-1 value 94.13 instead of the lvl-10 152.84. */
const maidenWeakS2 = withPatchedOverride('maiden', (ov) => {
  ov.skill2[0].effects[0].value = 94.13;
});
/** M1 wrong scope: the crit-damage buff hits all allies, not just herself. */
const maidenAlliesS2 = withPatchedOverride('maiden', (ov) => {
  ov.skill2[0].target = { kind: 'allies' };
});
/** M1 wrong duration: 20 sec instead of 10. */
const maidenLongS2 = withPatchedOverride('maiden', (ov) => {
  ov.skill2[0].effects[0].durationSec = 20;
});
/** M1 wrong cadence: re-casts every 15s instead of 30s. */
const maidenFastS2 = withPatchedOverride('maiden', (ov) => {
  ov.skill2[0].trigger = { kind: 'interval', sec: 15 };
});
/** M1 reference: the crit-damage buff removed entirely (proves it is live, not inert). */
const maidenNoS2 = withPatchedOverride('maiden', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) => !b.effects.some((e: any) => e.stat === 'critDamagePct')
  );
  if (ov.skill2.length === before) {
    throw new Error('maiden S2 critDamagePct block missing — fixture is stale');
  }
});
/** M2 wrong magnitude: the lvl-1 burst 270.56 instead of the lvl-10 457.87. */
const maidenWeakBurst = withPatchedOverride('maiden', (ov) => {
  ov.burst[0].effects[0].atkPct = 270.56;
});
/** M2 wrong trigger: fullBurstEnter (lands in-window, takes the +50% FB major) instead of
 *  burstCast (the cast lands BEFORE the FB window opens → FB-exempt). */
const maidenBurstOnFbEnter = withPatchedOverride('maiden', (ov) => {
  ov.burst[0].trigger = { kind: 'fullBurstEnter' };
});
/** M2c / M3 the 'Revenge always active' mis-model: the gated additional-damage rider made
 *  ungated (a second burst nuke) AND the S1 Revenge ATK buff added as a passive. This is the
 *  optimistic encoding the shipped override deliberately DOES NOT adopt (Revenge requires 20
 *  hits TAKEN — the immortal-boss sim produces none). */
const maidenRevengeAlways = withPatchedOverride('maiden', (ov) => {
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
    effects: [{ kind: 'buff', stat: 'atkPct', value: 26.66 }],
  });
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const weakS2 = run({ maiden: maidenWeakS2 });
const alliesS2 = run({ maiden: maidenAlliesS2 });
const longS2 = run({ maiden: maidenLongS2 });
const fastS2 = run({ maiden: maidenFastS2 });
const noS2 = run({ maiden: maidenNoS2 });
const weakBurst = run({ maiden: maidenWeakBurst });
const burstOnFbEnter = run({ maiden: maidenBurstOnFbEnter });
const revengeAlways = run({ maiden: maidenRevengeAlways });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const maidenCritDmgBuff = (evs: SimEvent[]) =>
  buffs(evs).filter(
    (b) => b.casterIdx === MAIDEN && b.stat === 'critDamagePct'
  );
const maidenAtkBuff = (evs: SimEvent[]) =>
  buffs(evs).filter((b) => b.casterIdx === MAIDEN && b.stat === 'atkPct');
const maidenBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'maiden'
  );
const maidenNukes = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is Damage =>
      e.kind === 'damage' && e.slug === 'maiden' && e.bucket === 'burst'
  );

describe('maiden — kit spec', () => {
  describe('M1 — S2 grants SELF Critical Damage ▲152.84% for 10s on the 30s CD', () => {
    const applied = maidenCritDmgBuff(base.events);

    it('is the lvl-10 magnitude 152.84 (not the lvl-1 94.13)', () => {
      expect([...new Set(applied.map((b) => b.value))]).toEqual([152.84]);
      expect([
        ...new Set(maidenCritDmgBuff(weakS2.events).map((b) => b.value)),
      ]).toEqual([94.13]);
    });

    it('reaches ONLY herself (not all allies)', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect(new Set(applied.map((b) => b.targetIdx))).toEqual(
        new Set([MAIDEN])
      );
      // The all-allies counterfactual reaches all four holders per firing.
      const allyHolders = new Set(
        maidenCritDmgBuff(alliesS2.events).map((b) => b.targetIdx)
      );
      expect(allyHolders.size, 'allies scope must widen the holder set').toBe(
        4
      );
    });

    it('lasts exactly 10 sec (600 frames), not 20', () => {
      expect([
        ...new Set(applied.map((b) => b.expiresFrame! - b.frame)),
      ]).toEqual([10 * FPS]);
      expect(
        [
          ...new Set(
            maidenCritDmgBuff(longS2.events).map(
              (b) => b.expiresFrame! - b.frame
            )
          ),
        ],
        'the 20s counterfactual must move the window'
      ).toEqual([20 * FPS]);
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
        new Set(maidenCritDmgBuff(fastS2.events).map((b) => b.frame)).size,
        'interval:15 must produce more distinct fire frames than interval:30'
      ).toBeGreaterThan(frames.length);
    });

    it("is live, not inert: removing it moves maiden's total", () => {
      expect(base.totals.maiden).not.toEqual(noS2.totals.maiden);
    });
  });

  describe('M2 — burst nuke: 457.87% of final ATK to all enemies, cast BEFORE the FB window', () => {
    const nukes = maidenNukes(base.events);

    it('fires once per burst cast at the lvl-10 magnitude, in the burst bucket', () => {
      expect(nukes.length).toBe(maidenBursts(base.events).length);
      expect(nukes.length).toBeGreaterThan(0);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([457.87]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
      // The lvl-1 counterfactual reads 270.56.
      expect([
        ...new Set(maidenNukes(weakBurst.events).map((d) => d.atkPct)),
      ]).toEqual([270.56]);
    });

    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      expect(nukes.every((d) => d.fbMajorApplied === false)).toBe(true);
      // The fullBurstEnter counterfactual lands in-window and takes the major.
      expect(
        maidenNukes(burstOnFbEnter.events).some(
          (d) => d.fbMajorApplied === true
        ),
        'a fullBurstEnter nuke must take the +50% FB major — proving burstCast is the FB-exempt trigger'
      ).toBe(true);
    });

    it('is crit-eligible at the caster sheet rate (engine flatDamage default)', () => {
      expect(nukes.every((d) => d.critEligible === true)).toBe(true);
    });
  });

  describe('M2c — the Revenge-gated additional 457.87% is OMITTED (Revenge is untriggerable)', () => {
    it('lands exactly ONE burst hit per cast — not the doubled "Revenge always active" model', () => {
      const casts = maidenBursts(base.events).length;
      expect(maidenNukes(base.events).length).toBe(casts);
      // The optimistic mis-model fires two burst hits per cast.
      expect(
        maidenNukes(revengeAlways.events).length,
        'the always-Revenge counterfactual must double the burst hits — proving the shipped ' +
          'single hit is a deliberate omission of the gated rider'
      ).toBe(casts * 2);
    });
  });

  describe('M3 — S1 (Revenge ATK buff) is genuinely unmodeled', () => {
    it('emits NO maiden atkPct buff (the Revenge trigger cannot fire)', () => {
      expect(maidenAtkBuff(base.events).length).toBe(0);
      // The always-Revenge counterfactual adds one — the absence is a choice, not a stale fixture.
      expect(
        maidenAtkBuff(revengeAlways.events).length,
        'the always-Revenge counterfactual must produce an atkPct buff'
      ).toBeGreaterThan(0);
    });
  });

  describe('M4 — S2 taunt is out-of-domain (documented, no damage assertion)', () => {
    it('the sim models no enemy targeting/aggro, so the taunt moves nothing — recorded in unmodeled', () => {
      // No incoming damage / no aggro model in v1: there is nothing to assert behaviorally.
      // The line sits verbatim in unmodeled.skill2; this test documents that the omission is
      // load-bearing-neutral (her total is unchanged whether or not a taunt could be expressed).
      expect(base.totals.maiden).toBeGreaterThan(0);
    });
  });
});
