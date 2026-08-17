# `liberalio` gauge-credit audit — 2026-08-17

**Status: AUDIT COMPLETE. Defect IDENTIFIED and localized; the fix is SIZED but deliberately NOT
SHIPPED** — two measured observables disagree about its magnitude (below). Nothing in the damage model
changed. Queue item: the burst-generation thread's "dominant open item, and FOOTAGE-FREE", named by
both judges of the 2026-08-17 third-arm run.

Instruments (both committed with this doc):

- **`scripts/census-gauge-subhits.ts`** — the multi-hit/`gaugeHits` census (`--all`, `--rl3`,
  `--skipped`, `--json`).
- **`scripts/battery/liberalio-gaugehits-ab.ts`** — the sizing arm. Patches the override at runtime,
  never on disk (the `nbo` swap-cadence precedent, QUEUE.md item 5).

## Verdict

Her burst-gauge **datamine row is exactly right**. The defect is that her kit's **5 rider sub-hits are
credited as 1 gauge impact**. Sizing the fix improves Full-Burst counts on her comps but drives
refill-from-zero _below_ the measured refill on the same footage — so the credit's existence is
well-evidenced while its magnitude is not settled.

## What came back clean

The queue's hypothesis was a per-unit datamine defect (her row was once 6× off — `c12fcf4e`, the
correction that created this thread). **Refuted at the row level.** Her `data/gauge-per-shot.json` row
reproduces her primary datamine field-for-field (`data/characters.json` → `role.weapon.shot_detail`):

| row field          | value | datamine field                | raw   |
| ------------------ | ----- | ----------------------------- | ----- |
| `basePerTrigger`   | 280   | `burst_energy_pershot`        | 28000 |
| `targetPerTrigger` | 560   | `target_burst_energy_pershot` | 56000 |
| `fullChargeBonus`  | 250   | `full_charge_burst_energy`    | 25000 |

`hitsPerShot` 1 and `chargeMultiplier` 250 also check out. The 2026-07-26 correction was correct.

## The defect — the ×6 was real, but it is not the weapon

Her kit (`skill1`, verbatim): _"Activates when landing a Full Charge attack. Affects the target. Deals
40.5% of final ATK as additional damage. **Activates 5 times.**"_

The override models this the aggregated way — one `flatDamage` of `202.5` (= 40.5 × 5), the
owner-confirmed reading, damage-validated against a real scope-lock run. But the engine credits burst
gauge **per damage instance**, so an aggregated multi-hit must declare its hit count separately. That
field exists — `flatDamage.gaugeHits` (`src/skills/types.ts`; the `case 'flatDamage'` loop in
`src/engine/sim.ts` fires `skillGauge()` N times) — and her override does not set it. The engine
comment states the contract: _"Sequential volleys generate gauge per sub-hit in-game, but the engine
keeps one aggregated damage instance to preserve tuned totals. gaugeHits = N fires skillGauge N times;
omit = 1."_

So she is credited **1** impact per full charge where the kit delivers **6** (1 bullet + 5 rider hits).
`skillGauge` credits `targetPerTrigger` with no focus bonus (measured on `maiden-ice-rose`'s rider at
exactly 364), so the uncredited amount is `4 × 5.6 = 22.4%` of the bar **per full charge**, every ~1.5s.

**This relocates the ×6 rather than resurrecting it.** The 2026-07-26 commit deleted a `×6` attributed
to the WEAPON (refuted: `hitsPerShot` = 1) without relocating it to the rider the kit puts it on. The
proposed credit is also far more conservative than the deleted row: that `×6` multiplied her per-shot
value _including_ the ×2.5 focus multiplier (focused ≈ 84%/shot), where `gaugeHits` adds 5 flat
un-focused credits (focused ≈ 42%/shot total).

## Independent confirmation of the COUNT — `rl3`, exact

`rl3` is the synergy API's gauge-in-the-first-~3s-of-an-arena-opener figure at **base (non-boss),
unfocused** values (`docs/data/burst-gauge.md` §7) — independent of our datamine. Dividing by her base
per-trigger value yields her generating **impact count**:

```
33.6 / 2.8 = 12.00 impacts per 3s
her charge cycle is 90f = 1.5s  ⇒  exactly 2 triggers in 3s
12 / 2 = 6.00 impacts per trigger = 1 bullet + 5 rider sub-hits   ← kit-literal, exact
```

Integral and exact to the digit. **She is the only unit in the census whose multi-hit line is
per-shot-triggered, so she is the only one `rl3` can corroborate at all** (the others are burst-slot
volleys firing once per cast, outside a 3s opener). This is strong evidence for the COUNT — it says
nothing about whether each sub-hit credits the full target value.

## Sizing, and the counter-signal that stopped the landing

