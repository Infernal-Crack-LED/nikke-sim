// PER-UNIT KIT SPEC — `dolla` (Dolla, Supporter/SR/Wind, Burst II, cd 20s, ammo 6,
// chargeFrames 60, reloadFrames 141). Kit-autonomy gauntlet 2026-07-31; authored test-first.
//
// One assertion group per KIT LINE (D1..D4 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.dolla.skills):
//   S1 ■ all allies: ATK ▲16.16% for 5 sec (skillCooldownsSec.skill1 = 10, NO activation clause
//        → class-1 pure periodic timer, fires every 10s of battle)                          [D1]
//   S2 ■ entering Full Burst → all allies. Effects vary by number of times entered; EACH
//        SUBSEQUENT EFFECT TRIGGERS ALL EFFECTS BEFORE IT:
//        Once: Burst CD ▼1.82s · Twice: ▼2.2s · Three times: ▼2.6s                          [D2]
//      ■ using Burst Skill → all allies, same escalation rule:
//        Once: ATK ▲7.72% · Twice: Critical Rate ▲4.21% · Three times: Critical Damage ▲13.22%,
//        5 sec each                                                                          [D3]
//   BU ■ 1 enemy with the highest final DEF: 734.69% of final ATK as Burst Skill damage (Wind) [D4]
//
// STRUCTURAL NOTE: Dolla's S2 is two INDEPENDENT escalating ladders — one on fullBurstEnter
// (burst-CDR), one on burstCast (team stats) — the same shape as liter's skill1 (the canonical
// escalating encoder). They live in separate skill2 blocks (blockIdx 0 / 1) → independent
// activation counters, so the CDR escalates by FB-ENTER count and the stats by BURST-CAST count.
//
// WHY EACH ASSERTION DISCRIMINATES (a test that cannot fail under the nearest wrong model gates
// nothing):
//   D1  the nearest wrong read of a trigger-less cooldown skill is a PASSIVE always-on buff (the
//       pre-2026-07-20 misread retired for sakura-bloom/rosanna). Shipped fires on the 10s grid
//       with a 5s expiry (50% duty); a passive fires ONCE at frame 0 with no expiry.
//   D2  the CDR ladder is a rotation lever, and on every fixture tried the Full Burst COUNT is
//       ceiling-bound (gauge/rotation floor), so counts do NOT discriminate (the liter warning,
//       materialized). The ladder is pinned four ways on TIMING/ORDERING instead:
//         (a) EXACT arithmetic — the 2nd cast is cooldown-bound, so its gap is exactly
//             baseCD − (the FIRST tier alone) = 20s − 1.82s. Only one FB-enter precedes it, so a
//             cumulative-on-2nd model (4.02s) or a flat-2.6 / flat-6.62 model all give a different
//             gap. This pins the tier-1 magnitude AND the "first activation grants first tier alone".
//         (b) ESCALATES — later Full Bursts arrive EARLIER than a ladder stuck at flat 1.82s.
//         (c) ADD-UP — from the 3rd Full Burst on, shipped arrives EARLIER than a NON-cumulative
//             flat-2.6 ladder (the "3rd tier replaces the first two" misread), because the cumulative
//             3rd+ tier is 1.82+2.2+2.6 = 6.62s > 2.6s.
//         (d) RAMPS — a saturated flat-6.62 ladder (instant max from entry 1) reaches every Full
//             Burst no LATER than the real ramp, and strictly earlier for an early entry. An instant
//             ramp would tie the timeline and fail the strict clause.
//   D3  cast #1 grants ONLY the first step, cast #2 the first two, cast #3+ all three — the
//       cumulative escalation. The nearest wrong model is a FLAT block applying all three on every
//       cast (no escalation): cast #1 would then carry all three stats, which shipped provably
//       does not.
//   D4  a burst CAST lands BEFORE the Full Burst window opens, so the nuke must never take the
//       +50% FB major (verified fact); it is crit-eligible at the sheet rate (flatDamage default).
//
// Fixture: miranda (B1) / dolla (B2, sole) / helm (B3, SR/Water), boss Fire, focus helm. Chosen
// because it leaves dolla's 2nd cast COOLDOWN-BOUND (gap = exactly 1091 frames = 20s − 1.82s),
// which the gauge-rich 4-unit comps do NOT (their rotation floor shortens it). Deterministic
// (no seed). TEAM_SIZE = 3.
import { describe, expect, it } from 'vitest';
import type { CompOptions } from '../lib/harness.js';
import type { SimEvent } from '../../../src/types.js';
import { data, runComp, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
/** miranda 0 / dolla 1 / helm 2. */
const DOLLA = 1;
const TEAM_SIZE = 3;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Damage = Extract<SimEvent, { kind: 'damage' }>;

const COMP: CompOptions = {
  slugs: ['miranda', 'dolla', 'helm'],
  bossElement: 'Fire',
  focusSlug: 'helm',
};

function runOn(comp: CompOptions, overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  runComp({ ...comp, overrides, cfg: { onEvent: (e) => events.push(e) } });
  return events;
}
const run = (overrides: Record<string, any> = {}) => runOn(COMP, overrides);

// ---- counterfactual patches ------------------------------------------------------------------
/** Replace her S2 Full-Burst-entry escalating CDR ladder with a FLAT per-FB value (or drop it). */
const cdrLadder = (seconds: number | null) =>
  withPatchedOverride('dolla', (ov) => {
    if (seconds === null) {
      const before = ov.skill2.length;
      ov.skill2 = ov.skill2.filter(
        (b: any) => b.trigger.kind !== 'fullBurstEnter'
      );
      if (ov.skill2.length === before) {
        throw new Error(
          'dolla S2 fullBurstEnter block missing — fixture stale'
        );
      }
      return;
    }
    const blk = ov.skill2.find((b: any) => b.trigger.kind === 'fullBurstEnter');
    if (!blk) {
      throw new Error('dolla S2 fullBurstEnter block missing — fixture stale');
    }
    blk.effects = [{ kind: 'burstCdr', seconds }];
  });

/** D3 counterfactual: the burst-cast ladder as a FLAT block — all three stats on EVERY cast
 *  (no escalation). Nearest wrong read of "effects vary by number of times used". */
const flatStatLadder = () =>
  withPatchedOverride('dolla', (ov) => {
    const blk = ov.skill2.find((b: any) => b.trigger.kind === 'burstCast');
    if (!blk) {
      throw new Error('dolla S2 burstCast block missing — fixture stale');
    }
    blk.effects = [
      { kind: 'buff', stat: 'atkPct', value: 7.72, durationSec: 5 },
      { kind: 'buff', stat: 'critRatePct', value: 4.21, durationSec: 5 },
      { kind: 'buff', stat: 'critDamagePct', value: 13.22, durationSec: 5 },
    ];
  });

/** D1 counterfactual: the periodic S1 ATK buff as a PASSIVE always-on buff (the nearest wrong
 *  read of a trigger-less cooldown skill). */
const s1Passive = () =>
  withPatchedOverride('dolla', (ov) => {
    const blk = ov.skill1.find((b: any) => b.trigger.kind === 'interval');
    if (!blk) {
      throw new Error('dolla S1 interval block missing — fixture stale');
    }
    blk.trigger = { kind: 'passive' };
  });

// ---- runs (hoisted: each is a full 180s sim) -------------------------------------------------
const base = run();
const noCdr = run({ dolla: cdrLadder(null) });
const flatTier1 = run({ dolla: cdrLadder(1.82) });
const nonCumulative = run({ dolla: cdrLadder(2.6) }); // 3rd tier REPLACES, not adds
const saturated = run({ dolla: cdrLadder(6.62) }); // instant max from entry 1
const flatStats = run({ dolla: flatStatLadder() });
const passiveS1 = run({ dolla: s1Passive() });

// ---- readers ---------------------------------------------------------------------------------
const fbFrames = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart').map((e) => e.frame);
const allCasts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast');
const dollaCasts = (evs: SimEvent[]) =>
  allCasts(evs).filter((c) => c.slug === 'dolla');
const dollaBuffs = (evs: SimEvent[], stat: string, value?: number) =>
  evs.filter(
    (e): e is BuffApply =>
      e.kind === 'buffApply' &&
      e.casterIdx === DOLLA &&
      e.stat === stat &&
      (value === undefined || e.value === value)
  );
const dollaNukes = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is Damage =>
      e.kind === 'damage' && e.slug === 'dolla' && e.bucket === 'burst'
  );

