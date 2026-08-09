// Backend-selector passenger-channel fix
// (docs/handoffs/closed/2026-08-04-backend-selector-LANDING-PLAN.md §3).
//
// `white`/`red`/`total` are picked by an active-backend median/best-match keyed on
// `white + red` (read-pellets.ts, untouched by this module). `marker` and `band` are separate,
// near-boolean channels that used to ride along as PASSENGERS of that same choice — reading off
// whichever backend `best` happened to be, even on frames where `best` was only `backendEntries[0]`
// because `Array.reduce`'s strict `<` never found a reason to move off the initial accumulator
// (every backend's `white + red` was 0, so no comparison was ever strictly less).
//
// Activity for these two channels must be judged PER CHANNEL, not via `white + red`: keying it off
// `white + red > 0` is false for every backend on exactly the frames the defect fires, so that
// definition would silently discard a real `marker`/`band` reading and emit 0 (the original design,
// found fatal in the plan's pre-op gate — see §3).

export interface PassengerChannelEntry {
  marker?: number;
  band?: number;
}

/**
 * Select the value to emit for one passenger channel (`marker` or `band`) on a frame: the first
 * backend in `backendEntries` (in order) whose OWN value for that channel is > 0, else `best`'s
 * value for that channel, else 0.
 *
 * Because activity is defined on the channel itself rather than on `white + red`, this still finds
 * a real value on frames where every backend's `white + red` is 0 — the case the old
 * `best.marker ?? 0` / `best.band ?? 0` read got wrong by inheriting `best`'s array-order tie-break.
 * In single-backend production (the zero-filled backends never report a value > 0 for a channel
 * they don't run), the sole active backend always supplies both channels, so this is exactly
 * equivalent to reading that backend directly.
 */
export function selectPassengerChannel(
  backendEntries: readonly PassengerChannelEntry[],
  best: PassengerChannelEntry,
  channel: 'marker' | 'band'
): number {
  for (const b of backendEntries) {
    const v = b[channel] ?? 0;
    if (v > 0) {
      return v;
    }
  }
  return best[channel] ?? 0;
}
