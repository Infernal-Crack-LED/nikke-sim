// Pins the PER-FRAME GAUGE-CREDIT SCHEDULE instrument
// (`npx tsx scripts/battery/fb-count-matrix.ts --credit-schedule`).
//
// WHAT THE INSTRUMENT IS: the sim-side credit timeline — for every UNLOCKED region of a comp (the
// fight-opening first fill, and each [Full-Burst-end, gauge-full) refill window), the ordered
// (frame, unit, amount, source kind) list of everything fed to the burst bar. It exists so a
// later gated measurement can compare the SIM's credit timeline against a real fill trace
// frame-for-frame; the sibling --refill-starvation audit deliberately spreads a unit's
// whole-fight `gaugeGenerated` uniformly over its window hits, which cannot say what the bar was
// fed on any given frame.
//
// WHY THE FIXTURE ASSERTS CHECKS, NOT NUMBERS: the amounts are a RECONSTRUCTION — the event tap
// carries no gauge values — so what has to stay true is that the reconstruction still reproduces
// the engine. The instrument self-reports three INDEPENDENT checks and this fixture is the gate
// on all three:
//   (a) ENDPOINT — per-unit schedule sums equal the engine's own uncapped
//       `SimResult.units[].gaugeGenerated`. Catches a missed source, a wrong amount, a wrong lock
//       mask, anywhere in the fight.
//   (b) DBG_GAUGE — every `[g] t=… slug +X gauge=Y` line sim.ts prints for the first 30s is
//       matched against the schedule within the log's toFixed(2) rounding. Engine truth for the
//       shot + skill channels, and structurally BLIND to fillGauge (which bypasses `addGauge`).
//   (c) TRUNCATED-RUN — `cfg.durationSec` only bounds the frame loop, so a shorter run is a strict
//       prefix. Diffing per-unit `gaugeGenerated` across two adjacent frame boundaries reads the
//       engine's ACTUAL credit at that frame — the ONLY check that can see a fillGauge amount.
//
// THE COMP: `T5 wind-weak` (nayuta / cinderella-crystal-wave / anis-star / liberalio / velvet,
// boss Iron), one of the two comps with a filmed steady-state cycle. It is the deliberate choice
// over `iron sweep (run G)` because it seats all three credit kinds — including
// cinderella-crystal-wave's `teamAmmo 200 → fillGauge 12%`, the channel that emits no event and
// no log line and is therefore the one a naive tap-only reader silently drops.
//
// RUNTIME: the schedule itself is ONE 180s sim. Check (b) spawns a child process (sim.ts reads
// its debug env at module load), check (c) costs two truncated sims per sampled frame — so the
// fixture samples 6 frames instead of the CLI's 20. Re-derive, don't re-pin: if a check fails,
// run the instrument and read WHY before touching anything here.
import { describe, expect, it } from 'vitest';
import {
  CREDIT_SCHEDULE_COMPS,
  creditScheduleFor,
} from '../../battery/fb-count-matrix.js';

