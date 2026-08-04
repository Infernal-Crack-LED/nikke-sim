# Lifetime cap — PRE-COMMITTED decision rule

> AI-facing. Written by the JUDGE session **deliberately BEFORE the measurement it specifies runs**.
> Its whole purpose is that the decision rule is fixed on disk before the numbers exist.
>
> Settles item 1 of [`2026-08-04-pellet-reader-JUDGE-handoff.md`](2026-08-04-pellet-reader-JUDGE-handoff.md),
> and folds in that handoff's item 3 as a REPORT-ONLY sub-deliverable (§6). That handoff's graveyard
> and traps, and those of its three predecessors, are **live and binding**.
>
> Method precedent: [`2026-08-04-representative-frame-PRECOMMIT.md`](2026-08-04-representative-frame-PRECOMMIT.md),
> which is 4-for-4 in this thread. Same shape, same discipline: anchor the rule to an already-recorded
> result, score categorically, forbid mean-ranking, enact nothing.
>
> **Slugs:** `marciana` (SG/Iron — `docs/probes/clean-weapons/marciana-solo.MP4`; **not**
> `marciana-marine-study`, AR/Iron), `noir`, `guilty`, `isabel`. All SG, `ammo: 9`, `hitsPerShot: 10`.

---

## 0. The question

`docs/probe-runs.md` §9B measures that **5 of 42 owner-labelled pellets are rejected by the lifetime
cap after being successfully detected** — `never_detected` is 0. §9G measures owner lifetimes at
**8–19** against a cap of **13** at 60 fps, and records the cap's provenance: "pellet markers last
~13 game-frames," which the measured distribution shows is roughly the **median** of the true
distribution, not its ceiling.

**Does admitting the 14–19 lifetime range recover those 5 pellets without admitting non-pellets?**

## 1. ⚑ THE CANDIDATE IS A DECOUPLED `band_hi`, NOT A RAISED `max_pellet_frames`

**This is the load-bearing design decision of this pre-commit, and it is not the change the handoff's
item 1 describes.** It must be read before §2.

`max_pellet_frames` is **not** a band-only knob. `count-pellets.py:514` uses it to build `pellet_ids`,
which gates **all four** channels in `_frame_pellet_counts` — `white`, `red`, `marker` and `band`.
And `debounce_shots:599` segments events on `totals = white + red` against `event_min = 3`
(`count-pellets.py:605`). Therefore raising `max_pellet_frames` itself would:

- change `white`, hence `totals`, hence **which frames clear `event_min`** — opening, extending or
  merging events;
- change **`totalShots` and every event onset**;
- change `marker`, hence `core_hit`, hence `shot_red`, hence `total` and `validShots`.

