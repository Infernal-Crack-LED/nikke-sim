# Full-burst-count matrix — every comp whose sim FB count is off its measured truth

> **CURRENT-STATE class, GENERATED + interpreted.** The tables are the output of a committed script;
> the commentary under them is analysis, not measurement. Regenerate both with:
>
> ```sh
> npx tsx scripts/battery/fb-count-matrix.ts          # table
> npx tsx scripts/battery/fb-count-matrix.ts --json   # machine-readable
> ```
>
> **Every number here is the SIM's**, deterministic path (`SEEDS=1` equivalent, `seed=undefined`).
> The only real-world figures are the `measured` column and the cycle periods cited in the
> commentary — those come from `docs/probe-runs.md` (2026-08-13 tempo-gap entry).
> Rosters are read from `scripts/experiment.ts` at runtime, never transcribed, so this doc goes
> stale rather than wrong if a comp is redefined — re-run the script after any roster change.

## Why this exists

A full-burst count is an integer readout of a continuous quantity (cycle time), so "which comps are
off" understates a per-cycle timing error: a comp only _shows_ a miscount when the accumulated error
crosses a burst boundary. This table separates the two things a wrong count can mean — **the refill
is too slow**, or **the fight ends just short of a burst the team would otherwise have reached** —
which are indistinguishable from the count alone.

Context: the sim's burst cycle is measured **~1.65s/cycle slower than the game's** on two
recordings, with the entire gap inside the gauge-refill window and the cast ladder frame-exact
(`docs/probe-runs.md`, 2026-08-13). This matrix is the per-team view of that window.

## Scope — nine comps, not four

Only four comps carry `disabled: true`. Five more are off by the same class of error and were
absorbed differently — pinned to the sim's count, or had the assertion dropped. **Five of the nine
seat no `liberalio`.** The `liberalio` correlation is in which comps got _flagged_, not in which are
wrong.

| status          | meaning                                                 | comps                                                                     |
| --------------- | ------------------------------------------------------- | ------------------------------------------------------------------------- |
| `disabled`      | skipped by `verify.sh`                                  | iron sweep (run G), T5 wind-weak, T1 wind-weak, N3 scarlet/liberalio iron |
| `pinned-to-sim` | `simFullBursts` pin; gate green, prints KNOWN SHORTFALL | misc B3s (run I order)                                                    |
| `unpinned`      | assertion removed/commented                             | N1 rapi/quency wind, soda-tb control                                      |
| `omitted`       | never entered `scripts/regression.ts`                   | N2 modernia wind, N5 snowwhite-HA fire                                    |

## The matrix

`gauge/60f` = gauge fed **per second of refilling**, not per second of fight. Generation is locked
during Full Burst and the burst chain, so a wall-clock rate would understate every unit ~3×. Bar = 100. Source: `u.gaugeGenerated` (uncapped, pre-clamp) ÷ `gaugeBuildTimeSec`.

| comp                          | boss     | sim vs measured | roster in slot order (weapon · burst · gauge/60f)                                                                                                               | focus                  | team rate | fill from 0 (proj / obs) | FB length |
| ----------------------------- | -------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | --------- | ------------------------ | --------- |
| **iron sweep (run G)**        | Electric | **11 vs 13–14** | `d-killer-wife` SR·I·3.46 · `milk-blooming-bunny` SR·III·3.58 · **`maxwell` SR·III·8.37** · `takina` SR·II·4.62 · `liberalio` SR·III·5.54                       | `maxwell`              | 25.57     | 3.91s / 4.22s            | 10.0s     |
| **T5 wind-weak**              | Iron     | **12 vs 13**    | `nayuta` SMG·II·4.03 · `cinderella-crystal-wave` MG·III·5.50 · **`anis-star` RL·I·8.19** · `liberalio` SR·III·5.72 · `velvet` SR·II·3.38                        | `anis-star`            | 26.81     | 3.73s / 3.79s            | 10.0s     |
| **T1 wind-weak**              | Iron     | **11 vs 13**    | `mast-romantic-maid` MG·II·3.43 · `scarlet-black-shadow` RL·III·4.80 · **`anis-star` RL·I·7.51** · `liberalio` SR·III·6.35 · `crown` MG·II·3.30                 | `anis-star`            | 25.40     | 3.94s / 4.18s            | 10.0s     |
| **N3 scarlet/liberalio iron** | Iron     | **9 vs 10**     | `rouge` SR·I·3.20 · `trina` RL·II·3.40 · **`scarlet-black-shadow` RL·III·5.58** · `liberalio` SR·III·5.59 · `soda-twinkling-bunny` SG·III·7.05                  | `scarlet-black-shadow` | 24.82     | 4.03s / 4.32s            | **15.0s** |
| **misc B3s (run I order)**    | Water    | **12 vs 13**    | `grave` AR·II·2.76 · `anis-star` RL·I·5.02 · **`jill` AR·III·9.29** · `chisato` SMG·III·4.54 · `noir` SG·III·12.93                                              | `jill`                 | **34.53** | 2.90s / 3.05s            | 10.0s     |
| **N1 rapi/quency wind**       | Wind     | **12 vs 13**    | `d-killer-wife` SR·I·7.32 · `grave` AR·II·4.93 · **`rapi-red-hood` MG·III·4.14** · `quency-escape-queen` SMG·III·5.56 · `jill` AR·III·9.03                      | `rapi-red-hood`        | 29.98     | 3.34s / 3.52s            | 10.0s     |
| **soda-tb control**           | neutral  | **9 vs 10**     | `little-mermaid` SMG·I·6.50 · `crown` MG·II·3.26 · **`soda-twinkling-bunny` SG·III·7.65** · `helm` SR·III·11.91                                                 | `soda-twinkling-bunny` | 29.32     | 3.41s / 3.59s            | **15.0s** |
| **N2 modernia wind**          | Wind     | **9 vs ≥10** ⚑  | `d-killer-wife` SR·I·3.40 · `naga` SG·II·3.07 · **`modernia` MG·III·4.17** · `chisato` SMG·III·3.43 · `ein` SR·III·5.27                                         | `modernia`             | **19.33** | 5.17s / 5.56s            | **15.0s** |
| **N5 snowwhite-HA fire**      | Fire     | **11 vs 12**    | `anis-star` RL·I·2.91 · `arcana-fortune-mate` SG·II·2.31 · **`privaty` AR·III·3.96** · `snow-white-heavy-arms` SR·III·8.56 · `diesel-winter-sweets` RL·III·1.63 | `privaty`              | **19.37** | 5.16s / 5.44s            | 10.0s     |

