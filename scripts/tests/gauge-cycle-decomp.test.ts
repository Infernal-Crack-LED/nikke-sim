// Pins the sim's per-cycle floor/observed/excess decomposition for the six comps used in the
// 2026-08-03 fb-count-regression investigation (docs/handoffs/scientific-method-harness.md,
// LOG verdict). floor = FB duration + PRE_B1_GAP (0.5s gauge-full→B1) + median chain span;
// excess = observed steady-state FB period - floor, i.e. the engine's gauge REFILL-FROM-ZERO
// time. 2026-08-04 (owner ruling): the fixed post-FB chain-open block the old floor carried
// (+2.5s) is OVERTURNED as a game mechanic — the chain opens on gauge-full, and a good team's
// refill reads ~3-4s of natural generation — so excess now measures that refill directly
// instead of the sliver above a fictional lock. Bands re-derived 2026-08-04 under the new
// default (ROTMODEL=floor is the opt-in A/B arm); the instrument's own contract is
// re-derive-don't-re-pin, which is what this update is.
//
// The finding this guards: the pre-registered baseline (N6 mihara/maiden wind — currently PASSING,
// non-liberalio, two charge-B3 competitors) shows a refill AT LEAST as slow as the four disabled
// comps (iron sweep run G / T5 / T1 / N3 scarlet/liberalio, all liberalio-carrying, currently
// `disabled: true` in scripts/regression.ts because sim under-counts their measured full bursts)
// — while the zero-charge-competition reference (misc B3s / PI2) refills the FASTEST. This is what
// routed the investigation to LOG (general charge-B3 gauge-fill-tempo gap, board-wide, NOT
// liberalio-specific) rather than IMPLEMENT (a narrow liberalio-only fix). A failure here means
// either the engine's cycle timing changed (re-derive the finding, don't just re-pin) or this
// instrument regressed.
//
// Regenerate via: `DECOMP=1 SEEDS=1 ONLY="<comp name>" npx tsx scripts/experiment.ts`
import { describe, expect, it } from 'vitest';
import { COMPS, run, decomposeCycles } from '../experiment.js';

function decomp(name: string) {
  const comp = COMPS.find((c) => c.name === name);
  if (!comp) {
    throw new Error(`comp not found: ${name}`);
  }
  const res = run(comp);
  return decomposeCycles(res.rotationLog);
}

describe('gauge cycle decomposition (fb-count-regression LOG finding)', () => {
  it('PG iron sweep: refill-from-zero in the good-team band (~3-4s, measured 4.43)', () => {
    const d = decomp('PG iron sweep (boss Electric)');
    expect(d.excess).toBeGreaterThan(3.5);
    expect(d.excess).toBeLessThan(5.5);
  });

  it('T5/T1 wind-weak: refill-from-zero in the same band (measured 3.56 / 3.71)', () => {
    const t5 = decomp('T5 wind-weak probe (boss Iron)');
    const t1 = decomp('T1 wind-weak (boss Iron)');
    for (const d of [t5, t1]) {
      expect(d.excess).toBeGreaterThan(3.0);
      expect(d.excess).toBeLessThan(4.5);
    }
  });

  it('N3 scarlet/liberalio: 15s FB duration from soda-twinkling-bunny Golden-Chip max, refill in band', () => {
    const d = decomp('N3 scarlet/liberalio iron (boss Iron)');
    expect(d.fbDur).toBeCloseTo(15.0, 1);
    expect(d.excess).toBeGreaterThan(3.0);
  });

  it('N6 baseline (non-liberalio, currently PASSES): refill is AT LEAST as slow as the disabled comps — the H0b signal', () => {
    const n6 = decomp('N6 mihara/maiden wind (boss Wind)');
    const pg = decomp('PG iron sweep (boss Electric)');
    expect(n6.excess).toBeGreaterThan(3.5);
    // the core LOG-routing claim: baseline refill is not faster than the disabled comp's
    expect(n6.excess).toBeGreaterThanOrEqual(pg.excess - 0.5);
  });

  it('PI2 misc B3s (zero charge-B3 competition, currently PASSES): the FASTEST refill — the negative control', () => {
    const d = decomp('PI2 misc B3s RERUN w/ video (boss Water)');
    const t5 = decomp('T5 wind-weak probe (boss Iron)');
    const t1 = decomp('T1 wind-weak (boss Iron)');
    expect(d.excess).toBeGreaterThan(1.5);
    expect(d.excess).toBeLessThan(3.0);
    expect(d.excess).toBeLessThan(t5.excess);
    expect(d.excess).toBeLessThan(t1.excess);
  });
});
