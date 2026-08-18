// Per-character card renderer — the /nikke embed and the Twitter launch asset
// for a new character. Phases 4a/4b of
// docs/handoffs/2026-07-28-unit-card-infographic-plan.md.
//
// TWO VARIANTS, ONE DATA BUILDER (ruling 15). `discord` is 2:1 landscape for the
// bot embed and the site; `twitter` is 3:4 portrait for the X timeline. The
// owner's ruling is explicit that the landscape card is NOT to be compromised to
// survive X's crop, so the layouts are separate functions over the same
// UnitCardModel (core/unitCardData.ts) rather than one responsive layout.
//
// ── The constraints that actually drive this layout ──────────────────────────
//
// FIXED GEOMETRY (ruling 2). Every card emits at the same size regardless of how
// much data the unit has. A board that doesn't rank the unit still draws its
// tile at full size, greyed, reading '—'. Nothing is ever omitted and nothing
// reflows — that is what lets ~195 cards be posted as a consistent series, and
// it is why the notes panel is a clamped fixed-height box rather than one that
// grows with the prose.
//
// LEGIBLE AT 45% SCALE (§3). Both Discord's embed and X's in-timeline render are
// ~500-550px wide, so a 1200-logical card is seen at ~45%. The character NAME
// and the three RANK NUMERALS must read at that scale; bar labels, tags and the
// notes panel may require a click. This is why the numerals are enormous and sit
// in the opposite corner from the name.
//
// TWO COLOUR SYSTEMS THAT NEVER TOUCH (ruling 12). Rank colours (theme.ts
// RANK_COLORS) apply to the tile NUMERAL only; bars are ELEMENT-coloured, the
// same hexes the site's RankBarChart/DpsBarChart use.
//
// PLATFORM-FREE like the rest of core/: images (portrait, icons, site logo) are
// passed in ALREADY LOADED. The Node host rasterizes icons via
// node/icons.ts (sharp); the browser hands over <img> elements. A missing image
// degrades to a drawn placeholder — it never throws and never reflows.
import {
  type Canvas2DLike,
  roundRect,
  fitText,
  wrapText,
  drawContained,
  PORTRAIT_CROP_TOP,
} from './canvas2d.js';
import {
  FONT,
  ELEMENT_COLORS,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_DIM,
  rankColor,
  drawBrandMark,
} from './theme.js';
import type { UnitCardModel, RankTile, BarChart } from './unitCardData.js';

// ---- variants ----------------------------------------------------------------

export type UnitCardVariant = 'discord' | 'twitter';

// Landscape: 2:1, rendered at dpr 2 → 2400×1200 physical.
export const UNIT_CARD_W = 1200;
export const UNIT_CARD_H = 600;

// Portrait: 3:4 (owner-approved 2026-07-28 over the measured-safe 4:5 — 4:5 was
// confirmed uncropped in the X timeline and 3:4 is the next step out, buying
// 100px of vertical budget the stack in §6c needs).
//
// Rendered at dpr 1: X displays it ~500-600px wide in-timeline, so 1200×1600
// physical is already ~2x the display width. Rendering at 2400×3200 would cost
// ~4x the bytes for pixels nothing consumes.
export const UNIT_CARD_PORTRAIT_W = 1200;
export const UNIT_CARD_PORTRAIT_H = 1600;

// Unit cards ship as LOSSY WEBP (§12, build-infographics.ts) — it is the only
// ~200-file kind and q90 measured −86% vs PNG. The constant lives here, not in the
// build script, because the BROWSER fallback renderer has to encode at the same
// quality: a lossless PNG preview does not look like the lossy file production
// serves, and small text is exactly where q90 shows. Scales differ by host —
// @napi-rs/canvas toBuffer takes 0-100, the browser's toDataURL takes 0-1 — so
// each host converts, but from ONE number.
export const UNIT_CARD_WEBP_QUALITY = 90;

export const unitCardSize = (
  variant: UnitCardVariant
): { w: number; h: number; dpr: number } =>
  variant === 'twitter'
    ? { w: UNIT_CARD_PORTRAIT_W, h: UNIT_CARD_PORTRAIT_H, dpr: 1 }
    : { w: UNIT_CARD_W, h: UNIT_CARD_H, dpr: 2 };

// ---- tunables (owner polish pass — see docs/handoffs/QUEUE.md) --------------

const PAD = 36; // landscape card padding
const PAD_P = 48; // portrait card padding — more air at the larger canvas

// X rounds the image corners in-timeline, measured at ~2-2.5% of image width
// (≈24-30px at 1200 wide). Both paddings clear that comfortably; this constant
// exists so the check is explicit rather than incidental.
export const X_CORNER_RADIUS_PCT = 0.025;

const BG = '#101216';
const PANEL = '#171a21'; // tile / notes panel fill
const PANEL_EDGE = '#242936';

const LEFT_COL_FRAC = 0.62; // landscape: detail column vs the tiles/notes column
const COL_GUTTER = 24;

const PORTRAIT_ART = 112; // landscape title-bar art
const PORTRAIT_ART_P = 190; // portrait title-bar art
const ICON_SIZE = 44; // landscape icon strip
const ICON_SIZE_P = 60; // portrait icon strip

const TILE_GAP = 12;
const BAR_ROW_H = 34;
const BAR_ROW_H_P = 46;

// ---- render input ------------------------------------------------------------

export interface UnitCardIcons {
  element?: unknown;
  burst?: unknown;
  class?: unknown;
  manufacturer?: unknown;
  weapon?: unknown;
}

export interface UnitCardData {
  model: UnitCardModel;
  portrait?: unknown; // pre-loaded character art
  icons?: UnitCardIcons;
  siteIcon?: unknown; // nikkesim-icon.png, the second (prominent) mark
  footer?: string; // unused by the mark, which is always the bare domain
}

