// ============================================================================
// GAUGE-MAGNITUDE — the three pre-registered per-pull burst-gauge magnitude estimators
// (E1 count-to-fill, E2 telescoping run-mean, E3 run-height linearity) plus the pinned
// departure-classification rule, run over ALREADY-COMMITTED gauge-fill traces.
//
// Pre-op packet of record:
//   docs/handoffs/2026-08-17-anis-star-solo-magnitude-preop-packet.md
//   (APPROVED-WITH-REVISIONS, Fable pre-op 2026-08-17; revisions R1-R6 + NR1-NR4 executed inline)
//
// Run it:
//   npx tsx scripts/probe/gauge-magnitude.ts \
//     --out docs/probe-data/anis-star-solo-magnitude-2026-08-17.json
//
// INPUTS — both already on disk, no footage is read:
//   docs/probe-data/anis-star-solo2-gauge.json        (solo #2; series stored changes-only)
//   docs/probe-data/anis-star-solo-a3-gauge-reread.json (A3, independent footage + calibration)
//
// WHAT IT IS NOT. This tool computes ESTIMATOR OUTPUTS and applies the packet's pre-committed
// decision rule mechanically. It attaches NO verdict and NO opinion: the artifact it writes is
// verdict-free by construction, and the clause the rule selects is reported as an arithmetic
// fact ("the rule as written selects clause N because ...") for the driver/judge to weigh.
//
// METHOD ORDER IS LOAD-BEARING and is preserved in the emitted artifact's key order:
//   instrumentGate -> runInventory -> departureClassification -> controls -> E1/E2/E3
//   -> decisionRuleApplication -> candidateCheck (strictly last).
// ============================================================================
import { readFileSync, writeFileSync } from 'node:fs';

import { expandChangesOnly } from './fill-trace-compare.js';

// ---------------------------------------------------------------------------
// PINNED CONSTANTS (packet section "Estimators"; none of these is fitted here)
// ---------------------------------------------------------------------------
/** Both recordings' readers independently locked a 138 px bar; one render column = this many pp. */
export const BAR_WIDTH_PX = 138;
export const COLUMN_PP = 100 / BAR_WIDTH_PX;
/** [NR1] departure radius = 3 render columns. The 2-column value is the MANDATORY sensitivity. */
export const DEPARTURE_RADIUS_PRIMARY_PP = 2.175;
export const DEPARTURE_RADIUS_SENSITIVITY_PP = 1.45;
/** [R4] a plateau endpoint is read >= 6 settled frames after the last `fillRaw` change. */
export const SETTLE_FRAMES = 6;
/** Committed binding event threshold (solo2 artifact `result.params.bindingThreshold`). */
export const EVENT_MIN_PP = 1.41;
/** The shipped engine's solo per-pull credit (packet P3): (280 x 2.5 + 280) x 1.06 / 100. */
export const H_MODEL_PP = 10.388;
export const H_ELEVATED_PP: [number, number] = [10.96, 12.2];
export const H_LEGACY_PP = 8.9;
/** Uniform quantization over one column: sd = width/sqrt(12). */
export const QUANT_SD_PP = 0.725 / Math.sqrt(12);
export const Z95 = 1.96;
/** Measured fire->credit latency on both recordings (~0.30 s). */
export const FIRE_TO_CREDIT_SEC = 0.3;
/** Hand montage cells are sampled at 3 fps, so an ammo bracket carries this much slack. */
export const MONTAGE_CELL_SEC = 1 / 3;

export const SOLO2_ARTIFACT = 'docs/probe-data/anis-star-solo2-gauge.json';
export const A3_ARTIFACT =
  'docs/probe-data/anis-star-solo-a3-gauge-reread.json';

/**
 * A3 carries no machine-readable dirty-span list (it predates the `offCurve` flag and the
 * noise-run `result` block). Its ONE artifact span is declared in prose at
 * `perPullTable[6].reason`: "a screen-tint artifact span corrupts the reader t=16.0-17.97".
 * Pinned here with that citation so the tool is re-runnable; it is the only hand-carried span.
 */
export const A3_DIRTY_SPANS: [number, number][] = [[16.0, 17.97]];

/**
 * W4p7's credit is SMEARED across a dirty span, so [NR4] requires it to enter E1 as the full
 * rendered ambiguity interval. The artifact's own committed read is "~+8.0..+8.7"
 * (`perPullTable[W4 p7].subSteps`); the mechanical settled-plateau read (74.6 -> 83.3) lands on
 * its upper end. Both bounds are used, by interval arithmetic.
 */
export const W4P7_SMEARED_INTERVAL: [number, number] = [8.0, 8.7];

/**
 * W2's post-opener level plateau (6.5) overlaps the committed exclusion span by one bin, so its
 * value carries the artifact's declared settle ambiguity ("settle reads 8.0->7.2->6.5").
 * Entered as an interval per [NR4].
 */
export const W2_POST_OPENER_INTERVAL: [number, number] = [6.5, 7.2];

/** Student-t 97.5 % quantiles, df 1..12 (E3 slope CI; k runs => df = k - 2). */
const T975: Record<number, number> = {
  1: 12.706,
  2: 4.303,
  3: 3.182,
  4: 2.776,
  5: 2.571,
  6: 2.447,
  7: 2.365,
  8: 2.306,
  9: 2.262,
  10: 2.228,
  11: 2.201,
  12: 2.179,
};

// ---------------------------------------------------------------------------
// types
// ---------------------------------------------------------------------------
export interface TraceRead {
  t: number;
  state: string;
  fillRaw: number | null;
}
export interface Plateau {
  t0: number;
  t1: number;
  i0: number;
  i1: number;
  frames: number;
  level: number;
  /** overlaps a dirty span at any frame */
  dirty: boolean;
}
export type TransitionKind = 'CLEAN' | 'OBSCURED' | 'WOBBLE' | 'DROP';
export interface Transition {
  from: number;
  to: number;
  delta: number;
  kind: TransitionKind;
  creditAtSec: number;
  beforePlateau: Plateau;
  afterPlateau: Plateau;
  gapFrames: number;
  gapDirty: boolean;
  reason: string;
}
export interface Interval {
  lo: number;
  hi: number;
}

// ---------------------------------------------------------------------------
// ladder construction — the run inventory, rebuilt from the TRACE (not the summary tables)
// ---------------------------------------------------------------------------
function inSpans(t: number, spans: [number, number][]): boolean {
  return spans.some(([a, b]) => t >= a - 1e-9 && t <= b + 1e-9);
}

/**
 * Contiguous spans of `offCurve`-flagged reads inside the measured windows, taken from the
 * artifact's committed flag list.
 */
export function offCurveSpans(times: number[]): [number, number][] {
  if (times.length === 0) {
    return [];
  }
  const ts = [...times].sort((a, b) => a - b);
  const out: [number, number][] = [];
  let start = ts[0];
  let prev = ts[0];
  for (const t of ts.slice(1)) {
    if (t - prev > 0.05) {
      out.push([start, prev]);
      start = t;
    }
    prev = t;
  }
  out.push([start, prev]);
  return out;
}

/**
 * SETTLED plateaus: maximal runs of constant `fillRaw` in the `filling` state that last at least
 * SETTLE_FRAMES + 1 frames, i.e. the level is still the same >= 6 frames after the change that
 * produced it ([R4] plateau-read discipline).
 *
 * DIRTINESS is tested at the plateau's READ POINT — the frame SETTLE_FRAMES after its first —
 * because that is the frame [R4] says the endpoint is read at. (The stricter "any frame of the
 * plateau overlaps a dirty span" variant is reported as a sensitivity: it differs on exactly two
 * plateaus, W2's 6.5 and W4's 63.0, each of which overlaps a committed exclusion span by ONE bin,
 * and it is the reason the artifact of record calls the pulls anchored on them "conditional".)
 */
