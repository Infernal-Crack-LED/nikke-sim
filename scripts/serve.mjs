// Minimal zero-dependency static file server for the built site (dist/).
// Used as the Railway start command. Binds to $PORT (Railway provides it) on
// 0.0.0.0. Serves dist/, falling back to index.html so the SPA always loads.
import { createServer } from 'node:http';
import { existsSync, realpathSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { join, normalize, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST =
  process.env.SERVE_DIST ?? fileURLToPath(new URL('../dist', import.meta.url));
// Resolve data/ relative to the repo root so the Railway start command and the
// in-process API server read characters.json/ol-optimal.json from the same
// place (mirror of src/server/static.ts).
const REPO_ROOT = ['..', '../..']
  .map((r) => fileURLToPath(new URL(`${r}/`, import.meta.url)))
  .find((d) => existsSync(join(d, 'package.json')));
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
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json',
};

// ---- per-tab embed metadata -------------------------------------------------
// Crawlers (Discord/Twitter/etc.) don't run JS, so a shared link's Open Graph
// card must be baked into the HTML the server returns. We branch the OG/Twitter
// tags on the URL's path (tabFromReqUrl below, mirrors the client's tabKey) so
// each route is independently linkable with its own title/description. MUST stay
// in lockstep with useDocumentHead.ts META and src/server/static.ts TAB_META —
// scripts/tests/share/meta-parity.test.ts enforces it.
const SITE = 'https://nikkesim.app';
export let TAB_META = {
  home: {
    title: 'Nikke Simulator — NIKKE Squad Builder & Solo Raid Sim',
    label: 'Home',
    desc: 'Build and plan your NIKKE: Goddess of Victory squad. Browse characters, assemble teams, run the solo-raid DPS sim, optimize overload lines, and share your setups.',
  },
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
    desc: 'Ranked DPS of every NIKKE B3 under standardized frameworks: neutral and elementally advantaged, with and without supports.',
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
    desc: 'Build and share NIKKE solo raid and union raid teams visually. Filter the full roster, set loadouts, and copy your team into the sim or roster sim.',
  },
  resources: {
    title:
      'NIKKE Resource Calculator — Daily Custom Module & Anomaly Interception Outcome',
    label: 'Resource Calculator',
    desc: 'Expected daily custom module and T9 drops by stage. Supports Kraken and other Anomaly Interception bosses. Plan your daily farming.',
  },
  pull: {
    title: 'NIKKE Pull Calculator — Recruit Odds, Copies & MLB Chances',
    label: 'Pull Calculator',
    desc: 'Cumulative Advanced Recruit odds for any number of pulls: expected SSRs, the chance of landing a rate-up or Pilgrim unit, and the odds of enough copies to max limit break.',
    image: 'pull/200',
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
    desc: 'About the developer behind the NIKKE Solo Raid Sim, the Refitting Room GFL2 squad planner, and the Maiden and Helen Discord bots.',
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
    desc: 'Build a shareable NIKKE infographic: Nikke Card, custom DPS chart, unit comparison, rank board, and more. Live preview and specialized formatting for Discord and X.',
    // Showcases an actual generated card (the builder's Nikke Card default
    // pick) instead of the generic site screenshot — resolved against the
    // build-infographics manifest at request time since the file name is
    // content-hashed.
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

const NOT_FOUND_META = {
  title: 'Page not found — NIKKE Solo Raid Sim',
  label: 'Not Found',
  desc: 'The requested page could not be found. Browse the NIKKE Solo Raid Sim for DPS rankings, overload optimization, team building, and game mechanics.',
};

// Per-unit meta is derived from data/characters.json at startup so /unit/:slug
// pages get unique titles, descriptions, and unit-card OG images.
const UNIT_META = {};
let CHARACTERS = {};
let UNIT_PAGES = {};
// web/public/content-pages.json — the no-JS bodies for the prose pages
// (/mechanics, /howto), generated by scripts/build-content-pages.ts from the
// SAME modules the React pages import. Keyed by TAB_META key. Absent file =>
// those routes fall back to the empty-#root SPA shell, exactly as before.
let CONTENT_PAGES = {};
async function loadUnitMeta() {
  if (!REPO_ROOT) {
    console.error(
      'WARN: could not locate repo root — /unit/* pages will 404; confirm data/ and package.json are adjacent to the server'
    );
    return;
  }
  try {
    const charsPath = join(REPO_ROOT, 'data', 'characters.json');
    const raw = await readFile(charsPath, 'utf8');
    const json = JSON.parse(raw);
    CHARACTERS = json.characters ?? {};
    for (const [slug, c] of Object.entries(CHARACTERS)) {
      const name = c.name ?? slug;
      const key = `unit/${slug}`;
      UNIT_META[key] = {
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
    const raw = await readFile(upPath, 'utf8');
    UNIT_PAGES = JSON.parse(raw).units ?? {};
  } catch (e) {
    console.error('failed to load unit-pages data', e);
  }
  try {
    const cpPath = join(REPO_ROOT, 'web', 'public', 'content-pages.json');
    const raw = await readFile(cpPath, 'utf8');
    CONTENT_PAGES = JSON.parse(raw).pages ?? {};
  } catch (e) {
    console.error('failed to load content-pages data', e);
  }
}
await loadUnitMeta();

if (Object.keys(UNIT_META).length === 0) {
  throw new Error(
    '/unit/* meta failed to load; /unit pages would 404. Confirm data/characters.json is readable and adjacent to the server bundle.'
  );
}

// ---- analytics (Umami, self-hosted) -----------------------------------------
// Injected server-side so the URL/ID can change without a rebuild.
// Set UMAMI_URL + UMAMI_WEBSITE_ID in Railway; omit to disable (e.g. dev).
const UMAMI_URL = process.env.UMAMI_URL;
const UMAMI_WEBSITE_ID = process.env.UMAMI_WEBSITE_ID;

function injectUmami(html) {
  if (!UMAMI_URL || !UMAMI_WEBSITE_ID) {
    return html;
  }
  const src = `${UMAMI_URL}/script.js`;
  // Idempotent: never inject the tag twice. Defensive — nothing upstream emits
  // it today, since the served shell is dist/index.html and this is the only
  // thing that adds Umami.
  if (html.includes(src)) {
    return html;
  }
  const tag = `<script defer src="${src}" data-website-id="${UMAMI_WEBSITE_ID}"></script>`;
  return html.replace('</head>', `  ${tag}\n  </head>`);
}

const escapeAttr = (s) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

// JSON-LD must escape '<' so a value containing '</script>' cannot break out of
// the script block. '\u003c' is the standard safe escape used by e.g. Next.js.
const escapeJsonLd = (obj) => JSON.stringify(obj).replace(/</g, '\\u003c');

// The rankings section lives under /ranks/* (owner decision 2026-07-26):
// bare /ranks is the DPS chart, /ranks/support is Support Rankings, and
// /ranks/compare is Unit Comparison — mirrors tabFromLocation in App.tsx.
// /dpschart and /dps are legacy aliases the client canonicalizes via
// replaceState; a non-JS crawler still needs the right tab meta AND a
// canonical tag pointing at the real URL (legacyCanonical below), not itself.
function tabFromReqUrl(u) {
  const pathname = normalizeCanonicalPath(u.pathname.toLowerCase());
  if (pathname === '/') {
    return 'home';
  }
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

const LEGACY_CANONICAL = {
  dpschart: '/ranks',
  dps: '/ranks/compare',
};

// 301 redirects for legacy paths that used to be canonical.
const LEGACY_REDIRECT = {
  '/dpschart': '/ranks',
  '/dps': '/ranks/compare',
  '/index.html': '/',
};

// Canonical paths never carry a trailing slash, except the root.
function normalizeCanonicalPath(pathname) {
  if (!pathname || pathname === '/') {
    return '/';
  }
  return pathname.replace(/\/{2,}/g, '/').replace(/\/+$/, '') || '/';
}

// Valid first-party routes we want search engines to index. Anything else
// that falls back to index.html is a soft 404 and should return 404.
function isKnownRoute(u) {
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
function replaceMetaContent(html, key, attr, value) {
  const re = new RegExp(`(<meta\\s+${key}="${attr}"\\s+content=")[^"]*(")`);
  return html.replace(re, `$1${value}$2`);
}

function replaceLinkHref(html, rel, value) {
  const re = new RegExp(`(<link\\s+rel="${rel}"\\s+href=")[^"]*(")`);
  return html.replace(re, `$1${value}$2`);
}

// Static unit-page body content for /unit/:slug. Crawlers that do not execute
// JS still see the unit name, tags, and best overload lines; React replaces this
// Mirror of the web page's TIER_COPY labels (web/src/UnitPage.tsx).
const TIER_LABEL = {
  MEASURED: 'Measured',
  CALIBRATED: 'Calibrated',
  VALIDATED: 'Validated',
  MODEL_ONLY: 'Untuned',
};

function unitStaticHtml(slug) {
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
    .map((t) => `<span class="pill">${escapeAttr(t)}</span>`)
    .join('');

  // The KIT is the unique text on this page — the one thing no other site words
  // the same way — so it is the part a crawler most needs.
  const skills = ['skill1', 'skill2', 'burst']
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

  // From data/unit-pages.json — the same source the React page uses. It
  // deliberately does NOT fall back to ol-optimal.json: that artifact's greedy
  // pick disagrees with this ranking for most units, and a crawler indexing a
  // different recommendation than the visitor sees is worse than indexing none.
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

// Static /characters body: every character as a real link. This IS the crawl
// surface the page exists for, so it must survive with JS off.
function charactersStaticHtml() {
  const links = Object.values(CHARACTERS)
    .filter((c) => c.slug)
    .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
    .map(
      (c) =>
        `<a href="/unit/${escapeAttr(c.slug)}">${escapeAttr(c.name ?? c.slug)}</a>`
    )
    .join('');
  return (
    '<div class="app characters-page">' +
    '<header><h1>NIKKE Characters</h1></header>' +
    `<section class="characters-all"><h2>All Characters</h2>${links}</section>` +
    '</div>'
  );
}

// Static / landing body: mirrors LandingPage.tsx so crawlers see the same
// headline, cards, and promos without executing JS.
function homeStaticHtml() {
  const maidenBlurb =
    'A NIKKE: Goddess of Victory info & strategy Discord bot that serves up character data on demand. Built for my union cluster, Maiden’s Bakery, but it works in any Nikke-oriented server.';
  const refittingName = 'Refitting Room';
  const refittingBlurb =
    'My other game tool: a Girls’ Frontline 2: Exilium squad planner. Browse dolls and weapons, filter by class, phase, and weapon type, and assemble a team — all running in the browser.';
  return (
    '<div class="app home-page">' +
    '<section class="home-hero">' +
    '<img class="home-hero-logo" src="/favicon.svg" alt="" width="56" height="56" />' +
    '<h1>Nikke Simulator</h1>' +
    '<p>Plan, build, and share <strong>NIKKE: Goddess of Victory</strong> squads. Browse every Nikke, assemble teams, optimize overload lines, and compare DPS — all in one place.</p>' +
    '<div class="home-cta-row">' +
    '<a class="btn-solid" href="/teambuilder">Build a Team</a>' +
    '<a class="btn-outline" href="/characters">Browse Characters</a>' +
    '</div>' +
    '</section>' +
    '<section class="home-section">' +
    '<h2 class="home-section-title">Everything you need to plan a squad</h2>' +
    '<div class="home-feature-grid">' +
    '<a class="home-feature" href="/sim"><h2>Team Simulator</h2><p>Run a frame-tick damage simulation for your squad against a custom boss. Per-unit DPS, share breakdowns, and full-burst counts.</p><span class="home-feature-cta">Open the sim →</span></a>' +
    '<a class="home-feature" href="/teambuilder"><h2>Team Builder</h2><p>Assemble up to five Nikkes and see team effects, elemental synergies, and burst coverage at a glance.</p><span class="home-feature-cta">Build a team →</span></a>' +
    '<a class="home-feature" href="/ranks"><h2>DPS Rankings</h2><p>Ranked damage under standardized frameworks: neutral, elementally advantaged, with and without supports.</p><span class="home-feature-cta">View rankings →</span></a>' +
    '<a class="home-feature" href="/roster"><h2>Roster Generator</h2><p>Generate the best solo-raid or union-raid roster teams from your unit pool, accounting for element, burst rotation, and overload synergy.</p><span class="home-feature-cta">Generate rosters →</span></a>' +
    '<a class="home-feature" href="/overload"><h2>Overload Optimizer</h2><p>Find the best overload lines for any Nikke, estimate rolling costs, and check charge-speed breakpoints.</p><span class="home-feature-cta">Optimize lines →</span></a>' +
    '<a class="home-feature" href="/builder"><h2>Infographic Generator</h2><p>Build and download shareable infographics for teams, DPS charts, unit comparisons, rank boards, and pull odds.</p><span class="home-feature-cta">Open builder →</span></a>' +
    '</div>' +
    '</section>' +
    '<section class="home-callout">' +
    '<img class="home-callout-avatar" src="/maiden.gif" alt="" width="72" height="72" />' +
    '<div class="home-callout-body"><h2>Meet Maiden</h2><p>' +
    escapeAttr(maidenBlurb) +
    '</p><a class="btn-primary discord" href="https://discord.com/discovery/applications/1523719703950790946" target="_blank" rel="noreferrer">Add Maiden to your server</a></div>' +
    '</section>' +
    '<section class="home-callout">' +
    '<img class="home-callout-avatar square" src="/refittingroom-icon.png" alt="" width="72" height="72" />' +
    '<div class="home-callout-body"><h2>' +
    escapeAttr(refittingName) +
    '</h2><p>' +
    escapeAttr(refittingBlurb) +
    '</p><a class="btn-outline" href="https://refittingroom.app" target="_blank" rel="noreferrer">Visit Refitting Room</a></div>' +
    '</section>' +
    '</div>'
  );
}

// React later replaces this wholesale (createRoot, not hydration), so the markup
// only has to be valid and crawlable, not to match what React renders.
function injectStaticBody(html, content) {
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

// dist/img/manifest.json — read once per process (content-hashed filenames
// are stable for the process's lifetime; a redeploy restarts the process).
let imgManifestPromise = null;
function loadImgManifest() {
  imgManifestPromise ??= readFile(join(DIST, 'img', 'manifest.json'), 'utf8')
    .then((raw) => JSON.parse(raw).images ?? {})
    .catch(() => null);
  return imgManifestPromise;
}

function pageMeta(reqUrl) {
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

async function injectMeta(html, reqUrl, metaOverride) {
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
    const images = await loadImgManifest();
    const entry = images && images[m.image];
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

function breadcrumbItems(canonicalPath, pageLabel) {
  if (canonicalPath === '/') {
    return null;
  }
  const home = { name: 'Home', item: SITE + '/' };
  const leaf = { name: pageLabel, item: SITE + canonicalPath };
  // Drop entries whose URL duplicates an earlier one (e.g. the section parent
  // IS the leaf on /overload, /teambuilder, /mechanics; /team's Sim ancestor
  // duplicates Home).
  const dedupe = (arr) =>
    arr.filter((it, i, a) => a.findIndex((x) => x.item === it.item) === i);

  const items = (() => {
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
      canonicalPath === '/rostersim' ||
      canonicalPath === '/sim'
    ) {
      return [home, { name: 'Sim', item: SITE + '/sim' }, leaf];
    }
    if (
      canonicalPath === '/teambuilder' ||
      canonicalPath === '/builder' ||
      canonicalPath === '/doll' ||
      canonicalPath === '/resources' ||
      canonicalPath === '/pull'
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

function injectBreadcrumb(html, canonicalPath, pageLabel) {
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

async function sendIndex(res, reqUrl, file, status = 200) {
  const { key, m, canonicalPath } = pageMeta(reqUrl);
  let html = await readFile(file, 'utf8');
  html = await injectMeta(
    html,
    reqUrl,
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
    } else if (key === 'home') {
      html = injectStaticBody(html, homeStaticHtml());
    } else if (CONTENT_PAGES[key]) {
      html = injectStaticBody(html, CONTENT_PAGES[key]);
    }
  }
  html = injectUmami(html);
  res.writeHead(status, {
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
    const rawUrl = req.url ?? '/';
    // Collapse leading slashes so `//ranks` is treated as a path, not a
    // protocol-relative URL with a different host.
    const reqUrl = rawUrl.replace(/^\/+/, '/');
    const url = decodeURIComponent(reqUrl.split('?')[0]);
    const parsedUrl = new URL(reqUrl, SITE);

    // Redirect legacy aliases to their canonical home with a 301 so link equity
    // flows to the current URL, not just via <link rel="canonical">.
    const canonicalUrl = normalizeCanonicalPath(url.toLowerCase());
    const redirectTarget = Object.hasOwn(LEGACY_REDIRECT, canonicalUrl)
      ? LEGACY_REDIRECT[canonicalUrl]
      : undefined;
    if (redirectTarget) {
      const qi = reqUrl.indexOf('?');
      const query = qi === -1 ? '' : reqUrl.slice(qi + 1);
      res.writeHead(301, {
        location: redirectTarget + (query ? `?${query}` : ''),
        'cache-control': 'no-cache',
      });
      res.end();
      return;
    }

    // block path traversal, then resolve within dist/
    const rel = normalize(url).replace(/^(\.\.[/\\])+/, '');
    let file = join(DIST, rel);
    if (!file.startsWith(DIST)) {
      file = join(DIST, 'index.html');
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
          file = join(DIST, 'index.html');
        }
      }
    } catch {
      // A request with a real file extension that does not exist is a missing
      // static asset, not an unknown SPA route. Serve a plain 404 so module
      // loaders and image tags get the right MIME instead of an HTML shell.
      if (requestedExt && requestedExt !== '.html') {
        res
          .writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
          .end('not found');
        return;
      }
      file = join(DIST, 'index.html'); // SPA fallback
    }
    // index.html carries per-tab embed metadata injected per request; everything
    // else is a static asset served as-is.
    if (file.endsWith('index.html')) {
      const notFound = !isKnownRoute(parsedUrl);
      await sendIndex(res, reqUrl, file, notFound ? 404 : 200);
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
    // last-resort fallback: preserve 404 for unknown routes instead of soft-200ing.
    try {
      const fallbackUrl = (req.url ?? '/').replace(/^\/+/, '/');
      const notFound = !isKnownRoute(new URL(fallbackUrl, SITE));
      await sendIndex(
        res,
        req.url ?? '/',
        join(DIST, 'index.html'),
        notFound ? 404 : 200
      );
    } catch {
      res.writeHead(500).end('server error');
    }
  }
});

// Bind the port only when run directly (`npm start` / Railway); the
// meta-parity test imports this module for TAB_META and must not get a
// second server.
const entry = process.argv[1] ? resolve(process.argv[1]) : '';
const isDirectRun =
  !!entry &&
  existsSync(entry) &&
  realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url));
if (isDirectRun) {
  server.listen(PORT, '0.0.0.0', () => {
    const bound = server.address();
    console.log(
      `nikke-sim serving ${DIST} on 0.0.0.0:${bound ? bound.port : PORT}`
    );
  });
}
