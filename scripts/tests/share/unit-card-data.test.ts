// Phase-3 gate for the unit-card infographic: buildUnitCardData joins a
// character with five boards, tags, overload and the Tsareena sheet into a
// FIXED-SHAPE model. The contract under test is mostly about ABSENCE — coverage
// is the dominant design problem (the DPS chart ranks ~43 of ~195 units, the CDR
// board 15, and 55% of the roster has no Tsareena entry), so "a unit on no board
// still produces three tiles" is the property that keeps the card set visually
// consistent enough to post as a series.
//
// Most cases run against the REAL artifacts rather than hand-built fixtures:
// their labels were produced independently of this builder, which makes them a
// genuine check rather than a restatement of the code. The synthetic fixtures
// are reserved for shapes the live data doesn't currently contain (a negative
// buffer value, a zero-board unit).
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import {
  buildUnitCardData,
  isDpsSet,
  NEUTRAL_CELL,
  ELEWEAK_CELL,
  NEIGHBOUR_ROWS,
  NEIGHBOUR_ROWS_PORTRAIT,
  NEIGHBOUR_ROWS_SOLO_CHART,
  neighbourRowsFor,
  type UnitCardSources,
  type UnitCardCharacter,
} from '../../../src/infographics/core/unitCardData.js';
import { OFF_BOARD_BUFFER_SLUGS } from '../../../src/ranks/buffer-rows.js';

const load = <T>(rel: string): T | null => {
  const url = new URL(`../../../${rel}`, import.meta.url);
  return existsSync(url) ? (JSON.parse(readFileSync(url, 'utf8')) as T) : null;
};

// web/public/*.json are GITIGNORED build outputs (npm run dpschart && ranks:all).
// A clean checkout that hasn't built them must not fail this file — the
// artifact-backed cases skip, the synthetic ones still run.
const dpschart = load<any>('web/public/dpschart.json');
const burstgen = load<any>('web/public/burstgen.json');
const bufferchart = load<any>('web/public/bufferchart.json');
const sustain = load<any>('web/public/sustain.json');
const burstcdr = load<any>('web/public/burstcdr.json');
const characters = load<any>('data/characters.json')!;
const haveBoards = !!(
  dpschart &&
  burstgen &&
  bufferchart &&
  sustain &&
  burstcdr
);

// DPS-chart variant units (src/dpschart/matrix.ts CHART_VARIANTS, landed
// 2026-07-29): they occupy TWO rows on every DPS cell, and their own card
// headlines the DEFAULT one (see findHits/leadRow in unitCardData.ts), which is
// not necessarily the row at a given array position — so a plain "rank == array
// index + 1" check only holds for a non-variant slug. Tests below that sample
// "the #1 unit" or "unit at array index i" skip past a variant landing on that
// boundary instead of asserting a rank that dpsTile deliberately doesn't report
// for it.
const DPS_VARIANT_SLUGS = [
  'cinderella-crystal-wave',
  'bready',
  'diesel-winter-sweets',
];

const boards = () => ({ dpschart, burstgen, bufferchart, sustain, burstcdr });

const charOf = (slug: string): UnitCardCharacter => {
  const c = characters.characters[slug];
  if (!c) {
    throw new Error(`test fixture: no character ${slug} in characters.json`);
  }
  return c as UnitCardCharacter;
};

const build = (slug: string, extra: Partial<UnitCardSources> = {}) =>
  buildUnitCardData({ character: charOf(slug), ...boards(), ...extra });

