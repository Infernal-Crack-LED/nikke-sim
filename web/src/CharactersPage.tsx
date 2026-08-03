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
import {
  CharacterCards,
  CharacterFilters,
  useCharacterFilter,
} from './components/CharacterGrid';
import { escapeJsonLd } from './jsonLd';
// Which units each release row holds, and why — see web/src/releaseRows.ts.
import {
  NEWEST_RELEASED,
  NEWEST_SLUGS,
  NEW_FAVORITE_ITEMS,
  NEW_FAVORITE_SLUGS,
} from './releaseRows';

const SITE = 'https://nikkesim.app';
const NONE = new Set<string>();


/**
 * One release row: its own filter instance restricted to `slugs`, reordered to
 * match `order`.
 *
 * A private instance per row is the point — the section then shows the same card
 * markup and thumbnail pipeline as the full grid, and the user's filter
 * selections in "All Characters" below never hide a new release. And
 * useCharacterFilter sorts its output by NAME, so the release order has to be
 * reapplied on top; only the card ORDER differs, every other field still comes
 * from the hook.
 *
 * `slugs`/`order` must be module constants (stable identities), which is what
 * lets the memo key on them.
 */
function useReleaseRow(slugs: Set<string>, order: string[]) {
  const filter = useCharacterFilter({
    exclude: NONE,
    allowUnsupported: true,
    restrict: slugs,
  });
  return useMemo(() => {
    const rank = new Map(order.map((slug, i) => [slug, i]));
    return {
      ...filter,
      characters: [...filter.characters].sort(
        (a, b) => (rank.get(a.slug) ?? 0) - (rank.get(b.slug) ?? 0)
      ),
    };
  }, [filter, order]);
}

export function CharactersPage() {
  const filter = useCharacterFilter({
    exclude: NONE,
    allowUnsupported: true,
  });

  const newestFirst = useReleaseRow(NEWEST_SLUGS, NEWEST_RELEASED);
  const newFavorites = useReleaseRow(NEW_FAVORITE_SLUGS, NEW_FAVORITE_ITEMS);

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
      {newestFirst.characters.length > 0 && (
        <section className="characters-new">
          <h2>New Characters</h2>
          <CharacterCards
            filter={newestFirst}
            linkFor={(slug) => `/unit/${slug}`}
          />
        </section>
      )}

      {/* Empty MOST of the time, by design — Treasures land in occasional
          batches, so between them this section is simply absent. */}
      {newFavorites.characters.length > 0 && (
        <section className="characters-new">
          <h2>New Favorite Items</h2>
          <CharacterCards
            filter={newFavorites}
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
