# Pellet reader — real-pellet cascade: pre-commitment + provenance handoff

> AI-facing. Written **2026-08-01, deliberately BEFORE the measurement it specifies runs**, by the
> judge session that has been verifying this thread. Its whole purpose is that the decision rule
> below is pre-committed and the provenance ledger is on disk instead of in a chat transcript.
>
> **Slugs:** `marciana` (SG/Iron — `marciana-solo.MP4`; **not** `marciana-marine-study`, AR/Iron),
> `noir`, `guilty`, `isabel`. All SG, `ammo: 9`.
>
> Companion docs: the plan of record is
> [`2026-07-30-pellet-reader-implementation-plan.md`](2026-07-30-pellet-reader-implementation-plan.md);
> the owner-facing decisions are in
> [`2026-07-31-pellet-reader-OWNER-DECISIONS.md`](2026-07-31-pellet-reader-OWNER-DECISIONS.md);
> the standing judge role is
> [`2026-07-30-pellet-reader-JUDGE-handoff.md`](2026-07-30-pellet-reader-JUDGE-handoff.md).

---

## 0. RESULT — §1 was executed 2026-08-01. Read this before §1.

**§1's measurement is DONE. Its decision rule below is left byte-for-byte as written; do not edit it.**
The rule's force comes from having been fixed before the number existed, so the outcome is recorded
here instead of inside it.

**Real BOTH-pass = 94.6%** → the **0.90–0.98 bucket**, i.e. the first row of §1's table. Real pellets
survive the settled filter; the synthetic 71.6% characterises the generator, not the filter; the
`min_circ`-as-cold-bias branch does NOT open. Full record, including per-shot and per-offset
breakdowns and the invalidation checks: `docs/probe-runs.md`, entry **2026-08-01 — real-pellet
filter-survival cascade**. Instrument: `score-pellets.py --audit-fidelity-real`, self-validating via
`--audit-fidelity-real-selftest` against `scripts/tests/fixtures/pellets/real-fidelity-slice.json`.

The one structural finding §1 did not anticipate: **the aggregate hides a step function.** f08/f09/f10
are 100%; all 9 failures are at f11, where the pellets have faded to a max channel of 199–209 against
the WHITE_LO 210 mask (218–229 one frame earlier). A fade-out boundary effect at the last counting
frame, not a filter defect.

Two follow-on measurements were run the same day and are also recorded in `docs/probe-runs.md`:

- **Counting-window sweep** (`--pellet-radius` / `--center-exclude` / `--real-positions`) — widening
  the radius is ELIMINATED. See §3's graveyard entries.
- **n=120 synthetic cascade re-run** — 71.6% reproduces exactly and `min_circ` dominance is upheld.
  See §2's amended rows.

**Nothing was enacted.** `FIDELITY_BOTH_PASS_FLOOR`, `min_area`, `min_circ`, `pellet_radius` and
`center_exclude` all keep their defaults.

---

## 1. The measurement, and its PRE-COMMITTED decision rule

**Do not adjust anything in this section after seeing the result.** That is the entire reason it was
written first.

### What to measure

For each **owner-marked real pellet** in `scripts/tests/fixtures/pellets/groundtruth-f8-11-positions.json`,
find the nearest RAW (pre-filter) connected component the real detector would produce, and report the
same four-stage cascade `score-pellets.py --audit-fidelity` already computes for synthetic data:

```
raw component found (≤20px)  →  +passes min_area 25-750  →  +passes min_circ ≥0.55  →  passes BOTH
```

Use the same thresholds, the same 20px match tolerance, and the same WHITE_LO 210 mask as the
synthetic path, so the two are directly comparable. Extend `score-pellets.py` with a flag (it already
owns `--audit-fidelity`); do not write a new script.

The positions are in CROP pixel coordinates of the matching file under
`scripts/tests/fixtures/pellets/groundtruth-f8-11/` (368×368). **Read the CLEAN crops, never the
annotated ones** — see §4.

### The two outcomes, and what each means