describe('buildUnitCardData — fixed geometry', () => {
  it.runIf(haveBoards)('always emits exactly three tiles', () => {
    // Span the roster, not a favourable sample: every synced character.
    for (const slug of Object.keys(characters.characters)) {
      const model = build(slug);
      expect(model.tiles, slug).toHaveLength(3);
      for (const tile of model.tiles) {
        expect(tile.title, slug).toBeTruthy();
      }
    }
  });

  it('emits three tiles for a unit on NO board at all', () => {
    // The absence case is the common one, not the edge case.
    const model = buildUnitCardData({
      character: {
        slug: 'nobody',
        name: 'Nobody',
        element: 'Fire',
        weapon: 'AR',
        burst: 'III',
        class: 'Attacker',
        manufacturer: null,
        burstCooldownSec: 40,
      },
    });
    expect(model.tiles).toHaveLength(3);
    for (const tile of model.tiles) {
      expect(tile.rank).toBeNull();
      expect(tile.value).toBeNull();
    }
    // charts still exist as drawable, explicitly-unranked boxes — never omitted,
    // or the card would reflow and break the fixed-size guarantee.
    expect(model.charts.length).toBeGreaterThan(0);
    expect(model.charts.every((c) => c.unranked)).toBe(true);
    expect(model.tsareena).toBeNull();
    expect(model.olOptimal).toBeNull();
  });
});

describe('buildUnitCardData — tile/bar set selection (§7, ruling 13)', () => {
  it('treats Λ as the B3 set (ruling 10)', () => {
    expect(isDpsSet('III')).toBe(true);
    expect(isDpsSet('Λ')).toBe(true);
    expect(isDpsSet('I')).toBe(false);
    expect(isDpsSet('II')).toBe(false);
  });

  it.runIf(haveBoards)(
    'red-hood (the only Λ unit) gets the DPS tiles, not the buffer set',
    () => {
      // ⚠ red-hood = Red Hood (SR/Iron Attacker). NOT rapi-red-hood (Rapi: Red
      // Hood, MG/Fire), a different unit already typed 'III'.
      const rh = characters.characters['red-hood'];
      expect(rh.burst, 'red-hood should still be the Λ unit').toBe('Λ');
      const model = build('red-hood');
      expect(model.burstIsLambda).toBe(true);
      // the ele-adv tile NAMES its pool — it ranks within red-hood's own element
      expect(model.tiles.map((t) => t.title)).toEqual([
        'Neutral DPS',
        'Ele. Adv. · Iron',
        'Burst Gen',
      ]);
    }
  );

  it.runIf(haveBoards)(
    'B3 charts are the two DPS boards, never burst gen',
    () => {
      const model = build('red-hood');
      expect(model.charts.map((c) => c.title)).toEqual([
        'Neutral DPS',
        'Ele. Adv. · Iron',
      ]);
    }
  );

  it.runIf(haveBoards)('a B1/B2 unit gets buffer first', () => {
    const model = build('liter'); // B1 Supporter
    expect(model.tiles[0].title).toBe('Team Buffs');
    expect(model.tiles[2].title).toBe('Burst Gen');
    expect(model.charts[0].title).toContain('Team Buffs');
    // burst gen is a TILE ONLY — it must never appear as a chart.
    expect(model.charts.some((c) => c.title.includes('Burst Gen'))).toBe(false);
  });

  it('falls back sustain → burst CDR → omit for the second B1/B2 chart', () => {
    const base: UnitCardCharacter = {
      slug: 'x',
      name: 'X',
      element: 'Fire',
      weapon: 'AR',
      burst: 'I',
      class: 'Supporter',
      manufacturer: null,
      burstCooldownSec: 20,
    };
    const buffer = {
      units: {
        x: {
          name: 'X',
          element: 'Fire',
          weapon: 'AR',
          burst: 'I',
          imageUrl: null,
        },
      },
      profiles: {},
      cells: { generic: [['x', 5, null, null]], typed: [] },
    } as any;

    // sustain present → sustain is the second chart
    const withSustain = buildUnitCardData({
      character: base,
      bufferchart: buffer,
      sustain: {
        units: {},
        profiles: {},
        entries: [['x', 1000, 50, 30, 20, 0, null]],
      } as any,
      burstcdr: {
        units: {},
        profiles: {},
        entries: [['x', 3, null, null, null, null]],
      } as any,
    });
    expect(withSustain.charts.map((c) => c.title)).toEqual([
      'Team Buffs — team DMG',
      'Sustain',
    ]);

    // no sustain, CDR present → CDR is the second chart
    const withCdr = buildUnitCardData({
      character: base,
      bufferchart: buffer,
      burstcdr: {
        units: {},
        profiles: {},
        entries: [['x', 3, null, null, null, null]],
      } as any,
    });
    expect(withCdr.charts.map((c) => c.title)).toEqual([
      'Team Buffs — team DMG',
      'Burst CDR',
    ]);

    // neither → NO second chart set at all, and the survivor gets more
    // neighbours instead of the card growing whitespace (§6c lever 1).
    const soloBuffer = {
      units: {},
      profiles: {},
      cells: {
        generic: Array.from({ length: 40 }, (_, i) => [
          `u${i}`,
          40 - i,
          null,
          null,
        ]).concat([['x', 5, null, null] as any]),
        typed: [],
      },
    } as any;
    const alone = buildUnitCardData({
      character: base,
      bufferchart: soloBuffer,
    });
    expect(alone.charts).toHaveLength(1);
    expect(alone.charts[0].rows.length).toBe(NEIGHBOUR_ROWS_SOLO_CHART * 2 + 1);
    expect(NEIGHBOUR_ROWS_SOLO_CHART).toBeGreaterThan(NEIGHBOUR_ROWS);

    // The solo-chart bonus is a DELTA over the variant's row count, so the
    // "spend freed height on neighbours" lever survives the portrait variant
    // already drawing more of them.
    const aloneP = buildUnitCardData({
      character: base,
      bufferchart: soloBuffer,
      neighbourRows: NEIGHBOUR_ROWS_PORTRAIT,
    });
    expect(aloneP.charts[0].rows.length).toBe(
      (NEIGHBOUR_ROWS_SOLO_CHART + NEIGHBOUR_ROWS_PORTRAIT - NEIGHBOUR_ROWS) *
        2 +
        1
    );
  });

  it('resolves the row count per variant, identically on both hosts', () => {
    // The Node pre-render and the browser preview both call this; if they ever
    // resolved it differently the same unit would render two different cards.
    expect(neighbourRowsFor('discord')).toBe(NEIGHBOUR_ROWS);
    expect(neighbourRowsFor('twitter')).toBe(NEIGHBOUR_ROWS_PORTRAIT);
  });
});

