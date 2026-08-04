# Manual review — rumani (Rumani)

**Gauntlet date:** 2026-08-04
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (all-ally scoped burst buff with duration; burstCast-vs-fullBurstEnter identity load-bearing; stack gate via resource-pool proxy, ⚑ documented)

> Slug disambiguation: `rumani` is the base-name unit (Tetra, released 2024-10-17, RL/Fire/
> Defender/Burst I). No same-family variant exists; lint clean. Fresh build: no prior override,
> `simSupported false → true`, kit-status row hand-authored in the exact `--refresh` shape (no
> global `--refresh` — concurrent batches share the file; `--gauntlet` requires an existing row).

## Kit summary

Rumani is a Fire rocket-launcher Defender built around the Muscle Up mechanic. Every RL pull is a
full charge (charge 60f, 6-round magazine, 129f reload), and each one stacks Muscle Up: +3.04% Max
HP per stack, up to 5 stacks, each application refreshing a 2s window. Her reload gap (~2.15s)
EXCEEDS the 2s expiry, so at scope-lock cadence the stacks sawtooth — they lapse to zero during
every reload and re-ramp on the next magazine (22 fresh ramps over 180s). Full-charge hits landed
during Full Burst taunt the target for 5s (UNMODELED: the sim has no targeting/aggro model). Her
Skill 2 buffs all allies' Damage to Parts by 10.05% for 5s after 5 parts hits — doubly inert at
scope lock (partless boss + inert stat), modeled as a hitCount-5 counter per the helm-H4 repo
precedent. Her burst raises her own Max HP by 15.13% for 10s, grants every ally +10.05% Normal
Attack Damage Multiplier for 10s — the kit's ONLY damage-moving line — and, when Muscle Up is at
max stacks at cast time, reduces her own damage taken by 20.06% for 10s. The fixture delivers a
genuine gate-closed cast: her first burst fires at frame 262, before her 5th full charge (frame
395), so 8 of 9 casts carry the gated mitigation.

## Line-by-line

