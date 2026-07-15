// Doll leveling POLICY + cost. Exact backward-DP for the optimal toolbox-tier
// choice at every state (min expected total toolbox EXP to reach the SR-15
// target), plus seeded Monte Carlo for the cost distribution and per-tier feed
// counts, and the path comparison (launder an R doll vs level a raw SR) with the
// trade-in EV. Because a doll's phase only ever increases, the state graph is a
// DAG and the DP is exact.

import {
  type DollModel, type Rarity, type ToolboxTier, TIERS,
  nextCheckpoint, procChance, applyMiss, XP_STEP,
} from './model.js';

export interface DpTable {
  rarity: Rarity;
  cost: number[][];                 // cost[L][xpIdx] = expected toolbox EXP to reach max phase
  tier: (ToolboxTier | null)[][];   // optimal toolbox tier at each state
  nXp: number;                      // xp grid slots = xpPerLevel / XP_STEP
}

// Exact optimal policy via backward induction over (phase L, xp).
export function solveDp(model: DollModel, rarity: Rarity): DpTable {
  const threshold = model.xpPerLevel[rarity];
  const nXp = threshold / XP_STEP;
  const maxP = model.maxPhase;
  const cost: number[][] = [];
  const tier: (ToolboxTier | null)[][] = [];
  for (let L = 0; L <= maxP; L++) { cost[L] = new Array(nXp).fill(0); tier[L] = new Array(nXp).fill(null); }

  for (let L = maxP - 1; L >= 0; L--) {
    const cp = nextCheckpoint(model, L);            // proc jump target (> L, already solved)
    for (let xi = nXp - 1; xi >= 0; xi--) {         // high xp first: a miss only raises xp/level
      const xp = xi * XP_STEP;
      let best = Infinity, bestTier: ToolboxTier | null = null;
      for (const t of TIERS) {
        const p = procChance(model, rarity, t, L);
        const procCost = cost[cp][0];                // cp>L (or cp=maxP → 0)
        const m = applyMiss(model, rarity, L, xp, t);
        const missCost = m.L >= maxP ? 0 : cost[m.L][m.xp / XP_STEP];
        const c = model.kitWeight[t] + p * procCost + (1 - p) * missCost;
        if (c < best) { best = c; bestTier = t; }
      }
      cost[L][xi] = best; tier[L][xi] = bestTier;
    }
  }
  return { rarity, cost, tier, nXp };
}

// Expected total toolbox EXP to finish from a given state (0 if already maxed).
export function costFrom(dp: DpTable, model: DollModel, L: number, xp = 0): number {
  if (L >= model.maxPhase) return 0;
  return dp.cost[L][Math.min(dp.nXp - 1, Math.floor(xp / XP_STEP))];
}

// mulberry32 — same PRNG the rest of the sim uses.
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface DollRun { cost: number; exp: number; feeds: number; byTier: Record<ToolboxTier, number> }

// One trial following the optimal policy from (rarity, L, xp) to max phase.
// cost = scarcity-weighted kit cost (the objective); exp = raw toolbox EXP fed.
export function simulateDoll(
  rng: () => number, model: DollModel, dp: DpTable, rarity: Rarity, startL: number, startXp = 0,
): DollRun {
  let L = startL, xp = startXp, cost = 0, exp = 0, feeds = 0;
  const byTier: Record<ToolboxTier, number> = { R: 0, SR: 0, SSR: 0 };
  let guard = 0;
  while (L < model.maxPhase && guard++ < 100_000) {
    const t = dp.tier[L][Math.min(dp.nXp - 1, xp / XP_STEP)] ?? 'SSR';
    cost += model.kitWeight[t]; exp += model.toolboxExp[t]; feeds++; byTier[t]++;
    if (rng() < procChance(model, rarity, t, L)) { L = nextCheckpoint(model, L); xp = 0; }
    else { const m = applyMiss(model, rarity, L, xp, t); L = m.L; xp = m.xp; }
  }
  return { cost, exp, feeds, byTier };
}

export interface DollSummary {
  trials: number;
  cost: { mean: number; sd: number; se: number; p50: number; p90: number };  // scarcity-weighted (box-opens)
  exp: { mean: number };                 // raw toolbox EXP fed
  feeds: { mean: number };
  byTier: Record<ToolboxTier, number>;   // mean feeds per tier
  hist: Array<{ lo: number; hi: number; mid: number; count: number }>;       // over cost
}

