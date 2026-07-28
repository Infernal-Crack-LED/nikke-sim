// Shareable saved-config codec — the payload behind an id-based share link
// (`nikkesim.app/sim?id=<id>`, `/api/v1/img/team.png?id=<id>`).
//
// WHY IT WRAPS A BUILD CODE RATHER THAN REPLACING IT: a build code already
// carries the whole SELECTION — `g` holds the boss options (weakness, DEF,
// core, range, synchro level) and `s` holds the per-slot loadout (gear, OL,
// doll, cube, cores, skills). Nothing about the selections needed a new
// format. What a build code CANNOT carry is what a build code is by
// definition an input to: the sim's OUTPUT. That is the one thing this
// envelope adds.
//
// RESULTS ARE A SNAPSHOT, NOT A LIVE VALUE (owner ruling 2026-07-28, question
// 1(a)): the browser has already run the sim when the user saves, so it stores
// what it computed. The server never sims — it draws the stored numbers. The
// cost of that choice is staleness: an engine change does not move a saved
// config's numbers, so `at` is REQUIRED and the cards print it ("simmed
// <date>"), making a pre-patch card self-identifying rather than silently
// wrong. `engine` is optional and reserved for the day the repo grows a real
// engine-version stamp to compare against; today nothing produces one, and a
// fabricated constant nobody bumps would be worse than the date.
//
// Format: base64url(JSON(SharedConfig)) — the same URL/DB-safe shape as a
// build code, so it drops straight into bakery-bot's `user_profiles.code`
// column (opaque base64url blob, 8192-char cap; a union roster with results
// lands around 4 KB).
import { b64urlDecode, b64urlEncode } from './build-code.js';

export const SHARED_CONFIG_VERSION = 1;

// Which surface the config was saved from — decides the page URL the render
// API hands back (`/sim` vs `/rostersim`) and which card renderer runs.
export type SharedConfigKind = 'team' | 'roster';

// One unit's contribution within a team. `slug` is informational (the card
// draws names/portraits off the build code's slots); `share` is 0..1.
export interface SharedUnitResult {
  slug: string | null;
  damage: number;
  share: number;
}

export interface SharedTeamResult {
  damage: number;
  dps: number;
  fullBursts: number;
  fullBurstUptime: number; // 0..1
  units: SharedUnitResult[];
}

export interface SharedResults {
  at: string; // ISO timestamp of the sim run — see the module header
  engine?: string; // reserved: an engine-version stamp, when one exists
  total: number; // grand total across `teams` (roster) / the team total
  teams: SharedTeamResult[];
}

export interface SharedConfig {
  v: number;
  kind: SharedConfigKind;
  build: string; // a build code (src/share/build-code.ts)
  results?: SharedResults; // absent = a configuration with no sim behind it
}

export function encodeSharedConfig(cfg: SharedConfig): string {
  return b64urlEncode(JSON.stringify(cfg));
}

// ---- decode ----------------------------------------------------------------
// TOTAL and defensive: the blob comes back from a PUBLIC, unauthenticated read
// path and is then handed to a canvas renderer, so every field is attacker-
// shaped until proven otherwise. Anything malformed, wrong-versioned, or
// non-finite yields null / a dropped field rather than a NaN reaching a
// `fillText` (which draws "NaN" on a permanently-cached, content-addressed
// image). Numbers are clamped to finite non-negatives for the same reason.
const num = (v: unknown): number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0;

const unit = (v: unknown): SharedUnitResult => {
  const o = (v ?? {}) as Record<string, unknown>;
  return {
    slug: typeof o.slug === 'string' ? o.slug : null,
    damage: num(o.damage),
    share: Math.min(1, num(o.share)),
  };
};

const team = (v: unknown): SharedTeamResult => {
  const o = (v ?? {}) as Record<string, unknown>;
  return {
    damage: num(o.damage),
    dps: num(o.dps),
    fullBursts: num(o.fullBursts),
    fullBurstUptime: Math.min(1, num(o.fullBurstUptime)),
    units: Array.isArray(o.units) ? o.units.slice(0, 5).map(unit) : [],
  };
};

// A roster card is capped at MAX_ROSTER_TEAMS (5) by card-from-build.ts; this
// cap only has to keep a hostile payload from allocating without bound before
// that check runs.
const MAX_RESULT_TEAMS = 5;

export function normalizeSharedResults(v: unknown): SharedResults | undefined {
  if (!v || typeof v !== 'object') {
    return undefined;
  }
  const o = v as Record<string, unknown>;
  // `at` is the staleness signal the whole snapshot model rests on — a payload
  // without one is treated as having no results at all rather than as results
  // of unknown age.
  if (typeof o.at !== 'string' || !o.at) {
    return undefined;
  }
  const teams = Array.isArray(o.teams)
    ? o.teams.slice(0, MAX_RESULT_TEAMS).map(team)
    : [];
  if (teams.length === 0) {
    return undefined;
  }
  return {
    at: o.at.slice(0, 40),
    ...(typeof o.engine === 'string' ? { engine: o.engine.slice(0, 40) } : {}),
    total: num(o.total) || teams.reduce((s, t) => s + t.damage, 0),
    teams,
  };
}

// Returns null for anything malformed or of an unknown version — callers treat
// null as "unrecognized config" (the web falls back to an empty state, the API
// 400s).
export function decodeSharedConfig(code: string): SharedConfig | null {
  try {
    const obj = JSON.parse(b64urlDecode(code.trim())) as Record<
      string,
      unknown
    >;
    if (
      !obj ||
      typeof obj !== 'object' ||
      obj.v !== SHARED_CONFIG_VERSION ||
      typeof obj.build !== 'string' ||
      !obj.build ||
      (obj.kind !== 'team' && obj.kind !== 'roster')
    ) {
      return null;
    }
    const r = normalizeSharedResults(obj.results);
    return {
      v: SHARED_CONFIG_VERSION,
      kind: obj.kind,
      build: obj.build,
      ...(r ? { results: r } : {}),
    };
  } catch {
    return null;
  }
}

// The bakery-bot `user_profiles.kind` this codec owns. Kind-scoping is what
// makes the public read path safe: bakery-bot serves an unauthenticated
// GET /api/profiles/:id/public ONLY for kinds on its allowlist, so a user's
// private profiles (their include/exclude Nikke lists) stay unreadable while a
// config they deliberately shared is world-readable by its unguessable id.
export const SHARED_CONFIG_PROFILE_KIND = 'sim-share';
