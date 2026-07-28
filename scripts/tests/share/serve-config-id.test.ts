// The `?id=<config>` render path — a shared saved config becomes a card that
// carries REAL sim numbers, plus the page URL bakery-bot links the embed to.
//
// The whole design rests on one property that is easy to break and impossible
// to notice in production: the id is a HANDLE, never part of the content
// address. Expanding it before the cache key is computed is what makes a
// re-saved config mint a new image (instead of mutating a posted one), lets an
// evicted card re-render from its sidecar with no network, and keeps
// `?id=<X>` and the equivalent `?b=<code>` request landing on the SAME file.
// Each of those is asserted below.
//
// The bakery-bot read is stubbed at the fetch boundary: this test must not
// touch the network, and the stub also lets it prove the KIND ALLOWLIST is
// re-checked on this side (a profile of any other kind is refused even if the
// backend hands one over).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createNikkesimServer } from '../../../src/server/app.js';
import { ConfigStore } from '../../../src/server/config-store.js';
import { encodeBuild, type Build } from '../../../src/share/build-code.js';
import {
  encodeSharedConfig,
  SHARED_CONFIG_PROFILE_KIND,
  type SharedConfig,
} from '../../../src/share/shared-config.js';
import type { CardCharacter } from '../../../src/server/card-from-build.js';

const CHARS: Record<string, CardCharacter> = Object.fromEntries(
  (
    [
      ['liter', 'Liter', 'Iron', 'SMG', 'I'],
      ['crown', 'Crown', 'Iron', 'MG', 'II'],
      ['naga', 'Naga', 'Electric', 'SG', 'II'],
      ['modernia', 'Modernia', 'Fire', 'MG', 'III'],
      ['alice', 'Alice', 'Fire', 'SR', 'III'],
    ] as const
  ).map(([slug, name, element, weapon, burst]) => [
    slug,
    { slug, name, element, weapon, burst },
  ])
);

