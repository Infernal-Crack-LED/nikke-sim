// Shared DPS-chart infographic renderer. Draws a ranked horizontal bar chart to any
// Canvas2D-compatible context, so the web app (browser canvas) and the bakery-bot
// (@napi-rs/canvas / node-canvas) produce a pixel-identical image. DOM-free — the
// caller creates and sizes the canvas and hands us the ctx. Mirrors teamCard.ts.
import { type Canvas2DLike, roundRect, PORTRAIT_CROP_TOP } from './canvas2d.js';
import { FONT, ELEMENT_COLORS, drawWatermark } from './theme.js';
import { windowRows } from './window.js';

// Relative-normalized score against the POPULATION #1's dps (`DpsChartData.topDps`
// — never the rendered window's max): the population #1 is 1.000 in EVERY image,
// windowed or not, so two screenshots of the same unit always show the same number
// (§6.6). 3 decimals to keep tightly-clustered ranks distinguishable. Shared by the
// on-page chart and the PNG so both show identical labels.
export const relScore = (dps: number, top: number): string =>
  (top > 0 ? dps / top : 0).toFixed(3);

export interface DpsBar {
  name: string;
  element: string;
  dps: number;
  slug?: string; // character slug — lets a Node caller resolve portraits itself
  advantaged?: boolean;
  imageUrl?: string | null; // portrait source (loaded by the caller into `img`)
  img?: unknown; // pre-loaded CanvasImageSource; drawn if present
}
export interface DpsCompare {
  name: string;
  element: string;
  dps: number;
  rank: number;
  total: number; // population size the rank is out of
}
// §6.6 window request. Absent = render `bars` exactly as given (the web's inline
// full-set charts). Present = slice `bars` (which must then be the FULL ranked
// population, sorted desc) to the top 10, or to the 4-above/target/5-below window
// around `targetSlug`. An unfound slug falls back to the top 10.
export interface DpsWindow {
  targetSlug?: string;
}
export interface DpsChartData {
  title: string;
  subtitle?: string;
  // Population #1's dps — the label normalization anchor (see relScore). REQUIRED
  // and explicit: on a windowed chart bars[0] is the window's top, not the
  // population's, so it cannot be inferred from `bars`.
  topDps: number;
  bars: DpsBar[]; // sorted desc; full population when `window` is set, else the exact rows to draw
  window?: DpsWindow;
  compare?: DpsCompare | null;
  icon?: unknown; // optional canvas-drawable image drawn beside the title
  footer?: string; // descriptor added to the watermark footer (theme.ts)
}

export const CHART_W = 900;
const PAD_X = 36;
const HEAD_H = 118;
const ROW_H = 52;
const FOOT_H = 44;
const COMPARE_H = 52;

export const chartHeight = (barCount: number, hasCompare: boolean) =>
  HEAD_H + barCount * ROW_H + (hasCompare ? COMPARE_H : 0) + FOOT_H;

// Which population slice a chart renders — windowed per §6.6 when requested,
// the full `bars` array otherwise. Callers need this to size the canvas
// (chartHeight(end - start, …)) and to preload only the shown portraits.
export function chartWindow(data: DpsChartData): {
  start: number;
  end: number;
} {
  if (!data.window) {
    return { start: 0, end: data.bars.length };
  }
  const target = data.window.targetSlug
    ? data.bars.findIndex((b) => b.slug === data.window?.targetSlug)
    : -1;
  return windowRows(data.bars.length, target >= 0 ? target : undefined);
}

