# Pellet reader — implementation plan (ordered by likelihood of success)

> Date: 2026-07-30 · AI-facing · **plan only, nothing enacted**
> Companion to `docs/handoffs/2026-07-30-pellet-reader-solution-survey.md` (the prior-art survey —
> read it for the candidate rationale + sources). This doc is the build order.
>
> Scope: reader/tooling only. Per `CLAUDE.md` §⚖ this surface does **not** require
> `/scientific-method` — `verify.sh` + committed fixtures are the gate. The gate re-attaches the
> moment a counter output is used to move UNIGEO (open-questions **U35**).
>
> **Slug note:** every "marciana" in this doc is the slug **`marciana`** (SG / Iron) — the SG unit
> whose recordings are `docs/probes/clean-weapons/marciana-solo.MP4` and
> `docs/probe-data/marciana-sg-band.json`. **Not `marciana-marine-study`** (AR / Iron), which has no
> role in shotgun pellet work. The other four units are `noir`, `guilty`, `isabel`, `snowcrane`.

---

## START HERE — fresh session

**Read order:** this doc → `docs/handoffs/2026-07-30-pellet-reader-solution-survey.md` (candidates +
sources) → `scratchpad/pellets/HANDOFF.md` (tuning record; ⚠ **untracked, local-only**) →
open-questions **U35**.

**Settled — do not re-derive:**

- The pellet lifecycle (§ below) — owner spec, corroborated against an independent measurement.
- Per-frame detection is **adequate** (7–10 vs 7–9 ground truth). Detector replacement is not the fix.
- The 2026-07-29 REJECT conflated **two different faults**; see §0.1b. Do not read `guilty`/`isabel`
  results as evidence about counting — those runs never localized.
- Prior-art candidates and rejected paths are surveyed. Don't re-research VLM/SAM/Hough.

**Open, in order:** ~~0.1~~ ✅ done (incl. the vitest offset pin) · **0.6** (missed-shot bias) →
**Phase 2A (localization) — now the critical path** → **0.5** (blocked on 2A: it needs a `noir` dump
with a sound crosshair track) → Phase 1 infrastructure ∥ Phase 2 → Phase 3.

> **⚠ Re-ordered 2026-07-30.** 0.5 was attempted and could not be answered: the `noir` dump this plan
> pinned has a **mislocked crosshair** (details in **⛔ 0.5**). Since 0.5 gates Phase 2's
> one-template-fits-all-units assumption, and a valid dump requires working localization, **Phase 2A
> moved ahead of both.** It is no longer a parallel track — it is the critical path.

**Do not:** tune the current threshold detector further · compare any new number to run16–run19 (the
count definition changes in Phase 2) · merge `fix/sg-pellet-counter-template` wholesale (still
branched off an older `origin/main`).

> **⚠ Correction 2026-07-30:** an earlier draft of this list also said "do not merge
> `fix/pellet-counter-restore` wholesale — it deletes ~3,600 lines of tests/fixtures." **That is no
> longer true.** The branch was reconciled with `main` on 2026-07-30 and merged clean into
> `fix/pellet-reader` (8 files, +473/−44). It is now IN this branch — see §0.1. Left visible because
> a stale prohibition is worse than no prohibition: it would have blocked exactly the merge that
> resolved 0.1.

### Dispatch — model tier per phase, and how to scope the prompt

**Dispatch ONE phase at a time.** Do not hand this whole document to an agent and say "continue."
The doc is deliberately not split — the error budget and the do-not list are cross-cutting and
fragments would drift — so scope the **task**, not the file:

> _"Read the START HERE block and §X of
> `docs/handoffs/2026-07-30-pellet-reader-implementation-plan.md`. Do §X. Stop at its exit criterion
> and report — do not start the next phase, do not re-plan, do not revisit settled items."_

| Phase                            | Tier                                     | Why                                                                                                                                       |
| -------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **0.1 / 0.5 / 0.6**              | **Sonnet**                               | Run a script, read a number, compare to a written expectation. The decision rules are pre-committed below.                                |
| **1.1 / 1.2** (harness + labels) | **Sonnet**                               | Ordinary engineering against a written spec. The one subtle part (13-frame sequences w/ shared t0) is specified in §1.2 step 3.           |
| **2A** (localization)            | **Sonnet**, escalate                     | Bounded: three named options, clear exit criterion. Escalate to Opus only if all three fail.                                              |
| **2** (lifecycle counting)       | **Opus**                                 | Real design work — t0 estimation, template scoring, phase-indexed gating — and the phase most likely to break the plan's own assumptions. |
| **2 design review, before code** | `/logic-gate` pre-op — **owner-invoked** | Cross-family independence on a large build resting on a lifecycle spec corroborated on ONE video. Worth more than a stronger implementer. |
| **3+**                           | **Opus** design, Sonnet calibration      | Design is judgement; threshold/scale fitting against labels is mechanical.                                                                |

⚠ **`/logic-gate` routing — do not guess the reviewer.** It is **owner-invoked only**; the driver
never triggers it. And the reviewer is the **opposite family from the driver**, so with a Claude
driver the pre-op gate is **`kimi-code/k3`** (`dispatch-kimi.sh`), **not Fable** — Fable reviews
Kimi/Qwen drivers. Running the fable-pinned native agent under a Claude driver is the _same-family
fallback_ and its verdict must be reported as **"same-family only"**, never silently substituted.
Canonical names: `scripts/kit-autonomy/CROSS-FAMILY-PROTOCOL.md`.

**The reasoning behind this split, because it is not about capability.** Where a decision rule is
already written and a cheap ground-truth check sits next to it, a cheaper model is **safer**, not
merely cheaper — the dominant failure mode is inventing an explanation instead of reading the output,
and surplus capability is what builds the explanation. Where the task is "work out what the rule
should be" (Phase 2), you need the stronger model precisely to notice the rule is missing.

⚠ **`/scientific-method` does NOT apply to this thread** — it gates damage-model values, and this is
reader tooling (`CLAUDE.md` §⚖). `/logic-gate` is the right, lighter gate for the Phase 2 design.

**The tell this plan was built around:** both diagnoses that had to be retracted on 2026-07-30 were
_elaborate and explained everything_, and both died in ~2 minutes to a mechanical check against an
existing artifact. **When an explanation accounts for everything, distrust it and go find the
two-minute check.** No tier substitutes for that habit — which is why every phase below carries a
pre-committed exit criterion and a kill condition.

**✅ Reproducibility (constraint 9) — closed.** The 2026-07-30 measurements came from
`scratchpad/pellets/run16/`, which is **untracked and gitignored** — so the instrument was committed
but its input was not, exactly the failure mode constraint 9 exists to prevent. Fixed the same
session: a 400-frame distilled slice is committed at
`scripts/tests/fixtures/pellets/run16-tracks-slice.json` (420 KB) and the tool self-validates
against it:

```sh
scripts/probe/.venv/bin/python scripts/probe/analyze-pellet-tracks.py --selftest
# expected: {'near_crosshair': 303, 'life1_pct': 56.8, 'argmax_first_pct': 77.4}  -> SELFTEST PASS
```

The slice reproduces the full-run figures within slice noise (life=1 56.8% vs 58.8%; max-at-first
77.4% vs 73.5%; area decay 0.91→0.58→0.48→0.36→0.24 vs 0.93→0.57→0.43→0.33→0.22), so it is
representative, not cherry-picked. **Not wired into `verify.sh`** — that gate is node/TS and a clean
checkout has no `scripts/probe/.venv`; run it manually when touching the reader.

**Still local-only:** the full `run16/` frame PNGs (needed for the `--frames` detector-comparison
mode) and `scratchpad/pellets/HANDOFF.md`. The per-frame counts quoted in §"What was measured" are
therefore **locally verified, not tree-reproducible** — re-derive them from a fresh run if they
become load-bearing.

---

## What would be sufficient — the error budget (compute this before optimising anything)

`CLAUDE.md` §⚖.4: _state what would be sufficient, up front, so the question is decidable instead of
open-ended._ The reader exists to answer **U35** (per-band SG landing). That fixes a target:

| Quantity                                                 | Value                         |
| -------------------------------------------------------- | ----------------------------- |
| U35 discrimination threshold (2026-07-29 decision rule)  | **±0.5** pellets/10           |
| Smallest real gap to resolve (UNIGEO vs `noir` anchors)  | **0.77** pellets/10           |
| Shots per band (37 s window × 1.5/s, at 60–100% valid)   | **n ≈ 33–56**                 |
| ⇒ tolerable per-shot **random** SD (band-mean SE ≤ 0.25) | **±1.4 – ±1.9 pellets**       |
| ⇒ tolerable per-band **systematic bias**                 | **±0.25 pellets/10**          |
| Current counter's reported bias (~10–20% cold)           | **0.8 – 1.6** → **3–6× over** |

**⇒ The single most important consequence: chase BIAS, not variance.**

Random per-shot error is nearly free — at n ≈ 40/band you can tolerate a per-shot SD of ~±1.5
pellets, which is enormous. **A systematic offset does not average down**, and bias is the entire
measured problem. Every phase below should be judged on whether it removes a _systematic_ error:

- **Occlusion undercount at f3–4 is a bias** (always cold, never hot) → Phase 2's phase-locking to
  f8–11 targets it directly. This is the highest-value item in the plan.
- **False positives are a bias** (always hot) → Phase 2's lifecycle-template filter targets it.
- **Missed shots are only a bias if they are SELECTED** — if the 22% are missed at random they merely
  reduce n, and n is plentiful. If the messy, high-count, heavy-VFX blasts are preferentially the
  missed ones, that is a cold bias. **This reframes Phase 0.6** (below): the question is not "why are
  22% missed" but **"are the missed shots selected in a way that skews the mean?"**

**Stopping rule.** When per-band bias is inside ±0.25 pellets/10 against an independent anchor, the
counter is sufficient for U35 and the work is DONE — regardless of whether a further refinement is
conceivable (`CLAUDE.md` §⚖.3: when the bar is met, the instruction is ACT). Do not chase per-shot
perfection; it is not what the question needs.

---

## The pellet lifecycle (owner spec, 2026-07-30) — the governing model

Everything below depends on this. **Source: owner, 2026-07-30.** It supersedes the coarser and
partly-wrong record in `scratchpad/pellets/HANDOFF.md` ("peak frames 2-3 → shrink frames 4-13").

Source video is **60 fps**. A pellet is visible for **13 game frames**:

| game frame | state                                      | size  | readability                    |
| ---------- | ------------------------------------------ | ----- | ------------------------------ |
| **1**      | appears — small dot, **shadowed surround** | 1×    | ✅ **reliable** (separated)    |
| 2–3        | grows rapidly, peak reached at f3          | →2×   | ⚠ transitional                 |
| **3–4**    | **peak** — the only 2 frames at one size   | 2×    | ❌ **worst — pellets occlude** |
| 5–11       | shrinks back to 1× over 7 frames           | 2×→1× | ✅ **f8–11 reliable**          |
| 12–13      | fades, partially transparent               | 1×    | ⚠ dim                          |
| 14         | gone                                       | —     | —                              |

**The readable frames are f1 and f8–11. The peak (f3–f4) is the least readable** — that is where
pellets overlap each other, and it is the only part of the lifecycle where two frames share a size.

### What was measured (2026-07-30), and what it killed

Instrument: `scripts/probe/analyze-pellet-tracks.py` (committed this session) over
`scratchpad/pellets/run16/tracks.json` + `run16/frames-pellet/` — existing artifacts, no re-runs,
from `marciana-solo.MP4` (slug **`marciana`**, SG/Iron) at 30 fps sampling. n = 1,668 white tracks
within `pellet_radius` of the crosshair.

**Facts (hold up):**

| Measurement                                          | Result                                             |
| ---------------------------------------------------- | -------------------------------------------------- |
| Track-lifetime histogram (30 fps; full pellet = 6–7) | **life=1: 58.8%**, life≤2: 70%, life 6–7: **7.5%** |
| Where a long track's max area sits (life≥5, n=373)   | **73.5% at the FIRST sample**, then monotone decay |
| Normalised area profile of long tracks               | 0.93 → 0.57 → 0.43 → 0.33 → 0.22 (**pure decay**)  |
| Full-track peak vs trough area                       | **481 px² vs 56 px²** — an ~8.6× dynamic range     |
| Crosshair motion per frame                           | median **4 px**, p90 **15 px** (zoomed)            |

**⇒ The interesting claim I built on these, and why it is WRONG.**

The tempting reading — and the one this doc carried in draft — was: _59% life=1 + tracks acquiring at
their own peak means the detector only sees the bright 2× peak, i.e. it counts at exactly the frames
the owner says occlude, and is blind at f1 and f8–11 where pellets are separable._ It explains
everything, it matches the lifecycle spec beautifully, and **it does not survive contact with the
pixels.**

Per-frame counts measured directly off the frame PNGs across three consecutive blasts:

```
raw threshold detections : 1, 11,  8,  8, 10,  9,  2   (frames 100–106)
post-temporal-filter     : 0, 10,  7,  7,  9,  8,  1
owner ground truth       : 7–9 white per shot
```

**Per-frame detection is approximately correct**, and it spans ~6 samples per blast — i.e. roughly
the whole 6.5-sample lifecycle at 30 fps, not a narrow peak window. The detector is not blind at the
readable frames. The "counts at the worst moment, blind at the best" story is **refuted**.

**Two further corrections to my own analysis, recorded so they aren't repeated:**

1. **The fragmentation test was circular.** I tested whether life=1 tracks cluster within 30 px in
   adjacent frames and got 6%, concluding "not fragmentation". But 30 px _is_ the tracker's
   `match_dist` — any such pair would already have been linked into a life≥2 track, so the test can
   only ever return ~0. Re-run at wider radii it gives 28.7% (60 px) / 53.6% (100 px) — but at those
   radii it is just measuring pellet density (10 pellets in a 160 px-radius disc), not identity.
   **The test cannot distinguish fragmentation from density at any radius. It is uninformative;
   discard it rather than read either result.**
