# OWNER ASK — label 10 mislocked shots, to SIZE the localization channel

> Owner-facing. Generated 2026-08-06 from `mislock-identity-slice.json` + the `*-tmplloc` dumps.
> Basis: `docs/probe-runs.md` §39 (mechanism established) → §40 (this screen).
>
> **Slugs.** `marciana` (SG/Iron, `docs/probes/clean-weapons/marciana-solo.MP4` — **not**
> `marciana-marine-study`, AR/Iron), `noir`, `guilty`, `isabel`.

## Why this ask exists, and why it is only 10 shots

§39 established the MECHANISM — on mislocked shots the two crosshair locks count **largely different
pellets** (`J_mis` 0.29–0.60 against a control `J_ok` of 0.95–1.00, several shots at **zero
overlap**). It deliberately could not establish the MAGNITUDE: a Jaccard says the two locks disagree,
never **which is right** or **how many real pellets are lost**. Only owner labels can do that.

⚑ **The ask was shrunk twice before reaching you** (the §9A precedent):

1. **137 flagged mislocks → 82.** §40A found **55 (40.1%) are a STUCK TEMPLATE LOCK** — the
   reference frozen at one pixel across many frames while the structural lock moves normally. Those
   need no labelling; they are mechanically identifiable and are a template-arm bug.
2. **82 → 10.** Stratified to the two populations that actually discriminate (below), rather than
   sampling the rest.

**Cost: 10 shots × 4 frames = 40 crops** — the same order as the original `groundtruth-f8-11` set.

## The list

`struct` / `tmpl` are the two candidate crosshairs at `t0+9`. `crop r` is the radius a
**midpoint-centred** crop needs so that **both** candidate windows are fully visible.

### Group A — DISJOINT sets (`jaccard` = 0.0): both locks count pellets, ZERO overlap

The cleanest adjudication available: each lock reports a plausible count, and they share **no**
pellet. Your labels say which set is real — or that neither is.

| #   | unit                 |   t0 | disp px |      struct |        tmpl | n struct | n tmpl | crop r |
| --- | -------------------- | ---: | ------: | ----------: | ----------: | -------: | -----: | -----: |
| 1   | `guilty`             | 4279 |     447 | [2114, 232] | [1755, 498] |        3 |      4 |    407 |
| 2   | `isabel`             | 1300 |     446 | [1604, 230] | [1086, 569] |        4 |      3 |    407 |
| 3   | `noir`               | 1817 |     411 | [1083, 226] |  [818, 554] |        6 |      5 |    389 |
| 4   | `guilty`             | 1697 |     400 | [1361, 226] | [1115, 498] |        4 |      5 |    383 |
| 5   | `noir`               | 1175 |     376 | [1917, 318] | [1523, 652] |        3 |      4 |    372 |
| 6   | `marciana` (SG/Iron) | 3636 |     272 |  [792, 234] |  [719, 495] |        3 |      5 |    319 |

### Group B — the UNSCORED tail (§39C's selection effect)

§39 could not score these: a wrong lock leaves **no band plateau**, so the worst mislocks dropped
out — which is exactly why §39's numbers are a **lower bound**. ⚑ These are also the shots
production routes onto the **legacy fallback channel**, so labelling them prices a population no
measurement has reached.

| #   | unit                 |   t0 | disp px |      struct |        tmpl | crop r |
| --- | -------------------- | ---: | ------: | ----------: | ----------: | -----: |
| 7   | `marciana` (SG/Iron) | 4858 |     539 | [1448, 315] | [1027, 654] |    453 |
| 8   | `isabel`             | 1993 |     538 | [1749, 130] | [1411, 534] |    452 |
| 9   | `noir`               | 3809 |     515 |  [1672, 90] | [1464, 561] |    441 |
| 10  | `isabel`             |  389 |     515 | [2120, 224] | [1717, 512] |    431 |

## ✅ BUILT — the crops exist; the ask is now askable

`analyze-pellet-tracks.py --mislock-crops <dumps-root>` (2026-08-06). Reads the
**already-extracted** `frames-pellet/` PNGs plus each dump's structural and `-tmplloc`
`tracks.json`; no re-extraction, no video access, no detector run, no constant touched.

