# Full-burst-count matrix — every comp whose sim FB count is off its measured truth

> **CURRENT-STATE class, GENERATED + interpreted.** The tables are the output of a committed script;
> the commentary under them is analysis, not measurement. Regenerate both with:
>
> ```sh
> npx tsx scripts/battery/fb-count-matrix.ts          # table
> npx tsx scripts/battery/fb-count-matrix.ts --json   # machine-readable
> ```
>
> The same file carries the gauge instruments the investigation added: `--refill-starvation`,
> `--gauge-sources`, `--focus-columns`, `--multihit-crediting`, and `--credit-schedule` (below).

## The per-frame gauge-credit schedule (`--credit-schedule`)

```sh
npx tsx scripts/battery/fb-count-matrix.ts --credit-schedule [--json]
npx tsx scripts/battery/fb-count-matrix.ts --credit-schedule --comp="T5 wind-weak" --exact-samples=40
```

Everything above is a RATE — gauge per second of refilling. This one is the **timeline**: for each
unlocked region of a comp (the fight-opening first fill, and each `[Full-Burst-end, gauge-full)`
refill window — the only frames where `addGauge` is not swallowed), the ordered
`(frame, unit slug, amount, source kind)` list of every credit fed to the bar, plus per-window
metadata. Kinds are `shot` (one trigger pull), `skill` (one skill/burst impact) and `fill` (a
"Fills Burst Gauge X%" effect, which bypasses `addGauge` entirely). It is emitted for the two
comps with a filmed steady-state cycle, **iron sweep (run G)** and **T5 wind-weak**, so a later
gated measurement can hold a real fill trace against the sim's credit timeline frame-for-frame.

The event tap carries no gauge amounts, so the amounts are a RECONSTRUCTION from the same inputs
the engine reads — and the driver self-reports three independent checks rather than asking to be
trusted: **(a)** each unit's schedule sums to the engine's own uncapped `gaugeGenerated`;
**(b)** every `[g]` line `DBG_GAUGE` prints for the first 30 s is matched within print rounding
(a child process, since `sim.ts` reads its debug env at module load); **(c)** truncated runs at
adjacent `durationSec` boundaries re-derive the engine's actual credit at sampled frames — the only
check that can see a `fillGauge` amount. Anything it cannot rebuild exactly is printed under
`⚑ NOT RECONSTRUCTED EXACTLY`. Pinned by `scripts/tests/battery/credit-schedule.test.ts`.

> **Every number here is the SIM's**, deterministic path (`SEEDS=1` equivalent, `seed=undefined`).
> The only real-world figures are the `measured` column and the cycle periods cited in the
> commentary — those come from `docs/probe-runs.md` (2026-08-13 tempo-gap entry).
> Rosters are read from `scripts/experiment.ts` at runtime, never transcribed, so this doc goes
> stale rather than wrong if a comp is redefined — re-run the script after any roster change.

## Why this exists