export function settledPlateaus(
  reads: TraceRead[],
  window: [number, number],
  dirty: [number, number][],
  dirtyMode: 'read-point' | 'any-frame' = 'read-point'
): Plateau[] {
  const out: Plateau[] = [];
  let i = 0;
  while (i < reads.length) {
    const r = reads[i];
    if (
      r.t < window[0] - 1e-9 ||
      r.t > window[1] + 1e-9 ||
      r.state !== 'filling' ||
      r.fillRaw === null
    ) {
      i += 1;
      continue;
    }
    let j = i;
    while (
      j + 1 < reads.length &&
      reads[j + 1].t <= window[1] + 1e-9 &&
      reads[j + 1].state === 'filling' &&
      reads[j + 1].fillRaw === r.fillRaw
    ) {
      j += 1;
    }
    const frames = j - i + 1;
    if (frames >= SETTLE_FRAMES + 1) {
      let isDirty = false;
      if (dirtyMode === 'any-frame') {
        for (let x = i; x <= j; x += 1) {
          if (inSpans(reads[x].t, dirty)) {
            isDirty = true;
          }
        }
      } else {
        isDirty = inSpans(reads[i + SETTLE_FRAMES].t, dirty);
      }
      out.push({
        t0: reads[i].t,
        t1: reads[j].t,
        i0: i,
        i1: j,
        frames,
        level: r.fillRaw,
        dirty: isDirty,
      });
    }
    i = j + 1;
  }
  return out;
}

/**
 * Transitions between consecutive settled plateaus.
 *
 * CLEAN  — a rise of at least EVENT_MIN_PP whose gap frames are free of dirty-span reads, never
 *          dip more than one render column below the before-level, and never rise above the
 *          after-level. (The one-column tolerance is what lets the documented plateau wobble
 *          through while still catching the flash excursions.)
 * OBSCURED — a rise that fails any of those; it may cover more than one pull.
 * WOBBLE — |delta| below EVENT_MIN_PP; not a credit. The later plateau becomes the current level,
 *          which is exactly the packet's pre-committed boundary attribution "a column belongs to
 *          the pull whose credit instant most recently preceded it".
 * DROP   — a fall of at least EVENT_MIN_PP (always an artifact inside a refill window).
 */
