// Regression test for the generator's boss-weakness element rule.
//
// When an elemental weakness is selected, every generated team must field at
// least one advantaged unit of that element (src/teamcalc.ts requireElement →
// elementOk/legal). Applies to solo (topTeams) and union raid (per-team
// bestTeam, which is what runUnionTopTeams calls). A pool with no unit of the
// required element is unbuildable (null). With no weakness selected
// (requireElement null) there is no element constraint. Only READS the engine.
//
//   npx tsx scripts/tests/weakness-element.test.ts
import { readFileSync } from 'node:fs';
import type { DataFile, Element, LevelMultiplier } from '../../src/types.js';
import type {
  CubesFile,
  OlLinesFile,
  SkillLevelData,
} from '../../src/prepare.js';
import type { OverrideFile } from '../../src/skills/index.js';
import { loadOverride } from '../../src/skills/overrides-node.js';
import { scopeLockCfg } from '../lib/scope-lock.js';
import { makeCalc } from '../../src/teamcalc.js';

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

const genChars = Object.values(data.characters).filter(
  (c) => c.generatorSupported && c.simSupported,
);
const chars = Object.fromEntries(genChars.map((c) => [c.slug, c]));
const overrides: Record<string, OverrideFile | undefined> = {};
for (const c of genChars) overrides[c.slug] = loadOverride(c.slug);

const calcWith = (requireElement: Element | null, keep?: Set<string>) =>
  makeCalc({
    chars: chars as any,
    mult,
    deps: { overrides, skillLevels, cubes, olLines },
    cfg: scopeLockCfg([], null) as any,
    loadout: {},
    blocked: keep
      ? Object.keys(chars).filter((s) => !keep.has(s))
      : [],
    requireElement,
    poolB3: 16,
    rounds: 1,
  });

const eff = (s: string): string =>
  s === 'red-hood' ? 'III' : (chars as any)[s].burst;
const elOf = (s: string): string => (chars as any)[s].element;
const hasEl = (slugs: string[], e: Element) => slugs.some((s) => elOf(s) === e);
// rotation still has to be sustainable (cooldown rule unchanged)
const covered = (slugs: string[], stage: 'I' | 'II') => {
  let short = 0;
  let pair = 0;
  for (const s of slugs) {
    if (eff(s) !== stage) continue;
    const cd = (chars as any)[s].burstCooldownSec;
    if (cd <= 20) short++;
    else if (cd <= 40) pair++;
  }
  return short >= 1 || short + pair >= 2;
};
const rotationLegal = (slugs: string[]) =>
  covered(slugs, 'I') && covered(slugs, 'II');

// Pick the element with the most generator-supported units so positive cases
// have ample candidates.
const ELEMENTS: Element[] = ['Fire', 'Water', 'Wind', 'Electric', 'Iron'];
const countEl = (e: Element) => genChars.filter((c) => c.element === e).length;
const E = [...ELEMENTS].sort((a, b) => countEl(b) - countEl(a))[0];

console.log(`boss weakness = ${E} (${countEl(E)} generator-supported units)`);

// solo raid: topTeams(5) — every team fields ≥1 advantaged unit, still rotation-legal
{
  const top = calcWith(E).topTeams(5);
  assert(top.length >= 1, `topTeams(5) builds ${top.length} team(s) with weakness ${E}`);
  const bad = top.filter((t) => !hasEl(t.slugs, E));
  assert(
    bad.length === 0,
    bad.length === 0
      ? `all ${top.length} team(s) field ≥1 ${E} unit`
      : `${bad.length} team(s) missing ${E}: ${bad.map((t) => t.slugs.join(',')).join(' | ')}`,
  );
  assert(
    top.every((t) => rotationLegal(t.slugs)),
    'every team still sustains the B1/B2 rotation',
  );
}

// union raid: per-team bestTeam with its own weakness, disjoint across teams
{
  const used = new Set<string>();
  let allHave = true;
  let built = 0;
  for (const weak of [E, ELEMENTS.find((x) => x !== E)!]) {
    const t = calcWith(weak).bestTeam({ exclude: used });
    if (!t) break;
    built++;
    if (!hasEl(t.slugs, weak)) allHave = false;
    t.slugs.forEach((s) => used.add(s));
  }
  assert(built >= 2 && allHave, `union-style per-team bestTeam respects each team's weakness (${built} teams)`);
}

// a pool with NO unit of the required element is unbuildable
{
  const keep = new Set(
    Object.keys(chars).filter((s) => elOf(s) !== E),
  );
  const t = calcWith(E, keep).bestTeam();
  assert(t === null, `no ${E} unit in pool → bestTeam returns null`);
}

// no weakness selected → no element constraint (baseline still builds)
{
  const t = calcWith(null).bestTeam();
  assert(!!t && t.slugs.length === 5, 'requireElement null → team builds with no element gate');
}

console.log(
  failures === 0
    ? '\nPASS — every generated team fields an advantaged unit when a weakness is set'
    : `\nFAIL — ${failures} assertion(s) failed`,
);
process.exit(failures === 0 ? 0 : 1);
