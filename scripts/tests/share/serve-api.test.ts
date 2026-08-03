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
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createNikkesimServer } from '../../../src/server/app.js';
import { encodeBuild, type Build } from '../../../src/share/build-code.js';
import type { CardCharacter } from '../../../src/server/card-from-build.js';
import { ROUTES, hrefFor } from '../../../web/src/router.js';

const IMMUTABLE = 'public, max-age=31536000, immutable';
const NO_CACHE = 'no-cache';

// minimal SPA shell — sendIndex injects per-tab meta into it. Wrapped
// attribute-per-line like the real (Prettier-formatted, vite-built)
// dist/index.html — see serve-headers.test.ts for why a single-line fixture
// would hide a regex that only matches attributes on one line.
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
  name="twitter:title"
  content="t"
/>
<meta
  name="twitter:description"
  content="d"
/>
<meta name="twitter:image" content="https://nikkesim.app/og.png" />
</head><body></body></html>`;

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
  // The autofire pair for the charge-speed latency check. BOTH are
  // FIXTURE-ONLY slugs (a real slug would resolve a real portrait from
  // web/public and confound the byte compare — the difference has to be the
  // latency alone): identical in every field except the datamined tell
  // role.weapon.shot_detail.input_type === 'DOWN_Charge', which means "fires
  // on press, NO 22f release latency".
  'zz-charge-autofire': {
    slug: 'zz-charge-autofire',
    name: 'Charge Unit',
    element: 'Electric',
    weapon: 'RL',
    burst: 'III',
    ammo: 6,
    chargeFrames: 60,
    role: { weapon: { shot_detail: { input_type: 'DOWN_Charge' } } },
  },
  'zz-charge-control': {
    slug: 'zz-charge-control',
    name: 'Charge Unit',
    element: 'Electric',
    weapon: 'RL',
    burst: 'III',
    ammo: 6,
    chargeFrames: 60,
  },
};

// A minimal dpschart.json fixture for the dps.png route: two cells, four
// units. modernia and liter are absent from the neutral cell's ranked
// list — a real "this unit isn't in this cell" scenario, distinct from an
// unknown slug.
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
  put('dpschart.json', JSON.stringify(DPSCHART));
  // The builder tab's og:image resolves 'unit/maiden-ice-rose.discord'
  // against this manifest (see serve-headers.test.ts for the real shape).
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
  put('img/unit/liter.0123abcd.png', 'png');
  put('img/unit/maiden-ice-rose.discord.9fedcba1.webp', 'webp');
  put('img/table/ol.c0ffee00.png', 'png');
  put('img/portraits/liter-128.webp', 'webp');
  // Copy the real sitemap.xml so we can assert every advertised URL is a known
  // route and serves with the correct content type.
  const sitemapSrc = fileURLToPath(
    new URL('../../../web/public/sitemap.xml', import.meta.url)
  );
  put('sitemap.xml', readFileSync(sitemapSrc, 'utf8'));

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
      '/api/v1/img/table/ol.c0ffee00.png',
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
  // The asserted BODY is the proof each case reaches cardBuildError: an
  // envelope rejection says 'invalid build code', so a status-only assertion
  // would pass even if the payload never reached the new validator.
  it('rejects unvalidated-but-decodable builds with 400, never 500', async () => {
    const encode = (b: unknown) =>
      Buffer.from(JSON.stringify(b)).toString('base64url');
    const body = async (path: string, b: string) => {
      const res = await fetch(`${base}/api/v1/img/${path}?b=${b}`);
      expect(res.status).toBe(400);
      return res.text();
    };
    // null slots (threw → 500 pre-fix)
    const nullSlots = encode({
      v: 1,
      g: {},
      s: [null, null, null, null, null],
    });
    expect(await body('team.png', nullSlots)).toBe('invalid slot');
    // oversized roster — the canvas DoS
    const bigRoster = encode({
      ...TEAM_BUILD,
      roster: Array.from({ length: 150 }, () => []),
    });
    expect(await body('roster.png', bigRoster)).toBe(
      'roster has 150 teams (max 5)'
    );
    // roster team wider than the 5-slot grid
    const wideTeam = encode({
      ...TEAM_BUILD,
      roster: [['liter', 'crown', 'naga', 'modernia', 'alice', 'liter']],
    });
    expect(await body('roster.png', wideTeam)).toBe('invalid roster team');
    // non-string slugs in the roster
    const badSlug = encode({ ...TEAM_BUILD, roster: [[42, 'liter']] });
    expect(await body('roster.png', badSlug)).toBe('invalid roster team');
  });

  it('hostile slugs degrade to placeholder boxes (end-to-end smoke)', async () => {
    // the traversal PROOF is the loadPortrait unit test in
    // portrait-security.test.ts (a 302 alone passes against the unfixed
    // code); this is the end-to-end smoke that a traversal-shaped slug still
    // renders a card instead of erroring
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
    const original = readFileSync(file);
    expect(original.length).toBeGreaterThan(10_000); // a real card, not an error page
    // the renderer emits a real PNG (magic bytes), not just a blob behind an
    // image/png content-type
    expect(
      original
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    ).toBe(true);

    // second request: same Location, and NO re-render. The renderer is
    // deterministic, so identical bytes/size prove nothing — POISON the cached
    // file with a sentinel and assert the sentinel is what the second request
    // serves back. (mtime is not the proof either: the LRU cache deliberately
    // refreshes it on every read — render-cache.ts has().)
    // The restore lives in a `finally`: the poisoned file is shared cache
    // state and must not leak into later tests even when an assertion fails.
    const sentinel = Buffer.from('poisoned-cache-entry');
    writeFileSync(file, sentinel);
    try {
      const res2 = await fetch(`${base}/api/v1/img/team.png?b=${TEAM_CODE}`, {
        redirect: 'manual',
      });
      expect(res2.status).toBe(302);
      expect(res2.headers.get('location')).toBe(loc);

      // the cached URL serves whatever is in the cache, immutable
      const res3 = await fetch(`${base}${loc}`);
      expect(res3.status).toBe(200);
      expect(res3.headers.get('cache-control')).toBe(IMMUTABLE);
      expect(res3.headers.get('content-type')).toBe('image/png');
      const body = Buffer.from(await res3.arrayBuffer());
      expect(body.equals(sentinel)).toBe(true); // a re-render would have overwritten it
    } finally {
      writeFileSync(file, original);
    }
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

// Follow a 302 and assert the cached URL serves a real PNG (magic bytes), and
// that a second request 302s to the SAME content-addressed location.
const expectRenderedPng = async (
  path: string,
  kind: string
): Promise<string> => {
  const res1 = await fetch(`${base}${path}`, { redirect: 'manual' });
  expect(res1.status).toBe(302);
  const loc = res1.headers.get('location')!;
  expect(loc).toMatch(
    new RegExp(`^/api/v1/img/cache/${kind}\\.[0-9a-f]{16}\\.png$`)
  );
  const res2 = await fetch(`${base}${loc}`);
  expect(res2.status).toBe(200);
  expect(res2.headers.get('cache-control')).toBe(IMMUTABLE);
  const body = Buffer.from(await res2.arrayBuffer());
  expect(
    body
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ).toBe(true);
  expect(body.length).toBeGreaterThan(1_000); // a real card, not an error page
  // second request: same location, served from the cache
  const res3 = await fetch(`${base}${path}`, { redirect: 'manual' });
  expect(res3.status).toBe(302);
  expect(res3.headers.get('location')).toBe(loc);
  return loc;
};

describe('api/v1/img/dps.png (on-demand chart)', () => {
  it('renders the default cell and caches it', async () => {
    const loc = await expectRenderedPng('/api/v1/img/dps.png', 'dps');
    expect(existsSync(join(cacheDir, loc.split('/').pop()!))).toBe(true);
  });

  it('renders explicit cell / element / unit-window variants to distinct URLs', async () => {
    const all = await expectRenderedPng(
      '/api/v1/img/dps.png?cell=solo.neutral.c100.8of12',
      'dps'
    );
    const fire = await expectRenderedPng(
      '/api/v1/img/dps.png?element=fire',
      'dps'
    );
    const windowed = await expectRenderedPng(
      '/api/v1/img/dps.png?unit=modernia',
      'dps'
    );
    expect(new Set([all, fire, windowed]).size).toBe(3);
  });

  it('element filter narrows the population; off-cell unit is a 400', async () => {
    // liter is Iron — reachable both unfiltered and via the iron filter
    await expectRenderedPng(
      '/api/v1/img/dps.png?element=iron&unit=liter',
      'dps'
    );
    await expectRenderedPng('/api/v1/img/dps.png?unit=liter', 'dps');
    // alice is Fire — excluded by the iron filter
    expect(
      (await fetch(`${base}/api/v1/img/dps.png?element=iron&unit=alice`)).status
    ).toBe(400);
    // modernia isn't ranked in the neutral cell at all
    expect(
      (
        await fetch(
          `${base}/api/v1/img/dps.png?cell=solo.neutral.c100.8of12&unit=modernia`
        )
      ).status
    ).toBe(400);
  });

  it('400s on unknown cell / element / unit', async () => {
    for (const p of [
      '/api/v1/img/dps.png?cell=bogus',
      '/api/v1/img/dps.png?element=bogus',
      '/api/v1/img/dps.png?unit=bogus',
    ]) {
      expect((await fetch(`${base}${p}`)).status).toBe(400);
    }
  });

  it('units= renders a comparison card (order-insensitive, distinct from window)', async () => {
    const cmp = await expectRenderedPng(
      '/api/v1/img/dps.png?units=alice,modernia',
      'dps'
    );
    // the sorted cache key makes request order irrelevant — SAME url
    const res = await fetch(`${base}/api/v1/img/dps.png?units=modernia,alice`, {
      redirect: 'manual',
    });
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(cmp);
    // …and a comparison never collides with the §6.6 window of one of its units
    const windowed = await expectRenderedPng(
      '/api/v1/img/dps.png?unit=modernia',
      'dps'
    );
    expect(cmp).not.toBe(windowed);
    // element filter composes (both picks are Fire)
    await expectRenderedPng(
      '/api/v1/img/dps.png?element=fire&units=alice,modernia',
      'dps'
    );
  });

  it('units= 400s: with unit, unknown slug, off-population slug, >10', async () => {
    const both = await fetch(
      `${base}/api/v1/img/dps.png?unit=alice&units=modernia`
    );
    expect(both.status).toBe(400);
    expect(await both.text()).toContain('mutually exclusive');
    expect(
      (await fetch(`${base}/api/v1/img/dps.png?units=alice,bogus`)).status
    ).toBe(400);
    // modernia isn't ranked in the neutral cell at all
    const offPop = await fetch(
      `${base}/api/v1/img/dps.png?cell=solo.neutral.c100.8of12&units=alice,modernia`
    );
    expect(offPop.status).toBe(400);
    expect(await offPop.text()).toContain('not in this chart');
    // alice is Fire — excluded by the iron filter
    expect(
      (await fetch(`${base}/api/v1/img/dps.png?element=iron&units=alice`))
        .status
    ).toBe(400);
    const eleven = Array.from({ length: 11 }, (_, i) => `u${i}`).join(',');
    const tooMany = await fetch(`${base}/api/v1/img/dps.png?units=${eleven}`);
    expect(tooMany.status).toBe(400);
    expect(await tooMany.text()).toContain('capped at 10');
  });
});

describe('api/v1/img/table/*.png (breakpoint tables)', () => {
  it('max-ammo requires a unit and 400s on unknown slugs', async () => {
    expect((await fetch(`${base}/api/v1/img/table/max-ammo.png`)).status).toBe(
      400
    );
    expect(
      (await fetch(`${base}/api/v1/img/table/max-ammo.png?unit=bogus`)).status
    ).toBe(400);
  });

  it('max-ammo renders for a unit with ammo data and caches it', async () => {
    const loc = await expectRenderedPng(
      '/api/v1/img/table/max-ammo.png?unit=alice',
      'table'
    );
    expect(existsSync(join(cacheDir, loc.split('/').pop()!))).toBe(true);
  });

  it('charge-speed renders the generic table without a unit', async () => {
    await expectRenderedPng('/api/v1/img/table/charge-speed.png', 'table');
  });

  it('charge-speed renders for SR/RL units, 400s on non-charge weapons', async () => {
    await expectRenderedPng(
      '/api/v1/img/table/charge-speed.png?unit=alice',
      'table'
    );
    // liter is an SMG — not a charge weapon
    const res = await fetch(
      `${base}/api/v1/img/table/charge-speed.png?unit=liter`
    );
    expect(res.status).toBe(400);
    expect(await res.text()).toContain('not a charge weapon');
    expect(
      (await fetch(`${base}/api/v1/img/table/charge-speed.png?unit=bogus`))
        .status
    ).toBe(400);
  });

  it('an autofire unit renders a DIFFERENT card than a release-fired one', async () => {
    // Same base frames, same displayed name — the ONLY difference is the
    // datamined input_type, which zeroes the 22f release latency in the
    // Shots/FB column. Identical bytes would mean the latency never reached
    // the render (the bug this pins: every autofire unit's card understated
    // shots per Full Burst by ~25-30%).
    const png = async (slug: string): Promise<Buffer> => {
      const loc = await expectRenderedPng(
        `/api/v1/img/table/charge-speed.png?unit=${slug}`,
        'table'
      );
      return Buffer.from(await (await fetch(`${base}${loc}`)).arrayBuffer());
    };
    const autofire = await png('zz-charge-autofire');
    const released = await png('zz-charge-control');
    expect(autofire.length).toBeGreaterThan(0);
    expect(autofire.equals(released)).toBe(false);
  });
});

describe('api/v1/img/cache/<file> durability (spec sidecar)', () => {
  // The short cache URL is the only form that fits a Discord embed, so an LRU
  // eviction must not break an already-posted image: the miss re-renders from
  // the remembered spec (src/server/spec-store.ts).
  it('an evicted entry re-renders and serves the SAME bytes', async () => {
    const loc = await expectRenderedPng(
      `/api/v1/img/team.png?b=${TEAM_CODE}`,
      'team'
    );
    const file = loc.split('/').pop()!;
    const before = Buffer.from(
      await (await fetch(`${base}${loc}`)).arrayBuffer()
    );
    rmSync(join(cacheDir, file)); // simulate the LRU sweep evicting it
    expect(existsSync(join(cacheDir, file))).toBe(false);

    const res = await fetch(`${base}${loc}`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
    const after = Buffer.from(await res.arrayBuffer());
    // content-addressed: the re-render is the same picture, and it is back on
    // disk for the next request
    expect(after.equals(before)).toBe(true);
    expect(existsSync(join(cacheDir, file))).toBe(true);
  });

  it('a hash with no remembered spec is still an honest 404', async () => {
    const res = await fetch(
      `${base}/api/v1/img/cache/team.${'0'.repeat(16)}.png`
    );
    expect(res.status).toBe(404);
    expect(res.headers.get('content-type')).toContain('text/plain');
  });

  it('a sidecar that resolves to a DIFFERENT hash is refused', async () => {
    // hand-written/stale sidecar: the spec is valid but does not address this
    // file (e.g. it was written under an older RENDERER_VERSION). Serving it
    // would break the content-address promise, so the answer is the 404.
    const bogus = `team.${'a'.repeat(16)}.png`;
    mkdirSync(join(cacheDir, 'specs'), { recursive: true });
    writeFileSync(
      join(cacheDir, 'specs', `${bogus}.json`),
      JSON.stringify({ kind: 'team', build: TEAM_CODE })
    );
    expect((await fetch(`${base}/api/v1/img/cache/${bogus}`)).status).toBe(404);
  });
});

describe('static port parity with serve.mjs', () => {
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

  it('OG injection still works on a tab route', async () => {
    const res = await fetch(`${base}/dpschart`);
    expect(res.headers.get('cache-control')).toBe(NO_CACHE);
    const html = await res.text();
    expect(html).toContain('NIKKE DPS Rankings');
  });

  // Parity with serve-headers.test.ts's 2026-07-31 fix pin: the wrapped
  // (Prettier-formatted) meta tags must actually get their content replaced
  // here too, not just in the .mjs original.
  it('replaces og:title/og:description/twitter:* content, not just <title>', async () => {
    const html = await (await fetch(`${base}/dpschart`)).text();
    const tag = (attr: string) =>
      new RegExp(
        `<meta\\s+(?:property|name)="${attr}"\\s+content="([^"]*)"`
      ).exec(html)?.[1];
    expect(tag('og:title')).toContain('NIKKE DPS Rankings');
    expect(tag('twitter:title')).toContain('NIKKE DPS Rankings');
    const desc = /<meta\s+name="description"\s+content="([^"]*)"/.exec(
      html
    )?.[1];
    expect(desc).toBeTruthy();
    expect(desc).not.toBe('d');
  });

  it('/builder gets its custom og:image from the manifest; other tabs keep the generic one', async () => {
    const builderHtml = await (await fetch(`${base}/builder`)).text();
    expect(builderHtml).toContain(
      'https://nikkesim.app/img/unit/maiden-ice-rose.discord.9fedcba1.webp'
    );
    const rootHtml = await (await fetch(`${base}/`)).text();
    expect(rootHtml).toContain('https://nikkesim.app/og.png');
    expect(rootHtml).not.toContain('maiden-ice-rose');
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
    const lastMod = res.headers.get('last-modified');
    expect(lastMod).toBeTruthy();
    for (const inm of [etag!, '*']) {
      const re = await fetch(`${base}/img/portraits/liter-128.webp`, {
        headers: { 'if-none-match': inm },
      });
      expect(re.status).toBe(304);
      // the 304 must carry the SAME validators as the 200 it validates
      expect(re.headers.get('last-modified')).toBe(lastMod);
    }
    const ims = await fetch(`${base}/img/portraits/liter-128.webp`, {
      headers: { 'if-modified-since': lastMod! },
    });
    expect(ims.status).toBe(304);
    expect(ims.headers.get('last-modified')).toBe(lastMod);
    // negative cases — without these, `!!header → 304` passes too:
    // a strictly-older IMS must re-serve in full (pins the >= direction)
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

  it('breadcrumbs do not duplicate item URLs on section-parent pages', async () => {
    const breadcrumbItems = (html: string) => {
      const raw = /<script type="application\/ld\+json">([^<]+)<\/script>/.exec(
        html
      )?.[1];
      if (!raw) return null;
      const data = JSON.parse(raw) as {
        itemListElement?: { item?: string }[];
      };
      return data.itemListElement?.map((e) => e.item) ?? null;
    };
    for (const path of ['/overload', '/teambuilder', '/mechanics', '/team']) {
      const html = await (await fetch(`${base}${path}`)).text();
      const items = breadcrumbItems(html);
      expect(items).toBeTruthy();
      expect(new Set(items).size).toBe(items!.length);
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

  it('404 responses canonicalize to the root and carry no breadcrumb', async () => {
    const res = await fetch(`${base}/definitely-not-a-page`);
    expect(res.status).toBe(404);
    const html = await res.text();
    const canonical = /<link rel="canonical" href="([^"]*)"/.exec(html)?.[1];
    expect(canonical).toBe('https://nikkesim.app/');
    const ogUrl = /<meta property="og:url" content="([^"]*)"/.exec(html)?.[1];
    expect(ogUrl).toBe('https://nikkesim.app/');
    expect(html).not.toContain('"@type":"BreadcrumbList"');
  });

  it('breadcrumb leaf uses the short label, not the full SEO title', async () => {
    const html = await (await fetch(`${base}/unit/liter`)).text();
    const breadcrumb =
      /<script type="application\/ld\+json">([^<]+)<\/script>/.exec(html)?.[1];
    expect(breadcrumb).toContain('"name":"Liter"');
    expect(breadcrumb).not.toContain('NIKKE Unit Profile');
  });
});
