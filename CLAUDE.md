# CLAUDE.md — nikke-sim

> New session: read this first. **It is the full handoff.** A fresh session should be able to
> continue from this file alone (plus the auto-loaded memory index). For "what does the sim do
> RIGHT NOW" (live flags, constants, rotation model, kit primitives), read
> [docs/STATE.md](docs/STATE.md) — the current-state registry — not the DECISIONS changelog.
>
> **Handoff convention:** every live/deferred TODO or "next steps" list MUST live in the
> [NEXT INCREMENT](#next-increment--live-action-items) section below — chat is ephemeral, only
> files carry across sessions. Landed current state → `docs/STATE.md`; research threads →
> `docs/open-questions.md`; settled WHY → `docs/DECISIONS.md`; the actionable **live TODO → here**.

## What this project is

A frame-tick damage simulator for NIKKE solo raids, run by its owner on a Mac. The sim predicts
per-unit damage for 5-unit teams over a 180-second fight against the raid boss; the owner records
real fights (screenshots + video) under a fixed "scope lock" preset and we drive sim-vs-real error
toward **±3% per unit**. There is also a web UI (Vite/React) that runs the same engine client-side,
and a community-facing docs layer. Current board: median ~0.93–0.99 across 86 unit readings, with
rotation (full-burst counts) measured-exact on all graded comps.

## Hard constraints (do not violate)

1. **Never commit `.env` or `.git-credential-pat.sh`** (gitignored; hold DB URL + a fine-grained
   PAT). Pushes authenticate as the repo-local PAT identity, not the global gh account.
2. **Never _push_ unless the owner asks — but committing is ENCOURAGED: commit early and often.**
   Local commits are cheap and reversible; only pushing to a remote is owner-gated. Applies to BOTH repos
   (public `.git` only): commit freely as work lands; `git push` / PRs wait for the owner.
   (Constraint 1 still holds — never commit `.env` / the PAT helper.)
3. **Measured constants are never refit** (MG wind-up ladder, 22-frame release latency, boss range
   script, bar-render calibration, post-full-burst 3s chain delay, popup-verified values).
   Calibrated ⚑ values are the refit candidates — see evidence tiers in
   [docs/CONVENTIONS.md](docs/CONVENTIONS.md).
4. **Human-facing docs use no invented abbreviations** (docs/data/\*, open-questions, probe-runs,
   DECISIONS); AI-facing docs (handoffs, override notes) may use shorthand.
5. **`bash scripts/verify.sh` green before any _push_** (commit freely without it — see #2 — but the
   tree must be green before it leaves the machine); snapshot regeneration (`scripts/regression.ts
--update`) only together with the change it reflects, never to silence an ununderstood failure.
   Measured-truth asserts are never updated without a new measurement.
6. **Do not re-litigate [docs/DECISIONS.md](docs/DECISIONS.md)** — reversing an entry needs new
   evidence of at least the same tier.
7. **NEVER discard working-tree changes with `git restore` / `git checkout -- <path>` / `git reset
--hard`.** This worktree is SHARED by multiple concurrent sessions; those commands reset files to
   HEAD/index and **irrecoverably destroy other sessions' uncommitted work** (on 2026-07-21 a
   `git restore src/engine/sim.ts` provably wiped a concurrent session's in-flight pellet code — no
   reflog recovers unstaged discards). To undo YOUR OWN uncommitted changes, use `git stash` (recoverable
   via `stash pop`/`apply`) or surgically reverse only your exact edits with the Edit tool. Assume every
   tracked file may hold another session's uncommitted work; prefer committing/stashing over discarding.
8. **Engine (and other high-contention protected-content) edits happen on an ISOLATED worktree, not the
   shared main tree.** For any change to `src/engine/**` — and generally any `data/**` / `src/skills/
overrides/**` edit while other sessions may be active — do the work in a dedicated git worktree/branch,
   verify it there (`scripts/verify.sh`), then bring it back by commit/merge/cherry-pick. Create it via the
   Agent tool's `isolation: "worktree"`, or `git worktree add ../nikke-sim-wt-<topic> -b <topic>` (public
   `.git`), and remove it when done. The shared main directory is for reads and for landing already-isolated,
   verified changes — never make the engine edit directly there mid-session, since a concurrent writer or a
   later tree-reset will collide with it (root cause of the 2026-07-21 clobber). This isolates the whole
   edit→verify→A/B loop from concurrent work instead of racing on one tree.

