---
name: context
description: Baseline codebase + game-mechanics context pack for the NIKKE damage sim — covers EVERY major mechanic in the game-mechanics.md and damage-calculation.md SSOT docs (formula, buckets, FB timing, crit/core, element, charge/latency, fire cadence, MG wind-up, range/boss movement, burst gauge, burst rotation, DoT/procs, buff stacking, boss DEF), each with file:line anchors + evidence tier. Load this and paste the relevant sections into any test-judge (Fable) / analysis subagent prompt so it never has to re-explore the repo. Invoke before spawning a subagent that must reason about the sim's mechanics, formula, or code.
---

# Context pack — NIKKE solo-raid damage sim

Give a subagent (esp. the Fable test-plan judge) everything it needs about the sim's mechanics, formula,
evidence rules, and code — WITHOUT it reading the repo. Paste the sections relevant to the test, with the
file:line anchors. **Keep anchors current when code moves.** SSOT docs mirrored here: `docs/data/game-mechanics.md`
(§ numbers below map to it) + `docs/data/damage-calculation.md`.

## 0. What the sim is / validation basis
Frame-tick 60fps sim predicting per-unit damage, 5-unit teams, 180s solo-raid. Graded sim-vs-real under
**scope lock**: sync 400, 10/10/10, **Base 5 gear**, no cube, no doll, core 7, treasure, **partless boss**,
**bossDef 140**, **core exposure 100%**, auto-play. Class static ATK @ Base5: **Attacker 118,027 / Supporter
98,367 / Defender 78,707** — ATK is CLASS-BASED (same-class ⇒ identical; a per-unit-varying "stat" is NOT
ATK — the Battle-Records ⚔ field is COMBAT POWER, not ATK). Anchors in `data/reference-stats.json`.
**Build every test config via `scopeLockCfg(slugs, bossElement)`** (`scripts/lib/scope-lock.ts`; per-element
runners `scripts/sim/{fire,water,wind,electric,iron,neutral}.ts`; `sanityCheck` flags config drift) — the
ONLY per-test variable is the boss element; never hand-roll a config.
Board ~median 0.95, MAE ~0.13. Grading harness `scripts/experiment.ts` (env `ONLY= ROT=1 SEEDS=N DBG_UNIT/DBG_N/DBG_BUFFS/DBG_GAUGE/DBG_CD`).

## 1. Damage formula (buckets) — `src/engine/sim.ts` [gm §1]
`dealDamage` @ **sim.ts:631**; final value @ **sim.ts:741-742**:
`dmg = max(0, effectiveAtk − bossDef) × (atkPct/100) × major × elem × charge × dmgUp × projFactor × taken × distributed`
- **effectiveAtk** (sim.ts:576): `staticAtk×(1+ΣatkPct%) + Σ("% of caster's ATK" = caster BASE static, flat) + Σ(HP→ATK, own MaxHP only)`.
- **major** (sim.ts:659): `1 + FB(0.5) + range(0.3) + crit + core` — ADDITIVE within (§2 below).
- **elem** (sim.ts:685), **charge** (sim.ts:695), **dmgUp** "Damage Up" (sim.ts:722), **taken** (sim.ts:737).
- +ATK% and +Attack-Damage% are DIFFERENT buckets → multiply. Distributed groups with Taken, not Attack-Damage.
Triple-validated (ENG/JP/KR). Full write-up + per-type applicability matrix: `docs/data/damage-calculation.md §1`.

## 2. Major bucket: crit / core / Full Burst / range [gm §1, §10; dmg-calc §1b]
- **Crit** (sim.ts:660): base 15% rate / +50% dmg; Bernoulli in MC mode (cfg.seed) else expectation. Applies to normals AND DoT/rider/skill damage (measured, ginmy + maiden footage). `DOT_CRIT` env @ sim.ts:42.
- **Core** (sim.ts:668-676): `coreExposure(=cfg.coreHitRate, 1.0 scope-lock) × AUTO_CORE_RATE × coreBonus`. AUTO_CORE_RATE is **WEAPON-INDEXED** (`acrFor` @ **sim.ts:497**): MG/SR/RL=0.95, AR/SMG/SG=0.85 (⚑; footage scan + JP research + MAE sweep; DECISIONS 2026-07-14). **Core is normal-attack-ONLY** — skills/DoT/riders never core.
- **Full Burst +50%** = TIMING gate, not a type rule. `fb = fbEndFrame > frame` (sim.ts:649); `FULL_BURST_FRAMES=10s` (sim.ts:67). Any instance LANDING in the live FB window gets it; **burst-cast/instant damage misses it** (snapshots at use-time); **DoT/rider/additional damage GET it** (activation/tick timing); only exemption = Modernia Paradise Lost. `skillNoFb` helper + `FBRULE` knob @ **sim.ts:56** (default `timing`; `perkit`=old per-kit noFb). JP+KR measured, DECISIONS 2026-07-14; framework `scripts/probe/fb-range-lab.ts`, open-questions U14.
- **Range +30%** (sim.ts:659, `inRange`): band-gated per weapon vs boss position; **RL never; skills/DoT never** (`noRange` universal).

