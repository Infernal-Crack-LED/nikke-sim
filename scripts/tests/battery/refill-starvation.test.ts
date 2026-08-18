// Pins the REFILL-WINDOW STARVATION AUDIT — item 1 of the 2026-08-13 burst-generation
// investigation plan (docs/handoffs/2026-08-13-burst-generation-investigation-plan.md).
//
// THE QUESTION the audit answers: the gauge-refill window opens the instant Full Burst ends —
// the moment units are most likely to be mid-reload or empty after firing for 10s straight. Does
// the sim under-feed the bar specifically in the first second(s) after FB end, while its
// fight-average generation rate still looks right? Every prior gauge validation is a RATE or
// PER-SHOT check, which a boundary defect leaves intact by construction.
//
// THE METHOD (sim-only, no footage): bucket every gauge-eligible HIT by time-since-FB-end across
// every steady-state refill window of the two filmed comps, and compare the first-1s delivery
// against the window-tail rate (the steady-state reference). Burst gauge is generated per HIT and
// per-hit gauge is stationary across a refill window for these comps, so a hit-rate ramp IS a
// gauge-rate ramp. A starved window shows as a rate that RAMPS from the boundary; a clean window
// is flat-or-front-loaded from the first frame.
//
// THE FINDING this fixture guards (deterministic EV runs; iron sweep re-derived 2026-08-14 after
// the `liberalio` Charge Speed immunity landed — DECISIONS 2026-08-14):
//   * iron sweep (run G): first-1s delivers 0.860x the tail rate — FLAT, not starved.
//   * T5 wind-weak:       first-1s delivers 1.407x the tail rate — FRONT-LOADED, not starved.
//   * reloadBoundFirsts = 0 for EVERY unit on BOTH comps — no unit's first post-FB hit lands on a
//     reload completion, the direct reload-starvation signature. Absent.
// Both clear the plan's pre-committed decision threshold (>=0.8 = NOT-STARVED => record and close),
// so the VERDICT is unchanged. What the immunity changed is the descriptive SHAPE on iron sweep
// only: it lengthens liberalio's charge cycle by 4 frames a shot, costing her two charges over the
// fight and re-phasing all four of that comp's SR/charge units against the FB boundary, which moves
// ~6 hits out of the first second and into the window tail (and drops
// `milk-blooming-bunny` to 0.377 first-1s delivery, with reloadBoundFirsts still 0 — charge phase,
// not starvation). T5 keeps the original front-loaded reading: units leave Full Burst with
// full/restored magazines and live buffs, so they generate FASTER at the boundary, not slower —
// the exact opposite of the hypothesis. Premise-verifier backing (fresh-context, 2026-08-14): the engine's FB boundaries
// write NO ammo/reload/charge phase field directly (all carry across; only FB-keyed kit blocks can
// touch them, and no such carrier is seated in these comps); nayuta's timed weapon-swap exit
// refills her base mag to full right at FB end (her 0.02s first hit).
//
// WHY THESE PINS: the decision quantities (verdict, first1sRatio, reloadBoundFirsts) are the
// finding itself; the exact bucket hit counts are reproducible integers from the deterministic sim,
// pinned so any engine change that moves post-FB boundary state trips a re-run. Re-derive, don't
// re-pin: if a pin fails, the refill boundary changed — re-run
// `npx tsx scripts/battery/fb-count-matrix.ts --refill-starvation`, re-read the shape, and only
// re-pin once the NEW finding is understood (the gauge-cycle-decomp.test.ts convention).
//
// NOTE ON buildTimeCheckSec: the reconstruction (Σ window lengths + first fill − gaugeBuildTimeSec)
// reads +0.1833s = exactly one frame per refill window (11/60). That is a benign boundary-frame
// convention (the engine counts the gauge-filling frame in build time; the audit excludes hits at
// exactly window-end), NOT a defect. gaugeBuildTimeSec is a rotation-state counter, not a pure
// firing window (premise-verifier 3 REFUTE: it ticks through deploy delay, boss-unhittable
// transitions and per-unit reloads), which is why the audit buckets hit EVENTS directly instead.
import { describe, expect, it } from 'vitest';
import {
  auditRefillStarvation,
  type RefillStarvationReport,
} from '../../battery/fb-count-matrix.js';

