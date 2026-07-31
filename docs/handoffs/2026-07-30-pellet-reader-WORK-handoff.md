# Pellet reader — WORK session handoff (next: Phase 2, owner-gated pre-op first)

> AI-facing. For the session that **builds**. The companion
> [`…-JUDGE-handoff.md`](2026-07-30-pellet-reader-JUDGE-handoff.md) is for the session that
> **verifies** — they are deliberately separate roles.
>
> Plan of record: [`2026-07-30-pellet-reader-implementation-plan.md`](2026-07-30-pellet-reader-implementation-plan.md).
> Read its **START HERE** block first. This doc covers what changed since it was written.
>
> **Units:** the four videos are the slugs `marciana` (SG/Iron — `marciana-solo.MP4`, **not**
> `marciana-marine-study`, which is AR/Iron and has no role in shotgun work), `noir`, `guilty`,
> `isabel`. All four are SG, `ammo: 9`.

## Where you are

Branch `fix/pellet-reader`, worktree `/Users/maxwellsutton/nikke-sim-wt-pellet`. Everything below is
committed there, nothing pushed.

**Done and verified today (2026-07-30):** H1 · H2 · H3 · H4 · H5 (cancelled with proof) · §0.5 ·
Phase 2A part 2. **Phase 2A's four-video conjunction is CLOSED** — gate 1 and gate 2 met on
`marciana`, `noir`, `guilty`, `isabel` simultaneously, which four previous tuning passes failed to
achieve.

**✅ Phase 1 — DONE 2026-07-31 (§1.1 + §1.2, all steps).** See the plan doc's own §1.1/§1.2 sections
for full detail; summary:

- **§1.1 cache-then-sweep** — `count-pellets.py` gained `--dump-detections`/`--load-detections`/
  `--sweep`/`--shots`, and the tracker + a Python port of the TS shot debouncer were factored into
  reusable functions. Validated: 0 frame-count mismatches between a live run and a cached replay
  over 1800 frames, replay 230× faster, a 4-combo sweep in 2.1s.
- **§1.2 step 0 (OWNER-GATED)** — f8-11 ground truth regenerated and owner-counted:
  `scripts/tests/fixtures/pellets/groundtruth-f8-11.json` (+ compact committed crops). Counts:
  0/7/10/8/9/8 across shots 0-5 (shot0 = confirmed false positive). Note: the plan's own "7/9/7/9/
  8/8" quote didn't match the primary source (`scratchpad/pellets/HANDOFF.md`) — used the primary
  table instead.
- **§1.2 steps 1-5** — `scripts/probe/make-synthetic-pellets.py` + `scripts/probe/score-pellets.py`
  built, validated, and run: baseline recorded for the CURRENT (non-lifecycle-aware) pipeline —
  count RMSE 2.141, Jaccard 0.511, F1 0.676, phase-resolved recall already dipping at f3-4 and
  collapsing at f12-13 (reproduces the owner's lifecycle prediction from a detector that has no
  lifecycle logic — the harness is measuring the right thing).
- **`scripts/probe/pellet-selftest.sh`** (new) folds all four probe selftests into one command —
  the "worth doing" item below is done.

Two real findings surfaced along the way, neither requiring action right now:

- shot4's structural crosshair localization briefly mislocked (~10 frames) during its own f8-11
  window — Phase 2A's gate-1 near-fraction (computed over a WHOLE video) can hide a short per-shot
  excursion. Worth a line if/when Phase 2A gate 2 work resumes.
- The synthetic generator's background is a single real quiet frame repeated across all 13
  offsets (not a real evolving background) — documented as a mandatory honest limit; the 6
  owner-counted real shots + `docs/probe-data/*-sg-band.json` anchors are the required held-out
  check for any candidate this labeled set scores.

## Next: Phase 2 (lifecycle-aware counting) — its design needs an OWNER-INVOKED `/logic-gate` pre-op FIRST

Per this doc's own "After Phase 1" section below (now current) and the plan's dispatch table:
Phase 2 is real design work (t0 estimation, template scoring, phase-indexed gating) resting on a
lifecycle spec corroborated on relatively few videos. **Do not start writing Phase 2 code without
the owner explicitly invoking `/logic-gate` pre-op first** — it is not something a driver session
triggers on its own initiative, and with a Claude driver it routes cross-family to `kimi-code/k3`,
not the same-family Fable fallback. See "After Phase 1" below for the full gate list.

<details><summary>Original pre-Phase-1 task list (superseded by the ✅ summary above — kept for the reasoning trail)</summary>

Phase 2 cannot be scored without it. Neither `scripts/probe/make-synthetic-pellets.py` nor
`scripts/probe/score-pellets.py` exists, and Phase 2's exit criterion is written against both.

