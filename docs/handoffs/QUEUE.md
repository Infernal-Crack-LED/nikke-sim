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
> `CLOSED (date)` marker + `mv` into `docs/handoffs/closed/`; a fully-landed top-level `docs/*.md`
> (never a living log) → same into `docs/closed/`; a resolved question → close it in
> `docs/open-questions.md` (single U-numbering — move it to `docs/answered-questions.md` with the
> answer inline, no new A-number).

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

- **⇒ DOT-TICK BURST-GAUGE CONCURRENCY (Fix A) — RESOLVED 2026-07-30, REJECTED.** Owner-supplied
  footage (`docs/probes/burst tests/Raven Solo Burst Gen.MP4`) settled U37 against the fix — see
  `docs/answered-questions.md` U37 + `docs/handoffs/scientific-method-harness.md` 2026-07-30 follow-up.
  Worktree `worktree-agent-aab3a19427393feb2` discarded, not merged. Remaining open item: Fix B
  (`fillGauge` chain-lock parity) — **owner ruled 2026-07-30 that in-game instant "Fills Burst Gauge
  X%" effects do NOT bypass the chain-lock**, confirming Fix B's mechanism is correct; it still needs
  its own `/scientific-method` pass (the little-mermaid kit test it broke, `scripts/tests/units/
little-mermaid.test.ts` M4, was pinning the pre-fix bug and needs updating alongside the fix, not
  treated as a blocker). Also still open: spot-check `bready`/`diesel-winter-sweets` (newly-found
  stacking-dot units, ungraded) whenever a future dot-gauge change lands.

- **⇒ 🟡 UNIT-CARD INFOGRAPHIC — LANDED + DEPLOYED (both repos on main).** Render pipeline
  (`scripts/render-unit-card.ts`, `docs/handoffs/2026-07-28-unit-card-infographic-plan.md`) and the
  bakery-bot `/nikke` not-sim-supported line (bakery-bot PRs #29 `nikke-not-sim-supported`, #30
  `nikke-card-only`) are both merged and live. Preview any slug with
  `npx tsx scripts/render-unit-card.ts <slug>`. Three small follow-ups remain, code-verified still
  open:
  1. **No vector source for burst icons any more.** The old `burst_*.svg`/`.png` + 25×25 `class_*`
     were deleted; `web/public/nikke-icons/burst_*` is webp-only, ~100px native — fine at every size
     drawn today, but a future surface wanting it large has nothing to rasterize from.
  2. **`UnitCardSources.prerelease` is still never set** (cross-family review 2026-07-28 FOLLOW-UP;
     re-checked 2026-07-29, still no `prerelease` reference in `scripts/lib/unit-card-sources.ts` or
     `web/src/unitCardShare.ts`). The flag reaches the model and the `UNRELEASED — PROJECTED` title/
     PROJECTION branch in `drawNotes`, but nothing sets it, so an unreleased unit renders as fully
     live with a null `releaseDate` the only tell. Either wire it or drop the dead branch.
  3. **The browser icon loader still probes extensions and eats 404s** (same review, NOTE;
     `web/src/unitCardShare.ts:55` still tries `['svg','png','webp']` per icon via onload/onerror).
     Harmless but noisy; the icon set is static and tracked, so the extension is knowable at build
     time — carry it in the `iconNames` mapping (e.g. entries become `{ name, ext }`).

- **⇒ BAKERY-BOT INTEGRATION REPORT (2026-07-28) — BOTH ITEMS ANSWERED on branch
  `infographics-card-fixes`.** (1) _"the cache hash is derived from the request, not the output"_ —
  half already handled, half was real. `specCacheKey` has ALWAYS carried `RENDERER_VERSION`
  (`src/infographics/spec.ts`), which is exactly the "version stamp" the report asks for, and it is
  now `v2`; the real defect was hashing the RAW build code, so `blocked` (and every other field no
  pixel depends on) forked the content address — fixed by hashing a render-relevant PROJECTION of
  the decoded build (`renderRelevantBuild`), pinned BOTH ways against the actual renderers in
  `scripts/tests/share/build-render-key.test.ts` (dropped field ⇒ byte-identical PNG; drawn field
  ⇒ different PNG). (2) _URL length_ — no new addressing mode was needed: the short
  `/api/v1/img/cache/<type>.<hash>.png` (~45 chars) is already what the 302's `location` header
  carries and what `POST /api/v1/img/render` returns as `{url}`, so the bot can embed that instead
  of uploading bytes. What was MISSING is what made it unsafe: the PNG cache is byte-bounded
  (200 MB ≈ 570 cards) with LRU eviction, so an embedded cache URL would eventually 404 an old
  Discord post. `src/server/spec-store.ts` now remembers each cache filename's spec in a sidecar,
  and a miss RE-RENDERS through the same parse→resolve pipe (refusing any sidecar that resolves to
  a different hash) — the short URL is now as durable as the long one. **Still open / to tell the
  bot:** a `characters.json` change (a unit rename) moves pixels without moving the hash — the key
  covers renderer changes, not data changes; if that bites, add a data stamp to the key.

- **⇒ RL3-VS-BOARD OUTLIER GAUGE INVESTIGATION — findings-only, NOT ENACTED →
  `docs/handoffs/2026-07-27-rl3-rank-outlier-gauge-investigation.md`.** Triage the 53 `|Δrank| ≥ 10`
  outliers in `docs/rl3-burstgen-rank-comparison.md` (regenerate: `npx tsx scripts/rl3-burstgen-compare.ts`)
  into legitimate kit/rotation effect vs comparison artifact vs modeling gap. Seeded clusters: **(A)** the
  RL clip-reload family (arcana/anchor/diesel/mint/ada) sits at the sim board's BOTTOM (1.65–2.2%/s,
  Δ≈−61..−70) — possible RL cadence datamine gap vs the rl3 4-shot-opener artifact; **(B)** SG units
  under-generate in sim (landing-fraction `sgGaugeFrac` × the no-op range script; overlaps the SG-landing
  geometry thread); **(C)** catalogued unmodeled skill-gen (anis-star battery+aura, ein orb, trina/laplace
  battle-start fill — `burst-gauge.md` §2); **(D)** sim-over-performers with real kit gauge (bready DoT,
  red-hood, neon — mostly legitimate). flora/rosanna/sugar already resolved 2026-07-27. Findings-only;
  per-unit enactments gated via `/kit-tdd` / `/scientific-method`.

