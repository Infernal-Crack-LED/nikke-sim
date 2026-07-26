#!/usr/bin/env python3
# autonomous-blast-radius.py — NEW PreToolUse hook (2026-07-25), Edit|Write|MultiEdit matcher.
#
# THE PROBLEM IT SOLVES. An autonomous session finds one "fact" — real or hallucinated — and, without
# validating it, begins a large-scale rewrite.
#
# THE MECHANISM. Prose does not hold under long-session momentum — that is the documented lesson behind
# every guard in this directory. So this is a hard cap, not a nudge: in an AUTONOMOUS run only, once the
# working tree carries more than NIKKE_BLAST_LIMIT (default 300) changed lines that are not committed,
# further Edit/Write/MultiEdit is DENIED until the agent commits. It is not a limit on how much work a
# night may produce — it is a limit on how much UNREVIEWED, UNVERIFIED work may accumulate in one
# unbroken swing. Commit (which CLAUDE.md constraint 2 actively encourages, and which is cheap and
# reversible) clears it instantly and the agent continues.
#
# WHY IT IS MEASURED FROM GIT AND NOT ACCUMULATED IN A STATE FILE: no state to corrupt, no session id to
# track, no drift, and it self-clears on commit by construction. `git diff --numstat HEAD` gives tracked
# churn; untracked source files are counted by line. Cost ~10-30ms per write.
#
# ATTENDED SESSIONS ARE UNAFFECTED (exit 0 immediately) — the owner is present and watching the diff.
#
# Fail-OPEN on any error: a broken hook must never block legitimate work.
#
# Wire it (settings.json PreToolUse, matcher "Edit|Write|MultiEdit"), after pre-write-discipline.py:
#   command: python3 "$CLAUDE_PROJECT_DIR/.claude/hooks/autonomous-blast-radius.py"
#
# Tuning: NIKKE_BLAST_LIMIT=<n> at launch. 300 is roughly "one substantial file, or a coherent
# multi-file change" — big enough that no honest single task trips it, small enough that a rewrite does.
import json, os, re, subprocess, sys, pathlib

LIMIT_DEFAULT = 300

# Generated / bulky output that is not "work product to review" — excluded from the count so a probe run
# that legitimately emits large JSON does not trip a guard aimed at source rewrites.
EXCLUDE = re.compile(r"^(docs/probes/|scratchpad/|dist/|node_modules/|\.git|web/dist/|coverage/|"
                     r"docs/handoffs/autonomous-edit-queue/)")
# Only these count as source churn when UNTRACKED (tracked churn is counted by numstat regardless).
SOURCE_EXT = (".ts", ".tsx", ".js", ".mjs", ".jsx", ".py", ".sh", ".md", ".json", ".css", ".html")


def sh(args, cwd):
    return subprocess.run(args, capture_output=True, text=True, timeout=10, cwd=cwd).stdout


try:
    data = json.loads(sys.stdin.read())
except Exception:
    sys.exit(0)  # fail-open

if data.get("tool_name") not in ("Edit", "Write", "MultiEdit"):
    sys.exit(0)

auton = os.environ.get("NIKKE_AUTONOMOUS", "")
if not auton or auton in ("0", "false"):
    sys.exit(0)  # attended: the owner is watching; no cap

proj = os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()

try:
    limit = int(os.environ.get("NIKKE_BLAST_LIMIT") or LIMIT_DEFAULT)
except Exception:
    limit = LIMIT_DEFAULT

try:
    total = 0
    # tracked churn
    for line in sh(["git", "diff", "--numstat", "HEAD"], proj).splitlines():
        parts = line.split("\t")
        if len(parts) != 3:
            continue
        add, dele, fpath = parts
        if EXCLUDE.match(fpath):
            continue
        for n in (add, dele):
            if n.isdigit():
                total += int(n)
    # untracked source files
    for fpath in sh(["git", "ls-files", "--others", "--exclude-standard"], proj).splitlines():
        if not fpath or EXCLUDE.match(fpath) or not fpath.endswith(SOURCE_EXT):
            continue
        p = pathlib.Path(proj) / fpath
        try:
            if p.stat().st_size > 1_000_000:
                continue
            with p.open("rb") as fh:
                total += sum(1 for _ in fh)
        except Exception:
            continue
except Exception:
    sys.exit(0)  # fail-open

if total <= limit:
    sys.exit(0)

reason = (
    f"⛔ AUTONOMOUS BLAST-RADIUS CAP — {total} uncommitted changed lines (limit {limit}). This is not a "
    "limit on how much you may accomplish tonight; it is a limit on how much UNREVIEWED work may pile up "
    "in one unbroken swing, because the failure mode this guards is an unattended run acting on one "
    "unvalidated premise and rewriting broadly before anything checks it.\n"
    "⇒ DO THIS NOW, in order:\n"
    "  1. `bash scripts/verify.sh` (or `npx vitest run` if that is the relevant gate).\n"
    "  2. If GREEN: `git commit` the coherent slice with a message stating WHAT premise the change rests "
    "on and HOW it was verified. Committing is explicitly encouraged (CLAUDE.md constraint 2) and is "
    "cheap/reversible — pushing is the owner-gated step, not committing. The cap clears immediately and "
    "you continue.\n"
    "  2b. If a `git worktree` isolation branch is the right home for this (engine-adjacent or "
    "high-contention work, CLAUDE.md constraint 8), commit it THERE.\n"
    "  3. If RED, or you cannot state the premise and its verification in one sentence: STOP this thread. "
    "Write what you have to a handoff doc, note the failing gate, and move to unrelated queued work. Do "
    "NOT keep editing, and do NOT split the same rewrite into smaller writes to slip under the cap — "
    "that defeats the guard and you will be reviewed on the total diff regardless.\n"
    "  4. `git stash` is available if the slice is not commit-worthy (never `git restore`/`reset --hard` "
    "— shared worktree, CLAUDE.md constraint 7)."
)

print(json.dumps({"hookSpecificOutput": {"hookEventName": "PreToolUse",
                                         "permissionDecision": "deny",
                                         "permissionDecisionReason": reason}}))
sys.exit(0)
