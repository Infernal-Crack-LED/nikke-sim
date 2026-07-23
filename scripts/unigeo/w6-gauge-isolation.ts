// W6 - gauge-decoupling isolation run: localize the rotation drift (incl. the N5 FB
// 11->10) to the SG-landing->gauge coupling vs the geometry itself.
// Arms: off (baseline) | sg coupled (UNIGEO=sg) | sg decoupled (UNIGEO=sg +
// UNIGEO_GAUGE=legacy: damage uses UNIGEO landing, gauge feed = live-engine landing).
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

type Arm = 'off' | 'coupled' | 'decoupled';
function runComp(comp: (typeof COMPS)[number], arm: Arm) {
  process.env.UNIGEO = arm === 'off' ? '' : 'sg';
  process.env.UNIGEO_GAUGE = arm === 'decoupled' ? 'legacy' : '';
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

const sgRows: string[] = [];
const nonSgMovers: string[] = [];
const fbRows: string[] = [];
const rotStillDiffer: string[] = [];

for (const comp of COMPS) {
  const off = runComp(comp, 'off');
  const cpl = runComp(comp, 'coupled');
  const dec = runComp(comp, 'decoupled');
  fbRows.push(
    `${comp.name}: FB off=${off.fullBursts} coupled=${cpl.fullBursts} decoupled=${dec.fullBursts}` +
      (off.fullBursts !== dec.fullBursts ? '  << decoupled DIFFERS from off' : ''),
  );
  if (off.rotationLog.join('\n') !== dec.rotationLog.join('\n'))
    rotStillDiffer.push(comp.name);
  for (const u of off.units) {
    const real = comp.real[u.slug];
    const w = data.characters[u.slug].weapon;
    const uc = cpl.units.find((x) => x.slug === u.slug)!;
    const ud = dec.units.find((x) => x.slug === u.slug)!;
    if (w === 'SG') {
      const rOff = u.totalDamage / real;
      const rC = uc.totalDamage / real;
      const rD = ud.totalDamage / real;
      sgRows.push(
        `${comp.name} / ${u.slug}: off ${rOff.toFixed(4)} | decoupled ${rD.toFixed(4)} (d ${(rD - rOff).toFixed(4)}) | coupled ${rC.toFixed(4)} (d ${(rC - rOff).toFixed(4)}) | rotation-mediated part ${(rC - rD).toFixed(4)}`,
      );
    } else if (Math.abs(ud.totalDamage / u.totalDamage - 1) > 0.001) {
      nonSgMovers.push(`${comp.name}/${u.slug} ${(100 * (ud.totalDamage / u.totalDamage - 1)).toFixed(2)}%`);
    }
  }
}

console.log('=== FB counts (off | coupled sg | decoupled sg) ===');
for (const l of fbRows) console.log(l);
console.log('\n=== rotation logs still differing from off at DECOUPLED sg ===');
console.log(rotStillDiffer.length ? rotStillDiffer.join('\n') : 'NONE - every comp rotation-identical to baseline');
console.log('\n=== non-SG units moving >0.1% at DECOUPLED sg (vs 27 at coupled) ===');
console.log(nonSgMovers.length ? nonSgMovers.join('\n') : 'NONE');
console.log('\n=== graded SG readings: pure landing/core vs rotation-mediated ===');
for (const l of sgRows) console.log(l);
