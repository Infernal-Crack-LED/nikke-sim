// Client for the bakery-bot auth + saved-teams API. The sim site is a separate
// origin from the API, so we use bearer-token auth (not cross-site cookies):
// after Discord OAuth the backend redirects back with `#nsat=<token>` in the
// fragment, we stash it in localStorage and send it as `Authorization: Bearer`.
//
// Backend contract (implemented in bakery-bot @app/web) — see
// docs/saved-teams-api.md:
//   GET  /auth/discord/login?return_to=<url>  -> 302 to Discord authorize
//   GET  /auth/discord/callback?code=...      -> 302 to <return_to>#nsat=<jwt>
//   GET  /api/me            (Bearer) -> { id, username, avatar? } | 401
//   GET  /api/teams         (Bearer) -> SavedTeam[]
//   POST /api/teams         (Bearer) { name, code } -> SavedTeam   (upsert by name)
//   DELETE /api/teams/:id   (Bearer) -> 204

export const API_BASE: string =
  (import.meta as any).env?.VITE_API_BASE ??
  'https://appweb-production-a479.up.railway.app';

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
  return `${API_BASE}/auth/discord/login?return_to=${encodeURIComponent(returnTo)}`;
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

export const fetchMe = () => api<AuthUser>('/api/me');
export const fetchTeams = () => api<SavedTeam[]>('/api/teams');
export const saveTeam = (name: string, code: string) =>
  api<SavedTeam>('/api/teams', {
    method: 'POST',
    body: JSON.stringify({ name, code }),
  });
export const deleteTeam = (id: string) =>
  api<void>(`/api/teams/${encodeURIComponent(id)}`, { method: 'DELETE' });
