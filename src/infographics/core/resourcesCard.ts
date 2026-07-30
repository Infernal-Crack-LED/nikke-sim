// Resource Calculator infographic — one "Daily income" section per boss
// family (kraken, then other — BOSS_TABLES order in core/resourcesData.ts),
// each reproducing the web page's res-heading/res-stats/res-detail block for
// the chosen tier, stacked top to bottom. Matches the visual style of
// tableCard.ts (dark bg, blue accent, same font, same mandatory watermark).
//
// FIXED GEOMETRY, like unitCard.ts: the section count and each section's tile
// count are known ahead of a canvas existing (BOSS_TABLES.length bosses, a
// tile per drop the boss pays), so the card height is a formula over those
// counts rather than something measured after drawing — the detail paragraph
// is a fixed-line clamped box (wrapText), never a grow-to-fit one.
import { type Canvas2DLike, roundRect, fitText, wrapText } from './canvas2d.js';
import {
  FONT,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_DIM,
  drawWatermark,
} from './theme.js';
import {
  BOSS_TABLES,
  RUNS_PER_DAY,
  avgModuleQtyPerDrop,
  expectedModulesPerRun,
  type BossTable,
  type ModuleBoss,
  type StageDrops,
} from './resourcesData.js';

// Icons are passed in ALREADY LOADED (platform-free like the rest of core/):
// the Node host rasterizes them via node/icons.ts, the browser hands over
// <img> elements. A missing icon just draws no icon — never throws.
export interface ResourcesIcons {
  module?: unknown;
  gear?: unknown;
  lock?: unknown;
  fodder?: unknown;
  fragmentByBoss: Partial<Record<ModuleBoss, unknown>>;
}

export interface ResTileData {
  label: string;
  icon?: unknown;
  value: string;
  valueNote?: string; // parenthesized secondary total (kraken's fragment-converted total)
  sub: string;
  main?: boolean; // the headline tile (custom modules) — drawn in the accent color
}

export interface ResSectionData {
  heading: string; // "Daily income — Kraken"
  headingSub: string; // "Tier 9 · 3 runs/day"
  tiles: ResTileData[];
  detail: string; // the res-detail prose, plain (no inline bold spans)
}

export interface ResourcesCardData {
  title: string;
  subtitle?: string;
  icon?: unknown; // the nikkesim.app mark, drawn beside the title like every other card
  sections: ResSectionData[]; // one per BOSS_TABLES entry, in that order
  footer?: string;
}

const pct = (p: number): string => `${(p * 100).toFixed(2)}%`;

// Mirrors web/src/ResourcesPage.tsx's res-detail paragraph exactly (the
// per-run breakdown sentence, plus the T9-gear sentence when the boss pays
// gear) — the render-side prose is the SAME text, just without the JSX bold
// spans (a wrapped canvas paragraph clamps to DETAIL_MAX_LINES either way).
function buildDetailText(stage: StageDrops): string {
  const breakdown = stage.moduleBreakdown
    .map((b) => `×${b.qty} ${pct(b.p)}`)
    .join(' · ');
  let text =
    `Per run: ${pct(stage.moduleDropRate)} chance a module drops — then ` +
    `${breakdown} (avg ${avgModuleQtyPerDrop(stage).toFixed(2)} per drop).`;
  if (stage.gearRate !== null) {
    text += ` T9 gear drops at ${pct(stage.gearRate)} per run (1 piece when it drops).`;
  }
  return text;
}

// Mirrors ResourcesPage.tsx's `tiles` construction: modules always first (with
// the kraken fragment-conversion total riding as a parenthesized note), then
// gear only for bosses that drop it, then the boss's fragment, locks, and XP
// fodder — always in that order.
function buildSection(
  table: BossTable,
  tier: number,
  icons: ResourcesIcons
): ResSectionData {
  const stage =
    table.stages.find((s) => s.stage === tier) ??
    table.stages[table.stages.length - 1];
  const perRun = expectedModulesPerRun(stage);
  const modulesPerDay = perRun * RUNS_PER_DAY;
  const krakenTotal =
    table.key === 'kraken'
      ? modulesPerDay + (stage.fragments * RUNS_PER_DAY) / 100
      : null;

  const tiles: ResTileData[] = [
    {
      label: 'Custom modules',
      icon: icons.module,
      value: modulesPerDay.toFixed(2),
      valueNote:
        krakenTotal !== null ? `(${krakenTotal.toFixed(2)})` : undefined,
      sub: `expected / day · ${perRun.toFixed(2)} per run`,
      main: true,
    },
  ];
  if (stage.gearRate !== null) {
    tiles.push({
      label: 'T9 gear',
      icon: icons.gear,
      value: (stage.gearRate * RUNS_PER_DAY).toFixed(2),
      sub: `1 per drop · ${pct(stage.gearRate)} per run`,
    });
  }
  tiles.push(
    {
      label: table.fragmentLabel,
      icon: icons.fragmentByBoss[table.key],
      value: String(stage.fragments * RUNS_PER_DAY),
      sub: `${stage.fragments} per run · guaranteed`,
    },
    {
      label: 'Locks',
      icon: icons.lock,
      value: String(stage.locks * RUNS_PER_DAY),
      sub: `${stage.locks} per run`,
    },
    {
      label: 'XP fodder',
      icon: icons.fodder,
      value: String(stage.xpFodder * RUNS_PER_DAY),
      sub: `${stage.xpFodder} per run`,
    }
  );

  return {
    heading: `Daily income — ${table.fullName}`,
    headingSub: `Tier ${stage.stage} · ${RUNS_PER_DAY} runs/day`,
    tiles,
    detail: buildDetailText(stage),
  };
}

