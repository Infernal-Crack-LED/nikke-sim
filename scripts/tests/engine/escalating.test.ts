// Engine-primitive backfill: `escalating` (6 carriers: 2b, anchor-innocent-maid, helm-aquamarine,
// isabel, liter, volume — primitive census in docs/engine-modeling-gaps.md). TDD transition step 2
// (docs/handoffs/2026-07-23-tdd-transition-plan.md).
//
// "Liter-style Once:/Twice:/…: Nth activation applies steps 1..N" (types.ts) — sim.ts's
// implementation is CUMULATIVE, not "apply only the newest step": on the block's Kth activation it
// RE-applies steps[0..min(K,steps.length)) in full, every time. A "fire only the Kth step" misreading
// would total 1 instance per activation forever; the real ladder totals 1, then 2, then 3 (capped at
// steps.length) — liter's real kit is exactly this shape (each burst cast re-triggers every lower CDR
// tier, not just the newest one), which is why her CDR test needed the whole-ladder arithmetic
// (scripts/tests/units/liter.test.ts) rather than a single-tier pin.
//
// Method: the same zeroed-kit-carrier pattern as the other step-2 backfills (`blanc`, `crown` as a
// bare-weapon filler), a synthetic `interval`-triggered escalating block with 3 flatDamage steps of
// distinct atkPct, each activation's instances grouped by their shared trigger frame (`sec`).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { bareWeaponOverride, runComp } from '../lib/harness.js';

type DamageEvent = Extract<SimEvent, { kind: 'damage' }>;

const CARRY = 'blanc';
const STEP_ATK = [101, 202, 303]; // 3 escalating steps, distinct so a multiset comparison is unambiguous
const INTERVAL_SEC = 20; // fires t=20,40,...,160 — 8 activations, 5 past steps.length=3

function escalatingComp() {
  const events: SimEvent[] = [];
  runComp({
    slugs: [CARRY, 'crown'],
    bossElement: 'Iron',
    focusSlug: CARRY,
    overrides: {
      [CARRY]: {
        slug: CARRY,
        skill1: [
          {
            slot: 'skill1',
            trigger: { kind: 'interval', sec: INTERVAL_SEC },
            target: { kind: 'self' },
            effects: [
              {
                kind: 'escalating',
                steps: STEP_ATK.map((atkPct) => ({
                  kind: 'flatDamage',
                  atkPct,
                  crit: false,
                })),
              },
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
  const hits = events.filter(
    (e): e is DamageEvent =>
      e.kind === 'damage' && e.slug === CARRY && e.srcSlot === 'skill1'
  );
  // Group by trigger second — every instance from one activation fires in the same frame.
  const byActivation = new Map<number, number[]>();
  for (const h of hits) {
    const arr = byActivation.get(h.sec) ?? [];
    arr.push(h.atkPct);
    byActivation.set(h.sec, arr);
  }
  return [...byActivation.entries()]
    .sort(([a], [b]) => a - b)
    .map(([sec, atkPcts]) => ({ sec, atkPcts: atkPcts.sort((a, b) => a - b) }));
}

describe('escalating (Liter-style Once:/Twice:/… cumulative ladder)', () => {
  it('DISCRIMINATING: activation K re-applies steps[0..K) IN FULL — cumulative, not just the newest step', () => {
    const activations = escalatingComp();
    expect(
      activations.length,
      'expected 8 interval firings (t=20..160 step 20)'
    ).toBe(8);
    // Activation 1: only step 0.
    expect(activations[0].atkPcts).toEqual([101]);
    // Activation 2: steps 0 AND 1 — step 0 re-fires, it is not "consumed" by activation 1.
    expect(activations[1].atkPcts).toEqual([101, 202]);
    // Activation 3: all three steps.
    expect(activations[2].atkPcts).toEqual([101, 202, 303]);
  });

  it('DISCRIMINATING: activations beyond steps.length stay clamped at the full ladder — no crash, no truncation to one step', () => {
    const activations = escalatingComp();
    // Activations 4-8 are all past steps.length (3); min(activations, steps.length) should hold the
    // ladder at its max rather than indexing out of bounds or reverting to a single-step reading.
    for (const a of activations.slice(3)) {
      expect(
        a.atkPcts,
        `activation at t=${a.sec} should still fire the full 3-step ladder`
      ).toEqual([101, 202, 303]);
    }
  });
});
