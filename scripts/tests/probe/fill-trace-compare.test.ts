// Pins scripts/probe/fill-trace-compare.ts — the instrument behind the 2026-08-14 refill-window
// fill-trace measurement (docs/handoffs/2026-08-14-fill-trace-preop-packet.md).
//
// It runs against the COMMITTED REPLAY BUNDLES in docs/probe-data/, not the recordings:
// `docs/probes/` is gitignored, so a test that needed the video could never run in verify.sh. Each
// bundle carries the reader trace, the sim credit schedule and the result the published numbers
// came from, so `analyzeComp` is re-executed on exactly that input and compared to its own
// committed output. If the arithmetic drifts, the deliverable's numbers stop reproducing here.
//
// The pre-committed DECISION RULE is pinned separately and directly, because it is the thing the
// measurement's conclusion actually rests on: the basis clause has to keep firing ahead of the
// three R branches, or a dispersed measurement would silently be reported as a classification.

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  analyzeComp,
  decisionRule,
  isClean,
  iqr,
  median,
  pearson,
  quantile,
  refillWindows,
  spansFor,
  type CompResult,
  type FillTrace,
  type SimSchedule,
  type TempoFixture,
} from '../../probe/fill-trace-compare.js';

interface Bundle {
  fixture: string;
  simSchedule: SimSchedule;
  trace: FillTrace;
  result: CompResult;
}

const ARMS = [
  {
    label: 'iron sweep (run G)',
    bundle: 'docs/probe-data/fill-trace-u8-g-iron-sweep.json',
    fixture: 'docs/probe-data/tempo-cycle-u8-g-iron-sweep.json',
    readable: 10,
    amountsTrusted: true,
  },
  {
    label: 'T5 wind-weak',
    bundle: 'docs/probe-data/fill-trace-probe-u7-t5-wind-weak.json',
    fixture: 'docs/probe-data/tempo-cycle-probe-u7-t5-wind-weak.json',
    readable: 11,
    amountsTrusted: true,
  },
  {
    label: 'misc B3s (run I order)',
    bundle: 'docs/probe-data/fill-trace-u8-i-misc-b3s.json',
    fixture: 'docs/probe-data/fill-trace-u8-i-misc-b3s-windows.json',
    readable: 10,
    amountsTrusted: false,
  },
];

const load = <T>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T;
/**
 * JSON has no NaN — `JSON.stringify` writes `null` for an un-computable figure, which is exactly
 * how the committed bundle stores one. Comparing through the same round trip is the honest test:
 * it asserts the file on disk reproduces, not an in-memory object the file could never hold.
 */
const roundTrip = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

describe('fill-trace-compare — stats helpers', () => {
  it('quantile interpolates and median/iqr agree with it', () => {
    const xs = [1, 2, 3, 4];
    expect(quantile(xs, 0)).toBe(1);
    expect(quantile(xs, 0.5)).toBe(2.5);
    expect(quantile(xs, 1)).toBe(4);
    expect(median([3, 1, 2])).toBe(2);
    expect(iqr([1, 2, 3, 4])).toEqual({ p25: 1.75, p75: 3.25, iqr: 1.5 });
  });

  it('pearson is +1 / -1 on exact lines and NaN on a constant', () => {
    expect(pearson([1, 2, 3], [2, 4, 6])).toBeCloseTo(1, 12);
    expect(pearson([1, 2, 3], [6, 4, 2])).toBeCloseTo(-1, 12);
    expect(Number.isNaN(pearson([1, 1, 1], [1, 2, 3]))).toBe(true);
  });
});

describe('fill-trace-compare — window derivation', () => {
  const fx = load<TempoFixture>(
    'docs/probe-data/tempo-cycle-u8-g-iron-sweep.json'
  );

  it('pairs each Full-Burst end with the NEXT non-null stage-1 hexagon', () => {
    const ws = refillWindows(fx);
    expect(ws.length).toBe(12); // 13 Full Bursts, the last has no following chain
    expect(ws[0]).toEqual({
      id: 1,
      fbStart: 13.6667,
      fbEnd: 22.0667,
      stage1: 25.65,
    });
    // fullWindows[2] ends 50.4167; burstChains[3] has stage1 === null and must be skipped
    expect(ws[2].fbEnd).toBe(50.4167);
    expect(ws[2].stage1).toBe(53.8667);
    for (const w of ws) {
      expect(w.stage1).toBeGreaterThan(w.fbEnd);
    }
  });

  it('spansFor pads every window and emits one range per window', () => {
    const spans = spansFor(fx, 1.5, 0.8).split(',');
    expect(spans.length).toBe(12);
    expect(spans[0]).toBe('20.57-26.45');
  });
});

