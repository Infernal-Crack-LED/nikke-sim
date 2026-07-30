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
- **Re-open the ring-detector rejection cheaply.** `read-markers.py` was parked for requiring "a dark
  grey ring our pellets lack" — but the owner says the pellets _do_ have a shadowed surround, and
  that tool was evaluated on peak frames where a neighbour destroys the ring. A re-test at f8–11 is
  an hour. (Re-test, not revival — its white thresholds were separately shown to under-count.)

**⇒ Consequence for ordering.** Detection is _not_ the top defect, so the draft's promotion of
matched-filter detection ahead of counting is **withdrawn** — the phase order below stands as
written: **Phase 2 (shot-level counting + phase-locking) before Phase 3 (detector replacement)**.
Phase 0.2 re-targets: the open question is no longer "does per-frame detection work" (it does) but
**"why are 22% of shots missed entirely?"** — a shot-detection/event-segmentation question, and the
largest single measured gap in the reader.

---

## Working agreement

- **Worktree.** `git worktree add ../nikke-sim-wt-pellet -b fix/pellet-reader` (public `.git`).
  `scripts/probe/**` is not in the protected-paths table, but this is a multi-phase build on a shared
  tree — isolate it. Note: the restore worktree has no venv; use the main tree's
  `scripts/probe/.venv/bin/python`.
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

**Steps.** Cherry-pick `b69b5c6`'s one-line fix onto the worktree. Do **not** merge
`fix/pellet-counter-restore` wholesale — it branched off an older `origin/main` and its diff deletes
~3,600 lines of tests/fixtures that exist on `main` today. Add a vitest pin on the default so it
cannot silently flip again.

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

**Steps.** From the same dump, count tracks at lifetime 8–10 with pellet-like area/circularity inside
shot events. Sweep the cutoff 7→10 over the cached tracks and re-score the 6 owner-counted shots.

**Exit criterion.** If lifetime 8–10 holds a meaningful population of pellet-shaped tracks, raise the
cutoff (or replace the hard cutoff with a lifetime _prior_ in the Phase 2 scorer) and record the
count delta. If that band is near-empty, the boundary is not a live fault — note it and move on.

### 0.4 — Simulate Phase 2 offline, for free

Track-birth counting can be evaluated **without touching the pipeline**: `run16/tracks.json` already
has every track's first/last frame and position. Re-score the 6 owner-counted shots as _"number of
distinct pellet-shaped tracks born within the event window"_ and compare to the current
median-frame blob count.

**Exit criterion.** This is the go/no-go for Phase 2 at zero implementation cost. If offline
track-birth counting moves the 6 shots toward 7/9/7/9/8/8, build it. If it doesn't, Phase 2 is not
the fix and Phase 3 moves up.

> **Phase 0 deliverable:** one committed `analyze-tracks.py`, one short findings note appended here,
> and a decision on whether 0.1 invalidates the 2026-07-29 REJECT. Nothing else is built until this
> lands.

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
   the HP bar, so the clutter distribution is real. Sample lifecycle stage and occlusion explicitly.
3. Emit frames + exact labels (count, positions, occlusion flags).
4. Add `scripts/probe/score-pellets.py`: Jaccard/F1 + count RMSE against labels — the ISBI
   Particle-Tracking-Challenge metric pair the reference fields select on.

**Exit criterion.** Any candidate detector can be scored on one command, across all four video
backgrounds, and the current detector's score is recorded as the baseline to beat.

**Honest limit — state it in the fixture's README.** Synthetic labels validate the _detector_, not
the compositing assumption. If the game blends the marker rather than blitting it, synthetic frames
are systematically easier than real ones and scores run optimistic. **Mitigation, and it is
mandatory:** the 6 owner-counted shots and the `docs/probe-data/*-sg-band.json` anchors stay as a
held-out real-data check. A candidate must pass **both** to be adopted. Per
`docs/VALIDATION-INDEX.md` §"Validating a READER", the existing labeled records are the right
instrument here.

---

## Phase 2A — Crosshair localization (the `guilty`/`isabel` blocker)

**Promoted to a first-class phase by Phase 0.1b.** This is not a contingency — it is an
already-evidenced fault, and it is the _only_ fault visible on `guilty`/`isabel`, which never get far
enough for any counting method to matter. It runs in parallel with Phase 2; they touch different
code.

**The problem.** Crosshair position comes from `cv2.matchTemplate` on a 74×74 ammo-box template
extracted from one `marciana` frame. It does not generalize (`guilty-sg`: 3 shots on a 180 s fight).
The per-video-template patch improved `guilty` 3→21 but regressed `noir` 179→107 — so the current
state is a trade, not a fix.

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

**Exit criterion.** `guilty` and `isabel` reach detection rates comparable to `noir` (≥60% of
expected shots, the pre-committed validity bar from the 2026-07-29 plan) **without** regressing
`noir` or `marciana`. All four videos must pass together — that conjunction is the whole point.

