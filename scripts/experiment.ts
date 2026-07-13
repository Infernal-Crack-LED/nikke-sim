// Hypothesis lab for the sim-vs-real validation investigation.
// Runs the real-sample comps with in-memory-patched overrides and prints
// per-unit sim/real ratios per variant. Not part of the product.
//   npx tsx scripts/experiment.ts
import { readFileSync } from 'node:fs';
import type { DataFile, LevelMultiplier, SimConfig, Element } from '../src/types.js';
import { runSim } from '../src/engine/sim.js';
import { loadOverride } from '../src/skills/overrides-node.js';
import type { OverrideFile } from '../src/skills/index.js';
import {
  prepareTeam,
  type CubesFile,
  type OlLinesFile,
  type SkillLevelData,
  type UnitOptions,
} from '../src/prepare.js';

const data: DataFile = JSON.parse(readFileSync(new URL('../data/characters.json', import.meta.url), 'utf8'));
const mult: LevelMultiplier = JSON.parse(readFileSync(new URL('../data/level-multiplier.json', import.meta.url), 'utf8'));
const cubes: CubesFile = JSON.parse(readFileSync(new URL('../data/cubes.json', import.meta.url), 'utf8'));
const olLines: OlLinesFile = JSON.parse(readFileSync(new URL('../data/ol-lines.json', import.meta.url), 'utf8'));
let skillLevels: SkillLevelData = {};
try {
  skillLevels = JSON.parse(readFileSync(new URL('../data/skill-levels.json', import.meta.url), 'utf8'));
} catch { /* optional */ }

interface Comp {
  name: string;
  slugs: string[];
  boss: Element | null;
  real: Record<string, number>;
}

const COMPS: Comp[] = [
  {
    name: 'T1 wind-weak (boss Iron)',
    slugs: ['anis-star', 'mast-romantic-maid', 'crown', 'scarlet-black-shadow', 'liberalio'],
    boss: 'Iron',
    real: {
      'anis-star': 916_819_928, 'mast-romantic-maid': 149_003_513, crown: 278_575_442,
      'scarlet-black-shadow': 1_964_356_603, liberalio: 1_142_469_032,
    },
  },
  {
    name: 'T3 fire-weak (boss Wind)',
    slugs: ['little-mermaid', 'crown', 'rapi-red-hood', 'mihara-bonding-chain', 'helm'],
    boss: 'Wind',
    real: {
      'little-mermaid': 509_505_044, crown: 215_495_230, 'rapi-red-hood': 985_340_728,
      'mihara-bonding-chain': 915_651_002, helm: 173_187_582,
    },
  },
  {
    name: 'T4 water-weak (boss Fire)',
    slugs: ['anis-star', 'crown', 'snow-white-heavy-arms', 'privaty', 'helm'],
    boss: 'Fire',
    real: {
      'anis-star': 1_128_483_012, crown: 373_216_848, 'snow-white-heavy-arms': 1_837_128_591,
      privaty: 1_104_217_650, helm: 374_735_080,
    },
  },
  {
    name: 'T2 elec-weak (boss Water)',
    slugs: ['anis-star', 'crown', 'neon-vision-eye', 'cinderella', 'maiden-ice-rose'],
    boss: 'Water',
    real: {
      'anis-star': 984_995_678, crown: 195_539_778, 'neon-vision-eye': 1_474_983_283,
      cinderella: 1_368_483_883, 'maiden-ice-rose': 251_154_035,
    },
  },
  {
    name: 'T5 wind-weak probe (boss Iron)',
    slugs: ['nayuta', 'cinderella-crystal-wave', 'anis-star', 'liberalio', 'velvet'],
    boss: 'Iron',
    real: {
      nayuta: 891_842_251, 'cinderella-crystal-wave': 1_189_732_641, 'anis-star': 721_912_265,
      liberalio: 1_042_219_930, velvet: 188_915_506,
    },
  },
  {
    name: 'T6 neutral (no advantage)',
    slugs: ['crown', 'rapi-red-hood', 'little-mermaid', 'snow-white-heavy-arms', 'helm'],
    boss: null,
    real: {
      crown: 221_080_065, 'rapi-red-hood': 1_024_779_898, 'little-mermaid': 499_756_023,
      'snow-white-heavy-arms': 1_147_472_116, helm: 186_659_650,
    },
  },
  {
    name: 'T7 elec-weak probe (boss Water)',
    slugs: ['crown', 'rapi-red-hood', 'anis-star', 'cinderella', 'mast-romantic-maid'],
    boss: 'Water',
    real: {
      crown: 290_250_898, 'rapi-red-hood': 1_150_852_812, 'anis-star': 873_986_132,
      cinderella: 1_278_372_685, 'mast-romantic-maid': 130_547_286,
    },
  },
];

// deep-clone an override and let the variant mutate it; return undefined = drop unit's override
type Patch = Record<string, (o: OverrideFile) => OverrideFile>;

function run(comp: Comp, patch: Patch = {}) {
  const chars = comp.slugs.map((s) => data.characters[s]);
  const overrides: Record<string, OverrideFile | undefined> = {};
  for (const s of comp.slugs) {
    const base = loadOverride(s);
    overrides[s] = base && patch[s] ? patch[s](JSON.parse(JSON.stringify(base))) : base;
  }
  const unitOpts: UnitOptions[] = comp.slugs.map((slug) => ({
    doll: DOLL,
    ol: 0,
  }));
  const cfg: SimConfig = {
    slugs: comp.slugs, bossElement: comp.boss, bossDef: 0, level: 400, copies: 10,
    doll: false, ol: 0, coreHitRate: 1, rangeBonus: true, durationSec: 180,
  };
  const prepared = prepareTeam(chars, unitOpts, { overrides, skillLevels, cubes, olLines });
  return runSim(chars, mult, cfg, prepared);
}

function report(comp: Comp, label: string, patch: Patch = {}) {
  const res = run(comp, patch);
  console.log(`\n--- ${comp.name} · ${label} ---`);
  for (const u of res.units) {
    const real = comp.real[u.slug];
    const total = u.totalDamage;
    const m = (n: number) => (n / 1e6).toFixed(0).padStart(6);
    console.log(
      `${u.slug.padEnd(24)} shots ${String(u.pulls).padStart(5)}  n ${m(u.breakdown.normal)}  s ${m(u.breakdown.skill)}  b ${m(u.breakdown.burst)}  tot ${m(total)}M  ratio ${(total / real).toFixed(2)}`
    );
  }
}

const t1 = COMPS[0], t3 = COMPS[1], t4 = COMPS[2];

let DOLL = false;
console.log('===== SCOPE LOCK basis: core 7, no cube, no doll, OL0, 10/10/10 =====');
for (const c of COMPS) report(c, 'scope lock');
