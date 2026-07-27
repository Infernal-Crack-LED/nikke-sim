---
name: logic-gate
description: Cross-family logical-reasoning gates for NON-trivial engineering changes — a PRE-OP gate (attack the plan's reasoning before code exists) and a POST-OP gate (blind second verdict on the implementation vs the approved plan). The reviewer is ALWAYS a different model family than the driver — Kimi/Qwen driver → claude-fable-5 via dispatch-claude.sh; Claude driver → kimi-code/k3 via dispatch-kimi.sh. Use for features, refactors, structural changes, and tricky bug fixes. NOT for empirical game-mechanics questions (those go through /scientific-method with preop-judge/postop-judge) and NOT for trivial edits (typos, obvious one-liners).
---

# logic-gate — cross-family pre-op + post-op reasoning gates

Two gates around any non-trivial engineering change, generalizing the kit-autonomy cross-family
protocol (`scripts/kit-autonomy/CROSS-FAMILY-PROTOCOL.md` — the WHY and the canonical model names;
read it once). The short version: a same-family reviewer shares the driver's priors and converges on
the same misreads, so a same-family GO is weak evidence. Both gates therefore route to the OTHER
model family.

**Scope:** ordinary engineering logic — does this plan solve the problem, does the code deliver the
plan. Empirical questions about game mechanics (hypothesis → measurement → verdict) go through
`/scientific-method`; its preop-judge/postop-judge already exist and this skill does not replace them.

## Routing (reviewer = opposite family of the driver)

| Driver (you)          | Pre-op gate + Post-op gate reviewer | Bridge                                                                                                                                    |
| --------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Kimi** or **Qwen**  | `claude-fable-5`                    | `bash scripts/kit-autonomy/dispatch-claude.sh <packet> claude-fable-5 <out.json>`                                                         |
| **Claude** (any tier) | `kimi-code/k3`                      | `KIMI_AGENT_FILE=<abs path>/scripts/gates/kimi-gate-agent.md bash scripts/kit-autonomy/dispatch-kimi.sh <packet> kimi-code/k3 <out.json>` |

- Canonical model names come from `scripts/kit-autonomy/CROSS-FAMILY-PROTOCOL.md` — do not invent
  aliases (`claude-opus-4-8` ≠ `claude-opus-5`; `kimi-code/kimi-for-coding` ≠ `kimi-code/k3`).
- The role bodies live in `.claude/agents/logic-gate-preop.md` and `.claude/agents/logic-gate-postop.md`.
  The packet = role body + materials; the bridge prepends the subagent non-negotiables itself.
- **Fallback (label it):** if the cross-family bridge is genuinely unavailable, run the pinned native
  subagent instead (`Agent(subagent_type:'logic-gate-preop'|'logic-gate-postop')` — fable) and report
  the verdict as **"same-family only"**. Never silently substitute.

## Choosing the gate model (invoker override)

The routing table above is the DEFAULT (cross-family, decorrelated priors). The invoker may instead
name the gate model explicitly — an explicit choice wins over the default. Both logic-gate roles are
available on all three models:

| Model       | Pre-op                                                             | Post-op                                                             |
| ----------- | ------------------------------------------------------------------ | ------------------------------------------------------------------- |
| **fable 5** | `Agent(subagent_type:'logic-gate-preop')` (native, the pinned def) | `Agent(subagent_type:'logic-gate-postop')` (native, the pinned def) |
| **opus 5**  | `Agent(subagent_type:'logic-gate-preop-opus')` (native)            | `Agent(subagent_type:'logic-gate-postop-opus')` (native)            |
| **kimi k3** | `dispatch-kimi.sh` + `kimi-code/k3` (profile below)                | `dispatch-kimi.sh` + `kimi-code/k3` (profile below)                 |

- The `-opus` defs are thin pointers: they Read the canonical role body from the fable-pinned def, so
  the role text exists in exactly one place and can never drift between models.
- Via the bridges, the model is just the `<model>` argument — `dispatch-claude.sh` accepts
  `claude-fable-5` or `claude-opus-5` for either role; the packet (canonical role body + materials)
  is identical either way.
- **kimi k3 profile:** `scripts/gates/kimi-gate-agent.md` (role-agnostic; the packet's ROLE section
  defines pre-op vs post-op). Dispatch:
  `KIMI_AGENT_FILE=<abs path>/scripts/gates/kimi-gate-agent.md bash scripts/kit-autonomy/dispatch-kimi.sh <packet> kimi-code/k3 <out.json>`
- Whichever model is chosen, record it: native runs can't inject the bridge's `model` provenance
  field, so note the model next to the result yourself.
- **Same-family caveat still applies:** if you pick a gate model from the driver's own family, label
  the verdict "same-family only" — the whole point of the gate is decorrelated priors.

## PRE-OP gate (before writing code)

Trigger: you have a plan for a non-trivial change. Trivial edits skip this — typo fixes, obvious
one-liners, mechanical renames. When in doubt whether it's non-trivial, it is.

1. Write the packet to `scratchpad/gates/<date>-<topic>/preop-packet.md`:
   - the FULL role body of `.claude/agents/logic-gate-preop.md` (minus its frontmatter), then
   - `## PROBLEM` — the problem statement, in the owner's words where possible,
   - `## PLAN` — your plan: steps, files to touch, approach, blast radius as you understand it,
   - `## CONTEXT` — the file:line anchors and constraints the plan stands on (keep it tight; the
     reviewer can Read/Grep to check anchors).
2. Dispatch per the routing table. Give the bridge a **600s shell timeout** — a large packet takes
   2–5 minutes on fable/k3; a 60s abort manufactures a fake "timeout" and pushes you to the weaker
   same-family fallback. Suspect impatience before suspecting the bridge.
3. Read the result JSON:
   - `APPROVED` → implement.
   - `APPROVED-WITH-REVISIONS` → every revision is MANDATORY. Execute each, and carry the revision
     list forward into the post-op packet — the post-op judge checks compliance item by item.
   - `REJECTED` → stop. Revise the plan around the stated reason and re-gate, or take it to the
     owner. Do not implement a rejected plan.

## POST-OP gate (after writing code, before commit)

Trigger: the implementation is done and `bash scripts/verify.sh` is green (run it first — do not
spend a cross-family dispatch on code that doesn't compile).

1. Write `scratchpad/gates/<date>-<topic>/postop-packet.md`:
   - the FULL role body of `.claude/agents/logic-gate-postop.md` (minus frontmatter), then
   - `## PRE-OP PACKET` — the original problem + plan, verbatim,
   - `## PRE-OP VERDICT` — the gate's verdict + its mandatory revisions, verbatim,
   - `## DIFF` — the actual `git diff` (uncommitted work, or branch-vs-base).
   - **Blindness:** do NOT include your own post-implementation self-assessment, summary, or verdict.
     A contaminated packet defeats the gate — the reviewer is instructed to flag contamination.
2. Dispatch per the routing table (600s timeout), read the result JSON:
   - `ACCEPT` → proceed to commit / code review.
   - `REJECT` → fix the BLOCKER findings and re-run the post-op gate on the new diff.
   - `INCONCLUSIVE` → read the reservations; either supply what was missing or escalate to the owner
     with both sides. Do not treat INCONCLUSIVE as a pass.
3. A dropped mandatory pre-op revision is REJECT-level by the role's own rules — if you intentionally
   deviated from one, say so in the packet and why, so the judge evaluates the deviation instead of
   discovering it.

## Notes

- Result JSONs carry the `model` provenance field (injected by the bridge). A result whose `model` is
  off-protocol is void — re-dispatch on the correct model.
- Keep the scratchpad packets until the change lands; they are the audit trail, and the post-op
  packet is rebuilt from the pre-op one.
- If the driver is Qwen, the kit-autonomy router's constraint applies unchanged (no native model
  pinning → CLI bridges for everything cross-family).
