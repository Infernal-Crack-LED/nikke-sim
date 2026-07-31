// Browser build/copy pipeline for the rank-board bar chart (Card Builder's
// Support Ranks card) — mirrors shareImage.ts (DPS chart) exactly: preload
// each bar's portrait + the site icon, await fonts, draw the isomorphic
// drawRankChart to a canvas.
import {
  RANK_CHART_W,
  rankChartHeight,
  drawRankChart,
  type RankChartBar,
  type RankChartData,
} from '../../src/infographics/core/rankChart';
import type { Canvas2DLike } from '../../src/infographics/core/canvas2d';
import { ensureRoboto, loadPortrait } from './teamShare';
import { loadSiteIcon } from './siteIcon';

export async function buildRankChartCanvas(
  data: RankChartData
): Promise<HTMLCanvasElement | null> {
  const [icon] = await Promise.all([
    loadSiteIcon(),
    Promise.all(
      data.bars.map(async (b: RankChartBar) => {
        if (b.imageUrl) {
          b.img = (await loadPortrait(b.imageUrl)) ?? undefined;
        }
      })
    ),
    ensureRoboto(),
  ]);
  data.icon ??= icon ?? undefined;

  const dpr = 2;
  const cv = document.createElement('canvas');
  cv.width = RANK_CHART_W * dpr;
  cv.height = rankChartHeight(data.bars.length) * dpr;
  const ctx = cv.getContext('2d');
  if (!ctx) {
    return null;
  }
  ctx.scale(dpr, dpr);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  drawRankChart(ctx as unknown as Canvas2DLike, data);
  return cv;
}
