# Front-end conventions — nikke-sim

> **Class: CURRENT-STATE** (see [CONVENTIONS.md](CONVENTIONS.md) → Doc hygiene). Freely
> rewritten when the code moves; stale content is deleted, not narrated.
>
> **Audience:** anyone — human or AI, any harness — writing or reviewing front-end code in
> `web/`. This doc is **binding**: where it and your instinct disagree, check the code, and
> if the code agrees with the doc, follow the doc.
>
> **Reuse:** this doc doubles as the website playbook for future projects. Each section
> states the _pattern_ first and the nikke-sim implementation second; §14 is the
> lift-out checklist for starting a new site from it.

---

## 1. Architecture

| Concern        | Approach                                                                                                                                                                      |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework      | React 18, functional components only, hooks only                                                                                                                              |
| Build          | Vite 5 (`@vitejs/plugin-react`), `root: 'web'`, output to repo-root `dist/`                                                                                                   |
| Language       | TypeScript strict (`web/tsconfig.json`); `npm run typecheck` checks web AND engine                                                                                            |
| Routing        | Custom SPA router (`web/src/router.ts`) — real URL **paths**, `pushState` + `popstate`. No React Router, never hash routing (§4)                                              |
| State          | `useState` / `useReducer` + prop drilling. No global store, no context for state                                                                                              |
| Styling        | One CSS file (`web/src/styles.css`, ~4,300 lines). No CSS modules, no Tailwind, no styled-components (§3)                                                                     |
| Data           | JSON imported directly at build time (`import charactersJson from '../../data/characters.json'`). The sim and all game data run **entirely client-side** — no data fetch (§8) |
| Heavy compute  | Web-worker pool (`simPool.ts` / `simWorker.ts`) for generators; the engine itself is plain imported TS                                                                        |
| Backends       | TWO: same-origin Hono server (static site + share-image API) and a cross-origin user-data API (auth/teams/roster). One API client: `web/src/auth.ts` (§8)                     |
| SEO / embeds   | Server-injected per-route meta + no-JS bodies, client head sync, JSON-LD, generated sitemap, robots/llms.txt (§6–7)                                                           |
| Share images   | One canvas renderer set (`src/infographics/`) drawn identically in browser and Node; content-addressed hosted URLs (§9)                                                       |
| Images         | Build-time thumbnail tiers + stepped-halving runtime downscale; the browser never does one big `drawImage` shrink (§10)                                                       |
| Code splitting | Every page is a `lazy()` route chunk; React is its own `manualChunks` framework chunk                                                                                         |
| Analytics      | Umami, injected **server-side** (`src/server/static.ts`) so the URL/ID can change without a rebuild                                                                           |

### File layout

```
web/
  index.html                  # SPA shell: static head (title/OG/twitter/canonical/JSON-LD) + empty #root
  public/                     # vite publicDir — served at site root, copied verbatim into dist/
    favicon.svg  og.png  nikkesim-icon.png
    robots.txt  sitemap.xml  llms.txt       # SEO surfaces (§6)
    content-pages.json                      # committed no-JS bodies for /mechanics + /howto (§7)
    fonts/Roboto-{Regular,Medium,Bold}.woff2  # subsetted; reproducible via npm run fonts:subsets
    nikke-icons/                            # game-UI icon set (§10)
    img/portraits/<slug>-{128,256}.webp     # generated portrait tiers (npm run thumbs)
    dpschart.json, {burstgen,burstcdr,sustain,bufferchart,b1b2dps}.json,
    ol-default.json                         # gitignored precomputed artifacts the pages fetch
  src/
    main.tsx                  # React root: lazy() page switch, Suspense fallback, auth boot, head sync
    App.tsx                   # the sim app (~8,400 lines) — owns the 14 tool tabs in 4 sections
    router.ts                 # path-based SPA router (§4)
    SiteChrome.tsx            # SiteNav + SiteFooter (shared chrome on every page)
    styles.css                # ALL styles (§3)
    auth.ts                   # THE ONLY client for the user-data API (§8)
    useDocumentHead.ts        # per-route client-side <head> sync (§6)
    jsonLd.ts                 # escapeJsonLd helper (</script> breakout prevention)
    components/               # shared UI: PillGrid, DpsBarChart, RankBarChart, OlBarChart,
                              # MatrixChart, MatrixFilter, CharacterGrid, CharSearch,
                              # BrowseNikkesModal, ChartModal, CopyFlashButton,
                              # InlineNameField, SaveProfileControl, SavedRostersDropdown
    TabDropdown.tsx           # mobile dropdown tab replacement + useMediaQuery hook
    # — share-image browser hosts (§9) —
    teamShare.ts  shareImage.ts  tableShare.ts  rankChartShare.ts  unitCardShare.ts  siteIcon.ts
    builderSpec.ts            # /builder state → manifest key | RenderSpec mapping (pure, test-pinned)
    # — image pipeline (§10) —
    imageDownscale.ts  portraitThumb.ts  portraitManifest.ts  portrait-manifest.json
    usePortraitThumbs.ts  useIconThumbs.ts
    # — sim compute pool (§8) —
    simClient.ts  simPool.ts  simWorker.ts
    # — page data modules (also the no-JS body source, §7) —
    site-data.ts  social-icons.tsx  metaWeights.ts  clipboard.ts
    howto-data.ts  mechanics-data.ts  resources-data.ts  doll-faq-data.ts
    dpschartData.ts  rankBoardsData.ts  rankChartBars.ts  releaseRows.ts
    patch-notes.json  testing-requests.json
    # — pages (one file each, lazy-loaded, PascalCase + Page suffix) —
    HowToPage.tsx  MechanicsPage.tsx  DevPage.tsx  PatchNotesPage.tsx
    TestingRequestsPage.tsx  RosterSyncPage.tsx  CreditsPage.tsx
    CharactersPage.tsx  UnitPage.tsx  TeamBuilderPage.tsx  BuilderPage.tsx
    ResourcesPage.tsx  DpsChartTab.tsx  SupportRankings.tsx

src/infographics/             # platform-free canvas renderers + Node host (§9)
src/server/                   # Hono server: static + SEO injection + /api/v1/img (§6, §8)
scripts/serve.mjs             # legacy dependency-free server, behavior-locked to src/server/static.ts
```

---

## 2. TypeScript conventions

### Imports

