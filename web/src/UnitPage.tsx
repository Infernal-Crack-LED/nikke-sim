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
import {
  buildAmmoTable,
  buildChargeTable,
  chargeLatencyFrames,
} from '../../src/infographics/core/tableData';
import type { TableCardData } from '../../src/infographics/core/tableCard';
import { loadDpsChart, compareIn } from './dpschartData';
import { manifestThumbUrl } from './portraitManifest';
import {
  ICON_BY_BURST,
  ICON_BY_CLASS,
  iconNameForElement,
  iconNameForManufacturer,
  iconNameForWeapon,
} from '../../src/infographics/core/iconNames';
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

// ---- kit-role tags ----------------------------------------------------------

const archetype = archetypeJson as unknown as {
  vocabulary: Record<string, { label: string; blurb: string }>;
  tags: Record<string, string[]>;
};

// ---- model status -----------------------------------------------------------

// One-word, player-facing label per data/kit-status.json tier. The artifact's own
// blurbs ("focus recording / frame-count / gauge-popup read set or confirmed the
// values") are written for the repo's own agents; the page shows a badge only
// (owner 2026-08-02), so only the label survives here. MODEL_ONLY uses the
// artifact's own gloss for it — "= UNTUNED".
const TIER_COPY: Record<string, { label: string }> = {
  MEASURED: { label: 'Measured' },
  CALIBRATED: { label: 'Calibrated' },
  VALIDATED: { label: 'Validated' },
  MODEL_ONLY: { label: 'Untuned' },
};

// ---- identity icons ---------------------------------------------------------

// nikke-icons/ is not uniform: the element codes ship .svg (crisp at any size),
// the weapons .png, and the class/burst/manufacturer sets .webp. Resolving the
// extension from the basename here keeps that knowledge in ONE place instead of
// hardcoded per call site, which is how CharacterGrid ended up with three
// different literal patterns.
function iconUrl(name: string | null): string | null {
  if (!name) {
    return null;
  }
  const ext = name.startsWith('code_')
    ? 'svg'
    : name.startsWith('weapon_')
      ? 'png'
      : 'webp';
  return `/nikke-icons/${name}.${ext}`;
}

interface Ident {
  icon: string | null;
  label: string;
}

// The unit's identity attributes, in the order the card draws them. An attribute
// with no icon asset (Pistol has none) still shows its label — the text is the
// part a crawler reads, and the card is an image it can't read at all.
function identsFor(character: DataFile['characters'][string]): Ident[] {
  return [
    { icon: iconNameForElement(character.element), label: character.element },
    { icon: iconNameForWeapon(character.weapon), label: character.weapon },
    {
      icon: ICON_BY_BURST[character.burst] ?? null,
      label: `Burst ${character.burst}`,
    },
    // Burst cooldown, immediately after the stage it belongs to. No icon — the
    // nikke-icons set has no cooldown glyph, and the card renders it as bare
    // text under the stage icon for the same reason.
    ...(character.burstCooldownSec
      ? [{ icon: null, label: `${character.burstCooldownSec}s CD` }]
      : []),
    { icon: ICON_BY_CLASS[character.class] ?? null, label: character.class },
    ...(character.manufacturer
      ? [
          {
            icon: iconNameForManufacturer(character.manufacturer),
            label: character.manufacturer,
          },
        ]
      : []),
  ].filter((i) => i.label);
}

// ---- kit prose --------------------------------------------------------------

const SKILL_LABEL: Record<string, string> = {
  skill1: 'Skill 1',
  skill2: 'Skill 2',
  burst: 'Burst Skill',
};

// Datamined cooldown for a skill slot, in seconds — null when the skill has none.
// Most kits don't: skill1 carries a cooldown on 10 of 196 units and skill2 on 37,
// because the rest are passives or event-triggered blocks with nothing to time.
// The burst slot almost always has one (190/196), and falls back to the unit's
// top-level burstCooldownSec, which is the field the sim's rotation actually runs
// on — so the number shown here is the one the fight is simulated with.
function cooldownFor(
  character: DataFile['characters'][string],
  slot: 'skill1' | 'skill2' | 'burst'
): number | null {
  const cd = character.skillCooldownsSec?.[slot];
  if (cd != null) {
    return cd;
  }
  return slot === 'burst' ? (character.burstCooldownSec ?? null) : null;
}

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
  // The STATIC path, not /api/v1/img/manifest.json. The API route only exists on
  // the hono server (src/server/api.ts); scripts/serve.mjs — the zero-dependency
  // static server used by the Railway start command and every local preview —
  // doesn't have it, so the API URL silently 404s there and the hero vanishes.
  // dist/img/manifest.json is a plain file both servers serve.
  manifestPromise ??= fetch('/img/manifest.json').then((r) => {
    if (!r.ok) {
      throw new Error(`manifest ${r.status}`);
    }
    return r.json() as Promise<ImgManifest>;
  });
  return manifestPromise;
}

