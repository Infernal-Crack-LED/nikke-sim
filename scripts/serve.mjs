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
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
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
const BASE_DESC =
  'Solo-raid Simulator for NIKKE: Goddess of Victory — frame-tick damage prediction, per unit, for any 5-Nikke team.';
const TAB_META = {
  sim: { title: 'NIKKE Solo Raid Sim', desc: BASE_DESC },
  dpschart: {
    title: 'DPS Rankings — NIKKE Solo Raid Sim',
    desc: 'Ranked DPS of the top B3 carries under standardized control frameworks, 180s.',
  },
  dps: { title: 'Custom DPS Rankings — NIKKE Solo Raid Sim', desc: `Head-to-head per-unit DPS on a scope-lock basis. ${BASE_DESC}` },
  team: { title: 'Optimal Team — NIKKE Solo Raid Sim', desc: `Full per-unit damage breakdown for a 5-Nikke team. ${BASE_DESC}` },
  roster: { title: 'Solo-Raid Roster Generator — NIKKE Solo Raid Sim', desc: `Rank your roster by simulated solo-raid damage. ${BASE_DESC}` },
  overload: { title: 'Optimize Overload — NIKKE Solo Raid Sim', desc: `Rank a carry’s four free Overload lines by simulated damage on an 8/12 basis. ${BASE_DESC}` },
  charge: { title: 'Charge Speed Breakpoints — NIKKE Solo Raid Sim', desc: `Charge-speed frame breakpoints for any RL/SR carry. ${BASE_DESC}` },
  // top-level pages (path-routed, so independently linkable + embeddable)
  howto: { title: 'How to — NIKKE Solo Raid Sim', desc: 'How to use the NIKKE Solo Raid Sim: build a team, set the boss, and read the results.' },
  mechanics: { title: 'Game Mechanics — NIKKE Solo Raid Sim', desc: 'The damage mechanics the sim models, with sources and evidence tiers.' },
  dev: { title: 'Meet the Dev — NIKKE Solo Raid Sim', desc: `About the NIKKE Solo Raid Sim and its developer. ${BASE_DESC}` },
  'patch-notes': { title: 'Patch Notes — NIKKE Solo Raid Sim', desc: 'Changelog for the NIKKE Solo Raid Sim — engine, override, and mechanics updates.' },
  'testing-requests': { title: 'Testing Requested — NIKKE Solo Raid Sim', desc: 'Units and matchups the sim needs real recordings for — help improve accuracy.' },
};

const escapeAttr = (s) =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

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
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${title}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${desc}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${canonical}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${title}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${desc}$2`);
}

async function sendIndex(res, reqUrl) {
  const html = injectMeta(await readFile(join(DIST, 'index.html'), 'utf8'), reqUrl);
  res.writeHead(200, { 'content-type': MIME['.html'], 'cache-control': 'no-cache' });
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