`liberalio` sits in **exactly the four comps disabled for the FB shortfall, and in no others** — the
two sets coincide perfectly (`scripts/regression.ts`: 4 × `disabled: true`, each commented "open
burst-generation shortfall"). That perfect confounding is why a per-unit defect in her model was the
natural suspect.

**Arm 1 — Full-Burst counts IMPROVE** (`scripts/battery/liberalio-gaugehits-ab.ts`, deterministic; MC
n=25 from `ONLY=iron npx tsx scripts/experiment.ts` in brackets). Nothing overshoots its measured count:

| comp                      | measured FB | base               | `gaugeHits: 5`         |
| ------------------------- | ----------- | ------------------ | ---------------------- |
| PG iron sweep             | 13–14       | 11 [11×100%]       | **12** [12×100%]       |
| T1 wind-weak              | 13          | 11 [11×60% 12×40%] | **12** [12×60% 13×40%] |
| T5 wind-weak probe        | 13          | 12 [12×100%]       | 12 [12×88% 13×12%]     |
| N3 scarlet/liberalio iron | 10          | 9 [9×100%]         | 9 [9×88% 10×12%]       |

Comps without her (T8 iron-weak, PA MiKa) are **unchanged** — no collateral. Her own ratio warms
0.863 → 0.906 (T1) and 0.864 → 0.895 (T5); `takina`'s worst-in-board 0.552 warms to 0.669. Two
readings move the wrong way: `liberalio` 1.030 → 1.065 HOT (PG) and `scarlet-black-shadow`
1.000 → 1.076 HOT (N3).

**Arm 2 — refill-from-zero goes WRONG, against measured footage.** Under the arm,
`scripts/tests/gauge-cycle-decomp.test.ts` goes red on all four comps, and it is anchored to measured
refill times:

| comp               | measured refill  | under the arm                                              |
| ------------------ | ---------------- | ---------------------------------------------------------- |
| PG iron sweep      | 4.43s            | **2.61s**                                                  |
| T5/T1 wind-weak    | 3.56 / 3.71s     | **2.90s**                                                  |
| N3                 | band > 3s        | **2.17s**                                                  |
| PI2 (no liberalio) | negative control | inverts — it should be the FASTEST refill and is no longer |

17 battery assertions across `credit-schedule`, `focus-columns`, `gauge-source-census`,
`multihit-crediting`, `refill-starvation` and `gauge-cycle-decomp` go red under the arm. Several are
measured-truth anchors, which **may never be updated without a new measurement** (CLAUDE.md
constraint 5) — so they are a genuine stop, not snapshot noise.

**Reading of the conflict.** The bar fills too fast _and_ still produces too few Full Bursts. That is
the compensating-errors shape: a real credit can be the wrong magnitude if something else in these
comps over-generates and was cancelling it, or if a sub-hit credits less than the full target value.
Note the thread's own standing caveat — every detection here is **estimator-conditional**, and the
third-arm follow-up (i) is precisely that a control must pin _how_ its quantity is measured. The
refill estimator should be pinned before this is adjudicated.

Gates with the arm OFF (shipped state): `bash scripts/verify.sh` green; her spec 32/32 green,
including the new **L3b** group that pins the shipped 1-impact credit and the arm's exact 4 ×
pulls × 5.6 delta.

## Scope — a small batch, not a one-off (batch-and-stop)

`census-gauge-subhits.ts` matches 10 multi-hit damage lines. The genuine gauge-credit gaps are the
**aggregated** ones missing `gaugeHits`:

| slug         | slot   | kit N | uncredited gauge   | note                                   |
| ------------ | ------ | ----- | ------------------ | -------------------------------------- |
| `liberalio`  | skill1 | 5     | **22.4% per SHOT** | per-full-charge — the dominant one     |
| `cinderella` | burst  | 10    | 4.0% per cast      | once per cast                          |
| `eve`        | burst  | 6     | 2.0% per cast      | once per cast; her `skill1` is correct |
| `julia`      | burst  | 5     | 1.6% per cast      | once per cast                          |

`sakura-bloom-in-summer` and `elegg-boom-and-shock` use the **per-hit** encoding (N separate effects,
each self-crediting) — correct as-is, no `gaugeHits` needed. `little-mermaid`'s 4-hit line is not in
her damage model at all (out of scope). The three burst-slot rows are a **separate batched proposal**,
findings-only here; being once-per-cast they cannot carry the FB shortfall.

**Recall bound (honest).** The census matches two phrasings — "Attacks sequentially N time(s)" and
"Activates N times". `snow-white-heavy-arms` carries `gaugeHits` 5 and 10 on lines this matcher does
**not** match at all (her volley count is phrased without a digit-adjacent "time"), so recall is
bounded below what `--skipped` reports. `--skipped` lists 2 unmatched damage lines carrying a count
(both `stacks up to 10 times` DoT phrasings, correctly out of scope). A first draft matched only
`/Activates (\d+) time/` and returned all three known-good `gaugeHits` users as absent while reporting
"coverage" — the census-holes failure mode; `--skipped` exists because of it.

## Doc drift found (corrected here)

`docs/data/burst-gauge.md` is CURRENT-STATE and carried a refuted claim as live:

- **§2** listed her among "all four are now MODELED … Liberalio's per-shot-sequence bonus — §7's ×6".
  The `×6` had been deleted three weeks earlier as a misread. The 2026-08-14 gauge-source census
  counted her as covered on the strength of a value that no longer existed — a census hole that hid
  this gap for three weeks.
- **§7** stated `rl3 33.6 = 2 triggers × 6 volley hits × 2.8` — right arithmetic, wrong attribution.
  Its next sentence, _"Adding this moved the run-G prediction from 12 to 13 full bursts, inside the
  video's measured 13-14"_, is the direct link between removing the `×6` and today's shortfall.

The WHY is already in `docs/DECISIONS.md` (the 2026-07-26 ×6-misread correction), so the stale wording
was deleted rather than annotated, per the current-state rule.

## Next steps (owner-gated)

1. **Adjudicate the magnitude — this is now a `/scientific-method` question, not an encode.** The
   COUNT is settled (kit-literal + exact `rl3`); what is unsettled is whether five sub-hits each
   credit the full 5.6 target value, which two measured observables answer differently. Pre-register
   the **refill estimator** first (third-arm follow-up (i)).
2. **Do not blanket-update the battery pins.** Several are measured-truth anchors (constraint 5).
3. **The iron-sweep gap is not fully closed either way** — 12 vs measured 13–14 under the arm. The
   `anis-star` U28 divisor read stays open.
4. **Batched follow-up:** `cinderella` / `eve` (burst) / `julia` `gaugeHits` — small, once-per-cast.