2. **The LoG comparison leg was inconclusive**, not supportive. At the threshold I picked it returned
   170–200 detections/frame — saturated on background texture. It needs proper scale/threshold
   calibration against labels before it says anything. Recorded so the next session doesn't cite
   the run as evidence either way.

**⇒ What actually survives, and it still matters:**

- **Per-frame detection is roughly right; the loss is at the SHOT level.** The headline gap in the
  record is 70 shots detected of ~90 expected (**78%**) — 22% of shots missed entirely — plus
  shot-total estimation. That is where the error budget lives, not in per-frame detection.
- **The lifecycle spec still sharpens the shot estimator, for a different reason than I claimed.**
  Per-frame counts are right _on average_ while averaging over frames of very different reliability
  (occluded peak vs separated f8–11). Phase-locking the count to f8–11 should cut variance and remove
  the occlusion bias — a **refinement of a working stage**, not a rescue of a broken one. Size it
  accordingly.
- **The `min_circ 0.55` + peak-occlusion interaction is still real** and still explains the
  peanut-heuristic history: merged peak-frame pellets fail circularity and are dropped whole rather
  than split. Counting at f8–11 sidesteps it without needing the heuristic.
- **Sample at 60 fps.** At 30 fps you hit f1 only ~half the time and get 2 of the 4 frames in f8–11.
  Phase-locking to a 4-frame window is not reliable at half rate.
- **⚠ The 6-shot ground truth was hand-counted on PEAK frames.** `make-groundtruth.py` picks each
  shot's peak frame (max bright-dot count) — the frame the owner identifies as least readable.
  Regenerate the labels at f8–11 before scoring anything against them; expect true counts **≥** the
  peak-frame counts.
- **The shadowed surround is still a real asset.** A bright core on a dark halo is a textbook
  center-surround signature — the exact response shape of a Laplacian-of-Gaussian. That argues for
  LoG on its merits; it just isn't yet demonstrated here, per correction (2).
- **Re-open the ring-detector rejection cheaply — now unblocked.** `read-markers.py` was parked for
  requiring "a dark grey ring our pellets lack" — but the owner says the pellets _do_ have a shadowed
  surround, and that tool was evaluated on peak frames where a neighbour destroys the ring. A re-test
  at f8–11 is an hour. (Re-test, not revival — its white thresholds were separately shown to
  under-count.) **The 2026-07-30 merge put the code in-tree**: `scripts/unigeo/marker_detect2.py`
  (+175), `scripts/unigeo/marker_track.py` (+144), and `read-markers.py` (+128, incl. the tuned
  ammo-box crosshair track). Previously this re-test would have required resurrecting files that were
  on no merged branch.
- **Phase 2A's salvage target is now in-tree too.** The plan names `read-markers.py`'s ammo-box
  crosshair track as "the one sound part" of the parked tool and a candidate localization fix for
  `guilty`/`isabel`. It arrived with the same merge — Phase 2A no longer starts by reconstructing it.
- **⚠ Do not read the merge as reviving the ring detector.** `.claude/skills/probe-processing/SKILL.md`
  came along and now correctly demotes `read-markers.py` to **PARKED WIP** while naming
  `read-pellets.ts` the SG pellet counter. That matches this plan. The merge makes the parked code
  _available to re-test_; it does not make it the counter.

**⇒ Consequence for ordering.** Detection is _not_ the top defect, so the draft's promotion of
matched-filter detection ahead of counting is **withdrawn** — the phase order below stands as
written: **Phase 2 (shot-level counting + phase-locking) before Phase 3 (detector replacement)**.
Phase 0.2 re-targets: the open question is no longer "does per-frame detection work" (it does) but
**"why are 22% of shots missed entirely?"** — a shot-detection/event-segmentation question, and the
largest single measured gap in the reader.

---

## Working agreement

- **Worktree — already created 2026-07-30.** `/Users/maxwellsutton/nikke-sim-wt-pellet` on branch
  `fix/pellet-reader`. `scripts/probe/**` is not in the protected-paths table, but this is a
  multi-phase build on a shared tree — keep it isolated.
- **Two setup gotchas, both already handled here; re-read if you ever rebuild the worktree:**
  1. **No Python venv in a worktree.** Use the main tree's interpreter by absolute path:
     `/Users/maxwellsutton/nikke-sim/scripts/probe/.venv/bin/python`. Verified working from the
     worktree (`--selftest` passes).
  2. **`NODE_ENV=production` is set in this environment**, which makes npm apply `omit=dev` and
     silently skip devDependencies — so a plain `npm install`/`npm ci` yields a tree with no
     prettier / typescript / lint-staged / husky, and the **pre-commit hook then fails with a
     confusing `Task failed to spawn: prettier --write ENOENT`**. Install with:
     `NODE_ENV=development npm ci --include=dev --ignore-scripts`. (`--ignore-scripts` avoids the
     chicken-and-egg where the `prepare` script calls `husky` before husky exists.) Expect **199**
     entries in `node_modules`; 75 means devDeps were skipped.
     Do **not** work around a failing hook with `--no-verify` — `CLAUDE.md` forbids it.
- **Commit per phase** (constraint 2: commit early/often, never push). Every script/fixture built
  here gets committed at a named path (constraint 9) — no `/tmp` instruments.
- **Every phase has an exit criterion and a kill condition.** If a phase fails its criterion, the
  plan says what that falsifies and where to go instead. No phase is "try it and see".

---

## Phase 0 — Free verification and known-bug recovery

**Zero re-runs, zero new footage, ~half a day.** Everything here reads artifacts that already exist.
This phase can invalidate most of what follows, so it goes first.

### 0.1 — Fix the latent crosshair-offset bug on `main` before any new run

| Ref                                                    | `ammoOffsetXNative` (native px)                        |
| ------------------------------------------------------ | ------------------------------------------------------ |
| `main` — `scripts/probe/read-pellets.ts:66`            | **−62.5** ← introduced `5c62a2d`, 2026-07-29 **15:17** |
| `fix/pellet-counter-restore` (unmerged, `b69b5c6`)     | **+62.5** ← the owner-POC-validated value              |
| `count-pellets.py:555` own default (always overridden) | `12.5 * zoom`                                          |

`scratchpad/pellets/HANDOFF.md` (2026-07-26) records the POC that **+62.5 is correct** (15 frames
with ≥5 markers vs 2 for −62.5). That fix never merged; `main` carries the wrong sign today.
`read-pellets.ts:418` passes `--ammo-offset-x` explicitly, overriding the Python default, so a run
from `main` displaces the counting window by **125 native px** against a `--pellet-radius` of
**80 native px** — more than 1.5× its own radius, i.e. nearly disjoint from the pellet cluster.

> **⚠ This did NOT cause the 2026-07-29 REJECT — checked and refuted.** The tempting story is that
> the sign flip broke second-unit validation the same day. It doesn't hold, on two independent
> grounds:
>
> 1. **Timeline.** Every validation artifact predates the commit: `noir-sg`/`guilty-sg`/`isabel-sg`
>    at 12:19, the per-video-template re-runs at 13:18–13:33, `5c62a2d` at **15:17**.
> 2. **Magnitude.** A near-disjoint window collapses counts to ~0. The runs reported `avgTotal`
>    7.1–7.3 — plausible magnitudes, not collapse. The reported band means (7.65, 6.91) were never
>    consistent with catastrophic misplacement.
>
> Recorded because the shard-level evidence (git archaeology) pointed hard at a conclusion the
> whole-picture check refutes. **The bug is real and latent, not historical.**

### ✅ 0.1 — DONE 2026-07-30 by merging `fix/pellet-counter-restore`

**Superseded by events, and the fix is better than this plan specified.** The owner flagged that
in-progress pellet-counter work had never been merged. `fix/pellet-counter-restore` was brought up to
date with `main` that same day ("resolving merge conflicts"), which **retired the staleness this plan
warned about** — the ~3,600-line test/fixture deletion is gone. It now merges **clean**: 8 files,
+473/−44, no mass deletions. Merged into `fix/pellet-reader`.

It fixes the offset in **both** places — this plan only knew about the first:

| File                                     | Before                                     | After                                      |
| ---------------------------------------- | ------------------------------------------ | ------------------------------------------ |
| `scripts/probe/read-pellets.ts:66`       | `?? -62.5`                                 | **`?? 62.5`**                              |
| `scripts/probe/count-pellets.py:535-536` | `default=None` → `12.5*zoom` / `-100*zoom` | **`default=125` / `default=-11`** (zoomed) |

The Python-side fix matters independently: the plan dismissed it as "always overridden by
`read-pellets.ts`", which is true only when the TS orchestrator drives it. **Phase 0.5 and the
diagnostics call `count-pellets.py` directly**, and would have used a crosshair 100 zoomed px off.

**Independent corroboration that `+125 / −11` is right** (checked before trusting the merge): `run16`
— the run whose output actually matches ground truth (avgTotal 7.6 vs owner 7–9) — recorded
`ammo_offset_x = 125.0, ammo_offset_y = -11.0` in its own params. The merge makes the shipped
defaults equal to what the known-good run used. It also confirms every 2026-07-30 measurement in this
doc, and the committed fixture, were taken with the **correct** crosshair.

**Still open from 0.1:** add a vitest pin on the `read-pellets.ts` default so it cannot silently flip
again — that is what let `5c62a2d` introduce the wrong sign unnoticed on 2026-07-29.

**Exit criterion.** Re-running `marciana-solo` from `main` reproduces the run18 numbers (70 shots,
avgTotal 7.6). If it doesn't, the offset was load-bearing in a way this analysis missed — stop and
re-derive before building anything.

### 0.1b — The real 2026-07-29 signature: **two different faults, conflated**

The run artifacts decompose the failure in a way the REJECT write-up does not. Same code, same
parameters, same day:

| Run (12:19, marciana-derived template) | shots   | valid   | avgTotal |
| -------------------------------------- | ------- | ------- | -------- |
| `noir-sg`                              | **179** | **147** | 7.3      |
| `guilty-sg`                            | **3**   | **1**   | 5.0      |

| Run (13:18–13:33, per-video template) | shots   | valid  | avgTotal |
| ------------------------------------- | ------- | ------ | -------- |
| `noir-fix-full-ce36`                  | **107** | **56** | 7.1      |
| `guilty-fix-full`                     | **21**  | **12** | 6.7      |

Two separate faults, and they need different fixes:

- **`guilty` / `isabel` — a LOCALIZATION failure.** 3 shots on a ~180 s fight is not a cold count,
  it is the counter not finding the crosshair at all. This matches the recorded diagnosis that the
  marciana-derived ammo-box template does not generalize. **Nothing about the intensity threshold or
  the shot estimator is being tested on these videos** — they never got far enough to be counted.
- **`noir` — a METHOD-level coldness.** The counter ran (179 shots, avgTotal 7.3) but read ~10–20%
  cold with band-dependent flattening. This is the fault the survey's F1/F2 describe.
- **The per-video-template "fix" traded one for the other**: `guilty` 3→21 shots, but `noir`
  **179→107** and valid **147→56**. It was adopted on the guilty/isabel improvement without anyone
  noticing it halved noir. That regression is un-diagnosed and is a Phase 0 item in its own right.

**Consequence for the plan ordering:** localization is not a Phase 3 kill-path contingency — it is a
**known, already-evidenced fault** with its own phase (2A below), and it gates `guilty`/`isabel`
entirely. The F1/F2 method work is validated on `noir` and `marciana`, which are the only two videos
where the counter currently gets far enough to be wrong in an interesting way.

**Steps.** Diff the two noir runs' accepted-crosshair traces to find where the per-video template
loses lock. Record whether the 179→107 regression is lost shots or merged events.

### 0.2 — ✅ DONE (2026-07-30) — and it re-targeted itself

Ran via `scripts/probe/analyze-pellet-tracks.py`. Full result in the lifecycle section above.
Summary: the `life=1` premise is **true as a statistic** (58.8%) but **false as a diagnosis** —
per-frame detection measured off the pixels is 7–10 white per blast frame against a 7–9 ground
truth, so the detector is not missing the evidence. Two of my own sub-tests were bad (a circular
30 px clustering test, an uncalibrated LoG comparison) and are recorded as discarded, not as results.

**The replacement question, now the top Phase 0 item:** ~90 shots are expected in the 60 s window and
70 are found. **Why are 22% of shots missed entirely?** Candidates, all testable on cached data:
event segmentation merging adjacent blasts (`EVENT_MIN=3`, `MAX_GAP≈4`), crosshair-lock dropouts
during those windows, or genuine fire-holds at boss transitions (in which case ~90 is the wrong
denominator and the detection rate is better than reported). **Check the denominator first** — it is
free, and it may dissolve the problem.

<details><summary>Original 0.2 text (superseded — kept for the reasoning trail)</summary>

The survey's most load-bearing claim is a repo assertion, not a measurement: "most real pellet tracks
are life=1" against an expected 6–7 frames at 30 fps. **`scratchpad/pellets/run16/tracks.json`
(3.3 MB, full per-track lifetimes) already exists** — this costs one script, no re-runs.

**Steps.** Write `scripts/probe/analyze-tracks.py` (committed, not scratch) that reports, from a
`--dump-tracks` JSON: the track-lifetime histogram split by white/red and by radius-from-crosshair,
and the same histogram restricted to tracks inside shot events.

**Exit criterion.** A number, either way:

- **Lifetimes cluster at 1–2** → F1 confirmed. The detector sees ~1/6 of the evidence per pellet.
  Phases 2 and 3 are both strongly indicated, and **Phase 2 becomes the direct remedy** (see below).
