---
name: Frontend stack and conventions location
description: NIKKE sim front-end is React 18 + Vite 5 in web/, single CSS file, custom router, dark theme. Conventions doc at docs/frontend-conventions.md.
type: project
---

Front-end lives in `web/` — React 18, Vite 5, TypeScript strict, single CSS file (`web/src/styles.css`), custom SPA router (`web/src/router.ts`), no state library. Dark theme with CSS custom properties. System font stack. All styling conventions, design tokens, component patterns, and naming rules documented in `docs/frontend-conventions.md`.

**Why:** User primarily uses Qwen for front-end development in this repo. The conventions doc is the single reference for matching existing code style.

**How to apply:** Before writing any front-end code, read `docs/frontend-conventions.md`. Key rules: named exports only, no CSS modules, use `var(--token)` for colors, `ResizeObserver` for responsive layouts, `border-radius: 999px` for pills, `10px` for cards, `8px` for inputs.
