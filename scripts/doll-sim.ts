// Doll leveling cost lab. Solves the exact optimal toolbox policy and reports the
// cheapest way to reach the SR phase-15 target, the launder-vs-raw path decision,
// and the cost distribution.
//   npx tsx scripts/doll-sim.ts                 # full report
//   npx tsx scripts/doll-sim.ts --rarity SR --from 5 --trials 50000
import { readFileSync } from 'node:fs';
import { buildModel, type ToolboxTier } from '../src/doll/model.js';
import { solveDp, monteCarlo, analysePaths, calibrateWeights } from '../src/doll/policy.js';

const economy = JSON.parse(readFileSync(new URL('../data/doll-economy.json', import.meta.url), 'utf8'));
const proc = JSON.parse(readFileSync(new URL('../data/doll-super-success.json', import.meta.url), 'utf8'));
const model = buildModel(economy, proc);

const argv = process.argv.slice(2);
const flag = (n: string, d?: string) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };

// Calibrate kit weights to the throughput objective (level the most SR dolls per box).
const cal = calibrateWeights(model, 'SR');
model.kitWeight = cal.weights;
console.log('\n=== Throughput objective: level as many SR dolls 0→15 per box as possible ===');
console.log(`  Kit supply per box: R ${model.kitSupply.R} / SR ${model.kitSupply.SR} / SSR ${model.kitSupply.SSR}`);
console.log(`  Calibrated shadow prices (R=1): R ${cal.weights.R.toFixed(2)} / SR ${cal.weights.SR.toFixed(2)} / SSR ${cal.weights.SSR.toFixed(2)}`);
console.log(`  MIXED-policy optimum : ${cal.dollsPer1000Mixed.toFixed(1)} SR dolls per 1000 boxes  (uses every kit)`);
{
  const d = cal.dollsPer1000Mixed / 1000;
  console.log(`     per doll ≈ R ${(model.kitSupply.R / d).toFixed(1)} / SR ${(model.kitSupply.SR / d).toFixed(1)} / SSR ${(model.kitSupply.SSR / d).toFixed(1)} kits (all kits used, ratio ${(model.kitSupply.R / model.kitSupply.SSR).toFixed(0)}:${(model.kitSupply.SR / model.kitSupply.SSR).toFixed(0)}:1)`);
}
console.log(`  Best PURE strategy   : ${cal.dollsPer1000Pure.toFixed(1)} SR dolls per 1000 boxes  (bottleneck ${cal.bottleneck}; waste R ${(cal.wasteFrac.R * 100).toFixed(0)}% / SR ${(cal.wasteFrac.SR * 100).toFixed(0)}% / SSR ${(cal.wasteFrac.SSR * 100).toFixed(0)}%)`);
console.log(`  Pure-policy kits/doll: R ${cal.pureConsumption.R.toFixed(1)} / SR ${cal.pureConsumption.SR.toFixed(1)} / SSR ${cal.pureConsumption.SSR.toFixed(1)}`);

const dpR = solveDp(model, 'R');
const dpSR = solveDp(model, 'SR');
const kit = (n: number) => n.toLocaleString();
const policyStr = (dp: typeof dpR) => Array.from({ length: model.maxPhase }, (_, L) => `${L}:${dp.tier[L][0]}`).join(' ');

console.log('\n=== Optimal toolbox policy (tier to feed at each phase, from xp 0) ===');
console.log(`  R doll : ${policyStr(dpR)}`);
console.log(`  SR doll: ${policyStr(dpSR)}`);

const wc = (n: number) => n.toFixed(1); // scarcity-weighted cost, box-opens units
console.log(`\n  Kit usage-weight (box-opens per kit): R ${model.kitWeight.R.toFixed(2)} / SR ${model.kitWeight.SR.toFixed(2)} / SSR ${model.kitWeight.SSR.toFixed(2)}`);
console.log('\n=== Expected kit cost to reach phase 15 (scarcity-weighted, box-opens) ===');
console.log(`  R doll 0→15 : ${wc(dpR.cost[0][0])}`);
console.log(`  SR doll 0→15: ${wc(dpSR.cost[0][0])}`);
console.log(`  SR doll 5→15: ${wc(dpSR.cost[5][0])}`);

const pa = analysePaths(model, dpR, dpSR);
const launderNet = pa.srSavedByLaunder - pa.launderRCost; // net kit-value saved by laundering ONE R doll
console.log('\n=== R-doll decision: level it to 15 (to launder) vs trade 4 of them ===');
console.log(`  (Laundering R15 → SR5 still consumes the SR doll — both paths do — so its only gain vs raw is skipping the SR 0→5 grind.)`);
console.log(`  Cost to level ONE R doll 0→15         : ${wc(pa.launderRCost)} kit-value`);
console.log(`  Laundering it skips the SR 0→5 grind  : saves ${wc(pa.srSavedByLaunder)}  →  NET ${wc(launderNet)} kit-value per R doll`);
console.log(`  Trade 4 R dolls (15% SR doll / 30% 10 SSR / 55% 20 SR): ≈ ${wc(pa.tradeInValuePerRDoll * 4)} kit-value + 0.15 SR doll  (${wc(pa.tradeInValuePerRDoll)}/doll)`);
console.log(`  → Per R doll: launder ≈ +${wc(launderNet)} kit-value  vs  trade ≈ +${wc(pa.tradeInValuePerRDoll)} kit-value. Trading wins on raw value unless you specifically want the SR head-start.`);

const rarity = (flag('--rarity', 'SR') as 'R' | 'SR');
const from = parseInt(flag('--from', rarity === 'SR' ? '5' : '0')!, 10);
const trials = parseInt(flag('--trials', '40000')!, 10);
const mc = monteCarlo(model, rarity === 'R' ? dpR : dpSR, rarity, from, 0, { trials, seed: 20260715 });
console.log(`\n=== Cost distribution · ${rarity} doll ${from}→15 · ${kit(trials)} trials ===`);
console.log(`  weighted kit cost: mean ${wc(mc.cost.mean)} ± ${mc.cost.se.toFixed(2)}  (median ${wc(mc.cost.p50)}, p90 ${wc(mc.cost.p90)})`);
console.log(`  kits fed: ${mc.feeds.mean.toFixed(1)} total  ·  by tier: ${(['R','SR','SSR'] as ToolboxTier[]).map((t) => `${t} ${mc.byTier[t].toFixed(1)}`).join(' / ')}  ·  raw EXP ${kit(Math.round(mc.exp.mean))}`);
console.log();
