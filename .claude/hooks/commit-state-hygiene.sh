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
# ─── r3 (2026-07-26) — SLIMMED TO TWO DUTIES ────────────────────────────────────────────────────
# Owner ruling 2026-07-26 (docs-and-audit-workflow-review §5.4): the queue moved out of CLAUDE.md
# into docs/handoffs/QUEUE.md (duty 1 now points there), and the open-questions re-filing duty is
# DELETED — single U-numbering + the doc-drift.ts UNANSWERED lint carry it mechanically. What
# remains: queue/handoff closure + STATE.md sync.
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

msg="[state-hygiene · once per session] Before this session's work leaves the machine, reconcile the living state docs — this may be BATCHED to the end of the session, not done per commit: (1) docs/handoffs/QUEUE.md — delete items that LANDED and are recorded in docs/DECISIONS.md / docs/STATE.md, keep only genuinely-open ones; finished handoffs → 'CLOSED (date)' + mv to docs/handoffs/closed/; (2) if a live engine flag/default/constant/rotation rule/geometry model changed, update docs/STATE.md (derived index, must track the engine). Resolved open-questions are gated mechanically by scripts/doc-drift.ts in verify.sh (move them to docs/answered-questions.md, single U-numbering). Full rules: docs/CONVENTIONS.md."
printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","additionalContext":"%s"}}\n' "$msg"
echo "$msg" >&2
exit 0
