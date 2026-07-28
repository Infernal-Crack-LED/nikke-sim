// Regenerate the self-hosted Roboto woff2 subsets (web/public/fonts/*.woff2)
// from the full TTFs (src/infographics/assets/fonts/Roboto-*.ttf) and the
// checked-in glyph manifest (subset-ranges.json next to them). The original
// subsets were hand-made with no reproducible recipe; this script is it.
// Wired as `npm run fonts:subsets`.
//
// The manifest coverage was extracted from the original subsets' cmaps
// (identical across the three faces): printable ASCII, Latin-1, Greek,
// general punctuation, math operators. Glyphs outside it (▲ ✓ ★ …) fall back
// per-glyph — enforced by the @font-face `unicode-range` in web/src/styles.css,
// which this script GENERATES from the manifest and verifies styles.css
// carries verbatim (edit styles.css when the manifest changes).
//
// Verification: each regenerated woff2 is re-parsed (fonteditor-core) and its
// cmap must EXACTLY equal the manifest codepoint set — a silent glyph drop
// fails the run instead of shipping a smaller-than-declared subset.
import { readFileSync, writeFileSync } from 'node:fs';
import subsetFont from 'subset-font';
import { Font, woff2 } from 'fonteditor-core';

const FONT_DIR = new URL('../src/infographics/assets/fonts/', import.meta.url);
const OUT_DIR = new URL('../web/public/fonts/', import.meta.url);
const STYLES_CSS = new URL('../web/src/styles.css', import.meta.url);
const FACES = ['Regular', 'Medium', 'Bold'] as const;

interface Manifest {
  ranges: number[][];
}

const manifest = JSON.parse(
  readFileSync(new URL('subset-ranges.json', FONT_DIR), 'utf8')
) as Manifest;

// Every codepoint in the manifest, sorted, deduped.
const codepoints = [
  ...new Set(
    manifest.ranges.flatMap(([lo, hi = lo]) =>
      Array.from({ length: hi - lo + 1 }, (_, i) => lo + i)
    )
  ),
].sort((a, b) => a - b);

// CSS `unicode-range` value (shared by all three @font-face blocks).
const hex = (n: number) => n.toString(16).toUpperCase();
const unicodeRange = manifest.ranges
  .map(([lo, hi]) =>
    hi === undefined || hi === lo ? `U+${hex(lo)}` : `U+${hex(lo)}-${hex(hi)}`
  )
  .join(', ');

// Whitespace-insensitive: the declarations may wrap across lines.
const css = readFileSync(STYLES_CSS, 'utf8').replace(/\s+/g, '');
if (!css.includes(`unicode-range:${unicodeRange.replace(/\s+/g, '')};`)) {
  console.error(
    `web/src/styles.css does not carry the manifest's unicode-range.\n` +
      `Update each Roboto @font-face to:\n  unicode-range: ${unicodeRange};`
  );
  process.exit(1);
}

await woff2.init();
const subsetText = String.fromCodePoint(...codepoints);
for (const face of FACES) {
  const ttf = readFileSync(new URL(`Roboto-${face}.ttf`, FONT_DIR));
  const woff2Buf = await subsetFont(ttf, subsetText, {
    targetFormat: 'woff2',
  });
  // Re-parse and diff the cmap against the manifest.
  const parsed = Font.create(Buffer.from(woff2Buf), { type: 'woff2' });
  const got = new Set(
    Object.keys(parsed.get().cmap)
      .map(Number)
      .filter((n) => n > 0)
  );
  const missing = codepoints.filter((cp) => !got.has(cp));
  const extra = [...got].filter((cp) => !codepoints.includes(cp));
  if (missing.length || extra.length) {
    console.error(
      `Roboto-${face}: subset cmap != manifest ` +
        `(missing: ${missing.map(hex).join(' ') || 'none'}; ` +
        `extra: ${extra.map(hex).join(' ') || 'none'})`
    );
    process.exit(1);
  }
  writeFileSync(new URL(`Roboto-${face}.woff2`, OUT_DIR), woff2Buf);
  console.log(
    `wrote web/public/fonts/Roboto-${face}.woff2 ` +
      `(${(woff2Buf.length / 1024).toFixed(1)} KB, ${got.size} glyphs)`
  );
}
