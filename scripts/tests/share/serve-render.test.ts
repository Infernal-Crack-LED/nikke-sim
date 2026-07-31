// Integration test for POST /api/v1/img/render (plan §2 — the JSON RenderSpec
// contract). Boots the REAL server in-process against a temp dist/cache (same
// harness shape as serve-api.test.ts) and asserts: 200 {url} happy paths per
// spec kind, the 4xx matrix (415 wrong content-type, 400 bad JSON / bad spec,
// 413 body cap), and PARITY — a POST and the equivalent GET must produce the
// SAME content-addressed cache URL (they share resolveSpec, so a mismatch
// here means GET/POST drifted).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createHash } from 'node:crypto';
import { specCacheKey } from '../../../src/infographics/spec.js';
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createNikkesimServer } from '../../../src/server/app.js';
import { encodeBuild, type Build } from '../../../src/share/build-code.js';
import type { CardCharacter } from '../../../src/server/card-from-build.js';

// minimal SPA shell — the server injects per-tab meta into it (not exercised
// here, but sendIndex needs a real file)
const INDEX = `<!doctype html><html><head><title>t</title>
<meta name="description" content="d"><link rel="canonical" href="x">
<meta property="og:title" content="t"><meta property="og:description" content="d">
<meta property="og:url" content="u"><meta name="twitter:title" content="t">
<meta name="twitter:description" content="d"></head><body></body></html>`;

const CHARS: Record<string, CardCharacter> = {
  liter: {
    slug: 'liter',
    name: 'Liter',
    element: 'Iron',
    weapon: 'SMG',
    burst: 'I',
    ammo: 120,
    chargeFrames: 0,
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
    ammo: 6,
    chargeFrames: 90,
  },
};

