// Gauge-per-shot source-of-truth: the per-unit full-charge focus multiplier is now
// characters.json chargeMultiplier, with data/gauge-per-shot.json fullChargeBonus as
// an explicit override only when characters.json reports 0 (the non-charge marker).
//
// This test enforces that the two sources do not silently disagree for any SR/RL unit,
// lists the known exceptions, and — since the engine's `?? 250` class-modal default was
// RETIRED (owner ruling 2026-08-12, re-affirmed 2026-08-18: the gauge bonus IS the charge
// bonus, for every unit) — carries the guard that replaced it. A unit with no bonus in
// either column now takes x1.0, which is CORRECT for a unit that never full-charges
// (`pascal`, chargeFrames 0) and WRONG for a charge-capable unit whose data went missing.
// The `chargeFrames` test below is what tells those two apart, loudly, instead of a magic
// number papering over both.
import { describe, expect, it } from 'vitest';
import rawData from '../../../data/characters.json' with { type: 'json' };
import gaugeTable from '../../../data/gauge-per-shot.json' with { type: 'json' };

const data = rawData as unknown as {
  characters: Record<
    string,
    { weapon: string; chargeMultiplier: number; chargeFrames?: number }
  >;
};
const characters = data.characters;

const CHARGE_WEAPONS = new Set(['SR', 'RL']);

// Known exceptions where characters.json chargeMultiplier is 0 but a gauge row
// fullChargeBonus is positive (the row is the explicit override).
const CHARGE_MULT_ZERO_EXCEPTIONS = new Set(['raven']);

// Units with no gauge row but a non-modal chargeMultiplier. They will now use
// characters.json instead of the class-modal fallback.
const NO_ROW_NON_MODAL = new Set(['belorta', 'n102', 'yan', 'yuni']);

describe('gauge-per-shot fullChargeBonus source', () => {
  const slugs = Object.keys(characters).filter((slug) =>
    CHARGE_WEAPONS.has(characters[slug].weapon)
  );

  it('every SR/RL unit has a positive chargeMultiplier or a known override row', () => {
    for (const slug of slugs) {
      const c = characters[slug];
      const row = (gaugeTable as Record<string, { fullChargeBonus?: number }>)[
        slug
      ];
      const cm = c.chargeMultiplier;
      const fcb = row?.fullChargeBonus;
      if (cm > 0) {
        continue;
      } // engine source is healthy
      if (fcb && fcb > 0) {
        expect(
          CHARGE_MULT_ZERO_EXCEPTIONS.has(slug),
          `${slug}: chargeMultiplier=${cm} but gauge fullChargeBonus=${fcb}; add to exceptions if this is intentional`
        ).toBe(true);
      }
    }
  });

  it('gauge fullChargeBonus equals characters.json chargeMultiplier when both are positive', () => {
    const mismatches: string[] = [];
    for (const slug of slugs) {
      const c = characters[slug];
      const row = (gaugeTable as Record<string, { fullChargeBonus?: number }>)[
        slug
      ];
      const cm = c.chargeMultiplier;
      const fcb = row?.fullChargeBonus;
      if (cm > 0 && fcb && fcb > 0 && cm !== fcb) {
        mismatches.push(`${slug}: chargeMultiplier=${cm} vs gauge=${fcb}`);
      }
    }
    expect(mismatches).toEqual([]);
  });

  it('every CHARGE-CAPABLE unit resolves a bonus from one of the two datamines', () => {
    // THE GUARD THAT REPLACED THE RETIRED `?? 250` DEFAULT, and the reason retiring it was not
    // a code-safety loss. `chargeFrames > 0` means the unit actually performs a full charge, so
    // a bonus missing from BOTH columns is a data hole rather than a game fact — and the engine
    // would hand it x1.0 silently. `chargeFrames` is exactly what separates "does not charge"
    // from "data went missing", which the magic number could not distinguish.
    //
    // Today the only zero-bonus unit is `pascal` (RL/Iron), who has chargeFrames 0 and therefore
    // correctly takes no focus bonus. Scanned across ALL characters, not just SR/RL, so a charge
    // weapon appearing on another class cannot slip past.
    const holes = Object.entries(characters)
      .filter(([slug, c]) => {
        const fcb = (
          gaugeTable as Record<string, { fullChargeBonus?: number }>
        )[slug]?.fullChargeBonus;
        return (
          (c.chargeFrames ?? 0) > 0 &&
          !(c.chargeMultiplier > 0) &&
          !(fcb && fcb > 0)
        );
      })
      .map(([slug]) => slug);
    expect(holes).toEqual([]);
  });

  it('flags no-row units with a positive chargeMultiplier so they do not fall back silently', () => {
    for (const slug of NO_ROW_NON_MODAL) {
      const c = characters[slug];
      expect(c.chargeMultiplier).toBe(350);
      expect(
        (gaugeTable as Record<string, { fullChargeBonus?: number }>)[slug]
      ).toBeUndefined();
    }
  });
});
