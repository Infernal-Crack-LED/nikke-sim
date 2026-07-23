// Regression test for the generators' like-tag synergy bias (owner 2026-07-23)
// and the `projectile` dealer archetype tag that motivates it. A team that pairs a
// damage dealer with its matching damage buffer (pierce ↔ Pierce ▲, projectile ↔
// Projectile ▲) scores a soft (1 + weight·pairs) bonus (teamcalc.countSynergyPairs
// folded into scoreOf). Covers: (1) the pure pair-counting logic, (2) the generated
// `projectile` tag — rapi-red-hood deals AND self-buffs projectile explosion damage
// so carries both `projectile` + `projectile-buffer`, while pure buffers (prika,
// mint, anis:star) carry only `projectile-buffer`, and (3) generation still
// completes with synergy enabled. Only READS the engine. Mirrors SYNERGY_PAIRS /
// SYNERGY_WEIGHT in web/src/App.tsx.
//
//   npx tsx scripts/tests/like-tag-synergy.test.ts
import { readFileSync } from 'node:fs';
import type { DataFile, LevelMultiplier } from '../../src/types.js';
import type {
  CubesFile,
  OlLinesFile,
  SkillLevelData,
} from '../../src/prepare.js';
import type { OverrideFile } from '../../src/skills/index.js';
import { loadOverride } from '../../src/skills/overrides-node.js';
import { scopeLockCfg } from '../lib/scope-lock.js';
import {
  assignAlwaysCombos,
  countSynergyPairs,
  makeCalc,
  type AlwaysCombos,
} from '../../src/teamcalc.js';

const data: DataFile = JSON.parse(
  readFileSync(new URL('../../data/characters.json', import.meta.url), 'utf8'),
);
const mult: LevelMultiplier = JSON.parse(
  readFileSync(
    new URL('../../data/level-multiplier.json', import.meta.url),
    'utf8',
  ),
);
const cubes: CubesFile = JSON.parse(
  readFileSync(new URL('../../data/cubes.json', import.meta.url), 'utf8'),
);
const olLines: OlLinesFile = JSON.parse(
  readFileSync(new URL('../../data/ol-lines.json', import.meta.url), 'utf8'),
);
const skillLevels: SkillLevelData = JSON.parse(
  readFileSync(
    new URL('../../data/skill-levels.json', import.meta.url),
    'utf8',
  ),
);
const archetypeTags = (
  JSON.parse(
    readFileSync(
      new URL('../../data/archetype-tags.json', import.meta.url),
      'utf8',
    ),
  ) as { tags: Record<string, string[]> }
).tags;

let failures = 0;
const ok = (m: string) => console.log(`  ✓ ${m}`);
const fail = (m: string) => {
  failures++;
  console.error(`  ✗ ${m}`);
};
const assert = (cond: boolean, m: string) => (cond ? ok(m) : fail(m));

// Mirrors web/src/App.tsx.
const SYNERGY_PAIRS: [string, string][] = [
  ['pierce', 'pierce-buffer'],
  ['projectile', 'projectile-buffer'],
];
const SYNERGY_WEIGHT = 0.08;

console.log('countSynergyPairs — pure pair counting (synthetic tags)');
{
  const tags: Record<string, string[]> = {
    'pierce-dealer': ['pierce'],
    'pierce-buffer': ['pierce-buffer'],
    'proj-dealer': ['projectile'],
    'proj-buffer': ['projectile-buffer'],
    'proj-both': ['projectile', 'projectile-buffer'],
    plain: ['buffer'],
  };
  const n = (slugs: string[]) =>
    countSynergyPairs(slugs, tags, SYNERGY_PAIRS);
  assert(
    n(['pierce-dealer', 'pierce-buffer']) === 1,
    'dealer + matching buffer satisfies the pair',
  );
  assert(n(['pierce-dealer']) === 0, 'dealer alone does NOT satisfy');
  assert(n(['pierce-buffer']) === 0, 'buffer alone does NOT satisfy');
  assert(
    n(['pierce-dealer', 'pierce-buffer', 'proj-dealer', 'proj-buffer']) === 2,
    'both pairs satisfied at once → 2',
  );
  assert(
    n(['proj-both']) === 1,
    'one unit carrying BOTH halves satisfies the pair on its own',
  );
  assert(n(['plain']) === 0, 'unrelated tags satisfy nothing');
  assert(n([]) === 0, 'empty team satisfies nothing');
  // cross-wiring must NOT count: a pierce dealer + a projectile buffer is no pair.
  assert(
    n(['pierce-dealer', 'proj-buffer']) === 0,
    'mismatched dealer/buffer (pierce dealer + projectile buffer) → 0',
  );
}

