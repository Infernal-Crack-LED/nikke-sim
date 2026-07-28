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
  PORTRAIT_CROP_TOP,
} from './canvas2d.js';
import {
  FONT,
  ELEMENT_COLORS,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_DIM,
  rankColor,
  drawWatermark,
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

const PORTRAIT_ART = 96; // landscape title-bar art
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
  footer?: string; // descriptor ADDED to the watermark; can never replace it
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

// Draw an image contained in a box, preserving its aspect ratio and centring it.
// Icons are not uniformly square (code_* is 63×73, burst_1 is 17×37), so a
// stretch-to-fit would distort the artwork.
function drawContained(
  ctx: Canvas2DLike,
  img: unknown,
  r: Rect
): void {
  const im = img as {
    naturalWidth?: number;
    naturalHeight?: number;
    width?: number;
    height?: number;
  };
  const iw = im.naturalWidth ?? im.width ?? r.w;
  const ih = im.naturalHeight ?? im.height ?? r.h;
  if (!iw || !ih) {
    return;
  }
  const scale = Math.min(r.w / iw, r.h / ih);
  const w = iw * scale;
  const h = ih * scale;
  ctx.drawImage(img, 0, 0, iw, ih, r.x + (r.w - w) / 2, r.y + (r.h - h) / 2, w, h);
}

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
  drawArt(ctx, { x: r.x, y: r.y, w: art, h: art }, d.portrait, col, (m.name[0] ?? '?').toUpperCase());

  const textX = r.x + art + (art >= PORTRAIT_ART_P ? 24 : 20);
  // The site logo sits at the FAR RIGHT of the title row — a second, more
  // prominent placement of the mark than the footer watermark (§3). It never
  // replaces the watermark, which is drawn unconditionally as the final pass.
  const logo = 40;
  let nameMax = r.x + r.w - textX;
  if (d.siteIcon) {
    drawContained(ctx, d.siteIcon, {
      x: r.x + r.w - logo,
      y: r.y + 2,
      w: logo,
      h: logo,
    });
    nameMax -= logo + 16;
  }

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
  ctx.font = `400 ${art >= PORTRAIT_ART_P ? 20 : 15}px ${FONT}`;
  ctx.fillStyle = TEXT_SECONDARY;
  const sub = [
    m.class,
    m.manufacturerBase ?? undefined,
    m.releaseDate ? `Released ${m.releaseDate}` : undefined,
  ]
    .filter(Boolean)
    .join(' · ');
  ctx.fillText(fitText(ctx, sub, nameMax), textX, nameBase + (art >= PORTRAIT_ART_P ? 34 : 26));

  if (m.prerelease) {
    ctx.font = `700 ${art >= PORTRAIT_ART_P ? 16 : 12}px ${FONT}`;
    ctx.fillStyle = '#e5cc80';
    ctx.fillText('UNRELEASED — PROJECTED', textX, nameBase + (art >= PORTRAIT_ART_P ? 64 : 48));
  }
}

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
  const items: { img?: unknown; text?: string; label: string }[] = [
    { img: icons.burst, label: `B${m.burst}` },
    {
      text: m.burstCooldownSec != null ? `${m.burstCooldownSec}s` : '—',
      label: 'CD',
    },
    { img: icons.element, label: m.element },
    { img: icons.weapon, label: m.weapon },
    { img: icons.class, label: m.class },
    {
      img: icons.manufacturer,
      // The 4 overspec units keep the distinction visible rather than having it
      // silently dropped when the icon name is resolved (§10.2c).
      label: m.overspec ? `${m.manufacturerBase} OS` : (m.manufacturerBase ?? '—'),
    },
  ];

  const cell = r.w / items.length;
  const labelSize = size >= ICON_SIZE_P ? 15 : 12;
  items.forEach((item, i) => {
    const cx = r.x + cell * i + cell / 2;
    const box = { x: cx - size / 2, y: r.y, w: size, h: size };
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
    ctx.fillText(fitText(ctx, item.label, cell - 6), cx, r.y + size + labelSize + 4);
  });
  ctx.textAlign = 'left';
}

