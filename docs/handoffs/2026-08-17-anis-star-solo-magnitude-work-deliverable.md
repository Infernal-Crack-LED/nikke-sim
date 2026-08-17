# Work deliverable — `anis-star` solo per-pull gauge magnitude (2026-08-17)

> Pre-op packet of record:
> [2026-08-17-anis-star-solo-magnitude-preop-packet.md](2026-08-17-anis-star-solo-magnitude-preop-packet.md)
> (APPROVED-WITH-REVISIONS; R1–R6 + NR1–NR4 binding).
> Measurement artifact (verdict-free): `docs/probe-data/anis-star-solo-magnitude-2026-08-17.json`.
> Instrument: `scripts/probe/gauge-magnitude.ts`. Replay pin: `scripts/tests/probe/gauge-magnitude.test.ts` (19/19).
>
> **This document reports what the run produced and what the pre-committed rule mechanically
> selects. It contains no verdict, no recommendation and no advocacy.** Nothing was enacted; no
> engine, data or override file was touched.
>
> Unit throughout: **`anis-star`** (Anis: Star — RL / Electric / Burst I / Defender). The instrument
> gate's reproduction fixture is **`maiden-ice-rose`** (Maiden: Ice Rose).

---

## 0. Method order actually executed

`instrument gate → run inventory → departure classification (written before any estimator) →
controls → E1 / E2 / E3 → decision rule → clause-2 reachability → declared-candidate check (last)`.

The artifact's JSON key order preserves that sequence. The literal `3.71` appears in
`scripts/probe/gauge-magnitude.ts` only after the `candidate check — STRICTLY LAST` marker; a test
asserts that (`the declared candidate is firewalled`).

No footage was read. Both inputs were already on disk:
`docs/probe-data/anis-star-solo2-gauge.json` and `docs/probe-data/anis-star-solo-a3-gauge-reread.json`.

---

## 1. Instrument gate — PASSED

| check                                                                               | result                                                                                                                                                                                             |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| solo #2 `instrumentPrelude.fixtureReproduction`                                     | bar self-calibrated 138 px; **all 450 reads** of `scripts/tests/fixtures/gauge-fill-maiden-ice-rose-30fps.json` reproduced identically (0 missing, 0 mismatched by `t`/`state`/`fillRaw`)          |
| A3 `instrumentPrelude.fixtureReproduction`                                          | same method, same result (450/450 identical)                                                                                                                                                       |
| `scripts/tests/gauge-fill-anchor.test.ts` + `scripts/tests/gauge-fill-team.test.ts` | re-run this session: **18/18 pass**                                                                                                                                                                |
| bar extents                                                                         | solo #2 locked 138 px by an explicit `--bar 489:501:2474:2612`; A3 locked 138 px by the self-calibrating path (`--calib-frame 300`, different crop, different coordinates) — independent agreement |

⇒ Decision-rule **clause 5 (BASIS-BROKEN) does not fire.**

---

## 2. Run inventory (rebuilt from the traces, not from the summary tables)

