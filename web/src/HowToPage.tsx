import { intro, sections } from './howto-data';

export function HowToPage() {
  return (
    <div className='app howto-page'>
      <header>
        <h1>How to use this site</h1>
        <p className='muted'>{intro}</p>
      </header>

      <div className='howto-grid'>
        {sections.map((s) => (
          <article className='mech-section howto-section' key={s.title}>
            <h2>{s.title}</h2>
            {s.intro && <p className='howto-intro muted'>{s.intro}</p>}
            {s.bullets && (
              <ul>
                {s.bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            )}
            {s.items && (
              <dl className='howto-dl'>
                {s.items.map((it) => (
                  <div key={it.term}>
                    <dt>{it.term}</dt>
                    <dd>{it.def}</dd>
                  </div>
                ))}
              </dl>
            )}
            {s.outro && <p className='howto-outro muted'>{s.outro}</p>}
          </article>
        ))}
      </div>
    </div>
  );
}
