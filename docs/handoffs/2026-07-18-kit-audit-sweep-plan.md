# Handoff — Roster-wide `audit-kit` sweep + per-unit fix briefs + modeling-gaps reconciliation

> **Status: OPEN / not started (2026-07-18).** AI-facing execution handoff. Owner-approved plan; pass
> to a fresh implementation agent. This doc is self-contained — it plus the `audit-kit` skill
> (`.claude/skills/audit-kit/SKILL.md`) and the `scripts/blind-rebuild/` machinery are all you need.
>
> **Terminal deliverable: findings + briefs + a reconciliation addendum. STOP there.** Do NOT run the
> enact flow (scientific-method plan → Fable judge → implement → post-op). Owner reviews the briefs and
> passes them onward himself. Nothing in this task edits an override, the engine, the snapshot, or the
> live `docs/engine-modeling-gaps.md`, and nothing gets committed/pushed.

## Context / why

The kit-parse rollout is complete (74/74) but the 61 findings across 58 units in `data/kit-status.json`
were produced by a *forward* read (prose → override, the author agreeing with themselves) and are
un-enacted. `audit-kit` runs the arrow **backward and sideways**: a BLIND Opus code-only rebuild of what
the engine actually does, a SIGHTED full-context review of what the override intends/documents, and a
RECONCILING judge grading both against the real kit text + the damage-formula SSOT. A clean result is
real evidence of faithfulness; a gotcha is triangulated, not asserted. The output is a ranked,
roster-wide map of where the sim silently diverges from kit text — the input the enact flow needs.

**Prereq already done (2026-07-18):** all three `audit-kit` subagents are pinned to Opus (`model:
"opus"`) in `.claude/skills/audit-kit/SKILL.md`. Verify that's still true before you start.

**Scale / cost:** 74 units × (blind reconstruct ‖ sighted review → reconcile) = 222 Opus agents, plus
~30–45 conditional fix-brief agents + 1 synthesis agent ≈ **~255–270 Opus subagents**. Run it as ONE
background `Workflow` (owner has opted in by approving this doc). It is resumable — use
`resumeFromRunId` if it dies partway, and same-script+same-args returns cached agent results.

## Owner-settled decision (do not re-litigate)

**Produce fix BRIEFS — enough context for a later scientific-method plan — NOT full scientific-method
plans.** Rationale: (a) findings aren't measurement-verified yet, and a scientific-method plan's premise
gate + Fable approval IS the "full flow" the owner told us to skip; (b) many gotchas are
FIDELITY/documentary needing no change (the dorothy-serendipity POC produced 3 gotchas, 0 value
changes); (c) a tight brief per actionable unit is the right altitude for later review. Each brief is
structured so a future session drops straight into the scientific-method harness.

## Approach

### Step 0 — Rebuild packets (deterministic, no LLM)
Packets under `scripts/blind-rebuild/packets/` are dated 2026-07-17; overrides may have moved since.
Regenerate all before auditing:
```sh
npx tsx scripts/blind-rebuild/build-packet.ts --all   # rebuilds packets/ + truth/, runs leak assertion
```
The builder throws on a tainted packet (name/prose leak). If it throws for a unit, exclude that unit
from the run and report it — never audit a tainted packet. Confirm `ls scripts/blind-rebuild/packets/*.blind.json | wc -l` == 74.

### Step 1 — One background `Workflow`, pipelined per slug
Follow the `audit-kit` skill's roster-scale section. Three stages per unit, **pipelined** (no barrier —
unit B reconciles while unit C is still reconstructing). All agents **pinned to Opus**, each prepended
with `.claude/subagent-non-negotiables.md` (verify the EXACT slug — base ≠ variant is a P0 failure).
Pass the 74 slugs as `args`.

