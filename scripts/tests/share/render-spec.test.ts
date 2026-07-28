// Unit tests for src/infographics/spec.ts — the render request contract
// shared by the GET query routes and POST /api/v1/img/render. The
// specCacheKey assertions pin the EXACT `v1|...` key strings: those keys are
// content addresses for cache files already on disk (and already handed to
// Discord's URL-keyed CDN), so any drift here silently orphans every cached
// render. Changing one requires a deliberate cache-version decision, not a
// drive-by refactor.
import { describe, expect, it } from 'vitest';
import {
  BUILD_CODE_MAX_LEN,
  DEFAULT_DPS_CELL,
  parseRenderSpec,
  specCacheKey,
  specCacheType,
} from '../../../src/infographics/spec.js';
import { encodeBuild, type Build } from '../../../src/share/build-code.js';

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
const TEAM_CODE = encodeBuild(TEAM_BUILD);

describe('specCacheKey — pinned key strings (cache compatibility)', () => {
  it('produces the exact v2|… keys the on-disk cache was written with', () => {
    // team/roster hash the render-relevant PROJECTION of the decoded build
    // (spec.ts renderRelevantBuild) — NOT the raw code, so a field no pixel
    // depends on can't fork the cache. build-render-key.test.ts pins the
    // projection against the renderers; this pins the STRING it produces.
    expect(specCacheKey({ kind: 'team', build: TEAM_CODE })).toBe(
      'v2|team|{"u":["liter","crown","naga","modernia","alice"],' +
        '"w":"Water","l":"400","c":1,"cc":false,"cv":"10"}'
    );
    // A stored sim snapshot (a shared config) APPENDS a field and never
    // reshapes the ones above it — so every card already on disk keeps its
    // address while a card that prints numbers gets its own.
    const results = {
      at: '2026-07-28T12:00:00.000Z',
      total: 2,
      teams: [
        {
          damage: 2,
          dps: 1,
          fullBursts: 1,
          fullBurstUptime: 0,
          units: [{ slug: 'liter', damage: 2, share: 1 }],
        },
      ],
    };
    const withResults = specCacheKey({
      kind: 'team',
      build: TEAM_CODE,
      results,
    });
    expect(withResults).toBe(
      `${specCacheKey({ kind: 'team', build: TEAM_CODE })}|` +
        `${JSON.stringify({ ...results, at: '2026-07-28' })}`
    );
    // different numbers on the same team MUST be a different content address —
    // otherwise one config's card is served at another's URL, forever
    // (the cache files are immutable).
    expect(
      specCacheKey({
        kind: 'team',
        build: TEAM_CODE,
        results: { ...results, total: 3 },
      })
    ).not.toBe(withResults);
    // …but a re-share LATER THE SAME DAY is the same picture: the card prints
    // only the day, so keying the full ISO stamp would mint a new content
    // address per click for pixel-identical output.
    expect(
      specCacheKey({
        kind: 'team',
        build: TEAM_CODE,
        results: { ...results, at: '2026-07-28T23:59:59.000Z' },
      })
    ).toBe(withResults);
    // a different DAY does draw a different footer, so it must fork.
    expect(
      specCacheKey({
        kind: 'team',
        build: TEAM_CODE,
        results: { ...results, at: '2026-07-29T00:00:01.000Z' },
      })
    ).not.toBe(withResults);
    // an undecodable code can't reach a render; the key falls back to the raw
    // string rather than throwing (specCacheKey is exported and must be total)
    expect(specCacheKey({ kind: 'team', build: 'abc' })).toBe('v2|team|abc');
    expect(specCacheKey({ kind: 'roster', build: 'abc' })).toBe(
      'v2|roster|abc'
    );
    expect(specCacheKey({ kind: 'dps', cell: 'c1' })).toBe('v2|dps|c1|-|-');
    expect(specCacheKey({ kind: 'dps', cell: 'c1', element: 'fire' })).toBe(
      'v2|dps|c1|fire|-'
    );
    expect(specCacheKey({ kind: 'dps', cell: 'c1', unit: 'alice' })).toBe(
      'v2|dps|c1|-|alice'
    );
    expect(
      specCacheKey({ kind: 'dps', cell: 'c1', element: 'iron', unit: 'liter' })
    ).toBe('v2|dps|c1|iron|liter');
    // comparison variant: a 6th field, the SORTED slug list (request order
    // must not fork the content address)
    expect(
      specCacheKey({ kind: 'dps', cell: 'c1', units: ['liter', 'alice'] })
    ).toBe('v2|dps|c1|-|-|alice,liter');
    expect(
      specCacheKey({
        kind: 'dps',
        cell: 'c1',
        element: 'fire',
        units: ['modernia', 'alice'],
      })
    ).toBe('v2|dps|c1|fire|-|alice,modernia');
    expect(
      specCacheKey({ kind: 'table', table: 'max-ammo', unit: 'alice' })
    ).toBe('v2|table|max-ammo|alice');
    expect(specCacheKey({ kind: 'table', table: 'charge-speed' })).toBe(
      'v2|table|charge-speed|generic'
    );
    expect(
      specCacheKey({ kind: 'table', table: 'charge-speed', unit: 'alice' })
    ).toBe('v2|table|charge-speed|alice');
  });

  it('maps kinds to the existing cache filename prefixes', () => {
    expect(specCacheType({ kind: 'team', build: 'x' })).toBe('team');
    expect(specCacheType({ kind: 'roster', build: 'x' })).toBe('roster');
    expect(specCacheType({ kind: 'dps', cell: 'c' })).toBe('dps');
    expect(specCacheType({ kind: 'table', table: 'max-ammo', unit: 'a' })).toBe(
      'table'
    );
    expect(specCacheType({ kind: 'table', table: 'charge-speed' })).toBe(
      'table'
    );
  });
});

