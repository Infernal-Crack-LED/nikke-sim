// Cached loader for the site's nikkesim-icon.png mark — the small logo drawn
// in the top-right corner of every share/preview card, beside the nikkesim.app
// wordmark (core/theme.ts drawBrandMark). Node rasterizes the same source PNG via sharp
// (src/server/app.ts); this is its browser twin, served from web/public/ at
// the root. Mirrors teamShare.ts's ensureRoboto load-once-cache pattern:
// resolves null on any failure (or outside a real browser, e.g. JSDOM smoke)
// so a card whose icon fails to load still renders, just without it.
let iconPromise: Promise<HTMLImageElement | null> | null = null;
export function loadSiteIcon(): Promise<HTMLImageElement | null> {
  if (typeof Image === 'undefined') {
    return Promise.resolve(null);
  }
  iconPromise ??= new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = `${import.meta.env.BASE_URL}nikkesim-icon.png`;
  });
  return iconPromise;
}
