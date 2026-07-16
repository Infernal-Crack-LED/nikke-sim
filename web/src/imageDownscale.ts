// High-quality browser image downscaling — the ONE place the "downscale it
// ourselves" lesson lives.
//
// THE LESSON: never let a single big `drawImage` do a large reduction. At the
// ~5–8× shrink we need for full-res CDN art (256×512 → a ~33–120px thumbnail) the
// browser's default sampler reads too few source texels per destination pixel and
// aliases thin character outlines into jagged edges (visibly worse the more it's
// shrunk). Instead HALVE repeatedly — each step averages a clean 2× region with
// `imageSmoothingQuality: 'high'` — then one final draw to the exact target.
//
// USE THIS for ANY non-full-size image we rasterize to a canvas (portraits,
// thumbnails, icons, share-card art). Returns null where canvas is unavailable
// (SSR / JSDOM smoke) so callers fall back to the raw <img>.

export type CanvasSource = HTMLImageElement | HTMLCanvasElement;

// A smoothing-primed offscreen canvas (null when there's no DOM/canvas).
export function makeCanvas(
  w: number,
  h: number = w,
): { cv: HTMLCanvasElement; cx: CanvasRenderingContext2D } | null {
  if (typeof document === 'undefined') return null;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const cx = cv.getContext('2d');
  if (!cx) return null;
  cx.imageSmoothingEnabled = true;
  cx.imageSmoothingQuality = 'high';
  return { cv, cx };
}

// Downscale the (sx,sy,sw,sh) crop of `src` to dw×dh via stepped halving, and
// return the final canvas (or null if canvas is unavailable). Only ever shrinks:
// each dimension halves toward its target and stops within 2×, then a single
// final draw hits the exact size. A crop already ≤ target is drawn once.
export function steppedDownscale(
  src: CanvasSource,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  dw: number,
  dh: number,
): HTMLCanvasElement | null {
  // stage 0: the cropped source at its own resolution
  let stage = makeCanvas(sw, sh);
  if (!stage) return null;
  stage.cx.drawImage(src, sx, sy, sw, sh, 0, 0, sw, sh);
  let cw = sw;
  let ch = sh;

  // halve each dim (independently) until within 2× of the target
  while (cw > dw * 2 || ch > dh * 2) {
    const nw = cw > dw * 2 ? Math.max(dw, Math.round(cw / 2)) : cw;
    const nh = ch > dh * 2 ? Math.max(dh, Math.round(ch / 2)) : ch;
    const step = makeCanvas(nw, nh);
    if (!step) return null;
    step.cx.drawImage(stage.cv, 0, 0, cw, ch, 0, 0, nw, nh);
    stage = step;
    cw = nw;
    ch = nh;
  }
  if (cw !== dw || ch !== dh) {
    const out = makeCanvas(dw, dh);
    if (!out) return null;
    out.cx.drawImage(stage.cv, 0, 0, cw, ch, 0, 0, dw, dh);
    stage = out;
  }
  return stage.cv;
}
