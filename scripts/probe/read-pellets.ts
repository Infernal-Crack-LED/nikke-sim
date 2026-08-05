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
//     --zoom <n>            pellet crop upscale (default 2 — matches the committed ammo-box
//                           template and every reference run; see H3,
//                           docs/handoffs/2026-07-30-pellet-reader-implementation-plan.md)
//     --core-rate <0-1>     expected core hit fraction (default 0.05)
//     --center-exclude <n>  crosshair exclusion radius in zoomed px (default 18*zoom)
//     --pellet-radius <n>   count pellets within this radius of crosshair in zoomed px (default 80*zoom)
//     --mock                synthetic reads (no VLM / Python needed)
//     --out <dir>           scratch dir (default $CLAUDE_SCRATCH|/tmp/pellets)
//     --locate <mode>       crosshair localization: "template" (default, per-video
//                           cv2.matchTemplate) or "structural" (find the ammo counter by
//                           shape — 2-3 digit glyphs on a dark badge; no template, does not
//                           depend on any one video's pixels — see count-pellets.py's
//                           locate_ammo_structural and Phase 2A part 2 of
//                           docs/handoffs/2026-07-30-pellet-reader-implementation-plan.md)
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
import { selectPassengerChannel } from './pellet-backend-select.js';

const argv = process.argv.slice(2);
const flags: Record<string, string> = {};
// The video is the first NON-FLAG positional token, wherever it falls — not always argv[0].
// `--debounce-json <path> [--fps N]` has no video argument at all (its early-exit branch below
// runs before `video` is ever checked), so scanning from i=1 and assuming argv[0] is the video
// would silently swallow `--debounce-json` itself as `video` and never parse it into `flags`.
let video = '';
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--')) {
    flags[argv[i].slice(2)] =
      argv[i + 1]?.startsWith('--') || argv[i + 1] === undefined
        ? 'true'
        : argv[++i];
  } else if (!video) {
    video = argv[i];
  }
}
const MIN_PELLETS = 5;
const MAX_PELLETS = 10;

// ---- --debounce-json: pure JSON-in/JSON-out harness for the debounce block, no video/ffmpeg/VLM
// needed. Mirrors count-pellets.py's standalone `debounce_shots(frame_counts, fps, ...)` exactly —
// same input shape ({white,red,marker,band} per frame), same output shape ({shots, summary}) — so
// the two implementations can be fed the SAME frame_counts array and diffed on a COMMON input
// (docs/handoffs/2026-08-04-representative-frame-PROPOSAL.md §4 criterion 5, the lockstep
// requirement; see also §11G on why "common input" matters). `debounceShots` is a hoisted function
// declaration, so calling it here (before its textual definition further down) is safe. This
// branch runs BEFORE the video-required check below, so no video argument is needed.
if (flags['debounce-json']) {
  const djFrames = JSON.parse(readFileSync(flags['debounce-json'], 'utf8')) as {
    white: number;
    red: number;
    marker?: number;
    band?: number;
  }[];
  const djFps = Number(flags.fps ?? 30);
  const djMarkerMin = Number(flags['marker-min'] ?? 2);
  const djMin = Number(flags['min-pellets'] ?? MIN_PELLETS);
  const djMax = Number(flags['max-pellets'] ?? MAX_PELLETS);
  const djResult = debounceShots(djFrames, djFps, djMarkerMin, djMin, djMax);
  console.log(JSON.stringify(djResult));
  process.exit(0);
}

