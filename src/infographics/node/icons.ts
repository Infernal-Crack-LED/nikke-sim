// Node loader for the NIKKE identity icons (element code, burst stage, class,
// manufacturer, weapon) that the unit card's icon strip draws.
//
// SOURCE: web/public/nikke-icons/ is read DIRECTLY — no vendoring step. Those 28
// files are tracked in git (unlike the gitignored web/public/*.json build
// outputs), and `emptyOutDir` wipes dist/, never web/public/, so they are
// present on a clean checkout with no build ordering to honour.
//
// ── Why this module rasterizes instead of just decoding a file ────────────────
// The icons ship at different native resolutions (measured 2026-07-28, after the
// burst/class replacement): burst_* 91x104, class_* 78-101x101-103, code_* 63x73
// raster / 73x73 vector, man_* 50x50 except man_missilis at 32x32, weapon_* 80x80.
// The card draws them all at ONE size, so a plain decode would paint a 32px
// manufacturer icon into a 64px box at 2x (4x on the dpr-2 landscape card) —
// visibly soft on an asset whose entire job is advertising.
//
// So every icon is resolved at its TARGET size:
//   - `.svg` present  → sharp rasterizes the vector AT that size. True
//     rasterization, not upscaling (verified: the opaque-pixel ratio holds
//     steady across 64/128/256px, which an upscale would not do).
//   - no `.svg`       → the raster file, resized to the target with a decent
//     kernel. Sharp than a naive drawImage stretch, but bounded by the source.
//
// SVG-FIRST IS DELIBERATE AND FORWARD-COMPATIBLE. Only code_* ships `.svg` today
// (5 of 28 files, as of 2026-07-28). The rest are raster-bound — including
// burst_*, whose vector source did not survive the icon replacement: the new
// burst and class sets are webp-only at ~100px native, which is comfortably
// above every box the card draws them in, so raster is not a compromise there.
// Dropping SVGs into web/public/nikke-icons/ later needs NO code change — the
// resolver picks them up automatically and the raster path stops being used.
// `iconUpscaleAudit()` below reports which families are still raster-bound.
import { createCanvas, type Canvas } from '@napi-rs/canvas';
import sharp from 'sharp';
import { existsSync, readFileSync } from 'node:fs';
import { ALL_ICON_NAMES } from '../core/iconNames.js';
import { fileURLToPath, pathToFileURL } from 'node:url';

// NIKKESIM_ICON_DIR lets a COMPILED host (the dist-server esbuild bundle,
// whose import.meta.url no longer sits 3 directories under the source tree —
// it's one flat file) point at the checked-out web/public/nikke-icons/ by an
// absolute path. Same escape hatch as fonts.ts's NIKKESIM_FONT_DIR; set by
// src/server/env-defaults.ts when it detects it's running from the bundle.
// Unset = the source-tree default every tsx / vitest run uses.
const ICON_DIR = process.env.NIKKESIM_ICON_DIR
  ? pathToFileURL(`${process.env.NIKKESIM_ICON_DIR}/`)
  : new URL('../../../web/public/nikke-icons/', import.meta.url);

// Preference order. `.webp` sits ahead of `.png` only because the two families
// that ship webp (class_/man_) ship NOTHING else; where both exist (code_,
// burst_) the svg already won. Decode reliability is not a differentiator here:
// decodeToCanvas goes through sharp, not skia's Image, and all 30 files decode
// (measured 2026-07-28 — the earlier "webp may not decode" worry was a false
// premise; the prod portrait path already loads .webp on every card).
const EXTENSIONS = ['svg', 'png', 'webp'] as const;

export type IconKind = 'code' | 'burst' | 'class' | 'man' | 'weapon';

// Resolve a logical icon name to a file, preferring vector. Returns null when no
// variant exists, so a caller degrades (draws nothing) instead of throwing.
function resolveIconFile(name: string): { url: URL; ext: string } | null {
  for (const ext of EXTENSIONS) {
    const url = new URL(`${name}.${ext}`, ICON_DIR);
    if (existsSync(url)) {
      return { url, ext };
    }
  }
  return null;
}

