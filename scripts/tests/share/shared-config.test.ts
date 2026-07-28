// The shareable saved-config codec (src/share/shared-config.ts) — the payload
// behind an id-based share link.
//
// The decoder is the trust boundary for the whole feature: the blob arrives
// from a PUBLIC, unauthenticated read and is then handed straight to a canvas
// renderer whose output is content-addressed and cached forever. So most of
// what is pinned here is the refusal behavior — a NaN that reaches a fillText
// bakes the string "NaN" into an immutable PNG.
import { describe, expect, it } from 'vitest';
import {
  decodeSharedConfig,
  encodeSharedConfig,
  normalizeSharedResults,
  sharedConfigIdentity,
  shareProfileName,
  simmedDay,
  SHARED_CONFIG_VERSION,
  type SharedConfig,
} from '../../../src/share/shared-config.js';

const CFG: SharedConfig = {
  v: SHARED_CONFIG_VERSION,
  kind: 'team',
  build: 'BUILDCODE',
  results: {
    at: '2026-07-28T12:00:00.000Z',
    total: 300,
    teams: [
      {
        damage: 300,
        dps: 1.5,
        fullBursts: 4,
        fullBurstUptime: 0.42,
        units: [
          { slug: 'liter', damage: 100, share: 0.33 },
          { slug: 'alice', damage: 200, share: 0.67 },
        ],
      },
    ],
  },
};

// base64url of UTF-8 JSON, same alphabet as a build code — the store's `code`
// column only accepts [A-Za-z0-9_-].
const encodeRaw = (o: unknown): string =>
  Buffer.from(JSON.stringify(o), 'utf8').toString('base64url');

