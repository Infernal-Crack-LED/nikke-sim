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
import { scopeLockCfg } from './lib/scope-lock.js';

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
  focus?: string; // camera-focused unit in the recorded run (gauge v4 focus bonus)
  real: Record<string, number>;
}

export const COMPS: Comp[] = [
  {
    name: 'T1 wind-weak (boss Iron)',
    // slot order corrected 2026-07-13 from docs/probes/"712 probes"/wind weak 2.jpeg
    slugs: ['mast-romantic-maid', 'scarlet-black-shadow', 'anis-star', 'liberalio', 'crown'],
    boss: 'Iron',
    real: {
      'anis-star': 916_819_928, 'mast-romantic-maid': 149_003_513, crown: 278_575_442,
      'scarlet-black-shadow': 1_964_356_603, liberalio: 1_142_469_032,
    },
  },
  {
    name: 'T3 fire-weak (boss Wind)',
    // slot order corrected 2026-07-13 from docs/probes/"712 probes"/fire weak2.jpeg
    slugs: ['rapi-red-hood', 'mihara-bonding-chain', 'little-mermaid', 'crown', 'helm'],
    boss: 'Wind',
    real: {
      'little-mermaid': 509_505_044, crown: 215_495_230, 'rapi-red-hood': 985_340_728,
      'mihara-bonding-chain': 915_651_002, helm: 173_187_582,
    },
  },
  {
    name: 'T4 water-weak (boss Fire)',
    // slot order corrected 2026-07-13 from docs/probes/"712 probes"/water weak 2.jpeg
    slugs: ['anis-star', 'privaty', 'snow-white-heavy-arms', 'helm', 'crown'],
    boss: 'Fire',
    real: {
      'anis-star': 1_128_483_012, crown: 373_216_848, 'snow-white-heavy-arms': 1_837_128_591,
      privaty: 1_104_217_650, helm: 374_735_080,
    },
  },
  {
    name: 'T4b water-weak REPLICATE (boss Fire)',
    // docs/probes/"712 probes"/water weak.jpeg — same comp as T4, independent run.
    // Repeatability baseline: per-unit deltas vs T4 are 0.5-3.5%.
    slugs: ['anis-star', 'privaty', 'snow-white-heavy-arms', 'helm', 'crown'],
    boss: 'Fire',
    real: {
      'anis-star': 1_118_637_577, crown: 374_945_975, 'snow-white-heavy-arms': 1_807_804_067,
      privaty: 1_143_489_599, helm: 366_703_157,
    },
  },
  {
    name: 'T2 elec-weak (boss Water)',
    // slot order corrected 2026-07-13 from docs/probes/"712 probes"/elec weak2.jpeg
    slugs: ['crown', 'neon-vision-eye', 'anis-star', 'cinderella', 'maiden-ice-rose'],
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
    name: 'T6 fire-weak (boss Wind)',
    // 2026-07-13: originally scored as neutral, but the user's screenshot archive names this
    // run "fire weak" (docs/probes/"712 probes"/fire weak.jpeg) — boss is Wind, rapi-RH has
    // elemental advantage.
    slugs: ['crown', 'rapi-red-hood', 'little-mermaid', 'snow-white-heavy-arms', 'helm'],
    boss: 'Wind',
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
    name: 'T8 iron-weak (boss Electric)',
    // NEW 2026-07-13 from docs/probes/"712 probes"/iron weak.jpeg — cindy-CW with advantage,
    // rapi-RH neutral.
    slugs: ['anis-star', 'crown', 'rapi-red-hood', 'cinderella-crystal-wave', 'helm'],
    boss: 'Electric',
    real: {
      'anis-star': 739_756_176, crown: 278_690_692, 'rapi-red-hood': 1_196_668_085,
      'cinderella-crystal-wave': 1_353_394_431, helm: 213_434_318,
    },
  },
  {
    name: 'PA MiKa (boss Iron)',
    slugs: ['anis-star', 'mint', 'prika', 'alice', 'red-hood'],
    boss: 'Iron',
    // mode-string fix 2026-07-14: mint's duet mode is named 'duet (w/ Prika)' in her
    // override — the old 'duet (w/ Mint)' string didn't match and silently ran her SOLO
    // (halved duet buffs team-wide)
    modes: { mint: 'duet (w/ Prika)', prika: 'duet (w/ Mint)' },
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
    name: 'PB2 elec battery RERUN w/ video (boss Water)',
    // U8 ground truth 2026-07-13: docs/probes/u8 — slot order changed, full video.
    // Measured from video: 11 FBs at ~17s rotation (sim was already right); neon = 5 burst
    // casts, Supers on casts 1 & 4 (sim everyN model exact); FB1 B3 = cinderella.
    slugs: ['moran', 'cinderella', 'neon-vision-eye', 'trina'],
    boss: 'Water',
    focus: 'cinderella', // tb2 test 1 recording (the source of these totals)
    real: { moran: 220_607_028, cinderella: 593_914_529, 'neon-vision-eye': 510_593_652, trina: 51_538_522 },
  },
  {
    name: 'TB2T2 anis-star projExpl probe (boss Water)',
    // Test battery 2 test 2 (2026-07-13, docs/probes/tb2): 3-unit team isolating whether
    // anis-star's Projectile Explosion aura buffs cinderella's plain RL normals. Trina is
    // the B2 because none of her offensive buffs reach cindy (Electric AR only).
    // ROTATION OUTLIER (user ruling): a team without at least B1+B2+2xB3 never exists in
    // real play — its expiry-dominated rotation is excluded from rotation-model grading
    // (the comp stays for its damage-popup evidence).
    slugs: ['anis-star', 'trina', 'cinderella'],
    boss: 'Water',
    focus: 'cinderella', // tb2 test 2 recording
    real: { 'anis-star': 243_809_717, trina: 56_966_844, cinderella: 555_079_049 },
  },
  {
    name: 'PE2 elec DPS RERUN w/ video (boss Water)',
    // U8 ground truth 2026-07-13: docs/probes/u8 e — slot order changed, full video.
    slugs: ['crown', 'ein', 'ada', 'rouge', 'cinderella'],
    boss: 'Water',
    real: { crown: 141_588_867, ein: 538_193_097, ada: 464_034_086, rouge: 114_959_491, cinderella: 397_989_804 },
  },
  {
    name: 'PI2 misc B3s RERUN w/ video (boss Water)',
    // U8 ground truth 2026-07-13: docs/probes/u8 i — 13 FBs at ~14.1s measured.
    slugs: ['grave', 'anis-star', 'jill', 'chisato', 'noir'],
    boss: 'Water',
    real: { grave: 286_237_418, 'anis-star': 599_378_674, jill: 534_623_166, chisato: 481_741_106, noir: 163_055_320 },
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

  // ── 714 noon probe (docs/probes/"714 noon") — 9 testing-request teams, full team
  // recordings + damage screenshots, 2026-07-14. Focus defaulted to the middle slot
  // (slot 3) pending video confirmation. Boss element from each team's advantage tag.
  {
    name: 'N1 rapi/quency wind (boss Wind)',
    slugs: ['d-killer-wife', 'grave', 'rapi-red-hood', 'quency-escape-queen', 'jill'],
    boss: 'Wind',
    focus: 'rapi-red-hood',
    real: { 'd-killer-wife': 85_846_395, grave: 232_359_600, 'rapi-red-hood': 566_887_364, 'quency-escape-queen': 376_177_188, jill: 248_360_256 },
  },
  {
    name: 'N2 modernia wind (boss Wind)',
    slugs: ['d-killer-wife', 'naga', 'modernia', 'chisato', 'ein'],
    boss: 'Wind',
    focus: 'modernia',
    modes: { naga: 'no shielder' },
    real: { 'd-killer-wife': 59_028_536, naga: 67_268_906, modernia: 285_422_521, chisato: 273_624_248, ein: 121_442_400 },
  },
  {
    name: 'N3 scarlet/liberalio iron (boss Iron)',
    slugs: ['rouge', 'trina', 'scarlet-black-shadow', 'liberalio', 'soda-twinkling-bunny'],
    boss: 'Iron',
    focus: 'scarlet-black-shadow',
    real: { rouge: 51_261_007, trina: 41_511_140, 'scarlet-black-shadow': 446_499_359, liberalio: 532_559_013, 'soda-twinkling-bunny': 136_670_428 },
  },
  {
    name: 'N5 snowwhite-HA fire (boss Fire)',
    slugs: ['anis-star', 'arcana-fortune-mate', 'privaty', 'snow-white-heavy-arms', 'diesel-winter-sweets'],
    boss: 'Fire',
    focus: 'privaty',
    real: { 'anis-star': 473_775_508, 'arcana-fortune-mate': 247_712_807, privaty: 527_936_633, 'snow-white-heavy-arms': 992_606_850, 'diesel-winter-sweets': 353_872_740 },
  },
  {
    name: 'N6 mihara/maiden wind (boss Wind)',
    slugs: ['little-mermaid', 'ade-agent-bunny', 'mihara-bonding-chain', 'maiden-ice-rose', 'maxwell'],
    boss: 'Wind',
    focus: 'mihara-bonding-chain',
    real: { 'little-mermaid': 227_940_860, 'ade-agent-bunny': 97_938_869, 'mihara-bonding-chain': 715_829_334, 'maiden-ice-rose': 423_813_138, maxwell: 94_804_986 },
  },
  {
    name: 'N9 redhood/elegg electric (boss Electric)',
    slugs: ['moran', 'crown', 'red-hood', 'elegg-boom-and-shock', 'dorothy-serendipity'],
    boss: 'Electric',
    focus: 'red-hood',
    real: { moran: 233_850_467, crown: 180_136_219, 'red-hood': 484_593_983, 'elegg-boom-and-shock': 398_602_210, 'dorothy-serendipity': 328_194_874 },
  },
];

// deep-clone an override and let the variant mutate it; return undefined = drop unit's override
type Patch = Record<string, (o: OverrideFile) => OverrideFile>;

function run(comp: Comp, patch: Patch = {}, seed?: number) {
  const chars = comp.slugs.map((s) => data.characters[s]);
  const overrides: Record<string, OverrideFile | undefined> = {};
  for (const s of comp.slugs) {
    const base = loadOverride(s);
    overrides[s] = base && patch[s] ? patch[s](JSON.parse(JSON.stringify(base))) : base;
  }
  const unitOpts: UnitOptions[] = comp.slugs.map((slug) => ({
    doll: DOLL,
    ol: 'base5',
    mode: comp.modes?.[slug],
    lambdaStage: comp.lambda?.[slug],
  }));
  const cfg = scopeLockCfg(comp.slugs, comp.boss, { focusSlug: comp.focus, seed });
  const prepared = prepareTeam(chars, unitOpts, { overrides, skillLevels, cubes, olLines });
  return runSim(chars, mult, cfg, prepared);
}

function report(comp: Comp, label: string, patch: Patch = {}) {
  // SEEDS=N: Monte Carlo — N seeded runs (common seed set across comps and across
  // A/B configs, so paired comparisons cancel the variance), reported as mean ± sd.
  // Crit/core rolls + boss-movement jitter + chain-gap jitter are sampled per seed;
  // judge a single real run against ±(sd + ~3% real repeatability).
  const nSeeds = Number(process.env.SEEDS ?? 0);
  if (nSeeds > 1) {
    const totals = new Map<string, number[]>();
    let pulls = new Map<string, number>();
    const fbCounts: number[] = [];
    const firstFb: number[] = [];
    for (let i = 0; i < nSeeds; i++) {
      const res = run(comp, patch, 1000 + i);
      fbCounts.push(res.fullBursts);
      const fb1 = res.rotationLog.find((l) => l.includes('FULL BURST'));
      if (fb1) firstFb.push(parseFloat(fb1));
      for (const u of res.units) {
        if (!totals.has(u.slug)) totals.set(u.slug, []);
        totals.get(u.slug)!.push(u.totalDamage);
        pulls.set(u.slug, u.pulls);
      }
    }
    console.log(`\n--- ${comp.name} · ${label} · MC n=${nSeeds} ---`);
    {
      // full distribution: knife-edge counts are REAL run-to-run variance (a boss
      // range transition colliding with a burst chain blocks casts ~1s) — when
      // comparing vs a real run, condition on the real run's observed FB count
      // (compare against the seeds in that stratum).
      const dist = new Map<number, number>();
      for (const c of fbCounts) dist.set(c, (dist.get(c) ?? 0) + 1);
      const distStr = [...dist.entries()].sort((a, b) => a[0] - b[0])
        .map(([c, n]) => `${c}x${Math.round((100 * n) / nSeeds)}%`).join(' ');
      console.log(
        `  full bursts: ${distStr}, first FB at ${Math.min(...firstFb).toFixed(1)}-${Math.max(...firstFb).toFixed(1)}s`
      );
    }
    for (const [slug, arr] of totals) {
      const real = comp.real[slug];
      const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
      const sd = Math.sqrt(arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length);
      console.log(
        `${slug.padEnd(24)} shots ${String(pulls.get(slug)).padStart(5)}  tot ${(mean / 1e6).toFixed(0).padStart(6)}M  ratio ${(mean / real).toFixed(3)} ± ${(sd / real).toFixed(3)}  ${mean / real > 1.03 ? 'HOT▲' : mean / real < 0.97 ? 'COLD▼' : 'OK·'}`
      );
    }
    return;
  }
  const res = run(comp, patch);
  console.log(`\n--- ${comp.name} · ${label} ---`);
  {
    const fb1 = res.rotationLog.find((l) => l.includes('FULL BURST'));
    const expired = res.rotationLog.filter((l) => l.includes('EXPIRED')).length;
    console.log(`  full bursts: ${res.fullBursts}, first at ${fb1 ? parseFloat(fb1).toFixed(1) : '-'}s${expired ? `, ${expired} chain expiries` : ''}`);
  }
  // ROT=1 dumps the burst rotation log (debug workflows)
  if (process.env.ROT) for (const line of res.rotationLog) console.log('  ' + line);
  for (const u of res.units) {
    const real = comp.real[u.slug];
    const total = u.totalDamage;
    const m = (n: number) => (n / 1e6).toFixed(0).padStart(6);
    console.log(
      `${u.slug.padEnd(24)} shots ${String(u.pulls).padStart(5)}  n ${m(u.breakdown.normal)}  s ${m(u.breakdown.skill)}  b ${m(u.breakdown.burst)}  tot ${m(total)}M  ratio ${(total / real).toFixed(2)}  ${total / real > 1.03 ? 'HOT▲' : total / real < 0.97 ? 'COLD▼' : 'OK·'}  [ratio=sim/real: >1 HOT/over]`
    );
  }
}

// Only run the full battery when invoked directly (so COMPS can be imported by the
// kit-parse sweep grader without triggering all 27 sims).
const isMain = import.meta.url === `file://${process.argv[1]}`;
const DOLL = false;
if (isMain) {
  console.log('===== SCOPE LOCK basis: core 7, no cube, no doll, OL0, 10/10/10 =====');
  // ONLY=<substring> runs a single comp (debug workflows pair it with DBG_UNIT/DBG_N).
  for (const c of COMPS) {
    if (process.env.ONLY && !c.name.toLowerCase().includes(process.env.ONLY.toLowerCase())) continue;
    report(c, 'scope lock');
  }
}
