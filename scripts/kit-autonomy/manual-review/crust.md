# Manual review — `crust` (Crust)

**Gauntlet verdict:** GO (cross-family corroborated) · **faithfulness 1.0** · **Tier 2**
**Date:** 2026-07-31 · **Driver:** Qwen · **Blind roles:** claude-fable-5 (S2b) / claude-opus-5 (S5/S6) / kimi-code/k3 (S7)

Water RL Burst-II Supporter (Tetra). A **stance-mode machine**: her kit toggles between two mutually
exclusive cooking stances — **Maillard** (entered in game by landing 3 normal non-Full-Charge attacks)
and **Blanching** (entered by maintaining 3 Full Charges for >1 sec) — each removing the other. Both
stances grant the SAME S1 ATK buff (▲10% of her own ATK to all allies), so the stance only discriminates
her BURST: Maillard → Distributed Damage ▲60%, Blanching → Sustained Damage ▲10%.

**Load-bearing premise (verified `sim.ts:3121` + probe):** the engine's RL/SR path **always fires
full-charge shots** (`firePull(..., true)` on every charge cycle; an RL never tap-fires). The "3 normal
non-Full-Charge → Maillard" entry can therefore **never** fire in-sim, so **Blanching is the only
reachable stance** and is the DEFAULT mode. Maillard is kept as a documented opt-in mode (full-kit
preservation for a tap-fire / distributed-team recording) but is inactive by default. The engine has no
stance-entry / attack-pattern primitive, so the stance is a user-selectable `modes` pair
`["Blanching","Maillard"]`.

## Line inventory (10 lines)

| Line                                                                    | Encoding                                                                    | Disposition    |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------- | -------------- |
| S1 FC + Maillard → Maillard Duration ▲2.5s                              | UNMODELED verbatim (no duration-extend primitive; saturated uptime ⇒ inert) | DOCUMENTED_GAP |
| S1 FC + Blanching → Blanching Duration ▲2.5s                            | UNMODELED verbatim (re-proc ~3 shots ≪ 10s window ⇒ derivably inert)        | DOCUMENTED_GAP |
| S1 3 non-FC → Maillard: ATK ▲10% of caster ATK/10s; removes Blanching   | `hitCount:3`/allies/casterAtkPct 10/10s, mode Maillard (inactive default)   | FAITHFUL       |
| S1 3 FC >1s → Blanching: ATK ▲10% of caster ATK/10s; removes Maillard   | `hitCount:3`/allies/casterAtkPct 10/10s, mode Blanching (DEFAULT)           | FAITHFUL       |
| S2 3 non-FC / 3 FC → Reliable Cooking DEF ▲10% of caster DEF/10s        | `hitCount:3`/allies/**defPct 10**/10s — inert (no casterDefPct StatKey)     | DOCUMENTED_GAP |
| S2 "allies not in Reliable Cooking" no-refresh gate                     | UNMODELED verbatim (no apply-only-if-absent filter; inert payload)          | DOCUMENTED_GAP |
| S2 Removes 1 debuff                                                     | UNMODELED verbatim (no cleanse primitive; no ally debuffs at scope lock)    | DOCUMENTED_GAP |
| S2 entering Full Burst → Maillard/Blanching: ATK ▲20% of caster ATK/10s | `fullBurstEnter`/allies/casterAtkPct 20/10s, UNCONDITIONAL                  | FAITHFUL       |
| Burst all allies: Attack Damage ▲20%/10s                                | `burstCast`/allies/attackDamagePct 20/10s, UNCONDITIONAL                    | FAITHFUL       |
| Burst Maillard allies: Distributed Damage ▲60%/10s                      | `burstCast`/allies/distributedDamagePct 60/10s, mode Maillard               | FAITHFUL       |
| Burst Blanching allies: Sustained Damage ▲10%/10s                       | `burstCast`/allies/sustainedDamagePct 10/10s, mode Blanching (DEFAULT)      | FAITHFUL       |

