// Cumulative-damage-curve reader. Samples the TOP UI STRIP of a probe video at ~1fps and asks a
// LOCAL VLM to read the team cumulative damage total + fight timer per frame. Outputs a time
// series you can plot as a damage-over-time curve and compare to the sim.
//
// This is the cheap, whole-video counterpart to read-popups-vlm.ts (which reads individual damage
// popups in short clips). One number per frame, no dedup, no popup classification — just the
// running total the game shows in the top-centre HUD.
//
// PIXEL-PERFECT CROPS (2622x1206 source — the standard recording resolution):
//   The damage total and timer sit at FIXED screen positions every fight. Coordinates measured
//   from an annotated screenshot (cyan = total, pink = timer):
//     total: inner x=1136..1482, y=11..84   -> crop=347:74:1136:11
//     timer: inner x=2317..2375, y=21..59   -> crop=59:39:2317:21
//   Each element gets its own tight crop + focused VLM prompt for maximum digit accuracy.
//   Override with --total-crop / --timer-crop for non-standard resolutions.
//
//   npx tsx scripts/probe/read-total-damage.ts <video> [opts]
//     --fps <n>             sampling rate (default 1 — the total updates on hits, ~1s is enough)
//     --at <s> --dur <s>    clip window (default: whole video)
//     --endpoint <url>      OpenAI-compatible base (default http://localhost:8090/v1)
//     --model <name>        model field (default qwen2.5-vl)
//     --apikey <k>          bearer token (default no-key)
//     --total-crop "<ff>"   override the damage-total crop (default crop=347:74:1136:11)
//     --timer-crop "<ff>"   override the timer crop (default crop=59:39:2317:21)
//     --total-zoom <n>      upscale factor for the total crop (default 4)
//     --timer-zoom <n>      upscale factor for the timer crop (default 8)
//     --max-tokens <n>      VLM max tokens (default 128 — responses are one number)
//     --json-mode           request response_format=json_object (only if your server supports it)
//     --mock                synthetic reads to exercise output without a running server
//     --out <dir>           scratch dir for frames + JSON (default $CLAUDE_SCRATCH|/tmp/total-dmg)
//
// Output: <out>/total-damage.json
//   { video, fps, at, dur, reads: [{videoT, timerSec, totalDamage}], warnings: [...] }
//   timerSec = fight countdown in seconds REMAINING (2:35 = 155); totalDamage = cumulative team total.
//   A warning is emitted for any frame where totalDamage DECREASES (physically impossible — misread).

import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';

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
    'usage: read-total-damage.ts <video> [--fps 1] [--at S] [--dur S] [--endpoint URL] [--model NAME] [--total-crop "..."] [--timer-crop "..."] [--total-zoom 4] [--timer-zoom 8] [--max-tokens 128] [--json-mode] [--mock] [--out DIR]',
  );
  process.exit(1);
}

const fps = Number(flags.fps ?? 1);
const at = Number(flags.at ?? 0);
const dur = flags.dur ? Number(flags.dur) : 0;
const endpoint = (flags.endpoint ?? 'http://localhost:8090/v1').replace(
  /\/$/,
  '',
);
const model = flags.model ?? 'qwen2.5-vl';
const apikey = flags.apikey ?? 'no-key';
// Pixel-perfect crops for 2622x1206 (measured from annotated screenshot 2026-07-24).
const totalCrop = flags['total-crop'] ?? 'crop=347:74:1136:11';
const timerCrop = flags['timer-crop'] ?? 'crop=59:39:2317:21';
const totalZoom = Number(flags['total-zoom'] ?? 4);
const timerZoom = Number(flags['timer-zoom'] ?? 8);
const maxTokens = Number(flags['max-tokens'] ?? 128);
const jsonMode = flags['json-mode'] === 'true';
const mock = flags.mock === 'true';
const outDir =
  flags.out ?? (process.env.CLAUDE_SCRATCH ?? '/tmp') + '/total-dmg';

mkdirSync(outDir, { recursive: true });
const totalFramesDir = `${outDir}/frames-total`;
const timerFramesDir = `${outDir}/frames-timer`;
mkdirSync(totalFramesDir, { recursive: true });
mkdirSync(timerFramesDir, { recursive: true });

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
console.log(
  `extracting frames @ ${fps}fps${dur ? ` for ${dur}s from t=${at}` : ' (whole video)'} ...`,
);
const totalFiles = extract(totalCrop, totalZoom, totalFramesDir, 'total');
const timerFiles = extract(timerCrop, timerZoom, timerFramesDir, 'timer');
if (!totalFiles.length || !timerFiles.length) {
  console.error(
    'no frames extracted — check --at/--dur/--total-crop/--timer-crop',
  );
  process.exit(1);
}

// ---- VLM prompts (one per element — hyper-focused) ----
const TOTAL_PROMPT = `You are reading a CROPPED region from a NIKKE boss fight HUD showing ONLY the
team CUMULATIVE DAMAGE TOTAL — a single large number (e.g. 13466858).

Read the number. Drop any commas or separators. Ignore any label text like "DMG".

Respond with ONLY this JSON (no markdown, no commentary):
{"totalDamage": <integer>}`;

