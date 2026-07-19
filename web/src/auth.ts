// Client for the bakery-bot auth + saved-teams API. The sim site is a separate
// origin from the API, so we use bearer-token auth (not cross-site cookies):
// after Discord OAuth the backend redirects back with `#nsat=<token>` in the
// fragment, we stash it in localStorage and send it as `Authorization: Bearer`.
//
// Backend contract (implemented in bakery-bot @app/web) — see
// docs/handoffs/closed/saved-teams-api.md:
//   GET  /auth/discord/login?return_to=<url>  -> 302 to Discord authorize
//   GET  /auth/discord/callback?code=...      -> 302 to <return_to>#nsat=<jwt>
//   GET  /api/me            (Bearer) -> { id, username, avatar? } | 401
//   GET  /api/teams         (Bearer) -> SavedTeam[]
//   POST /api/teams         (Bearer) { name, code } -> SavedTeam   (upsert by name)
//   DELETE /api/teams/:id   (Bearer) -> 204

// The real backend origin. In production the sim is a separate origin from the
// API and relies on the backend CORS-allowlisting the sim's origin.
export const BACKEND_ORIGIN: string =
  (import.meta as any).env?.VITE_API_BASE ??
  'https://appweb-production-a479.up.railway.app';

// What we actually prefix onto `/api/...` fetches. In `vite` dev the browser
// origin (localhost:5173) is NOT in the backend's CORS allowlist, so we send API
// calls same-origin ('') and let Vite's dev proxy (vite.config.ts) forward them
// to BACKEND_ORIGIN server-side — no CORS. In production we hit the backend
// directly. Full-navigation URLs (OAuth login) still use BACKEND_ORIGIN.
export const API_BASE: string = (import.meta as any).env?.DEV ? '' : BACKEND_ORIGIN;

const TOKEN_KEY = 'nikke-sim.auth';

export interface AuthUser {
  id: string;
  username: string;
  avatar?: string | null;
}
export interface SavedTeam {
  id: string;
  name: string;
  code: string; // build-code (see src/share/build-code.ts)
  updatedAt: string;
}

