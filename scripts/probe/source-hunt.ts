/**
 * Source-hunt: cross-reference real event-bin timing against sim credit timing
 * using within-window phase coordinates.
 *
 * Real events (video trace clock) and sim credits (engine clock) do NOT share
 * an origin — per-window offsets drift across the fight. This script maps each
 * real window to its paired sim window via `w.simWindow`, converts both sides
 * to within-window phase ∈ [0, 1], and compares phases (gap reported in sim
 * seconds using the sim window duration as the time scale).
 *
 * Usage: npx tsx scripts/probe/source-hunt.ts
 */
import { readFileSync } from 'node:fs';

const DIRTY_FLAGS = new Set([
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
]);

const BIN_SEC = 1 / 30;
const E_MIN = 1.5;
const MAX_GAP_FRAMES = 2;
const EXPLAIN_THRESHOLD_SEC = 0.15; // ~5 frames at 30fps — tight coupling
const LOOSE_THRESHOLD_SEC = 0.5; // generous coupling

const bundle = JSON.parse(
  readFileSync('docs/probe-data/fill-trace-u8-g-iron-sweep.json', 'utf-8')
);
const classification = JSON.parse(
  readFileSync('docs/probe-data/fill-trace-habc-classification.json', 'utf-8')
);

const trace = bundle.trace;
const reads: Array<{
  t: number;
  state: string;
  fillRaw: number | null;
  flags: string[];
}> = trace.reads;
const fps: number = trace.fps;

const sched = bundle.simSchedule;
const credits: Array<{
  frame: number;
  sec: number;
  slug: string;
  kind: string;
  amount: number;
  window: number;
}> = sched.credits;

// Build sim-window lookup (indexed by sim window index)
interface SimWin {
  index: number;
  startSec: number;
  endSec: number;
}
const simWinByIndex = new Map<number, SimWin>();
for (const sw of sched.windows) {
  simWinByIndex.set(sw.index, {
    index: sw.index,
    startSec: sw.startSec,
    endSec: sw.endSec,
  });
}

// Get the iron sweep arm from the classification
interface ClsWindow {
  id: number;
  usable: boolean;
  barPaint: number;
  fullInstant: number;
  durationSec: number;
  simWindow: number | null;
  simDurationSec: number;
  eventBins: number;
  eventBinDeltas: number[];
}
const ironArm: { windows: ClsWindow[]; pooled: { eventBins: number } } =
  classification.arms['iron sweep (run G)'];
const clsWindows = ironArm.windows;

const isClean = (r: {
  state: string;
  fillRaw: number | null;
  flags: string[];
}): boolean =>
  r.state === 'filling' &&
  r.fillRaw !== null &&
  !r.flags.some((f) => DIRTY_FLAGS.has(f));

interface EventInfo {
  windowId: number;
  simWinIndex: number;
  binIdx: number;
  t: number;
  realPhase: number;
  delta: number;
  nearestCreditSlug: string;
  nearestCreditKind: string;
  nearestCreditPhase: number;
  phaseGap: number;
  gapSec: number;
  explained: boolean;
}

const allEvents: EventInfo[] = [];

