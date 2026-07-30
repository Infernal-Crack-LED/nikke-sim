// Asset-location defaults for the COMPILED server — MUST be imported before
// anything that loads the render host (src/infographics/node/render.ts), so it
// stays the first import of index.ts.
//
// Why this exists: the render host resolves its TTFs, portraits, and icons
// relative to import.meta.url, which is correct from source (tsx/vitest) but
// NOT from the esbuild bundle (dist-server/index.js — one flat file). The
// server build (scripts/build-server.mjs) copies src/infographics/assets/ next
// to the bundle, and the deploy's dist/ ships the portrait thumbs; this module
// points the render host at those copies. web/public/nikke-icons/ is neither
// copied nor vendored (icons.ts reads it directly from the checkout on
// purpose) — from the bundle it's a sibling of dist-server/, one level up.
// From source none of the candidate paths exist, nothing is set, and the
// render host's source-tree defaults apply.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));

const bundledAssets = join(here, 'assets');
if (!process.env.NIKKESIM_ASSETS_DIR && existsSync(bundledAssets)) {
  process.env.NIKKESIM_ASSETS_DIR = bundledAssets;
}
if (
  !process.env.NIKKESIM_FONT_DIR &&
  existsSync(join(bundledAssets, 'fonts'))
) {
  process.env.NIKKESIM_FONT_DIR = join(bundledAssets, 'fonts');
}

const bundledIconDir = join(here, '..', 'web', 'public', 'nikke-icons');
if (!process.env.NIKKESIM_ICON_DIR && existsSync(bundledIconDir)) {
  process.env.NIKKESIM_ICON_DIR = bundledIconDir;
}

// Portraits: prefer the deployed static tree's copy (dist/img/portraits is
// web/public/img/portraits, copied by vite build). Same default-DIST logic as
// serve.mjs; when it doesn't exist (running from source) the render host falls
// back to the source tree.
const distDir =
  process.env.SERVE_DIST ?? fileURLToPath(new URL('../dist/', import.meta.url));
if (
  !process.env.NIKKESIM_PORTRAIT_DIR &&
  existsSync(join(distDir, 'img', 'portraits'))
) {
  process.env.NIKKESIM_PORTRAIT_DIR = join(distDir, 'img', 'portraits');
}
