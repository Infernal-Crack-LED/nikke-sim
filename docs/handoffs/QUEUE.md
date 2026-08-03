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

- **⇒ CHARACTER LANDING PAGES — phase 1-3 landed on branch `character-pages` (worktree
  `../nikke-sim-wt-character-pages`), NOT merged, NOT pushed.** Plan +
  landed/open split: `docs/handoffs/2026-08-02-character-landing-pages-plan.md`. Open:
  1. **Owner design pass on `/unit/maiden-ice-rose`** (phase 4) — layout, density, section order;
     the ⓘ badge glyph on the roster grids is a placeholder (↗ may read better). Shots:
     `PORT=<free> SHOTS=unit-,characters-index,teambuilder-profile OUT=/tmp/unit-shots node
scripts/ui-shot.mjs`.
  2. **Owner sign-off on `data/unit-pages.json`** — a NEW generated artifact in the protected
     `data/` dir (no existing file touched).
  3. Spot-check a spread of units (untuned, no-OL-data, `simSupported:false`, Λ burst) before merge.
  4. Prerender `/unit/*` + `/characters` (`scripts/prerender.ts` covers only /howto,/mechanics) and
     extend `unitStaticHtml` in BOTH servers to emit the new sections for no-JS crawlers.
  5. Thin-content policy → moved to **[docs/seo-followups.md](../seo-followups.md)** (see the
     dedicated SEO item below).
- **⇒ SEO FOLLOW-UPS — deferred pending a real crawl: [docs/seo-followups.md](../seo-followups.md).**
  Search-visibility decisions that are NOT answerable from the repo. Nothing to do until Search
  Console has ~4-6 weeks of data; the doc carries the measurement, the options and a 4-step
  decision rule so the call is decidable rather than open-ended.
  - **Thin-content policy for the low-data unit pages.** Measured
    (`MEASURE=1 node scripts/unit-page-check.mjs`): no page is under 300 crawler-visible
    characters and only **17** are under 500 — short-kit starter/NPC units, NOT the 85
    unsimulated ones (median 616). That killed the originally-planned rule: **do not gate the
    sitemap on `simSupported`**, it does not track thinness. Recommendation is do nothing.
  - Also tracks `sugar`'s wrong card release date (item below) and records the settled calls —
    prerendering `/unit/*` was REJECTED, sitemap coverage is complete — so they don't get
    re-litigated.

- **⇒ DATA BUG: `sugar.releaseDate` is her Treasure date, not her release (found
  2026-08-02).** She reads **2026-07-23**; her true release is **2022-11-04** (NIKKE's
  global launch), which `characters.json` held correctly until commit `fda93643`
  ("updating for maxwell", 2026-07-31). `releaseDate` is copied straight from upstream
  (`src/data/sync.ts:282`, `a.releaseDate ?? null`), so the fix belongs in bakery-bot /
  the synced source — `data/` is protected and regenerated.
  - **NOT a rule about Treasures.** `flora`, `rosanna` and `phantom` got their Treasures
    in the same batch (all four flipped `treasure: true` together on 2026-07-28) and all
    three kept correct dates. It is a per-unit anomaly; the mechanism is upstream and
    was not determined from here.
  - **The same commit was a release-date fix-up pass** and moved five values:
    `drake` 2022-11-04 → 2025-01-16 and `helm` 2025-01-16 → 2022-11-10 (both look
    CORRECTED), `laplace-ultimate-hero` → 2026-07-23 and `maxwell-ordinary-mechanic`
    → 2026-07-30 (both correct, genuinely new), and `sugar` → 2026-07-23 (broken).
    Two units having previously held each other's dates suggests the upstream
    release-date mapping has had alignment trouble before — worth auditing the whole
    column, not just this row.
  - **Blast radius:** the unit card's "Released <date>" line (`unitCardData`) states the
    wrong date for `sugar`. The /characters "New Characters" row is defended (it
    excludes `treasure` entries); the card is NOT.
- **⇒ OL TOOLING — two remaining basis gaps, findings-only (Hit Rate half RESOLVED
  2026-08-02).** The exhaustive free-line table now agrees with `data/ol-optimal.json`'s
  greedy pick on 32/73 units (was 20). The Hit Rate cause is closed: owner ruled Hit Rate
  counts for AR/SMG/SG and not RL/SR/MG, `src/olconfigs.ts`'s pool was updated to match the
  engine's own `HR_CORE_CIRCLE` set, and
  `scripts/tests/engine/ol-hitrate-pool.test.ts` pins the pool against measured engine
  behaviour. Still open, one batched decision:
  1. **Tier basis (23 units)** — `build-ol-optimal` passes no tier values so it optimizes at
     MAX ROLL, but the web applies its picks at T11. Pick one basis.
  2. **Greedy local optima (18 units)** — `bestOl` finds a worse combo than the exhaustive
     search at the same tier and pool. Decide whether `ol-optimal.json` should just use the
     exhaustive ranking for the weapon-aware pool.
