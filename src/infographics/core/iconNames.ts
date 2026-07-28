// Logical field value → icon FILE NAME in web/public/nikke-icons/.
//
// Pure and platform-free, so both hosts resolve the same asset for the same
// unit: the Node build rasterizes through sharp (node/icons.ts) and the browser
// loads an <img> (web/src/unitCardShare.ts). Keeping the mapping here rather
// than in the Node module is what stops the two hosts picking different files —
// the failure mode is silent and only visible by comparing two rendered cards.
export const ICON_BY_ELEMENT: Record<string, string> = {
  Fire: 'code_fire',
  Water: 'code_water',
  Wind: 'code_wind',
  Electric: 'code_electric',
  Iron: 'code_iron',
};

export const ICON_BY_CLASS: Record<string, string> = {
  Attacker: 'class_attacker',
  Defender: 'class_defender',
  // The asset is `class_support`, the data says "Supporter" — the mismatch is
  // why this is a map rather than a lowercase() call.
  Supporter: 'class_support',
};

// Burst stage → icon. `Λ` has NO asset of its own. Ruling 10 treats red-hood
// (Red Hood, SR/Iron Attacker — NOT rapi-red-hood, Rapi: Red Hood, MG/Fire,
// which is a different unit already typed 'III') as B3 for tile/bar selection,
// and the owner approved reusing burst_3 as the ICON placeholder until a Λ glyph
// exists (2026-07-28). Tracked in docs/handoffs/QUEUE.md.
export const ICON_BY_BURST: Record<string, string> = {
  I: 'burst_1',
  II: 'burst_2',
  III: 'burst_3',
  'Λ': 'burst_3',
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

// Every logical icon a card can ask for — the population the build-time gate
// asserts is live.
export const ALL_ICON_NAMES: string[] = [
  ...Object.values(ICON_BY_ELEMENT),
  ...new Set(Object.values(ICON_BY_BURST)),
  ...Object.values(ICON_BY_CLASS),
  ...MANUFACTURERS.map((m) => `man_${m}`),
  ...WEAPONS.map((w) => `weapon_${w}`),
];
