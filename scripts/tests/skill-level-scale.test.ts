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
import { SCALABLE_FIELDS, scaleBlocks } from '../../src/skills/scale.js';
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

describe('scaleBlocks — findArr picks the RIGHT array when several share a max', () => {
  // A slot's table routinely holds constant arrays (a "for 10 sec" duration is [10,10,…]) next to a
  // real magnitude with the same max. A plain .find() took whichever came first; when that was the
  // constant, the magnitude stayed at max level with NO warning. Live cases: crust's burst
  // "Sustained Damage ▲10%" and prika's burst "Charge Damage ▲25%".
  const COLLIDE = {
    skill1: [],
    skill2: [],
    burst: [Array(10).fill(25), ramp(25), Array(10).fill(25)],
  };
  it('prefers the VARYING array over a constant one with the same max', () => {
    const warnings: string[] = [];
    const out = scaleBlocks(
      [
        {
          slot: 'burst',
          trigger: { kind: 'passive' },
          target: { kind: 'self' },
          effects: [{ kind: 'buff', stat: 'chargeDamagePct', value: 25 }],
        },
      ],
      COLLIDE,
      { skill1: 10, skill2: 10, burst: 1 },
      warnings
    );
    expect((out[0].effects[0] as { value: number }).value).toBeCloseTo(
      25 * 0.6,
      2
    );
    expect(warnings).toEqual([]);
  });
});

describe('scaleBlocks — perResource.mult is the LIVE magnitude', () => {
  // For a perResource buff/DoT the static value/atkPct is IGNORED at runtime; the magnitude is
  // recomputed as resources[name] × mult. Leaving mult unscaled pinned eight carriers' primary
  // numbers at max level with no warning (mihara-bonding-chain's Ensnaring DoT driver 25.08 etc).
  it('scales mult on a perResource dot', () => {
    const { effect, warnings } = run(
      'burst',
      {
        kind: 'dot',
        atkPct: 0,
        durationSec: 10,
        perResource: { name: 'chains', mult: 275.18 },
      },
      1
    );
    expect(
      (effect as { perResource: { mult: number } }).perResource.mult
    ).toBeCloseTo(275.18 * 0.6, 2);
    expect(warnings).toEqual([]);
  });

  it('scales mult on a perResource buff and leaves name intact', () => {
    const { effect } = run(
      'burst',
      {
        kind: 'buff',
        stat: 'atkPct',
        value: 0,
        perResource: { name: 'chips', mult: 645.33 },
      },
      1
    );
    const pr = (effect as { perResource: { name: string; mult: number } })
      .perResource;
    expect(pr.mult).toBeCloseTo(645.33 * 0.6, 2);
    expect(pr.name).toBe('chips');
  });

  it('honours a levelConst on perResource.mult', () => {
    const { effect, warnings } = run(
      'burst',
      {
        kind: 'buff',
        stat: 'atkPct',
        value: 0,
        perResource: { name: 'x', mult: 1234.5 },
        levelConst: ['perResource.mult'],
      },
      1
    );
    expect((effect as { perResource: { mult: number } }).perResource.mult).toBe(
      1234.5
    );
    expect(warnings).toEqual([]);
  });
});

describe('SCALABLE_FIELDS is the real manifest, not a stale mirror', () => {
  // validate-structural.ts IMPORTS this map to decide whether a levelScale/levelConst annotation
  // names a field the scaler will ever read. A hand-kept copy is the staleness class that already
  // bit this feature once (the census's private copy went stale within one session and reported
  // fixed values as still broken), so the map is probed against the REAL scaler in both directions.
  const PROBE = 275.18; // a varying max in the burst fixture table
  const sample: Record<string, Record<string, unknown>> = {
    buff: { kind: 'buff', stat: 'atkPct' },
    flatDamage: { kind: 'flatDamage' },
    dot: { kind: 'dot', durationSec: 10 },
    hitRepeat: { kind: 'hitRepeat' },
    burstCdr: { kind: 'burstCdr' },
    weaponSwap: { kind: 'weaponSwap', durationSec: 10 },
    fillGauge: { kind: 'fillGauge' },
    shield: { kind: 'shield' },
    stackedNuke: { kind: 'stackedNuke' },
    storedHit: { kind: 'storedHit' },
  };
  const build = (kind: string, field: string) => {
    const e: Record<string, unknown> = { ...sample[kind] };
    // every listed kind needs its own required magnitude present, even when probing another field
    for (const f of SCALABLE_FIELDS[kind]) {
      if (f === 'perResource.mult') {
        e.perResource = { name: 'r', mult: f === field ? PROBE : 1 };
      } else {
        e[f] = f === field ? PROBE : 1;
      }
    }
    if (field === 'perResource.mult') {
      e.perResource = { name: 'r', mult: PROBE };
    }
    return e as EffectDef;
  };
  const read = (e: EffectDef, field: string): unknown =>
    field
      .split('.')
      .reduce<any>((o, k) => (o == null ? o : o[k]), e as unknown);

  it('every kind in the manifest exists in the effect schema', () => {
    expect(Object.keys(SCALABLE_FIELDS).sort()).toEqual(
      Object.keys(sample).sort()
    );
  });

  it.each(
    Object.entries(SCALABLE_FIELDS).flatMap(([kind, fields]) =>
      fields.map((f) => [kind, f] as const)
    )
  )('scaleEffect actually substitutes %s.%s', (kind, field) => {
    const { effect } = run('burst', build(kind, field), 1);
    expect(read(effect, field)).toBeCloseTo(PROBE * 0.6, 2);
  });

  it('a field NOT in the manifest is left untouched (no phantom entries)', () => {
    // durationSec is the canonical never-scaled field; if it ever started scaling, the manifest
    // would be under-declaring and the validator would reject a legitimate annotation.
    const { effect } = run(
      'burst',
      { kind: 'dot', atkPct: 1, durationSec: 275.18 } as EffectDef,
      1
    );
    expect((effect as { durationSec: number }).durationSec).toBe(275.18);
  });
});
