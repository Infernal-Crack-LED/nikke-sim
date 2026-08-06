# Production mislock rate — PRE-COMMITTED decision rule

> **CLOSED (2026-08-05) — EXECUTED.** the 16.9% production mislock rate; the record is `docs/probe-runs.md` §20.
> ⚑ **Deliberately still TRACKED, not archived**: `docs/probe-runs.md` is CHANGELOG-class and cites
> this file by path as the plan-of-record (blast radius, gate verdict). Moving it to the gitignored
> `closed/` would dangle that citation. Nothing here is live work — open items are in `QUEUE.md`.

> AI-facing. Written **before the production measurement runs**; the calibration in §2 is already
> recorded and is what the rule is anchored to. Settles item 3 of
> [`2026-08-04-lifetime-cap-JUDGE-handoff.md`](2026-08-04-lifetime-cap-JUDGE-handoff.md).
> The graveyards and traps of the six prior handoffs remain binding.
>
> **Slugs:** `marciana` (SG/Iron — `docs/probes/clean-weapons/marciana-solo.MP4`; **not**
> `marciana-marine-study`, AR/Iron), `noir`, `guilty`, `isabel`.

---

## 1. The question

`docs/probe-runs.md` §19 leaves the **entire** residual per-shot error on the labelled clip with two
causes, both localization: shot 4's structural mislock (−5) and shot 1 (−2). §9B: 7 of the 13
discarded owner pellets were the shot-4 mislock — more than the lifetime cap's 5.

**What fraction of PRODUCTION shots are mislocked?** Unquantified since 08-01.

## 2. The detector, and its CALIBRATION on known cases (already measured)

No ground truth exists on production footage, so the detector is **structural-vs-template
disagreement** at the counting frames `t0+8…t0+11`. Calibrated on the labelled clip, where the truth
is known for all 5 shots (§9B: shot 4's crops record `locate: "template"`, and under structural 7 of
its owner pellets are radius-rejected — structural is WRONG there; structural is right on the rest):

| shot | median disagreement | known truth                           |
| ---- | ------------------- | ------------------------------------- |
| 1    | **2 px**            | structural correct                    |
| 2    | **34 px**           | structural correct                    |
| 3    | **0 px**            | structural correct                    |
| 4    | **348 px**          | **structural WRONG** (template right) |
| 5    | **34 px**           | structural correct                    |

⇒ **An order-of-magnitude gap: known-good 0–34 px, known-mislock 348 px.**

## 3. The decision rule — fixed before the production numbers exist

**A shot is MISLOCKED iff its median structural-vs-template displacement over `t0+8…t0+11` exceeds
`pellet_radius` = 160 px.**

The threshold is **physically motivated, not fitted**: at 160 px the two counting windows barely
overlap, so at least one is windowing a different region of the frame. It also sits in the middle of
the calibration gap (4.7× the worst known-good, 0.46× the known mislock), so no plausible
re-derivation of either endpoint flips a verdict.

| production mislock rate | reading                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------- |
| **< 2%**                | mislocks are RARE — the shot-4 case is unrepresentative and item 3 closes as minor    |
| **2–10%**               | RECORD the rate; a real channel, comparable to the lifetime cap's, worth its own pass |
| **> 10%**               | ⚑ mislocks are the DOMINANT undercount channel and outrank every other open item      |

⛔ Reported only, never a ranking criterion: any per-shot count deltas. **This pass measures a RATE.
It does not re-tune the localizer, change a guard, or stamp a verdict on the cold bias.**

## 4. What makes the result INVALID

1. ⚑ **Template mode must actually lock.** `run21`/`run21b` locked 0% in template mode
   (`docs/probe-runs.md` §17). **Any dump where template locks < 90% of counting frames is
   EXCLUDED and reported as excluded** — disagreement is meaningless when one arm is absent, and
   including it would silently inflate the rate.
2. **Disagreement identifies that ONE mode is wrong, never WHICH.** The rate is an upper bound on
   structural mislocks. Do not describe it as "structural was wrong on N% of shots".
3. ⚑ **It cannot see BOTH-wrong cases.** Shot 1 carries a documented 78 px mislock (08-01 centering
   entry) yet shows **2 px** disagreement — the two modes agree and are both off. **This detector
   would score shot 1 as clean.** The measured rate is therefore a FLOOR on total localization
   error as well as an upper bound on structural-specific error, and both statements must ride with
   any number.
4. Use each dump's own `pellet_radius` and shot segmentation; never hardcode.
5. State n and scope: shots per dump, dumps, units.

## 5. Evidence discipline

Nothing here enacts. No constant, guard (including the 150 px jump guard), threshold or default
changes; `debounce_shots` and both readers are untouched; no `DECISIONS.md` entry is edited. The
instrument extends an existing committed script and carries a pinned fixture (constraint 9).

## 6. Result

**2026-08-04 — MEASURED. Full narrative: `docs/probe-runs.md` §20.**

**Pooled production mislock rate: 16.9%** (137 of 811 shots, 4 dumps, 4 units). All four dumps
cleared §4.1's 90% template-lock gate (98.3 / 100 / 100 / 99.5%), so none was excluded.
⇒ **§3 band: > 10% — mislocks are the DOMINANT undercount channel and outrank every other open
item.** That band was pre-committed here before any production number existed.

Three independent checks (§20C): the detector flags the known shot-4 mislock (316 px) and **none**
of the four known-good labelled shots; the 160 px threshold falls inside a real empty band in the
distribution (nothing between 127 and 242 px), so no re-derivation moves a shot across it; and the
rate reproduces on independent footage — 6/37 = 16.2% on the labelled clip, 1/5 = 20% on §9B's
labelled set. **The shot-4 mislock was never unrepresentative; it is typical.**

⚑ §4's three limits all bind and are restated in §20E: this is an **upper bound** on
structural-specific mislocks (disagreement never says which mode is wrong), a **floor** on total
localization error (both-wrong cases are invisible — shot 1's documented 78 px mislock is not
flagged), and the production figures are **not pinned in a fixture** (scratchpad only; the committed
slice carries the labelled clip's 37 shots).

⚑ §20F records a reuse-before-derive miss: the calibration arm was re-derived although the committed
`representative-audit-slice.json` already carries `cross_tmpl`. Classification is identical either
way, so no verdict depends on it.

⛔ Per §3, nothing was enacted: no localizer re-tune, no guard change, no cold-bias verdict.