## Verified facts (do not re-derive)

- (2026-07-13) Scope-lock validation basis + single-run repeatability 0.5–3.5%/unit; ±3% goal is
  judged on multi-run averages with a declared camera-focus unit.
- (2026-07-13) Full-burst counts are cooldown/chain arithmetic — deterministic run-to-run except
  boss-transition/chain collisions. Graded comps pinned in `scripts/regression.ts`.
- (2026-07-13) The camera-focused unit's charge weapon generates ×2.5 burst gauge (focus-only,
  measured both ways); focus defaults to the middle slot.
- (2026-07-13) Burst-cast damage lands before Full Burst begins (no +50%, no entry auras).
- (2026-07-21) On end-of-fight **Battle Records** damage screenshots the crossed-swords (⚔) number
  per unit is **Combat Power, NOT ATK** — never use it as a sim ATK input. Community submission
  footage therefore carries no usable per-unit ATK; magnitude stays confounded, so weight rotation/
  full-burst counts + mechanical kit-faithfulness (stat-independent) for enactable findings.
- The full mechanics inventory with tiers and sources: [docs/data/game-mechanics.md](docs/data/game-mechanics.md);
  the exact sim math: [docs/data/damage-calculation.md](docs/data/damage-calculation.md).

## Current build state

- `src/engine/sim.ts` — the engine: damage buckets, weapon fire cycles + MG wind-up/down, charge
  weapons + release latency, burst rotation state machine (chain windows/expiry, ~2.5s post-FB delay,
  first-ready in-window selection, the measured gauge-full→30f→B1→30f→B2→30f→B3→22f→FB chain timing,
  boss-transition cast blocking), gauge v4 (datamined per-shot,
  focus bonus, kit quirks), buff engine (same-caster-slot overwrite), optional seeded Monte Carlo
  (`cfg.seed`), debug taps (`DBG_UNIT/DBG_N/DBG_BUFFS/DBG_GAUGE/DBG_CD` env).
- `src/skills/` — kit parser + 67 per-unit override JSONs (each with an evidence note);
  `validate-overrides.ts` checks them all.
- `data/` — characters.json (synergy API sync), gauge-per-shot.json (datamined),
  cubes/ol/skill-levels.
- `scripts/experiment.ts` — the validation lab: all real comps + ratios; env: `ONLY=` (one comp),
  `ROT=1` (rotation log), `SEEDS=N` (Monte Carlo mean ± sd + FB distribution), `DBG_*`.
- `scripts/regression.ts` + `scripts/verify.sh` — the gate (see constraints).
- `web/` — client UI; `npm run web:build && node scripts/web-smoke.mjs` is the smoke.
- `docs/` — mechanics source-of-truth pair + detail docs, open-questions (community-bound),
  probe-runs (measurement log), DECISIONS/CONVENTIONS, handoffs (AI-facing),
  probes/ (recordings, gitignored media).

## Discipline forcing-functions (2026-07-16)

- **PreToolUse discipline hook** (`.claude/hooks/pre-write-discipline.sh`, wired for Edit/Write/Agent):
  on any load-bearing write or subagent spawn, injects an 8-point checklist — exact-slug (runs
  `scripts/lint-slug-disambiguation.ts`, which flags a bare base-name + lists the variants),
  measured>fudge, whole-vs-shard, prove-it-differently (independent-method verification), the
  premise-gate nudge (fresh-context re-derivation of load-bearing premises before an empirical-test plan),
  the full-context gate, **evidence-proportionality/measurement≠enactment (point 7)**, and
  **batch-and-stop for sweeps (point 8)**. Its trigger set now covers `docs/data/` (sg-calc + mechanics
  plan docs) and `CLAUDE.md` (the 2026-07-18 plan-rewrite escaped because sg-calc was uncovered), and it
  ESCALATES when the incoming write contains a verdict-verb (VALIDATED/REFUTED/SUPERSEDED/…).