describe('buildUnitCardData — values mirror the site (ruling 1)', () => {
  it.runIf(haveBoards)(
    'DPS tiles carry the rel-score, and #1 reads 1.000',
    () => {
      const top = dpschart.cells[NEUTRAL_CELL][0][0];
      if (DPS_VARIANT_SLUGS.includes(top)) {
        return; // its own card headlines its default row instead — see above
      }
      const model = build(top);
      expect(model.tiles[0].rank).toBe(1);
      expect(model.tiles[0].value).toBe('1.000');
      expect(model.tiles[0].population).toBe(
        dpschart.cells[NEUTRAL_CELL].length
      );
    }
  );

  it.runIf(haveBoards)('neutral ranks match the artifact index', () => {
    const rows = dpschart.cells[NEUTRAL_CELL];
    // sample across the board, not just the top
    for (const i of [0, 1, Math.floor(rows.length / 2), rows.length - 1]) {
      const slug = rows[i][0];
      if (!characters.characters[slug] || DPS_VARIANT_SLUGS.includes(slug)) {
        continue;
      }
      const model = build(slug);
      expect(model.tiles[0].rank, `${slug} ${NEUTRAL_CELL}`).toBe(i + 1);
    }
  });

  // The ele-adv tile ranks within the unit's OWN element, so its rank is NOT the
  // raw array index. Checked as PROPERTIES of the result rather than by re-running
  // the builder's own filter-then-index: a rank is "how many same-element rows beat
  // her, plus one", a pool is "how many same-element rows exist", and every row the
  // chart draws is same-element. A filter or an index that drifted would break at
  // least one of the three; restating filter+indexOf would have validated the code
  // against itself.
  it.runIf(haveBoards)(
    'ele-adv ranks are within the unit’s own element',
    () => {
      const rows: [string, number, string | null][] =
        dpschart.cells[ELEWEAK_CELL];
      const elementsOf = (slug: string): string[] => {
        const u = dpschart.units[slug];
        return u ? (u.elements ?? [u.element]) : [];
      };
      let checked = 0;
      for (const i of [
        0,
        1,
        Math.floor(rows.length / 3),
        Math.floor(rows.length / 2),
        rows.length - 1,
      ]) {
        const slug = rows[i][0];
        const c = characters.characters[slug];
        if (!c) {
          continue;
        }
        const mine = rows.filter((r) => elementsOf(r[0]).includes(c.element));
        const own = mine.find((r) => r[0] === slug && !r[2])!;
        const better = mine.filter((r) => r[1] > own[1]).length;

        const tile = build(slug).tiles[1];
        expect(tile.rank, `${slug} ele-adv rank`).toBe(better + 1);
        expect(tile.population, `${slug} ele-adv pool`).toBe(mine.length);
        // the pool really is narrower than the whole board, else every case here
        // would pass just as well against an unfiltered population
        expect(mine.length, `${slug} ele-adv pool`).toBeLessThan(rows.length);
        checked++;
      }
      expect(
        checked,
        'no sampled ele-adv rows resolved to a character'
      ).toBeGreaterThan(0);
    }
  );

  it.runIf(haveBoards)(
    'every row the ele-adv chart draws shares the unit’s element',
    () => {
      for (const slug of Object.keys(characters.characters)) {
        const c = characters.characters[slug];
        if (!isDpsSet(c.burst)) {
          continue;
        }
        const chart = build(slug, {
          neighbourRows: NEIGHBOUR_ROWS_PORTRAIT,
        }).charts[1];
        for (const row of chart.rows) {
          const u = dpschart.units[row.slug];
          expect(
            u ? (u.elements ?? [u.element]) : [],
            `${slug} ele-adv chart drew ${row.slug}`
          ).toContain(c.element);
        }
      }
    }
  );

  it('formats a NEGATIVE buffer with a minus sign and a zero axis', () => {
    // addedPct is negative-capable (soline-frost-ticket is the precedent) and a
    // bar must span value↔0, so the axis has to include 0 on both sides.
    const model = buildUnitCardData({
      character: {
        slug: 'neg',
        name: 'Neg',
        element: 'Water',
        weapon: 'SMG',
        burst: 'II',
        class: 'Supporter',
        manufacturer: null,
        burstCooldownSec: 40,
      },
      bufferchart: {
        units: {},
        profiles: {},
        cells: {
          generic: [
            ['a', 10, null, null],
            ['neg', -4.25, null, null],
          ],
          typed: [],
        },
      } as any,
    });
    expect(model.tiles[0].value).toBe('−4.3%');
    const chart = model.charts[0];
    expect(chart.min).toBeLessThan(0);
    expect(chart.max).toBeGreaterThan(0);
  });

  it.runIf(haveBoards)(
    'sustain rows carry the 3-segment split as fractions',
    () => {
      const slug = sustain.entries.find((e: any[]) => e[2] > 0)![0];
      const c = characters.characters[slug];
      if (!c || isDpsSet(c.burst)) {
        return; // sustain chart only renders on the B1/B2 path
      }
      const model = build(slug);
      const chart = model.charts.find((x) => x.title === 'Sustain');
      if (!chart) {
        return;
      }
      const row = chart.rows.find((r) => r.isUnit)!;
      expect(row.segments).toBeDefined();
      const s = row.segments!;
      expect(s.heal + s.shield + s.lifesteal).toBeCloseTo(1, 5);
    }
  );
});

