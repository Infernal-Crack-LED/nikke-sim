// Pins scripts/lib/kit-status-mirrors.ts — the AUTO-mirror comparison shared by
// `kit-status.ts --check` (the verify.sh gate) and `gen-unmodeled-review.ts` (which derives a
// committed doc from those mirrors and refuses to write when they are stale).
//
// Why a test and not just the gate: the gate only ever runs against a FRESH tree, so it proves
// the comparison accepts a match and never that it REJECTS a mismatch. A comparison that
// silently returned [] for everything would keep verify.sh green forever — that is the exact
// shape of the staleness bug this module exists to close (a stale review doc shipped through a
// green verify on 2026-08-09).
import { describe, expect, it } from 'vitest';
import { mirrorStaleness, staleMirrors } from '../lib/kit-status-mirrors.js';

const UNMODELED = { skill1: ['a line'], skill2: [], burst: [] };

describe('kit-status mirror freshness', () => {
  it('accepts a unit whose mirrors match its override', () => {
    expect(
      mirrorStaleness(
        'x',
        { unmodeled: UNMODELED, caveats: ['c'] },
        { unmodeled: UNMODELED, caveats: ['c'] }
      )
    ).toEqual([]);
  });

  it('rejects a stale unmodeled mirror', () => {
    expect(
      mirrorStaleness(
        'x',
        { unmodeled: UNMODELED, caveats: null },
        { unmodeled: { skill1: [], skill2: [], burst: [] }, caveats: null }
      )
    ).toEqual(['x: unmodeled mirror stale (run --refresh)']);
  });

  it('rejects a stale caveats mirror — the 2026-07-23 hole, invisible while only `unmodeled` was compared', () => {
    expect(
      mirrorStaleness(
        'x',
        { unmodeled: UNMODELED, caveats: ['old wording'] },
        { unmodeled: UNMODELED, caveats: ['rewritten wording'] }
      )
    ).toEqual(['x: caveats mirror stale (run --refresh)']);
  });

  it('treats a missing override `unmodeled` as the empty shape, not as a mismatch', () => {
    // Overrides may omit the field entirely; kit-status.json always stores the filled shape.
    expect(
      mirrorStaleness(
        'x',
        { unmodeled: { skill1: [], skill2: [], burst: [] } },
        {}
      )
    ).toEqual([]);
  });

  it('the committed tree is fresh (the same sweep both gates run)', () => {
    expect(staleMirrors()).toEqual([]);
  });
});