("Removes Blanching"/"Removes Maillard" mutual exclusivity is enforced STRUCTURALLY by the single
selected mode — only one stance's blocks are live at a time — so it is documented, not simulated.)

## Cross-family convergence

- **S2b (claude-fable-5) test-faithfulness review:** independently derived the RL-always-full-charge
  premise and flagged a Maillard-default as the **shared-prior misread** (it would ship the 60%
  Distributed over-credit as the default). Driver **ACCEPTED** and flipped the default to Blanching.
  Also converged on casterAtkPct flat scaling, fullBurstEnter (not burstCast) for S2, and the inert DEF.
- **S5 (claude-opus-5) blind test:** authored independently; **16 passed / 7 failed / 7 skipped** vs the
  driver override. The S7 judge confirmed **all 7 failures are blind-side artifacts, not faithfulness
  errors**: (5) a FIXTURE bug — the blind's `controlComp('crust', true)` seats crown (also B2, earlier
  slot) which pre-empts the Burst-2 stage so crust casts **0** bursts (verified census liter 10 / crown 10
  / helm 5 / crust 0; the blind's own "crust casts her burst" sanity check fails against its own fixture);
  (1) an assertion bug — the blind expects `durationShots` undefined but the event carries `null` (driver
  test correctly asserts `toBeNull()`); (1) the genuine Blanching-default mode divergence, where the blind
  modeled status-gating as an ungated GAP (a RECON_ERROR — ungated emits a simultaneous Distributed+
  Sustained pair that can never occur, since the stances are mutually exclusive). The 16 passing assertions
  independently corroborate casterAtkPct flat scaling, team-wide targeting, fullBurstEnter identity, DEF
  inertness, and flavor-scoping.
- **S6 (claude-opus-5) blind override:** **converges block-for-block** — modes `[blanching, maillard]`
  default blanching (independent RL-always-full-charge derivation), casterAtkPct 10 (`hitCount:3` +
  durationSec 10), casterAtkPct 20 (fullBurstEnter), attackDamagePct 20 (burstCast), distributedDamagePct
  60 (maillard), sustainedDamagePct 10 (blanching), inert defPct 10 encoded (not dropped), same unmodeled
  set. Driver **adopted both blind-convergent refinements**: S1 `passive` → `hitCount:3`+`durationSec 10`,
  and the S2 DEF line `unmodeled` → inert `defPct 10` block.
- **S7 (kimi-code/k3) reconciling judge:** **GO, faithfulness 1.0, 0 gotchas, discrimination OK.** Ruled
  the Blanching-default mode encoding faithful (premise grounded in mechanics SSOT §4), all four load-bearing
  lines FAITHFUL with frame/counterfactual discrimination, the unmodeled lines legitimate DOCUMENTED_GAPs,
  the inert defPct acceptable, and all 7 S5 failures correctly attributed to blind-side artifacts.

## The two facts worth knowing

1. **RL always full-charges ⇒ Blanching is forced.** `sim.ts:3121` routes RL/SR through "charge → fire
   full-charge shot → recharge" with `firePull(..., true)`; there is no tap-fire path. So the Maillard
   entry (3 non-Full-Charge normals) is unreachable in-sim and a default run emits **zero** Maillard-family
   events — driver H0/H6 pin exactly this (default = Blanching: Sustained ▲10% present, Distributed ▲60%
   absent). The 60% over-credit trap is closed; the ungated counterfactual (H4) provably leaks into Blanching.
2. **casterAtkPct is a flat grant from the caster.** "ATK ▲x% of the skill user's ATK" resolves to
   `(x/100) × caster.staticAtk` (sim.ts:2148), the SAME absolute amount on every ally regardless of their
   own ATK — NOT `atkPct` (which scales each target's own ATK). H1 pins the stat identity, the uniform
   flat value across all allies, and the exact 2:1 ratio between the S2 20% and S1 10% grants (both derive
   from the same caster staticAtk ≈ 99,734 in the fixture).

## Post-review fixes applied (all judge-endorsed, no magnitude changes)

- **S2b reconciliation:** default mode flipped Maillard → **Blanching** (the sim-faithful state); added H0
  (no-mode run behaves as Blanching) + the ratio-2 casterAtkPct consistency pin.
- **S5/S6 convergence:** S1 trigger `passive` → `hitCount:3`+`durationSec 10` (more faithful to the "after
  3 attacks" cadence; both blinds converged); S2 Reliable Cooking DEF encoded as inert `defPct 10` (kit
  completeness; both blinds converged) with H-def pinning presence + byte-identical totals when stripped.
- **S7 nits:** stale "duration-less passive" header comments corrected to the `hitCount:3` + 10s-window
  encoding (comment-only). The `unmodeled.skill2` trigger-line completeness note was ruled documentation-only
  (the payload is encoded merged + inert; the note explains it) — left as the genuinely-unmodeled parts.

## Residual flags (measurement-gated, NOT faithfulness errors)

- **The whole verdict rides on the DATAMINED RL-always-full-charge premise + the unmeasured ">1s maintain"
  dwell convention.** If a real crust recording ever shows tap-fire play (Maillard) or a slower Blanching
  cadence, the mode choice — a **60% Distributed vs 10% Sustained burst swing** — must be re-picked from
  footage before trusting a board reading.
- **Cadence tuple** (chargeFrames 60 / reloadFrames 141) is a datamine estimate; every grant hangs off the
  round counter, so cadence error propagates into team buff UPTIME. Recipe: read crust's ammo counter off a
  recording for true shots/sec.
- **casterDefPct approximation:** the Reliable Cooking DEF is caster-DEF-derived but encoded as target
  `defPct` (no casterDefPct StatKey); inert in v1. A future DEF consumer would need a casterDefPct StatKey,
  not a retune.
- **Distributed/Sustained buffs are flavor-scoped:** granted to all allies but only move damage on
  distributed-/sustained-flavor hits — inert in a comp without such hits (correct engine behaviour).
