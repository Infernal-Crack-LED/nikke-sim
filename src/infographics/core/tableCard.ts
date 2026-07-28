// Compact table infographic renderer — draws a titled table to a Canvas2D
// context. Matches the visual style of dpsChart.ts / teamCard.ts (dark bg,
// blue accent, same font). Ported from bakery-bot (used by its /ol, /max-ammo,
// /charge-speed commands) so the site and the bot render identical tables.
import {
  type Canvas2DLike,
  roundRect,
  fitText,
  PORTRAIT_CROP_TOP,
} from './canvas2d.js';
import { FONT, drawWatermark } from './theme.js';
import { windowRows } from './window.js';

export interface TableColumn {
  header: string;
  align?: 'left' | 'right';
  // Share of the table width this column gets, relative to its siblings
  // (default 1 = the even split). A column whose content is much wider than
  // the rest — a unit name beside three numeric columns — takes a bigger
  // flex so it is not the one that gets ellipsized.
  flex?: number;
}
// §6.6 window request for rank boards (burstgen / sustain / burstcdr / buffer).
// Rows are plain strings, so the target is the unit's 0-indexed row position —
// the caller resolves name/slug → index. Absent window = render all rows (the
// small OL/breakpoint tables). Present = top 10, or the 4-above/target/5-below
// window around targetIndex. Callers composing a rank column should write
// ABSOLUTE population ranks into every row before handing it over — the slice
// then keeps them correct.
export interface TableWindow {
  targetIndex?: number;
}
export interface TableCardData {
  title: string;
  subtitle?: string;
  columns: TableColumn[];
  rows: string[][];
  window?: TableWindow;
  // Optional per-row text color, PARALLEL to `rows` (population-indexed, so it
  // slices with the §6.6 window): a row carrying a color draws every cell in
  // it. The olsim before/after card marks changed lines with the accent.
  rowColors?: (string | null)[];
  footer?: string; // descriptor added to the watermark footer (theme.ts)
  icon?: unknown; // optional canvas-drawable image drawn beside the title
  portrait?: unknown; // optional character portrait drawn top-right
}

export const TABLE_W = 720;
const PAD_X = 32;
const HEAD_H = 96;
const COL_HEADER_H = 36;
const ROW_H = 38;
const FOOT_H = 40;
const ICON = 32; // site icon square, drawn beside the title

// Ink-guard geometry — see teamCard.ts's TEAM_TITLE_INK_REGION comment. Starts at
// the title's textX (padX + ICON + 12; 24px title, baseline y 44).
export const TABLE_TITLE_ICON = {
  x: PAD_X,
  y: 44 - ICON + 4,
  size: ICON,
} as const;
export const TABLE_TITLE_INK_REGION = {
  x: PAD_X + ICON + 12,
  y: 16,
  w: 340,
  h: 34,
} as const;

export const tableHeight = (rowCount: number): number =>
  HEAD_H + COL_HEADER_H + rowCount * ROW_H + FOOT_H;

// Horizontal padding inside a cell, both sides — the text box is the column
// width minus this twice. Every header/cell is fitText'd to it (canvas2d.ts):
// a 7-column card leaves ~94px per column and "Module fragments/day" is ~130px,
// which without a fit simply overdraws the neighbouring column.
const CELL_PAD = 8;

// The rows a card renders after §6.6 windowing — callers need this to size the
// canvas (tableHeight(visibleRows(...).length)).
export function visibleRows(
  rows: string[][],
  window?: TableWindow
): { rows: string[][]; start: number; total: number } {
  if (!window) {
    return { rows, start: 0, total: rows.length };
  }
  const { start, end } = windowRows(rows.length, window.targetIndex);
  return { rows: rows.slice(start, end), start, total: rows.length };
}