describe('per-frame gauge-credit schedule', () => {
  const r = creditScheduleFor('T5 wind-weak', { exactSamples: 6 });

  it('is emitted for the two filmed comps', () => {
    expect(CREDIT_SCHEDULE_COMPS).toEqual([
      'iron sweep (run G)',
      'T5 wind-weak',
    ]);
  });

  it('reconstructs every credit path on this comp (nothing flagged inexact)', () => {
    expect(r.unreconstructed).toEqual([]);
  });

  it('seats all three credit kinds, including the tap-invisible fillGauge channel', () => {
    const kinds = new Set(r.credits.map((c) => c.kind));
    expect([...kinds].sort()).toEqual(['fill', 'shot', 'skill']);
    const fills = r.credits.filter((c) => c.kind === 'fill');
    expect(fills.length).toBeGreaterThan(0);
    // cinderella-crystal-wave is the carrier (skill1 `teamAmmo 200 → fillGauge 12%`)
    expect(new Set(fills.map((c) => c.slug))).toEqual(
      new Set(['cinderella-crystal-wave'])
    );
    for (const f of fills) {
      expect(f.amount).toBeCloseTo(12, 10);
    }
  });

  it('CHECK (a): every unit’s schedule sums to the engine’s gaugeGenerated', () => {
    expect(r.checks.endpointMaxAbsResidual).toBeLessThan(1e-6);
    expect(r.checks.endpointOk).toBe(true);
    for (const e of r.checks.endpoint) {
      expect(e.scheduled).toBeCloseTo(e.engine, 9);
    }
  });

  it('CHECK (b): every DBG_GAUGE line the engine printed is matched', () => {
    expect(r.checks.dbgGauge.lines).toBeGreaterThan(0);
    expect(r.checks.dbgGauge.unmatchedEngine).toEqual([]);
    expect(r.checks.dbgGauge.unmatchedSchedule).toEqual([]);
    expect(r.checks.dbgGauge.matched).toBe(r.checks.dbgGauge.lines);
  });

  it('CHECK (c): sampled truncated-run steps equal the scheduled amounts', () => {
    expect(r.checks.truncatedSamples).toBe(6);
    expect(r.checks.truncated.length).toBeGreaterThan(0);
    for (const t of r.checks.truncated) {
      expect(t.engineStep).toBeCloseTo(t.scheduled, 9);
    }
    expect(r.checks.truncatedOk).toBe(true);
  });

  it('the truncated-run check covers the fillGauge channel specifically', () => {
    // The point of sampling fills FIRST: (a) only proves the fight TOTAL and (b) cannot see this
    // channel at all, so without a truncated step on a fill frame the amount is unvalidated.
    const fillSteps = r.checks.truncated.filter((t) =>
      t.kinds.includes('fill')
    );
    expect(fillSteps.length).toBeGreaterThan(0);
    for (const t of fillSteps) {
      expect(t.engineStep).toBeCloseTo(t.scheduled, 9);
    }
  });

  it('durationSec is a strict prefix of the full run', () => {
    expect(r.checks.prefixDeterminism.ok).toBe(true);
  });

  it('windows are the unlocked regions: one first fill, then one per Full-Burst end', () => {
    expect(r.windows[0].kind).toBe('first-fill');
    expect(r.windows[0].startFrame).toBe(0);
    expect(r.windows.filter((w) => w.kind === 'refill').length).toBe(
      r.windows.length - 1
    );
    for (const w of r.windows) {
      expect(w.endFrame).toBeGreaterThan(w.startFrame);
      // a window's gauge is one bar's worth (over-cap rides the last credit) unless the buzzer
      // cut it short
      if (!w.truncated) {
        expect(w.gauge).toBeGreaterThanOrEqual(100);
      }
    }
    // every credit lands inside the window it is filed under
    for (const c of r.credits) {
      const w = r.windows[c.window];
      expect(c.frame).toBeGreaterThanOrEqual(w.startFrame);
      expect(c.frame).toBeLessThan(w.endFrame);
    }
  });
});

