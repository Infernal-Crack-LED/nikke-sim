# QUEUE.md — live action items (session state, AI-facing)

> Moved out of `CLAUDE.md` 2026-07-26 (owner ruling: the work queue is session state, not an
> instruction file — `CLAUDE.md` keeps durable rules + verified facts only). Every live/deferred
> TODO or "next steps" list MUST live HERE — chat is ephemeral, only files carry across sessions.
> Landed current state → `docs/STATE.md`; research threads → `docs/open-questions.md`; settled WHY
> → `docs/DECISIONS.md`; the actionable **live TODO → here**.
>
> **Hygiene (the `.claude/hooks/commit-state-hygiene.sh` nudge fires once per session on commit):**
> items below carry ONLY genuinely-open action items as short pointers into their handoff/plan docs
> — no landed-work narration (landed state → `docs/STATE.md`; settled WHY → `docs/DECISIONS.md`).
> When an item lands, DELETE it here (keep only its open follow-up clause); a done handoff →
> `CLOSED (date)` marker + **`git rm --cached` then a plain `mv`** into `docs/handoffs/closed/`
> (archiving UNTRACKS — the archives are gitignored; procedure and its failure modes in
> `docs/CONVENTIONS.md` → Doc hygiene); a fully-landed top-level `docs/*.md`
> (never a living log) → same into `docs/closed/`; a resolved question → close it in
> `docs/open-questions.md` (single U-numbering — move it to `docs/answered-questions.md` with the
> answer inline, no new A-number).
>
> **Last audited 2026-08-16** — every claim below was re-verified against the tree (branch merge
> state, file/symbol existence, test skips, doc paths). Landed narration deleted; dangling pointers
> repaired.

**PHASE: industrialize the accuracy sweep** — every owned unit within ±3% (multi-run avg) at n≥5,
fewest videos. Master plan: `docs/handoffs/2026-07-16-full-sweep-plan.md`. Dashboard:
`npx tsx scripts/board-read.ts`. **Submission intake: 0 pending** (Nikke Sim Data Submission Google
Form → `/submission-intake` → `/probe-processing` → hand-tune; this line is the tracked count).

### 🤖 AUTONOMOUS WORK QUEUE — read this INSTEAD of the pointer list below if unattended

> **Why this exists (2026-07-25).** The pointer list below is an excellent _attended_ handoff and a poor
> _autonomous_ task list: ~15 threads, most gated on recordings the run cannot obtain, owner rulings it
> cannot get. An unattended session reading it finds no unambiguous
> next action and wanders — burning a night for near-zero landed output. This queue is the opposite: a
> short, ordered list where every item is **(a) unblocked, (b) verifiable by
> a script that already exists.** Owner maintains it; keep it SHORT (≤5) and delete items as they land.
>
> **Rules for an unattended run:**
>
> 1. **Take the topmost unblocked item and finish it.** Do not survey the whole list, do not re-plan the
>    phase, do not "improve" an area you were not sent to.
> 2. **Land in committed slices.** A slice = a coherent change + its gate green (`bash scripts/verify.sh`
>    or `npx vitest run`) + a commit whose message names the premise it rests on and how it was verified.
>    Committing is encouraged and cheap (constraint 2); pushing stays owner-gated. The autonomous
>    blast-radius cap enforces this mechanically at 300 uncommitted lines.
> 3. **PRODUCTIVITY STOP.** Every ~45 min, ask: _what have I committed with a green gate?_ Two consecutive
>    checkpoints with no commit ⇒ **STOP the thread**, write findings to a handoff doc, and either move to
>    the next queue item or end the run. A night that produces one honest committed slice plus a clear
>    handoff beats a night of exploration with nothing landed.
> 4. **Reuse before you derive** (the SUFFICIENCY rule) — search for an existing labeled set before
>    generating ground truth. An unattended run is exactly where the 5-hour re-derivation happens.
> 5. **One unvalidated fact is not a mandate.** If a finding implies a broad rewrite, that is a STOP-and-
>    propose, not a green light: write the proposal, commit it, continue. Sweeps are FINDINGS-ONLY.

**QUEUE (owner-maintained; empty = do a survey pass and propose, do not invent work):**