- **⇒ PROBE READER BUILD-OUT — P0/P1/P2/P4 BUILT 2026-07-24 on branch `probe-readers`, AWAITING
  OWNER MERGE** (DECISIONS 2026-07-24; validation record `docs/probe-runs.md`; instrument registry
  `docs/STATE.md` §7; plan `docs/handoffs/2026-07-24-probe-reader-buildout-plan.md`).
  `scripts/probe/scan.ts` + `scan-frames.py` (deterministic CV, no model) is now the FB-count
  instrument — **exact on 8 recordings** with independently measured counts, every burst
  corroborated by a 2nd detector; `read-burst-gauge.ts` gained `--classifier cv|vlm` (cv default)
  - `--t0`; `read-ammo.ts` + `count-pellets.py --ammo-digits` + `ammo-atlas/` close the cadence hand
    read (SMG 20.3/s in two bands); `read-battle-records.ts` reads the end-of-fight screen with an
    arithmetic checksum (37/37 exact); `read-popups-vlm.ts` scores popup confidence; `hit-values.ts`
    moved onto a shared `hit-bands.ts`.
    **Open tail, all small:** (a) `read-popups-vlm.ts`'s **auto-accept path is UNEXERCISED** — 0 of 30
    popups auto-accepted on the one hand-read probe because `little-mermaid`'s bands overlap; it stays
    unproven until a CLEAN-band focus unit trips it, and that first firing should be checked against a
    hand read → **open-questions U36** (opened 2026-07-24, carries the how-to). (b) `read-ammo.ts` cannot yet read a **small-magazine SG** counter (~29% of frames on
    `marciana-solo`, 1–2 digits, weak template lock) — SG cadence still goes via the pellet counter;
    ⇒ this also means **U34** (Max-Ammo ▲-expiry belt clip) is answerable for SMG/AR/MG but not SG.
    (c) **P3** was never a build — it is the `read-pellets.ts` validation obligation, still filed
    into **U35**. ⚠ Re-running a VLM reader is NOT a confirmation route: two runs over the same video
    agreed 100% (190/190) — the decoder is deterministic, so it repeats its own mistakes. Cross-checks
    must be method-diverse.
    **⚠⚠ SCOPE OF THAT WARNING (added 2026-07-25 after it was misapplied at ~5h cost): it governs
    CONFIRMING A MEASURED VALUE — "is this popup really 7694?" — where a second run of the same decoder
    adds nothing. It does NOT govern VALIDATING OR REVIEWING A READER.** For reader/tooling work the
    instrument is the **existing labeled set** — run the script over it and report the score/confusion
    matrix. Those labels were produced independently of the reader, so that IS a method-diverse check and
    it is the CORRECT and SUFFICIENT one. Hand-reading frames to re-derive labels the repo already holds
    is the failure mode, not the rigorous option. See the SUFFICIENCY rule in Discipline forcing-functions.

- **⇒ BASE-WEAPON FAITHFULNESS TEST — sim side LANDED 2026-07-23, RECORDINGS OPEN →
  `docs/data/clean-weapons.md`** (ruling + rationale in DECISIONS 2026-07-23). The six clean-weapon
  units (kits contribute zero damage) are now runnable and pinned:
  `scripts/tests/units/clean-weapons.test.ts` (25 assertions) + `bareWeaponComp`/`bareWeaponOverride`
  in `scripts/tests/lib/harness.ts`. Basis: scope lock, boss **Iron** (only neutral-for-all element),
  core 100, bursting OFF via the new `cfg.disableBursts` engine flag (default-off, byte-identical
  unset), two teams of three — **A** `folkwang`/`marciana`/`snow-crane`, **B**
  `emma`/`claire`/`idoll-ocean`. ⚠ **RARITY CEILINGS ARE LOAD-BEARING for the recordings:**
  `idoll-ocean` must be 0★/core 0 and `claire` 2★/core 0 (they are not SSR and cannot reach scope
  lock's 3★/core 7; uncapped they over-read 15.5% / 12.6%). `idoll-ocean` has no viable SMG
  replacement (`rei` is clean but unowned; `mica-snow-buddy` carries Max Ammunition Capacity ▲).
  **FIRST SCORING LANDED 2026-07-23** (recordings `docs/probes/clean-weapons/`, full table +
  reasoning in `docs/probe-runs.md`): **3/6 inside ±3%** — `snow-crane` SR 0.986, `emma` MG 0.977,
  `claire` RL 1.024; `folkwang` AR 0.956 marginal. **Two big outliers, both localized to the WEAPON
  MODEL** (these units have no override and no damage kit, so neither can be calibration debt):
  **`marciana` SG 0.843 COLD** and **`idoll-ocean` SMG 1.166 HOT**. NOT ENACTED (n=1/unit).
  ⇒ The `claire`→`noah` RL swap is no longer worth taking (she reads 1.024; swapping would move the
  neutral element Iron→Water and re-pin all six for no gain).
  Score it any time with **`npx tsx scripts/clean-weapons-read.ts`** (`SMGQUANT=1` for the measured
  cadence); real totals in `docs/probe-data/clean-weapons-readings.json` — append a run and it
  re-averages. Board 2026-07-23 (3 recordings): **3/6 within ±3%**, **4/6** under `SMGQUANT=1`;
  repeatability ±0.2–0.8% where n=2.
  **SMG SIDE IS DONE** — `/probe-processing` on `emma-claire-idollocean.MP4` root-caused it to the
  20-vs-24 rounds/s cadence (see the P0 gated-flip item above).
  **Two small residuals now filed:** `folkwang` AR **0.963 COLD at n=2**, spread only ±0.8% — a
  stable AR weapon-model term, matching the board's AR class mean 0.965 (**open-questions U32**;
  needs a re-record with `folkwang` in SLOT 3, she was unfocused in both team-A runs); and
  `idoll-ocean`'s ATK basis reading **~1.4% low** against a 7694 popup — **ANSWERED 2026-07-26**:
  the recording lacked the relationship (bond) bonus (~1.4% of total ATK); the ceiling is correct
  (**answered-questions U33**).
  **SG SIDE IS DONE — the cold-read is the PELLET-LANDING term** (`/probe-processing` on
  `snowcrane-folkwang-marciana.MP4`, n=2 = **0.850 COLD**; full record `docs/probe-runs.md` § SG SIDE,
  parse `docs/probe-data/marciana-sg-band.json`). Localized by elimination: ATK basis pinned **+0.23%**
  (5 popup values on one per-pellet lattice, u≈2011.47), cadence = sim (40 game-frames), crit = fixed
  stat, core popups rare — so the 17.7% gap is FORCED onto landing (real ≈8.45/10 mean vs sim 7.18),
  concentrated at the LONG bands (sim near 8.13/mid 7.13/midfar 6.57/far 6.07). ⇒ A pure SG override
  re-tune would be fitting overrides to a **weapon-model** landing error — fix the landing model first.
  **OPEN follow-up: exact per-band landing needs a SOLO `marciana` recording** (popup-stacking defeats
  per-shot counts; the running-total lattice is mixed across 3 units here) → **open-questions U35**.
  NOT ENACTED (n=2, measurement only).

