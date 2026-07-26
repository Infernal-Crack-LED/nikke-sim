# Autonomous edit queue — protected-path changes deferred for owner review

**What this is.** Protected paths (`src/engine/**`, `data/**`, `src/skills/overrides/**`) are gated:
an interactive session gets a per-session approval **prompt** (`ask`); an **autonomous / unattended**
session gets a clean **deny** instead (an unanswered prompt would hang the run). When an autonomous
session wants to change a protected file, it does **not** edit it — it appends an entry here and
continues. The owner reviews this queue later and enacts (or rejects) each item through the normal gated
path (approval + `verify.sh` + snapshot, per CLAUDE.md).

**This is a QUEUE of proposals, not a changelog.** Nothing here has been applied. Entries are
hypothesis-strength until the owner reviews them — do not treat a queued item as a decided change.

**How to add an entry** (autonomous session): append a block using the template below. Include enough
that the owner can act without re-deriving: the exact slug, the file + the precise diff, the evidence
tier and **n**, and — honestly — what is NOT yet verified. Respect CLAUDE.md point 7: a single
recording / n=1 / MEDIUM-confidence read is an OBSERVATION, not a change to enact; say so.

---

## Template

```
### [YYYY-MM-DD] <one-line summary> — STATUS: PENDING REVIEW
- File(s): <path> (+ line/anchor)
- Exact change: <the precise diff, or the constant old→new>
- Why: <mechanism / observation driving it>
- Evidence: tier <measured|calibrated|⚑>, n=<N>, source=<recording/comp/derivation>
- Blast radius: <which comps/units this touches>
- NOT verified: <the honest gaps — confounds not ruled out, single-anchor, etc.>
- Recommended gate before enacting: <premise-verify / Fable pre-reg / full-board A/B / measurement>
```

---

## Queue

_(empty — no proposals pending)_

- [20260725T014843] **content** `src/engine/sim.ts` (`Edit`) → captured payload: `docs/handoffs/autonomous-edit-queue/20260725T014843-content-src-engine-sim-ts.md` — RATIONALE PENDING
