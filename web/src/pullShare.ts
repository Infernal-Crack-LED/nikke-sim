// Pull-card share pipeline for the browser — the fourth host alongside
// shareImage.ts (DPS charts), teamShare.ts (team/roster cards) and
// tableShare.ts (table cards), so the /pull page's Copy image button and the
// Card Builder's preview both draw through ONE place: render the isomorphic
// drawPullCard (the same code the server pre-renders and the API renders on
// demand with) to a PNG and copy/download it.
import {
  PULL_CARD_W,
  pullCardHeight,
  drawPullCard,
  type PullCardData,
} from '../../src/infographics/core/pullCard';
import type { Canvas2DLike } from '../../src/infographics/core/canvas2d';
import { ensureRoboto, copyOrDownloadPng } from './teamShare';
import { loadSiteIcon } from './siteIcon';

// Render a pull card to a canvas (Roboto awaited before the first draw,
// decision 6.1 — the same font gate the other hosts use). Null where canvas is
// unavailable (JSDOM).
export async function buildPullCardCanvas(
  data: PullCardData
): Promise<HTMLCanvasElement | null> {
  const [icon] = await Promise.all([loadSiteIcon(), ensureRoboto()]);
  data.icon ??= icon ?? undefined;
  const dpr = 2;
  const cv = document.createElement('canvas');
  cv.width = PULL_CARD_W * dpr;
  cv.height = pullCardHeight(data.rows.length) * dpr;
  const ctx = cv.getContext('2d');
  if (!ctx) {
    return null;
  }
  ctx.scale(dpr, dpr);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  drawPullCard(ctx as unknown as Canvas2DLike, data);
  return cv;
}

// Copy a pull infographic to the clipboard as a PNG (download fallback via
// copyOrDownloadPng).
export async function copyPullCardImage(
  data: PullCardData,
  filename = 'nikke-pull.png'
): Promise<'copied' | 'downloaded' | 'unsupported'> {
  const cv = await buildPullCardCanvas(data);
  if (!cv) {
    return 'unsupported';
  }
  const blob = await new Promise<Blob | null>((res) =>
    cv.toBlob((b) => res(b), 'image/png')
  );
  if (!blob) {
    return 'unsupported';
  }
  return copyOrDownloadPng(blob, filename);
}
