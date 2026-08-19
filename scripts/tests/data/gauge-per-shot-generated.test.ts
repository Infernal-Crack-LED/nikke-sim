// data/gauge-per-shot.json is GENERATED from the datamined shot_detail rows in
// data/characters.json (src/data/gauge-per-shot-gen.ts, called by src/data/sync.ts). This fixture
// is what stops it from drifting back into a hand-maintained file.
//
// It failed to exist for a long time, and the cost was concrete: rows were added one unit at a time
// as somebody happened to investigate that unit, so 75 sim-supported units had no row at all and
// silently ran on a weapon class modal — the wrong number for 23 of them, with their real datamined
// value sitting unread in characters.json the whole time. The same bug was found and fixed for
// exactly ONE unit (commit 0de5ba51, sugar) and never swept.
//
// The three tests below are deliberately different questions:
//   1. the committed artifact IS what a sync would write (catches a hand-edit, and a stale file
//      after a characters.json sync),
//   2. the conversion rules still reproduce values that were hand-authored BEFORE the generator
//      existed (an independent check — those numbers were derived by hand, not by this code),
//   3. the hand-authored exceptions are still exceptions (catches an override silently becoming
//      redundant, or the datamine moving under one).
import { describe, expect, it } from 'vitest';
import rawData from '../../../data/characters.json' with { type: 'json' };
import committed from '../../../data/gauge-per-shot.json' with { type: 'json' };
import {
  EXTRA_FIELDS,
  SYNTHETIC_ROWS,
  VALUE_OVERRIDES,
  buildGaugePerShot,
  convert,
  shotDetailOf,
} from '../../../src/data/gauge-per-shot-gen.js';

/** Read a unit's weapon + datamined row the same way the generator does. */
function unit(slug: string) {
  const c = (characters as unknown as Record<string, { weapon?: string }>)[
    slug
  ];
  return { weapon: c.weapon, sd: shotDetailOf(c) };
}

/** The datamined target column, converted to the engine's per-trigger value. */
function targetOf(slug: string): number | null {
  const { weapon, sd } = unit(slug);
  return convert(sd?.target_burst_energy_pershot, weapon, sd);
}

const characters = (rawData as unknown as { characters: Record<string, never> })
  .characters;

describe('gauge-per-shot.json is generated, not hand-maintained', () => {
  it('the committed artifact is exactly what a sync would write', () => {
    // Deep equality, not a spot check: a hand-edit anywhere in the file fails here, and so does a
    // characters.json sync that moved a datamined value without regenerating.
    expect(buildGaugePerShot(characters)).toEqual(committed);
  });

  it('every sim-supported unit with a datamined gauge column has a row', () => {
    const missing = Object.entries(
      characters as unknown as Record<
        string,
        {
          simSupported?: boolean;
          role?: {
            weapon?: { shot_detail?: { target_burst_energy_pershot?: number } };
          };
        }
      >
    )
      .filter(([slug, c]) => {
        const t = c.role?.weapon?.shot_detail?.target_burst_energy_pershot;
        return (
          c.simSupported === true &&
          typeof t === 'number' &&
          t > 0 &&
          !(slug in (committed as Record<string, unknown>))
        );
      })
      .map(([slug]) => slug);
    // This is the regression that motivated the generator: a unit whose datamined value exists but
    // which the engine still bills at the weapon class modal.
    expect(missing).toEqual([]);
  });

  it('the synthetic control rows survive regeneration', () => {
    // They have no characters.json entry, so nothing can derive them — and every rank board's
    // control team is built from them. A generator that dropped them would quietly rebase the
    // boards on class modals.
    for (const slug of Object.keys(SYNTHETIC_ROWS)) {
      expect(committed).toHaveProperty(slug);
      expect((committed as Record<string, unknown>)[slug]).toEqual(
        SYNTHETIC_ROWS[slug]
      );
    }
  });
});

describe('the conversion rules reproduce hand-derived values', () => {
  // INDEPENDENT CHECK: these numbers were authored by hand, one unit at a time, before this
  // generator existed — so reproducing them exercises the rules against labels this code did not
  // produce. Each case pins a different clause.
  it('plain /100 scale (no pellet or muzzle factor)', () => {
    expect(targetOf('maiden-ice-rose')).toBe(364);
  });

  it('shotgun table values are PER PELLET → × shot_count', () => {
    expect(targetOf('drake')).toBe(900);
  });

  it('multi-muzzle rows fire every muzzle per pull → × muzzle_count', () => {
    expect(targetOf('quency-escape-queen')).toBeCloseTo(29.6, 6);
  });

  it('the two factors COMPOSE — the case that pins the compound rule', () => {
    // zwei: SG with shot_count 5 AND muzzle_count 2. 70 × 5 × 2 = 700. Applying either factor
    // alone gives 350 or 140, so this row is the only one that can catch a half-applied rule.
    expect(targetOf('zwei')).toBe(700);
  });

  it('fullChargeBonus is a plain /100 multiplier — pellet/muzzle factors must NOT apply', () => {
    // zwei again: if the pellet factor leaked into the focus multiplier she would read 250 × 5 × 2.
    expect(
      (committed as Record<string, { fullChargeBonus: number }>).zwei
        .fullChargeBonus
    ).toBe(0);
    expect(
      (committed as Record<string, { fullChargeBonus: number }>).alice
        .fullChargeBonus
    ).toBe(350);
  });
});

describe('hand-authored exceptions stay exceptional', () => {
  it('neon-vision-eye is the ONLY unit whose stored values contradict her datamine', () => {
    // RL/Electric, aka "nve" — NOT `neon` (SG/Fire) or `neon-blue-ocean` (MG/Water).
    expect(Object.keys(VALUE_OVERRIDES)).toEqual(['neon-vision-eye']);
    // The override is 4× the datamine. If these ever coincide, the override is redundant and
    // should be deleted rather than left to look load-bearing.
    expect(targetOf('neon-vision-eye')).toBe(150);
    expect(
      (committed as Record<string, { targetPerTrigger: number }>)[
        'neon-vision-eye'
      ].targetPerTrigger
    ).toBe(600);
  });

  it('a datamine shift under an override FAILS rather than silently winning', () => {
    const moved = structuredClone(characters) as unknown as Record<
      string,
      {
        role: {
          weapon: { shot_detail: { target_burst_energy_pershot: number } };
        };
      }
    >;
    moved[
      'neon-vision-eye'
    ].role.weapon.shot_detail.target_burst_energy_pershot = 99999;
    expect(() =>
      buildGaugePerShot(moved as unknown as Record<string, never>)
    ).toThrow(/datamine moved under the neon-vision-eye override/);
  });

  it('non-derivable fields survive regeneration', () => {
    // No shot_detail column produces these: helm/maxwell-ordinary-mechanic's flatPerTrigger are
    // kit-derived, anis-star's baseGaugeProb is measured.
    for (const [slug, fields] of Object.entries(EXTRA_FIELDS)) {
      for (const [k, v] of Object.entries(fields)) {
        expect(
          (committed as Record<string, Record<string, unknown>>)[slug][k]
        ).toBe(v);
      }
    }
  });
});
