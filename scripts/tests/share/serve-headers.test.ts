// Integration test for scripts/serve.mjs cache-control classes (plan §2:
// content-hashed URLs are immutable; the manifest and the unversioned data
// JSONs must revalidate — the blanket `immutable` this guards was a live bug).
// Serves a temp dist/ tree via the REAL server (node:http on an ephemeral
// port) and asserts the two cache-control classes per URL pattern.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SERVE = new URL('../../serve.mjs', import.meta.url);
const IMMUTABLE = 'public, max-age=31536000, immutable';
const NO_CACHE = 'no-cache';

// minimal SPA shell — sendIndex injects per-tab meta into it
const INDEX = `<!doctype html><html><head><title>t</title>
<meta name="description" content="d"><link rel="canonical" href="x">
<meta property="og:title" content="t"><meta property="og:description" content="d">
<meta property="og:url" content="u"><meta name="twitter:title" content="t">
<meta name="twitter:description" content="d"></head><body></body></html>`;

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
  put('ol-default.json', '{}');
  put('img/manifest.json', '{}');
  put('img/dps/solo.eleweak.c100.8of12.all.deadbeef.png', 'png');
  put('img/unit/liter.0123abcd.png', 'png');
  put('img/portraits/liter-128.webp', 'webp');
  put('fonts/Roboto-Regular.woff2', 'font');

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
    expect(await cacheOf('/img/unit/liter.0123abcd.png')).toBe(IMMUTABLE);
    expect(await cacheOf('/fonts/Roboto-Regular.woff2')).toBe(IMMUTABLE);
  });

  it('unversioned mutable JSON is no-cache (the live bug this fixes)', async () => {
    expect(await cacheOf('/dpschart.json')).toBe(NO_CACHE);
    expect(await cacheOf('/burstgen.json')).toBe(NO_CACHE);
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
    }
    // If-Modified-Since (applies when If-None-Match is absent)
    const ims = await fetch(`${base}/img/portraits/liter-128.webp`, {
      headers: { 'if-modified-since': lastMod! },
    });
    expect(ims.status).toBe(304);
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
  });

  it('index.html and the SPA fallback are no-cache with OG injection intact', async () => {
    const res = await fetch(`${base}/dpschart`);
    expect(res.headers.get('cache-control')).toBe(NO_CACHE);
    const html = await res.text();
    expect(html).toContain('NIKKE DPS Rankings'); // injected tab title
  });

  it('serves hashed PNGs with the right MIME', async () => {
    const res = await fetch(`${base}/img/unit/liter.0123abcd.png`);
    expect(res.headers.get('content-type')).toBe('image/png');
  });
});
