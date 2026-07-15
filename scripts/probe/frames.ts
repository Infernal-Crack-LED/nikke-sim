// Frame-extraction helper for probe videos — windows, frame rate, and REGION presets that encode
// the spatial attribution rule (damage pops at the crosshair; heals over the character).
//
//   npx tsx scripts/probe/frames.ts <video> --at <sec> [--dur <sec>] [--fps <n>]
//        [--region crosshair|character|full] [--sheet <cols>] [--zoom <x>] [--out <dir>]
//
//   # a full-60fps burst of the crosshair region for a fast DoT stream (2s window):
//   npx tsx scripts/probe/frames.ts "docs/probes/control/lm.MP4" --at 45 --dur 2 --fps 60 --region crosshair
//   # a single full frame:
//   npx tsx scripts/probe/frames.ts "docs/probes/control/lm.MP4" --at 48 --region full
//   # a contact sheet (heals live in the character region):
//   npx tsx scripts/probe/frames.ts "docs/probes/control/lm.MP4" --at 43 --dur 8 --fps 3 --region character --sheet 4 --zoom 2
//
// Regions are for the 2622x1206 landscape frame (after ffmpeg auto-rotate). CROSSHAIR = the
// centre/boss area where the focus unit's DAMAGE numbers appear; CHARACTER = the lower-centre where
// the focus unit stands and HEALS pop. Separating these is the key to not reading a heal as damage.

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
