# Representative-frame policy — ENACTMENT PROPOSAL

> AI-facing. Written by the JUDGE session after the §10 measurement returned two candidates at 5/5.
> **This is a PROPOSAL. It changes no code.** It exists so the enactment pass has a plan with
> pre-committed acceptance criteria instead of improvising after a green selftest.
>
> Evidence: [`docs/probe-runs.md`](../probe-runs.md) §9 (the mechanism) and §10 (the policy score).
> Decision rule: [`2026-08-04-representative-frame-PRECOMMIT.md`](2026-08-04-representative-frame-PRECOMMIT.md).
> The graveyards and traps in the three `*-JUDGE-handoff.md` docs are **live and binding**.
>
> **Slugs:** `marciana` (SG/Iron — `docs/probes/clean-weapons/marciana-solo.MP4`; **not**
> `marciana-marine-study`, AR/Iron), `noir`, `guilty`, `isabel`. All SG, `ammo: 9`.

---

## 1. What is established, and what is not

**Established (§9, STRONG MECHANISTIC).** The event is two-phase — a 4–6 frame blast/flash (blobs live
1–3 frames) then the pellet cohort (a flat plateau of 8–10 frames). The shipped representative rule
samples the mixture and lands in the **pre-cohort flash on 3 of 5 labelled shots**. The discriminator
between the phases is **track lifetime**, not frame magnitude, and it replicates **without labels** on
852 events across 5 dumps and 4 units.

**Established (§10).** Two lifetime-gated rules land in the plateau on **5 of 5** labelled shots and
stay far under the over-count ceiling:

| rule                    | categorical | ceiling            | `avgTotal` |
| ----------------------- | ----------- | ------------------ | ---------- |
| `shipped_median`        | 2 / 5       | 6.2% (n = 852)     | 7.0669     |
| `lifetime_gated_median` | **5 / 5**   | 0.7% (n = **740**) | 6.2068     |
| `plateau_median`        | **5 / 5**   | 1.1% (n = **740**) | 6.2811     |

**NOT established, and this is the crux.** Neither rule is a droppable replacement, because both
**ABSTAIN on 112 / 852 events (13.1%)** — no track in the lifetime band is ever in radius during the
event, so there is no frame to report. §10E names this the top open risk and deliberately does not
resolve it.

## 2. ⚠ The forced design decision — an abstention has nowhere to go

`debounce_shots` **must emit one shot per event** (`{frame, white, red, total, frames, core}`). There
is no abstain path in either implementation. So a bare swap to either 5/5 rule has exactly two
possible behaviours, and one of them is disqualifying:

| behaviour on an empty band          | consequence                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Drop the event**                  | ⛔ **A new 13.1% missing-shot channel on top of the existing 7.0% pooled MISSED.** Disqualifying. ⚑ ESTIMATE, and the two rates sit on **different denominators** (112 of 852 detected _events_; 58 of 830 _ammo shots_), so "13.1% + 7.0%" is not an addition — the direction is certain, the magnitude is not. Measure it rather than quoting a combined figure. |
| **Fall back to the shipped median** | Event preserved; the rule changes only WHICH frame is picked, and only where a band exists.                                                                                                                                                                                                                                                                        |

⇒ **The proposal is the FALLBACK HYBRID, not either bare rule:** use the lifetime-gated
representative where the event has at least one band track in radius; otherwise fall back to the
shipped median-of-active frame, unchanged. This is strictly a superset of shipped behaviour — it can
only move events that have a band, and it leaves the other 13.1% exactly as they are today.

⚑ **The hybrid is NOT a pre-committed candidate.** §1.4 of the pre-commit permits recording a rule
invented after seeing results but **forbids promoting it in the same pass**. So this proposal
**cannot be landed on §10's numbers** — the hybrid must be scored on its own before it lands, on a
denominator of the full 852. §4 pre-commits those criteria now, before the numbers exist.

## 3. Which of the two rules

**§10 does not distinguish them** — both 5/5, both far under the ceiling bar, differing only in
`avgTotal` (6.2068 vs 6.2811) and ceiling (0.7% vs 1.1%). ⛔ Per pre-commit §1.3, **neither may be
chosen for having a mean nearer 8.40** — and §9A makes 8.40 an f8–11 window count anyway, not the
quantity a per-shot rule should match.

The honest tiebreak is **mechanical faithfulness, not fit**: `plateau_median` selects the midpoint of
the plateau, which is what §9C says the physical cohort IS; `lifetime_gated_median` selects a median
magnitude that happens to land in the plateau once the flash is gated out. On the labelled set
`plateau_median` sits deeper in the plateau on every shot (offsets 5/10/6/10/10 against 2/5/1/6/8).
**Recommendation: `plateau_median`, on the faithful>fit invariant.** The enactment pass should state
this choice and its reason rather than inherit it silently.

