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
// — while IN THE SIM the zero-charge-competition reference (misc B3s / PI2) refills the FASTEST.
// This is what routed the investigation to LOG (general charge-B3 gauge-fill-tempo gap, board-wide,
// NOT liberalio-specific) rather than IMPLEMENT (a narrow liberalio-only fix). A failure here means
// either the engine's cycle timing changed (re-derive the finding, don't just re-pin) or this
// instrument regressed.
// ⚠ "PI2 refills the FASTEST" is a statement about the SIM only — the real tape inverts it. See the
// correction block below; the LOG routing itself is untouched by that (it rested on the board-wide
// baseline comparison, not on PI2's rank).
//
// ⚠ THE BANDS BELOW ARE SIM DRIFT-GUARDS, NOT MEASUREMENTS (corrected 2026-08-17).
// Until today these titles read "measured 4.43 / 3.56 / 3.71". Those three literals are NOT
// footage. They are THIS INSTRUMENT'S OWN sim `excess` output, produced and pinned by the
// 2026-08-04 rotation-default-flip commit `2a8b869d` and mislabelled "measured" in the same
// motion. Confirmed four ways, decisively by `git log -S"measured 4.43"` returning that single
// commit — a sim re-derivation, not a video read. The FIRST real footage refill measurements for
// these comps are the 2026-08-14 bar-paint traces (`f8cd76b9`), ten days LATER.
//
// What the real tape says — median `visibleSec` = [bar first paint → reader's green-full instant]
// over readable windows, from the committed `docs/probe-data/fill-trace-*.json`
// (`scripts/probe/fill-trace-compare.ts:284-289,811`; all values re-derived from raw 60fps reads
// 2026-08-17, 36/36 per-window values identical to stored):
//
//   comp        pinned here (SIM)   real (bar-paint)                sim is
//   iron sweep  3.5 – 5.5           2.342  (n=10 of 12)             ~1.7s SLOW
//   T5          3.0 – 4.5           1.817 readable / 1.750 all      ~1.6s SLOW
//   PI2         1.5 – 3.5           2.0915 (n=10 of 12)             ~0.9s SLOW
//   T1          3.0 – 4.5           *** NO FOOTAGE MEASUREMENT ***  unknown
//
// So the sim refills TOO SLOWLY everywhere it has been measured — the opposite direction to what
// the old "measured" labels implied. ⚠ T5's "1.75–1.82" is NOT an uncertainty interval: it is one
// measurement under two window-inclusion choices (all 12 windows → 1.750; the 11 readable → 1.817).
// ⚠ T1 has NO footage refill measurement at all — its band is pure sim self-pin, and no assertion
// here may be read as evidence about T1's real refill.
//
// ⚠ THE `PI2 < T5` ASSERTION IS CONTRADICTED BY MEASUREMENT, under every arm. It pins PI2 as the
// FASTEST refill ("the negative control"), but the real tape has T5 (1.75–1.82s) refilling FASTER
// than PI2 (2.09–2.11s) — the ordering is inverted in reality. The assertion is retained ONLY as a
// drift-guard on current sim behaviour; it is NOT evidence for the negative-control claim its old
// title asserted, and it must not be cited as such.
//
// Do NOT blanket `--update` these bands to silence a failure: of the 19 reds observed under the
// `gaugeHits` arm, ZERO were measured-anchored, 4 were child-process harness artifacts, and 15 were
// genuine arm effects. A red here still means "re-derive the finding", not "re-pin the number".
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
  it('PG iron sweep: SIM refill-from-zero drift-guard [2.0,4.0] (real bar-paint: 2.342s — sim is SLOW; band widened 2026-08-19 after gaugeHits:5 reduced liberalio-driven shortfall)', () => {
    const d = decomp('PG iron sweep (boss Electric)');
    expect(d.excess).toBeGreaterThan(2.0);
    expect(d.excess).toBeLessThan(4.0);
  });

  it('T5/T1 wind-weak: SIM refill-from-zero drift-guard [2.0,4.5] (real T5 1.75-1.82s; T1 has NO footage measurement; lower bound dropped 2026-08-19 after gaugeHits:5)', () => {
    const t5 = decomp('T5 wind-weak probe (boss Iron)');
    const t1 = decomp('T1 wind-weak (boss Iron)');
    for (const d of [t5, t1]) {
      expect(d.excess).toBeGreaterThan(2.0);
      expect(d.excess).toBeLessThan(4.5);
    }
  });

  it('N3 scarlet/liberalio: 15s FB duration from soda-twinkling-bunny Golden-Chip max, refill in band', () => {
    const d = decomp('N3 scarlet/liberalio iron (boss Iron)');
    expect(d.fbDur).toBeCloseTo(15.0, 1);
    expect(d.excess).toBeGreaterThan(1.5);
  });

  it('N6 baseline (non-liberalio, currently PASSES): refill is AT LEAST as slow as the disabled comps — the H0b signal', () => {
    const n6 = decomp('N6 mihara/maiden wind (boss Wind)');
    const pg = decomp('PG iron sweep (boss Electric)');
    expect(n6.excess).toBeGreaterThan(3.5);
    // the core LOG-routing claim: baseline refill is not faster than the disabled comp's
    expect(n6.excess).toBeGreaterThanOrEqual(pg.excess - 0.5);
  });

  it('PI2 misc B3s: SIM drift-guard — absolute band only (relative ordering vs T5/T1 dropped 2026-08-19: gaugeHits:5 makes liberalio comps refill faster, inverting the sim ordering)', () => {
    const d = decomp('PI2 misc B3s RERUN w/ video (boss Water)');
    expect(d.excess).toBeGreaterThan(1.5);
    // Band re-derived 2026-08-09 (2.x → 3.16): the faithfulness-enactment batch gave this
    // comp's grave her kit Prediction-end ammo dump (one forced ~3.35s reload per burst
    // cycle — MG gauge feed pauses), slowing the comp's refill-from-zero.
    // ⚠ Relative ordering asserts (PI2 < T5/T1) were dropped 2026-08-19: the gaugeHits:5 fix
    // makes liberalio-seated comps (T5, T1) refill faster than PI2 (no liberalio), inverting
    // the old sim ordering. The real tape always had T5 faster (1.75-1.82s < PI2 2.09-2.11s),
    // so the sim now agrees with the tape on this point.
    expect(d.excess).toBeLessThan(3.5);
  });
});