```sh
PY=/Users/maxwellsutton/nikke-sim/scripts/probe/.venv/bin/python
$PY scripts/probe/analyze-pellet-tracks.py \
    --mislock-crops /Users/maxwellsutton/nikke-sim/scratchpad/pellets \
    --mislock-crops-out /Users/maxwellsutton/nikke-sim/scratchpad/pellets/mislock-labels
```

Output (gitignored; the SCRIPT and its geometry fixture are what is committed):
`scratchpad/pellets/mislock-labels/` — `shotNN/f08..f11` crops, `INDEX.md`, `MANIFEST.json`,
`CANDIDATE-KEY.json` and a pre-filled **`ANSWERS.json`** (§32D — fill it in and COMMIT it).

What it does, against the four requirements above:

1. **Midpoint-centred**, radius chosen so BOTH candidates' 184 px counting windows are wholly
   inside the image — verified per shot, and a hard refusal if it ever is not.
   ⛔ Not `make-groundtruth-f811.py`, which centres on ONE crosshair at radius 184: on a 271–619 px
   displacement that crops the other candidate out entirely and would bias every label toward
   whichever lock the crop was cut with (§22F's defect class).
2. **Nothing is drawn on the crop** — no ring, marker, crosshair or label strip. Each crop is
   byte-identical to its source frame region plus flat pad-grey, checked over all 40.
   The two candidates are listed as `cand_1`/`cand_2` in **seeded-random order** in `INDEX.md`
   (crop-pixel coordinates only); `CANDIDATE-KEY.json` holds the mapping and is not needed to label.
3. **Pads, never clips** (§32C). The dumps are 2604×792 and the crops reach 989 px, so vertical
   padding fires on **9 of the 10** shots — a clipping implementation would silently move the crop
   centre off the midpoint and corrupt the labels.
4. **`ANSWERS.json` by construction**, vocabulary `struct` / `tmpl` / `both` / `neither` /
   `partial` / `?` **plus a free-text `verdict_verbatim`** and per-candidate real-pellet counts.

⚑ **The `crop r` column in the table above is NOT what the tool uses, and should not be.** That
column derives from `disp px`, which is each shot's **median** displacement over t0+8..t0+11, while
the crop is cut around the **t0+9** candidate pair the same table lists. On **shots 2 and 5** those
differ enough that the tabulated radius would clip a candidate window (shot 2 needs **494**, the
table says 407; shot 5 needs **442**, the table says 372). The radius is therefore computed from the
positions actually being cropped; the tabulated value is carried into `MANIFEST.json` as
`doc_crop_r` so the divergence is visible rather than silent, and the selftest asserts the table
would have clipped.

Self-validation (constraint 9): the tool **verifies the doc's tabulated `struct`/`tmpl` positions
against the live dumps** at render time and refuses on any mismatch (all 10 matched), and
`--mislock-crops-selftest` replays the crop arithmetic from
`scripts/tests/fixtures/pellets/mislock-crops-slice.json` with no scratchpad access.
`pellet-selftest.sh` is now **34 arms**.

## ⚑ Expect the vocabulary to be wrong again

It has been too narrow **twice running** (§22A, then §34A). Offer at minimum: `struct` / `tmpl` /
`both` / `neither` / `partial` / `?`, **and an explicit free-text field** — the last two times the
owner supplied a category the harness had not imagined.

## What this buys

A per-shot count of **real** pellets under each candidate lock ⇒ the first **magnitude** for the
localization channel, on the shipped channel, on production footage rather than the single in-sample
clip. That is the number that decides whether fixing localization closes the reader's residual — and
whether the reader can then be trusted to diagnose the **15.7% SG sim gap** it was built for.

⚑ **Check §40C first.** The 10 clean disagreements are systematic (`dx` +322 ± 121 positive 10/10,
`dy` −330 ± 63 negative 10/10). If that is one fixed offset between two HUD elements, the cheap fix
may land before any labelling is needed — **worth ruling in or out before you spend the time.**
