> **CLOSED (2026-08-09).** This handoff has landed; live follow-ups are in `docs/handoffs/QUEUE.md`.

# The radius gate (§35) — JUDGE VERDICT (2026-08-06)

> AI-facing. Independent judge pass over `docs/probe-runs.md` §35 and its instrument
> (`analyze-pellet-tracks.py --radius-gate`, `6adb6c59`). **Findings-only — this pass edits no
> instrument, no constant and no fixture.** Every number below was re-derived from committed data
> BEFORE reading §35's own arithmetic, so the agreements are independent, not restatements.
>
> **Slugs:** `marciana` (SG/Iron — `docs/probes/clean-weapons/marciana-solo.MP4`, **not**
> `marciana-marine-study`, AR/Iron), `noir`, `guilty`, `isabel`.

## 0. Verdict in one paragraph

**§35's refutation half is CORRECT and well-made. Its surviving estimate is NOT SUPPORTED at the
strength stated, and it is contradicted by a prior committed measurement in the same document.**
`T = 1.043/shot` is genuinely contaminated and the fencing around it is right. But the ≈0.45
pellets/shot that §35D/E puts in its place rests on **2–3 distinct pellets in 2 of 5 shots**, and
the 2026-08-01 counting-window sweep — same clip, same labels, same 9 marks, with its own
pre-committed decision rule — already discriminated the two hypotheses and chose the OTHER one.

⇒ **The 0.45 must not be quoted as "the largest single channel yet identified" until it is
reconciled with that entry.** It may not be a radius channel at all.

## 1. What survives the pass

| §35 claim                                                            | Judge finding                                                                                                              |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Pre-commit landed before any number                                  | **TRUE.** `57c1de78` 18:42:20 → `6adb6c59` 18:48:03. The self-refuting outcome is itself evidence against outcome-fitting. |
| Owner labels: 168 instances, max 166.8 px, 9 at ≥160, 0 beyond 180   | **RE-DERIVED INDEPENDENTLY, EXACT MATCH** (max 166.75 → 166.8).                                                            |
| `T = 1.043/shot` is contaminated                                     | **TRUE**, and the fencing (arm prints T + its refutation together) is the right design.                                    |
| §35C's method lesson (quiet-frame control ≠ pellet-identity control) | **TRUE and worth keeping.** A temporal control cannot remove shot-correlated VFX.                                          |
| Pooling 4 dumps is valid                                             | **TRUE.** All 30 fps, `pellet_radius` 160, band [4,10]; 218+203+180+214 = 815. Labelled clip is zoom-2, same 160 px scale. |
| Nothing enacted; 31 arms; selftest passes                            | **TRUE** (arm re-run).                                                                                                     |

## 2. ⛔ BLOCKING — §35 re-derives a 2026-08-01 measurement and inverts its conclusion

`docs/probe-runs.md` **"2026-08-01 — counting-WINDOW sweep on the 6 real `marciana` (SG/Iron)
shots"** (commit `01fb2c1e`, four days before §35) already contains **every input §35B presents as
new**: the 9/168 beyond `pellet_radius` 160, the max r = 166.8, the per-shot centroid offsets of
20–52 px, and the centroid-recentring check. It also names the two hypotheses explicitly —
**H_radius** (the window is slightly too small) vs **H_centre** (the window is mis-centred) — and
chooses:

> **"The radial geometry independently points at H_centre, not H_radius.** Of the 9 owner marks
> beyond r=160, **8 are in shot 1 alone** and the 9th is shot 5 at r=160.4 — 0.4px past the line.
> Shots 2/3/4 have zero: their maxima are 159.2, 138.2 and 132.0. Under H_radius the overflow would
> be spread across shots; instead it is concentrated in the ONE shot the earlier centroid check
> independently identified as off-centre … the signature of a compact cloud **translated off the
> assumed centre** rather than of a genuinely larger cloud."