> **NEXT UP — UNBLOCKED AND ORDERED (set 2026-08-17 at owner request).** Every item here is
> footage-FREE: it runs against footage or fixtures ALREADY on disk, with instruments that already
> exist. Take them top-down. The numbered threads below (1–5) stay as the reference detail and are
> mostly footage-gated — do NOT start there.
>
> **N1. DONE 2026-08-17 — LOG with a SPLIT 2-of-2; superseded by N1b below.** The pre-registered
> re-run ran (packet + deliverable + `docs/probe-data/anis-star-solo-magnitude-2026-08-17.json`,
> instrument `scripts/probe/gauge-magnitude.ts` + pin). Record:
> `docs/handoffs/scientific-method-harness.md` 2026-08-17. Nothing enacted. Two things to carry:
> the declared 3.71 candidate rests on `basePerTrigger`, which the premise gate proved
> **ENGINE-INERT** (`sim.ts` never reads it) — so it could only ever describe a NEW mechanism, never
> a mis-set constant; and the run measured the classified-steady credit at **11.32 / 11.15** on two
> independently-calibrated recordings, both excluding the shipped 10.388.
>
> **N1b. ⛔ BLOCKING PREREQUISITE — a render-scale calibration read on `anis-star`'s own solo bar.**
> This is the one measurement that settles the magnitude question, and until it exists **no further
> magnitude run is worth starting** (a third would re-fight the same argument). A3's own
> `series30fps.calibration` block carries `rawOverTrue = 1.064` — a standing instrument-gain claim
> anchored on `maiden-ice-rose`. Applied, it drags the measured 11.32 down to ~10.64 with a CI that
> CONTAINS the shipped 10.388, i.e. the whole elevation could be reader gain. The 2026-08-17 run's
> pre-registered gain test looks for a gain SIGNATURE in the data (absent) and has no leg for a gain
> CONSTANT already written down elsewhere in the tree. **DO:** apply the `maiden-ice-rose`-anchored
> calibration method to `docs/probes/solo/anis-star-solo.mov` directly and confirm or refute
> `rawOverTrue ≈ 1.064` for THIS bar. Footage-free (recording on disk).
>
> **N1c. Owner ruling wanted (cheap, no work attached).** The 2-of-2 split turned on one question:
> may an out-of-sample recording's E1 window carry a `clause 1(ii)` counting leg when the same
> packet has demoted that recording's E1 as already-on-record and non-falsifying? Driver said no
> (⇒ INCONCLUSIVE), blind Fable said yes in the spirit of the rule (⇒ ACCEPT-narrowed). Both struck
> the W3 window independently — its "exclusion" margin was 0.0012 of a render column. Also flagged
> for the harness template: the clause-2 **reachability wording is degenerate as drafted** (it makes
> clause 1 unsatisfiable in all possible worlds) and should be fixed before another packet inherits
> it.
>
> **N2. A SECOND `liberalio`-free fill trace. ⛔ DO NOT RUN AS FILED — the premise gate stopped it
> at step 0 (2026-08-17).** Full record, with every quote and `git log -S` receipt:
> **`docs/handoffs/2026-08-17-n2-second-control-premise-gate.md`**. Read that BEFORE re-planning;
> three verifier passes are in it and none of it needs re-deriving. Summary of what failed:
>
> - ~~**Blocker 1 — N3 gates N2.**~~ **CLEARED 2026-08-17** by the `gaugeHits` credit-schedule fix
>   (`2d4dd117`): the carrier seat now reconstructs at 1080.352 = engine, residual 0, was 463.008.
> - **Blocker 2 — the "ALREADY-PRE-COMMITTED conversion rule" is neither pre-committed nor
>   applicable. STILL OPEN.** `git log -S` puts its text in `c8f3caf8` at 07:53, **23 minutes AFTER**
>   the verdict it supposedly preceded (`7e2f7e1f`, 07:30); that run committed no pre-op packet at
>   all, so the attribution is self-attested. And the conversion half is a sketch: the clustering
>   statistic is unnamed, the two-control `R_ctrl` reconstruction undefined, "spread comparably" has
>   no threshold, and there is an uncovered middle zone where NEITHER branch fires. δ = 0.15 also
>   fails its own seconds→proportional step (derived ~0.064–0.084). **Pin the rule numerically
>   BEFORE computing the new control's residual, or the run inherits exactly the post-hoc-tolerance
>   exposure harness lessons 1 and 4 exist to prevent.**
> - **Blocker 3 — `N5 snowwhite-HA fire` is the wrong control. STILL OPEN.** It is the ONLY member of
>   the stamped nine where the sim reads **HIGH** (13 vs measured 12); the other eight under-count,
>   and the band was built on PI2, which under-counts. Untraced `liberalio`-free alternatives:
>   `N1 rapi/quency wind`, `N2 modernia wind` (prefer these), or `soda-tb control` — ⚠ the last seats
>   `soda-twinkling-bunny`, whose `fullBurstExtend` broke the closure decomposition on N3.
>
> Also corrected there: N5 has **no fill-trace bundle at all** (so "clean bundle" was a hoped-for
> outcome, not a property); "measured FB 12/12" is splash-scan notation, **not** sim 12 / real 12
> (measured is 12, sim reads 13); and T5's "1.75–1.82" is **not** an uncertainty interval but one
> measurement under two window-inclusion choices.
>
> **What CONFIRMED and is reusable:** the bar-paint chain is sound — iron 2.342 / T5 1.817 (readable)
> / PI2 2.0915 all recompute exactly from raw 60fps reads (36/36 per-window identical), and the chain
> applies to new footage (precedent: `fill-trace-n3-scarlet-liberalio-iron.json`). The handoff lists
> its per-recording requirements, its five gates, and its documented failure modes.
> ⚑ `docs/probes/**` is GITIGNORED — a fresh worktree has no media, so run this in the main tree (or
> symlink the probe dir).
>
> **N4. Test hygiene on `scripts/tests/gauge-cycle-decomp.test.ts`.** Retitle its "measured 4.43 /
> 3.56 / 3.71" bands as SIM DRIFT-GUARDS — four-leg confirmed 2026-08-17 as that instrument's own
> 2026-08-04 output relabelled "measured" (`git show 2a8b869d`); the real bar-paint tape is 2.342 /
> 1.75–1.82 / 2.09–2.11s. Also record that its `PI2 < T5` assertion is contradicted by measurement
> regardless of any arm (real T5 1.75–1.82s < real PI2 2.09–2.11s), and that T1 has NO footage refill
> measurement at all. ⚑ Do NOT blanket-`--update`: of the 19 reds under the `gaugeHits` arm, ZERO are
> measured-anchored, 4 are child-process harness artifacts, 15 are genuine arm effects.
>
> **N5. Probe-tooling follow-ups — 2 of 4 DONE 2026-08-17, 2 remain** (all footage-free, detail in
> thread 2 below).
>
> - ~~`scan.ts` fixture writer emits fields `TempoFixture` does not declare~~ **DONE** (`b43378cf`):
>   every emitted field now declared, verified against all four committed fixtures; the two
>   `as TempoFixture & {...}` casts in `n3-third-arm.test.ts` retired and replaced with an explicit
>   assertion (a `?? []` default would have silently produced an EMPTY frame trace on a rename).
> - ~~a bare `--fixture-out` with no value is silently skipped~~ **DONE** (`50198c6f`): now fails
>   loudly, and both it and the `--cycle-table` requirement are validated **before** the decode, so a
>   typo costs a second instead of a full video extraction. ⚑ Reported, NOT changed: `--debug-dir`
>   (`scan.ts` ~line 184) has the identical bare-flag pattern — left alone because absence there is
>   genuinely optional rather than a dropped deliverable. Owner call.
> - **OPEN:** `auditElementControl` / `--element-control` has ZERO vitest coverage and its C1
>   artifact block is never replayed.
> - **OPEN:** `ceiling-screen.test.ts` hard-codes three literals (23.618, 38.1, `/ 30`) derivable
>   from artifacts it already loads.
>
> **N6 (new, from the N3 landing — findings-only, reported not acted on).** The sibling
> `--refill-starvation` and `--multihit-crediting` folds in `scripts/battery/fb-count-matrix.ts`
> count damage **instances** as gauge-eligible hits, so they carry the SAME (N−1) `gaugeHits`
> blindness N3 just fixed in the credit-schedule fold — latent for the same reason, and now the only
> remaining instance of that defect class in the file. Also: `docs/fb-count-matrix.md`'s generated
> tables have drifted from a fresh run (e.g. T5's buzzer state reads "opened 173.5s" vs the doc's
> 179.2s).
>
> Also unblocked but lower value: `mihara-bonding-chain`'s fit exposure (thread 1 — localize the
> over-model, do not restore the 12-stack average); the clean-bin-time vs full-window denominator
> settlement against a known-ground-truth fixture (turns the standing MAR caveat into a measured bias
> bound); and the batched `cinderella`/`eve`/`julia` `gaugeHits` census rows — findings-only, and the
> 2026-08-17 run gives NO support for crediting them at full value.

