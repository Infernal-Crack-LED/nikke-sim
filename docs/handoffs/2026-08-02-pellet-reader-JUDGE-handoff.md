# Pellet reader — judge handoff after the 2026-08-01 elimination sweep

> AI-facing. Written 2026-08-01 at the end of a long session, for the judge session that follows.
> Supersedes nothing; it CONTINUES
> [`2026-08-01-pellet-cascade-JUDGE-handoff.md`](2026-08-01-pellet-cascade-JUDGE-handoff.md), whose
> §1 pre-commitment and §3 graveyard are still live and still binding. **Read that one too.**
>
> **Slugs:** `marciana` (SG/Iron — `docs/probes/clean-weapons/marciana-solo.MP4`; **not**
> `marciana-marine-study`, AR/Iron), `noir`, `guilty`, `isabel`. All SG, `ammo: 9`.

---

## 0. The one-paragraph state

The counter reads **0.8–1.6 pellets/10 cold** against a ±0.25 budget. Five candidate causes were
ELIMINATED on 2026-08-01 and one PARTIAL cause was measured. The partial cause is **undetected shots**
— a missing shot contributes its whole ~8.4 pellets. Measured against the ammo counter as an
independent arbiter: **3.9–6.8% of shots**, where **8–16%** is needed to carry the whole bias. Real,
roughly a quarter to a half of the problem, and **the remainder is unexplained with no live candidate.**
The owner ask was ANSWERED 2026-08-03 (36 hand-counted shots / 4 magazines on `isabel`): the arbiter
reproduces it exactly, so the **3.4× swing is resolved in favour of the admissible reading (~4.4%)**
and the raw 14.7% is an artifact — the channel stays partial (`docs/probe-runs.md` §4). The live
unknown is now the **unexplained remainder of the cold bias, with no live candidate**, and — for the
instrument rather than the physics — whether the reader's per-event behaviour matches its aggregate
(§4.5's n=1 window misses 6 real shots while inventing 4 non-shots).

## 1. What was settled 2026-08-01 — all recorded in `docs/probe-runs.md`

| #   | Question                                    | Outcome                                                                                                                                                                                                                                                                                                            |
| --- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Do real pellets survive the filter?         | **94.6%** both-pass (n=168 instances / 42 pellets). Filters near-inert on real pellets (`min_area` 2.45%, `min_circ` 0.61% of found). The synthetic 71.6% characterises the GENERATOR. All 9 failures at f11, pellets faded to 199–209 vs the WHITE_LO 210 mask — a fade-out boundary effect, not a filter defect. |
| 2   | Is the counting window too small?           | **ELIMINATED.** Precision falls 0.906 → 0.853 → 0.807 as radius grows; 175→190 adds +10 FP and ZERO TP; the confirmed true-zero shot starts reporting 1.00 at radius 175. Cause: `crop_disc()` slices a SQUARE with no mask, so scene content runs to r=259 in the corners.                                        |
| 3   | Does the n=120 synthetic cascade reproduce? | **YES, exactly** (96.89 → 85.38 → 80.23 → 71.61). `min_circ` dominance CONFIRMED at 17.19% vs 11.88%. The slice fixture's inversion is small-sample noise (sequences 0/30/60/90; two reject ZERO on circ).                                                                                                         |
| 4   | Is the crop mis-centred per shot?           | **NO.** Offsets are within centroid noise — per-axis SE 29.5/22.0 px, every shot ≤2.7σ, pooled mean t = (0.08, 0.24).                                                                                                                                                                                              |
| 5   | Do stale locks reach the counting frames?   | **No decision-rule row fires.** Counting frames are DEPLETED (6.05%/13.89% vs 20.01% all-frames), A/B 1.1 SE from zero. **But the depletion is SELECTION — see §3.**                                                                                                                                               |
| 6   | Is there a missing-shot channel?            | **YES, partial.** 3.9–6.8% of shots vs the 8% needed. The "between" row fired.                                                                                                                                                                                                                                     |

## 2. Provenance ledger — which numbers carry which weight

| Figure                                         | Weight                                                                                                                                                                                                                                                  |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Real BOTH-pass **94.6%**                       | **Strong.** xy-matched, gate-validated, self-pinned by `real-fidelity-slice.json`. Corroborates the independent bias-derived 0.925–0.98 reference. One clip, one unit.                                                                                  |
| n=120 cascade **71.6%** + `min_circ` dominance | **Strong, confirmed.** Re-run by two independent script instances agreeing on every field; the "judge never re-ran it" gap is CLOSED.                                                                                                                   |
| Centroid SE **29.5/22.0 px**                   | **Strong.** Independently reproduced by the driver from the positions fixture. Supersedes the 18 px assumed in the centering plan.                                                                                                                      |
| Stale-lock prevalence **5.2–31.0% of frames**  | **Solid on the four full-fight dumps.** ⚑ The original 7-dump table DOUBLE-COUNTS (3 small dumps are 60fps re-extractions of windows inside 2 of the same 4 videos) and mixed 30/60fps. Corrected in the same probe-runs section.                       |
| Missing-shot **3.9–6.8%**                      | **MEDIUM, and a FLOOR not a point estimate.** Gate-validated on `marciana` (SG/Iron; 5/5 owner shots recovered) **and now on `isabel` too** — the 2026-08-03 hand count reproduced 36 shots exactly and an independent method confirmed the admissibility rule, so `isabel` reads **4.4%** and the 3.4× swing is closed (`docs/probe-runs.md` §4). `guilty`/`noir` remain internally consistent with no ground truth. |
| Ammo-arbiter read rate **52–71%** (pooled 60.6%) | **Known limitation, and MEASURED as SEGMENTATION/LOCALIZATION-limited — not atlas-limited** (`docs/probe-runs.md` §5, 24,319 frames). **80.7% of abstentions are SEGMENTATION**, and 97.0% of the largest bucket (`no-digits`) falls on stale-lock frames, where the crop is not the ammo box at all. The atlas already carries **141 glyphs: 69 white + 72 red**, and red only ever renders digits 0–4 at magazine size 9, so it is complete. A perfect atlas is worth **+0.21 pp honest / +4.8 pp nominal**. Localization is the lever (+14.3 to +17.1 pp). |
| Landed pellets/shot **8.4**                    | **Measured**, from the owner counts 7/10/8/9/8. The 8% threshold is derived from it and was re-checked, not assumed.                                                                                                                                    |
| Cadence **40 frames @60fps**                   | **Measured** per dump, and `60/ceil(60/1.5) = 40` confirms nominal = effective for the 90 rpm datamine.                                                                                                                                                 |
| Counter cold bias **0.8–1.6 pellets/10**       | **The problem statement. Unmoved by everything this month except the partial channel above.**                                                                                                                                                           |

## 3. The single most important thing to carry forward

**Shot detection is DOWNSTREAM of the crosshair lock.** `build_tracks_and_counts` windows counts to
`cross_positions`, so `P(frame clears event_min | stale)` is 4.5–12.0% vs 31–34% given a good lock.
Stale% by offset from `t0`: `t0+8: 4.5%`, `t0+9: 3.1%`, `t0+11: 4.2%` — a deep trough exactly at the
counting window — rebounding to `t0+20: 19.7%`, `t0+40: 27.2%`, `t0+60: 31.8%` against 20.01%
unconditional.

⇒ **Any measurement conditioned on "detected shots" is conditioned on lock quality.** A reassuring
number from such a measurement is not reassurance. This is why measurement 5 above does not close the
question, and it is the trap most likely to catch the next session.

Related, and also load-bearing: **the tracker HOLDS the last good position on a lost lock** (marks it
`conf: None`) rather than signalling loss — 154/155 stale runs have every interior position identical
to the last good one. `count-pellets.py:692`'s docstring claims "no carry-forward" while line 699
`return last_acc, None` IS one. **The doc contradicts the code; reported, not fixed.**

## 4. Graveyard — 2026-08-01 additions. DO NOT RESURRECT.

The prior handoff's §3 holds six more. These three are new, and **all three were the driver's own.**

| Hypothesis                                                           | Why it looked right                                                                                                        | What killed it                                                                                                                                                                                                                                                                                                                             |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **"`pellet_radius` 160 is slightly too small"** (owner's + driver's) | All 9 outer marks sit 0.4–6.8 px past the line; the crop reaches r=184 so the owner could have marked further and did not  | Precision falls monotonically; 175→190 adds 10 FP and 0 TP; the true-zero shot reports 1.00 at 175. And 8 of 9 outer marks are in shot 1 ALONE — a too-small radius cannot produce that                                                                                                                                                    |
| **"`center_exclude` is eating the cold bias"** (driver's)            | The centre-weighted spec put ~11–14% of pellets inside r<36; on 10 pellets/shot ≈ 1.1–1.4, almost exactly the 0.8–1.6 bias | The sweep's 36→24 cell recovers exactly ONE distinct pellet. And the premise was FALSE: the live engine has run uniform-in-circle since UNIGEO shipped 2026-07-22 — the centre is genuinely SPARSE. The driver reasoned from `CENTER-WEIGHTED-PELLET-SPEC.md`, whose header falsely claimed it was live (corrected on `main` in `eb1fde5`) |
| **"The fixture's shot gaps hide ~4 undetected shots"** (driver's)    | The 80-frame gap is EXACTLY 2.00 cadence periods; a reload would not land on an integer multiple                           | Both gaps DO contain shots — **and the reader detected them** (debounce rising edges at 1176 and 1329, verified). `groundtruth-f8-11.json`'s six `t0`s come from `--shot-times`, a **required owner-supplied list**, never an exhaustive detection. The arithmetic predicted the right shots and blamed the wrong stage                    |

**Pattern across all three: the driver reasoned from a document or a fixture without checking what it
actually was.** The spec header was stale; the fixture was a hand-picked sample. Verify what an
artifact IS before reasoning from its contents.

## 5. Traps

1. **`cmd | tail; echo $?` reports TAIL's exit status.** Three false readings in this thread now.
2. **Two confidence scales.** Structural dumps score ~91–95 with `None` for a held lock; template dumps
   score 0–1 (medians 0.41–0.60). A `conf < 0.6` test is meaningful ONLY in template mode.
3. **`f8-11` is a 60fps definition and does not transfer by index.** On 30fps dumps it lands past the
   blast (1.0–1.8 pellets vs 5.9–6.3 at the rate-equivalent `t0+4…t0+6`).
4. **Fixture shot 4 records `locate: "template"`, not `structural`.** Using structural for it silently
   measures a different crop's centre.
5. **Read the CLEAN crops** (`groundtruth-f8-11/`), never `groundtruth-f8-11-annotated/`.
6. **NEVER `git restore` / `checkout --` / `reset --hard`**; and **do not `rm -rf` in the worktree** — a
   safety hook blocks it, correctly. `scratchpad/pellets/_centering_tmp/` holds ~2.1 GB; leave it.
7. **Prefer SYNCHRONOUS subagents and commit per item.** Three background subagents lost completion
   records to process exits on 2026-07-31; committed work survived every time.
8. **Headless sessions: never background a shell command** — foreground with an explicit timeout.

## 6. Landed state

**Branch `fix/pellet-reader`: `origin` at `8d75008`, HEAD at `eaf0712e`, NINETEEN commits unpushed.**
The last owner-authorised push was `8d75008`; everything after is local-only. `main` carries `eb1fde5`
(the sg-calc spec correction), which is NOT on this branch.

`bash scripts/verify.sh` → true exit 0. `bash scripts/probe/pellet-selftest.sh` → true exit 0, 14
checks. **`/patch-notes` is owed before anything reaches `main`, which is still deliberately held.**

Instruments landed today, all committed at named paths with pinning fixtures:
`score-pellets.py --audit-fidelity-real` / `--pellet-radius` / `--center-exclude` / `--real-positions`;
`analyze-pellet-tracks.py --stale-counting` / `--stale-counting-offsets` / `--missing-shots` /
`--missing-shots-gate`; `count-pellets.py --ammo-series`; fixtures `real-fidelity-slice.json`,
`centering-slice.json`, `stale-counting-slice.json`, `missing-shots-slice.json`; 72 red digit glyphs in
`scripts/probe/ammo-atlas/`, which now holds **141 glyphs — 69 white + 72 red**, a complete set (red
only ever renders digits 0–4 at magazine size 9).

Landed 2026-08-02/03, same convention: `analyze-pellet-tracks.py --hand-count` (fixture
`hand-count-slice.json`, `--hand-count-selftest`) and `analyze-pellet-tracks.py --ammo-abstention`
(fixture `ammo-abstention-slice.json`, `--ammo-abstention-selftest`), both wired into
`scripts/probe/pellet-selftest.sh`.

## 7. Open, in priority order

1. **LOCALIZATION — now the top lever, and it is one root cause wearing two faces.** The 60fps
   localization instability (2 of 4 windows locked zero frames; `run21`/`run21b` have no valid
   consecutive positions at all; gate 1 is a whole-video conjunction and cannot see it) is the SAME
   root cause as the stale-lock hole in the ammo read. `docs/probe-runs.md` §5 measured it as **the
   largest available gain on the read rate: +14.3 to +17.1 percentage points**, against +0.21 pp for
   the refuted atlas route — and stale locks already suppress the DETECTOR too (§3: 4.5–12.0% vs
   31–34% event-clearing). Cost is days, not hours. Fix this before anything else on the instrument.
2. **The unexplained remainder of the cold bias** — after the partial channel, roughly half to
   three-quarters is still unaccounted for, **with no live candidate.** Do not manufacture one; §4 is
   what happens when you do. This remains the headline SCIENTIFIC question; item 1 is the top
   INSTRUMENT lever.
3. `count-pellets.py:692` docstring vs line 699 carry-forward contradiction.
4. The generator's radial envelope — it places every label strictly inside the counting window (884
   labels, r=42.0–157.1) while ~10% of real marks fall outside. No synthetic measurement can see that.
5. Phase 2 steps 4–6, still blocked on the owner's Decision 1; the remaining `/logic-gate` pre-op
   revisions (kimi #1/#2/#3/#9/#10, fable #4).

## 8. Method note for the next judge

Three plans this session used a **pre-committed decision rule written to disk before the measurement
ran**, and it worked every time — twice the result contradicted the driver's stated expectation and
the pre-commitment is why that was visible rather than negotiable. Two of those runs also had the
subagent **derive the sign convention / premise independently before computing**, which caught a
fixture-mode error the plan itself had got wrong. Keep both habits.