- **⇒ TDD TRANSITION (owner-approved 2026-07-23, NEW KIT WORKFLOW) →
  `docs/handoffs/2026-07-23-tdd-transition-plan.md`.** Kit work switches from batch-BDD (kit-parse →
  audit → board-fit) to test-first. **Step 1a–1c LANDED 2026-07-23** — vitest is the gate
  (`npx vitest run`, ONE verify.sh step globbing `scripts/tests/**/*.test.ts`; engine/ + generators/
  - units/ + lib/harness.ts; all 9 bespoke tests migrated, the 6 orphans now wired in). **Step 1d
    LANDED 2026-07-23** — the `cfg.onEvent` structured event hook (the plan's one gated engine edit:
    isolated worktree, `/scientific-method` step-7 reviewed, merged; output byte-identical on a
    whole-board A/B, not just the snapshots), so event-level kit assertions are live for steps 2–3.
    6 payload follow-ups (weapon-swap events, perResource/ramp/swap-gate fields on `buffApply`, …) are
    listed under §1d in the plan doc — build them as step-2 tests need them.
    **⇒ Step 2 PRIORITY LIST LANDED 2026-07-29, AWAITING OWNER MERGE** — branch `tdd-step2-backfill`
    (worktree `../nikke-sim-wt-tdd-step2`, based on `origin/main`; PR opened, see below). Every
    primitive-census row with >1 carrier now has a dedicated `scripts/tests/engine/*.test.ts`:
    `weaponSwap`+`swapGate` (14/7), `instantReload`+`consumeAmmo` (8/2), `mode`/`modes` (7/7),
    `escalating` (6), `hitRatePct` (14, deliberately scoped to primitive-wiring only — see that file's
    header, it stays out of the contested UNIGEO/CONE_DELTA/HRCORE geometry territory), on top of the
    6 landed 2026-07-23 (flatDamage/hitCount/hitsPerShot/burstCdr/buff-application/block-gates). No `src/`
    changes anywhere in this branch — every assertion is against ALREADY-SHIPPED engine behavior, and no
    engine bug surfaced (findings-only discipline had nothing to record). Cross-family reviewed CLEAN
    (`kimi-code/k3` via `/code-review`, two dispatch rounds — the first caught the driver's own packet-
    assembly bug (an unexpanded `$(cat ...)` placeholder) before any code was even read, the second came
    back CLEAN with 6 NOTE-level findings, 2 applied as trivial follow-up fixes). Full coverage detail +
    what each file pins → the step-2 checklist in the plan doc. **NOT fully closed:** two diffuse items
    deliberately deferred (lower priority, harder to scope as one dedicated file) — the trigger-kind
    matrix as its own cross-cutting suite (`lastBullet`/`shotFired`/`interval` first-fire phase/
    `stageEnter`/`fullBurstEnter`/`End` — largely exercised incidentally by the backfills above, never
    pinned as a dedicated suite), and gauge suppression during FB/chain. Pick either up in a fresh
    session using the same zeroed-kit-carrier (`blanc`+bare-weapon-`crown`) pattern the 5 landed files
    establish.
    **Next up:** (3) per-unit dedicated sessions, OWNER drives the spec line-by-line from kit text —
    **run them with the `/kit-tdd` skill** (created 2026-07-23; the operational form of the plan's step 3:
    slug gate → owner-driven spec table → RED test against the SHIPPED override → gated fix → board A/B) —
    now fully unblocked now that the step-2 priority backfill has landed; (4) audit-kit/blind-rebuild
    demoted to post-validation sampling — doc/skill reframe still open (CONVENTIONS test-first note,
    audit-kit/kit-parse one-line reframe, STATE.md pointer), pick up with `/skill-maintenance`.
    Rationale: the board gates FIT only; faithfulness errors of a few % (helm's `critRateNormalPct`
    mis-scoped generic, her round count faked as `durationSec`) are absorbed by calibration and only unit
    tests can gate them.

- **⇒ SMG OVERRIDE RE-TUNE WORKLIST (follow-up to the LANDED SMG cadence flip).** The SMG cadence
  flip 24→20.0/s (frame quantization) LANDED default-ON 2026-07-23 (DECISIONS; `docs/STATE.md`
  `SMGRATE` row; revert `SMGRATE=24`). Open tail: ~24 SMG overrides were fit to the old 24/s and now
  read a few % COLD → the re-tune worklist in `docs/control-regression-followups.md`. Post-flip
  residuals still open: `quency-escape-queen` ~1.05 HOT, `nayuta` ~0.85 COLD. New question from the
  landing: **U34** (Max-Ammo ▲-expiry over-cap belt clip — immediate vs lazy, now reached code at
  20/s). The full work order is CLOSED → `docs/handoffs/closed/2026-07-23-smg-cadence-flip.md`.

