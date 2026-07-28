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
//   GET /api/v1/img/dps.png?cell&element&unit|units → 302 to .../dps.<hash>.png
//   GET /api/v1/img/table/max-ammo.png?unit=<slug>     → 302 to .../table.<hash>.png
//   GET /api/v1/img/table/charge-speed.png[?unit=<slug>] → 302 to .../table.<hash>.png
//   POST /api/v1/img/render                  → 200 {"url":"/api/v1/img/cache/<file>"}
//
// Every dynamic route (GET or POST) funnels through the SAME pipe: query
// params / JSON body → parseRenderSpec → specCacheKey → resolveRender →
// ensureCached (src/infographics/spec.ts is the single contract, so the entry
// points can never drift). Every image URL the API hands out is
// content-addressed, so the 302s and the cached files are safe for Discord's
// hard URL-keyed CDN caching (plan §2). The 302 responses themselves are
// no-cache: the hash embeds RENDERER_VERSION, so a renderer change must be
// free to point the same build code at a new file.
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
import {
  parseRenderSpec,
  specCacheKey,
  specCacheType,
  type RenderSpec,
  type RenderSpecData,
} from '../infographics/spec.js';
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
// one constant to true — it gates every dynamic route, POST /render included.
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

// sha256 of the spec cache key — the hash in `<type>.<hash16>.png`.
const hashKey = (key: string): string =>
  createHash('sha256').update(key).digest('hex').slice(0, 16);

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

// ---- dpschart.json -------------------------------------------------------------

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

// ---- the shared render pipeline -------------------------------------------------

interface Resolved {
  file: string;
  render: () => Promise<Buffer>;
}
interface ResolveFailure {
  error: string;
  status: number;
}

// A validated spec → its cache filename + render closure, or the 4xx the
// request deserves. Semantic checks that the spec parser can't do alone live
// here: cardBuildError (canvas-size safety), the dps population filter, and
// the per-unit ammo/charge metadata checks.
async function resolveRender(
  spec: RenderSpec,
  ctx: ApiContext,
  art: DpsArtifact | null
): Promise<Resolved | ResolveFailure> {
  const file = `${specCacheType(spec)}.${hashKey(specCacheKey(spec))}.png`;
  switch (spec.kind) {
    case 'team':
    case 'roster': {
      // parseRenderSpec already decoded this code once — decodeBuild is pure.
      const build = decodeBuild(spec.build);
      if (!build) {
        return { error: 'invalid build code', status: 400 };
      }
      // decodeBuild checks only the envelope — the roster/slot contents are
      // attacker-controlled and size the canvas, so validate BEFORE rendering
      // (an unvalidated roster was a one-request ~1.6 GB canvas allocation).
      const invalid = cardBuildError(build, spec.kind);
      if (invalid) {
        return { error: invalid, status: 400 };
      }
      return {
        file,
        render: () =>
          spec.kind === 'team'
            ? renderTeamCardPng(build, ctx.chars, ctx.icon)
            : renderRosterCardPng(build, ctx.chars, ctx.icon),
      };
    }
    case 'dps': {
      // resolveSpec 404s before this when the artifact is missing.
      const built = dpsChartData(
        art as DpsArtifact,
        {
          cell: spec.cell,
          element: spec.element ?? null,
          unit: spec.unit ?? null,
          units: spec.units ?? null,
        },
        ctx.icon
      );
      if ('error' in built) {
        return { error: built.error, status: 400 };
      }
      return { file, render: () => renderDpsChartPng(built.data) };
    }
    case 'table': {
      let data: TableCardData;
      if (spec.table === 'max-ammo') {
        const ch = ctx.chars[spec.unit];
        if (!ch) {
          return { error: `unknown unit '${spec.unit}'`, status: 400 };
        }
        const base = ch.ammo;
        if (!base || base <= 0) {
          return { error: `${ch.name} has no ammo data`, status: 400 };
        }
        data = buildAmmoTable(base, ch.name);
      } else if (spec.unit) {
        const ch = ctx.chars[spec.unit];
        if (!ch) {
          return { error: `unknown unit '${spec.unit}'`, status: 400 };
        }
        // Charge weapons only (SR/RL). characters.json carries the charge
        // directly in frames (= round(charge_time/100*60), the bot's formula).
        const baseFrames = ch.chargeFrames ?? 0;
        if (baseFrames <= 0 || (ch.weapon !== 'SR' && ch.weapon !== 'RL')) {
          return {
            error:
              ch.weapon === 'SR' || ch.weapon === 'RL'
                ? `${ch.name} has no charge data`
                : `${ch.name} (${ch.weapon}) is not a charge weapon`,
            status: 400,
          };
        }
        data = buildChargeTable(baseFrames, ch.name);
      } else {
        data = buildChargeTable(GENERIC_BASE_FRAMES, 'Generic (1.0s)');
      }
      data.icon = ctx.icon ?? undefined;
      if (spec.unit) {
        data.portrait = (await loadPortrait(spec.unit)) ?? undefined;
      }
      return { file, render: () => Promise.resolve(renderTableCardPng(data)) };
    }
  }
}

