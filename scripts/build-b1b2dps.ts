// Precompute the B1/B2 DPS ranking board into web/public/b1b2dps.json.
//
// Ranks every sim-supported Burst-1/Burst-2 unit by its own DPS in a Solo-style
// no-op control team (see src/ranks/b1b2dps.ts). BUILD OUTPUT — gitignored, not
// part of verify.sh.
//
//   npx tsx scripts/build-b1b2dps.ts [--out <path>]
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
import type { RanksCtx } from '../src/ranks/burstgen.js';
import type { NoopCharacter } from '../src/dpschart/noop.js';
import {
  rankB1B2Dps,
  B1B2_DPS_CELLS,
  B1B2_DPS_PROFILES,
  B1B2_DPS_EXTRA_PROFILES,
  WITH_OTHER_B1_PARTNER,
  type B1B2TestedUnit,
  type B1B2DpsCell,
} from '../src/ranks/b1b2dps.js';
import type {
  B1B2DpsArtifact,
  B1B2DpsRow,
  RankUnitMeta,
} from '../src/ranks/types.js';

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
for (const slug of Object.keys(data.characters)) {
  overrides[slug] = loadOverride(slug);
}

const deps: PrepareDeps = { overrides, skillLevels, cubes, olLines };
const ctx: RanksCtx = {
  characters: data.characters as Record<string, NoopCharacter>,
  mult,
  deps,
};

// Tested population: every sim-supported B1/B2, plus forced rows for Λ/B3 units
// that the board wants to evaluate at an off-stage slot.
const population: B1B2TestedUnit[] = [];
for (const [slug, c] of Object.entries(data.characters)) {
  if (!c.simSupported) {
    continue;
  }
  if (c.burst === 'I' || c.burst === 'II') {
    population.push({
      slug,
      effectiveBurst: c.burst,
      element: c.element as Element,
      profile: null,
    });
  }
}

// Force Red Hood as B1 and B2, and Rapi: Red Hood as B1 (lambdaStage pins the
// rotation slot; the engine treats Λ units as eligible ONLY at that stage).
const FORCED_ROWS: {
  slug: string;
  effectiveBurst: 'I' | 'II';
  lambdaStage: 1 | 2;
  profile: string;
}[] = [
  { slug: 'red-hood', effectiveBurst: 'I', lambdaStage: 1, profile: 'as-b1' },
  { slug: 'red-hood', effectiveBurst: 'II', lambdaStage: 2, profile: 'as-b2' },
  {
    slug: 'rapi-red-hood',
    effectiveBurst: 'I',
    lambdaStage: 1,
    profile: 'as-b1',
  },
];
for (const f of FORCED_ROWS) {
  const c = data.characters[f.slug];
  if (!c?.simSupported) {
    continue;
  }
  population.push({
    slug: f.slug,
    effectiveBurst: f.effectiveBurst,
    element: c.element as Element,
    profile: f.profile,
    lambdaStage: f.lambdaStage,
  });
}

// Add profile rows for units that have canonical partner profiles.
for (const [slug, profileIds] of Object.entries(B1B2_DPS_EXTRA_PROFILES)) {
  const c = data.characters[slug];
  if (!c?.simSupported) {
    continue;
  }
  for (const id of profileIds) {
    const profileDef =
      id === 'with-other-b1'
        ? {
            id,
            partner: WITH_OTHER_B1_PARTNER,
            note: 'with a generic other B1',
          }
        : B1B2_DPS_PROFILES[slug];
    if (!profileDef) {
      continue;
    }
    population.push({
      slug,
      effectiveBurst: c.burst as 'I' | 'II',
      element: c.element as Element,
      profile: id,
    });
  }
}

const ranked = rankB1B2Dps(population, ctx);

const pack = (
  entries: { slug: string; dps: number; profile: string | null }[]
): B1B2DpsRow[] =>
  entries.map((e): B1B2DpsRow => [e.slug, Math.round(e.dps), e.profile]);

const cells: B1B2DpsArtifact['cells'] = {
  'c0-neutral': pack(ranked['c0-neutral']),
  'c0-eleadv': pack(ranked['c0-eleadv']),
  'c100-neutral': pack(ranked['c100-neutral']),
  'c100-eleadv': pack(ranked['c100-eleadv']),
};

// Gather unit metadata for every slug that appears in a ranked row.
const rankedSlugs = new Set(population.map((t) => t.slug));
const units: Record<string, RankUnitMeta> = {};
for (const slug of rankedSlugs) {
  const c = data.characters[slug];
  if (!c) {
    continue;
  }
  units[slug] = {
    name: c.name,
    element: c.element as Element,
    elements: unitElements(c),
    weapon: c.weapon,
    burst: c.burst,
    imageUrl: c.imageUrl ?? null,
  };
}

// Profiles map for the frontend's badge tooltip.
const profiles: Record<string, string> = {
  ...Object.fromEntries(
    Object.values(B1B2_DPS_PROFILES).map((p) => [p.id, p.note])
  ),
  'with-other-b1':
    'with a generic other B1 — Anis: Star enters her "Everyone\'s Star" re-entry mode',
  'as-b1': 'operating as Burst 1 (lambdaStage forced)',
  'as-b2': 'operating as Burst 2 (lambdaStage forced)',
};

const artifact: B1B2DpsArtifact = {
  generatedAt: new Date().toISOString(),
  methodology:
    'B1/B2 units ranked by their own DPS in a Solo-style no-op control team. ' +
    'Team shape: B1 20s [tested, B2, B2, B3 RL, B3 MG]; B1 40s [tested, B1 AR, B2, B3 RL, B3 MG]; ' +
    'B2 [B1 AR, tested, B2, B3 RL, B3 MG]. The no-op B1 provides the standard 7 s team burst CDR. ' +
    'Investment is scope lock (Base-5, 3★/core 7, no cube/doll). ' +
    'Cells: core 0 / core 100 × neutral / elemental advantage (boss weak to the tested unit).',
  units,
  profiles,
  cells,
};

const outArg = process.argv.indexOf('--out');
const out =
  outArg >= 0
    ? process.argv[outArg + 1]
    : new URL('../web/public/b1b2dps.json', import.meta.url).pathname;
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(artifact));

const top = (cell: B1B2DpsCell) =>
  ranked[cell]
    .slice(0, 10)
    .map(
      (r) =>
        `  #${r.rank} ${r.slug}${r.profile ? ` [${r.profile}]` : ''} ${r.dps.toFixed(0)}`
    )
    .join('\n');

process.stderr.write(
  `b1b2dps: ${population.length} rows × ${B1B2_DPS_CELLS.length} cells → ${out}\n` +
    B1B2_DPS_CELLS.map((c) => `${c}:\n${top(c)}`).join('\n') +
    '\n'
);