Method: settled plateaus = maximal runs of constant `fillRaw` in the `filling` state lasting ≥ 7
frames (so the level is unchanged ≥ 6 frames after the change that produced it — the `[R4]`
plateau-read discipline). Transitions between consecutive settled plateaus are `CLEAN` only if
they rise ≥ 1.41 pp (the artifact's own committed binding threshold), contain no dirty-span frame,
never dip more than one render column below the before-level and never overshoot the after-level;
otherwise `OBSCURED`. Sub-threshold changes are `WOBBLE` (not credits); falls are `DROP` (always a
render artifact inside a refill window).

Dirty spans = the union of the committed `result.params.windows[].exclusions`
(W2 `[25.43,26.30]`, W3 `[52.81,54.05]`, W4 `[76.51,77.21]`) and the contiguous `offCurve`-flagged
read spans (`25.53–26.07`, `37.80`, `52.80–52.83`, `53.40–53.93`, `75.87–76.03`, `76.63–77.13`,
`81.10–81.17`, `81.63–82.17`, `83.17`). A3 has no machine-readable list; its one artifact span
(`16.00–17.97`) is pinned in the script with its `perPullTable[6].reason` citation.

### Per window

| window | trace span    | baseline | post-opener settled level  | departing credits (rendered) | steady runs used                                           | fill instant |
| ------ | ------------- | -------- | -------------------------- | ---------------------------- | ---------------------------------------------------------- | ------------ |
| W1     | 1.90 – 13.60  | 2.2      | 11.6                       | none                         | _descriptive only_ (11.37 ×3p, 11.60 ×3p)                  | 13.60 `full` |
| W2     | 24.60 – 37.83 | 2.2      | 6.5 (entered as [6.5,7.2]) | +15.3                        | 6.5→74.6 over **6** pulls ⇒ 11.35                          | 37.83 `full` |
| W3     | 48.80 – 61.07 | 2.2      | 6.5                        | none                         | 6.5→29.0 over **2** ⇒ 11.25; 51.4→96.4 over **4** ⇒ 11.25  | 61.07 `full` |
| W4     | 72.13 – 83.20 | 2.2      | 9.4                        | +16.0, +15.2, **[8.0, 8.7]** | 63.0→74.6 over **1** ⇒ 11.60                               | 83.20 `full` |
| A3     | 7.70 – 19.40  | 2.2      | 11.6                       | none                         | 11.6→67.4 over **5** ⇒ 11.16; 79.0→89.9 over **1** ⇒ 10.90 | 19.40 `full` |

The mechanically-derived post-opener levels (`E1.postOpenerLevelMechanicalCrossCheck`) are
`W1 11.6 / W2 6.5 / W3 6.5 / W4 9.4 / A3 11.6` — they match the values E1 was fed.

---

## 3. `[NR3]` Which cue defined `K`, per window and per recording

**Every window's `K` was counted to the GAME-DRIVEN cue** (the reader's `full` state, i.e. the green
bar), never to a rendered 100.0. Explicitly:

| window | `K` | cue that set it                                                                                                                                                                                                                                        |
| ------ | --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| W1     | 9   | game-driven — `full` at 13.60. (Pull count is **reader-only**, no montage tile: barred from clause 1(ii).)                                                                                                                                             |
| W2     | 9   | game-driven — `full` at 37.83; montage counts 9 pulls open→green-full                                                                                                                                                                                  |
| W3     | 10  | game-driven — `full` at 61.07; montage counts 10 pulls open→green-full                                                                                                                                                                                 |
| W4     | 9   | game-driven — `full` at **83.20**, **NOT** the rendered 100.0 at 81.63. That rendered 100.0 is inside an `offCurve`-flagged span (81.63–82.17) and the bar settles back to 96.4 at 82.37 before the last pull. Montage counts 9 pulls open→green-full. |
| A3     | 9   | game-driven — `full` at 19.40 (30 fps trace; 19.38 at 60 fps); `countingCrossCheck` ammo count gives 9 pulls from empty                                                                                                                                |

**No window entered clause 1(ii)/(iii) on a rendered-100 count.**

---

## 4. Departure classification (computed and written down BEFORE any estimator)

Rule as pinned: `DEPARTING ⟺ |Δ − median_all| > radius`, symmetric, in render-grid units,
referencing no hypothesis value. Pool = every CLEAN, non-opener, non-clipped credit outside a dirty
span, taken from the ladder.

- **solo #2 `median_all` = 11.60** (n = 22). Excluding W1 it is also **11.60** (n = 16) — the
  median is insensitive to whether the reader-only window is pooled.
- **A3 `median_all` = 11.25** (n = 6).

### Membership under both radii — `[NR1]`

| radius                               | solo #2 DEPARTING                                                 | A3 DEPARTING |
| ------------------------------------ | ----------------------------------------------------------------- | ------------ |
| **2.175 pp (3 columns, primary)**    | W2 +15.3 @36.83, W4 +16.0 @73.90, W4 +15.2 @74.87, W4p7 [8.0,8.7] | none         |
| **1.45 pp (2 columns, sensitivity)** | _identical set_                                                   | none         |

**The two memberships are IDENTICAL on both recordings**, so the `[NR1]` "if the clause outcome
differs between the two, the result is INCONCLUSIVE-LOG" trigger does **not** fire.

Distances at the primary radius: the three upward credits sit 3.6 / 3.7 / 4.4 pp from the median;
W4p7's whole interval sits 2.9–3.6 pp below it (departing across its entire range, not ambiguous).
Nearest non-departing values: 12.30 (Δ 0.70), 10.80 (Δ 0.80), 10.20 (Δ 1.40) — the 1.45 pp radius
clears 10.20 by 0.05 pp, which is the only near-boundary case and it does not flip.

