// OL roll-cost lab. Given a target set of overload lines (key:minTier), simulate
// the optimal reroll-and-lock process and report the distribution of required
// rerolls plus the expected module / temp-lock cost in both lock modes.
//
//   npx tsx scripts/ol-sim.ts elem:11 atk:11            # 2-line target
//   npx tsx scripts/ol-sim.ts elem:13 atk:11 critdmg:11 --trials 50000
//   npx tsx scripts/ol-sim.ts critrate:1 --trials 200000   # single-line (shows analytic check)
//
// Flags: --trials N (default 20000) · --seed S · --fresh (start from a fresh
// overload) · --cap N (roll cap per trial).
import { readFileSync } from 'node:fs';
import type { OlProbModel, OlKey, Target, Piece, Line } from '../src/overload/model.js';
import { ALL_KEYS } from '../src/overload/model.js';
import { monteCarlo, monteCarloBuild, type McSummary } from '../src/overload/policy.js';

const model: OlProbModel = JSON.parse(
  readFileSync(new URL('../data/ol-probabilities.json', import.meta.url), 'utf8'));

const argv = process.argv.slice(2);
const flag = (name: string, def?: string) => {
  const i = argv.indexOf(name);
  return i >= 0 ? (argv[i + 1] ?? '') : def;
};
const hasFlag = (name: string) => argv.includes(name);

function parsePiece(spec: string): Target {
  const t: Target = [];
  for (const part of spec.split(',')) {
    const [key, tierStr] = part.split(':');
    if (!ALL_KEYS.includes(key as OlKey)) { console.error(`unknown line key: ${key}`); process.exit(1); }
    if (t.some((r) => r.key === key)) { console.error(`duplicate key ${key} on one piece`); process.exit(1); }
    t.push({ key: key as OlKey, minTier: tierStr ? parseInt(tierStr, 10) : 1 });
  }
  return t;
}
const label = (t: Target) => t.map((r) => `${r.key}≥T${r.minTier}`).join(' + ') || '(empty)';

// --build mode: one positional per OL piece (card), lines comma-separated.
//   npx tsx scripts/ol-sim.ts --build elem:11,atk:11,critdmg:11 elem:11,atk:11,ammo:11 ...
if (hasFlag('--build')) {
  const trialsB = parseInt(flag('--trials', '20000')!, 10);
  const seedB = parseInt(flag('--seed', '305441741')!, 10);
  const specs = argv.filter((a) => !a.startsWith('--') && !/^\d+$/.test(a));
  const targets = specs.map(parsePiece);
  if (!targets.length || targets.length > 4) { console.error('give 1-4 piece specs'); process.exit(1); }
  const { perPiece, total } = monteCarloBuild(model, targets, { trials: trialsB, seed: seedB });
  console.log(`\n=== OL full-build roll-cost sim · ${targets.length} pieces · ${trialsB.toLocaleString()} trials ===`);
  const row = (name: string, s: McSummary) =>
    console.log(`  ${name.padEnd(9)} ops ${s.ops.mean.toFixed(1).padStart(7)} (P1 ${s.phase1Rerolls.mean.toFixed(1)} + P2 ${s.phase2Resets.mean.toFixed(1)}, p95 ${String(s.ops.pctiles.p95).padStart(5)})   perm ${s.moduleCostPerm.mean.toFixed(0).padStart(5)} mod   temp ${s.moduleCostTemp.mean.toFixed(0).padStart(5)} mod + ${s.tempLocks.mean.toFixed(0).padStart(6)} TL`);
  perPiece.forEach((s, i) => { console.log(`  ── card ${i + 1}: ${label(targets[i])}`); row('', s); });
  console.log(`  ${'─'.repeat(70)}`);
  row('TOTAL', total);
  console.log();
  process.exit(0);
}