describe('buildUnitCardData — comp profiles (§8a, ruling 14)', () => {
  it.runIf(haveBoards)(
    'the profiled rank is the headline and the default rank is kept',
    () => {
      // crown is profiled on bufferchart (with-healer); the artifact holds a
      // profiled row AND a default row, and the profiled one ranks higher.
      const model = build('crown');
      const tile = model.tiles[0];
      expect(tile.title).toBe('Team Buffs');
      expect(tile.profileChip).toBe('w/ Healer');
      expect(tile.rank).not.toBeNull();
      expect(tile.altRank).not.toBeNull();
      expect(tile.altChip).toBe('default');
      expect(tile.rank!).toBeLessThan(tile.altRank!);
    }
  );

  it.runIf(haveBoards)(
    'the default row is appended below the neighbours, out of rank order',
    () => {
      const model = build('crown');
      const chart = model.charts[0];
      const appendix = chart.rows.filter((r) => r.isAppendix);
      expect(appendix).toHaveLength(1);
      // it is LAST by construction, even though its rank is worse than the row
      // above it — that is intended, not a sorting bug.
      expect(chart.rows[chart.rows.length - 1].isAppendix).toBe(true);
      expect(appendix[0].slug).toBe('crown');
      // It is labelled 'default' by its chip, which the renderer draws as a pill
      // AFTER the name (it used to be a 'default · ' prefix on the name text).
      expect(appendix[0].profileChip).toBe('default');
    }
  );

  it.runIf(haveBoards)(
    'a neighbourhood wide enough to contain the default row labels it in place',
    () => {
      // The portrait variant draws two neighbours each side, which can pull a
      // profiled unit's own no-profile row into the window in rank order. It is
      // then NOT an appendix — not appended, not dimmed — but it must still carry
      // the 'default' chip or the card shows the same unit twice with no
      // explanation.
      //
      // The fixture is DISCOVERED, not hardcoded. This property depends on how far
      // apart a unit's profiled and default rows sit on a live board, which moves
      // whenever the boards are rebuilt: `crown` was the fixture until 2026-08-02,
      // when the no-op low-ATK standardization (DECISIONS) lifted chime + avistar
      // above it on the buffer board and pushed its two rows from 3 apart to 5 —
      // outside the window. That is a legitimate ranking change, so the test finds
      // a unit the window DOES contain rather than pinning one that may drift out.
      const candidates = Object.keys(characters.characters)
        .map((slug) => ({
          slug,
          chart: build(slug, { neighbourRows: NEIGHBOUR_ROWS_PORTRAIT })
            .charts[0],
        }))
        .filter(({ slug, chart }) => {
          const own = chart?.rows.filter((r) => r.slug === slug) ?? [];
          return own.length === 2 && !chart!.rows.some((r) => r.isAppendix);
        });

      // If no unit on today's boards has both rows inside the window, the property
      // is untestable rather than violated — say so loudly instead of passing mute.
      expect(
        candidates.length,
        'no unit has both its profiled and default rows inside the portrait window — ' +
          'the in-place labelling path is unexercised on these artifacts'
      ).toBeGreaterThan(0);

      for (const { slug, chart } of candidates) {
        const own = chart.rows.filter((r) => r.slug === slug);
        const chips = own.map((r) => r.profileChip);
        // exactly one of the two is the default row, and the other names a profile
        expect(
          chips.filter((c) => c === 'default'),
          slug
        ).toHaveLength(1);
        expect(
          chips.filter((c) => c && c !== 'default'),
          slug
        ).toHaveLength(1);
      }
    }
  );

  // Variant profiles landed on the DPS chart 2026-07-29 (src/dpschart/matrix.ts
  // CHART_VARIANTS) — cinderella-crystal-wave (Snipe/SR), bready (Distributed),
  // diesel-winter-sweets (Bursts Second). Every OTHER B3 still carries none.
  //
  // A DPS variant is an ALTERNATE BUILD of the unit, not a comp it is played in,
  // so the DEFAULT row is the headline here (owner, 2026-08-18) — the inverse of
  // the comp-profiled boards above. The variant survives as the muted secondary.
  it.runIf(haveBoards)(
    'a DPS-chart variant unit headlines its DEFAULT row, with the variant as the secondary',
    () => {
      for (const slug of DPS_VARIANT_SLUGS) {
        const model = build(slug);
        for (const idx of [0, 1]) {
          const tile = model.tiles[idx];
          const cell: [string, number, string | null][] =
            dpschart.cells[idx === 0 ? NEUTRAL_CELL : ELEWEAK_CELL];
          const plain = cell.find((r) => r[0] === slug && !r[2])!;
          const variant = cell.find((r) => r[0] === slug && r[2])!;
          expect(plain, `${slug} has a default row`).toBeTruthy();
          expect(variant, `${slug} has a variant row`).toBeTruthy();

          // WHICH row leads, stated without rebuilding the builder's pool: the
          // headline outranks the secondary exactly when the DEFAULT build
          // out-damages the variant. (It doesn't always — bready's variant row
          // sits above her default one, and her card still leads with default.)
          expect(tile.rank! < tile.altRank!, `${slug} tile ${idx} order`).toBe(
            plain[1] > variant[1]
          );
          // the headline IS the default row, and says so
          expect(tile.profileChip, `${slug} tile ${idx}`).toBe('default');
          expect(tile.altChip, `${slug} tile ${idx}`).toBeTruthy();
          expect(tile.altChip, `${slug} tile ${idx}`).not.toBe('default');
        }
        // Rank arithmetic for the whole-board tile, as a count of who beats her
        // (the ele-adv tile's is covered by the element-pool property above).
        const neutral: [string, number, string | null][] =
          dpschart.cells[NEUTRAL_CELL];
        const own = neutral.find((r) => r[0] === slug && !r[2])!;
        expect(model.tiles[0].rank, `${slug} neutral rank`).toBe(
          neutral.filter((r) => r[1] > own[1]).length + 1
        );
      }
    }
  );

  it.runIf(haveBoards)(
    "cinderella-crystal-wave's card reads her MG default, not her SR variant",
    () => {
      // The owner-reported bug (2026-08-18): her card headlined the Snipe/SR
      // rank while MG is her default mode, so the numeral disagreed with both
      // the weapon icon on the same card and the site's own default row.
      const model = build('cinderella-crystal-wave');
      expect(model.weapon).toBe('MG');
      for (const idx of [0, 1]) {
        expect(model.tiles[idx].profileChip).toBe('default');
        expect(model.tiles[idx].altChip).toBe('SR');
        expect(model.tiles[idx].rank!).toBeLessThan(model.tiles[idx].altRank!);
      }
    }
  );

  it.runIf(haveBoards)(
    'every non-variant B3 still carries no profile on the DPS chart',
    () => {
      for (const slug of Object.keys(characters.characters)) {
        const c = characters.characters[slug];
        if (!isDpsSet(c.burst) || DPS_VARIANT_SLUGS.includes(slug)) {
          continue;
        }
        const model = build(slug);
        expect(model.tiles[0].profileChip, slug).toBeNull();
        expect(model.tiles[1].profileChip, slug).toBeNull();
        for (const chart of model.charts) {
          expect(
            chart.rows.every((r) => !r.isAppendix),
            slug
          ).toBe(true);
        }
      }
    }
  );
});

