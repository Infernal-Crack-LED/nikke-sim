# Manual review — chime (Chime)

**Gauntlet date:** 2026-07-31
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (scoped-buff `alliesTopAtk` "the king" targeting; `burstCast`-vs-`fullBurstEnter` split across her own kit; `reenterStage` rotation mechanic)

> Greenfield unit: no override existed pre-gauntlet (`simSupported:false`, not on the board). She
> enters the board at S9. Slug disambiguation lint was clean (no AMBIGUOUS).

## Kit summary

Chime is a Pilgrim Burst-II SMG Iron Supporter — a pure single-carry enabler who designates ONE ally
as "the king" (the highest-ATK ally) and funnels nearly all of her value into it. From the start of
battle she permanently grants the king bonus attack equal to 46.46% of HER OWN ATK (caster-basis —
not % of the king's ATK). Every time the team enters Full Burst she boosts the king's normal-attack
damage multiplier by 46.22% for 10s. Her burst (cast at Stage 2) does three things: it re-opens
Burst Stage 2 so a SECOND Burst-II unit can also cast in the same rotation (`reenterStage`, the
Tia/Anis:Star mechanic), raises ALL allies' maximum ammunition by 20% for 10s, and grants the king
92.44% Attack Damage (Damage-Up bucket) for 10s. Her own SMG damage is minor. The kit has NO
defensive/heal/shield/taunt portions, so all three `unmodeled` arrays are legitimately empty.

## Line-by-line

| Line                                                      | Disposition | Notes                                                                                                                                                   |
| --------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1 Wish: ATK ▲ 46.46% of caster's ATK, continuously       | FAITHFUL    | `casterAtkPct 46.46` on chime's static ATK, `passive`, no `durationSec`; caster-basis pinned vs the `atkPct` nearest-wrong counterfactual               |
| S2 Daily Report: Normal Attack Damage Mult ▲ 46.22% / 10s | FAITHFUL    | Scoped `normalAttackPct` (NOT generic `attackDamagePct`); `fullBurstEnter` NOT `burstCast` — frame-coincidence pin (cast lands ~52f before FB start)    |
| Burst: Re-enters Burst Stage 2                            | FAITHFUL    | `reenterStage stage:2` on `burstCast`, all-allies block; comp C (two B2s) proves crown casts WITH re-entry, never WITHOUT (`noReenterC` counterfactual) |
| Burst: Max Ammunition Capacity ▲ 20% / 10s (all allies)   | FAITHFUL    | `maxAmmoPct 20/10s`, all-4-ally targeting, count == chimeCasts × 4; a weapon-state modifier, correctly NOT dropped as cosmetic                          |
| Burst Loyalty: Attack Damage ▲ 92.44% / 10s (the king)    | FAITHFUL    | `attackDamagePct 92.44/10s`, `alliesTopAtk count:1`; second ■ header re-scopes to the king; widening counterfactual proves the scope moves the board    |

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** CONVERGED 5/5 lines — identical dispositions,
  triggers, targeting, and nearest-wrong counterfactuals. Independently re-derived the
  `fullBurstEnter`-vs-`burstCast` distinction and the two-B2 re-entry fixture requirement. One flag
  (shared by every role): the "the king" designation rule is not in the prose text.
- **S5 (claude-opus-5, blind test):** SPEC converges 5/5 with the driver. Adapted blind test
  (`blind/chime.adapted.test.ts`; mechanical fixes only: harness import path, `ov.slot` array shape,
  `cfg.onEvent` wiring, `durationShots` null-vs-undefined) runs 10 pass / 9 fail / 1 skip vs the
  driver override, with the **S2 block FULLY GREEN (5/5)**. All 9 failures are blind-side
  RECON_ERRORs, not driver unfaithfulness: (a) 3× S1 — the blind test's UNFILTERED
  `byStat('casterAtkPct')` ingests crown's own 64.51 casterAtkPct grants in its `controlComp`
  fixture; (b) 6× burst — a FIXTURE TRAP where crown (leftmost Burst-II) out-picks chime at stage 2,
  so chime's burst never casts and the blind author's own vacuity guards trip. The driver test covers
  all burst lines behaviorally (18/18), including the two-B2 comp the blind could only `it.skip`.
- **S6 (claude-opus-5, blind override):** NEAR-PERFECT match — identical encoding on all 5 lines
  (stats, triggers, targets, durations, empty `unmodeled`). ONLY diff: `excludeSelf:true` on the king
  lines, which is behaviorally null (a low-ATK Supporter is never the highest-static-ATK ally) and
  which the driver deliberately leaves off on the literal-word rule (the kit does not say "except
  self"). Independently flags the same king-designation ⚑.
- **S7 (kimi-code/k3, binding reconciling judge):** **GO, faithfulness 1.0, gotchas [],
  discriminationOk:true.** All 5 lines FAITHFUL — correct stat channels (`casterAtkPct` vs `atkPct`;
  scoped `normalAttackPct` vs generic `attackDamagePct`), correct triggers (passive /
  `fullBurstEnter` / `burstCast`), correct target sets (king vs all allies, with the burst's two ■
  headers correctly split), correct durations (continuous / 10s wall-clock). The judge classified all
  9 S5 reds as RECON_ERROR and noted the driver test is STRONGER than the blind spec on the re-entry
  leg. "Nothing must change for GO."

## Residual flags for owner

1. **⚑ "The king" designation rule (same-model + shared-prior).** The prose never spells out HOW the
   king is chosen — every agent (driver, S2b, S5, S6) converged on "highest-ATK ally, fixed at apply"
   from the same in-game knowledge, which is stable-but-not-proven. Modeled as `alliesTopAtk count:1`
   on STATIC base ATK (no `byFinalAtk` — the kit says plain "the king"/highest ATK, not "final ATK"),
   evaluated once, never re-targeting. Worth an owner confirmation that the designation is
   static-base-ATK (not final/live ATK re-evaluated as buffs land) and never re-targets mid-fight.
   In practice chime is always the lowest-ATK unit, so `excludeSelf` ON vs OFF is behaviorally
   identical either way.
2. **SMG cadence tuple.** The 20/s-vs-24/s SMG fire-cadence question is engine-wide and documented in
   the SSOT, not a chime finding — `maxAmmoPct` stretches whatever cadence the engine ships.
3. **Optional strengthening (not a gap).** S2b's suggested reload-economy A/B for `maxAmmoPct` (prove
   the 20% mag stretch raises shots-fired/lowers reloads) was recorded by the driver as a nice-to-have
   strengthening; the per-cast-count assertion already discriminates king-only targeting and skips.
