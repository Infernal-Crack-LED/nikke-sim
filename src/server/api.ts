// The /api/v1/img/* surface (Phase 3 of
// docs/handoffs/2026-07-27-infographics-centralization-plan.md, §2 "The API
// contract" + §6.4) — routes registered on the hono app (the §6.4 hono
// trigger fired when POST /api/v1/img/render shipped).
//
//   GET /api/v1/img/manifest.json            → dist/img/manifest.json, no-cache
//   GET /api/v1/img/{dps,unit,rank,table}/<file> → dist/img/..., immutable (hashed)
//   GET /api/v1/img/cache/<file>             → the dynamic-render cache, immutable
//   GET /api/v1/img/team.png?b=<buildcode>   → 302 to /api/v1/img/cache/team.<hash>.png
//   GET /api/v1/img/roster.png?b=<buildcode> → 302 to .../roster.<hash>.png
//   GET /api/v1/img/dps.png?cell&element&unit → 302 to .../dps.<hash>.png
//   GET /api/v1/img/table/max-ammo.png?unit=<slug>     → 302 to .../table.<hash>.png
//   GET /api/v1/img/table/charge-speed.png[?unit=<slug>] → 302 to .../table.<hash>.png
//
// Every image URL the API hands out is content-addressed, so the 302s and the
// cached files are safe for Discord's hard URL-keyed CDN caching (plan §2).
// The 302 responses themselves are no-cache: the hash embeds RENDERER_VERSION,
// so a renderer change must be free to point the same build code at a new file.
import type { Context, Hono } from 'hono';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join, normalize } from 'node:path';
import type { Canvas, TableCardData } from '../infographics/node/render.js';
import { loadPortrait } from '../infographics/node/render.js';
import {
  buildAmmoTable,
  buildChargeTable,
  GENERIC_BASE_FRAMES,
} from '../infographics/core/tableData.js';
import { decodeBuild } from '../share/build-code.js';
import { IMMUTABLE, NO_CACHE, mimeFor } from './static.js';
import type { RenderCache } from './render-cache.js';
import {
  renderTeamCardPng,
  renderRosterCardPng,
  cardBuildError,
  type CardCharacter,
} from './card-from-build.js';
import {
  dpsChartData,
  renderDpsChartPng,
  renderTableCardPng,
  type DpsArtifact,
} from './dps-table-cards.js';

// Bump when the card renderers change in a way that should re-render existing
// build codes — it is part of the cache key, so old files simply age out via
// LRU instead of serving stale pixels.
const RENDERER_VERSION = 'v1';

// Build codes are compact (a 5-slot build is ~300-600 chars; a union roster
// with loadouts is still well under 2 KB). Anything beyond this is garbage.
const BUILD_CODE_MAX_LEN = 4096;

// Cached dynamic renders: `<type>.<hash16>.png` — nothing else is servable
// from the cache dir.
const CACHE_FILE = /^(team|roster|dps|table)\.[0-9a-f]{16}\.png$/;

export const API_PREFIX = '/api/v1/img/';

export interface ApiContext {
  distDir: string;
  cache: RenderCache;
  chars: Record<string, CardCharacter>;
  icon: Canvas | null;
  renderSecret?: string;
  // dpschart.json location for the dps.png route (default <distDir>/dpschart.json).
  // Injectable for tests, like distDir/cacheDir.
  dpsChartPath?: string;
}

// Rate limiting lives in CLOUDFLARE, not in this process (plan §6.3/§6.4: edge
// limiting protects the origin before the request costs anything, and works
// across instances and restarts). When NIKKESIM_RENDER_SECRET is configured,
// bakery-bot sends it as `x-render-secret`; anonymous callers are still served
// (Cloudflare rate-limits them). To make the secret mandatory later, flip this
// one constant to true.
const REQUIRE_RENDER_SECRET = false;

