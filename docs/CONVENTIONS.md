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

Which UNITS carry which tier (the authoritative per-kit tuned/untuned record) lives in
[hand-tuned.md](hand-tuned.md) + [`data/hand-tuned.json`](../../data/hand-tuned.json) (`tuned:true`
= measured/calibrated/validated against a real fight; `MODEL_ONLY` = untuned). Tooling reads the
JSON — the hand-tune recording batch only draws control-group supports from tuned units. Every
tuning change updates that record as part of the change.

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

## Doc hygiene

- Outdated content is marked **`SUPERSEDED (date) — disregard`** or struck through in place,
  never silently deleted — the ANSWERED section of open-questions and the probe-runs history are
  the provenance trail.
- Source-of-truth docs for mechanics: `docs/data/game-mechanics.md` (what the game does) and
  `docs/data/damage-calculation.md` (the exact math the sim computes). The stop-doc-drift hook
  nudges when engine/data changes don't touch them; `/mechanics-doc-upkeep` is the runbook.

## Commit style

- Small verified increments; `scripts/verify.sh` green before every commit. Never commit or push
  unless the owner asks. End agent-authored commits with the fixed trailer:
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Never commit `.env` or `.git-credential-pat.sh` (gitignored; repo pushes authenticate via the
  repo-local PAT helper, not the global account).
