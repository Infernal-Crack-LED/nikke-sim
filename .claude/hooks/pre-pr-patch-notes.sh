#!/usr/bin/env bash
# pre-pr-patch-notes.sh — FAIL-OPEN PreToolUse nudge for nikke-sim.
# When a `git push` or `gh pr create` is about to run, remind to draft patch
# notes (the /patch-notes skill) for owner approval first. Never blocks; every
# path exits 0. Mirrors the fail-open style of stop-doc-drift.sh.
set -u
input="$(cat 2>/dev/null)" || exit 0
[ -n "$input" ] || exit 0
# match a push or PR-creation command anywhere in the tool input JSON
printf '%s' "$input" | grep -Eq 'git[[:space:]]+push|gh[[:space:]]+pr[[:space:]]+create' || exit 0
msg="[patch-notes] About to push / open a PR — run /patch-notes to draft player-facing patch notes from docs/DECISIONS.md and get owner approval before this lands (skip if already done this session)."
# Newer harness: surface as added context without blocking. Fail-open if the
# field is ignored — the reminder simply won't render.
printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","additionalContext":"%s"}}\n' "$msg"
# Also echo for transcript visibility.
echo "$msg" >&2
exit 0