function text(status: number, body: string): Response {
  return new Response(body, {
    status,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}

// API misses are honest 404s — never the SPA fallback (a crawler handed
// index.html for an image URL embeds nothing). app.ts's notFound handler
// routes unmatched /api/v1/img/* paths here.
export function apiMiss(): Response {
  return text(404, 'not found');
}

async function sendRaw(file: string, cacheControl: string): Promise<Response> {
  const body = await readFile(file);
  return new Response(body, {
    headers: {
      'content-type': mimeFor(file),
      'cache-control': cacheControl,
    },
  });
}

const hashKey = (type: string, code: string): string =>
  createHash('sha256')
    .update(`${RENDERER_VERSION}|${type}|${code}`)
    .digest('hex')
    .slice(0, 16);

// Single-flight: concurrent misses for the same card share one render. Keyed
// on the cache FILENAME (which already embeds type + content hash).
const inflight = new Map<string, Promise<Buffer>>();

function renderOnce(
  file: string,
  render: () => Promise<Buffer>
): Promise<Buffer> {
  let p = inflight.get(file);
  if (!p) {
    p = render().finally(() => inflight.delete(file));
    inflight.set(file, p);
  }
  return p;
}

// The shared tail of every dynamic route: render on a cache miss.
async function ensureCached(
  ctx: ApiContext,
  file: string,
  render: () => Promise<Buffer>
): Promise<boolean> {
  if (!(await ctx.cache.has(file))) {
    try {
      await ctx.cache.put(file, await renderOnce(file, render));
    } catch (err) {
      console.error(`render ${file} failed:`, err);
      return false;
    }
  }
  return true;
}

// …then 302 to the content-addressed cache URL (the GET contract).
async function renderAndRedirect(
  ctx: ApiContext,
  file: string,
  render: () => Promise<Buffer>
): Promise<Response> {
  if (!(await ensureCached(ctx, file, render))) {
    return text(500, 'render failed');
  }
  return new Response(null, {
    status: 302,
    headers: {
      location: `${API_PREFIX}cache/${file}`,
      'cache-control': NO_CACHE,
    },
  });
}

// See the constant's comment on REQUIRE_RENDER_SECRET: unreachable while it is
// false; when flipped, every dynamic route gates on the shared secret.
function secretOk(req: Request, ctx: ApiContext): boolean {
  if (!REQUIRE_RENDER_SECRET || !ctx.renderSecret) {
    return true;
  }
  return req.headers.get('x-render-secret') === ctx.renderSecret;
}

function handleDynamic(
  c: Context,
  type: 'team' | 'roster',
  ctx: ApiContext
): Promise<Response> | Response {
  if (!secretOk(c.req.raw, ctx)) {
    return text(401, 'missing or invalid x-render-secret');
  }
  const code = (c.req.query('b') ?? '').trim();
  if (!code || code.length > BUILD_CODE_MAX_LEN) {
    return text(400, 'invalid build code');
  }
  const build = decodeBuild(code);
  if (!build) {
    return text(400, 'invalid build code');
  }
  // decodeBuild checks only the envelope — the roster/slot contents are
  // attacker-controlled and size the canvas, so validate BEFORE rendering
  // (an unvalidated roster was a one-request ~1.6 GB canvas allocation).
  const invalid = cardBuildError(build, type);
  if (invalid) {
    return text(400, invalid);
  }

  const file = `${type}.${hashKey(type, code)}.png`;
  return renderAndRedirect(ctx, file, () =>
    type === 'team'
      ? renderTeamCardPng(build, ctx.chars, ctx.icon)
      : renderRosterCardPng(build, ctx.chars, ctx.icon)
  );
}

// ---- dps.png -----------------------------------------------------------------

const DEFAULT_DPS_CELL = 'solo.eleweak.c100.8of12';

// dpschart.json is built into dist/ at deploy. Read lazily, cached in memory
// keyed by path — the server restarts every deploy, so read-once is fine (a
// deploy that regenerates the artifact restarts this process too).
const dpsChartCache = new Map<string, Promise<DpsArtifact | null>>();

function loadDpsChart(ctx: ApiContext): Promise<DpsArtifact | null> {
  const path = ctx.dpsChartPath ?? join(ctx.distDir, 'dpschart.json');
  let p = dpsChartCache.get(path);
  if (!p) {
    p = readFile(path, 'utf8').then(
      (raw) => JSON.parse(raw) as DpsArtifact,
      () => null
    );
    dpsChartCache.set(path, p);
  }
  return p;
}

async function handleDpsChart(c: Context, ctx: ApiContext): Promise<Response> {
  if (!secretOk(c.req.raw, ctx)) {
    return text(401, 'missing or invalid x-render-secret');
  }
  const art = await loadDpsChart(ctx);
  if (!art) {
    return text(404, 'dps chart data unavailable');
  }
  const params = {
    cell: (c.req.query('cell') ?? '').trim() || DEFAULT_DPS_CELL,
    element: c.req.query('element')?.trim().toLowerCase() || null,
    unit: c.req.query('unit')?.trim() || null,
  };
  const built = dpsChartData(art, params, ctx.icon);
  if ('error' in built) {
    return text(400, built.error);
  }
  const file = `dps.${hashKey('dps', `${params.cell}|${params.element ?? '-'}|${params.unit ?? '-'}`)}.png`;
  return renderAndRedirect(ctx, file, () => renderDpsChartPng(built.data));
}

// ---- table/*.png ---------------------------------------------------------------

// Per-unit tables validate the slug against the SAME character metadata the
// build-code cards use (data/characters.json at boot, injectable in tests).
async function handleTable(
  c: Context,
  ctx: ApiContext,
  kind: 'max-ammo' | 'charge-speed'
): Promise<Response> {
  if (!secretOk(c.req.raw, ctx)) {
    return text(401, 'missing or invalid x-render-secret');
  }
  const slug = c.req.query('unit')?.trim() || null;

  let key: string;
  let data: TableCardData;
  if (kind === 'max-ammo') {
    if (!slug) {
      return text(400, 'unit is required');
    }
    const ch = ctx.chars[slug];
    if (!ch) {
      return text(400, `unknown unit '${slug}'`);
    }
    const base = ch.ammo;
    if (!base || base <= 0) {
      return text(400, `${ch.name} has no ammo data`);
    }
    key = `max-ammo|${slug}`;
    data = buildAmmoTable(base, ch.name);
  } else {
    if (slug) {
      const ch = ctx.chars[slug];
      if (!ch) {
        return text(400, `unknown unit '${slug}'`);
      }
      // Charge weapons only (SR/RL). characters.json carries the charge
      // directly in frames (= round(charge_time/100*60), the bot's formula).
      const baseFrames = ch.chargeFrames ?? 0;
      if (baseFrames <= 0 || (ch.weapon !== 'SR' && ch.weapon !== 'RL')) {
        return text(
          400,
          ch.weapon === 'SR' || ch.weapon === 'RL'
            ? `${ch.name} has no charge data`
            : `${ch.name} (${ch.weapon}) is not a charge weapon`
        );
      }
      key = `charge-speed|${slug}`;
      data = buildChargeTable(baseFrames, ch.name);
    } else {
      key = 'charge-speed|generic';
      data = buildChargeTable(GENERIC_BASE_FRAMES, 'Generic (1.0s)');
    }
  }

  data.icon = ctx.icon ?? undefined;
  if (slug) {
    data.portrait = (await loadPortrait(slug)) ?? undefined;
  }
  const file = `table.${hashKey('table', key)}.png`;
  return renderAndRedirect(ctx, file, () =>
    Promise.resolve(renderTableCardPng(data))
  );
}

// Register every /api/v1/img/* route on the hono app. Static routes (exact
// paths) outrank the trailing wildcard in hono's router, so registration
// order here is readability, not correctness.
export function registerImgApi(app: Hono, ctx: ApiContext): void {
  app.get('/api/v1/img/team.png', (c) => handleDynamic(c, 'team', ctx));
  app.get('/api/v1/img/roster.png', (c) => handleDynamic(c, 'roster', ctx));
  app.get('/api/v1/img/dps.png', (c) => handleDpsChart(c, ctx));
  app.get('/api/v1/img/table/max-ammo.png', (c) =>
    handleTable(c, ctx, 'max-ammo')
  );
  app.get('/api/v1/img/table/charge-speed.png', (c) =>
    handleTable(c, ctx, 'charge-speed')
  );

  app.get('/api/v1/img/manifest.json', async () => {
    try {
      return await sendRaw(join(ctx.distDir, 'img', 'manifest.json'), NO_CACHE);
    } catch {
      return apiMiss();
    }
  });

  app.get('/api/v1/img/cache/:file', async (c) => {
    const name = c.req.param('file');
    if (!CACHE_FILE.test(name) || !(await ctx.cache.has(name))) {
      return apiMiss();
    }
    return sendRaw(ctx.cache.pathFor(name), IMMUTABLE);
  });

  // Pre-rendered set: /api/v1/img/<rest> maps onto dist/img/<rest>. Only the
  // published kinds are servable; all carry content hashes → immutable.
  app.get('/api/v1/img/*', async (c) => {
    const path = new URL(c.req.url).pathname;
    const rest = path.slice(API_PREFIX.length);
    const kind = rest.split('/')[0];
    if (!['dps', 'unit', 'rank', 'table'].includes(kind)) {
      return apiMiss();
    }
    const rel = normalize(decodeURIComponent(rest)).replace(
      /^(\.\.[/\\])+/,
      ''
    );
    const file = join(ctx.distDir, 'img', rel);
    if (!file.startsWith(join(ctx.distDir, 'img'))) {
      return apiMiss();
    }
    try {
      return await sendRaw(file, IMMUTABLE);
    } catch {
      return apiMiss();
    }
  });
}
