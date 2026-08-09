// Engine-primitive backfill: stat clamps (reloadSpeedClamp / reloadTimeClamp / chargeTimeClamp).
//
// "X is fixed at Y" kit lines OVERRIDE additive buffs of the same stat while active. The three
// clamp stats are independent buckets, but they share the same overriding semantics. This file
// pins that overrides work for reload time, reload speed, and charge time — both as standalone
// buffs and as a field on a weaponSwap.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { bareWeaponOverride, data, runComp } from '../lib/harness.js';

type ShotEvent = Extract<SimEvent, { kind: 'shot' }>;
type ReloadEvent = Extract<SimEvent, { kind: 'reload' }>;

const CARRY = 'blanc'; // AR, reloadFrames 81 (1.35s), no charge
const SR_CARRY = 'product-08'; // SR, chargeFrames 60 (1.0s), has no override on disk
const OTHER = 'crown';
const FPS = 60;

const BASE_RELOAD_FRAMES = data.characters[CARRY].reloadFrames!;
const BASE_RELOAD_SEC = BASE_RELOAD_FRAMES / FPS;

interface Run {
  events: SimEvent[];
  shots: ShotEvent[];
  reloads: ReloadEvent[];
}

/** Run blanc (or another carrier) with bursts disabled and synthetic skill1 blocks. */
function clampComp(
  carry = CARRY,
  skill1Blocks: any[] = [],
  extraCfg: Record<string, unknown> = {},
  overrides?: Record<string, any>
): Run {
  const events: SimEvent[] = [];
  const baseOverride = (overrides?.[carry] as any) ?? {
    slug: carry,
    skill1: [],
    skill2: [],
    burst: [],
  };
  runComp({
    slugs: [carry, OTHER],
    bossElement: 'Iron',
    focusSlug: carry,
    overrides: {
      ...overrides,
      [carry]: {
        ...baseOverride,
        skill1: [...skill1Blocks, ...(baseOverride.skill1 ?? [])],
      } as any,
    },
    cfg: { disableBursts: true, onEvent: (e) => events.push(e), ...extraCfg },
  });
  return {
    events,
    shots: events.filter(
      (e): e is ShotEvent => e.kind === 'shot' && e.slug === carry
    ),
    reloads: events.filter(
      (e): e is ReloadEvent => e.kind === 'reload' && e.slug === carry
    ),
  };
}

/** Median reload duration across all observed reload events, in seconds. */
function medianReloadSec(r: Run): number {
  expect(
    r.reloads.length,
    'no reloads observed — fixture cannot measure reload time'
  ).toBeGreaterThan(0);
  const durations: number[] = [];
  for (const rel of r.reloads) {
    // The reload event fires at reload COMPLETION. Find the last shot before it (the shot that
    // emptied the magazine and started the reload).
    const prior = r.shots
      .filter((s) => s.sec < rel.sec)
      .sort((a, b) => a.sec - b.sec)
      .pop();
    if (prior) {
      durations.push(rel.sec - prior.sec);
    }
  }
  expect(durations.length, 'no shots preceded reloads').toBeGreaterThan(0);
  durations.sort((a, b) => a - b);
  return durations[Math.floor(durations.length / 2)];
}

/** Median inter-shot interval BEFORE the first reload, which for a charge weapon is the charge time. */
function medianChargeIntervalSec(r: Run): number {
  const firstReload = r.reloads[0]?.sec ?? Infinity;
  const gaps: number[] = [];
  for (let i = 1; i < r.shots.length; i++) {
    if (r.shots[i].sec >= firstReload) {
      break;
    }
    gaps.push(r.shots[i].sec - r.shots[i - 1].sec);
  }
  expect(
    gaps.length,
    'not enough pre-reload shots to measure charge time'
  ).toBeGreaterThan(2);
  gaps.sort((a, b) => a - b);
  return gaps[Math.floor(gaps.length / 2)];
}

