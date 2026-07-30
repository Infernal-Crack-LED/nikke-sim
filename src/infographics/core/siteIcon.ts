// Shared geometry for placing the nikkesim-icon.png mark beside a card's
// title so it reads as part of the title LINE, not a bigger, lower-slung
// badge hanging below it.
//
// nikkesim-icon.png is a 256×256 canvas, but the actual bar art is NOT the
// full square — it's a rounded, transparent-cornered PLATE with the bars
// drawn inset inside it (measured 2026-07-29 by scanning for pixels off the
// plate's own background fill: the bars occupy y=52..211 of the 256px
// source, centered). Sizing/positioning the drawn image by ITS OWN bounding
// box puts the PLATE's edges on the title's cap height, not the bars' — the
// bars end up visibly smaller and offset. Scaling the whole plate so this
// measured content band lands on [baseline - capHeight, baseline] instead
// makes the visible bars — not the plate — match the title's cap height.
const CONTENT_FRAC_TOP = 52 / 256;
const CONTENT_FRAC_BOTTOM = 212 / 256;

// The full square (plate) size to draw so the visible bar band spans exactly
// `capHeight` px.
export function siteIconSizeFor(capHeight: number): number {
  return capHeight / (CONTENT_FRAC_BOTTOM - CONTENT_FRAC_TOP);
}

// The plate's draw-y so its bar band's BOTTOM edge sits on the title's
// text baseline (matching a capital letter's own bottom edge).
export function siteIconTopFor(baselineY: number, plateSize: number): number {
  return baselineY - CONTENT_FRAC_BOTTOM * plateSize;
}

// A title font's cap height in px, i.e. how tall its capital letters' ink
// actually is — NOT the CSS font-size, which includes ascender/descender
// headroom a cap letter never uses. Measured directly off a rendered glyph
// per font-weight/size (not assumed from a generic metrics ratio, which can
// be wrong for a given font/hinting): "R" at 700 weight, Roboto.
//   24px → 17px cap height (baseline 44; ink y=27..43)
//   26px → 19px cap height (baseline 50; ink y=31..49)
//   30px → 21px cap height (baseline 56; ink y=35..55)
// Re-measure (draw "R", scan the alpha-channel bounding box) if a card
// changes its title font size and needs a new entry.
export const TITLE_CAP_HEIGHT: Record<number, number> = {
  24: 17,
  26: 19,
  30: 21,
};
