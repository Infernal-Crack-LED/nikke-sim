// Main-thread client for the roster generator (perf plan item 1b). The search
// (seed/refine/argmax) runs HERE, on the main thread, but delegates every full-team
// sim batch to the worker pool (web/src/simPool.ts) via makeCalc's `evaluator` —
// so the heavy work is parallel across cores while the coordinator only does light
// bookkeeping between awaited batches (the UI thread stays responsive). When the
// pool is unavailable (SSR prerender, JSDOM smoke) the same buildGenCalc runs
// in-process with no evaluator — identical results, just single-threaded.
//
// Output is byte-identical to a single-thread run (the pool only executes sims;
// scoring/selection is coordinator-side) — parity gate:
// scripts/tests/generators/loadouts-parity.test.ts.
import {
  buildGenCalc,
  type GenCalcParams,
  type TeamResult,
} from './genCalc';
import { simPool } from './simPool';

export interface BestTeamOpts {
  exclude?: Set<string> | string[];
  mustInclude?: string[];
}
export interface TopTeamsOpts {
  pinnedByTeam?: string[][];
  mustUse?: string[];
  spreadTargets?: number[];
}
/** Cumulative-sims-done callback (denominator is unknown up front — the search
 *  size depends on the pool contents), for a lightweight "Calculating… (N)" UI. */
export type ProgressFn = (simsDone: number) => void;

const asSet = (e?: Set<string> | string[]): Set<string> | undefined =>
  e === undefined ? undefined : e instanceof Set ? e : new Set(e);

// Build a coordinator calc whose sims fan out to the pool (when available), with a
// running total threaded to onProgress. Falls back to an in-process calc.
function coordinator(params: GenCalcParams, onProgress?: ProgressFn) {
  if (simPool.init(params)) {
    let total = 0;
    const evaluator = async (
      teams: string[][],
    ): Promise<(TeamResult | null)[]> => {
      const r = await simPool.simMany(teams);
      total += teams.length;
      onProgress?.(total);
      return r;
    };
    return buildGenCalc(params, evaluator, 'shared');
  }
  // in-process fallback (prerender / no workers) — still shares the cross-run cache
  return buildGenCalc(params, undefined, 'shared');
}

/** bestTeam, search on the main thread + sims on the pool. */
export function genBestTeam(
  params: GenCalcParams,
  opts?: BestTeamOpts,
  onProgress?: ProgressFn,
): Promise<TeamResult | null> {
  return coordinator(params, onProgress).bestTeam({
    exclude: asSet(opts?.exclude),
    mustInclude: opts?.mustInclude,
  });
}

/** topTeams(n), search on the main thread + sims on the pool. */
export function genTopTeams(
  params: GenCalcParams,
  n: number,
  opts?: TopTeamsOpts,
  onProgress?: ProgressFn,
): Promise<TeamResult[]> {
  return coordinator(params, onProgress).topTeams(n, opts);
}