function stats(xs: number[]) {
  const n = xs.length, mean = xs.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, n - 1));
  return { mean, sd, se: sd / Math.sqrt(n) };
}
function pct(sorted: number[], q: number) { return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]; }
function density(xs: number[], upper: number, bins = 22) {
  const w = Math.max(1, Math.ceil(upper / bins));
  const out: Array<{ lo: number; hi: number; mid: number; count: number }> = [];
  for (let b = 0; b < bins; b++) out.push({ lo: b * w, hi: (b + 1) * w, mid: (b + 0.5) * w, count: 0 });
  for (const v of xs) { const b = Math.floor(v / w); if (b >= 0 && b < bins) out[b].count++; }
  return out;
}

export function monteCarlo(
  model: DollModel, dp: DpTable, rarity: Rarity, startL: number, startXp = 0,
  o: { trials?: number; seed?: number } = {},
): DollSummary {
  const trials = o.trials ?? 20_000;
  const rng = makeRng(o.seed ?? 0x5eed01);
  const costs: number[] = [], exps: number[] = [], feeds: number[] = [];
  const byTier: Record<ToolboxTier, number> = { R: 0, SR: 0, SSR: 0 };
  for (let i = 0; i < trials; i++) {
    const r = simulateDoll(rng, model, dp, rarity, startL, startXp);
    costs.push(r.cost); exps.push(r.exp); feeds.push(r.feeds);
    byTier.R += r.byTier.R; byTier.SR += r.byTier.SR; byTier.SSR += r.byTier.SSR;
  }
  const sorted = [...costs].sort((a, b) => a - b);
  const cs = stats(costs);
  return {
    trials,
    cost: { mean: cs.mean, sd: cs.sd, se: cs.se, p50: pct(sorted, 0.5), p90: pct(sorted, 0.9) },
    exp: { mean: stats(exps).mean },
    feeds: { mean: stats(feeds).mean },
    byTier: { R: byTier.R / trials, SR: byTier.SR / trials, SSR: byTier.SSR / trials },
    hist: density(costs, Math.max(5, pct(sorted, 0.99))),
  };
}

// Exact EXPECTED kit consumption (per tier) to level one doll, under the DP policy.
// Deterministic forward pass over the state DAG — no Monte Carlo noise.
export function expectedConsumption(
  model: DollModel, dp: DpTable, rarity: Rarity, startL = 0, startXp = 0,
): Record<ToolboxTier, number> & { feeds: number } {
  const maxP = model.maxPhase, nXp = dp.nXp;
  const v: number[][] = [];
  for (let L = 0; L <= maxP; L++) v[L] = new Array(nXp).fill(0);
  v[startL][Math.min(nXp - 1, Math.floor(startXp / XP_STEP))] = 1;
  const cons: Record<ToolboxTier, number> = { R: 0, SR: 0, SSR: 0 };
  let feeds = 0;
  for (let L = startL; L < maxP; L++) {
    for (let xi = 0; xi < nXp; xi++) {
      const prob = v[L][xi];
      if (prob <= 1e-15) continue;
      const t = dp.tier[L][xi] ?? 'R';
      cons[t] += prob; feeds += prob;
      const p = procChance(model, rarity, t, L);
      const cp = nextCheckpoint(model, L);
      if (cp < maxP) v[cp][0] += prob * p;                 // proc → checkpoint (cp==maxP absorbs = done)
      const m = applyMiss(model, rarity, L, xi * XP_STEP, t);
      if (m.L < maxP) v[m.L][m.xp / XP_STEP] += prob * (1 - p);
    }
  }
  return { ...cons, feeds };
}

// Calibrate kit usage-weights (shadow prices) to the THROUGHPUT objective: open many
// boxes and level as many SR dolls 0→15 as possible. The optimum consumes kits in the
// supply ratio so nothing is wasted; the weights are the prices that make the per-doll
// DP do that. Multiplicative fixed point: raise the weight of whichever tier is used
// fastest relative to its supply, until all tiers are exhausted at the same rate.
export interface Calibration {
  weights: Record<ToolboxTier, number>;        // λ* — dual-optimal shadow prices
  dollsPer1000Mixed: number;                    // EXACT max throughput (mixed policy) = 1000 / z*
  dollsPer1000Pure: number;                     // best single pure strategy at λ*
  pureConsumption: Record<ToolboxTier, number>; // kits/doll under the pure policy at λ*
  bottleneck: ToolboxTier;
  wasteFrac: Record<ToolboxTier, number>;       // fraction of each tier's supply unused by the pure policy
}
const logspace = (lo: number, hi: number, n: number) =>
  Array.from({ length: n }, (_, i) => lo * (hi / lo) ** (i / (n - 1)));