- **⇒ ENGINE-WORK ORDER (read FIRST before resuming per-kit retunes) →
  `docs/handoffs/2026-07-22-engine-work-plan.md`.** The remaining engine work ranked by BLAST RADIUS, with
  the rationale that P0/P1 items change the shared math every override is calibrated against (a retune done
  first has to be redone), while P2 primitives are additive and interleave freely. Order: (1) score the
  `CONE_DELTA` holdouts + revert-trigger check; **(2) LANDED 2026-07-22 — `RIDERCRIT` ON, see A32 (U13);
  remainder → U28**; (3) accuracy-circle geometry (3 owner rulings
  open; take the one hard range measurement first); (4) A2/U20 same-cast self-buff — **ANSWERED 2026-07-26:
  own same-cast self-buffs DO apply to cast-instant burst (answered-questions U20)**;
  (5) **P2 primitives — NOTHING BUILDABLE REMAINS** (verified 2026-07-22): pellet-count LANDED 07-21,
  eve bucket LANDED 07-20, snow-white charge-swap STRUCK, **"rolling reload" was a MIS-STATED MECHANIC
  → U30** (owner correction 2026-07-22: chunked units empty the mag then refill it in PARTS — they never
  top up mid-mag. `reload_bullet` = 1/chunks is the tell, `reload_time` is per-chunk, and shipped
  `reloadFrames` already multiplies it for 190/192 units ⇒ **nothing to build**. `modernia`/`volume` were
  never carriers; `grave` is the lone un-multiplied one, HELD at 81 by owner decision + pinned in the new
  `scripts/check-reload-chunks.ts` verify gate; the COMPOSITION of parts→duration stays open in U30),
  leaving only **5e state machines. The TARGET-STATUS GATE half of 5e LANDED 2026-07-23** (`targetStatus`
  effect + `requiresTargetStatus` gate; the hardcoded `wipeOut`/`requiresWipeOut` pair was then DELETED
  and `d-killer-wife` migrated onto it — owner ruling, faithful > fit, board-neutral → DECISIONS
  2026-07-23 ×2, `docs/STATE.md` §5, `docs/engine-modeling-gaps.md` §1a). ⚠ **Its "same machinery for all four" rationale was REFUTED** by the
  premise gate — evidence tier **DATAMINED (kit text), complete 4-of-4 census** of the units named, read
  by a fresh-context blind `premise-verifier` and cross-checked by roster-wide status-token grep. This is
  a STRUCTURAL claim about what the four kits say, not an empirical one: it flips no constant, no default
  and no board value, and it narrows the scope of work not yet built. The registry is NECESSARY for all
  four but SUFFICIENT only for `privaty` (enemy-carried status, clean predicate read). `mint` still needs a timerless memoryful XOR toggle, `prika` a
  cross-unit status event bus + in-flight duration mutation, `milk-blooming-bunny` a **reload-count-scoped
  stat CLAMP** (which is also the §1b LOCK gap — note it is NOT a timed window) — three separate builds,
  detailed in the plan doc. Do not re-attempt them on the registry alone. **5f `privaty` is CLOSED —
  ENACTED 2026-07-23** (owner ruling, faithful > fit → DECISIONS): the fabricated DoT is replaced by a
  `lastBullet` `flatDamage 1687` gated `requiresTargetStatus 'Designated Target'`, the status applied by
  her burst, `noFb` gone. Settled by a frame read (u7 @ 15.503s) whose arithmetic identifies the rider
  exactly and shows it taking the +50% FB major. **DELIBERATE board cost 0.937 COLD → 1.118 HOT** —
  fit-exposure from the removed `noFb` calibration, NOT this encoding; do not close it by re-adding
  `noFb` or shaving the datamined coefficients (per-unit localization thread).
  **⇒ U14 IS NOW EMPTY: she was the roster's LAST `noFb` carrier**, so `FBRULE=perkit` is behaviourally
  identical to `FBRULE=timing` for every unit and the default flip `sim.ts` promised ("once all 6 are
  green … zero further drift") is now provably a no-op. **NOT taken — engine default, owner-gated; queued.**
  **P0 is CLEAR:** the crit/core bracket is ADDITIVE (owner ruling 2026-07-22, zero engine change →
  DECISIONS).

- **⇒ UNIGEO SHIPPED (default `'all'`, owner enactment 2026-07-22 → DECISIONS; live model
  `docs/STATE.md` §4; full thread `docs/handoffs/2026-07-22-sg-geometry-handoff.md`).** SG/AR/SMG
  accuracy geometry is now uniform-in-circle (R(hr) linear-to-zero at HR 100 from the datamined
  scale; SG landing = 0.96×coverage with the new Hit-Rate term; core = area-ratio/lens). The N5
  fire comp's real FB count is 12 (owner recount) vs sim 10 → **open-questions U29** (pre-existing
  burst-generation question, NOT a UNIGEO regression — W6 isolation record). **TOP FOLLOW-UP: the
  SG OVERRIDE RE-TUNE PASS** — SG units carry 12–24% landing calibration debt (board SG mean
  |ratio−1| 0.084→0.131 until re-tuned; the graded SG comps are the worklist).
  ⚠ **RE-SCOPED 2026-07-23, then CONFIRMED by the SG-landing probe:** `marciana` (SG, NO override,
  zero damage kit) scores **0.850 COLD at n=2**, and `/probe-processing` localized it to the **LANDING
  term of the SG weapon model** (ATK pinned +0.23%, cadence = sim, crit/core ruled out;
  `docs/probe-runs.md` § SG SIDE, parse `docs/probe-data/marciana-sg-band.json`, **open-questions
  U35**). ⇒ Fix the SG **landing model** BEFORE any override re-tune — a pure override pass would be
  fitting overrides to absorb a weapon-model error. Exact per-band landing is footage-gated on a SOLO
  `marciana` recording (U35). **2026-07-29 update:** the CV pellet-counter validation run on `noir`/
  `guilty`/`isabel` solo recordings **FAILED** — the counter is ~10–20% cold on `noir` with band-dependent
  flattening, and the marciana-derived ammo-box template does not generalize to `guilty`/`isabel`.
  **2026-07-29 (later) counter-fix follow-up:** implemented per-video ammo-box template extraction +
  ROI matching; short clips restored `guilty`/`isabel` detection, but full-noir validation still fails
  (near1 produced no valid shots, near2 7.65 vs anchor 8.9, midfar 6.91 vs anchor 8.8; `guilty` full
  run only 21 shots). Do NOT use the counter to recalibrate UNIGEO until it passes second-unit
  validation. Full log: `docs/handoffs/scientific-method-harness.md` 2026-07-29 entry + addendum.
  **⇒ 2026-07-30 PELLET-READER REBUILD — plan of record
  `docs/handoffs/2026-07-30-pellet-reader-implementation-plan.md` (START HERE block at the top;
  prior-art + sources in the companion `…-solution-survey.md`). Findings-only, nothing enacted.
  ⇒ READ FIRST: `docs/handoffs/2026-08-04-pellet-reader-SESSION-JUDGE-handoff.md`** — the current
  judge handoff and the session-close entry point (it continues `2026-08-04-lifetime-cap-…` →
  `2026-08-04-pellet-reader-…` → `2026-08-03-…` → `2026-08-02-…` → `2026-08-01-pellet-cascade-…`;
  the graveyards and traps in ALL of them are BINDING). ⚑ Its §8 is the live open-item list.
  ⚑ Headline: the reader is measurably more faithful (3 landings, 4 items closed, reference
  OWNER-CONFIRMED) but **the cold SG read is UNEXPLAINED** — the 16.9% mislock rate turned out to
  cost ~nothing (§22C), so §19's −1.40/shot residual has no identified cause. And **all three
  landings reach NEW EXTRACTIONS ONLY**, so nothing on the board has moved yet. Work lives on
  branch `fix/pellet-reader`, UNPUSHED — read the count live with
  `git rev-list --count origin/fix/pellet-reader..HEAD`, never from a written number.
  `/patch-notes` is owed before anything reaches `main`.
  - ✅ **`band_hi = 20` LANDED 2026-08-04** (owner-approved; `docs/probe-runs.md` §16, plan
    `docs/handoffs/2026-08-04-band-hi-LANDING-PLAN.md`). All five pre-stated criteria met, the
    blast radius declared before the edit **held exactly — zero fixtures, zero pins**, cross-family
    post-op `ACCEPT`. ⚑ **The improvement reaches NEW EXTRACTIONS ONLY** — committed dumps keep the
    band values they were extracted with, so **nothing on the board moves until footage is
    re-extracted**. ⚑ Also open from it: `--dump-tracks` never carries the `band` series, so any
    such dump replays as pre-hybrid and cannot exercise the landing (§16E; production reader is
    unaffected — it parses `--temporal` stdout).
  - ✅ **THE 8.40 REFERENCE IS CONFIRMED, 2026-08-04, OWNER-CONFIRMED** (`docs/probe-runs.md` §18).
    Nothing lands and fades before `t0+8`, so the f8–11 window count IS the landed total. Of 140
    screened tracks, 11 were candidates, shot 2's `hitsPerShot` ceiling killed 5 by arithmetic, and
    all 6 survivors adjudicated **not pellets** (HUD ammo-bar segments at a fixed `dy ≈ −40`, and
    rising damage numbers). ⇒ **the ~1.08 cold bias is real reader behaviour, not a bad target**,
    and the old "no bias verdict is possible until this is settled" block is **LIFTED**.
  - ✅ **PRODUCTION MISLOCK RATE MEASURED 2026-08-04: 16.9%** (`docs/probe-runs.md` §20; rule
    pre-committed at `9bc829dd`). 137 of 811 shots, 4 dumps, 4 units. ⇒ the pre-committed
    **"> 10% ⇒ mislocks are the DOMINANT undercount channel"** band. The detector flags the known
    shot-4 mislock and none of the four known-good labelled shots, the 160 px threshold sits in a
    real empty band (nothing 127–242 px), and the rate reproduces on independent footage
    (16.2% labelled clip, 20% on §9B's set). **⇒ NEXT: measure what the channel COSTS** — the
    0.85 pellets/shot figure is DERIVED from one shot's severity (n=1) and carries the refuted
    `center_exclude` arithmetic shape; it sizes the channel, it does not close anything.
  - **⚑ The cold bias is still NOT closed** — the target being right says what the bias _isn't_.
    `avgTotal` may not be cited as evidence it is closed: it is a per-EVENT pooled figure, a
    different basis from the per-SHOT ~1.08 deficit. The remaining channels (radius gate,
    missing-shot channel, fragmentation) now carry all of it.
  - Item 7's prerequisite (is opencv's `marker = 3` at frame 1565 a true core hit?) is **ANSWERED —
    no**, at n=1 (`docs/probe-runs.md` §15). The `read-pellets.ts:882` selector fix stays
    owner-gated; do not self-authorize it on an n=1 read.
  - **Error budget (the target, computed):** U35 needs ±0.5 pellets/10 discrimination; at n≈40
    shots/band a per-shot random SD of **±1.5 pellets is tolerable**, but per-band **bias must be
    ≤ ±0.25 pellets/10**. The counter is ~10–20% cold = 0.8–1.6 → **3–6× over budget on BIAS.**
    ⇒ **Chase bias, not variance.**
  - **⚑ PREMISE CORRECTION, load-bearing and it propagates.** The owner's labelled pellet count is
    **NOT a per-shot landed total** — it counts markers visible in the **f8–11 window**, identical
    on all four frames of every shot. **So "landed pellets per shot = 8.4", and the 8–16%
    missing-shot threshold derived from it, are WINDOW-CONDITIONAL.** Re-check anything leaning on
    them.
  - **Owner pellet-lifecycle spec (60fps, 13 frames)** still governs: f1 small w/ shadowed surround
    → f3–4 peak (2×, **pellets occlude — least readable**) → f5–11 shrink to 1× → f12–13 fade.
    **Readable frames are f1 and f8–11.**
  - **OPEN, IN PRIORITY ORDER.** Records: `docs/probe-runs.md` §4–§9. Instruments (all committed on
    `scripts/probe/analyze-pellet-tracks.py`, each with a self-validating fixture and wired into
    `scripts/probe/pellet-selftest.sh`, 17 arms): `--hand-count`, `--ammo-abstention`,
    `--ammo-oracle-ceiling`, `--merge-audit`, `--representative-audit`.
    1. **THE REPRESENTATIVE-FRAME POLICY — the live lead on the cold bias, tier STRONG MECHANISTIC
       (probe-runs §9).** `debounce_shots` copies each event's count from ONE frame (the active
       frame nearest the **median**) and sums nothing. **THE MECHANISM: a two-phase event window** —
       a 4–6 frame blast/flash phase (blobs live 1–3 frames), then the pellet cohort, which holds a
       flat **plateau for 8–10 frames**. The median samples the mixture and lands in the
       **pre-cohort flash phase on 3 of 5 labelled shots**; **of the 35 pellets the reader reports
       across those 5 shots only 12 are owner pellets**, so the 7.00-vs-8.40 near-miss is
       **coincidental cancellation** of a large under-count against a large over-count.
       - **Coexistence is REFUTED** — all countable owner pellets ARE simultaneously visible in one
         frame on every shot.
       - **The peak is ARTIFACT and the median's rationale HOLDS**: 89% of peak-frame blobs are
         unmatched, 4 of 5 peaks 100% unmatched, and `max` puts **504/852 events (59%) above the
         physical ceiling of 10** (`hitsPerShot: 10`, confirmed in `data/characters.json` for all
         four units). **p75 is refuted with it.**
       - **THE DISCRIMINATOR IS TRACK LIFETIME, not frame magnitude**: owner pellets n=42, lives
         **8–19** (min 8); non-owner n=148, **146 of 148 at life ≤ 7** — **zero overlap in the 8–13
         band**. It **replicates without labels** (bimodal in-event lifetime histograms on all four
         units across 815+ events), which is what carries the tier — **not** the n=5 mean.
       - Eliminated: detection and the area/circularity filters cost **ZERO** (100% both-pass at
         offsets 8/9/10); the `valid` clamp biases **WARM (+0.24)**, not cold.
       - **⇒ WHAT SETTLES IT — no new labels, no owner time:** score any candidate rule on **WHICH
         FRAME it selects** (pre-cohort flash vs plateau) against the 5 labelled events — a
         **categorical** check with an unambiguous right answer per shot, immune to the
         mean-matching trap that sank p75. Second free check: any rule putting **>10 on more than a
         few percent of 815 events** is over-counting by construction.
       - ⚑ **The blast produces TWO detector onsets** (flash, then cohort) and `find_t0` picks
         whichever is nearest the owner's index, so the fixture's `t0` is the flash onset on shots
         2/4/5 and the cohort onset on 1/3 — **f8–11 is NOT anchored to the same physical event
         across shots.** ⚑ Shot 4's entire −5 residual is its own documented structural mislock
         (`locate: "template"`); under the template lock it gives 7 countable, coexisting 8 frames.
    2. **⛔ OWNER-GATED — `debounce_shots` MINIMAL FIX (probe-runs §8F).** `cap_cadence` (~3 LOC)
       and `resplit` (~10 LOC) both beat shipped on every arm, pooled MISSED **7.0% → 4.2% / 4.5%**.
       It buys a **missing-shot** improvement, **NOT** a cold-bias fix. Gated because **3 committed
       fixtures regenerate** (`missing-shots-slice.json`, `hand-count-slice.json`,
       `stale-counting-slice.json`) and **`read-pellets.ts:627` is a SECOND implementation that must
       change in lockstep**. ⚑ `cap_cadence`'s reported 35/9/−0.003 **did not reproduce** — the
       literal 0.9× semantics robustly gives 37/11/−0.019 and only a 1.0× cap reaches 35; the
       multiplier was NOT fitted. ⛔ **`candA` (the peak-detector rule) is REFUTED — DO NOT
       RE-PROPOSE**: pooled MISSED 7.0% → **14.5%**, worse on 7 of 8 series, 32 vs a hand count of
       36 on `isabel`; root defect is **no minimum-duration guard** (fires on a one-frame VFX spike,
       then refracts over the real shot).
    3. ✅ **60 fps LOCALIZATION INSTABILITY — CLOSED 2026-08-04, answered in the NEGATIVE**
       (`docs/probe-runs.md` §17). Re-localized `run21`/`run21b` under `--locate structural`: lock
       rate **0% → 100% / 99.4%**, but **~81% of those locks are HELD** (vs 8.1% on the working
       far-band dump `i3-noir-far-60fps`, 21.4% on `h4-marciana-structural`), stale displacement
       median **202.6 px** against a 160 px `pellet_radius`, 29 of 30 shots carrying a stale
       counting frame. ⚑ **Structural turns a LOUD failure into a SILENT one** — these two windows
       stay UNUSABLE, and the re-localized dumps are more dangerous to a consumer that checks lock
       RATE rather than lock PROVENANCE. ⚑ The item's framing was wrong too: 4 of 6 60 fps dumps
       already lock 100%, one of them far-band, so neither 60 fps nor the far band is the
       discriminator. **Why these two windows fail is UNEXPLAINED** (§17E), and this gates nothing —
       the production mislock question needs a displacement test on the production dumps instead.
    4. **THE WORKTREE HOOK GAP.** `core.hooksPath=.husky/_`, but `.husky/_` is husky's **gitignored
       generated** directory, created by `npm install` in the main repo and **never present in a git
       worktree** — so **every commit in any `nikke-sim-wt-*` worktree silently bypasses lint-staged
       and `npm run typecheck`.** Until fixed, run `npx prettier --write` on every file touched and
       `npm run typecheck` manually before committing. **The fix belongs at worktree creation.**
    5. ⚑ **THE f1787 MISS on `guilty` — mechanism UNKNOWN (probe-runs §7.10).** Not explained by
       cluster-merge: peak T = 8, post-reload lock re-acquisition, on a **measured** lock. n=1
       event. Do not manufacture a cause.
    6. ⚑ **PRE-EXISTING PYTHON/TYPESCRIPT ONE-EVENT DIVERGENCE on `h4-marciana`** (`marciana`,
       SG/Iron; probe-runs §8H): `validShots` 177 vs shipped 176. **The lockstep invariant may
       ALREADY be off** — verify it on the dump you are using.
    7. ⚑ **DOES ANY MARKER FADE BEFORE t0+8?** Needs owner labels at the plateau frame (owner time).
       The "never detected = 0" row is conditional on the f8–11 window.
    8. **THE GENERATOR'S RADIAL ENVELOPE, then Phase 2 steps 4–6.** The envelope places every label
       strictly inside the counting window (884 labels, r=42.0–157.1) while ~10% of real marks fall
       outside, so **no synthetic measurement can see that** and every generator-derived fidelity
       number inherits the gap. Phase 2 steps 4–6 stay blocked on the owner's Decision 1 and the
       remaining `/logic-gate` pre-op revisions (kimi #3 merged-peak fragment/stitch policy, #9
       blind ground-truth re-score, #10 red-gb-max hypothesis; fable #4 gap-tolerance-as-prerequisite
       / life=1 re-measurement before step 5).
  - **Also open, unranked — carried, none of these closed:**
    - **`reconstruct_ammo` magazine-consistency defect (probe-runs §4.3) — needs its own pass.** It
      accepts a level no magazine could hold, so a 3-frame glyph misread of `0` between a confirmed
      9 and a confirmed 8 scores as a 9-shot `9 → 0` decrement plus a phantom `0 → 8` reload. **The
      fix:** within a magazine the value must be the current level or current − 1, and a run of `9`
      after ≥ 25 frames of break opens a new magazine. **Blast radius:** it also produces the
      whole-fight numbers in probe-runs §3b AND is pinned by `missing-shots-slice.json`. The
      `--hand-count` arm's own reporting was ALREADY fixed here — do not re-do it — but
      `reconstruct_ammo` itself is untouched, so phantom levels are still produced and merely
      compensated downstream. ⚑ The arm's cap rule is calibrated on the `9 → 0` case only.
    - **`--hand-count`'s matcher over-credits in-reload onsets** — it credits ANY in-reload onset as
      that magazine's emptying round, so **`detected_weapon_attributable` is an UPPER BOUND** and
      **both** hand-count runs inherit it. Matcher-internal fix; `hand-count-slice.json` regenerates.
    - **The reload phase-locked echo (probe-runs §4.4) — characterized, identity still unnamed.**
      ⛔ **REFUTED as `isabel`'s S2 "Pointed Feather" rockets** (S2 is real, already modelled at
      `interval: 15`, measured ~14.7 s, ~12×/180 s — but the echo is **phase-locked to +16–18 frames
      after each magazine's emptying round**, 6 of 7 inside a 0.07 s spread over four minutes, 6
      events in 190.7 s, median spacing 22.7 s, sd ≈ 16 s — not periodic). Do NOT cite the arm's
      "median gap 14.48 s" as a ~15 s period (that set includes 0.67 s and 39.63 s). It is currently
      counted as a detected shot carrying ~0 pellets, so it inflates detections and deflates the
      per-shot average at once.
    - **Safe temporal interpolation — optional, costed, +4.7 pp measured (1,149 frames), 2–4 h.**
      Fill abstention runs ≤ 5 frames whose bracketing levels differ by ≤ 1. ⚠ It **narrows
      decrement windows**; it does NOT recover shots hidden in long gaps (58–91% of abstained frames
      sit in runs of >10 frames, max 226 = 7.5 s). Sharpens timing, not coverage.
    - **Bright-surround gate — an ACCURACY item, not coverage. ⚑ 0.5–1 day + a threshold study.**
      ~30–40 confidently-wrong reads per fight (damage numbers read as ammo); **7,825 good/bright
      frames DO read correctly**, so a naive cut costs real reads.
    - ⚑ **Undetermined:** whether the confidently-wrong reads propagate into the `--missing-shots`
      arithmetic in probe-runs §3b. (The companion question — are the 682 `no-lock` frames
      recoverable — is ANSWERED: no, all 682 are contiguous from index 0, probe-runs §6.2.)
    - **Is the missing-shot channel SELECTED (bias) or random (harmless)?** Still unanswered; the
      cold bias now has a different named mechanism, so this is no longer the lead.
    - ⚠ **The `+62.5` crosshair-offset fix (`b69b5c6`) never merged** — `main` still carries `−62.5`,
      latent. It did **not** cause the 2026-07-29 REJECT (artifacts 12:19–13:33, commit 15:17).
    - ⚠ **Phase 2A gate-2 blind spot.** Gate-1's near-crosshair fraction is computed over a WHOLE
      video, so a short per-shot excursion (shot 4's ~10-frame mislock onto a floating damage-number
      stack, spanning its OWN f8–11 window) is invisible to it. Worth a per-shot validity check if
      Phase 2A gate-2 work resumes.
    - ⚠ **ROI-restriction shot-count sensitivity (RECORD ONLY, n=1) → open-questions U35.**
      `--ammo-roi-x0 0.55 --ammo-roi-y0 0.50` alone is the difference between 43/29/7.3/0.17 and
      ~72–74/61–62/7.5–7.6/0.23 on the same `marciana` (SG/Iron) `h1` cache. More shots may be more
      false locks, not more real ones. Do NOT change `--ammo-roi` defaults off this single reading.
    - ⚠ **Owner-time ask (generator fidelity gate).** `score-pellets.py --audit-fidelity`'s 0.90
      both-pass floor is a DERIVED reference, not a measured one; labelling xy positions on the 6
      owner-counted real crops (`groundtruth-f8-11/shot0{1..5}/`, 4 frames each, ~20–30 min) would
      let it be swapped for a measurement. Not required to use the gate as-is.
    - ⚠ **Reproducibility gap:** the 2026-07-30 numbers came from `scratchpad/pellets/run16/`, which
      is untracked. Distill a fixture before leaning on them further (constraint 9).
  - **⛔ REFUTED — do not re-propose (records in probe-runs §5, §6, §8, §9):** the per-video
    red-digit **atlas harvest** (12.2% of abstentions, 95% of those white; the atlas was never
    white-only — 141 glyphs = 69 white + 72 red, and red is complete at digits 0–4 because every
    magazine is 9; ceiling +4.8 pp nominal / **+0.21 pp honest**) · **stale-lock localization**
    (+0.18 pp demonstrated / +1.33 pp optimistic, not +14.3 to +17.1 pp — **70.2% of stale frames
    render no digits at all**; gate relaxation is strictly WORSE, 27.8 px → 254.9 px; and there is
    **ONE lock, not two** — `cross_positions − cross_rawloc` is (162, −12)/(162, −13) in 100% of
    frames in all 7 dumps) · **a `locate_badge_structural` second tier** (~270 LOC / 4–6 h for
    ≤ +1.6 pp on frames whose semantic value is "reloading") · **cluster-merge as the cold bias**
    (31 of 815 = 3.8% against the cadence period, ~20 shots pooled = 2.6%; the 5 owner-labelled
    shots are **bit-identical** under shipped/`cap_cadence`/`resplit` and pooled `avgTotal` moves
    −0.003 to −0.007 against a 1.08 deficit, the best variants **colder**) · the **31.3%** figure
    (a category error — `max_pellet_frames` is a per-blob track-lifetime cap that `debounce_shots`
    never reads) · **`candA`** · **p75**.
  - Rejected/dead paths recorded in the survey: VLM counting, SAM 2, Hough circles, further tuning of
    the current detector. Peanut heuristic now **obsolete** (Phase 2 stops counting on peak frames);
    ring detector **re-opened as a 1h re-test at f8–11** (it was judged on peak frames, where a
    neighbour destroys the shadowed surround the owner confirms exists).
    Then: owner core
    re-trace mid/midfar/far (upgrades ⚑ fit-selected series C); third clean SMG cell (de-saturates
    the ⚑ SMG lens pair — its little-mermaid long-band over-prediction is an active red flag);
    bloom-phase footage for f_bloom; blanc near-HR39 re-count; burst-5 near-ON count backstop;
    chisato SMG midfar HR22 stays excluded (WEAK); quency-escape-queen flag-off HOT baseline =
    Explore-Route kit over-credit (owner kit audit). (Mechanics SSOT pair refreshed to UNIGEO
    2026-07-22 — done.)

