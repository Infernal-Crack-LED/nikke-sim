// Renderer-level §6.6 semantics, verified against the DRAW CALLS (no pixels):
// a windowed DPS chart must state its window in the header, show absolute
// ranks, normalize labels to the population #1 (topDps), and scale bar lengths
// to the window max. Complements the golden byte-compare, which can't tell a
// right-looking image from a wrong-meaning one.
import { describe, expect, it } from 'vitest';
import {
  drawDpsChart,
  chartWindow,
  relScore,
  type DpsChartData,
} from '../../../src/infographics/core/dpsChart.js';
import type { Canvas2DLike } from '../../../src/infographics/core/canvas2d.js';

// Recording Canvas2DLike: captures fillText strings and reconstructs roundRect
// widths (beginPath → moveTo + 4×arcTo → closePath → fill) so bar lengths are
// assertable.
function mockCtx() {
  const texts: string[] = [];
  const textAt: { t: string; x: number }[] = [];
  const rects: { x: number; w: number; h: number }[] = [];
  const images: { dx: number; dy: number; dw: number; dh: number }[] = [];
  let path: { moveX: number; firstArcX: number } | null = null;
  let arcCount = 0;
  const ctx: Canvas2DLike = {
    fillStyle: '',
    font: '',
    textAlign: '',
    textBaseline: '',
    globalAlpha: 1,
    fillRect: () => {},
    fillText: (t, x) => {
      texts.push(t);
      textAt.push({ t, x });
    },
    measureText: (t) => ({ width: t.length * 8 }),
    beginPath: () => {
      path = null;
      arcCount = 0;
    },
    moveTo: (x) => {
      path = { moveX: x, firstArcX: 0 };
    },
    lineTo: () => {},
    arcTo: (x1) => {
      if (path && arcCount === 0) {
        path.firstArcX = x1;
      }
      arcCount++;
    },
    closePath: () => {},
    fill: () => {
      if (path) {
        // roundRect: moveTo(x+r,y) then arcTo(x+w,y,…) ⇒ w = arcX − moveX + r;
        // every roundRect here uses r = 10 (bars) or 8 (portrait clip, unused)
        rects.push({
          x: path.moveX - 10,
          w: path.firstArcX - path.moveX + 10,
          h: 0,
        });
      }
      path = null;
    },
    save: () => {},
    restore: () => {},
    clip: () => {},
    drawImage: ((...args: unknown[]) => {
      // 9-arg (crop) form: img, sx, sy, sw, sh, dx, dy, dw, dh
      if (args.length === 9) {
        images.push({
          dx: args[5] as number,
          dy: args[6] as number,
          dw: args[7] as number,
          dh: args[8] as number,
        });
      }
    }) as Canvas2DLike['drawImage'],
  };
  return { ctx, texts, textAt, rects, images };
}

// 15-bar population, dps = 150M − 10M·(rank−1); window on slug 'u12' (index 11,
// rank 12) → start = min(11−4, 15−10) = 5 → indices 5–14 = ranks 6–15.
function populationData(window?: DpsChartData['window']): DpsChartData {
  const bars = Array.from({ length: 15 }, (_, i) => ({
    name: `Unit ${i + 1}`,
    element: 'Fire',
    dps: (15 - i) * 10_000_000, // rank 1 = 150M, rank 15 = 10M
    slug: `u${i + 1}`,
  }));
  return { title: 'T', topDps: bars[0].dps, bars, window };
}