// BOSS_TABLES order is kraken-then-other (resourcesData.ts) — sections render
// in that same order, kraken's block on top.
export function buildResourcesCard(
  tier: number,
  icons: ResourcesIcons
): ResourcesCardData {
  return {
    title: 'Resource Calculator',
    subtitle: `Tier ${tier} daily income`,
    sections: BOSS_TABLES.map((table) => buildSection(table, tier, icons)),
    footer: 'nikkesim.app/resources',
  };
}

// ---- layout geometry ----------------------------------------------------------

// Wider than tableCard's 720: the "other bosses" section carries 5 tiles
// (modules, gear, fragments, locks, XP fodder) and 720 crushes them below the
// ~150px each needs to hold their label/sub without ellipsizing.
export const RESOURCES_CARD_W = 940;
const PAD_X = 32;
const HEAD_H = 96; // icon + title + subtitle band, matches tableCard's HEAD_H
const TITLE_BASELINE_Y = 44;
const TITLE_FONT_SIZE = 24;
// The title text's CAP HEIGHT (measured directly off a rendered "R" glyph at
// this font/weight/size: 700 24px Roboto draws ink from y=27 to y=43 against
// a baseline of 44 — a 17px cap height, not the full 24px font size).
const TITLE_CAP_HEIGHT = 17;

// src/infographics/assets/nikkesim-icon.png is a 256×256 canvas, but the
// actual bar art is NOT the full square — it's a rounded, transparent-
// cornered PLATE with the bars drawn inset inside it (measured 2026-07-29 by
// scanning for pixels off the plate's own background fill: the bars occupy
// y=52..211 of the 256px source, an 0.625 fraction of the height, centered).
// Sizing/positioning the drawn image by ITS OWN bounding box (what the first
// pass here did) puts the PLATE'S edges on the title's cap height, not the
// bars' — the bars end up visibly smaller and offset. Scaling the whole
// plate so this measured content band lands on
// [baseline - TITLE_CAP_HEIGHT, baseline] instead makes the visible bars —
// not the plate — match the title's cap height.
const ICON_CONTENT_FRAC_TOP = 52 / 256;
const ICON_CONTENT_FRAC_BOTTOM = 212 / 256;
const ICON =
  TITLE_CAP_HEIGHT / (ICON_CONTENT_FRAC_BOTTOM - ICON_CONTENT_FRAC_TOP);
const FOOT_H = 40;

const SECTION_TOP_GAP = 20; // space above a section's heading
const HEADING_H = 24; // heading line height
const TILES_GAP = 12; // heading → tile row
const TILE_H = 92;
const TILE_GAP = 10; // between tiles in a row
const DETAIL_GAP = 14; // tile row → detail paragraph
const DETAIL_LINE_H = 18;
const DETAIL_MAX_LINES = 2; // clamped, like unitCard.ts's notes panel

const SECTION_H =
  SECTION_TOP_GAP +
  HEADING_H +
  TILES_GAP +
  TILE_H +
  DETAIL_GAP +
  DETAIL_MAX_LINES * DETAIL_LINE_H;

export function resourcesCardHeight(sectionCount: number): number {
  return HEAD_H + sectionCount * SECTION_H + FOOT_H;
}

// Ink-guard geometry (see node/render.ts assertTitleInk / tableCard.ts's
// TABLE_TITLE_INK_REGION comment) — starts at the title's textX, past the icon.
export const RESOURCES_TITLE_ICON = {
  x: PAD_X,
  // Positions the drawn PLATE so its measured bar-content band — not its own
  // bounding box — has its bottom edge on the title's baseline.
  y: TITLE_BASELINE_Y - ICON_CONTENT_FRAC_BOTTOM * ICON,
  size: ICON,
} as const;
export const RESOURCES_TITLE_INK_REGION = {
  x: PAD_X + ICON + 12,
  y: 16,
  w: 340,
  h: 34,
} as const;

