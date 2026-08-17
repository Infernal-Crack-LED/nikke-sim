// ============================================================================
// FILL-TRACE COMPARE — real team-HUD fill trace vs the sim's gauge-credit schedule.
//
// Run it:
//   # 1. which second-ranges of the recording to read (padded refill windows)
//   npx tsx scripts/probe/fill-trace-compare.ts spans \
//     --fixture docs/probe-data/tempo-cycle-u8-g-iron-sweep.json
//   # 2. the reader (scripts/probe/gauge-fill.py --team) over exactly those spans
//   # 3. the comparison
//   npx tsx scripts/probe/fill-trace-compare.ts analyze \
//     --fixture docs/probe-data/tempo-cycle-u8-g-iron-sweep.json \
//     --real  /tmp/filltrace/u8g-trace.json \
//     --schedule /tmp/credit-schedule.json --comp "iron sweep (run G)" \
//     --out docs/probe-data/fill-trace-u8-g-iron-sweep.json
//
// WHAT IT COMPARES. A refill window is the ONE gauge-generating window per cycle
// (`FB-end -> chain-start`, CLAUDE.md verified facts). On the REAL side its bounds come from two
// independent detectors on the same recording: `fullWindows[].end` (scan-frames.py's magenta
// Full-Burst drain bar) and the gauge-fill reader's own green-full instant. On the SIM side the
// bounds are the engine-exact unlocked region emitted by
// `scripts/battery/fb-count-matrix.ts --credit-schedule`. Both sides are therefore
// [Full-Burst end, gauge-full] — the like-for-like definition — and neither uses the
// `B1 - 0.5s` convention, which is itself one of the things under test.
//
// The two sides run at DIFFERENT tempos (that is the whole point), so a window is compared by
// FRACTION OF ITSELF, never by absolute seconds: the real clean-read span [t0, t1] maps to the
// same relative sub-span of the sim window, and R = realRate / simRate over that pair of spans.
//
// PRE-COMMITTED (docs/handoffs/2026-08-14-fill-trace-preop-packet.md, section C + revisions R1-R3):
//   * R1 — the >=50% clean-coverage drop rule is computed over the VISIBLE span
//     (bar-paint -> gauge-full), not the whole window; every window also reports `visibleFraction`.
//   * R2 — an increment BRIDGING an excluded run feeds the cumulative rate through the span
//     endpoints, but is EXCLUDED from the increment histogram and the surplus census, and is
//     binned separately. This is what stops a gain-pulse from mimicking a real upper quantile.
//   * R3 — closure arithmetic against the measured per-cycle tempo gap is always reported.
//
// NOT IN SCOPE OF THIS TOOL (instrument limits, carried from the reader's own docstring):
// per-unit attribution (the trace is the TEAM SUM), absolute low-fill levels, and the ~0.8-1.7s
// window opening where the drained Full-Burst bar still owns the widget slot.
// ============================================================================
import { readFileSync, writeFileSync } from 'node:fs';

import { buildCycleTable } from './cycle-table.js';

// ---------------------------------------------------------------------------
// pre-committed constants
// ---------------------------------------------------------------------------
/** A fill step at/above this is an "event" (2 columns of the 134px bar; the reader floor is 0.75%). */
export const EVENT_MIN_PCT = 1.5;
/** Surplus census: a real event with no scheduled credit within this many frames is off-schedule. */
export const SURPLUS_FRAMES = 5;
/** R1: a window whose VISIBLE span is less than this fraction clean is dropped. */
export const MIN_CLEAN_COVERAGE = 0.5;
/** Decision rule thresholds (section C). */
export const R_CONFIRM = 1.3;
export const R_REJECT = 1.15;
export const MAX_R_IQR = 0.5;
export const MIN_READABLE_WINDOWS = 6;
/** A single class is stamped only if it carries this share of the surplus. */
export const CLASS_STAMP_SHARE = 0.6;
/** H-C threshold: off-schedule surplus at/above this share of surplus gauge. */
export const HC_SHARE = 0.3;

/**
 * Reader flags that make a `filling` read untrustworthy. Union of the reader's own taxonomy.
 * `offCurve` (added 2026-08-14) closes the leak this tool's own monotonicity census exposed:
 * multi-frame spurious-high excursions escaped `spike` and poisoned the `levelDrop` re-anchor,
 * leaving 11 of 36 refill windows with clean-set monotonicity violations (worst 91%). The
 * committed replay bundles predate the flag — their traces carry no `offCurve` read, so their
 * pinned results reproduce unchanged; traces emitted by the current reader do carry it.
 */
export const DIRTY_FLAGS = [
  'lowFill',
  'flash',
  'inFlashSpan',
  'spike',
  'nonMonotonic',
  'levelDrop',
  'offCurve',
  'noDarkTrack',
  'burstRender',
  'drainTail',
  'chainRender',
  'fullBurstDrain',
] as const;

// ---------------------------------------------------------------------------
// inputs
// ---------------------------------------------------------------------------
// Shape of the committed tempo fixtures (docs/probe-data/tempo-cycle-*.json), written by
// `scripts/probe/scan.ts --cycle-table --fixture-out <p>`.
//
// ⚠ PRODUCER/TYPE DRIFT (closed 2026-08-17). This interface used to declare only a SUBSET of what
// the writer emits: `_note`, `frameT`, `frameFill`, the `fullWindows` fill columns, and six of the
// eight `expected` keys were all missing. The drift was invisible at compile time and consumers
// worked around it with casts — e.g. `fixture as TempoFixture & { frameT: number[] }` in
// `scripts/tests/probe/n3-third-arm.test.ts`. The practical cost: a rename in the writer would have
// type-checked clean here and only surfaced at runtime, on a fixture that replays a recording
// `docs/probes/` no longer has. Every field below was verified present in the committed fixtures on
// 2026-08-17; anything not universal is optional, and marked with which fixture lacks it.
export interface TempoFixture {
  _note?: string;
  source: { video: string; fps: number; command: string };
  fullWindows: {
    start: number;
    end: number;
    durationSec: number;
    partial: boolean;
    // Fill columns — emitted by the writer for every window; optional so a hand-authored
    // fixture stays assignable.
    peakFill?: number;
    startFill?: number;
    endFill?: number;
    last?: number;
    lastFill?: number;
  }[];
  burstChains: {
    stage1: number | null;
    stage2: number | null;
    stage3: number | null;
  }[];
  // Per-frame trace. Absent from the older hand-built
  // `fill-trace-u8-i-misc-b3s-windows.json` (PI2), present in every scan.ts-written fixture.
  frameT?: number[];
  frameFill?: number[];
  expected?: {
    fullBursts?: number;
    steadyStateMean?: number;
    fbDurationLowerBound?: { bound: number; cycle: number };
    correctedDurations?: number[];
    qualifies?: boolean[];
    tailStitched?: boolean[];
    nominalDurations?: number[];
    // Newest field — present only in tempo-cycle-n3-scarlet-liberalio-iron.json so far.
    guard3aResiduals?: number[];
  };
}

export interface FillRead {
  t: number;
  state: string;
  fillRaw: number | null;
  flags: string[];
}

export interface FillTrace {
  mode: string;
  fps: number;
  bar: {
    widthPx: number;
    rows: number[];
    x0: number;
    x1: number;
    absolute?: unknown;
  };
  reads: FillRead[];
}

export interface SimCredit {
  frame: number;
  sec: number;
  slug: string;
  kind: string;
  amount: number;
  window: number;
}

export interface SimWindow {
  index: number;
  kind: string;
  startFrame: number;
  endFrame: number;
  startSec: number;
  endSec: number;
  truncated: boolean;
  credits: number;
  gauge: number;
}

export interface SimSchedule {
  comp: string;
  slugs: string[];
  focusSlug: string;
  windows: SimWindow[];
  credits: SimCredit[];
  unreconstructed: string[];
  checks: {
    endpointOk: boolean;
    truncatedOk: boolean;
    dbgGauge: { ok: boolean };
  };
}

// ---------------------------------------------------------------------------
// small stats helpers (no dependency, so the vitest pin covers them directly)
// ---------------------------------------------------------------------------
export function quantile(sortedAsc: number[], q: number): number {
  if (sortedAsc.length === 0) {
    return NaN;
  }
  if (sortedAsc.length === 1) {
    return sortedAsc[0];
  }
  const pos = (sortedAsc.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return lo === hi
    ? sortedAsc[lo]
    : sortedAsc[lo] + (pos - lo) * (sortedAsc[hi] - sortedAsc[lo]);
}
export function median(xs: number[]): number {
  return quantile(
    [...xs].sort((a, b) => a - b),
    0.5
  );
}
export function iqr(xs: number[]): { p25: number; p75: number; iqr: number } {
  const s = [...xs].sort((a, b) => a - b);
  const p25 = quantile(s, 0.25);
  const p75 = quantile(s, 0.75);
  return { p25, p75, iqr: p75 - p25 };
}
export function pearson(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) {
    return NaN;
  }
  const mx = xs.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const my = ys.slice(0, n).reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i += 1) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  return sxx === 0 || syy === 0 ? NaN : sxy / Math.sqrt(sxx * syy);
}

function round(x: number, n = 4): number {
  return Number.isFinite(x) ? Number(x.toFixed(n)) : x;
}

// ---------------------------------------------------------------------------
// window derivation
// ---------------------------------------------------------------------------
export interface RealWindow {
  /** 1-based ordinal of the refill window (the refill after the k-th Full Burst) */
  id: number;
  /** scan-frames.py: the magenta Full-Burst drain bar appeared here */
  fbStart: number;
  /** scan-frames.py: the Full-Burst drain bar emptied here */
  fbEnd: number;
  /** scan-frames.py: the next burst chain's stage-1 hexagon */
  stage1: number;
}

/**
 * A refill span runs from a `fullWindows[].end` to the NEXT non-null `burstChains[].stage1`.
 * Chains whose stage1 the hexagon detector recorded as null are skipped as chain BOUNDS but the
 * search still moves past them, so a null-stage1 chain never silently pairs a window with a much
 * later chain: it is only skipped when its own stage2 also precedes the next real stage1.
 */
export function refillWindows(fx: TempoFixture): RealWindow[] {
  const stage1s = fx.burstChains
    .map((c) => c.stage1)
    .filter((s): s is number => s !== null)
    .sort((a, b) => a - b);
  const out: RealWindow[] = [];
  fx.fullWindows.forEach((w, i) => {
    const s1 = stage1s.find((s) => s > w.end);
    if (s1 === undefined) {
      return;
    } // last Full Burst of the fight: no following chain
    out.push({ id: i + 1, fbStart: w.start, fbEnd: w.end, stage1: s1 });
  });
  return out;
}

/** The padded second-ranges to hand to `gauge-fill.py --spans`. */
export function spansFor(
  fx: TempoFixture,
  padPre = 1.5,
  padPost = 0.8
): string {
  return refillWindows(fx)
    .map(
      (w) =>
        `${(w.fbEnd - padPre).toFixed(2)}-${(w.stage1 + padPost).toFixed(2)}`
    )
    .join(',');
}

// ---------------------------------------------------------------------------
// per-window analysis
// ---------------------------------------------------------------------------
export function isClean(r: FillRead): boolean {
  return (
    r.state === 'filling' &&
    r.fillRaw !== null &&
    !r.flags.some((f) => (DIRTY_FLAGS as readonly string[]).includes(f))
  );
}

export interface WindowResult {
  id: number;
  status: 'ok' | 'dropped' | 'unpaired';
  reason?: string;
  // --- real bounds -------------------------------------------------------
  fbEnd: number;
  stage1: number;
  /** the gauge-fill reader's green-full instant inside this window */
  fullInstant: number | null;
  /** [fbEnd, fullInstant] — the like-for-like real refill window */
  wholeWindowSec: number;
  /** first `filling`-state read: the charging bar's first paint */
  barPaint: number | null;
  /** [barPaint, fullInstant] */
  visibleSec: number;
  visibleFraction: number;
  /** R1 denominator: clean filling reads / all frames inside the visible span */
  framesInVisible: number;
  cleanFrames: number;
  cleanFramePct: number;
  // --- real rate ---------------------------------------------------------
  cleanSpanStart: number;
  cleanSpanEnd: number;
  cleanSpanSec: number;
  cleanFillStart: number;
  cleanFillEnd: number;
  /** %/s over [cleanSpanStart, cleanSpanEnd] — endpoint arithmetic (R2) */
  realRate: number;
  // --- sim comparison ----------------------------------------------------
  simWindow: number | null;
  simStartSec: number;
  simEndSec: number;
  simWholeSec: number;
  /** the SAME relative sub-span of the sim window */
  simSpanStart: number;
  simSpanEnd: number;
  simSpanSec: number;
  simGauge: number;
  simRate: number;
  R: number;
  // --- convention-free whole-window closure (R3) --------------------------
  /** the bar must travel 0 -> 100 across the whole real window, by definition */
  wholeRealRate: number;
  /** the sim schedule's own whole-window rate over its own whole window */
  wholeSimRate: number;
  rWhole: number;
  /**
   * The same closure re-anchored on the WIDGET's own boundary instead of scan-frames.py's
   * `fullWindows[].end`. The charging bar paints at ~0 and holds ~0 for its first frames, so no
   * gauge was banked while the burst render owned the slot: the generating window is
   * [barPaint, fullInstant], and [fbEnd, barPaint] is still Full Burst. Reported alongside
   * `rWhole`, never instead of it — `rWhole` is the pre-committed anchoring.
   */
  visibleRealRate: number;
  rVisible: number;
  /** the Full Burst that preceded this window, magenta-bar onset -> charging-bar paint */
  fbStartToBarPaint: number | null;
  // --- the unobserved opening (H0b: blind-spot selection bias) ------------
  /** [fbEnd, first clean read] — the reader-blind opening plus its first readable frames */
  openingSec: number;
  /** cumulative bar level at the first clean read = everything the opening generated */
  openingGauge: number;
  openingRealRate: number;
  simOpeningGauge: number;
  simOpeningRate: number;
  rOpening: number;
  // --- structure ---------------------------------------------------------
  realDirectEvents: number[];
  realBridged: { delta: number; spanSec: number; framesBridged: number }[];
  simEvents: number[];
  surplus: { t: number; delta: number; nearestSimFrameGap: number | null }[];
  surplusGauge: number;
  /** how many DIRECT real events the surplus census examined */
  directEventCount: number;
  /**
   * H0b control for the surplus census: the fraction of the mapped sim span that already lies
   * within +-SURPLUS_FRAMES of SOME scheduled credit. A real event placed uniformly at random
   * would be called "off-schedule" with probability 1 - this. Without it, an off-schedule share
   * is not evidence of anything: at these credit densities chance alignment alone is 30-40%.
   */
  alignmentCoverage: number;
  /** clean-set reads that fall below a previous clean read (instrument quality, H0b) */
  monotonicityViolations: number;
  monotonicityWorstDrop: number;
  // --- boundary reads (method step 4d) -----------------------------------
  fullMinusStage1: number | null;
  fbEndToBarPaint: number | null;
  /** last burst-render frame -> first charging-bar paint */
  burstRenderEndToBarPaint: number | null;
}

export interface CompResult {
  comp: string;
  video: string;
  slugs: string[];
  focusSlug: string;
  /**
   * FALSE when the credit-schedule instrument's own self-checks did not pass on this comp
   * (endpoint residual, DBG_GAUGE match) or it flagged an `unreconstructed` credit path. Every
   * AMOUNT-derived statistic (R, rates, histograms, surplus) is then void and reported as NaN.
   * The WINDOW BOUNDS stay valid either way — they come from the engine's own `fullBurstEnd` /
   * `burstCast stage 1` events, not from the amount reconstruction — so the closure arithmetic
   * and the boundary reads survive.
   */
  amountsTrusted: boolean;
  scheduleWarnings: string[];
  windows: WindowResult[];
  readable: WindowResult[];
  medianR: number;
  rIqr: { p25: number; p75: number; iqr: number };
  /** R3 closure: whole-window, convention-free */
  medianRWhole: number;
  rWholeIqr: { p25: number; p75: number; iqr: number };
  /** the same, re-anchored on the charging bar's first paint (see WindowResult.rVisible) */
  medianRVisible: number;
  rVisibleIqr: { p25: number; p75: number; iqr: number };
  /** the reader-blind opening (secondary diagnostic, not part of the pre-committed rule) */
  medianROpening: number;
  /** Pearson r of per-window R against visibleFraction — the blind-spot selection-bias check */
  rVsVisibleFraction: number;
  realEventRate: number;
  simEventRate: number;
  realEventQuantiles: Record<string, number>;
  simEventQuantiles: Record<string, number>;
  bridged: {
    count: number;
    medianDelta: number;
    medianSpanSec: number;
    gauge: number;
  };
  /** surplus gauge / total real gauge over the readable windows */
  surplusShare: number;
  /** off-schedule EVENTS / direct events, next to what uniform-random placement would give */
  surplusEventShare: number;
  chanceOffScheduleShare: number;
  boundary: {
    fullMinusStage1: number[];
    fbEndToBarPaint: number[];
    burstRenderEndToBarPaint: number[];
    fbStartToBarPaint: number[];
  };
  /** R3 — per-cycle closure against the measured tempo gap, from measured instants only. */
  closure: {
    /** barPaint(k) -> barPaint(k+1): a 1-frame-precise widget instant on both ends */
    realCycleSec: number;
    /** the sim's own refill-window starts (= its Full-Burst ends) */
    simCycleSec: number;
    gapPerCycle: number;
    /** median real generating window [barPaint, fullInstant] vs the sim's whole refill window */
    realRefillSec: number;
    simRefillSec: number;
    refillDelta: number;
    /** gauge-full -> the NEXT Full Burst's true start (barPaint(k+1) - FB_SEC) */
    realLadderSec: number;
    simLadderSec: number;
    ladderDelta: number;
    /** what the two components leave over */
    residual: number;
    closedShare: number;
  };
}

/** The engine's modeled Full Burst length (owner ruling 2026-08-14: exactly 10s). */
export const FB_SEC = 10;
/** The engine's modeled gauge-full -> Full-Burst-start ladder: 30f + 30f + 30f + 22f. */
export const SIM_LADDER_SEC = 112 / 60;

function simTeamSumByFrame(
  credits: SimCredit[],
  from: number,
  to: number
): Map<number, number> {
  const m = new Map<number, number>();
  for (const c of credits) {
    if (c.sec > from && c.sec <= to) {
      m.set(c.frame, (m.get(c.frame) ?? 0) + c.amount);
    }
  }
  return m;
}

export function analyzeWindow(
  rw: RealWindow,
  reads: FillRead[],
  simWin: SimWindow | undefined,
  simCredits: SimCredit[]
): WindowResult {
  const base = {
    id: rw.id,
    fbEnd: rw.fbEnd,
    stage1: rw.stage1,
    fullInstant: null as number | null,
    wholeWindowSec: NaN,
    barPaint: null as number | null,
    visibleSec: NaN,
    visibleFraction: NaN,
    framesInVisible: 0,
    cleanFrames: 0,
    cleanFramePct: NaN,
    cleanSpanStart: NaN,
    cleanSpanEnd: NaN,
    cleanSpanSec: NaN,
    cleanFillStart: NaN,
    cleanFillEnd: NaN,
    realRate: NaN,
    simWindow: simWin?.index ?? null,
    simStartSec: simWin?.startSec ?? NaN,
    simEndSec: simWin?.endSec ?? NaN,
    simWholeSec: simWin ? simWin.endSec - simWin.startSec : NaN,
    simSpanStart: NaN,
    simSpanEnd: NaN,
    simSpanSec: NaN,
    simGauge: NaN,
    simRate: NaN,
    R: NaN,
    wholeRealRate: NaN,
    wholeSimRate:
      simWin && !simWin.truncated
        ? round(simWin.gauge / (simWin.endSec - simWin.startSec), 3)
        : NaN,
    rWhole: NaN,
    visibleRealRate: NaN,
    rVisible: NaN,
    fbStartToBarPaint: null as number | null,
    openingSec: NaN,
    openingGauge: NaN,
    openingRealRate: NaN,
    simOpeningGauge: NaN,
    simOpeningRate: NaN,
    rOpening: NaN,
    directEventCount: 0,
    alignmentCoverage: NaN,
    realDirectEvents: [] as number[],
    realBridged: [] as {
      delta: number;
      spanSec: number;
      framesBridged: number;
    }[],
    simEvents: [] as number[],
    surplus: [] as {
      t: number;
      delta: number;
      nearestSimFrameGap: number | null;
    }[],
    surplusGauge: 0,
    monotonicityViolations: 0,
    monotonicityWorstDrop: 0,
    fullMinusStage1: null as number | null,
    fbEndToBarPaint: null as number | null,
    burstRenderEndToBarPaint: null as number | null,
  };

  // reads inside [fbEnd, stage1] (the chain sweep relabels everything past the full instant)
  const inWin = reads.filter((r) => r.t >= rw.fbEnd && r.t <= rw.stage1);
  const full = inWin.find((r) => r.state === 'full');
  const firstFilling = inWin.find((r) => r.state === 'filling');
  const lastBurstRender = [...inWin]
    .reverse()
    .find((r) => r.state === 'burstRender' || r.state === 'fullburst');

  base.fullInstant = full ? full.t : null;
  base.barPaint = firstFilling ? firstFilling.t : null;
  base.fullMinusStage1 = full ? round(full.t - rw.stage1) : null;
  base.fbEndToBarPaint = firstFilling ? round(firstFilling.t - rw.fbEnd) : null;
  base.burstRenderEndToBarPaint =
    firstFilling && lastBurstRender
      ? round(firstFilling.t - lastBurstRender.t)
      : null;
  base.fbStartToBarPaint = firstFilling
    ? round(firstFilling.t - rw.fbStart)
    : null;

  if (!full || !firstFilling) {
    return {
      ...base,
      status: 'dropped',
      reason: !full
        ? 'no green-full instant inside the window'
        : 'no charging-bar paint',
    };
  }
  base.wholeWindowSec = round(full.t - rw.fbEnd);
  base.visibleSec = round(full.t - firstFilling.t);
  base.visibleFraction = round(base.visibleSec / base.wholeWindowSec);

  const visible = inWin.filter((r) => r.t >= firstFilling.t && r.t <= full.t);
  const clean = visible.filter(isClean);
  base.framesInVisible = visible.length;
  base.cleanFrames = clean.length;
  base.cleanFramePct = round(clean.length / visible.length);

  if (base.cleanFramePct < MIN_CLEAN_COVERAGE) {
    return {
      ...base,
      status: 'dropped',
      reason: `clean coverage ${(base.cleanFramePct * 100).toFixed(0)}% of the visible span < ${MIN_CLEAN_COVERAGE * 100}%`,
    };
  }
  if (clean.length < 2) {
    return { ...base, status: 'dropped', reason: 'fewer than 2 clean reads' };
  }

  const first = clean[0];
  const last = clean[clean.length - 1];
  base.cleanSpanStart = first.t;
  base.cleanSpanEnd = last.t;
  base.cleanSpanSec = round(last.t - first.t);
  base.cleanFillStart = first.fillRaw!;
  base.cleanFillEnd = last.fillRaw!;
  base.realRate = round(
    (last.fillRaw! - first.fillRaw!) / (last.t - first.t),
    3
  );

  // instrument-quality diagnostic (H0b): clean reads that fall below a previous clean read
  let runMax = -Infinity;
  for (const r of clean) {
    if (r.fillRaw! < runMax - EVENT_MIN_PCT) {
      base.monotonicityViolations += 1;
      base.monotonicityWorstDrop = Math.max(
        base.monotonicityWorstDrop,
        runMax - r.fillRaw!
      );
    }
    runMax = Math.max(runMax, r.fillRaw!);
  }
  base.monotonicityWorstDrop = round(base.monotonicityWorstDrop, 1);

  // R2: direct (frame-adjacent) increments feed the histogram; bridged ones are binned apart
  const fps = 60;
  for (let k = 1; k < clean.length; k += 1) {
    const a = clean[k - 1];
    const b = clean[k];
    const delta = b.fillRaw! - a.fillRaw!;
    const gapFrames = Math.round((b.t - a.t) * fps);
    if (gapFrames <= 1) {
      if (delta >= EVENT_MIN_PCT) {
        base.realDirectEvents.push(round(delta, 1));
      }
    } else {
      base.realBridged.push({
        delta: round(delta, 1),
        spanSec: round(b.t - a.t, 3),
        framesBridged: gapFrames - 1,
      });
    }
  }

  if (!simWin || simWin.truncated) {
    return {
      ...base,
      status: 'unpaired',
      reason: simWin
        ? 'the paired sim window is truncated by the 180s buzzer'
        : 'no sim refill window with this ordinal',
    };
  }

  // fraction mapping: the SAME relative sub-span of the sim window
  const f0 = (first.t - rw.fbEnd) / base.wholeWindowSec;
  const f1 = (last.t - rw.fbEnd) / base.wholeWindowSec;
  base.simSpanStart = round(simWin.startSec + f0 * base.simWholeSec, 4);
  base.simSpanEnd = round(simWin.startSec + f1 * base.simWholeSec, 4);
  base.simSpanSec = round(base.simSpanEnd - base.simSpanStart, 4);
  const byFrame = simTeamSumByFrame(
    simCredits,
    base.simSpanStart,
    base.simSpanEnd
  );
  base.simGauge = round(
    [...byFrame.values()].reduce((a, b) => a + b, 0),
    3
  );
  base.simEvents = [...byFrame.values()]
    .filter((v) => v >= EVENT_MIN_PCT)
    .map((v) => round(v, 2));
  base.simRate = round(base.simGauge / base.simSpanSec, 3);
  base.R = round(base.realRate / base.simRate, 3);

  // R3 — convention-free whole-window closure. Both sides travel their own whole window; neither
  // number depends on the visible span, the blind spot, or the `B1 - 0.5s` convention.
  base.wholeRealRate = round(100 / base.wholeWindowSec, 3);
  base.rWhole = round(base.wholeRealRate / base.wholeSimRate, 3);
  base.visibleRealRate = round(100 / base.visibleSec, 3);
  base.rVisible = round(base.visibleRealRate / base.wholeSimRate, 3);

  // H0b — the opening the reader cannot see. Its LENGTH is unobserved but its CUMULATIVE OUTPUT
  // is not: the first clean read's level is everything the opening produced. Comparing it against
  // the sim schedule's own opening is what separates "the sim under-credits" from "the sim credits
  // the same total on a different SHAPE".
  base.openingSec = round(first.t - rw.fbEnd, 3);
  base.openingGauge = round(first.fillRaw!, 1);
  base.openingRealRate = round(base.openingGauge / base.openingSec, 3);
  const openByFrame = simTeamSumByFrame(
    simCredits,
    simWin.startSec - 1e-9,
    base.simSpanStart
  );
  base.simOpeningGauge = round(
    [...openByFrame.values()].reduce((a, b) => a + b, 0),
    3
  );
  base.simOpeningRate = round(
    base.simOpeningGauge / (base.simSpanStart - simWin.startSec),
    3
  );
  base.rOpening = round(base.openingRealRate / base.simOpeningRate, 3);

  // surplus census: a real DIRECT event with no scheduled credit within +-SURPLUS_FRAMES,
  // on the fraction-mapped axis (the only common axis two different tempos share)
  const simFrames = [...byFrame.keys()].sort((a, b) => a - b);
  for (let k = 1; k < clean.length; k += 1) {
    const a = clean[k - 1];
    const b = clean[k];
    const delta = b.fillRaw! - a.fillRaw!;
    if (Math.round((b.t - a.t) * fps) > 1 || delta < EVENT_MIN_PCT) {
      continue;
    }
    const frac = (b.t - rw.fbEnd) / base.wholeWindowSec;
    const mapped = Math.round((simWin.startSec + frac * base.simWholeSec) * 60);
    let best: number | null = null;
    for (const sf of simFrames) {
      const d = Math.abs(sf - mapped);
      if (best === null || d < best) {
        best = d;
      }
    }
    base.directEventCount += 1;
    if (best === null || best > SURPLUS_FRAMES) {
      base.surplus.push({
        t: b.t,
        delta: round(delta, 1),
        nearestSimFrameGap: best,
      });
      base.surplusGauge = round(base.surplusGauge + delta, 1);
    }
  }

  // chance-alignment baseline: what share of the mapped span is ALREADY within +-SURPLUS_FRAMES
  // of some credit? Anything at or below this is what uniform-random placement would produce.
  const lo = Math.round(base.simSpanStart * 60);
  const hi = Math.round(base.simSpanEnd * 60);
  let covered = 0;
  for (let f = lo; f <= hi; f += 1) {
    if (simFrames.some((sf) => Math.abs(sf - f) <= SURPLUS_FRAMES)) {
      covered += 1;
    }
  }
  base.alignmentCoverage = round(covered / Math.max(1, hi - lo + 1), 3);

  return { ...base, status: 'ok' };
}