- **⇒ `fbext` BRANCH — MERGED to main 2026-07-22 (PR #17 `af0592b`, owner-confirmed).** Ordering fix +
  chip-gated FB-extension ladder + soda-twinkling-bunny's Hit Rate; the `soda-tb control` comp is
  graded (board 142 datapoints, boss NEUTRAL per owner — the recon's inferred Electric was wrong and
  would have handed both Iron units a ~10% advantage). The 4 formerly pre-merge items remain open as
  post-merge follow-ups: `docs/handoffs/2026-07-22-engine-work-plan.md` (FB-extension item).

- **⇒ SG-LANDING GEOMETRY: aim-circle method fix (`docs/data/sg-calc/`)** — all four owner rulings RESOLVED
  2026-07-22, scope collapsed to ONE workstream. Workstreams A + B are RETIRED (superseded by the live
  δ-offset cone — code-verified unreachable); discrete bands KEPT; the `k,c` range measurement is CLOSED as
  unobtainable (no in-game absolute-range readout — do not re-open). **Remaining:** rebuild
  `BAND_SG_HIT_FRAC` on the aim circle instead of the D=162 spread disc, then re-A/B `SGLANDING=geo` against
  a FRESH baseline (the plan's numbers predate the cone + rotation landings). Ground truth:
  `noir-sg-bands.json`. → DECISIONS 2026-07-22.

- **⇒ KIT-PARSE RECONCILIATION BACKLOG → `docs/handoffs/kit-parse-reconciliation-backlog.md`** +
  **ENGINE MODELING-GAP THREAD MAP → `docs/engine-modeling-gaps.md`.** The open tail of per-unit
  findings + the cross-unit cluster inventory (which primitives are built but not yet enacted per unit —
  all measurement/board-gated). Per-unit tier + finding SSOT: `data/kit-status.json`.

- **⇒ PATCH NOTES PENDING AT NEXT PUSH for roster-generator item 4** (merged to main 2026-07-24,
  `7ebc77b`, owner-approved — the perf plan is now CLOSED: items 0/1/2/3/5 in `5a50f78`, item 4 here;
  WHY in DECISIONS, A/B in `docs/handoffs/closed/2026-07-24-gen-item4-polish-ab.md`). Player-facing
  value is narrow — a measured NO-OP on the shipped full-pool config, +13%/a recovered team only on
  constrained (small-eligible-roster) pools — so the note should say that honestly rather than sell a
  speed/quality win. Earlier patch notes (`035465e`) already cover the item-0/1/2/3/5 search upgrade;
  both ship with the next push/deploy.

- **⇒ UNION-RAID GENERATOR — DEFERRED (owner ruling 2026-07-24) pending board stability.** Plan +
  precondition to resume: **`docs/handoffs/2026-07-24-union-raid-polish-plan.md` ON BRANCH
  `gen-union-item3`** (worktree `../nikke-sim-wt-gen-union-item3`, tip `7eb2174`; not on main).
  The owner-specified method is settled — build each boss's IDEAL team independently (heavy
  overlap on the meta supports is the INPUT, not a fault; the standard comps only emerge after
  re-allocation), then re-allocate ONLY the overlap by asking each claimant what it loses by
  conceding a contested unit — plus "any"-element rows (re-wire `weakness: null` from "none" to
  "ANY") and a "pick 3 bosses for me" control, backend first. **Deferred because judging the
  allocator needs a stable per-unit board:** the Water ideal differs from the standard comp by
  exactly ONE unit (`rapi-red-hood` over `snow-white-heavy-arms`, +13% with the same four
  teammates) while element advantage is only 1.1× on one unit's damage — a per-unit MARGIN
  question, not a search question. HYPOTHESIS, sim-only, NOT ENACTED. WIP code (typechecks, never
  run) on `gen-union-realloc-wip` @ `ddf304a`.
  **Already landed on `gen-union-item3` @ `cfad4df` and HELD, not queued for merge:**
  `topTeamsMultiBoss` extraction + build-order sweep + cross-boss polish, 10 tests, a `--union`
  bench arm, A/B artifact `docs/handoffs/closed/2026-07-24-union-multi-boss-ab.md` (+7.64% /
  0.00% / +9.58% on three boss triples at 3.4–4.0× wall clock; verify.sh + web:build + web-smoke
  green). It also carries a `web/src/simClient.ts` pool-init fix (the evaluator re-`init`s the pool
  per batch): workers hold ONE calc from the last `init`, so with several coordinators alive a batch
  could be simmed against another boss's cfg and silently return wrong damage. ⚠ **That hazard is
  LATENT on main, not live** — main's union loop awaits each `genBestTeam` fully, so only one
  coordinator ever exists at a time. It becomes reachable only with the multi-coordinator driver, so
  the fix travels WITH the union work; there is nothing to cherry-pick. ⚠ Union does NOT need the
  mint/prika post-pass — already a TEAM*CONSTRAINT.
  ⚠ **This branch was cut from `gen-item4`, which is now merged into main (`7ebc77b`) and its branch
  deleted** — so `gen-union-item3` rebases cleanly onto main whenever the work resumes.
  **⇒ UNION-RAID POLISH (open follow-up, spec written) → `docs/handoffs/2026-07-24-gen-item4-union-polish.md`**
  — findings half + the union build spec. `runUnionTopTeams` runs its own greedy loop over
  `genBestTeam` (one cfg PER BOSS), so it inherited nothing from item 4; the plan is to extract the
  polish driver out of `topTeams` and parameterize it per row. One hard constraint: **union must
  NEVER be sorted** (row \_i* is bound to boss _i_ — `shareUnionRoster` zips by index, so a sort
  mislabels bosses). The cross-boss accept rule is RESOLVED (raw sum — the app already reports the
  union roster as a plain damage sum, which IS union scoring); only score-vs-teamDamage remains, one
  line. Cheap pre-check before building any of it: does union greedy leave a team on the table on a
  constrained pool the way solo did?

- **⇒ ROLE-AUDIT FOLLOW-UPS → `docs/handoffs/2026-07-17-role-audit-followups.md`:** (1) custom-weaponry
  `role` sweep — mostly deflated by D; what's left = pierce-from-kit-text + (data-blocked) weapon-swap
  secondary-weapon row; (2) **anis-star dot-gauge re-model** then drop her `hitsPerShot` carve-out to 1
  (highest-value modeling fix; needs a measurement); (3) re-pin PH-water FB to 12 when the burst-cycle fix
  lands / after re-measure. Passive carries: next sync applies 18 behaviour-neutral `burstGaugePerShot`
  diffs; D.4 RL splash (multi-part scope only); E class-mismatch core-row guard (no current violator).

- **⇒ SEO — GSC redirect status explained (no fix needed) + SPA/SSR gap write-up (low-prio,
  owner unsure it's worth doing) → `docs/handoffs/2026-07-30-seo-notes.md`.** GSC's "Page with
  redirect" flag on the http:// variants is expected (Google confirming the 301→canonical works),
  not a defect. The bigger item is whether to prerender/SSR the docs/FAQ content so non-Google AI
  crawlers (GPTBot/PerplexityBot/etc., which don't execute JS) can see it — full detail + the
  Google-AI-Overview correction (it draws from Google's own already-rendered index, so SSR doesn't
  move that lever) in the handoff doc. Parked; revisit only if AI-citation/organic traffic to the
  docs pages becomes a priority.

- **⇒ VERIFY BOSS PROFILES (low-prio).** medium/large `bossPelletProfile` magnitudes are ⚑ UNVERIFIED
  (owner-chosen, not measured). dorothy-serendipity PH-water (766M) vs N9-redhood (328M) already DISAGREE on
  best fit (small vs medium), so profiles are plausibly per-boss — needs real per-boss SG footage to map boss
  silhouette → profile before any board use.

- **⇒ ENGINE REGRESSION FULL-BURST COUNT FAILURES — four comps disabled in `scripts/regression.ts`.**
  `iron sweep (run G)`, `T5 wind-weak`, `T1 wind-weak`, and `N3 scarlet/liberalio iron` all read 1–3 Full
  Bursts short of their video-measured counts on clean `HEAD`. They are temporarily skipped with a
  `disabled` flag so `bash scripts/verify.sh` stays green. Likely related to the open burst-generation
  timing increment family (`U29`/`U31`); re-enable once the underlying shortfall is fixed.

### Tier-0 open threads

- **`liter` 1.208 HOT ▲ — the new CONTROL REGRESSION suite (`npx tsx scripts/control-regression.ts`).**
  Four 720-kit-audit recordings sharing a constant support core (liter B1 / crown B2 / carry B3 / helm B3,
  slot 5 empty, boss Fire, focus = the slot-3 carry; carries = ada / maiden-ice-rose /
  scarlet-black-shadow / soda-twinkling-bunny). Damage-only — **FB counts deliberately UNGRADED** (none
  measured off these videos; do not pin one). Opening board: **liter 1.208** and TIGHTLY clustered
  (1.174 / 1.183 / 1.222 / 1.252) ⇒ carry-independent, i.e. her OWN kit, the top tuning target;
  **crown 1.051** (1.040–1.062, same shape, second). **liter's kit WAS reviewed 2026-07-23 (`/kit-tdd`,
  owner-driven, all 4 lines FAITHFUL — no fix; 11 pins in `scripts/tests/units/liter.test.ts`), so her
  1.208 is NOT a kit-encoding error:** her kit has ZERO self-damage lines, so her own damage is pure SMG
  weapon fire. **SMG is the only weapon class whose board mean is above 1.0** (1.058 — chisato 1.15 /
  quency-escape-queen 1.17 / little-mermaid 1.04 / nayuta 0.86, vs AR 0.965 / RL 0.967 / SR 0.973 /
  MG 0.942 / SG 0.875), so liter belongs to the **SMG weapon-model thread** (the ⚑ SMG lens pair, the
  quency-escape-queen cadence/+1.04 overshoot, chisato's excluded midfar HR22) — NOT to a per-kit retune.
  ✅ **ROOT-CAUSED 2026-07-23 — THE SMG CADENCE IS 20 ROUNDS/S, NOT 24.** MEASURED off the ammo
  counter (`idoll-ocean` focused): 10 rounds per 0.5 s, dead linear, in TWO range bands.
  MECHANISM: 1440 rpm = 2.5 frames/shot at 60 fps, and SMG is the **only** weapon in the roster whose
  datamined `rate_of_fire` isn't a whole frame count (census: every other rate is exact) — quantizing
  2.5 up to 3 frames gives exactly 20.0/s. This is why SMG is the only class with a board mean >1.0.
  A/B (`SMGQUANT=1`): **liter 1.208 → 1.031** (spread [1.222 1.183 1.252 1.174] → [1.039 1.000 1.067
  1.019]), chisato 1.154→0.975, quency-escape-queen 1.174→1.046, little-mermaid 1.042→0.967,
  idoll-ocean 1.166→1.018, helm 1.042→1.017; board ±5% 10→13; **all 11 measured FB assertions pass in
  both arms**, retiring the 2026-07-17 "24 holds every measured-FB comp" premise (FB counts measure
  gauge/sec, the ammo counter measures shots/sec). ⇒ **SO THIS TIER-0 THREAD IS EXPLAINED — liter needs
  NO retune.** Full record + A/B table: `docs/probe-runs.md` 2026-07-23.
  ✅ **FLIP LANDED default-ON 2026-07-23** (DECISIONS; supersedes the 2026-07-17 D.2 24/s adoption on
  instrument grounds; `docs/STATE.md` `SMGRATE` row; revert `SMGRATE=24`). The 6 red tests were resolved
  (modernia MG spend root-caused as a belt-clip fixture artifact; the 5 FB-count fixtures rebuilt on
  non-SMG/gauge-rich vehicles). ⚠ crown also carries many BOARD readings from `scripts/experiment.ts` — a retune
  must be A/B'd on `scripts/board-read.ts` too, not just this suite.
  **⇒ BOARD-WIDE FOLLOW-UPS FROM THIS PROJECT → `docs/control-regression-followups.md`** (the
  batch-and-stop landing zone: the `durationShots` carrier census, the `critRateNormalPct` census, the
  10-unit fit-exposure re-tune worklist, override-prose drift, and the suite's open board questions).
  **helm is DONE for now** — her kit was reviewed 2026-07-23 and both findings landed (DECISIONS ×2):
  `critRateNormalPct` (her allies Critical Rate is normal-attacks-only) and `durationShots` (her burst's
  "for 10 round(s)" is a real round count, not `durationSec 13`). Control suite 1.027 → 1.042, board
  0.961 → 0.973. Her carries' n=1 readings after both fixes: maiden-ice-rose 0.844,
  scarlet-black-shadow 1.106, soda-twinkling-bunny 0.901, ada 0.970 — NOT actionable alone.
  ⚠ **helm remains carry-SPREAD** (0.972 soda-twinkling-bunny … 1.093 scarlet-black-shadow): an
  interaction, NOT a flat kit offset, and neither fix addressed it. Do not tune her to the mean before
  the spread is explained.
- **`jill` re-tune at 0.919 COLD ▼** — her kit-faithful reload landed 2026-07-22 (DECISIONS; **A33 (U31)**),
  moving her 1.031 HOT → 0.919 COLD, so she is now the top per-unit re-tune candidate. Two riders: her
  burst's _"Normal attacks deal True Damage for 10 sec"_ is unmodelled, and the reload-speed **LOCK** she
  carries needs the clamp primitive (`docs/engine-modeling-gaps.md` §1b, same build as the 5e
  target-status gate). **`N1 rapi/quency wind` is now UNPINNED** (sim 12 vs video-measured 13, value kept
  in-comment in `scripts/regression.ts`) — a pre-existing burst-generation shortfall her fix UNMASKED,
  same family as **U29**. Do NOT close it by restoring her phantom fire rate.
- **isabel mid/midfar clock-drift re-derive** — the one SG-landing thread still open (per-unit landing +
  class table STAND; class-wide far 0.66 REJECTED — open-questions **U27**, split out of the now-closed
  U17 on 2026-07-22; the settled record is **A31 (U17)** in ANSWERED).
- **HR→core slope refinements** — `asuka` saturation bracket (circle10 vs SAT=1); quency-escape-queen
  cadence + the +1.04 overshoot; slope validation via an existing measurement (`soda-tb-control`). Live
  model: `docs/STATE.md` §4.
- **AR-burst-window residual (moran/jill)** — footage-blocked. moran's swap coldness is THROUGHPUT
  (~1.3× more hits in the swap window), NOT per-shot (the '1440'=24/s datamine was measured-refuted; base
  ~12/s stands); needs an isolated moran-solo recording or the swap weapon's `shot_count` datamine.
- **Per-unit rotation re-tunes (answered-questions U16)** — RESOLVED 2026-07-26: the rotation
  over-generation is settled (DECISIONS 2026-07-21); the per-unit over-models (chisato, trina, naga,
  soda-twinkling-bunny) are rotation-independent and tracked as standard hand-tune queue items.
- **Blanc same-squad CDR override cleanup** — `src/skills/overrides/blanc.json` currently models the
  S2 "ally from the same squad still on the battlefield" CDR (40.76s) as unconditional because nobody
  dies at scope lock. The buffer-rank `w/ Bunny` profile works around this by suppressing the CDR in
  Blanc's plain row and keeping it active when the synthetic Bunny partner is present. The engine/
  override should instead gate the CDR with a `teamHas` slug condition (or a proper squad primitive)
  so the plain row is naturally inert without the partner and active with the partner. Out of scope for
  the current rank-board PR; the buffer-code workaround (`blancNoCdrOverride` in
  `src/ranks/buffer.ts`) should be removed once the override/engine is fixed.
