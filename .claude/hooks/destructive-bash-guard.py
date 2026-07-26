#!/usr/bin/env python3
# destructive-bash-guard.py — NEW PreToolUse hook on the Bash matcher (2026-07-21, hardened r2).
#
# Closes the coverage gap that caused the 2026-07-21 clobber: the discipline hook only watched
# Edit/Write/Agent, so the *highest-risk* actions — destructive working-tree git ops on the SHARED
# worktree — had NO guard. This asks (interactive) / denies (autonomous) before a command that
# irrecoverably discards uncommitted changes another session may own. Read-only git, stash
# save/list/pop/apply, commit, and `worktree add` all PASS.
#
#
# r2 hardening over the first draft:
#   - quoted strings stripped before matching (a commit message MENTIONING `git restore` no longer trips)
#   - command split into segments on && / || / | / ; / & — each segment judged alone
#   - `git restore --staged` exempted (index-only, working tree untouched) unless --worktree/-W
#   - added: `git checkout -f/--force`, `git checkout ./path`, `git switch -f/--force/--discard-changes`,
#     `git worktree remove -f/--force`, split-flag `rm -r -f` / `--recursive --force`
#   - the ask/deny reason names the exact op that matched
#
# Fail-OPEN on any parse error (never blocks legitimate work by accident).
import json, os, re, sys

try:
    data = json.loads(sys.stdin.read())
except Exception:
    sys.exit(0)  # fail-open

if data.get("tool_name") != "Bash":
    sys.exit(0)
cmd = (data.get("tool_input", {}) or {}).get("command", "") or ""
if not cmd:
    sys.exit(0)


def flag(seg, *names):
    """True if any of the given flags appears as a word in the segment (case-sensitive)."""
    return any(re.search(r"(^|\s)" + re.escape(n) + r"(=|\s|$)", seg) for n in names)


def judge(seg):
    """Return a short reason string if this command segment is destructive to uncommitted work, else None."""
    s = seg.strip()
    if not re.search(r"(^|\s)(git|rm)\s", s + " "):
        return None

    if re.search(r"\bgit\s+restore\b", s):
        # --staged/-S alone only resets the INDEX (working tree untouched) — safe.
        if flag(s, "--staged", "-S") and not flag(s, "--worktree", "-W"):
            return None
        return "`git restore` discards uncommitted working-tree changes"

    if re.search(r"\bgit\s+checkout\b", s):
        if re.search(r"\s--(\s|$)", s) or re.search(r"\s\.(/\S*)?(\s|$)", s):
            return "`git checkout -- <path>` / `git checkout .` discards uncommitted changes"
        if flag(s, "-f", "--force"):
            return "`git checkout --force` discards uncommitted changes on switch"
        return None  # plain branch checkout / -b are safe (git refuses if changes would be lost)

    if re.search(r"\bgit\s+switch\b", s) and flag(s, "-f", "--force", "--discard-changes"):
        return "`git switch --discard-changes` throws away local modifications"

    if re.search(r"\bgit\s+reset\b", s) and flag(s, "--hard"):
        return "`git reset --hard` discards uncommitted changes"

    if re.search(r"\bgit\s+clean\b", s) and (re.search(r"(^|\s)-[a-zA-Z]*f", s) or flag(s, "--force")):
        return "`git clean -f` deletes untracked files"

    if re.search(r"\bgit\s+stash\s+(drop|clear)\b", s):
        return "`git stash drop/clear` destroys stashed work"

    if re.search(r"\bgit\s+push\b", s) and (flag(s, "-f", "--force") or re.search(r"--force-with-lease", s)):
        return "`git push --force` rewrites remote history (and pushing is owner-gated anyway)"

    if re.search(r"\bgit\s+branch\b", s) and flag(s, "-D"):
        return "`git branch -D` force-deletes a branch (may drop unmerged commits)"

    if re.search(r"\bgit\s+worktree\s+remove\b", s) and flag(s, "-f", "--force"):
        return "`git worktree remove --force` deletes a worktree including uncommitted changes"

    if re.search(r"(^|\s)rm\s", s):
        recursive = re.search(r"(^|\s)-[a-zA-Z]*[rR]", s) or flag(s, "--recursive")
        force = re.search(r"(^|\s)-[a-zA-Z]*f", s) or flag(s, "--force")
        if recursive and force:
            return "`rm -rf` irreversibly deletes a tree"

    return None


# Strip quoted strings so a commit message / echo MENTIONING a destructive op doesn't trip the guard,
# then judge each pipeline/sequence segment independently.
scrubbed = re.sub(r"'[^']*'|\"[^\"]*\"", " ", cmd)
reason_hit = None
for seg in re.split(r"&&|\|\||[|;&\n]", scrubbed):
    reason_hit = judge(seg)
    if reason_hit:
        break

if not reason_hit:
    sys.exit(0)

auton = os.environ.get("NIKKE_AUTONOMOUS", "")
decision = "deny" if (auton and auton not in ("0", "false")) else "ask"
reason = (
    f"DESTRUCTIVE WORKING-TREE OP on a SHARED worktree — {reason_hit}. This can irrecoverably discard "
    "uncommitted changes that ANOTHER concurrent session owns (the 2026-07-21 clobber was exactly this — "
    "`git restore src/engine/sim.ts` wiped another agent's in-flight code; unstaged discards are not in "
    "the reflog). Instead: `git stash` (recoverable via stash pop/apply), a surgical Edit-tool reversal of "
    "only YOUR lines, or do the change on an isolated `git worktree`. Read-only git (status/log/diff), "
    "`git stash save/list/pop/apply`, `git commit`, and `git worktree add` are all fine — re-run one of those."
    + (" AUTONOMOUS run: do NOT retry variants; note the intent in docs/handoffs/autonomous-edit-queue.md "
       "and continue with a non-destructive alternative." if decision == "deny" else "")
)
print(json.dumps({"hookSpecificOutput": {"hookEventName": "PreToolUse",
                                         "permissionDecision": decision,
                                         "permissionDecisionReason": reason}}))
sys.exit(0)
