// Main-thread client for the roster-generator worker (perf plan item 1a). Lazily
// spins up ONE module worker and marshals bestTeam/topTeams calls to it, returning
// promises the UI awaits. When workers are unavailable (SSR prerender, the JSDOM
// web-smoke, or a browser that fails to construct the worker) it transparently
// falls back to running the same buildGenCalc on the calling thread — identical
// results, just blocking. Item 1b swaps this single worker for a pool.
import {
  buildGenCalc,
  type GenCalcParams,
  type TeamResult,
} from './genCalc';
import type { WorkerRequest, WorkerResponse } from './simWorker';

// Distributive omit — `Omit<Union, K>` collapses to the members' common keys, so
// use this to strip `id` from each WorkerRequest variant while keeping `n`/`opts`.
type WithoutId<T> = T extends unknown ? Omit<T, 'id'> : never;

export interface BestTeamOpts {
  exclude?: Set<string> | string[];
  mustInclude?: string[];
}
export interface TopTeamsOpts {
  pinnedByTeam?: string[][];
  mustUse?: string[];
  spreadTargets?: number[];
}

const asArray = (e?: Set<string> | string[]): string[] | undefined =>
  e === undefined ? undefined : Array.isArray(e) ? e : [...e];

let worker: Worker | null = null;
let workerUnavailable = false;
let nextId = 1;
const pending = new Map<
  number,
  { resolve: (v: any) => void; reject: (e: Error) => void }
>();

function getWorker(): Worker | null {
  if (workerUnavailable) return null;
  if (worker) return worker;
  if (typeof Worker === 'undefined') {
    workerUnavailable = true;
    return null;
  }
  try {
    const w = new Worker(new URL('./simWorker.ts', import.meta.url), {
      type: 'module',
    });
    w.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const res = e.data;
      const p = pending.get(res.id);
      if (!p) return;
      pending.delete(res.id);
      if ('error' in res) p.reject(new Error(res.error));
      else p.resolve(res.result);
    };
    w.onerror = (e) => {
      // A fatal worker error rejects everything in flight; future calls fall
      // back to the main thread so the generator never silently hangs.
      workerUnavailable = true;
      worker = null;
      const err = new Error(`sim worker error: ${e.message ?? 'unknown'}`);
      for (const [, p] of pending) p.reject(err);
      pending.clear();
    };
    worker = w;
    return w;
  } catch {
    workerUnavailable = true;
    return null;
  }
}

function post(req: WithoutId<WorkerRequest>): Promise<any> {
  const w = getWorker();
  if (!w) return Promise.reject(new Error('no worker'));
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    w.postMessage({ ...req, id } as WorkerRequest);
  });
}

/** bestTeam off the worker (falls back to the main thread when unavailable). */
export async function genBestTeam(
  params: GenCalcParams,
  opts?: BestTeamOpts,
): Promise<TeamResult | null> {
  const wire = { exclude: asArray(opts?.exclude), mustInclude: opts?.mustInclude };
  if (getWorker()) {
    try {
      return await post({ kind: 'bestTeam', params, opts: wire });
    } catch {
      // fall through to the main-thread path
    }
  }
  return buildGenCalc(params).bestTeam({
    exclude: wire.exclude ? new Set(wire.exclude) : undefined,
    mustInclude: wire.mustInclude,
  });
}

/** topTeams(n) off the worker (falls back to the main thread when unavailable). */
export async function genTopTeams(
  params: GenCalcParams,
  n: number,
  opts?: TopTeamsOpts,
): Promise<TeamResult[]> {
  if (getWorker()) {
    try {
      return await post({ kind: 'topTeams', params, n, opts });
    } catch {
      // fall through to the main-thread path
    }
  }
  return buildGenCalc(params).topTeams(n, opts);
}
