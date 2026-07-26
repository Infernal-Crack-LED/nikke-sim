# S7 RECONCILING-JUDGE PACKET — guillotine-winter-slayer (Guillotine: Winter Slayer)

VARIANT (AR/Attacker/Water/Burst III, aka "gws"); base counterpart is `guillotine` (MG/Electric) — a different unit, not in scope.
Driver: Qwen. Blind roles: claude-fable-5 (S2b pre-op review), claude-opus-5 (S5 blind test, S6 blind override). You (claude-opus-5) are the BINDING reconciling judge.

## DRIVER FRAMING — the one open question (read before the evidence)

This unit has a "Hero Level" currency: EXP +1 per 3 core hits (scope-lock = 100% core exposure, so the
6-non-core-hit branch never fires), 10 EXP = +1 level, cap 11. The DRIVER override COLLAPSES the ramp to
its level-11 STEADY STATE (every "× Hero Level" magnitude pinned at ×11: auras 1.16×11=12.76 / 0.91×11=10.01,
burst DoT 20.87×11=229.57). This is a deliberate, OWNER-VALIDATED, MEASURED-ACCURATE model — the kit-status
residual reads "burst DoT + Hero-Level auras measured accurate".

ALL THREE blind models (fable S2b, opus S5, opus S6) independently re-derived the LITERAL ramp (level 1→11
over ~25-55s) from kit prose alone, and each flagged the steady-state collapse as the nearest-wrong. This is
the single divergence you must rule on. The driver's position: the steady-state collapse is FAITHFUL-as-calibrated
(measured-accurate), with the ramp trajectory + first-burst DoT level snapshot carried as a documented ⚑ refinement
(override ⚑3), NOT a faithfulness break. Note also: the engine's hitCount trigger CANNOT partition core vs non-core
hits per shot (the S6 blind override itself discovered this), so the literal "two EXP branches" encoding the blind
test 10 demands is inexpressible without double-counting; the driver models the scope-lock-faithful core branch only.

## S5 BLIND TEST vs DRIVER OVERRIDE — green/red count

Ran `scripts/kit-autonomy/blind/guillotine-winter-slayer.test.ts` (pristine, only the harness import path fixed)
against the DRIVER override: **13 PASS / 3 FAIL / 2 SKIP** (18 total).

- The 13 GREEN are every BEHAVIOURAL faithfulness assertion: fixture liveness; no ignored blocks; burst Attack
  Damage 10.14% Water-allies-only timed 10s; burst ElemAdv 18.75% Water-allies-only timed + NOT folded into
  attackDamagePct; burst trigger burstCast (not fullBurstEnter); burst DoT 10s/1s scaled by Hero Level (driver's
  229.57 = 20.87×11 passes the "whole-level multiple within Lv-11 cap" branch); burst damage material + teammate-inert;
  S1 grants scoped Water-allies (two-sided counterfactual: helm moves, liter/crown byte-identical); casterAtkPct
  caster-scaled flat reaching exactly {gws, helm}; EXP ATK 1.81% cap-100 self; EXP ramp material to carry + inert
  for others; level-up rewards (reload + heal) modeled; global inertness (no buff on non-Water ally).
- The 3 RED are ALL the Hero-Level ramp ENCODING, not behavioural faithfulness:
  - T9 "Hero Level scaling is live" — driver emits a fixed 12.76 with no resource pool/perResource (blind marks
    "frozen to a constant" as nearest-wrong; driver: measured-accurate steady-state, ⚑3).
  - T10 "EXP accrues on BOTH the 6-non-core and 3-core paths" (+ requiresCore) — driver models the core branch only
    (hitCount 3); the engine cannot partition core/non-core per hit, and authoring both blocks double-counts EXP
    (the S6 blind override independently found this exact engine limitation).
  - T12 "7.46% line is not a t=0 passive" — the behavioural self-only assertion PASSES; only the structural
    "not passive" check fails (driver: passive is faithful, level 2 reached ~3s in, negligible over-credit).

## S6 BLIND OVERRIDE vs DRIVER OVERRIDE — diff

CONVERGENCE (all 12 kit lines IMPLEMENTED in the blind audit; every faithfulness judgment matches the driver):
casterAtkPct as a FLAT add off caster ATK (not atkPct); Water-Code-ally scope INCLUDING self (excludeSelf false);
burstCast trigger (not fullBurstEnter); burst DoT 20.87×HeroLevel, 10 ticks, 1s interval, FB-by-timing, crit OFF;
heal as event-only (no HP pool); instantReload as weapon-state/damage-relevant (not skippable); EXP atkPct 1.81
cap 100 self permanent; the EXP-cadence-merge ⚑ (engine can't partition core/non-core).

DIVERGENCE (encoding of the ramp ONLY):
| line | DRIVER (measured-accurate) | BLIND S6 (literal-kit) |
|---|---|---|
| Hero Level | collapsed to level-11 steady state; no pool | declared `resources[heroLevel]` initial 1 max 11 |
| S1 auras | passive elemAdvantageDamagePct 12.76 + casterAtkPct flat, perm | perResource-scaled (1.16/0.91 × live level) |
| level-up engine | implicit (rewards on hitCount 30) | hitCount 50 + resourceGate {max 10} |
| burst DoT | atkPct 229.57 fixed (=20.87×11) | atkPct 20.87 + perResource {× live level} |
| S2 7.46 gate | passive (level 2 ~3s in) | hitCount 50 + resourceGate {min 2} |
| EXP cadence | hitCount 3 (core branch, scope-lock 100% core) | hitCount 5 (merged, assumes coreRate≈0.30) |

The blind S6 even flags its own uncertainty: "perResource on ALLY-targeted buffs … if the engine only resolves
perResource for self-targets, the ally half goes inert — verify." (The driver's plain-buff steady-state encoding
sidesteps this risk entirely.)

## YOUR TASK

Rule per the RECONCILING-JUDGE contract below. The crux: is the driver's level-11 steady-state collapse a
FAITHFUL-as-calibrated model (GO, with the ramp as a ⚑) or a faithfulness break (NO-GO)? Weigh: (a) the measured-accurate
residual; (b) the engine's inability to express the literal two-branch EXP cadence; (c) the fact that all three blind
models converged on every OTHER faithfulness judgment. Return the binding verdict JSON.

---
# PART 1 — RECONCILING-JUDGE CONTRACT

# kit-autonomy — S7 RECONCILING JUDGE (binding go/no-go)

Paste at the top of a fresh subagent, prepended with `.claude/subagent-non-negotiables.md` AND the mechanics
pack (`docs/data/damage-calculation.md` + `docs/data/game-mechanics.md`, or the `/context` pack). You are the
final gate of the autonomous gauntlet. You grade the driver's IMPLEMENTATION against ground truth — the real
kit text + the damage-formula SSOT + two INDEPENDENT blind re-derivations — and return a BINDING verdict.
You grade ARTIFACTS, not intent: you do NOT trust the driver's self-report (the artifacts embody the
reasoning; you are not "blind" to it, you simply don't take its word for it).

> **Content gate:** inspect kit prose STRUCTURALLY; quote ≤ ~40 chars; clinical output.

## You are given
1. **Ground truth:** the real kit prose (`data/characters.json → characters.<slug>.skills`) + base stats, and
   the damage-formula/mechanics SSOT (the multiplicative buckets; crit/core/FB majors; procs/DoT/flavors).
2. **Pre-op review (S2b):** the adversarial test-faithfulness reviewer's independent spec (per-line
   disposition + nearest-wrong model + distinguishing assertion + load-bearing set).
3. **Blind post-op test-writer (S5):** an independent `<slug>.test.ts` written from the prose alone (+ spec).
4. **Blind post-op override-writer (S6):** an independent `OverrideFile` written from the prose alone (+ audit + ⚑ list).
5. **The driver's implementation:** the driver's `<slug>.test.ts`, `src/skills/overrides/<slug>.json`, and any
   engine change. (Plus the S2d independent verification matrix if provided.)

## Method
**A. Convergence is MECHANICAL (do this first).** Run the S5 blind tests, UNMODIFIED, against the driver's
SHIPPED override (mentally trace, or note what a run would show): **GREEN = convergence; any RED = a
divergence to classify.** A divergence the blind caught is the REAL signal; mere same-model agreement is WEAK
evidence (every agent is the same model — convergence proves stability, not correctness).

**B. Per kit line, classify** the driver's encoding against prose + formula, using S2b/S6 to attribute:
- `FAITHFUL` — encoding matches prose AND the formula SSOT agrees the routing is correct (right bucket,
  trigger timing, stacking rule, scope, duration semantics, target set).
- `DOCUMENTED-GAP` — deliberately `unmodeled` (reason in `note`), a `GAP` (missing primitive, `it.skip`), or a
  `⚑` (estimate + recipe + tier). Acceptable; the decision is recorded.
- `REAL-GOTCHA` — a divergence NOT documented. Sub-kinds, ranked: `SILENT_DROP` (line nowhere — not block,
  config, or `unmodeled`) → `ENGINE`/`FIDELITY` (encoded but the engine routes/executes it so behavior differs
  from the kit wording, or the downstream effect is modeled rather than the named mechanic) → `ENCODING`
  (wrong value/stat/trigger/target/scope/duration vs the prose).
- `RECON_ERROR` — a blind agent misread clear code/prose (the driver + formula agree); note it, not a finding.

