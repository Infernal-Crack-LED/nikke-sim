// The /api/v1/img/* surface (Phase 3 of
// docs/handoffs/2026-07-27-infographics-centralization-plan.md, §2 "The API
// contract" + §6.4): hand-rolled GET routes on node:http, no framework.
//
//   GET /api/v1/img/manifest.json            → dist/img/manifest.json, no-cache
//   GET /api/v1/img/{dps,unit,rank}/<file>   → dist/img/..., immutable (hashed)
//   GET /api/v1/img/cache/<file>             → the dynamic-render cache, immutable
//   GET /api/v1/img/team.png?b=<buildcode>   → 302 to /api/v1/img/cache/team.<hash>.png
//   GET /api/v1/img/roster.png?b=<buildcode> → 302 to .../roster.<hash>.png
//
// Every image URL the API hands out is content-addressed, so the 302s and the
// cached files are safe for Discord's hard URL-keyed CDN caching (plan §2).
// The 302 responses themselves are no-cache: the hash embeds RENDERER_VERSION,
// so a renderer change must be free to point the same build code at a new file.
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { basename, join, normalize } from 'node:path';
import type { Canvas } from '../infographics/node/render.js';
import { decodeBuild } from '../share/build-code.js';
import { IMMUTABLE, NO_CACHE, mimeFor } from './static.js';
import type { RenderCache } from './render-cache.js';
import {
  renderTeamCardPng,
  renderRosterCardPng,
  cardBuildError,
  type CardCharacter,
} from './card-from-build.js';

// Bump when the card renderers change in a way that should re-render existing
// build codes — it is part of the cache key, so old files simply age out via
// LRU instead of serving stale pixels.
const RENDERER_VERSION = 'v1';

// Build codes are compact (a 5-slot build is ~300-600 chars; a union roster
// with loadouts is still well under 2 KB). Anything beyond this is garbage.
const BUILD_CODE_MAX_LEN = 4096;

// Cached dynamic renders: `<type>.<hash16>.png` — nothing else is servable
// from the cache dir.
const CACHE_FILE = /^(team|roster)\.[0-9a-f]{16}\.png$/;

export interface ApiContext {
  distDir: string;
  cache: RenderCache;
  chars: Record<string, CardCharacter>;
  icon: Canvas | null;
  renderSecret?: string;
}

// Rate limiting lives in CLOUDFLARE, not in this process (plan §6.3/§6.4: edge
// limiting protects the origin before the request costs anything, and works
// across instances and restarts). When NIKKESIM_RENDER_SECRET is configured,
// bakery-bot sends it as `x-render-secret`; anonymous callers are still served
// (Cloudflare rate-limits them). To make the secret mandatory later, flip this
// one constant to true.
const REQUIRE_RENDER_SECRET = false;

function text(res: ServerResponse, status: number, body: string): void {
  res.writeHead(status, { 'content-type': 'text/plain; charset=utf-8' });
  res.end(body);
}

async function sendRaw(
  res: ServerResponse,
  file: string,
  cacheControl: string
): Promise<void> {
  const body = await readFile(file);
  res.writeHead(200, {
    'content-type': mimeFor(file),
    'cache-control': cacheControl,
  });
  res.end(body);
}

const hashKey = (type: string, code: string): string =>
  createHash('sha256')
    .update(`${RENDERER_VERSION}|${type}|${code}`)
    .digest('hex')
    .slice(0, 16);

// Single-flight: concurrent misses for the same card share one render.
const inflight = new Map<string, Promise<Buffer>>();

function renderOnce(
  type: 'team' | 'roster',
  code: string,
  ctx: ApiContext
): Promise<Buffer> {
  const key = `${type}:${hashKey(type, code)}`;
  let p = inflight.get(key);
  if (!p) {
    const build = decodeBuild(code)!; // validated by the caller
    p = (
      type === 'team'
        ? renderTeamCardPng(build, ctx.chars, ctx.icon)
        : renderRosterCardPng(build, ctx.chars, ctx.icon)
    ).finally(() => inflight.delete(key));
    inflight.set(key, p);
  }
  return p;
}

