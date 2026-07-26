---
name: hand-tune-batches
description: Build batches of teams for someone to record in-game (owner's own roster or the community Testing Requests page) so the sim can be hand-tuned against real fights. Use when asked for recording batches, hand-tune teams, or testing-request teams.
---

# Hand-tune testing batches — teams to record for override tuning

## What this is for

Build batches of teams for someone to record in-game, so we can hand-tune the
sim against real fights. Two consumers:
- The **owner's own recording batch** — teams built from units the owner owns,
  for them to run and screenshot/video.
- The **community Testing Requests page** — teams featuring units the owner does
  NOT own (see `/testing-requests`, which calls into this skill's rules).

A "hand-tune" recording exists to close the gap between the sim's per-unit
prediction and reality: the end-of-fight damage screen gives every unit's total,
and a focused full video gives the target unit's per-hit popups + the rotation.

## Sources of teams

1. **Realistic (preferred)** — real top-ranker comps from `/enikk-audit`
   (`scripts/enikk/roster-audit.ts` / cached SRRankings). Anchor on what strong
   players actually field.
2. **Random sample** — `scripts/battery/random.ts` (seeded, reproducible;
   `SEED`, `TEAMS`, `EXCLUDE`, `POOL_OUTLIERS`). Good for spreading coverage.
3. **Built** — hand-assembled when no realistic comp features the target unit,
   using standard frames (e.g. Little Mermaid + Crown + Helm + carry).

Always sim each team (`scripts/battery/lib.ts` helpers, or the DPS/experiment
harness) to confirm a valid rotation and to produce the prediction the recording
is graded against.

## Team-construction rules

- **Scope-lock basis**: sync 400, 10/10/10, no cube, OL0, treasure not required,
  partless boss, 180 s — the sim's validation basis.
- **Realistic shape**: at least B1 + B2 + 2× B3 (owner ruling). Reject
  expiry-dominated shapes.
- **Owner exclusions**: never field a unit the owner doesn't own in THEIR batch —
  route those to the Testing Requests page instead (see the memory of unowned
  units). `tia` and `red-hood`-as-solo-B1 are pool outliers (see
  `scripts/battery/random.ts`).
- **One team per raid**: no duplicated units within a team beyond forced B1/B2
  scarcity reuse.

### Focus + slot rules (2026-07-14 owner refinements)

The camera-focused unit is what we tune per-hit against, and default focus is the
**middle slot (position 3)**. So:

1. **Center the focus target if it's free.** Put the unit being hand-tuned in the
   middle slot so the recorder uses DEFAULT focus — no manual focus change, one
   less source of error. Only leave it off-center when a specific test needs it
   there (e.g. you deliberately want a focused B3 in an off-burst position).
2. **Prefer the target B3 to be the main burst.** When the target is a B3, build
   the team so it's the primary bursting carry (leftmost B3 → bursts most full
   bursts) — highest-signal popups. This also centers it, satisfying rule 1.

For a B3 target the ideal shape is therefore `[B1, B2, TARGET-B3, B3, B3]`:
target centered, leftmost B3, default focus. Support (B1/B2) targets can't be a
main-burst B3 — still center them so default focus captures their popups; the
team's main burst stays whichever B3 is leftmost.

Re-sim after re-centering: moving the focused unit changes the ×2.5 focus
gauge-gen target and the leftmost-burst order, so the prediction must reflect the
centered formation (which is what the recorder will actually run).

## Deliverable

Present the batch as a table: team (slot order, middle = focus), boss element +
"<element>-weak" matchup, predicted full bursts, and per-unit sim totals for
grading. Flag any high-variance / knife-edge-FB team as an especially valuable
recording.

## Verify

```sh
bash scripts/verify.sh   # if any script/data changed
```

## Change log

- 2026-07-14 — created. Folds in the enikk-audit anchors, the random sampler, and
  the owner's focus-centering + B3-main-burst refinements.
