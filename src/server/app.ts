// Server factory — wires the static site handler and the /api/v1/img/* API
// onto one hono app (the §6.4 hono trigger fired when POST /render shipped),
// served over node:http via @hono/node-server's getRequestListener so tests
// keep booting a real Server on an ephemeral port
// (scripts/tests/share/serve-api.test.ts). Kept separate from index.ts (the
// process entry) so tests can inject a temp dist/cache/characters.
import { Hono } from 'hono';
import { getRequestListener } from '@hono/node-server';
import { createServer, type Server } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { decodeToCanvas, type Canvas } from '../infographics/node/render.js';
import { handleStatic } from './static.js';
import { API_PREFIX, apiMiss, registerImgApi, type ApiContext } from './api.js';
import type { DollData } from '../doll/card.js';
import { RenderCache } from './render-cache.js';
import { SpecStore } from './spec-store.js';
import { ConfigStore } from './config-store.js';
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
  // Shared-config resolver for `?id=` renders. Injectable so a test can stub
  // the bakery-bot read instead of reaching the network (config-store.ts).
  configs?: ConfigStore;
}

function loadCharacters(): Record<string, CardCharacter> {
  const file = join(REPO_ROOT, 'data', 'characters.json');
  const parsed = JSON.parse(readFileSync(file, 'utf8')) as {
    characters: Record<string, CardCharacter>;
  };
  return parsed.characters;
}

// The doll card's two data files. Undefined when they aren't there, which the
// doll route reports as a 404 — the same treatment the dps artifact gets, and
// better than refusing to boot the whole server over one card.
function loadDollData(): DollData | undefined {
  try {
    return {
      economy: JSON.parse(
        readFileSync(join(REPO_ROOT, 'data', 'doll-economy.json'), 'utf8')
      ),
      proc: JSON.parse(
        readFileSync(join(REPO_ROOT, 'data', 'doll-super-success.json'), 'utf8')
      ),
    };
  } catch (err) {
    console.warn('doll data unavailable, /api/v1/img/doll.png will 404:', err);
    return undefined;
  }
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
  // Spec sidecars live under the cache dir (RenderCache.sweep only looks at
  // files, so the subdir is invisible to it). They outlive the PNGs they
  // describe: an evicted card re-renders instead of 404ing an embedded URL.
  const specs = new SpecStore(join(cacheDir, 'specs'));

  const ctx: ApiContext = {
    distDir,
    cache,
    specs,
    configs: opts.configs ?? new ConfigStore(),
    chars: opts.characters ?? loadCharacters(),
    icon: await loadIcon(),
    renderSecret: opts.renderSecret ?? env.NIKKESIM_RENDER_SECRET,
    dpsChartPath: opts.dpsChartPath,
    doll: loadDollData(),
  };

  const staticOpts = {
    distDir,
    umamiUrl: opts.umamiUrl ?? env.UMAMI_URL,
    umamiWebsiteId: opts.umamiWebsiteId ?? env.UMAMI_WEBSITE_ID,
  };

  const app = new Hono();
  app.onError((err) => {
    console.error('unhandled request error:', err);
    return new Response('server error', { status: 500 });
  });
  registerImgApi(app, ctx);
  // Everything the API routes don't claim: API misses are honest 404s, all
  // other paths go to the static handler (dist/ + SPA fallback).
  app.notFound((c) => {
    if (new URL(c.req.url).pathname.startsWith(API_PREFIX)) {
      return apiMiss();
    }
    return handleStatic(c, staticOpts);
  });

  // hono maps HEAD onto the GET handlers with a null body (same externally
  // observable behavior as the old node:http handler, whose body node
  // suppressed for HEAD).
  return createServer(getRequestListener(app.fetch));
}