// A ranking tile. The rank NUMERAL is the headline — huge, rank-coloured, and
// the one element besides the name that must survive a 45% downscale.
function drawTile(ctx: Canvas2DLike, r: Rect, tile: RankTile, big: boolean): void {
  panel(ctx, r);
  ctx.fillStyle = PANEL_EDGE;
  ctx.fillRect(r.x + 10, r.y + (big ? 34 : 26), r.w - 20, 1);

  const cx = r.x + r.w / 2;
  ctx.textAlign = 'center';

  ctx.fillStyle = TEXT_SECONDARY;
  ctx.font = `700 ${big ? 15 : 11}px ${FONT}`;
  ctx.fillText(fitText(ctx, tile.title.toUpperCase(), r.w - 16), cx, r.y + (big ? 24 : 18));

  // Unranked draws at FULL SIZE with an em dash — never an omitted or shrunken
  // tile (ruling 2). TEXT_DIM keeps "no data" visually distinct from any real
  // placement colour.
  const numeralSize = big ? 74 : 46;
  ctx.fillStyle = rankColor(tile.rank);
  ctx.font = `700 ${numeralSize}px ${FONT}`;
  const numeralY = r.y + (big ? 108 : 76);
  ctx.fillText(tile.rank == null ? '—' : `#${tile.rank}`, cx, numeralY);

  if (tile.rank == null) {
    ctx.fillStyle = TEXT_DIM;
    ctx.font = `600 ${big ? 15 : 11}px ${FONT}`;
    ctx.fillText('Unranked', cx, numeralY + (big ? 30 : 22));
    ctx.textAlign = 'left';
    return;
  }

  ctx.fillStyle = TEXT_PRIMARY;
  ctx.font = `700 ${big ? 22 : 15}px ${FONT}`;
  ctx.fillText(fitText(ctx, tile.value ?? '', r.w - 12), cx, numeralY + (big ? 34 : 24));

  let y = numeralY + (big ? 58 : 42);
  ctx.fillStyle = TEXT_SECONDARY;
  ctx.font = `400 ${big ? 15 : 11}px ${FONT}`;
  if (tile.sub) {
    ctx.fillText(fitText(ctx, tile.sub, r.w - 12), cx, y);
    y += big ? 22 : 16;
  }
  // Dual rank (§8a ruling 14): the PROFILED rank is the single large numeral
  // above; the profile chip and the muted default rank sit below. Two numerals
  // of equal weight would compete and neither would read at timeline scale.
  if (tile.profileChip) {
    ctx.fillStyle = '#8fb4ff';
    ctx.font = `700 ${big ? 15 : 11}px ${FONT}`;
    ctx.fillText(fitText(ctx, tile.profileChip, r.w - 12), cx, y);
    y += big ? 21 : 15;
  }
  if (tile.defaultRank != null) {
    ctx.fillStyle = TEXT_DIM;
    ctx.font = `400 ${big ? 14 : 10}px ${FONT}`;
    ctx.fillText(`#${tile.defaultRank} default`, cx, y);
  }
  ctx.textAlign = 'left';
}

