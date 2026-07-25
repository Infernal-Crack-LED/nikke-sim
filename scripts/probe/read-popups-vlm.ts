// VLM-based damage-popup reader (MVP). The classical-CV route (colour/outline/background-
// subtraction) could not separate popups from the bright, moving boss + VFX — confirmed on
// clean-weapons/marciana-solo.MP4. A vision model understands the scene semantically, so this
// samples frames and asks a LOCAL OpenAI-compatible vision server (e.g. Qwen2.5-VL-7B served by
// llama.cpp) to read the damage popups + fight timer per frame, then dedups the same popup across
// the frames it persists in (by value + position + time window) and emits Popup-schema readings.
//
//   npx tsx scripts/probe/read-popups-vlm.ts <video> --focus <slug> [opts]
//     --boss <Element>      boss element (default neutral)
//     --comp a,b,c          team slugs in slot order (default: solo focus)
//     --fps <n>             frame sampling rate (default 5; popups last ~0.3-0.5s)
//     --at <s> --dur <s>    clip window (default: whole video — use a short clip to test!)
//     --endpoint <url>      OpenAI-compatible base (default http://localhost:8090/v1 = the launchd server)
//     --model <name>        model field (llama.cpp serves whatever is loaded; default qwen2.5-vl)
//     --apikey <k>          bearer token if your server wants one (default no-key)
//     --crop "<ffmpeg>"     ffmpeg crop (default: pixel-perfect damage-number region for 2622x1206
//                           source, measured from annotated screenshot: crop=1303:396:672:268).
//                           Override for non-standard resolutions.
//     --pos-tol <n>         dedup position tolerance, 0-1000 normalized (default 70)
//     --time-win <s>        dedup time window = popup lifetime (default 0.7)
//     --min-looks <n>       looks required for auto-accept (default 3)
//     --min-agreement <f>   agreeing/total looks required for auto-accept (default 0.75)
//     --no-band-check       skip the hit-values band check (then NOTHING auto-accepts)
//     --band-tol <pct>      band-edge tolerance in percent (default 1)
//     --json-mode           request response_format=json_object (only if your server supports it)
//     --out <dir>           scratch dir for frames + raw JSON (default $CLAUDE_SCRATCH|/tmp/popup-vlm)
//     --save <slug>         also persist a (validated, UNVALIDATED-data) ParsedProbe to docs/probe-data/
//     --basis "<text>"      params.basis for a saved ParsedProbe (default "VLM auto-read (unvalidated)")
//
// Server: a durable llama-server is kept alive by launchd on :8090
//   (deploy/launchd/com.nikke-sim.model-vision.plist). To run one ad hoc instead:
//   llama-server -m ~/models/qwen2.5-vl-7b/Qwen2.5-VL-7B-Instruct-Q4_K_M.gguf \
//     --mmproj ~/models/qwen2.5-vl-7b/mmproj-Qwen2.5-VL-7B-Instruct-f16.gguf --port 8090
//
// CONFIDENCE + AUTO-ACCEPT (2026-07-24) — so high-confidence popups skip Opus confirmation.
// A popup persists for ~0.3-0.5s, so at --fps 5 the model gets 3-4 LOOKS at it, on DIFFERENT
// images. Those are genuinely independent samples even from a deterministic decoder (re-running
// the SAME frame is not — two runs over one video agreed 190/190 including their mistakes).
//   looks       = detections in this popup's time+position window, across all values
//   agreeing    = those that read THIS value
//   confidence  = agreeing / looks
//   inBand      = the value falls inside a hit-values band for the focus unit (hit-bands.ts)
// AUTO-ACCEPT = confidence >= --min-agreement AND agreeing >= --min-looks AND inBand. Everything
// else lands in needsConfirmation[], which Opus resolves in ONE batched frames.ts --times call.
// A value outside every band is surfaced, not dropped: it is either a misread or an unmodelled
// hit, and both are worth knowing about. `inBand` alone means the VALUE is corroborated; the
// stricter auto-accept additionally requires the CLASS (normal/crit/core) to be pinned.
//
// VALIDATION (2026-07-24, 20 frames of `control/lm.MP4` t=45-49 vs the hand read in
// `docs/probe-data/control-little-mermaid.json`): the gate "zero auto-accepted popups the hand
// read disagrees with" is MET — but VACUOUSLY, because 0 of 30 popups auto-accept there.
// little-mermaid's bands overlap outright (normal 14,664-69,913, its crit image 21,484-87,858,
// its core image 36,660-174,782), so no value can pin a class, which is the entanglement that
// probe's own notes describe. The first draft of the rule (looks + in-band only) auto-accepted 4,
// of which 2 were bad — a 10,818,572 "normal" matching only core bands, and a 64,733 called
// "crit" when 64,733 is that unit's NON-crit normal — and those two failures are what the
// class-consistency and class-unambiguity conditions were added to catch.
// ⇒ THE AUTO-ACCEPT PATH IS THEREFORE UNEXERCISED. Treat it as unproven until a focus unit with a
// CLEAN, non-overlapping band actually trips it; until then this reader's practical output is the
// ranked needsConfirmation[] list plus the batched frames.ts command that resolves it.
//
// Output: <out>/popup-reads.json with per-frame raw reads + deduped popups
//   (frame#, videoT, gameT from the in-game timer, value, crit/core, position, confidence),
//   plus autoAccepted[] / needsConfirmation[] and the band table used.