const DPSCHART = {
  generatedAt: 't',
  meta: {},
  units: {
    'red-hood': {
      name: 'Red Hood',
      element: 'Iron',
      elements: ['Iron'],
      weapon: 'SR',
      tier: 'SSS',
      imageUrl: null,
    },
    alice: {
      name: 'Alice',
      element: 'Fire',
      elements: ['Fire'],
      weapon: 'SR',
      tier: 'SSS',
      imageUrl: null,
    },
    modernia: {
      name: 'Modernia',
      element: 'Fire',
      elements: ['Fire'],
      weapon: 'MG',
      tier: 'SS',
      imageUrl: null,
    },
    liter: {
      name: 'Liter',
      element: 'Iron',
      elements: ['Iron'],
      weapon: 'SMG',
      tier: 'S',
      imageUrl: null,
    },
  },
  cells: {
    'solo.eleweak.c100.8of12': [
      ['red-hood', 46_120_000],
      ['alice', 41_980_000],
      ['modernia', 35_870_000],
      ['liter', 8_910_000],
    ],
    'solo.neutral.c100.8of12': [
      ['red-hood', 30_000_000],
      ['alice', 27_000_000],
    ],
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

const TEAM_CODE = encodeBuild(TEAM_BUILD);
const ROSTER_CODE = encodeBuild(ROSTER_BUILD);

let dist: string;
let cacheDir: string;
let server: Server;
let base: string;

beforeAll(async () => {
  dist = mkdtempSync(join(tmpdir(), 'render-dist-'));
  cacheDir = mkdtempSync(join(tmpdir(), 'render-cache-'));
  const put = (rel: string, body: string) => {
    const p = join(dist, rel);
    mkdirSync(join(p, '..'), { recursive: true });
    writeFileSync(p, body);
  };
  put('index.html', INDEX);
  put('dpschart.json', JSON.stringify(DPSCHART));
  put('img/manifest.json', '{"generatedAt":"t","images":{}}');

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

const postRender = (
  body: string,
  contentType = 'application/json'
): Promise<Response> =>
  fetch(`${base}/api/v1/img/render`, {
    method: 'POST',
    headers: { 'content-type': contentType },
    body,
  });

// POST a spec, expect 200 + {url}, assert the file landed in the cache, and
// assert PARITY: the equivalent GET 302s to the SAME content-addressed URL.
const expectRendered = async (
  spec: Record<string, unknown>,
  getPath: string,
  kind: string
): Promise<string> => {
  const res = await postRender(JSON.stringify(spec));
  expect(res.status).toBe(200);
  expect(res.headers.get('content-type')).toContain('application/json');
  const { url } = (await res.json()) as { url: string };
  expect(url).toMatch(
    new RegExp(`^/api/v1/img/cache/${kind}\\.[0-9a-f]{16}\\.png$`)
  );
  const file = join(cacheDir, url.split('/').pop()!);
  expect(existsSync(file)).toBe(true);
  const png = readFileSync(file);
  expect(
    png
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ).toBe(true);

  const get = await fetch(`${base}${getPath}`, { redirect: 'manual' });
  expect(get.status).toBe(302);
  expect(get.headers.get('location')).toBe(url); // GET/POST parity
  return url;
};

describe('POST /api/v1/img/render — happy paths + GET parity', () => {
  it('team spec renders and matches GET team.png', async () => {
    const url = await expectRendered(
      { kind: 'team', build: TEAM_CODE },
      `/api/v1/img/team.png?b=${TEAM_CODE}`,
      'team'
    );
    // the URL hash is exactly sha256(specCacheKey(spec))[:16] — the content
    // address, derived through the shared key function rather than re-spelled
    // here (the key STRINGS themselves are pinned in render-spec.test.ts,
    // which is where a RENDERER_VERSION bump or a key reshape must be
    // noticed). This asserts the URL ↔ key relationship, not the format.
    const expectHash = createHash('sha256')
      .update(specCacheKey({ kind: 'team', build: TEAM_CODE }))
      .digest('hex')
      .slice(0, 16);
    expect(url).toBe(`/api/v1/img/cache/team.${expectHash}.png`);
  });

  it('roster spec renders and matches GET roster.png', async () => {
    await expectRendered(
      { kind: 'roster', build: ROSTER_CODE },
      `/api/v1/img/roster.png?b=${ROSTER_CODE}`,
      'roster'
    );
  });

  it('dps specs render and match GET dps.png (default + filtered)', async () => {
    await expectRendered({ kind: 'dps' }, '/api/v1/img/dps.png', 'dps');
    await expectRendered(
      { kind: 'dps', cell: 'solo.neutral.c100.8of12' },
      '/api/v1/img/dps.png?cell=solo.neutral.c100.8of12',
      'dps'
    );
    await expectRendered(
      { kind: 'dps', element: 'fire' },
      '/api/v1/img/dps.png?element=fire',
      'dps'
    );
    await expectRendered(
      { kind: 'dps', element: 'iron', unit: 'liter' },
      '/api/v1/img/dps.png?element=iron&unit=liter',
      'dps'
    );
    // comparison variant — same content address from GET and POST
    await expectRendered(
      { kind: 'dps', units: ['alice', 'modernia'] },
      '/api/v1/img/dps.png?units=alice,modernia',
      'dps'
    );
  });

  it('table specs render and match GET table/*.png', async () => {
    await expectRendered(
      { kind: 'table', table: 'max-ammo', unit: 'alice' },
      '/api/v1/img/table/max-ammo.png?unit=alice',
      'table'
    );
    await expectRendered(
      { kind: 'table', table: 'charge-speed' },
      '/api/v1/img/table/charge-speed.png',
      'table'
    );
    await expectRendered(
      { kind: 'table', table: 'charge-speed', unit: 'alice' },
      '/api/v1/img/table/charge-speed.png?unit=alice',
      'table'
    );
  });

  it('resources specs render and match GET resources.png (default + explicit tier)', async () => {
    await expectRendered(
      { kind: 'resources' },
      '/api/v1/img/resources.png',
      'resources'
    );
    await expectRendered(
      { kind: 'resources', tier: 3 },
      '/api/v1/img/resources.png?tier=3',
      'resources'
    );
  });
});

describe('POST /api/v1/img/render — request validation', () => {
  it('415s on a non-JSON content-type', async () => {
    const res = await postRender('{"kind":"dps"}', 'text/plain');
    expect(res.status).toBe(415);
    expect(((await res.json()) as { error: string }).error).toContain(
      'application/json'
    );
  });

  it('400s on malformed JSON', async () => {
    const res = await postRender('{nope');
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toContain(
      'invalid JSON'
    );
  });

  it('400s on the full bad-spec matrix (same rules as the GETs)', async () => {
    const cases: [Record<string, unknown>, string][] = [
      [{}, 'unknown render kind'],
      [{ kind: 'bogus' }, 'unknown render kind'],
      [{ kind: 'team', build: 'garbage' }, 'invalid build code'],
      [{ kind: 'team' }, 'invalid build code'],
      [{ kind: 'dps', cell: 'bogus' }, `unknown cell 'bogus'`],
      [{ kind: 'dps', element: 'bogus' }, `unknown element 'bogus'`],
      [{ kind: 'dps', unit: 'bogus' }, `unknown unit 'bogus'`],
      [
        // modernia isn't ranked in the neutral cell at all
        { kind: 'dps', cell: 'solo.neutral.c100.8of12', unit: 'modernia' },
        'not in this chart',
      ],
      [
        { kind: 'dps', unit: 'alice', units: ['modernia'] },
        'mutually exclusive',
      ],
      [{ kind: 'dps', units: ['alice', 'bogus'] }, `unknown unit 'bogus'`],
      [
        {
          kind: 'dps',
          cell: 'solo.neutral.c100.8of12',
          units: ['alice', 'modernia'],
        },
        'not in this chart',
      ],
      [
        {
          kind: 'dps',
          units: Array.from({ length: 11 }, (_, i) => `u${i}`),
        },
        'capped at 10',
      ],
      [{ kind: 'table', table: 'bogus' }, `unknown table 'bogus'`],
      [{ kind: 'table', table: 'max-ammo' }, 'unit is required'],
      [
        { kind: 'table', table: 'max-ammo', unit: 'bogus' },
        `unknown unit 'bogus'`,
      ],
      [
        { kind: 'table', table: 'charge-speed', unit: 'liter' },
        'not a charge weapon',
      ],
      [{ kind: 'resources', tier: 0 }, 'tier must be an integer 1-9'],
      [{ kind: 'resources', tier: 10 }, 'tier must be an integer 1-9'],
    ];
    for (const [spec, error] of cases) {
      const res = await postRender(JSON.stringify(spec));
      expect(res.status, JSON.stringify(spec)).toBe(400);
      expect(((await res.json()) as { error: string }).error).toContain(error);
    }
  });

  it('400s on decodable-but-unsafe builds (the canvas-size DoS guard)', async () => {
    const bigRoster = Buffer.from(
      JSON.stringify({
        ...TEAM_BUILD,
        roster: Array.from({ length: 150 }, () => []),
      })
    ).toString('base64url');
    const res = await postRender(
      JSON.stringify({ kind: 'roster', build: bigRoster })
    );
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toBe(
      'roster has 150 teams (max 5)'
    );
  });

  it('413s on a body over the 16 KB cap', async () => {
    const res = await postRender(
      JSON.stringify({ kind: 'dps', pad: 'x'.repeat(20_000) })
    );
    expect(res.status).toBe(413);
    expect(((await res.json()) as { error: string }).error).toContain(
      'too large'
    );
  });

  it('413s on a chunked body over the cap (no content-length to pre-check)', async () => {
    const big = JSON.stringify({ kind: 'dps', pad: 'x'.repeat(20_000) });
    const stream = new ReadableStream<string>({
      start(controller) {
        // drip-feed so the server must count the stream, not the header
        for (let i = 0; i < big.length; i += 4096) {
          controller.enqueue(big.slice(i, i + 4096));
        }
        controller.close();
      },
    }).pipeThrough(new TextEncoderStream());
    const res = await fetch(`${base}/api/v1/img/render`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: stream,
      // @ts-expect-error — undici (node fetch) requires duplex for streams;
      // the DOM lib types don't know the option
      duplex: 'half',
    });
    expect(res.status).toBe(413);
  });
});
