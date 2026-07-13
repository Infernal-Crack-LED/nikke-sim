// Damage-ranked best-OL for one unit (Q3 of the OL handoff). Assumes 8/12 lines
// are 4×ATK + 4×ELE and greedily optimises the remaining 4 among a weapon-aware
// candidate pool, all at a chosen OL tier. Only READS the engine (runSim).
//
// Note: charge-speed is a threshold stat in-game (value between breakpoints is
// wasted) but the engine treats it continuously, so the optimiser ranks by raw
// sim damage; the frontend reports the charge-speed / max-ammo breakpoints
// alongside (see the OL calculator panel).
import { runSim } from './engine/sim.js';
import type { CharacterData, LevelMultiplier, SimConfig } from './types.js';
import type { PreparedUnit } from './prepare.js';

export interface OlTier {
  tier: number;
  elem: number;
  atk: number;
  ammo: number;
  chargedmg: number;
  chargespd: number;
  critrate: number;
  critdmg: number;
  hitrate: number;
  def: number;
  [k: string]: number;
}

const STAT_BY_KEY: Record<string, string> = {
  elem: 'elementDamagePct',
  atk: 'atkPct',
  ammo: 'maxAmmoPct',
  chargedmg: 'chargeDamagePct',
  chargespd: 'chargeSpeedPct',
  critrate: 'critRatePct',
  critdmg: 'critDamagePct',
};
const LABEL: Record<string, string> = {
  elem: 'Elemental DMG',
  atk: 'ATK',
  ammo: 'Max Ammo',
  chargedmg: 'Charge DMG',
  chargespd: 'Charge Speed',
  critrate: 'Crit Rate',
  critdmg: 'Crit DMG',
};

export interface OlLine {
  key: string;
  label: string;
  count: number;
  value: number; // total % for this stat (per-line value × count)
}
export interface BestOlAtTierResult {
  tier: number;
  fixed: OlLine[]; // 4× ATK + 4× ELE
  free: OlLine[]; // the optimised 4 (grouped by stat)
  baselineDamage: number; // unit total with just the 8 fixed lines
  finalDamage: number; // unit total with 8 fixed + best 4 free
  gainPct: number; // free-4 gain over the fixed-8 baseline
}

export function bestOlAtTier(
  chars: (CharacterData & { baseStats: any })[],
  mult: LevelMultiplier,
  cfg: SimConfig,
  prepared: PreparedUnit[],
  unitIdx: number,
  tiers: OlTier[],
  tier: number,
): BestOlAtTierResult {
  const tv = tiers.find((t) => t.tier === tier) ?? tiers[tiers.length - 1];
  const weapon = chars[unitIdx].weapon;
  const isCharge = weapon === 'RL' || weapon === 'SR';

  // the 8 assumed lines
  const fixedExtra = [
    { stat: STAT_BY_KEY.atk, value: 4 * tv.atk },
    { stat: STAT_BY_KEY.elem, value: 4 * tv.elem },
  ];
  const fixed: OlLine[] = [
    { key: 'atk', label: LABEL.atk, count: 4, value: 4 * tv.atk },
    { key: 'elem', label: LABEL.elem, count: 4, value: 4 * tv.elem },
  ];

  // weapon-aware candidates for the free 4 (exclude hit/def; charge only RL/SR)
  const candidates = [
    'ammo',
    'critrate',
    'critdmg',
    ...(isCharge ? ['chargespd', 'chargedmg'] : []),
  ];

  const simUnit = (extra: { stat: string; value: number }[]): number => {
    const p = prepared.map((u, i) =>
      i === unitIdx ? { ...u, extraStats: [...u.extraStats, ...extra] } : u,
    );
    return runSim(chars, mult, cfg, p).units[unitIdx].totalDamage;
  };

  const baselineDamage = simUnit(fixedExtra);

  // greedy: add one free line at a time (a stat may repeat), keep the best pick
  const freeCounts: Record<string, number> = {};
  const freeExtra: { stat: string; value: number }[] = [];
  let prev = baselineDamage;
  for (let n = 0; n < 4; n++) {
    let best: { key: string; dmg: number } | null = null;
    for (const key of candidates) {
      const dmg = simUnit([
        ...fixedExtra,
        ...freeExtra,
        { stat: STAT_BY_KEY[key], value: tv[key] },
      ]);
      if (!best || dmg > best.dmg) best = { key, dmg };
    }
    if (!best) break;
    freeCounts[best.key] = (freeCounts[best.key] ?? 0) + 1;
    freeExtra.push({ stat: STAT_BY_KEY[best.key], value: tv[best.key] });
    prev = best.dmg;
  }

  const free: OlLine[] = Object.entries(freeCounts).map(([key, count]) => ({
    key,
    label: LABEL[key],
    count,
    value: +(tv[key] * count).toFixed(2),
  }));

  return {
    tier,
    fixed,
    free,
    baselineDamage,
    finalDamage: prev,
    gainPct: baselineDamage ? ((prev - baselineDamage) / baselineDamage) * 100 : 0,
  };
}