import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import type { Element } from '../../src/types.js';
import { saveParsed, type ParsedProbe, type Popup } from './parsed.js';
import { computeHitBands, matchBands, type BandHit, type HitBandTable } from './hit-bands.js';

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
    'usage: read-popups-vlm.ts <video> --focus <slug> [--boss E] [--comp a,b] [--fps 5] [--at S] [--dur S] [--endpoint URL] [--model NAME] [--crop "..."] [--pos-tol 70] [--time-win 0.7] [--max-tokens 1024] [--json-mode] [--mock] [--out DIR] [--save SLUG]',
  );
  process.exit(1);
}
const focus = flags.focus;
if (!focus) {
  console.error('--focus <slug> is required');
  process.exit(1);
}

const boss = (flags.boss as Element | undefined) ?? null;
const comp = flags.comp ? flags.comp.split(',') : [focus];
const fps = Number(flags.fps ?? 5);
const at = Number(flags.at ?? 0);
const dur = flags.dur ? Number(flags.dur) : 0;
const endpoint = (flags.endpoint ?? 'http://localhost:8090/v1').replace(
  /\/$/,
  '',
);
const model = flags.model ?? 'qwen2.5-vl';
const apikey = flags.apikey ?? 'no-key';
const crop = flags.crop ?? 'crop=1303:396:672:268';
const posTol = Number(flags['pos-tol'] ?? 70);
const timeWin = Number(flags['time-win'] ?? 0.7);
const minLooks = Number(flags['min-looks'] ?? 3);
const minAgreement = Number(flags['min-agreement'] ?? 0.75);
const bandCheck = flags['no-band-check'] !== 'true';
const bandTol = Number(flags['band-tol'] ?? 1);
const maxTokens = Number(flags['max-tokens'] ?? 1024);
const jsonMode = flags['json-mode'] === 'true';
// --mock: synthetic VLM reads to exercise dedup/timer/output without a running server
const mock = flags.mock === 'true';
const outDir =
  flags.out ?? (process.env.CLAUDE_SCRATCH ?? '/tmp') + '/popup-vlm';
const saveSlug = flags.save;

mkdirSync(outDir, { recursive: true });
const framesDir = `${outDir}/frames`;
mkdirSync(framesDir, { recursive: true });

// ---- extract frames (ffmpeg) ----
console.log(
  `extracting frames @ ${fps}fps${dur ? ` for ${dur}s from t=${at}` : ' (whole video)'} ...`,
);
const vf: string[] = [];
if (fps) vf.push(`fps=${fps}`);
if (crop) vf.push(crop);
const ffArgs = ['-y', '-loglevel', 'error'];
if (at) ffArgs.push('-ss', String(at));
if (dur) ffArgs.push('-t', String(dur));
ffArgs.push('-i', video);
if (vf.length) ffArgs.push('-vf', vf.join(','));
ffArgs.push('-q:v', '3', `${framesDir}/f_%05d.jpg`);
execFileSync('ffmpeg', ffArgs, { stdio: ['ignore', 'ignore', 'ignore'] });
const frameFiles = readdirSync(framesDir)
  .filter((f) => f.endsWith('.jpg'))
  .sort();
if (!frameFiles.length) {
  console.error('no frames extracted — check --at/--dur/--crop');
  process.exit(1);
}
console.log(`  ${frameFiles.length} frames -> ${framesDir}`);