- **Lifetimes cluster at 5–7** → F1 is **refuted**. Detection per-frame is fine, the fault is
  elsewhere (localization, event segmentation, or the shot estimator). Phase 3 drops in priority;
  re-open the crosshair-tracking path instead.

</details>

_(Outcome: neither branch cleanly. Lifetimes did cluster at 1, but per-frame detection was fine
anyway — the histogram turned out not to be the discriminator the plan assumed it was.)_

### 0.3 — The `max_pellet_frames` boundary (a suspected second bug)

`temporal_filter` (`count-pellets.py:329`) classifies a track as a pellet iff
`lifetime <= max_pellet_frames`, and `read-pellets.ts:438` passes `round((13/60)*fps)` = **7** at
30 fps. A pellet lives 13 game-frames ≈ 6.5 sampled frames. So a fully-detected pellet lands at
lifetime 6–7 — **flush against the rejection boundary**. Any pellet whose track links to an adjacent
VFX blob for one extra frame is silently discarded as a "damage number", and this discards
_best-detected_ pellets preferentially.

**Status: SUPERSEDED as a fix, still worth one measurement.** Phase 2 step 5 replaces the hard
`lifetime <= 7` cutoff with a lifecycle-template score, which retires this boundary entirely. Do
**not** build a cutoff sweep. Still worth the one-line count of pellet-shaped tracks at lifetime
8–10 inside shot events, purely to size how many pellets the current cutoff has been discarding —
that number quantifies what Phase 2 recovers.

### 0.4 — Simulate lifecycle counting offline, for free

`run16/tracks.json` carries every track's first/last frame, position **and per-frame areas** — enough
to prototype Phase 2's scorer without touching the pipeline. Fit t0 per blast from the shared-onset
constraint, score each track against the lifecycle template, and count accepted tracks.

**Caveat that limits what this can prove:** run16 is **30 fps**, so it holds only ~6 of the 13
lifecycle frames and the phase is unknown per blast. The offline prototype can validate the
**template-scoring / precision** half (does the curve separate pellets from blips?) but **not** the
phase-locked counting half, which needs 60 fps. Treat a good result as encouraging, not as the
go/no-go — and do not tune template tolerances on 30 fps data that will be re-derived at 60.

**Exit criterion.** The lifecycle score separates the "life=1 blips" population from pellet-shaped
tracks at all. If it does not separate them even in principle on this data, the precision premise of
Phase 2 is wrong and the design needs revisiting before implementation.

### 0.5 — ⚠ Lifecycle stability across units (gates Phase 2 steps 4–6)

Phase 2 assumes one lifecycle template fits every unit and VFX load. That assumption is currently
supported by exactly one video. Compare a `noir` dump's normalised area decay to the prediction table
in §2.0.

> **⛔ STOP — the dump pinned below is BROKEN. Do not run this.** Kept only so the mistake is legible.
> `noir-near-ce36`'s crosshair track is mislocked (1.3% of white tracks near it vs `marciana`'s
> 14.3%; crosshair frozen at the crop's right edge for all 600 frames). See the **⛔ 0.5** correction
> below. §0.5 is **blocked on Phase 2A**, which must produce a dump with a sound crosshair track.
> `analyze-pellet-tracks.py` now refuses to let this pass silently — it prints a
> `CROSSHAIR TRACK LOOKS BROKEN` banner on any dump under 5% near-fraction.

**~~The dump already exists — do NOT re-run the counter (that is ~13 min/video and unnecessary):~~**

```sh
/Users/maxwellsutton/nikke-sim/scripts/probe/.venv/bin/python \
  scripts/probe/analyze-pellet-tracks.py \
  --tracks scratchpad/pellets/noir-near-ce36/tracks.json
```

⚠ **Use `noir-near-ce36`, not `noir-near-ce0`.** Verified 2026-07-30: `noir-near-ce36` is
**parameter-identical to run16** — `ammo_offset_x` 125, `center_exclude` 36, `min_area` 25,
`max_area` 750, `min_circ` 0.55, `pellet_radius` 160, `max_pellet_frames` 7 — so it is a like-for-like
comparison. `noir-near-ce0` differs (`center_exclude` 0, which admits crosshair-centre components) and
would confound the curve. **Also ignore `noir-offset-neg125`, `noir-offset-neg250` and `noir-max3`** —
those are wrong-offset experiments (`-125`, `-250`, `+25`) and are not valid for this comparison.
`noir-near-ce36` is 600 frames (~20 s), 7,353 tracks.

The comparison basis is `marciana`'s measured decay **0.93 → 0.57 → 0.43 → 0.33 → 0.22**, which sits
~10–25% below the phase-mix prediction (see §2.0). `noir` should show the same shape and a similar
mild undershoot.

**Exit criterion.** `noir`'s decay matches within the same tolerance `marciana`'s does (~10–25% below
the phase-mix prediction, same shape). **Kill condition:** materially different curve → the template
must be per-unit or conditioned on VFX load, which changes the Phase 2 design. **One run. Discovering
this after implementing steps 4–6 is the expensive path.**

### ⛔ 0.5 — NOT ANSWERED. The dump I pinned is INVALID, not underpowered.

> **⚠ SUPERSEDED — verdict corrected 2026-07-30 by the driver, same day.** The pass below concluded
> "underpowered, not contradicted" and treated the tiny sample as a limit of a 20 s dump. **That is
> wrong, and the error was mine: I pinned a broken dump in this doc and told the agent to trust it.**
> `noir-near-ce36`'s **crosshair track is mislocked**, so the statistics are computed over
> near-nothing and merely _look_ underpowered.
>
> Three lines of evidence, the last two independent of the first:
>
> 1. **Not a duration effect.** 58 near-crosshair white tracks observed; scaling `marciana`'s 1,668
>    by 600/1800 frames predicts **~556**. A 10× shortfall. As a fraction of white tracks:
>    **1.3% vs 14.3%**.
> 2. **The pellets are somewhere else.** Median offset of white tracks from the reported crosshair is
>    **dx = −1027 px** (`marciana`: −50 px). The cluster sits ~1000 px to the left.
> 3. **The crosshair never moves.** Its x is pinned to **2514–2601** — an 87 px band at the right
>    edge of the 2606 px crop — for all 600 frames, while `marciana`'s sweeps **341–2692** tracking
>    the aim point. It locked onto fixed furniture and stayed.
>
> **Ruled out:** resolution/calibration mismatch — both videos are 1206×2622.
> **Does NOT catch it:** template-match _confidence_ is normal (noir 0.430 vs `marciana` 0.502, 0%
> below 0.30). That is the documented mislock mode — it locks onto the HP bar/other furniture inside
> the normal 0.33–0.51 confidence band. Never use confidence as the validity check.
>
> **Consequences.**
>
> - **§0.5 is still OPEN and is now blocked on Phase 2A**, not on a longer dump. Re-running the
>   counter on `noir` with today's merged defaults is the way to get a valid dump — but that is the
>   localization work, so 2A now gates 0.5, which gates Phase 2's one-template assumption.
> - **This is a third data point for §0.1b.** `guilty`/`isabel` were the known localization failures;
>   `noir` was thought clean because `noir-sg` produced 179 shots. At least one `noir` dump is also
>   mislocked. The `noir` = method-only / `guilty`+`isabel` = localization split is **too clean** —
>   localization is broader than §0.1b claims. **Phase 2A rises in priority accordingly.**
> - **Instrument hardened so this cannot recur:** `analyze-pellet-tracks.py` now runs
>   `check_crosshair_validity()` first and prints a loud **CROSSHAIR TRACK LOOKS BROKEN** banner plus
>   an inline `[crosshair-validity: N% near — OK/BROKEN]` tag below 5%. The agent's reading was
>   reasonable given a tool that reported a broken dump and a thin dump identically; the tool no
>   longer does.
>
> The original pass is kept below because its _procedure_ was right — it verified params from the
> dump instead of assuming, refused to force a pass/kill verdict on n=5, cross-checked the script
> against `run16` to rule out a script defect, and escalated. Only the premise it was handed was bad.

#### Original pass (SUPERSEDED — read the correction above first)

**~~DONE 2026-07-30 — result: underpowered, not contradicted~~**

Ran the exact named command against `noir-near-ce36/tracks.json`. Params confirmed identical to
`run16` from the dump's own embedded `params` block (not assumed): `ammo_offset_x=125`,
`ammo_offset_y=-11`, `center_exclude=36`, `min_area=25`, `max_area=750`, `min_circ=0.55`,
`pellet_radius=160`, `max_pellet_frames=7`.

```
white tracks within pellet_radius(160) of crosshair: 58

LIFETIME HISTOGRAM (full pellet at 30fps sampling = 6-7):
  life   1:    41   70.7%
  life   2:     7   12.1%
  life   3:     4    6.9%
  life   4:     1    1.7%
  life   5:     4    6.9%
  life   7:     1    1.7%

POSITION OF MAX AREA within a track (life>=5, n=5):
    sample 1:    5  (100.0%)

  normalised area profile (mean rel-size per sample):
    (blank — no sample position reaches the script's n>=20 print threshold)

  peak area median   :   430.0 px^2
  trough area median :    36.0 px^2
  dynamic range      :    11.9x

  life=1 median area : 50.0 px^2
  life=1 with a static neighbour within +/-2 frames: 0/41 = 0%
```

**The exit criterion as literally written cannot be evaluated.** It asks to compare noir's normalised
area-decay _curve_ to marciana's `0.93 → 0.57 → 0.43 → 0.33 → 0.22`. The script only prints that curve
for sample positions with ≥20 contributing tracks (by design, to keep it from reporting noise) — and
`noir-near-ce36` (600 frames / 20 s) yields only **58 near-crosshair white tracks total, of which 5**
reach life≥5, versus `run16`'s 1668 / 373. No sample position clears the bar, so the profile line is
empty. Confirmed this is a sample-size limit of the 20 s dump, not a script defect, by re-running the
same script unchanged against `run16/tracks.json`: it reproduces the doc's quoted profile line
(`0.88 → 0.59 → 0.49 → 0.38 → 0.26 → …`, n=373) exactly.

**What the n=5 statistics do show, read only as a direction check, not a quantitative match:**

| Metric                    | marciana (`run16`, n=373 long tracks) | noir (`noir-near-ce36`, n=5 long tracks) |
| ------------------------- | ------------------------------------- | ---------------------------------------- |
| life=1 fraction           | 58.8%                                 | 70.7%                                    |
| max-area at sample 1      | 73.5%                                 | 100.0%                                   |
| peak/trough dynamic range | 8.6x                                  | 11.9x                                    |

Same direction and same order of magnitude on every axis (mostly life=1, acquire-at-peak-then-decay,
single-digit-x dynamic range) — nothing here shows noir behaving _qualitatively_ differently (no
plateau, no inverted profile, no order-of-magnitude range jump). But n=5 cannot support "matches
within tolerance" as the quantitative claim the criterion asks for, and per this session's explicit
instruction not to re-run the counter, it was not strengthened by generating a longer noir dump.

**Disposition: neither PASS nor KILL — inconclusive on the criterion as written, no contradicting
signal found.** Phase 2 steps 4–6 rest on "one lifecycle template fits all units." This dump is
consistent with that at the qualitative level and cannot confirm or refute it at the level the
criterion asked for. Flagging for the owner rather than picking a side: either accept the qualitative
read as sufficient to proceed, or a longer/different noir dump (a fresh ~13 min run, out of scope for
this session) would be needed to get n large enough for the quantitative comparison.

### 0.6 — ⚠ Are the missed shots SELECTED? (not "why are 22% missed")

Re-framed by the error budget above. "70 shots of ~90" reads like the headline defect, but at
n ≈ 40/band **random** misses only reduce n, and n is plentiful. Missed shots matter **only if they
are selected** — i.e. if the messy, high-count, heavy-VFX blasts are preferentially the ones dropped,
which is a cold bias and would sit squarely in the 0.8–1.6 pellets/10 the counter is currently off by.

**Two questions, both free, in order:**

1. **Is ~90 even the right denominator?** It assumes uninterrupted 1.5 shots/s across the window.
   Boss-transition fire-holds, reloads, and cover phases lower the true expectation. Derive expected
   shots from the actual fight timeline (boss script + transitions), and cross-check the
   ammo-counter reads (`read-ammo.ts`) where available. ⚠ Note `read-ammo.ts` **cannot yet read a
   small-magazine SG counter** (~29% of frames on `marciana-solo`, per QUEUE) — so it is a partial
   cross-check here, not an authority.
2. **Are the misses random or selected?** Compare the detected-shot counts immediately adjacent to
   each gap against the run's overall distribution, and check whether gaps cluster at transitions
   (benign — genuine fire-holds) or inside steady-fire stretches (suspicious — selection).

**Exit criterion.** Either (a) the misses are random / the denominator was wrong ⇒ **the item is
retired**, effort goes to Phase 2 accuracy; or (b) the misses are selected ⇒ quantify the implied
bias in pellets/10 and treat event segmentation as a bias source with a number attached, not as a
vague recall problem.

> **Phase 0 deliverable:** `analyze-pellet-tracks.py` (✅ committed), the 0.2 findings (✅ recorded
> above), a decision on 0.1, and — before any Phase 2 code — the **0.5 lifecycle-stability** and
> **0.6 denominator** answers. Nothing is built until those two land.

---

## Phase H — Hardening (ATTENDED, runs before Phase 2A part 2)

**Added 2026-07-30 after the Phase 2A pass.** Three separate wrong-but-plausible conclusions have now
been reached in this thread (a bad cherry-pick instruction, a broken pinned dump, a mis-attributed
bug), each internally consistent and each caught only by an independent check against an artifact.
The common factor is **silent failure**: the tools return a wrong answer rather than refusing.

