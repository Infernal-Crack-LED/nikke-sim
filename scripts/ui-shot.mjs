// Headless-browser UI screenshots for manual/visual verification of layout
// changes. Serves the built dist/ (via serve.mjs) and drives Playwright Chromium
// through a few tabs + viewports, writing PNGs to OUT (default /tmp/ui-shots).
//
//   npm run web:build && node scripts/ui-shot.mjs
//   OUT=/tmp/shots node scripts/ui-shot.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

process.env.PORT = process.env.PORT || '4319';
const base = `http://localhost:${process.env.PORT}`;
const outDir = process.env.OUT || '/tmp/ui-shots';
mkdirSync(outDir, { recursive: true });

// serve.mjs binds its port ONLY when run directly (the meta-parity test
// imports it for TAB_META and must not get a second server), so this spawns it
// as a child rather than importing it — an import silently yields no server at
// all, and Playwright then either times out or, worse, screenshots whatever
// unrelated process happens to hold the port.
const server = spawn(
  process.execPath,
  [fileURLToPath(new URL('./serve.mjs', import.meta.url))],
  { stdio: ['ignore', 'pipe', 'inherit'], env: process.env }
);
const stopServer = () => server.kill();
process.on('exit', stopServer);
await new Promise((resolve, reject) => {
  const timer = setTimeout(
    () => reject(new Error(`ui-shot: server never bound ${base}`)),
    15000
  );
  server.stdout.on('data', (chunk) => {
    if (String(chunk).includes('serving')) {
      clearTimeout(timer);
      resolve();
    }
  });
  server.on('exit', (code) => {
    clearTimeout(timer);
    reject(new Error(`ui-shot: server exited early (${code})`));
  });
});

const browser = await chromium.launch();
const shots = [];