// ---- VLM prompt ----
const PROMPT = `You are reading ONE frame from a NIKKE solo-raid boss fight. The camera-focus unit
deals damage; its damage numbers pop up at the CROSSHAIR (centre / over the boss).

Damage-number colours:
- WHITE = normal damage                                             -> cls "normal"
- ORANGE / GOLD, with a small crit icon to its LEFT = CRITICAL hit  -> cls "crit"
- RED, with "CORE HIT" written above it = core hit                  -> cls "core"
- GREEN = a HEAL — IGNORE (not damage)
- CYAN / BLUE = boss hits on a shield — IGNORE (not damage dealt)

Also IGNORE these non-damage numbers: the fight TIMER countdown (top-RIGHT corner), the TEAM
cumulative damage total (top-centre and along the bottom), the AMMO COUNTER (a small white box near
the crosshair showing a 2-3 digit magazine count), and any other UI text.

IMPORTANT — repeated values: one attack (e.g. a shotgun) fires several pellets that EACH show the
SAME damage number, so a frame may hold ~6-10 identical white numbers scattered across the boss plus
0-3 orange/red. Count EACH distinct number separately — never merge identical values into one. Give
every number its own entry with its own (x,y), even when the values repeat.

For each damage popup give:
- "value": the integer damage value (drop commas / separators)
- "cls": "normal" | "crit" | "core"
- "x","y": approximate centre of the number, normalized to 0..1000 (x right, y down) over the whole image.
Also read the fight TIMER (top-right countdown, 3:00 -> 0:00) as seconds REMAINING (a clock showing 2:35 = 155).

Respond with ONLY this JSON (no markdown, no commentary):
{"timerSec": <number or null>, "popups": [{"value": <int>, "cls": "normal"|"crit"|"core", "x": <int>, "y": <int>}]}
If no damage numbers are visible: {"timerSec": <number or null>, "popups": []}`;

interface VlmPopup {
  value: number;
  cls: 'normal' | 'crit' | 'core';
  x: number;
  y: number;
}
interface VlmRead {
  timerSec: number | null;
  popups: VlmPopup[];
}

// Hallucination guard: >10 identical values in a single frame is physically impossible
// (max realistic is a 10-pellet shotgun). Drop ALL popups sharing that value — the frame
// is a confabulation (e.g. a grid of round numbers when the model finds nothing real).
const MAX_IDENTICAL_PER_FRAME = 10;
function guardHallucination(read: VlmRead, frame: string): VlmRead {
  const counts = new Map<number, number>();
  for (const p of read.popups)
    counts.set(p.value, (counts.get(p.value) ?? 0) + 1);
  const bad = new Set(
    [...counts.entries()]
      .filter(([, n]) => n > MAX_IDENTICAL_PER_FRAME)
      .map(([v]) => v),
  );
  if (!bad.size) return read;
  const kept = read.popups.filter((p) => !bad.has(p.value));
  console.log(
    `  frame ${frame}: hallucination guard dropped ${read.popups.length - kept.length} popups (values: ${[...bad].join(', ')})`,
  );
  return { ...read, popups: kept };
}

function parseRead(text: string): VlmRead {
  let s = text.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  const a = s.indexOf('{'),
    b = s.lastIndexOf('}');
  if (a >= 0 && b > a) s = s.slice(a, b + 1);
  try {
    const o = (JSON.parse(s) ?? {}) as {
      timerSec?: unknown;
      popups?: unknown[];
    };
    const popups: VlmPopup[] = [];
    for (const item of Array.isArray(o.popups) ? o.popups : []) {
      if (!item || typeof item !== 'object') continue;
      const p = item as Record<string, unknown>;
      if (typeof p.value !== 'number') continue;
      const cls = typeof p.cls === 'string' ? p.cls : 'normal';
      popups.push({
        value: Math.round(p.value),
        cls: cls === 'crit' || cls === 'core' ? cls : 'normal',
        x: typeof p.x === 'number' ? p.x : 0,
        y: typeof p.y === 'number' ? p.y : 0,
      });
    }
    return {
      timerSec: typeof o.timerSec === 'number' ? o.timerSec : null,
      popups,
    };
  } catch {
    return { timerSec: null, popups: [] };
  }
}

