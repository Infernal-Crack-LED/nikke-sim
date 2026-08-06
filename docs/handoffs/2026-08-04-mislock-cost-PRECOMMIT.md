# Mislock COST — PRE-COMMITTED decision rule

> **CLOSED (2026-08-05) — EXECUTED.** the VOIDed cost pass, then the owner adjudication; the record is `docs/probe-runs.md` §21/§22.
> ⚑ **Deliberately still TRACKED, not archived**: `docs/probe-runs.md` is CHANGELOG-class and cites
> this file by path as the plan-of-record (blast radius, gate verdict). Moving it to the gitignored
> `closed/` would dangle that citation. Nothing here is live work — open items are in `QUEUE.md`.

> AI-facing. Written **before the measurement runs**. Follows
> [`2026-08-04-mislock-rate-PRECOMMIT.md`](2026-08-04-mislock-rate-PRECOMMIT.md), which measured the
> RATE (16.9%, `docs/probe-runs.md` §20) but explicitly left the COST derived-not-measured.
> Graveyards and traps of the seven prior handoffs remain binding.
>
> ⚑ `Δcount` is an ARITHMETIC QUANTITY, deliberately not written "delta" — `delta` (SR/Wind) and
> `delta-ninja-thief` (MG/Water) are unit slugs in this repo.
>
> **Slugs:** `marciana` (SG/Iron — `docs/probes/clean-weapons/marciana-solo.MP4`; **not**
> `marciana-marine-study`, AR/Iron), `noir`, `guilty`, `isabel`.

---

## 1. The question, and why it needs its own pass

§20D sized the channel at ≈ **0.85 pellets/shot** — `16.9% × shot 4's −5 severity`. That figure has
**n = 1 for the severity term** and carries the exact arithmetic shape of the refuted
`center_exclude` hypothesis. §20D says so and forbids acting on it.

**What does a mislocked shot actually cost, across many mislocked shots?**

## 2. The method — a LOCK A/B, no ground truth required

For every shot in the 4 production dumps, hold **one track set fixed** (the structural dump's own
detections — what production actually saw) and vary **only** `cross_positions`:

- `total_struct` — counted against the **structural** lock (what production reports);
- `total_tmpl` — counted against the **template** lock on the same frames and tracks;
- **`Δcount = total_tmpl − total_struct`.**

Everything downstream (`pellet_ids`, `band_ids`, the radius gate, `debounce_shots`) is the shipped
production code, run twice.

⚑ **Why this needs no owner labels:** the question is how much the _counting window's position_
changes the count. That is a difference between two windows over identical tracks, and both windows
are already measured.

## 3. The decision rule — fixed before the numbers exist

### 3.1 MANDATORY falsification control

On **NOT-mislocked** shots (median disagreement ≤ 160 px, §20's rule) the two locks should count
almost the same thing.

**If `mean |Δcount|` on not-mislocked shots is ≥ 0.5 pellets, the A/B is confounded and THE WHOLE
RESULT IS VOID** — it would mean Δcount tracks something other than the mislock.

### 3.2 The severity figure

`severity` = **mean `Δcount` over MISLOCKED shots**. Report the full distribution (median, p10, p90,
sign split), not just the mean.

`cost` = `mislock_rate × severity` = the channel's contribution in pellets/shot.

| `cost` (pellets/shot) | reading                                                                                                                          |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **≥ 0.50**            | mislocks are a **first-order** channel — fixing localization is the top engineering item                                         |
| **0.20 – 0.50**       | real but **secondary**; record and rank against the other open channels                                                          |
| **< 0.20**            | ⚑ **the rate is high but the cost is LOW** — mislocks mostly happen where they don't matter, and §20D's 0.85 estimate is REFUTED |

### 3.3 ⚑ The SIGN is a diagnostic, and it is pre-committed as one

§20's detector says one mode is wrong but never which. The Δcount sign split settles it statistically:

- **Δcount mostly POSITIVE** ⇒ template counts more, so **structural is usually the wrong lock** and
  production is losing pellets. The cost above is real.
- **Δcount mostly NEGATIVE** ⇒ **template is usually the wrong one**; production is fine and the
  16.9% rate overstates structural's problem.
- **Δcount symmetric about 0** ⇒ ⚑ **neither lock is reliably better and the "mislock" population is
  not a coherent failure mode.** Report that; do not average a symmetric distribution into a "cost".

## 4. What makes the result INVALID

1. §3.1's control fails.
2. ⚑ **`center_exclude` is CROSSHAIR-RELATIVE** (`count-pellets.py:97`), so the fixed track set was
   detected under the _structural_ lock — a component suppressed by structural's 36 px exclusion
   zone is absent from both arms. This biases **against** finding template-side pellets near its
   own centre. It is second-order (36 px vs a 160 px window and 300 px+ mislocks) but it is a
   **known one-sided bias** and must be stated with the number, not discovered later.
3. **Only shots where BOTH locks exist on ≥ 3 of the 4 counting frames are scored**; others are
   reported as unscored, never silently dropped.
4. Use each dump's own `pellet_radius`, `max_pellet_frames`, `band_hi` default and fps.
5. State n and scope: mislocked / not-mislocked shot counts, dumps, units.

## 5. Evidence discipline

⛔ Nothing here enacts. No constant, guard, threshold or default changes; `debounce_shots` and both
readers are untouched; no `DECISIONS.md` entry is edited; **no cold-bias verdict is stamped whatever
the cost turns out to be.** A result ≥ 0.50 produces a PROPOSAL for a separate owner-gated pass, not
a localizer change.

## 6. Result

**2026-08-04 — ⛔ VOID. §3.1's falsification control FAILED. Full narrative: `docs/probe-runs.md` §21.**

`mean |Δcount|` on NOT-mislocked shots is **0.706**, against this document's own void bar of 0.50
(n = 806 shots: 137 mislocked, 669 not). Counting is sensitive to lock differences far below the
160 px threshold, so `Δcount` measures sensitivity to _any_ lock difference rather than the cost of
a mislock. **No cost, severity or sign figure from this pass may be quoted.**

⚑ §4.2's pre-registered one-sided bias appears to have materialized: `mean Δcount` on not-mislocked
shots is **−0.170**, template counting systematically less, in exactly the predicted direction.

⇒ **Severity is NOT derivable from the two locks alone**, which is itself the useful finding: it
establishes that measuring the mislock cost requires **ground truth on mislocked production shots**.
§20's 16.9% rate is untouched — it does not depend on this pass. §20D's 0.85 pellets/shot estimate
remains **unverified, neither confirmed nor refuted**.
