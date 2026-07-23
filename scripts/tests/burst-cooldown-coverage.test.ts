// Regression test for the Roster Generator's burst-cooldown legality rule.
//
// A burst stage (B1/B2) must be castable every Full Burst cycle (~20s cadence).
// A ≤20s caster covers every cycle alone; a 40s caster only every other cycle,
// so a team needs EITHER one ≤20s caster OR a pair of ≤40s casters alternating
// for each of B1 and B2. A lone 40s (or 60s) B1/B2 leaves the rotation gapped and
// is illegal — the generator must refuse to emit such a team (src/teamcalc.ts
// stageCovered/isLegal). This generalizes the old Red-Hood-only "40s cooldown
// binds the rotation" exclusion to every B1/B2. It only READS the engine.
//
//   npx tsx scripts/tests/burst-cooldown-coverage.test.ts
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

// Generator candidate pool mirrors the web app: generatorSupported && simSupported.
const genChars = Object.values(data.characters).filter(
  (c) => c.generatorSupported && c.simSupported,
);
const chars = Object.fromEntries(genChars.map((c) => [c.slug, c]));
const overrides: Record<string, OverrideFile | undefined> = {};
for (const c of genChars) overrides[c.slug] = loadOverride(c.slug);

// effective burst class for selection — red-hood (the only Λ) is force-pinned to
// B3 by the generator, matching FORCED_BURST in src/teamcalc.ts.
const effBurst = (slug: string): string =>
  slug === 'red-hood' ? 'III' : chars[slug].burst;
const cd = (slug: string): number => chars[slug].burstCooldownSec;

// Mirror of stageCovered: a stage is covered iff ≥1 caster is ≤20s, or ≥2 casters
// are ≤40s (alternating). Used to independently check generator output.
const covered = (slugs: string[], stage: 'I' | 'II'): boolean => {
  let short = 0;
  let pair = 0;
  for (const s of slugs) {
    if (effBurst(s) !== stage) continue;
    if (cd(s) <= 20) short++;
    else if (cd(s) <= 40) pair++;
  }
  return short >= 1 || short + pair >= 2;
};
const rotationLegal = (slugs: string[]): boolean =>
  covered(slugs, 'I') && covered(slugs, 'II');

// Build a calc whose eligible pool is ONLY the given slugs (everything else
// blocked) — mirrors how the web app blocks non-eligible units.
const calcForPool = (keep: Set<string>) =>
  makeCalc({
    chars: chars as any,
    mult,
    deps: { overrides, skillLevels, cubes, olLines },
    cfg: scopeLockCfg([], null) as any,
    loadout: {},
    blocked: Object.keys(chars).filter((s) => !keep.has(s)),
    poolB3: 16,
    rounds: 1,
  });

const byBurstCd = (b: string, lo: number, hi: number) =>
  genChars
    .filter(
      (c) =>
        c.burst === b && c.burstCooldownSec > lo && c.burstCooldownSec <= hi,
    )
    .map((c) => c.slug);

const B1_20 = byBurstCd('I', 0, 20);
const B1_40 = byBurstCd('I', 20, 40);
const B2_20 = byBurstCd('II', 0, 20);
const B2_40 = byBurstCd('II', 20, 40);
const B3 = genChars.filter((c) => c.burst === 'III').map((c) => c.slug);

// Preconditions: the pool must actually contain the cooldown shapes under test.
assert(
  B1_20.length >= 1 && B1_40.length >= 2,
  `have ≥1 20s B1 (${B1_20.length}) and ≥2 40s B1 (${B1_40.length})`,
);
assert(
  B2_20.length >= 1 && B2_40.length >= 2,
  `have ≥1 20s B2 (${B2_20.length}) and ≥2 40s B2 (${B2_40.length})`,
);

const AMPLE_B3 = B3.slice(0, 16);