async function readFrame(b64: string): Promise<VlmRead> {
  const body: Record<string, unknown> = {
    model,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: PROMPT },
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
  return parseRead(String(content));
}

// ---- mock VLM (synthetic clustered popups to verify dedup/timer without a server) ----
function mockRead(idx: number): VlmRead {
  const timerSec = 55 + idx; // fake fight clock counting up
  const popups: VlmPopup[] = [];
  // A: 12345 normal at ~(500,400), frames 1-3, drifts up
  if (idx >= 1 && idx <= 3)
    popups.push({
      value: 12345,
      cls: 'normal',
      x: 500,
      y: 400 - (idx - 1) * 8,
    });
  // B: 67890 crit at ~(620,360), frames 2-4
  if (idx >= 2 && idx <= 4)
    popups.push({ value: 67890, cls: 'crit', x: 620, y: 360 - (idx - 2) * 8 });
  // C: SAME value 12345 but different position (700,500) + core, frames 2-3 -> must stay separate from A
  if (idx >= 2 && idx <= 3)
    popups.push({ value: 12345, cls: 'core', x: 700, y: 500 });
  return { timerSec, popups };
}

// ---- run over frames (sequential — gentle on a local server) ----
const reads: { frame: number; videoT: number; read: VlmRead }[] = [];
let n = 0;
let totalMs = 0;
for (const f of frameFiles) {
  const idx = parseInt(f.replace(/\D/g, ''), 10);
  const videoT = at + (idx - 1) / fps;
  const t0 = Date.now();
  let read: VlmRead;
  if (mock) {
    read = mockRead(idx);
  } else {
    const b64 = readFileSync(`${framesDir}/${f}`).toString('base64');
    read = { timerSec: null, popups: [] };
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        read = await readFrame(b64);
        break;
      } catch (e) {
        if (attempt === 2)
          console.error(`  frame ${f}: FAILED — ${(e as Error).message}`);
        else await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }
  read = guardHallucination(read, f);
  totalMs += Date.now() - t0;
  reads.push({ frame: idx, videoT, read });
  if (++n % 5 === 0 || n === frameFiles.length)
    console.log(
      `  ${n}/${frameFiles.length}  t=${videoT.toFixed(1)}s  ${read.popups.length} popups  timer=${read.timerSec}  ~${Math.round(totalMs / n)}ms/frame`,
    );
}

// ---- dedup: cluster same value + nearby position within the popup lifetime ----
interface Det {
  frame: number;
  videoT: number;
  value: number;
  cls: VlmPopup['cls'];
  x: number;
  y: number;
}
const dets: Det[] = [];
for (const r of reads)
  for (const p of r.read.popups)
    dets.push({
      frame: r.frame,
      videoT: r.videoT,
      value: p.value,
      cls: p.cls,
      x: p.x,
      y: p.y,
    });
dets.sort((a, b) => a.videoT - b.videoT || a.value - b.value);

interface Cluster {
  value: number;
  cls: VlmPopup['cls'];
  xs: number[];
  ys: number[];
  ts: number[];
  frames: number[];
}
const clusters: Cluster[] = [];
for (const d of dets) {
  // Sliding window: cluster while each detection is within timeWin of the PREVIOUS one (and near
  // the latest position, allowing upward drift). Comparing to the first ts would fragment any
  // popup that persists longer than timeWin.
  const c = clusters.find(
    (c) =>
      c.value === d.value &&
      Math.abs(c.xs[c.xs.length - 1] - d.x) < posTol &&
      Math.abs(c.ys[c.ys.length - 1] - d.y) < posTol &&
      d.videoT - c.ts[c.ts.length - 1] < timeWin,
  );
  if (c) {
    c.xs.push(d.x);
    c.ys.push(d.y);
    c.ts.push(d.videoT);
    c.frames.push(d.frame);
  } else
    clusters.push({
      value: d.value,
      cls: d.cls,
      xs: [d.x],
      ys: [d.y],
      ts: [d.videoT],
      frames: [d.frame],
    });
}
const median = (a: number[]) => {
  const s = [...a].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
};

// ---- map each popup to the in-game timer reading at its frame ----
const timerMap = reads
  .filter((r) => r.read.timerSec != null)
  .map((r) => ({ videoT: r.videoT, gameT: r.read.timerSec as number }));
