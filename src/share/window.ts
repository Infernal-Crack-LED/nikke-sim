// Shared row windowing for every row-based card (DPS chart, rank boards) —
// the §6.6 rule (docs/handoffs/2026-07-27-infographics-centralization-plan.md):
// default top 10; a targeted window is 4 rows above the target, the target,
// 5 below (biasing toward "who you can still catch"), clamped at both edges.
// Pure and DOM-free; the renderers slice with it and callers use it to size
// canvases. Phase 1 moves this to src/infographics/ with the rest of share/.
export const WINDOW_SIZE = 10;

// n = full population row count; targetIndex = 0-indexed population position of
// the requested unit (omit/negative = no target → top WINDOW_SIZE). Returns the
// half-open [start, end) slice of population indices to render:
//   n ≤ 10            → all rows
//   target rank ≤ 5   → rows 0–9   (no room for 4 above)
//   mid-board         → 4 above / target / 5 below
//   target rank ≥ n−4 → last 10    (no room for 5 below)
export function windowRows(
  n: number,
  targetIndex?: number
): { start: number; end: number } {
  const start =
    targetIndex === undefined || targetIndex < 0
      ? 0
      : Math.min(Math.max(targetIndex - 4, 0), Math.max(0, n - WINDOW_SIZE));
  return { start, end: Math.min(start + WINDOW_SIZE, n) };
}
