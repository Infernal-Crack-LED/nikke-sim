// board-read.ts — board-wide accuracy read: every unit's sim-vs-real ratio across all recorded
// comps, with datapoint count, ranked most-stable to least.
//
//   npx tsx scripts/board-read.ts
//
// Stability score = mean |ratio − 1| across the unit's datapoints (lower = closer to real AND
// tighter). Ties broken by more datapoints first. Uses the scope-lock basis (coreHitRate 1).
import { loadWorld, runOnce } from './battery/lib.js';
import { COMPS } from './experiment.js';

const w = loadWorld();
const perUnit: Record<string, { ratios: number[]; comps: string[] }> = {};

for (const c of COMPS) {
  const r = runOnce(w, { name: c.name, slugs: c.slugs }, c.boss, 1);
  for (const u of r.units) {
    const real = c.real[u.slug];
    if (real === undefined || real <= 0) continue;
    (perUnit[u.slug] ??= { ratios: [], comps: [] }).ratios.push(u.totalDamage / real);
    perUnit[u.slug].comps.push(c.name);
  }
}

type Row = { slug: string; n: number; mean: number; min: number; max: number; mad: number; ratios: number[] };
const rows: Row[] = Object.entries(perUnit).map(([slug, d]) => {
  const rs = d.ratios;
  const mean = rs.reduce((a, b) => a + b, 0) / rs.length;
  const mad = rs.reduce((a, b) => a + Math.abs(b - 1), 0) / rs.length; // mean abs deviation from 1.0
  return { slug, n: rs.length, mean, min: Math.min(...rs), max: Math.max(...rs), mad, ratios: rs };
});

// most stable first: lowest mean-abs-deviation-from-1.0, then more datapoints
rows.sort((a, b) => a.mad - b.mad || b.n - a.n);

const band = (mad: number) => (mad <= 0.03 ? '±3% ✓' : mad <= 0.05 ? '±5%' : mad <= 0.08 ? '±8%' : mad <= 0.15 ? '±15%' : '>15%');
console.log(`\n=== BOARD-WIDE ACCURACY READ (${rows.length} units with real data, ${COMPS.length} comps) ===`);
console.log(`ranked most-stable → least (stability = mean |ratio−1|, lower is better)\n`);
console.log('  #  unit                        N   mean   range          MAD    band    ratios');
console.log('  ─  ──────────────────────────  ──  ─────  ─────────────  ─────  ──────  ──────────────────────────');
rows.forEach((r, i) => {
  const rng = `${r.min.toFixed(2)}–${r.max.toFixed(2)}`;
  const rlist = r.ratios.map((x) => x.toFixed(2)).sort().join(' ');
  console.log(
    `  ${String(i + 1).padStart(2)}  ${r.slug.padEnd(26)}  ${String(r.n).padStart(2)}  ${r.mean.toFixed(3)}  ${rng.padEnd(13)}  ${r.mad.toFixed(3)}  ${band(r.mad).padEnd(6)}  ${rlist}`
  );
});

// summary buckets
const in3 = rows.filter((r) => r.mad <= 0.03).length;
const in5 = rows.filter((r) => r.mad <= 0.05).length;
const in8 = rows.filter((r) => r.mad <= 0.08).length;
const total = rows.reduce((a, r) => a + r.n, 0);
console.log(`\n  totals: ${total} datapoints across ${rows.length} units`);
console.log(`  within ±3% MAD: ${in3}  |  ±5%: ${in5}  |  ±8%: ${in8}  |  worse: ${rows.length - in8}`);
