// ============================================================================
// Replay pin for the 2026-08-17 third classification arm — N3 scarlet/liberalio iron
// (docs/probe-data/n3-third-arm-classification-2026-08-17.json; pre-op packet
// docs/handoffs/2026-08-17-n3-third-arm-preop-packet.md).
//
// `docs/probes/` is gitignored, so without this the run could never be re-executed. Everything
// below replays from COMMITTED inputs only — the tempo fixture, the self-contained trace bundle
// and the credit schedule — and recomputes each published number rather than quoting it.
//
// MEASUREMENT ONLY. This pins what the instrument produced; it carries no claim about the game.
// The two diagnostics added for that run (`closure-diag`, `noise-correct`) are additionally
// scored against the ALREADY-COMMITTED artifacts they were built to generalise, so they
// self-validate instead of only agreeing with their own output:
//   * closureDiagnostic reproduces iron sweep (run G)'s published closureResidual 0.2579;
//   * noiseCorrectedRate reproduces the whole 2026-08-16 noise-corrected-ceiling artifact.
// ============================================================================
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { buildCycleTable } from '../../probe/cycle-table.js';
import {
  CLS_BASE_BANDS,
  classifyArm,
  closureDiagnostic,
  fbDuration,
  marDiagnostic,
  noiseCorrectedRate,
  simCeiling,
  simComponents,
  widenBands,
  type ClsArm,
  type FillTrace,
  type SimSchedule,
  type TempoFixture,
} from '../../probe/fill-trace-compare.js';

const ARTIFACT = 'docs/probe-data/n3-third-arm-classification-2026-08-17.json';
const FIXTURE = 'docs/probe-data/tempo-cycle-n3-scarlet-liberalio-iron.json';
const BUNDLE = 'docs/probe-data/fill-trace-n3-scarlet-liberalio-iron.json';
const SCHEDULE =
  'docs/probe-data/credit-schedule-n3-scarlet-liberalio-iron.json';
const HABC = 'docs/probe-data/fill-trace-habc-classification.json';
const IRON_FIXTURE = 'docs/probe-data/tempo-cycle-u8-g-iron-sweep.json';
const NOISE_2026_08_16 =
  'docs/probe-data/noise-corrected-ceiling-iron-sweep-2026-08-16.json';
const COMP = 'N3 scarlet/liberalio iron';
const IRON = 'iron sweep (run G)';

const read = <T>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T;

const artifact = read<{
  arm: ClsArm;
  controls: Record<string, Record<string, unknown>>;
  closureDiagnostic_E3: Record<
    string,
    { closureResidual?: number } & Record<string, unknown>
  >;
  noiseCorrection_C6: Record<string, Record<string, unknown>>;
  marDiagnostic_C7: Record<string, { pooled: Record<string, number> }>;
}>(ARTIFACT);

const fixture = read<TempoFixture>(FIXTURE);
const bundle = read<{ trace: FillTrace }>(BUNDLE);
const rawSched = read<SimSchedule | SimSchedule[]>(SCHEDULE);
const sched = Array.isArray(rawSched) ? rawSched[0] : rawSched;

