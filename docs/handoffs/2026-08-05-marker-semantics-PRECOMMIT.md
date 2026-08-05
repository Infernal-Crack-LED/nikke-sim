# Marker semantics — PRE-COMMIT (2026-08-05)

> AI-facing. **Committed BEFORE any production number exists**, following the `2026-08-04-mislock-rate-PRECOMMIT.md`
> precedent — the §21 lesson is that a pre-committed control is the only thing that reliably voids a
> tidy-looking wrong answer. Executes §8 item 2 of
> `2026-08-04-pellet-reader-SESSION-JUDGE-handoff.md`, unblocked by the §26 schema landing.
>
> **Slugs.** Units under test: `marciana` (SG/Iron, `docs/probes/clean-weapons/marciana-solo.MP4`
> — **not** `marciana-marine-study`, AR/Iron), `noir`, `guilty`, `isabel`. All SG, `ammo: 9`,
> `hitsPerShot: 10`. Dump names (`h4-marciana-schemafix` etc.) are dump slugs, not unit slugs.

## 1. The question

§24D established that `MARKER_MIN = 2` is met by **red UI-banner glyphs**: at `h4-marciana`
frame 1565, opencv's `marker = 3` is 1 genuine crosshair-attached marker + 2 single-frame glyphs on
an unrelated red banner line (§15, adjudicated, pinned in `marker-geometry-slice.json`).

**What fraction of production `core` flags are raised by UI artifacts rather than real hit-markers,
and what does that cost?**

## 2. ⚑ WHY THIS IS NOT A REPORTING-FIDELITY ITEM — it moves the pellet count

Verified in **both** implementations (`count-pellets.py` `debounce_shots`, `read-pellets.ts`
`debounceShots`):

```
shot_red = 1 if core_hit else 0
total    = white + shot_red
```

A `core` flag adds **exactly +1** to that shot's `total`. So a **false** core flag makes the reader
**WARMER by 1 pellet on that shot**.

⚑ **Directional prediction, stated before scoring and falsifiable:** removing false core flags will
make the reader **COLDER**, i.e. it will make the measured cold bias **worse**, not better. Any
result claiming this fix improves the cold read should be treated as suspect. This item is a
FAITHFULNESS fix that is expected to cost accuracy on the headline number.

## 3. The substrate — and why it had to wait for §26

§25 measured that a pre-§26 `tracks.json` mislabels **12.20%** of the marker-bearing population.
Scoring this question on such a dump would put a ~12% error on exactly the channel under
measurement. **Therefore: only `*-schemafix` dumps (carrying per-frame `reds`, written after
`8d500ff9`) may be scored.** Each was validated by the §26B determinism control — `white`/`red`/
`marker` and `cross_positions` reproduce the original with **zero** diffs.

## 4. The discriminator — two clauses, pre-committed thresholds

For each track contributing to `marker` (red, in `pellet_ids`, within `params.marker_radius` of the
crosshair on at least one frame), over the frames of its own life:

- `rel_spread` — max pairwise distance between its **crosshair-relative** offsets
- `abs_spread` — max pairwise distance between its **absolute** positions
- `cross_travel` — max pairwise distance between the **crosshair** positions

| Clause               | Rule                                                                                                                                                                                           | Decides                                                                                     |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **C1 — PERSISTENCE** | `life >= 2`                                                                                                                                                                                    | Always decidable. A single-frame detection carries no persistence evidence by construction. |
| **C2 — ATTACHMENT**  | `cross_travel >= 10` **and** `rel_spread <= 6` ⇒ ATTACHED; `cross_travel >= 10` **and** `abs_spread <= 6` ⇒ SCREEN-FIXED; else if `cross_travel < 10` ⇒ **UNDECIDABLE (abstain)**; else MOVING | Only where the crosshair actually moved                                                     |

**Threshold provenance — none is fitted to an outcome:**

- `life >= 2` is the minimum value that requires _any_ persistence. §15's adjudicated genuine marker
  had life 3; both adjudicated glyphs had life 1.
