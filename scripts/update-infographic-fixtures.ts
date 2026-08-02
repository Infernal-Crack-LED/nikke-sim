// Regenerate the golden-image fixtures (scripts/tests/fixtures/infographics/).
// Run after an INTENTIONAL renderer change, then eyeball the PNGs before
// committing. Wired as `npm run fixtures:infographics`.
//
// RUN THIS ON darwin-arm64: the golden test byte-compares on that platform
// (fixture-generation platform) and pixel-compares with tolerance everywhere
// else. Fixtures written by an off-Mac Skia build would silently fail the
// byte-exact gate for everyone on a Mac.
//
//   --sources              Refresh scripts/tests/fixtures/unit-card-sources.json
//                          — the FROZEN join input behind the two unit-card
//                          goldens (see infographics-harness.ts). Reads the live
//                          web/public/*.json boards, so it needs a tree that has
//                          run `npm run dpschart && npm run ranks:all`, and it
//                          REFUSES to write if any board is missing rather than
//                          freezing an all-Unranked card. Trimmed to what the
//                          card actually reads: the fixture slug's character /
//                          tag / OL / Tsareena entries, the four rank boards
//                          whole, and dpschart narrowed to the two cells
//                          unitCardData.ts names. Deliberate act — run it when a
//                          data or board change SHOULD move the picture, then
//                          regenerate the PNGs.
//
//   --diff [--out <dir>]   Do NOT write fixtures. Render, compare against the
//                          committed goldens using the SAME decode + tolerance
//                          as infographics-golden.test.ts, and report where each
//                          mismatch is: differing-pixel count, max channel delta
//                          and the bounding box of the drift. For every card
//                          that misses the gate it also writes
//                          `<name>.diff.png` — the freshly rendered card with
//                          every differing pixel tinted magenta — so "eyeball
//                          the diff before committing it" is an action you can
//                          actually take. Exits 1 if anything mismatches.
//                          Wired as `npm run fixtures:infographics -- --diff`.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import {
  renderAll,
  UNIT_CARD_FIXTURE_SLUG,
  UNIT_CARD_SOURCES_FIXTURE,
} from './tests/share/infographics-harness.js';
import { loadUnitCardSources } from './lib/unit-card-sources.js';
import {
  NEUTRAL_CELL,
  ELEWEAK_CELL,
} from '../src/infographics/core/unitCardData.js';

const FIXTURE_DIR = new URL('./tests/fixtures/infographics/', import.meta.url);

// Mirrors infographics-golden.test.ts — a diff report that used different
// numbers than the gate would be worse than no report at all.
const PIXEL_CHANNEL_TOLERANCE = 2;
const PIXEL_MATCH_FRACTION = 0.999;

const argValue = (flag: string): string | undefined => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

