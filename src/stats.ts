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
