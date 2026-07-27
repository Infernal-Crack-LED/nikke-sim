# Manual review — `arcana` (BASE Arcana, RL / Supporter / Electric / Burst II)

> Kit-autonomy gauntlet 2026-07-24. **Verdict: GO (cross-family corroborated)** · faithfulness **1.0** · tier **2**.
> ⚠ EXACT SLUG: this is base `arcana` (RL/Electric/B2) — **not** `arcana-fortune-mate` (SG/Fire/B2). The two share a base name; the slug-disambiguation lint flags bare "Arcana" as ambiguous. Everything here reasons from `characters.arcana`.

## What the kit does (owner sanity-check, from the binding S7 judge)

Arcana is a Burst II Electric supporter whose entire payload lands on the tail of the team's Full Burst rather than inside it. Her own burst nukes the boss for 300% of her final ATK, leaves the boss taking 10% more damage for 10s (Judgement), and puts every Electric ally — herself included — into the Wheel of Fortune status with a 10% attack-damage buff. On any rotation where she personally burst (Wheel of Fortune is live on her), the moment Full Burst ends she pours an enormous package into whichever Burst III Electric ally cast their burst that rotation: +180% attack damage and a flat ATK grant worth 180% of her own ATK, both for 15s, plus a 75% cut to that ally's Skill 2 cooldown. On those same rotations the whole team gets 6 seconds off their burst cooldowns and a flat ATK grant worth 50% of hers for 5s. Two smaller lines are unconditional and fire after every Full Burst regardless: a flat ATK grant worth 5% of her ATK for 10s and +7.5% attack damage for 10s, both to all allies. She is a rotation-shaped unit: without a Burst III Electric partner her two biggest numbers have no legal target and do literally nothing.

## Line-by-line disposition (driver ⇄ S2b fable ⇄ S6 opus — all converge)

| Line                                                               | Disposition                                                   | Encoding                                                                                                                                                                                          |
| ------------------------------------------------------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1 The Magician: S2 CD ▼75% / 15s                                  | **DOCUMENTED-GAP** (UNMODELED verbatim)                       | no skill-CD primitive; S2 is event-keyed to FB-end so a CD cut has nothing to act on. All three agents independently refused to call it inert — it is a real, large uplift the sim under-credits. |
| S1 180% AD / 15s (B3 Electric casters, WoF-gated)                  | **FAITHFUL**                                                  | `fullBurstEnd` + `ownBurstGate:'cast'`, target `burstCasters{stage:3,element:Electric}`, `attackDamagePct 180/15s`                                                                                |
| S1 5% casterATK / 10s (all allies, ungated)                        | **FAITHFUL**                                                  | `fullBurstEnd`, target `allies`, `casterAtkPct 5/10s`                                                                                                                                             |
| S2 Strength 180% casterATK / 15s (B3 Electric casters, WoF-gated)  | **FAITHFUL**                                                  | `fullBurstEnd` + `ownBurstGate:'cast'`, `casterAtkPct 180/15s`                                                                                                                                    |
| S2 Death: burstCdr 6s + 50% casterATK / 5s (all allies, WoF-gated) | **FAITHFUL** (burstCdr effect = low-severity residual, below) | `fullBurstEnd` + `ownBurstGate:'cast'`, `burstCdr 6` + `casterAtkPct 50/5s`                                                                                                                       |
| S2 7.5% AD / 10s (all allies, ungated)                             | **FAITHFUL**                                                  | `fullBurstEnd`, target `allies`, `attackDamagePct 7.5/10s`                                                                                                                                        |
| Burst Wheel of Fortune 10% AD / 10s (Electric allies)              | **FAITHFUL**                                                  | `burstCast`, target `alliesOfElement Electric`, `attackDamagePct 10/10s`                                                                                                                          |
| Burst 300% final ATK damage (all enemies)                          | **FAITHFUL**                                                  | `burstCast`, target `enemy`, `flatDamage atkPct 300` (FB-exempt, burst-cast)                                                                                                                      |
| Burst Judgement 10% damage taken / 10s (all enemies)               | **FAITHFUL**                                                  | `burstCast`, target `enemy`, `damageTakenPct 10/10s` (boss-held, casterIdx=null)                                                                                                                  |

All level-10 magnitudes confirmed against the datamine (`description_value_list` index 9): S1 180/5, S2 180/6/50/7.5, burst 10/300/10.

## THE FIX (the one substantive change from parser-baseline — owner attention)

The parser-baseline gated the three Wheel-of-Fortune lines (S1 180% AD, S2 Strength, S2 Death) with a round-count proxy `everyN:2 offset:1` on `fullBurstEnd`. The gauntlet replaced it with `ownBurstGate:'cast'`.

**Why the proxy was unfaithful (reproduced, not inferred):**

- "if self is in Wheel of Fortune status" reduces to "arcana cast her burst this rotation" — she is the **sole** source of Wheel of Fortune (her own burst grants it to Electric allies including herself).
- A _literal_ 10s buff-aliveness check at FB-end is **dead-by-epsilon**: cast → FB opens → ~10s FB → FB-end is >10s after the cast, so the WoF buff has expired by FB-end. A literal reading would zero the entire gated half of the kit, contradicting that it works in game.
- The round-count proxy was wrong in **both** directions:
  - **OVER-fire:** in `[liter,crown,arcana,ada,helm]` arcana casts **0** bursts (crown cd20 contests the B2 slot), yet the proxy fired the gated 180% AD **6×** and Death-50% **30×** — she is never in Wheel of Fortune, so these should be inert.
  - **UNDER-fire:** in `[liter,arcana,ada]` (sole B2, bursts every rotation) the proxy fired the gated lines on only `ceil(FB/2)` FB-ends — she is in Wheel of Fortune _every_ rotation.
