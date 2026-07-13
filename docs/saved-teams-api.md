# Saved teams — backend API contract (bakery-bot)

The sim site's login + save-team + "My teams" UI is built and wired
(`web/src/auth.ts`, behind `AUTH_ENABLED` in `App.tsx`). It's flag-OFF until
this backend exists in bakery-bot's `@app/web` (Next.js). Flip `AUTH_ENABLED` to
`true` once these endpoints are live, and set `VITE_API_BASE` on the nikke-sim
Railway service to the API origin (defaults to
`https://appweb-production-a479.up.railway.app`).

## Auth model
The sim site is a **different origin** from the API, so we use **bearer tokens**,
not cross-site cookies (Safari/Chrome block third-party cookies):

1. Site sends the user to `GET /auth/discord/login?return_to=<site-url>`.
2. Backend redirects to Discord's authorize URL (scope `identify`, the
   `redirect_uri` = the backend callback registered in the Discord portal).
3. Discord → `GET /auth/discord/callback?code=...`. Backend exchanges the code
   (with `OAUTH_CLIENT_ID` + `OAUTH_CLIENT_SECRET`), fetches
   `GET https://discord.com/api/users/@me`, upserts the user, and mints a
   **session token** (JWT signed with a server secret, or an opaque token in a
   `sessions` table).
4. Backend redirects to `return_to#nsat=<token>`. The site reads the token from
   the URL fragment, stores it in localStorage, and scrubs the URL. (Fragment,
   not query — it never hits a server or the Referer header.)
5. Every API call sends `Authorization: Bearer <token>`.

`return_to` must be validated against an allowlist (e.g. `https://nikkesim.app`,
`https://www.nikkesim.app`, the railway URL, and `http://localhost:*` for dev) to
prevent open-redirect / token exfiltration.

## Endpoints

| Method | Path | Auth | Body | Returns |
|--------|------|------|------|---------|
| GET | `/auth/discord/login?return_to=<url>` | — | — | 302 → Discord authorize |
| GET | `/auth/discord/callback?code=…` | — | — | 302 → `return_to#nsat=<token>` |
| GET | `/api/me` | Bearer | — | `{ id, username, avatar? }` or 401 |
| GET | `/api/teams` | Bearer | — | `SavedTeam[]` |
| POST | `/api/teams` | Bearer | `{ name, code }` | `SavedTeam` |
| DELETE | `/api/teams/:id` | Bearer | — | 204 |

```ts
type SavedTeam = { id: string; name: string; code: string; updatedAt: string };
```

- `code` is the opaque **build-code** (`src/share/build-code.ts` — versioned
  base64url of the full team + loadout + boss globals). The backend stores it as
  a string; it never needs to parse it. The bot decodes it with the same module
  to re-sim + render.
- **POST is an upsert by `(discord_id, name)`** — saving with an existing name
  overwrites (the UI's "Save team" prompts for a name, defaulting to the first
  two nikkes). If you'd rather always-create, drop the unique constraint; the UI
  handles either.
- 401 on any endpoint → the site clears the token and shows "Log in with
  Discord" again.

## Storage
bakery-bot already has Postgres (`@app/db`). Add:

```sql
create table user_teams (
  id          uuid primary key default gen_random_uuid(),
  discord_id  text not null,
  name        text not null,
  code        text not null,
  updated_at  timestamptz not null default now(),
  unique (discord_id, name)
);
create index on user_teams (discord_id);
```

## CORS
The API must allow the sim origins with credentials off (bearer, not cookies):
```
Access-Control-Allow-Origin: https://nikkesim.app   (echo the request Origin if in the allowlist)
Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type
```
Handle `OPTIONS` preflight for `/api/*`.

## Env (bakery-bot)
Already present in `.env`: `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`,
`DATABASE_URL`. Add a `SESSION_SECRET` (JWT signing) and set the Discord portal
redirect URI to this service's `/auth/discord/callback` (see the portal steps I
gave earlier).

## Bot side (later)
`/myteams` slash command: look up `user_teams` for the invoking Discord id →
present the list → on pick, `decodeBuild(code)` → `runSim` → `drawTeamCard`
(`@napi-rs/canvas`) → post the PNG. Same build-code + same renderer as the site.
