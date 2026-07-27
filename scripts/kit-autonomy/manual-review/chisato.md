# Manual review — `chisato` (Chisato)

**Gauntlet verdict:** GO (cross-family corroborated) · **faithfulness 1.0** · **Tier 2**
**Date:** 2026-07-25 · **Driver:** Qwen · **Blind roles:** claude-fable-5 (S2b) / claude-opus-5 (S5/S6/S7)

Iron SMG Burst-III Attacker (Abnormal). A self-contained self-buff attacker built on a personal
**Extrasensory** meter: filled to 100% at battle start, drains 1%/2s (0.5%/s), and her own burst
recharges it to 100%. Three nested charge tiers (>70% ATK ▲53.69%, >55% True Damage ▲48.62%,

> 25% Hit Rate ▲22.37%) lapse in order as the meter drains (≈60s/90s/150s from full). S2 opens a 10s
> true-damage window on her normals each burst and fires a 472.18%-of-final-ATK true rider every 48
> normals; the burst also grants ATK ▲73.16%/10s. In a bursting comp (casts ≲40s < the 60s ATK fuse)
> all three tiers stay permanently refreshed.

## Line inventory (10 lines)

| Line                                   | Encoding                                                                                                   | Disposition    |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------- |
| S1 battle start → Extrasensory to 100% | folded into the fused-passive trajectory (frame-0 apply); currency bookkeeping                             | DOCUMENTED_GAP |
| S1 at 100%: Invulnerable 2 sec         | UNMODELED verbatim (boss-inert; C2 pins the exact self-buff stat set)                                      | DOCUMENTED_GAP |
| S1 >70%: ATK ▲53.69%                   | `passive`/self/atkPct 53.69 `durationSec 60` + `burstCast` refresh                                         | FAITHFUL       |
| S1 >55%: True Damage ▲48.62%           | `passive`/self/trueDamagePct 48.62 `durationSec 90` + `burstCast` refresh                                  | FAITHFUL       |
| S1 >25%: Hit Rate ▲22.37%              | `passive`/self/hitRatePct 22.37 `durationSec 150` + `burstCast` refresh (feeds SMG core rate via acrForHR) | FAITHFUL       |
| S1 every 2s: Extrasensory ▼1%          | folded into the 60/90/150s fuse derivation; currency bookkeeping                                           | DOCUMENTED_GAP |
| S2 on burst: normals true damage 10s   | `burstCast`/self `weaponSwap` damagePct 10.12 / 10s / `trueNormals:true` (takina precedent)                | FAITHFUL       |
| S2 after 48 normals: 472.18% true      | `hitCount:48`/enemy `flatDamage` atkPct 472.18 `flavor:'true'` (no core)                                   | FAITHFUL       |
| Burst: Charges Extrasensory to 100%    | folded into the skill1 `burstCast` refresh; C6 pins the burst slot to exactly {atkPct}                     | DOCUMENTED_GAP |
| Burst: ATK ▲73.16%/10s                 | `burstCast`/self/atkPct 73.16 `durationSec 10`                                                             | FAITHFUL       |

## Cross-family convergence

- **S2b (fable) test-faithfulness review:** independently re-derived the SAME Extrasensory decay model
  (60/90/150s lapse ladder + burst recharge), the trueNormals flavor conversion (burstCast, takina
  precedent), the hitCount-48 → 472.18% true rider, and burst ATK 73.16/10s. Its BIGGEST flagged trap —
  the calibration-invisible _permanent-passive hardcode_ — is exactly what the driver's C1 `cfNoRefresh`
  / `cfPermanent` counterfactuals discriminate.
- **S5 (opus) blind test:** authored from prose alone (leakDetected null). Run against the driver's
  SHIPPED override: **35 passed / 1 skipped** (the invuln GAP) = GREEN. Needed four schema-only
  adaptations to run (array-shaped override slots; `durationShots` null-not-undefined; no `'core'`
  damage bucket → read the per-hit `coreRate` field; weapon-state over-model guard re-scoped holder→
  caster because controlComp teammates legitimately buff chisato) — all documented inline in
  `blind/chisato.adapted.test.ts`, none changes an assertion's intent.
- **S6 (opus) blind override:** independently chose the SAME mechanics with a more literal encoding —
  a real `extrasensory` resource pool + interval-2s resourceGated tier buffs + interval decay + burst
  recharge. **Most tellingly, it independently reached for the same trueNormals weaponSwap (damagePct
  10.12/10s/burstCast) and the same hitCount-48 → 472.18% flavor:'true' rider** — the two lines where an
  unforced alternative existed. It set `crit:true` on the rider explicitly (reading the engine the way
  the code actually behaves) and flagged the swap mag-refill as a ⚑ to verify (RESOLVED: no refill).