// Off-board buffers (src/ranks/buffer-rows.ts OFF_BOARD_BUFFER_SLUGS) are cut
// from the board's POPULATION, so the shipped artifact has no row for them at
// all. The card filters anyway, because the published-board fetch path can
// serve an artifact built before that landed — and one stale row sitting ahead
// of a unit silently shifts every rank below it. That is not hypothetical: the
// card read Crown as #2 behind an off-board Chime until 2026-08-13, while the
// web board (which has always filtered) read the same unit as #1.
describe('buildUnitCardData — off-board buffers never occupy a rank', () => {
  const staleArtifact = {
    units: {
      chime: { name: 'Chime', element: 'Fire' },
      crown: { name: 'Crown', element: 'Iron' },
      'unit-b': { name: 'Unit B', element: 'Wind' },
    },
    profiles: {},
    cells: {
      generic: [
        ['chime', 142.7, null, null],
        ['crown', 105.1, null, null],
        ['unit-b', 12.3, null, null],
      ],
      typed: [],
    },
  };
  const b2 = (slug: string, name: string): UnitCardCharacter => ({
    slug,
    name,
    element: 'Iron',
    weapon: 'AR',
    burst: 'II',
    class: 'Supporter',
    manufacturer: null,
    burstCooldownSec: 40,
  });

  it('a stale off-board row does not offset the ranks below it', () => {
    const model = buildUnitCardData({
      character: b2('crown', 'Crown'),
      bufferchart: staleArtifact as any,
    });
    const tile = model.tiles[0];
    expect(tile.title).toBe('Team Buffs');
    expect(tile.rank).toBe(1); // #1, not #2 behind Chime
    expect(tile.population).toBe(2); // and Chime is not counted in the field
    // ...and the neighbourhood never draws the off-board unit as a neighbour.
    expect(model.charts[0].rows.map((r) => r.slug)).toEqual([
      'crown',
      'unit-b',
    ]);
  });

  it('an off-board unit reads unranked on its own card rather than #1', () => {
    const model = buildUnitCardData({
      character: b2('chime', 'Chime'),
      bufferchart: staleArtifact as any,
    });
    expect(model.tiles[0].title).toBe('Team Buffs');
    expect(model.tiles[0].rank).toBeNull();
    expect(model.charts[0].unranked).toBe(true);
  });

  it.runIf(haveBoards)('no card anywhere draws an off-board row', () => {
    for (const slug of Object.keys(characters.characters)) {
      for (const chart of build(slug).charts) {
        for (const row of chart.rows) {
          expect(
            OFF_BOARD_BUFFER_SLUGS.has(row.slug),
            `${slug} → ${row.slug}`
          ).toBe(false);
        }
      }
    }
  });
});

