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
> **Last audited 2026-08-18** — every claim below was re-verified against the tree (branch merge
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

> **Autonomous queue — empty as of 2026-08-18.** The lower-value notes below are not ordered work;
> take them only if the owner adds one to the queue. The numbered threads below stay as reference
> detail and are mostly footage-gated — do NOT start there.
>
> _Empty as of 2026-08-18 — all unblocked items landed or archived to `docs/handoffs/closed/`._
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
   - **Batched `gaugeHits` follow-up (findings-only, small):** `cinderella` (burst, N=10),
     `eve` (burst, N=6), `julia` (burst, N=5) also aggregate a multi-hit without `gaugeHits`. All
     once-per-cast, so none can carry the FB shortfall — and the 2026-08-17 run gives no support for
     crediting them at full value either.
   - Second, lower priority: settle
     the clean-bin-time vs full-window denominator on a fixture with known ground truth, which would
     turn the standing MAR caveat into a measured bias bound — every detection in this thread is
     currently estimator-conditional.
   - **Third-arm follow-up (i):** future packets must **PIN A CONTROL'S ESTIMATOR**, not just its
     tolerance — C2 bound on "FB duration 15.0 ± 0.5s" without saying how to measure one, and the
     branch flipped between four defensible readings.
   - **Third-arm follow-up (ii):** every detection on this thread is **ESTIMATOR-CONDITIONAL** —
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