```ts
// React — named imports, type-only for event types
import { useEffect, useState, useRef, useMemo } from 'react';
import type { MouseEvent, ReactNode } from 'react';

// Engine types — relative paths up from web/src/
import type { Element, SimConfig, DataFile } from '../../src/types';
import { runSimMean, type SimResult } from '../../src/engine/sim';

// JSON data — default import with a two-step cast
import charactersJson from '../../data/characters.json';
const data = charactersJson as unknown as DataFile;

// Infographics spec modules are imported with the repo's nodenext `.js`
// extension so the same file works under vitest (root tsconfig) and vite.
import type { RenderSpec } from '../../src/infographics/spec.js';
```

### Component signatures

```ts
// Named exports ONLY (never default). Props typed inline or via interface.
export function ComponentName({ prop1, prop2 }: { prop1: string; prop2?: number }) { ... }

// For complex props, an interface above the component
export interface DpsBarChartProps {
  title: string;
  subtitle?: string;
  bars: BarEntry[];
  compare?: (BarEntry & { total: number }) | null;
  onShareImage?: () => void;
}
```

Lazy pages adapt at the import site, not by adding default exports:

```ts
const HowToPage = lazy(() =>
  import('./HowToPage').then((m) => ({ default: m.HowToPage }))
);
```

### Typing patterns

```ts
// Union types for finite sets
type CalcTab = 'sim' | 'team' | 'roster' | 'rostersim' | 'overload' | /* … */;

// `as const` for fixed arrays/tuples
const HEADLINE_CELL_IDS = ['solo.eleweak.c100.8of12', 'solo.neutral.c100.8of12'] as const;

// Record types for lookups
const OL_KEY_LABEL: Record<OlKey, string> = { elem: 'Elem DMG', atk: 'ATK' /* … */ };

// Discriminated unions for result state
type GuideResult =
  | { kind: 'invalid'; msg: ReactNode }
  | { kind: 'done'; msg: ReactNode }
  | { kind: 'steps'; phases: { title: string; items: ReactNode[] }[]; note: ReactNode };
```

### Custom hooks

```ts
// Naming: useXxx. Exported hooks are shared infrastructure; internal ones stay file-local.
export function useMediaQuery(query: string): boolean { ... }
export function usePortraitThumbs(urls: (string | null | undefined)[], cssSize: number): Record<string, string> { ... }
function useBalancedCols(count: number) { ... } // not exported
```

### Comments

Comments are **extensive and explanatory**. They document:

- **WHY** a decision was made (not what the code does)
- Root cases of bugs/fixes, with the lesson stated
- Invariants, edge cases, and cross-references to engine/server code

```ts
// Good — states the lesson
// THE LESSON: never let a single big `drawImage` do a large reduction. At the
// ~5–8× shrink we need for full-res CDN art the browser's default sampler
// aliases thin character outlines into jagged edges. Instead HALVE repeatedly.

// Good — states the invariant
// scope-lock loadout (per-unit): no cube, no doll, Base 5 gear, 3★ / 7 core, 10/10/10.
// Applied to every unit in the DPS test so candidates compete on equal footing.
```

---

## 3. Styling — one CSS file, token-driven

Everything lives in `web/src/styles.css`. Do not add a second CSS file, CSS modules,
Tailwind, or styled-components. New feature styles go under a `/* ---- Feature ---- */`
banner with a shared class prefix (`.yourfeature-*`).

### Design tokens

```css
:root {
  color-scheme: dark;
  --bg: #101216; /* page background */
  --panel: #181b22; /* card/panel background */
  --panel2: #1f232d; /* elevated/sunken surface (inputs, alternate rows) */
  --border: #2a2f3b; /* borders, dividers */
  --text: #e7eaf0; /* primary text */
  --muted: #8b93a3; /* secondary text, labels, placeholders */
  --accent: #5b9dff; /* interactive blue (buttons, active states, links) */
  --warn: #e0b04b; /* warning/caution yellow */
}
```

All colors reference these tokens (element-specific colors come from
`ELEMENT_COLORS` in `src/infographics/core/theme.ts`). One runtime-fed token:
`--portrait-crop-top` is set by `main.tsx` from the shared `PORTRAIT_CROP_TOP`
constant so CSS portrait crops and canvas crops never drift (§10).

### Fonts — the one exception to "system stack only"

Body text uses the system stack (`14px/1.5 -apple-system, BlinkMacSystemFont,
'Segoe UI', Roboto, sans-serif`). **Roboto is additionally self-hosted as three
subsetted woff2 faces** (`@font-face`, `font-display: swap`, explicit
`unicode-range`) because every infographic renderer draws text in Roboto
(`src/infographics/core/theme.ts` `FONT`), and the subset lets the browser card
pixel-match the Node-rendered one. Rules:

- The `unicode-range` pins each face to exactly its subset coverage, so glyphs
  outside the subset fall through per-glyph to the next family instead of
  rendering blanks.
- Glyphs Roboto lacks (e.g. ▲) are **drawn, not typed**, on canvas (§9).
- Canvas code must await `ensureRoboto()` (`web/src/teamShare.ts`) before the
  first draw, or the first click renders fallback-metric text.
- Subsets are reproducible: `npm run fonts:subsets` (`scripts/subset-fonts.ts`)
  rebuilds them from the full TTFs in `src/infographics/assets/fonts/` + the
  checked-in glyph manifest (`subset-ranges.json`), and fails unless
  `styles.css` carries the manifest's `unicode-range` verbatim.
- No other font family is ever loaded.

### Typography

- **Base size:** 14px · **Headings:** h1 22–28px, h2 15–18px
- **Labels:** 11px, uppercase, letter-spacing 0.06–0.09em, `color: var(--muted)`
- **Small text:** 12–13px · **Numeric columns:** `font-variant-numeric: tabular-nums`

### Spacing, radius, borders, shadows

Spacing uses a 2px-based scale (`2…28px`). Common patterns: flex/grid gap 6px
tight / 8px default / 12px cards / 14–18px sections; card padding 10–16px; page
padding `24px 20px 60px` desktop, `14px 8px 48px` mobile.

| Element                   | Radius                  |
| ------------------------- | ----------------------- |
| Pill buttons / chips      | `999px`                 |
| Cards/panels              | `10px`                  |
| Modals / social tiles     | `12px` (or `50%` round) |
| Inputs/buttons            | `8px`                   |
| Small elements, portraits | `6px`                   |

```css
/* panel border + selected-state glow */
border: 1px solid var(--border);
border-color: var(--accent);
box-shadow: 0 0 0 1px var(--accent);

/* shadows are always dark and subtle */
box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5); /* dropdowns */
box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5); /* modals */
```

