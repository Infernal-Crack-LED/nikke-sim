// Build-time pre-render: generate a static HTML file per route with the correct
// <title>, <meta>, OG tags, canonical, and JSON-LD baked in. Crawlers that
// don't execute JS (or that see the raw HTML before hydration) still get
// keyword-rich, per-page metadata for SEO and social embeds.
//
// Run after `vite build`:  node scripts/prerender.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = fileURLToPath(new URL('../dist', import.meta.url));
const SITE = 'https://nikkesim.app';

const ROUTES = [
  { path: '/', key: 'sim' },
  { path: '/dpschart', key: 'dpschart' },
  { path: '/dps', key: 'dps' },
  { path: '/overload', key: 'overload' },
  { path: '/team', key: 'team' },
  { path: '/roster', key: 'roster' },
  { path: '/rostersim', key: 'rostersim' },
  { path: '/olsim', key: 'olsim' },
  { path: '/doll', key: 'doll' },
  { path: '/charge', key: 'charge' },
  { path: '/teambuilder', key: 'teambuilder' },
  { path: '/resources', key: 'resources' },
  { path: '/howto', key: 'howto' },
  { path: '/mechanics', key: 'mechanics' },
  { path: '/dev', key: 'dev' },
  { path: '/patch-notes', key: 'patch-notes' },
  { path: '/testing-requests', key: 'testing-requests' },
  { path: '/roster-sync', key: 'roster-sync' },
  { path: '/credits', key: 'credits' },
];

const META = {
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
  overload: {
    title: 'NIKKE Overload Optimizer — Best Overload Lines Calculator',
    desc: 'Find the optimal 3rd overload line for every NIKKE B3. The overload calculator uses frame-tick sim data to rank every roll by DPS gain.',
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

const esc = (s) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

function injectMeta(html, route) {
  const m = META[route.key];
  const canonical = esc(SITE + route.path);
  const title = esc(m.title);
  const desc = esc(m.desc);
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

async function main() {
  const baseHtml = await readFile(join(DIST, 'index.html'), 'utf8');

  for (const route of ROUTES) {
    if (route.path === '/') continue; // dist/index.html already has the base meta
    const html = injectMeta(baseHtml, route);
    const dir = join(DIST, route.path);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'index.html'), html, 'utf8');
    console.log(`  pre-rendered ${route.path}`);
  }

  console.log(`pre-rendered ${ROUTES.length - 1} routes`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
