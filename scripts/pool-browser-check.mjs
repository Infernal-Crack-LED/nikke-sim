// Browser verification for the roster-generator worker pool (perf plan item 1b).
// Workers don't run under Node/JSDOM, so this drives the BUILT app in real
// Chromium and proves two things the vitest parity gate can't:
//   1. PARITY — the pool path and the in-process fallback (forced via the
//      __NIKKE_NO_POOL__ hook) produce the SAME roster (identical per-team +
//      total damages). This is the in-browser form of the byte-identical gate.
//   2. WALL CLOCK — the pool run is faster than the single-thread fallback.
//
//   npm run web:build && node scripts/pool-browser-check.mjs
//
// Exit non-zero if the rosters differ (a real regression). The speed line is
// informational (a slow CI box can invert it; identity is the hard gate).
import { chromium } from 'playwright';

process.env.PORT = process.env.PORT || '4321';
await import('./serve.mjs');
const base = `http://localhost:${process.env.PORT}`;

// Read a stable signature of the roster result: every .rg-dmg value in order
// (per-team damages + roster total). Any team-composition difference moves a
// damage, so equal signatures ⇒ identical rosters.
async function generate(browser, { noPool }) {
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const page = await ctx.newPage();
  if (noPool)
    await page.addInitScript(() => {
      globalThis.__NIKKE_NO_POOL__ = true;
    });
  await page.goto(`${base}/roster`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Wind', exact: true }).click();
  const t0 = Date.now();
  await page.getByRole('button', { name: /Calculate top 5 teams/ }).click();
  await page.waitForSelector('.roster-cards', { timeout: 60000 });
  // wait until the roster total has rendered a non-empty value
  await page.waitForFunction(
    () => {
      const el = document.querySelector('.rg-dmg.big');
      return el && el.textContent && el.textContent.trim().length > 0;
    },
    { timeout: 60000 },
  );
  const ms = Date.now() - t0;
  const sig = await page.$$eval('.rg-dmg', (els) =>
    els.map((e) => e.textContent.trim()),
  );
  await ctx.close();
  return { sig, ms };
}

// Same-context re-run: click Calculate twice on ONE page. The second run should be
// near-instant because the shared cross-run cache (item 5) reuses every sim.
async function rerun(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${base}/roster`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Wind', exact: true }).click();
  const time = async () => {
    const t0 = Date.now();
    await page.getByRole('button', { name: /Calculate top 5 teams/ }).click();
    await page.waitForFunction(
      () => {
        const el = document.querySelector('.rg-dmg.big');
        return el && el.textContent && el.textContent.trim().length > 0;
      },
      { timeout: 60000 },
    );
    return Date.now() - t0;
  };
  const first = await time();
  await page.waitForTimeout(200);
  const second = await time();
  await ctx.close();
  return { first, second };
}

const browser = await chromium.launch();
try {
  const pool = await generate(browser, { noPool: false });
  const solo = await generate(browser, { noPool: true });
  const rr = await rerun(browser);

  const same = JSON.stringify(pool.sig) === JSON.stringify(solo.sig);
  console.log('pool     :', pool.sig.join(' | '), `(${pool.ms}ms)`);
  console.log('fallback :', solo.sig.join(' | '), `(${solo.ms}ms)`);
  console.log(
    same ? '✓ PARITY: pool roster === fallback roster' : '✗ PARITY FAILED',
  );
  const speedup = solo.ms / pool.ms;
  console.log(
    `wall clock: pool ${pool.ms}ms vs fallback ${solo.ms}ms (${speedup.toFixed(2)}× )`,
  );
  console.log(
    `cross-run cache (item 5): 1st ${rr.first}ms → 2nd ${rr.second}ms (${(rr.first / rr.second).toFixed(1)}× faster re-run)`,
  );
  if (!same) {
    console.error('ROSTER MISMATCH — pool path is not byte-identical');
    process.exitCode = 1;
  }
} finally {
  await browser.close();
  process.exit(process.exitCode ?? 0);
}