### Layout patterns

```css
.app {
  max-width: 1180px;
  margin: 0 auto;
  padding: 24px 20px 60px;
} /* page container */

.card {
  /* card/panel */
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.team {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
}

.pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.dpschart-row {
  /* chart row: rank | label | bar | value */
  display: grid;
  grid-template-columns: 18px auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
}

/* dropdown/popover: absolute, below trigger, z-index 10, own scroll */
.picker-list {
  position: absolute;
  z-index: 10;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--panel2);
  border: 1px solid var(--border);
  border-radius: 8px;
  max-height: 300px;
  overflow-y: auto;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
}
```

### Buttons, inputs, tables

Three button voices, all in `styles.css`:

- **Pill toggle** (`.pills button`, `.on` = accent background + dark text `#0b1220`)
- **Primary action** (`.calc-run` — accent background, 8px radius, 600 weight)
- **Outlined** (`.share-btn` / `.nav-btn` — panel2 background, accent border; hover fills accent)
- Plus small variants: `.chip` (999px, 12px font), `.share-btn.discord` (brand `#5865f2`)

Inputs (`input.num`, `.picker input`, `select`): `var(--panel2)` background,
`var(--border)` border, 8px radius, 13px font. Tables: `border-collapse:
collapse`, panel background, uppercase muted 11px headers on panel2, row
dividers `var(--border)`, no divider on the last row.

### Responsive breakpoints

| Breakpoint | Used for                                                                |
| ---------- | ----------------------------------------------------------------------- |
| `≤ 900px`  | DPS chart grid collapses to one column                                  |
| `≤ 760px`  | mid-width restacks (unit page hero, builder layouts)                    |
| `≤ 720px`  | Mechanics grid + tier legend, some boards → single column               |
| `≤ 640px`  | main mobile breakpoint — page padding, nav → TabDropdown, grids restack |

Prefer content-aware layout over breakpoints where possible: `ResizeObserver`
(see `PillGrid`), never `window.addEventListener('resize')`.

### Accessibility baselines (site-wide, in styles.css)

```css
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
} /* pills are borderless and lose the UA default */

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

Icon-only links/buttons carry `aria-label` + an `.sr-only` text twin; modal/toast
panels use `role="alertdialog"` / `role="menu"` with `aria-expanded` on triggers.

### Utility classes

`.muted`, `.big` (18px), `.r` (right-align), `.share` (accent bold), `.adv`
(green `#4ecb71`), `.sr-only`.

---

## 4. Routing and navigation

**The crawl charter:** every view is addressed by a real URL **path** (never a
hash), because paths reach the server — each is independently crawlable with its
own embed card (§6). The server SPA-falls-back unknown paths to `index.html`
and returns hard 404s for routes it knows are bogus (§6.5).

### Route model (`web/src/router.ts`)

- `Route` union: `sim | rankings | overload | tools | howto | mechanics | dev |
patch-notes | testing-requests | roster-sync | credits | characters | unit`.
- `PAGE_ROUTES` (everything except the sim family + `unit`) render as standalone
  pages in `main.tsx`; the sim `App` owns `/` plus its sub-tab paths.
- Sections group tab paths under one nav entry — `RANKINGS_PATHS` (`ranks`,
  `dpschart`, `dps`), `OVERLOAD_PATHS` (`overload`, `olsim`, `charge`),
  `TOOL_PATHS` (`teambuilder`, `builder`, `doll`, `resources`) — with
  `SECTION_LANDING` deciding where each nav link lands (`/ranks`, `/overload`,
  `/teambuilder`). `/team` and `/roster` fall through to `sim`.
- Parameterized routes (`/unit/:slug`) are intentionally excluded from `ROUTES`
  — `hrefFor('unit')` would produce a slug-less dead end.
- `navigate()` = `pushState` + synthetic `popstate`; `useRouteAndSlug()` is the
  single subscription both route and slug derive from; scroll-to-top happens
  only when the route actually changes.

### Links are real anchors, intercepted

```tsx
<a
  href={hrefFor(route)}
  onClick={onSpaLinkClick(hrefFor(route))}
  className={current === route ? 'on' : ''}
>
  {label}
</a>
```

`onSpaLinkClick` converts a plain left-click into SPA navigation and lets
modified clicks (open-in-new-tab etc.) behave natively. Render real `href`s
always — crawlability and middle-click depend on it.

### The 14 sim tabs (`web/src/App.tsx` `CALC_TABS`)

Sim section: Team Sim (`/`), Roster Sim (`/rostersim`), Team Generator (`/team`),
Roster Generator (`/roster`) · Rankings: DPS Rankings (`/ranks`), Support
Rankings (`/ranks/support`), Unit Comparisons (`/ranks/compare`) · Overload:
Optimize (`/overload`), Rolling Sim (`/olsim`), Breakpoints (`/charge`) · Tools:
Team Builder (`/teambuilder`), Card Builder (`/builder`), Doll Leveling
(`/doll`), Resources (`/resources`).

### Legacy URLs get BOTH a canonical and a 301

`/dpschart → /ranks`, `/dps → /ranks/compare`, `/sim → /`, `/index.html → /`.
The 301s live server-side (`LEGACY_REDIRECT` in `src/server/static.ts`,
mirrored in `scripts/serve.mjs`); the client canonicalizes the same aliases in
the window before `App.tsx`'s replaceState runs (`LEGACY_CANONICAL` in
`useDocumentHead.ts`). Link equity must flow to the current URL, not rely on
`<link rel="canonical">` alone.

---

## 5. Component patterns

### Shared components (`web/src/components/`)

| Component              | Purpose                                                                                  |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| `PillGrid`             | Balanced-wrap pill grid — `ResizeObserver` + `--pcols` CSS var, no greedy last row       |
| `DpsBarChart`          | Ranked horizontal bars — element-colored fills, portrait thumbs, share button            |
| `RankBarChart`         | Support-board bar chart (portrait orientation for embeds)                                |
| `OlBarChart`           | Overload ranked configs — reuses `.dpschart-*` classes                                   |
| `MatrixChart`          | Filter + chart combo; loads a precomputed artifact, renders `DpsBarChart`                |
| `MatrixFilter`         | 4-axis pill selector with a generic `Row<T>` sub-component                               |
| `CharacterGrid`        | Roster grid for /characters; icon filenames shared with the infographic `core/iconNames` |
| `CharSearch`           | Nickname-aware search/pick combobox, reusable across tool tabs                           |
| `BrowseNikkesModal`    | Modal picker built on CharSearch                                                         |
| `ChartModal`           | "Expand chart" modal for /ranks infographics                                             |
| `CopyFlashButton`      | Copy button that flashes "✓ Copied" for 1.5 s — the site-wide copy feedback, packaged    |
| `InlineNameField`      | Inline replacement for `window.prompt()` — commits on Enter/✓, cancels on Escape/×       |
| `SaveProfileControl`   | Save/load/delete profiles via the `auth.ts` profiles API                                 |
| `SavedRostersDropdown` | Load dropdown for Roster Sim's saved rosters                                             |

