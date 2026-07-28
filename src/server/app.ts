// Server factory — wires the static site handler and the /api/v1/img/* API
// onto one node:http server. Kept separate from index.ts (the process entry)
// so tests can boot the REAL server in-process on an ephemeral port against a
// temp dist/cache (scripts/tests/share/serve-api.test.ts).
import { createServer, type Server } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { decodeToCanvas, type Canvas } from '../infographics/node/render.js';
import { handleStatic } from './static.js';
import { handleImgApi, type ApiContext } from './api.js';
import { RenderCache } from './render-cache.js';
import type { CardCharacter } from './card-from-build.js';

// The repo root, found from THIS module so both layouts work: running from
// source (src/server/app.ts → ../../) and running the compiled bundle
// (dist-server/index.js → ../).
export const REPO_ROOT = ['..', '../..']
  .map((r) => fileURLToPath(new URL(`${r}/`, import.meta.url)))
  .find((d) => existsSync(join(d, 'package.json')))!;

const DEFAULT_CACHE_MAX_BYTES = 200 * 1024 * 1024; // 200 MB

export interface NikkesimServerOptions {
  distDir?: string; // default <repo>/dist (SERVE_DIST overrides)
  cacheDir?: string; // default <repo>/.cache/infographics (NIKKESIM_RENDER_CACHE_DIR)
  cacheMaxBytes?: number; // NIKKESIM_RENDER_CACHE_MAX_BYTES
  renderSecret?: string; // NIKKESIM_RENDER_SECRET — see api.ts REQUIRE_RENDER_SECRET
  umamiUrl?: string; // UMAMI_URL
  umamiWebsiteId?: string; // UMAMI_WEBSITE_ID
  // Test hook: inject character metadata instead of loading data/characters.json.
  characters?: Record<string, CardCharacter>;
  // dpschart.json for the dps.png route (default <distDir>/dpschart.json).
  dpsChartPath?: string;
}

function loadCharacters(): Record<string, CardCharacter> {
  const file = join(REPO_ROOT, 'data', 'characters.json');
  const parsed = JSON.parse(readFileSync(file, 'utf8')) as {
    characters: Record<string, CardCharacter>;
  };
  return parsed.characters;
}

// The nikkesim icon drawn beside card titles. The compiled bundle resolves it
// via NIKKESIM_ASSETS_DIR (env-defaults.ts points it at the build's asset
// copies); from source it sits in src/infographics/assets/.
function loadIcon(): Promise<Canvas | null> {
  const assetsDir = process.env.NIKKESIM_ASSETS_DIR;
  const url = assetsDir
    ? pathToFileURL(join(assetsDir, 'nikkesim-icon.png'))
    : new URL('../infographics/assets/nikkesim-icon.png', import.meta.url);
  return decodeToCanvas(url);
}

export async function createNikkesimServer(
  opts: NikkesimServerOptions = {}
): Promise<Server> {
  const env = process.env;
  const distDir = opts.distDir ?? env.SERVE_DIST ?? join(REPO_ROOT, 'dist');
  const cacheDir =
    opts.cacheDir ??
    env.NIKKESIM_RENDER_CACHE_DIR ??
    join(REPO_ROOT, '.cache', 'infographics');
  const cache = new RenderCache(
    cacheDir,
    opts.cacheMaxBytes ??
      (Number(env.NIKKESIM_RENDER_CACHE_MAX_BYTES) || DEFAULT_CACHE_MAX_BYTES)
  );
  await cache.sweep(); // boot sweep — the cap applies even after config shrinks

  const ctx: ApiContext = {
    distDir,
    cache,
    chars: opts.characters ?? loadCharacters(),
    icon: await loadIcon(),
    renderSecret: opts.renderSecret ?? env.NIKKESIM_RENDER_SECRET,
    dpsChartPath: opts.dpsChartPath,
  };

  const staticOpts = {
    distDir,
    umamiUrl: opts.umamiUrl ?? env.UMAMI_URL,
    umamiWebsiteId: opts.umamiWebsiteId ?? env.UMAMI_WEBSITE_ID,
  };

  return createServer(async (req, res) => {
    try {
      const u = new URL(req.url ?? '/', 'http://localhost');
      if (u.pathname.startsWith('/api/v1/img/')) {
        await handleImgApi(req, res, u, ctx);
        return;
      }
      await handleStatic(req, res, staticOpts);
    } catch (err) {
      console.error('unhandled request error:', err);
      if (!res.headersSent) {
        res.writeHead(500).end('server error');
      } else {
        res.end();
      }
    }
  });
}