describe('drawDpsChart windowing (§6.6)', () => {
  it('chartWindow: no window → full set; target slug → §6.6 slice; unknown slug → top 10', () => {
    expect(chartWindow(populationData())).toEqual({ start: 0, end: 15 });
    expect(chartWindow(populationData({}))).toEqual({ start: 0, end: 10 });
    expect(chartWindow(populationData({ targetSlug: 'u12' }))).toEqual({
      start: 5,
      end: 15,
    });
    expect(chartWindow(populationData({ targetSlug: 'nope' }))).toEqual({
      start: 0,
      end: 10,
    });
  });

  it('windowed: header states the window, ranks are absolute', () => {
    const { ctx, texts } = mockCtx();
    drawDpsChart(ctx, populationData({ targetSlug: 'u12' }));
    expect(texts).toContain('ranks 6–15 of 15');
    expect(texts).toContain('#6'); // first rendered row
    expect(texts).toContain('#15'); // last rendered row
    expect(texts).not.toContain('#5');
    expect(texts).not.toContain('#1');
  });

  it('windowed: labels normalize to the population #1, never the window max', () => {
    const { ctx, texts } = mockCtx();
    const data = populationData({ targetSlug: 'u12' });
    drawDpsChart(ctx, data);
    // window top = rank 6 (100M); population #1 = 150M → 0.667, NOT 1.000
    expect(texts).toContain(relScore(100_000_000, 150_000_000));
    expect(texts).toContain('0.667');
    expect(texts).not.toContain('1.000');
    // window bottom = rank 15 (10M) → 0.067
    expect(texts).toContain(relScore(10_000_000, 150_000_000));
  });

  it('windowed: bar lengths scale to the WINDOW max (top row bar is full-length)', () => {
    const { ctx, rects } = mockCtx();
    drawDpsChart(ctx, populationData({ targetSlug: 'u12' }));
    // rows draw track (full width) then bar; the first row's bar equals its
    // track width even though its label is 0.667.
    const widths = rects.map((r) => Math.round(r.w));
    const trackW = Math.max(...widths);
    expect(widths[1]).toBe(trackW); // row 1 bar == row 1 track
    // last row bar: 10M / 100M (window max) = 10% of the track, not 10/150
    const lastBar = widths[widths.length - 1];
    expect(lastBar / trackW).toBeCloseTo(0.1, 1);
  });

  it('unwindowed: no window note, ranks start at #1, top row label is 1.000', () => {
    const { ctx, texts } = mockCtx();
    drawDpsChart(ctx, populationData());
    expect(texts.some((t) => t.startsWith('ranks '))).toBe(false);
    expect(texts).toContain('#1');
    expect(texts).toContain('#15');
    expect(texts).toContain('1.000');
  });

  it('top-10 window of a larger population still states the window', () => {
    const { ctx, texts } = mockCtx();
    drawDpsChart(ctx, populationData({}));
    expect(texts).toContain('ranks 1–10 of 15');
    expect(texts).toContain('1.000'); // population #1 is IN this window
  });
});

// Portrait layout branch (hasPortraits → labelW 210 + portrait column): the
// Matrix tab's share PNG passes per-bar imageUrl (MatrixChart.toChartData →
// shareImage.ts loads img), so its share cards deliberately match the
// DPS-rankings tab's portrait layout. Pin the branch at the draw-call level.
describe('drawDpsChart portrait layout (matrix + rankings share cards)', () => {
  // Geometry constants mirrored from core/dpsChart.ts (PAD_X/HEAD_H/ROW_H/
  // PORTRAIT are module-private; a layout change moves these with it).
  const PAD_X = 36;
  const PORTRAIT = 40;
  const PORTRAIT_X = PAD_X + Math.max('#10'.length * 8 + 6, 20); // rankW+6
  const fakeImg = () => ({ naturalWidth: 256, naturalHeight: 512 });
  const dataWithPortraits = (): DpsChartData => ({
    title: 'T',
    topDps: 100_000_000,
    bars: Array.from({ length: 10 }, (_, i) => ({
      name: `Unit ${i + 1}`,
      element: 'Fire',
      dps: (10 - i) * 10_000_000,
      slug: `u${i + 1}`,
      img: fakeImg(),
    })),
  });

  it('portraits: wider label column, portrait drawn per bar, name shifted right', () => {
    const { ctx, rects, images, textAt } = mockCtx();
    drawDpsChart(ctx, dataWithPortraits());
    // one cropped portrait drawImage per bar, 40×40 at the portrait column
    expect(images).toHaveLength(10);
    expect(images[0]).toEqual({
      dx: PORTRAIT_X,
      dy: 118 + (52 - 40) / 2,
      dw: PORTRAIT,
      dh: PORTRAIT,
    });
    // labelW 210 → track starts at PAD_X + 210 (first roundRect = row 1 track)
    expect(rects[0].x).toBe(PAD_X + 210);
    // name sits right of the portrait: portraitX + PORTRAIT + 12
    const name = textAt.find((t) => t.t === 'Unit 1');
    expect(name?.x).toBe(PORTRAIT_X + PORTRAIT + 12);
  });

  it('no portraits: narrow label column, no drawImage, name at the fixed offset', () => {
    const { ctx, rects, images, textAt } = mockCtx();
    drawDpsChart(ctx, populationData()); // 15 img-less bars, unwindowed
    expect(images).toHaveLength(0);
    expect(rects[0].x).toBe(PAD_X + 168); // labelW 168
    const name = textAt.find((t) => t.t === 'Unit 1');
    expect(name?.x).toBe(PAD_X + 30);
  });
});
