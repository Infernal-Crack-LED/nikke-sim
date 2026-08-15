/**
 * OPENING-WINDOW OBSERVABLE — replay + pin (step 1a of
 * docs/handoffs/2026-08-14-burst-gen-next-session.md).
 *
 * WHAT THIS PINS. The committed artifacts docs/probe-data/fill-trace-opening-*.json carry, per
 * refill window of the three 2026-08-14 fill-trace recordings:
 *   - the charging bar's first-paint fill level and the low-band ramp after it,
 *   - the early clean trace back-extrapolated to the paint instant (the banked-gauge estimate
 *     that never uses a low-band read),
 *   - what banking-from-FB-end WOULD have deposited by the paint instant (at sim credit sizes
 *     and at the visible-span real rate), and
 *   - the raw hold-span pixel reads from `gauge-fill.py --team --diag` (glow / fade / quiet
 *     split), answering whether ANY fill-like paint exists under the drained Full-Burst bar.
 *
 * Each artifact is self-contained: `diagHold` holds the raw diag reads, and the paired replay
 * bundle (docs/probe-data/fill-trace-*.json) holds the trace + schedule, so `openingAnalysis`
 * re-runs here WITHOUT the gitignored videos and must reproduce the committed result exactly.
 * The diag runs themselves were validated at generation time: with --diag on, the reader's
 * default fields reproduced all three committed bundle traces read-for-read (4590/4185/4401
 * reads, zero mismatches).
 *
 * WHAT THIS DOES NOT BLESS: any hypothesis verdict. The artifacts are measurements; the
 * FB-end-banking vs bar-paint-banking classification belongs to a /scientific-method pass
 * (measurement ≠ enactment). The assertions below pin the MEASURED shape so a later CV or
 * analysis change cannot silently rewrite it.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  openingAnalysis,
  type BundleLike,
  type DiagRead,
  type OpeningResult,
} from '../../probe/fill-trace-compare.js';

interface OpeningArtifact {
  bundle: string;
  diagHold: { window: number; reads: DiagRead[] }[];
  result: OpeningResult;
}

/** JSON has no NaN — stringify writes null for an un-computable figure (same as the bundles). */
const roundTrip = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

const root = new URL('../../../', import.meta.url);
function load<T>(rel: string): T {
  return JSON.parse(readFileSync(new URL(rel, root), 'utf8')) as T;
}

const cases = [
  {
    name: 'iron sweep (run G)',
    artifact: 'docs/probe-data/fill-trace-opening-u8-g-iron-sweep.json',
    amountsTrusted: true,
  },
  {
    name: 'T5 wind-weak',
    artifact: 'docs/probe-data/fill-trace-opening-probe-u7-t5-wind-weak.json',
    amountsTrusted: true,
  },
  {
    name: 'misc B3s (run I order)',
    artifact: 'docs/probe-data/fill-trace-opening-u8-i-misc-b3s.json',
    amountsTrusted: false,
  },
] as const;

const loaded = cases.map((c) => {
  const artifact = load<OpeningArtifact>(c.artifact);
  const bundle = load<BundleLike>(artifact.bundle);
  return { ...c, artifact, bundle };
});

describe('opening artifacts replay from their committed inputs', () => {
  for (const { name, artifact, bundle } of loaded) {
    it(`${name}: openingAnalysis reproduces the committed result`, () => {
      const res = openingAnalysis(bundle, artifact.diagHold);
      expect(roundTrip(res)).toEqual(artifact.result);
    });

    it(`${name}: diagHold aligns with the bundle trace's hold spans`, () => {
      // every hold-span frame of the committed trace has exactly one diag read, and vice versa
      for (const w of bundle.result.windows) {
        if (w.barPaint === null) {
          continue;
        }
        const holdFrames = bundle.trace.reads.filter(
          (r) => r.t >= w.fbEnd && r.t < w.barPaint!
        );
        const dh = artifact.diagHold.find((d) => d.window === w.id);
        expect(dh, `window ${w.id}`).toBeDefined();
        expect(dh!.reads.map((r) => r.t)).toEqual(holdFrames.map((r) => r.t));
      }
    });
  }
});

describe('the measured opening shape (pinned, no verdict)', () => {
  it('the charging bar paints at 0 fill on the median window of every recording', () => {
    for (const { name, artifact } of loaded) {
      expect(artifact.result.medianPaintFill, name).toBe(0);
    }
  });

  it('holds are ~0.77-1.70s, median ~1.5-1.6s (the known blind spot), on every recording', () => {
    for (const { name, artifact } of loaded) {
      expect(artifact.result.medianHoldSec, name).toBeGreaterThan(1.4);
      expect(artifact.result.medianHoldSec, name).toBeLessThan(1.7);
      for (const w of artifact.result.windows) {
        expect(w.holdSec, `${name} win ${w.id}`).toBeGreaterThan(0.7);
        expect(w.holdSec, `${name} win ${w.id}`).toBeLessThan(1.75);
      }
    }
  });

  it('the back-extrapolated banked-gauge estimate sits near zero, far below both FB-end-banking predictions', () => {
    for (const { name, artifact, amountsTrusted } of loaded) {
      const r = artifact.result;
      // measured medians: 6.77 / 8.09 / 5.32 (% of bar)
      expect(Math.abs(r.medianInterceptAtPaint), name).toBeLessThan(10);
      // banking from FB-end would have deposited far more by the paint instant:
      // at the visible-span real rate — 66.02 / 78.64 / 81.21
      expect(r.medianPredBankFbEndReal, name).toBeGreaterThan(60);
      expect(r.medianPredBankFbEndReal, name).toBeGreaterThan(
        6 * Math.abs(r.medianInterceptAtPaint)
      );
      if (amountsTrusted) {
        // ...and at engine-exact sim credit sizes — 42 / 50.46
        expect(r.medianPredBankFbEndSim, name).toBeGreaterThan(40);
        expect(r.medianPredBankFbEndSim, name).toBeGreaterThan(
          4 * Math.abs(r.medianInterceptAtPaint)
        );
      } else {
        // the third arm's credit-schedule amounts are voided by its own self-checks
        expect(Number.isFinite(r.medianPredBankFbEndSim), name).toBe(false);
        for (const w of r.windows) {
          expect(
            Number.isFinite(w.predBankFbEndSim),
            `${name} win ${w.id}`
          ).toBe(false);
        }
      }
    }
  });

  it('quiet hold frames show a dark, unpainted track (median 0; sustained max ≤ 18.7 on the worst window)', () => {
    for (const { name, artifact } of loaded) {
      for (const w of artifact.result.windows) {
        expect(w.diag, `${name} win ${w.id}`).not.toBeNull();
        // the drained bar's off-blink render: a fully dark track on the median frame
        expect(
          w.diag!.quietFillMedian,
          `${name} win ${w.id}`
        ).toBeLessThanOrEqual(0.7);
      }
      expect(
        artifact.result.quietFillSustainedMaxAcrossWindows,
        name
      ).toBeLessThanOrEqual(18.7);
    }
  });
});
