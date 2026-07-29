// wrapText is what makes the fixed-size unit card possible: the notes panel is
// free prose from a community sheet — the only genuinely variable-height content
// on the card — and every card must emit at the same size (ruling 2). So the
// panel is a clamped fixed-height box, and this helper is the clamp.
import { describe, it, expect } from 'vitest';
import { wrapText, type Canvas2DLike } from '../../../src/infographics/core/canvas2d.js';

// A deterministic monospace ruler: 10px per character, no font loading. The
// helper's contract is measureText-driven, so a fake ruler tests the LOGIC
// without dragging in canvas or font registration.
const ctx = {
  measureText: (t: string) => ({ width: t.length * 10 }),
} as unknown as Canvas2DLike;

const W = (chars: number) => chars * 10;

describe('wrapText', () => {
  it('wraps on word boundaries', () => {
    expect(wrapText(ctx, 'aaa bbb ccc ddd', W(7), 4)).toEqual([
      'aaa bbb',
      'ccc ddd',
    ]);
  });

  it('returns the whole text on one line when it fits', () => {
    expect(wrapText(ctx, 'short', W(20), 3)).toEqual(['short']);
  });

  it('clamps to maxLines and ellipsizes the last one', () => {
    const out = wrapText(ctx, 'aaa bbb ccc ddd eee fff', W(7), 2);
    expect(out).toHaveLength(2);
    expect(out[0]).toBe('aaa bbb');
    expect(out[1].endsWith('…')).toBe(true);
  });

  // Repeated words are the case where the overflow branch's remainder-splice
  // could pick the wrong position (it now slices from the loop index rather than
  // words.indexOf(word), which finds the FIRST occurrence). The output is
  // identical either way — fitText truncates to maxW and the cut point is fixed
  // by the already-full line — so this pins the observable contract, not the
  // internal splice: lines stay in order, in budget, and never repeat content
  // that was already drawn above.
  it('handles repeated words without duplicating an earlier line', () => {
    const out = wrapText(ctx, 'xx yy xx zz ww', W(5), 2);
    expect(out).toHaveLength(2);
    expect(out[0]).toBe('xx yy');
    expect(out[1]).not.toBe(out[0]);
    for (const l of out) {
      expect(ctx.measureText(l).width).toBeLessThanOrEqual(W(5));
    }
  });

  it('breaks a single word wider than the budget instead of overflowing', () => {
    const out = wrapText(ctx, 'supercalifragilistic', W(5), 2);
    expect(out.length).toBeGreaterThan(0);
    for (const l of out) {
      expect(ctx.measureText(l).width).toBeLessThanOrEqual(W(5));
    }
  });

  it('is empty for degenerate budgets rather than overflowing the box', () => {
    expect(wrapText(ctx, 'text', 0, 3)).toEqual([]);
    expect(wrapText(ctx, 'text', W(10), 0)).toEqual([]);
    expect(wrapText(ctx, '', W(10), 3)).toEqual([]);
  });

  it('never returns more lines than the budget allows', () => {
    // the property that actually protects the fixed-height panel
    for (const maxLines of [1, 2, 3, 5]) {
      const out = wrapText(ctx, 'a b c d e f g h i j k l m n', W(6), maxLines);
      expect(out.length).toBeLessThanOrEqual(maxLines);
    }
  });
});
