// Build code → card data mapping for the dynamic render routes.
//
// DECISION (Phase 3): a build code carries a SELECTION, not a result, so a card
// rendered from one alone shows the picks and the boss/level/core line and no
// damage numbers — the COMPOSITION card. Driving src/engine/ server-side for
// real numbers was rejected then and again on 2026-07-28 (question 1): mapping
// a SlotBuild (OL line strings, doll rarity/level, gear stats, cores, lambda
// stages, modes) into an engine config means replicating several hundred lines
// of App.tsx build→sim plumbing against a PROTECTED engine — high divergence
// risk — and it would put the whole engine in the server bundle and seconds of
// cold render on one instance.
//
// WHAT CHANGED (2026-07-28, owner ruling question 1(a)): the numbers can now
// arrive WITH the request, as a snapshot the browser computed and a shared
// config stored (src/share/shared-config.ts). So there are two cards, chosen by
// whether the caller supplied results — never by a server-side sim:
//   results absent  → the composition card (drawTeamCompositionCard /
//                     drawRosterCompositionCard): picks + boss/level/core only,
//                     never a zeroed damage/DPS/total line (owner ruling
//                     2026-07-28, extended to rosters 2026-07-29 — a zeroed
//                     roster card previously read as "your teams do no
//                     damage" instead of "no sim data").
//   results present → the full card (drawTeamCard: total, DPS, full bursts,
//                     per-unit bars / drawRosterCard with real team bars), the
//                     SAME renderers the web's own results share card uses.
// The snapshot is stamped into the watermark footer ("simmed <date>") because a
// stored number does not track engine changes — see the shared-config header.
import { createCanvas, type Canvas } from '../infographics/node/render.js';
import {
  CARD_W,
  cardHeight,
  compositionCardHeight,
  drawTeamCard,
  drawTeamCompositionCard,
  rosterCardHeight,
  rosterCompositionCardHeight,
  drawRosterCard,
  drawRosterCompositionCard,
  loadPortrait,
  type Canvas2DLike,
  type TeamCardMeta,
  type TeamCardUnit,
  type RosterCardTeam,
} from '../infographics/node/render.js';
import type { Build, UnionBossBuild } from '../share/build-code.js';
import { simmedDay, type SharedResults } from '../share/shared-config.js';
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
  // Table routes only (data/characters.json flat fields):
  ammo?: number; // base magazine (bot: roleWeapon.shot_detail.max_ammo)
  chargeFrames?: number; // = round(charge_time/100*60) — the bot's baseFrames
  // The datamined role blob, read ONLY for role.weapon.shot_detail.input_type
  // (tableData's chargeLatencyFrames — autofire charge weapons fire on press
  // and take no release latency).
  role?: { weapon?: unknown } | null;
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
  type: 'team' | 'roster',
  // Which team card the build will render as — the two layouts have different
  // heights, so the pixel backstop must check the one that will actually be
  // allocated (see the module header).
  hasResults = false
): string | null {
  for (const s of build.s) {
    if (!s || typeof s !== 'object' || !isSlug(s.slug)) {
      return 'invalid slot';
    }
  }
  if (type === 'team') {
    const units = build.s.filter((s) => s.slug).length;
    if (units === 0) {
      return 'build has no units';
    }
    return checkPixels(
      CARD_W * SCALE,
      (hasResults ? cardHeight(units) : compositionCardHeight()) * SCALE
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
  return checkPixels(
    CARD_W * SCALE,
    (hasResults
      ? rosterCardHeight(roster.length)
      : rosterCompositionCardHeight(roster.length)) * SCALE
  );
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

// The date a stored snapshot was simmed, as it appears in the footer. A stored
// number does not follow engine changes, so every card drawn from one says when
// it was produced (shared-config.ts header). The day comes from `simmedDay` —
// the SAME function the render cache key normalizes with, so the key can never
// dedupe two snapshots that would draw different footers.
function simmedStamp(results?: SharedResults): string {
  const day = simmedDay(results?.at);
  return day ? ` · simmed ${day}` : '';
}

function metaFor(
  build: Build,
  icon: Canvas | null,
  footer: string,
  results?: SharedResults
): TeamCardMeta {
  return {
    weakness: build.g.weakness,
    level: Number(build.g.level) || 400,
    coreLabel: coreLabel(build.g),
    icon: icon ?? undefined,
    footer: `${footer}${simmedStamp(results)}`,
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
  icon: Canvas | null,
  // The stored sim snapshot, when the request carried one (a shared config).
  // Its `teams[0]` is this team; per-unit entries line up with the build's
  // non-null slots IN SLOT ORDER, which is how the web writes them.
  results?: SharedResults
): Promise<Buffer> {
  const slots = build.s.filter((s) => s.slug);
  const perUnit = results?.teams[0]?.units ?? [];
  const units: TeamCardUnit[] = await Promise.all(
    slots.map(async (s, i) => {
      const c = (s.slug && chars[s.slug]) || FALLBACK_CHAR(s.slug);
      // Positional by default, but prefer a slug match when the snapshot
      // carries one: a saved config outlives the roster it was saved from, and
      // silently attributing one unit's damage to another is the worst
      // failure this card has.
      const r =
        perUnit.find((u) => u.slug && u.slug === s.slug) ??
        (perUnit[i]?.slug ? undefined : perUnit[i]);
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
        share: r?.share ?? 0,
        totalDamage: r?.damage ?? 0,
        img: s.slug ? ((await loadPortrait(s.slug)) ?? undefined) : undefined,
      };
    })
  );
  const team = results?.teams[0];
  const w = CARD_W * SCALE;
  const h = (team ? cardHeight(units.length) : compositionCardHeight()) * SCALE;
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
  const meta = metaFor(build, icon, 'nikkesim.app/teambuilder', results);
  if (team) {
    // A shared config HAS a sim behind it — the same full card the web's own
    // results share button renders.
    drawTeamCard(
      ctx as unknown as Canvas2DLike,
      {
        teamDamage: team.damage,
        teamDps: team.dps,
        fullBursts: team.fullBursts,
        fullBurstUptime: team.fullBurstUptime,
        units,
      },
      meta
    );
  } else {
    // The COMPOSITION layout: a team builder output has no sim behind it, so
    // the card shows the picks and the boss/level/core selection — never a
    // zeroed damage/DPS/full-burst line (owner ruling 2026-07-28).
    drawTeamCompositionCard(ctx as unknown as Canvas2DLike, { units }, meta);
  }
  return canvas.toBuffer('image/png');
}

// Render the roster (multi-team) composition card. `build.roster` is teams × 5
// slugs sharing the loadout in `s`; union mode adds per-team boss labels and
// the union title (mirrors the web's onRosterSimCopyImage union branch).
export async function renderRosterCardPng(
  build: Build,
  chars: Record<string, CardCharacter>,
  icon: Canvas | null,
  // Stored snapshot; `teams[i]` is roster row i (the web writes them in grid
  // order). A shorter snapshot than the roster leaves the extra rows at zero
  // rather than mis-attributing — the bars are scaled to the max, so a wrong
  // row would visibly rank teams wrongly.
  results?: SharedResults
): Promise<Buffer> {
  const roster = build.roster ?? [];
  const union = build.rosterMode === 'union';
  const hasResults = !!results?.teams?.length;
  const teams: RosterCardTeam[] = await Promise.all(
    roster.map(async (teamSlugs, i) => ({
      teamDamage: results?.teams[i]?.damage ?? 0,
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
  const h =
    (hasResults
      ? rosterCardHeight(teams.length)
      : rosterCompositionCardHeight(teams.length)) * SCALE;
  // Hard backstop — see renderTeamCardPng.
  if (w * h > MAX_CANVAS_PIXELS) {
    throw new Error(`roster card ${w}×${h} exceeds the pixel budget`);
  }
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.scale(SCALE, SCALE);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const title = union ? 'NIKKE Solo Raid Sim · Union Raid' : undefined;
  const meta = metaFor(build, icon, 'nikkesim.app/roster', results);
  if (hasResults) {
    // A shared config HAS a sim behind it — real per-team bars.
    drawRosterCard(
      ctx as unknown as Canvas2DLike,
      {
        // The stored grand total is not trusted over the rows it is a total
        // of — the rendered bars and the headline number must agree, and
        // only the rows above reached the card.
        totalDamage: teams.reduce((sum, t) => sum + t.teamDamage, 0),
        teams,
        title,
      },
      meta
    );
  } else {
    // The COMPOSITION layout: no sim behind this build code, so the card
    // shows the teams as PICKED — never a zeroed damage bar or a "0 total
    // damage" headline (owner ruling 2026-07-28, extended to rosters).
    drawRosterCompositionCard(
      ctx as unknown as Canvas2DLike,
      { teams, title },
      meta
    );
  }
  return canvas.toBuffer('image/png');
}
