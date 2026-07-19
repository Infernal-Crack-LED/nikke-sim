import type { BaseStats, GearLevel, LevelMultiplier, NikkeClass, Weapon } from './types.js';

// Direct port of ShiftyPad's stat formula (see base-stats-handoff.md).
// grade = Limit Breaks 0-3, core = Core enhancement 0-7+. ATK is exact; DEF/HP ~0.5%.
export function characterStat(
  bs: BaseStats,
  mult: LevelMultiplier,
  type: 'atk' | 'hp' | 'def',
  level: number,
  grade: number,
  core: number
): number {
  const curve = type === 'atk' ? mult.attack : type === 'hp' ? mult.hp : mult.def;
  if (level < 1 || level > curve.length) throw new Error(`level ${level} out of range 1-${curve.length}`);
  const base = Math.floor(
    bs[type] * curve[level - 1] * (1 + (grade * bs.grade.ratio) / 1e4) + grade * bs.grade[type]
  );
  return Math.round(base * (1 + (core * bs.core[type]) / 1e4));
}

export function copiesToGradeCore(copies: number): { grade: number; core: number } {
  return { grade: Math.min(copies, 3), core: Math.max(0, Math.min(copies - 3, 7)) };
}

// Gear set, per class. Three levels (see gear_doll.md, ATK pieces summed):
//   'base5' — the SCOPE-LOCK base gear (default manufacture set, no overload). Lower
//             ATK than OL0; this is the real validation basis (owner 2026-07-14 — the
//             sim previously used OL0 here, a ~1.8% ATK over-count that poisoned grades).
//   0 / 5   — Full T10 overload set at OL level 0 / 5.
const GEAR_ATK: Record<NikkeClass, Record<GearLevel, number>> = {
  Defender: { base5: 3234 + 2057 + 588, 0: 4010 + 2551 + 729, 5: 6015 + 3827 + 1093 },   // 5879 / 7290 / 10935
  Attacker: { base5: 4849 + 3087 + 882, 0: 6014 + 3827 + 1093, 5: 9021 + 5741 + 1639 },  // 8818 / 10934 / 16401
  Supporter: { base5: 4041 + 2573 + 735, 0: 5012 + 3189 + 911, 5: 7518 + 4783 + 1367 },  // 7349 / 9112 / 13668
};

export function gearAtk(cls: NikkeClass, ol: GearLevel): number {
  return GEAR_ATK[cls][ol];
}

// Gear set HP (3 HP pieces summed) by class + level — from gear_doll.md.
const GEAR_HP: Record<NikkeClass, Record<GearLevel, number>> = {
  Defender: { base5: 48477 + 157548 + 36358, 0: 60111 + 195360 + 45084, 5: 90167 + 293040 + 67626 },
  Attacker: { base5: 39663 + 29748 + 128905, 0: 49181 + 159840 + 36887, 5: 73771 + 239760 + 55331 },
  Supporter: { base5: 44070 + 33053 + 143227, 0: 54646 + 177600 + 40985, 5: 81969 + 266400 + 61477 },
};

export function gearHp(cls: NikkeClass, ol: GearLevel): number {
  return GEAR_HP[cls][ol];
}

export const DOLL_HP = 301800;

export const DOLL_ATK = 9688;

// Doll special line by weapon (gear_doll.md). normalAttackPct scales the normal
// attack multiplier itself; the rest feed their formula buckets.
export interface DollBonus {
  coreDamagePct?: number;
  normalAttackPct?: number;
  chargeDamagePct?: number;
  maxAmmoPct?: number;
}

const DOLL_BONUS: Record<Weapon, DollBonus> = {
  AR: { coreDamagePct: 17.0 },
  SMG: { normalAttackPct: 9.46 },
  SG: { normalAttackPct: 9.46 },
  RL: { chargeDamagePct: 9.47 },
  SR: { maxAmmoPct: 9.5, chargeDamagePct: 9.47 },
  MG: { maxAmmoPct: 9.5 },
  Pistol: {}, // no recorded pistol doll data
};

export function dollBonus(weapon: Weapon): DollBonus {
  return DOLL_BONUS[weapon];
}

export type DollRarity = 'R' | 'SR' | 'SSR';

