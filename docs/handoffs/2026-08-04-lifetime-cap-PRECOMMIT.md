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

### 2.1 PRIMARY — the categorical check (in-sample, n = 42 owner pellets, ONE clip)

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

### 2.2 ⚑ THE CANDIDATE SET — pre-committed, and the primary is forced by ARITHMETIC, not by fit

The admissible corridor is `[19, 21]` at 60 fps: ≥ 19 to admit the longest owner pellet, ≤ 21 to
exclude the life-22 static. Scaling by the shipped formula `round(x × fps / 60)` gives:

| `band_hi` @60 | @30 fps  | status                                              |
| ------------- | -------- | --------------------------------------------------- |
| 13 (current)  | 7        | **CONTROL** — must reproduce §12/§13 exactly (§3.1) |
| 19            | **9.5**  | sensitivity arm — ⚠ **.5 boundary**, see below      |
| **20**        | **10.0** | **PRIMARY CANDIDATE**                               |
| 21            | **10.5** | sensitivity arm — ⚠ **.5 boundary**, see below      |

⚑ **Why 20 and not 19 or 21 — a NEW trap, and it is the tiebreaker.** The two implementations round
half-integers **differently**: Python's `round()` is banker's (`round(10.5) == 10`), JavaScript's
`Math.round()` is half-up (`Math.round(10.5) === 11`). `read-pellets.ts:787` computes the cap in JS
and passes it to Python as a CLI argument, so today only one of them ever rounds — but the moment a
band bound is computed on **both** sides, any value landing on a `.5` boundary at any supported fps
makes the two readers **silently disagree by one frame**. Of the three admissible values, **only 20
scales to a whole number at both 30 and 60 fps.**

⇒ **The primary candidate is selected by a lockstep-safety property that is independent of the
labels.** 19 and 21 are scored anyway, as sensitivity arms, to show the verdict does not hinge on
which value in the corridor is picked. **They are RECORDED ONLY and are not promotable in this pass**,
both because of the rounding hazard and because promoting the corridor's edge would be fitting to it.

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

| result                                                                    | verdict                                                                                                                 |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| the corridor admits few tracks per event and a gap persists above it      | **CONFIRMS** — the in-sample separation generalizes                                                                     |
| the corridor admits a large population, or the distribution is continuous | ⚑ **the in-sample gap is `marciana`-specific** — REPORT, and the proposal is DOWNGRADED to in-sample-only, not landable |

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

Recorded so the proposal has somewhere to land, explicitly **not** approved by this document:
`count-pellets.py` grows `--band-hi`, **defaulting to `max_pellet_frames`** so every existing dump,
fixture and replay is byte-identical; `read-pellets.ts:787` passes the new value explicitly. The band
logic stays in one implementation (Python), so the TS side is one CLI argument and the lockstep
surface does not grow. ⚑ The `.5`-rounding hazard of §2.2 becomes live the moment any band bound is
computed on both sides — the default-to-`max_pellet_frames` shape avoids it by construction.

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

_(Written only after the measurement runs. Full narrative: `docs/probe-runs.md` §14.)_
