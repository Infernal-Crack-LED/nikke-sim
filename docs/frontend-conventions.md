# Front-end conventions — nikke-sim

> Reference for anyone (human or AI) writing new front-end code in `web/`.
> Extracted from the existing codebase — follow these patterns to stay consistent.

## 1. Architecture

| Concern   | Approach                                                                                                       |
| --------- | -------------------------------------------------------------------------------------------------------------- |
| Framework | React 18, functional components only, hooks only                                                               |
| Build     | Vite 5 (`@vitejs/plugin-react`)                                                                                |
| Routing   | Custom SPA router (`web/src/router.ts`) — `pushState` + `popstate` listener. No React Router.                  |
| State     | `useState` / `useReducer` + prop drilling. No global store, no context API for state.                          |
| Styling   | Single CSS file (`web/src/styles.css`). No CSS modules, no styled-components, no Tailwind.                     |
| Types     | TypeScript strict. Types imported from engine (`src/types.ts`, `src/prepare.ts`, etc.)                         |
| Data      | JSON files imported directly (`import charactersJson from '../../data/characters.json'`)                       |
| API       | Bearer-token auth via `web/src/auth.ts`. Dev proxy in `vite.config.ts` forwards `/api` to backend.             |
| Images    | Canvas-rendered share cards (`src/share/teamCard.ts`), stepped-halving downscale (`web/src/imageDownscale.ts`) |

### Static assets