for (const w of clsWindows) {
  if (!w.usable) {
    continue;
  }
  const barPaint = w.barPaint;
  const fullInstant = w.fullInstant;
  const dur = fullInstant - barPaint;
  const nBins = Math.ceil(dur / BIN_SEC - 1e-9);

  const winReads = reads.filter((r) => r.t >= barPaint && r.t < fullInstant);
  const clean = winReads.filter(isClean);
  if (clean.length < 2) {
    continue;
  }

  // Identify saturated bins
  const satBins = new Set<number>();
  for (const r of clean) {
    if (r.fillRaw! > 90) {
      satBins.add(
        Math.min(nBins - 1, Math.max(0, Math.floor((r.t - barPaint) / BIN_SEC)))
      );
    }
  }

  // Detect events (same logic as fill-trace-compare.ts classifyArm)
  const eventByBin = new Map<number, { delta: number; t: number }>();
  for (let k = 1; k < clean.length; k++) {
    const a = clean[k - 1];
    const b = clean[k];
    const delta = b.fillRaw! - a.fillRaw!;
    const gapFrames = Math.round((b.t - a.t) * fps);
    if (gapFrames > MAX_GAP_FRAMES) {
      continue;
    } // bridged
    const bin = Math.min(
      nBins - 1,
      Math.max(0, Math.floor((b.t - barPaint) / BIN_SEC))
    );
    if (delta > E_MIN && !satBins.has(bin)) {
      const existing = eventByBin.get(bin);
      if (!existing || delta > existing.delta) {
        eventByBin.set(bin, { delta, t: b.t });
      }
    }
  }

  // Cross-reference each event with nearest sim credit using within-window phase.
  // Map real window → paired sim window via w.simWindow; compare phases ∈ [0,1].
  const pairedSimWin =
    w.simWindow != null ? simWinByIndex.get(w.simWindow) : undefined;
  const simDur = pairedSimWin
    ? pairedSimWin.endSec - pairedSimWin.startSec
    : w.durationSec;
  const pairedCredits = pairedSimWin
    ? credits.filter((c) => c.window === pairedSimWin.index)
    : [];

  for (const [binIdx, { delta, t }] of eventByBin) {
    const realPhase = (t - barPaint) / (fullInstant - barPaint);
    let bestPhaseGap = Infinity;
    let bestSlug = '';
    let bestKind = '';
    let bestCreditPhase = -1;

    for (const c of pairedCredits) {
      const cPhase =
        (c.sec - pairedSimWin!.startSec) /
        (pairedSimWin!.endSec - pairedSimWin!.startSec);
      const gap = Math.abs(realPhase - cPhase);
      if (gap < bestPhaseGap) {
        bestPhaseGap = gap;
        bestCreditPhase = cPhase;
        bestSlug = c.slug;
        bestKind = c.kind;
      }
    }

    const gapSec = bestPhaseGap === Infinity ? -1 : bestPhaseGap * simDur;

    allEvents.push({
      windowId: w.id,
      simWinIndex: pairedSimWin?.index ?? -1,
      binIdx,
      t,
      realPhase: Math.round(realPhase * 10000) / 10000,
      delta: Math.round(delta * 100) / 100,
      nearestCreditSlug: bestSlug,
      nearestCreditKind: bestKind,
      nearestCreditPhase:
        bestCreditPhase === -1
          ? -1
          : Math.round(bestCreditPhase * 10000) / 10000,
      phaseGap:
        bestPhaseGap === Infinity
          ? -1
          : Math.round(bestPhaseGap * 10000) / 10000,
      gapSec: Math.round(gapSec * 1000) / 1000,
      explained: gapSec <= EXPLAIN_THRESHOLD_SEC,
    });
  }
}

// Count sim credits in each paired sim window (using the simWindow mapping, not raw time overlap)
function simCreditsInPairedWindow(w: ClsWindow): typeof credits {
  if (w.simWindow == null) {
    return [];
  }
  return credits.filter((c) => c.window === w.simWindow);
}

// Summary
const totalEvents = allEvents.length;
const explained = allEvents.filter((e) => e.explained).length;
const loose = allEvents.filter(
  (e) => e.gapSec >= 0 && e.gapSec <= LOOSE_THRESHOLD_SEC
).length;
const excess = allEvents.filter((e) => e.gapSec > LOOSE_THRESHOLD_SEC).length;

console.log(`=== Source-hunt: iron sweep (run G) — within-window phase ===`);
console.log(
  `Real windows: ${clsWindows.filter((w) => w.usable).length} usable`
);
console.log(
  `Total event bins detected: ${totalEvents} (classification pooled: ${ironArm.pooled.eventBins})`
);
if (totalEvents !== ironArm.pooled.eventBins) {
  console.log(
    `⚠ POPULATION MISMATCH: script detected ${totalEvents} events but classification has ${ironArm.pooled.eventBins}. ` +
      `Gap statistics below analyse a DIFFERENT population than the classification. ` +
      `Likely cause: boundary rounding on barPaint/fullInstant re-derivation.`
  );
}
console.log(`Sim credit instants (all credits in run): ${credits.length}`);
console.log(
  `Gaps are within-window phase distances (real-phase vs sim-phase), ` +
    `reported in sim seconds using the paired sim window duration as the time scale.`
);
console.log();
console.log(`At tight threshold (${EXPLAIN_THRESHOLD_SEC}s):`);
console.log(
  `  Explained: ${explained} (${((100 * explained) / totalEvents).toFixed(1)}%)`
);
console.log(
  `  Excess: ${totalEvents - explained} (${((100 * (totalEvents - explained)) / totalEvents).toFixed(1)}%)`
);
console.log();
console.log(`At loose threshold (${LOOSE_THRESHOLD_SEC}s):`);
console.log(
  `  Explained: ${loose} (${((100 * loose) / totalEvents).toFixed(1)}%)`
);
console.log(
  `  Excess: ${excess} (${((100 * excess) / totalEvents).toFixed(1)}%)`
);

