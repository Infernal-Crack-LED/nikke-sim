// Prerender content-heavy static pages so crawlers see real HTML without
// executing JS. We boot the real server, load each route in Playwright, wait
// for the page-specific heading, and save the final DOM.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Browser, BrowserType, Page } from 'playwright';
import { createNikkesimServer, REPO_ROOT } from '../src/server/app.js';

const PATHS: Array<{ path: string; waitForText: string }> = [
  { path: '/howto', waitForText: 'How to use this site' },
  { path: '/mechanics', waitForText: 'Game mechanics' },
];

const distDir = process.env.SERVE_DIST ?? join(REPO_ROOT, 'dist');

async function loadChromium(): Promise<BrowserType | null> {
  try {
    const pw = await import('playwright');
    return pw.chromium;
  } catch (err) {
    console.warn(
      'prerender: Playwright not available; skipping prerender (SPA fallback remains available)',
      err
    );
    return null;
  }
}

// The server injects Umami and a BreadcrumbList JSON-LD on every request. We
// strip those from the saved DOM so request-time injection stays live: the
// Umami URL/ID can change without a rebuild, and breadcrumb logic can evolve
// without re-prerendering. React-rendered JSON-LD (FAQPage / WebPage / etc.)
// is left intact.
function stripServerArtifacts() {
  document.querySelectorAll('script[data-website-id]').forEach((el) => {
    el.remove();
  });
  document
    .querySelectorAll('script[type="application/ld+json"]')
    .forEach((el) => {
      if (el.textContent?.includes('"@type":"BreadcrumbList"')) {
        el.remove();
      }
    });
}

async function renderPage(
  page: Page,
  base: string,
  path: string,
  waitForText: string
): Promise<string> {
  await page.goto(`${base}${path}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(
    (text: string) => document.body.innerText.includes(text),
    waitForText
  );
  await page.evaluate(stripServerArtifacts);
  return page.content();
}

async function main(): Promise<{ attempted: boolean; okCount: number }> {
  const chromium = await loadChromium();
  if (!chromium) {
    return { attempted: false, okCount: 0 };
  }

  const server = await createNikkesimServer({
    distDir,
    // Prerender runs during build:deploy where UMAMI_URL may be set. Disable
    // analytics injection for the prerender crawl so we do not fire pageviews
    // into production analytics on every deploy.
    umamiUrl: '',
    umamiWebsiteId: '',
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address();
  if (!addr || typeof addr === 'string') {
    throw new Error('server did not bind to a port');
  }
  const base = `http://127.0.0.1:${addr.port}`;

  let browser: Browser;
  try {
    browser = await chromium.launch();
  } catch (err) {
    console.warn(
      'prerender: could not launch Chromium; skipping prerender (SPA fallback remains available)',
      err
    );
    await new Promise<void>((resolve) => server.close(() => resolve()));
    return { attempted: false, okCount: 0 };
  }

  const context = await browser.newContext();
  const results: Array<{
    path: string;
    ok: boolean;
    bytes?: number;
    error?: unknown;
  }> = [];

  try {
    for (const { path, waitForText } of PATHS) {
      try {
        const page = await context.newPage();
        const html = await renderPage(page, base, path, waitForText);
        const outFile = join(distDir, path, 'index.html');
        mkdirSync(dirname(outFile), { recursive: true });
        writeFileSync(outFile, html, 'utf8');
        await page.close();
        console.log(`prerendered ${path} → ${outFile} (${html.length} bytes)`);
        results.push({ path, ok: true, bytes: html.length });
      } catch (err) {
        console.warn(`prerender: failed for ${path}`, err);
        results.push({ path, ok: false, error: err });
      }
    }
  } finally {
    await browser.close();
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }

  const okCount = results.filter((r) => r.ok).length;
  console.log(
    `PRERENDER: ${okCount}/${results.length} routes rendered successfully`
  );
  return { attempted: true, okCount };
}

main()
  .then(({ attempted, okCount }) => {
    // Playwright/Chromium being absent is non-fatal: the SPA still serves the
    // same routes. If we got as far as rendering, though, a partial success is
    // a deploy failure — the prerendered files are part of the build contract.
    if (attempted && okCount < PATHS.length) {
      process.exit(1);
    }
    process.exit(0);
  })
  .catch((err) => {
    // Any exception that reaches here means the prerender harness itself broke
    // (Playwright absence / launch failure is already handled above and exits
    // 0). Fail the build so a broken harness does not ship a silently-degraded
    // deploy.
    console.error('prerender: unexpected failure; aborting build', err);
    process.exit(1);
  });
