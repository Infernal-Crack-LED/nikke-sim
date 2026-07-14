#!/usr/bin/env bash
# verify.sh — the canonical gate for nikke-sim. A change is not done until this
# passes. Fast path (default): typecheck + override validation + regression.
# Full path (verify.sh full): also web build + client-side smoke.
set -euo pipefail
cd "$(dirname "$0")/.."
say() { printf '\n== %s ==\n' "$*"; }

say "typecheck"
npm run typecheck

say "override validation (all)"
for f in src/skills/overrides/*.json; do basename "$f" .json; done | xargs npx tsx scripts/validate-overrides.ts | tail -2

say "engine regression (measured truths + snapshots + seeded determinism)"
npx tsx scripts/regression.ts

if [ "${1:-}" = "full" ]; then
  say "web build + smoke"
  npm run web:build
  node scripts/web-smoke.mjs
  node scripts/web-smoke-dpschart.mjs
fi

say "verify: all checks passed"
