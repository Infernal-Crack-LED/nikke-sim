// W5 steps 2-3: graded board A/B at UNIGEO=off / sg / all (deterministic engine runs),
// with the packet's controls evaluated per trigger:
//  - FB counts identical per comp (rotation-log diff for every comp; first-FB time too)
//  - every non-SG graded unit at UNIGEO=sg moves <= 0.1%
//  - MG/SR/RL units bit-identical in both modes
//  - revert triggers: any graded SG unit's |ratio-1| worsening by >0.03; SG band-ordering
//    inversion is a model-table property (checked in the analysis, not here); non-SG >0.1%
//  - rev-4 unpredicted movers: any |dRatio|>0.01 unit not in the pre-registered table
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

interface Row {
  comp: string;
  slug: string;
  weapon: string;
  off: number;
  sg: number;
  all: number;
  offTot: number;
  sgTot: number;
  allTot: number;
}
const rows: Row[] = [];
const fbInfo: string[] = [];
const rotDiffs: string[] = [];

for (const comp of COMPS) {
  const rOff = runComp(comp, 'off');
  const rSg = runComp(comp, 'sg');
  const rAll = runComp(comp, 'all');
  const fb = `${comp.name}: FB off=${rOff.fullBursts} sg=${rSg.fullBursts} all=${rAll.fullBursts}`;
  fbInfo.push(fb + (rOff.fullBursts === rSg.fullBursts && rOff.fullBursts === rAll.fullBursts ? '' : '  << FB COUNT CHANGED'));
  const logOff = rOff.rotationLog.join('\n');
  if (logOff !== rSg.rotationLog.join('\n')) rotDiffs.push(`${comp.name}: rotation log DIFFERS off vs sg`);
  if (logOff !== rAll.rotationLog.join('\n')) rotDiffs.push(`${comp.name}: rotation log DIFFERS off vs all`);
  for (const u of rOff.units) {
    const real = comp.real[u.slug];
    const uSg = rSg.units.find((x) => x.slug === u.slug)!;
    const uAll = rAll.units.find((x) => x.slug === u.slug)!;
    rows.push({
      comp: comp.name,
      slug: u.slug,
      weapon: data.characters[u.slug].weapon,
      off: u.totalDamage / real,
      sg: uSg.totalDamage / real,
      all: uAll.totalDamage / real,
      offTot: u.totalDamage,
      sgTot: uSg.totalDamage,
      allTot: uAll.totalDamage,
    });
  }
}

console.log('=== per-unit ratio table (deterministic; ratio = sim/real) ===');
console.log('comp | unit | weapon | off | sg | dRatio_sg | all | dRatio_all');
for (const r of rows) {
  const dSg = r.sg - r.off;
  const dAll = r.all - r.off;
  console.log(
    `${r.comp} | ${r.slug} | ${r.weapon} | ${r.off.toFixed(4)} | ${r.sg.toFixed(4)} | ${dSg >= 0 ? '+' : ''}${dSg.toFixed(4)} | ${r.all.toFixed(4)} | ${dAll >= 0 ? '+' : ''}${dAll.toFixed(4)}`,
  );
}

console.log('\n=== FB counts ===');
for (const l of fbInfo) console.log(l);
console.log(rotDiffs.length ? '\nrotation-log diffs:\n' + rotDiffs.join('\n') : '\nrotation logs byte-identical across modes for every comp');

console.log('\n=== controls / triggers ===');
const nonSgMoved = rows.filter((r) => r.weapon !== 'SG' && Math.abs(r.sg / r.off - 1) > 0.001);
console.log(`non-SG units moving >0.1% at UNIGEO=sg: ${nonSgMoved.length ? nonSgMoved.map((r) => `${r.comp}/${r.slug} ${(100 * (r.sg / r.off - 1)).toFixed(2)}%`).join('; ') : 'NONE'}`);
const heavyBit = rows.filter((r) => ['MG', 'SR', 'RL'].includes(r.weapon) && (r.sgTot !== r.offTot || r.allTot !== r.offTot));
console.log(`MG/SR/RL units NOT bit-identical: ${heavyBit.length ? heavyBit.map((r) => `${r.comp}/${r.slug}`).join('; ') : 'NONE (bit-identical in both modes)'}`);
const worsenedSg = rows.filter((r) => r.weapon === 'SG' && Math.abs(r.sg - 1) - Math.abs(r.off - 1) > 0.03);
console.log(`revert trigger - graded SG unit |ratio-1| worsens >0.03 at sg: ${worsenedSg.length ? worsenedSg.map((r) => `${r.comp}/${r.slug} ${Math.abs(r.off - 1).toFixed(3)}->${Math.abs(r.sg - 1).toFixed(3)}`).join('; ') : 'NONE'}`);
const worsenedAll = rows.filter((r) => (r.weapon === 'AR' || r.weapon === 'SMG') && Math.abs(r.all - 1) - Math.abs(r.sg - 1) > 0.03);
console.log(`revert trigger - graded AR/SMG unit |ratio-1| worsens >0.03 at all (vs sg): ${worsenedAll.length ? worsenedAll.map((r) => `${r.comp}/${r.slug} ${Math.abs(r.sg - 1).toFixed(3)}->${Math.abs(r.all - 1).toFixed(3)}`).join('; ') : 'NONE'}`);
