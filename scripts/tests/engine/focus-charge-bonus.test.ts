/**
 * The camera-focus burst-gauge bonus IS the unit's full-charge bonus — one rule, every unit,
 * no roster default.
 *
 * THE RULING THIS ENCODES (owner, 2026-08-12, re-affirmed 2026-08-18): "we know that's how that
 * full charge bonus works — get rid of the 250 fallback unless there's a good code safety reason
 * for it, and implement the gauge bonus = charge bonus on all units." Nothing here is derived or
 * fitted: the value is the datamined `chargeMultiplier` (characters.json), with
 * gauge-per-shot.json's `fullChargeBonus` — the full_charge_burst_energy column, the same
 * quantity from a second datamine — filling in where the character row reports 0.
 * `scripts/tests/data/gauge-per-shot-source.test.ts` holds the two sources to each other
 * roster-wide and guards against a charge-capable unit having neither.
 *
 * WHAT THE RULING MOVED: exactly one unit, `pascal`. Every other charge unit is byte-identical.
 */
import { describe, expect, it } from 'vitest';
import { gaugeSubstepLedger } from '../../battery/gauge-substep-ledger.js';

/** Largest credit magnitude a solo (therefore camera-focused) unit emits = her weapon shot. */
function weaponCredit(slug: string): number {
  const [ledger] = gaugeSubstepLedger({ slugs: [slug], bossElement: null });
  expect(ledger.pulls.length).toBeGreaterThan(0);
  return ledger.families[0].delta;
}

describe('focus gauge bonus = the unit full-charge bonus', () => {
  it('sources the modal 250 family from the datamine, unchanged', () => {
    // maiden-ice-rose (RL/Electric): target 364 x 2.5 = 9.10, the measured solo anchor.
    expect(weaponCredit('maiden-ice-rose')).toBeCloseTo(9.1, 2);
  });

  it('honours non-modal datamined values', () => {
    // alice (SR/Fire — NOT alice-wonderland-bunny) 560 x 3.5, and scarlet-black-shadow
    // (RL/Wind, aka "sbs" — NOT scarlet) 250 x 1.5. Both measured + enacted 2026-07-29.
    expect(weaponCredit('alice')).toBeCloseTo(19.6, 2);
    expect(weaponCredit('scarlet-black-shadow')).toBeCloseTo(3.75, 2);
  });

  it('fills in from gauge-per-shot when the character row reports 0: raven', () => {
    // raven (RL/Iron): chargeMultiplier 0 but chargeFrames 60 — she genuinely charges, and the
    // second datamine carries her 250. She is why the fill-in arm exists, and why "no bonus in
    // either column" is a meaningfully different state from "character row reads 0".
    expect(weaponCredit('raven')).toBeCloseTo(7.0, 2);
  });
});

describe('a unit that never full-charges takes NO focus bonus', () => {
  it('pascal generates the same per shot focused and unfocused', () => {
    // THE CASE THE RULING FIXED. pascal (RL/Iron) has chargeFrames 0 — she fires without
    // charging — yet the retired `?? 250` class-modal default handed her a x2.5 focus bonus for
    // a full charge she never performs (7.00 per shot). She now takes UNFOCUSED_CHARGE_GEN
    // (x1.0, the measured unfocused value), so focus makes no difference to her at all: 2.80
    // either way. That is why the fallback had to GO rather than be re-pointed at another
    // number — it was inventing a value, not guarding one.
    const focused = weaponCredit('pascal');
    const [unfocused] = gaugeSubstepLedger({
      // focusIdx defaults to Math.min(2, len-1) = slot 2 for a 3-unit team (the LAST slot,
      // crown — not the middle), so seating pascal at slot 0 makes her unfocused either way
      slugs: ['pascal', 'liter', 'crown'],
      bossElement: null,
    });
    expect(focused).toBeCloseTo(2.8, 2);
    expect(unfocused.families[0].delta).toBeCloseTo(focused, 4);
  });
});

describe('no flat multiplier survives anywhere in the ladder', () => {
  it('vesti-tactical-upgrade takes her datamined 200, not the retired flat 2.5', () => {
    // THE LAST PIN, retired by owner ruling 2026-08-18. She was held at a flat 2.5 by
    // PENDING_TEAM_ISOLATION while her 200 column went un-isolated on footage. Once the roster
    // default was gone that 2.5 became an ORPHAN — not measured, not datamined for her, and no
    // longer a default — so the pin was substituting a value with NO provenance for one both
    // datamines agree on (chargeMultiplier 200 and fullChargeBonus 200), and holding her to a
    // footage standard the other 74 chargeMultiplier-sourced units never met.
    // 130 target x 2.0 = 2.60. Under the retired pin this read 3.25.
    // Her column is still UNMEASURED — a focused solo recording would CONFIRM it (her kit
    // build's ⚑3 carries the recipe), but it no longer gates the value.
    expect(weaponCredit('vesti-tactical-upgrade')).toBeCloseTo(2.6, 2);
  });

  it('every charge unit resolves from its own datamines or takes x1.0', () => {
    // The invariant the retirement buys: no slug is special-cased to a flat number. cinderella
    // (RL/Electric) is the ONLY per-unit override left, via charFixes.focusChargeMult 2.0 —
    // and that equals her own chargeMultiplier/100, so even she is not an exception in value.
    expect(weaponCredit('cinderella')).toBeCloseTo(0.9, 2);
  });
});
