#!/usr/bin/env bash
# pre-pr-doc-maintenance.sh — FAIL-OPEN PreToolUse nudge for nikke-sim.
# When a `git push` or `gh pr create` is about to run, remind to run the two
# end-of-work reconciliation skills: /doc-maintenance (doc state) and
# /skill-maintenance (durable lessons). Never blocks; every path exits 0.
# Mirrors pre-pr-patch-notes.sh, which covers the third PR-time duty.
#
# ONCE PER SESSION (marker keyed on session_id in TMPDIR, self-expiring) — same
# cost lesson as commit-state-hygiene.sh r2: a nudge that fires on every push
# taxes exactly the behaviour the repo wants to encourage, and each firing
# invites a doc-tidying detour mid-task. The trigger accuracy of "at PR time" is
# what matters; the repetition is not.
#
# It POINTS rather than restates: the procedures live in the two SKILL.md files
# and the normative rules in docs/CONVENTIONS.md, so this message cannot drift
# out of sync with them.
set -u
input="$(cat 2>/dev/null)" || exit 0
[ -n "$input" ] || exit 0
# match a push or PR-creation command anywhere in the tool input JSON
printf '%s' "$input" | grep -Eq 'git[[:space:]]+push|gh[[:space:]]+pr[[:space:]]+create' || exit 0

# --- once-per-session gate -----------------------------------------------------------------------
sid="$(printf '%s' "$input" | python3 -c 'import json,sys
try: print(json.load(sys.stdin).get("session_id","") or "nosid")
except Exception: print("nosid")' 2>/dev/null)"
marker="${TMPDIR:-/tmp}/nikke-pre-pr-doc-maintenance-${sid}"
[ -f "$marker" ] && exit 0
: > "$marker" 2>/dev/null || true

msg="[doc+skill maintenance · once per session] About to push / open a PR — reconcile before it leaves the machine: (1) /doc-maintenance — route each finding to the doc that owns it (landed state -> docs/STATE.md, settled WHY -> docs/DECISIONS.md, open TODO -> docs/handoffs/QUEUE.md), prune LANDED items out of QUEUE.md, close any finished handoff (CLOSED marker, then 'git rm --cached' + plain mv into docs/handoffs/closed/ — archiving UNTRACKS it), and delete stale current-state narration incl. override note/caveats prose; (2) /skill-maintenance — did this teach a repeatable procedure or gotcha that belongs in a skill or a test? Skip either if already done this session."
printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","additionalContext":"%s"}}\n' "$msg"
echo "$msg" >&2
exit 0
