// The one place that decides which units the Team Buffs board considers, and
// which of their rows it shows. Two rules:
//
// 1. OFF_BOARD_BUFFER_SLUGS are not on this board at all. The set is applied at
//    the SOURCE — scripts/build-bufferchart.ts filters the population through
//    bufferPopulation() (src/ranks/buffer.ts), so an off-board unit never
//    reaches the artifact and no consumer has to know it exists. The filter
//    below is the backstop for an artifact built before that landed (the
//    published-board fetch path can serve one) and the reason this list lives
//    in a leaf module: the Node builder and the web bundle both import it, and
//    buffer.ts pulls in the engine.
// 2. Negative rows are dropped — the unit costs the standard comp damage, so
//    it has no standing on a support ranking, and its bar wrecks the chart's
//    geometry besides: the track spans min↔max, so one −18.8% row pushes the
//    zero axis a fifth of the way across and squashes every positive bar into
//    the remainder. Same property EXCLUDED_BUFFER_SLUGS screens for a step
//    earlier, at the population filter (src/ranks/buffer.ts).
//
// Every host that NUMBERS ranks filters first — the web tab / Card Builder bars
// (web/src/rankBoardsData.ts bufferBars), the shared table card
// (src/infographics/core/rankTables.ts buildBufferTable) and the unit card
// (src/infographics/core/unitCardData.ts) — so a rank means the same thing on
// the chart, on its share image and on the unit's own card.
import type { BufferRow } from './types.js';

// Kept off the board by owner direction (2026-08-03). Unlike
// EXCLUDED_BUFFER_SLUGS — which screens for kits that would post a negative
// value — these units are excluded by name; they are still simmed, and every
// other board and the interactive sim carry them as normal.
export const OFF_BOARD_BUFFER_SLUGS = new Set(['chime', 'avistar']);

// Drop off-board units, keep everything else. This is what a rank number is
// counted over: negative rows still occupy a rank (the unit card quotes a
// unit's own value whatever its sign — see src/infographics/core/unitCardData.ts),
// they are just not drawn on the leaderboard.
export const onBoardBufferRows = (rows: BufferRow[] | undefined): BufferRow[] =>
  (rows ?? []).filter(([slug]) => !OFF_BOARD_BUFFER_SLUGS.has(slug));

// The leaderboard's rows: on-board units at zero or above.
export const rankedBufferRows = (rows: BufferRow[]): BufferRow[] =>
  onBoardBufferRows(rows).filter(([, addedPct]) => addedPct >= 0);
