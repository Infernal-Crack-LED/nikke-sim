# S7 RECONCILING-JUDGE PACKET — scarlet-black-shadow (Scarlet: Black Shadow, "sbs")

# RL/Attacker/Wind/Burst III, Pilgrim. Variant of the AR/Electric base unit (slug scarlet) — never conflate.

# Assembled by the Qwen driver per the gauntlet. NOT de-contaminated (the judge grades the driver artifacts).

## UPFRONT FACTS (driver-reported; verify against the artifacts below)

- DRIVER VERDICT SO FAR: GO. All kit lines re-derived FAITHFUL; cross-family fable-5 (S2b, clean re-dispatch) + opus (S5 blind test, S6 blind override) all converged.
- S5 BLIND TEST vs DRIVER OVERRIDE: 25 tests = 19 pass / 4 skip / 2 fail AS WRITTEN. The 2 failures are a blind RECON_ERROR ONLY: the blind test asserts buffApply.durationShots toBeUndefined() for timed buffs, but the engine emits null (SimEvent type: durationShots: number|null). With ONLY that nullity corrected (toBeUndefined->toBeNull), the blind test is FULLY GREEN: 21 pass / 4 skip / 0 fail. The 4 skips are the blind role's documented gaps (multi-enemy Distributed split — no multi-mob fixture; target-set distinctions — collapse to the partless boss; maxAmmo rounding — no magazine-size event; the burst 1/2/3 count-change — its trigger identifier was redacted so no blind counterfactual can toggle it). NO REAL-GOTCHA: every kit-faithfulness assertion the blind test makes passes against the driver override.
- S6 BLIND OVERRIDE vs DRIVER OVERRIDE — short diff:
  - skill1 trigger: blind {kind:"fullChargeCount", count:[3,6,9]} (per-phase; the kind name is a GUESS — the real chargeCounter union member was redacted from the blind packet) vs driver {kind:"chargeCounter", count:3, countInFb:1} (scalar CUMULATIVE). THIS IS THE MEASUREMENT-GATED KNOT (see below) — both driver and blind flag it.
  - skill1 structure: blind splits into 3 blocks (outFb base / inFb-not-cast base / inFb-cast reduced[1,2,3]) to express the burst count-change because it did not know the engine's native chargeCounter.countInFb (redacted); driver uses ONE block with countInFb gated on lastBurstCastFrame (sim.ts:2921). Both achieve "lowered thresholds for 10s gated on her OWN burst cast".
  - skill1 effect VALUES/FLAVORS: IDENTICAL — 283.03 (plain), 565 (distributed), 848.03 (distributed).
  - skill2: IDENTICAL — fullBurstEnter; buff maxAmmoPct 60 / 10s / self; instantReload fraction 1 ordered after the cap.
  - burst: IDENTICAL — burstCast; buff atkPct 115.12 / 10s / self; buff chargeDamagePct 169.63 / 10s / self (ADDITIVE, not chargeDamageMultPct).
- THE MEASUREMENT-GATED KNOT (driver + blind + fable-5 all agree): the EXACT per-phase proc cadence. Driver ships scalar (count 3 cumulative outside = 3rd/6th/9th charge; countInFb 1 = a proc every charge in-burst). Kit-literal reading is per-phase (3/6/9 outside, 1/2/3 in-burst). Per-phase [1,2,3]/[3,6,9] was tested and overshoots cold (~0.78 vs the ~1.13/1.18 N3 baseline); own-probe evidence is split (sbs-control: procs ~every charge in burst; N3 focus re-read: the 848% phase ABSENT from one confirmed window). RECIPE: record an isolated single-burst SBS clip and count S1 proc popups (esp. the distinct ~3.2M 848% phase) in one clean window; phase-3 is the discriminator (9 total charges => cumulative, 6 => per-phase increments); resolve the ATK/rotation confound first. This file pins the faithful STRUCTURE that holds under BOTH readings and flags the exact count — it does NOT re-fudge the cadence.
- TIER: 2 (burstCast-vs-fullBurstEnter trigger split; scoped self-buffs; status-gated count-requirement; meta-defining wind carry).

