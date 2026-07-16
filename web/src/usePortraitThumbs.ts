import { useEffect, useState } from 'react';
import { portraitThumb } from './portraitThumb';

// Resolve a set of portrait URLs to crisp, pre-downscaled square thumbnails (data
// URLs), keyed by URL. Falls back to the raw URL until ready. Sized to the display's
// device pixels so the browser does NO further (aliasing) downscale — the shared
// stepped-halving downscale + PORTRAIT_CROP_TOP crop live in portraitThumb /
// imageDownscale.ts. Use this for ANY small on-page portrait <img> (team/roster
// grids, pickers) instead of pointing <img src> straight at the full-res CDN art.
export function usePortraitThumbs(
  urls: (string | null | undefined)[],
  cssSize: number,
): Record<string, string> {
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const key = urls.filter(Boolean).join('|');
  useEffect(() => {
    let alive = true;
    const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 3);
    const size = Math.round(cssSize * dpr);
    for (const url of urls) {
      if (!url) continue;
      void portraitThumb(url, size).then((data) => {
        if (alive && data) setThumbs((prev) => (prev[url] ? prev : { ...prev, [url]: data }));
      });
    }
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, cssSize]);
  return thumbs;
}
