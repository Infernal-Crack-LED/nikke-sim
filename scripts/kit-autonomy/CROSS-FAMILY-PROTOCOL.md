# kit-autonomy — cross-family model-routing protocol

Single source of truth for **which models** run the gauntlet's blind/review roles, to alleviate the
same-model shared-prior limit (`docs/kit-autonomy-decisions.md` §14.1). The stage procedure,
packet de-contamination, dispatch mechanics, result contracts, and reconciliation rules live in
**`scripts/kit-autonomy/SKILL.md` (the only procedure source)** — this file is deliberately just
the routing table, so a model-routing change is a ONE-file edit.

## Why

A clean GO from same-model blind reviewers is evidence against IDIOSYNCRATIC error, not proof of faithfulness:
two same-model agents both make the systematic misreads the model's prior favors (scope-collapse, duration-
semantics, trigger-identity) and CONVERGE on the wrong reading = false confidence. **Cross-family** reviewers
(different training data / priors) decorrelate those systematic errors. Cross-family ≫ within-family version
diversity (qwen3.8↔qwen3.7 share deep family priors; Qwen↔Claude do not).

## Routing policy

Roles: **S2b** adversarial test-faithfulness reviewer (blind) · **S5** blind test-writer · **S6** blind
override-writer · **S7** reconciling judge (NOT blind — grades artifacts).

| Tier             | When                                                                                                                           | S2b                        | S5               | S6               | S7                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------- | ---------------- | ---------------- | -------------------------- |
| **1 (default)**  | every unit                                                                                                                     | **cross-family**           | same-family      | same-family      | **cross-family**           |
| **2 (elevated)** | unit has a scoped-buff / round-count / `burstCast`-vs-`fullBurstEnter` / status-gate mechanic, OR is meta-defining/high-stakes | **cross-family ×2 models** | **cross-family** | **cross-family** | **cross-family ×2 models** |

- **Cross-family** = a different model FAMILY than the driver (Qwen driver → Claude reviewer; Claude driver →
  Qwen reviewer). **×2 models** = two reviewers from two families (or one family + a second version), both must
  converge.
- **Same-family** = the driver's own family, run as native subagents (cheap; still decorrelates idiosyncratic
  error via information asymmetry). For Claude, pin a DIFFERENT Claude model than the driver where possible
  (e.g. driver Sonnet → S2b/S7 on Opus/Fable) for within-family diversity on top of the cross-family check.
- The driver decides the tier up front (from the S1 line inventory) and records it.

## Canonical model names (authoritative)

The dispatch bridges pass the model string straight to the CLI (`claude -p --model <name>` /
`kimi -p`) — they do NOT map aliases, so the name must resolve in the target CLI, and
**similar-looking names are DIFFERENT models, not aliases**.

- **S2b (pre-op adversarial reviewer) → `claude-fable-5`**
- **S5 / S6 (post-op test-writer / override-writer) → `claude-opus-5`** (REQUIRED)
- **S7 (reconciling judge) → `kimi-code/k3`** (REQUIRED since 2026-07-26 — the binding judge moved off
  `claude-opus-5` onto the third family via `dispatch-kimi.sh`, so the verdict that gates landing is graded
  by a model family that shares no priors with either the driver or the S5/S6 writers)

`claude-opus-4-8` is a **different model and is NOT a substitute** for `claude-opus-5`. An ad-hoc batch prompt
may carry a wrong/older name; the dispatcher must follow THIS protocol, not the ad-hoc name, and flag the
conflict. Every result JSON records the name it was dispatched with (`model` field), so a result whose `model`
is off-protocol must be re-dispatched on the correct model. **Change the canonical names by editing THIS file
only** — every harness skill defers here.

**Kimi bridge:** `scripts/kit-autonomy/dispatch-kimi.sh` is the Kimi equivalent of the Claude bridge — same
packet/result contract, tools structurally disabled (agent profile with `tools: []`, verified it cannot read
files). Canonical Kimi model: **`kimi-code/k3`** (the strongest configured alias; `kimi-code/kimi-for-coding`
is a different, weaker model). Kimi counts as a separate FAMILY from both Qwen and Claude for cross-family
purposes; besides owning S7, it is a valid second reviewer for the tier-2 **×2 models** requirement on any
role (e.g. S2b reviewed by both `claude-fable-5` and `kimi-code/k3`).

## Generic engineering gates (outside the gauntlet)

The same shared-prior argument applies to ordinary code, so the gauntlet's cross-family pattern is
generalized by two skills — **`.claude/skills/logic-gate`** (pre-op plan review + post-op blind verdict,
role bodies `.claude/agents/logic-gate-preop.md` / `logic-gate-postop.md`) and
**`.claude/skills/code-review`** (post-op diff review, role body `.claude/agents/code-review.md`).
Their routing rule is one sentence: **the reviewer is always a different model FAMILY than the
driver/author.** Canonical models for the generic gates (same names as above, same one-file rule):

- **logic-gate pre-op + post-op** — Kimi/Qwen driver → `claude-fable-5` via `dispatch-claude.sh`;
  Claude driver → `kimi-code/k3` via `dispatch-kimi.sh`.
- **code-review** — Kimi/Qwen-authored code → `claude-opus-5` via `dispatch-claude.sh`;
  Claude-authored code → `kimi-code/k3` via `dispatch-kimi.sh`.
- Kimi-side **logic-gate** dispatches override the blind agent profile with
  `KIMI_AGENT_FILE=scripts/gates/kimi-gate-agent.md` (absolute path). **code-review** dispatches need
  no override: the bridge detects the `# code-review` packet heading and auto-selects the sighted
  profile (`scripts/kit-autonomy/kimi-code-review-agent.md`, read-only tools) — detection wins over a
  stale `KIMI_AGENT_FILE`, so a code review can never be forced back onto the blind profile. Native
  same-family runs of the pinned `.claude/agents` defs are a labeled fallback ("same-family only"),
  never a silent substitute.
- The logic-gate roles additionally ship per-model profiles for all three models
  (`logic-gate-preop` / `logic-gate-postop` on fable, `-opus` variants on opus, kimi-gate-agent.md for
  k3) so the invoker can explicitly name the gate model — see the logic-gate skill § "Choosing the
  gate model". An explicit invoker choice overrides the defaults above; same-family picks must still
  be labeled.
