// Overload roll POLICY + Monte-Carlo cost engine. Given a target set of lines,
// simulate the optimal reroll-and-lock process to hit it, and report the
// distribution of required rerolls plus the expected module / temp-lock cost in
// both lock modes. Ground truth is Monte Carlo (exact mechanic); a closed-form
// cross-check is provided for the single-line case.
//
// Optimal policy (greedy-lock): after each roll, lock every line that already
// satisfies a target requirement, then reroll the rest. For this cost structure
// this is optimal — a satisfied target line is exactly a goal component, and
// re-acquiring a specific (stat, tier>=t) line is far more expensive than the
// per-roll lock premium, so protecting progress never increases expected cost.

import {
  type OlProbModel, type Piece, type Locked, type Target,
  rollPiece, valueReset, reqOf, makeRng, ALL_KEYS,
} from './model.js';

const EMPTY: Piece = [null, null, null];

function establishCost(model: OlProbModel, maxLocked: number): number {
  let c = 0;
  for (let j = 1; j <= maxLocked; j++) c += model.cost.permanentLockEstablishModules[j] ?? 0;
  return c;
}

export interface TrialResult {
  rollsP1: number;         // phase-1 rerolls (stat acquisition)
  resetsP2: number;        // phase-2 value-resets (tier push)
  ops: number;             // rollsP1 + resetsP2
  rerollModules: number;   // module spend (shared by both modes)
  moduleCostPerm: number;  // modules + one-time permanent-lock establishment (both phases)
  moduleCostTemp: number;  // modules only (locks paid in temp-lock currency)
  tempLocks: number;       // temp-lock currency spent (temp mode)
  censored: boolean;       // hit the op cap before completing
}

// Phase-1 locking policy (which acquired target stats to lock while fishing for
// the rest). Encodes the community "don't lock line 1 for 12/12" wisdom so it can
// be tested, not assumed:
//   greedy   — lock every target as it lands (protects everything, over-locks).
//   lazy     — never lock line 1 (slot 0 is always present → cheap to re-hit).
//   lazyRare — also hold line 2 until line 3 is locked (protect the rare 30% slot).
//   smart    — DEFAULT. Lock rarer slots (line 2/3) on stat-match, but lock line 1
//              only if it already meets its tier target (so a freshly-rolled low
//              line 1 is left cheap-to-reroll, while a held high line 1 is kept).
export type LockPolicy = 'greedy' | 'lazy' | 'lazyRare' | 'smart';

export interface TrialOpts { start?: Piece; fresh?: boolean; cap?: number; lockPolicy?: LockPolicy }

function phase1Locks(piece: Piece, target: Target, tstats: Set<string>, policy: LockPolicy): Locked {
  const good = [0, 1, 2].map((i) => { const l = piece[i]; return !!(l && tstats.has(l.key)); });
  if (policy === 'greedy') return [good[0], good[1], good[2]];
  if (policy === 'lazy') return [false, good[1], good[2]];
  if (policy === 'lazyRare') return [false, good[1] && good[2], good[2]];
  return [good[0] && reqOf(piece[0], target) !== null, good[1], good[2]]; // smart
}

// One trial of the T11 method, in two phases:
//   Phase 1 (stat acquisition): reroll — locking a slot the moment its stat is a
//     target stat — until all target stats are present (at any tier).
//   Phase 2 (value reset): value-reset the tiers, locking each line as it reaches
//     its target tier, until every line meets its minTier.
// Both operations share the reroll cost structure. Permanent-lock establishment
// is charged per phase (you unlock between phases, then re-lock during value reset).
export function simulateTrial(
  rng: () => number, model: OlProbModel, target: Target, opts: TrialOpts = {},
): TrialResult {
  const cap = opts.cap ?? 100_000;
  const policy = opts.lockPolicy ?? 'smart';
  let piece: Piece = opts.start ?? EMPTY;
  let fresh = opts.fresh ?? (opts.start === undefined); // from-scratch => first roll is a fresh overload
  const tstats = new Set(target.map((r) => r.key));
  let rollsP1 = 0, resetsP2 = 0, rerollModules = 0, tempLocks = 0;
  let maxLockP1 = 0, maxLockP2 = 0, censored = false;

  const charge = (n: number) => {
    rerollModules += model.cost.rerollModulesByLocked[n];
    tempLocks += model.cost.tempLockPerRollByLocked[n];
  };

  // Phase 1 — acquire all target stats (lock a slot once its stat is a target stat).
  const statsPresent = () => [...tstats].every((k) => piece.some((l) => l && l.key === k));
  while (!statsPresent()) {
    const locked = phase1Locks(piece, target, tstats, policy);
    const n = locked.filter(Boolean).length;
    maxLockP1 = Math.max(maxLockP1, n);
    charge(n);
    piece = rollPiece(rng, model, piece, locked, fresh);
    fresh = false;
    if (++rollsP1 >= cap) { censored = true; break; }
  }

  // Phase 2 — value-reset tiers (lock a line once it meets its target tier).
  const tierMet = () => target.every((r) => piece.some((l) => l && l.key === r.key && l.tier >= r.minTier));
  while (!censored && !tierMet()) {
    const locked = [0, 1, 2].map((i) => reqOf(piece[i], target) !== null) as Locked;
    const n = locked.filter(Boolean).length;
    maxLockP2 = Math.max(maxLockP2, n);
    charge(n);
    piece = valueReset(rng, model, piece, locked);
    if (++resetsP2 >= cap) { censored = true; break; }
  }

  const establish = establishCost(model, maxLockP1) + establishCost(model, maxLockP2);
  return {
    rollsP1, resetsP2, ops: rollsP1 + resetsP2, rerollModules,
    moduleCostPerm: rerollModules + establish,
    moduleCostTemp: rerollModules,
    tempLocks, censored,
  };
}

