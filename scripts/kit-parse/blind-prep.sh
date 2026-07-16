#!/bin/bash
# blind-prep.sh <slug> "<Display Name>"
# Hard-isolate a unit for the blind kit-parse study (Fable pre-op revision 4):
# back up + scrub the unit's slug/name from every override NOTE + key docs + CLAUDE.md so a blind
# subagent cannot read its parse recipe, then delete its override. Reversible via blind-restore.sh.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
# usage: blind-prep.sh <slug> "<Display Name>" [distinctive-value ...]
# The trailing values are scrubbed too (Fable pre-op: a unique datamined value like "20.99" can
# identify a unit's recipe in the priors/docs even when its NAME is scrubbed — pass such values).
slug="$1"; name="$2"; shift 2; EXTRA=("$@")
BK="scratchpad/blind-backup"
rm -rf "$BK"; mkdir -p "$BK"

# scrub surface: all override JSONs (their notes cross-reference units), the WHY/mechanic docs, CLAUDE.md
# (portable for bash 3.2 — none of these paths contain spaces)
FILES=( $(ls src/skills/overrides/*.json docs/DECISIONS.md docs/open-questions.md docs/modeling-priors.md docs/handoffs/*.md CLAUDE.md 2>/dev/null) )

for f in "${FILES[@]}"; do
  mkdir -p "$BK/$(dirname "$f")"
  cp "$f" "$BK/$f"
done

# scrub slug + display name (+ any distinctive values) -> REDACTED in every surface file
for f in "${FILES[@]}"; do
  sed -i '' "s/${slug}/REDACTED_UNIT/g; s/${name}/REDACTED_UNIT/g" "$f"
  for v in ${EXTRA[@]+"${EXTRA[@]}"}; do
    sed -i '' "s/${v}/REDACTED_VAL/g" "$f"
  done
done

# remove the target override entirely (backed up above, pre-scrub = the REAL hand-tune)
rm -f "src/skills/overrides/${slug}.json"
echo "blind-prep: scrubbed '${slug}'/'${name}' across ${#FILES[@]} files; deleted overrides/${slug}.json; backup=${BK}"
