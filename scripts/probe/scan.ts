// Deterministic CV scan of a probe recording — burst-gauge states, Full-Burst splash, burst-bar
// drops, nuke/laser signatures. NO VLM anywhere in this reader: every number is a fixed-threshold
// pixel measurement, so it is repeatable and it never hallucinates. This is the independent
// instrument for FULL-BURST COUNTS (the measurement that becomes a scripts/regression.ts assert).
//
//   npx tsx scripts/probe/scan.ts <video> [opts]
//     --fps <n>            sampling rate (default 5 — the stage hexagon shows for ~0.4s, so >=4
//                          is required to catch every burst chain; 5 gives 2-3 looks)
//     --at <s> --dur <s>   clip window (default: whole video)
//     --out <dir>          scratch dir for frames + scan.json (default $CLAUDE_SCRATCH|/tmp/scan)
//     --keep-frames        keep the extracted frames (default: deleted after the scan)
//     --debug-dir <dir>    save an annotated crop for every stage-hexagon hit
//     --gauge-crop "<ff>"  override crop=188:82:2428:448
//     --bar-crop "<ff>"    override crop=200:14:2420:478   (team burst bar)
//     --solo-crop "<ff>"   override crop=142:12:2470:488   (solo/2-unit BURST meter)
//     --no-bar             skip the burst-bar detector
//     --t0 <s>             video time of the 03:00->02:59 flip (game t0). Given it, every event
//                          also carries fightT. Without it only videoT is reported.
//     --expect <n>         expected Full Burst count — prints a PASS/FAIL line (validation runs)
//
// FULL-BURST DETECTION — three independent detectors, merged (PROVE-IT-DIFFERENTLY):
//   gauge   the RED stage-3 hexagon in the burst-gauge crop. One per burst chain; the Full Burst
//           follows the B3 cast within ~0.3s. Sharpest of the three (a saturated blob on a fixed
//           sub-crop), and it also gives the chain anatomy (stage1 -> stage2 -> stage3 times).
//   splash  the golden burst-SEQUENCE flash over the whole frame (>=0.11 yellow on a 64x30
//           downscale). The documented, 2026-07-14-calibrated recipe.
//   bar     the team burst bar going >=95% -> <50% as the chain consumes it.
// Candidates within --cluster (default 4s) of each other are ONE event; the merged list keeps
// every cluster and records which detectors saw it, so a 3/3 cluster is a confirmed Full Burst
// and a 1/3 cluster is flagged for review rather than silently counted.
//
// Output: <out>/scan.json
//   { video, fps, at, dur, t0, gaugeStates[], fbCandidates[{videoT, fightT, sources[], confidence}],
//     burstChains[], nukeEvents[], summary{...} }

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PY = join(HERE, '.venv', 'bin', 'python3');
const WORKER = join(HERE, 'scan-frames.py');

const argv = process.argv.slice(2);
const video = argv[0];
const flags: Record<string, string> = {};
for (let i = 1; i < argv.length; i++)
  if (argv[i].startsWith('--'))
    flags[argv[i].slice(2)] =
      argv[i + 1]?.startsWith('--') || argv[i + 1] === undefined ? 'true' : argv[++i];

if (!video || !existsSync(video)) {
  console.error(
    'usage: scan.ts <video> [--fps 5] [--at S] [--dur S] [--out DIR] [--t0 S] [--expect N]\n' +
      '                      [--keep-frames] [--debug-dir DIR] [--no-bar] [--cluster 4]',
  );
  process.exit(1);
}
if (!existsSync(PY)) {
  console.error(`missing python venv at ${PY} — see scripts/probe/.venv (numpy + PIL + cv2)`);
  process.exit(1);
}

