# Manual Review — queen (Queen (Makoto))

> Kit-autonomy gauntlet 2026-08-18 · **GO** · faithfulness 1.0 · Tier 2

## Kit Summary

Queen (Makoto) is a Fire shotgun Attacker and Burst III unit from the Persona 5 collaboration.
She is built around distributed damage and the Persona chain mechanics ("1 More" / "Follow Up").
Her primary target is Wind Code bosses (Fire holds elemental advantage over Wind).

- **Weapon:** SG, ammo 9, hitsPerShot 10, RoF 90 (instant fire)
- **Burst:** III, cd 40s
- **Element:** Fire (advantage vs Wind)

## Line-by-Line Dispositions

| #   | Line                                                     | Disposition | Encoding                                                               |
| --- | -------------------------------------------------------- | ----------- | ---------------------------------------------------------------------- |
| L1  | S1 Nuke Boost: Elem Adv Atk Dmg ▲13.59% permanent        | FAITHFUL    | `elemAdvantageDamagePct` 13.59, `battleStart`, self                    |
| L2  | S1 Defense Master: DEF ▲14.78% permanent                 | INERT       | `defPct` 14.78, `battleStart`, self (no incoming-damage model)         |
| L3  | S1 ATK ▲50.28% for 15s (battleStart + FB end)            | FAITHFUL    | `atkPct` 50.28/15s, two blocks: `battleStart` + `fullBurstEnd`         |
| L4  | S1 1 More → 548.99% distributed damage                   | FAITHFUL    | `flatDamage` 548.99 distributed, `burstCast` + `bossElementGate: Wind` |
| L5  | S1 Follow Up → 548.99% distributed damage                | ⚑ UNMODELED | Teammate-granted trigger, no engine source in this kit                 |
| L6  | S2 Attack Damage ▲30% permanent                          | FAITHFUL    | `attackDamagePct` 30, `battleStart`, self                              |
| L7  | S2 Fist of Justice: Elem Adv Atk Dmg ▲25.56% (FB window) | FAITHFUL    | `elemAdvantageDamagePct` 25.56/10s, `burstCast`, self                  |
| L8  | S2 Fist of Justice: DEF ▲17.95% (FB window)              | INERT       | `defPct` 17.95/10s, `burstCast`, self                                  |
| L9  | S2 Distributed Damage ▲90.01% for 10s (stage 3 entry)    | FAITHFUL    | `distributedDamagePct` 90.01/10s, `burstCast`, self                    |
| L10 | S2 Baton Pass on 1 More                                  | ⚑ UNMODELED | No "Persona state" gate primitive; team ATK buff 35.2% stacks 3        |
| L11 | Burst: 1421.69% distributed damage                       | FAITHFUL    | `flatDamage` 1421.69 distributed, `burstCast`, enemy                   |
| L12 | Burst 1 More: ATK ▲30.27% for 10s (Wind gate)            | FAITHFUL    | `atkPct` 30.27/10s, `burstCast` + `bossElementGate: Wind`, self        |

## Cross-Family Corroboration

| Stage               | Model          | Result                                                      |
| ------------------- | -------------- | ----------------------------------------------------------- |
| S2b (test review)   | claude-fable-5 | 9 load-bearing lines, no leak, converged                    |
| S5 (blind test)     | claude-opus-5  | VOID (hallucinated context leak) — driver test used         |
| S6 (blind override) | claude-opus-5  | Converged: same triggers, stat keys, magnitudes, Wind gates |
| S7 (binding judge)  | kimi-code/k3   | **GO** — faithfulness 1.0, 0 gotchas (round 2 after fix)    |

### Round 1 Fix

The kimi judge (round 1) identified a REAL-GOTCHA: the S1 "1 More" 548.99% distributed rider was
incorrectly marked UNMODELED. The judge correctly noted that "1 More" is granted by Queen's own burst
(when a Wind Code enemy is present), so the trigger decomposes to `burstCast + bossElementGate: Wind` —
the same primitives the burst block already uses. The fix was applied and confirmed in round 2.

## Residual Flags

1. **Follow Up rider** (L5): teammate-granted trigger with no engine source in Queen's kit.
   Estimate = 0 in v1. Recipe = engine primitive for externally-granted status trigger.
2. **Baton Pass** (L10): team ATK buff gated on "Persona state" — no engine gate primitive.
   Estimate = 0 in v1. Recipe = Persona state gate primitive.
3. **Distributed damage timing** (L9 ↔ L11): whether distributedDamagePct 90.01% applies to the
   same-cast burst nuke depends on engine buff-ordering. Recipe = popup compare (nuke popup vs
   FinalATK math with and without the ×1.9001 distributed term).
4. **Cadence tuple** (RoF 90 / reloadFrames 111): datamined values, not measured from footage.
   Recipe = focus video.

## Evidence

- Tests: `scripts/tests/units/queen.test.ts` (30 assertions, all GREEN)
- Override: `src/skills/overrides/queen.json`
- Judge result: `scripts/kit-autonomy/results/queen.json`
- S2b review: `scripts/kit-autonomy/reviews/queen.test-review.json`
- S6 blind override: `scripts/kit-autonomy/blind/queen.override.json`
