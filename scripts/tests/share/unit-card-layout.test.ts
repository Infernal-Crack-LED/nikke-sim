// Layout invariant for the unit card's bar-chart band: rows never draw outside their slot.
//
// layoutCharts divides a FIXED band (owner ruling 2 — every card emits at the same size)
// proportionally between the charts, but drawBarChart used to place rows at a fixed nominal rowH
// regardless of what its slot could hold. Measured across all 390 renders on 2026-07-28, that ran
// the last rows of chart 1 under chart 2's header, and on the portrait variant into the notes
// panel — worst case prika/twitter at 78px over, and crown/discord (the golden fixture subject) at
// 8px, so the committed fixture itself carried an overlap.
//
// fittedRowH is the fix: geometry follows what the slot affords, typography stays keyed to the
// variant's nominal rowH. Rows get tighter on a crowded card rather than a neighbour being dropped
// or clipped — the neighbours are what the chart is FOR.
import { describe, expect, it } from 'vitest';
import { fittedRowH } from '../../../src/infographics/core/unitCard.js';

describe('fittedRowH', () => {
  it('returns the nominal height when the rows already fit', () => {
    expect(fittedRowH(230, 5, 46)).toBe(46);
    expect(fittedRowH(1000, 5, 46)).toBe(46); // never grows past nominal
  });

  it('shrinks rows to fit a compressed slot', () => {
    // prika/twitter's crowded case: 6 rows into the space a 6+6 card's slot leaves.
    expect(fittedRowH(227, 5, 46)).toBe(45);
    expect(fittedRowH(240, 6, 46)).toBe(40);
  });

  it('never lets rows exceed the space available', () => {
    for (const avail of [50, 137, 227, 240, 300, 534]) {
      for (const rows of [1, 2, 3, 4, 5, 6, 7]) {
        const h = fittedRowH(avail, rows, 46);
        expect(h * rows).toBeLessThanOrEqual(avail);
        expect(h).toBeLessThanOrEqual(46);
      }
    }
  });

  it('is total on the degenerate inputs a chart can hand it', () => {
    expect(fittedRowH(200, 0, 34)).toBe(34); // empty/unranked chart draws its own plate
    expect(Number.isFinite(fittedRowH(0, 3, 34))).toBe(true);
  });
});