describe('stat-clamp primitive', () => {
  it('fixture check — blanc reload time is measurable and there are no bursts', () => {
    const base = clampComp();
    expect(base.shots.length).toBeGreaterThan(20);
    expect(base.reloads.length).toBeGreaterThan(1);
  });

  describe('reloadTimeClamp', () => {
    it('fixes reload duration to the declared seconds, overriding base reload frames', () => {
      const clamped = clampComp(CARRY, [
        {
          slot: 'skill1',
          trigger: { kind: 'passive' },
          target: { kind: 'self' },
          effects: [{ kind: 'buff', stat: 'reloadTimeClamp', value: 3.0 }],
        },
      ]);
      const got = medianReloadSec(clamped);
      expect(got, `reloadTimeClamp should pin reload at 3.0s`).toBeCloseTo(
        3.0,
        1
      );
    });

    it('overrides additive reloadSpeedPct buffs while active', () => {
      const fast = clampComp(CARRY, [
        {
          slot: 'skill1',
          trigger: { kind: 'passive' },
          target: { kind: 'self' },
          effects: [{ kind: 'buff', stat: 'reloadSpeedPct', value: 100 }],
        },
      ]);
      const clamped = clampComp(CARRY, [
        {
          slot: 'skill1',
          trigger: { kind: 'passive' },
          target: { kind: 'self' },
          effects: [
            { kind: 'buff', stat: 'reloadSpeedPct', value: 100 },
            { kind: 'buff', stat: 'reloadTimeClamp', value: 3.0 },
          ],
        },
      ]);
      const fastSec = medianReloadSec(fast);
      const clampedSec = medianReloadSec(clamped);
      expect(fastSec).toBeLessThan(BASE_RELOAD_SEC - 0.2);
      expect(
        clampedSec,
        'reloadTimeClamp must override reloadSpeedPct'
      ).toBeCloseTo(3.0, 1);
    });
  });

  describe('reloadSpeedClamp', () => {
    it('fixes reload speed pct, ignoring additive reloadSpeedPct buffs', () => {
      const fast = clampComp(CARRY, [
        {
          slot: 'skill1',
          trigger: { kind: 'passive' },
          target: { kind: 'self' },
          effects: [{ kind: 'buff', stat: 'reloadSpeedPct', value: 100 }],
        },
      ]);
      const clamped = clampComp(CARRY, [
        {
          slot: 'skill1',
          trigger: { kind: 'passive' },
          target: { kind: 'self' },
          effects: [
            { kind: 'buff', stat: 'reloadSpeedPct', value: 100 },
            { kind: 'buff', stat: 'reloadSpeedClamp', value: -50 },
          ],
        },
      ]);
      const fastSec = medianReloadSec(fast);
      const clampedSec = medianReloadSec(clamped);
      expect(fastSec).toBeLessThan(BASE_RELOAD_SEC - 0.2);
      // -50% reload speed under the subtractive formula: base * 0.975 * 1.5 + 0.21s tail.
      const EXPECTED_SLOW_FRAMES =
        Math.round(BASE_RELOAD_FRAMES * 0.975 * 1.5) + 13;
      expect(
        clampedSec,
        'reloadSpeedClamp -50 should slow reload per the subtractive formula'
      ).toBeCloseTo(EXPECTED_SLOW_FRAMES / FPS, 1);
    });
  });

  describe('chargeTimeClamp', () => {
    it('as a buff, overrides additive chargeSpeedPct on a base SR carrier', () => {
      const base = clampComp(
        SR_CARRY,
        [],
        {},
        {
          [SR_CARRY]: bareWeaponOverride(SR_CARRY),
          [OTHER]: bareWeaponOverride(OTHER),
        }
      );
      const fast = clampComp(
        SR_CARRY,
        [
          {
            slot: 'skill1',
            trigger: { kind: 'passive' },
            target: { kind: 'self' },
            effects: [{ kind: 'buff', stat: 'chargeSpeedPct', value: 50 }],
          },
        ],
        {},
        {
          [SR_CARRY]: bareWeaponOverride(SR_CARRY),
          [OTHER]: bareWeaponOverride(OTHER),
        }
      );
      const clamped = clampComp(
        SR_CARRY,
        [
          {
            slot: 'skill1',
            trigger: { kind: 'passive' },
            target: { kind: 'self' },
            effects: [
              { kind: 'buff', stat: 'chargeSpeedPct', value: 50 },
              { kind: 'buff', stat: 'chargeTimeClamp', value: 0.7 },
            ],
          },
        ],
        {},
        {
          [SR_CARRY]: bareWeaponOverride(SR_CARRY),
          [OTHER]: bareWeaponOverride(OTHER),
        }
      );
      const baseInterval = medianChargeIntervalSec(base);
      const fastInterval = medianChargeIntervalSec(fast);
      const clampedInterval = medianChargeIntervalSec(clamped);
      // Base SR: 60f charge + 22f bolt-recovery tail.
      expect(
        baseInterval,
        'base SR charge interval should include bolt recovery'
      ).toBeCloseTo((60 + 22) / FPS, 1);
      expect(
        fastInterval,
        'chargeSpeedPct +50 should shorten charge'
      ).toBeLessThan(baseInterval - 0.2);
      // chargeTimeClamp 0.7s = 42f charge + 22f bolt recovery. It must override the faster +50 speed.
      expect(
        clampedInterval,
        'chargeTimeClamp must override chargeSpeedPct'
      ).toBeCloseTo((42 + 22) / FPS, 1);
      expect(clampedInterval).toBeGreaterThan(fastInterval);
    });

    it('as a weaponSwap field, fixes charge time without a separate buff', () => {
      const events: SimEvent[] = [];
      runComp({
        slugs: [CARRY, OTHER],
        bossElement: 'Iron',
        focusSlug: CARRY,
        overrides: {
          [CARRY]: {
            slug: CARRY,
            skill1: [
              {
                slot: 'skill1',
                trigger: { kind: 'passive' },
                target: { kind: 'self' },
                effects: [
                  {
                    kind: 'weaponSwap',
                    durationSec: 100000,
                    damagePct: data.characters[CARRY].normalAttackMultiplier,
                    weapon: 'SR',
                    chargeTimeSec: 2.0,
                    chargeTimeClamp: 0.7,
                    chargeMultPct: 150,
                    maxAmmo: 999,
                  },
                ],
              },
            ],
            skill2: [],
            burst: [],
          } as any,
          [OTHER]: bareWeaponOverride(OTHER),
        },
        cfg: { disableBursts: true, onEvent: (e) => events.push(e) },
      });
      const shots = events.filter(
        (e): e is ShotEvent => e.kind === 'shot' && e.slug === CARRY
      );
      const gaps: number[] = [];
      for (let i = 1; i < shots.length; i++) {
        gaps.push(shots[i].sec - shots[i - 1].sec);
      }
      gaps.sort((a, b) => a - b);
      const median = gaps[Math.floor(gaps.length / 2)];
      expect(
        median,
        'weaponSwap.chargeTimeClamp should pin charge interval at 0.7s'
      ).toBeCloseTo(0.7, 1);
    });
  });

  describe('clamp precedence', () => {
    it('the most recent clamp value wins when two clamps of the same stat are active', () => {
      const events: SimEvent[] = [];
      runComp({
        slugs: [CARRY, 'liter', 'crown'],
        bossElement: 'Iron',
        focusSlug: CARRY,
        overrides: {
          [CARRY]: {
            slug: CARRY,
            skill1: [
              {
                slot: 'skill1',
                trigger: { kind: 'burstCast' },
                target: { kind: 'self' },
                effects: [
                  {
                    kind: 'buff',
                    stat: 'reloadTimeClamp',
                    value: 1.0,
                    durationSec: 10,
                  },
                  {
                    kind: 'buff',
                    stat: 'reloadTimeClamp',
                    value: 3.0,
                    durationSec: 10,
                  },
                ],
              },
            ],
            skill2: [],
            burst: [],
          } as any,
          liter: bareWeaponOverride('liter'),
          crown: bareWeaponOverride('crown'),
        },
        cfg: { onEvent: (e) => events.push(e) },
      });
      const reloads = events.filter(
        (e): e is ReloadEvent => e.kind === 'reload' && e.slug === CARRY
      );
      const bursts = events.filter(
        (e) => e.kind === 'burstCast' && e.slug === CARRY
      );
      expect(bursts.length).toBeGreaterThan(0);
      expect(reloads.length).toBeGreaterThan(0);
      // After each burst, the second (3.0s) clamp should be the active one. Measure the first
      // reload that lands inside the 10s clamp window after a burst.
      const clampedReloads = reloads.filter((r) =>
        bursts.some((b) => {
          const bf = (b as any).frame as number;
          return r.frame > bf && r.frame < bf + 10 * FPS;
        })
      );
      expect(clampedReloads.length).toBeGreaterThan(0);
      const shots = events.filter(
        (e): e is ShotEvent => e.kind === 'shot' && e.slug === CARRY
      );
      const durations = clampedReloads
        .map((rel) => {
          const prior = shots
            .filter((s) => s.sec < rel.sec)
            .sort((a, b) => a.sec - b.sec)
            .pop();
          return prior ? rel.sec - prior.sec : null;
        })
        .filter((d): d is number => d != null);
      expect(durations.length).toBeGreaterThan(0);
      const median = durations.sort((a, b) => a - b)[
        Math.floor(durations.length / 2)
      ];
      expect(
        median,
        'the later 3.0s clamp should win, not the 1.0s clamp'
      ).toBeCloseTo(3.0, 1);
    });
  });
});