if (!video || !existsSync(video)) {
  console.error(
    'usage: read-pellets.ts <video> [--fps 30] [--at S] [--dur S] [--endpoint URL] [--model NAME] [--pellet-crop "..."] [--timer-crop "..."] [--zoom 2] [--core-rate 0.05] [--center-exclude N] [--pellet-radius N] [--ammo-offset-x X] [--ammo-offset-y Y] [--mock] [--out DIR]\n       read-pellets.ts --debounce-json <frame_counts.json> [--fps 30] [--marker-min 2] [--min-pellets 5] [--max-pellets 10]'
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
// Default 2, not 4/3 as earlier drafts of this file claimed: the committed
// ammo-box-template.png (74x74px) and every historical reference run (run16/18, noir-sg,
// guilty-sg, isabel-sg, g2-noir-structural) used zoom 2. A run at a different zoom silently
// mismatches the template's scale — see H3, docs/handoffs/2026-07-30-pellet-reader-implementation-plan.md.
const zoom = Number(flags.zoom ?? 2);
const coreRate = Number(flags['core-rate'] ?? 0.05);
const ammoOffsetXNative = Number(flags['ammo-offset-x'] ?? 62.5);
const ammoOffsetYNative = Number(flags['ammo-offset-y'] ?? -5.5);
const locateMode = flags.locate === 'structural' ? 'structural' : 'template';
const mock = flags.mock === 'true';
const outDir = flags.out ?? (process.env.CLAUDE_SCRATCH ?? '/tmp') + '/pellets';
const scriptDir = fileURLToPath(new URL('.', import.meta.url));
const pythonBin = `${scriptDir}.venv/bin/python`;
const counterScript = `${scriptDir}count-pellets.py`;
const ammoTemplatePath = `${scriptDir}ammo-box-template.png`;
const forceVlmCrosshair = flags['no-ammo-template'] === 'true';

const TIMER_FPS = 1; // sparse timer sampling — VLM is the bottleneck, not the counter

// PNG width/height live at a fixed offset in the IHDR chunk (8-byte signature, then a 4-byte
// chunk length + "IHDR", then width/height as big-endian uint32) — no image library needed.
function pngDimensions(path: string): { width: number; height: number } {
  const buf = readFileSync(path);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

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
// Skipped entirely under --locate structural: that mode finds the ammo counter by its SHAPE
// (2-3 digit glyphs on a dark badge), not by matching one video's box pixels — see
// locate_ammo_structural in count-pellets.py and Phase 2A part 2 of
// docs/handoffs/2026-07-30-pellet-reader-implementation-plan.md.
const perVideoAmmoTemplate = `${outDir}/ammo-box-template.png`;
if (locateMode === 'template') {
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
}

// ---- run Python pellet counter on ALL pellet frames (fast, no VLM) ----
interface PelletCount {
  white: number;
  red: number;
  marker?: number; // core-hit hit-markers (red triangles tight to the crosshair)
  band?: number; // lifetime-gated pellet-track count (docs/probe-runs.md §9G/§13), restricted to
  // tracks whose overall lifetime falls in [band_lo, band_hi] and bounded by radius + non-red
  // only (NOT by pellet_ids/`white`'s gate) — may EXCEED `white` when band_hi > max_pellet_frames
  // (docs/handoffs/2026-08-04-band-hi-LANDING-PLAN.md). Feeds the fallback-hybrid
  // representative-frame rule in `debounceShots`.
}
interface FrameCounts {
  file: string;
  numpy: PelletCount;
  pil: PelletCount;
  opencv: PelletCount;
}
let frameCounts: FrameCounts[] = [];
// Counter runs AFTER crosshair reads (needs the crosshair file) — see below

// ============================================================
// debounce: gap-tolerant event grouping, plus the FALLBACK HYBRID representative-frame rule
// (docs/handoffs/2026-08-04-representative-frame-PROPOSAL.md §2/§4, landed docs/probe-runs.md
// §13). A `function` declaration (hoisted) so `--debounce-json` can call it before this point in
// the file. KEEP THIS IN LOCKSTEP WITH count-pellets.py's `debounce_shots` — a second
// implementation of the same algorithm, not a shared module (same precedent as the rest of this
// file's relationship to count-pellets.py).
// ============================================================
interface DebounceFrame {
  white: number;
  red: number;
  marker?: number;
  band?: number;
}
interface DebounceShot {
  frame: number;
  white: number;
  red: number;
  total: number;
  frames: number;
  core: boolean;
  start: number;
  end: number;
}
interface DebounceSummary {
  totalShots: number;
  validShots: number;
  avgTotal: number | null;
  avgRed: number | null;
}

// `plateau_median`'s frame-selection rule (docs/handoffs/2026-08-04-representative-frame-
// PROPOSAL.md §2): the longest contiguous run of ACTIVE frames (>= eventMin) in [a, b) whose
// values all fall within +-1 of the run's own mode. `totals` is a Map (absent keys read as 0).
// Ported verbatim from analyze-pellet-tracks.py's `_ps_longest_modal_run` / count-pellets.py's
// `_longest_modal_run` (the `--policy-score` arm's `hybrid_plateau_median` reference).
function longestModalRun(
  totals: Map<number, number>,
  a: number,
  b: number,
  eventMin: number
): number[] {
  const frames: number[] = [];
  for (let j = a; j < b; j++) {
    if ((totals.get(j) ?? 0) >= eventMin) {
      frames.push(j);
    }
  }
  if (!frames.length) {
    return [];
  }
  const blocks: number[][] = [];
  let cur = [frames[0]];
  for (let k = 1; k < frames.length; k++) {
    if (frames[k] === cur[cur.length - 1] + 1) {
      cur.push(frames[k]);
    } else {
      blocks.push(cur);
      cur = [frames[k]];
    }
  }
  blocks.push(cur);

  let best: number[] = [];
  for (const block of blocks) {
    const n = block.length;
    if (n <= best.length) {
      continue;
    }
    for (let length = n; length > best.length; length--) {
      let found: number[] | null = null;
      for (let start = 0; start <= n - length; start++) {
        const sub = block.slice(start, start + length);
        const vals = sub.map((f) => totals.get(f) ?? 0);
        const counts = new Map<number, number>();
        for (const v of vals) {
          counts.set(v, (counts.get(v) ?? 0) + 1);
        }
        let mode = vals[0];
        let modeCount = 0;
        for (const [v, c] of counts) {
          if (c > modeCount) {
            modeCount = c;
            mode = v;
          }
        }
        if (vals.every((v) => Math.abs(v - mode) <= 1)) {
          found = sub;
          break;
        }
      }
      if (found !== null) {
        best = found;
        break;
      }
    }
  }
  return best;
}

function plateauRep(
  totals: Map<number, number>,
  a: number,
  b: number,
  eventMin: number
): number | null {
  const run = longestModalRun(totals, a, b, eventMin);
  return run.length ? run[Math.floor(run.length / 2)] : null;
}

// Pellet markers last ~13 game-frames (0.217s). At 30fps we catch ~6 frames per blast, but
// threshold sensitivity creates zero-frame gaps within a single blast. Bridge gaps of <= maxGap
// frames where total < eventMin; separate blasts are 0.667s apart.
function debounceShots(
  frameCountsIn: DebounceFrame[],
  fps: number,
  markerMin: number,
  minPellets: number,
  maxPellets: number
): { shots: DebounceShot[]; summary: DebounceSummary } {
  const maxGap = Math.max(3, Math.round(fps * 0.13));
  const eventMin = 3;
  const hasBand = frameCountsIn.some((r) => r.band !== undefined);
  const totals = frameCountsIn.map((r) => r.white + r.red);
  const n = frameCountsIn.length;
  const shots: DebounceShot[] = [];
  let eventStart = -1;
  let zeroRun = 0;
  for (let i = 0; i <= n; i++) {
    const inEvent = i < n && totals[i] >= eventMin;
    if (inEvent) {
      if (eventStart < 0) {
        eventStart = i;
      }
      zeroRun = 0;
      continue;
    }
    if (eventStart >= 0) {
      zeroRun++;
      if (zeroRun <= maxGap && i < n) {
        continue;
      } // bridge the gap
      // Flush event (exclude trailing zero frames)
      const eventEnd = i - zeroRun;
      const eventFrames = eventEnd - eventStart;
      if (eventFrames >= 2) {
        // Robust shot count: report the active frame (total >= eventMin) closest to the
        // event's median total. A single frame frequently spikes 2-7 above the true count
        // from transient VFX that passes every per-component filter; the old max-of-event
        // reported that spike as the shot count. The median-level frame rejects it while
        // still returning a real observed frame (so white + red === total).
        const activeIdx: number[] = [];
        for (let j = eventStart; j < eventEnd; j++) {
          if (totals[j] >= eventMin) {
            activeIdx.push(j);
          }
        }
        const sortedTotals = activeIdx
          .map((j) => totals[j])
          .sort((a, b) => a - b);
        const medianTotal = sortedTotals.length
          ? (sortedTotals[(sortedTotals.length - 1) >> 1] +
              sortedTotals[sortedTotals.length >> 1]) /
            2
          : 0;
        let repIdx = activeIdx[0] ?? eventStart;
        let bestD = Infinity;
        for (const j of activeIdx) {
          const d = Math.abs(totals[j] - medianTotal);
          if (d < bestD) {
            bestD = d;
            repIdx = j;
          }
        }
        // Core-hit fallback: the red core pellet itself isn't caught by the threshold, but the
        // triangular hit-markers that flash on a core hit are. If any frame in the event has
        // >= markerMin markers, a core hit landed → report exactly 1 red (a lower bound; the
        // "rare 2" needs real red-pellet detection — see HANDOFF). Outer-zone red is VFX noise
        // (area ~43px², not pellet-sized) and is deliberately NOT counted here.
        let coreHit = false;
        for (let j = eventStart; j < eventEnd; j++) {
          if ((frameCountsIn[j].marker ?? 0) >= markerMin) {
            coreHit = true;
          }
        }
        const shotRed = coreHit ? 1 : 0;
        let repFrame = repIdx;
        let white = frameCountsIn[repIdx].white;
        let total = white + shotRed;
        // The FALLBACK HYBRID: only ever REPLACES repFrame/white/total above, never
        // shotRed/coreHit/eventFrames/eventStart/eventEnd — those are unchanged by the
        // representative-frame rule regardless of which policy picked the frame.
        // BACKWARD COMPAT: `hasBand` is computed once, up front, from the WHOLE input — if no
        // frame anywhere carries a `band` key, this block never runs and the shot below is
        // byte-identical to the pre-hybrid shipped behaviour.
        if (hasBand) {
          const bandTotals = new Map<number, number>();
          for (let j = eventStart; j < eventEnd; j++) {
            bandTotals.set(j, frameCountsIn[j].band ?? 0);
          }
          const bandRep = plateauRep(
            bandTotals,
            eventStart,
            eventEnd,
            eventMin
          );
          if (bandRep !== null) {
            repFrame = bandRep;
            white = bandTotals.get(bandRep) ?? 0;
            total = white + shotRed;
          }
        }
        shots.push({
          frame: repFrame,
          white,
          red: shotRed,
          total,
          frames: eventFrames,
          core: coreHit,
          start: eventStart,
          end: eventEnd,
        });
      }
      eventStart = -1;
      zeroRun = 0;
    }
  }

  const valid = shots.filter(
    (s) => s.total >= minPellets && s.total <= maxPellets
  );
  const summary: DebounceSummary = {
    totalShots: shots.length,
    validShots: valid.length,
    avgTotal: valid.length
      ? Math.round(
          (valid.reduce((a, s) => a + s.total, 0) / valid.length) * 10
        ) / 10
      : null,
    avgRed: valid.length
      ? Math.round(
          (valid.reduce((a, s) => a + s.red, 0) / valid.length) * 100
        ) / 100
      : null,
  };
  return { shots, summary };
}

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
if (
  locateMode === 'template' &&
  (forceVlmCrosshair || !existsSync(ammoTemplatePath))
) {
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
  console.log(
    locateMode === 'structural'
      ? '  crosshair: using structural digit-row localization (skipping VLM + template)'
      : '  crosshair: using ammo box template matching (skipping VLM)'
  );
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
  if (locateMode === 'template' && useAmmoTemplate) {
    // The committed seed template (ammo-box-template.png, 74x74px at zoom 2) is what
    // extract-ammo-template.py matches against to derive a per-video template — it never
    // rescales the seed to the run's --zoom, so EVERY template this pipeline produces is
    // implicitly zoom-2-shaped. Running template mode at a different --zoom silently
    // mismatches cv2.matchTemplate's window against the on-screen box: the match never
    // clears its confidence threshold, so the crosshair never locks and the counter reports
    // 0 shots in a JSON that otherwise looks valid. See H3,
    // docs/handoffs/2026-07-30-pellet-reader-implementation-plan.md.
    const NATIVE_AMMO_BOX_PX = 37; // 74px committed template / zoom 2
    const { width: tw, height: th } = pngDimensions(ammoTemplate);
    const impliedZoom = (tw + th) / 2 / NATIVE_AMMO_BOX_PX;
    if (Math.abs(impliedZoom - zoom) > 0.5) {
      console.error(
        `error: ammo template "${ammoTemplate}" is ${tw}x${th}px, which implies zoom ≈` +
          `${impliedZoom.toFixed(1)}, but this run uses --zoom ${zoom}. Template-matching will ` +
          `silently fail to lock the crosshair at the wrong scale (see H3, ` +
          `docs/handoffs/2026-07-30-pellet-reader-implementation-plan.md). Re-run at ` +
          `--zoom ${Math.round(impliedZoom)}, or regenerate the template at --zoom ${zoom}.`
      );
      process.exit(1);
    }
  }
  // Structural mode's geometry constants are calibrated at zoom 2 (162/-12.5/74 — see
  // count-pellets.py's own defaults) and must be scaled to whatever --zoom this run actually
  // uses, the same way ammoOffsetX/Y above are scaled — passing count-pellets.py's OWN --zoom
  // default (1) here would silently mis-scale them exactly like the --zoom 2 vs 3 mismatch H3
  // documents for the template path.
  const structTemplH = 37 * zoom;
  const structOffsetX = 81 * zoom;
  const structOffsetY = -6.25 * zoom;
  const crosshairArgs =
    locateMode === 'structural'
      ? `--locate structural --struct-templ-h ${structTemplH} --struct-offset-x ${structOffsetX} --struct-offset-y ${structOffsetY}`
      : useAmmoTemplate
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
    `"${pythonBin}" "${counterScript}" "${pelletFramesDir}" --center-exclude ${centerExclude} --min-area ${minArea} --max-area ${maxArea} --backend opencv ${crosshairArgs} --pellet-radius ${pelletRadius} --marker-radius ${markerRadius} --temporal --max-pellet-frames ${Math.max(4, Math.round((13 / 60) * fps))} --band-hi ${Math.max(4, Math.round((20 / 60) * fps))} --red-r-min ${redRMin} --red-gb-max ${redGbMax} --pellet-unit-area ${pelletUnitArea} --peanut-circ-lo ${peanutCircLo} --peanut-aspect ${peanutAspect} --peanut-max-mult ${peanutMaxMult} ${dumpTracksArg}`,
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
  band: number;
  total: number;
  valid: boolean;
}
const reads: Read[] = [];
for (let i = 0; i < pelletFiles.length; i++) {
  const idx = parseInt(pelletFiles[i].replace(/\D/g, ''), 10);
  const videoT = at + (idx - 1) / fps;
  const fc = mock
    ? {
        numpy: { white: 7, red: 0, marker: 0, band: 0 },
        pil: { white: 7, red: 0, marker: 0, band: 0 },
        opencv: { white: 8, red: 0, marker: 0, band: 0 },
      }
    : (frameCounts[i] ?? {
        numpy: { white: 0, red: 0, marker: 0, band: 0 },
        pil: { white: 0, red: 0, marker: 0, band: 0 },
        opencv: { white: 0, red: 0, marker: 0, band: 0 },
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
    marker: selectPassengerChannel(backendEntries, best, 'marker'),
    band: selectPassengerChannel(backendEntries, best, 'band'),
    total,
    valid,
  });
}
const nonZero = reads.filter((r) => r.total > 0).length;
console.log(`  ${reads.length} pellet reads, ${nonZero} non-zero`);

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
const perFrameForDebounce = reads.map((r) => ({
  white: r.white,
  red: r.red,
  marker: r.marker,
  band: r.band,
}));
const { shots: debouncedShots } = debounceShots(
  perFrameForDebounce,
  fps,
  MARKER_MIN,
  MIN_PELLETS,
  MAX_PELLETS
);
const shots: Shot[] = debouncedShots.map((s) => {
  const rep = reads[s.frame];
  const agreement = ['numpy', 'pil', 'opencv']
    .map((b) => {
      const c = (rep.counts as Record<string, PelletCount>)[b];
      return `${b}:${c.white + c.red}`;
    })
    .join(' ');
  return {
    videoT: rep.videoT,
    fightT: rep.fightT,
    timerSec: rep.timerSec,
    white: s.white,
    red: s.red,
    total: s.total,
    frames: s.frames,
    core: s.core,
    backendAgreement: agreement,
  };
});

// ---- output ----
const validShots = shots.filter(
  (s) => s.total >= MIN_PELLETS && s.total <= MAX_PELLETS
);

// Fail loudly rather than emitting an empty-but-valid pellets.json. Zero non-zero reads means
// the crosshair never locked for the whole run (every python-side pellet count is gated on a
// resolved crosshair position — see count-pellets.py's `if cp:` guard); zero shots means the
// debouncer never found a sustained-enough run of frames to call a blast, which happens
// whenever the crosshair lock never engages OR is too weak/sporadic to clear the shot
// threshold. Both are exactly the silent-0-shots failure mode H3 diagnosed (a zoom/template
// scale mismatch, but also anything else that starves the crosshair lock) — see
// docs/handoffs/2026-07-30-pellet-reader-implementation-plan.md.
if (!mock && (nonZero === 0 || shots.length === 0)) {
  console.error(
    nonZero === 0
      ? `error: zero non-zero pellet reads across ${reads.length} frames — the crosshair never ` +
          `locked for this whole run. Check --zoom (currently ${zoom}) against the ammo template ` +
          `size and --locate mode (currently "${locateMode}"); see H3, ` +
          `docs/handoffs/2026-07-30-pellet-reader-implementation-plan.md.`
      : `error: 0 shots detected across ${reads.length} frames (${nonZero} had a non-zero pellet ` +
          `count, but never sustained long enough to form a shot event). Check the crosshair lock ` +
          `quality and --zoom (currently ${zoom}); see H3, ` +
          `docs/handoffs/2026-07-30-pellet-reader-implementation-plan.md.`
  );
  process.exit(1);
}

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