## 3. Element advantage [gm §10]
×1.10 exact on advantage (its own bucket, sim.ts:685) + any elem-dmg buffs (Superior Elemental Code exceeds 1.10). Neutral = ×1.0. Advantage per element wheel.

## 4. Charge weapons & release latency — `src/engine/sim.ts:1392-1425` [gm §4; charge-weapons.md]
Charge loop @ **sim.ts:1392**. Charge speed is **SUBTRACTIVE + floored**: `needed = max(1, round(chargeFrames × (1−CS%/100)))`, live per frame (sim.ts:1409-1413); excess past 100% CS does nothing (except Red Hood S1). **Release latency** (sim.ts:1417-1421): release-fired RL/SR fire **~22f (~0.37s) AFTER full charge** on auto — FIXED, NOT CS-scaled (`boltRecoveryFrames`); applied to SR+RL unless `charFixes.noBoltRecovery` (autofire units). **Overcharge**: bar climbs PAST 100% to the unit's cap (=DB `chargeMultiplier`, e.g.150%) during latency, releases at cap. Classifier (tia/U12): steady ~100% release=autofire; 150%+=release-fired. Maiden:IR precedent: released 156–212%, ~21f avg latency (jitter).

## 5. Weapon fire cadence + MG wind-up [gm §2, §3]
`PULLS_PER_SEC` weapon defaults @ **sim.ts:81**. MG "60rps" counts belt rounds; pulls/s = 60/hitsPerShot, a pull (damage event) every hitsPerShot rounds (sim.ts:1445). Fire-rate buffs: attackSpeed+fireRate (sim.ts:1442). Per-unit MEASURED cadence via `charFixes.pullsPerSec`. **MG wind-up** = measured frame ladder (`MG_RAMP_INTERVALS` @ **sim.ts:88**, doc `docs/data/nikke-mg-windup-model.md`), NOT a fitted curve; first 18 wind-up rounds don't core (`MG_NO_CORE_RAMP_ROUNDS` sim.ts:99); wind-DOWN after idle (`MG_WINDDOWN_*` sim.ts:108-110). Measured constants — never refit.

## 6. Effective range & the test boss [gm §5]
`RANGE_ELIGIBLE` per band + `bandAt(frame)` from the boss's measured movement script (the +30% range gate). Boss is partless (no core-part destruction). Range applies to normals only (RL/skills exempt).

## 7. Burst gauge generation (v4) [gm §6]
`addGauge`/`skillGauge`/`shotGauge`; datamined per-shot table (`data/gauge-per-shot.json`). **Focus bonus**: the CAMERA-FOCUSED unit's CHARGE weapon (SR/RL) generates ×2.5 (`FOCUS_CHARGE_GEN=2.5` @ **sim.ts:512**); unfocused charge = ×1.0 (`UNFOCUSED_CHARGE_GEN`, measured, sim.ts:513). Non-charge weapons focused ≈ no bonus. Recorded runs pass `cfg.focusSlug`. Gauge locked during FB. The synergy-API burstGaugePerShot column was DROPPED as a source.

## 8. Burst rotation state machine [gm §8]
Chain B1→B2→B3 triggers Full Burst. `STAGE_CAST_GAP_FRAMES=30` (sim.ts:66) between stage casts. FB start sets `fbEndFrame` (sim.ts:1161). **Post-FB chain delay** `POST_FB_CHAIN_DELAY_FRAMES=180` (3s, sim.ts:590,1178) — next chain can't open until FB-end +3s (measured; `ENV.ROTMODEL='refill'` A/B knob). **Leftmost-with-waiting selection** (sim.ts:1222-1226): within a timed stage window the chain waits for the leftmost stage-filling unit whose cooldown ends before the window closes (measured; round-robin REJECTED). Full-burst COUNTS are cooldown/chain arithmetic — deterministic run-to-run except boss-transition/chain collisions; graded comps pinned in `scripts/regression.ts`. Burst-cast damage lands BEFORE FB begins (no +50%, no entry auras).

