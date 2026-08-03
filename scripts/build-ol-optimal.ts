// Precompute each unit's damage-optimal 12/12 remainder OL lines (the 4 lines
// beyond the 4× Elemental DMG + 4× ATK floor), in the SOLO framework — the primary
// B3 ranking basis (owner 2026-07-16). Writes data/ol-optimal.json, a slug → line
// selection table the web's "12/12" Overload pill applies per unit.
//
// The optimizer is the EXHAUSTIVE free-line ranking (src/olconfigs.ts): every size-4
// multiset of the weapon-aware candidate pool is simulated and the best kept. A unit's
// best remaining lines (crit / ammo / charge …) are governed by its own kit, so we
// optimize each unit once in the solo isolation team and reuse the result everywhere.
//
// SEARCH + TIER (owner ruling 2026-08-03): exhaustive, at T11, everywhere. Both halves
// were measured failures of the greedy marginal-gain search this replaced:
//
//   TIER — it optimized at MAX ROLL while every consumer applies the picks at T11 (the
//   web's 12/12 Overload pill; scripts/build-unit-pages.ts ranks its table at T11). Not
//   cosmetic: several candidates are THRESHOLD stats whose winner moves with the tier.
//
//   SEARCH — greedy adds one best line at a time, so it cannot see a stat whose FIRST
//   line is worthless and whose third or fourth wins outright. Charge Speed buys nothing
//   until it crosses a frame boundary; Hit Rate's core-rate curve is convex. Measured at
//   T11 it left a mean 1.35% / max 31.19% on the table across 73 units — `asuka-wille`
//   took 2× Crit DMG + 2× Crit Rate (8.66%) over 3× Max Ammo + 1× Crit Rate (57.91%),
//   because one ammo line gains 1.41% and loses step 1 to Crit Rate's 1.72%.
//
// Exhaustive is also CHEAPER here: the weapon-aware pool is 3 types (MG/Pistol), 4
// (AR/SMG/SG) or 5 (RL/SR), so C(6,4)=15, C(7,4)=35 or
// C(8,4)=70 sims per unit against greedy's ~28, and it is the same call
// scripts/build-unit-pages.ts already makes — so the two artifacts can no longer
// disagree about a unit's best lines. Score any basis with
// `npx tsx scripts/ol-search-compare.ts`. Override the tier with --tier for an A/B.
//
//   npx tsx scripts/build-ol-optimal.ts [--out <path>] [--tier <n>]
import { readFileSync } from 'node:fs';
import { writeJsonArtifact } from '../src/data/json-artifact.js';
import type { DataFile, LevelMultiplier, Element } from '../src/types.js';
import { loadOverride } from '../src/skills/overrides-node.js';
import type { OverrideFile } from '../src/skills/index.js';
import type {
  CubesFile,
  OlLinesFile,
  PrepareDeps,
  SkillLevelData,
} from '../src/prepare.js';
import { rankFreeLineConfigs } from '../src/olconfigs.js';
import { assembleTeam, OL_TIER, type Cell } from '../src/dpschart/matrix.js';
import { NOOP_CHARACTERS } from '../src/dpschart/noop.js';

const load = <T>(rel: string): T =>
  JSON.parse(readFileSync(new URL(rel, import.meta.url), 'utf8')) as T;

const data = load<DataFile>('../data/characters.json');
const mult = load<LevelMultiplier>('../data/level-multiplier.json');
const cubes = load<CubesFile>('../data/cubes.json');
const olLines = load<OlLinesFile>('../data/ol-lines.json');
const olTiers = load<{ tiers: Array<Record<string, number>> }>(
  '../data/ol-tiers.json'
);
let skillLevels: SkillLevelData = {};
try {
  skillLevels = load<SkillLevelData>('../data/skill-levels.json');
} catch {
  /* optional */
}

const overrides: Record<string, OverrideFile | undefined> = {};
for (const slug of Object.keys(data.characters)) {
  overrides[slug] = loadOverride(slug);
}
const deps: PrepareDeps = { overrides, skillLevels, cubes, olLines };

const tierArg = process.argv.indexOf('--tier');
const TIER = tierArg >= 0 ? Number(process.argv[tierArg + 1]) : OL_TIER;
const tierValues = olTiers.tiers.find((t) => t.tier === TIER);
if (!tierValues) {
  throw new Error(`data/ol-tiers.json has no tier ${TIER}`);
}

// Solo isolation, elemental-advantage, full core exposure, 12/12 tier — the same
// probe context the DPS-chart Solo headliners rank under.
const SOLO_CELL: Cell = {
  framework: 'solo',
  eleadv: 'eleweak',
  core: 'c100',
  invest: '12of12',
};

const charFor = (slug: string) =>
  (data.characters as any)[slug] ?? (NOOP_CHARACTERS as any)[slug];

// generatorSupported && simSupported: same eligibility as the DPS chart population
// (build-dpschart.ts) — without a kit override a "damage-optimal" line pick is
// meaningless (no buffs/burst behavior to optimize around).
const eligible = Object.entries(data.characters).filter(
  ([, c]) => c.generatorSupported && c.simSupported
);
const units: Record<string, { type: string; count: number }[]> = {};
let done = 0;
for (const [slug, c] of eligible) {
  const tested = { slug, element: c.element as Element };
  // provisional solo team: tested carries only the 8-line floor; the ranking substitutes
  // the four free lines per candidate loadout.
  const team = assembleTeam(SOLO_CELL, tested);
  const chars = team.slugs.map(charFor);
  const { results } = rankFreeLineConfigs({
    chars,
    mult,
    cfg: team.cfg,
    deps,
    baseOpts: team.unitOpts,
    carryIdx: team.testedIndex,
    topN: 1,
    tierValues,
  });
  // `value` is dropped deliberately: the artifact stores WHICH lines, and each consumer
  // stamps its own tier when it applies them (the web pill at T11).
  units[slug] = results[0].lines.map(({ type, count }) => ({ type, count }));
  done++;
  if (done % 20 === 0) {
    process.stderr.write(`  …${done}/${eligible.length}\n`);
  }
}

const artifact = {
  _comment:
    'Damage-optimal 12/12 remainder OL lines per unit (beyond the 4 elem + 4 atk floor), ' +
    'computed by scripts/build-ol-optimal.ts in the Solo framework by EXHAUSTIVE search ' +
    "at the T11 line values the web's 12/12 Overload pill applies them at. Regenerate " +
    'when kits/overrides/engine change.',
  search: 'exhaustive',
  framework: 'solo',
  tier: TIER,
  units,
};

const outArg = process.argv.indexOf('--out');
const out =
  outArg >= 0
    ? process.argv[outArg + 1]
    : new URL('../data/ol-optimal.json', import.meta.url).pathname;
await writeJsonArtifact(out, artifact);
process.stderr.write(
  `ol-optimal: ${Object.keys(units).length} units → ${out}\n`
);