describe('N3 third arm — the classification replays from committed inputs', () => {
  it('the credit schedule still names the comp the run measured', () => {
    expect(sched.comp).toBe(COMP);
    expect(sched.slugs).toEqual([
      'rouge',
      'trina',
      'scarlet-black-shadow',
      'liberalio',
      'soda-twinkling-bunny',
    ]);
    expect(sched.focusSlug).toBe('scarlet-black-shadow');
  });

  it('C5: the three CreditScheduleChecks pass with nothing unreconstructed', () => {
    expect(sched.checks.endpointOk).toBe(true);
    expect(sched.checks.dbgGauge.ok).toBe(true);
    expect(sched.checks.truncatedOk).toBe(true);
    expect(sched.unreconstructed).toEqual([]);
  });

  it('C4: simCeiling recomputes the 5.1301/s non-vacuous ceiling', () => {
    expect(simCeiling(sched).ceilingBinsPerSec).toBeCloseTo(5.1301, 4);
  });

  it('C3: the aligned-perturbation shifts replay and stay under the widening limit', () => {
    const base = simComponents(sched);
    const shift = (v: ReturnType<typeof simComponents>, f: 'frac' | 'p50') =>
      f === 'frac'
        ? Math.abs(v.creditBinFraction - base.creditBinFraction) /
          base.creditBinFraction
        : Math.abs(v.binAmountQuantiles.p50 - base.binAmountQuantiles.p50) /
          base.binAmountQuantiles.p50;
    const aligned = [
      simComponents(sched, { jitterFrames: 1 }),
      simComponents(sched, { jitterFrames: -1 }),
      simComponents(sched, { phaseSec: 1 / 60 }),
    ];
    const o = Math.max(...aligned.map((v) => shift(v, 'frac')));
    const s = Math.max(...aligned.map((v) => shift(v, 'p50')));
    expect(Number(o.toFixed(4))).toBe(0.0303);
    expect(Number(s.toFixed(4))).toBe(0);
    // C8: the shifts the operator actually hand-carried are the ones --sim-only reported,
    // and at these magnitudes they leave the base bands untouched.
    expect(artifact.controls.C8_manualStepWitness.oShiftPassed).toBe(0.0303);
    expect(artifact.controls.C8_manualStepWitness.sShiftPassed).toBe(0);
    expect(artifact.controls.C8_manualStepWitness.eMinUsed).toBe(1.5);
    expect(widenBands(CLS_BASE_BANDS, o, s)).toEqual(CLS_BASE_BANDS);
  });

  it('classifyArm reproduces the committed arm result byte-for-byte', () => {
    const recomputed = classifyArm(fixture, bundle.trace, sched, {
      eMin: 1.5,
      bands: widenBands(CLS_BASE_BANDS, 0.0303, 0),
      simComp: simComponents(sched),
      ceiling: simCeiling(sched),
    });
    expect(JSON.parse(JSON.stringify(recomputed))).toEqual(artifact.arm);
  });

  it('the arm is H-C over a PASSING closure clause, on 7 usable windows', () => {
    expect(artifact.arm.basis?.pass).toBe(true);
    expect(artifact.arm.pooled?.usableWindows).toBe(7);
    expect(artifact.arm.pooled?.closureResidual).toBeLessThanOrEqual(0.25);
    expect(artifact.arm.branch?.branch).toBe('H-C');
    expect(artifact.arm.branch?.realEventBinsPerSec).toBe(6.7208);
    expect(artifact.arm.branch?.ceilingThreshold).toBe(5.8996);
    expect(artifact.arm.branch?.hcShareOfRate).toBe(0.2367);
  });
});

describe('N3 third arm — C6 noise correction (the 2026-08-16 statistic, replayed)', () => {
  it('reproduces the committed 2026-08-16 iron artifact exactly (instrument self-validation)', () => {
    const iron = read<{
      arms: Record<string, ClsArm>;
    }>(HABC).arms[IRON];
    const published = read<{
      inputs: { E: number; Q: number; T: number };
      results: Record<string, { correctedRate: number }>;
      indifferencePoints: { reStampCutoff: number; shelveCutoff: number };
    }>(NOISE_2026_08_16);
    const got = noiseCorrectedRate({
      comp: IRON,
      pooled: iron.pooled!,
      ceilingBinsPerSec: iron.ceiling!.ceilingBinsPerSec,
      falseRates: { 'corrected@0.55%': 0.0055, 'corrected@0.45%': 0.0045 },
    });
    expect(got.inputs.eventBins).toBe(published.inputs.E);
    expect(got.inputs.quietBins).toBe(published.inputs.Q);
    expect(got.inputs.cleanBinTimeSec).toBeCloseTo(published.inputs.T, 3);
    expect(got.corrected['corrected@0.55%'].rate).toBeCloseTo(
      published.results.primary.correctedRate,
      3
    );
    expect(got.corrected['corrected@0.45%'].rate).toBeCloseTo(
      published.results.pooled.correctedRate,
      3
    );
    expect(got.indifferencePoints.thresholdCutoff).toBeCloseTo(
      published.indifferencePoints.reStampCutoff,
      5
    );
    expect(got.indifferencePoints.ceilingCutoff).toBeCloseTo(
      published.indifferencePoints.shelveCutoff,
      5
    );
  });

  it('N3: the corrected rate clears the threshold at both falseRates', () => {
    const got = noiseCorrectedRate({
      comp: COMP,
      pooled: artifact.arm.pooled!,
      ceilingBinsPerSec: artifact.arm.ceiling!.ceilingBinsPerSec,
      falseRates: { 'corrected@0.55%': 0.0055, 'corrected@0.45%': 0.0045 },
    });
    expect(got.corrected['corrected@0.55%'].rate).toBeCloseTo(6.5927, 4);
    expect(got.corrected['corrected@0.45%'].rate).toBeCloseTo(6.616, 4);
    expect(got.corrected['corrected@0.55%'].aboveThreshold).toBe(true);
    // the standing MAR caveat, carried with a number: under the full-window denominator the
    // excess disappears on this arm too.
    expect(got.marAlternativeDenominator.aboveCeiling).toBe(false);
    expect(got.marAlternativeDenominator.rawRate).toBeCloseTo(4.5641, 4);
  });
});

