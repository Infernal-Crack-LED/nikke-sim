// The one place that decides which buffer rows the Team Buffs leaderboard
// shows. Two rules:
//
// 1. Negative rows are dropped — the unit costs the standard comp damage, so
//    it has no standing on a support ranking, and its bar wrecks the chart's
//    geometry besides: the track spans min↔max, so one −18.8% row pushes the
//    zero axis a fifth of the way across and squashes every positive bar into
//    the remainder. Same property EXCLUDED_BUFFER_SLUGS screens for a step
//    earlier, at the population filter (src/ranks/buffer.ts).
// 2. HIDDEN_BUFFER_SLUGS are dropped by name.
//
// Both hosts filter through here — the web tab / Card Builder bars
// (web/src/rankBoardsData.ts bufferBars) and the shared table card
// (src/infographics/core/rankTables.ts buildBufferTable) — so ranks are
// numbered over the same set on the chart and its share image. The artifact
// itself keeps every row: the unit card quotes a unit's own value directly
// (src/infographics/core/unitCardData.ts) and is not a leaderboard.
import type { BufferRow } from './types.js';

// Kept off the board by owner direction (2026-08-03). Unlike
// EXCLUDED_BUFFER_SLUGS these units are still simmed and still carry their
// value everywhere else it is quoted — only the ranked board omits them.
export const HIDDEN_BUFFER_SLUGS = new Set(['chime', 'avistar']);

export const rankedBufferRows = (rows: BufferRow[]): BufferRow[] =>
  rows.filter(
    ([slug, addedPct]) => addedPct >= 0 && !HIDDEN_BUFFER_SLUGS.has(slug)
  );
