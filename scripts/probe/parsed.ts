// Parsed-probe persistence: the structured, TRACKED record of what we read out of a
// probe video, so a video can be re-reviewed cheaply (no re-running ffmpeg + re-reading).
//
// The raw recordings under docs/probes/ are gitignored (private media). The PARSED data
// (popup values + timestamps + flags) lives here under docs/probe-data/ (tracked), one
// JSON file per parsed video. docs/probe-runs.md stays the human prose log; these files
// are the machine-reviewable numbers behind it.
//
// Schema (see docs/probe-data/README.md):
//   ParsedProbe = video-level metadata + a flat list of Popup readings.
//   A Popup is one on-screen damage number of the CAMERA-FOCUS unit (popups belong only
//   to the focused unit — probe-processing ground rule), with best-effort crit/core/kind.

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Element } from '../../src/types.js';

// Popup COLOUR conventions (owner-confirmed 2026-07-14, read off scope-lock footage):
//   white  = normal / non-crit damage
//   orange/gold (+ spark icon) = CRITICAL hit
//   red "CORE HIT" label       = core hit (can also crit → orange+red)
//   bright GREEN = a HEAL, not damage (e.g. Helm's B3 life-leech on attack damage heals
//                  the team — shows even in another unit's focus stream). NEVER a damage read.
export interface Popup {
  t: number;               // seconds into the VIDEO (not fight) unless `fightClock` set
  value: number;           // damage number as read on screen
  crit?: boolean;          // true = orange/gold crit colour; false = white; omit = not determined
  core?: boolean;          // true = "CORE HIT" label; omit = not determined
  kind?: string;           // best-effort tag: 'normal' | 'charge' | 'proc' | 'dot' | 'nuke' | 'barrage' | 'heal' | ...
  note?: string;           // anything ambiguous (overlap, partial read, echo, cross-team heal)
}

// Full testing conditions for the recording — the historical context of the test, so we can
// return to the same video + persisted parses and re-confirm exactly what was being measured.
// Owner ask (2026-07-14): every probe video gets this params↔file-paths map going forward.
export interface TestParams {
  basis: string;           // e.g. "scope-lock base5" — the headline validation basis
  sync?: number;           // sync level (scope lock = 400)
  skillLevels?: string;    // e.g. "10/10/10"
  gear?: string;           // e.g. "base5"
  cube?: string;           // e.g. "none"
  coreLevel?: number;      // character core enhancement (scope lock = 7)
  treasure?: boolean;      // treasure equipped
  bossPartless?: boolean;  // boss has no destructible parts
  durationSec?: number;    // fight length (scope lock = 180)
  focusReason?: string;    // why this unit holds the camera (default middle-slot, or a specific test)
  [k: string]: unknown;    // extensible — record anything else the test pinned
}

export interface ParsedProbe {
  // --- file paths (the historical reference: where the raw evidence lives) ---
  video: string;           // repo-relative path to the source recording
  screenshot?: string;     // repo-relative path to the end-of-fight damage-screen screenshot
  probeDir?: string;       // the docs/probes/<...> folder holding this test's media
  // --- test identity + conditions ---
  focus: string;           // slug of the camera-focus unit (whose damage popups these are)
  boss: Element | null;    // boss element (null = neutral/none)
  comp: string[];          // team slug list in slot order (focus is usually middle)
  params: TestParams;      // full testing conditions (see above)
  // --- provenance of THIS parse ---
  extractedOn: string;     // ISO date the read was done (YYYY-MM-DD)
  method: string;          // how popups were read (contact-sheet fps, crop, full-res frames)
  fightStartSec?: number;  // video time where the fight (AMBUSH) begins, if known
  fightClock?: boolean;    // true if Popup.t is fight-relative rather than video-relative
  popups: Popup[];
  notes?: string;
}

const DIR = fileURLToPath(new URL('../../docs/probe-data/', import.meta.url));

export function parsedPath(slug: string): string {
  return `${DIR}${slug}.json`;
}

export function saveParsed(slug: string, p: ParsedProbe): string {
  const path = parsedPath(slug);
  validateParsed(p); // throw before writing garbage
  writeFileSync(path, JSON.stringify(p, null, 2) + '\n');
  return path;
}

export function loadParsed(slug: string): ParsedProbe {
  return JSON.parse(readFileSync(parsedPath(slug), 'utf8'));
}

export function listParsed(): string[] {
  if (!existsSync(DIR)) return [];
  return readdirSync(DIR)
    .filter((f) => f.endsWith('.json') && f !== 'catalog.json') // catalog.json is the index, not a parse
    .map((f) => f.replace(/\.json$/, ''));
}

// Minimal structural validation — catches the mistakes that make a file useless later.
export function validateParsed(p: ParsedProbe): void {
  const errs: string[] = [];
  if (!p.video) errs.push('missing video path');
  if (!p.focus) errs.push('missing focus slug');
  if (!Array.isArray(p.comp) || p.comp.length === 0) errs.push('missing comp');
  if (!p.params || !p.params.basis) errs.push('missing params.basis (testing conditions map is required)');
  if (!p.extractedOn || !/^\d{4}-\d{2}-\d{2}$/.test(p.extractedOn)) errs.push('extractedOn must be YYYY-MM-DD');
  if (!Array.isArray(p.popups)) errs.push('popups must be an array');
  else p.popups.forEach((u, i) => {
    if (typeof u.t !== 'number' || u.t < 0) errs.push(`popup[${i}] bad t`);
    if (typeof u.value !== 'number' || u.value <= 0) errs.push(`popup[${i}] bad value`);
  });
  if (errs.length) throw new Error(`invalid ParsedProbe (${p.focus}):\n  - ${errs.join('\n  - ')}`);
}

// CLI: `npx tsx scripts/probe/parsed.ts` lists + validates every parsed file.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const slugs = listParsed();
  if (!slugs.length) { console.log('no parsed probes yet (docs/probe-data/ is empty)'); }
  for (const s of slugs) {
    const p = loadParsed(s);
    try {
      validateParsed(p);
      console.log(`✓ ${s.padEnd(28)} ${p.popups.length} popups  ${p.focus} @ ${p.video}`);
    } catch (e) {
      console.log(`✗ ${s}: ${(e as Error).message}`);
      process.exitCode = 1;
    }
  }
}
