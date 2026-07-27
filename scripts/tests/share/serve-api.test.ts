// Integration test for the Phase-3 render API + the TypeScript static port
// (src/server/). Boots the REAL server in-process on an ephemeral port against
// a temp dist/ and temp render cache, and asserts the API contract (plan §2):
// manifest no-cache, hashed pre-renders immutable, garbage build codes → 400,
// valid codes → 302 to a content-addressed cache file that serves immutable,
// second request is a cache HIT (no re-render), plus the static behaviors the
// port must preserve (OG injection, SPA fallback).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createNikkesimServer } from '../../../src/server/app.js';
import { encodeBuild, type Build } from '../../../src/share/build-code.js';
import type { CardCharacter } from '../../../src/server/card-from-build.js';

const IMMUTABLE = 'public, max-age=31536000, immutable';
const NO_CACHE = 'no-cache';

// minimal SPA shell — sendIndex injects per-tab meta into it
const INDEX = `<!doctype html><html><head><title>t</title>
<meta name="description" content="d"><link rel="canonical" href="x">
<meta property="og:title" content="t"><meta property="og:description" content="d">
<meta property="og:url" content="u"><meta name="twitter:title" content="t">
<meta name="twitter:description" content="d"></head><body></body></html>`;

// Injected character metadata (tests don't read data/characters.json). Slugs
// deliberately have no portrait files — cards degrade to placeholder boxes,
// which exercises the render path without depending on web/public assets.
const CHARS: Record<string, CardCharacter> = {
  liter: {
    slug: 'liter',
    name: 'Liter',
    element: 'Iron',
    weapon: 'SMG',
    burst: 'I',
  },
  crown: {
    slug: 'crown',
    name: 'Crown',
    element: 'Iron',
    weapon: 'MG',
    burst: 'II',
  },
  naga: {
    slug: 'naga',
    name: 'Naga',
    element: 'Electric',
    weapon: 'SG',
    burst: 'II',
  },
  modernia: {
    slug: 'modernia',
    name: 'Modernia',
    element: 'Fire',
    weapon: 'MG',
    burst: 'III',
  },
  alice: {
    slug: 'alice',
    name: 'Alice',
    element: 'Fire',
    weapon: 'SR',
    burst: 'III',
  },
};

const TEAM_BUILD: Build = {
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
};

const ROSTER_BUILD: Build = {
  ...TEAM_BUILD,
  roster: [
    ['liter', 'crown', 'modernia', 'alice', 'naga'],
    ['crown', 'naga', 'modernia', 'liter', 'alice'],
  ],
};

let dist: string;
let cacheDir: string;
let server: Server;
let base: string;