1. **Faithfulness sweep residue** (batch docs archived 2026-08-13 in
   `docs/handoffs/closed/2026-08-10-faithfulness-batch{1..8}-findings.md`). Most items closed by
   enactment, refutation, or owner ruling (2026-08-11 M-list triage + 2026-08-13 corrections).
   Open:
   - **`noir` — OPEN (footage-gated).** Reload tension (recon ~0.6–0.9s vs datamined 62f ≈ 1.03s).
     Folded into SG investigation (M7); same footage serves both.
   - **`mihara-bonding-chain` — FIT-EXPOSED (achievable without footage).** Ensnaring primitive
     landed 2026-08-13; removing the old 12-stack average revealed an over-model elsewhere in her
     kit. 1.034 → 1.179 HOT on 2 graded comps; FB count UNCHANGED at 11 vs measured 11, so it is
     magnitude not rotation. LOCALIZE the over-model; do not restore the average.
     **→ Handoff: [2026-08-13-mihara-fit-exposure.md](2026-08-13-mihara-fit-exposure.md)**
   - **Held primitives** (F11 discipline — leave held): `moran` S1 DEF ▲/stack, `maxwell`
     `byFinalAtk`, `helm`'s held tag.
   - **`mint` — HELD** (M12 confirmed shipped `singing` model; solo magnitudes unanchored by
     disposition).

