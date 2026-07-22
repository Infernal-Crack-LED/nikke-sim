// Functional test for the generator "lock-in" support in src/teamcalc.ts.
//
// The Team/Roster generators let the user lock Nikkes they want fielded:
//   - bestTeam({ mustInclude }) forces units into the one team (Team Generator);
//   - topTeams(n, { pinnedByTeam, mustUse }) pins units to specific teams and/or
//     requires generic "must-use" units somewhere (Roster Generator solo/union).
// This test proves locked units actually appear, illegal lock sets refuse to
// build (return null instead of a broken team), teams never share a unit, and the
// no-lock path is deterministic (unchanged behaviour). It only READS the engine.
//
//   npx tsx scripts/tests/generator-lock.test.ts
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
  makeCalc,
  assignMustUse,
  locksFeasible,
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
  readFileSync(new URL('../../data/skill-levels.json', import.meta.url), 'utf8'),
);

let failures = 0;
const ok = (m: string) => console.log(`  ✓ ${m}`);
const fail = (m: string) => {
  failures++;
  console.error(`  ✗ ${m}`);
};
const assert = (cond: boolean, m: string) => (cond ? ok(m) : fail(m));

// Generator candidate pool mirrors the web app: generatorSupported && simSupported.
const genChars = Object.values(data.characters).filter(
  (c) => c.generatorSupported && c.simSupported,
);
const chars = Object.fromEntries(genChars.map((c) => [c.slug, c]));
const overrides: Record<string, OverrideFile | undefined> = {};
for (const c of genChars) overrides[c.slug] = loadOverride(c.slug);

const calc = makeCalc({
  chars: chars as any,
  mult,
  deps: { overrides, skillLevels, cubes, olLines },
  cfg: scopeLockCfg([], null) as any,
  loadout: {},
});

const byBurst = (b: string) =>
  genChars.filter((c) => c.burst === b).map((c) => c.slug);
const b1 = byBurst('I');
const b2 = byBurst('II');
const b3 = byBurst('III');
if (b1.length < 3 || b2.length < 2 || b3.length < 2) {
  throw new Error('test pool too small to exercise lock combinations');
}
const name = (s: string) => data.characters[s]?.name ?? s;
const distinct5 = (slugs: string[]) =>
  slugs.length === 5 && new Set(slugs).size === 5;

console.log('generator lock-in');

// 1. no-lock baseline builds a legal team, deterministically
const base1 = calc.bestTeam();
const base2 = calc.bestTeam();
assert(!!base1 && distinct5(base1.slugs), 'no-lock bestTeam builds a legal 5-team');
assert(
  !!base1 &&
    !!base2 &&
    JSON.stringify(base1.slugs) === JSON.stringify(base2.slugs),
  'no-lock bestTeam is deterministic (behaviour preserved)',
);

// 2. a single locked unit is forced into the team
const single = calc.bestTeam({ mustInclude: [b1[0]] });
assert(
  !!single && single.slugs.includes(b1[0]),
  `single lock ${name(b1[0])} is fielded`,
);

// 3. multiple compatible locks (B1 + B2 + B3) all appear
const multi = calc.bestTeam({ mustInclude: [b1[0], b2[0], b3[0]] });
assert(
  !!multi &&
    distinct5(multi.slugs) &&
    [b1[0], b2[0], b3[0]].every((s) => multi.slugs.includes(s)),
  `three compatible locks (${name(b1[0])}, ${name(b2[0])}, ${name(b3[0])}) all fielded`,
);

// 4. an impossible lock set (3× Burst I) refuses rather than build an illegal team
assert(
  calc.bestTeam({ mustInclude: [b1[0], b1[1], b1[2]] }) === null,
  'impossible lock set (3× Burst I) returns null',
);

// 5. locksFeasible agrees with what bestTeam can build
assert(locksFeasible([b1[0]], chars as any), 'locksFeasible: single lock feasible');
assert(
  locksFeasible([b1[0], b2[0], b3[0]], chars as any),
  'locksFeasible: B1+B2+B3 feasible',
);
assert(
  !locksFeasible([b1[0], b1[1], b1[2]], chars as any),
  'locksFeasible: 3× Burst I infeasible',
);

// 6. no-lock topTeams: 5 disjoint legal teams
const top = calc.topTeams(5);
const topSlugs = top.flatMap((t) => t.slugs);
assert(top.length === 5 && top.every((t) => distinct5(t.slugs)), 'topTeams builds 5 legal teams');
assert(
  new Set(topSlugs).size === topSlugs.length,
  'topTeams never reuses a unit across teams',
);

// 7. pinned + generic locks: pinned unit stays on its team, generic appears somewhere
const pinned = [[b1[0]]];
const mustUse = [b3[1]];
const locked = calc.topTeams(5, { pinnedByTeam: pinned, mustUse });
const lockedSlugs = locked.flatMap((t) => t.slugs);
assert(
  locked.length > 0 && locked[0].slugs.includes(b1[0]),
  `pinned ${name(b1[0])} is fielded on team 1`,
);
assert(lockedSlugs.includes(b3[1]), `generic must-use ${name(b3[1])} is fielded somewhere`);
assert(
  new Set(lockedSlugs).size === lockedSlugs.length,
  'locked topTeams never reuses a unit across teams',
);

// 8. assignMustUse spreads generic units without duplicates or drops
const asg = assignMustUse([b3[1], b2[1]], [[b1[0]]], chars as any, 5);
const asgAll = asg.assigned.flat();
assert(
  asg.unplaced.length === 0 &&
    asgAll.includes(b3[1]) &&
    asgAll.includes(b2[1]) &&
    new Set(asgAll).size === asgAll.length,
  'assignMustUse places every generic unit exactly once',
);
assert(
  !asg.assigned[0].includes(b1[0]),
  'assignMustUse keeps pinned units out of the generic assignment',
);

console.log(
  failures === 0
    ? '\nPASS — generator lock-in behaves correctly'
    : `\nFAIL — ${failures} assertion(s) failed`,
);
process.exit(failures === 0 ? 0 : 1);
