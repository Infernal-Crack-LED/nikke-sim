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
  modes?: Record<string, string>;
  lambda?: Record<string, 1 | 2 | 3>;
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
  {
    name: 'PA MiKa (boss Iron)',
    slugs: ['anis-star', 'mint', 'prika', 'alice', 'red-hood'],
    boss: 'Iron',
    modes: { mint: 'duet (w/ Mint)', prika: 'duet (w/ Mint)' },
    lambda: { 'red-hood': 3 },
    real: { 'anis-star': 794_599_189, mint: 200_098_310, prika: 167_821_197, alice: 403_927_220, 'red-hood': 853_335_540 },
  },
  {
    name: 'PB elec battery (boss Water)',
    slugs: ['moran', 'trina', 'cinderella', 'neon-vision-eye'],
    boss: 'Water',
    real: { moran: 222_265_637, trina: 50_865_273, cinderella: 582_734_714, 'neon-vision-eye': 467_167_997 },
  },
  {
    name: 'PC shields (boss Fire)',
    slugs: ['tia', 'anis-star', 'naga', 'snow-white-heavy-arms', 'helm'],
    boss: 'Fire',
    modes: { naga: 'with shielder' },
    real: { tia: 159_872_551, 'anis-star': 779_423_317, naga: 174_159_371, 'snow-white-heavy-arms': 1_320_261_601, helm: 651_956_107 },
  },
  {
    name: 'PD Eva duo (boss Wind)',
    slugs: ['emma-tactical-upgrade', 'eunhwa-tactical-upgrade', 'diesel-winter-sweets', 'helm'],
    boss: 'Wind',
    modes: { 'emma-tactical-upgrade': 'duo (w/ Eunhwa:TU)', 'eunhwa-tactical-upgrade': 'duo (w/ Emma:TU)' },
    real: { 'emma-tactical-upgrade': 138_646_718, 'eunhwa-tactical-upgrade': 303_333_340, 'diesel-winter-sweets': 547_126_157, helm: 272_995_802 },
  },
  {
    name: 'PE elec DPS (boss Water)',
    slugs: ['rouge', 'crown', 'ein', 'ada', 'cinderella'],
    boss: 'Water',
    real: { rouge: 106_697_867, crown: 147_601_675, ein: 560_265_791, ada: 460_220_219, cinderella: 342_564_640 },
  },
  {
    name: 'PF maiden solo (boss Water)',
    slugs: ['maiden-ice-rose'],
    boss: 'Water',
    real: { 'maiden-ice-rose': 76_562_316 },
  },
  {
    name: 'PG iron sweep (boss Electric)',
    slugs: ['d-killer-wife', 'takina', 'milk-blooming-bunny', 'maxwell', 'liberalio'],
    boss: 'Electric',
    real: { 'd-killer-wife': 57_763_039, takina: 427_401_745, 'milk-blooming-bunny': 391_185_987, maxwell: 126_550_353, liberalio: 484_567_921 },
  },
  {
    name: 'PH water B3s (boss Fire)',
    slugs: ['little-mermaid', 'crown', 'quency-escape-queen', 'dorothy-serendipity', 'guillotine-winter-slayer'],
    boss: 'Fire',
    real: { 'little-mermaid': 341_555_086, crown: 161_315_337, 'quency-escape-queen': 594_108_107, 'dorothy-serendipity': 766_349_052, 'guillotine-winter-slayer': 273_898_861 },
  },
  {
    name: 'PI misc B3s (boss Water)',
    slugs: ['anis-star', 'grave', 'chisato', 'jill', 'noir'],
    boss: 'Water',
    real: { 'anis-star': 602_820_156, grave: 288_074_223, chisato: 492_040_764, jill: 518_351_294, noir: 160_557_828 },
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
    mode: comp.modes?.[slug],
    lambdaStage: comp.lambda?.[slug],
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
