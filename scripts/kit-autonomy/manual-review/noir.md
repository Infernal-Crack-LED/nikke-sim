# noir (Noir) — kit-autonomy gauntlet manual-review

**Date:** 2026-07-25 · **Driver:** qwen · **Verdict:** **GO (cross-family corroborated)** · **Faithfulness:** 1.0 (S7 judge) · **Tier:** 2

SG / Attacker / Wind / Burst III, cd 40s, ammo 9, hitsPerShot 10 (pellets), normalMult 204.6. A
team-wide ATK + ammo battery: a permanent caster-scaled ATK aura, a Full-Burst-entry ammo package
(+5 rounds / 39.88% refill to all allies), a 351.64% burst nuke, and two Hit-Rate/Parts buff
packages (one SG-scoped, one same-squad-gated). noir is also the SG-landing-table calibration
anchor — all pellet/landing magnitudes live ENGINE-side (SG_LANDING_BY_BAND), never in this override.

## Cross-family chain

| Role                         | Model          | Artifact                        | Outcome                                                                                                    |
| ---------------------------- | -------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| S2b test-faithfulness review | claude-fable-5 | `reviews/noir.test-review.json` | converged on all 8 load-bearing lines; nearest-wrongs map 1:1 to driver counterfactuals                    |
| S5 blind test writer         | claude-opus-5  | `blind/noir.test.ts`            | **19 PASSED / 3 skipped / 0 FAILED** vs the driver's SHIPPED override (independent corroboration)          |
| S6 blind override writer     | claude-opus-5  | `blind/noir.override.json`      | block-for-block **identical** on every stat/value/trigger/target/duration (2 non-finding diffs, see below) |
| S7 reconciling judge         | claude-opus-5  | `results/noir.json`             | **GO 1.0**, discriminationOk:true, gotchas:[]                                                              |

## What is verified faithful (pinned by `scripts/tests/units/noir.test.ts`, 18 assertions GREEN)

