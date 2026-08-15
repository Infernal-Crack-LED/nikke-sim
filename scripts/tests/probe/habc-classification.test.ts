// ============================================================================
// Replay pin for the H-A/H-B/H-C classification artifact
// (docs/probe-data/fill-trace-habc-classification.json — step 2 of
// docs/handoffs/2026-08-14-burst-gen-next-session.md, pre-op packet
// docs/handoffs/2026-08-15-classification-preop-packet.md).
//
// Every number in the artifact is recomputed here from committed inputs: the real traces replay
// from the committed fill-trace bundles plus the recorded `--reflag` offCurve additions (asserted
// pure-additive), the sim side from the embedded post-#119 credit schedules, and the C4 noise
// floor from the committed step-1a opening artifacts. Nothing in the artifact is hand-derived.
// ============================================================================
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CLS_BASE_BANDS,
  classifyArm,
  quietNoiseCheck,
  simCeiling,
  simComponents,
  widenBands,
  type ClsArm,
  type DiagRead,
  type FillTrace,
  type SimSchedule,
  type TempoFixture,
} from '../../probe/fill-trace-compare.js';

interface ArtifactArm extends ClsArm {
  fixture: string;
}

interface Artifact {
  params: {
    eMinFinal: number;
    bandsFinal: Record<string, unknown>;
  };
  controls: {
    c3BinningRobustness: Record<
      string,
      {
        oComponentMaxAlignedShift: number;
        sComponentMaxAlignedShift: number;
        widened: boolean;
        finalBands: Record<string, unknown>;
      }
    >;
    c4NoiseFloor: ReturnType<typeof quietNoiseCheck>;
  };
  schedules: Record<string, SimSchedule>;
  reflag: Record<
    string,
    { bundle?: string; newOffCurveReadIndices?: number[]; note?: string }
  >;
  arms: Record<string, ArtifactArm>;
  miscB3sRealOnlyDescriptives: ArtifactArm & { fence: string };
}

const artifact = JSON.parse(
  readFileSync('docs/probe-data/fill-trace-habc-classification.json', 'utf8')
) as Artifact;

function reflaggedTrace(key: string): FillTrace {
  const spec = artifact.reflag[key];
  const bundle = JSON.parse(readFileSync(spec.bundle!, 'utf8')) as {
    trace: FillTrace;
  };
  const trace = bundle.trace;
  for (const i of spec.newOffCurveReadIndices!) {
    // the recorded diff must be pure-additive: --reflag only ever ADDS offCurve
    expect(trace.reads[i].flags).not.toContain('offCurve');
    trace.reads[i].flags.push('offCurve');
  }
  return trace;
}

const ARMS: { name: string; reflagKey: string }[] = [
  { name: 'iron sweep (run G)', reflagKey: 'iron' },
  { name: 'T5 wind-weak', reflagKey: 't5' },
];

describe('the classification replays from committed inputs', () => {
  for (const { name, reflagKey } of ARMS) {
    it(`${name}: classifyArm reproduces the committed arm result`, () => {
      const stored = artifact.arms[name];
      const sched = artifact.schedules[name];
      const fx = JSON.parse(
        readFileSync(stored.fixture, 'utf8')
      ) as TempoFixture;
      const trace = reflaggedTrace(reflagKey);
      const recomputed = classifyArm(fx, trace, sched, {
        eMin: artifact.params.eMinFinal,
        bands: widenBands(CLS_BASE_BANDS, 0, 0),
        simComp: simComponents(sched),
        ceiling: simCeiling(sched),
      });
      const { fixture: _fixture, ...expected } = stored;
      expect(JSON.parse(JSON.stringify(recomputed))).toEqual(expected);
    });

    it(`${name}: C3 aligned-perturbation shifts replay and stay under the widening limit`, () => {
      const sched = artifact.schedules[name];
      const base = simComponents(sched);
      const variants = [
        simComponents(sched, { jitterFrames: 1 }),
        simComponents(sched, { jitterFrames: -1 }),
        simComponents(sched, { phaseSec: 1 / 60 }),
      ];
      const oShift = Math.max(
        ...variants.map(
          (v) =>
            Math.abs(v.creditBinFraction - base.creditBinFraction) /
            base.creditBinFraction
        )
      );
      const sShift = Math.max(
        ...variants.map(
          (v) =>
            Math.abs(v.binAmountQuantiles.p50 - base.binAmountQuantiles.p50) /
            base.binAmountQuantiles.p50
        )
      );
      const stored = artifact.controls.c3BinningRobustness[name];
      expect(Number(oShift.toFixed(4))).toBe(stored.oComponentMaxAlignedShift);
      expect(Number(sShift.toFixed(4))).toBe(stored.sComponentMaxAlignedShift);
      expect(stored.widened).toBe(false);
      expect(stored.finalBands).toEqual(
        JSON.parse(JSON.stringify(widenBands(CLS_BASE_BANDS, oShift, sShift)))
      );
    });
  }

  it('misc B3s (run I): the real-only descriptives replay, with no sim arm by construction', () => {
    const stored = artifact.miscB3sRealOnlyDescriptives;
    const fx = JSON.parse(readFileSync(stored.fixture, 'utf8')) as TempoFixture;
    const trace = reflaggedTrace('misc');
    const recomputed = classifyArm(fx, trace, null, {
      eMin: artifact.params.eMinFinal,
    });
    expect(recomputed.pooled).toBeNull();
    expect(recomputed.basis).toBeNull();
    expect(recomputed.branch).toBeNull();
    const { fixture: _fixture, fence: _fence, ...expected } = stored;
    expect(JSON.parse(JSON.stringify(recomputed))).toEqual(expected);
  });

  it('C4: the quiet-span noise floor replays from the committed opening artifacts', () => {
    const sources = [
      'docs/probe-data/fill-trace-opening-u8-g-iron-sweep.json',
      'docs/probe-data/fill-trace-opening-probe-u7-t5-wind-weak.json',
      'docs/probe-data/fill-trace-opening-u8-i-misc-b3s.json',
    ].map((p) => {
      const doc = JSON.parse(readFileSync(p, 'utf8')) as {
        result: { comp: string };
        diagHold: { window: number; reads: DiagRead[] }[];
      };
      return { name: doc.result.comp, diagHold: doc.diagHold };
    });
    const recomputed = quietNoiseCheck(sources, 1.5);
    expect(JSON.parse(JSON.stringify(recomputed))).toEqual(
      artifact.controls.c4NoiseFloor
    );
    // the pre-committed escalation rule: pooled rate < 5% keeps eMin at 1.5
    expect(recomputed.pooled.falseEventBinRate).toBeLessThan(0.05);
    expect(recomputed.eMinOut).toBe(artifact.params.eMinFinal);
  });

  it('the embedded schedules carry passing CreditScheduleChecks (control C2)', () => {
    for (const { name } of ARMS) {
      const sched = artifact.schedules[name];
      expect(sched.checks.endpointOk).toBe(true);
      expect(sched.checks.dbgGauge.ok).toBe(true);
      expect(sched.checks.truncatedOk).toBe(true);
      expect(sched.unreconstructed).toEqual([]);
    }
  });

  it('the pre-committed section-D branches: H-C on iron sweep, MIXED/INCONCLUSIVE on T5', () => {
    expect(artifact.arms['iron sweep (run G)'].branch?.branch).toBe('H-C');
    expect(artifact.arms['T5 wind-weak'].branch?.branch).toBe(
      'MIXED/INCONCLUSIVE'
    );
  });
});
