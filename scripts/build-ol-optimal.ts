// Precompute each unit's damage-optimal 12/12 remainder OL lines (the 4 lines
// beyond the 4× Elemental DMG + 4× ATK floor), in the SOLO framework — the primary
// B3 ranking basis (owner 2026-07-16). Writes data/ol-optimal.json, a slug → line
// selection table the web's "12/12" Overload pill applies per unit.
//
// The optimizer is a per-unit greedy marginal-gain search (src/bestol.ts): a unit's
// best remaining lines (crit / ammo / charge …) are governed by its own kit, so we
// optimize each unit once in the solo isolation team and reuse the result everywhere.
//
//   npx tsx scripts/build-ol-optimal.ts [--out <path>]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { DataFile, LevelMultiplier, Element } from '../src/types.js';
import { loadOverride } from '../src/skills/overrides-node.js';
import type { OverrideFile } from '../src/skills/index.js';
import type { CubesFile, OlLinesFile, PrepareDeps, SkillLevelData } from '../src/prepare.js';
import { prepareTeam } from '../src/prepare.js';
import { bestOl } from '../src/bestol.js';
import { assembleTeam, FLOOR_SEED_COUNTS, type Cell } from '../src/dpschart/matrix.js';
import { NOOP_CHARACTERS } from '../src/dpschart/noop.js';

const load = <T,>(rel: string): T =>
  JSON.parse(readFileSync(new URL(rel, import.meta.url), 'utf8')) as T;

const data = load<DataFile>('../data/characters.json');
const mult = load<LevelMultiplier>('../data/level-multiplier.json');
const cubes = load<CubesFile>('../data/cubes.json');
const olLines = load<OlLinesFile>('../data/ol-lines.json');
let skillLevels: SkillLevelData = {};
try { skillLevels = load<SkillLevelData>('../data/skill-levels.json'); } catch { /* optional */ }

const overrides: Record<string, OverrideFile | undefined> = {};
for (const slug of Object.keys(data.characters)) overrides[slug] = loadOverride(slug);
const deps: PrepareDeps = { overrides, skillLevels, cubes, olLines };

// Solo isolation, elemental-advantage, full core exposure, 12/12 tier — the same
// probe context the DPS-chart Solo headliners rank under.
const SOLO_CELL: Cell = { framework: 'solo', eleadv: 'eleweak', core: 'c100', invest: '12of12' };

const charFor = (slug: string) => (data.characters as any)[slug] ?? (NOOP_CHARACTERS as any)[slug];

const units: Record<string, { type: string; count: number }[]> = {};
let done = 0;
for (const [slug, c] of Object.entries(data.characters)) {
  const tested = { slug, element: c.element as Element };
  // provisional solo team: tested carries only the 8-line floor; bestOl fills the rest.
  const team = assembleTeam(SOLO_CELL, tested);
  const chars = team.slugs.map(charFor);
  const prepared = prepareTeam(chars, team.unitOpts, deps);
  const res = bestOl(chars, mult, team.cfg, prepared, team.testedIndex, olLines, 4, FLOOR_SEED_COUNTS);
  const counts = new Map<string, number>();
  for (const p of res.picks) counts.set(p.type, (counts.get(p.type) ?? 0) + 1);
  units[slug] = [...counts].map(([type, count]) => ({ type, count }));
  done++;
  if (done % 20 === 0) process.stderr.write(`  …${done}/${Object.keys(data.characters).length}\n`);
}

const artifact = {
  _comment:
    'Damage-optimal 12/12 remainder OL lines per unit (beyond the 4 elem + 4 atk floor), ' +
    'computed by scripts/build-ol-optimal.ts in the Solo framework. Applied at T11 by the ' +
    "web's 12/12 Overload pill. Regenerate when kits/overrides/engine change.",
  framework: 'solo',
  units,
};

const outArg = process.argv.indexOf('--out');
const out = outArg >= 0 ? process.argv[outArg + 1]
  : new URL('../data/ol-optimal.json', import.meta.url).pathname;
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(artifact, null, 2) + '\n');
process.stderr.write(`ol-optimal: ${Object.keys(units).length} units → ${out}\n`);
