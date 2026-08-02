#!/usr/bin/env bash
set -euo pipefail

# dispatch-kimi.sh — dispatch a cross-family packet to Kimi via the CLI.
#
#   bash scripts/kit-autonomy/dispatch-kimi.sh <packet.md> <model> <result-out.json>
#
# Kimi equivalent of dispatch-claude.sh, with the same two modes, selected by
# the packet's role heading in its first 10 lines:
#
#   BLIND (default — every packet that does not start with "# code-review"):
#     runs the blind agent profile (kimi-blind-agent.md, `tools: []`), which
#     leaves the model with no tools at all (verified 2026-07-26: it cannot
#     read files), and prepends the no-tools preamble. Generic gates may
#     override the profile with KIMI_AGENT_FILE (e.g. logic-gate's
#     scripts/gates/kimi-gate-agent.md — also `tools: []`).
#
#   CODE-REVIEW (packet starts with "# code-review"):
#     the sighted post-op review (.claude/skills/code-review). Runs the sighted
#     profile (kimi-code-review-agent.md, `tools: [Read, Grep, Glob, Bash]`)
#     and omits the no-tools preamble. Write/Edit are NOT in the profile — the
#     reviewer stays findings-only (Bash is governed by the role body's "never
#     edit, never mutate" instruction). Detection WINS over KIMI_AGENT_FILE: a
#     code-review packet always gets the sighted profile even if the caller
#     still exports the old blind gate profile.
#
# Both modes prepend the subagent non-negotiables, run the full prompt through
# `kimi -p`, extract the assistant text from the stream-json envelope, strip
# markdown fences, validate it parses as JSON, and write to <result-out.json>.
#
# The model field is injected into the result so the verdict can report provenance.
#
# Model names are config.toml aliases, e.g. `kimi-code/k3` (see
# scripts/kit-autonomy/CROSS-FAMILY-PROTOCOL.md for the canonical routing).
#
# NOTE: --agent-file requires the v2 engine in -p mode, hence
# KIMI_CODE_EXPERIMENTAL_FLAG=1 below. Long dispatches (a ~44KB blind packet)
# take minutes — carve this script out of any short STOP-DON'T-WAIT timeout,
# same as dispatch-claude.sh.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# A packet is the sighted code-review role iff its role heading appears in the
# first 10 lines: "# code-review ..." (the packet is the role body of
# .claude/agents/code-review.md + INTENT/DIFF/CONTEXT). Signature-stable; every
# other role heading (kit-autonomy, logic-gate, scientific-method) stays blind.
detect_code_review() {
  local packet="$1"
  if head -n 10 "$packet" | grep -qE '^# code-review\b'; then
    return 0
  fi
  return 1
}

# Agent profile: selected by mode once the packet is known (see below) — the
# sighted kimi-code-review-agent.md for code-review packets, kit-autonomy's
# blind profile otherwise; generic gates (logic-gate) override the BLIND
# profile with KIMI_AGENT_FILE=scripts/gates/kimi-gate-agent.md.

# Resolve the kimi binary: PATH first, then the default install location.
KIMI="$(command -v kimi || true)"
if [[ -z "$KIMI" && -x "$HOME/.kimi-code/bin/kimi" ]]; then
  KIMI="$HOME/.kimi-code/bin/kimi"
fi
if [[ -z "$KIMI" ]]; then
  echo "❌ kimi CLI not found (looked on PATH and ~/.kimi-code/bin/kimi)" >&2
  exit 1
fi

# Non-negotiables: try the worktree first, fall back to the main repo.
NON_NEG=""
for candidate in "$ROOT/.claude/subagent-non-negotiables.md" \
                 "/Users/maxwellsutton/nikke-sim/.claude/subagent-non-negotiables.md"; do
  if [[ -f "$candidate" ]]; then
    NON_NEG="$candidate"
    break
  fi
done