export function drawTableCard(ctx: Canvas2DLike, data: TableCardData): void {
  const W = TABLE_W;
  const padX = PAD_X;
  const win = visibleRows(data.rows, data.window);
  const rows = win.rows;
  const windowed = rows.length < win.total;
  const H = tableHeight(rows.length);

  // background + accent bar
  ctx.fillStyle = '#101216';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#5b9dff';
  ctx.fillRect(0, 0, W, 5);

  // icon + title + subtitle
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  let textX = padX;
  if (data.icon) {
    const iy = 44 - ICON + 4;
    ctx.drawImage(data.icon, padX, iy, ICON, ICON);
    textX = padX + ICON + 12;
  }
  ctx.fillStyle = '#e7eaf0';
  ctx.font = `700 24px ${FONT}`;
  ctx.fillText(data.title, textX, 44);
  if (data.subtitle) {
    ctx.fillStyle = '#8b93a3';
    ctx.font = `400 14px ${FONT}`;
    ctx.fillText(data.subtitle, textX, 68);
  }

  // character portrait (top-right corner)
  if (data.portrait) {
    const PS = 64;
    const px = W - padX - PS;
    const py = 12;
    const im = data.portrait as {
      naturalWidth?: number;
      naturalHeight?: number;
      width?: number;
      height?: number;
    };
    const iw = im.naturalWidth ?? im.width ?? PS;
    const ih = im.naturalHeight ?? im.height ?? PS;
    const side = Math.min(iw, ih);
    const sx = (iw - side) / 2;
    const sy = (ih - side) * PORTRAIT_CROP_TOP;
    ctx.save();
    roundRect(ctx, px, py, PS, PS, 10);
    ctx.clip();
    ctx.fillStyle = '#1f232d';
    ctx.fillRect(px, py, PS, PS);
    ctx.drawImage(data.portrait, sx, sy, side, side, px, py, PS, PS);
    ctx.restore();
  }

  // column layout: distribute width by flex weight (default 1 each = the even
  // split), first column left-aligned. Every draw below fits its text to the
  // column's own width, so no cell can overdraw its neighbour.
  const weights = data.columns.map((c) => c.flex ?? 1);
  const perFlex = (W - padX * 2) / (weights.reduce((a, b) => a + b, 0) || 1);
  const colWs = weights.map((w) => w * perFlex);
  const colXs = colWs.reduce<number[]>(
    (xs, w, i) => [...xs, xs[i] + w],
    [padX]
  );
  const colW = (i: number): number => colWs[i] ?? 0;
  const colX = (i: number): number => colXs[i] ?? padX;
  // Where a cell's text starts (left-aligned) or ends (right-aligned), and how
  // wide it may be before fitText ellipsizes it.
  const cellTextX = (i: number): number =>
    data.columns[i]?.align === 'right'
      ? colX(i) + colW(i) - CELL_PAD
      : colX(i) + CELL_PAD;
  const cellTextW = (i: number): number => colW(i) - CELL_PAD * 2;

  // column headers
  const headerY = HEAD_H + 22;
  ctx.fillStyle = '#5b6472';
  ctx.font = `600 13px ${FONT}`;
  data.columns.forEach((col, i) => {
    ctx.textAlign = col.align === 'right' ? 'right' : 'left';
    ctx.fillText(fitText(ctx, col.header, cellTextW(i)), cellTextX(i), headerY);
  });

  // separator line
  const sepY = HEAD_H + COL_HEADER_H - 4;
  ctx.fillStyle = '#2a2f3b';
  ctx.fillRect(padX, sepY, W - padX * 2, 1);

  // rows
  const rowColors = data.rowColors
    ? data.rowColors.slice(win.start, win.start + rows.length)
    : null;
  rows.forEach((row, ri) => {
    const y = HEAD_H + COL_HEADER_H + ri * ROW_H + 26;

    // zebra striping
    if (ri % 2 === 1) {
      ctx.fillStyle = '#171b22';
      ctx.fillRect(
        padX,
        HEAD_H + COL_HEADER_H + ri * ROW_H,
        W - padX * 2,
        ROW_H
      );
    }

    const rowColor = rowColors?.[ri] ?? null;
    row.forEach((cell, ci) => {
      const col = data.columns[ci];
      ctx.textAlign = col?.align === 'right' ? 'right' : 'left';
      // first column is the label — brighter; rest are data — unless the row
      // carries an explicit color (changed-line marking)
      ctx.fillStyle = rowColor ?? (ci === 0 ? '#e7eaf0' : '#c9cede');
      ctx.font = ci === 0 ? `600 15px ${FONT}` : `400 15px ${FONT}`;
      ctx.fillText(fitText(ctx, cell, cellTextW(ci)), cellTextX(ci), y);
    });
  });

  // footer — the mandatory watermark final pass (theme.ts): `footer` only adds
  // a descriptor; it can never remove or replace the nikkesim.app mark.
  // (Right-aligned window note per §6.6 when rendering a population slice.)
  drawWatermark(ctx, padX, H - 16, 12, data.footer, 'nikke-sim');
  if (windowed) {
    ctx.textAlign = 'right';
    ctx.fillText(
      `rows ${win.start + 1}–${win.start + rows.length} of ${win.total}`,
      W - padX,
      H - 16
    );
  }
}
