#!/usr/bin/env bash
# commit-state-hygiene.sh — FAIL-OPEN PreToolUse nudge for nikke-sim.
# When a commit is about to run (`git commit`), remind to reconcile the living
# state docs. Never blocks; every path exits 0.
#
# ─── r2 (2026-07-25) — ONCE PER SESSION, AND MUCH SHORTER ────────────────────────────────────────
# Two problems with the previous version, both cost rather than correctness:
#   1. It fired on EVERY commit with a ~250-word instruction wall. CLAUDE.md constraint 2 says "commit
#      early and often" — so the guard that encourages frequent commits was paired with a hook that
#      taxed each one, and each firing invited a doc-tidying detour mid-task. Those two rules fought,
#      and in an autonomous run the tax compounds. It now fires AT MOST ONCE per session (marker file
#      keyed on session_id in TMPDIR, so it self-expires) — the trigger accuracy of "on commit" is kept,
#      the repetition is not.
#   2. The message inlined detail that already lives in docs/CONVENTIONS.md and the
#      next-increment-state-hygiene memory. Now it points instead of restating, and explicitly says the
#      reconciliation may be BATCHED to the end of the session rather than done per commit — the
#      mechanically-checkable half is already gated by scripts/doc-drift.ts in verify.sh.
set -u
input="$(cat 2>/dev/null)" || exit 0
[ -n "$input" ] || exit 0
# match a commit command anywhere in the tool input JSON
printf '%s' "$input" | grep -Eq 'git[[:space:]]+commit' || exit 0

# --- once-per-session gate -----------------------------------------------------------------------
sid="$(printf '%s' "$input" | python3 -c 'import json,sys
try: print(json.load(sys.stdin).get("session_id","") or "nosid")
except Exception: print("nosid")' 2>/dev/null)"
marker="${TMPDIR:-/tmp}/nikke-state-hygiene-${sid}"
[ -f "$marker" ] && exit 0
: > "$marker" 2>/dev/null || true

msg="[state-hygiene · once per session] Before this session's work leaves the machine, reconcile the living state docs — this may be BATCHED to the end of the session, not done per commit: (1) CLAUDE.md NEXT INCREMENT — delete items that LANDED and are recorded in docs/DECISIONS.md, keep only genuinely-open ones; (2) finished handoffs → 'CLOSED (date)' + mv to docs/handoffs/closed/; (3) if a live engine flag/default/constant/rotation rule/geometry model changed, update docs/STATE.md (derived index, must track the engine); (4) RE-FILE THE QUESTION — if something was RESOLVED/REFUTED/SUPERSEDED, close it in the doc that POSES it too (docs/open-questions.md UNANSWERED→ANSWERED as 'A<n> (U<n>)', plus any status table or 'open owner rulings' section), not only in DECISIONS + the code; a resolution recorded only in DECISIONS leaves every future session reading the stale question as live. Full rules: docs/CONVENTIONS.md + the next-increment-state-hygiene memory. The mechanically-checkable half is already gated by scripts/doc-drift.ts in verify.sh."
printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","additionalContext":"%s"}}\n' "$msg"
echo "$msg" >&2
exit 0