function gameTAt(videoT: number): number | null {
  if (!timerMap.length) return null;
  let best = timerMap[0],
    bd = Infinity;
  for (const m of timerMap) {
    const d = Math.abs(m.videoT - videoT);
    if (d < bd) {
      bd = d;
      best = m;
    }
  }
  return best.gameT;
}
const fightClock = timerMap.length >= 3;

// ---- confidence: how many of the looks at this spot-and-instant agreed on this value ----
// A "look" is any detection inside the popup's own time+position window. Detections there that
// read a DIFFERENT value are disagreeing looks — that is the model reading the same pixels two
// ways, which is exactly the signal a self-reported confidence score would not give us.
function looksAt(c: Cluster): { agreeing: number; total: number } {
  const t0c = c.ts[0] - timeWin / 2;
  const t1c = c.ts[c.ts.length - 1] + timeWin / 2;
  const cx = median(c.xs), cy = median(c.ys);
  let total = 0;
  for (const d of dets) {
    if (d.videoT < t0c || d.videoT > t1c) continue;
    if (Math.abs(d.x - cx) >= posTol || Math.abs(d.y - cy) >= posTol) continue;
    total++;
  }
  return { agreeing: c.frames.length, total: Math.max(total, c.frames.length) };
}

// The band table needs a sim run, so build it once (skippable for a video with no sim support).
let bandTable: HitBandTable | null = null;
if (bandCheck) {
  try {
    bandTable = computeHitBands(focus, comp, boss);
    console.log(`  hit-value bands for ${focus}: ${bandTable.bands.length} hit types`);
  } catch (e) {
    console.log(`  ⚠ could not build the hit-value band table (${(e as Error).message.split('\n')[0]}) — ` +
      'nothing will auto-accept; pass --no-band-check to acknowledge, and confirm every popup by hand');
  }
}

const popups = clusters
  .map((c) => {
    const videoT = median(c.ts);
    const gameT = gameTAt(videoT);
    const { agreeing, total } = looksAt(c);
    const confidence = Math.round((agreeing / total) * 100) / 100;
    const bands: BandHit[] = bandTable ? matchBands(bandTable, c.value, bandTol) : [];
    const inBand = bands.length > 0;
    // The variant a band matched must be REACHABLE from the class the model reported: a popup it
    // called "normal" cannot be corroborated by a band's CORE image — that is a self-contradiction
    // whatever the true value is. (2026-07-24: this caught a 10,818,572 read as "normal" whose only
    // matching bands were skill:core / skill:crit+core. Whether that was a real core barrage or a
    // digit concatenation — the same run had the hallucination guard drop 6473333 and 17333, and
    // 108,189 recurs in the neighbouring frames — the read does not corroborate itself either way.)
    const wantVariant: Record<string, BandHit['variant'][]> = {
      normal: ['base'], crit: ['crit'], core: ['core', 'crit+core'],
    };
    const classConsistent = bands.some((b) => wantVariant[c.cls].includes(b.variant));
    // If one value sits in several variants of the same hit type, the band cannot pin the class —
    // that is the documented entanglement (LM's normals and their crit images overlap outright).
    // The value may still be right, but the crit/core call is NOT corroborated, so it is not
    // auto-acceptable. Overlapping bands cannot be attributed; that rule is upstream of this one.
    const variants = new Set(bands.map((b) => b.variant));
    const classUnambiguous = variants.size === 1;
    const autoAccept =
      confidence >= minAgreement && agreeing >= minLooks &&
      inBand && classConsistent && classUnambiguous;
    return {
      frame: c.frames[Math.floor(c.frames.length / 2)],
      videoT: Math.round(videoT * 100) / 100,
      gameT,
      t: Math.round((gameT ?? videoT) * 100) / 100, // fight-relative when fightClock, else video-relative
      value: c.value,
      cls: c.cls,
      crit: c.cls === 'crit' ? true : undefined,
      core: c.cls === 'core' ? true : undefined,
      x: Math.round(median(c.xs)),
      y: Math.round(median(c.ys)),
      seenInFrames: c.frames.length,
      looks: total,
      agreeingLooks: agreeing,
      confidence,
      inBand,
      bands,
      classConsistent,
      classUnambiguous,
      autoAccept,
      reason: autoAccept
        ? undefined
        : !inBand
          ? (bandTable ? 'value matches no hit-value band for the focus unit' : 'no band table available')
          : !classConsistent
            ? `read as "${c.cls}" but the value only matches ${[...variants].join('/')} band(s) — self-inconsistent`
            : !classUnambiguous
              ? `value sits in ${variants.size} band variants (${[...variants].join('/')}) — entangled, the class cannot be corroborated`
              : agreeing < minLooks
                ? `only ${agreeing} agreeing look(s), need ${minLooks}`
                : `looks disagree (${agreeing}/${total})`,
    };
  })
  .sort((a, b) => a.t - b.t);