describe('N3 third arm — E.3 closure diagnostic', () => {
  const iron = read<{ arms: Record<string, ClsArm> }>(HABC).arms[IRON];

  it('reproduces each arm’s published as-specified closure residual', () => {
    expect(closureDiagnostic(iron).reproduces.matches).toBe(true);
    expect(closureDiagnostic(iron).asSpecified.closureResidual).toBe(0.2579);
    expect(closureDiagnostic(artifact.arm).reproduces.matches).toBe(true);
    expect(closureDiagnostic(artifact.arm).asSpecified.closureResidual).toBe(
      0.0533
    );
  });

  it('variant A (rho held) drops iron below the 0.25 threshold; N3 was already below it', () => {
    const i = closureDiagnostic(iron);
    expect(i.variantA.closureResidual).toBeCloseTo(0.0812, 4);
    expect(i.variantA.belowThreshold).toBe(true);
    const n = closureDiagnostic(artifact.arm);
    expect(n.asSpecified.belowThreshold).toBe(true);
    expect(n.variantA.belowThreshold).toBe(true);
  });

  it('variant B is IDENTICALLY the as-specified residual: it is scale-invariant in sumRealDelta', () => {
    // oEff and rho are both proportional to sumRealDelta, so |oEff*S - rho|/rho cannot move when
    // sumRealDelta is rescaled. Pinned so a future edit to the closure formula that breaks this
    // invariance is caught rather than silently changing what variant B means.
    for (const a of [iron, artifact.arm]) {
      const d = closureDiagnostic(a);
      expect(d.variantB.closureResidual).toBe(d.asSpecified.closureResidual);
      expect(d.variantB.sumRealDelta).toBeLessThan(d.asSpecified.sumRealDelta);
    }
  });
});

describe('N3 third arm — C7 MAR diagnostic', () => {
  it('re-derives the bridged census independently and matches classifyArm on every window', () => {
    const got = marDiagnostic(fixture, bundle.trace, sched, {
      eMin: 1.5,
      simComp: simComponents(sched),
      ceiling: simCeiling(sched),
    });
    expect(got.selfCheck.allWindowsReproduce).toBe(true);
    expect(got.pooled.bridgedCount).toBe(10);
    expect(got.pooled.bridgedMass).toBeCloseTo(65, 2);
    expect(got.pooled.insideOverOutsideRateRatio).toBeCloseTo(0.7571, 4);
  });
});

describe('N3 third arm — C2/C3 tempo fixture', () => {
  const rows = buildCycleTable({
    windows: fixture.fullWindows,
    chains: fixture.burstChains,
    frames: (
      fixture as TempoFixture & { frameT: number[]; frameFill: number[] }
    ).frameT.map((t, i) => ({
      videoT: t,
      fill: (fixture as TempoFixture & { frameFill: number[] }).frameFill[i],
    })),
  });

  it('C3: the fixture carries the measured 10 Full Bursts', () => {
    expect(fixture.expected?.fullBursts).toBe(10);
    expect(fixture.fullWindows).toHaveLength(10);
  });

  it('guard 3B is CAP-SATURATED on this arm, so its corrected durations are unusable', () => {
    // DEFAULTS.searchCapSec = 11s cannot host a ~15s Full Burst. Pinned as a KNOWN LIMITATION so
    // the artifact's C2 reasoning stays checkable; raising the cap re-admits stitched tails on the
    // 10s calibration fixtures and was rejected.
    const capped = rows.filter((r) => r.correctedDuration === 11).length;
    expect(capped).toBe(9);
    expect(rows.filter((r) => r.tailStitched)).toHaveLength(9);
  });

  it('C2: every cycle’s [rendered, barPaint] bracket contains 15.0s and excludes 10.0s', () => {
    const res = fbDuration({
      fx: fixture,
      fixturePath: FIXTURE,
      arm: artifact.arm,
      calib: {
        comp: IRON,
        fx: read<TempoFixture>(IRON_FIXTURE),
        arm: read<{ arms: Record<string, ClsArm> }>(HABC).arms[IRON],
        knownFbSec: 10,
      },
      expectSec: 15,
      tolSec: 0.5,
    });
    expect(res.test!.cyclesWhereBracketExcludesExpect).toEqual([]);
    expect(res.test!.perCycleBracketContainsExpect.every(Boolean)).toBe(true);
    for (const c of res.cycles) {
      if (c.correctedPaint === null) {
        continue;
      }
      expect(c.correctedRendered).toBeGreaterThan(10);
    }
    // the calibration constants the artifact's C2 readings rest on
    expect(res.calibration!.renderDeficitSec).toBeCloseTo(1.31, 2);
    expect(res.calibration!.paintExcessSec).toBeCloseTo(0.3166, 4);
    expect(res.estimates!.fromPaint).toBeCloseTo(14.917, 3);
    expect(res.estimates!.fromRendered).toBeCloseTo(14.21, 2);
  });
});
