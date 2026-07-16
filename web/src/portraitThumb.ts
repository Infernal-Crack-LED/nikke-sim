// High-quality square portrait thumbnails, cached as data URLs keyed by
// `${url}@${size}`.
//
// Why this exists: the character-art CDN ignores resize params and only ever
// serves the full 256×512 art. The browser's default <img> downscaling aliases
// thin character outlines at the ~5–8× reduction we need, so we downscale it
// ourselves via the shared stepped-halving helper (see imageDownscale.ts for the
// lesson). This module adds the portrait-specific parts: the square-crop framing,
// crossOrigin loading, and a data-URL cache. The CDN sends
// `access-control-allow-origin: *` and we request with `crossOrigin='anonymous'`,
// so the canvas is untainted and toDataURL is allowed.
import { PORTRAIT_CROP_TOP } from '../../src/share/teamCard';
import { steppedDownscale } from './imageDownscale';

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

    // high-quality square downscale via the shared stepped-halving helper
    const cv = steppedDownscale(img, sx, sy, side, side, size, size);
    if (!cv) return null;

    const data = cv.toDataURL('image/png');
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
