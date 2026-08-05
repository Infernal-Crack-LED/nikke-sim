# Manual review — neon-blue-ocean (Neon: Blue Ocean)

**Gauntlet date:** 2026-08-04
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (escalating use-count ladders on both skills; burstCast-vs-stageEnter:3-vs-fullBurstEnter
trigger discrimination; `bossElementGate` element status gate; weaponSwap window state machine)

> FROM-SCRATCH build: no override existed before this gauntlet (`simSupported` was false). The
> override was authored test-first; the spec test is 20/20 GREEN vs shipped, every FAITHFUL line
> pinned GREEN vs shipped and RED vs its nearest-wrong counterfactual. EXACT SLUG: this is the
> Water MG variant "nbo" — NOT base `neon` (SG/Fire Burst I, gauntleted earlier in this same batch)
> and NOT `neon-vision-eye` (RL/Electric Burst III).

## Kit summary

Neon: Blue Ocean is a Water-element MG Attacker on Burst III (cd 40s, ammo 300) whose whole kit is
self-buffing burst-ramp. Skill 1 stacks **Damage to Parts ▲12.4%** on herself every time she casts
her burst (each cast re-triggers all prior steps, 20s per instance) — inert against the partless
scope-lock boss but modeled for fidelity. Skill 2 stacks **Elemental Advantage Attack Damage**
every time ANY ally's burst opens Stage 3 (20.56% first entry, +20.2% second, +20.2% third, 10s per
instance, capped at three steps). Her burst **changes her weapon for 7 seconds** to a gun hitting at
33% of final ATK per shot, and while that window is live her attacks against a **Fire Code** target
deal an additional 11% of final ATK per hit. She brings no team utility, heals, or gauge tricks —
the fixture exercises her through the control comp's liter/crown chain with helm as the co-B3.

## Line-by-line

| Line                                                                                 | Disposition | Notes                                                                                                                                                                       |
| ------------------------------------------------------------------------------------ | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1: using Burst Skill → self, Damage to Parts ▲12.4% ×3 escalating, 20s each         | FAITHFUL    | burstCast/self/`escalating`[partsDamagePct 12.4×3]; inert vs partless boss (byte-identical strip pin); equal steps refresh per §11                                          |
| S2: entering Burst Stage 3 → self, Elem. Advantage ▲20.56/20.2/20.2% escalating, 10s | FAITHFUL    | `stageEnter:3`/self/`escalating`[elemAdvantageDamagePct 20.56/20.2/20.2]; fires on ANY B3's cast (helm's included); ELEMENT bucket (MEASURED 2026-07-14)                    |
| Burst: Changes the weapon in use — Damage 33% of final ATK, Duration 7 sec           | FAITHFUL    | burstCast/self/`weaponSwap` damagePct 33 durationSec 7; kit-silent cadence = base MG cadence + belt refill (moran precedent; ⚑1)                                            |
| Burst: attacking a Fire Code target → 11% of final ATK as additional damage          | FAITHFUL    | burstCast/self/`extraHitDamagePct` 11 durationSec 7 + `bossElementGate:'Fire'`; per-hit function rider scoped to the swap window; crit at sheet rate, never cores, no range |
| (no other lines — no heal/shield/ammo/gauge/defensive lines in this kit)             | —           | unmodeled is empty for all three slots                                                                                                                                      |

