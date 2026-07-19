// Maps a backend-normalized synced loadout (SyncedUnitLoadout — labels + values)
// onto the sim's own keys, so the "Synced Roster" preset can patch a team slot
// with a user's actual account build. The backend resolves game ids → labels
// (see docs/handoffs/2026-07-18-synced-roster-stats-backend-contract.md); this
// module owns the trivial label → sim-key half, keyed on the very `name` fields
// the sim already stores in data/ol-lines.json and data/cubes.json.
import charactersJson from '../../data/characters.json';
import olLinesJson from '../../data/ol-lines.json';
import cubesJson from '../../data/cubes.json';
import type { GearLevel } from '../../src/types';
import type { SyncedUnitLoadout } from './auth';

// name_code → sim slug (name_code lives at role.meta.name_code in characters.json).
const SLUG_BY_NAME_CODE: Record<number, string> = (() => {
  const map: Record<number, string> = {};
  const chars = (charactersJson as any).characters as Record<string, any>;
  for (const [slug, c] of Object.entries(chars)) {
    const code = c?.role?.meta?.name_code;
    if (code != null) map[code] = slug;
  }
  return map;
})();

// OL line label (data/ol-lines.json `name`) → sim line key ("Increase ATK" → "atk").
const OL_KEY_BY_LABEL: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  const lines = (olLinesJson as any).lines as Record<string, { name: string }>;
  for (const [key, def] of Object.entries(lines)) map[def.name] = key;
  return map;
})();

// Cube name (data/cubes.json `name`) → sim cube id ("Bastion" → "bastion").
const CUBE_ID_BY_NAME: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  const cubes = (cubesJson as any).cubes as Record<string, { name: string }>;
  for (const [id, def] of Object.entries(cubes)) map[def.name] = id;
  return map;
})();

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, Math.round(v)));

// The sim-native loadout for one owned unit, ready to patch a team slot. OL lines
// are pre-grouped the way SlotState wants them: elem/atk get their own textboxes,
// everything else is an `extra` entry (summed per stat).
export interface SlotLoadout {
  slug: string;
  ol: GearLevel; // gear level; synced units run Overload gear
  stars: number; // 0-3
  core: number; // 0-7
  bond?: number; // bond level (undefined = leave to manufacturer max)
  skill1?: number;
  skill2?: number;
  burst?: number;
  cubeId: string | null; // sim cube id, 'other' for an unmapped cube, null = none
  cubeLevel: number;
  olElem: number; // summed % of "Increase Elemental Damage" lines
  olAtk: number; // summed % of "Increase ATK" lines
  olExtra: { type: string; value: number }[]; // other lines, summed per stat
  // diagnostics (surfaced so unmapped game content is visible, never silent)
  unmappedCube?: string;
  unmappedLines?: string[];
}

// Resolve one backend loadout → a sim SlotLoadout. Returns null when the unit
// isn't modeled by the sim (no slug for its name_code) — the caller skips it.
export function resolveSyncedLoadout(l: SyncedUnitLoadout): SlotLoadout | null {
  const slug = SLUG_BY_NAME_CODE[l.nameCode];
  if (!slug) return null;

  // OL lines: group by sim key, summing values (the sim buckets stats anyway).
  const summed: Record<string, number> = {};
  const unmappedLines: string[] = [];
  for (const line of l.ol ?? []) {
    const key = OL_KEY_BY_LABEL[line.label];
    if (!key) {
      if (!unmappedLines.includes(line.label)) unmappedLines.push(line.label);
      continue;
    }
    if (Number.isFinite(line.value) && line.value > 0) {
      summed[key] = (summed[key] ?? 0) + line.value;
    }
  }
  const round2 = (n: number) => Number(n.toFixed(2));
  const olElem = round2(summed.elem ?? 0);
  const olAtk = round2(summed.atk ?? 0);
  const olExtra = Object.entries(summed)
    .filter(([k]) => k !== 'elem' && k !== 'atk')
    .map(([type, value]) => ({ type, value: round2(value) }));
  const hasOl = olElem > 0 || olAtk > 0 || olExtra.length > 0;

  // Cube: map name → sim id; an unmapped-but-present cube falls back to 'other'
  // (base ATK + elemental damage, no unique effect) and is flagged.
  let cubeId: string | null = null;
  let cubeLevel = 15;
  let unmappedCube: string | undefined;
  if (l.cube && l.cube.name) {
    const mapped = CUBE_ID_BY_NAME[l.cube.name];
    cubeId = mapped ?? 'other';
    if (!mapped) unmappedCube = l.cube.name;
    cubeLevel = clamp(l.cube.level || 15, 1, 15);
  }

  void hasOl; // (kept for readability of the OL grouping above)
  return {
    slug,
    // Synced units run Overload gear (OL lines only exist on it); default OL5,
    // the fully-invested endgame basis. gearTier is reserved for a future refine.
    ol: 5,
    stars: clamp(l.grade ?? 0, 0, 3),
    core: clamp(l.core ?? 0, 0, 7),
    bond: l.bond != null && Number.isFinite(l.bond) ? Math.max(0, Math.round(l.bond)) : undefined,
    skill1: l.skills ? clamp(l.skills.skill1, 1, 10) : undefined,
    skill2: l.skills ? clamp(l.skills.skill2, 1, 10) : undefined,
    burst: l.skills ? clamp(l.skills.burst, 1, 10) : undefined,
    cubeId,
    cubeLevel,
    olElem,
    olAtk,
    olExtra,
    unmappedCube,
    unmappedLines: unmappedLines.length ? unmappedLines : undefined,
  };
}

// Index a roster's loadouts by slug for O(1) slot lookup.
export function indexBySlug(
  loadouts: SyncedUnitLoadout[] | undefined,
): Map<string, SlotLoadout> {
  const out = new Map<string, SlotLoadout>();
  for (const l of loadouts ?? []) {
    const resolved = resolveSyncedLoadout(l);
    if (resolved) out.set(resolved.slug, resolved);
  }
  return out;
}
