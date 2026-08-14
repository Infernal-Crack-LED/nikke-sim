// Burst-cycle tempo decomposition — the per-cycle table behind the 2026-08-13 tempo-gap
// measurement (docs/probe-runs.md). Driven by `scripts/probe/scan.ts --cycle-table`.
//
// WHY THIS EXISTS AS ITS OWN MODULE: the two guards below are the load-bearing evidence in that
// measurement, and an instrument cited as evidence must be committed AND self-validating (owner
// ruling 2026-07-29). Everything here is a PURE function over a frame trace, so
// `scripts/tests/probe/cycle-table.test.ts` pins it against committed fixtures WITHOUT the
// recordings — `docs/probes/` is gitignored, so a test that needed the video could never run.
//
// WHAT IT MEASURES. Per burst cycle: the Full-Burst start (drain-window start), the cycle PERIOD
// (FB-start -> next FB-start), the burst-chain cast LADDER (stage1 -> stage2 -> stage3 -> FB), and
// the FB-start -> next-stage1 span. Periods and ladders are DIFFERENCES BETWEEN TWO EVENTS IN THE
// SAME VIDEO, so no fight-clock anchor (`--t0`) enters them — the documented "video time != fight
// time" confound cannot reach these numbers.
//
// WHAT IT CANNOT MEASURE, and why the guards exist. The drain bar's last ~1.5s is too narrow to
// render (scan.ts's own caveat), so a window's END is NOT the Full Burst's end and a window
// duration is NOT a Full Burst duration. Two further defects were found in `scan-frames.py` on
// 2026-08-13 and are CORRECTED HERE rather than in the worker (changing the worker would move the
// 8/8-exact FB counts it is validated on):
//
//   * LATE START (10 of 26 cycles measured): the burst cut-in occludes the gauge HUD for ~0.4s
//     right after the bar first renders. If the last pre-occlusion frame has already partly
//     decayed, the re-appearance trips `RESET_JUMP` and `full_windows()` discards the true opening
//     sub-window (shorter than `WINDOW_MIN`), restarting the window ~0.417s late. GUARD 3A rejects
//     those cycles from the duration bound by requiring the window to start where the engine's
//     22-frame B3->FB delay says it must.
//   * TAIL STITCHING: `GAP_TOL = 1.0s` welds isolated post-FB CV false positives onto a window's
//     tail, inflating its duration by 0.55-0.88s. GUARD 3B re-derives each end from the raw fill
//     trace and keeps only a CONTIGUOUS run — a draining bar is monotone, so a trace that goes
//     0 -> 0.037 -> 0 -> 0.044 -> 0 is detector noise, not a still-rendering bar.
//
// Both guards move the Full-Burst-duration lower bound DOWNWARD (more conservative). That
// direction matters: the bound is used to rule OUT "the real Full Burst is shorter than the
// modeled 10s" as an explanation for a tempo gap, so a bound inflated by an artifact would
// manufacture the conclusion it is supposed to test.

/** One sampled frame of the burst-gauge crop. `fill` is the drain bar's rendered width fraction. */
export interface GaugeFrameLike {
  videoT: number;
  fill: number;
}

/** A Full Burst window as `scan-frames.py` reports it (start/end are RENDERED, not true, edges). */
export interface WindowLike {
  start: number;
  end: number;
  durationSec: number;
}

/** A burst chain's three stage-cast onsets, as `scan.ts` groups them. */
export interface ChainLike {
  stage1: number | null;
  stage2: number | null;
  stage3: number | null;
}

export interface CycleTableOpts {
  /** Engine constant: B3 cast -> FB countdown. `FB_PRE_DELAY_FRAMES` = 22f @60fps. */
  fbPreDelaySec?: number;
  /** Guard 3A: how far a window start may sit from (stage3 + fbPreDelay). Default ±2 source frames. */
  guard3aTolSec?: number;
  /** Guard 3B: a frame counts as "bar rendered" above this fill. Mirrors the worker's FILL_MIN. */
  fillMin?: number;
  /** Guard 3B: sub-threshold span that BREAKS a contiguous run. Far tighter than the worker's 1.0s. */
  gapTolSec?: number;
  /** Guard 3B: runs shorter than this many frames are detector noise, not a rendered bar. */
  minRunFrames?: number;
  /** Guard 3B: never search for an end beyond this many seconds past the window start. */
  searchCapSec?: number;
}

