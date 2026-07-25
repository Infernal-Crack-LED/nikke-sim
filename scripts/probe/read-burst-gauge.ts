// Burst-gauge state reader. Samples the burst gauge HUD element and classifies its state per
// frame, then reports a burst-state timeline you can compare to the sim's burst rotation.
//
// TWO CLASSIFIERS OVER ONE SHELL (--classifier cv|vlm) — the crops, debounce, timer spine,
// `fightT` re-anchoring and `--sim` compare are shared, so the two are directly comparable and
// together they are the PROVE-IT-DIFFERENTLY pair for a burst timeline.
//
//   cv  (DEFAULT) — deterministic pixel measurement via scripts/probe/scan.ts. Validated
//                   2026-07-24 against 7 recordings with independently measured Full Burst
//                   counts (11/12/13/13/13/13/14) plus the soda-twinkling-bunny control (10): EXACT on all 8,
//                   every burst corroborated by a second detector. No model, ~12s per video.
//   vlm           — the original Qwen2.5-VL per-frame read. RETAINED for A/B only: on a 30s LM
//                   control window it reported SIX transitions into `full` (a Full Burst is a 10s
//                   window and they are 13-34s apart, so at most ~2 fit) and its timer spine needs
//                   12-17 corrections per 60 frames. Do NOT count full bursts off it.
//
// Burst gauge states (owner-confirmed 2026-07-24):
//   filling  — gray bar + white fill (burst gauge accumulating, no burst available)
//   stage1   — green bar with roman numeral I (B1 ready)
//   stage2   — yellow bar with roman numeral II (B2 ready)
//   stage3   — red bar with roman numeral III (B3 ready)
//   full     — blinking, draining red bar with NO numeral (Full Burst active, 10s window)
//
// ⚠ The CV classifier does NOT emit `filling`: the burst gauge CHARGING is not rendered inside
// this crop (measured 2026-07-24 — the widget is absent between cycles, and the bar that IS drawn
// DRAINS rather than fills). It emits `full` for the draining bar and stage1/2/3 for the chain
// hexagons, and `null` where the widget is absent. The VLM classifier emits `filling` because it
// was asked to choose from the list above; that is a prompt artifact, not an observation.
//
// PIXEL-PERFECT CROP (2622x1206 source — the standard recording resolution):
//   The burst gauge sits at a FIXED screen position every fight. Coordinates measured from an
//   annotated screenshot (cyan bounding box):
//     gauge: inner x=2428..2615, y=448..529  -> crop=188:82:2428:448
//     timer: inner x=2317..2375, y=21..59    -> crop=59:39:2317:21  (shared with read-total-damage)
//   Override with --gauge-crop / --timer-crop for non-standard resolutions.
//
//   npx tsx scripts/probe/read-burst-gauge.ts <video> [opts]
//     --classifier cv|vlm   per-frame classifier (default cv — see above)
//     --fps <n>             sampling rate (default 5 for cv / 2 for vlm. The stage hexagon shows
//                           for ~0.4s, so the CV path needs >=4 to catch every burst chain)
//     --at <s> --dur <s>    clip window (default: whole video)
//     --endpoint <url>      OpenAI-compatible base (default http://localhost:8090/v1)
//     --model <name>        model field (default qwen2.5-vl)
//     --apikey <k>          bearer token (default no-key)
//     --gauge-crop "<ff>"   override the burst-gauge crop (default crop=188:82:2428:448)
//     --timer-crop "<ff>"   override the timer crop (default crop=59:39:2317:21)
//     --gauge-zoom <n>      upscale factor for the gauge crop (default 6)
//     --timer-zoom <n>      upscale factor for the timer crop (default 8)
//     --max-tokens <n>      VLM max tokens (default 128)
//     --json-mode           request response_format=json_object (only if your server supports it)
//     --mock                synthetic reads to exercise output without a running server
//     --out <dir>           scratch dir for frames + JSON (default $CLAUDE_SCRATCH|/tmp/burst-gauge)
//     --sim <slugs>         comma-separated team slugs — run the sim and compare predicted burst
//                           timings to observed (scope-lock defaults: lvl 400, MLB, base5, 180s)
//
// Output: <out>/burst-gauge.json
//   { video, fps, reads: [{videoT, timerSec, burstState}], transitions: [...], simTransitions?: [...] }
//   burstState: "filling" | "stage1" | "stage2" | "stage3" | "full" | null
//   transitions: [{videoT, timerSec, fightT, from, to}] — debounced state CHANGES.
//   simTransitions: [{fightT, label}] — sim-predicted burst events (only with --sim).