describe('shared-config codec', () => {
  it('round-trips a config with results', () => {
    expect(decodeSharedConfig(encodeSharedConfig(CFG))).toEqual(CFG);
  });

  it('emits only URL/DB-safe characters', () => {
    expect(encodeSharedConfig(CFG)).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('round-trips a config with no results at all', () => {
    const bare: SharedConfig = { v: 1, kind: 'roster', build: 'X' };
    expect(decodeSharedConfig(encodeSharedConfig(bare))).toEqual(bare);
  });

  it('rejects malformed, wrong-version and wrong-kind payloads', () => {
    expect(decodeSharedConfig('')).toBeNull();
    expect(decodeSharedConfig('not-base64!!')).toBeNull();
    expect(decodeSharedConfig(encodeRaw({ hello: 'world' }))).toBeNull();
    expect(
      decodeSharedConfig(encodeRaw({ ...CFG, v: SHARED_CONFIG_VERSION + 1 }))
    ).toBeNull();
    expect(decodeSharedConfig(encodeRaw({ ...CFG, kind: 'dps' }))).toBeNull();
    expect(decodeSharedConfig(encodeRaw({ ...CFG, build: '' }))).toBeNull();
  });

  it('drops results that carry no timestamp', () => {
    // `at` is the staleness signal the snapshot model rests on — numbers of
    // unknown age are worse than no numbers, so they degrade to the
    // composition card rather than printing undated damage.
    const noStamp = encodeRaw({
      ...CFG,
      results: { total: 1, teams: [{ damage: 1, units: [] }] },
    });
    expect(decodeSharedConfig(noStamp)?.results).toBeUndefined();
  });

  it('drops an empty team list rather than yielding empty results', () => {
    const empty = encodeRaw({ ...CFG, results: { at: 'x', teams: [] } });
    expect(decodeSharedConfig(empty)?.results).toBeUndefined();
  });
});

// The defect this suite exists to prevent from coming back: `at` moves on every
// click, so a share NAME derived from the encoded payload is different every
// time — every press mints a fresh profile row and marches the user toward the
// store's 100-per-kind cap on a config that never changed. Found in
// cross-family review 2026-07-28, when the code carried a comment promising an
// idempotency the hash did not deliver.
describe('share identity — re-sharing an unchanged config is idempotent', () => {
  const laterSameDay: SharedConfig = {
    ...CFG,
    results: { ...CFG.results!, at: '2026-07-28T23:59:59.000Z' },
  };

  it('gives the same profile name to two clicks on the same config and day', () => {
    expect(sharedConfigIdentity(laterSameDay)).toBe(sharedConfigIdentity(CFG));
    expect(shareProfileName(sharedConfigIdentity(laterSameDay))).toBe(
      shareProfileName(sharedConfigIdentity(CFG))
    );
  });

  it('does NOT collapse configs that differ in anything the card draws', () => {
    const differentNumbers: SharedConfig = {
      ...CFG,
      results: {
        ...CFG.results!,
        teams: [{ ...CFG.results!.teams[0], damage: 999 }],
      },
    };
    const differentBuild: SharedConfig = { ...CFG, build: 'OTHERCODE' };
    const differentKind: SharedConfig = { ...CFG, kind: 'roster' };
    // the day IS drawn on the card, so it is part of the identity
    const nextDay: SharedConfig = {
      ...CFG,
      results: { ...CFG.results!, at: '2026-07-29T00:00:01.000Z' },
    };
    const base = sharedConfigIdentity(CFG);
    for (const other of [
      differentNumbers,
      differentBuild,
      differentKind,
      nextDay,
    ]) {
      expect(sharedConfigIdentity(other)).not.toBe(base);
    }
  });

  it('separates a config with results from the same config without them', () => {
    const bare: SharedConfig = { v: 1, kind: 'team', build: CFG.build };
    expect(sharedConfigIdentity(bare)).not.toBe(sharedConfigIdentity(CFG));
  });
});

describe('simmedDay — the one derivation of the drawn date', () => {
  it('reports the UTC day, whatever offset the stamp carries', () => {
    // A payload is public and hand-craftable, so an offset stamp must resolve
    // the same way the footer renders it — the renderer and the cache key both
    // call THIS function precisely so they cannot disagree.
    expect(simmedDay('2026-07-28T12:00:00.000Z')).toBe('2026-07-28');
    expect(simmedDay('2026-07-28T23:00:00-05:00')).toBe('2026-07-29');
  });

  it('returns null for a stamp it cannot parse, rather than a bogus date', () => {
    expect(simmedDay(undefined)).toBeNull();
    expect(simmedDay('')).toBeNull();
    expect(simmedDay('yesterday')).toBeNull();
  });
});

describe('shared-config decoder hardening', () => {
  it('clamps non-finite and negative numbers to 0', () => {
    const r = normalizeSharedResults({
      at: 'x',
      total: Number.NaN,
      teams: [
        {
          damage: Number.POSITIVE_INFINITY,
          dps: -5,
          fullBursts: 'four',
          fullBurstUptime: null,
          units: [{ slug: 'liter', damage: Number.NaN, share: -1 }],
        },
      ],
    })!;
    expect(r.teams[0]).toEqual({
      damage: 0,
      dps: 0,
      fullBursts: 0,
      fullBurstUptime: 0,
      units: [{ slug: 'liter', damage: 0, share: 0 }],
    });
    // total falls back to the sum of the (now zero) rows, not NaN
    expect(r.total).toBe(0);
  });

  it('clamps a share above 1 — the bar width is drawn from it', () => {
    const r = normalizeSharedResults({
      at: 'x',
      teams: [{ damage: 1, units: [{ slug: 'liter', damage: 1, share: 99 }] }],
    })!;
    expect(r.teams[0].units[0].share).toBe(1);
  });

  it('bounds a slug — it becomes cache-key material and a sidecar entry', () => {
    const r = normalizeSharedResults({
      at: 'x',
      teams: [{ damage: 1, units: [{ slug: 'x'.repeat(5000), damage: 1 }] }],
    })!;
    expect(r.teams[0].units[0].slug!.length).toBe(64);
  });

  it('caps the team and unit counts a hostile payload can request', () => {
    const r = normalizeSharedResults({
      at: 'x',
      teams: Array.from({ length: 50 }, () => ({
        damage: 1,
        units: Array.from({ length: 40 }, () => ({ slug: 'liter' })),
      })),
    })!;
    expect(r.teams).toHaveLength(5);
    expect(r.teams[0].units).toHaveLength(5);
  });

  it('derives the total from the rows when none is given', () => {
    const r = normalizeSharedResults({
      at: 'x',
      teams: [
        { damage: 10, units: [] },
        { damage: 32, units: [] },
      ],
    })!;
    expect(r.total).toBe(42);
  });

  it('treats a non-object results field as absent', () => {
    expect(normalizeSharedResults(null)).toBeUndefined();
    expect(normalizeSharedResults('results')).toBeUndefined();
    expect(normalizeSharedResults(42)).toBeUndefined();
  });
});