const fps = Number(flags.fps ?? 5);
const at = Number(flags.at ?? 0);
const dur = flags.dur ? Number(flags.dur) : 0;
const t0 = flags.t0 && flags.t0 !== 'true' ? Number(flags.t0) : null;
const expect = flags.expect && flags.expect !== 'true' ? Number(flags.expect) : null;
const cluster = Number(flags.cluster ?? 4);
const minGap = Number(flags['min-gap'] ?? 10);
const outDir = flags.out ?? `${process.env.CLAUDE_SCRATCH ?? '/tmp'}/scan`;
const gaugeCrop = flags['gauge-crop'] ?? 'crop=188:82:2428:448';
const barCrop = flags['bar-crop'] ?? 'crop=200:14:2420:478';
const soloCrop = flags['solo-crop'] ?? 'crop=142:12:2470:488';
const wantBar = flags['no-bar'] !== 'true';

mkdirSync(outDir, { recursive: true });
const dirs = {
  gauge: `${outDir}/frames-gauge`,
  splash: `${outDir}/frames-splash`,
  bar: `${outDir}/frames-bar`,
  solo: `${outDir}/frames-solo`,
};
for (const d of Object.values(dirs)) {
  rmSync(d, { recursive: true, force: true });
  mkdirSync(d, { recursive: true });
}

// ---- ONE ffmpeg pass, four outputs (a whole-video decode is the expensive part) ----
const chain =
  `[0:v]fps=${fps},split=4[a][b][c][d];` +
  `[a]scale=64:30[s1];` +
  `[b]${gaugeCrop}[s2];` +
  `[c]${barCrop}[s3];` +
  `[d]${soloCrop}[s4]`;
const args = ['-y', '-loglevel', 'error'];
if (at) args.push('-ss', String(at));
if (dur) args.push('-t', String(dur));
args.push(
  '-i', video,
  '-filter_complex', chain,
  '-map', '[s1]', `${dirs.splash}/f_%05d.png`,
  '-map', '[s2]', `${dirs.gauge}/f_%05d.png`,
  '-map', '[s3]', `${dirs.bar}/f_%05d.png`,
  '-map', '[s4]', `${dirs.solo}/f_%05d.png`,
);
console.log(`extracting @ ${fps}fps${dur ? ` (${at}s +${dur}s)` : ' (whole video)'} — one decode ...`);
const tExtract = Date.now();
execFileSync('ffmpeg', args, { stdio: ['ignore', 'ignore', 'inherit'] });
console.log(`  extracted in ${((Date.now() - tExtract) / 1000).toFixed(1)}s`);

// ---- run the CV worker ----
const rawPath = `${outDir}/scan-raw.json`;
const wArgs = [
  WORKER, '--fps', String(fps), '--at', String(at),
  '--gauge-dir', dirs.gauge, '--splash-dir', dirs.splash,
  '--min-gap', String(minGap), '--out', rawPath,
];
if (wantBar) wArgs.push('--bar-dir', dirs.bar, '--solo-dir', dirs.solo);
if (flags['debug-dir'] && flags['debug-dir'] !== 'true') wArgs.push('--debug-dir', flags['debug-dir']);
const tScan = Date.now();
execFileSync(PY, wArgs, { stdio: ['ignore', 'inherit', 'inherit'] });
console.log(`  scanned in  ${((Date.now() - tScan) / 1000).toFixed(1)}s`);

interface Ev { t: number; [k: string]: number | string }
interface GaugeFrame { t: number; state: string | null; fill: number; hexG: number; hexY: number; hexR: number; flood: number }
interface FullWindow { start: number; end: number; durationSec: number; peakFill: number; partial: boolean }
const raw = JSON.parse(readFileSync(rawPath, 'utf8')) as {
  gauge?: { frames: GaugeFrame[]; events: Ev[]; fullWindows: FullWindow[] };
  splash?: { frames: Ev[]; events: Ev[] };
  nuke?: { events: Ev[] };
  bar?: { frames: Ev[]; events: Ev[] };
  solo?: { frames: Ev[]; events: Ev[] };
  thresholds: Record<string, number>;
};

const fightT = (t: number) => (t0 == null ? null : Math.round((t - t0) * 100) / 100);

