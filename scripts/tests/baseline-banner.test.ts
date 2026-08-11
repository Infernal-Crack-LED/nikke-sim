// Pins scripts/lib/baseline-banner.ts — the durability guard `kit-status.ts --check` runs in
// verify.sh, so /kit-parse's provenance banner cannot outlive the claim it makes.
//
// Why a test and not just the gate: the committed tree is CLEAN (the 2026-08-10 Tier 0 sweep
// deleted every stale banner), so the gate alone only ever proves the check accepts a clean
// tree — never that it REJECTS the stale shape. A guard that returned [] for everything would
// keep verify.sh green through exactly the regression it exists to catch, which is how the 19
// carriers survived: their banner's own kit-status classifier branch was dead code for all of
// them and nothing noticed for weeks.
import { describe, expect, it } from 'vitest';
import {
  BASELINE_BANNER,
  NO_RECORDING_CLAIM,
  bannerStaleness,
  staleBanners,
} from '../lib/baseline-banner.js';

const BANNER = `${BASELINE_BANNER} — NOT a validated model) — parsed from kit text.`;
const UNTUNED = { hasSpecTest: false, boardReadings: 0, gradedTeams: 0 };

describe('kit-parse baseline-banner durability', () => {
  it('accepts the banner on a genuinely untuned unit — the case it is written for', () => {
    expect(bannerStaleness('x', BANNER, UNTUNED)).toEqual([]);
  });

  it('rejects the banner on a unit that has a spec test', () => {
    const [error] = bannerStaleness('x', BANNER, {
      ...UNTUNED,
      hasSpecTest: true,
    });
    expect(error).toContain('scripts/tests/units/x.test.ts');
    expect(error).toContain('asserts the opposite of the tree');
  });

  it('rejects the banner on a unit that passed the kit-autonomy gauntlet', () => {
    // The gauntlet marker lives in the note itself — the same string kit-status `provenance()`
    // reads — so a gauntleted unit is caught even before it has a spec-test file.
    const note = `${BANNER} Kit-autonomy gauntlet 2026-07-30: GO.`;
    expect(bannerStaleness('x', note, UNTUNED)).toEqual([
      expect.stringContaining('a kit-autonomy gauntlet pass'),
    ]);
  });

  it('names BOTH signals when a unit carries both', () => {
    const note = `${BANNER} Kit-autonomy gauntlet 2026-07-30: GO.`;
    expect(
      bannerStaleness('x', note, { ...UNTUNED, hasSpecTest: true })
    ).toEqual([
      expect.stringContaining('test.ts and a kit-autonomy gauntlet pass'),
    ]);
  });

  it('accepts the reworded "no recording yet" claim while the unit really has no fight', () => {
    // The wording D1 KEPT, on the 18 units it was kept for.
    const note = `${NO_RECORDING_CLAIM} — every flagged value is an unmeasured estimate.`;
    expect(
      bannerStaleness('x', note, { ...UNTUNED, hasSpecTest: true })
    ).toEqual([]);
  });

  it('rejects the reworded claim once a real fight lands (board readings)', () => {
    const note = `${NO_RECORDING_CLAIM} — every flagged value is an unmeasured estimate.`;
    expect(
      bannerStaleness('x', note, { ...UNTUNED, boardReadings: 3 })
    ).toEqual([expect.stringContaining('3 board reading(s)')]);
  });

  it('rejects the reworded claim once a real fight lands (graded teams)', () => {
    const note = `${NO_RECORDING_CLAIM} — every flagged value is an unmeasured estimate.`;
    expect(bannerStaleness('x', note, { ...UNTUNED, gradedTeams: 2 })).toEqual([
      expect.stringContaining('2 graded team(s)'),
    ]);
  });

  it('says nothing about a note that makes no provenance claim at all', () => {
    expect(
      bannerStaleness('x', 'Hand-authored from the kit text.', {
        hasSpecTest: true,
        boardReadings: 4,
        gradedTeams: 2,
      })
    ).toEqual([]);
  });

  it('the committed tree carries no stale banner (the same sweep the gate runs)', () => {
    expect(staleBanners()).toEqual([]);
  });
});