export function analyzeComp(
  fx: TempoFixture,
  trace: FillTrace,
  sched: SimSchedule
): CompResult {
  const scheduleWarnings: string[] = [];
  if (!sched.checks.endpointOk) {
    scheduleWarnings.push('credit-schedule endpoint check FAILED');
  }
  if (!sched.checks.dbgGauge.ok) {
    scheduleWarnings.push('credit-schedule DBG_GAUGE check FAILED');
  }
  if (!sched.checks.truncatedOk) {
    scheduleWarnings.push('credit-schedule truncated-run check FAILED');
  }
  for (const u of sched.unreconstructed) {
    scheduleWarnings.push(`unreconstructed: ${u}`);
  }
  const amountsTrusted = scheduleWarnings.length === 0;

  const simRefills = sched.windows
    .filter((w) => w.kind === 'refill')
    .sort((a, b) => a.index - b.index);
  const windows = refillWindows(fx).map((rw) =>
    analyzeWindow(rw, trace.reads, simRefills[rw.id - 1], sched.credits)
  );
  if (!amountsTrusted) {
    // void every AMOUNT-derived field rather than printing a number the instrument disowns
    for (const w of windows) {
      w.simGauge = NaN;
      w.simRate = NaN;
      w.R = NaN;
      w.wholeSimRate = NaN;
      w.rWhole = NaN;
      w.rVisible = NaN;
      w.simOpeningGauge = NaN;
      w.simOpeningRate = NaN;
      w.rOpening = NaN;
      w.simEvents = [];
      w.surplus = [];
      w.surplusGauge = NaN;
      w.alignmentCoverage = NaN;
    }
  }
  const readable = windows.filter((w) => w.status === 'ok');
  const Rs = readable.map((w) => w.R);

  const realEv = readable
    .flatMap((w) => w.realDirectEvents)
    .sort((a, b) => a - b);
  const simEv = readable.flatMap((w) => w.simEvents).sort((a, b) => a - b);
  const realSpanSec = readable.reduce((a, w) => a + w.cleanSpanSec, 0);
  const simSpanSec = readable.reduce((a, w) => a + w.simSpanSec, 0);
  const bridged = readable.flatMap((w) => w.realBridged);
  const totalRealGauge = readable.reduce(
    (a, w) => a + (w.cleanFillEnd - w.cleanFillStart),
    0
  );
  const surplusGauge = readable.reduce((a, w) => a + w.surplusGauge, 0);

  // ---- R3 closure, from measured instants only -----------------------------
  const paints = windows
    .map((w) => w.barPaint)
    .filter((x): x is number => x !== null);
  const realCycles: number[] = [];
  for (let i = 1; i < paints.length; i += 1) {
    realCycles.push(paints[i] - paints[i - 1]);
  }
  const simStarts = simRefills.map((w) => w.startSec);
  const simCycles: number[] = [];
  for (let i = 1; i < simStarts.length; i += 1) {
    simCycles.push(simStarts[i] - simStarts[i - 1]);
  }
  // the real ladder: gauge-full -> the NEXT Full Burst's true start, which the widget puts at
  // barPaint(k+1) - FB_SEC (Full Burst is exactly 10s, so its start is its end minus 10).
  const realLadders: number[] = [];
  windows.forEach((w, i) => {
    const next = windows[i + 1];
    if (w.fullInstant === null || !next || next.barPaint === null) {
      return;
    }
    realLadders.push(next.barPaint - FB_SEC - w.fullInstant);
  });
  const realRefillSec = median(readable.map((w) => w.visibleSec));
  const simRefillSec = median(readable.map((w) => w.simWholeSec));
  const realLadderSec = median(realLadders);
  const gapPerCycle = median(simCycles) - median(realCycles);
  const refillDelta = simRefillSec - realRefillSec;
  const ladderDelta = SIM_LADDER_SEC - realLadderSec;
  const closure = {
    realCycleSec: round(median(realCycles), 3),
    simCycleSec: round(median(simCycles), 3),
    gapPerCycle: round(gapPerCycle, 3),
    realRefillSec: round(realRefillSec, 3),
    simRefillSec: round(simRefillSec, 3),
    refillDelta: round(refillDelta, 3),
    realLadderSec: round(realLadderSec, 3),
    simLadderSec: round(SIM_LADDER_SEC, 4),
    ladderDelta: round(ladderDelta, 3),
    residual: round(gapPerCycle - refillDelta - ladderDelta, 3),
    closedShare: round((refillDelta + ladderDelta) / gapPerCycle, 3),
  };

  const q = (xs: number[]): Record<string, number> => ({
    n: xs.length,
    min: round(xs.length ? xs[0] : NaN, 2),
    p25: round(quantile(xs, 0.25), 2),
    p50: round(quantile(xs, 0.5), 2),
    p75: round(quantile(xs, 0.75), 2),
    p90: round(quantile(xs, 0.9), 2),
    max: round(xs.length ? xs[xs.length - 1] : NaN, 2),
    mean: round(xs.reduce((a, b) => a + b, 0) / (xs.length || 1), 2),
    sum: round(
      xs.reduce((a, b) => a + b, 0),
      1
    ),
  });

  return {
    comp: sched.comp,
    video: fx.source.video,
    slugs: sched.slugs,
    focusSlug: sched.focusSlug,
    amountsTrusted,
    scheduleWarnings,
    windows,
    readable,
    medianR: round(median(Rs), 3),
    rIqr: (() => {
      const r = iqr(Rs);
      return {
        p25: round(r.p25, 3),
        p75: round(r.p75, 3),
        iqr: round(r.iqr, 3),
      };
    })(),
    medianRWhole: round(median(readable.map((w) => w.rWhole)), 3),
    rWholeIqr: (() => {
      const r = iqr(readable.map((w) => w.rWhole));
      return {
        p25: round(r.p25, 3),
        p75: round(r.p75, 3),
        iqr: round(r.iqr, 3),
      };
    })(),
    medianRVisible: round(median(readable.map((w) => w.rVisible)), 3),
    rVisibleIqr: (() => {
      const r = iqr(readable.map((w) => w.rVisible));
      return {
        p25: round(r.p25, 3),
        p75: round(r.p75, 3),
        iqr: round(r.iqr, 3),
      };
    })(),
    medianROpening: round(median(readable.map((w) => w.rOpening)), 3),
    rVsVisibleFraction: round(
      pearson(
        readable.map((w) => w.visibleFraction),
        Rs
      ),
      3
    ),
    realEventRate: round(realEv.length / realSpanSec, 3),
    simEventRate: round(simEv.length / simSpanSec, 3),
    realEventQuantiles: q(realEv),
    simEventQuantiles: q(simEv),
    bridged: {
      count: bridged.length,
      medianDelta: round(median(bridged.map((b) => b.delta)), 2),
      medianSpanSec: round(median(bridged.map((b) => b.spanSec)), 3),
      gauge: round(
        bridged.reduce((a, b) => a + b.delta, 0),
        1
      ),
    },
    surplusShare: round(surplusGauge / totalRealGauge, 4),
    surplusEventShare: round(
      readable.reduce((a, w) => a + w.surplus.length, 0) /
        Math.max(
          1,
          readable.reduce((a, w) => a + w.directEventCount, 0)
        ),
      4
    ),
    chanceOffScheduleShare: round(
      1 -
        readable.reduce(
          (a, w) => a + w.alignmentCoverage * w.directEventCount,
          0
        ) /
          Math.max(
            1,
            readable.reduce((a, w) => a + w.directEventCount, 0)
          ),
      4
    ),
    boundary: {
      fullMinusStage1: windows
        .map((w) => w.fullMinusStage1)
        .filter((x): x is number => x !== null),
      fbEndToBarPaint: windows
        .map((w) => w.fbEndToBarPaint)
        .filter((x): x is number => x !== null),
      burstRenderEndToBarPaint: windows
        .map((w) => w.burstRenderEndToBarPaint)
        .filter((x): x is number => x !== null),
      fbStartToBarPaint: windows
        .map((w) => w.fbStartToBarPaint)
        .filter((x): x is number => x !== null),
    },
    closure,
  };
}

// ---------------------------------------------------------------------------
// OPENING-WINDOW OBSERVABLE (step 1a of docs/handoffs/2026-08-14-burst-gen-next-session.md)
//
// QUESTION it makes measurable: does ANY gauge bank during the ~1.45-1.52s the drained Full-Burst
// bar holds the widget slot after FB-end, before the charging bar paints? Two rival accounts:
//   * BANK-FROM-FB-END  — generation starts at FB-end; whatever accumulated during the hold is
//     already in the bar when it first paints. Prediction: fill at paint ~= holdSec x in-window
//     rate (given per prediction below at sim credit sizes AND at the real visible-span rate).
//   * BANK-FROM-BAR-PAINT — nothing banks until the charging bar exists. Prediction: fill at
//     paint ~= 0, and the early visible trace extrapolates back to ~0 at the paint instant.
//
// OBSERVABLES, all per window (none of them is the pre-committed R statistic, and none stamps a
// verdict — this emits measurements for a later /scientific-method pass):
//   * paintFill        — fillRaw at the charging bar's first paint (low-fill band: owner-ruled
//                        unreliable in absolute terms, so it is reported, not relied on alone).
//   * maxLowBeforeClean— the largest low-band read between paint and the first clean read.
//   * tToExceedLow     — seconds from paint until the trace first clears the low-fill band (8%).
//   * interceptAtPaint — the early clean trace (first OPENING_EARLY_FIT_SEC of the clean span)
//                        extrapolated back to the paint instant. This is the primary banked-gauge
//                        estimate: it never uses a low-band read. interceptWholeRate is the same
//                        arithmetic with the whole-span rate, as a sensitivity check.
//   * predBankFbEndSim — sim credits over the SAME fraction of the sim window as [fbEnd, barPaint]
//                        (fraction mapping, as everywhere in this tool); NaN when the schedule's
//                        amounts are untrusted or the window is unpaired.
//   * predBankFbEndReal— realRate x holdSec: what the hold would bank at the visible-span rate.
//   * diag (optional)  — from a `gauge-fill.py --team --diag` run: raw pre-classification pixel
//                        reads inside the hold span, split into glow (red/magenta blink phases,
//                        fill arithmetic is garbage there), fade (within OPENING_FADE_FRAMES of a
//                        glow frame — decaying glow still lights columns), and quiet frames. The
//                        quiet-frame fill level is the direct "is anything painted under the
//                        drain render?" observable.
// ---------------------------------------------------------------------------
/** Early-fit span for the back-extrapolation (local slope; the real trace back-loads). */
export const OPENING_EARLY_FIT_SEC = 0.75;
/** Mirror of the reader's TEAM_LOW_FILL_PCT — the owner-ruled-unreliable low-fill band. */
export const OPENING_LOW_FILL_PCT = 8;
/** A hold frame with red or magenta fraction at/above this is a glow (blink-on) frame. */
export const OPENING_GLOW_FRAC = 0.05;
/** Frames this close after a glow frame still carry decaying glow — binned as fade, not quiet. */
export const OPENING_FADE_FRAMES = 2;

export interface DiagRead {
  t: number;
  fill: number;
  mag: number;
  red: number;
  green: number;
}

export interface OpeningWindow {
  id: number;
  status: string;
  fbEnd: number;
  barPaint: number | null;
  /** [fbEnd, barPaint] — the reader-blind hold while the drained FB bar owns the widget slot */
  holdSec: number;
  paintFill: number | null;
  maxLowBeforeClean: number;
  tToExceedLow: number;
  firstClean: number;
  tFirstClean: number;
  paintToFirstCleanSec: number;
  earlyRate: number;
  interceptAtPaint: number;
  interceptWholeRate: number;
  predBankFbEndSim: number;
  predBankFbEndReal: number;
  diag: {
    holdFrames: number;
    glowFrames: number;
    fadeFrames: number;
    quietFrames: number;
    quietFillMedian: number;
    quietFillMax: number;
    /**
     * Despiked max: for each quiet frame, min(own fill, max of the two adjacent frames' fill) —
     * an isolated one-frame flash (the widget swap paints a single bright frame) cannot carry it.
     * A genuinely painted fill level persists across frames and passes through unchanged.
     */
    quietFillSustainedMax: number;
    fadeFillMax: number;
    /** the last quiet frame before the paint instant */
    lastQuietFill: number;
  } | null;
}

export interface OpeningResult {
  comp: string;
  video: string;
  amountsTrusted: boolean;
  windows: OpeningWindow[];
  /** aggregates over windows with a usable intercept (>= 2 early clean reads) */
  medianPaintFill: number;
  medianInterceptAtPaint: number;
  interceptIqr: { p25: number; p75: number; iqr: number };
  medianPredBankFbEndSim: number;
  medianPredBankFbEndReal: number;
  medianHoldSec: number;
  quietFillMaxAcrossWindows: number;
  quietFillSustainedMaxAcrossWindows: number;
}

/** Minimal slice of a replay bundle that the opening observable needs. */
export interface BundleLike {
  simSchedule: SimSchedule;
  trace: FillTrace;
  result: CompResult;
}

export function openingAnalysis(
  bundle: BundleLike,
  diagHold: { window: number; reads: DiagRead[] }[] | null
): OpeningResult {
  const { simSchedule: sched, trace, result } = bundle;
  const simRefills = sched.windows
    .filter((w) => w.kind === 'refill')
    .sort((a, b) => a.index - b.index);
  const out: OpeningWindow[] = [];

  for (const w of result.windows) {
    if (w.barPaint === null) {
      continue; // no charging-bar paint was ever observed: no opening to characterize
    }
    const barPaint = w.barPaint;
    const holdSec = round(barPaint - w.fbEnd, 4);
    const inWin = trace.reads.filter((r) => r.t >= w.fbEnd && r.t <= w.stage1);
    const paintRead = inWin.find((r) => r.t === barPaint);
    const paintFill = paintRead?.fillRaw ?? null;

    const clean = inWin.filter(
      (r) =>
        isClean(r) &&
        w.fullInstant !== null &&
        r.t >= barPaint &&
        r.t <= w.fullInstant
    );
    const lowSpan = inWin.filter(
      (r) =>
        r.state === 'filling' &&
        r.fillRaw !== null &&
        r.t >= barPaint &&
        (clean.length === 0 || r.t < clean[0].t)
    );
    const maxLowBeforeClean = lowSpan.length
      ? Math.max(...lowSpan.map((r) => r.fillRaw!))
      : NaN;
    const exceed = inWin.find(
      (r) =>
        r.state === 'filling' &&
        r.fillRaw !== null &&
        r.t >= barPaint &&
        r.fillRaw >= OPENING_LOW_FILL_PCT
    );
    const tToExceedLow = exceed ? round(exceed.t - barPaint, 4) : NaN;

    let earlyRate = NaN;
    let interceptAtPaint = NaN;
    let interceptWholeRate = NaN;
    let firstClean = NaN;
    let tFirstClean = NaN;
    if (clean.length >= 2) {
      const c0 = clean[0];
      firstClean = c0.fillRaw!;
      tFirstClean = c0.t;
      const early = clean.filter((r) => r.t - c0.t <= OPENING_EARLY_FIT_SEC);
      const cN = early.length >= 2 ? early[early.length - 1] : clean[1];
      earlyRate = round((cN.fillRaw! - c0.fillRaw!) / (cN.t - c0.t), 3);
      interceptAtPaint = round(
        c0.fillRaw! - earlyRate * (c0.t - w.barPaint),
        2
      );
      if (Number.isFinite(w.realRate)) {
        interceptWholeRate = round(
          c0.fillRaw! - w.realRate * (c0.t - w.barPaint),
          2
        );
      }
    }

    // predictions under bank-from-FB-end
    const simWin = simRefills[w.id - 1];
    let predBankFbEndSim = NaN;
    if (
      result.amountsTrusted &&
      simWin &&
      !simWin.truncated &&
      Number.isFinite(w.wholeWindowSec)
    ) {
      const fPaint = holdSec / w.wholeWindowSec;
      const simWhole = simWin.endSec - simWin.startSec;
      const m = simTeamSumByFrame(
        sched.credits,
        simWin.startSec - 1e-9,
        simWin.startSec + fPaint * simWhole
      );
      predBankFbEndSim = round(
        [...m.values()].reduce((a, b) => a + b, 0),
        2
      );
    }
    const predBankFbEndReal = Number.isFinite(w.realRate)
      ? round(w.realRate * holdSec, 2)
      : NaN;

    // diag: raw pixel reads inside the hold span
    let diag: OpeningWindow['diag'] = null;
    const dh = diagHold?.find((d) => d.window === w.id);
    if (dh) {
      const reads = dh.reads;
      const glow = reads.map(
        (r) => r.red >= OPENING_GLOW_FRAC || r.mag >= OPENING_GLOW_FRAC
      );
      const fade = reads.map((_, i) => {
        if (glow[i]) {
          return false;
        }
        for (let k = 1; k <= OPENING_FADE_FRAMES; k += 1) {
          if (glow[i - k] || glow[i + k]) {
            return true;
          }
        }
        return false;
      });
      const quiet = reads.filter((_, i) => !glow[i] && !fade[i]);
      const fadeReads = reads.filter((_, i) => fade[i]);
      const quietFills = quiet.map((r) => r.fill);
      const sustained = reads
        .map((r, i) => {
          if (glow[i] || fade[i]) {
            return null;
          }
          const nb = Math.max(reads[i - 1]?.fill ?? 0, reads[i + 1]?.fill ?? 0);
          return Math.min(r.fill, nb);
        })
        .filter((x): x is number => x !== null);
      diag = {
        holdFrames: reads.length,
        glowFrames: glow.filter(Boolean).length,
        fadeFrames: fadeReads.length,
        quietFrames: quiet.length,
        quietFillMedian: quietFills.length ? round(median(quietFills), 2) : NaN,
        quietFillMax: quietFills.length ? Math.max(...quietFills) : NaN,
        quietFillSustainedMax: sustained.length ? Math.max(...sustained) : NaN,
        fadeFillMax: fadeReads.length
          ? Math.max(...fadeReads.map((r) => r.fill))
          : NaN,
        lastQuietFill: quiet.length ? quiet[quiet.length - 1].fill : NaN,
      };
    }

    out.push({
      id: w.id,
      status: w.status,
      fbEnd: w.fbEnd,
      barPaint: w.barPaint,
      holdSec,
      paintFill,
      maxLowBeforeClean,
      tToExceedLow,
      firstClean,
      tFirstClean,
      paintToFirstCleanSec: Number.isFinite(tFirstClean)
        ? round(tFirstClean - w.barPaint, 4)
        : NaN,
      earlyRate,
      interceptAtPaint,
      interceptWholeRate,
      predBankFbEndSim,
      predBankFbEndReal,
      diag,
    });
  }

  // Aggregates exclude `dropped` windows: the pre-committed R1 coverage rule already declares
  // their visible span unusable (reported, not used), and a sparse clean span makes the
  // back-extrapolation meaningless (a 2.3s gap to the first clean read on one such window).
  const usable = out.filter((w) => w.status !== 'dropped');
  const withIntercept = usable.filter((w) =>
    Number.isFinite(w.interceptAtPaint)
  );
  const intercepts = withIntercept.map((w) => w.interceptAtPaint);
  const r = iqr(intercepts);
  const quietMaxes = out
    .map((w) => w.diag?.quietFillMax)
    .filter((x): x is number => x !== undefined && Number.isFinite(x));
  return {
    comp: result.comp,
    video: result.video,
    amountsTrusted: result.amountsTrusted,
    windows: out,
    medianPaintFill: round(
      median(
        usable.map((w) => w.paintFill).filter((x): x is number => x !== null)
      ),
      2
    ),
    medianInterceptAtPaint: round(median(intercepts), 2),
    interceptIqr: {
      p25: round(r.p25, 2),
      p75: round(r.p75, 2),
      iqr: round(r.iqr, 2),
    },
    medianPredBankFbEndSim: round(
      median(
        withIntercept
          .map((w) => w.predBankFbEndSim)
          .filter((x) => Number.isFinite(x))
      ),
      2
    ),
    medianPredBankFbEndReal: round(
      median(
        withIntercept
          .map((w) => w.predBankFbEndReal)
          .filter((x) => Number.isFinite(x))
      ),
      2
    ),
    medianHoldSec: round(median(out.map((w) => w.holdSec)), 3),
    quietFillMaxAcrossWindows: quietMaxes.length
      ? Math.max(...quietMaxes)
      : NaN,
    quietFillSustainedMaxAcrossWindows: (() => {
      const xs = out
        .map((w) => w.diag?.quietFillSustainedMax)
        .filter((x): x is number => x !== undefined && Number.isFinite(x));
      return xs.length ? Math.max(...xs) : NaN;
    })(),
  };
}

/** Extract hold-span diag reads (fbEnd -> barPaint) from a `--diag` reader trace. */
export function extractDiagHold(
  diagTrace: {
    reads: (FillRead & { diag?: Omit<DiagRead, 't'> })[];
  },
  result: CompResult
): { window: number; reads: DiagRead[] }[] {
  const out: { window: number; reads: DiagRead[] }[] = [];
  for (const w of result.windows) {
    if (w.barPaint === null) {
      continue;
    }
    const reads = diagTrace.reads
      .filter((r) => r.diag && r.t >= w.fbEnd && r.t < w.barPaint!)
      .map((r) => ({ t: r.t, ...r.diag! }));
    out.push({ window: w.id, reads });
  }
  return out;
}

/** The section-C decision rule, applied mechanically. */
export function decisionRule(
  perComp: { comp: string; medianR: number; iqr: number; readable: number }[]
): {
  branch: 'CONFIRM' | 'NOT-IN-WINDOW' | 'MIXED' | 'CANNOT-MEASURE';
  detail: string;
} {
  const basisBroken = perComp.filter(
    (c) => c.readable < MIN_READABLE_WINDOWS || c.iqr > MAX_R_IQR
  );
  if (basisBroken.length > 0) {
    return {
      branch: 'CANNOT-MEASURE',
      detail: basisBroken
        .map((c) =>
          c.readable < MIN_READABLE_WINDOWS
            ? `${c.comp}: only ${c.readable} readable windows (< ${MIN_READABLE_WINDOWS})`
            : `${c.comp}: per-window R dispersion IQR ${c.iqr.toFixed(3)} > ${MAX_R_IQR}`
        )
        .join('; '),
    };
  }
  if (perComp.every((c) => c.medianR >= R_CONFIRM)) {
    return {
      branch: 'CONFIRM',
      detail: `median R >= ${R_CONFIRM} on both comps`,
    };
  }
  if (perComp.every((c) => c.medianR < R_REJECT)) {
    return {
      branch: 'NOT-IN-WINDOW',
      detail: `median R < ${R_REJECT} on both comps`,
    };
  }
  return {
    branch: 'MIXED',
    detail: 'median R sits between the thresholds, or the comps disagree',
  };
}

// ---------------------------------------------------------------------------
// H-A / H-B / H-C CLASSIFICATION (step 2 of docs/handoffs/2026-08-14-burst-gen-next-session.md,
// pre-op packet docs/handoffs/2026-08-15-classification-preop-packet.md §C/§D — every constant
// below is pinned there; C3/C4 may WIDEN bands / RAISE eMin, never the reverse).
//
// The real window is [barPaint, fullInstant) (packet premise Pc). All real reads must come from a
// `--reflag`-upgraded trace (premise Pa) and the sim schedule must be REGENERATED from the current
// engine (premise Pb) — this code cannot enforce either, so the artifact records both commands.
// ---------------------------------------------------------------------------
/** Event/credit bin width (packet §C: "event-bins at 1/30s"). */
export const CLS_BIN_SEC = 1 / 30;
/** §C R1: E_min = 1.5 fill-% (TEAM_NOISE_PCT, gauge-fill.py). C4 may raise it, never lower. */
export const CLS_E_MIN = 1.5;
/** B4 two-sided saturation cut (R5): real fill > 90 / sim window-cumulative gauge > 90. */
export const CLS_SAT_PCT = 90;
/** B1: usable windows per comp arm. */
export const CLS_MIN_USABLE_WINDOWS = 4;
/** B1: per-window clean-bin coverage of [barPaint, fullInstant). */
export const CLS_MIN_CLEAN_BIN_COVERAGE = 0.6;
/** B3: per-window rho dispersion, IQR/median. */
export const CLS_MAX_RHO_DISPERSION = 0.6;
/** §C closure: |O_eff x S - rho| / rho above this does not close -> INCONCLUSIVE. */
export const CLS_MAX_CLOSURE_RESIDUAL = 0.25;
/** §D branch 1: real event-rate > this x C_ceiling -> H-C mass present. */
export const CLS_CEILING_FACTOR = 1.15;
/** §C: a real increment is DIRECT when its clean endpoints are <= this many trace-frames apart. */
export const CLS_MAX_EVENT_GAP_FRAMES = 2;
/** C3: widen bands only when a sim-component shift exceeds this. */
export const CLS_C3_SHIFT_LIMIT = 0.1;

/** §D class bands (half-open where the packet says so). */
export interface ClsBands {
  /** branch 2 NO-IN-WINDOW-EXCESS: O and S both in [lo, hi) */
  noExcess: [number, number];
  /** branch 3 H-A: O in [lo, hi) */
  haO: [number, number];
  /** branch 3 H-A: S >= this */
  haSMin: number;
  /** branch 4 H-B: O >= this */
  hbOMin: number;
  /** branch 4 H-B: S in [lo, hi) */
  hbS: [number, number];
}
export const CLS_BASE_BANDS: ClsBands = {
  noExcess: [0.85, 1.15],
  haO: [0.75, 1.25],
  haSMin: 1.35,
  hbOMin: 1.4,
  hbS: [0.7, 1.3],
};

/**
 * C3's pre-stated widening rule (fixed BEFORE the real side is unblinded): if a sim component
 * (credit-bin fraction for O, median per-credit-bin amount for S) shifts more than
 * CLS_C3_SHIFT_LIMIT under the alignment perturbations, every affected boundary moves in the
 * direction that makes its branch HARDER to fire — two-sided bands shrink to
 * [lo*(1+s), hi*(1-s)), one-sided minimums rise to min*(1+s). A band that inverts under this can
 * no longer fire and is reported as such. Widening is monotone: it can only ever suppress a
 * classification, never manufacture one.
 */