## 4. PRE-COMMITTED acceptance criteria for the enactment pass

Written before the hybrid is measured. Do not adjust after seeing a result.

1. **Categorical, on the 5 labelled shots: 5 / 5, with shot 4 on its own crop** (`locate` field) — the
   hybrid must not regress the result that motivated it.
2. **Ceiling, over the full 852:** `above_ceiling_pct` ≤ **12.4%** (2× shipped's 6.2%), and
   `n_scored` must be **852 with `no_rep` = 0** — that is the whole point of the fallback. If
   `no_rep` > 0, the hybrid is not what this document proposes.
3. **Missing-shot neutrality — the criterion this proposal exists for.** Pooled MISSED against the
   ammo arbiter must be **≤ shipped's 58 / 7.0%** on the same 8-series / 830-ammo-shot basis §8F
   used. **Any increase is disqualifying**, regardless of the categorical score.
4. **The falsification control must hold:** on events with no band track, the hybrid must be
   **bit-identical to shipped**. Assert it, do not assume it.
5. **Lockstep:** `count-pellets.py` and `read-pellets.ts` must agree event-for-event on all 8 dumps
   **after** the change — asserted on a **COMMON input** (feed both the same `frame_counts`).
   ✅ **RESOLVED 2026-08-04, §11 — this is no longer a blocker.** The `h4-marciana` 177-vs-176
   divergence is **not** a `debounce_shots` lockstep break: segmentation is identical (`totalShots`
   = 218 in both, all 218 events agreeing on span/frames/white), and the two implementations are
   byte-identical in logic including the strict `<`. The delta is **one event's `core` flag**,
   caused by a **marker-channel** defect upstream — `read-pellets.ts:599` ranks backends on
   `white + red` alone and carries `marker` as a passenger, so on ties `reduce` resolves to array
   order and discards opencv's hit-markers (82/82 divergent frames, unanimous). ⚑ The common-input
   requirement above exists **because** of that defect: assert lockstep on a shared `frame_counts`
   or the assertion measures the marker channel instead of the algorithm.
6. **Reported only, never a ranking criterion:** `avgTotal`, and any comparison to 8.40.

## 5. Blast radius

- **Two independent implementations must change in lockstep** — `scripts/probe/count-pellets.py:489`
  and `scripts/probe/read-pellets.ts:627` (the representative selection is inline at ~`:665`). They
  are **not** a shared module.
- **Fixtures regenerate.** §8F measured this empirically for a `debounce_shots` change:
  `missing-shots-slice.json`, `hand-count-slice.json`, `stale-counting-slice.json` fail and need
  regeneration; 5 pass unaffected. A representative-frame change has a **different** footprint from
  the segmentation change §8F measured — **re-measure it, do not assume these three**.
- ⚑ **Regenerate only together with the change, never to silence an ununderstood failure**
  (`CLAUDE.md` constraint 5). Every regenerated `_expected` must be explained by the change.
- **Compute:** re-segmentation is essentially free (downstream of cached `frame_counts`). A full
  rebuild through `read-pellets.ts` is ~430 s/video ≈ 30 min for 4 videos.
- **Not affected:** the ammo arbiter (it fixes the DENOMINATOR, not the numerator — §9H), and the sim
  engine, which this reader does not feed directly.

## 6. What this does NOT claim

- **It does not claim to close the cold bias.** The counter reads 0.8–1.6 pellets/10 cold against a
  ±0.25 budget; both 5/5 rules move pooled `avgTotal` **DOWN** (7.07 → 6.21 / 6.28), i.e. **colder**.
  The mechanism is right and the frame selection is wrong today, but **fixing the frame does not, on
  these numbers, warm the counter** — and any claim that it does needs its own measurement. Expect
  the enactment pass to have to explain this, not gloss it.
- It does not resolve WHY 13.1% of events carry no band track. That is a separate open question, and
  the fallback contains it rather than answering it.
- It is not a `/scientific-method` matter: this is reader tooling, not a damage-model value, so
  `verify.sh` + the existing fixtures are its gate (`CLAUDE.md` reuse clause).

## 7. Rollback

Single revert of the enactment commit plus the regenerated fixtures. The branch is unpushed and
`main` is deliberately held, so nothing leaves the machine on a revert. `/patch-notes` is owed before
anything on this branch reaches `main`.

## 8. Owner decision requested

1. **Land the hybrid, or hold?** — a bare swap is disqualified by §2; the hybrid still needs §4's
   numbers before it can land.
2. **`plateau_median` or `lifetime_gated_median`** as the gated rule (§3 recommends `plateau_median`).
3. **Resolve or quantify the `h4-marciana` 177-vs-176 divergence first?** (§4.5) — landing a lockstep
   change against a baseline already one event off is how a silent drift becomes permanent.
