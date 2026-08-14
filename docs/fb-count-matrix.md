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

**Measured, not estimated.** Each comp is re-run past the buzzer (`DURATION=215`) so the next
chain/Full Burst is _observed_ rather than inferred. The "short by" column is the time from the
buzzer to the next Full Burst the team would actually have started.

| comp                      | state at 180s     | detail                                                         | next FB would start |
| ------------------------- | ----------------- | -------------------------------------------------------------- | ------------------- |
| iron sweep (run G)        | **gauge filling** | refilling 2.90s; bar fills at 180.3s — **0.30s short of full** | 182.2s (+2.20s)     |
| T1 wind-weak              | **gauge filling** | refilling 2.90s; bar fills at 180.8s — **0.80s short of full** | 182.6s (+2.60s)     |
| misc B3s (run I order)    | **gauge filling** | refilling 0.90s; bar fills at 182.7s — 2.70s short of full     | 184.6s (+4.60s)     |
| N2 modernia wind          | mid-Full-Burst    | 0.50s left (started 165.5s)                                    | 186.1s (+6.10s)     |
| N1 rapi/quency wind       | mid-Full-Burst    | 3.70s left (started 173.7s)                                    | 189.5s (+9.50s)     |
| soda-tb control           | mid-Full-Burst    | 4.70s left (started 169.7s)                                    | 189.4s (+9.40s)     |
| N5 snowwhite-HA fire      | mid-Full-Burst    | 8.90s left (started 178.9s)                                    | 196.7s (+16.70s)    |
| T5 wind-weak              | mid-Full-Burst    | 9.20s left (started 179.2s)                                    | 194.0s (+14.00s)    |
| N3 scarlet/liberalio iron | mid-Full-Burst    | 10.00s left (started 175.0s, 15s window)                       | 195.3s (+15.30s)    |

**No comp ends mid-chain**, and **chain stall is 0.00s on all nine** — no team is ever waiting on a
burst cooldown. The missing bursts are not a burst-availability problem; they are cycle speed.

> ⚑ **These figures replace an earlier estimate that was wrong by up to 4×.** The first version of
> this doc derived "short by" as `mean refill − elapsed refill` and reported a _bar percentage_. Both
> were unsound: the FINAL refill is not the mean one (per-cycle refills vary with boss transitions,
> buff state and reload phase — iron sweep's last refill is 3.2s against a 4.22s mean, so it read
> "1.32s short" when the true figure is 0.30s), and elapsed-refill-fraction is not a gauge level at
> all, because generation is lumpy (charge weapons deliver it in discrete shots, MG wind-up ramps,
> reloads pause it). **The gauge level at the buzzer is not exposed by the engine and is not reported
> here.** Everything above is time.

## Does the measured tempo gap actually explain these counts?

The 2026-08-13 measurement gives one number — the real cycle runs **~1.65s/cycle** shorter than the
sim's — taken from two recordings. Applying it as a **flat per-cycle subtraction** to all nine and
recomputing `1 + floor((180 − firstFB) / (period − 1.65))`:

| comp                      | sim period | −1.65s | predicted | measured |                               |
| ------------------------- | ---------- | ------ | --------- | -------- | ----------------------------- |
| iron sweep (run G)        | 16.05s     | 14.40s | 13        | 13       | **MATCH** (filmed — circular) |
| T5 wind-weak              | 15.46s     | 13.81s | 13        | 13       | **MATCH** (filmed — circular) |
| N1 rapi/quency wind       | 15.36s     | 13.71s | 13        | 13       | **MATCH**                     |
| N5 snowwhite-HA fire      | 17.25s     | 15.60s | 12        | 12       | **MATCH**                     |
| N2 modernia wind          | 20.02s     | 18.37s | 10        | ≥10      | **MATCH**                     |
| T1 wind-weak              | 16.25s     | 14.60s | 12        | 13       | still short                   |
| N3 scarlet/liberalio iron | 21.38s     | 19.73s | 9         | 10       | still short                   |
| soda-tb control           | 21.08s     | 19.43s | 9         | 10       | still short                   |
| misc B3s (run I order)    | 14.91s     | 13.26s | **14**    | 13       | overshoots                    |

**Five of nine match, and three of those five were never filmed** (N1, N5, N2 — all `liberalio`-free).
That is the strongest evidence so far that the tempo gap is engine-general rather than something
about the comps that happened to get measured.

**The misses are the interesting part, and they are ordered by cycle length.** The single overshoot
is the _shortest_ cycle in the set (misc B3s, 14.91s); two of the three undershoots are the _longest_
(N3 21.38s, soda-tb 21.08s). That is the signature of an error **proportional** to cycle time rather
than a flat constant: a flat 1.65s is 11.1% of misc B3s's cycle but only 7.7% of N3's.

⛔ **That is a hypothesis generated by fitting counts, not a result.** It is exactly the
fit-to-data move the evidence rules exist to prevent, and it is recorded here only as something the
next measurement can test. The two filmed comps cannot discriminate flat from proportional — their
cycles are 16.05s and 15.46s, within 4% of each other, so both models fit both points about equally.
Resolving it needs a cycle measured on a comp with a **long** cycle (N3 or soda-tb control, ~21s) or
a **short** one (misc B3s, ~14.9s).

T1's miss is weak evidence of anything: at 14.60s it needs `174.0/14.60 = 11.92` cycles and lands
just under the integer boundary. A 0.2s period difference flips it — the same quantization
sensitivity that makes comp counts a coarse readout in the first place.

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