export function widenBands(
  base: ClsBands,
  oShift: number,
  sShift: number
): ClsBands {
  const so = oShift > CLS_C3_SHIFT_LIMIT ? oShift : 0;
  const ss = sShift > CLS_C3_SHIFT_LIMIT ? sShift : 0;
  const shrink = (b: [number, number], s: number): [number, number] => [
    round(b[0] * (1 + s), 4),
    round(b[1] * (1 - s), 4),
  ];
  return {
    noExcess: shrink(base.noExcess, Math.max(so, ss)),
    haO: shrink(base.haO, so),
    haSMin: round(base.haSMin * (1 + ss), 4),
    hbOMin: round(base.hbOMin * (1 + so), 4),
    hbS: shrink(base.hbS, ss),
  };
}

// ---- sim side --------------------------------------------------------------
export interface SimComponents {
  comp: string;
  binSec: number;
  jitterFrames: number;
  phaseSec: number;
  /** non-truncated refill windows only (the classification pool; first-fill is not a cycle) */
  windowsUsed: number[];
  totalBins: number;
  saturatedBins: number;
  usableBins: number;
  creditBins: number;
  /** creditBins / usableBins — the sim component of O */
  creditBinFraction: number;
  /** per-credit-bin summed amounts (non-saturated bins), quantiles — median is the S component */
  binAmountQuantiles: Record<string, number>;
  /** all credits in the pooled windows (saturation does NOT cut rate mass, only event stats) */
  totalGauge: number;
  totalDurationSec: number;
  ratePerSec: number;
}

/**
 * Bin the sim schedule's credits at `binSec` over its own non-truncated refill windows.
 * `jitterFrames` shifts every credit by that many 60fps frames; `phaseSec` shifts the bin grid
 * (the other legal 60->30 rebinning phase is phaseSec = 1/60). Both exist for control C3.
 */
export function simComponents(
  sched: SimSchedule,
  opts: { binSec?: number; jitterFrames?: number; phaseSec?: number } = {}
): SimComponents {
  const binSec = opts.binSec ?? CLS_BIN_SEC;
  const jitter = opts.jitterFrames ?? 0;
  const phase = opts.phaseSec ?? 0;
  const refills = sched.windows.filter(
    (w) => w.kind === 'refill' && !w.truncated
  );
  let totalBins = 0;
  let satBins = 0;
  let creditBins = 0;
  let totalGauge = 0;
  let totalDur = 0;
  const amounts: number[] = [];
  for (const w of refills) {
    const dur = w.endSec - w.startSec;
    totalDur += dur;
    const nBins = Math.ceil(dur / binSec - 1e-9);
    totalBins += nBins;
    const inWin = sched.credits
      .filter((c) => c.window === w.index)
      .map((c) => ({ ...c, sec: c.sec + jitter / 60 }))
      .sort((a, b) => a.sec - b.sec);
    // bin index clamped into the window so jitter cannot push mass off the pool
    const binOf = (sec: number): number =>
      Math.min(
        nBins - 1,
        Math.max(0, Math.floor((sec - w.startSec - phase) / binSec))
      );
    const byBin = new Map<number, number>();
    let cum = 0;
    const satFrom = new Map<number, boolean>();
    for (const c of inWin) {
      const b = binOf(c.sec);
      byBin.set(b, (byBin.get(b) ?? 0) + c.amount);
      cum += c.amount;
      if (cum > CLS_SAT_PCT) {
        satFrom.set(b, true);
      }
      totalGauge += c.amount;
    }
    for (const [b, amt] of byBin) {
      if (satFrom.get(b)) {
        satBins += 1;
      } else {
        creditBins += 1;
        amounts.push(amt);
      }
    }
  }
  amounts.sort((a, b) => a - b);
  const usableBins = totalBins - satBins;
  return {
    comp: sched.comp,
    binSec: round(binSec, 6),
    jitterFrames: jitter,
    phaseSec: round(phase, 6),
    windowsUsed: refills.map((w) => w.index),
    totalBins,
    saturatedBins: satBins,
    usableBins,
    creditBins,
    creditBinFraction: round(creditBins / Math.max(1, usableBins), 4),
    binAmountQuantiles: {
      n: amounts.length,
      min: round(amounts[0] ?? NaN, 3),
      p25: round(quantile(amounts, 0.25), 3),
      p50: round(quantile(amounts, 0.5), 3),
      p75: round(quantile(amounts, 0.75), 3),
      max: round(amounts[amounts.length - 1] ?? NaN, 3),
      mean: round(
        amounts.reduce((a, b) => a + b, 0) / Math.max(1, amounts.length),
        3
      ),
    },
    totalGauge: round(totalGauge, 3),
    totalDurationSec: round(totalDur, 4),
    ratePerSec: round(totalGauge / totalDur, 4),
  };
}

export interface CeilingUnit {
  slug: string;
  creditInstants: number;
  minGapFrames: number | null;
  maxRatePerSec: number;
}
export interface Ceiling {
  perUnit: CeilingUnit[];
  sumRatePerSec: number;
  /** min(sum, 1/binSec): event-bins/s cannot exceed the bin rate */
  ceilingBinsPerSec: number;
  binRateCap: number;
}

/**
 * C_ceiling (§C): the maximum event-bins/s the MODELED comp can produce. Per unit, the fastest
 * sustained credit cadence the engine actually produced anywhere in the schedule (minimum gap
 * between that unit's distinct credit frames — same-frame shot+skill riders collapse into one
 * instant, as they collapse into one bin) is taken as its 100%-uptime rate; the team ceiling is
 * the sum, capped at the bin rate (1/binSec), since simultaneous credits can only SHARE bins.
 * Generous by construction: reload/charge downtime is ignored, so exceeding 1.15x this needs
 * credit instants the model cannot place at any cadence it owns.
 */
export function simCeiling(
  sched: SimSchedule,
  binSec: number = CLS_BIN_SEC
): Ceiling {
  const bySlug = new Map<string, Set<number>>();
  for (const c of sched.credits) {
    if (!bySlug.has(c.slug)) {
      bySlug.set(c.slug, new Set());
    }
    bySlug.get(c.slug)!.add(c.frame);
  }
  const perUnit: CeilingUnit[] = [];
  let sum = 0;
  for (const [slug, framesSet] of [...bySlug.entries()].sort((a, b) =>
    a[0].localeCompare(b[0])
  )) {
    const frames = [...framesSet].sort((a, b) => a - b);
    let minGap: number | null = null;
    for (let i = 1; i < frames.length; i += 1) {
      const g = frames[i] - frames[i - 1];
      if (minGap === null || g < minGap) {
        minGap = g;
      }
    }
    const rate = minGap === null ? 0 : 60 / minGap;
    perUnit.push({
      slug,
      creditInstants: frames.length,
      minGapFrames: minGap,
      maxRatePerSec: round(rate, 4),
    });
    sum += rate;
  }
  const cap = 1 / binSec;
  return {
    perUnit,
    sumRatePerSec: round(sum, 4),
    ceilingBinsPerSec: round(Math.min(sum, cap), 4),
    binRateCap: round(cap, 4),
  };
}

// ---- C4: the noise floor on known-quiet spans ------------------------------
export interface QuietNoiseResult {
  perSource: {
    name: string;
    quietReads: number;
    pairs: number;
    quietBins: number;
    falseEventBins: number;
    falseEventBinRate: number;
    p95PositiveDelta: number;
    maxDelta: number;
  }[];
  pooled: {
    quietReads: number;
    pairs: number;
    quietBins: number;
    falseEventBins: number;
    falseEventBinRate: number;
    p95PositiveDelta: number;
  };
  eMinIn: number;
  /** raised to the pooled p95 of positive quiet-span deltas when the rate is >= 5% — never lowered */
  eMinOut: number;
  raised: boolean;
}

/**
 * C4: measure the false-event rate at eMin on the drain-hold QUIET reads (step-1a diag fixtures:
 * glow/fade frames already excluded by openingAnalysis' own taxonomy — the same classification is
 * re-derived here from the raw diagHold reads so the check replays from the committed artifacts).
 * A false event is a 1/30s bin containing a positive delta > eMin between consecutive quiet reads
 * <= CLS_MAX_EVENT_GAP_FRAMES apart — the exact event definition, run where the bar holds level.
 */
export function quietNoiseCheck(
  sources: {
    name: string;
    diagHold: { window: number; reads: DiagRead[] }[];
  }[],
  eMin: number = CLS_E_MIN
): QuietNoiseResult {
  const perSource: QuietNoiseResult['perSource'] = [];
  let allReads = 0;
  let allPairs = 0;
  let allBins = 0;
  let allFalse = 0;
  const allPosDeltas: number[] = [];
  for (const src of sources) {
    let quietReads = 0;
    let pairs = 0;
    const binSet = new Set<string>();
    const falseBins = new Set<string>();
    const posDeltas: number[] = [];
    let maxDelta = -Infinity;
    for (const hold of src.diagHold) {
      const reads = hold.reads;
      const glow = reads.map(
        (r) => r.red >= OPENING_GLOW_FRAC || r.mag >= OPENING_GLOW_FRAC
      );
      const fade = reads.map((_, i) => {
        if (glow[i]) {
          return false;
        }
        for (let k = 1; k <= OPENING_FADE_FRAMES; k += 1) {
          if (glow[i - k] || glow[i + k]) {
            return true;
          }
        }
        return false;
      });
      const quiet = reads.filter((_, i) => !glow[i] && !fade[i]);
      quietReads += quiet.length;
      for (const r of quiet) {
        binSet.add(`${hold.window}:${Math.floor(r.t / CLS_BIN_SEC)}`);
      }
      for (let k = 1; k < quiet.length; k += 1) {
        const a = quiet[k - 1];
        const b = quiet[k];
        if (Math.round((b.t - a.t) * 60) > CLS_MAX_EVENT_GAP_FRAMES) {
          continue;
        }
        pairs += 1;
        const delta = b.fill - a.fill;
        if (delta > 0) {
          posDeltas.push(delta);
        }
        maxDelta = Math.max(maxDelta, delta);
        if (delta > eMin) {
          falseBins.add(`${hold.window}:${Math.floor(b.t / CLS_BIN_SEC)}`);
        }
      }
    }
    posDeltas.sort((a, b) => a - b);
    perSource.push({
      name: src.name,
      quietReads,
      pairs,
      quietBins: binSet.size,
      falseEventBins: falseBins.size,
      falseEventBinRate: round(falseBins.size / Math.max(1, binSet.size), 4),
      p95PositiveDelta: round(quantile(posDeltas, 0.95), 3),
      maxDelta: round(maxDelta, 3),
    });
    allReads += quietReads;
    allPairs += pairs;
    allBins += binSet.size;
    allFalse += falseBins.size;
    allPosDeltas.push(...posDeltas);
  }
  allPosDeltas.sort((a, b) => a - b);
  const pooledRate = allFalse / Math.max(1, allBins);
  const p95 = round(quantile(allPosDeltas, 0.95), 3);
  const raised = pooledRate >= 0.05;
  return {
    perSource,
    pooled: {
      quietReads: allReads,
      pairs: allPairs,
      quietBins: allBins,
      falseEventBins: allFalse,
      falseEventBinRate: round(pooledRate, 4),
      p95PositiveDelta: p95,
    },
    eMinIn: eMin,
    eMinOut: raised ? Math.max(eMin, p95) : eMin,
    raised,
  };
}

// ---- real side -------------------------------------------------------------
export interface ClsWindow {
  id: number;
  usable: boolean;
  reason?: string;
  barPaint: number | null;
  fullInstant: number | null;
  durationSec: number;
  totalBins: number;
  cleanBins: number;
  cleanBinCoverage: number;
  saturatedBins: number;
  usableCleanBins: number;
  eventBins: number;
  /** per-event-bin summed deltas (size statistic feed) */
  eventBinDeltas: number[];
  eventMass: number;
  bankedAtPaintMass: number;
  bankedAtPaintSec: number | null;
  bridgedCount: number;
  bridgedMass: number;
  /** direct increments <= eMin plus any negative noise deltas (telescope remainder) */
  residualMass: number;
  /** telescoped total = last clean read's fill = banked + events + bridged + residual */
  sumRealDelta: number;
  lastCleanT: number;
  lastCleanFill: number;
  // paired sim window
  simWindow: number | null;
  simDurationSec: number;
  simGauge: number;
  rho: number;
}

export interface ClsPooled {
  usableWindows: number;
  sumRealDelta: number;
  sumRealDurationSec: number;
  realRatePerSec: number;
  sumSimGauge: number;
  sumSimDurationSec: number;
  simRatePerSec: number;
  rho: number;
  rhoPerWindow: number[];
  rhoMedian: number;
  rhoIqr: { p25: number; p75: number; iqr: number };
  rhoDispersion: number;
  eventBins: number;
  usableCleanBins: number;
  realEventBinFraction: number;
  realEventBinsPerSec: number;
  medianEventBinDelta: number;
  eventBinDeltaQuantiles: Record<string, number>;
  bankedMassTotal: number;
  bridgedMassTotal: number;
  residualMassTotal: number;
  O: number;
  S: number;
  /** closure: O_eff = O_time x massCorrReal / massCorrSim (each factor reported) */
  oTime: number;
  massCorrReal: number;
  massCorrSim: number;
  oEff: number;
  closureResidual: number;
}

export interface ClsBasis {
  b1UsableWindows: number;
  b1Pass: boolean;
  b2ScheduleChecksPass: boolean;
  b2Warnings: string[];
  b3RhoDispersion: number;
  b3Pass: boolean;
  b4RealSaturatedBins: number;
  b4SimSaturatedBins: number;
  pass: boolean;
  detail: string;
}

export interface ClsBranch {
  branch:
    | 'H-C'
    | 'NO-IN-WINDOW-EXCESS'
    | 'H-A'
    | 'H-B'
    | 'MIXED/INCONCLUSIVE'
    | 'CANNOT-MEASURE';
  detail: string;
  realEventBinsPerSec: number;
  ceilingBinsPerSec: number;
  ceilingThreshold: number;
  hcShareOfRate: number | null;
  /** §D R4: when branch 1 fires, any same-arm H-A/H-B band hit is DEMOTED to descriptive */
  demotedCandidate: string | null;
  /**
   * When the event rate exceeds the ceiling but the closure clause voids the branches, the
   * over-ceiling reading is retained here as OBSERVED, NOT ESTABLISHED (2026-08-15 blind
   * post-op ruling: §C's "residual > 0.25 → INCONCLUSIVE regardless of branch hits" gates
   * branch 1 too).
   */
  observedCeilingExcess: string | null;
}

export interface ClsArm {
  comp: string;
  eMin: number;
  bands: ClsBands;
  windows: ClsWindow[];
  pooled: ClsPooled | null;
  basis: ClsBasis | null;
  branch: ClsBranch | null;
  sim: SimComponents | null;
  ceiling: Ceiling | null;
}

/**
 * The §C statistic over one comp arm. `sched === null` produces real-side descriptives ONLY
 * (the misc B3s fence: its sim arm is voided by construction — packet §B).
 */
export function classifyArm(
  fx: TempoFixture,
  trace: FillTrace,
  sched: SimSchedule | null,
  opts: {
    eMin?: number;
    bands?: ClsBands;
    simComp?: SimComponents;
    ceiling?: Ceiling;
  } = {}
): ClsArm {
  const eMin = opts.eMin ?? CLS_E_MIN;
  const bands = opts.bands ?? CLS_BASE_BANDS;
  const simRefills = sched
    ? sched.windows
        .filter((w) => w.kind === 'refill')
        .sort((a, b) => a.index - b.index)
    : [];
  const rows: ClsWindow[] = [];
  for (const rw of refillWindows(fx)) {
    const inWin = trace.reads.filter(
      (r) => r.t >= rw.fbEnd && r.t <= rw.stage1
    );
    const full = inWin.find((r) => r.state === 'full');
    const firstFilling = inWin.find((r) => r.state === 'filling');
    const row: ClsWindow = {
      id: rw.id,
      usable: false,
      barPaint: firstFilling ? firstFilling.t : null,
      fullInstant: full ? full.t : null,
      durationSec: NaN,
      totalBins: 0,
      cleanBins: 0,
      cleanBinCoverage: NaN,
      saturatedBins: 0,
      usableCleanBins: 0,
      eventBins: 0,
      eventBinDeltas: [],
      eventMass: 0,
      bankedAtPaintMass: NaN,
      bankedAtPaintSec: null,
      bridgedCount: 0,
      bridgedMass: 0,
      residualMass: 0,
      sumRealDelta: NaN,
      lastCleanT: NaN,
      lastCleanFill: NaN,
      simWindow: null,
      simDurationSec: NaN,
      simGauge: NaN,
      rho: NaN,
    };
    if (!full || !firstFilling) {
      row.reason = !full
        ? 'no green-full instant inside the window'
        : 'no charging-bar paint';
      rows.push(row);
      continue;
    }
    const barPaint = firstFilling.t;
    const dur = full.t - barPaint;
    row.durationSec = round(dur, 4);
    const nBins = Math.ceil(dur / CLS_BIN_SEC - 1e-9);
    row.totalBins = nBins;
    const binOf = (t: number): number =>
      Math.min(
        nBins - 1,
        Math.max(0, Math.floor((t - barPaint) / CLS_BIN_SEC))
      );
    // window reads: [barPaint, fullInstant)
    const winReads = inWin.filter((r) => r.t >= barPaint && r.t < full.t);
    const clean = winReads.filter(isClean);
    if (clean.length < 2) {
      row.reason = 'fewer than 2 clean reads in [barPaint, fullInstant)';
      rows.push(row);
      continue;
    }
    const cleanBinSet = new Set<number>();
    const satBinSet = new Set<number>();
    for (const r of clean) {
      const b = binOf(r.t);
      cleanBinSet.add(b);
      if (r.fillRaw! > CLS_SAT_PCT) {
        satBinSet.add(b);
      }
    }
    row.cleanBins = cleanBinSet.size;
    row.cleanBinCoverage = round(cleanBinSet.size / nBins, 4);
    row.saturatedBins = satBinSet.size;
    row.usableCleanBins = cleanBinSet.size - satBinSet.size;
    // banked-at-paint (pre-op R3): the first clean read is a delta-from-0 at window open
    row.bankedAtPaintMass = round(clean[0].fillRaw!, 2);
    row.bankedAtPaintSec = round(clean[0].t - barPaint, 4);
    // increments
    const eventByBin = new Map<number, number>();
    for (let k = 1; k < clean.length; k += 1) {
      const a = clean[k - 1];
      const b = clean[k];
      const delta = b.fillRaw! - a.fillRaw!;
      const gapFrames = Math.round((b.t - a.t) * trace.fps);
      if (gapFrames > CLS_MAX_EVENT_GAP_FRAMES) {
        row.bridgedCount += 1;
        row.bridgedMass = round(row.bridgedMass + delta, 2);
        continue;
      }
      const bin = binOf(b.t);
      if (delta > eMin && !satBinSet.has(bin)) {
        eventByBin.set(bin, (eventByBin.get(bin) ?? 0) + delta);
      } else {
        row.residualMass = round(row.residualMass + delta, 2);
      }
    }
    row.eventBins = eventByBin.size;
    row.eventBinDeltas = [...eventByBin.values()].map((d) => round(d, 2));
    row.eventMass = round(
      row.eventBinDeltas.reduce((a, b) => a + b, 0),
      2
    );
    const last = clean[clean.length - 1];
    row.lastCleanT = last.t;
    row.lastCleanFill = last.fillRaw!;
    // telescope: banked + all increments = last clean fill (noise cancels internally)
    row.sumRealDelta = round(last.fillRaw!, 2);
    // pair the sim window by ordinal
    const simWin = sched ? simRefills[rw.id - 1] : undefined;
    if (sched) {
      if (!simWin || simWin.truncated) {
        row.reason = simWin
          ? 'paired sim window truncated by the buzzer'
          : 'no sim refill window with this ordinal';
        rows.push(row);
        continue;
      }
      row.simWindow = simWin.index;
      row.simDurationSec = round(simWin.endSec - simWin.startSec, 4);
      row.simGauge = round(simWin.gauge, 3);
      row.rho = round(
        row.sumRealDelta /
          row.durationSec /
          (simWin.gauge / row.simDurationSec),
        4
      );
    }
    if (row.cleanBinCoverage < CLS_MIN_CLEAN_BIN_COVERAGE) {
      row.reason = `clean-bin coverage ${(row.cleanBinCoverage * 100).toFixed(0)}% < ${CLS_MIN_CLEAN_BIN_COVERAGE * 100}% (B1)`;
      rows.push(row);
      continue;
    }
    row.usable = true;
    rows.push(row);
  }

  const usable = rows.filter((w) => w.usable);
  let pooled: ClsPooled | null = null;
  let basis: ClsBasis | null = null;
  let branch: ClsBranch | null = null;
  if (sched && opts.simComp && opts.ceiling) {
    const sumRealDelta = usable.reduce((a, w) => a + w.sumRealDelta, 0);
    const sumRealDur = usable.reduce((a, w) => a + w.durationSec, 0);
    const sumSimGauge = usable.reduce((a, w) => a + w.simGauge, 0);
    const sumSimDur = usable.reduce((a, w) => a + w.simDurationSec, 0);
    const realRate = sumRealDelta / sumRealDur;
    const simRate = sumSimGauge / sumSimDur;
    const rho = realRate / simRate;
    const rhos = usable.map((w) => w.rho);
    const rIq = iqr(rhos);
    const rhoMed = median(rhos);
    const eventBins = usable.reduce((a, w) => a + w.eventBins, 0);
    const usableCleanBins = usable.reduce((a, w) => a + w.usableCleanBins, 0);
    const allDeltas = usable
      .flatMap((w) => w.eventBinDeltas)
      .sort((a, b) => a - b);
    const eventMass = usable.reduce((a, w) => a + w.eventMass, 0);
    const realEventBinFraction = eventBins / Math.max(1, usableCleanBins);
    const realEventBinsPerSec =
      eventBins / Math.max(1e-9, usableCleanBins * CLS_BIN_SEC);
    const O = realEventBinFraction / opts.simComp.creditBinFraction;
    const S = quantile(allDeltas, 0.5) / opts.simComp.binAmountQuantiles.p50;
    // closure (§C): O_eff x S vs rho, every factor visible.
    //   oTime      = (event-bins/s of measured real window time) / (credit-bins/s of sim window time)
    //   massCorrReal = total real mass / event-bin mass (banked + bridged + sub-eMin correction)
    //   massCorrSim  = total sim mass / credit-bin mass (saturated-bin credit correction)
    const oTime =
      eventBins /
      sumRealDur /
      (opts.simComp.creditBins / opts.simComp.totalDurationSec);
    const massCorrReal = sumRealDelta / Math.max(1e-9, eventMass);
    const simBinMass =
      opts.simComp.binAmountQuantiles.mean * opts.simComp.creditBins;
    const massCorrSim = opts.simComp.totalGauge / Math.max(1e-9, simBinMass);
    const oEff = (oTime * massCorrReal) / massCorrSim;
    const closureResidual = Math.abs(oEff * S - rho) / rho;
    pooled = {
      usableWindows: usable.length,
      sumRealDelta: round(sumRealDelta, 2),
      sumRealDurationSec: round(sumRealDur, 3),
      realRatePerSec: round(realRate, 4),
      sumSimGauge: round(sumSimGauge, 2),
      sumSimDurationSec: round(sumSimDur, 3),
      simRatePerSec: round(simRate, 4),
      rho: round(rho, 4),
      rhoPerWindow: rhos.map((r) => round(r, 4)),
      rhoMedian: round(rhoMed, 4),
      rhoIqr: {
        p25: round(rIq.p25, 4),
        p75: round(rIq.p75, 4),
        iqr: round(rIq.iqr, 4),
      },
      rhoDispersion: round(rIq.iqr / rhoMed, 4),
      eventBins,
      usableCleanBins,
      realEventBinFraction: round(realEventBinFraction, 4),
      realEventBinsPerSec: round(realEventBinsPerSec, 4),
      medianEventBinDelta: round(quantile(allDeltas, 0.5), 3),
      eventBinDeltaQuantiles: {
        n: allDeltas.length,
        min: round(allDeltas[0] ?? NaN, 2),
        p25: round(quantile(allDeltas, 0.25), 2),
        p50: round(quantile(allDeltas, 0.5), 2),
        p75: round(quantile(allDeltas, 0.75), 2),
        p90: round(quantile(allDeltas, 0.9), 2),
        max: round(allDeltas[allDeltas.length - 1] ?? NaN, 2),
        mean: round(
          allDeltas.reduce((a, b) => a + b, 0) / Math.max(1, allDeltas.length),
          2
        ),
      },
      bankedMassTotal: round(
        usable.reduce((a, w) => a + w.bankedAtPaintMass, 0),
        2
      ),
      bridgedMassTotal: round(
        usable.reduce((a, w) => a + w.bridgedMass, 0),
        2
      ),
      residualMassTotal: round(
        usable.reduce((a, w) => a + w.residualMass, 0),
        2
      ),
      O: round(O, 4),
      S: round(S, 4),
      oTime: round(oTime, 4),
      massCorrReal: round(massCorrReal, 4),
      massCorrSim: round(massCorrSim, 4),
      oEff: round(oEff, 4),
      closureResidual: round(closureResidual, 4),
    };
    // ---- basis clauses (any failure -> arm CANNOT-MEASURE) ----
    const b2Warnings: string[] = [];
    if (!sched.checks.endpointOk) {
      b2Warnings.push('endpoint check FAILED');
    }
    if (!sched.checks.dbgGauge.ok) {
      b2Warnings.push('DBG_GAUGE check FAILED');
    }
    if (!sched.checks.truncatedOk) {
      b2Warnings.push('truncated-run check FAILED');
    }
    for (const u of sched.unreconstructed) {
      b2Warnings.push(`unreconstructed: ${u}`);
    }
    const b1 = usable.length >= CLS_MIN_USABLE_WINDOWS;
    const b2 = b2Warnings.length === 0;
    const b3 = pooled.rhoDispersion <= CLS_MAX_RHO_DISPERSION;
    const failures: string[] = [];
    if (!b1) {
      failures.push(
        `B1: ${usable.length} usable windows < ${CLS_MIN_USABLE_WINDOWS}`
      );
    }
    if (!b2) {
      failures.push(`B2: ${b2Warnings.join('; ')}`);
    }
    if (!b3) {
      failures.push(
        `B3: rho dispersion IQR/median ${pooled.rhoDispersion} > ${CLS_MAX_RHO_DISPERSION}`
      );
    }
    basis = {
      b1UsableWindows: usable.length,
      b1Pass: b1,
      b2ScheduleChecksPass: b2,
      b2Warnings,
      b3RhoDispersion: pooled.rhoDispersion,
      b3Pass: b3,
      b4RealSaturatedBins: usable.reduce((a, w) => a + w.saturatedBins, 0),
      b4SimSaturatedBins: opts.simComp.saturatedBins,
      pass: b1 && b2 && b3,
      detail: failures.length ? failures.join(' | ') : 'B1-B4 all satisfied',
    };
    branch = applyDecisionRule(pooled, basis, opts.ceiling, bands);
  }
  return {
    comp: sched?.comp ?? fx.source.video,
    eMin,
    bands,
    windows: rows,
    pooled,
    basis,
    branch,
    sim: opts.simComp ?? null,
    ceiling: opts.ceiling ?? null,
  };
}