export interface McSummary {
  trials: number;
  censoredFrac: number;
  ops: { mean: number; sd: number; se: number; pctiles: Record<string, number> }; // total operations (rerolls + value-resets)
  phase1Rerolls: { mean: number };
  phase2Resets: { mean: number };
  moduleCostPerm: { mean: number; se: number };
  moduleCostTemp: { mean: number; se: number };
  tempLocks: { mean: number; se: number };
  histogram: Array<{ lo: number; hi: number; count: number; overflow?: boolean }>;
  density: Array<{ lo: number; hi: number; mid: number; count: number }>; // fine bins to p99, for a bell-curve chart
  analytic?: AnalyticSingle; // present only for single-line targets
}

function stats(xs: number[]) {
  const n = xs.length;
  const mean = xs.reduce((a, b) => a + b, 0) / n;
  const varr = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, n - 1);
  const sd = Math.sqrt(varr);
  return { mean, sd, se: sd / Math.sqrt(n) };
}

function percentile(sorted: number[], q: number): number {
  const idx = Math.min(sorted.length - 1, Math.floor(q * sorted.length));
  return sorted[idx];
}

// Bin over [1, upper] (upper ~ p95 so the shape is visible), with a final
// "upper+" overflow bucket for the long right tail.
function histogram(rolls: number[], upper: number, bins = 12): Array<{ lo: number; hi: number; count: number; overflow?: boolean }> {
  const width = Math.max(1, Math.ceil(upper / bins));
  const out: Array<{ lo: number; hi: number; count: number; overflow?: boolean }> = [];
  for (let b = 0; b < bins; b++) out.push({ lo: b * width + 1, hi: (b + 1) * width, count: 0 });
  out.push({ lo: bins * width + 1, hi: Infinity, count: 0, overflow: true });
  for (const r of rolls) {
    const b = Math.min(bins, Math.floor((r - 1) / width));
    out[b].count++;
  }
  return out.filter((h) => h.count > 0);
}

// Fine-grained density over [0, upper] (upper ~ p99) for a smooth bell-curve chart.
// The ~1% tail beyond `upper` is dropped so the curve isn't distorted by outliers.
function density(ops: number[], upper: number, bins = 22): Array<{ lo: number; hi: number; mid: number; count: number }> {
  const width = Math.max(1, Math.ceil(upper / bins));
  const out: Array<{ lo: number; hi: number; mid: number; count: number }> = [];
  for (let b = 0; b < bins; b++) {
    const lo = b * width, hi = (b + 1) * width;
    out.push({ lo, hi, mid: (lo + hi) / 2, count: 0 });
  }
  for (const v of ops) {
    const b = Math.floor(v / width);
    if (b >= 0 && b < bins) out[b].count++;
  }
  return out;
}

interface Cols { ops: number[]; p1: number[]; p2: number[]; perm: number[]; temp: number[]; tl: number[]; censored: number }

function summarize(c: Cols, trials: number, analytic?: AnalyticSingle): McSummary {
  const sorted = [...c.ops].sort((a, b) => a - b);
  const rs = stats(c.ops);
  return {
    trials,
    censoredFrac: c.censored / trials,
    ops: {
      mean: rs.mean, sd: rs.sd, se: rs.se,
      pctiles: {
        p50: percentile(sorted, 0.5), p80: percentile(sorted, 0.8),
        p90: percentile(sorted, 0.9), p95: percentile(sorted, 0.95),
        p99: percentile(sorted, 0.99),
      },
    },
    phase1Rerolls: { mean: stats(c.p1).mean },
    phase2Resets: { mean: stats(c.p2).mean },
    moduleCostPerm: { mean: stats(c.perm).mean, se: stats(c.perm).se },
    moduleCostTemp: { mean: stats(c.temp).mean, se: stats(c.temp).se },
    tempLocks: { mean: stats(c.tl).mean, se: stats(c.tl).se },
    histogram: histogram(c.ops, Math.max(1, percentile(sorted, 0.95))),
    density: density(c.ops, Math.max(5, percentile(sorted, 0.99))),
    analytic,
  };
}