- **Subagent non-negotiables** (`.claude/subagent-non-negotiables.md`): paste at the TOP of every
  subagent prompt (referenced by the kit-parse skill). And VERIFY YOUR OWN PREMISES before spawning —
  a wrong premise poisons every downstream agent.
- **Premise gate (scientific-method harness step 0)**: premise-stage drift is the driver's worst
  failure mode (both documented breaks were premises, not plans). Before writing an empirical-test
  plan, each LOAD-BEARING premise (anchor identity / basis cleanliness / ground-truth value / reused
  prior result) is re-derived by a FRESH-CONTEXT premise-verification subagent from primary files,
  BLIND to the driver's belief — CONFIRM before the plan rests on it, else fold it into the test. Full
  spec: the **`/scientific-method` skill** step 0, which spawns the durable
  `Agent(subagent_type:'premise-verifier')` (opus) — one per premise, packet = the neutral QUESTION
  only. The hook's point 5 nudges it at spawn time.
- **Evidence-proportionality / MEASUREMENT ≠ ENACTMENT (hook point 7)**: the action's tier must not exceed
  the evidence's tier. A single fight / n=1 / one recording / a MEDIUM-confidence read is HYPOTHESIS-strength —
  it RECORDS an observation (measurement log / open-questions UNANSWERED), and NEVER in the same motion changes
  a constant/default, rewrites a plan's DIRECTION, stamps VALIDATED/REFUTED/DELETE/SUPERSEDED, or overturns a
  DECISIONS entry. Those require ≥ same-tier evidence at n≥5 (the board standard) OR an independent-method
  confirmation, AND a separate gated enactment pass (fresh context + Fable + full-board A/B + owner) — never the
  session that discovered it. A model output disagreeing with reality localizes the fault to the MODEL-AS-A-WHOLE,
  not to one premise; don't attribute a composite gap to a single knob without an experiment that ISOLATES it.
  (2026-07-18: one `quency-escape-queen` reading rewrote a whole plan + flipped an engine default — reverted; this rule + the
  hook's verdict-verb escalation are the guard.)
- **⚖ SUFFICIENCY / REUSE BEFORE YOU DERIVE (2026-07-25, owner-directed) — the OTHER HALF of the rule above,
  and it is equally binding.** Every evidence rule in this file states a FLOOR and, until now, no CEILING —
  so the compliant reading of "prove it differently" was always _"not yet, go derive more"_, with no
  stopping point. That is a real and expensive failure mode, not a hypothetical: on 2026-07-24 a review of
  the local VLM/OCR reader spent ~5 hours and ~6% of a weekly quota hand-reading 7 videos frame-by-frame to
  re-derive validation data **the regression harness already held**, instead of running the reader script
  and scoring it against the existing labeled set. Nothing was violated — the rules asked for it. Therefore:
  1. **An existing labeled artifact in this repo IS an independent method.** `scripts/tests/**` vitest pins,
     the regression snapshot, `docs/probe-data/*.json`, `docs/probe-runs.md` measurements, `data/*.json` —
     their labels were produced independently of your current derivation. Running the existing harness
     against them IS the validation, not a shortcut around it.
  2. **SEARCH BEFORE YOU DERIVE — the lookup is one file: [docs/VALIDATION-INDEX.md](docs/VALIDATION-INDEX.md).**
     It maps "I need ground truth for X" → "it is already at Y, score it with Z", and has a dedicated
     section for validating a READER (OCR/VLM/CV). Check it BEFORE any expensive ground-truth generation.
     If one exists, use it and you are DONE. If none exists, say so explicitly, state the cost BEFORE
     starting, and prefer building a reusable committed fixture over a one-off hand derivation.
  3. **When the bar is MET, the instruction is ACT** — land it with the tier stated. "A further experiment is
     conceivable" is not "the evidence is insufficient". Do not escalate a met bar into a larger investigation.
  4. **State what would be sufficient, up front**, so the question is decidable instead of open-ended.
     ⇒ The `/scientific-method` pipeline gates **damage-model values**. Tooling, scripts, readers, tests and docs
     are NOT that surface and never require it — `verify.sh` + the existing fixtures are their gate.
- **Batch-and-stop (hook point 8)**: a roster / multi-unit sweep (kit audits, board reads, the 70-unit pass)
  produces FINDINGS-ONLY per unit — like the kit-status AUDIT (none enacted); it does NOT edit shared/load-bearing
  artifacts (engine, DECISIONS, plan docs, snapshot). A cross-cutting signal across several units is a reason to
  STOP and surface ONE batched proposal to the owner, never to enact a sweeping shared change mid-sweep.
- Habit: do P0-sensitive work (measurements, DECISIONS overturns, "which unit is the anchor") in
  fresh/recently-compacted sessions, not 500k deep; open plans/measurements with a verified-facts block.

  ## Protected paths — DO NOT EDIT without explicit owner approval

These paths are load-bearing for the sim's accuracy guarantees. **Never modify them** unless the owner explicitly asks:

| Path                                | Why protected                                               |
| ----------------------------------- | ----------------------------------------------------------- |
| `.claude/**`                        | Claude Code's own config, hooks, skills — hands off         |
| `src/engine/**`                     | Frame-tick sim core — any change shifts every unit's damage |
| `data/**`                           | Datamined/game-DB source of truth                           |
| `src/skills/overrides/**`           | Hand-verified per-unit kit models                           |
| `scripts/regression-snapshot*.json` | Pinned regression baselines                                 |

## Conventions

- See [docs/CONVENTIONS.md](docs/CONVENTIONS.md) — evidence tiers, validation methodology,
  verify discipline, doc audience/location/hygiene rules.
- Skills by task area: **any empirical test / engine-constant change / verdict stamp → `/scientific-method`**
  (the procedure of record — premise gate → Fable pre-op → work → driver gate → BLIND Fable post-op →
  2-of-2 → IMPLEMENT/LOG/REJECT → **step 7 PR-style review of the landed code**; drives the
  `premise-verifier` / `preop-judge` / `postop-judge` / `implementation-reviewer` agents in
  `.claude/agents/`); **per-unit kit work (model/re-model/re-tune from kit text) → `/kit-tdd`** — the
  test-first session that is now the PRIMARY kit build path (TDD transition step 3), demoting
  `/audit-kit` + `/kit-parse` to post-validation sampling / untuned-unit baselines;
  processing a recording → `/probe-processing`; engine/data changed →
  `/mechanics-doc-upkeep`; after any non-trivial change → `/skill-maintenance`; before a PR/push
  to `main` → `/patch-notes` (drafts player-facing patch notes from DECISIONS for the web Dev
  page; a PreToolUse hook nudges on `git push` / `gh pr create`); full-roster sim-only batteries
  - blast-radius diffing → `/sim-battery` (scripts/battery/); top-ranker team/roster snapshots
    from enikk.app → `/enikk-audit` (scripts/enikk/); building teams to record for override tuning
    → `/hand-tune-batches`; publishing recording asks for owner-unowned units → `/testing-requests`
    (web Testing Requests page; uses `/hand-tune-batches`); mining recurring patterns ACROSS
    hand-tunes into reusable modeling priors → `/tuning-priors` (docs/modeling-priors.md).

## Doc taxonomy (two classes — hygiene attaches to the class, see docs/CONVENTIONS.md)

- **CURRENT-STATE** — freely rewritten; stale content is DELETED (capture the fact in a changelog
  doc first, then delete). No history accumulates. Members: `docs/STATE.md`, `docs/data/*.md`,
  `docs/CONVENTIONS.md`, `docs/modeling-priors.md`, `docs/engine-modeling-gaps.md`, `docs/VALIDATION-INDEX.md`, `CLAUDE.md`,
  open `docs/handoffs/*`, open-questions **UNANSWERED**, the backlog/ledger docs, **and the prose
  fields of every override — `src/skills/overrides/*.json` `note` / `caveats` / `unmodeled`.**
  - **⇒ OVERRIDE PROSE DESCRIBES THE UNIT AS IT IS MODELED TODAY — NOTHING ELSE (2026-07-22 owner
    ruling).** An override's `note`/`caveats` state the CURRENT model: what is implemented, what is
    deliberately unmodeled, what is measurement-gated, and the evidence tier behind each live value.
    They carry **NO history**: no "the old premise was X, now STALE", no "previously believed inert",
    no "REFUTED/reverted on <date>" narration, no superseded-value trail. **Delete that wording on
    sight** (capture-first: the WHY belongs in `docs/DECISIONS.md`, which is where a reader goes for
    it). Rationale: superseded narration retained in-file reads as a live claim to every future agent
    and to the greps that scan for open gaps — it manufactures phantom findings and costs a
    verification pass each time it is re-encountered.
- **CHANGELOG** — append-only, immutable, `SUPERSEDED (date) — disregard` in place, never delete
  (the provenance trail). Members: `docs/DECISIONS.md`, open-questions **ANSWERED**,
  `docs/probe-runs.md`, `web/src/patch-notes.json`, `data/sources.json`, the `closed/` archives.

## Docs authority order

1. `docs/STATE.md` — what is current/landed (the default first read; a derived index — if it
   disagrees with code or the latest DECISIONS entry, STATE.md is the bug, fix it there).
2. `docs/DECISIONS.md` — settled WHY + when; wins on "should we change this?" (do not re-litigate).
3. `docs/data/game-mechanics.md` + `docs/data/damage-calculation.md` — the mechanics source-of-truth
   pair; live engine code wins on "what does the sim do?" — if they disagree, the doc is the bug
   (fix via `/mechanics-doc-upkeep`).
4. `docs/open-questions.md` — genuinely unresolved (UNANSWERED) + the evidence trail (ANSWERED).
5. `docs/handoffs/*` — session state, AI-facing; superseded by anything above.
6. Everything else. The "mark `SUPERSEDED (date)`, never silently delete" rule applies to
   CHANGELOG-class docs only; current-state docs delete stale content outright.

## NEXT INCREMENT — live action items

> **This section carries ONLY genuinely-open action items** as short pointers into their handoff/plan
> docs — no landed-work narration (landed state → `docs/STATE.md`; settled WHY → `docs/DECISIONS.md`).
> HYGIENE (the `.claude/hooks/commit-state-hygiene.sh` nudge fires on commit): when an item lands,
> DELETE it here (keep only its open follow-up clause); a done handoff → `CLOSED (date)` marker + `mv`
> into `docs/handoffs/closed/`; a fully-landed top-level `docs/*.md` (never a living log) → same into
> `docs/closed/`.

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
  `idoll-ocean`'s ATK basis reading **~1.4% low** against a 7694 popup, which would mean her
  owner-supplied 0★/core 0 ceiling is slightly off (**open-questions U33** — settle by lattice, never
  by tuning the ceiling).
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
    listed under §1d in the plan doc — build them as step-2 tests need them. Open:
    (2) engine-primitive test backfill by census priority (before
    per-unit work); (3) per-unit dedicated sessions, OWNER drives the spec line-by-line from kit text —
    **run them with the `/kit-tdd` skill** (created 2026-07-23; the operational form of the plan's step 3:
    slug gate → owner-driven spec table → RED test against the SHIPPED override → gated fix → board A/B);
    (4) audit-kit/blind-rebuild demoted to post-validation sampling. Rationale: the board gates
    FIT only; faithfulness errors of a few % (helm's `critRateNormalPct` mis-scoped generic, her
    round count faked as `durationSec`) are absorbed by calibration and only unit tests can gate them.

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
  open; take the one hard range measurement first); (4) A2/U20 same-cast self-buff (16 units, footage-gated);
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