⛔ **Do NOT run this phase autonomously** (owner ruling 2026-07-30). Not for difficulty — for the
failure shape. A `/goal` driver turns a wrong-but-plausible conclusion into the premise for the next
step, which is exactly how this thread's errors were already starting to chain. The repo's autonomy
bar ("verifiable by a script that already exists") does not hold here yet, because this subsystem's
scripts are the thing under suspicion.

**The point of Phase H is to buy that bar back.** Each item converts one silent failure into a loud
one. Autonomy becomes viable for this thread in proportion to guard coverage, not model tier.

### H1 — Do the reference baselines reproduce against TREE code? (do this first)

Every number this plan cites (`run16`, `run18`, `noir-sg`) came from a `count-pellets.py` that is
**not what is in the tree** — see the Fix 2 provenance correction. `run16` underpins §2.0's lifecycle
corroboration and the committed fixture. Until a tree-code run reproduces them, the foundation is
unverified. This also gates Phase 2A part 2, whose exit criterion compares new dumps against
`marciana` as the reference.

**Target — `run18`, whose exact config is recorded in its own `pellets.json` header:**

```sh
npx tsx scripts/probe/read-pellets.ts docs/probes/clean-weapons/marciana-solo.MP4 \
  --at 30 --dur 60 --fps 30 --zoom 2 --out scratchpad/pellets/h1-marciana-treecode
```

Reference values to beat/compare: `totalShots` **70**, `validShots` **58**, `avgTotal` **7.6**,
`avgRed` **0.19**, `expectedShots` 90.

⚠ **An exact match is NOT expected, and a mismatch is NOT a failure.** The two 2026-07-30 fixes
deliberately change behaviour — stricter crosshair seeding (`--relock-conf-min`), and temporal counts
that are no longer zeroed. Judge it as:

| Outcome                                       | Reading                                                                                                                               |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| In family (shots ~60–80, `avgTotal` ~7.0–8.2) | Foundation sound. **Record the tree-code run as the new reference** and mark `run18`'s numbers superseded (they came from lost code). |
| Materially different but non-zero             | **Do not tune toward the old numbers** — that is fitting to an unreproducible artifact. Record both; the tree-code run becomes truth. |
| Zero / near-zero shots                        | A third bug. **STOP and report** — do not proceed to H2.                                                                              |

Also run `analyze-pellet-tracks.py` on the new dump and confirm `[crosshair-validity: … OK]`.

**Stop condition: one run, record, report. Do not tune, do not sweep parameters.**

### H1 — driver analysis: the gap is 100% LOCK DROPOUT, and the lost shots were REAL

> **Added by the driver after the H1 pass.** The pass executed the protocol correctly and correctly
> declined to tune. This is the follow-up diagnosis; it turns "materially different, cause unknown"
> into a bounded fix.
>
> **1. The deficit is entirely four dead windows, not a uniform degradation.** Shots per 10 s bucket:
>
> ```
> run18     : 13 12 13  8 11 13      max gap 2.53s   dead-time >2s: 4.64s
> tree-code : 13  7  2 12  8  1      max gap 11.96s  dead-time >2s: 23.02s
> ```
>
> Dead windows (fightT): **33.2→35.3 (2.1s) · 41.4→53.3 (11.96s) · 53.8→56.0 (2.2s) · 68.7→75.4
> (6.76s)**. Extra dead time vs run18 ≈ **18.4 s → ~28 missed shots**, against an actual deficit of
> **27**. The accounting closes.
>
> **2. Outside those windows the tree code is indistinguishable from run18** — median inter-shot gap
> **0.70 s vs 0.67 s** (cadence 1.5/s), `avgTotal` 7.3 vs 7.6. **Per-shot counting is intact.** The
> regression is purely in _shot detection_, i.e. crosshair lock availability.
>
> **3. ⚠ The lost shots were REAL, not garbage.** The obvious hope — that run18's extra 27 shots were
> a mislocked crosshair counting noise, making 43 the _more_ correct number — is **false**. Splitting
> run18's shots by whether they fall inside the now-dead windows:
>
> | run18 shots                 | n   | mean total | valid (5–10) |
> | --------------------------- | --- | ---------- | ------------ |
> | INSIDE the now-dead windows | 23  | **7.70**   | 78%          |
> | OUTSIDE (both runs detect)  | 47  | 7.13       | 85%          |
>
> The lost population is _cleaner than average_. So `--relock-conf-min 0.55` is a **net recall
> regression** — it trades false-lock for **no-lock**, and in these windows the looser lock was
> producing correct counts.
>
> **Confirmed by an INDEPENDENT method (not the same derivation).** The above uses run18's own shot
> list, so it could in principle inherit run18's error. `run16` is a _separate_ run (07-24 12:58,
> max-of-event estimator, no marker fallback) whose **per-frame** counts were produced independently
> of run18's shot list. Its pellet activity in the windows tree code now goes dark:
>
> | window (fightT)                  | run16 frames with pellets | mean when non-zero |
> | -------------------------------- | ------------------------- | ------------------ |
> | DEAD 41.4→53.3                   | **46%** (165/359)         | 4.7                |
> | DEAD 68.7→75.4                   | **46%** (93/203)          | 5.0                |
> | control 56→68 (both runs detect) | 38% (137/360)             | 5.5                |
>
> Pellets are demonstrably on screen throughout both dead windows — at a _higher_ frame-hit rate than
> the control stretch. Three converging lines (run18 shot quality · cadence arithmetic · run16
> per-frame activity) all say the same thing. **The bar is met: the lost shots were real, and this is
> a recall regression to be fixed, not a filter working as intended.**
>
> **⇒ Consequences.**
>
> - **Fix 1 is directionally right but mis-calibrated.** It genuinely fixed the `noir` seed-freeze;
>   0.55 is simply too strict for `marciana`. There is very likely a value in **(0.30, 0.55)** that
>   holds `noir` without going dark on `marciana`. Both test cases now exist, so this is a bounded
>   sweep with a pre-committed target, not open-ended tuning.
> - ⚠ **This does NOT violate the "do not tune the detector further" rule.** That rule governs the
>   _pellet-brightness_ threshold (`WHITE_LO`, areas, circularity). `--relock-conf-min` is
>   crosshair-lock acquisition — a different subsystem, and one with an objective pass/fail on two
>   videos.
> - **§0.6 is answered in the affirmative, and it is worse than assumed.** Missed shots here are
>   **SELECTED**, not random — contiguous multi-second windows. Detection rate on tree code is
>   **48%**, not the 78% this plan has been quoting. Since bands are time windows, a dead stretch
>   inside a band biases that band's mean rather than merely thinning it.
> - **Phase 2A gains a concrete, reproducible target** better than "make `guilty` work": eliminate
>   the `marciana` dropout at fightT ≈ 41–53 and ≈ 69–75, while keeping `noir` locked.

### H1 — ✅ DONE 2026-07-30 — result: **materially different but non-zero**

Ran exactly the target command (input video is only present in the main tree, not this worktree —
gitignored media isn't shared across worktrees — so the video path had to be absolute:
`/Users/maxwellsutton/nikke-sim/docs/probes/clean-weapons/marciana-solo.MP4`; output written under
the main tree's `scratchpad/pellets/h1-marciana-treecode/`, same reason).

```
43 shots (29 valid 5-10, expected ~90)
avg total: 7.3  avg red: 0.17
```

| Metric        | run18 (reference) | tree-code (H1) | Δ               |
| ------------- | ----------------- | -------------- | --------------- |
| totalShots    | 70                | **43**         | −39%            |
| validShots    | 58                | **29**         | −50%            |
| avgTotal      | 7.6               | **7.3**        | −4%, in family  |
| avgRed        | 0.19              | **0.17**       | −11%, in family |
| expectedShots | 90                | 90 (same calc) | —               |

Against the pre-committed table: not zero/near-zero, and not "in family" either (shots is far
outside the 60–80 band even though `avgTotal`/`avgRed` land inside their bands) — this is the
middle row, **materially different but non-zero**. Per the decision rule: do not tune toward
`run18`'s numbers, record both, and **the tree-code run becomes the new reference** (43 shots / 29
valid / avgTotal 7.3 / avgRed 0.17 / expected 90). `run18`'s totalShots/validShots are superseded —
they came from code no longer in the tree.

**Crosshair validity.** `read-pellets.ts` itself doesn't emit a `tracks.json` (no `--dump-tracks`
flag was in the target command as written, and adding it would have meant re-running the full
pipeline including the 60-call VLM timer pass). Since the pellet frames were already extracted by
the H1 run, `count-pellets.py` was invoked a second time directly against the existing
`frames-pellet/` dir, replicating `read-pellets.ts`'s own parameter derivation (`--zoom 2` →
`center-exclude 36`, `min-area 25`, `max-area 750`, `pellet-radius 160`, `ammo-offset-x 125`,
`ammo-offset-y -11`, `max-pellet-frames 7`, same per-video ammo template) plus `--dump-tracks`, to
avoid a second full run. Result:

```
white tracks within pellet_radius(160) of crosshair: 919   [crosshair-validity: 7.9% near — OK]
```

**OK**, but notably lower than `marciana`/`run16`'s 14.3% — recorded, not chased (H1 is one run,
not a diagnosis pass).

**Not done, out of scope for H1:** no attempt to explain the 43-vs-70 shot gap (candidates: the
`--relock-conf-min` stricter seeding losing more events than it gains, or the temporal-count fix
changing which frames clear the temporal filter) — that is diagnosis work, not H1's stop condition.

### H5 — ⛔ CANCELLED before running: no `--relock-conf-min` value can work. Confidence tuning is a dead end.

**This was drafted as a 6-point sweep. A 4-minute check against data already in hand determined its
outcome, so it was cancelled rather than run.** Recorded in full because the _reason_ it fails is the
evidence that sends Phase 2A structural.

**The mechanism, confirmed independently of the shot-count derivation.** H1's dump records
per-frame `cross_confs`. Fix 1 requires **conf ≥ 0.55** to seed or override a lock:

| window (fightT)             | median conf | <0.30 | 0.30–0.55 | **≥0.55** |
| --------------------------- | ----------- | ----- | --------- | --------- |
| DEAD 41.4→53.3              | 0.408       | 0%    | **100%**  | **0%**    |
| DEAD 68.7→75.4              | 0.371       | 0%    | **100%**  | **0%**    |
| control 56→68 (both detect) | 0.457       | 0%    | 56%       | 44%       |
| control 33→41               | 0.366       | 0%    | 91%       | 9%        |

The dead windows are **exactly** the stretches where confidence never reaches 0.55. Mechanism proved
by a signal entirely separate from the shot counts — the diagnosis is now double-sourced.

**Why no threshold fixes it.** The frozen `noir` lock's own confidence distribution
(`noir-near-ce36`, 600 frames): **median 0.430**, 61% in 0.30–0.45, **25.5% at ≥0.55**.

- To reject `noir`'s false seed you need a bar **above ~0.45**.
- To re-lock in `marciana`'s dead windows you need a bar **at or below ~0.40**.
- **No value satisfies both.** The bands overlap — as the Phase 2A pass already reported
  ("the false seed and the real box occupy overlapping confidence bands"). That report was right and
  this doc was briefly about to route around it.

**The sharper statement, and it is what matters.** Fix 1 works on `noir` because `noir` _has_
high-confidence frames available (25.5% ≥0.55) — the real ammo box outbids the 0.43 smoke.
`marciana`'s dead windows have **0% ≥0.55**: there is no confident match available _at all_. So
lowering the bar would not "recover the lock" — it would let whatever happens to score ~0.40 win,
which on `noir` was demonstrably background smoke. **Lowering the threshold is not a fix; it is a
gamble that the best sub-0.55 candidate is the real box.**

⇒ **Confidence-threshold policy cannot solve this.** The dead windows need a fundamentally better
matcher — structural / multi-template localization, i.e. **Phase 2A part 2**. Carry-forward is not an
alternative either: holding the last position through a 12 s stretch while the aim point moves is
wrong by construction.

⇒ **Keep `--relock-conf-min 0.55` as-is.** It is correct where a confident match exists, and no other
value is better. The `marciana` dropout is a _matcher_ limitation, not a _threshold_ one.

<details><summary>Original sweep design (cancelled — kept for the reasoning trail)</summary>

**Why.** H1's diagnosis: `--relock-conf-min 0.55` fixed `noir`'s seed-freeze but goes dark on
`marciana` for ~18 s, costing 27 real shots (detection 78% → 48%). Directionally right,
mis-calibrated. Both failure modes now have a cached test case, so this is a **bounded sweep with a
pre-committed rule**, not open-ended tuning.

⚠ **This does not violate "do not tune the detector further."** That rule governs the
_pellet-brightness_ threshold (`WHITE_LO`, `min_area`, `min_circ`). This is crosshair-lock
acquisition — a different subsystem with an objective two-video pass/fail.

**Metrics (both printed by `analyze-pellet-tracks.py` since 2026-07-30):**

| Metric                | Healthy ref (`marciana`/run16) | Frozen ref (`noir-near-ce36`, pre-fix) | Current tree code (H1) |
| --------------------- | ------------------------------ | -------------------------------------- | ---------------------- |
| crosshair-validity    | 14.3% near                     | 1.3% near (BROKEN)                     | 7.9% near              |
| lock wander (x range) | 2351 px                        | 87 px (FROZEN)                         | **898 px**             |

Wander is the **direct** signature of a freeze; near-fraction is an indirect proxy. H1's compressed
898 px independently corroborates the dead-window finding.

**Method — reuse cached frames, no ffmpeg, no VLM.** Both frame sets already exist:

- `marciana` coverage case: `scratchpad/pellets/h1-marciana-treecode/frames-pellet` (1800 frames)
  plus that dir's own `ammo-box-template.png`.
