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
export interface TempoFixture {
  source: { video: string; fps: number; command: string };
  fullWindows: {
    start: number;
    end: number;
    durationSec: number;
    partial: boolean;
  }[];
  burstChains: {
    stage1: number | null;
    stage2: number | null;
    stage3: number | null;
  }[];
  expected?: { fullBursts?: number; steadyStateMean?: number };
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
  // branch 1: H-C ceiling test (does not read the O/S decomposition)
  if (pooled.realEventBinsPerSec > thr) {
    out.branch = 'H-C';
    out.hcShareOfRate = round(
      (pooled.realEventBinsPerSec - ceiling.ceilingBinsPerSec) /
        pooled.realEventBinsPerSec,
      4
    );
    out.demotedCandidate = candidate;
    out.detail =
      `real event rate ${pooled.realEventBinsPerSec}/s > ${CLS_CEILING_FACTOR} x ceiling ` +
      `${ceiling.ceilingBinsPerSec}/s; H-C share of rate ${out.hcShareOfRate}` +
      (candidate
        ? `; demoted same-arm candidate remainder (descriptive only): ${candidate}`
        : '');
    return out;
  }
  // branch 2: NO-IN-WINDOW-EXCESS (pre-op R2)
  if (
    inb(O, bands.noExcess) &&
    inb(S, bands.noExcess) &&
    closureResidual <= CLS_MAX_CLOSURE_RESIDUAL
  ) {
    out.branch = 'NO-IN-WINDOW-EXCESS';
    out.detail = `O ${O} and S ${S} in [${bands.noExcess}), closure residual ${closureResidual} <= ${CLS_MAX_CLOSURE_RESIDUAL}`;
    return out;
  }
  // §C: a decomposition that does not close is INCONCLUSIVE regardless of branches 3-4
  if (closureResidual > CLS_MAX_CLOSURE_RESIDUAL) {
    out.branch = 'MIXED/INCONCLUSIVE';
    out.detail = `closure residual ${closureResidual} > ${CLS_MAX_CLOSURE_RESIDUAL}: the O x S decomposition does not close (O ${O}, S ${S}, rho ${pooled.rho})`;
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

function main(): void {
  const mode = process.argv[2];
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
