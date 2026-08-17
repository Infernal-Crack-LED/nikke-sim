/**
 * Source-hunt: cross-reference real event-bin timing against sim credit timing
 * using the classification's real window boundaries (barPaint → fullInstant).
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

// Get the iron sweep arm from the classification
interface ClsWindow {
  id: number;
  usable: boolean;
  barPaint: number;
  fullInstant: number;
  durationSec: number;
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
  binIdx: number;
  t: number;
  delta: number;
  nearestCreditSec: number;
  nearestCreditSlug: string;
  nearestCreditKind: string;
  gapToNearestSec: number;
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

  // Cross-reference each event with nearest sim credit
  for (const [binIdx, { delta, t }] of eventByBin) {
    let nearestSec = Infinity;
    let nearestSlug = '';
    let nearestKind = '';
    for (const c of credits) {
      const gap = Math.abs(t - c.sec);
      if (gap < nearestSec) {
        nearestSec = gap;
        nearestSlug = c.slug;
        nearestKind = c.kind;
      }
    }
    allEvents.push({
      windowId: w.id,
      binIdx,
      t,
      delta: Math.round(delta * 100) / 100,
      nearestCreditSec:
        nearestSec === Infinity
          ? -1
          : Math.round((t - (t - nearestSec)) * 1000) / 1000,
      nearestCreditSlug: nearestSlug,
      nearestCreditKind: nearestKind,
      gapToNearestSec:
        nearestSec === Infinity ? -1 : Math.round(nearestSec * 1000) / 1000,
      explained: nearestSec <= EXPLAIN_THRESHOLD_SEC,
    });
  }
}

// Compute unique sim credit bins within usable windows
const simCreditBinsInWindows: Array<{
  sec: number;
  slug: string;
  kind: string;
  amount: number;
}> = [];
for (const w of clsWindows) {
  if (!w.usable) {
    continue;
  }
  for (const c of credits) {
    if (c.sec >= w.barPaint && c.sec < w.fullInstant) {
      simCreditBinsInWindows.push(c);
    }
  }
}

// Deduplicate sim credits to unique bins (same frame = same bin)
const simCreditFrames = new Set(credits.map((c) => c.frame));
const uniqueSimFrames = [...simCreditFrames].sort((a, b) => a - b);

// Summary
const totalEvents = allEvents.length;
const explained = allEvents.filter((e) => e.explained).length;
const loose = allEvents.filter(
  (e) => e.gapToNearestSec <= LOOSE_THRESHOLD_SEC
).length;
const excess = allEvents.filter(
  (e) => e.gapToNearestSec > LOOSE_THRESHOLD_SEC
).length;

console.log(`=== Source-hunt: iron sweep (run G) ===`);
console.log(
  `Real windows: ${clsWindows.filter((w) => w.usable).length} usable`
);
console.log(
  `Total event bins detected: ${totalEvents} (classification pooled: ${ironArm.pooled.eventBins})`
);
console.log(
  `Sim credit instants (all windows): ${credits.length}, unique frames: ${uniqueSimFrames.length}`
);
console.log(
  `Sim credits within usable real windows: ${simCreditBinsInWindows.length}`
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
    (e) => e.gapToNearestSec > LOOSE_THRESHOLD_SEC
  ).length;
  const winCredits = simCreditBinsInWindows.filter(
    (c) => c.sec >= w.barPaint && c.sec < w.fullInstant
  );
  const winCreditSlugs = new Map<string, number>();
  for (const c of winCredits) {
    winCreditSlugs.set(c.slug, (winCreditSlugs.get(c.slug) ?? 0) + 1);
  }
  console.log(
    `  W${w.id} [${w.barPaint.toFixed(1)}-${w.fullInstant.toFixed(1)}s, ${w.durationSec.toFixed(1)}s]: ` +
      `${winEvents.length} events (tight:${winExplained} loose:${winEvents.length - winExcess} excess:${winExcess}) | ` +
      `${winCredits.length} sim credits — ${[...winCreditSlugs.entries()].map(([s, n]) => `${s}:${n}`).join(', ')}`
  );
}

// Excess events detail
const excessEvents = allEvents
  .filter((e) => e.gapToNearestSec > LOOSE_THRESHOLD_SEC)
  .sort((a, b) => a.t - b.t);
console.log(
  `\n--- Excess events (gap > ${LOOSE_THRESHOLD_SEC}s from any sim credit) ---`
);
if (excessEvents.length === 0) {
  console.log(
    `  NONE — all events have a sim credit within ${LOOSE_THRESHOLD_SEC}s`
  );
} else {
  for (const e of excessEvents) {
    console.log(
      `  W${e.windowId} bin ${e.binIdx} t=${e.t.toFixed(3)}s delta=${e.delta} | ` +
        `nearest: ${e.nearestCreditSlug} ${e.nearestCreditKind} ` +
        `gap=${e.gapToNearestSec.toFixed(3)}s`
    );
  }
}

// Gap distribution
console.log(`\n--- Gap-to-nearest-credit distribution ---`);
const gaps = allEvents.map((e) => e.gapToNearestSec).sort((a, b) => a - b);
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

// Burst-cast proximity test: are excess events near burst-cast times?
// Burst casts happen at the START of each window (the FB that precedes the refill)
console.log(`\n--- Burst-cast proximity ---`);
for (const w of clsWindows) {
  if (!w.usable) {
    continue;
  }
  const winEvents = allEvents.filter((e) => e.windowId === w.id);
  const earlyEvents = winEvents.filter((e) => e.t - w.barPaint < 0.5);
  const lateEvents = winEvents.filter((e) => w.fullInstant - e.t < 0.5);
  console.log(
    `  W${w.id}: ${earlyEvents.length} events in first 0.5s, ${lateEvents.length} events in last 0.5s ` +
      `(of ${winEvents.length} total, ${w.durationSec.toFixed(1)}s window)`
  );
}

// Clustering: are events uniformly distributed within windows or clustered?
console.log(`\n--- Event temporal density ---`);
for (const w of clsWindows) {
  if (!w.usable) {
    continue;
  }
  const winEvents = allEvents.filter((e) => e.windowId === w.id);
  if (winEvents.length < 3) {
    continue;
  }
  const times = winEvents.map((e) => e.t - w.barPaint).sort((a, b) => a - b);
  const interGaps: number[] = [];
  for (let i = 1; i < times.length; i++) {
    interGaps.push(times[i] - times[i - 1]);
  }
  const meanGap = w.durationSec / winEvents.length;
  const cv =
    interGaps.length > 0
      ? Math.sqrt(
          interGaps.reduce((s, g) => s + (g - meanGap) ** 2, 0) /
            interGaps.length
        ) / meanGap
      : 0;
  console.log(
    `  W${w.id}: ${winEvents.length} events, meanGap=${(meanGap * 1000).toFixed(0)}ms, ` +
      `CV=${cv.toFixed(2)} (${cv > 1 ? 'clustered' : cv > 0.5 ? 'moderate' : 'uniform'})`
  );
}
