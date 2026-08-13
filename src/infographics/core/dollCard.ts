// Doll Leveling infographic — the per-phase feeding plan the /doll page shows
// by default: which kit tier to feed at each phase step, laid out as the same
// three-column band grid the web page uses, plus the expected kit cost to
// finish. Matches the visual style of tableCard.ts / resourcesCard.ts (dark bg,
// blue accent, same font, same mandatory top-right mark).
//
// FIXED GEOMETRY, like resourcesCard.ts: the step count is known before a
// canvas exists (max phase minus the starting phase), so the card height is a
// formula over the row count rather than something measured after drawing.
//
// The PLAN itself is not computed here — core/ stays free of the model. The
// caller passes an already-solved plan (src/doll/card.ts buildDollPlan), the
// same way it passes already-loaded icons.
import { type Canvas2DLike, roundRect, fitText } from './canvas2d.js';
import {
  FONT,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  drawBrandMark,
  drawFooterNote,
  splitFooter,
  brandMarkIconRect,
} from './theme.js';

/** One "L → L+1  [Purple (SR)]" cell. */
export interface DollStepCell {
  /** Already-formatted step label, e.g. '0 → 1'. */
  label: string;
  /** Already-formatted tier label, e.g. 'Purple (SR)'. */
  tier: string;
  /** Which pill color to use — the kit tier, not the doll rarity. */
  kind: 'R' | 'SR' | 'SSR';
}

export interface DollCardData {
  title: string;
  subtitle?: string;
  icon?: unknown; // the nikkesim.app mark's icon, drawn top-right like every other card
  steps: DollStepCell[];
  /** The 'Expected kits to finish' line, pre-formatted into its three parts so
   * the renderer never does arithmetic or rounding of its own. */
  cost: { lead: string; kits: string; total: string };
  footer?: string;
}

// ---- layout geometry ----------------------------------------------------------

// Narrower than tableCard's 720: three columns of label + widest pill
// ('Purple (SR)') measure ~148px, so 720 leaves a band of dead space down the
// right edge. 640 keeps a gutter between columns and still fits the subtitle.
export const DOLL_CARD_W = 640;
const PAD_X = 32;
const HEAD_H = 96; // title + subtitle band, matches the other cards
const TITLE_BASELINE_Y = 44;
const TITLE_FONT_SIZE = 24;
// Bottom pad — only the footer NOTE lands here now (see tableCard.ts's FOOT_H).
const FOOT_H = 22;

export const DOLL_GRID_COLS = 3;
const GRID_TOP_GAP = 4;
const ROW_H = 30;
const LABEL_W = 62; // '10 → 11' at 13px, with room before the pill
const PILL_H = 21;
const PILL_PAD_X = 9;
const PILL_RADIUS = 10;
const COST_GAP = 24; // grid → the expected-kits line
const COST_H = 26;

// Kit-tier pill colors — the same three the web page's tierChip uses, so the
// card and the page read as the same chart.
const PILL_COLOR: Record<DollStepCell['kind'], string> = {
  R: '#4f7fe0',
  SR: '#7d5fd0',
  SSR: '#c79a2e',
};

/** Rows in the 3-column grid for a given step count (columns fill top to
 * bottom, so each column is a checkpoint band). */
export function dollGridRows(stepCount: number): number {
  return Math.ceil(stepCount / DOLL_GRID_COLS);
}

export function dollCardHeight(stepCount: number): number {
  return (
    HEAD_H +
    GRID_TOP_GAP +
    dollGridRows(stepCount) * ROW_H +
    COST_GAP +
    COST_H +
    FOOT_H
  );
}

// Ink-guard geometry (see node/render.ts assertTitleInk) — starts at the
// title's textX, which is padX now that the mark sits top-right.
export const DOLL_TITLE_ICON = brandMarkIconRect(DOLL_CARD_W, PAD_X);
export const DOLL_TITLE_INK_REGION = {
  x: PAD_X,
  y: 16,
  w: 340,
  h: 34,
} as const;

function drawPill(
  ctx: Canvas2DLike,
  x: number,
  baselineY: number,
  maxW: number,
  cell: DollStepCell
): void {
  ctx.font = `600 11px ${FONT}`;
  const text = fitText(ctx, cell.tier, maxW - PILL_PAD_X * 2);
  const w = ctx.measureText(text).width + PILL_PAD_X * 2;
  ctx.fillStyle = PILL_COLOR[cell.kind];
  roundRect(ctx, x, baselineY - PILL_H + 6, w, PILL_H, PILL_RADIUS);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, x + PILL_PAD_X, baselineY);
}

export function drawDollCard(ctx: Canvas2DLike, data: DollCardData): void {
  const W = DOLL_CARD_W;
  const H = dollCardHeight(data.steps.length);

  ctx.fillStyle = '#101216';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#5b9dff';
  ctx.fillRect(0, 0, W, 5);

  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  const { mark, note } = splitFooter(data.footer, 'nikke-sim');
  const markLeft = drawBrandMark(ctx, {
    right: W - PAD_X,
    text: mark,
    icon: data.icon,
  });
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

  // COLUMN-MAJOR fill, matching the web page: with 15 steps in 5 rows each
  // column is a checkpoint band (0–5 / 5–10 / 10–15). Filling row-major
  // instead would interleave the bands and lose that reading.
  const rows = dollGridRows(data.steps.length);
  const colW = (W - PAD_X * 2) / DOLL_GRID_COLS;
  const gridTop = HEAD_H + GRID_TOP_GAP;
  data.steps.forEach((cell, i) => {
    const col = Math.floor(i / rows);
    const row = i % rows;
    const x = PAD_X + col * colW;
    const baselineY = gridTop + row * ROW_H + 20;
    ctx.textAlign = 'left';
    ctx.fillStyle = TEXT_SECONDARY;
    ctx.font = `400 13px ${FONT}`;
    ctx.fillText(fitText(ctx, cell.label, LABEL_W), x, baselineY);
    drawPill(ctx, x + LABEL_W, baselineY, colW - LABEL_W - 16, cell);
  });

  const y = gridTop + rows * ROW_H + COST_GAP + 16;
  ctx.textAlign = 'left';
  ctx.fillStyle = TEXT_SECONDARY;
  ctx.font = `400 14px ${FONT}`;
  ctx.fillText(data.cost.lead, PAD_X, y);
  let x = PAD_X + ctx.measureText(data.cost.lead).width + 6;
  ctx.fillStyle = TEXT_PRIMARY;
  ctx.font = `700 14px ${FONT}`;
  ctx.fillText(data.cost.kits, x, y);
  x += ctx.measureText(data.cost.kits).width + 8;
  ctx.fillStyle = TEXT_SECONDARY;
  ctx.font = `400 13px ${FONT}`;
  ctx.fillText(data.cost.total, x, y);

  // footer — the descriptor's NOTE only; the mandatory mark is in the title row
  // (theme.ts drawBrandMark).
  drawFooterNote(ctx, PAD_X, H - 8, 12, note);
}
