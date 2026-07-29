# Manual review — `laplace-ultimate-hero` (Laplace: Ultimate Hero)

**Verdict:** GO · **faithfulness 1.0** (binding judge kimi-code/k3, no REAL-GOTCHAs) · **tier 2** · gauntlet 2026-07-28.

RL / Attacker / Wind / Burst III (cd 40s). A **NEW character** and a DIFFERENT unit from base `laplace`
(RL/Iron "Treasure") — nothing carried over. Charge RL whose ATK scales off her own Max HP; she builds
Warm Up stacks per full charge, swaps to a 120-round piercing "Electric Power, Fully Full Charge" weapon
that fires until empty, builds an Over Energy stage resource while swapped, and deals burst damage scaled
by Over Energy stage.

## Kit summary → encoding

| Kit line                                                                       | Disposition                            | Encoding                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------ | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1a ATK ▲ 4.05% of final max HP, continuously                                  | **FAITHFUL** (load-bearing)            | passive self `atkOfMaxHpPct 4.05` — the dominant ATK driver (measured 1.475×: removal drops her total 362.7M→245.9M). Live per-frame in `effectiveAtk`, fed by self Max HP grants.                                                                                                                                      |
| S1b Warm Up: Charge Speed ▲ 10% ×5                                             | UNMODELED (cadence)                    | cadence-only; the sawtooth stack-RESET on swap has no primitive (a maxStacks buff never drops) and the swap weapon is charge-speed-immune (fixed `chargeTimeSec`). Low severity; compounds with the ⚑ swap cadence on cycle pacing.                                                                                     |
| S1c swap to Electric Power (9.45%/120 ammo/Pierce, ends when all rounds fired) | **FAITHFUL** (cadence ⚑)               | `weaponSwap damagePct 9.45 / maxAmmo 120 / maxShots 120 / hasPierce true / durationSec 300`, trigger `hitCount:5 + swapGate:'unswapped'`. End is USES-BASED (`maxShots:120`); `durationSec 300` exceeds any fight so it never truncates the 120 rounds. Pierce is swap-scoped and inert at scope lock.                  |
| S1d when swap ends: removes 100% ammo                                          | UNMODELED (inert)                      | the swap refills the shared mag to `maxAmmo:120` on activation and `maxShots:120` fires all 120, so the mag is already 0 at swap end → the base weapon forces its own reload; the explicit dump removes nothing. S6 (opus) independently skipped it as "consumeAmmo available but untriggerable (no swap-end trigger)". |
| S2a 12 normals in swap → Over Energy ▲ 5% to 100%                              | UNMODELED meter (folded)               | the meter's only consumer (stage advance) is keyed directly to the kit-exact 240-swapped-normal count (see S2b stage). 5%×20 procs×12 normals = 240 per stage is exact arithmetic.                                                                                                                                      |
| S2b Over Energy 100% → advance stage; Max HP ▲ 2/3/7/10.5% (cumulative)        | stage **FAITHFUL**; HP buffs UNMODELED | stage: `oeStage` resource 0–4, `+1` per `hitCount:240 + swapGate:'swapped'` (kit-exact build rate). HP buffs: a small second-order feed into the modeled `atkOfMaxHpPct` (≈+22.5% HP at stage 4 → ≈+123 ATK → low-single-digit % damage); per-stage timing fragile (no auto-advance-stage primitive).                   |
| S2c entering Burst Stage 3 → Attack Damage ▲ 52.14% for 10s                    | **FAITHFUL**                           | `stageEnter:3` self `attackDamagePct 52.14 / 10s` — fires on ANY stage-3 caster (incl. co-B3 helm), not `burstCast` (own-casts-only) and not `fullBurstEnter` (~22f late). The sharpest trigger-identity call in the kit; triply corroborated.                                                                          |
| Burst self ATK ▲ 63.36% for 10s                                                | **FAITHFUL**                           | `burstCast` self `atkPct 63.36 / 10s`, count-locked to her own casts.                                                                                                                                                                                                                                                   |
| Burst 2953.84% of final ATK to all enemies                                     | **FAITHFUL**                           | `burstCast` enemy `flatDamage 2953.84`; FB-exempt (burst-cast resolves before the FB window — verified fact).                                                                                                                                                                                                           |
| Burst 934.76% × Over Energy stage additional (stage ≥1)                        | **FAITHFUL**                           | four `burstCast` enemy `flatDamage 934.76` riders, `resourceGate oeStage min 1/2/3/4` — sum to stage × 934.76 (kit-exact ×stage law; `flatDamage` has no `perResource`, so the stacked-gate decomposition is the faithful encoding). Gated OFF at stage 0.                                                              |

