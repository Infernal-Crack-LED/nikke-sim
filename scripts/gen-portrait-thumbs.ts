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
// Usage: npm run thumbs            (only generates missing thumbnails)
//        npm run thumbs -- --force (re-derive everything)
// Re-run after a data sync adds new units; units without a thumbnail fall
// back to the runtime canvas path until then.
import { chromium } from 'playwright';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { PORTRAIT_CROP_TOP } from '../src/share/teamCard';

const TIERS = [128, 256]; // px squares; runtime picks the smallest tier ≥ cssSize×dpr
const QUALITY = 0.85; // webp quality
const BATCH = 8; // concurrent image loads inside the page

const outDir = fileURLToPath(
  new URL('../web/public/img/portraits/', import.meta.url),
);
const manifestPath = fileURLToPath(
  new URL('../web/src/portrait-manifest.json', import.meta.url),
);
const dataPath = fileURLToPath(
  new URL('../data/characters.json', import.meta.url),
);
const force = process.argv.includes('--force');

const exists = async (p: string) => {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
};

async function main() {
  const data = JSON.parse(await readFile(dataPath, 'utf8'));
  const units: { slug: string; url: string }[] = Object.entries(
    data.characters as Record<string, { imageUrl?: string }>,
  )
    .filter(([, c]) => c.imageUrl)
    .map(([slug, c]) => ({ slug, url: c.imageUrl! }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
  console.log(
    `gen-portrait-thumbs: ${units.length} units, tiers ${TIERS.join('/')}`,
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
        if (!force && (await Promise.all(files.map(exists))).every(Boolean)) {
          manifest[u.url] = u.slug; // thumb already on disk from a previous run
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
              Buffer.from(b64, 'base64'),
            );
          }
          manifest[u.url] = u.slug;
          generated++;
        } catch (e) {
          failed++;
          console.warn(`  ! ${u.slug}: ${(e as Error).message}`);
        }
      }),
    );
    console.log(
      `  ${Math.min(i + BATCH, units.length)}/${units.length} (generated ${generated}, reused ${skipped}, failed ${failed})`,
    );
  }

  await browser.close();
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(
    `done: ${generated} generated, ${skipped} reused, ${failed} failed; manifest → web/src/portrait-manifest.json (${Object.keys(manifest).length} entries)`,
  );
  if (failed > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