Also in `web/src/` (page-chrome, not components/): `SiteChrome.tsx` (SiteNav +
SiteFooter), `TabDropdown.tsx` (+ `useMediaQuery`).

### Page structure

```tsx
export function SomePage() {
  return (
    <div className="app page-class">
      <header>
        <h1>Page title</h1>
        <p className="muted">Introductory text…</p>
      </header>
      <section className="page-grid">{/* content cards */}</section>
    </div>
  );
}
```

Parameterized content pages (UnitPage) derive EVERYTHING from committed
artifacts — never hand-write per-item blurbs — and **degrade, never vanish**: a
section without data says so in one line instead of disappearing.

### Dropdown/modal dismiss pattern (site-wide)

Outside-`mousedown` + `Escape`, attached while open, cleaned up on close —
identical shape in SiteNav menu, TabDropdown, pickers, ChartModal, toasts:

```tsx
useEffect(() => {
  if (!open) return;
  const onDocDown = (e: globalThis.MouseEvent) => {
    if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') setOpen(false);
  };
  document.addEventListener('mousedown', onDocDown);
  document.addEventListener('keydown', onKey);
  return () => {
    document.removeEventListener('mousedown', onDocDown);
    document.removeEventListener('keydown', onKey);
  };
}, [open]);
```

### Clipboard pattern

`copyTextToClipboard` (`web/src/clipboard.ts`): async Clipboard API first,
legacy `execCommand('copy')` fallback (still works in insecure contexts), so a
`window.prompt("Copy this link:")` dialog is never needed. Image copies use
`ClipboardItem` with a download fallback (`copyOrDownloadPng` in `teamShare.ts`).
User-visible feedback is the `CopyFlashButton` flash, not alerts.

### Portrait `<img>` pattern

```tsx
const thumbs = usePortraitThumbs(urls, 64); // manifest tiers first, runtime downscale fallback
<img src={thumbs[url] ?? url} alt={name} loading="lazy" />;
```

```css
.portrait {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  object-position: center var(--portrait-crop-top);
  border-radius: 8px;
}
```

Never point `<img src>` straight at full-res art for small sizes — see §10.

---

## 6. SEO and social embeds

Three surfaces cooperate; each has exactly one job:

