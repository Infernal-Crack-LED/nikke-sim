// Pull Calculator infographic — what a planned number of Advanced Recruit
// pulls is worth: a headline tile per pool (any SSR / rate-up / Pilgrim) over
// a cumulative copy-odds grid, one row per pool and one column per copy count
// up to MLB. Matches the visual style of resourcesCard.ts (dark bg, blue
// accent, same font, same mandatory top-right mark).
//
// FIXED GEOMETRY, like resourcesCard.ts: the pool count and the copy-count
// column count are both known before a canvas exists (PULL_POOLS.length and
// summary.maxCopies), so the card height is a formula over those counts rather
// than something measured after drawing — the detail paragraph is a fixed-line
// clamped box (wrapText), never a grow-to-fit one.
import { type Canvas2DLike, roundRect, fitText, wrapText } from './canvas2d.js';
import {
  FONT,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_DIM,
  ACCENT,
  drawBrandMark,
  drawFooterNote,
  footerNote,
  brandMarkIconRect,
} from './theme.js';
import {
  MAX_LIMIT_BREAK_COPIES,
  summarizePull,
  type PullSummary,
} from './pullData.js';

/** One headline tile — the same shape resourcesCard.ts's tiles use. */
export interface PullTileData {
  label: string;
  value: string;
  sub: string;
  /** The headline tile (any SSR) — drawn in the accent color. */
  main?: boolean;
}

/** One grid row: a pool, its rate, its expected copies, its cumulative odds. */
export interface PullRowData {
  label: string;
  rate: string;
  expected: string;
  /** Pre-formatted cumulative odds, one per copy count (1 up to MLB). */
  odds: string[];
}

export interface PullCardData {
  title: string;
  subtitle?: string;
  icon?: unknown; // the nikkesim.app mark's icon, drawn top-right like every other card
  tiles: PullTileData[];
  /** Column headers for the copy-count columns ('1+' ... 'MLB'). */
  copyHeaders: string[];
  rows: PullRowData[];
  detail: string;
  footer?: string;
}

// A whole percent reads as precision the model doesn't have below ~1%, so the
// odds columns carry one decimal under 99.95% and a flat '>99.9%' above it —
// '100%' would claim a certainty a binomial tail never reaches.
function pctOdds(p: number): string {
  if (p >= 0.9995) {
    return '>99.9%';
  }
  if (p > 0 && p < 0.001) {
    return '<0.1%';
  }
  return `${(p * 100).toFixed(1)}%`;
}

/** A per-pull rate as a percent, trimming a trailing '.0' (4% not 4.0%). */
function pctRate(rate: number): string {
  const v = rate * 100;
  return `${Number.isInteger(v) ? v.toString() : v.toFixed(1)}%`;
}

/** Column headers for the copy-count columns: '1+', '2+', ..., 'MLB'. */
export function copyHeaders(maxCopies: number): string[] {
  return Array.from({ length: maxCopies }, (_, i) =>
    i + 1 === MAX_LIMIT_BREAK_COPIES ? 'MLB' : `${i + 1}+`
  );
}

/**
 * A pull count as card data — the copy and rounding the /pull page shows,
 * decided here rather than in the renderer so the card and the page can't word
 * or round the same numbers differently.
 */
export function buildPullCard(pulls: number): PullCardData {
  const s: PullSummary = summarizePull(pulls);
  const [anySsr, ...featured] = s.pools;
  return {
    title: 'Pull Calculator',
    subtitle: `${s.pulls} ${s.pulls === 1 ? 'pull' : 'pulls'} on Advanced Recruit`,
    tiles: [
      // The SSR pool leads with a COUNT (that's what the pulls buy); the two
      // featured pools lead with the odds of landing the unit at all, which is
      // the number a banner plan turns on.
      {
        label: anySsr.label,
        value: anySsr.expected.toFixed(1),
        sub: `expected in ${s.pulls} ${s.pulls === 1 ? 'pull' : 'pulls'}`,
        main: true,
      },
      ...featured.map((pool) => ({
        label: pool.label,
        value: pctOdds(pool.atLeast[0]),
        sub: `chance of 1+ copy · ${pool.expected.toFixed(1)} expected`,
      })),
    ],
    copyHeaders: copyHeaders(s.maxCopies),
    rows: s.pools.map((pool) => ({
      label: pool.label,
      rate: pctRate(pool.rate),
      expected: pool.expected.toFixed(2),
      odds: pool.atLeast.map(pctOdds),
    })),
    // Two things a reader needs to hold the columns straight: they are
    // cumulative, and the copy counts mean COPIES OF ONE UNIT on the two
    // featured rows while the SSR row counts SSRs of any kind.
    detail:
      'Every pull rolls on its own — ' +
      s.pools.map((p) => `${pctRate(p.rate)} ${p.label}`).join(', ') +
      `. Columns are cumulative: MLB = ${MAX_LIMIT_BREAK_COPIES} copies of one ` +
      'featured unit (max limit break); the Any SSR row counts SSRs of any kind.',
    footer: 'nikkesim.app/pull',
  };
}