describe('dolla — kit spec', () => {
  describe('D1 — S1 periodic all-ally ATK ▲16.16% / 5s (interval:10, not a passive)', () => {
    const applied = dollaBuffs(base, 'atkPct', 16.16);

    it('is 16.16% to all three allies for exactly 5 sec', () => {
      expect(applied.length, 'S1 ATK buff never applied').toBeGreaterThan(0);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame, 'duration').toBe(5 * FPS);
      }
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
          `frame ${frame} reached ${holders.size} allies`
        ).toBe(TEAM_SIZE);
      }
    });

    it('fires on the 10s grid (first at t=10s), 5s-on/5s-off — not once-permanent', () => {
      const frames = [...new Set(applied.map((b) => b.frame))].sort(
        (a, b) => a - b
      );
      expect(frames[0], 'first fire at t=10s (interval convention)').toBe(
        10 * FPS
      );
      for (let i = 1; i < frames.length; i++) {
        expect(frames[i] - frames[i - 1], 'fires every 10s').toBe(10 * FPS);
      }
      expect(
        frames.length,
        'a 180s fight at 10s cadence from t=10 yields 17 windows'
      ).toBe(17);
    });

    it('DISCRIMINATING: a passive always-on encoding fires once at frame 0 with no expiry', () => {
      const passive = dollaBuffs(passiveS1, 'atkPct', 16.16);
      const passiveFrames = [...new Set(passive.map((b) => b.frame))];
      expect(
        passiveFrames,
        'a passive fires a single battle-start instance'
      ).toEqual([0]);
      expect(passiveFrames.length).toBeLessThan(
        new Set(applied.map((b) => b.frame)).size
      );
    });
  });

  describe('D2 — S2 Full-Burst-entry burst-cooldown ladder (cumulative)', () => {
    it('EXACT: the first activation grants the FIRST TIER ALONE (1.82s)', () => {
      // Her 2nd cast is the fight's one cooldown-bound interval: gap = baseCD − tier1.
      const casts = dollaCasts(base);
      expect(casts.length, 'dolla never bursts twice').toBeGreaterThan(1);
      const gapFrames = casts[1].frame - casts[0].frame;
      const baseCd = data.characters.dolla.burstCooldownSec * FPS;
      const tier1 = Math.round(1.82 * FPS);
      expect(
        gapFrames,
        `first cooldown ran ${(gapFrames / FPS).toFixed(3)}s; kit says ` +
          `${data.characters.dolla.burstCooldownSec}s − 1.82s = ${((baseCd - tier1) / FPS).toFixed(3)}s ` +
          `(a cumulative-on-2nd 4.02s, flat-2.6, or flat-6.62 model would be shorter)`
      ).toBe(baseCd - tier1);
    });

    it('ESCALATES past the first tier — later Full Bursts arrive earlier than a flat-1.82 ladder', () => {
      const shipFb = fbFrames(base);
      const flatFb = fbFrames(flatTier1);
      const k = Math.min(shipFb.length, flatFb.length);
      expect(k, 'need ≥3 Full Bursts').toBeGreaterThanOrEqual(3);
      expect(
        shipFb.slice(2, k).some((f, i) => f < flatFb[i + 2]),
        'cumulative tiers must pull at least one later Full Burst earlier than flat tier-1'
      ).toBe(true);
    });

    it('DISCRIMINATING: tiers ADD UP — from the 3rd FB on, beats a non-cumulative flat-2.6 ladder', () => {
      // "Each subsequent effect triggers all effects before it": 3rd+ entry grants 6.62s, NOT the
      // third tier replacing the first two (2.6s). The cumulative ladder overtakes the flat one.
      const shipFb = fbFrames(base);
      const ncFb = fbFrames(nonCumulative);
      const k = Math.min(shipFb.length, ncFb.length);
      expect(k, 'need ≥3 Full Bursts').toBeGreaterThanOrEqual(3);
      expect(
        shipFb.slice(2, k).every((f, i) => f <= ncFb[i + 2]),
        'cumulative 6.62s must never lag the flat-2.6 reading from the 3rd FB on'
      ).toBe(true);
      expect(
        shipFb.slice(2, k).some((f, i) => f < ncFb[i + 2]),
        'cumulative 6.62s > flat 2.6s, so some later Full Burst must arrive strictly earlier'
      ).toBe(true);
    });

    it('RAMPS — a saturated flat-6.62 ladder reaches every FB no later than the real ramp', () => {
      const rampFb = fbFrames(base);
      const satFb = fbFrames(saturated);
      const k = Math.min(rampFb.length, satFb.length);
      expect(k, 'no Full Bursts to compare').toBeGreaterThan(2);
      expect(
        satFb.slice(0, k).every((f, i) => f <= rampFb[i]),
        'a saturated ladder must never reach a Full Burst LATER than the real ramp'
      ).toBe(true);
      expect(
        satFb.slice(0, k).some((f, i) => f < rampFb[i]),
        'the real ramp delivers less early CDR, so some early Full Burst must arrive later than under instant saturation'
      ).toBe(true);
    });

    it('has NO effect when removed — Full Bursts do not arrive earlier than shipped', () => {
      // Sanity anchor: the CDR is live, not inert. Removing it pushes Full Bursts later (or equal).
      const shipFb = fbFrames(base);
      const noFb = fbFrames(noCdr);
      const k = Math.min(shipFb.length, noFb.length);
      expect(k).toBeGreaterThan(2);
      expect(
        noFb.slice(0, k).every((f, i) => f >= shipFb[i]),
        'removing the CDR must never make a Full Burst arrive EARLIER'
      ).toBe(true);
    });
  });

  describe('D3 — S2 burst-cast ladder: ATK → +Crit Rate → +Crit Damage, 5s, all allies', () => {
    const STEPS: Array<[string, number]> = [
      ['atkPct', 7.72],
      ['critRatePct', 4.21],
      ['critDamagePct', 13.22],
    ];

    it('unlocks one more step per cast, cumulatively, and holds all three from the 3rd on', () => {
      const castFrames = dollaCasts(base).map((c) => c.frame);
      expect(castFrames.length, 'need ≥3 dolla casts').toBeGreaterThanOrEqual(
        3
      );
      for (const [i, frame] of castFrames.entries()) {
        const live = STEPS.filter(([stat, value]) =>
          dollaBuffs(base, stat, value).some((b) => b.frame === frame)
        ).map(([stat]) => stat);
        const expected = STEPS.slice(0, Math.min(i + 1, 3)).map(
          ([stat]) => stat
        );
        expect(live, `cast #${i + 1} at ${(frame / FPS).toFixed(2)}s`).toEqual(
          expected
        );
      }
    });

    it("fires on HER OWN casts only, never on an ally's burst", () => {
      const applyFrames = new Set(
        dollaBuffs(base, 'atkPct', 7.72).map((b) => b.frame)
      );
      expect([...applyFrames].sort((a, b) => a - b)).toEqual(
        dollaCasts(base).map((c) => c.frame)
      );
      expect(
        applyFrames.size,
        'the whole team bursts far more often than dolla alone'
      ).toBeLessThan(allCasts(base).length);
    });

    it('reaches all three allies for exactly 5 sec', () => {
      for (const [stat, value] of STEPS) {
        const applied = dollaBuffs(base, stat, value);
        expect(applied.length, `${stat} never applied`).toBeGreaterThan(0);
        for (const b of applied) {
          expect(b.expiresFrame! - b.frame, `${stat} duration`).toBe(5 * FPS);
        }
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
            `${stat} at frame ${frame} reached ${holders.size}`
          ).toBe(TEAM_SIZE);
        }
      }
    });

    it('DISCRIMINATING: a flat (non-escalating) block grants all three on cast #1', () => {
      // Shipped cast #1 carries ONLY atkPct; the flat counterfactual carries all three — proving
      // the per-cast escalation assertion is one the flat model provably fails.
      const firstCast = dollaCasts(base)[0].frame;
      const shippedLive = STEPS.filter(([stat, value]) =>
        dollaBuffs(base, stat, value).some((b) => b.frame === firstCast)
      ).map(([stat]) => stat);
      const flatLive = STEPS.filter(([stat, value]) =>
        dollaBuffs(flatStats, stat, value).some((b) => b.frame === firstCast)
      ).map(([stat]) => stat);
      expect(shippedLive).toEqual(['atkPct']);
      expect(flatLive).toEqual(['atkPct', 'critRatePct', 'critDamagePct']);
    });
  });

  describe('D4 — burst nuke: 734.69% of final ATK, cast BEFORE the Full Burst window', () => {
    const nukes = dollaNukes(base);

    it('fires once per burst cast at the kit magnitude, in the burst bucket', () => {
      expect(nukes.length).toBe(dollaCasts(base).length);
      expect(nukes.length).toBeGreaterThan(0);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([734.69]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('never takes the +50% Full Burst major (the cast lands before FB opens) and is crit-eligible', () => {
      expect(
        nukes.filter((d) => d.fbMajorApplied).map((d) => d.sec),
        'burst-cast damage must precede the FB window'
      ).toEqual([]);
      expect(nukes.every((d) => d.critEligible)).toBe(true);
    });
  });
});