const DEFAULTS: Required<CycleTableOpts> = {
  fbPreDelaySec: 22 / 60,
  guard3aTolSec: 2 / 60,
  fillMin: 0.02,
  gapTolSec: 0.034,
  minRunFrames: 3,
  searchCapSec: 11,
};

export interface CycleRow {
  index: number;
  /** Full-Burst start = drain-window start (frame-accurate when guard 3A passes). */
  fbStart: number;
  /** FB-start -> next FB-start. `null` on the last cycle. */
  period: number | null;
  stage1: number | null;
  stage2: number | null;
  stage3: number | null;
  /** stage1 -> FB start. Compare against the engine's 30f+30f+22f = 82f = 1.3667s. */
  ladder: number | null;
  /** FB-start -> next cycle's stage1: the indivisible (FB duration + refill + pre-B1) span. */
  fbToNextStage1: number | null;
  /** The worker's reported window duration — INFLATED where guard 3B fires. */
  nominalDuration: number;
  /** Guard-3B-corrected duration: the contiguous rendered run only. */
  correctedDuration: number | null;
  /** Whether guard 3B changed this window's end (i.e. the worker had stitched a tail onto it). */
  tailStitched: boolean;
  /** fbStart − (stage3 + fbPreDelay). Bimodal in practice: ~−0.017s (clean) or ~+0.4s (late start). */
  guard3aResidual: number | null;
  /** Guard 3A verdict — only qualifying cycles may feed the Full-Burst duration bound. */
  qualifies: boolean;
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  if (!s.length) {
    return NaN;
  }
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * GUARD 3B — re-derive a window's true rendered end from the raw fill trace.
 *
 * Groups the lit frames (`fill > fillMin`) into runs separated by a sub-threshold gap longer than
 * `gapTolSec`, DISCARDS runs shorter than `minRunFrames`, and takes the END OF THE LAST SURVIVOR.
 *
 * The two rejections this performs are different, and both are needed:
 *   * the STITCHED TAIL — one or two isolated bright frames well after the bar has decayed to zero.
 *     A draining bar is monotone, so a trace going 0 -> 0.037 -> 0 -> 0.044 -> 0 cannot be a bar
 *     still rendering; those runs fall below `minRunFrames` and are dropped.
 *   * the CUT-IN OCCLUSION — the burst cut-in hides the HUD for ~0.4s immediately after the true
 *     Full Burst start, so the trace legitimately has a short lit blip, a gap, then the main body.
 *     This is why the scan cannot simply stop at the first gap: doing so measures the blip (~0.03s)
 *     instead of the Full Burst. Grouping-then-discarding tolerates the occlusion and still drops
 *     the tail, because the two differ in RUN LENGTH, not in position.
 */
export function deriveWindowEnd(
  frames: GaugeFrameLike[],
  startT: number,
  capT: number,
  opts: CycleTableOpts = {}
): { end: number | null; corroborated: boolean; frameCount: number } {
  const o = { ...DEFAULTS, ...opts };
  const win = frames
    .filter((f) => f.videoT >= startT - 1e-9 && f.videoT <= capT + 1e-9)
    .sort((a, b) => a.videoT - b.videoT);

  type Run = { startT: number; endT: number; frames: number };
  const runs: Run[] = [];
  let cur: Run | null = null;

  for (const f of win) {
    if (f.fill > o.fillMin) {
      if (cur && f.videoT - cur.endT > o.gapTolSec) {
        runs.push(cur);
        cur = null;
      }
      if (!cur) {
        cur = { startT: f.videoT, endT: f.videoT, frames: 0 };
      }
      cur.endT = f.videoT;
      cur.frames++;
    }
  }
  if (cur) {
    runs.push(cur);
  }

  const surviving = runs.filter((r) => r.frames >= o.minRunFrames);
  if (!surviving.length) {
    return { end: null, corroborated: false, frameCount: 0 };
  }
  const last = surviving[surviving.length - 1];
  return {
    end: last.endT,
    corroborated: true,
    frameCount: surviving.reduce((a, r) => a + r.frames, 0),
  };
}

/**
 * Build the per-cycle tempo table. `windows` is the drain spine; each is matched to the burst chain
 * whose stage-3 cast most closely precedes it.
 */
export function buildCycleTable(
  input: {
    windows: WindowLike[];
    chains: ChainLike[];
    frames: GaugeFrameLike[];
  },
  opts: CycleTableOpts = {}
): CycleRow[] {
  const o = { ...DEFAULTS, ...opts };
  const windows = [...input.windows].sort((a, b) => a.start - b.start);
  const chains = [...input.chains].sort(
    (a, b) => (a.stage3 ?? a.stage1 ?? 0) - (b.stage3 ?? b.stage1 ?? 0)
  );

  return windows.map((w, i) => {
    // the chain that opened THIS Full Burst: latest stage3 strictly before the window start
    const chain =
      [...chains]
        .filter((c) => c.stage3 != null && c.stage3 < w.start + 1e-9)
        .pop() ?? null;

    const next = windows[i + 1] ?? null;
    const nextChain =
      chains.find(
        (c) =>
          c.stage1 != null &&
          c.stage1 > w.start &&
          (!next || c.stage1 < next.start + 1e-9)
      ) ?? null;

    const capT = Math.min(
      w.start + o.searchCapSec,
      next ? next.start - 0.2 : Number.POSITIVE_INFINITY
    );
    const derived = deriveWindowEnd(input.frames, w.start, capT, o);

    const guard3aResidual =
      chain?.stage3 != null
        ? Math.round((w.start - (chain.stage3 + o.fbPreDelaySec)) * 1e4) / 1e4
        : null;

    const correctedDuration =
      derived.end != null && derived.corroborated
        ? Math.round((derived.end - w.start) * 1e4) / 1e4
        : null;

    return {
      index: i + 1,
      fbStart: w.start,
      period: next ? Math.round((next.start - w.start) * 1e4) / 1e4 : null,
      stage1: chain?.stage1 ?? null,
      stage2: chain?.stage2 ?? null,
      stage3: chain?.stage3 ?? null,
      ladder:
        chain?.stage1 != null
          ? Math.round((w.start - chain.stage1) * 1e4) / 1e4
          : null,
      fbToNextStage1:
        nextChain?.stage1 != null
          ? Math.round((nextChain.stage1 - w.start) * 1e4) / 1e4
          : null,
      nominalDuration: w.durationSec,
      correctedDuration,
      tailStitched:
        correctedDuration != null &&
        Math.abs(correctedDuration - w.durationSec) > 0.05,
      guard3aResidual,
      qualifies:
        guard3aResidual != null &&
        Math.abs(guard3aResidual) <= o.guard3aTolSec + 1e-9,
    };
  });
}

/**
 * The Full-Burst-duration LOWER bound: the longest guard-3A-qualifying, guard-3B-corroborated
 * window. Valid as a lower bound because the rendered window is a strict SUBSET of the true Full
 * Burst (the bar under-renders at the narrow end, and guard 3A excludes late starts). It is NOT a
 * duration measurement and must never be used as one.
 */
export function fbDurationLowerBound(rows: CycleRow[]): {
  bound: number | null;
  cycle: number | null;
  qualifyingCycles: number[];
  excludedCycles: number[];
} {
  const qualifying = rows.filter(
    (r) => r.qualifies && r.correctedDuration != null
  );
  let best: CycleRow | null = null;
  for (const r of qualifying) {
    if (
      !best ||
      (r.correctedDuration as number) > (best.correctedDuration as number)
    ) {
      best = r;
    }
  }
  return {
    bound: best ? (best.correctedDuration as number) : null,
    cycle: best ? best.index : null,
    qualifyingCycles: qualifying.map((r) => r.index),
    excludedCycles: rows.filter((r) => !r.qualifies).map((r) => r.index),
  };
}

/**
 * Steady-state statistics over the middle 60% of cycles — the SAME window
 * `decomposeCycles()` (scripts/experiment.ts) applies to the sim, so the two sides are
 * like-for-like. Edge cycles carry opening/closing effects on both sides.
 */
export function steadyStatePeriods(rows: CycleRow[]): {
  periods: number[];
  mean: number;
  median: number;
  sd: number;
} {
  const n = rows.length;
  const lo = Math.floor(n * 0.2);
  const hi = Math.ceil(n * 0.8);
  const periods: number[] = [];
  for (let i = lo + 1; i < hi; i++) {
    const p = rows[i - 1]?.period;
    if (p != null) {
      periods.push(p);
    }
  }
  const mean = periods.length
    ? periods.reduce((a, b) => a + b, 0) / periods.length
    : NaN;
  const sd = periods.length
    ? Math.sqrt(
        periods.reduce((a, b) => a + (b - mean) ** 2, 0) /
          Math.max(1, periods.length - 1)
      )
    : NaN;
  return { periods, mean, median: median(periods), sd };
}
