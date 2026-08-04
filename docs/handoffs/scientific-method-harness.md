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
  unconditionally on every live dot instance's tick (`src/engine/sim.ts:3303`), so a unit whose DoT is
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
  `shotFired`-triggered-`flatDamage`-rider double-crediting pattern (`sim.ts:2393`), logged as its own
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
