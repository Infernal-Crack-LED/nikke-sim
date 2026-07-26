#!/usr/bin/env bash
# stop-doc-drift.sh — FAIL-OPEN Stop-hook nudge for nikke-sim.
# If engine/data/override sources changed but the mechanics source-of-truth docs
# didn't, print ONE reminder line. Never blocks; every path exits 0.
set -u
command -v git >/dev/null 2>&1 || exit 0
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0
changed="$(
  {
    git diff --name-only HEAD 2>/dev/null
    git diff --name-only --cached 2>/dev/null
  } | sort -u
)" || exit 0
[ -n "$changed" ] || exit 0
# engine mechanics, gauge/skill data, or override semantics changed?
printf '%s\n' "$changed" | grep -Eq '^(src/engine/|src/skills/|data/gauge-per-shot\.json)' || exit 0
# did a source-of-truth doc move too?
printf '%s\n' "$changed" | grep -Eq '^docs/data/(game-mechanics|damage-calculation)\.md' && exit 0
echo "[doc-drift] Engine/override/gauge-data changed but docs/data/game-mechanics.md and docs/data/damage-calculation.md did not — run /mechanics-doc-upkeep before wrapping up (and docs/DECISIONS.md if a tradeoff was settled)."
exit 0
