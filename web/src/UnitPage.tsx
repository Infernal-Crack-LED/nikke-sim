// Per-character landing page — the SEO surface for long-tail searches like
// "best overload <name>" or "<name> kit". Plan:
// docs/handoffs/2026-08-02-character-landing-pages-plan.md.
//
// Everything here is DERIVED from committed artifacts, so a page never needs a
// hand-written blurb per unit: identity + kit prose from data/characters.json,
// kit-role tags from data/archetype-tags.json, and the ranked overload table +
// model status from data/unit-pages.json (the build-time page artifact), with the
// DPS standing loaded lazily from the dpschart artifact.
//
// DEGRADES, NEVER VANISHES. 196 characters exist; only 111 are simSupported and
// 73 have an overload table. A section with no data says so in one line rather
// than disappearing — an unmodeled unit's page is still a real page (kit,
// identity, tags), and a visitor can tell the difference between "the sim says
// nothing here" and "this page is broken".
//
// PLAYER-FACING COPY (CLAUDE.md rule 10): states facts about the unit and the
// model. The internal prose fields of kit-status.json (`evidence`, `residual`,
// `kitParse.findings`) are AI-facing shorthand and are deliberately never
// rendered — only its structured fields are.
import { useEffect, useMemo, useState } from 'react';
import charactersJson from '../../data/characters.json';
import unitPagesJson from '../../data/unit-pages.json';
import archetypeJson from '../../data/archetype-tags.json';
import type { DataFile } from '../../src/types';
import {
  NEUTRAL_CELL,
  ELEWEAK_CELL,
} from '../../src/infographics/core/unitCardData';
import { parseCellId } from '../../src/dpschart/matrix';
import { loadDpsChart, rankedFor } from './dpschartData';
import { manifestThumbUrl } from './portraitManifest';
import { escapeJsonLd } from './jsonLd';
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

// ---- page data artifact -----------------------------------------------------
// data/unit-pages.json, built by scripts/build-unit-pages.ts. Deliberately NOT
// data/kit-status.json directly: that file is 366 KB of mostly AI-facing prose,
// and importing it here shipped ~310 KB of internal notes to every visitor.

interface OlRow {
  label: string;
  gainPct: number;
}
interface KitStatus {
  tier?: string;
  tuned?: boolean;
  graded?: { teams?: number; within3pct?: number };
  unmodeled?: Record<string, string[]>;
}
const unitPages = unitPagesJson as {
  tier: number;
  units: Record<string, { ol?: OlRow[]; status?: KitStatus }>;
};
const OL_TIER = unitPages.tier;

// ---- kit-role tags ----------------------------------------------------------

const archetype = archetypeJson as unknown as {
  vocabulary: Record<string, { label: string; blurb: string }>;
  tags: Record<string, string[]>;
};

// ---- model status -----------------------------------------------------------

// Player-facing rendering of data/kit-status.json's `tiers`. The artifact's own
// blurbs are written for the repo's own agents ("focus recording / frame-count /
// gauge-popup read set or confirmed the values"); these say the same thing to
// someone who has never read CONVENTIONS.md.
const TIER_COPY: Record<string, { label: string; blurb: string }> = {
  MEASURED: {
    label: 'Measured',
    blurb:
      'Her values were read frame-by-frame out of a recording of a real fight — damage popups, fire cadence and burst timing confirmed against footage.',
  },
  CALIBRATED: {
    label: 'Calibrated',
    blurb:
      'Her numbers were tuned until the sim matched real recorded fights. The mechanic is inferred rather than directly observed, so the value is the sim’s, not the game’s.',
  },
  VALIDATED: {
    label: 'Validated',
    blurb:
      'Her total damage matches a recorded fight, but the individual mechanics have not been frame-verified yet.',
  },
  MODEL_ONLY: {
    label: 'Model only',
    blurb:
      'Built from her kit text and datamined weapon values, and not yet checked against a recording of a real fight.',
  },
};

// ---- kit prose --------------------------------------------------------------

const SKILL_LABEL: Record<string, string> = {
  skill1: 'Skill 1',
  skill2: 'Skill 2',
  burst: 'Burst Skill',
};