function drawTiles(
  ctx: Canvas2DLike,
  r: Rect,
  tiles: readonly RankTile[],
  big: boolean
): void {
  const w = (r.w - TILE_GAP * (tiles.length - 1)) / tiles.length;
  tiles.forEach((t, i) => {
    drawTile(ctx, { x: r.x + (w + TILE_GAP) * i, y: r.y, w, h: r.h }, t, big);
  });
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
    ctx.fillText('Not ranked on this board', r.x + r.w / 2, boxTop + boxH / 2 + 5);
    ctx.textAlign = 'left';
    return;
  }

  const small = rowH < BAR_ROW_H_P;
  const nameW = Math.round(r.w * 0.3);
  const valueW = Math.round(r.w * 0.15);
  const trackX = r.x + nameW + 10;
  const trackW = r.w - nameW - valueW - 20;
  const span = chart.max - chart.min || 1;
  const barH = Math.round(rowH * 0.5);

  chart.rows.forEach((row, i) => {
    const y = top + i * rowH;
    const col = ELEMENT_COLORS[row.element] ?? '#9aa3b2';

    // the card's own unit gets a highlight plate so the eye lands on it first
    if (row.isUnit) {
      ctx.fillStyle = '#1e2430';
      roundRect(ctx, r.x - 6, y - 2, r.w + 12, rowH - 4, 8);
      ctx.fill();
    }

    ctx.textAlign = 'left';
    ctx.fillStyle = row.isUnit ? TEXT_PRIMARY : TEXT_SECONDARY;
    ctx.font = `${row.isUnit ? 700 : 400} ${small ? 13 : 17}px ${FONT}`;
    const rankTag = row.rank != null ? `${row.rank}. ` : '';
    const label =
      (row.isDefaultAppendix ? 'default · ' : '') +
      rankTag +
      row.name +
      (row.qualified ? ' *' : '');
    ctx.fillText(fitText(ctx, label, nameW), r.x, y + barH);

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

    ctx.globalAlpha = row.isDefaultAppendix ? 0.45 : 1;
    if (row.segments) {
      // Sustain is a 3-segment split (heal / shield / lifesteal) drawn inside
      // one track — a single-colour sustain bar loses the composition that
      // makes the board useful.
      const parts: [number, string][] = [
        [row.segments.heal, col],
        [row.segments.shield, '#9fd0ff'],
        [row.segments.lifesteal, '#ffd479'],
      ];
      let sx = bx;
      parts.forEach(([frac, c], pi) => {
        const pw = bw * frac;
        if (pw <= 0) {
          return;
        }
        ctx.fillStyle = c;
        roundRect(ctx, sx, by, pi === parts.length - 1 ? Math.max(1, pw) : pw, bh, 4);
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
function drawNotes(ctx: Canvas2DLike, r: Rect, d: UnitCardData, big: boolean): void {
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
    ctx.fillText(fitText(ctx, value, maxW - lw), px + lw, y);
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
function layoutCharts(
  charts: BarChart[],
  top: number,
  totalH: number,
  rowH: number,
  headerH: number
): { y: number; h: number }[] {
  const natural = charts.map((c) =>
    c.unranked || !c.rows.length ? headerH + rowH : headerH + c.rows.length * rowH
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

function drawTags(ctx: Canvas2DLike, r: Rect, m: UnitCardModel, big: boolean): void {
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

function background(ctx: Canvas2DLike, w: number, h: number, col: string): void {
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
  const rightW = innerW - leftW - COL_GUTTER;
  const rightX = PAD + leftW + COL_GUTTER;

  drawTitle(ctx, { x: PAD, y: PAD, w: leftW, h: PORTRAIT_ART }, d, PORTRAIT_ART, [34, 30, 26]);
  drawIconStrip(
    ctx,
    { x: PAD, y: PAD + PORTRAIT_ART + 22, w: leftW, h: ICON_SIZE + 18 },
    d,
    ICON_SIZE
  );

  const tagsY = H - PAD - 24 - 22;
  const chartsTop = PAD + PORTRAIT_ART + 22 + ICON_SIZE + 30;
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

  drawTags(ctx, { x: PAD, y: tagsY, w: leftW, h: 22 }, m, false);

  // right column: tiles then notes
  const tilesH = 150;
  drawTiles(ctx, { x: rightX, y: PAD, w: rightW, h: tilesH }, m.tiles, false);
  drawNotes(
    ctx,
    { x: rightX, y: PAD + tilesH + 16, w: rightW, h: H - PAD * 2 - tilesH - 16 },
    d,
    false
  );

  drawWatermark(ctx, PAD, H - 16, 13, d.footer, 'nikke-sim unit card');
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

  // 1 — title bar
  drawTitle(ctx, { x, y, w: innerW, h: PORTRAIT_ART_P }, d, PORTRAIT_ART_P, [50, 44, 38, 32]);
  y += PORTRAIT_ART_P + 34;

  // 2 — icon strip
  drawIconStrip(ctx, { x, y, w: innerW, h: ICON_SIZE_P + 24 }, d, ICON_SIZE_P);
  y += ICON_SIZE_P + 24 + 30;

  // 3 — rank tiles (the headline; `big` type for the 45%-scale constraint)
  const tilesH = 250;
  drawTiles(ctx, { x, y, w: innerW, h: tilesH }, m.tiles, true);
  y += tilesH + 30;

  // 5/6/7 are measured from the BOTTOM so the bar charts absorb the slack —
  // the fixed-size guarantee has to put leftover space somewhere, and §6c lever
  // 1 says it goes into chart rows, never whitespace.
  const footerY = H - PAD_P + 4;
  const tagsH = 30;
  const tagsY = footerY - 26 - tagsH;
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
  drawWatermark(ctx, x, footerY, 16, d.footer, 'nikke-sim unit card');
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