| Real BOTH-pass rate                          | Reading                                                                                         | Consequence                                                                                                                                                                                                           |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **≈ 0.90–0.98** (near the derived reference) | The generator genuinely is unfaithful — real pellets survive the filter, synthetic ones do not. | The synthetic set's 71.6% is a real defect. Owner's option **C** stands. Swap `FIDELITY_BOTH_PASS_FLOOR` from derived to measured.                                                                                    |
| **≈ 0.65–0.75** (near the synthetic rate)    | The generator was faithful all along. The filter discards ~a quarter of **real** pellets too.   | The 0.90 floor is wrong and the "generator is broken" frame collapses. **`min_circ` becomes a prime suspect for the counter's cold bias** — which is the actual U35 problem. This would be the more valuable finding. |
| Anything else                                | Neither story.                                                                                  | Report it, do not force it into either bucket.                                                                                                                                                                        |

**Neither outcome licenses building Phase 2 steps 4–6, and neither retires them.** This measurement
decides where the _next_ investigation goes, nothing more.

### What would make the result invalid — check these BEFORE reading the number

1. **Coordinate frame mismatch.** Positions are crop-local (368×368). If the cascade is computed
   against full-frame detections, every pellet will "miss" and the rate will be spuriously ~0.
   Sanity-check: at least one shot should reconcile at ≈100% raw-found, because the pellets were
   drawn on visible dots.
2. **n is small.** 42 pellets across 5 shots × 4 frames = 168 pellet-frame instances, but they are
   not independent (the same pellet appears in 4 frames). Report both the per-instance rate and the
   per-distinct-pellet rate, and state n for each.
3. **One video, one unit.** All 6 shots are `marciana`. A single-unit result cannot be generalised
   to `noir`/`guilty`/`isabel` without saying so.

### Evidence discipline

This RECORDS a measurement. It may **not**, in the same motion, change `FIDELITY_BOTH_PASS_FLOOR`,
change `min_circ`, overturn a `DECISIONS.md` entry, or rewrite the plan's direction. Landing the
floor swap is a separate, gated pass (`CLAUDE.md` §evidence-proportionality). The pre-committed
`precision ≥ 0.90` / `recall ≥ 0.80` numbers are **not** touched by this work.

---

## 2. Provenance ledger — which numbers carry which weight

The single most perishable thing in this thread. Several load-bearing figures are **not** equally
trustworthy, and the docs do not distinguish them.

