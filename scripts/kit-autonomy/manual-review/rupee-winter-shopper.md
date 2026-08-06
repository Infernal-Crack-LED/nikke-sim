# Manual review — rupee-winter-shopper (Rupee: Winter Shopper)

**Gauntlet date:** 2026-08-05
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (stack mechanics; status-gate via resource mirror; `burstCast`-vs-`fullBurstEnd` timing; meta-defining `reenterStage` B1 re-entry)

> Slug disambiguation: `rupee-winter-shopper` is the Electric/Burst-I Defender variant (aka "rws").
> It is an ENTIRELY DIFFERENT unit from `rupee` (AR/Iron Attacker, Burst II — base variant, gauntleted
> 2026-08-04). FROM-SCRATCH build: no prior override, no kit-status row, `simSupported false → true`.

## Kit summary

Rupee: Winter Shopper is an Electric Burst-I Defender whose own damage is only her AR spray — every
kit line is team support or rotation machinery. When her magazine dries out, all allies take a short
DEF window (19.02%/5s — inert in v1, modeled for kit completeness). Every time ANY ally casts a Burst
Skill (stage 1, 2 or 3), all allies gain a stacking "Shopping" DEF buff (1.33%, up to 4 stacks, 20s —
also inert; the STACK COUNT is the payload). Once Shopping is maxed, the END of each Full Burst grants
the team +7.9% burst-gauge filling speed for 5s (the one rotation-moving line — gated, load-bearing).
Her burst taunts all enemies (unmodeled — no primitive, defensive), heals herself over 10s
(event-only — no HP pool), speeds every ally's reload by 63.17% for 10s (damage-relevant shot
economy), and RE-ENTERS Burst Stage 1 so a second Burst-I ally also casts in the same chain. The
machine closes on itself: the re-entry supplies the 4th burst cast that maxes Shopping each rotation.

## Line-by-line

