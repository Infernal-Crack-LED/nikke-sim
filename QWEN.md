# QWEN.md — project instructions for nikke-sim

> Qwen Code auto-reads this file. Primary use: **front-end development** (React/Vite/TypeScript in `web/`).
> The sim engine and data pipeline are mature; treat them as read-only unless explicitly asked to change them.

## Project overview

A NIKKE solo-raid damage simulator: a 60fps frame-tick sim predicting per-unit damage in 180s fights.
Two surfaces sharing one engine:

- **CLI** (`src/cli.ts`) — `npm run sim -- <5 slugs> --element fire`
- **Website** (`web/`) — React 18 + Vite 5, static site, sim runs client-side. `npm run web` (dev), `npm run web:build` (prod).

## Tech stack

- **Language:** TypeScript (strict), ESM (`"type": "module"`)
- **Front-end:** React 18, Vite 5, `@vitejs/plugin-react`
- **Front-end root:** `web/` (not `src/web/`) — `web/src/App.tsx` is the entry, components in `web/src/components/`
- **Runner:** `tsx` for all CLI/script execution
- **Typecheck:** `npm run typecheck` (checks both `web/tsconfig.json` and `tsconfig.json`)
- **Test:** `npm run test` (builds the web bundle + runs a Playwright smoke test)
- **Build:** `npm run build` → `dist/`

## Key commands

```sh
npm run web              # dev server (hot reload)
npm run web:build        # production build → dist/
npm run typecheck        # TypeScript check (both web + engine)
npm run test             # web build + Playwright smoke test
npm run thumbs           # regenerate portrait thumbnails after a data sync
npm run sim -- <slugs>   # CLI sim run
bash scripts/verify.sh   # full verification (run before committing)
```

## Protected paths — DO NOT EDIT without explicit owner approval

These paths are load-bearing for the sim's accuracy guarantees. **Never modify them** unless the owner explicitly asks:

| Path                                | Why protected                                               |
| ----------------------------------- | ----------------------------------------------------------- |
| `.claude/**`                        | Claude Code's own config, hooks, skills — hands off         |
| `src/engine/**`                     | Frame-tick sim core — any change shifts every unit's damage |
| `data/**`                           | Datamined/game-DB source of truth                           |
| `src/skills/overrides/**`           | Hand-verified per-unit kit models                           |
| `scripts/regression-snapshot*.json` | Pinned regression baselines                                 |

If a front-end task requires data from these paths, **read freely** — just don't write to them.

## Conventions

### General

- **Read before write.** Always read the file you're about to edit. No assumptions about contents.
- **Verify after changes.** Run `npm run typecheck` after any TypeScript change. Run `npm run test` after UI changes.
- **No silent drops.** If a feature can't be fully implemented, surface what's missing — don't quietly skip it.
- **Preserve existing patterns.** Match the surrounding code's naming, structure, and style.

### Front-end specific

- **Read `docs/frontend-conventions.md` before writing any front-end code.** It captures the CSS design tokens, component patterns, naming conventions, and layout patterns used throughout `web/`.
- Components live in `web/src/components/` — check existing components before creating new ones.
- The sim runs entirely client-side — no backend calls from the front end (API proxy is dev-only for auth).
- Portrait images, cube icons, etc. are served from `img/` (mapped via Vite's `publicDir`).
- Share/link features encode team state in URLs — preserve this when modifying routing or state.
- All styles live in `web/src/styles.css` — no CSS modules, no Tailwind, no styled-components.

### Commit hygiene

- Before committing: run `bash scripts/verify.sh` and ensure it passes.
- Before pushing or opening a PR: check if patch notes need updating (`docs/DECISIONS.md` → player-facing notes).
- Keep commits focused — one logical change per commit.

## Domain context (when you need it)

The sim models NIKKE game mechanics with high fidelity. Key concepts if front-end work touches them:

- **Units** are identified by exact slug (e.g. `snow-white`, `snow-white-heavy-arms`) — never conflate base names with variants.
- **Scope lock:** sync 400, skill levels 10/10/10, Base 5 gear, no cube/doll, core 7, partless boss, bossDef 140, auto-play.
- **Damage formula:** multiplicative buckets (ATK × major × element × charge × dmgUp × taken × distributed).
- **Burst rotation:** B1→B2→B3 chain triggers Full Burst (10s window).

For deeper mechanics questions, read:

- `docs/data/game-mechanics.md` — SSOT for all game mechanics
- `docs/data/damage-calculation.md` — SSOT for the damage formula
- `docs/DECISIONS.md` — settled tradeoffs and rulings
- `.claude/skills/context/SKILL.md` — comprehensive context pack (file:line anchors to everything)

## Subagent rules

Before spawning any subagent, read `.claude/subagent-non-negotiables.md` and prepend its rules to the prompt. Key points:

1. **Exact slugs** — never conflate base names with variants (P0 failure).
2. **Measured > fudge** — model real observed mechanics, never invent values to hit a number.
3. **Structured return** — subagents return tight findings blocks, not prose essays.

## File map (front-end relevant)

```
web/
  src/
    App.tsx              # Root component + routing
    main.tsx             # Entry point
    SiteChrome.tsx        # Layout shell
    router.ts            # Route definitions
    components/          # Shared UI components (charts, pills, filters)
    auth.ts              # Backend auth (dev proxy, prod direct)
    teamShare.ts         # URL-encoded team sharing
    shareImage.ts        # Screenshot/share image generation
    portraitThumb.ts     # Character portrait utilities
    DpsChartTab.tsx      # DPS chart view
    MechanicsPage.tsx    # Game mechanics reference page
    PatchNotesPage.tsx   # Patch notes view
    HowToPage.tsx        # Usage guide
    CreditsPage.tsx      # Credits
    DevPage.tsx          # Dev tools
web/public/
  nikke-icons/           # Game UI icons (burst/class/element/manufacturer/weapon PNGs)
  img/portraits/         # Generated portrait thumbnails (npm run thumbs; manifest: web/src/portrait-manifest.json)
  bastion.webp           # Cube icons, Maiden avatar, etc.
data/
  characters.json        # Unit data (slugs, stats, weapons, elements)
  gauge-per-shot.json    # Burst gauge datamine
src/
  engine/sim.ts          # Frame-tick sim core (READ-ONLY for front-end work)
  skills/overrides/      # Per-unit kit models (READ-ONLY)
  cli.ts                 # CLI entry point
docs/
  frontend-conventions.md # CSS tokens, component patterns, naming — READ BEFORE front-end work
  DECISIONS.md            # Settled tradeoffs and rulings
  data/                   # SSOT mechanics + damage formula docs
```
