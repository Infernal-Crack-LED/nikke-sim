// Precompute the burst-CDR ranking board into web/public/burstcdr.json.
// Population: exactly the `burst-cdr`-tagged units (owner rule). Static table +
// solo-cadence runs for the four shot-triggered rows (src/ranks/burstcdr.ts).
// BUILD OUTPUT — gitignored, not part of verify.sh.
//
//   npx tsx scripts/build-burstcdr.ts [--out <path>]
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
import { CDR_TABLE, rankCdr, FB_CYCLE_SEC } from '../src/ranks/burstcdr.js';
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
const tags = load<{ tags: Record<string, string[]> }>('../data/archetype-tags.json').tags;

const overrides: Record<string, OverrideFile | undefined> = {};
for (const slug of Object.keys(data.characters))
  overrides[slug] = loadOverride(slug);

const deps: PrepareDeps = { overrides, skillLevels, cubes, olLines };
const ctx: RanksCtx = { characters: data.characters as any, mult, deps };

// Population: exactly the burst-cdr-tagged slugs, and every one must have a
// curated row (a tag without a row is a table bug — fail loudly).
const population = Object.keys(tags).filter((s) => tags[s].includes('burst-cdr'));
for (const slug of population) {
  if (!CDR_TABLE[slug]) throw new Error(`${slug}: burst-cdr tagged but missing from CDR_TABLE`);
}
for (const slug of Object.keys(CDR_TABLE)) {
  if (!population.includes(slug)) throw new Error(`${slug}: in CDR_TABLE but not burst-cdr tagged`);
}

const ranked = rankCdr(population, ctx);

const artifact = {
  generatedAt: new Date().toISOString(),
  methodology:
    `Nominal team Burst Skill cooldown reduction (seconds) per 40s of fight. ` +
    `Full-Burst-triggered CDR counted at a standard ${FB_CYCLE_SEC}s full-burst cycle ` +
    `(2 procs per 40s); escalating ladders ranked at their capped value with the ` +
    `ramp shown. Shot-triggered CDR (dorothy, d-killer-wife, rouge, milk) uses the ` +
    `unit's own sim cadence. Nominal, not effective: CDR landing on a target ` +
    `already off cooldown is wasted in real rotations. Conditional lines are ` +
    `noted, not deducted. Self-only CDR is a note column.`,
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
  entries: ranked.map((e) => [
    e.slug,
    Math.round(e.cdrPer40s * 100) / 100,
    ...(e.ramp ? [e.ramp.map((v) => Math.round(v * 100) / 100)] : [null]),
    e.condition ?? null,
    e.selfCdr ?? null,
    null, // profile — no profiles on this board (uniform row shape)
  ]),
  profiles: {}, // no comp profiles on this board (uniform artifact shape)
};

const outArg = process.argv.indexOf('--out');
const out =
  outArg >= 0
    ? process.argv[outArg + 1]
    : new URL('../web/public/burstcdr.json', import.meta.url).pathname;
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(artifact));
process.stderr.write(
  `burstcdr: ${ranked.length} units ranked → ${out}\n` +
    ranked.map((e) => `  #${e.rank} ${e.slug} ${e.cdrPer40s.toFixed(2)}s/40s${e.condition ? ' *' : ''}`).join('\n') +
    '\n',
);
