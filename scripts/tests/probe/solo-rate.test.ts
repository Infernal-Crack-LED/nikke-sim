// ============================================================================
// Replay pin for the AR + SG solo gauge-bar reads
// (docs/probe-data/ar-sg-solo-gauge-2026-08-17.json).
//
// Every number in the artifact's `results` is recomputed here by running `soloRate` /
// `soloMagRate` over the committed 30fps traces, so the instrument self-validates: if a later
// change to the step detector, the merge rule, the saturation guard or the quantization model
// moves these readings, this test goes red rather than the artifact silently going stale.
//
// The artifact is MEASUREMENT ONLY — it carries no verdict, and neither does this pin. The
// mechanical CONTROLS (drake's cadence reproducing her datamined rate_of_fire, the magazine
// structure) are pinned alongside the readings because they are what makes the readings
// interpretable at all.
// ============================================================================
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  soloMagRate,
  soloRate,
  type SoloRead,
  type SoloSeries,
} from '../../probe/fill-trace-compare.js';

const round4 = (n: number): number => Math.round(n * 10000) / 10000;

const ARTIFACT = 'docs/probe-data/ar-sg-solo-gauge-2026-08-17.json';
const SCARLET_TRACE = 'docs/probe-data/scarlet-ar-solo-gauge-trace.json';
const DRAKE_TRACE = 'docs/probe-data/drake-sg-solo-gauge-trace.json';

type Trace = SoloSeries & {
  bar: { widthPx: number };
  calibration: { rawOverTrue: number };
};

const load = <T>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T;

describe('solo-rate: AR + SG solo gauge-bar reads (2026-08-17)', () => {
  const artifact = load<{
    results: {
      scarlet_AR_perMagazine: Record<string, unknown>;
      drake_SG_perTrigger: Record<string, unknown>;
    };
  }>(ARTIFACT);

  it('both traces carry the same independently re-derived 138px solo bar geometry', () => {
    for (const p of [SCARLET_TRACE, DRAKE_TRACE]) {
      const t = load<Trace>(p);
      expect(t.bar.widthPx).toBe(138);
      // The reader bias applied to both readings is the committed maiden-ice-rose anchor value.
      expect(t.calibration.rawOverTrue).toBe(1.064);
      expect(t.fps).toBe(30);
    }
  });

  it('scarlet (AR): the datamined 90 column reproduces per magazine', () => {
    const r = soloMagRate({
      series: load<Trace>(SCARLET_TRACE),
      barWidthPx: 138,
      rawOverTrue: 1.064,
      window: [9.0, 29.0],
      magSize: 20,
      dataminedColumnPct: 0.9,
      label: 'scarlet (Scarlet, AR, solo)',
    });
    expect(r.perMagRaw).toEqual([20.3, 19.5, 18.9, 19.6]);
    expect(r.meanPerMagRaw).toBeCloseTo(19.575, 3);
    expect(r.perShotTrue).toBeCloseTo(0.9199, 3);
    // VALIDATED: within +2.2% of the datamined row.
    expect(r.ratioToColumn).toBeCloseTo(1.0221, 3);
    expect(Math.abs((r.ratioToColumn as number) - 1)).toBeLessThan(0.05);
    expect(r).toMatchObject(artifact.results.scarlet_AR_perMagazine);
  });

  it('drake (SG): the per-trigger credit reads ~0.85 of the datamined column', () => {
    const r = soloRate({
      series: load<Trace>(DRAKE_TRACE),
      barWidthPx: 138,
      rawOverTrue: 1.064,
      window: [8.6, 17.8],
      cadencePerSec: 1.5,
      dataminedColumnPct: 9,
      label: 'drake (Drake, SG, solo)',
    });
    expect(r.counted).toEqual([8, 7.9, 7.3, 8, 8.7, 8.6, 7.3, 6.5, 9.4, 9.4]);
    expect(r.meanTrue).toBeCloseTo(7.6222, 3);
    expect(r.ratioToColumn).toBeCloseTo(0.8469, 3);
    expect(r).toMatchObject(artifact.results.drake_SG_perTrigger);
  });

  it('drake (SG): the per-trigger credit is NOT CONSTANT — the per-landed signature', () => {
    const r = soloRate({
      series: load<Trace>(DRAKE_TRACE),
      barWidthPx: 138,
      rawOverTrue: 1.064,
      window: [8.6, 17.8],
      cadencePerSec: 1.5,
      dataminedColumnPct: 9,
    });
    // Under PER-TRIGGER crediting every pull credits the same value, so the only admissible
    // step-to-step spread is the bar's own column quantization => varianceRatio ~1. Observed 10.
    expect(r.varianceRatio).toBeCloseTo(10.0159, 2);
    expect(r.varianceRatio).toBeGreaterThan(4);
    expect(r.minRaw).toBe(6.5);
    expect(r.maxRaw).toBe(9.4);
  });

  it('control: drake’s detected steps reproduce her datamined 90rpm cadence', () => {
    const r = soloRate({
      series: load<Trace>(DRAKE_TRACE),
      barWidthPx: 138,
      rawOverTrue: 1.064,
      window: [8.6, 17.8],
      cadencePerSec: 1.5,
    });
    // Detected one-per-trigger, not merged or split: 1.5015/s vs the datamined 1.5/s.
    expect(r.observedCadencePerSec).toBeCloseTo(1.5, 2);
    // Exactly one reload gap inside the window (her 9-round magazine boundary).
    expect(r.steps.filter((s) => s.acrossReload)).toHaveLength(1);
    // The step that lands on the 100% cap is truncated and must not be counted.
    expect(r.steps.filter((s) => s.saturated)).toHaveLength(1);
  });

  it('soloMagRate: a plateau AT the 100% cap is dropped, not counted as a magazine boundary', () => {
    // Regression guard for the cross-family review finding (2026-08-17): soloMagRate had no
    // saturation guard where its sibling soloRate did. A capped plateau is not a reload boundary —
    // the bar stopped climbing because it was FULL — so counting it drags the per-magazine mean
    // down. Synthetic series: three real magazine plateaus, then a plateau pinned at 100.
    const mk = (t0: number, level: number): SoloRead[] =>
      Array.from({ length: 40 }, (_v, i) => ({
        t: round4(t0 + i * 0.033),
        state: 'filling',
        fillRaw: level,
      }));
    const series = {
      fps: 30,
      reads: [
        ...mk(0, 10),
        ...mk(2, 30),
        ...mk(4, 50),
        ...mk(6, 100), // saturated — must be dropped
      ],
    } as unknown as SoloSeries;
    const r = soloMagRate({
      series,
      barWidthPx: 138,
      rawOverTrue: 1,
      window: [0, 10],
      magSize: 20,
    });
    expect(r.saturatedPlateausDropped).toBe(1);
    // 10 -> 30 -> 50 only: two deltas of 20, NOT a third truncated one from the capped plateau.
    expect(r.perMagRaw).toEqual([20, 20]);
    expect(r.meanPerMagRaw).toBe(20);
  });

  it('the saturated cap step and the reload step are excluded from the statistics', () => {
    const r = soloRate({
      series: load<Trace>(DRAKE_TRACE),
      barWidthPx: 138,
      rawOverTrue: 1.064,
      window: [8.6, 17.8],
      cadencePerSec: 1.5,
    });
    expect(r.excludedSteps).toEqual([8, 5.1]);
    expect(r.counted).not.toContain(5.1);
  });
});
