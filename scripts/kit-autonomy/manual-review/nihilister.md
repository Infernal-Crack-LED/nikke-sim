# Manual review — nihilister (Nihilister)

**Gauntlet date:** 2026-08-04
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0 (judge kimi-code/k3)
**Tier:** 2 (round-count→wall-clock conversion on gainPierce, interval CD timer, burstCast-vs-fullBurstEnter keying, flavor-gated DoT, flat-ammo primitive)

> Slug disambiguation: `nihilister` is the base Nihilister (Pilgrim SR/Fire/Attacker, Burst II,
> released 2023-03-30, `treasure:false`). No same-name variants exist; lint clean (no
> AMBIGUOUS). FROM-SCRATCH build: no shipped override existed (`simSupported:false` — the unit
> could not sim at all before this gauntlet; `resolveSkills` throws for prose-without-override).

## Kit summary

Nihilister is a Fire-element SR Attacker on Burst II (20s cd) built around piercing fire. Her
S1 (**Burning Shot**, passive) tags every full-charge shot with **Pierce for 1 round** and
widens the piercing line (**Piercing Radius ▲50%** for the same round); any shot that strikes
**2+ enemies concurrently** splashes **50.33% of final ATK** onto everything it hits. Her S2
(**Megiddo Flame**) is an automatic periodic blast (**112.64% of final ATK** to enemies within
attack range on a datamined 10s internal CD). Her burst (**Burning Scourge**) hits enemies in
range for **158.59% of final ATK**, ignites a ten-second **Burn** (13.19% of final ATK as
sustained damage every 1s for 10s), and doubles her own magazine (**Max Ammunition Capacity
▲6 rounds for 15s**, 6→12) so she fires far longer between reloads. Against the v1 sim's
single partless boss the multi-enemy splash and the piercing radius never come into play
(carried verbatim as out-of-domain gaps), so her practical surface is the pierce tag, the
periodic blast, the burst nuke, the burn, and the extended magazine.

## Line-by-line

