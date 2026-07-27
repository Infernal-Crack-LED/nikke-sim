// Build code → card data mapping for the dynamic render routes.
//
// DECISION (Phase 3, documented per the handoff's task 3): the card is rendered
// from BUILD DATA ALONE — units, portraits, element-advantage markers, and the
// boss/meta line — with the damage fields at ZERO. This matches BOTH existing
// no-sim consumers exactly:
//   - the web Team Builder's own "copy image" path (web/src/App.tsx onTbCopyImage,
//     ~line 2796: `teamDamage: 0, teamDps: 0, ...` when no sim has run), and
//   - bakery-bot's /teams and /roster commands (render with damage 0 from the
//     decoded build + character metadata).
// Driving src/engine/ for real numbers was rejected: faithfully mapping a
// SlotBuild (OL line strings, doll rarity/level, gear stats, cores, lambda
// stages, modes) into an engine config means replicating several hundred lines
// of App.tsx build→sim plumbing against a PROTECTED engine — high divergence
// risk, and wrong damage numbers on a watermarked, content-addressed,
// immutable-cached image are far worse than the established no-numbers
// composition card. If real numbers are wanted later, add them as a NEW card
// variant (and bump RENDERER_VERSION in api.ts) rather than changing what an
// existing cached URL means.
import { createCanvas, type Canvas } from '../infographics/node/render.js';
import {
  CARD_W,
  cardHeight,
  rosterCardHeight,
  drawTeamCard,
  drawRosterCard,
  loadPortrait,
  type Canvas2DLike,
  type TeamCardMeta,
  type TeamCardUnit,
  type RosterCardTeam,
} from '../infographics/node/render.js';
import type { Build, UnionBossBuild } from '../share/build-code.js';
import { unitHasElement } from '../elements.js';
import type { Element } from '../types.js';

// The character metadata the cards need, from data/characters.json (READ-only).
export interface CardCharacter {
  slug: string;
  name: string;
  element: Element;
  weapon: string;
  burst: string;
  countsAsElements?: Element[];
}

const SCALE = 2; // retina, same as build-infographics.ts

// ---- input bounds (the render API is UNAUTHENTICATED — plan §6.3/§6.4) ------
// decodeBuild() only checks the envelope (v/g/s.length); everything below is
// attacker-controlled until proven otherwise. The roster grid in the web app is
// exactly 5 teams × 5 slots, so anything larger is a garbage code, not an edge
// case — before this cap a 655-char code allocated a 2080×29228 canvas
// (243 MB RGBA) and the 4096-char code cap allowed ~1.6 GB from ONE GET.
export const MAX_ROSTER_TEAMS = 5;
// Hard pixel backstop on canvas allocation, checked BEFORE createCanvas even
// after the shape caps above (defense in depth — a future card variant must
// not get to size a canvas from unvalidated input). The biggest legit card
// (5-team roster at scale 2) is 2080×1456 ≈ 3.0 Mpx; 12 Mpx is ~4× headroom.
export const MAX_CANVAS_PIXELS = 12_000_000;

const isSlug = (v: unknown): v is string | null =>
  v === null || typeof v === 'string';

const checkPixels = (w: number, h: number): string | null =>
  w * h > MAX_CANVAS_PIXELS ? 'card exceeds the pixel budget' : null;

// Validate the DECODED build for rendering. Returns an error string for the
// 400 response, or null when the build is safe to render. decodeBuild's null
// case is handled by the caller; this covers everything decodeBuild doesn't.
export function cardBuildError(
  build: Build,
  type: 'team' | 'roster'
): string | null {
  for (const s of build.s) {
    if (!s || typeof s !== 'object' || !isSlug(s.slug)) {
      return 'invalid slot';
    }
  }
  if (type === 'team') {
    if (!build.s.some((s) => s.slug)) {
      return 'build has no units';
    }
    return checkPixels(
      CARD_W * SCALE,
      cardHeight(build.s.filter((s) => s.slug).length) * SCALE
    );
  }
  const roster = build.roster;
  if (!Array.isArray(roster) || roster.length === 0) {
    return 'build has no roster';
  }
  if (roster.length > MAX_ROSTER_TEAMS) {
    return `roster has ${roster.length} teams (max ${MAX_ROSTER_TEAMS})`;
  }
  for (const team of roster) {
    if (!Array.isArray(team) || team.length > 5 || !team.every(isSlug)) {
      return 'invalid roster team';
    }
  }
  return checkPixels(CARD_W * SCALE, rosterCardHeight(roster.length) * SCALE);
}

const FALLBACK_CHAR = (slug: string | null): CardCharacter => ({
  slug: slug ?? '???',
  name: slug ?? '???',
  element: 'Iron',
  weapon: '?',
  burst: '?',
});