// Kit text arrives as one string with '■' starting each trigger/effect block.
// Splitting on it gives one readable paragraph per block instead of a wall.
function kitBlocks(text: string | undefined): string[] {
  if (!text) {
    return [];
  }
  return text
    .split('■')
    .map((s) => s.trim())
    .filter(Boolean);
}

// ---- the prerendered landscape card ----------------------------------------

interface ImgManifest {
  images: Record<string, { file: string }>;
}
let manifestPromise: Promise<ImgManifest> | null = null;
function loadImgManifest(): Promise<ImgManifest> {
  manifestPromise ??= fetch('/api/v1/img/manifest.json').then((r) => {
    if (!r.ok) {
      throw new Error(`manifest ${r.status}`);
    }
    return r.json() as Promise<ImgManifest>;
  });
  return manifestPromise;
}

// The 2:1 landscape card that build-infographics already renders for every unit
// — the same file the page's own og:image points at, so the share card and the
// page hero can never show different numbers. Null until resolved, and null
// forever on a host without the img API (vite dev, or a deploy predating it),
// where the portrait carries the hero instead.
function useUnitCardUrl(slug: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (slug == null) {
      return;
    }
    let live = true;
    loadImgManifest()
      .then((m) => {
        const entry = m.images[`unit/${slug}.discord`];
        if (live && entry) {
          setUrl(`/img/${entry.file}`);
        }
      })
      .catch(() => {
        /* no img API here — the portrait hero is the fallback */
      });
    return () => {
      live = false;
    };
  }, [slug]);
  return url;
}

// ---- DPS standing -----------------------------------------------------------

interface Standing {
  rank: number;
  total: number;
}
// The unit's place in the two Solo headline cells the Nikke card's rank tiles
// use (unitCardData's NEUTRAL_CELL / ELEWEAK_CELL) — so the page text and the
// hero card agree. Lazy: dpschart.json is a large build artifact.
interface DpsState {
  neutral: Standing | null;
  eleweak: Standing | null;
  loaded: boolean;
  // The artifact itself couldn't be loaded (gitignored build output absent, or a
  // network failure). Tracked SEPARATELY from "no rows for this unit": without
  // it, a failed fetch renders as the factual claim "she isn't on the DPS
  // boards", which is a statement about the unit rather than about the fetch.
  unavailable: boolean;
}
function useDpsStanding(slug: string | null): DpsState {
  const [state, setState] = useState<DpsState>({
    neutral: null,
    eleweak: null,
    loaded: false,
    unavailable: false,
  });
  useEffect(() => {
    if (slug == null) {
      return;
    }
    let live = true;
    const standing = (
      art: Awaited<ReturnType<typeof loadDpsChart>>,
      cellId: string
    ): Standing | null => {
      const cell = parseCellId(cellId);
      if (!cell) {
        return null;
      }
      const pop = rankedFor(art, cell);
      // The plain row, never a variant profile — a profiled unit appears twice.
      const row = pop.find((e) => e.slug === slug && e.profile == null);
      return row ? { rank: row.rank, total: pop.length } : null;
    };
    loadDpsChart()
      .then((art) => {
        if (live) {
          setState({
            neutral: standing(art, NEUTRAL_CELL),
            eleweak: standing(art, ELEWEAK_CELL),
            loaded: true,
            unavailable: false,
          });
        }
      })
      .catch(() => {
        if (live) {
          setState({
            neutral: null,
            eleweak: null,
            loaded: true,
            unavailable: true,
          });
        }
      });
    return () => {
      live = false;
    };
  }, [slug]);
  return state;
}