- **S7 (opus) reconciling judge:** **GO, faithfulness 1.0, discriminationOk true, zero REAL-GOTCHA.**
  10/10 lines FAITHFUL or DOCUMENTED_GAP. Ruled the fused-passive encoding trajectory-EXACT (the pool is
  monotone-decreasing between full refills, so a duration timer is isomorphic to it — and slightly more
  faithful than S6's interval tiers, which are cold for the first ~2s).

## The two documented gotchas (neither an override defect)

1. **ENGINE / med — true-damage crit/core doc-vs-code inconsistency.** The SSOT docs and DECISIONS.md:554
   assert a landed `crit && !trueFlavor` guard making true damage crit-exempt, but **no such guard is in
   sim.ts on this branch** (`git log -S '!opts.trueFlavor'` is empty; swap normals hardcode `crit:true`
   at sim.ts:2843; flatDamage uses `crit:e.crit!==false` at sim.ts:1844). Chisato's true swap normals AND
   her 472.18% true rider are therefore crit+core eligible in the shipped engine (probe-confirmed),
   matching open-questions.md:481 ("true-damage-window normals RETAIN core+crit — MEASURED, faithful").
   **No override change** — the encoding (trueNormals / flavor:'true') is faithful; crit/core routing of
   true damage is the engine's domain. **Owner action:** decide whether the 2026-07-21 guard was
   deliberately reverted or lost, then make code and docs agree in ONE direction (re-land the guard, or
   supersede the DECISIONS/SSOT claim toward open-questions.md:481's measured retention) — do NOT pick
   whichever flatters the board. The override note's stale "crit OFF / crit&&!trueFlavor guard" and "swap
   mag-refill optimism" claims were corrected in S3.
2. **FIDELITY / low — Extrasensory modeled as fused passives, not a literal resource pool.** Isomorphic
   for every reachable state (fuse lengths are exact: 100→70 at 60s, →55 at 90s, →25 at 150s at 1pt/2s).
   **Nothing to change now.** Migrate to the S6-style `resources` pool only if a source ever moves
   Extrasensory by anything other than a refill-to-100 (a partial charge, a drain buff, or a status
   consumer reading "Dodging Bullets") — the single condition under which the isomorphism breaks.

## Residual ⚑ (measurement-gated, NOT faithfulness errors — owner spot-check cluster)

- **Core-on-true-damage in game** (the SMG coreMult-250 lever) — still unmeasured. Recipe: a popup read
  inside one 10s post-burst window counting red "CORE HIT" popups on her normals vs a matched
  out-of-window stretch. The driver's C3 ⚑ pin locks current engine behaviour (crit/core ON) so any
  future guard fails loudly rather than silently moving the board.
- **HR→core CONVERSION magnitude** — the engine-global UNIGEO ⚑ (DECISIONS 2026-07-22); direction-only
  asserted, correctly unpinned by both test suites.
- **Cadence tuple** (SMG pullsPerSec / reloadFrames 81 / rolling-reload) — datamine estimates; no
  assertion pins an absolute shot count off the nominal rate (effective 20/s = 60/ceil(60/24),
  frame-quantized).
- **Same-model residual (judge-flagged):** S5's negative-space clause "no swapped shots (no weaponSwap
  in the kit)" reported GREEN against a weaponSwap-carrying override — that clause is vacuous (the `shot`
  event has no `swapped` field). The kit-side question it gestures at ("is weaponSwap the right channel?")
  is settled the other way by S6 independently reaching for the same primitive and by the schema exposing
  no other trueNormals channel. The driver's own C2/C6 exact-stat-set pins carry the over-model coverage.

## Board

ratio **0.975** (OK, within ±3%, recordings 0.96/0.98/0.99, residual ±1.4%). BEFORE == AFTER: the S3
edit was documentation-only (note addendum + verbatim unmodeled + corrected caveat) — **no effect block
changed**, so the sim output is unchanged. This was a validation-only gauntlet certifying the existing
faithful encoding.

## Artifacts

- Driver test: `scripts/tests/units/chisato.test.ts` (20 assertions, C1–C6, frame-paired flavor gate)
- Override: `src/skills/overrides/chisato.json`
- Blind: `scripts/kit-autonomy/blind/chisato.{test.ts,adapted.test.ts,override.json}`
- Reviews/results: `scripts/kit-autonomy/reviews/chisato.{test-review.json,verify.txt}`,
  `scripts/kit-autonomy/results/chisato.json` (binding judge verdict)
- Cross-family packets: `scripts/kit-autonomy/cross-family/chisato/`
