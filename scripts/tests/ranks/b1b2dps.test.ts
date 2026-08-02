// B1/B2 DPS board team-assembly pins (src/ranks/b1b2dps.ts).
//
// These tests pin the control-team shape for each burst category, partner
// profile, and forced off-stage row. They are cheap pure-function checks over
// buildTeam and should catch slot-arithmetic regressions (e.g. the tested unit
// landing in the wrong slot, a partner overwriting the wrong slot, or a stage
// left unfilled).
import { describe, expect, it } from 'vitest';
import {
  buildTeam,
  dpsFor,
  rankB1B2Dps,
  SYNTHETIC_AVISTAR,
  type B1B2TestedUnit,
} from '../../../src/ranks/b1b2dps.js';
import {
  NOOP_B1,
  NOOP_B2,
  NOOP_B3,
  NOOP_B3_RL,
  NOOP_CHARACTERS,
} from '../../../src/dpschart/noop.js';
import type { RanksCtx } from '../../../src/ranks/burstgen.js';
import { data, mult, cubes, olLines, skillLevels } from '../lib/harness.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import type { OverrideFile } from '../../../src/skills/index.js';

const ctx: RanksCtx = {
  characters: data.characters as any,
  mult,
  deps: {} as any,
};

const overrides: Record<string, OverrideFile | undefined> = {};
for (const slug of Object.keys(data.characters)) {
  overrides[slug] = loadOverride(slug);
}
for (const slug of [...Object.keys(NOOP_CHARACTERS), SYNTHETIC_AVISTAR]) {
  overrides[slug] = loadOverride(slug);
}
const fullCtx: RanksCtx = {
  characters: data.characters as any,
  mult,
  deps: { overrides, skillLevels, cubes, olLines },
};

function unit(
  slug: string,
  effectiveBurst: 'I' | 'II',
  forceStage?: 1 | 2,
  profile: string | null = null
): B1B2TestedUnit {
  const c = data.characters[slug];
  return {
    slug,
    effectiveBurst,
    element: c.element as any,
    profile,
    forceStage,
  };
}

describe('b1b2 dps team assembly', () => {
  it('20s B1 plain row keeps two B2s and no extra B1', () => {
    expect(buildTeam(unit('anis-star', 'I'), ctx)).toEqual([
      'anis-star',
      NOOP_B2,
      NOOP_B2,
      NOOP_B3_RL,
      NOOP_B3,
    ]);
  });

  it('20s B1 with a B1 partner uses the 40s B1 template (partner replaces the no-op B1)', () => {
    expect(
      buildTeam(
        unit('anis-star', 'I', undefined, 'with-avistar'),
        ctx,
        SYNTHETIC_AVISTAR
      )
    ).toEqual(['anis-star', SYNTHETIC_AVISTAR, NOOP_B2, NOOP_B3_RL, NOOP_B3]);
  });

  it('20s B1 with a generic other B1 switches to the 40s template (partner takes the B1 slot, one no-op B2 is dropped)', () => {
    expect(
      buildTeam(
        unit('anis-star', 'I', undefined, 'with-other-b1'),
        ctx,
        NOOP_B1
      )
    ).toEqual(['anis-star', NOOP_B1, NOOP_B2, NOOP_B3_RL, NOOP_B3]);
  });

  it('40s B1 plain row has a second no-op B1', () => {
    // rosanna is a 40s B1.
    expect(buildTeam(unit('rosanna', 'I'), ctx)).toEqual([
      'rosanna',
      NOOP_B1,
      NOOP_B2,
      NOOP_B3_RL,
      NOOP_B3,
    ]);
  });

  it('B2 plain row has a no-op B1 and a second no-op B2', () => {
    expect(buildTeam(unit('crown', 'II'), ctx)).toEqual([
      NOOP_B1,
      'crown',
      NOOP_B2,
      NOOP_B3_RL,
      NOOP_B3,
    ]);
  });

  it('B2 with a partner replaces the second no-op B2', () => {
    expect(
      buildTeam(unit('crown', 'II', undefined, 'with-chime'), ctx, 'chime')
    ).toEqual([NOOP_B1, 'crown', 'chime', NOOP_B3_RL, NOOP_B3]);
  });

  it('Red Hood forced as B1 uses the 40s B1 template and pins her to stage 1', () => {
    expect(buildTeam(unit('red-hood', 'I', 1, 'as-b1'), ctx)).toEqual([
      'red-hood',
      NOOP_B1,
      NOOP_B2,
      NOOP_B3_RL,
      NOOP_B3,
    ]);
  });

  it('Red Hood forced as B2 keeps the standard B2 shape and pins her to stage 2', () => {
    expect(buildTeam(unit('red-hood', 'II', 2, 'as-b2'), ctx)).toEqual([
      NOOP_B1,
      'red-hood',
      NOOP_B2,
      NOOP_B3_RL,
      NOOP_B3,
    ]);
  });

  it('Rapi: Red Hood forced as B1 uses the 40s B1 template and pins her to stage 1', () => {
    expect(buildTeam(unit('rapi-red-hood', 'I', 1, 'as-b1'), ctx)).toEqual([
      'rapi-red-hood',
      NOOP_B1,
      NOOP_B2,
      NOOP_B3_RL,
      NOOP_B3,
    ]);
  });
});