// ---- layout geometry ----------------------------------------------------------

// Seven columns (pool, per-pull rate, expected, then one per copy count up to
// MLB) — 760 gives the odds columns ~74px each, which holds '>99.9%' at 13px
// without ellipsizing, and leaves the pool-label column wide enough for
// 'Rate-up SSR' plus the three-tile row above it.
export const PULL_CARD_W = 760;
const PAD_X = 32;
const HEAD_H = 96; // title + subtitle band, matches resourcesCard's HEAD_H
const TITLE_BASELINE_Y = 44;
const TITLE_FONT_SIZE = 24;
// Bottom pad — only the footer NOTE lands here (see tableCard.ts's FOOT_H).
const FOOT_H = 22;

const TILE_H = 92;
const TILE_GAP = 10;
const GRID_TOP_GAP = 22; // tile row -> grid header
const GRID_HEAD_H = 26;
const ROW_H = 32;
const DETAIL_GAP = 16;
const DETAIL_LINE_H = 18;
const DETAIL_MAX_LINES = 2; // clamped, like resourcesCard.ts's detail box

// Column flex weights: label, per-pull rate, expected, then one per copy
// count. The label column carries the widest text ('Rate-up SSR') and the
// copy columns are even.
const LABEL_FLEX = 2.1;
const RATE_FLEX = 1.05;
const EXPECTED_FLEX = 1.1;
const COPY_FLEX = 1;

export function pullCardHeight(rowCount: number): number {
  return (
    HEAD_H +
    TILE_H +
    GRID_TOP_GAP +
    GRID_HEAD_H +
    rowCount * ROW_H +
    DETAIL_GAP +
    DETAIL_MAX_LINES * DETAIL_LINE_H +
    FOOT_H
  );
}

// Ink-guard geometry (see node/render.ts assertTitleInk) — starts at the
// title's textX, which is padX since the mark sits top-right, and covers the
// TITLE ONLY: a region that also covered the mark would pass on icon pixels
// with zero glyphs.
export const PULL_TITLE_ICON = brandMarkIconRect(PULL_CARD_W, PAD_X);
export const PULL_TITLE_INK_REGION = {
  x: PAD_X,
  y: 16,
  w: 340,
  h: 34,
} as const;

/** Column x/width layout for the grid, in the order the row data is drawn. */
function columnLayout(copyCount: number): { x: number; w: number }[] {
  const flexes = [
    LABEL_FLEX,
    RATE_FLEX,
    EXPECTED_FLEX,
    ...Array.from({ length: copyCount }, () => COPY_FLEX),
  ];
  const total = flexes.reduce((a, b) => a + b, 0);
  const avail = PULL_CARD_W - PAD_X * 2;
  let x = PAD_X;
  return flexes.map((flex) => {
    const w = (avail * flex) / total;
    const col = { x, w };
    x += w;
    return col;
  });
}

function drawTile(
  ctx: Canvas2DLike,
  x: number,
  y: number,
  w: number,
  h: number,
  tile: PullTileData
): void {
  ctx.fillStyle = '#171a21';
  roundRect(ctx, x, y, w, h, 10);
  ctx.fill();
  if (tile.main) {
    ctx.fillStyle = ACCENT;
    ctx.fillRect(x + 10, y, w - 20, 2);
  }

  const px = x + 14;
  const maxW = w - 28;
  ctx.textAlign = 'left';
  ctx.fillStyle = TEXT_DIM;
  ctx.font = `600 11px ${FONT}`;
  let ty = y + 21;
  ctx.fillText(fitText(ctx, tile.label.toUpperCase(), maxW), px, ty);

  ty += 26;
  ctx.fillStyle = tile.main ? ACCENT : TEXT_PRIMARY;
  ctx.font = `700 22px ${FONT}`;
  ctx.fillText(fitText(ctx, tile.value, maxW), px, ty);

  ty += 22;
  ctx.fillStyle = TEXT_SECONDARY;
  ctx.font = `400 11px ${FONT}`;
  ctx.fillText(fitText(ctx, tile.sub, maxW), px, ty);
}