| Figure                                                        | Value                                                  | Provenance                                                                                                                                                                                                                                                                                                                                  | Weight                                                                                                                                                                 |
| ------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Synthetic cascade, n=120                                      | 96.9 → 85.4 → 80.2 → **71.6%**                         | **RE-RUN 2026-08-01 and reproduced exactly** (96.89 → 85.38 → 80.23 → 71.61, n=3536 = 884 pellets × 4 frames), by two independent script instances agreeing on every field. The "never independently re-run" gap is CLOSED                                                                                                                  | **Strong, confirmed**                                                                                                                                                  |
| Judge cross-check, n=40 subset                                | 94.4 → 81.0 → 75.0 → **65.3%**                         | Judge, ad-hoc matching implementation, different method and sample                                                                                                                                                                                                                                                                          | Corroborating; **differs 4–6 points at every stage** — treat as agreeing on SHAPE, not magnitude                                                                       |
| `min_circ` dominates over `min_area`                          | 17.19% vs 11.88% of found rejected                     | **CONFIRMED at n=120 on the 2026-08-01 re-run.** The committed slice fixture inverts it (18.75% area vs 7.03% circ) but is sequences 0/30/60/90 = 32 distinct pellets, two of which reject ZERO on circ — 26.6% of random 4-sequence draws reproduce the inversion, 0.4% at 40 sequences. Judge n=40 agrees on direction (1.448× vs 1.447×) | **Solid, direction settled.** ON SYNTHETIC ONLY — on real pellets both filters are near-inert (2.45% / 0.61%), so this is a fact about the GENERATOR, not the detector |
| ~~Real-pellet survival ≈ 93% (DERIVED)~~ → **MEASURED 94.6%** | per-instance n=168; per-distinct-pellet n=42, SE 0.016 | **MEASURED 2026-08-01** by xy-matching owner-drawn positions against raw components (`--audit-fidelity-real`). Lands inside the old derived 0.925–0.98 range, so the bias-arithmetic derivation is corroborated by an independent method                                                                                                    | **Strong — supersedes the derived value.** Scope: one clip, one unit (`marciana` SG/Iron)                                                                              |
| `FIDELITY_BOTH_PASS_FLOOR` = 0.90                             | Deliberately set BELOW the derived ~0.925–0.98 range   | Judge + agent, documented in the constant's docstring                                                                                                                                                                                                                                                                                       | Conservative by construction                                                                                                                                           |
| Owner f8–11 counts                                            | 0/7/10/8/9/8                                           | Owner, hand-counted 2026-07-31                                                                                                                                                                                                                                                                                                              | Ground truth                                                                                                                                                           |
| Owner pellet positions                                        | `groundtruth-f8-11-positions.json`                     | Owner-drawn green shapes; **reconciles EXACTLY with the counts on all 20 frames** (two independent passes, two days apart)                                                                                                                                                                                                                  | Ground truth, cross-checked                                                                                                                                            |
| 6-shot real screen power                                      | n=6, SD 1.671, **SE 0.682**                            | Computed, §2.2a                                                                                                                                                                                                                                                                                                                             | Can only FAIL a candidate, never certify ±0.25                                                                                                                         |
| Synthetic power                                               | n=120, SD 1.769, SE 0.161                              | Computed, §2.2a                                                                                                                                                                                                                                                                                                                             | Adequate for ±0.25                                                                                                                                                     |
| `noir` per-band power                                         | n≈25–45/band, SE 0.334–0.249                           | Computed, §2.2a                                                                                                                                                                                                                                                                                                                             | **At the edge** of resolving ±0.25                                                                                                                                     |
| 60fps capture is genuine                                      | even/odd frame diff 3.765 vs 3.891                     | Agent; independent of crosshair quality (frame duplication is global)                                                                                                                                                                                                                                                                       | **Trustworthy** — kimi #1's worst case is ruled out                                                                                                                    |
| Lifecycle shape at 60fps                                      | ~9/15 tracks show grow→peak→decay                      | Agent, on a dump with **5.8% near-fraction and 477px wander** (reference: 14.3%)                                                                                                                                                                                                                                                            | **Weak — see §4 trap 2.** Not an answer                                                                                                                                |
| Onset spread, near band                                       | n=7, mean 7.6f/126ms                                   | Agent                                                                                                                                                                                                                                                                                                                                       | **CONFOUNDED** — cannot separate flight time from detection dropout when 64.3% of tracks die by frame 2. Do not cite as onset spread                                   |
| Localization: 2 of 4 60fps windows locked ZERO frames         | 0/901, 0/721 vs 901/901, 480/480                       | Judge-verified on disk                                                                                                                                                                                                                                                                                                                      | Solid                                                                                                                                                                  |
| `noir` 60fps dumps are healthy                                | near 16.7%, far 26.3%                                  | Judge-verified                                                                                                                                                                                                                                                                                                                              | Solid — and means kimi #2 may be answerable from data already on disk                                                                                                  |
| ROI shot-detection split                                      | 43/29/7.3/0.17 with ROI vs 74/62/7.5/0.23 without      | Judge-verified byte-identically (sha `dc64e7cc`)                                                                                                                                                                                                                                                                                            | Solid, unexplained                                                                                                                                                     |
| Counter is 3–6× over the bias budget                          | 0.8–1.6 vs ±0.25 pellets/10                            | The original problem statement                                                                                                                                                                                                                                                                                                              | **Unmoved by anything this week**                                                                                                                                      |

---

## 3. The graveyard — refuted hypotheses. DO NOT RESURRECT.

Every one of these was internally consistent and explained the data. Every one died to a check under
five minutes. **Three of them were the judge's own.** The last three existed only in a chat
transcript until this document.

