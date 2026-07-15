// Deterministic regression gate for the doll (Collection Item) leveling engine
// (src/doll/*, data/doll-economy.json + doll-super-success.json). Property +
// invariant asserts. Run by scripts/verify.sh.
//   npx tsx scripts/doll-regression.ts
import { readFileSync } from 'node:fs';
import { buildModel, nextCheckpoint, applyMiss } from '../src/doll/model.js';
import { solveDp, monteCarlo, calibrateWeights, costFrom, expectedConsumption } from '../src/doll/policy.js';

const economy = JSON.parse(readFileSync(new URL('../data/doll-economy.json', import.meta.url), 'utf8'));
const proc = JSON.parse(readFileSync(new URL('../data/doll-super-success.json', import.meta.url), 'utf8'));
const model = buildModel(economy, proc);

let fails = 0;
const ok = (name: string, cond: boolean, detail = '') => {
  console.log(cond ? `  ✓ ${name}` : `  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  if (!cond) fails++;
};
const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;

console.log('== doll leveling regression ==');

// --- Model invariants (owner-confirmed data) ---
ok('toolbox EXP 200/500/1000', model.toolboxExp.R === 200 && model.toolboxExp.SR === 500 && model.toolboxExp.SSR === 1000);
ok('xp/level R 1000, SR 3000', model.xpPerLevel.R === 1000 && model.xpPerLevel.SR === 3000);
ok('checkpoints 5/10/15', JSON.stringify(model.checkpoints) === JSON.stringify([5, 10, 15]));
ok('kit supply/box R 3.5 / SR 0.4 / SSR 0.2',
  near(model.kitSupply.R, 3.5, 1e-9) && near(model.kitSupply.SR, 0.4, 1e-9) && near(model.kitSupply.SSR, 0.2, 1e-9),
  JSON.stringify(model.kitSupply));

// --- Mechanic ---
ok('nextCheckpoint 3→5, 7→10, 12→15', nextCheckpoint(model, 3) === 5 && nextCheckpoint(model, 7) === 10 && nextCheckpoint(model, 12) === 15);
const m = applyMiss(model, 'SR', 4, 2500, 'SR'); // 2500 + 500 = 3000 → level up to 5
ok('applyMiss crosses the level threshold', m.L === 5 && m.xp === 0, JSON.stringify(m));

// --- Calibrate + DP (apply the throughput-optimal weights, as production does) ---
const cal = calibrateWeights(model, 'SR');
model.kitWeight = cal.weights;
const dp = solveDp(model, 'SR');
ok('cost decreases toward phase 15', costFrom(dp, model, 0) > costFrom(dp, model, 10) && costFrom(dp, model, 10) > 0);
ok('cost at phase 15 is 0', costFrom(dp, model, 15) === 0);

// --- Throughput / calibration ---
ok('mixed throughput ≥ pure', cal.dollsPer1000Mixed >= cal.dollsPer1000Pure - 1e-6,
  `${cal.dollsPer1000Mixed.toFixed(1)} vs ${cal.dollsPer1000Pure.toFixed(1)}`);
ok('throughput in a sane range (40–120 dolls/1000 boxes)', cal.dollsPer1000Mixed > 40 && cal.dollsPer1000Mixed < 120, cal.dollsPer1000Mixed.toFixed(1));
ok('shadow prices positive (R=1)', cal.weights.R === 1 && cal.weights.SR > 0 && cal.weights.SSR > 0);

// --- Determinism ---
const a1 = monteCarlo(model, dp, 'SR', 0, 0, { trials: 4000, seed: 7 }).cost.mean;
const a2 = monteCarlo(model, dp, 'SR', 0, 0, { trials: 4000, seed: 7 }).cost.mean;
ok('seeded MC is deterministic', a1 === a2, `${a1} vs ${a2}`);

// --- Analytic (expected) vs Monte Carlo feed counts ---
const ec = expectedConsumption(model, dp, 'SR', 0, 0);
const mc = monteCarlo(model, dp, 'SR', 0, 0, { trials: 20000, seed: 9 });
ok('expected feeds ≈ MC feeds (<5%)', Math.abs(ec.feeds - mc.feeds.mean) / ec.feeds < 0.05,
  `analytic ${ec.feeds.toFixed(1)} vs MC ${mc.feeds.mean.toFixed(1)}`);

if (fails) { console.log(`\ndoll regression: ${fails} FAILED`); process.exit(1); }
console.log('\ndoll regression: all passed');
