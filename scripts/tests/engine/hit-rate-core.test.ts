// Engine-primitive backfill: `hitRatePct` (14 carriers — primitive census in
// docs/engine-modeling-gaps.md). TDD transition step 2
// (docs/handoffs/2026-07-23-tdd-transition-plan.md).
//
// ⚠ SCOPE, DELIBERATELY NARROW: hitRatePct feeds the HR→core-hit-rate lift, which is genuinely
// contested, ⚑-flagged territory (UNIGEO/CONE_DELTA/HRCORE, docs/data/sg-calc/, open-questions
// U27/U29, "measured constants are never refit" — CLAUDE.md #3). This backfill tests ONLY the
// PRIMITIVE WIRING — does a hitRatePct buff reach the live core-hit computation at all, in the
// documented direction (every live model in sim.ts comments itself as "monotone in hr" / "≥1") —
// and asserts NOTHING about the calibrated magnitude, curve shape, or formula choice. It also uses
// exactly ONE hitRatePct source (never stacks two), since sim.ts flags multi-source stat() summation
// for this stat as "⚑ UNVALIDATED (R8)" — an open question this test must not quietly assume an
// answer to.
//
// Method: the same zeroed-kit AR carrier pattern as the other step-2 backfills (`blanc`, `crown` as
// a bare-weapon filler), a single passive self-buff granting hitRatePct, read off the `damage`
// event's own `coreRate` field (already resolved and exposed — no need to reach into acrForHR).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { bareWeaponOverride, runComp } from '../lib/harness.js';

type DamageEvent = Extract<SimEvent, { kind: 'damage' }>;

const CARRY = 'blanc'; // AR — MG/SR/RL carry no HR→core lift at all (sim.ts: "untouched in all modes")

function hrComp(hitRatePct?: number) {
  const events: SimEvent[] = [];
  runComp({
    slugs: [CARRY, 'crown'],
    bossElement: 'Iron',
    focusSlug: CARRY,
    overrides: {
      [CARRY]: {
        slug: CARRY,
        skill1:
          hitRatePct === undefined
            ? []
            : [
                {
                  slot: 'skill1',
                  trigger: { kind: 'passive' },
                  target: { kind: 'self' },
                  effects: [
                    { kind: 'buff', stat: 'hitRatePct', value: hitRatePct },
                  ],
                },
              ],
        skill2: [],
        burst: [],
      } as any,
      crown: bareWeaponOverride('crown'),
    },
    cfg: { disableBursts: true, onEvent: (e) => events.push(e) },
  });
  const normals = events.filter(
    (e): e is DamageEvent =>
      e.kind === 'damage' && e.slug === CARRY && e.srcSlot === 'normal'
  );
  const avgCoreRate =
    normals.reduce((sum, n) => sum + n.coreRate, 0) / normals.length;
  return { normals, avgCoreRate };
}

describe('hitRatePct (HR→core-hit wiring — magnitude-agnostic)', () => {
  it('fixture check — the scope-lock basis exposes core (coreEligible on every normal AR shot)', () => {
    const { normals } = hrComp(undefined);
    expect(normals.length).toBeGreaterThan(0);
    expect(normals.every((n) => n.coreEligible)).toBe(true);
  });

  it('DISCRIMINATING: a hitRatePct buff reaches the live core-hit computation — coreRate responds, at all', () => {
    const baseline = hrComp(undefined);
    const buffed = hrComp(100);
    expect(
      buffed.avgCoreRate,
      `baseline coreRate ${baseline.avgCoreRate}, +100 hitRatePct coreRate ${buffed.avgCoreRate} — ` +
        'a hitRatePct buff that never reaches acrForHR would leave these identical'
    ).not.toBeCloseTo(baseline.avgCoreRate, 5);
  });

  it('DISCRIMINATING: the response is MONOTONE — every live HR→core model is documented as non-decreasing in hr', () => {
    // Every model sim.ts ships for this path documents itself as monotone in hr (hrCoreMultGeo: "≥1,
    // monotone in hr"; the exponent model's reticle-shrink is monotone by construction). This asserts
    // only the DIRECTION, never a magnitude — the calibrated curve itself is out of scope here.
    const lo = hrComp(20).avgCoreRate;
    const mid = hrComp(60).avgCoreRate;
    const hi = hrComp(150).avgCoreRate;
    expect(
      mid,
      `coreRate should not DECREASE as hitRatePct rises: ${lo} → ${mid} → ${hi}`
    ).toBeGreaterThanOrEqual(lo);
    expect(
      hi,
      `coreRate should not DECREASE as hitRatePct rises: ${lo} → ${mid} → ${hi}`
    ).toBeGreaterThanOrEqual(mid);
  });

  it('coreRate never exceeds 1 (a resolved rate/probability, however high hitRatePct goes)', () => {
    const extreme = hrComp(100000);
    expect(extreme.normals.every((n) => n.coreRate <= 1)).toBe(true);
    expect(extreme.normals.every((n) => n.coreRate >= 0)).toBe(true);
  });
});
