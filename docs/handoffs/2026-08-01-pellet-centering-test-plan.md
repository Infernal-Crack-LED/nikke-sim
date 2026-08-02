# Pellet reader — the per-shot centering error: test plan

> AI-facing. Written **2026-08-01, BEFORE the measurement runs**, deliberately — the decision rule in
> §3 only has force because it is on disk before the numbers exist. Same convention as
> [`2026-08-01-pellet-cascade-JUDGE-handoff.md`](2026-08-01-pellet-cascade-JUDGE-handoff.md), which
> this continues (its §5 item 1).
>
> **Slug:** `marciana` (SG/Iron — `docs/probes/clean-weapons/marciana-solo.MP4`); **not**
> `marciana-marine-study` (AR/Iron).

---

## 1. The observation this exists to explain

On the 6 owner-counted f8–11 ground-truth shots, the **pellet cloud does not sit on the crop centre**.
Per-shot centroid offsets from the crop centre (184,184), measured on f08:

| shot | dx    | dy    | \|offset\| | f08→f11 centroid travel |
| ---- | ----- | ----- | ---------- | ----------------------- |
| 1    | −49.9 | −4.1  | 50.1       | 2.2 px                  |
| 2    | +49.7 | +16.0 | 52.2       | 15.9 px                 |
| 3    | +21.1 | −19.2 | 28.5       | 12.6 px                 |
| 4    | +19.5 | +6.8  | 20.6       | 0.7 px                  |
| 5    | −50.0 | +15.9 | 52.4       | 6.1 px                  |
| ALL  | +2.2  | +3.9  | 4.5        | —                       |

Two properties matter and are the whole reason this is tractable:

- **Roughly CONSTANT within a shot** (0.7–15.9 px of travel across the four counting frames). So it is
  not continuous recoil drift during counting — it is fixed at or before f08.
- **Swings wildly BETWEEN shots** (−51 to +62 px in x), and the pooled mean is only 4.5 px. So it is
  not a systematic calibration offset either.

On a `pellet_radius` 160 window a ~50 px centre error is a **31% radial error**, which is far larger
than any threshold effect measured this week. It is the last live candidate for the counter's cold
bias (0.8–1.6 pellets/10 against a ±0.25 budget), which nothing this month has moved.

**Visual check already done (2026-08-01, by eye, NOT a measurement):** in the shot 1 and shot 2 f08
crops the reticle graphic sits _near the crop centre in both_, while shot 1's pellets cluster left and
shot 2's cluster right. That is what motivates H1 below over a naive "the locator is broken" reading —
but it is an eyeball read of two images and it is exactly what §3 must confirm or kill.

## 2. Hypotheses

The crops are built by `make-groundtruth-f811.py`: for each counting frame `f = t0 + 8 … t0 + 11` it
crops a 368×368 square centred on **`cross[f]`, the crosshair position AT THAT COUNTING FRAME**
(`make-groundtruth-f811.py:168-183`). `t0` is the firing frame, found by `find_t0`.

- **H1 — FRAME-LAG.** The crop is centred on the crosshair at the _counting_ frame, but the pellets
  landed centred on the aim point at the _firing_ frame. In the 8–11 frames between (≈130–180 ms at
  60 fps) the reticle moves — recoil, target tracking — so the cloud appears displaced by exactly that
  motion. Predicts: **cloud offset ≈ `cross[t0] − cross[f]`**, matching in BOTH components, per shot.
  ⇒ Fix is cheap and local: centre the counting window on `cross[t0]`, not `cross[f]`.
- **H0a — LOCALIZATION ERROR.** The structural locator is simply wrong at some counting frames.
  Predicts: displacements exist but do **not** track the cloud offsets. ⇒ This is the handoff's §5
  item 3 (60 fps localization instability) and would promote it to top priority.
- **H0b — REAL AIM-vs-IMPACT OFFSET.** The locator is right at both `t0` and `f`, and they barely
  differ, yet the pellets still land 20–52 px off the reticle. Predicts: `cross[t0] ≈ cross[f]`
  (< ~10 px) while cloud offsets stay large. ⇒ **Not a reader bug at all** — it is a sim-side fact
  about where SG pellets land relative to the aim point, and it belongs to the SG geometry thread,
  not this one.

These are mutually exclusive on the stated predictions. That is the point.

## 3. PRE-COMMITTED decision rule — do not edit after seeing the numbers

Compute, for each of the 5 real shots (shot 0 has `t0 = None` and is excluded):

```
DISP_shot  = cross[t0] − cross[f08]          # the crosshair's own motion, firing → counting
CLOUD_shot  = pellet-cloud centroid(f08) − (184,184)   # already measured, §1 table
```

| Result                                                                                                          | Verdict | Consequence                                                                                                                                      |
| --------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`DISP` matches `CLOUD` within ±10 px in BOTH components on ≥4 of 5 shots**                                    | **H1**  | Frame-lag confirmed. Re-centre the counting window on `cross[t0]`. Cheap, local, and testable against the 6-shot fixture.                        |
| **`\|DISP\| < 10 px` on ≥4 of 5 shots while `\|CLOUD\|` stays 20–52 px**                                        | **H0b** | Not a reader defect. Hand off to the SG-geometry thread; the reader's cold bias remains unexplained and this document closes without a fix.      |
| **`\|DISP\|` large (>15 px) but uncorrelated with `CLOUD`** (sign disagrees, or \|DISP−CLOUD\| > 25 px on ≥3/5) | **H0a** | Localization instability. Promote handoff §5 item 3; the fix is in the locator, not the window.                                                  |
| Anything else                                                                                                   | —       | Report as-is. **Do not force it into a bucket.** n=5 is small enough that a mixed result is a real possible outcome, not a failure to interpret. |

