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
import { describe, expect, it } from 'vitest';
import { makeCalc } from '../../../src/teamcalc.js';
import { scopeLockCfg } from '../../lib/scope-lock.js';
import { deps, distinct5, generatorPool, mult } from '../lib/harness.js';

const { genChars, chars, overrides } = generatorPool();

const byBurst = (b: string) => genChars.filter((c) => c.burst === b).map((c) => c.slug);
const B1 = byBurst('I');
const B2 = byBurst('II');
const B3 = byBurst('III');

// Build a calc whose eligible pool is ONLY the given slugs (everything else
// blocked) — mirrors how the web app blocks non-eligible (non-OL) units.
const calcForPool = (keep: Set<string>) =>
  makeCalc({
    chars: chars as any,
    mult,
    deps: { overrides, ...deps },
    cfg: scopeLockCfg([], null) as any,
    loadout: {},
    blocked: Object.keys(chars).filter((s) => !keep.has(s)),
  });

// Ample BII/BIII so Burst I is the only binding constraint. BII needs headroom
// beyond one-per-team: the generator now explores double-B2 shapes (B1+B2+B2+
// 2×B3), so a team can consume 2 B2 — 16 keeps BII non-binding for 5 teams.
const AMPLE_B2 = B2.slice(0, 16);
const AMPLE_B3 = B3.slice(0, 16);

describe('solo topTeams team-count is role-bounded by Burst I', () => {
  // 3 B1 is the owner's reported symptom; 4 and 5 bracket it.
  it.each([
    [5, 5],
    [4, 4],
    [3, 3],
  ])('a pool with %i Burst-I units → topTeams(5) returns %i legal disjoint teams', (nB1, want) => {
    const keep = new Set([...B1.slice(0, nB1), ...AMPLE_B2, ...AMPLE_B3]);
    const top = calcForPool(keep).topTeams(5);
    const slugs = top.flatMap((t) => t.slugs);
    expect(top, `got ${top.length} team(s), want ${want}`).toHaveLength(want);
    expect(top.every((t) => distinct5(t.slugs)), 'a team is not 5 distinct units').toBe(true);
    expect(new Set(slugs).size, 'a unit was reused across teams').toBe(slugs.length);
  });
});
