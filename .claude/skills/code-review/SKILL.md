---
name: code-review
description: Cross-family POST-OP code review — the diff gets reviewed by a DIFFERENT model family than the one that wrote it, before commit/merge. Kimi-authored code → claude-opus-5 via dispatch-claude.sh; Claude-authored code → kimi-code/k3 via dispatch-kimi.sh; Qwen-authored → claude-opus-5. Invoke ONLY when the owner explicitly requests it (typically for higher-risk changes, after verify.sh is green and, if it ran, the logic-gate post-op) — never automatically. NOT for scientific-method landings — those already have implementation-reviewer.
---

# code-review — the author never reviews their own diff

Post-op code review, generalized from the kit-autonomy cross-family protocol
(`scripts/kit-autonomy/CROSS-FAMILY-PROTOCOL.md` — the WHY and the canonical model names). The rule is
one sentence: **the reviewer is always a different model family than the author**, because same-family
review shares the author's priors and re-derives the same reasoning instead of reading the code.

**Scope:** ordinary engineering changes — features, refactors, fixes. A scientific-method landing uses
`implementation-reviewer` instead (it reviews against the judges' accepted claim; this skill reviews
against plain stated intent). Trivial edits (typos, one-liners) may skip.

## Routing (reviewer = opposite family of the AUTHOR)

The author is whoever wrote the code — normally you, the driver.

| Author / driver       | Reviewer        | Bridge                                                                           |
| --------------------- | --------------- | -------------------------------------------------------------------------------- |
| **Kimi** or **Qwen**  | `claude-opus-5` | `bash scripts/kit-autonomy/dispatch-claude.sh <packet> claude-opus-5 <out.json>` |
| **Claude** (any tier) | `kimi-code/k3`  | `bash scripts/kit-autonomy/dispatch-kimi.sh <packet> kimi-code/k3 <out.json>`    |

Both bridges auto-detect the `# code-review` packet heading and run the reviewer SIGHTED with
read-only repo access (Read/Grep/Glob/Bash — it can inspect callers and run typecheck/tests). No
`KIMI_AGENT_FILE` override is needed for code-review; the detection wins over a stale one.

- Canonical model names come from `scripts/kit-autonomy/CROSS-FAMILY-PROTOCOL.md` — `claude-opus-4-8`
  is NOT `claude-opus-5`; `kimi-code/kimi-for-coding` is NOT `kimi-code/k3`. The bridge injects the
  `model` field into the result JSON; an off-protocol `model` voids the review — re-dispatch.
- The role body lives in `.claude/agents/code-review.md` (pinned to Opus). The packet = role body +
  materials; the bridges prepend the subagent non-negotiables themselves.
- **Fallback (label it):** if the cross-family bridge is genuinely unavailable, run
  `Agent(subagent_type:'code-review')` natively and mark the review **"same-family only"** — weaker
  evidence, visible to the owner. Never silently substitute.

## Procedure

1. **Gate order.** Run the cheap local gates first: `bash scripts/verify.sh` green, and (for changes
   that went through `/logic-gate`) the post-op logic gate ACCEPTed. Do not spend a cross-family
   dispatch on code that fails locally.
2. **Build the packet** at `scratchpad/gates/<date>-<topic>/review-packet.md`:
   - the FULL role body of `.claude/agents/code-review.md` (minus its frontmatter), then
   - `## INTENT` — 2–4 sentences: what the change does and why, in plain terms,
   - `## DIFF` — the full `git diff` (uncommitted work, or branch-vs-base for a PR),
   - `## CONTEXT` — only the anchors the reviewer cannot derive from the diff (e.g. "callers live in
     web/src/", "verify.sh covers X but not Y"). The reviewer is sighted with READ-ONLY repo access
     (Read/Grep/Glob/Bash — it can open callers and run typecheck/tests itself), so you need not paste
     surrounding code; still NAME the callers/anchors worth checking when the diff changes a shared
     interface.
3. **Dispatch** per the routing table with a **600s shell timeout** — large diffs take 2–5 minutes on
   opus/k3. A 60s abort manufactures a fake timeout and pushes you to the weaker same-family fallback;
   suspect impatience before suspecting the bridge.
4. **Read the result JSON:**
   - `CLEAN` → land it. A cross-family CLEAN is real evidence.
   - `FIX-BEFORE-MERGE` → resolve every `FIX` finding, then re-review the new diff (full loop —
     fixes introduce their own defects).
   - `BLOCKED` → stop. Resolve the BLOCKERs or take the review to the owner. Do not commit over a
     BLOCKER because you disagree with it — disagreement goes to the owner with both rationales.
5. **Disputes:** if you believe a finding is wrong, verify it concretely (run the code, read the
   caller) — and if it still looks wrong, that's an owner decision, not a silent override. Record the
   dispute next to the result JSON.

## Notes

- `FOLLOW-UP` findings: file them (backlog doc / issue) rather than blocking; say where you filed.
- Keep packets + result JSONs under `scratchpad/gates/` until the change lands — they are the audit
  trail, and re-reviews rebuild from them.
- If the driver is Qwen, the kit-autonomy router's constraint applies unchanged (no native model
  pinning → CLI bridges for everything cross-family).
