# Manual review — delta (Delta, BASE)

**Gauntlet date:** 2026-08-05
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 1 (zero damage lines, zero weapon-state modifiers; the `burstCast`-vs-`fullBurstEnter` pin
is the default own-cast prior, DIV-behaviorally confirmed by the STARVED comp — folkwang precedent)

> Slug disambiguation: `delta` IS the base SR/Wind Elysion Defender (Burst II, cd 40s). It is
> distinct from `delta-ninja-thief` (MG/Water Defender B2, aka "dnt"); the slug-disambiguation
> lint's AMBIGUOUS-base guard was explicitly resolved on the slug. GREENFIELD: no prior override,
> no prior kit-status row, `simSupported` was false — this gauntlet is her first modeling.

## Kit summary

Delta is a Wind-element sniper Defender on Burst II whose kit is pure survivability and threat
redirection: Skill 1 raises her own Max HP by 8.82% for 10s on every full-charge shot (an SR pulls
a full charge every trigger, so the window refreshes to near-permanent uptime while firing); Skill 2
raises her own DEF by 51.42% for 20s each time she casts her own burst; and the burst itself deploys
a Decoy avatar carrying 91.68% of her final Max HP for 10s while taunting all enemies for 10s. She
contributes no damage buffs, debuffs, or skill damage of any kind — her sim damage is EXACTLY her
bare SR weapon, pinned byte-for-byte against the empty-kit counterfactual in the spec.

## Line-by-line

| Line                                                            | Disposition      | Notes                                                                                                                             |
| --------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| S1: full charge → self Max HP ▲ 8.82% / 10s                     | FAITHFUL (inert) | `shotFired`→self `targetMaxHpPct` (surfaces as converted `maxHpFlat`); cadence/scope/conversion each carry a counterfactual      |
| S2: own burst cast → self DEF ▲ 51.42% / 20s                    | FAITHFUL (inert) | `burstCast` (HER cast, NOT `fullBurstEnter`); STARVED comp pins the divergence (0 delta casts while FBs open under a fullBurstEnter key) |
| Burst: Decoy avatar 91.68% of final Max HP / 10s                | DOCUMENTED_GAP   | No avatar/threat/HP-pool subsystem; verbatim in `unmodeled`; deliberately NOT a `shield` (shielded-trigger contamination)        |
| Burst: Attract — taunt all enemies / 10s                        | DOCUMENTED_GAP   | No aggro model (single partless boss); verbatim in `unmodeled`; not a targetStatus, not a damageTaken debuff                     |
| Whole kit                                                       | FAITHFUL (pin)   | Totals BYTE-IDENTICAL to the empty kit (bare SR weapon); AS_ATK-style sensitivity control proves the comparison is not blind      |

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. All 4 lines reviewed —
  both modeled lines FAITHFUL, both burst lines UNMODELED-verbatim. Independently named the same
  nearest-wrong set (magazine-end cadence for S1; `fullBurstEnter` key for S2; shield-encoding for
  the Decoy; boss-debuff fudge for Attract) and the strict whole-kit inertness pin + red-if-absent
  discipline. Two reconciled deltas: the reviewer's `maxHpFlat`-style flat resolution for the
  observable (the engine does flat-resolve — the driver pins it via the landed `targetMaxHpPct` stat
  per folkwang precedent) and the fixture split (CAST sole-B2 vs STARVED crown-comp) satisfying the
  reviewer's apply==own-casts discriminator.
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. Independently derived all 4 kit lines,
  including the maxHpFlat flat-resolve tolerance and the whole-kit byte-identity + AS_ATK
  sensitivity control. Pristine fixture used controlComp (crown co-B2) — MEASURED starvation: 0
  delta casts vs 10 crown casts / 5 FBs on the driver override, so the adapted copy (structural-only
  banner: harness path, `cfg.onEvent`, sole-B2 fixture `['liter','delta','helm','ada']` per the anis
  precedent) runs the pristine file's own documented else-branch for the divergence test. **Adapted
  run vs the driver override: 18 passed / 4 skipped (the pristine's own missing-primitive `it.skip`s)
  / 0 RED.**
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. **Structurally byte-identical to the
  driver override on skill1/skill2/burst/unmodeled** — independent convergence on `shotFired`→self
  `targetMaxHpPct` 8.82/10s, `burstCast`→self `defPct` 51.42/20s, burst `[]`, and both burst lines
  verbatim in `unmodeled`. Flags match the driver's own ⚑ (shotFired-as-full-charge assumption).
- **S7 (kimi-code/k3, binding judge):** **GO, faithfulness 1.0, discriminationOk:true, gotchas:[].**
  All 4 lines accounted (2 FAITHFUL + 2 DOCUMENTED_GAP), zero silent drops; the judge verified each
  counterfactual is load-bearing (S1 cadence/scope/conversion, S2 own-cast under starvation, burst
  no-damage/no-shield/no-boss-debuff via the byte-identity pin) and noted the convergence is stronger
  than the usual same-model caveat because the kit is damage-inert, making the entire graded surface
  event-log discipline.

## Residual flags for owner

1. **⚑ Decoy avatar (OUT-OF-DOMAIN).** No avatar/summon/threat/HP-pool subsystem exists; the boss
   never acts, so a decoy cannot redirect anything. Estimate: 0 damage impact under any encoding.
   Recipe: needs an avatar/threat primitive + an HP pool before any encoding; NEVER a `shield`
   effect (would falsely fire teammates' shielded triggers / requiresShielded gates).
2. **⚑ Attract taunt (OUT-OF-DOMAIN).** No aggro model; single partless boss. Estimate: 0 damage
   impact. Recipe: needs an enemy-targeting model; not a targetStatus, not a damageTaken debuff.
3. **⚑ Cadence (MEASUREMENT-GATED, low-impact).** `reloadFrames 111` is the datamined value (the SR
   charge cadence itself is the engine's MEASURED universal bolt-recovery rule). Her damage is bare
   weapon only, so the reload gap is her sole cadence sensitivity — read it off any focused delta
   video when one exists.
4. **Fixture note (recorded, not hidden).** The burstCast-vs-fullBurstEnter divergence is only LIVE
   in the driver's STARVED comp; the adapted S5 sole-B2 fixture takes the blind file's own
   else-branch there (readings coincide) — the combined suite still covers the discrimination.
5. **Board status.** No recorded comps exist for delta (greenfield, previously `simSupported:false`);
   tier MODEL_ONLY (DATAMINED magnitudes), 0 graded teams. Her board value is expected to be bare
   weapon until a recording exists.