// ---- NIKKE roster sync (blablalink) — see docs/handoffs roster-sync contract ----
// One owned unit as returned by the roster summary list.
export interface RosterCharacter {
  name_code: number;
  combat: number;
  lv: number;
  grade: number;
  core: number;
  costume_id: number;
}
// One rolled Overload line, normalized by the backend to a label the sim already
// recognizes (the `name` fields in data/ol-lines.json).
export interface SyncedOlLine {
  label: string; // e.g. "Increase ATK"
  value: number; // rolled % value
}
// A unit's actual synced build, normalized by the backend from blablalink detail.
// See docs/handoffs/2026-07-18-synced-roster-stats-backend-contract.md.
export interface SyncedUnitLoadout {
  nameCode: number;
  grade: number; // Limit Break stars 0-3
  core: number; // core enhancement 0-7
  bond?: number; // bond / attractive level
  level?: number; // this unit's own level (syncLevel fallback)
  skills?: { skill1: number; skill2: number; burst: number };
  cube?: { name: string; level: number } | null;
  ol?: SyncedOlLine[];
  gearTier?: string;
}
export interface RosterResponse {
  source: 'db' | 'live';
  openId: string;
  count: number;
  characters: RosterCharacter[];
  details?: unknown[]; // present only when details=1
  syncLevel?: number; // account-wide synchro level (details=1)
  syncedLoadouts?: SyncedUnitLoadout[]; // per-unit normalized build (details=1)
  syncedAt: string;
}
// A blablalink account the user has synced — current one first, then history.
export interface NikkeAccount {
  id: string;
  openId: string;
  label: string | null;
  current: boolean;
  createdAt: string;
  updatedAt: string;
  syncedAt: string | null;
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
function setToken(t: string) {
  try {
    localStorage.setItem(TOKEN_KEY, t);
  } catch {
    /* storage unavailable */
  }
}
export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

// On load, pull a token out of the `#nsat=` fragment the callback redirects to,
// persist it, and scrub it from the URL so it doesn't linger in history.
export function captureTokenFromUrl(): void {
  const hash = window.location.hash;
  if (!hash.includes('nsat=')) return;
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const t = params.get('nsat');
  if (t) {
    setToken(t);
    params.delete('nsat');
    const rest = params.toString();
    const url =
      window.location.pathname + window.location.search + (rest ? `#${rest}` : '');
    window.history.replaceState(null, '', url);
  }
}

export function loginUrl(): string {
  const returnTo = window.location.origin + window.location.pathname;
  // A top-level browser navigation (not a fetch) — must target the real backend
  // origin, not the dev proxy, so the OAuth round-trip works in dev and prod.
  return `${BACKEND_ORIGIN}/auth/discord/login?return_to=${encodeURIComponent(returnTo)}`;
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (res.status === 401) {
    clearToken();
    throw new Error('unauthorized');
  }
  if (!res.ok) throw new Error(`api ${res.status}`);
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

// Richer error than the bare `api` helper throws: the roster endpoints need the
// HTTP status (401/400/429/502/500) AND the parsed body (retryAfterSec, blabla
// code/msg) to drive the right UX — a private roster (502) vs a rate limit (429)
// vs bad input (400). `api` collapses all of these to `api <status>`, so the
// roster calls use `apiEx` instead.
export class ApiError extends Error {
  status: number;
  body: any;
  constructor(status: number, body: any) {
    super((body && body.error) || `api ${status}`);
    this.status = status;
    this.body = body;
  }
}
async function apiEx<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  let body: any = null;
  try {
    body = res.status === 204 ? null : await res.json();
  } catch {
    /* non-JSON body — leave null */
  }
  if (res.status === 401) clearToken();
  if (!res.ok) throw new ApiError(res.status, body);
  return body as T;
}

export const fetchMe = () => api<AuthUser>('/api/me');
export const fetchTeams = () => api<SavedTeam[]>('/api/teams');
export const saveTeam = (name: string, code: string) =>
  api<SavedTeam>('/api/teams', {
    method: 'POST',
    body: JSON.stringify({ name, code }),
  });
export const deleteTeam = (id: string) =>
  api<void>(`/api/teams/${encodeURIComponent(id)}`, { method: 'DELETE' });

// Roster sync: one call reads (DB-served) or force-refreshes (live) a roster and,
// on success, auto-links the open id as the user's current account. `openid`
// accepts a raw id, a "29080-<id>" string, or a full blablalink profile URL — the
// backend decodes it, so pass whatever the user pasted.
export const fetchRoster = (
  openid: string,
  opts: { details?: boolean; refresh?: boolean } = {},
) => {
  const p = new URLSearchParams({ openid });
  if (opts.details) p.set('details', '1');
  if (opts.refresh) p.set('refresh', '1');
  return apiEx<RosterResponse>(`/api/blabla-roster?${p.toString()}`);
};
// The user's linked accounts (current first, then history).
export const fetchNikkeAccounts = () =>
  apiEx<NikkeAccount[]>('/api/nikke-accounts');
// Explicitly make an account current / relabel it (sync already auto-links, so
// this is only for a switch-account / rename control).
export const setNikkeAccount = (openid: string, label?: string) =>
  apiEx<NikkeAccount[]>('/api/nikke-accounts', {
    method: 'POST',
    body: JSON.stringify(label ? { openid, label } : { openid }),
  });
// Forget an account (drop it from history).
export const deleteNikkeAccount = (openid: string) =>
  apiEx<{ ok: boolean }>(
    `/api/nikke-accounts?openid=${encodeURIComponent(openid)}`,
    { method: 'DELETE' },
  );

// Resolve the logged-in user's CURRENT account and return its full synced roster
// (with per-unit loadouts, DB-served → instant). Returns null if the user has no
// synced current account. Throws ApiError on transport failures. Used by the
// sim's "Synced Roster" preset.
export async function fetchCurrentSyncedRoster(): Promise<RosterResponse | null> {
  const accounts = await fetchNikkeAccounts();
  const current = accounts.find((a) => a.current && a.syncedAt);
  if (!current) return null;
  return fetchRoster(current.openId, { details: true });
}
