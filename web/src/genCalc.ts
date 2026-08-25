// Shared roster-generator calc factory (perf plan item 1a). Builds a teamcalc
// `makeCalc` instance from FULLY SERIALIZABLE params, reconstructing the pieces
// that can't cross a web-worker boundary (meta scoring, prydwen score, synergy)
// from the same static JSON both the main thread and the worker import. The main
// thread materializes the two dynamic inputs — `cfg` and a per-slug `loadouts`
// map — and passes them through; everything else is rebuilt here identically on
// either side, so a worker-run search is byte-identical to a main-thread one
// (parity gate: scripts/tests/generators/loadouts-parity.test.ts).
import {
  makeCalc,
  type MetaScoring,
  type TeamResult,
} from '../../src/teamcalc';
import type { UnitOptions } from '../../src/prepare';
import type {
  DataFile,
  Element,
  LevelMultiplier,
  SimConfig,
} from '../../src/types';
import type { OverrideFile } from '../../src/skills/index';
import { META_WEIGHTS } from './metaWeights';
import charactersJson from '../../data/characters.json';
import bossingTiersJson from '../../data/bossing-tiers.json';
import cubesJson from '../../data/cubes.json';
import multJson from '../../data/level-multiplier.json';
import skillLevelsJson from '../../data/skill-levels.json';
import olLinesJson from '../../data/ol-lines.json';
import archetypeTagsJson from '../../data/archetype-tags.json';

const data = charactersJson as unknown as DataFile;
export const mult = multJson as unknown as LevelMultiplier;
export const archetypeTags = (
  archetypeTagsJson as { tags: Record<string, string[]> }
).tags;

// hand-verified skill overrides (same glob the app uses; works in a worker too)
const overrideModules = import.meta.glob('../../src/skills/overrides/*.json', {
  eager: true,
});
const overrides: Record<string, OverrideFile | undefined> = {};
for (const [path, mod] of Object.entries(overrideModules)) {
  const slug = path.split('/').pop()!.replace('.json', '');
  overrides[slug] = (mod as any).default ?? (mod as any);
}

// deps blob for prepareTeam (overrides + level tables) — static, so identical on
// both threads.
export const GEN_DEPS = {
  overrides,
  skillLevels: skillLevelsJson as any,
  cubes: cubesJson as any,
  olLines: olLinesJson as any,
};

// Team/Roster generator candidate pool = generatorSupported (+ simSupported) only.
export const generatorCharacters: Record<
  string,
  (typeof data.characters)[string]
> = Object.fromEntries(
  Object.values(data.characters)
    .filter((c) => c.generatorSupported && c.simSupported)
    .map((c) => [c.slug, c])
);

// Meta-popularity scoring for one boss weakness (enikk + prydwen fallback).
export function metaScoringFor(
  weakness: Element | null
): MetaScoring | undefined {
  if (!weakness) {
    return undefined;
  }
  const entry = META_WEIGHTS.byWeakness[weakness];
  if (!entry) {
    return undefined;
  }
  const fallback = new Set(META_WEIGHTS.fallbackSlugs);
  const compPop: Record<string, number> = {};
  for (const c of entry.comps) {
    compPop[[...c.slugs].sort().join('|')] = c.pop;
  }
  return {
    unitScore: (slug: string) =>
      fallback.has(slug)
        ? (META_WEIGHTS.tierPop[slug] ?? 0)
        : (entry.unitPop[slug] ?? 0),
    compPop,
    seedComps: entry.comps.map((c) => c.slugs),
    weight: META_WEIGHTS.weightDefault,
    comboWeight: META_WEIGHTS.comboWeight,
  };
}

// Prydwen bossing-tier meta score (element-agnostic; seeds the solo spread).
const PRYDWEN_TIER_SCORE: Record<string, number> = {
  SSS: 5,
  SS: 4,
  S: 3,
  A: 2,
  B: 1,
  C: 0,
  D: 0,
  E: 0,
  F: 0,
};
const PRYDWEN_TIERS = (bossingTiersJson as { tiers: Record<string, string> })
  .tiers;