// Ink-guard geometry (see node/render.ts assertTitleInk). MUST cover text and
// only text — a region that includes the portrait or the logo passes on art
// pixels alone with zero glyphs, which was the original vacuous-guard bug. These
// start at the NAME's x, past both.
export const UNIT_TITLE_INK_REGION = {
  x: PAD + PORTRAIT_ART + 20,
  y: PAD + 8,
  w: 420,
  h: 40,
} as const;
export const UNIT_PORTRAIT_TITLE_INK_REGION = {
  x: PAD_P + PORTRAIT_ART_P + 24,
  y: PAD_P + 26,
  w: 460,
  h: 48,
} as const;

// ---- small drawing helpers ---------------------------------------------------

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function panel(ctx: Canvas2DLike, r: Rect, radius = 12): void {
  ctx.fillStyle = PANEL;
  roundRect(ctx, r.x, r.y, r.w, r.h, radius);
  ctx.fill();
}

// drawContained (aspect-preserving fit into a box — icons are not uniformly
// square, so a stretch-to-fit would distort the artwork) lives in canvas2d.ts:
// the mark's icon draw shares it with every other card.

// Character art, square-cropped and element-ringed. Degrades to a tinted box
// with the name's initial — the existing path, kept because ~all pre-release
// units will hit it.
function drawArt(
  ctx: Canvas2DLike,
  r: Rect,
  img: unknown,
  col: string,
  initial: string
): void {
  ctx.fillStyle = col;
  roundRect(ctx, r.x - 4, r.y - 4, r.w + 8, r.h + 8, 16);
  ctx.fill();
  ctx.save();
  roundRect(ctx, r.x, r.y, r.w, r.h, 13);
  ctx.clip();
  ctx.fillStyle = '#1f232d';
  ctx.fillRect(r.x, r.y, r.w, r.h);
  if (img) {
    const im = img as {
      naturalWidth?: number;
      naturalHeight?: number;
      width?: number;
      height?: number;
    };
    const iw = im.naturalWidth ?? im.width ?? r.w;
    const ih = im.naturalHeight ?? im.height ?? r.h;
    const side = Math.min(iw, ih);
    ctx.drawImage(
      img,
      (iw - side) / 2,
      (ih - side) * PORTRAIT_CROP_TOP,
      side,
      side,
      r.x,
      r.y,
      r.w,
      r.h
    );
  } else {
    ctx.fillStyle = col;
    ctx.globalAlpha = 0.22;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.globalAlpha = 1;
    ctx.fillStyle = col;
    ctx.font = `700 ${Math.round(r.h * 0.42)}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(initial, r.x + r.w / 2, r.y + r.h / 2 + r.h * 0.15);
    ctx.textAlign = 'left';
  }
  ctx.restore();
}

// ---- sections ----------------------------------------------------------------

// Title bar: logo, art, name, release date. The name is the single most
// important thing on the card at timeline scale, so it gets the largest type
// that fits and steps down rather than wrapping.
function drawTitle(
  ctx: Canvas2DLike,
  r: Rect,
  d: UnitCardData,
  art: number,
  nameSizes: number[]
): void {
  const m = d.model;
  const col = ELEMENT_COLORS[m.element] ?? '#9aa3b2';
  drawArt(
    ctx,
    { x: r.x, y: r.y, w: art, h: art },
    d.portrait,
    col,
    (m.name[0] ?? '?').toUpperCase()
  );

  const big = art >= PORTRAIT_ART_P;
  const textX = r.x + art + (big ? 24 : 20);
  // The mark sits at the FAR RIGHT of the title row: the wordmark in accent blue
  // with the site icon to its right. This IS the card's watermark now (owner,
  // 2026-07-28) — it replaced the muted grey footer line, which was the least
  // legible text on the card at timeline scale while the title row is where the
  // eye already is. The wordmark draws unconditionally; the icon is optional
  // (the browser preview has no icon to hand), so a missing icon thins the mark
  // rather than dropping it.
  //
  // The icon scales with the variant — a fixed 40px read as an afterthought on
  // the portrait canvas, where everything around it is roughly 1.6× larger.
  const markLeft = drawBrandMark(ctx, {
    right: r.x + r.w,
    top: r.y + (big ? 4 : 2),
    icon: d.siteIcon,
    iconSize: big ? 60 : 40,
    fontSize: big ? 22 : 15,
    gap: big ? 12 : 8,
    baselineOffset: big ? 32 : 24,
  });
  const nameMax = markLeft - 20 - textX;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  let name = m.name;
  for (const size of nameSizes) {
    ctx.font = `700 ${size}px ${FONT}`;
    name = m.name;
    if (ctx.measureText(name).width <= nameMax) {
      break;
    }
    if (size === nameSizes[nameSizes.length - 1]) {
      name = fitText(ctx, m.name, nameMax);
    }
  }
  const nameBase = r.y + Math.round(art * 0.36);
  ctx.fillStyle = TEXT_PRIMARY;
  ctx.fillText(name, textX, nameBase);

  // Release date — nullable (2 units upstream have none, and an unreleased
  // character has none by definition). Absent → the line simply isn't drawn;
  // the space stays reserved, so no reflow (§11).
  // Class and manufacturer USED to sit here too; they were dropped in the polish
  // pass (owner, 2026-07-28) because the icon strip directly below already states
  // both, with the icon and the label — the line was a second, weaker copy.
  ctx.font = `400 ${art >= PORTRAIT_ART_P ? 20 : 15}px ${FONT}`;
  ctx.fillStyle = TEXT_SECONDARY;
  const sub = m.releaseDate ? `Released ${m.releaseDate}` : '';
  ctx.fillText(
    fitText(ctx, sub, nameMax),
    textX,
    nameBase + (art >= PORTRAIT_ART_P ? 34 : 26)
  );

  if (m.prerelease) {
    ctx.font = `700 ${art >= PORTRAIT_ART_P ? 16 : 12}px ${FONT}`;
    ctx.fillStyle = '#e5cc80';
    ctx.fillText(
      'UNRELEASED — PROJECTED',
      textX,
      nameBase + (art >= PORTRAIT_ART_P ? 64 : 48)
    );
  }
}

// Per-family inset: every icon is drawn into an identical box, and the box is
// inset by family before the art is fitted, so the strip reads with even optical
// weight instead of each family's own margins deciding how big it looks. The
// pattern is the team builder's filter row
// (web/src/components/CharacterGrid.tsx), which insets its 40px button by 8 for
// burst and 4 for code/class/manufacturer, weapon not at all.
//
// Burst and class take the FULL box: their assets are tightly cropped, with no
// transparent margin to compensate for. Element and manufacturer are the older
// rasters and still carry theirs.
const ICON_FIT: Record<string, number> = {
  burst: 1,
  element: 0.8,
  class: 1,
  manufacturer: 0.8,
  weapon: 1,
};

// Icon strip: burst · CDR (text) · element · weapon · class · manufacturer · RL3.
// Burst CDR has no icon by ruling 11 and renders as text.
function drawIconStrip(
  ctx: Canvas2DLike,
  r: Rect,
  d: UnitCardData,
  size: number
): void {
  const m = d.model;
  const icons = d.icons ?? {};
  const items: { img?: unknown; text?: string; label: string; fit?: number }[] =
    [
      { img: icons.burst, label: `B${m.burst}`, fit: ICON_FIT.burst },
      {
        text: m.burstCooldownSec != null ? `${m.burstCooldownSec}s` : '—',
        label: 'CD',
      },
      { img: icons.element, label: m.element, fit: ICON_FIT.element },
      { img: icons.weapon, label: m.weapon, fit: ICON_FIT.weapon },
      { img: icons.class, label: m.class, fit: ICON_FIT.class },
      {
        fit: ICON_FIT.manufacturer,
        img: icons.manufacturer,
        // The 4 overspec units keep the distinction visible rather than having it
        // silently dropped when the icon name is resolved (§10.2c).
        label: m.overspec
          ? `${m.manufacturerBase} OS`
          : (m.manufacturerBase ?? '—'),
      },
    ];

  const cell = r.w / items.length;
  const labelSize = size >= ICON_SIZE_P ? 15 : 12;
  items.forEach((item, i) => {
    const cx = r.x + cell * i + cell / 2;
    // The BOX is constant across the strip (so labels and baselines line up);
    // only the art inside it is inset, which is what equalizes optical weight.
    const fit = item.fit ?? 1;
    const inner = size * fit;
    const box = {
      x: cx - inner / 2,
      y: r.y + (size - inner) / 2,
      w: inner,
      h: inner,
    };
    if (item.img) {
      drawContained(ctx, item.img, box);
    } else if (item.text) {
      ctx.textAlign = 'center';
      ctx.fillStyle = TEXT_PRIMARY;
      ctx.font = `700 ${Math.round(size * 0.46)}px ${FONT}`;
      ctx.fillText(item.text, cx, r.y + size * 0.66);
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = TEXT_DIM;
    ctx.font = `600 ${labelSize}px ${FONT}`;
    ctx.fillText(
      fitText(ctx, item.label, cell - 6),
      cx,
      r.y + size + labelSize + 4
    );
  });
  ctx.textAlign = 'left';
}

// Vertical advances BELOW the numeral's baseline, in draw order. Kept as one
// list so the height measurement and the drawing can never disagree about the
// spacing — the tile is centred by measuring it first, and a second copy of
// these numbers would silently drift.
function tileAdvances(tile: RankTile, big: boolean): number[] {
  if (tile.rank == null) {
    return [big ? 30 : 22]; // 'Unranked'
  }
  const out = [big ? 34 : 24]; // → value
  const sublines: number[] = [];
  if (tile.sub) {
    sublines.push(big ? 22 : 16);
  }
  if (tile.profileChip) {
    sublines.push(big ? 21 : 15);
  }
  if (tile.altRank != null) {
    sublines.push(0); // last line advances nothing
  }
  if (sublines.length) {
    out.push(big ? 24 : 18); // → first sub-line
    out.push(...sublines.slice(0, -1));
  }
  return out;
}

// How tall a tile's content block is, numeral cap-height included.
function tileBlockHeight(tile: RankTile, big: boolean): number {
  const ascent = (big ? 74 : 46) * 0.72;
  return ascent + tileAdvances(tile, big).reduce((a, b) => a + b, 0);
}

// A ranking tile. The rank NUMERAL is the headline — huge, rank-coloured, and
// the one element besides the name that must survive a 45% downscale.
//
// `blockH` is the height of the TALLEST block in the row, not this tile's own:
// the content is centred against that shared height so all three numerals land
// on one line (owner, 2026-07-28). Centring each tile independently would push
// the profiled tile's numeral off the line the other two sit on, and the row of
// numerals is the first thing read at timeline scale.
function drawTile(
  ctx: Canvas2DLike,
  r: Rect,
  tile: RankTile,
  big: boolean,
  blockH: number
): void {
  panel(ctx, r);
  ctx.fillStyle = PANEL_EDGE;
  ctx.fillRect(r.x + 10, r.y + (big ? 34 : 26), r.w - 20, 1);

  const cx = r.x + r.w / 2;
  ctx.textAlign = 'center';

  ctx.fillStyle = TEXT_SECONDARY;
  ctx.font = tileTitleFont(big);
  ctx.fillText(
    fitText(ctx, tile.title.toUpperCase(), r.w - TILE_TITLE_PAD),
    cx,
    r.y + (big ? 24 : 18)
  );

  // Unranked draws at FULL SIZE with an em dash — never an omitted or shrunken
  // tile (ruling 2). TEXT_DIM keeps "no data" visually distinct from any real
  // placement colour.
  const numeralSize = big ? 74 : 46;
  ctx.fillStyle = rankColor(tile.rank);
  ctx.font = `700 ${numeralSize}px ${FONT}`;
  const blockTop = r.y + (big ? 34 : 26); // the divider — the header stays pinned
  const avail = r.h - (blockTop - r.y) - (big ? 14 : 10);
  const numeralY =
    blockTop + Math.max(0, (avail - blockH) / 2) + numeralSize * 0.72;
  ctx.fillText(tile.rank == null ? '—' : `#${tile.rank}`, cx, numeralY);

  const adv = tileAdvances(tile, big);
  let ai = 0;

  if (tile.rank == null) {
    ctx.fillStyle = TEXT_DIM;
    ctx.font = `600 ${big ? 15 : 11}px ${FONT}`;
    ctx.fillText('Unranked', cx, numeralY + adv[ai]);
    ctx.textAlign = 'left';
    return;
  }

  let y = numeralY + adv[ai++];
  ctx.fillStyle = TEXT_PRIMARY;
  ctx.font = `700 ${big ? 22 : 15}px ${FONT}`;
  // Same budget as the sub-lines below it — one constant, not a second copy.
  ctx.fillText(fitText(ctx, tile.value ?? '', r.w - TILE_SUB_PAD), cx, y);

  // Dual rank (§8a ruling 14): the HEADLINE rank is the single large numeral
  // above (unitCardData.leadRow picks which of the unit's two rows that is); its
  // chip and the muted OTHER rank ('#15 SR', '#12 default') sit below. Two
  // numerals of equal weight would compete and neither would read at timeline
  // scale.
  // Text is fitted at DRAW time, after its own font is set — measuring a
  // 400/11px sub-line against the 700/15px value font truncates it early.
  const sublines: { text: string; fill: string; font: string }[] = [];
  if (tile.sub) {
    sublines.push({
      text: tile.sub,
      fill: TEXT_SECONDARY,
      font: `400 ${big ? 15 : 11}px ${FONT}`,
    });
  }
  if (tile.profileChip) {
    sublines.push({
      text: tile.profileChip,
      fill: '#8fb4ff',
      font: tileChipFont(big),
    });
  }
  if (tile.altRank != null) {
    sublines.push({
      text: tileAltLine(tile),
      fill: TEXT_DIM,
      font: tileAltFont(big),
    });
  }
  if (sublines.length) {
    y += adv[ai++];
  }
  sublines.forEach((ln, i) => {
    ctx.fillStyle = ln.fill;
    ctx.font = ln.font;
    ctx.fillText(fitText(ctx, ln.text, r.w - TILE_SUB_PAD), cx, y);
    if (i < sublines.length - 1) {
      y += adv[ai++];
    }
  });
  ctx.textAlign = 'left';
}

// ---- tile-title geometry (exported: a title that doesn't fit is TRUNCATED, and
// the landscape tile is the tightest text slot on the card — ~111px of budget at
// 11px bold. The ele-adv tile's title carries the unit's element, so the longest
// element name is what decides whether that label survives; unit-card-layout's
// title-fit case measures against THESE, not a copy of them.)

export const TILE_TITLE_PAD = 16; // horizontal padding inside a tile, both sides
export const tileTitleFont = (big: boolean): string =>
  `700 ${big ? 15 : 11}px ${FONT}`;

// The sub-lines under the numeral (value, profile chip, '#6 SR' alt rank) have
// their own budget and their own fonts. The alt line is the one that grew: it
// used to read '#12 default' on every board and now carries a profile label, so
// the longest label in the vocabulary is what decides whether it survives.
export const TILE_SUB_PAD = 12;
export const tileChipFont = (big: boolean): string =>
  `700 ${big ? 15 : 11}px ${FONT}`;
export const tileAltFont = (big: boolean): string =>
  `400 ${big ? 14 : 10}px ${FONT}`;
export const tileAltLine = (tile: RankTile): string =>
  `#${tile.altRank} ${tile.altChip ?? 'default'}`;

// The right-hand (tiles + notes) column on the landscape card.
const rightColumnWidth = (): number => {
  const innerW = UNIT_CARD_W - PAD * 2;
  return innerW - Math.round(innerW * LEFT_COL_FRAC) - COL_GUTTER;
};

// One rank tile's width. Landscape tiles sit in the right column, portrait tiles
// span the full content width; both rows are `count` tiles with TILE_GAP between.
export function rankTileWidth(
  variant: UnitCardVariant,
  count = 3
): { width: number; big: boolean } {
  const row =
    variant === 'twitter'
      ? UNIT_CARD_PORTRAIT_W - PAD_P * 2
      : rightColumnWidth();
  return {
    width: (row - TILE_GAP * (count - 1)) / count,
    big: variant === 'twitter',
  };
}

function drawTiles(
  ctx: Canvas2DLike,
  r: Rect,
  tiles: readonly RankTile[],
  big: boolean
): void {
  const w = (r.w - TILE_GAP * (tiles.length - 1)) / tiles.length;
  // ONE block height for the row — see drawTile.
  const blockH = Math.max(...tiles.map((t) => tileBlockHeight(t, big)));
  tiles.forEach((t, i) => {
    drawTile(
      ctx,
      { x: r.x + (w + TILE_GAP) * i, y: r.y, w, h: r.h },
      t,
      big,
      blockH
    );
  });
}

// Comp-profile pill, drawn to match the site's .ranks-badge: muted text on the
// panel2 fill with a 1px border, trailing the name it qualifies.
const CHIP_PAD = 6;
const chipFont = (small: boolean): string => `600 ${small ? 10 : 13}px ${FONT}`;

function measureChip(ctx: Canvas2DLike, text: string, small: boolean): number {
  ctx.font = chipFont(small);
  return ctx.measureText(text).width + CHIP_PAD * 2 + 6; // +6 = the 6px gap
}

// `baseline` is the text baseline of the row the chip trails, so the pill is
// centred on it rather than sitting on it.
function drawChip(
  ctx: Canvas2DLike,
  x: number,
  baseline: number,
  text: string,
  small: boolean
): void {
  ctx.font = chipFont(small);
  const fs = small ? 10 : 13;
  const w = ctx.measureText(text).width + CHIP_PAD * 2;
  const h = fs + (small ? 6 : 8);
  const y = baseline - h + (small ? 3 : 4);
  // The 1px border is TWO FILLS, not a stroke: Canvas2DLike is a deliberately
  // minimal surface shared by the browser and @napi-rs/canvas, and it carries no
  // stroke API. A border-coloured plate with the fill inset by 1 is identical at
  // this size and costs no interface widening.
  ctx.fillStyle = '#2a2f3b'; // --border
  roundRect(ctx, x, y, w, h, 6);
  ctx.fill();
  ctx.fillStyle = '#1f232d'; // --panel2
  roundRect(ctx, x + 1, y + 1, w - 2, h - 2, 5);
  ctx.fill();
  ctx.fillStyle = '#8b93a3'; // --muted
  ctx.textAlign = 'left';
  ctx.fillText(text, x + CHIP_PAD, y + h - (small ? 5 : 6));
}

// A neighbourhood bar chart. Bars are ELEMENT-coloured (ruling 12) and span
// value↔0 about a zero axis when the board is negative-capable.
function drawBarChart(
  ctx: Canvas2DLike,
  r: Rect,
  chart: BarChart,
  rowH: number
): void {
  ctx.textAlign = 'left';
  ctx.fillStyle = TEXT_SECONDARY;
  ctx.font = `700 ${rowH >= BAR_ROW_H_P ? 16 : 12}px ${FONT}`;
  ctx.fillText(fitText(ctx, chart.title.toUpperCase(), r.w), r.x, r.y + 12);

  const top = r.y + (rowH >= BAR_ROW_H_P ? 30 : 24);

  // Unranked keeps its full slot (ruling 2 — never reflow), but the empty state
  // is CENTRED in the box and given a dashed plate rather than one muted line
  // pinned to the top. Left top-aligned it reads as a rendering failure with a
  // hole under it; centred it reads as a deliberate "no data here", which is
  // what a card for one of the ~150 units off the DPS chart must look like.
  if (chart.unranked || chart.rows.length === 0) {
    const boxTop = top - 6;
    const boxH = Math.max(28, r.h - (top - r.y));
    ctx.fillStyle = '#161a22';
    roundRect(ctx, r.x, boxTop, r.w, boxH, 10);
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.fillStyle = TEXT_DIM;
    ctx.font = `400 ${rowH >= BAR_ROW_H_P ? 17 : 13}px ${FONT}`;
    ctx.fillText(
      'Not ranked on this board',
      r.x + r.w / 2,
      boxTop + boxH / 2 + 5
    );
    ctx.textAlign = 'left';
    return;
  }

  const small = rowH < BAR_ROW_H_P;
  const nameW = Math.round(r.w * 0.3);
  const valueW = Math.round(r.w * 0.15);
  const trackX = r.x + nameW + 10;
  const trackW = r.w - nameW - valueW - 20;
  const span = chart.max - chart.min || 1;
  // Rows are laid out at the height the SLOT can afford, not the nominal one.
  // layoutCharts divides a fixed band proportionally, so a card whose charts want
  // more than the band gets compressed slots — and drawing at a fixed rowH then
  // ran the last rows out of the slot and put the next chart's header on top of
  // them. Measured 2026-07-28 across all 390 renders: 9 overflow, worst
  // prika/twitter at 78px (crown/discord, the golden fixture, at 8px). `rowH`
  // stays the TYPOGRAPHIC size (it selects the font branch via `small`); only the
  // geometry follows the fit, so a crowded card gets tighter rows rather than
  // smaller text or a dropped neighbour — both of which lose information the card
  // exists to show.
  const drawRowH = fittedRowH(r.h - (top - r.y), chart.rows.length, rowH);
  const barH = Math.round(drawRowH * 0.5);

  chart.rows.forEach((row, i) => {
    const y = top + i * drawRowH;
    const col = ELEMENT_COLORS[row.element] ?? '#9aa3b2';

    // the card's own unit gets a highlight plate so the eye lands on it first
    if (row.isUnit) {
      ctx.fillStyle = '#1e2430';
      roundRect(ctx, r.x - 6, y - 2, r.w + 12, drawRowH - 4, 8);
      ctx.fill();
    }

    // Name, then the comp-profile PILL after it — the site's own row layout
    // (.ranks-badge in web/src/styles.css: a muted pill trailing the name).
    // Every row carries its own profileChip, neighbours included, so this is
    // what makes "3. Prika w/ Mint" read as a different standing from plain
    // Prika instead of looking like a duplicate. The unit's own no-profile row
    // is the same pill saying 'default' — it used to be a PREFIX, which put the
    // qualifier before the name it qualifies and broke the column's alignment.
    const chip = row.profileChip;
    const chipW = chip ? measureChip(ctx, chip, small) : 0;
    ctx.textAlign = 'left';
    ctx.fillStyle = row.isUnit ? TEXT_PRIMARY : TEXT_SECONDARY;
    ctx.font = `${row.isUnit ? 700 : 400} ${small ? 13 : 17}px ${FONT}`;
    const rankTag = row.rank != null ? `${row.rank}. ` : '';
    // No qualifier asterisk on a bar-chart NAME. The footnote it points at is
    // about this card's unit only, so on a neighbour it was a marker with
    // nothing on the card to resolve it. The TILE still carries its '*' and the
    // notes panel still spells it out.
    const label = rankTag + row.name;
    const shown = fitText(ctx, label, nameW - chipW);
    ctx.fillText(shown, r.x, y + barH);
    if (chip) {
      drawChip(
        ctx,
        r.x + ctx.measureText(shown).width + 6,
        y + barH,
        chip,
        small
      );
    }

    // track
    ctx.fillStyle = '#20242e';
    roundRect(ctx, trackX, y + barH - barH * 0.72, trackW, barH * 0.72, 4);
    ctx.fill();

    // ONE formula for both axis regimes: min is clamped to ≤0 and max to ≥0 by
    // the data builder, so a positive-only board (min = 0) falls out as
    // left = 0, width = value/max — the same expression the site uses.
    const left = (Math.min(row.value, 0) - chart.min) / span;
    const width = Math.abs(row.value) / span;
    const bx = trackX + left * trackW;
    const bw = Math.max(2, width * trackW);
    const by = y + barH - barH * 0.72;
    const bh = barH * 0.72;

    ctx.globalAlpha = row.isAppendix ? 0.45 : 1;
    if (row.segments) {
      // Sustain is a 3-segment split (heal / shield / lifesteal) drawn inside
      // one track — a single-colour sustain bar loses the composition that
      // makes the board useful.
      // The site's own sustain palette (.ranks-seg-* in web/src/styles.css,
      // owner 2026-07-26): green heal / blue shield / yellow lifesteal. Heal
      // used to take the unit's ELEMENT colour here, which made the same
      // composition read as a different one per unit and disagreed with the
      // board the card is quoting.
      const parts: [number, string][] = [
        [row.segments.heal, '#4ecb71'], // --ranks-seg-heal
        [row.segments.shield, '#5b9dff'], // --accent
        [row.segments.lifesteal, '#e0b04b'], // --warn
      ];
      let sx = bx;
      parts.forEach(([frac, c], pi) => {
        const pw = bw * frac;
        if (pw <= 0) {
          return;
        }
        ctx.fillStyle = c;
        roundRect(
          ctx,
          sx,
          by,
          pi === parts.length - 1 ? Math.max(1, pw) : pw,
          bh,
          4
        );
        ctx.fill();
        sx += pw;
      });
    } else {
      ctx.fillStyle = col;
      roundRect(ctx, bx, by, bw, bh, 4);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.textAlign = 'right';
    ctx.fillStyle = row.isUnit ? TEXT_PRIMARY : TEXT_SECONDARY;
    ctx.font = `${row.isUnit ? 700 : 400} ${small ? 13 : 16}px ${FONT}`;
    ctx.fillText(row.label, r.x + r.w, y + barH);
  });

  // zero axis, drawn last so it sits above the bars
  if (chart.min < 0) {
    const zx = trackX + ((0 - chart.min) / span) * trackW;
    ctx.fillStyle = '#4a5464';
    ctx.fillRect(zx, top - 2, 1, chart.rows.length * rowH);
  }
  ctx.textAlign = 'left';
}

// Notes panel — the only genuinely variable-height content on the card, so it is
// a FIXED-HEIGHT box with clamped text (ruling 2). Absent for ~55% of the
// roster, in which case it draws its heading and one muted line rather than
// collapsing.
function drawNotes(
  ctx: Canvas2DLike,
  r: Rect,
  d: UnitCardData,
  big: boolean
): void {
  const m = d.model;
  panel(ctx, r);
  const px = r.x + 16;
  const maxW = r.w - 32;
  let y = r.y + (big ? 30 : 24);

  ctx.textAlign = 'left';
  ctx.fillStyle = TEXT_SECONDARY;
  ctx.font = `700 ${big ? 15 : 11}px ${FONT}`;
  ctx.fillText(m.prerelease ? 'PROJECTION' : 'BUILD NOTES', px, y);
  y += big ? 26 : 20;

  const lineH = big ? 24 : 18;
  const bodySize = big ? 16 : 12;
  const bottom = r.y + r.h - 12;
  const room = () => Math.floor((bottom - y) / lineH);

  const line = (label: string, value: string, color = TEXT_PRIMARY): void => {
    if (room() <= 0) {
      return;
    }
    ctx.font = `700 ${bodySize}px ${FONT}`;
    ctx.fillStyle = TEXT_DIM;
    const lw = ctx.measureText(`${label} `).width;
    ctx.fillText(label, px, y);
    ctx.font = `400 ${bodySize}px ${FONT}`;
    ctx.fillStyle = color;
    // The value WRAPS under a hanging indent rather than truncating. A full OL
    // recommendation is 12 rolls and does not fit the landscape column on one
    // line; the panel is fixed-height, so `room()` still bounds it and a value
    // that genuinely cannot fit is clipped at the last available line.
    const wrapped = wrapText(ctx, value, maxW - lw, Math.min(room(), 3));
    wrapped.forEach((l, i) => {
      ctx.fillText(l, px + lw, y);
      if (i < wrapped.length - 1) {
        y += lineH;
      }
    });
    y += lineH;
  };

  if (m.prerelease) {
    // The only pre-release-specific branch in the renderer; everything else
    // falls out of nullability (§11).
    ctx.font = `400 ${bodySize}px ${FONT}`;
    ctx.fillStyle = TEXT_SECONDARY;
    for (const l of wrapText(
      ctx,
      'Projections generated from datamined kit values via the nikkesim.app engine; no live-game validation yet.',
      maxW,
      Math.max(0, room() - 2)
    )) {
      ctx.fillText(l, px, y);
      y += lineH;
    }
    y += 4;
  }

  // OURS vs THEIRS, deliberately labelled as different things (§5b): the
  // sim-computed optimal is the site's own output, Tsareena's is community
  // editorial. For an unreleased character only ours can exist — which is the
  // whole selling point.
  if (m.olOptimal) {
    line('Sim-optimal OL', m.olOptimal, '#8fb4ff');
  }

  const t = m.tsareena;
  if (t) {
    if (t.priority) {
      line('Priority', t.priority);
    }
    if (t.build.skillLevels) {
      line('Skills', t.build.skillLevels);
    }
    if (t.build.cube) {
      line('Cube', t.build.cube);
    }
    if (t.build.overloadIdeal) {
      line('Tsareena OL', t.build.overloadIdeal);
    }
    if (t.build.endgameUses) {
      line('Endgame', t.build.endgameUses);
    }
    if (t.build.notes && room() > 0) {
      ctx.font = `400 ${bodySize}px ${FONT}`;
      ctx.fillStyle = TEXT_SECONDARY;
      for (const l of wrapText(ctx, t.build.notes, maxW, Math.min(3, room()))) {
        ctx.fillText(l, px, y);
        y += lineH;
      }
    }
  } else if (!m.prerelease) {
    ctx.font = `400 ${bodySize}px ${FONT}`;
    ctx.fillStyle = TEXT_DIM;
    ctx.fillText('No community build data', px, y);
    y += lineH;
  }

  // Burst-CDR qualifiers land here because a card has no hover to put them in
  // (§8). Clamped like everything else in the box.
  if (m.footnotes.length && room() > 0) {
    ctx.font = `400 ${big ? 13 : 10}px ${FONT}`;
    ctx.fillStyle = TEXT_DIM;
    for (const f of m.footnotes.slice(0, room())) {
      ctx.fillText(fitText(ctx, f, maxW), px, y);
      y += lineH * 0.8;
    }
  }
}

// Split the chart band between the charts by their NATURAL height (header +
// one line per row) rather than evenly.
//
// An even split overlaps: a profiled unit's chart carries an extra appended
// default row (§8a), so a 4-row buffer chart beside a 3-row sustain chart
// overran its half and drew the next chart's title through its last bar. Sizing
// by row count also means the chart with more to say gets more room, which is
// the same principle as §6c lever 1.
/**
 * The row height a chart may actually draw at, given the space its slot leaves below the header.
 *
 * layoutCharts splits a FIXED band proportionally (ruling 2: every card is the same size), so a
 * unit whose charts want more than the band gets slots smaller than their natural height. Drawing
 * at the nominal rowH regardless is what put a chart's last rows under the next chart's header —
 * and on the portrait variant, into the notes panel. Shrinking the rows keeps every neighbour row
 * on the card, which is the point of the chart; dropping rows or clipping does not.
 *
 * Returns the nominal height when it fits (the overwhelmingly common case — 381 of 390 renders as
 * measured 2026-07-28), so an uncrowded card is pixel-identical to before.
 */
export function fittedRowH(
  availH: number,
  rowCount: number,
  nominalRowH: number
): number {
  if (rowCount <= 0) {
    return nominalRowH;
  }
  return Math.min(nominalRowH, Math.floor(availH / rowCount));
}

function layoutCharts(
  charts: BarChart[],
  top: number,
  totalH: number,
  rowH: number,
  headerH: number
): { y: number; h: number }[] {
  const natural = charts.map((c) =>
    c.unranked || !c.rows.length
      ? headerH + rowH
      : headerH + c.rows.length * rowH
  );
  const sum = natural.reduce((a, b) => a + b, 0) || 1;
  let y = top;
  return natural.map((n) => {
    const h = (n / sum) * totalH;
    const slot = { y, h };
    y += h;
    return slot;
  });
}

function drawTags(
  ctx: Canvas2DLike,
  r: Rect,
  m: UnitCardModel,
  big: boolean
): void {
  ctx.textAlign = 'left';
  const size = big ? 15 : 11;
  const h = big ? 30 : 22;
  ctx.font = `600 ${size}px ${FONT}`;
  let x = r.x;
  for (const tag of m.tags) {
    const w = ctx.measureText(tag).width + (big ? 26 : 18);
    if (x + w > r.x + r.w) {
      break;
    }
    ctx.fillStyle = '#1c212b';
    roundRect(ctx, x, r.y, w, h, h / 2);
    ctx.fill();
    ctx.fillStyle = TEXT_SECONDARY;
    ctx.font = `600 ${size}px ${FONT}`;
    ctx.fillText(tag, x + (big ? 13 : 9), r.y + h * 0.68);
    x += w + 8;
  }
}

// ---- variant layouts ---------------------------------------------------------

function background(
  ctx: Canvas2DLike,
  w: number,
  h: number,
  col: string
): void {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = col; // element accent, not the generic blue — the card is a unit
  ctx.fillRect(0, 0, w, 6);
}

// LANDSCAPE (`discord`, 1200×600). Two columns: detail on the left, the two
// elements that must survive a downscale (name, tiles) on opposite corners.
export function drawUnitCard(ctx: Canvas2DLike, d: UnitCardData): void {
  const m = d.model;
  const W = UNIT_CARD_W;
  const H = UNIT_CARD_H;
  const col = ELEMENT_COLORS[m.element] ?? '#9aa3b2';
  background(ctx, W, H, col);

  const innerW = W - PAD * 2;
  const leftW = Math.round(innerW * LEFT_COL_FRAC);
  const rightW = rightColumnWidth();
  const rightX = PAD + leftW + COL_GUTTER;

  // The two gaps below the title absorb the taller title art: the bar charts are
  // the tightest band on this variant (natural height already exceeds the slot),
  // so height taken here comes straight out of chart rows.
  const TITLE_GAP = 14;
  const STRIP_GAP = 22;
  drawTitle(
    ctx,
    { x: PAD, y: PAD, w: leftW, h: PORTRAIT_ART },
    d,
    PORTRAIT_ART,
    [34, 30, 26]
  );
  drawIconStrip(
    ctx,
    { x: PAD, y: PAD + PORTRAIT_ART + TITLE_GAP, w: leftW, h: ICON_SIZE + 18 },
    d,
    ICON_SIZE
  );

  const tagsY = H - PAD - 24 - 22;
  const chartsTop = PAD + PORTRAIT_ART + TITLE_GAP + ICON_SIZE + STRIP_GAP;
  const chartsH = tagsY - chartsTop - 12;
  const slots = layoutCharts(m.charts, chartsTop, chartsH, BAR_ROW_H, 24);
  m.charts.forEach((chart, i) => {
    drawBarChart(
      ctx,
      { x: PAD, y: slots[i].y, w: leftW, h: slots[i].h - 8 },
      chart,
      BAR_ROW_H
    );
  });

  // No footer watermark: the mark moved into the title row (see drawTitle).
  drawTags(ctx, { x: PAD, y: tagsY, w: leftW, h: 22 }, m, false);

  // right column: tiles then notes
  const tilesH = 150;
  drawTiles(ctx, { x: rightX, y: PAD, w: rightW, h: tilesH }, m.tiles, false);
  drawNotes(
    ctx,
    {
      x: rightX,
      y: PAD + tilesH + 16,
      w: rightW,
      h: H - PAD * 2 - tilesH - 16,
    },
    d,
    false
  );
}

// PORTRAIT (`twitter`, 1200×1600). Single column in the owner's stack order
// (§6c): title, icon strip, ranks, bars, notes, tags, footer. Uses its FULL
// height — the middle-45% safe-band rule was retired when 4:5 was measured
// uncropped in the X timeline.
export function drawUnitCardPortrait(ctx: Canvas2DLike, d: UnitCardData): void {
  const m = d.model;
  const W = UNIT_CARD_PORTRAIT_W;
  const H = UNIT_CARD_PORTRAIT_H;
  const col = ELEMENT_COLORS[m.element] ?? '#9aa3b2';
  background(ctx, W, H, col);

  const innerW = W - PAD_P * 2;
  const x = PAD_P;
  let y = PAD_P;

  // The three gaps above the charts. Two neighbour rows each side (the portrait
  // row count) makes the chart band the tightest one here too, so these are
  // trimmed to the point where a two-chart card's natural height fits its slot —
  // past that, layoutCharts compresses the slot while the rows keep drawing at a
  // fixed rowH, and the second chart's HEADER lands on the last row of the first.
  const TITLE_GAP = 26;
  const STRIP_GAP = 22;
  const TILES_GAP = 24;

  // 1 — title bar
  drawTitle(
    ctx,
    { x, y, w: innerW, h: PORTRAIT_ART_P },
    d,
    PORTRAIT_ART_P,
    [50, 44, 38, 32]
  );
  y += PORTRAIT_ART_P + TITLE_GAP;

  // 2 — icon strip
  drawIconStrip(ctx, { x, y, w: innerW, h: ICON_SIZE_P + 24 }, d, ICON_SIZE_P);
  y += ICON_SIZE_P + 24 + STRIP_GAP;

  // 3 — rank tiles (the headline; `big` type for the 45%-scale constraint)
  const tilesH = 250;
  drawTiles(ctx, { x, y, w: innerW, h: tilesH }, m.tiles, true);
  y += tilesH + TILES_GAP;

  // 5/6/7 are measured from the BOTTOM so the bar charts absorb the slack —
  // the fixed-size guarantee has to put leftover space somewhere, and §6c lever
  // 1 says it goes into chart rows, never whitespace.
  // Tags are now the LAST band — the watermark line that used to sit under them
  // moved into the title row, and the freed height goes to the bar charts (§6c
  // lever 1), not to a bigger bottom margin.
  const tagsH = 30;
  const tagsY = H - PAD_P - tagsH;
  const notesH = 300;
  const notesY = tagsY - 24 - notesH;

  // 4 — bar charts fill everything between the tiles and the notes panel
  const chartsH = notesY - y - 20;
  const slots = layoutCharts(m.charts, y, chartsH, BAR_ROW_H_P, 30);
  m.charts.forEach((chart, i) => {
    drawBarChart(
      ctx,
      { x, y: slots[i].y, w: innerW, h: slots[i].h - 10 },
      chart,
      BAR_ROW_H_P
    );
  });

  drawNotes(ctx, { x, y: notesY, w: innerW, h: notesH }, d, true);
  drawTags(ctx, { x, y: tagsY, w: innerW, h: tagsH }, m, true);
}

// Dispatch by variant — the single entry point a host should use.
export function drawUnitCardVariant(
  ctx: Canvas2DLike,
  d: UnitCardData,
  variant: UnitCardVariant
): void {
  if (variant === 'twitter') {
    drawUnitCardPortrait(ctx, d);
  } else {
    drawUnitCard(ctx, d);
  }
}