| Hypothesis                                                                                                              | Why it looked right                                                                                                                                                                            | What killed it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "The synthetic set is optimistic by construction" (§1.2's own honest limit)                                             | Static background, easy alpha-blit compositing                                                                                                                                                 | It scored 4–14× COLDER than real                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| "The center-exclude labeling bug is the whole story" — **judge's**                                                      | 28.9% of labels were provably uncountable; magnitude fit                                                                                                                                       | Predicted 1.8–2.0 pellets of recovery; delivered **0.3**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| "Densification/occlusion explains the residual" — build agent's                                                         | Resampling does concentrate pellets into the annulus                                                                                                                                           | 94.4% raw detection, 6.0% merged, **median neighbour spacing 39.5px** vs ~15px pellets, annulus fill <2%. Crowding cannot produce −2 pellets                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| "`max_pellet_frames` rejects the 13-frame synthetic tracks" — **judge's, in-session only**                              | A pellet present in all 13 frames would exceed a cutoff of 7 or 8, and the background is a single repeated frame so clutter persists too                                                       | `score-pellets.py:83` passes **`--max-pellet-frames 13`** explicitly                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| "Off-frame placements explain the synthetic bias" — **judge's, in-session only**                                        | Positions with y as low as −36 exist and are labelled as truth                                                                                                                                 | Measured at only **2.4%** (0.17 pellets/sequence) — ~7% of the gap                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| "The two zero-lock windows were a bad invocation" — **judge's, in-session only**                                        | `tracks.json` params showed `locate=None, zoom=None`                                                                                                                                           | `locate`/`zoom` are **not recorded in `tracks.json` for ANY dump**, including the ones that locked 901/901. All four dumps carry identical param keys. The instability is real                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **"`pellet_radius` 160 is slightly too small — real pellets ride just past the edge"** (2026-08-01, owner's + driver's) | All 9 outer marks sit 0.4–6.8px past the line (max r=166.8), and the crop reaches r=184, so the owner COULD have marked further out and did not — the spread looks like it genuinely ends ~167 | The sweep eliminated it on three independent signals: precision falls **0.906 → 0.853 → 0.807** as radius grows; **175→190 adds +10 false positives and exactly ZERO new true positives**; and the confirmed true-zero shot 0 starts reporting **1.00** pellets at radius 175. Cause: `crop_disc()` slices a SQUARE with no mask, so scene content runs to r=259 in the corners — widening walks into live HUD, not black margin. Also 8 of the 9 outer marks are in shot 1 ALONE (shots 2/3/4 top out at 159.2/138.2/132.0), which a too-small radius cannot produce                                                   |
| **"`center_exclude` is eating the counter's cold bias"** — **driver's, 2026-08-01**                                     | The project's own centre-weighted spec put ~11–14% of pellets inside r<36; on 10 pellets/shot that is ~1.1–1.4, almost exactly the counter's 0.8–1.6 per-10 bias. Arithmetically seductive     | **Killed by two independent lines.** (a) The sweep's `center_exclude` 36→24 cell recovers **exactly ONE distinct pellet**, not the ~1.2/shot the theory needs. (b) The premise was false: `docs/probe-data/sg-pellet-marker-radial.json` (n=101 machine-read positions) refutes the centred Gaussian (KS 0.376/0.210 vs 0.135 critical) and the live engine has run **uniform-in-circle since UNIGEO shipped 2026-07-22** — the centre is genuinely SPARSE, not censored. The driver reasoned from `CENTER-WEIGHTED-PELLET-SPEC.md`, whose status header falsely claimed it was live (corrected on `main` in `eb1fde5`) |

---

## 4. Traps

1. **`cmd | tail; echo $?` reports TAIL's exit status.** It has already produced one false bug report
   and one false "guard didn't fire" reading in this thread. Check true exit codes directly.
2. **"Not flagged broken" ≠ sound.** `analyze-pellet-tracks.py` prints its `CROSSHAIR TRACK LOOKS
BROKEN` banner below 5% near-fraction. The 60fps lifecycle dump passed at **5.8%, with 477px of
   lock wander**, against 14.3% on the known-good reference. That guard exists because a mislocked
   dump once produced confident, wrong statistics (§0.5). Read the near-fraction, not the banner.
3. **The annotated crops are NOT the fixture crops.** `groundtruth-f8-11-annotated/` holds the
   owner's green-shape copies; `groundtruth-f8-11/` is clean and is what
   `make-synthetic-pellets.py` harvests real pellet patches from. Green outlines baked into the
   latter would corrupt every synthetic set built afterwards. They were separated deliberately.
4. **Never `git restore` / `checkout --` / `reset --hard`** on this shared worktree (constraint 7).
   To restore a file to HEAD, redirect `git show HEAD:<path>` into it — a plain write.
5. **Background subagents lost their completion record three times** in the 07-31 session (process
   exit). Committed work survived every time; uncommitted would not have. **Commit per item**, and
   on any "no completion record" notification, check the tree before assuming anything was lost.
   Prefer synchronous subagent runs for work that must report back.

---

## 5. Landed state as of 2026-08-01

**Branch `fix/pellet-reader`: `origin` is at `65d527c`; HEAD is `46f011a` with SEVEN commits
LOCAL-ONLY** — including `7bbc22b`, this document itself. (An earlier revision of this section claimed
the branch was pushed at `7bbc22b`; it is not, and was not. Corrected 2026-08-01 by `git log
origin/fix/pellet-reader..HEAD`. Do not assume this work is safe off-machine.) `main` is deliberately
NOT updated — the owner is holding that. `/patch-notes` is owed before anything lands on `main`.

The unpushed seven: the handoff (`7bbc22b`), `--audit-fidelity-real` + its per-offset breakdown
(`17f3e7d`, `4230955`), the window-sweep flags (`62d62a2`), and three `docs/probe-runs.md` measurement
entries (`bd74168`, `01fb2c1`, `46f011a`). Separately, `main` carries `eb1fde5` — the
`CENTER-WEIGHTED-PELLET-SPEC.md` status correction, which is NOT on this branch.

`bash scripts/probe/pellet-selftest.sh` green (true exit 0, all checks) at `46f011a`; `verify.sh` was
last run green at `65d527c` and has not been re-run since — the seven commits touch only
`scripts/probe/**`, `scripts/tests/fixtures/pellets/**` and `docs/**`, but **run it before any push**.

**Solid:** structural crosshair localization (all four videos pass gate 1), the cache-then-sweep
harness, the owner-counted 6-shot fixture **plus positions**, and the guard layer — the tooling now
refuses rather than silently emitting wrong numbers, which is what caught this week's defects.

**Not solid:** the synthetic set, and every bias number measured on it. Whether the cheap estimator
is sufficient is **UNRESOLVED, not answered** — §2.2b's verdict is marked SUPERSEDED.

**Open, roughly in priority order** (revised 2026-08-01 after §0's three measurements):

1. **PER-SHOT LOCALIZATION / CENTERING — now the leading explanation for the counter's cold bias, and
   the only live one left.** Owner-marked pellet clouds sit **20–52px off the crop centre**, roughly
   constant WITHIN a shot (0.7–15.9px travel across f08→f11) but swinging −51 to +62 px in x BETWEEN
   shots. On a 160px window that is a 31% radial error. This is item 3 below arriving from a second,
   independent direction, and it is why 3 was promoted. **Next step: check the detected crosshair
   against its visible on-screen position for these 6 shots** — if the detector is right, the offsets
   are a real aim-vs-impact effect (interesting for the sim's SG geometry); if wrong, it is the
   localization bug and item 3 is top priority. Answerable from footage already on disk.
2. The U35 ROI shot-detection question — blocks per-band certification on real footage.
3. 60fps localization instability — 2 of 4 windows on the best video locked zero frames. Phase 2A
   gate 1 is a whole-video average and has now hidden both a ~10-frame per-shot excursion and total
   window failures. **Converges with item 1.**
   3b. **The generator's RADIAL ENVELOPE is mis-specified** — it places every label strictly inside the
   counting window (884 labels, r=42.0–157.1, zero outside either boundary), while ~10% of real
   owner-marked pellets fall outside it (9/168 beyond r=160, 8/168 inside r=36). **No synthetic-based
   measurement can see this class of error.** Not a cold-bias explanation (see §3), but a real
   generator defect that should be fixed before the synthetic set is trusted for window questions.
4. Remaining `/logic-gate` pre-op revisions: **kimi #1** (lifecycle shape at 60fps — partial: the
   30fps-internal-render case is ruled out, the shape itself is not), **#2** (shared-t0 by band —
   possibly answerable from the existing `i3-noir-{near,far}-60fps` dumps), **#3**, **#9**, **#10**;
   **fable #4** (gap tolerance as a step-5 prerequisite — strengthened by the 60fps fragmentation
   reading, see below).
5. Phase 2 steps 4–6 — blocked on the owner's Decision 1.

**A reading worth carrying forward:** at 30fps, tracks ending by frame 2 were 70%; at 60fps, 64.3%.
But a 13-game-frame pellet should yield _life-13_ tracks at 60fps versus 6–7 at 30. Barely moving
when it should roughly have halved in relative terms makes fragmentation a **larger** problem than
the raw percentages suggest — which is a second, independent argument for fable #4.