## 9. Skill procs, DoTs, damage flavors, stored hits [gm §9; dmg-calc §2]
Effect kinds `flatDamage` (proc, crits by default @ ~sim.ts:920, U1 note), `dot` (real-interval DoT, ticks @ ~sim.ts:1519), stored-hit release (Rapi:RH @ ~sim.ts:1259). NEW trigger `chargeCounter` (cycling per-full-charge phase counter, FB-window-lowered thresholds, gated on unit's OWN burst via `lastBurstCastFrame`; SBS 3/6/9→1/2/3). Flavors: distributed / sustained / sequential / true / projectileExplosion|Attachment. Per-shot trigger dispatch in `firePull` ~**sim.ts:1585** (shotFired/hitCount/chargeCounter). Types: `src/skills/types.ts`. Overrides `src/skills/overrides/<slug>.json` (prose evidence `note` each); `scripts/validate-overrides.ts`.

## 10. Buff stacking & targeting [gm §11]
`stat()`/`sum()` accumulate live buffs per frame. **Same skill-slot of the same caster OVERWRITES/refreshes** across trigger re-fires (sim.ts:902) — no double-stacking one's own buff. Buff `target` kinds: self/allies/enemy/alliesOfElement/alliesTopAtk/etc. Enemy debuffs (Damage Taken▲, distributed) live in the `taken` bucket.

## 11. Boss DEF
`bossDef: 140` (scope-lock, 2026-07-15). NIKKE enemy DEF is a small FLAT subtractive value (boss-type ~140) — effect ~0.1%/hit at scope-lock ATK but always on. Baked into the scope-lock SSOT (`scripts/lib/scope-lock.ts`). Measured/bounded, DECISIONS 2026-07-14 (`scripts/battery/boss-def.ts`).

## 12. Monte Carlo mode + worked anchors [dmg-calc §4, §5]
`cfg.seed` → per-instance crit/core Bernoulli + boss-timing/chain jitter (`SEEDS=N` = mean±sd + FB distribution). Popup-verified anchors (dmg-calc §5): Jill opening magazine 99.7% on 4 classes; Cinderella nuke (FB-boundary rule) 4.07M non-crit; Maiden:IR gauge 364×2.5. SBS charged-normal ~1.55M non-core (verified).

## 13. Evidence tiers & hard rules [docs/CONVENTIONS.md]
**MEASURED** (video/frame/popup) > **CALIBRATED ⚑** (fit-to-board, refit candidate) > **VALIDATED/DATAMINED** (game DB / kit text) > **MODEL-ONLY**. Rules: `bash scripts/verify.sh` green before commit; snapshots (`scripts/regression.ts --update`) only with the change they reflect; **never refit MEASURED constants**; a datamine CAN be wrong but overturning a landed ruling needs same-tier (video) evidence; don't re-litigate `docs/DECISIONS.md` without same-tier evidence. **TOP INVARIANT: accuracy to observed mechanics > board fit; never fudge an unobserved mechanic to fit data** (`charFixes.noBoltRecovery`-as-observed-fix = good; a cadence chosen only to land the number = bad).

## 14. Video-reading toolchain — `scripts/probe/`
`hit-values.ts` (per-unit hit-value table — run FIRST) · `frames.ts` (ffmpeg extract; crosshair=damage / character=heal region presets) · `classify.py` (popup colour, numpy+PIL, no OCR) · `parsed.ts`+`docs/probe-data/` · `catalog.ts` (`catalog.json`) · `dot-crit.ts` · `fb-range-lab.ts`. Popup colours: white=normal, orange+crit-icon=crit, red "CORE HIT"=core, green=heal; damage@crosshair, heals@character. Bar/frame analysis validated on Helm/Maiden/SBS.

## 15. Docs index (source of truth)
`docs/DECISIONS.md` · `docs/data/damage-calculation.md` + `docs/data/game-mechanics.md` (SSOT pair) · `docs/data/charge-weapons.md` · `docs/data/nikke-mg-windup-model.md` · `docs/data/burst-gauge.md` · `docs/data/auto-play.md` (auto-AI: ~3 interrupted charges/fight on boss transitions) · `docs/open-questions.md` · `docs/probe-runs.md`.

## 16. Using with the Fable test-judge
Per the `scientific-method-test-approval` methodology, every new empirical test's PLAN is judged by a
`model:'fable'` subagent BEFORE running. Paste the SECTIONS here that the plan touches (with file:line
anchors) INTO the Fable prompt so it judges the METHODOLOGY (discriminates H1 from H0/confounds? sound
pre-committed decision rule?) without opening the repo. Update anchors when referenced code moves.

## Change log
- 2026-07-15 — created; expanded same day to cover ALL major mechanics (rotation, gauge, MG wind-up,
  range, cadence, buffs, DEF, MC, anchors), not just charge (owner directive).
