// Regression test for the roster generators' "always-combo" BURST SPREAD ruling
// (owner 2026-07-22). The curated always-included supports must not stack a burst
// stage onto one team: the always B1s fan out onto distinct teams and the always
// B2 groups fan out onto distinct teams (a B2 pair counts as ONE B2 group). For
// Solo the 4 B1s (moran, anis:star, liter, little mermaid) take 4 teams and the 4
// B2 groups ({mint,prika}, {Mast,Anchor}, {crown+healer}, {nayuta}) take 4 teams —
// e.g. crown (B2) and nayuta (B2) never share a team, nor little mermaid (B1) and
// anis:star (B1). For Union the 2 B1s and 2 B2 groups likewise split. Pairs/oneOf
// still share a team, and generation still completes (topTeams builds). Only READS
// the engine. Mirrors SOLO_ALWAYS_COMBOS / UNION_ALWAYS_COMBOS in web/src/App.tsx.
//
//   npx tsx scripts/tests/always-combos-burst.test.ts
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

let failures = 0;
const ok = (m: string) => console.log(`  ✓ ${m}`);
const fail = (m: string) => {
  failures++;
  console.error(`  ✗ ${m}`);
};
const assert = (cond: boolean, m: string) => (cond ? ok(m) : fail(m));

const genChars = Object.values(data.characters).filter(
  (c) => c.generatorSupported && c.simSupported,
);
const chars = Object.fromEntries(genChars.map((c) => [c.slug, c]));
const overrides: Record<string, OverrideFile | undefined> = {};
for (const c of genChars) overrides[c.slug] = loadOverride(c.slug);

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
const UNION_ALWAYS_COMBOS: AlwaysCombos = {
  oneOf: [{ anchor: 'crown', choices: ['helm', 'naga'] }],
  singles: ['anis-star', 'little-mermaid', 'mast-romantic-maid'],
};

const burst = (s: string): string =>
  s === 'red-hood' ? 'III' : (chars as any)[s].burst;
const teamOf = (teams: string[][], s: string): number =>
  teams.findIndex((t) => t.includes(s));
const sameTeam = (teams: string[][], a: string, b: string): boolean =>
  teams.some((t) => t.includes(a) && t.includes(b));
// distinct teams hosting each unit of a burst class (among the given always-units)
const classTeamCount = (teams: string[][], units: string[], cls: 'I' | 'II') =>
  new Set(units.filter((s) => burst(s) === cls).map((s) => teamOf(teams, s)))
    .size;

console.log('Solo always-combos spread burst roles across teams (5 teams)');
{
  const ac = assignAlwaysCombos(
    SOLO_ALWAYS_COMBOS,
    [[], [], [], [], []],
    chars as any,
    5,
  );
  const t = ac.pinnedByTeam;
  assert(
    ac.singles.length === 0,
    `all singles placed internally (got ${JSON.stringify(ac.singles)})`,
  );
  assert(
    ac.dropped.length === 0,
    `nothing dropped (got ${JSON.stringify(ac.dropped)})`,
  );
  const b1 = ['moran', 'anis-star', 'liter', 'little-mermaid'];
  assert(
    b1.every((s) => teamOf(t, s) >= 0),
    'all 4 always-B1s placed',
  );
  assert(
    classTeamCount(t, b1, 'I') === 4,
    `4 always-B1s on 4 distinct teams (got ${classTeamCount(t, b1, 'I')})`,
  );
  const b2Groups = [
    ['mint', 'prika'],
    ['mast-romantic-maid', 'anchor-innocent-maid'],
    ['crown'],
    ['nayuta'],
  ];
  const b2Teams = b2Groups.map((g) => teamOf(t, g[0]));
  assert(
    new Set(b2Teams).size === 4,
    `4 always-B2 groups on 4 distinct teams (got ${new Set(b2Teams).size})`,
  );
  assert(
    teamOf(t, 'crown') !== teamOf(t, 'nayuta'),
    'crown (B2) and nayuta (B2) NOT on the same team',
  );
  assert(
    teamOf(t, 'little-mermaid') !== teamOf(t, 'anis-star'),
    'little mermaid (B1) and anis:star (B1) NOT on the same team',
  );
  assert(sameTeam(t, 'mint', 'prika'), 'mint+prika still share a team');
  assert(
    sameTeam(t, 'mast-romantic-maid', 'anchor-innocent-maid'),
    'Mast+Anchor still share a team',
  );
  assert(
    sameTeam(t, 'crown', 'helm') || sameTeam(t, 'crown', 'naga'),
    'crown still paired with a healer',
  );
}

console.log('Union always-combos spread burst roles across teams (3 teams)');
{
  const ac = assignAlwaysCombos(
    UNION_ALWAYS_COMBOS,
    [[], [], []],
    chars as any,
    3,
  );
  const t = ac.pinnedByTeam;
  assert(
    ac.singles.length === 0,
    `all singles placed internally (got ${JSON.stringify(ac.singles)})`,
  );
  assert(
    classTeamCount(t, ['anis-star', 'little-mermaid'], 'I') === 2,
    '2 always-B1s on 2 distinct teams',
  );
  const b2Teams = [['crown'], ['mast-romantic-maid']].map((g) =>
    teamOf(t, g[0]),
  );
  assert(new Set(b2Teams).size === 2, '2 always-B2 groups on 2 distinct teams');
  assert(
    sameTeam(t, 'crown', 'helm') || sameTeam(t, 'crown', 'naga'),
    'crown still paired with a healer',
  );
}

console.log('generation still completes with the burst-aware pins');
{
  const calc = makeCalc({
    chars: chars as any,
    mult,
    deps: { overrides, skillLevels, cubes, olLines },
    cfg: scopeLockCfg([], null) as any,
    loadout: {},
    poolB3: 16,
    rounds: 1,
  });
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
  const topSlugs = top.map((r) => r.slugs);
  const slugs = topSlugs.flat();
  assert(
    top.length === 5 && new Set(slugs).size === slugs.length,
    `topTeams(5) builds 5 disjoint teams with the burst-aware pins (got ${top.length})`,
  );
  // the burst spread survives the search (always-units are pinned, so they stay put)
  assert(
    classTeamCount(
      topSlugs,
      ['moran', 'anis-star', 'liter', 'little-mermaid'],
      'I',
    ) === 4,
    'final teams keep the 4 B1s on 4 distinct teams',
  );
}

console.log(
  failures === 0
    ? '\nPASS — always-combos spread B1s and B2 groups onto distinct teams'
    : `\nFAIL — ${failures} assertion(s) failed`,
);
process.exit(failures === 0 ? 0 : 1);
