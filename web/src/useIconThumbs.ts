import { useEffect, useState } from 'react';
import { steppedDownscale } from './imageDownscale';

// Resolve icon URLs to crisp, pre-downscaled square thumbnails (data URLs),
// keyed by URL. Falls back to the raw URL until ready. Sized to the display's
// device pixels so the browser does NO further (aliasing) downscale.
//
// Letterboxes non-square sources with transparent padding so the full icon is
// preserved (no cropping) while still producing a square output. For example,
// a 63×73 element badge becomes 73×73 with 5px transparent padding on each side.
//
// For small source images (<100px), skips the stepped-halving (designed for
// large reductions like 256×512 → 24px) and uses a single high-quality draw
// instead — stepping small images can introduce artifacts.
export function useIconThumbs(
  urls: (string | null | undefined)[],
  cssSize: number,
): Record<string, string> {
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const key = urls.filter(Boolean).join('|');
  useEffect(() => {
    let alive = true;
    const dpr = Math.min(
      typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
      3,
    );
    const size = Math.round(cssSize * dpr);
    for (const url of urls) {
      if (!url) continue;
      const img = new Image();
      img.onload = () => {
        if (!alive) return;
        const iw = img.naturalWidth || img.width;
        const ih = img.naturalHeight || img.height;
        if (!iw || !ih) return;

        // Letterbox to square: use the larger dimension as the square size,
        // center the image with transparent padding on the shorter axis.
        const squareSide = Math.max(iw, ih);

        let cv: HTMLCanvasElement | null;
        if (iw < 100 && ih < 100) {
          // Small source: single high-quality draw, no stepping.
          // Scale the image to fit within the square target, centered.
          const out = document.createElement('canvas');
          out.width = size;
          out.height = size;
          const cx = out.getContext('2d');
          if (!cx) return;
          cx.imageSmoothingEnabled = true;
          cx.imageSmoothingQuality = 'high';
          const scale = size / squareSide;
          const dw = iw * scale;
          const dh = ih * scale;
          const dx = (size - dw) / 2;
          const dy = (size - dh) / 2;
          cx.drawImage(img, 0, 0, iw, ih, dx, dy, dw, dh);
          cv = out;
        } else {
          // Large source: letterbox to a square canvas first, then step-downscale.
          const squareCanvas = document.createElement('canvas');
          squareCanvas.width = squareSide;
          squareCanvas.height = squareSide;
          const sqCx = squareCanvas.getContext('2d');
          if (!sqCx) return;
          const sx = (squareSide - iw) / 2;
          const sy = (squareSide - ih) / 2;
          sqCx.drawImage(img, 0, 0, iw, ih, sx, sy, iw, ih);
          cv = steppedDownscale(
            squareCanvas,
            0,
            0,
            squareSide,
            squareSide,
            size,
            size,
          );
        }

        if (cv) {
          const data = cv.toDataURL('image/png');
          setThumbs((prev) => (prev[url] ? prev : { ...prev, [url]: data }));
        }
      };
      img.src = url;
    }
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, cssSize]);
  return thumbs;
}
