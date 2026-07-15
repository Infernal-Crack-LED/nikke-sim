// Copy a DPS-chart infographic to the clipboard as a PNG, rendered via the shared
// isomorphic drawDpsChart. Falls back to a download when the clipboard image API is
// unavailable. Mirrors App.tsx's team-card image share.
import { CHART_W, chartHeight, drawDpsChart, type DpsChartData } from '../../src/share/dpsChart';
import type { Canvas2DLike } from '../../src/share/teamCard';
import { portraitThumb } from './portraitThumb';

// Load a portrait for the share canvas as a high-quality, pre-downscaled square
// (via portraitThumb — stepped halving avoids the outline aliasing a single big
// drawImage reduction causes). Falls back to the raw cross-origin image if the
// thumbnail can't be produced; the CDN sends `access-control-allow-origin: *`, so
// `crossOrigin='anonymous'` keeps the canvas untainted (toBlob/clipboard allowed).
// Resolves null on any failure so a missing portrait degrades to a text-only row.
function loadPortrait(url: string): Promise<HTMLImageElement | null> {
  return (async () => {
    const thumb = await portraitThumb(url, 120); // crisp square, comfortably above draw size
    const src = thumb ?? url;
    return new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  })();
}

export async function copyDpsChartImage(data: DpsChartData): Promise<'copied' | 'downloaded' | 'unsupported'> {
  // preload each bar's portrait into `img` so the isomorphic renderer can draw it
  await Promise.all(
    data.bars.map(async (b) => {
      if (b.imageUrl) b.img = (await loadPortrait(b.imageUrl)) ?? undefined;
    }),
  );

  const dpr = 2;
  const cv = document.createElement('canvas');
  cv.width = CHART_W * dpr;
  cv.height = chartHeight(data.bars.length, !!data.compare) * dpr;
  const ctx = cv.getContext('2d');
  if (!ctx) return 'unsupported';
  ctx.scale(dpr, dpr);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high'; // crisp portrait downscale
  drawDpsChart(ctx as unknown as Canvas2DLike, data);
  const blob = await new Promise<Blob | null>((res) => cv.toBlob((b) => res(b), 'image/png'));
  if (!blob) return 'unsupported';
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    return 'copied';
  } catch {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'dps-chart.png';
    a.click();
    URL.revokeObjectURL(a.href);
    return 'downloaded';
  }
}
