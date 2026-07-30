// Ranked bar-chart infographic renderer for the four Support Rankings boards
// (burst gen / burst CDR / sustain / buffer) — draws portraits, ranks, bars,
// and per-board value labels to a Canvas2D context. Mirrors dpsChart.ts's
// structure/conventions (same title/subtitle geometry, same portrait-crop and
// bar-track-width logic) so the two "chart" card types in the Card Builder
// read as one visual family.
//
// RankChartBar is the CANONICAL bar shape — web/src/components/RankBarChart.tsx
// (the on-page DOM/CSS version) imports this same interface rather than
// declaring its own, so web/src/rankChartBars.ts's mapping feeds both hosts
// from one source. The tooltip-only fields (badgeTitle/valueTitle/splitTitle/
// info) exist for the DOM host's hover state; this renderer just doesn't read
// them — a static PNG has no hover.
import {
  type Canvas2DLike,
  roundRect,
  fitText,
  barTrackX,
  BAR_LABEL_GAP,
  PORTRAIT_CROP_TOP,
} from './canvas2d.js';
import { FONT, ELEMENT_COLORS, drawWatermark } from './theme.js';
import {
  siteIconSizeFor,
  siteIconTopFor,
  TITLE_CAP_HEIGHT,
} from './siteIcon.js';

export interface RankChartBar {
  key: string; // slug + profile (a profiled unit appears twice on one board)
  slug: string;
  name: string;
  element: string;
  weapon: string;
  burst: string;
  imageUrl: string | null;
  img?: unknown; // pre-loaded CanvasImageSource (browser-loaded, not part of the data mapping); drawn if present
  rank: number; // 1-based over the full entry list (profiles included)
  value: number; // signed bar magnitude — negative extends left of a zero axis
  valueText: string; // primary value label ("12.3 bars", "+12.3%") — sign already applied
  valueSub?: string | null; // muted secondary under the value
  valueTitle?: string; // DOM-only tooltip on the value block
  badge?: string | null; // profile chip label ("w/ 2 MG")
  badgeTitle?: string; // DOM-only profile note tooltip
  sub?: string | null; // muted sub-line under the name
  condition?: string | null; // conditional caveat → asterisk (+ DOM-only tooltip text)
  // sustain: heal/shield/lifesteal split as stacked segment fractions of the
  // bar's own width (summing to ≤1)
  split?: [heal: number, shield: number, lifesteal: number] | null;
  splitTitle?: string; // DOM-only exact split breakdown tooltip
  info?: string | null; // DOM-only buffer typed rules → ⓘ tooltip text
}

export interface RankChartData {
  title: string;
  subtitle?: string;
  bars: RankChartBar[];
  icon?: unknown; // optional canvas-drawable image drawn beside the title
  footer?: string; // descriptor added to the watermark footer (theme.ts)
}

export const RANK_CHART_W = 900;
const PAD_X = 36;
const HEAD_H = 100;
const ROW_H = 64; // taller than dpsChart's 52 — rows can carry a sub-line AND a value-sub
const FOOT_H = 44;
const TITLE_BASELINE_Y = 50;
const TITLE_FONT_SIZE = 26;
// The icon plate is scaled so its measured bar content (not its own bounding
// box) spans the title's cap height — see core/siteIcon.ts for why.
const ICON = siteIconSizeFor(TITLE_CAP_HEIGHT[TITLE_FONT_SIZE]);

export const RANK_TITLE_ICON = {
  x: PAD_X,
  y: siteIconTopFor(TITLE_BASELINE_Y, ICON),
  size: ICON,
} as const;
export const RANK_TITLE_INK_REGION = {
  x: PAD_X + ICON + 12,
  y: 24,
  w: 420,
  h: 36,
} as const;

export function rankChartHeight(barCount: number): number {
  return HEAD_H + barCount * ROW_H + FOOT_H;
}

const SPLIT_COLORS = {
  heal: '#5fd189',
  shield: '#5b9dff',
  lifesteal: '#c98bf0',
};

