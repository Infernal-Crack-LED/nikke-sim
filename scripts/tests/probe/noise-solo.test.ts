// ============================================================================
// Replay pin for the C4 same-regime noise-floor re-run artifact
// (docs/probe-data/c4-noise-floor-rerun-2026-08-16.json — pre-op packet
// docs/handoffs/2026-08-16-c4-noise-floor-preop-packet.md §D).
//
// Every number in the artifact's `result` is recomputed here from committed inputs: the
// primary-basis quiet statistics from the committed anis-star (Anis: Star) solo series
// (docs/probe-data/anis-star-solo-a3-gauge-reread.json), the secondary-basis descriptives from
// the committed swha (snow-white-heavy-arms) 30fps trace, the C-i replay from the committed
// step-1a opening artifacts, and the iron fill-level regime comparison from the committed
// replay bundle + the classification artifact's recorded --reflag offCurve additions. Nothing
// in the artifact is hand-derived. The artifact is MEASUREMENT ONLY — it carries no verdict,
// and neither does this pin.
// ============================================================================
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  NS_ANIS_ARTIFACT,
  NS_BINDING_THRESHOLD,
  NS_BQ1_PRIMARY_MIN_BINS,
  NS_THRESHOLDS,
  noiseSoloRun,
  wilsonUpper,
} from '../../probe/fill-trace-compare.js';

const ARTIFACT_PATH = 'docs/probe-data/c4-noise-floor-rerun-2026-08-16.json';
const SWHA_TRACE = 'docs/probe-data/swha-solo-30fps-c4-trace.json';

interface ThresholdRow {
  threshold: number;
  falseEventBins: number;
  falseEventBinRate: number;
  wilsonUpper95OneSided: number;
}
interface Artifact {
  result: {
    primary: {
      quietBins: number;
      pairs: number;
      byThreshold: ThresholdRow[];
      maxDelta: number;
      positiveDeltas: number[];
    };
    controls: { cI: { exactMatch: boolean } };
    swha: {
      firstFullInstant: number | null;
      steps: { t: number; delta: number }[];
    };
    ironFillLevelComparison: { allMatch: boolean };
    basisClauses: {
      bq1: { primaryQuietBins: number; primaryMeetsFloor: boolean };
      bq2: { cIexactReplay: boolean };
    };
  };
}

const artifact = JSON.parse(readFileSync(ARTIFACT_PATH, 'utf8')) as Artifact;

describe('the C4 noise-floor re-run replays from committed inputs', () => {
  it('noiseSoloRun reproduces the committed result byte-for-byte', () => {
    const recomputed = noiseSoloRun({ swhaTracePath: SWHA_TRACE });
    expect(JSON.parse(JSON.stringify(recomputed))).toEqual(artifact.result);
  });

  it('C-i: the original drain-hold C4 replays exactly (BQ2)', () => {
    expect(artifact.result.controls.cI.exactMatch).toBe(true);
    expect(artifact.result.basisClauses.bq2.cIexactReplay).toBe(true);
  });

  it('primary basis: the pre-registered thresholds and the zero-false-event reading pin', () => {
    const p = artifact.result.primary;
    expect(p.byThreshold.map((t) => t.threshold)).toEqual([...NS_THRESHOLDS]);
    const binding = p.byThreshold.find(
      (t) => t.threshold === NS_BINDING_THRESHOLD
    )!;
    expect(binding.falseEventBins).toBe(0);
    expect(binding.wilsonUpper95OneSided).toBe(
      Number(wilsonUpper(0, p.quietBins).toFixed(4))
    );
    // the committed series shows NO positive quiet-span delta at all
    expect(p.positiveDeltas).toEqual([]);
    expect(p.maxDelta).toBe(0);
  });

  it('BQ1 floor arithmetic is recorded mechanically', () => {
    const bq1 = artifact.result.basisClauses.bq1;
    expect(bq1.primaryQuietBins).toBe(artifact.result.primary.quietBins);
    expect(bq1.primaryMeetsFloor).toBe(
      bq1.primaryQuietBins >= NS_BQ1_PRIMARY_MIN_BINS
    );
  });

  it('iron fill-level extraction reproduced the committed per-window bin counts', () => {
    expect(artifact.result.ironFillLevelComparison.allMatch).toBe(true);
  });

  it('swha descriptives reproduce the probe-runs 2026-08-15 read (control C-ii)', () => {
    const sw = artifact.result.swha;
    // single 0->full cycle ending 11.03
    expect(sw.firstFullInstant).toBe(11.03);
    // the one large weapon-shot step (~+15.2) at t=9.43
    expect(
      sw.steps.some((s) => s.t === 9.43 && Math.abs(s.delta - 15.2) < 0.05)
    ).toBe(true);
    // 0.20s-spaced +5.8..7.3 volley steps exist
    const volley = sw.steps.filter((s) => s.delta >= 5.8 && s.delta <= 7.3);
    expect(volley.length).toBeGreaterThanOrEqual(10);
  });

  it('the anis-star fire instants come from the committed perPullTable', () => {
    const anis = JSON.parse(readFileSync(NS_ANIS_ARTIFACT, 'utf8')) as {
      perPullTable: { pull: number; firedAtSec: number }[];
    };
    const recomputed = noiseSoloRun({ swhaTracePath: SWHA_TRACE }) as {
      params: { fireInstants: { pull: number; fireSec: number }[] };
    };
    expect(recomputed.params.fireInstants.map((f) => f.fireSec)).toEqual(
      anis.perPullTable.map((p) => p.firedAtSec)
    );
  });
});
