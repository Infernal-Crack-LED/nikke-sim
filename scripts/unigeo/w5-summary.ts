// W5 addendum: board summary stats (mean |ratio-1| off/sg/all) + a rotation-log
// characterization for one SG comp (soda-tb control) - first divergent lines.
import { readFileSync } from 'node:fs';
import type { DataFile, LevelMultiplier } from '../../src/types.js';
import { runSim } from '../../src/engine/sim.js';
import { loadOverride } from '../../src/skills/overrides-node.js';
import {
  prepareTeam,
  type CubesFile,
  type OlLinesFile,
  type SkillLevelData,
  type UnitOptions,
} from '../../src/prepare.js';
import { scopeLockCfg } from '../lib/scope-lock.js';
import { COMPS } from '../experiment.js';

const data: DataFile = JSON.parse(readFileSync(new URL('../../data/characters.json', import.meta.url), 'utf8'));
const mult: LevelMultiplier = JSON.parse(readFileSync(new URL('../../data/level-multiplier.json', import.meta.url), 'utf8'));
const cubes: CubesFile = JSON.parse(readFileSync(new URL('../../data/cubes.json', import.meta.url), 'utf8'));
const olLines: OlLinesFile = JSON.parse(readFileSync(new URL('../../data/ol-lines.json', import.meta.url), 'utf8'));
let skillLevels: SkillLevelData = {};
try {
  skillLevels = JSON.parse(readFileSync(new URL('../../data/skill-levels.json', import.meta.url), 'utf8'));
} catch { /* optional */ }

function runComp(comp: (typeof COMPS)[number], mode: string) {
  process.env.UNIGEO = mode === 'off' ? '' : mode;
  const chars = comp.slugs.map((s) => data.characters[s]);
  const overrides: Record<string, ReturnType<typeof loadOverride>> = {};
  for (const s of comp.slugs) overrides[s] = loadOverride(s);
  const unitOpts: UnitOptions[] = comp.slugs.map((slug) => ({
    doll: false,
    ol: 'base5',
    mode: comp.modes?.[slug],
    lambdaStage: comp.lambda?.[slug],
  }));
  const cfg = scopeLockCfg(comp.slugs, comp.boss, { focusSlug: comp.focus });
  const prepared = prepareTeam(chars, unitOpts, { overrides, skillLevels, cubes, olLines });
  return runSim(chars, mult, cfg, prepared);
}

const errs: Record<string, number[]> = { off: [], sg: [], all: [] };
const errsSg: Record<string, number[]> = { off: [], sg: [], all: [] };
for (const comp of COMPS) {
  for (const mode of ['off', 'sg', 'all'] as const) {
    const res = runComp(comp, mode);
    for (const u of res.units) {
      const e = Math.abs(u.totalDamage / comp.real[u.slug] - 1);
      errs[mode].push(e);
      if (data.characters[u.slug].weapon === 'SG') errsSg[mode].push(e);
    }
  }
}
for (const mode of ['off', 'sg', 'all'] as const) {
  const m = errs[mode].reduce((a, b) => a + b, 0) / errs[mode].length;
  const ms = errsSg[mode].reduce((a, b) => a + b, 0) / errsSg[mode].length;
  const within3 = errs[mode].filter((e) => e <= 0.03).length;
  console.log(
    `${mode.padEnd(4)}: board mean|ratio-1| ${m.toFixed(4)} (n=${errs[mode].length}, within±3%: ${within3}) | SG units mean ${ms.toFixed(4)} (n=${errsSg[mode].length})`,
  );
}

const comp = COMPS.find((c) => c.name.startsWith('soda-tb control'))!;
const a = runComp(comp, 'off').rotationLog;
const b = runComp(comp, 'sg').rotationLog;
console.log(`\nsoda-tb control rotation log: off ${a.length} lines, sg ${b.length} lines`);
for (let i = 0; i < Math.max(a.length, b.length); i++) {
  if (a[i] !== b[i]) {
    console.log(`first divergence at line ${i}:`);
    for (let j = i; j < Math.min(i + 6, Math.max(a.length, b.length)); j++) {
      console.log(`  off: ${a[j] ?? '-'}`);
      console.log(`  sg : ${b[j] ?? '-'}`);
    }
    break;
  }
}
