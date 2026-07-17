// Overload-Calc core: for one carry sitting in a fixed 8/12 team, rank every way
// its four FREE overload lines can be spent. The 8/12 floor (4× Elemental DMG +
// 4× ATK) is held constant; only the remaining four lines vary, drawn from a
// weapon-aware candidate pool (mirrors src/olcalc.ts). Each candidate loadout is
// simulated in-team and scored by the carry's own damage, reported as the % gain
// over the plain 8/12 baseline (the four free lines empty).
//
// Pure engine (runSim + prepareTeam only) so the web tab and any node script share it.
import { runSim } from './engine/sim.js';
import { prepareTeam, type PrepareDeps, type UnitOptions, type LineSelection } from './prepare.js';
import type { CharacterData, LevelMultiplier, SimConfig, Weapon } from './types.js';

// the 8/12 floor: 4× Elemental DMG + 4× ATK, present on every loadout tested
export const OL_FLOOR: LineSelection[] = [
  { type: 'elem', count: 4 },
  { type: 'atk', count: 4 },
];

const CAND_LABEL: Record<string, string> = {
  ammo: 'Max Ammo',
  critrate: 'Crit Rate',
  critdmg: 'Crit DMG',
  chargespd: 'Charge Speed',
  chargedmg: 'Charge DMG',
};

// weapon-aware pool for the free four (elem/atk are the fixed floor; hit/def are
// dead for damage; charge lines only matter on RL/SR).
export function freeLineCandidates(weapon: Weapon): string[] {
  const charge = weapon === 'RL' || weapon === 'SR';
  return ['ammo', 'critrate', 'critdmg', ...(charge ? ['chargespd', 'chargedmg'] : [])];
}

// every size-k multiset over `pool` (order-independent, repeats allowed)
function multisets(pool: string[], k: number): string[][] {
  const out: string[][] = [];
  const rec = (start: number, cur: string[]) => {
    if (cur.length === k) {
      out.push([...cur]);
      return;
    }
    for (let i = start; i < pool.length; i++) rec(i, [...cur, pool[i]]);
  };
  rec(0, []);
  return out;
}

function counts(combo: string[]): Record<string, number> {
  const c: Record<string, number> = {};
  for (const k of combo) c[k] = (c[k] ?? 0) + 1;
  return c;
}
function comboToLines(combo: string[]): LineSelection[] {
  return Object.entries(counts(combo)).map(([type, count]) => ({ type, count }));
}
function comboLabel(combo: string[]): string {
  return Object.entries(counts(combo))
    .sort((a, b) => b[1] - a[1])
    .map(([k, c]) => `${c}× ${CAND_LABEL[k] ?? k}`)
    .join(' + ');
}

export interface OlConfigResult {
  label: string; // e.g. "2× Crit DMG + 2× Crit Rate"
  lines: LineSelection[]; // the free four only
  damage: number; // carry's total damage with floor + these four
  gainPct: number; // vs the 8/12 baseline (free four empty)
}

// Rank the free-line loadouts for `carryIdx`. `baseOpts` are the team's 8/12
// loadouts (carry included); the carry's `.lines` is replaced per candidate, all
// other units are held fixed. Returns the baseline (floor-only) damage plus the
// top `topN` loadouts by carry damage.
export function rankFreeLineConfigs(args: {
  chars: (CharacterData & { baseStats: any })[];
  mult: LevelMultiplier;
  cfg: SimConfig;
  deps: PrepareDeps;
  baseOpts: UnitOptions[];
  carryIdx: number;
  topN?: number;
  // per-line stat value the OL lines are measured at, keyed by line type (matches
  // data/ol-tiers.json — e.g. { atk: 11.81, elem: 23.56, ... } for T11). When
  // omitted every line defaults to its max roll (T15) via prepareUnit.
  tierValues?: Record<string, number>;
}): { baselineDamage: number; results: OlConfigResult[] } {
  const { chars, mult, cfg, deps, baseOpts, carryIdx, topN = 10, tierValues } = args;
  const pool = freeLineCandidates(chars[carryIdx].weapon);

  // stamp each line with the chosen tier's per-line value (no-op when tierValues
  // is undefined, leaving prepareUnit to use the line's max roll).
  const atTier = (lines: LineSelection[]): LineSelection[] =>
    tierValues ? lines.map((l) => ({ ...l, value: tierValues[l.type] })) : lines;

  const carryDamage = (carryLines: LineSelection[]): number => {
    const opts = baseOpts.map((o, i) => (i === carryIdx ? { ...o, lines: atTier(carryLines) } : o));
    const prepared = prepareTeam(chars, opts, deps);
    return runSim(chars, mult, cfg, prepared).units[carryIdx].totalDamage;
  };

  const baselineDamage = carryDamage([...OL_FLOOR]);
  const results: OlConfigResult[] = multisets(pool, 4).map((combo) => {
    const free = comboToLines(combo);
    const damage = carryDamage([...OL_FLOOR, ...free]);
    return {
      label: comboLabel(combo),
      lines: free,
      damage,
      gainPct: baselineDamage ? ((damage - baselineDamage) / baselineDamage) * 100 : 0,
    };
  });
  results.sort((a, b) => b.damage - a.damage);
  return { baselineDamage, results: results.slice(0, topN) };
}