export function drawDpsChart(ctx: Canvas2DLike, data: DpsChartData) {
  const W = CHART_W;
  const padX = PAD_X;
  const win = chartWindow(data);
  const bars = data.bars.slice(win.start, win.end);
  const windowed = win.end - win.start < data.bars.length;
  const H = chartHeight(bars.length, !!data.compare);

  // background + accent bar
  ctx.fillStyle = '#101216';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#5b9dff';
  ctx.fillRect(0, 0, W, 5);

  // icon + title + subtitle
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  const ICON = 34;
  let textX = padX;
  if (data.icon) {
    ctx.drawImage(data.icon, padX, 50 - ICON + 4, ICON, ICON);
    textX = padX + ICON + 12;
  }
  ctx.fillStyle = '#e7eaf0';
  ctx.font = `700 26px ${FONT}`;
  ctx.fillText(data.title, textX, 50);
  if (data.subtitle) {
    ctx.fillStyle = '#8b93a3';
    ctx.font = `400 16px ${FONT}`;
    ctx.fillText(data.subtitle, textX, 78);
  }
  ctx.fillStyle = '#8b93a3';
  ctx.font = `400 13px ${FONT}`;
  ctx.fillText(
    'relative to #1 DPS (1.00 = top) · 180s · nikke-sim',
    textX,
    102
  );
  // §6.6: a windowed chart states its window in the header — this is what makes
  // "labels normalized to population #1, bars scaled to window max" unambiguous.
  if (windowed) {
    ctx.textAlign = 'right';
    ctx.fillText(
      `ranks ${win.start + 1}–${win.end} of ${data.bars.length}`,
      W - padX,
      102
    );
    ctx.textAlign = 'left';
  }

  // Bar LENGTHS scale to the window's max so a deep window stays readable; the
  // value labels below use topDps (population #1) so they mean the same thing in
  // every image. For an unwindowed chart the window max IS the population max.
  const maxDps = Math.max(...bars.map((b) => b.dps), 1);
  const hasPortraits = bars.some((b) => b.img);
  const labelW = hasPortraits ? 210 : 168; // rank (+ portrait) + name column
  const barX = padX + labelW;
  const valueW = 96;
  const barW = W - barX - valueW - padX;
  const PORTRAIT = 40;

  // Rank-column width: two-digit absolute ranks (windowed boards) are wider than
  // the single-digit ranks the fixed +20 offset assumed — measure the widest
  // label and shift the portrait/name columns so ranks never render under art.
  ctx.font = `700 16px ${FONT}`;
  const rankW = Math.max(
    ...bars.map((_, i) => ctx.measureText(`#${win.start + i + 1}`).width)
  );
  const portraitX = padX + Math.max(rankW + 6, 20);

  bars.forEach((b, i) => {
    const y = HEAD_H + i * ROW_H;
    const col = ELEMENT_COLORS[b.element] ?? '#9aa3b2';

    // absolute population rank (window offset applied)
    ctx.textAlign = 'left';
    ctx.fillStyle = '#5b6472';
    ctx.font = `700 16px ${FONT}`;
    ctx.fillText(`#${win.start + i + 1}`, padX, y + 30);

    // portrait (rounded-clipped), then name shifted right to make room. Portraits
    // are tall (e.g. 256×512), so crop a square from the source rather than
    // squishing the whole art into a square box — anchored 12.5% down from the top
    // to match the Sim tab's `object-position` so portraits look identical app-wide.
    if (b.img) {
      const px = portraitX;
      const py = y + (ROW_H - PORTRAIT) / 2;
      const im = b.img as {
        naturalWidth?: number;
        naturalHeight?: number;
        width?: number;
        height?: number;
      };
      const iw = im.naturalWidth ?? im.width ?? PORTRAIT;
      const ih = im.naturalHeight ?? im.height ?? PORTRAIT;
      const side = Math.min(iw, ih);
      const sx = (iw - side) / 2;
      const sy = (ih - side) * PORTRAIT_CROP_TOP; // matches CSS object-position
      ctx.save();
      roundRect(ctx, px, py, PORTRAIT, PORTRAIT, 8);
      ctx.clip();
      ctx.drawImage(b.img, sx, sy, side, side, px, py, PORTRAIT, PORTRAIT);
      ctx.restore();
    }
    const nameX = b.img ? portraitX + PORTRAIT + 12 : padX + 30;
    ctx.fillStyle = '#e7eaf0';
    ctx.font = `600 17px ${FONT}`;
    ctx.fillText(b.name + (b.advantaged ? '  ▲' : ''), nameX, y + 30);

    // track + bar
    ctx.fillStyle = '#2a2f3b';
    roundRect(ctx, barX, y + 16, barW, 20, 10);
    ctx.fill();
    ctx.fillStyle = col;
    roundRect(ctx, barX, y + 16, Math.max(6, (b.dps / maxDps) * barW), 20, 10);
    ctx.fill();

    // value: score relative to the POPULATION #1 (topDps) — same number in every
    // image regardless of window; the bar above is the one scaled to the window.
    ctx.textAlign = 'right';
    ctx.fillStyle = '#c9cede';
    ctx.font = `600 16px ${FONT}`;
    ctx.fillText(relScore(b.dps, data.topDps), W - padX, y + 31);
  });

  // compare-unit annotation
  if (data.compare) {
    const y = HEAD_H + bars.length * ROW_H;
    ctx.fillStyle = '#171b22';
    ctx.fillRect(0, y, W, COMPARE_H);
    ctx.fillStyle = '#5b9dff';
    ctx.fillRect(0, y, 4, COMPARE_H);
    const c = data.compare;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#e7eaf0';
    ctx.font = `600 16px ${FONT}`;
    ctx.fillText(c.name, padX, y + 32);
    ctx.fillStyle = '#8b93a3';
    ctx.font = `400 15px ${FONT}`;
    ctx.fillText(`rank ${c.rank} / ${c.total}`, padX + 200, y + 32);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#c9cede';
    ctx.font = `600 16px ${FONT}`;
    ctx.fillText(relScore(c.dps, data.topDps), W - padX, y + 32);
  }

  // footer — the mandatory watermark final pass (theme.ts): `footer` only adds
  // a descriptor; it can never remove or replace the nikkesim.app mark.
  drawWatermark(
    ctx,
    padX,
    H - 18,
    12,
    data.footer,
    'nikke-sim · expected-value crits · scope-lock basis · partless boss'
  );
}
