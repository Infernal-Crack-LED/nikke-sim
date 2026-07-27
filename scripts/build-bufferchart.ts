// Precompute the buffer ranking boards into web/public/bufferchart.json.
// Two boards per unit: 'generic' (plain MG+RL carries) and 'typed' (carries
// adapt to the buffer's kit, auto-derived from its override). See
// src/ranks/buffer.ts for the methodology. BUILD OUTPUT — gitignored, not in
// verify.sh.
//
//   npx tsx scripts/build-bufferchart.ts [--out <path>]
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
import {
  rankBuffers,
  COMP_PROFILES,
  type BufferValue,
} from '../src/ranks/buffer.js';
import type { RanksCtx } from '../src/ranks/burstgen.js';

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
const tags = load<{ tags: Record<string, string[]> }>(
  '../data/archetype-tags.json'
).tags;

const overrides: Record<string, OverrideFile | undefined> = {};
for (const slug of Object.keys(data.characters))
  {overrides[slug] = loadOverride(slug);}

const deps: PrepareDeps = { overrides, skillLevels, cubes, olLines };
const ctx: RanksCtx = { characters: data.characters as any, mult, deps };

// Population: every sim-supported B1/B2 (the support roster), plus B3s tagged
// `buffer` (B3 supports). Λ excluded (red-hood is a carry).
const population: string[] = [];
for (const [slug, c] of Object.entries(data.characters)) {
  if (!c.simSupported) {continue;}
  if (c.burst === 'I' || c.burst === 'II') {population.push(slug);}
  else if (c.burst === 'III' && (tags[slug] ?? []).includes('buffer'))
    {population.push(slug);}
}
population.sort();

const boards = {
  generic: rankBuffers(population, 'generic', ctx),
  typed: rankBuffers(population, 'typed', ctx),
};

const pack = (ranked: BufferValue[]): Record<string, unknown>[] =>
  // fixed arity 5: [slug, addedDps, carryDps, rules, profile] — profile null = plain run
  ranked.map(
    (r) =>
      [
        r.slug,
        Math.round(r.value),
        Math.round(r.carryDps),
        r.rules,
        r.profile,
      ] as unknown as Record<string, unknown>
  );

const artifact = {
  generatedAt: new Date().toISOString(),
  methodology:
    'Added carry DPS: two standard carries (synthetic class-modal MG + RL, ' +
    'Attacker scope-lock stats, both elementally advantaged) simmed 180s with ' +
    'the tested buffer vs a stage-matched no-op baseline. B3 buffers sit ' +
    'rightmost and never burst. generic: plain MG+RL carries — only ' +
    'requirement-free buffs counted. typed: carries adapt to the kit ' +
    "(auto-derived from the override: weapon-typed targets swap both carries' " +
    'weapon, pierce buffs grant both carries Pierce, projectile-explosion ' +
    "buffs make both RL, element-typed targets set both carries' element). " +
    "The buffer's own damage is not counted; rotation value (gauge/CDR) is " +
    'captured. Defensive/sustain kits read ~0 (scope-lock boss deals no damage).',
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
    })
  ),
  profiles: Object.fromEntries(
    Object.values(COMP_PROFILES).map((p) => [p.id, p.note])
  ),
  cells: { generic: pack(boards.generic), typed: pack(boards.typed) },
};

const outArg = process.argv.indexOf('--out');
const out =
  outArg >= 0
    ? process.argv[outArg + 1]
    : new URL('../web/public/bufferchart.json', import.meta.url).pathname;
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(artifact));
const top = (b: BufferValue[]) =>
  b
    .slice(0, 10)
    .map((r) => `  #${r.rank} ${r.slug} +${(r.value / 1e6).toFixed(2)}M dps`)
    .join('\n');
process.stderr.write(
  `bufferchart: ${population.length} units × 2 boards → ${out}\nGENERIC:\n${top(boards.generic)}\nTYPED:\n${top(boards.typed)}\n`
);