async function handleDynamic(
  req: IncomingMessage,
  res: ServerResponse,
  type: 'team' | 'roster',
  u: URL,
  ctx: ApiContext
): Promise<void> {
  if (REQUIRE_RENDER_SECRET && ctx.renderSecret) {
    // See the constant's comment: Cloudflare rate-limits anonymous callers, so
    // for now this branch is unreachable (REQUIRE_RENDER_SECRET = false).
    if (req.headers['x-render-secret'] !== ctx.renderSecret) {
      text(res, 401, 'missing or invalid x-render-secret');
      return;
    }
  }
  const code = (u.searchParams.get('b') ?? '').trim();
  if (!code || code.length > BUILD_CODE_MAX_LEN) {
    text(res, 400, 'invalid build code');
    return;
  }
  const build = decodeBuild(code);
  if (!build) {
    text(res, 400, 'invalid build code');
    return;
  }
  // decodeBuild checks only the envelope — the roster/slot contents are
  // attacker-controlled and size the canvas, so validate BEFORE rendering
  // (an unvalidated roster was a one-request ~1.6 GB canvas allocation).
  const invalid = cardBuildError(build, type);
  if (invalid) {
    text(res, 400, invalid);
    return;
  }

  const file = `${type}.${hashKey(type, code)}.png`;
  const location = `/api/v1/img/cache/${file}`;
  if (!(await ctx.cache.has(file))) {
    try {
      await ctx.cache.put(file, await renderOnce(type, code, ctx));
    } catch (err) {
      console.error(`render ${type}.png failed:`, err);
      text(res, 500, 'render failed');
      return;
    }
  }
  res.writeHead(302, { location, 'cache-control': NO_CACHE });
  res.end();
}

// Handle a /api/v1/img/* request. API misses are honest 404s — never the SPA
// fallback (a crawler handed index.html for an image URL embeds nothing).
export async function handleImgApi(
  req: IncomingMessage,
  res: ServerResponse,
  u: URL,
  ctx: ApiContext
): Promise<void> {
  const path = u.pathname;

  if (path === '/api/v1/img/team.png' || path === '/api/v1/img/roster.png') {
    await handleDynamic(
      req,
      res,
      path.includes('team') ? 'team' : 'roster',
      u,
      ctx
    );
    return;
  }

  if (path === '/api/v1/img/manifest.json') {
    try {
      await sendRaw(res, join(ctx.distDir, 'img', 'manifest.json'), NO_CACHE);
    } catch {
      text(res, 404, 'not found');
    }
    return;
  }

  if (path.startsWith('/api/v1/img/cache/')) {
    const name = basename(path);
    if (!CACHE_FILE.test(name) || !(await ctx.cache.has(name))) {
      text(res, 404, 'not found');
      return;
    }
    await sendRaw(res, ctx.cache.pathFor(name), IMMUTABLE);
    return;
  }

  // Pre-rendered set: /api/v1/img/<rest> maps onto dist/img/<rest>. Only the
  // three published kinds are servable; all carry content hashes → immutable.
  const rest = path.slice('/api/v1/img/'.length);
  const kind = rest.split('/')[0];
  if (!['dps', 'unit', 'rank'].includes(kind)) {
    text(res, 404, 'not found');
    return;
  }
  const rel = normalize(decodeURIComponent(rest)).replace(/^(\.\.[/\\])+/, '');
  const file = join(ctx.distDir, 'img', rel);
  if (!file.startsWith(join(ctx.distDir, 'img'))) {
    text(res, 404, 'not found');
    return;
  }
  try {
    await sendRaw(res, file, IMMUTABLE);
  } catch {
    text(res, 404, 'not found');
  }
}