## Cross-family corroboration

- **S2b test-review — claude-fable-5.** Converged on the clean core; pushed the driver to model the burst
  additional damage (its flagship GAP) via the 4× `resourceGate`-gated 934.76 riders, read S2c as
  `stageEnter:3`, and demanded a uses-based (not timed) swap end. Driver acted on all three.
- **S5 blind test — claude-opus-5.** Vs the driver override: **18 pass / 5 fail / 4 skip.** Independently
  converged on `atkOfMaxHpPct`-not-`atkPct`, `stageEnter:3`, the FB-exempt 2953.84 nuke, and the
  stage-gated 934.76 rider. The 5 fails adjudicated: chargeSpeed (genuine documented gap), pierce +
  swap-inertness (blind-side test-design artifacts — pierce is damage-inert at scope lock; rotation
  coupling moves an ally total), ammo dump (genuine documented gap; S6 agreed untriggerable), OE
  swap-gating (test-structure mismatch — the driver DOES gate via `swapGate:'swapped'`).
- **S6 blind override — claude-opus-5.** Independently derived the **identical** encoding for the whole
  load-bearing core, including the exact `oeStage`/`hitCount:240`/`swapGate:'swapped'` stage advance and
  the 4× `resourceGate` 934.76 decomposition. Modeled the Warm Up charge-speed and stage HP buffs the
  driver left UNMODELED, but flagged its OWN gaps there (charge-speed holds at +50% with no reset
  primitive; escalating same-stat overwrite concern).
- **S7 binding judge — kimi-code/k3.** GO, faithfulness 1.0, `gotchas: []`, `discriminationOk: true`.
  Ruled every divergence a documented gap or blind-side artifact; load-bearing core triply corroborated.

## Residual flags (owner spot-check)

1. **Swap fire cadence — TOP ⚑ (dominant unmeasured lever).** Kit-silent (no datamined swap shot, no prose
   fire rate). Driver estimates `chargeTimeSec 0.25` (4 rounds/s, 120 rounds in 30s) by analogy to base
   laplace (Treasure)'s beam tick; S6 estimated ~20 pulls/s (~6s to burn the mag) — a **5× spread**. It
   paces both the swap-mode DPS (9.45% × 120 per cycle) and the Over Energy stage unlocks. **Measure the
   Electric Power fire rate in a focus video before trusting her board number.**
2. **oeStage count-proxy phasing.** `hitCount:240` counts cumulative shots and `swapGate` gates firing not
   counting, so base-weapon shots inflate the counter and stages unlock slightly early (≈5 extra counted
   shots per 120-shot cycle). Per-stage MAGNITUDE is kit-exact; only the timing is ⚑. A faithful fix needs
   a swap-gated hit-counter primitive.
3. **Shared-magazine inertness behind the dropped ammo dump.** The driver's inertness claim rests on the
   engine's swap-exit mag-pooling (the mag returns at 0, not the pre-swap count). If the base mag is
   restored on swap exit, the drop over-credits ~2.85s uptime per cycle — verify against the engine's
   swap-exit path.
4. **Unmodeled second-order lines.** Warm Up charge-speed stacks and the stage Max HP buffs
   (2/3/7/10.5% cumulative) are honest DOCUMENTED_GAPs (no stack-consume / auto-advance-stage primitive);
   combined low-single-digit % under-credit.

## verify.sh note

`verify.sh` is green for everything attributable to this unit (validate-overrides, kit-status --check,
parser-absence, and the full vitest suite — this unit's spec 13/13, 2055 tests roster-wide pass). The
typecheck gate and 4 share/serve test files fail ONLY on a pre-existing repo-wide missing-dep condition
(`hono` / `fonteditor-core` declared in package.json but not installed; failures confined to the untouched
`src/server/*` + `scripts/subset-fonts.ts`). Not npm-installed into the shared parent `node_modules`
(concurrent-batch risk; out of scope for this unit).
