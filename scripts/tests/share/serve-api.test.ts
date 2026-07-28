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
// units (liter is chartPop:false — selector-only on the site, so she is only
// reachable through an element filter).
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
      chartPop: true,
      imageUrl: null,
    },
    alice: {
      name: 'Alice',
      element: 'Fire',
      elements: ['Fire'],
      weapon: 'SR',
      tier: 'SSS',
      chartPop: true,
      imageUrl: null,
    },
    modernia: {
      name: 'Modernia',
      element: 'Fire',
      elements: ['Fire'],
      weapon: 'MG',
      tier: 'SS',
      chartPop: true,
      imageUrl: null,
    },
    liter: {
      name: 'Liter',
      element: 'Iron',
      elements: ['Iron'],
      weapon: 'SMG',
      tier: 'S',
      chartPop: false,
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
  put('img/manifest.json', '{"generatedAt":"t","images":{}}');
  put('img/dps/solo.eleweak.c100.8of12.all.deadbeef.png', 'png');
  put('img/unit/liter.0123abcd.png', 'png');
  put('img/table/ol.c0ffee00.png', 'png');
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

  it('element filter reaches non-chartPop units; a bad combo is a 400', async () => {
    // liter is chartPop:false — selectable only through an element filter
    await expectRenderedPng(
      '/api/v1/img/dps.png?element=iron&unit=liter',
      'dps'
    );
    // …but not through the unfiltered population
    expect((await fetch(`${base}/api/v1/img/dps.png?unit=liter`)).status).toBe(
      400
    );
    // alice is Fire — excluded by the iron filter
    expect(
      (await fetch(`${base}/api/v1/img/dps.png?element=iron&unit=alice`)).status
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
    // liter is chartPop:false — not in the unfiltered population
    const offPop = await fetch(`${base}/api/v1/img/dps.png?units=alice,liter`);
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
});
