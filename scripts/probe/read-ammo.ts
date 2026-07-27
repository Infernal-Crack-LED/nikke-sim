// Ammo-counter reader — the direct fire-cadence instrument, for EVERY weapon class.
//
// The ammo box is crosshair-anchored and slides across the frame as the boss changes band, so it
// is located per frame by the SAME proven template track the pellet counter uses
// (`ammo-box-template.png` + the `--max-template-disp` jump gate); this reader adds the digits.
// Reading is `cv2.matchTemplate` against a fixed-font digit atlas — deterministic, and it ABSTAINS
// instead of guessing. That matters: the fight timer is the same shape of problem (2-3 white digits
// on a fixed crop) and the VLM needed 12-17 corrections per 60 frames on it.
//
// WHY THIS READER EXISTS: `total = shots x damage-per-shot`, and this is the only instrument that
// measures the SHOTS half for every weapon class (the pellet counter is SG-only). FB counts measure
// gauge/second, NOT shots/second — a cadence question answered with FB counts cannot discriminate,
// which is exactly how the 2026-07-17 SMG 20->24 adoption went wrong. The counter settled it.
//
//   npx tsx scripts/probe/read-ammo.ts <video> [opts]
//     --fps <n>          sampling rate (default 10 — 0.1s resolution is ample for a slope fit)
//     --at <s> --dur <s> clip window (default: whole video)
//     --zoom <n>         extraction upscale (default 2 — MUST match the template's scale)
//     --crop "<ff>"      region containing the ammo box (default crop=1303:396:672:268)
//     --atlas <dir>      digit atlas (default scripts/probe/ammo-atlas)
//     --t0 <s>           videoT of the 03:00->02:59 flip, for fightT
//     --min-run <n>      min reads in a firing run before its cadence is reported (default 6)
//     --min-rounds <n>   min rounds a run must spend to count toward cadence (default 5; use 3 for SG)
//     --expect-rate <n>  print a PASS/FAIL against an expected rounds/s (validation runs)
//     --out <dir>        default $CLAUDE_SCRATCH|/tmp/ammo
//     --keep-frames      keep extracted frames
//
// TEMPORAL SANITY (free arithmetic closure, the same trick that makes total-damage self-checking):
// ammo is monotonically NON-INCREASING between reloads and only ever jumps UP at a reload. A read
// that rises mid-run without a reload-sized jump is a digit misread and is DISCARDED, not smoothed.
// Cadence then comes from a least-squares slope over each firing run, so a single dropped frame
// costs precision, never correctness.
//
// VALIDATED (2026-07-24) — SMG, `emma-claire-idollocean.MP4` (idoll-ocean focused), TWO range
// bands: 20.31/s (t=55-75) and 20.32/s (t=120-140), r2 = 1.00 on every firing run. That reproduces
// the hand read that settled the SMG cadence at 20.0 rounds/s (60fps frame quantization of a
// nominal 1440rpm), independently of it.
//
// KNOWN LIMIT — small-magazine SG is NOT yet readable. On `marciana-solo.MP4` only ~29% of frames
// yield a value and no firing run survives: her counter renders 1-2 digits (a ~9-round magazine,
// not a 120-round belt) and the box template locks weakly (conf ~0.43 vs ~0.73 on SMG). SG cadence
// already has the pellet counter, so this is a gap to close when it bites, not a blocker — but do
// NOT read an SG cadence off this script until it does.
//
// Output: <out>/ammo.json
//   { video, fps, reads[{videoT, fightT, ammo, minScore, rejected?}], reloads[{videoT, from, to}],
//     runs[{startT, endT, from, to, reads, roundsPerSec, r2}], cadence{overall, median, runs} }

import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PY = join(HERE, '.venv', 'bin', 'python3');
const WORKER = join(HERE, 'count-pellets.py');
const TEMPLATE = join(HERE, 'ammo-box-template.png');

const argv = process.argv.slice(2);
const video = argv[0];
const flags: Record<string, string> = {};
for (let i = 1; i < argv.length; i++) {
  if (argv[i].startsWith('--')) {
    flags[argv[i].slice(2)] =
      argv[i + 1]?.startsWith('--') || argv[i + 1] === undefined
        ? 'true'
        : argv[++i];
  }
}

if (!video || !existsSync(video)) {
  console.error(
    'usage: read-ammo.ts <video> [--fps 10] [--at S] [--dur S] [--zoom 2] [--crop "..."]\n' +
      '                        [--atlas DIR] [--t0 S] [--expect-rate N] [--out DIR] [--keep-frames]'
  );
  process.exit(1);
}