function drawTile(
  ctx: Canvas2DLike,
  x: number,
  y: number,
  w: number,
  h: number,
  tile: ResTileData
): void {
  ctx.fillStyle = '#171a21';
  roundRect(ctx, x, y, w, h, 10);
  ctx.fill();
  if (tile.main) {
    ctx.fillStyle = '#5b9dff';
    ctx.fillRect(x + 10, y, w - 20, 2);
  }

  const px = x + 14;
  const maxW = w - 28;
  ctx.textAlign = 'left';
  ctx.fillStyle = TEXT_DIM;
  ctx.font = `600 11px ${FONT}`;
  let ty = y + 21;
  ctx.fillText(fitText(ctx, tile.label.toUpperCase(), maxW), px, ty);

  const iconSize = 20;
  ty += 24;
  let vx = px;
  if (tile.icon) {
    ctx.drawImage(tile.icon, vx, ty - iconSize + 3, iconSize, iconSize);
    vx += iconSize + 6;
  }
  ctx.fillStyle = tile.main ? '#5b9dff' : TEXT_PRIMARY;
  ctx.font = `700 20px ${FONT}`;
  const valueText = fitText(ctx, tile.value, x + w - 14 - vx);
  ctx.fillText(valueText, vx, ty);
  if (tile.valueNote) {
    const valueW = ctx.measureText(valueText).width;
    ctx.fillStyle = TEXT_SECONDARY;
    ctx.font = `600 12px ${FONT}`;
    ctx.fillText(
      fitText(ctx, ` ${tile.valueNote}`, x + w - 14 - vx - valueW),
      vx + valueW,
      ty
    );
  }

  ty += 24;
  ctx.fillStyle = TEXT_SECONDARY;
  ctx.font = `400 11px ${FONT}`;
  ctx.fillText(fitText(ctx, tile.sub, maxW), px, ty);
}

function drawSection(
  ctx: Canvas2DLike,
  y0: number,
  w: number,
  section: ResSectionData
): void {
  let y = y0 + SECTION_TOP_GAP;

  ctx.textAlign = 'left';
  ctx.fillStyle = TEXT_PRIMARY;
  ctx.font = `700 16px ${FONT}`;
  ctx.fillText(section.heading, PAD_X, y + 14);
  const headingW = ctx.measureText(section.heading).width;
  ctx.fillStyle = TEXT_SECONDARY;
  ctx.font = `400 12px ${FONT}`;
  ctx.fillText(section.headingSub, PAD_X + headingW + 10, y + 14);
  y += HEADING_H + TILES_GAP;

  const tiles = section.tiles;
  const tileW = (w - PAD_X * 2 - TILE_GAP * (tiles.length - 1)) / tiles.length;
  tiles.forEach((tile, i) => {
    drawTile(ctx, PAD_X + i * (tileW + TILE_GAP), y, tileW, TILE_H, tile);
  });
  y += TILE_H + DETAIL_GAP;

  ctx.fillStyle = TEXT_SECONDARY;
  ctx.font = `400 13px ${FONT}`;
  const lines = wrapText(ctx, section.detail, w - PAD_X * 2, DETAIL_MAX_LINES);
  lines.forEach((line, i) => ctx.fillText(line, PAD_X, y + i * DETAIL_LINE_H));
}

export function drawResourcesCard(
  ctx: Canvas2DLike,
  data: ResourcesCardData
): void {
  const W = RESOURCES_CARD_W;
  const H = resourcesCardHeight(data.sections.length);

  ctx.fillStyle = '#101216';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#5b9dff';
  ctx.fillRect(0, 0, W, 5);

  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  let textX = PAD_X;
  if (data.icon) {
    ctx.drawImage(
      data.icon,
      RESOURCES_TITLE_ICON.x,
      RESOURCES_TITLE_ICON.y,
      ICON,
      ICON
    );
    textX = PAD_X + ICON + 12;
  }
  ctx.fillStyle = '#e7eaf0';
  ctx.font = `700 ${TITLE_FONT_SIZE}px ${FONT}`;
  ctx.fillText(data.title, textX, TITLE_BASELINE_Y);
  if (data.subtitle) {
    ctx.fillStyle = '#8b93a3';
    ctx.font = `400 14px ${FONT}`;
    ctx.fillText(data.subtitle, textX, 68);
  }

  let y = HEAD_H;
  data.sections.forEach((section) => {
    drawSection(ctx, y, W, section);
    y += SECTION_H;
  });

  drawWatermark(ctx, PAD_X, H - 16, 12, data.footer, 'nikke-sim');
}