// ---- burst chains: group the stage hexagons into I -> II -> III cycles ----
type Chain = { stage1: number | null; stage2: number | null; stage3: number | null };
const stageEvents = (raw.gauge?.events ?? []) as { t: number; state: string }[];
const chains: Chain[] = [];
let cur: Chain | null = null;
for (const e of stageEvents) {
  const k = e.state as keyof Chain;
  // A chain starts at its stage1, or wherever a stage repeats (a chain never casts a stage twice).
  if (!cur || e.state === 'stage1' || cur[k] != null) {
    if (cur) chains.push(cur);
    cur = { stage1: null, stage2: null, stage3: null };
  }
  cur[k] = e.t;
}
if (cur) chains.push(cur);

// ---- merge the three FB detectors ----
// THE DRAIN WINDOW IS THE SPINE. It read the measured count EXACTLY on all 7 validation
// recordings (2026-07-24, see docs/probe-runs.md), it is an ~8.5s signal rather than a flash so
// sampling rate cannot miss it, and it carries its own plausibility checks (uniform duration,
// peak fill ~0.95, >=12s spacing). `splash` is a WHOLLY SEPARATE screen region and so is the real
// independent cross-check — but it degrades on bright/washed backgrounds (5/13 on the LM control),
// which is why it corroborates rather than gates. `hex` is a third, weaker look at the same widget
// as the drain (a 0.4s colour blob; ~80% recall). The burst-bar/solo crops are SUB-STRIPS of the
// gauge crop, so they are diagnostics only — a fourth "vote" from the same pixels is not evidence.
//
// Events are matched to a window by PHYSICS, not a fixed radius: the golden splash fires during
// the Full Burst, and the stage-3 hexagon fires in the seconds BEFORE it (B3 cast -> cut-in -> FB).
type Src = 'drain' | 'splash' | 'hex';
const windows = raw.gauge?.fullWindows ?? [];
const splashEv = (raw.splash?.events ?? []).map((e) => ({ t: e.t, used: false }));
const hexEv = stageEvents.filter((e) => e.state === 'stage3').map((e) => ({ t: e.t, used: false }));

interface Cand {
  videoT: number; fightT: number | null; sources: Src[]; confidence: number;
  perSource: Partial<Record<Src, number>>; durationSec?: number; peakFill?: number;
}
const cands: Cand[] = windows.map((w) => {
  const perSource: Partial<Record<Src, number>> = { drain: w.start };
  const sp = splashEv.find((e) => !e.used && e.t >= w.start - cluster && e.t <= w.end + 1);
  if (sp) { sp.used = true; perSource.splash = sp.t; }
  const hx = hexEv.find((e) => !e.used && e.t >= w.start - 2 * cluster && e.t <= w.start + cluster);
  if (hx) { hx.used = true; perSource.hex = hx.t; }
  const sources = Object.keys(perSource).sort() as Src[];
  return {
    videoT: w.start, fightT: fightT(w.start), sources,
    confidence: Math.round((sources.length / 3) * 100) / 100,
    perSource, durationSec: w.durationSec, peakFill: w.peakFill,
  };
});

// Events that matched NO window: either the gauge widget failed to render for that burst, or the
// event is a false positive (cut-in echo). Surfaced, never silently folded into the count.
const orphans = [
  ...splashEv.filter((e) => !e.used).map((e) => ({ videoT: e.t, fightT: fightT(e.t), source: 'splash' as Src })),
  ...hexEv.filter((e) => !e.used).map((e) => ({ videoT: e.t, fightT: fightT(e.t), source: 'hex' as Src })),
].sort((a, b) => a.videoT - b.videoT);

// Fallback: no gauge widget at all (wrong crop / odd resolution) — splash alone, loudly flagged.
const gaugeMissing = windows.length === 0;
const confirmed: Cand[] = gaugeMissing
  ? (raw.splash?.events ?? []).map((e) => ({
      videoT: e.t, fightT: fightT(e.t), sources: ['splash'] as Src[], confidence: 0.33,
      perSource: { splash: e.t },
    }))
  : cands;