- **⇒ KIT-AUDIT IMPLEMENTATION PLAN → `docs/handoffs/2026-07-20-kit-audit-implementation-plan.md`.**
  Phase C continues from `elegg-boom-and-shock`. Open, all measurement/footage-gated: the A4 primitive
  build-order (state machines — do NOT bulk-land); the soda-twinkling-bunny FB-extension + jill
  trueNormals gated enactment passes; scarlet-black-shadow in-burst per-phase proc count (needs
  isolated-burst footage); moran swap-window throughput (needs isolated moran-solo); chisato's PI/PI2
  reenterStage attribution re-derive (code-verified inert). ⚑ dorothy-serendipity landed-consolidation
  switch contradicts her measured solo count (~55–64) → solo re-validation before it's fully trusted.

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
  `marciana` recording (U35). Then: owner core
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

- **⇒ ROSTER `simSupported`-EXPANSION BACKLOG.** rei (`rei`, ≠ `rei-ayanami`) is `generatorSupported`
  but has no override → excluded from DPS/generator tools until one is authored; the other ~117
  unsupported units are the kit-parse-rollout expansion backlog (not started).

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

- **⇒ MINT/PRIKA KIT FIX (owner-flagged "coming soon", 2026-07-24) must ALSO add the
  "prika bursts first, then only mint" rotation config** for the pair (owner requirement, same
  ruling that retired the always-combos). No engine knob exists today (only Λ `lambdaStage`) —
  needs a per-unit burst-selection primitive (e.g. max-casts + priority), gated engine work via
  `/scientific-method`. The generator already enforces their same-team pairing
  (`genCalc.TEAM_CONSTRAINTS`, relaxes if one is unavailable).

