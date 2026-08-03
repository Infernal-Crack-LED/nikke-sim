#!/usr/bin/env bash
# verify.sh — the canonical gate for nikke-sim. A change is not done until this
# passes. Fast path (default): typecheck + override validation + regression.
# Full path (verify.sh full): also web build + client-side smoke.
set -euo pipefail
cd "$(dirname "$0")/.."
say() { printf '\n== %s ==\n' "$*"; }

MODE="${1:-}"
case "$MODE" in
  '' | full | deploy | artifacts) ;;
  *)
    echo "verify.sh: unknown tier '$MODE' (expected: <none> | full | deploy | artifacts)" >&2
    exit 2
    ;;
esac

# The `artifacts` tier BUILDS and smokes the deploy outputs without re-running the
# correctness gate — see the tier table below for why the deploy box runs that one.
if [ "$MODE" != "artifacts" ]; then

say "typecheck"
npm run typecheck

say "override validation (every simSupported unit — a synced unit without an override fails here)"
node -e "const d=JSON.parse(require('fs').readFileSync('data/characters.json','utf8')); console.log(Object.values(d.characters).filter(c=>c.simSupported).map(c=>c.slug).join('\n'))" \
  | xargs npx tsx scripts/validate-overrides.ts | tail -2

say "runtime is prose-free (kit parser lives only in scripts/, never in src/ or web/src/)"
test ! -f src/skills/parser.ts
if grep -rnE "from ['\"].*(kit-parser|skills/parser)|parseSkill\(" src web/src --include='*.ts' --include='*.tsx'; then
  echo "FAIL: runtime code imports or calls the kit parser"; exit 1
fi

say "kit-status SSOT structural check (roster coverage + unmodeled/provenance mirrors fresh)"
npx tsx scripts/kit-status.ts --check

say "approved-nickname validation (characters.json nicknames unambiguous)"
npx tsx scripts/validate-nicknames.ts

say "portrait-thumb coverage (ADVISORY — a unit with no committed thumb ships a placeholder card until the build fills it)"
# Advisory, not a gate: build-infographics' portrait gate generates any missing
# thumb at deploy time, so a fresh sync is never a broken deploy — but the
# COMMITTED thumb is the canonical one (browser pipeline, byte-parity with the
# web's runtime fallback), and this is the nudge to run `npm run thumbs`. Not
# fatal because the fix needs a browser + the art CDN, which an isolated engine
# worktree (constraint 8) has no business requiring.
npx tsx scripts/gen-portrait-thumbs.ts --check || true

say "chunked-reload convention (reloadFrames == reload_time × chunks × 0.6 + 21, chunks from reload_bullet)"
npx tsx scripts/check-reload-chunks.ts

say "doc drift (STATE.md §5 false members + exact counts; generated primitive census; resolved-but-UNANSWERED)"
npx tsx scripts/doc-drift.ts

say "sg/accuracy-circle geometry regression (calibration points + §5 cross-check)"
npx tsx scripts/sg-geometry-regression.ts | tail -1

say "engine regression (measured truths + snapshots + seeded determinism)"
npx tsx scripts/regression.ts

say "control regression (720-kit-audit liter/crown/helm support-core suite — damage snapshots)"
npx tsx scripts/control-regression.ts | tail -1

say "unit tests (vitest: engine primitives + per-unit kit specs + generator logic)"
# ONE step by design: the glob in vitest.config.ts (scripts/tests/**/*.test.ts) wires in every
# test file by existing. Naming files individually here is what left 6 of the 9 bespoke tests
# orphaned/unwatched before the 2026-07-23 TDD transition.
npx vitest run

say "overload roll-cost regression (model invariants + analytic/MC + determinism)"
npx tsx scripts/overload-regression.ts

say "doll leveling regression (model invariants + DP monotonicity + throughput + determinism)"
npx tsx scripts/doll-regression.ts

fi # end of the correctness gate (skipped by the `artifacts` tier)

# Tiers:
#   verify.sh          fast  — typecheck + validation + regressions. The everyday gate.
#   verify.sh full     +web  — adds the web build + client smoke. Use this LOCALLY, and it is
#                      what gates a PR (ci.yml) and a push-to-main deploy (deploy.yml).
#   verify.sh deploy   +DPS  — the gate PLUS everything `artifacts` builds. Belt-and-braces; use
#                      it when you want one command to prove a deploy end to end.
#   verify.sh artifacts      — the build outputs ONLY, no gate: the DPS-chart + rank-board
#                      artifacts, the web build, all three client smokes, the infographic
#                      pre-generation (dist/img/** + manifest.json) and the server bundle.
#
# Why the DEPLOY BOX runs `artifacts` and not `deploy` (2026-08-01): railway.json's buildCommand
# used to be the whole `deploy` tier, so every production build re-ran typecheck + every
# regression + the entire vitest suite (~576 CPU-seconds of tests alone) inside a build container
# with a hard BuildKit deadline — work that ci.yml and deploy.yml's gate job already do on the
# SAME commit, on runners with a 30-minute budget and no deadline coupling. That duplication was
# a direct contributor to the DeadlineExceeded build failures. The safety property is unchanged
# because deploy.yml's `gate` job runs `verify.sh full` and the deploy job `needs:` it — a red
# gate still means no deploy; it just fails on a runner instead of inside the build container.
#
# Why the chart smokes sit in `deploy`/`artifacts` and not in `full`: they need dist/{dpschart,burstgen,burstcdr,
# sustain,bufferchart}.json, which come from web/public/ — gitignored BUILD OUTPUTS that the builders
# document in place as "regenerated on every build/deploy, gitignored, and NOT part of verify.sh". A fresh
# git worktree has no such file, so having it in `full` failed every isolated engine worktree
# (CLAUDE.md constraint 8) until a multi-minute build-dpschart run. The deploy box regenerates the
# artifact anyway, so there the smoke is nearly free.
# Committing the artifact instead was rejected: it is derived, changes with every engine/roster
# change (diff noise + conflicts across the concurrent sessions this repo runs), and a stale
# committed copy would let the smoke assert against an OLDER engine's output while reporting green.
if [ "$MODE" = "full" ] || [ "$MODE" = "deploy" ] || [ "$MODE" = "artifacts" ]; then
  # the artifacts must exist BEFORE vite build, which copies publicDir -> dist
  if [ "$MODE" != "full" ]; then
    say "DPS-chart + rank-board artifacts (gitignored build outputs — deploy/artifacts tiers only)"
    npm run dpschart
    npm run ranks:all
  fi
  say "web build + smoke"
  npm run web:build
  node scripts/web-smoke.mjs
  if [ "$MODE" != "full" ]; then
    say "DPS-chart tab smoke (headliners, bars, matrix, compare)"
    node scripts/web-smoke-dpschart.mjs
    say "rank-boards smoke (pills, bars, profile badges, methodology, buffer boards)"
    # tsx, not node: the smoke imports the buffer board's row filter from
    # src/ranks/buffer-rows.ts instead of restating it
    npx tsx scripts/web-smoke-ranks.mjs
    say "infographics pre-generation (dist/img + manifest — deploy/artifacts tiers only; reads the artifacts above, writes after vite's emptyOutDir)"
    npm run build:infographics
    say "server bundle (dist-server — exercises esbuild + asset copies on the deploy platform; startCommand flips to it separately)"
    npm run build:server
  fi
fi

say "verify: all checks passed"
