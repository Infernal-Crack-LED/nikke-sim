// board-read.ts — board-wide accuracy read: every unit's sim-vs-real ratio across all recorded
// comps, with datapoint count, ranked most-stable to least.
//
//   npx tsx scripts/board-read.ts
//
// Stability score = mean |ratio − 1| across the unit's datapoints (lower = closer to real AND
// tighter). Ties broken by more datapoints first. Uses the scope-lock basis (coreHitRate 1).
// Reading collection lives in scripts/lib/board-readings.ts (shared with kit-status.ts).
import { bandLabel, boardStats, collectBoardReadings, COMPS, tempLabel } from './lib/board-readings.js';

const perUnit = collectBoardReadings();

type Row = { slug: string; n: number; mean: number; min: number; max: number; mad: number; ratios: number[] };
const rows: Row[] = Object.entries(perUnit).map(([slug, records]) => {
  const s = boardStats(records);
  return { slug, n: s.n, mean: s.mean, min: s.min, max: s.max, mad: s.mad, ratios: records.map((r) => r.ratio) };
});

// most stable first: lowest mean-abs-deviation-from-1.0, then more datapoints
rows.sort((a, b) => a.mad - b.mad || b.n - a.n);

// direction label — the ratio is sim/real, so >1 means the SIM is too high (HOT), <1 too low (COLD).
// This tag is printed on every row so the ratio's meaning can never be misread (root-cause fix for a
// past sim/real-vs-real/sim convention inversion — see docs/CONVENTIONS.md "ratio direction").
console.log(`\n=== BOARD-WIDE ACCURACY READ (${rows.length} units with real data, ${COMPS.length} comps) ===`);
console.log(`RATIO = sim / real.  >1 = HOT ▲ (sim OVER-models, fix = REMOVE damage).  <1 = COLD ▼ (sim UNDER-models, fix = ADD damage).`);
console.log(`(NB: solo probe-data recons use the OPPOSITE field 'realOverSim' — >1 = COLD there. Do not conflate.)`);
console.log(`ranked most-stable → least (stability = mean |ratio−1|, lower is better)\n`);
console.log('  #  unit                        N   mean   temp    range          MAD    band    ratios');
console.log('  ─  ──────────────────────────  ──  ─────  ──────  ─────────────  ─────  ──────  ──────────────────────────');
rows.forEach((r, i) => {
  const rng = `${r.min.toFixed(2)}–${r.max.toFixed(2)}`;
  const rlist = r.ratios.map((x) => x.toFixed(2)).sort().join(' ');
  console.log(
    `  ${String(i + 1).padStart(2)}  ${r.slug.padEnd(26)}  ${String(r.n).padStart(2)}  ${r.mean.toFixed(3)}  ${tempLabel(r.mean).padEnd(6)}  ${rng.padEnd(13)}  ${r.mad.toFixed(3)}  ${bandLabel(r.mad).padEnd(6)}  ${rlist}`
  );
});

// summary buckets
const in3 = rows.filter((r) => r.mad <= 0.03).length;
const in5 = rows.filter((r) => r.mad <= 0.05).length;
const in8 = rows.filter((r) => r.mad <= 0.08).length;
const total = rows.reduce((a, r) => a + r.n, 0);
console.log(`\n  totals: ${total} datapoints across ${rows.length} units`);
console.log(`  within ±3% MAD: ${in3}  |  ±5%: ${in5}  |  ±8%: ${in8}  |  worse: ${rows.length - in8}`);
