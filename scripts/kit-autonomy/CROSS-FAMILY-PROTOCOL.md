# kit-autonomy — cross-family model-routing protocol

Single source of truth for routing the gauntlet's blind roles across MODEL FAMILIES, to alleviate the
same-model shared-prior limit (`docs/kit-autonomy-decisions.md` §14.1). Both the Qwen-side router
(`.claude/skills/kit-autonomy-qwen/`) and the Claude-side router (see the Claude handoff
`docs/handoffs/2026-07-23-kit-autonomy-model-router-claude.md`) implement this protocol so they interoperate.

## Why
A clean GO from same-model blind reviewers is evidence against IDIOSYNCRATIC error, not proof of faithfulness:
two same-model agents both make the systematic misreads the model's prior favors (scope-collapse, duration-
semantics, trigger-identity) and CONVERGE on the wrong reading = false confidence. **Cross-family** reviewers
(different training data / priors) decorrelate those systematic errors. Cross-family ≫ within-family version
diversity (qwen3.8↔qwen3.7 share deep family priors; Qwen↔Claude do not).

## Routing policy
Roles: **S2b** adversarial test-faithfulness reviewer (blind) · **S5** blind test-writer · **S6** blind
override-writer · **S7** reconciling judge (NOT blind — grades artifacts).

| Tier | When | S2b | S5 | S6 | S7 |
| --- | --- | --- | --- | --- | --- |
| **1 (default)** | every unit | **cross-family** | same-family | same-family | **cross-family** |
| **2 (elevated)** | unit has a scoped-buff / round-count / `burstCast`-vs-`fullBurstEnter` / status-gate mechanic, OR is meta-defining/high-stakes | **cross-family ×2 models** | **cross-family** | **cross-family** | **cross-family ×2 models** |

- **Cross-family** = a different model FAMILY than the driver (Qwen driver → Claude reviewer; Claude driver →
  Qwen reviewer). **×2 models** = two reviewers from two families (or one family + a second version), both must
  converge.
- **Same-family** = the driver's own family, run as native subagents (cheap; still decorrelates idiosyncratic
  error via information asymmetry). For Claude, pin a DIFFERENT Claude model than the driver where possible
  (e.g. driver Sonnet → S2b/S7 on Opus/Fable) for within-family diversity on top of the cross-family check.
- The driver decides the tier up front (from the S1 line inventory) and records it.

## Neither family natively calls the other → handoff-based dispatch
The Qwen `agent` tool has no `model` param; Claude's `agent`/Workflow pins Claude models only. So a cross-family
role is dispatched by **packet handoff**:

1. **Driver prepares a de-contaminated packet** for the cross-family role (below) and writes it to
   `scripts/kit-autonomy/cross-family/<slug>/<role>-packet.md` (e.g. `s2b-packet.md`, `s7-packet.md`).
2. **Driver writes** `scripts/kit-autonomy/cross-family/<slug>/REQUEST.md` listing the packets that need
   cross-family review, the role each is for, the model family requested, and the expected result path.
3. **The other family** (invoked by the owner, or via a bridge) reads the packet, runs the role UNMODIFIED, and
   writes its result to `scripts/kit-autonomy/cross-family/<slug>/<role>-result.json` (contract below).
4. **Driver reconciles** the cross-family result(s) with its same-family results into the verdict, and records
   which roles were cross-family-reviewed.

## Blind-packet de-contamination (S2b / S5 / S6 only)
The blind roles read the kit PROSE (legitimate input — it names the mechanic being derived) + the effect SCHEMA
(`types.ts`) + the failure-mode methodology. They must NOT receive any text that STATES the target's answer.
1. **Redact the schema:** strip every line of `types.ts` that names the target slug or any ANSWER TOKEN (the
   target's magnitudes + signature mechanic names — e.g. for privaty: `256.17`, `1687`, `1407.64`,
   `Designated Target`). (`types.ts` comments name specific units — this is the leak found in D12.)
2. **Redact the methodology:** use the unit-agnostic `scripts/kit-autonomy/redacted-methodology.md`; strip any
   line naming the target slug (examples naming OTHER units are fine — they don't leak the target).
3. **Assemble** the packet = role template (`TEST-FAITHFULNESS-REVIEW.md` / `BLIND-TEST-WRITER.md` /
   `BLIND-OVERRIDE-WRITER.md`) + the kit prose + the redacted schema + the redacted methodology + the harness API.
4. **Leak assertion (MANDATORY, mirrors `build-packet.ts`):** grep the assembled packet for the target slug +
   every answer token, **outside the prose block**; FAIL loudly if any appear. The Qwen-side automation is
   `scripts/kit-autonomy/prepare-cross-family-packet.ts`.

**S7 (judge) is NOT de-contaminated** — it grades the driver's artifacts, so its packet is the FULL judge packet
(the `results/judge-packet.md` pattern: prose + formula SSOT + the two engine facts + the driver's test +
override + the S2b/S5/S6 outputs + the convergence result). Cross-family S7 just runs that packet on the other
family.

## Result contracts
- **S2b** → `test-review.json` (contract in `TEST-FAITHFULNESS-REVIEW.md`): per-line disposition + nearest-wrong
  model + distinguishing assertion + load-bearing set + `leakDetected`.
- **S5** → `blind/<slug>.test.ts` + `test-spec.json` (contract in `BLIND-TEST-WRITER.md`).
- **S6** → `blind/<slug>.override.json` + `audit.json` (contract in `BLIND-OVERRIDE-WRITER.md`).
- **S7** → `results/<slug>.json` (contract in `RECONCILING-JUDGE.md`): lineFindings + gotchas + `kitDescription`
  + `faithfulnessScore` + verdict (GO / NO-GO(faithfulness) / NO-GO(engine-core)).
Every result records `model` (which model/family produced it) so the verdict can report provenance.

## Reconciliation + verdict reporting
The driver combines same-family + cross-family results:
- **Convergence across families** on a load-bearing line = strong evidence (the line survives different priors).
- A **cross-family divergence** the same-family run missed = a candidate REAL-GOTCHA (the payload cross-family
  review exists to catch); the judge classifies it.
- The verdict MUST report: which roles ran cross-family (and on which family), the same-model confidence, the
  cross-family confidence (if any), and the **residual** (lines that rest only on same-model agreement, and the
  shared-blind-spot caveat that no model count eliminates — those still need the owner/measurement).
- A GO with NO cross-family review is downgraded to "GO (same-model only)"; a GO with cross-family convergence on
  the load-bearing lines is "GO (cross-family corroborated)".

## Status of this protocol
Designed 2026-07-23. The Qwen side (packet prep + same-family dispatch + handoff + reconciliation) is
implemented in `.claude/skills/kit-autonomy-qwen/` + `scripts/kit-autonomy/prepare-cross-family-packet.ts`. The
Claude side (model-pinned same-family reviewers + the cross-family handoff to Qwen) is the work order in the
Claude handoff. True cross-family calls still require the owner (or a multi-provider bridge) to run the packets
through the other family — automating that bridge is future work.