**Disclosure required by step 2b — what the rule does that an eye would not.** The rule keeps
W1's +12.30 and W3's +10.20, which a human scanning for "the steady family (10.1–11.6)" might have
trimmed; and it keeps W2's +10.80 (the mechanical read of the pull the artifact's table records as
+11.5 under the opposite one-column attribution). It excludes nothing a human eye would have kept.
Every excluded (departing) credit is one the artifact of record already flags.

---

## 5. Window eligibility for clause 1(ii)/(iii), established before estimating

| window | montage-verified `K`?    | game cue? | E1 well-posed? | eligible for clause 1(ii)           |
| ------ | ------------------------ | --------- | -------------- | ----------------------------------- |
| W1     | **no** (no montage tile) | yes       | yes            | **NO** — reader-only, packet-barred |
| W2     | yes                      | yes       | yes            | yes                                 |
| W3     | yes                      | yes       | yes            | yes                                 |
| W4     | yes                      | yes       | yes, but wide  | reported both ways (see below)      |

W4's E1 comes out as `[10.14, 12.85)` — 2.71 pp wide, and it **contains both** 10.388 and the whole
H-elevated region, so it separates no hypothesis pair. It is reported as an eligible window that
does **not** exclude 10.388. Counting it or not makes **no difference** to any clause: 1(ii) asks
for ≥2 windows that _do_ exclude (satisfied either way by W2+W3), and 1(iii) asks the CI to
intersect every contributing interval (it intersects W4's too). **Three montage-verified windows
qualify structurally, so the `[NR4]` "fewer than 2 ⇒ clause 4" stop does not fire.**

---

## 6. Controls (all run before the estimates)

**(a) trace-event count == montage pull count, over every run used — PASS.**

| run            | pulls | montage ammo decrements in the run | match |
| -------------- | ----- | ---------------------------------- | ----- |
| W2 26.27→33.93 | 6     | 6                                  | ✓     |
| W3 50.33→51.80 | 2     | 2                                  | ✓     |
| W3 54.50→60.07 | 4     | 4                                  | ✓     |
| W4 77.20→77.83 | 1     | 1                                  | ✓     |

Per-window totals: montage `pullCount` 9 / 10 / 9 equals the count of ammo decrements recovered
independently from the committed montage cell arrays (9 / 10 / 9). The raw trace-transition counts
are 8 / 9 / 8 because in each window one OBSCURED transition spans two pulls (the flash-hidden
opener/`p5` pairs) — that is the expected reconciliation, not a discrepancy.

**(b) no burst-DoT window overlaps any measured run — PASS.** Cast instants were re-derived here
from the trace's own `full`-state transitions (`13.60, 37.83, 61.07, 83.20`, after collapsing the
1–2 s `full` flicker) plus the committed `structural.cycle` "full → cast ≈ 0.4 s later"; DoT
duration 10 s. That gives DoT windows `[14.0,24.0] [38.23,48.23] [61.47,71.47] [83.6,93.6]`.
Measured runs occupy `26.27–33.93`, `50.33–51.80`, `54.50–60.07`, `77.20–77.83` — **disjoint from
all four**, the tightest margin being 1.40 s (W3's run ends 60.07, DoT-3 opens 61.47). Independent
corroboration: `structural.countdownDigits` fixes cast 3 at ~61.5 from a HUD digit read.

**(c) Question-B false-event rate — CARRIED, not re-derived.** From the same artifact's committed
`result` block: **0 false-event bins in 492 quiet bins** at the binding threshold 1.41 pp ⇒
Wilson one-sided 95 % upper **0.0055/bin** (joint with the C4/A3 basis: 597 bins, **0.0045/bin**).
Largest positive delta observed in any quiet bin: **0.7 pp** (one column).

---

## 7. E1 — anomaly-aware count-to-fill

Form used: `residual = 100 − postOpenerLevel − Σ(departing credits, as rendered)`;
`m = K − 1 − n_anomalous`; `P ∈ [residual/m, residual/(m−1))`. Folding baseline + opener into the
single settled post-opener level is algebraically identical to the packet's
`100 − baseline − opener` and removes the baseline/opener split ambiguity. `[NR4]` interval
arithmetic is applied to the two smeared quantities: W2's post-opener level (its credit is inside a
dirty span; entered as `[6.5, 7.2]`) and W4p7 (`[8.0, 8.7]`).