- **⇒ B1/B2 DPS RANKING BOARD — LANDED 2026-08-01 (PR #54), three small follow-ups deferred:**
  1. Register rank-board synthetics (the `noop-*` controls and any future real-unit stand-ins) in
     a shared registry (`src/ranks/synthetics.ts` or a new `RANK_SYNTHETICS` record) instead of
     the current ad-hoc special-case in `src/ranks/b1b2dps.ts`.
  2. Hoist the duplicated B1B2 cell union / array / default from `src/ranks/b1b2dps.ts`,
     `src/infographics/core/rankTables.ts`, `web/src/rankBoardsData.ts`, and `web/src/builderSpec.ts`
     into one canonical export.
  3. Reconcile / document cross-board comparability details against the B3 DPS chart Solo cells
     (`bossDef`, `rangeBonus`, `durationSec`) and clarify the "Core 100" cell label (core hit rate
     vs core enhancement). See closed handoff `docs/handoffs/closed/2026-08-01-b1b2-dps-rankings.md`.
- **⇒ Un-skip the `loadouts-parity.test.ts` `topTeams(5)` byte-parity case on the fast basis** —
  filed 2026-08-02 from the cross-family code review (claude-opus-5) of the generator-test speedup
  (branch `kimi/speed-up-generator-tests`; packet + result JSON in
  `scratchpad/gates/2026-08-02-speed-up-generator-tests/`). The skip comment (2026-07-26) says the
  case is skipped PURELY for runtime (~165s doubled call vs the 300s vitest ceiling under CPU
  contention) and TODOs "narrow the pool here or give this file its own longer timeout"; the file
  now runs on `fastCfg` (30s fight), which is exactly that fix. Un-skip, measure on the 30s basis,
  then delete or rewrite the now-stale skip comment.
- **⇒ `build-dpschart.ts` worker-pool robustness — 3 findings filed from a CLEAN cross-family
  review** (kimi-code/k3, 2026-08-01; packet + both result JSONs in
  `scratchpad/gates/2026-08-01-deploy-build-timeout/`). All three are on already-failing or
  currently-unreachable paths, which is why they did not block the merge:
  1. **Sibling workers are not killed when one rejects** (`spawnWorkers`). `Promise.all` rejects on
     the first failure, but the other children keep simulating to completion — or crash writing
     `out-*.json` into the directory `.finally()` just removed — and the parent exits leaving them
     running. Fix: keep the child handles, `kill()` the rest on first rejection.
  2. **`rmSync` in the `.finally()` can mask the real error.** If it throws (EPERM/EBUSY on a shared
     build box) on the failure path, it replaces `dpschart worker N exited X` — the diagnostic you
     actually need. Fix: wrap the `rmSync` in try/catch.
  3. **`IS_WORKER` needs BOTH `--rows` and `--rows-out`;** a child given only one silently falls
     through to the full main path (hashing, candidate fetch, inline simulation of every row) and
     writes to the default out path. Unreachable from the current parent, which always passes both —
     robustness only. Fix: error when exactly one is present.

- **⇒ DOT-TICK/FILLGAUGE BURST-GAUGE PAIR — BOTH RESOLVED 2026-07-30.** Fix A (dot-tick concurrency
  election): REJECTED — owner-supplied footage (`docs/probes/burst tests/Raven Solo Burst Gen.MP4`)
  settled U37 against it; see `docs/answered-questions.md` U37 +
  `docs/handoffs/scientific-method-harness.md` 2026-07-30 follow-up. Worktree
  `worktree-agent-aab3a19427393feb2` discarded, not merged. Fix B (`fillGauge` chain-lock parity):
  **IMPLEMENTED** — owner ruling confirmed the mechanism, full `/scientific-method` pass (2-of-2
  ACCEPT, both HIGH), landed on main (see `docs/DECISIONS.md` 2026-07-30 entry). Still open: spot-check
  `bready`/`diesel-winter-sweets` (newly-found stacking-dot units, ungraded) whenever a future dot-gauge
  change lands.

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

- **⇒ ENGINE-WORK ORDER (read FIRST before resuming per-kit retunes).**
  The remaining engine work ranked by BLAST RADIUS, with
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
  **⇒ 2026-07-30 PELLET-READER REBUILD — the plan of record is
  `docs/handoffs/2026-07-30-pellet-reader-implementation-plan.md` (START HERE block at the top;
  prior-art + sources in the companion `…-solution-survey.md`). Findings-only, nothing enacted.**
  A fresh session should read the plan first — these are only the headlines:
  - **Error budget (the target, computed):** U35 needs ±0.5 pellets/10 discrimination; at n≈40
    shots/band a per-shot random SD of **±1.5 pellets is tolerable**, but per-band **bias must be
    ≤ ±0.25 pellets/10**. The counter is ~10–20% cold = 0.8–1.6 → **3–6× over budget on BIAS.**
    ⇒ **Chase bias, not variance.** Stop when bias is inside ±0.25 against an independent anchor.
  - **Owner pellet-lifecycle spec (60fps, 13 frames)** now governs: f1 small w/ shadowed surround →
    f3–4 peak (2×, **pellets occlude — least readable**) → f5–11 shrink to 1× → f12–13 fade.
    **Readable frames are f1 and f8–11.** Corroborated: the spec predicts an area-decay curve that
    matches a run16 measurement taken before the spec existed.
  - **Design: PROCESS all 13 frames, COUNT on ~5.** Identity from the full lifecycle curve (the first
    discriminator that is _not_ per-component — the record's hardest dead end was "no per-component
    filter separates blips from pellets"); counting at f1+f8–11; shared-t0 per blast collapses the
    area gate from a 30× band to a ~2.5× per-frame expectation.
  - **Superseded by measurement:** per-frame detection is **adequate** (7–10 vs 7–9 ground truth), so
    detector replacement is an _enabler_, not the fix. The 2026-07-29 REJECT **conflated two faults** —
    `guilty`/`isabel` never localized (3 shots/180s), `noir` ran fine but cold; do not read
    guilty/isabel as evidence about counting.
  - **Unblocked, no footage, all free:** 0.1 cherry-pick the `+62.5` crosshair-offset fix (`b69b5c6`)
    that never merged — `main` still has `−62.5`, latent, poisons the next run (it did **not** cause
    the 07-29 REJECT: artifacts 12:19–13:33, commit 15:17) · 0.5 lifecycle stability on `noir`
    (one run; gates the one-template-fits-all-units assumption) · 0.6 are the missed shots
    **selected** (bias) or random (harmless)?
  - **⚠ Reproducibility gap:** the 07-30 numbers came from `scratchpad/pellets/run16/` — untracked.
    `scripts/probe/analyze-pellet-tracks.py` is committed but its input is not; distill a fixture
    before leaning on them further (constraint 9).
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
- **Same-squad primitive migrations** — the squad primitive LANDED 2026-08-02 (DECISIONS.md):
  `teamHas.sameSquad` resolves squad membership from the curated map `src/data/squads.ts` (fail-closed;
  validator rejects an unmapped owner) and blanc's S2 CDR is gated on it (squad = noir+rouge ONLY,
  owner-confirmed — the bunny/maid units are a different squad; the buffer-board `blancNoCdrOverride`
  workaround is gone and the `w/ Bunny` profile is now `w/ Rouge`, a synthetic no-op Rouge B1 whose
  PRESENCE opens the gate). Remaining units with "same squad" kit text, for adoption:
  - `noir` (burst block 3) — uses the older `teamHas.slugs:['blanc','rouge']`; drop-in migration to
    `sameSquad:true` (identical extension — the curated squad is exactly blanc+rouge). Mechanical;
    noir's N5 kit test discriminates either spelling, so it pins the gate, not the facet.
  - `anchor-innocent-maid` (S1 block B heal gate) — currently modeled always-satisfied (override
    caveat). BLOCKED on an owner ruling for her squad membership (the maid costumes — mast-romantic-
    maid, privaty-unkind-maid — are the candidates; NOT verified). Once ruled: add the squad to
    `src/data/squads.ts`, gate the block, rewrite the caveat.
  - `ram` (S1 "Full Burst ends with an ally from the same squad") — no override yet (not
    simSupported); collab-unit squad unknown — confirm before authoring the gate.
  - `emma-tactical-upgrade` / `eunhwa-tactical-upgrade` (S2 "affects all allies from the same
    squad") — TARGET-SET pattern, not a gate: owner precedent (eunhwa-tu override note) encodes
    same-squad targets as plain `allies` (the sim fields exactly one deployed squad). No migration
    needed unless a future ruling disagrees; listed for completeness.
  - Review follow-ups (claude-fable-5 code-review NOTEs, 2026-08-02, verdict CLEAN; packet +
    result: `scratchpad/gates/2026-08-02-squad-primitive/`): (a) `validate-overrides.ts` should
    allowlist the keys INSIDE `teamHas` (element/class/weapon/burst/slugs/sameSquad) — a typo'd
    facet key (e.g. `samesquad`) is silently ignored by engine + validator today, leaving the
    block always-active, one typo away from the dead-authoring failure the sameSquad guard
    prevents (pre-existing gap for all facets); (b) type `sameSquad?: true` instead of `?: boolean`
    in `src/skills/types.ts` so the compiler enforces the validator's literal-true contract;
    (c) optional layering cleanup — keep `src/data/squads.ts` pure game truth and register the
    `noop-rouge-b1` synthetic from the ranks layer instead of listing it in the game map.
