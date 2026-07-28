// Copy a DPS-chart infographic to the clipboard as a PNG, rendered via the shared
// isomorphic drawDpsChart. Falls back to a download when the clipboard image API is
// unavailable. Mirrors App.tsx's team-card image share.
import {
  CHART_W,
  chartHeight,
  chartWindow,
  drawDpsChart,
  type DpsChartData,
} from '../../src/infographics/core/dpsChart';
import type { Canvas2DLike } from '../../src/infographics/core/canvas2d';
import { ensureRoboto, loadPortrait } from './teamShare';

// Render a DPS-chart card to a canvas (portraits preloaded into the shown
// bars, Roboto awaited before the first draw — decision 6.1: a @font-face
// font is unusable by canvas until loaded, so drawing early silently yields
// fallback-metric text on the FIRST render). Null where canvas is
// unavailable (JSDOM). The /builder page previews and copies from this same
// canvas; copyDpsChartImage is the copy/download wrapper.
export async function buildDpsChartCanvas(
  data: DpsChartData
): Promise<HTMLCanvasElement | null> {
  // preload each SHOWN bar's portrait into `img` so the isomorphic renderer can
  // draw it (on a windowed chart, bars outside the window never render)
  const win = chartWindow(data);
  const shown = data.bars.slice(win.start, win.end);
  await Promise.all([
    ...shown.map(async (b) => {
      if (b.imageUrl) {
        b.img = (await loadPortrait(b.imageUrl)) ?? undefined;
      }
    }),
    ensureRoboto(),
  ]);

  const dpr = 2;
  const cv = document.createElement('canvas');
  cv.width = CHART_W * dpr;
  cv.height = chartHeight(shown.length, !!data.compare) * dpr;
  const ctx = cv.getContext('2d');
  if (!ctx) {
    return null;
  }
  ctx.scale(dpr, dpr);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high'; // crisp portrait downscale
  drawDpsChart(ctx as unknown as Canvas2DLike, data);
  return cv;
}

export async function copyDpsChartImage(
  data: DpsChartData
): Promise<'copied' | 'downloaded' | 'unsupported'> {
  const cv = await buildDpsChartCanvas(data);
  if (!cv) {
    return 'unsupported';
  }
  const blob = await new Promise<Blob | null>((res) =>
    cv.toBlob((b) => res(b), 'image/png')
  );
  if (!blob) {
    return 'unsupported';
  }
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
