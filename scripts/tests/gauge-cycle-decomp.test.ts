// Pins the sim's per-cycle floor/observed/excess decomposition for the six comps used in the
// 2026-08-03 fb-count-regression investigation (docs/handoffs/scientific-method-harness.md,
// LOG verdict). floor = FB duration + measured 3s FB-end->B1 total + median chain span
// (all MEASURED-tier constants); excess = observed steady-state FB period - floor, i.e. gauge-fill
// time the engine spends beyond the cooldown/chain floor.
//
// The finding this guards: the pre-registered baseline (N6 mihara/maiden wind — currently PASSING,
// non-liberalio, two charge-B3 competitors) shows an excess AS LARGE AS OR LARGER THAN the four
// disabled comps (iron sweep run G / T5 / T1 / N3 scarlet/liberalio, all liberalio-carrying,
// currently `disabled: true` in scripts/regression.ts because sim under-counts their measured full
// bursts) — while the zero-charge-competition reference (misc B3s / PI2) reads near-zero excess.
// This is what routed the investigation to LOG (general charge-B3 gauge-fill-tempo gap, board-wide,
// NOT liberalio-specific) rather than IMPLEMENT (a narrow liberalio-only fix). A failure here means
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
  it('PG iron sweep: positive excess, ceiling matches the certain low end of the ambiguous 13-14 real target', () => {
    const d = decomp('PG iron sweep (boss Electric)');
    expect(d.excess).toBeGreaterThan(1.0);
    expect(d.excess).toBeLessThan(3.0);
  });

  it('T5/T1 wind-weak: positive excess in the same 1-2s band', () => {
    const t5 = decomp('T5 wind-weak probe (boss Iron)');
    const t1 = decomp('T1 wind-weak (boss Iron)');
    for (const d of [t5, t1]) {
      expect(d.excess).toBeGreaterThan(0.5);
      expect(d.excess).toBeLessThan(3.0);
    }
  });

  it('N3 scarlet/liberalio: positive excess (15s FB duration from soda-twinkling-bunny Golden-Chip max)', () => {
    const d = decomp('N3 scarlet/liberalio iron (boss Iron)');
    expect(d.fbDur).toBeCloseTo(15.0, 1);
    expect(d.excess).toBeGreaterThan(1.0);
  });

  it('N6 baseline (non-liberalio, currently PASSES): excess is AT LEAST as large as the disabled comps — the H0b signal', () => {
    const n6 = decomp('N6 mihara/maiden wind (boss Wind)');
    const pg = decomp('PG iron sweep (boss Electric)');
    expect(n6.excess).toBeGreaterThan(1.5);
    // the core LOG-routing claim: baseline excess is not smaller than the disabled comp's
    expect(n6.excess).toBeGreaterThanOrEqual(pg.excess - 0.5);
  });

  it('PI2 misc B3s (zero charge-B3 competition, currently PASSES): near-zero excess — the negative control', () => {
    const d = decomp('PI2 misc B3s RERUN w/ video (boss Water)');
    expect(Math.abs(d.excess)).toBeLessThan(0.5);
  });
});
