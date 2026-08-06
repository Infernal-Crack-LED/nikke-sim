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

## ⛔ What I must build BEFORE this is actually askable

**Do not generate these crops with the existing `make-groundtruth-f811.py` path.** It centres on
ONE crosshair at radius 184 — on a 400–540 px displacement that crops out the other candidate
entirely, and the labels would be **biased toward whichever lock the crop was cut with**. That is
the same defect class as §22F's edge-clipping.

Needed first:

1. A crop generator centred on the **midpoint of the two candidates**, at the per-shot `crop r`
   above, so both windows are fully visible and the labelling is **blind to which lock is which**.
2. ⛔ **No lock marker drawn on the crop** — otherwise the marks are anchored to a suggested centre.
3. The §32C padding fix applied (pad, never clip, at frame edges).
4. Answers persisted by construction (the §32D lesson — §8 item 1 was lost once because they were not).

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
