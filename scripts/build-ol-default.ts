// Precompute the default 8/12 OL roll results into web/public/ol-default.json.
// Runs monteCarloBuild with the default target (4 pieces × [Elem T11, ATK T11])
// and writes a lean artifact the bakery-bot /ol command fetches.
//
//   npx tsx scripts/build-ol-default.ts [--out <path>]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { OlProbModel, Target } from '../src/overload/model.js';
import { monteCarloBuild } from '../src/overload/policy.js';

const model = JSON.parse(
  readFileSync(
    new URL('../data/ol-probabilities.json', import.meta.url),
    'utf8',
  ),
) as OlProbModel;

// Default 8/12: 4 pieces, each targeting Elem DMG T11 + ATK T11.
const target: Target = [
  { key: 'elem', minTier: 11 },
  { key: 'atk', minTier: 11 },
];
const targets = [target, target, target, target];

const result = monteCarloBuild(model, targets, {
  trials: 20_000,
  seed: 0x1234abcd,
});

const fmt = (s: {
  ops: { mean: number; pctiles: Record<string, number> };
  phase1Rerolls: { mean: number };
  phase2Resets: { mean: number };
  moduleCostPerm: { mean: number; p95: number };
}) => ({
  expRolls: Math.round(s.ops.mean * 10) / 10,
  p50: s.ops.pctiles['p50'],
  p95: s.ops.pctiles['p95'],
  phase1: Math.round(s.phase1Rerolls.mean * 10) / 10,
  phase2: Math.round(s.phase2Resets.mean * 10) / 10,
  modules: Math.round(s.moduleCostPerm.mean),
  modulesP95: s.moduleCostPerm.p95,
});

const artifact = {
  generatedAt: new Date().toISOString(),
  config: { lines: ['Elem DMG T11', 'ATK T11'], pieces: 4, trials: 20_000 },
  perPiece: result.perPiece.map(fmt),
  total: fmt(result.total),
};

const outArg = process.argv.indexOf('--out');
const out =
  outArg >= 0
    ? process.argv[outArg + 1]
    : new URL('../web/public/ol-default.json', import.meta.url).pathname;
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(artifact, null, 2));
process.stderr.write(`ol-default: 4 pieces × [Elem T11, ATK T11] → ${out}\n`);
