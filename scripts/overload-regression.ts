// Deterministic regression gate for the Overload roll-cost engine
// (src/overload/*, data/ol-probabilities.json). Property + invariant asserts —
// no brittle snapshot. Run by scripts/verify.sh.
//   npx tsx scripts/overload-regression.ts
import { readFileSync } from 'node:fs';
import type { OlProbModel, Target } from '../src/overload/model.js';
import { ALL_KEYS } from '../src/overload/model.js';
import { monteCarlo, analyticSingle } from '../src/overload/policy.js';

const model: OlProbModel = JSON.parse(
  readFileSync(new URL('../data/ol-probabilities.json', import.meta.url), 'utf8'));

let fails = 0;
const ok = (name: string, cond: boolean, detail = '') => {
  console.log(cond ? `  ✓ ${name}` : `  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  if (!cond) fails++;
};
const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;

console.log('== overload roll-cost regression ==');

// --- 1. Probability-model invariants (datamined; changing these needs a source) ---
const wSum = ALL_KEYS.reduce((s, k) => s + model.typeWeights[k], 0);
ok('type weights sum to 100', wSum === 100, `got ${wSum}`);
ok('line gates 1 / 0.5 / 0.3',
  model.lineCountGates.slot1 === 1 && model.lineCountGates.slot2 === 0.5 && model.lineCountGates.slot3 === 0.3);
const bandSum = model.tierBands.bands.reduce((s, b) => s + b.p, 0);
ok('tier bands sum to 1.0', near(bandSum, 1, 1e-9), `got ${bandSum}`);
ok('first-overload guarantee is T11', model.firstOverloadGuaranteedTier === 11);
ok('reroll module costs 1/2/3',
  JSON.stringify(model.cost.rerollModulesByLocked) === JSON.stringify([1, 2, 3]));

// --- 2. Closed-form odds (the FAQ numbers) ---
const pT11 = model.tierBands.bands
  .filter((b) => b.hi >= 11)
  .reduce((s, b) => s + b.p * ((b.hi - Math.max(11, b.lo) + 1) / (b.hi - b.lo + 1)), 0);
ok('P(T11+) per line = 5%', near(pT11, 0.05, 1e-9), `got ${(pT11 * 100).toFixed(3)}%`);
const pAll3 = model.lineCountGates.slot1 * model.lineCountGates.slot2 * model.lineCountGates.slot3;
ok('P(all 3 lines in one roll) = 15%', near(pAll3, 0.15, 1e-9), `got ${(pAll3 * 100).toFixed(1)}%`);

// --- 3. Analytic vs Monte Carlo (validates the simulator) ---
const single: Target = [{ key: 'critrate', minTier: 11 }];
const a = analyticSingle(model, single[0]);
const mc = monteCarlo(model, single, { trials: 20000, seed: 12345, fresh: false });
const relErr = Math.abs(a.expectedOps - mc.ops.mean) / a.expectedOps;
ok('single-line analytic ≈ MC (<8%)', relErr < 0.08,
  `analytic ${a.expectedOps.toFixed(2)} vs MC ${mc.ops.mean.toFixed(2)} (${(relErr * 100).toFixed(1)}%)`);

// --- 4. Seeded determinism (reproducibility) ---
const r1 = monteCarlo(model, single, { trials: 4000, seed: 7 }).ops.mean;
const r2 = monteCarlo(model, single, { trials: 4000, seed: 7 }).ops.mean;
ok('seeded MC is deterministic', r1 === r2, `${r1} vs ${r2}`);

// --- 5. Monotonicity sanity ---
const t1 = monteCarlo(model, [{ key: 'atk', minTier: 1 }], { trials: 8000, seed: 3 }).ops.mean;
const t11 = monteCarlo(model, [{ key: 'atk', minTier: 11 }], { trials: 8000, seed: 3 }).ops.mean;
ok('higher tier target costs more (T11 > T1)', t11 > t1, `T11 ${t11.toFixed(1)} vs T1 ${t1.toFixed(1)}`);
const two = monteCarlo(model, [{ key: 'elem', minTier: 11 }, { key: 'atk', minTier: 11 }], { trials: 8000, seed: 3 }).ops.mean;
ok('more target lines cost more (2-line > 1-line)', two > t11, `2-line ${two.toFixed(1)} vs 1-line ${t11.toFixed(1)}`);

if (fails) { console.log(`\noverload regression: ${fails} FAILED`); process.exit(1); }
console.log('\noverload regression: all passed');
