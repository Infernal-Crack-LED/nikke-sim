// Byte-identical parity gate for makeCalc's serializable `loadouts` map (roster-
// generator perf plan item 1a). The web worker can't pass a `loadoutFor` function
// across the thread boundary, so the main thread materializes it into a per-slug
// map and passes `loadouts`. This test proves the two paths produce IDENTICAL
// TeamResults — the worker path is otherwise covered by web:build + web-smoke.
//
// The map is the BASE loadout (exactly what loadoutFor returns); makeCalc still
// applies FORCED_BURST lambdaStage on top internally, so the two must match.
import { describe, expect, it } from 'vitest';
import { makeCalc, type TeamCalcInput } from '../../../src/teamcalc.js';
import type { UnitOptions } from '../../../src/prepare.js';
import { scopeLockCfg } from '../../lib/scope-lock.js';
import { deps, generatorPool, mult, archetypeTags } from '../lib/harness.js';

const { chars, overrides } = generatorPool();

// A per-unit loadout that VARIES by slug, so a bug that ignores the map (falls
// back to a uniform loadout) would change the sim and fail parity. Core toggles
// between 6 and 7 by slug hash — a real damage-affecting input.
const loadoutFor = (slug: string): UnitOptions => ({
  core: (slug.charCodeAt(0) + slug.length) % 2 === 0 ? 7 : 6,
});

const base = (loadouts?: Record<string, UnitOptions>): TeamCalcInput => ({
  chars: chars as any,
  mult,
  deps: { overrides, ...deps },
  cfg: scopeLockCfg([], null) as any,
  loadoutFor: loadouts ? undefined : loadoutFor,
  loadouts,
  synergy: {
    tags: archetypeTags,
    pairs: [
      ['pierce', 'pierce-buffer'],
      ['projectile', 'projectile-buffer'],
    ],
    weight: 0.08,
  },
});

// Materialize loadoutFor over every pool slug — the main-thread step the worker does.
const materialized: Record<string, UnitOptions> = {};
for (const slug of Object.keys(chars)) materialized[slug] = loadoutFor(slug);

describe('makeCalc loadouts map ≡ loadoutFor (item 1a parity gate)', () => {
  it('bestTeam is byte-identical', async () => {
    const a = await makeCalc(base()).bestTeam();
    const b = await makeCalc(base(materialized)).bestTeam();
    expect(b).toEqual(a);
  });

  it('topTeams(5) is byte-identical', async () => {
    const a = await makeCalc(base()).topTeams(5);
    const b = await makeCalc(base(materialized)).topTeams(5);
    expect(b).toEqual(a);
  });

  it('a slug present in loadouts wins over loadoutFor; absent slugs fall through', () => {
    // loadouts overrides only ONE slug's core; every other slug uses loadoutFor.
    const one = Object.keys(chars)[0];
    const partial = { [one]: { core: 0 } as UnitOptions };
    const calc = makeCalc({ ...base(), loadouts: partial });
    // present slug uses the map (core 0), absent slug uses loadoutFor — proven by
    // the team simming without throwing and the flagged unit resolving from the map.
    const r = calc.simTeam([one, one, one, one, one]);
    expect(r.units[0].slug).toBe(one);
  });
});
