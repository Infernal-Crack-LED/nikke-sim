/**
 * The engine's burst-gauge SUB-STEP structure, scored against the repo's labeled anchor.
 *
 * WHAT THIS PINS. A unit carrying a per-shot damage rider gets TWO gauge credits on the frame of
 * one trigger pull: `shotGauge()` for the weapon shot, `skillGauge()` for the rider's damage
 * instance. That structure is MEASURED, not an engine invention — `maiden-ice-rose`'s solo gauge
 * bar was hand-read on 2026-07-13 at 12.55%/pull IN TWO SUB-STEPS of +9.1% then +3.45%
 * (docs/data/burst-gauge.md §6), and the committed video reader scores the same footage
 * independently (gauge-fill-anchor.test.ts: the rider sub-step reads 3.64 exactly).
 *
 * WHY IT EXISTS. The two-credits-per-pull shape was logged on 2026-08-03 as a suspected
 * "skillGauge fires twice per shot" double-crediting DEFECT and could not be reproduced by
 * inspection on 2026-08-10; the batched gauge-economy proposal requires reproduction before any
 * correction. These assertions are that reproduction, and they read the other way: the second
 * credit is the rider's own measured generation, at the measured magnitude. If a future gauge
 * change starts emitting three credits per pull, or moves the rider off its flat (no
 * focus-charge bonus) value, this test is what catches it.
 *
 * Instrument: scripts/battery/gauge-substep-ledger.ts (constraint 9 — the ad-hoc /tmp driver
 * that once cited this same anchor was lost; this is its committed replacement).
 */
import { describe, expect, it } from 'vitest';
import {
  MAIDEN_ANCHOR,
  gaugeSubstepLedger,
} from '../battery/gauge-substep-ledger.js';

describe('burst-gauge sub-steps vs the maiden-ice-rose labeled anchor', () => {
  const [anchor] = gaugeSubstepLedger({
    slugs: [MAIDEN_ANCHOR.slug],
    bossElement: null,
  });

  it('credits gauge exactly TWICE per pull — weapon shot + rider, never more', () => {
    expect(anchor.pulls.length).toBeGreaterThanOrEqual(6);
    expect(Object.keys(anchor.substepHistogram)).toEqual(['2']);
  });

  it('reproduces both measured sub-steps: weapon 9.10, rider 3.64', () => {
    expect(anchor.families.map((f) => f.delta)).toEqual([
      MAIDEN_ANCHOR.weaponSubstep,
      MAIDEN_ANCHOR.riderSubstep,
    ]);
    // Every pull carries one of each — the rider is not skipped or double-counted on any shot.
    const [weapon, rider] = anchor.families;
    expect(weapon.count).toBe(anchor.pulls.length);
    expect(rider.count).toBe(anchor.pulls.length);
  });

  it('puts the focus-charge bonus on the WEAPON step only (rider is flat)', () => {
    // ×2.5 at full charge for the camera-focused unit; a solo unit is always focused. The rider
    // takes no focus/charge bonus — measured (364 rider vs 910 weapon), and the ratio is the
    // cleanest single check that the two credits come from different paths.
    const [weapon, rider] = anchor.families;
    expect(weapon.delta / rider.delta).toBeCloseTo(2.5, 3);
  });

  it('lands within the hand read, which quantises to ~0.7% bar columns', () => {
    expect(anchor.meanPerPull).toBeCloseTo(
      MAIDEN_ANCHOR.weaponSubstep + MAIDEN_ANCHOR.riderSubstep,
      2
    );
    expect(
      Math.abs(anchor.meanPerPull - MAIDEN_ANCHOR.handReadPerPull)
    ).toBeLessThan(0.7);
  });

  it('holds her measured 1.37s within-magazine cadence', () => {
    // The reader test asserts the same number off the video (a 1.2s wait + the sub-step
    // separation); here the two sub-steps share a frame, so the gap is pull-to-pull.
    expect(anchor.medianPullGapSec).toBeCloseTo(1.37, 1);
    expect(anchor.maxPullGapSec).toBeGreaterThan(2); // the reload pause is the one long gap
  });
});

// DELIBERATELY NOT PINNED HERE: the per-pull rider-credit COUNT.
//
// This file used to close with a "one credit per AUTHORED rider block" test, asserting that
// `snow-white-heavy-arms` (SR/Iron) emits weapon + 2 riders = 3 credits per pull. That rule was
// superseded on 2026-08-15 by `4d60a624` ("engine: per-subhit gauge credit on sequential
// flatDamage riders"), which added the `gaugeHits` effect field — `skillGauge` now fires N times
// per block — on a measured premise that her volley generates per hit. The old assertion is
// simply stale, so it is gone rather than re-pointed.
//
// It is not re-pinned at the new number because that number is not yet understood: she authors
// `gaugeHits: 5` and `gaugeHits: 10` across her two blocks (15 calls), while the ledger observes
// SIX rider credits per pull. That may be correct — the blocks may not both fire every pull, and
// `sim.ts` has a separate projectile-landing credit path (`landingGaugeHits`) — but nobody has
// re-derived it, and pinning an observed output you cannot explain pins the defect along with the
// behaviour. Recorded as an OBSERVATION (2026-08-18, n=1 ledger read, not a verdict); the
// discriminating structure lives in `scripts/tests/battery/multihit-crediting.test.ts`, which
// `4d60a624` updated as its own gate. Tracked as open work in
// `docs/engine-modeling-gaps.md` §20b — not just this comment.