- `rel_spread <= 6` zoomed px (3 native). §15's attached track held `dx` range 0.5 / `dy` range 1.8,
  i.e. rel spread ≈ 1.9 — the threshold is ~3× that, deliberately **generous toward calling
  something ATTACHED**, so the rule is biased AGAINST finding artifacts.
- `cross_travel >= 10` must exceed `rel_spread`'s 6 for "relative spread is small" to carry
  information at all. Below it the two spreads are indistinguishable and the honest answer is
  abstention, not a guess.

⚑ **Abstention is a REPORTED CATEGORY, never silently folded into either verdict.** Measured
feasibility on `h4-marciana-schemafix` (a property of the crosshair, not of the answer, so measuring
it first does not contaminate this pre-commit): of 400 marker-contributing tracks, **153 (38%) are
life-1** — decided by C1 with no travel needed; of the 247 remaining, **66% clear `cross_travel >= 10`**.

## 5. What gets measured — on the PRODUCTION path, not a reconstruction

Per §19's lesson, the delta is measured by re-running the **real** estimator, not by estimating:

1. Build a **filtered** `frame_counts` in which `marker` counts only tracks passing C1 (and, in the
   C1+C2 arm, C2), leaving `white`/`red`/`band` untouched.
2. Run `count-pellets.py`'s own `debounce_shots` on the shipped and filtered series.
3. Diff the resulting shot lists.

**Reported:** events with `core = true` before/after; events whose flag is met ONLY by C1-failing
tracks; ONLY by SCREEN-FIXED tracks; the undecidable population; and the cost as
Δ`total` (= −1 per dropped flag), Δ`avgTotal`, and Δ per-shot.

⚑ Two arms reported separately — **C1 alone** (fully decidable, no abstention) and **C1+C2** (adds
the attachment test, carries an abstention population). C1 is the headline because it is the one
with no undecidable class.

## 6. Decision bands — committed before any number exists

On the **C1-alone** arm, pooled across the four `*-schemafix` dumps, let `R` be the fraction of
`core = true` events that lose their flag:

| `R`       | Verdict                                                                       |
| --------- | ----------------------------------------------------------------------------- |
| **< 5%**  | MINOR channel — record the measurement and close item 2. No landing.          |
| **5–20%** | A REAL channel — worth its own landing, with its own blast-radius pass.       |
| **> 20%** | DOMINANT reporting defect — landing is the next priority after re-extraction. |

## 7. ⛔ Falsification controls — either firing VOIDS the result

- **CONTROL A — DISCRIMINATION (decisive).** The rule must reproduce §15's already-adjudicated
  ground truth: at `h4-marciana` **frame 1565**, `marker` must go **3 → 1** (track `11110` survives;
  `11115` and `11117`, both life-1, are dropped). This is an _independent_ label — adjudicated
  before this rule existed and pinned in the committed fixture
  `scripts/tests/fixtures/pellets/marker-geometry-slice.json`. **If the rule does not reproduce it,
  the rule does not implement the discriminator it claims to ⇒ VOID.**
- **CONTROL B — OVER-FILTERING.** If the rule removes **more than 60%** of total marker mass across
  the four dumps, the persistence assumption is wrong for this VFX and the rule is rejecting genuine
  markers ⇒ **VOID**, report as such rather than landing a "big win".
- **CONTROL C — NON-VACUITY.** If the filter drops **every** `core` flag across all four dumps, the
  rule is certainly over-filtering (real core hits do occur) ⇒ **VOID**.

## 8. ⛔ Scope — this pass RECORDS, it does not enact

- ⛔ **Nothing lands from this pass.** `MARKER_MIN`, `debounce_shots` (either implementation),
  `read-pellets.ts`'s counting path and every constant/gate/threshold/default stay UNTOUCHED. A
  landing is a separate pass with its own blast-radius pass and its own gate.
- ⛔ **No verdict on the cold bias.** §2's directional prediction is a prediction, not a finding.
- ⛔ **No existing dump is overwritten.** New dumps only.
- ⚑ Evidence-proportionality: this is a swept measurement over 4 units, but §15's adjudication —
  the ground truth CONTROL A leans on — is **n = 1 frame**. The rule's _agreement_ with it is a
  discrimination check, **not** independent confirmation that the rule generalizes.