describe('fill-trace-compare — clean-read taxonomy', () => {
  it('accepts only unflagged `filling` reads with a value', () => {
    expect(isClean({ t: 1, state: 'filling', fillRaw: 40, flags: [] })).toBe(
      true
    );
    expect(
      isClean({ t: 1, state: 'filling', fillRaw: 4, flags: ['lowFill'] })
    ).toBe(false);
    expect(
      isClean({ t: 1, state: 'filling', fillRaw: 40, flags: ['nonMonotonic'] })
    ).toBe(false);
    expect(
      isClean({ t: 1, state: 'filling', fillRaw: 40, flags: ['inFlashSpan'] })
    ).toBe(false);
    expect(
      isClean({ t: 1, state: 'full', fillRaw: 100, flags: ['greenFull'] })
    ).toBe(false);
    expect(isClean({ t: 1, state: 'filling', fillRaw: null, flags: [] })).toBe(
      false
    );
  });
});

describe('fill-trace-compare — the pre-committed decision rule', () => {
  const ok = { iqr: 0.2, readable: 10 };

  it('CONFIRM needs median R >= 1.3 on BOTH comps', () => {
    expect(
      decisionRule([
        { comp: 'a', medianR: 1.4, ...ok },
        { comp: 'b', medianR: 1.9, ...ok },
      ]).branch
    ).toBe('CONFIRM');
  });

  it('NOT-IN-WINDOW needs median R < 1.15 on BOTH comps', () => {
    expect(
      decisionRule([
        { comp: 'a', medianR: 1.02, ...ok },
        { comp: 'b', medianR: 1.1, ...ok },
      ]).branch
    ).toBe('NOT-IN-WINDOW');
  });

  it('disagreeing comps and the 1.15-1.3 band are MIXED', () => {
    expect(
      decisionRule([
        { comp: 'a', medianR: 1.02, ...ok },
        { comp: 'b', medianR: 1.9, ...ok },
      ]).branch
    ).toBe('MIXED');
    expect(
      decisionRule([
        { comp: 'a', medianR: 1.2, ...ok },
        { comp: 'b', medianR: 1.25, ...ok },
      ]).branch
    ).toBe('MIXED');
  });

  it('the basis clause OUTRANKS every R branch — dispersion or too few windows wins', () => {
    // this is the load-bearing ordering: a high median R with a blown IQR is NOT a confirmation
    const dispersed = decisionRule([
      { comp: 'a', medianR: 2.285, iqr: 1.419, readable: 10 },
      { comp: 'b', medianR: 2.075, iqr: 1.402, readable: 11 },
    ]);
    expect(dispersed.branch).toBe('CANNOT-MEASURE');
    expect(dispersed.detail).toContain('IQR');
    expect(
      decisionRule([
        { comp: 'a', medianR: 1.4, iqr: 0.2, readable: 5 },
        { comp: 'b', medianR: 1.4, iqr: 0.2, readable: 10 },
      ]).branch
    ).toBe('CANNOT-MEASURE');
  });
});

describe('fill-trace-compare — committed replay bundles reproduce', () => {
  for (const arm of ARMS) {
    it(`${arm.label} replays to its committed result`, () => {
      const b = load<Bundle>(arm.bundle);
      const fx = load<TempoFixture>(arm.fixture);
      const again = analyzeComp(fx, b.trace, b.simSchedule);
      expect(roundTrip(again)).toEqual(b.result);
      expect(again.readable.length).toBe(arm.readable);
      expect(again.amountsTrusted).toBe(arm.amountsTrusted);
    });

    it(`${arm.label} closure decomposes the tempo gap`, () => {
      const b = load<Bundle>(arm.bundle);
      const c = b.result.closure;
      // the two measured components must account for the per-cycle gap within a frame or two
      expect(c.refillDelta + c.ladderDelta - c.gapPerCycle).toBeCloseTo(
        -c.residual,
        6
      );
      expect(Math.abs(c.residual)).toBeLessThan(0.1);
      // and the refill component is the dominant one on every arm
      expect(c.refillDelta / c.gapPerCycle).toBeGreaterThan(0.9);
    });

    it(`${arm.label} widget boundary reads stay 1-frame tight`, () => {
      const b = load<Bundle>(arm.bundle);
      // burst render -> charging bar is a single frame on every window, on every recording
      for (const d of b.result.boundary.burstRenderEndToBarPaint) {
        expect(d).toBeGreaterThan(0);
        expect(d).toBeLessThanOrEqual(0.02);
      }
      // the green-full instant lands a few frames BEFORE the stage-1 hexagon, never after
      for (const d of b.result.boundary.fullMinusStage1) {
        expect(d).toBeLessThan(0);
        expect(d).toBeGreaterThan(-0.1);
      }
    });
  }

  it('an untrusted schedule voids every amount-derived figure, never silently', () => {
    const b = load<Bundle>('docs/probe-data/fill-trace-u8-i-misc-b3s.json');
    expect(b.result.amountsTrusted).toBe(false);
    expect(b.result.scheduleWarnings.length).toBeGreaterThan(0);
    expect(b.result.medianR).toBeNull(); // NaN in memory, `null` once serialized
    for (const w of b.result.readable) {
      expect(w.R).toBeNull();
      expect(w.rVisible).toBeNull();
      expect(w.simRate).toBeNull();
    }
    // ... while the bound-derived figures survive
    expect(b.result.closure.gapPerCycle).toBeGreaterThan(0);
    expect(b.result.readable.every((w) => w.visibleSec > 0)).toBe(true);
  });
});
