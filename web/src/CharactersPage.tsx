// The /characters index — the crawlable hub that links every /unit/<slug>
// landing page. Plan: docs/handoffs/2026-08-02-character-landing-pages-plan.md.
//
// Reuses the team builder's roster grid wholesale (useCharacterFilter +
// CharacterFilters + CharacterCards) so the filter vocabulary — element, weapon,
// burst, class, kit-role archetype tags — is identical on both pages and can't
// drift. The only difference is what a card DOES: `linkFor` turns each card into
// a real <a href="/unit/<slug>">, which is what makes this page worth having for
// search (196 internal links from one crawlable page) rather than a grid of
// buttons no crawler can follow.
//
// allowUnsupported is ON: a unit the sim doesn't model yet still has a kit,
// stats and archetype tags, so it still gets a page. The card keeps its "Not In
// Sim" badge, and the unit page says the same thing in its Sim status section.
import { useEffect, useMemo } from 'react';
import charactersJson from '../../data/characters.json';
import type { DataFile } from '../../src/types';
import {
  CharacterCards,
  CharacterFilters,
  useCharacterFilter,
} from './components/CharacterGrid';
import { escapeJsonLd } from './jsonLd';

const SITE = 'https://nikkesim.app';
const NONE = new Set<string>();

const data = charactersJson as unknown as DataFile;

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
// holds no matter what the dates say.
//
// This filter is load-bearing, not belt-and-braces: every Treasure unit's
// `releaseDate` is the date its TREASURE released (2026-08-03 ruling), and
// Treasures ship in batches of four-ish sharing one date. Today that batch is
// 2026-07-23 — drop the filter and it takes three of the five slots, burying
// the real new characters behind it.
//
// `releaseDate` is absent on one unit today; it sorts out rather than crashing.
const NEW_CHARACTER_COUNT = 5;

const NEWEST_RELEASED: string[] = Object.values(data.characters)
  .filter((c) => c.releaseDate && !c.treasure)
  .sort((a, b) => (b.releaseDate ?? '').localeCompare(a.releaseDate ?? ''))
  .slice(0, NEW_CHARACTER_COUNT)
  .map((c) => c.slug);

const NEWEST_SLUGS = new Set(NEWEST_RELEASED);

export function CharactersPage() {
  const filter = useCharacterFilter({
    exclude: NONE,
    allowUnsupported: true,
  });

  // Its own filter instance, restricted to the new slugs — so the section shows
  // the same card markup and thumbnail pipeline as the full grid, and the user's
  // filter selections below never hide a new release.
  const newFilter = useCharacterFilter({
    exclude: NONE,
    allowUnsupported: true,
    restrict: NEWEST_SLUGS,
  });
  // useCharacterFilter sorts its output by name; a "New Characters" row has to
  // read newest-first, so the release order is reapplied here. Only the card
  // ORDER differs — thumbnails and every other field still come from the hook.
  const newestFirst = useMemo(() => {
    const rank = new Map(NEWEST_RELEASED.map((slug, i) => [slug, i]));
    return {
      ...newFilter,
      characters: [...newFilter.characters].sort(
        (a, b) => (rank.get(a.slug) ?? 0) - (rank.get(b.slug) ?? 0)
      ),
    };
  }, [newFilter]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'NIKKE Characters',
    url: `${SITE}/characters`,
    isPartOf: { '@type': 'WebSite', name: 'NIKKE Solo Raid Sim', url: SITE },
  };

  return (
    <div className="app characters-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: escapeJsonLd(jsonLd) }}
      />
      <header>
        <h1>NIKKE Characters</h1>
        <p className="muted">
          Every Nikke, with her kit, her best overload lines, and where she
          lands in the solo-raid DPS rankings. Filter by element, weapon, burst
          stage, class or kit role, then open a Nikke for her full profile.
        </p>
      </header>

      {/* Unreachable while any unit carries a release date; kept so an empty
          roster degrades to no section rather than a bare heading. */}
      {newFilter.characters.length > 0 && (
        <section className="characters-new">
          <h2>New Characters</h2>
          <CharacterCards
            filter={newestFirst}
            linkFor={(slug) => `/unit/${slug}`}
          />
        </section>
      )}

      <section className="characters-all">
        <h2>All Characters</h2>
        {/* Closed by default here: on this page the roster IS the content, and an
            expanded filter panel pushes all 196 cards below the fold. */}
        <CharacterFilters filter={filter} defaultOpen={false} />
        <CharacterCards filter={filter} linkFor={(slug) => `/unit/${slug}`} />
      </section>
    </div>
  );
}