const fps = Number(flags.fps ?? 10);
const at = Number(flags.at ?? 0);
const dur = flags.dur ? Number(flags.dur) : 0;
const zoom = Number(flags.zoom ?? 2);
const crop = flags.crop ?? 'crop=1303:396:672:268';
const atlas = flags.atlas ?? join(HERE, 'ammo-atlas');
const t0 = flags.t0 && flags.t0 !== 'true' ? Number(flags.t0) : null;
// Defaults suit a fast weapon (SMG/AR/MG: 60-120 round belts). A slow, small-magazine weapon
// (SG ~10 rounds at ~1.5/s) needs --min-run 4 --min-rounds 3, or every run is filtered away.
const minRun = Number(flags['min-run'] ?? 6);
const minRounds = Number(flags['min-rounds'] ?? 5);
const expectRate =
  flags['expect-rate'] && flags['expect-rate'] !== 'true'
    ? Number(flags['expect-rate'])
    : null;
const outDir = flags.out ?? `${process.env.CLAUDE_SCRATCH ?? '/tmp'}/ammo`;

if (!existsSync(atlas)) {
  console.error(
    `no digit atlas at ${atlas}. Build one:\n` +
      `  <extract frames>\n` +
      `  ${PY} ${WORKER} <frames> --ammo-digits --build-atlas --max-template-disp 0 \\\n` +
      `    --ammo-template ${TEMPLATE} --ammo-atlas ${atlas} --labels "076,120,..."`
  );
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
const framesDir = `${outDir}/frames-ammo`;
rmSync(framesDir, { recursive: true, force: true });
mkdirSync(framesDir, { recursive: true });

const vf = [`fps=${fps}`, crop];
if (zoom !== 1) {
  vf.push(`scale=iw*${zoom}:ih*${zoom}`);
}
const a = ['-y', '-loglevel', 'error'];
if (at) {
  a.push('-ss', String(at));
}
if (dur) {
  a.push('-t', String(dur));
}
a.push('-i', video, '-vf', vf.join(','), `${framesDir}/f_%05d.png`);
console.log(
  `extracting @ ${fps}fps zoom ${zoom}${dur ? ` (${at}s +${dur}s)` : ' (whole video)'} ...`
);
execFileSync('ffmpeg', a, { stdio: ['ignore', 'ignore', 'inherit'] });
const nFrames = readdirSync(framesDir).filter((f) => f.endsWith('.png')).length;
if (!nFrames) {
  console.error('no frames extracted — check --at/--dur/--crop');
  process.exit(1);
}
console.log(`  ${nFrames} frames`);

console.log('reading digits (deterministic template match, no VLM) ...');
const rawJson = execFileSync(
  PY,
  [
    WORKER,
    framesDir,
    '--ammo-digits',
    '--ammo-template',
    TEMPLATE,
    '--ammo-atlas',
    atlas,
    '--digit-score-min',
    String(flags['digit-score-min'] ?? 0.6),
  ],
  { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'inherit'] }
);
interface WorkerRead {
  file: string;
  ammo: number | null;
  scores?: number[];
  boxConf?: number;
  reason?: string;
}
const worker = JSON.parse(rawJson) as WorkerRead[];

interface Read {
  videoT: number;
  fightT: number | null;
  ammo: number | null;
  minScore: number | null;
  boxConf: number | null;
  rejected?: string;
}
const reads: Read[] = worker.map((w) => {
  const idx = parseInt(w.file.replace(/\D/g, ''), 10);
  const videoT = Math.round((at + (idx - 1) / fps) * 1000) / 1000;
  return {
    videoT,
    fightT: t0 == null ? null : Math.round((videoT - t0) * 100) / 100,
    ammo: w.ammo ?? null,
    minScore: w.scores?.length ? Math.min(...w.scores) : null,
    boxConf: w.boxConf ?? null,
  };
});

// ---- temporal sanity: non-increasing between reloads; a rise without a reload is a misread ----
const RELOAD_JUMP = 5; // a reload restores a whole magazine; a misread rises by a digit or two
const reloads: { videoT: number; from: number; to: number }[] = [];
let prev: Read | null = null;
for (const r of reads) {
  if (r.ammo == null) {
    continue;
  }
  if (prev == null) {
    prev = r;
    continue;
  }
  const pa = prev.ammo as number;
  const d = r.ammo - pa;
  if (d > 0 && d < RELOAD_JUMP) {
    // rose, but not by a magazine — the counter cannot do that, so this read is wrong
    r.rejected = `non-monotonic (+${d} without a reload)`;
    r.ammo = null;
    continue;
  }
  if (d >= RELOAD_JUMP) {
    reloads.push({ videoT: r.videoT, from: pa, to: r.ammo });
  }
  prev = r;
}

