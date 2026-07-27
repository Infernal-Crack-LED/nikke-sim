# Manual review — `isabel` (Isabel, SG / Attacker / Electric / Burst III)

**Gauntlet date:** 2026-07-25 · **Binding verdict:** GO · **Faithfulness:** 1.0 · **Tier:** 2 (escalating / scoped-buff + burst-count staging + fullBurstExtend rotation) · **Convergence:** GREEN (cross-family corroborated)

## What the kit does (owner sanity-check)

Isabel is an Electric shotgun Attacker on Burst III who builds a personal "Marked Target" stage every time she fires her **own** burst. Her 1st burst gives herself +6.26% Critical Rate for 45s, her 2nd adds +18.03% Critical Damage, her 3rd adds +17.28% ATK — each stage keeps the earlier ones, and because the buffs last 45s against a 40s burst cooldown, all three stay up permanently once she reaches stage 3 (~her 3rd burst). Separately, a passive skill drops a single 170.58%-of-ATK hit on the highest-DEF enemies roughly every 15s all fight long, independent of her burst. Her burst deals 149.85% of ATK to all enemies and its payload grows with her Marked Target stage: stage 1 also puts a 39.96% Damage Taken debuff on the boss for 5s (a whole-team benefit), stage 2 adds a 299.7% hit, stage 3 a further 349.65% hit on top. The catch: her burst also shortens Full Burst by 5s for every ally — a genuine team downside that trades window length for a faster rotation.

## Line-by-line (all FAITHFUL / one DOCUMENTED-GAP)

| Line                                   | Disposition    | Encoding                                        | Discriminator                                                                                                 |
| -------------------------------------- | -------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| S1 MT1 critRate 6.26/45s self          | FAITHFUL       | burstCast → self → escalating step 1            | generic critRatePct (lifts skill bucket) vs critRateNormalPct; burstCast (7 casts) vs fullBurstEnter (13 FBs) |
| S1 MT2 critDmg 18.03/45s self          | FAITHFUL       | escalating step 2                               | ladder count casts-1; cfS1NoEscalate drops it                                                                 |
| S1 MT3 ATK 17.28/45s self              | FAITHFUL       | escalating step 3 (caps, no wrap)               | ladder count casts-2; atkPct not casterAtkPct                                                                 |
| S2 170.58% periodic single hit         | FAITHFUL       | passive(t=0) + interval:15 flatDamage crit:true | 12 hits/180s; cfS2NoT0 → 11; one hit not ×5; never cores/range                                                |
| Burst 149.85% nuke                     | FAITHFUL       | burstCast → enemy flatDamage                    | fbMajorApplied false (cast precedes FB); critEligible true (engine default)                                   |
| Burst MT1 damageTakenPct 39.96/5s      | FAITHFUL       | escalating step 1, boss debuff (targetIdx null) | count == casts (post-increment); CF-C lifts teammates                                                         |
| Burst MT2 299.7% additional            | FAITHFUL       | escalating step 2                               | casts-1; cfBurstNoEscalate → casts                                                                            |
| Burst MT3 349.65% additional           | FAITHFUL       | escalating step 3                               | casts-2; cfBurstNoEscalate → casts                                                                            |
| Burst Full Burst Duration ▼5s (allies) | FAITHFUL       | fullBurstExtend seconds:-5                      | sub-10s (5s) windows; cfNoExt → none; cfExtSignFlip → 15s                                                     |
| S2 "5 highest-DEF enemies" targeting   | DOCUMENTED-GAP | collapses to the lone partless boss             | unobservable by construction; "12 not 60" guards the ×5 misread                                               |

## Cross-family evidence

- **S2b (claude-fable-5, pre-op):** full convergence on all 9 lines; single FIX watch-flag on the ▼5s line (the "most-droppable" team NERF) — already satisfied by the shipped `fullBurstExtend:-5`. Honored 3 reviewer flags (explicit burstCast-vs-fullBurstEnter counterfactual, sign-flip counterfactual, one-hit/no-core/no-range pin).
- **S5 (claude-opus-5, blind test):** 21 pass / 2 legitimate GAP skips / 0 fail vs the shipped override. The blind author wrote against a redacted schema, so the driver adapted ONLY scaffolding (`.blocks`→array, slug-keyed events, 0-based casterIdx vs 1-based position, self-cast constraint, CF-C escalating-step removal) — never the assertions' substance. One blind assertion was **retired, not flipped**: its FB-shortening net-SIGN claim is the unit's documented unverified ⚑ (in this engine the shortener is a net benefit, opposite the blind hypothesis).
- **S6 (claude-opus-5, blind override):** S1 and fullBurstExtend byte-equal; burst nuke 149.85 match; unmodeled empty match. Two well-flagged divergences: (1) S2 cadence blind `sec:10` (⚑ kit-silent estimate) vs driver `15` (MEASURED 2026-07-16) — coefficient matches; (2) burst riders blind stage-gated (3 blocks) vs driver `escalating` (1 block). The blind model **itself** named the driver's escalating encoding as the correct fallback — and indeed `burstCast.stage` is the burst TIER (I/II/III), so for a Burst III unit the blind's stage-gating would fire only the 349.65 rider and silently drop MT1/MT2. The judge classified this a RECON_ERROR favouring the driver.
- **S7 (claude-opus-5, binding judge):** GO, faithfulness 1.0, discriminationOk true, convergence GREEN.

## Resolved gotcha

The judge's one LOW FIDELITY flag — burst-bucket crit-eligibility (149.85/299.7/349.65) neither set nor pinned, with the note's stale "no crit" wording contradicting the formula SSOT — was resolved: the engine's `flatDamage` default is crit-on, so all three are `critEligible:true` at `critRate 0.213` (sheet 15% + MT1 6.26%), `coreEligible:false`, with no explicit flag needed. Two test pins added (20 tests total) and the note corrected.

## Residual ⚑ (documented, NOT asserted — owner spot-check cluster)

1. **fullBurstExtend:-5 net rotation sign** — the per-cycle FB shortening vs faster burst re-cycle is unverified; in this engine/fixture it nets positive, but the sign is a `/sim-battery` board-diff question, not a kit-faithfulness gap. Pull if it spuriously net-harms the board.
2. **SG cadence tuple** — pullsPerSec (SG class default 1.5) / reloadFrames 133 / rolling-reload are datamine-unreliable (always-⚑); inert to kit-line faithfulness.
3. **Marked-Target 45s stage reset** — a possible in-game reset when the 45s mark expires (burst spacing > 45s) is not modeled; inert in this fixture (45s durations > 40s CD, all three hold at steady state).
4. **S2 team-fight period** — the ~14.7s period is a solo measurement; whether it holds in team fights is unverified.
5. **Same-model residual** — S5/S6/S7 are all claude-opus-5 (agreement proves stability, not correctness); the genuinely cross-family signal is the claude-fable-5 S2b review, which converged on all 9 lines.

## Artifacts

- Driver spec: `scripts/tests/units/isabel.test.ts` (20 tests, GREEN vs shipped)
- Override: `src/skills/overrides/isabel.json`
- Blind test: `scripts/kit-autonomy/blind/isabel.test.ts` (21 pass / 2 skip vs shipped)
- Blind override: `scripts/kit-autonomy/blind/isabel.override.json`
- Results: `scripts/kit-autonomy/results/isabel.json`
- Cross-family packets/results: `scripts/kit-autonomy/cross-family/isabel/`
- Reconciliation: `scripts/kit-autonomy/reviews/isabel.test-review.json`
