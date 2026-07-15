// Probe-recording catalog — the index of every probe video we have, its testing context, and
// whether it's been parsed. The recordings under docs/probes/ are gitignored (private media), so
// without this index we lose track of what footage exists and under what conditions.
//
//   npx tsx scripts/probe/catalog.ts          # coverage report: every media file, catalogued? parsed?
//   npx tsx scripts/probe/catalog.ts --scan   # raw list of media files under docs/probes/
//
// The catalog itself is docs/probe-data/catalog.json (tracked): an array of entries mapping a video
// path to its focus/comp/boss/params + optional parsedSlug (→ docs/probe-data/<slug>.json). Fill an
// entry in for every probe video going forward (owner requirement 2026-07-14).

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { listParsed } from './parsed.js';

const PROBES = fileURLToPath(new URL('../../docs/probes/', import.meta.url));
const CATALOG = fileURLToPath(new URL('../../docs/probe-data/catalog.json', import.meta.url));
const VIDEO_RE = /\.(mov|mp4|m4v)$/i;

interface CatalogEntry {
  video: string;            // repo-relative path
  focus?: string;
  comp?: string[];
  boss?: string | null;
  params?: Record<string, unknown>;
  parsedSlug?: string;      // → docs/probe-data/<slug>.json
  description?: string;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = `${dir}${e}`;
    if (statSync(p).isDirectory()) walk(p + '/', out);
    else if (VIDEO_RE.test(e)) out.push(p);
  }
  return out;
}

const rel = (abs: string) => 'docs/probes/' + abs.slice(PROBES.length);

const media = existsSync(PROBES) ? walk(PROBES).map(rel).sort() : [];
const catalog: CatalogEntry[] = existsSync(CATALOG) ? JSON.parse(readFileSync(CATALOG, 'utf8')) : [];
const byVideo = new Map(catalog.map((c) => [c.video, c]));
const parsed = new Set(listParsed());

if (process.argv.includes('--scan')) {
  console.log(`${media.length} video files under docs/probes/:`);
  for (const m of media) console.log('  ' + m);
  process.exit(0);
}

let catalogued = 0, parsedCount = 0;
console.log(`\nPROBE CATALOG — ${media.length} videos on disk, ${catalog.length} catalogued\n`);
console.log('  ' + 'catalogued'.padEnd(11) + 'parsed'.padEnd(8) + 'video');
for (const m of media) {
  const c = byVideo.get(m);
  const isParsed = c?.parsedSlug ? parsed.has(c.parsedSlug) : false;
  if (c) catalogued++;
  if (isParsed) parsedCount++;
  console.log('  ' + (c ? '✓' : '—').padEnd(11) + (isParsed ? '✓' : '—').padEnd(8) + m +
    (c?.focus ? `   (focus ${c.focus})` : ''));
}
// stale entries: catalogued videos whose file is gone
const stale = catalog.filter((c) => !media.includes(c.video));
console.log(`\n${catalogued}/${media.length} catalogued · ${parsedCount} parsed` +
  (stale.length ? ` · ${stale.length} stale entries (file missing): ${stale.map((s) => s.video).join(', ')}` : ''));
if (catalogued < media.length) {
  console.log(`\n${media.length - catalogued} un-catalogued videos — add an entry to docs/probe-data/catalog.json.`);
}