**This judge pass re-ran the recentring blind and reproduced that entry to the decimal**: shot 1's
max radius 166.8 → **154.2** about its own pellet centroid (inside the gate), shot 2 → **204.0**.
Per-shot centroids sit at (−49.9, −4.1), (+49.7, +16.0), (+21.1, −19.2), (+19.5, +6.8),
(−50.0, +15.9) px from the crop centre, and are **stable to ~1–3 px across f08–f11 within a shot** —
so the offset is established at or before f08 and held, not intra-window drift.

⇒ **§35E's "the cloud ends at ~167 px against a 160 px gate, a ~7 px shortfall, not a badly-placed
cut" is the opposite reading of the same 9 marks**, reached without engaging the entry that read
them the other way. §35 cites neither the entry, nor H_centre, nor `center_exclude`.

### 2.1 That entry also already ran the sweep §35 did not

Six-cell `pellet_radius` × `center_exclude` cross product, pre-committed decision rule, on these
same labels. Widening the radius is **empirically disqualified**, not merely ruled out on principle:

- precision **0.906 → 0.853 → 0.807** at 160 → 175 → 190; false positives **15 → 26 → 36**;
- the newly-admitted ring carries **~3.4× the FP density** of the existing window;
- 175 → 190 buys **+10 FP and exactly ZERO new TP**;
- ⚑ the confirmed **true-zero shot 0 reports 1 pellet at every widened radius** — disqualifying on
  its own terms.

⇒ ⚑ **`center_exclude` 36 → 24 is the one clean cell in that sweep** (+4 TP, **0** FP, precision
0.906 → 0.908, bias −0.375 → −0.208, RMSE 1.571 → 1.177). §35 never mentions the inner window. On
the same clip that is ≈0.17 pellets/shot of bias, from a measurement that already exists.

## 3. ⛔ BLOCKING — the ≈0.45/shot rests on 2–3 pellets, and says so nowhere

