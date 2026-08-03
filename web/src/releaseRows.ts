// Which units appear in the two release rows at the top of /characters — "New
// Characters" and "New Favorite Items".
//
// Split out of CharactersPage.tsx so the date-window logic is testable without
// mounting the page or pulling in the roster-grid React graph. This module is
// pure: it reads characters.json and takes `now` as an argument.
//
// The import attribute and the `.js` extensions are NOT the loose style the rest
// of web/src uses: a vitest under scripts/tests/ imports this module, which pulls
// it into the root tsconfig's program, and that one is NodeNext. Drop either and
// `npm run typecheck` fails even though the Vite build is happy.
import charactersJson from '../../data/characters.json' with { type: 'json' };
import type { DataFile } from '../../src/types.js';

const data = charactersJson as unknown as DataFile;

// ---------------------------------------------------------------- New Characters

// The N most recently released characters, newest first.
//
// A FIXED COUNT rather than a date window (owner 2026-08-02). It keeps the row
// the same size in a quiet month as in a busy one, and it removes the whole class
// of bug a "released since <date>" rule invites: nothing here compares against
// today, so there is no timezone to get wrong. (The date-window version did get
// it wrong — toISOString() shifted the cutoff to UTC and hid a unit released
// exactly one month prior for any viewer west of UTC in the evening.)
//
// Computed once at module load: `releaseDate` is static roster data, so there is
// nothing to recompute per render. Ties (two units sharing a release date) keep
// characters.json order, which is stable across builds.
//
// TREASURE ENTRIES ARE EXCLUDED, because a Treasure (favorite item) is a kit
// upgrade to an EXISTING character, not a new one. That is the whole reason; it
// holds no matter what the dates say. They get their own row instead.
//
// This filter is load-bearing, not belt-and-braces: every Treasure unit's
// `releaseDate` is the date its TREASURE released (2026-08-03 ruling), and
// Treasures ship in batches of four-ish sharing one date. Today that batch is
// 2026-07-23 — drop the filter and it takes three of the five slots, burying
// the real new characters behind it.
//
// `releaseDate` is absent on one unit today; it sorts out rather than crashing.
export const NEW_CHARACTER_COUNT = 5;

export const NEWEST_RELEASED: string[] = Object.values(data.characters)
  .filter((c) => c.releaseDate && !c.treasure)
  .sort((a, b) => (b.releaseDate ?? '').localeCompare(a.releaseDate ?? ''))
  .slice(0, NEW_CHARACTER_COUNT)
  .map((c) => c.slug);

export const NEWEST_SLUGS = new Set(NEWEST_RELEASED);

// ------------------------------------------------------------ New Favorite Items

// Treasures released within the last 30 days, newest first.
//
// A DATE WINDOW here, deliberately unlike the fixed count above, because the two
// rows answer different questions. "New Characters" is a standing row that should
// look the same in a quiet month as in a busy one. This one reports an EVENT: a
// Treasure batch drops several units on one date and then nothing for months, so
// a fixed count would either truncate a batch or pad it out with year-old
// Treasures that are no longer news. Showing nothing is the correct resting
// state, and the section hides itself when the window empties.
//
// THE CUTOFF IS UTC (owner 2026-08-03), not the viewer's local calendar. One
// global instant flips the row for everyone at once, which is the right model for
// a roster whose release dates are themselves global game dates — and it makes
// the boundary a fixed, testable moment rather than 38 different ones. The cost
// is accepted: a viewer far enough west sees the row disappear during their
// afternoon of the last day.
//
// That choice also disposes of the trap that forced the row above into a fixed
// count. `releaseDate` is a bare calendar date carrying no zone, so it is read AS
// UTC and compared against `now`'s UTC date — the failure there was a
// toISOString() that mixed a LOCAL Date into a UTC comparison, silently shifting
// the cutoff by a day for viewers west of UTC. Both sides UTC is coherent; the
// mixed version never was. UTC days are also exactly 86,400,000 ms with no DST,
// so the division below is exact and needs no rounding to defend it.
export const FAVORITE_ITEM_WINDOW_DAYS = 30;

/** Whole days from a YYYY-MM-DD calendar date to `now`, both at UTC midnight. */
export function daysSinceRelease(releaseDate: string, now: Date): number {
  const [year, month, day] = releaseDate.split('-').map(Number);
  const released = Date.UTC(year, month - 1, day);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return (today - released) / 86_400_000;
}

/**
 * Treasure slugs released in the last `FAVORITE_ITEM_WINDOW_DAYS` days, newest
 * first. Takes `now` so the boundary can be tested at a fixed instant — the
 * window is the whole behaviour here, and it is only observable on the two days
 * either side of a cutoff no test would otherwise be sitting on.
 *
 * The window has NO lower bound, so a Treasure dated in the future shows up
 * rather than being held back. That is deliberate (owner 2026-08-03): Treasures
 * have no banner, so their date is a plain "this is out now" and never an
 * announcement ahead of release — there is no future-dated case to guard, and a
 * guard would only add a branch nothing can reach.
 */
export function newFavoriteItems(now: Date): string[] {
  return Object.values(data.characters)
    .filter((c) => c.treasure && c.releaseDate)
    .filter(
      (c) =>
        daysSinceRelease(c.releaseDate as string, now) <=
        FAVORITE_ITEM_WINDOW_DAYS
    )
    .sort((a, b) => (b.releaseDate ?? '').localeCompare(a.releaseDate ?? ''))
    .map((c) => c.slug);
}

// Evaluated once at module load, like the row above. The window only moves at
// 00:00 UTC, so recomputing per render would buy nothing a page load doesn't
// already give — and /characters is client-rendered (the no-JS body in
// src/server/static.ts emits "All Characters" only), so there is no long-lived
// server process holding a stale window.
export const NEW_FAVORITE_ITEMS: string[] = newFavoriteItems(new Date());
export const NEW_FAVORITE_SLUGS = new Set(NEW_FAVORITE_ITEMS);
