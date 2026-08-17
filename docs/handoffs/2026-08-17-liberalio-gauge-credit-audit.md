# `liberalio` gauge-credit audit — 2026-08-17

**Status: CLOSED as LOG (2026-08-17).** Audit complete, defect identified and localized, fix TESTED
through `/scientific-method` and returned **INCONCLUSIVE at 2-of-2** (driver INCONCLUSIVE/HIGH, blind
Fable ACCEPT-of-INCONCLUSIVE/HIGH). **Nothing enacted** — her rider still carries no `gaugeHits`, the
four disabled comps stay disabled, and the stamped board-wide charge-B3 verdict is untouched. Decision
log entry: `docs/handoffs/scientific-method-harness.md` (2026-08-17). Queue item: the
burst-generation thread's "dominant open item, and FOOTAGE-FREE".

> ⚠ **THREE CLAIMS IN THE FIRST DRAFT OF THIS DOC WERE WRONG AND ARE CORRECTED BELOW.** Recorded here
> rather than deleted, because each cost real reasoning: (1) the "two measured observables disagree"
> conflict was an artifact of test-file literals labelled "measured" that are actually relabelled sim
> output; (2) `rl3` was cited as exact independent confirmation of the 5-sub-hit count and cannot
> confirm it at all; (3) `liberalio`'s presence in exactly the four disabled comps was framed as
> evidence of mechanism, which the tree had already examined and rejected.

Instruments (both committed with this doc):

- **`scripts/census-gauge-subhits.ts`** — the multi-hit/`gaugeHits` census (`--all`, `--rl3`,
  `--skipped`, `--json`).
- **`scripts/battery/liberalio-gaugehits-ab.ts`** — the sizing arm. Patches the override at runtime,
  never on disk (the `nbo` swap-cadence precedent, QUEUE.md item 5).

## Verdict

Her burst-gauge **datamine row is exactly right**. The defect is that her kit's rider, whose text says
"Activates 5 times", is **credited as 1 gauge impact**. Crediting all five moves BOTH scored comps'
refill _toward_ the measured tape and lifts Full-Burst counts without overshooting any measured count —
but leaves iron sweep BELOW and T5 ABOVE a `liberalio`-free control band, so **no single per-sub-hit
value reconciles both comps**. The defect is real; the magnitude is not settled, and the comp-level
refill estimator structurally cannot settle it.

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

## The COUNT is kit-literal only — `rl3` does NOT corroborate it (corrected)

The first draft claimed `rl3` 33.6 = 2 triggers x 6 impacts x 2.8 base was "integral and exact to the
digit", an independent confirmation of 1 bullet + 5 sub-hits. **That is degenerate and confirms
nothing.** `rl3` is one scalar over (window length x cadence x per-impact energy x impacts), so
recovering impacts requires externally fixing two things the tree sets inconsistently:

- **the basis** — a factor of 2. `burst-gauge.md` §7 says base (non-boss, unfocused), but
  `helm.json`'s worked example only balances on the target value, and `ein`'s orb term is target while
  her weapon term is base.
- **the pull count** — `rl3`'s implied count omits the 22f SR bolt recovery and disagrees with our
  datamined cadence in every charge case (it wants 3 pulls for a 1s-charge SR where the engine gives 2).

`liberalio`'s 33.6 fits **6, 3, or 12** impacts per trigger equally well. Two further traps found in
the same check: the doc's "reproduces rl3 within ±15% for 74 of 101 units" is **prose-only** (no
committed instrument; an independent re-derivation got 61/108), and **`helm`'s `rl3` changed upstream
from 59.73 to 8.4 on 2026-07-31** (`fda93643`), so every worked example resting on 59.73 cites a dead
value — and that arithmetic never balanced anyway (8.4 + 42.93 = 51.33, not 59.73).

**What actually supports the count:** the kit text alone ("Activates 5 times"), owner-confirmed and
damage-validated for the DAMAGE reading. That is primary and strong for damage; it does not by itself
establish that each sub-hit credits a full gauge impact.

## The scored result — and why the "counter-signal" in the first draft was not real

