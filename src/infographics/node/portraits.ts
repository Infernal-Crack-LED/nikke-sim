// Node portrait/image loader for the infographics render host. Decodes image
// files into @napi-rs/canvas canvases that core renderers can drawImage
// directly. ONE copy of the art: the committed 128px thumbs under
// web/public/img/portraits (the bakery-bot mirror set is what this replaces).
import { createCanvas, type Canvas } from '@napi-rs/canvas';
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// NIKKESIM_PORTRAIT_DIR lets a deployed server point at the static tree's copy
// (dist/img/portraits) instead of the source tree — same files, but dist/ is
// what the deploy artifact guarantees.
const PORTRAIT_DIR =
  process.env.NIKKESIM_PORTRAIT_DIR ??
  fileURLToPath(new URL('../../../web/public/img/portraits/', import.meta.url));

// ⚠ WHY NOT `new Image()`: @napi-rs/canvas's Image rasterization is BROKEN on
// the owner's Mac (macOS 26 arm64, node 22) in both 1.0.2 and 0.1.x — src
// assignment decodes dimensions but every drawImage(image) silently no-ops
// (verified 2026-07-27 on PNG and WebP; the same code works on Railway Linux).
// So images are decoded with sharp and painted onto a canvas via putImageData —
// canvas→canvas drawImage works everywhere. Do NOT "simplify" this back to
// skia's Image.
export async function decodeToCanvas(file: URL): Promise<Canvas | null> {
  try {
    const { data, info } = await sharp(readFileSync(file))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const canvas = createCanvas(info.width, info.height);
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(info.width, info.height);
    imageData.data.set(data);
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  } catch {
    return null;
  }
}

// slug → portrait canvas, from the committed 128px webp thumbs. Cached (a bot
// burst or a build-time pre-generation pass re-renders the same units
// constantly). Returns null on a missing/undecodable file so a card degrades
// to its placeholder box instead of failing the render.
//
// The slug is ATTACKER-CONTROLLED on the render-API path (it comes from a
// decoded build code), so it is validated before it ever touches a path —
// otherwise `../../../../etc/hosts` reaches join(PORTRAIT_DIR, …) and escapes
// the portrait dir (limited to files named `<target>-128.webp`, but still).
// The cache is a bounded LRU: keyed on raw slugs it would otherwise grow
// forever on a long-lived server (every garbage slug caches a null).
const SLUG = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const PORTRAIT_CACHE_MAX = 512; // 128×128 RGBA ≈ 64 KB each → ≤ ~32 MB
const portraitCache = new Map<string, Promise<Canvas | null>>();
export function loadPortrait(slug: string): Promise<Canvas | null> {
  if (!SLUG.test(slug)) {
    return Promise.resolve(null); // placeholder box, never a path
  }
  let hit = portraitCache.get(slug);
  if (hit) {
    // LRU recency: re-insert so the entry ages to the back of the Map.
    portraitCache.delete(slug);
    portraitCache.set(slug, hit);
    return hit;
  }
  hit = decodeToCanvas(pathToFileURL(join(PORTRAIT_DIR, `${slug}-128.webp`)));
  portraitCache.set(slug, hit);
  if (portraitCache.size > PORTRAIT_CACHE_MAX) {
    portraitCache.delete(portraitCache.keys().next().value!); // oldest
  }
  return hit;
}