// ---- firing runs: maximal strictly-decreasing stretches; slope = rounds/second ----
interface Run {
  startT: number;
  endT: number;
  from: number;
  to: number;
  reads: number;
  roundsPerSec: number;
  r2: number;
}
const runs: Run[] = [];
let cur: Read[] = [];
const flush = () => {
  if (cur.length >= minRun) {
    const xs = cur.map((r) => r.videoT);
    const ys = cur.map((r) => r.ammo as number);
    const n = xs.length;
    const mx = xs.reduce((s, v) => s + v, 0) / n;
    const my = ys.reduce((s, v) => s + v, 0) / n;
    let sxy = 0,
      sxx = 0,
      syy = 0;
    for (let i = 0; i < n; i++) {
      sxy += (xs[i] - mx) * (ys[i] - my);
      sxx += (xs[i] - mx) ** 2;
      syy += (ys[i] - my) ** 2;
    }
    const slope = sxx ? sxy / sxx : 0;
    if (slope < 0) {
      runs.push({
        startT: xs[0],
        endT: xs[n - 1],
        from: ys[0],
        to: ys[n - 1],
        reads: n,
        roundsPerSec: Math.round(-slope * 100) / 100,
        r2: syy ? Math.round(((sxy * sxy) / (sxx * syy)) * 1000) / 1000 : 1,
      });
    }
  }
  cur = [];
};
for (const r of reads) {
  if (r.ammo == null) {
    continue;
  }
  const last = cur[cur.length - 1];
  // a run ends at a reload, at a gap in readable frames, or if the value stops falling
  if (
    last &&
    (r.ammo > (last.ammo as number) || r.videoT - last.videoT > 3 / fps)
  ) {
    flush();
  }
  cur.push(r);
}
flush();

// A run where the counter barely moved carries almost no rate information; weight by rounds spent.
const firing = runs.filter((r) => r.from - r.to >= minRounds && r.r2 >= 0.9);
const weight = firing.reduce((s, r) => s + (r.from - r.to), 0);
const overall = weight
  ? Math.round(
      (firing.reduce((s, r) => s + r.roundsPerSec * (r.from - r.to), 0) /
        weight) *
        100
    ) / 100
  : null;
const sorted = firing.map((r) => r.roundsPerSec).sort((x, y) => x - y);
const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;

const okReads = reads.filter((r) => r.ammo != null).length;
const result = {
  video,
  fps,
  at,
  dur: dur || null,
  zoom,
  crop,
  atlas,
  t0,
  framesProcessed: reads.length,
  readOk: okReads,
  readRate: Math.round((okReads / Math.max(1, reads.length)) * 1000) / 1000,
  rejected: reads.filter((r) => r.rejected).length,
  reads,
  reloads,
  runs,
  cadence: {
    overall,
    median,
    firingRuns: firing.length,
    roundsCounted: weight,
  },
};
writeFileSync(`${outDir}/ammo.json`, JSON.stringify(result, null, 2) + '\n');

console.log(`\nwrote ${outDir}/ammo.json`);
console.log(
  `  ${okReads}/${reads.length} frames read (${(result.readRate * 100).toFixed(1)}%), ` +
    `${result.rejected} rejected by monotonicity, ${reloads.length} reloads`
);
console.log(
  `  firing runs: ${firing.length} (>=${minRounds} rounds, r2>=0.9), ${weight} rounds counted`
);
for (const r of firing.slice(0, 12)) {
  console.log(
    `    ${r.startT.toFixed(1)}-${r.endT.toFixed(1)}s  ${r.from}->${r.to}  ${r.roundsPerSec.toFixed(2)}/s  (r2 ${r.r2})`
  );
}
if (firing.length > 12) {
  console.log(`    ... and ${firing.length - 12} more`);
}
console.log(
  `  CADENCE: overall ${overall ?? '?'} rounds/s   median ${median ?? '?'} rounds/s`
);
if (expectRate != null && overall != null) {
  console.log(
    `  ${Math.abs(overall - expectRate) <= 0.5 ? 'PASS' : 'FAIL'} — expected ~${expectRate}/s, measured ${overall}/s`
  );
}

if (flags['keep-frames'] !== 'true') {
  rmSync(framesDir, { recursive: true, force: true });
}
