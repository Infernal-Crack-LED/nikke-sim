# CONVENTIONS.md — the HOW (see DECISIONS.md for the WHY)

## Evidence tiers (used across all mechanics docs and override notes)

Highest to lowest. A claim's tier determines what it takes to change it.

- **MEASURED** — frame-counted or popup-read from our own recordings under scope lock, or a direct
  gauge-bar measurement. Never refit; reversing needs new footage.
- **DATAMINED** — decoded game tables (community CSV mirrors) or the frame-accurate reference
  simulator (nikke-einkk). Reversing needs a measurement that contradicts the table.
- **COMMUNITY** — independently verified by multiple community testers (JP: note.com, ore-game,
  wiki3; KR: namu, Arca, DC Inside, Inven; EN: nikke.gg, Prydwen). Cite the link.
- **CALIBRATED ⚑** — fitted against validated real fights; mechanism suspected but the number is
  ours. Every ⚑ is a standing refit candidate and should be listed in open-questions.

Which UNITS carry which tier (the authoritative per-kit record) lives in
[`data/kit-status.json`](../data/kit-status.json) — the per-unit single source of truth: tuning
provenance (`tier`/`tuned`/`evidence`, tier vocabulary in [hand-tuned.md](hand-tuned.md)),
kit-parse rollout status (`kitParse.*`), unmodeled kit text (mirrored from each override), and
board pass records (sim/real per recorded comp). Maintain via `scripts/kit-status.ts`
(`--refresh` regenerates derived fields; `--set`/`--finding` update workflow fields). Tooling
reads it — the hand-tune recording batch only draws control-group supports from tuned units.
Every tuning change updates that record as part of the change.

## Override completeness (prose-free runtime, 2026-07-16)

The engine never parses skill description text at runtime — each unit's
`src/skills/overrides/<slug>.json` is the complete description of its kit. Every override must
define all three skill slots (an empty array only when a slot genuinely has no modelable effect)
plus an `unmodeled` field: the verbatim kit-text lines the model deliberately does not represent,
listed per slot (empty arrays are valid). The reasons for each skip stay in the `note`; the
optional `caveats` field carries display-only modeling warnings shown in the web app. The offline
kit parser (`scripts/lib/kit-parser.ts`) is an authoring aid; run
`scripts/materialize-overrides.ts --write` after a data sync introduces a new unit.

## Accreditation (external sources)

Every EXTERNAL research/data source we rely on (the DATAMINED / COMMUNITY / API tiers above — not our
own MEASURED work) is registered in [`data/sources.json`](../../data/sources.json), the single
harvestable sink for the planned web credits page. **Wiring rule: whenever a harness consumes a new
outside source, APPEND it there** (stable `id`, `name`, `url`, `category`, `usedFor`, `tier`) — the
harnesses that must do this:
- **probe-processing** — a recording/tool that pulls an external value or method → add/extend its source.
- **mechanics-doc-upkeep** — any doc claim that cites an outside URL/author → its source belongs here.
- **research subagents / scientific-method harness** — a research pass (like the SG-core sweep) that
  cites JP/KR/EN sources → register each before landing the finding.
If a DECISIONS/open-questions/probe-data claim cites an outside link, that link must resolve to an entry
here. Accreditation is CUMULATIVE — never delete an entry when its claim is superseded (we still used it).

## Validation methodology

- All real runs use the **scope-lock preset**: no cube, no doll, Base 5 gear (not OL0 — corrected
  2026-07-14, see DECISIONS), 3★ core 7, sync 400, skills
  10/10/10, treasure on, partless boss, 100% core exposure, full auto, 180s.
- Single-run repeatability is 0.5–3.5% per unit → deltas under ~5% are noise. The ±3% per-unit
  goal is judged against **multi-run averages** with a **declared camera-focus unit** (focus
  changes gauge generation, hence totals).
- Every real run should record: per-unit totals, the **full-burst count**, and the clock time at
  the first full burst. Compare against the Monte Carlo seed stratum matching the observed count.
- Recordings are landscape 2622×1206 at 60fps with a named focus unit. Popups belong ONLY to the
  focused unit. Burst-bar full-burst detection near cut-ins is unreliable — count nuke/laser
  signatures. The bar's full-resting render is 83.5% of pixel width; ≥96% is the pre-chain glow.

## Ratio direction (sim/real vs real/sim) — DO NOT CONFLATE

Two accuracy metrics live in this repo and they point in **OPPOSITE directions**. Treating one as
the other is a boolean-inversion bug (a HOT unit read as COLD → you "fix" it by adding damage and
make it worse). Guard against it:

- **Board / harness tools** (`scripts/board-read.ts`, `scripts/experiment.ts`) report **`ratio = sim / real`.**
  `>1` = **HOT ▲** (sim OVER-models → fix by REMOVING damage). `<1` = **COLD ▼** (sim UNDER-models → fix by ADDING damage).
  Both tools now print an explicit `HOT ▲ / COLD ▼ / OK ·` tag on every row + a header stating the
  formula — read the tag, never infer direction from the bare number.
- **Solo probe-data recons** (`docs/probe-data/*`) report the field **`realOverSim = real / sim`**, the
  INVERSE: `>1` = **COLD** (shortfall), `<1` = HOT. The field name is the label — trust it.

Rule: before acting on any ratio, confirm which formula produced it (tool tag, or the `realOverSim`
field name). Never carry a "cold/hot" judgment from a solo recon into a board number (or vice-versa)
without flipping it. (Root case 2026-07-16: the SG model pass read board `arcana 1.83`/`naga 1.175` as
"cold" — they are HOT — and added damage, regressing them; the tool tags were added to prevent recurrence.)