- `noir` freeze case: `scratchpad/pellets/noir-near-ce36/frames-pellet` (600 frames). ⚠ Its committed
  `tracks.json` is **pre-fix** output — re-running these frames with today's code is precisely the
  test of whether Fix 1 unfroze it.

Run `count-pellets.py … --temporal --dump-tracks <out>` per sweep point, then
`analyze-pellet-tracks.py --tracks <out>`. Take each dump's params from its own recorded `params`
block. Sweep `--relock-conf-min` ∈ **{0.30, 0.35, 0.40, 0.45, 0.50, 0.55}**. ~4.4 min per
`marciana` point (146 ms/frame × 1800), ~1.5 min per `noir` point — roughly 35 min total.

**Pre-committed decision rule.** For each value record: near-fraction, wander, longest zero-white
frame run (the dead-stretch metric), and non-zero frame count.

1. **`noir` must PASS**: wander **> 300 px** AND near-fraction **≥ 5%**. This is the guard Fix 1 was
   introduced for; a value that re-freezes `noir` is disqualified no matter how good `marciana` looks.
2. **Among the values passing (1), choose the LOWEST** — lower is more permissive, hence better
   `marciana` coverage.
3. **`marciana` must actually improve**: longest zero-white run must drop materially below the
   current tree-code value, toward run18's ≤2.5 s (≈75 frames at 30 fps). If no passing value
   improves it, **report that and stop** — it means the freeze and the dropout are not separable by
   this one knob, which is a genuine finding and sends Phase 2A structural.
4. **Ties → prefer the HIGHER (safer) value.**

**Stop condition.** Record the table, apply the winning default, re-run H1's command once to confirm
shot recovery, report. **Do not** sweep any other parameter, and do not tune per-video.

The Fix 2 shadowing survived **six days and a merge** because nothing asserted that `--temporal`
produces output. That is the gap, not the bug.

Add a committed frame fixture (2–3 PNGs from a known blast — `scratchpad/` is gitignored, which is
exactly why no such test exists) under `scripts/tests/fixtures/pellets/frames/`, and a test asserting
that `count-pellets.py --temporal --backend opencv` over it yields **total white > 0**. Verify it
FAILS against the pre-fix script (`git show 2a1e99c:scripts/probe/count-pellets.py`) and passes now —
a regression test that never went red proves nothing.

### H3 — Zoom mismatch must fail loudly

`read-pellets.ts` defaults to `--zoom 3`; every historical reference run used `--zoom 2`. The
mismatch silently produces **0 shots** (it cost the Phase 2A session a run). Make a zero-shot result,
or a zoom/template-scale mismatch, emit a visible error rather than an empty JSON. Same principle as
H1's zero-shot stop and the crosshair-validity banner: **a reader that knows it failed is usable; one
that reports 0 as data is not.**

### H4 — §0.6 (missed-shot selection)

Unchanged, specified at §0.6. Cheap, and it may retire the "22% missed" item entirely.

---

## Phase 1 — The two pieces of infrastructure everything else needs

Four tuning passes (run16→run19, then the per-video-template pass) each fixed the tuning video and
failed the next unit. That is a harness problem, not a parameter problem. Fix the harness before
adding a fifth method.

### 1.1 — Cache-then-sweep: split detection from counting

Detection costs 146 ms/frame; every candidate method currently pays full re-extraction to be
compared. `--dump-tracks` exists but dumps _post-filter_ tracks.

**Steps.** Add `count-pellets.py --dump-detections <path>`: the **raw per-frame component list
before** the area/circularity/hole/center filters, plus the accepted crosshair position per frame.
Then make the filters, the tracker, and the shot estimator consume that cache. This is the
"cache-then-sweep" approach `scratchpad/pellets/HANDOFF.md` already credits for the tracking tune —
promote it from an ad-hoc habit to the committed pipeline shape.

**Exit criterion.** A parameter sweep over cached detections runs in seconds, not minutes, and
reproduces the current `pellets.json` exactly on `run16` frames (the handoff's existing
0-mismatch/1800-frame reproduction standard).

### 1.2 — A real labeled set (the F3 gate)

Six hand-counted shots cannot separate the candidates. Hand-counting more is exactly the
expensive-derivation failure mode `CLAUDE.md` §⚖ warns about, so generate instead.

**Steps.** `scripts/probe/make-synthetic-pellets.py` (committed):

1. Crop real pellet patches (with alpha) from the owner-labeled frames. **This deliberately avoids
   depending on Phase 5's asset extraction** — the labeled set must not be blocked on the riskiest
   phase.
2. Composite N patches at known coordinates onto real background frames sampled from **all four**
   videos (`marciana`, `noir`, `guilty`, `isabel`), including frames with damage numbers, VFX, and
   the HP bar, so the clutter distribution is real.
3. **Render synthetic blasts as full 13-frame sequences, not isolated frames.** Phase 2 scores tracks
   against the lifecycle curve, so the labeled set must exercise that curve: one shared t0 per blast,
   the size profile from §2.0 applied per phase, the f12–13 alpha fade, and occlusion sampled
   explicitly at the f3–4 peak where it actually happens. A single-frame corpus can score a detector
   but cannot score Phase 2 at all.
4. Emit sequences + exact labels (count, positions, per-frame phase index, occlusion flags).
5. Add `scripts/probe/score-pellets.py`: Jaccard/F1 + count RMSE against labels — the ISBI
   Particle-Tracking-Challenge metric pair the reference fields select on — plus **phase-resolved
   recall**, which is Phase 3's exit criterion.

**Exit criterion.** Any candidate detector or counter can be scored on one command, across all four
video backgrounds, and the current pipeline's score is recorded as the baseline to beat.

**⚠ Regenerate the real ground truth at f8–11.** `make-groundtruth.py` currently picks each shot's
peak frame (max bright-dot count) — the frame the owner identifies as **least** readable, where
pellets occlude. The existing 6-shot labels were counted there and are suspect; expect true counts
**≥** the recorded 7/9/7/9/8/8. Re-crop at f8–11 and re-count **before** those labels gate anything.
This is the one piece of hand-labelling worth paying for, and it is small.

**Honest limit — state it in the fixture's README.** Synthetic labels validate the _detector_, not
the compositing assumption. If the game blends the marker rather than blitting it, synthetic frames
are systematically easier than real ones and scores run optimistic. **Mitigation, and it is
mandatory:** the 6 owner-counted shots and the `docs/probe-data/*-sg-band.json` anchors stay as a
held-out real-data check. A candidate must pass **both** to be adopted. Per
`docs/VALIDATION-INDEX.md` §"Validating a READER", the existing labeled records are the right
instrument here.

---

## Phase 2A — Crosshair localization (the `guilty`/`isabel` blocker)

**⇒ THE CRITICAL PATH (re-scoped 2026-07-30). Do this before 0.5 and before Phase 1.** It was
promoted to a first-class phase by §0.1b and to the critical path by the failed §0.5 attempt: 0.5
needs a `noir` dump with a sound crosshair track, and no such dump exists. 2A now gates 0.5, which
gates Phase 2's one-template-fits-all-units assumption. It is **no longer parallel to Phase 2**.

**The problem.** Crosshair position comes from `cv2.matchTemplate` on a 74×74 ammo-box template
extracted from one `marciana` frame. It does not generalize (`guilty-sg`: 3 shots on a 180 s fight).
The per-video-template patch improved `guilty` 3→21 but regressed `noir` 179→107 — so the current
state is a trade, not a fix.

**⚠ It is worse than §0.1b said — `noir` is affected too.** §0.1b framed this as "`guilty`/`isabel`
fail to localize, `noir` runs fine (179 shots)." The 2026-07-30 §0.5 attempt found
`noir-near-ce36`'s crosshair **frozen at the crop's right edge for all 600 frames**, with 1.3% of
white tracks near it vs `marciana`'s 14.3%. So localization failure is **not confined to
`guilty`/`isabel`**, and a healthy-looking shot count does not certify a sound crosshair track.
Treat every video as suspect until it passes the validity check below.

**You already have the lock-quality metric this phase's kill condition asks for.**
`scripts/probe/analyze-pellet-tracks.py` gained `check_crosshair_validity()` on 2026-07-30: it prints
a `CROSSHAIR TRACK LOOKS BROKEN` banner and an inline `[crosshair-validity: N% near — OK/BROKEN]`
tag whenever under 5% of white tracks fall within `pellet_radius` of the reported crosshair.
Reference points: `marciana`/run16 = **14.3% (OK)**, `noir-near-ce36` = **1.3% (BROKEN)**. Use it as
the primary instrument — it is objective, cheap, and catches what template-match **confidence does
not** (noir's confidence is a normal 0.430; the mislock hides inside the healthy 0.33–0.51 band).

**Steps**

1. Diagnose the `noir` 179→107 regression first (Phase 0.1b). A "fix" that halves the one video that
   works is not a foundation to build on.
2. Replace single-template matching with a localization method that does not depend on one video's
   pixels. Options, cheapest first:
   - **Multi-template + NMS** — `Multi-Template-Matching`'s `matchTemplates` with one template per
     video, taking the best-scoring match. Directly targets "template doesn't generalize" and is the
     same dependency Phase 5 needs.
   - **Structural localization** — the ammo box is a HUD element with fixed geometry (a known-size
     dark box containing 2–3 bright digits). Detect it by structure rather than by appearance; the
     digit-segmentation code at `count-pellets.py:369` already models this and is video-independent.
   - **Salvage `read-markers.py`'s ammo-box track**, which `HANDOFF.md` explicitly flags as the one
     sound, tuned component of that otherwise-parked tool.
3. Keep the template-jump gate (`--max-template-disp 150`) regardless — it is validated and cheap.

**Exit criterion — two gates, both required.**

1. **Crosshair validity (primary, objective).** A fresh dump for **all four** videos — `marciana`,
   `noir`, `guilty`, `isabel` — each scoring **OK** (≥5% near-fraction) under
   `analyze-pellet-tracks.py`'s `check_crosshair_validity`, ideally approaching `marciana`/run16's
   14.3%. This is the gate that unblocks §0.5, so it is the one that matters most.
2. **Detection rate.** `guilty` and `isabel` reach rates comparable to `noir` (≥60% of expected
   shots, the pre-committed bar from the 2026-07-29 plan) **without** regressing `noir` or
   `marciana`.

All four videos must pass **together** — that conjunction is the whole point, and it is the thing
four previous tuning passes each failed. ⚠ **Do not accept a healthy shot count as evidence of a
sound crosshair**: `noir-sg` produced 179 shots while a `noir` dump was mislocked. Gate 1 is not
implied by gate 2.

**Deliverable for §0.5:** at least one `noir` dump that passes gate 1, committed or reproducible by a
recorded command. §0.5 stays blocked until that exists.

### 2A-G2 — Gate 2 on a full `noir` run (also produces §0.5's deliverable) — DONE, all three pass

Gate 1 is met and driver-verified. Gate 2 is unmeasured. **One full-video run settles both**, and its
dump is exactly what §0.5 has been blocked on since it needs a `noir` dump that is well-localized
**and** complete.

**Run the END-TO-END orchestrator, not just the counter.** Gate 2 is a shot-level criterion and
shot debouncing lives in `read-pellets.ts`; `count-pellets.py` alone yields per-frame counts, not
shots.

```sh
npx tsx scripts/probe/read-pellets.ts "docs/probes/ar-sg-smg/noir sg.MP4" \
  --fps 30 --zoom 2 --locate structural \
  --out /Users/maxwellsutton/nikke-sim/scratchpad/pellets/g2-noir-structural
```

**⚠ This command as written does not produce `tracks.json`** — `--dump-tracks` is opt-in in
`read-pellets.ts` and this copy-paste omits it, even though gates 2/3 both need `tracks.json` via
`analyze-pellet-tracks.py`. Every other reproduction command in this doc includes `--dump-tracks
true`; add it here too:

```sh
npx tsx scripts/probe/read-pellets.ts "docs/probes/ar-sg-smg/noir sg.MP4" \
  --fps 30 --zoom 2 --locate structural --dump-tracks true \
  --out /Users/maxwellsutton/nikke-sim/scratchpad/pellets/g2-noir-structural
```

⚠ **`--zoom 2` is not optional.** `read-pellets.ts` defaults to `--zoom 3`; every reference run used
2, and the mismatch **silently yields 0 shots** (H3, still unfixed). Passing it explicitly is the
workaround, not a fix.

**Pre-committed pass conditions:**

1. **Gate 2 — detection rate ≥60%** of expected shots. Reference: the old template run `noir-sg`
   found **179 shots** over 5,722 frames (~190 s ⇒ ~286 expected at 1.5/s ≈ **63%**). Structural must
   not regress detection while fixing localization — **≥179 shots, or ≥60%, whichever is the weaker
   bar.** ⚠ Per §0.6 the ~1.5/s denominator ignores fire-holds and may be too high; if the rate lands
   just under 60%, report it against **both** denominators rather than failing it outright.
2. **Gate 1 holds at full length** — `analyze-pellet-tracks.py` on the run's `tracks.json` still
   reports **OK** (≥5% near) and wander ≫300 px. The 600-frame slice gave 21.2% / 1675 px; a
   full-run collapse would mean the slice was unrepresentative.
3. **§0.5 becomes answerable** — the dump must carry enough long-lived tracks for the normalised
   area-decay curve to print (the script needs n≥20 per sample position; the 600-frame
   `noir-near-ce36` had only 5, which is what made §0.5 unanswerable). Then compare the curve to
   `marciana`'s **0.93 → 0.57 → 0.43 → 0.33 → 0.22** per §0.5.

**⚠ THE ARTIFACT MUST SURVIVE.** The Phase 2A part 2 session's validation dumps did not — the driver
had to re-derive every number. Write to the **main tree's** `scratchpad/` (the worktree has none, and
`scratchpad/` is gitignored so it will not be committed), and **confirm the `tracks.json` and
`pellets.json` still exist on disk after the run** before reporting. Record the exact command in this
doc. If the run is superseded later, that is fine — losing it silently is not.

