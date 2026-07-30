// Static file serving over dist/ — a behavior-equivalent TypeScript port of
// scripts/serve.mjs (kept in place until the owner flips the deploy). Same
// MIME table, same per-tab OG/Twitter meta injection, same Umami injection,
// same Phase-2 cache policy (content-hashed → immutable, mutable JSON →
// no-cache), same SPA fallback. The API surface lives in api.ts; anything not
// under /api/v1/img/ comes here.
//
// The handlers are hono-shaped (Context in, Response out) since the hono
// migration (plan §6.4 trigger: POST /render shipped) — but the logic stays
// hand-rolled rather than hono's serve-static middleware, because the exact
// ETag/304/OG-injection behavior is the contract and hono's builtins don't
// reproduce it. Every behavior here is covered by
// scripts/tests/share/serve-headers.test.ts (which still runs against the
// .mjs original) AND serve-api.test.ts (which runs against this port) — keep
// the two servers' behavior in lockstep until serve.mjs is retired.
import type { Context } from 'hono';
import { readFile, stat } from 'node:fs/promises';
import { join, normalize, extname } from 'node:path';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.xml': 'application/xml; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
};

export function mimeFor(file: string): string {
  return MIME[extname(file).toLowerCase()] ?? 'application/octet-stream';
}

// ---- per-tab embed metadata -------------------------------------------------
// Crawlers (Discord/Twitter/etc.) don't run JS, so a shared link's Open Graph
// card must be baked into the HTML the server returns. We branch the OG/Twitter
// tags on the URL's `?tab=` (mirrors the client's tabFromLocation) so each tab is
// independently linkable with its own title/description.
const SITE = 'https://nikkesim.app';
const TAB_META: Record<string, { title: string; desc: string }> = {
  sim: {
    title:
      'NIKKE Solo Raid Sim — DPS Calculator, Overload Optimizer & Team Builder',
    desc: 'NIKKE solo raid damage simulator: per-unit DPS calculator, overload optimizer, best overload lines, team builder, and game mechanics reference. Frame-tick accuracy, runs in your browser.',
  },
  dpschart: {
    title:
      'NIKKE DPS Rankings — Neutral, Elemental Advantaged, with and without Supports',
    desc: 'Ranked DPS of every B3 under standardized frameworks.',
  },
  dps: {
    title: 'Unit Comparison — NIKKE Head-to-Head DPS Comparator',
    desc: 'Head-to-head per-unit DPS comparison with a custom control group. Pit any NIKKE against any other under identical conditions.',
  },
  ranks: {
    title:
      'NIKKE Support Rankings — Team Damage Buffs, Burst Gen, Burst CDR, & Sustain',
    desc: 'Ranked NIKKE support boards: team damage buffs, burst generation, burst cooldown reduction, and sustain. Computed from the same frame-tick solo raid sim as the DPS rankings.',
  },
  team: {
    title: 'NIKKE Team Generator — Best 5 Nikke Team',
    desc: 'Generate the best 5 Nikke team against a custom boss profile. Factors element, burst rotation, and overload synergy.',
  },
  roster: {
    title:
      'NIKKE Roster Generator — Best Solo Raid/Union Raid Teams from Your Units',
    desc: 'Input your NIKKE roster and generate the optimal solo raid teams. Accounts for your actual units, gear, and overload lines.',
  },
  rostersim: {
    title: 'NIKKE Roster Sim — Sim Your Solo Raid and Union Raid Teams',
    desc: 'Sim your own five solo raid teams at once and compare their damage side by side. See which roster lineup deals the most DPS.',
  },
  overload: {
    title: 'NIKKE Overload Optimizer — Best Overload Lines Calculator',
    desc: 'Find the optimal overload lines for any Nikke. The overload calculator uses frame-tick sim data to rank every roll by DPS gain.',
  },
  olsim: {
    title: 'NIKKE Overload Rolling Simulator — Module Cost Calculator',
    desc: 'Estimate the rerolls and Custom Modules needed to hit a target overload build. Plan your overload rolling budget before spending.',
  },
  doll: {
    title: 'NIKKE Doll Leveling Calculator — Efficient SR Leveling Path',
    desc: 'Calculate the most resource-efficient path to level your dolls (Favorite Items) to SR phase 15. Minimize waste, maximize stats.',
  },
  charge: {
    title: 'NIKKE Overload Breakpoints — Charge Speed & Max Ammo Tables',
    desc: 'Charge-speed frame breakpoints and max-ammo line costs for every RL and SR in NIKKE. See exactly how many overload lines each breakpoint takes.',
  },
  teambuilder: {
    title: 'NIKKE Team Builder — Visual Team Planner & Loadout Editor',
    desc: 'Build and share NIKKE solo raid, union raid, tower, and campaign teams visually. Filter the full roster, set loadouts, and copy your team into the sim or roster sim.',
  },
  resources: {
    title:
      'NIKKE Resource Calculator — Daily Custom Module & Anomaly Interception Outcome',
    desc: 'Expected daily custom module and T9 drops by stage. Supports Kraken and other Anomaly Interception bosses. Plan your daily farming.',
  },
  howto: {
    title: 'How to Use the NIKKE Solo Raid Sim — Quick Start Guide',
    desc: 'Learn how to use the NIKKE Solo Raid Sim: build a team, configure the boss, read DPS results, and optimize your overload lines.',
  },
  mechanics: {
    title:
      'NIKKE Game Mechanics Reference — Damage Formula & Other Game Mechanics',
    desc: 'Comprehensive NIKKE mechanics reference: damage formula, burst rotation, charge math, and other game mechanics — all sourced and tiered.',
  },
  dev: {
    title: 'Meet the Dev — NIKKE Solo Raid Sim',
    desc: 'About the developer behind the NIKKE Solo Raid Sim and the Maiden Discord bot.',
  },
  'patch-notes': {
    title: 'Patch Notes — NIKKE Solo Raid Sim Changelog',
    desc: 'Changelog for the NIKKE Solo Raid Sim: accuracy improvements, new unit models, mechanics updates, and bug fixes.',
  },
  'testing-requests': {
    title: 'Testing Requested — Help Improve NIKKE Sim Accuracy',
    desc: 'Units and matchups the NIKKE sim needs real recordings for. Submit your Union Shooting Range tests to help close the accuracy gap.',
  },
  'roster-sync': {
    title: 'Sync Your NIKKE Roster — Import from blablalink',
    desc: 'Import your real NIKKE roster into the sim via blablalink. Auto-fills your units, gear, and overload lines for accurate team generation.',
  },
  builder: {
    title: 'NIKKE Card Builder — Custom DPS Charts & Infographics',
    desc: 'Build a shareable NIKKE infographic: custom DPS chart, unit comparison, rank board, unit card, or overload table — with a live preview and a hosted, Discord-embeddable URL.',
  },
  credits: {
    title: 'Credits — NIKKE Solo Raid Sim',
    desc: 'The community research, datamines, and tools the NIKKE Solo Raid Sim is built on.',
  },
};

