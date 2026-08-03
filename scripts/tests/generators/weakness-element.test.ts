// Regression test for the generator's boss-weakness element rule.
//
// When an elemental weakness is selected, every generated team must field at
// least one advantaged unit of that element (src/teamcalc.ts requireElement →
// elementOk/legal). Applies to solo (topTeams) and union raid (per-team
// bestTeam, which is what runUnionTopTeams calls). A pool with no unit of the
// required element is unbuildable (null). With no weakness selected
// (requireElement null) there is no element constraint. Only READS the engine.
import { describe, expect, it } from 'vitest';
import type { Element } from '../../../src/types.js';
import { makeCalc } from '../../../src/teamcalc.js';
import { fastCfg } from '../lib/fast-cfg.js';
import { deps, generatorPool, mult, rotationLegal } from '../lib/harness.js';

const { genChars, chars, overrides } = generatorPool();

const calcWith = (requireElement: Element | null, keep?: Set<string>) =>
  makeCalc({
    chars: chars as any,
    mult,
    deps: { overrides, ...deps },
    // Shorter fight for the element-gate tests: they assert the weakness rule
    // and the static rotation-legality check (src/teamcalc.ts stageCovered,
    // which uses only burstCooldownSec, not cfg.durationSec), not multi-cycle
    // sim sustainability or exact damage numbers.
    cfg: fastCfg([], null) as any,
    loadout: {},
    blocked: keep ? Object.keys(chars).filter((s) => !keep.has(s)) : [],
    requireElement,
    poolB3: 16,
    rounds: 1,
  });

const elOf = (s: string): string => (chars as any)[s].element;
const hasEl = (slugs: string[], e: Element) => slugs.some((s) => elOf(s) === e);
const legal = (slugs: string[]) => rotationLegal(chars, slugs); // cooldown rule unchanged

// Pick the element with the most generator-supported units so positive cases
// have ample candidates.
const ELEMENTS: Element[] = ['Fire', 'Water', 'Wind', 'Electric', 'Iron'];
const countEl = (e: Element) => genChars.filter((c) => c.element === e).length;
const E = [...ELEMENTS].sort((a, b) => countEl(b) - countEl(a))[0];

describe(`boss weakness gate (most-populated element = the test element)`, () => {
  it('solo topTeams(5): every team fields ≥1 advantaged unit and stays rotation-legal', async () => {
    const top = await calcWith(E).topTeams(5);
    expect(
      top.length,
      `topTeams(5) built nothing with weakness ${E}`
    ).toBeGreaterThanOrEqual(1);
    const bad = top.filter((t) => !hasEl(t.slugs, E));
    expect(
      bad.map((t) => t.slugs.join(',')),
      `team(s) missing ${E}`
    ).toEqual([]);
    expect(
      top.every((t) => legal(t.slugs)),
      'a team no longer sustains the B1/B2 rotation'
    ).toBe(true);
  });

  it('union-style per-team bestTeam respects each team’s own weakness, disjointly', async () => {
    const used = new Set<string>();
    let allHave = true;
    let built = 0;
    for (const weak of [E, ELEMENTS.find((x) => x !== E)!]) {
      const t = await calcWith(weak).bestTeam({ exclude: used });
      if (!t) {
        break;
      }
      built++;
      if (!hasEl(t.slugs, weak)) {
        allHave = false;
      }
      t.slugs.forEach((s) => used.add(s));
    }
    expect(built, 'fewer than 2 union teams built').toBeGreaterThanOrEqual(2);
    expect(allHave, 'a union team missed its own weakness element').toBe(true);
  });

  it('a pool with NO unit of the required element is unbuildable', async () => {
    const keep = new Set(Object.keys(chars).filter((s) => elOf(s) !== E));
    expect(
      await calcWith(E, keep).bestTeam(),
      `no ${E} unit in pool but a team was built`
    ).toBeNull();
  });

  it('requireElement null → no element gate (baseline still builds)', async () => {
    const t = await calcWith(null).bestTeam();
    expect(t).not.toBeNull();
    expect(t!.slugs).toHaveLength(5);
  });
});