- **⇒ WEB/DPS-CHART PROFILE TODOs (2 deferred backend items).**
  - **Bready taste** — currently a MANUAL `sustained | distributed` mode pill. TODO: auto-derive the
    live taste from the team's actual buff types, model the tasteless state (both buff types absent →
    taste-gated lines + charge-speed debuff inert), measure the taste-line magnitudes (all ⚑).
    `src/skills/overrides/bready.json`.
  - **Diesel: Winter Sweets Highlight** — chart scores with the faithful Intro (bursts-first) numbers
    (owner ruling 2026-07-17: doc-only). TODO: model the burst-order-coupled Highlight (a no-op B3 must
    drive FB; Sustained ▲235.03 vs Intro ▲60.19, loses burst DoTs + team Damage-Taken ▲25% amp).
    `src/skills/overrides/diesel-winter-sweets.json`.

- **⇒ ROLE-AUDIT FOLLOW-UPS → `docs/handoffs/2026-07-17-role-audit-followups.md`:** (1) custom-weaponry
  `role` sweep — mostly deflated by D; what's left = pierce-from-kit-text + (data-blocked) weapon-swap
  secondary-weapon row; (2) **anis-star dot-gauge re-model** then drop her `hitsPerShot` carve-out to 1
  (highest-value modeling fix; needs a measurement); (3) re-pin PH-water FB to 12 when the burst-cycle fix
  lands / after re-measure. Passive carries: next sync applies 18 behaviour-neutral `burstGaugePerShot`
  diffs; D.4 RL splash (multi-part scope only); E class-mismatch core-row guard (no current violator).