if (process.argv.includes('--sources')) {
  const live = loadUnitCardSources();
  if (live.missing.length > 0) {
    console.error(
      `refusing to freeze an incomplete source set — missing ${live.missing.join(', ')}.\n` +
        'Run `npm run dpschart && npm run ranks:all` first: without a board the ' +
        'card renders Unranked, and freezing THAT would pin an empty-state ' +
        'picture as if it were the real one.'
    );
    process.exit(1);
  }
  const slug = UNIT_CARD_FIXTURE_SLUG;
  const character = live.characters[slug];
  if (!character) {
    console.error(`no character '${slug}' in data/characters.json`);
    process.exit(1);
  }

  // Trim to what buildUnitCardRender/buildUnitCardData actually read for one
  // slug. The per-slug maps are indexed by slug, so a single entry each; the
  // four rank boards stay WHOLE because the card draws neighbour rows around
  // the subject and the trim boundary would have to track `neighbourRows` per
  // variant. dpschart is the one big artifact (90 cells) and the card reads
  // exactly two of them — named here by importing the same constants
  // unitCardData.ts ranks against, so changing a cell id can never leave this
  // snapshot quietly holding the wrong one.
  const dpschart = live.dpschart
    ? {
        ...live.dpschart,
        cells: Object.fromEntries(
          [NEUTRAL_CELL, ELEWEAK_CELL]
            .filter((id) => live.dpschart!.cells?.[id])
            .map((id) => [id, live.dpschart!.cells[id]])
        ),
      }
    : null;
  const frozen = {
    characters: { [slug]: character },
    dpschart,
    burstgen: live.burstgen,
    bufferchart: live.bufferchart,
    sustain: live.sustain,
    burstcdr: live.burstcdr,
    tags: { [slug]: live.tags[slug] ?? [] },
    tagLabels: live.tagLabels,
    olOptimal: { [slug]: live.olOptimal[slug] ?? [] },
    tsareena: live.tsareena[slug] ? { [slug]: live.tsareena[slug] } : {},
    missing: [],
  };

  for (const id of [NEUTRAL_CELL, ELEWEAK_CELL]) {
    if (!dpschart?.cells[id]) {
      console.warn(
        `  warning: dpschart has no cell '${id}' — card will rank it Unranked`
      );
    }
  }
  writeFileSync(
    UNIT_CARD_SOURCES_FIXTURE,
    `${JSON.stringify(frozen, null, 1)}\n`
  );
  console.log(
    `wrote scripts/tests/fixtures/unit-card-sources.json (slug '${slug}', ` +
      `dpschart trimmed to ${Object.keys(dpschart?.cells ?? {}).length} cell(s))\n` +
      'Now regenerate the PNGs: npm run fixtures:infographics'
  );
} else if (!process.argv.includes('--diff')) {
  mkdirSync(FIXTURE_DIR, { recursive: true });
  for (const { name, png } of await renderAll()) {
    writeFileSync(new URL(name, FIXTURE_DIR), png);
    console.log(`wrote scripts/tests/fixtures/infographics/${name}`);
  }
} else {
  const outDir =
    argValue('--out') ?? join(tmpdir(), 'infographic-fixture-diff');
  mkdirSync(outDir, { recursive: true });
  let failed = 0;

  for (const { name, png } of await renderAll()) {
    const path = new URL(name, FIXTURE_DIR);
    if (!existsSync(path)) {
      console.log(`${name}: NO COMMITTED FIXTURE`);
      failed++;
      continue;
    }
    const [cand, fix] = await Promise.all([
      sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
      sharp(readFileSync(path))
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true }),
    ]);
    if (
      cand.info.width !== fix.info.width ||
      cand.info.height !== fix.info.height
    ) {
      console.log(
        `${name}: DIMENSIONS ${cand.info.width}×${cand.info.height} != ` +
          `fixture ${fix.info.width}×${fix.info.height}`
      );
      failed++;
      continue;
    }

    const { width, height } = cand.info;
    const overlay = Buffer.from(cand.data); // tint a copy of the fresh render
    let differing = 0;
    let maxDelta = 0;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    for (let p = 0; p < width * height; p++) {
      const i = p * 4;
      const d = Math.max(
        Math.abs(cand.data[i] - fix.data[i]),
        Math.abs(cand.data[i + 1] - fix.data[i + 1]),
        Math.abs(cand.data[i + 2] - fix.data[i + 2]),
        Math.abs(cand.data[i + 3] - fix.data[i + 3])
      );
      if (d > maxDelta) {
        maxDelta = d;
      }
      if (d <= PIXEL_CHANNEL_TOLERANCE) {
        continue;
      }
      differing++;
      const x = p % width;
      const y = (p / width) | 0;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      overlay[i] = 255;
      overlay[i + 1] = 0;
      overlay[i + 2] = 255;
      overlay[i + 3] = 255;
    }

    const fraction = (width * height - differing) / (width * height);
    if (fraction >= PIXEL_MATCH_FRACTION) {
      console.log(
        `${name}: ok (${differing} differing px, max delta ${maxDelta})`
      );
      continue;
    }
    failed++;
    const diffPath = join(outDir, `${name.replace(/\.png$/, '')}.diff.png`);
    await sharp(overlay, { raw: { width, height, channels: 4 } })
      .png()
      .toFile(diffPath);
    console.log(
      `${name}: MISMATCH ${(fraction * 100).toFixed(3)}% within tolerance ` +
        `(need ${PIXEL_MATCH_FRACTION * 100}%) — ${differing} differing px, ` +
        `max delta ${maxDelta}, bbox ${minX},${minY} → ${maxX},${maxY} ` +
        `(${maxX - minX + 1}×${maxY - minY + 1}) → ${diffPath}`
    );
  }

  if (failed > 0) {
    console.log(`\n${failed} fixture(s) mismatched — diffs in ${outDir}`);
    process.exit(1);
  }
  console.log('\nall fixtures match');
}
