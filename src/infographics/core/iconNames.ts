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

// CARD-ONLY ASSETS (`card_*`, 2026-07-28). The class and burst icons the card
// draws are a higher-resolution set the owner supplied, kept under their own
// names so THIS surface can adopt them while the site keeps loading the old
// `class_*` / `burst_*` files it hardcodes (web/src/components/CharacterGrid.tsx
// builds those paths as string literals — it does not read this map). If they
// hold up on the cards, the old files get replaced and the site follows; until
// then the two sets coexist deliberately.
//
// They are tightly cropped — no transparent margin, unlike the raster sets they
// replace — so the card draws them at FULL box size (unitCard.ts ICON_FIT) and
// the loader's contain-into-square fits them by their taller dimension.
export const ICON_BY_CLASS: Record<string, string> = {
  Attacker: 'card_class_attacker',
  Defender: 'card_class_defender',
  // The asset is `*_class_support`, the data says "Supporter" — the mismatch is
  // why this is a map rather than a lowercase() call.
  Supporter: 'card_class_support',
};

// Burst stage → icon, from the card-only set described above. `Λ` now has a
// glyph of its own (`card_burst_lambda`), so red-hood (Red Hood, SR/Iron
// Attacker — NOT rapi-red-hood, Rapi: Red Hood, MG/Fire, which is a different
// unit already typed 'III') no longer borrows the B3 icon. Ruling 10 still
// governs the tile/bar SET she is scored against; that is a separate question
// from which glyph her burst stage draws.
export const ICON_BY_BURST: Record<string, string> = {
  I: 'card_burst_1',
  II: 'card_burst_2',
  III: 'card_burst_3',
  'Λ': 'card_burst_lambda',
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
