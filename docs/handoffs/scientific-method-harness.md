# Scientific-method harness — DECISION LOG

> **The PROCEDURE moved (2026-07-22) → the `/scientific-method` skill**
> (`.claude/skills/scientific-method/SKILL.md`), which is now the invokable procedure of record and
> drives three durable agents: `premise-verifier` (opus, step 0), `preop-judge` (fable, step 1),
> `postop-judge` (fable, blind, step 4) — all in `.claude/agents/`.
>
> **This file is now the append-only DECISION LOG only.** CHANGELOG-class: append every post-op
> outcome, never rewrite an entry, mark a superseded one `SUPERSEDED (date) — disregard` in place.
> Successor to `experiment-harness-ai.md` (CLOSED 2026-07-21 → `docs/handoffs/closed/`, whose
> experiment LOG stays there as history).

Log-entry shape: **date — claim: DECISION = IMPLEMENT / LOG / REJECT**, then both judges' verdicts +
confidences, why the decision landed where it did, owner action items, and the HARNESS LESSON.

## Decision log

- **2026-07-15 — AR auto-core rate is range-dependent (flat 0.85 over-credits AR): DECISION = LOG.**
  First live run of the panel. Claim: measured AR core (near 0.44 / mid 0.30 / midfar 0.03 / far 0.00,
  Scarlet solo video) is range-dependent & the flat 0.85 over-credits; Scarlet's solo break-even ≈ 0.33.
  Driver (Opus, primary): ACCEPT, confidence MEDIUM-HIGH. Fable (blind post-op): ACCEPT, confidence
  HIGH-on-the-claim / MEDIUM-on-band-values-&-class-application. **2-of-2 ACCEPT** on the qualitative
  claim. Combined confidence **MEDIUM** → **LOG (not Implement)**. WHY not Implement: Fable independently
  caught a quantitative tension the driver glossed — the measured bands TIME-WEIGHTED = 0.231 (verified),
  BELOW the 0.33 break-even, so full reconciliation needs near ≈ 0.70 (the stated lower bound permits it
  but it's unmeasured); Q4 the class model rests on ONE AR (Scarlet, known offsetting-error history);
  Q3 control-team pending. **Action items for owner review:** (1) re-read the AR near band at higher zoom
  / brighter-boss probe to pin near (~0.44 vs ~0.70); (2) check other-AR board deltas under a
  range-dependent model (does it help all ARs or just Scarlet?); (3) control-team validation when
  calibrated; (4) design the unified geometric distance-continuous model before landing.
  HARNESS NOTE: the blind panel worked as designed — the second judge caught a real quantitative
  reservation the driver missed, correctly capping confidence and routing IMPLEMENT→LOG.
- **2026-07-15 — AR/SMG/SG auto-core rate is range-dependent (flat 0.85 refuted): DECISION = LOG (judge SPLIT → owner).**
  Second live run. Four direct-count video measurements (Chisato SMG hardened per-band; Drake SG per-shot;
  LM in-FB-vs-out FB-independence test; Scarlet AR near re-read). Driver (Opus) + Fable (blind) BOTH ACCEPT
  the NARROWED claim: **flat 0.85 is decisively refuted; core is range-dependent (near-concentrated → ~0 far),
  must be per-band; SG ≪ SMG/AR; FB-independent (provisional).** Both STRIKE from acceptance: the AR>SMG
  ordering (AR near 0.34 sits inside SMG near CI) and the absolute per-band values as transportable constants
  (2× cross-boss variance; unresolved Scarlet ~10%-under residual). Combined confidence: **HIGH on structure,
  MEDIUM on values.** **THE SPLIT (on Implement-vs-Log):** Fable → IMPLEMENT the range-dependent per-shot model
  NOW with the 12 per-band values as calibrated ⚑ (CIs documented, boss-conditional), because retaining 0.85
  is knowingly shipping a REFUTED constant and the predicted board movers are the falsifiable test. Driver →
  LOG, because the absolute values are boss-conditional + the ~10% AR gap is unresolved → landing risks the
  board on unpinned numbers. Per the 2-of-2 rule a change does NOT auto-land on a split → **DECISION = LOG,
  escalated to owner.** OWNER ACTION ITEMS: (1) decide implement-now-⚑ vs hold-for-calibration; (2) control-team
  calibration on the ACTUAL raid boss (the value resolver — measurements spanned a neutral + a Water boss with
  different core geometry); (3) resolve the ~10% AR gap (overlap-undercount vs a non-core Scarlet error, via an
  ammo-anchored AR reconciliation); (4) design the geometric distance→core-size model to absorb boss/pose
  variance; (5) the R3 rendering conflict (one subagent: core+crit renders ORANGE "CORE HIT" not RED — vs the
  owner convention + 3 other subagents). Driver can build the model-behind-a-knob + board-impact analysis as
  decision support on request. HARNESS NOTE: a principled judge split on the LANDING (not the verdict) is the
  designed escalation path — logged both rationales, owner decides.
  **OWNER RULING (2026-07-15): IMPLEMENT (sided with Fable).** Answers: (2) the union shooting-range raid
  boss is IDENTICAL across element types → the 2x "cross-boss" variance is POSE/sample on the SAME boss →
  per-band values TRANSPORT (resolves the driver's LOG concern); (3) re-record AR with a cleaner unit
  (Moran-T / Snow White) to settle the ~10% Scarlet residual; (4) geometric model agreed but the
  extreme-near (0-25) SG band needs ONLINE research; (5) the ORANGE core+crit report was a subagent
  MISREAD — it renders RED "CORE HIT" (owner convention holds). Task → IMPLEMENT; full plan in
  docs/handoffs/closed/2026-07-15-autonomous-invariant-audit.md (POST-COMPACT TASK; CLOSED).
- Related exploratory result (not a change): the SMG/SG "non-reconciliation" is UNIT-SPECIFIC non-core
  modeling — Chisato SMG over from her 472% gauge-gated proc modeled always-on (56% of solo); Drake SG
  under from his pellet/shot damage (~26% short, non-core). NOT weapon-class core evidence; handle per-unit.
- **2026-07-16 — SG landing table too high at range (isabel hypothesis, class-wide): DECISION = REJECT-the-claim / LOG the narrow finding.**
  Third full pipeline run (pre-op APPROVED-WITH-REVISIONS ×6, all executed; two work agents; driver +
  blind Fable post-op). Claim as worded (class-wide `SG_LANDING_BY_BAND` too high at mid/midfar/far)
  **not established — the pre-registered SPLIT branch fired**: brid-silent-track hit the isabel-hypothesis
  far prediction to 0.1% (0.709 vs 0.710; two clean anchors agree far ~0.66 FOR THEM), but guilty read as
  the CURRENT table shape × a flat ~0.91 unit factor, and near landing proved per-unit/per-position
  (0.81–0.94) — breaking the "near 0.9 is a universal control" premise. Driver: REJECT-claim/LOG. Blind
  Fable: REJECT-claim/LOG, confidence MEDIUM (Q1 MEDIUM on the claim / HIGH on the narrow far finding;
  Q2 HIGH — zero free knobs; Q3 LOW caps at LOG; Q4 LOW-MEDIUM — a lowered global table plausibly worsens
  guilty-like units). 2-of-2 concordant → **no engine change; far ~0.66 staged ⚑ pending a third anchor;
  per-unit facts to baselines; U17/U18 opened** (per-unit landing; the +1.6% ATK-term elevation, which
  also retro-explains isabel's "+2.3% rider coef" as term-side). HARNESS NOTES: (1) the NEAR-control gate
  as a fixed M value encodes a false premise (near landing constant) — future SG reads should control the
  basis via quantization-step/popup pinning (which worked flawlessly on both reads) and treat near M as a
  measurement; (2) both new reads found game-clock-vs-video drift (uniform 2.07% on one, non-constant on
  the other) — single-anchor clocks are no longer acceptable for band windows; (3) the falsification
  clause "near >4% off on BOTH units → STOP" fired but its premise (basis/bracket impeachment) was
  affirmatively disproven by the lattice/popup/rider pinning — the drafted clause conflated "control off"
  with "basis broken"; both judges converged on proceeding to the split branch, same terminus.
- **2026-07-16 — sim ATK term ~+1.63% low globally: damage reads match OL0 not base5 → re-opens the 2026-07-14 gear switch: DECISION = LOG (owner-gated).**
  Desk diagnosis from EXISTING reads (no new video), Fable-checked (SOUND-WITH-CAVEATS/HIGH). Five
  in-fight term reads across SG/AR/RL and all 3 classes (jill 119,800 double-derived; guilty 119,827;
  brid-silent-track 99,826 rider-confirmed; maiden 79,853 double-confirmed; isabel ~+2.3%) agree to
  ~0.03% at +1.63% above the sim's base5 static — MATCHING the OL0 numbers (120,143 / 100,130 / 80,118)
  to ~0.17%. NOT core: a "core 8" fit (base5+core8 = 119,943, matches 0.002%) was entertained and
  DISCARDED — core maxes at 7 (owner-corrected the base-stats-handoff.md:69 "core >7" error), and
  core-7 ×1.14 is itself validated by the 2026-07-13 video-verified 120,143 = core7 + OL0. So it is a
  GEAR-TIER question. This re-opens DECISIONS 2026-07-14 (the base5 switch), which itself flagged that
  the 2026-07-13 OL0 video verifications "need re-checking" — the five new DAMAGE reads ARE the
  re-check and they side with OL0. LOG not IMPLEMENT: reverses the owner's own 2026-07-14 ruling +
  reprices the whole board + forces the noir/dorothy-calibrated SG landing down ~1.6% (U17 coupling) —
  and only the owner knows their recorded units' actual gear. OWNER ARBITRATION: are the recorded units
  base5 or OL0-equivalent? (damage + old video say OL0 → revert base5→OL0 + landing −1.6% + re-run;
  genuinely base5 → hunt an omitted stat source). LESSONS: (1) a "dismissed as noise" residual
  (maiden's 1.0146, logged 2026-07-14) was this same systematic — sub-±3% UNIFORM offsets across
  multiple units deserve a second look, not a noise-floor pass. (2) I OVER-COMMITTED to "core 8" from a
  single doc line before checking it against game mechanics / the validated core formula — the owner
  caught it. Verify a load-bearing premise against an INDEPENDENT source before building on it
  (prove-it-differently), especially a lone doc parenthetical.
- **2026-07-16 — per-unit SG landing consolidation: DECISION = HOLD (no per-unit overrides this pass).**
  All measured SG units' landing expressed as term-independent ratios-to-table; spread ~12% at near/far
  with no datamined correlate. Encoding per-unit landing improves ZERO units and regresses isabel+guilty
  (they read sim-low for OTHER reasons — rider/self-buffs/term — and all landing factors are ≤1). Fix
  order: promote SG baselines to engine-loaded overrides → resolve U18 term → then revisit. Durable
  staged candidate: per-unit sgFarScale≈0.88 for isabel+brid only. open-questions U17.
- **2026-07-22 — UNIGEO accuracy-circle geometry rework (uniform-in-circle, two-part): DECISION = LOG (all components).**
  Full run of the skill: step-0 premise gate (2 verifiers — the AR/SMG cell set SCOPE-CORRECTED to the
  closed-handoff tables with one omitted clean moran cell added, and the mid/midfar/far core sizes
  REFUTED as settled → folded in as M1), Fable pre-op APPROVED-WITH-REVISIONS → 6 revisions executed →
  APPROVED (final), work on an isolated worktree (branch worktree-agent-ae475c5f53840ac9b), driver
  ACCEPT/HIGH, blind Fable ACCEPT/MEDIUM — 2-of-2 concordant, LOG (below-HIGH + fired triggers +
  Q3 gate, overdetermined). **The accepted (narrowed) claim:** SG landing/core on the scope-lock boss
  is well described by pellets UNIFORM-per-area in an aim circle R(hr)=81·(1−hr/100) px (datamined
  scale × measured calibration), landing = 0.96·coverage, core = area-ratio — engine reproduction of
  the owner's 18 hand-counted cells at deviance 25.45 (Δ0.05 vs the analysis fit, untuned), the four
  measured HR-landing deltas the structurally HR-blind live table cannot produce, the one true
  out-of-sample cell (midfar replication) at z −0.26, and ALL 8 graded SG readings moving in the
  pre-registered direction and band. The incumbent Gaussian cone is refuted as the SG distribution
  (marker positions, KS 0.376). Also LOG-tier: uniform-lens beats the frozen cone on the 6 clean AR
  cells (deviance 2.13 vs 16.33; δ0_AR 15.9 px, f_bloom_AR 0.578 — the D2 ceiling test VOIDed by its
  own pre-declared f_bloom condition); SMG pair is a saturated ⚑ calibration that FAILS out-of-sample
  on little-mermaid long bands (>3σ) — an active red flag, not a formality. Core series C (1/d) ships
  ⚑ FIT-SELECTED with the rev-6 contradiction UNRESOLVED (range-data.md pro-B vs the counted far/
  midfar cells anti-B at z≈−2) and absolute deviance swinging 18–56 under band-distance placement.
  **Why LOG, not IMPLEMENT:** the pre-committed triggers fired exactly as the fit-exposure story
  predicts — every SG override is calibrated against the live landing that sits 12–24% ABOVE the
  owner's measured landing, so the faithful landing mechanically worsens ≤1.0 readings (4 past the
  0.03 revert threshold), moves 27 non-SG units via the SG-landing→burst-gauge coupling, and breaks
  one measured-exact FB count (N5 11→10) — **a measured-truth contradiction that localizes to the
  landing×gauge composite (sim.ts:2658 scales gauge per landed pellet; gauge values were calibrated
  against the inflated landing), flagged by the blind judge as the headline reservation.** The
  validation instrument itself is uncalibrated for this change (Q3): the board cannot confirm a
  landing fix while every SG override embeds the old landing. **Owner action items (the promotion
  ladder):** (1) core re-trace mid/midfar/far (drawn-circle method) → converts the core sub-model to
  measured; (2) gauge-decoupling isolation run (UNIGEO landing for damage, legacy landing feed for
  gauge — if N5 restores to 11 the FB break localizes to the coupling); (3) SG override re-tune
  against the UNIGEO landing then a FRESH pre-registered A/B (removes the fit-exposure confound);
  (4) a third clean SMG cell; (5) bloom-phase footage for f_bloom. HARNESS LESSONS: (1) the rev-4
  unpredicted-mover trigger worked — the movers it caught (crown ×2, anis-star ×1) were the declared
  gauge coupling's knock-ons that the prediction table had described but not enumerated as rows;
  enumerate coupling knock-ons as table rows next time. (2) A prediction-table row computed without a
  unit's modeled hitRatePct state (nayuta, ~8× miss) is a process error even when the direction is
  right — fold the unit's live buff state into per-unit predictions. (3) The pre-registered magnitude
  bands were ~0.2 wide; direction 8/8 plus the structural D1 discrimination carried the evidence, not
  band membership — tighten bands next pass.
- **2026-07-22 (later) — UNIGEO: OWNER ENACTMENT of the LOG — SHIPPED default `'all'`.**
  The LOG's headline blocker (the N5 comp's FB "break" 11→10 as a measured-truth contradiction)
  DISSOLVED on owner recount: the real count is **12** — the pinned 11 matched the old sim, never the
  footage (`docs/probes/714 noon/probe.md:17` recorded "measured 12 / sim 11 ✗" at grading time, and
  `scripts/regression.ts` had deliberately left N5 unpinned). Both engine variants under-generate →
  re-filed as **open-questions U29**; the W6 gauge-decoupling isolation (worktree addendum) had
  already localized the 11→10 delta to the landing→gauge coupling and shown 6/8 SG readings ≥96%
  pure geometry. With that resolved the owner directed full enactment (SG override re-tune deferred
  to a follow-up pass; web default-all shipped knowingly). Step-7 implementation review ran BEFORE
  merge: verdict FIX-BEFORE-MERGE — engine code clean/faithful, ⚑ labels present, measured constants
  untouched, buckets correct; the FIX (default flip must co-commit the regenerated snapshot,
  documented as fit-exposure, only per-unit totals moving and zero measured-truth asserts) was
  applied as specified; web build + smoke green at default-all. Merged `af...`→ main (merge commit
  after cf25ca0), verify green. DECISIONS 2026-07-22 (UNIGEO SHIPPED) is the settled record;
  STATE.md §4 rewritten. HARNESS LESSON: a "measured-exact" constraint used to score a gate must
  itself be provenance-checked — the N5 pin entered the trigger discussion as measured truth when
  the probe log had always recorded it as a sim-mismatch; the owner's recount, not the harness,
  caught it. Provenance-check every constraint the decision rule cites, at packet-writing time.
- **2026-07-23 — 5e NAMED TARGET-STATUS REGISTRY: IMPLEMENT (2-of-2 ACCEPT, HIGH+HIGH).** Capability
  build, zero enactments: `targetStatus` effect + `requiresTargetStatus` block gate, the name-keyed
  generalization of `wipeOut`/`requiresWipeOut`. Landed on isolated worktree `statusgate`; regression
  byte-identical WITHOUT `--update`, `doc-drift` census independently derives 0 users, `verify.sh full`
  green. DECISIONS 2026-07-23; STATE.md §5 two new rows.
  **STEP 0 EARNED ITS KEEP — one premise CONFIRMED with a scope correction, one REFUTED, and the
  REFUTE is what shaped the deliverable.** Premise A (no general named-status vocabulary exists) came
  back CONFIRM but narrower than believed: two apply-then-gate channels DO exist (`wipeOut`,
  `shield`), each a single hardcoded-name boolean, so the honest claim is "no _general_ way", not "no
  way" — a hack onto `wipeOut` was available at the cost of colliding with `d-killer-wife`. Premise B
  (the four 5e units share one shape) came back **REFUTE**: read from kit text, the registry is
  NECESSARY for all four but SUFFICIENT only for `privaty`; `mint` needs a memoryful timerless XOR
  toggle, `prika`'s status is team-carried with in-flight duration mutation and cross-unit entry, and
  `milk-blooming-bunny` needs a reload-count-scoped stat clamp plus a status that suppresses another
  status. Had the plan proceeded on the doc's framing ("build it once and all four are expressible")
  it would have shipped a speculative-general mechanism justified by three units it cannot serve.
  **PRE-OP CAUGHT A NON-DISCRIMINATING PREDICTION.** The plan's name-keying test was "gate on a name
  that is never applied → baseline", which the single-boolean rival ALSO passes (the boolean stays
  false all run). Revised to: apply status A and gate on B _in the same run with a status genuinely
  live_. That revision is the only reason the test can distinguish the two designs at all.
  **HARNESS LESSONS.** (1) A "same shape of problem" grouping in a plan doc is a LOAD-BEARING premise
  and should be premise-gated like an anchor identity — it silently sets scope, and this one was
  wrong in the direction of building more, which no board diff would ever have caught (an inert
  primitive's snapshot is byte-identical whether or not it was worth building). (2) A vacuity failure
  is a FIXTURE bug, not an assertion bug: P5 first "passed-by-tying" (`17346355.875` == itself)
  because the status was re-applied on the same frame the magazine emptied; the pre-committed rule to
  adjust the fixture rather than the assertion was what kept it honest. (3) Decompose a surviving
  nonzero rather than tolerating it — P5's short arm was 19% of the long arm, which looked like noise
  and was in fact exact: `lcm(60,100)/60 = 5` ⇒ every 5th last bullet coincides with an application,
  5/27 = 0.1852 observed. An unexplained residual that turns out to be integer-exact is the
  difference between a test you trust and a test that happens to pass.
- **2026-07-23 (later) — `wipeOut` DELETED, `d-killer-wife` migrated to the named registry: OWNER
  ENACTMENT, no pipeline.** Direct owner ruling (_"just delete the old wipeout and set the new one live,
  faithful > fit… leaving an incorrect implementation just because it passes a regression test is always
  wrong"_), so no premise gate / pre-op / post-op was run — recorded here because the harness log is the
  provenance trail for engine changes regardless of which path authorized them. Isolated worktree,
  `verify.sh full` green, regression byte-identical WITHOUT `--update` (the migration is
  semantics-preserving), primitive count 92 → 90. DECISIONS 2026-07-23 (second entry).
  **HARNESS LESSON — the 2026-07-23 entry above got the disposition wrong, and the owner corrected it.**
  That run deliberately left `wipeOut` in place because unifying "would move `d-killer-wife`, the one
  graded carrier, and so cannot ride an inert landing." Two errors in that reasoning: (1) it was never
  checked whether the migration actually moves her — it does not, the semantics are identical, so the
  entire stated cost was hypothetical; and (2) _board-movement risk_ was allowed to outrank _known
  incorrectness_. The old pair could hold one status name roster-wide; leaving it live meant the next
  enemy-status carrier would silently collide. **Generalize: "it passes the regression" is not a reason
  to keep a model you have just demonstrated is wrong — and before deferring a fix on predicted board
  movement, MEASURE the movement.** A deferral justified by an unmeasured cost is a guess wearing a
  process. Cost of checking here: one regression run.
- **2026-07-23 (later) — SMG cadence flipped 24→20.0/s (frame quantization), DEFAULT-ON: IMPLEMENT.**
  Full harness: 5-premise gate (all CONFIRM — SMG=20.0/s ammo-counter measurement; census SMG is the
  sole non-frame-integral class; measured-FB assertions don't discriminate the two arms; idoll-ocean
  ammo-clean; the modernia MG spend is a fixture artifact). Fable pre-op **APPROVED-WITH-REVISIONS**
  (5 revisions, all taken: positive belt-clip decomposition assertion; REAL per-mechanic engine
  mutations not mental; ±0.02 tolerance + INCONCLUSIVE branch; board = regression check not
  confirmatory; fold in the comment fixes). Driver **ACCEPT/HIGH**, blind Fable post-op
  **ACCEPT/HIGH** → 2-of-2 → IMPLEMENT. Implementation review **FIX-BEFORE-MERGE** (engine + tests
  clean/scope-correct/zero-leakage; blockers were doc-authority only — DECISIONS entry + STATE/
  game-mechanics current-state — all landed). DECISIONS 2026-07-23 (supersedes 2026-07-17 D.2).
  **HARNESS LESSONS:** (1) the pre-op judge's "make the mutation checks REAL, one per mechanism" caught
  the difference between a discrimination that _passes_ and one _proven to fail on a broken mechanic_ —
  a green test is not evidence it discriminates until you break the thing it guards. (2) The
  runtime-env trap: `PULLS_PER_SEC` is a module-const evaluated at import, so a probe that sets
  `process.env.SMGQUANT` in a loop reads ONE arm for every "arm" — always vary an engine-const flag by
  spawning a fresh PROCESS per arm, never in-process. (3) The blind post-op independently recomputed a
  coherence check the driver hadn't (CW5 bare-weapon scaling 0.87247 = idoll-ocean board move 0.8722,
  and correctly ABOVE 20/24=0.833 because reload time is cadence-independent) — the strongest
  single piece of not-a-fit evidence came from the judge, not the implementer.
- **2026-07-29 — focus charge-gauge bonus is PER-UNIT (`fullChargeBonus/100`), not flat 2.5x: SPLIT
  DECISION — scarlet-black-shadow IMPLEMENT, alice LOG, cinderella out of scope.** Background:
  `docs/handoffs/2026-07-27-focus-charge-gauge-per-unit.md`. Premise gate: the crux premise (does the
  solo-footage `scan.ts` `solo` HUD crop, 142x12 @ 2470,488, faithfully read continuous burst-gauge
  fill %?) was REFUTED by a fresh-context `premise-verifier` citing the tool's own docstring ("the
  burst gauge charging is not in this crop... absent entirely between cycles"). Owner correction: the
  widget IS persistent and continuously rendered in solo footage regardless of state (charging/full/
  draining/chain) — the docstring's characterization was made from team footage and doesn't hold for
  solo. Re-validated the crop against the ORIGINAL maiden-ice-rose tb2-test-3 anchor (the historic
  hand-pixel-read recording that established the existing x2.5 rule, `docs/data/burst-gauge.md` §6):
  the fresh CV read reproduced maiden's documented "+9.1% then +3.45%" two-substep per-pull pattern
  TWICE in the recording, each within 0.05-0.15% of the 2026-07-13 hand-derived value — a genuine
  quantitative validation, not a plausibility argument. Fable pre-op **APPROVED-WITH-REVISIONS** (7
  revisions: reject the driver's proposed cinderella 1.0x exemption — her own rough footage read
  ~2.6-3.1x contradicts it, closer to the CURRENT flat 2.5x than either 1.0x or her table's 2.0x, so
  she is PINNED to current behavior instead, measurement-gated, not exempted; guard the `?? 250`
  fallback for undatamined SR/RL rows so a missing row can never zero a focused unit's gauge; pre-
  register graded-comp coverage; disclose the inverted procedure (measurements preceded the written
  plan); fix the stale `scan-frames.py` docstring — deferred, filed as a follow-up; record the ±5%
  residuals as open; isolated worktree). Driver review: confirmed the control-regression suite's
  crown/scarlet-black-shadow/helm total-damage drift (1.49%/0.61%/7.97%) is a real, explained
  second-order rotation ripple (SBS's own FB distribution went from a rigid 12/25 seeds to 11-12/25 —
  neither crown nor helm are charge weapons and can't be touched directly), not a fit signal; `verify.sh`
  green, `control-regression.ts --update`. Blind Fable post-op round 1: **ACCEPT, composite MEDIUM**
  (SBS+alice both single-recording; Q3 pending — named the cheapest resolver: video-count the FB in
  the ALREADY-HELD `docs/probes/720-kit-audit/scarlet black shadow.MP4` control-comp source
  recording, an existing artifact, not a new one). Reuse-before-derive: ran `scan.ts` on that exact
  recording — **11 full bursts, 11/11 corroborated** — outside the pre-fix model's rigid 25/25-seeds-
  at-12 distribution and inside the post-fix model's 11-12 distribution; sent back to the SAME blind
  judge (not self-upgraded). Round 2: **ACCEPT, SBS component upgraded to HIGH** (two independent
  measured-tier confirmations — solo per-shot rate AND team FB count, both agreeing with her datamined
  150), **alice component held at MEDIUM** (nothing in the SBS datum touches her; her own coverage gap
  and +5.1% solo residual stand). Owner then supplied a genuine alice-FOCUSED team recording (`docs/
  probes/burst tests/alice focused.MP4`, crown/liter/alice/red-hood, boss Water, alice at mid-slot —
  the earlier "PA MiKa" comp was a red herring, its mid-slot occupant is prika, not alice, corrected
  mid-session after initially misjudging prika as non-charge when she is SR). Measured: **10 full
  bursts, 10/10 corroborated**; sim comparison (25 MC seeds, toggled via `git stash` on the worktree)
  showed pre-fix rigid 25/25-at-10, post-fix 7/25-at-10 / 18/25-at-11 — the real count landed INSIDE
  both distributions, as the post-fix model's MINORITY (28%) outcome rather than confirming it. Round
  3 (same blind judge, this new datum): **ACCEPT held, alice confidence unchanged at MEDIUM** — ruled
  the team FB count a non-isolating, downstream observable (FB count is convolved with red-hood's
  flex-burst behavior, chain selection, and 3 other units' rates) that cannot outvote alice's direct,
  isolating solo measurement in EITHER direction (a likelihood-ratio ~3.6:1 on one categorical draw
  does not overturn an instrument-validated direct read) — explicitly invoking "measured truths are
  constraints, not scores" and "a model-vs-reality gap localizes to the model as a whole, not one
  knob." **2-of-2, by unit: scarlet-black-shadow HIGH+HIGH → IMPLEMENT. alice MEDIUM (both judges) →
  LOG — pinned to the flat constant (same mechanism as cinderella's carve-out, `PENDING_TEAM_ISOLATION`
  set in `gaugePerShot`), NOT enacted, owner action item filed in `docs/handoffs/QUEUE.md`.**
  cinderella: no change from pre-existing behavior (flat 2.5x), pinned via `magDumpRof`, own dedicated
  investigation filed in QUEUE.md (her rough read ~2.6-3.1x contradicts both her table's 2.0x and a
  1.0x exemption). `verify.sh` green, `control-regression-snapshot.json` updated to reflect the SBS
  change (the only behavioral delta in that suite). **HARNESS LESSONS:** (1) a premise-verifier's
  REFUTE grounded entirely in a tool's own documentation can still be wrong if the documentation was
  characterized under different conditions (team footage) than the case at hand (solo footage) — the
  owner's direct domain correction plus a fresh quantitative re-validation against an existing anchor
  resolved it, rather than either blindly trusting the refute or blindly overriding it on say-so alone.
  (2) Reuse-before-derive paid for itself twice in one post-op loop: both FB-count resolution steps
  used footage the repo ALREADY held (a control-comp source recording, and — once obtained — an
  owner-supplied focused recording) run through an already-validated instrument, never a fresh
  bespoke derivation. (3) A downstream/composite observable (team FB count) is real evidence but is
  not fungible with a direct/isolating one (solo per-shot rate) — it can corroborate decisively when
  it falls OUTSIDE the null distribution entirely (SBS), but a same-both-distributions result is weak
  and must not move a directly-measured constant in either direction on its own (alice). (4) A
  same-family unit misidentification mid-session (prika judged non-charge when she is SR) was caught
  by the owner, not self-detected — a reminder that "isCharge" gating and weapon-class claims warrant
  the same slug-discipline as unit-identity claims, not just character names. DECISIONS 2026-07-29.
- **2026-07-29 — Alice & Cinderella un-pinned to their datamined `fullChargeBonus` values (3.5× /
  2.0×): IMPLEMENT (owner ruling).** `focusChargeMult = chargeMultiplier/100` is accepted as TRUE
  for both units, same footing as scarlet-black-shadow above. A same-day recount run had produced a
  REJECT verdict on Cinderella (an alleged 8-shot gaugeless opener yielding an effective ≈2.2×) — that
  finding was a repeated instrument/reading error, not a real mechanic, and is RETRACTED; do not
  re-derive or re-cite it. Full record: `docs/DECISIONS.md` 2026-07-29 "confirmed true" entry.