const corroborated = confirmed.filter((c) => c.sources.length >= 2).length;
const byCount = (s: Src) => confirmed.filter((c) => c.sources.includes(s)).length;
const gaps = confirmed.slice(1).map((c, i) => Math.round((c.videoT - confirmed[i].videoT) * 10) / 10);

const result = {
  video, fps, at, dur: dur || null, t0,
  thresholds: raw.thresholds,
  detectors: { drain: byCount('drain'), splash: byCount('splash'), hex: byCount('hex') },
  gaugeStates: (raw.gauge?.frames ?? []).map((f) => ({
    videoT: f.t, fightT: fightT(f.t), state: f.state, fill: f.fill,
  })),
  burstChains: chains.map((c) => ({
    stage1: c.stage1, stage2: c.stage2, stage3: c.stage3,
    fightT: c.stage3 != null ? fightT(c.stage3) : null,
  })),
  fbCandidates: confirmed,
  orphanEvents: orphans,
  // rendered widths, NOT the game's Full Burst duration: the bar's last ~1.5s is too narrow to
  // register a column, so a nominal 10s window reads ~8.2s. Useful for RELATIVE comparison
  // (an FB extension shows as a longer window), never as an absolute duration measurement.
  fullWindows: windows,
  nukeEvents: (raw.nuke?.events ?? []).map((e) => ({
    videoT: e.t, fightT: fightT(e.t), blue: e.blue,
    nearFullBurst: confirmed.some((c) => Math.abs(c.videoT - e.t) <= 5),
  })),
  diagnostics: { barDrops: raw.bar?.events ?? [], soloDrops: raw.solo?.events ?? [] },
  summary: {
    fullBursts: confirmed.length,
    corroborated,
    gaps,
    minGap: gaps.length ? Math.min(...gaps) : null,
    maxGap: gaps.length ? Math.max(...gaps) : null,
    orphanCount: orphans.length,
    gaugeMissing,
  },
};
writeFileSync(`${outDir}/scan.json`, JSON.stringify(result, null, 2) + '\n');

console.log(`\nwrote ${outDir}/scan.json`);
console.log(`  detectors: drain=${result.detectors.drain}  splash=${result.detectors.splash}  hex(stage3)=${result.detectors.hex}`);
console.log(`  FULL BURSTS: ${confirmed.length}   (${corroborated}/${confirmed.length} corroborated by a 2nd detector)`);
console.log(`  gaps: ${gaps.join(', ')}`);
if (gaugeMissing)
  console.log('  ⚠ NO gauge widget found — the crop is wrong for this resolution, so this is a ' +
    'SPLASH-ONLY count with no cross-check. Fix --gauge-crop before using it.');
if (orphans.length)
  console.log(`  ⚠ ${orphans.length} event(s) matched no Full Burst window (missed render, or a false positive): ` +
    orphans.map((o) => `${o.videoT}(${o.source})`).join(', '));
if (result.summary.minGap != null && result.summary.minGap < minGap)
  console.log(`  ⚠ min gap ${result.summary.minGap}s < ${minGap}s — a cut-in false positive is likely`);
if (result.summary.maxGap != null && result.summary.minGap != null && result.summary.maxGap > 2 * result.summary.minGap)
  console.log(`  ⚠ max gap ${result.summary.maxGap}s is >2x the min ${result.summary.minGap}s — a missed Full Burst is likely`);
const nukes = result.nukeEvents.filter((n) => !n.nearFullBurst).length;
if (result.nukeEvents.length)
  console.log(`  nuke/laser: ${result.nukeEvents.length} blue events (${nukes} away from a full burst; the rest are cut-in flashes)`);
if (expect != null)
  console.log(`  ${confirmed.length === expect ? 'PASS' : 'FAIL'} — expected ${expect}, scanned ${confirmed.length}`);

if (flags['keep-frames'] !== 'true') for (const d of Object.values(dirs)) rmSync(d, { recursive: true, force: true });
