# AGENTS.md — nikke-sim

Guidance for AI coding agents working in this repository. Read this first, then
`CLAUDE.md` (the full session handoff) and `docs/STATE.md` (the landed-state registry)
before non-trivial work.

## Project overview

A frame-tick damage simulator for **NIKKE solo raids**, run by its owner on a Mac. The sim
predicts per-unit damage for 5-unit teams over a 180-second fight against a raid boss, and
is continuously validated against **real recorded fights** (screenshots + video under a
fixed "scope lock" preset) with the goal of driving sim-vs-real error to **±3% per unit**.
The same engine powers:

- a **CLI** (`src/cli.ts`, run via `npm run sim`),
- a **static website** (`web/`, Vite + React 18) that runs the engine client-side in the
  browser (deployed at `https://nikkesim.app`),
- a community-facing docs layer (`docs/`).

This is a research-grade accuracy project, not just a calculator: most of the tooling is
about measuring the real game (video probes, OCR/CV readers) and keeping the sim honest
against those measurements.

## Technology stack

- **Language:** TypeScript, strict mode, ES2022 target, `module: NodeNext`, ESM (`"type": "module"`).
- **Runtime:** Node.js 22.22.3 (see `.nvmrc`); scripts run via `tsx`.
- **Web:** Vite 5 + `@vitejs/plugin-react`, React 18 (functional components + hooks only),
  single CSS file, custom pushState router — no React Router, no global store, no Tailwind
  (see `docs/frontend-conventions.md`).
- **Testing:** Vitest (node environment) + bespoke `tsx` regression harnesses; Playwright
  and jsdom for UI smoke scripts.
- **Data sync:** `pg` + `dotenv` — pulls roster/stat data from a Postgres DB and external
  APIs into `data/*.json` (requires `DATABASE_PUBLIC_URL` in `.env`).
- **No backend for the site itself** — production serving is a tiny zero-dependency static
  server (`scripts/serve.mjs`) with per-tab Open Graph tags and SPA fallback.

## Repository layout

- `src/engine/sim.ts` — **the engine**: 60 fps frame simulation. Weapon fire cycles (AR/SMG/
  SG/MG/RL/SR cadences, MG wind-up ladder, charge weapons + release latency), burst-gauge
  generation, burst rotation state machine (chain windows, cooldowns, Full Burst timing),
  buff engine, damage buckets, seeded Monte Carlo (`cfg.seed`), structured event log
  (`cfg.onEvent`). Geometry helpers live alongside it (`sg-geometry.ts`, `unigeo*.ts`).
- `src/skills/` — kit model types + **`overrides/<slug>.json`**: one hand-authored/validated
  JSON per supported unit that is the _complete_ description of its kit (the engine never
  parses skill prose at runtime). `validate-overrides.ts` (in `scripts/`) checks them all.
- `src/data/` — data sync scripts (DB + APIs → `data/*.json`).
- `src/` top level — CLI (`cli.ts`), stat/team prep (`stats.ts`, `prepare.ts`, `teamcalc.ts`),
  overload/doll optimizers (`bestol.ts`, `olcalc.ts`, `overload/`, `doll/`), DPS chart
  (`dpschart/`), share-card rendering (`share/`).
- `data/` — synced JSON datasets: `characters.json` (roster + stats), `gauge-per-shot.json`
  (datamined), cubes, OL lines, skill levels, `kit-status.json` (per-unit tuning provenance
  SSOT), `sources.json` (external-source accreditation registry).
- `scripts/` — the tooling backbone:
  - `verify.sh` — the canonical gate (see below).
  - `regression.ts` + `regression-snapshot.json` — measured-truth asserts (full-burst counts
    of graded comps) + per-comp damage snapshots + seeded determinism.
  - `experiment.ts` — the validation lab (all real comps + ratios; env `ONLY=`, `ROT=1`,
    `SEEDS=N`, `DBG_*`). `board-read.ts` prints the accuracy board.
  - `tests/` — Vitest suites: `engine/` (primitive tests), `units/<slug>.test.ts` (per-unit
    kit specs), `generators/`, `lib/harness.ts` (shared fixtures).
  - `probe/` — recording-processing instruments (CV/OCR readers for burst counts, ammo
    counters, damage popups, battle-records screens).
  - `serve.mjs`, `prerender.mjs`, `web-smoke.mjs`, `build-dpschart.ts` — web build/serve.
- `web/` — the React SPA (`web/src/`). Sim runs client-side via a worker pool
  (`simPool.ts`/`simWorker.ts`). `web/public/` static assets.
- `docs/` — the documentation system (see "Docs authority" below): `STATE.md`,
  `DECISIONS.md`, `CONVENTIONS.md`, `data/game-mechanics.md` + `data/damage-calculation.md`
  (mechanics source-of-truth pair), `open-questions.md`, `probe-runs.md` (measurement log),
  `VALIDATION-INDEX.md` (where ground truth already lives), `handoffs/` (AI-facing session
  state), `probe-data/` (labeled measurement JSON).
