// Functional test for the DERIVED-STAT primitive `convertExcess`.
//
// Kit shape: "Convert excess value over X% of <stat A> to <stat B>. B ▲ R% of the excess value
// continuously." B is not a stored buff — it is RECOMPUTED from A's live value on every read, so it
// tracks A's stacks up AND down. One carrier today: `red-hood` S1 ("excess over 100% of Charge
// Speed → Charge Damage ▲240% of the excess"), built on owner direction 2026-08-11.
//
// Why it exists: the alternative is a hand-averaged constant, and the average of a ramp is wrong at
// both ends. She shipped `chargeDamagePct` 90 — a "stack-ramp AVERAGE" — against a real range of
// 1.92 (0 stacks) to 93.36 (10 stacks).
//
// The arithmetic this pins, from her kit alone:
//   Red Wolf grants Charge Speed ▲100.8% (10s). S1 adds ▲3.81% per stack, up to 10, 5s each.
//   excess  = (100.8 + 3.81·stacks) − 100 = 0.8 + 3.81·stacks
//   ⇒ chargeDamagePct = 2.4 × excess = 1.92 at 0 stacks … 93.36 at 10 stacks
//   ⇒ each stack is worth exactly 3.81 × 2.4 = 9.144pp of Charge Damage
// A charged shot's `mult.charge` is base 2.5 (chargeMultPct 250) + chargeDamagePct/100, so the
// per-stack step is observable as +0.09144 on that multiplier — that ladder is the assertion.
//
// Fixture: controlComp('red-hood'). Deterministic (no seed).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const STEP = (3.81 * 240) / 100 / 100; // 0.09144 on the charge multiplier, per stack
const CAP = (2.4 * (100.8 + 3.81 * 10 - 100)) / 100; // 0.9336 → chargeDamagePct 93.36

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp('red-hood'),
    overrides,
    cfg: { onEvent: (e: SimEvent) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

/** Distinct charge multipliers on her charged normal hits, ascending. */
const chargeMults = (evs: SimEvent[]) =>
  [
    ...new Set(
      evs
        .filter(
          (e): e is Extract<SimEvent, { kind: 'damage' }> =>
            e.kind === 'damage' &&
            e.slug === 'red-hood' &&
            e.bucket === 'normal' &&
            e.mult.charge > 1
        )
        .map((d) => Number(d.mult.charge.toFixed(5)))
    ),
  ].sort((a, b) => a - b);

/** Counterfactual: the hand-averaged constant this replaced (chargeDamagePct 90, flat, 10s). */
const averaged = withPatchedOverride('red-hood', (ov: any) => {
  ov.skill1 = ov.skill1.filter(
    (b: any) => !(b.effects ?? []).some((e: any) => e.kind === 'convertExcess')
  );
  for (const b of ov.burst) {
    if ((b.effects ?? []).some((e: any) => e.kind === 'weaponSwap')) {
      b.effects.push({
        kind: 'buff',
        stat: 'chargeDamagePct',
        value: 90,
        durationSec: 10,
      });
    }
  }
});

/** Counterfactual: conversion present but the SOURCE never exceeds the threshold. */
const noSource = withPatchedOverride('red-hood', (ov: any) => {
  for (const b of ov.burst) {
    b.effects = (b.effects ?? []).filter(
      (e: any) => e.stat !== 'chargeSpeedPct'
    );
  }
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const averagedRun = run({ 'red-hood': averaged });
const noSourceRun = run({ 'red-hood': noSource });

describe('convertExcess — derived stats from a stat overflow', () => {
  it('produces a PER-STACK ladder, not a single value', () => {
    // The signature of a live conversion: many distinct charge multipliers, evenly spaced by one
    // stack's worth. A baked constant produces exactly one in-window value.
    const mults = chargeMults(base.events);
    const inWindow = mults.filter((m) => m > 2.5 + 1e-9);
    expect(
      inWindow.length,
      'only one in-window charge multiplier — the conversion is not tracking stacks'
    ).toBeGreaterThan(3);

    const steps = inWindow
      .slice(1)
      .map((m, i) => Number((m - inWindow[i]).toFixed(5)));
    for (const s of steps) {
      expect(s, 'a ladder step that is not exactly one stack').toBeCloseTo(
        STEP,
        4
      );
    }
  });

  it('reaches her SOLO-KIT ceiling: 2.4 × (100.8 + 3.81×10 − 100) = 93.36pp of Charge Damage', () => {
    // "Ceiling", not "cap" — see the ally-coupling case below. This fixture fields no Charge-Speed
    // buffer, so 93.36 is everything her own kit can produce.
    const top = Math.max(...chargeMults(base.events));
    expect(top).toBeCloseTo(2.5 + CAP, 4);
  });

  it('ALLY Charge Speed feeds the conversion too — the kit says "Charge Speed", not "your own"', () => {
    // The consequence a baked constant could never express, and the reason 93.36 is not a cap: the
    // conversion reads her LIVE total, so a teammate's Charge-Speed buff is amplified 2.4× into her
    // Charge Damage. Six roster units grant chargeSpeedPct to allies. Her own graded PA MiKa comp
    // fields one (`alice`, ▲11.67 to the top-2-ATK allies), which is part of why her board reads
    // 1.002 — so this coupling is load-bearing for a real measurement, not a curiosity.
    const withBuffer = run({
      'red-hood': withPatchedOverride('red-hood', (ov: any) => {
        ov.skill1.push({
          slot: 'skill1',
          trigger: { kind: 'passive' },
          target: { kind: 'self' },
          effects: [{ kind: 'buff', stat: 'chargeSpeedPct', value: 11.67 }],
        });
      }),
    });
    const top = Math.max(...chargeMults(withBuffer.events));
    // +11.67 of source ⇒ +11.67 × 2.4 = +28.008pp of Charge Damage ⇒ +0.28008 on the multiplier.
    expect(top).toBeCloseTo(2.5 + CAP + (11.67 * 2.4) / 100, 4);
    expect(top).toBeGreaterThan(2.5 + CAP);
  });

  it('FLOORS at zero: no conversion while the source is under the threshold', () => {
    // Outside Red Wolf her Charge Speed is at most 3.81×10 = 38.1, far under 100 — so her ordinary
    // charged shots must sit at the bare 2.5 with no derived Charge Damage at all.
    expect(chargeMults(base.events)).toContain(2.5);
    // ...and with the 100.8 source removed, EVERY shot is at the bare multiplier.
    const withoutSource = chargeMults(noSourceRun.events);
    expect(withoutSource).toEqual([2.5]);
    expect(noSourceRun.totals['red-hood']).toBeLessThan(
      base.totals['red-hood']
    );
  });

  it('DISCRIMINATING: the hand-averaged constant it replaced is a different model', () => {
    // The average sits inside the ramp, so it over-credits early shots and under-credits capped
    // ones — a different total AND a single in-window multiplier instead of a ladder.
    const avgMults = chargeMults(averagedRun.events).filter(
      (m) => m > 2.5 + 1e-9
    );
    expect(avgMults).toEqual([2.5 + 0.9]);
    expect(averagedRun.totals['red-hood']).not.toBe(base.totals['red-hood']);
  });
});