import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import type { DataFile, LevelMultiplier, SimConfig } from '../../src/types.js';
import { runSim } from '../../src/engine/sim.js';
import { loadOverride } from '../../src/skills/overrides-node.js';
import {
  prepareTeam,
  type CubesFile,
  type OlLinesFile,
  type SkillLevelData,
  type UnitOptions,
} from '../../src/prepare.js';

const argv = process.argv.slice(2);
const video = argv[0];
const flags: Record<string, string> = {};
for (let i = 1; i < argv.length; i++)
  if (argv[i].startsWith('--'))
    flags[argv[i].slice(2)] =
      argv[i + 1]?.startsWith('--') || argv[i + 1] === undefined
        ? 'true'
        : argv[++i];
if (!video || !existsSync(video)) {
  console.error(
    'usage: read-burst-gauge.ts <video> [--fps 2] [--at S] [--dur S] [--endpoint URL] [--model NAME] [--gauge-crop "..."] [--timer-crop "..."] [--gauge-zoom 6] [--timer-zoom 8] [--max-tokens 128] [--json-mode] [--mock] [--out DIR]',
  );
  process.exit(1);
}

const classifier = (flags.classifier ?? 'cv') as 'cv' | 'vlm';
if (classifier !== 'cv' && classifier !== 'vlm') {
  console.error(`--classifier must be "cv" or "vlm" (got "${classifier}")`);
  process.exit(1);
}
const fps = Number(flags.fps ?? (classifier === 'cv' ? 5 : 2));
const at = Number(flags.at ?? 0);
const dur = flags.dur ? Number(flags.dur) : 0;
const endpoint = (flags.endpoint ?? 'http://localhost:8090/v1').replace(
  /\/$/,
  '',
);
const model = flags.model ?? 'qwen2.5-vl';
const apikey = flags.apikey ?? 'no-key';
// Pixel-perfect crops for 2622x1206 (measured from annotated screenshot 2026-07-24).
const gaugeCrop = flags['gauge-crop'] ?? 'crop=188:82:2428:448';
const timerCrop = flags['timer-crop'] ?? 'crop=59:39:2317:21';
const gaugeZoom = Number(flags['gauge-zoom'] ?? 6);
const timerZoom = Number(flags['timer-zoom'] ?? 8);
const maxTokens = Number(flags['max-tokens'] ?? 128);
const jsonMode = flags['json-mode'] === 'true';
const mock = flags.mock === 'true';
const simSlugs =
  flags.sim && flags.sim !== 'true'
    ? flags.sim.split(',').map((s) => s.trim())
    : null;
const outDir =
  flags.out ?? (process.env.CLAUDE_SCRATCH ?? '/tmp') + '/burst-gauge';
// videoT of the 03:00->02:59 flip (game t0). The CV path has no digit reader, so it takes t0 as
// an argument rather than guessing: one `frames.ts <video> --at 3 --dur 10 --fps 2 --region timer
// --sheet 5 --zoom 3` sheet pins it. Given it, timerSec + fightT are exact arithmetic instead of
// a single-anchored VLM spine (which needed 12-17 corrections per 60 frames).
const t0Flag = flags.t0 && flags.t0 !== 'true' ? Number(flags.t0) : null;

