// Layout invariant for the unit card's bar-chart band: rows never draw outside their slot.
//
// layoutCharts divides a FIXED band (owner ruling 2 — every card emits at the same size)
// proportionally between the charts, but drawBarChart used to place rows at a fixed nominal rowH
// regardless of what its slot could hold. Measured across all 390 renders on 2026-07-28, that ran
// the last rows of chart 1 under chart 2's header, and on the portrait variant into the notes
// panel — worst case prika/twitter at 78px over, and crown/discord (the golden fixture subject) at
// 8px, so the committed fixture itself carried an overlap.
//
// fittedRowH is the fix: geometry follows what the slot affords, typography stays keyed to the
// variant's nominal rowH. Rows get tighter on a crowded card rather than a neighbour being dropped
// or clipped — the neighbours are what the chart is FOR.
import { describe, expect, it } from 'vitest';
import {
  fittedRowH,
  rankTileWidth,
  tileAltFont,
  tileAltLine,
  tileChipFont,
  tileTitleFont,
  TILE_SUB_PAD,
  TILE_TITLE_PAD,
} from '../../../src/infographics/core/unitCard.js';
import { PROFILE_LABELS } from '../../../src/infographics/core/rankTables.js';
import { eleAdvTitle } from '../../../src/infographics/core/unitCardData.js';
import { createCanvas } from '../../../src/infographics/node/render.js';
import { ELEMENTS } from '../../../src/elements.js';

describe('fittedRowH', () => {
  it('returns the nominal height when the rows already fit', () => {
    expect(fittedRowH(230, 5, 46)).toBe(46);
    expect(fittedRowH(1000, 5, 46)).toBe(46); // never grows past nominal
  });

  it('shrinks rows to fit a compressed slot', () => {
    // prika/twitter's crowded case: 6 rows into the space a 6+6 card's slot leaves.
    expect(fittedRowH(227, 5, 46)).toBe(45);
    expect(fittedRowH(240, 6, 46)).toBe(40);
  });

  it('never lets rows exceed the space available', () => {
    for (const avail of [50, 137, 227, 240, 300, 534]) {
      for (const rows of [1, 2, 3, 4, 5, 6, 7]) {
        const h = fittedRowH(avail, rows, 46);
        expect(h * rows).toBeLessThanOrEqual(avail);
        expect(h).toBeLessThanOrEqual(46);
      }
    }
  });

  it('is total on the degenerate inputs a chart can hand it', () => {
    expect(fittedRowH(200, 0, 34)).toBe(34); // empty/unranked chart draws its own plate
    expect(Number.isFinite(fittedRowH(0, 3, 34))).toBe(true);
  });
});

// The ele-adv tile's title carries the unit's ELEMENT (it ranks within that
// element, so the label has to name the pool). A title that overruns its tile is
// silently ellipsised by fitText, and the element is at the END — it is exactly
// the part that would vanish. The landscape tile is the tightest text slot on the
// card, and 'ELE. ADV. DPS · ELECTRIC' overran it, which is why the label drops
// 'DPS'. Measured against the renderer's OWN geometry + font, not a copy.
describe('rank tile titles fit their tile', () => {
  const ctx = createCanvas(64, 64).getContext('2d');
  const fits = (title: string, variant: 'discord' | 'twitter'): number => {
    const { width, big } = rankTileWidth(variant);
    ctx.font = tileTitleFont(big);
    return width - TILE_TITLE_PAD - ctx.measureText(title.toUpperCase()).width;
  };

  it('fits every element on both variants', () => {
    for (const el of ELEMENTS) {
      for (const variant of ['discord', 'twitter'] as const) {
        expect(
          fits(eleAdvTitle(el), variant),
          `${eleAdvTitle(el)} on ${variant} overruns its tile`
        ).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('fits the fixed titles too', () => {
    for (const title of ['Neutral DPS', 'Burst Gen', 'Team Buffs', 'Sustain']) {
      expect(fits(title, 'discord'), title).toBeGreaterThanOrEqual(0);
      expect(fits(title, 'twitter'), title).toBeGreaterThanOrEqual(0);
    }
  });

  // The muted second rank under the numeral. It used to read '#12 default' on
  // every board; since the DPS chart's variants lead with the DEFAULT row it
  // carries a PROFILE label instead ('#6 SR', '#16 Bursts Second'), so the
  // longest label in the vocabulary decides whether it survives. Same for the
  // chip line above it, which shows a profile label on the comp boards.
  const sub = (
    text: string,
    variant: 'discord' | 'twitter',
    font: (big: boolean) => string
  ): number => {
    const { width, big } = rankTileWidth(variant);
    ctx.font = font(big);
    return width - TILE_SUB_PAD - ctx.measureText(text).width;
  };

  it('fits every profile label on both sub-lines', () => {
    // Two-digit ranks are the realistic worst case (the DPS board is 76 rows;
    // a 3-digit rank would mean a board 10x today's).
    for (const label of Object.values(PROFILE_LABELS)) {
      for (const variant of ['discord', 'twitter'] as const) {
        const alt = tileAltLine({ altRank: 99, altChip: label } as never);
        expect(
          sub(alt, variant, tileAltFont),
          `'${alt}' on ${variant} overruns its tile`
        ).toBeGreaterThanOrEqual(0);
        expect(
          sub(label, variant, tileChipFont),
          `chip '${label}' on ${variant} overruns its tile`
        ).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
