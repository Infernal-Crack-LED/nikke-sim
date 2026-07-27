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
const portraitCache = new Map<string, Promise<Canvas | null>>();
export function loadPortrait(slug: string): Promise<Canvas | null> {
  let hit = portraitCache.get(slug);
  if (!hit) {
    hit = decodeToCanvas(pathToFileURL(join(PORTRAIT_DIR, `${slug}-128.webp`)));
    portraitCache.set(slug, hit);
  }
  return hit;
}
