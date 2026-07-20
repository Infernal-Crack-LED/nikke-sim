// Maps a backend-normalized synced loadout (SyncedUnitLoadout — labels + values)
// onto the sim's own keys, so the "Synced Roster" preset can patch a team slot
// with a user's actual account build. The backend resolves game ids → labels
// (see docs/handoffs/2026-07-18-synced-roster-stats-backend-contract.md); this
// module owns the trivial label → sim-key half, keyed on the very `name` fields
// the sim already stores in data/ol-lines.json and data/cubes.json.
import charactersJson from '../../data/characters.json';
import olLinesJson from '../../data/ol-lines.json';
import olTiersJson from '../../data/ol-tiers.json';
import cubesJson from '../../data/cubes.json';
import type { GearLevel } from '../../src/types';
import type { LineSelection, UnitOptions } from '../../src/prepare';
import type { DollRarity, SyncedUnitLoadout } from './auth';

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

// Backend label variants that mean a known line but don't match data/ol-lines.json
// `name` exactly. bakery-bot forwards the blablalink locale string for these (the
// contract asks it to normalize to the canonical label; this is the sim-side safety
// net so the line isn't silently dropped). Exact backend label → sim line key.
const OL_LABEL_ALIASES: Record<string, string> = {
  'Increase Element Damage Dealt': 'elem',
  'Increase Max Ammunition Capacity': 'ammo',
};

// Cube name (data/cubes.json `name`) → sim cube id ("Bastion" → "bastion").
const CUBE_ID_BY_NAME: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  const cubes = (cubesJson as any).cubes as Record<string, { name: string }>;
  for (const [id, def] of Object.entries(cubes)) map[def.name] = id;
  return map;
})();

// OL roll tier (1-15) → per-line-key % value (data/ol-tiers.json). The backend
// sends (label, tier); we resolve tier → value here (a base T10 roll is tier 11).
const OL_TIER_ROWS = (olTiersJson as { tiers: Array<Record<string, number>> })
  .tiers;
function olTierValue(key: string, tier: number): number {
  const row = OL_TIER_ROWS.find((t) => t.tier === tier);
  return row ? (row[key] ?? 0) : 0;
}

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, Math.round(v)));

// The sim-native loadout for one owned unit, ready to patch a team slot. OL lines
// are pre-grouped the way SlotState wants them: elem/atk get their own textboxes,
// everything else is an `extra` entry (summed per stat).
export interface SlotLoadout {
  slug: string;
  ol: GearLevel; // display gear level; the real stats come from gearStats
  gearStats: { atk: number; hp: number } | null; // real T10 gear stats + Outpost bonus
  hasOverloadGear: boolean; // on full T10 overload gear (drives the generator's non-OL filter)
  stars: number; // 0-3
  core: number; // 0-7
  bond?: number; // bond level (undefined = leave to manufacturer max)
  skill1?: number;
  skill2?: number;
  burst?: number;
  cubeId: string | null; // sim cube id, 'other' for an unmapped cube, null = none
  cubeLevel: number;
  doll: { rarity: DollRarity; level: number } | null; // Favorite Item
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
    const key = OL_KEY_BY_LABEL[line.label] ?? OL_LABEL_ALIASES[line.label];
    if (!key) {
      if (!unmappedLines.includes(line.label)) unmappedLines.push(line.label);
      continue;
    }
    const value = olTierValue(key, line.tier); // (label, tier) → % via ol-tiers.json
    if (value > 0) summed[key] = (summed[key] ?? 0) + value;
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

  // Gear: apply the real resolved T10 gear stats + the account Outpost (Recycle
  // Research) flat bonus. gear === null = not on T10 overload gear → no gearStats
  // (the sim uses its ol-level table) and the generator can filter it out.
  // (Outpost on a non-T10 unit is dropped — a negligible edge; those units are
  // excluded from the generator by default anyway.)
  const gear = l.gear ?? null;
  const outpost = l.outpost ?? null;
  const hasOverloadGear = gear != null;
  const gearStats = gear
    ? { atk: gear.atk + (outpost?.atk ?? 0), hp: gear.hp + (outpost?.hp ?? 0) }
    : null;
  const displayOl: GearLevel = l.gearTier === 'T10' || hasOverloadGear ? 5 : 0;

  // Doll (Favorite Item): pass rarity+level through; the sim maps it to stats.
  const doll = l.doll ?? null;

  return {
    slug,
    ol: displayOl,
    gearStats,
    hasOverloadGear,
    doll,
    stars: clamp(l.grade ?? 0, 0, 3),
    core: clamp(l.core ?? 0, 0, 7),
    bond:
      l.bond != null && Number.isFinite(l.bond)
        ? Math.max(0, Math.round(l.bond))
        : undefined,
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

// A resolved SlotLoadout → engine UnitOptions, for the generator (which sims each
// candidate with its own synced build). `zeroGear` models an included non-OL unit
// as having no gear stats (per the generator's Include-Non-OL option).
export function slotLoadoutToUnitOptions(
  L: SlotLoadout,
  opts: { zeroGear?: boolean } = {},
): UnitOptions {
  const lines: LineSelection[] = [];
  if (L.olElem > 0) lines.push({ type: 'elem', count: 1, value: L.olElem });
  if (L.olAtk > 0) lines.push({ type: 'atk', count: 1, value: L.olAtk });
  for (const e of L.olExtra)
    if (e.value > 0) lines.push({ type: e.type, count: 1, value: e.value });
  return {
    ol: L.ol,
    gearStats: opts.zeroGear ? { atk: 0, hp: 0 } : (L.gearStats ?? undefined),
    doll: L.doll ? { rarity: L.doll.rarity, level: L.doll.level } : false,
    stars: L.stars,
    core: L.core,
    relationshipLevel: L.bond,
    cube:
      L.cubeId && L.cubeId !== 'none'
        ? { id: L.cubeId, level: L.cubeLevel }
        : undefined,
    skillLevels:
      L.skill1 != null && L.skill2 != null && L.burst != null
        ? { skill1: L.skill1, skill2: L.skill2, burst: L.burst }
        : undefined,
    lines,
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
