// Shared-config resolution: a config id → the saved {build, results} payload.
//
// WHERE THE ID LIVES (owner ruling 2026-07-28, question 2(a)): in bakery-bot's
// existing `user_profiles` store, behind `GET /api/profiles/:id/public`. That
// store is already kind-tagged and payload-opaque, the sim already saves to it,
// and saving already returns an id — the only new thing on that side is the
// unauthenticated read, which is ALLOWLISTED BY KIND so only the share kind
// (SHARED_CONFIG_PROFILE_KIND) is world-readable and a user's private profiles
// stay private. The alternative (a `shared_configs` table owned by this server)
// was rejected: this process has no database layer at all today.
//
// The id is an opaque handle in a URL a stranger can craft, so this module
// treats every response as hostile: the id shape is validated before it reaches
// a URL, the request is time-boxed, the body is byte-capped, and the payload
// goes through the shared-config codec's total decoder. A failure here is a
// 404/400 on the render route, never a 500 and never a partial card.
import {
  decodeSharedConfig,
  SHARED_CONFIG_PROFILE_KIND,
  type SharedConfig,
} from '../share/shared-config.js';

// bakery-bot's origin — the same backend web/src/auth.ts talks to. Overridable
// so a test (or a staging deploy) can point at a local stub.
export const CONFIG_API_ORIGIN =
  process.env.NIKKESIM_CONFIG_API ??
  'https://appweb-production-a479.up.railway.app';

// The public site, used to build the PAGE url handed back beside the image url
// (question 3: the bot needs both — an embed image and a clickable link).
export const SITE_ORIGIN = (
  process.env.NIKKESIM_SITE_ORIGIN ?? 'https://nikkesim.app'
).replace(/\/+$/, '');

// bakery-bot ids are uuids (`user_profiles.id` — uuid primaryKey). Anything
// else never becomes a URL: this string is interpolated into a request path.
const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isConfigId = (v: unknown): v is string =>
  typeof v === 'string' && ID_RE.test(v);

// A saved config is a few KB; the store caps `code` at 8192 chars, so a body an
// order of magnitude past that is not a config.
const MAX_BODY_BYTES = 64 * 1024;
const FETCH_TIMEOUT_MS = 5_000;

// The page a config opens on — the app's own CANONICAL tab paths (web/src/App.tsx
// TAB_PATHS: the Team Sim is `/`, the Roster Sim `/rostersim`). The id is read
// at boot and applied like a `?b=` build, so this URL is the short, durable
// replacement for the ~3.3 KB one.
export function configPageUrl(kind: SharedConfig['kind'], id: string): string {
  return `${SITE_ORIGIN}${kind === 'roster' ? '/rostersim' : '/'}?id=${encodeURIComponent(id)}`;
}

// ---- the resolver ----------------------------------------------------------

interface Entry {
  at: number;
  cfg: SharedConfig | null; // null = a resolved MISS, cached briefly too
}

// A saved config is mutable (the store upserts by name), so this TTL is what
// bounds how long a re-save takes to show up. It is short because it only has
// to absorb the burst of a card being posted and immediately fetched by every
// Discord client; the rendered PNG itself is content-addressed, so a re-save
// mints a new image URL rather than mutating an old one.
const TTL_MS = 60_000;
const MAX_ENTRIES = 1_000;

export class ConfigStore {
  private readonly cache = new Map<string, Entry>();

  constructor(
    readonly origin: string = CONFIG_API_ORIGIN,
    // Injectable for tests — defaults to global fetch.
    private readonly doFetch: typeof fetch = fetch,
    readonly ttlMs: number = TTL_MS
  ) {}

  // The saved config behind an id, or null when the id is malformed, unknown,
  // not a shared kind, unreachable, or carries a payload this codec doesn't
  // recognize. Callers turn null into a 404 — the four cases are deliberately
  // indistinguishable from outside, so this endpoint can't be used to probe
  // which ids exist.
  async get(id: string): Promise<SharedConfig | null> {
    if (!isConfigId(id)) {
      return null;
    }
    const hit = this.cache.get(id);
    if (hit && Date.now() - hit.at < this.ttlMs) {
      return hit.cfg;
    }
    const cfg = await this.load(id);
    if (this.cache.size >= MAX_ENTRIES) {
      // Cheap bound: drop the oldest insertion. Map preserves insertion order,
      // and a re-set below moves the entry to the end, so this is an LRU by
      // write time — enough for a 1k-entry, 60s-TTL memo.
      const oldest = this.cache.keys().next();
      if (!oldest.done) {
        this.cache.delete(oldest.value);
      }
    }
    this.cache.delete(id);
    this.cache.set(id, { at: Date.now(), cfg });
    return cfg;
  }

  private async load(id: string): Promise<SharedConfig | null> {
    try {
      const res = await this.doFetch(
        `${this.origin}/api/profiles/${id}/public`,
        {
          headers: { accept: 'application/json' },
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        }
      );
      if (!res.ok) {
        return null;
      }
      const raw = await res.text();
      if (raw.length > MAX_BODY_BYTES) {
        return null;
      }
      const body = JSON.parse(raw) as { kind?: unknown; code?: unknown };
      // The kind allowlist is enforced on bakery-bot's side; re-checking here
      // means a misconfigured (or future, more permissive) endpoint still
      // can't feed this renderer a profile that was never meant to be public.
      if (
        body?.kind !== SHARED_CONFIG_PROFILE_KIND ||
        typeof body.code !== 'string'
      ) {
        return null;
      }
      return decodeSharedConfig(body.code);
    } catch {
      // Timeout, DNS, non-JSON, anything: an unresolvable id is a 404, not a
      // 500 — the render routes are anonymous and must not surface backend
      // failures as server errors.
      return null;
    }
  }
}
