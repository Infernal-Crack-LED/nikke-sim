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
> **Last audited 2026-08-02** — every claim below was re-verified against the tree (branch merge
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

1. _(empty — owner fills)_

### Open action items (pointers — attended sessions)

#### Code / tooling (unblocked, no footage or owner ruling needed)

- **⇒ Unit-card infographic follow-ups (3, code-verified still open 2026-08-02):**
  1. **No vector source for burst icons.** `web/public/nikke-icons/burst_*` is webp-only (~100px native)
     — fine at every size drawn today, but a surface wanting it large has nothing to rasterize from.
  2. **`UnitCardSources.prerelease` is still never set.** `src/infographics/core/unitCard.ts` branches on
     it (`:306`, `:734` `PROJECTION`, `:766`, `:816`) and `unitCardData.ts:722` reads `src.prerelease`,
     but neither `scripts/lib/unit-card-sources.ts` nor `web/src/unitCardShare.ts` mentions it — an
     unreleased unit renders as fully live, with a null `releaseDate` the only tell. Wire it or drop the
     dead branch.
  3. **The browser icon loader still probes extensions and eats 404s** — `web/src/unitCardShare.ts:58`
     `ICON_EXT = ['svg','png','webp']` per icon via onload/onerror. The icon set is static and tracked,
     so the extension is knowable at build time; carry it in the `iconNames` mapping (`{ name, ext }`).
- **⇒ `scripts/tests/fixtures/unit-card-sources.json` is BADLY STALE — owner call, findings-only
  (2026-08-03).** It is a deliberately FROZEN join input, so the crown-card golden stays a pure
  function of the renderer rather than of board data — that design is sound and is not the issue.
  The issue is how far it has drifted: frozen 2026-08-02 at 76 rows / 71 units against a live 91 / 85,
  with **64 generic and 70 typed shared rows differing in value**, some hugely (`anis-star` generic
  59.4 → 33.4 and typed 99.7 → 61.4; `arcana` typed 93.9 → 169.1; `mast-romantic-maid` 61 → 77.2).
  All of that is already on `main` and invisible to the golden. Nothing is broken and the gate is
  green, so this is not urgent — but a refresh wants its own deliberate pass (new golden PNGs, reviewed
  for renderer-visible change) rather than riding along with an unrelated board edit, which is exactly
  the "data churn wearing renderer drift's clothes" the fixture's own header warns about.
  ⚠ Two traps when measuring the drift: the live artifact is gitignored, so compare only after
  `npm run ranks:buffer`; and its cells are TUPLES (`[slug, value, tags, profile]`), not objects — read
  them as `c.slug` / `c.value` and every comparison silently comes back "0 differing".
- **⇒ Three closed handoffs are still git-TRACKED, against the convention — leave or untrack?
  (2026-08-03, findings-only).** Archiving a doc untracks it (procedure: `docs/CONVENTIONS.md` →
  Doc hygiene), and 69 of the 72 files in `docs/handoffs/closed/` follow that. The three that do not —
  `2026-07-27-focus-charge-gauge-per-unit.md`, `2026-07-29-alice-focus-gauge-implement.md`,
  `2026-07-29-cinderella-focus-gauge-owner-override.md` — are each cited by NAME from
  `docs/DECISIONS.md` or `docs/handoffs/scientific-method-harness.md`, so untracking them turns
  live citations in the immutable provenance trail into dangling pointers for anyone who clones.
  Not enacted for that reason. If they should go, the citations want rewording first.
- **⇒ Pellet-reader: cherry-pick the `+62.5` crosshair-offset fix (`b69b5c6`)** — verified NOT an
  ancestor of `main`; `scripts/probe/read-pellets.ts:66` still defaults `-62.5`, latent, and poisons the
  next run. (It did **not** cause the 2026-07-29 REJECT: artifacts 12:19–13:33, commit 15:17.)
- **⇒ REVIEW `maxwell` (+28.3%) AND `alice` (+18.3%) AFTER THE NO-OP LOW-ATK STANDARDIZATION**
  (2026-08-02, DECISIONS). These two moved far more than the other carriers (`n102` +9.6%, `naga`
  +0.8%, other 8 byte-identical — owner ruling: those are fine as-is, review only these two).
  Re-measure any time with `npx tsx scripts/noop-basis-ab.ts` (deterministic, prints all 12).
  **What to check:** the jump means a self-includable `alliesTopAtk` buff that used to be spent on a
  control now resolves to the tested unit itself. For each of the two, read the kit line behind the
  selector and answer:
  1. Is the buff genuinely SELF-APPLICABLE per kit text, or does it need `excludeSelf` the way
     `chime`/`avistar` did (DECISIONS 2026-08-02, the king-maker ruling directly above this one)?
     A self-buff that the kit means for an ally is now inflating the Solo row by the full delta.
  2. Is the magnitude plausible for the buff's stated value? +28.3% on `maxwell` from one selector
     flip is large enough to be worth arithmetic, not just a plausibility read.
  3. Their board/graded readings did NOT move (regression snapshots all stable), so this is a
     Solo-framework/DPS-chart question only — do not re-tune the override off the board.
     ⚠ Exact slugs: `maxwell` (SR/Iron), NOT `maxwell-ordinary-mechanic`; `alice` (SR/Fire), NOT
     `alice-wonderland-bunny`. The variants do not carry an ally-ATK selector.

#### Engine / model threads (measurement- or owner-gated)

- **⇒ `noop-rouge-b1` squad layering — owner call (2026-08-03).**
  `src/data/squads.ts:26` carries one synthetic (`'noop-rouge-b1': 'Blanc Noir Rouge'`) so the buffer
  board's `w/ Rouge` duo profile satisfies `blanc`'s same-squad burst-CDR gate — a ranks-layer concern
  written into a game-truth file. Three findings frame the cost/benefit:
  1. **The existing guard BITES, verified empirically.** Commenting the entry out fails
     `scripts/tests/ranks/buffer.test.ts:427` (`expected 3 to be greater than 3`); the gate closing
     costs `blanc` 5 burst casts and ~23 percentage points (registered: 8 casts / +20.93%;
     unregistered: 3 casts / −2.02%). A migration that leaves the synthetic unregistered cannot pass.
  2. **The import-order hazard is not test-coverable, in principle.** `buffer.ts` is the only module
     that ever puts the synthetic on a team and it imports `noop.ts`, so the "sims blanc without the
     registration side effect" path does not exist to be tested — and any test reading
     `DUO_BUFFER_PROFILES` must import `buffer.ts`, firing the very side effect it would check for.
     So registering from the ranks layer relocates the violation into a hazard no test can catch.
  3. **The blast radius is ONE SHIPPED ROW.** The `w/ Rouge` row is published (+20.9% against her
     +7.9% plain), so the synthetic is load-bearing for a real board row, not decoration.
  - **Where that leaves the three options.** Leaving it alone stays defensible — the guard in (1) is
    strong and the entry already carries an explanatory comment. Registering from the ranks layer is
    still the trap, and (2) is structural: it does not get safer as the board grows. Carrying squad
    membership on the prepared unit is the only option that actually fixes the layering, and it has
    the better case now that the row ships — but it touches the engine's block filter, a protected
    path, so it needs an explicit owner go-ahead before anyone builds it.
    ⚠ Whichever option is chosen, `src/skills/overrides/noir.json` (`note`, `caveats`) also references
    the synthetic and is CURRENT-STATE prose — update it or it ships a stale claim.
  - Cheap improvement available regardless: a reciprocal pointer in `src/ranks/buffer.ts` near `:164`
    noting that registration lives in `src/data/squads.ts`, so the coupling is discoverable both ways.
- **⇒ BUFFER BOARD: the no-op B1's 7s team CDR is NOT LOADED on this board — owner decision, findings
  only (2026-08-03).** `scripts/build-bufferchart.ts:51` loads overrides for roster slugs only, and
  the synthetic controls are not roster entries, so `src/skills/overrides/noop-b1-ar.json` is never
  read and the buffer board has **never** applied the 7s normalization its own methodology doc
  claims. Every sibling board does load it — `build-burstgen.ts:48`, `build-b1b2dps.ts:56`,
  `build-sustain.ts:46` (B3 only) — added in `c044fcbd` on 2026-07-27, the day AFTER the buffer board
  was written (`91f53ea9`), and never backported. The B3 control's mock-burst override
  (`noop-b3-mg`) is missing here for the same reason.
  - **Measured cost of closing the gap** (`npx tsx scripts/probe/buffer-rotation-audit.ts
--noop-cdr`): a large two-way re-rank, not a correction. Gains: `chime` +12.5, `grave` +10.9,
    `mint` +8.5, `maxwell-ordinary-mechanic` +7.1, `crown` +6.6, `ade-agent-bunny` +6.5, `helm` +6.5.
    Losses: `label` −12.2, `miranda` −9.8, `liter` −8.7, `exia` −8.2, `little-mermaid` −8.0,
    `n102` −7.9, `moran` −7.8, `emma-tactical-upgrade` −7.6, `d-killer-wife` −7.4. `dorothy` goes to
    exactly 0.00.
  - **The owner's proposed rule — disable the no-op CDR when the tested unit already has CDR — does
    not isolate what it is aiming at.** All 13 units carrying their own `burstCdr` do lose value when
    the control CDR is added (liter −8.7, little-mermaid −8.0, moran −7.8, dorothy −6.5; only `prika`
    gains, +3.2), which is the redundancy the rule targets. But the cause is the BASELINE speeding up
    (a B1 baseline goes 8 → 11 Full Bursts), and that hits units with NO CDR just as hard — `label`
    −12.2 and `miranda` −9.8 are the two largest losses on the board. Conditioning on the tested
    unit's kit therefore treats a symptom that is not specific to it.
  - DECIDE between three coherent end states: (a) leave the control CDR off on this board and correct
    `docs/data/rank-boards.md`, which claims it is on — nothing else moves; (b) load the controls to
    match the sibling boards and apply the conditional disable, which moves only the non-CDR units
    versus today; (c) load them unconditionally, matching the documented methodology, and accept the
    full two-way re-rank above. Also fold in `noop-b3-mg` either way.

- **⇒ BUFFER BOARD: long burst cooldowns are handled three different ways — one owner decision,
  findings only (2026-08-03).** The board inserts the tested unit against a no-op filler that bursts
  every 20s (`NOOP_B2`, `src/dpschart/noop.ts:130`), so a longer-cooldown unit holds up the team's
  Full Burst chain and pays for the Full Bursts the baseline gets and it does not. **16 tested units
  are affected — 8 B1 and 8 B2.** Audit:
  `npx tsx scripts/probe/buffer-rotation-audit.ts` (self-validating: every shipped value is checked
  against `bufferValueFor`, the board's own path).
  - **B2 (8 units): no compensation at all** — `assemble` gives `[NOOP_B1, tested, carry, carry]`
    (`src/ranks/buffer.ts:321`). 5 Full Bursts against the baseline's 9 (3 for blanc at 60s). This
    is NOT a regression: that shape is unchanged since the board's first commit (`91f53ea9`).
  - **B1 (8 units): compensated by a device that removes the rotation entirely** — a >20s B1 gets a
    second no-op B1 _instead of_ the B2 (`buffer.ts:315`), leaving the team with no B2, so the chain
    can never complete: **0 Full Bursts, both sides, all 180s**. Their own burst still casts, so
    burst buffs apply, but every Full-Burst-gated line is dead (moran's `fullBurstEnter` trigger,
    for one) and no buff is ever valued inside a Full Burst window.
  - **The pairing that WOULD fix it already exists on another board** — `src/ranks/b1b2dps.ts:59`
    `B2_TEAM = [NOOP_B1, NOOP_B2, NOOP_B3_RL, NOOP_B3]` keeps a no-op in the tested unit's own
    stage (pinned, `scripts/tests/ranks/b1b2dps.test.ts:104`). The buffer board never adopted it.
  - **Nothing pins any of this**: `scripts/tests/ranks/buffer.test.ts:35` pins the B1 filler rule
    itself, but no test covers the B2 team shape or any Full Burst count on this board.
  - **Measured effect of pairing** (hypothetical, board unchanged): `flora` 14.8→24.1, `prika`
    17.4→42.4, `anchor-innocent-maid` 8.3→26.2, `mast-romantic-maid` 61.0→77.3, `delta-ninja-thief`
    3.1→15.5, `arcana` (RL/Electric, NOT `arcana-fortune-mate`) −0.4→13.0, `biscuit` −7.7→+1.0,
    `blanc` −3.4→+7.5. The 20s controls also move (`crown` 75.4→71.6, `liter` 26.5→35.3) because the
    extra filler changes their baseline too — a fix re-ranks the whole board, it is not a patch on
    16 rows.
  - **Note the knock-on**: `blanc` is hard-excluded from the board for reading negative
    (`EXCLUDED_BUFFER_SLUGS`), and `biscuit` / `arcana` are two of the negative rows the leaderboard
    now trims — all three go positive once the rotation is matched. The negatives are substantially
    an artifact of this, and the display trim is treating the symptom.
  - **OWNER SPEC (2026-08-03) — the board was built without it.** Standard team is FIVE slots:
    1 no-op B1 (SR, 20s, **7.5s** CDR), 2 no-op B2 (SR, 20s), 3 no-op B2 (SR, 20s) ← **the tested
    unit replaces slot 3**, 4 no-op B3 (MG, 40s), 5 no-op B3 (RL, 40s); a tested B3 has its burst
    turned off so its own damage cannot poison its support rank. The spare same-stage no-op is what
    keeps a 40s unit from lowering the team's Full Burst count.
  - **⚠ ORDERING TRAP — do not implement slot 3 literally.** Burst-stage contests are won by slot
    order, so a tested unit sitting BEHIND a same-stage no-op stops bursting: tested B2 in slot 3
    casts **1** burst in 180s (flora 24.05%→4.51%, crown 71.58%→41.81%) and a tested B1 behind the
    slot-1 no-op B1 casts **0** (liter 26.53%→1.13%). The spec's intent needs the tested unit FIRST
    in its own stage with the spare no-op behind it — `[tested, noopB1, noopB2, mg, rl]` for a B1,
    `[noopB1, tested, noopB2, mg, rl]` for a B2. That shape delivers the requirement: B2s reach FB
    parity (flora/prika/blanc/biscuit all 9v9). B1s mostly do (liter/moran 10v9 on their own CDR)
    but a 40s B1 still lands 8v9 — a 1-FB residual, versus today's 9-FB wipeout.
  - **Also divergent from the spec, needs an owner call before implementing:** slot 1 is
    `noop-b1-ar` — an **AR**, not an SR — and its CDR is **7s**, not 7.5s
    (`src/skills/overrides/noop-b1-ar.json`). That control is SHARED with the burst-gen, sustain,
    B1/B2 DPS and DPS-chart Solo boards, and `src/dpschart/noop.ts:10` pins the set byte-identical
    so those boards do not shift — changing it re-ranks four other boards. Buffer-local SR B1, or
    change the shared control? Separately, "tested B3's burst is off" is today achieved positionally
    (rightmost so the carries win stage 3), not by a flag: `cfg.disableBursts` is team-wide and
    `UnitOptions` has no per-unit equivalent.
- **⇒ ENGINE REGRESSION FULL-BURST COUNT FAILURES — four comps disabled in `scripts/regression.ts`**
  (`:106`, `:131`, `:158`, `:236`): `iron sweep (run G)`, `T5 wind-weak`, `T1 wind-weak`,
  `N3 scarlet/liberalio iron` each read 1–3 Full Bursts short of their video-measured counts on clean
  `HEAD`, skipped via the `disabled` flag so `verify.sh` stays green. Same family as **U29**/**U31**;
  re-enable once the shortfall is fixed.
- **⇒ ENGINE-WORK ORDER (read FIRST before resuming per-kit retunes)** — remaining engine work ranked by
  BLAST RADIUS: items that change the shared math every override is calibrated against come before
  per-unit retunes (a retune done first has to be redone). Still open:
  1. Score the `CONE_DELTA` holdouts + the revert-trigger check.
  2. Accuracy-circle geometry — 3 owner rulings open (the `k,c` range measurement is CLOSED as
     unobtainable; do not re-open).
  3. **5e state machines** — the target-status gate half landed 2026-07-23, and its "same machinery for
     all four" rationale was REFUTED by the premise gate (DATAMINED kit text, complete 4-of-4 census).
     The registry is NECESSARY for all four but SUFFICIENT only for `privaty` (closed). Three separate
     builds remain: `mint` a timerless memoryful XOR toggle; `prika` a cross-unit status event bus +
     in-flight duration mutation; `milk-blooming-bunny` a **reload-count-scoped stat CLAMP** (also the
     `docs/engine-modeling-gaps.md` §1b LOCK gap — NOT a timed window). Do not re-attempt them on the
     registry alone.
  4. **`FBRULE=perkit` default flip** — `privaty` was the roster's LAST `noFb` carrier, so `perkit` is
     now behaviourally identical to `timing` for every unit and the promised flip is provably a no-op.
     NOT taken — engine default, owner-gated; queued.
  5. **U28** — `extraHitDamagePct` vs `flatDamage` gauge + flavor asymmetry.
- **⇒ EMILIA `hitRepeat` PRIMITIVE — AUTHORIZED 2026-08-03, IN FLIGHT on `kit/emilia-hitrepeat`**
  (worktree `../nikke-sim-wt-emilia`). `emilia` is the roster's only live NO-GO(engine-core): S2
  "Fixed Damage to the main body = 58.99% of the damage dealt by self" is a %-of-hit repeat
  (`docs/data/nikke-damage-formula.md` §3) — load-bearing (fires every full charge), in-domain, and no
  `src/` primitive scales a rider off the parent hit's final damage; omitting is a forced weakening and
  folding it into `chargeDamagePct` is a fudge (function damage never cores). The other six kit lines
  are fully pre-encoded + the primitive spec (pct-of-parent final damage, never-core / never-range
  function damage inheriting parent crit/element/Damage-Up/FB; secondaries: negative `chargeSpeedPct`
  — today clamped `[0,100]` so her burst's Charge Speed ▼300% over-credits when omitted — and a
  live-`maxAmmo()`-scaled buff source) is in `scripts/kit-autonomy/manual-review/emilia.md`.
  Provenance: 2026-08-02 batch gauntlet, branch `kit-autonomy-batch-2026-08-02`, commit `35f0f0f6`,
  PR #60. **Landing gate:** the primitive must be snapshot-inert as its own commit before the
  `emilia` override lands on top; `simSupported`/kit-status flip only if it lands faithful. Re-run
  the gauntlet afterwards (separate owner-gated pass).
- **⇒ FLORA S2 SELF-PROC — OWNER RULING 2026-08-03, IN FLIGHT on `kit/flora-s2-selfproc`**
  (worktree `../nikke-sim-wt-flora`). `flora`'s S2 slot ships as `"skill2": []` on the premise that
  all three lines are gated on HP dynamics v1 cannot represent and "never fire". **That premise is
  wrong** — S2 self-procs off her own S1, deterministically, every burst rotation, with no HP pool
  and no boss damage: entering Burst Stage 2, S1 grants Peace-of-Mind allies Max HP ▲15.01% _without
  restoring HP_, so their HP fraction drops to 1/1.1501 ≈ 86.95% → satisfies S2-1's "≤90%" shield
  trigger; the shield landing on `flora` satisfies S2-3's `shielded` ATK ▲45.12%; 2s later the Max HP
  buff expires, allies return to max HP → satisfies S2-2's "reaches max HP" True Damage ▲30.97%.
  Every primitive needed already exists (`stageEnter{stage:2}` types.ts:87, `shield{maxHpPct}` :271,
  `shielded` :85, `selfAndAdjacent` :129) **except a block-level delay** for the +2s step — `delaySec`
  today lives only on `flatDamage` (:203), so `Block` is gaining a general `delaySec`. The
  `stageEnter{stage:2}` trigger is a derived-deterministic PROXY for the ≤90% HP transition and must
  be documented as such in the override note. Expect a real board move (she gains a high-uptime team
  ATK + True Damage buff); board A/B is FINDINGS-ONLY, no re-tune off it in the landing session.
- **⇒ ENGINE PRIMITIVE GAP: `addStack`** — no effect increments an existing buff's stack count by N on
  a trigger. Blocks `flora` S1 ("after 100 normal attacks, all Electric Code allies: increases the
  stack count of stackable buffs by 1" — trigger `hitCount:100` and target `alliesOfElement` are both
  expressible, only the EFFECT is missing) and is the same family as `k`'s Tilted Scale stack-ramp
  (+29 stacks per last bullet, cap 100), which shipped as DOCUMENTED_GAP encoded as a flat
  `burstCast critRatePct 75` steady-state — correct for the burst window, under-credits the pre-burst
  ramp and the first burst's build. Magnitude for `flora` depends entirely on which stack-ramp buffs
  are live on her Electric allies (could be large, could be zero), so it is correctly not estimated.
  Two carriers is not yet a mandate; log a third before building. Not authorized.
- **⇒ ENGINE PRIMITIVE GAP: HP pool + HP-threshold triggers** — v1 models no ally HP pool and the
  scope-lock boss deals no damage, so "HP ≤ X%" / "reaches max HP" / "while shielded by damage" kit
  lines are structurally out of domain (precedents: `liter` cover-HP NO-OP, owner 2026-07-21; the
  `alliesLowestHp` "no HP pool" stand-in). ⚠ **This is NO LONGER a `flora` item** — her S2 turned out
  to self-proc off S1 (entry above) and needs no HP pool. Before building this, census who actually
  still needs it: the honest list is the `incomingHealingPct` / heal-magnitude family, not the
  threshold triggers. Low priority, no authorized carrier. Not authorized.
- **⇒ ENGINE PRIMITIVE GAPS (logged, no carrier pressure)** — surfaced by the 2026-08-02/03 gauntlet
  sweep, all shipped as DOCUMENTED_GAP with the ⚑ triple, none blocking a GO: **FB-end buff removal**
  (`k` S1/S2 both "Full Burst ends → remove <buff>"; moot today because the 10s durations self-expire
  ≈ the FB window) · **empty-magazine effect + status-end trigger** (`grave` S1 "Removes 100% of ammo"
  at Prediction-end — ~9–11 forgone 201f reloads/fight, an over-credit consistent with her board HOT;
  tracked as **U19**) · **crit-gated hit counter** (`k` S1 "every 4 critical pellet hits" — `hitCount`
  counts all hits, not crits; ~5% of her burst damage). Each is honest omission, not a fudge.
- **⇒ SG LANDING — fix the WEAPON MODEL before any SG override re-tune.** SG units carry 12–24% landing
  calibration debt (board SG mean |ratio−1| 0.084→0.131 post-UNIGEO), but `marciana` (SG, **no override,
  zero damage kit**) reads **0.850 COLD at n=2** and `/probe-processing` localized it to the **landing
  term** — ATK pinned +0.23%, cadence = sim, crit/core ruled out (`docs/probe-runs.md` § SG SIDE;
  `docs/probe-data/marciana-sg-band.json`). A pure override pass would fit overrides to absorb a
  weapon-model error. Exact per-band landing is footage-gated on a SOLO `marciana` recording → **U35**.
  - **Aim-circle method fix** (`docs/data/sg-calc/`, thread
    `docs/handoffs/closed/sg-re-open/2026-07-22-sg-geometry-handoff.md`): all four owner rulings resolved
    2026-07-22, scope collapsed to ONE workstream — rebuild `BAND_SG_HIT_FRAC` on the aim circle instead
    of the D=162 spread disc, then re-A/B `SGLANDING=geo` against a FRESH baseline (the plan's numbers
    predate the cone + rotation landings). Ground truth: `noir-sg-bands.json`.
  - **Pellet-reader rebuild — plan of record is
    `docs/handoffs/2026-07-30-pellet-reader-implementation-plan.md`** (START HERE block at the top;
    prior art in the companion `…-solution-survey.md`). Findings-only, nothing enacted. Headlines:
    - **Error budget:** U35 needs ±0.5 pellets/10 discrimination; at n≈40 shots/band a per-shot random
      SD of ±1.5 pellets is tolerable, but per-band **bias must be ≤ ±0.25 pellets/10**. The counter is
      ~10–20% cold = 0.8–1.6 ⇒ **3–6× over budget on BIAS. Chase bias, not variance.**
    - **Owner pellet-lifecycle spec (60fps, 13 frames):** f1 small w/ shadowed surround → f3–4 peak (2×,
      pellets occlude — least readable) → f5–11 shrink to 1× → f12–13 fade. **Readable frames: f1 and
      f8–11.** Design: PROCESS all 13, COUNT on ~5.
    - Per-frame detection is **adequate** (7–10 vs 7–9 ground truth) — detector replacement is an
      _enabler_, not the fix. The 2026-07-29 REJECT conflated two faults: `guilty`/`isabel` never
      localized (3 shots/180s), `noir` ran fine but cold. Do NOT use the counter to recalibrate UNIGEO
      until it passes second-unit validation.
    - Unblocked, no footage: 0.5 lifecycle stability on `noir` (gates one-template-fits-all-units) ·
      0.6 are the missed shots **selected** (bias) or random (harmless)?
    - **⚠ Reproducibility gap:** the 07-30 numbers came from untracked `scratchpad/pellets/run16/`.
      `scripts/probe/analyze-pellet-tracks.py` is committed but its input is not — distill a fixture
      before leaning on them further (constraint 9).
    - Dead paths (survey): VLM counting, SAM 2, Hough circles, further tuning of the current detector.
      Ring detector **re-opened as a 1h re-test at f8–11** (it was judged on peak frames).
  - Then: owner core re-trace mid/midfar/far (upgrades ⚑ fit-selected series C); third clean SMG cell
    (de-saturates the ⚑ SMG lens pair); bloom-phase footage for f_bloom; blanc near-HR39 re-count;
    burst-5 near-ON count backstop. `chisato` SMG midfar HR22 stays excluded (WEAK).
- **⇒ SMG OVERRIDE RE-TUNE WORKLIST** (follow-up to the landed 24→20.0/s cadence flip; revert
  `SMGRATE=24`). ~24 SMG overrides were fit to the old 24/s and now read a few % COLD → worklist in
  `docs/control-regression-followups.md`. Post-flip residuals: `quency-escape-queen` ~1.05 HOT,
  `nayuta` ~0.85 COLD. New question from the landing: **U34** (Max-Ammo ▲-expiry over-cap belt clip).
- **⇒ BASE-WEAPON FAITHFULNESS — sim side landed, two residuals open.** Score any time with
  `npx tsx scripts/clean-weapons-read.ts` (`SMGQUANT=1` for the measured cadence); append a run to
  `docs/probe-data/clean-weapons-readings.json` and it re-averages. Basis + rarity ceilings:
  `docs/data/clean-weapons.md` (⚠ `idoll-ocean` must be 0★/core 0, `claire` 2★/core 0 for any
  re-record). Open: **`folkwang` AR 0.963 COLD at n=2**, spread ±0.8% — a stable AR weapon-model term
  matching the board's AR class mean 0.965 → **U32**, needs a re-record with `folkwang` in SLOT 3 (she
  was unfocused in both team-A runs); and `marciana` SG → the landing thread above. SMG side is DONE.
- **⇒ Dot-gauge spot-check (deferred):** `bready` / `diesel-winter-sweets` are newly-found stacking-dot
  units and ungraded — spot-check them whenever a future dot-gauge change lands.
- **⇒ VERIFY BOSS PROFILES (low-prio).** medium/large `bossPelletProfile` magnitudes are ⚑ UNVERIFIED
  (owner-chosen, not measured). `dorothy-serendipity` PH-water (766M) vs N9-redhood (328M) already
  DISAGREE on best fit (small vs medium), so profiles are plausibly per-boss — needs real per-boss SG
  footage to map boss silhouette → profile before any board use.

#### Kit / override threads

- **⇒ TDD TRANSITION (the kit workflow) → `docs/handoffs/2026-07-23-tdd-transition-plan.md`.** Steps
  1a–1d and the step-2 primitive backfill are on `main` (`scripts/tests/engine/*`). **Step 2 is now
  fully closed** — the two deferred items (trigger-kind matrix, gauge suppression during FB/chain)
  landed 2026-08-03 in `03021eeb` as `trigger-kinds.test.ts` + `gauge-suppression.test.ts`, 15
  assertions, both bite-verified against a deliberately broken engine. Open:
  1. **Step 3 — per-unit dedicated sessions, OWNER drives the spec line-by-line from kit text; run them
     with `/kit-tdd`.** Fully unblocked. Rationale: the board gates FIT only; faithfulness errors of a
     few % are absorbed by calibration and only unit tests can gate them.
  2. **Hygiene pass on the plan doc itself** — it is the stale artifact now. It lists two landed step-3
     specs (`helm` (SR/Water) + `liter`) against the 128 files actually in `scripts/tests/units/`, and
     still calls the two step-2 items deferred though both landed in `03021eeb`. Refresh it or close it.
  3. Six `cfg.onEvent` payload follow-ups (weapon-swap events, perResource/ramp/swap-gate fields on
     `buffApply`, …) listed under §1d in the plan — build them as step-3 tests need them.
- **⇒ SAME-SQUAD PRIMITIVE MIGRATIONS** (the primitive landed 2026-08-02; `teamHas.sameSquad` resolves
  from `src/data/squads.ts`, fail-closed). Remaining units with "same squad" kit text:
  - `anchor-innocent-maid` (S1 block B heal gate) — modeled always-satisfied (override caveat). BLOCKED
    on an owner ruling for her squad membership (the maid costumes — `mast-romantic-maid`,
    `privaty-unkind-maid` — are candidates, NOT verified). Once ruled: add the squad to
    `src/data/squads.ts`, gate the block, rewrite the caveat.
  - `ram` (S1 "Full Burst ends with an ally from the same squad") — no override yet (not simSupported);
    collab-unit squad unknown, confirm before authoring.
  - `emma-tactical-upgrade` / `eunhwa-tactical-upgrade` (S2 "affects all allies from the same squad") —
    TARGET-SET pattern, not a gate; owner precedent encodes same-squad targets as plain `allies`. No
    migration needed unless a future ruling disagrees; listed for completeness.
- **⇒ KIT-PARSE RECONCILIATION BACKLOG → `docs/handoffs/closed/kit-parse-reconciliation-backlog.md`**
  (archived but still carries a live per-unit tail) + **ENGINE MODELING-GAP THREAD MAP →
  `docs/engine-modeling-gaps.md`** (§A done / §B wired-not-enacted / §C unwired). Per-unit tier +
  finding SSOT: `data/kit-status.json`.
- **⇒ ROLE-AUDIT FOLLOW-UPS → `docs/handoffs/closed/2026-07-17-role-audit-followups.md`:** (1)
  custom-weaponry `role` sweep — mostly deflated; what's left = pierce-from-kit-text + the
  (data-blocked) weapon-swap secondary-weapon row; (2) **`anis-star` dot-gauge re-model**
  then drop her `hitsPerShot` carve-out to 1 (highest-value modeling fix; needs a measurement); (3)
  re-pin PH-water FB to 12 when the burst-cycle fix lands / after re-measure. Passive carries: next sync
  applies 18 behaviour-neutral `burstGaugePerShot` diffs; D.4 RL splash (multi-part scope only); E
  class-mismatch core-row guard (no current violator).

#### Product / web

- **⇒ SEO FOLLOW-UPS — deferred pending a real crawl: [docs/seo-followups.md](../seo-followups.md).**
  Search-visibility decisions that are NOT answerable from the repo. Nothing to do until Search
  Console has ~4-6 weeks of data; the doc carries the measurement, the options and a 4-step
  decision rule so the call is decidable rather than open-ended. Headline: measured
  (`MEASURE=1 node scripts/unit-page-check.mjs`), no unit page is under 300 crawler-visible
  characters and only **17** are under 500 — short-kit starter/NPC units, NOT the 85
  unsimulated ones (median 616). That killed the originally-planned rule: **do not gate the
  sitemap on `simSupported`**, it does not track thinness. Recommendation is do nothing.
- **⇒ UNION-RAID GENERATOR — DEFERRED (owner ruling 2026-07-24) pending board stability.** Code +
  record live on branch **`gen-union-item3`** (tip `15e35dc1`; not on main, rebases cleanly). ⚠ **The
  cited plan doc `docs/handoffs/2026-07-24-union-raid-polish-plan.md` was NEVER COMMITTED** — commit
  `7eb2174a`'s message describes it but the commit touches only `docs/DECISIONS.md`. That DECISIONS
  entry (on the branch, not on main) is the surviving record; the method is restated here so the
  thread does not depend on it. The owner-specified method is settled — build each boss's IDEAL team independently (heavy
  overlap on the meta supports is the INPUT, not a fault), then re-allocate ONLY the overlap by asking
  each claimant what it loses by conceding a contested unit — plus "any"-element rows (re-wire
  `weakness: null` from "none" to "ANY") and a "pick 3 bosses for me" control, backend first.
  **Deferred because judging the allocator needs a stable per-unit board:** the Water ideal differs from
  the standard comp by exactly ONE unit (`rapi-red-hood` over `snow-white-heavy-arms`, +13% with the
  same four teammates) while element advantage is only 1.1× on one unit's damage — a per-unit MARGIN
  question, not a search question. HYPOTHESIS, sim-only, NOT ENACTED. WIP on `gen-union-realloc-wip`
  @ `ddf304a` (typechecks, never run).
  Already landed on `gen-union-item3` @ `cfad4dfa` and HELD: `topTeamsMultiBoss` in `src/teamcalc.ts`,
  build-order sweep + cross-boss polish, `scripts/tests/generators/multi-boss.test.ts`, a `--union`
  arm on `scripts/bench-generator.ts` (+7.64% / 0.00% / +9.58% on three boss triples at 3.4–4.0× wall
  clock; the A/B artifact doc was likewise never committed). It also carries a `web/src/simClient.ts`
  pool-init fix — ⚠ that hazard is **LATENT on main, not live** (main's union loop awaits each
  `genBestTeam` fully, so only one coordinator exists at a time), so the fix travels WITH the union work;
  nothing to cherry-pick. ⚠ Union does NOT need the mint/prika post-pass (already a TEAM CONSTRAINT).
  Open follow-up spec: `docs/handoffs/2026-07-24-gen-item4-union-polish.md` — extract the polish driver
  out of `topTeams` and parameterize per row. Hard constraint: **union must NEVER be sorted** (row _i_ is
  bound to boss _i_; `shareUnionRoster` zips by index). Cheap pre-check first: does union greedy leave a
  team on the table on a constrained pool the way solo did?
- **⇒ SEO — parked, low-prio → `docs/handoffs/2026-07-30-seo-notes.md`.** GSC's "Page with redirect"
  flag on the http:// variants is expected (Google confirming the 301→canonical works), not a defect —
  no fix needed. The real item is whether to prerender/SSR the docs/FAQ content so non-Google AI
  crawlers (GPTBot/PerplexityBot, which don't execute JS) can see it; the owner is unsure it's worth
  doing. Revisit only if AI-citation/organic traffic to the docs pages becomes a priority.
- **⇒ Bakery-bot share-URL durability — one residual to tell the bot:** a `characters.json` change (e.g.
  a unit rename) moves pixels without moving the render cache key — `specCacheKey` covers renderer
  changes, not data changes. If that bites, add a data stamp to the key.

### Tier-0 open threads

- **`jill` re-tune at 0.919 COLD ▼** — her kit-faithful reload landed 2026-07-22 (**A33 (U31)**), moving
  her 1.031 HOT → 0.919 COLD, so she is the top per-unit re-tune candidate. Two riders: her burst's
  _"Normal attacks deal True Damage for 10 sec"_ is unmodelled, and the reload-speed **LOCK** she carries
  needs the clamp primitive (`docs/engine-modeling-gaps.md` §1b, same build as the 5e work above).
  **`N1 rapi/quency wind` is now UNPINNED** (sim 12 vs video-measured 13, value kept in-comment in
  `scripts/regression.ts`) — a pre-existing burst-generation shortfall her fix UNMASKED, same family as
  **U29**. Do NOT close it by restoring her phantom fire rate.
- **`helm` carry-SPREAD is unexplained** (0.972 `soda-twinkling-bunny` … 1.093 `scarlet-black-shadow` on
  the control-regression suite, `npx tsx scripts/control-regression.ts`) — an interaction, NOT a flat kit
  offset; neither of her two landed fixes addressed it. **Do not tune her to the mean before the spread
  is explained.** ⚠ `crown` also carries many BOARD readings from `scripts/experiment.ts` — any retune in
  this suite must be A/B'd on `scripts/board-read.ts` too. Board-wide follow-ups from this project →
  `docs/control-regression-followups.md` (the `durationShots` carrier census, the `critRateNormalPct`
  census, the 10-unit fit-exposure re-tune worklist, override-prose drift, open board questions).
- **isabel mid/midfar clock-drift re-derive** — the one SG-landing thread still open (per-unit landing +
  class table STAND; class-wide far 0.66 REJECTED) → **U27**.
- **HR→core slope refinements** — `asuka` saturation bracket (circle10 vs SAT=1); `quency-escape-queen`
  cadence + the +1.04 overshoot (flag-off HOT baseline = Explore-Route kit over-credit, owner kit audit);
  slope validation via an existing measurement (`soda-tb-control`). Live model: `docs/STATE.md` §4.
- **AR-burst-window residual (moran/jill)** — footage-blocked. moran's swap coldness is THROUGHPUT
  (~1.3× more hits in the swap window), NOT per-shot (the '1440'=24/s datamine was measured-refuted; base
  ~12/s stands); needs an isolated moran-solo recording or the swap weapon's `shot_count` datamine.
