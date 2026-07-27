# QWEN.md — nikke-sim (Qwen harness shim)

> **Read [CLAUDE.md](CLAUDE.md) first — it is the canonical instruction file and full handoff**
> (hard constraints, verified facts, protected paths, discipline rules, doc taxonomy, conventions).
> Then [docs/STATE.md](docs/STATE.md) for what is landed right now, and
> [docs/handoffs/QUEUE.md](docs/handoffs/QUEUE.md) for live action items.
> This file carries ONLY Qwen-harness-specific content; if it ever disagrees with CLAUDE.md,
> CLAUDE.md wins (and this file is the bug — fix it).

## Qwen's role: front-end first

- **Pre-commit hooks:** Husky + lint-staged run `eslint --fix`, `prettier --write`, and `npm run typecheck` on every commit. If the hook surfaces errors or warnings in files you are committing — even pre-existing ones — fix them as part of your change. Full details in [CLAUDE.md](CLAUDE.md) § "Pre-commit hooks".

Primary use: **front-end development** (React 18 + Vite 5 + TypeScript in `web/`). The sim engine
and data pipeline are mature; treat the protected paths in CLAUDE.md as read-only unless
explicitly asked to change them.

- **Read `docs/frontend-conventions.md` before writing any front-end code** — CSS design tokens,
  component patterns, naming, layout patterns. All styles live in `web/src/styles.css` — no CSS
  modules, no Tailwind, no styled-components.
- The sim runs entirely client-side — no backend calls from the front end (the API proxy is
  dev-only for auth). Share/link features encode team state in URLs — preserve this when modifying
  routing or state.
- Front-end root is `web/` (not `src/web/`): `web/src/App.tsx` entry, components in
  `web/src/components/`.

```sh
npm run web              # dev server (hot reload)
npm run web:build        # production build → dist/
npm run typecheck        # TypeScript check (both web + engine)
npm test                 # web build + client smoke (scripts/web-smoke.mjs)
bash scripts/verify.sh   # the canonical gate — green before anything leaves the machine
```

## Kit-autonomy gauntlet (Qwen drives)

Trigger: "run the kit-autonomy gauntlet on `<slug>`". Qwen drives (S0–S4, S8) and dispatches the
blind roles via the CLI bridges.

- **Procedure (the only source):** `scripts/kit-autonomy/SKILL.md`.
- **Qwen router (model routing + dispatch commands):** `.qwen/skills/kit-autonomy/SKILL.md`.
- **Batch driver agent:** `.qwen/agents/kit-gauntlet-driver.md`.