**The refill conflict was fabricated by mislabelled test literals.** The first draft reported that the
arm "drops refill BELOW the measured 4.43 / 3.56 / 3.71s". Those literals live only in
`scripts/tests/gauge-cycle-decomp.test.ts` titles and are **that instrument's own 2026-08-04 sim
`excess` output re-labelled "measured"** — confirmed on four independent legs, decisively that the only
footage refill measurements for these comps are the 2026-08-14 bar-paint traces, ten days later. T1 has
no footage refill measurement at all.

**The real tape runs the other way: the sim refills TOO SLOWLY, and the arm moves it toward measured.**

| comp                                  | real refill (bar-paint, n=10-12) | sim SHIPPED | sim + `gaugeHits: 5` |
| ------------------------------------- | -------------------------------- | ----------- | -------------------- |
| iron sweep (focus-matched, `maxwell`) | **2.342s**                       | 4.033s      | **2.614s**           |
| T5 wind-weak probe                    | **1.75-1.82s**                   | 3.286s      | **2.900s**           |
| PI2 misc B3s — **no `liberalio`**     | **2.09-2.11s**                   | 3.029s      | 3.029s (unchanged)   |

PI2 seats no `liberalio` and the sim is still ~44% slow there — direct evidence of a deficit
independent of her, which is what the stamped board-wide verdict says.

### Pre-registered estimators (the point of the run — third-arm follow-up (i))

- **SIM:** `decomposeCycles().excess` (`scripts/experiment.ts:69-107`), deterministic single seed.
  Known bias: over-states refill by +0.114-0.117s/cycle ⇒ treat as refill ±0.15s.
- **MEASURED:** `[first frame the charging bar paints] → [reader's green-full instant]`, per window,
  median over non-dropped windows, from the committed `docs/probe-data/fill-trace-*.json`. The
  drain-empty detector anchor is REFUTED for this purpose (under-renders by ~1.5s).
- **MEASUREMENT-MATCHING:** the iron-sweep footage was filmed with `maxwell` focused, not the comp's
  `milk-blooming-bunny`, and focus grants x2.5 charge gauge — inside the measured quantity. The scored
  arm therefore overrides `Comp.focus` to `maxwell`. Measured empirically to be a small term here
  (0.017s at SHIPPED, 0.000s at H1), but it is the correct configuration regardless.

### Decision rule and outcome

`residual = (excess − measured)/measured`, scored against a `liberalio`-free control band.
`R_ctrl = (3.0286 − 2.10)/2.10 = 0.442`, `δ = 0.15` (dominated by the ±0.15s estimator bias) ⇒ band
**[0.292, 0.592]**.

- **Basis pre-check PASSED** — all three fixtures recompute to their recorded medians (iron 2.3420
  exact; the recorded _ranges_ turn out to be exactly the two window-inclusion choices).
- **All three controls byte-identical to the last digit** across arms (PI2, T8 iron-weak, PA MiKa).
- **Damage neutrality bit-exact**: zero delta on 30 unit rows under `disableBursts`.
- `residual(iron, H1) = +0.116` → **BELOW** band. `residual(T5, H1) = +0.625` → **ABOVE** band.
- Both REJECT gates cleared: no undershoot of the tape; no FB count exceeds measured (iron judged at
  13, the CV re-scan value, from the focus-matched arm).

⇒ **not both inside the band ⇒ INCONCLUSIVE.** Even under H1 every seated comp still undershoots its
measured FB count (iron 12 vs 13, T5 12 vs 13, N3 9 vs 10), so no closure is claimed or implied.

**Robustness, honestly split.** The outcome CLASS is robust — INCONCLUSIVE under the pre-registered
pairing, under symmetric medians (both below band), and under symmetric means — and robust to any
defensible δ. The _causal story_ is NOT: swapping T5's midpoint 1.785 for its recomputed ok-window
median 1.817 puts it at +0.596 against a band top of 0.598, i.e. **inside by 0.002**. So
"opposite-direction split" is a boundary case, not a diagnosis, and the blind judge struck it as a
finding. T5 is the weakest measurement in the run (n=11, one 4.75s outlier, sd 0.944).