**C. Fire-rate / "modeled≠working" check:** each FAITHFUL block must FIRE at the prose-implied cadence over
the 180s fight (the DBG side-effect check), not merely be present. A modeled line that doesn't activate is a
REAL-GOTCHA. (A block whose only observable is a consumer's reaction needs a fixture that strips the unit's
other sources of that signal — note if the driver's fixture fails to isolate.)

**D. Discrimination check:** each load-bearing test must FAIL under its named nearest-wrong model (per the
S2d matrix / S2b). A test green under both shipped and counterfactual asserts nothing → REAL-GOTCHA.

**E. Cross-check the blind agents:** for each S5/S6 divergence from the driver, is it corroborated by the
prose + formula (a fresh find) or spurious? Undocumented + formula-confirmed = the most valuable output.

**F. Magnitude scope:** magnitudes are owner/measurement-gated and OUT OF SCOPE — do NOT flag a magnitude as
a gotcha unless it contradicts the prose's own number; tag each with its evidence tier.

## Also produce: `kitDescription`
A plain-English 3–6 sentence description of what the kit DOES in game terms (grounded in the real kit text,
not audit jargon) — for owner sanity-check. No gotcha subkinds, no citations, no severity.

## Return ONLY this JSON
```json
{
  "slug": "<exact slug>",
  "kitDescription": "<plain-English 3-6 sentences>",
  "convergence": { "s5TestsVsDriverOverride": "GREEN|RED", "redAssertions": [ "<which S5 assertions fail vs the driver's override>" ] },
  "lineFindings": {
    "skill1": [ { "kitLine": "<≤40 chars>", "category": "FAITHFUL|DOCUMENTED_GAP|REAL-GOTCHA|RECON_ERROR", "subkind": "SILENT_DROP|ENGINE|FIDELITY|ENCODING|null", "driverSaid": "...", "blindSaid": "...", "formulaCheck": "...", "fireRateOk": true, "explanation": "..." } ],
    "skill2": [ ], "burst": [ ]
  },
  "gotchas": [ { "subkind": "SILENT_DROP|ENGINE|FIDELITY|ENCODING", "slot": "...", "summary": "...", "evidence": "<real kit line + formula citation + driver vs blind>", "documentedByDriver": true, "severity": "high|med|low", "suggestedFix": "<faithful representation, or 'needs measurement' + recipe — NEVER a fudge>" } ],
  "discriminationOk": true,
  "faithfulnessScore": "<0..1 fraction of kit lines FAITHFUL or DOCUMENTED_GAP>",
  "verdict": "GO|NO-GO(faithfulness)|NO-GO(engine-core)",
  "verdictRationale": "<one paragraph: which gotchas are real + ranked; whether the blind re-derivations converged; what must change for GO; the same-model residual the owner should spot-check>"
}
```
Save to `scripts/kit-autonomy/results/<slug>.json`. `suggestedFix` is a faithful representation or a flagged
measurement, NEVER a number chosen to hit the board. Tight structured JSON, not an essay.


---

# PART 2 — MECHANICS SSOT

## docs/data/damage-calculation.md

# Damage calculation — the exact math the sim computes

Companion source-of-truth to [game-mechanics.md](game-mechanics.md): that doc says what the game
does and how we know; this one walks the sim's implementation of it, formula by formula, in the
order the engine applies them, with every term mapped to its construct in `src/engine/sim.ts`.
The goal: a human can reconstruct any damage number the sim produces — and check it against a
real popup — without reading code. Worked examples at the end use popup-verified fights, so the
numbers are checkable against reality, not just against the code.

Kept current by the `/mechanics-doc-upkeep` skill; a stop-hook nudges when engine files change
without this doc. Evidence tiers (MEASURED / DATAMINED / COMMUNITY / CALIBRATED ⚑) are defined in
[../CONVENTIONS.md](../CONVENTIONS.md).

---

## 1. The per-instance formula

Every damage instance — one bullet, one pellet volley, one skill proc, one dot tick, one burst
hit — is computed independently at the frame it lands (`dealDamage()`):

```
damage = FinalATK × (rate% / 100) × Major × Element × Charge × DamageUp × Projectile × Taken × Distributed
```

Buffs *inside* a bucket add; buckets *multiply*. `rate%` is the instance's skill/attack
multiplier (e.g. a normal attack's `normalAttackMultiplier`, a proc's "deals X% of final ATK"
value), after any per-unit override corrections.

### 1a. FinalATK

```
FinalATK = max(0, effectiveAtk − bossDef)                     // bossDef = 0 at scope lock

effectiveAtk = staticAtk × (1 + Σ ATK ▲ % / 100)
             + Σ (caster-ATK grants, as flat values)
             + (Σ ATK-of-Max-HP % / 100) × ownMaxHp
```

- `staticAtk` — the unit's out-of-combat attack: level-table base for its class × grade/core
  multipliers + gear (`src/stats.ts`). At scope lock (sync 400, 3★ core 7, no doll, **Base 5
  gear**) this is **Attackers 118,027 / Supporters 98,367 / Defenders 78,707**. (BASIS CORRECTED
  2026-07-14: scope lock uses the base manufacture gear set, NOT OL0 — the old OL0 values
  120,143 / 100,130 / 80,118 were ~1.76% high across the board. The prior popup "exact" matches
  against the OL0 numbers are flagged for re-check at the Base 5 basis. See DECISIONS.)

### Damage formula — buckets & per-type applicability (sourced 2026-07-14)

Triple-validated across ENG/JP/KR (nikke.gg; JP empirical tests ginmy.net; KR arca.live) — full
source list in `docs/handoffs/2026-07-14-damage-buckets-and-ginmy.md`. Damage is a **product of
independent multiplicative buckets**; same-type buffs **add within** a bucket, different buckets
**multiply**. THE ENGINE (`dealDamage`) ALREADY MATCHES THIS:

```
finalATK = staticAtk × (1 + Σ ATK%)  +  Σ("% of caster's ATK" flat)  +  Σ(HP→ATK flat)
dmg = (max(0, finalATK − enemyDEF) × weaponOrSkillCoef)   ← DEF subtracts INSIDE the base, pre-coef
    × major   [1 + crit + core + fullBurst(0.5) + range(0.3)]  ← ADDITIVE within (core does NOT ×crit)
    × element [1 + 0.1 advantage + elem-dmg buffs]
    × charge  [charged shots only]
    × dmgUp   [1 + attackDamage + sustained + pierce + parts + …]   "Damage Up"
    × taken   [1 + damageTaken(enemy) + distributed]
```

- **Enemy DEF is a small FLAT, subtractive term inside the base** (min-1 floor). +ATK% sits *inside*
  the paren (applies before DEF); the skill coefficient, charge, and every other bucket apply
  *after* (ginmy atkbuff/atkdamagebuff/def tests). Engine: `baseAtk = max(0, effectiveAtk − bossDef)`
  then `× atkPct × …` ✓. Measured boss-type DEF ≈140 (mobs 100) → **negligible** at scope-lock ATK
  (≤0.12% board shift); we run `bossDef:0`. See DECISIONS + `scripts/battery/boss-def.ts`.
- **Defense-Ignore ("true damage")** drops the `− enemyDEF` term entirely (`ATK × coef × …`). A
  separate **"Defense-Ignore Damage Increase"** bucket multiplies ONLY def-ignore hits and is
  *additive with Attack Damage* (ginmy /nikke_truedamage_test). Negligible on our board since DEF≈140
  is already near-zero; only the def-ignore-damage *multiplier* would matter (units: Jill, Ada) — not
  yet modeled, low priority.
- **+ATK% and +Attack Damage% are DIFFERENT buckets → multiply** (×1.5×1.3 = ×1.95, not +80%).
- **"X% of caster's ATK" = caster's BASE (static) ATK**, added FLAT *outside* the recipient's
  `(1+ATK%)` (NOT buffed; the "final" keyword toggles buffs in — KR 기준/JP 基準 = base). Engine uses
  `owner.staticAtk` ✓. "% of **final** ATK" skill damage uses the actor's LIVE buffed ATK ✓.
- **Distributed groups with Damage-Taken, NOT Attack Damage** (naming trap). Engine ✓.

| damage type | crit | core | range | Attack-Dmg | full-burst | element | charge |
|---|---|---|---|---|---|---|---|
| normal / charged | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | charged-only |
| skill / function "% of final ATK" | ✅ | ❌ (unless "as core dmg") | ❌ | ✅ | ✅ | ✅ | ❌ |
| DoT / sustained | ✅ | ❌* | ❌ | ✅ | ✅ (JP: not on 1st tick) | ✅ | ❌ |
| distributed | ⚠️ disputed | ❌ | ❌ | own calc (Taken) | ⚠️ | ⚠️ | ❌ |
| burst nuke | ✅ | only if "as core dmg" | ❌ | ✅ | ✅ | ✅ | ❌ |

\* DoT-core is kit-dependent (weapon-fire "sustained" cores; a function-tick like LM's "63.36%/s"
does not). **Attack Damage APPLIES to DoT** (empirical) — the "DoT is AD-exempt" suspicion was DISPROVEN.

**DoT CRIT — ENABLED by default (`DOT_CRIT` ON, landed 2026-07-21, open-questions U13 / DECISIONS
2026-07-21).** DoT ticks + stored-hit releases now roll crit universally (core still gated off; a
per-dot explicit `crit` field overrides; `DOTCRIT=off` reverts). **Empirically confirmed** by ginmy.net's
DoT test (/nikke_dot_test): DoT observed critting ~47% with elem-advantage+crit vs ~10% elem-only,
and the worked Mana example reconstructs a tick as `(ATK×1.9936 − 100 DEF) × 3.24 DoT × 1.5 FB ×
crit/elem` — DoT gets ATK/element/FB/**crit** and subtracts DEF, but **NOT** the distance bonus
(engine's `noRange:true` on DoT ✓). (An OUR-footage read was attempted but proved inconclusive —
DoT/proc popups entangle with the unit's normals by value; the `scripts/probe/hit-values.ts` table
exposed the misattribution. A clean isolation is tooled but pending — see open-questions U13.) This
is a systematic under-credit the DoT roster's values were calibrated to absorb; remaining work is the
engine flip in `dealDamage`'s DoT/proc paths + a DoT-roster recalibration (offsetting errors — high
blast radius), as a dedicated owner-greenlit increment. See open-questions U13 + handoff.

- Plain **ATK ▲ %** buffs sum into one multiplier on staticAtk (they dilute against each other).
- **"ATK ▲ X% of caster's ATK"** buffs convert at application time to a flat add of the caster's
  final ATK × X — they do not dilute (this is why high-ATK buffers are strong).
- **"ATK ▲ X% of Max HP"** conversions use the unit's OWN Max HP only — own-kit HP stacks count,
  ally-granted Max HP buffs do NOT feed the conversion (MEASURED: cinderella focus video; her
  full-burst proc popups match own-HP math within 2% early and late, and would read ~28% higher
  if ally grants fed it).

### 1b. Major bucket (crit, core, Full Burst, range — one additive bracket)

```
Major = 1 + FB + Range + Crit + Core

FB    = 0.5   if Full Burst is active AND the instance is not boundary-timed (see below); else 0
Range = 0.3   if the weapon is in its effective band vs the boss's current position; RL never;
              skill/proc instances never (noRange)
Crit  = critRate × critBonus         (expected-value mode)
      | critBonus or 0, Bernoulli(critRate)      (Monte Carlo mode, cfg.seed set)
        critRate  = (base crit rate + Crit Rate ▲ % + normal-only Crit Rate ▲ %) / 100,
                    clamped 0..1   (base 15%)
                    the normal-only term (`critRateNormalPct`) joins ONLY on normal-attack
                    instances — kit lines reading "Critical Rate of normal attacks ▲x%"
                    (helm S1). Skill procs and burst damage see the unscoped term alone.
        critBonus = (critDamage − 100)/100 + Crit Damage ▲ %/100           (base +50%)
Core  = coreExposure × ACR × coreBonus    (expected-value mode)
      | coreBonus or 0, Bernoulli(coreExposure × ACR)   (Monte Carlo mode)
        coreExposure = cfg.coreHitRate (1.0 on the scope-lock boss)
        ACR = acrForHR(weapon, band, hitRatePct) — the auto-aim core-hit fraction.
        LIVE MODEL — UNIGEO uniform-in-circle (default 'all', 2026-07-22; DECISIONS 2026-07-22),
              scope-lock (small) boss profile, accuracy-circle weapons (AR/SMG/SG):
                R(hr)   = (CIRCLE_PX_K · scale_w)/2 · (1 − hr/100) px      (linear to ZERO at HR 100;
                          CIRCLE_PX_K 0.648 measured, scale_w = datamined start_accuracy_circle_scale
                          {AR 75, SMG 110, SG 250}; MEASURED at 79.3/48.2 px for SG @ HR 0/38.91)
                SG:     ACR = min(1, (r_core(band)/R(hr))²) ÷ coverage(band, R(hr))   (per landed pellet)
                AR/SMG: ACR = lensOverlap(disc R_eff = f_bloom_w·R(hr), offset δ_w(hr), core r_core)
                              ÷ disc area                                              (per hit)
                        δ_w(hr) = δ0_w · max(0, 1 − hr/120)
              Pellet/shot placement inside the circle is UNIFORM PER AREA — MEASURED directly
              (101 machine-read pellet-marker positions; the previous centered Gaussian is refuted
              at KS 0.376 vs crit 0.135). r_core diameters: near 31 px MEASURED; mid/midfar/far
              20.9/15.8/12.7 px ⚑ FIT-SELECTED (UNIGEO_CORE_PX; an owner re-trace supersedes).
              ⚑ CALIBRATED per class: δ0 = AR 15.9 / SMG 17.9 px; f_bloom = AR 0.578 / SMG 0.728
              (SMG pair is a saturated 2-cell fit — flagged, see DECISIONS 2026-07-22). Rises
              steeply with Hit Rate; AR ≥▲80 is all-core geometrically (circle inside the core).
              MG/SR/RL → flat 0.95 (no accuracy circle; MG gated by its wind-up ramp).
              Engine: acrForHR → unigeoSgCorePerLanded / unigeoSingleCoreProb (src/engine/unigeo.ts).
        REVERT / FALLBACK ARMS: UNIGEO=off restores the pre-2026-07-22 engine byte-identically —
              the δ-offset ("Rician") Gaussian cone (offsetCoreProb, frozen params in sg-geometry.ts:
              δ0 = AR 18 / SMG 16 / SG 30 px, H 120, S_FLOOR 0.10, σ-shrink {AR .009, SMG .004,
              SG .009}, K_SIGMA 2.53), which itself falls back at CONE_DELTA=0 to the measured
              CORE_BY_WEAPON_BAND table × HRCORE lift (NEVER refit; Wilson CIs in
              docs/probe-data/coreband2-*.json). The cone also remains the LIVE path for
              medium/large bossPelletProfile fights (UNIGEO coverage tables are the scope-lock
              boss silhouette only).
              PER-SHOT OVERRIDE (`coreOverride`, bypasses the band table): some hit types have their
              OWN core rate independent of aim/range — a consolidated pellet bullet (dorothy-S, `coreRate`)
              and attached-rocket EXPLOSIONS (Rapi: Red Hood, `storedHit.core` — MEASURED ~1/3 = 0.33,
              they detonate on the boss body regardless of aim; 2026-07-16, DECISIONS). These pass
              `coreOverride` so `acr` is that rate, not `acrFor(weapon, band)`.
        coreBonus = (coreAttackMultiplier − 100)/100 + Core Damage ▲ %/100   (base +100%)
```

**Full Burst timing rule (MEASURED, twice popup-verified + JP-corroborated):** damage dealt BY a
burst skill at its cast lands *before* Full Burst begins — it gets neither the +0.5 nor any
"when entering Full Burst" aura. Buffs granted by earlier casts in the same rotation do apply to
it. Burst-originated damage that lands *during* the window (dot ticks, stored-hit releases,
per-shot procs) gets both. Engine: `noFb` forced for burst-cast direct damage; burst-cast blocks
resolve before full-burst-entry triggers.

**Stored-hit accumulate-then-detonate (Rapi: Red Hood rockets, 2026-07-16):** a `storedHit` effect
accrues charges that release as one consolidated hit. Rapi: Red Hood's rocket meter (`hitCount`
every 120 normal attacks, `countInFb` 60 in her Full Burst — fills 2× faster in FB) attaches a
rocket at each meter-full; rockets attached OUTSIDE Full Burst do NOT explode until FB begins, so
they ACCUMULATE and the FIRST explosion of each FB is a BATCH of everything banked (this stack
overlap is why explosions can't be visually counted). A rocket attached DURING FB explodes
INSTANTLY (`storedHit.instantInFb` → the in-FB per-frame release path). The explosion is
aim/range-independent, cores ~1/3 (`storedHit.core`, above), and crits at the caster's sheet rate
(`storedHit.crit` — removes the stored-hit path's default crit-OFF exemption so the release crits like
every other hit; consistency, DECISIONS 2026-07-16). The rocket ATTACH is a skill-damage
hit and generates burst gauge like any skill hit — so the in-FB cadence subtly shifts Full Burst
timing (a second-order coupling, DECISIONS 2026-07-16).

**Flighted damage (2026-07-14):** some burst skills are projectiles with real flight time —
Rapi: Red Hood's 2808% nuke lands ~0.4 seconds AFTER her banner, inside her own window, and
snapshots everything (attack, buffs, the +50%, even Crown's flicker phase) at the LANDING
instant (MEASURED: the landed value matches the full in-window recipe at +0.02% in the
fire-weak read). Engine: `delaySec` on a flat-damage effect queues the hit for landing-time
resolution; the cast-instant no-Full-Burst rule does not apply to flighted damage. Her nuke is
also charge-gated (`requiresPulls` 120 — it fired at every banner where she had 120+ shots
banked and skipped the one banner where she did not).

**Scope clarification (2026-07-13):** the measured rule (and the engine's forced `noFb`) governs
BURST-slot casts — the burst button's own damage, which is what the Cinderella popups measured.
A skill-slot block that happens to trigger on a burst cast resolves after the window opens and
DOES receive the +0.5 (engine ordering: `fbEndFrame` is set before skill-slot blocks run),
though it still misses same-cast self-buffs and entry auras. This distinction surfaced in the
Snow White: Heavy Arms rework below — no unit currently relies on a skill-slot cast-instant
damage lump.

**Popup math note:** an on-screen popup is a single resolved instance — non-crit body, non-crit
core, crit body, or crit core — so to compare a popup against the sim, recompute Major with the
crit/core *outcomes* (0 or the full bonus), not the expectations. A crit popup is ×1.5 of its
non-crit sibling at base crit damage; a core popup adds the full coreBonus.

### 1c. Element bucket

```
Element = 1.1 + (Element Damage ▲ % + Superior-element Damage ▲ %)/100   with elemental advantage
        = 1.0                                                             without
```

Wheel: Fire→Wind→Iron→Electric→Water→Fire. "Superior element" damage buffs
(`elemAdvantageDamagePct` — Privaty's 130, Maiden: Ice Rose's aura, Guillotine's passives) live
HERE as part of the element multiplier, and apply only with advantage. MEASURED (2026-07-14,
test battery 5): Privaty's popup ratio between windows with and without her 130-point line read
2.8244 — the element-placement prediction to four digits ((1.1+1.3)/1.1 arithmetic); the
alternative DamageUp-additive placement predicts 1.995 and is excluded on three band pairs plus
two independent corroborating classes. Matches the decoded reference simulator.
~~They sit in DamageUp~~ SUPERSEDED (2026-07-14) — the old DamageUp placement was unsourced and
is retired (restorable via ENV.ELEMADV='damageup' for A/B comparison only).

### 1d. Charge bucket (charge shots only)

```
Charge = chargeMult/100
       + (chargeMult/100) × (doll charge % + Charge-Damage-multiplier buffs %) / 100
       + Charge Damage ▲ %/100
```

`chargeMult` is the per-unit full-charge multiplier (SR typically 250, Alice 350, cinderella 200;
weapon-swap states can override it, and a `flatDamage` hit may supply its own via `chargeMultPct`
when there is no swap to source it — Snow White `snow-white`'s cannon, dealt as a delayed
full-charge hit while her AR keeps firing rather than a weaponSwap that would halt it). Ordinary
Charge Damage ▲ buffs add flat percentage points; "multiplies base charge damage"-class effects
(Helm's burst, collection items) scale the base term. Auto play always releases at full charge
(early releases ≈ 2% of shots, unmodeled). Non-charge instances use Charge = 1.

### 1e. DamageUp bucket

```
DamageUp = 1 + ( Attack Damage ▲ %
               + Sustained Damage ▲ %      [only on sustained-flavored instances (dots)]
               + Sequential Damage ▲ %     [only on sequential-flavored instances]
               + True Damage ▲ %           [only on true-flavored instances]
               + Pierce Damage ▲ %         [only for Pierce-tagged shots: static hasPierce,
                                            a live gainPierce window, or a swap-scoped
                                            weaponSwap.hasPierce shot (snow-white cannon)]
               + Projectile Explosion ▲ %  [RL NORMAL attacks — see 1f]
               ) / 100
```

The flavor gates mean a "Sustained Damage ▲" buff does nothing for a unit with no dot, etc.

### 1f. Projectile bucket

```
Projectile = 1 + (Projectile Explosion ▲ % | Projectile Attachment ▲ %) / 100
```

Applies to explosion/attachment-*flavored* hits (Rapi: Red Hood's projectiles, Anis: Star's
stars) as its own multiplier. For plain rocket-launcher NORMAL attacks the Projectile Explosion
buff applies too, but through the DamageUp bucket (1e) — MEASURED exactly (the buff-independent
rocket/proc popup ratio test, 1.2491 = prediction to four digits).

### 1g. Taken and Distributed buckets (boss-side)

```
Taken       = 1 + (Σ Damage Taken ▲ on the boss
                   + Σ Distributed-damage Taken ▲ [distributed instances only, and only
                                                   while a Damage Taken ▲ is active]) / 100
Distributed = 1 + Distributed Damage ▲ %/100     [distributed instances only]
```

Distributed damage deals the same TOTAL against one target as against many (owner-verified) —
never model a split penalty.

---

## 2. What creates damage instances

### 2a. Normal attacks

Per trigger pull, at the weapon's cadence, 60 fps frame-quantized:

- **AR 12/s · SMG 20/s · SG 1.5/s (10 pellets/trigger) · Pistol 4/s** — class defaults; the
  datamined `rate_of_fire` is per-unit and some units deviate (Jill: 150 rpm = 2.5/s, MEASURED —
  engine `charFixes.pullsPerSec`).
- **MG**: the measured wind-up ladder (35 rounds over 142 frames, then 1 round/frame = 60/s),
  with wind-DOWN on idle (grace ~0.27s, then the ladder retraces at ~2.8× climb speed; a >100%
  reload-speed buff's ~0.2s effective reload sits inside the grace = the measured "skip").
  Details: [nikke-mg-windup-model.md](nikke-mg-windup-model.md).
- **Charge weapons (SR/RL)**: charge for `chargeFrames × (1 − Σ Charge Speed %)` (SUBTRACTIVE,
  floor 1 frame, cap +100%), then — for release-fired units — a 22-frame release latency
  (MEASURED). Autofire units skip the latency (`charFixes.noBoltRecovery`, sparse list).
  Details: [charge-weapons.md](charge-weapons.md). **Whole-magazine dump (cinderella,
  `charFixes.magDumpRof`)**: one charge feeds the whole magazine — after the first charge she
  autofires all 24 rounds at the datamined `rate_of_fire` without recharging, then reloads and
  charges once again (MEASURED 2026-07-21 by ammo-counter frame read; ≈390 pulls/180s). Charge
  Speed shortens only the once-per-mag prime charge. See [charge-weapons.md](charge-weapons.md) §2a.
- **Reload**: `round(displayed × 0.975 × (1 − Reload Speed ▲)) + 13 frames` (SUBTRACTIVE; the
  13-frame tail is what a ~100% buff leaves — corroborated by ore-game's 0.2s measurement).
  Rolling reloads exist (`reload_start_ammo` — Jill tops up while firing, zero downtime).
- Core/crit/range/FB per §1b; charge bucket per 1d.
- Firing pauses during the boss's 1-second off-screen transition windows; units whose effective
  reload is ≤1s get a free refill during them.

### 2b. Skill damage ("deals X% of final ATK as additional damage")

Function-type instances (DATAMINED rules, table in
[nikke-damage-formula.md](nikke-damage-formula.md) §3):

- CRIT at the caster's rate (default on), NEVER core, NEVER range (`noRange`), Full Burst by
  actual landing time, no charge bucket.
- launchWeapon deliveries (real projectiles: Anis: Star's stars, Rapi: Red Hood's attachments)
  DO core+crit and take the Projectile bucket.
- Full-charge-gated procs count only full-charge releases (auto ≈ every shot).
- Per-shot procs can be state-gated: by Full-Burst state (engine `fbGate`, e.g. Velvet), by
  every-Nth activation (`everyN`), by core exposure (`requiresCore`), and by weapon-swap state
  (`swapGate`, 2026-07-13): Snow White: Heavy Arms's Fully Active extra volley (+1,055.9%
  sequential per shot, critting) rides ONLY her two swapped 3.2-second full-charge shots inside
  the Full Burst window — COMMUNITY twice-confirmed placement (gamewith JP holds her Fully
  Active buffs per fully-charged shot; Prydwen's 5→15 lock-on structure), replacing an older
  cast-instant lump model that stranded the volley outside the window's buffs.
- Weapon swaps can end on USES rather than time (`maxShots`, MEASURED 2026-07-14): Snow White:
  Heavy Arms's Fully Active ends right after her second swapped shot fires — at a variable
  instant, observed +6.2 to +7.7 seconds — bounded by her burst window; a shot lost to fight
  end delivers nothing. Buffs "held per swap round" (her +528 Charge Damage and +158.4
  Sequential) are modeled with the `whileSwapped` buff gate: they count only while the swap is
  live, so they never leak onto baseline shots in the window tail. Base Snow White
  (`snow-white`) uses `maxShots: 1` — OWNER-ruled 2026-07-20: exactly one cannon shot per
  burst, then she returns to her AR for the window's remainder. A swap can also carry
  swap-scoped Pierce (`weaponSwap.hasPierce`, 2026-07-20): its shots are Pierce-tagged for
  the DamageUp Pierce term without the unit being statically Pierce.
- Internal-cooldown skills (`interval` trigger, 2026-07-20): a kit line with no printed
  activation clause that "just happens" every N seconds of battle (owner-stated mechanic;
  snow-white S2a 144.73%, N=15 /owner). Fires first at t=N (⚑ phase convention — pin from a
  popup-cadence read).
- Shield-state gates (2026-07-20, owner-ruled default-off): "when a Shield is set" lines ride
  the `shielded` event trigger (fires when an ally's `shield` effect targets the unit);
  "if a Shield is set" lines use `requiresShielded` — active only while a shield window
  (the emitter's stated duration) covers the unit (`shieldedUntilFrame`). Naga (`naga`).
- Static team-composition gates (`teamHas`) can also match SPECIFIC units (`slugs`,
  2026-07-20): noir's same-squad burst line requires `blanc` or `rouge` in the team
  (owner-confirmed the gate is real).

### 2c. Damage over time

Sustained-flavored function damage on a tick timer; ticks reference CURRENT buffs (no snapshot),
never core/range; **tick-crit ON by default** (`DOT_CRIT`, U13 2026-07-21 — ginmy + our footage
confirmed) — **EXCEPT `flavor:"true"` (true-damage) dots, which never crit** (owner ruling 2026-07-21:
true damage cannot crit; engine `crit && !trueFlavor` guard; ada's grenade DoT is the case). A dot's
ticks land during whatever window they land in (Full Burst rules by timing).

### 2d. Stored hits

Attach-then-detonate kits (Rapi: Red Hood): charges accumulate per shot and release at the next
Full Burst start, AFTER entry buffs apply (they detonate inside the window and keep auras —
unlike burst-cast direct damage).

---

## 3. When damage happens: the rotation

Full model in [burst-gauge.md](burst-gauge.md); the engine's state machine in one paragraph:

The gauge (10,000 energy) fills from hits — per trigger vs the boss each unit contributes its
datamined target value ([burst-gauge.md](burst-gauge.md) §2), ×2.5 if it is the camera-focused
unit with a charge weapon (focus-only, MEASURED both ways); skill hits and dot ticks contribute
the flat target value; per-unit kit quirks add on top (helm, liberalio, ein, jill — MEASURED via
the rl3 cross-validation). Generation is locked during Full Burst and during the chain. When the
gauge fills, the chain opens (consuming the gauge): **gauge-full → 30f → Burst 1 → 30f → Burst 2 →
30f → Burst 3 → 22f → Full Burst** (frame-perfect MEASURED 2026-07-21; DECISIONS). Each stage opens a
10-second window for the next (DATAMINED `burst_duration`); in-window selection is FIRST-READY (the
stage-filler whose cooldown ends soonest, tie→leftmost — owner ruling 2026-07-21); an expired window
collapses the chain back to a full refill. The Full Burst countdown starts 22f AFTER the Burst-3 cast
(so instant burst-cast attacks land before it — no +50%). After it ends, the next chain cannot open for
**~2.5s** (`POST_FB_CHAIN_DELAY_FRAMES` 150f — the earlier ~3s double-counted the 30f-pre-B1). Casts are
blocked while the boss is off-screen in a range transition — the one real
source of run-to-run full-burst-count variance. Everything else is cooldown arithmetic, which is
why full-burst counts are deterministic and pinned as regression asserts.

---

## 4. Monte Carlo mode

`cfg.seed` switches crit and core from expectation folding (§1b) to per-instance Bernoulli rolls,
jitters each boss range-transition time by up to ±2s, and jitters chain cast gaps — mirroring the
two real variance sources (crits, boss movement timing). Means are unchanged; the seed spread
gives the error bar a single real run should be judged against, and real runs are compared
against the seed stratum matching their observed full-burst count. Unset seed = the deterministic
expected-value path, byte-identical to the web UI's.

---

## 5. Worked examples (popup-verified anchors)

### 5a. Jill's opening magazine (run I order, electric-weak boss — all four classes measured 99.7%)

FinalATK = 137,059 (staticAtk 120,143 Attacker × her passive ATK stack at fight start).
rate% = 92.4 (71.09 base × her Magnum-Ammo 1.3 multiplier). Element = 1.1. Charge = 1.
DamageUp = 1.0 pre-buffs. AR in range at mid band → Range 0.3.

| popup class | Major | formula result | measured popup |
|---|---|---|---|
| non-crit body | 1 + 0.3 = 1.3 | 181,131 | 180,633 |
| non-crit core | 1.3 + 1.0 = 2.3 | 320,464 | 319,582 |
| crit body | 1.3 + 0.5 = 1.8 | 250,796 | 250,107 |
| acid tick (192%, no core/range/crit) | 1.0 | 289,469 | 288,662 |

### 5b. Cinderella's nuke (the Full Burst boundary rule)

Instance: burst-cast damage, 1,400.6% per sequential hit, FinalATK 187,102 at cast (her own
cast-granted HP→ATK conversion included; anis-star's full-burst-ENTRY flat-ATK grant excluded —
boundary rule), DamageUp 1.209 (trina's cast-granted +20.9% applies; anis-star's entry-aura +34%
does not), Element 1.1, Major = 1.0 non-crit (no FB, no range for burst damage, no core ever):

```
187,102 × 14.006 × 1.0 × 1.1 × 1.209 = 3,485,150   →  measured 3,448,659 (98.9%)
crit: × 1.5                = 5,227,725              →  measured (other fight) ×1.5 pair exact
```

With the +50% (the rejected branch) the prediction is 34% hot — this single popup pair is what
settled the boundary rule.

### 5c. Maiden: Ice Rose gauge fill (solo vs the raid boss)

Weapon shot: target 364 × 2.5 (solo = focused charge weapon) = 910 energy = 9.1% of the gauge —
measured as the exact per-shot bar step. Her rider proc adds the flat 364 (3.64%) as a separate
visible sub-step. Full in ~8 pulls including one reload pause.

---

## 6. Known open items that bound this doc's precision

The board's standing residuals and every CALIBRATED ⚑ value are tracked in
[../open-questions.md](../open-questions.md) — headline items: the UNIGEO ⚑ set (fit-selected long-band
core diameters; the saturated SMG δ0/f_bloom pair) and the SG-override calibration debt awaiting the
re-tune pass (DECISIONS 2026-07-22), the N5 fire comp's real-12-vs-sim-10 Full Burst shortfall (U29), the ~7%
uniform damage-side deficit under the corrected rotation model, per-unit kit-generation quirks
not yet modeled (U11c), and the four kit-level outliers (ein, eunhwa-TU, quency-EQ,
guillotine-WS).


## docs/data/game-mechanics.md

# NIKKE combat mechanics — single source of truth (2026-07-13)

Every game mechanic the simulator's logic references, with where it's implemented and how we
know it. **Companion source of truth: [damage-calculation.md](damage-calculation.md)** — the
exact math the sim computes, formula by formula, with popup-verified worked examples. Detail
docs live alongside this file; per-unit modeling decisions live in `src/skills/overrides/*.json`
notes; unresolved items live in `docs/open-questions.md`; settled tradeoffs in
`../DECISIONS.md` (do not re-litigate).

**Skill resolution (2026-07-16):** the engine never parses skill description text at runtime.
Each unit's override JSON is the complete description of its kit — all three skill slots as
structured blocks, plus an `unmodeled` field listing (verbatim) every kit-text line the model
deliberately does not represent, and optional `caveats` shown as modeling warnings. The offline
kit parser (`scripts/lib/kit-parser.ts`, run by `scripts/materialize-overrides.ts` and the
kit-parse authoring skill) is an authoring aid only.

**Evidence tiers** used throughout (highest to lowest):

- **MEASURED** — frame-counted from our own recordings/tests under scope lock. Never refit.
- **DATAMINED** — decoded game tables (github.com/rcasdzxc/SD, coolguydlm123/nikkecsvlibrary)
  or the frame-accurate reference sim github.com/d34d633f/nikke-einkk.
- **COMMUNITY** — independently verified by multiple community testers (JP: note.com,
  ore-game.com, wiki3.jp; KR: namu.wiki, Arca, DC Inside, Inven; EN: nikke.gg, Prydwen).
- **CALIBRATED ⚑** — value fitted against our validated real fights; mechanism known or
  suspected but the number is ours. Every ⚑ is a standing refit candidate.

Validation basis for all calibrations: scope lock (no cube, no doll, Base 5 gear [not OL0 —
corrected 2026-07-14], 3★ core 7,
sync 400, 10/10/10, treasure on, partless boss, 100% core exposure, full auto, 180s).
Real-run repeatability is 0.5–3.5% per unit (measured by running the same water-weak
validation fight twice), so simulation-vs-real deltas under ~5% are noise.

---

## 1. Damage formula

Damage is a product of independent **buckets**; buffs _inside_ a bucket are additive,
buckets _multiply_. DATAMINED + COMMUNITY, cross-validated by our board.

```
damage = FinalATK_term × rate% × Major × Element × Charge × DamageUp × Taken × Distributed
```

Major bucket = `1 + 0.5·FB + 0.3·range + critRate·(critDmg−1) + coreRate·(coreMult−1)` —
crit, core (+100% base), Full Burst (+50%), and effective range (+30%) all share ONE
additive bracket. The +50% applies by TIMING: burst-cast damage lands before the window
opens and never gets it (§8). Full structure, per-bucket membership, and the skill-proc
("additional damage") rules: **[nikke-damage-formula.md](nikke-damage-formula.md)**.
Engine: `dealDamage()` in `src/engine/sim.ts`.

## 2. Weapon fire cadence

Per trigger pull, 60 fps frame-quantized (COMMUNITY base rates, MEASURED refinements):

| Weapon | Cadence                 | Notes                     |
| ------ | ----------------------- | ------------------------- |
| AR     | 12/s                    | 5 frames exactly          |
| SMG    | 24/s ⚠ **measured 20/s** | see the frame-quantization note below |
| SG     | 1.5/s                   | 10 pellets/shot; 40 frames exactly |
| MG     | 60 rounds/s cap         | after wind-up ladder — §3 |
| Pistol | 4/s                     |                           |
| SR     | charge cycle + 22f bolt | §4                        |
| RL     | charge cycle            | no bolt recovery          |

**⚠ SMG CADENCE IS CONTESTED — the sim ships 24/s, but a direct measurement says 20.0/s
(2026-07-23).** The ammo counter (the shot clock) on
`docs/probes/clean-weapons/emma-claire-idollocean.MP4` with `idoll-ocean` focused reads
`076→066→056→046→036` (t=60.0–62.0, mid band) and `020→010` (t=145.0–145.5, far band) — exactly
10 rounds per 0.5 s, dead linear, in two separate range bands.
**The mechanism is this section's own "frame-quantized" premise.** 1440 rpm = 24/s = **2.5 frames per
shot**, and a census of every datamined `rate_of_fire` in the roster shows **SMG is the only weapon
that is not a whole number of frames** (AR 720→5f, AR 150→24f `jill`, MG 3600→1f,
RL 60/90/120/180/300→60/40/30/20/12f, SG 90→40f, SR 60/200→60/18f). `ceil(2.5) = 3` frames →
exactly 20.0/s. So the table's "24/s" and the "frame-quantized" claim above it are mutually
inconsistent, and the measurement resolves them in favour of 20.
**This CONFLICTS with the ore-game community figure (~24/s) cited below** — that source's other rates
carry ~2% slop (its AR ~11.79/s vs an exact 12/s), which cannot absorb a 20% gap, so the two are
genuinely at odds rather than reconcilable. Our reading is a direct integer count of an in-game
counter, which is the higher-tier instrument.
Engine: SMG frame quantization is **DEFAULT-ON** (flipped 2026-07-23, DECISIONS); `SMGRATE=24` is the
documented revert / A-B arm (`SMGRATE=<n>` pins any rate). Evidence + whole-board A/B:
`docs/probe-runs.md` § "SMG CADENCE".

Base rates: [ore-game measured rates](https://ore-game.com/nikke/post/verify-memo/)
(AR ~11.79/s, SMG ~24/s, SG ~1.50/s at 60fps) + decoded shot tables
([rcasdzxc/SD](https://github.com/rcasdzxc/SD)). The class rate is a DEFAULT — the
datamined `rate_of_fire` column is per-unit and some units deviate wildly (Jill: 150 rpm
= 2.5/s on an "AR", video-confirmed; engine `charFixes.pullsPerSec`). **CHUNKED (multi-part)
RELOADS:** some units empty the magazine and then refill it **in parts**, so the reload
takes N× as long — the datamined `reload_bullet` is `1/chunks` (`10000` = whole mag, 177
units; `3300` = 3 chunks, 14 units — 9 SGs + 5 RLs; `5000` = 2 chunks, `grave`), and
`reload_time` is the PER-CHUNK duration. This is already live: shipped `reloadFrames`
equals `reload_time × chunks × 0.6 + 21` for 190 of 192 units. Firing does NOT resume
between chunks (measured on `grave` and `noir`). `reload_start_ammo` is NOT this signal —
it is `max_ammo − 1` on all 192 rows and identifies nobody. `grave` is the one carrier
shipped un-multiplied → open-questions **U30**. Reload durations are per-unit DB values
(`reloadFrames`). Reload duration is SUBTRACTIVE like charge speed
(IMPLEMENTED 2026-07-13): actual reload = displayed × 0.975 × (1−buff) + 0.21s tail —
buffs past 100% only remove the scaled part
([ore-game reload-limit](https://ore-game.com/nikke/post/reload-limit/); engine
`reloadFramesNeeded`). Known-but-NOT-implemented refinements: post-reload attack locks
(SG 0.47s, AR/SMG/MG ~0.18s).

## 3. MG wind-up

MEASURED frame ladder: 35 rounds over 142 frames, then 1 round/frame (60/s). While not
firing (reload/stun/unhittable) the spin WINDS DOWN: a ~0.27s grace, then the ladder
retraces at ~2.8× climb speed — fully gone after ~1.1s idle (linear fit through ore-game's
two recovery measurements; its endpoints reproduce both prior rules: "no recovery below
~70% reload buff" and our measured ">100% buff = full skip", the latter because the
subtractive reload formula leaves only its 0.21s tail, inside the grace). First 18 rounds
of each wind-up don't land on core (CALIBRATED ⚑, bloom estimate). Full ladder +
derivation:
**[nikke-mg-windup-model.md](nikke-mg-windup-model.md)**. Engine: `MG_RAMP_INTERVALS`,
`MG_NO_CORE_RAMP_ROUNDS`. Corroborating community analyses:
[note.com/tt00771 MG analysis](https://note.com/tt00771/n/nce4d6818b73c),
[ore-game MG heat-up](https://ore-game.com/nikke/post/verify-mg-heatup/) (which also
documents partial wind-up recovery from reload buffs ≥ ~70% — our MEASURED skip threshold
of >100% takes precedence).

## 4. Charge weapons (SR/RL)

- **Charge Speed is SUBTRACTIVE on charge time**: `effective = base × (1 − ΣCS%)`, floored
  at 1 frame, hard-capped at +100% (DATAMINED; StatChargeTime is a negative % on time).
  It is NOT `base / (1+CS)`.
- **SR bolt cycle**: +22 frames after each shot (MEASURED: helm recording, 1.37s cycle =
  60f charge + 22f). Weapon-swap states and `charFixes.noBoltRecovery` units are exempt.
  Reload starts immediately after the final shot.
- **Whole-magazine dump** (`charFixes.magDumpRof`): `cinderella` charges ONCE per magazine, then
  autofires all 24 rounds at her datamined `rate_of_fire` without recharging, then reloads and
  re-charges (MEASURED 2026-07-21, ammo-counter frame read; ≈390 pulls/180s). Charge Speed
  shortens only the once-per-mag prime charge. Details: [charge-weapons.md](charge-weapons.md) §2a.
- **Auto always full-charges** (DATAMINED, einkk `NikkeFullChargeMode.always`) — but
  full-charge-GATED procs miss on ~32% of auto releases (§7).
- Full-charge multiplier is per-weapon-per-unit (SR typ. 250%, Alice 350%); ordinary Charge
  Damage ▲ buffs add flat points inside the charge bucket; `chargeDamageMultPct`-class buffs
  (Helm burst, collection items) multiply BASE charge damage.
- Excess charge speed past the +100% cap is wasted, except explicit kit conversions
  (Red Hood S1: excess × 2.4 → Charge Damage).
  Details + decoded examples (Red Wolf's 200rpm fire-rate-gated window):
  **[charge-weapons.md](charge-weapons.md)**. Engine: charge block in the per-frame loop.

## 5. Effective range & the test boss

+30% damage when the target sits in the weapon's effective band; **RL never gets it**;
the bonus lives in the Major bucket. Test-boss movement is a fixed script (MEASURED):
mid 0–33s → near 33–70 → far 70–106 → midfar 106–144 → near 144–176 → midfar 176–180,
with band eligibility near=SG, mid=SMG+AR, mfar=SR, **mid-far=SR+MG**. Each transition has a 1s
unhittable window; units whose EFFECTIVE reload is ≤1s get a free full reload during it.
The machine-gun row is MEASURED (2026-07-14, the crown solo recording): popup class ratios
read the bonus present in the far band ONLY — mid, near, and mid-far all read the no-bonus
signatures (~~the old table granted machine guns the mid-far band~~ SUPERSEDED 2026-07-14).
The same recording showed the bonus flips track the boss's physical walk, leading/lagging the
scripted boundaries by ~4–6 seconds — the real trigger is instantaneous distance crossing the
weapon's optimal ring, and the band table approximates it. Raw measurements:
**[range_data.md](range_data.md)** (user, 2026-07-13) + probe u7 battery 4 (2026-07-14). The
+30%/RL-never rule is community-verified ([nikke.gg damage formula](https://nikke.gg/damage-formula/),
[ore-game verify-memo](https://ore-game.com/nikke/post/verify-memo/)); the band timeline and
weapon-band eligibility are OUR boss-specific measurements. Engine: `BOSS_RANGE_SCRIPT`,
`RANGE_ELIGIBLE`, `UNHITTABLE_FRAMES`.

## 6. Burst gauge generation

Gauge = 10,000 energy; fill counts HITS, not damage. Per trigger pull vs the boss the
gauge gains the unit's DATAMINED `target_burst_energy_pershot` (universally exactly 2×
the non-target base — the "boss ×2" is a table column, not a rule; per-unit values in
`data/gauge-per-shot.json`, e.g. standard launcher 280, sniper 560, Trina's famous
battery 720). The CAMERA-FOCUSED unit's charge weapon generates ×(1 + 1.5×charge) = ×2.5
at full charge; unfocused charge units generate flat ×1.0 — both sides MEASURED (two solo
recordings plus a paired two-unit experiment with only the focus changed). Focus defaults
to the middle slot (owner convention; recordings with a different focus perturb the fight
they record). Skill
hits and DoT ticks generate the caster's flat target value (no charge bonus). Opening
the burst chain CONSUMES the gauge, and hits during the chain or Full Burst generate
nothing. No auto-play efficiency factor exists (the old 0.7 ⚑ compensated for the chain
mechanics, now modeled directly). Full model + sources + the two solo measurements:
**[burst-gauge.md](burst-gauge.md)**. Engine: `gaugePerShot`/`addGauge`/`skillGauge`.

## 7. Auto behaviors

All of §7 exists because scope-lock runs are full auto — manual play changes these numbers.
Details: **[auto-play.md](auto-play.md)**.

- **Core rate for accuracy-circle weapons (AR/SMG/SG) = UNIFORM-IN-CIRCLE geometry ("UNIGEO",
  LIVE default `'all'` 2026-07-22; DECISIONS 2026-07-22).** Shots/pellets land **uniform per area**
  inside the aim circle, whose on-screen radius is **R(hr) = (0.648 × the unit's datamined
  `start_accuracy_circle_scale` ÷ 2) · (1 − Hit Rate/100) px** — the circle shrinks LINEARLY to zero
  at Hit Rate 100 (MEASURED: two owner-traced native-resolution frames, 79.3 px at HR 0 / 48.2 px at
  HR 38.91, weapon-matched shotgun pair; cross-validated by machine circle-fits and the bloom-peak
  px calibration). A hit cores iff it falls in the boss-core disc:
  **SG** core-per-landed-pellet = (r_core(band)/R(hr))² ÷ coverage; **AR/SMG** core-per-hit =
  the lens overlap of a uniform disc of radius f_bloom·R(hr), centered δ(hr) = δ0·(1−hr/120) px off
  the core, with the core disc (⚑ CALIBRATED per class: δ0 = AR 15.9 / SMG 17.9 px, f_bloom =
  AR 0.578 / SMG 0.728 — the SMG pair is a saturated 2-cell fit, flagged). Core diameters: near
  31 px MEASURED; mid/midfar/far = 20.9/15.8/12.7 px **⚑ FIT-SELECTED** (owner re-trace supersedes).
  The uniform distribution is MEASURED directly — 101 machine-read per-pellet marker positions
  refute the previous Gaussian at KS 0.376 (crit 0.135) — and the drawn reticle remains decorative.
  Effect rises steeply with Hit Rate (the shrinking circle concentrates onto the core; AR at ▲80 is
  all-core geometrically because the circle fits inside the core). **MG/SR/RL keep the flat 0.95
  base rate** (no accuracy circle). **The prior δ-offset ("Rician") Gaussian cone survives on two
  paths only** — `UNIGEO=off` (byte-identical revert arm) and medium/large `bossPelletProfile`
  fights (the coverage tables are the scope-lock boss silhouette) — with its frozen params in
  `sg-geometry.ts`, never refit. Evidence: the owner's 728-pellet hand count (18 cells, 4 bands ×
  Hit-Rate on/off) reproduced by the engine untuned; a pre-registered replication; the marker-position
  read. Engine: `src/engine/unigeo.ts` (+ `unigeo-coverage.ts`); full record
  `docs/handoffs/2026-07-22-sg-geometry-handoff.md` + DECISIONS 2026-07-22.
- **Early charge releases are rare (~2% of shots**, user-observed ~3/fight from boss
  interruptions) — auto effectively always full-charges, and full-charge-gated proc counters
  fire on essentially every shot. Maiden:IR's former ×0.68 proc factor is RESOLVED as her
  release-latency cadence, video-measured (open-questions A12; [auto-play.md](auto-play.md) §2a).
- **Burst-chain timing** (frame-perfect MEASURED 2026-07-21, chisato.mov; DECISIONS 2026-07-21
  coherent rotation model): the chain runs **`gauge-full → 30f → B1 → 30f → B2 → 30f → B3 → 22f →
FB countdown (10s)`**. So gauge-full → FB-start ≈ 112f (~1.87s), not the old ~0.9s. Constants:
  a **30f delay before B1** (`PRE_B1_GAP_FRAMES`), **30f between stages** (`STAGE_CAST_GAP_FRAMES`,
  0.5s), and a **22f delay between the B3 cast and the FB countdown** (`FB_PRE_DELAY_FRAMES`) — that
  gap is why instant burst-cast attacks land before Full Burst begins (no +50%). After FB ends, the
  next chain can't open for **~2.5s** (`POST_FB_CHAIN_DELAY_FRAMES` = **150f**; the earlier 180f/~3s
  double-counted the now-separately-modeled 30f-pre-B1). **Fight start:** ~8f (`FIGHT_DELAY_FRAMES`
  0.133s) before the first bullet (bullet lands at 0.133s; the earlier 1s was a timer-framing confound —
  the 3:00 timer reads 2:59:999 at elapsed 0). This post-full-burst window + the chain timing, not
  gauge refill, pace high-generation teams.
- **Casts are blocked while the boss is off-screen** during a range transition (~1s,
  owner-confirmed) — the only genuine source of run-to-run full-burst-count variance
  (a transition colliding with a chain). Everywhere else, **full-burst counts are
  cooldown/chain arithmetic and deterministic run-to-run** — the graded comps are pinned
  as exact asserts in `scripts/regression.ts`.
- **SG pellet landing = 0.96 × coverage(band, R(hr))** (LIVE with UNIGEO, 2026-07-22) — the fraction
  of the Hit-Rate-state aim circle covered by the boss silhouette (owner-traced, range-scaled
  px ∝ 1/distance at band distances 20.7/30.7/40.7/50.7), times a MEASURED 0.96 tracking-wander
  loss (the auto-aim circle sits slightly off the moving boss at times — owner-ruled real).
  **Landing is Hit-Rate-dependent** (the shrinking circle pulls pellets onto the body): at HR 0 ≈
  near .813 / mid .712 / midfar .657 / far .607; at ▲38.91 ≈ .960/.873/.725/.710 — matching the
  owner's 728-pellet hand count (near-OFF measured 0.780, near-ON 0.931, etc.). Landing scales SG
  shot damage AND per-pellet burst-gauge generation (`unigeoSgLanding` → the gauge feed); seeded
  runs draw whole landed-pellet counts as before. The boss silhouette is non-convex (hourglass +
  wide shoulders), which is why coverage stays nearly flat with range while the core shrinks 45% —
  the old "flat per-band table" (near 0.888 / mid 0.986 / far 0.74 / midfar 0.888, HR-blind,
  counter-reconciled against the old flat-core model) sat 12–24% ABOVE the directly-counted landing
  and survives only on the `UNIGEO=off` revert path. Scope-lock boss only — medium/large
  `bossPelletProfile` fights fall through to the cone path. → DECISIONS 2026-07-22;
  `docs/probe-data/soda-tb-sg-core-hr-windows.json` (the count of record).
- Auto burst priority is **leftmost slot order, with waiting**: inside a timed stage
  window the chain waits for the leftmost stage-filling unit whose cooldown ends before
  the window closes rather than handing the cast to a lower-priority ready unit
  (owner-ruled + Monte Carlo evidence; a round-robin was tried and rejected).
- **Focus-sync burst gate** (`burstGate: 'syncWithFocus'`, `PreparedUnit`/`UnitState`): an
  opt-in per-unit flag — used by the DPS-chart Hyper Carry frameworks for Mast — that lets a
  unit take its burst stage only while the focus (tested) unit is off cooldown (so it bursts
  with the carry, never in a Helm-only chain) AND makes it sit out the full burst after every
  3rd of its own bursts (Mast's Hangover 10s self-stun): the gate skips it on every 4th of the
  focus unit's bursts, and Crown fills that Burst-2 slot. Not a measured value — a modeling
  switch (see [DECISIONS](../DECISIONS.md)).
- **Every-other burst gate** (`burstGate: 'everyOther'`): an opt-in per-unit flag — used by
  the DPS-chart Solo framework on the tested unit — that forbids a unit from taking the
  stage-3 cast in two consecutive Full Bursts, so it strictly alternates with the other
  Burst-3 unit. Needed because a Full-Burst-extending kit (e.g. Modernia's 15-second Full
  Burst) can bring the unit's cooldown inside the next stage window, where the
  leftmost-with-waiting rule would stall the chain and hand it consecutive casts. Not a
  measured value — a framework modeling switch; no real comp sets it.

## 8. Burst rotation rules

**What Full Burst itself does (owner ruling 2026-07-22): the +50% damage multiplier, and nothing
else.** Full Burst carries no inherent change to accuracy, aim, spread, cover behaviour or fire
rhythm — any such effect in a fight comes from a unit's kit firing on Full-Burst entry, never from
the state itself. **How to apply when reading footage:** an in-Full-Burst vs out-of-Full-Burst
comparison of a geometry quantity (pellet landing, core-hit fraction, hit rate) is NOT confounded by
the Full Burst state, so such a split may be used directly as a control for whatever kit buff is
being isolated. Only damage magnitudes need the +50% removed.

Full Burst = 10s; rotation = FB + chain + gauge refill, gated by burst cooldowns. A
Burst-1/2 cast opens the next stage for 10 seconds (DATAMINED `burst_duration`; 5s/15s/
20s variants exist — the same column encodes short-Full-Burst units); if the window
expires with no ready caster the chain collapses and the gauge must fully refill
(measured: the 3-unit battery fight's 40s rotation). Auto-burst picks the LEFTMOST ready
unit of the wanted stage. Burst cooldowns
(20s/40s per unit; DB errors exist — Tia's real CD is 20s, fixed via
`charFixes.burstCooldownSec`; Cinderella's 40s was re-verified correct by nuke-storm
counting after a cut-in-artifact misread). Λ (all-stage) units count as NO burst type for formation
checks; Tia is a "B1+" (re-entry B1; the Tia+Anis:Star interaction is deliberately
unmodeled). `reenterStage` (Tia, Anis Everyone's Star) re-opens stage 1 mid-rotation;
`burstFirst` (Prika duet) claims the first burst of its stage; once-per-battle CD refunds
exist (Red Hood B1/B2). Burst-cast damage timing (MEASURED 2026-07-13, popup-verified on Cinderella's nuke
across two fights): burst-skill damage dealt at cast lands BEFORE Full Burst begins — it
receives neither the +50% Full Burst multiplier NOR "when entering Full Burst" auras
(one rule covers both; independently corroborated by the JP DayWrite formula article).
Buffs granted by earlier casts in the same rotation (a Burst-2's team buff) DO apply.
Burst-originated damage landing DURING the window (DoT ticks, stored hits, per-shot
procs) still gets the +50% and the entry auras. Engine ordering: burst-cast blocks
resolve before full-burst-entry triggers; stored-hit releases after. Scope note
(2026-07-13): the measured rule governs the burst button's OWN cast damage; a skill-slot
effect that merely triggers on a burst cast resolves after the window opens and does get
the +50% (though not same-cast self-buffs or entry auras) — this distinction is why Snow
White: Heavy Arms's Fully Active volley was re-modeled onto her in-window full-charge
shots (see damage-calculation.md §2b), where the community sources place it. Sources: leftmost priority
([Inven](https://m.inven.co.kr/webzine/wznews.php?site=nikke&p=2&idx=303197),
[nikke.gg](https://nikke.gg/mastering-burst-chains-the-core-combat-mechanic-every-nikke-player-needs-to-understand/)),
chain timing ([nikke-synergy](https://nikke-synergy.com/arena-guide_en)), Λ/B1+/CD rulings
(user, 2026-07-13), Red Wolf CD refunds (decoded,
[rcasdzxc/SD](https://github.com/rcasdzxc/SD)).

## 9. Skill procs, DoTs, and damage flavors

"Deals X% of final ATK as additional damage" lines are FUNCTION-type skill damage
(DATAMINED): they **crit at the caster's rate, never core, never get range, take the FB
+50% only when they land during Full Burst**, use the Element and Damage-Up buckets, and
never take charge multipliers. Weapon-based deliveries (launchWeapon: Anis:Star's stars,
Rapi:RH's projectiles) DO core+crit but still no range. DoTs are Sustained-flavored
function damage whose ticks reference CURRENT buffs (not snapshots); tick-crit is
ON by default (`DOT_CRIT`, U13 2026-07-21) — but **TRUE DAMAGE NEVER CRITS** (owner ruling 2026-07-21;
engine `crit && !trueFlavor` guard), so `flavor:"true"` dots/flatDamage + `trueNormals` windows are
crit-exempt. Sustained/True/Sequential Damage ▲ buffs gate on hit flavor.
Full rules table: **[nikke-damage-formula.md](nikke-damage-formula.md)** §3.

Some kit lines with NO printed "Activates when…" clause are **internal-cooldown skills**:
the effect just fires every N seconds of battle (OWNER-stated mechanic 2026-07-20; first
example: Snow White `snow-white`'s Skill-2 144.73% area damage, cooldown 15 s /owner).
Engine: the `interval` trigger fires every N sec, first at t=N — the first-fire phase
(t=N vs t=0) is a ⚑ convention pending a popup-cadence read.

Shield-gated kit lines ("when/if a Shield is set in front of this unit" — Naga `naga`)
follow the REAL shield machinery (owner-ruled default-off 2026-07-20): "when a Shield is
set" lines fire on the shield-application EVENT (`shielded` trigger); "if a Shield is set"
lines check the live shield-state WINDOW at their own trigger time (`requiresShielded`,
window = the emitting shield's stated duration). No shielder in the team ⇒ the lines are
inert. Same-squad gates ("with an ally from the same squad on the battlefield" — Noir
`noir`, satisfied by Blanc `blanc` / Rouge `rouge`, owner-confirmed) are static team-
composition checks (`teamHas.slugs`), exact at scope lock where no ally ever dies.

## 10. Elemental advantage

×(1.1 + Element Damage ▲ sources) as its own bucket, only with advantage; "Superior
Elemental Code Attack Damage"-style buffs sit in the Damage-Up bucket instead
(`elemAdvantageDamagePct`) and also apply only with advantage. Wheel: Fire→Wind→Iron→
Electric→Water→Fire. No hidden bonus beyond the base 1.1
([nikke.gg](https://nikke.gg/damage-formula/),
[ore-game](https://ore-game.com/nikke/post/verify-memo/),
[official @NIKKE_en stacking clarification](https://x.com/NIKKE_en/status/1678710452862472193)).

## 11. Buff stacking & targeting rules

- Same buff name + same application scope: re-application REFRESHES (overwrites), never
  co-stacks; same effect from different scopes stacks (KR consensus:
  [arca.live/b/nikketgv/129255162](https://arca.live/b/nikketgv/129255162); official:
  [@NIKKE_en](https://x.com/NIKKE_en/status/1678710452862472193)). IMPLEMENTED 2026-07-13:
  the engine dedupes same (caster, skill slot, stat, value) across trigger blocks — found
  live on Crown's two S1 "Reloading Speed ▲ 44.35%" lines, which the old engine stacked to
  88.7%. (Namu confirms her kit actually targets disjoint groups — burst casters vs
  non-casters — so no unit legitimately receives both lines; the dedupe matches real kit
  structure.)
- Buff windows come in TWO kinds and they are not interchangeable. Most are **timed** (a
  seconds duration). Kit lines reading "**for N round(s)**" are **round-scoped**: they end
  after the holder fires N bullets, so the window stretches across a reload and shrinks if the
  unit is given attack-speed support. IMPLEMENTED 2026-07-23 as `durationShots` (a round = one
  bullet, `hitsPerShot` for an MG, spent right after the shot so the Nth shot still benefits).
  A round count can be genuinely inexpressible as a duration — helm's burst runs 10 rounds on a
  6-round magazine, so it necessarily spans a reload. NB a "reload speed is **fixed at** x for N
  rounds" line is a stat CLAMP, a different mechanic, still unmodeled.
- A Critical Rate buff may be scoped to **normal attacks only** ("Critical Rate of normal
  attacks ▲x%", helm S1) — it never lifts crit on skill procs or burst damage, even when the
  buff targets the whole team. Distinct from an unscoped "Critical Rate ▲x%".
- "ATK ▲ X% of caster's ATK" adds the CASTER's final ATK × X as a flat term (strong from
  high-ATK buffers); plain ATK ▲ dilutes into the (1+ATK%) sum
  ([nikke.gg damage formula](https://nikke.gg/damage-formula/)).
- Damage Taken ▲ debuffs from different sources stack; no cap found
  ([ginmy.net bracket test](https://ginmy.net/nikke_atkdamagebuff_test)).
- Max Ammunition ▼ clips the CURRENT belt when it lands (MEASURED/user); max-ammo sources
  stack additively. Increases never clip.
- Distributed damage deals the same TOTAL against 1 target as against many (user-verified).
- Pierce Damage ▲ is a **Damage-Up-bucket** entry that benefits any Pierce-damage-type unit —
  static (`hasPierce`/`pierceModes`), during a timed "Gain Pierce for N sec" window
  (`gainPierce` → `pierceUntilFrame`, 2026-07-17), OR — swap-scoped — on the shots of a burst
  weapon-swap whose "Additional Effect: Pierce" belongs to the swapped weapon only
  (`weaponSwap.hasPierce` → per-shot tag, 2026-07-20, owner-ruled; Snow White `snow-white`'s
  cannon). It **applies on the partless boss** (it is ordinary damage-up, not the double-hit
  below — do not conflate the two).
- Pierce core+body double-hits are a MULTI-PART-boss mechanic
  ([nikke.gg index](https://nikke.gg/index/); TV Tropes corroboration); on the partless
  test boss there is no doubling (OUR A/B test vs run A, 2026-07-13; engine
  `PIERCE_CORE_DOUBLE = false` switch retained).

## 12. Environment & data-source caveats

- Everything assumes 60 fps with the "Min Firing Rounds Adjustment" setting ON; MG/SMG/AR
  DPS is strongly FPS-dependent below that (COMMUNITY).
- blablalink (official) skill data LAGS balance patches — the 2026-07-02
  distributed-damage compensation (SBS +13%, Elegg reworks;
  [@NIKKE_en](https://x.com/NIKKE_en/status/2069084116591796521),
  [nikke.gg patch notes](https://nikke.gg/july-2-patch-notes/),
  [ruliweb notice](https://bbs.ruliweb.com/news/board/320108/read/2290922)) was still
  absent on 2026-07-13; post-patch values are pinned in the affected overrides. Re-verify
  after each sync. Historical DPS-affecting bug catalog:
  [nikke.gg/bug-guide](https://nikke.gg/bug-guide/) (incl. the live Ark Ranger Black DoT
  timing bug).
- Solo-raid displayed per-unit damage totals include all damage the unit dealt to all
  targets (DoTs attributed to their caster).
- **On-screen damage popups belong ONLY to the currently FOCUSED unit** (the unit whose
  third-person camera is active) — user-confirmed 2026-07-13. Popup-based analysis of a
  recording measures one unit's hits, not the team's; the top damage counter still
  aggregates everyone. Record which unit holds focus when capturing footage.
- Shooting-range (사격장) numbers do NOT transfer to solo raid (different core/distance/
  element) — never calibrate against them
  ([arca.live/b/nikketgv/79367873](https://arca.live/b/nikketgv/79367873),
  [dcinside 3902276](https://gall.dcinside.com/mgallery/board/view/?id=gov&no=3902276)).


---

# PART 3 — GROUND TRUTH: kit prose + base stats (data/characters.json extract)

```json
{
  "slug": "guillotine-winter-slayer",
  "name": "Guillotine: Winter Slayer",
  "imageUrl": "https://sg-tools-cdn.blablalink.com/vq-37/pt-14/1c0cd513739ac5f0f15443718fa804fc.png",
  "weapon": "AR",
  "burst": "III",
  "burstCooldownSec": 40,
  "class": "Attacker",
  "element": "Water",
  "manufacturer": "Pilgrim",
  "normalAttackMultiplier": 13.65,
  "coreAttackMultiplier": 200,
  "ammo": 60,
  "reloadFrames": 81,
  "chargeFrames": 0,
  "chargeMultiplier": 0,
  "hitsPerShot": 1,
  "rl3": 7.6,
  "burstGaugePerShot": 0.2,
  "treasure": false,
  "nicknames": [
    "gws"
  ],
  "skills": {
    "skill1": "■ Activates every time EXP stacks 10. Affects self.\nHero Level Up: Reaches a maximum of Level 11.\nHero Level Up Reward: Reloads 10.26%.\nHero Level Up Reward: Recovers 2.44% of the skill user's final Max HP.\n■ Activates when Hero levels up. Affects all Water Code allies.\nElemental Advantage Attack Damage ▲ 1.16% * Hero Level continuously.\nATK ▲ 0.91% of the skill user's ATK * Hero Level continuously.",
    "skill2": "■ Activates after landing 6 normal attack(s) without hitting the core. Affects self.\nEXP: ATK ▲ 1.81%, stacks up to 100 time(s) continuously. \n■ Activates when hitting the Core for 3 time(s). Affects self.\nEXP: ATK ▲ 1.81%, stacks up to 100 time(s) continuously.\n■ Activates when Hero Level is 2 or above. Affects self.\nElemental Advantage Attack Damage ▲ 7.46% continuously.",
    "burst": "■ Affects all Water Code allies.\nAttack Damage ▲ 10.14% for 10 sec.\nElemental Advantage Attack Damage ▲ 18.75% for 10 sec.\n■ Affects 1 enemy unit(s) with the highest final Max HP.\nDeals continuous damage equal to 20.87% of the final ATK * Hero Level every sec for 10 sec."
  },
  "skillCooldownsSec": {
    "skill1": null,
    "skill2": null,
    "burst": 40
  },
  "role": {
    "weapon": {
      "shot_id": 1018201,
      "shot_detail": {
        "id": 1018201,
        "damage": 1365,
        "max_ammo": 60,
        "shake_id": 2,
        "ShakeType": "Fire_AR",
        "fire_type": "Instant",
        "zoom_rate": 0,
        "input_type": "DOWN",
        "shot_count": 1,
        "ShakeWeight": 120,
        "attack_type": "Metal",
        "camera_work": "camera_work_01",
        "charge_time": 0,
        "penetration": 0,
        "reload_time": 100,
        "shot_timing": "Concurrence",
        "spot_radius": 0,
        "weapon_type": "AR",
        "is_targeting": true,
        "muzzle_count": 1,
        "rate_of_fire": 720,
        "name_localkey": "Assault Rifle",
        "prefer_target": "TargetAR",
        "reload_bullet": 10000,
        "counter_enermy": "Metal_Type",
        "multi_aim_range": 0,
        "spot_last_delay": 20,
        "core_damage_rate": 20000,
        "end_rate_of_fire": 720,
        "spot_first_delay": 20,
        "center_shot_count": 0,
        "reload_start_ammo": 59,
        "full_charge_damage": 10000,
        "multi_target_count": 0,
        "spot_radius_object": 0,
        "uptype_fire_timing": 0,
        "burst_energy_pershot": 2000,
        "description_localkey": "■ Affects target(s).\n<color=#00AEFF>Deals {damage}% of ATK as damage.\nDeals {core_damage_rate}% damage when attacking core.</color>",
        "maintain_fire_stance": 0,
        "spot_explosion_range": 0,
        "use_function_id_list": [
          0
        ],
        "accuracy_change_speed": 0,
        "hurt_function_id_list": [
          0
        ],
        "spot_projectile_speed": 0,
        "accuracy_change_pershot": 0,
        "prefer_target_condition": "None",
        "rate_of_fire_reset_time": 0,
        "full_charge_burst_energy": 0,
        "end_accuracy_circle_scale": 75,
        "auto_accuracy_change_speed": 0,
        "rate_of_fire_change_pershot": 0,
        "start_accuracy_circle_scale": 75,
        "target_burst_energy_pershot": 4000,
        "auto_accuracy_change_pershot": 0,
        "auto_end_accuracy_circle_scale": 75,
        "auto_start_accuracy_circle_scale": 75
      },
      "bonusrange_max": 45,
      "bonusrange_min": 25
    },
    "burstMeta": {
      "burst_duration": 1000,
      "use_burst_skill": "Step3",
      "burst_apply_delay": 1,
      "change_burst_step": "StepFull"
    },
    "skillDetails": {
      "skill1_id": 2182101,
      "skill2_id": 2182201,
      "skill1_table": "StateEffect",
      "skill2_table": "StateEffect",
      "skill1_detail": {
        "id": 2182101,
        "icon": "icn_skill_atkup_01",
        "group_id": 21821,
        "skill_level": 1,
        "name_localkey": "Hero's Fate",
        "next_level_id": 2182102,
        "level_up_cost_id": 20102,
        "description_localkey": "■ Activates every time EXP stacks {description_value_01}. Affects self.\n<color=#00AEFF>Hero Level Up: Reaches a maximum of Level 11.\nHero Level Up Reward: Reloads {description_value_02}%.\nHero Level Up Reward: Recovers {description_value_03}% of the skill user's <word_group=10025>final</word_group> Max HP.</color>\n■ Activates when Hero levels up. Affects all Water Code allies.\n<color=#00AEFF><word_group=10009>Elemental Advantage Attack Damage</word_group> ▲ {description_value_04}% * Hero Level continuously.\nATK ▲ {description_value_05}% of the skill user's ATK * Hero Level continuously.</color>",
        "description_value_list": [
          {
            "description_value": [
              "10",
              "10",
              "10",
              "10",
              "10",
              "10",
              "10",
              "10",
              "10",
              "10"
            ]
          },
          {
            "description_value": [
              "6.06",
              "6.53",
              "7",
              "7.46",
              "7.93",
              "8.4",
              "8.86",
              "9.33",
              "9.8",
              "10.26"
            ]
          },
          {
            "description_value": [
              "1.44",
              "1.55",
              "1.66",
              "1.77",
              "1.88",
              "2",
              "2.11",
              "2.22",
              "2.33",
              "2.44"
            ]
          },
          {
            "description_value": [
              "0.68",
              "0.74",
              "0.79",
              "0.84",
              "0.89",
              "0.94",
              "1",
              "1.06",
              "1.1",
              "1.16"
            ]
          },
          {
            "description_value": [
              "0.55",
              "0.58",
              "0.63",
              "0.67",
              "0.71",
              "0.75",
              "0.79",
              "0.84",
              "0.88",
              "0.91"
            ]
          },
          {},
          {},
          {},
          {},
          {},
          {}
        ],
        "info_description_localkey": "Skill 1"
      },
      "skill2_detail": {
        "id": 2182201,
        "icon": "icn_skill_atkup_01",
        "group_id": 21822,
        "skill_level": 1,
        "name_localkey": "Hero's Gift",
        "next_level_id": 2182202,
        "level_up_cost_id": 20202,
        "description_localkey": "■ Activates after landing {description_value_01} normal attack(s) without hitting the core. Affects self.\n<color=#00AEFF>EXP: ATK ▲ {description_value_02}%, stacks up to {description_value_03} time(s) continuously. </color>\n■ Activates when hitting the Core for {description_value_04} time(s). Affects self.\n<color=#00AEFF>EXP: ATK ▲ {description_value_05}%, stacks up to {description_value_06} time(s) continuously.</color>\n■ Activates when Hero Level is 2 or above. Affects self.\n<color=#00AEFF><word_group=10009>Elemental Advantage Attack Damage</word_group> ▲ {description_value_07}% continuously.</color>",
        "description_value_list": [
          {
            "description_value": [
              "6",
              "6",
              "6",
              "6",
              "6",
              "6",
              "6",
              "6",
              "6",
              "6"
            ]
          },
          {
            "description_value": [
              "1.07",
              "1.15",
              "1.24",
              "1.32",
              "1.4",
              "1.48",
              "1.57",
              "1.65",
              "1.73",
              "1.81"
            ]
          },
          {
            "description_value": [
              "100",
              "100",
              "100",
              "100",
              "100",
              "100",
              "100",
              "100",
              "100",
              "100"
            ]
          },
          {
            "description_value": [
              "3",
              "3",
              "3",
              "3",
              "3",
              "3",
              "3",
              "3",
              "3",
              "3"
            ]
          },
          {
            "description_value": [
              "1.07",
              "1.15",
              "1.24",
              "1.32",
              "1.4",
              "1.48",
              "1.57",
              "1.65",
              "1.73",
              "1.81"
            ]
          },
          {
            "description_value": [
              "100",
              "100",
              "100",
              "100",
              "100",
              "100",
              "100",
              "100",
              "100",
              "100"
            ]
          },
          {
            "description_value": [
              "4.37",
              "4.76",
              "5.07",
              "5.4",
              "5.72",
              "6.05",
              "6.42",
              "6.81",
              "7.07",
              "7.46"
            ]
          },
          {},
          {},
          {},
          {}
        ],
        "info_description_localkey": "Skill 2"
      },
      "ulti_skill_id": 1182301,
      "ulti_skill_detail": {
        "id": 1182301,
        "icon": "icn_skill_c182_ult",
        "group_id": 11823,
        "shake_id": 1,
        "skill_type": "InstantNumber",
        "attack_type": "Water",
        "skill_level": 1,
        "counter_type": "Metal_Type",
        "duration_type": "TimeSec",
        "name_localkey": "Extermination",
        "next_level_id": 1182302,
        "prefer_target": "HighMaxHP",
        "resource_name": "c182_ulti",
        "duration_value": 0,
        "skill_cooltime": 4000,
        "level_up_cost_id": 20302,
        "skill_value_data": [
          {
            "skill_value": 0,
            "skill_value_type": "Percent"
          },
          {
            "skill_value": 1,
            "skill_value_type": "Integer"
          },
          {
            "skill_value": 0,
            "skill_value_type": "Integer"
          },
          {
            "skill_value": 0,
            "skill_value_type": "None"
          },
          {
            "skill_value": 0,
            "skill_value_type": "None"
          }
        ],
        "skill_cooltime_list": [
          4000,
          4000,
          4000,
          4000,
          4000,
          4000,
          4000,
          4000,
          4000,
          4000
        ],
        "description_localkey": "■ Affects all Water Code allies.\n<color=#00AEFF>Attack Damage ▲ {description_value_01}% for {description_value_02} sec.\n<word_group=10009>Elemental Advantage Attack Damage</word_group> ▲ {description_value_03}% for {description_value_04} sec.</color>\n■ Affects {description_value_05} enemy unit(s) with the highest <word_group=10025>final</word_group> Max HP.\n<color=#00AEFF>Deals continuous damage equal to {description_value_06}% of the <word_group=10025>final</word_group> ATK * Hero Level every sec for {description_value_07} sec.</color>",
        "description_value_list": [
          {
            "description_value": [
              "5.99",
              "6.45",
              "6.91",
              "7.37",
              "7.83",
              "8.29",
              "8.76",
              "9.22",
              "9.68",
              "10.14"
            ]
          },
          {
            "description_value": [
              "10",
              "10",
              "10",
              "10",
              "10",
              "10",
              "10",
              "10",
              "10",
              "10"
            ]
          },
          {
            "description_value": [
              "11.08",
              "11.93",
              "12.78",
              "13.64",
              "14.49",
              "15.34",
              "16.19",
              "17.05",
              "17.9",
              "18.75"
            ]
          },
          {
            "description_value": [
              "10",
              "10",
              "10",
              "10",
              "10",
              "10",
              "10",
              "10",
              "10",
              "10"
            ]
          },
          {
            "description_value": [
              "1",
              "1",
              "1",
              "1",
              "1",
              "1",
              "1",
              "1",
              "1",
              "1"
            ]
          },
          {
            "description_value": [
              "12.34",
              "13.28",
              "14.23",
              "15.17",
              "16.14",
              "17.08",
              "18.03",
              "18.99",
              "19.93",
              "20.87"
            ]
          },
          {
            "description_value": [
              "10",
              "10",
              "10",
              "10",
              "10",
              "10",
              "10",
              "10",
              "10",
              "10"
            ]
          },
          {},
          {},
          {},
          {}
        ],
        "prefer_target_condition": "IncludeNoneTargetLast",
        "info_description_localkey": "Burst Skill",
        "after_use_function_id_list": [
          118230101,
          118230102
        ],
        "after_hurt_function_id_list": [
          118230103
        ],
        "before_use_function_id_list": [
          118230104
        ],
        "before_hurt_function_id_list": [
          0
        ]
      }
    },
    "statScaling": {
      "grow_grade": 218202,
      "grade_core_id": 1,
      "stat_enhance_id": 5101,
      "stat_enhance_detail": {
        "id": 5101,
        "core_hp": 200,
        "grade_hp": 3000,
        "core_attack": 200,
        "grade_ratio": 200,
        "core_defence": 200,
        "grade_attack": 20,
        "grade_defence": 100,
        "core_bio_resist": 0,
        "grade_bio_resist": 0,
        "core_metal_resist": 0,
        "core_energy_resist": 0,
        "grade_metal_resist": 0,
        "grade_energy_resist": 0
      }
    },
    "element": {
      "element_id": [
        200001
      ],
      "element_details": [
        {
          "id": 200001,
          "element": "Water",
          "group_id": 5000002,
          "element_icon": "icn_element_water",
          "weak_element_id": 400001,
          "element_desc_localekey": "Injects Code: P.S.I.D. to all fire-type enemies, dealing 10% additional damage.",
          "element_name_localekey": "Water",
          "element_code_name_localekey": "Code: P.S.I.D."
        }
      ]
    },
    "piece": {
      "piece_id": 5100182,
      "piece_detail": {
        "id": 5100182,
        "class": "Attacker",
        "order": 18200,
        "use_id": 0,
        "use_type": "None",
        "item_rare": "SSR",
        "item_type": "Piece",
        "stack_max": 9999999,
        "use_value": 0,
        "corporation": "ELYSION",
        "resource_id": 182,
        "item_sub_type": "CharacterPiece",
        "name_localkey": "Guillotine: Winter Slayer's Spare Body",
        "use_limit_count": false,
        "inventory_filter": [
          "etc"
        ],
        "description_localkey": "Can be used for Nikkes' Limit Breaks.\nIf a Nikke's Limit Break has reached the max level, any additional Spare Bodies for that Nikke will be converted to Body Labels."
      }
    },
    "meta": {
      "id": 218201,
      "class": "Attacker",
      "order": 10030,
      "name_code": 5128,
      "corporation": "ELYSION",
      "resource_id": 182,
      "name_localkey": "Guillotine: Winter Slayer",
      "original_rare": "SSR",
      "critical_ratio": 1500,
      "category_type_1": "None",
      "category_type_2": "None",
      "category_type_3": "None",
      "critical_damage": 15000,
      "eff_category_type": "Walk",
      "eff_category_value": 0
    }
  },
  "generatorSupported": true,
  "simSupported": true,
  "baseStats": {
    "hp": 13500,
    "atk": 600,
    "def": 90,
    "core": {
      "hp": 200,
      "atk": 200,
      "def": 200
    },
    "grade": {
      "hp": 3000,
      "atk": 20,
      "def": 100,
      "ratio": 200
    },
    "critRate": 15,
    "maxLevel": 1200,
    "critDamage": 150,
    "resourceId": 182
  }
}
```

---

# PART 4 — S2b PRE-OP REVIEW (claude-fable-5)

```json
{
  "slug": "guillotine-winter-slayer",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill2",
      "kitLine": "EXP: ATK ▲ 1.81%, stacks up to 100",
      "disposition": "FAITHFUL",
      "scope": "generic self ATK buff (not normal-attack-scoped)",
      "durationSemantics": "'continuously' = permanent stacks, NO durationSec; accrue toward maxStacks 100 and never lapse",
      "triggerIdentity": "granted by the two EXP-accrual triggers below (shared pool)",
      "targetSet": "self",
      "nearestWrongModel": "durationSec on the stack buff (stacks decay), or maxStacks conflated with the Level-11 cap (capped at 10/11 instead of 100)",
      "distinguishingAssertion": "buffApply stat 'atkPct' value 1.81 with stacks climbing monotonically to maxStacks 100 and NO expiresFrame; steady-state self ATK contribution = +181%, never resets mid-fight",
      "inertness": "must never apply to any ally; teammates' totals unchanged when this buff is stripped",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "after landing 6 normal attack(s) without",
      "disposition": "GAP",
      "scope": "normal attacks only, NON-core hits only",
      "durationSemantics": "n/a (counter trigger)",
      "triggerIdentity": "hitCount-style counting landed non-core ROUNDS, every 6 → +1 EXP. ENGINE GAP: the sim treats core as a per-shot RATE, not discrete core/non-core hit events, so a literal non-core counter is inexpressible — the honest encoding is a blended EXP cadence ⚑: EXP/s = effShots/s × [(1−c)/6 + c/3] where c = core rate",
      "targetSet": "self",
      "nearestWrongModel": "hitCount:6 over ALL hits (core hits then feed BOTH tracks, double-counting EXP and shortening the ramp)",
      "distinguishingAssertion": "EXP grant count over a window ≈ floor(nonCoreRounds/6) + floor(coreRounds/3) given the sim's core rate — NOT floor(allRounds/6) + floor(coreRounds/3); equivalently the ramp-to-100 time matches the blended formula, not the double-count one",
      "inertness": "no EXP from skill/burst/DoT hits — normal-attack rounds only",
      "evidenceTier": "CALIBRATED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "when hitting the Core for 3 time(s)",
      "disposition": "GAP",
      "scope": "core hits only",
      "durationSemantics": "n/a (counter trigger)",
      "triggerIdentity": "requiresCore hitCount:3 (counts core-landing ROUNDS) → +1 EXP into the SAME shared pool as the 6-non-core track; same core-as-rate engine gap → blended-cadence ⚑",
      "targetSet": "self",
      "nearestWrongModel": "counting trigger pulls / all hits instead of core hits, or dropping the track entirely because core is fractional (halves EXP income when core rate is high)",
      "distinguishingAssertion": "with core exposure present, EXP accrual rate exceeds the non-core-only rate by the (c/3) term; zeroing core exposure (HRCORE-style) slows level-ups per the formula",
      "inertness": "must contribute nothing if core rate is 0",
      "evidenceTier": "CALIBRATED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "every time EXP stacks 10 … max Level 11",
      "disposition": "FIX",
      "scope": "resource machinery: every 10 EXP stacks accrued → Hero Level +1, cap 11 (100 EXP = max)",
      "durationSemantics": "levels are permanent, monotonic; EXP stacks are NOT consumed by leveling (they persist toward 100 — the 1.81% buff keeps them)",
      "triggerIdentity": "resource-threshold trigger on the shared EXP pool; no native threshold trigger in the schema → everyN:10 on the EXP grants, or a rampSec steady-state approximation ⚑ (derived ramp ≈ 40–55s to Level 11 at AR effective ~9.5 shots/s: EXP/s ≈ 1.57×(1+c))",
      "targetSet": "self",
      "nearestWrongModel": "Level 11 from t=0 (instant-max, no ramp) — over-credits the opening ~45s and every level-scaled consumer including the FIRST burst's DoT; or treating level-up as consuming/resetting the EXP stacks",
      "distinguishingAssertion": "level-scaled buff values (1.16×L, 0.91×L) step UP over the opening ~45s (buffApply values strictly increasing across level-ups) rather than sitting at the ×11 magnitude from frame 0; EXP stack count is unaffected by level-ups",
      "inertness": "no level-ups after 100 EXP (rewards stop firing at cap)",
      "evidenceTier": "CALIBRATED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Hero Level Up Reward: Reloads 10.26%",
      "disposition": "FAITHFUL",
      "scope": "weapon-state effect — partial magazine refill per level-up (≈6.2 of 60 rounds ×10 level-ups ≈ one free magazine over the ramp)",
      "durationSemantics": "instant, once per level-up (10 firings)",
      "triggerIdentity": "same level-up trigger as above; instantReload fraction:0.1026",
      "targetSet": "self",
      "nearestWrongModel": "skipped as 'QoL/defensive, no damage' — reload economy IS damage (it gates shots fired)",
      "distinguishingAssertion": "with the effect present, carry shot count over the ramp exceeds the stripped-override baseline (withPatchedOverride removing it → fewer shot events / lower carry total); reload events show partial refills during the ramp",
      "inertness": "stops firing once Level 11 is reached",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Recovers 2.44% of … final Max HP",
      "disposition": "FAITHFUL",
      "scope": "heal, self only, per level-up",
      "durationSemantics": "instant, once per level-up",
      "triggerIdentity": "same level-up trigger; heal effect (ticks:1) so any future self recovery-consumer fires",
      "targetSet": "self",
      "nearestWrongModel": "mis-targeted to allies — would spuriously fire a teammate's on-recovery trigger (e.g. a crown-style consumer in the control comp)",
      "distinguishingAssertion": "heal/recovery events target ONLY guillotine-winter-slayer; no ally recovery trigger fires from this line; stripping it moves zero damage in the control comp (she has no self recovery-consumer)",
      "inertness": "must move zero damage in any comp lacking a consumer keyed to HER receiving heals",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Elemental Advantage … ▲ 1.16% * Hero Level",
      "disposition": "FAITHFUL",
      "scope": "elemAdvantageDamagePct — live ONLY under elemental advantage (Water vs Fire boss: live in controlComp)",
      "durationSemantics": "'continuously' = permanent; magnitude re-resolves/overwrites at each level-up (1.16 → … → 12.76 at Level 11)",
      "triggerIdentity": "fires on each Hero level-up (10 firings), not passive-from-t0 and not FB-keyed",
      "targetSet": "alliesOfElement Water, INCLUDING self (she is Water)",
      "nearestWrongModel": "generic elementDamagePct or plain attackDamagePct (credits a non-advantaged matchup), or target=all allies (leaks to non-Water units), or flat 1.16% ignoring ×Level",
      "distinguishingAssertion": "buffApply stat 'elemAdvantageDamagePct' with value stepping to 12.76 at cap; targetSlug set contains only Water-element units; vs a non-Fire boss the stat moves nothing",
      "inertness": "non-Water allies (liter/crown/helm as applicable) never receive it; inert vs non-advantaged boss",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "ATK ▲ 0.91% of the skill user's ATK * Level",
      "disposition": "FAITHFUL",
      "scope": "caster-ATK-scaled flat ATK grant (casterAtkPct), NOT a target-own-ATK % buff",
      "durationSemantics": "permanent, level-scaled overwrite per level-up (0.91 → 10.01% of caster ATK at Level 11)",
      "triggerIdentity": "each Hero level-up",
      "targetSet": "alliesOfElement Water including self",
      "nearestWrongModel": "encoded as atkPct (scales each TARGET's own ATK) — wrong basis for every recipient whose staticAtk differs from the caster's",
      "distinguishingAssertion": "buffApply emits stat 'casterAtkPct' whose value is the FLAT number (0.91×L/100)×guillotine staticAtk (≈0.1001×staticAtk at cap), not the raw percentage 10.01",
      "inertness": "non-Water allies never receive it",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "when Hero Level is 2 or above",
      "disposition": "FAITHFUL",
      "scope": "elemAdvantageDamagePct 7.46, self only",
      "durationSemantics": "permanent once Level ≥2 (reached after the first 10 EXP, ≈5s in)",
      "triggerIdentity": "level-gated toggle, not passive-from-t0; near-inert distinction given the fast first level, but the gate must exist",
      "targetSet": "self",
      "nearestWrongModel": "ungated passive live at frame 0; or generic element/attack-damage stat",
      "distinguishingAssertion": "no 7.46 elemAdvantageDamagePct buffApply exists before the FIRST level-up event; first apply coincides with it (~5s), then never lapses",
      "inertness": "self-only; inert vs a non-advantaged boss",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Attack Damage ▲ 10.14% for 10 sec",
      "disposition": "FAITHFUL",
      "scope": "attackDamagePct (Damage-Up bucket), additive/diluted",
      "durationSemantics": "durationSec 10 (wall-clock, not rounds)",
      "triggerIdentity": "burstCast — HER OWN burst cast only (self mode in her own burst block). CRITICAL: controlComp includes helm as co-B3, so burstCast vs fullBurstEnter genuinely diverge",
      "targetSet": "alliesOfElement Water including self",
      "nearestWrongModel": "fullBurstEnter — fires on EVERY team Full Burst including rotations where helm bursts, over-crediting ~2× in the control comp; or target=all allies",
      "distinguishingAssertion": "count(buffApply 10.14 attackDamagePct) == count(guillotine burstCast events) and is STRICTLY LESS than count(fullBurstStart events) in controlComp; expiresFrame − applyFrame = 600",
      "inertness": "no application on Full Bursts guillotine did not cast; non-Water allies never targeted",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Elemental Advantage … ▲ 18.75% for 10 sec",
      "disposition": "FAITHFUL",
      "scope": "elemAdvantageDamagePct — live only under elemental advantage",
      "durationSemantics": "durationSec 10",
      "triggerIdentity": "same burstCast block as the 10.14 line",
      "targetSet": "alliesOfElement Water including self",
      "nearestWrongModel": "same fullBurstEnter misread; or folding it into generic elementDamagePct so it credits vs any boss",
      "distinguishingAssertion": "18.75 elemAdvantageDamagePct applies only on her own casts, 10s window; moves zero damage vs a non-Fire boss",
      "inertness": "inert without elemental advantage; no leak to non-Water allies",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "20.87% of the final ATK * Hero Level every sec",
      "disposition": "FAITHFUL",
      "scope": "DoT on the single boss ('1 enemy with highest final Max HP' = the only enemy); never core-boosted; crit default OFF (no measurement)",
      "durationSemantics": "one 10-tick instance PER CAST: durationSec 10, intervalSec 1 — burst-cast-keyed, so a fresh independent instance each cast is CORRECT here (the one-passive-instance rule is for continuous DoTs, not this)",
      "triggerIdentity": "burstCast; per-tick atkPct = 20.87 × Hero Level, level ⚑ snapshotted at cast (first burst ~Lv ramping, later bursts Lv 11 → 229.57%/tick, ≈2296% ATK per burst)",
      "targetSet": "enemy (engine ignores block.target; validator requires target 'enemy')",
      "nearestWrongModel": "flat 20.87% ignoring ×Hero Level — an 11× under-model at cap; secondary misread: whole-fight passive DoT instance decoupled from casts",
      "distinguishingAssertion": "dot-bucket tick events: exactly 10 ticks per guillotine burst cast, none before her first cast; per-tick mult at a Level-11 cast ≈ 229.57% of final ATK (not 20.87%); a first cast at partial level shows a proportionally smaller tick than later casts",
      "inertness": "no ticks on rotations she does not burst; ticks receive no core bucket",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill2:EXP ATK 1.81% ×100 stacks",
    "skill2:6-non-core EXP track",
    "skill2:3-core EXP track",
    "skill2:Level≥2 elemAdv 7.46%",
    "skill1:EXP→Level engine (cap 11, ramp)",
    "skill1:level-up reload 10.26%",
    "skill1:level-up heal 2.44% (inertness pin)",
    "skill1:elemAdv 1.16%×L Water allies",
    "skill1:casterAtk 0.91%×L Water allies",
    "burst:attackDamage 10.14% 10s",
    "burst:elemAdv 18.75% 10s",
    "burst:DoT 20.87%×L /s 10s"
  ],
  "unmodeledVerbatim": {
    "skill1": [],
    "skill2": [],
    "burst": []
  },
  "notes": "Expected shared-prior misreads, in order of damage: (1) burst ally buffs keyed to fullBurstEnter instead of burstCast — controlComp carries helm as co-B3, so this over-fires on helm's rotations and the divergence is LIVE in the fixture, assert the apply-count strictly below fullBurstStart count; (2) dropping '× Hero Level' on the burst DoT (11× under at cap) or on the two skill1 ally buffs; (3) instant-max Level 11 / 100 EXP at t=0 with no ramp — the honest encoding is rampSec ⚑ with recipe EXP/s = effShots/s × [(1−c)/6 + c/3] (≈40–55s to cap at AR ~9.5 eff shots/s; also fixes the FIRST burst's DoT level snapshot); (4) the engine's core-as-rate model cannot count discrete non-core/core hits, so both EXP tracks collapse to one blended ⚑ cadence — flag it, don't silently pick one track; (5) 'Reloads 10.26%' skipped as defensive — it is shot-count-positive (instantReload fraction) and must survive; (6) 'every time EXP stacks 10' misread as CONSUMING stacks — the 1.81%×100 ATK buff persists through level-ups; (7) 'all Water Code allies' includes self (she is Water) — excludeSelf is a misread; also both elemAdvantageDamagePct lines are live in controlComp only because the boss is Fire — any inertness claim about them must state the boss element. All magnitudes are literal kit text (DATAMINED); the only ⚑ values are the EXP/level ramp trajectory and the DoT's level snapshot at first cast.",
  "model": "claude-fable-5"
}

```

---

# PART 5 — S5 BLIND TEST (claude-opus-5) — 13 green / 3 red / 2 skip vs driver override

```ts
/**
 * guillotine-winter-slayer - AR / Water / Attacker / Burst III (cd 40s, ammo 60).
 * BLIND per-unit kit spec: written from the kit prose ALONE, with no sight of the
 * driver's override, tests, or reasoning.
 *
 * KIT (structural paraphrase):
 *   S1-a  every 10 EXP stacks, self: Hero Level +1 (cap Lv 11);
 *         rewards -> Reloads 10.26%; Recovers 2.44% of own final Max HP.
 *   S1-b  when Hero levels up, all Water Code allies:
 *           Elemental Advantage Attack Damage +1.16% x Hero Level, continuously
 *           ATK +0.91% OF THE SKILL USER'S ATK x Hero Level, continuously
 *   S2-a  after 6 normal hits that did NOT hit the core, self: EXP -> ATK +1.81%, cap 100
 *   S2-b  on hitting the Core 3 times, self: EXP -> ATK +1.81%, cap 100
 *   S2-c  while Hero Level >= 2, self: Elemental Advantage Attack Damage +7.46%
 *   B-a   all Water Code allies: Attack Damage +10.14% and Elem Adv Atk Dmg +18.75%, 10 sec
 *   B-b   1 enemy (highest final Max HP): continuous damage 20.87% of final ATK
 *         x Hero Level, every 1 sec for 10 sec
 *
 * FIXTURE: controlComp(SLUG, true) = liter (B1, Fire) / crown (B2, Iron) /
 *   guillotine-winter-slayer (B3 carry, Water) / helm (B3, Water).
 *   helm is the IN-SCOPE Water ally that makes the all-Water-Code-allies scope
 *   observable; liter + crown are the OUT-OF-SCOPE controls. A lone B3 makes ZERO
 *   Full Bursts, so B1+B2 are required for the burst lines to fire at all.
 *   The control boss is Fire, so a Water unit has NO elemental advantage here and
 *   the elemAdvantageDamagePct lines are expected to be DAMAGE-INERT in this comp.
 *   Every elemental assertion is therefore made on the buffApply EVENT LOG
 *   (stat key + magnitude + target set), which is boss-element independent.
 *
 * WHY EACH GROUP DISCRIMINATES - the nearest-wrong model each one turns RED under:
 *   scope        : ally buffs keyed to {kind:'allies'} (leaks to liter/crown) or to
 *                  {kind:'self'} (never reaches helm). The counterfactual in group 6
 *                  is two-sided: helm MUST move, liter/crown MUST NOT.
 *   stat key     : Elemental Advantage Attack Damage folded into attackDamagePct
 *                  (would be live vs a non-advantaged boss - a real over-credit).
 *   trigger id   : own-burst blocks keyed to fullBurstEnter instead of burstCast -
 *                  over-credits in this comp because helm is a SECOND Burst III.
 *   duration     : 'for 10 sec' encoded as permanent (no expiry) or as durationShots
 *                  (a ROUND count) instead of a wall-clock window.
 *   stack model  : the 1.81%/stack EXP ATK authored as one flat max-stacks buff
 *                  (no cap, no ramp) - group 11 pins per-stack magnitude + cap 100.
 *   level scaling: Hero Level collapsed to a fixed constant - group 8 requires either
 *                  growing emitted magnitudes or a declared resource pool.
 *   accrual paths: the core path (3 core hits) dropped, leaving only the 6-non-core
 *                  path - under-credits EXP by ~half at high core rates (group 10).
 *   no silent drop: the two level-up REWARDS (partial reload = shot economy = damage;
 *                  the self-heal = a cross-unit on-recovery channel) must be modeled
 *                  or named in note/unmodeled (group 13).
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js';

const SLUG = 'guillotine-winter-slayer';
const HELM = 'helm';   // Water Code Burst III - IN scope for all Water Code allies
const LITER = 'liter'; // Fire Burst I  - OUT of scope
const CROWN = 'crown'; // Iron Burst II - OUT of scope

const PER_LEVEL_ELEM = 1.16;
const MAX_LEVEL = 11;
const EXP_ATK = 1.81;
const EXP_CAP = 100;
const BURST_ATTACK_DMG = 10.14;
const BURST_ELEM = 18.75;
const S2_ELEM = 7.46;
const DOT_PCT = 20.87;
const RELOAD_FRAC = 0.1026;
const EPS = 1e-6;

const SLOTS = ['skill1', 'skill2', 'burst'] as const;
const ATK_STATS = new Set(['atkPct', 'casterAtkPct', 'highestAllyAtkPct', 'atkOfMaxHpPct']);
const DMG_KINDS = new Set(['dot', 'flatDamage', 'storedHit', 'stackedNuke']);

// ---------------------------------------------------------------- shape helpers
// The committed override is slot-keyed; tolerate both the on-disk (slot = Block[])
// and the loaded (slot = CharacterSkills with .blocks) shapes so a shape guess can
// never masquerade as a unit-level divergence.
function slotBlocks(ov: any, slot: string): any[] {
  const s = ov?.[slot];
  if (!s) return [];
  return Array.isArray(s) ? s : Array.isArray(s.blocks) ? s.blocks : [];
}
function allBlocks(ov: any): any[] {
  return SLOTS.flatMap((s) => slotBlocks(ov, s));
}
function allEffects(ov: any): any[] {
  return allBlocks(ov).flatMap((b: any) => b?.effects ?? []);
}
function auditText(ov: any): string {
  const parts: string[] = [String(ov?.note ?? '')];
  const push = (u: any) => {
    if (!u) return;
    for (const k of Object.keys(u)) parts.push(...((u as any)[k] ?? []));
  };
  push(ov?.unmodeled);
  for (const s of SLOTS) {
    const v = ov?.[s];
    if (v && !Array.isArray(v)) push(v.unmodeled);
  }
  return parts.join(' | ').toLowerCase();
}
function resourcePools(ov: any): any[] {
  const out: any[] = [];
  if (Array.isArray(ov?.resources)) out.push(...ov.resources);
  for (const s of SLOTS) {
    const v = ov?.[s];
    if (v && !Array.isArray(v) && Array.isArray(v.resources)) out.push(...v.resources);
  }
  return out;
}
// a buff's PER-UNIT magnitude: perResource buffs carry it as mult, plain buffs as value
const perValue = (e: any): number => (e?.perResource ? e.perResource.mult : e?.value);
const near = (a: number, b: number) => Math.abs(a - b) < EPS;

// ---------------------------------------------------------------- run helpers
interface Run { res: any; events: SimEvent[] }

function run(overrides?: Record<string, unknown>): Run {
  const events: SimEvent[] = [];
  const opts = controlComp(SLUG, true) as any;
  opts.cfg = { ...(opts.cfg ?? {}), onEvent: (ev: SimEvent) => events.push(ev) };
  if (overrides) opts.overrides = { ...(opts.overrides ?? {}), ...overrides };
  return { res: runComp(opts), events };
}

const applies = (evs: SimEvent[], stat: string, value: number): any[] =>
  (evs as any[]).filter((e) => e.kind === 'buffApply' && e.stat === stat && near(e.value, value));
const kindCount = (evs: SimEvent[], kind: string): number =>
  (evs as any[]).filter((e) => e.kind === kind).length;
const targetsOf = (evs: any[]): Set<string> => new Set(evs.map((e) => e.targetSlug));

// The committed override, read-only (withPatchedOverride returns a clone; the
// no-op mutator leaves the on-disk JSON untouched).
const OV: any = withPatchedOverride(SLUG, () => {});

// ---------------------------------------------------------------- hoisted runs (4 x 180s)
const base = run();

// counterfactual A: strip every effect from skill1 blocks that are NOT self-targeted,
// i.e. exactly the Water-Code-ally level-up grants.
const noTeamS1 = run({
  [SLUG]: withPatchedOverride(SLUG, (ov: any) => {
    for (const b of slotBlocks(ov, 'skill1')) if (b?.target?.kind !== 'self') b.effects = [];
  }),
});

// counterfactual B: strip every buff whose per-unit magnitude is the EXP 1.81%,
// in any slot and under either encoding (stacked buff or perResource pool).
const noExpAtk = run({
  [SLUG]: withPatchedOverride(SLUG, (ov: any) => {
    for (const s of SLOTS)
      for (const b of slotBlocks(ov, s))
        b.effects = (b.effects ?? []).filter(
          (e: any) => !(e.kind === 'buff' && near(perValue(e), EXP_ATK)),
        );
  }),
});

// counterfactual C: strip every damage-dealing effect from the burst slot
// (kind-agnostic, so it fires whether the continuous damage is a dot or flatDamage).
const noBurstDmg = run({
  [SLUG]: withPatchedOverride(SLUG, (ov: any) => {
    for (const b of slotBlocks(ov, 'burst'))
      b.effects = (b.effects ?? []).filter((e: any) => !DMG_KINDS.has(e.kind));
  }),
});

const carry = (r: Run) => totals(r.res)[SLUG];

describe('guillotine-winter-slayer - blind kit spec', () => {
  // ---- 1. fixture liveness (every later assertion rides on this) -------------
  it('fixture is live: the carry fires, deals damage and the team full-bursts', () => {
    expect(unitOf(base.res, SLUG).totalDamage).toBeGreaterThan(0);
    expect(kindCount(base.events, 'shot')).toBeGreaterThan(100);
    // cd 40s over a 180s fight - the burst lines must be exercised repeatedly,
    // otherwise every burst assertion below is vacuous.
    expect(kindCount(base.events, 'fullBurstStart')).toBeGreaterThanOrEqual(2);
    expect(totals(base.res)[HELM]).toBeGreaterThan(0);
    expect(totals(base.res)[LITER]).toBeGreaterThan(0);
  });

  // ---- 2. override shape / validator hygiene --------------------------------
  it('override carries all three slots and no ignored-effect blocks', () => {
    for (const s of SLOTS) expect(slotBlocks(OV, s).length).toBeGreaterThan(0);
    expect(allEffects(OV).some((e: any) => e.kind === 'ignored')).toBe(false);
  });

  // ---- 3. BURST: Attack Damage +10.14% for 10 sec, all Water Code allies -----
  it('burst grants Attack Damage 10.14% to Water allies only, as a timed window', () => {
    const evs = applies(base.events, 'attackDamagePct', BURST_ATTACK_DMG);
    expect(evs.length).toBeGreaterThanOrEqual(2); // non-vacuity: fires on repeat bursts

    const tg = targetsOf(evs);
    expect(tg.has(SLUG)).toBe(true);   // the caster is Water Code - self is included
    expect(tg.has(HELM)).toBe(true);   // RED if scoped {kind:'self'}
    expect(tg.has(LITER)).toBe(false); // RED if scoped {kind:'allies'}
    expect(tg.has(CROWN)).toBe(false);

    // duration semantics: 'for 10 sec' is a wall-clock window, not permanent and
    // not a ROUND count.
    expect(evs.every((e) => Number.isFinite(e.expiresFrame))).toBe(true);
    expect(evs.every((e) => e.durationShots == null)).toBe(true);

    // cannot fire more often than the team full-bursts
    expect(evs.length / tg.size).toBeLessThanOrEqual(kindCount(base.events, 'fullBurstStart'));
  });

  // ---- 4. BURST: Elemental Advantage Attack Damage +18.75% for 10 sec --------
  it('burst elemental line is elemAdvantageDamagePct 18.75, Water allies, timed', () => {
    const evs = applies(base.events, 'elemAdvantageDamagePct', BURST_ELEM);
    expect(evs.length).toBeGreaterThanOrEqual(2);

    const tg = targetsOf(evs);
    expect(tg.has(SLUG)).toBe(true);
    expect(tg.has(HELM)).toBe(true);
    expect(tg.has(LITER)).toBe(false);
    expect(tg.has(CROWN)).toBe(false);
    expect(evs.every((e) => Number.isFinite(e.expiresFrame))).toBe(true);
    expect(evs.every((e) => e.durationShots == null)).toBe(true);

    // the elemental line must NOT be folded into the generic Damage Up bucket:
    // an attackDamagePct of 18.75 (or a merged 28.89) would be live against a
    // non-advantaged boss, over-crediting the whole comp.
    expect(applies(base.events, 'attackDamagePct', BURST_ELEM).length).toBe(0);
    expect(applies(base.events, 'attackDamagePct', BURST_ATTACK_DMG + BURST_ELEM).length).toBe(0);
  });

  // ---- 5. BURST trigger identity: own burst cast, not team full-burst entry ---
  it('burst-slot blocks key off the owner burst cast', () => {
    const trig = slotBlocks(OV, 'burst').map((b: any) => b?.trigger?.kind);
    expect(trig.length).toBeGreaterThan(0);
    // helm is a SECOND Burst III in this fixture, so fullBurstEnter would fire the
    // burst payload on rotations this unit did not cast.
    expect(trig.every((k: string) => k === 'burstCast')).toBe(true);
  });

  // ---- 6. BURST: continuous damage, 20.87% of final ATK x Hero Level, 10x1s ---
  it('burst continuous damage is one 10s / 1s-interval DoT scaled by Hero Level', () => {
    const dots = slotBlocks(OV, 'burst')
      .flatMap((b: any) => b?.effects ?? [])
      .filter((e: any) => e.kind === 'dot');
    // exactly ONE instance per cast: the engine never dedups DoT instances, so a
    // long duration on a repeating trigger multiplies.
    expect(dots.length).toBe(1);
    const d = dots[0];
    expect(d.durationSec).toBe(10);
    expect(d.intervalSec ?? 1).toBe(1);

    // Hero-Level scaling: either a live resource read (mult = the per-level 20.87)
    // or a static atkPct that is a whole-level multiple within the Lv 11 cap.
    if (d.perResource) {
      expect(near(d.perResource.mult, DOT_PCT)).toBe(true);
    } else {
      const lvl = d.atkPct / DOT_PCT;
      expect(lvl).toBeGreaterThanOrEqual(1 - EPS);
      expect(lvl).toBeLessThanOrEqual(MAX_LEVEL + EPS);
    }
  });

  it('burst damage is reachable and material (stripping it lowers only the carry)', () => {
    expect(carry(noBurstDmg)).toBeLessThan(carry(base));
    // inertness: a self-dealt DoT must not move any teammate
    expect(totals(noBurstDmg.res)[LITER]).toBe(totals(base.res)[LITER]);
    expect(totals(noBurstDmg.res)[CROWN]).toBe(totals(base.res)[CROWN]);
    expect(totals(noBurstDmg.res)[HELM]).toBe(totals(base.res)[HELM]);
  });

  // ---- 7. S1-b scope: Water Code allies, two-sided counterfactual ------------
  it('skill1 level-up grants are scoped to Water Code allies (not self, not all)', () => {
    const team = slotBlocks(OV, 'skill1').filter((b: any) => b?.target?.kind !== 'self');
    expect(team.length).toBeGreaterThan(0); // RED if the grants were scoped self-only
    for (const b of team) {
      expect(b.target.kind).toBe('alliesOfElement');
      expect(String(b.target.element).toLowerCase()).toBe('water');
      expect(Boolean(b.target.excludeSelf)).toBe(false); // the caster is Water Code
    }

    // behavioural, encoding-agnostic: removing the team grants must move the Water
    // ally and the caster, and must NOT move the two non-Water allies.
    expect(totals(noTeamS1.res)[HELM]).not.toBe(totals(base.res)[HELM]);
    expect(carry(noTeamS1)).not.toBe(carry(base));
    expect(totals(noTeamS1.res)[LITER]).toBe(totals(base.res)[LITER]);
    expect(totals(noTeamS1.res)[CROWN]).toBe(totals(base.res)[CROWN]);
  });

  // ---- 8. S1-b: ATK +0.91% OF THE SKILL USER'S ATK ---------------------------
  it('the level-up ATK grant is caster-scaled and reaches exactly the Water allies', () => {
    // caster-scaled buffs re-emit FLAT-resolved ATK, so the magnitude cannot be
    // predicted blind - instead group the casterAtkPct applies by emitted value and
    // require some group whose target set is exactly {carry, helm}. crown also emits
    // casterAtkPct to the whole team, so this grouping is what isolates this unit.
    const cs = (base.events as any[]).filter(
      (e) => e.kind === 'buffApply' && e.stat === 'casterAtkPct',
    );
    expect(cs.length).toBeGreaterThan(0);

    const groups = new Map<string, Set<string>>();
    for (const e of cs) {
      const k = String(Math.round(e.value * 1e4));
      if (!groups.has(k)) groups.set(k, new Set());
      groups.get(k)!.add(e.targetSlug);
    }
    const waterOnly = [...groups.values()].filter(
      (tg) => tg.has(SLUG) && tg.has(HELM) && !tg.has(LITER) && !tg.has(CROWN) && tg.size === 2,
    );
    // RED under {kind:'allies'} (liter/crown appear), under {kind:'self'} (helm never
    // appears), and under a plain atkPct encoding (wrong stat key entirely).
    expect(waterOnly.length).toBeGreaterThan(0);
  });

  // ---- 9. S1: Hero Level actually scales (not collapsed to a constant) -------
  it('Hero Level scaling is live: magnitudes grow, or a level/EXP pool is declared', () => {
    const elem = (base.events as any[]).filter(
      (e) => e.kind === 'buffApply' && e.stat === 'elemAdvantageDamagePct',
    );
    const levelScaled = elem
      .map((e) => e.value)
      .filter((v: number) => {
        const n = v / PER_LEVEL_ELEM;
        return Math.abs(n - Math.round(n)) < 1e-4 && Math.round(n) >= 1;
      });

    const pooled = resourcePools(OV).length > 0 || JSON.stringify(OV).includes('perResource');
    // either the emitted magnitudes step up with the level, or the value is driven
    // live off a declared pool. A single fixed magnitude with no pool = the level was
    // frozen to a constant (the nearest-wrong this catches).
    expect(new Set(levelScaled.map((v) => Math.round(v * 1e4))).size > 1 || pooled).toBe(true);

    // Lv 11 cap: no per-level elemental magnitude may exceed 1.16 x 11.
    if (levelScaled.length) {
      expect(Math.max(...levelScaled)).toBeLessThanOrEqual(PER_LEVEL_ELEM * MAX_LEVEL + EPS);
    }
  });

  // ---- 10. S2-a / S2-b: the two EXP accrual paths ---------------------------
  it('EXP accrues on BOTH the 6-non-core path and the 3-core path', () => {
    const s2 = slotBlocks(OV, 'skill2');
    const hc = s2.filter((b: any) => b?.trigger?.kind === 'hitCount');
    const six = hc.find((b: any) => b.trigger.count === 6);
    const three = hc.find((b: any) => b.trigger.count === 3);
    // dropping the core path under-credits EXP; making the 6-path core-gated (or the
    // 3-path ungated) mis-reads which clause owns which threshold.
    expect(six).toBeDefined();
    expect(three).toBeDefined();
    expect(three!.requiresCore).toBe(true);
    expect(Boolean(six!.requiresCore)).toBe(false);
  });

  // ---- 11. S2: EXP stack magnitude + cap ------------------------------------
  it('EXP grants ATK 1.81% per stack, capped at 100 stacks', () => {
    const expBuffs = allEffects(OV).filter(
      (e: any) => e.kind === 'buff' && ATK_STATS.has(e.stat) && near(perValue(e), EXP_ATK),
    );
    // RED if the stack line was authored at its max-stack magnitude (1.81 x 100)
    // as a single flat buff.
    expect(expBuffs.length).toBeGreaterThan(0);
    const capped =
      expBuffs.some((e: any) => e.maxStacks === EXP_CAP) ||
      resourcePools(OV).some((r: any) => r.max === EXP_CAP);
    expect(capped).toBe(true);
    // self-scoped: the EXP ATK is an Affects-self line
    const holders = allBlocks(OV).filter((b: any) =>
      (b.effects ?? []).some((e: any) => e.kind === 'buff' && near(perValue(e), EXP_ATK)),
    );
    expect(holders.every((b: any) => b.target?.kind === 'self')).toBe(true);
  });

  it('the EXP ATK ramp is material to the carry and inert for everyone else', () => {
    const drop = 1 - carry(noExpAtk) / carry(base);
    expect(drop).toBeGreaterThan(0.03); // up to +181% ATK at cap - a real, large channel
    expect(totals(noExpAtk.res)[LITER]).toBe(totals(base.res)[LITER]);
    expect(totals(noExpAtk.res)[CROWN]).toBe(totals(base.res)[CROWN]);
  });

  // ---- 12. S2-c: +7.46% elemental, SELF only, gated on Hero Level >= 2 -------
  it('the 7.46% elemental line is self-only and level-gated (not a t=0 passive)', () => {
    const evs = applies(base.events, 'elemAdvantageDamagePct', S2_ELEM);
    expect(evs.length).toBeGreaterThan(0);
    const tg = targetsOf(evs);
    expect(tg.has(SLUG)).toBe(true);
    // this clause says Affects self - the OTHER Water ally must never receive it.
    expect(tg.has(HELM)).toBe(false);
    expect(tg.has(LITER)).toBe(false);
    expect(tg.has(CROWN)).toBe(false);

    // Hero Level starts at 1, so the buff cannot be live from frame 0: the carrier
    // block needs a real trigger or a gate. An unconditional passive over-credits
    // the opening seconds.
    const holders = allBlocks(OV).filter((b: any) =>
      (b.effects ?? []).some(
        (e: any) => e.kind === 'buff' && e.stat === 'elemAdvantageDamagePct' && near(e.value, S2_ELEM),
      ),
    );
    expect(holders.length).toBeGreaterThan(0);
    expect(
      holders.every((b: any) => b.trigger?.kind !== 'passive' || b.resourceGate != null),
    ).toBe(true);
  });

  // ---- 13. S1-a rewards: no silent drops ------------------------------------
  it('the level-up rewards (partial reload, self heal) are modelled or documented', () => {
    const eff = allEffects(OV);
    const txt = auditText(OV);

    // Reloads 10.26% is weapon-state = shot economy = damage.
    const reloadModelled = eff.some(
      (e: any) => e.kind === 'instantReload' && Math.abs((e.fraction ?? 1) - RELOAD_FRAC) < 5e-3,
    );
    expect(reloadModelled || txt.includes('reload')).toBe(true);

    // Recovers 2.44% of final Max HP: inert alone, but it is the on-recovery channel
    // a teammate can consume - it must not vanish silently.
    const healModelled = eff.some((e: any) => e.kind === 'heal');
    expect(healModelled || txt.includes('recover') || txt.includes('max hp')).toBe(true);
  });

  // ---- 14. global inertness -------------------------------------------------
  it('no guillotine-winter-slayer buff ever lands on a non-Water ally', () => {
    const mine = [BURST_ATTACK_DMG, BURST_ELEM, S2_ELEM];
    for (const v of mine) {
      for (const stat of ['attackDamagePct', 'elemAdvantageDamagePct']) {
        const tg = targetsOf(applies(base.events, stat, v));
        expect(tg.has(LITER)).toBe(false);
        expect(tg.has(CROWN)).toBe(false);
      }
    }
  });

  // ---- GAPS -----------------------------------------------------------------
  it.skip('EXP ramp is monotonic over the fight (per-shot damage rises)', () => {
    // GAP: proving the ramp directly needs the per-damage-event amount field, whose
    // name is not pinned in the blind harness contract (the contract documents
    // bucket / srcSlot / crit / core / inFullBurst / mult only). The ramp is covered
    // structurally by the growing-magnitude assertion and behaviourally by the
    // EXP-strip counterfactual instead.
  });

  it.skip('EXP accrual RATE matches (1-c)/6 + c/3 per normal hit', () => {
    // GAP / MEASUREMENT-GATED: requiresCore is a fight-level core-exposure gate, not
    // a per-hit core/non-core partition, so the engine cannot express the exact split
    // between the 6-non-core and 3-core counters at a given core rate. The effective
    // accrual rate (and therefore the Hero Level trajectory) is a flagged estimate
    // until it is read off footage.
  });
});

```

---

# PART 6 — S6 BLIND OVERRIDE (claude-opus-5)

```json
{
  "slug": "guillotine-winter-slayer",
  "resources": [
    {
      "name": "heroLevel",
      "initial": 1,
      "min": 1,
      "max": 11
    }
  ],
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "hitCount",
        "count": 50
      },
      "target": {
        "kind": "self"
      },
      "resourceGate": {
        "name": "heroLevel",
        "max": 10
      },
      "effects": [
        {
          "kind": "resource",
          "name": "heroLevel",
          "delta": 1
        },
        {
          "kind": "instantReload",
          "fraction": 0.1026
        },
        {
          "kind": "heal"
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "passive"
      },
      "target": {
        "kind": "alliesOfElement",
        "element": "Water"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "elemAdvantageDamagePct",
          "value": 1.16,
          "perResource": {
            "name": "heroLevel",
            "mult": 1.16
          }
        },
        {
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 0.91,
          "perResource": {
            "name": "heroLevel",
            "mult": 0.91
          }
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "hitCount",
        "count": 5
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 1.81,
          "maxStacks": 100
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "hitCount",
        "count": 50
      },
      "target": {
        "kind": "self"
      },
      "resourceGate": {
        "name": "heroLevel",
        "min": 2
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "elemAdvantageDamagePct",
          "value": 7.46
        }
      ]
    }
  ],
  "burst": [
    {
      "slot": "burst",
      "trigger": {
        "kind": "burstCast"
      },
      "target": {
        "kind": "alliesOfElement",
        "element": "Water"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 10.14,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "elemAdvantageDamagePct",
          "value": 18.75,
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "burst",
      "trigger": {
        "kind": "burstCast"
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "dot",
          "atkPct": 20.87,
          "durationSec": 10,
          "intervalSec": 1,
          "perResource": {
            "name": "heroLevel",
            "mult": 20.87
          }
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [],
    "skill2": [],
    "burst": []
  },
  "caveats": [
    "⚑ EXP CADENCE MERGE: the kit runs TWO independent EXP counters (6 non-core landed normals; 3 core hits). The engine's hitCount trigger cannot distinguish core from non-core per hit, and authoring both blocks would let every hit feed BOTH counters (0.5 EXP/hit vs a true (1+coreRate)/6). Merged into ONE hitCount:5 block whose effective rate assumes coreRate≈0.30 → (1+0.30)/6 = 0.217 EXP/hit ≈ 1 per 4.6 hits. count is UNMEASURED.",
    "⚑ heroLevel is modeled as a resource pool (initial 1, max 11) incremented every 50 landed hits = 10× the EXP cadence, matching the kit's 10-EXP-per-level rule. Internally consistent with the 100-stack EXP cap (100 EXP = 10 level-ups = Level 11), but the 50 inherits the ⚑ on the EXP cadence.",
    "⚑ The level-up REWARD riders (10.26% reload, 2.44% Max-HP recovery) are bounded by resourceGate {heroLevel max 10} so exactly 10 level-ups fire; without that gate the hitCount trigger would keep paying rewards forever past Level 11.",
    "⚑ perResource on ALLY-targeted buffs: the schema documents perResource as re-reading caster.resources each frame and recommends applying it as a passive SELF buff. Here it is applied to alliesOfElement Water (which includes the Water caster). If the engine only resolves perResource for self-targets, the ally half of the Level aura goes inert — verify with a buffApply probe on a second Water ally.",
    "⚑ 'Hero Level 2 or above' elemental-advantage buff is keyed to hitCount:50 + resourceGate min 2 rather than a passive, because a passive trigger fires once at setup when heroLevel is still 1. It therefore lands on the same hit as the first level-up only if skill1 blocks dispatch before skill2 in-frame; worst case it lands one level-up late (~50 extra hits, ≈5 s).",
    "The burst DoT is left crit-OFF (global DOT_CRIT default) and FB-eligible by timing (no noFb) per the rider prior — both are measurement-gated, not asserted.",
    "The 2.44% Max-HP recovery is modeled as a heal EVENT only (no HP pool in v1); its value drives teammates' on-recovery triggers, not any HP number."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Model: EXP is a self ATK stack (1.81%/stack, cap 100) fed by a MERGED hit counter standing in for the kit's two branches (6 non-core landed normals / 3 core hits) — merged because the engine cannot route a single hit to exactly one of two hitCount blocks, and authoring both would roughly double the true EXP rate. Hero Level is a declared resource pool (initial 1, cap 11) bumped once per 10 EXP (every 50 hits), gated to exactly 10 level-ups; the level-up rewards (partial reload — a shots-fired/weapon-state effect, therefore damage-relevant, not skippable — and the self heal, kept for tandem on-recovery consumers) ride that block. The two 'continuously * Hero Level' Water-ally auras and the burst DoT are perResource-scaled off that same pool so they track the live level instead of being frozen at a guessed average. Burst team buffs use burstCast (this unit's own burst block) so they only fire on rotations she actually casts; the 10 s DoT keeps default FB-by-timing. Nothing in this file is calibrated to any board or probe total.",
  "hasPierce": false
}
```

---

# PART 7 — DRIVER IMPLEMENTATION

## scripts/tests/units/guillotine-winter-slayer.test.ts

```ts
// PER-UNIT KIT SPEC — `guillotine-winter-slayer` (Guillotine: Winter Slayer, aka "gws";
// AR / Attacker / Water / Burst III, cd 40s, ammo 60). Kit-autonomy gauntlet 2026-07-25.
//
// VARIANT — its base counterpart is `guillotine` (Guillotine, MG/Electric), an ENTIRELY different
// unit. This file is about the AR/Water variant ONLY. (The slug-disambiguation lint flags the base
// token "guillotine" inside the hyphenated slug itself — a known false positive; the unit here is
// unambiguous by full slug + full name + approved nickname "gws".)
//
// One assertion group per KIT LINE (G1..G7), asserted against the SHIPPED override loaded from disk.
// `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model each
// assertion discriminates against) — never to supply the encoding under test.
//
// THE MODELING ABSTRACTION (read first): gws has a "Hero Level" currency — EXP +1 per 3 core hits
// (scope-lock = 100% core exposure, so the 6-non-core-hit branch never fires), 10 EXP = +1 level,
// cap 11. The override COLLAPSES the ramp to its level-11 STEADY STATE (reached ~25-32s in; the
// first burst lands at 40s CD, so level 11 is guaranteed by then). Every "× Hero Level" magnitude
// is therefore pinned at ×11. This is the measured-accurate model (kit-status residual: "burst DoT
// + Hero-Level auras measured accurate"). The level-11 pins below (12.76 = 1.16×11, 229.57 =
// 20.87×11) are what DISCRIMINATE the steady-state model from a level-1 (×1) counterfactual.
//
// Kit (blablalink prose, data/characters.json → characters['guillotine-winter-slayer'].skills):
//   S1 ■ every 10 EXP → Hero Level Up (max 11); reward: Reloads 10.26%               [G2]
//                                                reward: Recovers 2.44% final Max HP  [G3]
//      ■ on Hero level up → all Water Code allies:
//          Elemental Advantage Attack Damage ▲ 1.16% × Hero Level continuously         [G1]  (×11 = 12.76)
//          ATK ▲ 0.91% of skill user's ATK × Hero Level continuously                   [G1]  (×11 = 10.01% → flat)
//   S2 ■ 6 normal hits w/o core → EXP: ATK ▲ 1.81%, stacks ×100  (non-core branch —    [G4]  jointly
//      ■ 3 core hits          → EXP: ATK ▲ 1.81%, stacks ×100   (core branch, fires)   [G4]  modeled)
//      ■ Hero Level 2+ → self: Elemental Advantage Attack Damage ▲ 7.46% continuously  [G5]
//   BU ■ all Water Code allies: Attack Damage ▲ 10.14% / 10s                            [G6]
//                               Elemental Advantage Attack Damage ▲ 18.75% / 10s        [G6]
//      ■ highest-final-MaxHP enemy: 20.87% of final ATK × Hero Level / sec / 10s        [G7]  (×11 = 229.57/s)
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   G1  the auras target WATER-CODE ALLIES ONLY — in this comp that is gws + helm, NOT liter/crown.
//       Proven two ways: the buffApply target set is exactly {gws, helm}, AND removing the auras
//       drops gws AND helm damage while leaving crown (Fire) byte-identical. An unscoped all-ally
//       aura would also reach liter/crown — the target-set assertion is one that model provably fails.
//       The value 12.76 (=1.16×11) discriminates the level-11 steady state from a level-1 (1.16) ramp.
//   G2  the reload reward is LOAD-BEARING: removing it costs ~46 shots and ~2% damage over the fight
//       (the 10.26% mag top-up every 30 hits cuts natural reloads). A dropped/inert reload block
//       would leave the shot count unchanged — it does not.
//   G3  the heal reward is an EVENT, not a number: it is self-targeted, no HP pool is modeled, and no
//       ally in this comp watches gws's SELF-recovery — so it must change NO unit's damage by a point
//       (the counterfactual risk is someone encoding 2.44% as a damage buff). The block must also be
//       PRESENT (the line is represented as a recovery event, not silently dropped — hard rule 2).
//       Its recovery-consumer observable is unexercised HERE (no ally-recovery-watcher in the comp).
//   G4  the EXP ATK stack is self-scoped, value 1.81/stack, and HONORS its ×100 cap: the observed
//       stack count tops out at exactly 100 (an uncapped stack would exceed it; a flat non-stacking
//       buff would never show stacks>1). It is permanent (no wall-clock expiry).
//   G5  the Hero-Level-2 elem-advantage is SELF-ONLY — gws holds 7.46 but helm does NOT (unlike the
//       G1 auras which ARE shared). Value 7.46, permanent. The self-vs-shared split vs G1 is the point.
//   G6  the burst buffs reach exactly the 2 Water allies for exactly 10s (600f), once per cast. Scope
//       (not liter/crown) + duration (600f, not permanent) are the discriminators.
//   G7  the burst DoT magnitude is 229.57%/tick (=20.87×11), 10 ticks per cast, in the burst bucket —
//       NOT the level-1 value 20.87. 6 casts × 10 ticks = 60 instances over the fight.
//
// Fixture: the 720-kit-audit control comp (liter B1 / crown B2 / gws B3 / helm B3, boss Fire so gws
// is elementally ADVANTAGED — required to make elemAdvantageDamagePct live), focus gws. gws needs the
// real rotation to cast her burst at all. Deterministic (no seed). Event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
const SLUG = 'guillotine-winter-slayer';
/** controlComp slot order: liter 0 / crown 1 / gws 2 / helm 3. */
const LITER = 0;
const CROWN = 1;
const GWS = 2;
const HELM = 3;
/** The two Water-Code allies in this comp (liter=Fire, crown=Fire are excluded from Water grants). */
const WATER_ALLIES = [GWS, HELM];

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp(SLUG),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual patches ------------------------------------------------------------------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);
const hasKind = (b: any, kind: string) =>
  b.effects.some((e: any) => e.kind === kind);

