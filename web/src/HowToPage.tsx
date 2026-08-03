import { escapeJsonLd } from './jsonLd';
import { intro, sections, type HowToItem } from './howto-data';

interface DefinedTermLd {
  '@context': 'https://schema.org';
  '@type': 'DefinedTermSet';
  name: string;
  description: string;
  hasDefinedTerm: Array<{
    '@type': 'DefinedTerm';
    name: string;
    description: string;
  }>;
}

function itemToDefinedTerm(it: HowToItem) {
  return {
    '@type': 'DefinedTerm' as const,
    name: it.term,
    description: it.def,
  };
}

const definedTermSetLd: DefinedTermLd = {
  '@context': 'https://schema.org',
  '@type': 'DefinedTermSet',
  name: 'How to Use the NIKKE Solo Raid Sim',
  description: intro,
  hasDefinedTerm: sections.flatMap((s) => s.items ?? []).map(itemToDefinedTerm),
};

export function HowToPage() {
  return (
    <div className="app howto-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: escapeJsonLd(definedTermSetLd) }}
      />
      <header>
        <h1>How to use this site</h1>
        <p className="muted">{intro}</p>
      </header>

      <div className="howto-grid">
        {sections.map((s) => (
          <article className="mech-section howto-section" key={s.title}>
            <h2>{s.title}</h2>
            {s.intro && <p className="howto-intro muted">{s.intro}</p>}
            {s.bullets && (
              <ul>
                {s.bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            )}
            {s.items && (
              <dl className="howto-dl">
                {s.items.map((it) => (
                  <div key={it.term}>
                    <dt>{it.term}</dt>
                    <dd>{it.def}</dd>
                  </div>
                ))}
              </dl>
            )}
            {s.outro && <p className="howto-outro muted">{s.outro}</p>}
          </article>
        ))}
      </div>
    </div>
  );
}
