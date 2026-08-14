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
// THE FINDING this fixture guards (measured 2026-08-14, deterministic EV runs):
//   * iron sweep (run G): first-1s delivers 1.147x the tail rate — FRONT-LOADED, not starved.
//   * T5 wind-weak:       first-1s delivers 1.407x the tail rate — FRONT-LOADED, not starved.
//   * reloadBoundFirsts = 0 for EVERY unit on BOTH comps — no unit's first post-FB hit lands on a
//     reload completion, the direct reload-starvation signature. Absent.
// Both clear the plan's pre-committed decision threshold (>=0.8 = NOT-STARVED => record and close).
// The window is front-loaded because units leave Full Burst with full/restored magazines and live
// buffs, so they generate FASTER at the boundary, not slower — the exact opposite of the
// hypothesis. Premise-verifier backing (fresh-context, 2026-08-14): the engine's FB boundaries
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
    // pinned 2026-08-14 measurements (front-loaded, well above threshold)
    expect(byName('iron sweep (run G)').first1sRatio).toBeCloseTo(1.147, 2);
    expect(byName('T5 wind-weak').first1sRatio).toBeCloseTo(1.407, 2);
  });

  it('no unit is front-loaded LESS than half its steady state (no hidden per-unit starvation)', () => {
    for (const r of reports) {
      for (const u of r.perUnit) {
        // the one sub-1.0 reading (liberalio 0.68 on iron sweep) is charge-PHASE timing, not
        // reload starvation (reloadBoundFirsts 0); nothing approaches the 0.5 starvation band.
        expect(u.first1sRatio).toBeGreaterThan(0.5);
      }
    }
  });

  it('the reload-starvation signature is absent: zero reload-bound first hits on every unit', () => {
    for (const r of reports) {
      for (const u of r.perUnit) {
        expect(u.reloadBoundFirsts).toBe(0);
      }
    }
  });

  it('pins the deterministic per-bucket team hit counts (drift guard)', () => {
    // iron sweep: all-SR comp, low hit counts; T5: SMG/MG-heavy, high counts. Both front-loaded.
    expect(byName('iron sweep (run G)').teamHits).toEqual([24, 20, 40, 78]);
    expect(byName('T5 wind-weak').teamHits).toEqual([327, 320, 592, 703]);
  });

  it('the refill window is FRONT-LOADED, not ramping (the shape claim behind the verdict)', () => {
    for (const r of reports) {
      // the first-0.5s rate is at least the last-bucket rate — the opposite of a starvation ramp.
      expect(r.teamRate[0]).toBeGreaterThan(r.teamRate[3]);
    }
  });
});
