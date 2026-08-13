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
> **Last audited 2026-08-09** — every claim below was re-verified against the tree (branch merge
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

1. **The archived faithfulness sweep's `Recorded, not applied` residue — 46 per-unit items, 33 of
   them actionable.** The eight batch docs were archived on 2026-08-13 as historical records, but
   each ends with a `## Recorded, not applied (per-unit follow-ups)` section, and NOTHING pointed at
   them. They live in `docs/handoffs/closed/2026-08-10-faithfulness-batch{1..8}-findings.md` (the
   archive is gitignored, so it is **per-worktree**: the 2026-08-13 archive `mv` ran in
   `nikke-sim-wt-combined`, and the docs were copied into the main tree's `closed/` on 2026-08-13
   so this pointer resolves there too; `grep -A40 "Recorded, not applied"` over that glob
   reproduces the full list). 13 of the 46 say "clean beyond prose" and need nothing. The other 33
   fell into four classes — none a board emergency, all cheap in isolation:
   - ~~**Note-hygiene rewrites**~~ **DONE 2026-08-13** (prose only; every edited override is
     byte-identical once `note`/`caveats` are stripped). `isabel`, `soda-twinkling-bunny` and
     `elegg` were rewritten to the current model, and `exia`'s spec header X3 comment corrected —
     it claimed `"Fixed at"` clamp semantics are NOT encoded, but `reloadSpeedClamp` is a real stat
     that `effectiveReloadFrames()` prefers over additive `reloadSpeedPct`. Two of the six needed
     NOTHING, and the batch docs were stale on both: `frima`'s bare `sim.ts:<line>` citations were
     already swept (`scripts/sweep-line-citations.ts --check` reports 0 in scope), and `signal`'s
     SMG uptime arithmetic already reads the effective 20 hits/s. Two falsified live claims fell
     out of the pass and are fixed: `isabel` was the **only** override still asserting the global
     `DOT_CRIT` default is OFF (it flipped OFF→ON 2026-07-21), and her note contradicted its own
     opening on whether the SG core bands are HR-contaminated (they are not — her read is what
     proved them clean; the live SG lever is LANDING at range, U27).
   - **Measurement-gated ⚑ — TWO still open, not nine (re-verified 2026-08-13).** The batch docs
     are dated 2026-08-10 and the **2026-08-11 M-list triage (`ae7fba26`) overtook most of them**,
     so this list read as nine open recording asks when seven were already settled. Verified
     per-unit against enactment commits and the overrides themselves, not against the batch docs:
     - **`noir` — OPEN.** The reload tension (recon ~0.6–0.9s vs datamined 62f ≈ 1.03s). Folded
       into the ongoing SG investigation per owner direction (M7) and cross-referenced from the SG
       owner-ask doc §5b: she is the SG-landing anchor, so the same footage serves both.
     - ~~`chisato`~~ **CLOSED 2026-08-13 by owner ruling — it was never a footage question.** True
       damage is a FLAVOR like pierce and does not change the damage's properties, so a WEAPON
       dealing true damage crits AND cores, while a SKILL dealing true damage crits but never
       cores. The engine already conformed by two independent paths, so this closed as CONFORMANT
       with **no code change**; the fragile half (nothing stopped a future override from authoring
       a `coreRate` on a true-flavored skill effect) is now pinned in
       `scripts/tests/true-damage-flavor-guard.test.ts`. General ruling — it governs every
       `trueFlavor` swap, not just hers. → DECISIONS 2026-08-13.
     - CLOSED by enactment: `ada` (maxShots 1 — the kit-literal reading won), `prika` (Pierce),
       `rouge` (M10 coin CO-EXISTENCE, which turned out to be a model defect, not a measurement),
       all in `de84bbd4`; `ade-agent-bunny` by the M6 ruling that stacks REFRESH unless a kit says
       otherwise (`e4d305f9`) — that was exactly the counterfactual batch 8 wanted ruled out.
     - CLOSED by refutation: **`guillotine-winter-slayer`'s "~26% hot" was refuted three ways**
       (M1). Her board reads 1.0238, inside ±3%; the figure traced to two old unit-level readings
       from another context, and `12 / 1.26 ≈ 9.5/s` was an arithmetic coincidence promoted to a
       suspect. Do not re-open it from the batch-8 wording.
     - HELD, not open: `mint` (M12 confirmed the shipped `singing` model; her solo magnitudes stay
       unanchored **by disposition**).
     - **`mihara-bonding-chain` — the recorded ruling was BACKWARDS, corrected 2026-08-13.** Her
       file (and this queue, until now) said "do not turn the 12-stack average without a
       measurement". The owner's actual ruling is the opposite: **do NOT use the average stacks —
       build/use a primitive for her.** Worse, the primitive already existed and was built FOR HER:
       `types.ts` documents a resource-scaled DoT naming her Ensnaring, and `sim.ts`'s dot tick
       recomputes `atkPct = resources[name] × mult` with the comment "(mihara Ensnaring)" — and
       **zero** overrides used it. The engine half landed; the override was never migrated.
       **LANDED 2026-08-13** together with item 6. Her Ensnaring is now a live
       `resources.ensnaring` [0..20] pool driving a `perResource` DoT; no fitted stack number
       remains. **She is now FIT-EXPOSED and that is the open follow-up:** 1.034 → 1.179 HOT on 2
       graded comps (board ±5% 14→13, ±8% 25→24), full-burst count UNCHANGED at 11 vs measured 11,
       so it is magnitude and not rotation. The retired 12-stack average sat BELOW what the kit's
       own generation produces (~13.4 time-average), so removing it revealed an over-model
       elsewhere in her kit — LOCALIZE that; do not restore the average. Same class as item 5
       (`snow-white-heavy-arms`). Note the earlier hypothesis that item 6 explained her heat was
       WRONG and is recorded as such: the fix moved her only 1.182 → 1.179, because her pool is
       cap-bound and the 20 ceiling absorbs the over-generation.
       `takina`'s is item 4 below and is still open.
   - **Held primitives, logged not built** (F11 discipline — one carrier each): `moran` S1
     DEF ▲/stack, `maxwell` `byFinalAtk`, `helm`'s held tag. Leave held; the log is the point.
   - **Encode-consistency candidates**: `anis` and `mica` both keep an `attacked`-N line unmodeled
     on "nothing feeds the trigger" grounds. Same call, so decide them together, not one at a time.

2. **The burst-gauge ECONOMY cluster still wants its one batched `/scientific-method` pass** — the
   only thread from the 2026-08-10 faithfulness sweep that is still open, and it had fallen off this
   queue entirely (found 2026-08-13 while archiving that sweep's handoffs). It stays in
   [2026-08-10-gauge-economy-findings.md](2026-08-10-gauge-economy-findings.md), which is
   deliberately NOT archived. Four measured items to land TOGETHER, because their directions
   partially cancel (compensating-errors rule): (a) the charge-B3 fill-tempo channel — success
   criterion is the 4 disabled comps' measured FB counts, re-enabled; (b) reproduce-then-fix the
   double-emit log entry (gauge-DOWN); (c) the U28 rider encoding fix so both encodings emit
   identically (gauge-UP); (d) source the focus multiplier from `characters.json.chargeMultiplier`
   with the gauge row as an explicit override, plus a validator lint. A/B the FULL measured timeline.

3. **Measure the `trina` burst-amp MAGNITUDE — the last carry-forward of the burst-amp rulings.**
   Recipe (unchanged, but the qualifying set is now exact): popup-read a qualifying all-enemies
   burst nuke cast INSIDE vs OUTSIDE a `trina` Spread Roots window and compare against
   `1 + 4.356` additive-in-Damage-Up. Any comp pairing `trina` with one of `isabel` / `liberalio` /
   `mica` / `noir` / `phantom` / `privaty` / `quency-escape-queen` / `scarlet` /
   `soda-twinkling-bunny` gives it; `cinderella` is NOT a candidate. If the test unit is `novel` or
   another granularity-split unit the same measurement settles amp granularity for free (amped ⇒
   skill-level, unamped ⇒ block-level). Footage-gated; carried out of the now-archived burst-amp
   handoff.

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
   _(Body restored 2026-08-13: nine lines were dropped from this item by the archive commit
   `80c9f041`; recovered verbatim from `d3314ca3`.)_

5. **`snow-white-heavy-arms` is FIT-EXPOSED by the stage-entry correction — re-tune, do not
   re-fudge.** The 2026-08-13 ruling (DECISIONS) re-times "entering Burst Stage N" to the chain's
   stage TRANSITION, one step ahead of the stage-N cast. Her S2 ATK ▲73.92%/10s rides exactly that
   trigger, and her magnitudes were hand-tuned against the old cast-frame timing, so she moved
   0.954 → 0.946 (n=4) and crossed the ±5% band into ±8% — the board's only band movement from that
   change. Same class as the 2026-07-21 rotation-fix exposure: the fix is right, the unit's fit was
   standing on the bug. Re-tune her against her existing recordings; do NOT restore the old timing.

6. **DONE 2026-08-13 — the option landed; 16 carriers remain UNMIGRATED, which is the open part.**
   `countScope?: 'always' | 'gated'` on the hitCount trigger; `'gated'` accrues only while the
   block's own gates pass (reuses `blockGatesPass`, so it honours every gate, not just `fbGate`).
   Default `'always'` keeps the roster byte-identical — the block shape cannot distinguish the two
   kit readings, only the WORDING can, so migration is authored per unit. Migrated 2 of 24 gated
   blocks: `velvet` ×2 and `mihara-bonding-chain`. **Still to triage, one kit-wording read each:**
   `asuka-wille`, `elegg`, `guillotine`, `guillotine-winter-slayer`, `kurumi`,
   `laplace-ultimate-hero`, `marciana-marine-study`, `mica-snow-buddy`, `modernia`, `moran`,
   `power`, `privaty-unkind-maid`, `rei-ayanami-tentative-name`, `rem`, `rouge`. The test to apply:
   does the kit scope the COUNTING ("landing N normal attack(s) **during X**") or only the EFFECT
   ("every N normal attacks, [effect] during X")? Only the former takes `'gated'`.
   _Original entry, kept for the shape of the defect:_ The
   trigger's counter accrues on EVERY normal attack and the gate (`fbGate` etc.) is applied at
   FIRING time, so a threshold crossing that the gate blocks still SPENDS its N. For a kit line
   worded "landing 50 normal attack(s) **during Full Burst**", out-of-FB attacks should not advance
   the counter at all. Measured divergence on velvet: the two readings converge where gated shots
   dominate (55 procs vs the in-FB-only 54) and part company at low volume (1 vs 0 in her off-B2
   fixture); both counts are pinned in `scripts/tests/units/velvet.test.ts` so it cannot drift
   silently. Fix shape: a count-scope option on the trigger (count only while the gate passes).
   Cross-cutting across every hitCount carrier ⇒ needs its own blast-radius pass, which is why it
   was filed rather than made.
