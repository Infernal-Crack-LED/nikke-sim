// ============================================================================
// Replay pin for the anis-star (Anis: Star) solo per-pull gauge MAGNITUDE artifact
// (docs/probe-data/anis-star-solo-magnitude-2026-08-17.json — pre-op packet
// docs/handoffs/2026-08-17-anis-star-solo-magnitude-preop-packet.md).
//
// The whole artifact is recomputed here from its two committed inputs (the solo #2 and A3 gauge
// traces) and compared field-for-field, so the instrument self-validates: if the estimators, the
// classification rule or the decision-rule wiring drift, this test goes red against the committed
// numbers rather than silently re-issuing different ones.
//
// The artifact is MEASUREMENT ONLY. It carries no verdict, and neither does this pin — the
// decision-rule block records WHICH CLAUSE the pre-committed rule selects, which is arithmetic.
// ============================================================================
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  COLUMN_PP,
  DEPARTURE_RADIUS_PRIMARY_PP,
  DEPARTURE_RADIUS_SENSITIVITY_PP,
  EVENT_MIN_PP,
  H_MODEL_PP,
  QUANT_SD_PP,
  SETTLE_FRAMES,
  Z95,
  classifyDeparture,
  e1,
  e1Direction,
  median,
  poolE2,
  runGaugeMagnitude,
} from '../../probe/gauge-magnitude.js';

const ARTIFACT = 'docs/probe-data/anis-star-solo-magnitude-2026-08-17.json';

const committed = JSON.parse(readFileSync(ARTIFACT, 'utf8')) as any;

describe('gauge-magnitude replays the committed artifact', () => {
  const fresh = runGaugeMagnitude() as any;

  it('reproduces the artifact byte-for-byte from its committed inputs', () => {
    expect(JSON.parse(JSON.stringify(fresh))).toEqual(committed);
  });

  it('pins the constants the packet fixed before the run', () => {
    expect(DEPARTURE_RADIUS_PRIMARY_PP).toBe(2.175); // [NR1] 3 render columns
    expect(DEPARTURE_RADIUS_SENSITIVITY_PP).toBe(1.45); // 2 render columns
    expect(SETTLE_FRAMES).toBe(6); // [R4] plateau-read discipline
    expect(EVENT_MIN_PP).toBe(1.41); // solo2 result.params.bindingThreshold
    expect(H_MODEL_PP).toBe(10.388);
    expect(Z95).toBe(1.96);
    expect(COLUMN_PP).toBeCloseTo(100 / 138, 10);
    expect(QUANT_SD_PP).toBeCloseTo(0.725 / Math.sqrt(12), 10);
  });
});

describe('the pinned departure rule behaves as written', () => {
  it('is symmetric, so it catches downward departures too', () => {
    const up = classifyDeparture(
      'up',
      1,
      11.6 + 3,
      11.6,
      DEPARTURE_RADIUS_PRIMARY_PP
    );
    const down = classifyDeparture(
      'down',
      1,
      11.6 - 3,
      11.6,
      DEPARTURE_RADIUS_PRIMARY_PP
    );
    expect(up.departing).toBe(true);
    expect(down.departing).toBe(true);
  });

  it('an interval departs only when its WHOLE range is outside the keep-band', () => {
    const whole = classifyDeparture(
      'w',
      null,
      [8.0, 8.7],
      11.6,
      DEPARTURE_RADIUS_PRIMARY_PP
    );
    expect(whole.departing).toBe(true);
    expect(whole.ambiguous).toBe(false);
    const straddling = classifyDeparture(
      's',
      null,
      [9.0, 12.0],
      11.6,
      DEPARTURE_RADIUS_PRIMARY_PP
    );
    expect(straddling.departing).toBe(false);
    expect(straddling.ambiguous).toBe(true);
  });

  it('[NR1] classification membership is identical under both radii, on both recordings', () => {
    const c = committed.departureClassification;
    expect(c.membershipIdenticalAcrossRadii).toBe(true);
    expect(c.a3MembershipIdenticalAcrossRadii).toBe(true);
    expect(c.departingPrimary).toEqual([
      'W2c8@36.83',
      'W4c2@73.90',
      'W4c3@74.87',
      'W4p7(smeared)',
    ]);
    expect(c.a3DepartingPrimary).toEqual([]);
  });

  it('median() is the plain sample median', () => {
    expect(median([10.9, 11.6, 11.6])).toBe(11.6);
    expect(median([10.9, 11.6])).toBeCloseTo(11.25, 10);
  });
});

describe('E1 arithmetic', () => {
  it('reproduces the A3 artifact’s own committed count-to-fill bound', () => {
    // anis-star-solo-a3-gauge-reread.json countingCrossCheck.arithmetic.openerAsRendered:
    // 9 pulls from a 2.2 baseline with a rendered +9.4 opener => steady P in [~11.05, ~12.63)
    const r = e1({
      window: 'A3',
      K: 9,
      kCue: 'game-driven',
      kCueEvidence: 'fixture',
      postOpenerLevel: 11.6,
      anomalies: [],
      montageVerified: true,
    });
    expect(r.m).toBe(8);
    expect(r.interval.lo).toBeCloseTo(11.05, 6);
    expect(r.interval.hi).toBeCloseTo(12.628571, 5);
    expect(r.excludesHModel).toBe(true);
  });

  it('propagates a smeared credit as an interval ([NR4])', () => {
    const point = e1({
      window: 'X',
      K: 9,
      kCue: 'game-driven',
      kCueEvidence: 'fixture',
      postOpenerLevel: 9.4,
      anomalies: [16.0, 15.2, 8.35],
      montageVerified: true,
    });
    const interval = e1({
      window: 'X',
      K: 9,
      kCue: 'game-driven',
      kCueEvidence: 'fixture',
      postOpenerLevel: 9.4,
      anomalies: [16.0, 15.2, [8.0, 8.7]],
      montageVerified: true,
    });
    expect(interval.interval.lo).toBeLessThan(point.interval.lo);
    expect(interval.interval.hi).toBeGreaterThan(point.interval.hi);
  });

  it('[R1] direction is read off the windows that actually exclude 10.388', () => {
    expect(
      e1Direction([
        { lo: 11.05, hi: 12.6 },
        { lo: 10.14, hi: 12.85 },
      ])
    ).toBe('above');
    expect(e1Direction([{ lo: 9.0, hi: 10.0 }])).toBe('below');
    expect(
      e1Direction([
        { lo: 9.0, hi: 10.0 },
        { lo: 11.0, hi: 12.0 },
      ])
    ).toBe('mixed');
    expect(e1Direction([{ lo: 10.0, hi: 11.0 }])).toBe('none');
  });
});