beforeAll(async () => {
  dist = mkdtempSync(join(tmpdir(), 'api-dist-'));
  cacheDir = mkdtempSync(join(tmpdir(), 'api-cache-'));
  const put = (rel: string, body: string) => {
    const p = join(dist, rel);
    mkdirSync(join(p, '..'), { recursive: true });
    writeFileSync(p, body);
  };
  put('index.html', INDEX);
  put('assets/App-AbCd1234.js', 'js');
  put('dpschart.json', '{}');
  put('img/manifest.json', '{"generatedAt":"t","images":{}}');
  put('img/dps/solo.eleweak.c100.8of12.all.deadbeef.png', 'png');
  put('img/unit/liter.0123abcd.png', 'png');
  put('img/portraits/liter-128.webp', 'webp');

  server = await createNikkesimServer({
    distDir: dist,
    cacheDir,
    characters: CHARS,
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise((r) => server.close(r));
  rmSync(dist, { recursive: true, force: true });
  rmSync(cacheDir, { recursive: true, force: true });
});

const TEAM_CODE = encodeBuild(TEAM_BUILD);
const ROSTER_CODE = encodeBuild(ROSTER_BUILD);

describe('api/v1/img static routes', () => {
  it('manifest.json is no-cache', async () => {
    const res = await fetch(`${base}/api/v1/img/manifest.json`);
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe(NO_CACHE);
    expect(res.headers.get('content-type')).toBe(
      'application/json; charset=utf-8'
    );
  });

  it('pre-rendered hashed PNGs are immutable with the right MIME', async () => {
    for (const p of [
      '/api/v1/img/dps/solo.eleweak.c100.8of12.all.deadbeef.png',
      '/api/v1/img/unit/liter.0123abcd.png',
    ]) {
      const res = await fetch(`${base}${p}`);
      expect(res.status).toBe(200);
      expect(res.headers.get('cache-control')).toBe(IMMUTABLE);
      expect(res.headers.get('content-type')).toBe('image/png');
    }
  });

  it('API misses are 404, never the SPA fallback', async () => {
    const res = await fetch(`${base}/api/v1/img/unit/nope.00000000.png`);
    expect(res.status).toBe(404);
    const res2 = await fetch(
      `${base}/api/v1/img/cache/team.0000000000000000.png`
    );
    expect(res2.status).toBe(404);
  });
});

describe('api/v1/img dynamic render routes', () => {
  it('rejects garbage build codes with 400', async () => {
    expect((await fetch(`${base}/api/v1/img/team.png?b=garbage`)).status).toBe(
      400
    );
    expect((await fetch(`${base}/api/v1/img/team.png`)).status).toBe(400);
    expect(
      (await fetch(`${base}/api/v1/img/team.png?b=${'a'.repeat(5000)}`)).status
    ).toBe(400);
    // base64url-valid JSON that isn't a build
    const notABuild = Buffer.from('{"hello":"world"}').toString('base64url');
    expect(
      (await fetch(`${base}/api/v1/img/team.png?b=${notABuild}`)).status
    ).toBe(400);
    // roster route on a team-only build
    expect(
      (await fetch(`${base}/api/v1/img/roster.png?b=${TEAM_CODE}`)).status
    ).toBe(400);
  });

  // The render routes are UNAUTHENTICATED — the decoded build must be
  // validated before it sizes a canvas (the pre-fix DoS: 1000 empty teams in
  // a 4055-char code demanded a ~1.6 GB canvas from ONE anonymous GET).
  it('rejects unvalidated-but-decodable builds with 400, never 500', async () => {
    const encode = (b: unknown) =>
      Buffer.from(JSON.stringify(b)).toString('base64url');
    // null slots (threw → 500 pre-fix)
    const nullSlots = encode({
      v: 1,
      g: {},
      s: [null, null, null, null, null],
    });
    expect(
      (await fetch(`${base}/api/v1/img/team.png?b=${nullSlots}`)).status
    ).toBe(400);
    // oversized roster — the canvas DoS
    const bigRoster = encode({
      ...TEAM_BUILD,
      roster: Array.from({ length: 150 }, () => []),
    });
    expect(
      (await fetch(`${base}/api/v1/img/roster.png?b=${bigRoster}`)).status
    ).toBe(400);
    // roster team wider than the 5-slot grid
    const wideTeam = encode({
      ...TEAM_BUILD,
      roster: [['liter', 'crown', 'naga', 'modernia', 'alice', 'liter']],
    });
    expect(
      (await fetch(`${base}/api/v1/img/roster.png?b=${wideTeam}`)).status
    ).toBe(400);
    // non-string slugs in the roster
    const badSlug = encode({ ...TEAM_BUILD, roster: [[42, 'liter']] });
    expect(
      (await fetch(`${base}/api/v1/img/roster.png?b=${badSlug}`)).status
    ).toBe(400);
  });

  it('hostile slugs degrade to placeholder boxes, never a path lookup', async () => {
    // a traversal-shaped slug must NOT reach join(PORTRAIT_DIR, …) — the card
    // renders with a placeholder (302), and nothing outside the dir is read
    const evil = encodeBuild({
      ...TEAM_BUILD,
      s: TEAM_BUILD.s.map((slot, i) =>
        i === 0 ? { ...slot, slug: '../../../../etc/hosts' } : slot
      ),
    });
    const res = await fetch(`${base}/api/v1/img/team.png?b=${evil}`, {
      redirect: 'manual',
    });
    expect(res.status).toBe(302);
  });

  it('team.png 302s to a hashed cache URL, renders once, then hits cache', async () => {
    const res1 = await fetch(`${base}/api/v1/img/team.png?b=${TEAM_CODE}`, {
      redirect: 'manual',
    });
    expect(res1.status).toBe(302);
    const loc = res1.headers.get('location')!;
    expect(loc).toMatch(/^\/api\/v1\/img\/cache\/team\.[0-9a-f]{16}\.png$/);
    const file = join(cacheDir, loc.split('/').pop()!);
    expect(existsSync(file)).toBe(true);
    const png = statSync(file);
    expect(png.size).toBeGreaterThan(10_000); // a real card, not an error page

    // second request: same Location, same BYTES (no re-render). mtime is NOT
    // the proof — the LRU cache deliberately refreshes it on every read
    // (render-cache.ts has()), so hot cards evict last.
    const res2 = await fetch(`${base}/api/v1/img/team.png?b=${TEAM_CODE}`, {
      redirect: 'manual',
    });
    expect(res2.status).toBe(302);
    expect(res2.headers.get('location')).toBe(loc);
    expect(statSync(file).size).toBe(png.size);

    // the cached URL serves the PNG immutable
    const res3 = await fetch(`${base}${loc}`);
    expect(res3.status).toBe(200);
    expect(res3.headers.get('cache-control')).toBe(IMMUTABLE);
    expect(res3.headers.get('content-type')).toBe('image/png');
    const body = Buffer.from(await res3.arrayBuffer());
    expect(
      body
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    ).toBe(true);
    expect(body.length).toBe(png.size);
  });

  it('roster.png renders a roster build to its own cache entry', async () => {
    const res = await fetch(`${base}/api/v1/img/roster.png?b=${ROSTER_CODE}`, {
      redirect: 'manual',
    });
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toMatch(
      /^\/api\/v1\/img\/cache\/roster\.[0-9a-f]{16}\.png$/
    );
  });
});

describe('static port parity with serve.mjs', () => {
  it('OG injection still works on a tab route', async () => {
    const res = await fetch(`${base}/dpschart`);
    expect(res.headers.get('cache-control')).toBe(NO_CACHE);
    const html = await res.text();
    expect(html).toContain('NIKKE DPS Rankings');
  });

  it('static tab + hashed vite asset serve with the Phase-2 cache classes', async () => {
    const asset = await fetch(`${base}/assets/App-AbCd1234.js`);
    expect(asset.headers.get('cache-control')).toBe(IMMUTABLE);
    const json = await fetch(`${base}/dpschart.json`);
    expect(json.headers.get('cache-control')).toBe(NO_CACHE);
    const spa = await fetch(`${base}/mechanics`);
    expect(spa.status).toBe(200);
    expect(await spa.text()).toContain('NIKKE Game Mechanics');
  });

  it('no-cache portraits carry a validator and revalidate to a 304', async () => {
    const res = await fetch(`${base}/img/portraits/liter-128.webp`);
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe(NO_CACHE);
    const etag = res.headers.get('etag');
    expect(etag).toBeTruthy();
    const re = await fetch(`${base}/img/portraits/liter-128.webp`, {
      headers: { 'if-none-match': etag! },
    });
    expect(re.status).toBe(304);
  });
});
