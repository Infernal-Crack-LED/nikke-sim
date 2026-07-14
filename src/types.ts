export type Weapon = 'AR' | 'SG' | 'RL' | 'SR' | 'MG' | 'SMG' | 'Pistol';
export type BurstType = 'I' | 'II' | 'III' | 'Λ';
export type Element = 'Fire' | 'Water' | 'Wind' | 'Electric' | 'Iron';
export type NikkeClass = 'Attacker' | 'Supporter' | 'Defender';

export interface BaseStats {
  resourceId: number;
  atk: number;
  hp: number;
  def: number;
  critRate: number;    // percent, e.g. 15
  critDamage: number;  // percent multiplier, e.g. 150
  maxLevel: number;
  grade: { ratio: number; atk: number; hp: number; def: number };
  core: { atk: number; hp: number; def: number };
}

export interface CharacterData {
  slug: string;
  name: string;
  imageUrl: string | null;
  weapon: Weapon;
  burst: BurstType;
  burstCooldownSec: number;
  class: NikkeClass;
  element: Element;
  normalAttackMultiplier: number; // % of ATK per trigger pull (all pellets/hits included)
  coreAttackMultiplier: number;   // % — 200 = core hits deal 2x
  ammo: number;
  reloadFrames: number;           // wall-clock reload, 60fps frames
  chargeFrames: number;           // RL/SR frames to full charge (0 otherwise)
  chargeMultiplier: number;       // % — total charge factor, e.g. 250
  hitsPerShot: number;            // hits per trigger pull (for hit-count skill triggers)
  rl3: number | null;             // burst gen: % of gauge generated per 3 seconds
  burstGaugePerShot: number | null;
  treasure: boolean;              // has a Treasure (favorite item); DB prydwen_slug ends -treasure
  skills: { skill1: string; skill2: string; burst: string };
}

export interface LevelMultiplier {
  attack: number[];
  hp: number[];
  def: number[];
}

export interface DataFile {
  syncedAt: string;
  characters: Record<string, CharacterData & { baseStats: BaseStats | null }>;
}

// ---- sim configuration ----

export interface SimConfig {
  slugs: string[];          // 5 slugs, slot order 1..5
  bossElement: Element | null;
  bossDef: number;          // flat enemy DEF subtracted from effective ATK
  level: number;
  copies: number;           // 0-10 → grade = min(3, c), core = clamp(c-3, 0, 7)
  doll: boolean;
  ol: 0 | 5;
  coreHitRate: number;      // 0..1, default 0
  rangeBonus: boolean;      // +0.3 major modifier
  durationSec: number;      // 180
  // --- experimental / A-B knobs (undefined = current default behaviour) ---
  projExplOnRlNormals?: boolean; // U4: RL normals get projExpl in Damage Up (default ON per user, 2026-07-13)
  // camera-focused unit (charge weapons on the focused unit generate x2.5 gauge).
  // Default: formation slot 3 = index min(2, n-1) — user convention 2026-07-13: the
  // MIDDLE character always holds camera focus unless a run says otherwise. Set for
  // recorded runs where a different unit held focus.
  focusSlug?: string;
  // Monte Carlo mode: when set, crit and core-hit rolls are sampled per instance
  // (full bonus or nothing) instead of expectation-folded, the boss's range-band
  // transition times jitter by up to ±2s, and burst-chain cast gaps jitter — matching
  // the two dominant real-run variance sources (user, 2026-07-13). Same seed = same
  // fight. undefined = deterministic expected-value sim (web UI default).
  seed?: number;
}
