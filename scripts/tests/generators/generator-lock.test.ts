// Functional test for the generator "lock-in" support in src/teamcalc.ts.
//
// The Team/Roster generators let the user lock Nikkes they want fielded:
//   - bestTeam({ mustInclude }) forces units into the one team (Team Generator);
//   - topTeams(n, { pinnedByTeam, mustUse }) pins units to specific teams and/or
//     requires generic "must-use" units somewhere (Roster Generator solo/union).
// This test proves locked units actually appear, illegal lock sets refuse to
// build (return null instead of a broken team), teams never share a unit, and the
// no-lock path is deterministic (unchanged behaviour). It only READS the engine.
import { describe, expect, it } from 'vitest';
import { assignMustUse, locksFeasible, makeCalc } from '../../../src/teamcalc.js';
import { scopeLockCfg } from '../../lib/scope-lock.js';
import { data, deps, distinct5, generatorPool, mult } from '../lib/harness.js';

const { genChars, chars, overrides } = generatorPool();

const calc = makeCalc({
  chars: chars as any,
  mult,
  deps: { overrides, ...deps },
  cfg: scopeLockCfg([], null) as any,
  loadout: {},
});

const byBurst = (b: string) => genChars.filter((c) => c.burst === b).map((c) => c.slug);
const b1 = byBurst('I');
const b2 = byBurst('II');
const b3 = byBurst('III');
if (b1.length < 3 || b2.length < 2 || b3.length < 2) {
  throw new Error('test pool too small to exercise lock combinations');
}
const name = (s: string) => data.characters[s]?.name ?? s;

describe('generator lock-in', () => {
  it('no-lock bestTeam builds a legal 5-team, deterministically', () => {
    const base1 = calc.bestTeam();
    const base2 = calc.bestTeam();
    expect(base1).not.toBeNull();
    expect(distinct5(base1!.slugs), 'no-lock team is not 5 distinct units').toBe(true);
    expect(base2).not.toBeNull();
    expect(base2!.slugs, 'no-lock bestTeam is not deterministic (behaviour changed)').toEqual(base1!.slugs);
  });

  it('fields a single locked unit', () => {
    const single = calc.bestTeam({ mustInclude: [b1[0]] });
    expect(single, `single lock ${name(b1[0])} built nothing`).not.toBeNull();
    expect(single!.slugs).toContain(b1[0]);
  });

  it('fields multiple compatible locks (B1 + B2 + B3)', () => {
    const multi = calc.bestTeam({ mustInclude: [b1[0], b2[0], b3[0]] });
    expect(
      multi,
      `three compatible locks (${name(b1[0])}, ${name(b2[0])}, ${name(b3[0])}) built nothing`,
    ).not.toBeNull();
    expect(distinct5(multi!.slugs)).toBe(true);
    for (const s of [b1[0], b2[0], b3[0]]) expect(multi!.slugs).toContain(s);
  });

  it('refuses an impossible lock set (3× Burst I) rather than build an illegal team', () => {
    expect(calc.bestTeam({ mustInclude: [b1[0], b1[1], b1[2]] })).toBeNull();
  });

  it('locksFeasible agrees with what bestTeam can build', () => {
    expect(locksFeasible([b1[0]], chars as any), 'single lock reported infeasible').toBe(true);
    expect(locksFeasible([b1[0], b2[0], b3[0]], chars as any), 'B1+B2+B3 reported infeasible').toBe(true);
    expect(locksFeasible([b1[0], b1[1], b1[2]], chars as any), '3× Burst I reported feasible').toBe(false);
  });

  it('no-lock topTeams builds 5 disjoint legal teams', () => {
    const top = calc.topTeams(5);
    const topSlugs = top.flatMap((t) => t.slugs);
    expect(top).toHaveLength(5);
    expect(top.every((t) => distinct5(t.slugs)), 'a team is not 5 distinct units').toBe(true);
    expect(new Set(topSlugs).size, 'topTeams reused a unit across teams').toBe(topSlugs.length);
  });

  it('honours pinned + generic locks without reusing a unit', () => {
    const locked = calc.topTeams(5, { pinnedByTeam: [[b1[0]]], mustUse: [b3[1]] });
    const lockedSlugs = locked.flatMap((t) => t.slugs);
    expect(locked.length, 'locked topTeams built nothing').toBeGreaterThan(0);
    expect(locked[0].slugs, `pinned ${name(b1[0])} is not on team 1`).toContain(b1[0]);
    expect(lockedSlugs, `generic must-use ${name(b3[1])} is not fielded`).toContain(b3[1]);
    expect(new Set(lockedSlugs).size, 'locked topTeams reused a unit across teams').toBe(lockedSlugs.length);
  });

  it('assignMustUse spreads generic units without duplicates or drops', () => {
    const asg = assignMustUse([b3[1], b2[1]], [[b1[0]]], chars as any, 5);
    const asgAll = asg.assigned.flat();
    expect(asg.unplaced, 'generic units left unplaced').toEqual([]);
    expect(asgAll).toContain(b3[1]);
    expect(asgAll).toContain(b2[1]);
    expect(new Set(asgAll).size, 'a generic unit was placed twice').toBe(asgAll.length);
    expect(asg.assigned[0], 'pinned unit leaked into the generic assignment').not.toContain(b1[0]);
  });
});