const target: Target = [];
for (const a of argv) {
  if (a.startsWith('--')) continue;
  const prev = argv[argv.indexOf(a) - 1];
  if (prev && prev.startsWith('--')) continue; // it's a flag value
  const [key, tierStr] = a.split(':');
  if (!ALL_KEYS.includes(key as OlKey)) { console.error(`unknown line key: ${key} (valid: ${ALL_KEYS.join(', ')})`); process.exit(1); }
  const minTier = tierStr ? parseInt(tierStr, 10) : 1;
  if (target.some((r) => r.key === key)) { console.error(`duplicate line key ${key} — a piece can't hold the same stat twice`); process.exit(1); }
  target.push({ key: key as OlKey, minTier });
}
if (!target.length) { console.error('usage: npx tsx scripts/ol-sim.ts <key:minTier> [key:minTier ...] [--trials N] [--seed S] [--fresh]'); process.exit(1); }
if (target.length > 3) { console.error('a piece has at most 3 lines'); process.exit(1); }

const trials = parseInt(flag('--trials', '20000')!, 10);
const seed = parseInt(flag('--seed', '305441741')!, 10);
const cap = parseInt(flag('--cap', '100000')!, 10);
const fresh = hasFlag('--fresh');

// --have elem:15,atk:9 → start from a piece you already hold (recalc from current).
let start: Piece | undefined;
const haveSpec = flag('--have');
if (haveSpec) {
  const slots: (Line | null)[] = [null, null, null];
  haveSpec.split(',').forEach((p, i) => {
    const [k, t] = p.split(':');
    if (i < 3 && ALL_KEYS.includes(k as OlKey)) slots[i] = { key: k as OlKey, tier: t ? parseInt(t, 10) : 1 };
  });
  start = slots as Piece;
}

const r = monteCarlo(model, target, { trials, seed, fresh: start ? false : fresh, start, cap });

const tgtLabel = target.map((t) => `${t.key}≥T${t.minTier}`).join(' + ');
console.log(`\n=== OL roll-cost sim · target: ${tgtLabel} · ${trials.toLocaleString()} trials${fresh ? ' · fresh start' : ''} ===`);
if (r.censoredFrac > 0) console.log(`  ⚠ ${(r.censoredFrac * 100).toFixed(2)}% of trials hit the ${cap.toLocaleString()}-roll cap (mean is a lower bound)`);

console.log(`\n  Total operations: mean ${r.ops.mean.toFixed(2)} ± ${r.ops.se.toFixed(2)} (sd ${r.ops.sd.toFixed(1)})`);
console.log(`    phase 1 (stat rerolls) ${r.phase1Rerolls.mean.toFixed(2)}   +   phase 2 (value resets) ${r.phase2Resets.mean.toFixed(2)}`);
console.log(`    median ${r.ops.pctiles.p50}   p80 ${r.ops.pctiles.p80}   p90 ${r.ops.pctiles.p90}   p95 ${r.ops.pctiles.p95}   p99 ${r.ops.pctiles.p99}`);

console.log(`\n  Expected cost:`);
console.log(`    permanent locks : ${r.moduleCostPerm.mean.toFixed(1)} modules`);
console.log(`    temp locks      : ${r.moduleCostTemp.mean.toFixed(1)} modules + ${r.tempLocks.mean.toFixed(0)} temp-locks`);

console.log(`\n  Distribution of required rerolls:`);
const maxCount = Math.max(...r.histogram.map((h) => h.count));
for (const h of r.histogram) {
  const bar = '█'.repeat(Math.round((h.count / maxCount) * 40));
  const range = h.overflow ? `${h.lo}+` : h.lo === h.hi ? `${h.lo}` : `${h.lo}-${h.hi}`;
  console.log(`    ${range.padStart(11)} │ ${bar} ${((h.count / trials) * 100).toFixed(1)}%`);
}

if (r.analytic) {
  const a = r.analytic;
  console.log(`\n  Analytic cross-check (single line, two-phase):`);
  console.log(`    P(key present) ${(a.pKeyPresent * 100).toFixed(2)}%   P(tier≥) ${(a.pTierGE * 100).toFixed(2)}%`);
  console.log(`    expected ops  analytic ${a.expectedOps.toFixed(2)} (P1 ${a.expectedP1.toFixed(2)} + P2 ${a.expectedP2.toFixed(2)})   vs   MC ${r.ops.mean.toFixed(2)}`);
  console.log(`    (${a.note})`);
}
console.log();