/** §D applied mechanically, priority order, intervals half-open. */
export function applyDecisionRule(
  pooled: ClsPooled,
  basis: ClsBasis,
  ceiling: Ceiling,
  bands: ClsBands
): ClsBranch {
  const thr = round(CLS_CEILING_FACTOR * ceiling.ceilingBinsPerSec, 4);
  const out: ClsBranch = {
    branch: 'MIXED/INCONCLUSIVE',
    detail: '',
    realEventBinsPerSec: pooled.realEventBinsPerSec,
    ceilingBinsPerSec: ceiling.ceilingBinsPerSec,
    ceilingThreshold: thr,
    hcShareOfRate: null,
    demotedCandidate: null,
    observedCeilingExcess: null,
  };
  if (!basis.pass) {
    out.branch = 'CANNOT-MEASURE';
    out.detail = basis.detail;
    return out;
  }
  const inb = (x: number, b: [number, number]): boolean =>
    x >= b[0] && x < b[1];
  const { O, S, closureResidual } = pooled;
  // the same-arm band reading branch 1 would demote (computed first so demotion can name it)
  let candidate: string | null = null;
  if (inb(O, bands.haO) && S >= bands.haSMin) {
    candidate = `H-A band hit (O ${O} in [${bands.haO}), S ${S} >= ${bands.haSMin})`;
  } else if (O >= bands.hbOMin && inb(S, bands.hbS)) {
    candidate = `H-B band hit (O ${O} >= ${bands.hbOMin}, S ${S} in [${bands.hbS}))`;
  }
  const ceilingExceeded = pooled.realEventBinsPerSec > thr;
  if (ceilingExceeded) {
    // the observed quantity is recorded whether or not the branch is allowed to fire
    out.hcShareOfRate = round(
      (pooled.realEventBinsPerSec - ceiling.ceilingBinsPerSec) /
        pooled.realEventBinsPerSec,
      4
    );
  }
  // §C closure clause FIRST: "residual > 0.25 -> the decomposition does not close ->
  // INCONCLUSIVE regardless of branch hits". Per the 2026-08-15 blind post-op ruling this gates
  // branch 1 too (carrying the failed clause onto only the demoted remainder was a post-hoc
  // reinterpretation); an over-ceiling event rate under a failed closure is retained as an
  // OBSERVED H-C candidate, not an established branch.
  if (closureResidual > CLS_MAX_CLOSURE_RESIDUAL) {
    out.branch = 'MIXED/INCONCLUSIVE';
    if (ceilingExceeded) {
      out.observedCeilingExcess =
        `H-C-candidate event-rate excess, observed, not established: real event rate ` +
        `${pooled.realEventBinsPerSec}/s > ${CLS_CEILING_FACTOR} x ceiling ` +
        `${ceiling.ceilingBinsPerSec}/s (share of rate ${out.hcShareOfRate})`;
    }
    out.demotedCandidate = candidate;
    out.detail =
      `closure residual ${closureResidual} > ${CLS_MAX_CLOSURE_RESIDUAL}: the O x S ` +
      `decomposition does not close (O ${O}, S ${S}, rho ${pooled.rho}) — INCONCLUSIVE ` +
      `regardless of branch hits (section C)` +
      (out.observedCeilingExcess ? `; ${out.observedCeilingExcess}` : '') +
      (candidate ? `; band reading (descriptive only): ${candidate}` : '');
    return out;
  }
  // branch 1: H-C ceiling test (reads the event rate, not the O/S decomposition)
  if (ceilingExceeded) {
    out.branch = 'H-C';
    out.demotedCandidate = candidate;
    out.detail =
      `real event rate ${pooled.realEventBinsPerSec}/s > ${CLS_CEILING_FACTOR} x ceiling ` +
      `${ceiling.ceilingBinsPerSec}/s; H-C share of rate ${out.hcShareOfRate}` +
      (candidate
        ? `; demoted same-arm candidate remainder (descriptive only): ${candidate}`
        : '');
    return out;
  }
  // branch 2: NO-IN-WINDOW-EXCESS (pre-op R2; closure <= limit is guaranteed past the gate)
  if (inb(O, bands.noExcess) && inb(S, bands.noExcess)) {
    out.branch = 'NO-IN-WINDOW-EXCESS';
    out.detail = `O ${O} and S ${S} in [${bands.noExcess}), closure residual ${closureResidual} <= ${CLS_MAX_CLOSURE_RESIDUAL}`;
    return out;
  }
  // branch 3: H-A
  if (inb(O, bands.haO) && S >= bands.haSMin) {
    out.branch = 'H-A';
    out.detail = `per-event-bin credit excess at modeled cadence: O ${O} in [${bands.haO}), S ${S} >= ${bands.haSMin}`;
    return out;
  }
  // branch 4: H-B
  if (O >= bands.hbOMin && inb(S, bands.hbS)) {
    out.branch = 'H-B';
    out.detail = `surplus event bins at modeled sizes: O ${O} >= ${bands.hbOMin}, S ${S} in [${bands.hbS})`;
    return out;
  }
  out.branch = 'MIXED/INCONCLUSIVE';
  out.detail = `both factors mid-band: (O, S, rho) = (${O}, ${S}, ${pooled.rho})`;
  return out;
}

// ---------------------------------------------------------------------------
// NOISE-SOLO — C4 same-regime noise-floor re-run on solo quiet bases
// (pre-op packet docs/handoffs/2026-08-16-c4-noise-floor-preop-packet.md §D;
// every constant below is pre-registered there and may not be changed by a run).
//
// Measures the reader's false-event rate at the classification statistic's event
// definition (1/30s bins, max gap CLS_MAX_EVENT_GAP_FRAMES trace-frames, positive
// delta above threshold) on ground-truth-quiet spans of a SOLO fill series in the
// same render regime as the classification's clean reads (bar painted, `filling`
// state, between credit events). MEASUREMENT ONLY — no verdict; the decision-rule
// application belongs to the /scientific-method driver.
// ---------------------------------------------------------------------------
/** §C confound C-c: raw-vs-true bracket. 1.41 raw (≡1.5 true) is the binding one. */
export const NS_THRESHOLDS = [1.41, 1.5, 1.596] as const;
export const NS_BINDING_THRESHOLD = 1.41;
/** offCurve pass tolerance — gauge-fill.py's TEAM_NOISE_PCT, ported verbatim. */
export const NS_OFFCURVE_TOL = 1.5;
/** §D-2 guard band around a pinned fire instant: [fire − 2 frames, fire + 0.30s + 8 frames]. */
export const NS_GUARD_PRE_FRAMES = 2;
export const NS_GUARD_LATENCY_SEC = 0.3;
export const NS_GUARD_POST_FRAMES = 8;
/** §D-2: pulls whose guards double their half-widths (bar-derived/cadence-interpolated pins). */
export const NS_WIDENED_PULLS: readonly number[] = [3, 4, 6];
/** §D-2 primary-basis quiet region and its pre-registered exclusion (the screen-tint span). */
export const NS_PRIMARY_WINDOW: [number, number] = [7.7, 19.37];
export const NS_PRIMARY_EXCLUSIONS: [number, number][] = [[16, 17.97]];
/** Revision 1 (pre-committed): R1-blocking magnitude for a quiet-span false-event bin. */
export const NS_BIG_DELTA_RAW = 4.7;
/** §E P-B: iron's team event-bin deltas sit at median ~6; the discriminating band. */
export const NS_TEAM_EVENT_BAND: [number, number] = [5, 7];
/** One-sided 95% Wilson score upper limit. */
export const NS_WILSON_Z = 1.645;
/** BQ1 floors (packet §F). */
export const NS_BQ1_PRIMARY_MIN_BINS = 150;
export const NS_BQ1_POOLED_MIN_BINS = 180;

/** One-sided upper Wilson score bound on a binomial proportion k/n. */
export function wilsonUpper(k: number, n: number, z = NS_WILSON_Z): number {
  if (n <= 0) {
    return NaN;
  }
  const p = k / n;
  const z2 = z * z;
  return (
    (p + z2 / (2 * n) + z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) /
    (1 + z2 / n)
  );
}

export interface SoloRead {
  t: number;
  state: string;
  fillRaw: number | null;
}
export interface SoloSeries {
  fps: number;
  reads: SoloRead[];
}

/**
 * Port of gauge-fill.py `_dominant_chain` (verbatim semantics): indices of the LARGEST subset of
 * `vals` consistent with one non-decreasing fill curve, judged against the chain's RUNNING MAX
 * within `tol`. Exact DP over a Pareto frontier of (length, runningMax); ties prefer the lower
 * curve. Deterministic.
 */
export function dominantChain(vals: number[], tol: number): Set<number> {
  const n = vals.length;
  const chain = new Set<number>();
  if (n === 0) {
    return chain;
  }
  // frontiers[j] = [(length, runningMax, prevIndex, prevFrontierSlot), ...]
  const frontiers: [number, number, number, number][][] = [];
  for (let j = 0; j < n; j += 1) {
    const cand: [number, number, number, number][] = [[1, vals[j], -1, -1]];
    for (let i = 0; i < j; i += 1) {
      for (let k = 0; k < frontiers[i].length; k += 1) {
        const [ln, m] = frontiers[i][k];
        if (vals[j] >= m - tol) {
          cand.push([ln + 1, Math.max(m, vals[j]), i, k]);
        }
      }
    }
    cand.sort((a, b) => (a[0] === b[0] ? a[1] - b[1] : b[0] - a[0]));
    const front: [number, number, number, number][] = [];
    let bestM: number | null = null;
    for (const c of cand) {
      if (bestM === null || c[1] < bestM) {
        front.push(c);
        bestM = c[1];
      }
    }
    frontiers.push(front);
  }
  let bj = 0;
  let bk = 0;
  let best: [number, number] = [0, 0];
  for (let j = 0; j < n; j += 1) {
    for (let k = 0; k < frontiers[j].length; k += 1) {
      const [ln, m] = frontiers[j][k];
      if (ln > best[0] || (ln === best[0] && -m > best[1])) {
        best = [ln, -m];
        bj = j;
        bk = k;
      }
    }
  }
  while (bj !== -1) {
    chain.add(bj);
    const [, , pj, pk] = frontiers[bj][bk];
    bj = pj;
    bk = pk;
  }
  return chain;
}

export interface OffCurveFlag {
  index: number;
  t: number;
  fillRaw: number | null;
  run: number;
}

/**
 * Port of gauge-fill.py `flag_off_curve` for a SOLO series (which carries no flags array): the
 * same run segmentation (`filling` reads with a value accumulate; any non-`flash` other state
 * ends the run), the same dominant-curve judgement at NS_OFFCURVE_TOL. Solo reads carry no
 * `spike` flags, so every read of a run is chain-eligible (the python filters spikes first).
 * Returns the flagged reads; callers exclude them from quiet statistics.
 */
export function flagOffCurveSolo(
  series: SoloSeries,
  tol = NS_OFFCURVE_TOL
): OffCurveFlag[] {
  const flags: OffCurveFlag[] = [];
  const runs: { index: number; read: SoloRead }[][] = [];
  let cur: { index: number; read: SoloRead }[] = [];
  series.reads.forEach((r, index) => {
    if (r.state === 'filling' && r.fillRaw !== null) {
      cur.push({ index, read: r });
    } else if (r.state !== 'flash') {
      if (cur.length) {
        runs.push(cur);
      }
      cur = [];
    }
  });
  if (cur.length) {
    runs.push(cur);
  }
  runs.forEach((run, runIdx) => {
    const chain = dominantChain(
      run.map((x) => x.read.fillRaw!),
      tol
    );
    run.forEach((x, k) => {
      if (!chain.has(k)) {
        flags.push({
          index: x.index,
          t: x.read.t,
          fillRaw: x.read.fillRaw,
          run: runIdx,
        });
      }
    });
  });
  return flags;
}

export interface GuardBand {
  pull: number;
  fireSec: number;
  fireField: string;
  widened: boolean;
  lo: number;
  hi: number;
}

/**
 * §D-2 guard construction. `framesFps` is the frame unit of the "2 frames"/"8 frames" margins
 * (the packet's other frame unit for this series is trace-frames, i.e. the series fps).
 * `widened` pulls double each half-width around the same fire anchor; `scale` is control C-iii.
 */
export function soloGuards(
  fires: { pull: number; fireSec: number; fireField: string }[],
  framesFps: number,
  scale = 1
): GuardBand[] {
  return fires.map((f) => {
    const widened = NS_WIDENED_PULLS.includes(f.pull);
    const mult = (widened ? 2 : 1) * scale;
    const leftHw = (NS_GUARD_PRE_FRAMES / framesFps) * mult;
    const rightHw =
      (NS_GUARD_LATENCY_SEC + NS_GUARD_POST_FRAMES / framesFps) * mult;
    return {
      pull: f.pull,
      fireSec: f.fireSec,
      fireField: f.fireField,
      widened,
      lo: round(f.fireSec - leftHw, 4),
      hi: round(f.fireSec + rightHw, 4),
    };
  });
}

/** Subtract closed cut intervals from a closed window; returns the surviving open gaps. */
export function subtractIntervals(
  window: [number, number],
  cuts: [number, number][]
): [number, number][] {
  let spans: [number, number][] = [window];
  for (const [clo, chi] of [...cuts].sort((a, b) => a[0] - b[0])) {
    const next: [number, number][] = [];
    for (const [lo, hi] of spans) {
      if (chi <= lo || clo >= hi) {
        next.push([lo, hi]);
        continue;
      }
      if (clo > lo) {
        next.push([lo, round(clo, 4)]);
      }
      if (chi < hi) {
        next.push([round(chi, 4), hi]);
      }
    }
    spans = next;
  }
  return spans.filter(([lo, hi]) => hi - lo > 1e-9);
}

export interface NoiseSpanRow {
  span: [number, number];
  sec: number;
  /** median fill of the span's quiet reads — the plateau level */
  level: number;
  /** nearest plateau value from the artifact's per-pull table, for the §D-2 cross-check */
  nearestPlateau: number | null;
  reads: number;
  bins: number;
  pairs: number;
  positiveDeltas: number;
  falseEventBinsBinding: number;
  dropped: boolean;
  droppedFlags?: OffCurveFlag[];
}

export interface SoloNoiseStats {
  name: string;
  quietReads: number;
  pairs: number;
  quietBins: number;
  byThreshold: {
    threshold: number;
    falseEventBins: number;
    falseEventBinRate: number;
    wilsonUpper95OneSided: number;
  }[];
  p95PositiveDelta: number;
  maxDelta: number;
  positiveDeltas: number[];
  /** value (rounded 0.1) -> count over all positive quiet-span pair deltas */
  positiveDeltaHistogram: Record<string, number>;
  /** binding-threshold false-event bins with summed bin delta >= NS_BIG_DELTA_RAW */
  bigDeltaBins: number;
  /** binding-threshold false-event bins with summed bin delta inside NS_TEAM_EVENT_BAND */
  teamBandBins: number;
  /** summed per-bin deltas of the binding-threshold false-event bins */
  falseEventBinDeltasBinding: number[];
  fillLevels: {
    n: number;
    min: number;
    p25: number;
    p50: number;
    p75: number;
    max: number;
    mean: number;
    decileCounts: number[];
  };
  spans: NoiseSpanRow[];
  droppedSpans: number;
}

function fillLevelStats(fills: number[]): SoloNoiseStats['fillLevels'] {
  const s = [...fills].sort((a, b) => a - b);
  const deciles = new Array(10).fill(0) as number[];
  for (const f of s) {
    deciles[Math.min(9, Math.floor(f / 10))] += 1;
  }
  return {
    n: s.length,
    min: round(s[0] ?? NaN, 2),
    p25: round(quantile(s, 0.25), 2),
    p50: round(quantile(s, 0.5), 2),
    p75: round(quantile(s, 0.75), 2),
    max: round(s[s.length - 1] ?? NaN, 2),
    mean: round(s.reduce((a, b) => a + b, 0) / Math.max(1, s.length), 2),
    decileCounts: deciles,
  };
}

/**
 * The quiet-span false-event statistic over one solo series (§D-1). A read is quiet when it is
 * a `filling` read with a value inside a surviving span and not offCurve-flagged; a span
 * containing ANY flagged read is DROPPED whole (§D-4 C-v) and reported. Bins are 1/30s
 * (CLS_BIN_SEC); the reader stores t rounded to 2 decimals, so the bin index is recovered from
 * the reconstructed frame index round(t·fps) — at 30fps one trace-frame IS one bin. Pairs obey
 * the classification event definition: consecutive quiet reads <= CLS_MAX_EVENT_GAP_FRAMES
 * trace-frames apart; per-bin deltas accumulate like classifyArm's eventByBin.
 */
export function soloQuietNoise(
  name: string,
  series: SoloSeries,
  spans: [number, number][],
  flags: OffCurveFlag[],
  plateaus: number[] = [],
  cuts: [number, number][] = []
): SoloNoiseStats {
  const eps = 1e-9;
  const inCut = (t: number): boolean =>
    cuts.some(([clo, chi]) => t >= clo - eps && t <= chi + eps);
  const flaggedIdx = new Set(flags.map((f) => f.index));
  const rows: NoiseSpanRow[] = [];
  const allPos: number[] = [];
  let maxDelta = -Infinity;
  let quietReads = 0;
  let pairs = 0;
  const binSet = new Set<number>();
  const falseByThr = new Map<number, Set<number>>();
  for (const thr of NS_THRESHOLDS) {
    falseByThr.set(thr, new Set());
  }
  const bindingBinDeltas = new Map<number, number>();
  const fills: number[] = [];
  let dropped = 0;
  for (const [lo, hi] of spans) {
    const inSpan = series.reads
      .map((r, index) => ({ r, index }))
      .filter(
        ({ r }) =>
          r.t >= lo - eps &&
          r.t <= hi + eps &&
          !inCut(r.t) &&
          r.state === 'filling' &&
          r.fillRaw !== null
      );
    const spanFlags = flags.filter((f) =>
      inSpan.some(({ index }) => index === f.index)
    );
    const levels = inSpan.map(({ r }) => r.fillRaw!);
    const levelMedian = levels.length ? median(levels) : NaN;
    const row: NoiseSpanRow = {
      span: [round(lo, 4), round(hi, 4)],
      sec: round(hi - lo, 4),
      level: round(levelMedian, 2),
      nearestPlateau:
        plateaus.length && levels.length
          ? plateaus.reduce((a, b) =>
              Math.abs(b - levelMedian) < Math.abs(a - levelMedian) ? b : a
            )
          : null,
      reads: inSpan.length,
      bins: 0,
      pairs: 0,
      positiveDeltas: 0,
      falseEventBinsBinding: 0,
      dropped: spanFlags.length > 0,
    };
    if (spanFlags.length > 0) {
      row.droppedFlags = spanFlags;
      dropped += 1;
      rows.push(row);
      continue;
    }
    const quiet = inSpan.filter(({ index }) => !flaggedIdx.has(index));
    quietReads += quiet.length;
    const spanBins = new Set<number>();
    for (const { r } of quiet) {
      const frame = Math.round(r.t * series.fps);
      const bin = Math.floor(frame / series.fps / CLS_BIN_SEC + 1e-6);
      spanBins.add(bin);
      binSet.add(bin);
      fills.push(r.fillRaw!);
    }
    row.bins = spanBins.size;
    for (let k = 1; k < quiet.length; k += 1) {
      const a = quiet[k - 1].r;
      const b = quiet[k].r;
      const gapFrames =
        Math.round(b.t * series.fps) - Math.round(a.t * series.fps);
      if (gapFrames > CLS_MAX_EVENT_GAP_FRAMES) {
        continue;
      }
      pairs += 1;
      row.pairs += 1;
      const delta = b.fillRaw! - a.fillRaw!;
      maxDelta = Math.max(maxDelta, delta);
      if (delta > 0) {
        allPos.push(round(delta, 2));
        row.positiveDeltas += 1;
      }
      const frame = Math.round(b.t * series.fps);
      const bin = Math.floor(frame / series.fps / CLS_BIN_SEC + 1e-6);
      for (const thr of NS_THRESHOLDS) {
        if (delta > thr) {
          falseByThr.get(thr)!.add(bin);
        }
      }
      if (delta > NS_BINDING_THRESHOLD) {
        bindingBinDeltas.set(bin, (bindingBinDeltas.get(bin) ?? 0) + delta);
      }
    }
    row.falseEventBinsBinding = [
      ...falseByThr.get(NS_BINDING_THRESHOLD)!,
    ].filter((b) => spanBins.has(b)).length;
    rows.push(row);
  }
  allPos.sort((a, b) => a - b);
  const hist: Record<string, number> = {};
  for (const d of allPos) {
    const key = (Math.round(d * 10) / 10).toFixed(1);
    hist[key] = (hist[key] ?? 0) + 1;
  }
  const bindingDeltas = [...bindingBinDeltas.values()].map((d) => round(d, 2));
  return {
    name,
    quietReads,
    pairs,
    quietBins: binSet.size,
    byThreshold: NS_THRESHOLDS.map((thr) => {
      const k = falseByThr.get(thr)!.size;
      return {
        threshold: thr,
        falseEventBins: k,
        falseEventBinRate: round(k / Math.max(1, binSet.size), 4),
        wilsonUpper95OneSided: round(wilsonUpper(k, binSet.size), 4),
      };
    }),
    p95PositiveDelta: round(quantile(allPos, 0.95), 3),
    maxDelta: round(maxDelta, 3),
    positiveDeltas: allPos,
    positiveDeltaHistogram: hist,
    bigDeltaBins: bindingDeltas.filter((d) => d >= NS_BIG_DELTA_RAW).length,
    teamBandBins: bindingDeltas.filter(
      (d) => d >= NS_TEAM_EVENT_BAND[0] && d <= NS_TEAM_EVENT_BAND[1]
    ).length,
    falseEventBinDeltasBinding: bindingDeltas.sort((a, b) => a - b),
    fillLevels: fillLevelStats(fills),
    spans: rows,
    droppedSpans: dropped,
  };
}

// ---- iron fill-level regime comparison (revision 4) ------------------------
export interface IronFillLevels {
  bundle: string;
  usableWindowIds: number[];
  perWindowReproduced: {
    id: number;
    cleanBins: { got: number; committed: number };
    usableCleanBins: { got: number; committed: number };
    eventBins: { got: number; committed: number };
    saturatedBins: { got: number; committed: number };
    match: boolean;
  }[];
  allMatch: boolean;
  fillLevels: SoloNoiseStats['fillLevels'];
}

/**
 * The fill levels of iron's usable clean bins (one value per non-saturated clean bin: the mean
 * of its clean reads), reconstructed from the committed replay bundle + the classification
 * artifact's recorded `--reflag` offCurve additions, replicating classifyArm's window/bin logic.
 * Self-validating: the per-window (cleanBins, usableCleanBins, eventBins, saturatedBins) must
 * reproduce the committed artifact's values, else the extraction is disowned.
 */
export function ironUsableCleanBinFills(
  bundlePath: string,
  offCurveIndices: number[],
  fixturePath: string,
  committedWindows: {
    id: number;
    usable: boolean;
    cleanBins: number;
    usableCleanBins: number;
    eventBins: number;
    saturatedBins: number;
  }[],
  eMin: number
): IronFillLevels {
  const bundle = JSON.parse(readFileSync(bundlePath, 'utf8')) as {
    trace: FillTrace;
  };
  const trace = bundle.trace;
  for (const i of offCurveIndices) {
    if (!trace.reads[i].flags.includes('offCurve')) {
      trace.reads[i].flags.push('offCurve');
    }
  }
  const fx = JSON.parse(readFileSync(fixturePath, 'utf8')) as TempoFixture;
  const usable = committedWindows.filter((w) => w.usable);
  const perWindowReproduced: IronFillLevels['perWindowReproduced'] = [];
  const fills: number[] = [];
  for (const rw of refillWindows(fx)) {
    const committed = usable.find((w) => w.id === rw.id);
    if (!committed) {
      continue;
    }
    const inWin = trace.reads.filter(
      (r) => r.t >= rw.fbEnd && r.t <= rw.stage1
    );
    const full = inWin.find((r) => r.state === 'full');
    const firstFilling = inWin.find((r) => r.state === 'filling');
    if (!full || !firstFilling) {
      continue;
    }
    const barPaint = firstFilling.t;
    const dur = full.t - barPaint;
    const nBins = Math.ceil(dur / CLS_BIN_SEC - 1e-9);
    const binOf = (t: number): number =>
      Math.min(
        nBins - 1,
        Math.max(0, Math.floor((t - barPaint) / CLS_BIN_SEC))
      );
    const winReads = inWin.filter((r) => r.t >= barPaint && r.t < full.t);
    const clean = winReads.filter(isClean);
    const cleanBinSet = new Set<number>();
    const satBinSet = new Set<number>();
    const byBin = new Map<number, number[]>();
    for (const r of clean) {
      const b = binOf(r.t);
      cleanBinSet.add(b);
      if (r.fillRaw! > CLS_SAT_PCT) {
        satBinSet.add(b);
      }
      if (!byBin.has(b)) {
        byBin.set(b, []);
      }
      byBin.get(b)!.push(r.fillRaw!);
    }
    const eventByBin = new Map<number, number>();
    for (let k = 1; k < clean.length; k += 1) {
      const a = clean[k - 1];
      const b = clean[k];
      const delta = b.fillRaw! - a.fillRaw!;
      const gapFrames = Math.round((b.t - a.t) * trace.fps);
      if (gapFrames > CLS_MAX_EVENT_GAP_FRAMES) {
        continue;
      }
      const bin = binOf(b.t);
      if (delta > eMin && !satBinSet.has(bin)) {
        eventByBin.set(bin, (eventByBin.get(bin) ?? 0) + delta);
      }
    }
    const row = {
      id: rw.id,
      cleanBins: { got: cleanBinSet.size, committed: committed.cleanBins },
      usableCleanBins: {
        got: cleanBinSet.size - satBinSet.size,
        committed: committed.usableCleanBins,
      },
      eventBins: { got: eventByBin.size, committed: committed.eventBins },
      saturatedBins: {
        got: satBinSet.size,
        committed: committed.saturatedBins,
      },
      match: false,
    };
    row.match =
      row.cleanBins.got === row.cleanBins.committed &&
      row.usableCleanBins.got === row.usableCleanBins.committed &&
      row.eventBins.got === row.eventBins.committed &&
      row.saturatedBins.got === row.saturatedBins.committed;
    perWindowReproduced.push(row);
    for (const [b, vals] of byBin) {
      if (!satBinSet.has(b)) {
        fills.push(vals.reduce((a, v) => a + v, 0) / vals.length);
      }
    }
  }
  return {
    bundle: bundlePath,
    usableWindowIds: usable.map((w) => w.id),
    perWindowReproduced,
    allMatch:
      perWindowReproduced.length === usable.length &&
      perWindowReproduced.every((w) => w.match),
    fillLevels: fillLevelStats(fills),
  };
}

// ---- swha descriptives (secondary basis, §D-3) -----------------------------
export interface SwhaDescriptives {
  windowStartSec: number;
  firstPartialFill: { t: number; fillRaw: number } | null;
  firstFullInstant: number | null;
  steps: { t: number; from: number; to: number; delta: number }[];
  stepGapsSec: number[];
  /** offCurve pass over the WINDOWED (t >= windowStart) sub-series — feeds the step table */
  offCurveFlags: OffCurveFlag[];
  /**
   * offCurve pass over the FULL series, reported as an observation: the pre-window ~7.8s of
   * unflagged "filling 100.0" render garbage forms a longer plateau than the genuine one-cycle
   * climb, so the full-series dominant chain condemns the real fill cycle instead. The packet's
   * §D-3 window (t >= 7.83) is what makes the pass meaningful on this clip.
   */
  offCurveFlagsFullSeries: { count: number; flaggedGenuineCycleReads: number };
  positiveDeltasAll: number[];
}