The 168 "labelled pellet instances" are **42 distinct pellets, each labelled on 4 frames** — 4×
pseudo-replication. The 08-01 entry carries that caveat in-line ("pseudo-replicated 4 frames per
pellet"); §35 does not. Decomposed:

| Source of the 9 instances ≥ 160 px | Distinct pellets | Detail                                             |
| ---------------------------------- | ---------------- | -------------------------------------------------- |
| shot 1                             | **2**            | 8 instances — the same two pellets on all 4 frames |
| shot 5                             | **1 borderline** | 1 instance: r = **160.4** on f11, **158.9** on f10 |
| shots 2, 3, 4                      | 0                | maxima 159.2 / 138.2 / 132.0                       |

⇒ **n_effective ≈ 2.25 distinct pellets out of 42, clustered in 2 of 5 shots** — not 9 independent
observations. §35D's "n = 5 shots, one clip" caveat is true but does not disclose this, and no
interval is attached anywhere. A binomial on ~2.25/42 puts the plausible range at roughly
**0.06–1.5 pellets/shot** before clustering is accounted for.

⚑ **§35E ranks this point estimate as "the largest single channel yet identified" against §22C's
−0.30 ± 0.76 — a point estimate against an interval.** That ranking is not admissible.

## 4. §35 also does not reconcile with `--representative-audit`, which measures the gate directly

`scripts/tests/fixtures/pellets/representative-audit-slice.json` decomposes **the same 42 owner
pellets** under the **production** crosshair, track-linked rather than by raw crop radius:

- `decomposition_total.radius_gate_rejected` = **8 of 42**;
- **7 of those 8 are shot 4** — the shot the label file itself marks `locate: "template"` because
  the structural lock mislocked — and its `template_relock` row re-scores it at
  `radius_gate_rejected: 0`;
- ⇒ non-mislock radius loss on this clip is **1 of 42 ≈ 0.20 pellets/shot**, under half §35D's 0.45,
  and it again attributes the beyond-gate population to **localization**.

⚑ **A note this raises for the cold-bias hunt generally:** shot 4 reads `rep_owner: 0`,
`rep_non_owner: 4`, `reader_white: 4` — the mislock rejected every real pellet and the count was
**refilled by four non-pellet tracks**. So §22C's "a bad lock does not systematically change the
COUNT" and "a bad lock rejects 7 of 9 real pellets" are both true simultaneously. The reader's
count agreeing with truth on average can be **compensating errors**, and a count-based severity
measurement cannot see that.

## 5. Instrument findings (non-blocking, each a small fix)

1. ⚑ **"Density at the gate is 51% of the in-gate peak" is a COUNT ratio, not a density ratio.**
   `_rg_pool`'s `gate_over_peak` divides `diff_per_shot` (per-shot counts). The correctly-computed
   `peak_in_gate_density` / `density_at_gate` fields exist per-dump and are **never used by the
   band**. The true density ratio is **33.2%** (peak density in the 100–120 px annulus). The band
   fires either way (≥25%), so no verdict moves — but pre-commit §2.1 named this exact trap
   ("read the verdict off DENSITY, never off raw counts"), and §35A reports the trapped number
   under the correct label.
2. ⚑ **`radius_gate_selftest()` does not pin the load-bearing claim.** Its five checks are pooling
   coherence; none touches `owner_label_bound` — which is the ONLY part of §35 fully re-derivable
   from committed data (`groundtruth-f8-11-positions.json` is in the tree; the dumps are
   gitignored). Its docstring claims it pins "the properties §35's conclusion rests on." Asserting
   `_rg_owner_label_bound()` against the stored values is a one-line fix and makes the arm honestly
   self-validating per constraint 9.
3. **Denominator asymmetry in `_rg_score`.** `quiet` is filtered to frames with a crosshair lock;
   `shot_frames` is not, yet `_rg_profile` silently skips unlocked frames while `len(shot_frames)`
   remains the divisor. Direction: **understates** the shot-frame profile relative to quiet.
   Harmless to §35 (whose finding was that the profile is too HIGH), wrong in general — both arms
   of a difference must be filtered identically.
4. **"Widening the gate would be a fudge" is a category slip.** `pellet_radius` is
   `count-pellets.py`'s CV search window (`--pellet-radius`, "radius of pellet crop in ZOOMED px",
   default 80 × zoom), not a game constant derived from the accuracy-circle geometry. The
   owner ruling makes the **sim's** landing geometry ground truth; it does not make the **reader's**
   crop radius a measured constant. Right conclusion, unsound reason — the sound reason is §2.1
   above: the 08-01 sweep empirically disqualified widening.

## 6. ⚑ The method lesson, one level up

§35C credits itself with the SUFFICIENCY route — "what caught it was an EXISTING LABELLED ARTIFACT
… not a new derivation." It re-derived from the **labels** while missing the existing **analysis of
those same labels**, one arm over in the same script (`--representative-audit`) and one entry up in
the same document (2026-08-01). **The rule was applied one level too shallow: search for the prior
ANALYSIS of an artifact, not just the artifact.** `docs/VALIDATION-INDEX.md` is the intended lookup
and did not surface either.

## 7. What this changes for the next session

1. ⛔ **Do not quote ≈0.45 pellets/shot as a radius-gate cost.** Reconcile with the 08-01 sweep
   first. If H_centre holds, it is not a radius channel — it is the centering/localization channel,
   which §22C/§34 sized at ≈0 **by count** while §4 above shows count is the wrong observable for it.
2. ⛔ **Do not widen `pellet_radius`** — now for the empirical reason (precision collapse, true-zero
   shot 0 firing), not the fudge argument.
3. **The `center_exclude` 36 → 24 cell is an unclaimed, already-measured win** (+4 TP / 0 FP on the
   labelled clip). It needs its own blast-radius pass and owner gate; it is not this doc's to land.
4. **H_radius vs H_centre is decidable and is the real open question** — see the QUEUE entry.
