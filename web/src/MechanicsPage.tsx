import { escapeJsonLd } from './jsonLd';
import { intro, sections, tierLegend, type Tier } from './mechanics-data';

const TIER_ORDER: Tier[] = ['Measured', 'Datamined', 'Community', 'Calibrated'];

function TierBadge({ tier }: { tier: Tier }) {
  return (
    <span className={`tier-badge tier-${tier.toLowerCase()}`}>{tier}</span>
  );
}

interface WebPageLd {
  '@context': 'https://schema.org';
  '@type': 'WebPage';
  name: string;
  description: string;
  mainEntity: {
    '@type': 'ItemList';
    itemListElement: Array<{
      '@type': 'ListItem';
      position: number;
      name: string;
    }>;
  };
}

const webPageLd: WebPageLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'NIKKE Game Mechanics Reference',
  description: intro,
  mainEntity: {
    '@type': 'ItemList',
    itemListElement: sections.map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: s.title,
    })),
  },
};

export function MechanicsPage() {
  return (
    <div className="app mech-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: escapeJsonLd(webPageLd) }}
      />
      <header>
        <h1>Game mechanics</h1>
        <p className="muted">{intro}</p>
      </header>

      <section className="tier-legend">
        {TIER_ORDER.map((t) => (
          <div className="tier-legend-item" key={t}>
            <TierBadge tier={t} />
            <span className="muted">{tierLegend[t]}</span>
          </div>
        ))}
      </section>

      <section className="mech-grid">
        {sections.map((s) => (
          <article className="mech-section" key={s.title}>
            <div className="mech-section-head">
              <h2>{s.title}</h2>
              <div className="mech-tiers">
                {s.tiers.map((t) => (
                  <TierBadge key={t} tier={t} />
                ))}
              </div>
            </div>
            <ul>
              {s.bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </div>
  );
}