export interface StaticOptions {
  distDir: string;
  // Umami analytics (self-hosted) — injected server-side so the URL/ID can
  // change without a rebuild. Omit either to disable (e.g. dev).
  umamiUrl?: string;
  umamiWebsiteId?: string;
}

function injectUmami(html: string, opts: StaticOptions): string {
  if (!opts.umamiUrl || !opts.umamiWebsiteId) {
    return html;
  }
  const tag = `<script defer src="${opts.umamiUrl}/script.js" data-website-id="${opts.umamiWebsiteId}"></script>`;
  return html.replace('</head>', `  ${tag}\n  </head>`);
}

const escapeAttr = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

// The rankings section lives under /ranks/* (owner decision 2026-07-26):
// bare /ranks is the DPS chart, /ranks/support is Support Rankings, and
// /ranks/compare is Unit Comparison — mirrors tabFromLocation in App.tsx.
// /dpschart and /dps are legacy aliases the client canonicalizes via
// replaceState; a non-JS crawler still needs the right tab meta AND a
// canonical tag pointing at the real URL (legacyCanonical below), not itself.
function tabFromReqUrl(u: URL): string {
  const segs = u.pathname.replace(/^\/+|\/+$/g, '').split('/');
  if (segs[0] === 'ranks') {
    if (segs[1] === 'support') {
      return 'ranks';
    }
    if (segs[1] === 'compare') {
      return 'dps';
    }
    return 'dpschart';
  }
  if (segs[0] && TAB_META[segs[0]]) {
    return segs[0];
  }
  return u.searchParams.has('chart') ? 'dpschart' : 'sim';
}