export const prydwenScoreOf = (slug: string): number =>
  PRYDWEN_TIER_SCORE[PRYDWEN_TIERS[slug] ?? ''] ?? 0;

// Like-tag synergy bias (pierce↔pierce ▲, projectile↔projectile ▲).
export const SYNERGY_PAIRS: [string, string][] = [
  ['pierce', 'pierce-buffer'],
  ['projectile', 'projectile-buffer'],
];
export const SYNERGY_WEIGHT = 0.08;

// Hard roster rules (owner ruling 2026-07-24). The curated always-include sets
// (SOLO/UNION_ALWAYS_COMBOS) are RETIRED — the item-3 marginal-value search
// fields the meta supports on its own (A/B artifact:
// docs/handoffs/2026-07-24-always-combos-ab.md). What remains are CONDITIONS on
// being fielded, not reasons to field anyone:
//   - mint + prika must share a team (their kit pairing is under-modeled today;
//     the sim can't see the split cost, so the rule carries it. Relaxes only if
//     one of them is unavailable to the search).
//   - naga requires a shield-granting teammate (owner ruling: her kit depends
//     on a shielder being present) — anyOf = every `shield`-tagged unit except
//     naga herself (she cannot satisfy her own dependency).
// Healer candidates for the "Include Healer" generator toggle — the list (and
// the condition-dormant exclusions with their WHY) lives in ./healerSlugs.ts,
// a vite-free module the generator test suites can also import; re-exported
// here for the app (App.tsx pulls it from genCalc).
import { HEALER_SLUGS } from './healerSlugs';
export { HEALER_SLUGS };

export const TEAM_CONSTRAINTS = {
  together: [['mint', 'prika']],
  companions: [
    {
      unit: 'naga',
      anyOf: Object.entries(archetypeTags)
        .filter(([slug, tags]) => slug !== 'naga' && tags.includes('shield'))
        .map(([slug]) => slug),
    },
  ],
};

/** Fully serializable generator-calc request — safe to postMessage to a worker. */
export interface GenCalcParams {
  weakness: Element | null;
  blocked: string[];
  cfg: Omit<SimConfig, 'slugs'>;
  /** materialized per-slug loadout map (resolved on the main thread) */
  loadouts: Record<string, UnitOptions>;
  /** uniform fallback for slugs missing from `loadouts` (rare) */
  loadout?: UnitOptions;
  poolB3?: number;
  rounds?: number;
  /** Require at least one healer in the generated team. */
  healerNeeded?: boolean;
}

/** Rebuild the generator's makeCalc instance from serializable params. Identical
 *  output on the main thread and inside a worker (both reconstruct meta/prydwen/
 *  synergy from the same static JSON). An optional `evaluator` (the worker pool's
 *  simMany, perf plan 1b) fans full-team sims across cores; omit it for a leaf
 *  pool worker or the in-process fallback, where sims run locally. Kept OUT of the
 *  serializable GenCalcParams — a function can't cross the worker boundary. */
export function buildGenCalc(
  params: GenCalcParams,
  evaluator?: (teams: string[][]) => Promise<(TeamResult | null)[]>,
  cache: 'shared' | 'none' = 'none'
) {
  return makeCalc({
    cache,
    chars: generatorCharacters as any,
    mult,
    deps: GEN_DEPS,
    cfg: params.cfg,
    loadout: params.loadout,
    loadouts: params.loadouts,
    blocked: params.blocked,
    poolB3: params.poolB3,
    rounds: params.rounds,
    meta: metaScoringFor(params.weakness),
    requireElement: params.weakness,
    prydwenScore: prydwenScoreOf,
    synergy: {
      tags: archetypeTags,
      pairs: SYNERGY_PAIRS,
      weight: SYNERGY_WEIGHT,
    },
    constraints: params.healerNeeded
      ? {
          ...TEAM_CONSTRAINTS,
          requiredAny: [{ label: 'healer', anyOf: HEALER_SLUGS }],
        }
      : TEAM_CONSTRAINTS,
    evaluator,
  });
}

export type { TeamResult };
