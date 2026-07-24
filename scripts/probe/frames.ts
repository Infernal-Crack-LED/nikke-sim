// Frame-extraction helper for probe videos — windows, frame rate, and REGION presets that encode
// the spatial attribution rule (damage pops at the crosshair; heals over the character).
//
//   npx tsx scripts/probe/frames.ts <video> --at <sec> [--dur <sec>] [--fps <n>]
//        [--region crosshair|character|full|timer|total|ammoband] [--sheet <cols>] [--zoom <x>] [--out <dir>]
//   npx tsx scripts/probe/frames.ts <video> --times "10,40,75,110,150" [--region total] [--zoom 3]
//
//   # a full-60fps burst of the crosshair region for a fast DoT stream (2s window):
//   npx tsx scripts/probe/frames.ts "docs/probes/control/lm.MP4" --at 45 --dur 2 --fps 60 --region crosshair
//   # a single full frame:
//   npx tsx scripts/probe/frames.ts "docs/probes/control/lm.MP4" --at 48 --region full
//   # a contact sheet (heals live in the character region):
//   npx tsx scripts/probe/frames.ts "docs/probes/control/lm.MP4" --at 43 --dur 8 --fps 3 --region character --sheet 4 --zoom 2
//   # MANY scattered timestamps in ONE process (one ffmpeg fast-seek each — NEVER loop the --at form):
//   npx tsx scripts/probe/frames.ts "docs/probes/x.MP4" --times "12,49,86,123,160" --region total --zoom 3
//
// Regions are for the 2622x1206 landscape frame (after ffmpeg auto-rotate). CROSSHAIR = the
// centre/boss area where the focus unit's DAMAGE numbers appear; CHARACTER = the lower-centre where
// the focus unit stands and HEALS pop. Separating these is the key to not reading a heal as damage.
// TIMER = top-right 03:00 countdown; TOTAL = top-centre cumulative DMG running total; AMMOBAND = a
// full-width horizontal strip at crosshair height (the ammo box is crosshair-anchored and slides
// across the frame as the boss changes band, so a fixed box misses it — crop the whole band, scan it).
//
// FINDING THE FIGHT START (game t0) — do NOT hunt it frame-by-frame (that is what burned hours):
//   1. ONE coarse timer sheet locates the 03:00->02:59 flip to the second:
//        --at 3 --dur 10 --fps 2 --region timer --sheet 5 --zoom 3
//   2. t0 to +-0.5s is PLENTY for band-level running-total reads (bands are ~37s apart). Only if you
//      need FB *timing* to +-0.1s, do ONE refine sheet on that single second:
//        --at <flipSecond> --dur 1 --fps 10 --region timer --sheet 5 --zoom 3
//   Two calls, not thirty. Never sub-refine below ~3 frames — it changes no band read.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';

const argv = process.argv.slice(2);
const video = argv[0];
const flags: Record<string, string> = {};
for (let i = 1; i < argv.length; i++) if (argv[i].startsWith('--')) flags[argv[i].slice(2)] = argv[i + 1]?.startsWith('--') || argv[i + 1] === undefined ? 'true' : argv[++i];
if (!video || !existsSync(video)) { console.error('usage: frames.ts <video> --at <sec> [--dur] [--fps] [--region] [--sheet] [--zoom] [--out]'); process.exit(1); }

const REGIONS: Record<string, string | null> = {
  full: null,
  crosshair: 'crop=1100:640:780:110',  // centre/boss — DAMAGE numbers
  character: 'crop=760:520:930:600',   // lower-centre — the focus unit + HEALS
  timer: 'crop=220:80:2300:8',         // top-right — 03:00 countdown (clock icon + mm:ss)
  total: 'crop=340:96:1140:8',         // top-centre — cumulative DMG running total
  ammoband: 'crop=2622:170:0:420',     // full-width strip at crosshair height — the ammo box slides across it
};
const at = Number(flags.at ?? 0);
const dur = flags.dur ? Number(flags.dur) : 0;
const fps = flags.fps ? Number(flags.fps) : 0;
const region = REGIONS[flags.region ?? 'full'] ?? null;
const sheet = flags.sheet ? Number(flags.sheet) : 0;
const zoom = flags.zoom ? Number(flags.zoom) : 1;
const out = flags.out ?? (process.env.CLAUDE_SCRATCH ?? '/tmp') + '/probe-frames';
if (!existsSync(out)) mkdirSync(out, { recursive: true });

const vf: string[] = [];
if (fps) vf.push(`fps=${fps}`);
if (region) vf.push(region);
if (zoom !== 1) vf.push(`scale=iw*${zoom}:ih*${zoom}`);
const base = video.split('/').pop()!.replace(/\.\w+$/, '').replace(/\s+/g, '_');

// --times "t1,t2,..." — many scattered timestamps in ONE node process (one fast input-seek + 1-frame
// decode each). This is the batched form: it collapses N `npx tsx` boots + N re-decodes into a single
// run. Use it instead of looping the --at form (that anti-pattern is what turned a 10-minute job into
// a multi-hour one). Region/zoom apply; fps/dur/sheet do not.
if (flags.times && flags.times !== 'true') {
  const region2 = region;
  const zvf = zoom !== 1 ? `scale=iw*${zoom}:ih*${zoom}` : null;
  const vf2 = [region2, zvf].filter(Boolean).join(',');
  const times = flags.times.split(',').map((s) => s.trim()).filter(Boolean);
  const written: string[] = [];
  for (const t of times) {
    const of = `${out}/${base}_t${t}.png`;
    const a = ['-y', '-ss', t, '-i', video];
    if (vf2) a.push('-vf', vf2);
    a.push('-frames:v', '1', of);
    execFileSync('ffmpeg', a, { stdio: ['ignore', 'ignore', 'ignore'] });
    written.push(of);
  }
  console.log(`wrote ${written.length} frames to ${out}  (region=${flags.region ?? 'full'}, zoom=${zoom}): ${times.join(', ')}`);
  process.exit(0);
}

const args = ['-y', '-ss', String(at)];
if (dur) args.push('-t', String(dur));
args.push('-i', video);
let outfile: string;
if (sheet) {
  // one tiled contact sheet
  const rows = Math.ceil((dur && fps ? dur * fps : 12) / sheet);
  vf.push(`tile=${sheet}x${rows}`);
  outfile = `${out}/${base}_${at}s_sheet.png`;
  args.push('-vf', vf.join(','), '-frames:v', '1', outfile);
} else if (dur && fps) {
  // a numbered burst of frames
  outfile = `${out}/${base}_${at}s_%03d.png`;
  args.push('-vf', vf.join(','), outfile);
} else {
  // a single frame
  outfile = `${out}/${base}_${at}s.png`;
  if (vf.length) args.push('-vf', vf.join(','));
  args.push('-frames:v', '1', outfile);
}
execFileSync('ffmpeg', args, { stdio: ['ignore', 'ignore', 'ignore'] });
console.log(`wrote ${outfile.replace('%03d', '001..')}  (region=${flags.region ?? 'full'}, fps=${fps || 'n/a'}, dur=${dur || 'n/a'})`);