function newCols(): Cols { return { ops: [], p1: [], p2: [], perm: [], temp: [], tl: [], censored: 0 }; }
function push(c: Cols, t: TrialResult) {
  c.ops.push(t.ops); c.p1.push(t.rollsP1); c.p2.push(t.resetsP2);
  c.perm.push(t.moduleCostPerm); c.temp.push(t.moduleCostTemp); c.tl.push(t.tempLocks);
  if (t.censored) c.censored++;
}

// Single-piece: distribution + cost to reach one piece's target.
export function monteCarlo(
  model: OlProbModel, target: Target,
  o: { trials?: number; seed?: number; start?: Piece; fresh?: boolean; cap?: number; lockPolicy?: LockPolicy } = {},
): McSummary {
  const trials = o.trials ?? 20_000;
  const rng = makeRng(o.seed ?? 0x1234abcd);
  const c = newCols();
  for (let i = 0; i < trials; i++) push(c, simulateTrial(rng, model, target, { start: o.start, fresh: o.fresh, cap: o.cap, lockPolicy: o.lockPolicy }));
  return summarize(c, trials, target.length === 1 ? analyticSingle(model, target[0]) : undefined);
}

// Full build: N pieces (cards) each with its own target. Each trial rolls all
// pieces independently on the same rng stream; the total is the sum across
// pieces (the cost/rolls to finish the WHOLE build). Returns per-card summaries
// plus the aggregate. Pieces with an empty target contribute 0.
export function monteCarloBuild(
  model: OlProbModel, targets: Target[],
  o: { trials?: number; seed?: number; starts?: (Piece | undefined)[]; fresh?: boolean; cap?: number; lockPolicy?: LockPolicy } = {},
): { perPiece: McSummary[]; total: McSummary } {
  const trials = o.trials ?? 20_000;
  const rng = makeRng(o.seed ?? 0x1234abcd);
  const per = targets.map(() => newCols());
  const tot = newCols();
  for (let i = 0; i < trials; i++) {
    let R = 0, P1 = 0, P2 = 0, P = 0, T = 0, L = 0, c = false;
    for (let j = 0; j < targets.length; j++) {
      const res = simulateTrial(rng, model, targets[j], { start: o.starts?.[j], fresh: o.fresh, cap: o.cap, lockPolicy: o.lockPolicy });
      push(per[j], res);
      R += res.ops; P1 += res.rollsP1; P2 += res.resetsP2;
      P += res.moduleCostPerm; T += res.moduleCostTemp; L += res.tempLocks; c = c || res.censored;
    }
    tot.ops.push(R); tot.p1.push(P1); tot.p2.push(P2); tot.perm.push(P); tot.temp.push(T); tot.tl.push(L);
    if (c) tot.censored++;
  }
  const perPiece = per.map((p, j) =>
    summarize(p, trials, targets[j].length === 1 ? analyticSingle(model, targets[j][0]) : undefined));
  return { perPiece, total: summarize(tot, trials) };
}

// ---- Closed-form cross-check for a single-line target (validates the MC) ----
// Two-phase, from an empty non-fresh start:
//   Phase 1 acquire the stat: geometric, E = 1 / P(key present).
//   Phase 2 push the tier: after acquisition the tier is a band draw; value-reset
//     until tier >= minTier, E = (1 - pTierGE) / pTierGE.
// Key presence uses a with-replacement approximation over the 3 gated slots
// (removing one stat from a ~100-weight pool is a small correction); tier is exact.
export interface AnalyticSingle {
  pKeyPresent: number; pTierGE: number;
  expectedP1: number; expectedP2: number; expectedOps: number;
  note: string;
}

function pTierAtLeast(model: OlProbModel, minTier: number): number {
  let p = 0;
  for (const b of model.tierBands.bands) {
    if (minTier > b.hi) continue;
    const lo = Math.max(minTier, b.lo);
    p += b.p * ((b.hi - lo + 1) / (b.hi - b.lo + 1));
  }
  return p;
}

export function analyticSingle(model: OlProbModel, req: { key: Target[number]['key']; minTier: number }): AnalyticSingle {
  const W = ALL_KEYS.reduce((a, k) => a + model.typeWeights[k], 0);
  const w = model.typeWeights[req.key];
  const g = [model.lineCountGates.slot1, model.lineCountGates.slot2, model.lineCountGates.slot3];
  const pAbsent = g.reduce((acc, gi) => acc * (1 - gi * (w / W)), 1);
  const pKeyPresent = 1 - pAbsent;
  const pTierGE = pTierAtLeast(model, req.minTier);
  const expectedP1 = pKeyPresent > 0 ? 1 / pKeyPresent : Infinity;
  const expectedP2 = pTierGE > 0 ? (1 - pTierGE) / pTierGE : Infinity;
  return {
    pKeyPresent, pTierGE, expectedP1, expectedP2, expectedOps: expectedP1 + expectedP2,
    note: 'with-replacement approx for key presence; tier exact; empty non-fresh start (no fresh-T11 bonus)',
  };
}
