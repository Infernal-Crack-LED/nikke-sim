// Inter-FB window anatomy dump — per-bucket burst-gauge generation + events between Full Bursts.
//
// Built 2026-08-21 for the iron-sweep (run G) cycle-structure finding (docs/probe-runs.md
// 2026-08-21 entry; docs/handoffs/2026-08-21-irong-cycle-structure.md): with the credit
// schedule endpoint-exact, the FB-count miss localized to cycle STRUCTURE — refill windows
// stretching when SR reloads land inside them. This dump is the per-window evidence table:
// 0.5s buckets from fullBurstEnd to the next fullBurstStart, gauge credited per unit per bucket
// (from the ENDPOINT-EXACT credit schedule — the same numbers the engine's gaugeGenerated sums
// to), plus casts, debuff applications, reloads, and the bar-full instant (reconstructed from the
// credits' own cumulative — the chain gate runs before weapon firing within its frame, so the
// fill frame is the last unlocked one).
//
//   npx tsx scripts/battery/interburst-window-dump.ts "<off-comp name>" [--bucket 0.5]
//     --unit <slug>   reload-overlap table for one unit (default: every unit)
//
// Gauge values decode (SR/RL units, iron sweep): +5.6 = one uncharged shot or one
// applicationGauge credit; focus ×2.5 (maxwell) = +14.0; liberalio's pull = shot 5.6 + her
// gaugeHits:5 rider's 5 × 5.6 = +33.6.

import { COMPS, run } from '../experiment.js';
import { creditScheduleFor } from './fb-count-matrix.js';

const compArg = process.argv[2];
if (!compArg || compArg.startsWith('--')) {
  console.error(
    'usage: interburst-window-dump.ts "<off-comp name>" [--bucket 0.5] [--unit slug]'
  );
  process.exit(1);
}
const bucketSec = Number(
  process.argv.find((a) => a.startsWith('--bucket='))?.split('=')[1] ?? 0.5
);
const unitFilter = process.argv
  .find((a) => a.startsWith('--unit='))
  ?.split('=')[1];

const FPS = 60;
const BUCKET_F = Math.round(bucketSec * FPS);

// OFF-registry resolution (footage slot order) lives in fb-count-matrix; reuse its comp shapes
// via creditScheduleFor's own report rather than re-deriving them here.
const rep = creditScheduleFor(compArg, { exactSamples: 0, dbgGauge: false });
const ORDER = rep.slugs as string[];
const base = COMPS.find((c) => sameRoster(c.slugs, ORDER));
if (!base) {
  throw new Error(`no experiment comp matching ${ORDER.join(',')}`);
}
const comp = { ...base, slugs: ORDER, focus: undefined };

function sameRoster(a: string[], b: string[]): boolean {
  return a.length === b.length && [...a].sort().join() === [...b].sort().join();
}

const SHORT: Record<string, string> = {};
for (const s of ORDER) {
  SHORT[s] = s.toUpperCase().slice(0, 3);
}

import type { SimEvent } from '../../src/types.js';
const events: SimEvent[] = [];
run(comp, {}, undefined, (ev) => events.push(ev));

const fbEnds = events
  .filter((e) => e.kind === 'fullBurstEnd')
  .map((e) => e.frame);
const fbStarts = events
  .filter((e) => e.kind === 'fullBurstStart')
  .map((e) => e.frame);
const spans = fbEnds.map((f) => {
  const next = fbStarts.find((x) => x > f);
  const complete = next !== undefined;
  const to = complete ? next : 180 * FPS; // truncated tail: fight ends before the next FB
  return { from: f, to, len: to - f, complete };
});

for (const s of spans) {
  if (!Number.isFinite(s.len) || s.len <= 0) {
    throw new Error(
      `bad inter-FB span at frame ${s.from}: len=${s.len} — fullBurstStart/End event pairing broke`
    );
  }
}

console.log(`\n===== INTER-FB WINDOW ANATOMY — ${compArg} =====`);
console.log(
  `slot order (footage): ${ORDER.join(' · ')}  —  buckets of ${bucketSec}s\n`
);

