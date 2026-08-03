// Blast-radius probe for a change to the synthetic no-op controls (src/dpschart/noop.ts).
//
// The no-ops are the shared basis of the DPS chart's Solo framework and every rank
// board, so a change to their stats can silently move published numbers. This prints the
// tested unit's Solo-framework DPS for the units most likely to notice — the carriers of
// an `alliesTopAtk` / `alliesLowestAtk` selector, whose buff TARGET depends on how the
// no-ops' ATK compares to a real unit's — plus the no-op B3's own damage, which scales
// with its ATK directly.
//
// Run it on both sides of the change and diff:
//   npx tsx scripts/noop-basis-ab.ts > /tmp/after.txt
//   git stash && npx tsx scripts/noop-basis-ab.ts > /tmp/before.txt && git stash pop
//   diff /tmp/before.txt /tmp/after.txt
//
// Deterministic (no seed → expected-value mode), so a clean diff means genuinely no
// movement, not noise.
import { readFileSync } from 'node:fs';
import type { DataFile, LevelMultiplier, Element } from '../src/types.js';
import { loadOverride } from '../src/skills/overrides-node.js';
import type {
  CubesFile,
  OlLinesFile,
  PrepareDeps,
  SkillLevelData,
} from '../src/prepare.js';
import { prepareTeam } from '../src/prepare.js';
import { runSim } from '../src/engine/sim.js';
import { assembleTeam, type Cell } from '../src/dpschart/matrix.js';
import { NOOP_CHARACTERS } from '../src/dpschart/noop.js';
import type { OverrideFile } from '../src/skills/index.js';

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
for (const slug of [
  ...Object.keys(data.characters),
  ...Object.keys(NOOP_CHARACTERS),
]) {
  overrides[slug] = loadOverride(slug);
}
const deps: PrepareDeps = { overrides, skillLevels, cubes, olLines };

// Carriers of an ally-ATK selector — the units whose buff target can flip when the
// no-ops' ATK crosses a real unit's. Derived by grepping the override corpus for
// `alliesTopAtk` / `alliesLowestAtk`; re-derive with:
//   grep -rl 'alliesTopAtk\|alliesLowestAtk' src/skills/overrides/
// These are exact slugs read off override FILENAMES, not base names: the list carries
// `alice` (SR/Fire) not `alice-wonderland-bunny`, `mast` (SMG/Electric) not
// `mast-romantic-maid`, `maxwell` (SR/Iron) not `maxwell-ordinary-mechanic`,
// `rapunzel` (RL/Iron) not `rapunzel-pure-grace`, and `soda-twinkling-bunny` (SG/Iron)
// not `soda`. The absent variants genuinely do not carry the selector.
const ATK_SELECTOR_CARRIERS = [
  'alice',
  'avistar',
  'chime',
  'leona',
  'liberalio',
  'mast',
  'maxwell',
  'miranda',
  'n102',
  'naga',
  'rapunzel',
  'soda-twinkling-bunny',
];

const CELL: Cell = {
  framework: 'solo',
  eleadv: 'neutral',
  core: 'c100',
  invest: 'scope',
};

const rows: string[] = [];
for (const slug of ATK_SELECTOR_CARRIERS) {
  const c = data.characters[slug];
  if (!c?.simSupported) {
    rows.push(`${slug.padEnd(24)} —  (not sim-supported)`);
    continue;
  }
  const team = assembleTeam(CELL, {
    slug,
    element: c.element as Element,
    profile: null,
  });
  const chars = team.slugs.map((s) => data.characters[s] ?? NOOP_CHARACTERS[s]);
  const prepared = prepareTeam(chars, team.unitOpts, deps);
  const r = runSim(chars, mult, team.cfg, prepared);
  const noopB3 = r.units.find((u) => u.slug.startsWith('noop-b3'));
  rows.push(
    `${slug.padEnd(24)} tested_dps=${r.units[team.testedIndex].dps.toFixed(2)}` +
      `  noop_b3_dmg=${(noopB3?.totalDamage ?? 0).toFixed(2)}`
  );
}

process.stdout.write(
  `Solo framework (${CELL.eleadv}/${CELL.core}/${CELL.invest}) — ally-ATK-selector carriers\n` +
    `no-op base ATK = ${NOOP_CHARACTERS['noop-b1-ar'].baseStats.atk}\n\n` +
    rows.join('\n') +
    '\n'
);
