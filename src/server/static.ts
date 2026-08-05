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
import { existsSync, readFileSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { join, normalize, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

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
  '.txt': 'text/plain; charset=utf-8',
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
interface TabMeta {
  title: string;
  desc: string;
  // Short breadcrumb label; falls back to title when absent.
  label?: string;
  // Optional build-infographics manifest key (e.g. 'unit/<slug>.discord') for
  // a tab-specific OG/Twitter image — resolved at request time since the
  // served file name is content-hashed. Omitted tabs keep index.html's
  // generic og:image.
  image?: string;
}
let TAB_META: Record<string, TabMeta> = {
  sim: {
    title:
      'NIKKE Solo Raid Sim — DPS Calculator, Overload Optimizer & Team Builder',
    label: 'Sim',
    desc: 'NIKKE solo raid damage simulator: per-unit DPS calculator, overload optimizer, best overload lines, team builder, and game mechanics reference. Frame-tick accuracy, runs in your browser.',
  },
  dpschart: {
    title:
      'NIKKE DPS Rankings — Neutral, Elemental Advantaged, with and without Supports',
    label: 'DPS Rankings',
    desc: 'Ranked DPS of every B3 under standardized frameworks.',
  },
  dps: {
    title: 'Unit Comparison — NIKKE Head-to-Head DPS Comparator',
    label: 'Unit Comparison',
    desc: 'Head-to-head per-unit DPS comparison with a custom control group. Pit any NIKKE against any other under identical conditions.',
  },
  ranks: {
    title:
      'NIKKE Support Rankings — Team Damage Buffs, Burst Gen, Burst CDR, & Sustain',
    label: 'Support Rankings',
    desc: 'Ranked NIKKE support boards: team damage buffs, burst generation, burst cooldown reduction, and sustain. Computed from the same frame-tick solo raid sim as the DPS rankings.',
  },
  team: {
    title: 'NIKKE Team Generator — Best 5 Nikke Team',
    label: 'Team Generator',
    desc: 'Generate the best 5 Nikke team against a custom boss profile. Factors element, burst rotation, and overload synergy.',
  },
  roster: {
    title:
      'NIKKE Roster Generator — Best Solo Raid/Union Raid Teams from Your Units',
    label: 'Roster Generator',
    desc: 'Input your NIKKE roster and generate the optimal solo raid teams. Accounts for your actual units, gear, and overload lines.',
  },
  rostersim: {
    title: 'NIKKE Roster Sim — Sim Your Solo Raid and Union Raid Teams',
    label: 'Roster Sim',
    desc: 'Sim your own five solo raid teams at once and compare their damage side by side. See which roster lineup deals the most DPS.',
  },
  overload: {
    title: 'NIKKE Overload Optimizer — Best Overload Lines Calculator',
    label: 'Overload Optimizer',
    desc: 'Find the optimal overload lines for any Nikke. The overload calculator uses frame-tick sim data to rank every roll by DPS gain.',
  },
  olsim: {
    title: 'NIKKE Overload Rolling Simulator — Module Cost Calculator',
    label: 'Overload Simulator',
    desc: 'Estimate the rerolls and Custom Modules needed to hit a target overload build. Plan your overload rolling budget before spending.',
  },
  doll: {
    title: 'NIKKE Doll Leveling Calculator — Efficient SR Leveling Path',
    label: 'Doll Calculator',
    desc: 'Calculate the most resource-efficient path to level your dolls (Favorite Items) to SR phase 15. Minimize waste, maximize stats.',
  },
  charge: {
    title: 'NIKKE Overload Breakpoints — Charge Speed & Max Ammo Tables',
    label: 'Charge Breakpoints',
    desc: 'Charge-speed frame breakpoints and max-ammo line costs for every RL and SR in NIKKE. See exactly how many overload lines each breakpoint takes.',
  },
  teambuilder: {
    title: 'NIKKE Team Builder — Visual Team Planner & Loadout Editor',
    label: 'Team Builder',
    desc: 'Build and share NIKKE solo raid, union raid, tower, and campaign teams visually. Filter the full roster, set loadouts, and copy your team into the sim or roster sim.',
  },
  resources: {
    title:
      'NIKKE Resource Calculator — Daily Custom Module & Anomaly Interception Outcome',
    label: 'Resource Calculator',
    desc: 'Expected daily custom module and T9 drops by stage. Supports Kraken and other Anomaly Interception bosses. Plan your daily farming.',
  },
  howto: {
    title: 'How to Use the NIKKE Solo Raid Sim — Quick Start Guide',
    label: 'How To',
    desc: 'Learn how to use the NIKKE Solo Raid Sim: build a team, configure the boss, read DPS results, and optimize your overload lines.',
  },
  mechanics: {
    title:
      'NIKKE Game Mechanics Reference — Damage Formula & Other Game Mechanics',
    label: 'Mechanics',
    desc: 'Comprehensive NIKKE mechanics reference: damage formula, burst rotation, charge math, and other game mechanics — all sourced and tiered.',
  },
  dev: {
    title: 'Meet the Dev — NIKKE Solo Raid Sim',
    label: 'Dev',
    desc: 'About the developer behind the NIKKE Solo Raid Sim and the Maiden Discord bot.',
  },
  'patch-notes': {
    title: 'Patch Notes — NIKKE Solo Raid Sim Changelog',
    label: 'Patch Notes',
    desc: 'Changelog for the NIKKE Solo Raid Sim: accuracy improvements, new unit models, mechanics updates, and bug fixes.',
  },
  'testing-requests': {
    title: 'Testing Requested — Help Improve NIKKE Sim Accuracy',
    label: 'Testing Requests',
    desc: 'Units and matchups the NIKKE sim needs real recordings for. Submit your Union Shooting Range tests to help close the accuracy gap.',
  },
  'roster-sync': {
    title: 'Sync Your NIKKE Roster — Import from blablalink',
    label: 'Roster Sync',
    desc: 'Import your real NIKKE roster into the sim via blablalink. Auto-fills your units, gear, and overload lines for accurate team generation.',
  },
  builder: {
    title: 'NIKKE Card Builder — Custom DPS Charts & Infographics',
    label: 'Card Builder',
    desc: 'Build a shareable NIKKE infographic: custom DPS chart, unit comparison, rank board, unit card, or overload table — with a live preview and a hosted, Discord-embeddable URL.',
    // Showcases an actual generated card (the builder's Nikke Card default
    // pick) instead of the generic site screenshot.
    image: 'unit/maiden-ice-rose.discord',
  },
  characters: {
    title: 'NIKKE Characters — Every Nikke’s Kit, Overload Lines & DPS Rank',
    label: 'Characters',
    desc: 'Browse every NIKKE character. Filter by element, weapon, burst stage, class or kit role, then open a Nikke for her full kit, best overload lines, and solo-raid DPS ranking.',
  },
  credits: {
    title: 'Credits — NIKKE Solo Raid Sim',
    label: 'Credits',
    desc: 'The community research, datamines, and tools the NIKKE Solo Raid Sim is built on.',
  },
};

const NOT_FOUND_META: TabMeta = {
  title: 'Page not found — NIKKE Solo Raid Sim',
  label: 'Not Found',
  desc: 'The requested page could not be found. Browse the NIKKE Solo Raid Sim for DPS rankings, overload optimization, team building, and game mechanics.',
};

// Per-unit meta derived from data/characters.json so /unit/:slug pages get unique
// titles, descriptions, and unit-card OG images. Resolved relative to the repo
// root so the server works from source (src/server/static.ts) and the esbuild
// bundle (dist-server/index.js) regardless of cwd.
const REPO_ROOT: string | undefined = ['..', '../..']
  .map((r) => fileURLToPath(new URL(`${r}/`, import.meta.url)))
  .find((d) => existsSync(join(d, 'package.json')));

// Only the fields the static body renders — this is the server's own narrow view
// of data/characters.json, not the engine's full CharacterData.
interface CharacterData {
  slug?: string;
  name?: string;
  element?: string;
  weapon?: string;
  burst?: string;
  burstCooldownSec?: number;
  class?: string;
  manufacturer?: string;
  skills?: { skill1?: string; skill2?: string; burst?: string };
}

const UNIT_META: Record<string, TabMeta> = {};
let CHARACTERS: Record<string, CharacterData> = {};
// data/unit-pages.json — the SAME artifact the React page reads, so the no-JS
// body and the hydrated page can't recommend different overload lines.
let UNIT_PAGES: Record<
  string,
  { ol?: { label: string; gainPct: number }[]; status?: { tier?: string } }
> = {};
// web/public/content-pages.json — the no-JS bodies for the prose pages
// (/mechanics, /howto), generated by scripts/build-content-pages.ts from the
// SAME modules the React pages import. Keyed by TAB_META key. Absent file =>
// those routes fall back to the empty-#root SPA shell, exactly as before.
let CONTENT_PAGES: Record<string, string> = {};
if (!REPO_ROOT) {
  console.error(
    'WARN: could not locate repo root — /unit/* pages will 404; confirm data/ and package.json are adjacent to the server'
  );
} else {
  try {
    const charsPath = join(REPO_ROOT, 'data', 'characters.json');
    const raw = readFileSync(charsPath, 'utf8');
    const json = JSON.parse(raw) as {
      characters?: Record<string, CharacterData>;
    };
    CHARACTERS = json.characters ?? {};
    for (const [slug, c] of Object.entries(CHARACTERS)) {
      const name = c.name ?? slug;
      UNIT_META[`unit/${slug}`] = {
        title: `${name} — NIKKE Unit Profile, Best Overload Lines & DPS Ranking`,
        label: name,
        desc: `NIKKE ${name} unit profile: element, weapon, burst stage, and best overload lines. See how ${name} ranks in the solo-raid DPS sim.`,
        image: `unit/${slug}.discord`,
      };
    }
    TAB_META = { ...TAB_META, ...UNIT_META };
  } catch (e) {
    console.error('failed to load unit meta', e);
  }
  try {
    const upPath = join(REPO_ROOT, 'data', 'unit-pages.json');
    const raw = readFileSync(upPath, 'utf8');
    UNIT_PAGES = (JSON.parse(raw) as { units?: typeof UNIT_PAGES }).units ?? {};
  } catch (e) {
    console.error('failed to load unit-pages data', e);
  }
  try {
    const cpPath = join(REPO_ROOT, 'web', 'public', 'content-pages.json');
    const raw = readFileSync(cpPath, 'utf8');
    CONTENT_PAGES =
      (JSON.parse(raw) as { pages?: Record<string, string> }).pages ?? {};
  } catch (e) {
    console.error('failed to load content-pages data', e);
  }
}

if (Object.keys(UNIT_META).length === 0) {
  throw new Error(
    '/unit/* meta failed to load; /unit pages would 404. Confirm data/characters.json is readable and adjacent to the server bundle.'
  );
}

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
  const src = `${opts.umamiUrl}/script.js`;
  // Idempotent: never inject the tag twice. Defensive — nothing upstream emits
  // it today, since the served shell is dist/index.html and this is the only
  // thing that adds Umami.
  if (html.includes(src)) {
    return html;
  }
  const tag = `<script defer src="${src}" data-website-id="${opts.umamiWebsiteId}"></script>`;
  return html.replace('</head>', `  ${tag}\n  </head>`);
}

const escapeAttr = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

// JSON-LD must escape '<' so a value containing '</script>' cannot break out of
// the script block. '\u003c' is the standard safe escape used by e.g. Next.js.
const escapeJsonLd = (obj: unknown): string =>
  JSON.stringify(obj).replace(/</g, '\\u003c');

// The rankings section lives under /ranks/* (owner decision 2026-07-26):
// bare /ranks is the DPS chart, /ranks/support is Support Rankings, and
// /ranks/compare is Unit Comparison — mirrors tabFromLocation in App.tsx.
// /dpschart and /dps are legacy aliases the client canonicalizes via
// replaceState; a non-JS crawler still needs the right tab meta AND a
// canonical tag pointing at the real URL (legacyCanonical below), not itself.
function tabFromReqUrl(u: URL): string {
  const pathname = normalizeCanonicalPath(u.pathname.toLowerCase());
  const segs = pathname.replace(/^\/+|\/+$/g, '').split('/');
  if (segs[0] === 'ranks') {
    if (segs[1] === 'support') {
      return 'ranks';
    }
    if (segs[1] === 'compare') {
      return 'dps';
    }
    return 'dpschart';
  }
  if (segs[0] === 'unit' && segs[1]) {
    return `unit/${segs[1]}`;
  }
  if (segs[0] && Object.hasOwn(TAB_META, segs[0])) {
    return segs[0];
  }
  return u.searchParams.has('chart') ? 'dpschart' : 'sim';
}

const LEGACY_CANONICAL: Record<string, string> = {
  dpschart: '/ranks',
  dps: '/ranks/compare',
  // `sim: '/'` is unreachable server-side because /sim now 301-redirects; kept
  // for parity with the client-side table in useDocumentHead.ts.
  sim: '/',
};

// 301 redirects for legacy paths that used to be canonical.
const LEGACY_REDIRECT: Record<string, string> = {
  '/dpschart': '/ranks',
  '/dps': '/ranks/compare',
  '/sim': '/',
  '/index.html': '/',
};

// Canonical paths never carry a trailing slash, except the root.
function normalizeCanonicalPath(pathname: string): string {
  if (!pathname || pathname === '/') {
    return '/';
  }
  return pathname.replace(/\/{2,}/g, '/').replace(/\/+$/, '') || '/';
}

// Valid first-party routes we want search engines to index. Anything else
// that falls back to index.html is a soft 404 and should return 404.
function isKnownRoute(u: URL): boolean {
  const pathname = normalizeCanonicalPath(u.pathname.toLowerCase());
  if (pathname === '/') {
    return true;
  }
  const segs = pathname.replace(/^\/+|\/+$/g, '').split('/');
  if (segs[0] === 'ranks') {
    // Whitelist only valid /ranks children (mirrors tabFromReqUrl).
    return (
      segs.length <= 2 &&
      (!segs[1] || segs[1] === 'support' || segs[1] === 'compare')
    );
  }
  if (segs[0] === 'unit') {
    return segs.length === 2 && Object.hasOwn(TAB_META, `unit/${segs[1]}`);
  }
  return segs.length === 1 && Object.hasOwn(TAB_META, segs[0]);
}

// Replaces a <meta property|name="attr" content="..."> tag's content,
// tolerant of Prettier's multi-line wrap (attribute per line) — vite's build
// does NOT collapse index.html to one line, so a literal-space regex here
// silently no-ops on every wrapped tag (title/description/og:*/twitter:* are
// all wrapped in the real dist/index.html once the content is non-trivial).
function replaceMetaContent(
  html: string,
  key: 'name' | 'property',
  attr: string,
  value: string
): string {
  const re = new RegExp(`(<meta\\s+${key}="${attr}"\\s+content=")[^"]*(")`);
  return html.replace(re, `$1${value}$2`);
}

function replaceLinkHref(html: string, rel: string, value: string): string {
  const re = new RegExp(`(<link\\s+rel="${rel}"\\s+href=")[^"]*(")`);
  return html.replace(re, `$1${value}$2`);
}

// Static unit-page body content for /unit/:slug. Crawlers that do not execute
// JS still see the unit name, tags, and best overload lines; React replaces this
// markup once the chunk loads (createRoot, not hydration).
function unitStaticHtml(slug: string): string {
  const c = CHARACTERS[slug];
  if (!c) {
    return '';
  }
  const name = escapeAttr(c.name ?? slug);
  const page = UNIT_PAGES[slug];
  const tags = [
    c.element,
    c.weapon,
    c.burst ? `Burst ${c.burst}` : '',
    c.burstCooldownSec ? `${c.burstCooldownSec}s CD` : '',
    c.class,
    c.manufacturer,
  ]
    .filter(Boolean)
    .map((t) => `<span class="pill">${escapeAttr(t as string)}</span>`)
    .join('');

  // The KIT is the unique text on this page — the one thing no other site words
  // the same way — so it is the part a crawler most needs. Split on the '■'
  // block marker the way the React page does.
  const skills = (['skill1', 'skill2', 'burst'] as const)
    .map((k) => {
      const blocks = String(c.skills?.[k] ?? '')
        .split('\u25a0')
        .map((b) => b.trim())
        .filter(Boolean);
      if (!blocks.length) {
        return '';
      }
      const label =
        k === 'burst' ? 'Burst Skill' : k === 'skill1' ? 'Skill 1' : 'Skill 2';
      return (
        `<div class="unit-skill"><h3>${label}</h3>` +
        blocks
          .map((b) => `<p class="unit-skill-block">${escapeAttr(b)}</p>`)
          .join('') +
        '</div>'
      );
    })
    .join('');

  // Overload table from data/unit-pages.json — the same source the React page
  // uses. It deliberately does NOT fall back to ol-optimal.json: that artifact's
  // greedy pick disagrees with this ranking for most units, and a crawler
  // indexing a different recommendation than the visitor sees is worse than
  // indexing none.
  const rows = page?.ol ?? [];
  const olSection = rows.length
    ? '<section class="unit-section"><h2>Overload Lines</h2>' +
      `<p class="unit-lines">4\u00d7 Attack + 4\u00d7 Elemental Damage + ${escapeAttr(rows[0].label)}</p>` +
      `<p>+${rows[0].gainPct.toFixed(1)}% damage over 4\u00d7 Attack + 4\u00d7 Elemental Damage</p>` +
      '<table class="unit-ol-table"><thead><tr><th>Optimal Overload Lines</th>' +
      '<th>vs 8/12</th></tr></thead><tbody>' +
      rows
        .map(
          (r) =>
            `<tr><td>${escapeAttr(r.label)}</td><td>+${r.gainPct.toFixed(1)}%</td></tr>`
        )
        .join('') +
      '</tbody></table></section>'
    : '';

  const tier = page?.status?.tier;
  const statusSection = tier
    ? `<section class="unit-section"><h2>Sim status</h2><p>${escapeAttr(
        TIER_LABEL[tier] ?? tier
      )}</p></section>`
    : '';

  return (
    '<div class="app unit-page">' +
    '<nav class="unit-crumbs"><a href="/characters">Characters</a></nav>' +
    `<header class="unit-header"><div class="unit-meta"><h1>${name}</h1>` +
    `<div class="unit-tags">${tags}</div></div></header>` +
    olSection +
    (skills
      ? `<section class="unit-section"><h2>Skills</h2>${skills}</section>`
      : '') +
    statusSection +
    '<section class="unit-section"><h2>Tools</h2>' +
    '<div class="unit-tools">' +
    '<a href="/ranks">DPS Rankings</a>' +
    '<a href="/overload">Overload Optimizer</a>' +
    '<a href="/teambuilder">Team Builder</a>' +
    '<a href="/characters">All characters</a>' +
    '</div></section></div>'
  );
}

// Mirror of the web page's TIER_COPY labels (web/src/UnitPage.tsx).
const TIER_LABEL: Record<string, string> = {
  MEASURED: 'Measured',
  CALIBRATED: 'Calibrated',
  VALIDATED: 'Validated',
  MODEL_ONLY: 'Untuned',
};

// Static /characters body: every character as a real link. This IS the crawl
// surface the page exists for, so it must survive with JS off.
function charactersStaticHtml(): string {
  const links = Object.values(CHARACTERS)
    .map((c) => c as { slug?: string; name?: string })
    .filter((c) => c.slug)
    .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
    .map(
      (c) =>
        `<a href="/unit/${escapeAttr(c.slug as string)}">${escapeAttr(c.name ?? (c.slug as string))}</a>`
    )
    .join('');
  return (
    '<div class="app characters-page">' +
    '<header><h1>NIKKE Characters</h1></header>' +
    `<section class="characters-all"><h2>All Characters</h2>${links}</section>` +
    '</div>'
  );
}

// Put a no-JS body into #root. React later replaces it wholesale (createRoot,
// not hydration), so the markup only has to be valid and crawlable, not to match
// what React renders.
function injectStaticBody(html: string, content: string): string {
  if (!content) {
    return html;
  }
  if (html.includes('<div id="root"></div>')) {
    return html.replace(
      '<div id="root"></div>',
      `<div id="root">${content}</div>`
    );
  }
  return html.replace('<body>', `<body>${content}`);
}

interface ImgManifestEntry {
  file: string;
  width: number;
  height: number;
}
// dist/img/manifest.json, keyed by distDir (a test harness can spin up
// multiple servers against different temp dist trees in one process).
const imgManifestCache = new Map<
  string,
  Promise<Record<string, ImgManifestEntry> | null>
>();
function loadImgManifest(
  distDir: string
): Promise<Record<string, ImgManifestEntry> | null> {
  let p = imgManifestCache.get(distDir);
  if (!p) {
    p = readFile(join(distDir, 'img', 'manifest.json'), 'utf8')
      .then(
        (raw) =>
          (JSON.parse(raw).images ?? {}) as Record<string, ImgManifestEntry>
      )
      .catch(() => null);
    imgManifestCache.set(distDir, p);
  }
  return p;
}

function pageMeta(reqUrl: string) {
  // Collapse leading slashes so `//ranks` is parsed as a path, not a
  // protocol-relative URL with host `ranks`.
  const safeUrl = (reqUrl || '/').replace(/^\/+/, '/');
  const u = new URL(safeUrl, SITE);
  const pathname = u.pathname.toLowerCase();
  const seg = pathname.replace(/^\/+|\/+$/g, '').split('/')[0];
  const key = tabFromReqUrl(u);
  const m = TAB_META[key] ?? TAB_META.sim;
  const canonicalPath = normalizeCanonicalPath(
    (Object.hasOwn(LEGACY_CANONICAL, seg) ? LEGACY_CANONICAL[seg] : null) ??
      (pathname || '/')
  );
  return { key, m, canonicalPath };
}

async function injectMeta(
  html: string,
  reqUrl: string,
  distDir: string,
  metaOverride?: TabMeta
): Promise<string> {
  const { m: defaultM, canonicalPath } = pageMeta(reqUrl);
  const m = metaOverride ?? defaultM;
  const canonical = escapeAttr(SITE + canonicalPath);
  const title = escapeAttr(m.title);
  const desc = escapeAttr(m.desc);
  let out = html.replace(/(<title>)[^<]*(<\/title>)/, `$1${title}$2`);
  out = replaceMetaContent(out, 'name', 'description', desc);
  out = replaceLinkHref(out, 'canonical', canonical);
  out = replaceMetaContent(out, 'property', 'og:title', title);
  out = replaceMetaContent(out, 'property', 'og:description', desc);
  out = replaceMetaContent(out, 'property', 'og:url', canonical);
  out = replaceMetaContent(out, 'name', 'twitter:title', title);
  out = replaceMetaContent(out, 'name', 'twitter:description', desc);

  // Per-tab OG/Twitter image, resolved against the content-hashed manifest.
  // Falls back to the generic og:image already baked into index.html when
  // the tab has none, or the manifest/key isn't there (e.g. a deploy predating
  // the img API, or a slug that lost its card).
  if (m.image) {
    const images = await loadImgManifest(distDir);
    const entry = images?.[m.image];
    if (entry) {
      const imgUrl = escapeAttr(`${SITE}/img/${entry.file}`);
      out = replaceMetaContent(out, 'property', 'og:image', imgUrl);
      out = replaceMetaContent(
        out,
        'property',
        'og:image:width',
        String(entry.width)
      );
      out = replaceMetaContent(
        out,
        'property',
        'og:image:height',
        String(entry.height)
      );
      out = replaceMetaContent(out, 'property', 'og:image:alt', title);
      out = replaceMetaContent(out, 'name', 'twitter:image', imgUrl);
    }
  }
  return out;
}

function breadcrumbItems(canonicalPath: string, pageLabel: string) {
  if (canonicalPath === '/') {
    return null;
  }
  const home = { name: 'Home', item: SITE + '/' };
  const leaf = { name: pageLabel, item: SITE + canonicalPath };
  // Drop entries whose URL duplicates an earlier one (e.g. the section parent
  // IS the leaf on /overload, /teambuilder, /mechanics; /team's Sim ancestor
  // duplicates Home).
  const dedupe = (arr: { name: string; item: string }[]) =>
    arr.filter((it, i, a) => a.findIndex((x) => x.item === it.item) === i);

  const items: { name: string; item: string }[] = (() => {
    if (canonicalPath === '/ranks') {
      return [home, { name: 'DPS Rankings', item: SITE + '/ranks' }];
    }
    if (canonicalPath === '/ranks/support') {
      return [
        home,
        { name: 'Rankings', item: SITE + '/ranks' },
        { name: 'Support Rankings', item: SITE + '/ranks/support' },
      ];
    }
    if (canonicalPath === '/ranks/compare') {
      return [
        home,
        { name: 'Rankings', item: SITE + '/ranks' },
        { name: 'Unit Comparison', item: SITE + '/ranks/compare' },
      ];
    }
    if (canonicalPath.startsWith('/unit/')) {
      return [home, { name: 'Rankings', item: SITE + '/ranks' }, leaf];
    }
    if (
      canonicalPath.startsWith('/overload') ||
      canonicalPath === '/olsim' ||
      canonicalPath === '/charge'
    ) {
      return [home, { name: 'Overload', item: SITE + '/overload' }, leaf];
    }
    if (
      canonicalPath === '/team' ||
      canonicalPath === '/roster' ||
      canonicalPath === '/rostersim'
    ) {
      return [home, { name: 'Sim', item: SITE + '/' }, leaf];
    }
    if (
      canonicalPath === '/teambuilder' ||
      canonicalPath === '/builder' ||
      canonicalPath === '/doll' ||
      canonicalPath === '/resources'
    ) {
      return [home, { name: 'Tools', item: SITE + '/teambuilder' }, leaf];
    }
    if (
      canonicalPath === '/mechanics' ||
      canonicalPath === '/howto' ||
      canonicalPath === '/testing-requests' ||
      canonicalPath === '/patch-notes'
    ) {
      return [home, { name: 'Reference', item: SITE + '/mechanics' }, leaf];
    }
    return [home, leaf];
  })();
  // Drop ancestors whose URL duplicates the leaf URL so the leaf's own label
  // wins (e.g. /teambuilder must not render as "Home > Tools"). First-wins
  // dedupe still applies to earlier duplicates like Home vs Sim on /team.
  const leafUrl = items[items.length - 1].item;
  const collapsed = items.filter(
    (it, i, a) => i === a.length - 1 || it.item !== leafUrl
  );
  return dedupe(collapsed);
}

function injectBreadcrumb(
  html: string,
  canonicalPath: string,
  pageLabel: string
): string {
  // Idempotent: skip when a BreadcrumbList is already present. Defensive —
  // nothing upstream emits one today (React's own JSON-LD renders client-side,
  // after this response is built).
  if (html.includes('"@type":"BreadcrumbList"')) {
    return html;
  }
  const items = breadcrumbItems(canonicalPath, pageLabel);
  if (!items) {
    return html;
  }
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.item,
    })),
  };
  const tag = `  <script type="application/ld+json">${escapeJsonLd(ld)}</script>\n  </head>`;
  return html.replace('</head>', tag);
}