/** Descriptive-only read of the swha solo trace inside t >= windowStart (packet §D-3). */
export function swhaDescriptives(
  series: SoloSeries,
  windowStart = 7.83
): SwhaDescriptives {
  const fullFlags = flagOffCurveSolo(series);
  const win0 = series.reads.filter((r) => r.t >= windowStart - 1e-9);
  const winSeries: SoloSeries = { fps: series.fps, reads: win0 };
  const flags = flagOffCurveSolo(winSeries);
  const flaggedIdx = new Set(flags.map((f) => f.index));
  const win = winSeries.reads.map((r, index) => ({ r, index }));
  const firstPartial =
    win.find(
      ({ r }) =>
        r.state === 'filling' &&
        r.fillRaw !== null &&
        r.fillRaw > 0 &&
        r.fillRaw < 100
    ) ?? null;
  const firstFull = win.find(({ r }) => r.state === 'full') ?? null;
  const steps: SwhaDescriptives['steps'] = [];
  const pos: number[] = [];
  const clean = win.filter(
    ({ r, index }) =>
      r.state === 'filling' && r.fillRaw !== null && !flaggedIdx.has(index)
  );
  for (let k = 1; k < clean.length; k += 1) {
    const a = clean[k - 1].r;
    const b = clean[k].r;
    const gapFrames =
      Math.round(b.t * series.fps) - Math.round(a.t * series.fps);
    if (gapFrames > CLS_MAX_EVENT_GAP_FRAMES) {
      continue;
    }
    const delta = b.fillRaw! - a.fillRaw!;
    if (delta > 0) {
      pos.push(round(delta, 2));
    }
    if (delta > NS_BINDING_THRESHOLD) {
      steps.push({
        t: b.t,
        from: a.fillRaw!,
        to: b.fillRaw!,
        delta: round(delta, 2),
      });
    }
  }
  return {
    windowStartSec: windowStart,
    firstPartialFill: firstPartial
      ? { t: firstPartial.r.t, fillRaw: firstPartial.r.fillRaw! }
      : null,
    firstFullInstant: firstFull ? firstFull.r.t : null,
    steps,
    stepGapsSec: steps.slice(1).map((s, i) => round(s.t - steps[i].t, 2)),
    offCurveFlags: flags,
    offCurveFlagsFullSeries: {
      count: fullFlags.length,
      flaggedGenuineCycleReads: fullFlags.filter(
        (f) => f.t >= windowStart - 1e-9
      ).length,
    },
    positiveDeltasAll: pos.sort((a, b) => a - b),
  };
}

// ---- the full deterministic run (pinned by scripts/tests/probe/noise-solo.test.ts) ----
export const NS_ANIS_ARTIFACT =
  'docs/probe-data/anis-star-solo-a3-gauge-reread.json';
export const NS_CLASSIFICATION_ARTIFACT =
  'docs/probe-data/fill-trace-habc-classification.json';
export const NS_OPENING_ARTIFACTS = [
  'docs/probe-data/fill-trace-opening-u8-g-iron-sweep.json',
  'docs/probe-data/fill-trace-opening-probe-u7-t5-wind-weak.json',
  'docs/probe-data/fill-trace-opening-u8-i-misc-b3s.json',
];

interface AnisArtifact {
  perPullTable: {
    pull: number;
    firedAtSec: number;
    before: number | null;
    after: number | null;
  }[];
  series30fps: { fps: number; reads: SoloRead[] };
}

interface ClassificationArtifact {
  params: { eMinFinal: number };
  controls: { c4NoiseFloor: QuietNoiseResult };
  reflag: Record<
    string,
    { bundle?: string; newOffCurveReadIndices?: number[] }
  >;
  arms: Record<
    string,
    {
      fixture: string;
      windows: {
        id: number;
        usable: boolean;
        cleanBins: number;
        usableCleanBins: number;
        eventBins: number;
        saturatedBins: number;
      }[];
      pooled: {
        eventBins: number;
        usableCleanBins: number;
        sumRealDurationSec: number;
        realEventBinsPerSec: number;
        bridgedMassTotal: number;
        medianEventBinDelta: number;
        eventBinDeltaQuantiles: Record<string, number>;
      };
      branch: { ceilingBinsPerSec: number; ceilingThreshold: number };
    }
  >;
}

/**
 * The complete deterministic §D run: primary-basis quiet statistics (base guards, C-iii ×1.5,
 * and the 60fps-frame-unit sensitivity), swha descriptives, the iron fill-level regime
 * comparison (revision 4), the MAR quantification (revision 2), and the C-i replay of the
 * original drain-hold C4 from the committed opening artifacts. Everything here recomputes from
 * committed inputs; nothing is hand-derived.
 */
export function noiseSoloRun(opts: {
  anisPath?: string;
  classificationPath?: string;
  openingPaths?: string[];
  swhaTracePath?: string;
}): Record<string, unknown> {
  const anisPath = opts.anisPath ?? NS_ANIS_ARTIFACT;
  const clsPath = opts.classificationPath ?? NS_CLASSIFICATION_ARTIFACT;
  const anis = JSON.parse(readFileSync(anisPath, 'utf8')) as AnisArtifact;
  const cls = JSON.parse(
    readFileSync(clsPath, 'utf8')
  ) as ClassificationArtifact;

  // ---- primary basis: anis-star series30fps ----
  const series: SoloSeries = {
    fps: anis.series30fps.fps,
    reads: anis.series30fps.reads,
  };
  const fires = anis.perPullTable.map((p) => ({
    pull: p.pull,
    fireSec: p.firedAtSec,
    fireField: `perPullTable[pull=${p.pull}].firedAtSec`,
  }));
  const plateaus = [
    ...new Set(
      anis.perPullTable.flatMap((p) =>
        [p.before, p.after].filter((x): x is number => x !== null && x < 100)
      )
    ),
  ].sort((a, b) => a - b);
  const flags = flagOffCurveSolo(series);
  const buildCuts = (framesFps: number, scale: number): [number, number][] => [
    ...NS_PRIMARY_EXCLUSIONS,
    ...soloGuards(fires, framesFps, scale).map(
      (g) => [g.lo, g.hi] as [number, number]
    ),
  ];
  const runVariant = (
    name: string,
    framesFps: number,
    scale: number
  ): SoloNoiseStats => {
    const cuts = buildCuts(framesFps, scale);
    return soloQuietNoise(
      name,
      series,
      subtractIntervals(NS_PRIMARY_WINDOW, cuts),
      flags,
      plateaus,
      cuts
    );
  };
  const anisBase = runVariant(
    'anis-star solo (A3 reread, 30fps)',
    series.fps,
    1
  );
  const anisGuard15 = runVariant(
    'anis-star solo — C-iii guards ×1.5',
    series.fps,
    1.5
  );
  const anis60fUnit = runVariant(
    'anis-star solo — sensitivity: guard frame margins read as 60fps frames',
    60,
    1
  );

  // ---- secondary basis: swha descriptives ----
  let swha: SwhaDescriptives | null = null;
  if (opts.swhaTracePath) {
    const doc = JSON.parse(readFileSync(opts.swhaTracePath, 'utf8')) as
      | { trace: { fps: number; reads: SoloRead[] } }
      | { fps: number; reads: SoloRead[] };
    const tr = 'trace' in doc ? doc.trace : doc;
    swha = swhaDescriptives({ fps: tr.fps, reads: tr.reads });
  }

  // ---- C-i: exact replay of the original drain-hold C4 ----
  const openingPaths = opts.openingPaths ?? NS_OPENING_ARTIFACTS;
  const sources = openingPaths.map((p) => {
    const doc = JSON.parse(readFileSync(p, 'utf8')) as {
      result: { comp: string };
      diagHold: { window: number; reads: DiagRead[] }[];
    };
    return { name: doc.result.comp, diagHold: doc.diagHold };
  });
  const cIrecomputed = quietNoiseCheck(sources, cls.params.eMinFinal);
  const cIcommitted = cls.controls.c4NoiseFloor;
  const cIexact = JSON.stringify(cIrecomputed) === JSON.stringify(cIcommitted);

  // ---- iron fill-level regime comparison (revision 4) ----
  const ironArm = cls.arms['iron sweep (run G)'];
  const iron = ironUsableCleanBinFills(
    cls.reflag.iron.bundle!,
    cls.reflag.iron.newOffCurveReadIndices!,
    ironArm.fixture,
    ironArm.windows,
    cls.params.eMinFinal
  );

  // ---- MAR quantification (revision 2) ----
  const p = ironArm.pooled;
  const cleanBinTimeSec = round(p.usableCleanBins * CLS_BIN_SEC, 4);
  const bridgedEvents = round(p.bridgedMassTotal / p.medianEventBinDelta, 2);
  const mar = {
    eventBins: p.eventBins,
    usableCleanBins: p.usableCleanBins,
    cleanBinTimeSec,
    fullWindowDurationSec: p.sumRealDurationSec,
    ratePerSecCleanBinTime: round(p.eventBins / cleanBinTimeSec, 4),
    ratePerSecFullDuration: round(p.eventBins / p.sumRealDurationSec, 4),
    ceilingBinsPerSec: ironArm.branch.ceilingBinsPerSec,
    ceilingThreshold: ironArm.branch.ceilingThreshold,
    bridgedMassTotal: p.bridgedMassTotal,
    medianTeamEventBinDelta: p.medianEventBinDelta,
    bridgedMassDerivedEventEstimate: bridgedEvents,
    bridgedEventRateOverFullDuration: round(
      bridgedEvents / p.sumRealDurationSec,
      4
    ),
    ratePerSecFullDurationPlusBridgedEstimate: round(
      (p.eventBins + bridgedEvents) / p.sumRealDurationSec,
      4
    ),
  };

  // ---- BQ floors, mechanically ----
  const pooledQuietBins = anisBase.quietBins; // swha is descriptive-only: no pooled contribution
  const bq = {
    bq1: {
      primaryQuietBins: anisBase.quietBins,
      primaryFloor: NS_BQ1_PRIMARY_MIN_BINS,
      primaryMeetsFloor: anisBase.quietBins >= NS_BQ1_PRIMARY_MIN_BINS,
      pooledQuietBins,
      pooledFloor: NS_BQ1_POOLED_MIN_BINS,
      pooledMeetsFloor: pooledQuietBins >= NS_BQ1_POOLED_MIN_BINS,
    },
    bq2: { cIexactReplay: cIexact },
    bq4: {
      qualifyingBasesEnteringPooledF: 1,
      note: 'BQ4 needs two qualifying bases above 50 quiet bins; only the primary basis enters pooled f, so the clause has nothing to compare.',
    },
  };

  return {
    params: {
      binSec: round(CLS_BIN_SEC, 6),
      maxEventGapFrames: CLS_MAX_EVENT_GAP_FRAMES,
      thresholds: [...NS_THRESHOLDS],
      bindingThreshold: NS_BINDING_THRESHOLD,
      offCurveTolerance: NS_OFFCURVE_TOL,
      wilsonZ: NS_WILSON_Z,
      guard: {
        preFrames: NS_GUARD_PRE_FRAMES,
        latencySec: NS_GUARD_LATENCY_SEC,
        postFrames: NS_GUARD_POST_FRAMES,
        widenedPulls: [...NS_WIDENED_PULLS],
        frameUnit:
          "trace-frames at the series fps (30) — the packet's frame unit for this series " +
          '(§D-1 "max gap 2 trace-frames"); the 60fps-frame reading is reported as a sensitivity',
      },
      primaryWindow: NS_PRIMARY_WINDOW,
      primaryExclusions: NS_PRIMARY_EXCLUSIONS,
      fireInstants: soloGuards(fires, series.fps, 1),
      bigDeltaRaw: NS_BIG_DELTA_RAW,
      teamEventBand: NS_TEAM_EVENT_BAND,
    },
    offCurveFlags: {
      count: flags.length,
      insidePrimaryWindow: flags.filter(
        (f) =>
          f.t >= NS_PRIMARY_WINDOW[0] - 1e-9 &&
          f.t <= NS_PRIMARY_WINDOW[1] + 1e-9
      ),
      all: flags,
    },
    primary: anisBase,
    controls: {
      cI: {
        recomputed: cIrecomputed,
        committed: cIcommitted,
        exactMatch: cIexact,
      },
      cIiiGuards15: anisGuard15,
      sensitivityGuard60fpsFrames: anis60fUnit,
    },
    swha,
    ironFillLevelComparison: iron,
    mar,
    basisClauses: bq,
    teamEventSizeProfile: {
      source: 'iron sweep (run G) pooled eventBinDeltaQuantiles (committed)',
      quantiles: p.eventBinDeltaQuantiles,
    },
  };
}

// ---------------------------------------------------------------------------
// noise-solo2 — the same §D quiet-noise construction over the SECOND anis-star
// (Anis: Star) solo recording (pre-op packet
// docs/handoffs/2026-08-16-anis-star-solo2-gauge-preop-packet.md). Everything
// recomputes from the committed artifact: the 30fps series (stored changes-only,
// expanded losslessly), the window spans/exclusions and the per-pull guard
// anchors with per-fire widened flags. MEASUREMENT ONLY — no verdict.
// Replayed by scripts/tests/probe/noise-solo2.test.ts.
// ---------------------------------------------------------------------------
export const NS2_ARTIFACT = 'docs/probe-data/anis-star-solo2-gauge.json';

export interface Solo2Fire {
  pull: string;
  fireSec: number;
  fireField: string;
  widened: boolean;
}
export interface Solo2Window {
  id: string;
  span: [number, number];
  exclusions: [number, number][];
  fires: Solo2Fire[];
}
export interface Solo2ChangesOnly {
  fps: number;
  frameCount: number;
  changes: [number, string, number | null][];
}
interface Solo2Artifact {
  noiseInput: {
    windows: Solo2Window[];
    oldBasis: { source: string; quietBins: number; falseEventBins: number };
  };
  perPullTable: { before: number | null; after: number | null }[];
  series30fpsChangesOnly: Solo2ChangesOnly;
}

/**
 * Lossless expansion of a changes-only solo series back to per-frame reads: the reader emits
 * every frame, and a change row exists wherever consecutive frames differ, so holding the last
 * change reproduces the full series byte-for-byte (t = round(i/fps, 2), the reader's rounding;
 * no frame index lands on a .005 rounding boundary at fps 30).
 */
export function expandChangesOnly(c: Solo2ChangesOnly): SoloSeries {
  const reads: SoloRead[] = [];
  let k = -1;
  let state = 'unknown';
  let fillRaw: number | null = null;
  for (let i = 0; i < c.frameCount; i += 1) {
    if (k + 1 < c.changes.length && c.changes[k + 1][0] === i) {
      k += 1;
      [, state, fillRaw] = c.changes[k];
    }
    reads.push({ t: Math.round((i / c.fps) * 100) / 100, state, fillRaw });
  }
  return { fps: c.fps, reads };
}

export interface Solo2GuardBand {
  pull: string;
  fireSec: number;
  fireField: string;
  widened: boolean;
  lo: number;
  hi: number;
}

/** The §D-2 guard geometry with per-fire widened flags (solo2 artifact form). */
export function solo2Guards(
  fires: Solo2Fire[],
  framesFps: number,
  scale = 1
): Solo2GuardBand[] {
  return fires.map((f) => {
    const mult = (f.widened ? 2 : 1) * scale;
    const leftHw = (NS_GUARD_PRE_FRAMES / framesFps) * mult;
    const rightHw =
      (NS_GUARD_LATENCY_SEC + NS_GUARD_POST_FRAMES / framesFps) * mult;
    return {
      pull: f.pull,
      fireSec: f.fireSec,
      fireField: f.fireField,
      widened: f.widened,
      lo: round(f.fireSec - leftHw, 4),
      hi: round(f.fireSec + rightHw, 4),
    };
  });
}

/**
 * The full deterministic solo2 run: per-window and pooled quiet statistics over the refill
 * windows, the C-iii ×1.5 guard control, the 60fps-frame-unit sensitivity, and the joint pool
 * with the old A3 basis (bins and false events added; Wilson recomputed on the pooled counts).
 */