export function transitions(
  plateaus: Plateau[],
  reads: TraceRead[],
  dirty: [number, number][]
): Transition[] {
  const out: Transition[] = [];
  for (let k = 0; k + 1 < plateaus.length; k += 1) {
    const a = plateaus[k];
    const b = plateaus[k + 1];
    const delta = Math.round((b.level - a.level) * 100) / 100;
    const gap: TraceRead[] = [];
    for (let x = a.i1 + 1; x < b.i0; x += 1) {
      gap.push(reads[x]);
    }
    const gapDirty = gap.some((g) => inSpans(g.t, dirty));
    const gapVals = gap
      .map((g) => g.fillRaw)
      .filter((v): v is number => v !== null);
    let kind: TransitionKind;
    let reason: string;
    if (Math.abs(delta) < EVENT_MIN_PP) {
      kind = 'WOBBLE';
      reason = 'sub-threshold level change (render wobble), not a credit';
    } else if (delta < 0) {
      kind = 'DROP';
      reason = 'gauge fell inside a refill window — render artifact';
    } else if (a.dirty || b.dirty) {
      kind = 'OBSCURED';
      reason = `endpoint plateau overlaps a dirty span (${a.dirty ? 'before' : 'after'})`;
    } else if (gapDirty) {
      kind = 'OBSCURED';
      reason = 'gap frames overlap a dirty span';
    } else if (
      gapVals.length > 0 &&
      Math.min(...gapVals) < a.level - COLUMN_PP - 1e-9
    ) {
      kind = 'OBSCURED';
      reason = 'gap dips more than one render column below the before-level';
    } else if (gapVals.length > 0 && Math.max(...gapVals) > b.level + 1e-9) {
      kind = 'OBSCURED';
      reason = 'gap overshoots the after-level (flash/ramp excursion)';
    } else {
      kind = 'CLEAN';
      reason = 'settled before- and after-plateaus, monotone gap';
    }
    out.push({
      from: a.level,
      to: b.level,
      delta,
      kind,
      creditAtSec: b.t0,
      beforePlateau: a,
      afterPlateau: b,
      gapFrames: gap.length,
      gapDirty,
      reason,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// [R3]/[NR1] departure classification — computed BEFORE any estimator
// ---------------------------------------------------------------------------
export function median(xs: number[]): number {
  if (xs.length === 0) {
    return NaN;
  }
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export interface DepartureCall {
  label: string;
  creditAtSec: number | null;
  value: number | [number, number];
  distancePp: number | [number, number];
  departing: boolean;
  ambiguous: boolean;
}

/**
 * `DEPARTING <=> |delta - median_all| > radius`, symmetric, stated in render-grid units and
 * referencing no hypothesis value. An interval-valued credit is DEPARTING only if its WHOLE
 * interval lies outside the keep-band, and is flagged ambiguous if it straddles the boundary.
 */
export function classifyDeparture(
  label: string,
  creditAtSec: number | null,
  value: number | [number, number],
  medianAll: number,
  radius: number
): DepartureCall {
  if (typeof value === 'number') {
    const d = Math.abs(value - medianAll);
    return {
      label,
      creditAtSec,
      value,
      distancePp: d,
      departing: d > radius,
      ambiguous: false,
    };
  }
  const dLo = Math.abs(value[0] - medianAll);
  const dHi = Math.abs(value[1] - medianAll);
  const allOut = value[0] > medianAll + radius || value[1] < medianAll - radius;
  const allIn =
    value[0] >= medianAll - radius && value[1] <= medianAll + radius;
  return {
    label,
    creditAtSec,
    value,
    distancePp: [Math.min(dLo, dHi), Math.max(dLo, dHi)],
    departing: allOut,
    ambiguous: !allOut && !allIn,
  };
}

// ---------------------------------------------------------------------------
// E1 — anomaly-aware count-to-fill (interval arithmetic per [NR4])
// ---------------------------------------------------------------------------
export interface E1Input {
  window: string;
  /** pull count from window-open to the fill cue, hand-montage-verified where available */
  K: number;
  /** which cue defined K — [NR3] */
  kCue: 'game-driven' | 'rendered-100';
  kCueEvidence: string;
  /** settled rendered level after the opener's credit (absorbs baseline + opener exactly) */
  postOpenerLevel: number | [number, number];
  /** departing credits, as rendered; intervals allowed */
  anomalies: (number | [number, number])[];
  montageVerified: boolean;
}
export interface E1Result extends E1Input {
  nAnomalous: number;
  m: number;
  residualCapacity: Interval;
  interval: Interval;
  excludesHModel: boolean;
  /** the exclusion margin in pp and in render columns (negative = contains H_MODEL) */
  exclusionMarginPp: number;
  exclusionMarginColumns: number;
  wellPosed: boolean;
  note: string;
}

function asInterval(v: number | [number, number]): Interval {
  return typeof v === 'number' ? { lo: v, hi: v } : { lo: v[0], hi: v[1] };
}

export function e1(input: E1Input, wellPosed = true, note = ''): E1Result {
  const post = asInterval(input.postOpenerLevel);
  const anoms = input.anomalies.map(asInterval);
  const sumLo = anoms.reduce((s, a) => s + a.lo, 0);
  const sumHi = anoms.reduce((s, a) => s + a.hi, 0);
  // residual = 100 - postOpenerLevel - sum(anomalies); interval arithmetic (subtraction flips)
  const residual: Interval = {
    lo: 100 - post.hi - sumHi,
    hi: 100 - post.lo - sumLo,
  };
  const m = input.K - 1 - anoms.length;
  const interval: Interval = { lo: residual.lo / m, hi: residual.hi / (m - 1) };
  const excludes = H_MODEL_PP < interval.lo || H_MODEL_PP >= interval.hi;
  const marginPp = interval.lo - H_MODEL_PP;
  return {
    ...input,
    nAnomalous: anoms.length,
    m,
    residualCapacity: residual,
    interval,
    excludesHModel: excludes,
    exclusionMarginPp: Math.round(marginPp * 1e6) / 1e6,
    exclusionMarginColumns: Math.round((marginPp / COLUMN_PP) * 1e6) / 1e6,
    wellPosed,
    note,
  };
}

// ---------------------------------------------------------------------------
// E2 — telescoping run-mean
// ---------------------------------------------------------------------------
export interface E2Run {
  window: string;
  label: string;
  pulls: number;
  levelBefore: number;
  levelAfter: number;
  tBefore: number;
  tAfter: number;
  beforeFrames: number;
  afterFrames: number;
  /** the run starts at a plateau that is the after-side of an OBSCURED transition */
  conditionalStart: boolean;
  pHat: number;
  seQuant: number;
  binsInRun: number;
  meanHeight: number;
  creditInstants: number[];
}

export function buildRun(
  window: string,
  label: string,
  before: Plateau,
  after: Plateau,
  pulls: number,
  conditionalStart: boolean,
  creditInstants: number[]
): E2Run {
  const pHat = (after.level - before.level) / pulls;
  return {
    window,
    label,
    pulls,
    levelBefore: before.level,
    levelAfter: after.level,
    tBefore: before.t0,
    tAfter: after.t0,
    beforeFrames: before.frames,
    afterFrames: after.frames,
    conditionalStart,
    pHat: Math.round(pHat * 1e6) / 1e6,
    seQuant: Math.round(((Math.SQRT2 * QUANT_SD_PP) / pulls) * 1e6) / 1e6,
    binsInRun: Math.round((after.t0 - before.t0) * 30),
    meanHeight: (before.level + after.level) / 2,
    creditInstants,
  };
}

export interface PoolResult {
  k: number;
  runs: string[];
  pooled: number;
  seQuantPooled: number;
  empiricalScatter: number | null;
  questionBInflation: number;
  sePooled: number;
  seDriver: 'quantization' | 'empirical-scatter' | 'question-B-inflation';
  ci95: Interval;
  excludesHModel: boolean;
  scatterOverQuantRatio: number | null;
}

/**
 * [R4] SE_pooled = max(inverse-variance pool of SE_quant, empirical scatter sd/sqrt(k),
 * Question-B false-event inflation term). All three components are reported separately.
 *
 * The packet MANDATED the inflation term but did not pin its formula. The construction used here
 * is stated so it can be audited and is deliberately conservative:
 *     inflation_run = EVENT_MIN_PP x (wilsonUpper95 x binsInRun) / pulls
 * i.e. the 95 % one-sided upper bound on the false-event RATE (from the committed Question-B
 * block, measured on this same recording and regime) times the run's bin count, valued at the
 * smallest delta that would register as an event. The observed false-event set is EMPTY, so no
 * larger magnitude is evidenced. Runs are combined with the same inverse-variance weights.
 */
export function poolE2(runs: E2Run[], wilsonUpper: number): PoolResult {
  const w = runs.map((r) => 1 / (r.seQuant * r.seQuant));
  const wsum = w.reduce((a, b) => a + b, 0);
  const pooled = runs.reduce((s, r, i) => s + r.pHat * w[i], 0) / wsum;
  const seQuantPooled = 1 / Math.sqrt(wsum);
  let scatter: number | null = null;
  if (runs.length >= 2) {
    const mean = runs.reduce((s, r) => s + r.pHat, 0) / runs.length;
    const varr =
      runs.reduce((s, r) => s + (r.pHat - mean) * (r.pHat - mean), 0) /
      (runs.length - 1);
    scatter = Math.sqrt(varr) / Math.sqrt(runs.length);
  }
  const inflPer = runs.map(
    (r) => (EVENT_MIN_PP * (wilsonUpper * r.binsInRun)) / r.pulls
  );
  const inflation = inflPer.reduce((s, v, i) => s + v * w[i], 0) / wsum;
  const components: [PoolResult['seDriver'], number][] = [
    ['quantization', seQuantPooled],
    ['empirical-scatter', scatter ?? 0],
    ['question-B-inflation', inflation],
  ];
  components.sort((a, b) => b[1] - a[1]);
  const sePooled = components[0][1];
  const ci: Interval = {
    lo: pooled - Z95 * sePooled,
    hi: pooled + Z95 * sePooled,
  };
  return {
    k: runs.length,
    runs: runs.map((r) => r.label),
    pooled: Math.round(pooled * 1e6) / 1e6,
    seQuantPooled: Math.round(seQuantPooled * 1e6) / 1e6,
    empiricalScatter: scatter === null ? null : Math.round(scatter * 1e6) / 1e6,
    questionBInflation: Math.round(inflation * 1e6) / 1e6,
    sePooled: Math.round(sePooled * 1e6) / 1e6,
    seDriver: components[0][0],
    ci95: {
      lo: Math.round(ci.lo * 1e6) / 1e6,
      hi: Math.round(ci.hi * 1e6) / 1e6,
    },
    excludesHModel: H_MODEL_PP < ci.lo || H_MODEL_PP > ci.hi,
    scatterOverQuantRatio:
      scatter === null
        ? null
        : Math.round((scatter / seQuantPooled) * 1e4) / 1e4,
  };
}

// ---------------------------------------------------------------------------
// E3 — run-height linearity (evidentially capped by [R6])
// ---------------------------------------------------------------------------
export interface E3Result {
  k: number;
  distinctHeights: number;
  slope: number;
  seSlope: number;
  df: number;
  tCrit: number;
  ci95: Interval;
  containsZero: boolean;
  statement: string;
}

export function e3(runs: E2Run[]): E3Result | null {
  if (runs.length < 3) {
    return null;
  }
  const xs = runs.map((r) => r.meanHeight);
  const ys = runs.map((r) => r.pHat);
  const n = runs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  const sxy = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
  const sxx = xs.reduce((s, x) => s + (x - mx) * (x - mx), 0);
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  const sse = ys.reduce((s, y, i) => {
    const e = y - (intercept + slope * xs[i]);
    return s + e * e;
  }, 0);
  const df = n - 2;
  const s2 = df > 0 ? sse / df : NaN;
  const seSlope = Math.sqrt(s2 / sxx);
  const tCrit = T975[df] ?? 1.96;
  const ci: Interval = {
    lo: slope - tCrit * seSlope,
    hi: slope + tCrit * seSlope,
  };
  const containsZero = ci.lo <= 0 && ci.hi >= 0;
  const distinct = new Set(xs.map((x) => Math.round(x * 100))).size;
  return {
    k: n,
    distinctHeights: distinct,
    slope: Math.round(slope * 1e6) / 1e6,
    seSlope: Math.round(seSlope * 1e6) / 1e6,
    df,
    tCrit,
    ci95: {
      lo: Math.round(ci.lo * 1e6) / 1e6,
      hi: Math.round(ci.hi * 1e6) / 1e6,
    },
    containsZero,
    statement: containsZero
      ? `no detected non-linearity (underpowered: ${n} runs at ${distinct} distinct heights) — [R6] may NOT be cited as positive evidence that the bar is linear`
      : `slope CI excludes zero (${n} runs at ${distinct} distinct heights)`,
  };
}

// ---------------------------------------------------------------------------
// artifact loading + per-recording assembly
// ---------------------------------------------------------------------------
/* eslint-disable @typescript-eslint/no-explicit-any */
function loadSolo2(): any {
  return JSON.parse(readFileSync(SOLO2_ARTIFACT, 'utf8'));
}
function loadA3(): any {
  return JSON.parse(readFileSync(A3_ARTIFACT, 'utf8'));
}

export interface WindowLadder {
  id: string;
  span: [number, number];
  plateaus: Plateau[];
  transitions: Transition[];
  credits: Transition[];
  obscured: Transition[];
}

export function solo2Ladders(
  art: any,
  dirtyMode: 'read-point' | 'any-frame' = 'read-point'
): {
  ladders: WindowLadder[];
  dirty: [number, number][];
} {
  const series = expandChangesOnly(art.series30fpsChangesOnly) as {
    reads: TraceRead[];
  };
  const reads = series.reads;
  const exclusions: [number, number][] = art.result.params.windows.flatMap(
    (w: any) => w.exclusions as [number, number][]
  );
  const flags = offCurveSpans(
    (art.result.offCurveFlags.insideWindows as { t: number }[]).map((r) => r.t)
  );
  const dirty = [...exclusions, ...flags];
  const ladders: WindowLadder[] = (['W1', 'W2', 'W3', 'W4'] as const).map(
    (id) => {
      const span = art.windowMap.trace[id] as [number, number];
      const plateaus = settledPlateaus(reads, span, dirty, dirtyMode);
      const trans = transitions(plateaus, reads, dirty);
      return {
        id,
        span,
        plateaus,
        transitions: trans,
        credits: trans.filter((t) => t.kind === 'CLEAN'),
        obscured: trans.filter((t) => t.kind === 'OBSCURED'),
      };
    }
  );
  return { ladders, dirty };
}

export function a3Ladder(
  art: any,
  dirtyMode: 'read-point' | 'any-frame' = 'read-point'
): WindowLadder {
  const reads = art.series30fps.reads as TraceRead[];
  const firstFull = reads.find((r) => r.state === 'full');
  const fullAt = firstFull ? firstFull.t : reads[reads.length - 1].t;
  // window open = start of the settled baseline plateau immediately preceding the first credit
  const all = settledPlateaus(reads, [0, fullAt], A3_DIRTY_SPANS, dirtyMode);
  const base = [...all].reverse().find((p) => p.level <= 3 && p.frames >= 20);
  const span: [number, number] = [base ? base.t0 : 0, fullAt];
  const plateaus = settledPlateaus(reads, span, A3_DIRTY_SPANS, dirtyMode);
  const trans = transitions(plateaus, reads, A3_DIRTY_SPANS);
  return {
    id: 'A3',
    span,
    plateaus,
    transitions: trans,
    credits: trans.filter((t) => t.kind === 'CLEAN'),
    obscured: trans.filter((t) => t.kind === 'OBSCURED'),
  };
}

// ---------------------------------------------------------------------------
// control (a) — montage ammo decrements vs the run's pull count
// ---------------------------------------------------------------------------
export interface MontageDecrement {
  from: number;
  to: number;
  bracket: [number, number];
  mid: number;
}

export function montageDecrements(
  cells: [number, number | null][]
): MontageDecrement[] {
  const out: MontageDecrement[] = [];
  let lastT: number | null = null;
  let lastV: number | null = null;
  for (const [t, v] of cells) {
    if (v === null) {
      continue;
    }
    if (lastV !== null && lastT !== null && v === lastV - 1) {
      out.push({
        from: lastV,
        to: v,
        bracket: [lastT, t],
        mid: (lastT + t) / 2,
      });
    }
    lastV = v;
    lastT = t;
  }
  return out;
}

export function decrementsInRun(decs: MontageDecrement[], run: E2Run): number {
  const c = run.creditInstants;
  const lo = c[0] - FIRE_TO_CREDIT_SEC - MONTAGE_CELL_SEC - 1e-9;
  const hi = c[c.length - 1] - FIRE_TO_CREDIT_SEC + MONTAGE_CELL_SEC + 1e-9;
  return decs.filter((d) => d.mid >= lo && d.mid <= hi).length;
}

// ---------------------------------------------------------------------------
// decision rule (pre-committed; applied mechanically, no verdict attached)
// ---------------------------------------------------------------------------
export interface DecisionInput {
  ci: Interval;
  windowsExcluding: string[];
  contributingE1: { window: string; interval: Interval }[];
  a3CiOverlapsSolo2Ci: boolean;
  crossRecordingE1Intersection: Interval | null;
  intersectionContainsPooled: boolean;
  e3ContainsZero: boolean;
  /** placement of the E1 evidence relative to 10.388 — see `e1Direction` below */
  e1Direction: 'above' | 'below' | 'mixed' | 'none';
  e2AboveHModel: boolean;
  eligibleMontageWindows: number;
  instrumentGatePassed: boolean;
}
export interface DecisionOutput {
  clause: 1 | 2 | 3 | 4 | 5;
  name: string;
  legs: Record<string, boolean | string>;
  /** every clause's own condition, evaluated regardless of which one fires first */
  allClauseConditions: Record<string, boolean>;
}

/**
 * [R1] the gain signature is E1 pushed DOWN while E2 is pushed UP (or vice versa). A window whose
 * E1 interval CONTAINS 10.388 has not moved in either direction and is uninformative on sign, so
 * the direction is read off the windows that do exclude it.
 */
export function e1Direction(
  intervals: Interval[]
): 'above' | 'below' | 'mixed' | 'none' {
  const above = intervals.filter((v) => v.lo > H_MODEL_PP).length;
  const below = intervals.filter((v) => v.hi <= H_MODEL_PP).length;
  if (above > 0 && below === 0) {
    return 'above';
  }
  if (below > 0 && above === 0) {
    return 'below';
  }
  if (above > 0 && below > 0) {
    return 'mixed';
  }
  return 'none';
}

/** Clauses are evaluated in the order the packet writes them: 5 (stop) then 1, 2, 3, 4. */
export function applyDecisionRule(d: DecisionInput): DecisionOutput {
  const ciDisjointFromAll = d.contributingE1.every(
    (w) => d.ci.hi < w.interval.lo || d.ci.lo > w.interval.hi
  );
  const oppositeDirections =
    (d.e1Direction === 'below' && d.e2AboveHModel) ||
    (d.e1Direction === 'above' && !d.e2AboveHModel);
  const i = H_MODEL_PP < d.ci.lo || H_MODEL_PP > d.ci.hi;
  const ii = d.windowsExcluding.length >= 2;
  const iii = d.contributingE1.every(
    (w) => !(d.ci.hi < w.interval.lo || d.ci.lo > w.interval.hi)
  );
  const iv =
    d.a3CiOverlapsSolo2Ci &&
    d.crossRecordingE1Intersection !== null &&
    d.crossRecordingE1Intersection.lo <= d.crossRecordingE1Intersection.hi &&
    d.intersectionContainsPooled;
  const ciContains = H_MODEL_PP >= d.ci.lo && H_MODEL_PP <= d.ci.hi;
  const twoContain =
    d.contributingE1.filter(
      (w) => H_MODEL_PP >= w.interval.lo && H_MODEL_PP < w.interval.hi
    ).length >= 2;
  const clause3 = ciDisjointFromAll || !d.e3ContainsZero || oppositeDirections;
  const all = {
    clause5_instrumentGateFailed: !d.instrumentGatePassed,
    clause1: i && ii && iii && iv,
    clause2: ciContains && twoContain,
    clause3,
    clause1_i_ciExcludesHModel: i,
    clause1_ii_twoMontageWindowsExclude: ii,
    clause1_iii_ciIntersectsEveryContributingE1: iii,
    clause1_iv_a3AgreesInMagnitude: iv,
    clause3_ciDisjointFromEveryWindow: ciDisjointFromAll,
    clause3_e3SlopeExcludesZero: !d.e3ContainsZero,
    clause3_e1AndE2OppositeDirections: oppositeDirections,
    clause4_fewerThanTwoEligibleMontageWindows: d.eligibleMontageWindows < 2,
  };
  if (!d.instrumentGatePassed) {
    return {
      clause: 5,
      name: 'BASIS-BROKEN (stop)',
      legs: { instrumentGate: false },
      allClauseConditions: all,
    };
  }
  if (all.clause1) {
    return {
      clause: 1,
      name: 'MEASURED-ELEVATED',
      legs: { i, ii, iii, iv },
      allClauseConditions: all,
    };
  }
  if (all.clause2) {
    return {
      clause: 2,
      name: 'MEASURED-CONSISTENT-WITH-MODEL',
      legs: {
        ciContainsHModel: ciContains,
        twoWindowsContainHModel: twoContain,
      },
      allClauseConditions: all,
    };
  }
  if (all.clause3) {
    return {
      clause: 3,
      name: 'BASIS-SUSPECT',
      legs: {
        ciDisjointFromEveryWindow: ciDisjointFromAll,
        e3SlopeExcludesZero: !d.e3ContainsZero,
        e1AndE2OppositeDirections: oppositeDirections,
      },
      allClauseConditions: all,
    };
  }
  return {
    clause: 4,
    name: 'INCONCLUSIVE-LOG',
    legs: {
      i,
      ii,
      iii,
      iv,
      fewerThanTwoEligibleMontageWindows: d.eligibleMontageWindows < 2,
    },
    allClauseConditions: all,
  };
}

// ---------------------------------------------------------------------------
// the run
// ---------------------------------------------------------------------------
export function runGaugeMagnitude(): Record<string, unknown> {
  const solo2 = loadSolo2();
  const a3 = loadA3();
  const { ladders, dirty } = solo2Ladders(solo2);
  const byId = Object.fromEntries(ladders.map((l) => [l.id, l])) as Record<
    string,
    WindowLadder
  >;
  const a3L = a3Ladder(a3);

  // ---- run inventory (per window: baseline, opener, departures, steady runs, fill instant) ----
  const inventory = [...ladders, a3L].map((l) => ({
    window: l.id,
    span: l.span,
    settledPlateaus: l.plateaus.map((p) => ({
      t0: p.t0,
      t1: p.t1,
      frames: p.frames,
      level: p.level,
      dirty: p.dirty,
    })),
    ladder: l.transitions.map((t) => ({
      creditAtSec: t.creditAtSec,
      from: t.from,
      to: t.to,
      delta: t.delta,
      kind: t.kind,
      gapFrames: t.gapFrames,
      reason: t.reason,
    })),
  }));

  // ---- [R3]/[NR1] departure classification, BEFORE any estimator ----
  // pool = every CLEAN non-opener credit (the opener is the first credit of each window) that is
  // not clipped (the clipping pull never forms a CLEAN transition — the bar saturates) and not
  // inside a dirty span (OBSCURED transitions are excluded by construction).
  function cleanNonOpenerDeltas(
    l: WindowLadder
  ): { label: string; delta: number; creditAtSec: number }[] {
    const out: { label: string; delta: number; creditAtSec: number }[] = [];
    let seenFirstCredit = false;
    let n = 0;
    for (const t of l.transitions) {
      if (t.kind === 'WOBBLE' || t.kind === 'DROP') {
        continue;
      }
      n += 1;
      const isOpener = !seenFirstCredit;
      seenFirstCredit = true;
      if (isOpener) {
        continue;
      }
      if (t.kind !== 'CLEAN') {
        continue;
      }
      out.push({
        label: `${l.id}c${n}@${t.creditAtSec.toFixed(2)}`,
        delta: t.delta,
        creditAtSec: t.creditAtSec,
      });
    }
    return out;
  }
  const solo2Deltas = ladders.flatMap(cleanNonOpenerDeltas);
  const solo2DeltasNoW1 = ladders
    .filter((l) => l.id !== 'W1')
    .flatMap(cleanNonOpenerDeltas);
  const a3Deltas = cleanNonOpenerDeltas(a3L);
  const medSolo2 = median(solo2Deltas.map((d) => d.delta));
  const medSolo2NoW1 = median(solo2DeltasNoW1.map((d) => d.delta));
  const medA3 = median(a3Deltas.map((d) => d.delta));

  function classifyAll(
    ds: { label: string; delta: number; creditAtSec: number }[],
    extra: { label: string; value: [number, number] }[],
    med: number,
    radius: number
  ): DepartureCall[] {
    return [
      ...ds.map((d) =>
        classifyDeparture(d.label, d.creditAtSec, d.delta, med, radius)
      ),
      ...extra.map((e) =>
        classifyDeparture(e.label, null, e.value, med, radius)
      ),
    ];
  }
  const solo2Extra = [{ label: 'W4p7(smeared)', value: W4P7_SMEARED_INTERVAL }];
  const classification = {
    rule: 'DEPARTING <=> |delta - median_all| > radius; symmetric; stated in render-grid units; references no hypothesis value',
    pool: 'every CLEAN non-opener, non-clipped credit not inside a dirty span, derived mechanically from the trace ladder',
    solo2: {
      medianAll: medSolo2,
      medianAllExcludingW1: medSolo2NoW1,
      n: solo2Deltas.length,
      primaryRadiusPp: DEPARTURE_RADIUS_PRIMARY_PP,
      sensitivityRadiusPp: DEPARTURE_RADIUS_SENSITIVITY_PP,
      atPrimaryRadius: classifyAll(
        solo2Deltas,
        solo2Extra,
        medSolo2,
        DEPARTURE_RADIUS_PRIMARY_PP
      ),
      atSensitivityRadius: classifyAll(
        solo2Deltas,
        solo2Extra,
        medSolo2,
        DEPARTURE_RADIUS_SENSITIVITY_PP
      ),
    },
    a3: {
      medianAll: medA3,
      n: a3Deltas.length,
      atPrimaryRadius: classifyAll(
        a3Deltas,
        [],
        medA3,
        DEPARTURE_RADIUS_PRIMARY_PP
      ),
      atSensitivityRadius: classifyAll(
        a3Deltas,
        [],
        medA3,
        DEPARTURE_RADIUS_SENSITIVITY_PP
      ),
    },
  };
  const departingPrimary = classification.solo2.atPrimaryRadius
    .filter((c) => c.departing)
    .map((c) => c.label);
  const departingSensitivity = classification.solo2.atSensitivityRadius
    .filter((c) => c.departing)
    .map((c) => c.label);
  const a3DepartingPrimary = classification.a3.atPrimaryRadius
    .filter((c) => c.departing)
    .map((c) => c.label);
  const a3DepartingSensitivity = classification.a3.atSensitivityRadius
    .filter((c) => c.departing)
    .map((c) => c.label);

  // ---- controls ----
  const montage = {
    W2: montageDecrements(solo2.montage.W2.cells),
    W3: montageDecrements(solo2.montage.W3.cells),
    W4: montageDecrements(solo2.montage.W4.cells),
  } as Record<string, MontageDecrement[]>;
  // W3's summary records one decrement inside a two-cell occluded span (2->1); the cell array
  // therefore under-counts it by one. Recorded explicitly rather than patched.
  const montagePullCounts = {
    W2: solo2.montage.W2.pullCount as number,
    W3: solo2.montage.W3.pullCount as number,
    W4: solo2.montage.W4.pullCount as number,
  };

  // burst-DoT control: re-derive cast instants from the trace's own `full` instants + the
  // artifact's countdown digits, NOT from the packet.
  const series = expandChangesOnly(solo2.series30fpsChangesOnly) as {
    reads: TraceRead[];
  };
  const fullInstantsRaw: number[] = [];
  let prevState = '';
  for (const r of series.reads) {
    if (r.state === 'full' && prevState !== 'full') {
      fullInstantsRaw.push(r.t);
    }
    prevState = r.state;
  }
  // the `full` state flickers for a second or two around each fill; keep the FIRST of each cluster
  const fullInstants = fullInstantsRaw.filter(
    (t, idx) => idx === 0 || t - fullInstantsRaw[idx - 1] > 5
  );
  // `structural.cycle` (committed): full -> Burst-1 cast ~0.4 s later; DoT duration 10 s
  const castInstants = fullInstants.map(
    (t) => Math.round((t + 0.4) * 100) / 100
  );
  const dotWindows = castInstants.map((t) => [
    t,
    Math.round((t + 10) * 100) / 100,
  ]);

  // ---- E1 ----
  /** the settled level the ladder shows immediately after the window's FIRST credit */
  function mechanicalPostOpener(l: WindowLadder): number | null {
    let seen = false;
    let level: number | null = null;
    for (const t of l.transitions) {
      if (t.kind === 'WOBBLE') {
        if (seen) {
          level = t.to;
        }
        continue;
      }
      if (!seen) {
        seen = true;
        level = t.to;
        continue;
      }
      break;
    }
    return level;
  }
  const postOpenerMechanical = Object.fromEntries(
    [...ladders, a3L].map((l) => [l.id, mechanicalPostOpener(l)])
  );
  const e1Solo2 = [
    e1(
      {
        window: 'W1',
        K: 9,
        kCue: 'game-driven',
        kCueEvidence: 'green-full state at 13.60 in the trace',
        postOpenerLevel: 11.6,
        anomalies: [],
        montageVerified: false,
      },
      true,
      'reader-only pull count (montage.W1 absent) — descriptive; may NOT be counted in clause 1(ii)'
    ),
    e1(
      {
        window: 'W2',
        K: montagePullCounts.W2,
        kCue: 'game-driven',
        kCueEvidence:
          'green-full state at 37.83 in the trace; montage 9 pulls open->green-full',
        postOpenerLevel: W2_POST_OPENER_INTERVAL,
        anomalies: [15.3],
        montageVerified: true,
      },
      true,
      'post-opener plateau 6.5 overlaps the committed exclusion span by one bin, so it enters as the artifact-declared settle interval [6.5,7.2] per [NR4]'
    ),
    e1(
      {
        window: 'W3',
        K: montagePullCounts.W3,
        kCue: 'game-driven',
        kCueEvidence:
          'green-full state at 61.07 in the trace; montage 10 pulls open->green-full',
        postOpenerLevel: 6.5,
        anomalies: [],
        montageVerified: true,
      },
      true,
      'post-opener level read mechanically from a 14-frame settled plateau (50.33-50.77)'
    ),
    e1(
      {
        window: 'W4',
        K: montagePullCounts.W4,
        kCue: 'game-driven',
        kCueEvidence:
          'green-full state at 83.20 in the trace (NOT the rendered 100.0 at 81.63, which is offCurve-flagged 81.63-82.17); montage 9 pulls open->green-full',
        postOpenerLevel: 9.4,
        anomalies: [16.0, 15.2, W4P7_SMEARED_INTERVAL],
        montageVerified: true,
      },
      true,
      'three departing credits, one of them an interval; the resulting E1 interval is reported and its discriminating power assessed separately'
    ),
  ];
  const e1A3 = e1(
    {
      window: 'A3',
      K: 9,
      kCue: 'game-driven',
      kCueEvidence:
        'green-full state at 19.40 in the 30 fps trace (19.38 at 60 fps); countingCrossCheck ammo count 9 pulls from empty',
      postOpenerLevel: 11.6,
      anomalies: [],
      montageVerified: true,
    },
    true,
    'independent footage, independently self-calibrated bar lock'
  );

  // ---- E2 ----
  /**
   * A run START is CONDITIONAL when its anchoring plateau traces back — through WOBBLE steps
   * only — to the after-side of an OBSCURED transition or of a DROP (a fall inside a refill
   * window is always a render artifact), i.e. the level it rests on was first painted immediately
   * out of a corrupted region. That is exactly the artifact of record's `included: "conditional"`
   * taxonomy (its W2p2 / W3p6 / W4p6 and A3's pull 8).
   */
  function isConditionalStart(l: WindowLadder, p: Plateau): boolean {
    let target = p.t0;
    for (;;) {
      const incoming = l.transitions.find((t) => t.afterPlateau.t0 === target);
      if (!incoming) {
        return false;
      }
      if (incoming.kind === 'OBSCURED' || incoming.kind === 'DROP') {
        return true;
      }
      if (incoming.kind === 'WOBBLE') {
        target = incoming.beforePlateau.t0;
        continue;
      }
      return false;
    }
  }
  const departingAt = (windowId: string, creditAtSec: number): boolean =>
    [
      ...classification.solo2.atPrimaryRadius,
      ...classification.a3.atPrimaryRadius,
    ].some(
      (d) =>
        d.departing &&
        d.label.startsWith(`${windowId}c`) &&
        d.creditAtSec !== null &&
        Math.abs(d.creditAtSec - creditAtSec) < 1e-6
    );
  /** Build every maximal run of consecutive CLEAN, non-departing credits in a ladder. */
  function runsOf(l: WindowLadder): E2Run[] {
    const out: E2Run[] = [];
    let cur: Transition[] = [];
    const flush = (): void => {
      if (cur.length === 0) {
        return;
      }
      const before = cur[0].beforePlateau;
      const after = cur[cur.length - 1].afterPlateau;
      out.push(
        buildRun(
          l.id,
          `${l.id}:${before.t0.toFixed(2)}->${after.t0.toFixed(2)}(${cur.length}p)`,
          before,
          after,
          cur.length,
          isConditionalStart(l, before),
          cur.map((t) => t.creditAtSec)
        )
      );
      cur = [];
    };
    let seenFirstCredit = false;
    for (const t of l.transitions) {
      if (t.kind === 'WOBBLE') {
        continue;
      }
      if (
        t.kind !== 'CLEAN' ||
        !seenFirstCredit ||
        departingAt(l.id, t.creditAtSec)
      ) {
        seenFirstCredit = true; // the opener is never in a run
        flush();
        continue;
      }
      // the clipping pull never forms a CLEAN transition (the bar saturates), so it is excluded
      // by construction.
      cur.push(t);
    }
    flush();
    return out;
  }
  /**
   * STRICT re-anchoring: a run with a CONDITIONAL start drops its first pull and re-anchors on
   * the plateau after that pull's credit; a 1-pull conditional run disappears entirely.
   */
  function strictVariant(l: WindowLadder, r: E2Run): E2Run | null {
    if (!r.conditionalStart) {
      return r;
    }
    if (r.pulls < 2) {
      return null;
    }
    const firstCredit = r.creditInstants[0];
    const trans = l.transitions.find(
      (t) => t.kind === 'CLEAN' && Math.abs(t.creditAtSec - firstCredit) < 1e-6
    );
    if (!trans) {
      return null;
    }
    const after = l.plateaus.find((p) => Math.abs(p.t0 - r.tAfter) < 1e-6);
    if (!after) {
      return null;
    }
    return buildRun(
      l.id,
      `${l.id}:${trans.afterPlateau.t0.toFixed(2)}->${after.t0.toFixed(2)}(${r.pulls - 1}p,strict)`,
      trans.afterPlateau,
      after,
      r.pulls - 1,
      false,
      r.creditInstants.slice(1)
    );
  }
  const solo2Ids = ['W2', 'W3', 'W4'];
  const allSolo2Runs = solo2Ids.flatMap((id) => runsOf(byId[id]));
  const w1Runs = runsOf(byId.W1);
  const allA3Runs = runsOf(a3L);

  const lenientSolo2 = allSolo2Runs;
  const strictSolo2 = solo2Ids.flatMap((id) =>
    runsOf(byId[id])
      .map((r) => strictVariant(byId[id], r))
      .filter((r): r is E2Run => r !== null)
  );
  const lenientA3 = allA3Runs;
  const strictA3 = allA3Runs
    .map((r) => strictVariant(a3L, r))
    .filter((r): r is E2Run => r !== null);

  const wilsonSolo2 = solo2.result.pooled.byThreshold.find(
    (b: any) => b.threshold === solo2.result.params.bindingThreshold
  ).wilsonUpper95OneSided as number;
  // A3 carries no Question-B block of its own; the committed JOINT pool (which folds in the C4
  // rerun's A3-basis quiet bins) is the rate carried for it.
  const wilsonA3 = solo2.result.jointPooledWithOldBasis.byThreshold.find(
    (b: any) => b.threshold === solo2.result.params.bindingThreshold
  ).wilsonUpper95OneSided as number;

  const poolLenient = poolE2(lenientSolo2, wilsonSolo2);
  const poolStrict = poolE2(strictSolo2, wilsonSolo2);
  const poolA3Lenient = poolE2(lenientA3, wilsonA3);
  const poolA3Strict = poolE2(strictA3, wilsonA3);

  const e3Lenient = e3(lenientSolo2);
  const e3Strict = e3(strictSolo2);

  // control (a), per run actually used
  const controlA = lenientSolo2.map((r) => ({
    run: r.label,
    pulls: r.pulls,
    montageDecrements: decrementsInRun(montage[r.window], r),
    matches: decrementsInRun(montage[r.window], r) === r.pulls,
  }));
  // control (b): no DoT window overlaps a measured run
  const controlB = lenientSolo2.map((r) => {
    const overlap = dotWindows.filter(
      ([a, b]) => !(r.tAfter < a || r.tBefore > b)
    );
    return {
      run: r.label,
      span: [r.tBefore, r.tAfter],
      overlappingDotWindows: overlap,
      clean: overlap.length === 0,
    };
  });

  // ---- decision rule ----
  const eligibleE1 = e1Solo2.filter((w) => w.montageVerified);
  const windowsExcluding = eligibleE1
    .filter((w) => w.excludesHModel)
    .map((w) => w.window);
  const contributing = eligibleE1.map((w) => ({
    window: w.window,
    interval: w.interval,
  }));
  const crossLo = Math.max(
    ...eligibleE1.map((w) => w.interval.lo),
    e1A3.interval.lo
  );
  const crossHi = Math.min(
    ...eligibleE1.map((w) => w.interval.hi),
    e1A3.interval.hi
  );
  const crossInt: Interval | null =
    crossLo <= crossHi ? { lo: crossLo, hi: crossHi } : null;
  const ciOverlap = !(
    poolA3Lenient.ci95.hi < poolLenient.ci95.lo ||
    poolA3Lenient.ci95.lo > poolLenient.ci95.hi
  );
  const decisionInput = {
    ci: poolLenient.ci95,
    windowsExcluding,
    contributingE1: contributing,
    a3CiOverlapsSolo2Ci: ciOverlap,
    crossRecordingE1Intersection: crossInt,
    intersectionContainsPooled:
      crossInt !== null &&
      poolLenient.pooled >= crossInt.lo &&
      poolLenient.pooled <= crossInt.hi,
    e3ContainsZero: e3Lenient ? e3Lenient.containsZero : true,
    e1Direction: e1Direction([
      ...eligibleE1.map((w) => w.interval),
      e1A3.interval,
    ]),
    e2AboveHModel: poolLenient.pooled > H_MODEL_PP,
    eligibleMontageWindows: eligibleE1.length,
    instrumentGatePassed: true,
  };
  const decision = applyDecisionRule(decisionInput);
  const decisionStrict = applyDecisionRule({
    ...decisionInput,
    ci: poolStrict.ci95,
    a3CiOverlapsSolo2Ci: !(
      poolA3Strict.ci95.hi < poolStrict.ci95.lo ||
      poolA3Strict.ci95.lo > poolStrict.ci95.hi
    ),
    intersectionContainsPooled:
      crossInt !== null &&
      poolStrict.pooled >= crossInt.lo &&
      poolStrict.pooled <= crossInt.hi,
    e3ContainsZero: e3Strict ? e3Strict.containsZero : true,
    e2AboveHModel: poolStrict.pooled > H_MODEL_PP,
  });

  // clause-2 reachability
  const neededHalfWidth = Math.abs(poolLenient.pooled - H_MODEL_PP);
  const achievedHalfWidth = Z95 * poolLenient.sePooled;
  const reachability = {
    definition:
      'clause 2 fires only if the CI contains 10.388; at the achieved point estimate that needs a half-width >= |pooled - 10.388|',
    neededHalfWidthPp: Math.round(neededHalfWidth * 1e6) / 1e6,
    neededCiWidthPp: Math.round(2 * neededHalfWidth * 1e6) / 1e6,
    achievedHalfWidthPp: Math.round(achievedHalfWidth * 1e6) / 1e6,
    achievedCiWidthPp: Math.round(2 * achievedHalfWidth * 1e6) / 1e6,
    clause2Reachable: achievedHalfWidth >= neededHalfWidth,
    neededSePooled: Math.round((neededHalfWidth / Z95) * 1e6) / 1e6,
  };

  // ---- fragility of clause 1(ii): how much slack each excluding window has ----
  const w3 = e1Solo2.find((w) => w.window === 'W3')!;
  const w3OneColumnHigher = e1(
    { ...w3, postOpenerLevel: 6.5 + 0.7 },
    true,
    'counterfactual: post-opener level one render column higher'
  );
  const w3OneColumnLower = e1(
    { ...w3, postOpenerLevel: 6.5 - 0.7 },
    true,
    'counterfactual: post-opener level one render column lower'
  );
  const withoutW3 = applyDecisionRule({
    ...decisionInput,
    windowsExcluding: windowsExcluding.filter((w) => w !== 'W3'),
  });
  const withA3Counted = applyDecisionRule({
    ...decisionInput,
    windowsExcluding: [...windowsExcluding.filter((w) => w !== 'W3'), 'A3'],
  });
  const fragility = {
    clause1iiRestsOn: windowsExcluding,
    perWindowExclusionMargin: eligibleE1.map((w) => ({
      window: w.window,
      marginPp: w.exclusionMarginPp,
      marginColumns: w.exclusionMarginColumns,
      excludes: w.excludesHModel,
    })),
    w3OneColumnSensitivity: {
      asRendered: { interval: w3.interval, excludes: w3.excludesHModel },
      oneColumnHigher: {
        interval: w3OneColumnHigher.interval,
        excludes: w3OneColumnHigher.excludesHModel,
      },
      oneColumnLower: {
        interval: w3OneColumnLower.interval,
        excludes: w3OneColumnLower.excludesHModel,
      },
    },
    ifW3DidNotExclude: {
      clause: withoutW3.clause,
      name: withoutW3.name,
      note: 'solo #2 would then carry ONE excluding montage-verified window, and clause 1(ii) needs two',
    },
    ifA3CountedAsAMontageVerifiedWindow: {
      clause: withA3Counted.clause,
      name: withA3Counted.name,
      note: "the packet's clause 1(ii) does not say whether the A3 window may be counted there; both readings are reported. A3's E1 excludes 10.388 with 0.66 pp (0.91 column) of margin.",
    },
  };

  // ---- sensitivity: the stricter "any-frame" dirty-plateau reading ----
  const altLadders = solo2Ladders(solo2, 'any-frame').ladders;
  const altById = Object.fromEntries(
    altLadders.map((l) => [l.id, l])
  ) as Record<string, WindowLadder>;
  const altRuns = solo2Ids.flatMap((id) => runsOf(altById[id]));
  const altPool = altRuns.length ? poolE2(altRuns, wilsonSolo2) : null;

  // ---- candidate check — STRICTLY LAST, descriptive only ----
  const candidate = 3.71;
  const anomalyValues = [15.3, 16.0, 15.2];
  const candidateCheck = {
    declaredCandidatePp: candidate,
    provenance:
      'fitted after the fact on n=3 credits from one recording (probe-runs.md 8094-8101); not evidence, not a prior result; neither estimator uses it',
    residuals: anomalyValues.map((v) => ({
      anomalyRenderedPp: v,
      minusPooledE2: Math.round((v - poolLenient.pooled) * 1e4) / 1e4,
      minusCandidatePp:
        Math.round((v - poolLenient.pooled - candidate) * 1e4) / 1e4,
      withinOneColumn: Math.abs(v - poolLenient.pooled - candidate) <= 0.725,
    })),
    downwardDeparture: {
      renderedInterval: W4P7_SMEARED_INTERVAL,
      minusPooledE2: [
        Math.round((W4P7_SMEARED_INTERVAL[0] - poolLenient.pooled) * 1e4) / 1e4,
        Math.round((W4P7_SMEARED_INTERVAL[1] - poolLenient.pooled) * 1e4) / 1e4,
      ],
      note: 'a deficit, not an excess; a candidate that explains only upward departures is explicitly incomplete',
    },
  };

  return {
    slug: 'anis-star-solo-magnitude',
    date: '2026-08-17',
    plan: 'docs/handoffs/2026-08-17-anis-star-solo-magnitude-preop-packet.md',
    _note:
      'MEASUREMENT ONLY — raw inputs, per-window tables, estimator outputs, controls, caveats. NO verdict is recorded here; the decision-rule application below is reported as arithmetic (which clause the pre-committed rule selects), not as a stamp. Computed by scripts/probe/gauge-magnitude.ts and replayed by scripts/tests/probe/gauge-magnitude.test.ts.',
    inputs: {
      solo2: SOLO2_ARTIFACT,
      a3: A3_ARTIFACT,
      footageRead: 'none — both traces were already committed',
    },
    pinnedConstants: {
      barWidthPx: BAR_WIDTH_PX,
      columnPp: Math.round(COLUMN_PP * 1e6) / 1e6,
      departureRadiusPrimaryPp: DEPARTURE_RADIUS_PRIMARY_PP,
      departureRadiusSensitivityPp: DEPARTURE_RADIUS_SENSITIVITY_PP,
      settleFrames: SETTLE_FRAMES,
      eventMinPp: EVENT_MIN_PP,
      quantSdPp: Math.round(QUANT_SD_PP * 1e6) / 1e6,
      z95: Z95,
      hypotheses: {
        hModel: H_MODEL_PP,
        hElevated: H_ELEVATED_PP,
        hLegacy: H_LEGACY_PP,
      },
    },
    dirtySpans: dirty,
    a3DirtySpans: A3_DIRTY_SPANS,
    runInventory: inventory,
    departureClassification: {
      ...classification,
      departingPrimary,
      departingSensitivity,
      a3DepartingPrimary,
      a3DepartingSensitivity,
      membershipIdenticalAcrossRadii:
        JSON.stringify(departingPrimary) ===
        JSON.stringify(departingSensitivity),
      a3MembershipIdenticalAcrossRadii:
        JSON.stringify(a3DepartingPrimary) ===
        JSON.stringify(a3DepartingSensitivity),
    },
    controls: {
      a_traceEventsVsMontage: {
        perRun: controlA,
        allMatch: controlA.every((c) => c.matches),
        perWindowTotals: (['W2', 'W3', 'W4'] as const).map((id) => ({
          window: id,
          montagePullCount: montagePullCounts[id],
          montageCellDecrements: montage[id].length,
          traceCreditTransitions: byId[id].transitions.filter(
            (t) => t.kind === 'CLEAN' || t.kind === 'OBSCURED'
          ).length,
        })),
      },
      b_burstDotDisjoint: {
        fullInstantsFromTrace: fullInstants,
        castInstantsDerived: castInstants,
        dotWindows,
        perRun: controlB,
        allClean: controlB.every((c) => c.clean),
      },
      c_questionBFalseEventRate: {
        source: `${SOLO2_ARTIFACT} result.pooled / result.jointPooledWithOldBasis (carried, NOT re-derived)`,
        bindingThreshold: solo2.result.params.bindingThreshold,
        quietBins: solo2.result.pooled.quietBins,
        falseEventBins: solo2.result.pooled.byThreshold.find(
          (b: any) => b.threshold === solo2.result.params.bindingThreshold
        ).falseEventBins,
        wilsonUpper95OneSidedSolo2: wilsonSolo2,
        wilsonUpper95OneSidedJoint: wilsonA3,
        maxPositiveDeltaInQuietBins: solo2.result.pooled.maxDelta,
      },
    },
    E1: {
      formula:
        'residual = 100 - postOpenerLevel - sum(departing credits as rendered); m = K - 1 - nAnomalous; P in [residual/m, residual/(m-1)). postOpenerLevel absorbs baseline + opener exactly, which removes the baseline/opener split ambiguity.',
      postOpenerLevelMechanicalCrossCheck: postOpenerMechanical,
      solo2: e1Solo2,
      a3: e1A3,
    },
    E2: {
      formula:
        'P_run = (level_after_last_pull - level_before_first_pull) / pulls_in_run',
      solo2Runs: allSolo2Runs,
      w1RunsDescriptive: w1Runs,
      a3Runs: allA3Runs,
      pooled: {
        solo2Lenient: poolLenient,
        solo2Strict: poolStrict,
        a3Lenient: poolA3Lenient,
        a3Strict: poolA3Strict,
      },
      seConstruction:
        'SE_pooled = max(inverse-variance pool of SE_quant, empirical scatter sd/sqrt(k), Question-B inflation). The inflation term = EVENT_MIN_PP x (wilsonUpper95 x binsInRun) / pulls, inverse-variance weighted across runs — the packet mandated the term but did not pin its formula; this construction is the driver-chosen conservative one and is disclosed as such.',
    },
    E3: { lenient: e3Lenient, strict: e3Strict },
    decisionRuleApplication: {
      basis:
        'solo2 LENIENT pool (the reading that uses the most data); STRICT reported alongside',
      pooledE2: poolLenient.pooled,
      ci95: poolLenient.ci95,
      windowsExcludingHModel: windowsExcluding,
      contributingE1Intervals: contributing,
      crossRecordingE1Intersection: crossInt,
      a3CiOverlapsSolo2Ci: ciOverlap,
      e1DirectionRelativeToHModel: e1Direction([
        ...eligibleE1.map((w) => w.interval),
        e1A3.interval,
      ]),
      e2DirectionRelativeToHModel:
        poolLenient.pooled > H_MODEL_PP ? 'above' : 'below',
      clauseSelectedByTheRuleAsWritten: decision,
      clauseUnderTheStrictPool: decisionStrict,
      reachability,
      fragility,
    },
    sensitivities: {
      dirtySpanBoundaryReading: {
        primary:
          'read-point: a settled plateau is dirty iff the frame 6 after its first lies in a dirty span (the frame [R4] reads the endpoint at)',
        alternative:
          'any-frame: a plateau overlapping a dirty span at ANY frame is dirty; this removes W2 6.5 (overlaps by 2 bins) and W4 63.0 (1 bin), i.e. it removes W4 entirely and shortens W2 to 5 pulls',
        alternativeRuns: altRuns.map((r) => ({
          label: r.label,
          pulls: r.pulls,
          pHat: r.pHat,
          conditionalStart: r.conditionalStart,
        })),
        alternativePool: altPool,
      },
      boundaryColumnAttribution: {
        rule: 'a mid-plateau one-column WOBBLE is attributed to neither adjacent credit; run endpoints use the settled plateau immediately adjacent to the credit',
        note: 'the packet pre-committed W2p7 = 11.6 / W2p6 = 10.9 (the artifact table). Every wobble at issue is INTERIOR to a run, so E2 telescopes over it and the opposite attribution changes no E2, E1 or pooled value; it changes only the per-pull delta list feeding the classification median, which stays 11.6 either way.',
      },
      a3RawOverTrueCalibration: {
        field:
          'anis-star-solo-a3-gauge-reread.json series30fps.calibration.rawOverTrue = 1.064',
        anchor: 'maiden-ice-rose (a DIFFERENT unit and recording)',
        applied: false,
        why: 'the packet pins both estimators on RENDERED values; this field is a standing gain claim (H0-a) carried from another recording and is reported, not applied',
        ifApplied:
          'dividing rendered levels by 1.064 scales E2 down by the same factor and moves E1 the OTHER way (the [R1] algebra) — the exact signature clause 3 names',
      },
    },
    candidateCheck,
  };
}

function main(): void {
  const out = process.argv.includes('--out')
    ? process.argv[process.argv.indexOf('--out') + 1]
    : null;
  const res = runGaugeMagnitude();
  const json = JSON.stringify(res, null, 1);
  if (out) {
    writeFileSync(out, `${json}\n`);
    process.stdout.write(`wrote ${out}\n`);
  } else {
    process.stdout.write(`${json}\n`);
  }
}

if (process.argv[1] && process.argv[1].endsWith('gauge-magnitude.ts')) {
  main();
}
