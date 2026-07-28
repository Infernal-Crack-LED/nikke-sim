// Table-card share pipeline for the browser — the third host alongside
// shareImage.ts (DPS charts) and teamShare.ts (team/roster cards), extracted
// so every tab's "Copy image" button draws through ONE place: render the
// isomorphic drawTableCard (same code the server pre-renders with) to a PNG
// and copy/download it. Used by the ranks / charge / olsim / overload / doll /
// resources share buttons.
import {
  TABLE_W,
  tableHeight,
  visibleRows,
  drawTableCard,
  type TableCardData,
} from '../../src/infographics/core/tableCard';
import {
  buildOlTable,
  type OlDefaultArtifact,
} from '../../src/infographics/core/tableData';
import type { Canvas2DLike } from '../../src/infographics/core/canvas2d';
import { ensureRoboto, copyOrDownloadPng } from './teamShare';

// Copy a table infographic to the clipboard as a PNG (download fallback via
// copyOrDownloadPng). The Roboto @font-face must be live before the first
// draw (decision 6.1) — awaited here like the other hosts. Callers attach an
// already-loaded icon/portrait (teamShare's loadPortrait) when the card
// wants one.
export async function copyTableCardImage(
  data: TableCardData,
  filename = 'nikke-table.png'
): Promise<'copied' | 'downloaded' | 'unsupported'> {
  await ensureRoboto();
  const dpr = 2;
  const cv = document.createElement('canvas');
  cv.width = TABLE_W * dpr;
  cv.height =
    tableHeight(visibleRows(data.rows, data.window).rows.length) * dpr;
  const ctx = cv.getContext('2d');
  if (!ctx) {
    return 'unsupported';
  }
  ctx.scale(dpr, dpr);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  drawTableCard(ctx as unknown as Canvas2DLike, data);
  const blob = await new Promise<Blob | null>((res) =>
    cv.toBlob((b) => res(b), 'image/png')
  );
  if (!blob) {
    return 'unsupported';
  }
  return copyOrDownloadPng(blob, filename);
}

// The committed OL-default artifact (web/public/ol-default.json, built by
// scripts/build-ol-default.ts) as a TableCardData — the same card the API
// pre-renders as table/ol. Lazy + cached, same pattern as rankBoardsData.ts.
let olDefault: Promise<TableCardData> | null = null;
export function loadOlDefaultTable(): Promise<TableCardData> {
  olDefault ??= fetch(`${import.meta.env.BASE_URL}ol-default.json`)
    .then((r) => {
      if (!r.ok) {
        throw new Error(`ol-default.json ${r.status}`);
      }
      return r.json() as Promise<OlDefaultArtifact>;
    })
    .then((art) => buildOlTable(art));
  return olDefault;
}