export function noiseSolo2Run(
  opts: { artifactPath?: string } = {}
): Record<string, unknown> {
  const path = opts.artifactPath ?? NS2_ARTIFACT;
  const art = JSON.parse(readFileSync(path, 'utf8')) as Solo2Artifact;
  const series = expandChangesOnly(art.series30fpsChangesOnly);
  const flags = flagOffCurveSolo(series);
  const plateaus = [
    ...new Set(
      art.perPullTable.flatMap((p) =>
        [p.before, p.after].filter((x): x is number => x !== null && x < 100)
      )
    ),
  ].sort((a, b) => a - b);
  const windows = art.noiseInput.windows;
  const build = (framesFps: number, scale: number) =>
    windows.map((w) => {
      const guards = solo2Guards(w.fires, framesFps, scale);
      const cuts: [number, number][] = [
        ...w.exclusions,
        ...guards.map((g) => [g.lo, g.hi] as [number, number]),
      ];
      return { w, guards, cuts, spans: subtractIntervals(w.span, cuts) };
    });
  const pooledOf = (
    name: string,
    parts: ReturnType<typeof build>
  ): SoloNoiseStats =>
    soloQuietNoise(
      name,
      series,
      parts.flatMap((x) => x.spans),
      flags,
      plateaus,
      parts.flatMap((x) => x.cuts)
    );
  const baseParts = build(series.fps, 1);
  const pooled = pooledOf(
    'anis-star solo #2 pooled W2+W3+W4 (30fps)',
    baseParts
  );
  const perWindow = baseParts.map(({ w, guards, cuts, spans }) => ({
    id: w.id,
    span: w.span,
    exclusions: w.exclusions,
    guards,
    stats: soloQuietNoise(
      `anis-star solo #2 ${w.id}`,
      series,
      spans,
      flags,
      plateaus,
      cuts
    ),
  }));
  const guard15 = pooledOf(
    'anis-star solo #2 — C-iii guards ×1.5',
    build(series.fps, 1.5)
  );
  const unit60 = pooledOf(
    'anis-star solo #2 — sensitivity: guard frame margins read as 60fps frames',
    build(60, 1)
  );
  const old = art.noiseInput.oldBasis;
  const jointBins = pooled.quietBins + old.quietBins;
  const jointPooledWithOldBasis = {
    source: old.source,
    oldQuietBins: old.quietBins,
    oldFalseEventBins: old.falseEventBins,
    jointQuietBins: jointBins,
    byThreshold: pooled.byThreshold.map((t) => {
      const k = t.falseEventBins + old.falseEventBins;
      return {
        threshold: t.threshold,
        falseEventBins: k,
        falseEventBinRate: round(k / Math.max(1, jointBins), 4),
        wilsonUpper95OneSided: round(wilsonUpper(k, jointBins), 4),
      };
    }),
  };
  const floors = {
    primaryQuietBins: pooled.quietBins,
    primaryFloor: NS_BQ1_PRIMARY_MIN_BINS,
    primaryMeetsFloor: pooled.quietBins >= NS_BQ1_PRIMARY_MIN_BINS,
    jointPooledQuietBins: jointBins,
    jointPooledFloor: NS_BQ1_POOLED_MIN_BINS,
    jointPooledMeetsFloor: jointBins >= NS_BQ1_POOLED_MIN_BINS,
  };
  return {
    params: {
      binSec: round(CLS_BIN_SEC, 6),
      maxEventGapFrames: CLS_MAX_EVENT_GAP_FRAMES,
      thresholds: [...NS_THRESHOLDS],
      bindingThreshold: NS_BINDING_THRESHOLD,
      offCurveTolerance: NS_OFFCURVE_TOL,
      wilsonZ: NS_WILSON_Z,
      guard: {
        preFrames: NS_GUARD_PRE_FRAMES,
        latencySec: NS_GUARD_LATENCY_SEC,
        postFrames: NS_GUARD_POST_FRAMES,
        widenedPulls: windows.flatMap((w) =>
          w.fires.filter((f) => f.widened).map((f) => f.pull)
        ),
        frameUnit:
          'trace-frames at the series fps (30); the 60fps-frame reading is ' +
          'reported as a sensitivity',
      },
      windows: windows.map((w) => ({
        id: w.id,
        span: w.span,
        exclusions: w.exclusions,
      })),
    },
    offCurveFlags: {
      count: flags.length,
      insideWindows: flags.filter((f) =>
        windows.some((w) => f.t >= w.span[0] - 1e-9 && f.t <= w.span[1] + 1e-9)
      ),
    },
    perWindow,
    pooled,
    controls: {
      cIiiGuards15: guard15,
      sensitivityGuard60fpsFrames: unit60,
    },
    jointPooledWithOldBasis,
    floors,
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (hit) {
    return hit.slice(name.length + 3);
  }
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

/**
 * Emit the deliverable's tables straight from the committed bundles, so no figure in a
 * judge-facing doc is ever hand-transcribed (two consecutive 2026-07-30 review rounds corrected
 * hand-derived counts in the same paragraph).
 */
function tables(bundlePaths: string[]): string {
  const out: string[] = [];
  const perComp: {
    comp: string;
    medianR: number;
    iqr: number;
    readable: number;
  }[] = [];
  for (const p of bundlePaths) {
    const b = JSON.parse(readFileSync(p, 'utf8')) as {
      result: CompResult;
      simSchedule: SimSchedule;
      trace: FillTrace;
    };
    const r = b.result;
    const abs = (b.trace.bar.absolute ?? b.trace.bar) as {
      rows: number[];
      x0: number;
      x1: number;
    };
    const n = (x: number | null): string =>
      x === null || !Number.isFinite(x as number) ? '—' : String(x);
    out.push(`### ${r.comp}\n`);
    out.push(
      `\`${r.slugs.join('` · `')}\` — focus \`${r.focusSlug}\`  \n` +
        `recording \`${r.video}\`  \n` +
        `widget lock (reader-reported, absolute frame coords): rows ${abs.rows.join('–')}, ` +
        `x ${abs.x0}–${abs.x1}, ${b.trace.bar.widthPx}px  \n` +
        `credit-schedule amounts trusted: **${r.amountsTrusted ? 'yes' : 'NO'}**` +
        (r.amountsTrusted ? '' : ` — ${r.scheduleWarnings.join('; ')}`) +
        '\n'
    );
    out.push(
      '| win | whole window (s) | visible span (s) | visibleFraction | clean-frame % | real clean-span rate (%/s) | sim same-fraction rate (%/s) | R | bridged incs | surplus events | full−stage1 (s) | FBend→paint (s) | status |'
    );
    out.push(
      '| --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | :-- |'
    );
    for (const w of r.windows) {
      out.push(
        `| ${w.id} | ${n(w.wholeWindowSec)} (${n(w.fbEnd)}→${n(w.fullInstant)}) | ${n(w.visibleSec)} | ${n(w.visibleFraction)} | ${
          Number.isFinite(w.cleanFramePct)
            ? Math.round(w.cleanFramePct * 100)
            : '—'
        } | ${n(w.realRate)} | ${n(w.simRate)} | ${n(w.R)} | ${w.realBridged.length} | ${w.surplus.length} | ${n(w.fullMinusStage1)} | ${n(w.fbEndToBarPaint)} | ${w.status}${w.reason ? ` — ${w.reason}` : ''} |`
      );
    }
    out.push('');
    out.push(
      `**readable ${r.readable.length}/${r.windows.length}** · median R **${n(r.medianR)}** · ` +
        `IQR **${n(r.rIqr.iqr)}** [${n(r.rIqr.p25)}, ${n(r.rIqr.p75)}]  \n` +
        `whole-window R (\`[fbEnd, full]\` anchor) ${n(r.medianRWhole)}, IQR ${n(r.rWholeIqr.iqr)} · ` +
        `whole-window R (\`[barPaint, full]\` anchor) ${n(r.medianRVisible)}, IQR ${n(r.rVisibleIqr.iqr)} · ` +
        `opening R ${n(r.medianROpening)} · Pearson(R, visibleFraction) ${n(r.rVsVisibleFraction)}\n`
    );
    if (!r.amountsTrusted) {
      out.push(
        `Increment histogram, surplus census and every R figure: **VOID on this arm** — the ` +
          `credit-schedule instrument disowned its own amounts here, so there is no sim side to ` +
          `compare against. The real-side event stream is still measured (${r.realEventQuantiles.n} ` +
          `direct events at ${n(r.realEventRate)}/s) but has no counterpart, and is NOT reported as a ` +
          `comparison.\n`
      );
    } else {
      out.push(
        `Increment histogram (team-sum, 60fps; direct increments only per R2) — real ` +
          `${r.realEventQuantiles.n} events at ${n(r.realEventRate)}/s vs sim ${r.simEventQuantiles.n} at ${n(r.simEventRate)}/s\n`
      );
      out.push('| side | n | min | p25 | p50 | p75 | p90 | max | mean | sum |');
      out.push('| :-- | --: | --: | --: | --: | --: | --: | --: | --: | --: |');
      for (const [side, q] of [
        ['real', r.realEventQuantiles],
        ['sim', r.simEventQuantiles],
      ] as const) {
        out.push(
          `| ${side} | ${q.n} | ${n(q.min)} | ${n(q.p25)} | ${n(q.p50)} | ${n(q.p75)} | ${n(q.p90)} | ${n(q.max)} | ${n(q.mean)} | ${n(q.sum)} |`
        );
      }
      out.push('');
      out.push(
        `Bridged bin (R2 — excluded from the histogram and the surplus census): ${r.bridged.count} increments, ` +
          `median ${n(r.bridged.medianDelta)}%, median span ${n(r.bridged.medianSpanSec)}s, ${n(r.bridged.gauge)}% total.  \n` +
          `Surplus census: ${n(r.surplusShare)} of real gauge; ${n(r.surplusEventShare)} of events off-schedule ` +
          `against ${n(r.chanceOffScheduleShare)} expected from chance alignment alone.\n`
      );
    }
    const stat = (xs: number[]): string => {
      const m = xs.reduce((a, x) => a + x, 0) / xs.length;
      const sd = Math.sqrt(
        xs.reduce((a, x) => a + (x - m) ** 2, 0) / xs.length
      );
      const s = [...xs].sort((a, b) => a - b);
      return `n=${xs.length} mean ${m.toFixed(4)} sd ${sd.toFixed(4)} range [${s[0]}, ${s[s.length - 1]}]`;
    };
    out.push(
      'Boundary reads (method step 4d), all windows:\n\n' +
        `| read | distribution |\n| :-- | :-- |\n` +
        `| green-full instant − stage-1 hexagon | ${stat(r.boundary.fullMinusStage1)} |\n` +
        `| last burst render → charging-bar paint | ${stat(r.boundary.burstRenderEndToBarPaint)} |\n` +
        `| \`fullWindows[].end\` → charging-bar paint | ${stat(r.boundary.fbEndToBarPaint)} |\n` +
        `| \`fullWindows[].start\` → charging-bar paint | ${stat(r.boundary.fbStartToBarPaint)} |\n`
    );
    out.push(
      `Instrument quality (H0b) — clean-set reads that fall more than ${EVENT_MIN_PCT}% below a ` +
        `previous clean read, per window (violations/worst drop %): ` +
        r.windows
          .map(
            (w) =>
              `${w.id}:${w.monotonicityViolations}/${w.monotonicityWorstDrop}`
          )
          .join(' ') +
        '\n'
    );
    const c = r.closure;
    out.push(
      `Closure (R3), from measured widget instants only:  \n` +
        `real cycle ${n(c.realCycleSec)}s vs sim ${n(c.simCycleSec)}s ⇒ gap **${n(c.gapPerCycle)}s/cycle**  \n` +
        `· refill: real ${n(c.realRefillSec)}s vs sim ${n(c.simRefillSec)}s ⇒ **${n(c.refillDelta)}s** (${(
          (c.refillDelta / c.gapPerCycle) *
          100
        ).toFixed(1)}%)  \n` +
        `· ladder (gauge-full → next Full-Burst start): real ${n(c.realLadderSec)}s vs sim ${n(c.simLadderSec)}s ⇒ **${n(c.ladderDelta)}s** (${(
          (c.ladderDelta / c.gapPerCycle) *
          100
        ).toFixed(1)}%)  \n` +
        `· residual ${n(c.residual)}s ⇒ **${(c.closedShare * 100).toFixed(1)}% closed**\n`
    );
    if (r.amountsTrusted) {
      perComp.push({
        comp: r.comp,
        medianR: r.medianR,
        iqr: r.rIqr.iqr,
        readable: r.readable.length,
      });
    }
  }
  const d = decisionRule(perComp);
  out.push('### Pre-committed decision rule, applied\n');
  out.push('| comp | readable windows | median R | R IQR |');
  out.push('| :-- | --: | --: | --: |');
  for (const c of perComp) {
    out.push(`| ${c.comp} | ${c.readable} | ${c.medianR} | ${c.iqr} |`);
  }
  out.push('');
  out.push(`**Branch fired: ${d.branch}** — ${d.detail}\n`);
  return out.join('\n');
}

function openingCli(): void {
  const bundlePath = process.argv[3];
  if (!bundlePath || bundlePath.startsWith('--')) {
    throw new Error(
      'usage: fill-trace-compare.ts opening <bundle json> [--diag <gauge-fill --diag trace>] [--artifact <out json>]'
    );
  }
  const bundle = JSON.parse(readFileSync(bundlePath, 'utf8')) as BundleLike;
  const diagPath = arg('diag');
  let diagHold: { window: number; reads: DiagRead[] }[] | null = null;
  if (diagPath) {
    const diagTrace = JSON.parse(readFileSync(diagPath, 'utf8')) as {
      reads: (FillRead & { diag?: Omit<DiagRead, 't'> })[];
    };
    diagHold = extractDiagHold(diagTrace, bundle.result);
  }
  const res = openingAnalysis(bundle, diagHold);

  const artifact = arg('artifact');
  if (artifact) {
    writeFileSync(
      artifact,
      `${JSON.stringify(
        {
          _note:
            'Opening-window observable (step 1a, docs/handoffs/2026-08-14-burst-gen-next-session.md): ' +
            'does any gauge bank while the drained Full-Burst bar holds the widget slot, before the ' +
            'charging bar paints? Self-contained: `diagHold` carries the raw hold-span pixel reads ' +
            'from a gauge-fill.py --team --diag run, so the analysis replays without the gitignored ' +
            'video. Replayed by scripts/tests/probe/fill-trace-opening.test.ts. MEASUREMENT ONLY — ' +
            'no verdict; the hypothesis classification belongs to a /scientific-method pass.',
          bundle: bundlePath,
          commands: {
            diag:
              'scripts/probe/gauge-fill.py --team --frames fine --fps 60 --lock-frames lock ' +
              '--crop 280:70:2342:465 --diag --spans "$(npx tsx scripts/probe/fill-trace-compare.ts ' +
              'spans --fixture <fixture>)"',
            opening:
              'npx tsx scripts/probe/fill-trace-compare.ts opening <bundle> --diag <diag trace> ' +
              '--artifact <this file>',
          },
          diagHold,
          result: res,
        },
        null,
        1
      )}\n`
    );
    process.stdout.write(`wrote ${artifact}\n`);
  }

  const n = (x: number | null): string =>
    x === null || !Number.isFinite(x as number) ? '—' : String(x);
  process.stdout.write(
    `\n===== OPENING-WINDOW OBSERVABLE — ${res.comp} =====\n` +
      `video ${res.video}\n` +
      `amounts trusted: ${res.amountsTrusted ? 'yes' : 'NO (predBankFbEndSim void)'}\n\n` +
      `win  hold(s)  paintFill  maxLow  t>8%   firstClean@t        earlyRate  intercept@paint (whole-rate)  predSim  predReal | quiet n/med/max/last  fadeMax\n` +
      res.windows
        .map((w) => {
          const d = w.diag;
          return (
            `${String(w.id).padStart(3)}  ${String(w.holdSec).padStart(6)}  ${String(n(w.paintFill)).padStart(8)}  ` +
            `${String(n(w.maxLowBeforeClean)).padStart(6)}  ${String(n(w.tToExceedLow)).padStart(5)}  ` +
            `${String(n(w.firstClean)).padStart(6)}@${String(n(w.paintToFirstCleanSec)).padEnd(7)}  ` +
            `${String(n(w.earlyRate)).padStart(8)}  ${String(n(w.interceptAtPaint)).padStart(10)} (${n(w.interceptWholeRate)})  ` +
            `${String(n(w.predBankFbEndSim)).padStart(7)}  ${String(n(w.predBankFbEndReal)).padStart(8)}` +
            (d
              ? ` | ${d.quietFrames}/${n(d.quietFillMedian)}/${n(d.quietFillMax)}(${n(d.quietFillSustainedMax)})/${n(d.lastQuietFill)}  ${n(d.fadeFillMax)}`
              : ' | —') +
            `  ${w.status}`
          );
        })
        .join('\n') +
      `\n\nmedians: hold ${n(res.medianHoldSec)}s · paintFill ${n(res.medianPaintFill)} · ` +
      `intercept@paint ${n(res.medianInterceptAtPaint)} (IQR ${n(res.interceptIqr.iqr)} ` +
      `[${n(res.interceptIqr.p25)}, ${n(res.interceptIqr.p75)}])\n` +
      `predictions if banking ran from FB-end: sim-credit sizes ${n(res.medianPredBankFbEndSim)} · ` +
      `at the visible-span real rate ${n(res.medianPredBankFbEndReal)}\n` +
      `prediction if banking starts at bar-paint: 0\n` +
      `quiet-frame fill max across hold spans: ${n(res.quietFillMaxAcrossWindows)} ` +
      `(sustained, despiked: ${n(res.quietFillSustainedMaxAcrossWindows)})\n`
  );
}

function classifyCli(): void {
  const schedPath = arg('schedule');
  const compName = arg('comp');
  const eMin = Number(arg('e-min') ?? CLS_E_MIN);

  // ---- stage C4: classify --noise-check <opening artifact>[,<...>] ---------
  const noise = arg('noise-check');
  if (noise) {
    const sources = noise.split(',').map((p) => {
      const doc = JSON.parse(readFileSync(p, 'utf8')) as {
        result: { comp: string };
        diagHold: { window: number; reads: DiagRead[] }[];
      };
      return { name: doc.result.comp, diagHold: doc.diagHold };
    });
    const res = quietNoiseCheck(sources, eMin);
    process.stdout.write(`${JSON.stringify(res, null, 1)}\n`);
    return;
  }

  // ---- real-only descriptives (the misc B3s fence: sim arm voided by construction) ----
  if (process.argv.includes('--real-only')) {
    const fxPath = arg('fixture');
    const trPath = arg('trace');
    if (!fxPath || !trPath) {
      throw new Error('classify --real-only needs --fixture and --trace');
    }
    const fx0 = JSON.parse(readFileSync(fxPath, 'utf8')) as TempoFixture;
    const doc = JSON.parse(readFileSync(trPath, 'utf8')) as
      FillTrace | { trace: FillTrace };
    const tr = 'reads' in doc ? doc : doc.trace;
    const res = classifyArm(fx0, tr, null, { eMin });
    const outPath = arg('artifact');
    if (outPath) {
      writeFileSync(outPath, `${JSON.stringify(res, null, 1)}\n`);
      process.stdout.write(`wrote ${outPath}\n`);
    }
    process.stdout.write(`${JSON.stringify(res, null, 1)}\n`);
    return;
  }

  if (!schedPath || !compName) {
    throw new Error(
      'classify needs --schedule <credit-schedule json> --comp "<name>" ' +
        '(or --noise-check <opening artifacts>; add --fixture/--trace for the real side, ' +
        '--sim-only to freeze the sim side first)'
    );
  }
  const scheds = JSON.parse(readFileSync(schedPath, 'utf8')) as SimSchedule[];
  const sched = scheds.find((s) => s.comp === compName);
  if (!sched) {
    throw new Error(
      `no comp "${compName}" in ${schedPath} — have: ${scheds.map((s) => s.comp).join(', ')}`
    );
  }

  // ---- stage C3 + freeze: classify --sim-only ------------------------------
  const base = simComponents(sched);
  const ceiling = simCeiling(sched);
  if (process.argv.includes('--sim-only')) {
    const variants = {
      base,
      jitterPlus1: simComponents(sched, { jitterFrames: 1 }),
      jitterMinus1: simComponents(sched, { jitterFrames: -1 }),
      phaseHalfBin: simComponents(sched, { phaseSec: 1 / 60 }),
      scale60fps: simComponents(sched, { binSec: 1 / 60 }),
    };
    const shift = (v: SimComponents, field: 'frac' | 'p50'): number =>
      field === 'frac'
        ? Math.abs(v.creditBinFraction - base.creditBinFraction) /
          base.creditBinFraction
        : Math.abs(v.binAmountQuantiles.p50 - base.binAmountQuantiles.p50) /
          base.binAmountQuantiles.p50;
    // C3 perturbations AT THE PINNED SCALE (jitter both ways + the other rebinning phase).
    // The 1/60s run is reported as a scale comparison only: O and S are same-scale ratios, so a
    // scale change moves both sides together and is not an alignment artifact.
    const aligned = [
      variants.jitterPlus1,
      variants.jitterMinus1,
      variants.phaseHalfBin,
    ];
    const oShift = Math.max(...aligned.map((v) => shift(v, 'frac')));
    const sShift = Math.max(...aligned.map((v) => shift(v, 'p50')));
    const bands = widenBands(CLS_BASE_BANDS, oShift, sShift);
    process.stdout.write(
      `${JSON.stringify(
        {
          comp: sched.comp,
          scheduleChecks: {
            endpointOk: sched.checks.endpointOk,
            dbgGaugeOk: sched.checks.dbgGauge.ok,
            truncatedOk: sched.checks.truncatedOk,
            unreconstructed: sched.unreconstructed,
          },
          components: variants,
          c3: {
            oComponentMaxAlignedShift: round(oShift, 4),
            sComponentMaxAlignedShift: round(sShift, 4),
            shiftLimit: CLS_C3_SHIFT_LIMIT,
            widened: oShift > CLS_C3_SHIFT_LIMIT || sShift > CLS_C3_SHIFT_LIMIT,
            finalBands: bands,
          },
          ceiling,
        },
        null,
        1
      )}\n`
    );
    return;
  }

  // ---- full arm: classify --fixture --trace [--o-shift --s-shift] ----------
  const fixture = arg('fixture');
  const tracePath = arg('trace');
  if (!fixture || !tracePath) {
    throw new Error(
      'classify needs --fixture <windows json> --trace <reflagged trace/bundle>'
    );
  }
  const fx = JSON.parse(readFileSync(fixture, 'utf8')) as TempoFixture;
  const traceDoc = JSON.parse(readFileSync(tracePath, 'utf8')) as
    FillTrace | { trace: FillTrace };
  const trace = 'reads' in traceDoc ? traceDoc : traceDoc.trace;
  const bands = widenBands(
    CLS_BASE_BANDS,
    Number(arg('o-shift') ?? 0),
    Number(arg('s-shift') ?? 0)
  );
  const res = classifyArm(fx, trace, sched, {
    eMin,
    bands,
    simComp: base,
    ceiling,
  });
  const artifact = arg('artifact');
  if (artifact) {
    writeFileSync(artifact, `${JSON.stringify(res, null, 1)}\n`);
    process.stdout.write(`wrote ${artifact}\n`);
  }
  process.stdout.write(`${JSON.stringify(res, null, 1)}\n`);
}

function noiseSoloCli(): void {
  const result = noiseSoloRun({
    anisPath: arg('anis'),
    classificationPath: arg('classification'),
    openingPaths: arg('opening')?.split(','),
    swhaTracePath: arg('swha'),
  });
  const artifact = arg('artifact');
  if (artifact) {
    const doc = {
      _note:
        'C4 same-regime noise-floor re-run (pre-op packet ' +
        'docs/handoffs/2026-08-16-c4-noise-floor-preop-packet.md): the reader false-event rate ' +
        'at the classification event definition, measured on ground-truth-quiet spans of the ' +
        'committed anis-star (Anis: Star) solo series, with the swha ' +
        '(snow-white-heavy-arms) solo trace as the descriptive-only secondary basis. ' +
        'MEASUREMENT ONLY — parameters, per-span tables, per-source + pooled statistics, ' +
        'control results, distributions. No verdict; decision-rule application belongs to the ' +
        '/scientific-method driver. Replayed by scripts/tests/probe/noise-solo.test.ts.',
      packet: 'docs/handoffs/2026-08-16-c4-noise-floor-preop-packet.md',
      commands: {
        run:
          'npx tsx scripts/probe/fill-trace-compare.ts noise-solo ' +
          `--swha ${arg('swha') ?? '<swha trace>'} --artifact <this file>`,
        swhaFrames:
          'ffmpeg -v error -i "docs/probes/solo/swha-solo.mov" -vf fps=30 <dir>/%05d.png',
        swhaReader:
          'scripts/probe/.venv/bin/python scripts/probe/gauge-fill.py --frames <dir> --fps 30 ' +
          '--bar 489:501:2474:2612 --out <trace>',
      },
      swhaPinning: arg('swha-note') ?? null,
      result,
    };
    writeFileSync(artifact, `${JSON.stringify(doc, null, 1)}\n`);
    process.stdout.write(`wrote ${artifact}\n`);
  }
  process.stdout.write(`${JSON.stringify(result, null, 1)}\n`);
}

/**
 * noise-solo2: recompute the solo2 quiet-noise result and write it back into the artifact's
 * `result` field, leaving every other artifact field (the raw measurement record) untouched.
 */
function noiseSolo2Cli(): void {
  const path = arg('artifact') ?? NS2_ARTIFACT;
  const result = noiseSolo2Run({ artifactPath: path });
  const doc = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
  doc.result = result;
  writeFileSync(path, `${JSON.stringify(doc, null, 1)}\n`);
  process.stdout.write(`wrote ${path}\n`);
}

// ---------------------------------------------------------------------------
// solo-rate: per-trigger gauge credit off a SOLO fill trace
// ---------------------------------------------------------------------------
//
// A solo Burst-III unit makes ZERO full bursts (there is no Burst I to open the chain), so its
// bar fills once, monotonically, and then sits full — one clean uninterrupted generating window
// with no drain side and no rider/FB confounds. That makes the per-trigger credit readable
// directly as the STEP SIZE between consecutive shots, which is what this subcommand extracts.
//
// The statistic that matters is not just the mean. Under PER-TRIGGER crediting every step must be
// the SAME value (the datamined column), so the only step-to-step spread allowed is the bar's own
// column quantization. Under PER-LANDED crediting (the U40 owner ruling for SG) the step scales
// with how many pellets landed that pull, so the spread exceeds quantization. `varianceRatio`
// below is that test: ~1 means constant-credit is viable, >>1 means it is not.
export interface SoloRateStep {
  t: number;
  fill: number;
  deltaFromPrev: number | null;
  gapFromPrev: number | null;
  acrossReload: boolean;
  saturated: boolean;
}
export interface SoloRateResult {
  label: string;
  window: [number, number];
  barWidthPx: number;
  rawOverTrue: number;
  cadencePerSec: number;
  dataminedColumnPct: number | null;
  steps: SoloRateStep[];
  counted: number[];
  excludedSteps: number[];
  meanRaw: number;
  sdRaw: number;
  minRaw: number;
  maxRaw: number;
  meanTrue: number;
  ratioToColumn: number | null;
  quantSd: number;
  varianceRatio: number;
  observedCadencePerSec: number | null;
}

/**
 * Extract per-trigger gauge credit steps from a solo gauge-fill trace.
 *
 * `dominantChain` is reused (same tolerance as the off-curve pass) to drop the bright-flash
 * excursions that spike a solo bar to 100 and back — the documented reader artifact — before any
 * step is measured. Steps whose preceding gap exceeds `reloadGapFactor / cadence` are recorded but
 * EXCLUDED from the statistics: a step spanning a reload can carry credit from shots the trace
 * could not resolve, so it is not a single-trigger observation.
 */
export function soloRate(opts: {
  series: SoloSeries;
  barWidthPx: number;
  rawOverTrue: number;
  window: [number, number];
  cadencePerSec: number;
  dataminedColumnPct?: number | null;
  label?: string;
  minStepPct?: number;
  reloadGapFactor?: number;
  mergeGapFactor?: number;
}): SoloRateResult {
  const {
    series,
    barWidthPx,
    rawOverTrue,
    window,
    cadencePerSec,
    dataminedColumnPct = null,
    label = '',
    reloadGapFactor = 1.6,
    mergeGapFactor = 0.5,
  } = opts;
  const columnPct = 100 / barWidthPx;
  // Default: half a column above the quantization floor, so a genuine credit is never missed but
  // a single-column reader wobble is not promoted into a "step".
  const minStep = opts.minStepPct ?? columnPct * 1.5;

  const inWin = series.reads.filter(
    (r) =>
      r.t >= window[0] &&
      r.t <= window[1] &&
      r.fillRaw !== null &&
      (r.state === 'filling' || r.state === 'full')
  );
  if (inWin.length === 0) {
    throw new Error(`solo-rate: no usable reads in window ${window.join(':')}`);
  }
  const chain = dominantChain(
    inWin.map((r) => r.fillRaw!),
    NS_OFFCURVE_TOL
  );
  const clean = inWin.filter((_r, i) => chain.has(i));

  const steps: SoloRateStep[] = [];
  let level: number | null = null;
  let lastT: number | null = null;
  clean.forEach((r) => {
    const f = r.fillRaw!;
    if (level === null) {
      level = f;
      lastT = r.t;
      steps.push({
        t: r.t,
        fill: f,
        deltaFromPrev: null,
        gapFromPrev: null,
        acrossReload: false,
        saturated: false,
      });
      return;
    }
    if (f >= level + minStep) {
      const gap = r.t - (lastT as number);
      const prev = steps[steps.length - 1];
      // MERGE a sub-cadence rise into the step it belongs to. The bar repaints over 2-3 frames, so
      // one trigger's credit can surface as two adjacent rises; counting them separately would
      // manufacture two undersized steps and inflate the spread the variance test reads.
      if (gap < mergeGapFactor / cadencePerSec && prev.deltaFromPrev !== null) {
        prev.deltaFromPrev = round(prev.deltaFromPrev + (f - level));
        prev.fill = f;
        level = f;
        return;
      }
      steps.push({
        t: r.t,
        fill: f,
        deltaFromPrev: round(f - level),
        gapFromPrev: round(gap),
        acrossReload: gap > reloadGapFactor / cadencePerSec,
        // A step that lands ON the cap is TRUNCATED: the bar stopped at 100 with credit to spare,
        // so its measured size is a lower bound on the real one, never the credit itself.
        saturated: f >= 100 - columnPct,
      });
      level = f;
      lastT = r.t;
    }
  });

  const usable = (s: SoloRateStep): boolean =>
    s.deltaFromPrev !== null && !s.acrossReload && !s.saturated;
  const counted = steps.filter(usable).map((s) => s.deltaFromPrev as number);
  const excluded = steps
    .filter((s) => s.deltaFromPrev !== null && (s.acrossReload || s.saturated))
    .map((s) => s.deltaFromPrev as number);
  if (counted.length === 0) {
    throw new Error('solo-rate: no intra-magazine steps found');
  }
  const mean = counted.reduce((a, b) => a + b, 0) / counted.length;
  const variance =
    counted.length > 1
      ? counted.reduce((a, b) => a + (b - mean) ** 2, 0) / (counted.length - 1)
      : 0;
  const sd = Math.sqrt(variance);
  // Each endpoint of a step is column-quantized: uniform error over one column, sd col/sqrt(12).
  // A step is a DIFFERENCE of two such reads, so its quantization sd is that times sqrt(2).
  const quantSd = (columnPct / Math.sqrt(12)) * Math.SQRT2;
  // Observed cadence from the intra-magazine step gaps — an independent check that the steps found
  // really are one-per-trigger and not a merged or split reading.
  const gaps = steps
    .filter(
      (s) =>
        s.gapFromPrev !== null &&
        !s.acrossReload &&
        // A merged remnant at the window edge carries a sub-cadence gap that is not a real
        // trigger interval; including it would bias the cadence check high.
        s.gapFromPrev >= mergeGapFactor / cadencePerSec
    )
    .map((s) => s.gapFromPrev as number);
  const meanGap = gaps.length
    ? gaps.reduce((a, b) => a + b, 0) / gaps.length
    : null;

  const meanTrue = mean / rawOverTrue;
  return {
    label,
    window,
    barWidthPx,
    rawOverTrue,
    cadencePerSec,
    dataminedColumnPct,
    steps,
    counted: counted.map((v) => round(v)),
    excludedSteps: excluded.map((v) => round(v)),
    meanRaw: round(mean),
    sdRaw: round(sd),
    minRaw: round(Math.min(...counted)),
    maxRaw: round(Math.max(...counted)),
    meanTrue: round(meanTrue),
    ratioToColumn:
      dataminedColumnPct === null || dataminedColumnPct === 0
        ? null
        : round(meanTrue / dataminedColumnPct),
    quantSd: round(quantSd),
    varianceRatio: round((sd / quantSd) ** 2),
    observedCadencePerSec: meanGap ? round(1 / meanGap) : null,
  };
}

export interface SoloMagRateResult {
  label: string;
  window: [number, number];
  barWidthPx: number;
  rawOverTrue: number;
  magSize: number;
  dataminedColumnPct: number | null;
  plateaus: { tStart: number; tEnd: number; level: number }[];
  saturatedPlateausDropped: number;
  perMagRaw: number[];
  cycleSdSec: number;
  meanPerMagRaw: number;
  sdPerMagRaw: number;
  perShotRaw: number;
  perShotTrue: number;
  ratioToColumn: number | null;
  observedCycleSec: number | null;
}

/**
 * Per-MAGAZINE credit off a solo fill trace, for weapons whose per-shot credit is below the
 * reader's resolution. An AR credits ~0.9% per shot at 12 shots/s — about one bar column every
 * 1.25 shots at 30fps, so individual triggers are not separable. The magazine IS separable: the
 * reload is a hard multi-second plateau, and the fill DELTA between two consecutive plateaus is
 * exactly one magazine's worth of credit, read from two clean stationary levels rather than from a
 * slope through a moving one.
 */
export function soloMagRate(opts: {
  series: SoloSeries;
  barWidthPx: number;
  rawOverTrue: number;
  window: [number, number];
  magSize: number;
  dataminedColumnPct?: number | null;
  label?: string;
  plateauMinSec?: number;
}): SoloMagRateResult {
  const {
    series,
    barWidthPx,
    rawOverTrue,
    window,
    magSize,
    dataminedColumnPct = null,
    label = '',
    plateauMinSec = 0.8,
  } = opts;
  const columnPct = 100 / barWidthPx;
  const inWin = series.reads.filter(
    (r) =>
      r.t >= window[0] &&
      r.t <= window[1] &&
      r.fillRaw !== null &&
      (r.state === 'filling' || r.state === 'full')
  );
  const chain = dominantChain(
    inWin.map((r) => r.fillRaw!),
    NS_OFFCURVE_TOL
  );
  const clean = inWin.filter((_r, i) => chain.has(i));

  // A plateau = a maximal run of reads sitting within one column of each other for >= plateauMinSec.
  const plateaus: { tStart: number; tEnd: number; level: number }[] = [];
  let run: SoloRead[] = [];
  const flush = (): void => {
    if (run.length < 2) {
      return;
    }
    const span = run[run.length - 1].t - run[0].t;
    if (span >= plateauMinSec) {
      plateaus.push({
        tStart: round(run[0].t),
        tEnd: round(run[run.length - 1].t),
        level: round(Math.max(...run.map((r) => r.fillRaw!))),
      });
    }
  };
  clean.forEach((r) => {
    if (run.length === 0) {
      run = [r];
      return;
    }
    if (Math.abs(r.fillRaw! - run[0].fillRaw!) <= columnPct) {
      run.push(r);
    } else {
      flush();
      run = [r];
    }
  });
  flush();

  // SATURATION GUARD — the sibling `soloRate` has one and this did not. A plateau sitting at the
  // 100% cap is not a reload boundary: the bar stopped climbing because it was FULL, so its delta
  // is truncated and would drag the per-magazine mean down. Drop capped plateaus outright rather
  // than let them contribute a short final delta.
  // INTERIOR capped plateau (a window straddling a gauge reset mid-window) is NOT guarded here:
  // dropping it joins the last pre-cap plateau to the first post-reset one. That cannot produce a
  // silent over-read — the bar resets DOWNWARD, so the joined delta lands NEGATIVE in perMagRaw and
  // the spanning cycle inflates cycleSdSec. Unguarded but LOUD: a negative perMagRaw entry means the
  // window straddles a reset and must be re-cut, not interpreted.
  const saturatedPlateaus = plateaus.filter((p) => p.level >= 100 - columnPct);
  const usablePlateaus = plateaus.filter((p) => p.level < 100 - columnPct);
  if (usablePlateaus.length < 2) {
    throw new Error(
      `solo-rate --mag: need >=2 non-saturated reload plateaus in the window, found ` +
        `${usablePlateaus.length} (${saturatedPlateaus.length} at the 100% cap)`
    );
  }
  const perMag: number[] = [];
  for (let i = 1; i < usablePlateaus.length; i += 1) {
    perMag.push(round(usablePlateaus[i].level - usablePlateaus[i - 1].level));
  }
  const mean = perMag.reduce((a, b) => a + b, 0) / perMag.length;
  const sd =
    perMag.length > 1
      ? Math.sqrt(
          perMag.reduce((a, b) => a + (b - mean) ** 2, 0) / (perMag.length - 1)
        )
      : 0;
  const cycles: number[] = [];
  for (let i = 1; i < usablePlateaus.length; i += 1) {
    cycles.push(usablePlateaus[i].tStart - usablePlateaus[i - 1].tStart);
  }
  // SPURIOUS-PLATEAU SURFACING. A mid-magazine firing pause longer than plateauMinSec looks exactly
  // like a reload boundary and splits one magazine's delta into two undersized ones. That cannot be
  // detected from the plateau list alone, so instead of guessing, report the dispersion and let the
  // caller judge: a clean read has tight perMag and a cycle length near the weapon's real one.
  const cycleMean = cycles.length
    ? cycles.reduce((a, b) => a + b, 0) / cycles.length
    : 0;
  const cycleSd =
    cycles.length > 1
      ? Math.sqrt(
          cycles.reduce((a, b) => a + (b - cycleMean) ** 2, 0) /
            (cycles.length - 1)
        )
      : 0;
  const perShotRaw = mean / magSize;
  const perShotTrue = perShotRaw / rawOverTrue;
  return {
    label,
    window,
    barWidthPx,
    rawOverTrue,
    magSize,
    dataminedColumnPct,
    plateaus,
    saturatedPlateausDropped: saturatedPlateaus.length,
    perMagRaw: perMag,
    cycleSdSec: round(cycleSd),
    meanPerMagRaw: round(mean),
    sdPerMagRaw: round(sd),
    perShotRaw: round(perShotRaw),
    perShotTrue: round(perShotTrue),
    ratioToColumn:
      dataminedColumnPct === null || dataminedColumnPct === 0
        ? null
        : round(perShotTrue / dataminedColumnPct),
    observedCycleSec: cycles.length
      ? round(cycles.reduce((a, b) => a + b, 0) / cycles.length)
      : null,
  };
}

/**
 * Required-numeric CLI arg. `Number(undefined)` is NaN and every downstream comparison against
 * NaN is false, so an omitted or garbled numeric flag does NOT fail loudly — it silently produces
 * a NaN-poisoned result. On a PRE-REGISTRATION tool that is the worst failure available: `arm-power`
 * would report `discriminates: false` (because `NaN >= 2` is false) and a claim could be withdrawn
 * on a missing flag rather than on evidence.
 */
function numArg(
  name: string,
  opts: { positive?: boolean; nonNegative?: boolean } = {}
): number {
  const raw = arg(name);
  const n = Number(raw);
  if (raw === undefined || !Number.isFinite(n)) {
    throw new Error(`--${name} <number> is required (got ${raw ?? 'nothing'})`);
  }
  if (opts.positive && n <= 0) {
    throw new Error(`--${name} must be > 0 (got ${n})`);
  }
  if (opts.nonNegative && n < 0) {
    throw new Error(`--${name} must be >= 0 (got ${n})`);
  }
  return n;
}

function soloRateCli(): void {
  const tracePath = arg('trace');
  if (!tracePath) {
    throw new Error(
      'usage: fill-trace-compare.ts solo-rate --trace <gauge-fill solo trace json> ' +
        '--window <t0:t1> (--cadence <shots/s> | --mag <rounds per magazine>) ' +
        '[--column <datamined targetPerTrigger>] [--label <name>] [--artifact <out json>]\n' +
        '  --cadence: per-TRIGGER step read (weapons whose per-shot credit clears the bar column).\n' +
        '  --mag:     per-MAGAZINE plateau read (fast weapons whose per-shot credit does not).'
    );
  }
  const doc = JSON.parse(readFileSync(tracePath, 'utf8')) as SoloSeries & {
    bar?: { widthPx?: number };
    calibration?: { rawOverTrue?: number };
  };
  const win = (arg('window') ?? '').split(':').map(Number);
  if (win.length !== 2 || win.some((v) => !Number.isFinite(v))) {
    throw new Error('--window <t0:t1> is required');
  }
  const columnRaw = arg('column');
  const magRaw = arg('mag');
  const cadence = Number(arg('cadence'));
  if (!magRaw && (!Number.isFinite(cadence) || cadence <= 0)) {
    throw new Error('one of --cadence <shots/s> or --mag <rounds> is required');
  }
  const common = {
    series: doc,
    barWidthPx: doc.bar?.widthPx ?? 138,
    rawOverTrue: doc.calibration?.rawOverTrue ?? 1.064,
    window: [win[0], win[1]] as [number, number],
    // gauge-per-shot.json stores energy out of 10000; the bar is 100%, so /100 gives percent.
    dataminedColumnPct: columnRaw ? Number(columnRaw) / 100 : null,
    label: arg('label') ?? tracePath,
  };
  const result = magRaw
    ? soloMagRate({ ...common, magSize: numArg('mag', { positive: true }) })
    : soloRate({ ...common, cadencePerSec: cadence });
  const artifact = arg('artifact');
  if (artifact) {
    writeFileSync(artifact, `${JSON.stringify(result, null, 1)}\n`);
    process.stdout.write(`wrote ${artifact}\n`);
  }
  process.stdout.write(`${JSON.stringify(result, null, 1)}\n`);
}

/**
 * ceiling: run the committed `simCeiling` statistic over a credit-schedule report, to answer
 * ONE question before a comp is proposed as a classification arm — is its H-C ceiling detector
 * NON-VACUOUS?
 *
 * The ceiling sums each unit's maximum credit rate (60 / its tightest observed credit gap) and
 * clamps to the bin cap. When the sum reaches the cap, the ceiling IS the cap, the real event rate
 * cannot exceed it (it is bounded by the same cap), and the detector can never fire — that is what
 * made T5 wind-weak vacuous. This is a property of the SIM schedule alone, so it is checkable
 * without any footage and belongs BEFORE a recording is requested, not after.
 */
function ceilingCli(): void {
  const path = arg('schedule');
  if (!path) {
    throw new Error(
      'usage: fill-trace-compare.ts ceiling --schedule <fb-count-matrix --credit-schedule --json output>'
    );
  }
  const raw = JSON.parse(readFileSync(path, 'utf8')) as
    SimSchedule | SimSchedule[];
  const scheds = Array.isArray(raw) ? raw : [raw];
  const out = scheds.map((s) => {
    const c = simCeiling(s);
    return {
      comp: s.comp,
      focusSlug: s.focusSlug,
      unreconstructed: s.unreconstructed,
      checksPass:
        s.checks.endpointOk && s.checks.truncatedOk && s.checks.dbgGauge.ok,
      ...c,
      capSaturated: c.sumRatePerSec >= c.binRateCap,
      verdict:
        c.sumRatePerSec >= c.binRateCap
          ? 'VACUOUS — sum rate reaches the bin cap, the H-C ceiling detector can never fire'
          : 'NON-VACUOUS — the detector has room to fire',
    };
  });
  process.stdout.write(`${JSON.stringify(out, null, 1)}\n`);
}

/**
 * arm-power: PRE-REGISTRATION power analysis for adding a classification arm.
 *
 * Answers, before any frame is extracted, whether a candidate arm can actually SEPARATE the two
 * rival explanations of an excess seen on a reference arm:
 *   - "the excess scales with the comp's own generation ceiling" (a general source), vs
 *   - "the excess is one shared unit's contribution" (a per-unit defect posing as a general law).
 *
 * Both rivals predict a rate for the candidate arm. The question is whether those predictions are
 * further apart than the sampling noise on the event count that will be measured. Event bins are
 * counts, so the leading term is Poisson: sd(rate)/rate = 1/sqrt(E). If the separation is under
 * ~2 sigma the arm cannot discriminate, and running it anyway buys a number that cannot mean what
 * the plan wants it to mean. Reporting that BEFORE the run is the whole point.
 */
export interface ArmPowerResult {
  sharedSlug: string;
  reference: {
    comp: string;
    ceiling: number;
    rate: number;
    excess: number;
    sharedUnitRate: number;
    sharedUnitCeilingShare: number;
  };
  candidate: {
    comp: string;
    ceiling: number;
    sharedUnitRate: number;
    sharedUnitCeilingShare: number;
    estimatedCleanBinTimeSec: number;
  };
  predictions: {
    scalesWithCeiling: {
      ratio: number;
      rate: number;
      share: number;
      sdShare: number;
    };
    scalesWithSharedUnit: {
      ratio: number;
      rate: number;
      share: number;
      sdShare: number;
    };
  };
  power: {
    rateSeparation: number;
    rateSeparationPctOfRate: number;
    expectedEventBins: number;
    oneSigmaRate: number;
    separationSigmas: number;
    eventBinsFor2Sigma: number;
    shortfallFactor: number;
    discriminates: boolean;
  };
}

export function armPower(opts: {
  sharedSlug: string;
  refComp: string;
  refCeilingPerUnit: { slug: string; maxRatePerSec: number }[];
  refRate: number;
  refCleanBinTimeSec: number;
  refFullWindowSec: number;
  candComp: string;
  candCeilingPerUnit: { slug: string; maxRatePerSec: number }[];
  candSimRefillSec: number;
}): ArmPowerResult {
  const sum = (u: { maxRatePerSec: number }[]): number =>
    u.reduce((a, b) => a + b.maxRatePerSec, 0);
  const of = (
    u: { slug: string; maxRatePerSec: number }[],
    slug: string
  ): number => u.find((x) => x.slug === slug)?.maxRatePerSec ?? 0;

  const refCeil = sum(opts.refCeilingPerUnit);
  const candCeil = sum(opts.candCeilingPerUnit);
  const refShared = of(opts.refCeilingPerUnit, opts.sharedSlug);
  const candShared = of(opts.candCeilingPerUnit, opts.sharedSlug);
  const refExcess = opts.refRate - refCeil;

  // The candidate's clean-bin-time denominator is not knowable before the read; estimate it by
  // carrying the reference arm's clean-bin FRACTION onto the candidate's sim refill total. This
  // is an estimate and is labelled as one — it sets the expected event count, not any verdict.
  const cleanFrac = opts.refCleanBinTimeSec / opts.refFullWindowSec;
  const candT = opts.candSimRefillSec * cleanFrac;

  const mk = (
    ratio: number
  ): { ratio: number; rate: number; share: number; sdShare: number } => {
    const rate = candCeil + refExcess * ratio;
    const e = rate * candT;
    const sdRate = rate / Math.sqrt(e);
    return {
      ratio: round(ratio),
      rate: round(rate),
      share: round((rate - candCeil) / rate),
      sdShare: round((candCeil / rate ** 2) * sdRate),
    };
  };
  const pCeil = mk(candCeil / refCeil);
  const pShared = mk(candShared / refShared);

  const sep = Math.abs(pCeil.rate - pShared.rate);
  const midRate = (pCeil.rate + pShared.rate) / 2;
  const eMid = midRate * candT;
  const sigma = midRate / Math.sqrt(eMid);
  const sigmas = sep / sigma;
  // E such that sd(rate) = sep/2, i.e. a 2-sigma separation.
  const eFor2Sigma = (midRate / (sep / 2)) ** 2;

  return {
    sharedSlug: opts.sharedSlug,
    reference: {
      comp: opts.refComp,
      ceiling: round(refCeil),
      rate: round(opts.refRate),
      excess: round(refExcess),
      sharedUnitRate: round(refShared),
      sharedUnitCeilingShare: round(refShared / refCeil),
    },
    candidate: {
      comp: opts.candComp,
      ceiling: round(candCeil),
      sharedUnitRate: round(candShared),
      sharedUnitCeilingShare: round(candShared / candCeil),
      estimatedCleanBinTimeSec: round(candT),
    },
    predictions: { scalesWithCeiling: pCeil, scalesWithSharedUnit: pShared },
    power: {
      rateSeparation: round(sep),
      rateSeparationPctOfRate: round((sep / midRate) * 100),
      expectedEventBins: Math.round(eMid),
      oneSigmaRate: round(sigma),
      separationSigmas: round(sigmas),
      eventBinsFor2Sigma: Math.round(eFor2Sigma),
      shortfallFactor: round(eFor2Sigma / eMid),
      discriminates: sigmas >= 2,
    },
  };
}

// ---------------------------------------------------------------------------
// CLOSURE DIAGNOSTIC — §E.3 of docs/handoffs/2026-08-17-n3-third-arm-preop-packet.md
//
// Recomputes an arm's closure residual EXACTLY as `classifyArm` does, then recomputes it with
// `bridgedMass` excluded from `sumRealDelta`. Bridged increments (a clean-read gap wider than
// CLS_MAX_EVENT_GAP_FRAMES) are dropped from the EVENT census but still ride inside the telescoped
// `sumRealDelta`, so they inflate `massCorrReal` and therefore the residual.
//
// "Excluding bridged mass" is AMBIGUOUS — `rho` also divides by `sumRealDelta` — so BOTH readings
// are computed and reported side by side, and neither is preferred here:
//   variantA — rho held at its as-specified value; only massCorrReal is corrected.
//   variantB — rho recomputed from the corrected sumRealDelta as well.
//
// DIAGNOSTIC ONLY. It applies no branch, stamps nothing, and does not alter the statistic.
// ---------------------------------------------------------------------------
export interface ClosureVariant {
  label: string;
  sumRealDelta: number;
  massCorrReal: number;
  oEff: number;
  rho: number;
  closureResidual: number;
  belowThreshold: boolean;
}

export interface ClosureDiagResult {
  comp: string;
  threshold: number;
  usableWindows: number;
  eventMass: number;
  bridgedMassTotal: number;
  /** invariants held fixed across all three readings (sim side + event census + timing) */
  held: {
    oTime: number;
    massCorrSim: number;
    S: number;
    simRatePerSec: number;
  };
  asSpecified: ClosureVariant;
  variantA: ClosureVariant;
  variantB: ClosureVariant;
  /** self-check: as-specified recompute vs the arm's own stored closureResidual */
  reproduces: {
    storedClosureResidual: number;
    recomputedClosureResidual: number;
    matches: boolean;
    storedRho: number;
    recomputedRho: number;
    storedS: number;
    recomputedS: number;
  };
}

export function closureDiagnostic(arm: {
  comp: string;
  windows: ClsWindow[];
  pooled: ClsPooled | null;
  sim: SimComponents | null;
}): ClosureDiagResult {
  if (!arm.pooled || !arm.sim) {
    throw new Error(
      `closureDiagnostic: arm "${arm.comp}" has no pooled/sim block (real-only or CANNOT-MEASURE arm)`
    );
  }
  const usable = arm.windows.filter((w) => w.usable);
  const sum = (f: (w: ClsWindow) => number): number =>
    usable.reduce((a, w) => a + f(w), 0);
  const sumRealDelta = sum((w) => w.sumRealDelta);
  const sumRealDur = sum((w) => w.durationSec);
  const sumSimGauge = sum((w) => w.simGauge);
  const sumSimDur = sum((w) => w.simDurationSec);
  const eventBins = sum((w) => w.eventBins);
  const eventMass = sum((w) => w.eventMass);
  const bridgedMassTotal = sum((w) => w.bridgedMass);
  const simRate = sumSimGauge / sumSimDur;

  const oTime =
    eventBins / sumRealDur / (arm.sim.creditBins / arm.sim.totalDurationSec);
  const massCorrSim =
    arm.sim.totalGauge /
    Math.max(1e-9, arm.sim.binAmountQuantiles.mean * arm.sim.creditBins);
  const allDeltas = usable
    .flatMap((w) => w.eventBinDeltas)
    .sort((a, b) => a - b);
  const S = quantile(allDeltas, 0.5) / arm.sim.binAmountQuantiles.p50;

  const mk = (
    label: string,
    massBase: number,
    rhoBase: number
  ): ClosureVariant => {
    const massCorrReal = massBase / Math.max(1e-9, eventMass);
    const oEff = (oTime * massCorrReal) / massCorrSim;
    const rho = rhoBase / sumRealDur / simRate;
    const residual = Math.abs(oEff * S - rho) / rho;
    return {
      label,
      sumRealDelta: round(massBase, 2),
      massCorrReal: round(massCorrReal),
      oEff: round(oEff),
      rho: round(rho),
      closureResidual: round(residual),
      belowThreshold: residual < CLS_MAX_CLOSURE_RESIDUAL,
    };
  };
  const corrected = sumRealDelta - bridgedMassTotal;
  const asSpecified = mk('as-specified', sumRealDelta, sumRealDelta);
  return {
    comp: arm.comp,
    threshold: CLS_MAX_CLOSURE_RESIDUAL,
    usableWindows: usable.length,
    eventMass: round(eventMass, 2),
    bridgedMassTotal: round(bridgedMassTotal, 2),
    held: {
      oTime: round(oTime),
      massCorrSim: round(massCorrSim),
      S: round(S),
      simRatePerSec: round(simRate),
    },
    asSpecified,
    variantA: mk(
      'bridged mass excluded from massCorrReal only; rho held as-specified',
      corrected,
      sumRealDelta
    ),
    variantB: mk(
      'bridged mass excluded from massCorrReal AND from rho',
      corrected,
      corrected
    ),
    reproduces: {
      storedClosureResidual: arm.pooled.closureResidual,
      recomputedClosureResidual: asSpecified.closureResidual,
      matches:
        Math.abs(asSpecified.closureResidual - arm.pooled.closureResidual) <
        5e-4,
      storedRho: arm.pooled.rho,
      recomputedRho: asSpecified.rho,
      storedS: arm.pooled.S,
      recomputedS: round(S),
    },
  };
}

// ---------------------------------------------------------------------------
// MAR DIAGNOSTIC — control C7 of the same packet. DESCRIPTIVE; no verdict attaches.
//
// The clean-bin-time denominator is what the event-rate detector divides by, so a reader that
// preferentially loses lock DURING fast fills would bias that estimator upward. This reports, per
// usable window: the bridged-increment count/mass, the dropped-bin fraction (bins with no clean
// read), and the co-occurrence test — mean SIM credit rate inside the fraction-mapped bridged
// spans vs outside them.
//
// Self-validating: it re-walks the clean reads with `classifyArm`'s own increment rule and asserts
// its per-window bridged count and mass reproduce the arm's stored values.
// ---------------------------------------------------------------------------
export interface MarWindowDiag {
  id: number;
  durationSec: number;
  totalBins: number;
  cleanBins: number;
  cleanBinCoverage: number;
  droppedBinFraction: number;
  bridgedCount: number;
  bridgedMass: number;
  bridgedRealSec: number;
  bridgedRealFraction: number;
  simGaugeInsideBridged: number;
  simSecInsideBridged: number;
  simGaugeOutsideBridged: number;
  simSecOutsideBridged: number;
  simRateInsideBridged: number;
  simRateOutsideBridged: number;
  bridgedCountMatches: boolean;
  bridgedMassMatches: boolean;
}

export interface MarDiagResult {
  comp: string;
  eMin: number;
  usableWindows: number;
  windows: MarWindowDiag[];
  pooled: {
    bridgedCount: number;
    bridgedMass: number;
    bridgedMassShareOfSumRealDelta: number;
    bridgedRealSec: number;
    bridgedRealFraction: number;
    droppedBinFractionMean: number;
    simGaugeInsideBridged: number;
    simSecInsideBridged: number;
    simGaugeOutsideBridged: number;
    simSecOutsideBridged: number;
    simRateInsideBridged: number;
    simRateOutsideBridged: number;
    /** > 1 means bridge episodes sit on FASTER-than-average modeled fill (upward-bias direction) */
    insideOverOutsideRateRatio: number;
  };
  selfCheck: { allWindowsReproduce: boolean };
}

export function marDiagnostic(
  fx: TempoFixture,
  trace: FillTrace,
  sched: SimSchedule,
  opts: { eMin?: number; simComp: SimComponents; ceiling: Ceiling }
): MarDiagResult {
  const arm = classifyArm(fx, trace, sched, {
    eMin: opts.eMin,
    simComp: opts.simComp,
    ceiling: opts.ceiling,
  });
  const simRefills = sched.windows
    .filter((w) => w.kind === 'refill')
    .sort((a, b) => a.index - b.index);
  const rws = refillWindows(fx);
  const rows: MarWindowDiag[] = [];
  for (const w of arm.windows) {
    if (!w.usable || w.barPaint === null || w.fullInstant === null) {
      continue;
    }
    const rw = rws.find((r) => r.id === w.id)!;
    const simWin = simRefills[w.id - 1];
    const clean = trace.reads
      .filter(
        (r) =>
          r.t >= rw.fbEnd &&
          r.t <= rw.stage1 &&
          r.t >= w.barPaint! &&
          r.t < w.fullInstant! &&
          isClean(r)
      )
      .sort((a, b) => a.t - b.t);
    // the bridged spans, by classifyArm's own rule
    const spans: { t0: number; t1: number; delta: number }[] = [];
    for (let k = 1; k < clean.length; k += 1) {
      const a = clean[k - 1];
      const b = clean[k];
      if (Math.round((b.t - a.t) * trace.fps) > CLS_MAX_EVENT_GAP_FRAMES) {
        spans.push({ t0: a.t, t1: b.t, delta: b.fillRaw! - a.fillRaw! });
      }
    }
    const bridgedMass = spans.reduce((s, x) => s + x.delta, 0);
    const bridgedRealSec = spans.reduce((s, x) => s + (x.t1 - x.t0), 0);
    // fraction-map each bridged span onto the paired sim window (the only common axis)
    const simDur = simWin.endSec - simWin.startSec;
    const map = (t: number): number =>
      simWin.startSec + ((t - w.barPaint!) / w.durationSec) * simDur;
    let inGauge = 0;
    let inSec = 0;
    for (const s of spans) {
      const a = map(s.t0);
      const b = map(s.t1);
      inSec += b - a;
      for (const c of sched.credits) {
        if (c.sec > a && c.sec <= b) {
          inGauge += c.amount;
        }
      }
    }
    let allGauge = 0;
    for (const c of sched.credits) {
      if (c.sec > simWin.startSec && c.sec <= simWin.endSec) {
        allGauge += c.amount;
      }
    }
    const outGauge = allGauge - inGauge;
    const outSec = simDur - inSec;
    rows.push({
      id: w.id,
      durationSec: w.durationSec,
      totalBins: w.totalBins,
      cleanBins: w.cleanBins,
      cleanBinCoverage: w.cleanBinCoverage,
      droppedBinFraction: round(1 - w.cleanBinCoverage),
      bridgedCount: spans.length,
      bridgedMass: round(bridgedMass, 2),
      bridgedRealSec: round(bridgedRealSec),
      bridgedRealFraction: round(bridgedRealSec / w.durationSec),
      simGaugeInsideBridged: round(inGauge, 2),
      simSecInsideBridged: round(inSec),
      simGaugeOutsideBridged: round(outGauge, 2),
      simSecOutsideBridged: round(outSec),
      simRateInsideBridged: inSec > 1e-9 ? round(inGauge / inSec) : NaN,
      simRateOutsideBridged: outSec > 1e-9 ? round(outGauge / outSec) : NaN,
      bridgedCountMatches: spans.length === w.bridgedCount,
      bridgedMassMatches:
        Math.abs(round(bridgedMass, 2) - w.bridgedMass) < 0.02,
    });
  }
  const t = (f: (r: MarWindowDiag) => number): number =>
    rows.reduce((a, r) => a + f(r), 0);
  const inG = t((r) => r.simGaugeInsideBridged);
  const inS = t((r) => r.simSecInsideBridged);
  const outG = t((r) => r.simGaugeOutsideBridged);
  const outS = t((r) => r.simSecOutsideBridged);
  const inRate = inS > 1e-9 ? inG / inS : NaN;
  const outRate = outS > 1e-9 ? outG / outS : NaN;
  const sumRealDelta = arm.windows
    .filter((w) => w.usable)
    .reduce((a, w) => a + w.sumRealDelta, 0);
  return {
    comp: arm.comp,
    eMin: arm.eMin,
    usableWindows: rows.length,
    windows: rows,
    pooled: {
      bridgedCount: t((r) => r.bridgedCount),
      bridgedMass: round(
        t((r) => r.bridgedMass),
        2
      ),
      bridgedMassShareOfSumRealDelta: round(
        t((r) => r.bridgedMass) / Math.max(1e-9, sumRealDelta)
      ),
      bridgedRealSec: round(t((r) => r.bridgedRealSec)),
      bridgedRealFraction: round(
        t((r) => r.bridgedRealSec) /
          Math.max(
            1e-9,
            t((r) => r.durationSec)
          )
      ),
      droppedBinFractionMean: round(
        t((r) => r.droppedBinFraction) / Math.max(1, rows.length)
      ),
      simGaugeInsideBridged: round(inG, 2),
      simSecInsideBridged: round(inS),
      simGaugeOutsideBridged: round(outG, 2),
      simSecOutsideBridged: round(outS),
      simRateInsideBridged: round(inRate),
      simRateOutsideBridged: round(outRate),
      insideOverOutsideRateRatio: round(inRate / outRate),
    },
    selfCheck: {
      allWindowsReproduce: rows.every(
        (r) => r.bridgedCountMatches && r.bridgedMassMatches
      ),
    },
  };
}

// ---------------------------------------------------------------------------
// FULL-BURST DURATION — control C2 of the 2026-08-17 N3 third-arm packet.
//
// The drain-bar renderer UNDER-RENDERS: its last stretch is too narrow to register a column, so a
// nominal 10s Full Burst reads ~8.7s on the two committed 10s fixtures. A raw `fullWindows[]`
// duration is therefore a LOWER bound on the real Full Burst, never a measurement of it. The
// charging bar's first paint (`barPaint`, from the classification arm) is the matching UPPER bound:
// the widget cannot paint the charging bar until the Full Burst is over.
//
//   correctedRendered <= TRUE Full Burst duration <= correctedPaint
//
// Both bounds are corrected for guard 3A's late start (`guard3aResidual` > 0 means the drain-bar
// detector fired that many seconds AFTER the true Full Burst start, shortening both bounds).
//
// With `--calib-*` the same two bounds are measured on an arm whose Full Burst duration is KNOWN,
// and the two offsets are carried onto the target as point estimates. The calibration arm is an
// already-committed labeled artifact, so this is an independent method, not a re-derivation.
// ---------------------------------------------------------------------------
export interface FbDurationCycle {
  id: number;
  fbStart: number;
  guard3aResidual: number | null;
  qualifies: boolean;
  tailStitched: boolean;
  renderedEnd: number;
  renderedDuration: number;
  correctedRendered: number;
  barPaint: number | null;
  paintDuration: number | null;
  correctedPaint: number | null;
  /** does the pre-registered expectation lie inside [correctedRendered, correctedPaint]? */
  expectInBracket: boolean | null;
}

export interface FbDurationResult {
  fixture: string;
  cycles: FbDurationCycle[];
  medians: {
    correctedRendered: number;
    correctedPaint: number;
    correctedRenderedQualifyingOnly: number;
    correctedPaintQualifyingOnly: number;
  };
  calibration: {
    comp: string;
    knownFbSec: number;
    medianCorrectedRendered: number;
    medianCorrectedPaint: number;
    /** knownFbSec - medianCorrectedRendered: how much the render under-reads */
    renderDeficitSec: number;
    /** medianCorrectedPaint - knownFbSec: how long after FB end the charging bar paints */
    paintExcessSec: number;
  } | null;
  estimates: {
    fromRendered: number;
    fromPaint: number;
    midpoint: number;
  } | null;
  test: {
    expectSec: number;
    tolSec: number;
    band: [number, number];
    perCycleBracketContainsExpect: boolean[];
    cyclesWhereBracketExcludesExpect: number[];
    /** the literal reading: the raw rendered duration against the band */
    perCycleRenderedInBand: boolean[];
    /** the calibrated point estimate per cycle (rendered + calibration deficit) */
    perCycleCalibratedRendered: number[] | null;
    perCycleCalibratedInBand: boolean[] | null;
    /** the calibrated point estimate per cycle (paint - calibration excess) */
    perCycleCalibratedPaint: number[] | null;
    perCycleCalibratedPaintInBand: boolean[] | null;
  } | null;
}

function fbDurationOne(
  fx: TempoFixture,
  arm: { windows: ClsWindow[] }
): {
  cycles: FbDurationCycle[];
  medians: FbDurationResult['medians'];
} {
  const fxAny = fx as TempoFixture & {
    frameT?: number[];
    frameFill?: number[];
  };
  const frames = (fxAny.frameT ?? []).map((t, i) => ({
    videoT: t,
    fill: (fxAny.frameFill ?? [])[i],
  }));
  const rows = buildCycleTable({
    windows: fx.fullWindows,
    chains: fx.burstChains,
    frames,
  });
  const byId = new Map(arm.windows.map((w) => [w.id, w]));
  const cycles: FbDurationCycle[] = fx.fullWindows.map((w, i) => {
    const row = rows[i];
    const late = Math.max(0, row?.guard3aResidual ?? 0);
    const paint = byId.get(i + 1)?.barPaint ?? null;
    const correctedRendered = round(w.durationSec + late, 4);
    const correctedPaint =
      paint === null ? null : round(paint - w.start + late, 4);
    return {
      id: i + 1,
      fbStart: w.start,
      guard3aResidual: row?.guard3aResidual ?? null,
      qualifies: row?.qualifies ?? false,
      tailStitched: row?.tailStitched ?? false,
      renderedEnd: w.end,
      renderedDuration: w.durationSec,
      correctedRendered,
      barPaint: paint,
      paintDuration: paint === null ? null : round(paint - w.start, 4),
      correctedPaint,
      expectInBracket: null,
    };
  });
  const med = (xs: (number | null)[]): number =>
    median(xs.filter((x): x is number => x !== null && Number.isFinite(x)));
  const paired = cycles.filter((c) => c.correctedPaint !== null);
  const q = paired.filter((c) => c.qualifies);
  return {
    cycles,
    medians: {
      correctedRendered: round(med(paired.map((c) => c.correctedRendered))),
      correctedPaint: round(med(paired.map((c) => c.correctedPaint))),
      correctedRenderedQualifyingOnly: round(
        med(q.map((c) => c.correctedRendered))
      ),
      correctedPaintQualifyingOnly: round(med(q.map((c) => c.correctedPaint))),
    },
  };
}

export function fbDuration(opts: {
  fx: TempoFixture;
  fixturePath: string;
  arm: { windows: ClsWindow[] };
  calib?: {
    comp: string;
    fx: TempoFixture;
    arm: { windows: ClsWindow[] };
    knownFbSec: number;
  };
  expectSec?: number;
  tolSec?: number;
}): FbDurationResult {
  const { cycles, medians } = fbDurationOne(opts.fx, opts.arm);
  let calibration: FbDurationResult['calibration'] = null;
  let estimates: FbDurationResult['estimates'] = null;
  if (opts.calib) {
    const c = fbDurationOne(opts.calib.fx, opts.calib.arm);
    calibration = {
      comp: opts.calib.comp,
      knownFbSec: opts.calib.knownFbSec,
      medianCorrectedRendered: c.medians.correctedRendered,
      medianCorrectedPaint: c.medians.correctedPaint,
      renderDeficitSec: round(
        opts.calib.knownFbSec - c.medians.correctedRendered
      ),
      paintExcessSec: round(c.medians.correctedPaint - opts.calib.knownFbSec),
    };
    estimates = {
      fromRendered: round(
        medians.correctedRendered + calibration.renderDeficitSec
      ),
      fromPaint: round(medians.correctedPaint - calibration.paintExcessSec),
      midpoint: round(
        (medians.correctedRendered +
          calibration.renderDeficitSec +
          (medians.correctedPaint - calibration.paintExcessSec)) /
          2
      ),
    };
  }
  let test: FbDurationResult['test'] = null;
  if (opts.expectSec !== undefined) {
    const tol = opts.tolSec ?? 0.5;
    const lo = opts.expectSec - tol;
    const hi = opts.expectSec + tol;
    const paired = cycles.filter((c) => c.correctedPaint !== null);
    for (const c of paired) {
      c.expectInBracket =
        opts.expectSec >= c.correctedRendered &&
        opts.expectSec <= c.correctedPaint!;
    }
    const calRendered = calibration
      ? paired.map((c) =>
          round(c.correctedRendered + calibration!.renderDeficitSec)
        )
      : null;
    const calPaint = calibration
      ? paired.map((c) =>
          round(c.correctedPaint! - calibration!.paintExcessSec)
        )
      : null;
    test = {
      expectSec: opts.expectSec,
      tolSec: tol,
      band: [round(lo), round(hi)],
      perCycleBracketContainsExpect: paired.map((c) => c.expectInBracket!),
      cyclesWhereBracketExcludesExpect: paired
        .filter((c) => !c.expectInBracket)
        .map((c) => c.id),
      perCycleRenderedInBand: paired.map(
        (c) => c.correctedRendered >= lo && c.correctedRendered <= hi
      ),
      perCycleCalibratedRendered: calRendered,
      perCycleCalibratedInBand: calRendered
        ? calRendered.map((x) => x >= lo && x <= hi)
        : null,
      perCycleCalibratedPaint: calPaint,
      perCycleCalibratedPaintInBand: calPaint
        ? calPaint.map((x) => x >= lo && x <= hi)
        : null,
    };
  }
  return {
    fixture: opts.fixturePath,
    cycles,
    medians,
    calibration,
    estimates,
    test,
  };
}

// ---------------------------------------------------------------------------
// NOISE-CORRECTED CEILING RATE — control C6, the 2026-08-16 statistic, verbatim:
//
//   rate_corrected = (E - f * Q) / T
//     E = pooled event bins, Q = quiet bins = usableCleanBins - E,
//     T = clean-bin time = usableCleanBins * CLS_BIN_SEC,
//     f = the Wilson 95% one-sided upper false-event-bin rate.
//
// Reproduces `docs/probe-data/noise-corrected-ceiling-iron-sweep-2026-08-16.json` exactly from
// that arm's committed pooled block (pinned in scripts/tests/probe/), so applying it to a second
// arm is a replay of a gated statistic rather than a fresh derivation. The MAR-alternative
// full-window denominator is reported alongside, per that run's load-bearing caveat.
// ---------------------------------------------------------------------------
export interface NoiseCorrectedRate {
  comp: string;
  inputs: {
    eventBins: number;
    usableCleanBins: number;
    quietBins: number;
    cleanBinTimeSec: number;
    fullWindowDurationSec: number;
    ceilingBinsPerSec: number;
    ceilingFactor: number;
    thresholdBinsPerSec: number;
  };
  raw: { rate: number; vsThresholdPct: number; vsCeilingPct: number };
  corrected: Record<
    string,
    {
      falseRate: number;
      correctionBins: number;
      rate: number;
      vsThresholdPct: number;
      vsCeilingPct: number;
      aboveThreshold: boolean;
      aboveCeiling: boolean;
    }
  >;
  indifferencePoints: {
    /** f at which the corrected rate equals the 1.15x threshold */
    thresholdCutoff: number;
    /** f at which the corrected rate equals the raw ceiling */
    ceilingCutoff: number;
  };
  marAlternativeDenominator: {
    fullWindowDurationSec: number;
    rawRate: number;
    vsCeilingPct: number;
    aboveCeiling: boolean;
  };
}

export function noiseCorrectedRate(opts: {
  comp: string;
  pooled: Pick<
    ClsPooled,
    'eventBins' | 'usableCleanBins' | 'sumRealDurationSec'
  >;
  ceilingBinsPerSec: number;
  falseRates: Record<string, number>;
}): NoiseCorrectedRate {
  const E = opts.pooled.eventBins;
  const U = opts.pooled.usableCleanBins;
  const Q = U - E;
  const T = U * CLS_BIN_SEC;
  const C = opts.ceilingBinsPerSec;
  const thr = CLS_CEILING_FACTOR * C;
  const pct = (r: number, base: number): number =>
    round(((r - base) / base) * 100, 1);
  const corrected: NoiseCorrectedRate['corrected'] = {};
  for (const [label, f] of Object.entries(opts.falseRates)) {
    const r = (E - f * Q) / T;
    corrected[label] = {
      falseRate: f,
      correctionBins: round(f * Q, 4),
      rate: round(r),
      vsThresholdPct: pct(r, thr),
      vsCeilingPct: pct(r, C),
      aboveThreshold: r > thr,
      aboveCeiling: r > C,
    };
  }
  const rawRate = E / T;
  const fullRate = E / opts.pooled.sumRealDurationSec;
  return {
    comp: opts.comp,
    inputs: {
      eventBins: E,
      usableCleanBins: U,
      quietBins: Q,
      cleanBinTimeSec: round(T),
      fullWindowDurationSec: round(opts.pooled.sumRealDurationSec, 3),
      ceilingBinsPerSec: round(C),
      ceilingFactor: CLS_CEILING_FACTOR,
      thresholdBinsPerSec: round(thr),
    },
    raw: {
      rate: round(rawRate),
      vsThresholdPct: pct(rawRate, thr),
      vsCeilingPct: pct(rawRate, C),
    },
    corrected,
    indifferencePoints: {
      thresholdCutoff: round((E - thr * T) / Q, 5),
      ceilingCutoff: round((E - C * T) / Q, 5),
    },
    marAlternativeDenominator: {
      fullWindowDurationSec: round(opts.pooled.sumRealDurationSec, 3),
      rawRate: round(fullRate),
      vsCeilingPct: pct(fullRate, C),
      aboveCeiling: fullRate > C,
    },
  };
}

function noiseCorrectCli(): void {
  const armPath = arg('arm');
  if (!armPath) {
    throw new Error(
      'usage: fill-trace-compare.ts noise-correct --arm <arm artifact | classification json> ' +
        '[--comp "<name>"] [--false-rates 0.0055,0.0045] [--artifact <out>]'
    );
  }
  const arm = loadArm(armPath, arg('comp')) as ClsArm;
  if (!arm.pooled || !arm.ceiling) {
    throw new Error('noise-correct: arm has no pooled/ceiling block');
  }
  const rates = (arg('false-rates') ?? '0.0055,0.0045')
    .split(',')
    .map((x) => Number(x));
  const res = noiseCorrectedRate({
    comp: arm.comp,
    pooled: arm.pooled,
    ceilingBinsPerSec: arm.ceiling.ceilingBinsPerSec,
    falseRates: Object.fromEntries(
      rates.map((f) => [`corrected@${(f * 100).toFixed(2)}%`, f])
    ),
  });
  const artifact = arg('artifact');
  if (artifact) {
    writeFileSync(artifact, `${JSON.stringify(res, null, 1)}\n`);
    process.stdout.write(`wrote ${artifact}\n`);
  }
  process.stdout.write(`${JSON.stringify(res, null, 1)}\n`);
}

function loadArm(
  path: string,
  comp?: string
): { windows: ClsWindow[]; comp: string } {
  const doc = JSON.parse(readFileSync(path, 'utf8')) as
    ClsArm | { arms: Record<string, ClsArm> };
  if ('arms' in doc) {
    if (!comp || !doc.arms[comp]) {
      throw new Error(
        `${path} holds several arms — pass the comp name (have: ${Object.keys(doc.arms).join(', ')})`
      );
    }
    return doc.arms[comp];
  }
  return doc;
}

function fbDurationCli(): void {
  const fixture = arg('fixture');
  const armPath = arg('arm');
  if (!fixture || !armPath) {
    throw new Error(
      'usage: fill-trace-compare.ts fb-duration --fixture <tempo fixture> --arm <arm artifact> ' +
        '[--comp "<name>"] [--calib-fixture <fx> --calib-arm <artifact> --calib-comp "<name>" ' +
        '--calib-fb-sec 10] [--expect-sec 15 --tol-sec 0.5] [--artifact <out>]'
    );
  }
  const fx = JSON.parse(readFileSync(fixture, 'utf8')) as TempoFixture;
  const arm = loadArm(armPath, arg('comp'));
  const calibFx = arg('calib-fixture');
  const calibArm = arg('calib-arm');
  const calibComp = arg('calib-comp');
  const expectSec = arg('expect-sec');
  const res = fbDuration({
    fx,
    fixturePath: fixture,
    arm,
    calib:
      calibFx && calibArm && calibComp
        ? {
            comp: calibComp,
            fx: JSON.parse(readFileSync(calibFx, 'utf8')) as TempoFixture,
            arm: loadArm(calibArm, calibComp),
            knownFbSec:
              arg('calib-fb-sec') === undefined
                ? FB_SEC
                : numArg('calib-fb-sec', { positive: true }),
          }
        : undefined,
    expectSec:
      expectSec === undefined
        ? undefined
        : numArg('expect-sec', { positive: true }),
    // tol-sec 0 is legitimate (an exact-match tolerance), so it is checked as NON-NEGATIVE:
    // `positive: true` would reject a meaningful value that Number('0') previously accepted.
    tolSec:
      arg('tol-sec') === undefined
        ? undefined
        : numArg('tol-sec', { nonNegative: true }),
  });
  const artifact = arg('artifact');
  if (artifact) {
    writeFileSync(artifact, `${JSON.stringify(res, null, 1)}\n`);
    process.stdout.write(`wrote ${artifact}\n`);
  }
  process.stdout.write(`${JSON.stringify(res, null, 1)}\n`);
}

function closureDiagCli(): void {
  const armPath = arg('arm');
  const compName = arg('comp');
  if (!armPath) {
    throw new Error(
      'usage: fill-trace-compare.ts closure-diag --arm <arm artifact | habc classification json> ' +
        '[--comp "<name>"] [--artifact <out>]'
    );
  }
  const doc = JSON.parse(readFileSync(armPath, 'utf8')) as
    ClsArm | { arms: Record<string, ClsArm> };
  let arm: ClsArm;
  if ('arms' in doc) {
    if (!compName) {
      throw new Error(
        `closure-diag: ${armPath} holds several arms — pass --comp "<name>" (have: ${Object.keys(
          doc.arms
        ).join(', ')})`
      );
    }
    const found = doc.arms[compName];
    if (!found) {
      throw new Error(
        `closure-diag: no arm "${compName}" — have: ${Object.keys(doc.arms).join(', ')}`
      );
    }
    arm = found;
  } else {
    arm = doc;
  }
  const res = closureDiagnostic(arm);
  const artifact = arg('artifact');
  if (artifact) {
    writeFileSync(artifact, `${JSON.stringify(res, null, 1)}\n`);
    process.stdout.write(`wrote ${artifact}\n`);
  }
  process.stdout.write(`${JSON.stringify(res, null, 1)}\n`);
}

// NOTE: mar-diag accepts --e-min and echoes it, but every field it emits is eMin-INVARIANT — the
// bridged-span census runs before the eMin event rule, and the bin/coverage counts do not depend on
// it either. The flag exists so the diagnostic's label matches the classification it accompanies;
// it is NOT a sweepable parameter, and a caller expecting to sweep eMin here gets identical output.
function marDiagCli(): void {
  const schedPath = arg('schedule');
  const compName = arg('comp');
  const fixture = arg('fixture');
  const tracePath = arg('trace');
  if (!schedPath || !compName || !fixture || !tracePath) {
    throw new Error(
      'usage: fill-trace-compare.ts mar-diag --schedule <credit-schedule json> --comp "<name>" ' +
        '--fixture <windows json> --trace <reflagged trace/bundle> [--e-min 1.5] [--artifact <out>]'
    );
  }
  const rawScheds = JSON.parse(readFileSync(schedPath, 'utf8')) as
    SimSchedule | SimSchedule[];
  const scheds = Array.isArray(rawScheds) ? rawScheds : [rawScheds];
  const sched = scheds.find((s) => s.comp === compName);
  if (!sched) {
    throw new Error(
      `no comp "${compName}" in ${schedPath} — have: ${scheds.map((s) => s.comp).join(', ')}`
    );
  }
  const fx = JSON.parse(readFileSync(fixture, 'utf8')) as TempoFixture;
  const traceDoc = JSON.parse(readFileSync(tracePath, 'utf8')) as
    FillTrace | { trace: FillTrace };
  const trace = 'reads' in traceDoc ? traceDoc : traceDoc.trace;
  const res = marDiagnostic(fx, trace, sched, {
    eMin: Number(arg('e-min') ?? CLS_E_MIN),
    simComp: simComponents(sched),
    ceiling: simCeiling(sched),
  });
  const artifact = arg('artifact');
  if (artifact) {
    writeFileSync(artifact, `${JSON.stringify(res, null, 1)}\n`);
    process.stdout.write(`wrote ${artifact}\n`);
  }
  process.stdout.write(`${JSON.stringify(res, null, 1)}\n`);
}

function armPowerCli(): void {
  const clsPath = arg('classification');
  const candPath = arg('candidate-schedule');
  const shared = arg('shared');
  const refName = arg('ref-comp');
  const candName = arg('candidate-comp');
  if (!clsPath || !candPath || !shared || !refName || !candName) {
    throw new Error(
      'usage: fill-trace-compare.ts arm-power --classification <habc artifact> ' +
        '--ref-comp <name> --candidate-schedule <credit-schedule json> --candidate-comp <name> ' +
        '--shared <slug shared by both arms> --candidate-sim-refill-sec <n>'
    );
  }
  const cls = JSON.parse(readFileSync(clsPath, 'utf8')) as {
    arms: Record<
      string,
      {
        ceiling: { perUnit: { slug: string; maxRatePerSec: number }[] };
        branch: { realEventBinsPerSec: number };
        pooled: { usableCleanBins: number };
      }
    >;
  };
  const refArm = cls.arms[refName];
  if (!refArm) {
    throw new Error(
      `arm-power: no arm "${refName}" — have: ${Object.keys(cls.arms).join(', ')}`
    );
  }
  const rawCand = JSON.parse(readFileSync(candPath, 'utf8')) as
    SimSchedule | SimSchedule[];
  // Select the candidate BY NAME, never by position: silently taking entry [0] of a multi-comp
  // schedule would measure one comp and label the output with another's name. Sibling CLIs
  // (ceilingCli, marDiagCli) already select by name; this one did not.
  const candList = Array.isArray(rawCand) ? rawCand : [rawCand];
  const cand = candList.find((c) => c.comp === candName);
  if (!cand) {
    throw new Error(
      `arm-power: no comp "${candName}" in ${candPath} — have: ${candList
        .map((c) => c.comp)
        .join(', ')}`
    );
  }
  const candPerUnit = simCeiling(cand).perUnit.map((u) => ({
    slug: u.slug,
    maxRatePerSec: u.maxRatePerSec,
  }));
  // Reference clean-bin-time = usableCleanBins x binSec (the classification's own convention);
  // full-window duration is the MAR-alternative denominator carried alongside it.
  const refT = refArm.pooled.usableCleanBins * CLS_BIN_SEC;
  const refFull = Number(arg('ref-full-window-sec'));
  const result = armPower({
    sharedSlug: shared,
    refComp: refName,
    refCeilingPerUnit: refArm.ceiling.perUnit,
    refRate: refArm.branch.realEventBinsPerSec,
    refCleanBinTimeSec: refT,
    refFullWindowSec: Number.isFinite(refFull) ? refFull : refT,
    candComp: candName,
    candCeilingPerUnit: candPerUnit,
    candSimRefillSec: numArg('candidate-sim-refill-sec', { positive: true }),
  });
  const artifact = arg('artifact');
  if (artifact) {
    writeFileSync(artifact, `${JSON.stringify(result, null, 1)}\n`);
    process.stdout.write(`wrote ${artifact}\n`);
  }
  process.stdout.write(`${JSON.stringify(result, null, 1)}\n`);
}

function main(): void {
  const mode = process.argv[2];
  if (mode === 'solo-rate') {
    soloRateCli();
    return;
  }
  if (mode === 'ceiling') {
    ceilingCli();
    return;
  }
  if (mode === 'arm-power') {
    armPowerCli();
    return;
  }
  if (mode === 'closure-diag') {
    closureDiagCli();
    return;
  }
  if (mode === 'mar-diag') {
    marDiagCli();
    return;
  }
  if (mode === 'fb-duration') {
    fbDurationCli();
    return;
  }
  if (mode === 'noise-correct') {
    noiseCorrectCli();
    return;
  }
  if (mode === 'noise-solo') {
    noiseSoloCli();
    return;
  }
  if (mode === 'noise-solo2') {
    noiseSolo2Cli();
    return;
  }
  if (mode === 'classify') {
    classifyCli();
    return;
  }
  if (mode === 'opening') {
    openingCli();
    return;
  }
  if (mode === 'tables') {
    process.stdout.write(
      `${tables(process.argv.slice(3).filter((a) => !a.startsWith('--')))}\n`
    );
    return;
  }
  const fixture = arg('fixture');
  if (!fixture) {
    throw new Error('--fixture <tempo-cycle json> is required');
  }
  const fx = JSON.parse(readFileSync(fixture, 'utf8')) as TempoFixture;

  if (mode === 'spans') {
    process.stdout.write(
      `${spansFor(fx, Number(arg('pad-pre') ?? 1.5), Number(arg('pad-post') ?? 0.8))}\n`
    );
    return;
  }
  if (mode !== 'analyze') {
    throw new Error(
      'usage: fill-trace-compare.ts <spans|analyze> --fixture ...'
    );
  }

  const realPath = arg('real');
  const schedPath = arg('schedule');
  const compName = arg('comp');
  if (!realPath || !schedPath || !compName) {
    throw new Error(
      'analyze needs --real <trace json> --schedule <credit-schedule json> --comp "<name>"'
    );
  }
  const trace = JSON.parse(readFileSync(realPath, 'utf8')) as FillTrace;
  const scheds = JSON.parse(readFileSync(schedPath, 'utf8')) as SimSchedule[];
  const sched = scheds.find((s) => s.comp === compName);
  if (!sched) {
    throw new Error(
      `no comp "${compName}" in ${schedPath} — have: ${scheds.map((s) => s.comp).join(', ')}`
    );
  }

  const res = analyzeComp(fx, trace, sched);
  const out = arg('out');
  if (out) {
    writeFileSync(out, `${JSON.stringify(res, null, 1)}\n`);
    process.stdout.write(`wrote ${out}\n`);
  }
  const bundle = arg('bundle');
  if (bundle) {
    // A SELF-CONTAINED replay: docs/probes/ is gitignored, so without this the measurement could
    // never be re-run. `scripts/tests/probe/fill-trace-compare.test.ts` replays each bundle and
    // asserts analyzeComp still reproduces the committed `result` byte-for-byte.
    writeFileSync(
      bundle,
      `${JSON.stringify(
        {
          _note:
            'Self-contained replay bundle for the 2026-08-14 refill-window fill-trace measurement ' +
            '(docs/handoffs/2026-08-14-fill-trace-preop-packet.md). Regenerate: see `commands`. ' +
            'Replayed by scripts/tests/probe/fill-trace-compare.test.ts.',
          fixture,
          commands: {
            frames:
              'ffmpeg -v error -i <video> -vf "fps=60,crop=280:70:2342:465" fine/f_%05d.png  ' +
              '(and fps=5 into lock/ for the widget lock)',
            reader:
              'scripts/probe/gauge-fill.py --team --frames fine --fps 60 --lock-frames lock ' +
              '--crop 280:70:2342:465 --spans "$(npx tsx scripts/probe/fill-trace-compare.ts spans --fixture <fixture>)"',
            schedule:
              'npx tsx scripts/battery/fb-count-matrix.ts --credit-schedule --json ' +
              `--comp=${JSON.stringify(compName)}`,
            analyze:
              'npx tsx scripts/probe/fill-trace-compare.ts analyze --fixture <fixture> --real <trace> ' +
              '--schedule <schedule> --comp <name> --bundle <this file>',
          },
          simSchedule: {
            comp: sched.comp,
            slugs: sched.slugs,
            focusSlug: sched.focusSlug,
            windows: sched.windows,
            credits: sched.credits,
            unreconstructed: sched.unreconstructed,
            checks: {
              endpointOk: sched.checks.endpointOk,
              truncatedOk: sched.checks.truncatedOk,
              dbgGauge: { ok: sched.checks.dbgGauge.ok },
            },
          },
          trace: {
            mode: trace.mode,
            fps: trace.fps,
            bar: trace.bar,
            reads: trace.reads,
          },
          result: res,
        },
        null,
        1
      )}\n`
    );
    process.stdout.write(`wrote ${bundle}\n`);
  }
  process.stdout.write(
    `\n===== FILL-TRACE COMPARE — ${res.comp} =====\n` +
      `video ${res.video}\nroster ${res.slugs.join(' / ')}  focus=${res.focusSlug}\n` +
      `bar lock ${trace.bar.widthPx}px rows ${trace.bar.rows.join('-')} x ${trace.bar.x0}-${trace.bar.x1}\n` +
      (res.amountsTrusted
        ? ''
        : `\n⚠⚠ CREDIT-SCHEDULE AMOUNTS NOT TRUSTED ON THIS COMP — every rate/R/histogram/surplus\n` +
          `   figure below is VOID (NaN). Window bounds and the closure arithmetic are unaffected.\n` +
          res.scheduleWarnings.map((w) => `   - ${w}`).join('\n') +
          '\n') +
      '\n' +
      `win  window(s)      whole visible visFrac clean%  realRate  simRate      R | rWhole rVisible | rOpen\n` +
      res.windows
        .map(
          (w) =>
            `${String(w.id).padStart(3)}  ${String(round(w.fbEnd, 2)).padStart(6)}-${String(round(w.fullInstant ?? NaN, 2)).padEnd(6)} ` +
            `${String(w.wholeWindowSec).padStart(5)} ${String(w.visibleSec).padStart(7)} ${String(w.visibleFraction).padStart(6)} ${String(round(w.cleanFramePct * 100, 0)).padStart(5)}  ` +
            `${String(w.realRate).padStart(8)}  ${String(w.simRate).padStart(7)}  ${String(w.R).padStart(5)} | ` +
            `${String(w.rWhole).padStart(6)} ${String(w.rVisible).padStart(8)} | ` +
            `${String(w.rOpening).padStart(5)}  ${w.status}${w.reason ? ` (${w.reason})` : ''}`
        )
        .join('\n') +
      `\n\nreadable ${res.readable.length}/${res.windows.length}\n` +
      `  [PRE-COMMITTED] median R (visible span, fraction-mapped, [fbEnd,full] anchor) ${res.medianR}   IQR ${res.rIqr.iqr} [${res.rIqr.p25}, ${res.rIqr.p75}]\n` +
      `  median R (whole window, [fbEnd,full] anchor)   ${res.medianRWhole}   IQR ${res.rWholeIqr.iqr} [${res.rWholeIqr.p25}, ${res.rWholeIqr.p75}]\n` +
      `  median R (whole window, [barPaint,full] anchor) ${res.medianRVisible}   IQR ${res.rVisibleIqr.iqr} [${res.rVisibleIqr.p25}, ${res.rVisibleIqr.p75}]\n` +
      `  median R (reader-blind opening)          ${res.medianROpening}\n` +
      `  Pearson(R, visibleFraction) ${res.rVsVisibleFraction}\n` +
      `closure (R3): real cycle ${res.closure.realCycleSec}s vs sim ${res.closure.simCycleSec}s → gap ${res.closure.gapPerCycle}s/cycle\n` +
      `  refill  real ${res.closure.realRefillSec}s vs sim ${res.closure.simRefillSec}s → ${res.closure.refillDelta}s\n` +
      `  ladder  real ${res.closure.realLadderSec}s vs sim ${res.closure.simLadderSec}s → ${res.closure.ladderDelta}s\n` +
      `  residual ${res.closure.residual}s   closed ${(res.closure.closedShare * 100).toFixed(1)}%\n` +
      `real events/s ${res.realEventRate} vs sim ${res.simEventRate}\n` +
      `real event sizes ${JSON.stringify(res.realEventQuantiles)}\n` +
      `sim  event sizes ${JSON.stringify(res.simEventQuantiles)}\n` +
      `bridged ${JSON.stringify(res.bridged)}\n` +
      `surplus: ${res.surplusShare} of real gauge; ${res.surplusEventShare} of events off-schedule ` +
      `vs ${res.chanceOffScheduleShare} expected by chance alignment\n`
  );
}

if (
  process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].split('/').pop() ?? '')
) {
  main();
}
