#!/bin/bash
# blind-restore.sh — restore every file backed up by blind-prep.sh (undoes the scrub + re-adds the
# deleted target override), then verify the committed scrub-targets are back to a clean git state.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
BK="scratchpad/blind-backup"
[ -d "$BK" ] || { echo "no backup at $BK"; exit 1; }

# copy every backed-up file back to its original path
while IFS= read -r bf; do
  orig="${bf#"$BK"/}"
  mkdir -p "$(dirname "$orig")"
  cp "$bf" "$orig"
done < <(find "$BK" -type f)

echo "blind-restore: files restored from $BK"
echo "=== verify: committed scrub-targets should be CLEAN (no diff vs HEAD) ==="
# overrides + the public-tracked docs must show no diff; CLAUDE.md is private-tracked (skip)
git diff --stat -- src/skills/overrides docs/DECISIONS.md docs/open-questions.md docs/modeling-priors.md || true
if git diff --quiet -- src/skills/overrides docs/DECISIONS.md docs/open-questions.md docs/modeling-priors.md; then
  echo "CLEAN — restore verified for public-tracked scrub targets."
else
  echo "!!! DIRTY — restore INCOMPLETE, inspect before proceeding."
fi