| window             | `K` | `m` | residual     | **E1 interval**       | excludes 10.388 | margin                       |
| ------------------ | --- | --- | ------------ | --------------------- | --------------- | ---------------------------- |
| W1 _(descriptive)_ | 9   | 8   | 88.4         | **[11.050, 12.629)**  | yes             | +0.662 pp (0.91 col)         |
| W2                 | 9   | 7   | [77.5, 78.2] | **[11.071, 13.033)**  | yes             | +0.683 pp (0.94 col)         |
| W3                 | 10  | 9   | 93.5         | **[10.3889, 11.688)** | yes             | **+0.00089 pp (0.0012 col)** |
| W4                 | 9   | 5   | [50.7, 51.4] | **[10.140, 12.850)**  | **no**          | −0.248 pp                    |
| A3                 | 9   | 8   | 88.4         | **[11.050, 12.629)**  | yes             | +0.662 pp (0.91 col)         |

Cross-recording E1 intersection (W2 ∩ W3 ∩ W4 ∩ A3): **[11.071, 11.688)**.

**Fragility disclosure — the load-bearing one.** W3's exclusion of 10.388 holds by **0.00089 pp =
0.0012 of a render column**. Moving its post-opener level one column up (6.5 → 7.2) gives
`[10.311, 11.600)`, which **contains** 10.388; one column down gives `[10.467, 11.775)`, which
excludes it. So W3's leg is not robust to a single-column read. If W3 is treated as not excluding,
solo #2 carries **one** excluding montage-verified window and clause 1(ii) (which needs two) fails —
the rule then selects **clause 4 (INCONCLUSIVE-LOG)**. If the A3 window may be counted as a second
montage-verified window (the packet's clause 1(ii) does not say whether it may — clause 1(iv) treats
A3 separately), W2 + A3 satisfy 1(ii) with 0.66–0.68 pp of margin each and clause 1 stands without
W3. **Both readings are reported; the run does not choose between them.**

Per the packet's own blindness declaration, **E1 was already on the record for both recordings and
carries no pre-registration value** (solo #2 `:910`, A3 `:182`); it is corroboration only.

---

## 8. E2 — telescoping run-mean, with all three SE components

`P̂_run = (level_after_last_pull − level_before_first_pull) / pulls_in_run`, over maximal runs of
consecutive CLEAN non-departing credits, excluding the opener, every departing credit (up or down),
the fill-clipped pull and every dirty span. Endpoints obey the `[R4]` plateau discipline; three
candidate endpoints failed it and were **dropped and logged**: W3 p4's after-level (40.6 held 1
frame), W4 p4's after-level (52.2 held 5 frames), and W2's opener level (inside the flash).

STRICT vs LENIENT reproduces the artifact of record's `conditional` taxonomy: a run whose anchoring
plateau traces back — through wobbles only — to the after-side of an OBSCURED transition or a DROP
was first painted straight out of a corrupted region. LENIENT keeps it; STRICT drops that first pull
and re-anchors one plateau later.

| pool            | k   | runs (P̂ / pulls)                   | pooled      | SE_quant | SE_scatter  | SE_QuestionB | **SE_pooled** (driver) | **95 % CI**          | excludes 10.388 |
| --------------- | --- | ---------------------------------- | ----------- | -------- | ----------- | ------------ | ---------------------- | -------------------- | --------------- |
| solo #2 LENIENT | 4   | 11.35/6, 11.25/2, 11.25/4, 11.60/1 | **11.3193** | 0.0392   | 0.0826      | **0.2932**   | 0.2932 (Question-B)    | **[10.745, 11.894]** | yes             |
| solo #2 STRICT  | 3   | 11.44/5, 11.25/2, 11.133/3         | **11.3474** | 0.0480   | 0.0894      | **0.3388**   | 0.3388 (Question-B)    | [10.683, 12.011]     | yes             |
| A3 LENIENT      | 2   | 11.16/5, 10.90/1                   | **11.1500** | 0.0580   | 0.1300      | **0.1784**   | 0.1784 (Question-B)    | [10.800, 11.500]     | yes             |
| A3 STRICT       | 1   | 11.16/5                            | **11.1600** | 0.0592   | _n/a (k=1)_ | **0.1827**   | 0.1827 (Question-B)    | [10.802, 11.518]     | yes             |

