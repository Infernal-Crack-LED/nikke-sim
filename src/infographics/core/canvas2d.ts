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
  if (maxW <= 0 || ctx.measureText(text).width <= maxW) {
    return text;
  }
  let s = text;
  while (s.length > 1 && ctx.measureText(`${s}…`).width > maxW) {
    s = s.slice(0, -1);
  }
  return `${s}…`;
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
