# kit-autonomy gauntlet — autonomous test-first kit-faithfulness pipeline (2026-07-23)

> AI-facing handoff. Owner-approved direction (2026-07-23 autonomous session): build + validate an autonomous,
> fully-agent-driven workflow that takes a unit from its `data/characters.json` kit entry to a fully
> unit-tested, engine-faithful override WITHOUT an owner-driven spec review — replacing the owner gate with
> INDEPENDENT RE-DERIVATION + a binding judge. Validated end-to-end on `privaty` (verdict **GO**, score **1.0**).

## What landed
- **Methodology of record:** `docs/kit-autonomy-decisions.md` (branch `worktree-kit-autonomy`; Part I lessons,
  Part II the gauntlet, **§14 red-team revisions are AUTHORITATIVE**, Part III the privaty run).
- **Skill:** `.claude/skills/kit-autonomy/SKILL.md` (this private set) + tracked templates in
  `scripts/kit-autonomy/` (TEST-FAITHFULNESS-REVIEW / BLIND-TEST-WRITER / BLIND-OVERRIDE-WRITER /
  RECONCILING-JUDGE / README) + run artifacts (`reviews/` `blind/` `results/`, incl. the full red-team review).
- **The faithful, fully-unit-tested kit:** `scripts/tests/units/privaty.test.ts` (17 assertions, GREEN).

## The core insight (why test-centric, not prose-triangulation-centric)
The TDD transition plan proved prose→JSON triangulation "generates and checks at the same altitude, so a
plausible-but-wrong reading survives both." The unit TEST is the forcing function (`expect(gone on round 11)`
is unwritable from a vague reading). So the gauntlet is **test-centric**: the test is the gate; blind/sighted/
judge triangulation is a SECONDARY sampler, subordinated so a prose→JSON agreement can never override a test
disagreement.

## The stages
S1 read + slug gate → **S2a** write tests FIRST (GREEN-vs-shipped pins + RED-vs-counterfactual for FAITHFUL
lines; RED-vs-shipped for FIX/MISSING) → **S2b** adversarial blind test-faithfulness reviewer → **S2c**
reconcile → **S2d** independent verification gate (no self-reported RED) → **S3** faithful override → **S4**
engine (isolated worktree, only if a primitive is missing) → **S5** blind test-writer → **S6** blind
override-writer (kit-parse BLIND-STUDY) → **S7** reconciling judge (binding GO/NO-GO; convergence = run the S5
test UNMODIFIED vs the shipped override; GREEN = converge). No-go loop: ≤2 retries on NO-GO(faithfulness), then
escalate via the `autonomous_session_webhook`; never weaken an assertion or re-add an unfaithful encoding to GO.

## Red-team hardening (§14 — read before enacting)
An independent red-team found the methodology "structurally sound but NOT enactable as-is." Adopted must-fixes:
- **R2 — de-contaminate the blind packet:** strip the target's name/magnitudes/answer from the methodology AND
  the schema (`types.ts` comments name specific units!) handed to blind roles; leak-assert EVERY file they read.
- **R3** — FAITHFUL lines on a faithful override are GREEN-vs-shipped pins (not RED-vs-shipped).
- **R4** — an independent execution gate verifies GREEN-vs-shipped + RED-vs-counterfactual (no self-reported RED).
- **R1/R6** — the same-model limit (below); GO-claim downgraded; model diversity unavailable here.
- **R5/R7** — convergence is mechanical (run S5 tests vs shipped; GREEN = converge).
- **R8** — D3 (noRange) is an engine-invariant sanity check, not a discriminator.

## The same-model limit (the honest residual — do not over-trust a GO)
All reviewing agents are the SAME model (the agent tool has no `model` param; audit-kit's Opus-pinning is
unavailable here). Blindness removes ANCHORING/contamination bias (real, valuable) but NOT SHARED-PRIOR bias:
two same-model agents BOTH make the systematic misreads the model's prior favors (scope-collapse, duration-
semantics, trigger-identity — the repo's dominant error classes) and CONVERGE on the wrong reading = FALSE
CONFIDENCE. A clean GO is evidence against IDIOSYNCRATIC error + a forcing-function check that each line was read
precisely — NOT proof of faithfulness. Mitigations baked in: adversarial blind agents, de-contaminated packets,
the independent execution gate, the judge's formula check. The REAL fix is model diversity (a different model for
the blind roles) or the owner's eye on the systematic-prior-prone lines.

## privaty run result
**GO, faithfulnessScore 1.0, 0 REAL-GOTCHA.** Both blind re-derivations (S5 test, S6 override) converged with the
driver **leak-free**, including the load-bearing `requiresTargetStatus` 1687 gate (derived from the prose alone).
The one mechanical RED (S5 P5) was a **RECON_ERROR** — boss debuffs emit `casterIdx=null` AND `targetIdx=null`
(empirically confirmed), so S5's casterIdx filter found 0; the driver's stat+value filter is correct. Engine
finding surfaced: `noFb` is INERT under FB-by-timing + rejected by `validate-overrides`. Board: privaty reads HOT
(mean 1.099) = **fit-exposure, NOT encoding** (faithful>fit ⇒ not reverted; a separate localization thread).

## Follow-ups / next increments
1. **Merge `worktree-kit-autonomy` → main** (16 commits; `verify.sh` green) — owner's call. The decisions doc +
   templates + test land in the public repo; the skill is already in this private set.
2. **Owner spot-check** the 1687 gate + Max-Ammo▼ tandem (highest-risk same-model reads) + the measurement-gated
   magnitudes before trusting the GO for faithfulness (vs just idiosyncratic-error freedom).
3. **doc-drift:** fix the stale `types.ts` `targetStatus` comment ("privaty's Designated Target … NOT enacted,
   still measurement-gated" — the gate IS enacted). Out of scope this session.
4. **Generalize:** run the gauntlet on the next unit (a moderate, well-understood unit with a shipped override +
   1-2 sharp mechanics). The skill + templates are reusable; the redaction (§14.2) is per-target.
5. **Model diversity:** if a multi-model setup becomes available, pin the blind roles (S2b/S5/S6/S7) to a
   different model than the driver — the real fix for the shared-prior limit.
