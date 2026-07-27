// Synthetic standard units for the ranking boards (src/ranks/) — siblings of the
// Solo framework's no-op controls (src/dpschart/noop.ts): wholesale-authored
// CharacterData records that live OUTSIDE characters.json (no data sync should
// ever touch them). Pure module — no fs — runs in node (precompute) and the
// browser alike.
//
//   noop-mg          zero-damage MG ammo-burn partner. The burst-gen board's two
//                    team-ammo-scaling profiles feed off its 300-round belt:
//                    little-mermaid (+2 MG) and cinderella-crystal-wave (+1 MG)
//                    proc their fillGauge teamAmmo triggers far faster with MG
//                    partners burning ammo beside them.
//   carry-mg/carry-rl  DAMAGE-DEALING standard B3 carries for the buffer board:
//                    class-modal weapon stats, Attacker class base stats (the
//                    class-static scope-lock ATK line — same-class units share
//                    identical ATK, data/reference-stats.json), empty skills (no
//                    burst damage, no buffs: pure weapon fire + Full Burst
//                    windows). A buffer's value = the damage these two gain with
//                    the tested buffer vs a no-op baseline in the same slot.
//   carryWithWeapon()  clones a carry onto another class's modal stats (the typed
//                    buffer board: both carries become SG for tove, etc.). Each
//                    variant slug needs a matching row in data/gauge-per-shot.json.
//
// Weapon stats = the weapon-class MODAL values from data/characters.json
// (2026-07-26 census): MG 300 ammo / 171f reload / mult 5.57; RL 6 ammo / 141f
// reload / 60f charge ×250% / mult 61.3; SG 9 ammo / 111f / ×10 pellets / mult
// 201.5; AR 60 ammo / 81f / mult 13.65; SR 6 ammo / 141f / 60f ×250% / mult
// 69.04; SMG 120 ammo / 81f / mult 10.12. Gauge rows: class-modal entries in
// data/gauge-per-shot.json (the noop-* rows are the template).
import type { BaseStats, BurstType, CharacterData, Weapon } from '../types.js';

export type SyntheticCharacter = CharacterData & { baseStats: BaseStats };

interface WeaponModal {
  normalAttackMultiplier: number;
  ammo: number;
  reloadFrames: number;
  chargeFrames: number;
  chargeMultiplier: number;
  hitsPerShot: number;
  rl3: number;
}

export const MODAL_WEAPON: Record<Weapon, WeaponModal> = {
  MG: {
    normalAttackMultiplier: 5.57,
    ammo: 300,
    reloadFrames: 171,
    chargeFrames: 0,
    chargeMultiplier: 0,
    hitsPerShot: 1,
    rl3: 3.55,
  },
  RL: {
    normalAttackMultiplier: 61.3,
    ammo: 6,
    reloadFrames: 141,
    chargeFrames: 60,
    chargeMultiplier: 250,
    hitsPerShot: 1,
    rl3: 16.8,
  },
  SG: {
    normalAttackMultiplier: 201.5,
    ammo: 9,
    reloadFrames: 111,
    chargeFrames: 0,
    chargeMultiplier: 0,
    hitsPerShot: 10,
    rl3: 12,
  },
  AR: {
    normalAttackMultiplier: 13.65,
    ammo: 60,
    reloadFrames: 81,
    chargeFrames: 0,
    chargeMultiplier: 0,
    hitsPerShot: 1,
    rl3: 7.6,
  },
  SR: {
    normalAttackMultiplier: 69.04,
    ammo: 6,
    reloadFrames: 141,
    chargeFrames: 60,
    chargeMultiplier: 250,
    hitsPerShot: 1,
    rl3: 8.4,
  },
  SMG: {
    normalAttackMultiplier: 10.12,
    ammo: 120,
    reloadFrames: 81,
    chargeFrames: 0,
    chargeMultiplier: 0,
    hitsPerShot: 1,
    rl3: 5.7,
  },
  Pistol: {
    normalAttackMultiplier: 0,
    ammo: 0,
    reloadFrames: 0,
    chargeFrames: 0,
    chargeMultiplier: 0,
    hitsPerShot: 1,
    rl3: 0,
  }, // unused — no synthetic pistols
};