describe('parseRenderSpec — team/roster', () => {
  it('accepts a valid build code and trims it', () => {
    const r = parseRenderSpec({ kind: 'team', build: ` ${TEAM_CODE} ` });
    expect(r).toEqual({ ok: true, spec: { kind: 'team', build: TEAM_CODE } });
  });

  it('rejects missing / garbage / oversized / non-build codes', () => {
    for (const build of [
      undefined,
      '',
      '   ',
      'garbage',
      'a'.repeat(BUILD_CODE_MAX_LEN + 1),
      Buffer.from('{"hello":"world"}').toString('base64url'),
    ]) {
      expect(parseRenderSpec({ kind: 'team', build })).toEqual({
        ok: false,
        error: 'invalid build code',
      });
    }
  });
});

describe('parseRenderSpec — dps', () => {
  it('defaults the cell and normalizes element/unit', () => {
    expect(parseRenderSpec({ kind: 'dps' })).toEqual({
      ok: true,
      spec: { kind: 'dps', cell: DEFAULT_DPS_CELL },
    });
    expect(
      parseRenderSpec({ kind: 'dps', element: ' FIRE ', unit: ' alice ' })
    ).toEqual({
      ok: true,
      spec: {
        kind: 'dps',
        cell: DEFAULT_DPS_CELL,
        element: 'fire',
        unit: 'alice',
      },
    });
    // empty strings mean "absent", same as the GET query params
    expect(parseRenderSpec({ kind: 'dps', cell: ' ', unit: '' })).toEqual({
      ok: true,
      spec: { kind: 'dps', cell: DEFAULT_DPS_CELL },
    });
  });

  it('rejects an element outside the filter enum', () => {
    expect(parseRenderSpec({ kind: 'dps', element: 'bogus' })).toEqual({
      ok: false,
      error: `unknown element 'bogus'`,
    });
  });

  it('checks cell/unit existence only when data is provided', () => {
    const data = { cells: ['c1', DEFAULT_DPS_CELL], units: ['alice'] };
    expect(parseRenderSpec({ kind: 'dps', cell: 'bogus' }, data)).toEqual({
      ok: false,
      error: `unknown cell 'bogus'`,
    });
    expect(parseRenderSpec({ kind: 'dps', unit: 'bogus' }, data)).toEqual({
      ok: false,
      error: `unknown unit 'bogus'`,
    });
    // without data the same input parses (the server re-validates at render)
    expect(
      parseRenderSpec({ kind: 'dps', cell: 'bogus', unit: 'bogus' }).ok
    ).toBe(true);
  });

  it('units: trims, drops empties, dedupes — an all-empty list means absent', () => {
    expect(
      parseRenderSpec({ kind: 'dps', units: [' alice ', 'liter', 'alice', ''] })
    ).toEqual({
      ok: true,
      spec: { kind: 'dps', cell: DEFAULT_DPS_CELL, units: ['alice', 'liter'] },
    });
    expect(parseRenderSpec({ kind: 'dps', units: [] })).toEqual({
      ok: true,
      spec: { kind: 'dps', cell: DEFAULT_DPS_CELL },
    });
    expect(parseRenderSpec({ kind: 'dps', units: [' ', ''] })).toEqual({
      ok: true,
      spec: { kind: 'dps', cell: DEFAULT_DPS_CELL },
    });
  });

  it('units: rejects non-arrays, >10 slugs, and unknown slugs (with data)', () => {
    expect(parseRenderSpec({ kind: 'dps', units: 'alice' })).toEqual({
      ok: false,
      error: 'units must be an array of unit slugs',
    });
    expect(
      parseRenderSpec({
        kind: 'dps',
        units: Array.from({ length: 11 }, (_, i) => `u${i}`),
      })
    ).toEqual({ ok: false, error: 'units is capped at 10' });
    const data = { units: ['alice', 'liter'] };
    expect(
      parseRenderSpec({ kind: 'dps', units: ['alice', 'bogus'] }, data)
    ).toEqual({ ok: false, error: `unknown unit 'bogus'` });
  });

  it('units and unit (window) are mutually exclusive', () => {
    expect(
      parseRenderSpec({ kind: 'dps', unit: 'alice', units: ['liter'] })
    ).toEqual({ ok: false, error: 'unit and units are mutually exclusive' });
  });
});

