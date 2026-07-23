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
import { describe, expect, it } from 'vitest';
import { assignAlwaysCombos, makeCalc, type AlwaysCombos } from '../../../src/teamcalc.js';
import { scopeLockCfg } from '../../lib/scope-lock.js';
import { deps, effBurst, generatorPool, mult } from '../lib/harness.js';

const { chars, overrides } = generatorPool();

const SOLO_ALWAYS_COMBOS: AlwaysCombos = {
  pairs: [
    ['mint', 'prika'],
    ['mast-romantic-maid', 'anchor-innocent-maid'],
  ],
  oneOf: [{ anchor: 'crown', choices: ['helm', 'naga'] }],
  singles: ['moran', 'anis-star', 'liter', 'little-mermaid', 'nayuta', 'privaty'],
};
const UNION_ALWAYS_COMBOS: AlwaysCombos = {
  oneOf: [{ anchor: 'crown', choices: ['helm', 'naga'] }],
  singles: ['anis-star', 'little-mermaid', 'mast-romantic-maid'],
};

const burst = (s: string) => effBurst(chars, s);
const teamOf = (teams: string[][], s: string): number =>
  teams.findIndex((t) => t.includes(s));
const sameTeam = (teams: string[][], a: string, b: string): boolean =>
  teams.some((t) => t.includes(a) && t.includes(b));
// distinct teams hosting each unit of a burst class (among the given always-units)
const classTeamCount = (teams: string[][], units: string[], cls: 'I' | 'II') =>
  new Set(units.filter((s) => burst(s) === cls).map((s) => teamOf(teams, s))).size;

describe('Solo always-combos spread burst roles across teams (5 teams)', () => {
  const ac = assignAlwaysCombos(SOLO_ALWAYS_COMBOS, [[], [], [], [], []], chars as any, 5);
  const t = ac.pinnedByTeam;
  const B1 = ['moran', 'anis-star', 'liter', 'little-mermaid'];
  const B2_GROUPS = [
    ['mint', 'prika'],
    ['mast-romantic-maid', 'anchor-innocent-maid'],
    ['crown'],
    ['nayuta'],
  ];

  it('places every single internally and drops nothing', () => {
    expect(ac.singles, 'singles left unplaced').toEqual([]);
    expect(ac.dropped, 'units dropped').toEqual([]);
  });

  it('spreads the 4 always-B1s onto 4 distinct teams', () => {
    expect(B1.every((s) => teamOf(t, s) >= 0), 'not all 4 always-B1s placed').toBe(true);
    expect(classTeamCount(t, B1, 'I')).toBe(4);
    expect(
      teamOf(t, 'little-mermaid'),
      'little mermaid (B1) and anis:star (B1) share a team',
    ).not.toBe(teamOf(t, 'anis-star'));
  });

  it('spreads the 4 always-B2 groups onto 4 distinct teams', () => {
    const b2Teams = B2_GROUPS.map((g) => teamOf(t, g[0]));
    expect(new Set(b2Teams).size).toBe(4);
    expect(teamOf(t, 'crown'), 'crown (B2) and nayuta (B2) share a team').not.toBe(teamOf(t, 'nayuta'));
  });

  it('keeps pairs and the crown+healer oneOf together', () => {
    expect(sameTeam(t, 'mint', 'prika'), 'mint+prika split').toBe(true);
    expect(
      sameTeam(t, 'mast-romantic-maid', 'anchor-innocent-maid'),
      'Mast+Anchor split',
    ).toBe(true);
    expect(
      sameTeam(t, 'crown', 'helm') || sameTeam(t, 'crown', 'naga'),
      'crown lost its healer',
    ).toBe(true);
  });
});

describe('Union always-combos spread burst roles across teams (3 teams)', () => {
  const ac = assignAlwaysCombos(UNION_ALWAYS_COMBOS, [[], [], []], chars as any, 3);
  const t = ac.pinnedByTeam;

  it('places every single internally', () => {
    expect(ac.singles, 'singles left unplaced').toEqual([]);
  });

  it('spreads the 2 always-B1s and the 2 always-B2 groups', () => {
    expect(classTeamCount(t, ['anis-star', 'little-mermaid'], 'I')).toBe(2);
    const b2Teams = [['crown'], ['mast-romantic-maid']].map((g) => teamOf(t, g[0]));
    expect(new Set(b2Teams).size).toBe(2);
  });

  it('keeps crown paired with a healer', () => {
    expect(sameTeam(t, 'crown', 'helm') || sameTeam(t, 'crown', 'naga')).toBe(true);
  });
});

describe('generation still completes with the burst-aware pins', () => {
  it('topTeams(5) builds 5 disjoint teams and the B1 spread survives the search', () => {
    const calc = makeCalc({
      chars: chars as any,
      mult,
      deps: { overrides, ...deps },
      cfg: scopeLockCfg([], null) as any,
      loadout: {},
      poolB3: 16,
      rounds: 1,
    });
    const ac = assignAlwaysCombos(SOLO_ALWAYS_COMBOS, [[], [], [], [], []], chars as any, 5);
    const top = calc.topTeams(5, { pinnedByTeam: ac.pinnedByTeam, mustUse: ac.singles });
    const topSlugs = top.map((r) => r.slugs);
    const slugs = topSlugs.flat();
    expect(top.length, 'topTeams(5) did not build 5 teams').toBe(5);
    expect(new Set(slugs).size, 'a unit was reused across teams').toBe(slugs.length);
    // the always-units are pinned, so the burst spread must survive the search
    expect(classTeamCount(topSlugs, ['moran', 'anis-star', 'liter', 'little-mermaid'], 'I')).toBe(4);
  });
});
