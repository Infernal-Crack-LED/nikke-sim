// Integration test for scripts/serve.mjs cache-control classes (plan §2:
// content-hashed URLs are immutable; the manifest and the unversioned data
// JSONs must revalidate — the blanket `immutable` this guards was a live bug).
// Serves a temp dist/ tree via the REAL server (node:http on an ephemeral
// port) and asserts the two cache-control classes per URL pattern.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROUTES, hrefFor } from '../../../web/src/router.js';

const SERVE = new URL('../../serve.mjs', import.meta.url);
const IMMUTABLE = 'public, max-age=31536000, immutable';
const NO_CACHE = 'no-cache';

// minimal SPA shell — sendIndex injects per-tab meta into it. Wrapped
// attribute-per-line like the real (Prettier-formatted, vite-built)
// dist/index.html — a single-line fixture here would hide a regex that only
// matches attributes on one line (the 2026-07-31 bug: og:title/description
// and twitter:title/description silently kept their default content in
// every real deploy because vite does not collapse index.html to one line).
const INDEX = `<!doctype html><html><head>
<title>
  t
</title>
<meta
  name="description"
  content="d"
/>
<link rel="canonical" href="x" />
<meta
  property="og:title"
  content="t"
/>
<meta
  property="og:description"
  content="d"
/>
<meta property="og:url" content="u" />
<meta property="og:image" content="https://nikkesim.app/og.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta
  property="og:image:alt"
  content="d"
/>
<meta
  name="twitter:title"
  content="t"
/>
<meta
  name="twitter:description"
  content="d"
/>
<meta name="twitter:image" content="https://nikkesim.app/og.png" />
</head><body></body></html>`;

let dist: string;
let child: ChildProcess;
let base: string;