// Max SR dolls per box, via Lagrangian duality. With shadow prices λ (kit usage-costs),
// the inner problem "min Σ λ_t · kits_t per doll" is exactly the weighted DP; the dual is
//   z* = max over {λ ≥ 0, Σ λ_t·supply_t = 1} of DP_value(λ)   (concave in λ),
// and max dolls/box = 1/z*. We grid the two price ratios (R fixed at 1) and refine.
export function calibrateWeights(model: DollModel, rarity: Rarity = 'SR', grid = 60): Calibration {
  const s = model.kitSupply;
  const evalDual = (wSR: number, wSSR: number) => {
    const w: Record<ToolboxTier, number> = { R: 1, SR: wSR, SSR: wSSR };
    const dpCost = solveDp({ ...model, kitWeight: w }, rarity).cost[0][0];
    const norm = s.R * 1 + s.SR * wSR + s.SSR * wSSR;
    return dpCost / norm; // z candidate (boxes per doll)
  };
  let bestSR = 1, bestSSR = 1, bestZ = -Infinity;
  let lo1 = 0.02, hi1 = 6, lo2 = 0.05, hi2 = 12;
  for (let pass = 0; pass < 3; pass++) {           // grid then refine around the best
    for (const wSR of logspace(lo1, hi1, grid)) {
      for (const wSSR of logspace(lo2, hi2, grid)) {
        const z = evalDual(wSR, wSSR);
        if (z > bestZ) { bestZ = z; bestSR = wSR; bestSSR = wSSR; }
      }
    }
    lo1 = bestSR / 1.6; hi1 = bestSR * 1.6; lo2 = bestSSR / 1.6; hi2 = bestSSR * 1.6;
  }
  const weights: Record<ToolboxTier, number> = { R: 1, SR: bestSR, SSR: bestSSR };
  const dpStar = solveDp({ ...model, kitWeight: weights }, rarity);
  const c = expectedConsumption({ ...model, kitWeight: weights }, dpStar, rarity, 0, 0);
  const dollsPure = 1000 / Math.max(c.R / s.R, c.SR / s.SR, c.SSR / s.SSR);
  const dollsMixed = 1000 / bestZ;
  const wasteFrac: Record<ToolboxTier, number> = { R: 0, SR: 0, SSR: 0 };
  for (const t of TIERS) wasteFrac[t] = s[t] > 0 ? Math.max(0, 1 - (dollsPure * c[t]) / (1000 * s[t])) : 0;
  const bottleneck = TIERS.reduce((a, t) => (c[t] / s[t] > c[a] / s[a] ? t : a), 'R' as ToolboxTier);
  return {
    weights, dollsPer1000Mixed: dollsMixed, dollsPer1000Pure: dollsPure,
    pureConsumption: { R: c.R, SR: c.SR, SSR: c.SSR }, bottleneck, wasteFrac,
  };
}

// ---- Path comparison + trade-in EV (all in scarcity-weighted kit-cost units) ----
export interface PathAnalysis {
  launderTotal: number;   // R 0→15 (dpR) + SR 5→15 (dpSR), plus 1 R doll consumed
  launderRCost: number;   // the R-leveling portion
  launderSrCost: number;  // the SR 5→15 portion
  rawSrCost: number;      // SR 0→15
  srSavedByLaunder: number; // SR 0→5 cost that laundering avoids
  tradeInValuePerRDoll: number; // weighted kit value you'd get by trading a spare R doll instead
  tradeInSrDollPerRDoll: number;
}
export function analysePaths(model: DollModel, dpR: DpTable, dpSR: DpTable): PathAnalysis {
  const launderRCost = dpR.cost[0][0];
  const launderSrCost = dpSR.cost[5][0];
  const rawSrCost = dpSR.cost[0][0];
  // trade-in: 4 R dolls → 15% SR doll / 30% 10 SSR kits / 55% 20 SR kits (weighted kit value)
  const kitEv = 0.30 * 10 * model.kitWeight.SSR + 0.55 * 20 * model.kitWeight.SR;
  return {
    launderTotal: launderRCost + launderSrCost,
    launderRCost, launderSrCost,
    rawSrCost,
    srSavedByLaunder: rawSrCost - launderSrCost,
    tradeInValuePerRDoll: kitEv / 4,
    tradeInSrDollPerRDoll: 0.15 / 4,
  };
}