describe('E2 pooling and its SE components', () => {
  it('telescoping makes quantization enter twice per RUN, not twice per pull', () => {
    const run = {
      window: 'X',
      label: 'x',
      pulls: 6,
      levelBefore: 6.5,
      levelAfter: 74.6,
      tBefore: 0,
      tAfter: 8,
      beforeFrames: 11,
      afterFrames: 14,
      conditionalStart: false,
      pHat: (74.6 - 6.5) / 6,
      seQuant: (Math.SQRT2 * QUANT_SD_PP) / 6,
      binsInRun: 0,
      meanHeight: 40.55,
      creditInstants: [],
    };
    expect(run.seQuant).toBeCloseTo(0.0493, 4);
    const pooled = poolE2([run], 0);
    expect(pooled.sePooled).toBeCloseTo(0.0493, 4);
  });

  it('[R4] SE_pooled takes the MAX of the three components and names the driver', () => {
    const p = committed.E2.pooled.solo2Lenient;
    expect(p.sePooled).toBe(
      Math.max(p.seQuantPooled, p.empiricalScatter, p.questionBInflation)
    );
    expect(p.seDriver).toBe('question-B-inflation');
    // the stored fields are rounded to 6 dp; the CI is computed from the unrounded internals
    expect(p.ci95.lo).toBeCloseTo(p.pooled - Z95 * p.sePooled, 5);
    expect(p.ci95.hi).toBeCloseTo(p.pooled + Z95 * p.sePooled, 5);
  });

  it('every reported pool excludes the shipped 10.388 in the same direction', () => {
    for (const key of [
      'solo2Lenient',
      'solo2Strict',
      'a3Lenient',
      'a3Strict',
    ]) {
      const p = committed.E2.pooled[key];
      expect(p.excludesHModel).toBe(true);
      expect(p.pooled).toBeGreaterThan(H_MODEL_PP);
    }
  });
});

describe('controls', () => {
  it('(a) every run used carries a matching montage ammo-decrement count', () => {
    expect(committed.controls.a_traceEventsVsMontage.allMatch).toBe(true);
  });

  it('(b) no burst-DoT window overlaps any measured run', () => {
    const b = committed.controls.b_burstDotDisjoint;
    expect(b.allClean).toBe(true);
    // cast instants are re-derived from the trace's own `full` transitions, not taken from the packet
    expect(b.fullInstantsFromTrace).toEqual([13.6, 37.83, 61.07, 83.2]);
  });

  it('(c) the Question-B false-event rate is CARRIED, not re-derived', () => {
    const c = committed.controls.c_questionBFalseEventRate;
    expect(c.falseEventBins).toBe(0);
    expect(c.quietBins).toBe(492);
    expect(c.wilsonUpper95OneSidedSolo2).toBe(0.0055);
  });
});

describe('decision rule (arithmetic only — no verdict)', () => {
  it('records the clause the rule as written selects, and every clause’s own condition', () => {
    const d =
      committed.decisionRuleApplication.clauseSelectedByTheRuleAsWritten;
    expect(d.clause).toBe(1);
    expect(d.allClauseConditions.clause2).toBe(false);
    expect(d.allClauseConditions.clause3).toBe(false);
  });

  it('discloses that clause 2 was UNREACHABLE at the achieved CI width', () => {
    const r = committed.decisionRuleApplication.reachability;
    expect(r.clause2Reachable).toBe(false);
    expect(r.achievedHalfWidthPp).toBeLessThan(r.neededHalfWidthPp);
  });

  it('discloses that clause 1(ii) hangs on W3 by ~0.001 of a render column', () => {
    const f = committed.decisionRuleApplication.fragility;
    expect(f.clause1iiRestsOn).toEqual(['W2', 'W3']);
    expect(
      Math.abs(f.w3OneColumnSensitivity.asRendered.interval.lo - H_MODEL_PP)
    ).toBeLessThan(0.01);
    expect(f.w3OneColumnSensitivity.oneColumnHigher.excludes).toBe(false);
    expect(f.ifW3DidNotExclude.clause).toBe(4);
  });
});

describe('the declared candidate is firewalled', () => {
  it('appears only in the post-verdict descriptive block, never in an estimator', () => {
    const src = readFileSync('scripts/probe/gauge-magnitude.ts', 'utf8');
    const firstUse = src.indexOf('3.71');
    const candidateBlock = src.indexOf('candidate check — STRICTLY LAST');
    expect(firstUse).toBeGreaterThan(candidateBlock);
    expect(committed.candidateCheck.declaredCandidatePp).toBe(3.71);
  });
});