- `deploy/launchd/` — a launchd plist for the owner's Mac.
- `scratchpad/`, `docs/probes/` — ephemeral probe workspaces and recordings (gitignored).
- `.claude/` — the owner's agent harness: skills (`/scientific-method`, `/kit-tdd`,
  `/probe-processing`, …), PreToolUse hooks (protected-path guard, discipline nudges),
  and custom subagents.

## Build and test commands

- `npm run sync` / `npm run sync:skills` — refresh `data/*.json` from DB/APIs (needs `.env`).
- `npm run sim -- <5 slugs> [options]` — run the CLI sim (see `README.md` for options).
- `npm run web` — Vite dev server (proxies `/api` + `/auth` to the deployed backend).
- `npm run web:build` (alias `npm run build`) — production build into `dist/` + prerender.
- `npm run web:preview` / `npm start` — preview / serve built `dist/` (port 4173 or `$PORT`).
- `npm run typecheck` — `tsc --noEmit` for both `tsconfig.json` (src+scripts) and
  `web/tsconfig.json`.
- `npm run test:unit` (`npx vitest run`) — all tests under `scripts/tests/**/*.test.ts`.
- `npm test` — web build + client smoke (`scripts/web-smoke.mjs`).

### The canonical gate: `bash scripts/verify.sh`

Run this before considering any change done. Tiers:

- `verify.sh` (fast, the everyday gate) — typecheck, override validation for every
  `simSupported` unit, prose-free-runtime check, `kit-status.json` structural check,
  nickname validation, reload-chunk convention, doc-drift lint, SG-geometry regression,
  engine regression, control regression, `vitest run`, overload + doll regressions.
- `verify.sh full` — adds web build + client smoke. Use locally before web-facing changes.
- `verify.sh deploy` — adds the DPS-chart artifact build + chart smoke. CI/deploy only.

**Regression snapshot discipline:** `scripts/regression.ts --update` regenerates snapshots
only _together with the change it reflects_ — never to silence an unexplained failure.
Measured-truth asserts (recorded full-burst counts) are never updated without a new
measurement.

## Development conventions

### Evidence tiers (from `docs/CONVENTIONS.md`)

Every mechanic/value carries a tier that determines what it takes to change it:
**MEASURED** (frame-counted from our recordings — never refit without new footage) >
**DATAMINED** (decoded game tables) > **COMMUNITY** (multi-source verified, cite links) >
**CALIBRATED ⚑** (fitted against validated fights — standing refit candidates, tracked in
`docs/open-questions.md`). Per-unit provenance lives in `data/kit-status.json`.

### Validation methodology

All real runs use the **scope-lock preset**: no cube, no doll, Base 5 gear, 3★ core 7,
sync 400, skills 10/10/10, partless boss, 100% core exposure, full auto, 180 s. Single-run
repeatability is 0.5–3.5% per unit, so deltas under ~5% are noise; the ±3% goal is judged
on multi-run averages with a declared camera-focus unit.

**Ratio direction — do not conflate:** board/harness tools report `ratio = sim/real`
(>1 = HOT, sim over-models); solo probe-data recons report `realOverSim = real/sim`
(the inverse). Check which formula produced a number before acting on it.

### Doc authority order

1. `docs/STATE.md` — what is landed _right now_ (default first read; derived index — on
   conflict with code, STATE.md is the bug).
2. `docs/DECISIONS.md` — settled WHY (append-only; do not re-litigate without same-tier
   new evidence).
3. `docs/data/game-mechanics.md` + `docs/data/damage-calculation.md` — mechanics source of
   truth; live engine code wins on "what does the sim do".
4. `docs/open-questions.md`, 5. `docs/handoffs/*`, 6. everything else.

Docs come in two hygiene classes: **CHANGELOG** (append-only, mark `SUPERSEDED (date)`,
never delete: DECISIONS, probe-runs, ANSWERED questions, `data/sources.json`) and
**CURRENT-STATE** (freely rewritten, stale content deleted after capture-first: STATE.md,
CONVENTIONS.md, `docs/data/*.md`, override JSON prose fields). Human-facing docs
(`docs/data/*`, open-questions, probe-runs, DECISIONS) use **no invented abbreviations**;
AI-facing docs (handoffs, override notes) may use shorthand.

**Before deriving any ground truth by hand**, check `docs/VALIDATION-INDEX.md` — the repo
already holds a large labeled corpus (snapshots, probe-data JSON, vitest pins), and reusing
it is the correct validation, not a shortcut.

### Code style

- TypeScript strict; match the surrounding file's idioms (comment density, naming).
- Front end: follow `docs/frontend-conventions.md` (hooks only, single `styles.css`,
  custom router, JSON imports from `data/`).
