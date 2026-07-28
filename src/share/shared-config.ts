// Shareable saved-config codec — the payload behind an id-based share link
// (`nikkesim.app/?id=<id>` for a team, `/rostersim?id=<id>` for a roster;
// `/api/v1/img/team.png?id=<id>` for the card).
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
// API hands back (`/` vs `/rostersim`, the app's canonical tab paths) and
// which card renderer runs.
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

// Real slugs are short kebab-case. The bound matters because a slug flows
// verbatim into the render cache KEY and the on-disk spec sidecar, so an
// unbounded one is unbounded key material — the structural caps below already
// limit the count, this limits the size.
const MAX_SLUG_LEN = 64;

const unit = (v: unknown): SharedUnitResult => {
  const o = (v ?? {}) as Record<string, unknown>;
  return {
    slug: typeof o.slug === 'string' ? o.slug.slice(0, MAX_SLUG_LEN) : null,
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

// ---- the two derived views of a snapshot ------------------------------------

// The DAY a snapshot was simmed — the only part of `at` that is ever drawn
// (the card footers "simmed <date>"). Exported so the renderer and the render
// CACHE KEY derive it from one place: if the key normalized `at` differently
// from the way the footer renders it, two snapshots could share a content
// address and draw different footers, which is the one failure direction a
// content address must never have. Returns null for an unparseable stamp — the
// payload is public and untrusted, so a bad date is dropped, not printed.
//
// ⚠ If a renderer ever starts drawing more of `at` than the day (a time, a
// timezone), this function must widen with it — it IS the contract.
export function simmedDay(at: string | undefined): string | null {
  const t = at ? Date.parse(at) : Number.NaN;
  return Number.isFinite(t) ? new Date(t).toISOString().slice(0, 10) : null;
}

// The IDENTITY of a share — everything that makes two shares "the same share",
// which is deliberately NOT the encoded payload: `at` moves on every click, so
// hashing the payload would make a re-share of an unchanged config look new.
// The web names its share rows after this (web/src/App.tsx shareName), and the
// profile store upserts by name, so a stable identity is what keeps re-sharing
// idempotent instead of burning a row (and a slot against the store's
// 100-per-kind cap) every time the button is pressed.
//
// The day IS part of the identity — it is drawn on the card, so two shares that
// differ only by day are genuinely different pictures.
export function sharedConfigIdentity(cfg: SharedConfig): string {
  const r = cfg.results;
  return JSON.stringify({
    k: cfg.kind,
    b: cfg.build,
    r: r ? { ...r, at: simmedDay(r.at) ?? '' } : null,
  });
}

// The profile NAME a share is stored under, from its identity above. The
// profile store upserts by (user, kind, name), so naming a share after its
// content is what makes re-sharing an unchanged config idempotent: it reuses
// the one row and the one link instead of minting another on every press. That
// matters because the store caps a user at 100 profiles per kind, and sharing
// is exactly the kind of thing people do repeatedly.
//
// Two 32-bit lanes (≈2^64 of space) — a collision would silently repoint
// someone else's existing link, so one 32-bit lane is not enough here.
export function shareProfileName(identity: string): string {
  let a = 0x811c9dc5;
  let b = 0x01000193;
  for (let i = 0; i < identity.length; i++) {
    const c = identity.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193) >>> 0;
    b = Math.imul(b + c, 0x85ebca6b) >>> 0;
  }
  const hex = (n: number) => n.toString(16).padStart(8, '0');
  return `share-${hex(a)}${hex(b)}`;
}

// The bakery-bot `user_profiles.kind` this codec owns. Kind-scoping is what
// makes the public read path safe: bakery-bot serves an unauthenticated
// GET /api/profiles/:id/public ONLY for kinds on its allowlist, so a user's
// private profiles (their include/exclude Nikke lists) stay unreadable while a
// config they deliberately shared is world-readable by its unguessable id.
export const SHARED_CONFIG_PROFILE_KIND = 'sim-share';
