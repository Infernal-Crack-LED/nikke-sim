// Functional test for the reload-triggered buff-removal primitive (removeOnReload).
//
// The primitive is INERT for every committed override (no unit sets removeOnReload today, so the
// regression snapshot is byte-identical — that proves inertness). This test proves the mechanism
// actually FIRES, using cinderella (RL/Electric) as an in-memory fixture ONLY: it swaps her
// permanent chargeSpeedPct-45 passive for the faithful kit toggle — a shotFired → chargeSpeedPct
// 100 buff flagged removeOnReload:true — WITHOUT touching her committed override JSON (kept +45 on
// disk; the faithful toggle is HELD pending the divisive-CS gated pass, see DECISIONS 2026-07-21).
//
// Cinderella charges 1s/shot at CS 0 and ~instantly at CS 100 (subtractive, capped). With the
// toggle: shot 1 of each magazine charges at CS 0 (buff not yet re-applied), shots 2-24 at CS 100.
// removeOnReload strips the buff on every reload-to-max, so EACH new magazine starts slow again.
// If the strip did NOT fire, CS would stick at 100 after the first full charge for the whole fight,
// so only ONE slow shot would ever occur → MORE total pulls. The pull-count gap is the observable.
import { describe, expect, it } from 'vitest';
import { runComp, unitOf, withPatchedOverride } from '../lib/harness.js';

// Run solo cinderella (RL) with an in-memory override whose CS is the reload-toggle; `strip` picks
// whether the CS buff is flagged removeOnReload. Returns her total pull (rocket) count over 180s.
function cindyPulls(strip: boolean): number {
  const cinderella = withPatchedOverride('cinderella', (ov) => {
    // This fixture isolates the CS/removeOnReload per-rocket-charge cadence path, so disable her
    // committed magDumpRof (whole-mag dump, DECISIONS 2026-07-21): under mag-dump CS only shortens the
    // ONE prime charge per magazine, not each rocket, so the toggle would have no observable cadence
    // effect. Removing it here restores the per-rocket-charge model the mechanism test needs.
    if (ov.charFixes) delete ov.charFixes.magDumpRof;
    // Replace her passive chargeSpeedPct-45 block with the faithful full-charge → CS 100 toggle.
    ov.skill1 = [
      {
        slot: 'skill1',
        trigger: { kind: 'shotFired' }, // every full-charge rocket (RL: every pull is a full charge)
        target: { kind: 'self' },
        effects: [{ kind: 'buff', stat: 'chargeSpeedPct', value: 100, removeOnReload: strip }],
      },
    ];
  });
  const res = runComp({
    slugs: ['cinderella'],
    bossElement: 'Water',
    focusSlug: 'cinderella',
    overrides: { cinderella },
  });
  return unitOf(res, 'cinderella').pulls;
}

describe('reload-triggered buff removal (removeOnReload)', () => {
  const pullsStrip = cindyPulls(true);
  const pullsNoStrip = cindyPulls(false);

  it('strips the buff on reload — one slow (CS-0) charge per magazine', () => {
    // Without the strip, CS sticks at 100 after the first full charge for the whole fight.
    expect(
      pullsStrip,
      `strip-on ${pullsStrip} should be < strip-off ${pullsNoStrip}`,
    ).toBeLessThan(pullsNoStrip);
  });

  it('has a substantial effect (many reloads over 180s), not a rounding artifact', () => {
    expect(
      pullsNoStrip - pullsStrip,
      `strip effect too small to be the mechanism (Δ=${pullsNoStrip - pullsStrip})`,
    ).toBeGreaterThanOrEqual(100);
  });

  it('is deterministic — the seedless run reproduces', () => {
    expect(cindyPulls(true)).toBe(pullsStrip);
  });
});
