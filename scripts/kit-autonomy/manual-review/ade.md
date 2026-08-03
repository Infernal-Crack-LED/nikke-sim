# Manual review — ade (Ade)

**Gauntlet date:** 2026-08-03
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (status-gate: the S1 HP-below-90% collapse; caster-basis scoped buffs; `burstCast`-vs-`fullBurstEnter`)

> Slug disambiguation: `ade` is the AR/Wind/Supporter/Burst II BASE unit (Tetra, released
> 2024-02-15). NOT `ade-agent-bunny` (SR/Iron/B3, aka "aab"/"bade") — the slug-disambiguation lint
> flags bare "Ade" as AMBIGUOUS; every artifact in this run keys `characters['ade']`.

## Kit summary

Ade is a Wind-element AR Supporter on Burst II (20s CD), a maid-themed team enabler with no damage
kit of her own — she deals only her rifle normals. At battle start she grants all allies immunity to
one debuff (her "Perfect Maid" status, refreshed after every 420 normal attacks) — both lines are
defensive and exactly inert in the v1 scope (the boss applies no debuffs). Whenever her own HP falls
below 90% she gives all allies +5.19% of HER OWN ATK as a flat ATK add for 5s — a gate the sim
cannot evaluate (no ally HP pool), shipped always-on under the mast GO-1.0 precedent. After every
120 normal attacks she raises all allies' Max HP by 15.62% of HER Max HP for 5s without healing, and
her burst does the same shape at 25.15%/10s plus the kit's one load-bearing line: +10.15% of HER ATK
to all allies for 10s. Both Max HP grants are offensively inert (ade has no HP→ATK conversion and
the e3 rule excludes ally-granted Max HP from holders' conversions) — modeled for kit completeness
and proven inert by totals-equality. "Without restoring HP" is honored structurally: no heal effect,
so no on-recovery consumer can proc off her grants.

## Line-by-line

| Line                                                            | Disposition        | Notes                                                                                                                                        |
| --------------------------------------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| S1: battle start → allies Perfect Maid debuff immunity (1/1)    | DOCUMENTED_GAP     | Defensive; v1 boss applies no debuffs; no immunity primitive; verbatim + reason in `unmodeled.skill1` (biscuit / diesel-winter-sweets precedent) |
| S1: own HP < 90% → allies casterAtkPct 5.19/5s                  | DOCUMENTED_GAP (⚑2)| Gate collapsed always-on (`interval:5` refresh, first fire t=5s); mast GO-1.0 precedent governs offensive HP-below gates; S2b's UNMODELED dissent logged as the rejected alternative; recipe = focus-video HP-bar crossing + buff-icon uptime |
| S2: 420 NA → allies Perfect Maid immunity refresh               | DOCUMENTED_GAP     | Same as S1 immunity; verbatim + reason in `unmodeled.skill2`                                                                                   |
| S2: 120 NA → allies casterMaxHpPct 15.62/5s                     | FAITHFUL (inert)   | `hitCount:120` (hitsPerShot 1: pulls == hits, no lever); caster-basis flat uniform across holders; kth-grant-at-120k-pulls pinned; totals-equal when stripped |
| Burst: allies casterMaxHpPct 25.15/10s                          | FAITHFUL (inert)   | One block with the ATK line (one ■ header); uniform caster-basis flat; 10s window pinned; totals-equal when stripped; no heal ⇒ no recovery procs |
| Burst: allies casterAtkPct 10.15/10s                            | FAITHFUL           | The ONLY damage-moving line; flat add of ADE's static ATK (SSOT §1a: "% of caster's ATK" = flat, outside holders' (1+ATK%)); value-ratio pin 10.15/5.19 exact |

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. Converged on 5/6 lines
  (both immunity lines UNMODELED-verbatim; 120-NA casterMaxHpPct inert event-shape; both burst lines
  FAITHFUL with `burstCast` keying). DISSENTED on S1 HP<90% (UNMODELED: trigger unrealizable at
  scope lock; over-credit risk) — recorded in `reviews/ade.test-review.json` as the rejected
  alternative under the mast precedent. Two reviewer recommendations adopted: the co-B2
  discrimination comp (burstCast-vs-fullBurstEnter) and the no-heal structural guard.
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. Original out-of-box vs the driver
  override: RED 12/17 (3 vacuous-green + 2 intentional GAP skips) — **every failure a blind-internal
  RECON_ERROR, none a driver divergence**: B1 `onEvent` placed top-level instead of `cfg.onEvent`
  (all event logs empty); B2 `ov.<slot>.blocks` / per-slot `unmodeled` (wrong OverrideFile shape —
  all counterfactuals silent no-ops); B3 `controlComp('ade')` slots crown ahead of ade, and under
  liter's 8.21s team CDR slot priority hands crown every stage-2 cast (ade cast zero bursts);
  B4 "five allies" in a 4-unit comp; B5 self-scaled counterfactual compared ade's OWN totals
  (identical under both bases by construction) + `unitOf(...).slot` type errors. Adapted
  (`blind/ade.adapted.test.ts`, assertion intents preserved): **GREEN 15/15 + 2 GAP skips**.
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. Converges line-for-line on skill2
  (`hitCount:120` → casterMaxHpPct 15.62/5s), burst (one `burstCast` block: casterMaxHpPct 25.15/10s
  + casterAtkPct 10.15/10s), unmodeled immunity lines, and all four flags. On the contested S1 line
  S6 corroborates the DRIVER (MODELED-always-on with an uptime flag) against S2b's UNMODELED — but
  encoded it `passive` + durationSec 5, which under the engine's fused-passive semantics applies once
  at frame 0, expires at t=5s, and never re-applies: coverage t∈[0,5] only, contradicting its own
  "always-on" caveat (blind-side engine-semantics misread; the driver's `interval:5` refresh keeps
  the window live throughout).
- **S7 (kimi-code/k3, binding judge):** **GO, faithfulness 1.0, discriminationOk:true, zero
  gotchas.** All six lines accounted (3 FAITHFUL + 3 DOCUMENTED_GAP, zero silent drops). Ruling on
  the open question: the driver's S1 encoding is FAITHFUL-as-documented-gap, NOT a REAL-GOTCHA, and
  must not be forced back to UNMODELED — mast precedent governs; biscuit's UNMODELED case is
  distinguishable (defensive, no damage channel); between the two modeled encodings the driver's
  `interval:5` is "strictly more faithful than S6's". Same-model residual flagged for the owner:
  every agent converged MODELED on the HP gate, and convergence proves stability, not correctness —
  the ⚑2 recipe is the one measurement that could still move the line in either direction.

## Residual flags (owner spot-check)

1. **⚑1 cadence tuple** (mandatory): AR RoF 720 / reloadFrames 111 / hitsPerShot 1 shipped
   datamine-unverified — drives the hitCount:120 crossing cadence (~13.7s) and her normals.
   Recipe: rounds/min + reload gap from any ade focus video.
2. **⚑2 HP-gate collapse** (the arbitrated line): always-on assumes near-full uptime below 90% from
   a few seconds in; a healer comp keeping ade above 90% would shrink it (a cover-lucky fight,
   towards zero). Magnitude/duration/scope are kit-exact; only the gate wall-clock is ⚑. Recipe:
   HP-bar crossing times + ATK-buff-icon uptime from an ade focus video.
3. **⚑3 Max-HP grant inertia** is a documented property, not a gap: revisit L4/L5 first if an HP
   pool or a Max-HP consumer ever lands.

## Artifacts

- Driver spec: `scripts/tests/units/ade.test.ts` (23/23 GREEN; fixture liter/ade/ada/helm Fire
  focus ada + co-B2 comp liter/biscuit/ade/ada/helm)
- Override: `src/skills/overrides/ade.json`
- Verdict: `scripts/kit-autonomy/results/ade.json`
- Cross-family: `scripts/kit-autonomy/cross-family/ade/{s2b,s5,s6,s7}-result.json`,
  `scripts/kit-autonomy/blind/ade.test.ts` + `ade.adapted.test.ts` + `ade.override.json`
- Review: `scripts/kit-autonomy/reviews/ade.test-review.json` + `ade.verify.txt`
