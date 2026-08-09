> **CLOSED (2026-08-09).** This handoff has landed; live follow-ups are in `docs/handoffs/QUEUE.md`.

# Rebuilding §19's A/B as a committed arm — PRE-COMMIT (2026-08-06)

> AI-facing. **Committed BEFORE the rebuilt arm emits any number.** Executes item 1 of
> `docs/handoffs/closed/2026-08-06-band-channel-SWEEP.md` §7.
>
> **Slugs.** `marciana` (SG/Iron, `docs/probes/clean-weapons/marciana-solo.MP4` — **not**
> `marciana-marine-study`, AR/Iron). `groundtruth-f811-*` are dump slugs, not units.

## 1. Why, and the specific hazard

Sweep §1: **§19's `−1.40 pellets/shot` has no committed instrument.** It is the denominator of the
cold-SG accounting (§27C's "3.4%", §31D's "3%", §35D's "32%" are all fractions of it), and all ~40
committed arms were enumerated without finding its producer. §19E names only the A/B's inputs.
Second occurrence of the constraint-9 failure the 2026-07-29 gauge instrument caused.

⛔ **THE HAZARD IS SPECIFIC AND IT IS NOT "the arm might be wrong".** It is that a rebuilt
instrument gets **tuned until it emits the remembered number**. `−1.40` is written down in six
places; anyone rebuilding knows the answer before they start. That is the exact shape of
outcome-fitting, and no amount of care about the code prevents it — only a rule committed first does.

⚑ **Complicating fact, recorded HERE so it cannot be presented later as a fresh confirmation:**
`--representative-audit`, post-§37, already reports `owner 42 − reader 35 = 7` over 5 shots =
**−1.40/shot** on the landed config. So a match is _expected_, and an arm that reproduces it is
**weak** evidence, not strong. The informative outcomes are the ones below that are NOT a match.

## 2. What the arm must do

A committed arm (`--residual-ab`) that, on the labelled clip:

- runs the **production counting path** — `count-pellets.py`'s real `_frame_pellet_counts` +
  `debounce_shots` — against the dump's own `cross_positions` and track list;
- **varies `band_hi` alone**, at minimum the pre-landing value and the landed value;
- scores per-shot counts against the **owner labels** (`groundtruth-f8-11.json` `white` =
  7/10/8/9/8) at the owner-anchored `t0` values;
- reports **mean per-shot error** per `band_hi` arm, and the difference between arms;
- ships a **self-validating fixture** + a `pellet-selftest.sh` arm (constraint 9).

⛔ It must NOT re-implement `_frame_pellet_counts` or `debounce_shots` — import and call them, so
`_expected` can only ever be production's own numbers.

## 3. ⛔ Decision bands — committed before the arm emits a number

Let `E(band_hi)` = mean per-shot error vs owner labels, and `Δ` = `E(landed) − E(pre-landing)`.
§19 claims `E(pre) = −2.00`, `E(landed) = −1.40`, `Δ = +0.60`.

| Outcome                                                       | Verdict                                                                                                                                                     |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Both within **±0.05** of §19                                  | **REPRODUCED.** §19's number stands and now has a named path. ⚑ Weak evidence per §1 — record it as _consistency_, not confirmation.                        |
| Both within **±0.25**, or `Δ` within ±0.15 with a level shift | **SUBSTANTIALLY REPRODUCED.** Record the discrepancy and its likely cause (config differences are real: §19's clip is `max_pellet_frames` 13, §37's is 14). |
| Either beyond **±0.25**                                       | ⛔ **§19 IS NOT REPRODUCIBLE AS STATED.** Then `−1.40` must be **re-derived and re-quoted from the new arm**, and every fraction against it recomputed.     |

⚑ **All three outcomes are acceptable results of this pass.** The third is not a failure of the
rebuild — it is the finding the sweep predicted was possible.

## 4. ⛔ Anti-fitting controls — any firing VOIDS the reproduction claim

- **CONTROL FIT.** The arm's parameters, band values, error definition and shot set are fixed from
  §19E's stated inputs **before** any number is read, and are **not adjusted afterwards** to move the
  result toward `−1.40`. If any is changed after seeing output, the run is VOID and must be
  re-declared. ⚑ Every such change must be stated explicitly in the findings.
- **CONTROL BASIS.** The error must be scored on the **shipped channel** (band count at the
  band-plateau frame), not the legacy `pellet_ids`/median-frame channel — the §36/§37 defect. If the
  arm cannot demonstrate which channel it scored, VOID.
- **CONTROL LABELS.** Owner labels come from `groundtruth-f8-11.json` verbatim (7/10/8/9/8, shot 0
  excluded as the owner-confirmed false positive). ⛔ No re-labelling, no re-derivation, no owner time.
- **CONTROL n.** n = **5 shots, one clip**, in-sample (these are the labels the reader was tuned
  against). ⇒ The arm reports n on every line and the result is **ELIMINATION-strength**, never a
  certification.

## 5. ⛔ Scope

- ⛔ **NOTHING IS ENACTED.** No constant, default, threshold or engine value changes regardless of
  outcome. This pass builds an INSTRUMENT and records what it measures.
- ⛔ **No existing fixture is regenerated** except a new one belonging to this arm.
- ⛔ If the arm disagrees with §19, that is **RECORDED**, not acted on — re-quoting the derived
  fractions (§27C/§31D/§35D) is a separate, gated pass.
- ⚑ Tooling surface ⇒ `verify.sh` + `pellet-selftest.sh` are the gate; `/scientific-method` is not
  required (CLAUDE.md SUFFICIENCY §4).

## 6. What would be sufficient, stated up front

A committed arm at a named path, with a self-validating fixture, a selftest arm, and its numbers
recorded against the §3 bands with n attached. **That is the whole bar** — whether it reproduces
§19 or refutes it. "A further experiment is conceivable" is not a reason to withhold.