Pooling is inverse-variance on `SE_quant`; the CI uses z = 1.96 on `SE_pooled`.

**Reported as required by `[R4]`:** the empirical-scatter leg is **2.11×** the quantization leg on
the primary pool — i.e. real over-dispersion beyond quantization is present, though below the 3×
threshold the packet asked to be flagged as a finding in its own right. The **Question-B inflation
term dominates both** (7.5× quantization, 3.5× scatter) and is what sets the CI width.

**Driver-chosen construction, disclosed:** the packet mandated the Question-B term but did not pin
its formula. The one used is deliberately conservative —
`inflation_run = 1.41 pp × (0.0055 × bins_in_run) / pulls`, i.e. the 95 % one-sided **upper bound**
on the false-event rate over the run's whole duration, valued at the smallest delta that would
register as an event (the observed false-event set is empty, so no larger magnitude is evidenced),
inverse-variance weighted across runs. A less conservative reading (endpoints are settled plateaus,
so a transient false event does not move them at all) would drop this term to ~0 and leave
`SE_pooled` = the 0.0826 scatter leg, giving a CI of [11.157, 11.481].

W1 (reader-only, no montage) is excluded from every pool. Its descriptive runs read 11.37 (3 pulls)
and 11.60 (3 pulls).

---

## 9. E3 — run-height linearity

| pool            | k   | distinct heights | slope     | SE(slope) | df  | 95 % CI            | contains 0 |
| --------------- | --- | ---------------- | --------- | --------- | --- | ------------------ | ---------- |
| solo #2 LENIENT | 4   | 4                | +0.002689 | 0.00404   | 2   | [−0.0147, +0.0201] | yes        |
| solo #2 STRICT  | 3   | 3                | −0.002113 | 0.00452   | 1   | [−0.0596, +0.0553] | yes        |

Recorded verbatim per `[R6]`: **"no detected non-linearity (underpowered: 4 runs at 4 distinct
heights)"**. Per the packet's binding evidentiary cap, this **may not be cited as positive evidence
that the bar is linear**, in this document or any downstream one.

---

## 10. Which clause the pre-committed rule selects, and the arithmetic that selects it

Clauses evaluated in the order the packet writes them (5 stop-check, then 1, 2, 3, 4). Basis =
solo #2 LENIENT pool; the STRICT pool is reported alongside and selects the same clause.

