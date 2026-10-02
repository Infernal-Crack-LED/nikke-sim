#!/usr/bin/env node
// detect-new-units.mjs — the new-unit watch's detector (daily launchd job, see README.md).
//
// Run inside a worktree that sits at origin/main and has just run `npm run sync`. Compares the
// freshly-synced data/characters.json against HEAD's copy (= origin/main) and reports the slugs the
// sync ADDED. A slug already listed in the handled file (dispatched by an earlier run whose PR may
// still be open, or done by hand) is reported under `added` but not under `pending`.
//
//   node detect-new-units.mjs <worktree> <handled-file> [--write-extracts]
//
// --write-extracts also writes scripts/blind-rebuild/char-extracts/<slug>.json for every PENDING slug
// that lacks one: the unit's characters.json entry minus `nicknames` (the shape the kit-autonomy
// packet builders read — identical to the hand-made aigis / drake-great-villain extracts).
//
// Prints one JSON object on stdout: { added: [...], pending: [...], units: { slug: {name, weapon,
// class, element, burst, releaseDate} } }.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [wt, handledPath] = process.argv
  .slice(2)
  .filter((a) => !a.startsWith('--'));
const writeExtracts = process.argv.includes('--write-extracts');
if (!wt || !handledPath) {
  console.error(
    'usage: detect-new-units.mjs <worktree> <handled-file> [--write-extracts]'
  );
  process.exit(2);
}

const chars = (doc) => doc.characters ?? doc;
const now = chars(
  JSON.parse(readFileSync(join(wt, 'data/characters.json'), 'utf8'))
);
const before = chars(
  JSON.parse(
    execFileSync('git', ['-C', wt, 'show', 'HEAD:data/characters.json'], {
      maxBuffer: 1 << 30,
      encoding: 'utf8',
    })
  )
);

const handled = new Set(
  existsSync(handledPath)
    ? readFileSync(handledPath, 'utf8')
        .split('\n')
        .map((l) => l.replace(/#.*/, '').trim().split(/\s+/)[0])
        .filter(Boolean)
    : []
);

const added = Object.keys(now).filter((s) => !(s in before));
const pending = added.filter((s) => !handled.has(s));

const units = {};
for (const s of added) {
  const c = now[s];
  units[s] = {
    name: c.name,
    weapon: c.weapon,
    class: c.class,
    element: c.element,
    burst: c.burst,
    releaseDate: c.releaseDate ?? null,
  };
}

if (writeExtracts) {
  for (const s of pending) {
    const out = join(wt, 'scripts/blind-rebuild/char-extracts', `${s}.json`);
    if (existsSync(out)) {
      continue;
    }
    const { nicknames: _drop, ...entry } = now[s];
    writeFileSync(out, JSON.stringify({ [s]: entry }, null, 2) + '\n');
  }
}

console.log(JSON.stringify({ added, pending, units }, null, 2));