describe('refill-window starvation audit (investigation-plan item 1)', () => {
  const reports = auditRefillStarvation();
  const byName = (name: string): RefillStarvationReport => {
    const r = reports.find((x) => x.comp === name);
    if (!r) {
      throw new Error(`audit produced no report for ${name}`);
    }
    return r;
  };

  it('audits exactly the two filmed comps (the only ones with a measured cycle)', () => {
    expect(reports.map((r) => r.comp).sort()).toEqual([
      'T5 wind-weak',
      'iron sweep (run G)',
    ]);
    for (const r of reports) {
      expect(r.windows).toBeGreaterThan(0);
      expect(r.skipped).toBe(0);
    }
  });

  it('reconstruction is sound: windows + first fill ≈ gaugeBuildTimeSec (one-frame/window offset)', () => {
    for (const r of reports) {
      // +0.1833s = 11/60 = one boundary frame per window; allow a couple frames of slack.
      expect(r.buildTimeCheckSec).toBeGreaterThan(0);
      expect(r.buildTimeCheckSec).toBeLessThan(0.3);
    }
  });

  it('NOT-STARVED on both comps: first-1s delivery clears the pre-committed 0.8 threshold', () => {
    for (const r of reports) {
      expect(r.verdict).toBe('NOT-STARVED');
      expect(r.first1sRatio).toBeGreaterThanOrEqual(0.8);
    }
    // iron sweep RE-PINNED 2026-08-14 (was 1.147): the `liberalio` Charge Speed immunity
    // (DECISIONS 2026-08-14) lengthens her charge cycle by 4 frames a shot, which costs her two
    // charges over the fight and re-phases the whole comp against the FB boundary. The VERDICT is
    // untouched — 0.860 still clears the plan's pre-committed 0.8 threshold, so NOT-STARVED
    // stands — but the margin is now thin rather than comfortable. Re-derived by running the
    // instrument (`npx tsx scripts/battery/fb-count-matrix.ts --refill-starvation --json`),
    // not hand-edited.
    // T5 seats anis-star: her full 2.8-gauge skill-impact credit (hitsPerShot 1) shortens the
    // comp's refill windows and re-phases them against the FB boundary; 1.106 still clears the
    // 0.8 threshold comfortably. Re-pinned 2026-08-18 (baseGaugeProb 0.25 enactment moved the
    // comp's gauge fill timing). Value from the instrument's --json.
    expect(byName('iron sweep (run G)').first1sRatio).toBeCloseTo(0.86, 2);
    expect(byName('T5 wind-weak').first1sRatio).toBeCloseTo(1.106, 2);
  });

  it('per-unit first-1s delivery is pinned; the sub-1.0 readings are charge PHASE, not starvation', () => {
    // RE-PINNED 2026-08-14. The old form asserted a blanket per-unit floor of 0.5 ("no unit is
    // front-loaded LESS than half its steady state"). That floor no longer holds on iron sweep:
    // `milk-blooming-bunny` reads 0.377. It is NOT starvation — her reloadBoundFirsts is 0 (pinned
    // in the next case), so no first hit lands on a reload completion; what changed is charge
    // PHASE, the same re-phasing that moved the team figure. Pinning the actual per-unit values is
    // the honest drift guard: a blanket threshold would have to be loosened to whatever the worst
    // reading happens to be, which guards nothing. Values re-derived from the instrument's --json.
    const perUnit = (comp: string) =>
      Object.fromEntries(
        byName(comp).perUnit.map((u) => [u.slug, u.first1sRatio])
      );
    const iron = perUnit('iron sweep (run G)');
    expect(iron['d-killer-wife']).toBeCloseTo(1.223, 2);
    expect(iron['milk-blooming-bunny']).toBeCloseTo(0.377, 2);
    expect(iron.maxwell).toBeCloseTo(1.48, 2);
    expect(iron.takina).toBeCloseTo(1.011, 2);
    expect(iron.liberalio).toBeCloseTo(0.629, 2);

    // T5 seats anis-star: her full 2.8-gauge skill-impact credit (hitsPerShot 1) re-phases
    // every unit against the shorter refill windows. Re-pinned 2026-08-18 (baseGaugeProb 0.25
    // enactment shifted the timing). Values from the instrument's --json.
    const t5 = perUnit('T5 wind-weak');
    expect(t5.nayuta).toBeCloseTo(0.974, 2);
    expect(t5['cinderella-crystal-wave']).toBeCloseTo(1.239, 2);
    expect(t5['anis-star']).toBeCloseTo(0.833, 2);
    expect(t5.liberalio).toBeCloseTo(1.124, 2);
    expect(t5.velvet).toBeCloseTo(0.803, 2);
  });

  it('reload-bound first hits: cinderella-crystal-wave on T5 is the sole carrier (4), all others zero', () => {
    // T5's re-phased refill windows (anis-star's full 2.8-gauge skill-impact credit + 2026-08-18
    // baseGaugeProb 0.25 enactment) put four of cinderella-crystal-wave's window-first hits on a
    // reload completion. Every other unit on every audited comp reads zero — the comp-level
    // NOT-STARVED verdicts rest on the team first-1s ratios above, which both clear the
    // pre-committed 0.8 threshold.
    for (const r of reports) {
      for (const u of r.perUnit) {
        if (r.comp === 'T5 wind-weak' && u.slug === 'cinderella-crystal-wave') {
          expect(u.reloadBoundFirsts).toBe(4);
        } else {
          expect(u.reloadBoundFirsts).toBe(0);
        }
      }
    }
  });

  it('pins the deterministic per-bucket team hit counts (drift guard)', () => {
    // iron sweep: all-SR comp, low hit counts; T5: SMG/MG-heavy, high counts.
    // iron sweep RE-PINNED 2026-08-14 (was [24, 20, 40, 78]) — the `liberalio` Charge Speed
    // immunity re-phases the comp against the FB boundary, moving ~6 hits out of the first
    // second and into the window tail. Re-derived from the instrument's --json.
    // T5 values from the same instrument run that re-pinned its first-1s ratios above.
    expect(byName('iron sweep (run G)').teamHits).toEqual([18, 17, 42, 86]);
    expect(byName('T5 wind-weak').teamHits).toEqual([297, 282, 582, 595]);
  });

  it('T5 is FRONT-LOADED; iron sweep is FLAT-to-slightly-tail-heavy — neither RAMPS from starvation', () => {
    // RE-SCOPED 2026-08-14. The old form asserted teamRate[0] > teamRate[3] on BOTH comps. That
    // is still true on T5 (59.45 vs 35.18) but NOT on iron sweep after the `liberalio` Charge
    // Speed immunity (3.27 vs 3.64) — its four SR/charge units now sit differently against the
    // boundary. This does NOT reinstate the starvation hypothesis: a starved window ramps UP from
    // a near-empty first bucket, and iron sweep's first bucket is 0.898x its tail with zero
    // reload-bound first hits, versus the >=0.8 threshold the plan pre-committed to. The claim
    // that WEAKENED is the descriptive "front-loaded" shape on that one comp, not the verdict.
    const t5 = byName('T5 wind-weak');
    expect(t5.teamRate[0]).toBeGreaterThan(t5.teamRate[3]);

    const iron = byName('iron sweep (run G)');
    expect(iron.teamRate[0]).toBeCloseTo(3.273, 2);
    expect(iron.teamRate[3]).toBeCloseTo(3.644, 2);
    // flat, not a ramp: the opening bucket runs at 0.898x the steady-state tail. Pinned as the
    // derived value rather than compared to a threshold — a hand-picked bound here would just be
    // this number rounded down, which guards nothing.
    expect(iron.teamRate[0] / iron.teamRate[3]).toBeCloseTo(0.898, 2);
  });
});
