// The bar-label rule, verified against the DRAW CALLS (no pixels): on every
// image that draws bars, the track starts after the LONGEST label plus
// BAR_LABEL_GAP — a long NIKKE name shortens the bars instead of being clipped
// by them (owner style ruling 2026-07-28, canvas2d.ts barTrackX). Covers both
// bar renderers: dpsChart.ts (rank boards / share charts) and teamCard.ts
// (the team share card's per-unit share bars).
import { describe, expect, it } from 'vitest';
import {
  drawDpsChart,
  type DpsChartData,
} from '../../../src/infographics/core/dpsChart.js';
import {
  drawTeamCard,
  type TeamCardData,
  type TeamCardMeta,
} from '../../../src/infographics/core/teamCard.js';
import {
  BAR_LABEL_GAP,
  type Canvas2DLike,
} from '../../../src/infographics/core/canvas2d.js';

// Recording ctx: fillText (text + x) and roundRect starts. roundRect emits
// moveTo(x + r, y) then arcTo(x + w, …), so with the radius known per caller
// the track's x and width are recoverable.
function mockCtx() {
  const texts: { t: string; x: number }[] = [];
  const paths: { moveX: number; firstArcX: number }[] = [];
  let cur: { moveX: number; firstArcX: number } | null = null;
  let arcs = 0;
  const ctx: Canvas2DLike = {
    fillStyle: '',
    font: '',
    textAlign: '',
    textBaseline: '',
    globalAlpha: 1,
    fillRect: () => {},
    fillText: (t, x) => texts.push({ t, x }),
    measureText: (t) => ({ width: t.length * 8 }), // 8px/char — exact arithmetic
    beginPath: () => {
      cur = null;
      arcs = 0;
    },
    moveTo: (x) => {
      cur = { moveX: x, firstArcX: 0 };
    },
    arcTo: (x1) => {
      if (cur && arcs === 0) {
        cur.firstArcX = x1;
      }
      arcs++;
    },
    closePath: () => {},
    fill: () => {
      if (cur) {
        paths.push(cur);
      }
      cur = null;
    },
    save: () => {},
    restore: () => {},
    clip: () => {},
    drawImage: (() => {}) as unknown as Canvas2DLike['drawImage'],
  };
  // bar track x, given the roundRect radius the renderer used
  const trackX = (r: number) => paths.map((p) => p.moveX - r);
  return { ctx, texts, trackX };
}

const chart = (names: string[]): DpsChartData => ({
  title: 'T',
  topDps: 100,
  bars: names.map((name, i) => ({
    name,
    element: 'Fire',
    dps: 100 - i,
    slug: `u${i}`,
  })),
});

// dpsChart geometry: PAD_X 36, no portraits → name starts at 36 + 30 = 66,
// minimum label column 168 (track at 204), cap 420 (track at 456), r = 10.
const NAME_X = 66;
const MIN_TRACK = 36 + 168;
const MAX_TRACK = 36 + 420;

describe('drawDpsChart bar label column', () => {
  it('short names keep the designed column (bars unchanged)', () => {
    const { ctx, trackX } = mockCtx();
    drawDpsChart(ctx, chart(['Naga', 'Crown'])); // ≤5 chars = ≤40px
    expect(trackX(10).every((x) => x === MIN_TRACK)).toBe(true);
  });

  it('a long name pushes the bars right instead of being clipped', () => {
    const { ctx, texts, trackX } = mockCtx();
    // 30 chars = 240px → name ends at 306, past the 204 default track
    const long = 'Long Synthetic Label 30 Chars.';
    drawDpsChart(ctx, chart([long, 'Naga']));
    const track = trackX(10)[0];
    expect(track).toBe(NAME_X + long.length * 8 + BAR_LABEL_GAP);
    expect(track).toBeGreaterThan(MIN_TRACK);
    // the name is drawn IN FULL, and the gap is real air
    const drawn = texts.find((t) => t.t.startsWith('Long Syn'))!;
    expect(drawn.t).toBe(long);
    expect(drawn.x + drawn.t.length * 8 + BAR_LABEL_GAP).toBeLessThanOrEqual(
      track
    );
  });

  it('past the cap the column stops growing and the name ellipsizes', () => {
    const { ctx, texts, trackX } = mockCtx();
    drawDpsChart(ctx, chart(['z'.repeat(80)])); // 640px — way past the cap
    expect(trackX(10)[0]).toBe(MAX_TRACK);
    const drawn = texts.find((t) => t.t.startsWith('zzz'))!;
    expect(drawn.t.endsWith('…')).toBe(true);
    expect(drawn.x + drawn.t.length * 8).toBeLessThanOrEqual(
      MAX_TRACK - BAR_LABEL_GAP
    );
  });

  it('the longest name sets the column for every row', () => {
    const { ctx, trackX } = mockCtx();
    drawDpsChart(ctx, chart(['Naga', 'Long Synthetic Label 27 Char', 'Crown']));
    const xs = trackX(10);
    expect(new Set(xs).size).toBe(1); // one column, not per-row
    expect(xs[0]).toBe(NAME_X + 28 * 8 + BAR_LABEL_GAP);
  });
});

const teamMeta: TeamCardMeta = {
  weakness: 'Iron',
  level: 801,
  coreLabel: '100% core',
};
const team = (names: string[]): TeamCardData => ({
  teamDamage: 100,
  teamDps: 1,
  fullBursts: 8,
  fullBurstUptime: 0.2,
  units: names.map((name) => ({
    name,
    burst: '1',
    weapon: 'SMG',
    element: 'Iron',
    advantaged: false,
    share: 0.2,
    totalDamage: 20,
  })),
});

// teamCard geometry: PAD_X 40, name at 40 + 78 = 118, designed track 430,
// cap 620, share-bar radius 8.
describe('drawTeamCard share bar label column', () => {
  it('short names keep the designed 430 track', () => {
    const { ctx, trackX } = mockCtx();
    drawTeamCard(ctx, team(['Liter', 'Crown']), teamMeta);
    expect(trackX(8).filter((x) => x === 430).length).toBeGreaterThan(0);
    expect(trackX(8).every((x) => x <= 430)).toBe(true);
  });

  it('a long name pushes the share bars right', () => {
    const { ctx, texts, trackX } = mockCtx();
    // 45 chars = 360px → the label ends at 478, past the designed 430 track
    // (a 30-char name still fits inside it and leaves the card untouched).
    const long = 'Long Synthetic Label Of Exactly 45 Characters';
    drawTeamCard(ctx, team([long, 'Liter']), teamMeta);
    const track = 118 + long.length * 8 + BAR_LABEL_GAP;
    expect(trackX(8)).toContain(track);
    expect(texts.find((t) => t.t.startsWith('Long Syn'))!.t).toBe(long);
  });
});
