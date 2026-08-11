---
name: Frontend stack and conventions location
description: NIKKE sim front-end is React 18 + Vite 5 in web/. docs/frontend-conventions.md is the binding, harness-agnostic reference — styling, routing, SEO, no-JS surface, backend flow, share cards, image pipeline — and doubles as the reusable playbook for future sites.
type: project
---

Front-end lives in `web/` — React 18, Vite 5, TypeScript strict, single CSS file (`web/src/styles.css`, design tokens), custom path-based SPA router (`web/src/router.ts`), no state library, route-level `lazy()` chunks. Dark theme. System font stack + self-hosted Roboto subsets for canvas pixel-parity.

`docs/frontend-conventions.md` is the BINDING reference for all user-visible web work, for every harness and human (not Qwen-specific). Scope: architecture, styling, routing, SEO + embed metadata (three lockstep head tables), the no-JS request-time-injection surface, backend/data flow (TWO backends: same-origin Hono server for static + `/api/v1/img/*`; cross-origin bakery-bot for auth/user data via `web/src/auth.ts` only), share-card/infographic pipelines (`src/infographics/`, browser + Node hosts), and the image pipeline (stepped-halving downscale, portrait tiers). §13 = new-page touch-point checklist; §14 = template for starting new sites (owner plans another video-game community website).

**Why:** the owner wants one durable, harness-neutral playbook so future sites re-design nothing; the doc was generalized 2026-08-11 (previously drifted + was positioned as Qwen's doc).

**How to apply:** Read `docs/frontend-conventions.md` before ANY front-end work. Key invariants: named exports only; no CSS modules; `var(--token)` colors; `ResizeObserver` for responsive; pills 999px / cards 10px / inputs 8px; never fetch sim/game data; bakery-bot calls only via auth.ts; no prerender passes; client never sets og:image. Known hazard the doc records: route titles/descriptions live in THREE tables (useDocumentHead.ts META, static.ts TAB_META, serve.mjs TAB_META) — keep them in lockstep.
