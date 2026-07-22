// Minimal zero-dependency static file server for the built site (dist/).
// Used as the Railway start command. Binds to $PORT (Railway provides it) on
// 0.0.0.0. Serves dist/, falling back to index.html so the SPA always loads.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, normalize, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = fileURLToPath(new URL('../dist', import.meta.url));
const PORT = Number(process.env.PORT) || 4173;

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
    title: 'Custom DPS Rankings — NIKKE Head-to-Head Unit Comparator',
    desc: 'Head-to-head per-unit DPS comparison with a custom framework. Pit any NIKKE against any other under identical conditions.',
  },
  team: {
    title: 'NIKKE Optimal Team Generator — Best 5-Nikke Team Builder',
    desc: 'Generate the best 5-Nikke solo-raid team against a custom boss profile. Factors element, burst rotation, and overload synergy.',
  },
  roster: {
    title: 'NIKKE Solo-Raid Roster Generator — Best Team from Your Units',
    desc: 'Input your NIKKE roster and generate the optimal solo-raid team. Accounts for your actual units, gear, and overload lines.',
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
    title: 'NIKKE Charge Speed Breakpoints — RL & SR Frame Table',
    desc: 'Charge-speed frame breakpoints for every RL and SR in NIKKE. See exactly how much charge speed you need to hit each frame threshold.',
  },
  teambuilder: {
    title: 'NIKKE Team Builder — Visual Team Planner & Loadout Editor',
    desc: 'Build and share NIKKE solo-raid teams visually. Set loadouts, tweak overload lines, and share your team composition with a link.',
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
  if (!UMAMI_URL || !UMAMI_WEBSITE_ID) return html;
  const tag = `<script defer src="${UMAMI_URL}/script.js" data-website-id="${UMAMI_WEBSITE_ID}"></script>`;
  return html.replace('</head>', `  ${tag}\n  </head>`);
}

const escapeAttr = (s) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

function tabFromReqUrl(u) {
  const seg = u.pathname.replace(/^\/+|\/+$/g, '').split('/')[0];
  if (seg && TAB_META[seg]) return seg;
  return u.searchParams.has('chart') ? 'dpschart' : 'sim';
}

function injectMeta(html, reqUrl) {
  const u = new URL(reqUrl || '/', SITE);
  const m = TAB_META[tabFromReqUrl(u)];
  const canonical = escapeAttr(SITE + (reqUrl || '/'));
  const title = escapeAttr(m.title);
  const desc = escapeAttr(m.desc);
  return html
    .replace(/(<title>)[^<]*(<\/title>)/, `$1${title}$2`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${desc}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${canonical}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${title}$2`)
    .replace(
      /(<meta property="og:description" content=")[^"]*(")/,
      `$1${desc}$2`,
    )
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${canonical}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${title}$2`)
    .replace(
      /(<meta name="twitter:description" content=")[^"]*(")/,
      `$1${desc}$2`,
    );
}

async function sendIndex(res, reqUrl) {
  const html = injectUmami(
    injectMeta(await readFile(join(DIST, 'index.html'), 'utf8'), reqUrl),
  );
  res.writeHead(200, {
    'content-type': MIME['.html'],
    'cache-control': 'no-cache',
  });
  res.end(html);
}

async function send(res, file, status = 200) {
  const body = await readFile(file);
  const type = MIME[extname(file).toLowerCase()] ?? 'application/octet-stream';
  // hashed assets are immutable; index.html must always revalidate
  const cache = file.endsWith('index.html')
    ? 'no-cache'
    : 'public, max-age=31536000, immutable';
  res.writeHead(status, { 'content-type': type, 'cache-control': cache });
  res.end(body);
}

const server = createServer(async (req, res) => {
  try {
    const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
    // block path traversal, then resolve within dist/
    const rel = normalize(url).replace(/^(\.\.[/\\])+/, '');
    let file = join(DIST, rel);
    if (!file.startsWith(DIST)) file = join(DIST, 'index.html');

    try {
      const s = await stat(file);
      if (s.isDirectory()) file = join(file, 'index.html');
    } catch {
      file = join(DIST, 'index.html'); // SPA fallback
    }
    // index.html carries per-tab embed metadata injected per request; everything
    // else is a static asset served as-is.
    if (file.endsWith('index.html')) {
      await sendIndex(res, req.url ?? '/');
      return;
    }
    await send(res, file);
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
  console.log(`nikke-sim serving ${DIST} on 0.0.0.0:${PORT}`);
});
