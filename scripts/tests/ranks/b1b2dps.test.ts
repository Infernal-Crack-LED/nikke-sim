// B1/B2 DPS board team-assembly pins (src/ranks/b1b2dps.ts).
//
// These tests pin the control-team shape for each burst category, partner
// profile, and forced off-stage row. They are cheap pure-function checks over
// buildTeam and should catch slot-arithmetic regressions (e.g. a B1 partner
// overwriting a B2 in a 20s-B1 template).
import { describe, expect, it } from 'vitest';
import {
  buildTeam,
  SYNTHETIC_AVISTAR,
  type B1B2TestedUnit,
} from '../../../src/ranks/b1b2dps.js';
import {
  NOOP_B1,
  NOOP_B2,
  NOOP_B3,
  NOOP_B3_RL,
} from '../../../src/dpschart/noop.js';
import type { RanksCtx } from '../../../src/ranks/burstgen.js';
import { data, mult } from '../lib/harness.js';

const ctx: RanksCtx = {
  characters: data.characters as any,
  mult,
  deps: {} as any,
};

function unit(
  slug: string,
  effectiveBurst: 'I' | 'II',
  lambdaStage?: 1 | 2,
  profile: string | null = null
): B1B2TestedUnit {
  const c = data.characters[slug];
  return {
    slug,
    effectiveBurst,
    element: c.element as any,
    profile,
    lambdaStage,
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

  it('20s B1 with a generic other B1 keeps the B2 count intact', () => {
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
