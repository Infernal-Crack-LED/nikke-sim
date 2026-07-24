# Red-team review — `kit-autonomy` gauntlet methodology

Reviewer: independent subagent (READ-ONLY; no files modified, no sims run).
Sources read (once each): `docs/kit-autonomy-decisions.md` (428 lines, 3 chunks);
`.claude/skills/kit-tdd/SKILL.md`; `.claude/skills/audit-kit/SKILL.md`; `.claude/skills/kit-parse/SKILL.md`.
Citations are to doc `§` and skill names. Adversarial brief; flattery omitted.

---

## (a) Concepts confirmed SOUND

1. **"Tests are the gate; triangulation is the sampler" (§2, §5.5b, D2).** SOUND. The unit test is the
   only stat-/footage-independent instrument; subordinating prose→JSON triangulation to it is the correct
   response to the TDD plan's same-altitude finding. (Confidence: high.)
2. **Test-derivation forces operational precision that prose→JSON can fudge (§2, §12.1).** SOUND *as far as
   it goes* — `expect(gone on round 11)` forces a rounds-vs-seconds commitment that `durationSec 13` hides.
   Writing the assertion is a real forcing function. (Confidence: high — but see Risk R1 for the limit.)
3. **Blindness-by-construction = "what each role is handed" (§10, §12.6).** SOUND as a *mechanism* and
   faithful to audit-kit's "YOU guard what you hand the subagent." Removing the driver's
   implementation/reasoning from blind roles genuinely prevents anchoring/rubber-stamping. (Confidence:
   high on the mechanism; see R2 for contamination that voids it on the live target.)
4. **Faithful>fit / measured>fudge anti-fudge invariants enforced at every stage + bounded loop + webhook
   escalation (§4, §12.3, §12.5).** SOUND and correctly inherited from kit-tdd. "Driver may not re-add
   `noFb` or shave datamined coefficients to reach GO" is exactly the right invariant for the privaty
   HOT-residual demo. (Confidence: high.)