describe('per-frame gauge-credit schedule — `gaugeHits` carrier comp', () => {
  // WHY THIS COMP: `N5 snowwhite-HA fire` seats `snow-white-heavy-arms` (Snow White: Heavy Arms,
  // SR — NOT `snow-white`), the one graded seat that carries `flatDamage.gaugeHits`. It is the
  // regression guard for a defect this file previously could not see: one skill/burst damage
  // instance is not always one gauge credit. A `flatDamage` with `gaugeHits: N` keeps ONE
  // aggregated damage instance (so tuned totals are preserved) but fires `skillGauge` N times —
  // sim.ts `case 'flatDamage'` (`e.gaugeHits ?? 1`) and the flighted-landing loop
  // (`p.gaugeHits ?? 1`). The reconstruction used to push exactly one credit per damage event and
  // never read the field, under-counting a carrier by (N−1) per impact; it was latent only because
  // neither previously-pinned comp seats one.
  //
  // Her S1(b) volley is `527.95%` sequential with `gaugeHits: 5` (5 loaded ammo, measured
  // 2026-08-15) on the same `shotFired` trigger as her ungated `41.9%` AoE, so every credited full
  // charge is 1 shot credit + 6 skill credits (1 + 5). Her S1(c) `1055.9%` / `gaugeHits: 10` block
  // fires only while swapped inside Full Burst, where generation is locked, so it contributes none.
  const r = creditScheduleFor('N5 snowwhite-HA fire', { exactSamples: 2 });
  const CARRIER = 'snow-white-heavy-arms';

  it('reconstructs every credit path on this comp (nothing flagged inexact)', () => {
    expect(r.unreconstructed).toEqual([]);
  });

  it('CHECK (a): the carrier’s schedule sums to the engine’s gaugeGenerated', () => {
    // The endpoint residual IS the defect's signature: crediting once per instance left
    // `snow-white-heavy-arms` scheduled 463.008 against an engine 1080.352 (−617.34).
    const carrier = r.checks.endpoint.find((e) => e.slug === CARRIER);
    expect(carrier).toBeDefined();
    expect(carrier!.scheduled).toBeCloseTo(carrier!.engine, 9);
    expect(r.checks.endpointOk).toBe(true);
    for (const e of r.checks.endpoint) {
      expect(e.scheduled).toBeCloseTo(e.engine, 9);
    }
  });

  it('CHECK (b): every DBG_GAUGE line the engine printed is matched', () => {
    // Engine truth, independent of the reconstruction: addGauge prints one `[g]` line per
    // skillGauge call, so a sub-hit the schedule drops shows up here as an unmatched line.
    expect(r.checks.dbgGauge.lines).toBeGreaterThan(0);
    expect(r.checks.dbgGauge.unmatchedEngine).toEqual([]);
    expect(r.checks.dbgGauge.unmatchedSchedule).toEqual([]);
    expect(r.checks.dbgGauge.matched).toBe(r.checks.dbgGauge.lines);
  });

  it('CHECK (c): sampled truncated-run steps equal the scheduled amounts', () => {
    expect(r.checks.truncated.length).toBeGreaterThan(0);
    for (const t of r.checks.truncated) {
      expect(t.engineStep).toBeCloseTo(t.scheduled, 9);
    }
    expect(r.checks.truncatedOk).toBe(true);
  });

  it('credits the multi-hit volley PER SUB-HIT: 6 skill credits on every credited charge', () => {
    const skill = r.credits.filter(
      (c) => c.slug === CARRIER && c.kind === 'skill'
    );
    expect(skill.length).toBeGreaterThan(0);
    const perFrame = new Map<number, number>();
    for (const c of skill) {
      perFrame.set(c.frame, (perFrame.get(c.frame) ?? 0) + 1);
    }
    // 1 (the 41.9% AoE) + 5 (the 527.95% volley's `gaugeHits`). One credit per instance reads 2.
    expect([...new Set(perFrame.values())]).toEqual([6]);
    // each sub-hit is a SEPARATE credit of the same per-impact amount, not one N-fold credit —
    // that is what lets CHECK (b) match DBG_GAUGE line-for-line
    const amounts = new Set(skill.map((c) => c.amount.toFixed(9)));
    expect(amounts.size).toBe(1);
    // every credited charge also carries its own trigger-pull credit
    const shotFrames = new Set(
      r.credits
        .filter((c) => c.slug === CARRIER && c.kind === 'shot')
        .map((c) => c.frame)
    );
    expect([...perFrame.keys()].every((f) => shotFrames.has(f))).toBe(true);
  });
});

describe('per-frame gauge-credit schedule — SG comp', () => {
  // `misc B3s (run I order)` seats `noir` (SG), so this exercises the hitFraction path that
  // was previously flagged as unreconstructed.
  const r = creditScheduleFor('misc B3s (run I order)', { exactSamples: 2 });

  it('reconstructs every credit path on this comp (nothing flagged inexact)', () => {
    expect(r.unreconstructed).toEqual([]);
  });

  it('CHECK (a): every unit’s schedule sums to the engine’s gaugeGenerated', () => {
    expect(r.checks.endpointOk).toBe(true);
    for (const e of r.checks.endpoint) {
      expect(e.scheduled).toBeCloseTo(e.engine, 9);
    }
  });

  it('CHECK (b): every DBG_GAUGE line the engine printed is matched', () => {
    expect(r.checks.dbgGauge.lines).toBeGreaterThan(0);
    expect(r.checks.dbgGauge.unmatchedEngine).toEqual([]);
    expect(r.checks.dbgGauge.unmatchedSchedule).toEqual([]);
    expect(r.checks.dbgGauge.ok).toBe(true);
  });

  it('CHECK (c): sampled truncated-run steps equal the scheduled amounts', () => {
    expect(r.checks.truncated.length).toBeGreaterThan(0);
    for (const t of r.checks.truncated) {
      expect(t.engineStep).toBeCloseTo(t.scheduled, 9);
    }
    expect(r.checks.truncatedOk).toBe(true);
  });

  it('SG shot credits vary with hitFraction (not a flat full-trigger credit)', () => {
    const sgShots = r.credits.filter(
      (c) => c.kind === 'shot' && c.slug === 'noir'
    );
    expect(sgShots.length).toBeGreaterThan(0);
    const amounts = sgShots.map((c) => c.amount);
    expect(Math.min(...amounts)).toBeLessThan(Math.max(...amounts));
  });
});