**Sizing scan (LOG-only, run strictly after the verdict was written and committed):** no integer in
{2,3,4,5} places both primaries inside the band under this estimator — at 2 iron is inside and T5
above; at 3-4 T5 is inside and iron below. No value adopted; the firewall exists precisely because
3 and 4 look attractive on T5 alone.

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

## Doc drift found and corrected

`docs/data/burst-gauge.md` is CURRENT-STATE and carried refuted claims as live:

- **§2** listed her among "all four are now MODELED … Liberalio's per-shot-sequence bonus — §7's ×6".
  The `×6` had been deleted three weeks earlier as a misread, so the 2026-08-14 gauge-source census
  counted her as covered on the strength of a value that no longer existed — a census hole that hid
  this gap for three weeks. Now states the tested-INCONCLUSIVE state.
- **§7** stated `rl3 33.6 = 2 triggers × 6 volley hits × 2.8`. Replaced, and a ⚠ block added stating
  that `rl3` cannot be decomposed into impacts-per-trigger at all, with the basis/pull-count freedom,
  the prose-only "74 of 101" figure, and `helm`'s dead 59.73 value all named.
- **§5 + §6** claimed the `maiden-ice-rose` rider "measured exactly 364" / "— exact". The probe entry
  they cite records **3.45%** against a modeled 3.64%, and `open-questions` U28 already logs that
  −5.2% residual. Corrected to state the measurement and the open residual: the flat,
  un-focus-multiplied SHAPE is confirmed; the magnitude is not exact.

⚑ **Still uncorrected (protected path, needs owner approval):** the engine comment at
`src/engine/sim.ts:1583-1584` makes the same "measured exactly her target per-shot value, 364" claim.

## Next steps (owner-gated)

1. **PREREQUISITE, blocking any future enactment:** the credit-schedule reconstruction
   (`scripts/battery/fb-count-matrix.ts:2502-2509`) pushes exactly one skill credit per damage event
   and **never reads `gaugeHits`**, under-counting any carrier by (N−1) per impact. Latent only because
   no comp in `CREDIT_SCHEDULE_COMPS` seats one of the three carriers. Extend it before any `gaugeHits`
   enactment on an iron-sweep or T5 seat, or CHECK (a) of that instrument is unusable.
2. **The measurement that would settle it:** a `maiden-ice-rose`-style hand read of `liberalio`'s
   per-pull gauge sub-steps (solo or near-solo). The comp-level refill estimator cannot separate a
   reduced per-sub-hit value from the board-wide charge-B3 gap; a per-pull bar-step read can, and it
   would also feed U28.
3. **The decidability recipe (pre-committed by the pre-op judge):** a committed fill trace on a SECOND
   `liberalio`-free comp from the stamped nine, same bar-paint instrument, n≥10 windows, from a comp
   with a clean bundle (PI2 is simultaneously the sole control and the only `amountsTrusted: false`
   bundle). Conversion rule: if two-plus controls cluster within ~δ, a reproduced split converts to
   affirmative REJECT of full-value crediting; if the controls spread comparably, the
   proportional-uniformity premise is the refuted thing and H1 stays live.
4. **Hygiene:** retitle `gauge-cycle-decomp.test.ts`'s "measured" bands as sim drift-guards (four-leg
   confirmed mislabel), and note its `PI2 < T5` assertion is contradicted by measurement regardless of
   any arm (real T5 1.75–1.82s < real PI2 2.09–2.11s). Do NOT blanket-`--update` — of the 19 reds under
   the arm, ZERO are measured-anchored, 4 are harness artifacts (child-process seam), 15 are genuine.
5. **Ledger gap:** the 2026-08-15 `snow-white-heavy-arms` per-sub-hit enactment (`4d60a624`) has no
   `docs/DECISIONS.md` entry and landed 49 minutes after a probe-runs entry reading "FINDINGS ONLY —
   nothing enacted. Enactment is an engine touch and owner-gated."
6. **Batched follow-up (findings-only):** `cinderella` (burst, 10), `eve` (burst, 6), `julia`
   (burst, 5) also aggregate a multi-hit without `gaugeHits`. All once-per-cast, so none can carry the
   FB shortfall — and note this run gives no support for crediting them at full value either.
