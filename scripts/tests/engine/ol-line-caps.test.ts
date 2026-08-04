// Overload gear limits: a line type appears at most ONCE PER PIECE across 4 pieces (≤ 4 of
// any one type), and 4 pieces × 3 lines caps a loadout at 12 (owner, 2026-08-03).
//
// WHY THIS TEST EXISTS. Nothing enforced either limit. `prepareUnit` validated only that a
// line TYPE existed in data/ol-lines.json and then applied `value * count` unchecked, so
// `--lines "elem*8"` produced a real damage number for a loadout no account can own — and
// the deleted greedy optimizer (src/bestol.ts) tracked its cap against its OWN additions
// only, so on top of a `--lines` loadout it could hand back an impossible recommendation.
// The optimizer is gone and the limits are enforced; this pins them.
//
// prepareUnit is the single choke point every caller passes through (the CLI's --lines, the
// web, the dps-chart investment tiers, the overload ranking), which is why the guard lives
// there rather than in each surface. The assertions below use it directly.
import { describe, expect, it } from 'vitest';
import {
  prepareTeam,
  OL_MAX_PER_TYPE,
  OL_MAX_TOTAL,
  type LineSelection,
} from '../../../src/prepare.js';
import { data, deps } from '../lib/harness.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';

// Any unit with an override works — the caps are loadout-level and kit-independent.
// Exact slug: `alice` (SR/Fire), NOT `alice-wonderland-bunny` (SMG/Water).
const SLUG = 'alice';
const chars = [data.characters[SLUG]];
const overrides = { [SLUG]: loadOverride(SLUG) };

/** Prepare the unit with one OL loadout. Throws exactly as any real caller would. */
const prep = (lines: LineSelection[]) =>
  prepareTeam(chars, [{ doll: false, ol: 'base5', lines }], {
    ...deps,
    overrides,
  });

describe('overload line caps', () => {
  it('accepts the 12/12 loadout the whole project uses', () => {
    // 4 elem + 4 atk floor + 4 free = 12 lines, 4 of any one type. Exactly the limits,
    // not comfortably inside them — so a cap set one too low fails here.
    expect(() =>
      prep([
        { type: 'elem', count: 4 },
        { type: 'atk', count: 4 },
        { type: 'ammo', count: 4 },
      ])
    ).not.toThrow();
  });

  it(`rejects more than ${OL_MAX_PER_TYPE} lines of one type`, () => {
    expect(() => prep([{ type: 'elem', count: OL_MAX_PER_TYPE + 1 }])).toThrow(
      /exceeds the 4-line cap/
    );
  });

  it('aggregates a repeated type across ENTRIES before checking', () => {
    // The failure a naive per-entry check misses: two individually-legal entries of the
    // same type summing past the cap. 3 + 3 = 6 elem lines.
    expect(() =>
      prep([
        { type: 'elem', count: 3 },
        { type: 'elem', count: 3 },
      ])
    ).toThrow(/6× "elem"/);
  });

  it(`rejects more than ${OL_MAX_TOTAL} lines in total, even when every type is legal`, () => {
    // 4 × 4 = 16 lines, no single type over the cap — only the total limit catches this.
    expect(() =>
      prep([
        { type: 'elem', count: 4 },
        { type: 'atk', count: 4 },
        { type: 'ammo', count: 4 },
        { type: 'critdmg', count: 4 },
      ])
    ).toThrow(/16 lines exceeds the 12-line cap/);
  });

  it('rejects a negative or fractional count', () => {
    expect(() => prep([{ type: 'elem', count: -1 }])).toThrow(
      /non-negative integer/
    );
    expect(() => prep([{ type: 'elem', count: 2.5 }])).toThrow(
      /non-negative integer/
    );
  });

  it('leaves the web’s free-form entry alone (count 1, value = the whole %)', () => {
    // The web asks for a total percentage per stat and passes count: 1, so it never
    // expresses a line count and these caps must not constrain what a player types as
    // their real gear. A high value on a single line is legal here by design.
    expect(() =>
      prep([
        { type: 'elem', count: 1, value: 58.32 },
        { type: 'atk', count: 1, value: 29.26 },
      ])
    ).not.toThrow();
  });
});
