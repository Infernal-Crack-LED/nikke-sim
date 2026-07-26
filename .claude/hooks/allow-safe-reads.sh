#!/usr/bin/env bash
# allow-safe-reads.sh — PreToolUse (Bash): auto-APPROVE curated read-only commands so they don't prompt.
# It ONLY ever returns permissionDecision:"allow"; it NEVER denies. Anything it doesn't positively
# recognize as read-only falls through to the normal permission flow (still prompts). Conservative:
# a command is allowed ONLY when EVERY pipeline/chain segment's head is in the read-only allowlist AND
# the command has no write-redirect / command-substitution / privilege-escalation. When in doubt: silent.
set -u
input="$(cat 2>/dev/null)" || exit 0
[ -n "$input" ] || exit 0
NIKKE_HOOK_INPUT="$input" python3 <<'PY'
import os, re, json, sys
try:
    d = json.loads(os.environ.get("NIKKE_HOOK_INPUT") or "")
except Exception:
    sys.exit(0)
if d.get("tool_name") != "Bash":
    sys.exit(0)
cmd = ((d.get("tool_input") or {}).get("command") or "")
if not cmd.strip():
    sys.exit(0)

# ---- HARD VETOES: any present => stay silent (normal prompt) ---------------------------------
# command / process substitution can hide ANY command
if any(t in cmd for t in ("$(", "`", "<(", ">(")):
    sys.exit(0)
# privilege escalation
if re.search(r'(^|\s)(sudo|doas|su)\s', cmd):
    sys.exit(0)
# redirection to a real file (allow only /dev/null and fd-dups like 2>&1, >&2)
red = re.sub(r'([12]?>>?|&>)\s*/dev/null', '', cmd)
red = re.sub(r'\d*>&\d+', '', red)
if '>' in red:
    sys.exit(0)

READS = set("""
cat bat head tail grep egrep fgrep rg ag ack ls tree wc stat file du df uptime
basename dirname realpath readlink pwd whoami id groups date uname hostname arch
which type sort uniq cut column diff cmp comm nl fold rev tac look seq expr tr paste join
cksum md5 md5sum shasum sha1sum sha256sum xxd od hexdump strings jq printenv
echo printf true false test [
""".split())
GIT_READS = set("""status log diff show blame rev-parse describe shortlog ls-files
cat-file for-each-ref reflog ls-tree symbolic-ref name-rev whatchanged""".split())
# read-ish commands that ALSO have a write mode -> veto if the write flag is present
WRITE_FLAGS = {
    "sort": {"-o", "--output"},
    "find": {"-exec", "-execdir", "-delete", "-ok", "-okdir", "-fprint", "-fprintf", "-fls"},
}

for seg in re.split(r'\|\||&&|[;|\n]', cmd):
    seg = seg.strip()
    if not seg:
        continue
    while re.match(r'^[A-Za-z_]\w*=', seg):          # strip leading VAR=val
        seg = re.sub(r'^[A-Za-z_]\w*=\S*\s+', '', seg)
        if not seg.strip():
            break
    toks = seg.split()
    if not toks:
        continue
    head = toks[0]
    if head == "git":
        sub = toks[1] if len(toks) > 1 else ""
        if sub not in GIT_READS:
            sys.exit(0)
        if any(a in ("-d", "-D", "--delete", "-f", "--force", "-m", "--move", "--prune") for a in toks[2:]):
            sys.exit(0)
        continue
    if head not in READS:
        sys.exit(0)
    if head in WRITE_FLAGS and (set(toks[1:]) & WRITE_FLAGS[head]):
        sys.exit(0)

print(json.dumps({"hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
    "permissionDecisionReason": "auto-approved read-only command (allow-safe-reads hook)"}}))
PY
exit 0
