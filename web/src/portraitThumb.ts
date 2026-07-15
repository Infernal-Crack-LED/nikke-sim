// High-quality square portrait thumbnails, cached as data URLs keyed by
// `${url}@${size}`.
//
// Why this exists: the character-art CDN ignores resize params and only ever
// serves the full 256×512 art. The browser's default <img> downscaling samples
// too few source texels at the ~5–8× reduction we need, which aliases thin
// character outlines into jagged edges (visibly better the more you zoom in —
// i.e. the less it's shrunk). We instead downscale ourselves with STEPPED
// halving + `imageSmoothingQuality: 'high'`, so each step averages a 2× region
// and edges stay smooth. The CDN sends `access-control-allow-origin: *` and we
// request with `crossOrigin='anonymous'`, so the canvas is untainted and
// toDataURL is allowed.
import { PORTRAIT_CROP_TOP } from '../../src/share/teamCard';

const cache = new Map<string, string>();
const inflight = new Map<string, Promise<string | null>>();

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function makeCanvas(size: number): { cv: HTMLCanvasElement; cx: CanvasRenderingContext2D } | null {
  const cv = document.createElement('canvas');
  cv.width = size;
  cv.height = size;
  const cx = cv.getContext('2d');
  if (!cx) return null;
  cx.imageSmoothingEnabled = true;
  cx.imageSmoothingQuality = 'high';
  return { cv, cx };
}

// Center-cropped square thumbnail of `url` at `size`×`size` device px. Mirrors
// the Sim tab's `object-fit: cover` + `object-position: center 12.5%` framing.
// Resolves null on failure
// (or where canvas is unavailable, e.g. JSDOM), so callers fall back to the raw
// image.
export async function portraitThumb(url: string, size: number): Promise<string | null> {
  // No-op outside a real browser (SSR / JSDOM smoke): no Image/canvas to use, so
  // callers fall back to the raw <img>.
  if (typeof document === 'undefined' || typeof Image === 'undefined') return null;

  const key = `${url}@${size}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const pending = inflight.get(key);
  if (pending) return pending;

  const job = (async (): Promise<string | null> => {
    const img = await loadImage(url);
    if (!img) return null;
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (!iw || !ih) return null;

    // crop the largest square out of the (tall) source, anchored PORTRAIT_CROP_TOP
    // down from the top (horizontally centered) — matches the Sim tab's object-position.
    const side = Math.min(iw, ih);
    const sx = (iw - side) / 2;
    const sy = (ih - side) * PORTRAIT_CROP_TOP;

    let stage = makeCanvas(side);
    if (!stage) return null;
    stage.cx.drawImage(img, sx, sy, side, side, 0, 0, side, side);
    let cur = side;

    // halve until within 2× of the target, then one final draw to exact size
    while (cur > size * 2) {
      const next = Math.max(size, Math.round(cur / 2));
      const step = makeCanvas(next);
      if (!step) return null;
      step.cx.drawImage(stage.cv, 0, 0, cur, cur, 0, 0, next, next);
      stage = step;
      cur = next;
    }
    if (cur !== size) {
      const out = makeCanvas(size);
      if (!out) return null;
      out.cx.drawImage(stage.cv, 0, 0, cur, cur, 0, 0, size, size);
      stage = out;
    }

    const data = stage.cv.toDataURL('image/png');
    cache.set(key, data);
    return data;
  })();

  inflight.set(key, job);
  try {
    return await job;
  } finally {
    inflight.delete(key);
  }
}
