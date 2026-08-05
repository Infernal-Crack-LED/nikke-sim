# Manual review — ludmilla (Ludmilla)

**Gauntlet date:** 2026-08-04
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (HP status-gate on the burst branch; `burstCast`-vs-`fullBurstEnter` split between S2 and the burst)

> Slug disambiguation: `ludmilla` IS the BASE variant (SMG/Water/Defender/Burst I, released
> 2022-11-04). It is distinct from `ludmilla-winter-owner` (MG/Water/Attacker/Burst III, aka
> "lwo"/"xlud"/"lewd") — lint passed clean via the colon-form full name.

## Kit summary

Ludmilla is a Water-element SMG Defender on Burst I — the team's tank. When the last bullet of her
120-round magazine hits, she shaves the target's DEF and ATK by 8.4% for 10s (her real team-damage
lever in game; inexpressible and zero-valued at scope lock — see L1/L2). Whenever the team enters
Full Burst she taunts all enemies for 15.09s and takes 57.86% less damage herself for 15s (both
pure defense; no threat model and no incoming-damage model exist in v1 — L3/L4). Her burst hits the
(up to) 10 highest-final-ATK enemies for 163.1% of her final ATK — collapsing to a single hit on
the solo boss — and, gated on being above 50% HP (always true in v1: no HP pool, nobody takes
damage), grants all allies DEF ▲12.93% for 10s (encoded per the tandem rule as a future-consumer
feed; `defPct` is offensively inert in v1).

## Line-by-line