for (const [wi, span] of spans.entries()) {
  const tag = span.complete
    ? ''
    : '  [TRUNCATED — fight ends before the next FB starts]';
  console.log(
    `-- window ${wi}: FB end t=${(span.from / FPS).toFixed(2)}s → next FB start t=${(span.to / FPS).toFixed(2)}s, span ${(span.len / FPS).toFixed(2)}s${tag}`
  );
  const inSpan = events.filter(
    (e) => e.frame >= span.from && e.frame < span.to
  );
  let acc = 0;
  let fullFrame = -1;
  for (const c of rep.credits
    .filter((c) => c.frame >= span.from && c.frame < span.to)
    .sort((a, b) => a.frame - b.frame)) {
    acc += c.amount;
    if (acc >= 100 - 1e-9) {
      fullFrame = c.frame;
      break;
    }
  }
  const buckets = Math.ceil(span.len / BUCKET_F);
  for (let b = 0; b < buckets; b++) {
    const f0 = span.from + b * BUCKET_F;
    const f1 = Math.min(f0 + BUCKET_F, span.to);
    const rows: string[] = [];
    let tot = 0;
    for (const s of ORDER) {
      const g = rep.credits
        .filter((c) => c.slug === s && c.frame >= f0 && c.frame < f1)
        .reduce((a, c) => a + c.amount, 0);
      if (g > 0.001) {
        rows.push(`${SHORT[s]} +${g.toFixed(1)}`);
        tot += g;
      }
    }
    const evs: string[] = [];
    if (b === 0) {
      evs.push('FB ENDS, bar empty');
    }
    for (const e of inSpan.filter((e) => e.frame >= f0 && e.frame < f1)) {
      if (e.kind === 'burstCast') {
        evs.push(`B${e.stage} CAST ${SHORT[e.slug] ?? e.slug}`);
      } else if (e.kind === 'buffApply' && e.targetSlug === null) {
        const [u, slot] = e.key.split(':');
        const locked = fullFrame >= 0 && e.frame > fullFrame;
        evs.push(
          `${SHORT[ORDER[Number(u)]] ?? u} ${slot} debuff applies${locked ? ' (post-fill, locked: no gauge)' : ' (credits applicationGauge)'}`
        );
      } else if (e.kind === 'reload') {
        evs.push(`${SHORT[e.slug]} reload completes`);
      }
    }
    if (fullFrame >= 0 && fullFrame >= f0 && fullFrame < f1) {
      evs.push('BAR FULL → chain opens (stage 1)');
    }
    const t0 = ((f0 - span.from) / FPS).toFixed(1);
    const t1 = ((f1 - span.from) / FPS).toFixed(1);
    console.log(
      `  +${t0}-${t1}s  gauge ${tot ? '+' + tot.toFixed(1).padStart(5) : '   —  '}  ${rows.join(', ')}${evs.length ? '  | ' + evs.join('; ') : ''}`
    );
  }
}

console.log(
  '\nall inter-FB spans (s):',
  spans.map((s) => (s.len / FPS).toFixed(2)).join(' ')
);

// ---- reload overlap: which windows each unit spends part of mid-reload ----
import data from '../../data/characters.json' with { type: 'json' };
const chars = data.characters as Record<
  string,
  { reloadFrames: number; ammo: number; chargeFrames?: number }
>;
console.log('\n===== RELOAD OVERLAP PER WINDOW =====');
for (const slug of ORDER) {
  if (unitFilter && slug !== unitFilter) {
    continue;
  }
  const reloadF = chars[slug]?.reloadFrames ?? 0;
  const reloads = events
    .filter((e) => e.kind === 'reload' && e.slug === slug)
    .map((e) => ({ start: e.frame - reloadF, end: e.frame }));
  const marks = spans.map((s) => {
    let overlap = 0;
    for (const r of reloads) {
      overlap += Math.max(0, Math.min(s.to, r.end) - Math.max(s.from, r.start));
    }
    return (overlap / FPS).toFixed(2);
  });
  console.log(
    `${slug} (ammo ${chars[slug]?.ammo}, reload ${reloadF}f, charge ${chars[slug]?.chargeFrames ?? '—'}f):`
  );
  console.log(
    `  reload completes (s): ${reloads.map((r) => (r.end / FPS).toFixed(2)).join(' ')}`
  );
  console.log(`  overlap per window (s): ${marks.join(' ')}`);
}