| Line                                                                                          | Disposition    | Notes                                                                                                                             |
| --------------------------------------------------------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| S1: full charge → self Muscle Up Max HP ▲3.04%, 5 stacks, 2s                                   | FAITHFUL       | Two single-effect `chargeCounter count:1` blocks (buff + pool increment; a multi-effect chargeCounter CYCLES effects — power precedent). R1 pins one apply per shot (110 == 110), stacks 1→5, 120f expiry, and the SAWTOOTH: after every one of 18 reloads the next apply is stacks===1 |
| S1: full charge during Full Burst → Taunts 5s                                                  | DOCUMENTED_GAP | Verbatim in `unmodeled`; no targeting/aggro model in v1; the `targetStatus` enemy-status channel rejected as a fake model (taunt is self-aggro, not a boss status) |
| S2: hit Parts ×5 → all allies Damage to Parts ▲10.05%, 5s                                       | DOCUMENTED_GAP | Modeled as `hitCount 5 → allies partsDamagePct 10.05/5s` with ⚑ (no parts axis: every hit counts as a parts hit; payload inert vs partless boss — helm-H4 precedent, 15 shipped overrides carry the stat). Blind preferred unmodeled; damage byte-identical either way; judge upheld the driver's documented encoding |
| Burst: self Max HP ▲15.13%, 10s                                                                 | FAITHFUL       | `burstCast → self targetMaxHpPct 15.13/10s`; damage-inert (no HP-scaler consumer); magnitude cross-pinned by the EXACT 15.13/3.04 flat-value ratio vs the S1 grant (both scale off her static Max HP) |
| Burst: all allies Normal Attack Damage Multiplier ▲10.05%, 10s                                  | FAITHFUL       | The ONLY load-bearing line. `burstCast → allies normalAttackPct 10.05/10s`; byte-identical across all three independent derivations. Bucket pinned: helm's flatDamage rider + burst nuke unmoved while the normal bucket lifts (emilia's %-of-hit repeat inheriting the lift is SSOT §3, not a leak); `attackDamagePct` Damage-Up misread and self-only scope misread both discriminated |
| Burst: Muscle Up at max stacks → self Damage Taken ▼20.06%, 10s                                 | DOCUMENTED_GAP | Modeled via the `muscleUp` resource pool (0→5, +1/full charge) + `resourceGate min:5` on a `burstCast → self damageTakenPct -20.06/10s` block — the exact power precedent for stack gates. Cast 1 gate-closed / casts 2–9 open, pinned against the 5th-charge frame; pool-zero and unconditional counterfactuals bracket the gate; self-held (never boss-flipped) pinned |

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. All six lines
  dispositioned; the two catastrophic over-credit traps pre-registered — "Damage to Parts ▲"
  mis-encoded as generic `attackDamagePct` (a permanent ~10% team over-credit) and "Damage Taken
  ▼" flipped into the boss damageTakenPct debuff channel (a spurious ~20% team window). Both are
  directly asserted against in the driver spec and absent. Reviewer contributed the sawtooth
  observation (129f reload > 2s expiry → stacks collapse every magazine), adopted as a pinned
  assertion. Divergences reconciled: reviewer preferred `shotFired` for L1 (driver kept
  `chargeCounter count:1` — observationally identical on RL, power precedent) and preferred L6
  UNMODELED (driver modeled it via the power pool-gate precedent with ⚑).
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. 11 active tests + 5 honest GAP skips
  written from prose alone; 9 GREEN / 2 RED vs the driver override. Judge classifications:
  RED-1 ("capped at 5 stacks") RECON_ERROR — the blind filter
  `stat==='maxHpFlat' && maxStacks!==undefined` also sweeps in the burst's single self Max-HP
  grant (maxStacks 1), so `every(...===5)` fails on its own filter; the driver spec pins the true
  stack sequence [1,2,3,4,5] and the post-reload reset, all green. RED-2 ("never fires") is the
  real L3 modeling divergence (blind: unreachable trigger → unmodeled; driver: hitCount-5 proxy
  with documented ⚑), damage byte-identical either way; S2b's spec explicitly accepted either
  encoding. Driver applied two mechanical adaptations the blind author itself anticipated
  (harness import path; `onEvent` nested in `cfg`); no assertion touched.
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. BYTE-IDENTICAL on the two burst
  grants that matter (self `targetMaxHpPct 15.13/10s`; allies `normalAttackPct 10.05/10s`) — both
  sides explicitly reject the `attackDamagePct` Damage-Up bucket. Converged on L1's effect
  (trigger spelled `shotFired` vs driver `chargeCounter count:1` — identical on RL) and on the
  taunt as unmodeled-verbatim. Divergent on L3 and L6 (both unmodeled blind vs modeled-with-⚑
  driver; both damage-zero; judge upheld the driver). Blind ⚑ flags also include the RL cadence
  tuple (autofire-vs-bolt-recovery) — engine-owned, not an override field.
- **S7 (kimi-code/k3, binding judge):** **GO, faithfulness 1.0, discriminationOk:true,
  gotchas:[]**. Every divergence the blind agents surfaced classified as either a blind-side
  artifact (RECON_ERROR) or a documented, damage-zero modeling choice. Judge's own residual for
  the owner: convergence is three instances of one model agreeing, so the shared conventions
  deserve an eyeball — the muscleUp pool's no-expiry proxy and the parts-hit counter reading.

## Residual flags for owner

1. **muscleUp pool never decays — and unlike power, the expiry IS reachable (⚑ tier-low).** The
   gate proxy has no expiry primitive; the real stacks drop 2s after the last full charge.
   power's 3s expiry beat her 2.87s reload gap by 8 frames, but rumani's 2s expiry is SHORTER
   than her ~2.15s reload gap, so after a reload boundary the pool can overstate stacks (the gate
   reads open where the real kit reads closed). Estimate: zero DAMAGE divergence — v1 consumes no
   self damageTakenPct; worst case is one extra gated buffApply per post-reload cast. But it will
   silently govern any future HP-scaler or mitigation consumer. Recipe: focused rumani recording
   across a >2s fire pause — read the Muscle Up icon expiry vs whether her next burst grants the
   damage-taken reduction.
2. **Parts-trigger proxy.** hitCount 5 counts every hit as a parts hit (no parts axis). Honest
   only while partsDamagePct remains inert; becomes a live modeling question the day destructible
   parts enter the sim.
3. **No graded comps.** All magnitudes are datamine-literal (MODEL_ONLY); no rumani fight has
   ever been recorded. First recording should sanity-check the RL cadence tuple (the
   autofire-vs-bolt-recovery question is a documented ~15-20% shot-count swing) and the team
   normal-attack buff uptime.
4. **Taunt is genuinely unmodelable in v1** (no targeting model) — if aggro/damage-taken ever
   enters the engine, the line is waiting verbatim in `unmodeled.skill1`.