// ---- page -------------------------------------------------------------------

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
  const thumb = useMemo(() => manifestThumbUrl(unitImageUrl(slug), 256), [slug]);
  const cardUrl = useUnitCardUrl(character ? slug : null);
  const dps = useDpsStanding(character ? slug : null);

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

  if (!character || slug == null) {
    return (
      <div className="app unit-page">
        <h1>Unit not found</h1>
        <p className="muted">No data for “{slug}”.</p>
        <p>
          <a href="/characters" onClick={onSpaLinkClick('/characters')}>
            Browse all characters →
          </a>
        </p>
      </div>
    );
  }

  const imageUrl = unitImageUrl(slug);
  const portrait = thumb ?? imageUrl;
  const tags = archetype.tags[slug] ?? [];
  const status = unitPages.units[slug]?.status;
  const ol = unitPages.units[slug]?.ol ?? [];
  const best = ol[0] ?? null;
  const kitSections = (['skill1', 'skill2', 'burst'] as const)
    .map((slot) => ({ slot, blocks: kitBlocks(character.skills?.[slot]) }))
    .filter((s) => s.blocks.length > 0);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `${character.name} — NIKKE unit profile`,
    url: `${SITE}/unit/${slug}`,
    about: {
      '@type': 'Thing',
      name: character.name,
      description: [
        character.element && `${character.element} Code`,
        character.class,
        character.weapon,
        character.burst && `Burst ${character.burst}`,
        character.manufacturer,
      ]
        .filter(Boolean)
        .join(' · '),
    },
    isPartOf: { '@type': 'WebSite', name: 'NIKKE Solo Raid Sim', url: SITE },
  };

  return (
    <div className="app unit-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: escapeJsonLd(jsonLd) }}
      />

      <nav className="unit-crumbs" aria-label="Breadcrumb">
        <a href="/characters" onClick={onSpaLinkClick('/characters')}>
          Characters
        </a>
        <span aria-hidden="true">›</span>
        <span>{character.name}</span>
      </nav>

      <header className="unit-header">
        {portrait && (
          <img
            className="unit-portrait"
            src={portrait}
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
          {tags.length > 0 && (
            <div className="unit-tags unit-roletags">
              {tags.map((t) => (
                <span
                  className="pill pill-role"
                  key={t}
                  title={archetype.vocabulary[t]?.blurb}
                >
                  {archetype.vocabulary[t]?.label ?? t}
                </span>
              ))}
            </div>
          )}
        </div>
      </header>

      {cardUrl && (
        <section className="unit-section unit-cardshot">
          <img
            src={cardUrl}
            alt={`${character.name} stat card — rank tiles, kit tags and best overload lines`}
            loading="lazy"
            width={1200}
            height={600}
          />
        </section>
      )}

      <UnitOverloadSection name={character.name} rows={ol} best={best} />

      <UnitStatusSection name={character.name} status={status} />

      <section className="unit-section">
        <h2>{character.name}’s kit</h2>
        {kitSections.length ? (
          kitSections.map(({ slot, blocks }) => (
            <div className="unit-skill" key={slot}>
              <h3>{SKILL_LABEL[slot]}</h3>
              {blocks.map((b, i) => (
                <p className="unit-skill-block" key={i}>
                  {b}
                </p>
              ))}
            </div>
          ))
        ) : (
          <p className="muted">Kit text not available for this unit yet.</p>
        )}
      </section>

      <section className="unit-section">
        <h2>DPS ranking</h2>
        {!dps.loaded ? (
          <p className="muted">Loading rankings…</p>
        ) : dps.unavailable ? (
          <p className="muted">
            Rankings couldn’t be loaded right now — see the{' '}
            <a href="/ranks" onClick={onSpaLinkClick('/ranks')}>
              DPS Rankings
            </a>{' '}
            page.
          </p>
        ) : dps.neutral || dps.eleweak ? (
          <>
            <ul className="unit-standings">
              {dps.eleweak && (
                <li>
                  <b>
                    #{dps.eleweak.rank}
                    <span className="muted"> of {dps.eleweak.total}</span>
                  </b>{' '}
                  against a boss weak to her element
                </li>
              )}
              {dps.neutral && (
                <li>
                  <b>
                    #{dps.neutral.rank}
                    <span className="muted"> of {dps.neutral.total}</span>
                  </b>{' '}
                  against a neutral boss
                </li>
              )}
            </ul>
            <p className="muted">
              Solo isolation, full core exposure, 8/12 overload — the same basis
              as the{' '}
              <a href="/ranks" onClick={onSpaLinkClick('/ranks')}>
                DPS Rankings
              </a>
              .
            </p>
          </>
        ) : (
          <p className="muted">
            {character.name} isn’t on the DPS boards — those rank Burst III
            carries with a modelled kit.
          </p>
        )}
      </section>

      <section className="unit-section">
        <h2>Tools</h2>
        <div className="unit-tools">
          <a href="/overload" onClick={onSpaLinkClick('/overload')}>
            Overload Optimizer
          </a>
          <a href="/ranks" onClick={onSpaLinkClick('/ranks')}>
            DPS Rankings
          </a>
          <a href="/teambuilder" onClick={onSpaLinkClick('/teambuilder')}>
            Team Builder
          </a>
          <a href="/builder" onClick={onSpaLinkClick('/builder')}>
            Card Builder
          </a>
          <a href="/characters" onClick={onSpaLinkClick('/characters')}>
            All characters
          </a>
        </div>
      </section>
    </div>
  );
}

// ---- sections ---------------------------------------------------------------

function UnitOverloadSection({
  name,
  rows,
  best,
}: {
  name: string;
  rows: OlRow[];
  best: OlRow | null;
}) {
  return (
    <section className="unit-section">
      <h2>Best overload lines for {name}</h2>
      {best ? (
        <>
          <p className="unit-lines">
            <b>{best.label}</b>{' '}
            <span className="muted">
              — +{best.gainPct.toFixed(1)}% damage over the 8/12 floor
            </span>
          </p>
          <p className="muted">
            Every loadout below keeps the 8/12 floor (4× Elemental DMG + 4× ATK)
            and spends the four remaining lines differently. Ranked by {name}’s
            own damage in a solo fight, lines rolled at T{OL_TIER}.
          </p>
          <table className="unit-ol-table">
            <thead>
              <tr>
                <th></th>
                <th>Four free overload lines</th>
                <th className="r">vs 8/12</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.label} className={i === 0 ? 'hl' : ''}>
                  <td className="muted">{i + 1}</td>
                  <td>{r.label}</td>
                  <td className="r share">+{r.gainPct.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted">
            Run this for your own team and boss on the{' '}
            <a href="/overload" onClick={onSpaLinkClick('/overload')}>
              Overload Optimizer
            </a>
            .
          </p>
        </>
      ) : (
        <p className="muted">
          No overload ranking for {name} yet — the optimizer covers units with a
          modelled kit that the team generator can build around.
        </p>
      )}
    </section>
  );
}

function UnitStatusSection({
  name,
  status,
}: {
  name: string;
  status: KitStatus | undefined;
}) {
  if (!status) {
    return (
      <section className="unit-section">
        <h2>Sim status</h2>
        <p className="muted">
          {name} isn’t modelled in the sim yet — this page shows her kit and
          stats only.
        </p>
      </section>
    );
  }
  const tier = status.tier ? TIER_COPY[status.tier] : undefined;
  const graded = status.graded;
  const unmodeled = Object.entries(status.unmodeled ?? {}).flatMap(
    ([slot, lines]) => lines.map((line) => ({ slot, line }))
  );
  return (
    <section className="unit-section">
      <h2>Sim status</h2>
      {tier && (
        <p>
          <span className={`pill pill-tier tier-${status.tier?.toLowerCase()}`}>
            {tier.label}
          </span>{' '}
          {tier.blurb}
        </p>
      )}
      <ul className="unit-status-list">
        <li>
          {status.tuned
            ? 'Hand-tuned against real recorded fights.'
            : 'Not hand-tuned yet — her model comes straight from her kit text.'}
        </li>
        {graded?.teams != null && graded.teams > 0 && (
          <li>
            Graded on {graded.teams} recorded team{graded.teams === 1 ? '' : 's'}
            , {graded.within3pct ?? 0} of them within ±3% of the real fight.
          </li>
        )}
      </ul>
      {unmodeled.length > 0 && (
        <details className="unit-unmodeled">
          <summary className="muted">
            {unmodeled.length} kit effect{unmodeled.length === 1 ? '' : 's'} not
            in the sim yet
          </summary>
          <ul>
            {unmodeled.map((u, i) => (
              <li key={i}>
                <span className="muted">{SKILL_LABEL[u.slot] ?? u.slot}: </span>
                {u.line}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