describe('buildUnitCardData — neighbourhood windows', () => {
  // If the true boundary slot's slug is a DPS-chart variant unit, ITS OWN card
  // headlines the PROFILED row (see findHits/headline in unitCardData.ts),
  // which generally sits at a DIFFERENT rank than its plain row's raw array
  // position — so building ITS card would not center the window on this exact
  // array edge, and the assertion below isn't testing what it claims to. Skip
  // rather than assert a rank dpsTile deliberately doesn't report for it (the
  // profiled-vs-plain-rank behavior is exercised separately above).

  it.runIf(haveBoards)('a #1 unit still gets a full-height chart', () => {
    // The most postable card must not be the one that looks broken: clamping at
    // the board edge re-expands rather than truncating.
    const top = dpschart.cells[NEUTRAL_CELL][0][0];
    if (DPS_VARIANT_SLUGS.includes(top)) {
      return;
    }
    const model = build(top);
    const chart = model.charts[0];
    expect(chart.rows).toHaveLength(NEIGHBOUR_ROWS * 2 + 1);
    expect(chart.rows[0].isUnit).toBe(true); // it IS the top row
  });

  it.runIf(haveBoards)(
    'a last-place unit also gets a full-height chart',
    () => {
      const rows = dpschart.cells[NEUTRAL_CELL];
      const last = rows[rows.length - 1][0];
      if (!characters.characters[last] || DPS_VARIANT_SLUGS.includes(last)) {
        return;
      }
      const chart = build(last).charts[0];
      expect(chart.rows).toHaveLength(NEIGHBOUR_ROWS * 2 + 1);
      expect(chart.rows[chart.rows.length - 1].isUnit).toBe(true);
    }
  );
});

