// Compact table infographic renderer — draws a titled table to a Canvas2D
// context. Matches the visual style of dpsChart.ts / teamCard.ts (dark bg,
// blue accent, same font). Ported from bakery-bot (used by its /ol, /max-ammo,
// /charge-speed commands) so the site and the bot render identical tables.
import { type Canvas2DLike, roundRect, PORTRAIT_CROP_TOP } from './canvas2d.js';
import { FONT, drawWatermark } from './theme.js';
import { windowRows } from './window.js';

export interface TableColumn {
  header: string;
  align?: 'left' | 'right';
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

  // column layout: distribute width evenly, first column left-aligned
  const colCount = data.columns.length;
  const colW = (W - padX * 2) / colCount;
  const colX = (i: number): number => padX + i * colW;

  // column headers
  const headerY = HEAD_H + 22;
  ctx.fillStyle = '#5b6472';
  ctx.font = `600 13px ${FONT}`;
  data.columns.forEach((col, i) => {
    ctx.textAlign = col.align === 'right' ? 'right' : 'left';
    const x = col.align === 'right' ? colX(i) + colW - 8 : colX(i) + 8;
    ctx.fillText(col.header, x, headerY);
  });

  // separator line
  const sepY = HEAD_H + COL_HEADER_H - 4;
  ctx.fillStyle = '#2a2f3b';
  ctx.fillRect(padX, sepY, W - padX * 2, 1);

  // rows
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

    row.forEach((cell, ci) => {
      const col = data.columns[ci];
      ctx.textAlign = col?.align === 'right' ? 'right' : 'left';
      const x = col?.align === 'right' ? colX(ci) + colW - 8 : colX(ci) + 8;
      // first column is the label — brighter; rest are data
      ctx.fillStyle = ci === 0 ? '#e7eaf0' : '#c9cede';
      ctx.font = ci === 0 ? `600 15px ${FONT}` : `400 15px ${FONT}`;
      ctx.fillText(cell, x, y);
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