Also report the per-shot vector residual `CLOUD − DISP` and its magnitude, so a partial explanation ("lag
accounts for 60% of it") is visible rather than collapsing into pass/fail.

**Sign convention is the single most likely way to get this wrong.** If pellets are frozen at the
firing aim point and the crop follows the crosshair, then when the crosshair moves +x between `t0` and
`f`, the cloud appears at −x in crop coordinates. Derive the sign from first principles BEFORE running,
write it down, and sanity-check it on shot 1 (cloud at −49.9 x) — a sign error will invert the verdict
and make H1 look like H0a.

## 4. Method, and what is already on disk

**Reuse first.** `docs/VALIDATION-INDEX.md` is the lookup; what exists for this question:

- `scripts/tests/fixtures/pellets/groundtruth-f8-11.json` — **committed**, records per-shot `t0`
  (1060 / 1096 / 1140 / 1289 / 1369) and the crop frame indices. No `rejected` entries on any shot, so
  the 150 px jump guard never fired and there is no survivorship bias inside the set.
- `scripts/tests/fixtures/pellets/groundtruth-f8-11-positions.json` — **committed**, owner-drawn
  positions; `CLOUD` is computed from these and needs no new work.
- `count-pellets.py --dump-tracks` emits **`cross_positions`** (plus `cross_confs`, `cross_rawloc`)
  per frame — exactly `DISP`'s input. Confirmed present in the schema of
  `scratchpad/pellets/i2-marciana-60fps/tracks.json`.

**What is NOT reusable, and why — check this before assuming otherwise.** No committed dump covers the
groundtruth window. `i2-marciana-60fps/tracks.json` has only 480 frames; `marciana-solo/frames-pellet`
has 5697 frames against this clip's 1800, so **frame indices do not align** and `t0 = 1060` would point
at a different frame. Silently mis-indexing here would produce confident garbage.

⇒ Regenerate at the **exact** groundtruth clip parameters — `at=15 dur=30 fps=60 zoom=2`,
`--locate structural`, the same params `make-groundtruth-f811.py` used — and dump tracks. Extend an
existing script with a flag; do not write a standalone one (constraint 9), and commit whatever is
built.

**Self-check that the indexing is right (do this FIRST, it is cheap and decisive):** regenerate the
crop for one shot at `cross[f08]` and compare it against the committed
`groundtruth-f8-11/shot01/f08_idx1068.png`. If it does not reproduce, the frame indexing or locate
mode is wrong and every downstream number is meaningless. **This check gates the rest.**

## 5. Confounds — state each verdict before reading the result

1. **Sign convention** — see §3. The most likely failure.
2. **Centroid noise.** `CLOUD` is a 7–10 pellet sample centroid; SE ≈ 18 px per axis. So even under H1,
   expect ±15–20 px of scatter — the ±10 px band in §3 is deliberately generous, and a near-miss on
   one shot is not a refutation. Report `CLOUD`'s own uncertainty alongside it.
3. **Locator confidence.** Read `cross_confs` at `t0` and at each counting frame. A low-confidence
   lock makes that shot's `DISP` meaningless; exclude it and say so rather than averaging it in.
4. **The 150 px jump guard hides the extreme cases.** Any counting frame displaced >150 px from `t0`
   was dropped at crop time, so this set is conditioned on displacement <150 px. It cannot see the
   worst excursions — and shot 0 has no `t0` at all. Do not generalise to "the locator is fine."
5. **`t0` is itself estimated** by `find_t0` via `EXPECTED_LEAD`, not measured. If `t0` is off by a
   few frames, `cross[t0]` is the wrong reference and `DISP` is biased. Report `find_t0`'s own margin,
   and check whether `DISP` is stable if `t0` is perturbed by ±2 frames — if it is not, that instability
   IS the finding.
6. **n=5 shots, one clip, one unit (`marciana`, SG/Iron).** Does not generalise to `noir` / `guilty` /
   `isabel`. Per the provenance ledger this fixture can **FAIL** a candidate but never certify one to
   ±0.25.

## 6. Evidence discipline

This **RECORDS a measurement**. It may not, in the same motion, change `pellet_radius`,
`center_exclude`, `FIDELITY_BOTH_PASS_FLOOR`, `min_area`, `min_circ`, or the crop-centring behaviour;
overturn a `DECISIONS.md` entry; or stamp a verdict elsewhere. **Even under a clean H1, landing the
re-centring fix is a separate gated pass** — it changes what the counter counts on every shot of every
video, so it needs its own before/after against the 6-shot fixture plus the guard layer.

This is reader/tooling work, not a damage-model value, so it does **not** require `/scientific-method`
(`CLAUDE.md` §sufficiency: "Tooling, scripts, readers, tests and docs are NOT that surface").
`verify.sh` + `pellet-selftest.sh` + the committed fixtures are its gate.

## 7. Traps carried forward

- **`cmd | tail; echo $?` reports TAIL's exit status.** Two false readings in this thread already.
- **Read the CLEAN crops** (`groundtruth-f8-11/`), never `groundtruth-f8-11-annotated/`.
- **Never `git restore` / `checkout --` / `reset --hard`** — shared worktree; use `git stash` or
  reverse edits surgically. To restore a file to HEAD, redirect `git show HEAD:<path>` into it.
- **Commit per item; prefer synchronous subagents.** Three background subagents lost their completion
  records to process exits on 2026-07-31; committed work survived every time.
- **Headless session:** do not background shell commands — run foreground with an explicit timeout.