// Draw the card in the browser, as a data URL. This is the FALLBACK for hosts
// that serve no prerendered set — above all `npm run web` (vite dev), which
// serves web/public/ and never dist/, so /img/manifest.json 404s there and the
// hero could otherwise never appear during development.
//
// Same core renderer and same data builder as the prerendered PNG
// (infographics/core/unitCard.ts via unitCardShare.ts, the path the Card Builder
// already drives), so the fallback is the same card, not a lookalike. Everything
// heavy — the canvas renderer, the board artifacts — is imported dynamically, so
// a page that resolves the manifest never pays for any of it.
async function renderUnitCardDataUrl(
  slug: string,
  imageUrl: string | null
): Promise<string | null> {
  const [
    { buildUnitCardShare },
    { drawUnitCardVariant, unitCardSize, UNIT_CARD_WEBP_QUALITY },
    { ensureRoboto, loadPortrait },
    boards,
  ] = await Promise.all([
    import('./unitCardShare'),
    import('../../src/infographics/core/unitCard'),
    import('./teamShare'),
    loadCardBoards(),
  ]);
  const [portrait] = await Promise.all([
    imageUrl ? loadPortrait(imageUrl) : null,
    // Without this the first paint draws with fallback font metrics.
    ensureRoboto(),
  ]);
  const card = await buildUnitCardShare(
    slug,
    boards,
    portrait,
    undefined,
    'discord'
  );
  if (!card) {
    return null;
  }
  const { w, h, dpr } = unitCardSize('discord');
  const cv = document.createElement('canvas');
  cv.width = w * dpr;
  cv.height = h * dpr;
  const ctx = cv.getContext('2d');
  if (!ctx) {
    return null;
  }
  ctx.scale(dpr, dpr);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  drawUnitCardVariant(ctx as never, card, 'discord');
  // WEBP at the build's own quality, not a lossless PNG. Production serves the
  // prerendered lossy WebP, so encoding the fallback losslessly makes the card
  // look subtly different in dev than the file that actually ships — most
  // visibly on the small icon-strip labels, which is exactly where q90 shows.
  // (A residual difference remains and is NOT fixable here: @napi-rs/canvas and
  // the browser's Skia antialias glyphs differently. Font metrics are identical
  // across the two hosts — measured, all four weights match to 0.01px — so this
  // is rasterization, not a different font.)
  return cv.toDataURL('image/webp', UNIT_CARD_WEBP_QUALITY / 100);
}

// Every board the card can draw a tile from. Each is independently nullable and
// the card draws an absent state, so a board that fails to load THINS the card
// rather than losing it.
async function loadCardBoards() {
  const { loadBurstGen, loadBurstCdr, loadSustain, loadBufferChart } =
    await import('./rankBoardsData');
  const settle = <T,>(p: Promise<T>) => p.catch(() => null);
  const [dpschart, burstgen, burstcdr, sustain, bufferchart] =
    await Promise.all([
      settle(loadDpsChart()),
      settle(loadBurstGen()),
      settle(loadBurstCdr()),
      settle(loadSustain()),
      settle(loadBufferChart()),
    ]);
  return { dpschart, burstgen, burstcdr, sustain, bufferchart } as never;
}

// The 2:1 landscape card. Prefers the PREBUILT PNG that build-infographics
// hashes into dist/img — it is the same file this page's og:image points at, so
// the share card and the page hero can never show different numbers, and it
// costs one cached image request. When no prerendered set is reachable, falls
// back to drawing the identical card client-side (above).
function useUnitCardUrl(
  slug: string | null,
  imageUrl: string | null
): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (slug == null) {
      return;
    }
    let live = true;
    void (async () => {
      try {
        const m = await loadImgManifest();
        const entry = m.images[`unit/${slug}.discord`];
        if (entry) {
          if (live) {
            setUrl(`/img/${entry.file}`);
          }
          return;
        }
      } catch {
        /* no prerendered set here — draw it instead */
      }
      try {
        const drawn = await renderUnitCardDataUrl(slug, imageUrl);
        if (live && drawn) {
          setUrl(drawn);
        }
      } catch {
        /* canvas unavailable (jsdom smoke) — the page just has no hero */
      }
    })();
    return () => {
      live = false;
    };
  }, [slug, imageUrl]);
  return url;
}

