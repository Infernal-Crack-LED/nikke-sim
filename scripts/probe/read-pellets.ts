// Shotgun pellet counter orchestrator. Extracts pellet-region frames at high fps (15-60),
// runs the Python CV counter (A/B: numpy, PIL, OpenCV) on every frame, reads the fight timer
// via VLM at a SPARSE 1fps, builds a timer spine, and maps it onto the high-fps pellet reads.
//
//   npx tsx scripts/probe/read-pellets.ts <video> [opts]
//     --fps <n>             pellet sampling rate (default 30 — pellets last ~13/60fps ≈ 0.22s)
//     --at <s> --dur <s>    clip window (default: whole video)
//     --endpoint <url>      VLM base (default http://localhost:8090/v1)
//     --model <name>        VLM model (default qwen2.5-vl)
//     --pellet-crop "<ff>"  override pellet crop (default crop=163:141:1423:464 for 2622x1206)
//     --timer-crop "<ff>"   override timer crop (default crop=59:39:2317:21)
//     --zoom <n>            pellet crop upscale (default 4)
//     --core-rate <0-1>     expected core hit fraction (default 0.05)
//     --center-exclude <n>  crosshair exclusion radius in zoomed px (default 18*zoom)
//     --pellet-radius <n>   count pellets within this radius of crosshair in zoomed px (default 80*zoom)
//     --mock                synthetic reads (no VLM / Python needed)
//     --out <dir>           scratch dir (default $CLAUDE_SCRATCH|/tmp/pellets)
//
// Requires: scripts/probe/.venv/bin/python with numpy, scipy, Pillow, opencv-python-headless
//
// Output: <out>/pellets.json
//   { video, reads: [...], shots: [...], summary }
//   shots = debounced pellet events (consecutive non-zero frames, peak = max total).

import { execFileSync, execSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { fileURLToPath } from 'node:url';

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
    'usage: read-pellets.ts <video> [--fps 30] [--at S] [--dur S] [--endpoint URL] [--model NAME] [--pellet-crop "..."] [--timer-crop "..."] [--zoom 4] [--core-rate 0.05] [--center-exclude N] [--pellet-radius N] [--ammo-offset-x X] [--ammo-offset-y Y] [--mock] [--out DIR]'
  );
  process.exit(1);
}

const fps = Number(flags.fps ?? 60);
const at = Number(flags.at ?? 0);
const dur = flags.dur ? Number(flags.dur) : 0;
const endpoint = (flags.endpoint ?? 'http://localhost:8090/v1').replace(
  /\/$/,
  ''
);
const model = flags.model ?? 'qwen2.5-vl';
const apikey = flags.apikey ?? 'no-key';
const pelletCrop = flags['pellet-crop'] ?? 'crop=1303:396:672:268';
const timerCrop = flags['timer-crop'] ?? 'crop=59:39:2317:21';
const zoom = Number(flags.zoom ?? 3);
const coreRate = Number(flags['core-rate'] ?? 0.05);
const ammoOffsetXNative = Number(flags['ammo-offset-x'] ?? 62.5);
const ammoOffsetYNative = Number(flags['ammo-offset-y'] ?? -5.5);
const mock = flags.mock === 'true';
const outDir = flags.out ?? (process.env.CLAUDE_SCRATCH ?? '/tmp') + '/pellets';
const scriptDir = fileURLToPath(new URL('.', import.meta.url));
const pythonBin = `${scriptDir}.venv/bin/python`;
const counterScript = `${scriptDir}count-pellets.py`;
const ammoTemplatePath = `${scriptDir}ammo-box-template.png`;
const forceVlmCrosshair = flags['no-ammo-template'] === 'true';

const MIN_PELLETS = 5;
const MAX_PELLETS = 10;
const TIMER_FPS = 1; // sparse timer sampling — VLM is the bottleneck, not the counter

