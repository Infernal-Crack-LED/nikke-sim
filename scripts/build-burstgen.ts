// Precompute the burst-generation ranking board into web/public/burstgen.json
// (vite's publicDir → served at /burstgen.json and copied into dist).
//
// Ranks every sim-supported unit by uncapped total burst gauge generated over a
// 180s solo fight (kit effects included; cfg.disableBursts — see
// src/ranks/burstgen.ts). BUILD OUTPUT — gitignored, not part of verify.sh.
//
//   npx tsx scripts/build-burstgen.ts [--out <path>]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { DataFile, LevelMultiplier, Element } from '../src/types.js';
import { loadOverride } from '../src/skills/overrides-node.js';
import { unitElements } from '../src/elements.js';
import type { OverrideFile } from '../src/skills/index.js';
import type {
  CubesFile,
  OlLinesFile,
  PrepareDeps,
  SkillLevelData,
} from '../src/prepare.js';
import { rankBurstGen, BURSTGEN_PROFILES, type RanksCtx } from '../src/ranks/burstgen.js';

const load = <T>(rel: string): T =>
  JSON.parse(readFileSync(new URL(rel, import.meta.url), 'utf8')) as T;

const data = load<DataFile>('../data/characters.json');
const mult = load<LevelMultiplier>('../data/level-multiplier.json');
const cubes = load<CubesFile>('../data/cubes.json');
const olLines = load<OlLinesFile>('../data/ol-lines.json');
let skillLevels: SkillLevelData = {};
try {
  skillLevels = load<SkillLevelData>('../data/skill-levels.json');
} catch {
  /* optional */
}

const overrides: Record<string, OverrideFile | undefined> = {};
for (const slug of Object.keys(data.characters))
  overrides[slug] = loadOverride(slug);

const deps: PrepareDeps = { overrides, skillLevels, cubes, olLines };
const ctx: RanksCtx = { characters: data.characters as any, mult, deps };

// Population: every sim-supported unit (data-driven, NOT tag-driven — the board
// must catch pure weapon/stat generation monsters the burst-gauge-buffer tag
// misses, e.g. trina/jill/mana).
const population: string[] = [];
for (const [slug, c] of Object.entries(data.characters)) {
  if (!c.simSupported) continue;
  population.push(slug);
}

const ranked = rankBurstGen(population, ctx);

const artifact = {
  generatedAt: new Date().toISOString(),
  methodology:
    'Solo 180s fight, bursts disabled (bar pinned at 100): uncapped total burst ' +
    'gauge generated, kit effects included, camera focus on the tested unit ' +
    '(charge weapons ×2.5). 100 = one full bar. Profiles: little-mermaid runs ' +
    'with two MG partners, cinderella-crystal-wave with one (their fills scale ' +
    'with team ammo burn). Scope-lock loadout (Base-5, 3★/core 7, 10/10/10).',
  units: Object.fromEntries(
    population.map((slug) => {
      const c = data.characters[slug];
      return [
        slug,
        {
          name: c.name,
          element: c.element as Element,
          elements: unitElements(c),
          weapon: c.weapon,
          burst: c.burst,
          imageUrl: c.imageUrl ?? null,
        },
      ];
    }),
  ),
  profiles: Object.fromEntries(
    Object.values(BURSTGEN_PROFILES).map((p) => [p.id, p.note]),
  ),
  entries: ranked.map((r) => [
    r.slug,
    Math.round(r.gaugeTotal * 100) / 100,
    r.profile, // null = plain solo run
  ]),
};

const outArg = process.argv.indexOf('--out');
const out =
  outArg >= 0
    ? process.argv[outArg + 1]
    : new URL('../web/public/burstgen.json', import.meta.url).pathname;
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(artifact));
process.stderr.write(
  `burstgen: ${ranked.length} units ranked → ${out}\n` +
    ranked
      .slice(0, 10)
      .map((r) => `  #${r.rank} ${r.slug} ${r.barsPerFight.toFixed(1)} bars${r.profile ? ` [${r.profile}]` : ''}`)
      .join('\n') +
    '\n',
);