// ---- DPS standing -----------------------------------------------------------

interface Standing {
  rank: number;
  total: number;
}
// The unit's place in the two Solo headline cells the Nikke card's rank tiles
// use (unitCardData's NEUTRAL_CELL / ELEWEAK_CELL) — so the page text and the
// hero card agree. That includes the card's SCOPES: neutral ranks the whole
// board, elemental-advantage ranks within the unit's own element (owner,
// 2026-08-18), which is what `element` here selects. Lazy: dpschart.json is a
// large build artifact.
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
function useDpsStanding(slug: string | null, element?: string): DpsState {
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
      cellId: string,
      ele?: string
    ): Standing | null => {
      const cell = parseCellId(cellId);
      if (!cell) {
        return null;
      }
      // compareIn targets the PLAIN row (a profiled unit appears twice) and, with
      // an element, ranks within that element's population — the same lookup the
      // /dpschart compare selector uses.
      const row = compareIn(art, cell, slug, ele ?? null);
      return row ? { rank: row.rank, total: row.total } : null;
    };
    loadDpsChart()
      .then((art) => {
        if (live) {
          setState({
            neutral: standing(art, NEUTRAL_CELL),
            eleweak: standing(art, ELEWEAK_CELL, element),
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
  }, [slug, element]);
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
  const thumb = useMemo(
    () => manifestThumbUrl(unitImageUrl(slug), 256),
    [slug]
  );
  const cardUrl = useUnitCardUrl(character ? slug : null, unitImageUrl(slug));
  const dps = useDpsStanding(character ? slug : null, character?.element);
  // Related characters — same source as the no-JS body (data/characters.json),
  // same selection as src/server/static.ts relatedUnitLinks (keep in lockstep).
  const related = useMemo(() => {
    if (slug == null || !character) {
      return null;
    }
    const chars = data.characters as Record<
      string,
      { name?: string; element?: string; weapon?: string }
    >;
    const pick = (key: 'element' | 'weapon') =>
      Object.entries(chars)
        .filter(
          ([s, c]) => s !== slug && c[key] != null && c[key] === character[key]
        )
        .sort(([sa, ca], [sb, cb]) =>
          (ca.name ?? sa).localeCompare(cb.name ?? sb)
        )
        .slice(0, 6);
    return { element: pick('element'), weapon: pick('weapon') };
  }, [slug, character]);

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
          {/* Identity as icon + label. The hero card below shows the same five
              attributes, but it is an IMAGE — this is the copy a crawler reads. */}
          <div className="unit-idents">
            {identsFor(character).map((ident) => {
              const src = iconUrl(ident.icon);
              return (
                <span className="unit-ident" key={ident.label}>
                  {src && <img src={src} alt="" aria-hidden="true" />}
                  {ident.label}
                </span>
              );
            })}
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
        <div className="unit-cardshot">
          <img
            src={cardUrl}
            alt={`${character.name} stat card — rank tiles, kit tags and best overload lines`}
            loading="eager"
            width={1200}
            height={600}
          />
        </div>
      )}

      <section className="unit-section">
        <h2>Skills</h2>
        {kitSections.length ? (
          <div className="unit-skills-grid">
            {kitSections.map(({ slot, blocks }) => (
              <div className={`unit-skill slot-${slot}`} key={slot}>
                <h3>
                  {SKILL_LABEL[slot]}
                  {cooldownFor(character, slot) != null && (
                    <span className="unit-skill-cd">
                      {cooldownFor(character, slot)}s CD
                    </span>
                  )}
                </h3>
                {blocks.map((b, i) => (
                  <p className="unit-skill-block" key={i}>
                    {b}
                  </p>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">Kit text not available for this unit yet.</p>
        )}
      </section>

      <UnitOverloadSection
        name={character.name}
        rows={ol}
        best={best}
        character={character}
      />

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
                  among {character.element} units, against a boss weak to her
                  element
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
              See the full breakdown on{' '}
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

      {related && (related.element.length > 0 || related.weapon.length > 0) && (
        <section className="unit-section">
          <h2>Related characters</h2>
          {related.element.length > 0 && (
            <div className="unit-related">
              <h3>More {character.element} units</h3>
              {related.element.map(([s, c]) => (
                <a
                  key={s}
                  href={`/unit/${s}`}
                  onClick={onSpaLinkClick(`/unit/${s}`)}
                >
                  {c.name ?? s}
                </a>
              ))}
            </div>
          )}
          {related.weapon.length > 0 && (
            <div className="unit-related">
              <h3>More {character.weapon} users</h3>
              {related.weapon.map(([s, c]) => (
                <a
                  key={s}
                  href={`/unit/${s}`}
                  onClick={onSpaLinkClick(`/unit/${s}`)}
                >
                  {c.name ?? s}
                </a>
              ))}
            </div>
          )}
        </section>
      )}

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

      <UnitStatusSection status={status} />
    </div>
  );
}

// ---- sections ---------------------------------------------------------------

// The 8-line floor every ranked loadout holds constant, spelled out the way the
// summary line reads rather than as the internal "8/12" shorthand.
const OL_FLOOR_LABEL = '4× Attack + 4× Elemental Damage';

// A TableCardData (the platform-free builders in core/tableData.ts, the same ones
// that render the shareable breakpoint cards and the /charge panel) as an HTML
// table. Reused rather than re-derived so a breakpoint shown here can never
// disagree with the card or the calculator — the frame/rounding constants in
// those builders are load-bearing.
function CardTable({ card }: { card: TableCardData }) {
  return (
    <>
      {card.subtitle && <p className="muted">{card.subtitle}</p>}
      <table className="unit-ol-table">
        <thead>
          <tr>
            {card.columns.map((c) => (
              <th key={c.header} className={c.align === 'right' ? 'r' : ''}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {card.rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={card.columns[j]?.align === 'right' ? 'r' : ''}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

type OlTab = 'optimal' | 'cs' | 'ammo';

function UnitOverloadSection({
  name,
  rows,
  best,
  character,
}: {
  name: string;
  rows: OlRow[];
  best: OlRow | null;
  character: DataFile['characters'][string];
}) {
  // Charge Speed breakpoints only exist for charge weapons — an AR has no charge
  // frames to shorten, so the tab is absent rather than empty.
  const hasCharge = character.weapon === 'SR' || character.weapon === 'RL';
  const [tab, setTab] = useState<OlTab>('optimal');
  const TABS: { key: OlTab; label: string }[] = [
    { key: 'optimal', label: 'Optimal Overload' },
    ...(hasCharge ? [{ key: 'cs' as OlTab, label: 'CS Breakpoints' }] : []),
    { key: 'ammo' as OlTab, label: 'Max Ammo Breakpoints' },
  ];
  // A unit whose tab set shrank (or a stale tab after navigating between units)
  // must not land on a tab that no longer exists.
  const active = TABS.some((t) => t.key === tab) ? tab : 'optimal';

  return (
    <section className="unit-section">
      <h2>Overload Lines</h2>
      <div className="unit-panel">
        <nav className="unit-tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={active === t.key ? 'on' : ''}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {active === 'optimal' &&
          (best ? (
            <>
              <p className="unit-lines">
                <b>
                  {OL_FLOOR_LABEL} + {best.label}
                </b>
              </p>
              <p className="muted">
                +{best.gainPct.toFixed(1)}% damage over {OL_FLOOR_LABEL}
              </p>
              <table className="unit-ol-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>Optimal Overload Lines</th>
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
              No overload ranking for {name} yet — the optimizer covers units
              with a modelled kit that the team generator can build around.
            </p>
          ))}

        {active === 'cs' && (
          <CardTable
            card={buildChargeTable(
              character.chargeFrames,
              name,
              chargeLatencyFrames(character)
            )}
          />
        )}

        {active === 'ammo' && (
          <CardTable card={buildAmmoTable(character.ammo, name)} />
        )}
      </div>
    </section>
  );
}

// Bottom-of-page, one word (owner 2026-08-02). The tier label alone — the
// explanatory blurb and the tuned/graded breakdown are deliberately not here.
// The full evidence tiers live in the mechanics/conventions docs; this is a
// one-glance badge, not a trust essay.
function UnitStatusSection({ status }: { status: KitStatus | undefined }) {
  const tier = status?.tier ? TIER_COPY[status.tier] : undefined;
  if (!tier) {
    return (
      <section className="unit-section">
        <h2>Sim status</h2>
        <p>
          <span className="pill pill-tier">Unmodelled</span>
        </p>
      </section>
    );
  }
  return (
    <section className="unit-section">
      <h2>Sim status</h2>
      <p>
        <span className={`pill pill-tier tier-${status?.tier?.toLowerCase()}`}>
          {tier.label}
        </span>
      </p>
    </section>
  );
}