mkdirSync(outDir, { recursive: true });
const pelletFramesDir = `${outDir}/frames-pellet`;
const timerFramesDir = `${outDir}/frames-timer`;
mkdirSync(pelletFramesDir, { recursive: true });
mkdirSync(timerFramesDir, { recursive: true });

// ---- extract frames (two rates: high-fps pellets, 1fps timer) ----
function extract(
  crop: string,
  z: number,
  rate: number,
  dir: string,
  label: string
) {
  const vf = [`fps=${rate}`, crop];
  if (z !== 1) {
    vf.push(`scale=iw*${z}:ih*${z}`);
  }
  const args = ['-y', '-loglevel', 'error'];
  if (at) {
    args.push('-ss', String(at));
  }
  if (dur) {
    args.push('-t', String(dur));
  }
  args.push('-i', video, '-vf', vf.join(','), `${dir}/f_%05d.png`);
  execFileSync('ffmpeg', args, { stdio: ['ignore', 'ignore', 'ignore'] });
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.png'))
    .sort();
  console.log(`  ${files.length} ${label} frames @ ${rate}fps -> ${dir}`);
  return files;
}
console.log(
  `extracting frames${dur ? ` for ${dur}s from t=${at}` : ' (whole video)'} ...`
);
const t0Extract = Date.now();
const pelletFiles = extract(pelletCrop, zoom, fps, pelletFramesDir, 'pellet');
const timerFiles = extract(timerCrop, 8, TIMER_FPS, timerFramesDir, 'timer');
console.log(`  extraction: ${((Date.now() - t0Extract) / 1000).toFixed(1)}s`);
if (!pelletFiles.length) {
  console.error('no frames extracted');
  process.exit(1);
}

// ---- extract a per-video ammo-box template (global marciana template does not
//      generalize to all SG HUDs; see docs/handoffs/2026-07-29-sg-landing-recalibration-plan.md)
const perVideoAmmoTemplate = `${outDir}/ammo-box-template.png`;
try {
  console.log('  extracting per-video ammo-box template ...');
  const t0Tmpl = Date.now();
  execFileSync(
    pythonBin,
    [
      `${scriptDir}extract-ammo-template.py`,
      video,
      '--out',
      perVideoAmmoTemplate,
      '--crop',
      pelletCrop,
      '--zoom',
      String(zoom),
      '--roi-x0',
      '0.55',
      '--roi-y0',
      '0.50',
    ],
    { stdio: ['ignore', 'inherit', 'inherit'] }
  );
  console.log(
    `  per-video template: ${((Date.now() - t0Tmpl) / 1000).toFixed(1)}s -> ${perVideoAmmoTemplate}`
  );
} catch {
  console.log(
    `  per-video template extraction failed, falling back to ${ammoTemplatePath}`
  );
}

// ---- run Python pellet counter on ALL pellet frames (fast, no VLM) ----
interface PelletCount {
  white: number;
  red: number;
  marker?: number; // core-hit hit-markers (red triangles tight to the crosshair)
}
interface FrameCounts {
  file: string;
  numpy: PelletCount;
  pil: PelletCount;
  opencv: PelletCount;
}
let frameCounts: FrameCounts[] = [];
// Counter runs AFTER crosshair reads (needs the crosshair file) — see below

// ---- VLM timer reads (sparse — 1fps) ----
const TIMER_PROMPT = `You are reading a CROPPED region from a NIKKE boss fight HUD showing ONLY the
fight TIMER — a mm:ss countdown (e.g. 2:35, 0:07).
Return the time as seconds REMAINING (2:35 = 155, 0:07 = 7).
Respond with ONLY this JSON: {"timerSec": <integer>}`;

