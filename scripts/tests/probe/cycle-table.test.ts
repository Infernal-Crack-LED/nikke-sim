// Pins the burst-cycle tempo decomposition (scripts/probe/cycle-table.ts) — the instrument behind
// the 2026-08-13 tempo-gap measurement in docs/probe-runs.md.
//
// It runs against COMMITTED FRAME-TRACE FIXTURES, not the recordings: `docs/probes/` is gitignored,
// so a test that needed the video could never run in verify.sh. The fixtures carry the raw
// per-frame fill trace plus the detector output, so the guards below are exercised on exactly the
// data that produced the published numbers.
//
// The two guards are the load-bearing part. Both were written to move the Full-Burst-duration
// lower bound DOWNWARD, because that bound is used to rule OUT "the real Full Burst is shorter than
// the modeled 10s" — a bound inflated by a detector artifact would manufacture its own conclusion.

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  buildCycleTable,
  deriveWindowEnd,
  fbDurationLowerBound,
  steadyStatePeriods,
} from '../../probe/cycle-table.js';

interface Fixture {
  source: { video: string; fps: number };
  fullWindows: { start: number; end: number; durationSec: number }[];
  burstChains: {
    stage1: number | null;
    stage2: number | null;
    stage3: number | null;
  }[];
  frameT: number[];
  frameFill: number[];
  expected: {
    fullBursts: number;
    fbDurationLowerBound: { bound: number | null; cycle: number | null };
    steadyStateMean: number;
    correctedDurations: (number | null)[];
    qualifies: boolean[];
    tailStitched: boolean[];
  };
}

const load = (name: string): Fixture =>
  JSON.parse(
    readFileSync(
      new URL(
        `../../../docs/probe-data/tempo-cycle-${name}.json`,
        import.meta.url
      ),
      'utf8'
    )
  );

const framesOf = (f: Fixture) =>
  f.frameT.map((t, i) => ({ videoT: t, fill: f.frameFill[i] }));

const CASES = [
  { name: 'u8-g-iron-sweep', label: 'iron sweep run G (boss Electric)' },
  { name: 'probe-u7-t5-wind-weak', label: 'T5 wind-weak (boss Iron)' },
] as const;

describe.each(CASES)('cycle table — $label', ({ name }) => {
  const fx = load(name);
  const rows = buildCycleTable({
    windows: fx.fullWindows,
    chains: fx.burstChains,
    frames: framesOf(fx),
  });

  it('reproduces the published per-cycle corrected durations', () => {
    expect(rows.map((r) => r.correctedDuration)).toEqual(
      fx.expected.correctedDurations
    );
  });

  it('reproduces the published guard-3a qualification per cycle', () => {
    expect(rows.map((r) => r.qualifies)).toEqual(fx.expected.qualifies);
  });

  it('reproduces the published Full-Burst-duration lower bound', () => {
    const b = fbDurationLowerBound(rows);
    expect(b.bound).toBeCloseTo(fx.expected.fbDurationLowerBound.bound!, 3);
    expect(b.cycle).toBe(fx.expected.fbDurationLowerBound.cycle);
  });

  it('reproduces the published steady-state mean period', () => {
    expect(steadyStatePeriods(rows).mean).toBeCloseTo(
      fx.expected.steadyStateMean,
      3
    );
  });

  it('keeps the bound strictly below the modeled 10s Full Burst', () => {
    // It is a LOWER bound off an under-rendering bar. A bound at/above 10s would mean the
    // detector is reporting a window longer than the Full Burst itself — i.e. broken.
    const b = fbDurationLowerBound(rows).bound!;
    expect(b).toBeGreaterThan(8);
    expect(b).toBeLessThan(10);
  });

  it('only ever admits guard-3a-qualifying cycles to the bound', () => {
    const b = fbDurationLowerBound(rows);
    for (const i of b.qualifyingCycles) {
      expect(rows[i - 1].qualifies).toBe(true);
    }
    expect(b.qualifyingCycles).not.toHaveLength(0);
  });
});

describe('guard 3b — deriveWindowEnd', () => {
  // Synthetic traces at 60fps. These encode the two real defects the guard exists to reject,
  // isolated from any recording so the intent survives a fixture regeneration.
  const at = (t0: number, fills: number[]) =>
    fills.map((fill, i) => ({
      videoT: Math.round((t0 + i / 60) * 1e4) / 1e4,
      fill,
    }));

  it('rejects an isolated bright frame stitched onto the tail', () => {
    // A draining bar is monotone: 0 -> 0.04 -> 0 cannot be a bar still rendering.
    const frames = [
      ...at(0, [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.03]),
      ...at(1, [0, 0, 0, 0, 0, 0]),
      ...at(2, [0.04]),
      ...at(2.5, [0, 0, 0]),
    ];
    const got = deriveWindowEnd(frames, 0, 5);
    expect(got.corroborated).toBe(true);
    expect(got.end).toBeCloseTo(0.15, 3); // the 10th frame (fill 0.03), not the 2.0s blip
  });

  it('tolerates the burst cut-in occlusion right after the true start', () => {
    // Short lit blip, a ~0.4s occlusion gap, then the main body. Stopping at the first gap would
    // measure the blip (~0.03s) instead of the Full Burst — the bug this guard was built around.
    const frames = [
      ...at(0, [0.95, 0.95]),
      ...at(
        0.05,
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      ),
      ...at(
        0.45,
        [0.9, 0.85, 0.8, 0.75, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.03]
      ),
      ...at(1.5, [0, 0, 0]),
    ];
    const got = deriveWindowEnd(frames, 0, 5);
    expect(got.corroborated).toBe(true);
    expect(got.end).toBeGreaterThan(0.5); // the main body, NOT the 0.033s opening blip
  });

  it('reports no corroborated end when only noise is present', () => {
    const frames = [...at(0, [0.04]), ...at(1, [0.03]), ...at(2, [0.05])];
    expect(deriveWindowEnd(frames, 0, 5).corroborated).toBe(false);
  });
});
