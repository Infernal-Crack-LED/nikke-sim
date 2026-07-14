// Copy a DPS-chart infographic to the clipboard as a PNG, rendered via the shared
// isomorphic drawDpsChart. Falls back to a download when the clipboard image API is
// unavailable. Mirrors App.tsx's team-card image share.
import { CHART_W, chartHeight, drawDpsChart, type DpsChartData } from '../../src/share/dpsChart';
import type { Canvas2DLike } from '../../src/share/teamCard';

export async function copyDpsChartImage(data: DpsChartData): Promise<'copied' | 'downloaded' | 'unsupported'> {
  const dpr = 2;
  const cv = document.createElement('canvas');
  cv.width = CHART_W * dpr;
  cv.height = chartHeight(data.bars.length, !!data.compare) * dpr;
  const ctx = cv.getContext('2d');
  if (!ctx) return 'unsupported';
  ctx.scale(dpr, dpr);
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
