import type { MouseEvent } from 'react';
import { escapeJsonLd } from './jsonLd';
import { onSpaLinkClick } from './router';
import { dev } from './site-data';

const SITE = 'https://nikkesim.app';

interface Feature {
  href: string;
  title: string;
  blurb: string;
  cta: string;
}

const FEATURES: Feature[] = [
  {
    href: '/sim',
    title: 'Team Simulator',
    blurb:
      'Run a frame-tick damage simulation for your squad against a custom boss. Per-unit DPS, share breakdowns, and full-burst counts.',
    cta: 'Open the sim',
  },
  {
    href: '/teambuilder',
    title: 'Team Builder',
    blurb:
      'Assemble up to five Nikkes and see team effects, elemental synergies, and burst coverage at a glance.',
    cta: 'Build a team',
  },
  {
    href: '/ranks',
    title: 'DPS Rankings',
    blurb:
      'Ranked damage under standardized frameworks: neutral, elementally advantaged, with and without supports.',
    cta: 'View rankings',
  },
  {
    href: '/roster',
    title: 'Roster Generator',
    blurb:
      'Generate the best solo-raid or union-raid roster teams from your unit pool, accounting for element, burst rotation, and overload synergy.',
    cta: 'Generate rosters',
  },
  {
    href: '/overload',
    title: 'Overload Optimizer',
    blurb:
      'Find the best overload lines for any Nikke, estimate rolling costs, and check charge-speed breakpoints.',
    cta: 'Optimize lines',
  },
  {
    href: '/builder',
    title: 'Infographic Generator',
    blurb:
      'Build and download shareable infographics for teams, DPS charts, unit comparisons, rank boards, and pull odds.',
    cta: 'Open builder',
  },
];

function FeatureCard({ href, title, blurb, cta }: Feature) {
  const spa = (e: MouseEvent<HTMLAnchorElement>) => {
    onSpaLinkClick(href)(e);
  };
  return (
    <a href={href} onClick={spa} className="home-feature">
      <h2>{title}</h2>
      <p>{blurb}</p>
      <span className="home-feature-cta" aria-hidden="true">
        {cta} →
      </span>
    </a>
  );
}

export function LandingPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Nikke Simulator',
    url: SITE,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE}/characters?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <div className="app home-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: escapeJsonLd(jsonLd) }}
      />

      <section className="home-hero">
        <img
          className="home-hero-logo"
          src="/favicon.svg"
          alt=""
          width={56}
          height={56}
        />
        <h1>Nikke Simulator</h1>
        <p>
          Plan, build, and share <strong>NIKKE: Goddess of Victory</strong>{' '}
          squads. Browse every Nikke, assemble teams, optimize overload lines,
          and compare DPS — all in one place.
        </p>
        <div className="home-cta-row">
          <a
            href="/teambuilder"
            className="btn-solid"
            onClick={(e) => onSpaLinkClick('/teambuilder')(e)}
          >
            Build a Team
          </a>
          <a
            href="/characters"
            className="btn-outline"
            onClick={(e) => onSpaLinkClick('/characters')(e)}
          >
            Browse Characters
          </a>
        </div>
      </section>

      <section className="home-section">
        <h2 className="home-section-title">
          Everything you need to plan a squad
        </h2>
        <div className="home-feature-grid">
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.href} {...feature} />
          ))}
        </div>
      </section>

      <section className="home-callout">
        <img
          className="home-callout-avatar"
          src="/maiden.gif"
          alt=""
          width={72}
          height={72}
        />
        <div className="home-callout-body">
          <h2>Meet {dev.maiden.name}</h2>
          <p>{dev.maiden.blurb}</p>
          <a
            className="btn-primary discord"
            href={dev.maiden.addToServer}
            target="_blank"
            rel="noreferrer"
          >
            Add {dev.maiden.name} to your server
          </a>
        </div>
      </section>

      <section className="home-callout">
        <img
          className="home-callout-avatar square"
          src="/refittingroom-icon.png"
          alt=""
          width={72}
          height={72}
        />
        <div className="home-callout-body">
          <h2>{dev.refittingroom.name}</h2>
          <p>{dev.refittingroom.blurb}</p>
          <a
            className="btn-outline"
            href={dev.refittingroom.url}
            target="_blank"
            rel="noreferrer"
          >
            Visit {dev.refittingroom.name}
          </a>
        </div>
      </section>
    </div>
  );
}
