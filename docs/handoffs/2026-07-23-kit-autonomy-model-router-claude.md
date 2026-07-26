# kit-autonomy — model router (Claude-side implementation work order) (2026-07-23)

> AI-facing handoff / work order for **CLAUDE**. Owner-approved direction (2026-07-23): implement the
> Claude-side model-routing layer for the kit-autonomy gauntlet, to alleviate the same-model shared-prior limit
> (`docs/kit-autonomy-decisions.md` §14.1). The **Qwen side is already implemented**
> (`.claude/skills/kit-autonomy-qwen/` + `scripts/kit-autonomy/prepare-cross-family-packet.ts`); this is the
> symmetric Claude side. **Single source of truth for interop:** `scripts/kit-autonomy/CROSS-FAMILY-PROTOCOL.md`
> — read it first; do not re-derive the protocol here.

## Why (the problem this solves)
A clean GO from same-model blind reviewers is evidence against IDIOSYNCRATIC error, not proof of faithfulness:
two same-model agents both make the systematic misreads the model's prior favors (scope-collapse, duration-
semantics, trigger-identity — the repo's dominant error classes) and CONVERGE on the wrong reading = false
confidence. **Cross-family** reviewers (different training data / priors) decorrelate those systematic errors.
**Cross-family (Qwen↔Claude) ≫ within-family version diversity** (qwen3.8↔qwen3.7 share deep family priors).
Model diversity RAISES confidence; it does not certify faithfulness (shared blind spots + measurement-gated
magnitudes still need the owner/measurement).

## Claude's advantage (what Claude can do that Qwen can't)
The Claude `agent`/Workflow tool **has a `model` parameter** (audit-kit already pins Opus/Fable for the blind
rebuild). So Claude can:
1. **Pin same-family blind roles to a DIFFERENT Claude model than the driver** — within-family diversity (e.g.
   driver Sonnet → S2b/S7 on Opus/Fable). Weaker than cross-family, but real, and cheap.
2. **Prepare cross-family handoffs to Qwen** (the strong fix) — de-contaminated packets the owner runs through
   Qwen, then reconcile the results.

## Work order
1. **Add `## Model routing` to `.claude/skills/kit-autonomy/SKILL.md`** — the routing policy from the protocol
   (which model runs each blind role, by driver model + risk tier). Reference
   `scripts/kit-autonomy/CROSS-FAMILY-PROTOCOL.md`; do not duplicate it.
   - **Tier 1 (default):** S2b + S7 cross-family (Qwen) AND pinned to a different Claude model than the driver
     (within-family on top); S5 + S6 same-family on a cheaper/faster Claude model (cost-tiering).
   - **Tier 2 (elevated — scoped-buff / round-count / `burstCast`-vs-`fullBurstEnter` / status-gate mechanic, or
     meta-defining unit):** S2b/S5/S6/S7 all cross-family; S2b + S7 on ×2 models (Qwen + a different Claude model).
2. **Implement the Claude-side blind reviewers with model pinning** — dispatch S2b/S5/S6/S7 via the existing
   `agent(..., { model })` / Workflow mechanism (the audit-kit pattern), pinned per the routing policy.
3. **Implement the cross-family handoff to Qwen:**
   - The packet-prep script `scripts/kit-autonomy/prepare-cross-family-packet.ts` is **model-agnostic** (it just
     builds de-contaminated packets + leak-asserts) — **invoke it directly**; no need to port it. It redacts the
     `types.ts` comments naming the target (the D12 leak) + the methodology, assembles each role's packet, and
     runs the MANDATORY leak assertion (no answer tokens outside the prose block).
   - Write `scripts/kit-autonomy/cross-family/<slug>/REQUEST.md`; hand to the owner to run each packet through
     Qwen; reconcile the returned `<role>-result.json` per the protocol.
4. **Update the verdict** to report provenance + the honest residual:
   - **"GO (same-model only)"** vs **"GO (cross-family corroborated)"** (S2b + S7 at least ran on the other
     family and converged on the load-bearing lines).
   - Flag the lines resting only on same-model agreement + the shared-blind-spot caveat (no model count
     eliminates it — those need the owner/measurement).

## Acceptance criteria
- The skill routes S2b/S7 cross-family by default (Tier 1) and all roles cross-family for Tier-2 units.
- Same-family blind roles are pinned to a different Claude model than the driver (within-family diversity).
- De-contaminated packets pass the leak assertion (verify: the script exits 0 and the independent awk-grep
  re-check in the Qwen skill finds no answer tokens outside the prose block).
- The verdict reports provenance + the honest residual.
- `bash scripts/verify.sh` green; the privaty run still GOs (re-run the gauntlet end-to-end as the integration test).

## Notes / future work
- True cross-family calls still need the owner (or a multi-provider bridge) to run packets through the other
  family; automating that bridge is future work. The router automates everything up to the handoff + the
  reconciliation when results return.
- The content-gate behaves differently per model — Claude may handle the suggestive kit prose differently than
  Qwen. The blind roles read the prose; verify Claude's blind reviewers don't trip the classifier on the
  prose-bearing packets (the structural-reading instruction is in the templates).
- Keep the protocol (`CROSS-FAMILY-PROTOCOL.md`) as the single source of truth — if you change the packet/result
  format, change it there so the Qwen side stays in sync.
