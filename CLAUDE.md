# CLAUDE.md — nikke-sim

> New session: read this first. **It is the full handoff.** A fresh session should be able to
> continue from this file alone (plus the auto-loaded memory index). For "what does the sim do
> RIGHT NOW" (live flags, constants, rotation model, kit primitives), read
> [docs/STATE.md](docs/STATE.md) — the current-state registry — not the DECISIONS changelog.
>
> **Handoff convention:** every live/deferred TODO or "next steps" list MUST live in
> [docs/handoffs/QUEUE.md](docs/handoffs/QUEUE.md) — chat is ephemeral, only files carry across
> sessions. Landed current state → `docs/STATE.md`; research threads → `docs/open-questions.md`;
> settled WHY → `docs/DECISIONS.md`; the actionable **live TODO → QUEUE.md**.

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
   verify it there (`scripts/verify.sh`), then bring it back by **pushing the branch and opening a PR —
   never by merging or fast-forwarding it into local `main`,** even after it verifies green. Create it via
   the Agent tool's `isolation: "worktree"`, or `git worktree add ../nikke-sim-wt-<topic> -b <topic>`
   (public `.git`), and remove it once its PR merges. The shared main directory is for reads and for
   pulling already-merged upstream changes — never make the engine edit directly there mid-session (a
   concurrent writer or a later tree-reset will collide with it, root cause of the 2026-07-21 clobber),
   and never land a worktree branch onto local `main` directly (root cause of a 2026-08-03 push rejection:
   local `main` had silently diverged from `origin/main` — three other sessions' PRs had landed there
   during the isolated work — so the "verify it there, bring it back by merge" reading of this rule turned
   a clean isolated change into a same-tree conflict the PR flow exists to avoid). This isolates the whole
   edit→verify→A/B loop from concurrent work instead of racing on one tree, and isolates the LANDING too —
   only `origin/main`'s merge commit, never a local one, decides what main actually contains.
9. **NEW TOOLING IS ALWAYS COMMITTED — never left as a `/tmp` one-off (2026-07-29 owner ruling).** Any
   script, reader, instrument, probe driver, or fixture built during a session gets committed as part of
   the work it supported. **An instrument cited as evidence MUST be in the tree at a named path, and the
   citation must name that path** — a `DECISIONS.md` entry, engine comment, or override `note` that cites
   a tool nobody can re-run is not reproducible evidence. Root cause: the 2026-07-29 per-unit focus
   charge-gauge landing cited a "validated instrument (reproduces the `maiden-ice-rose` anchor's
   +9.1%/+3.45% sub-step pattern to <0.15% error)" in `src/engine/sim.ts` and DECISIONS, but its commit (`a525247`)
   touched **no script** — the instrument was an ad-hoc `/tmp` driver that no longer exists, leaving only
   its raw output (`/tmp/alice-solo-scratch/scan/bar-solo-series.txt`) behind a reboot away from
   destruction, and forcing a later session to re-derive it. Prefer **extending an existing committed
   script with a flag** over a new standalone one (that dump belonged on `scripts/probe/scan.ts`), and
   pair the tool with a committed fixture pinning a known-good result so it self-validates later. Genuinely
   throwaway scratch (a one-line engine probe answering an in-session question) may stay in `/tmp`; the
   rule binds anything **whose output could later be cited as a measurement**.
10. **Player-facing UI/card copy states facts, not authoring decisions.** It never explains what it
    deliberately omits or why ("never which stats," "no options here") — if a detail was left out on
    purpose, the copy is just silent about it, the same way it wouldn't announce every other thing it
    isn't saying. This is usually a sign a prompt's negative instruction ("don't mention X") got echoed
    into the deliverable instead of just being followed — treat "don't do X" as a constraint on the
    action, never as source material for the text itself (2026-07-30: a Card Builder caption shipped
    "states the line COUNT and tier only, never which stats were simulated" — the "never which stats"
    clause was pure prompt-echo, not something a player needed).

## Verified facts (do not re-derive)

- (2026-07-13) Scope-lock validation basis + single-run repeatability 0.5–3.5%/unit; ±3% goal is
  judged on multi-run averages with a declared camera-focus unit.
- (2026-07-13) Full-burst counts are cooldown/chain arithmetic — deterministic run-to-run except
  boss-transition/chain collisions. Graded comps pinned in `scripts/regression.ts`.
- (2026-07-13) The camera-focused unit's charge weapon generates ×2.5 burst gauge (focus-only,
  measured both ways); focus defaults to the middle slot.
- (2026-07-13) Burst-cast damage lands before Full Burst begins (no +50%, no entry auras).
- Scope-lock class static ATK @ Base 5: Attacker 118,027 / Supporter 98,367 / Defender 78,707 —
  ATK is class-based; a per-unit-varying "stat" is not ATK (anchors in `data/reference-stats.json`).
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

## Pre-commit hooks

Husky + lint-staged run on every commit. Do not bypass with `--no-verify`.

- `lint-staged` formats and fixes staged files:
  - `*.{ts,tsx,js,mjs,cjs}` → `eslint --fix` then `prettier --write`
  - `*.{json,md,yml,yaml}` → `prettier --write`
- Then `npm run typecheck` runs for the whole repo.

If the hook surfaces **errors or warnings in files you are committing** — including pre-existing
issues that happen to touch your staged files — fix them as part of your change. Don't leave the
hook red for the next session. `eslint` errors block the commit; `eslint` warnings and `tsc` errors
also block because `npm run typecheck` runs after lint-staged.

