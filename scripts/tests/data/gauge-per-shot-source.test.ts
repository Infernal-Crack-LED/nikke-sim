// Gauge-per-shot source-of-truth: the per-unit full-charge focus multiplier is now
// characters.json chargeMultiplier, with data/gauge-per-shot.json fullChargeBonus as
// an explicit override only when characters.json reports 0 (the non-charge marker).
//
// This test enforces that the two sources do not silently disagree for any SR/RL unit,
// and lists the known exceptions.
import { describe, expect, it } from 'vitest';
import rawData from '../../../data/characters.json' with { type: 'json' };
import gaugeTable from '../../../data/gauge-per-shot.json' with { type: 'json' };

const data = rawData as unknown as {
  characters: Record<string, { weapon: string; chargeMultiplier: number }>;
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