console.log('countSynergyPairs — real archetype tags');
{
  const n = (slugs: string[]) =>
    countSynergyPairs(slugs, archetypeTags, SYNERGY_PAIRS);
  // rapi-red-hood deals AND self-buffs projectile explosion damage.
  assert(
    n(['rapi-red-hood']) === 1,
    'rapi-red-hood alone satisfies the projectile pair (dealer + self-buffer)',
  );
  // alice is a pierce dealer; mint is a pierce buffer.
  assert(
    n(['alice', 'mint']) === 1,
    'alice (pierce dealer) + mint (pierce buffer) satisfy the pierce pair',
  );
}

console.log('projectile dealer tag — generated output');
{
  const has = (slug: string, tag: string) =>
    (archetypeTags[slug] ?? []).includes(tag);
  assert(
    has('rapi-red-hood', 'projectile'),
    'rapi-red-hood carries the projectile dealer tag',
  );
  assert(
    has('rapi-red-hood', 'projectile-buffer'),
    'rapi-red-hood also carries projectile-buffer (self-buff)',
  );
  for (const s of ['prika', 'mint', 'anis-star']) {
    assert(
      has(s, 'projectile-buffer') && !has(s, 'projectile'),
      `${s} is a pure projectile buffer (projectile-buffer, NOT projectile)`,
    );
  }
}

console.log('generation still completes with the synergy bias active');
{
  const genChars = Object.values(data.characters).filter(
    (c) => c.generatorSupported && c.simSupported,
  );
  const chars = Object.fromEntries(genChars.map((c) => [c.slug, c]));
  const overrides: Record<string, OverrideFile | undefined> = {};
  for (const c of genChars) overrides[c.slug] = loadOverride(c.slug);
  const synergy = {
    tags: archetypeTags,
    pairs: SYNERGY_PAIRS,
    weight: SYNERGY_WEIGHT,
  };
  const calc = makeCalc({
    chars: chars as any,
    mult,
    deps: { overrides, skillLevels, cubes, olLines },
    cfg: scopeLockCfg([], null) as any,
    loadout: {},
    poolB3: 16,
    rounds: 1,
    synergy,
  });
  const bt = calc.bestTeam({});
  assert(bt !== null && bt.slugs.length === 5, 'bestTeam builds with synergy');

  const SOLO_ALWAYS_COMBOS: AlwaysCombos = {
    pairs: [
      ['mint', 'prika'],
      ['mast-romantic-maid', 'anchor-innocent-maid'],
    ],
    oneOf: [{ anchor: 'crown', choices: ['helm', 'naga'] }],
    singles: [
      'moran',
      'anis-star',
      'liter',
      'little-mermaid',
      'nayuta',
      'privaty',
    ],
  };
  const ac = assignAlwaysCombos(
    SOLO_ALWAYS_COMBOS,
    [[], [], [], [], []],
    chars as any,
    5,
  );
  const top = calc.topTeams(5, {
    pinnedByTeam: ac.pinnedByTeam,
    mustUse: ac.singles,
  });
  const slugs = top.map((r) => r.slugs).flat();
  assert(
    top.length === 5 && new Set(slugs).size === slugs.length,
    `topTeams(5) builds 5 disjoint teams with synergy (got ${top.length})`,
  );
}

console.log(
  failures === 0
    ? '\nPASS — like-tag synergy counting, projectile tag, and generation all good'
    : `\nFAIL — ${failures} assertion(s) failed`,
);
process.exit(failures === 0 ? 0 : 1);
