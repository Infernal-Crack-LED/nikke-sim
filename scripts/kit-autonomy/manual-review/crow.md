# Manual review — crow (Crow)

**Gauntlet date:** 2026-08-04
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 1 (no scoped buffs, no round counts, no status gates among the modeled lines; two flat damage lines + one inert self DEF buff + one inexpressible enemy debuff)

> Slug disambiguation: `crow` IS the base SMG/Fire Defender (resource_id 110, Burst III, Missilis,
> "Killing Time" / "Daredevil" / "The Terrorist"). The only near-namesake is `crown` (the MG/Iron
> Burst II Defender) — a different unit; the slug-disambiguation lint returned clean. FROM-SCRATCH
> gauntlet: no shipped override existed before this run (`simSupported` was false); the override was
> authored as the faithful encoding under test (novel precedent) and every assertion pins a kit line
> GREEN vs it and RED vs the nearest-wrong counterfactual.

## Kit summary

Crow is a Fire SMG Defender on Burst III (cd 40s). Her damage footprint is two flat instances plus
an inert stat buff: every time her 120-round magazine fires dry ("when the last bullet hits the
target"), she lands a bonus hit worth 89.09% of final ATK on the target and grants herself DEF
▲12.72% for 5s; her burst deals one large hit — 915.75% of final ATK — to "the enemy with the
highest final ATK", cast before the Full Burst window opens. Her Skill 1 ("entering Full Burst →
all enemies ATK ▼19.93% for 10s") is a purely defensive enemy debuff with no channel in the DPS sim
(the engine admits only boss damageTaken/distributed amplifiers; enemy ATK▼ is dropped at dispatch
and the immortal DEF=0 boss deals no damage), so it rides verbatim in `unmodeled` with the skip
proven damage-neutral by the unit spec. At her quantized 20 shots/s SMG cadence the magazine cycles
every ~8s, so the last-bullet lines fire ~20+ times per 180s fight; sharing the B3 slot with the
fixture's helm she casts ~5 bursts.

## Line-by-line

| Line                                                                       | Disposition      | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| -------------------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1: entering Full Burst → all enemies ATK ▼19.93%, 10s                     | DOCUMENTED_GAP   | No sim channel: the enemy-buff branch of `applyBlock` admits only `damageTakenPct`/`distributedDamagePct` > 0; enemy ATK▼ is dropped at dispatch (sim.ts:2295) and emits no buffApply; the DEF=0 boss deals no damage, so the line moves nothing observable (exia precedent). Verbatim in `unmodeled`; proven damage-neutral — C4 enacts the line anyway through the only available encoding and asserts byte-identical totals + zero buffApply. Never fudged into a boss damageTakenPct amp (S2b's named nearest-wrong).                                       |
| S2: last bullet hits → the target: 89.09% of final ATK additional damage   | FAITHFUL         | `lastBullet` (fires when the magazine is dry — sim.ts:3930, the literal "last bullet" condition; once per ~8s cycle) → enemy `flatDamage` 89.09, skill bucket, srcSlot skill2. Function-damage conventions pinned: crit-eligible at caster rate, never cores (text states no core strike), never takes the +30% range bonus, FB by proc timing. C1 frame-pairs every rider to the exact `ammoAfter === 0` shot, both directions; the shotFired counterfactual over-fires >5×.                                                                                   |
| S2: last bullet hits → self DEF ▲12.72%, 5s                                | FAITHFUL (inert) | `lastBullet` → self `defPct 12.72 / durationSec 5` — faithfully encoded rather than silently dropped (diesel/sakura/bay precedent), damage-inert in v1 (self DEF never feeds own damage; boss deals no damage). C2 pins the 300-frame windows frame-paired with the rider, self-scoped, and proves inertness (byte-identical totals with the block removed) plus bite (a DEF-as-ATK misread moves totals).                                                                                                                                                      |
| Burst: highest-final-ATK enemy: 915.75% of final ATK as Burst Skill damage | FAITHFUL         | `burstCast` → enemy `flatDamage` 915.75, burst bucket; the highest-final-ATK targeting clause collapses to the single scope-lock boss (exia/novel precedent). Cast lands BEFORE the Full Burst window opens (verified fact 2026-07-13): every nuke `fbMajorApplied:false`, one per crow cast on her own cast frames, and strictly fewer nukes than team `fullBurstStart` events (helm takes rotations). Counterfactuals: fullBurstEnter keying fires one nuke per team FB entry and collects the +50% major; level-1 magnitude 541.12 pinned apart from 915.75. |

## Cross-family corroboration

All four roles ran cross-family; artifacts under `scripts/kit-autonomy/` (reviews/crow.test-review.json,
blind/crow.{test.ts,adapted.test.ts,override.json}, results/crow.json).

| Role              | Model (from result JSON) | Outcome                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S2b test review   | claude-fable-5           | Converged on all four lines (`leakDetected: null`): S1 UNMODELED-verbatim (explicitly forbade "upgrading" it to a boss damageTakenPct amp), rider lastBullet per-magazine never-core/never-range, self defPct kept-not-dropped, burst on own burstCast never fullBurstEnter. Driver adopted two reviewer pins: rider core/range asserts + nuke-count-vs-fullBurstStart count. Its notes predicted exactly the misread S5 later produced. |
| S5 blind tests    | claude-opus-5            | Pristine artifact could not collect against the shipped harness (wrong import path + a `ov.<slot>.blocks` override shape that does not exist); adapted copy with 8 documented structural corrections (intent unchanged) runs **20 GREEN / 3 RED / 3 skipped** vs the driver override. The 3 RED are all the S1 "boss-held ATK-down buffApply" expectation — S5 assumed an engine capability that does not exist.                         |
| S6 blind override | claude-opus-5            | Block-for-block IDENTICAL to the driver encoding (skill1 []; lastBullet rider 89.09; lastBullet self defPct 12.72/5s; burstCast nuke 915.75). Its audit independently ruled S1 unmodelable for the same reason as the driver ("the schema's only enemy-facing stat is damageTakenPct (a different mechanic)... Recorded verbatim in unmodeled"). Only ⚑: the SMG cadence tuple (proc COUNT per fight — base-stats-owned).                |
| S7 judge          | kimi-code/k3             | **Binding verdict GO, faithfulness 1.0, discriminationOk, gotchas []**. Ruled the S1 divergence a blind-side RECON_ERROR: "the line is inexpressible, not dropped" — S2b predicted the misread, S6 independently matched the driver, and the driver's C4 counterfactual proves even a fully authored enemy ATK▼ block emits nothing and moves nothing.                                                                                   |

## Residual flags (owner spot-check — from the judge's rationale)

1. **S1 ruling is basis-load-bearing.** The UNMODELED verdict for the enemy ATK▼ rests on the
   no-boss-offense basis (immortal DEF=0 boss that deals no damage). If a boss-damage model is ever
   added, this line must be revisited (already in the override caveats + kit-status residual).
2. **Rider cadence rides the contested SMG tuple.** The per-fight last-bullet COUNT (~20+) depends on
   the datamined rate_of_fire 1440 quantized to 20 shots/s + reload 121f — base-stats-owned, not a
   kit-line issue; both test files assert cadence-invariant frame-pairing rather than absolute counts.
3. **Model-only.** No real crow footage has been graded; `tier: MODEL_ONLY / tuned: false` until a
   recorded fight validates absolute damage (board A/B is the outer loop).