const TIMER_PROMPT = `You are reading a CROPPED region from a NIKKE boss fight HUD showing ONLY the
fight TIMER — a mm:ss countdown (e.g. 2:35, 0:07).

Return the time as seconds REMAINING (2:35 = 155, 0:07 = 7).

Respond with ONLY this JSON (no markdown, no commentary):
{"timerSec": <integer>}`;

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

async function readTotal(b64: string): Promise<number | null> {
  const o = await vlmRead(b64, TOTAL_PROMPT);
  return typeof o.totalDamage === 'number' ? Math.round(o.totalDamage) : null;
}

async function readTimer(b64: string): Promise<number | null> {
  const o = await vlmRead(b64, TIMER_PROMPT);
  return typeof o.timerSec === 'number' ? Math.round(o.timerSec) : null;
}

// ---- mock (synthetic rising curve) ----
function mockTotal(idx: number): number {
  return idx * 1_500_000 + 500_000;
}
function mockTimer(idx: number): number {
  return Math.max(0, 180 - idx);
}

// ---- run (sequential — gentle on a local server) ----
const reads: {
  videoT: number;
  timerSec: number | null;
  totalDamage: number | null;
}[] = [];
let n = 0;
let totalMs = 0;
const frameCount = Math.min(totalFiles.length, timerFiles.length);
for (let i = 0; i < frameCount; i++) {
  const idx = parseInt(totalFiles[i].replace(/\D/g, ''), 10);
  const videoT = at + (idx - 1) / fps;
  const t0 = Date.now();
  let totalDamage: number | null;
  let timerSec: number | null;
  if (mock) {
    totalDamage = mockTotal(idx);
    timerSec = mockTimer(idx);
  } else {
    const totalB64 = readFileSync(
      `${totalFramesDir}/${totalFiles[i]}`,
    ).toString('base64');
    const timerB64 = readFileSync(
      `${timerFramesDir}/${timerFiles[i]}`,
    ).toString('base64');
    totalDamage = null;
    timerSec = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        [totalDamage, timerSec] = await Promise.all([
          readTotal(totalB64),
          readTimer(timerB64),
        ]);
        break;
      } catch (e) {
        if (attempt === 2)
          console.error(
            `  frame ${totalFiles[i]}: FAILED — ${(e as Error).message}`,
          );
        else await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }
  totalMs += Date.now() - t0;
  reads.push({ videoT, timerSec, totalDamage });
  if (++n % 10 === 0 || n === frameCount)
    console.log(
      `  ${n}/${frameCount}  t=${videoT.toFixed(1)}s  total=${totalDamage}  timer=${timerSec}  ~${Math.round(totalMs / n)}ms/frame`,
    );
}

// ---- timer correction: the countdown is perfectly linear (-1/frame at 1fps). The VLM
// occasionally drops the minutes digit (reading "59" from "1:59" instead of 119). Strategy:
// find the longest run of consecutive reads where each drops by ~1/fps, then extrapolate
// the full sequence from that spine at exactly -1/fps per frame. ----
function correctTimer(
  reads: { videoT: number; timerSec: number | null }[],
  fps: number,
): number {
  const step = 1 / fps;
  // Find the longest run of consecutive reads with consistent delta.
  let bestStart = 0,
    bestLen = 0;
  let runStart = 0,
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
  if (bestLen < 3) return 0; // no reliable spine — don't guess

  // Extrapolate from the spine: timer[i] = spineTimer - (i - spineIndex) * step
  const spineIdx = bestStart + Math.floor(bestLen / 2); // use the middle of the spine
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
const timerCorrections = correctTimer(reads, fps);
if (timerCorrections)
  console.log(
    `  timer: corrected ${timerCorrections} read(s) from linear spine`,
  );

// ---- sanity: total damage must be monotonically non-decreasing ----
const warnings: string[] = [];
let prev: number | null = null;
for (const r of reads) {
  if (r.totalDamage == null) continue;
  if (prev != null && r.totalDamage < prev)
    warnings.push(
      `t=${r.videoT.toFixed(1)}s: total ${r.totalDamage} < previous ${prev} (misread?)`,
    );
  prev = r.totalDamage;
}

const result = {
  video,
  fps,
  at,
  dur: dur || null,
  endpoint,
  model,
  totalCrop,
  timerCrop,
  totalZoom,
  timerZoom,
  framesProcessed: frameCount,
  timerCorrections,
  reads,
  warnings,
};
const rawOut = `${outDir}/total-damage.json`;
writeFileSync(rawOut, JSON.stringify(result, null, 2) + '\n');
console.log(`\nwrote ${rawOut}`);
console.log(
  `  ${reads.filter((r) => r.totalDamage != null).length}/${frameCount} totals, ${reads.filter((r) => r.timerSec != null).length}/${frameCount} timers`,
);
if (warnings.length) {
  console.log(`  ⚠ ${warnings.length} monotonicity warning(s):`);
  for (const w of warnings.slice(0, 5)) console.log(`    ${w}`);
  if (warnings.length > 5)
    console.log(`    ... and ${warnings.length - 5} more`);
}