| Line                                                            | Disposition       | Notes                                                                                                                                                                     |
| --------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1: lastBullet → enemy DEF ▼8.4%/10s                            | DOCUMENTED_GAP    | ⚑1: no boss-DEF-debuff primitive (applyEffect drops enemy ATK▼/DEF▼ by design) AND scope-lock runs bossDef=0 (damage-calculation.md line 32; ≤0.12% board shift) — zero-valued and inexpressible on this basis, declared not dropped; estimate+recipe+tier recorded |
| S1: lastBullet → enemy ATK ▼8.4%/10s                            | DOCUMENTED_GAP    | ⚑2: the boss never attacks in the DPS sim AND applyEffect drops enemy ATK▼ — doubly inert                                                                                  |
| S2: fullBurstEnter → all enemies Attract/Taunt 15.09s           | DOCUMENTED_GAP    | No threat/targeting model in v1; trigger identity recorded (fullBurstEnter, not burstCast) so a future consumer never misfiles it                                          |
| S2: fullBurstEnter → self Damage Taken ▼57.86%/15s              | DOCUMENTED_GAP    | No incoming-damage model; the SELF-targeted ▼ mirror of the boss damageTakenPct channel, never that channel — the shared-prior sign/channel trap, pinned absent (zero damageTakenPct anywhere in the run) |
| Burst: burstCast → enemy flatDamage 163.1%                      | FAITHFUL          | One hit per cast (the 10-target clause is capacity, not a multiplier); burst bucket; FB-exempt (cast precedes the window — fbMajorApplied-absent pinned); lv1-89.7 and ×10-1631 counterfactuals discriminated |
| Burst: burstCast → allies defPct 12.93/10s (HP>50% gate)        | FAITHFUL          | Gate always-true in v1 (no HP pool), recorded not enacted (soline pattern); defPct inert in v1, pinned on buffApply events: value 12.93, all 4 allies incl. self, 10s timed window, one firing per cast |

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. Agreed on 5 of 6 lines.
  ONE wrong premise: it read S1 DEF▼ as FAITHFUL/encodable and load-bearing ("the kit's only
  offensive lever besides the nuke"), assuming a working boss-DEF-debuff channel. The mechanics
  SSOT refutes the premise: scope lock runs bossDef=0 (owner DECISION, damage-calculation.md line
  32) and sim.ts applyEffect drops enemy ATK▼/DEF▼ debuffs ("other enemy debuffs (ATK▼, DEF▼)
  don't affect our damage with DEF=0"). The reviewer's remedy — "if the engine has no
  boss-DEF-reduction path, that is a GAP to declare, not a line to silently drop" — is exactly the
  shipped disposition (UNMODELED verbatim + ⚑ with estimate/recipe/tier + non-vacuous guard). Its
  other two notes were adopted: the sole-B1 fixture hazard (pre-empted by the comp design + G0 cast
  pin) and the zero-damageTakenPct-anywhere guard (added to the spec).
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. Independently derived the same six-line
  inventory. vs the driver override out-of-box: **13 pass / 5 skipped / 0 fail** (only adaptation:
  harness import path). The 5 skips are the blind author's OWN honest GAP declarations — the four
  inert cover lines and the always-true HP gate — each an `it.skip` naming why the line is
  unobservable at scope lock. No kit-line disagreement with the driver.
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. Byte-equivalent to the driver's
  override in substance: skill1/skill2 empty with the same four lines unmodeled verbatim; burst =
  flatDamage 163.1 enemy + defPct 12.93/10s allies. Sole delta: an explicit `noFb:true` on the
  nuke — behaviorally identical (a burstCast hit lands before the FB window either way; the driver
  spec pins fbMajorApplied-absent without the flag). It additionally refused to launder the DEF▼
  into damageTakenPct ("a fabricated conversion") and worked the ~9.1s magazine cycle vs 10s
  debuff uptime arithmetic — full convergence with the driver's ⚑1.
- **S7 (kimi-code/k3, binding judge):** **GO, faithfulness 1.0, gotchas [], discriminationOk:true.**
  All six lines accounted (2 FAITHFUL + 4 DOCUMENTED_GAP), zero silent drops. Ruled S2b's DEF▼
  premise wrong ("that premise was wrong, not the driver"), called the self-Damage-Taken line "the
  most dangerous line in the kit ... handled correctly by driver and both blind agents", and
  verified the non-vacuous guards move totals under injection.

## Residual flags (owner spot-check cluster)

- **⚑1 S1 boss DEF▼ GAP** — her real in-game team-damage lever is zero-valued AND inexpressible at
  scope lock (bossDef=0; no enemy-DEF-debuff primitive). Estimate: exactly 0 damage impact on the
  current basis; recipe: if a nonzero bossDef ever enters the basis, add a boss-DEF-debuff
  primitive to applyEffect and re-gauntlet this unit. All three family members converged on this
  reading from the same SSOT sentence — the judge noted a 5-minute grep of sim.ts applyEffect is
  the independent confirmation (the driver verified the code directly at sim.ts ≈ line 2295, not
  just the docs).
- **⚑3 cadence tuple** — SMG RoF 1440 + reloadFrames 187 shipped datamine as-is, footage-unverified
  (recipe: rounds/min + reload gap from any ludmilla focus video).
- **⚑4 multi-target collapse** — the 10-target burst clause is exact for the solo-boss scope; would
  undercount only in multi-target content v1 does not simulate.
- **⚑5 HP gate real-game divergence** — the gate is always-true in v1; real-game uptime may be
  lower if she spends time below 50% HP (recipe: footage of the DEF-buff popup after heavy
  incoming damage).
- Board state: MODEL_ONLY, no real-fight recordings yet → no accuracy row (expected for a
  from-scratch gauntlet; hand-tune is the next outer loop).

## Artifacts

- Driver spec: `scripts/tests/units/ludmilla.test.ts` (12/12 GREEN vs shipped override)
- Override: `src/skills/overrides/ludmilla.json`
- S2b review: `scripts/kit-autonomy/reviews/ludmilla.test-review.json`
- S5 blind test: `scripts/kit-autonomy/blind/ludmilla.test.ts` (+ `.adapted` import path)
- S6 blind override: `scripts/kit-autonomy/blind/ludmilla.override.json`
- S7 judge result: `scripts/kit-autonomy/results/ludmilla.json`
- Verify transcript: `scripts/kit-autonomy/reviews/ludmilla.verify.txt`