**Snag to expect:** the timer spine uses a local VLM endpoint (`--endpoint`, default
`localhost:8090/v1`). Structural mode skips the VLM _crosshair_ fallback but not the _timer_ read. If
the endpoint is unavailable, take the fight-clock offset from the existing `noir-sg/pellets.json`
(`fightStartVideoT = 3`) rather than blocking — shot counts do not depend on the timer.

**Kill condition.** If no localization method generalizes, fall back to a per-video calibration step
with an explicit committed template per recording and a lock-quality metric that **fails loudly**
rather than silently producing 3 shots. A counter that knows it failed is usable; one that reports
3 shots as data is not.

### ✅ 2026-07-30 — 2A-G2 run: all three pass conditions MET

Ran the end-to-end orchestrator per the (corrected, `--dump-tracks true`) command above. Took ~7.1
min total (78.4s frame extraction + 68.4s VLM timer pass, 191/191 reads, no fallback needed +
280.7s counter), under the ~14 min estimate. `fightStartVideoT=3s` from the real timer spine,
matching `noir-sg`'s known value.

1. **Gate 2 (detection rate) — MET.** **214 total shots (174 valid 5–10)** over 190.75s. Against
   the reference (`noir-sg`: 179 shots / ~286 expected @1.5/s ≈ 63%): 214/286 = **74.8%** on total
   shots, 174/286 = **60.8%** on valid-only — both clear 60%, and 214 beats the **≥179** absolute
   bar outright. Landed clean, not near the boundary — the §0.6 fire-hold-adjusted denominator
   wasn't needed.
2. **Gate 1 at full length — MET.** `analyze-pellet-tracks.py` on the 5,722-frame `tracks.json`:
   **21.1% near-crosshair, 1915px wander** — essentially unchanged from the 600-frame slice's
   21.2%/1675px. No full-run collapse.
