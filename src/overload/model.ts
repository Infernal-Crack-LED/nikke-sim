// Overload (OL) ROLL model — the acquisition-cost side of OL gear: given a target
// set of substat lines, how expensive is it to actually roll them. This is the
// stochastic counterpart to the DPS-value side (src/olcalc.ts, src/olconfigs.ts,
// src/bestol.ts), which answers *what* to target; this module answers *how much
// it costs to get there*. Pure/deterministic per seed — no engine dependency.
//
// Probability model + cost constants: data/ol-probabilities.json (datamined).
// Line values: data/ol-tiers.json. Keys: data/ol-lines.json.

export type OlKey =
  | 'atk' | 'def' | 'elem' | 'critdmg'
  | 'hitrate' | 'ammo' | 'chargedmg' | 'chargespd' | 'critrate';

export interface OlProbModel {
  typeWeights: Record<OlKey, number>;
  lineCountGates: { slot1: number; slot2: number; slot3: number };
  tierBands: { bands: Array<{ lo: number; hi: number; p: number }> };
  firstOverloadGuaranteedTier: number;
  cost: {
    rerollModulesByLocked: number[];      // [0-locked, 1-locked, 2-locked]
    permanentLockEstablishModules: number[]; // one-time, index = lock number
    tempLockPerRollByLocked: number[];    // per-roll temp-locks, index = locks held
  };
}

export interface Line { key: OlKey; tier: number }
// A piece is 3 positional slots; null = the slot rolled empty.
export type Piece = [Line | null, Line | null, Line | null];
export type Locked = [boolean, boolean, boolean];

export interface TargetReq { key: OlKey; minTier: number }
export type Target = TargetReq[]; // up to 3, distinct keys

export const ALL_KEYS: OlKey[] = [
  'atk', 'def', 'elem', 'critdmg', 'hitrate', 'ammo', 'chargedmg', 'chargespd', 'critrate',
];

// mulberry32 — same PRNG the engine uses (src/engine/sim.ts) for reproducibility.
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Weighted pick from `keys` (weights from the model), WITHOUT replacement is the
// caller's job (pass a pool that already excludes used keys).
function pickStat(rng: () => number, model: OlProbModel, pool: OlKey[]): OlKey {
  let total = 0;
  for (const k of pool) total += model.typeWeights[k];
  let r = rng() * total;
  for (const k of pool) {
    r -= model.typeWeights[k];
    if (r <= 0) return k;
  }
  return pool[pool.length - 1];
}

// Sample a value tier (1..15) from the front-loaded bands; uniform within a band.
function pickTier(rng: () => number, model: OlProbModel): number {
  const bands = model.tierBands.bands;
  let r = rng();
  for (const b of bands) {
    if (r < b.p) return b.lo + Math.floor(rng() * (b.hi - b.lo + 1));
    r -= b.p;
  }
  const last = bands[bands.length - 1];
  return last.lo + Math.floor(rng() * (last.hi - last.lo + 1));
}

const GATES = (m: OlProbModel) => [m.lineCountGates.slot1, m.lineCountGates.slot2, m.lineCountGates.slot3];

// Roll a piece. Locked slots are kept verbatim; each unlocked slot re-rolls its
// presence (positional gate), then its stat (weighted, without replacement vs all
// stats currently on the piece) and tier. `fresh` = first-ever overload -> every
// produced line is guaranteed tier `firstOverloadGuaranteedTier`.
export function rollPiece(
  rng: () => number,
  model: OlProbModel,
  prev: Piece,
  locked: Locked,
  fresh = false,
): Piece {
  const gates = GATES(model);
  const out: (Line | null)[] = [null, null, null];
  const used = new Set<OlKey>();
  for (let i = 0; i < 3; i++) if (locked[i] && prev[i]) { out[i] = prev[i]; used.add(prev[i]!.key); }
  for (let i = 0; i < 3; i++) {
    if (locked[i]) continue;
    if (rng() >= gates[i]) { out[i] = null; continue; } // slot rolled empty
    const pool = ALL_KEYS.filter((k) => !used.has(k));
    const key = pickStat(rng, model, pool);
    used.add(key);
    const tier = fresh ? model.firstOverloadGuaranteedTier : pickTier(rng, model);
    out[i] = { key, tier };
  }
  return out as Piece;
}

// Value reset (수치 조정): re-roll the VALUE (tier) of every unlocked line, keeping
// its stat. Locked slots and empty slots are untouched. This is phase 2 of the
// T11 method — once the right stats are in place, push each line's tier up.
export function valueReset(
  rng: () => number, model: OlProbModel, prev: Piece, locked: Locked,
): Piece {
  const out: (Line | null)[] = [prev[0], prev[1], prev[2]];
  for (let i = 0; i < 3; i++) {
    if (locked[i] || !prev[i]) continue;
    out[i] = { key: prev[i]!.key, tier: pickTier(rng, model) };
  }
  return out as Piece;
}

// Does the piece satisfy the target? Each requirement needs a present line of that
// stat at tier >= minTier. (Stats are unique per piece, so matching is by key.)
export function satisfies(piece: Piece, target: Target): boolean {
  return target.every((req) =>
    piece.some((ln) => ln && ln.key === req.key && ln.tier >= req.minTier));
}

// Which requirement (if any) a present line fulfils — used to decide what to lock.
export function reqOf(line: Line | null, target: Target): TargetReq | null {
  if (!line) return null;
  return target.find((r) => r.key === line.key && line.tier >= r.minTier) ?? null;
}
