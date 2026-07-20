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

say "sg/accuracy-circle geometry regression (calibration points + §5 cross-check)"
npx tsx scripts/sg-geometry-regression.ts | tail -1

say "engine regression (measured truths + snapshots + seeded determinism)"
npx tsx scripts/regression.ts

say "overload roll-cost regression (model invariants + analytic/MC + determinism)"
npx tsx scripts/overload-regression.ts

say "doll leveling regression (model invariants + DP monotonicity + throughput + determinism)"
npx tsx scripts/doll-regression.ts

if [ "${1:-}" = "full" ]; then
  say "web build + smoke"
  npm run web:build
  node scripts/web-smoke.mjs
  node scripts/web-smoke-dpschart.mjs
fi

say "verify: all checks passed"