const autoAccepted = popups.filter((p) => p.autoAccept);
const needsConfirmation = popups.filter((p) => !p.autoAccept);

// ---- output ----
const result = {
  video,
  focus,
  boss,
  comp,
  fps,
  at,
  dur: dur || null,
  endpoint,
  model,
  posTol,
  timeWin,
  framesProcessed: frameFiles.length,
  fightClock,
  confidencePolicy: { minLooks, minAgreement, bandCheck, bandTol, bandTypes: bandTable?.bands.length ?? 0 },
  autoAccepted,
  needsConfirmation,
  timerReads: timerMap.map((m) => ({
    videoT: Math.round(m.videoT * 100) / 100,
    gameT: m.gameT,
  })),
  popups,
  rawReads: reads.map((r) => ({
    frame: r.frame,
    videoT: Math.round(r.videoT * 100) / 100,
    ...r.read,
  })),
};
const rawOut = `${outDir}/popup-reads.json`;
writeFileSync(rawOut, JSON.stringify(result, null, 2) + '\n');
console.log(`\nwrote ${rawOut}`);
console.log(
  `  ${popups.length} deduped popups  <-  ${dets.length} raw detections  <-  ${frameFiles.length} frames`,
);
if (fightClock)
  console.log(
    `  fight-clock anchored: game timer ${timerMap[0].gameT}..${timerMap[timerMap.length - 1].gameT}`,
  );
else
  console.log(
    '  NOTE: fight timer not read reliably — popup.t is video-relative; check timerReads.',
  );
console.log(
  `  AUTO-ACCEPTED ${autoAccepted.length}/${popups.length} ` +
    `(confidence >= ${minAgreement}, >= ${minLooks} agreeing looks, in-band); ` +
    `${needsConfirmation.length} need confirmation`,
);
if (needsConfirmation.length) {
  const times = [...new Set(needsConfirmation.map((p) => p.videoT))].sort((a, b) => a - b);
  console.log(`  confirm them in ONE batched call:\n` +
    `    npx tsx scripts/probe/frames.ts "${video}" --times "${times.slice(0, 24).join(',')}" --region crosshair --zoom 2` +
    (times.length > 24 ? `   (+${times.length - 24} more times in needsConfirmation[])` : ''));
}

// ---- optionally persist a (structurally validated) ParsedProbe ----
if (saveSlug) {
  // Only AUTO-ACCEPTED popups are persisted: docs/probe-data/ is the tracked record, and an
  // unconfirmed VLM read entering it is exactly what the skill forbids.
  if (needsConfirmation.length)
    console.log(`  --save: omitting ${needsConfirmation.length} popup(s) that need confirmation`);
  const ppPopups: Popup[] = autoAccepted.map((p) => {
    const q: Popup = { t: p.t, value: p.value };
    if (p.crit) q.crit = true;
    if (p.core) q.core = true;
    return q;
  });
  const pp: ParsedProbe = {
    video,
    focus,
    boss,
    comp,
    params: {
      basis: flags.basis ?? 'VLM auto-read (unvalidated)',
      sync: 400,
      skillLevels: '10/10/10',
      gear: 'base5',
      coreLevel: 7,
      durationSec: 180,
    },
    extractedOn: new Date().toISOString().slice(0, 10),
    method: `VLM ${model} @ ${endpoint}, ${fps}fps sampling, dedup pos<${posTol}/win ${timeWin}s`,
    fightClock: fightClock || undefined,
    popups: ppPopups,
    notes:
      `Auto-read by scripts/probe/read-popups-vlm.ts. AUTO-ACCEPTED subset only ` +
      `(>=${minLooks} agreeing looks at >=${minAgreement} agreement, value inside a hit-values band); ` +
      `${needsConfirmation.length} lower-confidence popup(s) were omitted and still need a frame confirmation.`,
  };
  console.log(`  saved ParsedProbe -> ${saveParsed(saveSlug, pp)}`);
}
