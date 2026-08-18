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
> **Last audited 2026-08-17** — every claim below was re-verified against the tree (branch merge
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

> **NEXT UP — UNBLOCKED AND ORDERED (refreshed 2026-08-18).** Every item here is
> footage-FREE: it runs against footage or fixtures ALREADY on disk, with instruments that already
> exist. Take them top-down. The numbered threads below stay as the reference detail and are
> mostly footage-gated — do NOT start there.
>
> **1. `anis-star` pre-register re-run (thread 2).** The source-hunt narrowed the anomaly to
> gauge-specific excess (identical 480,330 increment across 3 windows). Candidate hypothesis to
> pre-register: anomalous pulls credit one extra `basePerTrigger` 140 × 2.5 focus × 1.06 aura =
> 3.71%. Build a packet that declares this BEFORE the counting rule runs, so anomalous windows
> become CLASSIFIABLE instead of premise-violating. Gated re-run, not new footage.
>
> **2. N2 blocker 2 — pin the conversion rule numerically.** The "ALREADY-PRE-COMMITTED
> conversion rule" is post-hoc (23 min after the verdict) and has undefined terms. Pin it
> numerically BEFORE computing the new control's residual. See the N2 handoff
> (`docs/handoffs/2026-08-17-n2-second-control-premise-gate.md`).
>
> **3. N1c — owner ruling wanted (cheap, no work attached).** The 2-of-2 split turned on one
> question: may an out-of-sample recording's E1 window carry a `clause 1(ii)` counting leg when
> the same packet has demoted that recording's E1 as already-on-record and non-falsifying?
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
> Also unblocked but lower value: `mihara-bonding-chain`'s fit exposure (thread 1 — localize the
> over-model, do not restore the 12-stack average); the clean-bin-time vs full-window denominator
> settlement against a known-ground-truth fixture (turns the standing MAR caveat into a measured bias
> bound); and the batched `cinderella`/`eve`/`julia` `gaugeHits` census rows — findings-only, and the
> 2026-08-17 run gives NO support for crediting them at full value.

1. **Faithfulness sweep residue** (batch docs archived 2026-08-13 in
   `docs/handoffs/closed/2026-08-10-faithfulness-batch{1..8}-findings.md`). Most items closed by
   enactment, refutation, or owner ruling (2026-08-11 M-list triage + 2026-08-13 corrections).
   Open:
   - **`mihara-bonding-chain` — LOCALIZED v2 (2026-08-17).** Over-model in the **stack count**
     (sustainedDamagePct correctly implemented — owner confirmed). Burst DoT's fixed 1001%/s
     assumes 20 stacks; if real pool averages ~16, total drops ~9.3%. Settling: popup-read
     Ensnaring DoT ticks, or owner ruling on whether pool always reaches 20.
     **→ [mihara-overmodel-localization-2026-08-17.json](../probe-data/mihara-overmodel-localization-2026-08-17.json)**
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
   - **Probe tooling — `read-ammo.ts`** reads 0/851 frames on text-label HUD ("AMMO / NNN") —
     needs a text-label digit reader path.
   - **`scan.ts` `--debug-dir` (~line 184)** has the bare-flag-silently-skipped pattern fixed
     for `--fixture-out`; left alone because absence is genuinely optional — owner call.
   - **`--gauge-sources` census under-counts** gaugeHits sub-hits (LIVE on N5 snowwhite-HA
     fire); census purpose is path verification not total counting — owner call whether to fix.
     → `n6-gaugehits-blindness-audit-2026-08-17.json`
   - **T1 wind-weak v2 PROCESSED 2026-08-16** — 13 FBs confirmed (scan.ts, 2nd detector
     corroborated), per-unit totals from Battle Records screenshot. Result:
     `docs/probes/misc/t1-wind-weak-v2-result.md`. Confirms the existing "windweak t257 13fb"
     probe; comp remains disabled in regression (sim 11-12 FBs vs measured 13, engine shortfall).
   - **`ein` U8 0.7× team residual** — findings-only (N2); stage1→2 real 33f/32f vs modeled 30f
     (runs AGAINST the gap).

3. **`takina`'s residual is now BIGGER and unexplained — 0.579 COLD, n=1.** The 2026-08-12 swap
   economy landing (DECISIONS) made her colder, not warmer: the faithful custom weapon fires 12
   uncharged shots where the old estimate fired 7 that inherited her SR ×2.5 `chargeMultiplier`.
   Her swap window is therefore ruled OUT as the explanation. The largest remaining ⚑ in her file is
   the **S2 uptime-average** — `damageTakenPct` 3.36 = 10.09 × 5/15 and ally `trueDamagePct` 93.66 =
   140.49 × 10/15 — where the **15s cooldown is now OWNER-CONFIRMED by in-game test (2026-08-17)**.
   The community-sourced value was correct, so the S2-CD hypothesis is REFUTED — the 0.579 cold
   residual must have a different source. She has ONE recorded fight (PG iron sweep), so further
   diagnosis needs footage before anything is changed — evidence-proportionality, not a re-fit.
   _(Body restored 2026-08-13: nine lines were dropped from this item by the archive commit
   `80c9f041`; recovered verbatim from `d3314ca3`.)_

4. **`neon-blue-ocean` (nbo) ⚑3 — is her swapped burst weapon MULTI-HIT? One recording settles it.**
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
   **AWAITING FOOTAGE** (owner does not own nbo; requested from a friend, 2026-08-17).