- **Clause 5** — instrument gate passed ⇒ does not fire.
- **Clause 1(i)** — CI [10.745, 11.894] excludes 10.388 ⇒ **TRUE**. (10.388 sits 0.357 pp below the
  CI's lower bound.)
- **Clause 1(ii)** — montage-verified windows individually excluding 10.388 under E1: **W2 and W3
  = 2 ≥ 2** ⇒ **TRUE**. W1 is barred and was not counted. **See §7's fragility disclosure: W3's leg
  holds by 0.0012 of a render column.**
- **Clause 1(iii)** — CI intersects W2 [11.071,13.033) ✓, W3 [10.389,11.688) ✓ and W4
  [10.140,12.850) ✓ ⇒ **TRUE**.
- **Clause 1(iv)** — A3's E2 CI [10.800, 11.500] overlaps solo #2's [10.745, 11.894] ✓; the two
  recordings' E1 intervals intersect at [11.071, 11.688) ✓; that intersection contains the pooled
  E2 point estimate 11.3193 ✓ ⇒ **TRUE**.
- ⇒ **Clause 1 (MEASURED-ELEVATED) is the clause the rule as written selects.** Its recorded value
  would be the E1 intersection **[11.071, 11.688)**, n = 3 montage-verified windows + 1
  out-of-sample recording, 13 pulls across 4 runs on solo #2 plus 6 on A3.
- **Clause 2** — CI does not contain 10.388 and no window's E1 interval other than W4's contains it
  ⇒ FALSE.
- **Clause 3** — CI is disjoint from **no** window's E1 interval (so not "every"); E3's slope CI
  contains zero; **E1 and E2 moved in the SAME direction** (both above 10.388: every E1 interval
  that excludes it does so from above, and the pooled E2 is above) ⇒ **all three legs FALSE**, so
  clause 3 does not fire. The `[R1]` render-gain signature — E1 pushed down while E2 is pushed up —
  **is not present in this data**.
- **Clause 4** — not reached under the primary reading; it _is_ what the rule selects if W3's
  razor-thin E1 exclusion is not honoured and A3 may not be counted for 1(ii) (§7).

### Clause-2 reachability disclosure (mandatory)

| quantity                                          | value                           |
| ------------------------------------------------- | ------------------------------- |
| pooled E2 point estimate                          | 11.3193                         |
| half-width needed for the CI to contain 10.388    | **0.9313 pp** (CI width 1.8626) |
| `SE_pooled` that would have implied               | 0.4752                          |
| half-width achieved                               | **0.5747 pp** (CI width 1.1493) |
| `SE_pooled` achieved                              | 0.2932                          |
| **was clause 2 reachable at the achieved width?** | **NO**                          |

Stated plainly, without interpretation: the achieved precision is ~1.6× tighter than clause 2 would
have required at this point estimate. The packet's own text attaches a consequence to that fact —
_"if clause 2 was unreachable at the achieved width, the result is reported as INCONCLUSIVE
regardless of where the point estimate fell"_ — and also assigns the check to the post-op judge
(_"the Reachability check the post-op judge must apply"_), with the work step obliged only to report
the arithmetic. **Both are recorded here; applying the consequence is the judge's call.** One
structural observation offered without recommendation: under the literal reading, "clause 2
unreachable" is equivalent to "clause 1(i) satisfied", so the consequence sentence converts _every_
clause-1 outcome into INCONCLUSIVE. That may be intended (the pre-op judge flagged the skew it
guards against) or may be an over-broad wording; the run does not decide it.

---

## 11. Sensitivities (none changes the clause)

| sensitivity                                                                                            | result                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| departure radius 2.175 vs 1.45 pp (`[NR1]`)                                                            | **identical membership on both recordings** ⇒ the INCONCLUSIVE trigger does not fire                                                                   |
| STRICT vs LENIENT conditional pulls                                                                    | pooled 11.347 vs 11.319; both CIs exclude 10.388; **same clause**                                                                                      |
| dirty-span boundary: "read-point" (primary) vs "any-frame"                                             | any-frame drops W4 entirely and shortens W2 to 5 pulls ⇒ k=3, pooled **11.356**, CI [10.730, 11.981]; **same clause**                                  |
| one-column boundary attribution (the packet's pre-committed W2p7 = 11.6 / W2p6 = 10.9 vs the opposite) | every wobble at issue is **interior to a run**, so E2 telescopes over it; no E1, E2 or pooled value changes, and the classification median stays 11.60 |
| counting W4 as an eligible clause-1(ii) window or not                                                  | no clause changes (1(ii) needs ≥2 _excluding_, satisfied by W2+W3 either way; 1(iii) holds with W4 included)                                           |
| W3's E1 leg ±1 render column                                                                           | **flips** — see §7. This is the single fragile input in the run.                                                                                       |

---

## 12. Caveats recorded, not applied

- **A3 carries a standing gain claim.** `anis-star-solo-a3-gauge-reread.json`
  `series30fps.calibration.rawOverTrue = 1.064`, anchored on **`maiden-ice-rose`** (a different unit
  and recording). The packet pins both estimators on RENDERED values, so it was **not applied**. If
  it were, dividing rendered levels by 1.064 would scale E2 down (11.32 → ~10.64) and move E1 the
  other way — which is exactly the `[R1]` gain signature clause 3 exists to name. This is reported
  because it bears directly on H0-a; the run does not adjudicate it.
- **The Question-B term's formula was chosen by the driver** (§8) and dominates the CI. Both the
  conservative and the near-zero readings are reported.
- **A3's control (a) is prose-derived.** A3 has no montage cell array; its ammo count comes from the
  committed `perPullTable[].ammoAfter` / `countingCrossCheck.count` hand reads, not a machine-readable
  cell list like solo #2's.
- **W2's E1 rests on an interval-valued post-opener level** because its opener credit is inside the
  flash span; the mechanical settled read is exactly 6.5 and the interval [6.5, 7.2] is the
  artifact's own declared settle ambiguity.
- **The packet's own limits stand unchanged**: this run establishes no mechanism, no team-context
  value, nothing about `1×280 vs 2×140`, nothing about the `/hitsPerShot` divisor, and no engine or
  data value.

---

## 13. Declared-candidate check — run strictly after §10 was written

Descriptive only. The candidate (Δ = 3.71 pp) was fitted after the fact at n = 3 on one recording;
neither estimator uses it.

| departing credit (rendered) | − pooled E2 (11.3193) | − 3.71 | within one column (0.725)? |
| --------------------------- | --------------------- | ------ | -------------------------- |
| +15.3 (W2)                  | 3.981                 | +0.271 | **yes**                    |
| +16.0 (W4)                  | 4.681                 | +0.971 | **no**                     |
| +15.2 (W4)                  | 3.881                 | +0.171 | **yes**                    |

2 of 3 land within one render column of the candidate; one does not. The **downward** departure
(W4p7, rendered [8.0, 8.7]) sits 2.62–3.32 pp **below** the pooled steady value — a deficit, not an
excess, and the candidate does not address it. Per the packet: a hit here is descriptive
corroboration at n = 3, not a measurement of a mechanism; a miss touches nothing; and even a perfect
hit would describe a **new** mechanism, since `basePerTrigger` is engine-inert (packet P3).

---

## 14. Everything that went differently from the plan

1. **The run inventory was rebuilt mechanically, and it disagrees with the artifact's published
   per-pull table in two places.** (a) W2p5 reads **+10.80** mechanically (the one-column pre-step
   rise at 29.33 is a ≥7-frame settled plateau, so it becomes the before-level) against the
   packet's pre-committed **+11.5**; (b) W1's p5/p6 pair reads as an OBSCURED +9.40 then a CLEAN
   +12.30 (the transient dip to 55.1 outlasts the true 55.8 plateau) against the table's 10.1 /
   11.6 — same sum, different split. Neither changes anything: both are interior to runs (E2
   telescopes over them) and the classification median is 11.60 with or without them.
2. **`residual = 100 − postOpenerLevel − Σanomalies` was used instead of
   `100 − baseline − opener − Σanomalies`.** Algebraically identical, but it reads one settled
   plateau instead of two and so removes the baseline/opener split ambiguity entirely. Values match
   the artifact's own committed arithmetic for A3 and (within the opener read) for W2/W3.
3. **The plateau-dirtiness test keys on the `[R4]` read point** (the frame 6 after the plateau's
   first), not on any-frame overlap. Two committed exclusion spans clip a plateau by **one bin**
   (W2's 6.5 at 26.27 vs a span ending 26.30; W4's 63.0 at 77.20 vs a span ending 77.21), and the
   any-frame reading would delete W4's only run and shorten W2's. Both readings are computed and
   reported (§11); they select the same clause. The read-point rule is also what reproduces the
   artifact of record's own "conditional" labels for exactly W2p2 / W3p6 / W4p6 / A3 pull 8.
4. **The Question-B inflation term's formula is driver-chosen** — the packet mandated the component
   but pinned no formula (§8).
5. **A3's `SE` empirical-scatter leg is undefined under the STRICT reading** (k = 1 run). Reported
   as `null`; the LENIENT A3 pool (k = 2) is the one carrying a scatter estimate.
6. **W4's E1 turned out well-posed after all.** The packet inherited the artifact's "R3-gated, not
   well-posed" framing from the rendered 100.0 at 81.63; that read is `offCurve`-flagged and the bar
   settles back to 96.4 before the last pull, so the game-cue count-to-fill inequality does hold.
   W4's interval is nonetheless too wide to separate any hypothesis pair and is reported as
   non-discriminating rather than dropped.
7. **The clause-2 reachability consequence was not applied**, only reported with its arithmetic and
   its structural implication (§10) — the packet assigns the check to the post-op judge and the work
   step to the reporting of it.
8. **Nothing was enacted.** No `src/engine/**`, `data/**` or `src/skills/overrides/**` file was read
   for values or written. New files: one script, one test, one probe-data artifact, this document.

---

## 15. Reproduction

```bash
npx vitest run scripts/tests/gauge-fill-anchor.test.ts scripts/tests/gauge-fill-team.test.ts   # instrument gate, 18/18
npx tsx scripts/probe/gauge-magnitude.ts --out docs/probe-data/anis-star-solo-magnitude-2026-08-17.json
npx vitest run scripts/tests/probe/gauge-magnitude.test.ts                                      # replay pin, 19/19
```