## Discipline forcing-functions (2026-07-16)

- **PreToolUse discipline hook** (`.claude/hooks/pre-write-discipline.py`, wired for Edit/Write/Agent —
  and routed for Kimi via `~/.kimi-code/config.toml`): a ROUTER that emits only the guard(s) whose firing
  condition the specific action matches — exact-slug (runs
  `scripts/lint-slug-disambiguation.ts`, which flags a bare base-name + lists the variants),
  measured>fudge, whole-vs-shard, prove-it-differently (independent-method verification, with the
  SUFFICIENCY clause: an existing labeled fixture IS the independent method), the
  premise-gate nudge (fresh-context re-derivation of load-bearing premises before an empirical-test plan),
  the full-context gate, **evidence-proportionality/measurement≠enactment**,
  **batch-and-stop for sweeps**, and **reuse-before-derive**. Its trigger set covers `docs/data/` and
  `CLAUDE.md`, and it ESCALATES when the incoming write contains a verdict-verb (VALIDATED/REFUTED/SUPERSEDED/…).
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
  only. The hook's premise-gate guard nudges it at spawn time.
- **Evidence-proportionality / MEASUREMENT ≠ ENACTMENT (a hook guard)**: the action's tier must not exceed
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
- **Batch-and-stop (a hook guard)**: a roster / multi-unit sweep (kit audits, board reads, the 70-unit pass)
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
- Skills by task area: **`/scientific-method` RESOLVES UNKNOWNS — an empirical test, a DERIVED
  engine constant, a measurement-driven retune, a verdict stamp, a DECISIONS overturn** (the
  procedure of record — premise gate → Fable pre-op → work → driver gate → BLIND Fable post-op →
  2-of-2 → IMPLEMENT/LOG/REJECT → **step 7 PR-style review of the landed code**; drives the
  `premise-verifier` / `preop-judge` / `postop-judge` / `implementation-reviewer` agents in
  `.claude/agents/`). **It is NOT a tax on every engine edit (owner ruling 2026-08-11): when the
  modeling question is already ANSWERED — an owner ruling on game behaviour, a literal kit line, an
  existing labeled fixture — skip the pipeline and encode it, then run `/code-review` on the diff.
  The onus there is on the CODE being correct, not on the answer being true**, so the gate moves
  rather than disappears (`verify.sh` + spec tests stay mandatory either way). Rule of thumb: _do we
  know the answer?_ no ⇒ the pipeline; yes ⇒ encode + `/code-review`; **per-unit kit work (model/re-model/re-tune from kit text) → `/kit-tdd`** — the
  test-first session that is now the PRIMARY kit build path (TDD transition step 3), demoting
  `/audit-kit` + `/kit-parse` to post-validation sampling / untuned-unit baselines;
  processing a recording → `/probe-processing`; engine/data changed →
  `/mechanics-doc-upkeep`; after any non-trivial change → `/skill-maintenance`; **doc state stale,
  a handoff finished, or unsure which doc owns a fact → `/doc-maintenance`** (routing, QUEUE.md
  pruning, closing/untracking a done handoff, stale-narration deletion; a PreToolUse hook nudges it
  together with `/skill-maintenance` at push/PR time); before a PR/push
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
  `docs/CONVENTIONS.md`, `docs/modeling-priors.md`, `docs/engine-modeling-gaps.md`, `docs/test-speed-gotchas.md`, `docs/VALIDATION-INDEX.md`, `CLAUDE.md`,
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
  (the provenance trail). Members: `docs/DECISIONS.md`, `docs/answered-questions.md`,
  `docs/probe-runs.md`, `web/src/patch-notes.json`, `data/sources.json`, the `closed/` archives.

## Docs authority order

1. `docs/STATE.md` — what is current/landed (the default first read; a derived index — if it
   disagrees with code or the latest DECISIONS entry, STATE.md is the bug, fix it there).
2. `docs/DECISIONS.md` — settled WHY + when; wins on "should we change this?" (do not re-litigate).
3. `docs/data/game-mechanics.md` + `docs/data/damage-calculation.md` — the mechanics source-of-truth
   pair; live engine code wins on "what does the sim do?" — if they disagree, the doc is the bug
   (fix via `/mechanics-doc-upkeep`).
4. `docs/open-questions.md` — genuinely unresolved (UNANSWERED); the evidence trail lives in
   `docs/answered-questions.md`.
5. `docs/handoffs/*` — session state, AI-facing; superseded by anything above.
6. Everything else. The "mark `SUPERSEDED (date)`, never silently delete" rule applies to
   CHANGELOG-class docs only; current-state docs delete stale content outright.

## Session state + method

- **Live action items / open threads → [docs/handoffs/QUEUE.md](docs/handoffs/QUEUE.md)** (moved
  out of this file 2026-07-26; this file keeps durable rules + verified facts only).
- METHOD/DISCIPLINE: `/scientific-method` (Fable pre-op + blind post-op), full kit audit, invariant
  (faithful > fit; measured > fudge; COUNTER > visual), whole-picture check on EVERY read, PROVE-IT-DIFFERENTLY
  (one anchor/method = hypothesis), exact-slug (P0 — the pre-write hook + slug lint enforce it), verify.sh
  green + snapshot per landing, commit freely/often — NEVER PUSH unless owner asks.
- DONE WHEN: every owned unit ±3% (multi-run avg) at n≥5 (board-read all-green).
- OUT OF SCOPE: arena/PvP; multi-part bosses; unowned units (zwei/mari/mana + the standing set); tia.
