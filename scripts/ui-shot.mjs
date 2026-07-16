// Headless-browser UI screenshots for manual/visual verification of layout
// changes. Serves the built dist/ (via serve.mjs) and drives Playwright Chromium
// through a few tabs + viewports, writing PNGs to OUT (default /tmp/ui-shots).
//
//   npm run web:build && node scripts/ui-shot.mjs
//   OUT=/tmp/shots node scripts/ui-shot.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

process.env.PORT = process.env.PORT || '4319';
await import('./serve.mjs'); // static server on $PORT (listens on import)
const base = `http://localhost:${process.env.PORT}`;
const outDir = process.env.OUT || '/tmp/ui-shots';
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const shots = [];

async function shot(name, { path: urlPath, width, height = 900, actions }) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(base + urlPath, { waitUntil: 'networkidle' });
  if (actions) await actions(page);
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
  await page.waitForSelector('.calc-result .team-portraits', { timeout: 30000 });
  await page.waitForTimeout(400);
};

await shot('roster-mobile-empty', { path: '/roster', width: 390 });
await shot('nav-tools-dropdown', { path: '/roster', width: 390, actions: async (page) => {
  await page.locator('.tabs-dd-wrap .tab-dd-current').click();
  await page.waitForTimeout(250);
} });
await shot('nav-page-dropdown', { path: '/roster', width: 390, actions: async (page) => {
  await page.locator('.site-nav-left .tab-dd-current').click();
  await page.waitForTimeout(250);
} });
await shot('roster-mobile-results', { path: '/roster', width: 390, actions: genRoster });
await shot('roster-desktop-results', { path: '/roster', width: 1180, actions: genRoster });
await shot('team-mobile-results', { path: '/team', width: 390, actions: genTeam });
await shot('team-desktop-results', { path: '/team', width: 1180, actions: genTeam });

// Roster Sim: empty input grid (mobile) + the full copy-from-generator → sim flow
await shot('rostersim-mobile-empty', { path: '/rostersim', width: 390 });
await shot('rostersim-desktop', { path: '/roster', width: 1180, actions: async (page) => {
  await genRoster(page);
  await page.getByRole('button', { name: /Copy to Roster Sim/ }).click();
  await page.waitForSelector('.roster-input', { timeout: 5000 });
  await page.getByRole('button', { name: /Sim roster/ }).click();
  await page.waitForSelector('.roster-result .roster-cards', { timeout: 30000 });
  await page.waitForTimeout(400);
} });

await browser.close();
console.log('wrote:\n' + shots.join('\n'));
process.exit(0);
