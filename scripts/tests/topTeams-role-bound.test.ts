// Investigation/regression test for the solo-raid Roster Generator team count.
//
// Hypothesis A check: solo raid fields disjoint teams (no shared units), and a
// legal team needs exactly 1×BI + 1×BII + 2×BIII (there are NO usable Λ
// wildcards in the generator pool — red-hood, the only Λ, is force-pinned to
// B3). So the number of disjoint teams topTeams(n) can build is bounded by the
// scarcest required burst role, which is Burst I (11 in the full pool vs 22 BII
// / 40 BIII).
//
// This test proves the greedy search is SOUND: it returns exactly as many teams
// as the pool's burst-role counts permit. Concretely, restricting the pool to K
// Burst-I units (with ample BII/BIII) yields exactly K teams. Therefore a real
// roster that "returns 3" under Ignore-Non-OL has only 3 eligible Burst-I units
// in its pool — so if the owner actually owns 5+ OL Burst-I units, the OL
// eligibility filter (hypothesis B) must be dropping them.
//
//   npx tsx scripts/tests/topTeams-role-bound.test.ts
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

const genChars = Object.values(data.characters).filter(
  (c) => c.generatorSupported && c.simSupported,
);
const chars = Object.fromEntries(genChars.map((c) => [c.slug, c]));
const overrides: Record<string, OverrideFile | undefined> = {};
for (const c of genChars) overrides[c.slug] = loadOverride(c.slug);

const byBurst = (b: string) =>
  genChars.filter((c) => c.burst === b).map((c) => c.slug);
const B1 = byBurst('I');
const B2 = byBurst('II');
const B3 = byBurst('III');

// Build a calc whose eligible pool is ONLY the given slugs (everything else
// blocked) — mirrors how the web app blocks non-eligible (non-OL) units.
const calcForPool = (keep: Set<string>) =>
  makeCalc({
    chars: chars as any,
    mult,
    deps: { overrides, skillLevels, cubes, olLines },
    cfg: scopeLockCfg([], null) as any,
    loadout: {},
    blocked: Object.keys(chars).filter((s) => !keep.has(s)),
  });

const distinct5 = (slugs: string[]) =>
  slugs.length === 5 && new Set(slugs).size === 5;

// Ample BII/BIII so Burst I is the only binding constraint. BII needs headroom
// beyond one-per-team: the generator now explores double-B2 shapes (B1+B2+B2+
// 2×B3), so a team can consume 2 B2 — 16 keeps BII non-binding for 5 teams.
const AMPLE_B2 = B2.slice(0, 16);
const AMPLE_B3 = B3.slice(0, 16);

const runCase = (nB1: number, want: number) => {
  const keep = new Set([...B1.slice(0, nB1), ...AMPLE_B2, ...AMPLE_B3]);
  const top = calcForPool(keep).topTeams(5);
  const slugs = top.flatMap((t) => t.slugs);
  const disjoint = new Set(slugs).size === slugs.length;
  assert(
    top.length === want && top.every((t) => distinct5(t.slugs)) && disjoint,
    `pool with ${nB1} Burst-I units → topTeams(5) returns ${top.length} (want ${want}), all legal+disjoint`,
  );
};

console.log('solo topTeams team-count is role-bounded by Burst I');
runCase(5, 5); // enough B1 for 5 teams → search finds all 5
runCase(4, 4); // 4 B1 → exactly 4 teams
runCase(3, 3); // 3 B1 → exactly 3 teams (the owner's symptom)

console.log(
  failures === 0
    ? '\nPASS — search is sound; team count tracks the Burst-I count'
    : `\nFAIL — ${failures} assertion(s) failed`,
);
process.exit(failures === 0 ? 0 : 1);
