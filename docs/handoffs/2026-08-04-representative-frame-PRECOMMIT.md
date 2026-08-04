# Representative-frame policy — PRE-COMMITTED decision rule

> AI-facing. Written by the JUDGE session **deliberately BEFORE the measurement it specifies runs**.
> Its whole purpose is that the decision rule is fixed on disk before the numbers exist.
>
> Settles item 1 of [`2026-08-03-pellet-reader-JUDGE-handoff.md`](2026-08-03-pellet-reader-JUDGE-handoff.md).
> That handoff's graveyard and traps, and those of its two predecessors, are **live and binding**.
>
> **Slugs:** `marciana` (SG/Iron — `docs/probes/clean-weapons/marciana-solo.MP4`; **not**
> `marciana-marine-study`, AR/Iron), `noir`, `guilty`, `isabel`. All SG, `ammo: 9`.

---

## 0. The question

`debounce_shots` copies each event's count from ONE representative frame — the active frame nearest
the median of the event's active totals — and sums nothing. `docs/probe-runs.md` §9C establishes at
**STRONG MECHANISTIC** tier that this frame lands in the **pre-cohort muzzle-flash phase on 3 of the
5 owner-labelled `marciana` (SG/Iron) shots**.

**Is there a representative rule that lands in the pellet cohort instead?**

## 1. The decision rule — do not adjust after seeing a result

### 1.1 PRIMARY — the categorical check

For each labelled shot, take the countable-owner-pellet series pinned in
`scripts/tests/fixtures/pellets/representative-audit-slice.json` at
`_expected.counted_owner_series` (shot 4 uses `_expected.counted_owner_series_relock` — trap 9: the
fixture's shot-4 residual is the documented structural mislock and its label file records
`locate: "template"`).

**PLATEAU, defined:** let `mx` = max of the series. The plateau is the **longest contiguous run of
frames with value ≥ `mx − 1`**, and it counts only if its length is **≥ 3**.

A rule **PASSES a shot** iff the frame it selects falls inside that run.

⚑ **This definition was validated against an already-recorded result before it was committed.** It
reproduces §9C's shipped verdict exactly — shipped median scores **2 / 5**, IN on shots 1 and 5, OUT
on 2, 3 and 4 — so it is anchored, not fitted.

| categorical score | verdict                                                            |
| ----------------- | ------------------------------------------------------------------ |
| **5 / 5**         | **PROMOTABLE TO PROPOSAL** (a proposal only — see §3)              |
| **3–4 / 5**       | **RECORD ONLY.** Partial improvement, not promotable in this pass. |
| **≤ 2 / 5**       | **REJECT** — no improvement on shipped.                            |

### 1.2 SECONDARY — the free ceiling check

`hitsPerShot` is **10** for `marciana` (SG/Iron), `isabel`, `guilty` and `noir` in
`data/characters.json`. Report each rule's **raw, pre-clamp** `above_ceiling_pct` over the pooled
**852** events. Pinned baselines: shipped median **6.2%**, p75 **24.3%**, max **59.2%**.

**A rule above 12.4% (2× shipped) is over-counting by construction → REJECT, regardless of its
categorical score.**

### 1.3 TERTIARY — REPORTED, AND EXPLICITLY NOT A RANKING CRITERION

Pooled `avgTotal` and the 5-shot mean are reported for the record only.

⛔ **Any rule selected, ranked or preferred because its mean sits near 8.40 is DISQUALIFIED by this
document.** Mean-matching is what promoted p75, and p75 is refuted (§9D: 89% of peak white is
unmatched to any owner pellet). Further, §9A: **8.40 is an f8–11 WINDOW count, not a per-shot landed
total** — it is not the quantity a per-shot rule should be matching in the first place.

### 1.4 Candidate enumeration — pre-committed

These four are **mandatory**. Each carries a label-free motivation, so none is reverse-engineered
from the labels.

| rule                    | definition                                                                                                                                                 | label-free motivation                                                                         |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `shipped_median`        | **control.** Active frame nearest the median of active totals.                                                                                             | the baseline; must reproduce (see §2)                                                         |
| `lifetime_gated_median` | Count only tracks whose lifetime is in the fps-scaled band, then median-of-active as shipped.                                                              | §9G — bimodal lifetimes replicate on 852 **unlabelled** events across 4 units                 |
| `plateau_median`        | After lifetime gating, select the **midpoint of the longest run of frames within ±1 of that run's modal total**, rather than the frame nearest the median. | §9C — the cohort holds a flat plateau 8–10 frames; the flash is 4–6 with 1–3 frame blob lives |
| `lifetime_band_count`   | Not a frame rule: count distinct tracks in the lifetime band per event. Exempt from §1.1; scored on §1.2 and on whether its count equals the plateau size. | §9G's own basis (mean per event 5.62–6.85)                                                    |

Further candidates may be added **only if written into this file, with a label-free motivation,
BEFORE they are scored.** A rule invented after seeing results may be recorded but **may not be
promoted in this pass**.

## 2. What makes the result INVALID — check these before reading any number

1. **The shipped-identity control must pass** — the arm's local span rebuild asserted event-for-event
   against `count-pellets.py`'s own `debounce_shots` on all 5 dumps.
2. **`shipped_median` must reproduce reads 6 / 8 / 9 / 4 / 8, `rep_offset` 2 / 2 / −3 / 3 / 7, and
   `above_ceiling_pct` 6.2%.** If it does not, the port is wrong and **every other row is void**.
