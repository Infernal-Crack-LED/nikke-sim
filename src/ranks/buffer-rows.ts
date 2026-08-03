// The one place that decides which buffer rows the Team Buffs leaderboard
// shows. Rows whose value is negative — the unit costs the standard comp
// damage — are dropped, generalizing the Soline: Frost Ticket exclusion
// (src/ranks/buffer.ts EXCLUDED_BUFFER_SLUGS) from a hand-kept slug list to
// the property that motivated it. They also wreck the chart's geometry: the
// bar track spans min↔max, so one −18.8% row pushes the zero axis a fifth of
// the way across and squashes every positive bar into the remainder.
//
// Both hosts filter through here — the web tab / Card Builder bars
// (web/src/rankBoardsData.ts bufferBars) and the shared table card
// (src/infographics/core/rankTables.ts buildBufferTable) — so ranks are
// numbered over the same set on the chart and its share image. The artifact
// itself keeps every row: the unit card quotes a unit's own value directly
// (src/infographics/core/unitCardData.ts) and is not a leaderboard.
import type { BufferRow } from './types.js';

export const rankedBufferRows = (rows: BufferRow[]): BufferRow[] =>
  rows.filter(([, addedPct]) => addedPct >= 0);