// The ONE request pipeline every dynamic route shares: request-shaped input
// (GET query params mapped to an object, or the POST body verbatim) →
// parseRenderSpec (with the data it needs for existence checks) →
// resolveRender. GET wraps the result in a 302, POST in JSON — the cache
// file/render can never differ between them.
async function resolveSpec(
  input: unknown,
  ctx: ApiContext
): Promise<Resolved | ResolveFailure> {
  const kind =
    input && typeof input === 'object'
      ? (input as Record<string, unknown>).kind
      : undefined;
  // Load the existence-check data BEFORE parsing, so unknown cells/units
  // 400 identically from GET and POST. The dps artifact miss stays a 404
  // (a server-side gap, not a request error) ahead of param validation.
  let data: RenderSpecData | undefined;
  let art: DpsArtifact | null = null;
  if (kind === 'dps') {
    art = await loadDpsChart(ctx);
    if (!art) {
      return { error: 'dps chart data unavailable', status: 404 };
    }
    data = { cells: Object.keys(art.cells), units: Object.keys(art.units) };
  } else if (kind === 'table') {
    data = { units: Object.keys(ctx.chars) };
  }
  const parsed = parseRenderSpec(input, data);
  if (!parsed.ok) {
    return { error: parsed.error, status: 400 };
  }
  return resolveRender(parsed.spec, ctx, art);
}

function handleDynamicGet(
  input: (c: Context) => unknown,
  ctx: ApiContext
): (c: Context) => Promise<Response> {
  return async (c) => {
    if (!secretOk(c.req.raw, ctx)) {
      return text(401, 'missing or invalid x-render-secret');
    }
    const r = await resolveSpec(input(c), ctx);
    if ('error' in r) {
      return text(r.status, r.error);
    }
    return renderAndRedirect(ctx, r.file, r.render);
  };
}

// ---- POST /render ---------------------------------------------------------------

// Hard body cap (plan §6.4: skipping the cap is a DoS — a RenderSpec is a few
// hundred bytes; the biggest legit one, a union-roster build code, is ~2 KB).
const RENDER_BODY_MAX_BYTES = 16 * 1024;

// Read a JSON body with a byte ceiling — content-length is checked first but
// is attacker-controlled, so the stream itself is capped too (a lying header
// must not land an unbounded body in memory).
async function readBodyCapped(
  req: Request,
  maxBytes: number
): Promise<string | null> {
  const stream = req.body;
  if (!stream) {
    return '';
  }
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}

// POST /api/v1/img/render — the RenderSpec JSON contract (plan §2). Same
// parse → resolve → single-flight → RenderCache path as the GETs (resolveSpec
// IS the GET path), but answers 200 JSON instead of a 302: POST clients want
// the URL, not a redirect. Rate limiting stays at CLOUDFLARE (see the
// REQUIRE_RENDER_SECRET comment) — this process never rate-limits; when the
// secret is enabled it gates this route like every other dynamic one.
async function handleRenderPost(
  c: Context,
  ctx: ApiContext
): Promise<Response> {
  if (!secretOk(c.req.raw, ctx)) {
    return c.json({ error: 'missing or invalid x-render-secret' }, 401);
  }
  const contentType = (c.req.header('content-type') ?? '')
    .split(';')[0]
    .trim()
    .toLowerCase();
  if (contentType !== 'application/json') {
    return c.json({ error: 'content-type must be application/json' }, 415);
  }
  const declared = Number(c.req.header('content-length') ?? 0);
  if (declared > RENDER_BODY_MAX_BYTES) {
    return c.json({ error: 'request body too large' }, 413);
  }
  const body = await readBodyCapped(c.req.raw, RENDER_BODY_MAX_BYTES);
  if (body === null) {
    return c.json({ error: 'request body too large' }, 413);
  }
  let input: unknown;
  try {
    input = JSON.parse(body);
  } catch {
    return c.json({ error: 'invalid JSON body' }, 400);
  }
  const r = await resolveSpec(input, ctx);
  if ('error' in r) {
    return c.json({ error: r.error }, r.status as 400 | 404);
  }
  if (!(await ensureCached(ctx, r.file, r.render))) {
    return c.json({ error: 'render failed' }, 500);
  }
  return c.json({ url: `${API_PREFIX}cache/${r.file}` }, 200);
}

// Register every /api/v1/img/* route on the hono app. Static routes (exact
// paths) outrank the trailing wildcard in hono's router, so registration
// order here is readability, not correctness.
export function registerImgApi(app: Hono, ctx: ApiContext): void {
  app.get(
    '/api/v1/img/team.png',
    handleDynamicGet((c) => ({ kind: 'team', build: c.req.query('b') }), ctx)
  );
  app.get(
    '/api/v1/img/roster.png',
    handleDynamicGet((c) => ({ kind: 'roster', build: c.req.query('b') }), ctx)
  );
  app.get(
    '/api/v1/img/dps.png',
    handleDynamicGet(
      (c) => ({
        kind: 'dps',
        cell: c.req.query('cell'),
        element: c.req.query('element'),
        unit: c.req.query('unit'),
        // comparison variant: ?units=a,b,c (comma-separated) — mutually
        // exclusive with `unit` (parseRenderSpec 400s on both)
        units: c.req.query('units')?.split(','),
      }),
      ctx
    )
  );
  app.get(
    '/api/v1/img/table/max-ammo.png',
    handleDynamicGet(
      (c) => ({ kind: 'table', table: 'max-ammo', unit: c.req.query('unit') }),
      ctx
    )
  );
  app.get(
    '/api/v1/img/table/charge-speed.png',
    handleDynamicGet(
      (c) => ({
        kind: 'table',
        table: 'charge-speed',
        unit: c.req.query('unit'),
      }),
      ctx
    )
  );

  // The JSON-spec entry point — same renders as the GETs above, 200 + {url}.
  app.post('/api/v1/img/render', (c) => handleRenderPost(c, ctx));

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
