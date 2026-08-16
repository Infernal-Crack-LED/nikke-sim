// ============================================================================
// Replay pin for the anis-star (Anis: Star) solo recording #2 gauge artifact
// (docs/probe-data/anis-star-solo2-gauge.json — pre-op packet
// docs/handoffs/2026-08-16-anis-star-solo2-gauge-preop-packet.md).
//
// Every number in the artifact's `result` is recomputed here from the artifact's own committed
// inputs: the 30fps series (stored changes-only, expanded losslessly), the window spans and
// exclusions, and the per-pull guard anchors. Nothing in `result` is hand-derived. The artifact
// is MEASUREMENT ONLY — it carries no verdict, and neither does this pin.
// ============================================================================
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  NS2_ARTIFACT,
  NS_BQ1_POOLED_MIN_BINS,
  NS_BQ1_PRIMARY_MIN_BINS,
  NS_GUARD_LATENCY_SEC,
  NS_GUARD_POST_FRAMES,
  NS_GUARD_PRE_FRAMES,
  NS_THRESHOLDS,
  expandChangesOnly,
  noiseSolo2Run,
  wilsonUpper,
} from '../../probe/fill-trace-compare.js';

interface ThresholdRow {
  threshold: number;
  falseEventBins: number;
  wilsonUpper95OneSided: number;
}
interface Artifact {
  series30fpsChangesOnly: {
    fps: number;
    frameCount: number;
    changes: [number, string, number | null][];
  };
  result: {
    params: { thresholds: number[] };
    perWindow: {
      id: string;
      guards: { widened: boolean; fireSec: number; lo: number; hi: number }[];
    }[];
    pooled: { quietBins: number; byThreshold: ThresholdRow[] };
    jointPooledWithOldBasis: {
      jointQuietBins: number;
      byThreshold: ThresholdRow[];
    };
    floors: {
      primaryQuietBins: number;
      primaryFloor: number;
      primaryMeetsFloor: boolean;
      jointPooledQuietBins: number;
      jointPooledFloor: number;
      jointPooledMeetsFloor: boolean;
    };
  };
}

const artifact = JSON.parse(readFileSync(NS2_ARTIFACT, 'utf8')) as Artifact;

describe('the anis-star solo #2 noise measurement replays from the committed artifact', () => {
  it('noiseSolo2Run reproduces the committed result byte-for-byte', () => {
    const recomputed = noiseSolo2Run();
    expect(JSON.parse(JSON.stringify(recomputed))).toEqual(artifact.result);
  });

  it('the changes-only series expands losslessly to the full frame count', () => {
    const series = expandChangesOnly(artifact.series30fpsChangesOnly);
    expect(series.reads.length).toBe(
      artifact.series30fpsChangesOnly.frameCount
    );
    // t is the reader's own rounding of i/fps
    series.reads.forEach((r, i) => {
      expect(r.t).toBe(Math.round((i / series.fps) * 100) / 100);
    });
    // every change row is reflected verbatim
    for (const [i, state, fillRaw] of artifact.series30fpsChangesOnly.changes) {
      expect(series.reads[i].state).toBe(state);
      expect(series.reads[i].fillRaw).toBe(fillRaw);
    }
  });

  it('the pre-registered thresholds and Wilson arithmetic are recorded mechanically', () => {
    const p = artifact.result.pooled;
    expect(p.byThreshold.map((t) => t.threshold)).toEqual([...NS_THRESHOLDS]);
    for (const row of p.byThreshold) {
      expect(row.wilsonUpper95OneSided).toBe(
        Number(wilsonUpper(row.falseEventBins, p.quietBins).toFixed(4))
      );
    }
    const j = artifact.result.jointPooledWithOldBasis;
    for (const row of j.byThreshold) {
      expect(row.wilsonUpper95OneSided).toBe(
        Number(wilsonUpper(row.falseEventBins, j.jointQuietBins).toFixed(4))
      );
    }
  });

  it('floor arithmetic is mechanical against the pre-registered floors', () => {
    const f = artifact.result.floors;
    expect(f.primaryFloor).toBe(NS_BQ1_PRIMARY_MIN_BINS);
    expect(f.jointPooledFloor).toBe(NS_BQ1_POOLED_MIN_BINS);
    expect(f.primaryQuietBins).toBe(artifact.result.pooled.quietBins);
    expect(f.primaryMeetsFloor).toBe(f.primaryQuietBins >= f.primaryFloor);
    expect(f.jointPooledMeetsFloor).toBe(
      f.jointPooledQuietBins >= f.jointPooledFloor
    );
  });

  it('unwidened guard bands use the committed §D-2 geometry at 30fps', () => {
    for (const w of artifact.result.perWindow) {
      for (const g of w.guards.filter((x) => !x.widened)) {
        expect(g.lo).toBe(
          Number((g.fireSec - NS_GUARD_PRE_FRAMES / 30).toFixed(4))
        );
        expect(g.hi).toBe(
          Number(
            (
              g.fireSec +
              NS_GUARD_LATENCY_SEC +
              NS_GUARD_POST_FRAMES / 30
            ).toFixed(4)
          )
        );
      }
    }
  });
});