- **⇒ `unmodeled` BACKFILL (~40 hand-authored overrides)** (deferred, owner-approved) — their authored slots
  carry `unmodeled: []` (skips still note-only); fill per unit via a kit-parse audit pass. Hand-authored
  values tracing to OLD fan wording may disagree with the official prose — reconcile per-unit when touched,
  never as a blocker.

- **⇒ VERIFY BOSS PROFILES (low-prio).** medium/large `bossPelletProfile` magnitudes are ⚑ UNVERIFIED
  (owner-chosen, not measured). dorothy-serendipity PH-water (766M) vs N9-redhood (328M) already DISAGREE on
  best fit (small vs medium), so profiles are plausibly per-boss — needs real per-boss SG footage to map boss
  silhouette → profile before any board use.

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
- **Per-unit rotation re-tunes (open-questions U16 worklist)** — the residual over-credits (chisato ~1.2,
  trina inverse) are rotation-INDEPENDENT unit-level over-models → footage-gated per-unit localization,
  NOT a rotation de-fit. (The rotation itself is settled — live model in `docs/STATE.md` §3.)

- METHOD/DISCIPLINE: `/scientific-method` (Fable pre-op + blind post-op), full kit audit, invariant
  (faithful > fit; measured > fudge; COUNTER > visual), whole-picture check on EVERY read, PROVE-IT-DIFFERENTLY
  (one anchor/method = hypothesis), exact-slug (P0 — the pre-write hook + slug lint enforce it), verify.sh
  green + snapshot per landing, commit freely/often — NEVER PUSH unless owner asks.
- DONE WHEN: every owned unit ±3% (multi-run avg) at n≥5 (board-read all-green).
- OUT OF SCOPE: arena/PvP; multi-part bosses; unowned units (zwei/mari/mana + the standing set); tia.