3. ⚑ **`t0` is NOT the same physical event across shots** — `find_t0` takes whichever of the blast's
   TWO onsets is nearer, so it is the **flash** onset on shots 2/4/5 and the **cohort** onset on 1/3.
   A candidate must be defined relative to **the event's own frames**, never to a fixed offset from
   `t0`. Two "f9" frames are not the same thing.
4. ⚑ **`max_pellet_frames` is fps-scaled** — `read-pellets.ts:505` sets `max(4, round((13/60) × fps))`,
   so **13 at 60 fps, 7 at 30 fps**, and `count-pellets.py`'s standalone default is a third value, 8.
   Use each dump's own value; do not hardcode. The lifetime band scales with it ([8,13] at 60 fps,
   [4,7] at 30).
5. **n and scope.** 5 labelled shots on one clip, one unit, for the categorical half; 852 unlabelled
   events across 5 dumps and 4 units for the ceiling half. State both.

## 3. Evidence discipline — NOTHING HERE ENACTS

- `debounce_shots` stays **UNTOUCHED in both implementations** — `count-pellets.py:489` and
  `read-pellets.ts:627`. Every candidate is a local scoring variant inside the audit arm.
- No constant, guard, gate, threshold or default changes. No `DECISIONS.md` entry is edited. No
  verdict is stamped outside `docs/probe-runs.md`.
- **A 5/5 result produces a PROPOSAL, not a landing.** Enacting a representative-frame change carries
  the same blast radius as the merge fix — fixtures regenerate, and `read-pellets.ts:627` is a second
  independent implementation that must move in lockstep (and may **already** be one event apart on
  `h4-marciana`: `validShots` 177 vs shipped 176). That is a separate owner-gated pass.
- Instrument goes in the tree at a named path: **extend
  `scripts/probe/analyze-pellet-tracks.py`** with a flag — do not write a standalone script — pin a
  fixture, and wire it into `scripts/probe/pellet-selftest.sh`.

## 4. Result

Full measurement: `docs/probe-runs.md` §10. Instrument:
`scripts/probe/analyze-pellet-tracks.py --policy-score` (selftest `--policy-score-selftest` against
`scripts/tests/fixtures/pellets/policy-score-slice.json`, wired into `scripts/probe/pellet-selftest.sh`).

**All three §2 validity checks PASS** — the shipped-identity control, `shipped_median`'s exact
reproduction of reads 6/8/9/4/8 / `rep_offset` 2/2/−3/3/7 / `above_ceiling_pct` 6.2%, and the plateau
implementation's exact reproduction of shipped = 2/5 (IN on 1 and 5, OUT on 2/3/4).

⚑ **A first pass scored 4/5 on both non-control frame rules, and was wrong.** It built shot 4's
radius gate (feeding `lifetime_gated_median`/`plateau_median`/`lifetime_band_count`) from the SHIPPED
STRUCTURAL crosshair, then checked the result against shot 4's RELOCK plateau — two different crops
(trap 9). §1.1 above says shot 4's ground truth is the relock series but does not say which crop the
radius gate runs on; that gap is resolved in `docs/probe-runs.md` §10B, not here, and §1–§3 above are
unedited. The resolution — score shot 4's radius gate on `cross_tmpl`, matching the crop its own
`locate` field already names, everything else unchanged — is verified, not asserted, by two hard
controls run at scoring time: (1) `shipped_median` must stay `rep_offset` 3, OUT on shot 4 (it reads
raw crosshair-independent totals, so if the crop swap moved it too the fix would be leaking into the
control) — **held**; (2) both band rules must report `total` = 7 on shot 4, matching §9B's
independently-recorded "template lock: 0 radius-rejected, 7 countable" — **held**. Full narrative:
`docs/probe-runs.md` §10B.

| rule                    | §1.1 categorical       | §1.2 ceiling (852 events)  | verdict                                          |
| ----------------------- | ---------------------- | -------------------------- | ------------------------------------------------ |
| `shipped_median`        | 2/5 (control)          | 6.2%                       | reproduces §9C; not a candidate                  |
| `lifetime_gated_median` | **5/5** (IN 1,2,3,4,5) | 0.7% (over n_scored = 740) | **PROMOTABLE TO PROPOSAL**                       |
| `plateau_median`        | **5/5** (IN 1,2,3,4,5) | 1.1% (over n_scored = 740) | **PROMOTABLE TO PROPOSAL**                       |
| `lifetime_band_count`   | exempt (§1.4)          | 5.5%                       | undercounts the plateau's own size on every shot |

**Both `lifetime_gated_median` and `plateau_median` reach 5/5 and are PROMOTABLE TO PROPOSAL** — a
proposal only (§3 above; nothing here enacts).

Tertiary (§1.3, reported only): `avgTotal` 7.0669 / 6.2068 / 6.2811 / 6.4425 for the four rules in
table order — none near 8.40, and per §1.3 that would not matter if one were.

⚑ **Abstention risk — top open item for any enactment pass, not resolved here.** 112 of the 852
pooled events (13.1%) have no track at all whose lifetime falls in the band and is ever in radius
during the event; `lifetime_gated_median` and `plateau_median` abstain on those rather than reporting
0, so their `above_ceiling_pct` above is computed over `n_scored` = 740, NOT the 852 `shipped_median`
uses. An abstention cannot over-count, so excluding it is defensible for the ceiling question
specifically — but a rule that silently drops 13.1% of events is a candidate NEW missing-shot channel
this pass does not measure, explain, or resolve. Full narrative: `docs/probe-runs.md` §10E.

**Nothing here enacted anything**: `debounce_shots` is untouched in both implementations, no
constant/guard/gate/threshold changed, no `DECISIONS.md` entry edited. No pre-existing fixture's
`_expected` moved.