5. **Evidence-tier tagging on every assertion + override value (§5.1, §11#4, §12.4).** SOUND; prevents a
   `CALIBRATED ⚑` being read as `MEASURED`. (Confidence: high.)
6. **kit-parse VALUES-WITHHELD honored in S6 (§10 S6 withholds probe-data/handoffs/board/grade.ts).**
   SOUND — the blind override-writer cannot fit to the board. (Confidence: high.)
7. **Fixture insight: a lone B3 makes ZERO Full Bursts; `controlComp` supplies B1/B2 so the B3 actually
   casts (§6b, kit-tdd Step 2).** SOUND and load-bearing for the targetStatus gate. (Confidence: high.)

---

## (b) RISKS / GAPS — ranked by severity

### R1 (CRITICAL) — The load-bearing claim is overclaimed: same-model convergence ≠ correctness.
**Risk.** §2/§12 claim that if two independent agents, given only the kit text, *converge* on
`expect(gone on round 11)`, the reading is "forced by the text — not a plausible misread." But every
reviewing agent is the **same underlying model** with the same priors and the same reading-comprehension
biases. Blindness removes **anchoring/contamination** bias (real, valuable) but does **NOT** remove
**shared-prior** bias. A plausible-but-wrong reading the model's prior *favors* will be produced identically
by the driver and the blind agent — they converge, and the convergence is **false confidence**, strictly
worse than no signal because it manufactures certainty.
**Why it matters.** The repo's OWN taxonomy says the dominant errors are **systematic**, not idiosyncratic:
helm scope-collapse ("crit of normal attacks"→generic crit, §5.2#2), duration-semantics ("N rounds"→seconds,
#3), trigger-identity (`burstCast`↔`fullBurstEnter`, #4). These are exactly the misreads two same-model
agents BOTH make and converge on. The design's value-claim ("a clean GO is real evidence, not the author
agreeing with themselves," §4) is therefore only half-true: it decorrelates *random* error but certifies
*systematic* error.
**Where the substitution HOLDS:** idiosyncratic-error decorrelation (independent arithmetic), and prose that
genuinely forces a single reading (low ambiguity). **Where it SILENTLY FAILS:** ambiguous prose + a wrong
shared prior; and shared *blind spots* (a subtlety neither agent registers as a decision point — convergence
on the *absence* of a discriminating assertion, which is invisible).
**Fix.** (i) State the limit explicitly in §2/§12: convergence proves *stability across same-model
reasoners*, not correctness. (ii) **Add model diversity** — pin the blind roles (S2b/S5/S6/S7) to a model
*different from the driver* (audit-kit pins Opus for exactly this reason; the design drops it — see R6).
(iii) Make the blind agents **adversarial**: instruct them to *generate the nearest-wrong reading and the
assertion that distinguishes it*, not merely re-derive — this surfaces the shared prior instead of echoing it.

### R2 (CRITICAL) — Blindness is contaminated for the live target (`privaty`).
**Risk.** The material handed to the blind roles names privaty's answer:
- §5.2 failure-mode #4 (handed to S2b/S5): *"…privaty = `lastBullet` + `targetStatus` gate."*
- §5.6 (handed via §5): *"lastBullet / targetStatus interaction gets its first pin from privaty in this run."*
- kit-parse **hard-rule #5** (handed to S6): *"EXACT wording… Privaty S2 'Activates when the last bullet
  hits… Deals 256.17% … additional damage'."* — names the mechanic **and the magnitude**.
A blind agent handed these does not *derive* anything; the cheat-sheet has the answer. This **voids the
independent re-derivation for exactly the unit being validated.**
**Why it matters.** The live run's "independent convergence" signal becomes meaningless — the blind agents
are sighted for privaty. The whole §12.1 value-claim collapses on its own demonstration unit.
**Fix.** Build a **redacted blind packet** for S2b/S5/S6: strip every unit-specific answer (privaty's name,
its trigger/gate/magnitudes) from the §5 excerpt and the kit-parse hard-rules excerpt before dispatch, OR
choose a live target NOT named in §5/hard-rules. Add an **automated leak assertion** (grep the blind prompt
for the slug's key magnitudes `256.17/1687/1407.64` and mechanic tokens) mirroring `build-packet.ts` — the
new test-writer roles (S2b/S5) currently have **no** automated guard, contrary to the "mirrors
build-packet.ts's leak assertion" claim (§10). (Also resolves the soft leaks: the full `types.ts` schema
hands the blind agent `requiresTargetStatus`/`lastBullet`, priming it to "find" a targetStatus gate.)

### R3 (CRITICAL) — S2a "RED vs the shipped override" is mis-specified for an already-faithful override.
**Risk.** S2a gate: *"tests confirmed RED vs the shipped override."* But privaty's shipped override is
**already faithful** (§6: MEASURED+tuned, every line FAITHFUL in §6a; the HOT residual is calibration, not
encoding). A *correct* discriminating test for a faithful override is **GREEN vs shipped** and **RED vs the
nearest-wrong counterfactual** (`withPatchedOverride` noFb/ungated). The design's own **D4** confirms this:
it "certifies the faithful model against the fit-fudge" — i.e. GREEN vs the faithful shipped override, RED
vs the removed-`noFb` counterfactual. So S2a's "RED vs shipped" directly contradicts D4 for the chosen target.
**Why it matters.** Taken literally, "RED vs shipped" either (a) is impossible for a correct test on a
faithful override, or (b) forces the driver to write a *wrong* test that fails against the correct encoding.
This is kit-tdd's #1 warning ("a test from a wrong reading certifies the misread forever") re-entering.
**Fix.** Disambiguate the already-faithful case in S2a: **discrimination = GREEN-vs-shipped-faithful AND
RED-vs-each-named-counterfactual.** "RED vs shipped" applies only to FIX/MISSING lines on an unfaithful
override; FAITHFUL lines on a faithful override must be GREEN-vs-shipped.

### R4 (HIGH) — No independent verification that tests were ever RED / discriminate.
**Risk.** kit-tdd: "Confirm RED before implementing. A test that was green before the fix asserted nothing."
In the autonomous pipeline the **driver self-reports** discrimination. Nothing stops the driver from writing
a test that passes against BOTH the shipped override and the counterfactual (asserts nothing) and reporting
it as discriminating.
**Why it matters.** This is the autonomous form of the exact failure kit-tdd's owner-gate prevents. Combined
with R3, it is the most dangerous hole in the pipeline.
**Fix.** Add a hard, **independently-executed** gate before S3: a separate subagent (or automated step) runs
the S2a tests against (i) the unmodified shipped override — expect GREEN for FAITHFUL lines — and (ii) each
named counterfactual via `withPatchedOverride` — expect RED — and records both run outputs as artifacts.
Self-reported RED is not acceptable.

### R5 (HIGH) — "Nearest-wrong model" and "load-bearing line" are driver-defined with no independent check.
**Risk.** §11#5 requires each test to "fail under the nearest-wrong model," but the **driver** picks the
nearest-wrong model. The driver can pick a **straw-man** the assertion trivially beats, while the *actual*
nearest neighbor (a subtler misread) passes. Likewise §11#3's "load-bearing lines" is undefined — if the
driver decides load-bearing-ness, they can declare a divergent line non-load-bearing to reach GO.
**Why it matters.** Turns the discrimination and convergence gates into honor-system self-assessment.
**Fix.** Have the blind agents (S2b/S5) **independently propose the nearest-wrong model per line** and an
objective load-bearing definition (e.g. "any FAITHFUL/FIX/MISSING line that is not UNMODELED"); a
driver↔blind divergence on either is itself a divergence the judge reconciles. This ties #5 to the
independent re-derivation cleanly.

### R6 (HIGH) — audit-kit's model-pinning dropped without replacement (fidelity + independence).
**Risk.** audit-kit pins all three reviewers to `model: "opus"`; part of its independence guarantee comes
from a deliberate model choice. The design specifies **no** model pinning for S2b/S5/S6/S7. If driver and
all reviewers are the same model, R1's shared-prior problem is maximal.
**Fix.** Specify model diversity (blind roles ≠ driver model), or explicitly acknowledge same-model
convergence is weak evidence and downgrade the GO-claim accordingly.

### R7 (HIGH) — Convergence (GO #3) is not mechanically operational.
**Risk.** §11#3: "the blind re-derivations agree with the driver's implementation on the load-bearing
lines." S5 produces a **test file**, not a spec table — "agree" is undefined. How does the judge compare a
blind test file to an override?
**Fix.** Operationalize: **run the S5 blind tests, unmodified, against the driver's shipped override; GREEN
= convergence, any RED = a divergence the judge classifies.** This is mechanical, strong, and uses the
test-as-gate principle consistently. (Note the asymmetry the rubric already half-gets right: a *divergence*
the blind caught is the real signal; mere *agreement* among same-model agents is weak — see R1.)

### R8 (MEDIUM) — D3 (noRange) is a tautology, not a discriminating assertion.
**Risk.** D3 asserts "no +0.3 range term." But the design's OWN sources say the engine **force-sets
`noRange`** on all flatDamage (§5.2#12: "noRange is auto-set, redundant to write"; kit-parse prior 2: "the
engine force-sets noRange, so never set or flag it"). Therefore the assertion holds for **any** override the
driver could write — there is **no reachable nearest-wrong model**. D3 cannot fail under any encoding; it
asserts an engine-global invariant, not a per-unit encoding choice.
**Why it matters.** Listed as one of four discriminating assertions, but discriminates nothing about
privaty's faithfulness. Inflates the apparent discrimination coverage.
**Fix.** Drop D3 or reclassify it as an engine-invariant sanity check, not a kit-faithfulness discriminator.

### R9 (MEDIUM) — Magnitude faithfulness is out of scope but not declared so.
**Risk.** The discriminating assertions are **structural** (fires/doesn't, in/out-window, FB/no-FB). The
magnitudes (256.17 / 1687 / 1407.64) are MEASURED-tier, taken as given. Tests are stat-independent *by
design*, so a wrong-but-plausible magnitude would pass every assertion. The gauntlet gates
structure/trigger/scope/duration faithfulness, **not** magnitude faithfulness.
**Why it matters.** For privaty this is fine (fresh owner-signed measurements). As a *general* pipeline it
silently under-covers; a future unit with a plausible-wrong magnitude would GO cleanly.
**Fix.** State explicitly in §11 that magnitude faithfulness is **owner/measurement-gated and out of scope**
for the autonomous gate; the pipeline certifies structure, not numbers.

### R10 (MEDIUM) — Offsetting-error / "modeled≠working" not checked by the rubric.
**Risk.** §5.5a warns a unit graded ~1.0 can still be wrong (a value calibrated to *absorb* a missing shared
buff). The rubric checks encoding-vs-prose per line but has **no** "does each block actually FIRE at the
prose-implied rate over 180s" check. kit-parse Step 5 has this (DBG side-effect check); the gauntlet's §11
does not.
**Fix.** Add a rubric check: each FAITHFUL block's fire count over the fight matches the prose-implied
cadence (the DBG side-effect confirmation), not just structural presence.

### R11 (MEDIUM) — ⚑ estimates can be back-fit by the driver (honesty of estimates).
**Risk.** The driver (S1) **sees the board reading** (§10 S1). kit-parse's VALUES-WITHHELD protects the
*blind parser* from the board, but the driver commits ⚑ estimates with the board in view — nothing stops a
back-fit estimate. The anti-fudge invariant (§12.3) forbids it but no check enforces it.
**Why it matters.** Moot for privaty (no ⚑ — all MEASURED), real for the general pipeline.
**Fix.** Commit ⚑ estimates **before** consulting the board reading, or have a blind agent re-derive each
estimate and compare.

### R12 (LOW–MEDIUM) — D2/D4 fixture & observability caveats.
- **D2** depends on reconstructing the Designated-Target window from `burstCast` timestamps, because §5.4
  documents **no `targetStatus` event**. Likely requires an **S4 event-payload extension** (which §5.4
  anticipates) — flag as a probable S4 dependency, not a blocker. Also add a **non-vacuity precondition**:
  assert ≥1 last bullet occurs **in-window AND ≥1 out-of-window** in the fixture, else the gate assertion
  tests nothing (or fails for fixture reasons).
- **D4** "both riders take the FB major" is only testable for the **256.17** rider (it has in- and
  out-of-FB instances). The **1687** rider fires only in-window (inside FB by construction), so it has **no
  out-of-FB baseline** — its FB-major is not independently discriminable. The "both riders" claim is
  overstated; D4 discriminates for 256.17 (measured 1.5015×) only.
- **D1/D2 attribution:** confirm the `damage` event payload lets a flatDamage be attributed to its trigger
  (`lastBullet` vs `burstCast`). If attribution is only by magnitude, that works for privaty (256.17 / 1687
  / 1407.64 are distinct) but is fragile — state the reliance.

### R13 (LOW) — No board A/B stage in S1–S7; judge "blind to reasoning" is overstated.
- kit-tdd Step 4 (board A/B, "run both, report both") has **no** stage in S1–S7. §6 mentions board readings
  "for the outer A/B loop" but the protocol never runs/reports it. Add an explicit (non-gating) board A/B
  report stage.
- §10 S7 "blind to the driver's chain-of-thought" is partly illusory: the judge sees the driver's tests +
  override + engine change, which **embody** the reasoning. Reframe as "grades artifacts vs ground truth,
  does not trust the author's self-report" — correct, but not "blind."

---

## (c) Fidelity verdict on the three source skills

**kit-tdd — represented ACCURATELY; substitutions declared honestly; residual risk understated.**
- "Owner drives the spec / never auto-generate the spec table" — correctly quoted; the design *explicitly*
  declares the substitution (§12). ✓ Honest. But it **understates** the residual risk: kit-tdd's warning
  ("a test from a wrong reading certifies the misread forever") is not fully neutralized by same-model
  re-derivation (R1/R3).
- "Tests run against the SHIPPED override unpatched; `withPatchedOverride` only for the counterfactual" —
  inherited verbatim (§7, §13). ✓
- "Confirm RED before implementing" — inherited as a gate, but **self-reported** in the autonomous form (R4)
  and **mis-specified for a faithful override** (R3).
- "In an autonomous session, do neither edit — append to queue" — explicitly overridden with owner
  authorization for the worktree branch (§1, D4). ✓ Declared.

**audit-kit — represented ACCURATELY; one invariant violated in practice for the live target; one dropped.**
- "Blindness is load-bearing; separate subagent with only packet + code" — stated correctly (§10, §12.6) but
  **violated in practice** by handing §5/hard-rules that name privaty's answer (R2).
- "build-packet.ts leak assertion" — claimed as the model, but the **new test-writer roles have no automated
  leak guard** (R2). Slight overclaim.
- Model-pinning to Opus — **dropped without replacement** (R6).
- "findings-only; edits nothing" — preserved: triangulation agents (S5/S6/S7) stay findings-only; the driver
  edits. ✓

**kit-parse — represented ACCURATELY; VALUES-WITHHELD honored; blind-study contaminated for the target.**
- VALUES-WITHHELD (no grade.ts/experiment/board/other-units'-probe-data) — S6 correctly withholds all of
  these. ✓
- BLIND-STUDY (no own override / DECISIONS / handoffs / probe-* / git history) — S6 matches exactly. ✓
- Hard rules + ALWAYS-⚑ + faithful>fit + measured>fudge — inherited intact. ✓
- **But** hard-rule #5 names "Privaty S2 … 256.17% … lastBullet" as the canonical example, and S6 is handed
  "kit-parse hard rules" — so the blind override-writer sees privaty's answer (R2). Violates the *spirit* of
  BLIND-STUDY for the live target.

**Net:** no *misstatement* of what the skills say; the substitutions are declared. The problems are
*practical violations* (R2 contamination, R6 dropped pinning) and an *understated residual risk* (R1).

---

## (d) Privaty-specific verdict (will D1–D4 discriminate; fixture issues)

- **Fixture is burst-capable — OK.** `controlComp('privaty', true)` = liter(B1)/crown(B2)/privaty(B3)/helm(B3):
  the B1→B2→B3 chain completes, so privaty **does cast** and applies Designated Target (B3) — the targetStatus
  gate is exercisable. Works with `helm=false` too (privaty remains the B3). Element note (Water vs Fire boss)
  correctly flagged for the B1 `elemAdvantageDamagePct` line; D1–D4 are element-independent. ✓
- **D1 (lastBullet cadence) — discriminates, with a degenerate variant.** "≈ reloads" vs "≈ shots" is real.
  "fires per hit" is **degenerate** for privaty (`hitsPerShot 1` ⇒ shot==hit) — not a distinct nearest-wrong
  model. Needs damage-event trigger/magnitude attribution (R12).
- **D2 (targetStatus-gated 1687) — discriminates; fixture OK; observability needs work.** Gated vs ungated
  (out-of-window >0) vs never (in-window 0) all caught. **But** no `targetStatus` event (§5.4) ⇒ window must
  be reconstructed from `burstCast` timestamps; likely an **S4 payload-extension dependency**. Add the
  non-vacuity precondition (≥1 in-window AND ≥1 out-of-window last bullet). (R12.)
- **D3 (noRange) — does NOT discriminate.** `noRange` is engine-force-set (design's own §5.2#12 + kit-parse
  prior 2) ⇒ no reachable wrong model applies range ⇒ the assertion is a **tautology**. Drop/reclassify. (R8.)
- **D4 (FB-major-by-landing) — discriminates for 256.17 only; observable.** In-FB/out-of-FB ratio ≈1.5 vs
  ≈1.0 under `noFb` is the strongest discriminator and is observable via the `damage` multiplier
  decomposition. **But** "both riders" is overstated: the 1687 rider has no out-of-FB baseline (fires only
  in-window/in-FB), so its FB-major is not independently testable. (R12.)

**Privaty net:** 2 of 4 assertions discriminate cleanly (D1, D4-for-256.17), D2 discriminates but likely
needs an S4 event extension + a non-vacuity guard, and **D3 is a tautology**. The fixture is sound. The
target is still a reasonable choice, but the "four sharp discriminating assertions" claim is really
"~2.5 sharp + 1 tautology."

---

## (e) Overall verdict — sound enough to enact as-is?

**No — structurally sound, but NOT enactable as-is.** The architecture (test-as-gate, blindness-by-
construction, faithful>fit invariants, bounded loop + webhook, evidence-tier tagging) is correct and the
source skills are represented honestly. But the **central value-claim is overclaimed** and **three concrete
defects void the live demonstration**. Must-fix before enactment, in priority order:

1. **R2 — De-contaminate the blind packet.** Strip privaty's name/trigger/gate/magnitudes from the §5 and
   kit-parse-hard-rules excerpts handed to S2b/S5/S6, and add an automated leak assertion. Without this the
   live run's "independent convergence" is meaningless.
2. **R3 — Fix the S2a RED gate for the already-faithful case.** Discrimination = GREEN-vs-shipped-faithful
   AND RED-vs-each-named-counterfactual (not "RED vs shipped").
3. **R4 — Independent RED/counterfactual-RED verification.** A separate step runs the tests against shipped
   (expect GREEN for FAITHFUL) and each counterfactual (expect RED) and records it; no self-reported RED.
4. **R1 + R6 — State the same-model limit and add model diversity.** Pin blind roles to a model ≠ the
   driver; make blind agents adversarial (generate the nearest-wrong reading). Downgrade the GO-claim from
   "real evidence of faithfulness" to "evidence against idiosyncratic error; systematic-prior errors require
   a different model or the owner."
5. **R5 + R7 — Operationalize the rubric.** Blind agents propose nearest-wrong models + load-bearing set;
   convergence = "S5 blind tests run unmodified against the shipped override go GREEN."
6. **R8 — Drop/reclassify D3** (noRange tautology).

Secondary (do before generalizing beyond privaty): R9 (declare magnitude out of scope), R10 (fire-rate
DBG check in rubric), R11 (⚑ committed before seeing the board), R12 (D2 S4 extension + non-vacuity; D4
"both riders"→"256.17 only"), R13 (board A/B stage; reframe judge "blindness").

**Confidence:** HIGH on the concrete defects (R2 contamination, R3 RED-vs-shipped contradiction with D4,
R8 D3 tautology, R5/R7 operationality) — each is derivable directly from the design's own text + cited
skills. MEDIUM-HIGH on R1 (same-model correlation is a judgment call, but the repo's own same-altitude
finding and systematic-error taxonomy support it).