async function sendIndex(
  reqUrl: string,
  opts: StaticOptions,
  file: string,
  status = 200
): Promise<Response> {
  const { key, m, canonicalPath } = pageMeta(reqUrl);
  let html = await readFile(file, 'utf8');
  html = await injectMeta(
    html,
    reqUrl,
    opts.distDir,
    status === 404 ? NOT_FOUND_META : undefined
  );
  if (status === 404) {
    // 404 responses canonicalize to the root and carry no breadcrumb.
    const root = escapeAttr(SITE + '/');
    html = replaceLinkHref(html, 'canonical', root);
    html = replaceMetaContent(html, 'property', 'og:url', root);
  } else {
    html = injectBreadcrumb(html, canonicalPath, m.label ?? m.title);
    if (key.startsWith('unit/')) {
      html = injectStaticBody(html, unitStaticHtml(key.slice(5)));
    } else if (key === 'characters') {
      html = injectStaticBody(html, charactersStaticHtml());
    } else if (CONTENT_PAGES[key]) {
      html = injectStaticBody(html, CONTENT_PAGES[key]);
    }
  }
  html = injectUmami(html, opts);
  return new Response(html, {
    status,
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
  // b1b2dps was served no-cache only via the unmatched-path fallback until
  // 2026-08-04 (found while scoping the artifact-decoupling plan §7) — listed
  // explicitly so a matcher change cannot flip it to a long cache.
  '/b1b2dps.json',
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

    // Redirect legacy aliases to their canonical home with a 301 so link equity
    // flows to the current URL, not just via <link rel="canonical">.
    const canonicalUrl = normalizeCanonicalPath(url.toLowerCase());
    const redirectTarget = Object.hasOwn(LEGACY_REDIRECT, canonicalUrl)
      ? LEGACY_REDIRECT[canonicalUrl]
      : undefined;
    if (redirectTarget) {
      const qi = reqUrl.indexOf('?');
      const query = qi === -1 ? '' : reqUrl.slice(qi + 1);
      return new Response(null, {
        status: 301,
        headers: {
          location: redirectTarget + (query ? `?${query}` : ''),
          'cache-control': 'no-cache',
        },
      });
    }

    // block path traversal, then resolve within dist/
    const rel = normalize(url).replace(/^(\.\.[/\\])+/, '');
    let file = join(opts.distDir, rel);
    if (!file.startsWith(opts.distDir)) {
      file = join(opts.distDir, 'index.html');
    }

    const requestedExt = extname(url);
    try {
      const s = await stat(file);
      if (s.isDirectory()) {
        const indexFile = join(file, 'index.html');
        try {
          await stat(indexFile);
          file = indexFile;
        } catch {
          // Directory with no index.html is not a known route; fall back to the
          // SPA shell so the normal 404 path below handles it.
          file = join(opts.distDir, 'index.html');
        }
      }
    } catch {
      // A request with a real file extension that does not exist is a missing
      // static asset, not an unknown SPA route. Serve a plain 404 so module
      // loaders and image tags get the right MIME instead of an HTML shell.
      if (requestedExt && requestedExt !== '.html') {
        return new Response('not found', {
          status: 404,
          headers: { 'content-type': 'text/plain; charset=utf-8' },
        });
      }
      file = join(opts.distDir, 'index.html'); // SPA fallback
    }
    // index.html carries per-tab embed metadata injected per request; everything
    // else is a static asset served as-is.
    if (file.endsWith('index.html')) {
      const notFound = !isKnownRoute(u);
      return await sendIndex(reqUrl, opts, file, notFound ? 404 : 200);
    }
    return await sendFile(
      file,
      rel,
      200,
      c.req.header('if-none-match'),
      c.req.header('if-modified-since')
    );
  } catch {
    // last-resort fallback: preserve 404 for unknown routes instead of soft-200ing.
    try {
      const notFound = !isKnownRoute(u);
      return await sendIndex(
        reqUrl,
        opts,
        join(opts.distDir, 'index.html'),
        notFound ? 404 : 200
      );
    } catch {
      return new Response('server error', { status: 500 });
    }
  }
}
