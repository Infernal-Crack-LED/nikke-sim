// Shared visual theme for every infographic — font family, palette, and the
// MANDATORY nikkesim.app mark. The mark is the architectural point of
// the centralization (docs/handoffs/2026-07-27-infographics-centralization-plan.md
// §2 "The advertising goal has an architectural consequence"): every card draws
// it through drawBrandMark, so it can never be removed or replaced by a caller —
// the per-card `footer` field only picks WHICH nikkesim.app path the mark names
// and adds a descriptor note.
import { type Canvas2DLike, drawContained } from './canvas2d.js';

// Single font family for every infographic. Node hosts MUST register the Roboto
// faces before drawing (src/infographics/node/fonts.ts — it throws if
// registration fails); a missing family silently renders blank text on fontless
// hosts. The browser path self-hosts subsetted Roboto via @font-face
// (web/public/fonts/, decision 6.1) and awaits document.fonts before drawing.
export const FONT = 'Roboto';

export const ELEMENT_COLORS: Record<string, string> = {
  Fire: '#d92d38',
  Water: '#0075f8',
  Wind: '#00e554',
  Electric: '#bc1eb1',
  Iron: '#ff8321',
};

export const TEXT_PRIMARY = '#e7eaf0';
export const TEXT_SECONDARY = '#8b93a3';
export const TEXT_DIM = '#5b6472';

// WarcraftLogs-inspired rank palette (owner-corrected 2026-07-28).
//
// ⚠ SCOPE: the rank NUMERAL in the unit card's ranking tiles, and nothing else
// (ruling 12). BARS are coloured by ELEMENT — ELEMENT_COLORS above, matching
// RankBarChart.tsx:79 / DpsBarChart.tsx:101 — so the two colour systems live on
// different elements of the card and never touch. This is also why the old
// rank-blue (#0070ff) vs Water (#0075f8) collision worry is retired: they can
// co-occur on one card but never on the same mark.
export const RANK_COLORS: { max: number; color: string }[] = [
  { max: 1, color: '#e5cc80' }, // gold
  { max: 5, color: '#e268a8' }, // pink
  { max: 10, color: '#ff8000' }, // orange
  { max: 20, color: '#a335ee' }, // purple
  { max: Infinity, color: '#0070ff' }, // blue
];

// Rank → numeral colour. An UNRANKED tile (null) is deliberately not in the
// palette: it draws in TEXT_DIM, so "no data" can never be mistaken for a
// legitimate placement.
export const rankColor = (rank: number | null): string =>
  rank == null
    ? TEXT_DIM
    : (RANK_COLORS.find((b) => rank <= b.max)?.color ?? TEXT_DIM);

// The accent blue the mark's wordmark is drawn in — the same --accent the site
// header, the cards' top rule and every bar fill use.
export const ACCENT = '#5b9dff';

// The non-optional mark. Present on every rendered image, exactly once.
export const WATERMARK = 'nikkesim.app';

// A card's `footer` descriptor carries two different things, and they end up in
// two different places: the nikkesim.app URL (which the top-right mark names)
// and any NOTE beside it — the sim caveats a card states by default, or the
// "simmed <date>" provenance stamp a stored-snapshot card adds
// (src/server/card-from-build.ts). Split them so the mark stays a clean
// wordmark and the note keeps its own small line.
//
// A descriptor segment carrying the mark ('nikkesim.app/charge') becomes the
// wordmark as-is, so a card can advertise its own page rather than the bare
// domain; anything else is note. 'nikke-sim' is the pre-mark spelling the
// default descriptors still use, and reads as the mark, not as a note.
export function splitFooter(
  descriptor: string | undefined,
  fallback: string
): { mark: string; note: string } {
  const segments = (descriptor ?? fallback).split(' · ');
  const markAt = segments.findIndex(
    (s) => s.includes(WATERMARK) || s === 'nikke-sim'
  );
  return {
    mark:
      markAt < 0 || segments[markAt] === 'nikke-sim'
        ? WATERMARK
        : segments[markAt],
    note: segments.filter((_, i) => i !== markAt).join(' · '),
  };
}

// Mark geometry, matching the unit card's (core/unitCard.ts drawTitle, owner
// 2026-07-28): the wordmark in accent blue with the site icon to its right,
// hung off the card's top-right corner. It sits where the eye already is —
// the title row — instead of in the muted grey footer line it replaced, which
// was the least legible text on the card at timeline scale.
const MARK_ICON = 40; // site icon square
const MARK_FONT = 15; // wordmark size
const MARK_GAP = 8; // wordmark → icon
export const MARK_ICON_TOP = 6; // icon's y, from the card's top edge
// The wordmark's baseline relative to the icon's top. The unit card's own
// offset (icon at r.y + 2, baseline at r.y + 26), so both marks hang against
// their icon identically.
const MARK_BASELINE = 24;

// Draw the mandatory mark at a card's top-right corner. This is the ONLY way
// cards draw it, so no renderer (present or future) can ship an unmarked image
// by forgetting it. `icon` is optional — a host with no icon loaded (the
// browser preview) thins the mark to its wordmark rather than dropping it.
//
// Returns the mark's LEFT edge, so the caller can clamp a title that would
// otherwise run under it.
export function drawBrandMark(
  ctx: Canvas2DLike,
  o: {
    right: number; // the mark's right edge (usually W - padX)
    top?: number; // icon's y; defaults to MARK_ICON_TOP
    text?: string; // defaults to the bare WATERMARK
    icon?: unknown;
    // Size overrides — the unit card's portrait variant draws everything ~1.6×
    // larger, where the default mark reads as an afterthought.
    iconSize?: number;
    fontSize?: number;
    gap?: number;
    baselineOffset?: number; // wordmark baseline, from `top`
  }
): number {
  const top = o.top ?? MARK_ICON_TOP;
  const text = o.text ?? WATERMARK;
  const iconSize = o.iconSize ?? MARK_ICON;
  let right = o.right;
  if (o.icon) {
    drawContained(ctx, o.icon, {
      x: right - iconSize,
      y: top,
      w: iconSize,
      h: iconSize,
    });
    right -= iconSize + (o.gap ?? MARK_GAP);
  }
  ctx.font = `700 ${o.fontSize ?? MARK_FONT}px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillStyle = ACCENT;
  const left = right - ctx.measureText(text).width;
  ctx.fillText(text, left, top + (o.baselineOffset ?? MARK_BASELINE));
  return left;
}

// The mark's icon rect for a card of width `W` with horizontal padding `padX` —
// exported geometry so the ink-guard callers (node/render.ts assertTitleInk and
// its tests) derive the icon's position from the same numbers the renderer uses.
export function brandMarkIconRect(
  W: number,
  padX: number,
  top: number = MARK_ICON_TOP
): { x: number; y: number; size: number } {
  return { x: W - padX - MARK_ICON, y: top, size: MARK_ICON };
}

// Draw a card's footer NOTE (see splitFooter) — the caveats/provenance line
// that is not the mark. Drawn only when there is one: a card whose descriptor
// is nothing but its URL gets no footer line at all.
export function drawFooterNote(
  ctx: Canvas2DLike,
  x: number,
  y: number,
  fontSize: number,
  note: string
): void {
  if (!note) {
    return;
  }
  ctx.fillStyle = TEXT_SECONDARY;
  ctx.font = `400 ${fontSize}px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(note, x, y);
}
