// Compiled-bundle smoke test (QUEUE follow-up 3): serve-api.test.ts boots the
// server from SOURCE (tsx), so dist-server/ — the thing the deploy actually
// runs — was exercised only at deploy. This test builds the real bundle
// (scripts/build-server.mjs → dist-server/), boots it as a subprocess on an
// ephemeral port against a minimal temp dist/, and asserts the production
// contract end-to-end: manifest no-cache, an API miss is an honest 404 (not
// the SPA fallback), and team.png 302s to a cache URL that serves a real PNG.
//
// The bundle resolves its fonts/icon via env-defaults.ts (dist-server/assets,
// copied by the build) and data/characters.json via REPO_ROOT (dist-server/..
// = the repo root), so no data fixtures are needed — only the static tree.
// Runs in the default suite: the whole file is ~5-10s.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { spawn, type ChildProcess } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodeBuild, type Build } from '../../../src/share/build-code.js';

const execFileAsync = promisify(execFile);
const ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const NO_CACHE = 'no-cache';

// minimal SPA shell — sendIndex injects per-tab meta into it
const INDEX = `<!doctype html><html><head><title>t</title>
<meta name="description" content="d"><link rel="canonical" href="x">
<meta property="og:title" content="t"><meta property="og:description" content="d">
<meta property="og:url" content="u"><meta name="twitter:title" content="t">
<meta name="twitter:description" content="d"></head><body></body></html>`;

// A valid team build over REAL slugs (the bundle reads the real
// data/characters.json from the repo root).
const TEAM_CODE = encodeBuild({
  v: 1,
  g: {
    weakness: 'Water',
    bossDef: '0',
    core: 1,
    coreCustom: false,
    coreCustomVal: '10',
    level: '400',
  },
  s: ['liter', 'crown', 'naga', 'modernia', 'alice'].map((slug) => ({
    slug,
    cubeId: 'resilience',
    cubeLevel: 7,
    ol: 5,
    doll: true,
    stars: 3,
    core: 0,
    skill1: 10,
    skill2: 10,
    burst: 10,
  })),
} satisfies Build);

let dist: string;
let cacheDir: string;
let child: ChildProcess;
let base: string;

beforeAll(async () => {
  // Build the real production bundle (dist-server/index.js + assets).
  await execFileAsync('node', ['scripts/build-server.mjs'], { cwd: ROOT });

  dist = mkdtempSync(join(tmpdir(), 'bundle-dist-'));
  cacheDir = mkdtempSync(join(tmpdir(), 'bundle-cache-'));
  const put = (rel: string, body: string) => {
    const p = join(dist, rel);
    mkdirSync(join(p, '..'), { recursive: true });
    writeFileSync(p, body);
  };
  put('index.html', INDEX);
  put('assets/App-AbCd1234.js', 'js');
  put('img/manifest.json', '{"generatedAt":"t","images":{}}');

  child = spawn('node', [join(ROOT, 'dist-server', 'index.js')], {
    env: {
      ...process.env,
      PORT: '0',
      SERVE_DIST: dist,
      NIKKESIM_RENDER_CACHE_DIR: cacheDir,
    },
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
      reject(new Error(`dist-server exited early (${code})`))
    );
  });
}, 120_000); // esbuild + native-module load, generous for a cold machine

afterAll(() => {
  child.kill();
  rmSync(dist, { recursive: true, force: true });
  rmSync(cacheDir, { recursive: true, force: true });
});

describe('compiled dist-server bundle', () => {
  it('serves the manifest no-cache', async () => {
    const res = await fetch(`${base}/api/v1/img/manifest.json`);
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe(NO_CACHE);
  });

  it('a missing PNG is an honest 404, never the SPA fallback', async () => {
    const res = await fetch(`${base}/api/v1/img/unit/nope.00000000.png`);
    expect(res.status).toBe(404);
    expect(res.headers.get('content-type')).not.toContain('text/html');
    expect(await res.text()).not.toContain('<!doctype html>');
  });

  it('team.png 302s to a cache URL that serves a real PNG', async () => {
    const res = await fetch(`${base}/api/v1/img/team.png?b=${TEAM_CODE}`, {
      redirect: 'manual',
    });
    expect(res.status).toBe(302);
    const loc = res.headers.get('location')!;
    expect(loc).toMatch(/^\/api\/v1\/img\/cache\/team\.[0-9a-f]{16}\.png$/);

    const png = await fetch(`${base}${loc}`);
    expect(png.status).toBe(200);
    expect(png.headers.get('content-type')).toBe('image/png');
    const body = Buffer.from(await png.arrayBuffer());
    expect(
      body
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    ).toBe(true);
    // a fontless host produces a VALID small PNG with zero text — size-gate it
    expect(body.length).toBeGreaterThan(10_000);
  });
});
