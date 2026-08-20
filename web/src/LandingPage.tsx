import type { MouseEvent } from 'react';
import { escapeJsonLd } from './jsonLd';
import { onSpaLinkClick } from './router';
import { dev } from './site-data';
// Hero, feature and callout copy lives in src/share so the server-rendered
// no-JS body (src/server/static.ts) says exactly what this page says.
import {
  GAME_NAME,
  HOME_CTAS,
  HOME_FEATURES,
  HOME_HERO_AFTER,
  HOME_HERO_BEFORE,
  HOME_SECTION_TITLE,
  SITE_NAME,
  type HomeFeature,
} from '../../src/share/site-identity';

const SITE = 'https://nikkesim.app';

function FeatureCard({ href, title, blurb, cta }: HomeFeature) {
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
    name: SITE_NAME,
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
        <h1>{SITE_NAME}</h1>
        <p>
          {HOME_HERO_BEFORE}
          <strong>{GAME_NAME}</strong>
          {HOME_HERO_AFTER}
        </p>
        <div className="home-cta-row">
          {HOME_CTAS.map((cta) => (
            <a
              key={cta.href}
              href={cta.href}
              className={cta.style}
              onClick={(e) => onSpaLinkClick(cta.href)(e)}
            >
              {cta.label}
            </a>
          ))}
        </div>
      </section>

      <section className="home-section">
        <h2 className="home-section-title">{HOME_SECTION_TITLE}</h2>
        <div className="home-feature-grid">
          {HOME_FEATURES.map((feature) => (
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