function coreLabel(g: {
  core: number;
  coreCustom: boolean;
  coreCustomVal: string;
}): string {
  return g.coreCustom
    ? `${g.coreCustomVal}% core`
    : `${Math.round(g.core * 100)}% core`;
}

function metaFor(
  build: Build,
  icon: Canvas | null,
  footer: string
): TeamCardMeta {
  return {
    weakness: build.g.weakness,
    level: Number(build.g.level) || 400,
    coreLabel: coreLabel(build.g),
    icon: icon ?? undefined,
    footer,
  };
}

// Compact per-team boss-options label for union rosters — ported from
// web/src/App.tsx unionBossLabel ("Fire-weak · DEF 140 · 100% core").
function unionBossLabel(o: UnionBossBuild): string {
  const parts: string[] = [];
  parts.push(o.weakness ? `${o.weakness}-weak` : 'no element');
  const def = Number(o.bossDef) || 0;
  if (def) {
    parts.push(`DEF ${def}`);
  }
  if (o.bossRange) {
    parts.push(o.bossRange);
  }
  parts.push(coreLabel(o));
  return parts.join(' · ');
}

// Render the team composition card for a decoded build at scale 2. Units are
// the build's non-null slots in slot order (mirrors the web's teambuilder card).
export async function renderTeamCardPng(
  build: Build,
  chars: Record<string, CardCharacter>,
  icon: Canvas | null
): Promise<Buffer> {
  const units: TeamCardUnit[] = await Promise.all(
    build.s
      .filter((s) => s.slug)
      .map(async (s) => {
        const c = (s.slug && chars[s.slug]) || FALLBACK_CHAR(s.slug);
        return {
          name: c.name,
          burst: c.burst,
          weapon: c.weapon,
          element: c.element,
          // every element the unit counts as (a kit can grant a second code's
          // advantage — src/elements.ts), matching the web's marker logic
          advantaged: build.g.weakness
            ? unitHasElement(c, build.g.weakness)
            : false,
          share: 0, // no sim — see the module header for the decision
          totalDamage: 0,
          img: s.slug ? ((await loadPortrait(s.slug)) ?? undefined) : undefined,
        };
      })
  );
  const w = CARD_W * SCALE;
  const h = cardHeight(units.length) * SCALE;
  // Hard backstop — cardBuildError already checked this, but a renderer must
  // never size a canvas from input that didn't pass through it.
  if (w * h > MAX_CANVAS_PIXELS) {
    throw new Error(`team card ${w}×${h} exceeds the pixel budget`);
  }
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.scale(SCALE, SCALE);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  drawTeamCard(
    ctx as unknown as Canvas2DLike,
    { teamDamage: 0, teamDps: 0, fullBursts: 0, fullBurstUptime: 0, units },
    metaFor(build, icon, 'nikkesim.app/teambuilder')
  );
  return canvas.toBuffer('image/png');
}

// Render the roster (multi-team) composition card. `build.roster` is teams × 5
// slugs sharing the loadout in `s`; union mode adds per-team boss labels and
// the union title (mirrors the web's onRosterSimCopyImage union branch).
export async function renderRosterCardPng(
  build: Build,
  chars: Record<string, CardCharacter>,
  icon: Canvas | null
): Promise<Buffer> {
  const roster = build.roster ?? [];
  const union = build.rosterMode === 'union';
  const teams: RosterCardTeam[] = await Promise.all(
    roster.map(async (teamSlugs, i) => ({
      teamDamage: 0, // no sim — see the module header for the decision
      bossLabel: union
        ? unionBossLabel(
            build.unionBoss?.[i] ?? {
              weakness: null,
              bossDef: '0',
              core: 0,
              coreCustom: false,
              coreCustomVal: '10',
            }
          )
        : undefined,
      units: await Promise.all(
        teamSlugs
          .filter((s): s is string => !!s)
          .map(async (slug) => {
            const c = chars[slug] || FALLBACK_CHAR(slug);
            return {
              name: c.name,
              element: c.element,
              img: (await loadPortrait(slug)) ?? undefined,
            };
          })
      ),
    }))
  );
  const w = CARD_W * SCALE;
  const h = rosterCardHeight(teams.length) * SCALE;
  // Hard backstop — see renderTeamCardPng.
  if (w * h > MAX_CANVAS_PIXELS) {
    throw new Error(`roster card ${w}×${h} exceeds the pixel budget`);
  }
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.scale(SCALE, SCALE);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  drawRosterCard(
    ctx as unknown as Canvas2DLike,
    {
      totalDamage: 0,
      teams,
      title: union ? 'NIKKE Solo Raid Sim · Union Raid' : undefined,
    },
    metaFor(build, icon, 'nikkesim.app/roster')
  );
  return canvas.toBuffer('image/png');
}