- `ownBurstGate:'cast'` is correct in both regimes (measured: 0 firings at 0 casts; every FB-end when she casts every rotation).
- **Engine code-verified:** `sim.ts:2246` fires `fullBurstEnd` triggers **before** `:2252` resets `rotationCasters`, so `ownBurstGate:'cast'` correctly sees this-rotation casters at FB-end (resolves the S6 "modeled ≠ working" concern).
- **Cross-family corroborated:** the fable pre-op reviewer (S2b) and the opus blind override-writer (S6) **independently** derived `ownBurstGate:'cast'` from the prose alone, both naming the dead-by-epsilon trap.

## Residuals for owner spot-check (⚑ — unmeasured, documented in the override note)

1. **Wheel-of-Fortune window timing.** "cast this rotation" is the logically-necessary gate semantic, but the precise WoF buff-duration overlap with FB-end is not recorded. Recipe: record a fight with arcana + a B3 Electric ally; on a rotation she bursts, watch the ally's buff bar at the FB-end frame for the 180% grants; on a rotation she does not, confirm they are absent.
2. **Death's 6s burstCdr does not bite in gauge-limited rotations (S7 judge low-severity FIDELITY residual).** The CDR is faithfully encoded and its block provably **fires** (pinned via the observable 50% casterATK sibling), but its **cadence** effect is unproven: arcana's inter-cast interval is identical (43.71s) with and without the CDR in `[liter,arcana,ada]`, because the ~43.5s Full-Burst cycle is gauge-limited and exceeds every ally's (CDR-reduced) cooldown — no ally is CD-bound. The CDR only bites in a CD-limited comp. Recipe: instrument `burstCast` frames / `burstCdFrames` in a comp where an ally's cooldown exceeds the FB cycle.
3. **The 180/180 grants are team-conditional** — inert without a Burst-3 Electric ally who casts. Grade arcana only on such a comp.
4. **Cadence tuple** (ammo 6 / reloadFrames 171 / chargeFrames 60) and RL bolt-recovery are datamined, unmeasured.
5. **"previously cast their Burst Skill" persistence** across rotations is modeled as this-rotation `burstCasters`, unverified against a recording.

## Cross-family provenance

- **S2b** (pre-op test-faithfulness review): `claude-fable-5` — converged on all 10 lines; named the FB-end-vs-enter, casterAtkPct-vs-atkPct, and B3-Electric-target traps.
- **S5** (blind test-writer): `claude-opus-5` — independent 2-fixture test (`blind/arcana.test.ts`); The Magician correctly `it.skip`'d.
- **S6** (blind override-writer): `claude-opus-5` — independent override (`blind/arcana.override.json`) converging on the same blocks and independently choosing `ownBurstGate:'cast'`.
- **S7** (binding reconciling judge): `claude-opus-5` — **GO, faithfulness 1.0, discriminationOk true**, no REAL-GOTCHA.

### S5 blind-test failures — all adjudicated as blind-test artifacts (judge-confirmed against engine facts)

The blind test ran 6 red vs the driver override; the judge confirmed **none** are real divergences:

- **K3 ×2, K4, K5a-ACTIVE** — one root cause: the blind filters `casterAtkPct` buffApply events by the _percentage_ (5/50/180), but the engine stores `casterAtkPct` as an **absolute ATK** value (arcana ATK × pct/100 ≈ 4986.7 / 49867 / 179521). The filters return empty. The driver test pins these lines via magnitude **ratios** (5:50:180 = 1:10:36). (RECON_ERROR.)
- **K5b** — FB-count probe too coarse to cross a boundary on the event-silent burstCdr (see residual 2). Discrimination weakness, not inertness.
- **inertness reloadSpeedPct** — slot-index collision: the forbidden-stat filter reads `casterIdx===1` across the union of both fixtures, and slot 1 in fixture A is **crown**, whose kit (not arcana's) grants reloadSpeedPct. (RECON_ERROR.)
- The highest-leverage S5 assertions whose observable the engine stores as a plain percentage (K2 180% Damage-Up + its no-Electric-B3 inertness discriminator, K6, K7, K8, K9, K10 trigger-identity) ran **unmodified and passed** — so FB-end-vs-enter, Damage-Up-vs-ATK bucket, Electric-only Wheel scoping, FB-exemption on the 300% nuke, and boss-held Judgement are cross-family corroborated.

**Judge's correction to the driver's reconciliation (accepted):** K5a's fixture-A gate discrimination passes _vacuously_ against the old proxy too (the same value-filter bug empties it), so it does **not** corroborate the fix. Gate corroboration properly rests on the driver's **A4** (`attackDamagePct 180`, a true percentage, non-vacuously inert at 0 arcana casts while both the ungated and everyN counterfactuals fire) plus the two blinds' independent derivation. Sufficient, but a narrower base than the driver's §8 claimed.

## Packet-hygiene flag

The S2b `types-redacted.ts` excerpt leaked a name-stripped hint of the B3-Electric gate (a `teamHas` comment whose gate shape matched this unit). The fable reviewer flagged it and derived dispositions from the prose regardless. Worth tightening in `prepare-cross-family-packet.ts` redaction for future runs; did not corrupt this review.

## Verification

- `scripts/tests/units/arcana.test.ts` — **24/24 GREEN** vs the fixed shipped override (two-fixture gate contrast; counterfactuals for the ungated model and the old everyN proxy).
- `validate-overrides arcana` — valid (dmg 28.0M / 8.7%, 4 bursts, 4 ⚑ warnings).
- Base `arcana` is **not** on the accuracy board (MODEL_ONLY, no recording; only the variant `arcana-fortune-mate` is graded) → the gate FIX carries **zero** graded-regression risk and corrects the model ahead of any recording.
