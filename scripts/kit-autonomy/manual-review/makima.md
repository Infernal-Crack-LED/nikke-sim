# Manual review — makima (Makima)

Kit-autonomy gauntlet 2026-08-04 · **GO, faithfulness 1.0** (binding judge kimi-code/k3, zero
REAL-GOTCHA, discriminationOk) · Tier 2 · FROM-SCRATCH build (no shipped override existed;
`simSupported` was false before this run).

SMG / Defender / Water / Burst II, cd 20s. Ammo 120, hitsPerShot 1, reloadFrames 111, RoF 1440,
normalMult 8.73%, gauge 0.1/shot. A Chainsaw-Man collab tank whose kit is almost entirely
defensive: her only sim-visible surface is the burst's timed Pierce tag + a self recovery-event
stream — everything else is triggered by events the v1 scope-lock sim cannot produce (incoming
attacks, lethal damage) or has no primitive for (taunt/aggro).

## Kit summary

- **S1 "Show Me What You Got"** — Activates when attacked 20 times. Affects all allies. Reload
  Speed ▲ 36.96% / DEF ▲ 14.78% for 10 sec. → **UNMODELED + ⚑1** (no attacked-count trigger
  primitive; v1 models no incoming ally damage — admi carries the IDENTICAL trigger wording with
  the same disposition).