export function drawRankChart(ctx: Canvas2DLike, data: RankChartData): void {
  const W = RANK_CHART_W;
  const padX = PAD_X;
  const bars = data.bars;
  const H = rankChartHeight(bars.length);

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
    ctx.drawImage(data.icon, RANK_TITLE_ICON.x, RANK_TITLE_ICON.y, ICON, ICON);
    textX = padX + ICON + 12;
  }
  ctx.fillStyle = '#e7eaf0';
  ctx.font = `700 ${TITLE_FONT_SIZE}px ${FONT}`;
  ctx.fillText(data.title, textX, TITLE_BASELINE_Y);
  if (data.subtitle) {
    ctx.fillStyle = '#8b93a3';
    ctx.font = `400 16px ${FONT}`;
    ctx.fillText(data.subtitle, textX, 78);
  }

  if (bars.length === 0) {
    drawWatermark(
      ctx,
      padX,
      H - 18,
      12,
      data.footer,
      'nikke-sim · scope-lock basis · partless boss'
    );
    return;
  }

  // Some boards (buffer) carry negative values — the zero axis sits wherever
  // 0 falls in [min, max] instead of always at the bar track's left edge.
  const min = Math.min(...bars.map((b) => b.value), 0);
  const max = Math.max(...bars.map((b) => b.value), 0);
  const span = max - min || 1;
  const hasPortraits = bars.some((b) => b.img);
  const MIN_LABEL_W = hasPortraits ? 210 : 168;
  const valueW = 120;
  const PORTRAIT = 40;
  const MAX_LABEL_W = 380;

  ctx.font = `700 16px ${FONT}`;
  const rankW = Math.max(
    ...bars.map((b) => ctx.measureText(`#${b.rank}`).width)
  );
  const portraitX = padX + Math.max(rankW + 6, 20);

  const nameX = (b: RankChartBar): number =>
    b.img ? portraitX + PORTRAIT + 12 : padX + 30;
  ctx.font = `600 17px ${FONT}`;
  const nameEnd = Math.max(
    ...bars.map(
      (b) => nameX(b) + ctx.measureText(b.name).width + (b.badge ? 90 : 0)
    ),
    0
  );
  const barX = barTrackX(nameEnd, padX + MIN_LABEL_W, padX + MAX_LABEL_W);
  const barW = W - barX - valueW - padX;
  const zeroX = barX + (min < 0 ? (-min / span) * barW : 0);

  bars.forEach((b, i) => {
    const y = HEAD_H + i * ROW_H;
    const color = ELEMENT_COLORS[b.element] ?? '#9aa3b2';

    // absolute population rank
    ctx.textAlign = 'left';
    ctx.fillStyle = '#5b6472';
    ctx.font = `700 16px ${FONT}`;
    ctx.fillText(`#${b.rank}`, padX, y + 30);

    // portrait (rounded-clipped) — same crop convention as dpsChart.ts
    if (b.img) {
      const px = portraitX;
      const py = y + (ROW_H - PORTRAIT) / 2 - 4;
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
      const sy = (ih - side) * PORTRAIT_CROP_TOP;
      ctx.save();
      roundRect(ctx, px, py, PORTRAIT, PORTRAIT, 8);
      ctx.clip();
      ctx.drawImage(b.img, sx, sy, side, side, px, py, PORTRAIT, PORTRAIT);
      ctx.restore();
    }

    // name (+ profile badge, + condition asterisk) and an optional sub-line
    ctx.fillStyle = '#e7eaf0';
    ctx.font = `600 17px ${FONT}`;
    const nameRoom = barX - nameX(b) - BAR_LABEL_GAP - (b.badge ? 90 : 0);
    const name = fitText(ctx, b.name, nameRoom);
    const nameY = b.sub ? y + 24 : y + 28;
    ctx.fillText(name, nameX(b), nameY);
    let afterName = nameX(b) + ctx.measureText(name).width;
    if (b.badge) {
      ctx.fillStyle = '#5b9dff';
      ctx.font = `600 13px ${FONT}`;
      ctx.fillText(b.badge, afterName + 8, nameY);
      afterName += 8 + ctx.measureText(b.badge).width;
    }
    if (b.condition) {
      ctx.fillStyle = '#e5cc80';
      ctx.font = `700 15px ${FONT}`;
      ctx.fillText('*', afterName + 4, nameY);
    }
    if (b.sub) {
      ctx.fillStyle = '#7d8598';
      ctx.font = `400 13px ${FONT}`;
      ctx.fillText(fitText(ctx, b.sub, nameRoom), nameX(b), y + 42);
    }

    // track + bar — clipped to the rounded track so split segments (sustain)
    // never overflow the rounded corners
    ctx.fillStyle = '#2a2f3b';
    roundRect(ctx, barX, y + 16, barW, 20, 10);
    ctx.fill();
    const barLen = Math.max(6, (Math.abs(b.value) / span) * barW);
    const barLeft = b.value < 0 ? zeroX - barLen : zeroX;
    ctx.save();
    roundRect(ctx, barX, y + 16, barW, 20, 10);
    ctx.clip();
    if (b.split) {
      const [heal, shield, lifesteal] = b.split;
      let sx = barLeft;
      const seg = (frac: number, col: string) => {
        const w = frac * barLen;
        ctx.fillStyle = col;
        ctx.fillRect(sx, y + 16, w, 20);
        sx += w;
      };
      seg(heal, SPLIT_COLORS.heal);
      seg(shield, SPLIT_COLORS.shield);
      seg(lifesteal, SPLIT_COLORS.lifesteal);
    } else {
      ctx.fillStyle = color;
      ctx.fillRect(barLeft, y + 16, barLen, 20);
    }
    ctx.restore();

    // value (+ optional muted sub-value)
    ctx.textAlign = 'right';
    ctx.fillStyle = '#c9cede';
    ctx.font = `600 16px ${FONT}`;
    ctx.fillText(b.valueText, W - padX, b.valueSub ? y + 26 : y + 30);
    if (b.valueSub) {
      ctx.fillStyle = '#7d8598';
      ctx.font = `400 12px ${FONT}`;
      ctx.fillText(b.valueSub, W - padX, y + 42);
    }
    ctx.textAlign = 'left';
  });

  drawWatermark(
    ctx,
    padX,
    H - 18,
    12,
    data.footer,
    'nikke-sim · scope-lock basis · partless boss'
  );
}