async function readTimerVlm(b64: string): Promise<number | null> {
  const body = {
    model,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: TIMER_PROMPT },
          {
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${b64}` },
          },
        ],
      },
    ],
    temperature: 0,
    max_tokens: 128,
  };
  try {
    const res = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apikey}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      return null;
    }
    const j = (await res.json()) as {
      choices?: { message?: { content?: unknown } }[];
    };
    let content = j?.choices?.[0]?.message?.content ?? '';
    if (Array.isArray(content)) {
      content = content
        .map((c) => (c as { text?: string }).text ?? '')
        .join('');
    }
    let s = String(content).trim();
    const a = s.indexOf('{'),
      b = s.lastIndexOf('}');
    if (a >= 0 && b > a) {
      s = s.slice(a, b + 1);
    }
    const o = (JSON.parse(s) ?? {}) as { timerSec?: unknown };
    return typeof o.timerSec === 'number' ? Math.round(o.timerSec) : null;
  } catch {
    return null;
  }
}

// Read timer at 1fps, build spine, map to pellet frame timestamps
console.log(
  `  reading timer @ ${TIMER_FPS}fps (${timerFiles.length} VLM calls) ...`
);
const t0Timer = Date.now();
const timerReads: { videoT: number; timerSec: number | null }[] = [];
for (let i = 0; i < timerFiles.length; i++) {
  const videoT = at + i / TIMER_FPS;
  let timerSec: number | null;
  if (mock) {
    timerSec = Math.max(0, 180 - Math.floor(videoT - 5));
  } else {
    const b64 = readFileSync(`${timerFramesDir}/${timerFiles[i]}`).toString(
      'base64'
    );
    timerSec = await readTimerVlm(b64);
  }
  timerReads.push({ videoT, timerSec });
  if ((i + 1) % 10 === 0 || i + 1 === timerFiles.length) {
    console.log(
      `    ${i + 1}/${timerFiles.length}  t=${videoT.toFixed(0)}s  timer=${timerSec}`
    );
  }
}
console.log(`  timer VLM: ${((Date.now() - t0Timer) / 1000).toFixed(1)}s`);

// ---- VLM crosshair reads (skipped when ammo template is available) ----
const crosshairFile = `${outDir}/crosshairs.json`;
if (forceVlmCrosshair || !existsSync(ammoTemplatePath)) {
  const CROSSHAIR_PROMPT = `You are looking at a cropped region from a NIKKE boss fight showing the
damage area around the boss. Find the CROSSHAIR — the small aiming reticle where the player's
shots impact. It is usually a small circle, diamond, or chevron shape near the centre of the
action, often with 4 small triangular hit-markers around it.
Return its approximate centre position as normalized coordinates (x: 0=left, 1000=right;
y: 0=top, 1000=bottom) within THIS image.
If you cannot find a crosshair, return null for both.
Respond with ONLY this JSON: {"x": <int or null>, "y": <int or null>}`;

  async function readCrosshairVlm(
    b64: string
  ): Promise<{ x: number | null; y: number | null }> {
    const body = {
      model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: CROSSHAIR_PROMPT },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${b64}` },
            },
          ],
        },
      ],
      temperature: 0,
      max_tokens: 128,
    };
    try {
      const res = await fetch(`${endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apikey}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        return { x: null, y: null };
      }
      const j = (await res.json()) as {
        choices?: { message?: { content?: unknown } }[];
      };
      let content = j?.choices?.[0]?.message?.content ?? '';
      if (Array.isArray(content)) {
        content = content
          .map((c) => (c as { text?: string }).text ?? '')
          .join('');
      }
      let s = String(content).trim();
      const a = s.indexOf('{'),
        b = s.lastIndexOf('}');
      if (a >= 0 && b > a) {
        s = s.slice(a, b + 1);
      }
      const o = (JSON.parse(s) ?? {}) as { x?: unknown; y?: unknown };
      return {
        x: typeof o.x === 'number' ? Math.round(o.x) : null,
        y: typeof o.y === 'number' ? Math.round(o.y) : null,
      };
    } catch {
      return { x: null, y: null };
    }
  }

  // Read crosshair at 1fps on the damage area frames, then interpolate to all pellet frames
  console.log(`  reading crosshair @ ${TIMER_FPS}fps ...`);
  const t0Cross = Date.now();
  const crosshairSamples: {
    videoT: number;
    x: number | null;
    y: number | null;
  }[] = [];
  const crosshairInterval = Math.round(fps / TIMER_FPS); // read every Nth pellet frame
  for (let i = 0; i < pelletFiles.length; i += crosshairInterval) {
    const videoT =
      at + (parseInt(pelletFiles[i].replace(/\D/g, ''), 10) - 1) / fps;
    let pos: { x: number | null; y: number | null };
    if (mock) {
      pos = { x: 500, y: 500 };
    } else {
      const b64 = readFileSync(`${pelletFramesDir}/${pelletFiles[i]}`).toString(
        'base64'
      );
      pos = await readCrosshairVlm(b64);
      // VLMs often return pixel coords instead of normalized — detect and convert
      const imgW = 1303 * zoom,
        imgH = 396 * zoom; // damage area crop at zoom
      if (pos.x != null && pos.x > 1000) {
        pos.x = Math.round((pos.x / imgW) * 1000);
      }
      if (pos.y != null && pos.y > 1000) {
        pos.y = Math.round((pos.y / imgH) * 1000);
      }
      // Clamp to valid range
      if (pos.x != null) {
        pos.x = Math.max(0, Math.min(1000, pos.x));
      }
      if (pos.y != null) {
        pos.y = Math.max(0, Math.min(1000, pos.y));
      }
    }
    crosshairSamples.push({ videoT, ...pos });
  }
  console.log(
    `  crosshair VLM: ${((Date.now() - t0Cross) / 1000).toFixed(1)}s  (${crosshairSamples.length} samples)`
  );

  // Interpolate crosshair to all pellet frames and write the crosshair file
  const crosshairMap: Record<string, { x: number; y: number }> = {};
  const goodSamples = crosshairSamples.filter(
    (s) => s.x != null && s.y != null
  );
  if (goodSamples.length >= 2) {
    for (const f of pelletFiles) {
      const idx = parseInt(f.replace(/\D/g, ''), 10);
      const videoT = at + (idx - 1) / fps;
      // Find nearest sample
      let best = goodSamples[0],
        bd = Infinity;
      for (const s of goodSamples) {
        const d = Math.abs(s.videoT - videoT);
        if (d < bd) {
          bd = d;
          best = s;
        }
      }
      crosshairMap[f] = { x: best.x!, y: best.y! };
    }
  }
  const crosshairFile = `${outDir}/crosshairs.json`;
  writeFileSync(crosshairFile, JSON.stringify(crosshairMap, null, 2) + '\n');
  console.log(
    `  crosshair positions: ${Object.keys(crosshairMap).length} frames -> ${crosshairFile}`
  );
} else {
  console.log('  crosshair: using ammo box template matching (skipping VLM)');
}

// ---- run Python pellet counter (AFTER crosshair reads) ----
if (!mock) {
  console.log(
    `  running pellet counter on ${pelletFiles.length} frames (OpenCV, crosshair-directed) ...`
  );
  const t0Count = Date.now();
  const centerExclude = Number(flags['center-exclude'] ?? 18 * zoom);
  const zoomScale = (zoom / 4) ** 2;
  const minArea = Math.round(100 * zoomScale);
  const maxArea = Math.round(3000 * zoomScale);
  const pelletRadius = Math.round(Number(flags['pellet-radius'] ?? 80 * zoom));
  const ammoOffsetX = Math.round(ammoOffsetXNative * zoom);
  const ammoOffsetY = Math.round(ammoOffsetYNative * zoom);
  const ammoTemplate = existsSync(perVideoAmmoTemplate)
    ? perVideoAmmoTemplate
    : ammoTemplatePath;
  const useAmmoTemplate = existsSync(ammoTemplate);
  const crosshairArgs = useAmmoTemplate
    ? `--ammo-template "${ammoTemplate}" --ammo-offset-x ${ammoOffsetX} --ammo-offset-y ${ammoOffsetY} --ammo-roi-x0 0.55 --ammo-roi-y0 0.50`
    : `--crosshair-file "${crosshairFile}"`;
  const redRMin = Number(flags['red-r-min'] ?? 200);
  const redGbMax = Number(flags['red-gb-max'] ?? 60);
  const markerRadius = Number(flags['marker-radius'] ?? 65);
  // Peanut (overlapping-pellet) recovery: unit area scales with zoom² (~314px² at 2x).
  const pelletUnitArea = Number(
    flags['pellet-unit-area'] ?? Math.round(80 * zoom * zoom)
  );
  const peanutCircLo = Number(flags['peanut-circ-lo'] ?? 0.3);
  const peanutAspect = Number(flags['peanut-aspect'] ?? 0.45);
  const peanutMaxMult = Number(flags['peanut-max-mult'] ?? 0);
  const dumpTracksFlag = flags['dump-tracks'];
  const dumpTracksArg =
    dumpTracksFlag === 'true'
      ? `--dump-tracks "${outDir}/tracks.json"`
      : dumpTracksFlag
        ? `--dump-tracks "${dumpTracksFlag}"`
        : '';
  const raw = execSync(
    `"${pythonBin}" "${counterScript}" "${pelletFramesDir}" --center-exclude ${centerExclude} --min-area ${minArea} --max-area ${maxArea} --backend opencv ${crosshairArgs} --pellet-radius ${pelletRadius} --marker-radius ${markerRadius} --temporal --max-pellet-frames ${Math.max(4, Math.round((13 / 60) * fps))} --red-r-min ${redRMin} --red-gb-max ${redGbMax} --pellet-unit-area ${pelletUnitArea} --peanut-circ-lo ${peanutCircLo} --peanut-aspect ${peanutAspect} --peanut-max-mult ${peanutMaxMult} ${dumpTracksArg}`,
    { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 }
  );
  frameCounts = JSON.parse(raw) as FrameCounts[];
  console.log(
    `  counter: ${((Date.now() - t0Count) / 1000).toFixed(1)}s  (~${Math.round((Date.now() - t0Count) / pelletFiles.length)}ms/frame)`
  );
}

// Timer spine: find longest consistent run, extrapolate
function buildTimerSpine(
  reads: { videoT: number; timerSec: number | null }[]
): { fightStartVideoT: number | null; timerAt(videoT: number): number | null } {
  const step = 1 / TIMER_FPS;
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
  if (bestLen < 3) {
    return { fightStartVideoT: null, timerAt: () => null };
  }
  const spineIdx = bestStart + Math.floor(bestLen / 2);
  const spineVal = reads[spineIdx].timerSec!;
  const spineVideoT = reads[spineIdx].videoT;
  const fightStartVideoT =
    Math.round((spineVideoT + spineVal - 180) * 100) / 100;
  return {
    fightStartVideoT,
    timerAt: (videoT: number) => {
      const t = Math.round(spineVal - (videoT - spineVideoT) * TIMER_FPS);
      return t >= 0 && t <= 180 ? t : null;
    },
  };
}
const spine = buildTimerSpine(timerReads);
if (spine.fightStartVideoT != null) {
  console.log(`  fight starts at videoT=${spine.fightStartVideoT}s`);
}

// ---- assemble pellet reads with timer from spine ----
interface Read {
  videoT: number;
  timerSec: number | null;
  fightT: number | null;
  counts: Record<string, PelletCount>;
  white: number;
  red: number;
  marker: number;
  total: number;
  valid: boolean;
}
const reads: Read[] = [];
for (let i = 0; i < pelletFiles.length; i++) {
  const idx = parseInt(pelletFiles[i].replace(/\D/g, ''), 10);
  const videoT = at + (idx - 1) / fps;
  const fc = mock
    ? {
        numpy: { white: 7, red: 0, marker: 0 },
        pil: { white: 7, red: 0, marker: 0 },
        opencv: { white: 8, red: 0, marker: 0 },
      }
    : (frameCounts[i] ?? {
        numpy: { white: 0, red: 0, marker: 0 },
        pil: { white: 0, red: 0, marker: 0 },
        opencv: { white: 0, red: 0, marker: 0 },
      });

  // Consensus: median of active backends (single-backend mode fills others with 0)
  const backendEntries = [fc.numpy, fc.pil, fc.opencv];
  const activeTotals = backendEntries
    .map((b) => b.white + b.red)
    .filter((t) => t > 0)
    .sort((a, b) => a - b);
  const total = activeTotals.length
    ? activeTotals[Math.floor(activeTotals.length / 2)]
    : 0;
  const best = backendEntries.reduce((a, b) =>
    Math.abs(b.white + b.red - total) < Math.abs(a.white + a.red - total)
      ? b
      : a
  );

  const timerSec = spine.timerAt(videoT);
  const fightT =
    spine.fightStartVideoT != null
      ? Math.round((videoT - spine.fightStartVideoT) * 100) / 100
      : null;
  const valid = total >= MIN_PELLETS && total <= MAX_PELLETS;

  reads.push({
    videoT,
    timerSec,
    fightT,
    counts: { numpy: fc.numpy, pil: fc.pil, opencv: fc.opencv },
    white: best.white,
    red: best.red,
    marker: best.marker ?? 0,
    total,
    valid,
  });
}
const nonZero = reads.filter((r) => r.total > 0).length;
console.log(`  ${reads.length} pellet reads, ${nonZero} non-zero`);

// ---- debounce: gap-tolerant event grouping ----
// Pellet markers last ~13 game-frames (0.217s). At 30fps we catch ~6 frames per blast,
// but threshold sensitivity creates zero-frame gaps within a single blast. Bridge gaps
// of ≤MAX_GAP frames where total < EVENT_MIN; separate blasts are 0.667s apart.
const MAX_GAP = Math.max(3, Math.round(fps * 0.13)); // ~0.13s gap tolerance
const EVENT_MIN = 3; // ignore T=1-2 as background noise
// Core-hit fallback: if a shot event contains a frame with >= markerMin red hit-markers
// (the triangles that flash on a core hit), report at least 1 red even though the red core
// pellet itself isn't detected by the threshold. Precision over recall — see HANDOFF.
const MARKER_MIN = Number(flags['marker-min'] ?? 2);
interface Shot {
  videoT: number;
  fightT: number | null;
  timerSec: number | null;
  white: number;
  red: number;
  total: number;
  frames: number;
  core: boolean;
  backendAgreement: string;
}
const shots: Shot[] = [];
let eventStart = -1;
let zeroRun = 0;
for (let i = 0; i <= reads.length; i++) {
  const inEvent = i < reads.length && reads[i].total >= EVENT_MIN;
  if (inEvent) {
    if (eventStart < 0) {
      eventStart = i;
    }
    zeroRun = 0;
    continue;
  }
  if (eventStart >= 0) {
    zeroRun++;
    if (zeroRun <= MAX_GAP && i < reads.length) {
      continue;
    } // bridge the gap
    // Flush event (exclude trailing zero frames)
    const eventEnd = i - zeroRun;
    const eventFrames = eventEnd - eventStart;
    if (eventFrames >= 2) {
      // Robust shot count: report the active frame (total >= EVENT_MIN) closest to the
      // event's median total. A single frame frequently spikes 2-7 above the true count
      // from transient VFX that passes every per-component filter; the old max-of-event
      // reported that spike as the shot count. The median-level frame rejects it while
      // still returning a real observed frame (so white + red === total).
      const activeIdx: number[] = [];
      for (let j = eventStart; j < eventEnd; j++) {
        if (reads[j].total >= EVENT_MIN) {
          activeIdx.push(j);
        }
      }
      const sortedTotals = activeIdx
        .map((j) => reads[j].total)
        .sort((a, b) => a - b);
      const medianTotal = sortedTotals.length
        ? (sortedTotals[(sortedTotals.length - 1) >> 1] +
            sortedTotals[sortedTotals.length >> 1]) /
          2
        : 0;
      let repIdx = activeIdx[0] ?? eventStart;
      let bestD = Infinity;
      for (const j of activeIdx) {
        const d = Math.abs(reads[j].total - medianTotal);
        if (d < bestD) {
          bestD = d;
          repIdx = j;
        }
      }
      const rep = reads[repIdx];
      // Core-hit fallback: the red core pellet itself isn't caught by the threshold, but the
      // triangular hit-markers that flash on a core hit are. If any frame in the event has
      // >= MARKER_MIN markers, a core hit landed → report exactly 1 red (a lower bound; the
      // "rare 2" needs real red-pellet detection — see HANDOFF). Outer-zone red is VFX noise
      // (area ~43px², not pellet-sized) and is deliberately NOT counted here.
      let coreHit = false;
      for (let j = eventStart; j < eventEnd; j++) {
        if (reads[j].marker >= MARKER_MIN) {
          coreHit = true;
        }
      }
      const shotRed = coreHit ? 1 : 0;
      const agreement = ['numpy', 'pil', 'opencv']
        .map((b) => {
          const c = (rep.counts as Record<string, PelletCount>)[b];
          return `${b}:${c.white + c.red}`;
        })
        .join(' ');
      shots.push({
        videoT: rep.videoT,
        fightT: rep.fightT,
        timerSec: rep.timerSec,
        white: rep.white,
        red: shotRed,
        total: rep.white + shotRed,
        frames: eventFrames,
        core: coreHit,
        backendAgreement: agreement,
      });
    }
    eventStart = -1;
    zeroRun = 0;
  }
}

// ---- output ----
const validShots = shots.filter(
  (s) => s.total >= MIN_PELLETS && s.total <= MAX_PELLETS
);
const result = {
  video,
  fps,
  at,
  dur: dur || null,
  coreRate,
  pelletCrop,
  timerCrop,
  zoom,
  framesProcessed: reads.length,
  timerFrames: timerFiles.length,
  fightStartVideoT: spine.fightStartVideoT,
  bounds: { min: MIN_PELLETS, max: MAX_PELLETS },
  reads: reads.map((r) => ({
    videoT: Math.round(r.videoT * 1000) / 1000,
    timerSec: r.timerSec,
    fightT: r.fightT,
    white: r.white,
    red: r.red,
    marker: r.marker,
    total: r.total,
    valid: r.valid,
    backends: r.counts,
  })),
  shots,
  summary: {
    totalShots: shots.length,
    validShots: validShots.length,
    expectedShots: dur ? Math.round(dur * 1.5) : null,
    avgTotal: validShots.length
      ? +(
          validShots.reduce((a, s) => a + s.total, 0) / validShots.length
        ).toFixed(1)
      : null,
    avgRed: validShots.length
      ? +(
          validShots.reduce((a, s) => a + s.red, 0) / validShots.length
        ).toFixed(2)
      : null,
  },
};
const rawOut = `${outDir}/pellets.json`;
writeFileSync(rawOut, JSON.stringify(result, null, 2) + '\n');
console.log(`\nwrote ${rawOut}`);
console.log(
  `  ${shots.length} shots (${validShots.length} valid ${MIN_PELLETS}-${MAX_PELLETS}` +
    `${result.summary.expectedShots ? `, expected ~${result.summary.expectedShots}` : ''})`
);
if (validShots.length) {
  console.log(
    `  avg total: ${result.summary.avgTotal}  avg red: ${result.summary.avgRed}`
  );
  console.log('  shots:');
  for (const s of shots.slice(0, 25)) {
    console.log(
      `    fight=${s.fightT != null ? s.fightT.toFixed(2) + 's' : '?'}  W=${s.white} R=${s.red} T=${s.total}${s.total >= MIN_PELLETS && s.total <= MAX_PELLETS ? '' : ' ⚠'}${s.core ? ' ◆core' : ''}  (${s.frames}f)  [${s.backendAgreement}]`
    );
  }
  if (shots.length > 25) {
    console.log(`    ... and ${shots.length - 25} more`);
  }
}