--- SECTION 1: RECONCILING-JUDGE CONTRACT (your instructions + return JSON shape) ---

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
  "convergence": {
    "s5TestsVsDriverOverride": "GREEN|RED",
    "redAssertions": ["<which S5 assertions fail vs the driver's override>"]
  },
  "lineFindings": {
    "skill1": [
      {
        "kitLine": "<≤40 chars>",
        "category": "FAITHFUL|DOCUMENTED_GAP|REAL-GOTCHA|RECON_ERROR",
        "subkind": "SILENT_DROP|ENGINE|FIDELITY|ENCODING|null",
        "driverSaid": "...",
        "blindSaid": "...",
        "formulaCheck": "...",
        "fireRateOk": true,
        "explanation": "..."
      }
    ],
    "skill2": [],
    "burst": []
  },
  "gotchas": [
    {
      "subkind": "SILENT_DROP|ENGINE|FIDELITY|ENCODING",
      "slot": "...",
      "summary": "...",
      "evidence": "<real kit line + formula citation + driver vs blind>",
      "documentedByDriver": true,
      "severity": "high|med|low",
      "suggestedFix": "<faithful representation, or 'needs measurement' + recipe — NEVER a fudge>"
    }
  ],
  "discriminationOk": true,
  "faithfulnessScore": "<0..1 fraction of kit lines FAITHFUL or DOCUMENTED_GAP>",
  "verdict": "GO|NO-GO(faithfulness)|NO-GO(engine-core)",
  "verdictRationale": "<one paragraph: which gotchas are real + ranked; whether the blind re-derivations converged; what must change for GO; the same-model residual the owner should spot-check>"
}
```

Save to `scripts/kit-autonomy/results/<slug>.json`. `suggestedFix` is a faithful representation or a flagged
measurement, NEVER a number chosen to hit the board. Tight structured JSON, not an essay.

--- SECTION 2: MECHANICS SSOT (grade faithfulness against these) ---

### docs/data/damage-calculation.md

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

Buffs _inside_ a bucket add; buckets _multiply_. `rate%` is the instance's skill/attack
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

- **Enemy DEF is a small FLAT, subtractive term inside the base** (min-1 floor). +ATK% sits _inside_
  the paren (applies before DEF); the skill coefficient, charge, and every other bucket apply
  _after_ (ginmy atkbuff/atkdamagebuff/def tests). Engine: `baseAtk = max(0, effectiveAtk − bossDef)`
  then `× atkPct × …` ✓. Measured boss-type DEF ≈140 (mobs 100) → **negligible** at scope-lock ATK
  (≤0.12% board shift); we run `bossDef:0`. See DECISIONS + `scripts/battery/boss-def.ts`.
- **Defense-Ignore ("true damage")** drops the `− enemyDEF` term entirely (`ATK × coef × …`). A
  separate **"Defense-Ignore Damage Increase"** bucket multiplies ONLY def-ignore hits and is
  _additive with Attack Damage_ (ginmy /nikke_truedamage_test). Negligible on our board since DEF≈140
  is already near-zero; only the def-ignore-damage _multiplier_ would matter (units: Jill, Ada) — not
  yet modeled, low priority.
- **+ATK% and +Attack Damage% are DIFFERENT buckets → multiply** (×1.5×1.3 = ×1.95, not +80%).
- **"X% of caster's ATK" = caster's BASE (static) ATK**, added FLAT _outside_ the recipient's
  `(1+ATK%)` (NOT buffed; the "final" keyword toggles buffs in — KR 기준/JP 基準 = base). Engine uses
  `owner.staticAtk` ✓. "% of **final** ATK" skill damage uses the actor's LIVE buffed ATK ✓.
- **Distributed groups with Damage-Taken, NOT Attack Damage** (naming trap). Engine ✓.

| damage type                       | crit        | core                      | range | Attack-Dmg       | full-burst               | element | charge       |
| --------------------------------- | ----------- | ------------------------- | ----- | ---------------- | ------------------------ | ------- | ------------ |
| normal / charged                  | ✅          | ✅                        | ✅    | ✅               | ✅                       | ✅      | charged-only |
| skill / function "% of final ATK" | ✅          | ❌ (unless "as core dmg") | ❌    | ✅               | ✅                       | ✅      | ❌           |
| DoT / sustained                   | ✅          | ❌*                       | ❌    | ✅               | ✅ (JP: not on 1st tick) | ✅      | ❌           |
| distributed                       | ⚠️ disputed | ❌                        | ❌    | own calc (Taken) | ⚠️                       | ⚠️      | ❌           |
| burst nuke                        | ✅          | only if "as core dmg"     | ❌    | ✅               | ✅                       | ✅      | ❌           |

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
burst skill at its cast lands _before_ Full Burst begins — it gets neither the +0.5 nor any
"when entering Full Burst" aura. Buffs granted by earlier casts in the same rotation do apply to
it. Burst-originated damage that lands _during_ the window (dot ticks, stored-hit releases,
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
crit/core _outcomes_ (0 or the full bonus), not the expectations. A crit popup is ×1.5 of its
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

Applies to explosion/attachment-_flavored_ hits (Rapi: Red Hood's projectiles, Anis: Star's
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

| popup class                          | Major           | formula result | measured popup |
| ------------------------------------ | --------------- | -------------- | -------------- |
| non-crit body                        | 1 + 0.3 = 1.3   | 181,131        | 180,633        |
| non-crit core                        | 1.3 + 1.0 = 2.3 | 320,464        | 319,582        |
| crit body                            | 1.3 + 0.5 = 1.8 | 250,796        | 250,107        |
| acid tick (192%, no core/range/crit) | 1.0             | 289,469        | 288,662        |

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

### docs/data/game-mechanics.md

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

| Weapon | Cadence                  | Notes                                 |
| ------ | ------------------------ | ------------------------------------- |
| AR     | 12/s                     | 5 frames exactly                      |
| SMG    | 24/s ⚠ **measured 20/s** | see the frame-quantization note below |
| SG     | 1.5/s                    | 10 pellets/shot; 40 frames exactly    |
| MG     | 60 rounds/s cap          | after wind-up ladder — §3             |
| Pistol | 4/s                      |                                       |
| SR     | charge cycle + 22f bolt  | §4                                    |
| RL     | charge cycle             | no bolt recovery                      |

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

--- SECTION 3: GROUND TRUTH — kit prose + base stats (data/characters.json extract) ---
{
"slug": "scarlet-black-shadow",
"name": "Scarlet: Black Shadow",
"imageUrl": "https://sg-tools-cdn.blablalink.com/lm-40/at-86/b7689ebb7d1b09af2779f7fd11a22ba6.png",
"weapon": "RL",
"burst": "III",
"burstCooldownSec": 40,
"class": "Attacker",
"element": "Wind",
"manufacturer": "Pilgrim",
"normalAttackMultiplier": 57.29,
"coreAttackMultiplier": 200,
"ammo": 9,
"reloadFrames": 152,
"chargeFrames": 18,
"chargeMultiplier": 150,
"hitsPerShot": 1,
"rl3": 13.75,
"burstGaugePerShot": 1.25,
"treasure": false,
"nicknames": [
"sbs"
],
"skills": {
"skill1": "■ Activates when performing a Full Charge attack.\nEffects vary according to the number of attacks. Only one effect is triggered at a time.\nThree times: Affects the 1 enemy unit(s) with the lowest final DEF.\nDeals 283.03% of final ATK as damage.\nSix times: Affects enemies within range.\nDeals 565% of final ATK as Distributed Damage.\nNine times: Affects all enemies.\nDeals 848.03% of final ATK as Distributed Damage.",
"skill2": "■ Activates when entering Full Burst. Affects self. \nMax Ammunition Capacity ▲ 60% for 10 sec.\nReload 100% of the magazine(s).",
"burst": "■ Affects self.\nChanges Full Charge attack count required for Skill 1 to 1 time/2 times/3 times for 10 sec.\nATK ▲ 115.12% for 10 sec.\nCharge Damage ▲ 169.63% for 10 sec."
},
"skillCooldownsSec": {
"skill1": null,
"skill2": null,
"burst": 40
},
"role": {
"weapon": {
"shot_id": 1022501,
"shot_detail": {
"id": 1022501,
"damage": 5729,
"max_ammo": 9,
"shake_id": 2,
"ShakeType": "Fire_RL",
"fire_type": "ProjectileDirect",
"zoom_rate": 0,
"input_type": "UP",
"shot_count": 1,
"ShakeWeight": 120,
"attack_type": "Metal",
"camera_work": "camera_work_01",
"charge_time": 30,
"penetration": 0,
"reload_time": 200,
"shot_timing": "Concurrence",
"spot_radius": 50,
"weapon_type": "RL",
"is_targeting": false,
"muzzle_count": 1,
"rate_of_fire": 60,
"homing_script": "lv1",
"name_localkey": "Rocket Launcher",
"prefer_target": "TargetGL",
"reload_bullet": 10000,
"counter_enermy": "Metal_Type",
"multi_aim_range": 0,
"spot_last_delay": 20,
"core_damage_rate": 20000,
"end_rate_of_fire": 60,
"spot_first_delay": 20,
"center_shot_count": 0,
"reload_start_ammo": 8,
"full_charge_damage": 15000,
"multi_target_count": 0,
"spot_radius_object": 2,
"uptype_fire_timing": 1,
"burst_energy_pershot": 12500,
"description_localkey": "■ Affects target(s).\nUnleashes sword energy for an attack of small range. \n<color=#00AEFF>Deals {damage}% of ATK as damage.\nCharge Time: {charge_time} sec.\nFull Charge Damage: {full_charge_damage}% of damage.\nDeals {core_damage_rate}% damage when attacking core.</color>",
"maintain_fire_stance": 23,
"spot_explosion_range": 50,
"use_function_id_list": [
0
],
"accuracy_change_speed": 0,
"hurt_function_id_list": [
0
],
"spot_projectile_speed": 400,
"accuracy_change_pershot": 0,
"prefer_target_condition": "None",
"rate_of_fire_reset_time": 0,
"full_charge_burst_energy": 15000,
"end_accuracy_circle_scale": 10,
"auto_accuracy_change_speed": 0,
"rate_of_fire_change_pershot": 0,
"start_accuracy_circle_scale": 10,
"target_burst_energy_pershot": 25000,
"auto_accuracy_change_pershot": 0,
"auto_end_accuracy_circle_scale": 10,
"auto_start_accuracy_circle_scale": 10
},
"bonusrange_max": 0,
"bonusrange_min": 0
},
"burstMeta": {
"burst_duration": 1000,
"use_burst_skill": "Step3",
"burst_apply_delay": 1,
"change_burst_step": "StepFull"
},
"skillDetails": {
"skill1_id": 2225101,
"skill2_id": 2225201,
"skill1_table": "StateEffect",
"skill2_table": "StateEffect",
"skill1_detail": {
"id": 2225101,
"icon": "icn_skill_damage_01",
"group_id": 22251,
"skill_level": 1,
"name_localkey": "Fleetly Fading: Breakthrough",
"next_level_id": 2225102,
"level_up_cost_id": 30102,
"description_localkey": "■ Activates when performing a Full Charge attack.\n<color=#00AEFF>Effects vary according to the number of attacks. Only one effect is triggered at a time.</color>\nThree times: Affects the {description_value_01} enemy unit(s) with the lowest <word_group=10025>final</word_group> DEF.\n<color=#00AEFF>Deals {description_value_02}% of <word_group=10025>final</word_group> ATK as damage.</color>\nSix times: Affects <word_group=10020>enemies within range</word_group>.\n<color=#00AEFF>Deals {description_value_03}% of <word_group=10025>final</word_group> ATK as <word_group=10019>Distributed Damage</word_group>.</color>\nNine times: Affects all enemies.\n<color=#00AEFF>Deals {description_value_04}% of <word_group=10025>final</word_group> ATK as <word_group=10019>Distributed Damage</word_group>.</color>",
"description_value_list": [
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
"218.46",
"225.63",
"232.81",
"239.98",
"247.16",
"254.32",
"261.5",
"268.68",
"275.85",
"283.03"
]
},
{
"description_value": [
"371.28",
"392.79",
"414.32",
"435.85",
"457.37",
"478.89",
"500.42",
"521.94",
"543.47",
"565"
]
},
{
"description_value": [
"441.23",
"486.43",
"531.63",
"576.83",
"622.03",
"667.23",
"712.43",
"757.63",
"802.83",
"848.03"
]
},
{},
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
"id": 2225201,
"icon": "icn_skill_statammo_01",
"group_id": 22252,
"skill_level": 1,
"name_localkey": "Fleetly Fading: Asura",
"next_level_id": 2225202,
"level_up_cost_id": 30202,
"description_localkey": "■ Activates when entering Full Burst. Affects self. \n<color=#00AEFF>Max Ammunition Capacity ▲ {description_value_01}% for {description_value_02} sec.</color>\n<color=#00AEFF>Reload {description_value_03}% of the magazine(s).</color>",
"description_value_list": [
{
"description_value": [
"40",
"42.22",
"44.44",
"46.66",
"48.88",
"51.1",
"53.32",
"55.54",
"57.76",
"60"
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
"30",
"30",
"30",
"60",
"60",
"60",
"100",
"100",
"100",
"100"
]
},
{
"description_value": [
"0",
"0",
"0",
"0",
"0",
"0",
"0",
"0",
"0",
"0"
]
},
{},
{},
{},
{},
{},
{},
{}
],
"info_description_localkey": "Skill 2"
},
"ulti_skill_id": 1225401,
"ulti_skill_detail": {
"id": 1225401,
"icon": "icn_skill_c225_ult",
"group_id": 12254,
"shake_id": 1,
"skill_type": "SetBuff",
"attack_type": "Wind",
"skill_level": 1,
"counter_type": "Metal_Type",
"duration_type": "TimeSec",
"name_localkey": "Fleetly Fading: Strike",
"next_level_id": 1225402,
"prefer_target": "LowHP",
"resource_name": "c225_ulti",
"duration_value": 0,
"skill_cooltime": 4000,
"level_up_cost_id": 30302,
"skill_value_data": [
{
"skill_value": 0,
"skill_value_type": "None"
},
{
"skill_value": 1,
"skill_value_type": "Integer"
},
{
"skill_value": 100,
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
"description_localkey": "■ Affects self.\n<color=#00AEFF>Changes Full Charge attack count required for Skill 1 to 1 time/2 times/3 times for {description_value_01} sec.</color>\n<color=#00AEFF>ATK ▲ {description_value_02}% for {description_value_03} sec.</color>\n<color=#00AEFF>Charge Damage ▲ {description_value_04}% for {description_value_05} sec.</color>",
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
"17.28",
"28.15",
"39.02",
"49.89",
"60.76",
"71.64",
"82.51",
"93.38",
"104.25",
"115.12"
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
"96.41",
"104.54",
"112.68",
"120.81",
"128.95",
"137.09",
"145.22",
"153.36",
"161.49",
"169.63"
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
{},
{},
{}
],
"prefer_target_condition": "None",
"info_description_localkey": "Burst Skill",
"after_use_function_id_list": [
122530101,
122530102,
122530103,
122530104,
122530105,
122530106
],
"after_hurt_function_id_list": [
0
],
"before_use_function_id_list": [
0
],
"before_hurt_function_id_list": [
0
]
}
},
"statScaling": {
"grow_grade": 422502,
"grade_core_id": 1,
"stat_enhance_id": 5105,
"stat_enhance_detail": {
"id": 5105,
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
300001
],
"element_details": [
{
"id": 300001,
"element": "Wind",
"group_id": 5000003,
"element_icon": "icn_element_wind",
"weak_element_id": 100001,
"element_desc_localekey": "Injects Code: A.N.M.I. to all iron-type enemies, dealing 10% additional damage.",
"element_name_localekey": "Wind",
"element_code_name_localekey": "Code: A.N.M.I."
}
]
},
"piece": {
"piece_id": 5100225,
"piece_detail": {
"id": 5100225,
"class": "Attacker",
"order": 22500,
"use_id": 0,
"use_type": "None",
"item_rare": "SSR",
"item_type": "Piece",
"stack_max": 9999999,
"use_value": 0,
"corporation": "PILGRIM",
"resource_id": 225,
"item_sub_type": "CharacterPiece",
"name_localkey": "Scarlet: Black Shadow's Spare Body",
"use_limit_count": false,
"inventory_filter": [
"etc"
],
"corporation_sub_type": "OVERSPEC",
"description_localkey": "Can be used for Nikkes' Limit Breaks.\nIf a Nikke's Limit Break has reached the max level, any additional Spare Bodies for that Nikke will be converted to Body Labels."
}
},
"meta": {
"id": 422501,
"class": "Attacker",
"order": 10149,
"name_code": 5105,
"corporation": "PILGRIM",
"resource_id": 225,
"name_localkey": "Scarlet: Black Shadow",
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
"def": 88,
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
"resourceId": 225
}
}

--- SECTION 4: S2b CROSS-FAMILY REVIEW (claude-fable-5, clean re-dispatch, leakDetected:null) + driver reconciliation ---
{
"slug": "scarlet-black-shadow",
"leakDetected": null,
"spec": [
{
"slot": "skill1",
"kitLine": "Activates when performing a Full Charge",
"disposition": "FAITHFUL",
"scope": "Full Charge attacks only — the counter advances per completed full-charge attack, never per trigger pull or per hit-landing. RL base (chargeFrames 18, hitsPerShot 1) means in practice every shot is a full charge, which HIDES a mis-keyed counter.",
"durationSemantics": "Permanent passive counter; phases cycle (3→6→9→3…), not one-pass. 'Only one effect is triggered at a time' = exactly one phase effect per threshold crossing.",
"triggerIdentity": "The full-charge phase-counter trigger (per-phase attack-count array [3,3,3] under base kit), NOT hitCount (counts rounds), NOT shotFired (counts pulls), NOT interval.",
"targetSet": "enemy (per-phase target clauses; single partless boss collapses all three to the boss)",
"nearestWrongModel": "hitCount/shotFired every-3 with a single repeating effect, or a one-pass ladder that fires 283/565/848 once each then goes dead, or all three effects firing together at the 9th charge.",
"distinguishingAssertion": "onEvent damage log: S1 proc mults appear in the strict repeating cycle 283.03, 565, 848.03, 283.03, … over a long no-burst-window stretch; the 9th, 18th… full charge emits exactly ONE proc (848.03), never three; proc count after N full charges = floor-driven by the cycle, not N/3 copies of one mult.",
"inertness": "No proc may fire on an uncharged/partial shot; no two phase effects on the same charge.",
"evidenceTier": "DATAMINED",
"loadBearing": true
},
{
"slot": "skill1",
"kitLine": "Three times: … 283.03% … damage",
"disposition": "FAITHFUL",
"scope": "Instant skill damage (flatDamage 283.03% of final ATK), phase-1 effect. Crits at caster rate per rider convention; NO core (text lacks 'core strike'). Takes FB by landing timing (default noFb OFF), no range bonus per rider rule.",
"durationSemantics": "Instant hit, no duration.",
"triggerIdentity": "Phase 1 of the full-charge counter (3rd charge at base; 1st charge inside her burst window).",
"targetSet": "the 1 enemy with lowest final DEF — resolves to the sole boss; targeting clause is inert in v1.",
"nearestWrongModel": "Granting the proc core-hit eligibility (core:true), or scoping it 'lowest final DEF' as a conditional that can whiff.",
"distinguishingAssertion": "Every 283.03 proc damage event carries zero core contribution (no core bucket / coreRate 0) while still rolling crit at her sheet rate; it lands on the boss every phase-1 crossing with no gate.",
"inertness": "Must not receive coreAttackMultiplier-path credit; must not double-fire with the 565/848 lines.",
"evidenceTier": "DATAMINED",
"loadBearing": true
},
{
"slot": "skill1",
"kitLine": "Six times: … 565% … Distributed Damage",
"disposition": "FAITHFUL",
"scope": "Phase-2 skill damage, 'Distributed Damage' over enemies within range — with exactly ONE enemy the FULL 565% lands on the boss (distribution over a 1-element set is identity).",
"durationSemantics": "Instant hit.",
"triggerIdentity": "Phase 2 of the same cycling counter (6th charge base; 2nd charge in-burst).",
"targetSet": "enemies within range → the boss.",
"nearestWrongModel": "Dividing the 565% by a nominal multi-enemy count (e.g. /3) because 'Distributed', under-crediting solo-boss damage ~3×.",
"distinguishingAssertion": "The phase-2 proc's damage event mult equals the full 565% of final ATK against the single boss — not 565/N for any assumed N>1.",
"inertness": "No core credit; exactly one proc per phase-2 crossing.",
"evidenceTier": "DATAMINED",
"loadBearing": true
},
{
"slot": "skill1",
"kitLine": "Nine times: … 848.03% … Distributed",
"disposition": "FAITHFUL",
"scope": "Phase-3 skill damage, full 848.03% to the solo boss (same distributed-identity rule).",
"durationSemantics": "Instant hit; after it fires the phase counter wraps to phase 1.",
"triggerIdentity": "Phase 3 of the cycling counter (9th charge base; 3rd charge in-burst).",
"targetSet": "all enemies → the boss.",
"nearestWrongModel": "Terminal-phase reading: counter sticks at phase 3 and repeats 848.03 every 3 charges thereafter (or goes dead), instead of wrapping to 283.03.",
"distinguishingAssertion": "The proc immediately following an 848.03 proc (outside a burst-window boundary) is 283.03, not 848.03 — the cycle wraps.",
"inertness": "No core credit; never co-fires with phases 1/2.",
"evidenceTier": "DATAMINED",
"loadBearing": true
},
{
"slot": "skill2",
"kitLine": "Activates when entering Full Burst. self",
"disposition": "FAITHFUL",
"scope": "Both skill2 effects, self only.",
"durationSemantics": "Trigger header — fires once per Full Burst entry, every rotation.",
"triggerIdentity": "fullBurstEnter (ANY team Full Burst) — explicitly NOT burstCast; the prose says 'when entering Full Burst', so it fires even on rotations where a different B3 (helm in controlComp) completes the chain.",
"targetSet": "self",
"nearestWrongModel": "burstCast keying — skill2 would silently skip every rotation helm bursts instead of her, under-crediting her FB-window shot economy.",
"distinguishingAssertion": "count of buffApply{stat:'maxAmmoPct', value:60, targetSlug:'scarlet-black-shadow'} === count of fullBurstStart events, including in a comp/rotation state where helm casts the stage-3 burst.",
"inertness": "Never applies to allies (no buffApply with a non-self targetIdx).",
"evidenceTier": "DATAMINED",
"loadBearing": true
},
{
"slot": "skill2",
"kitLine": "Max Ammunition Capacity ▲ 60% for 10 sec",
"disposition": "FAITHFUL",
"scope": "Weapon-state modifier — this IS damage (taxonomy 6): +60% magazine for the FB window changes shots fired and reload count.",
"durationSemantics": "durationSec 10 — genuine wall-clock seconds (no 'round(s)' wording).",
"triggerIdentity": "fullBurstEnter, self.",
"targetSet": "self",
"nearestWrongModel": "Dropped as 'defensive/QoL no-damage', or encoded as maxAmmoFlat 60, or given durationShots.",
"distinguishingAssertion": "buffApply{stat:'maxAmmoPct', value:60} at each fullBurstStart with a 10s expiresFrame; during the window her effective magazine is maxAmmo(9×1.6)≈14 (engine rounding), reverting to 9 after expiry; her FB-window shot count strictly exceeds the count with this buff nulled via withPatchedOverride.",
"inertness": "No effect on any other unit's ammo; no effect outside the 10s window.",
"evidenceTier": "DATAMINED",
"loadBearing": true
},
{
"slot": "skill2",
"kitLine": "Reload 100% of the magazine(s)",
"disposition": "FAITHFUL",
"scope": "instantReload fraction 1 at FB entry — ORDERED AFTER the maxAmmoPct effect so the refill fills the ENLARGED magazine (~14), not base 9. Skips the 152-frame (~2.53s) reload she'd otherwise pay — pure shot-economy gain.",
"durationSemantics": "Instant, once per FB entry.",
"triggerIdentity": "fullBurstEnter, self (same block or ordered after the ammo buff).",
"targetSet": "self",
"nearestWrongModel": "Reload resolved BEFORE the capacity buff (refills to 9, then capacity grows with the magazine part-empty), or misread as a reloadSpeedPct buff.",
"distinguishingAssertion": "The reload event at fullBurstStart sets her ammo to the buffed max (≈14), not 9; no reloadSpeedPct buffApply exists for this line.",
"inertness": "Emits no heal/recovery event; does not touch allies' magazines.",
"evidenceTier": "DATAMINED",
"loadBearing": true
},
{
"slot": "burst",
"kitLine": "Changes Full Charge attack count … 1/2/3 for 10 sec",
"disposition": "FAITHFUL",
"scope": "Rewrites Skill 1's per-phase attack-count array from [3,3,3] to [1,2,3]-cumulative (i.e. per-phase increments 1/1/1) for the 10s window — her core burst-loop acceleration, ~3× S1 proc cadence in-window.",
"durationSemantics": "durationSec 10, then thresholds revert to 3/6/9. ⚑ whether the phase counter's partial progress resets or carries at window open/close is kit-silent — flag the convention chosen, don't assert it silently.",
"triggerIdentity": "burstCast (her OWN burst block: '■ Affects self' with no activation clause = fires when SHE casts), NOT fullBurstEnter.",
"targetSet": "self",
"nearestWrongModel": "Leaving S1 cadence unchanged during burst (line silently unmodeled), or keying the threshold change to fullBurstEnter so helm's burst also accelerates her S1.",
"distinguishingAssertion": "Within 10s after HER burstCast, the first S1 proc lands after exactly 1 full charge and the 283.03→565→848.03 cycle completes within ~3 charges; on a rotation where helm bursts instead, S1 keeps the 3/6/9 cadence (RED if fullBurstEnter-keyed or if cadence is unchanged in-window).",
"inertness": "Zero effect on rotations she does not burst; no effect after the 10s window lapses.",
"evidenceTier": "DATAMINED",
"loadBearing": true
},
{
"slot": "burst",
"kitLine": "ATK ▲ 115.12% for 10 sec",
"disposition": "FAITHFUL",
"scope": "Generic self ATK buff (atkPct — scales her own ATK), feeds normals, charge damage, and all S1 proc atkPct scaling.",
"durationSemantics": "durationSec 10.",
"triggerIdentity": "burstCast, self — same trap as above: her own burst block, not any-team-FB.",
"targetSet": "self",
"nearestWrongModel": "fullBurstEnter keying — over-credits every rotation in the controlComp because helm is a co-B3 who can complete chains she didn't cast.",
"distinguishingAssertion": "buffApply{stat:'atkPct', value:115.12} count === her burstCast event count (casterIdx = her slot), and NO such apply on a rotation where helm casts the stage-3 burst.",
"inertness": "No ally receives it; no apply on non-her-burst FBs.",
"evidenceTier": "DATAMINED",
"loadBearing": true
},
{
"slot": "burst",
"kitLine": "Charge Damage ▲ 169.63% for 10 sec",
"disposition": "FAITHFUL",
"scope": "Additive percentage points in the CHARGE bucket (chargeDamagePct) on her own full-charge shots. Does NOT scale S1's flatDamage procs (those are skill damage, not charge-bucket).",
"durationSemantics": "durationSec 10.",
"triggerIdentity": "burstCast, self.",
"targetSet": "self",
"nearestWrongModel": "Encoding as chargeDamageMultPct (multiplier on BASE charge damage — a different, stronger primitive reserved for 'Charge Damage Multiplier' wording), or as generic attackDamagePct, or fullBurstEnter-keyed.",
"distinguishingAssertion": "buffApply carries stat 'chargeDamagePct' value 169.63 (not 'chargeDamageMultPct'), only on her burstCast; during the window her normal charge shots' damage rises via the charge bucket while S1 proc mults (283.03/565/848.03 of ATK) change only through the ATK line, not this one.",
"inertness": "Must not lift the S1 procs' own multipliers; no ally effect.",
"evidenceTier": "DATAMINED",
"loadBearing": true
}
],
"loadBearingSet": [
"skill1:phase-trigger (full-charge counter, cycling 3/6/9)",
"skill1:283.03% phase-1 hit",
"skill1:565% phase-2 distributed hit",
"skill1:848.03% phase-3 distributed hit",
"skill2:maxAmmoPct 60 for 10s (fullBurstEnter)",
"skill2:instantReload 100% ordered after the ammo buff",
"burst:S1 threshold change 1/2/3 for 10s (burstCast)",
"burst:atkPct 115.12 for 10s (burstCast)",
"burst:chargeDamagePct 169.63 for 10s (burstCast)"
],
"unmodeledVerbatim": {
"skill1": [],
"skill2": [],
"burst": []
},
"notes": "Expected shared-prior misreads, in priority order: (1) BURST-CAST vs FULL-BURST-ENTER split across her kit — skill2 is genuinely 'entering Full Burst' (any team FB) while ALL THREE burst lines are burst-cast-only; the controlComp fixture includes helm as a co-B3, so this divergence is exercisable and the tests MUST use a rotation/comp state where helm completes a chain to make the wrong keying go RED — a comp where she is the sole caster cannot distinguish them. (2) Distributed Damage ÷N — solo partless boss means the full 565/848.03 lands; any division is wrong. (3) Skill2 effect ORDER — reload must resolve against the already-buffed ~14-round magazine; assert the post-FB-entry ammo value, not just that both effects exist. (4) chargeDamagePct vs chargeDamageMultPct — '▲' wording is the additive bucket. (5) Phase-counter shape — cycling with per-phase array (and the burst line rewriting that array) is the only encoding that expresses both base 3/6/9 and in-burst 1/2/3; everyN or hitCount cannot. ⚑ items: full-charge cadence tuple (chargeFrames 18 is a datamine-unreliable field — cadence is ALWAYS-⚑); the counter reset-vs-carry convention at burst-window boundaries; maxAmmo rounding of 9×1.6. Nothing in the kit is UNMODELED-by-necessity: every line maps to existing schema primitives, so a driver 'unmodeled' entry on any of these lines should be challenged. All magnitudes are kit-literal DATAMINED; no CALIBRATED values are needed. No leak detected: the redacted methodology's examples name other units only.",
"model": "claude-fable-5",
"leakHandling": "FIRST s2b dispatch was contaminated: types-redacted.ts retained src/skills/types.ts:73 (chargeCounter comment naming Scarlet: Black Shadow + thresholds [3,6,9]/[1,2,3] + 848% rarity). Driver-supplied tokens lacked those, so the build-time leak check missed it. FIXED by re-running prepare-cross-family-packet.ts with comma-free tokens (Black Shadow / 848 / barely materialise) that strip the SBS-naming comment lines while keeping generic chargeCounter primitive vocabulary; s2b RE-DISPATCHED clean (this result, leakDetected:null). The contaminated first result is superseded and NOT used. s5/s6 packets regenerated from the same clean types-redacted.ts.",
"driverReconciliation": {
"driver": "Qwen",
"reviewer": "claude-fable-5",
"agreement": "STRONG — all 11 load-bearing lines concur FAITHFUL. The clean (uncontaminated) reviewer independently derived: (a) the cycling phase semantics 283.03->565->848.03->wrap; (b) the CUMULATIVE base cadence 3/6/9 with in-burst 1/1/1 (\"cycle completes within ~3 charges\") = the shipped SCALAR count=3/countInFb=1 model (the contaminated first review had pushed per-phase gaps; the clean review matches shipped); (c) the fullBurstEnter(S2)-vs-burstCast(burst lines) split, exercisable via co-B3 helm; (d) chargeDamagePct additive vs chargeDamageMultPct; (e) Distributed Damage lands full value on the solo partless boss (no /N).",
"adoptedFromReviewer": "B7 strengthened from structural-only to structural+behavioural: the S2 reload (ordered after the +60% cap) fills the BOOSTED magazine — pinned as realized peak magazine (17) > no-effects baseline (12) and FB-window shot count > no-ammo-effects counterfactual. OL base5 flat +3 explains 12->17 (round(9*1.6)+3).",
"measurementGatedKnot": "AGREED open item (driver + reviewer): the EXACT per-phase threshold cadence — shipped scalar (count 3 cumulative outside / countInFb 1 = every charge in-burst) vs the kit-literal per-phase 3/6/9 outside & 1/2/3 in-burst. Per-phase [1,2,3]/[3,6,9] was tested and overshoots cold (~0.78 vs ~1.13/1.18 baseline); own-probe evidence split (sbs-control: procs ~every charge in burst; N3 re-read: 848% phase absent from one window). The test pins the FAITHFUL STRUCTURE that holds under BOTH readings (cycling values, full-charge gating, one-at-a-time, own-cast clustering) and flags the exact count for an isolated-burst SBS recording. NOT re-fudged.",
"kitSilentConventions": "Documented, not asserted: (1) the phase counter CARRIES its partial progress across the burst-window boundary (engine persists phase in hitCounters; kit text is silent on reset-vs-carry). (2) chargeFrames=18 RL charge cadence is an ALWAYS-flag field (datamine-unreliable) — video-settled 2026-07-15 per override note (overcharge-to-150% firing vindicates the 18f charge + 22f recovery = 40f cycle).",
"verdict": "GO — test is faithful and discriminating; clean cross-family review converged on every load-bearing line and independently corroborated the shipped scalar cadence reading."
}
}

--- SECTION 5: S5 BLIND TEST (claude-opus-5) — full source; green/red count vs driver override is in the UPFRONT FACTS ---
/**

- scarlet-black-shadow — Scarlet: Black Shadow (RL / Wind / Attacker / Burst III, cd 40s,
- ammo 9, reload 152f, charge 18f, 1 hit/shot, normal 57.29%, core 200%).
-
- BLIND spec: written from the kit prose ALONE (no sight of the committed override, the driver's
- tests, or any truth file). Each group states the kit line, then an assertion that is GREEN under
- the literal reading and RED under the nearest-wrong model.
-
- KIT (structure, not prose):
- skill1 "Activates when performing a Full Charge attack." — effects vary with the number of
-           attacks, ONLY ONE fires at a time:
-             3 times -> 1 enemy with lowest final DEF, 283.03% of final ATK
-             6 times -> enemies within range, 565% Distributed Damage
-             9 times -> all enemies, 848.03% Distributed Damage
- skill2 "Activates when entering Full Burst. Affects self." — Max Ammunition +60% for 10 sec,
-           Reload 100% of the magazine.
- burst Affects self — changes the Full Charge count required for skill1 to 1/2/3 for 10 sec,
-           ATK +115.12% for 10 sec, Charge Damage +169.63% for 10 sec.
-
- FIXTURE: controlComp(SLUG, true) = liter(B1) + crown(B2) + scarlet-black-shadow(B3) + helm(B3).
- helm=true is LOAD-BEARING, not cosmetic. It is the only way to separate the two trigger
- identities this kit puts side by side: skill2 is "when entering Full Burst" (fires on EVERY
- team Full Burst) while the burst slot is a self-buff on HER OWN cast. With a 40s cooldown and
- helm covering the intervening rotations, the counts diverge, so
- #fullBurstStart == #maxAmmo-applies AND #burst-self-buff-applies < #fullBurstStart
- is itself the discriminating assertion (no patch needed): keying skill2 to burst-cast, or the
- burst buffs to full-burst-enter, breaks one of the two.
-
- SHAPE NOTE: the two OverrideFile descriptions in the harness packet disagree (slot -> Block[]
- vs slot -> CharacterSkills{blocks}). blocksOf() accepts BOTH and mutates in place, so every
- counterfactual is shape-agnostic and keys only on documented effect kinds / StatKeys. No trigger
- kind is ever named here: the schema's full-charge trigger identifier is redacted in this packet,
- so every trigger claim below is tested BEHAVIOURALLY.
-
- RUNS: 10 (BASE + 9 counterfactuals), all hoisted to module scope.
  */
  import { describe, expect, it } from 'vitest';
  import type { SimEvent } from '../../../src/types.js';
  import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
  } from '../lib/harness.js';

const SLUG = 'scarlet-black-shadow';
const TEAM = ['liter', 'crown', 'helm'];

// kit magnitudes — ground truth, read literally off the prose
const T3 = 283.03;
const T6 = 565;
const T9 = 848.03;
const BURST_ATK = 115.12;
const BURST_CHARGE = 169.63;
const AMMO_PCT = 60;

type Ev = SimEvent & Record<string, any>;
type Slot = 'skill1' | 'skill2' | 'burst';
const SLOTS: Slot[] = ['skill1', 'skill2', 'burst'];

// ---------------------------------------------------------------- override walkers (shape-agnostic)
const blocksOf = (ov: any, slot: Slot): any[] => {
const s = ov?.[slot];
if (!s) return [];
if (Array.isArray(s)) return s;
return Array.isArray(s.blocks) ? s.blocks : [];
};

const walk = (effects: any[], out: any[]): any[] => {
for (const e of effects ?? []) {
out.push(e);
if (e?.kind === 'escalating' && Array.isArray(e.steps)) walk(e.steps, out);
}
return out;
};

const effectsOf = (ov: any, slot: Slot | 'all'): any[] => {
const slots = slot === 'all' ? SLOTS : [slot];
const out: any[] = [];
for (const s of slots) for (const b of blocksOf(ov, s)) walk(b.effects ?? [], out);
return out;
};

const chargePayloads = (ov: any): any[] =>
effectsOf(ov, 'skill1').filter((e) => e.kind === 'flatDamage');

// ---------------------------------------------------------------- runner
interface Run {
total: number;
events: Ev[];
res: any;
}

function run(mutate?: (ov: any) => void): Run {
const events: Ev[] = [];
const opts: any = controlComp(SLUG, true);
opts.cfg = { ...(opts.cfg ?? {}), onEvent: (ev: SimEvent) => { events.push(ev as Ev); } };
if (mutate) {
opts.overrides = { ...(opts.overrides ?? {}), [SLUG]: withPatchedOverride(SLUG, mutate) };
}
const res = runComp(opts);
return { total: totals(res)[SLUG], events, res };
}

// ---------------------------------------------------------------- mutators
const zeroRank = (rank: number) => (ov: any) => {
const sorted = chargePayloads(ov).slice().sort((a, b) => (a.atkPct ?? 0) - (b.atkPct ?? 0));
if (sorted[rank]) sorted[rank].atkPct = 0;
};
const zeroAllPayloads = (ov: any) => { for (const e of chargePayloads(ov)) e.atkPct = 0; };
const setBuffValue = (stat: string, value: number) => (ov: any) => {
for (const e of effectsOf(ov, 'all')) if (e.kind === 'buff' && e.stat === stat) e.value = value;
};
const restatBuff = (from: string, to: string) => (ov: any) => {
for (const e of effectsOf(ov, 'all')) if (e.kind === 'buff' && e.stat === from) e.stat = to;
};
const dropKind = (kind: string) => (ov: any) => {
for (const s of SLOTS) {
for (const b of blocksOf(ov, s)) b.effects = (b.effects ?? []).filter((e: any) => e.kind !== kind);
}
};

// ---------------------------------------------------------------- event readers
const applies = (r: Run, stat: string, value: number): Ev[] =>
r.events.filter(
(e) =>
e.kind === 'buffApply' &&
e.stat === stat &&
e.targetSlug === SLUG &&
Math.abs((e.value ?? 0) - value) < 0.005,
);

const fbStarts = (r: Run): number => r.events.filter((e) => e.kind === 'fullBurstStart').length;

/** scarlet's own damage events: prefer the per-unit result row, fall back to the global log. */
const myDamage = (r: Run): any[] => {
const row: any = unitOf(r.res, SLUG);
const rowEv: any[] = Array.isArray(row?.events) ? row.events : [];
const fromRow = rowEv.filter((e) => e?.kind === 'damage');
if (fromRow.length) return fromRow;
const keys = ['slug', 'unit', 'unitSlug', 'srcSlug', 'casterSlug', 'sourceSlug'];
return r.events.filter((e) => e.kind === 'damage' && keys.some((k) => (e as any)[k] === SLUG));
};

// ---------------------------------------------------------------- hoisted runs (10 x 180s sims)
const OV: any = withPatchedOverride(SLUG, () => {}); // read-only clone of the committed override

const BASE = run();
const NO_PAYLOADS = run(zeroAllPayloads);
const ZERO_T3 = run(zeroRank(0));
const ZERO_T6 = run(zeroRank(1));
const ZERO_T9 = run(zeroRank(2));
const NO_BURST_ATK = run(setBuffValue('atkPct', 0));
const NO_BURST_CHARGE = run(setBuffValue('chargeDamagePct', 0));
const CHARGE_AS_ATTACK = run(restatBuff('chargeDamagePct', 'attackDamagePct'));
const NO_AMMO = run(setBuffValue('maxAmmoPct', 0));
const NO_INSTANT_RELOAD = run(dropKind('instantReload'));

// =====================================================================================
describe('scarlet-black-shadow / fixture sanity', () => {
it('the control comp actually bursts and she actually deals damage', () => {
// Non-vacuity for every group below: a lone B3 makes ZERO full bursts, which would make the
// full-burst-keyed skill2 and the burst slot silently untested.
expect(BASE.total).toBeGreaterThan(0);
expect(fbStarts(BASE)).toBeGreaterThanOrEqual(4);
});
});

// =====================================================================================
describe('scarlet-black-shadow / skill1 — Full Charge phase ladder (structure)', () => {
it('encodes exactly three full-charge payloads, at the three kit magnitudes', () => {
// "Only one effect is triggered at a time" + three named tiers => three payloads, one per phase.
// RED under: a merged single payload, a 2-tier reading, or Distributed Damage silently divided
// by an enemy count (565 -> 282.5 would collide with the 3-times tier).
const tiers = chargePayloads(OV).map((e) => e.atkPct).sort((a, b) => a - b);
expect(tiers).toHaveLength(3);
expect(tiers[0]).toBeCloseTo(T3, 2);
expect(tiers[1]).toBeCloseTo(T6, 2);
expect(tiers[2]).toBeCloseTo(T9, 2);
});

it('no payload claims a core strike and none is authored as a DoT', () => {
// Taxonomy 9: a rider gets NO core unless the text says "core strike damage"; this kit does not.
// RED under core:true (which would multiply by the 200% core multiplier) or a dot encoding.
const eff = chargePayloads(OV);
expect(eff.length).toBe(3);
for (const e of eff) expect(e.core ?? false).toBe(false);
expect(effectsOf(OV, 'skill1').some((e) => e.kind === 'dot')).toBe(false);
});
});

describe('scarlet-black-shadow / skill1 — every tier is live, and the ladder is ordered', () => {
it('skill1 carries a material share of her damage', () => {
// RED under: payloads authored but never triggered (a threshold she can never reach), which is
// the classic silent-vacuity failure for a phase-counter kit.
expect(NO_PAYLOADS.total).toBeLessThan(BASE.total * 0.97);
});

it('all three phases are actually reached at least once', () => {
// Zeroing each tier in isolation must cost damage. RED under a 9-times phase that is never
// reached (e.g. a counter that resets on reload, or per-phase thresholds read as 9/18/27).
expect(BASE.total - ZERO_T3.total).toBeGreaterThan(0);
expect(BASE.total - ZERO_T6.total).toBeGreaterThan(0);
expect(BASE.total - ZERO_T9.total).toBeGreaterThan(0);
});

it('the tiers fire equally often, so their damage shares track 283 : 565 : 848', () => {
// Each tier fires once per 9-charge cycle, so the per-tier contribution ratio must mirror the
// magnitude ratio (~1 : 2 : 3). RED under a uniform-payload model (all three the same value)
// and under a mis-ordered ladder (the big payload wired to the 3-times phase).
const d3 = BASE.total - ZERO_T3.total;
const d6 = BASE.total - ZERO_T6.total;
const d9 = BASE.total - ZERO_T9.total;
expect(d6).toBeGreaterThan(d3 * 1.3);
expect(d9).toBeGreaterThan(d3 * 2);
expect(d9).toBeGreaterThan(d6);
});
});

describe('scarlet-black-shadow / skill1 — trigger identity is charge-counted, not per-shot', () => {
const dmg = myDamage(BASE);
const riders = dmg.filter((e) => e.srcSlot === 'skill1');
const shots = dmg.filter((e) => e.srcSlot !== 'skill1');

it('her damage log resolves into shots and skill1 riders', () => {
expect(dmg.length).toBeGreaterThan(0);
expect(riders.length).toBeGreaterThan(0);
expect(shots.length).toBeGreaterThan(0);
});

it('roughly one rider per three full charges — not one per charge, not three per cycle', () => {
// 3 riders per 9-charge cycle = 0.33 riders/charge outside burst, lifted only inside her own
// burst window. RED under "all three effects fire together" (1.0) and under a shotFired /
// every-3-hits-fires-everything reading (~1.0-3.0).
const perCharge = riders.length / shots.length;
expect(perCharge).toBeGreaterThan(0.15);
expect(perCharge).toBeLessThan(0.8);
});
});

// =====================================================================================
describe('scarlet-black-shadow / burst — required charge count drops to 1/2/3 for 10 sec', () => {
// No EffectDef in the schema expresses "changes the required attack count", so this line can only
// live inside the (redacted) full-charge trigger — a blind counterfactual cannot switch it off.
// It IS observable, though: with thresholds 1/2/3 the cycle shortens from 9 charges to 3, so the
// riders-per-charge rate must be materially HIGHER inside Full Burst than outside it. The lift is
// diluted (helm's Full Bursts carry no reduction), hence the deliberately loose 1.15x bar.
// A RED here is the payload: it means the reduction is unmodeled and skill1 under-fires in burst.
const dmg = myDamage(BASE);
const riders = dmg.filter((e) => e.srcSlot === 'skill1');
const shots = dmg.filter((e) => e.srcSlot !== 'skill1');
const inFb = (a: any[]) => a.filter((e) => e.inFullBurst).length;

it('the fixture exercises BOTH the reduced and the unreduced case', () => {
// Non-vacuity for a gated line: riders and charges must exist on both sides of the FB boundary.
expect(inFb(riders)).toBeGreaterThan(0);
expect(riders.length - inFb(riders)).toBeGreaterThan(0);
expect(inFb(shots)).toBeGreaterThan(0);
expect(shots.length - inFb(shots)).toBeGreaterThan(0);
});

it('riders per charge is higher inside Full Burst than outside it', () => {
const rIn = inFb(riders);
const rOut = riders.length - rIn;
const sIn = inFb(shots);
const sOut = shots.length - sIn;
expect(rIn / sIn).toBeGreaterThan((rOut / sOut) * 1.15);
});

it.skip('strict: the 1/2/3 thresholds themselves (needs the full-charge trigger identifier, redacted in this packet)', () => {});
});

describe('scarlet-black-shadow / burst — self ATK +115.12% and Charge Damage +169.63% for 10 sec', () => {
const atk = applies(BASE, 'atkPct', BURST_ATK);
const chg = applies(BASE, 'chargeDamagePct', BURST_CHARGE);

it('both buffs land on herself, at the kit magnitudes, on the same activations', () => {
expect(atk.length).toBeGreaterThanOrEqual(3);
expect(chg.length).toBe(atk.length);
for (const e of [...atk, ...chg]) expect(e.targetSlug).toBe(SLUG);
});

it('they are 10-second windows, not round-counted and not permanent', () => {
// Taxonomy 2: "for 10 sec" is wall-clock. RED under durationShots (round-count) encoding and
// under a permanent buff (no expiry frame).
for (const e of [...atk, ...chg]) {
expect(e.durationShots).toBeUndefined();
expect(Number.isFinite(e.expiresFrame)).toBe(true);
}
});

it('they fire on HER OWN burst only — strictly fewer times than the team full-bursts', () => {
// Taxonomy 3: a self buff in her own burst block is burst-cast scoped. Her cd is 40s and helm is
// the co-B3, so full bursts outnumber her casts. RED under a full-burst-enter keying (counts
// would be equal), which is exactly the over-crediting failure mode for a multi-B3 comp.
expect(atk.length).toBeLessThan(fbStarts(BASE));
});

it('the ATK buff moves her damage and NOTHING on her teammates', () => {
// "Affects self" — inertness. Magnitude-only patch, so shot counts / rotation are untouched and
// teammate totals must be byte-identical. RED under an allies-scoped ATK buff.
expect(NO_BURST_ATK.total).toBeLessThan(BASE.total);
for (const slug of TEAM) {
expect(totals(NO_BURST_ATK.res)[slug]).toBe(totals(BASE.res)[slug]);
}
});

it('Charge Damage is charge-bucket scoped, not a generic Damage-Up buff', () => {
// Taxonomy 1 / bucket scope: chargeDamagePct is additive in the charge bucket and cannot touch
// her flat skill1 riders, while attackDamagePct would (and dilutes differently against helm's
// and liter's Damage-Up buffs). RED under a generic attackDamagePct mis-encoding.
expect(NO_BURST_CHARGE.total).toBeLessThan(BASE.total);
expect(CHARGE_AS_ATTACK.total).not.toBe(BASE.total);
});
});

// =====================================================================================
describe('scarlet-black-shadow / skill2 — entering Full Burst: Max Ammo +60% for 10 sec, full reload', () => {
const ammo = applies(BASE, 'maxAmmoPct', AMMO_PCT);

it('fires on EVERY team Full Burst, not only on her own rotations', () => {
// Taxonomy 3, the sharpest discriminator this kit offers: "when entering Full Burst" must match
// the full-burst count exactly, and must therefore exceed her own burst-cast count (asserted
// above). RED under a burst-cast keying, which would under-fire on helm's rotations.
expect(ammo.length).toBe(fbStarts(BASE));
expect(ammo.length).toBeGreaterThan(applies(BASE, 'atkPct', BURST_ATK).length);
});

it('is a percentage capacity buff on herself for a 10-second window', () => {
// RED under maxAmmoFlat (60 rounds on a 9-round magazine) and under a round-counted duration.
expect(ammo.length).toBeGreaterThan(0);
for (const e of ammo) {
expect(e.stat).toBe('maxAmmoPct');
expect(e.targetSlug).toBe(SLUG);
expect(e.durationShots).toBeUndefined();
expect(Number.isFinite(e.expiresFrame)).toBe(true);
}
expect(applies(BASE, 'maxAmmoFlat', AMMO_PCT).length).toBe(0);
});

it('the capacity buff is DAMAGE — zeroing it costs her damage', () => {
// Taxonomy 6: ammo capacity gates shots fired on a 9-round / 152-frame-reload RL, so a
// "defensive, skip it" reading is wrong. RED under an unmodelled / ignored ammo line.
expect(NO_AMMO.total).toBeLessThan(BASE.total);
});

it('"Reload 100% of the magazine" is modelled and is worth damage on its own', () => {
// A free full magazine at every FB entry buys shots inside the +50% window; over ~8 entries she
// is essentially never already full. RED if the reload line was dropped as cosmetic.
expect(effectsOf(OV, 'all').some((e) => e.kind === 'instantReload')).toBe(true);
expect(NO_INSTANT_RELOAD.total).toBeLessThan(BASE.total);
});
});

// =====================================================================================
describe('scarlet-black-shadow / inertness — nothing in this kit touches an ally', () => {
it('none of her three self-buff magnitudes ever lands on a teammate', () => {
// Every buff line in the kit says "Affects self". RED under any allies-scoped mis-encoding.
const signature = (e: Ev) =>
(e.stat === 'atkPct' && Math.abs((e.value ?? 0) - BURST_ATK) < 0.005) ||
(e.stat === 'chargeDamagePct' && Math.abs((e.value ?? 0) - BURST_CHARGE) < 0.005) ||
(e.stat === 'maxAmmoPct' && Math.abs((e.value ?? 0) - AMMO_PCT) < 0.005);
for (const slug of TEAM) {
expect(
BASE.events.filter((e) => e.kind === 'buffApply' && e.targetSlug === slug && signature(e)).length,
).toBe(0);
}
});

it('the kit inflicts no boss debuff and grants no gauge / heal / shield / swap', () => {
// The prose has no Damage Taken, no heal, no shield, no gauge fill and no weapon change; an
// override carrying any of those invented a mechanic.
const kinds = new Set(effectsOf(OV, 'all').map((e) => e.kind));
for (const forbidden of ['heal', 'shield', 'fillGauge', 'weaponSwap', 'targetStatus', 'stun', 'gainPierce']) {
expect(kinds.has(forbidden)).toBe(false);
}
expect(effectsOf(OV, 'all').some((e) => e.kind === 'buff' && e.stat === 'damageTakenPct')).toBe(false);
});
});

// =====================================================================================
describe('scarlet-black-shadow / GAPs (unobservable in the v1 single-boss fixture)', () => {
it.skip('Distributed Damage actually splits across multiple enemies (v1 has one boss; no multi-enemy fixture exists)', () => {});
it.skip('"1 enemy with the lowest final DEF" vs "enemies within range" vs "all enemies" are distinguishable (all three collapse to the single partless scope-lock boss)', () => {});
it.skip('Max Ammo +60% rounding on a 9-round magazine (9 x 1.6 = 14.4 -> 14?): the engine exposes no magazine-size event, only shot-count sensitivity', () => {});
});

--- SECTION 6: S6 BLIND OVERRIDE (claude-opus-5) — full JSON; diff vs driver override is in the UPFRONT FACTS ---
{
"slug": "scarlet-black-shadow",
"skill1": [
{
"slot": "skill1",
"trigger": {
"kind": "fullChargeCount",
"count": [
3,
6,
9
]
},
"target": {
"kind": "enemy"
},
"fbGate": "outFb",
"effects": [
{
"kind": "flatDamage",
"atkPct": 283.03,
"crit": true
},
{
"kind": "flatDamage",
"atkPct": 565,
"crit": true
},
{
"kind": "flatDamage",
"atkPct": 848.03,
"crit": true
}
]
},
{
"slot": "skill1",
"trigger": {
"kind": "fullChargeCount",
"count": [
3,
6,
9
]
},
"target": {
"kind": "enemy"
},
"fbGate": "inFb",
"ownBurstGate": "notCast",
"effects": [
{
"kind": "flatDamage",
"atkPct": 283.03,
"crit": true
},
{
"kind": "flatDamage",
"atkPct": 565,
"crit": true
},
{
"kind": "flatDamage",
"atkPct": 848.03,
"crit": true
}
]
},
{
"slot": "skill1",
"trigger": {
"kind": "fullChargeCount",
"count": [
1,
2,
3
]
},
"target": {
"kind": "enemy"
},
"fbGate": "inFb",
"ownBurstGate": "cast",
"effects": [
{
"kind": "flatDamage",
"atkPct": 283.03,
"crit": true
},
{
"kind": "flatDamage",
"atkPct": 565,
"crit": true
},
{
"kind": "flatDamage",
"atkPct": 848.03,
"crit": true
}
]
}
],
"skill2": [
{
"slot": "skill2",
"trigger": {
"kind": "fullBurstEnter"
},
"target": {
"kind": "self"
},
"effects": [
{
"kind": "buff",
"stat": "maxAmmoPct",
"value": 60,
"durationSec": 10
},
{
"kind": "instantReload",
"fraction": 1
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
"kind": "self"
},
"effects": [
{
"kind": "buff",
"stat": "atkPct",
"value": 115.12,
"durationSec": 10
},
{
"kind": "buff",
"stat": "chargeDamagePct",
"value": 169.63,
"durationSec": 10
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
"⚑ TRIGGER IDENTIFIER UNVERIFIED: the full-charge phase-counter trigger's union member was REDACTED from the packet's types.ts copy (only its comment survived). Authored as {kind:'fullChargeCount', count:[3,6,9]}; the real identifier and field name/arity MUST be read from src/skills/types.ts before this file will pass validate-overrides.",
"⚑ COUNT SEMANTICS: counts written as the kit PRINTS them (cumulative full-charge count per phase: 3/6/9 base, 1/2/3 under burst). If the engine's array is per-phase INCREMENTS instead, base becomes [3,3,3] and the burst variant [1,1,1].",
"⚑ BURST COUNT-CHANGE ENCODING: no EffectDef can mutate the required charge count, so the burst line is modeled STRUCTURALLY as a third skill1 block (fbGate inFb + ownBurstGate cast) carrying the reduced counts, with the base counts split across outFb and inFb+notCast blocks. Consequence: the ONE real phase counter is fragmented into THREE independent counters, and the 10 s buff window is approximated by the Full Burst window.",
"⚑ PHASE CYCLE: kit is silent on what happens after the 9-charge phase. Assumed the phase counter WRAPS (next 3 charges re-fire phase 1). If it instead latches at phase 3, every post-wrap 283.03%/565% hit here is an over-credit.",
"⚑ DISTRIBUTED DAMAGE: 565% / 848.03% are 'Distributed Damage' lines; against the single partless scope-lock boss they are modeled at FULL magnitude with no split. Correct if distribution divides among enemies hit; an over-credit if the game applies a per-target fraction even at n=1.",
"⚑ CRIT ELIGIBILITY: all three riders set crit:true per the rider prior (riders crit at the caster's sheet rate). Distributed-damage crit behaviour is UNMEASURED — read popup colours before trusting it.",
"core:false on the 283.03% hit — the text says 'as damage', not 'core strike damage' (no core bucket for riders absent that wording).",
"noFb deliberately UNSET on all three riders: full-charge riders take Full Burst by TIMING (default ON). Only a measurement may turn it off.",
"noRange not set — the engine force-sets no-range on riders (engine-automatic, per methodology)."
],
"note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Blind second read of the kit prose only (no board access, no driver artifacts). RL/Wind/Attacker/B3, ammo 9, chargeFrames 18, reloadFrames 152. Damage lives entirely in skill1's full-charge phase cycle (283.03% single-target → 565% distributed → 848.03% distributed); the burst contributes no damage of its own but triples phase throughput (charge count 3/6/9 → 1/2/3) on top of ATK ▲115.12% and Charge Damage ▲169.63% for 10 s, and skill2's Max Ammo ▲60% + full reload at Full Burst entry is a DAMAGE line (it buys extra full charges, i.e. extra phases). The burst's count-change is encoded structurally as an fbGate/ownBurstGate block split because no EffectDef can mutate a trigger threshold — see caveats for the counter-fragmentation cost. Full-charge cadence (chargeFrames/reloadFrames/ammo) is the single most load-bearing unmeasured input: it sets how many phases fire per fight, so a cadence error scales total damage almost linearly."
}

--- SECTION 7: DRIVER IMPLEMENTATION ---

### scripts/tests/units/scarlet-black-shadow.test.ts (driver test, 19 tests GREEN)

// PER-UNIT KIT SPEC — `scarlet-black-shadow` (Scarlet: Black Shadow, "sbs"; Attacker/RL/Wind,
// Burst III, cd 40s, ammo 9, chargeFrames 18, chargeMultiplier 150). Kit-autonomy gauntlet
// 2026-07-25. This is the RL/Wind OVERSPEC variant — an entirely different unit from the
// AR/Electric base (slug `scarlet`); never conflate them (P0).
//
// One assertion group per KIT LINE (B1..B10 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters['scarlet-black-shadow'].skills):
// S1 ■ on Full Charge; effect varies by attack count, "only one effect triggered at a time":
// 3x → 1 lowest-final-DEF enemy: 283.03% final ATK as damage [B1,B2,B3,B4]
// 6x → enemies within range: 565% final ATK as Distributed Damage [B2,B3,B4]
// 9x → all enemies: 848.03% final ATK as Distributed Damage [B2,B3,B4]
// S2 ■ on entering Full Burst → self: Max Ammo ▲60% for 10 sec [B5,B6]
// Reload 100% of the magazine(s) [B7]
// BU ■ on cast → self: changes Full-Charge count required for S1 to 1/2/3 for 10 sec [B10]
// ATK ▲115.12% for 10 sec [B8]
// Charge Damage ▲169.63% for 10 sec [B9]
//
// LOAD-BEARING MECHANIC (engine sim.ts:2912 `chargeCounter`): S1 is a single block with a CYCLING
// per-full-charge phase counter. Only full charges advance it; each threshold accrual fires ONE
// effect (`effects[phase]`, in order) then advances `phase = (phase+1) % 3` — so the global proc
// value sequence is a clean 283.03 → 565 → 848.03 → 283.03 … loop, one proc per firing frame.
// Threshold = `count` (3) charges/phase outside Full Burst, `countInFb` (1) inside; the lowered
// in-burst threshold is gated on HER OWN `lastBurstCastFrame` (sim.ts:2921), NOT the team FB window.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
// B1 procs land ONLY on charged-shot frames — an every-shot or hitCount trigger would proc on
// non-charged pulls too.
// B2 the value sequence is the exact 3-phase cycle with NO two procs on one frame — pins "only
// one effect triggered at a time". A "phases stack" mis-model would emit a single summed
// 1696.06% instance (or 3 same-frame instances); a wrong-order model breaks the cycle.
// B3 the values are the POST-PATCH 283.03/565/848.03, not the pre-patch 250.47/500/750.47 the
// note records (the nearest-wrong counterfactual).
// B4 565 & 848.03 carry `flavor:"distributed"`, 283.03 is plain — pinned structurally on the
// encoding AND shown inert in the partless-boss scope (no distributedDamagePct source, no
// dmgTaken on a partless boss → the flavor moves nothing here; helm-H4-style totals equality).
// B5 S2 fires on EVERY team Full Burst (fullBurstEnter), not on her own burstCast: the maxAmmo
// buff is applied once per fullBurstStart (12× over the fight) which is strictly MORE than her
// own 6 casts — helm opens the other 6 FBs. A burstCast trigger would apply it only 6×.
// B6 the TREASURE-less value 60, for exactly 10s (600f), self-scoped.
// B7 Reload 100% (instantReload fraction 1), ordered AFTER the +60% cap so the refill fills the
// BOOSTED magazine. The engine snaps ammo silently (sim.ts:2105 emits NO reload event), so the
// refill is pinned structurally (fraction 1) AND behaviourally: her realized peak magazine and
// her FB-window shot count both exceed the no-ammo-effects baseline (OL base5 gives a flat +3,
// so 12 unboosted → round(9×1.6)+3 = 17 boosted). A reload resolved BEFORE the cap, or omitted,
// leaves the magazine at baseline.
// B8/B9 the burst buffs apply once per OWN burstCast (6×), NOT per FB (12×) — the burstCast-vs-
// fullBurstEnter mirror of B5. Value/duration/self pinned.
// B10 the count-requirement line: procs cluster into HER OWN burst window (dense) and stay at the
// sparse baseline in FB windows she did NOT cast (helm-opened) — pins "gated on her OWN burst
// cast". A team-FB-window gate would spike the helm-opened windows too.
//
// ⚑ MEASUREMENT-GATED — the "proc-count knot" (override note + kit-status F3). The EXACT per-phase
// threshold VALUES are a documented approximation, NOT pinned to a number here:
// • in-burst: shipped scalar `countInFb:1` (a proc EVERY charge, cycling) vs the kit-literal
// per-phase 1/2/3 ("Changes Full Charge attack count required for S1 to 1 time/2 times/3
// times"). The per-phase [1,2,3]/[3,6,9] reading was tested and overshoots cold (~0.78 vs the
// ~1.13/1.18 baseline); own-probe evidence is split (sbs-control: procs ~every charge in
// burst; N3 re-read: the 848% phase ABSENT from one confirmed window).
// • out-of-burst: shipped scalar `count:3` = the CUMULATIVE 3rd/6th/9th reading; the kit only
// states the in-burst override, so the out-of-burst default is itself under-determined.
// ESTIMATE: true in-burst cadence is between scalar-1 (~15 procs/window) and per-phase 1/2/3
// (~7-8/window); shipped scalar-1 grades ~1.18 on N3 (OVER), so the truth is likely a little
// sparser than scalar-1. TIER 2 (scoped self-buff + burstCast gate + meta-defining wind carry).
// RECIPE: record an ISOLATED single-burst SBS clip (camera-focused, no entangling team damage),
// count her S1 proc popups — especially the distinct ~3.2M 848% phase — in ONE clean burst window
// at real ATK scale, and compare to the sim's every-charge rate; resolve the ATK/rotation confound
// (sim charge-normal 1.64M vs real 1.03M) before re-tuning. Do NOT re-fudge the cadence.
// This file pins the FAITHFUL structure (cycling values, full-charge gating, own-cast clustering)
// that holds under BOTH readings, and leaves the exact count to that recording.
//
// Fixture: the 720-kit-audit control comp (liter B1 / crown B2 / sbs B3 carry / helm B3, boss Fire,
// focus sbs) — sbs needs a real rotation to cast at all, and helm (a SECOND B3) opens half the Full
// Bursts, which is what makes the fullBurstEnter-vs-burstCast discriminations (B5/B8/B9/B10) live.
// Deterministic (no seed). Slot order: liter 0 / crown 1 / sbs 2 / helm 3.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
controlComp,
runComp,
totals,
withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
const SLUG = 'scarlet-black-shadow';
/** controlComp slot order: liter 0 / crown 1 / sbs 2 / helm 3. */
const SBS = 2;
const FIGHT_FRAMES = 180 * FPS;
const WINDOW = 10 * FPS;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;
type FbStart = Extract<SimEvent, { kind: 'fullBurstStart' }>;

function run(overrides: Record<string, any> = {}) {
const events: SimEvent[] = [];
const res = runComp({
...controlComp(SLUG),
overrides,
cfg: { onEvent: (e) => events.push(e) },
});
return { events, totals: totals(res) };
}

// ---- counterfactual patches -------------------------------------------------------------------
/** B3 reference: the PRE-PATCH S1 magnitudes (override note: 250.47/500/750.47 → 283.03/565/848.03). _/
const sbsPrePatch = withPatchedOverride(SLUG, (ov) => {
const fx = ov.skill1[0]?.effects;
if (!fx || fx.length !== 3)
throw new Error('sbs S1 phase effects missing — fixture is stale');
fx[0].atkPct = 250.47;
fx[1].atkPct = 500;
fx[2].atkPct = 750.47;
});
/_* B4 reference: strip the distributed flavor from the 6x/9x phases (all three plain). _/
const sbsAllPlain = withPatchedOverride(SLUG, (ov) => {
const fx = ov.skill1[0]?.effects;
if (!fx || fx[1]?.flavor !== 'distributed' || fx[2]?.flavor !== 'distributed')
throw new Error('sbs S1 distributed phases missing — fixture is stale');
delete fx[1].flavor;
delete fx[2].flavor;
});
/_* B5 counterfactual: S2 keyed off her OWN burstCast instead of Full Burst entry. _/
const sbsS2OnCast = withPatchedOverride(SLUG, (ov) => {
const b = ov.skill2.find((x: any) => x.trigger?.kind === 'fullBurstEnter');
if (!b)
throw new Error('sbs S2 fullBurstEnter block missing — fixture is stale');
b.trigger.kind = 'burstCast';
});
/_* B10 counterfactual: remove the in-burst threshold lowering (countInFb = count = 3, no cluster). _/
const sbsNoLowering = withPatchedOverride(SLUG, (ov) => {
const t = ov.skill1[0]?.trigger;
if (!t || t.kind !== 'chargeCounter')
throw new Error('sbs S1 chargeCounter missing — fixture is stale');
t.countInFb = t.count; // 3 in-burst too → no lowering → procs never cluster into the burst window
});
/_* B7 counterfactual: strip BOTH S2 ammo effects (the +60% cap AND the 100% reload). */
const sbsNoAmmoFx = withPatchedOverride(SLUG, (ov) => {
const before = ov.skill2.flatMap((b: any) => b.effects).length;
for (const b of ov.skill2)
b.effects = b.effects.filter(
(e: any) => e.stat !== 'maxAmmoPct' && e.kind !== 'instantReload',
);
if (ov.skill2.flatMap((b: any) => b.effects).length !== before - 2)
throw new Error(
'sbs S2 maxAmmoPct/instantReload effects missing — fixture is stale',
);
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const prePatch = run({ [SLUG]: sbsPrePatch });
const allPlain = run({ [SLUG]: sbsAllPlain });
const s2OnCast = run({ [SLUG]: sbsS2OnCast });
const noLowering = run({ [SLUG]: sbsNoLowering });
const noAmmoFx = run({ [SLUG]: sbsNoAmmoFx });

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const shots = (evs: SimEvent[]) =>
evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === SLUG);
const chargedFrames = (evs: SimEvent[]) =>
new Set(
shots(evs)
.filter((s) => s.charged)
.map((s) => s.frame),
);
/** sbs S1 phase procs, in frame order. _/
const s1Procs = (evs: SimEvent[]) =>
dmg(evs)
.filter((d) => d.slug === SLUG && d.srcSlot === 'skill1')
.sort((a, b) => a.frame - b.frame);
const sbsCasts = (evs: SimEvent[]) =>
evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === SLUG);
const fbStarts = (evs: SimEvent[]) =>
evs.filter((e): e is FbStart => e.kind === 'fullBurstStart');
/_* sbs-cast frames that are NOT near a fullBurstStart she did not own = FB windows helm opened. _/
const helmOpenedFb = (evs: SimEvent[]) => {
const own = new Set(sbsCasts(evs).map((c) => c.frame));
return fbStarts(evs).filter(
(fb) => ![...own].some((f) => Math.abs(f - fb.frame) < 30),
);
};
/_* sbs buffs on a given stat. */
const sbsBuff = (evs: SimEvent[], stat: string) =>
buffs(evs).filter((b) => b.casterIdx === SBS && b.stat === stat);

describe('scarlet-black-shadow (sbs) — kit spec', () => {
describe('B1 — S1 procs activate on FULL CHARGE only', () => {
it('every S1 proc lands on a charged-shot frame (never on a non-charged pull)', () => {
const procs = s1Procs(base.events);
const cf = chargedFrames(base.events);
expect(procs.length, 'no S1 procs fired at all').toBeGreaterThan(0);
expect(procs.filter((p) => !cf.has(p.frame)).map((p) => p.frame)).toEqual(
[],
);
});
});

describe('B2 — S1 fires ONE effect at a time, cycling 283.03 → 565 → 848.03', () => {
const procs = s1Procs(base.events);
it('no two procs share a frame ("only one effect is triggered at a time")', () => {
const frames = procs.map((p) => p.frame);
expect(frames.filter((f, i) => frames.indexOf(f) !== i)).toEqual([]);
});
it('the value sequence is the exact 3-phase cycle, in order, for the whole fight', () => {
const cycle = [283.03, 565, 848.03];
expect(procs.length).toBeGreaterThanOrEqual(3);
procs.forEach((p, i) =>
expect(p.atkPct, `proc ${i} @${p.frame}`).toBe(cycle[i % 3]),
);
});
});

describe('B3 — S1 magnitudes are the POST-PATCH 283.03 / 565 / 848.03', () => {
it('the distinct proc magnitudes are exactly the post-patch set', () => {
expect(
[...new Set(s1Procs(base.events).map((p) => p.atkPct))].sort(
(a, b) => a - b,
),
).toEqual([283.03, 565, 848.03]);
});
it('DISCRIMINATING: the pre-patch 250.47/500/750.47 model produces a different sequence', () => {
expect([
...new Set(s1Procs(prePatch.events).map((p) => p.atkPct)),
]).not.toEqual([283.03, 565, 848.03]);
});
});

describe('B4 — 6x/9x phases are Distributed Damage; the 3x phase is plain', () => {
it('encodes distributed on the 565 & 848.03 effects and plain on 283.03', () => {
// a no-op patch returns a clean clone of the SHIPPED disk override (the encoding under test)
const shipped = withPatchedOverride(SLUG, () => {}).skill1[0].effects;
expect(shipped[0].flavor ?? 'plain').toBe('plain');
expect(shipped[1].flavor).toBe('distributed');
expect(shipped[2].flavor).toBe('distributed');
});
it('is inert in the partless-boss scope (removing the flavor changes no total by a point)', () => {
// No distributedDamagePct source and no dmgTaken on a partless boss → distributed is a no-op
// here. helm-H4-style: the flavor is faithfully encoded yet moves nothing in THIS basis.
expect(base.totals).toEqual(allPlain.totals);
});
});

describe('B5 — S2 triggers on FULL BURST ENTRY (every team FB), not on her own burstCast', () => {
const maxAmmo = sbsBuff(base.events, 'maxAmmoPct');
it('applies the maxAmmo buff once per Full Burst (== fullBurstStart count, > her own casts)', () => {
const fbs = fbStarts(base.events).length;
const own = sbsCasts(base.events).length;
expect(
fbs,
'fixture must produce FBs helm opens (need fbs > own casts)',
).toBeGreaterThan(own);
expect(maxAmmo.length).toBe(fbs);
expect(maxAmmo.length).toBeGreaterThan(own);
});
it('the buff frames coincide exactly with the Full Burst openings', () => {
expect(maxAmmo.map((b) => b.frame)).toEqual(
fbStarts(base.events).map((f) => f.frame),
);
});
it('DISCRIMINATING: a burstCast trigger would apply it only on her own casts', () => {
expect(sbsBuff(s2OnCast.events, 'maxAmmoPct').length).toBe(
sbsCasts(s2OnCast.events).length,
);
expect(sbsBuff(s2OnCast.events, 'maxAmmoPct').length).toBeLessThan(
fbStarts(s2OnCast.events).length,
);
});
});

describe('B6 — S2 grants Max Ammo ▲60% for 10 sec, self-scoped', () => {
const maxAmmo = sbsBuff(base.events, 'maxAmmoPct');
it('is 60% for exactly 10s on herself', () => {
expect(maxAmmo.length).toBeGreaterThan(0);
expect([...new Set(maxAmmo.map((b) => b.value))]).toEqual([60]);
expect([
...new Set(maxAmmo.map((b) => b.expiresFrame! - b.frame)),
]).toEqual([WINDOW]);
expect([...new Set(maxAmmo.map((b) => b.targetIdx))]).toEqual([SBS]);
});
});

describe('B7 — S2 reloads 100% of the magazine into the BOOSTED cap (instantReload)', () => {
it('encodes an instantReload of fraction 1 alongside the maxAmmo buff', () => {
// The engine snaps ammo silently (sim.ts:2105 emits NO reload event), so the refill itself has
// no log event; pinned structurally on the encoding, and behaviourally below via the realized
// magazine. The reload is ordered AFTER the +60% cap, so it fills the BOOSTED magazine.
const s2 = withPatchedOverride(SLUG, () => {}).skill2;
const reload = s2
.flatMap((b: any) => b.effects)
.find((e: any) => e.kind === 'instantReload');
expect(reload, 'no instantReload effect on S2').toBeDefined();
expect(reload.fraction ?? 1).toBe(1);
});
it('realizes a larger magazine than the no-effects baseline (cap + reload are live)', () => {
// Scope-lock OL base5 grants a flat +3 magazine, so her unboosted magazine is 12 and the +60%
// cap (which scales the base 9 only) raises it to round(9×1.6)+3 = 17. The exact peak is a
// fixture detail; the RELATIONSHIP (effects raise the realized magazine) is the faithful pin.
const peak = (evs: SimEvent[]) =>
Math.max(...shots(evs).map((s) => s.ammoAfter));
expect(peak(base.events)).toBeGreaterThan(peak(noAmmoFx.events));
});
it('buys more shots inside the Full Burst windows than the no-effects baseline', () => {
const fbWindowShots = (evs: SimEvent[]) => {
const sh = shots(evs);
return fbStarts(evs).reduce(
(n, fb) =>
n +
sh.filter((s) => s.frame >= fb.frame && s.frame < fb.frame + WINDOW)
.length,
0,
);
};
expect(fbWindowShots(base.events)).toBeGreaterThan(
fbWindowShots(noAmmoFx.events),
);
});
});

describe('B8 — burst grants ATK ▲115.12% for 10 sec on her OWN cast', () => {
const atk = sbsBuff(base.events, 'atkPct');
it('applies once per own burstCast (not per FB), 115.12% / 10s / self', () => {
const own = sbsCasts(base.events).length;
expect(atk.length).toBe(own);
expect(atk.length).toBeLessThan(fbStarts(base.events).length);
expect([...new Set(atk.map((b) => b.value))]).toEqual([115.12]);
expect([...new Set(atk.map((b) => b.expiresFrame! - b.frame))]).toEqual([
WINDOW,
]);
expect([...new Set(atk.map((b) => b.targetIdx))]).toEqual([SBS]);
});
it('the buff frames coincide with her own burst casts', () => {
expect(atk.map((b) => b.frame)).toEqual(
sbsCasts(base.events).map((c) => c.frame),
);
});
});

describe('B9 — burst grants Charge Damage ▲169.63% for 10 sec on her OWN cast', () => {
const cd = sbsBuff(base.events, 'chargeDamagePct');
it('applies once per own burstCast, 169.63% / 10s / self', () => {
expect(cd.length).toBe(sbsCasts(base.events).length);
expect([...new Set(cd.map((b) => b.value))]).toEqual([169.63]);
expect([...new Set(cd.map((b) => b.expiresFrame! - b.frame))]).toEqual([
WINDOW,
]);
expect([...new Set(cd.map((b) => b.targetIdx))]).toEqual([SBS]);
});
});

describe('B10 — burst lowers the S1 charge-count threshold for 10s, gated on HER OWN cast', () => {
it('the lowering produces more procs overall (procs cluster into burst windows)', () => {
// Shipped (countInFb 1) fires far more S1 procs than the no-lowering model (countInFb 3).
expect(s1Procs(base.events).length).toBeGreaterThan(
s1Procs(noLowering.events).length,
);
});
it('her OWN burst windows are dense; FB windows she did NOT cast stay at baseline', () => {
const procs = s1Procs(base.events);
const inWin = (from: number) =>
procs.filter((p) => p.frame >= from && p.frame < from + WINDOW).length;
// only windows fully inside the fight are measurable
const ownWins = sbsCasts(base.events)
.filter((c) => c.frame + WINDOW <= FIGHT_FRAMES)
.map((c) => inWin(c.frame));
const helmWins = helmOpenedFb(base.events)
.filter((f) => f.frame + WINDOW <= FIGHT_FRAMES)
.map((f) => inWin(f.frame));
expect(
ownWins.length,
'no own burst has a full 10s window',
).toBeGreaterThan(0);
expect(
helmWins.length,
'no helm-opened FB has a full 10s window',
).toBeGreaterThan(0);
// The discrimination: every own-cast window out-procs every helm-opened window. A team-FB-window
// gate would spike the helm-opened windows into the same band as her own.
expect(
Math.min(...ownWins),
`own-cast windows ${ownWins} vs helm-opened ${helmWins}`,
).toBeGreaterThan(Math.max(...helmWins));
});
});
});

### src/skills/overrides/scarlet-black-shadow.json (driver/shipped override)

{
"note": "S1 modeled FAITHFULLY as her real charge-counter (kit text: 'Activates on Full Charge; effect changes by attack count, phases do not stack'): a single per-full-charge phase counter (chargeCounter trigger) firing 283.03% single at the 3rd charge, 565% distributed at the 6th, 848.03% distributed at the 9th, looping. Her BURST lowers those thresholds to 1/2/3 for 10s (gated on HER OWN burst cast, not the team FB window) -> procs cluster into her burst window; the +50% Full Burst then applies per-proc by landing timing (dealDamage). She does ~4.5x proc damage in burst (3x rate x1.5 FB). Post-patch S1 values 283.03/565/848.03 (from 250.47/500/750.47) pinned here. CHARGE LATENCY SETTLED by video test (2026-07-15, N3 = docs/probes/714 noon/3.mp4, she is camera-focus; Fable-approved scientific-method plan): traced her charge %-arc at 60fps over a clean pre-burst cycle -- she reaches 100% (full charge) early then OVERCHARGES to her 150% cap and FIRES AT 150% (confirmed at the two ammo-decrement frames), never at 100%. Firing at the overcharge cap = a real post-full-charge dwell = she HAS the standard SR/RL release/bolt-recovery latency; an autofire weapon would fire at 100%. This OVERTURNS the prior 'AUTOFIRE CONFIRMED / noBoltRecovery kept / bad-datamine' ruling: the noBoltRecovery flag was WRONGLY applied (the owner's real 'no release latency' observation was hold-to-fire hiding the recovery, not its absence), and the datamined chargeFrames=18 (0.30s) is VINDICATED once the 22f recovery is restored. Fix: removed charFixes entirely -> datamined 18f charge + standard 22f SR/RL recovery = 40f cycle (0.67s), matching the video-measured ~42f/0.70s within frame-counting precision. Her 150% charge cap matches DB (chargeMultiplier=150). Bonus: the faithful 18f charge portion is charge-speed-scalable (recovery is not), so it can capture in-burst charge-speed the old flat-42f fudge could not. ALSO FIXED (2026-07-15): chargeCounter inBurst guard was true at frame 0 (lastBurstCastFrame init -1) -> she wrongly used the lowered 1/2/3 thresholds for the first ~10s before ever bursting; guarded with `lastBurstCastFrame >= 0` (sim.ts). OPEN (2026-07-15): with the charge fix + FB-by-timing on her clustered burst-window procs she now grades ~1.13 in N3 (OVER, flipped from the old ~0.73 under, because the +50% FB on ~15 procs/burst is large). Next test (needs a Fable-approved plan): COUNT her S1 proc popups in ONE clean N3 burst window from the focused video and compare to the sim's every-charge rate (~15/burst) -- if the real proc rate is lower, the 'phases do not stack' clause or an internal proc cadence gates it (faithful fix); do NOT re-fudge the cadence. Secondary candidate: non-core normal value (DBG max 1.30M vs a real 1.55M popup, buff-state dependent). PROC-COUNT VIDEO RE-READ (2026-07-15, N3 focus): the large 848% (phase2) proc is ABSENT from a confirmed burst window (distinct ~3.2M popup at real ATK scale, verified missing; team total rose only 132M) -> the uniform every-charge model (countInFb 1 = ~5× 848%/burst) OVER-fires the large phases (med-high confidence on direction, low on exact count -- low phases entangle with charge normals). Kit text = per-phase 'attack count required 1 time/2 times/3 times' (engine now supports per-phase array thresholds). TESTED countInFb [1,2,3] / count [3,6,9]: overshoots to 0.78 (was 1.13) -- so the truth is between, AND the outside-burst default is UNKNOWN (kit only states the in-burst override) + a confound (subagent: sim charge-normal 1.64M vs real 1.03M, sim rotation faster than real). REVERTED to scalar 3/1 pending an ISOLATED-burst SBS recording to pin the real per-phase count + resolve the ATK/rotation confound. Engine per-phase capability kept. BASELINE UPDATE (2026-07-15): her N3 sim total rose 505.6M->528.3M (ratio ~1.13->~1.18) when soda's Golden Chip attack-damage pulse (+10.51%, soda buffs the top-final-ATK ally = scarlet) was modeled -- this is a REAL buff scarlet receives in the fight, so 528.3M is now the correct baseline her proc-count knot fix must target (her prior ~1.13 was partly flattered by the missing buff). Not a scarlet bug; the extra hotness is her own proc-count over-model, now more fully exposed. [materialized 2026-07-16: skill2/burst auto-filled from the offline parser (blablalink prose) — behavior-identical to the prior runtime parse; NOT hand-verified]. Kit-autonomy gauntlet 2026-07-25: every kit line re-derived FAITHFUL — S1 full-charge phase counter cycling 283.03%(single)/565%(distributed)/848.03%(distributed) one-effect-at-a-time; S2 on Full Burst entry (fullBurstEnter, every team FB) maxAmmo +60%/10s + reload 100% into the BOOSTED cap; burst on HER OWN cast (burstCast) ATK +115.12%/Charge Damage +169.63% for 10s plus the count-requirement lowering gated on her own burst cast (NOT the team FB window). Cross-family fable-5 review (clean re-dispatch after a de-contamination fix) converged on all 11 load-bearing lines and independently corroborated the scalar CUMULATIVE cadence (3/6/9 outside, 1/1/1 in-burst). The EXACT per-phase proc cadence (shipped scalar 3/1 vs kit-literal per-phase 3/6/9 & 1/2/3) stays MEASUREMENT-GATED pending an isolated-burst SBS recording — see caveats; not re-fudged. Pinned by scripts/tests/units/scarlet-black-shadow.test.ts (19 tests). NOTE: caveat[0] ('burst: unparsed effect ...') is STALE per caveat[2] — the count-requirement line IS modeled (chargeCounter.countInFb).",
"unmodeled": {
"skill1": [],
"skill2": [],
"burst": []
},
"caveats": [
"burst: unparsed effect \"Changes Full Charge attack count required for Skill 1 to 1 time/2 times/3 times for 10 sec.\"",
"skill1: phase-threshold semantics are a scalar 3 (outside) / 1 (in-burst) model = the CUMULATIVE '3rd/6th/9th charge' reading of the kit; the per-phase reading ([3,6,9]/[1,2,3], cycle 18/6 charges) tested ~22% cold and own-probe evidence is split (sbs-control: procs ~every charge in burst; N3 re-read: the 848% absent in one window) — isolated-burst recording queued to pin the in-burst 848% count",
"burst: the count-requirement line ('Changes Full Charge attack count required for Skill 1 to 1 time/2 times/3 times for 10 sec.') IS modeled — chargeCounter.countInFb gated on HER OWN burst cast for 10s (sim.ts:1745); the previous 'unparsed' caveat and unmodeled.burst entry were stale"
],
"skill1": [
{
"slot": "skill1",
"trigger": {
"kind": "chargeCounter",
"count": 3,
"countInFb": 1
},
"target": {
"kind": "enemy"
},
"effects": [
{
"kind": "flatDamage",
"atkPct": 283.03
},
{
"kind": "flatDamage",
"atkPct": 565,
"flavor": "distributed"
},
{
"kind": "flatDamage",
"atkPct": 848.03,
"flavor": "distributed"
}
]
}
],
"skill2": [
{
"slot": "skill2",
"trigger": {
"kind": "fullBurstEnter"
},
"target": {
"kind": "self"
},
"effects": [
{
"kind": "buff",
"stat": "maxAmmoPct",
"value": 60,
"durationSec": 10
},
{
"kind": "instantReload",
"fraction": 1
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
"kind": "self"
},
"effects": [
{
"kind": "buff",
"stat": "atkPct",
"value": 115.12,
"durationSec": 10
},
{
"kind": "buff",
"stat": "chargeDamagePct",
"value": 169.63,
"durationSec": 10
}
]
}
]
}
