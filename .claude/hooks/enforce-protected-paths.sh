#!/usr/bin/env bash
# enforce-protected-paths.sh — PreToolUse guard for protected paths (2026-07-18, "Path 2" model).
# r4 (2026-07-25): CAPTURE-ON-DENY + the SESSION-UNLOCK ALLOW fix. See the two blocks below.
# Wired on BOTH the Bash matcher and the Edit|Write|MultiEdit matcher.
#
# Two tiers of protected path:
#   GUARD  = .claude/hooks/**, .claude/settings*.json   → ALWAYS permissionDecision:"deny" (hard,
#            self-protecting; also covered by permissions.deny for the Edit tool — this adds the Bash
#            path + defense-in-depth). No session may disable the guard.
#   CONTENT= src/engine/**, data/**, src/skills/overrides/**  → permissionDecision:"ask" — a per-session
#            approval prompt (renders in the VSCode extension UI). Engine/data/override edits can NEVER be
#            made SILENTLY; the owner approves per session (or "yes for this session").
#
# ─── r4 CHANGE 1: CAPTURE-ON-DENY ────────────────────────────────────────────────────────────────
# A deny used to throw away the WORK. The agent had composed an exact edit — content, path, the old
# string it was replacing — and the hook discarded all of it, leaving the agent to re-derive the change
# from prose later (or, more often, leaving the owner a vague one-line queue entry). Every deny now
# WRITES THE ATTEMPTED PAYLOAD VERBATIM to docs/handoffs/autonomous-edit-queue/<ts>-<class>-<slug>.md
# and appends an index line to docs/handoffs/autonomous-edit-queue.md, BEFORE denying. The deny reason
# names the capture file and asks the agent for the one thing the hook cannot capture: the WHY
# (rationale, evidence tier + n, expected board effect). Mechanical content is never re-derived.
#   - GUARD denies capture ALWAYS (attended too) — a proposed hook/settings change is exactly the thing
#     that must survive to owner review, and Claude cannot write it to .claude/ by definition.
#   - CONTENT denies capture in AUTONOMOUS mode only. Attended CONTENT gets an `ask` the owner can
#     approve, so nothing is lost; capturing every prompt would just be clutter.
#
# ─── r4 CHANGE 2: SESSION-UNLOCK NOW *ALLOWS*, IT NO LONGER ABSTAINS ─────────────────────────────
# The unlock sentinel used to `exit 0`. exit 0 is ABSTAIN, not APPROVE: the call falls through to the
# harness's normal permission flow, which still prompts for every Edit/Write in default mode. So the
# owner would set the sentinel and STILL be asked for every single edit — the sentinel silently did
# almost nothing. It now emits permissionDecision:"allow" with an explicit reason telling the driver it
# is PRE-AUTHORIZED and must not re-ask in prose either (the model was double-gating: hook prompt AND a
# "shall I proceed?" sentence sourced from CLAUDE.md's protected-path rule). If the sentinel file has
# CONTENT, its first line is echoed into the reason — the owner can scope the unlock by writing e.g.
# "only src/engine/sim.ts, SMG cadence work" into it.
#
# SESSION-UNLOCK sentinel (attended-session convenience, 2026-07-18): owner-only file
# .claude/hooks/.session-unlock. It lives in the GUARD-protected .claude/hooks/ dir, so no Claude session
# can create it (Edit/Write → guard deny; Bash touch/mkdir/cp/redirect → caught by WTOOL/RGUARD below).
# Only the owner, editing OUTSIDE Claude, can `touch` it to unlock or `rm` it to re-lock. It persists
# across sessions until removed.
#
# AUTONOMOUS carve-out (the reason "ask" is not enough): an unanswerable ask prompt HANGS a headless /
# unattended run. If the run is marked autonomous — env NIKKE_AUTONOMOUS=1 (set at launch for terminal
# autonomous runs) — CONTENT returns a clean "deny" instead of "ask", and the reason points at the
# capture file. (CLAUDE.md carries the same rule behaviorally, for when the owner only SAYS "this is
# autonomous" without the env var.) The autonomous deny OUTRANKS the unlock sentinel — an unattended run
# never edits protected paths silently.
#
# Reads (cat/grep/head) and script-driven regens (which name a SCRIPT, not the protected file) pass.
# Fails OPEN on any parse error (the permissions.deny layer is the fail-closed floor for the guard files).
set -u
input="$(cat 2>/dev/null)" || exit 0
[ -n "$input" ] || exit 0

PROJ="${CLAUDE_PROJECT_DIR:-$(pwd)}"

read_field() {
  printf '%s' "$input" | python3 -c "import json,sys
try:
    d=json.load(sys.stdin)
except Exception:
    sys.exit(0)
v=d
for k in sys.argv[1:]:
    v=v.get(k,{}) if isinstance(v,dict) else {}
print(v if isinstance(v,str) else '')" "$@" 2>/dev/null
}

