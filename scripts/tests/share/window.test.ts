// Unit tests for the §6.6 row-windowing rule (src/share/window.ts) — the exact
// clamp table from docs/handoffs/2026-07-27-infographics-centralization-plan.md.
import { describe, expect, it } from 'vitest';
import { windowRows, WINDOW_SIZE } from '../../../src/share/window.js';

describe('windowRows (§6.6)', () => {
  it('n ≤ 10 → all rows, regardless of target', () => {
    expect(windowRows(7)).toEqual({ start: 0, end: 7 });
    expect(windowRows(10)).toEqual({ start: 0, end: 10 });
    expect(windowRows(7, 5)).toEqual({ start: 0, end: 7 });
    expect(windowRows(10, 9)).toEqual({ start: 0, end: 10 });
    expect(windowRows(0)).toEqual({ start: 0, end: 0 });
  });

  it('no target → top 10', () => {
    expect(windowRows(79)).toEqual({ start: 0, end: 10 });
    expect(windowRows(21)).toEqual({ start: 0, end: 10 });
    expect(windowRows(79, -1)).toEqual({ start: 0, end: 10 });
  });

  it('target rank ≤ 5 → ranks 1–10 (no room for 4 above)', () => {
    expect(windowRows(79, 0)).toEqual({ start: 0, end: 10 }); // rank 1
    expect(windowRows(79, 4)).toEqual({ start: 0, end: 10 }); // rank 5
  });

  it('mid-board target → 4 above / target / 5 below', () => {
    // rank 34 of 79 → 0-indexed 33 → ranks 30–39
    expect(windowRows(79, 33)).toEqual({ start: 29, end: 39 });
  });

  it('target rank ≥ n−4 → last 10 (no room for 5 below)', () => {
    // rank 78 of 79 → 0-indexed 77 → ranks 70–79
    expect(windowRows(79, 77)).toEqual({ start: 69, end: 79 });
    expect(windowRows(79, 75)).toEqual({ start: 69, end: 79 }); // rank 76
  });

  it('target at population edges', () => {
    expect(windowRows(79, 0)).toEqual({ start: 0, end: 10 });
    expect(windowRows(79, 78)).toEqual({ start: 69, end: 79 }); // rank 79
  });

  it('window is always ≤ WINDOW_SIZE rows', () => {
    for (const n of [0, 1, 9, 10, 11, 52, 79]) {
      for (const i of [-1, 0, 3, Math.floor(n / 2), n - 1, n + 5]) {
        const { start, end } = windowRows(n, i);
        expect(end - start).toBeLessThanOrEqual(WINDOW_SIZE);
        expect(start).toBeGreaterThanOrEqual(0);
        expect(end).toBeLessThanOrEqual(n);
      }
    }
  });
});
