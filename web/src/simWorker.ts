// Stateless sim-executor worker for the generator pool (perf plan item 1b). One
// of N identical workers (web/src/simPool.ts). On `init` it builds a leaf calc
// from the serializable params (NO evaluator → sims run locally in this worker);
// on `sim` it maps a batch of teams to TeamResults and posts them back. The SEARCH
// (seed/refine/argmax) runs in the coordinator (main thread) — these workers only
// execute sims, so output stays byte-identical to a single-thread run
// (scripts/tests/generators/loadouts-parity.test.ts).
import { buildGenCalc, type GenCalcParams, type TeamResult } from './genCalc';

export type PoolRequest =
  | { type: 'init'; params: GenCalcParams }
  | { type: 'sim'; id: number; teams: string[][] };

export type PoolResponse = { id: number; results: (TeamResult | null)[] };

// Type `self` loosely so this file doesn't need the "webworker" lib.
const ctx = self as unknown as {
  onmessage: ((e: MessageEvent<PoolRequest>) => void) | null;
  postMessage: (msg: PoolResponse) => void;
};

let calc: ReturnType<typeof buildGenCalc> | null = null;

ctx.onmessage = (e: MessageEvent<PoolRequest>) => {
  const msg = e.data;
  if (msg.type === 'init') {
    calc = buildGenCalc(msg.params); // leaf calc — no evaluator, local sims
    return;
  }
  const c = calc;
  const results = c
    ? msg.teams.map((t) => c.simTeamResult(t))
    : msg.teams.map(() => null);
  ctx.postMessage({ id: msg.id, results });
};
