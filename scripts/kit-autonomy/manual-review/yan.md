# yan — Yan · kit-autonomy gauntlet 2026-08-05 · GO (faithfulness 1.0)

**Verdict:** GO, cross-family corroborated · **faithfulness 1.0** (binding judge kimi-code/k3, discriminationOk true, no REAL-GOTCHA) · **Tier 1** (no scoped buff / round count / status gate / meta-defining mechanic) · from-scratch build (no prior override; baseline was bare weapon, simSupported:false → true).

RL / Supporter / Fire / Burst I, 20s CD, ammo 6, reloadFrames 141, chargeFrames 90, normalMult 61.3, chargeMultiplier 350, Tetra. P0 disambiguation: slug `yan` is the UNIQUE roster entry with this base name (lint clean; the only other "yan"-matching slugs are rei-ayanami / rei-ayanami-tentative-name, entirely different units).

## Kit summary

A pure team-buffing Burst I support. At every Full Burst opening she hands the whole team Charge Damage ▲21.55% for 10s (pays on her own RL rockets and any RL/SR teammate's charged hits). Every full-charge rocket she fires — which is every shot she takes — refreshes a 5s ATK ▲2.77% + Critical Rate ▲1.33% team buff, so at her ~1.9s cadence both stay up near-permanently (emergent from refresh, not encoded as a passive). Her burst is a single 348.73%-ATK hit landing before the Full Burst window opens (never takes the +50% major), plus a 2s enemy pull that moves nothing at scope lock.

## Line-by-line dispositions

| Line | Disposition | Encoding / reason |
|---|---|---|
| S1 "beginning of Full Burst": allies Charge Damage ▲21.55% / 10s | FAITHFUL | fullBurstEnter → allies chargeDamagePct 21.55 / 10s. "At the beginning of Full Burst" = the FB window opening, NOT her own burstCast (her B1 cast lands strictly before the window — pinned; the counterfactual lands on different frames). chargeDamagePct is the additive charge-bucket stat (SSOT §1d), not chargeDamageMultPct. Pays only on charged hits: yan/ada/helm move on removal, crown (MG, no charge hits) is byte-exact. |
| S2 "performing a Full Charge attack": allies ATK ▲2.77% / 5s | FAITHFUL | shotFired → allies atkPct 2.77 / 5s. Every RL trigger pull IS a full charge (pinned: every `shot` event charged:true; frima precedent for the SR analogue). Plain atkPct (each target's own ATK), not casterAtkPct. No stack counter in the kit → default maxStacks 1: re-fires refresh, never stack (pinned stacks===1; stacking counterfactual diverges). Near-permanent uptime is emergent, not a passive (first apply ≥ first shot, pre-FB, continues out-of-FB — in-FB-gated and passive counterfactuals both diverge). |
| S2 "performing a Full Charge attack": allies Critical Rate ▲1.33% / 5s | FAITHFUL | shotFired → allies critRatePct 1.33 / 5s. UNSCOPED — the kit has no "of normal attacks" qualifier (the inverse of the helm scope trap); pinned by the skill-bucket reach on ada's grenades, which a critRateNormalPct encoding would leave untouched. |
| Burst: 348.73% of final ATK to enemies in attack range | FAITHFUL | burstCast → enemy flatDamage 348.73 (burst bucket; AoE collapses to the single scope-lock boss). Once per own cast (count equality with burstCast events), magnitude exact (nearest-wrong = the level-1 datamine value 172.4), fbMajorApplied false on every nuke (B1 cast precedes the FB window — U10 measured rule), crit-eligible/no-core/no-range per the instant-rider defaults (U1). |
| Burst: forced movement toward the center of attack range, 2 sec | DOCUMENTED_GAP (inert) | Crowd-control PULL on normal enemies; v1 fights a single scope-lock boss with no enemy movement/position model and bosses are not pulled — moves no damage. Carried verbatim in `unmodeled.burst`; explicitly NOT re-encoded as a damage/range buff (would over-credit a benefit the kit does not deliver — viper/phantom/marciana precedent; all three cross-family agents independently converged on this). |

## Cross-family corroboration

- **S2b test review — claude-fable-5** (leakDetected null): converged on all five lines with identical stat choices (fullBurstEnter / shotFired≡FC / atkPct-not-casterAtkPct / UNSCOPED critRatePct / FB-exempt burst flatDamage / CC unmodeled). Named the two traps the driver then pinned: the passive/frame-0 encoding of S2 (added as a test assertion in S2c reconciliation) and the chargeDamageMultPct-vs-additive misread. Its suggested multi-B1 fixture was traded for the single-B1 fixture where cast-vs-enter timing discriminates the same split (frames provably differ).
- **S5 blind test — claude-opus-5**: vs driver override **15 GREEN / 1 documented skip / 0 RED** (the skip is the blind author's own GAP for the forced-movement line — no enemy-displacement primitive). Adaptation was mechanical-only: harness import path from blind/, OverrideFile shape (skill1/skill2/burst are the block arrays), durationShots null-vs-undefined. Zero assertion-semantics changes. Its fixture choice (liter-as-B1 controlComp) was exercised through the adaptation and stayed green.
- **S6 blind override — claude-opus-5**: converged line-for-line — skill1 byte-identical; skill2 chargeCounter{count:1} ≡ shotFired for an always-full-charge RL (the S2b review pre-cleared the equivalence); burst flatDamage adds explicit crit/noRange/noFb, all three the ENGINE DEFAULTS for an instant burst-cast rider (sim.ts U1/U10), so semantically identical. Its ⚑ on the unmeasured cadence tuple is the standard scope-lock basis, not a per-unit residual.
- **S7 binding judge — kimi-code/k3**: GO, faithfulness 1.0, discriminationOk true. 4 FAITHFUL + 1 DOCUMENTED_GAP, every line formula-checked against the SSOT (charge-bucket additive §1d, ATK% term §11, burst-cast pre-FB timing §1b); no REAL-GOTCHA; all S5 greens confirmed against the shipped override.

## Residual flags (owner spot-check cluster)

1. **Burst flight-time convention** (measurement-gated, low): yan's nuke is modeled instant on cast; some roster RL burst nukes carry a measured flight delay. If popup footage ever shows her nuke landing INSIDE the FB window, add delaySec and drop the noFb default. Recipe: banner-to-popup frame read on a yan-focused recording.
2. **Cadence tuple** (basis-level, low): chargeFrames 90 / reloadFrames 141 are the datamined scope-lock basis, unmeasured per-unit — bounds how precisely the S2 5s-refresh uptime is known (near-permanent at any plausible cadence).
3. **Forced-movement line** remains unmodeled-verbatim; if an enemy-position model ever lands, the line's owner is `unmodeled.burst`.

## Artifacts

- Driver: `src/skills/overrides/yan.json` (validate-overrides PASS: dmg 51.6M, bursts 8, 0 warnings) · `scripts/tests/units/yan.test.ts` (21/21 green, deterministic)
- Reviews: `scripts/kit-autonomy/reviews/yan.test-review.json` (S2b) · `reviews/yan.verify.txt` (S2d)
- Blind: `scripts/kit-autonomy/blind/yan.test.ts` (S5 verbatim) + `blind/yan.adapted.test.ts` (mechanical adaptation, 15G/1skip/0R) · `blind/yan.override.json` (S6)
- Judge: `scripts/kit-autonomy/results/yan.json` (S7, verdict + faithfulnessScore top-level) · `cross-family/yan/*.json` (all dispatch results)
