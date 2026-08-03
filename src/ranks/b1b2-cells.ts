// The B1/B2 DPS board's cell axis — ONE declaration, shared by every layer.
//
// A cell is the (core exposure × element advantage) basis a row was simulated on.
// This union was previously spelled out five times (the ranks board, the artifact
// type, the infographics table builder, and twice in web/), so adding a cell meant
// finding all five and the label map that goes with them.
//
// Deliberately a leaf: no imports, no runtime deps. web/ pulls it straight in, so it
// must never drag the sim into the browser bundle.
//
// NOTE on "Core 100": the cell names an EXPOSURE, not a hit rate — `c100` means the
// boss core is exposed for the whole fight, not that every shot hits it. It maps to
// `SimConfig.coreHitRate`, which the engine multiplies by the accuracy-derived core
// rate (`sim.ts`: `coreRateUsed = cfg.coreHitRate * acr`), so even at c100 a fraction
// of auto-aim shots land off-core.

export type B1B2DpsCell =
  'c0-neutral' | 'c0-eleadv' | 'c100-neutral' | 'c100-eleadv';

export const B1B2_DPS_CELLS: B1B2DpsCell[] = [
  'c0-neutral',
  'c0-eleadv',
  'c100-neutral',
  'c100-eleadv',
];

export const DEFAULT_B1B2_CELL: B1B2DpsCell = 'c100-eleadv';

export const B1B2_CELL_LABEL: Record<B1B2DpsCell, string> = {
  'c0-neutral': 'No Core · Neutral',
  'c0-eleadv': 'No Core · Ele Adv',
  'c100-neutral': 'Core 100 · Neutral',
  'c100-eleadv': 'Core 100 · Ele Adv',
};

/**
 * Narrow an untrusted cell id (URL param, saved builder state) against an artifact,
 * falling back to the default when it is unknown or the artifact lacks that cell.
 */
export function resolveB1B2Cell<T>(
  cells: Partial<Record<B1B2DpsCell, T>>,
  cell: string
): B1B2DpsCell {
  return B1B2_DPS_CELLS.includes(cell as B1B2DpsCell) &&
    cells[cell as B1B2DpsCell]
    ? (cell as B1B2DpsCell)
    : DEFAULT_B1B2_CELL;
}
