# Manual review — rapunzel (Rapunzel)

**Gauntlet date:** 2026-08-01
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (`burstCast`-vs-`fullBurstEnter`; status-gate `<30% HP` stun; meta-defining resurrect; scoped `byFinalAtk` target ranking)

> Slug disambiguation: `rapunzel` IS the BASE unit (RL/Iron/Supporter/Burst I, aka "rapu", data
> `name:"Rapunzel"`, `treasure:false`). It is distinct from `rapunzel-pure-grace` (SR/Iron, aka
> "rpg"). The bare base name "Rapunzel" is flagged AMBIGUOUS by the slug lint precisely because of
> this variant; the slug `rapunzel` is unambiguous.

## Kit summary

Rapunzel is the game's signature Pilgrim healer — a Burst-I rocket-launcher Supporter whose ENTIRE
kit is team sustain. She has zero damage lines and zero weapon-state modifiers, so in a damage sim
her only footprint is cross-unit. Each full-charge rocket she fires heals the 3 lowest-HP% allies for
a fraction of her own Max HP (event-only — v1 models no HP pool). Her Skill 2 auto-casts every 15s to
grant the 2 highest-final-ATK allies +8.19% Max HP for 15s (offensively inert — ally-granted Max HP
does not feed a teammate's HP→ATK conversion). Her burst heals the whole team for 40.83% of her Max
HP, resurrects one fallen ally at 81.67% HP, and stuns all enemies for 1s whenever an ally drops below
30% HP. The heals matter to the sim ONLY as recovery-event drivers: they fire allies' "when recovery
takes effect" consumers (e.g. Crown's team Attack Damage buff). The resurrect, the HP-gated stun, and
the incoming-healing line have no engine primitive and are documented gaps. Because nothing in her kit
touches damage, the faithfulness core is a damage-neutrality proof: with her override she sims
byte-identical to the bare weapon whenever no ally consumes her recovery events.

## Line-by-line

| Line                                                            | Disposition      | Notes                                                                                                                                   |
| --------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| S1: full charge → heal 3 lowest-HP% allies (4.03% caster MaxHP) | FAITHFUL         | `shotFired` (RL = one full charge per pull, helm/liberalio precedent), `alliesLowestHp` count:3 (leftmost-3 stand-in); event-only       |
| S2: 2 highest-final-ATK allies Max HP ▲8.19% / 15s              | FAITHFUL (inert) | `interval` sec:15 (datamined CD auto-cast), `alliesTopAtk` count:2 `byFinalAtk:true`, `targetMaxHpPct`→per-target `maxHpFlat`; e3-inert |
| S2: 2 highest-final-ATK allies Incoming healing ▲13.65% / 15s   | DOCUMENTED_GAP   | No incoming-healing StatKey and no HP pool to amplify; verbatim in `unmodeled.skill2`                                                   |
| Burst: all allies heal 40.83% caster MaxHP                      | FAITHFUL         | `burstCast` (her OWN cast, NOT `fullBurstEnter` — the two-B1 fixture exposes the divergence), `allies` incl. self; event-only           |
| Burst: resurrect 1 incapacitated highest-final-ATK ally 81.67%  | DOCUMENTED_GAP   | ⚑ meta-defining for real play; no resurrection/death/HP-pool primitive (nobody dies on the partless boss); verbatim + recipe + tier     |
| Burst: HP <30% → stun all enemies 1s                            | DOCUMENTED_GAP   | ⚑ status-gate; no HP pool to gate the threshold, no enemy-action model; verbatim in `unmodeled.burst`                                   |

Heal MAGNITUDES (4.03% / 40.83% of caster final Max HP) are recorded in caveats but NOT modeled — the
`heal` effect emits a recovery event with no HP amount (v1 has no HP pool). Both heal lines are
implemented for their TANDEM value only (firing allies' recovery triggers).

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. Converged on ALL six lines
  (3 FAITHFUL load-bearing + 3 UNMODELED). Independently named every trap the driver test pins: the
  heal-as-recovery-driver tandem trap, `burstCast`-vs-`fullBurstEnter` (diverges precisely because the
  fixture carries a second Burst I), `byFinalAtk:true` from the literal "highest FINAL ATK", and
  `targetMaxHpPct` (target's OWN %) not `casterMaxHpPct`. Recommended the two-B1 + consumer fixture the
  driver uses, and the frame-level burstCast-coincidence assertion the driver added (R4).
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. Independently derived the same dispositions
  (3 FAITHFUL + GAP magnitude/resurrect/stun/incoming-heal; whole kit "no offensive lines" FAITHFUL).
  Out-of-box vs the driver override: 8 pass / 4 skip / **2 RED — both proven RECON_ERRORs** (blind-test
  calibration, not driver faults): (a) `targets.size===2` tested the UNION across the fight, but the
  line is `byFinalAtk:true` so live ranking shifts the #2 slot (measured union {helm,liter,rapunzel}=3
  over 11 firings while EVERY firing targets exactly 2 — per-frame counts `[2]`); (b) the
  fullBurstEnter counterfactual bound `<=FB+2` was mis-set by one (8 heals vs 5 full bursts) while its
  real discrimination signal (`<CROWN_HEALS/3`, i.e. fullBurstEnter ≪ per-shot cadence) held. After
  adapting only those two bounds (`blind/rapunzel.adapted.test.ts`, discrimination preserved): **10 pass
  / 4 skip — GREEN** vs the driver override.
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. Functionally IDENTICAL to the driver on
  skill1 (`shotFired`/`alliesLowestHp:3`/`heal`) and burst (`burstCast`/`allies`/`heal`), and on the
  three unmodeled lines. The SOLE functional divergence is the skill2 TRIGGER — blind `passive` vs
  driver `interval` sec:15; both agree the line is inert (e3), so it moves zero damage either way.
- **S7 (kimi-code/k3, binding judge):** **GO, faithfulness 1.0, gotchas [] (none), discriminationOk:true.**
  All six lines accounted (3 FAITHFUL + 3 DOCUMENTED_GAP), zero silent drops. The judge independently
  classified both S5 reds as RECON_ERROR (blind miscalibrations) and ruled the driver's `interval:15`
  the MORE faithful S2 reading under the engine's internal-cooldown precedent (continuous auto-cast
  uptime vs the blind's one-shot `passive` that expires at t=15).

## Residual flags for owner

1. **⚑ `shotFired` ≈ full charge (MEASUREMENT-GATED).** S1's "when performing a Full Charge attack" is
   keyed to `shotFired` on the helm/liberalio precedent that every RL trigger pull in the sim is a full
   charge (chargeFrames 60). The driver spec pins that every rapunzel shot carries `charged:true`, which
   makes the sim-side read honest — but the game-side premise wants one rapunzel focus video confirming
   one heal popup per charged shot. If any partial-charge shots occur, the recovery cadence falls short
   of the shot count.
2. **`alliesLowestHp` leftmost-3 stand-in (shared assumption, inert today).** v1 has no HP pool, so
   "3 lowest HP percentage" resolves to the leftmost 3 allies. Every agent (driver, S5, S6, S2b) made
   the same call. It is offensively inert while heals carry no amount — but becomes load-bearing the
   moment an HP pool or heal magnitudes land; re-derive the targeting then.
3. **S2 `interval` first-fire phase (convention).** The skill has no printed activation clause and a
   datamined 15s cooldown; modeled as an auto-cast re-firing every 15s (first at t=15) → continuous
   uptime. The first-fire phase is the standing interval-trigger ⚑. Inert regardless (the Max HP grant
   moves no damage). The blind's `passive` alternative is a one-shot t=0–15s that under-models uptime;
   the judge ruled the driver's `interval` more faithful.
4. **Resurrect is the meta-defining gap.** Rapunzel's signature raid value (the 81.67% resurrect) is
   entirely unmodeled — there is no death/revive/HP-pool primitive, and nobody dies on the partless
   boss. Correct for a DPS sim (zero damage impact), but it is the whole reason she is fielded in real
   play; a survival/endurance sim mode would need to enact it. Same for the HP-gated enemy stun and the
   incoming-healing buff — each awaits an HP pool / incoming-healing multiplier / enemy-action model.
