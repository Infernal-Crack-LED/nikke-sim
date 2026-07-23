#!/usr/bin/env bash
# verify.sh — the canonical gate for nikke-sim. A change is not done until this
# passes. Fast path (default): typecheck + override validation + regression.
# Full path (verify.sh full): also web build + client-side smoke.
set -euo pipefail
cd "$(dirname "$0")/.."
say() { printf '\n== %s ==\n' "$*"; }

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

say "chunked-reload convention (reloadFrames == reload_time × chunks × 0.6 + 21, chunks from reload_bullet)"
npx tsx scripts/check-reload-chunks.ts

say "doc drift (STATE.md §5 false members + exact counts; generated primitive census; resolved-but-UNANSWERED)"
npx tsx scripts/doc-drift.ts

say "sg/accuracy-circle geometry regression (calibration points + §5 cross-check)"
npx tsx scripts/sg-geometry-regression.ts | tail -1

say "engine regression (measured truths + snapshots + seeded determinism)"
npx tsx scripts/regression.ts

say "engine primitive tests (reload-triggered buff removal)"
npx tsx scripts/tests/reload-buff-removal.test.ts | tail -1

say "engine primitive tests (named target-status gate — name-keying + multi-status isolation)"
npx tsx scripts/tests/target-status-gate.test.ts | tail -1

say "overload roll-cost regression (model invariants + analytic/MC + determinism)"
npx tsx scripts/overload-regression.ts

say "doll leveling regression (model invariants + DP monotonicity + throughput + determinism)"
npx tsx scripts/doll-regression.ts

# Tiers:
#   verify.sh          fast  — typecheck + validation + regressions. The everyday gate.
#   verify.sh full     +web  — adds the web build + client smoke. Use this LOCALLY.
#   verify.sh deploy   +DPS  — adds the DPS-chart artifact build + chart-tab smoke. CI/deploy only.
#
# Why the DPS-chart smoke sits in `deploy` and not in `full`: it needs dist/dpschart.json, which
# comes from web/public/dpschart.json — a gitignored BUILD OUTPUT that build-dpschart.ts documents
# in place as "regenerated on every build/deploy, gitignored, and NOT part of verify.sh". A fresh
# git worktree has no such file, so having it in `full` failed every isolated engine worktree
# (CLAUDE.md constraint 8) until a multi-minute build-dpschart run. The deploy box regenerates the
# artifact anyway, so there the smoke is nearly free.
# Committing the artifact instead was rejected: it is derived, changes with every engine/roster
# change (diff noise + conflicts across the concurrent sessions this repo runs), and a stale
# committed copy would let the smoke assert against an OLDER engine's output while reporting green.
MODE="${1:-}"
if [ "$MODE" = "full" ] || [ "$MODE" = "deploy" ]; then
  # the artifact must exist BEFORE vite build, which copies publicDir -> dist
  if [ "$MODE" = "deploy" ]; then
    say "DPS-chart artifact (gitignored build output — deploy tier only)"
    npm run dpschart
  fi
  say "web build + smoke"
  npm run web:build
  node scripts/web-smoke.mjs
  if [ "$MODE" = "deploy" ]; then
    say "DPS-chart tab smoke (headliners, bars, matrix, compare)"
    node scripts/web-smoke-dpschart.mjs
  fi
fi

say "verify: all checks passed"