## Verify discipline

- `bash scripts/verify.sh` is the canonical gate: typecheck + all-override validation +
  `scripts/regression.ts` (measured-truth asserts + per-comp damage snapshots + seeded
  determinism). `verify.sh full` adds the web build + client smoke.
- Snapshot drift is a change DETECTOR: if intended, regenerate (`regression.ts --update`) and
  commit the new snapshot together with the change and its doc updates — never regenerate to
  silence a failure you don't understand.
- The measured-truth asserts (full-burst counts of graded comps) are never "updated" without a new
  measurement.

## Doc audience rule

- **Human-facing docs** (`docs/data/*`, `docs/open-questions.md`, `docs/probe-runs.md`,
  `docs/DECISIONS.md`, this file): no invented abbreviations — write fight/probe names out;
  widely-known game terms (B1, MG, SBS) are fine. These may be published to the community.
- **AI-facing docs** (`docs/handoffs/*`, override JSON notes, scratch): any shorthand.

## Doc-location rule

1. **Private scratch** — session working notes, extraction intermediates → the session scratchpad,
   never committed.
2. **In-repo** — durable knowledge (mechanics docs, DECISIONS, skills, probe results) → committed
   with the change it describes.
3. **Staged-external** — community-bound docs (open-questions is planned for release) → review
   before publishing; keep the human-facing rules above.

## Doc hygiene — two classes (hygiene attaches to the class, not the doc)

Every doc is exactly one class. This is what keeps `docs/STATE.md` current and stops the changelog
logs from poisoning agent context with stale-but-retained narration.

- **CHANGELOG class — append-only, immutable, never delete.** Outdated content is marked
  **`SUPERSEDED (date) — disregard`** or struck through IN PLACE — this is the provenance trail.
  Members: `docs/DECISIONS.md`, the **ANSWERED** section of `docs/open-questions.md`,
  `docs/probe-runs.md`, `web/src/patch-notes.json` (prepend-only), `data/sources.json` (cumulative
  accreditation), and the `docs/handoffs/closed/` + `docs/closed/` archives.
- **CURRENT-STATE class — freely rewritten; stale content is DELETED, not marked.** History lives in
  the changelog class, so deletion loses nothing. **Capture-first rule:** before deleting a
  still-true-but-resolved block, confirm the fact is in a changelog doc (DECISIONS / ANSWERED); if
  not, append it there first, then delete. Members: `docs/STATE.md`, `docs/data/*.md` (incl.
  sg-calc), `docs/CONVENTIONS.md`, `docs/modeling-priors.md`, `docs/engine-modeling-gaps.md`,
  `CLAUDE.md`, open `docs/handoffs/*`, the **UNANSWERED** section of `docs/open-questions.md`, the
  backlog/ledger docs, and **the prose fields of every override** — `src/skills/overrides/*.json`
  `note` / `caveats` / `unmodeled`.

**Enforced by `scripts/doc-drift.ts`** (in `verify.sh`, so drift fails the gate rather than being
nudged about): it (a) LINTS `docs/STATE.md` §5 for **false members** — a slug listed under a primitive
its override no longer structurally references — and for exact `N units` counts that no longer match;
(b) GENERATES the primitive enactment census in `docs/engine-modeling-gaps.md` (`--update`), which is
the single source for "which units use primitive X" — don't restate those counts in prose, link it;
and (c) LINTS `open-questions.md` for a **resolved question still filed under UNANSWERED**. Matching is
structural — prose mentions in `note`/`caveats`/`unmodeled` deliberately don't count as usage.

**Override prose is current-state — it describes the unit AS MODELED TODAY, nothing else** (owner
ruling 2026-07-22). An override's `note`/`caveats` record what is implemented, what is deliberately
unmodeled, what is measurement-gated, and the evidence tier behind each live value. They carry **no
history**: no "the old premise was X, now STALE", no "previously believed inert", no
"REFUTED/reverted on <date>" trail, no superseded values. **Delete that wording on sight**, capture-first
— the WHY belongs in `docs/DECISIONS.md`. Rationale: retained superseded narration reads as a live claim
to every future agent and to any grep scanning for open gaps, manufacturing phantom findings that each
cost a verification pass. (Worked example: six overrides carrying corrected-but-retained "hitRatePct was
inert" narration were flagged as stale caveats by a 2026-07-22 sweep and had to be individually re-read
to establish they were already correct.)

**Current-state index:** `docs/STATE.md` is the landed-state registry — the default first read for
"what does the sim do right now" (flags, constants, rotation, geometry, kit primitives). It is a
*derived* index: on conflict, live engine code and the latest DECISIONS entry win, and STATE.md is the
bug. Update it whenever a ruling lands (skill-maintenance / mechanics-doc-upkeep drive this). Full
authority order: CLAUDE.md → "Docs authority order".

**Source-of-truth docs for mechanics:** `docs/data/game-mechanics.md` (what the game does) and
`docs/data/damage-calculation.md` (the exact math the sim computes) — current-state class. The
stop-doc-drift hook nudges when engine/data changes don't touch them; `/mechanics-doc-upkeep` is the
runbook. A reversed ruling's history goes to DECISIONS; the mechanics docs keep only the current truth
(an inline strikethrough is fine for an instructive correction, but not required).

## Commit style

- Small verified increments; `scripts/verify.sh` green before every commit. Never commit or push
  unless the owner asks. End agent-authored commits with the fixed trailer:
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Never commit `.env` or `.git-credential-pat.sh` (gitignored; repo pushes authenticate via the
  repo-local PAT helper, not the global account).