mkdirSync(outDir, { recursive: true });
const gaugeFramesDir = `${outDir}/frames-gauge`;
const timerFramesDir = `${outDir}/frames-timer`;

// ---- extract frames (two passes — one per crop) ----
function extract(crop: string, zoom: number, dir: string, label: string) {
  const vf = [`fps=${fps}`, crop];
  if (zoom !== 1) vf.push(`scale=iw*${zoom}:ih*${zoom}`);
  const args = ['-y', '-loglevel', 'error'];
  if (at) args.push('-ss', String(at));
  if (dur) args.push('-t', String(dur));
  args.push('-i', video, '-vf', vf.join(','), '-q:v', '3', `${dir}/f_%05d.jpg`);
  execFileSync('ffmpeg', args, { stdio: ['ignore', 'ignore', 'ignore'] });
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.jpg'))
    .sort();
  console.log(`  ${files.length} ${label} frames -> ${dir}`);
  return files;
}
let gaugeFiles: string[] = [];
let timerFiles: string[] = [];
if (classifier === 'vlm') {
  mkdirSync(gaugeFramesDir, { recursive: true });
  mkdirSync(timerFramesDir, { recursive: true });
  console.log(
    `extracting frames @ ${fps}fps${dur ? ` for ${dur}s from t=${at}` : ' (whole video)'} ...`,
  );
  gaugeFiles = extract(gaugeCrop, gaugeZoom, gaugeFramesDir, 'gauge');
  timerFiles = extract(timerCrop, timerZoom, timerFramesDir, 'timer');
  if (!gaugeFiles.length || !timerFiles.length) {
    console.error(
      'no frames extracted — check --at/--dur/--gauge-crop/--timer-crop',
    );
    process.exit(1);
  }
}

// ---- VLM prompts ----
const GAUGE_PROMPT = `You are reading a CROPPED region from a NIKKE boss fight HUD showing ONLY the
BURST GAUGE — a horizontal bar on the right side of the screen.

Classify the gauge into EXACTLY ONE of these states:
- "filling": a gray/dark bar partially filled with white — burst gauge is accumulating, no burst ready
- "stage1": a GREEN bar with the roman numeral "I" — burst stage 1 is ready
- "stage2": a YELLOW/GOLD bar with the roman numeral "II" — burst stage 2 is ready
- "stage3": a RED bar with the roman numeral "III" — burst stage 3 is ready
- "full": a RED bar that is DRAINING (shrinking) with NO roman numeral — Full Burst is active

If you cannot determine the state, respond with null.

Respond with ONLY this JSON (no markdown, no commentary):
{"burstState": "filling"|"stage1"|"stage2"|"stage3"|"full"|null}`;

const TIMER_PROMPT = `You are reading a CROPPED region from a NIKKE boss fight HUD showing ONLY the
fight TIMER — a mm:ss countdown (e.g. 2:35, 0:07).

Return the time as seconds REMAINING (2:35 = 155, 0:07 = 7).

Respond with ONLY this JSON (no markdown, no commentary):
{"timerSec": <integer>}`;

type BurstState = 'filling' | 'stage1' | 'stage2' | 'stage3' | 'full';
const VALID_STATES = new Set<string>([
  'filling',
  'stage1',
  'stage2',
  'stage3',
  'full',
]);