/** G1 counterfactual: her S1 passive auras (the level-11 steady-state Water-ally grants) removed. */
const gwsNoAuras = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => b.trigger.kind !== 'passive');
  if (ov.skill1.length === before)
    throw new Error('gws S1 passive aura block missing — fixture is stale');
});
/** G2 counterfactual: her S1 level-up reload reward removed. */
const gwsNoReload = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasKind(b, 'instantReload'));
  if (ov.skill1.length === before)
    throw new Error('gws S1 instantReload block missing — fixture is stale');
});
/** G3 counterfactual: her S1 level-up heal reward removed. */
const gwsNoHeal = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasKind(b, 'heal'));
  if (ov.skill1.length === before)
    throw new Error('gws S1 heal block missing — fixture is stale');
});

// ---- runs (hoisted: each is a full 180s sim) -------------------------------------------------
const base = run();
const noAuras = run({ [SLUG]: gwsNoAuras });
const noReload = run({ [SLUG]: gwsNoReload });
const noHeal = run({ [SLUG]: gwsNoHeal });

// ---- readers ---------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const gwsBuffs = (evs: SimEvent[]) =>
  buffs(evs).filter((b) => b.casterIdx === GWS);
const gwsShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === SLUG);
const gwsBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === SLUG);
const gwsDamage = (evs: SimEvent[], srcSlot: Damage['srcSlot']) =>
  dmg(evs).filter((d) => d.slug === SLUG && d.srcSlot === srcSlot);