**The burst chain and Full Burst timings are settled** — frame-measured, and confirmed against
footage on 2026-08-13 (real cast ladder 1.383–1.400s vs the engine's 82 frames = 1.3667s). So the
only remaining place a full-burst count can be wrong is **the time to fill the burst gauge**, and
since gauge is generated per HIT and by nothing else — no per-second gain, no timer that opens a
chain regardless of gauge — that reduces to a single question: **is the sim computing burst
generation correctly?**

This table is the per-team view of that question: who feeds the bar, how fast, how long a bar
therefore takes, and what state the fight ended in. Where a comp's real cycle was actually filmed, it
converts that into the generation rate the fight requires.

A full-burst count is also an integer readout of a continuous quantity, so "which comps are off"
understates the error — a comp only _shows_ a miscount when the shortfall crosses a burst boundary.

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
| **iron sweep (run G)**        | Electric | **11 vs 13–14** | `d-killer-wife` SR·I·3.18 · `milk-blooming-bunny` SR·III·3.52 · **`maxwell` SR·III·7.95** · `takina` SR·II·4.55 · `liberalio` SR·III·5.91                       | `maxwell`              | 25.11     | 3.98s / 4.20s            | 10.0s     |
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

## Where the 180s fight ends

**The fight ends at 180s — there is no "after".** This reports only the state the fight actually
ended in. It deliberately does **not** report a gauge percentage: the gauge level is not exposed by
the engine, and elapsed refill time is not a proxy for it, because generation counts HITS and hits do
not arrive uniformly (charge weapons fire in discrete shots, MG wind-up ramps, reloads pause the
feed).

| comp                      | state at 180s     | detail                                                                         |
| ------------------------- | ----------------- | ------------------------------------------------------------------------------ |
| iron sweep (run G)        | **gauge filling** | refilling the final 3.60s (last Full Burst ended 176.4s); the bar never filled |
| T1 wind-weak              | **gauge filling** | refilling the final 2.90s (last Full Burst ended 177.1s); the bar never filled |
| misc B3s (run I order)    | **gauge filling** | refilling the final 0.90s (last Full Burst ended 179.1s); the bar never filled |
| T5 wind-weak              | mid-Full-Burst    | opened 179.2s — only 0.80s of it inside the fight                              |
| N5 snowwhite-HA fire      | mid-Full-Burst    | opened 178.9s — only 1.10s inside the fight                                    |
| N3 scarlet/liberalio iron | mid-Full-Burst    | opened 175.0s — 5.00s inside the fight                                         |
| N1 rapi/quency wind       | mid-Full-Burst    | opened 173.7s — 6.30s inside the fight                                         |
| soda-tb control           | mid-Full-Burst    | opened 169.7s — 10.30s inside the fight                                        |
| N2 modernia wind          | mid-Full-Burst    | opened 165.5s — 14.50s inside the fight                                        |

**No comp ends mid-chain**, and **chain stall is 0.00s on all nine** — no team is ever waiting on a
burst cooldown.

## The actionable quantity: GENERATION, not seconds

⛔ **A cycle-time difference is not a mechanic and must not be chased as one** (owner ruling
2026-08-13). There is no "gain X burst gauge per second" in the game and no timer that opens a chain
regardless of gauge — **generation counts HITS**. The burst chain and Full Burst timings are
confirmed and frame-verified, so the only place a full-burst count can go wrong is **how much gauge
the team feeds the bar**. Expressing the error as "the cycle is 1.65s too long" describes a symptom
in units that cannot be enacted: there is no time constant to change.

Converting the filmed cycles into the quantity that _can_ be wrong — real refill = filmed period −
mechanical floor (Full Burst + 0.5s pre-B1 + chain span), required rate = one bar over that:

| comp               | filmed cycle | floor  | real refill | fight needs  | sim feeds    | **sim generates**   |
| ------------------ | ------------ | ------ | ----------- | ------------ | ------------ | ------------------- |
| iron sweep (run G) | 14.39s       | 11.90s | 2.49s       | 40.2 gauge/s | 23.8 gauge/s | **59%** of required |
| T5 wind-weak       | 13.81s       | 11.90s | 1.91s       | 52.4 gauge/s | 26.4 gauge/s | **50%** of required |

**Only these two comps can be converted** — the other seven have no filmed cycle, so no generation
requirement can be derived for them. Nothing here extrapolates onto them.

**The percentages are no longer hedged.** The 10s Full Burst both figures assume is an owner ruling
(2026-08-14, DECISIONS): **Full Burst is exactly 10s unless an ability extends or shortens it**, so
the old ≥8.87s footage bound no longer softens the conversion — the sim generates **59% / 50%** of
what the two filmed fights require, and the whole gap is burst generation.

> **Iron-sweep row re-derived 2026-08-14** (`liberalio` Charge Speed immunity, DECISIONS
> 2026-08-14): it costs her two charges per fight and re-phases that comp, so its whole block above
> moved — per-unit gauge/60f, team rate 25.57 → 25.11, the buzzer state, and the shortfall row
> (floor 11.80s → 11.90s, needs 38.6 → 40.2 gauge/s, **61% → 59%** of required). Every other comp,
> `T5 wind-weak` included, is byte-identical: no other comp seats a Charge Speed source. All values
> transcribed from a fresh `npx tsx scripts/battery/fb-count-matrix.ts`, and the pre-fix run of the
> same command reproduced this doc's previous numbers exactly, so the immunity is the whole cause.

⇒ **The open investigation is whether burst generation is computed correctly** — per-shot values,
shots actually landed, and any source not being counted — not cycle timing.

## Observations

**The three "gauge filling" teams stop mid-refill, two of them barely.** Iron sweep is **0.30s** and
T1 **0.80s** from a full bar at the buzzer — both would have opened another chain almost immediately.
`misc B3s` is further out at 2.70s. None of these needs an error larger than the one measured.

**Two teams start their final Full Burst in the last second and bank almost none of it.** T5
wind-weak opens one at 179.2s and N5 at 178.9s — each counts a whole burst for ~1s of actual window.
Shaving the measured gap moves that burst several seconds earlier, which is where their missing count
comes from.

**Generation rate does not discriminate.** `misc B3s` has the fastest team here (34.53, a 2.90s bar)
and is still short by one; N2 and N5 are the slowest (~19.3, ~5.2s bar) and are short by the same
one. A per-team gauge-rate error would not produce that — a per-cycle _time_ error would, which is
consistent with the footage measurement.

**Focus is worth ~30% of a team's generation, but only for charge weapons.** The focused unit is the
top generator on 5 of 9 teams, driven by the ×2.5 charge-gauge bonus — `maxwell` at 8.37 is 32.7% of
his team, `anis-star` 8.19 is 30.5%. It is not automatic: `rapi-red-hood` (MG) is focused on N1 and
generates less than three teammates, as do `modernia` (MG) on N2 and `privaty` (AR) on N5, because
non-charge weapons take no focus bonus.

**Three comps run a 15s Full Burst, not 10s** — N3 and soda-tb control via `soda-twinkling-bunny`,
N2 via `modernia`. Their cycles are structurally longer (~21s, ~20s), so a fixed per-cycle error
costs them fewer bursts across the fight. Do not compare their counts to the 10s comps without
accounting for it.

## ⚑ Known staleness

`scripts/regression.ts` records **N2 modernia wind** as "real ≥10 vs sim 8". The sim reads **9**
today — the comment predates later engine changes, so that comp's stated shortfall is off by one.
Re-derive before relying on it. The measured side (≥10) is untouched by this.

## What this does NOT establish

- It is sim-side arithmetic. It shows the shortfalls are _consistent with_ the measured tempo gap; it
  does not prove a faster refill fixes the counts. That is a separate gated enactment pass.
- It does not localize the cause inside the refill window. Per the 2026-08-13 pass, the FB-end →
  next-stage-1 span is indivisible to the instrument, so "gauge generates too slowly", "the chain
  opens late", and "the real Full Burst is shorter than 10s" are still not separated. **One in-window
  candidate has since been EXCLUDED (2026-08-14):** post-Full-Burst reload-state starvation is not the
  cause — the first 1s after FB end delivers 86.0% (iron sweep) / 140.7% (T5) of the steady-state
  rate, both clearing the pre-committed ≥80% rule, i.e. the refill window is FLAT-to-FRONT-LOADED,
  never ramping up from a starved boundary (iron sweep's figures were re-derived 2026-08-14 after
  the `liberalio` Charge Speed immunity re-phased that comp — 114.7% pre-fix; the verdict is
  unchanged, the front-loaded shape now holds on T5 only). Instrument:
  `npx tsx scripts/battery/fb-count-matrix.ts --refill-starvation`, pinned by
  `scripts/tests/battery/refill-starvation.test.ts`; the record lives in
  [handoffs/closed/2026-08-13-burst-generation-investigation-plan.md](handoffs/closed/2026-08-13-burst-generation-investigation-plan.md)
  item 1. **A second candidate has since been EXCLUDED as a primary cause (2026-08-14):**
  missing/mis-scoped non-bullet gauge sources — the field-form census of every impact kind vs the
  emission map is clean (every site measured or owner-ruled), the non-emitting kinds
  (`storedHit` releases, `stackedNuke`) contribute ZERO on all nine comps by construction, and
  non-damage skill applications land ~nothing fresh inside the refill windows. Its one live lever
  is the `skillGauge` ÷hitsPerShot divisor for hitsPerShot > 1 (U28 residual): `anis-star`'s
  labeled battery-3-A3 solo fixture EXCLUDES the shipped halved reading, and resolving it her way
  closes ~12% of T5's cycle gap — real but not sufficient, and footage-gated. Instrument:
  `npx tsx scripts/battery/fb-count-matrix.ts --gauge-sources`, pinned by
  `scripts/tests/battery/gauge-source-census.test.ts`; the record lives in the same handoff, item 2.
  **A third candidate has since been EXCLUDED (2026-08-14):** a wrong per-unit focus-multiplier
  column — all four focused charge units (`maxwell`, `anis-star` ×2, `scarlet-black-shadow`)
  resolve to MEASURED columns via `characters.json` `chargeMultiplier`, and even the most
  extreme wrong column (350) covers ≤19.4% (iron sweep, re-derived 2026-08-14 — was ≤22.4% before
  the `liberalio` Charge Speed immunity widened that comp's shortfall) / ≤12.6% (T5) of the measured
  shortfall. Instrument: `npx tsx scripts/battery/fb-count-matrix.ts --focus-columns`, pinned
  by `scripts/tests/battery/focus-columns.test.ts`; the record lives in the same handoff, item 3.
  **A fourth candidate has since been EXCLUDED (2026-08-14):** multi-hit gauge crediting — the
  primary sources never distinguished LANDED pellets from trigger pulls, so the owner was asked
  and ruled 2026-08-14: **a missed pellet generates nothing — per-landed crediting confirmed**
  (U40 answered, DECISIONS 2026-08-14), and the
  ceiling arm (`SGGAUGE=trigger`: full per-trigger SG gauge, gauge-only, default OFF, kept as the
  refuted reading's A/B revert) lifts
  SG-carrier generation +27–48% (team +7–17% on all five SG-seated comps) yet moves ZERO
  Full-Burst counts anywhere on the 31-comp board — every SG comp stays exactly one short, and
  the filmed comps seat no SG carrier at all (byte-identical between arms). The arm, instrument,
  and pinning test live on branch `audit/item4-multihit`: `src/engine/sim.ts` (`SGGAUGE`),
  `scripts/battery/fb-count-matrix.ts --multihit-crediting`,
  `scripts/tests/battery/multihit-crediting.test.ts`; the record lives in the same handoff,
  item 4.
- Passing comps are not shown, so the claim "`N6` passes because it has ~2 cycles of slack rather
  than correct tempo" is **not** demonstrated here. Add the passing comps to the script's `OFF` list
  to test it.
- The generation shortfall is computable for the **two filmed comps only**. The other seven have no
  measured cycle, so nothing about their required generation is derived here.
- The shortfall percentages assume a 10s real Full Burst — an owner ruling (2026-08-14, DECISIONS:
  exactly 10s unless an ability extends or shortens it), so the figures are no longer hedged on it.

Live thread and next measurement: [handoffs/QUEUE.md](handoffs/QUEUE.md) item 2.
