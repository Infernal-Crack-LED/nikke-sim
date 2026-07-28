// Canvas-agnostic primitives shared by every infographic renderer. This module
// is DOM-free and platform-free — the caller creates and sizes the canvas
// (browser Canvas2D or @napi-rs/canvas) and hands the renderers a ctx.

// Structural subset of CanvasRenderingContext2D we use — keeps the renderers
// compilable without the DOM lib (root tsconfig) and works with node canvas
// contexts.
export interface Canvas2DLike {
  fillStyle: string;
  font: string;
  textAlign: string;
  textBaseline: string;
  globalAlpha: number;
  fillRect(x: number, y: number, w: number, h: number): void;
  fillText(text: string, x: number, y: number): void;
  measureText(text: string): { width: number };
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  arcTo(x1: number, y1: number, x2: number, y2: number, radius: number): void;
  closePath(): void;
  fill(): void;
  // portrait drawing (optional feature — callers that never pass images can omit
  // these; both browser Canvas2D and @napi-rs/canvas provide them).
  save(): void;
  restore(): void;
  clip(): void;
  drawImage(
    image: unknown,
    dx: number,
    dy: number,
    dw: number,
    dh: number
  ): void;
  // source-cropping form (sx,sy,sw,sh → dx,dy,dw,dh): lets us crop a square out of a
  // tall portrait instead of squishing its aspect ratio into the destination box.
  drawImage(
    image: unknown,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    dx: number,
    dy: number,
    dw: number,
    dh: number
  ): void;
}

// Portrait square-crop framing — the single source of truth for how far down a
// square is anchored when cropped out of a tall portrait (fraction of the vertical
// overflow; 0 = top, 0.5 = center). Used by BOTH canvas crops (portraitThumb,
// dpsChart) and, via the `--portrait-crop-top` CSS var that main.tsx sets from it,
// the `object-position` on the sim-tab / chart <img>s. Change here to move all of
// them together.
export const PORTRAIT_CROP_TOP = 0.16;

// Fit a string into `maxW`, ellipsizing when it doesn't. Layout geometry is
// fixed but string widths are font metrics, so measureText is the only honest
// ruler — without this a long label simply overdraws whatever sits beside it.
// The caller sets ctx.font BEFORE calling (the measurement is font-dependent).
export function fitText(ctx: Canvas2DLike, text: string, maxW: number): string {
  // A non-positive budget used to return the FULL string — the exact overdraw
  // this helper exists to prevent, in the one regime where it is guaranteed to
  // happen. No current caller can reach it (every call site derives maxW from
  // a positive column), so this is a latent guard rather than a live fix; it
  // is here because the old failure mode was silent. (Cross-family review
  // 2026-07-28.)
  if (maxW <= 0) {
    return '…';
  }
  if (ctx.measureText(text).width <= maxW) {
    return text;
  }
  let s = text;
  while (s.length > 1 && ctx.measureText(`${s}…`).width > maxW) {
    s = s.slice(0, -1);
  }
  return `${s}…`;
}

// ---- elemental-advantage marker ---------------------------------------------

// The ▲ that marks elemental advantage is DRAWN, not typed. Roboto has no
// U+25B2 and the Node renderer registers only the bundled Roboto faces, so the
// character rendered as a tofu box (□) on every pre-rendered card while the
// browser silently fell back to a system face — two hosts, two pictures, which
// is exactly what these renderers exist to prevent. A path has no font
// dependency and is pixel-identical on both.
//
// Callers lay it out as `gap + width` of extra label reach and draw it with the
// fillStyle already set for the name.
export const ADVANTAGE_MARK_GAP = 8; // space between the name and the mark
export const ADVANTAGE_MARK_W = 10;

// Draw the marker with its left edge at `x`, sitting on the text baseline.
export function drawAdvantageMark(
  ctx: Canvas2DLike,
  x: number,
  baselineY: number,
  w: number = ADVANTAGE_MARK_W
): void {
  const h = w * 0.88;
  const bottom = baselineY - 1; // just off the baseline, like a cap-height glyph
  ctx.beginPath();
  ctx.moveTo(x + w / 2, bottom - h);
  ctx.lineTo(x + w, bottom);
  ctx.lineTo(x, bottom);
  ctx.closePath();
  ctx.fill();
}

// ---- bar-chart label column (one rule for every bar image) -------------------

// Gap between the longest label and the start of the bar track. Owner style
// ruling (2026-07-28): a bar never clips a NIKKE's name — the bars shrink to
// make room, and a little air is left between the longest name and the track.
export const BAR_LABEL_GAP = 16;

// Where a bar track starts, given the x each label ENDS at (label start +
// measured width). Grows to clear the longest label + BAR_LABEL_GAP, clamped
// to [min, max]: `min` keeps a short roster at the card's designed proportions,
// `max` stops one very long name from squeezing the bars away (names past it
// ellipsize via fitText). Shared by dpsChart.ts and teamCard.ts so every bar
// image obeys the same rule.
export function barTrackX(labelEndX: number, min: number, max: number): number {
  return Math.min(Math.max(labelEndX + BAR_LABEL_GAP, min), max);
}

export function roundRect(
  ctx: Canvas2DLike,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
