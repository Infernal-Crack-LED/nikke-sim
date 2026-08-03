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
import { useEffect } from 'react';
import {
  CharacterCards,
  CharacterFilters,
  useCharacterFilter,
} from './components/CharacterGrid';
import { escapeJsonLd } from './jsonLd';

const SITE = 'https://nikkesim.app';
const NONE = new Set<string>();

export function CharactersPage() {
  const filter = useCharacterFilter({
    exclude: NONE,
    allowUnsupported: true,
  });

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
          Every Nikke, with her kit, her best overload lines, and where she lands
          in the solo-raid DPS rankings. Filter by element, weapon, burst stage,
          class or kit role, then open a Nikke for her full profile.
        </p>
      </header>

      <CharacterFilters filter={filter} />
      <CharacterCards filter={filter} linkFor={(slug) => `/unit/${slug}`} />
    </div>
  );
}