- **S2 "Seems I've Been Noticed"** — (a) after landing 120 normal attacks → Attract: Taunt all
  enemies for 3 sec → **UNMODELED + ⚑2** (no aggro primitive; trigger identity recorded as
  `hitCount:120`, explicitly NOT `lastBullet` — desyncs under any maxAmmo modifier). (b) taking
  lethal damage → Indomitability 7s (1/battle) + Burst Skill cooldown ▼ 11.58s → **UNMODELED +
  ⚑3** (no lethal-damage trigger; the `burstCdr` primitive EXISTS, which makes a
  reachable-trigger encoding the kit's highest-blast-radius misread — pinned absent).
- **Burst "Can You Be Quiet?"** (cd 20s, self) — Gain Pierce for 10 sec → **MODELED**
  (`burstCast → self → gainPierce{durationSec:10}`); Recover 34.02% of attack damage as HP over
  10 sec → **MODELED** (`burstCast → self → heal{ticks:10, intervalSec:1}`, event-only); during
  indomitability → Incoming healing ▲ 41.02% for 10 sec → **UNMODELED + ⚑4** (gate permanently
  closed at scope lock; no heal amounts to amplify).

## Line-by-line

| Kit line                                                        | Disposition  | Encoding / reason                                                                                                                                     |
| --------------------------------------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1 "Activates when attacked 20 times" (all allies)              | UNMODELED ⚑1 | no incoming-damage channel, no attacked-count trigger primitive; nearest-wrong = own-hit `hitCount:20` (near-permanent uptime) — pinned absent       |
| S1 "Reload Speed ▲ 36.96% for 10 sec"                           | UNMODELED ⚑1 | effect side representable (`reloadSpeedPct`) but unreachable without the trigger; invented cadence = team-wide fudge (MEASURED>FUDGE)                |
| S1 "DEF ▲ 14.78% for 10 sec"                                    | UNMODELED ⚑1 | rides the same unreachable trigger; `defPct` is engine-inert regardless                                                                                |
| S2 "Attract: Taunt all enemies for 3 sec" (after 120 hits)      | UNMODELED ⚑2 | no taunt/aggro primitive (folkwang/maiden/ludmilla precedent); trigger identity `hitCount:120` recorded in note                                      |
| S2 "Gain indomitability for 7 sec" (lethal damage, 1/battle)    | UNMODELED ⚑3 | no lethal-damage trigger; death-immunity class (blanc/poli precedent)                                                                                 |
| S2 "Cooldown of Burst Skill ▼ 11.58 sec"                        | UNMODELED ⚑3 | rides the lethal-damage clause; `burstCdr` on a reachable trigger would flip B2 chain contention — structural pin + CD-floor pin guard it            |
| Burst "Gain Pierce for 10 sec" (self)                           | FAITHFUL     | `gainPierce{durationSec:10}` on `burstCast` (asuka precedent); NOT `hasPierce` (boolean can't window), NOT `fullBurstEnter` (kit names no FB clause) |
| Burst "Recover 34.02% of attack damage as HP over 10 sec"       | FAITHFUL     | `heal{ticks:10, intervalSec:1}` — the "OVER 10 SEC" window is a recovery-event stream, not one instant event (helm H8 precedent); no HP amount in v1 |
| Burst "Incoming healing ▲ 41.02% for 10 sec" (indomitability)   | UNMODELED ⚑4 | doubly inert: gate closed (its only source is ⚑3) + no heal amounts / no incoming-healing StatKey; ungated encoding would fabricate a gated effect   |

Driver test: `scripts/tests/units/makima.test.ts` — 12/12 GREEN, deterministic, fixture
**liter/makima/ada** (SOLE-B2: the standard controlComp cannot be used — crown is also Burst II
and starves makima's casts to zero; batch fixture note). M0 fixture guard pins she casts ≥6× at
stage 2. Every FAITHFUL line pinned GREEN vs the shipped override and RED vs its nearest-wrong
counterfactual: M1 pierce — inertness (totals byte-identical to the tag-less model) + a
`pierceDamagePct` probe proving the tag lifts ONLY the 10s post-cast windows (permanent-tag and
fullBurstEnter misreads fail the window-boundary legs); M2 heal — an injected recovery-marker
probe shows ~10 firings per cast spanning ≥8s (instant-heal counterfactual fires 1× and fails);
M3 unmodeled lines — whole-kit byte-identical to the bare weapon + structural scan pinning the
exact block inventory (no `burstCdr`, no S1/S2 blocks) + a phantom always-on S1 counterfactual
that measurably moves team totals; M4 rotation integrity (cast gaps ≥15s, cast count equals
bare-kit).

## Cross-family corroboration

- **S2b test review — claude-fable-5** (`reviews/makima.test-review.json`): converged on all 7
  lines — L5/L6 FAITHFUL with the same shape, L1–L4/L7 UNMODELED. Named the same nearest-wrongs
  the driver pins (own-hit hitCount:20, reachable-trigger burstCdr — "the highest-blast-radius
  misread in the kit", permanent hasPierce, instant heal). Proposed the exact probes the driver
  test uses (pierceDamagePct feed; recovery-marker buff). Sole non-material delta: reviewer also
  accepted an ⚑-interval encoding of L1; the driver kept UNMODELED per admi precedent.
- **S5 blind tests — claude-opus-5** (`blind/makima.test.ts` raw, `blind/makima.adapted.test.ts`
  executed): 14 GREEN / 0 RED / 6 skipped vs the driver override. The blind author independently
  derived the same "zero damage lines; timed Pierce window; gated CDR" reading, pre-flagged the
  crown-B2 fixture trap, and wrote a burstCast non-vacuity probe. Three mechanical adaptations:
  harness import path; fixture swapped to the sole-B2 comp (the author's own gap note prescribes
  the rerun); one sensitivity probe (cdrProbe) evidence-documented as a skip — empirical check:
  an unconditional team-wide burstCdr 11.58 produces byte-identical casts AND totals on this
  basis (rotation is gauge-limited), so the probe cannot fail for ANY override and gates
  nothing; the structural no-reachable-burstCdr assertion carries the discrimination instead.
  The 5 remaining skips are the author's own documented-gap skips.
- **S6 blind override — claude-opus-5** (`blind/makima.override.json`): byte-equivalent
  semantics on 6 of 7 lines (gainPierce 10s + ticks:10 heal merged into one burstCast block;
  all five skips identical). SOLE divergence: encoded L1 as `interval:15` ⚑ (~67% uptime guess)
  → team `reloadSpeedPct`/`defPct`. Carried to the judge.
- **S7 binding judge — kimi-code/k3** (`results/makima.json`): **GO, faithfulness 1.0**, zero
  gotchas, discriminationOk. Ruled the L1 divergence for the DRIVER: the interval cadence is
  underivable from anything measured, grants a team-wide damage-relevant buff, and "S5's own
  strip test is GREEN only under the driver's disposition — the blind test harness corroborates
  the driver over the blind override". Confirmed the cdrProbe skip is sound and the structural
  + CD-floor pins discriminate.

## Residual flags (owner spot-checks, per the judge)

1. **S1 disposition is a POLICY call** — "unmodeled at scope lock" (driver, admi precedent) vs
   "⚑ interval approximation" (S6). Both were defensible; the judge flagged that unmodeled
   zeroes Makima's primary real-game value (steady boss attacks → near-permanent team reload
   uptime), so the board will UNDER-rank her relative to in-game. Confirm the unmodeled policy
   stands for incoming-damage-triggered damage-relevant lines.
2. **"over 10 sec = ticks:10 at 1/s"** is a shared prior — every agent (driver + both blinds)
   assumed the same granularity from the helm H8 precedent; no agent verified tick cadence from
   footage.
3. **Cadence tuple** (RoF 1440 / reloadFrames 111 / ammo 120) rides datamine as-is (⚑5) — the
   standing SMG cadence question is unaddressed for this unit; recipe: rounds/min + reload gap
   from any makima focus video.
