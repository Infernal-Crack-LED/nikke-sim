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

describe('PENDING_TEAM_ISOLATION still overrides the rule', () => {
  it('vesti-tactical-upgrade remains held at the flat 2.5, NOT her datamined 200', () => {
    // ⚑ OPEN QUESTION, deliberately pinned to today's behaviour rather than resolved here.
    // She is the last surviving user of FOCUS_CHARGE_GEN. The hold is an EVIDENCE decision
    // (sim.ts comment refreshed 2026-08-13): her 200 column has never been isolated on footage,
    // so the pin "withholds an unmeasured value" rather than asserting 200 is wrong.
    // The counter-argument, unresolved: 2.5 is now an orphan — not measured, not datamined for
    // her, and no longer a roster default — so the pin substitutes a value with NO provenance
    // for one both datamines agree on (chargeMultiplier 200 and fullChargeBonus 200), and holds
    // her to a footage standard the other 74 chargeMultiplier-sourced units do not meet.
    // Board-inert either way: she appears in zero graded or regression comps.
    expect(weaponCredit('vesti-tactical-upgrade')).toBeCloseTo(3.25, 2);
  });
});
