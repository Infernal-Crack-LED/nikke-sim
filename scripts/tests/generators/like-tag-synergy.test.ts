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
import { describe, expect, it } from 'vitest';
import {
  assignAlwaysCombos,
  countSynergyPairs,
  makeCalc,
  type AlwaysCombos,
} from '../../../src/teamcalc.js';
import { scopeLockCfg } from '../../lib/scope-lock.js';
import { archetypeTags, deps, generatorPool, mult } from '../lib/harness.js';

// Mirrors web/src/App.tsx.
const SYNERGY_PAIRS: [string, string][] = [
  ['pierce', 'pierce-buffer'],
  ['projectile', 'projectile-buffer'],
];
const SYNERGY_WEIGHT = 0.08;

describe('countSynergyPairs — pure pair counting (synthetic tags)', () => {
  const tags: Record<string, string[]> = {
    'pierce-dealer': ['pierce'],
    'pierce-buffer': ['pierce-buffer'],
    'proj-dealer': ['projectile'],
    'proj-buffer': ['projectile-buffer'],
    'proj-both': ['projectile', 'projectile-buffer'],
    plain: ['buffer'],
  };
  const n = (slugs: string[]) => countSynergyPairs(slugs, tags, SYNERGY_PAIRS);

  it('counts a dealer + its matching buffer', () => {
    expect(n(['pierce-dealer', 'pierce-buffer']), 'dealer + matching buffer').toBe(1);
    expect(n(['pierce-dealer']), 'dealer alone must NOT satisfy').toBe(0);
    expect(n(['pierce-buffer']), 'buffer alone must NOT satisfy').toBe(0);
  });

  it('counts both pairs at once, and a unit carrying both halves on its own', () => {
    expect(n(['pierce-dealer', 'pierce-buffer', 'proj-dealer', 'proj-buffer'])).toBe(2);
    expect(n(['proj-both']), 'one unit carrying BOTH halves satisfies the pair alone').toBe(1);
  });

  it('counts nothing for unrelated, empty, or cross-wired teams', () => {
    expect(n(['plain']), 'unrelated tags satisfy nothing').toBe(0);
    expect(n([]), 'empty team satisfies nothing').toBe(0);
    // cross-wiring must NOT count: a pierce dealer + a projectile buffer is no pair.
    expect(n(['pierce-dealer', 'proj-buffer']), 'mismatched dealer/buffer counted').toBe(0);
  });
});

describe('countSynergyPairs — real archetype tags', () => {
  const n = (slugs: string[]) => countSynergyPairs(slugs, archetypeTags, SYNERGY_PAIRS);

  it('rapi-red-hood alone satisfies the projectile pair (dealer + self-buffer)', () => {
    expect(n(['rapi-red-hood'])).toBe(1);
  });

  it('alice (pierce dealer) + mint (pierce buffer) satisfy the pierce pair', () => {
    expect(n(['alice', 'mint'])).toBe(1);
  });
});

describe('projectile dealer tag — generated output', () => {
  const has = (slug: string, tag: string) => (archetypeTags[slug] ?? []).includes(tag);

  it('rapi-red-hood carries both the dealer and the self-buffer tag', () => {
    expect(has('rapi-red-hood', 'projectile'), 'missing the projectile dealer tag').toBe(true);
    expect(has('rapi-red-hood', 'projectile-buffer'), 'missing projectile-buffer (self-buff)').toBe(true);
  });

  it.each(['prika', 'mint', 'anis-star'])('%s is a pure projectile buffer', (s) => {
    expect(has(s, 'projectile-buffer'), `${s} lost projectile-buffer`).toBe(true);
    expect(has(s, 'projectile'), `${s} wrongly carries the projectile DEALER tag`).toBe(false);
  });
});

describe('generation still completes with the synergy bias active', () => {
  const { chars, overrides } = generatorPool();
  const calc = makeCalc({
    chars: chars as any,
    mult,
    deps: { overrides, ...deps },
    cfg: scopeLockCfg([], null) as any,
    loadout: {},
    poolB3: 16,
    rounds: 1,
    synergy: { tags: archetypeTags, pairs: SYNERGY_PAIRS, weight: SYNERGY_WEIGHT },
  });

  it('bestTeam builds with synergy', () => {
    const bt = calc.bestTeam({});
    expect(bt).not.toBeNull();
    expect(bt!.slugs).toHaveLength(5);
  });

  it('topTeams(5) builds 5 disjoint teams with synergy', () => {
    const SOLO_ALWAYS_COMBOS: AlwaysCombos = {
      pairs: [
        ['mint', 'prika'],
        ['mast-romantic-maid', 'anchor-innocent-maid'],
      ],
      oneOf: [{ anchor: 'crown', choices: ['helm', 'naga'] }],
      singles: ['moran', 'anis-star', 'liter', 'little-mermaid', 'nayuta', 'privaty'],
    };
    const ac = assignAlwaysCombos(SOLO_ALWAYS_COMBOS, [[], [], [], [], []], chars as any, 5);
    const top = calc.topTeams(5, { pinnedByTeam: ac.pinnedByTeam, mustUse: ac.singles });
    const slugs = top.flatMap((r) => r.slugs);
    expect(top).toHaveLength(5);
    expect(new Set(slugs).size, 'a unit was reused across teams').toBe(slugs.length);
  });
});