**Before P1.1/P1.2 — ~~run §0.7 (VLM zero-shot, ~1 hour, free).~~ ✅ DONE — VLM NOT VIABLE.**
Qwen2.5-VL-7B scored 46.2% within ±2 (threshold: 70%) on 80 frames. The model estimates from
brightness/density, it does not resolve individual pellets. Phase 3 proceeds with classical
detectors only (threshold, LoG/DoG). §1.2 does not need VLM-ready crops. Do not re-test.
Report: `scratchpad/pellets/vlm-test/report.html`.

**§1.1 — cache-then-sweep.** Split detection from counting so candidate methods can be A/B'd over
cached detections in seconds rather than minutes.

**§1.2 — the labeled set.** Read §1.2 in the plan, then apply these three amendments:

1. **Use ONE shared 13-frame lifecycle profile, not per-unit ones.** §0.5 was answered today: the
   lifecycle generalises across units (`marciana` vs `noir` agree within ±0.05 across all 11 profile
   samples). The generator is simpler than §1.2 assumed.
2. **Fit/emit the profile on samples 1–5 only.** Both measured curves decay to a minimum at sample 5
   then _rise_ — a pellet does not grow back; that tail is the `life≥5` bucket picking up damage
   numbers and persistent VFX. Synthesising the rise would bake contamination into the labels.
3. **Step 0 is OWNER-GATED and comes first.** Before generating synthetic data, regenerate the
   6-shot ground truth at f8–11: identify the f8–11 frames from track data, crop them, present to
   the owner for counting, commit as `scripts/tests/fixtures/pellets/groundtruth-f8-11.json`.
   Phase 2's exit criterion is scored against these labels. Do not skip, delegate to a model, or
   use the existing peak-frame counts (7/9/7/9/8/8) as a substitute — those were counted on the
   frames the owner identifies as least readable.

</details>

## Things that will bite you (each already cost a session)

| trap                                                        | avoid                                                                    |
| ----------------------------------------------------------- | ------------------------------------------------------------------------ |
| `scratchpad/` + video media exist **only in the main tree** | absolute `/Users/maxwellsutton/nikke-sim/...` paths                      |
| worktree has **no** `scripts/probe/.venv`                   | use the main tree's interpreter by absolute path                         |
| `NODE_ENV=production` here makes npm skip devDeps           | `NODE_ENV=development npm ci --include=dev --ignore-scripts`             |
| `--dump-tracks true` is not implied                         | pass it, or you get no `tracks.json`                                     |
| `--debug-dir` is **silently ignored** with `--temporal`     | drop `--temporal` when you want debug images (known gap, unfixed)        |
| validation dumps have been lost twice                       | write to the main tree's `scratchpad/`, confirm on disk before reporting |

## Do not

- Re-tune the pellet-brightness threshold (`WHITE_LO`, areas, circularity). Settled.
- Re-attempt confidence-threshold tuning for the crosshair — §H5 **proves** no value works.
- Quote "22% missed" / "48%" / "62.7%" as current. Denominator artifacts; real rate is ~88–100%.
- Merge `fix/sg-pellet-counter-template` wholesale (still off an older `origin/main`).

## Verification you owe before reporting

`bash scripts/verify.sh` plus the three Python self-checks, which are **not** in `verify.sh` because
they need `scripts/probe/.venv`:

```sh
scripts/probe/.venv/bin/python scripts/probe/count-pellets.py --selftest
scripts/probe/.venv/bin/python scripts/probe/analyze-pellet-tracks.py --selftest
scripts/probe/.venv/bin/python scripts/probe/temporal-count-regression.py
```

⇒ **Worth doing as part of Phase 1:** fold these three into one wrapper script. Three remembered
commands is already one too many, and the count grows with every reader tool.

## After Phase 1

Phase 2 (lifecycle-aware counting). **Its design should go through `/logic-gate` pre-op before code
is written** — owner-invoked, and with a Claude driver it routes to `kimi-code/k3`, not Fable. The
reason is in the judge handoff: the design was authored by the same assistant that has been verifying
this thread, so a same-family review is weak evidence.

**Phase 2 gates added 2026-07-30 (do not skip):**

- **f8–11 ground truth must exist** (§1.2 step 0, owner-counted) before Phase 2 is scored.
- **Lifecycle separation is pre-committed:** precision ≥ 0.90, recall ≥ 0.80 on the labeled set.
  Do not adjust these after seeing the data.
- **Owner spot-check gate:** after metrics pass, present 10 randomly selected shots (5 high, 5 low)
  with f8–11 frames alongside pipeline counts. >2 clearly wrong → stop and diagnose.
- **t0 overlap policy is specified** in §2.1 step 4 — read it before implementing, do not invent
  your own.
- **Greedy linker escalation:** if life=1 tracks are still >40% after gap tolerance, `trackpy.link()`
  is required, not optional (§2.1 step 3).