beforeAll(async () => {
  dist = mkdtempSync(join(tmpdir(), 'serve-dist-'));
  const put = (rel: string, body: string) => {
    const p = join(dist, rel);
    mkdirSync(join(p, '..'), { recursive: true });
    writeFileSync(p, body);
  };
  put('index.html', INDEX);
  put('assets/App-AbCd1234.js', 'js');
  put('dpschart.json', '{}');
  put('burstgen.json', '{}');
  put('b1b2dps.json', '{}');
  put('ol-default.json', '{}');
  // The builder tab's og:image resolves 'unit/maiden-ice-rose.discord'
  // against this manifest — real shape (width/height in physical px, the
  // hash embedded in `file`).
  put(
    'img/manifest.json',
    JSON.stringify({
      generatedAt: 't',
      images: {
        'unit/maiden-ice-rose.discord': {
          file: 'unit/maiden-ice-rose.discord.9fedcba1.webp',
          hash: '9fedcba1',
          bytes: 105_574,
          width: 2400,
          height: 1200,
        },
      },
      notSimSupported: [],
    })
  );
  put('img/dps/solo.eleweak.c100.8of12.all.deadbeef.png', 'png');
  // Unit cards are the only WEBP in the hashed set (build-infographics emits
  // unit/<slug>.<variant> at ext webp, every other card at png) — pinned in both
  // shapes so the extension-anchored matcher can't lose one.
  put('img/unit/liter.discord.0123abcd.webp', 'webp');
  put('img/unit/liter.twitter.0123abcd.webp', 'webp');
  put('img/unit/maiden-ice-rose.discord.9fedcba1.webp', 'webp');
  put('img/portraits/liter-128.webp', 'webp');
  put('fonts/Roboto-Regular.woff2', 'font');
  put('robots.txt', 'User-agent: *\nAllow: /\n');
  // Copy the real sitemap.xml so we can assert every advertised URL is a known
  // route and serves with the correct content type.
  const sitemapSrc = fileURLToPath(
    new URL('../../../web/public/sitemap.xml', import.meta.url)
  );
  put('sitemap.xml', readFileSync(sitemapSrc, 'utf8'));

  child = spawn('node', [SERVE.pathname], {
    env: { ...process.env, PORT: '0', SERVE_DIST: dist },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  base = await new Promise<string>((resolvePromise, reject) => {
    child.stdout!.on('data', (chunk: Buffer) => {
      const m = /0\.0\.0\.0:(\d+)/.exec(chunk.toString());
      if (m) {
        resolvePromise(`http://127.0.0.1:${m[1]}`);
      }
    });
    child.on('error', reject);
    child.on('exit', (code) =>
      reject(new Error(`serve.mjs exited early (${code})`))
    );
  });
});

afterAll(() => {
  child.kill();
  rmSync(dist, { recursive: true, force: true });
});

const cacheOf = async (path: string): Promise<string | null> =>
  (await fetch(`${base}${path}`)).headers.get('cache-control');

describe('serve.mjs cache-control classes', () => {
  it('content-hashed assets are immutable', async () => {
    expect(await cacheOf('/assets/App-AbCd1234.js')).toBe(IMMUTABLE);
    expect(
      await cacheOf('/img/dps/solo.eleweak.c100.8of12.all.deadbeef.png')
    ).toBe(IMMUTABLE);
    expect(await cacheOf('/img/unit/liter.discord.0123abcd.webp')).toBe(
      IMMUTABLE
    );
    expect(await cacheOf('/img/unit/liter.twitter.0123abcd.webp')).toBe(
      IMMUTABLE
    );
    expect(await cacheOf('/fonts/Roboto-Regular.woff2')).toBe(IMMUTABLE);
  });

  it('unversioned mutable JSON is no-cache (the live bug this fixes)', async () => {
    expect(await cacheOf('/dpschart.json')).toBe(NO_CACHE);
    expect(await cacheOf('/burstgen.json')).toBe(NO_CACHE);
    // listed explicitly in MUTABLE_PATHS only since 2026-08-04 — before that it
    // was no-cache by fallback accident (artifact-decoupling plan §7)
    expect(await cacheOf('/b1b2dps.json')).toBe(NO_CACHE);
    expect(await cacheOf('/ol-default.json')).toBe(NO_CACHE);
    expect(await cacheOf('/img/manifest.json')).toBe(NO_CACHE);
  });

  it('static-but-mutable art revalidates', async () => {
    expect(await cacheOf('/img/portraits/liter-128.webp')).toBe(NO_CACHE);
  });

  it('no-cache art carries a validator and revalidates to a 304', async () => {
    // 384 portrait webps are no-cache — without an ETag that is a full ~5.7 MB
    // re-download per page load (the cache-class fix's regression).
    const res = await fetch(`${base}/img/portraits/liter-128.webp`);
    expect(res.status).toBe(200);
    const etag = res.headers.get('etag');
    expect(etag).toBeTruthy();
    const lastMod = res.headers.get('last-modified');
    expect(lastMod).toBeTruthy();
    // If-None-Match: exact etag, and the RFC 7232 wildcard
    for (const inm of [etag!, '*']) {
      const re = await fetch(`${base}/img/portraits/liter-128.webp`, {
        headers: { 'if-none-match': inm },
      });
      expect(re.status).toBe(304);
      // the 304 must carry the SAME validators as the 200 it validates
      expect(re.headers.get('last-modified')).toBe(lastMod);
    }
    // If-Modified-Since (applies when If-None-Match is absent)
    const ims = await fetch(`${base}/img/portraits/liter-128.webp`, {
      headers: { 'if-modified-since': lastMod! },
    });
    expect(ims.status).toBe(304);
    expect(ims.headers.get('last-modified')).toBe(lastMod);
    // negative cases — without these, `!!header → 304` passes too:
    // a date strictly older than mtime must re-serve in full (pins the
    // direction of the >= comparison)
    const stale = await fetch(`${base}/img/portraits/liter-128.webp`, {
      headers: { 'if-modified-since': 'Thu, 01 Jan 1970 00:00:00 GMT' },
    });
    expect(stale.status).toBe(200);
    expect((await stale.arrayBuffer()).byteLength).toBeGreaterThan(0);
    // a NON-matching etag must re-serve even with a valid IMS alongside —
    // the only case that pins RFC 7232 precedence (INM beats IMS)
    const miss = await fetch(`${base}/img/portraits/liter-128.webp`, {
      headers: {
        'if-none-match': 'W/"0-0"',
        'if-modified-since': lastMod!,
      },
    });
    expect(miss.status).toBe(200);
    expect((await miss.arrayBuffer()).byteLength).toBeGreaterThan(0);
  });

  it('index.html and the SPA fallback are no-cache with OG injection intact', async () => {
    const res = await fetch(`${base}/dpschart`);
    expect(res.headers.get('cache-control')).toBe(NO_CACHE);
    const html = await res.text();
    expect(html).toContain('NIKKE DPS Rankings'); // injected tab title
  });

  // Pins the 2026-07-31 fix: the real (Prettier-formatted) dist/index.html
  // wraps every meta tag's attributes across lines, and the old
  // literal-space regexes silently no-op'd on all of them except <title> —
  // so a shared /dpschart link's Discord/Twitter embed showed the SITE
  // og:title/og:description, not the tab's, in every real deploy.
  it('replaces og:title/og:description/twitter:* content, not just <title>', async () => {
    const html = await (await fetch(`${base}/dpschart`)).text();
    const tag = (attr: string) =>
      new RegExp(
        `<meta\\s+(?:property|name)="${attr}"\\s+content="([^"]*)"`
      ).exec(html)?.[1];
    expect(tag('og:title')).toContain('NIKKE DPS Rankings');
    expect(tag('og:description')).toContain('Ranked DPS');
    expect(tag('twitter:title')).toContain('NIKKE DPS Rankings');
    expect(tag('twitter:description')).toContain('Ranked DPS');
    const desc = /<meta\s+name="description"\s+content="([^"]*)"/.exec(
      html
    )?.[1];
    expect(desc).toContain('Ranked DPS');
  });

  it('/builder gets its custom og:image from the manifest; other tabs keep the generic one', async () => {
    const builderHtml = await (await fetch(`${base}/builder`)).text();
    expect(builderHtml).toContain(
      'https://nikkesim.app/img/unit/maiden-ice-rose.discord.9fedcba1.webp'
    );
    expect(builderHtml).toMatch(/property="og:image:width"\s+content="2400"/);
    expect(builderHtml).toMatch(/property="og:image:height"\s+content="1200"/);
    const twitterImg = /<meta\s+name="twitter:image"\s+content="([^"]*)"/.exec(
      builderHtml
    )?.[1];
    expect(twitterImg).toBe(
      'https://nikkesim.app/img/unit/maiden-ice-rose.discord.9fedcba1.webp'
    );

    const rootHtml = await (await fetch(`${base}/`)).text();
    expect(rootHtml).toContain('https://nikkesim.app/og.png');
    expect(rootHtml).not.toContain('maiden-ice-rose');
  });

  it('serves hashed images with the right MIME', async () => {
    const png = await fetch(
      `${base}/img/dps/solo.eleweak.c100.8of12.all.deadbeef.png`
    );
    expect(png.headers.get('content-type')).toBe('image/png');
    const webp = await fetch(`${base}/img/unit/liter.discord.0123abcd.webp`);
    expect(webp.headers.get('content-type')).toBe('image/webp');
  });

  it('serves robots.txt as text/plain', async () => {
    const res = await fetch(`${base}/robots.txt`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/plain; charset=utf-8');
  });

  it('normalizes trailing slashes in canonical and og:url', async () => {
    const html = await (await fetch(`${base}/ranks/`)).text();
    const canonical = /<link rel="canonical" href="([^"]*)"/.exec(html)?.[1];
    const ogUrl = /<meta property="og:url" content="([^"]*)"/.exec(html)?.[1];
    expect(canonical).toBe('https://nikkesim.app/ranks');
    expect(ogUrl).toBe('https://nikkesim.app/ranks');
  });

  it('collapses repeated slashes in canonical and og:url', async () => {
    const html = await (await fetch(`${base}//ranks`)).text();
    const canonical = /<link rel="canonical" href="([^"]*)"/.exec(html)?.[1];
    const ogUrl = /<meta property="og:url" content="([^"]*)"/.exec(html)?.[1];
    expect(canonical).toBe('https://nikkesim.app/ranks');
    expect(ogUrl).toBe('https://nikkesim.app/ranks');
  });

  it('301-redirects legacy aliases to their canonical path', async () => {
    const dpschart = await fetch(`${base}/dpschart`, { redirect: 'manual' });
    expect(dpschart.status).toBe(301);
    expect(dpschart.headers.get('location')).toBe('/ranks');

    const dps = await fetch(`${base}/dps`, { redirect: 'manual' });
    expect(dps.status).toBe(301);
    expect(dps.headers.get('location')).toBe('/ranks/compare');

    const sim = await fetch(`${base}/sim`, { redirect: 'manual' });
    expect(sim.status).toBe(301);
    expect(sim.headers.get('location')).toBe('/');

    const indexHtml = await fetch(`${base}/index.html`, { redirect: 'manual' });
    expect(indexHtml.status).toBe(301);
    expect(indexHtml.headers.get('location')).toBe('/');

    const dpschartQuery = await fetch(`${base}/dpschart?foo=bar`, {
      redirect: 'manual',
    });
    expect(dpschartQuery.status).toBe(301);
    expect(dpschartQuery.headers.get('location')).toBe('/ranks?foo=bar');

    const dpschartSlash = await fetch(`${base}/dpschart/`, {
      redirect: 'manual',
    });
    expect(dpschartSlash.status).toBe(301);
    expect(dpschartSlash.headers.get('location')).toBe('/ranks');

    // Mixed-case legacy URLs must redirect too — they are not known SPA routes.
    const dpschartMixed = await fetch(`${base}/DpsChart`, {
      redirect: 'manual',
    });
    expect(dpschartMixed.status).toBe(301);
    expect(dpschartMixed.headers.get('location')).toBe('/ranks');
  });

  it('treats mixed-case known routes as known and canonicalizes to lowercase', async () => {
    const html = await (await fetch(`${base}/HowTo`)).text();
    const canonical = /<link rel="canonical" href="([^"]*)"/.exec(html)?.[1];
    expect(canonical).toBe('https://nikkesim.app/howto');
    const res = await fetch(`${base}/RANKS/support`);
    expect(res.status).toBe(200);
    const liter = await fetch(`${base}/unit/Liter`);
    expect(liter.status).toBe(200);
    expect(await liter.text()).toContain('unit-ol-table');
  });

  it('collapses interior repeated slashes into the canonical route', async () => {
    const liter = await fetch(`${base}/unit//liter`);
    expect(liter.status).toBe(200);
    const html = await liter.text();
    expect(html).toContain('unit-ol-table');
    const canonical = /<link rel="canonical" href="([^"]*)"/.exec(html)?.[1];
    expect(canonical).toBe('https://nikkesim.app/unit/liter');
  });

  it('returns 404 for unknown SPA routes instead of a soft 404', async () => {
    const res = await fetch(`${base}/definitely-not-a-page`);
    expect(res.status).toBe(404);
    expect(res.headers.get('cache-control')).toBe(NO_CACHE);
    const html = await res.text();
    expect(html).toContain('<title>'); // still serves the SPA shell
    const canonical = /<link rel="canonical" href="([^"]*)"/.exec(html)?.[1];
    expect(canonical).toBe('https://nikkesim.app/');
    const ogUrl = /<meta property="og:url" content="([^"]*)"/.exec(html)?.[1];
    expect(ogUrl).toBe('https://nikkesim.app/');
  });

  it('missing static assets return 404 text/plain, not an HTML shell', async () => {
    const res = await fetch(`${base}/assets/index-deadbeef.js`);
    expect(res.status).toBe(404);
    expect(res.headers.get('content-type')).toBe('text/plain; charset=utf-8');
  });

  it('directories without an index.html return 404, not a soft 200 homepage', async () => {
    for (const path of ['/assets', '/img', '/fonts']) {
      const res = await fetch(`${base}${path}`);
      expect(res.status).toBe(404);
      const canonical = /<link rel="canonical" href="([^"]*)"/.exec(
        await res.text()
      )?.[1];
      expect(canonical).toBe('https://nikkesim.app/');
    }
  });

  it('prototype-key paths return 404, not 500', async () => {
    for (const path of ['/constructor', '/__proto__', '/toString']) {
      const res = await fetch(`${base}${path}`);
      expect(res.status).toBe(404);
    }
  });

  it('/ranks/garbage is a 404, not a soft 200', async () => {
    const res = await fetch(`${base}/ranks/garbage`);
    expect(res.status).toBe(404);
  });

  it('rejects extra path segments on known top-level and unit routes', async () => {
    for (const path of [
      '/howto/garbage',
      '/mechanics/garbage',
      '/unit/liter/garbage',
    ]) {
      const res = await fetch(`${base}${path}`);
      expect(res.status).toBe(404);
    }
  });

  it('breadcrumbs do not duplicate item URLs on section-parent pages', async () => {
    const breadcrumb = (html: string) => {
      const raw = /<script type="application\/ld\+json">([^<]+)<\/script>/.exec(
        html
      )?.[1];
      if (!raw) {
        return null;
      }
      return JSON.parse(raw) as {
        itemListElement?: { name?: string; item?: string }[];
      };
    };
    for (const path of ['/overload', '/teambuilder', '/mechanics', '/team']) {
      const html = await (await fetch(`${base}${path}`)).text();
      const data = breadcrumb(html);
      expect(data).toBeTruthy();
      const items = data!.itemListElement ?? [];
      const urls = items.map((e) => e.item);
      expect(new Set(urls).size).toBe(urls.length);
    }
    // Section-parent pages must keep the leaf's own label, not the ancestor's.
    const cases: Array<[string, string]> = [
      ['/teambuilder', 'Team Builder'],
      ['/mechanics', 'Mechanics'],
      ['/overload', 'Overload Optimizer'],
      ['/team', 'Team Generator'],
    ];
    for (const [path, leafName] of cases) {
      const html = await (await fetch(`${base}${path}`)).text();
      const data = breadcrumb(html);
      const items = data!.itemListElement ?? [];
      expect(items[items.length - 1].name).toBe(leafName);
    }
  });

  it('serves sitemap.xml with application/xml and every <loc> URL returns 200', async () => {
    const sitemapRes = await fetch(`${base}/sitemap.xml`);
    expect(sitemapRes.status).toBe(200);
    expect(sitemapRes.headers.get('content-type')).toBe(
      'application/xml; charset=utf-8'
    );
    const sitemap = await sitemapRes.text();
    const locs = Array.from(sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)).map(
      (m) => new URL(m[1]).pathname
    );
    expect(locs.length).toBeGreaterThan(50);
    for (const path of locs) {
      const res = await fetch(`${base}${path}`);
      expect(res.status).toBe(200);
    }
  });

  it('/unit/liter serves with the unit name and rendered overload lines in the body', async () => {
    const res = await fetch(`${base}/unit/liter`);
    expect(res.status).toBe(200);
    const html = await res.text();
    const body = html.split('</head>')[1] ?? '';
    expect(body).toContain('unit-page');
    // The no-JS body carries the page's real content, not a stub: the ranked
    // overload table, the kit (the unique text a crawler most needs), and the
    // model-status badge. Liter is simulated and hand-modelled, so all three are
    // present for her.
    expect(body).toContain('Overload Lines');
    expect(body).toContain('unit-ol-table');
    expect(body).toContain('<h2>Skills</h2>');
    expect(body).toContain('Sim status');
    expect(body).toMatch(/\d+× /);
    // It must never advertise the OTHER overload artifact's pick: ol-optimal.json
    // disagrees with this ranking for most units, and indexing a different
    // recommendation than the visitor sees is worse than indexing none.
    expect(body).not.toContain('No optimal line data yet.');
  });

  it('/characters serves every unit link with JS off', async () => {
    const res = await fetch(`${base}/characters`);
    expect(res.status).toBe(200);
    const html = await res.text();
    const body = html.split('</head>')[1] ?? '';
    // The index exists to be a crawl hub — its whole value is that a crawler
    // that runs no JS can still follow a link to every character. A React-only
    // grid would look fine in a browser and be worth nothing here.
    const hrefs = new Set(
      [...body.matchAll(/href="(\/unit\/[a-z0-9-]+)"/g)].map((m) => m[1])
    );
    expect(hrefs.size).toBeGreaterThanOrEqual(190);
    expect(body).toContain('characters-page');
  });

  // These two routes are the reason non-Google AI crawlers (GPTBot,
  // PerplexityBot et al., allowlisted in robots.txt) were served nothing but a
  // meta description: they don't execute JS, and the prerender pass that was
  // supposed to cover them lived in a build script the deploy never invoked.
  // Assert the served bytes, not the existence of a build artifact — the old
  // smoke checked for a file and SKIPPED when it was absent, which is exactly
  // how the gap stayed green for as long as it did.
  it.each([
    ['/mechanics', 'mech-page', 'Game mechanics'],
    ['/howto', 'howto-page', 'How to use this site'],
  ])('%s serves its prose in the body with JS off', async (path, cls, h1) => {
    const res = await fetch(`${base}${path}`);
    expect(res.status).toBe(200);
    const html = await res.text();
    const body = html.split('</head>')[1] ?? '';
    expect(body).toContain(cls);
    expect(body).toContain(`<h1>${h1}</h1>`);
    // Section headings and list items, i.e. the actual indexable copy rather
    // than a shell that merely carries the right class name.
    expect((body.match(/<h2>/g) ?? []).length).toBeGreaterThanOrEqual(5);
    // /mechanics is bullet lists; /howto is mostly a glossary <dl>. Count both
    // so the assertion tracks "carries itemised copy" rather than one page's
    // markup shape.
    expect((body.match(/<li>|<dd>/g) ?? []).length).toBeGreaterThanOrEqual(10);
    const text = body
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    expect(text.length).toBeGreaterThan(2000);
  });

  it('previously-valid top-level routes still return 200', async () => {
    for (const path of [
      '/dev',
      '/credits',
      '/roster-sync',
      '/builder',
      '/doll',
      '/charge',
      '/resources',
      '/howto',
      '/mechanics',
    ]) {
      const res = await fetch(`${base}${path}`);
      expect(res.status).toBe(200);
    }
  });

  it('every client ROUTES href returns 200 (server/client route list parity)', async () => {
    for (const route of ROUTES) {
      const path = hrefFor(route);
      const res = await fetch(`${base}${path}`);
      expect(res.status).toBe(200);
    }
  });
});
