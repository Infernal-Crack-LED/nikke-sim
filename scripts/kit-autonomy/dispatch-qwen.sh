#!/usr/bin/env bash
set -euo pipefail

# dispatch-qwen.sh — dispatch a cross-family packet to Qwen via the CLI.
#
#   bash scripts/kit-autonomy/dispatch-qwen.sh <packet.md> <model> <result-out.json>
#
# Third bridge alongside dispatch-claude.sh and dispatch-kimi.sh, same packet/result
# contract. Qwen is a separate model FAMILY from both Claude and Kimi, so it satisfies
# the cross-family rule in CROSS-FAMILY-PROTOCOL.md for a Claude-authored diff.
# Added 2026-08-17 on an explicit owner request to review against qwen3.8-max-preview;
# the protocol's default for Claude-authored code remains kimi-code/k3, and an invoker
# override must be recorded (it is, in the review's result JSON `model` field).
#
# ── HOW THIS BRIDGE DIFFERS FROM THE OTHER TWO (read before trusting a verdict) ──
#
# The Kimi and Claude bridges bound the reviewer's tools with an AGENT PROFILE
# (`tools: []` blind, or `[Read, Grep, Glob, Bash]` sighted). The Qwen CLI has no
# equivalent profile mechanism, so:
#
#   * STRUCTURAL guarantee (verified 2026-08-17 by inspecting the session-init tool
#     list): Qwen's tool set contains NO write, NO edit and NO shell tool. The repo
#     therefore cannot be mutated by this reviewer. Read-only file access
#     (read_file / list_directory / grep_search / glob) IS present, which is what the
#     sighted code-review role wants.
#   * NOT structurally bounded: the set also carries computer_use__* (desktop control),
#     cron_* (scheduling), web_fetch, and sub-agent spawning. None can mutate the repo,
#     but they are a wider ambient surface than the other two bridges present, and
#     --safe-mode does NOT remove them. The role body's "findings-only, never mutate"
#     instruction is what governs them.
#
# ⇒ Treat a Qwen verdict as equal-strength on CROSS-FAMILY grounds and slightly weaker
#   on CONTAINMENT grounds than a Kimi one. Say so when reporting it.
#
# Unlike the Kimi bridge there is no blind/code-review mode switch: Qwen has no
# no-tools profile to switch to, so this bridge is for SIGHTED packets only. Do not
# use it for a blind role (kit-autonomy S2b/S5/S6, logic-gate) — blindness there is
# load-bearing and cannot be enforced here. It refuses non-code-review packets below.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