emit() { # $1 = decision (deny|ask|allow), $2 = reason
  printf '%s' "$2" | python3 -c 'import json,sys; print(json.dumps({"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":sys.argv[1],"permissionDecisionReason":sys.stdin.read()}}))' "$1" 2>/dev/null
}

# capture <class> → prints the repo-relative capture path on stdout (empty string on any failure).
# NOTE: writes NOTHING to this hook's stdout except that path (callers use command substitution).
capture() {
  NIKKE_CAP_CLASS="$1" NIKKE_HOOK_INPUT="$input" NIKKE_PROJ="$PROJ" python3 <<'PY' 2>/dev/null
import json, os, re, sys, datetime, pathlib

MAX = 60000  # per-field cap; a payload bigger than this is truncated with a marker

try:
    d = json.loads(os.environ.get("NIKKE_HOOK_INPUT") or "")
except Exception:
    sys.exit(0)

proj = pathlib.Path(os.environ.get("NIKKE_PROJ") or ".")
klass = os.environ.get("NIKKE_CAP_CLASS") or "content"
tool = d.get("tool_name", "") or "?"
ti = d.get("tool_input") or {}
if not isinstance(ti, dict):
    ti = {}

def clip(s):
    s = s or ""
    return s if len(s) <= MAX else s[:MAX] + f"\n…[TRUNCATED {len(s)-MAX} chars]"

path = ti.get("file_path") or ""
cmd = ti.get("command") or ""
target = path or (cmd[:80] if cmd else "unknown")

slug = re.sub(r"[^A-Za-z0-9]+", "-", (path or tool)).strip("-").lower()[:60] or "attempt"
ts = datetime.datetime.now().strftime("%Y%m%dT%H%M%S")
outdir = proj / "docs" / "handoffs" / "autonomous-edit-queue"
outdir.mkdir(parents=True, exist_ok=True)
out = outdir / f"{ts}-{klass}-{slug}.md"
i = 2
while out.exists():
    out = outdir / f"{ts}-{klass}-{slug}-{i}.md"
    i += 1

parts = [
    f"# CAPTURED EDIT — {klass.upper()} deny — {ts}",
    "",
    "> Written automatically by `.claude/hooks/enforce-protected-paths.sh` when a protected-path write",
    "> was denied. The MECHANICAL content below is verbatim and needs no re-derivation. The agent that",
    "> triggered this is responsible for filling in the RATIONALE block; the owner enacts or discards.",
    "",
    f"- **tool:** `{tool}`",
    f"- **target:** `{target}`",
    f"- **session:** `{d.get('session_id','?')}`",
    f"- **autonomous:** `{os.environ.get('NIKKE_AUTONOMOUS','') or 'no'}`",
    "",
    "## RATIONALE — agent fills this in (the hook cannot know it)",
    "",
    "- **what/why:**",
    "- **evidence tier + n:**",
    "- **expected board/blast effect:**",
    "- **verified how:**",
    "",
    "## Payload (verbatim)",
    "",
]

if cmd:
    parts += ["### command", "", "```sh", clip(cmd), "```", ""]
if ti.get("old_string"):
    parts += ["### old_string", "", "```", clip(ti["old_string"]), "```", ""]
if ti.get("new_string"):
    parts += ["### new_string", "", "```", clip(ti["new_string"]), "```", ""]
if ti.get("content"):
    parts += ["### content (full file)", "", "```", clip(ti["content"]), "```", ""]
edits = ti.get("edits")
if isinstance(edits, list):
    for n, e in enumerate(edits, 1):
        if not isinstance(e, dict):
            continue
        parts += [f"### edit {n} — old_string", "", "```", clip(e.get("old_string")), "```", "",
                  f"### edit {n} — new_string", "", "```", clip(e.get("new_string")), "```", ""]

out.write_text("\n".join(parts), encoding="utf-8")

rel = out.relative_to(proj).as_posix()
index = proj / "docs" / "handoffs" / "autonomous-edit-queue.md"
try:
    with index.open("a", encoding="utf-8") as fh:
        fh.write(f"\n- [{ts}] **{klass}** `{target}` (`{tool}`) → captured payload: `{rel}` — RATIONALE PENDING\n")
except Exception:
    pass

print(rel)
PY
}

GUARD_RE='(^|[^A-Za-z0-9_])(\.claude/hooks/|\.claude/settings)'
CONTENT_RE='(^|[^A-Za-z0-9_])(src/engine/|data/|src/skills/overrides/)'

tool="$(read_field tool_name)"
class=""   # "guard" | "content" | ""