| Line                                                        | Disposition        | Notes                                                                                                                          |
| ----------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| S1: lastBullet → allies defPct 19.02/5s                     | FAITHFUL (inert)   | Magazine cadence; frame-exact with each 60th shot; defPct has no v1 damage consumer — removal byte-identical (RW1)             |
| S2a: any ally burst cast → Shopping defPct 1.33 ×4 /20s     | FAITHFUL (inert)   | THREE `stageEnter` blocks (1/2/3) merge into one keyed instance; ramp 1→4 inside a 4-cast chain (RW2)                          |
| S2a: pool mirror (+1 `shopping` per ally cast)              | FAITHFUL           | The power/rupee-base resource-mirror construction — the engine has no buff-stack gate primitive; observable only via the gate  |
| S2b: Shopping-max gate → allies burstGenPct 7.9/5s, FB end  | FAITHFUL           | `fullBurstEnd` + `resourceGate{shopping≥4}`; first-FB-end silence pinned (pool 3), all later ends fire (RW3) — load-bearing    |
| Burst: Attract — taunt all enemies 5s                       | DOCUMENTED_GAP     | No taunt primitive; v1 partless boss deals no damage and has no target choice; verbatim in `unmodeled.burst`; closed-set pin   |
| Burst: self heal 50.47% of attack damage over 10s           | FAITHFUL (SSOT)    | `heal` ticks:10 intervalSec:1 → SELF; no HP amount modeled; unobservable amount, but TARGET SET pinned via crown-consumer silence + allies-widened counterfactual (RW7) |
| Burst: allies reloadSpeedPct 63.17/10s                      | FAITHFUL           | Frame-exact with her casts; all allies; removal moves totals (reload economy); self-only counterfactual discriminated (RW4)    |
| Burst: re-enters Burst Stage 1                              | FAITHFUL           | `reenterStage stage:1`; liter fills stage 1 in chain 1 at +30f (STAGE_CAST_GAP), removed → no chain-1 liter cast; sole-B1 no-op byte-identical (RW5); datamined burstMeta Step1 corroborates |

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. All 6 damage/rotation
  lines FAITHFUL with the SAME encodings the driver landed (stageEnter any-ally Shopping, gated
  fullBurstEnd burstGenPct, SELF-only heal ticks:10, burstCast reloadSpeed, reenterStage); taunt
  UNMODELED verbatim. Pre-registered the "Affects self" heal target-set trap (widened heal would
  pump crown's recovery consumer) → became the RW7 inverted-isolation pin, and the kit-as-machine
  note (re-entry supplies the 4th Shopping cast).
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. Independently re-derived all 7 kit lines,
  including the gate-ordering assertion (first gauge apply must be preceded by ≥2 fullBurstStarts —
  rotation 1 banks only 3 stacks) and the same two unmodellable gaps. Out-of-box vs the driver
  override: **12 GREEN / 2 documented skips / 1 RED.** The RED is a fixture-design misread, ruled
  RECON_ERROR by the judge: the blind expected `teamTotal(with reenter) > teamTotal(without)` on its
  burstFirst-patched controlComp, premised on "the fixed B1 never casts without the re-entry". Driver
  probe of that exact fixture: liter casts 6 times EITHER WAY (the ada/helm-throttled ~36s chains
  leave rotations where rws's 20s CD is down and liter takes stage 1 outright); measured direction
  −0.056% timing noise. The mechanical re-entry is pinned green in BOTH specs. One mechanical import
  path fix applied (blind could not see the tree layout); zero assertion changes.
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. Converges on everything load-bearing
  (S1 identical; heal self ticks:10/1s; reenterStage stage:1; reloadSpeed 63.17/10s allies; taunt
  unmodeled verbatim). Two HONEST BLIND FLAGS where the driver encoding is superior, both
  schema-visibility limitations the blind author self-flagged: (1) Shopping keyed to owner
  `burstCast` (the redacted schema did not surface the `stageEnter` any-ally reading — under-fires
  3-4×/chain); (2) the max-stacks gate left UNGATED with the precondition carried verbatim in
  `unmodeled` ("no maxStacks-reached block gate exists in the schema" — they lacked the
  resource-pool mirror precedent). The prose + SSOT side with the driver on both.
- **S7 (kimi-code/k3, binding judge):** **GO, faithfulness 1.0, discriminationOk:true.** All seven
  lines FAITHFUL or DOCUMENTED_GAP; the sole S5 RED classified RECON_ERROR (blind fixture misread,
  probe-disproven); both S6 divergences ruled schema-limited with the prose on the driver's side;
  the 30f liter-after-rws spacing called "a strong independent corroboration". One low-severity
  documented gotcha (below, #1).

## Residual flags for owner

1. **⚑ Sole-B1 pool-no-decay gate overfire (low severity, measurement-gated — the judge's one
   gotcha).** The `shopping` POOL never decays (no timer-decay primitive) while the Shopping BUFF
   lapses 20s after its last refresh. In DOUBLE-B1 comps (the kit's home — her re-entry exists to
   field one) every chain carries ≥4 casts, stacks cap in chain 1, and at each FB END the stacks
   applied during the just-ended chain are still live — pool and buff AGREE at every gate read
   (exact). In a SOLE-B1 comp on a 40s chain cycle (3 casts/chain) the real buff ramps only to 3
   and lapses between chains, so the real gate never opens, but the sim's pool crosses 4 during
   chain 2 and the 7.9% gauge window over-fires from the 2nd FB end onward. Estimate: a
   few-percent-of-the-gauge timing nudge per FB end, zero in double-B1 comps. Recipe: one sole-B1
   rws focus recording — does the gauge-speed buff icon appear after Full Burst ends? Same prior
   family as the base rupee mileage-pool ⚑; every agent shares the resource-mirror prior, so only
   footage independently settles it.
2. **⚑ Cadence tuple (always-⚑).** AR rate_of_fire 720 + reloadFrames 81 + ammo 60 are datamine —
   drives the S1 last-bullet cadence and the reload-economy gain. Recipe: rounds/min + reload gap
   from any rws focus video.
3. **Same-model prior worth one glance (judge).** The `burstGenPct` mapping (per-holder gauge-
   contribution scaler) as the kit's "Burst Gauge filling speed" was accepted by all agents from
   the same schema prior — matches the sim.ts energy term and the "filling speed" wording, but a
   popup-read of gauge accrual during the 5s window would confirm the magnitude path.
4. **No board row yet.** From-scratch unit with no real-fight data — MODEL_ONLY until a recording
   validates magnitudes (the gauntlet certifies structure, not numbers).