const LEGACY_CANONICAL: Record<string, string> = {
  dpschart: '/ranks',
  dps: '/ranks/compare',
};

function injectMeta(html: string, reqUrl: string): string {
  const u = new URL(reqUrl || '/', SITE);
  const seg = u.pathname.replace(/^\/+|\/+$/g, '').split('/')[0];
  const m = TAB_META[tabFromReqUrl(u)];
  const canonicalPath = LEGACY_CANONICAL[seg] ?? (u.pathname || '/');
  const canonical = escapeAttr(SITE + canonicalPath);
  const title = escapeAttr(m.title);
  const desc = escapeAttr(m.desc);
  return html
    .replace(/(<title>)[^<]*(<\/title>)/, `$1${title}$2`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${desc}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${canonical}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${title}$2`)
    .replace(
      /(<meta property="og:description" content=")[^"]*(")/,
      `$1${desc}$2`
    )
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${canonical}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${title}$2`)
    .replace(
      /(<meta name="twitter:description" content=")[^"]*(")/,
      `$1${desc}$2`
    );
}

async function sendIndex(
  reqUrl: string,
  opts: StaticOptions
): Promise<Response> {
  const html = injectUmami(
    injectMeta(
      await readFile(join(opts.distDir, 'index.html'), 'utf8'),
      reqUrl
    ),
    opts
  );
  return new Response(html, {
    headers: {
      'content-type': MIME['.html'],
      'cache-control': 'no-cache',
    },
  });
}

// ---- cache policy -------------------------------------------------------------
// Versioned-by-content URLs are immutable forever; everything else must
// revalidate. The blanket `immutable` this replaces was a live bug (plan §1
// "The cache problem"): the unversioned data JSONs are regenerated every
// deploy under the SAME URL, yet were served with a year-long immutable
// cache — every browser/proxy/Discord CDN was licensed to hold a stale body.
export const IMMUTABLE = 'public, max-age=31536000, immutable';
export const NO_CACHE = 'no-cache';
// Unversioned mutable JSON — rebuilt on every deploy at a fixed URL. The
// manifest is mutable BY DESIGN: it is the only mutable URL in the image set,
// and everything it points at is content-hashed/immutable (plan §2).
const MUTABLE_PATHS = new Set([
  '/dpschart.json',
  '/burstgen.json',
  '/burstcdr.json',
  '/sustain.json',
  '/bufferchart.json',
  '/ol-default.json',
  '/img/manifest.json',
]);
// Content-hashed URL patterns: vite bundles (assets/<name>-<hash8>.<ext>),
// build-infographics images (img/<key>.<hash8-hex>.<png|webp>), self-hosted fonts
// (license-stable Roboto subsets — versioned by build, effectively immutable).
//
// BOTH extensions matter: unit cards emit .webp (img/unit/<slug>.<variant>.<hash>.webp), every
// other card emits .png. The hash segment is what makes a URL immutable, not the extension — but
// this matcher is extension-anchored, so a third format would silently fall through to no-cache
// and revalidate on every Discord/browser hit. Add it here and to serve-headers.test.ts together.
// Unversioned art keeps no-cache by construction: /img/portraits/liter-128.webp has no hash
// segment, so it cannot match.
const VITE_HASHED = /^\/assets\/.+-[A-Za-z0-9_-]{8}\.[^/]+$/;
const IMG_HASHED = /^\/img\/.+\.[0-9a-f]{8}\.(png|webp)$/;
const FONT_FILE = /\.woff2?$/;
export function cacheControlFor(path: string): string {
  if (path.endsWith('index.html') || MUTABLE_PATHS.has(path)) {
    return NO_CACHE;
  }
  if (VITE_HASHED.test(path) || IMG_HASHED.test(path) || FONT_FILE.test(path)) {
    return IMMUTABLE;
  }
  // static-but-mutable (portraits, icons, unversioned art): revalidate
  return NO_CACHE;
}

// Weak ETag (size + mtime) so `no-cache` assets — the 384 portrait webps above
// all — revalidate to a cheap 304 instead of re-downloading in full on every
// page load. The Phase-2 cache-class fix made no-cache the default for
// unversioned art; without a validator that is a full ~5.7 MB refetch where
// the portraits were previously cached for a year. (Mirror of serve.mjs —
// keep in lockstep.)
function etagFor(s: { size: number; mtimeMs: number }): string {
  return `W/"${s.size}-${Math.floor(s.mtimeMs)}"`;
}

export async function sendFile(
  file: string,
  urlPath: string,
  status = 200,
  ifNoneMatch?: string,
  ifModifiedSince?: string
): Promise<Response> {
  const s = await stat(file);
  const etag = etagFor(s);
  const cacheControl = cacheControlFor(urlPath);
  // RFC 7232: If-None-Match (incl. `*`) wins; If-Modified-Since applies only
  // when If-None-Match is absent, at HTTP-date (second) granularity. (Multiple
  // If-None-Match headers arrive comma-joined on a fetch Request, which is the
  // same list syntax the header itself uses.)
  const inm = ifNoneMatch?.split(',').map((v) => v.trim());
  const notModified = inm
    ? inm.includes(etag) || inm.includes('*')
    : !!ifModifiedSince &&
      Date.parse(ifModifiedSince) >= Math.floor(s.mtimeMs / 1000) * 1000;
  if (notModified) {
    // last-modified rides the 304 so an IMS-driven client can re-anchor its
    // next conditional request
    return new Response(null, {
      status: 304,
      headers: {
        etag,
        'cache-control': cacheControl,
        'last-modified': s.mtime.toUTCString(),
      },
    });
  }
  const body = await readFile(file);
  return new Response(body, {
    status,
    headers: {
      'content-type': mimeFor(file),
      'cache-control': cacheControl,
      etag,
      'last-modified': s.mtime.toUTCString(),
    },
  });
}

// Serve a non-API request: dist/ static, index.html for directories and the
// SPA fallback, per-tab meta injected into every index.html send.
export async function handleStatic(
  c: Context,
  opts: StaticOptions
): Promise<Response> {
  // path + query, the same shape node:http's req.url carried (injectMeta
  // anchors it against SITE and bakes it into the canonical/og:url tags).
  const u = new URL(c.req.url);
  const reqUrl = u.pathname + u.search;
  try {
    const url = decodeURIComponent(u.pathname);
    // block path traversal, then resolve within dist/
    const rel = normalize(url).replace(/^(\.\.[/\\])+/, '');
    let file = join(opts.distDir, rel);
    if (!file.startsWith(opts.distDir)) {
      file = join(opts.distDir, 'index.html');
    }

    try {
      const s = await stat(file);
      if (s.isDirectory()) {
        file = join(file, 'index.html');
      }
    } catch {
      file = join(opts.distDir, 'index.html'); // SPA fallback
    }
    // index.html carries per-tab embed metadata injected per request; everything
    // else is a static asset served as-is.
    if (file.endsWith('index.html')) {
      return await sendIndex(reqUrl, opts);
    }
    return await sendFile(
      file,
      rel,
      200,
      c.req.header('if-none-match'),
      c.req.header('if-modified-since')
    );
  } catch {
    // last-resort fallback
    try {
      return await sendIndex(reqUrl, opts);
    } catch {
      return new Response('server error', { status: 500 });
    }
  }
}