describe('parseRenderSpec — table', () => {
  it('max-ammo requires a unit', () => {
    expect(parseRenderSpec({ kind: 'table', table: 'max-ammo' })).toEqual({
      ok: false,
      error: 'unit is required',
    });
    expect(
      parseRenderSpec({ kind: 'table', table: 'max-ammo', unit: 'alice' })
    ).toEqual({
      ok: true,
      spec: { kind: 'table', table: 'max-ammo', unit: 'alice' },
    });
  });

  it('charge-speed allows a missing unit (the generic table)', () => {
    expect(parseRenderSpec({ kind: 'table', table: 'charge-speed' })).toEqual({
      ok: true,
      spec: { kind: 'table', table: 'charge-speed' },
    });
  });

  it('rejects unknown tables and unknown slugs (with data)', () => {
    expect(parseRenderSpec({ kind: 'table', table: 'bogus' }).ok).toBe(false);
    expect(
      parseRenderSpec(
        { kind: 'table', table: 'charge-speed', unit: 'bogus' },
        { units: ['alice'] }
      )
    ).toEqual({ ok: false, error: `unknown unit 'bogus'` });
  });
});

describe('parseRenderSpec — envelope', () => {
  it('rejects non-objects and unknown kinds', () => {
    for (const input of [
      null,
      undefined,
      42,
      'team',
      [],
      { kind: 'bogus' },
      {},
    ]) {
      expect(parseRenderSpec(input).ok).toBe(false);
    }
  });
});