if [[ $# -lt 3 ]]; then
  echo "usage: dispatch-kimi.sh <packet.md> <model> <result-out.json>" >&2
  exit 1
fi

PACKET="$1"
MODEL="$2"
OUT="$3"

if [[ ! -f "$PACKET" ]]; then
  echo "❌ packet not found: $PACKET" >&2
  exit 1
fi

# Mode selection: a packet whose role heading (first 10 lines) is "# code-review"
# is the sighted code-review skill and runs with read-only tools; everything
# else stays blind (no tools) — the blindness boundary is the whole point of
# the audit/gate roles. Detection wins over KIMI_AGENT_FILE so a stale caller
# export cannot force a code review back onto the blind profile.
if detect_code_review "$PACKET"; then
  MODE="code-review"
  AGENT_FILE="$SCRIPT_DIR/kimi-code-review-agent.md"
else
  MODE="blind"
  AGENT_FILE="${KIMI_AGENT_FILE:-$SCRIPT_DIR/kimi-blind-agent.md}"
fi

# Build the full prompt: mode preamble + non-negotiables + the packet.
# BLIND: the agent profile already removes the tools, but the preamble keeps
# the instruction unambiguous (the role templates say "Save to <path>", which
# the model must instead return as text).
# CODE-REVIEW: tools are ON (sighted profile); the preamble instead pins the
# read-only contract and that the FINAL message must be the JSON object
# (multi-turn tool use otherwise tends to end on a prose summary).
if [[ "$MODE" == "code-review" ]]; then
  PROMPT="IMPORTANT: You have READ-ONLY repository access via the Read, Grep, Glob and Bash tools — use them to verify assumptions against the code and to run fast read-only checks (typecheck, tests). NEVER edit, write, commit, or run anything that mutates state; you are a findings-only reviewer. Return your JSON object as your FINAL message, with no markdown fences and no prose around it.

"
else
  PROMPT="IMPORTANT: You have NO tools available. Do NOT attempt to use any tools (no file writes, no reads, no shell commands). Return your complete JSON response directly in your response text.

"
fi
if [[ -n "$NON_NEG" ]]; then
  PROMPT+="$(cat "$NON_NEG")

---

"
fi
PROMPT+="$(cat "$PACKET")"

echo "→ dispatching $(basename "$PACKET") to $MODEL ($MODE mode) …" >&2

# Dispatch:
#   blind       — tools structurally DISABLED via the agent profile (tools: []).
#   code-review — sighted profile (tools: [Read, Grep, Glob, Bash]) plus --auto
#                 so the headless -p run auto-approves tool calls instead of
#                 blocking on a permission prompt nobody can answer (--auto
#                 only approves calls the profile allows; Write/Edit never
#                 exist in this session).
# stream-json gives one JSON object per line on stdout; the model's reply is
# the assistant message(s). stderr carries thinking + progress (discarded).
KIMI_ARGS=(-p "$PROMPT" --model "$MODEL" --agent-file "$AGENT_FILE" --output-format stream-json)
if [[ "$MODE" == "code-review" ]]; then
  KIMI_ARGS+=(--auto)
fi
RAW="$(KIMI_CODE_EXPERIMENTAL_FLAG=1 "$KIMI" "${KIMI_ARGS[@]}" \
  2>/dev/null)" || true

# Extract the assistant text from the JSONL envelope (last assistant message
# wins — the final answer; blind mode has exactly one message, code-review
# mode has one per tool turn plus the final JSON answer).
RESULT_TEXT="$(printf '%s\n' "$RAW" | jq -rs '[.[] | select(.role == "assistant") | .content // empty] | last // empty' 2>/dev/null)" || true
if [[ -z "$RESULT_TEXT" ]]; then
  echo "❌ kimi returned no assistant message" >&2
  printf '%s\n' "$RAW" | head -c 1000 >&2 || true
  exit 1
fi

# Strip markdown code fences (```json ... ``` or ``` ... ```) if present,
# then extract the JSON object using brace-matching (models sometimes add
# preamble text before the JSON or trailing commentary after it).
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
    if c == '\\\\' and in_str:
        escape = True
        continue
    if c == '\"' and not escape:
        in_str = not in_str
        continue
    if in_str:
        continue
    if c == '{': depth += 1
    elif c == '}': depth -= 1
    if depth == 0:
        print(text[idx:i+1])
        break
")"

# Validate: must parse as JSON.
if ! printf '%s' "$CLEANED" | jq empty 2>/dev/null; then
  echo "❌ model response is not valid JSON" >&2
  echo "--- first 500 chars ---" >&2
  printf '%s' "$CLEANED" | head -c 500 >&2
  echo >&2
  exit 1
fi

# Inject the model provenance field.
FINAL="$(printf '%s' "$CLEANED" | jq --arg m "$MODEL" '. + {model: $m}')"

mkdir -p "$(dirname "$OUT")"
printf '%s\n' "$FINAL" > "$OUT"
echo "✓ $(basename "$OUT")  ($(printf '%s' "$FINAL" | wc -c | tr -d ' ') bytes, model=$MODEL)" >&2
