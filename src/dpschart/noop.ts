// Synthetic no-op control units for the Solo framework: an unnamed B1 (AR), B2 (SR)
// and B3 (MG). B1/B2 deal ZERO damage (normalAttackMultiplier 0) and carry NO skills
// (empty kit text → the parser yields zero blocks: no buffs, no procs, no burst
// damage). The B3 keeps empty skill slots but is given a class-modal base multiplier
// plus a mock +50% ATK / +100% Attack Damage self buff on its own burst cast via the
// `noop-b3-mg` override, so it contributes realistic B3-stage damage only during its turn
// being a synthetic control. All three still fire on their weapon class's canon
// cadence so they generate burst gauge exactly like a default unit of that weapon
// (data/gauge-per-shot.json carries matching class-modal noop-* entries) and take
// their burst-chain stages. The B1 control additionally gets a 7 s team burst-cooldown
// reduction via the `noop-b1-ar` override, so the no-op team is normalized for the CDR
// a real B1 enabler would contribute even though the placeholder has no other skills.
// Weapon data = the weapon-class MODAL values from data/characters.json (2026-07-26:
// MG 300 ammo / 171f reload; AR 60 ammo / 81f reload; SR + RL 6 ammo / 141f reload /
// 60f charge ×250%; burst cooldown 20s B1/B2, 40s B3).
// Pure module — no fs — runs in node (precompute) and the browser alike.
import type { BaseStats, BurstType, CharacterData, Weapon } from '../types.js';

export type NoopCharacter = CharacterData & { baseStats: BaseStats };

// Stats are inert for B1/B2: the units deal 0 damage (multiplier 0) and cast nothing,
// so ATK/HP only need to be valid numbers for the stat formula. No grade/core growth.
// The B3 is given a class-modal base multiplier plus a mock burst buff via its override.
const NOOP_BASE_STATS: BaseStats = {
  resourceId: 0,
  atk: 30000,
  hp: 1000000,
  def: 0,
  critRate: 15,
  critDamage: 150,
  maxLevel: 400,
  grade: { ratio: 0, atk: 0, hp: 0, def: 0 },
  core: { atk: 0, hp: 0, def: 0 },
};

interface WeaponModal {
  ammo: number;
  reloadFrames: number;
  chargeFrames: number;
  chargeMultiplier: number;
  rl3: number;
}

function noop(
  slug: string,
  name: string,
  burst: BurstType,
  burstCooldownSec: number,
  weapon: Weapon,
  w: WeaponModal,
  normalAttackMultiplier: number
): NoopCharacter {
  return {
    slug,
    name,
    imageUrl: null,
    weapon,
    burst,
    burstCooldownSec,
    class: 'Supporter', // only feeds gear ATK/HP — inert at 0 damage
    element: 'Fire', // never elementally relevant at 0 damage
    manufacturer: null, // no relationship bonus on a synthetic control unit
    normalAttackMultiplier, // 0 for pure controls; B3 gets a class-modal base for the mock burst
    coreAttackMultiplier: 200,
    ammo: w.ammo,
    reloadFrames: w.reloadFrames,
    chargeFrames: w.chargeFrames,
    chargeMultiplier: w.chargeMultiplier,
    hitsPerShot: 1,
    rl3: w.rl3,
    burstGaugePerShot: null,
    treasure: false,
    // Synthetic scaffolding, not a real roster entry — never surfaced by a support-tag
    // filtered picker, but tagged true so nothing incidentally excludes it.
    generatorSupported: true,
    simSupported: true,
    skills: { skill1: '', skill2: '', burst: '' }, // parser → zero blocks
    baseStats: NOOP_BASE_STATS,
  };
}

export const NOOP_B1 = 'noop-b1-ar';
export const NOOP_B2 = 'noop-b2-sr';
export const NOOP_B3 = 'noop-b3-mg';
export const NOOP_B3_RL = 'noop-b3-rl';
// Synthetic stand-in for Rouge (B1/SR) — the buffer-rank `w/ Rouge` duo profile's
// presence-only partner. Its slug carries curated squad membership in
// src/data/squads.ts ('Blanc Noir Rouge'), so its presence satisfies blanc's
// same-squad CDR gate (teamHas.sameSquad). Cadence mirrors the real rouge.
export const NOOP_ROUGE_B1 = 'noop-rouge-b1';

// Class-modal MG normal-attack multiplier for the synthetic B3 mock.
const MG_NORMAL_ATTACK_MULT = 5.57;

export const NOOP_CHARACTERS: Record<string, NoopCharacter> = {
  [NOOP_B1]: noop(
    NOOP_B1,
    'No-op B1 (AR)',
    'I',
    20,
    'AR',
    {
      ammo: 60,
      reloadFrames: 81,
      chargeFrames: 0,
      chargeMultiplier: 0,
      rl3: 7.6,
    },
    0
  ),
  [NOOP_B2]: noop(
    NOOP_B2,
    'No-op B2 (SR)',
    'II',
    20,
    'SR',
    {
      ammo: 6,
      reloadFrames: 141,
      chargeFrames: 60,
      chargeMultiplier: 250,
      rl3: 8.4,
    },
    0
  ),
  [NOOP_B3]: noop(
    NOOP_B3,
    'No-op B3 (MG)',
    'III',
    40,
    'MG',
    {
      ammo: 300,
      reloadFrames: 171,
      chargeFrames: 0,
      chargeMultiplier: 0,
      rl3: 3.55,
    },
    MG_NORMAL_ATTACK_MULT
  ),
  [NOOP_B3_RL]: noop(
    NOOP_B3_RL,
    'No-op B3 (RL)',
    'III',
    40,
    'RL',
    {
      ammo: 6,
      reloadFrames: 141,
      chargeFrames: 60,
      chargeMultiplier: 250,
      rl3: 16.8,
    },
    0
  ),
  [NOOP_ROUGE_B1]: noop(
    NOOP_ROUGE_B1,
    'No-op Rouge B1 (SR)',
    'I',
    20,
    'SR',
    {
      ammo: 6,
      reloadFrames: 161,
      chargeFrames: 60,
      chargeMultiplier: 250,
      rl3: 8.7,
    },
    0
  ),
};