// One grid cell. Column 0 (the pool name) is left-aligned; every numeric
// column is right-aligned so the odds read as a ladder down the card. The
// caller sets fillStyle/font, so a row can mix weights across its columns.
const CELL_PAD = 8;
function drawCell(
  ctx: Canvas2DLike,
  cols: { x: number; w: number }[],
  index: number,
  baselineY: number,
  text: string
): void {
  const col = cols[index];
  const t = fitText(ctx, text, col.w - CELL_PAD);
  if (index === 0) {
    ctx.textAlign = 'left';
    ctx.fillText(t, col.x, baselineY);
  } else {
    ctx.textAlign = 'right';
    ctx.fillText(t, col.x + col.w, baselineY);
  }
  ctx.textAlign = 'left';
}

export function drawPullCard(ctx: Canvas2DLike, data: PullCardData): void {
  const W = PULL_CARD_W;
  const H = pullCardHeight(data.rows.length);

  ctx.fillStyle = '#101216';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = ACCENT;
  ctx.fillRect(0, 0, W, 5);

  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  const note = footerNote(data.footer, 'nikke-sim');
  const markLeft = drawBrandMark(ctx, { right: W - PAD_X, icon: data.icon });
  const textX = PAD_X;
  ctx.fillStyle = TEXT_PRIMARY;
  ctx.font = `700 ${TITLE_FONT_SIZE}px ${FONT}`;
  ctx.fillText(
    fitText(ctx, data.title, markLeft - 16 - textX),
    textX,
    TITLE_BASELINE_Y
  );
  if (data.subtitle) {
    ctx.fillStyle = TEXT_SECONDARY;
    ctx.font = `400 14px ${FONT}`;
    ctx.fillText(fitText(ctx, data.subtitle, W - textX - PAD_X), textX, 68);
  }

  // headline tiles
  const tiles = data.tiles;
  const tileW =
    (W - PAD_X * 2 - TILE_GAP * (tiles.length - 1)) / Math.max(1, tiles.length);
  tiles.forEach((tile, i) => {
    drawTile(ctx, PAD_X + i * (tileW + TILE_GAP), HEAD_H, tileW, TILE_H, tile);
  });

  // copy-odds grid
  const cols = columnLayout(data.copyHeaders.length);
  let y = HEAD_H + TILE_H + GRID_TOP_GAP;
  ctx.fillStyle = TEXT_DIM;
  ctx.font = `600 11px ${FONT}`;
  ['POOL', 'PER PULL', 'EXPECTED', ...data.copyHeaders].forEach((h, i) =>
    drawCell(ctx, cols, i, y + 16, h)
  );
  y += GRID_HEAD_H;
  ctx.fillStyle = '#242936';
  ctx.fillRect(PAD_X, y - 4, W - PAD_X * 2, 1);

  data.rows.forEach((row, i) => {
    const rowY = y + i * ROW_H;
    if (i % 2 === 1) {
      ctx.fillStyle = '#171a21';
      roundRect(ctx, PAD_X - 6, rowY, W - PAD_X * 2 + 12, ROW_H, 6);
      ctx.fill();
    }
    const baselineY = rowY + 21;
    // The pool name leads in primary ink, its rate/expected follow in
    // secondary, and the cumulative odds come back bright — those are what the
    // card is actually for, so they hold the eye down the ladder.
    ctx.fillStyle = TEXT_PRIMARY;
    ctx.font = `700 14px ${FONT}`;
    drawCell(ctx, cols, 0, baselineY, row.label);
    ctx.fillStyle = TEXT_SECONDARY;
    ctx.font = `400 13px ${FONT}`;
    drawCell(ctx, cols, 1, baselineY, row.rate);
    drawCell(ctx, cols, 2, baselineY, row.expected);
    ctx.fillStyle = TEXT_PRIMARY;
    ctx.font = `600 13px ${FONT}`;
    row.odds.forEach((odd, c) => drawCell(ctx, cols, 3 + c, baselineY, odd));
  });

  y += data.rows.length * ROW_H + DETAIL_GAP + 12;
  ctx.fillStyle = TEXT_SECONDARY;
  ctx.font = `400 13px ${FONT}`;
  wrapText(ctx, data.detail, W - PAD_X * 2, DETAIL_MAX_LINES).forEach(
    (line, i) => ctx.fillText(line, PAD_X, y + i * DETAIL_LINE_H)
  );

  // footer — the descriptor's NOTE only; the mandatory mark is in the title row
  // (theme.ts drawBrandMark).
  drawFooterNote(ctx, PAD_X, H - 8, 12, note);
}
