#!/bin/bash
# batch-prep.sh "slug1|Display Name 1|val,val" "slug2|Display Name 2|val" ...
# Hard-isolate MULTIPLE units at once for a parallel blind kit-parse batch: back up the scrub
# surface ONCE, scrub every unit's slug/name/(distinctive values) across all override notes +
# methodology docs + CLAUDE.md + SKILL.md, THEN delete each target override (deletion last, so the
# scrub loop never sed's an already-removed file). Reversible with batch-restore.sh.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
BK="scratchpad/blind-backup"
rm -rf "$BK"; mkdir -p "$BK"

# scrub surface (portable for bash 3.2 — none of these paths contain spaces)
FILES=( $(ls src/skills/overrides/*.json docs/DECISIONS.md docs/open-questions.md docs/modeling-priors.md docs/handoffs/*.md CLAUDE.md .claude/skills/kit-parse/SKILL.md 2>/dev/null) )
for f in "${FILES[@]}"; do mkdir -p "$BK/$(dirname "$f")"; cp "$f" "$BK/$f"; done

# PHASE 1 — scrub every unit's identifiers across every file (all files still present)
for spec in "$@"; do
  IFS='|' read -r slug name vals <<< "$spec"
  for f in "${FILES[@]}"; do
    [ -f "$f" ] || continue
    sed -i '' "s/${slug}/REDACTED_UNIT/g; s/${name}/REDACTED_UNIT/g" "$f"
    if [ -n "${vals:-}" ]; then
      IFS=',' read -ra VARR <<< "$vals"
      for v in "${VARR[@]}"; do
        [ -n "$v" ] && sed -i '' "s/${v}/REDACTED_VAL/g" "$f"
      done
    fi
  done
  echo "batch-prep: scrubbed '${slug}' ('${name}')"
done

# PHASE 2 — delete the target overrides (after all scrubbing)
for spec in "$@"; do
  IFS='|' read -r slug _ _ <<< "$spec"
  rm -f "src/skills/overrides/${slug}.json"
  echo "batch-prep: deleted override for '${slug}'"
done
echo "batch-prep: ${#} unit(s) isolated across ${#FILES[@]} files; backup=${BK}"
