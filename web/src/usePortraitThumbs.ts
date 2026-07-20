import { useEffect, useState } from 'react';
import { portraitThumb } from './portraitThumb';
import { manifestThumbUrl } from './portraitManifest';

// Resolve a set of portrait URLs to crisp square thumbnails, keyed by URL.
// Manifest hits (the generated /img/portraits webps) resolve synchronously —
// no canvas work, no CDN download. Units without a generated thumbnail fall
// back to the runtime stepped-halving downscale of the raw CDN art (see
// portraitThumb / imageDownscale.ts), so a freshly synced unit still renders
// crisply before the next `npm run thumbs`. Use this for ANY small on-page
// portrait <img> (team/roster grids, pickers) instead of pointing <img src>
// straight at the full-res art.
export function usePortraitThumbs(
  urls: (string | null | undefined)[],
  cssSize: number,
): Record<string, string> {
  const [thumbs, setThumbs] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const url of urls) {
      const hit = manifestThumbUrl(url, cssSize);
      if (url && hit) out[url] = hit;
    }
    return out;
  });
  const key = urls.filter(Boolean).join('|');
  useEffect(() => {
    let alive = true;
    const dpr = Math.min(
      typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
      3,
    );
    const size = Math.round(cssSize * dpr);
    const found: Record<string, string> = {};
    const jobs: Promise<void>[] = [];
    for (const url of urls) {
      if (!url) continue;
      const hit = manifestThumbUrl(url, cssSize);
      if (hit) {
        found[url] = hit;
        continue;
      }
      // no generated thumbnail — downscale the raw art at runtime
      jobs.push(
        portraitThumb(url, size).then((data) => {
          if (data) found[url] = data;
        }),
      );
    }
    Promise.all(jobs).then(() => {
      if (!alive) return;
      setThumbs((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const [u, v] of Object.entries(found)) {
          if (!next[u]) {
            next[u] = v;
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, cssSize]);
  return thumbs;
}