2. **Burst-generation thread** — core steps landed 2026-08-15 (PRs #120/#121/#122 merged).
   Classification: MIXED/INCONCLUSIVE (closure 0.2579 stands after noise-corrected ceiling test,
   source-hunt fix, and symmetric-E_min analysis — all three 2026-08-16). Application-gauge engine
   landed 2026-08-16 (owner rulings ×3). `anis-star` carve-out removal enacted 2026-08-16 (PR #125
   merged). Opening-window timing promoted to owner ruling 2026-08-16 (DECISIONS). Open:
   - **Iron-sweep FB shortfall (sim 11 vs measured 13–14) — OPEN (footage-gated).** `takina` S2
     re-modeled as 15s pulse; comp still reads 11 FBs. All five seated kits audited clean (no
     missing application-gauge credits). H-A team-context route CLOSED by owner ruling. The
     `anis-star` U28 divisor read is what remains of the encoding audit path.
     `iron sweep (run G)` regression comp stays disabled.
   - **`anis-star` solo magnitude residual — OPEN.** 10.39 vs ≥ ~10.96 exclusion bound returned
     INCONCLUSIVE-LOG from solo #2: the ≥2-window counting rule could not fire because the three
     anomalous credits (+15.2–16.0%) violated the steady premise in W2 and W4. **NOT
     footage-gated after all — the existing recording has four windows; the blocker was
     hypothesis discrimination, not window count.**
     **Source-hunt 2026-08-17 (`docs/probe-data/anis-star-anomaly-source-hunt-2026-08-17.json`)
     narrowed it: W4p2 (+16.0), W4p3 (+15.2) and the steady W4p4 (+11.6) did the IDENTICAL damage
     increment 480,330, so extra-hits, charge-level (`fullChargeBonus` 250) and crit/core are all
     refuted — the excess is gauge-specific.** Candidate to PRE-REGISTER next (arithmetic fit,
     n=3, fitted after the fact — not evidence yet): the anomalous pulls credit one extra
     `basePerTrigger` 140 × 2.5 focus × 1.06 aura = 3.71%. Next step is a gated re-run of the
     counting rule with that hypothesis declared in the packet, so anomalous windows become
     CLASSIFIABLE instead of premise-violating.
   - **⇒ `liberalio` GAUGE-CREDIT AUDIT — CLOSED as LOG 2026-08-17. Defect FOUND, magnitude
     INCONCLUSIVE at 2-of-2. Nothing enacted.**
     **→ Handoff: [2026-08-17-liberalio-gauge-credit-audit.md](2026-08-17-liberalio-gauge-credit-audit.md)**
     · decision log: `scientific-method-harness.md` (2026-08-17).
     Her datamine row is EXACT (refutes the per-unit-datamine hypothesis that opened this thread).
     The defect: her `skill1` rider says "Activates 5 times" but the aggregated 202.5 `flatDamage`
     carries no `gaugeHits`, so the engine credits ONE gauge impact per full charge. Crediting all
     five moves BOTH scored comps' refill TOWARD the measured tape and lifts FB counts without
     overshooting any measured count, but leaves iron sweep below and T5 above a `liberalio`-free
     control band ⇒ no single per-sub-hit value reconciles both. Controls byte-identical, damage
     bit-identical. **`npx tsx scripts/battery/liberalio-gaugehits-ab.ts --residual`** reproduces it;
     census `npx tsx scripts/census-gauge-subhits.ts`.
     **Three things this run KILLED — do not rebuild reasoning on them:**
     (a) the "measured 4.43 / 3.56 / 3.71" refill literals in `gauge-cycle-decomp.test.ts` are
     relabelled 2026-08-04 SIM output, not footage (4 independent legs); the real bar-paint tape is
     2.342 / 1.75–1.82 / 2.09–2.11s, so **the sim refills TOO SLOWLY, including on the
     `liberalio`-free PI2 control (~44% slow)**; (b) `rl3` cannot be decomposed into
     impacts-per-trigger (degenerate — 33.6 fits 6, 3 or 12 equally), so it never corroborated the
     5-sub-hit count; (c) her presence in exactly the four disabled comps is MEMBERSHIP, not
     mechanism — already stamped "NOT liberalio-specific" with 5 of the 9 affected comps seating
     no `liberalio`.
     **NEXT, in priority order:** (1) ~~PREREQUISITE — the credit-schedule reconstruction never reads
     `gaugeHits`~~ **DONE 2026-08-17**: it now credits per sub-hit, pinned on `N5 snowwhite-HA fire`
     by `scripts/tests/battery/credit-schedule.test.ts`; (2) the settling measurement is a
     `maiden-ice-rose`-style hand read of her per-pull gauge sub-steps (the comp-level estimator
     structurally cannot separate a reduced per-sub-hit value from the general gap); (3) a second
     committed fill trace on a `liberalio`-free stamped-class comp — **NEXT UP N2, and NOT
     footage-gated: `N5 snowwhite-HA fire`'s recording is already on disk** — which converts a
     reproduced split into an affirmative REJECT.
   - **Batched `gaugeHits` follow-up (findings-only, small):** `cinderella` (burst, N=10),
     `eve` (burst, N=6), `julia` (burst, N=5) also aggregate a multi-hit without `gaugeHits`. All
     once-per-cast, so none can carry the FB shortfall — and the 2026-08-17 run gives no support for
     crediting them at full value either.
   - **Test-hygiene follow-up:** retitle `gauge-cycle-decomp.test.ts`'s "measured" bands as sim
     drift-guards, and note its `PI2 < T5` assert is contradicted by measurement regardless of any
     arm (real T5 1.75–1.82s < real PI2 2.09–2.11s). Do NOT blanket-`--update`: of 19 reds under the
     arm, ZERO are measured-anchored, 4 are child-process harness artifacts, 15 genuine.
   - ~~Ledger gap: the 2026-08-15 `snow-white-heavy-arms` per-sub-hit enactment has no DECISIONS
     entry.~~ **CLOSED 2026-08-17** — entry backfilled into `docs/DECISIONS.md` → Measured mechanics.
     It records the arithmetic-closure evidence, the independent 12/12 splash-count corroboration, the
     49-minute FINDINGS-ONLY→enacted gap, and the caveat that only `snow-white-heavy-arms` of the three
     `gaugeHits` carriers is measurement-backed (`eve`/`little-mermaid` are kit-prose only).
   - ~~Protected-path correction pending owner approval: the `skillGauge` comment in
     `src/engine/sim.ts` claims the `maiden-ice-rose` rider "measured exactly 364".~~ **CLOSED
     2026-08-17** (owner-approved, comment-only — zero non-comment lines changed). It now states the
     actual 3.45%-vs-modelled-3.64% measurement, that the flat/un-focused SHAPE is confirmed while the
     −5.2% magnitude residual is OPEN (U28), that `hitsPerShot` 1 means the anchor does not verify the
     `hitsPerShot > 1` divisor, and disambiguates `maiden-ice-rose` from the base `maiden`.
     `docs/data/burst-gauge.md` §5/§6 were corrected the same day.
   - Second, lower priority: settle
     the clean-bin-time vs full-window denominator on a fixture with known ground truth, which would
     turn the standing MAR caveat into a measured bias bound — every detection in this thread is
     currently estimator-conditional.
   - **Third-arm run LANDED 2026-08-17 → LOG.** Two open follow-ups only (the rest is in
     `docs/probe-runs.md` + the harness log, do not re-narrate here):
     (i) **future packets must PIN A CONTROL'S ESTIMATOR, not just its tolerance** — C2 bound on
     "FB duration 15.0 ± 0.5s" without saying how to measure one, and the branch flipped between
     four defensible readings; (ii) **every detection on this thread is ESTIMATOR-CONDITIONAL** —
     under the full-window denominator N3 reads 11.0% BELOW its own ceiling (iron: 5.7%), and C7's
     bridge-vs-activity ratios run OPPOSITE on the two arms (0.757 vs 1.357), so the estimator's
     behaviour has no mechanism.
   - **Probe tooling follow-ups (achievable without footage):**
     (i) `gauge-fill.py` without `--bar` self-calibrates onto a dark terrain edge on solo footage
     — always pass `--bar` + the maiden fixture gate (/skill-maintenance candidate);
     (ii) `read-ammo.ts` reads 0/851 frames on text-label HUD ("AMMO / NNN") — needs a text-label
     digit reader path;
     (iii) **filed 2026-08-17 from the cross-family code review (`qwen3.8-max-preview`)** — the FIX
     and both FOLLOW-UPs it raised are already fixed; these remain: `scan.ts`'s fixture writer emits
     fields (`frameT`/`frameFill`, the extended `expected` block) that the `TempoFixture` TYPE does
     not declare, and both consumers bridge with casts — producer and declared type have drifted, so
     a rename would only surface at runtime; `auditElementControl` / `--element-control` in
     `fb-count-matrix.ts` has ZERO vitest coverage and the C1 artifact block it produced is never
     replayed (the reviewer re-ran it manually and reproduced the recorded result exactly), plus it
     matches the long `COMPS` name while the classification world uses the short arm label;
     `ceiling-screen.test.ts` hard-codes three literals (23.618, 38.1, `/ 30`) that are derivable
     from artifacts it already loads — drift risk, not error; a bare `--fixture-out` with no value
     is silently skipped in `scan.ts`.
   - **T1 wind-weak v2 PROCESSED 2026-08-16** — 13 FBs confirmed (scan.ts, 2nd detector
     corroborated), per-unit totals from Battle Records screenshot. Result:
     `docs/probes/misc/t1-wind-weak-v2-result.md`. Confirms the existing "windweak t257 13fb"
     probe; comp remains disabled in regression (sim 11-12 FBs vs measured 13, engine shortfall).
   - **`ein` U8 0.7× team residual** — findings-only (N2); stage1→2 real 33f/32f vs modeled 30f
     (runs AGAINST the gap).
3. **Measure the `trina` burst-amp MAGNITUDE — the last carry-forward of the burst-amp rulings.**
   Recipe (unchanged, but the qualifying set is now exact): popup-read a qualifying all-enemies
   burst nuke cast INSIDE vs OUTSIDE a `trina` Spread Roots window and compare against
   `1 + 4.356` additive-in-Damage-Up. Any comp pairing `trina` with one of `isabel` / `liberalio` /
   `mica` / `noir` / `phantom` / `privaty` / `quency-escape-queen` / `scarlet` /
   `soda-twinkling-bunny` gives it; `cinderella` is NOT a candidate. If the test unit is `novel` or
   another granularity-split unit the same measurement settles amp granularity for free (amped ⇒
   skill-level, unamped ⇒ block-level). The MAGNITUDE half is genuinely footage-gated (only
   popups produce a number); the GRANULARITY half is separately rulable if the owner ever knows
   whether a split-kit unit like `novel` gets both halves amped (offered 2026-08-16, not yet
   answered). Carried out of the now-archived burst-amp handoff.

4. **`takina`'s residual is now BIGGER and unexplained — 0.579 COLD, n=1.** The 2026-08-12 swap
   economy landing (DECISIONS) made her colder, not warmer: the faithful custom weapon fires 12
   uncharged shots where the old estimate fired 7 that inherited her SR ×2.5 `chargeMultiplier`.
   Her swap window is therefore ruled OUT as the explanation. The largest remaining ⚑ in her file is
   the **S2 uptime-average** — `damageTakenPct` 3.36 = 10.09 × 5/15 and ally `trueDamagePct` 93.66 =
   140.49 × 10/15 — where the **15s cooldown is COMMUNITY-sourced (Prydwen), not in the kit prose**.
   If the real cooldown is shorter, both values are under-credited roughly proportionally. Recipe is
   already written in her override caveats: read the real skill2 cooldown + pulse shape from a
   focused `takina` recording and rescale. She has ONE recorded fight (PG iron sweep), so this needs
   footage before anything is changed — evidence-proportionality, not a re-fit.
   **Cheaper substitute (offered to owner 2026-08-16, not yet answered): a cooldown is
   config-independent, so the owner observing her skill-2 pulse rhythm in ANY casual play — no
   scope lock, no recording — replaces the footage ask for the CD value itself** (the pulse
   SHAPE would still benefit from footage, but the CD is the load-bearing number).
   _(Body restored 2026-08-13: nine lines were dropped from this item by the archive commit
   `80c9f041`; recovered verbatim from `d3314ca3`.)_

5. **`neon-blue-ocean` (nbo) ⚑3 — is her swapped burst weapon MULTI-HIT? One recording settles it.**
   The cadence landing itself is SHIPPED (merged as PR #126, 2026-08-16; cross-family
   `/code-review` verdict FIX-BEFORE-MERGE → all 3 FIX findings addressed pre-merge; landing
   record archived to `docs/handoffs/closed/2026-08-16-nbo-swap-cadence-landing.md`).
   The cadence half landed 2026-08-16 (DECISIONS): her burst weapon fires at its datamined 1.5
   shots/s, not her MG wind-up ladder, and the engine's `swapLeavesMgLadder` gate makes a swap
   cadence readable on an MG-base unit at all. What that exposed is the open part: at 1.5 shots/s a
   lone 33%-of-final-ATK shot is LESS throughput than simply holding her MG, so her burst currently
   COSTS her damage — implausible for a burst skill, and pinned in that direction on purpose by
   `scripts/tests/units/neon-blue-ocean.test.ts` (N3) so a fix has to flip it deliberately. Likely
   resolution: the swapped weapon fires several hits per pull (90 rpm is exactly the SG class rate,
   and an SG-shaped 10-pellet reading lands her near her own base-MG throughput). NOT enactable
   from the tree — shot `1001402`'s spec does not ship in `characters.json`, so `weapon: 'SG'` /
   `pelletCount` would be a second inference on top of the first. Corroborating signal that
   something is still missing in the "too weak" direction: after the cadence landing the community
   comparison reads Δ **+5 / +7** (sim ranks her slightly BELOW the community lists), where it read
   −47 / −50 before. **RECIPE:** one isolated nbo-solo scope-lock recording — count rounds fired
   inside a single 7s burst window and watch the ammo counter. That settles cadence, hits-per-pull
   and belt size in one go. Sizing arm: `npx tsx scripts/battery/nbo-swap-cadence-ab.ts`.
