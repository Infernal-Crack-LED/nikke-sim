# Manual review — guillotine (Guillotine)

**Gauntlet date:** 2026-08-02
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (HP status-gates `resourceGate` on S2b + Bb; a live `perResource` ATK scaler; NA round-counts `hitCount` 30/150; meta-defining berserker self-drain)

> Slug disambiguation: `guillotine` IS the base MG/Electric unit (data `weapon:"MG"`, `element:"Electric"`,
> `class:"Attacker"`, `burst:"III"`, manufacturer Elysion, name "Guillotine"). It is explicitly NOT the
> AR/Water variant `guillotine-winter-slayer` (a separate Hero-Level-currency kit). Confirmed at S0 via the
> slug-disambiguation lint (the lint flags the bare base name "Guillotine" as ambiguous, exit 0 — advisory;
> the exact slug `guillotine` is used throughout).

## Kit summary

Guillotine is an Electric MG Attacker on Burst III whose entire kit runs on a self-inflicted HP drain.
Every 30 landed normal attacks she raises her own Critical Rate by 9.28% for 10s **and** loses 2.01% of
her HP; every 150 landed attacks she raises her own Critical Damage by 14.69% for 5s. Once her HP has
fallen below 70% she continuously gains ATK equal to 0.96% per 1% of HP lost, growing the longer the fight
runs (the sim's self-drain alone drives her to the +96% cap at 100% HP lost). Her burst is a single-target
1237.5%-of-final-ATK nuke on the highest-ATK enemy, and once her own HP falls below 50% each burst cast
lands a second 1237.5% hit on the same target. In practice she ramps: the crit buffs come online early, the
ATK scaler switches on mid-early fight (~13s in the fixture), and late-fight bursts hit twice.

The sim models **no HP pool**, so the HP subsystem is carried on the engine's resource-counter primitive
(the soda-twinkling-bunny / phantom / marciana / e-h / laplace-ultimate-hero machinery): the self-drain is a
live resource pool `hpLost` (+2.01 per 30-NA proc), and the two HP gates READ that pool — the ATK scaler via
`perResource{hpLost, 0.96}` behind `resourceGate{min:30}`, and the burst's additional hit via a
`resourceGate{min:50}` flatDamage rider. Every kit line is represented; `unmodeled` is empty.

## Line-by-line

| Line                                                        | Disposition | Notes                                                                                                                                  |
| ----------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| S1a: 30 NA → self Critical Rate ▲9.28% /10s                 | FAITHFUL    | `hitCount:30` → self `critRatePct 9.28 /10s`. GENERIC crit rate (no "of normal attacks" qualifier → not `critRateNormalPct`); G1        |
| S1b: HP ▼2.01% (per 30-NA proc)                             | FAITHFUL    | `hitCount:30` → self `resource hpLost +2.01`. Inert AS HP (no pool/damage/heal); load-bearing as the gate enabler; G2 + ⚑4 (curr/max)   |
| S2a: 150 NA → self Critical Damage ▲14.69% /5s              | FAITHFUL    | `hitCount:150` → self `critDamagePct 14.69 /5s`; independent counter; 150-hit gap >> 5s window → genuinely partial uptime; G3          |
| S2b: HP<70% → self ATK ▲0.96% per 1% HP lost, continuously  | FAITHFUL    | `hitCount:30` + `resourceGate{hpLost min:30}` → self `atkPct perResource{hpLost,0.96} /10s`; live re-read each frame; G4 + ⚑2/⚑3        |
| Burst: highest-final-ATK enemy 1237.5% Burst Skill damage   | FAITHFUL    | `burstCast` → enemy `flatDamage 1237.5`; highest-ATK = the single boss; FB-exempt by cast timing (no +50% major); crit-eligible; G5    |
| Burst: HP<50% → same target additional 1237.5%              | FAITHFUL    | `burstCast` + `resourceGate{hpLost min:50}` → enemy `flatDamage 1237.5`; early casts 1 nuke, late casts 2 (gated, not ungated); G6      |

## The crux — the HP subsystem (resource-pool model)

The driver's S0 first under-modeled the HP subsystem: it ruled S2b UNMODELED (on the soline "no HP-threshold
trigger" precedent) and the burst's additional hit as an ungated over-credit (on the scarlet H5 precedent).
The cross-family **S2b reviewer (claude-fable-5) pushed back**, recommending the engine's resource-counter
primitive: track HP-loss as a pool, gate the scaler on it, and scale the ATK buff live by the pool. The
driver verified the primitives exist (`perResource` at sim.ts:1483 — buff value = resource×mult, live re-read,
ignores the static `value`; `resourceGate` at sim.ts:2087; `resource` effects) and adopted the richer model
in S2c. The result captures the previously-dropped HP damage: validate-overrides total rose 156.7M → 240.2M.

Two encoding subtleties the driver resolved:
1. **S2b trigger is `hitCount:30`, NOT `passive`.** A passive block fires once at frame 0 (sim.ts:2651) where
   `hpLost=0`, so `passive + resourceGate{min:30}` would lock the buff permanently OFF (the S2b reviewer itself
   flagged this risk). The 30-hit re-trigger re-checks the gate every crossing, so the scaler switches on at
   the first crossing after `hpLost>=30` (~13s) and stays continuous thereafter.
2. **Bb is a gated rider, not an ungated duplicate.** `flatDamage` has no `perResource` field, so the
   conditional additional hit is a `resourceGate{min:50}` flatDamage rider (laplace-ultimate-hero precedent).
   `burstCast` re-fires each cast, so early casts (hpLost<50) deal one nuke and later casts deal two — a
   faithful gate, discriminated 3-way in G6 (absent = 1/cast, gated = 11 nukes / 6 casts, ungated = 2/cast).

The binding **S7 judge (kimi-code/k3)** ruled the driver's live-resource encoding "demonstrably more faithful
than S6's fabricated 86.4-flat plateau," exactly matching the independent S2b prescription.

## Cross-family corroboration

- **S2b (claude-fable-5, adversarial test-faithfulness review):** `leakDetected:null`. Independently derived
  the full line set and — decisively — recommended the resource-pool model for the HP subsystem (pool + 30/50
  gates + perResource scaler) where the driver had first under-modeled it. CONVERGED (and corrected the driver).
- **S5 (claude-opus-5, blind test-writer):** `leakDetected:null`. Independently wrote the kit spec; it
  `it.skip`'d the three HP lines on a spurious "the sim has no HP-pool primitive" belief, but its NON-skipped
  structural checks (S2b "not silently dropped"; burst "no ungated always-on duplicate → must be gated") pass
  against the driver's resource model. **Ran GREEN vs the driver override: 14 passed / 3 skipped.**
- **S6 (claude-opus-5, blind override-writer):** `leakDetected:null`. Independently modeled all six lines and
  CONVERGED on the mechanics (S2b gate ≈450 hits, Bb gate ≈750 hits, 0.96 conversion kit-exact, MG cadence the
  mandatory ⚑). Differed only on encoding fidelity: a flat steady-state proxy (atkPct 86.4 assuming ~90% HP
  lost + rampSec:55 + hitCount:450; Bb via requiresPulls:750) vs the driver's live resource pool. The S6 flags
  themselves mark 86.4 as an estimate (lower bound 28.8, mid-fight avg ~55-60).
- **S7 (kimi-code/k3, binding reconciling judge):** `verdict:GO`, `faithfulnessScore:1.0`,
  `discriminationOk:true`, convergence GREEN. All six lines FAITHFUL; no REAL-GOTCHA. One low-severity
  FIDELITY finding (enacted below).

## Residual flags (owner spot-check cluster)

- **⚑1 CADENCE TUPLE [mandatory]:** MG `pullsPerSec` / `reloadFrames 171` are datamine-unverified. They drive
  the hitCount:30/150 proc counts AND the hpLost accumulation / gate-crossing timing. Recipe: rounds/min +
  reload gap from a focus video.
- **⚑2 HP-GATE TIMING [low-moderate]:** `hpLost` accrues from SELF-DRAIN ONLY; real fights also take boss
  damage, so HP<70% / HP<50% cross EARLIER in reality (the sim delays both gates, slightly under-crediting
  S2b's ramp and Bb's additional hits early). Gate MAGNITUDES are kit-exact; only the crossing wall-clock is ⚑.
- **⚑3 GATE OFF-BY-ONE [low]:** S1b (drain) and S2b (gate) share the hitCount:30 trigger; the gate may open on
  the 15th or 16th crossing depending on block-dispatch order — a one-proc (~3s) ambiguity, negligible.
- **⚑4 DRAIN AMBIGUITY [low]:** "HP ▼2.01%" current-vs-max reading is unspecified (contrast scarlet's explicit
  "Current HP ▼4.01%"); modeled additive-of-max. Multiplicative-of-current would delay the gates a few procs.
- **⚑5 HEAL INTERACTION [low, S7 judge]:** `hpLost` is MONOTONE (no decrement) — engine heals carry no HP
  amount, so a healing ally (e.g. liter) cannot retreat the thresholds; once crossed the gates never close,
  over-crediting S2b/Bb vs a healed real fight. No v1 behavioral change possible (nothing to wire). Enacted as
  an override caveat + kit-status finding per the judge's suggestedFix.
- **Shared-prior cluster (S7 judge):** every agent in the chain (S2b, S5, S6, driver, judge) read "HP ▼2.01%"
  as additive-of-max and "HP falls below X%" as a one-way gate with no heal recovery — both are shared-prior
  interpretations of ambiguous prose. **One focus-video HP-bar read** (decay per 30-hit proc + behavior across
  a liter heal) is the cheapest independent check on the whole HP subsystem.