// Per-window breakdown
console.log(`\n--- Per-window breakdown ---`);
for (const w of clsWindows) {
  if (!w.usable) {
    continue;
  }
  const winEvents = allEvents.filter((e) => e.windowId === w.id);
  const winExplained = winEvents.filter((e) => e.explained).length;
  const winExcess = winEvents.filter(
    (e) => e.gapSec > LOOSE_THRESHOLD_SEC
  ).length;
  const winCredits = simCreditsInPairedWindow(w);
  const winCreditSlugs = new Map<string, number>();
  for (const c of winCredits) {
    winCreditSlugs.set(c.slug, (winCreditSlugs.get(c.slug) ?? 0) + 1);
  }
  const simWinStr = w.simWindow != null ? `simW${w.simWindow}` : 'no-sim-pair';
  console.log(
    `  W${w.id} [real ${w.barPaint.toFixed(1)}-${w.fullInstant.toFixed(1)}s, ${w.durationSec.toFixed(1)}s | ${simWinStr} ${w.simDurationSec.toFixed(1)}s]: ` +
      `${winEvents.length} events (tight:${winExplained} loose:${winEvents.length - winExcess} excess:${winExcess}) | ` +
      `${winCredits.length} sim credits — ${[...winCreditSlugs.entries()].map(([s, n]) => `${s}:${n}`).join(', ')}`
  );
}

// Excess events detail
const excessEvents = allEvents
  .filter((e) => e.gapSec > LOOSE_THRESHOLD_SEC)
  .sort((a, b) => a.t - b.t);
console.log(
  `\n--- Excess events (phase gap > ${LOOSE_THRESHOLD_SEC}s from any paired sim credit) ---`
);
if (excessEvents.length === 0) {
  console.log(
    `  NONE — all events have a paired sim credit within ${LOOSE_THRESHOLD_SEC}s (phase distance)`
  );
} else {
  for (const e of excessEvents) {
    console.log(
      `  W${e.windowId} (simW${e.simWinIndex}) bin ${e.binIdx} ` +
        `realPhase=${e.realPhase.toFixed(3)} delta=${e.delta} | ` +
        `nearest: ${e.nearestCreditSlug} ${e.nearestCreditKind} ` +
        `creditPhase=${e.nearestCreditPhase.toFixed(3)} ` +
        `phaseGap=${e.phaseGap.toFixed(4)} (${e.gapSec.toFixed(3)}s)`
    );
  }
}

// Gap distribution
console.log(`\n--- Phase-gap distribution (sim seconds) ---`);
const gaps = allEvents
  .map((e) => e.gapSec)
  .filter((g) => g >= 0)
  .sort((a, b) => a - b);
const buckets = [0, 0.033, 0.067, 0.1, 0.15, 0.2, 0.3, 0.5, 1.0, 2.0, Infinity];
for (let i = 0; i < buckets.length - 1; i++) {
  const count = gaps.filter(
    (g) => g >= buckets[i] && g < buckets[i + 1]
  ).length;
  const label =
    buckets[i + 1] === Infinity
      ? `≥${buckets[i]}s`
      : `${buckets[i]}-${buckets[i + 1]}s`;
  console.log(
    `  ${label}: ${count} events (${((100 * count) / gaps.length).toFixed(1)}%)`
  );
}

// Burst-cast proximity test: are excess events near window boundaries?
console.log(`\n--- Window-boundary proximity ---`);
for (const w of clsWindows) {
  if (!w.usable) {
    continue;
  }
  const winEvents = allEvents.filter((e) => e.windowId === w.id);
  const earlyEvents = winEvents.filter((e) => e.realPhase < 0.15);
  const lateEvents = winEvents.filter((e) => e.realPhase > 0.85);
  console.log(
    `  W${w.id}: ${earlyEvents.length} events in first 15% phase, ${lateEvents.length} in last 15% ` +
      `(of ${winEvents.length} total, real ${w.durationSec.toFixed(1)}s / sim ${w.simDurationSec.toFixed(1)}s)`
  );
}

// Clustering: are events uniformly distributed within windows or clustered?
console.log(`\n--- Event phase density ---`);
for (const w of clsWindows) {
  if (!w.usable) {
    continue;
  }
  const winEvents = allEvents.filter((e) => e.windowId === w.id);
  if (winEvents.length < 3) {
    continue;
  }
  const phases = winEvents.map((e) => e.realPhase).sort((a, b) => a - b);
  const interGaps: number[] = [];
  for (let i = 1; i < phases.length; i++) {
    interGaps.push(phases[i] - phases[i - 1]);
  }
  const meanGap = 1 / winEvents.length;
  const cv =
    interGaps.length > 0
      ? (() => {
          const m = interGaps.reduce((s, g) => s + g, 0) / interGaps.length;
          const variance =
            interGaps.reduce((s, g) => s + (g - m) ** 2, 0) / interGaps.length;
          return m > 0 ? Math.sqrt(variance) / m : 0;
        })()
      : 0;
  console.log(
    `  W${w.id}: ${winEvents.length} events, meanPhaseGap=${(meanGap * 1000).toFixed(0)}ms, ` +
      `CV=${cv.toFixed(2)} (${cv > 1 ? 'clustered' : cv > 0.5 ? 'moderate' : 'uniform'})`
  );
}
