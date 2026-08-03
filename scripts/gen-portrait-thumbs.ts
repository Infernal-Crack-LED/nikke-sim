// Generate static portrait thumbnails from the character-art CDN:
//   web/public/img/portraits/<slug>-128.webp / <slug>-256.webp
// plus web/src/portrait-manifest.json mapping imageUrl → slug, so the site
// serves local pre-cropped thumbnails instead of downloading the full-res
// 256×512 art (~200KB each) and canvas-downscaling it at runtime.
//
// The crop + stepped-halving downscale run in a headless browser (Playwright)
// so the output matches the runtime pipeline exactly (PORTRAIT_CROP_TOP
// framing, imageSmoothingQuality:'high' halving — see web/src/imageDownscale.ts
// for why a single big drawImage reduction aliases).
//
// Usage: npm run thumbs               (only generates missing thumbnails)
//        npm run thumbs -- --force    (re-derive everything)
//        npm run thumbs -- --check    (report coverage, generate nothing)
//        npm run thumbs -- --only a,b (restrict generation to those slugs)
//
// Re-run after a data sync adds new units. A unit with no thumb still RENDERS —
// the web falls back to its runtime canvas path, and the unit-card build fills
// the gap with the sharp pipeline (scripts/lib/portrait-thumbs.ts) — but the
// committed thumb is the canonical one, so --check reports the gap until this
// script has produced it.
import { chromium } from 'playwright';
import { writeFile, mkdir, stat } from 'node:fs/promises';
import { PORTRAIT_CROP_TOP } from '../src/infographics/core/canvas2d.js';
import {
  PORTRAIT_MANIFEST_PATH,
  PORTRAIT_SRC_DIR,
  PORTRAIT_TIERS,
  PORTRAIT_WEBP_QUALITY,
  missingThumbs,
  portraitUnits,
} from './lib/portrait-thumbs.js';

const TIERS = [...PORTRAIT_TIERS]; // px squares; runtime picks the smallest tier ≥ cssSize×dpr
const QUALITY = PORTRAIT_WEBP_QUALITY; // webp quality
const BATCH = 8; // concurrent image loads inside the page

const outDir = PORTRAIT_SRC_DIR;
const manifestPath = PORTRAIT_MANIFEST_PATH;
const force = process.argv.includes('--force');
const check = process.argv.includes('--check');
const onlyArg = process.argv[process.argv.indexOf('--only') + 1];
const only =
  process.argv.includes('--only') && onlyArg
    ? new Set(onlyArg.split(',').map((s) => s.trim()))
    : null;

const exists = async (p: string) => {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
};

// Coverage report — no browser, no network. Exits non-zero when a unit with
// source art has no committed thumb, so a caller can gate on it; verify.sh runs
// it advisory-only (the card build self-heals, so this is a nudge to commit the
// canonical thumb, not a reason to block the tree).
function reportCoverage(): void {
  const units = portraitUnits();
  const missing = missingThumbs(units, outDir);
  if (missing.length === 0) {
    console.log(
      `gen-portrait-thumbs --check: all ${units.length} units with source art have committed thumbs`
    );
    return;
  }
  console.error(
    `gen-portrait-thumbs --check: ${missing.length}/${units.length} unit(s) missing a committed thumb ` +
      `(their unit cards render the letter placeholder until the build fills them):`
  );
  for (const u of missing) {
    console.error(`  - ${u.slug}`);
  }
  console.error(
    `  fix: npm run thumbs${missing.length < units.length ? ` -- --only ${missing.map((u) => u.slug).join(',')}` : ''}  (then commit web/public/img/portraits + web/src/portrait-manifest.json)`
  );
  process.exitCode = 1;
}