const TEAM_BUILD: Build = {
  v: 1,
  g: {
    weakness: 'Fire',
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

const RESULTS = {
  at: '2026-07-28T12:00:00.000Z',
  total: 1_000_000,
  teams: [
    {
      damage: 1_000_000,
      dps: 5_555,
      fullBursts: 7,
      fullBurstUptime: 0.38,
      units: ['liter', 'crown', 'naga', 'modernia', 'alice'].map((slug, i) => ({
        slug,
        damage: 200_000 - i * 1_000,
        share: 0.2,
      })),
    },
  ],
};

const TEAM_CONFIG: SharedConfig = {
  v: 1,
  kind: 'team',
  build: encodeBuild(TEAM_BUILD),
  results: RESULTS,
};
const NO_RESULTS_CONFIG: SharedConfig = {
  v: 1,
  kind: 'team',
  build: encodeBuild(TEAM_BUILD),
};
const ROSTER_CONFIG: SharedConfig = {
  v: 1,
  kind: 'roster',
  build: encodeBuild({
    ...TEAM_BUILD,
    roster: [
      ['liter', 'crown', 'modernia', 'alice', 'naga'],
      ['crown', 'naga', 'modernia', 'liter', 'alice'],
    ],
  }),
  results: {
    at: '2026-07-28T12:00:00.000Z',
    total: 3,
    teams: [
      { damage: 2, dps: 1, fullBursts: 1, fullBurstUptime: 0, units: [] },
      { damage: 1, dps: 1, fullBursts: 1, fullBurstUptime: 0, units: [] },
    ],
  },
};

const ID = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const WITH_RESULTS = ID(1);
const WITHOUT_RESULTS = ID(2);
const ROSTER = ID(3);
const WRONG_KIND = ID(4);

// Stands in for bakery-bot's GET /api/profiles/:id/public.
const PROFILES: Record<string, { kind: string; code: string }> = {
  [WITH_RESULTS]: {
    kind: SHARED_CONFIG_PROFILE_KIND,
    code: encodeSharedConfig(TEAM_CONFIG),
  },
  [WITHOUT_RESULTS]: {
    kind: SHARED_CONFIG_PROFILE_KIND,
    code: encodeSharedConfig(NO_RESULTS_CONFIG),
  },
  [ROSTER]: {
    kind: SHARED_CONFIG_PROFILE_KIND,
    code: encodeSharedConfig(ROSTER_CONFIG),
  },
  // A private profile kind — the backend allowlist should never serve this,
  // and the sim re-checks so a backend mistake still can't render it.
  [WRONG_KIND]: {
    kind: 'exclude',
    code: encodeSharedConfig(TEAM_CONFIG),
  },
};

let fetchCalls = 0;
const stubFetch = ((url: string | URL | Request) => {
  fetchCalls++;
  const id = String(url).split('/api/profiles/')[1]?.split('/')[0] ?? '';
  const row = PROFILES[id];
  return Promise.resolve(
    row
      ? new Response(JSON.stringify({ id, ...row, name: 'n' }), {
          headers: { 'content-type': 'application/json' },
        })
      : new Response('not found', { status: 404 })
  );
}) as unknown as typeof fetch;

let dist: string;
let cacheDir: string;
let server: Server;
let base: string;

const get = (path: string) =>
  fetch(`${base}${path}`, { redirect: 'manual' as RequestRedirect });
const post = (body: unknown) =>
  fetch(`${base}/api/v1/img/render`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

beforeAll(async () => {
  dist = mkdtempSync(join(tmpdir(), 'cfg-dist-'));
  cacheDir = mkdtempSync(join(tmpdir(), 'cfg-cache-'));
  mkdirSync(join(dist, 'img'), { recursive: true });
  writeFileSync(join(dist, 'index.html'), '<!doctype html><html></html>');
  server = await createNikkesimServer({
    distDir: dist,
    cacheDir,
    characters: CHARS,
    configs: new ConfigStore('http://stub.invalid', stubFetch),
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise((r) => server.close(r));
  rmSync(dist, { recursive: true, force: true });
  rmSync(cacheDir, { recursive: true, force: true });
});

describe('GET team.png?id=', () => {
  it('302s to a content-addressed card for a known config', async () => {
    const res = await get(`/api/v1/img/team.png?id=${WITH_RESULTS}`);
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toMatch(
      /^\/api\/v1\/img\/cache\/team\.[0-9a-f]{16}\.png$/
    );
  });

  it('addresses the card by CONTENT, not by id: a config with results and one without land on different files, and the no-results one matches the plain ?b= request', async () => {
    const withResults = await get(`/api/v1/img/team.png?id=${WITH_RESULTS}`);
    const without = await get(`/api/v1/img/team.png?id=${WITHOUT_RESULTS}`);
    const byBuild = await get(
      `/api/v1/img/team.png?b=${encodeURIComponent(encodeBuild(TEAM_BUILD))}`
    );
    expect(without.headers.get('location')).toBe(
      byBuild.headers.get('location')
    );
    expect(withResults.headers.get('location')).not.toBe(
      byBuild.headers.get('location')
    );
  });

  it('renders a bigger card when results are present (the full card, not the composition one)', async () => {
    const a = await get(`/api/v1/img/team.png?id=${WITH_RESULTS}`);
    const b = await get(`/api/v1/img/team.png?id=${WITHOUT_RESULTS}`);
    const png = async (r: Response) =>
      Buffer.from(
        await (await fetch(base + r.headers.get('location')!)).arrayBuffer()
      );
    const [full, composition] = [await png(a), await png(b)];
    // PNG IHDR height, bytes 20..24 — the results card has one row per unit.
    const height = (buf: Buffer) => buf.readUInt32BE(20);
    expect(height(full)).toBeGreaterThan(height(composition));
  });

  it('404s an unknown id, and refuses a profile of a non-share kind', async () => {
    expect((await get(`/api/v1/img/team.png?id=${ID(9)}`)).status).toBe(404);
    expect((await get(`/api/v1/img/team.png?id=${WRONG_KIND}`)).status).toBe(
      404
    );
  });

  it('404s a malformed id without ever calling the backend', async () => {
    const before = fetchCalls;
    expect((await get('/api/v1/img/team.png?id=../../etc/passwd')).status).toBe(
      404
    );
    expect(fetchCalls).toBe(before);
  });

  it('400s when the id names the other kind of config', async () => {
    // A team.png URL that quietly rendered a roster would be a URL you cannot
    // read the answer out of.
    const res = await get(`/api/v1/img/team.png?id=${ROSTER}`);
    expect(res.status).toBe(400);
    expect(await res.text()).toContain('roster config');
  });

  it('memoizes the config read across requests', async () => {
    await get(`/api/v1/img/team.png?id=${WITH_RESULTS}`);
    const before = fetchCalls;
    await get(`/api/v1/img/team.png?id=${WITH_RESULTS}`);
    expect(fetchCalls).toBe(before);
  });
});

describe('POST /render with a config id', () => {
  it('returns BOTH urls — the image to embed and the page to link', async () => {
    const res = await post({ kind: 'team', id: WITH_RESULTS });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, string>;
    expect(body.imageUrl).toMatch(
      /^\/api\/v1\/img\/cache\/team\.[0-9a-f]{16}\.png$/
    );
    // `url` stays an alias of imageUrl so the existing bot client is unbroken.
    expect(body.url).toBe(body.imageUrl);
    expect(body.pageUrl).toBe(`https://nikkesim.app/?id=${WITH_RESULTS}`);
  });

  it('infers the kind from the config when the caller omits it', async () => {
    const res = await post({ id: ROSTER });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, string>;
    expect(body.imageUrl).toMatch(/\/cache\/roster\./);
    expect(body.pageUrl).toBe(`https://nikkesim.app/rostersim?id=${ROSTER}`);
  });

  it('omits pageUrl for a plain build code — there is no short page to link', async () => {
    const res = await post({ kind: 'team', build: encodeBuild(TEAM_BUILD) });
    const body = (await res.json()) as Record<string, string>;
    expect(body.imageUrl).toMatch(/\/cache\/team\./);
    expect(body.pageUrl).toBeUndefined();
  });
});