⚑ **That destroys the invariant the representative-frame landing was accepted on.** §12/§13 recorded
pooled MISSED as **58 / 7.0% UNCHANGED, "TRUE BY CONSTRUCTION"**, because `match_shots` keys on event
**onsets** (`detected_t0 = [s["start"] …]`) and a representative-frame change cannot move an onset.
**A `pellet_ids` change moves onsets.** The guarantee does not transfer, and the handoff's §7.1
blast-radius sketch ("widens the band, changes which events carry a band track, moves the 112-event
abstention population") **understates it by a whole subsystem.**

⇒ **The pre-committed candidate is a SEPARATE upper bound for the lifetime band only:**

```
band       = [ _band_lo(fps) , band_hi(fps) ]      # counted-pellet band  — MOVES
pellet_ids = { life <= max_pellet_frames(fps) }    # white/red/marker gate — UNCHANGED
```

Three independent reasons this is the right lever, not a hedge:

1. **It is the precise mechanism.** In the landed hybrid, the reported count on a banded event is the
   band count — `debounce_shots:646`, `white = band_totals[band_rep]`; `read-pellets.ts:441`. The
   number the cold bias is measured on is the **band** number. `band_hi` moves it directly.
2. **It preserves segmentation exactly**, so `totalShots`, onsets, `core_hit` and the MISSED rate are
   unchanged **by construction**, and the §12/§13 acceptance basis carries over intact.
3. **It is the only variant the committed data can measure at all.** The audit arm derives events
   from each dump's stored `frame_counts` (`_ps_events`, `_ps_score_dump`), which were computed at the
   original cap. A coupled candidate would need every dump re-extracted from video — owner time,
   2.1 GB of scratchpad, and a confound (§7.9's un-re-extracted 60 fps localization) riding along.

⚠ **The cost, stated up front:** this pass therefore **cannot** say what raising `max_pellet_frames`
would do. If a future pass wants the coupled change, it needs re-extraction and a fresh
segmentation-blast-radius measurement. **That question is deferred, not answered.**

## 2. The decision rule — do not adjust after seeing a result

### 2.1 IMPLEMENTATION CONSISTENCY CHECK — ⚑ CARRIES NO EVIDENTIAL WEIGHT

⚑ **REVISED AFTER THE PRE-OP GATE (§8, risk flag 1), before any number existed.** This check was
originally written as the PRIMARY criterion. **It is tautological and it cannot fail.** The corridor
`[19, 21]` is _derived from_ `owner_max = 19` and the statics at 22/36 — the very pinned summary the
check then re-reads. A candidate inside the corridor admits all 42 and excludes both statics **by
arithmetic**, so a PASS here confirms only that the arm reads the right population.

**It is retained as an implementation check and demoted out of the evidence chain. The proposal may
NOT cite it as evidence.** All evidential weight sits on §2.3 and §2.4, both out-of-sample.

_(Original criterion, unchanged in substance:)_ (in-sample, n = 42 owner pellets, ONE clip)

Scored off `scripts/tests/fixtures/pellets/representative-audit-slice.json`, whose
`_expected.lifetime_summary` pins the two populations **as already recorded** before this document:

| population           | n       | lifetimes                                                                             |
| -------------------- | ------- | ------------------------------------------------------------------------------------- |
| owner pellets        | **42**  | 8–19; histogram `{8:2, 9:1, 10:16, 11:11, 12:5, 13:2, 15:2, 16:1, 17:1, 19:1}`        |
| non-owner, in radius | **148** | 146 at life ≤ 7; the only two at or above the band are **22** and **36** (static HUD) |

A candidate `band_hi` **PASSES** iff, at that value:

1. **all 42** owner pellets fall inside `[band_lo, band_hi]` — i.e. the 5 currently cut (lives 15,
   15, 16, 17, 19) are recovered; **and**
2. **neither** static (life 22, life 36) is admitted.

Anything else **FAILS**. There is no partial credit and no per-shot fraction: the populations are
pinned, so this is a set-membership question with an unambiguous answer.

⚑ **This is a label-DERIVED threshold and this document says so plainly.** Unlike the four
representative-frame candidates, no `band_hi` in the corridor has a label-free motivation — the
corridor's own edges (19, 22) come from the labels. **That is exactly why §2.3 exists and is
mandatory**, and why a PASS here is _promotable to proposal only_, never landable on its own.

### 2.2 THE CANDIDATE SET — pre-committed

⚑ **CORRECTED AFTER THE PRE-OP GATE (§8, revision 1), before any number existed. The original text
of this section stated a rounding fact that is FALSE, and disqualified 19 on it.** The correction is
recorded here rather than silently overwritten, per §8 of the judge handoff ("if you have to do this,
say so in the artifact — do not let it read as clean").

The admissible corridor is `[19, 21]` at 60 fps: ≥ 19 to admit the longest owner pellet, ≤ 21 to
exclude the life-22 static. Scaling by the shipped formula `round(x × fps / 60)`:

| `band_hi` @60 | @30 fps, Python `round()`   | @30 fps, JS `Math.round()` | status                                        |
| ------------- | --------------------------- | -------------------------- | --------------------------------------------- |
| 13 (current)  | **6**                       | **7**                      | **CONTROL** — ⚑ already divergent, see below  |
| 19            | 10                          | 10                         | **lockstep-safe** — sensitivity arm           |
| **20**        | **10 (exact, no rounding)** | **10 (exact)**             | **PRIMARY CANDIDATE**                         |
| 21            | **10**                      | **11**                     | ⚠ **DESYNCS** — recorded only, NOT promotable |

**The rounding hazard is real; the original example was wrong.** Python's `round()` is banker's
(half-to-**even**) and JavaScript's `Math.round()` is half-up. These agree at `9.5 → 10` (10 is
even), so **19 is lockstep-safe and the original text's disqualification of it was incorrect.** They
diverge at `10.5`: Python **10**, JS **11** — so **only 21 desyncs.**

⚑ **And the hazard is not hypothetical — it has ALREADY fired in this pipeline.** The current cap at
30 fps is `round(13 × 30 / 60) = round(6.5)`, which is **6** in Python and **7** in JS. **The dumps
store 7**, which proves `read-pellets.ts:787` (JS) is what computed it and that a Python-side
recomputation of the same formula would silently disagree by one frame today. ⇒ §3.7 makes using the
**stored** per-dump value mandatory.

⇒ **Why 20 is the primary, stated honestly:** it is the only candidate that needs **no rounding at
all** at either supported fps, and it leaves **one frame of margin** above the longest observed owner
pellet (19) rather than sitting exactly on the sample maximum. **19 is equally lockstep-safe**, so
the choice between 19 and 20 is a margin judgment, **not forced by arithmetic** — the original
section claimed otherwise and was wrong. ⚑ Note 19 and 20 are **identical at 30 fps** (both → 10);
they can differ only on the single 60 fps dump.

**Pre-committed decision path if the primary fails (§8, revision 1):** if 20 fails §2.3 or §2.4 while
19 passes, that result is **RECORDED and escalated to the owner as a finding**. It is **NOT** a
silent swap to 19 — a candidate promoted because the pre-committed primary failed is fitted by
definition, and this document forbids it in the same breath as it forbids mean-ranking.

Further candidates may be added **only if written into this file, with their motivation, BEFORE they
are scored.**

### 2.3 SECONDARY — the ceiling check (OUT-OF-SAMPLE, label-free, MANDATORY)

Pooled over the same **852 events / 5 dumps / 4 units** §9G/§10D establish, score
`hybrid_plateau_median` — the landed rule — with the raised `band_hi`, and report raw pre-clamp
`above_ceiling_pct` (`total > hitsPerShot = 10`).

Widening a band can only **add** tracks, so this figure can only rise. Pinned anchors, both already
recorded before this document: landed hybrid **1.8%**, shipped median **6.2%**.

| pooled `above_ceiling_pct` | verdict                                                                                 |
| -------------------------- | --------------------------------------------------------------------------------------- |
| **≤ 6.2%**                 | **PASS** — the widened band over-counts no more often than the rule the hybrid replaced |
| **> 6.2%**                 | **REJECT** — it is admitting non-pellets out-of-sample, regardless of §2.1              |

⚑ Anchored to an already-recorded number (§8's method note), not to a threshold chosen after seeing
the result.

### 2.4 TERTIARY — the corridor-emptiness check (OUT-OF-SAMPLE, label-free, MANDATORY)

**The single most important out-of-sample question, and it is free.** §2.1's corridor is defined by
ONE recording's TWO non-owner tracks. Nothing yet guarantees other footage has no artifact living at
14–21 — different HUD states, other units' effects.

For **each** of the 5 dumps, from its own `radius_tracks`, report the lifetime histogram of all
in-radius white tracks and state, **fps-scaled per dump**:

- how many tracks fall in the corridor `(max_pellet_frames, band_hi]` — the population the raise
  newly admits, and which in-sample is exactly the 5 owner pellets and nothing else;
- whether a gap exists above that corridor at all, or whether the dump's lifetime distribution is
  continuous there.

⚑ **QUANTITATIVE THRESHOLD — pre-committed (§8, revision 5).** The original wording ("a large
population… the distribution is continuous") was a **post-hoc judgment call of exactly the shape this
document exists to eliminate**, and the gate was right to reject it. The decision rule is now a
number, fixed before any of it is computed:

**The metric is `corridor_admits_per_event`** = (tracks whose lifetime falls in
`(max_pellet_frames, band_hi]` and which the radius gate counts at least once during any event)
÷ (that dump's event count), computed **per dump, fps-scaled to that dump's own values**.

**The in-sample rate is `5 / 5 = 1.00` per event** — the 5 recovered owner pellets over the 5
labelled shots, and in-sample every corridor track is a real pellet.

| per-dump `corridor_admits_per_event` | that dump                                              |
| ------------------------------------ | ------------------------------------------------------ |
| **≤ 2.00** (2× the in-sample rate)   | **CONFIRMS** — admission is consistent with pellets    |
| **> 2.00**                           | **FAILS TO CONFIRM** — admitting an unknown population |

The 4 out-of-sample dumps are the ones other than the labelled clip (`groundtruth-f811-v4`,
`marciana` SG/Iron, 60 fps): **`h4-marciana`** — same unit, **different recording**, 30 fps — plus
**`h4-isabel`**, **`h4-guilty`**, **`g2-noir`**, which are different units as well. ⚑ Report
`h4-marciana` **separately** from the other three: it discriminates "specific to this recording"
from "specific to this unit", and those are different failure modes.

| out-of-sample dumps failing (of 4) | verdict                                                                                                         |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **0–1**                            | **CONFIRMS** — the in-sample separation generalizes                                                             |
| **≥ 2**                            | ⚑ **the gap is footage- or unit-specific** — REPORT; the proposal is DOWNGRADED to in-sample-only, not landable |

The **2×** multiplier is the thread's own precedent, taken verbatim from the representative-frame
pre-commit's §1.2 ("a rule above 12.4% (2× shipped) is over-counting by construction"), not a
number chosen for this pass. The per-dump lifetime histograms are still **reported in full** — but
as narrative, never as the decision.

This is a **different sample**, not merely a different observable — the distinction §3 of the judge
handoff insists on. It is the check that separates this hypothesis from the dead `center_exclude` one.

### 2.5 QUATERNARY — REPORTED, AND EXPLICITLY NOT A RANKING CRITERION

Pooled `avgTotal`, the per-shot recovery arithmetic, and the abstention count are reported for the
record only.

⛔ **Any `band_hi` selected, ranked or preferred because its `avgTotal` moved toward 8.40 — or toward
closing the ~1.08 cold bias — is DISQUALIFIED by this document.** §9A: 8.40 is an f8–11 **window**
count, not a per-shot landed total. The judge handoff's §7.6 is explicit and binds here: the cap loss
(~1.2/shot) **arithmetically matches** the deficit (~1.08), which is the exact seductive shape of the
refuted `center_exclude` hypothesis. **The acceptance criterion is categorical pellet recovery. It is
never bias closure, and no bias-CLOSED verdict may be stamped in this pass under any result.**

## 3. What makes the result INVALID — check these before reading any number

1. **THE CONTROL MUST REPRODUCE.** At `band_hi = max_pellet_frames` (today's value, i.e. no change),
   every figure must match the landed §12/§13 numbers **exactly**: categorical **5/5**, pooled
   `above_ceiling_pct` **1.8%** over **852**, `no_rep` **0**, banded/fallback **740 / 112**,
   `avgTotal` **6.1561**. **If it does not, the arm is wrong and every other row is void.**
2. **Monotonicity.** Band membership must be monotone non-decreasing in `band_hi` — a track admitted
   at 19 must be admitted at 20 and 21. Assert it in code; a violation means the band is being
   rebuilt wrong.
3. ⚑ **Use each dump's OWN fps and its OWN `max_pellet_frames`** (trap 4). Never hardcode 13, 7, 8 or 20. Three different live values exist.
4. ⚑ **Shot 4's radius gate runs on `cross_tmpl`** — its own `locate` field (trap 9, §10B). Inherited
   and must not regress; `_ps_score_labelled` already selects per shot.
5. ⚑ **`t0` is not the same physical event across shots** (trap 5). Define nothing relative to a fixed
   offset from `t0`.
6. **State n and scope on every claim.** 42 labelled owner pellets, ONE clip, ONE unit for §2.1; 852
   unlabelled events / 5 dumps / 4 units for §2.3 and §2.4.
7. ⚑ **USE THE STORED PER-DUMP `max_pellet_frames` — NEVER RECOMPUTE IT** (§8, revision 2). The
   audit already does this (`d["max_pellet_frames"]`, `block["params"]["max_pellet_frames"]`) and it
   must stay that way: recomputing `round(13 × 30/60)` in Python yields **6**, while the dumps store
   **7** (the JS half-up value). A recomputation would silently shift the control by one frame and
   void the validity gate. Assert the stored value equals 13 at 60 fps and 7 at 30 fps at load time.
8. ⚑ **THE NEW FLAG MUST BE STRICTLY ADDITIVE** (§8, revision 7). `_ps_band` has **six** callers
   besides its definition — `:4336` (labelled), `:4454` (`_ps_score_dump`), `:5190`/`:5252`
   (`--hybrid-landing-audit`), `:5382`/`:5416` (the band-equivalence / TS-lockstep arm). Add
   `band_hi=None` as an **optional third parameter defaulting to `max_pellet_frames`**, so all six
   existing call sites are behaviourally unchanged. **Every other `pellet-selftest.sh` arm must stay
   byte-identical** — the in-pass validity gate covers the new arm only, not the other twenty.
9. **Assert the two fidelity premises the gate raised (§8, revisions 3 and 4) rather than assuming
   them.** Both were verified by inspection when the gate raised them, and both HOLD:
   `_rep_slim_dump` skips `t["is_red"]` at fixture-build time, so `radius_tracks` is **white-only**
   (no colour term is needed in `_ps_band_totals`); and its runs come from `_rep_radius_runs`, which
   emits **in-radius frames only**. ⚑ The control arm cannot catch a regression in either — corridor
   tracks are invisible at `band_hi = max_pellet_frames` — so pin both as explicit assertions in the
   new selftest, where a future fixture regeneration would trip them.
10. **Assert `shot_red` is event-fixed** (§8, risk flag 3): the "`above_ceiling` can only rise"
    monotonicity claim rests on the core-hit flag being read from stored counts, not re-derived per
    candidate. One line in the selftest.

## 4. Evidence discipline — NOTHING HERE ENACTS

- `debounce_shots` stays **UNTOUCHED** in both implementations (`count-pellets.py:581`,
  `read-pellets.ts:355`). So do `count-pellets.py:514`/`:517` and `read-pellets.ts:787`.
- **No constant, guard, gate, threshold or default changes. No pre-existing fixture's `_expected`
  moves** — and unlike the representative-frame pass, this one predicts **zero** fixture movement,
  including `CACHE_SELFTEST_EXPECT`, because production behaviour is untouched. **A moved pin is a
  FAILURE of this pass, not a predicted outcome.**
- No `DECISIONS.md` entry is edited. No verdict is stamped outside `docs/probe-runs.md`.
- **A PASS produces a PROPOSAL, not a landing.** The landing is a separate owner-gated pass.
- Instrument goes in the tree at a named path: **extend `scripts/probe/analyze-pellet-tracks.py`**
  with a flag — do not write a standalone script (constraint 9) — pin a fixture, wire it into
  `scripts/probe/pellet-selftest.sh`.

## 5. The landing shape this pass is scoring — SKETCH, NON-BINDING

Recorded so the proposal has somewhere to land, explicitly **not** approved by this document.

⚑ **THE NAIVE LANDING EDIT IS A SILENT NO-OP, AND THE PROPOSAL MUST SAY SO (§8, revision 6).** In
production, `band_ids` is built **as a subset of `pellet_ids`** (`count-pellets.py:517`,
`{tid for tid in pellet_ids if …}`) and `_frame_pellet_counts` **skips any track not in `pellet_ids`
before the band check ever runs** (`:483`). So simply replacing `args.max_pellet_frames` with a
larger `band_hi` inside that comprehension **changes nothing** — a life-15 track is not in
`pellet_ids`, so it can never reach the band. The landing must:

1. build `band_ids` from **`tracks` directly**, not from `pellet_ids`;
2. **hoist the band count out of the `pellet_ids` skip** in `_frame_pellet_counts`, keeping the
   radius and non-red conditions;
3. `count-pellets.py` grows `--band-hi` **defaulting to `max_pellet_frames`**, so every existing
   dump, fixture and replay stays byte-identical; `read-pellets.ts:787` passes the value explicitly.
   Band logic stays in **one** implementation (Python), so the TS side is one CLI argument and the
   lockstep surface does not grow.

⚑ **The audit arm in THIS pass models step 1–2's post-restructure behaviour, not today's code.**
`_ps_band_totals` reads `radius_tracks` directly and never consults `pellet_ids`, which is why it can
measure the candidate at all — but that means **the audit is a faithful model of the RESTRUCTURED
production path, and of nothing that exists today.** State this in the proposal; it is the single
easiest thing for a landing session to get wrong.

⚑ **After the restructure, `band` is NO LONGER a subset of `white`** — a life-15 track counts in
`band` and not in `white`, so `band > white` becomes possible on a frame. **Enumerating every
consumer of that invariant is a PREREQUISITE of the landing pass**, not of this one. Known starting
points: the `_frame_pellet_counts` docstring ("a strict subset of `white`"), the `band`-key docs in
`read-pellets.ts:220`, and `--band-equivalence-audit`'s decomposition asserts.

⚑ The `.5`-rounding hazard of §2.2 goes live the moment a band bound is computed on **both** sides;
the default-to-`max_pellet_frames` shape avoids it by construction, and `band_hi = 20` needs no
rounding at either fps regardless.

**The landing pass's own success criterion (§8, risk flag 2), pre-stated so this pass is not
open-ended:** the landing is judged on (a) the categorical recovery of the 5 known-lost owner
pellets in the **production** path, (b) `totalShots` and every event onset provably unchanged across
all 5 dumps, and (c) the pooled MISSED rate unchanged. ⛔ **It is NOT judged on the cold bias
closing**, for the reason §2.5 gives. If the bias also closes, that is an observation for a separate
pass that must first settle whether the 8.40 reference is itself right (judge handoff §7.6).

## 6. Sub-deliverable — the 112 abstentions (judge handoff item 3), REPORT ONLY

From the same fixture, characterize the **112 fallback events** the landed hybrid abstains on
(13.1% of 852):

- their event frame-spans and shipped `white` totals;
- **why** no band track exists — all candidate tracks below `band_lo`, all above the cap, or none in
  radius at all — as a per-event categorical breakdown with counts;
- how many of the 112 become **banded** at each candidate `band_hi`.

⛔ **Report the breakdown. Do not theorize about what the 112 mean, do not propose a fix, and do not
let any finding here influence §2's verdict** — it is a separate open item with its own evidence bar.

## 7. Result

**2026-08-04. Full narrative: `docs/probe-runs.md` §14.**

All six §3 validity checks PASS, including the control reproduction (exact match to the landed
740/112/1.8%/6.1561/852/0 figures — asserted via `SystemExit`, not just reported).

- **§2.1 (in-sample, no evidential weight):** control FAILS (37/42, the pinned 5-pellet gap
  reproduced exactly); 19, 20 and 21 all PASS (42/42 recovered, neither static admitted).
- **§2.3 (out-of-sample ceiling, mandatory):** 19, 20 and 21 all **PASS** — pooled
  `above_ceiling_pct` 3.1% at each, well under the 6.2% reject line. 19 and 20 are numerically
  identical (`avgTotal` 6.6631); 21 differs by 0.0012 (one additional life-21 track on the 60 fps
  in-sample dump).
- **§2.4 (out-of-sample corridor, mandatory):** 19, 20 and 21 all **CONFIRM** on all 4 out-of-sample
  dumps (0 of 4 failing at any candidate) — `corridor_admits_per_event` ranges 0.64–0.84, well under
  the 2.00 ceiling. `h4-marciana` (same unit, different recording) reported separately per §2.4:
  0.77, no different in kind from the other three. 19, 20 and 21 are numerically IDENTICAL on every
  out-of-sample dump (all three fps-scale to `band_hi=10` at 30 fps under this instrument's own
  Python `round()` — §2.2's own table already predicted this tie) — they diverge only on the 60 fps
  in-sample dump, which §2.4 excludes.
- **§2.5 (reported only):** not used to rank; recorded in full in §14E.
- **§6 (report only):** the 112 CONTROL fallback events break down as 81 `in_band_no_concurrency`,
  18 `all_below_band_lo`, 9 `mixed_outside_band`, 3 `none_in_radius`, 1 `all_above_cap` — a
  refinement of the task's three-bucket framing into five mutually-exclusive categories once the
  data was inspected (§14F). 16 of the 112 become banded at each of 19/20/21. Did not influence any
  §2 verdict.

**Both mandatory out-of-sample gates (§2.3, §2.4) PASS for all three non-control candidates (19, 20,
21).** 21 passes the same measurements as 19 and 20 but is not lockstep-safe (§2.2: JS `Math.round`
diverges from Python's `round` at the `.5` boundary the 30 fps scaling hits) and was pre-committed
as "recorded only, NOT promotable" regardless of outcome. **19 and 20 are indistinguishable on every
out-of-sample dump measured here** (§2.2 already noted they are identical at 30 fps; this pass adds
that their out-of-sample ceiling and corridor figures also tie) and differ only marginally on the
60 fps in-sample dump, which carries no evidential weight (§2.1).

**Per §4: this is a PROPOSAL, not a landing.** Nothing in `debounce_shots`,
`count-pellets.py:514`/`:517`, or `read-pellets.ts:787` was touched. A landing pass is a separate,
owner-gated decision against the §5 sketch's own success criteria — not decided by this document.

## 8. PRE-OP GATE — `kimi-code/k3`, cross-family, `APPROVED-WITH-REVISIONS`

Packet + verdict: `scratchpad/gates/2026-08-04-lifetime-cap/{preop-packet.md,preop-result.json}`.
Driver is Claude, so the reviewer is Kimi per `/logic-gate`'s routing table — genuinely cross-family,
not a same-family fallback. **All 7 revisions are mandatory and were executed BEFORE any number
existed.** Recorded item-by-item so the post-op gate can check compliance:

| #   | Revision                                                   | Disposition                                                                                                                                                   |
| --- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | The rounding rationale disqualifying 19 is factually wrong | **UPHELD — verified, the gate is right.** `round(9.5)` is **10** in both languages. §2.2 rewritten, correction left visible, fallback path pre-committed      |
| 2   | Explain the live 30 fps cap discrepancy                    | **UPHELD — verified.** `round(6.5)` = 6 (Python) vs 7 (JS); dumps store **7** ⇒ JS computed it. Folded into §2.2 + new §3.7 (stored value mandatory)          |
| 3   | Colour-semantics gap in `_ps_band_totals`                  | **RESOLVED BY INSPECTION — premise HOLDS.** `_rep_slim_dump` skips `t["is_red"]`, so `radius_tracks` is white-only. Pinned as an assert (§3.9)                |
| 4   | Radius semantics of `radius_tracks` runs                   | **RESOLVED BY INSPECTION — premise HOLDS.** Runs come from `_rep_radius_runs`, in-radius frames only. Pinned as an assert (§3.9)                              |
| 5   | TERTIARY downgrade criterion is a post-hoc judgment call   | **UPHELD.** §2.4 now pre-commits a number: `corridor_admits_per_event` ≤ 2.00/dump, ≥ 2 of 4 dumps failing ⇒ downgrade                                        |
| 6   | The naive landing edit is a silent no-op                   | **UPHELD — the sharpest finding.** §5 rewritten with the required production restructure and the "the audit models the RESTRUCTURE, not today's code" warning |
| 7   | Enumerate `_ps_band` callers; keep the flag additive       | **UPHELD.** Six callers enumerated in §3.8; optional `band_hi=None` parameter mandated                                                                        |

**Risk flags, dispositions:**

- ⚑ **"PRIMARY is tautological and carries zero discriminative information"** — **UPHELD, and it is
  the most valuable thing the gate said.** §2.1 demoted from PRIMARY to an implementation
  consistency check that may not be cited as evidence.
- **"State the landing pass's own success criterion"** — folded into §5.
- **"Assert `shot_red` is event-fixed"** — folded into §3.10.
- **"852-pool representativeness is uncharacterized"** — ACCEPTED AS A LIMIT, recorded here rather
  than fixed: the pool is 5 dumps / 4 units, all SG `hitsPerShot: 10`. §2.4's per-dump reporting is
  what exposes non-representativeness; a stronger characterization needs footage this thread does
  not have.

**Assumption flagged and answered:** the JS-side reader is `read-pellets.ts:787`, which computes
`Math.max(4, Math.round((13 / 60) * fps))` and passes it to `count-pellets.py` as a CLI argument —
so today only the JS side ever rounds, which is exactly why the stored 30 fps cap is 7 and not 6.