describe('b1b2 dps integration', () => {
  it('forced rows run through the engine and produce non-zero DPS', () => {
    const rapi = dpsFor(
      'c0-neutral',
      unit('rapi-red-hood', 'I', 1, 'as-b1'),
      fullCtx
    );
    expect(rapi, 'rapi-red-hood as B1').toBeGreaterThan(0);

    const redHoodB1 = dpsFor(
      'c0-neutral',
      unit('red-hood', 'I', 1, 'as-b1'),
      fullCtx
    );
    expect(redHoodB1, 'red-hood as B1').toBeGreaterThan(0);

    const redHoodB2 = dpsFor(
      'c0-neutral',
      unit('red-hood', 'II', 2, 'as-b2'),
      fullCtx
    );
    expect(redHoodB2, 'red-hood as B2').toBeGreaterThan(0);
  });

  it('Anis: Star profile rows run and differ from her plain row', () => {
    const plain = dpsFor('c0-neutral', unit('anis-star', 'I'), fullCtx);
    const withMg = dpsFor(
      'c0-neutral',
      unit('anis-star', 'I', undefined, 'with-avistar'),
      fullCtx
    );
    const withOther = dpsFor(
      'c0-neutral',
      unit('anis-star', 'I', undefined, 'with-other-b1'),
      fullCtx
    );
    expect(plain).toBeGreaterThan(0);
    expect(withMg).toBeGreaterThan(0);
    expect(withOther).toBeGreaterThan(0);
    // The two profile rows differ both from the plain row and from each other
    // (different partner weapons + the 20s-B1 template switch).
    expect(withMg).not.toEqual(plain);
    expect(withOther).not.toEqual(plain);
    expect(withMg).not.toEqual(withOther);
  });

  it('eleadv cells use the boss element the tested unit beats', () => {
    // Anis: Star is Water; she is advantaged against a Fire-code boss.
    const neutral = dpsFor('c0-neutral', unit('anis-star', 'I'), fullCtx);
    const eleadv = dpsFor('c0-eleadv', unit('anis-star', 'I'), fullCtx);
    expect(
      eleadv,
      'Water unit deals more DPS against a Fire boss'
    ).toBeGreaterThan(neutral);
  });

  it('multi-element units use their native element for the eleadv cell', () => {
    // Rapi: Red Hood is native Fire and also counts as Iron via advantageVs.
    // The board's eleadv cell must use her NATIVE element (Fire → Wind boss),
    // not her kit-derived element (Iron → Electric boss).
    const neutral = dpsFor(
      'c0-neutral',
      unit('rapi-red-hood', 'I', 1, 'as-b1'),
      fullCtx
    );
    const eleadv = dpsFor(
      'c0-eleadv',
      unit('rapi-red-hood', 'I', 1, 'as-b1'),
      fullCtx
    );
    expect(eleadv, 'native-advantage cell is applied').toBeGreaterThan(neutral);
    const c = data.characters['rapi-red-hood'];
    expect(
      c.countsAsElements?.length,
      'rapi-red-hood is multi-element'
    ).toBeGreaterThan(1);
  });

  it('rankB1B2Dps produces a ranked list for every cell', () => {
    const population: B1B2TestedUnit[] = [
      unit('anis-star', 'I'),
      unit('crown', 'II'),
      unit('red-hood', 'I', 1, 'as-b1'),
      unit('rapi-red-hood', 'I', 1, 'as-b1'),
    ];
    const ranked = rankB1B2Dps(population, fullCtx);
    for (const cell of [
      'c0-neutral',
      'c0-eleadv',
      'c100-neutral',
      'c100-eleadv',
    ] as const) {
      expect(ranked[cell].length, cell).toBe(population.length);
      expect(ranked[cell][0].rank, cell).toBe(1);
      for (const row of ranked[cell]) {
        expect(row.dps, `${cell} ${row.slug}`).toBeGreaterThan(0);
      }
    }
  });
});
