# Driver notes — `drake-great-villain` (Drake: Great Villain) — kit-autonomy gauntlet 2026-09-03

Driver: Claude Fable 5.1 (this harness). Routing (owner instruction for this run): the roles the
protocol pins to `claude-fable-5` went to `kimi-code/k3`; S5/S6 stayed on `claude-opus-5`; Tier-2 second
S2b reviewer `claude-opus-5`; S7 judge `kimi-code/k3` (+ `claude-opus-5` as the Tier-2 second judge).

Exact slug: `drake-great-villain` (Drake: Great Villain — SG / Defender / Wind / Burst III) is a VARIANT of
base `drake` (Drake (Treasure) — SG / Attacker / Fire / Burst III); entirely different kit.

## Convergence run — S5 blind test vs the driver's shipped override (UNMODIFIED file)

`blind/drake-great-villain.test.ts` compiles and runs as-is: **22 passed / 1 failed / 3 skipped** (the skips are
the blind author's own documented gaps: swap-end trigger proxy, swap duration ⚑, swap gauge economy ⚑).

The one RED: _"dropping the ammo dump OVER-credits drake (it costs her a reload every cycle)"_ — asserted
on the blind author's **solo-B3 fixture** (liter / crown / drake-great-villain). Removing the dump there
LOWERS her total (334.4M vs 348.3M) even though she fires MORE shots (179 vs 173). Cause: **rotation
sensitivity, not faithfulness** — the extra post-FB shots change her burst-gauge feed, the chain timing
shifts, and two of the five Full Bursts land later (FB starts 761/3357/6074/**8843**/10751 vs
761/3377/6266/**8174**/10082), costing more window damage than the extra base shots add. On the driver's
control fixture (liter / crown / drake-great-villain / helm, 11 Full Bursts pinned by the alternating
partner) the same counterfactual moves her the expected way: +14.3M (688.2M vs 673.8M), and the driver test
pins that direction. The blind author's claim is right in mechanism (the dump costs a full base reload per
window) and wrong only in the fixture it chose to prove it on.

## The driver-only finding — engine ordering at the Full-Burst-end frame

All four blind roles encode "when Super Duper Overdrive ends → removes 100% of ammo" as `fullBurstEnd` +
`consumeAmmo{fraction:1}` (the S6 override is otherwise block-identical to the driver's). **In this
engine that bare encoding is inert:** her 6 swap rounds are spent by ~9 s into the window, so at the
Full-Burst-end frame she is already mid-way through the swap gun's own reload. `consumeAmmo` only forces
a reload when the target is NOT already reloading (`!t.reloading` guard, sim.ts `consumeAmmo`), and the
Full-Burst-end triggers resolve BEFORE the same-frame swap expiry hands the base shotgun back full
(sim.ts: the `fbEndFrame === frame` section runs ahead of the per-unit FSM's `frame >= swap.untilFrame`
check). Net: the swap-gun reload completes ~12 f after FB end with a full base magazine — she pays no
reload at all. Probe evidence (control fixture, first window): FB end 944 → reload event at **956**.

The driver's encoding is `instantReload` THEN `consumeAmmo` on the same `fullBurstEnd` block: the
instantReload stands in for the weapon change (the swap gun vanishes, the base gun returns full —
owner ruling 2026-08-12 on real weapon swaps — which the engine applies one step later in the frame
anyway) and, by clearing `reloading`, lets the dump start a FRESH base reload on the Full-Burst-end frame:
reload event at **1016** (= 944 + 72 f, the effective base reload under crown's reload-speed buff), first
post-FB shot at 1040 with a fresh 9-round magazine. The driver test's `dumpNoReset` counterfactual (bare
`consumeAmmo`) is pinned byte-identical to `noDump`.

## Divergences the driver reconciled (S2c)

1. **Shot count per window.** The opus S2b reviewer expected ~5 charged shots (1.5 s + the 22 f release
   latency). In this engine the bolt-recovery latency applies only to SR/RL BASE weapons and never while
   swapped (`sim.ts`: `(weapon === 'SR' || 'RL') && !u.swap`), so the engine fires exactly 6 at a 90 f
   cadence. The driver carries this as the shot-economy ⚑ (recipe: count charged-shot popups in one window).
2. **`chargeTimeClamp` vs `chargeTimeSec`.** Both reviewers asked for the clamp ("Fixed at"). The driver
   ships BOTH: the engine enters the charge branch only when the swap declares `chargeTimeSec` (a clamp
   alone inherits the base shotgun's `chargeFrames 0` and never charges — the `swapClampOnly` counterfactual
   pins that gotcha), and the clamp pins the 1.5 s against ally charge-speed buffs.
3. **Nuke crit.** kimi S2b: "burst skill damage does not crit in-game". The engine's roster-wide rider
   convention is crit-eligible at the caster's rate (yukiko's nuke pinned `critEligible === true`,
   2026-08-19); not a per-unit question — reported, not changed.
4. **Same-cast +27.5% on the nuke** (kimi): the buff block precedes the damage block; pinned
   (`nukes[i].mult.dmgUp − noAd == 0.275`).
5. **"(without restoring HP)"**: kimi listed it as unmodeled-verbatim, opus said it belongs inside the
   modeled block. The stack grant emits no recovery event, so the parenthetical is honored by construction;
   recorded as a caveat, `unmodeled` stays empty.
6. **First swap shot offset.** One of the 11 windows fires its first charged shot 149 f after the swap
   frame instead of 89 f (a scripted boss range transition idles the team across the swap frame); the
   test allows at most one such window per fight.