**Kill condition.** If no localization method generalizes, fall back to a per-video calibration step
with an explicit committed template per recording and a lock-quality metric that **fails loudly**
rather than silently producing 3 shots. A counter that knows it failed is usable; one that reports
3 shots as data is not.

---

## Phase 2 — Count tracks, not blobs (survey C2)

**Highest P(success) of the method changes**, because it needs no new detector — it changes how
existing detections are aggregated, and Phase 0.4 will already have measured the effect offline.

**Why it is the direct remedy if F1 is true.** If each pellet is detected on only ~1 frame, and 10
pellets peak on _different_ frames within the event, then no single frame ever shows more than 2–3
blobs — and the current median-frame estimator can never recover the other 7. Counting **track
births across the event** recovers exactly that spread evidence. F1 and F2 are the same wound.

**Steps**

1. `temporal_filter` (`count-pellets.py:279`) currently collapses tracks to per-frame `{white, red}`
   counts (line 336). Emit the **track list** (id, first_frame, last_frame, mean position, area,
   circularity, is_red) alongside the per-frame counts.
2. In `read-pellets.ts`, replace the median-frame estimator (`:602–630`) with: **shot count =
   distinct pellet-shaped tracks born within the event window**, with a lifetime prior rather than
   the hard `<= 7` cutoff (per Phase 0.3), and a spatial-plausibility filter (inside the aim disc).
3. Keep the marker-based binary core-hit fallback (`:632–648`) unchanged — it is owner-validated and
   orthogonal.
4. Replace the greedy nearest-neighbour linker with `trackpy.link()` **only if** the greedy linker
   measurably fragments tracks on the cached detections. Do not swap it speculatively.

**Exit criterion.** Count RMSE improves on the Phase 1.2 synthetic set **and** the 6 owner shots move
toward ground truth, **and** the `noir` per-band means move toward the `noir-solo-recon.json` anchors
(mid 10.0 / near 8.9 / far 7.4 / midfar 8.8) — specifically the far/near = 0.831 and
midfar/near = 0.989 shape ratios, since the 2026-07-29 failure was band-dependent _flattening_.

**Kill condition.** No improvement on the synthetic set → aggregation was not the fault; the
detections themselves are wrong. Go straight to Phase 3.

**Note.** This changes the _definition_ of a shot count, so the 6-shot ground truth must be re-scored
under the new definition before any comparison to run16–run19 numbers. Old runs are not comparable.

---

## Phase 3 — Matched-filter detection (survey C1)

Replaces the absolute RGB threshold — the root cause behind F1 — with the approach all three
reference fields converged on.

**Steps**

1. Add `count-pellets.py --detector {threshold,log,dog}`, defaulting to `threshold` so nothing
   changes until the A/B says so. Implement `log`/`dog` via `skimage.feature.blob_log` /
   `blob_dog`, thresholding on **filtered response** (local contrast), not absolute pixel value.
2. Keep the white/red channel split: run the filter on a red-channel-dominant map for the core
   triangles and a luminance map for white pellets.
3. Two parameters only — approximate pellet diameter (known: ~166 px² at 2× zoom → r ≈ 7.3 zoomed px)
   and a response threshold. Fit the threshold **on synthetic data**, score on the held-out real
   shots. Never fit on the thing you score.
4. If `blob_log`'s per-scale cost dominates, `photutils.DAOStarFinder` is the faster
   single-kernel equivalent (DAOFIND, Stetson 1987).

**Exit criterion.** Track lifetimes rise from ~1 toward 5–7 (the direct F1 test), and Jaccard/F1
beats the Phase 1.2 baseline **on all four video backgrounds** — cross-background generalization is
the criterion that the previous four tuning passes failed, so it is non-negotiable here.

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
counting as the primary counter, SAM/SAM 2 as a detector, Hough Circle Transform, the ring/annulus
detector (`marker_detect2.py` / `read-markers.py` — except its crosshair track and radial output,
which Phase 3's kill-path salvages), the peanut multiplicity heuristic (measured regression at
run19), and **further parameter tuning of the current threshold detector**.

---

## Critical path

```
0.1 offset fix ─┐
0.1b two-fault decomposition ─┤
0.2 F1 / 0.3 lifetime boundary / 0.4 offline track-birth ─┘
                          ↓
        1.1 cache-then-sweep + 1.2 labeled set
                          ↓
        ┌─────────────────┴─────────────────┐
   2A localization                    2 track counting
   (unblocks guilty/isabel)      (fixes noir/marciana coldness)
        └─────────────────┬─────────────────┘
                          ↓
                 3 matched-filter detection
                          ↓
            [4 top-hat/LCM · 5 exact sprite · 6 learned]
                        as the residual dictates
```

**Phases 2A and 2 are parallel** — they address the two distinct faults Phase 0.1b separates, and
they touch different code. Phase 3 needs both, because its exit criterion is cross-video
generalization and `guilty`/`isabel` can't participate until 2A lands.

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