- **Stage 1 (parallel, two SEPARATE subagents — blindness is load-bearing):**
  - **BLIND reconstruct** — prompt = `scripts/blind-rebuild/RECONSTRUCT.md`; input = ONLY
    `packets/<slug>.blind.json` (it reads the packet's `codeFiles`). Give it NOTHING from `truth/`,
    `data/characters.json`, or the override. Returns recon JSON (use a `schema` so it's forced). It must
    declare `recognizedUnit` if a code comment leaks identity.
  - **SIGHTED review** — prompt = `scripts/blind-rebuild/FULL-CONTEXT-REVIEW.md`; reads
    `data/characters.json`, `data/kit-status.json`, the override in full, runs `scripts/board-read.ts`.
    Returns review JSON (schema).
- **Stage 2 — RECONCILE** (after both finish): prompt = `scripts/blind-rebuild/RECONCILE.md` + the
  `/context` mechanics pack (invoke the `context` skill; paste §1 buckets, §2 crit/core/FB, §9
  procs/DoT so it can do the formula check without re-exploring). It reads `truth/<slug>.truth.json` +
  the SSOT docs; hand it both stage-1 JSONs in-prompt. Returns the judge JSON (schema per RECONCILE.md
  — `gotchas[]`, `lineFindings`, `faithfulnessScore`, `agentCrossCheck`, `verdict`).
- **Stage 3 — FIX BRIEF (conditional AGENT):** run the brief AGENT ONLY when the judge's `gotchas[]` has
  ≥1 **actionable** item — `subkind ∈ {ENCODING, ENGINE, FIDELITY, SILENT_DROP}`, `severity ∈ {high, med}`,
  and `suggestedFix` is a real change (NOT documentary / "leave as-is" / "none"). The brief agent re-reads
  the override + real kit line + SSOT and emits a scientific-method-ready brief (section list below).
  Units with no actionable gotcha **skip this AGENT** — but they do NOT skip getting a per-unit record: the
  driver still writes a short **documentary record** for them in Step 3 (composed from the judge JSON, no
  extra agent). **EVERY audited unit gets a `<slug>.md`, including clean "no changes — everything looks OK"
  units.** (Lesson from the pilot: a clean unit with no brief left its audit — including a real board-inert
  engine bug and a review-ledger regression signal — living only in the gitignored `results/` JSON, which
  dies on a clean checkout. A faithful result is itself a finding worth logging.)

Blindness guard: stage 1's two agents are separate subagents with disjoint inputs; the blind one never
sees the review, the truth file, or the identity. `build-packet.ts` guards the packet; YOU guard what
each agent is handed.

### Step 2 — Reconcile findings against `engine-modeling-gaps.md` + categorize new investigations
After the workflow returns all judge JSONs, spawn ONE **Opus** synthesis agent (cross-cutting reasoning
over the whole corpus; prepend the non-negotiables). It reads every `gotcha` from all results +
`docs/engine-modeling-gaps.md` IN FULL (the 19-theme catalog, the A/B/C status dashboard, the
blast-radius fix ranking) and returns:
- **Per-gotcha reconciliation** — each audit gotcha tagged `KNOWN` (already covered by theme N — cite
  it), `EXTENDS` (fits theme N but adds this unit / sharpens it), or `NEW` (no theme covers it).
- **New-investigation categorization** — the `NEW` gotchas bucketed **by type in the same taxonomy that
  doc uses**: a candidate theme name, unit count, HOT/COLD direction (board = sim/real; HOT▲ > 1,
  COLD▼ < 1), capability state (❌ unwired / ⚙️ wired-not-enacted / measurement-only), and the
  affected-unit list — mirroring themes 1–19. Where a NEW cluster is really a sub-facet of an existing
  theme, propose it as `N-bis`.
- **Cross-check** — any theme the doc marks ✅ done/enacted that an audit gotcha contradicts (a
  regression signal), flagged prominently.

This agent PROPOSES categories only — it never edits the live catalog.

### Step 3 — Assemble deliverables (driver, after the synthesis returns)
The workflow + synthesis return structured JSON; the driver (not a subagent) writes the files:

- `scripts/blind-rebuild/results/<slug>.json` — the raw judge JSON per unit (gitignored, regenerable).
- **`docs/handoffs/2026-07-18-kit-audit-roster.md`** — ranked master dashboard: one row per unit
  (faithfulnessScore, board tag, #actionable gotchas by subkind, one-line verdict), sorted
  SILENT_DROP → ENGINE/FIDELITY → ENCODING → clean.
- **`docs/handoffs/2026-07-18-kit-audit-modeling-gaps-reconciliation.md`** — the Step-2 output as a
  proposed **addendum to `engine-modeling-gaps.md`**: the KNOWN/EXTENDS/NEW reconciliation table, then
  the NEW open investigations written up in that doc's theme format (numbered, unit count, direction,
  capability state, affected units), plus any ✅-done-but-contradicted flags. **Left for review — the
  live `docs/engine-modeling-gaps.md` is NOT edited.**
- **`docs/handoffs/kit-audit-fixplans/<slug>.md`** — **one record per EVERY audited unit** (74/74 at full
  scale), so no unit's audit lives only in the gitignored `results/` JSON. Every brief (both shapes below)
  opens with a **"Kit description (generated — review for accuracy)"** section: the RECONCILE judge's
  `kitDescription` field verbatim (plain-English, what the kit does, no audit jargon) — for the owner to
  sanity-check against their own understanding of the unit BEFORE reading the findings below it. This is
  display copy, not a finding; it does not affect `faithfulnessScore` or gotcha ranking. **When a brief is
  later enacted** (its suggested fix lands in `src/skills/overrides/<slug>.json`), the owner-reviewed
  `kitDescription` rides along into that override under its own `kitDescription` key (`src/skills/index.ts`
  `OverrideFile`, display-only, never engine-consumed) — same landing motion as any other override field,
  not a separate step, and not something this findings-only sweep does itself.
  Two shapes:
  - **ACTIONABLE unit → full fix brief** (from the Stage-3 agent), each with:
    - **Finding** — real kit line, what the code actually does (blind rebuild), the formula-SSOT
      citation, gotcha subkind + severity, whether the sighted review already documented it.
    - **Board context** — current ratio / N / MAD and whether the gotcha's direction explains a HOT/COLD.
    - **Suggested faithful fix** — the judge's `suggestedFix` (faithful representation OR a measurement
      recipe — never a fudge), plus the exact override/engine location it would touch.
    - **Load-bearing premises to re-derive** — what a later scientific-method plan must verify BLIND
      before enacting (anchor identity; "is this gotcha board-inert / does it move the graded comps?";
      ground-truth value), per the premise-gate discipline. This is the "enough context" payload.
    - **Open owner rulings** — anything needing an owner decision before it can be planned.
  - **CLEAN / documentary unit → short record** (driver-composed from the judge JSON, no agent), header
    marked **"NO ENACTABLE CHANGE NOW — documentary entry"**, carrying: faithfulnessScore + board tag; the
    one-line verdict; any low-severity / board-inert gotchas WITH file:line evidence and why they don't
    warrant a plan (inert / measurement-blocked / already tracked elsewhere — cross-ref, don't duplicate);
    the blind-vs-sighted cross-check FRESH findings (a faithful-looking unit can still hide a dead block or
    a review-ledger regression signal — those are the payload here); and the anchor-identity premise note.
    A clean "everything looks OK" verdict IS a finding — it is real evidence of faithfulness from a blind
    rebuild, not the author agreeing with themselves — and must be logged, not dropped.

## Files

- **Written:** the workflow script (persisted under the session dir by the Workflow tool); the roster
  dashboard, the reconciliation addendum, and the per-unit briefs above; regenerated
  `packets/` / `truth/` / `results/` (all gitignored).
- **Reused as-is (no edits):** `scripts/blind-rebuild/build-packet.ts`, `RECONSTRUCT.md`,
  `FULL-CONTEXT-REVIEW.md`, `RECONCILE.md`, `scripts/board-read.ts`,
  `.claude/subagent-non-negotiables.md`, the `context` skill, the SSOT docs
  (`docs/data/damage-calculation.md` + `docs/data/game-mechanics.md`).
- **Already edited (prereq):** `.claude/skills/audit-kit/SKILL.md` (three-agent Opus pinning).

## Verification

- **Packets:** `build-packet.ts --all` leak assertion passes for every unit; packet count == 74.
- **Blindness spot-check:** open 2–3 `reconstructions/<slug>.json` — no real name/prose in the blind
  input; recon reads as code-derived; `recognizedUnit` declared where a code comment leaked.
- **Coverage:** `results/*.json` count == audited units; **`kit-audit-fixplans/*.md` count == audited
  units too — EVERY unit has a record (actionable → brief, clean → documentary); a `results/<slug>.json`
  with no matching `<slug>.md` is a coverage failure**, not an "OK unit". Dashboard row count matches;
  every audit gotcha appears exactly once in the reconciliation table (KNOWN/EXTENDS/NEW); every NEW gotcha
  lands in a categorized theme bucket.
- **Harness sanity:** the pipeline reproduces the dorothy-serendipity POC shape (3 gotchas, 0 value
  changes, faithfulnessScore ~0.82 — see `scripts/blind-rebuild/results/dorothy-serendipity.audit.json`).
- No `verify.sh` / snapshot run needed — zero engine/override tree changes.

## Explicitly OUT of scope (owner's instruction)
No scientific-method plan finalize, no Fable pre-op judge, no override/engine edits, no post-op blind
review, no commit/push. Briefs + dashboard + reconciliation addendum are the terminal deliverable.