`proj` = 100 ÷ team rate. `obs` = mean measured refill from the run's own rotation log
(`B1 cast − 0.5s pre-B1 gap − previous FB end`). The 0.06–0.39s gap between them is over-cap waste
plus rate variation across the fight (MG wind-up, reload downtime, buff uptime).

## Where the 180s buzzer lands

| comp                      | state at 180s     | detail                                               |
| ------------------------- | ----------------- | ---------------------------------------------------- |
| iron sweep (run G)        | **gauge filling** | 2.90s into a 4.22s refill — bar ~69%, short by 1.32s |
| T1 wind-weak              | **gauge filling** | 2.90s into a 4.18s refill — bar ~69%, short by 1.28s |
| misc B3s (run I order)    | **gauge filling** | 0.90s into a 3.05s refill — bar ~30%, short by 2.15s |
| N2 modernia wind          | mid-Full-Burst    | 0.50s left (started 165.5s)                          |
| N1 rapi/quency wind       | mid-Full-Burst    | 3.70s left (started 173.7s)                          |
| soda-tb control           | mid-Full-Burst    | 4.70s left (started 169.7s)                          |
| N5 snowwhite-HA fire      | mid-Full-Burst    | 8.90s left (started 178.9s)                          |
| T5 wind-weak              | mid-Full-Burst    | 9.20s left (started 179.2s)                          |
| N3 scarlet/liberalio iron | mid-Full-Burst    | 10.00s left (started 175.0s, 15s window)             |

**No comp ends mid-chain**, and **chain stall is 0.00s on all nine** — no team is ever waiting on a
burst cooldown. The missing bursts are not a burst-availability problem; they are refill speed.

## Observations

**Two teams start their final Full Burst in the last second and bank almost none of it.** T5
wind-weak opens one at 179.2s and N5 at 178.9s — each counts a full burst for ~1s of actual window.
These are the cleanest cases in the set: shaving the measured ~1.65s/cycle off the refill moves that
burst several seconds earlier, which is exactly the missing count.

**The three "gauge filling" teams need accumulated error, and have room for it.** Iron sweep and T1
both stop at ~69% of a bar, ~1.3s short. Over 11 cycles a 1.65s/cycle error is ~18s — far more than
enough. `misc B3s` at ~30% needs ~2.15s across 12 cycles. None of these require the error to be
larger than what was measured.

**Generation rate does not discriminate.** `misc B3s` has the fastest team here (34.53, a 2.90s bar)
and is still short by one; N2 and N5 are the slowest (~19.3, ~5.2s bar) and are short by the same
one. A per-team gauge-rate error would not produce that — a per-cycle _time_ error would, which is
consistent with the footage measurement.

**Focus placement is worth more than it looks, but only for charge weapons.** The focused unit is the
top generator on 5 of 9 teams, driven by the ×2.5 charge-gauge bonus — `maxwell` at 8.37 is 32.7% of
his team, `anis-star` 8.19 is 30.5%. It is not automatic: `rapi-red-hood` (MG) is focused on N1 and
generates less than three teammates, as do `modernia` (MG) on N2 and `privaty` (AR) on N5, because
non-charge weapons take no focus bonus.

**Three comps run a 15s Full Burst, not 10s** — N3 and soda-tb control via `soda-twinkling-bunny`,
N2 via `modernia`. Their cycles are structurally longer, so a fixed per-cycle error costs them fewer
bursts over the fight. Do not compare their counts to the 10s comps without accounting for it.

## ⚑ Known staleness

`scripts/regression.ts` records **N2 modernia wind** as "real ≥10 vs sim 8". The sim reads **9**
today — the comment predates later engine changes, so that comp's stated shortfall is off by one.
Re-derive before relying on it. The measured side (≥10) is untouched by this.

## What this does NOT establish

- It is sim-side arithmetic. It shows the shortfalls are _consistent with_ the measured tempo gap; it
  does not prove a faster refill fixes the counts. That is a separate gated enactment pass.
- It does not localize the cause inside the refill window. Per the 2026-08-13 pass, the FB-end →
  next-stage-1 span is indivisible to the instrument, so "gauge generates too slowly", "the chain
  opens late", and "the real Full Burst is shorter than 10s" are still not separated.
- Passing comps are not shown, so the claim "`N6` passes because it has ~2 cycles of slack rather
  than correct tempo" is **not** demonstrated here. Add the passing comps to the script's `OFF` list
  to test it.

Live thread and next measurement: [handoffs/QUEUE.md](handoffs/QUEUE.md) item 2.
