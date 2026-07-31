// Minimal zero-dependency static file server for the built site (dist/).
// Used as the Railway start command. Binds to $PORT (Railway provides it) on
// 0.0.0.0. Serves dist/, falling back to index.html so the SPA always loads.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, normalize, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST =
  process.env.SERVE_DIST ?? fileURLToPath(new URL('../dist', import.meta.url));
// Railway provides $PORT. '0' (ephemeral) is honored — the startup log prints
// the actual bound port (used by the header test).
const PORT = process.env.PORT ? Number(process.env.PORT) : 4173;

const MIME = {
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

// ---- per-tab embed metadata -------------------------------------------------
// Crawlers (Discord/Twitter/etc.) don't run JS, so a shared link's Open Graph
// card must be baked into the HTML the server returns. We branch the OG/Twitter
// tags on the URL's `?tab=` (mirrors the client's tabFromLocation) so each tab is
// independently linkable with its own title/description.
const SITE = 'https://nikkesim.app';
const TAB_META = {
  sim: {
    title:
      'NIKKE Solo Raid Sim — DPS Calculator, Overload Optimizer & Team Builder',
    desc: 'NIKKE solo-raid damage simulator: per-unit DPS calculator, overload optimizer, best overload lines, team builder, and game mechanics reference. Frame-tick accuracy, runs in your browser.',
  },
  dpschart: {
    title: 'NIKKE DPS Rankings — Best Units & Overload Lines Tier List',
    desc: 'Ranked DPS of every NIKKE B3 carry under standardized solo-raid frameworks. Compare units, see best overload lines, and find your best carries.',
  },
  dps: {
    title: 'Unit Comparison — NIKKE Head-to-Head DPS Comparator',
    desc: 'Head-to-head per-unit DPS comparison with a custom control group. Pit any NIKKE against any other under identical conditions.',
  },
  ranks: {
    title:
      'NIKKE Support Rankings — Burst Gen, Burst CDR, Sustain & Team Buffs Boards',
    desc: 'Ranked NIKKE support boards: burst generation, burst cooldown reduction, sustain (team HP), and buffer value — precomputed from the same frame-tick solo-raid sim as the DPS rankings.',
  },
  team: {
    title: 'NIKKE Team Generator — Best 5-Unit Solo Raid Team',
    desc: 'Generate the best 5-Nikke solo-raid team against a custom boss profile. Factors element, burst rotation, and overload synergy.',
  },
  roster: {
    title: 'NIKKE Roster Generator — Best Solo-Raid Teams from Your Units',
    desc: 'Input your NIKKE roster and generate the optimal solo-raid teams. Accounts for your actual units, gear, and overload lines.',
  },
  rostersim: {
    title: 'NIKKE Roster Sim — Compare All Your Solo-Raid Teams',
    desc: 'Sim your own five solo-raid teams at once and compare their damage side by side. See which roster lineup deals the most DPS.',
  },
  overload: {
    title: 'NIKKE Overload Optimizer — Best Overload Lines Calculator',
    desc: 'Find the optimal 3rd overload line for every NIKKE B3. The overload calculator uses frame-tick sim data to rank every roll by DPS gain.',
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
    desc: 'Build and share NIKKE solo-raid teams visually. Filter the full roster, set loadouts, and copy your team into the sim or roster sim.',
  },
  resources: {
    title: 'NIKKE Resource Calculator — Daily Custom Module & Fragment Income',
    desc: 'Expected daily solo-raid resource drops by stage: overload custom modules, module fragments, locks, and XP fodder. Plan your daily farming.',
  },
  howto: {
    title: 'How to Use the NIKKE Solo Raid Sim — Quick Start Guide',
    desc: 'Learn how to use the NIKKE Solo Raid Sim: build a team, configure the boss, read DPS results, and optimize your overload lines.',
  },
  mechanics: {
    title: 'NIKKE Game Mechanics Reference — Damage Formula & Solo Raid Guide',
    desc: 'Comprehensive NIKKE mechanics reference: damage formula, burst rotation, charge math, and solo-raid mechanics — all sourced and tiered.',
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
    title: 'NIKKE Card Builder — Custom DPS Charts & Share Images',
    desc: 'Build a shareable NIKKE infographic: custom DPS chart, unit comparison, rank board, unit card, or overload table — with a live preview and a hosted, Discord-embeddable URL.',
  },
  credits: {
    title: 'Credits — NIKKE Solo Raid Sim',
    desc: 'The community research, datamines, and tools the NIKKE Solo Raid Sim is built on.',
  },
};

// ---- analytics (Umami, self-hosted) -----------------------------------------
// Injected server-side so the URL/ID can change without a rebuild.
// Set UMAMI_URL + UMAMI_WEBSITE_ID in Railway; omit to disable (e.g. dev).
const UMAMI_URL = process.env.UMAMI_URL;
const UMAMI_WEBSITE_ID = process.env.UMAMI_WEBSITE_ID;

function injectUmami(html) {
  if (!UMAMI_URL || !UMAMI_WEBSITE_ID) {
    return html;
  }
  const tag = `<script defer src="${UMAMI_URL}/script.js" data-website-id="${UMAMI_WEBSITE_ID}"></script>`;
  return html.replace('</head>', `  ${tag}\n  </head>`);
}

const escapeAttr = (s) =>
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
function tabFromReqUrl(u) {
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

const LEGACY_CANONICAL = {
  dpschart: '/ranks',
  dps: '/ranks/compare',
};

function injectMeta(html, reqUrl) {
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

async function sendIndex(res, reqUrl) {
  const html = injectUmami(
    injectMeta(await readFile(join(DIST, 'index.html'), 'utf8'), reqUrl)
  );
  res.writeHead(200, {
    'content-type': MIME['.html'],
    'cache-control': 'no-cache',
  });
  res.end(html);
}

// ---- cache policy -------------------------------------------------------------
// Versioned-by-content URLs are immutable forever; everything else must
// revalidate. The blanket `immutable` this replaces was a live bug (plan §1
// "The cache problem"): the unversioned data JSONs are regenerated every
// deploy under the SAME URL, yet were served with a year-long immutable
// cache — every browser/proxy/Discord CDN was licensed to hold a stale body.
const IMMUTABLE = 'public, max-age=31536000, immutable';
const NO_CACHE = 'no-cache';
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
// KEEP IN SYNC WITH src/server/static.ts — this file is the `npm start` static
// server and that one is the API server; they carry the same table on purpose
// (no shared import: this is plain .mjs, deliberately dependency-free) and
// serve-headers.test.ts spawns THIS one. Both extensions matter: unit cards emit
// .webp, every other card .png. Unversioned art keeps no-cache by construction —
// /img/portraits/liter-128.webp has no hash segment, so it cannot match.
const VITE_HASHED = /^\/assets\/.+-[A-Za-z0-9_-]{8}\.[^/]+$/;
const IMG_HASHED = /^\/img\/.+\.[0-9a-f]{8}\.(png|webp)$/;
const FONT_FILE = /\.woff2?$/;
function cacheControlFor(path) {
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
// the portraits were previously cached for a year.
function etagFor(s) {
  return `W/"${s.size}-${Math.floor(s.mtimeMs)}"`;
}

async function send(
  res,
  file,
  urlPath,
  status = 200,
  ifNoneMatch,
  ifModifiedSince
) {
  const s = await stat(file);
  const etag = etagFor(s);
  const cacheControl = cacheControlFor(urlPath);
  // RFC 7232: If-None-Match (incl. `*`) wins; If-Modified-Since applies only
  // when If-None-Match is absent, at HTTP-date (second) granularity.
  const inm =
    ifNoneMatch &&
    String(ifNoneMatch)
      .split(',')
      .map((v) => v.trim());
  const notModified = inm
    ? inm.includes(etag) || inm.includes('*')
    : !!ifModifiedSince &&
      Date.parse(ifModifiedSince) >= Math.floor(s.mtimeMs / 1000) * 1000;
  if (notModified) {
    // last-modified rides the 304 so an IMS-driven client can re-anchor its
    // next conditional request
    res.writeHead(304, {
      etag,
      'cache-control': cacheControl,
      'last-modified': s.mtime.toUTCString(),
    });
    res.end();
    return;
  }
  const body = await readFile(file);
  const type = MIME[extname(file).toLowerCase()] ?? 'application/octet-stream';
  res.writeHead(status, {
    'content-type': type,
    'cache-control': cacheControl,
    etag,
    'last-modified': s.mtime.toUTCString(),
  });
  res.end(body);
}

const server = createServer(async (req, res) => {
  try {
    const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
    // block path traversal, then resolve within dist/
    const rel = normalize(url).replace(/^(\.\.[/\\])+/, '');
    let file = join(DIST, rel);
    if (!file.startsWith(DIST)) {
      file = join(DIST, 'index.html');
    }

    try {
      const s = await stat(file);
      if (s.isDirectory()) {
        file = join(file, 'index.html');
      }
    } catch {
      file = join(DIST, 'index.html'); // SPA fallback
    }
    // index.html carries per-tab embed metadata injected per request; everything
    // else is a static asset served as-is.
    if (file.endsWith('index.html')) {
      await sendIndex(res, req.url ?? '/');
      return;
    }
    await send(
      res,
      file,
      rel,
      200,
      req.headers['if-none-match'],
      req.headers['if-modified-since']
    );
  } catch {
    // last-resort fallback
    try {
      await sendIndex(res, req.url ?? '/');
    } catch {
      res.writeHead(500).end('server error');
    }
  }
});

server.listen(PORT, '0.0.0.0', () => {
  const bound = server.address();
  console.log(
    `nikke-sim serving ${DIST} on 0.0.0.0:${bound ? bound.port : PORT}`
  );
});
