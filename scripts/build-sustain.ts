// Precompute the sustain ranking board into web/public/sustain.json.
// Thin analytic layer over one sim run per candidate (src/ranks/sustain.ts +
// the curated sustain-table.ts). BUILD OUTPUT — gitignored, not in verify.sh.
//
//   npx tsx scripts/build-sustain.ts [--out <path>]
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
import { sustainRank, SUSTAIN_PROFILES } from '../src/ranks/sustain.js';
import { SUSTAIN_TABLE } from '../src/ranks/sustain-table.js';
import type { RanksCtx } from '../src/ranks/burstgen.js';
import type { SustainArtifact, SustainRow } from '../src/ranks/types.js';

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

// Candidates: healer/shield tagged + nayuta (untagged). Every candidate must
// have a curated table entry OR a per-unit hook (empty entry = genuinely zero).
const population = [
  ...new Set([
    ...Object.keys(tags).filter((s) => tags[s].includes('healer') || tags[s].includes('shield')),
    'nayuta',
  ]),
].sort();
const HOOKS = new Set(['prika', 'mint', 'mana', 'pepper']);
for (const slug of population) {
  if (!(slug in SUSTAIN_TABLE) && !HOOKS.has(slug))
    throw new Error(`${slug}: sustain candidate with no table entry and no hook`);
}

const ranked = sustainRank(population, ctx);

const artifact: SustainArtifact = {
  generatedAt: new Date().toISOString(),
  methodology:
    'Total effective HP restored + shielded over a 180s scope-lock fight, team ' +
    'total (multi-ally lines × targets at the caster\'s final Max HP). One sim ' +
    'run per unit (no-op teammates, bursts on, ~20s rotation) supplies the ' +
    'caster\'s Max HP and the burst/shot timeline; kit lines are valued ' +
    'analytically. Damage-scaled "recover % of attack damage" lines are valued ' +
    'on the unit\'s OWN damage only (understates team context). Lines that ' +
    'cannot proc at scope lock (low-HP triggers, cover HP, on-attacked) count ' +
    '0. Profiles: prika runs with mint (duet), anchor-innocent-maid with ' +
    'mast-romantic-maid (same-squad gate). Ranked by absolute HP.',
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
    Object.values(SUSTAIN_PROFILES).map((p) => [p.id, p.note]),
  ),
  entries: ranked.map((r): SustainRow => [
    r.slug,
    Math.round(r.totalHp),
    Math.round(r.totalPct * 10) / 10, // % of caster maxHp
    Math.round(r.healPct * 10) / 10,
    Math.round(r.shieldPct * 10) / 10,
    Math.round(r.lifestealPct * 10) / 10,
    r.profile, // null = plain run
  ]),
};

const outArg = process.argv.indexOf('--out');
const out =
  outArg >= 0
    ? process.argv[outArg + 1]
    : new URL('../web/public/sustain.json', import.meta.url).pathname;
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(artifact));
process.stderr.write(
  `sustain: ${ranked.length} units ranked → ${out}\n` +
    ranked
      .slice(0, 15)
      .map((r) => `  #${r.rank} ${r.slug} ${(r.totalHp / 1e6).toFixed(1)}M HP (${r.totalPct.toFixed(0)}% of maxHP)${r.profile ? ` [${r.profile}]` : ''}`)
      .join('\n') +
    '\n',
);
