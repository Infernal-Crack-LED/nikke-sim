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
  landing×gauge composite (sim.ts `firePull()`, the SG per-pellet `gauge` fraction scales gauge per landed pellet; gauge values were calibrated
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
- **2026-07-29 — UNIGEO SG landing under-prediction on scope-lock spider-mech (U35 follow-up): DECISION = REJECT.**
  Claim: the live UNIGEO SG landing model (`unigeoSgLanding` at HR=0) under-predicts real per-band landed
  pellets on the scope-lock spider-mech boss, using direct per-shot counts from the CV pellet counter.
  Plan: `docs/handoffs/2026-07-29-sg-landing-recalibration-plan.md` (UNIGEO-targeted, pre-op judge
  APPROVED-WITH-REVISIONS, revisions executed in analysis). Work: counter run on four HR=0 solo SG
  recordings (`marciana-solo`, `noir sg`, `guilty solo sg`, `isabel solo sg`) with locked parameters
  `--fps 30 --zoom 2 --marker-min 2 --core-rate 0.05`.
  **Driver review (primary judge): REJECT, confidence HIGH.** The CV counter failed second-unit validation
  against the running-counter/lattice anchor. On `noir sg.MP4` (cleanest SG anchor), the counter read
  near1 ≈7.04/10 vs running-counter anchor 8.9/10, far ≈6.98/10 vs anchor 7.4/10, midfar ≈7.36/10 vs
  anchor 8.8/10. Shape ratios were also wrong: counter far/near ≈0.99 and midfar/near ≈1.05 vs anchor
  ratios 0.831 and 0.989. The counter therefore has a **systematic cold bias plus a band-dependent flattening**
  that makes it unreliable for landing measurement. `guilty solo sg` and `isabel solo sg` produced only
  3 and 4 detected shots respectively (vs ~200 expected), indicating the marciana-derived ammo-box
  template does not generalize to those HUDs. `marciana-solo` reproduced the run18 mean (~7.3/10),
  confirming the counter is stable on its tuning video but not transferable as-is.
  **Fable post-op:** not consulted — driver rejected before the post-op panel (a driver reject is
  permitted when the instrument is demonstrably biased; no code change is proposed).
  **2-of-2:** N/A (driver REJECT).
  **WHY REJECT:** The counter is the instrument under test, not UNIGEO. Before it can score U35, it must
  agree with an independent running-counter/lattice method on at least one second unit. It does not.
  The observed discrepancy on noir (~1.5–1.9 pellets/shot, shape ratios off by >0.10) exceeds the plan's
  ±1 pellet/shot validation gate. Continuing to a UNIGEO recalibration would be fitting the model to a
  biased instrument.
  **Owner action items:** (1) Fix the pellet counter's crosshair/template matching so it generalizes
  across SG units/HUDs (per-video ammo-box template extraction or a more robust crosshair tracker);
  (2) Investigate and remove the band-dependent flattening (near-band under-count relative to far/midfar)
  before using it for per-band landing; (3) Re-attempt U35 validation once the counter passes noir + one
  other clean anchor within ±1 pellet/shot and shape ratios within ±0.10.
  **HARNESS LESSON:** A counter that is "now-working" on its tuning video is not validated for the class.
  The second-unit validation gate is load-bearing — it caught both a template-mismatch failure (guilty/
  isabel) and a subtler band-dependent bias (noir) that would have polluted a landing recalibration.
- **2026-07-29 (counter-fix follow-up) — SG pellet counter instrument fix: DECISION = still REJECT / LOG.**
  Implemented the owner action items from the earlier 2026-07-29 REJECT entry:
  `scripts/probe/extract-ammo-template.py` extracts a per-video ammo-box template from each input
  video; `count-pellets.py` restricts template matching to a bottom-right ROI and exposes
  `--ammo-roi-x0`/`--ammo-roi-y0`; `read-pellets.ts` wires both and adds `--center-exclude` /
  `--pellet-radius` tunables. Short-clip verification on `guilty`/`isabel` restored shot detection
  (vs the 3–4 total shots with the global marciana template). Full-video validation against the
  running-counter anchor still failed.
  - `noir sg.MP4` (`--fps 30 --zoom 2 --marker-min 2 --core-rate 0.05`; both `--center-exclude 24`
    and `36` gave identical results): 107 shots detected, 56 valid, avgTotal=7.1. Band means:
    near1 n_valid=0/11 (all totals <5), near2 7.65/10 vs anchor 8.9 (-1.25), far 7.33/10 vs 7.4
    (-0.07), midfar 6.91/10 vs 8.8 (-1.89). Shape ratios are unusable because near1 produced no
    valid shots; the surviving near value is still >1 pellet/shot low.
  - `guilty solo sg.MP4` full run: only 21 shots detected (12 valid), near1 n_valid=0/3, midfar
    6.89/10 (no anchor). Not yet a usable second anchor.
    **Why still REJECT:** the counter-side fixes removed the global-template false locks but did not
    remove the systematic cold bias or the near-band under-count that drove the original REJECT. No
    UNIGEO recalibration is justified.
    **Next tuning step:** (1) diagnose near-band pellet loss, most likely `--center-exclude` too large
    relative to the near pellet cluster or crosshair crop drift, using `--dump-tracks` diagnostics;
    (2) confirm the per-video template locks onto the true ammo box for `noir`/`guilty`; (3) re-run
    full `noir` + `guilty` and require ±1 pellet/shot and shape ratios within ±0.10 before any U35
    validation. **No engine change proposed or enacted.**
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
- **2026-07-29 — Dot-tick burst-gauge over-count from concurrent stacking DoT instances (found while
  auditing the burst-gen ranking chart): DECISION = LOG (not Implement).** Claim: `skillGauge()` fires
  unconditionally on every live dot instance's tick (`src/engine/sim.ts's DoT tick loop`), so a unit whose DoT is
  modeled as a stacking/self-refreshing effect (a new independent instance per re-trigger, e.g. raven's
  S1 on `shotFired`) generates N× the intended burst gauge when N instances are concurrently live —
  purely an artifact of how many parallel dot objects encode the damage, not a real per-unit trigger
  count. The rule's sole citation (Haran/`harran` "290/tick", `docs/data/burst-gauge.md:181`) was
  premise-checked and found **CANNOT-VERIFY on the instance-count dimension** — it records only a
  per-tick rate, silent on concurrency, so the incumbent N-linear default has NO evidentiary backing
  in either direction (also: the unit's real slug is `harran`, not `haran`, and she has no override —
  unmodeled, not itself at risk).
  Two independent fixes were designed and driven through the full gate (premise gate → 2 rounds of
  Fable pre-op revision, after the first mechanism design — a 1-second wall-clock bucket — was caught
  by Fable implementing H0c, silently 4×-throttling `anis-star`'s single-instance 0.25s-tick dot):
  **Fix A** (instance election: among concurrently-live dots sharing an `(ownerIdx, srcSlot)` key, only
  the earliest-created still-live one calls `skillGauge()` on its tick; `dealDamage` unchanged for every
  instance) and **Fix B** (add the `stage !== 0` chain-lock guard to `fillGauge`, `sim.ts` ~2349, to
  match `addGauge`'s existing guard — a separate bug where little-mermaid's `teamAmmo:400` instant-fill
  effect could leak gauge mid-chain).
  **Fix A: 2-of-2 ACCEPT, both MEDIUM confidence → LOG.** Driver (Opus): ACCEPT MEDIUM. Fable (blind
  post-op): ACCEPT MEDIUM. Both judges capped at MEDIUM for the SAME structural reason (Q1 split): the
  _internal-consistency_ claim (leaves every measured pin untouched) is strongly provable — `jill`
  (single-instance, load-bearing in graded "misc B3s run I" pin 13) and `anis-star` (single-instance,
  0.25s tick — the sharpest H0c detector) came back byte-identical to the last digit; all 7 graded
  FB-count pins held; `ada` (2-concurrent-instance case in graded "elec DPS run E") came back
  byte-identical with a measured mechanistic reason (her duplicate ticks were already guard-locked); a
  raven discrepancy (measured 1.86× drop vs a pre-derived exact prediction of 2.07× and the [2.5,3.0]×
  fallback band) was NOT waved through — it was resolved by an index-for-index pre/post instrumentation
  decomposition proving 0/483 election mismatches and localizing 100% of the gap to a real feedback
  effect (Fix A lowers raven's own gauge rate, dropping her solo FB count 11→10, which shifts her own
  chain-lock windows — a confound the frozen pre-fix-timeline prediction couldn't encode). But the
  _true-mechanic_ claim (is concurrency-gated gauge actually how real NIKKE works, vs the incumbent
  N-linear) remains CANNOT-VERIFY — zero footage evidence exists either direction — so Q1 is
  irreducibly split and confidence cannot exceed MEDIUM for this class of change no matter how clean
  the implementation is. Per the 2-of-2 rule, MEDIUM+MEDIUM = **LOG, not IMPLEMENT**: approved-by-judges
  as a non-destructive internal-consistency fix, but not landed — the engine was NOT touched on the
  shared tree. Fix A sits committed (`e76093f`) on the isolated worktree
  `worktree-agent-aab3a19427393feb2` (branch `worktree-agent-aab3a19427393feb2`), preserved pending an
  owner decision, not merged back.
  **Fix B: driver-decided NOT to implement this pass (independent of Fix A's LOG), before reaching the
  post-op panel.** Fix B passed its own 3 named checks (N6 FB pin holds, no `regression.ts` hard-fail,
  little-mermaid's N6 total exactly unchanged) but was discovered — via an EXISTING kit-faithfulness
  test outside any graded comp (`scripts/tests/units/little-mermaid.test.ts`, fixture
  little-mermaid/crown/ada/`helm` [SR/Water base, not `helm-aquamarine`], boss Iron) — to make her
  `fillGauge` ability completely inert in that
  fixture (the M4 "BEHAVIOURAL: the gauge fill is live" assertion flips from pass to fail; her total
  with-vs-without `fillGauge` becomes bit-identical under Fix B). This surfaces a genuinely new,
  previously-unexamined premise the original plan didn't anticipate: whether a "Fills Burst Gauge X%"
  effect is, in real NIKKE, subject to the SAME continuous-generation chain-lock as `addGauge`, or is a
  mechanically distinct discrete grant that bypasses it — with zero footage evidence either way. Left
  uncommitted in the same worktree; not sent to Fable pre-op/post-op (a driver call, not a judged
  REJECT) because the discovery changes the scope of what's being claimed, and a revised plan
  addressing that premise should go through its own gate rather than being folded into this one.
  **OWNER ACTION ITEMS** (filed `docs/handoffs/QUEUE.md`): (1) decide whether to merge Fix A
  (`e76093f`) as-is — it is judge-approved-but-LOG, a defensible internal-consistency default with zero
  measured-board risk, but not evidence that it's the TRUE mechanic; (2) file the companion
  `docs/open-questions.md` UNANSWERED entry this plan requires: "does in-game burst gauge scale with
  concurrent dot-stack count? (settleable by focused footage of raven/ada/any stacking-dot unit,
  comparing measured gauge-bar fill rate at concurrency ≥2 vs 1)"; (3) decide Fix B's disposition —
  get real footage or an owner ruling on whether instant `fillGauge` effects respect the chain-lock,
  before it goes through its own pre-op pass; (4) two previously-unidentified stacking-dot units
  (`bready`, `diesel-winter-sweets`, neither graded) should get the same byte-identical/board spot-check
  if/when Fix A lands.
  **HARNESS LESSONS:** (1) a mechanism design can fail pre-op silently if the negative controls aren't
  chosen to stress the SPECIFIC implementation detail at risk — the first design (a wall-clock bucket)
  looked plausible and only broke on a control (anis-star's 0.25s tick) picked BECAUSE Fable spotted the
  exact failure mode from reading the override files directly, not from the plan's prose. (2) A
  pre-derived "exact prediction" computed from a frozen pre-fix timeline is invalid for any fix that
  feeds back into the predicted unit's OWN rotation (gauge changes almost always do) — the miss here
  was real and had to be affirmatively decomposed, not assumed away by "it's within the fallback band";
  future plans should predict against a post-fix-timeline simulation or pre-declare the feedback
  explicitly. (3) Working through a full driver-review round-trip (rejecting the first work-subagent
  submission for committing past a failing check with a plausible-sounding post-hoc story) caught
  exactly the failure the harness's "measured truths are constraints, not scores" rule exists to
  prevent — a good story is not the same as a demonstrated resolution. (4) An unrelated existing test
  can reveal that a "bug fix" is bigger than scoped (Fix B) — kit-faithfulness tests and the regression
  snapshot are both real independent checks, and a change that's clean against one gate can still fail
  a different one for a legitimate reason.
- **2026-07-30 — FOLLOW-UP to the 2026-07-29 dot-tick gauge-concurrency entry above: Fix A REJECTED by
  the footage it was waiting on.** That entry landed LOG (2-of-2 ACCEPT, both MEDIUM confidence,
  capped because open-questions U37 — does real burst gauge scale with concurrent DoT-stack count —
  was CANNOT-VERIFY, no footage either direction) and named exactly the recording that would settle
  it. The owner supplied `docs/probes/burst tests/Raven Solo Burst Gen.MP4` (raven, solo) the next
  day. Measured: her burst-gauge fill percentage at each of her 7 shots ramps (+15,+23,+29 over shots
  2-4) then plateaus (+13,+9,+9) — the signature of concurrent DoT instances stacking to her measured
  steady-state concurrency (~2.7-2.9) and holding, not a flat single-instance rate a concurrency-gated
  model would produce. Full measurement: `docs/probe-data/raven-solo-burstgen.json`,
  `docs/probe-runs.md` 2026-07-30, resolution: `docs/answered-questions.md` U37.
  **DECISION: Fix A (instance-election concurrency gating) is REJECTED, not merged.** The isolated
  worktree `worktree-agent-aab3a19427393feb2` (commit `e76093f`) is discarded — implementing it now,
  with footage arguing against it, would move the engine AWAY from observed behavior. The existing
  N-linear-per-concurrent-instance dot-tick gauge rule stands as the faithful one.
  HARNESS LESSON: this is the pattern the "revisitable on the first focused stacking-dot footage"
  clause was written for — a LOG decision naming its own falsification recording, and the owner
  supplying it within 24 hours, closing the loop cleanly without needing a new pre-op/post-op round
  (no engine change was ever made, so there was nothing to re-judge — only a decision NOT to
  implement, informed by the evidence the original panel asked for).
- **2026-08-03 — fb-count-regression investigation: LOG, general charge-B3 gauge-fill-tempo gap
  (2-of-2 ACCEPT, both MEDIUM confidence).** Scope: the 4 comps disabled in `scripts/regression.ts`
  (iron sweep run G, T5/T1 wind-weak, N3 scarlet/liberalio iron — all under-count measured full
  bursts). Step-0 premise gate first REFUTED the QUEUE.md framing entirely: not "same family as
  jill's N1/U29 shortfall" (unrelated mechanism, an editing artifact that dropped an original hedge);
  root cause is commit `c12fcf4e` (2026-07-26) correctly fixing `liberalio`'s 6x-inflated burst-gauge
  datamine, which unmasked a pre-existing shortfall her old value had papered over — she's the only
  unit common to all 4 disabled comps. A first pre-op plan (burstCdr-proc-FB-window-phase theory) was
  REJECTED by Fable: the `case 'burstCdr'` code applies unconditionally (no FB-gate exists), and the
  DECISIONS.md 2026-07-21 entry it was misread from is a settled ruling that CDR DOES apply during FB
  (from an abandoned, owner-refuted prototype of the opposite rule) — a premise-drift catch, not a
  method failure. A cheap bounding A/B (strip `d-killer-wife`'s/`rouge`'s burstCdr effects, re-run)
  confirmed the mechanism is real and net-positive (iron sweep run G: 11→9 fullBursts without it),
  closing that hypothesis cleanly. Re-founded H1 on gauge-fill tempo: decomposed each cycle into a
  MEASURED-constant floor (FB duration + 3s post-FB-chain-delay + measured chain span) vs observed
  steady-state period; the residual "excess" is gauge-fill time beyond the cooldown/chain floor. A
  pre-registered baseline (`N6 mihara/maiden wind` — currently PASSING, non-`liberalio`, two charge-B3
  competitors) showed excess (2.24s/cycle, later reproduced at 2.17s by the committed instrument) AS
  LARGE AS OR LARGER THAN all 4 disabled comps (1.27-1.94s), while the zero-charge-competition negative
  control (`misc B3s`/PI2) read ~0. Every disabled comp's zero-excess ceiling (computed from measured
  constants alone) exactly reproduces its measured FB target (or the certain low end of iron sweep run
  G's genuinely ambiguous 13-14 video read). H0c (liberalio trigger-count semantics) was directly
  tested via `DBG_GAUGE` and found 1:1 with her `hitsPerShot=1` datamine — refuted as the mechanism,
  though it surfaced a SEPARATE, general (not liberalio-specific) `skillGauge`-fires-on-every-
  `shotFired`-triggered-`flatDamage`-rider double-crediting pattern (`sim.ts `applyEffect()`, the `flatDamage` case`), logged as its own
  candidate needing an independent pre-op pass (direction is gauge-DOWN if "fixed", which would worsen
  these 4 comps — do not bundle it in).
  **VERDICT: general, board-wide charge-B3 gauge-fill-tempo gap — NOT liberalio-specific, NOT a narrow
  fix.** Routes to LOG per CLAUDE.md's engine-blast-radius rule (shared math before per-unit fixes); no
  engine/data/override file was touched this pass. Confidence capped at MEDIUM by one named assumption
  (whether real fights can hit the sim's own opening/first-FB time) and by N6's own excess correctness
  being untested (PASSES today only because it has 2 cycles of slack, not because 2.24s/cycle is
  correct). **What would raise confidence to HIGH:** frame-measure the real FB-end→next-B1 gap on ONE
  disabled comp's footage directly (the disputed segment itself, not a downstream proxy).
  **Instrument, committed (constraint 9):** `decomposeCycles()` in `scripts/experiment.ts` (also
  exported `run`), CLI via `DECOMP=1`; pinned by `scripts/tests/gauge-cycle-decomp.test.ts` (6 comps,
  the H0b-band relationship between N6 and the disabled comps is the guarded invariant, not just raw
  numbers). The work subagent's original scratch script was deleted before this citation — rebuilt as
  this committed, fixture-pinned instrument per the post-op judge's reservation before landing.
  QUEUE.md's characterization was rewritten to match (see docs/handoffs/QUEUE.md, engine threads).
  HARNESS LESSON: a rejected pre-op plan is not wasted — the judge's specific counter-evidence (the
  code citation + the "run the cheap A/B first" redirect) is what let the resubmission converge in one
  more round instead of drifting to a second wrong theory; and the driver catching Fable's OWN
  arithmetic error (an overly pessimistic cycle-floor estimate, refuted by a real comp already hitting
  the higher FB count) shows the blind/adversarial roles run both directions — the judge checks the
  driver, and re-deriving the judge's stated math against the actual rotation log is exactly the
  "verify, don't trust" habit this harness is built on.
  **ADDENDUM 2026-08-04 (ROTATION DEFAULT FLIP):** the owner overturned the post-FB chain-open
  delay this instrument's floor carried (there is NO lock — the ~3s was natural refill-from-zero
  plus a video-offset confound: the bar-anatomy recordings start before the 3:00 clock, and the
  control video's 14.1s first FB is ~5.6s of fight time, matching the sim). Consequences for this
  record: (a) the confidence-capping assumption "whether real fights can hit the sim's own
  opening/first-FB time" is RESOLVED — they do, once video offsets are accounted; (b) the
  decomposition floor dropped the dead +2.5s term (`decomposeCycles` now uses FB-duration +
  0.5s pre-B1 + chain span), so `excess` reads the refill-from-zero directly (~2.5-4.7s across
  the six comps, consistent with the owner's ~3-4s), and the test bands were re-derived per the
  instrument's own contract; (c) the LOG verdict itself STANDS — refill tempo is exactly the
  channel the shortfall lives in. See DECISIONS 2026-08-04 (top entry).
- **2026-08-03 — K's burst weapon: `damagePct` 10x misread + no SG-swap landing routing: LOG, 2-of-2
  ACCEPT, both MEDIUM confidence.** K's burst (`weaponSwap`, kit line "Damage: 92.5% of the final ATK /
  Pelletcount: 10") was modeled as `damagePct: 925` (10 pellets × 92.5%, collapsed to one hit) by the
  2026-08-02 kit-autonomy gauntlet, signed off in-session as "EV-exact / no bug" — that sign-off left no
  DECISIONS entry of its own. Step-0 premise gate (3 parallel premise-verifiers, blind) CONFIRMED: (1)
  "Damage X% / Pelletcount N" is the kit-text convention's FULL-SHOT total, not per-pellet — proven via
  MEASURED data on two already-graded real SG units, not K herself (`docs/probe-data/dorothy-solo-
reanalysis.json`: one full 10-pellet shot ≈243,000 vs 118,027×201.5%=237,824, TOTAL reading, +2%; a
  per-pellet reading predicts 2,378,240, refuted 10x; cross-checked against `docs/probe-data/coreband-
drake-sg.json`); (2) K is in no graded/pinned comp anywhere (scripts/regression.ts, experiment.ts's
  COMPS, the snapshot) — no measured-FB baseline at risk; (3) no other unit's `weaponSwap` sets
  `weapon:'SG'` (only nayuta sets `weapon:'SR'`) and the engine's SG pellet-landing model is gated
  `u.char.weapon==='SG' && !u.swap` — unconditionally unreachable during ANY weapon swap today,
  regardless of the swap's declared class. Pre-op (Fable) APPROVED-WITH-REVISIONS (positive-activation
  check with a named instrument; paste premise evidence into the work packet, not "on request"; record
  the open muzzle-count gap as a current-state caveat; split the decision rule into
  IMPLEMENT/IMPLEMENTATION-DEFECT/H1-SCOPE-FALSIFIED/INCONCLUSIVE arms; name the superseded 2026-08-02
  sign-off explicitly). Work landed on isolated worktree `nikke-sim-wt-k-fix`
  (`k-burst-sg-swap-fix-2026-08-03`, commit `5a736ff5`): `damagePct` 925→92.5, added `pelletCount:10` +
  `weapon:"SG"`; engine gains a gated `pelletCount` field on `weaponSwap` + broadens the two SG-landing
  gates to `u.swap?.weapon==='SG'` (byte-identical elsewhere — full regression diff empty, K in no
  snapshot cell, non-burst K damage unchanged 24,117,748→24,117,748). Positive-activation check showed
  the discriminating signature cleanly: burst atkPct = (old÷10)×band-landing-fraction exactly in all 4
  range bands, AND her range-bonus band flipped mid(SMG, −0.3)→near(SG, +0.3) as `RANGE_ELIGIBLE`
  predicts — proof the new gate actually fires for K, not a silent no-op.
  **Both judges independently ACCEPTed** (driver + blind Fable post-op, verdicts scored before either
  saw the other's) but both capped at MEDIUM, not HIGH, on the SAME open item (Q2): K's swap weapon
  (shot_id `1004102`) has no `shot_detail` record anywhere in the datamine, so a hidden `muzzle_count`
  multiplier — the same KIND of invisible-in-kit-text factor that already doubles her OWN base SMG
  (raw `damage:455`→`normalAttackMultiplier:9.1` via `muzzle_count:2`) — cannot be ruled in or out from
  available data. Anomaly surfaced by the work agent and independently reconfirmed by the driver: under
  the corrected reading K's burst weapon deals LESS than her own sustained SMG rate (0.62-0.83x, team
  total -0.75% with the swap vs without) — atypical for a Burst III's signature weapon, though not
  disqualifying (her Skill 2 grants the whole team +10.62% Attack Damage; the kit may lean on buff value
  over personal nuke). Both judges independently agreed this does NOT undermine H1 (the 925→92.5
  correction is certain either way — even a hidden ×2 muzzle factor gives 185, nowhere near 925) and is
  correctly handled as an honest ⚑ flag, not fudged to "fix" the anomaly (measured>fudge held). `bash
scripts/verify.sh` is RED on 3 asserts in `scripts/tests/units/k.test.ts` — the SAME 2026-08-02
  gauntlet's test, pinning the disproven 925 model (its own comments label the correct reading "the
  naive counterfactual") — both judges agree this is understood, not an ununderstood failure, and must
  be updated to pin the new model in the SAME change before it ships (constraint 5), not treated as a
  fresh defect.
  **DECISION: per the confidence rubric (HIGH+HIGH → Implement; anything less → Log), 2-of-2 ACCEPT at
  MEDIUM does not clear the bar — LOG, not IMPLEMENT. The isolated worktree/branch is preserved,
  UNMERGED; no engine/override file on the shared main tree was touched by this session.** Owner action
  item: land the worktree's diff (types.ts/sim.ts/k.json + the K1 spec-test rewrite + the drafted
  DECISIONS.md entry) as a PR if the owner accepts the MEDIUM-confidence risk as-is, OR gate it behind a
  focus recording of a K team first — the override's own MEASUREMENT-GATED caveat already names the
  discriminating recipe (popup-read her burst-window white-pellet base value: ~10,918 ATK-equivalent at
  scope-lock Attacker ATK under the accepted no-muzzle-multiplier reading vs ~21,836 under a hidden ×2 —
  directly distinguishable from footage, and resolves Anomaly A in the same pass as graduating K off
  MODEL-ONLY).
  HARNESS LESSON: the confidence cap did its job here — a clean, well-evidenced fix with zero board risk
  and a robust 10x-error refutation still got held at LOG because ONE bounded, honestly-named assumption
  (an unrecoverable datamine gap, not a modeling shortcut) survived both an adversarial pre-op plan
  review AND a blind post-op read. Two independent ACCEPTs are not sufficient on their own — the rubric's
  HIGH-only bar for IMPLEMENT is what kept an engine change with real residual uncertainty off the shared
  tree pending an owner call, exactly as designed.
  **ADDENDUM (same day) — pullsPerSec corrected 2 → 2.4, still LOG, no new panel run.** Owner-confirmed:
  the kit's "Attack speed ▼90%" applies to the swap weapon's own NOMINAL rate (base SMG's datamined
  `rate_of_fire` 1440 RPM × 0.10 = 144 RPM), not to the already-frame-quantized 20.0/s effective SMG
  rate the override had scaled instead (`20.0 × 0.10 = 2`, the derivation this file's main entry
  originally logged). Run through the engine's own `quantizeToFrames` (sim.ts `quantizeToFrames()`, MEASURED/validated
  2026-07-23 against real ammo-counter footage for the general mechanism — the identical formula every
  weapon's nominal→effective cadence already uses, and independently pinned by
  `scripts/tests/engine/weapon-swap.test.ts`/`hits-per-shot.test.ts` for the SMG case): 144 RPM = 2.4
  pulls/s nominal, and 60/2.4 = 25 is an EXACT frame count, so quantization is a no-op here — unlike the
  base SMG's own non-integral 1440 RPM, which needs the ceiling rule to reach 20.0/s. Landed directly
  (no fresh premise-verifier/pre-op/post-op round) because: (a) it touches only the override's
  `pullsPerSec` field, no `src/engine/**` code; (b) the quantization mechanism itself is an
  already-measured, already-fixture-pinned engine primitive, not a new claim; (c) the specific input has
  zero free/fitted parameters (a datamined RPM × a kit-stated percentage, landing on an exact frame
  count with no rounding judgment call). Verified: full regression still byte-identical (K in no graded
  comp/snapshot cell, as before); `validate-overrides.ts k` still green (her share of a synthetic-team
  total moved 24.9%→27.2%, consistent with the +20% cadence). Does NOT change the LOG-not-IMPLEMENT
  status — Anomaly A (the muzzle-count gap) is untouched by this correction and remains the blocking
  open item; the corrected cadence narrows but does not close her burst-vs-sustained-SMG ratio (roughly
  0.74–0.99x now, up from 0.62–0.83x, still not clearly a nuke). Committed on the same worktree/branch
  (`nikke-sim-wt-k-fix`, `k-burst-sg-swap-fix-2026-08-03`, commit `b00826c2`).

- **2026-08-10 — `jill`'s swap-cadence fallback (faithfulness enactment Tier 1, 1.924 → 0.983): DECISION = LOG.**
  Claim: `src/engine/sim.ts`'s same-weapon swap fire-cadence branch (~3715-3719) never falls back to
  `charFixes.pullsPerSec`, so `jill`'s 10s post-burst true-damage window fires at the AR class default
  (~~10/s effective in graded comps) instead of her measured 2.5/s. Full panel run: premise gate (4/4
  CONFIRM, one uniqueness premise CONFIRMED STRONGER than stated — `jill` is the roster's only
  `charFixes.pullsPerSec` carrier at all), pre-op APPROVED-WITH-REVISIONS then APPROVED (Fable — added a
  pre-registered arithmetic acceptance band, a strict byte-identity snapshot-diff control, a measured
  rather than asserted N1 negative-control premise, and pinned a binding interpretation: any teammate
  row moving inside a jill comp is an H0d rotation-timing finding, NOT covered by the plan's own named
  fallback candidate). Work subagent executed on an isolated worktree
  (`worktree-agent-ad231fa9f5803f0f9`): fit-exposure clean (H0a ruled out — `damagePct: 71.09` is kit-literal
  `normalMult`, committed a day before the bug was found); mechanism isolated and confirmed (in-window
  shot counts scale exactly with the cadence ratio, 605→139 vs 139.1 predicted, while per-shot damage and
  core-hit rate are unchanged to 4 sig figs — H0b ruled out once the pre-registered ratio-band formula's
  own flaw was found and corrected, see below); fix independently re-verified inert for every other
  roster carrier (H0c ruled out, carrier-intersection = {jill} exactly); N1 negative control byte-identical
  with its zero-burst premise measured, not assumed; every FB-count assertion held (12/12/12). Board:
  jill 1.924 → 0.983, rank 45/45 → 10/45.
  **What did NOT clear the bar:** the pre-registered per-comp ratio band missed on both bursting comps
  (~~+0.12 over) — traced to the band formula incorrectly scaling jill's cadence-INDEPENDENT Acid Ammo dot
  damage along with her cadence-sensitive normal damage; the corrected (post-hoc) formula reproduces the
  measured values almost exactly, so this is a flaw in the test's own arithmetic, not evidence against
  the fix. More consequentially, the strict snapshot diff was NOT confined to jill's own rows: four
  teammates (`grave`, `anis-star`, `chisato`, `noir`) drifted 0.18–2.70% (single-run) / ~0.3% (25-seed
  MC-mean) in her `misc B3s (run I order)` comp, with FB counts unchanged — traced to sub-second
  burst-chain cast-timing drift cascading from jill's corrected cast-readiness cadence. This is an H0d
  finding per the pre-op judge's binding interpretation, and — proven by the blind post-op judge, not
  merely asserted — the plan's own named fallback (restate `pullsPerSec: 2.5` unit-locally on jill's
  override instead of the engine-level fix) does NOT resolve it: both candidates compute the identical
  numeric cadence for jill via the same first-checked field (`u.swap.pullsPerSec`), so both produce the
  identical downstream timing cascade. Driver (Opus, primary): ACCEPT the mechanism claim, confidence
  MEDIUM (H0d unresolved, ratio-band formula needed a post-hoc repair). Fable (blind post-op): ACCEPT the
  same claim, confidence MEDIUM (Q1 partial — applying the measured 2.5/s inside the swap window is a
  same-weapon kit-shape inference, never itself footage-measured; Q3 control-team validation pending and
  gates on its own). **2-of-2 ACCEPT at MEDIUM does not clear the HIGH+HIGH bar for IMPLEMENT — LOG.**
  Nothing committed; the isolated worktree/branch carries the diff (fix + rewritten J8 spec group)
  UNMERGED, uncommitted — the work subagent halted at its own pre-committed stop-gate rather than
  proceeding past a failed clause. No engine/override file on the shared main tree was touched.
  **Owner action items:** (1) decide whether the measured teammate collateral (≤2.70% single-run, ~0.3%
  MC-mean, zero FB-count change) is acceptable as-is to land either candidate (they are simulation-identical
  for the whole board), or (2) run a dedicated n≥5 gated pass isolating whether the PI2 chain-timing drift
  is real signal or seed-level noise before landing, and/or (3) obtain a direct ammo-counter measurement
  of jill's actual in-swap cadence from a scope-lock recording (the same instrument tier that produced her
  base 2.5/s) to upgrade the applied-inside-the-window value from kit-shape inference to MEASURED.
  HARNESS LESSON: the strict-subset snapshot-diff control (added at pre-op revision) caught a real,
  previously-invisible board-blast-radius side effect that a prior sim-only A/B (cited in jill's own
  override note, "within-±5% 14→15, seedSD unchanged") had missed entirely — MC-mean board reads smooth
  over exactly the kind of sub-second single-run timing cascade a deterministic per-comp snapshot pin
  exposes. Also: a plan's own named REJECT-fallback candidate can be vacuous when two candidates are
  behaviorally/numerically identical — worth checking "does the alternative actually differ" before
  writing a fallback clause, not just after a control fires.
  **ADDENDUM (same day) — owner challenge to the LOG, investigation resolves H0d, DECISION revised to
  IMPLEMENT.** Owner: "it needs to be fixed — faithfulness always overrules — it should not change
  anything regarding burst chain timing as it only affects shots fired in full burst, during which no
  burst is generated anyways. investigate why." Read `addGauge` (`src/engine/sim.ts`): it early-returns
  on `fbEndFrame > frame || stage !== 0`, so the owner's premise is CONFIRMED — shot count during the
  swap window genuinely cannot feed the shared gauge, for jill or anyone else. So the H0d ripple could
  not be a gauge-generation leak; something else had to be moving it. Traced the actual mechanism by
  toggling the fix on/off (`git stash` / `git stash pop`) and reading jill's real `reload` events in her
  first 10s swap window: buggy 12/s cadence → 7 magazines burned (mag1..mag7); fixed 2.5/s cadence → 2
  magazines (mag1, mag2). Her flavor swap does NOT free-refill ammo on exit (`sim.ts` ~3529, an existing
  primitive predating this fix, general to every `trueNormals` swap carrier). Both cadences are fully
  inside the gauge-locked window, so neither touches the shared bar WHILE locked — but the two builds
  leave jill at a different point in her reload cycle at the instant the lock lifts (FB end), so her own
  first post-lock shot lands on a different frame in each build, nudging the shared gauge's refill curve
  — which is what surfaces as the sub-second cast-timing drift on `grave`/`anis-star`/`chisato`/`noir`,
  and even on jill's own 2nd-cycle cast (34.00s → 34.50s pre/post-fix). This is a real, general mechanism
  (any unit's reload state can ripple into shared rotation timing this way) surfacing through an EXISTING
  primitive, not a new one — and reload/ammo cycling through Full Burst is itself correct, intended
  behavior (units keep firing/reloading during FB in-game; only gauge CONTRIBUTION is gated). **H0d is
  therefore EXPLAINED, not merely observed** — the ripple is faithful collateral of a correct fix, not
  evidence the fix is unsafe. Landed: `scripts/tests/units/jill.test.ts` gained a J9 group pinning the
  reload-count mechanism (1-3 reloads in her first swap window, not ~7) as an independent regression
  guard from a different angle than J8's cadence-ratio pin; `scripts/regression.ts --update` (verified
  value-by-value against the pre-fix snapshot: only the `misc B3s (run I order)` comp's five rows
  changed, every other comp byte-identical); `jill.json`'s note rewritten to CURRENT-STATE prose (no
  history trail — the mechanism explanation lives here and in DECISIONS.md, not in the override file,
  per the doc-taxonomy rule). One unrelated fixture broke and needed recalibration —
  `scripts/tests/generators/cross-team-polish.test.ts` — a KNOWN-fragile, already-3x-precedented
  (2026-07-27, 2026-08-04, 2026-08-09) B3-pool-slice calibration that reopens whenever a pool unit's
  damage model changes materially; jill sits in the pool and her ~50% drop un-stalled the b3@13 window,
  re-scanned to b3@15 (greedy=3/polished=4/ratio 1.148, same pattern, >1.09 floor) — pure test-fixture
  maintenance, not a damage-model or engine change, confirmed by running the SAME test unmodified against
  the pre-fix tree (passes) to isolate that this fix, not something else, was the trigger. `verify.sh`
  green (274 files / 4206 tests / engine + control + overload + doll regressions all clean).
  **DECISION REVISED: IMPLEMENT** (was LOG). The evidence bar for this revision: primary-source code
  read (not inference) + a reproducible, byte-verifiable A/B toggle isolating the exact causal mechanism
  - full-suite regression confirmation that no OTHER graded comp moved — stronger than the original
    panel's blocking concern, which was an unexplained-but-observed correlation. Not a re-litigation of the
    postop-judge's MEDIUM-confidence verdict — the panel judged the evidence AS IT STOOD (H0d unexplained);
    this addendum supplies the missing explanation the panel's own reservations named as the resolving next
    step, satisfying rather than overriding the original gate.
    HARNESS LESSON: a blind panel correctly declining to IMPLEMENT on an unexplained side effect is not the
    same as the side effect being a defect — "explained and faithful" is a valid resolution path distinct
    from "re-measure until the number looks safe" or "gate behind n≥5". When the owner's stated mental model
    of a mechanic (gauge-lock) is half right, the disciplined move is to verify the confirmed half
    (addGauge's lock IS real) and keep tracing rather than either dismissing the challenge or accepting its
    first-guess mechanism uncritically — the actual causal path (reload-phase carryover) was one primitive
    away from the owner's stated one, not the one they named.

---

## 2026-08-13 — burst-cycle TEMPO GAP: **LOG** (2-of-2 ACCEPT, driver MEDIUM / Fable MEDIUM)

**Question.** Four comps sit `disabled: true` because the sim under-counts their measured full
bursts by 1–2. Is the sim's burst cycle too slow, and does the discrepancy localize to the
gauge-refill window? Measurement + LOG only (owner-scoped); no engine change in this pass.

**Result.** Real steady-state cycle period is **1.662s (iron sweep run G) / 1.649s (T5 wind-weak)**
shorter than the sim's. The cast ladder is EXONERATED (real 1.383–1.400s vs the engine's 82f =
1.3667s), so 100% of the gap sits in the FB-start→next-stage-1 span. Attribution WITHIN that span is
**unresolved**: the guard-corrected Full-Burst-duration lower bound leaves only 0.395–0.529s
unexplained by a shorter-than-10s real Full Burst, below the pre-committed 0.6s margin. Full record:
`docs/probe-runs.md` (2026-08-13 entry).

**Verdicts.** Driver ACCEPT/MEDIUM (Q1 strong for the gap + ladder exoneration, weak for the
attribution → partial; Q2 clean, nothing fitted; Q3 not gating; Q4 nothing enacted). Fable
ACCEPT/MEDIUM, reached independently, striking two overclaims (the "0.013s agreement" as
corroboration; any implication H0d is excluded) and making the tooling commit a CONDITION of landing
the entry. Both capped below HIGH by the same two things: the evidence chain was not reproducible at
verdict time, and the final label required interpreting an under-determined rule.

### HARNESS LESSONS (four, and the first two are the valuable ones)

1. **A guard added by the pre-op judge changed the verdict — against the hypothesis.** Guard 3b
   (corroborate the end of the window that sets the Full-Burst duration bound) was added because a
   late-end artifact would inflate the bound and "unfairly eliminate H0d, i.e. bias toward H1". It
   then did exactly that: three windows' ends turned out to be isolated CV false positives stitched
   on by `GAP_TOL=1.0s`, the bound fell 9.40s → 8.87s, condition (c) failed, and H1 was NOT confirmed
   — **without the guard, all four conditions pass and this would have landed as CONFIRMED.** The
   pre-op gate paid for itself in one run. Keep adding guards that are specified in the direction
   that would embarrass the hypothesis.
2. **The premise gate REFUTED the briefed method before a frame was read.** The handoff asked for an
   FB-end → next-B1 measurement. That edge does not exist: the drain bar's last ~1.5s is not
   rendered, so it is biased early by a NON-CONSTANT 1.2–1.8s — larger than the ~1.65s effect. A
   confident, precise, wrong number was the default outcome of following the brief. The re-based
   design (period + ladder, both frame-accurate) came out of the refutation. **Premise-verify the
   INSTRUMENT, not just the anchors and values** — "can this tool see the thing?" is a load-bearing
   premise and it had never been on the list before.
3. **Pre-commit the STATISTIC, not just the threshold.** Condition (b) said "within ±0.15s" without
   saying mean or median; on raw means one comp would have routed to a different outcome. The work
   subagent disclosed the choice and its effect, which is the correct behaviour, but the plan should
   not have left it open. Likewise the decision rule had a hole — "gap ≥1.0s but (c) fails" fired no
   branch at all, and the label had to be reasoned to rather than read off. **A pre-committed rule
   must be TOTAL over its own outcome space.**
4. **A threshold calibrated on a number a guard later invalidates is a self-inflicted wound.** The
   0.6s margin in condition (c) was computed from the 9.4s window that guard 3b rejects. Derive
   thresholds from guard-CORRECTED quantities, or state that the threshold moves with the guard.

**Also landed (the condition of this entry):** the guard logic is now committed at
`scripts/probe/cycle-table.ts`, driven by `scan.ts --cycle-table`, pinned by
`scripts/tests/probe/cycle-table.test.ts` against committed frame-trace fixtures in
`docs/probe-data/` — so the measurement is reproducible without the gitignored recordings. A
`SLUGS=` override on `scripts/experiment.ts` makes the footage-slot-order sim arm reproducible too.
Both were `/tmp` scratch at verdict time, which is what capped Q1 at MEDIUM; per the 2026-07-29
owner ruling an instrument cited as evidence must exist at a named path.

## 2026-08-14 — refill-window fill-trace read → LOG (driver ACCEPT HIGH + blind post-op ACCEPT HIGH)

**Outcome: LOG.** 2-of-2 ACCEPT, both HIGH — but the accepted claim is a rule-faithful
CANNOT-MEASURE on the pre-committed statistic plus a set of boundary/closure measurements
(probe-runs 2026-08-14 entry carries them). Nothing enacted; four strikes honored (the low-fill
"nothing banked" read stays hypothesis-tier; the re-anchored ~1.7–2.0× in-window ratio is logged,
not a verdict; "tracks the chance baseline" wording struck; the near-tautological whole-window
ratio fenced against misreading).

**Harness lessons:**

1. **The basis clause outranking the verdict branches is the design working.** Both medians sat
   above the CONFIRM threshold and the worker still refused the stamp because the pre-committed
   dispersion ceiling failed. A rule without that clause would have shipped a wrong H-A
   classification built on a structural artifact (blind spot × inverted fill shapes).
2. **Pin the observable's endpoints in the packet.** The plan never fixed the REAL window's
   endpoints; the worker had to choose (declared, and robust here), but under a less lopsided
   outcome that free choice is exactly where a fit hides. R1's lesson generalizes: every
   denominator and every anchor the statistic depends on belongs in the pre-op text.
3. **"Same relative span cancels the bias" was a control that failed by design** — fraction
   mapping cancels front-loading only if the two shapes are similar; they were inverted. A control
   is itself a hypothesis; give it a check (here: the Pearson(R, visibleFraction) diagnostic that
   exposed it).
4. **An instrument that loudly disowns itself is worth more than one that always passes** — the
   credit schedule voiding its own third-arm amounts (endpoint + DBG_GAUGE checks FAILED,
   unreconstructed non-empty) is what kept a wrong liberalio-confound bound out of the record.
5. **A premise gate that fires saves the run, not delays it**: 3 of 4 premises refuted as assumed
   (no team-HUD calibration existed; the tempo fixtures carry drain-bar only; the sim exposed no
   credit amounts) — the instrument phase those refutations forced is the only reason the
   measurement was executable at all.

Next pre-op named by the blind judge: the opening-window observable + a pre-committed rule on the
bar-paint-anchored statistic (retroactive promotion prohibited); reader flag-taxonomy leak closed
first. Branches pending owner PR: `instrument/gauge-fill-team`, `instrument/gauge-credit-schedule`,
`measure/fill-trace`.

## 2026-08-15 — anis-star skillGauge divisor solo re-read → LOG (driver ACCEPT HIGH + blind post-op ACCEPT HIGH)

**Outcome: LOG.** 2-of-2 ACCEPT, both HIGH — the accepted claim is a rule-faithful CANNOT-MEASURE
(n=5–6 clean pulls after the pre-registered exclusions vs the pre-committed n ≥ 8, on the 22.53s
A3 solo recording) plus LOG-tier observations: steady per-pull deltas 10.1–11.6 (unimodal,
median 11.6 strict / 11.25 lenient); sub-step decomposition unresolvable at 60fps (both credit
legs land in one frame — the H1-vs-H1b encoding discriminator is unreachable from this footage,
permanently); and the pixel-free ammo-counter bound (9 pulls fill, 8 do not) arithmetically
excluding BOTH the shipped 8.90%/pull and the un-halved 10.39%/pull totals. U28's magnitude half
stays open; the 2026-07-13 band is neither confirmed nor contradicted (same-footage caveat).
Strikes honored: (1) the "T falls only in the H1/H1b window" informational sentence — the ±1.45
amended tolerance exceeds the hypotheses' own 1.49pp separation, so the amended window is
non-discriminating by construction; if the informational data leans anywhere it leans H-band;
(2) the counting-floor glosses — corrected on the work branch (with the 2.2 baseline the 9-fill
condition gives steady P ≳ 10.96–11.14; mid-band ~11.0–11.1 is also compatible, not only the
band's top edge). Artifacts: `docs/probe-data/anis-star-solo-a3-gauge-reread.json`,
`docs/probe-data/burst-tests-recording-index.md`, catalog entry, probe-runs append (branch
`worktree-agent-a00839a48c9afe76a`, commit `d7f77966`; pending PR).

**Harness lessons:**

1. **Tolerance-widening needs a discrimination guard.** The packet's pre-committed "2× the actual
   quantization bound" escalation widened the totals windows past the hypotheses' own separation
   (±1.45 vs 1.49pp) — a silent discrimination kill. Future packets: "if 2× the restated bound ≥
   the predicted separation, the totals branch is INCONCLUSIVE regardless of n."
2. **Context-sheet lines are load-bearing — verify each against the SSOT before it ships to a
   judge.** The packet glossed "RL never cores on range", conflating range-exemption (true — RL
   never receives the +30% range bonus) with core eligibility (false — `AUTO_CORE_RATE` indexes
   RL at 0.95). The work agent's "anomalous" red CORE HIT popups were manufactured by the packet's
   wrong line, not by the game; no open question filed.
3. **The R1 identity gate earned its keep.** The `a2` filename series belongs to the A1/A2 team
   pair; only the in-footage formation check (one character model in every sampled frame, 6-round
   magazine, the solo Burst-1 hand-off hexagon) established the A3 solo identity the whole read
   rests on.
4. **Judge-named follow-ups (owner recording asks, carried to the step-4 list):** a ≥60s solo
   `anis-star` scope-lock recording (her bar zeroes at 21.73s after the solo Burst-1 — a longer
   file contains a second clean generating window for free; targets n ≥ 8 plus a second
   count-to-fill); the `modernia` Destroy-Mode bar read (U28's named probe — independent unit AND
   the separate `extraHitDamagePct` call site, breaking same-footage dependence entirely).

## 2026-08-15 — H-A/H-B/H-C classification read → LOG (driver ACCEPT MEDIUM + blind post-op ACCEPT MEDIUM, iron branch STRUCK)

**Outcome: LOG.** 2-of-2 ACCEPT, both MEDIUM — the accepted claim is NARROWER than the
deliverable's: (1) the fresh in-window mass-rate elevation is real and replayable on both arms —
iron sweep ρ 1.62 pooled (median 1.79, 10 windows), T5 wind-weak ρ 1.76 (median 1.87, 9 windows),
carried as a **1.6–1.9× band** (±10% systematics: banked-at-paint mass ~14% of Σ real Δ riding
the 0.13–0.22s bar-paint lateness; asymmetric negative-Δ truncation unquantified); (2) BOTH arms
land MIXED/INCONCLUSIVE on classification; (3) iron's "H-C mass present" stamp is STRUCK to
"H-C-candidate event-rate excess, observed, not established"; (4) no class-level claim
(cross-comp rule); (5) T5's fenced symmetric-threshold diagnostic stays non-evidentiary. The
board's ~1.7–2× generation deficit is confirmed in-window at fresh-measurement tier; WHERE it
lives stays open. Artifacts: `docs/probe-data/fill-trace-habc-classification.json` + the
`classify` subcommand + 8-assertion vitest (branch `measure/habc-classification`; corrections
per the strike applied before PR).

**Why the strike (both grounds verified by the driver after the blind return):**

- The packet's own closure clause ("residual > 0.25 → INCONCLUSIVE regardless of branch hits")
  fired on iron (0.2579); the deliverable carried the failure onto only the demoted H-B remainder
  — a post-hoc reinterpretation toward the positive finding. By the letter, iron is branch 5.
  **The driver's gate-#1 review missed this; the blind gate caught it — the two-gate design
  working as intended.**
- The C4 noise gate lacked the power the ceiling test assumed: at iron's credit fraction, a
  quiet false-event rate anywhere in 4.2–6.9% reproduces the entire branch-1 margin (true rate
  2.8–3.6 bins/s vs threshold 4.13). Closure failing in the direction O_eff×S > ρ is the
  signature of event-count inflation — the two flagged anomalies were one coherent story.

**Harness lessons:**

1. **A failed basis/closure clause may never be re-scoped onto a sub-reading after the fact** —
   the clause voids the arm's classification, full stop. If a partial carry is ever wanted, it
   must be pre-committed in the packet.
2. **Size detector margins against the power of their noise gates.** A flat ×1.15 ceiling factor
   is meaningless beside a ≤5% quiet false-event allowance on a comp where quiet bins are ~85% of
   usable bins — the margin must be credit-fraction-aware (or the ceiling test noise-corrected:
   subtract falseRate × quietBins before comparing).
3. **Threshold asymmetry between arms is a structural confound**: §C thresholded only the real
   side at E_min, making O and S uninterpretable on a comp whose sim credits are dominantly
   sub-threshold (T5: sim p50 0.212 vs reader floor 1.5). A symmetric-E_min statistic needs its
   own pre-committed pass — it cannot be salvaged mid-run (the run correctly fenced it).
4. **Quiet-basis regime match is part of a noise control's design**: C4's quiet spans were
   drain-hold frames, a different render regime from in-window between-credit frames; the
   control's number may not transfer in either direction.

**Named next steps (judge-ranked):** (1) re-run C4 on a same-regime quiet basis (offCurve-
reflagged quiet reads / between-shot spans of a solo-validated SR trace) — if the in-window
false-event rate is ≲1%, "H-C mass present" re-stamps on iron; the single cheapest resolver.
(2) A pre-registered noise-corrected ceiling test. (3) Source-hunt the excess event instants
(clustered-at-visual-cause supports H-C; scattered refutes). (4) A third comp with a
non-vacuous ceiling (T5's was cap-saturated, so the H-C detector was effectively n=1).
(5) The symmetric-E_min variant as its own pre-op.

## 2026-08-16 — C4 same-regime noise-floor re-run → LOG (driver ACCEPT HIGH + blind post-op ACCEPT HIGH; disposition CANNOT-MEASURE)

**Outcome: LOG, disposition CANNOT-MEASURE (basis broken).** 2-of-2 ACCEPT, both HIGH — but what
both gates accept is a NULL: the pre-registered quiet-span construction on the primary basis
(`anis-star` solo committed series) yields **105 quiet bins**, below the packet's own pre-committed
BQ1 floors (primary ≥150, pooled ≥180) under EVERY computed guard variant (105 trace-frame /
139 60fps-frame / 48 ×1.5-sensitivity). No R-clause is reached. The struck "H-C mass present"
stamp does NOT re-issue; H-C is NOT shelved either (a basis failure is never "effect
absent/present"); iron sweep (run G)'s classification stays MIXED/INCONCLUSIVE, residual 0.2579
standing. The disposition is over-determined: even absent BQ1, the Wilson one-sided 95% upper
bound at n=105 with zero false-event bins is 2.51% > the 2.304% re-stamp cutoff — R1 could not
have fired on this basis size no matter the data.

**The accepted claim (blind judge's words, condensed):** on the pre-registered construction the
surviving same-regime quiet basis is too small to measure the filling-regime false-event rate to
the required precision; within that too-small basis the reader produced **literally zero positive
deltas** (f = 0 at all three thresholds 1.41/1.5/1.596 raw; the positive-Δ set is EMPTY across
99 pairs) and the P-B magnitude discriminator's 5–7 team-event band is empty — recorded as
descriptive findings consistent with H1's direction, **carrying no stamp**. STRUCK from
acceptance: any re-issue of "H-C mass present"; any reading of f = 0 as "noise is low"; any
citation of the `snow-white-heavy-arms` descriptives in stamp text (it never qualified for the
pooled statistic — pull instants pixel-free-pinned but credit clusters bar-derived, and no span
table was pre-registered for it); any promotion of the bridged-adjusted MAR figure (4.3251/s)
beyond descriptive context.

**Why the basis broke (a PLAN defect, not a work defect):** the BQ1 floor (150) was calibrated
against the premise-verifier's ~210–250-bin estimate, but that estimate predated the packet's own
×2 guard widening on the three cadence-interpolated pulls — whose guards merge into one 2.67 s
exclusion deleting two whole plateaus. Floor and guard spec were mutually incompatible from the
moment the packet was committed, discoverable by pure arithmetic before any measurement ran.

**Harness lessons:**

1. **A basis-floor clause must be checked for SATISFIABILITY against the pre-registered
   construction itself at pre-op time** — compute the quiet-bin yield the guard spec actually
   implies (including guard merges) before committing the floor, exactly as a power analysis. A
   floor derived from an estimate that predates the guard spec can be dead on arrival, converting
   a well-executed measurement into a guaranteed CANNOT-MEASURE.
2. **Pre-register the secondary basis's span construction too, or declare it descriptive-only up
   front.** This run avoided a mid-run rule invention only because the work agent refused to
   improvise a `snow-white-heavy-arms` span table that the packet never specified.
3. Controls that replay committed artifacts to exact equality (C-i here, byte-for-byte on the
   drain-hold C4 figures) remain cheap and decisive instrument-continuity anchors — keep them.

**Named next measurement (blind judge, power-geometry made explicit):** more same-regime quiet
footage on the primary basis — a longer `anis-star` solo recording (or a second slow-cadence solo
clip with long inter-pull plateaus) sized so the PRE-REGISTERED construction yields ≥150 primary /
≥180 pooled quiet bins, with the yield pre-computed from the guard spec before committing the
floor. Zero false bins clears R1's Wilson clause at n ≥ 115 — this run's 105 missed by ~10 bins,
so **~45–75 additional quiet bins resolve both clauses in one pass**. Secondarily: a quiet basis
whose fill-level distribution covers iron's 70–80 fill-% mode (this basis had zero bins there —
a carried regime-coverage caveat on any future pass). This folds INTO the existing ≥60 s solo
`anis-star` scope-lock re-record ask (QUEUE item 2): the same footage serves the divisor read AND
the noise floor.

**Artifacts (all committed):** plan of record
`docs/handoffs/closed/2026-08-16-c4-noise-floor-preop-packet.md` (pre-op APPROVED-WITH-REVISIONS,
5 revisions executed pre-registration); machine deliverable
`docs/probe-data/c4-noise-floor-rerun-2026-08-16.json` (verdict-free); the `noise-solo`
subcommand on `scripts/probe/fill-trace-compare.ts` (ports the `offCurve` dominant-chain pass to
solo series); replay pin `scripts/tests/probe/noise-solo.test.ts` (6 tests, byte-for-byte);
regenerated `snow-white-heavy-arms` solo trace WITH full invocation
`docs/probe-data/swha-solo-30fps-c4-trace.json` (closes the undocumented-invocation gap flagged
by the step-0 premise verifier). Work commit `6311cc2d`; packet pre-registration `22460e2a`.

## 2026-08-16 — anis-star hitsPerShot carve-out removal → IMPLEMENT (driver ACCEPT HIGH + blind post-op ACCEPT HIGH)

**Outcome: IMPLEMENT.** 2-of-2 ACCEPT, both HIGH. Packet:
`docs/handoffs/2026-08-16-anis-star-carveout-preop-packet.md` (pre-op APPROVED-WITH-REVISIONS,
R1–R3 executed); work deliverable:
`docs/handoffs/2026-08-16-anis-star-carveout-work-deliverable.md`; change commit `145d8df6`
(branch `anis-star-gauge-divisor`); ruling: DECISIONS 2026-08-16. Accepted claim (blind judge's
words): the `'anis-star': 2` carve-out was a stale compensator — the dot over-emission it
halved was independently removed by the gauge-lock rulings — and its removal preserves every
enabled measured FB pin byte-exactly, confines all movement to the six comps seating her
(84-row exact-zero negative control), and moves the solo decomposition 8.90 → 10.39 %/pull
toward but still below the exclusion bound. STRUCK from acceptance: any solo-magnitude
closure claim; rider structure 1×280 vs 2×140; confirmation weight from T5/T1 moving toward
13; the divisor as a game rule for hitsPerShot > 1 generally.

**Harness lessons:**

1. **A carve-out's recorded justification is a premise with a date.** The weapon-fields comment
   ("at 1, PA MiKa makes 12 FBs vs measured 11") was measured true in 2026-07-17 and silently
   falsified by the 2026-08-04/08-13 gauge-lock rulings; the premise-gate A/B caught it
   (premise-verifier REFUTED the live claim before the plan rested on it). Hacks that
   compensate a defect should cite the defect, not just the symptom count, so a later fix of
   the defect flags the hack for re-audit.
2. **The pre-op judge's file-level spot-check earned its keep**: R1 caught that
   `burstGaugePerShot`'s derivation never involves `hitsPerShot` — the packet's hand-reasoned
   2.8 edit would have been silently reverted by the next sync and manufactured a phantom
   `data/**` diff. The determinism claim is now a spec (characters.json row ==
   `deriveWeaponFields` output).
3. **Board-band movement from a rotation-timing fix is fit-exposure, and pre-declaring that
   reading matters**: the post-op judge pre-committed "any band exits are re-tune items, not
   evidence against the change" BEFORE the board diff ran (bands 10/15/25/20 → 9/15/23/22,
   PA MiKa supports hotter, `anis-star`/`cinderella` improved). Follow-up filed in QUEUE
   item 2 rather than re-litigated.

## 2026-08-16 — anis-star solo #2 gauge magnitude + same-regime noise floor → LOG (driver ACCEPT HIGH + blind post-op ACCEPT HIGH)

**Outcome: LOG, disposition INCONCLUSIVE (Question A) + MEASURED (Question B).** 2-of-2 ACCEPT,
both HIGH. Measurement-only packet — no enactment. The two halves resolve differently:

**Question A (per-pull gauge magnitude): INCONCLUSIVE-LOG.** The pre-committed ≥2-window
counting rule cannot fire regardless of how the R2 map-vs-trace conflict resolves:

- If the pre-registered 1fps map stands (R2 mechanical): all three refill windows carry an
  out-of-tolerance boundary → BASIS-BROKEN (<2 survive).
- If the trace stands (three independent instruments — countdown digits, montage ammo
  decrements, cycle length — all corroborate the trace and localize the disagreement to the
  map itself): the surviving windows are W2 (K=9 but the 9-pull fill is arithmetically
  enabled by an anomalous +15.3 credit — counterfactual at steady ~11.25 gives ~97, not full),
  W3 (K=10, DOUBLY-CONSISTENT per R1: both H-model 10.39 and H-elevated up to ~11.69 produce
  K=10 with the opener), W4 (K=9 but steady-premise violated by two anomalous credits
  +16.0/+15.2 and a smeared p7). Zero windows count cleanly toward exactly-ONE hypothesis.
- W1 (opening, separate per packet): K=9, excludes H-legacy (82.8, not full) and H-model
  (94.7, not full), consistent with H-elevated from ~11.05+ — corroborates the A3 window's
  structure on independent footage, but does not enter the ≥2-window rule.

**Question B (same-regime noise floor): MEASURED.** 492 primary quiet bins (3.3× the 150
floor), 597 joint-pooled (3.3× the 180 floor). Zero false-event bins at all three thresholds
(1.41/1.5/1.596). Wilson 95% one-sided upper: 0.55% primary, 0.45% pooled — well under the
~1% the classification thread's ceiling test needs. The C4 basis-size deficit (105 bins vs 150
floor) is resolved at ~4.7× margin. Regime coverage (317/492 bins in 60–80% fill range) closes
the C4 70–80% gap. This is INPUT to the classification thread's ranked item (2), the
noise-corrected ceiling test — it stamps nothing about H-C by itself.

**Anomalous-magnitude credits (descriptive finding, no hypothesis predicts them):** three
pulls across two windows credited +15.2–16.0% each, montage-confirmed as single ammo
decrements (W2p8 +15.3, W4p2 +16.0, W4p3 +15.2). Not observed on the A3 footage. They form
a separate ~15.2–16.0 family (21–22 columns of the 138px bar) distinct from the steady
10.1–11.6 family. No current hypothesis accounts for them. They are mechanically clean
(stable plateaus, single decrement) but no game mechanic is identified. Filed descriptively.

**Pre-registration map defect (R2 conflict):** the 1fps montage map (built before the 30fps
trace ran) placed the three refill-window opens 2.2–4.9s later than the trace shows. Three
independent instruments corroborate the trace: (1) countdown digits fix the three 10s spans
ending 0.55–0.8s before the trace opens; (2) montage ammo first-decrement instants fall
0.5–1.6s after the trace opens but 2.1–4.7s before the map's opens; (3) full→open cycle
length is a consistent 10.6–11.1s on all three cycles. The map's cast-3 anchor (~64.5) is
directly contradicted by the countdown digit 09.00 at t=62.5. Harness lesson: a
pre-registered map built from a lower-tempo instrument (1fps) can be wrong even when the
higher-tempo trace (30fps) is right — the R2 tolerance was sized for same-instrument
boundary disagreement, not for a systematic map lag. Future packets building maps from 1fps
montages should pre-register a wider tolerance or a trace-override clause.

**The accepted claim (blind judge's words, condensed):** the work followed the pre-registered
method end-to-end (instrument gate before target read, tolerance guard declared pre-read,
counting branch sole discriminator, R1–R4 correctly applied); the decision rule correctly
surfaces INCONCLUSIVE-LOG regardless of R2 resolution; the anomalies are flagged not smoothed;
Question B's floors are cleared at large margin. ONE minor defect found and corrected: the
deliverable's §6 claimed "n≥8 requirement met in every pool" but the W1-separate pool had n=7
— non-load-bearing (medians non-discriminating by construction) but a stated-number error.

**Harness lessons:**

1. **Pre-registered maps from lower-tempo instruments need a trace-override clause.** This
   packet's R2 tolerance (±1.5s) was designed for same-instrument boundary disagreement. The
   1fps map systematically lagged the 30fps trace by 2.2–4.9s, which the tolerance could not
   absorb. Three independent instruments rescued the trace; without them, BASIS-BROKEN would
   have been the mechanical result despite the trace being correct. Future packets: either
   widen R2 when the map comes from a lower-tempo source, or pre-register that the trace
   supersedes the map when corroborated by ≥2 independent instruments.
2. **Anomalous-magnitude credits that are mechanically clean (single ammo decrement, stable
   plateaus) but unpredicted by every hypothesis are a DESCRIPTIVE finding, not a defect.**
   They do not invalidate the counting rule (the rule correctly surfaces INCONCLUSIVE when the
   steady-premise is violated); they are a game-mechanics observation for future work.
3. **A measurement-only packet can produce a clean MEASURED result on one question
   (Question B) while the other (Question A) is INCONCLUSIVE.** The two halves are independent
   by construction; Question B's basis does not depend on Question A's decision rule.

**Artifacts (all committed):** pre-op packet
`docs/handoffs/2026-08-16-anis-star-solo2-gauge-preop-packet.md` (APPROVED-WITH-REVISIONS,
R1–R5 executed); verdict-free artifact `docs/probe-data/anis-star-solo2-gauge.json`; work
deliverable `docs/handoffs/2026-08-16-anis-star-solo2-gauge-work-deliverable.md`; blind
post-op packet `docs/handoffs/2026-08-16-anis-star-solo2-blind-postop-packet.md` + result
`docs/handoffs/2026-08-16-anis-star-solo2-blind-postop-result.json` (kimi-code/k3, ACCEPT
HIGH); replay pin `scripts/tests/probe/noise-solo2.test.ts` (5/5 GREEN); tooling extension
`scripts/probe/fill-trace-compare.ts` noise-solo2 subcommand (+243 lines).