describe('buildUnitCardData — nullable externals (§11)', () => {
  it.runIf(haveBoards)(
    'carries releaseDate through, and tolerates its absence',
    () => {
      // Phase 1 synced it; 2 units legitimately have none.
      const withDate = Object.values(characters.characters).find(
        (c: any) => c.releaseDate
      ) as any;
      expect(build(withDate.slug).releaseDate).toBe(withDate.releaseDate);
      const without = Object.values(characters.characters).find(
        (c: any) => !c.releaseDate
      ) as any;
      if (without) {
        expect(build(without.slug).releaseDate).toBeNull();
      }
    }
  );

  it('strips the " Overspec" suffix but keeps the distinction', () => {
    const model = buildUnitCardData({
      character: {
        slug: 'o',
        name: 'O',
        element: 'Fire',
        weapon: 'MG',
        burst: 'III',
        class: 'Attacker',
        manufacturer: 'Elysion Overspec',
        burstCooldownSec: 40,
      },
    });
    expect(model.manufacturerBase).toBe('Elysion'); // resolves the icon
    expect(model.overspec).toBe(true); // …without silently dropping the fact
    expect(model.manufacturer).toBe('Elysion Overspec');
  });

  it('caps tags and reports the overflow', () => {
    const model = buildUnitCardData({
      character: {
        slug: 't',
        name: 'T',
        element: 'Fire',
        weapon: 'AR',
        burst: 'III',
        class: 'Attacker',
        manufacturer: null,
        burstCooldownSec: 40,
      },
      tags: Array.from({ length: 12 }, (_, i) => `tag-${i}`),
      tagLabels: { 'tag-0': { label: 'ATK ▲' } },
    });
    expect(model.tags.length).toBeLessThanOrEqual(6);
    // The vocabulary label wins over the raw id — but the ▲ is normalized to
    // ASCII first: Roboto has no U+25B2, so the bundled-font Node renderer draws
    // it as a TOFU BOX while a browser falls back to a system face. Two hosts,
    // two pictures, which is the exact failure these renderers exist to prevent
    // (canvas2d.ts documents the same trap for the advantage marker).
    expect(model.tags[0]).toBe('ATK+');
    expect(model.tags[1]).toBe('tag-1'); // raw id when unmapped
    expect(model.tagsOverflow).toBe(12 - model.tags.length);
  });

  it('leaves no un-renderable glyph in any real tag label', () => {
    // Guards the whole vocabulary, not just the one label above: any non-ASCII
    // character that reaches a tag pill is a tofu box on the Node host.
    for (const slug of Object.keys(characters.characters)) {
      for (const tag of build(slug).tags) {
        expect(/^[\x20-\x7E]*$/.test(tag), `${slug}: ${tag}`).toBe(true);
      }
    }
  });

  it('renders burst-CDR qualifiers as footnotes (a card has no hover)', () => {
    const model = buildUnitCardData({
      character: {
        slug: 'q',
        name: 'Q',
        element: 'Fire',
        weapon: 'AR',
        burst: 'II',
        class: 'Supporter',
        manufacturer: null,
        burstCooldownSec: 40,
      },
      burstcdr: {
        units: {},
        profiles: {},
        entries: [['q', 2.5, [1, 2, 3], 'only while shielded', 4, null]],
      } as any,
    });
    expect(model.tiles[1].title).toBe('Burst CDR');
    expect(model.tiles[1].sub).toContain('*');
    expect(model.footnotes.join(' ')).toContain('only while shielded');
    expect(model.footnotes.join(' ')).toContain('self-only');
  });

  it('formats the sim-optimal overload line', () => {
    const model = buildUnitCardData({
      character: {
        slug: 'z',
        name: 'Z',
        element: 'Fire',
        weapon: 'AR',
        burst: 'III',
        class: 'Attacker',
        manufacturer: null,
        burstCooldownSec: 40,
      },
      olOptimal: [
        { type: 'ammo', count: 1 },
        { type: 'chargedmg', count: 3 },
      ],
    });
    // data/ol-optimal.json holds only the 4-roll REMAINDER; the line states the
    // whole 12/12, floor first, or it reads as a 4-roll recommendation.
    expect(model.olOptimal).toBe(
      '4× Elemental DMG · 4× ATK · 1× Max Ammo · 3× Charge DMG'
    );
  });
});
