import sourcesJson from '../../data/sources.json';

// The accreditation registry — data/sources.json — is the single source of truth
// for the external research/data the sim is built on. This page renders it: every
// harness that consumes an outside source appends an entry there, and it shows up
// here automatically. Grouped by evidence tier (docs/CONVENTIONS.md).
interface Source {
  id: string;
  name: string;
  url: string;
  author?: string;
  region?: string;
  category: string;
  tier: string;
  usedFor: string;
}

const TIER_ORDER = ['COMMUNITY', 'DATAMINED', 'API'] as const;

const TIER_LABEL: Record<string, string> = {
  COMMUNITY: 'Community research & testing',
  DATAMINED: 'Datamined game data',
  API: 'Stats APIs & official tools',
};

const TIER_BLURB: Record<string, string> = {
  COMMUNITY:
    'Frame-accurate empirical testing, guides, and mechanic write-ups from the NIKKE community — the backbone of the damage model.',
  DATAMINED:
    'Decoded game tables that ground the sim in the actual shipped values.',
  API: 'Live stats sources and official companion tools.',
};

export function CreditsPage() {
  const sources = sourcesJson.sources as Source[];
  const groups = TIER_ORDER.map((tier) => ({
    tier,
    items: sources.filter((s) => s.tier === tier),
  })).filter((g) => g.items.length);

  return (
    <div className='app patch-notes credits-page'>
      <header>
        <h1>Credits</h1>
        <p className='muted'>
          The NIKKE Solo Raid Sim is built on the back of many other works I
          found attempting to provide data to our community. All of these
          sources below were used in conjunction with frame-by-frame video data
          in game and had a heavy influence on the overall feasibility of this
          project in addition to serving as external validation I could measure
          my own testing tools against. Without the sources below, I would not
          have been able to come as far with this project, so I want to thank
          all of you for your contributions. I've long consumed data in my
          obsessive min-maxing career over my long gaming history, I am happy to
          finally contribute my own tool to a gaming community that I love. And
          lastly, a special thank you to Tsareena from Maiden's Bakery for
          cursing me with the idea for this insane project.
        </p>
      </header>

      {groups.map(({ tier, items }) => (
        <article className='patch-entry' key={tier}>
          <div className='patch-head'>
            <span className='patch-title'>{TIER_LABEL[tier] ?? tier}</span>
            <span className='patch-date'>{tier}</span>
          </div>
          {TIER_BLURB[tier] && (
            <p className='muted' style={{ marginBottom: 12 }}>
              {TIER_BLURB[tier]}
            </p>
          )}
          <ul className='credits-list'>
            {items.map((s) => (
              <li className='credit' key={s.id}>
                <div className='credit-head'>
                  <a
                    className='credit-name'
                    href={s.url}
                    target='_blank'
                    rel='noreferrer'
                  >
                    {s.name}
                  </a>
                  {s.author && (
                    <span className='credit-author'>by {s.author}</span>
                  )}
                  {s.region && (
                    <span className='credit-region'>{s.region}</span>
                  )}
                </div>
                <p className='credit-used muted'>{s.usedFor}</p>
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}
