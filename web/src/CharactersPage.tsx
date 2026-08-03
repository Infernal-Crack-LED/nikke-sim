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

// Slugs released within the last calendar month, newest first.
//
// Evaluated at RENDER time, not build time, so the section keeps itself current
// between deploys — a unit ages out of "new" on its own without a rebuild. One
// calendar month back (setMonth(-1)) rather than a flat 30 days, so the window
// means the same thing in every month.
//
// The cutoff is formatted from LOCAL date parts, never toISOString(). `releaseDate`
// is a plain calendar date, so it has to be compared against the viewer's calendar
// date — toISOString() converts to UTC first, which silently shifts the cutoff a
// day for anyone west of UTC in the evening and drops a unit released exactly one
// month ago. (Observed: at 23:43 PDT the UTC cutoff read 2026-07-03 and hid
// cinderella-crystal-wave, released 2026-07-02.)
//
// `releaseDate` is absent on one unit today; it is simply never new.
function localIsoDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function recentlyReleased(now: Date): { slug: string; releaseDate: string }[] {
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - 1);
  const iso = localIsoDate(cutoff);
  return Object.values(data.characters)
    .filter((c) => c.releaseDate && c.releaseDate >= iso)
    .map((c) => ({ slug: c.slug, releaseDate: c.releaseDate as string }))
    .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));
}

export function CharactersPage() {
  const filter = useCharacterFilter({
    exclude: NONE,
    allowUnsupported: true,
  });

  // Its own filter instance, restricted to the new slugs — so the section shows
  // the same card markup and thumbnail pipeline as the full grid, and the user's
  // filter selections below never hide a new release.
  const recent = useMemo(() => recentlyReleased(new Date()), []);
  const newSlugs = useMemo(() => new Set(recent.map((r) => r.slug)), [recent]);
  const newFilter = useCharacterFilter({
    exclude: NONE,
    allowUnsupported: true,
    restrict: newSlugs,
  });
  // useCharacterFilter sorts its output by name; a "New Characters" row has to
  // read newest-first, so the release order is reapplied here. Only the card
  // ORDER differs — thumbnails and every other field still come from the hook.
  const newestFirst = useMemo(() => {
    const rank = new Map(recent.map((r, i) => [r.slug, i]));
    return {
      ...newFilter,
      characters: [...newFilter.characters].sort(
        (a, b) => (rank.get(a.slug) ?? 0) - (rank.get(b.slug) ?? 0)
      ),
    };
  }, [newFilter, recent]);

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

      {/* Hidden entirely in a quiet release month — an empty "New Characters"
          heading reads as broken rather than as "nothing shipped lately". */}
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