Served from `img/` (mapped via Vite's `publicDir` in `vite.config.ts`). Accessible at root URL (e.g. `/bastion.webp`).

| Path                                      | Contents                                                               |
| ----------------------------------------- | ---------------------------------------------------------------------- |
| `img/bastion.webp`, `img/resilience.webp` | Cube icons                                                             |
| `img/maiden.gif`                          | Maiden bot avatar                                                      |
| `img/blablalink.png`                      | Blablalink logo                                                        |
| `img/favicon.svg`                         | Site favicon                                                           |
| `img/og.png`                              | Open Graph share image                                                 |
| `img/nikke-icons/`                        | Game UI icons (burst tiers, classes, elements, manufacturers, weapons) |

**`img/nikke-icons/`** — 22 PNGs from the NIKKE game UI:

- `burst_1.png`, `burst_2.png`, `burst_3.png` — Burst tier indicators (white + black, text-style)
- `class_attacker.png`, `class_defender.png`, `class_supporter.png` — Character class icons (**white on transparent**)
- `code_fire.png`, `code_water.png`, `code_wind.png`, `code_electric.png`, `code_iron.png` — Element badges (colored gradients, keep as-is)
- `manufacturer_abnormal.png`, `manufacturer_elysion.png`, `manufacturer_missilis.png`, `manufacturer_pilgrim.png`, `manufacturer_tetra.png` — Manufacturer logos (**white on transparent**)
- `weapon_ar.png`, `weapon_smg.png`, `weapon_sg.png`, `weapon_mg.png`, `weapon_sr.png`, `weapon_rl.png` — Weapon type icons

Use class/manufacturer icons where you need monochrome, recolorable symbols (e.g. filter pills, legend items). Use element/weapon icons where the colored original is needed. All icons are small (16–80px) — scale with `width`/`height` CSS or the `portraitThumb` pipeline for crisp rendering at non-native sizes.

### File layout

```
web/
  index.html                 # Vite entry
  src/
    main.tsx                 # React root + page router (top-level pages)
    App.tsx                  # Sim app (5600+ lines — the big one)
    router.ts                # Path-based SPA router
    SiteChrome.tsx            # SiteNav + SiteFooter (shared chrome)
    auth.ts                  # API client + Discord OAuth + roster sync types
    styles.css               # ALL styles (~795 lines)
    components/              # Shared UI components
      PillGrid.tsx           # Balanced-wrap pill button grid
      DpsBarChart.tsx        # Horizontal ranked bar chart
      MatrixChart.tsx        # Matrix explorer (filter + chart)
      MatrixFilter.tsx       # 4-axis matrix selector
      OlBarChart.tsx         # Overload ranked bar chart
    TabDropdown.tsx          # Mobile dropdown tab replacement + useMediaQuery hook
    teamShare.ts             # Canvas team-card image pipeline
    shareImage.ts            # Canvas DPS-chart image pipeline
    portraitThumb.ts         # Square portrait thumbnail generator (cached)
    usePortraitThumbs.ts     # React hook for batch portrait thumbnails
    imageDownscale.ts        # Stepped-halving downscale utility
    rosterApply.ts           # Synced roster → sim loadout mapper
    metaWeights.ts           # Meta popularity scoring data
    site-data.ts             # Dev bio + social links (editable content)
    social-icons.tsx         # Inline SVG brand icons (Discord, X, GitHub)
    *-data.ts                # Data modules for pages (howto-data, mechanics-data, dpschartData)
    *Page.tsx                # Standalone pages (HowTo, Mechanics, Credits, Dev, PatchNotes, etc.)
```

## 2. TypeScript conventions

### Imports

```ts
// React — named imports, type-only for event types
import { useEffect, useState, useRef, useLayoutEffect, useMemo } from 'react';
import type { MouseEvent, ReactNode, PointerEvent } from 'react';

// Engine types — imported from src/ (relative paths from web/src/)
import type { Element, SimConfig, DataFile } from '../../src/types';
import { runSimMean, type SimResult } from '../../src/engine/sim';

// JSON data — default import with type assertion
import charactersJson from '../../data/characters.json';
const data = charactersJson as unknown as DataFile;
```

### Component signatures

```ts
// Named exports (never default). Props typed inline or via interface.
export function ComponentName({ prop1, prop2 }: { prop1: string; prop2?: number }) { ... }

// For complex props, use an interface
export interface DpsBarChartProps {
  title: string;
  subtitle?: string;
  bars: BarEntry[];
  compare?: (BarEntry & { total: number }) | null;
  onShareImage?: () => void;
}
export function DpsBarChart({ title, subtitle, bars, compare, onShareImage }: DpsBarChartProps) { ... }
```

### Typing patterns

```ts
// Union types for finite sets
type CalcTab = 'sim' | 'team' | 'roster' | 'dps' | 'dpschart';
type FavItemRarity = 'none' | 'R' | 'SR' | 'SSR';

// Const assertions for fixed arrays
const CORE_LEVELS = [0, 1, 2, 3, 4, 5, 6, 7] as const;
const CUBE_IDS = ['resilience', 'bastion', 'other'] as const;

// Record types for lookups
const OL_KEY_LABEL: Record<OlKey, string> = { elem: 'Elem DMG', atk: 'ATK', ... };

// Discriminated unions for state
type GuideResult =
  | { kind: 'invalid'; msg: ReactNode }
  | { kind: 'done'; msg: ReactNode }
  | { kind: 'steps'; phases: { title: string; items: ReactNode[] }[]; note: ReactNode };
```

### Custom hooks

```ts
// Naming: useXxx. Return the state + any imperative handles.
export function useMediaQuery(query: string): boolean { ... }
export function usePortraitThumbs(urls: (string | null | undefined)[], cssSize: number): Record<string, string> { ... }

// Internal hooks (not exported)
function useBalancedCols(count: number) { ... }
```

### Comments

Comments are **extensive and explanatory**. They document:

- **WHY** a decision was made (not what the code does)
- Root cases of bugs/fixes (e.g. "Root case: Helm's full-charge HEAL...")
- Invariants and edge cases
- Cross-references to engine code

```ts
// Good — explains WHY and references the lesson
// THE LESSON: never let a single big `drawImage` do a large reduction. At the
// ~5–8× shrink we need for full-res CDN art (256×512 → a ~33–120px thumbnail) the
// browser's default sampler reads too few source texels per destination pixel and
// aliases thin character outlines into jagged edges.

// Good — explains the invariant
// scope-lock loadout (per-unit): no cube, no doll, Base 5 gear, 3★ / 7 core, 10/10/10.
// Applied to every unit in the DPS test so candidates compete on equal footing.
```

## 3. CSS conventions

### Design tokens (CSS custom properties)

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

All colors reference these tokens. Element-specific colors come from `ELEMENT_COLORS` in `src/share/teamCard.ts` (used inline via `style={{ background: ELEMENT_COLORS[element] }}`).

### Typography

```css
body {
  font:
    14px/1.5 -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    sans-serif;
}
```

- **Base size:** 14px
- **Headings:** h1 = 22–28px, h2 = 15–18px
- **Labels:** 11px, uppercase, letter-spacing 0.06–0.09em, `color: var(--muted)`
- **Small text:** 12–13px
- **Numeric data:** `font-variant-numeric: tabular-nums` for aligned columns
- **No custom font files** — system font stack only

### Spacing scale

Spacing uses a 2px-based scale: `2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28px`.
Common patterns:

- **Gap in flex/grid:** 6px (tight), 8px (default), 12px (cards), 14–18px (sections)
- **Padding in cards:** 10–16px
- **Page padding:** 24px 20px 60px (desktop), 14px 8px 48px (mobile)
- **Margin between sections:** 14–20px

### Border radius

| Element                        | Radius                              |
| ------------------------------ | ----------------------------------- |
| Pill buttons                   | `999px` (fully rounded)             |
| Cards/panels                   | `10px`                              |
| Modals                         | `12px`                              |
| Inputs/buttons                 | `8px`                               |
| Small elements (chips, badges) | `6px`                               |
| Social tiles                   | `12px` (or `50%` for round variant) |
| Portraits/images               | `6–8px`                             |

### Borders

```css
/* Standard panel border */
border: 1px solid var(--border);

/* Active/accent border */
border-color: var(--accent);
box-shadow: 0 0 0 1px var(--accent); /* inset glow for selected state */
box-shadow: 0 0 0 1px var(--accent) inset; /* explicit inset */
```

### Shadows

```css
/* Dropdown/panel shadows — always dark, always subtle */
box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5); /* dropdowns */
box-shadow: 0 10px 28px rgba(0, 0, 0, 0.45); /* menus */
box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5); /* modals */
```

### Layout patterns

```css
/* Page container — centered, max-width */
.app {
  max-width: 1180px;
  margin: 0 auto;
  padding: 24px 20px 60px;
}

/* Card/panel */
.card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* Team grid — 5 cards across */
.team {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
}

/* Flex row with wrapping */
.pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

/* Horizontal bar chart row */
.dpschart-row {
  display: grid;
  grid-template-columns: 18px auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
}
```

### Button styles

```css
/* Pill toggle (selection) */
.pills button {
  background: var(--panel2);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 4px 12px;
  cursor: pointer;
  font-size: 13px;
}
.pills button.on {
  background: var(--accent);
  border-color: var(--accent);
  color: #0b1220;
  font-weight: 600;
}

/* Action button (primary) */
.calc-run {
  background: var(--accent);
  color: #0b1220;
  border: 0;
  border-radius: 8px;
  padding: 8px 18px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
}

/* Share/nav button (outlined) */
.share-btn,
.nav-btn {
  background: var(--panel2);
  color: var(--text);
  border: 1px solid var(--accent);
  border-radius: 8px;
  padding: 6px 14px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
}
.share-btn:hover:not(:disabled) {
  background: var(--accent);
  color: #0b1220;
}

/* Chip (small action) */
.chip {
  background: var(--panel2);
  border: 1px solid var(--border);
  color: var(--text);
  border-radius: 999px;
  padding: 3px 10px;
  cursor: pointer;
  font-size: 12px;
}
```

### Input styles

```css
/* Numeric input */
input.num {
  width: 76px;
  background: var(--panel2);
  border: 1px solid var(--border);
  color: var(--text);
  border-radius: 8px;
  padding: 4px 8px;
  font-size: 13px;
}

/* Text input / picker */
.picker input {
  width: 100%;
  background: var(--panel2);
  border: 1px solid var(--border);
  color: var(--text);
  border-radius: 8px;
  padding: 6px 9px;
  font-size: 13px;
}

/* Select dropdown */
select {
  background: var(--panel2);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 13px;
}
```

### Responsive breakpoints

| Breakpoint | Purpose                                                                                  |
| ---------- | ---------------------------------------------------------------------------------------- |
| `≤ 900px`  | DPS chart grid collapses to single column                                                |
| `≤ 720px`  | Mechanics grid + tier legend collapse to single column                                   |
| `≤ 640px`  | Main mobile breakpoint — page padding, header, nav, team layout, roster rows all restack |

```css
@media (max-width: 640px) {
  .app {
    padding: 14px 8px 48px;
  }
  .header-row {
    flex-wrap: wrap;
  }
  /* ... restack layout ... */
}
```

### Dropdown/popover positioning

```css
/* Absolute, below trigger, with z-index */
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

### Tables

```css
table {
  width: 100%;
  border-collapse: collapse;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
}
th {
  text-align: left;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
  background: var(--panel2);
}
td {
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
}
tbody tr:last-child td {
  border-bottom: 0;
}
```

### Utility classes

```css
.muted {
  color: var(--muted);
}
.big {
  font-size: 18px;
  color: var(--text);
}
.r {
  text-align: right;
}
.share {
  color: var(--accent);
  font-weight: 600;
}
.adv {
  color: #4ecb71;
}
.sr-only {
  /* accessible hidden */
}
```

## 4. Component patterns

### Reusable components

| Component       | Purpose                   | Key pattern                                                      |
| --------------- | ------------------------- | ---------------------------------------------------------------- |
| `PillGrid`      | Balanced-wrap button grid | `ResizeObserver` + `--pcols` CSS var for grid columns            |
| `DpsBarChart`   | Ranked horizontal bars    | Element-colored fills, portrait thumbnails, share buttons        |
| `OlBarChart`    | Ranked overload configs   | Reuses `.dpschart-*` classes                                     |
| `MatrixChart`   | Filter + chart combo      | Loads precomputed artifact, renders `DpsBarChart`                |
| `MatrixFilter`  | 4-axis pill selector      | Generic `Row<T>` sub-component                                   |
| `TabDropdown`   | Mobile tab replacement    | `useMediaQuery` + dropdown panel, closes on outside-click/Escape |
| `TeamPortraits` | 5-portrait strip          | Content-aware 5→3 column snap via `ResizeObserver`               |

### Page components

All pages follow the same structure:

```tsx
export function SomePage() {
  return (
    <div className='app page-class'>
      <header>
        <h1>Page title</h1>
        <p className='muted'>Introductory text...</p>
      </header>
      <section className='page-grid'>{/* content cards */}</section>
    </div>
  );
}
```

### Dropdown/modal dismiss pattern

```tsx
// Consistent across SiteNav, TabDropdown, picker:
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

### Portrait/image pattern

```tsx
// Always use pre-downscaled thumbnails for small portraits (avoid browser aliasing)
const thumbs = usePortraitThumbs(urls, 64);
<img src={thumbs[url] ?? url} alt={name} loading='lazy' />

// CSS framing: square crop, cover, top-biased
.portrait {
  width: 100%; aspect-ratio: 1; object-fit: cover;
  object-position: center var(--portrait-crop-top);
  border-radius: 8px;
}
```

### Navigation pattern

```tsx
// SPA navigation via pushState (no React Router)
import { navigate, hrefFor } from './router';

function navClick(e: MouseEvent, route: Route) {
  if (
    e.defaultPrevented ||
    e.button !== 0 ||
    e.metaKey ||
    e.ctrlKey ||
    e.shiftKey ||
    e.altKey
  )
    return;
  e.preventDefault();
  navigate(hrefFor(route));
}

// Render as <a> with real href (crawlable), intercept click for SPA
<a
  href={hrefFor(route)}
  onClick={(e) => navClick(e, route)}
  className={current === route ? 'on' : ''}
>
  {label}
</a>;
```

## 5. Naming conventions

| Thing               | Convention                     | Examples                                                |
| ------------------- | ------------------------------ | ------------------------------------------------------- |
| Components          | PascalCase, named export       | `DpsBarChart`, `PillGrid`, `TeamPortraits`              |
| Hooks               | camelCase, `use` prefix        | `useMediaQuery`, `usePortraitThumbs`, `useBalancedCols` |
| CSS classes         | kebab-case, semantic           | `.dpschart-row`, `.team-portraits`, `.nav-menu-panel`   |
| CSS prefixed groups | Shared prefix per feature      | `.dpschart-*`, `.roster-*`, `.ol-*`, `.mech-*`          |
| Constants           | UPPER_SNAKE or camelCase const | `SCOPE_LOCK_LOADOUT`, `ELEMENTS`, `OL_KEY_LABEL`        |
| Types               | PascalCase                     | `SlotState`, `CalcTab`, `GuideResult`                   |
| Data files          | kebab-case                     | `howto-data.ts`, `mechanics-data.ts`, `site-data.ts`    |
| Page files          | PascalCase + `Page` suffix     | `HowToPage.tsx`, `MechanicsPage.tsx`, `CreditsPage.tsx` |

## 6. Patterns to follow

### Do

- Use CSS custom properties (`var(--token)`) for all colors/spacing
- Use `ResizeObserver` for content-aware layouts (not window resize)
- Guard against SSR/JSDOM: `typeof window !== 'undefined'`, `typeof document === 'undefined'`
- Use `loading='lazy'` on portrait images
- Use `font-variant-numeric: tabular-nums` for numeric columns
- Use `text-overflow: ellipsis` + `overflow: hidden` + `white-space: nowrap` for truncation
- Keep components as named exports
- Write explanatory comments for non-obvious decisions
- Use `as const` for fixed arrays/tuples
- Use `Fragment` for conditional separators (`{i > 0 && ', '}`)

### Don't

- Don't use CSS modules, styled-components, or Tailwind
- Don't use `default export` for components
- Don't use a global state library (Redux, Zustand, etc.)
- Don't use React Router — the custom router handles everything
- Don't import fonts — system font stack only
- Don't use `window.addEventListener('resize')` — use `ResizeObserver`
- Don't let the browser downscale large images — use `portraitThumb` / `steppedDownscale`
- Don't use `any` unless casting JSON imports (`as any` for JSON is acceptable)
- Don't add a second CSS file — everything goes in `styles.css`

## 7. Adding a new page

1. Create `web/src/YourPage.tsx` — follow the `<div className='app page-class'>` + `<header>` pattern
2. Add the route to `router.ts`: add to `Route` union, `ROUTES` array, `PAGE_ROUTES` array
3. Add the page to `main.tsx`: import + add to the route switch in `Root()`
4. Add nav entry in `SiteChrome.tsx` `NAV` array (if it should appear in the top nav)
5. Add styles to `web/src/styles.css` under a `/* ---- Your page ---- */` section header

## 8. Adding a new component

1. Create `web/src/components/YourComponent.tsx` — named export, typed props
2. Add styles to `web/src/styles.css` using a shared prefix (`.yourcomponent-*`)
3. If it needs responsive behavior, use `ResizeObserver` (see `PillGrid`, `TeamPortraits`)
4. If it's a dropdown/popover, implement the outside-click + Escape dismiss pattern
