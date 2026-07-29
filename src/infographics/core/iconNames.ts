// Logical field value → icon FILE NAME in web/public/nikke-icons/.
//
// Pure and platform-free, so both hosts resolve the same asset for the same
// unit: the Node build rasterizes through sharp (node/icons.ts) and the browser
// loads an <img> (web/src/unitCardShare.ts). Keeping the mapping here rather
// than in the Node module is what stops the two hosts picking different files —
// the failure mode is silent and only visible by comparing two rendered cards.
import { BOSS_TABLES, iconBasename } from './resourcesData.js';
export const ICON_BY_ELEMENT: Record<string, string> = {
  Fire: 'code_fire',
  Water: 'code_water',
  Wind: 'code_wind',
  Electric: 'code_electric',
  Iron: 'code_iron',
};

// The class and burst icons are the owner's higher-resolution set (2026-07-28),
// which REPLACED the previous files in place — the 25x25 class rasters and the
// burst svg/png pair are gone, and both the card and the site draw these. They
// are tightly cropped, with no transparent margin unlike the set they replaced,
// so the card draws them at FULL box size (unitCard.ts ICON_FIT) and the Node
// loader's contain-into-square fits them by their taller dimension.
export const ICON_BY_CLASS: Record<string, string> = {
  Attacker: 'class_attacker',
  Defender: 'class_defender',
  // The asset is `class_support`, the data says "Supporter" — the mismatch is
  // why this is a map rather than a lowercase() call.
  Supporter: 'class_support',
};

// Burst stage → icon. `Λ` has a glyph of its own (`burst_lambda`), so red-hood
// (Red Hood, SR/Iron Attacker — NOT rapi-red-hood, Rapi: Red Hood, MG/Fire,
// which is a different unit already typed 'III') no longer borrows the B3 icon.
// Ruling 10 still governs the tile/bar SET she is scored against; that is a
// separate question from which glyph her burst stage draws.
export const ICON_BY_BURST: Record<string, string> = {
  I: 'burst_1',
  II: 'burst_2',
  III: 'burst_3',
  Λ: 'burst_lambda',
};

const WEAPONS = ['ar', 'mg', 'rl', 'sg', 'smg', 'sr'];

// Pistol is a valid Weapon in the type union but has no icon asset (no Pistol
// unit on the roster today) — resolve to null rather than a 404 path.
export const iconNameForWeapon = (weapon: string): string | null => {
  const w = weapon.toLowerCase();
  return WEAPONS.includes(w) ? `weapon_${w}` : null;
};

const MANUFACTURERS = ['elysion', 'missilis', 'tetra', 'pilgrim', 'abnormal'];

// The synced manufacturer carries an " Overspec" suffix for the 4 overspec units
// (sync.ts OVERSPEC_SLUGS) because their bond bonus follows a different class
// tier. That is a STAT bucket, not a different company, so the suffix is
// stripped to resolve the icon — the card surfaces the distinction as a badge
// instead (UnitCardModel.overspec), rather than dropping it silently.
export const iconNameForManufacturer = (mfr: string): string | null => {
  const base = mfr.replace(/ Overspec$/, '').toLowerCase();
  return MANUFACTURERS.includes(base) ? `man_${base}` : null;
};

export const iconNameForElement = (element: string): string | null =>
  ICON_BY_ELEMENT[element] ?? null;
export const iconNameForClass = (cls: string): string | null =>
  ICON_BY_CLASS[cls] ?? null;
export const iconNameForBurst = (burst: string): string | null =>
  ICON_BY_BURST[burst] ?? null;

export const isOverspec = (mfr: string | null): boolean =>
  !!mfr && / Overspec$/.test(mfr);

// Resources card (core/resourcesData.ts + core/resourcesCard.ts) fixed icon
// names — not resolved from a data field like the ones above, so a plain list
// rather than a Record. The per-boss fragment icons are derived from
// BOSS_TABLES itself so this list can't drift from what the card actually
// requests.
export const RESOURCE_ICON_NAMES: string[] = [
  'res_module',
  'res_t9_gear',
  'res_lock',
  'res_xp_fodder',
  ...BOSS_TABLES.map((t) => iconBasename(t.fragmentIcon)),
];

// Every logical icon a card can ask for — the population the build-time gate
// asserts is live.
export const ALL_ICON_NAMES: string[] = [
  ...Object.values(ICON_BY_ELEMENT),
  ...new Set(Object.values(ICON_BY_BURST)),
  ...Object.values(ICON_BY_CLASS),
  ...MANUFACTURERS.map((m) => `man_${m}`),
  ...WEAPONS.map((w) => `weapon_${w}`),
  ...RESOURCE_ICON_NAMES,
];