async function main() {
  if (check) {
    reportCoverage();
    return;
  }
  const units = portraitUnits();
  console.log(
    `gen-portrait-thumbs: ${units.length} units, tiers ${TIERS.join('/')}` +
      (only ? `, --only ${[...only].join(',')}` : '')
  );

  await mkdir(outDir, { recursive: true });
  const manifest: Record<string, string> = {};
  let generated = 0;
  let skipped = 0;
  let failed = 0;

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent('<!doctype html><html><body></body></html>');

  for (let i = 0; i < units.length; i += BATCH) {
    const batch = units.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async (u) => {
        const files = TIERS.map((t) => `${outDir}${u.slug}-${t}.webp`);
        const onDisk = (await Promise.all(files.map(exists))).every(Boolean);
        // --only narrows what we ATTEMPT, never what the manifest covers: a unit
        // outside the selection keeps its entry if its thumbs are already there,
        // and is simply left alone if they aren't.
        if ((!force && onDisk) || (only && !only.has(u.slug))) {
          if (onDisk) {
            manifest[u.url] = u.slug; // thumb already on disk from a previous run
          }
          skipped++;
          return;
        }
        try {
          // Evaluated as a raw JS string (not a function reference) so tsx's
          // __name helper doesn't leak into the browser context.
          const args = JSON.stringify({
            url: u.url,
            cropTop: PORTRAIT_CROP_TOP,
            tiers: TIERS,
            quality: QUALITY,
          });
          const result = (await page.evaluate(`(async (args) => {
            const img = await new Promise((res, rej) => {
              const im = new Image();
              im.crossOrigin = 'anonymous';
              im.onload = () => res(im);
              im.onerror = () => rej(new Error('load failed'));
              im.src = args.url;
            });
            const iw = img.naturalWidth;
            const ih = img.naturalHeight;
            // largest square, anchored cropTop down from the top (horizontally
            // centered) — mirrors web/src/portraitThumb.ts framing
            const side = Math.min(iw, ih);
            const sx = (iw - side) / 2;
            const sy = (ih - side) * args.cropTop;
            const make = (w, h) => {
              const cv = document.createElement('canvas');
              cv.width = w;
              cv.height = h;
              const cx = cv.getContext('2d');
              cx.imageSmoothingEnabled = true;
              cx.imageSmoothingQuality = 'high';
              return { cv, cx };
            };
            const toTier = async (size) => {
              // stepped halving (see imageDownscale.ts) — never one big reduction
              let stage = make(side, side);
              stage.cx.drawImage(img, sx, sy, side, side, 0, 0, side, side);
              let cw = side;
              let ch = side;
              while (cw > size * 2 || ch > size * 2) {
                const nw = cw > size * 2 ? Math.max(size, Math.round(cw / 2)) : cw;
                const nh = ch > size * 2 ? Math.max(size, Math.round(ch / 2)) : ch;
                const s = make(nw, nh);
                s.cx.drawImage(stage.cv, 0, 0, cw, ch, 0, 0, nw, nh);
                stage = s;
                cw = nw;
                ch = nh;
              }
              if (cw !== size || ch !== size) {
                const s = make(size, size);
                s.cx.drawImage(stage.cv, 0, 0, cw, ch, 0, 0, size, size);
                stage = s;
              }
              const blob = await new Promise((res) =>
                stage.cv.toBlob((b) => res(b), 'image/webp', args.quality),
              );
              return new Promise((res) => {
                const r = new FileReader();
                r.onload = () => res(r.result);
                r.readAsDataURL(blob);
              });
            };
            const out = {};
            for (const t of args.tiers) out[t] = await toTier(t);
            return out;
          })(${args})`)) as Record<number, string>;
          for (const t of TIERS) {
            const b64 = result[t].replace(/^data:image\/webp;base64,/, '');
            await writeFile(
              `${outDir}${u.slug}-${t}.webp`,
              Buffer.from(b64, 'base64')
            );
          }
          manifest[u.url] = u.slug;
          generated++;
        } catch (e) {
          failed++;
          console.warn(`  ! ${u.slug}: ${(e as Error).message}`);
        }
      })
    );
    console.log(
      `  ${Math.min(i + BATCH, units.length)}/${units.length} (generated ${generated}, reused ${skipped}, failed ${failed})`
    );
  }

  await browser.close();
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(
    `done: ${generated} generated, ${skipped} reused, ${failed} failed; manifest → web/src/portrait-manifest.json (${Object.keys(manifest).length} entries)`
  );
  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
