// Web-worker pool for the roster generator (perf plan item 1b). Spins up
// min(hardwareConcurrency - 1, 8) stateless sim workers (web/src/simWorker.ts),
// each initialized once with the current generator params, and fans full-team
// sim batches across them. The COORDINATOR (the makeCalc search) runs on the main
// thread and calls simMany() for each decision point; the pool round-robins the
// batch's teams across workers and reassembles results in the original order.
//
// Falls back cleanly when workers are unavailable (JSDOM smoke, or a browser
// that refuses to construct one): init() returns false and the
// caller runs the search in-process instead.
import type { GenCalcParams, TeamResult } from './genCalc';
import type { PoolRequest, PoolResponse } from './simWorker';

const POOL_SIZE = Math.max(
  1,
  Math.min(
    (typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : 4) -
      1 || 1,
    8
  )
);

// Stable key for a params blob so we only re-init workers when the sim inputs
// actually change (loadouts/cfg/blocked/weakness) — not on every search call.
function paramsKey(p: GenCalcParams): string {
  return JSON.stringify([
    p.weakness,
    p.cfg,
    p.blocked,
    p.loadout,
    p.loadouts,
    p.poolB3,
    p.rounds,
  ]);
}

class SimPool {
  private workers: Worker[] = [];
  private available = true;
  private initedKey: string | null = null;
  private nextId = 1;
  private pending = new Map<number, (r: (TeamResult | null)[]) => void>();

  private ensureWorkers(): boolean {
    if (!this.available) {
      return false;
    }
    if (this.workers.length) {
      return true;
    }
    // Test/diagnostic hook: force the in-process fallback (used by the browser
    // pool-vs-fallback parity + wall-clock check, scripts/pool-browser-check.mjs).
    if (
      typeof Worker === 'undefined' ||
      (globalThis as unknown as { __NIKKE_NO_POOL__?: boolean })
        .__NIKKE_NO_POOL__
    ) {
      this.available = false;
      return false;
    }
    try {
      for (let i = 0; i < POOL_SIZE; i++) {
        const w = new Worker(new URL('./simWorker.ts', import.meta.url), {
          type: 'module',
        });
        w.onmessage = (e: MessageEvent<PoolResponse>) => {
          const cb = this.pending.get(e.data.id);
          if (cb) {
            this.pending.delete(e.data.id);
            cb(e.data.results);
          }
        };
        w.onerror = () => this.teardown();
        this.workers.push(w);
      }
      return true;
    } catch {
      this.available = false;
      this.workers = [];
      return false;
    }
  }

  private teardown(): void {
    for (const w of this.workers) {
      w.terminate();
    }
    this.workers = [];
    this.initedKey = null;
    this.available = false;
    for (const [, cb] of this.pending) {
      cb([]);
    } // unblock any waiters
    this.pending.clear();
  }

  /** Ensure the pool exists and is initialized with `params`. Returns false when
   *  workers are unavailable — the caller then runs the search in-process. */
  init(params: GenCalcParams): boolean {
    if (!this.ensureWorkers()) {
      return false;
    }
    const key = paramsKey(params);
    if (key !== this.initedKey) {
      for (const w of this.workers) {
        w.postMessage({ type: 'init', params } satisfies PoolRequest);
      }
      this.initedKey = key;
    }
    return true;
  }

  private send(w: Worker, teams: string[][]): Promise<(TeamResult | null)[]> {
    const id = this.nextId++;
    return new Promise((resolve) => {
      this.pending.set(id, resolve);
      w.postMessage({ type: 'sim', id, teams } satisfies PoolRequest);
    });
  }

  /** Sim every team (round-robin across workers), results in the original order. */
  async simMany(
    teams: string[][],
    onBatch?: (done: number) => void
  ): Promise<(TeamResult | null)[]> {
    const n = this.workers.length;
    if (!n) {
      return teams.map(() => null);
    }
    const out: (TeamResult | null)[] = new Array(teams.length);
    const buckets: number[][] = Array.from({ length: n }, () => []);
    teams.forEach((_, i) => buckets[i % n].push(i));
    let done = 0;
    await Promise.all(
      buckets.map(async (idxs, wi) => {
        if (!idxs.length) {
          return;
        }
        const res = await this.send(
          this.workers[wi],
          idxs.map((i) => teams[i])
        );
        idxs.forEach((origIdx, k) => (out[origIdx] = res[k] ?? null));
        done += idxs.length;
        onBatch?.(done);
      })
    );
    return out;
  }

  get size(): number {
    return this.workers.length || POOL_SIZE;
  }
}

/** The single shared generator pool (one per page). */
export const simPool = new SimPool();