// Attacker-class base stats (identical across real Attackers — atk 600 / hp 13500,
// standard grade/core growth). At level 400, 3★/core 7 with Base-5 gear this lands
// on the class-static scope-lock ATK (118,027 — data/reference-stats.json).
const ATTACKER_BASE_STATS: BaseStats = {
  resourceId: 0,
  atk: 600,
  hp: 13500,
  def: 75,
  critRate: 15,
  critDamage: 150,
  maxLevel: 400,
  grade: { ratio: 200, atk: 20, hp: 3000, def: 100 },
  core: { atk: 200, hp: 200, def: 200 },
};

// Supporter placeholder for the zero-damage partner (gear ATK/HP inert at 0 damage).
const SUPPORTER_BASE_STATS: BaseStats = { ...ATTACKER_BASE_STATS };

function synthetic(
  slug: string,
  name: string,
  burst: BurstType,
  burstCooldownSec: number,
  weapon: Weapon,
  cls: 'Attacker' | 'Supporter',
  baseStats: BaseStats,
  damageDealing: boolean
): SyntheticCharacter {
  const w = MODAL_WEAPON[weapon];
  return {
    slug,
    name,
    imageUrl: null,
    weapon,
    burst,
    burstCooldownSec,
    class: cls,
    element: 'Iron', // fixed so the buffer board can advantage both carries (boss Electric)
    manufacturer: null, // no relationship bonus on a synthetic
    normalAttackMultiplier: damageDealing ? w.normalAttackMultiplier : 0,
    coreAttackMultiplier: 200,
    ammo: w.ammo,
    reloadFrames: w.reloadFrames,
    chargeFrames: w.chargeFrames,
    chargeMultiplier: w.chargeMultiplier,
    hitsPerShot: w.hitsPerShot,
    rl3: w.rl3,
    burstGaugePerShot: null,
    treasure: false,
    // Synthetic scaffolding, not a real roster entry — never surfaced by a
    // support-tag-filtered picker, but tagged true so nothing incidentally excludes it.
    generatorSupported: true,
    simSupported: true,
    skills: { skill1: '', skill2: '', burst: '' }, // parser → zero blocks
    baseStats,
  };
}

export const NOOP_MG = 'noop-mg';
export const CARRY_MG = 'carry-mg';
export const CARRY_RL = 'carry-rl';

// The MG ammo-burn partner (zero damage, B3/40s so it never displaces a real stage
// pick — on the burst-gen board bursts are disabled anyway; only its belt matters).
export const NOOP_MG_CHAR = synthetic(
  NOOP_MG,
  'No-op MG partner',
  'III',
  40,
  'MG',
  'Supporter',
  SUPPORTER_BASE_STATS,
  false
);

// The buffer board's two standard carries (damage-dealing B3/40s).
export const CARRY_MG_CHAR = synthetic(
  CARRY_MG,
  'Standard Carry (MG)',
  'III',
  40,
  'MG',
  'Attacker',
  ATTACKER_BASE_STATS,
  true
);
export const CARRY_RL_CHAR = synthetic(
  CARRY_RL,
  'Standard Carry (RL)',
  'III',
  40,
  'RL',
  'Attacker',
  ATTACKER_BASE_STATS,
  true
);

// Clone a standard carry onto another weapon class's modal stats (typed buffer
// board). The variant slug is `carry-<weapon lowercase>`; every variant needs a
// class-modal row in data/gauge-per-shot.json.
export function carryWithWeapon(weapon: Weapon): SyntheticCharacter {
  const slug = `carry-${weapon.toLowerCase()}`;
  return synthetic(
    slug,
    `Standard Carry (${weapon})`,
    'III',
    40,
    weapon,
    'Attacker',
    ATTACKER_BASE_STATS,
    true
  );
}

// Lookup for every synthetic this module can mint (fixed trio + carry weapon variants).
export function syntheticFor(slug: string): SyntheticCharacter | undefined {
  if (slug === NOOP_MG) {return NOOP_MG_CHAR;}
  if (slug === CARRY_MG) {return CARRY_MG_CHAR;}
  if (slug === CARRY_RL) {return CARRY_RL_CHAR;}
  const m = /^carry-(mg|rl|sg|ar|sr|smg)$/.exec(slug);
  if (m) {return carryWithWeapon(m[1].toUpperCase() as Weapon);}
  return undefined;
}
