// skill-level-scale.test.ts — the skill-level scaler (src/skills/scale.ts).
//
// Two silent-failure classes are pinned here, both reported from a live Shooting Range comparison
// (2026-08-25) where a unit at 1/1/1 simulated ~2x its measured damage:
//
//   1. An effect kind with no case in scaleEffect returned its magnitude untouched AND emitted no
//      warning. `weaponSwap.damagePct` was the worst — a burst weapon mode's per-shot multiplier
//      is often the carrier's largest damage term.
//   2. A DERIVED authored value (a fold of two kit lines, a time-averaged stack ramp, a stack-cap
//      product) matches no level-table entry, so it stayed at max level. `levelScale` names the
//      anchors it was derived from.
//
// Fixtures are synthetic: `arrays` mimics a blablalink slot table (10 entries, index = level-1).
import { describe, expect, it } from 'vitest';
import { scaleBlocks } from '../../src/skills/scale.js';
import type { Block, EffectDef } from '../../src/skills/types.js';

/** A level array whose max is `max` and which scales linearly down to `ratio × max` at level 1. */
const ramp = (max: number, ratio = 0.6): number[] =>
  Array.from(
    { length: 10 },
    (_, i) => +(max * (ratio + ((1 - ratio) * i) / 9)).toFixed(4)
  );

const ARRAYS = {
  skill1: [ramp(150), ramp(380.46), ramp(15.2)],
  skill2: [ramp(20.27), ramp(1.4)],
  burst: [ramp(275.18), ramp(645.33), Array(10).fill(10)],
};
const L10 = { skill1: 10, skill2: 10, burst: 10 };

function run(
  slot: 'skill1' | 'skill2' | 'burst',
  effect: EffectDef,
  level: number
): { effect: EffectDef; warnings: string[] } {
  const blocks: Block[] = [
    {
      slot,
      trigger: { kind: 'passive' },
      target: { kind: 'self' },
      effects: [effect],
    },
  ];
  const warnings: string[] = [];
  const out = scaleBlocks(blocks, ARRAYS, { ...L10, [slot]: level }, warnings);
  return { effect: out[0].effects[0], warnings };
}

describe('scaleBlocks — effect kinds that carry a level-scaled magnitude', () => {
  it('scales weaponSwap.damagePct (was silently kept at max level, no warning)', () => {
    const { effect, warnings } = run(
      'burst',
      { kind: 'weaponSwap', damagePct: 275.18, durationSec: 10 },
      1
    );
    expect((effect as { damagePct: number }).damagePct).toBeCloseTo(
      275.18 * 0.6,
      2
    );
    expect(warnings).toEqual([]);
  });

  it('does NOT scale damagePct on a sameWeapon swap — that value is the base weapon stat', () => {
    // A same-weapon swap re-flavors the gun already in hand, so damagePct is by construction the
    // character's own normalAttackMultiplier — a WEAPON stat, level-invariant.
    const { effect, warnings } = run(
      'burst',
      {
        kind: 'weaponSwap',
        damagePct: 69.04,
        sameWeapon: true,
        durationSec: 10,
      },
      1
    );
    expect((effect as { damagePct: number }).damagePct).toBe(69.04);
    expect(warnings).toEqual([]);
  });

  it.each([
    ['fillGauge', { kind: 'fillGauge', pct: 275.18 }, 'pct'],
    ['shield', { kind: 'shield', maxHpPct: 275.18 }, 'maxHpPct'],
    ['stackedNuke', { kind: 'stackedNuke', atkPct: 275.18 }, 'atkPct'],
    ['storedHit', { kind: 'storedHit', atkPct: 275.18 }, 'atkPct'],
  ])('scales %s.%s', (_kind, effect, field) => {
    const out = run('burst', effect as EffectDef, 1);
    expect(
      (out.effect as unknown as Record<string, number>)[field]
    ).toBeCloseTo(275.18 * 0.6, 2);
    expect(out.warnings).toEqual([]);
  });
});

describe('scaleBlocks — levelScale for DERIVED authored values', () => {
  it('a fold of two kit lines scales as the sum of both anchors at that level', () => {
    // nayuta S1: the 150% full-charge line + the 380.46% stage-target line, folded into one rider.
    const { effect, warnings } = run(
      'skill1',
      {
        kind: 'buff',
        stat: 'extraHitDamagePct',
        value: 530.46,
        durationSec: 10,
        levelScale: { value: [150, 380.46] },
      },
      1
    );
    // Exact per-level sum, NOT a flat ratio applied to the folded total.
    expect((effect as { value: number }).value).toBeCloseTo(
      ARRAYS.skill1[0][0] + ARRAYS.skill1[1][0],
      2
    );
    expect(warnings).toEqual([]);
  });

  it('a time-averaged value scales proportionally to its source anchor', () => {
    // nayuta S2: 15.2 ATK% time-averaged to 14.4 over the stack ramp.
    const { effect } = run(
      'skill1',
      {
        kind: 'buff',
        stat: 'atkPct',
        value: 14.4,
        levelScale: { value: [15.2] },
      },
      1
    );
    expect((effect as { value: number }).value).toBeCloseTo(14.4 * 0.6, 3);
  });

  it('a stack-cap product scales proportionally to the per-stack anchor', () => {
    // nayuta S2: Hit Rate 1.4%/stack × 30 stacks = 42.
    const { effect } = run(
      'skill2',
      {
        kind: 'buff',
        stat: 'hitRatePct',
        value: 42,
        levelScale: { value: [1.4] },
      },
      1
    );
    expect((effect as { value: number }).value).toBeCloseTo(42 * 0.6, 3);
  });

  it('an unresolvable anchor warns and keeps the max-level value rather than mis-scaling', () => {
    const { effect, warnings } = run(
      'skill1',
      {
        kind: 'buff',
        stat: 'atkPct',
        value: 530.46,
        levelScale: { value: [999.99] },
      },
      1
    );
    expect((effect as { value: number }).value).toBe(530.46);
    expect(warnings.join()).toMatch(
      /levelScale anchor 999\.99 is not in the level table/
    );
  });
});

describe('scaleBlocks — invariants', () => {
  it('level 10 is a no-op that emits no warnings even for unmatched values', () => {
    const { effect, warnings } = run(
      'burst',
      { kind: 'flatDamage', atkPct: 1234.5 },
      10
    );
    expect((effect as { atkPct: number }).atkPct).toBe(1234.5);
    expect(warnings).toEqual([]);
  });

  it('still warns for a derived value carrying no levelScale annotation', () => {
    const { effect, warnings } = run(
      'skill2',
      { kind: 'buff', stat: 'atkPct', value: 16.8 },
      1
    );
    expect((effect as { value: number }).value).toBe(16.8);
    expect(warnings.join()).toMatch(/no level table match for 16\.8/);
  });

  it('durations are never scaled', () => {
    const { effect } = run(
      'burst',
      {
        kind: 'weaponSwap',
        damagePct: 275.18,
        durationSec: 10,
        chargeTimeSec: 2.13,
      },
      1
    );
    expect((effect as { durationSec: number }).durationSec).toBe(10);
    expect((effect as { chargeTimeSec: number }).chargeTimeSec).toBe(2.13);
  });
});