1. **`web/index.html`** — the static baseline head every request starts from.
2. **`web/src/useDocumentHead.ts`** — client-side per-route head sync for JS clients.
3. **`src/server/static.ts`** (`TAB_META`) — server-injected per-route meta for
   every non-JS client (Discord/Twitter/Google crawlers don't run JS). The
   legacy mirror `scripts/serve.mjs` must stay behavior-identical.

### 6.1 The index.html baseline

Static `<title>`, description, keywords, `canonical = https://nikkesim.app/`,
full OG set (`og:image` = `/og.png`, 1200×630, with width/height/alt), twitter
`summary_large_image` set, `theme-color: #5b9dff` (the Discord embed accent
stripe), and a static `WebApplication` JSON-LD block (free tool, featureList,
author). `#root` starts EMPTY — the server may inject a no-JS body (§7), React
replaces it wholesale (`createRoot`, not hydration).

### 6.2 Client head sync (`useDocumentHead.ts`)

One `META` table — `{title, description}` per route key; titles keyword-rich
and unique so each route is a distinct result. On mount + `popstate` it sets
`document.title`, description, og:title/description/url, twitter:title/description,
and the canonical link (`SITE + normalized lowercase path`, no trailing slash
except root). **It never touches `og:image`** — embed images are
server-rendered only. `/unit/:slug` is deliberately skipped here: UnitPage sets
its own head so the full characters dataset doesn't land in the eager entry
chunk.

### 6.3 Server meta injection (`src/server/static.ts`)

Crawlers get per-route OG cards baked into the HTML at request time — no
user-agent sniffing; every visitor receives the same enriched HTML. `injectMeta`
rewrites title/description/canonical/OG/twitter; if the tab declares an `image`
manifest key (e.g. `/unit/<slug>` → `unit/<slug>.discord`, `/builder` → a
showcase card), it resolves the content-hashed filename against
`dist/img/manifest.json` and rewrites og:image (+width/height/alt) and
twitter:image. Missing key/manifest → the generic `/og.png` stays.

**Lockstep rule (maintenance hazard):** route titles/descriptions exist in
THREE tables — `useDocumentHead.ts` `META`, `static.ts` `TAB_META`, and
`serve.mjs` `TAB_META`. They drifted once (resolved 2026-08-11 by unifying on
the deployed `static.ts` strings); when you add or reword a route, update all
three, and keep `/characters` covered on the client too.
`scripts/tests/share/meta-parity.test.ts` imports all three tables and fails
on any per-key title/desc disagreement or key-set drift. The serve test suites
assert served bytes — if a test pins a stale string, update the string
everywhere, not just the test.

### 6.4 Structured data (JSON-LD)

- Static: `WebApplication` in index.html.
- Server-injected: `BreadcrumbList` on every non-root 200 (section-aware),
  idempotent when a page ships its own.
- Client-rendered per page (each lazy page injects its own
  `<script type="application/ld+json">` via `dangerouslySetInnerHTML` +
  `escapeJsonLd`, which escapes `<` to prevent `</script>` breakout):
  HowToPage `DefinedTermSet` (glossary), MechanicsPage `WebPage` + `ItemList`
  (sections), CharactersPage `CollectionPage`, UnitPage `WebPage` with `about`.

### 6.5 Crawl policy surfaces (all static files in `web/public/`)

- **robots.txt** — explicit `Allow: /` groups for the social/embed crawlers by
  name (Discordbot, Twitterbot, facebookexternalhit, Slackbot-LinkExpanding,
  LinkedInBot, WhatsApp, TelegramBot — some platforms respect only their own
  group), `User-agent: *`, then an explicit AI-answer-engine allowlist
  (GPTBot, ChatGPT-User, OAI-SearchBot, ClaudeBot, anthropic-ai, PerplexityBot,
  Perplexity-User, Google-Extended, Applebot-Extended, CCBot), ending with
  `Sitemap: https://nikkesim.app/sitemap.xml`. Query-string share URLs are
  allowed on purpose so crawlers read their canonical tags.
- **sitemap.xml** — GENERATED by `scripts/build-sitemap.ts` (`npm run
build:sitemap`, runs before `vite build` in the deploy chain; drift-guarded
  by `scripts/tests/share/sitemap-drift.test.ts`). Fixed routes carry priority
  tiers (home 1.0 → meta 0.3) plus one `/unit/<slug>` per character. Thin pages
  stay in: omitting them while linking them elsewhere is an inconsistent crawl
  policy (see `docs/seo-followups.md` for the thin-content decision rule).
- **llms.txt** — hand-maintained markdown site index for AI answer engines,
  discovered by URL convention.

### 6.6 Canonical + 404 + cache policy

- Canonical: lowercase path, no trailing slash except root; legacy aliases
  canonicalize AND 301 (§4). Unknown routes that would SPA-fallback get **hard
  404s** (`isKnownRoute` whitelist); 404 responses canonicalize to the site root.
- Unknown extensionful assets are real 404s, never the SPA shell.
- Cache policy (duplicated on purpose in `static.ts` and `serve.mjs`, both
  test-covered): content-hashed assets (`/assets/*`, `/img/*.hash.ext`) →
  `public, max-age=31536000, immutable`; mutable JSONs (`dpschart.json`, board
  JSONs, `ol-default.json`, `/img/manifest.json`) → `no-cache`; everything else
  gets weak-ETag/304 handling. New hashed formats must be added to BOTH
  matchers + tests.
- API misses under `/api/v1/img/*` are honest 404s, **never** the SPA fallback.

---

## 7. The no-JS / crawler surface

The site is a client-rendered SPA, so the served `index.html` carries meta but
an empty `#root`. Routes that need indexable text get a body injected **at
request time** by both servers (`src/server/static.ts` and `scripts/serve.mjs`).

| Route         | Body source                                                        | Emits                                                        |
| ------------- | ------------------------------------------------------------------ | ------------------------------------------------------------ |
| `/unit/*`     | `unitStaticHtml` ← `data/characters.json` + `data/unit-pages.json` | identity row, tags, kit, ranked overload table, status badge |
| `/characters` | `charactersStaticHtml` ← `data/characters.json`                    | an `<a>` to every character — the crawl hub                  |
| `/mechanics`  | `web/public/content-pages.json` ← `web/src/mechanics-data.ts`      | intro, tier legend, every section heading + bullets          |
| `/howto`      | `web/public/content-pages.json` ← `web/src/howto-data.ts`          | intro, every section heading, bullets, glossary `<dl>`       |

Every other route serves the empty shell.

**Two standing rules:**

1. **Same source.** A no-JS body is generated from the SAME artifact/module the
   React page reads, so the two cannot recommend different things. Serving text
   the page does not show is worse than serving none. (`/doll`'s FAQ is
   deliberately excluded for exactly this reason — its web copy is JSX while
   `doll-faq-data.ts` is the Discord bot's separate copy.)
2. **No prerender pass, ever.** Build-time Playwright prerendering was tried,
   silently never ran on the deploy box, and is now rejected for every route
   (DECISIONS 2026-08-03). A route that needs a body gets request-time
   injection or a content-pages entry; `content-pages.json` is committed AND
   regenerated by `scripts/build-content-pages.ts` inside verify.sh's
   `artifacts` tier, with `content-pages-drift.test.ts` failing on drift.

The injected markup only has to be **valid and crawlable**, not identical to
React's output — React replaces it wholesale on load.

---

## 8. Backend and data flow

### 8.1 Two backends, one boundary

| Backend                            | What it owns                                                            | Where                                                                          |
| ---------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **nikke-sim server** (same-origin) | Static `dist/` + SEO injection + the share-image API (`/api/v1/img/*`)  | `src/server/` (Hono + `@hono/node-server`), deployed as `dist-server/index.js` |
| **bakery-bot web** (cross-origin)  | Auth, saved teams, profiles (share links), roster sync, linked accounts | separate repo/deployment (`appweb-production-a479.up.railway.app`)             |

The sim itself, all game data, and every computation run **client-side**. The
boundary is structural: the engine is plain TS imported into the bundle and
data arrives as ~34 static JSON imports. The ONLY `fetch()` calls in `web/src`
are: `auth.ts` (user-data API), `BuilderPage.tsx` (same-origin img API), and
static artifact JSONs (`dpschart.json`, board JSONs, `ol-default.json`,
`/img/manifest.json`). **Never add a fetch for sim or game data.**

### 8.2 `web/src/auth.ts` — the single user-data client

All bakery-bot access goes through this file; never fetch those paths ad hoc
elsewhere.

- `BACKEND_ORIGIN` = `VITE_API_BASE ?? appweb production`; `API_BASE` is `''`
  (same-origin → vite proxy) in dev, `BACKEND_ORIGIN` in prod. Cross-origin
  prod is why auth is bearer-token, not cookies.
- Token: `localStorage['nikke-sim.auth']`. It arrives in the URL **fragment**
  (`#nsat=<token>` — never the query, keeps it out of logs/Referer), is
  captured + scrubbed by `captureTokenFromUrl()` on boot, and sent as
  `Authorization: Bearer`. Any 401 clears the token.
- `api<T>()` for plain calls; `apiEx<T>()` + `ApiError` (status + parsed body)
  where the UX must distinguish 401/400/429/502 (roster endpoints).
- OAuth login is a **top-level navigation** to `BACKEND_ORIGIN/auth/discord/login`
  (never a fetch, never through the proxy).

### 8.3 Dev proxy (`vite.config.ts`)

`/api` and `/auth` forward to `BACKEND` with `changeOrigin` — localhost is not
in the backend's CORS allowlist, so dev goes server-side. **Gotcha:** the img
API (`/api/v1/img/*`) lives on the SIM server, not bakery-bot, so the Card
Builder's hosted-URL feature degrades gracefully in dev; one proxy target serves
one backend. Img API calls in web code are always **same-origin relative**
(`/api/v1/img/...`) — never prefix `BACKEND_ORIGIN` on them.

### 8.4 Worker pool for heavy compute

Generators (team/roster search) run sims in a pool: `simPool.ts` sizes it
`max(1, min(hardwareConcurrency − 1, 8))`; workers are stateless ES modules
(`new Worker(new URL('./simWorker.ts', import.meta.url), { type: 'module' })`);
protocol is `{type:'init', params} | {type:'sim', id, teams}` → `{id, results}`.
The search/coordinator stays on the main thread (`simClient.ts`) so results are
byte-identical to single-threaded runs (parity-tested). Workers re-init only
when the params blob changes; any worker error tears the pool down permanently;
no-Worker environments fall back to in-process.

### 8.5 The share-image API (`/api/v1/img/*`)

Registered on the Hono server (`src/server/api.ts`); all routes anonymous
(rate limiting is Cloudflare at the edge). Every dynamic render funnels through
ONE contract: query/body → `parseRenderSpec` → `specCacheKey` → `resolveRender`
→ `ensureCached` (`src/infographics/spec.ts` is the single source; its
cache-key strings are byte-load-bearing and test-pinned — bump
`RENDERER_VERSION` instead of reshaping keys).

| Route                              | Behavior                                                                                                                      |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `GET manifest.json`                | pre-render manifest (`no-cache` — the only mutable image URL)                                                                 |
| `GET {dps,unit,rank,table}/<file>` | pre-rendered content-hashed files (immutable)                                                                                 |
| `GET cache/<file>`                 | dynamic-render LRU cache (immutable; evictions re-render from the spec sidecar instead of 404ing)                             |
| `GET team.png?b=<buildcode>        | ?id=<config>` (and roster/dps/table/resources variants)                                                                       | **302** → content-addressed cache file (the 302 itself is `no-cache`) |
| `POST render`                      | JSON `RenderSpec` → **200 `{url, imageUrl, pageUrl?}`** (16 KB body cap; `pageUrl` only when a shared config `?id=` resolved) |

**Discord caches embed images by URL forever** — never hand Discord an
unversioned URL; the content hash embeds `RENDERER_VERSION` by design.

### 8.6 Deployment

- `railway.json`: build `bash scripts/verify.sh artifacts` (builds board
  artifacts, content-pages, vite build + smokes, `build:infographics`,
  `build:server`), start `npm run start:server` (`node dist-server/index.js` —
  esbuild bundle with `@napi-rs/canvas` + `sharp` external and font/icon assets
  copied beside it).
- GitHub workflow: `verify.sh full` + `artifacts` → `railway up` → builder
  canary rebuild. The sim service lives in bakery-bot's Railway project.
- The cross-repo contract: share links (`?id=`) resolve through bakery-bot's
  `GET /api/profiles/:id/public`, which serves ONLY the `sim-share` kind
  (public-by-KIND, never by id). The kind slug must match across repos
  (`src/share/shared-config.ts` ↔ bakery-bot `lib/profile-kinds.ts`).

---

## 9. Share images and infographics (`src/infographics/`)

One set of **platform-free Canvas2D renderers** (`core/`) fed by **two hosts** —
the browser (real Canvas2D) and Node (`@napi-rs/canvas`). Pixel-identity
between hosts is the goal of every module.

### 9.1 The core/ boundary (enforced twice)

`core/` may not import `@napi-rs/canvas`, `sharp`, or `../node` — enforced by
eslint `no-restricted-imports` AND `scripts/tests/share/core-boundary.test.ts`.
This is what keeps the Node canvas out of the Vite bundle. Images enter
renderers already loaded (typed `unknown`); a missing image degrades to a drawn
placeholder, never throws, never reflows (all geometry is fixed).

### 9.2 Drawing primitives (`core/canvas2d.ts`, `core/theme.ts`)

- `Canvas2DLike` — the structural context subset renderers accept. **No stroke
  API on purpose**: borders are two fills.
- `fitText` (measureText ellipsize), `wrapText` (greedy wrap, last-line
  ellipsis, breaks over-long words) — what makes fixed-size cards possible.
- Text never collides: bar charts start the track after the LONGEST label +
  `BAR_LABEL_GAP` (`barTrackX`) — long names shorten bars, never clip; past the
  max the name ellipsizes. Table cards flex-weight columns and fit every
  header/cell per column.
- `PORTRAIT_CROP_TOP = 0.16` — the single portrait-crop constant shared by
  canvas crops, CSS `object-position`, and both thumbnail pipelines (§10).
- Glyphs Roboto lacks are drawn, not typed (`drawAdvantageMark` for ▲).
- `theme.ts`: `FONT = 'Roboto'`; `ELEMENT_COLORS` (Fire `#d92d38`, Water
  `#0075f8`, Wind `#00e554`, Electric `#bc1eb1`, Iron `#ff8321`); `RANK_COLORS`
  for rank numerals only — **bars are element-colored, the two color systems
  never touch**; `WATERMARK = 'nikkesim.app'` drawn via `drawWatermark`, the
  only footer path — the mark is architectural, not a caller option.

### 9.3 Renderer inventory

| Renderer (core/)      | Logical size                             | Physical / encoding             |
| --------------------- | ---------------------------------------- | ------------------------------- |
| Team results card     | 1040 × `156 + 84n + 58`                  | dpr 2, PNG                      |
| Team composition card | 1040 × fixed                             | PNG                             |
| Roster card (5 teams) | 1040 × `156 + 96n + 58`                  | dpr 2, PNG                      |
| DPS chart             | 900 × `118 + 52·rows (+52 compare) + 44` | dpr 2, PNG                      |
| Rank board chart      | 900 × rows at `ROW_H = 64`               | dpr 2, PNG                      |
| Table card            | 720 × `96 + 36 + 38·rows + 40`           | dpr 2, PNG                      |
| Unit card `discord`   | 1200×600 (2:1 landscape)                 | dpr 2 → 2400×1200, **WebP q90** |
| Unit card `twitter`   | 1200×1600 (3:4 portrait)                 | dpr 1 → 1200×1600, **WebP q90** |

`UNIT_CARD_WEBP_QUALITY = 90` lives in core so BOTH hosts encode identically;
everything else ships PNG. Every renderer exports a `*_TITLE_INK_REGION` the
build's blank-text guard checks (regions start at the title's textX, never the
padding — the icon alone once satisfied a vacuous guard).

### 9.4 Fonts before draw — on both hosts

An unregistered font renders blank SILENTLY (valid image, zero glyphs), so:

- **Node:** `node/render.ts` imports `./fonts.js` as its FIRST statement;
  `node/fonts.ts` registers the bundled Roboto TTFs via
  `GlobalFonts.registerFromPath` and throws at import time on failure. Loud
  guards: `assertFontsLive` (metrics + ink) and `assertTitleInk` (per-card).
- **Browser:** `ensureRoboto()` awaits `document.fonts.load` (400/500/600/700)
  - `document.fonts.ready` before ANY draw (§3).

### 9.5 Browser share pipelines (`web/src/*Share.ts`)

`teamShare` (team/roster cards), `shareImage` (DPS chart), `tableShare` (table
cards + `ol-default.json` loader), `rankChartShare` (Card Builder boards),
`unitCardShare` (the browser twin of the unit card — includes the SVG-icon
rasterization workaround: Chromium declines 9-arg `drawImage` on intrinsic-less
SVGs, so icons rasterize to a bitmap first). All: `imageSmoothingQuality =
'high'`, dpr 2, portrait preload (§10), PNG `toBlob` for clipboard with
download fallback (`copyOrDownloadPng`). The ONLY browser WebP encode is the
UnitPage hero fallback — it encodes at the build's q90 so the preview matches
the served card.

### 9.6 Hosted URLs — pre-rendered manifest vs on-demand render

The `/builder` page maps state → image via `builderSpec.ts` (pure, test-pinned):

1. `manifestKeyFor(state)` — a conservative match against the build-time
   pre-renders (`scripts/build-infographics.ts` job keys: `dps/<cell>.<ele|all>`,
   `rank/<board>`, `unit/<slug>.<variant>`, `table/ol`, `table/charge-speed`).
   Hit → look the key up in `/img/manifest.json` → serve `/api/v1/img/<file>`.
2. Miss → `renderSpecFor(state)` → `POST /api/v1/img/render` →
   `{url, imageUrl, pageUrl?}` (§8.5).
3. States with neither (e.g. non-default OL combos) fall back to "Copy image".

`build-infographics.ts` runs AFTER `vite build` (which wipes `dist/`), gates on
fonts → icons → the **portrait gate** (fills missing thumbs before rendering,
then ink-checks the first card before writing anything), and renders everything
at scale 2 through `node/render.ts` only. Output: content-hashed files +
`dist/img/manifest.json` with an `inputsHash` for provenance.

---

## 10. Image pipeline

**THE LESSON** (`web/src/imageDownscale.ts`): never let a single big
`drawImage` do a large reduction — at the 5–8× shrink from full-res CDN art to
a thumbnail, the browser's default sampler aliases thin outlines into jagged
edges. HALVE repeatedly with `imageSmoothingQuality: 'high'`, then one final
draw to the exact target. Use `steppedDownscale` for any non-full-size canvas
rasterization.

### Portrait thumbnails — build-time tiers with a runtime fallback

1. **Build-time (preferred):** `npm run thumbs` (`scripts/gen-portrait-thumbs.ts`,
   Playwright headless so crop + downscale match the runtime pipeline exactly)
   writes `web/public/img/portraits/<slug>-{128,256}.webp` (WebP q0.85) +
   `web/src/portrait-manifest.json` (imageUrl → slug). `--check` reports
   coverage and runs advisory in verify.sh; `--force` / `--only a,b` exist.
   Re-run after any data sync adds units.
2. **Resolution:** `manifestThumbUrl(url, cssSize)` picks the smallest tier ≥
   `cssSize × dpr` (dpr capped at 3) so the browser never upscales.
3. **Runtime fallback:** units without a committed thumb (freshly synced) go
   through `portraitThumb` — `crossOrigin='anonymous'` load (the CDN sends
   `access-control-allow-origin: *`, so the canvas stays untainted), square
   crop anchored `PORTRAIT_CROP_TOP`, stepped downscale, data-URL cache keyed
   `url@size`. `usePortraitThumbs` wraps both paths for components.

### Icon thumbnails

`useIconThumbs` letterboxes non-square icons onto transparent square canvas
(crop-free), skips stepped halving for sources <100 px (a single high-quality
draw — stepping small images adds artifacts), and sizes to device pixels.

### Static asset inventory (`web/public/`)

| Path                                      | Contents                                                                         |
| ----------------------------------------- | -------------------------------------------------------------------------------- |
| `favicon.svg`                             | hand-authored SVG (four damage-share bars in the site palette); no PNG fallbacks |
| `og.png`                                  | default OG share image, 1200×630                                                 |
| `nikkesim-icon.png`                       | site logo drawn beside card titles / as watermark plate                          |
| `fonts/`                                  | the three Roboto subsets (§3)                                                    |
| `nikke-icons/`                            | game-UI icon set (below)                                                         |
| `img/portraits/`                          | generated portrait tiers (above)                                                 |
| `robots.txt` · `sitemap.xml` · `llms.txt` | SEO surfaces (§6.5)                                                              |
| `content-pages.json`                      | committed no-JS bodies (§7)                                                      |

**`nikke-icons/`** naming scheme (34 files): `burst_{1,2,3,lambda}.webp` (burst
tiers, white text-style) · `class_{attacker,defender,support}.webp` (white on
transparent — recolorable symbols) · `code_{fire,water,wind,electric,iron}.{png,svg}`
(colored element badges; the SVG lets the Node host rasterize at target size) ·
`man_{abnormal,elysion,missilis,pilgrim,tetra}.webp` (white manufacturer logos) ·
`weapon_{ar,smg,sg,mg,sr,rl}.png` · `res_*` (resource icons for the Resource
Calculator). Both hosts resolve filenames through `core/iconNames.ts` so they
can't diverge.

---

## 11. Naming conventions

| Thing               | Convention                     | Examples                                             |
| ------------------- | ------------------------------ | ---------------------------------------------------- |
| Components          | PascalCase, named export       | `DpsBarChart`, `PillGrid`, `CharSearch`              |
| Hooks               | camelCase, `use` prefix        | `useMediaQuery`, `usePortraitThumbs`                 |
| CSS classes         | kebab-case, semantic           | `.dpschart-row`, `.nav-menu-panel`                   |
| CSS prefixed groups | shared prefix per feature      | `.dpschart-*`, `.roster-*`, `.ol-*`, `.mech-*`       |
| Constants           | UPPER_SNAKE or camelCase const | `CALC_TABS`, `ELEMENTS`, `OL_KEY_LABEL`              |
| Types               | PascalCase                     | `CalcTab`, `BuilderState`, `GuideResult`             |
| Data modules        | kebab-case, `-data` suffix     | `howto-data.ts`, `mechanics-data.ts`, `site-data.ts` |
| Page files          | PascalCase + `Page` suffix     | `HowToPage.tsx`, `UnitPage.tsx`, `BuilderPage.tsx`   |
| Share pipelines     | camelCase + `Share` suffix     | `teamShare.ts`, `unitCardShare.ts`                   |

---

## 12. Do / Don't

### Do

- Use `var(--token)` for every color; keep the token set the single palette source
- Use `ResizeObserver` for content-aware layouts
- Guard SSR/JSDOM: `typeof window !== 'undefined'`, `typeof document === 'undefined'`
- `loading="lazy"` on portrait images; `tabular-nums` on numeric columns
- Ellipsis truncation: `text-overflow: ellipsis` + `overflow: hidden` + `white-space: nowrap`
- Named exports; `as const` for fixed arrays; explanatory WHY comments
- Route new pages through `lazy()` + Suspense
- Give every new route its full SEO surface (§13 checklist)
- Await fonts before canvas draws; ink-check generated cards

### Don't

- No CSS modules / Tailwind / styled-components; no second CSS file
- No default exports; no state library; no React Router; no hash routes
- No fonts beyond the Roboto subset pipeline (§3)
- No `window.addEventListener('resize')`
- No one-shot big `drawImage` shrinks — stepped halving only (§10)
- No `fetch()` for sim/game data; no bakery-bot calls outside `auth.ts`
- No `BACKEND_ORIGIN` prefix on `/api/v1/img/*` (same-origin)
- No unversioned image URLs to Discord (cached forever by URL)
- No client-side `og:image` mutation; no user-agent sniffing; no prerender passes (§6–7)
- No no-JS body from a source the page doesn't also read (§7)
- `as any` only for JSON-import casts

---

## 13. Recipes

### Adding a new page (the full touch-point list)

1. `web/src/YourPage.tsx` — `<div className="app page-class">` + `<header>` pattern
2. `router.ts` — add to `Route`; add to `ROUTES` and `PAGE_ROUTES` if it's a page
3. `main.tsx` — `lazy()` import + a branch in the route switch
4. `SiteChrome.tsx` — nav entry (`NAV`) or hamburger-menu entry
5. `styles.css` — a `/* ---- Your page ---- */` section, shared class prefix
6. **Client head:** a `META` entry in `useDocumentHead.ts` (unique keyword-rich title)
7. **Server head:** a `TAB_META` entry in `src/server/static.ts` AND `scripts/serve.mjs`
8. **Sitemap:** an entry (with priority tier) in `scripts/build-sitemap.ts`
9. **No-JS body** if the page has indexable prose: same-source content-pages
   entry or a static-body function (§7)
10. JSON-LD if the page has structure worth declaring (§6.4)

### Adding a new component

1. `web/src/components/YourComponent.tsx` — named export, typed props
2. `styles.css` styles under the shared prefix `.yourcomponent-*`
3. Responsive → `ResizeObserver`; dropdown/popover → the dismiss pattern (§5);
   copy actions → `CopyFlashButton` / `copyTextToClipboard`

### Adding a new share-card type

Extend `src/infographics/spec.ts` (bump `RENDERER_VERSION` if shapes change),
add a `core/` renderer (fixed geometry, ink region, watermark via
`drawWatermark`), wire the Node host exports, a build job in
`build-infographics.ts` if it pre-renders, a `builderSpec.ts` mapping if the
Card Builder offers it, and pin it with tests under `scripts/tests/share/`.

### After a data sync adds units

`npm run thumbs` (commit the new portraits + manifest); unit pages, sitemap
entries, and card builds pick new units up automatically at the next deploy
build.

---

## 14. Starting a new site from this playbook

This doc is the template for the next site. What carries over as-is, what must
be re-decided, and the day-one checklist.

### Carry over (the hard-won patterns)

- **Stack + shape:** React + Vite + TS strict; one CSS file with design tokens;
  custom path-based SPA router; no state library; route-level `lazy()` chunks;
  data as imported JSON where freshness allows
- **URL strategy:** every view a real path; legacy aliases get canonical + 301;
  hard 404s for unknown routes; content-hashed immutable assets vs `no-cache`
  mutable JSONs
- **SEO architecture:** static head baseline + client head sync + server-side
  per-route meta injection (NO user-agent sniffing, NO prerender passes —
  request-time injection from the SAME source the page reads); robots.txt with
  named social-crawler groups + explicit AI-crawler allowlist; generated
  sitemap with a drift test; llms.txt; canonical convention (lowercase, no
  trailing slash); JSON-LD per page type
- **Image lessons:** stepped-halving downscale; build-time thumbnail tiers with
  a runtime fallback; one crop constant feeding CSS + canvas; letterboxed icon
  thumbs; dpr-aware tier selection
- **Canvas/share-card architecture (if the site has share images):** one
  platform-free renderer set with two hosts; fonts-before-draw guards + ink
  checks; content-addressed URLs (Discord caches by URL forever); watermark by
  architecture; text-never-collides fitting rules
- **Backend shape:** sim/compute client-side; one API client file; bearer token
  in localStorage delivered via URL fragment (never query); dev proxy for CORS;
  same-origin media API vs cross-origin user-data API

### Re-decide per site

- Palette/tokens, typography scale, breakpoints (nikke-sim's are a dark
  data-dense tool — a community site may differ)
- Which routes need no-JS bodies and which JSON-LD types fit the content
- OG image strategy (one generic vs per-route generated)
- Auth backend: bakery-bot's profiles API is reusable cross-project (the
  `kind`-keyed store was designed for it); a new site gets its own kind slug
- Sitemap priority tiers, thin-content policy (measure first — see
  `docs/seo-followups.md` for the methodology)

### Day-one checklist for the new repo

1. Design tokens + single `styles.css` + focus-visible/reduced-motion baselines
2. Path router + `<a href>` interception + scroll-to-top on route change
3. index.html baseline: title/description/canonical/OG(1200×630)/twitter/
   theme-color/WebApplication JSON-LD
4. `useDocumentHead`-style META table + server TAB_META from the first route —
   never let the tables exist in fewer than the full set of places from day one
5. robots.txt + sitemap generator (+ drift test) + llms.txt
6. 404 + cache policy in the server before the first deploy
7. Image pipeline (`imageDownscale` + tier generator) before the first portrait UI
