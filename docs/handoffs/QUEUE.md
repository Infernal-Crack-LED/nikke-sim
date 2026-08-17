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
   - **Third classification arm — FOOTAGE ASK RETIRED 2026-08-17, run is GATED-PENDING.** The
     judge-ranked step (4) "a third comp with a non-vacuous ceiling" needs no recording:
     `N3 scarlet/liberalio iron` screens **non-vacuous at 5.13/s** (vs iron's 3.59; every other
     comp saturates the 30/s bin cap) and its recording already exists and reads —
     `docs/probes/714 noon/3.mp4`, team bar locking at the documented 134px geometry. Screen +
     verdicts: `docs/probe-data/ceiling-screen-2026-08-17.json`, pin
     `scripts/tests/probe/ceiling-screen.test.ts`, subcommand
     `fill-trace-compare.ts ceiling --schedule <json>`. **Next step is a `/scientific-method`
     pre-op packet** pre-registering the arm, window map, thresholds and decision branches — the
     classification itself is the gated surface, not the feasibility. (`misc B3s` SG fence also
     lifted, by commit `a4d08e19`, but that arm is cap-saturated at 94.5/s and stays unusable;
     `N5 snowwhite-HA fire` is non-vacuous at 15.87/s but too low-power to be a peer candidate.)
     **Two premise corrections from the step-0 gate (2026-08-17), both binding on that packet:**
     (i) N3 reads **9 sim vs 10 measured**, NOT 10 vs 10 — it carries a −1 FB gap of the same sign
     as the other `liberalio`-seated disabled comps, so "independent, no rotation gap" is NOT a
     property it has; (ii) N3 and iron sweep (run G) **both seat `liberalio`**, so they are not
     roster-independent arms and a shared-unit confound has to be addressed in the packet.
   - **Probe tooling follow-ups (achievable without footage):**
     (i) `gauge-fill.py` without `--bar` self-calibrates onto a dark terrain edge on solo footage
     — always pass `--bar` + the maiden fixture gate (/skill-maintenance candidate);
     (ii) `read-ammo.ts` reads 0/851 frames on text-label HUD ("AMMO / NNN") — needs a text-label
     digit reader path.
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
