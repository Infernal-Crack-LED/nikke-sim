// Per-unit landing page — targets long-tail searches like
// "nikke <name> best overload lines".
import { useEffect, useMemo } from 'react';
import charactersJson from '../../data/characters.json';
import olOptimalJson from '../../data/ol-optimal.json';
import type { DataFile } from '../../src/types';
import { manifestThumbUrl } from './portraitManifest';
import { onSpaLinkClick } from './router';

const SITE = 'https://nikkesim.app';

function setMeta(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setOg(property: string, content: string) {
  let el = document.querySelector(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(href: string) {
  let el = document.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

// Canonical paths never carry a trailing slash, except the root.
function normalizeCanonicalPath(pathname: string): string {
  if (!pathname || pathname === '/') {
    return '/';
  }
  return pathname.replace(/\/{2,}/g, '/').replace(/\/+$/, '') || '/';
}

const DEFAULT_META = {
  description:
    'NIKKE solo-raid damage simulator: per-unit DPS calculator, overload optimizer, best overload lines, team builder, and game mechanics reference. Frame-tick accuracy, runs in your browser.',
};

const data = charactersJson as unknown as DataFile;

const OL_LABEL: Record<string, string> = {
  ammo: 'Max Ammo',
  chargedmg: 'Charge DMG',
  chargespd: 'Charge Speed',
  critrate: 'Crit Rate',
  critdmg: 'Crit DMG',
  elem: 'Elemental DMG',
  atk: 'ATK',
  hitrate: 'Hit Rate',
  def: 'DEF',
};

const olOptimal = (olOptimalJson as { units: Record<string, unknown> }).units;

function isOptimalPicks(
  value: unknown
): value is Array<{ type: string; count: number }> {
  return (
    Array.isArray(value) &&
    value.every(
      (p) =>
        p != null &&
        typeof (p as { type: unknown }).type === 'string' &&
        typeof (p as { count: unknown }).count === 'number'
    )
  );
}

function unitOptimalLines(slug: string | null): string {
  if (slug == null) {
    return 'No optimal line data yet.';
  }
  const picks = isOptimalPicks(olOptimal[slug]) ? olOptimal[slug] : null;
  if (!picks?.length) {
    return 'No optimal line data yet.';
  }
  return picks
    .map(
      (p) =>
        `${p.count}× ${Object.hasOwn(OL_LABEL, p.type) ? OL_LABEL[p.type] : p.type}`
    )
    .join(', ');
}

function unitImageUrl(slug: string | null): string | null {
  if (slug == null) {
    return null;
  }
  return data.characters[slug]?.imageUrl ?? null;
}

export function UnitPage({ slug }: { slug: string | null }) {
  const character =
    slug != null && Object.hasOwn(data.characters, slug)
      ? data.characters[slug]
      : undefined;
  const thumb = useMemo(
    () => manifestThumbUrl(unitImageUrl(slug), 256),
    [slug]
  );

  useEffect(() => {
    const pathname = window.location.pathname;
    if (!character) {
      const title = 'Unit not found — NIKKE Solo Raid Sim';
      document.title = title;
      setMeta('description', DEFAULT_META.description);
      setOg('og:title', title);
      setOg('og:description', DEFAULT_META.description);
      setOg('og:url', SITE + '/');
      setMeta('twitter:title', title);
      setMeta('twitter:description', DEFAULT_META.description);
      setCanonical(SITE + '/');
      return;
    }
    const title = `${character.name} — NIKKE Unit Profile, Best Overload Lines & DPS Ranking`;
    const description = `NIKKE ${character.name} unit profile: element, weapon, burst stage, and best overload lines. See how ${character.name} ranks in the solo-raid DPS sim.`;
    const canonical = SITE + normalizeCanonicalPath(pathname.toLowerCase());
    document.title = title;
    setMeta('description', description);
    setOg('og:title', title);
    setOg('og:description', description);
    setOg('og:url', canonical);
    setMeta('twitter:title', title);
    setMeta('twitter:description', description);
    setCanonical(canonical);
  }, [character, slug]);

  if (!character) {
    return (
      <div className="app unit-page">
        <h1>Unit not found</h1>
        <p className="muted">No data for “{slug}”.</p>
      </div>
    );
  }

  const imageUrl = unitImageUrl(slug);
  const webpUrl = thumb ?? imageUrl;

  return (
    <div className="app unit-page">
      <header className="unit-header">
        {webpUrl && (
          <img
            className="unit-portrait"
            src={webpUrl}
            alt={character.name}
            loading="eager"
          />
        )}
        <div className="unit-meta">
          <h1>{character.name}</h1>
          <div className="unit-tags">
            {character.element && (
              <span className="pill">{character.element}</span>
            )}
            {character.weapon && (
              <span className="pill">{character.weapon}</span>
            )}
            {character.burst && (
              <span className="pill">Burst {character.burst}</span>
            )}
            {character.class && <span className="pill">{character.class}</span>}
            {character.manufacturer && (
              <span className="pill">{character.manufacturer}</span>
            )}
          </div>
        </div>
      </header>

      <section className="unit-section">
        <h2>Best overload lines</h2>
        <p>
          Solo-framework damage-optimal 12/12 remainder lines (beyond the 4×
          Elemental DMG + 4× ATK floor):
        </p>
        <p className="unit-lines">{unitOptimalLines(slug)}</p>
      </section>

      <section className="unit-section">
        <h2>Tools</h2>
        <div className="unit-tools">
          <a href="/ranks" onClick={onSpaLinkClick('/ranks')}>
            DPS Rankings
          </a>
          <a href="/overload" onClick={onSpaLinkClick('/overload')}>
            Overload Optimizer
          </a>
          <a href="/teambuilder" onClick={onSpaLinkClick('/teambuilder')}>
            Team Builder
          </a>
        </div>
      </section>
    </div>
  );
}
