// Shared visual theme for every infographic — font family, palette, and the
// MANDATORY nikkesim.app watermark. The watermark is the architectural point of
// the centralization (docs/handoffs/2026-07-27-infographics-centralization-plan.md
// §2 "The advertising goal has an architectural consequence"): every card's footer
// is drawn through drawWatermark as the FINAL pass, so the mark can never be
// removed or replaced by a caller — the per-card `footer` field only ADDS a
// descriptor in front of (or instead of, when it already carries the mark) the
// card's default descriptor.
import { type Canvas2DLike } from './canvas2d.js';

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

// The non-optional mark. Present on every rendered image, exactly once.
export const WATERMARK = 'nikkesim.app';

// The footer line a card renders: the caller's descriptor (`footer` field) or
// the card's default, with the mark guaranteed. A descriptor that already
// carries the mark (e.g. 'nikkesim.app/charge') is used as-is — never
// duplicated, never stripped.
export function watermarkText(
  descriptor: string | undefined,
  fallback: string
): string {
  const base = descriptor ?? fallback;
  return base.includes(WATERMARK) ? base : `${base} · ${WATERMARK}`;
}

// Draw the mandatory watermark footer line. This is the ONLY way cards draw
// their footer — it always draws the mark, so no renderer (present or future)
// can ship an unwatermarked image by forgetting it.
export function drawWatermark(
  ctx: Canvas2DLike,
  x: number,
  y: number,
  fontSize: number,
  descriptor: string | undefined,
  fallback: string
): void {
  ctx.fillStyle = TEXT_SECONDARY;
  ctx.font = `400 ${fontSize}px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(watermarkText(descriptor, fallback), x, y);
}