async function vlmRead(
  b64: string,
  prompt: string,
): Promise<Record<string, unknown>> {
  const body: Record<string, unknown> = {
    model,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${b64}` },
          },
        ],
      },
    ],
    temperature: 0,
    max_tokens: maxTokens,
  };
  if (jsonMode) body.response_format = { type: 'json_object' };
  const res = await fetch(`${endpoint}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apikey}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok)
    throw new Error(
      `VLM HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`,
    );
  const j = (await res.json()) as {
    choices?: { message?: { content?: unknown } }[];
  };
  let content = j?.choices?.[0]?.message?.content ?? '';
  if (Array.isArray(content))
    content = content.map((c) => (c as { text?: string }).text ?? '').join('');
  let s = String(content).trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  const a = s.indexOf('{'),
    b = s.lastIndexOf('}');
  if (a >= 0 && b > a) s = s.slice(a, b + 1);
  try {
    return (JSON.parse(s) ?? {}) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function readGauge(b64: string): Promise<BurstState | null> {
  const o = await vlmRead(b64, GAUGE_PROMPT);
  const s = o.burstState;
  return typeof s === 'string' && VALID_STATES.has(s)
    ? (s as BurstState)
    : null;
}

async function readTimer(b64: string): Promise<number | null> {
  const o = await vlmRead(b64, TIMER_PROMPT);
  return typeof o.timerSec === 'number' ? Math.round(o.timerSec) : null;
}

// ---- CV classifier: delegate to scan.ts (deterministic, no model) ----
interface CvScan {
  gaugeStates: { videoT: number; state: string | null; fill: number }[];
  fbCandidates: { videoT: number; sources: string[]; confidence: number; durationSec?: number }[];
  orphanEvents: { videoT: number; source: string }[];
  fullWindows: { start: number; end: number; durationSec: number }[];
  detectors: Record<string, number>;
  summary: { fullBursts: number; corroborated: number; gaps: number[]; minGap: number | null; maxGap: number | null };
}
function runCvScan(): CvScan {
  const scanOut = `${outDir}/scan`;
  const scanScript = new URL('./scan.ts', import.meta.url).pathname;
  const a = [scanScript, video, '--fps', String(fps), '--out', scanOut, '--gauge-crop', gaugeCrop];
  if (at) a.push('--at', String(at));
  if (dur) a.push('--dur', String(dur));
  if (t0Flag != null) a.push('--t0', String(t0Flag));
  console.log('running deterministic CV scan (scripts/probe/scan.ts) ...');
  execFileSync('npx', ['tsx', ...a], { stdio: ['ignore', 'inherit', 'inherit'] });
  return JSON.parse(readFileSync(`${scanOut}/scan.json`, 'utf8')) as CvScan;
}

// ---- mock (synthetic burst rotation) ----
function mockGauge(idx: number): BurstState {
  const cycle = idx % 20;
  if (cycle < 8) return 'filling';
  if (cycle < 11) return 'stage1';
  if (cycle < 14) return 'stage2';
  if (cycle < 17) return 'stage3';
  return 'full';
}
function mockTimer(idx: number): number {
  return Math.max(0, 180 - Math.floor(idx / fps));
}

// ---- run ----
const reads: {
  videoT: number;
  timerSec: number | null;
  burstState: BurstState | null;
}[] = [];
let n = 0;
let totalMs = 0;
let cvScan: CvScan | null = null;

if (classifier === 'cv') {
  cvScan = runCvScan();
  for (const g of cvScan.gaugeStates) {
    reads.push({
      videoT: g.videoT,
      timerSec: t0Flag == null ? null : Math.round(180 - (g.videoT - t0Flag)),
      burstState: (g.state as BurstState | null) ?? null,
    });
  }
  console.log(
    `  cv: ${cvScan.summary.fullBursts} full bursts ` +
      `(${cvScan.summary.corroborated}/${cvScan.summary.fullBursts} corroborated), ` +
      `${reads.length} frames`,
  );
  if (t0Flag == null)
    console.log(
      '  note: no --t0, so timerSec/fightT are null. Pin game t0 with ONE sheet:\n' +
        `        npx tsx scripts/probe/frames.ts "${video}" --at 3 --dur 10 --fps 2 --region timer --sheet 5 --zoom 3`,
    );
}

const frameCount = classifier === 'cv' ? reads.length : Math.min(gaugeFiles.length, timerFiles.length);
for (let i = 0; classifier === 'vlm' && i < frameCount; i++) {
  const idx = parseInt(gaugeFiles[i].replace(/\D/g, ''), 10);
  const videoT = at + (idx - 1) / fps;
  const t0 = Date.now();
  let burstState: BurstState | null;
  let timerSec: number | null;
  if (mock) {
    burstState = mockGauge(idx);
    timerSec = mockTimer(idx);
  } else {
    const gaugeB64 = readFileSync(
      `${gaugeFramesDir}/${gaugeFiles[i]}`,
    ).toString('base64');
    const timerB64 = readFileSync(
      `${timerFramesDir}/${timerFiles[i]}`,
    ).toString('base64');
    burstState = null;
    timerSec = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        [burstState, timerSec] = await Promise.all([
          readGauge(gaugeB64),
          readTimer(timerB64),
        ]);
        break;
      } catch (e) {
        if (attempt === 2)
          console.error(
            `  frame ${gaugeFiles[i]}: FAILED — ${(e as Error).message}`,
          );
        else await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }
  totalMs += Date.now() - t0;
  reads.push({ videoT, timerSec, burstState });
  if (++n % 10 === 0 || n === frameCount)
    console.log(
      `  ${n}/${frameCount}  t=${videoT.toFixed(1)}s  burst=${burstState ?? '?'}  timer=${timerSec}  ~${Math.round(totalMs / n)}ms/frame`,
    );
}

// ---- timer correction (spine-based — same as read-total-damage.ts) ----
function correctTimer(
  reads: { videoT: number; timerSec: number | null }[],
  fps: number,
): number {
  const step = 1 / fps;
  let bestStart = 0,
    bestLen = 0,
    runStart = 0,
    runLen = 1;
  for (let i = 1; i < reads.length; i++) {
    const prev = reads[i - 1].timerSec,
      cur = reads[i].timerSec;
    if (prev != null && cur != null && Math.abs(prev - cur - step) <= 0.5) {
      runLen++;
    } else {
      if (runLen > bestLen) {
        bestStart = runStart;
        bestLen = runLen;
      }
      runStart = i;
      runLen = 1;
    }
  }
  if (runLen > bestLen) {
    bestStart = runStart;
    bestLen = runLen;
  }
  if (bestLen < 3) return 0;
  const spineIdx = bestStart + Math.floor(bestLen / 2);
  const spineVal = reads[spineIdx].timerSec!;
  let corrected = 0;
  for (let i = 0; i < reads.length; i++) {
    const expected = Math.round(spineVal - (i - spineIdx) * step);
    if (expected < 0 || expected > 180) {
      reads[i].timerSec = null;
      continue;
    }
    if (reads[i].timerSec !== expected) {
      reads[i].timerSec = expected;
      corrected++;
    }
  }
  return corrected;
}
// The VLM path infers the timer per frame and then straightens it against a linear spine; the CV
// path has no digit reader, so it takes t0 as an argument and the arithmetic is exact.
const timerCorrections = classifier === 'vlm' ? correctTimer(reads, fps) : 0;
if (timerCorrections)
  console.log(
    `  timer: corrected ${timerCorrections} read(s) from linear spine`,
  );

// ---- fight-start offset: videoT where the fight timer reads 180 (3:00) ----
// From any corrected read: fightStartVideoT = videoT + timerSec - 180.
let fightStartVideoT: number | null = t0Flag;
if (fightStartVideoT == null)
  for (const r of reads) {
    if (r.timerSec != null) {
      fightStartVideoT = Math.round((r.videoT + r.timerSec - 180) * 100) / 100;
      break;
    }
  }
if (fightStartVideoT != null)
  console.log(
    `  fight starts at videoT=${fightStartVideoT}s (timer=180)` +
      (t0Flag != null ? ' [--t0, exact]' : ' [inferred from ONE VLM timer read — cross-check it]'),
  );

// ---- extract transitions (debounced: require 2 consecutive frames of the new state) ----
const transitions: {
  videoT: number;
  timerSec: number | null;
  fightT: number | null;
  from: BurstState | null;
  to: BurstState;
}[] = [];
// A null read means different things per classifier and must be handled differently:
//   vlm — "the model could not tell", i.e. missing data. Skipping it is right.
//   cv  — "the burst widget is not on screen", which is a REAL state (no burst ready, no Full
//         Burst running). Skipping it would fuse consecutive Full Bursts into one `full` run and
//         collapse the timeline to a handful of transitions.
const IDLE = 'idle' as unknown as BurstState;
let confirmedState: BurstState | null = null;
let pendingState: BurstState | null = null;
let pendingCount = 0;
for (const raw0 of reads) {
  const r =
    classifier === 'cv' && raw0.burstState == null ? { ...raw0, burstState: IDLE } : raw0;
  if (r.burstState == null) continue;
  if (r.burstState === confirmedState) {
    pendingState = null;
    pendingCount = 0;
    continue;
  }
  if (r.burstState === pendingState) {
    pendingCount++;
  } else {
    pendingState = r.burstState;
    pendingCount = 1;
  }
  if (pendingCount >= 2) {
    transitions.push({
      videoT: r.videoT,
      timerSec: r.timerSec,
      fightT:
        fightStartVideoT != null
          ? Math.round((r.videoT - fightStartVideoT) * 100) / 100
          : null,
      from: confirmedState,
      to: r.burstState,
    });
    confirmedState = r.burstState;
    pendingState = null;
    pendingCount = 0;
  }
}

// ---- sim-predicted burst timings (optional --sim flag) ----
interface SimTransition {
  fightT: number;
  label: string;
}
let simTransitions: SimTransition[] | undefined;
if (simSlugs) {
  console.log(`\n  running sim for: ${simSlugs.join(', ')} ...`);
  const data: DataFile = JSON.parse(
    readFileSync(
      new URL('../../data/characters.json', import.meta.url),
      'utf8',
    ),
  );
  const mult: LevelMultiplier = JSON.parse(
    readFileSync(
      new URL('../../data/level-multiplier.json', import.meta.url),
      'utf8',
    ),
  );
  const chars = simSlugs.map((s) => {
    const c = data.characters[s];
    if (!c) throw new Error(`unknown slug "${s}"`);
    return c;
  });
  const overrides = Object.fromEntries(
    simSlugs.map((s) => [s, loadOverride(s)]),
  );
  const cubesData: CubesFile = JSON.parse(
    readFileSync(new URL('../../data/cubes.json', import.meta.url), 'utf8'),
  );
  const olLinesData: OlLinesFile = JSON.parse(
    readFileSync(new URL('../../data/ol-lines.json', import.meta.url), 'utf8'),
  );
  let skillLevelData: SkillLevelData = {};
  try {
    skillLevelData = JSON.parse(
      readFileSync(
        new URL('../../data/skill-levels.json', import.meta.url),
        'utf8',
      ),
    );
  } catch {
    /* optional */
  }
  const unitOpts: UnitOptions[] = simSlugs.map(() => ({}));
  const prepared = prepareTeam(chars, unitOpts, {
    overrides,
    skillLevels: skillLevelData,
    cubes: cubesData,
    olLines: olLinesData,
  });
  const cfg: SimConfig = {
    slugs: simSlugs,
    bossElement: null,
    bossDef: 0,
    level: 400,
    copies: 3,
    doll: false,
    ol: 'base5',
    coreHitRate: 0,
    rangeBonus: true,
    durationSec: 180,
  };
  const simResult = runSim(chars, mult, cfg, prepared);
  // Parse rotation log: "X.Xs  FULL BURST (until Y.Ys)" | "X.Xs  BN Name" | "X.Xs  CHAIN EXPIRED ..."
  simTransitions = [];
  for (const line of simResult.rotationLog) {
    const m = line.match(/^([\d.]+)s\s+(.+)$/);
    if (!m) continue;
    const fightT = parseFloat(m[1]);
    const label = m[2].trim();
    if (label.startsWith('FULL BURST')) {
      const until = label.match(/until ([\d.]+)s/);
      simTransitions.push({
        fightT,
        label: `full (until ${until?.[1] ?? '?'})`,
      });
      if (until)
        simTransitions.push({
          fightT: parseFloat(until[1]),
          label: 'filling (FB ended)',
        });
    } else if (/^B\d/.test(label)) {
      simTransitions.push({ fightT, label });
    }
  }
  simTransitions.sort((a, b) => a.fightT - b.fightT);
  console.log(
    `  sim: ${simResult.fullBursts} full bursts, ${simTransitions.length} events`,
  );

  // Compare observed transitions to sim predictions
  if (fightStartVideoT != null && transitions.length) {
    console.log('\n  observed vs sim (nearest match):');
    for (const t of transitions) {
      if (t.fightT == null) continue;
      // Find the nearest sim event within 3s
      let best: SimTransition | null = null;
      let bestDelta = Infinity;
      for (const s of simTransitions) {
        const d = Math.abs(s.fightT - t.fightT);
        if (d < bestDelta) {
          bestDelta = d;
          best = s;
        }
      }
      const match =
        best && bestDelta <= 3
          ? `~ ${best.label} @ ${best.fightT.toFixed(1)}s (Δ${bestDelta.toFixed(1)}s)`
          : 'no sim match';
      console.log(
        `    fight=${t.fightT.toFixed(1)}s  ${t.from ?? '(start)'} -> ${t.to}  |  ${match}`,
      );
    }
  }
}

const fbTransitions = transitions.filter((t) => t.to === 'full').length;
const result = {
  video,
  classifier,
  fps,
  at,
  dur: dur || null,
  endpoint: classifier === 'vlm' ? endpoint : null,
  model: classifier === 'vlm' ? model : 'cv (scripts/probe/scan.ts)',
  gaugeCrop,
  timerCrop,
  gaugeZoom,
  timerZoom,
  framesProcessed: frameCount,
  timerCorrections,
  fightStartVideoT,
  t0Source: t0Flag != null ? '--t0 (exact)' : classifier === 'cv' ? 'none' : 'vlm timer spine (single anchor)',
  fullBursts: classifier === 'cv' ? (cvScan?.summary.fullBursts ?? null) : fbTransitions,
  // CV only: the full scan — per-detector counts, per-burst corroboration, drain-window durations,
  // and any event that matched no window. This is what makes the count auditable.
  cv: cvScan
    ? {
        detectors: cvScan.detectors,
        summary: cvScan.summary,
        fbCandidates: cvScan.fbCandidates,
        orphanEvents: cvScan.orphanEvents,
        fullWindows: cvScan.fullWindows,
      }
    : null,
  reads,
  transitions,
  simTransitions,
};
const rawOut = `${outDir}/burst-gauge.json`;
writeFileSync(rawOut, JSON.stringify(result, null, 2) + '\n');
console.log(`\nwrote ${rawOut}`);
console.log(
  `  classifier=${classifier}  ` +
    `${reads.filter((r) => r.burstState != null).length}/${frameCount} gauge reads, ` +
    `${reads.filter((r) => r.timerSec != null).length}/${frameCount} timers, ` +
    `${transitions.length} state transitions`,
);
console.log(
  `  FULL BURSTS: ${result.fullBursts}` +
    (classifier === 'cv'
      ? `  (drain windows; ${cvScan?.summary.corroborated}/${cvScan?.summary.fullBursts} corroborated by the splash/hexagon detectors)`
      : `  (transitions into "full" — UNVALIDATED off the VLM classifier; re-run with --classifier cv before this becomes a measured count)`),
);
if (transitions.length) {
  console.log('  transitions (debounced):');
  for (const t of transitions.slice(0, 15))
    console.log(
      `    fight=${t.fightT != null ? t.fightT.toFixed(1) + 's' : '?'}  ${t.from ?? '(start)'} -> ${t.to}  (video=${t.videoT.toFixed(1)}s timer=${t.timerSec})`,
    );
  if (transitions.length > 15)
    console.log(`    ... and ${transitions.length - 15} more`);
}