case "$tool" in
  Edit|Write|MultiEdit)
    path="$(read_field tool_input file_path)"
    [ -n "$path" ] || exit 0
    if printf '%s' "$path" | grep -Eq "$GUARD_RE"; then class="guard"
    elif printf '%s' "$path" | grep -Eq "$CONTENT_RE"; then class="content"
    fi
    ;;
  Bash)
    cmd="$(read_field tool_input command)"
    [ -n "$cmd" ] || exit 0
    WTOOL='(\b(sed|perl)\b[^|]*-i)|\btee\b|\b(cp|mv|dd|install|truncate|ln|rsync|touch|mkdir)\b|\b(chmod|chflags|chown)\b|\b(vi|vim|nano|emacs|ed|pico|code)\b|(\b(python3?|node|deno|bun|perl|ruby|awk)\b[^|]*(-c|-e)\b)|git[[:space:]]+(checkout|restore|apply|reset|stash|clean)'
    RGUARD='>>?[[:space:]]*['"'"'"]?(\./)?(\.claude/hooks/|\.claude/settings)'
    RCONTENT='>>?[[:space:]]*['"'"'"]?(\./)?(src/engine/|data/|src/skills/overrides/)'
    has_wtool=0; printf '%s' "$cmd" | grep -Eq "$WTOOL" && has_wtool=1
    if printf '%s' "$cmd" | grep -Eq "$RGUARD" || { [ "$has_wtool" -eq 1 ] && printf '%s' "$cmd" | grep -Eq "$GUARD_RE"; }; then
      class="guard"
    elif printf '%s' "$cmd" | grep -Eq "$RCONTENT" || { [ "$has_wtool" -eq 1 ] && printf '%s' "$cmd" | grep -Eq "$CONTENT_RE"; }; then
      class="content"
    fi
    ;;
  *) exit 0 ;;
esac

[ -n "$class" ] || exit 0

if [ "$class" = "guard" ]; then
  cap="$(capture guard)"
  reason="BLOCKED (guard) — .claude/hooks/** and .claude/settings*.json are hard-locked so NO session can disable the protection. Only the owner edits these. Do not route around it."
  if [ -n "$cap" ]; then
    reason="$reason
✅ YOUR EXACT PAYLOAD WAS SAVED — do NOT re-derive or re-type it: $cap
Next: open that file and fill in ONLY the RATIONALE block (what/why, evidence tier + n, expected effect, how verified), then tell the owner the path and CONTINUE with other work. The mechanical content is already captured verbatim."
  fi
  emit deny "$reason"
  exit 0
fi

# class == content
auton="${NIKKE_AUTONOMOUS:-}"
if [ -n "$auton" ] && [ "$auton" != "0" ] && [ "$auton" != "false" ]; then
  cap="$(capture content)"
  reason="AUTONOMOUS SESSION — protected path (engine / data / override). The ask flow would HANG an unattended run, so this is a clean DENY, not a prompt."
  if [ -n "$cap" ]; then
    reason="$reason
✅ YOUR EXACT PAYLOAD WAS SAVED — do NOT re-derive or re-type it: $cap
Next: open that file and fill in ONLY the RATIONALE block (what/why, evidence tier + n, expected board effect, how verified). That is the whole obligation — the diff itself is already captured verbatim. Then CONTINUE forward with non-protected work. Do NOT retry the edit, do NOT restate the diff in prose, and do NOT stop the run over this."
  else
    reason="$reason
Append the intended change (unit/slug, what, why, evidence tier + n, and the exact proposed diff) to docs/handoffs/autonomous-edit-queue.md, then CONTINUE forward with other work."
  fi
  emit deny "$reason"
elif [ -f "$PROJ/.claude/hooks/.session-unlock" ]; then
  # r4: ALLOW, not exit 0. exit 0 abstains and the harness still prompts for every Edit — which made the
  # sentinel almost a no-op and trained the owner to re-authorize verbally every session.
  scope="$(head -n 1 "$PROJ/.claude/hooks/.session-unlock" 2>/dev/null | tr -d '\r')"
  reason="SESSION UNLOCKED — the owner placed .claude/hooks/.session-unlock (a file only they can create), which PRE-AUTHORIZES protected-path edits (engine / data / override) for this session. Auto-approved."
  [ -n "$scope" ] && reason="$reason
Owner scope note on the sentinel: $scope"
  reason="$reason
⇒ DO NOT ASK AGAIN. Do not request confirmation for these edits in prose either ('shall I proceed?', 'this is a protected path, confirm?') — the authorization is already granted and re-asking is the exact friction the sentinel exists to remove. CLAUDE.md's 'per-session approval' rule is SATISFIED by this sentinel. The substantive bars still apply and are yours to enforce silently: measured>fudge, evidence tier ≥ the change, engine edits on an ISOLATED worktree, verify.sh green before the change leaves the machine."
  emit allow "$reason"
else
  emit ask "PROTECTED path (engine / data / override). Approve ONLY if you intend this exact change AND it clears the bar: measured>fudge, evidence tier ≥ the change, n≥5 or independent-method (see CLAUDE.md point 7). ⚠ If the owner told you this is an AUTONOMOUS/unattended session, do NOT approve — cancel this edit, record the change in docs/handoffs/autonomous-edit-queue.md, and continue (an unanswered prompt hangs an unattended run)."
fi
exit 0