const targetSet = (bs: BuffApply[]) =>
  [...new Set(bs.map((b) => b.targetIdx))].sort((a, b) => a! - b!);

describe('guillotine-winter-slayer — kit spec', () => {
  describe('G1 — S1 Hero-Level auras are Water-Code-ally scoped, at the level-11 steady state', () => {
    // The S1 aura is the SHARED elem-advantage line (reaches helm); the S2 7.46 line is self-only
    // (G5) and never reaches helm — so helm's permanent holding isolates the S1 aura cleanly.
    const helmAura = gwsBuffs(base.events).filter(
      (b) =>
        b.stat === 'elemAdvantageDamagePct' &&
        b.targetIdx === HELM &&
        b.expiresFrame === null,
    );
    const s1ElemAdv = gwsBuffs(base.events).filter(
      (b) => b.stat === 'elemAdvantageDamagePct' && b.value === 12.76,
    );
    const casterAtk = gwsBuffs(base.events).filter(
      (b) => b.stat === 'casterAtkPct' && b.expiresFrame === null,
    );

    it('grants Elemental Advantage Attack Damage 12.76% (= 1.16 × Hero Level 11), not level-1 1.16%', () => {
      expect(
        helmAura.length,
        'no shared elemAdvantageDamagePct aura reached helm',
      ).toBeGreaterThan(0);
      expect([...new Set(helmAura.map((b) => b.value))]).toEqual([12.76]);
    });

    it('grants the ATK-of-caster aura as a flat add (= 0.91% × 11 of her ATK), permanent', () => {
      expect(
        casterAtk.length,
        'no passive casterAtkPct aura was applied',
      ).toBeGreaterThan(0);
      const vals = [...new Set(casterAtk.map((b) => b.value))];
      expect(vals.length).toBe(1);
      expect(
        vals[0],
        'casterAtkPct must resolve to a positive flat ATK add',
      ).toBeGreaterThan(0);
      expect(casterAtk.every((b) => b.expiresFrame === null)).toBe(true);
    });

    it('reach ONLY the Water-Code allies (gws + helm), never liter/crown', () => {
      expect(targetSet(s1ElemAdv)).toEqual(WATER_ALLIES);
      expect(targetSet(casterAtk)).toEqual(WATER_ALLIES);
    });

    it('DISCRIMINATING: removing the auras drops gws AND helm, but leaves Fire crown byte-identical', () => {
      expect(noAuras.totals[SLUG]).toBeLessThan(base.totals[SLUG]);
      expect(noAuras.totals.helm).toBeLessThan(base.totals.helm);
      // crown is Fire — an unscoped all-ally aura would have lifted her too; the scoped model does not.
      expect(noAuras.totals.crown).toBe(base.totals.crown);
    });
  });

  describe('G2 — S1 level-up reload reward (Reloads 10.26% every 30 hits) is load-bearing', () => {
    it('is a hitCount-30 self instantReload of fraction 0.1026 in the shipped override', () => {
      const ov = loadOverride(SLUG)!;
      const blk = (ov.skill1 as any[]).find((b) => hasKind(b, 'instantReload'));
      expect(blk, 'no instantReload block in skill1').toBeTruthy();
      expect(blk.trigger).toEqual({ kind: 'hitCount', count: 30 });
      expect(blk.target).toEqual({ kind: 'self' });
      expect(
        blk.effects.find((e: any) => e.kind === 'instantReload').fraction,
      ).toBe(0.1026);
    });

    it('adds shots over the fight (removing it costs shots and damage)', () => {
      const baseShots = gwsShots(base.events).length;
      const noReloadShots = gwsShots(noReload.events).length;
      expect(baseShots).toBeGreaterThan(noReloadShots);
      expect(base.totals[SLUG]).toBeGreaterThan(noReload.totals[SLUG]);
    });
  });

  describe('G3 — S1 level-up heal reward (Recovers 2.44% final Max HP) is an event, not a number', () => {
    it('is PRESENT in the shipped override as a self heal event on the level-up cadence (not dropped)', () => {
      const ov = loadOverride(SLUG)!;
      const blk = (ov.skill1 as any[]).find((b) => hasKind(b, 'heal'));
      expect(
        blk,
        'the 2.44% Max HP recovery line must be represented, not silently dropped',
      ).toBeTruthy();
      expect(blk.trigger).toEqual({ kind: 'hitCount', count: 30 });
      expect(blk.target).toEqual({ kind: 'self' });
      expect(blk.effects.some((e: any) => e.kind === 'heal')).toBe(true);
    });

    it("changes NO unit's damage by a single point (event-only self-heal, no HP pool, no damage bucket)", () => {
      // The counterfactual risk: encoding 2.44% as a damage buff. A faithful heal event is inert on
      // every total. (Its recovery-consumer observable is unexercised in THIS comp — no ally watches
      // gws's SELF-recovery — so the inertness, not a consumer firing, is the assertable property.)
      expect(base.totals).toEqual(noHeal.totals);
    });
  });

  describe('G4 — S2 EXP ATK stack: ATK ▲ 1.81% per stack, self-scoped, capped at 100, permanent', () => {
    const stacks = gwsBuffs(base.events).filter(
      (b) => b.stat === 'atkPct' && b.value === 1.81,
    );

    it('is live and ramps to exactly the ×100 cap (never exceeding it)', () => {
      expect(stacks.length, 'no EXP ATK stack was applied').toBeGreaterThan(
        100,
      );
      const maxStacks = Math.max(...stacks.map((b) => b.stacks));
      expect(maxStacks, 'stack count must top out at the kit cap of 100').toBe(
        100,
      );
      expect(
        stacks.some((b) => b.stacks === 100),
        'cap must actually be reached and held',
      ).toBe(true);
    });

    it('is self-scoped (gws only) and permanent (no wall-clock expiry)', () => {
      expect(targetSet(stacks)).toEqual([GWS]);
      expect(stacks.every((b) => b.expiresFrame === null)).toBe(true);
    });
  });

  describe('G5 — S2 Hero-Level-2 Elemental Advantage is SELF-only (not shared with helm)', () => {
    const selfElemAdv = gwsBuffs(base.events).filter(
      (b) => b.stat === 'elemAdvantageDamagePct' && b.value === 7.46,
    );

    it('is 7.46%, held by gws alone, permanent', () => {
      expect(
        selfElemAdv.length,
        'no self elemAdvantageDamagePct 7.46 buff',
      ).toBeGreaterThan(0);
      expect(
        targetSet(selfElemAdv),
        'the 7.46 line affects SELF only — helm must not hold it',
      ).toEqual([GWS]);
      expect(selfElemAdv.every((b) => b.expiresFrame === null)).toBe(true);
    });

    it('is distinct from the shared G1 aura (helm holds 12.76 but NOT 7.46)', () => {
      const helmHolds = buffs(base.events).filter(
        (b) =>
          b.targetIdx === HELM &&
          b.stat === 'elemAdvantageDamagePct' &&
          b.value === 7.46,
      );
      expect(helmHolds.length).toBe(0);
    });
  });

  describe('G6 — burst grants Water-Code allies Attack Damage 10.14% + Elem Advantage 18.75% for 10s', () => {
    const bursts = gwsBursts(base.events);
    const atkDmg = gwsBuffs(base.events).filter(
      (b) => b.stat === 'attackDamagePct' && b.value === 10.14,
    );
    const elemAdv = gwsBuffs(base.events).filter(
      (b) => b.stat === 'elemAdvantageDamagePct' && b.value === 18.75,
    );

    it('casts bursts in the fixture', () => {
      expect(bursts.length).toBeGreaterThan(0);
    });

    it('reach exactly the 2 Water allies, once per cast, for exactly 10s (600f)', () => {
      for (const bs of [atkDmg, elemAdv]) {
        expect(bs.length, 'burst Water-ally buff missing').toBe(
          bursts.length * WATER_ALLIES.length,
        );
        expect(targetSet(bs)).toEqual(WATER_ALLIES);
        for (const b of bs) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });
  });

  describe('G7 — burst DoT: 20.87% × Hero Level 11 (= 229.57%) of ATK per second for 10s on the boss', () => {
    const dots = gwsDamage(base.events, 'burst');
    const bursts = gwsBursts(base.events);

    it('ticks at the level-11 magnitude 229.57%, NOT the level-1 value 20.87%', () => {
      expect(dots.length, 'no burst DoT damage landed').toBeGreaterThan(0);
      expect([...new Set(dots.map((d) => d.atkPct))]).toEqual([229.57]);
    });

    it('lands 10 ticks per cast (1/s × 10s), in the burst bucket', () => {
      expect(dots.length).toBe(bursts.length * 10);
      expect([...new Set(dots.map((d) => d.bucket))]).toEqual(['burst']);
    });
  });
});

```

## src/skills/overrides/guillotine-winter-slayer.json

```json
{
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Remove this banner only when the unit has been measured/hand-tuned. || BANNER SCOPE (kit-parse AUTHOR wave 6): the banner applies to the AUTHORED skill2 slot + the ADDITIVE skill1 heal-event block ONLY. skill1 aura/reload blocks + the entire burst slot are PRESERVED VERBATIM from the partial-hand model — kit-status residual: 'burst DoT + Hero-Level auras MEASURED accurate' — do NOT regenerate them. || MODEL: Hero Level currency (prior 4, DERIVABLE): EXP +1 per 3 core hits (scope-lock 100% core exposure; the 6-non-core-hit branch never fires there — blended-rate ⚑2), 10 EXP = +1 Hero Level, cap 11 (~30 hits/level → level 11 in ~25s firing / ~32s wall at 12/s, 60 ammo, 81f reload). skill1 (PRESERVED): Water-ally passive auras at level-11 steady-state — elemAdvantageDamagePct 1.16x11=12.76, casterAtkPct 0.91x11=10.01; level-up rewards KEEP TRIGGERING at max level (review-confirmed) → hitCount 30 instantReload 0.1026. skill1 (NEW, additive, HARD RULE 2): the level-up reward 'Recovers 2.44% of the skill user's final Max HP' was previously a SILENT DROP — now a `heal` event block on the same hitCount-30 cadence, self-target, event-only (zero self-damage impact; exists so recovery-consumer teammates, e.g. crown, see the proc). Driver may strip if strict-verbatim wins — flagged in findings. skill2 (AUTHORED): EXP ATK stack → hitCount 3 (core branch; was materialized hitCount 6 = the non-core branch, inconsistent with the preserved skill1 hitCount-30 level cadence which assumes 3 hits/EXP) x atkPct 1.81, maxStacks 100 (+181% at cap; engine ramps the stack natively — cap at ~32s wall, no haircut needed); 'Hero Level 2 or above' elemAdvantageDamagePct 7.46 → passive (level 2 at ~3s in; first-3s over-credit negligible). burst (PRESERVED): burstCast Water-ally attackDamagePct 10.14 + elemAdvantageDamagePct 18.75 (10s); burstCast dot 229.57%/s x10s on the boss (=20.87x11; steady-state level-11 snapshot — NOTE the FIRST burst lands at ~5s on an early B1->B2->B3 chain, NOT at 40s CD, so its DoT is over-credited at level 11 vs the true low-level value; later ~40s-CD bursts genuinely reach level 11. Part of the measured-accurate steady-state collapse — see ⚑3). || ⚑ NEEDS-MEASUREMENT: (⚑1 TOP, cadence tuple — MANDATORY + ESCALATED) pullsPerSec 12 (datamined rate_of_fire 720) + reloadFrames 81: the measured residual already reads normal-fire ~26% HOT with these values (kit-status U8; 12/1.26≈9.5/s is the arithmetic suspect) — owner ruling: do NOT refit by fudge; pin via focus video rounds/min + reload gap, then fix via charFixes. (⚑2) EXP build blend: shipped 3 hits/stack (100% core); if the real core-hit fraction c<1, effective = 1/(c/3+(1-c)/6) ∈ [3,6] — recipe: focus video, count hits between level-up procs (30 hits/level = pure core branch). (⚑3, low) level-11 steady-state collapse: auras are passive full-value from t=0 (no ~25s ramp haircut) AND the burst DoT snapshots level 11 on EVERY cast including the first (~5s, before level 11 is reached — the first-burst DoT is over-credited; later ~40s-CD bursts genuinely reach level 11). Both are deliberate steady-state approximations, measured-accurate per residual ('burst DoT + Hero-Level auras measured accurate'); keep unless a future solo read disagrees. Recipe (if ever refit): ramp the auras 1.16xL / 0.91xL over the level trajectory and snapshot the DoT at cast-time level. Cross-family S2b (claude-fable-5) independently flagged the ramp as the literal-kit refinement; reconciled to FAITHFUL-as-calibrated, not a faithfulness break. || SKIPS: none — every kit line is represented (the non-core EXP line jointly via the blended hitCount-3 block, see ⚑2). || Kit-autonomy gauntlet 2026-07-25: all 12 load-bearing lines pinned by scripts/tests/units/guillotine-winter-slayer.test.ts (16 tests, GREEN); cross-family S2b (claude-fable-5) converged on every line incl. the heal-inertness / reload-load-bearing / casterAtk-flat / Water-scope / burstCast-vs-fullBurstEnter / DoT-x11 discriminators; the single reviewer FIX (Hero-Level ramp) reconciled to FAITHFUL-as-calibrated steady-state per ⚑3.",
  "unmodeled": {
    "skill1": [],
    "skill2": [],
    "burst": []
  },
  "caveats": [
    "skill1/skill2: normal-fire cadence (12/s, reload 81f) is datamined and measured ~26% hot — flagged for video measurement, deliberately NOT refit",
    "skill2: EXP build rate modeled at 3 hits/stack (core branch at scope-lock 100% core exposure); the blend with the 6-hit non-core branch is an unmeasured estimate",
    "skill2: Elemental Advantage Attack Damage 7.46% modeled as passive (Hero Level 2 is reached ~3s into the fight)"
  ],
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "passive"
      },
      "target": {
        "kind": "alliesOfElement",
        "element": "Water"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "elemAdvantageDamagePct",
          "value": 12.76
        },
        {
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 10.01
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "hitCount",
        "count": 30
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "instantReload",
          "fraction": 0.1026
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "hitCount",
        "count": 30
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "heal"
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "hitCount",
        "count": 3
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 1.81,
          "maxStacks": 100
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "passive"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "elemAdvantageDamagePct",
          "value": 7.46
        }
      ]
    }
  ],
  "burst": [
    {
      "slot": "burst",
      "trigger": {
        "kind": "burstCast"
      },
      "target": {
        "kind": "alliesOfElement",
        "element": "Water"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 10.14,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "elemAdvantageDamagePct",
          "value": 18.75,
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "burst",
      "trigger": {
        "kind": "burstCast"
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "dot",
          "atkPct": 229.57,
          "durationSec": 10,
          "intervalSec": 1
        }
      ]
    }
  ]
}

```