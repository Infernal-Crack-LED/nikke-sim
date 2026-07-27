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