if [[ $# -lt 3 ]]; then
  echo "usage: dispatch-qwen.sh <packet.md> <model> <result-out.json>" >&2
  exit 1
fi

PACKET="$1"
MODEL="$2"
OUT="$3"

if [[ ! -f "$PACKET" ]]; then
  echo "❌ packet not found: $PACKET" >&2
  exit 1
fi

# SIGHTED-ONLY GUARD. Blindness cannot be enforced on this CLI, so refuse anything
# that is not the sighted code-review role rather than silently running a blind role
# with tools available.
if ! head -n 10 "$PACKET" | grep -qE '^# code-review\b'; then
  echo "❌ dispatch-qwen.sh is SIGHTED-ONLY: the packet's role heading is not '# code-review'." >&2
  echo "   Qwen has no no-tools profile, so a blind role dispatched here would not be blind." >&2
  echo "   Use dispatch-kimi.sh or dispatch-claude.sh for blind roles." >&2
  exit 1
fi

QWEN="$(command -v qwen || true)"
if [[ -z "$QWEN" ]]; then
  echo "❌ qwen CLI not found on PATH" >&2
  exit 1
fi

NON_NEG=""
for candidate in "$ROOT/.claude/subagent-non-negotiables.md" \
                 "/Users/maxwellsutton/nikke-sim/.claude/subagent-non-negotiables.md"; do
  if [[ -f "$candidate" ]]; then
    NON_NEG="$candidate"
    break
  fi
done

PROMPT="IMPORTANT: You are a FINDINGS-ONLY reviewer with READ-ONLY repository access. Use read_file / grep_search / glob / list_directory to verify claims against the actual code — do not take the diff's framing on trust. You must NEVER edit, write, commit, schedule, fetch external URLs, control the desktop, or take any action that mutates state anywhere. Return your JSON object as your FINAL message, with no markdown fences and no prose around it.

"
if [[ -n "$NON_NEG" ]]; then
  PROMPT+="$(cat "$NON_NEG")

---

"
fi
PROMPT+="$(cat "$PACKET")"

echo "→ dispatching $(basename "$PACKET") to $MODEL (qwen, sighted code-review) …" >&2

# -o json emits an array of envelope objects; the final {"type":"result"} entry carries
# the model's answer in .result. Errors surface as is_error true.
RAW="$(cd "$ROOT" && QWEN_CODE_SUPPRESS_YOLO_WARNING=1 "$QWEN" \
  -m "$MODEL" \
  -p "$PROMPT" \
  -o json \
  2>/dev/null)" || true

if [[ -z "$RAW" ]]; then
  echo "❌ qwen returned no output" >&2
  exit 1
fi

RESULT_TEXT="$(printf '%s' "$RAW" | python3 -c "
import json, sys
try:
    doc = json.load(sys.stdin)
except Exception:
    sys.exit(1)
entries = doc if isinstance(doc, list) else [doc]
for m in reversed(entries):
    if isinstance(m, dict) and m.get('type') == 'result' and m.get('result'):
        sys.stdout.write(m['result'])
        break
" 2>/dev/null)" || true

if [[ -z "$RESULT_TEXT" ]]; then
  echo "❌ could not extract a result from the qwen envelope" >&2
  printf '%s\n' "$RAW" | head -c 1000 >&2 || true
  exit 1
fi

# Strip fences, then brace-match the JSON object out of any surrounding prose.
CLEANED="$(printf '%s' "$RESULT_TEXT" | sed -e '/^```[a-zA-Z]*$/d' -e '/^```$/d')"
CLEANED="$(printf '%s' "$CLEANED" | python3 -c "
import sys
text = sys.stdin.read()
idx = text.find('{')
if idx < 0:
    sys.exit(1)
depth = 0
in_str = False
escape = False
for i, c in enumerate(text[idx:], idx):
    if escape:
        escape = False
        continue
    if c == '\\\\':
        escape = True
        continue
    if c == '\"':
        in_str = not in_str
        continue
    if in_str:
        continue
    if c == '{':
        depth += 1
    elif c == '}':
        depth -= 1
        if depth == 0:
            sys.stdout.write(text[idx:i + 1])
            sys.exit(0)
sys.exit(1)
")" || {
  echo "❌ no JSON object found in the qwen reply" >&2
  printf '%s\n' "$RESULT_TEXT" | head -c 1000 >&2
  exit 1
}

# Inject the model name so the verdict carries its own provenance (an off-protocol
# model voids the review — see CROSS-FAMILY-PROTOCOL.md).
printf '%s' "$CLEANED" | python3 -c "
import json, sys
obj = json.load(sys.stdin)
obj['model'] = '$MODEL'
obj['bridge'] = 'dispatch-qwen.sh'
obj['containmentNote'] = ('Qwen has no agent-profile mechanism: write/edit/shell tools are '
                          'absent (repo cannot be mutated) but computer_use/cron/web_fetch are '
                          'present and instruction-bounded only. Cross-family strength equal to '
                          'the Kimi bridge; containment strength slightly weaker.')
json.dump(obj, sys.stdout, indent=1)
sys.stdout.write('\n')
" > "$OUT" || {
  echo "❌ qwen reply did not parse as JSON" >&2
  printf '%s\n' "$CLEANED" | head -c 1000 >&2
  exit 1
}

echo "✅ wrote $OUT" >&2