**Stacking note (binding S7 ruling):** the kit's nominal cumulative totals are 12.4/24.8/37.2 (S1)
and 20.56/40.76/60.96 (S2), but the official same-buff rule (game-mechanics.md §11, @NIKKE_en:
"same buff name + same application scope: re-application REFRESHES, never co-stacks") collapses the
equal-value steps into one live instance each: S1 lives as one 12.4 (inert either way), S2 caps at
20.56 + 20.2 = 40.76 (observed elem mults exactly {1.1, 1.3056, 1.5076}; the naive co-stack 1.7096
never appears — pinned).

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. CONVERGED on all 4 lines
  as load-bearing with matching counterfactuals; pre-named the exact traps (partsDamagePct
  mis-scoped into a live stat, burstCast keying for S2, duration-10 window conflation, ungated
  whole-fight rider). Reconciled divergences, none load-bearing: (1) reviewer read S2 as
  stageEnter:3 — ADOPTED (see S6); (2) reviewer's rider primitive (shotFired flatDamage +
  swapGate) is behaviorally equivalent to the shipped `extraHitDamagePct` carrier — all of the
  reviewer's own discriminating assertions (rider-count == swap-shot count per window, zero vs
  non-Fire boss, zero outside the window, noRange) pass against the shipped encoding, plus a
  rangeApplied:false pin added on the reviewer's inertness list; (3) reviewer expected the 60.96
  co-stack because its methodology pack did not carry §11 — information asymmetry, SSOT sides with
  the refresh-cap.
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. Independently derived all four lines
  FAITHFUL + the swap-cadence MEASUREMENT-GATED flag (same ⚑ as the driver). Pristine artifact runs
  only after 4 banner-documented mechanics-only adaptations (`blind/neon-blue-ocean.adapted.test.ts`):
  harness import path; the cumulative apply-count list truncated at 27 vs the fixture's 11 stage-3
  entries (30 applies) — extended by the blind's own stated formula; rider encoding identity
  (flatDamage → `extraHitDamagePct` carrier per modernia/nayuta/neon-vision-eye convention — the
  divergence was submitted to the judge); and helm's own passive partsDamagePct 3.08 fixture
  contamination filtered by caster. **Adapted run: 15 pass / 0 fail / 4 pre-registered GAP skips**
  vs the driver override (the skips are the blind's own fixture limits: non-Fire-boss branch,
  elemAdv-vs-attackDamagePct on a non-advantaged boss, parts magnitude, swap cadence — the driver
  spec covers three of those four via Iron-boss runs).
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. skill1 and burst line 1 are
  block-for-block IDENTICAL to the driver override; same empty unmodeled; same cadence ⚑. Two
  divergences, both submitted for binding ruling: (1) rider scope — the blind shipped the 11% rider
  WHOLE-FIGHT (its own caveat admits the scope is unstated); the judge ruled window-scoped faithful
  (ChangeWeapon skill state ends at 7s; S2b + S5 independently scoped it to the window; whole-fight
  was exactly the ~3.4× over-credit trap S2b predicted). (2) S2 trigger stageEnter:3 — the DRIVER
  flipped fullBurstEnter → stageEnter:3 on the convergence of all three blind roles plus the
  gauntlet-validated repo precedent for the literal wording (laplace-ultimate-hero S2c, rei-ayanami
  S2b, both cross-family corroborated).
- **S7 (kimi-code/k3, binding judge):** **GO, faithfulness 1.0, discriminationOk:true, gotchas: [].**
  All four lines FAITHFUL; both binding rulings resolved for the driver (rider window scope; §11
  refresh-cap); the stageEnter:3 convergence ratified as "three independent derivations plus prior
  cross-family validation — PROVE-IT-DIFFERENTLY bar met". S5 ruled GREEN after the documented
  adaptations. Residuals below are the judge's own owner spot-check list.

## Residual flags for owner

1. **§11 refresh-vs-co-stack popup read (the only same-model residual with real damage weight).**
   Every agent in this gauntlet read "each subsequent effect triggers all effects before it"
   through §11's refresh rule (live cap 40.76). One popup read of her element multiplier on a third
   stage-3 entry settles it independently: 1.5076 (refresh) vs 1.7096 (co-stack). Recipe: nbo-solo
   vs a Fire boss, popup-reconcile one normal hit inside the third window.
2. **⚑1 swap-weapon cadence/ammo (MEASUREMENT-GATED, dominant unmeasured lever).** The prose states
   only "Damage: 33% of final ATK / Duration: 7 sec" — the swapped weapon's fire rate and ammo pool
   are kit-silent; the datamine carries a swap shot_id (1001402) + an unlabeled integer 90 that
   characters.json cannot corroborate (only the base weapon's shot_detail ships), NOT enacted per
   moran. Shipped estimate: base MG wind-up cadence + full-belt refill (engine swap default).
   Recipe: isolated nbo-solo scope-lock video — count rounds fired inside one 7s window and watch
   the ammo counter. Tier: cadence/throughput (sets the swap-window DPS, ~17% of the fight).
3. **Cadence tuple (standard ⚑).** reloadFrames 171 + MG wind-up ladder defaults are datamine,
   unverified on video for this unit (the ladder itself is measured across the MG class). Low
   priority; bounded error.
4. **Doc hygiene (not this unit's encoding).** game-mechanics.md §10 still says
   elemAdvantageDamagePct sits in the Damage-Up bucket; damage-calculation.md §1c (MEASURED
   2026-07-14 battery 5, superseding) places it in the ELEMENT bucket. The driver followed the
   measured doc; §10's stale sentence is a mechanics-doc-upkeep item.