// name → target-size canvas. Cached on (name, size): the build renders ~200
// cards and every one of them draws the same handful of icons, so without a
// cache this is ~1400 redundant rasterizations.
const cache = new Map<string, Promise<Canvas | null>>();

export function loadIcon(name: string, size: number): Promise<Canvas | null> {
  const key = `${name}\0${size}`;
  let hit = cache.get(key);
  if (!hit) {
    hit = rasterizeIcon(name, size);
    cache.set(key, hit);
  }
  return hit;
}

async function rasterizeIcon(
  name: string,
  size: number
): Promise<Canvas | null> {
  const found = resolveIconFile(name);
  if (!found) {
    return null;
  }
  try {
    // `fit: 'contain'` + transparent background preserves each icon's own aspect
    // ratio inside a square box — these are not uniformly square (code_* is
    // 63x73, burst_1 is 17x37), and stretching them to a square would distort
    // the artwork. The card centres the returned canvas in its slot.
    const { data, info } = await sharp(readFileSync(found.url), {
      // For SVG, `density` drives the rasterization resolution. Sharp's default
      // 72dpi rasterizes at the SVG's nominal size and THEN resizes — which is
      // the upscale this module exists to avoid. Scaling density with the target
      // makes the vector rasterize at full target resolution.
      density: found.ext === 'svg' ? Math.max(72, size * 3) : 72,
    })
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
        kernel: 'lanczos3',
      })
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

// ---- logical name mapping ----------------------------------------------------

// The field-value → file-name mapping lives in core/iconNames.ts (pure), so the
// Node build and the browser resolve the SAME asset for the same unit. This
// module only adds the Node-side rasterization.
export {
  iconNameForElement,
  iconNameForClass,
  iconNameForBurst,
  iconNameForWeapon,
  iconNameForManufacturer,
  isOverspec,
  ALL_ICON_NAMES,
} from '../core/iconNames.js';

// ---- build-time guards -------------------------------------------------------

// Assert every icon rasterizes to visible pixels at `size`. Mirrors
// assertFontsLive's contract: a decode that returns a blank canvas is the real
// failure mode, not a thrown error, so this counts non-transparent pixels rather
// than trusting a non-null return.
export async function assertIconsLive(size = 64): Promise<void> {
  const dead: string[] = [];
  for (const name of ALL_ICON_NAMES) {
    const canvas = await loadIcon(name, size);
    if (!canvas) {
      dead.push(`${name} (no file)`);
      continue;
    }
    const px = canvas
      .getContext('2d')
      .getImageData(0, 0, canvas.width, canvas.height).data;
    let opaque = 0;
    for (let i = 3; i < px.length; i += 4) {
      if (px[i] > 0) {
        opaque++;
        break;
      }
    }
    if (opaque === 0) {
      dead.push(`${name} (rasterized blank)`);
    }
  }
  if (dead.length) {
    throw new Error(
      `infographics icons: ${dead.length} icon(s) missing or blank — ` +
        `${dead.join(', ')}. Check ${fileURLToPath(ICON_DIR)}.`
    );
  }
}

// Which icons are still raster-bound (no vector source) and by how much they
// would be upscaled at `size`. Reported by the build so the quality risk stays
// visible instead of silently shipping; drops to empty once the missing SVGs
// land. Native sizes are read from the file, not hardcoded.
export async function iconUpscaleAudit(
  size: number
): Promise<{ name: string; native: number; factor: number }[]> {
  const out: { name: string; native: number; factor: number }[] = [];
  for (const name of ALL_ICON_NAMES) {
    const found = resolveIconFile(name);
    if (!found || found.ext === 'svg') {
      continue; // vector → no upscale at any size
    }
    const meta = await sharp(readFileSync(found.url)).metadata();
    const native = Math.max(meta.width ?? 0, meta.height ?? 0);
    if (native > 0 && size > native) {
      out.push({ name, native, factor: +(size / native).toFixed(2) });
    }
  }
  return out.sort((a, b) => b.factor - a.factor);
}