// Favorite Item ("doll") flat stat contribution by rarity + level.
// Owner-measured checkpoints (gear-doll.md, 2026-07-18): R and SR at levels
// 0 / 5 / 10 / 15. SSR's live levels are 0-2 and all read == SR 15, so SSR is
// modeled as constant SR-15 stats (== DOLL_HP / DOLL_ATK). Intermediate levels
// (1-4, 6-9, 11-14) are piecewise-linear interpolated between the measured
// checkpoints — ⚑ interpolation is a shape estimate; only 0/5/10/15 are measured.
type Stat = { atk: number; hp: number; def: number };
const DOLL_CHECKPOINTS: Record<DollRarity, Record<number, Stat>> = {
  R: {
    0: { hp: 19400, atk: 638, def: 128 },
    5: { hp: 48700, atk: 1577, def: 328 },
    10: { hp: 91350, atk: 2943, def: 620 },
    15: { hp: 147250, atk: 4736, def: 1002 },
  },
  SR: {
    0: { hp: 94000, atk: 3029, def: 638 },
    5: { hp: 149950, atk: 4821, def: 1020 },
    10: { hp: 219200, atk: 7041, def: 1494 },
    15: { hp: DOLL_HP, atk: DOLL_ATK, def: 2058 }, // == 301800 / 9688 / 2058
  },
  // SSR live levels 0-2 all == SR 15 (owner-stated); model every level as SR 15.
  SSR: { 0: { hp: DOLL_HP, atk: DOLL_ATK, def: 2058 }, 15: { hp: DOLL_HP, atk: DOLL_ATK, def: 2058 } },
};

// Piecewise-linear interpolate a measured-checkpoint map at an integer level 0-15.
function interpCheckpoints(cp: Record<number, Stat>, level: number): Stat {
  const lv = Math.max(0, Math.min(15, Math.round(level)));
  if (cp[lv]) return cp[lv];
  const keys = Object.keys(cp).map(Number).sort((a, b) => a - b);
  let lo = keys[0];
  let hi = keys[keys.length - 1];
  for (let i = 0; i < keys.length - 1; i++) {
    if (keys[i] <= lv && lv <= keys[i + 1]) { lo = keys[i]; hi = keys[i + 1]; break; }
  }
  if (lv <= lo) return cp[lo];
  if (lv >= hi) return cp[hi];
  const f = (lv - lo) / (hi - lo);
  const a = cp[lo];
  const b = cp[hi];
  return {
    atk: Math.round(a.atk + (b.atk - a.atk) * f),
    hp: Math.round(a.hp + (b.hp - a.hp) * f),
    def: Math.round(a.def + (b.def - a.def) * f),
  };
}

// Flat ATK/HP/DEF a doll of the given rarity+level contributes.
export function dollStats(rarity: DollRarity, level: number): Stat {
  return interpCheckpoints(DOLL_CHECKPOINTS[rarity], level);
}

// Weapon "collection effect" ranges, value at level 0 → level 15, per rarity
// (gear-doll.md, 2026-07-18). R/SR scale with level; ⚑ intermediate levels are
// linear-interpolated between the measured L0/L15 endpoints. SSR uses the fixed
// max-level DOLL_BONUS (its live levels 0-2 read ≈ SR 15), which also keeps the
// `doll: true` validation basis byte-identical.
// NOTE (owner follow-up): the SR-class DOLL_BONUS carries an extra maxAmmoPct 9.5
// line that the measured table does NOT list for the SR weapon — preserved here
// for SSR only; R/SR SR-weapon dolls get just the charge-damage "weapon modifier".
type BonusField = 'coreDamagePct' | 'normalAttackPct' | 'chargeDamagePct' | 'maxAmmoPct';
const DOLL_BONUS_RANGE: Partial<Record<Weapon, { field: BonusField; R: [number, number]; SR: [number, number] }>> = {
  AR: { field: 'coreDamagePct', R: [5.67, 12.49], SR: [10.22, 17.04] },
  SMG: { field: 'normalAttackPct', R: [1.57, 6.3], SR: [4.74, 9.47] },
  SG: { field: 'normalAttackPct', R: [1.57, 6.3], SR: [4.74, 9.47] },
  RL: { field: 'chargeDamagePct', R: [1.58, 6.31], SR: [4.73, 9.46] },
  SR: { field: 'chargeDamagePct', R: [1.58, 6.31], SR: [4.73, 9.46] },
  MG: { field: 'maxAmmoPct', R: [1.56, 6.32], SR: [4.74, 9.5] },
};

// The doll's weapon "collection effect" (core/normal/charge/ammo multipliers).
// SSR = the fixed max bonus; R/SR scale their single "weapon modifier" by level.
export function dollWeaponBonus(rarity: DollRarity, weapon: Weapon, level = 15): DollBonus {
  if (rarity === 'SSR') return DOLL_BONUS[weapon];
  const rng = DOLL_BONUS_RANGE[weapon];
  if (!rng) return {};
  const [lo, hi] = rng[rarity];
  const lv = Math.max(0, Math.min(15, Math.round(level)));
  const val = Math.round((lo + (hi - lo) * (lv / 15)) * 100) / 100;
  return { [rng.field]: val };
}