3. **§0.5 answerable — MET.** Normalised area-decay curve printed with **n=1,215** long-lived
   tracks (life≥5), ≫ the n≥20 floor. First 5 samples: **0.83 → 0.60 → 0.50 → 0.40 → 0.28**,
   qualitatively similar decay to `marciana`'s **0.93 → 0.57 → 0.43 → 0.33 → 0.22** (lower start,
   similar slope), then rebounds past sample 5 (→0.65 by sample 20) where marciana's shorter
   reference doesn't extend — flagged for a §0.5 session to interpret, not analyzed further here
   (out of 2A-G2's scope).

**Artifacts (main tree `scratchpad/`, gitignored, reproducible by the commands recorded here —
confirmed on disk after the run, not just claimed):**

- `scratchpad/pellets/g2-noir-structural/pellets.json` (2.8 MB)
- `scratchpad/pellets/g2-noir-structural/tracks.json` (9.8 MB, 43,164 tracks)
- `scratchpad/pellets/g2-noir-structural/frames-pellet/` (6.3 GB cached frames — large; safe to
  clear once the dump above is no longer needed, it is regenerable from the command)

`tracks.json` came from a second, faster invocation: rather than re-run the full ~7 min pipeline
after discovering the `--dump-tracks` gap, `count-pellets.py` was invoked directly on the
already-extracted `frames-pellet/` cache with the exact flags `read-pellets.ts` computes internally
for `--zoom 2 --locate structural` (`--center-exclude 36 --min-area 25 --max-area 750
--locate structural --struct-templ-h 74 --struct-offset-x 162 --struct-offset-y -12.5
--pellet-radius 160 --marker-radius 65 --temporal --max-pellet-frames 7 --red-r-min 200
--red-gb-max 60 --pellet-unit-area 320 --peanut-circ-lo 0.3 --peanut-aspect 0.45
--peanut-max-mult 0 --dump-tracks <path>`), then verified byte-for-byte reproduction against the
full run's own reported figure (3177/5722 non-zero frames matched exactly) before trusting it for
gates 1/3 above.

**Exit criterion status: MET.** All three pre-committed pass conditions clear on a full `noir` run.
**Not evaluated here (out of scope):** whether this also closes Phase 2A's four-video
"all-together" conjunction — `guilty` was still failing gate 1 as of the last recorded attempt in
this doc — or a full-video gate-2 re-run on `marciana`/`isabel`/`guilty`.

### ⚠ 2026-07-30 — attempted on `fix/pellet-reader` (worktree). Two bugs found and fixed; exit

criterion NOT met — `guilty` still fails gate 1.

**Root cause of the crosshair mislock (§0.1b / ⛔0.5), found by instrumented A/B, not guessed.**
`count-pellets.py`'s per-frame lock (`--temporal`) accepts the FIRST frame whose match confidence
clears the base bar (`conf > 0.3`) as `last_acc`, then only re-accepts a later match if it is within
`--max-template-disp` (150 zoomed px) of that position — otherwise the stale position is carried
forward forever. This has no way back once the first lock is wrong: on `noir-near-ce36`'s own 600
frames, the seed at frame ~2 (conf 0.43, verified by cropping the pixels — plain background smoke,
no box) froze the lock for the whole clip, while conf 0.5–0.8 matches on the REAL box (verified by
cropping those too — a legible "006" ammo counter next to the reticle) kept recurring and being
discarded as "jumps" every single time. Confidence never separated the two: healthy reference
(`marciana`/run16) sits at conf 0.39–0.53 during its correct, continuously-tracking lock — inside the
SAME band as `noir`'s false seed.

**Fix 1 — confidence-gated (re)acquisition**, `count-pellets.py` (`--relock-conf-min`, default 0.55;
`--track-conf-min`, default 0.3 = old behaviour, raise to resist slow drift): the very first lock must
clear the stronger bar (not the base 0.3), and a later match that clears it may override the distance
gate rather than being discarded as a jump.

**Fix 2 — independent, more severe: temporal shot counts were unconditionally zero.** A variable-name
collision: `main()` sets `active` once as the `--backend` selector dict, then the `--temporal`
per-frame tracking loop reuses the SAME name for its per-frame active-track list (`active = []`),
permanently rebinding it for the rest of the function. The results loop's `if name in active` then
checks a backend-name STRING against a list of `(track_id, x, y, is_red)` TUPLES — always false, so
every entry falls to the zero-fill branch regardless of `--backend` or crosshair quality. Fixed by
renaming the loop-local list to `frame_active`.

> **✅ The fix is CORRECT — verified independently.** A/B of the pre-fix (`2a1e99c`) and post-fix
> scripts over the same 19 `run16` frames with `run16`'s own flags: **pre-fix `total_white=0` across
> all 19 frames; post-fix `8, 1`.** The bug and the fix are both real.
>
> **⚠ Two claims about its PROVENANCE were wrong — corrected 2026-07-30 by the driver.**
>
> 1. **It was NOT introduced by the `fix/pellet-counter-restore` merge.** The shadowing is byte-identical
>    at `6cf3dbf` (pre-merge) and `2a1e99c` (post-merge). `git log -S` dates it to **`1d3c721`,
>    2026-07-24 12:33 ("pellet tuning")** — six days before the merge. The merge is exonerated.
> 2. **"This is why `noir-near-ce36` under-reported" does not follow**, and there is an unresolved
>    discrepancy underneath it. Every reference run **postdates** the 12:33 bug commit yet has ~50%
>    non-zero reads: `run16` (12:58) 73 shots / 927 of 1800 non-zero; `run18` (13:46) 70 / 925;
>    `noir-sg` (07-29) 179 / 2691. If the committed code zeroed everything, those are impossible.
>
> **⇒ The real finding, and it is bigger than the bug.** The committed mainline `count-pellets.py`
> has been unable to produce temporal counts **since 2026-07-24**, while every reference number this
> plan cites came from a version that **is not what is in the tree** — almost certainly the
> `fix/pellet-counter-restore` worktree that was live that day. So the reference runs are **not
> reproducible from committed code**. That is a constraint-9 problem one level up from the usual one:
> not "the instrument is in `/tmp`" but "**the instrument in the tree is not the instrument that
> produced the numbers.**"
>
> **Consequences to act on:**
>
> - Do **not** treat run16/run18/noir-sg as reproducible baselines until a post-fix run reproduces
>   them. The `run16` numbers underpin §2.0's lifecycle corroboration and the committed fixture. The
>   fixture _data_ is unaffected (it is stored output), but its _provenance_ is now uncertain.
> - **Add a regression test** pinning "temporal mode yields non-zero counts on a known frame set."
>   This bug survived six days and a merge precisely because nothing asserted it. Needs a small
>   committed frame fixture — `scratchpad/` is gitignored, which is why no such test exists.
> - Re-check whether the 2026-07-29 REJECT runs were affected. `noir-sg`'s 179 shots say no, but that
>   run's provenance is now as uncertain as the rest.

**A/B evidence (600-frame / 20s slices, cached frames where noted, `--relock-conf-min 0.55` default;
`analyze-pellet-tracks.py`'s `check_crosshair_validity`, ≥5% = OK):**

| Video (window)                                        | Template  | Before (this session's baseline)                   | After both fixes                                         |
| ----------------------------------------------------- | --------- | -------------------------------------------------- | -------------------------------------------------------- |
| `noir` t=40–60s (cached frames)                       | global    | 10.5% OK¹ / per-video 1.3% BROKEN                  | 13.3% OK                                                 |
| `noir` t=40–60s (real pipeline)                       | per-video | —                                                  | **11.8% OK, 15 shots (10 valid), avgTotal 8.3**          |
| `isabel` t=40–60s (real pipeline)                     | per-video | —                                                  | 6.8% OK, 9 shots (5 valid), avgTotal 7                   |
| `guilty` t=40–60s (real pipeline)                     | per-video | 0.3–0.0% BROKEN (global) / 0.0% BROKEN (per-video) | **2.5% BROKEN** — still fails                            |
| `marciana` t=0–60s (cached, =run16 range)             | global    | 14.3% OK (original run16)                          | 10.5% OK                                                 |
| `marciana` t=40–60s (real pipeline, different window) | per-video | —                                                  | **2.8% BROKEN** — same reference video, different window |

¹ "Before" for `noir` already reflects re-running the ORIGINAL (unfixed) code against the global
template on this slice — i.e. `noir`'s failure was never inherent to the global template; only the
per-video template + frozen seed combination failed it. Full method + all raw numbers are reproducible
from this section's description; nothing here was hand-picked without checking the failing case too.

**Reading the table honestly:**

- Fix 2 is unconditionally correct and load-bearing — it is a straight variable-collision bug, not a
  tuning question, and it blocks EVERY detection-rate (gate 2) measurement until fixed. Land it
  regardless of what happens with Fix 1.
- Fix 1 is a real, measured improvement (`noir` global-template near-fraction 10.5%→13.3%; `isabel`
  and `noir` per-video-template now both pass where the session's baseline broke) but **not a
  complete solve**: `marciana` — the healthy reference video itself — fails gate 1 (2.8%) on a
  DIFFERENT 20s window (t=40–60s) of the same video that passes at t=0–60s. Seed quality is a
  per-window lottery; raising the relock bar makes bad seeds rarer, not impossible, and costs a
  bootstrap delay when the first ≥0.55 match happens to be late (measured on `marciana`/run16 full
  1800-frame replay: 16s / 480 frames before first lock, vs the original code's near-instant lock).
- `guilty` fails gate 1 with BOTH templates, at every `--track-conf-min` tried (0.3/0.4/0.45/0.5), and
  its per-video template's own bootstrap extraction (conf 0.546, comparable to `noir`'s 0.545 and
  `isabel`'s 0.526) is not obviously worse — so this is not simply "the template is bad." Unexplained;
  not investigated further this session. A structural (non-template) localization method — plan option
  2 — is the most likely next step, since it doesn't depend on finding one lucky confident match.

**Exit criterion status: NOT MET.** Gate 1 fails for `guilty` on every configuration tried, and the
"all four videos, together" conjunction the criterion asks for is therefore unmet even though 3 of 4
pass individually. Gate 2 numbers above are single 20s-window samples, not full-video rates, and
should not be read as the ≥60%-of-expected figure the criterion asks for.

**Deliverable for §0.5 — MET.** `noir` t=40–60s (real `read-pellets.ts` pipeline, both fixes,
`--zoom 2`) passes gate 1 at 11.8% with 15 real shots recovered. Reproduce with:

```sh
npx tsx scripts/probe/read-pellets.ts "docs/probes/ar-sg-smg/noir sg.MP4" \
  --at 40 --dur 20 --fps 30 --zoom 2 --dump-tracks true --out <dir>
```

(needs `scripts/probe/.venv` — in a worktree, symlink it from the main tree first; see START HERE.)

**Housekeeping note — `--zoom` default mismatch.** `read-pellets.ts`'s own default is `--zoom 3`, but
every reference run this plan cites (`run16`, `marciana-solo`, `noir-sg`, `guilty-sg`, `isabel-sg`) was
produced with `--zoom 2`, and the per-video ammo template extractor's own default is also `--zoom 2`.
Passing no `--zoom` flag silently extracts frames at 3x while other defaults still assume 2x scaling in
places, and produced 0 shots in an early attempt this session before the mismatch was caught. Not fixed
here (out of scope for the localization bug) — pass `--zoom 2` explicitly until it is.

**Not done this session:** guilty's fix, a full-video (not 20s-slice) re-run of any video, and the
detection-rate (gate 2) measurement the exit criterion actually asks for. Both fixes are code changes
only, validated on A/B slices; no `docs/probe-data/` fixture or committed dump was added — the noir
artifact above is reproducible-by-command, not committed (constraint 9 is satisfied by the code fix
being in the tree at `scripts/probe/count-pellets.py`, not by a raw JSON dump).

### ✅ 2026-07-30 — DRIVER VERIFICATION of the structural-localization result: CONFIRMED, and it is stronger than reported

> **Independently reproduced by the driver on fresh 600-frame slices**, because the session's own
> validation dumps **did not survive** — no `tracks.json` newer than 12:00 existed anywhere in either
> tree. The code, fixture and selftest are committed (good); the _evidence_ was not. That is the
> constraint-9 failure this thread has already been bitten by once, and it is why the numbers below
> were re-derived rather than accepted.
>
> **Gate 1 — reproduced on all four, structural mode, 600-frame slices:**
>
> | video (slice)    | reported | driver re-run | wander  | verdict |
> | ---------------- | -------- | ------------- | ------- | ------- |
> | `marciana`       | 19.1%    | **17.0%**     | 1304 px | OK      |
> | `noir-near-ce36` | 21.2%    | **21.2%**     | 1675 px | OK      |
> | `guilty-sg`      | 19.7%    | **20.0%**     | 1092 px | OK      |
> | `isabel-sg`      | 19.9%    | **20.5%**     | 1392 px | OK      |
>
> All ≥5% and all far clear of the 300 px freeze line. `noir-near-ce36` — the frozen 87 px / 1.3% dump
> that started this whole thread — now reads **21.2% / 1675 px**.
>
> **⇒ NEW: the 17–22% band is legitimate, and run16's "healthy reference" was itself degraded.**
> The obvious worry was that a _higher_ near-fraction than run16's 14.3% meant the metric was being
> gamed — a lock parked somewhere busier rather than somewhere correct. Tested directly:
>
> - Structural vs run16's validated lock over 600 comparable `marciana` frames: **median distance
>   1.4 px** (dx +1.0, dy +0.0). The two methods find the _same place_ on ~70% of frames — so
>   structural is not sitting somewhere else.
> - On the **183 frames where they disagree by ≥50 px** (bimodal: agree ~1 px, else ~500 px), score
>   the **same detections** against both candidate crosshairs: **240 white detections near
>   structural vs 62 near the template — 3.87×.**
>
> ⇒ **Where they differ, structural is right and the old template lock was wrong.** The higher
> near-fraction reflects better localization, not a gamed metric.
>
> ⚠ **Consequence for the plan's own reference:** run16's crosshair was wrong on roughly 30% of
> frames — and the disagreement is _not_ concentrated in the known dead windows (27% dead vs 36%
> control), so it is a general template weakness, not just a dropout artifact. run16 underpins §2.0's
> lifecycle corroboration and the committed fixture. The lifecycle curve is computed from per-track
> areas over time and is unlikely to be overturned, but **the reference is noisier than this plan has
> been treating it.** Re-derive §2.0's corroboration against a structural-mode run before Phase 2
> leans on it further.
>
> **Still genuinely open (the session flagged this honestly):** gate 2 (detection rate ≥60%) is
> unmeasured on full videos. Gate 1 is necessary, not sufficient — §0.5 needs a `noir` dump that is
> both well-localized _and_ complete. Do not mark Phase 2A closed on gate 1 alone.

### ✅ 2026-07-30 — Phase 2A part 2, structural (non-template) localization: gate 1 MET on all four videos

**What it is.** `locate_ammo_structural()` (`scripts/probe/count-pellets.py`) replaces
`cv2.matchTemplate` with the shape model `segment_ammo_digits` already uses to _read_ the counter:
2-3 bright-or-red glyph-shaped components sharing a top edge (`DIGIT_H_RANGE`/`DIGIT_W_RANGE`/
`DIGIT_ROW_TOL`, reused as-is), scored by the mean brightness of the padded margin AROUND the row
excluding the glyphs (the counter sits on a dark badge; a floating damage number of the same glyph
shape does not). Selection (`locate_crosshair_structural`) prefers the candidate nearest the previous
lock within `--max-template-disp` (continuity, same gate the template path uses); on loss it
re-acquires from the darkest-surround candidate rather than carrying the stale position forward — per
H1's finding that carrying forward through a multi-second gap while the aim point moves is wrong by
construction. Enabled via `--locate structural` (`count-pellets.py`) / `--locate structural`
(`read-pellets.ts`, which also skips the now-unneeded per-video template extraction and VLM crosshair
fallback). `--relock-conf-min 0.55` is untouched — this is a different code path, not a retuned
threshold, and does not revisit §H5's finding that no confidence value can work for the template path.

**Why this isn't another confidence knob.** §H5 killed `--relock-conf-min` tuning because the false
seed and the real box occupy overlapping _scalar confidence bands_ — no cutoff separates them. This
method has no such scalar: admission is categorical (a component either has 2-3 row-mates of digit
size sharing a top edge, or it doesn't), and disambiguation between two admitted candidates uses two
cues from a different evidence class (physical badge darkness + frame-to-frame continuity), not a
threshold on the same channel that failed.

**Result — the concrete target.** `marciana` (slug `marciana`, SG/Iron, `marciana-solo.MP4`) dead
windows, direct `count-pellets.py --temporal --locate structural` over the cached 1800-frame
`h1-marciana-treecode` set (same params as H1):

| Window (fightT)             | Old (template, §H5)  | New (structural)                   |
| --------------------------- | -------------------- | ---------------------------------- |
| DEAD 41.4-53.3 (358 frames) | 0% frames ≥0.55 conf | **53.9% non-zero, 358/358 locked** |
| DEAD 68.7-75.4 (202 frames) | 0% frames ≥0.55 conf | **53.5% non-zero, 202/202 locked** |
| control 56-68 (361 frames)  | both detect          | 48.5% non-zero, 361/361 locked     |

The dead windows are no longer dead — their non-zero-frame rate now _exceeds_ the control window and
matches run16's independent per-frame-activity prediction (46% both windows, §H1 driver analysis).
Confirmed end-to-end (not just the direct-frame path) via the real orchestrator on the actual video,
`fightT` 35-50s spanning straight through the 41.4 dead-window boundary:

```sh
npx tsx scripts/probe/read-pellets.ts docs/probes/clean-weapons/marciana-solo.MP4 \
  --at 41 --dur 15 --fps 30 --zoom 2 --locate structural --dump-tracks true --out <dir>
# -> 19 shots (15 valid, expected ~23), avg total 7.9 — shots recovered continuously through
#    fight=41.10s..49.77s, the exact stretch that read 0 shots under template matching.
```

**Gate 1 (crosshair validity) — MET, all four videos together**, via
`analyze-pellet-tracks.py`'s `check_crosshair_validity()` (≥5% = OK) and `crosshair_wander()`
(FROZEN below 300px), same cached frame sets `guilty`/`isabel` failed gate 1 on under every
template configuration tried:

| Video      | Frames | Before (template, this doc's own record) | After (structural)   |
| ---------- | ------ | ---------------------------------------- | -------------------- |
| `marciana` | 1800   | 14.3% OK (healthy reference)             | **19.1% OK, 1783px** |
| `noir`     | 600    | 1.3% BROKEN, 87px FROZEN                 | **21.2% OK, 1675px** |
| `guilty`   | 5738   | 0.0-2.5% BROKEN on every config tried    | **19.7% OK, 2326px** |
| `isabel`   | 5721   | 6.8% OK (marginal, per-video template)   | **19.9% OK, 2080px** |

All four now score OK and land in a tight 17-22% band — above `marciana`/run16's own reference
(14.3%), not just above the 5% bar — with wander 1638-2326px, in family with run16's 2351px and far
above the 300px freeze line. Full-run lock coverage: `guilty` 97.8%, `isabel` 97.9% (vs "3 shots on a
180s fight" — i.e. essentially never — under template matching).

**Gate 2 (detection rate ≥60% of expected) — NOT independently re-measured this session** for the
full-video case on all four; not run for lack of time, not because it failed. What exists: the
15s `marciana` smoke run above recovers 19/23 shots (83%) through the dead-window boundary, and the
full-run lock-coverage/non-zero-frame numbers above are consistent with real, continuous firing
detection rather than the near-total loss template matching produced on `guilty`/`isabel`. A proper
gate-2 number needs a full-video `read-pellets.ts --locate structural` run (with the VLM timer pass)
on all four videos, which this session did not do.

**Self-test committed:** `scripts/probe/count-pellets.py --selftest` validates
`locate_ammo_structural` against `scripts/tests/fixtures/pellets/ammo-box-structural-frame350.png` —
a real crop (marciana, frame 350, inside the DEAD 41.4-53.3 window) containing both the true ammo
box and a 5-digit floating damage number of similar glyph brightness, so the test proves the
STRUCT_ROW_SIZES count filter rejects the look-alike rather than merely getting lucky on one frame.

**Not done / open:** the digit-row → crosshair offset (`--struct-offset-x/y`, default 162/-12.5 at
zoom 2) was calibrated against the template path's own offset on 30 `marciana` frames (sd < 1px) —
it has not been independently cross-checked against `noir`/`guilty`/`isabel`, only via the validity
metric working end-to-end on those videos. Gate 2 (above). Whether the structural method should now
_replace_ the template default or stay an opt-in `--locate structural` flag is an owner call, not
made here.

---

## Phase 2 — Lifecycle-aware counting (the core of the redesign)

**The governing principle: PROCESS all 13 frames, COUNT on ~5.** Three jobs want three different
frame sets, and the current pipeline conflates them into one median frame.

| Job                                   | Frames         | Why                                              |
| ------------------------------------- | -------------- | ------------------------------------------------ |
| **Identity** — is this blob a pellet? | **all 13**     | the lifecycle curve _is_ the discriminator       |
| **Counting** — how many?              | **f1, f8–11**  | f3–4 merge pellets; f12–13 are transparent       |
| **Phase anchoring** — where is f1?    | onset + growth | you cannot index the lifecycle without the onset |

### 2.0 — Why the full lifecycle is worth paying for

`scratchpad/pellets/HANDOFF.md` records a hard dead end: _"the extra components are life=1 blips that
look identical to real pellets (same size med 159 vs 166, same circularity) — **no per-component
filter separates them**."_ That is true, and it is why four tuning passes failed: they all searched
for a per-component feature that does not exist.

**The lifecycle is not a per-component feature — it is a per-track temporal one.** A real pellet must
appear at 1×, double by f3, hold exactly one frame, decay monotonically over 7 frames, and **fade
before vanishing**, all at a fixed position. A VFX blip does none of that. This is the precision
lever the record concluded was unavailable.

**And the blast gives a joint constraint on top: all ~10 pellets of one shot share the same t0.**
They appear together on one frame. Once t0 is known, every frame's _expected_ pellet size is known —
which collapses the area gate from today's **30× band** (`min_area 25` … `max_area 750`, wide enough
to admit nearly anything) to a **~2.5× per-frame expectation**. That is the single largest precision
gain available in this reader, and it exists _only_ if the lifecycle is covered.

**Corroboration that the spec is safe to build on (2026-07-30).** The owner's lifecycle predicts an
area-decay curve. Compared against the run16 measurement — taken for an unrelated purpose, before the
spec was written:

```
predicted, odd phase  (acquire f3) : 1.00  0.86  0.62  0.41  0.25
predicted, even phase (acquire f4) : 1.00  0.73  0.51  0.33  0.25
MEASURED  (run16, mix of phases)   : 0.93  0.57  0.43  0.33  0.22
```

Right shape, right ~4× range, sitting slightly under the phase-mix average — the expected direction
for a brightness threshold eroding the dim anti-aliased edge as the pellet shrinks. The spec predicts
a measurement nobody took with it in mind.

### 2.1 — Steps

1. **Extract at 60 fps with an ROI crop.** 60 fps is required: at 30 you hit f1 only ~half the time
   and get 2 of the 4 frames in f8–11. **The cost objection dissolves** — detection currently runs on
   the full 2606×792 damage-area frame and filters by crosshair distance afterward. Cropping to the
   disc ROI first (320×320 at `pellet_radius` 160 zoomed) is ~20× fewer pixels, so 60 fps + ROI
   should run _faster_ than today's 30 fps full-frame. (`HANDOFF.md` §4 already lists this crop as an
   open speed item; it now has a second and better reason.)
2. **Emit tracks, not just counts.** `temporal_filter` (`count-pellets.py:279`) collapses tracks to
   per-frame `{white, red}` at line 336. Emit the track list (id, first/last frame, position,
   per-frame area, circularity, is_red) alongside.
3. **Add gap tolerance to the linker.** `count-pellets.py:296` matches only `last_frame == fi-1` —
   zero tolerance. One missed frame splits a pellet in two. (Note: Phase 0.2 showed this is _not_ the
   dominant fault, so this is hygiene, not the fix. Do not over-invest.)
4. **Estimate t0 per blast** from the ensemble of candidate tracks — the shared-onset constraint makes
   this robust: the correct t0 is the one that maximises how many tracks fit the expected curve.
5. **Score each track against the lifecycle template** (normalised size-vs-phase, plus the
   fade-before-vanish requirement). Accept/reject on the fit. **This replaces the `lifetime <= 7`
   hard cutoff entirely**, which also retires the Phase 0.3 boundary bug.
6. **Apply phase-indexed size gating** — at each frame, gate area against the expected size for that
   phase rather than the global 25–750 band.
7. **Count accepted tracks, using f1 and f8–11 for the count/position read.** Do **not** count on all
   13: f3–4 merge and would re-introduce the occlusion undercount; f12–13 are transparent and add
   variance.
8. Keep the marker-based binary core-hit fallback (`read-pellets.ts:632–648`) unchanged — it is
   owner-validated and orthogonal. Red pellets follow the same lifecycle, so phase-indexed gating
   applies to them too (with the `red-gb-max` ceiling raised toward the ~90 anti-aliasing floor
   `redprobe.py` measured).
9. `trackpy.link()` replaces the greedy linker **only if** the greedy one measurably fragments on
   cached detections. Do not swap speculatively.

### 2.2 — Exit criterion

Count RMSE improves on the Phase 1.2 labeled set **and** the re-generated f8–11 ground truth (per
Phase 1.2 — the existing 6-shot labels were counted on peak frames and are suspect), **and** the
`noir` per-band means move toward the `noir-solo-recon.json` anchors (mid 10.0 / near 8.9 / far 7.4 /
midfar 8.8) — specifically the far/near = 0.831 and midfar/near = 0.989 **shape ratios**, since the
2026-07-29 failure was band-dependent flattening.

**Precision check, and it is the real prize:** the "life=1 blips indistinguishable from pellets"
population should now be separable. Report how many candidate tracks the lifecycle filter rejects and
spot-check a sample visually. If it rejects near-zero, the lifecycle template is not discriminating
and step 5 has failed regardless of what the count does.

### 2.3 — Kill conditions

- **Lifecycle not stable across units** → confirm the same decay curve on `noir` with
  `analyze-pellet-tracks.py` **before** building steps 4–6. One run. If `noir`'s curve differs
  materially from `marciana`'s, the template must be per-unit or per-VFX-load, which changes the
  design; do not discover that after implementing.
- **t0 cannot be estimated reliably** (overlapping blasts, fire-holds) → fall back to counting on
  the best-scoring 4-frame window within each event rather than an absolute phase index.
- **No count improvement but good precision** → keep the lifecycle filter anyway (it fixes the
  false-positive population) and move the count problem to Phase 3.

### 2.4 — Note on comparability

This changes the _definition_ of a shot count. The 6-shot ground truth must be re-scored under the
new definition, and run16–run19 numbers are **not** comparable to anything produced after this phase.

---

## Phase 3 — Matched-filter detection (survey C1)

**Demoted from "the fix" to "an enabler for Phase 2."** Phase 0.2 measured per-frame detection at
7–10 white per blast frame against a 7–9 ground truth — it is approximately correct, so replacing the
detector is not, on its own, the win. What Phase 2 actually needs from it is different and narrower:

- **Detection at the f8–11 tail**, where pellets are back to ~1× and dim. Phase 2 counts there, so
  recall in that phase window is what matters — not aggregate per-frame recall.
- **Detection at f1 and the f12–13 fade**, which the lifecycle template needs to confirm the
  appear-and-fade signature. A pellet whose onset and fade are both missed cannot be scored on the
  curve, so the identity filter degrades.
- **Size fidelity across the 8.6× dynamic range**, since phase-indexed gating compares measured area
  to expected area. A threshold detector systematically under-reads dim edges — visible in the
  corroboration table above, where measured decay runs below prediction. That bias is tolerable for
  counting and **not** tolerable for phase-indexed gating.

⇒ Score Phase 3 on **phase-resolved recall** (recall at f1, f8–11, f12–13 separately), not on
aggregate per-frame counts. Aggregate recall is already fine and will not move.

**Steps**

1. Add `count-pellets.py --detector {threshold,log,dog}`, defaulting to `threshold` so nothing
   changes until the A/B says so. Implement `log`/`dog` via `scipy.ndimage.gaussian_laplace`
   (already a dependency — `skimage` is **not** installed in `scripts/probe/.venv`), thresholding on
   **filtered response** (local contrast), not absolute pixel value.
2. **Calibrate the scale and threshold properly.** The 2026-07-30 exploratory LoG run returned
   170–200 detections/frame — saturated on background texture — because the threshold was picked
   blind. Fit sigma to the pellet's actual radii (~1× ≈ 4.2 px, 2× ≈ 12.4 px at 2× zoom, from the
   56/481 px² trough/peak areas) and fit the response threshold on the Phase 1.2 labeled set. Never
   fit on the thing you score.
3. Keep the white/red channel split: filter a red-chroma map for the core triangles and a luminance
   map for white pellets.
4. If per-scale cost dominates, `photutils.DAOStarFinder` is the faster single-kernel equivalent
   (DAOFIND, Stetson 1987).

**Exit criterion.** Phase-resolved recall at f8–11 and at f1/f12–13 beats the threshold baseline, and
measured-vs-expected area tracks the lifecycle curve more tightly than the threshold detector's
(which runs ~10–25% low at the dim end). Jaccard/F1 must not regress **on all evaluable video
backgrounds**.

**Scoring caveat.** Score Phase 3 on `marciana` + `noir` only until Phase 2A lands. `guilty`/`isabel`
cannot evaluate a detector while localization is failing — their 3-shot and 21-shot runs measure the
template, not the threshold. Reading them as detector evidence is what produced the conflated
2026-07-29 verdict.

**Kill condition.** Better on synthetic but flat on `noir`'s band shape ratios → the intensity model
was not the operative fault either. At that point the remaining suspects are event segmentation
(`EVENT_MIN`/`MAX_GAP` merging adjacent blasts) and the aim-disc radius assumption — both cheap to
sweep on the Phase 1.1 cache, and both should be swept before reaching for Phase 5 or 6.

---

## Phase 4 — Top-hat + local-contrast preprocessing (survey C4)

**Only if Phase 3's false-positive rate is still the binding error.** Composable, cheap, training-free.

**Steps.** Add `--preprocess tophat-lcm`: `cv2.morphologyEx(..., MORPH_TOPHAT)` with a structuring
element slightly larger than a pellet, then a Local Contrast Measure map, then feed the Phase 3
detector. Sweep on cached detections (Phase 1.1) — this is ~30 lines and one sweep.

**Exit criterion.** False positives drop without a recall loss on the synthetic set. The known
false-positive population is well characterized (`HANDOFF.md`: the 31.73 s "shot" with red perimeter
VFX and zero pellets) — it must be rejected.

---

## Phase 5 — Exact-sprite matching (survey C3)

**Highest ceiling, highest variance.** Split into a cheap spike and an expensive build; do the spike
early (it can run in parallel with Phases 2–3), commit to the build only on spike success.

**Spike (~1 day, do it early).** Extract the pellet-hit and core-triangle sprites via AssetRipper
(official Mac releases) + NikkeTools for NIKKE's asset encryption, or pull from `nikke-db`.
Correlate the raw sprite against a known-good frame from `run18/debug-markers/` and look at the NCC
peak.

- **Sharp peak** → the marker is blitted; build proceeds.
- **Diffuse/absent peak** → the game blends or shader-tints the marker, the raw sprite does not match
  what is on screen, and **C3 is dead**. Record it as such in the survey's rejected table. This also
  means Phase 1.2's synthetic set must keep using real cropped patches — which is why 1.2 was
  deliberately built not to depend on this.

**Build (only on spike success).** `Multi-Template-Matching` (`matchTemplates` with score threshold +
expected-object-count + NMS), one template per lifecycle stage (small/peak/shrink) × colour, with
alpha masks so transparent corners don't correlate against the background.

**Exit criterion.** Near-exact counts on the held-out real shots — this is the only candidate that
could plausibly reach ±0.5 of 10 outright.

---

## Phase 6 — Learned detectors (survey C5/C7)

**Last resort, and only on a residual.** By this point the labeled set exists, so the marginal cost
is the training loop.

- **deepBlink** (C5) if the residual is _threshold brittleness across videos_ — its headline property
  is threshold-independence, which is our recurring failure mode.
- **YOLOv8 + SAHI** (C7) if the residual is _small-object recall_. Mandatory guard: train across
  backgrounds from all four videos — YOLO's documented weakness is exactly "doesn't extrapolate well
  to the same object in other backgrounds", which is the `marciana`→`noir` failure we already lived.

**Exit criterion.** Beats the best classical pipeline on held-out real data, not just synthetic.
If it only wins on synthetic, the compositing assumption is leaking and the win is not real.

---

## What is explicitly NOT in this plan

Recorded in the survey's rejected table; repeated here so no phase quietly reintroduces them: VLM
counting as the primary counter, SAM/SAM 2 as a detector, Hough Circle Transform, the peanut
multiplicity heuristic (measured regression at run19), and **further parameter tuning of the current
threshold detector**.

**Two amendments from the lifecycle spec:**

- **The peanut heuristic is not just rejected, it is obsolete.** It existed to un-merge pellets that
  overlap at the f3–4 peak. Phase 2 stops counting on those frames, so the problem it addressed no
  longer arises. Delete it rather than leaving it disabled beside its replacement (per the repo rule
  on not parking known-wrong models next to their successors).
- **The ring/annulus detector rejection is RE-OPENED as a cheap re-test.**
  `marker_detect2.py`/`read-markers.py` was parked for requiring "a dark grey ring our pellets lack"
  — but the owner's spec says pellets **do** have a shadowed surround, and that tool was evaluated on
  peak frames, where a neighbouring pellet destroys the ring. Re-test it at **f8–11**, where pellets
  are separated and the surround should be intact. ~1 hour. This is a re-test of one structural
  filter under corrected conditions, **not** a revival: its white-detection thresholds were
  separately shown to under-count, and its radial-landing output plus ammo-box crosshair track remain
  the parts worth salvaging (the latter feeds Phase 2A).

---

## Critical path

```
0.1 offset fix · 0.1b two-fault decomposition · 0.2 ✅DONE
0.5 lifecycle stability on noir  ·  0.6 the ~90 denominator     ← both free, both gating
                          ↓
        1.1 cache-then-sweep + 1.2 labeled set (labels at f8–11)
                          ↓
        ┌─────────────────┴─────────────────┐
   2A localization                    2 lifecycle-aware counting
   (unblocks guilty/isabel)      (60fps + ROI · t0 · template · phase-gated)
        └─────────────────┬─────────────────┘
                          ↓
              3 matched-filter detection
              (scored on PHASE-RESOLVED recall)
                          ↓
            [4 top-hat/LCM · 5 exact sprite · 6 learned]
                        as the residual dictates
```

**Phases 2A and 2 are parallel** — they address the two distinct faults Phase 0.1b separates, and
they touch different code. Phase 3 follows Phase 2 rather than preceding it, because Phase 2 defines
what the detector is being asked for (recall at f8–11 and f1/f12–13, plus area fidelity) — without
that, Phase 3 has no meaningful exit criterion, since aggregate per-frame recall is already adequate.

**Two free Phase 0 items now gate the build:**

- **0.5 — lifecycle stability.** Run `analyze-pellet-tracks.py` on a `noir` dump and check the area
  decay against the same prediction table. Phase 2 steps 4–6 assume one template fits all units; if
  `noir`'s curve differs materially the template must be per-unit or per-VFX-load. **One run, and
  discovering it after implementing is the expensive path.**
- **0.6 — the ~90 denominator.** "70 of ~90 shots" is the largest measured gap, but ~90 assumes
  uninterrupted 1.5 shots/s across the window. Boss-transition fire-holds would make the real
  detection rate substantially better than reported. **Check the denominator before treating a 22%
  miss rate as a defect** — it is free and it may dissolve the problem entirely.

Phase 0 is unblocked today and needs no new footage. **Do not build anything before it lands** — it
already overturned this plan's own first draft once (see the 0.1 callout).

---

## Correction log

- **0.1 rewritten (same session).** First draft led with "the −62.5 offset broke the 2026-07-29
  validation." Refuted on timeline (artifacts 12:19–13:33, commit 15:17) and on magnitude (a
  near-disjoint window collapses counts to ~0; the runs reported `avgTotal` 7.1–7.3). The bug is
  real but **latent**, not historical. The check that caught it — does this cohere with the reported
  band means? — is the same check that should have been applied to the 2026-07-29 REJECT itself.
- **0.1b and Phase 2A added as a result.** Reading the run artifacts instead of the verdict showed
  two different faults (`guilty`/`isabel` localization vs `noir` method-level coldness) conflated
  into one "the counter failed" conclusion, plus an un-diagnosed `noir` 179→107 regression in the
  patch that was adopted to fix `guilty`.
- **`fix/pellet-counter-restore` merged (2026-07-30, owner-flagged).** Resolves §0.1 in both files,
  retires this plan's own "do not merge it wholesale" warning (the staleness was fixed upstream that
  day), and lands the parked marker code so the f8–11 ring re-test and Phase 2A's crosshair salvage
  are unblocked. ⚠ **Touches a protected path** — `.claude/skills/probe-processing/SKILL.md` — which
  `CLAUDE.md` says never to modify without an explicit owner ask; merged under the owner's
  "pellet-counter work wasn't merged in" instruction, and the change is corrective (it demotes
  `read-markers.py` to PARKED WIP and names `read-pellets.ts` the SG counter). **Flagged for owner
  review rather than treated as covered** — revert that one file if the ask did not extend to it.
- **Phase 2 rewritten around the lifecycle (owner spec + §2.0 corroboration).** The design changed
  from "count track births" to **process all 13 frames, count on ~5** — separating identity (the
  full curve), counting (f1, f8–11) and phase anchoring (onset). The reason is specific: the record's
  hardest dead end was _"no per-component filter separates blips from pellets"_, which is true, and
  the lifecycle is the first candidate feature that is **not** per-component. The shared-t0 constraint
  then collapses the area gate from a 30× band to a ~2.5× per-frame expectation.
- **Phase 3 demoted, and its exit criterion replaced.** Per-frame detection measured adequate
  (7–10 vs 7–9 ground truth), so detector replacement is an enabler for Phase 2, not the fix. It is
  now scored on **phase-resolved recall** (f8–11, f1, f12–13) and area fidelity across the 8.6×
  dynamic range — aggregate recall is already fine and will not move.
- **0.5 and 0.6 added as gating free checks.** 0.5 because Phase 2's one-template-fits-all-units
  assumption rests on a single video, and finding out after implementing is the expensive path.
  0.6 because the headline "22% of shots missed" may be an artifact of a cadence-derived denominator
  that ignores fire-holds — worth retiring before it drives work.