console.log('B1 cooldown coverage');
{
  // lone 40s B1, no 20s B1, no second 40s B1 → unbuildable
  const keep = new Set([B1_40[0], ...B2_20.slice(0, 8), ...AMPLE_B3]);
  const top = calcForPool(keep).topTeams(1);
  assert(
    top.length === 0,
    `lone 40s B1 (${B1_40[0]}) → no team built (got ${top.length})`,
  );
}
{
  // single 20s B1 covers the stage solo
  const keep = new Set([B1_20[0], ...B2_20.slice(0, 8), ...AMPLE_B3]);
  const top = calcForPool(keep).topTeams(1);
  assert(
    top.length === 1 &&
      rotationLegal(top[0].slugs) &&
      top[0].slugs.includes(B1_20[0]),
    `single 20s B1 (${B1_20[0]}) → 1 legal team using it`,
  );
}
{
  // two 40s B1 alternate to cover the stage
  const keep = new Set([B1_40[0], B1_40[1], ...B2_20.slice(0, 8), ...AMPLE_B3]);
  const top = calcForPool(keep).topTeams(1);
  assert(
    top.length === 1 &&
      rotationLegal(top[0].slugs) &&
      top[0].slugs.includes(B1_40[0]) &&
      top[0].slugs.includes(B1_40[1]),
    `two 40s B1 (${B1_40[0]}+${B1_40[1]}) → 1 legal team fielding the pair`,
  );
}

console.log('B2 cooldown coverage');
{
  const keep = new Set([B2_40[0], ...B1_20.slice(0, 8), ...AMPLE_B3]);
  const top = calcForPool(keep).topTeams(1);
  assert(
    top.length === 0,
    `lone 40s B2 (${B2_40[0]}) → no team built (got ${top.length})`,
  );
}
{
  const keep = new Set([B2_20[0], ...B1_20.slice(0, 8), ...AMPLE_B3]);
  const top = calcForPool(keep).topTeams(1);
  assert(
    top.length === 1 &&
      rotationLegal(top[0].slugs) &&
      top[0].slugs.includes(B2_20[0]),
    `single 20s B2 (${B2_20[0]}) → 1 legal team using it`,
  );
}
{
  const keep = new Set([B2_40[0], B2_40[1], ...B1_20.slice(0, 8), ...AMPLE_B3]);
  const top = calcForPool(keep).topTeams(1);
  assert(
    top.length === 1 &&
      rotationLegal(top[0].slugs) &&
      top[0].slugs.includes(B2_40[0]) &&
      top[0].slugs.includes(B2_40[1]),
    `two 40s B2 (${B2_40[0]}+${B2_40[1]}) → 1 legal team fielding the pair`,
  );
}

console.log('broad invariant: no emitted team has a gapped B1/B2 rotation');
{
  const full = calcForPool(new Set(Object.keys(chars)));
  const top = full.topTeams(5);
  assert(
    top.length >= 1,
    `full pool → topTeams(5) builds ${top.length} team(s)`,
  );
  const bad = top.filter((t) => !rotationLegal(t.slugs));
  assert(
    bad.length === 0,
    bad.length === 0
      ? `all ${top.length} team(s) sustain B1 and B2 every cycle`
      : `${bad.length} team(s) with gapped rotation: ${bad.map((t) => t.slugs.join(',')).join(' | ')}`,
  );
  // Double-support shapes (B1+B2+B2 / B1+B1+B2 + 2×B3) are common optimal teams —
  // the search must explore them, not only I:1 II:1 III:3.
  const dbl = top.filter(
    (t) =>
      t.slugs.filter((s) => effBurst(s) === 'II').length >= 2 ||
      t.slugs.filter((s) => effBurst(s) === 'I').length >= 2,
  ).length;
  assert(dbl >= 1, `topTeams(5) explores double-support shapes (found ${dbl})`);
  // A locked B2/B1 pair builds the double-support shape deterministically.
  const t2 = full.bestTeam({ mustInclude: [B2_20[0], B2_20[1]] });
  assert(
    !!t2 &&
      rotationLegal(t2.slugs) &&
      t2.slugs.includes(B2_20[0]) &&
      t2.slugs.includes(B2_20[1]) &&
      t2.slugs.filter((s) => effBurst(s) === 'II').length >= 2,
    `locked 2×B2 (${B2_20[0]}+${B2_20[1]}) → legal B1+B2+B2 team`,
  );
  const t1 = full.bestTeam({ mustInclude: [B1_20[0], B1_20[1]] });
  assert(
    !!t1 &&
      rotationLegal(t1.slugs) &&
      t1.slugs.includes(B1_20[0]) &&
      t1.slugs.includes(B1_20[1]) &&
      t1.slugs.filter((s) => effBurst(s) === 'I').length >= 2,
    `locked 2×B1 (${B1_20[0]}+${B1_20[1]}) → legal B1+B1+B2 team`,
  );
}

console.log(
  failures === 0
    ? '\nPASS — generator only emits rotation-sustainable B1/B2 coverage'
    : `\nFAIL — ${failures} assertion(s) failed`,
);
process.exit(failures === 0 ? 0 : 1);
