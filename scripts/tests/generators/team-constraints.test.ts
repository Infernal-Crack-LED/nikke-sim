// Hard roster rules (owner ruling 2026-07-24, replacing the retired curated
// always-include sets): `together` groups are all-or-none per team; `companions`
// requires a satisfier teammate whenever the trigger unit is fielded. These are
// CONDITIONS on being fielded, never a reason to field a unit. Enforced in team
// legality AND inside the proxy enumeration — this suite proves the search-level
// behavior on the real generator pool with the real TEAM_CONSTRAINTS shapes
// (mint+prika together; naga → a `shield`-tagged teammate).
import { describe, expect, it } from 'vitest';
import { makeCalc, type TeamCalcInput } from '../../../src/teamcalc.js';
import { fastCfg } from '../lib/fast-cfg.js';
import {
  archetypeTags,
  deps,
  distinct5,
  generatorPool,
  mult,
} from '../lib/harness.js';

const { chars, overrides } = generatorPool();

const SHIELDERS = Object.entries(archetypeTags)
  .filter(([slug, tags]) => slug !== 'naga' && tags.includes('shield'))
  .map(([slug]) => slug);
const CONSTRAINTS: TeamCalcInput['constraints'] = {
  together: [['mint', 'prika']],
  companions: [{ unit: 'naga', anyOf: SHIELDERS }],
};

const calcWith = (blocked: string[] = []) =>
  makeCalc({
    chars: chars as any,
    mult,
    deps: { overrides, ...deps },
    // Shorter fight for constraint tests: they assert together/companions rules,
    // not absolute team quality or exact damage numbers.
    cfg: fastCfg([], null) as any,
    loadout: {},
    blocked,
    constraints: CONSTRAINTS,
    poolB3: 16,
    rounds: 1,
  });

// the real rules only bite when the units exist in the pool — fail loudly if a
// fixture unit ever drops out of the generator pool
for (const s of ['mint', 'prika', 'naga']) {
  if (!(chars as any)[s]) {
    throw new Error(`${s}: not in generator pool — fixture stale`);
  }
}

describe('team constraints (owner ruling 2026-07-24)', () => {
  it('locking mint pulls prika onto the same team (together rule)', async () => {
    const t = await calcWith().bestTeam({ mustInclude: ['mint'] });
    expect(t, 'mint-locked team built nothing').not.toBeNull();
    expect(distinct5(t!.slugs)).toBe(true);
    expect(t!.slugs).toContain('mint');
    expect(t!.slugs).toContain('prika');
  });

  it('locking naga brings a shield-granting teammate (companions rule)', async () => {
    const t = await calcWith().bestTeam({ mustInclude: ['naga'] });
    expect(t, 'naga-locked team built nothing').not.toBeNull();
    expect(t!.slugs).toContain('naga');
    expect(
      t!.slugs.some((s) => SHIELDERS.includes(s)),
      `no shielder beside naga in ${t!.slugs.join(',')}`
    ).toBe(true);
  });

  it('the together rule relaxes when a member is unavailable to the search', async () => {
    const t = await calcWith(['prika']).bestTeam({ mustInclude: ['mint'] });
    expect(
      t,
      'mint should be fieldable when prika is blocked (relax)'
    ).not.toBeNull();
    expect(t!.slugs).toContain('mint');
    expect(t!.slugs).not.toContain('prika');
  });

  it('rosters never field a strict subset of a together group', async () => {
    const top = await calcWith().topTeams(3);
    for (const t of top) {
      const n =
        (t.slugs.includes('mint') ? 1 : 0) +
        (t.slugs.includes('prika') ? 1 : 0);
      expect(
        n === 0 || n === 2,
        `mint/prika split on ${t.slugs.join(',')}`
      ).toBe(true);
    }
  });
});