// SHOTS=<substring>[,<substring>] renders only the matching shots. The roster and
// team captures each drive a full generator run (30 s+), so iterating on one
// page's layout otherwise means waiting through every unrelated shot.
const only = (process.env.SHOTS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

async function shot(name, { path: urlPath, width, height = 900, actions }) {
  if (only.length && !only.some((f) => name.includes(f))) {
    return;
  }
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await page.goto(base + urlPath, { waitUntil: 'networkidle' });
  if (actions) {
    await actions(page);
  }
  const file = `${outDir}/${name}.png`;
  await page.screenshot({ path: file, fullPage: true });
  shots.push(file);
  await ctx.close();
}

const genRoster = async (page) => {
  await page.getByRole('button', { name: 'Wind', exact: true }).click();
  await page.getByRole('button', { name: /Calculate top 5 teams/ }).click();
  await page.waitForSelector('.roster-cards', { timeout: 30000 });
  await page.waitForTimeout(400);
};
const genTeam = async (page) => {
  await page.getByRole('button', { name: 'Wind', exact: true }).click();
  await page.getByRole('button', { name: /Calculate best team/ }).click();
  await page.waitForSelector('.calc-result .team-portraits', {
    timeout: 30000,
  });
  await page.waitForTimeout(400);
};

await shot('roster-mobile-empty', { path: '/roster', width: 390 });
await shot('nav-tools-dropdown', {
  path: '/roster',
  width: 390,
  actions: async (page) => {
    await page.locator('.tabs-dd-wrap .tab-dd-current').click();
    await page.waitForTimeout(250);
  },
});
await shot('nav-page-dropdown', {
  path: '/roster',
  width: 390,
  actions: async (page) => {
    await page.locator('.site-nav-left .tab-dd-current').click();
    await page.waitForTimeout(250);
  },
});
await shot('roster-mobile-results', {
  path: '/roster',
  width: 390,
  actions: genRoster,
});
await shot('roster-desktop-results', {
  path: '/roster',
  width: 1180,
  actions: genRoster,
});
await shot('team-mobile-results', {
  path: '/team',
  width: 390,
  actions: genTeam,
});
await shot('team-desktop-results', {
  path: '/team',
  width: 1180,
  actions: genTeam,
});

// Roster Sim: empty input grid (mobile) + the full copy-from-generator → sim flow
await shot('rostersim-mobile-empty', { path: '/rostersim', width: 390 });
await shot('rostersim-desktop', {
  path: '/roster',
  width: 1180,
  actions: async (page) => {
    await genRoster(page);
    await page.getByRole('button', { name: /Copy to Roster Sim/ }).click();
    await page.waitForSelector('.roster-input', { timeout: 5000 });
    await page.getByRole('button', { name: /Sim roster/ }).click();
    await page.waitForSelector('.roster-result .roster-cards', {
      timeout: 30000,
    });
    await page.waitForTimeout(400);
  },
});

// Character landing pages: the /characters index and one unit page at both
// widths. maiden-ice-rose is the design reference — she is MEASURED-tier with
// graded comps, an overload table, kit-role tags and unmodeled kit lines, so her
// page is the only one that exercises every section at once.
await shot('characters-index', { path: '/characters', width: 1180 });
await shot('unit-desktop', { path: '/unit/maiden-ice-rose', width: 1180 });
await shot('unit-mobile', { path: '/unit/maiden-ice-rose', width: 390 });
// The Overload Lines tab switcher. maiden-ice-rose is RL, so she carries all three
// tabs (an AR/SMG/SG unit has no CS Breakpoints tab — no charge frames to shorten).
// NOTE: the hero Nikke card only appears once build-infographics has run AFTER the
// vite build — `npm run build` empties dist/, which takes dist/img with it.
await shot('unit-tab-ammo', {
  path: '/unit/maiden-ice-rose',
  width: 1180,
  actions: async (page) => {
    await page.getByRole('button', { name: 'Max Ammo Breakpoints' }).click();
    await page.waitForTimeout(250);
  },
});
// Support Rankings, Team Buffs board — the one ranked chart whose bar geometry
// depends on the row set: the track spans min↔max, so a single negative row
// would move the zero axis inward and squash every positive bar. The board
// trims negatives (src/ranks/buffer-rows.ts); this shot is what shows the bars
// all starting from the left edge again.
await shot('ranks-buffer', {
  path: '/ranks/support',
  width: 1180,
  actions: async (page) => {
    await page.locator('.dpschart-bars .dpschart-row').first().waitFor({
      timeout: 15000,
    });
    await page.waitForTimeout(250);
  },
});

// The team-builder profile badge — hover-revealed on a pointer device, so the
// shot has to hover a card or it captures an empty corner.
await shot('teambuilder-profile-badge', {
  path: '/teambuilder',
  width: 1180,
  actions: async (page) => {
    await page
      .locator('.teambuilder-card-wrap')
      .first()
      .waitFor({ timeout: 15000 });
    await page.locator('.teambuilder-card-wrap').first().hover();
    await page.waitForTimeout(250);
  },
});

// The Pull Calculator, at both widths: the two ladder tables carry 7 and 5
// columns, which is where a narrow viewport squeezes first, and the stat tiles
// reflow from a 3-across row to a stack.
await shot('pull-desktop', { path: '/pull', width: 1180 });
await shot('pull-mobile', { path: '/pull', width: 390 });

// The Card Builder's pull card — the one builder type whose control is a plain
// number, so the preview has to repaint off the field rather than a pill.
await shot('builder-pull', {
  path: '/builder',
  width: 1180,
  actions: async (page) => {
    // scoped to the controls panel — the tools tab bar carries a 'Pull
    // Calculator' button of its own
    await page
      .locator('.builder-controls')
      .getByRole('button', { name: 'Pull Calculator' })
      .click();
    await page.locator('.builder-preview canvas').waitFor({ timeout: 15000 });
    await page.waitForTimeout(400);
  },
});

// Meet the dev — the project callouts (round bot avatars + the square sister-site
// logo) and the social footer, at both widths: the callout is a flex row that
// stacks on mobile, and the footer tile row is where a newly added link wraps.
await shot('dev-desktop', { path: '/dev', width: 1180 });
await shot('dev-mobile', { path: '/dev', width: 390 });

await browser.close();
stopServer();
console.log('wrote:\n' + shots.join('\n'));
process.exit(0);
