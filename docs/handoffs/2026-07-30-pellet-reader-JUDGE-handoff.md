# Pellet reader — JUDGE session handoff

> AI-facing. For the session that **verifies** work reported by a build session — deliberately
> separate from [`…-WORK-handoff.md`](2026-07-30-pellet-reader-WORK-handoff.md).
>
> **Units:** slugs `marciana` (SG/Iron — `marciana-solo.MP4`; **not** `marciana-marine-study`,
> AR/Iron), `noir`, `guilty`, `isabel`. All SG, `ammo: 9`.

## The role

A build session reports; you decide whether to believe it. **You are not a rubber stamp and not an
adversary** — the build sessions in this thread have been careful and honest. Every error caught so
far was a _premise_ error, not a reasoning error: the session reasoned correctly from something false
it was handed.

## ⚠ Read this first: the failure pattern, with receipts

Six wrong-but-plausible conclusions were reached in this thread. **Every one was internally
consistent, and every one died to a check that took under five minutes.**

| claim                                         | why it looked right        | what killed it                                         |
| --------------------------------------------- | -------------------------- | ------------------------------------------------------ |
| "the −62.5 offset broke the 07-29 validation" | same-day, right magnitude  | file timestamps (artifacts 12:19, commit 15:17)        |
| "detector is blind at the readable frames"    | matched the lifecycle spec | counting detections per frame off the pixels           |
| "the noir dump is underpowered"               | n=5, plainly thin          | 58 tracks vs 556 duration-scaled ⇒ _invalid_, not thin |
| "the shadowing bug came from the merge"       | same file, same week       | `git log -S` dated it six days earlier                 |
| "`guilty` still fails gate 1"                 | the doc said so            | it had passed hours earlier; text was stale            |
| "detection is only 62–77%"                    | arithmetic checked out     | denominator ignored reloads                            |

**⇒ The operative heuristic: when an explanation accounts for everything, distrust it and go find the
two-minute check.** That single habit did more work today than any amount of analysis.

## What to actually do with a report

1. **Confirm the artifacts exist on disk.** They have vanished twice — once the whole validation set,
   forcing full re-derivation. `ls` before you read numbers.
2. **Re-run the headline number yourself.** Cheap, and it has caught real drift.
3. **Check the claim against something derived a different way** — the repo is full of independent
   labels and using one _is_ the validation, not a shortcut:
   - `docs/probe-data/*-sg-band.json` — hand-derived shot/band counts predating this reader
     (`guilty-sg-band.json`'s 185 hand-counted shots is what refuted the naive denominator)
   - `scratchpad/pellets/run16/tracks.json` — an independent earlier run
   - `data/characters.json` — datamined `ammo`/`reloadFrames`, already gated by `verify.sh`
   - `scripts/tests/fixtures/pellets/` — committed fixtures with pinned expected values
4. **Watch for stale text in the plan doc.** It is long and has been rewritten many times. A phantom
   `guilty` failure cost one session real work. If a report cites a status, verify it is still true.
5. **Suspect results that are too clean.** `marciana` at exactly 100.1% detection is currently
   flagged as a possible over-count, not celebrated.
6. **Check the owner spot-check gate.** Phase 2's exit criterion now includes an owner visual
   inspection (10 randomly selected shots, f8–11 frames alongside pipeline counts). If a build
   session reports Phase 2 done without presenting this to the owner, it is not done. The metrics
   can pass while the output is visually wrong — the owner's eyeball is the independent method.
7. **Verify the pre-committed separation numbers were not moved.** Phase 2's lifecycle filter must
   hit precision ≥ 0.90 and recall ≥ 0.80 on the labeled set. These were pre-committed before
   Phase 2 code was written. If a report quotes different thresholds, ask why — adjusting
   pre-committed criteria after seeing the data is the exact failure mode this process exists to
   prevent.

## Traps in your own tooling

- `python … | tail; echo $?` reports **`tail`'s** exit status. This nearly produced a false bug report
  against a correct test.
- Shell: `"$var:path"` is a zsh parameter modifier and silently yields nothing — use literal paths.
- `[ "$x" = "y" ] && ARG=...` inside a loop silently skips iterations. Cost a regeneration cycle.
- `--debug-dir` is a **no-op with `--temporal`** (the save call only exists in the other branch).

## ⚠ Conflict of interest you are inheriting

**The Phase 2 design was authored by the same assistant that has been judging this thread.** The
process-all-13/count-on-5 split, the error budget, the lifecycle template, the shared-t0 constraint —
all of it. Several errors caught today were that assistant's own (a bad cherry-pick instruction, a
broken pinned dump, a cancelled-on-arrival sweep, a clobbered doc heading, an inconsistent curve
quote).

⇒ **Do not let a same-family review of Phase 2's design stand as approval.** The plan calls for
`/logic-gate` pre-op, which is **owner-invoked** and, with a Claude driver, routes to
**`kimi-code/k3`** — not Fable. A fresh Claude session shares the priors and will likely agree for
the wrong reasons.

## Current verified state (as of 2026-07-30)

Gate 1 **and** gate 2 met on all four videos under one matcher — the conjunction four tuning passes
failed. §0.5 answered (lifecycle generalises, ±0.05 across 11 samples). Detection ~88–100% against a
reload-corrected denominator, corroborated by hand-derived counts. H1/H2/H3/H4 done, H5 cancelled
with proof.

**Open:** Phase 1 (Phase 2's only blocker) · Phase 2 ·
the `--debug-dir`/`--temporal` no-op · a wrapper for the three Python self-checks · `marciana`'s
possible over-count.

**Closed 2026-07-30:** §0.7 VLM zero-shot — Qwen2.5-VL-7B scored 46.2% within ±2 (threshold 70%)
on 80 frames. Perception failure; the model estimates, does not count. Phase 3 is classical
detectors only. Report: `scratchpad/pellets/vlm-test/report.html`.

**Phase 2 gates added 2026-07-30 (owner review):** f8–11 ground truth must be owner-counted before
P2 is scored (§1.2 step 0) · lifecycle separation pre-committed at precision ≥0.90 / recall ≥0.80 ·
owner spot-check gate (10 shots, >2 clearly wrong → stop) · `/logic-gate` pre-op is owner-invoked
and routes cross-family (Claude driver → `kimi-code/k3`).
