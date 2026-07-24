// Roster-generator web worker (perf plan item 1a). Runs the teamcalc search off
// the UI thread so "Calculate top 5 teams" never freezes the page. It imports the
// same static JSON as the main thread and reconstructs the calc via buildGenCalc,
// so its output is byte-identical to a main-thread run (parity gate:
// scripts/tests/generators/loadouts-parity.test.ts). Requests carry only
// serializable params — `exclude` arrives as a string[] and is rehydrated to a Set.
import {
  buildGenCalc,
  type GenCalcParams,
  type TeamResult,
} from './genCalc';

export type WorkerRequest =
  | {
      id: number;
      kind: 'bestTeam';
      params: GenCalcParams;
      opts?: { exclude?: string[]; mustInclude?: string[] };
    }
  | {
      id: number;
      kind: 'topTeams';
      params: GenCalcParams;
      n: number;
      opts?: {
        pinnedByTeam?: string[][];
        mustUse?: string[];
        spreadTargets?: number[];
      };
    };

export type WorkerResponse =
  | { id: number; result: TeamResult | TeamResult[] | null }
  | { id: number; error: string };

// Type `self` loosely so this file doesn't need the "webworker" lib (which can
// clash with the DOM lib the web tsconfig pulls in) — the worker only touches
// onmessage/postMessage.
const ctx = self as unknown as {
  onmessage: ((e: MessageEvent<WorkerRequest>) => void) | null;
  postMessage: (msg: WorkerResponse) => void;
};

ctx.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const req = e.data;
  try {
    const calc = buildGenCalc(req.params);
    const result =
      req.kind === 'bestTeam'
        ? calc.bestTeam({
            exclude: req.opts?.exclude
              ? new Set(req.opts.exclude)
              : undefined,
            mustInclude: req.opts?.mustInclude,
          })
        : calc.topTeams(req.n, req.opts);
    ctx.postMessage({ id: req.id, result } satisfies WorkerResponse);
  } catch (err) {
    ctx.postMessage({
      id: req.id,
      error: String((err as Error)?.message ?? err),
    } satisfies WorkerResponse);
  }
};