- Tests live under `scripts/tests/`, **never** under `src/engine/` — new test files are
  wired in by existing (Vitest globs `scripts/tests/**/*.test.ts`); don't edit verify.sh
  to add a test.
- Engine env flags (`DOTCRIT`, `SMGRATE`, …) are A/B knobs with documented defaults in
  `docs/STATE.md` §1 — the browser bundle always runs the defaults.

## Git workflow and safety

- **Commit early and often; never push unless the owner asks.** `verify.sh` must be green
  before anything leaves the machine. Agent-authored commits end with the trailer
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- **NEVER discard working-tree changes** with `git restore` / `git checkout -- <path>` /
  `git reset --hard` — this worktree is shared by concurrent sessions and those commands
  destroy others' uncommitted work. Use `git stash` or surgically reverse your own edits.

## Security considerations

- **Never commit `.env` or `.git-credential-pat.sh`** (both gitignored): they hold the DB
  URL and a fine-grained GitHub PAT. Pushes authenticate as the repo-local PAT identity,
  not the machine's global account.
- Don't read or transmit secrets via shell commands; keep operations inside the working
  directory.
- The site is a static client-side app — the only network surface is the dev-server proxy
  to the owner's backend and the data-sync scripts' DB/API access.

## Deployment

- **Railway** (`railway.json`): build command `bash scripts/verify.sh deploy` (full gate +
  DPS-chart artifact), start command `npm run start` → `scripts/serve.mjs`, a static file
  server for `dist/` with SPA fallback and per-tab OG/Twitter embed metadata, binding
  `$PORT` on 0.0.0.0.
- The DPS-chart artifact (`web/public/dpschart.json`) is a gitignored build output,
  regenerated by `npm run dpschart` on every deploy — never commit it.
- The site can in principle be deployed anywhere that serves static files (`dist/`).

## Carried-over memories (non-model-specific, from CLAUDE.md / Qwen memory)

Durable facts and rules that predate this file and are not restated above:

- **Exact-slug is P0.** Many NIKKEs share a base name with a variant (`snow-white` vs
  `snow-white-heavy-arms`) with entirely different kit/weapon/element — conflating them is a
  P0 failure. Units only by full name, exact slug, or an approved nickname;
  `scripts/lint-slug-disambiguation.ts` flags bare base names.
- **Battle Records ⚔ is Combat Power, NOT ATK** — never use it as a sim ATK input; community
  footage therefore carries no usable per-unit ATK.
- **Camera-focus charge weapon generates ×2.5 burst gauge** (focus-only, measured both ways;
  focus defaults to the middle slot). Burst-cast damage lands before Full Burst begins (no
  +50%, no entry auras).
- **Scope-lock class static ATK @ Base 5:** Attacker 118,027 / Supporter 98,367 / Defender
  78,707 — ATK is class-based; a per-unit-varying "stat" is not ATK (anchors in
  `data/reference-stats.json`).
- **Measurement ≠ enactment.** n=1 / one recording / MEDIUM-confidence RECORDS an observation
  (measurement log, open-questions UNANSWERED); it never in the same motion flips a
  constant/default, stamps VALIDATED/REFUTED/SUPERSEDED, or overturns a DECISIONS entry —
  those need ≥ same-tier evidence at n≥5 or independent confirmation, plus a separate gated
  enactment pass.
- **Sufficiency / reuse-before-derive.** An existing labeled fixture (vitest pins, regression
  snapshot, `docs/probe-data/*.json`, `docs/probe-runs.md`) IS an independent method — running
  the harness against it is the validation, not a shortcut. When the bar is met, ACT; do not
  escalate a met bar into a larger investigation.
- **Override prose describes the unit AS MODELED TODAY** — `note`/`caveats` carry no history,
  no "previously believed", no superseded-value trail (owner ruling 2026-07-22; the WHY goes
  in `docs/DECISIONS.md`). Delete such wording on sight, capture-first.
- **Subagent non-negotiables** (`.claude/subagent-non-negotiables.md`): exact slugs,
  measured>fudge, structured findings return — paste at the top of every empirical subagent
  prompt, and verify your own premises before spawning.
- **State hygiene when wrapping up:** delete landed items from CLAUDE.md NEXT INCREMENT,
  `CLOSED (date)` + `mv` finished handoffs into `docs/handoffs/closed/`, update `docs/STATE.md`
  if a live flag/default/constant/rotation rule changed, and re-file resolved questions in
  `docs/open-questions.md` (UNANSWERED→ANSWERED as `A<n> (U<n>)`) — a resolution recorded only
  in DECISIONS leaves the stale question reading as live.
- **Front-end memory (from Qwen):** read `docs/frontend-conventions.md` before any UI work —
  named exports only, no CSS modules, `var(--token)` colors, `ResizeObserver` for responsive
  layouts, pills `border-radius: 999px`, cards 10px, inputs 8px.