- **N1** S1 ATK ▲14.08% **of the skill user's ATK** = `casterAtkPct`: a FLAT add of noir's ATK
  (≈0.1408×staticAtk ≈ 16.8k), identical on every ally, present from frame 0 with no expiry
  (constant passive). Discriminated against `atkPct` (which would emit the raw 14.08 and scale each
  ally's OWN ATK) — the encoding pin plus a damage delta vs the counterfactual.
- **N2** S2 Max Ammunition Capacity ▲5 rounds / 10s to all allies on `fullBurstEnter`. Pinned at
  **FRAME level**: the +5 grant lands on the Full-Burst-ENTRY frame (measured 400), 22f after noir's
  burstCast frame (378); the `burstCast` counterfactual lands on 378 instead. Target "all allies"
  discriminated against a self-only counterfactual (4 holders vs 1).
- **N2b** S2 Reload 39.88% magazine(s) = `instantReload fraction 0.3988` to all allies on
  `fullBurstEnter`. The engine snaps ammo silently (sim.ts:2105 emits no event), so pinned
  structurally (kind/fraction/trigger/target read off the shipped file) AND behaviourally (stripping
  it perturbs the team's realized reload cadence).
- **N3** Burst: Hit Rate ▲13.93% / Parts ▲23.23% for 10s to **allies WITH A SHOTGUN only**
  (`alliesOfWeapon SG`). Comp A carries 2 SG (noir+guilty) + 2 non-SG (liter/crown), so the scoping
  is discriminated by target SET (noir+guilty only), not mere cardinality.
- **N4** Burst nuke 351.64% of final ATK to all enemies on `burstCast`: one burst-bucket hit per
  cast, `fbMajorApplied false` on every instance (the cast lands before the FB window opens — the
  engine auto-exempts burst-cast damage; no `noFb` needed).
- **N5** Burst: same-squad-gated Hit Rate ▲11.61% / Parts ▲19.36% for 30s to all allies
  (`teamHas {slugs:[blanc,rouge]}`). Proven in **both directions**: INERT in comp A (no blanc/rouge —
  zero 11.61 applies), FIRES to all 4 allies for exactly 30s in comp B (blanc aboard), and the
  ungated counterfactual fires in comp A (the gate does real work, not vacuously matching).
- **N6** Both `partsDamagePct` lines (23.23 / 19.36) are **exactly inert** vs the partless scope-lock
  boss — byte-identical totals for every unit with all parts lines stripped. This simultaneously
  excludes the `attackDamagePct` mis-bucket (a generic +23.23% Damage-Up could not be damage-neutral).

The S6 blind override is block-for-block identical to the driver on every load-bearing line; the S5
blind test (written from prose alone) passes unmodified against the shipped override — the meaningful
cross-family evidence, beyond same-model agreement.

## Non-findings adjudicated by the S7 judge (the only two S6 diffs)

1. **`noFb:true` + `crit:true` on the 351.64% flatDamage** (blind set both; driver sets neither).
   Behaviourally redundant: the driver's N4 MEASURED `fbMajorApplied false` on every nuke instance
   without `noFb` (matching the SSOT burst-cast timing rule), and function-type damage crits at the
   caster's rate by default. The driver's omission is correct, not a drop.
2. **`teamHas.slugs:[]`** (blind) vs `[blanc,rouge]` (driver). A self-flagged blind DATA gap (the
   blind had no access to characters.json squad fields), authored honestly inert with the exact
   recipe the driver executed to reach `[blanc,rouge]` (noir's Rabbit Twins squadmates; owner-ruled
   real 2026-07-20). The gate STRUCTURE is identical; this is not a modeling disagreement.

## Residuals (owner spot-checks — ranked by the S7 judge, none blocking)

1. **S2 same-frame refill ORDERING** (low, documented not pinned). Does the 39.88% refill resolve
   against the RAISED 14-round cap (≈5.6 rounds) or base 9 (≈3.6)? The override note documents
   capacity-then-reload (refill against the raised cap during the 10s window), but the engine's ammo
   snap emits no event (sim.ts:2105), so it is not behaviourally pinned. A real shots-fired quantity.
   **Action:** if an ammo-counter observable is added, read an ally's ammo before/after the FB banner
   and check the delta against 0.3988×9 vs 0.3988×14.
2. **hitRatePct → core-lift MAGNITUDE** (⚑3, measurement-gated, out of scope). The kit percentages
   (13.93 / 11.61) are verbatim and route through the engine's calibrated `hrCoreMult` (CONE_DELTA);
   the resulting core-rate lift is measured-only. These tests pin the buff's presence/target/duration,
   not a damage delta from it. **Action:** HR-on vs HR-off per-mag core-fraction deltas on an HR-clean
   SG anchor.
3. **Cross-family breadth** (informational). S5/S6/S7 are one model family (claude-opus-5); only S2b
   is cross-family (claude-fable-5, which independently returned GO with the same 8 FAITHFUL
   dispositions). The strongest cross-family signal is that the S2b reviewer's nearest-wrong list maps
   1:1 onto the driver's counterfactuals.
4. **Condition clauses not encoded** (deliberate, documented). The S1 "above 70% HP" gate and the
   burst "still on the battlefield" liveness clause are trivially satisfied at scope lock (partless
   immortal boss, no deaths) and are documented in the override note — the load-bearing halves
   (caster-scaled ATK; squad MEMBERSHIP via teamHas) ARE encoded.

## Provenance / board

- Override edit this pass: **note-only** (gauntlet provenance appended). No behavioral change; the
  parser-baseline banner is retained (the unit is kit-faithful but NOT yet measured/tuned).
- Board reading unchanged: ratio **0.894** (COLD, band 0.89–0.90), tier MODEL_ONLY, tuned:false,
  graded 1 team / 0 within 3%. The 0.894 reflects the partless-boss inertness of ~⅓ of her burst text
  (the Parts lines) — EXPECTED, not a modeling error to tune away.
- `simSupported:true` already set in data/characters.json (unchanged).
