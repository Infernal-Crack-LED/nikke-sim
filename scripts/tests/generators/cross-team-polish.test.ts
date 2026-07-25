// Cross-team polish pass + display order (roster-generator perf plan item 4).
//
// Greedy topTeams builds team i from the pool minus teams 1..i-1, so a later
// team could beat an earlier one — an inversion that PROVES the earlier team's
// local search missed a team its own pool contained (measured on the full bench
// fixture: team 4 2343M < team 5 2369M). Item 4 answers that in two places:
//
//   1. polish passes — re-run the sequential build with the previous roster's
//      teams offered to every team as extra local-search starts, accepting a
//      pass only if the TOTAL roster score strictly improves;
//   2. display order — return the teams strongest-first, unless the user pinned
//      units to specific team ROWS (those rows map to team indices in the UI).
//
// These tests use a small restricted pool (fast) and NO meta/synergy input, so
// the ranking score reduces to raw teamDamage and the sums here ARE the roster
// score the polish gate compares.
import { describe, expect, it } from 'vitest';
import { makeCalc } from '../../../src/teamcalc.js';
import { scopeLockCfg } from '../../lib/scope-lock.js';
import { deps, distinct5, generatorPool, mult } from '../lib/harness.js';

const { genChars, chars, overrides } = generatorPool();
const byBurst = (b: string) =>
  genChars.filter((c) => c.burst === b).map((c) => c.slug);
// A 20-unit pool where the greedy inversion BITES: 4 Burst-I units means 4
// disjoint teams are role-legal (see topTeams-role-bound.test.ts), but greedy
// spends the leftovers badly on team 2 and stalls at THREE teams. The polish
// pass hands team 2 the team greedy found at index 3, refines from there, and
// the cascade behind it frees a legal fourth team (+13% roster damage).
const N = 4;
const POOL = new Set([
  ...byBurst('I').slice(0, 4),
  ...byBurst('II').slice(2, 8),
  ...byBurst('III').slice(12, 22),
]);

// One instance for the whole file: the calc memoizes sims, so both A/B arms and
// every pinned variant reuse them (results are deterministic either way).
const calc = makeCalc({
  chars: chars as any,
  mult,
  deps: { overrides, ...deps },
  cfg: scopeLockCfg([], null) as any,
  loadout: {},
  blocked: Object.keys(chars).filter((s) => !POOL.has(s)),
});

const total = (teams: { teamDamage: number }[]) =>
  teams.reduce((a, t) => a + t.teamDamage, 0);

describe('cross-team polish (item 4)', () => {
  it('recovers a roster greedy left on the table', async () => {
    const greedy = await calc.topTeams(N, { polishPasses: 0 });
    const polished = await calc.topTeams(N);
    // greedy stalls one team short of what the Burst-I count allows
    expect(greedy).toHaveLength(3);
    expect(polished).toHaveLength(4);
    expect(total(polished) / total(greedy)).toBeGreaterThan(1.1);
  });

  it('never lowers the roster total, and keeps the teams legal + disjoint', async () => {
    const greedy = await calc.topTeams(N, { polishPasses: 0 });
    const polished = await calc.topTeams(N);
    expect(polished.length).toBeGreaterThanOrEqual(greedy.length);
    expect(total(polished)).toBeGreaterThanOrEqual(total(greedy) - 1e-6);
    expect(
      polished.every((t) => distinct5(t.slugs)),
      'a team is not 5 distinct units',
    ).toBe(true);
    const slugs = polished.flatMap((t) => t.slugs);
    expect(new Set(slugs).size, 'a unit was reused across teams').toBe(
      slugs.length,
    );
    expect(
      slugs.every((s) => POOL.has(s)),
      'polish fielded a blocked unit',
    ).toBe(true);
  });

  it('is idempotent — a third pass finds nothing a second did not', async () => {
    const two = await calc.topTeams(N);
    const many = await calc.topTeams(N, { polishPasses: 6 });
    expect(many.map((t) => t.slugs)).toEqual(two.map((t) => t.slugs));
  });

  it('returns teams strongest-first (no greedy inversion in the output)', async () => {
    const teams = await calc.topTeams(N);
    const dmg = teams.map((t) => t.teamDamage);
    expect(
      dmg.every((d, i) => i === 0 || d <= dmg[i - 1] + 1e-6),
      `roster is out of order: ${dmg.map((d) => Math.round(d / 1e6)).join(' / ')}M`,
    ).toBe(true);
  });

  it('keeps a row-pinned team in ITS row instead of sorting it away', async () => {
    // Pin the weakest team's exact 5 units to row 0. The pin forces that team
    // into row 0; a damage sort would move it to the back, so its surviving at
    // index 0 (below the row behind it) is the guard working.
    const base = await calc.topTeams(N);
    const weakest = base[base.length - 1].slugs;
    const pinned = await calc.topTeams(N, {
      pinnedByTeam: [weakest, [], [], []],
    });
    expect(pinned.length).toBeGreaterThan(1);
    expect(
      weakest.every((s) => pinned[0].slugs.includes(s)),
      'the row-0 pin did not land in row 0',
    ).toBe(true);
    expect(pinned[0].teamDamage).toBeLessThan(pinned[1].teamDamage);
  });

  it('sorts when only generic must-use units are given (no row identity)', async () => {
    const mustUse = [byBurst('III')[21], byBurst('II')[7]]; // in-pool, low-ranked
    const teams = await calc.topTeams(N, { mustUse });
    const dmg = teams.map((t) => t.teamDamage);
    expect(dmg.every((d, i) => i === 0 || d <= dmg[i - 1] + 1e-6)).toBe(true);
    const all = teams.flatMap((t) => t.slugs);
    expect(mustUse.every((s) => all.includes(s))).toBe(true);
  });
});
