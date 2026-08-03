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
  DUO_BUFFER_PROFILES,
  EXCLUDED_BUFFER_SLUGS,
  type BufferValue,
} from '../src/ranks/buffer.js';
import type { RanksCtx } from '../src/ranks/burstgen.js';
import type { BufferChartArtifact, BufferRow } from '../src/ranks/types.js';

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
for (const slug of Object.keys(data.characters)) {
  overrides[slug] = loadOverride(slug);
}

const deps: PrepareDeps = { overrides, skillLevels, cubes, olLines };
const ctx: RanksCtx = { characters: data.characters as any, mult, deps };

// EXCLUDED_BUFFER_SLUGS (currently Blanc) never enters the population: the kit
// reduces team damage in the standard comp, so its % increase is misleadingly
// negative and not useful for ranking support value. The artifact keeps every
// other row it computes, negatives included; the leaderboard trims those at
// render time (src/ranks/buffer-rows.ts) so the unit card can still quote a
// unit's own value.
const population: string[] = [];
for (const [slug, c] of Object.entries(data.characters)) {
  if (EXCLUDED_BUFFER_SLUGS.has(slug)) {
    continue;
  }
  if (!c.simSupported) {
    continue;
  }
  if (c.burst === 'I' || c.burst === 'II') {
    population.push(slug);
  } else if (c.burst === 'III' && (tags[slug] ?? []).includes('buffer')) {
    population.push(slug);
  }
}
population.sort();

const boards = {
  generic: rankBuffers(population, 'generic', ctx),
  typed: rankBuffers(population, 'typed', ctx),
};

const pack = (ranked: BufferValue[]): BufferRow[] =>
  // fixed arity 4: [slug, addedPct, rules, profile] — profile null = plain run
  ranked.map((r): BufferRow => [
    r.slug,
    Math.round(r.valuePct * 10) / 10, // one decimal, e.g. 12.3
    r.rules,
    r.profile,
  ]);

const artifact: BufferChartArtifact = {
  generatedAt: new Date().toISOString(),
  methodology:
    'Total % team damage increase: two standard carries (synthetic class-modal ' +
    'MG + RL, Attacker scope-lock stats, both elementally advantaged) are simmed ' +
    '180s with the tested buffer vs a stage-matched no-op baseline. The reported ' +
    'value is (carry DPS with buffer − carry DPS with no-op) / carry DPS with ' +
    'no-op × 100. B3 buffers sit rightmost and never burst. generic: plain ' +
    'MG+RL carries — only requirement-free buffs counted. typed: carries adapt ' +
    'to the kit (auto-derived from the override: weapon-typed targets swap both ' +
    "carries' weapon; pierce buffs grant both carries Pierce; " +
    'projectile-explosion buffs make both RL; element-typed targets and ' +
    'boss-element-gated enemy debuffs set both carries to the advantaged element). ' +
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
  profiles: Object.fromEntries([
    ...Object.values(COMP_PROFILES).map((p) => [p.id, p.note]),
    ...Object.values(DUO_BUFFER_PROFILES).map((p) => [p.id, p.note]),
  ]),
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
    .map((r) => `  #${r.rank} ${r.slug} +${r.valuePct.toFixed(1)}%`)
    .join('\n');
process.stderr.write(
  `bufferchart: ${population.length} units × 2 boards → ${out}\nGENERIC:\n${top(boards.generic)}\nTYPED:\n${top(boards.typed)}\n`
);