| Line                                                                              | Disposition    | Notes                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------------------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1: attacking with Full Charge → self: Gain Pierce for 1 round(s)                  | FAITHFUL       | `shotFired → self gainPierce durationSec 4`. SR auto-full-charges every shot, so shotFired IS the full-charge trigger. "1 round" is round-count but gainPierce has no durationShots → wall-clock stand-in = worst-case inter-shot gap (empty-mag reload 2.35s + charge cycle ≈1.37s ≈ 3.7s → 4s, ⚑1 cadence). Pinned byte-identical to the static-flag form while firing, load-bearing via the fixture's d-killer-wife Pierce Damage ▲13.55 feed to SR allies. NOT the static hasPierce flag (dispatch-order lag: shot 1 is the application event) |
| S1: Piercing Radius ▲50% for 1 round(s)                                            | DOCUMENTED_GAP | Geometry, not Pierce Damage — the nearest-wrong misread (a pierceDamagePct +50 buff) is explicitly fenced by test. No radius StatKey exists and the boss is single/partless: zero in-domain consumer. Carried verbatim; ⚑4 out-of-domain, couples to the 2+-target line                                                                                        |
| S1: hits 2+ enemies concurrently → all enemies hit: 50.33% final ATK additional    | DOCUMENTED_GAP | Structurally unsatisfiable vs ONE enemy. The ungated flatDamage 50.33 rider is the kit's most damaging plausible misread (~+73% of her normal line per shot) — rejected and pinned absent. Carried verbatim; ⚑3 out-of-domain (needs a multi-target engine model)                                                                                             |
| S2: enemies within attack range: 112.64% of final ATK as damage                    | FAITHFUL       | `interval:10 → flatDamage 112.64 vs enemy` — no activation clause → class-1 pure timer on the DATAMINED skillCooldownsSec.skill2 = 10 (helm-aquamarine precedent; not an invented cadence). First fire t=10; pinned to the exact frame set [10,20,…,170]s (17 hits), which kills interval:5 / hitCount-proxy / burstCast counterfactuals. ⚑2 first-fire phase |
| Burst: enemies within the attack range: 158.59% of final ATK as damage             | FAITHFUL       | `burstCast → flatDamage 158.59 vs enemy`, HER casts only (not fullBurstEnter — a different B2's Full Burst must not fire it). Burst-cast damage lands pre-FB → never takes the +50% major; pinned one nuke per own cast, cast frames ≠ FB-start frames, fbMajorApplied false on every nuke                                                                    |
| Burst: Burn — 13.19% of final ATK as sustained damage every 1 sec for 10 sec       | FAITHFUL       | `burstCast → dot {13.19, 10s, 1s, flavor:'sustained'}` — a real DoT: 10 discrete 1s ticks per cast (cd 20s > 10s window → never overlaps), never cores, no per-dot crit opt-in (ticks crit via the engine's universal DOT_CRIT gate, U13 default-ON — the opt-in counterfactual is byte-identical, proving the gate dominates); flavor feeds sustainedDamagePct |
| Burst: self: Max Ammunition Capacity ▲6 round(s) for 15 sec                        | FAITHFUL       | `burstCast → self buff maxAmmoFlat 6 / 15s` — the FLAT round primitive, NOT maxAmmoPct: pct-6 ≈ inert (0.36 rounds) and pct-100 only coincides at her 6-round base (the trap — pinned structurally from the JSON since behaviour cannot discriminate). Extended 12-round magazine loads at the next in-window reload; removal drops her total (fewer reloads → more shots) |

Zero silent drops: 5 FAITHFUL lines, 2 lines carried VERBATIM in `unmodeled.skill1` with
reasons + activation recipes in the override note. No `ignored` blocks anywhere.

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. Converged on the
  SAME 5-line load-bearing set + the same unmodeled pair, and pre-registered four traps the
  driver adopted: (1) the `durationSec:1` pierce misread ("1 round" ≠ 1 second — the SR cycle
  exceeds 1s so the window would lapse between shots); (2) the maxAmmoPct trap (pct-6 ≈ inert
  vs pct-100 coincidence at a 6-round base); (3) the ungated 50.33% rider (~+73% silent
  over-credit — "the inertness assertion IS the test"); (4) the FIXTURE HAZARD that materialized
  in S5 — controlComp seats crown at B2, and crown (B2/20s) wins the slot over nihilister
  (B2/20s), starving her to zero casts; the reviewer prescribed the sole-B2 fixture fix the
  driver applied. Reviewer's cadence ruling adopted: the S2 seconds value must come from the
  datamined skillCooldownsSec (it does: 10) or be ⚑-flagged — never silently invented.
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. Independently derived the same
  dispositions from prose: gainPierce EFFECT not static flag on a shot-keyed trigger, interval
  rider shape (cadence deliberately NOT pinned by the blind writer — flagged ⚑ since its packet
  carried no datamine), burstCast nuke pre-FB/FB-exempt, ONE 13.19/1s×10s sustained dot per
  cast with the cast-count×10 tick ceiling, maxAmmoFlat-6-not-pct with the shot-economy delta,
  and the 50.33%-rider inertness proof (adding the wrong model moves totals >5%). Result vs the
  driver override: **20 passed / 1 skipped** (the skip is the blind writer's OWN it.skip for the
  Piercing Radius GAP — no primitive). Driver adaptations were mechanical only, each commented
  inline: harness import path, OverrideFile slots are raw Block[] (blind guessed `.blocks`),
  hasPierce/unmodeled top-level, no-`flavor` damage events → magnitude-keyed tick ID, the
  sole-B2 fixture fix prescribed by S2b, and two engine-semantics corrections (burn ticks
  legitimately take the FB major by LANDING timing; teammates move ~0.2% second-order via
  burst-gauge coupling when her damage lines are stripped — relaxed to a 2% direct-buff bound;
  liter's own kit grants team maxAmmoPct → scoped the no-pct check to her casts). Zero
  weakened kit assertions.
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. Converged structurally on ALL
  five load-bearing lines — shotFired→self gainPierce, interval:10→flatDamage 112.64,
  burstCast→flatDamage 158.59, burstCast→dot 13.19/10s/1s/sustained (no crit opt-in),
  burstCast→self maxAmmoFlat 6/15s — and on the identical verbatim unmodeled pair. Two deltas,
  both adjudicated driver-side: (1) the pierce round→sec stand-in: blind 2s (one fire cycle +
  margin) vs driver 4s (worst-case inter-shot gap incl. the empty-mag reload — the timed window
  must never lapse between two rounds actually fired; the blind's 2s under-covers across
  reloads); both ⚑ over the same unmeasured cadence tuple. (2) explicit `crit:true` on the
  flatDamage lines — redundant (the engine default is already crit-on), behavior-identical. The
  blind guessed interval:10 correctly but flagged it (its packet lacked the datamine); the
  driver sources it from characters.json.
- **S7 (kimi-code/k3, binding reconciling judge):** verdict **GO, faithfulness 1.0, zero
  gotchas, discriminationOk true, S5-vs-driver GREEN**. Ruled the two unmodeled lines correctly
  fenced against their named nearest-wrong misreads; the driver's 4s pierce stand-in "the
  better-argued estimate over the same unmeasured cadence tuple"; flagged the shared S2b/S6
  "DoT crit default-OFF" prior as a blind-side RECON_ERROR (the SSOT's DOT_CRIT is default-ON,
  U13) with zero impact — all parties shipped the identical no-opt-in dot JSON. Discrimination
  held: the S2 frame-set pin kills wrong cadences, the fullBurstEnter counterfactual observably
  moves the nuke into the FB window, the collapsed-burn counterfactual differs, and where
  behaviour genuinely cannot discriminate (maxAmmoPct-100 coincidence) the pin is carried
  structurally instead of pretended.

## Residual flags (owner spot-check cluster)

- **⚑1 cadence tuple (standard, tier 1):** chargeFrames 60 + ~22f bolt gap ≈ 1.37s/shot and
  reloadFrames 141 are datamine, unverified for this unit. The gainPierce 4s round stand-in
  derives from them (worst-case inter-shot gap ≈3.7s; margin to 2×cycle ≈2.7s). Recipe: read
  shot cycle + reload gap from any nihilister-focus video.
- **⚑2 S2 first-fire phase (tier 2):** t=10 vs t=0 convention — worth exactly one 112.64%
  proc over the basis. Recipe: focused-solo run, time the first 112.64% popup + its interval.
- **⚑3 2+-target bonus (out-of-domain):** 50.33% of final ATK to all enemies hit by a piercing
  shot through ≥2 enemies — a big hidden lever on multi-target content, dead in v1. Recipe: a
  multi-target engine model (concurrent-hit detection) + a multi-enemy recording; resurface
  with ⚑4.
- **⚑4 Piercing Radius (out-of-domain):** the +50% pierce-line radius governing multi-enemy
  coverage — geometry v1 does not model; couples to ⚑3.
- **Judge spot-checks (same-model stability, not correctness):** (1) the ⚑1/⚑2 cluster against
  one focused-solo recording; (2) the S5 GREEN ran through the labeled mechanical adaptations —
  a spot re-run of the unmodified blind assertions on the two adapted fixtures is the cheap
  independent confirmation; (3) the N1 argument rests on the single d-killer-wife pierceDamagePct
  fixture coupling (the SSOT-gated feed verified in the driver's load-bearing test).

## Model provenance (from the result JSONs' `model` fields)

| Role              | Model         | Artifact                                                                     |
| ----------------- | ------------- | ---------------------------------------------------------------------------- |
| S2b test review   | claude-fable-5 | scripts/kit-autonomy/reviews/nihilister.test-review.json                     |
| S5 blind test     | claude-opus-5 | scripts/kit-autonomy/blind/nihilister.test.ts (20 pass / 1 GAP skip)         |
| S6 blind override | claude-opus-5 | scripts/kit-autonomy/blind/nihilister.override.json                          |
| S7 binding judge  | kimi-code/k3  | scripts/kit-autonomy/results/nihilister.json                                 |
