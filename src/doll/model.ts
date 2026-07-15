// Doll (in-game: Collection Item) LEVELING model — the cost to level a doll to
// its SR phase-15 target. Mechanic (owner-confirmed 2026-07-15): you feed
// "toolboxes" (maintenance kits, tiers R/SR/SSR worth 200/500/1000 EXP); each
// feed rolls a super-success whose chance depends on the doll rarity, toolbox
// tier, and current phase step (data/doll-super-success.json). On a proc the doll
// JUMPS to the next checkpoint (5/10/15) with XP reset to 0 and the toolbox spent;
// on a miss the toolbox's EXP is added and the doll levels up when it crosses the
// per-phase threshold (R doll 1000 EXP/level, SR doll 3000). Dolls come in R and
// SR rarity, phases 0..15; a maxed R15 doll converts to an SR doll at phase 5.
//
// Data: data/doll-economy.json (EXP/thresholds/checkpoints) + data/doll-super-success.json (proc %).

export type Rarity = 'R' | 'SR';
export type ToolboxTier = 'R' | 'SR' | 'SSR';
export const TIERS: ToolboxTier[] = ['R', 'SR', 'SSR'];

export interface DollModel {
  toolboxExp: Record<ToolboxTier, number>;   // 200 / 500 / 1000 — EXP a kit adds on a miss
  kitSupply: Record<ToolboxTier, number>;    // expected kits of each tier per box-open (from drop rates)
  kitWeight: Record<ToolboxTier, number>;    // COST of USING one kit — the optimizer objective (calibrated to kitSupply)
  xpPerLevel: Record<Rarity, number>;         // R 1000, SR 3000
  checkpoints: number[];                       // [5, 10, 15]
  maxPhase: number;                            // 15
  // superSuccessProc[dollRarity][toolboxTier][step] = PERCENT, step index = phase L (the "L→L+1" row), L in 0..14
  superSuccessProc: Record<Rarity, Record<ToolboxTier, number[]>>;
}

interface BoxOutcome { p: number; kits: Partial<Record<ToolboxTier, number>> }
interface EconomyFile {
  toolboxExp: Record<ToolboxTier, number>;
  xpPerLevel: Record<Rarity, number>;
  checkpoints: number[];
  kitDropRates?: { boxes: Array<{ weight: number; outcomes: BoxOutcome[] }> };
}
interface ProcFile {
  superSuccessProc: Record<Rarity, Record<ToolboxTier, number[]>>;
}

// Expected kits of each tier per box-open, from the box drop rates.
function kitSupplyPerBox(economy: EconomyFile): Record<ToolboxTier, number> {
  const drops = economy.kitDropRates;
  if (!drops) return { R: 1, SR: 1, SSR: 1 };
  const supply: Record<ToolboxTier, number> = { R: 0, SR: 0, SSR: 0 };
  let totW = 0;
  for (const box of drops.boxes) {
    totW += box.weight;
    for (const o of box.outcomes) for (const t of TIERS) supply[t] += box.weight * o.p * (o.kits[t] ?? 0);
  }
  for (const t of TIERS) supply[t] /= totW || 1;
  return supply;
}

export function buildModel(economy: EconomyFile, proc: ProcFile): DollModel {
  const kitSupply = kitSupplyPerBox(economy);
  return {
    toolboxExp: economy.toolboxExp,
    kitSupply,
    // initial weight guess = 1/supply; calibrateWeights() (policy.ts) refines it to the
    // shadow prices that make the optimal policy consume kits in the supply ratio.
    kitWeight: { R: 1 / kitSupply.R, SR: 1 / kitSupply.SR, SSR: 1 / kitSupply.SSR },
    xpPerLevel: economy.xpPerLevel,
    checkpoints: economy.checkpoints,
    maxPhase: economy.checkpoints[economy.checkpoints.length - 1],
    superSuccessProc: proc.superSuccessProc,
  };
}

// The checkpoint a super-success from phase L jumps to (the first checkpoint > L),
// or the max phase if already past the last one.
export function nextCheckpoint(model: DollModel, L: number): number {
  for (const c of model.checkpoints) if (c > L) return c;
  return model.maxPhase;
}

export function procChance(model: DollModel, rarity: Rarity, tier: ToolboxTier, L: number): number {
  const row = model.superSuccessProc[rarity][tier];
  return (row[L] ?? 0) / 100;
}

export interface FeedOutcome { L: number; xp: number }

// Apply one MISS feed (no super-success): add the toolbox EXP, level up across the
// per-phase threshold. A single feed can cross at most one level (max toolbox EXP
// = 1000 ≤ smallest threshold 1000).
export function applyMiss(model: DollModel, rarity: Rarity, L: number, xp: number, tier: ToolboxTier): FeedOutcome {
  const threshold = model.xpPerLevel[rarity];
  let nxp = xp + model.toolboxExp[tier];
  let nL = L;
  while (nxp >= threshold && nL < model.maxPhase) { nxp -= threshold; nL++; }
  if (nL >= model.maxPhase) nxp = 0;
  return { L: nL, xp: nxp };
}

// XP grid step: all reachable xp values are multiples of gcd(200,500,1000) = 100.
export const XP_STEP = 100;
