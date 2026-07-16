// Relationship (bond) bonus — a flat HP/ATK/DEF stat granted by a unit's bond level.
// Present in every in-game recording but was unmodeled → the sim read ~1.5-2% cold across
// scope-lock units (open-questions U18). The bonus is a CLASS × MANUFACTURER stat:
//   - the MANUFACTURER sets the max bond level (Pilgrim/Overspec cap at 40, others at 30);
//   - the CLASS (Attacker/Defender/Supporter) picks the stat column at that level.
// Overspec units carry a manufacturer string ending " Overspec" (sync.ts OVERSPEC_SLUGS).
// Data: data/relationship-bonus.json (was an in-game bond CSV).
import relData from '../data/relationship-bonus.json' with { type: 'json' };
import type { NikkeClass } from './types.js';

export interface RelationshipStat { hp: number; atk: number; def: number }

const MAX_LEVEL: Record<string, number> = relData.manufacturerMaxLevel;
const BY_LEVEL = relData.statsByLevel as Array<
  { level: number } & Record<NikkeClass, RelationshipStat>
>;
const ZERO: RelationshipStat = { hp: 0, atk: 0, def: 0 };

/** Normalize a manufacturer string to its max-level key ('… Overspec' → 'overspec'). */
function mfrKey(manufacturer: string | null): string | null {
  if (!manufacturer) return null;
  const m = manufacturer.toLowerCase();
  return m.endsWith(' overspec') ? 'overspec' : m;
}

/** Max bond level for a manufacturer (0 if unknown/none — e.g. Abnormal is not in the table). */
export function maxBondLevel(manufacturer: string | null): number {
  const key = mfrKey(manufacturer);
  return (key && MAX_LEVEL[key]) || 0;
}

/**
 * Flat relationship bonus for (class, manufacturer) at a bond level. `level` defaults to the
 * manufacturer's max and is clamped to [0, max]; level < 1 (or unknown manufacturer) → no bonus.
 */
export function relationshipBonus(
  cls: NikkeClass,
  manufacturer: string | null,
  level?: number,
): RelationshipStat {
  const max = maxBondLevel(manufacturer);
  if (max < 1) return ZERO;
  const lvl = Math.max(0, Math.min(Math.round(level ?? max), max));
  if (lvl < 1) return ZERO;
  const row = BY_LEVEL[lvl - 1];
  return row?.[cls] ?? ZERO;
}
