// Pins the two release rows at the top of /characters (web/src/releaseRows.ts).
//
// The "New Favorite Items" window is the reason this file exists. Its whole
// behaviour lives on two days — the last day a Treasure batch shows and the first
// day it doesn't — and a normal test run is never sitting on either, so nothing
// would catch an off-by-one or a timezone slip until a player noticed the row had
// gone stale (or vanished early). `newFavoriteItems` takes `now` precisely so the
// boundary can be driven directly.
//
// The timezone case is not hypothetical: the ORIGINAL date-window version of the
// "New Characters" row shipped a toISOString() cutoff that mixed a LOCAL Date into
// a UTC comparison and hid a unit still inside its window for any viewer west of
// UTC, which is why that row was rewritten as a fixed count. This row needs a real
// window, so it runs BOTH sides in UTC (owner 2026-08-03) — one global cutoff
// instant. These assertions therefore have to hold identically on a machine in any
// timezone, which is what the UTC-instant cases below check.
import { describe, expect, it } from 'vitest';
import charactersJson from '../../../data/characters.json' with { type: 'json' };
import {
  FAVORITE_ITEM_WINDOW_DAYS,
  NEWEST_RELEASED,
  NEW_CHARACTER_COUNT,
  daysSinceRelease,
  newFavoriteItems,
} from '../../../web/src/releaseRows.js';

const characters = (
  charactersJson as unknown as {
    characters: Record<
      string,
      { slug: string; releaseDate?: string | null; treasure?: boolean }
    >;
  }
).characters;

// The most recent Treasure batch in the shipped data. Four units share the date,
// which is the case a fixed-count row would have handled badly.
const BATCH_DATE = '2026-07-23';
const BATCH = ['sugar', 'rosanna', 'phantom', 'flora'];

/** Noon UTC on a YYYY-MM-DD — an absolute instant, identical in every timezone. */
const at = (isoDate: string): Date => new Date(`${isoDate}T12:00:00Z`);

describe('New Favorite Items — the 30-day window', () => {
  it('shows the whole batch on its release day', () => {
    expect(newFavoriteItems(at(BATCH_DATE)).sort()).toEqual([...BATCH].sort());
  });

  it('still shows it on the last day of the window (day 30)', () => {
    // 2026-07-23 + 30 days.
    expect(daysSinceRelease(BATCH_DATE, at('2026-08-22'))).toBe(30);
    expect(newFavoriteItems(at('2026-08-22')).sort()).toEqual(
      [...BATCH].sort()
    );
  });

  it('hides it the next day (day 31), leaving the section empty', () => {
    expect(daysSinceRelease(BATCH_DATE, at('2026-08-23'))).toBe(31);
    expect(newFavoriteItems(at('2026-08-23'))).toEqual([]);
  });

  it('holds nothing at all once every Treasure is older than the window', () => {
    expect(newFavoriteItems(at('2027-06-01'))).toEqual([]);
  });

  it('has NO lower bound — a future-dated Treasure shows', () => {
    // Deliberate (owner 2026-08-03): Treasures have no banner, so a date is
    // always "out now" and never an announcement ahead of release. There is no
    // future-dated case to guard, so the window is one-sided.
    expect(daysSinceRelease(BATCH_DATE, at('2026-07-22'))).toBe(-1);
    expect(newFavoriteItems(at('2026-07-22')).sort()).toEqual(
      [...BATCH].sort()
    );
  });

  it('only ever holds Treasure units', () => {
    // Widened far past the window so every Treasure in the roster is a candidate;
    // no base character may leak in regardless of how recently it released.
    for (const slug of newFavoriteItems(at('2026-07-23'))) {
      expect(characters[slug]?.treasure).toBe(true);
    }
  });

  it('orders newest first', () => {
    const dates = newFavoriteItems(at(BATCH_DATE)).map(
      (slug) => characters[slug]?.releaseDate ?? ''
    );
    expect([...dates]).toEqual([...dates].sort().reverse());
  });
});

describe('daysSinceRelease is a UTC calendar-day difference', () => {
  it('counts whole days regardless of the time of day within a UTC date', () => {
    expect(daysSinceRelease('2026-07-23', new Date('2026-08-01T00:00:00Z'))).toBe(
      9
    );
    expect(daysSinceRelease('2026-07-23', new Date('2026-08-01T23:59:59Z'))).toBe(
      9
    );
  });

  it('flips at 00:00 UTC exactly — one global cutoff instant', () => {
    // The moment the 2026-07-23 batch stops being "new". A machine's own
    // timezone must not move this by so much as a second.
    expect(newFavoriteItems(new Date('2026-08-22T23:59:59Z'))).toHaveLength(4);
    expect(newFavoriteItems(new Date('2026-08-23T00:00:00Z'))).toEqual([]);
  });

  it('is unaffected by a DST boundary, because UTC has none', () => {
    // 30 and 31 calendar days across the dates where northern-hemisphere DST
    // ends (2026-11-01 US, 2026-10-25 EU). Read in local time these spans hold a
    // 25-hour day; read in UTC they are exact multiples of 86,400,000 ms, so the
    // division needs no rounding to come out whole.
    expect(daysSinceRelease('2026-10-18', at('2026-11-17'))).toBe(30);
    expect(daysSinceRelease('2026-10-18', at('2026-11-18'))).toBe(31);
    // Spring-forward mirror (DST starts 2026-03-08 US / 2026-03-29 EU).
    expect(daysSinceRelease('2026-03-01', at('2026-03-31'))).toBe(30);
    expect(Number.isInteger(daysSinceRelease('2026-03-01', at('2026-03-31')))).toBe(
      true
    );
  });
});

describe('New Characters — the row above', () => {
  it(`holds ${NEW_CHARACTER_COUNT} units and no Treasures`, () => {
    expect(NEWEST_RELEASED).toHaveLength(NEW_CHARACTER_COUNT);
    for (const slug of NEWEST_RELEASED) {
      expect(characters[slug]?.treasure).toBeFalsy();
    }
  });

  it('does not overlap New Favorite Items', () => {
    // The two rows partition by `treasure`, so a unit can never be in both. If
    // this ever fails, one row is showing the other's content.
    const favorites = new Set(newFavoriteItems(at(BATCH_DATE)));
    expect(NEWEST_RELEASED.filter((slug) => favorites.has(slug))).toEqual([]);
  });

  it('is genuinely the newest non-Treasure units', () => {
    const expected = Object.values(characters)
      .filter((c) => c.releaseDate && !c.treasure)
      .sort((a, b) => (b.releaseDate ?? '').localeCompare(a.releaseDate ?? ''))
      .slice(0, NEW_CHARACTER_COUNT)
      .map((c) => c.slug);
    expect(NEWEST_RELEASED).toEqual(expected);
  });
});

describe('the window constant', () => {
  it('is 30 days', () => {
    expect(FAVORITE_ITEM_WINDOW_DAYS).toBe(30);
  });
});
