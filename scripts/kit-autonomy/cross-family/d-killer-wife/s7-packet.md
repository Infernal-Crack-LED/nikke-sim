

==========================================================================================
## SECTION 0 — RE-JUDGE AFTER REAL-GOTCHA FIX (read this first)
==========================================================================================
This is a RE-JUDGE of d-killer-wife. The prior reconciling judge ruled NO-GO(faithfulness) with
exactly ONE REAL-GOTCHA (ENCODING, low): the burst body-branch rider (casterAtkPct 12.19) carried a
stranded requiresCore:true gate — the parts→core proxy left behind when the parts branch was deleted
(2026-07-17) — which inverted the kit line "Allies that hit the BODY" (= non-core on the partless
boss). The blind S6 override (prose-only, independent) had correctly placed requiresCore on the PARTS
branch, not the body branch.

THE FIX (exactly as the prior judge prescribed):
  1. requiresCore:true DELETED from the burst body-branch block; requiresTargetStatus "Wipe Out" is
     now the SOLE gate. (See Section 7 driver override — the body branch no longer has requiresCore.)
  2. The driver test W7 third assertion RE-POINTED to pin the correct direction: the body branch fires
     IDENTICALLY at coreHitRate 0 and 1 (body = non-core, maximally live when no core hits exist); a
     regression re-adding requiresCore would gate it out at coreHitRate 0 and fail. (See Section 7 test.)
  3. The requiresCore proxy note was re-pointed onto the parked parts branch in the override caveats,
     where it will gate the parts→core mapping once destructible parts are modeled.
  4. Board-movement check: at the scope-lock basis (coreHitRate 1) the body branch fired before AND
     after → byte-identical totals (the driver test confirms body-branch app count is unchanged by core
     exposure). validate-overrides.ts runs a coreHitRate:0 smoke basis, where the fix CORRECTLY brings
     the body branch live (54.6M→57.1M) — that is the faithful direction, not a regression.

All other lines were already ruled clean (5 FAITHFUL + 2 DOCUMENTED_GAP with estimate+recipe+tier) and
all 6 S5 blind-test reds were ruled non-gotcha; those rulings stand. The S5 blind test and S6 blind
override are UNCHANGED (the S6 override already had the correct gate placement, corroborating the fix).
Confirm the fix resolves the REAL-GOTCHA and emit the binding verdict JSON.


==========================================================================================
## SECTION 1 — RECONCILING-JUDGE CONTRACT (your role + the binding return JSON shape)
==========================================================================================
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


==========================================================================================
## SECTION 2 — MECHANICS SSOT (the authority for every faithfulness call below)
==========================================================================================
The two source-of-truth mechanics docs follow IN FULL. Use them to adjudicate whether the
driver override encodes real observed mechanics, and whether each blind-test red is a real
faithfulness error (REAL-GOTCHA) or a defensible modeling divergence.

----- docs/data/damage-calculation.md -----
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


----- docs/data/game-mechanics.md -----
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


==========================================================================================
## SECTION 3 — GROUND TRUTH: the unit kit prose + base stats (data/characters.json extract)
==========================================================================================
Slug: d-killer-wife  |  Name: "D: Killer Wife"  |  SR / Supporter / Fire / Burst I, cd 20s.
This is the SR/Fire VARIANT of the SMG/Wind base unit (slug `d`) — a wholly different kit.
Skill levels are 10/10/10; the normalized `skills` prose below is the SSOT for magnitudes.

{
  "slug": "d-killer-wife",
  "name": "D: Killer Wife",
  "imageUrl": "https://sg-tools-cdn.blablalink.com/om-81/jk-23/990a2f3dc90a0838fe6adc768db35eef.png",
  "weapon": "SR",
  "burst": "I",
  "burstCooldownSec": 20,
  "class": "Supporter",
  "element": "Fire",
  "manufacturer": "Elysion",
  "normalAttackMultiplier": 69.04,
  "coreAttackMultiplier": 200,
  "ammo": 6,
  "reloadFrames": 141,
  "chargeFrames": 60,
  "chargeMultiplier": 250,
  "hitsPerShot": 1,
  "rl3": 8.4,
  "burstGaugePerShot": 2.8,
  "treasure": false,
  "nicknames": [
    "dkw"
  ],
  "skills": {
    "skill1": "■ Activates when attacking with Full Charge for 3 time(s). Affects self.\nGain Pierce for 1 shot.\n■ Activates when entering Full Burst. Affects all allies with a Sniper Rifle.\nPierce Damage ▲13.55% for 10 sec.",
    "skill2": "■ Activates when attacking with Full Charge for 8 time(s). Affects all allies.\nCooldown of Burst Skill ▼ 7 sec.\n■ Activates when attacking with Full Charge for 5 time(s). Affects all allies.\nAttack damage ▲ 5.06% for 10 sec.",
    "burst": "■ Affects the enemy nearest to the crosshair.\nDeals 269.28% of final ATK as additional damage.\nInflicts Wipe Out on the target for 10 sec.\n■ Activates when allies' normal attack hits a certain area of the target afflicted with Wipe Out. Affects allies.\nBuff takes effect depending on the area hit.\nAllies that hit parts: Damage dealt when attacking core ▲ 16.26% for 10 sec.\nAllies that hit the body: ATK ▲ 12.19% of the skill user's ATK for 10 sec."
  },
  "skillCooldownsSec": {
    "skill1": null,
    "skill2": null,
    "burst": 20
  },
  "role": {
    "weapon": {
      "shot_id": 1004301,
      "shot_detail": {
        "id": 1004301,
        "damage": 6904,
        "max_ammo": 6,
        "shake_id": 2,
        "ShakeType": "Fire_SR",
        "fire_type": "Instant",
        "zoom_rate": 30,
        "input_type": "UP",
        "shot_count": 1,
        "ShakeWeight": 120,
        "attack_type": "Energy",
        "camera_work": "camera_work_01",
        "charge_time": 100,
        "penetration": 0,
        "reload_time": 200,
        "shot_timing": "Concurrence",
        "spot_radius": 0,
        "weapon_type": "SR",
        "is_targeting": false,
        "muzzle_count": 1,
        "rate_of_fire": 60,
        "name_localkey": "Sniper Rifle",
        "prefer_target": "Back",
        "reload_bullet": 10000,
        "counter_enermy": "Energy_Type",
        "multi_aim_range": 0,
        "spot_last_delay": 20,
        "core_damage_rate": 20000,
        "end_rate_of_fire": 60,
        "spot_first_delay": 20,
        "center_shot_count": 0,
        "reload_start_ammo": 5,
        "full_charge_damage": 25000,
        "multi_target_count": 0,
        "spot_radius_object": 0,
        "uptype_fire_timing": 0,
        "burst_energy_pershot": 28000,
        "description_localkey": "■ Affects target(s).\n<color=#00AEFF>Deals {damage}% of ATK as damage.\nCharge Time: {charge_time} sec.\nFull Charge Damage: {full_charge_damage}% of damage.\nDeals {core_damage_rate}% damage when attacking core.</color>",
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
        "full_charge_burst_energy": 25000,
        "end_accuracy_circle_scale": 10,
        "auto_accuracy_change_speed": 0,
        "rate_of_fire_change_pershot": 0,
        "start_accuracy_circle_scale": 10,
        "target_burst_energy_pershot": 56000,
        "auto_accuracy_change_pershot": 0,
        "auto_end_accuracy_circle_scale": 10,
        "auto_start_accuracy_circle_scale": 10
      },
      "bonusrange_max": 100,
      "bonusrange_min": 45
    },
    "burstMeta": {
      "burst_duration": 1000,
      "use_burst_skill": "Step1",
      "burst_apply_delay": 1,
      "change_burst_step": "Step2"
    },
    "skillDetails": {
      "skill1_id": 2043101,
      "skill2_id": 2043201,
      "skill1_table": "StateEffect",
      "skill2_table": "StateEffect",
      "skill1_detail": {
        "id": 2043101,
        "icon": "icn_skill_statpenetration_01",
        "group_id": 20431,
        "skill_level": 1,
        "name_localkey": "Calm Sniping",
        "next_level_id": 2043102,
        "level_up_cost_id": 10102,
        "description_localkey": "■ Activates when attacking with Full Charge for {description_value_01} time(s). Affects self.\n<color=#00AEFF>Gain Pierce for 1 shot.</color>\n■ Activates when entering Full Burst. Affects all allies with a Sniper Rifle.\n<color=#00AEFF><word_group=10042>Pierce Damage</word_group> ▲{description_value_02}% for {description_value_03} sec.</color>",
        "description_value_list": [
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
              "8",
              "8.62",
              "9.24",
              "9.85",
              "10.47",
              "11.08",
              "11.7",
              "12.32",
              "12.93",
              "13.55"
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
          {},
          {},
          {}
        ],
        "info_description_localkey": "Skill 1"
      },
      "skill2_detail": {
        "id": 2043201,
        "icon": "icn_skill_statreloadtime_01",
        "group_id": 20432,
        "skill_level": 1,
        "name_localkey": "Assault Formation",
        "next_level_id": 2043202,
        "level_up_cost_id": 10202,
        "description_localkey": "■ Activates when attacking with Full Charge for {description_value_01} time(s). Affects all allies.\n<color=#00AEFF><word_group=10031>Cooldown</word_group> of Burst Skill ▼ {description_value_02} sec.</color>\n■ Activates when attacking with Full Charge for {description_value_03} time(s). Affects all allies.\n<color=#00AEFF>Attack damage ▲ {description_value_04}% for {description_value_05} sec.</color>",
        "description_value_list": [
          {
            "description_value": [
              "8",
              "8",
              "8",
              "8",
              "8",
              "8",
              "8",
              "8",
              "8",
              "8"
            ]
          },
          {
            "description_value": [
              "4.13",
              "4.45",
              "4.77",
              "5.09",
              "5.4",
              "5.72",
              "6.04",
              "6.36",
              "6.68",
              "7"
            ]
          },
          {
            "description_value": [
              "5",
              "5",
              "5",
              "5",
              "5",
              "5",
              "5",
              "5",
              "5",
              "5"
            ]
          },
          {
            "description_value": [
              "2.99",
              "3.22",
              "3.45",
              "3.68",
              "3.91",
              "4.14",
              "4.37",
              "4.6",
              "4.83",
              "5.06"
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
        "info_description_localkey": "Skill 2"
      },
      "ulti_skill_id": 1043301,
      "ulti_skill_detail": {
        "id": 1043301,
        "icon": "icn_skill_c043_ult",
        "group_id": 10433,
        "shake_id": 1,
        "skill_type": "HitMonsterGetBuff",
        "attack_type": "Fire",
        "skill_level": 1,
        "counter_type": "Metal_Type",
        "duration_type": "TimeSec",
        "name_localkey": "Kill the Target",
        "next_level_id": 1043302,
        "prefer_target": "NearAim",
        "resource_name": "c043_ulti",
        "duration_value": 1000,
        "skill_cooltime": 2000,
        "level_up_cost_id": 10302,
        "skill_value_data": [
          {
            "skill_value": 104330103,
            "skill_value_type": "Integer"
          },
          {
            "skill_value": 104330102,
            "skill_value_type": "Integer"
          },
          {
            "skill_value": 0,
            "skill_value_type": "None"
          },
          {
            "skill_value": 0,
            "skill_value_type": "None"
          },
          {
            "skill_value": 1,
            "skill_value_type": "Integer"
          }
        ],
        "skill_cooltime_list": [
          2000,
          2000,
          2000,
          2000,
          2000,
          2000,
          2000,
          2000,
          2000,
          2000
        ],
        "description_localkey": "■ Affects the enemy nearest to the crosshair.\n<color=#00AEFF>Deals {description_value_01}% of <word_group=10025>final</word_group> ATK as additional damage.\nInflicts Wipe Out on the target for {description_value_03} sec.</color>\n■ Activates when allies' normal attack hits a certain area of the target afflicted with Wipe Out. Affects allies.\n<color=#00AEFF>Buff takes effect depending on the area hit.\nAllies that hit parts: Damage dealt when attacking core ▲ {description_value_02}% for {description_value_03} sec.\nAllies that hit the body: ATK ▲ {description_value_04}% of the skill user's ATK for {description_value_05} sec.</color>",
        "description_value_list": [
          {
            "description_value": [
              "159.12",
              "171.36",
              "183.6",
              "195.84",
              "208.08",
              "220.32",
              "232.56",
              "244.8",
              "257.04",
              "269.28"
            ]
          },
          {
            "description_value": [
              "9.6",
              "10.34",
              "11.08",
              "11.82",
              "12.56",
              "13.3",
              "14.04",
              "14.78",
              "15.52",
              "16.26"
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
              "7.2",
              "7.76",
              "8.31",
              "8.87",
              "9.42",
              "9.97",
              "10.53",
              "11.08",
              "11.64",
              "12.19"
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
        "prefer_target_condition": "IncludeNoneTargetLast",
        "info_description_localkey": "Burst Skill",
        "after_use_function_id_list": [
          0
        ],
        "after_hurt_function_id_list": [
          104330101
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
      "grow_grade": 204302,
      "grade_core_id": 1,
      "stat_enhance_id": 5302,
      "stat_enhance_detail": {
        "id": 5302,
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
        100001
      ],
      "element_details": [
        {
          "id": 100001,
          "element": "Fire",
          "group_id": 5000001,
          "element_icon": "icn_element_fire",
          "weak_element_id": 200001,
          "element_desc_localekey": "Injects Code: H.S.T.A. to all wind-type enemies, dealing 10% additional damage.",
          "element_name_localekey": "Fire",
          "element_code_name_localekey": "Code: H.S.T.A."
        }
      ]
    },
    "piece": {
      "piece_id": 5100043,
      "piece_detail": {
        "id": 5100043,
        "class": "Attacker",
        "order": 4300,
        "use_id": 0,
        "use_type": "None",
        "item_rare": "SSR",
        "item_type": "Piece",
        "stack_max": 9999999,
        "use_value": 0,
        "corporation": "ELYSION",
        "resource_id": 43,
        "item_sub_type": "CharacterPiece",
        "name_localkey": "D: Killer Wife's Spare Body",
        "use_limit_count": false,
        "inventory_filter": [
          "etc"
        ],
        "description_localkey": "Can be used for Nikkes' Limit Breaks.\nIf a Nikke's Limit Break has reached the max level, any additional Spare Bodies for that Nikke will be converted to Body Labels."
      }
    },
    "meta": {
      "id": 204301,
      "class": "Supporter",
      "order": 10026,
      "name_code": 5110,
      "corporation": "ELYSION",
      "resource_id": 43,
      "name_localkey": "D: Killer Wife",
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
    "hp": 15000,
    "atk": 500,
    "def": 84,
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
    "resourceId": 43
  }
}

==========================================================================================
## SECTION 4 — S2b PRE-OP TEST-FAITHFULNESS REVIEW (claude-fable-5, independent)
==========================================================================================
{
  "slug": "d-killer-wife",
  "leakDetected": "The 'redacted' effect schema retains this unit's answer tokens: the targetStatus comment describes the deleted hardcoded `wipeOut` effect + `requiresWipeOut` boolean, and the requiresTargetStatus comment's example — 'allies hit an area of the Wipe-Out-afflicted target' (core-only proxy via requiresCore; parts-hit branch awaits destructible-part modeling) — names Wipe Out and reveals the shipped encoding choice for this unit's burst rider. Declared per protocol; all dispositions below were re-derived from the kit prose alone.",
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "Full Charge x3 -> Gain Pierce, 1 shot",
      "disposition": "FIX",
      "scope": "self only; counts FULL-CHARGE attacks (SR always full-charges in sim, so ~every shot advances the counter)",
      "durationSemantics": "1 SHOT — a round-count window, never durationSec; gainPierce has no durationShots field, so the encoding needs either a one-shot-interval durationSec proxy (⚑) or an engine extension",
      "triggerIdentity": "chargeCounter (or hitCount) count:3 — cycling counter, resets each proc; NOT interval, NOT passive",
      "targetSet": "self",
      "nearestWrongModel": "top-level hasPierce:true (whole-fight pierce tag) or gainPierce with absent durationSec (= permanent from the 3rd charge onward)",
      "distinguishingAssertion": "With S1b's pierceDamagePct live during FB, only the single shot following each 3rd full charge carries the pierce-fed Damage-Up delta; shots 1–2 of each 3-charge cycle show no pierce bucket. RED if every shot from t=0 (hasPierce flag) or every shot after the first proc (permanent gainPierce) is boosted.",
      "inertness": "No pierce tag before the 3rd full charge; deleting S1b must make this line damage-inert on a partless single boss (pierce adds no extra targets)",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "FB enter: SR allies Pierce Dmg ^13.55%",
      "disposition": "FAITHFUL",
      "scope": "Pierce Damage bucket — only feeds pierce-TAGGED hits of the holders",
      "durationSemantics": "10 sec wall-clock (durationSec:10)",
      "triggerIdentity": "fullBurstEnter — ANY team Full Burst, explicitly not burstCast (fires even on rotations where a different B1 casts)",
      "targetSet": "alliesOfWeapon weapon:'SR', self INCLUDED (she is SR; no 'except self' clause)",
      "nearestWrongModel": "target all allies unscoped by weapon; or keyed to burstCast so it skips rotations another B1 initiates; or encoded as attackDamagePct (unconditional Damage-Up)",
      "distinguishingAssertion": "buffApply {stat:'pierceDamagePct', value:13.55} on EVERY fullBurstStart, with targetSlugs = exactly the SR wielders in comp (helm + self in the control comp); fires on rotations where liter cast B1. RED if liter/crown receive it, or if it only appears on her own-burst rotations.",
      "inertness": "Non-SR allies never receive it; for an SR holder with no pierce-tagged shots in the window, damage totals must not move",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Full Charge x8 -> Burst CD v7s, allies",
      "disposition": "FAITHFUL",
      "scope": "burst-cooldown economy, not a damage stat",
      "durationSemantics": "instant one-shot cooldown reduction per proc, NO duration — repeats every 8 full charges all fight",
      "triggerIdentity": "chargeCounter/hitCount count:8, effect burstCdr seconds:7 (oncePerBattle ABSENT)",
      "targetSet": "all allies including self",
      "nearestWrongModel": "burstCdr with oncePerBattle:true, or a timed 'buff' misencoding, or an interval trigger decoupled from her actual full-charge cadence (ammo 6 + 141f reload gates the rate)",
      "distinguishingAssertion": "Team burstCast timestamps compress progressively vs a withPatchedOverride run with this block removed — later rotations arrive earlier by accumulating 7s reductions per 8 charges (~one proc per ~11–12s given 6-round magazine + 2.35s reload). RED if only the first rotation shifts (oncePerBattle) or if procs continue during reload dead-time at a flat wall-clock rate (interval misread).",
      "inertness": "No buffApply damage-stat events from this block; direct per-shot damage unchanged",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Full Charge x5 -> Atk dmg ^5.06% 10s",
      "disposition": "FAITHFUL",
      "scope": "'Attack damage' = attackDamagePct (Damage-Up bucket, additive, diluted) — NOT the ATK stat",
      "durationSemantics": "10 sec wall-clock, refreshed each proc; ~5-charge cadence (< 10s even across a reload) gives near-continuous uptime after the first ~5 shots",
      "triggerIdentity": "chargeCounter/hitCount count:5 — its own counter, independent of the x3 and x8 counters",
      "targetSet": "all allies including self",
      "nearestWrongModel": "stat atkPct 5.06 (multiplies each holder's own ATK — different bucket, different dilution) or a passive always-on buff from t=0",
      "distinguishingAssertion": "buffApply {stat:'attackDamagePct', value:5.06} to every unit, FIRST occurrence only after ~5 full charges (≥ ~5s in, never frame 0), with refresh events at the 10/15/... charge marks. RED if stat==='atkPct', or if an apply exists at t=0.",
      "inertness": "No application before the 5th full charge; a stunned/non-firing d-killer-wife stops the refreshes",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Deals 269.28% final ATK addl damage",
      "disposition": "FAITHFUL",
      "scope": "instant burst-cast rider on the enemy; per methodology riders get noRange and NO core; burst-cast damage is FB-exempt (lands pre-window)",
      "durationSemantics": "instant, once per her own burst cast (cd 20s)",
      "triggerIdentity": "burstCast (HER cast only) — never fullBurstEnter; with a second B1 (liter) in comp these diverge every rotation she doesn't cast",
      "targetSet": "enemy",
      "nearestWrongModel": "keyed to fullBurstEnter (procs on every team FB even when liter takes the B1 slot — over-credits) or fbMajorApplied true (+50% it never earns)",
      "distinguishingAssertion": "Exactly one damage event with mult 269.28 (srcSlot 'burst', fbMajorApplied===false, rangeApplied===false) per rotation SHE casts, and ZERO on rotations where the other B1 casts. RED if the count equals total FB count in a two-B1 comp, or fbMajorApplied is true.",
      "inertness": "No proc on team Full Bursts she did not initiate",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Inflicts Wipe Out on target for 10 sec",
      "disposition": "FAITHFUL",
      "scope": "named enemy status; damage-inert itself — exists solely to open the rider gate",
      "durationSemantics": "10 sec window from HER cast (not from FB start, not FB-duration-keyed)",
      "triggerIdentity": "burstCast; effect targetStatus {name:<WipeOut key>, durationSec:10}; block authored target:'enemy' (validator requirement)",
      "targetSet": "enemy (boss)",
      "nearestWrongModel": "modeled as a damageTakenPct debuff (adds damage it shouldn't), or the rider gate keyed to the FB window / left ungated so rider buffs run outside the 10s status",
      "distinguishingAssertion": "The burst rider buffs (casterAtkPct 12.19-of-caster / any core branch) appear ONLY inside [castFrame, castFrame+600f]; an ally hit at cast+11s produces no buffApply. RED if rider buffs apply outside the window or a damageTakenPct buffApply exists.",
      "inertness": "Zero direct damage contribution; boss-held status must not emit a damage-stat buff",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "hit parts: core dmg ^16.26% for 10 sec",
      "disposition": "GAP",
      "scope": "allies whose NORMAL attacks hit destructible PARTS of the Wipe-Out target — the scope-lock boss is PARTLESS, so the real trigger condition never occurs in v1",
      "durationSemantics": "10 sec per grant, per hitting ally",
      "triggerIdentity": "ally-hit-on-parts + requiresTargetStatus(WipeOut) — no parts model exists; any core-hit proxy is a CALIBRATED encoding decision (⚑), not prose (parts ≠ core: the body branch already covers non-part hits, and core is not stated to be a 'part')",
      "targetSet": "the allies that landed the parts hit",
      "nearestWrongModel": "granting coreDamagePct 16.26 to all allies on burst cast (or proxying parts:=core without a flag) — invents a buff the partless fight cannot produce",
      "distinguishingAssertion": "On the partless boss, NO buffApply {stat:'coreDamagePct', value:16.26} exists anywhere in the event log, and deleting this line moves totals by exactly 0. RED if any such buffApply appears ungated. If the shipped override DOES proxy it via requiresCore, the driver must carry an explicit ⚑ and a test pinning the proxy's conditionality — my prose-only reading says default-inert.",
      "inertness": "Must not move the partless-boss board at all",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "burst",
      "kitLine": "hit body: ATK ^12.19% of user's ATK 10s",
      "disposition": "FIX",
      "scope": "allies' NORMAL attacks hitting the body of the Wipe-Out target (skill/burst hits don't trigger); on a partless boss every normal hit is a body (or core) hit, so effectively all attacking allies hold it while the status is live",
      "durationSemantics": "10 sec per ally, refreshed per qualifying hit — so the buff can outlive the status window by up to ~10s (a naive burst-cast-synced 10s buff under-credits the tail)",
      "triggerIdentity": "ally-normal-hit gated on requiresTargetStatus(WipeOut); the schema has NO ally-hit trigger, so a proxy is required (⚑) — e.g. a burstCast-triggered allies grant with durationSec spanning the status window; the proxy shape must be flagged, not shipped silently",
      "targetSet": "the hitting allies (in practice all allies attacking during the window)",
      "nearestWrongModel": "stat atkPct 12.19 (each ally's OWN ATK) instead of casterAtkPct — a Supporter SR's ATK is well below the B3 carry's, so the own-ATK misread OVER-credits the carry; second misread: leaving it ungated/permanent instead of Wipe-Out-windowed",
      "distinguishingAssertion": "buffApply events with stat==='casterAtkPct' whose value is the FLAT number (12.19/100)×d-killer-wife.staticAtk — NOT the raw 12.19 — targeting allies, occurring only within Wipe Out windows and never before her first burst cast. RED if stat==='atkPct', if value===12.19 raw, or if an apply precedes her first burstCast.",
      "inertness": "Nothing before her first burst; nothing on rotations she doesn't cast (two-B1 comp)",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:full-charge-x3-gain-pierce-1-shot",
    "skill1:fb-enter-sr-allies-pierce-dmg-13.55",
    "skill2:full-charge-x8-burst-cdr-7s",
    "skill2:full-charge-x5-attack-damage-5.06",
    "burst:flat-damage-269.28",
    "burst:wipe-out-status-10s",
    "burst:body-hit-casterAtkPct-12.19"
  ],
  "unmodeledVerbatim": {
    "skill1": [],
    "skill2": [],
    "burst": [
      "Allies that hit parts: Damage dealt when attacking core ▲ 16.26% for 10 sec."
    ]
  },
  "notes": "(1) FIXTURE HAZARD: d-killer-wife is Burst I, but controlComp(carry) seats the carry in the B3 slot alongside liter (B1). The test comp must guarantee SHE actually casts her burst (all burst-slot lines are burstCast-gated) — either verify via burstCast events that d-killer-wife is the caster, or the Wipe Out riders and the 269.28% nuke silently never fire and every burst assertion is vacuously green. (2) Expected shared-prior misreads to adversarially pin: 'Attack damage' → atkPct (it is attackDamagePct), '12.19% of the skill user's ATK' → atkPct (it is casterAtkPct, flat-resolved at apply), the burst rider → fullBurstEnter (it is burstCast; diverges in any two-B1 comp), and S1a → whole-fight hasPierce flag (it is a step-gated 1-shot gainPierce). (3) 'Attacking with Full Charge N times' counters: SR always full-charges in-sim so hitCount≈chargeCounter, but the three counters (3/8/5) are INDEPENDENT per block — a shared counter is a misencoding; assert the 5-count and 8-count procs interleave at their own cadences. (4) Pierce value chain: S1a+S1b only move damage if the pierce Damage-Up path is live for gainPierce-tagged shots (the StatKey comment 'pierceDamagePct parsed but inert in v1' contradicts the gainPierce comment — a test must prove the bucket actually moves a pierced shot's damage, else both skill1 lines are silently inert and that must be surfaced, not papered over). (5) Cadence context for CDR math: ammo 6, ~1s charge + 141f reload → ~8.65s per 6-charge magazine, so the x8 CDR procs roughly every ~11.6s — assert cadence respects reload dead-time. (6) Helm is the only other SR in the control comp — she is the S1b coverage witness. (7) The schema-comment leak (see leakDetected) suggests the shipped override proxies the parts/area rider via requiresCore; my blind prose reading makes the parts branch inert on the partless boss and the body branch the live one — the driver must reconcile which branch (if either) the requiresCore proxy encodes and carry an explicit ⚑ for it.",
  "model": "claude-fable-5"
}


==========================================================================================
## SECTION 5 — S5 BLIND TEST (claude-opus-5) + its green/red count vs the DRIVER override
==========================================================================================
Run result vs the driver override (deterministic sim): 17 GREEN / 6 RED / 3 SKIP (26 total).
The 17 greens cover EVERY load-bearing faithfulness claim (SR-scoped FB-enter pierce 13.55;
burstCdr-7 accelerates the rotation with the 8-threshold load-bearing; attackDamagePct 5.06 in
the Damage-Up bucket reaching all four allies; 269.28 nuke as self-damage; Wipe Out targetStatus
on an enemy block; riders name-keyed to the inflicted status with the gate live BOTH ways).

DRIVER RECONCILIATION OF THE 6 REDS (each argued NON-gotcha):
  RED #1 (fixture non-vacuity "burst really casts") & RED #5 (burst-B parts branch): both assert
    buffApply{coreDamagePct,16.26} exists. The DRIVER REMOVED the parts branch (2026-07-17 fix):
    the kit says "Allies that hit PARTS"; the partless scope-lock boss has NO destructible parts,
    so no ally ever hits parts and the buff can never be EARNED. Modeling it (even Wipe-Out-gated)
    applies it whenever Wipe Out is live -> OVER-CREDITS every ally core bucket (core hits exist on
    the partless boss core). Removing it is the FAITHFUL choice; the blind test picked a witness the
    driver correctly deleted. The burst still provably casts (269.28 nuke + body-branch casterAtkPct).
  RED #2 (S1a gainPierce): the driver leaves "Full Charge x3 -> self Gain Pierce 1 shot" UNMODELED.
    On the partless single-target boss the Pierce tag adds NO targets; its only effect would be to
    make one tagged shot eligible for the 13.55% Pierce Damage during FB (a small own-damage under-
    count). pierceDamagePct is documented v1-inert (no live pierce tags). The blind test's OWN
    inertness assertion ("damage-INERT in v1 — teammates byte-identical") PASSES. The line is
    documented verbatim in the driver's unmodeled.skill1, NOT silently dropped. Modeling-completeness
    preference, not a faithfulness error.
  RED #3 & #4 (S2a/S2b trigger.kind expected chargeCounter, got hitCount): primitive-NAME over-
    specification. For an SR that ALWAYS full-charges, hitCount (counts every shot) is behaviorally
    IDENTICAL to chargeCounter (counts full charges) — every shot IS a full charge. The blind writer's
    own spec noted "SR always full-charges in-sim so hitCount≈chargeCounter". ALL behavioral assertions
    pass (CDR accelerates rotation; 8-threshold load-bearing; attackDamagePct bucket/targets/cadence).
  RED #6 (burst-B body branch vals.size expected 1, got 2): blind-test FIXTURE LEAK. The blind test
    filters casterAtkPct by `value > 12.19*10` but does NOT isolate by caster, so crown's OWN kit
    casterAtkPct (a different flat value) contaminates the set -> size 2. The driver's body branch IS
    faithfully flat-resolved (single value 12.19%×casterStaticAtk for d-killer-wife), Wipe-Out-gated —
    proven by the driver test W7. Not a driver faithfulness error.

----- blind test source (scripts/kit-autonomy/blind/d-killer-wife.test.ts) -----
// DRIVER NOTE (gauntlet S5): import path retargeted from '../lib/harness.js' (the blind
// writer's assumed scripts/tests/units/ location) to the real '../../tests/lib/harness.js'
// for this file's home in scripts/kit-autonomy/blind/. No other change to the blind test.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js';

/**
 * d-killer-wife (D: Killer Wife) — SR / Fire / Supporter / Burst I, cd 20s, ammo 6,
 * chargeFrames 60. BLIND spec test: written from the kit prose alone.
 *
 * KIT (structural read):
 *   S1a  "Full Charge for 3 time(s)" / self          -> gainPierce ("for 1 shot")
 *   S1b  "entering Full Burst" / allies with SR      -> pierceDamagePct 13.55, 10s
 *   S2a  "Full Charge for 8 time(s)" / all allies    -> burstCdr 7s (repeating)
 *   S2b  "Full Charge for 5 time(s)" / all allies    -> attackDamagePct 5.06, 10s
 *   B-a  nearest enemy                               -> flatDamage 269.28% + targetStatus "Wipe Out" 10s
 *   B-b  ally normal-attack area hit vs Wipe Out     -> parts: coreDamagePct 16.26, 10s
 *                                                       body:  casterAtkPct 12.19, 10s
 *
 * FIXTURE: controlComp('d-killer-wife', true) — liter (B1) / crown (B2) / d-killer-wife
 * (carry) / helm (B3). She is a Burst I, so the chain needs the B2+B3 to reach Full Burst at
 * all; helm is kept IN because she is the only OTHER Sniper Rifle in the comp and S1b's
 * weapon-scoped target set is only discriminable against a non-SR teammate (liter/crown).
 *
 * ASSERTION STYLE: every claim is proved by an event/total DELTA against a counterfactual
 * built with withPatchedOverride (nearest-wrong model), never by a hardcoded damage number.
 * Event filters deliberately avoid damage-event ownership fields (not part of the documented
 * event shape) — ownership is established by "which applies vanish under the counterfactual".
 */

const SLUG = 'd-killer-wife';
const MATES = ['liter', 'crown', 'helm'] as const;

type Ev = SimEvent & Record<string, any>;

function run(opts: any) {
  const events: Ev[] = [];
  const res = runComp({
    ...opts,
    cfg: { ...(opts.cfg ?? {}), onEvent: (ev: Ev) => events.push(ev) },
  });
  return { res, events, t: totals(res) };
}

const comp = (patched?: any) => {
  const o: any = controlComp(SLUG, true);
  if (patched) o.overrides = { ...(o.overrides ?? {}), [SLUG]: patched };
  return o;
};

/**
 * Slot accessor tolerant of both documented shapes (slot -> Block[] on disk, slot ->
 * CharacterSkills{blocks} in memory). Returns the LIVE array so in-place mutation sticks.
 * NOTE: there is no top-level `blocks` on an OverrideFile — patching `ov.blocks` is a no-op.
 */
const slotBlocks = (ov: any, slot: 'skill1' | 'skill2' | 'burst'): any[] =>
  Array.isArray(ov?.[slot]) ? ov[slot] : (ov?.[slot]?.blocks ?? []);

const allBlocks = (ov: any): any[] => [
  ...slotBlocks(ov, 'skill1'),
  ...slotBlocks(ov, 'skill2'),
  ...slotBlocks(ov, 'burst'),
];
const effectsOf = (blocks: any[]) => blocks.flatMap((b: any) => b.effects ?? []);
const hasEffect = (b: any, pred: (e: any) => boolean) => (b.effects ?? []).some(pred);

const applies = (evs: Ev[], stat: string, value?: number) =>
  evs.filter(
    (e) =>
      e.kind === 'buffApply' &&
      e.stat === stat &&
      (value === undefined || Math.abs((e.value ?? NaN) - value) < 1e-6),
  );
const targetsOf = (evs: Ev[]) => new Set(evs.map((e) => e.targetSlug));
const fbCount = (evs: Ev[]) => evs.filter((e) => e.kind === 'fullBurstStart').length;

// ---------------------------------------------------------------------------
// committed override, read-only clone (for structural/spec assertions)
// ---------------------------------------------------------------------------
const OV: any = withPatchedOverride(SLUG, () => {});

// ---------------------------------------------------------------------------
// counterfactuals (nearest-wrong models)
// ---------------------------------------------------------------------------
const pRmGainPierce = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of allBlocks(ov)) b.effects = (b.effects ?? []).filter((e: any) => e.kind !== 'gainPierce');
});

const pRmPierceDmg = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of allBlocks(ov)) b.effects = (b.effects ?? []).filter((e: any) => e.stat !== 'pierceDamagePct');
});

// nearest-wrong trigger identity: "entering Full Burst" mis-read as "when she casts her burst"
const pPierceDmgOnBurstCast = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of allBlocks(ov)) {
    if (hasEffect(b, (e: any) => e.stat === 'pierceDamagePct')) b.trigger = { kind: 'burstCast' };
  }
});

const pRmCdr = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of allBlocks(ov)) b.effects = (b.effects ?? []).filter((e: any) => e.kind !== 'burstCdr');
});

// nearest-wrong threshold: the CDR line keyed to the 5-charge counter instead of 8
const pCdrAt5 = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of allBlocks(ov)) {
    if (hasEffect(b, (e: any) => e.kind === 'burstCdr') && b.trigger && 'count' in b.trigger) {
      b.trigger.count = 5;
    }
  }
});

// nearest-wrong target set: "Affects all allies" mis-scoped to self
const pAtkDmgSelfOnly = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of allBlocks(ov)) {
    if (hasEffect(b, (e: any) => e.stat === 'attackDamagePct' && Math.abs(e.value - 5.06) < 1e-6)) {
      b.target = { kind: 'self' };
    }
  }
});

const pBurstNukeZero = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of slotBlocks(ov, 'burst')) {
    for (const e of b.effects ?? []) if (e.kind === 'flatDamage') e.atkPct = 0;
  }
});

// nearest-wrong: the riders left UNGATED (Wipe Out never inflicted)
const pRmStatus = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of allBlocks(ov)) b.effects = (b.effects ?? []).filter((e: any) => e.kind !== 'targetStatus');
});

// ---------------------------------------------------------------------------
// hoisted runs (each is a full 180s sim) — 9 total
// ---------------------------------------------------------------------------
const base = run(comp());
const rmGainPierce = run(comp(pRmGainPierce));
const rmPierceDmg = run(comp(pRmPierceDmg));
const pierceDmgBurstCast = run(comp(pPierceDmgOnBurstCast));
const rmCdr = run(comp(pRmCdr));
const cdrAt5 = run(comp(pCdrAt5));
const atkDmgSelfOnly = run(comp(pAtkDmgSelfOnly));
const burstNukeZero = run(comp(pBurstNukeZero));
const rmStatus = run(comp(pRmStatus));

describe('d-killer-wife — fixture non-vacuity', () => {
  it('the comp actually reaches Full Burst and she actually deals damage', () => {
    // A lone Burst I would make ZERO full bursts; every FB-keyed assertion below would be vacuous.
    expect(fbCount(base.events)).toBeGreaterThan(0);
    expect(unitOf(base.res, SLUG).totalDamage).toBeGreaterThan(0);
    for (const m of MATES) expect(base.t[m]).toBeGreaterThan(0);
  });

  it('her burst really casts (its status-gated riders fire at least once)', () => {
    // Proves the burst slot is exercised without relying on burstCast event ownership fields.
    expect(applies(base.events, 'coreDamagePct', 16.26).length).toBeGreaterThan(0);
  });
});

describe('d-killer-wife S1a — "Full Charge for 3 time(s)" / self -> Gain Pierce', () => {
  it('is a gainPierce EFFECT on a 3-count full-charge counter targeting self', () => {
    // Discriminates against (a) the static hasPierce boolean flag — which cannot step-gate
    // pierce that only turns on after 3 full charges — and (b) a 5- or 8-count mis-keying.
    const b = allBlocks(OV).find((x: any) => hasEffect(x, (e: any) => e.kind === 'gainPierce'));
    expect(b, 'no gainPierce effect found — a whole-fight hasPierce flag is the wrong primitive').toBeTruthy();
    expect(b.slot).toBe('skill1');
    expect(b.target.kind).toBe('self');
    expect(b.trigger.kind).toBe('chargeCounter');
    const count = Array.isArray(b.trigger.count) ? b.trigger.count[0] : b.trigger.count;
    expect(count).toBe(3);
  });

  it('does not smuggle a whole-fight Pierce tag in via hasPierce', () => {
    // "Gain Pierce for 1 shot" every 3rd full charge is NOT continuous pierce.
    expect(OV.hasPierce ?? false).toBe(false);
  });

  it('is damage-INERT in v1 (pierceDamagePct is documented inert) — teammates byte-identical', () => {
    // Inertness assertion: removing the pierce tag must not move any teammate. If this ever
    // goes red, a Pierce consumer went live and the S1a/S1b pair needs a magnitude test.
    for (const m of MATES) expect(rmGainPierce.t[m]).toBe(base.t[m]);
  });

  it.skip('GAP: "for 1 shot" round-scoped expiry — gainPierce carries only durationSec, no durationShots', () => {
    // No shot-count primitive exists on the gainPierce effect, so the 1-shot window can only be
    // approximated by a durationSec estimate (⚑) — unobservable while pierceDamagePct is inert.
  });
});

describe('d-killer-wife S1b — FB-enter, SR allies, Pierce Damage 13.55% / 10s', () => {
  const evs = () => applies(base.events, 'pierceDamagePct', 13.55);

  it('applies at 13.55 with a finite 10s window (not a permanent buff)', () => {
    expect(evs().length).toBeGreaterThan(0);
    for (const e of evs()) expect(Number.isFinite(e.expiresFrame)).toBe(true);
  });

  it('is WEAPON-scoped to Sniper Rifles — reaches herself + helm, never liter/crown', () => {
    // Discriminating: the nearest-wrong {kind:'allies'} would put liter and crown in the set.
    const tgts = targetsOf(evs());
    expect(tgts.has(SLUG)).toBe(true);
    expect(tgts.has('helm')).toBe(true); // helm is the comp's other SR
    expect(tgts.has('liter')).toBe(false);
    expect(tgts.has('crown')).toBe(false);
  });

  it('is keyed to FULL-BURST ENTRY, not to her own burst cast', () => {
    // "Activates when entering Full Burst" fires on ANY team Full Burst. With a second Burst I
    // (liter) in the comp she does not burst on every rotation, so burstCast under-fires.
    const perTarget = evs().filter((e) => e.targetSlug === SLUG).length;
    expect(perTarget).toBe(fbCount(base.events));

    const wrong = applies(pierceDmgBurstCast.events, 'pierceDamagePct', 13.55).filter(
      (e) => e.targetSlug === SLUG,
    ).length;
    expect(wrong).toBeLessThanOrEqual(perTarget);
  });

  it('is currently damage-inert (pierceDamagePct parsed-but-inert in v1) — nothing moves', () => {
    expect(rmPierceDmg.t[SLUG]).toBe(base.t[SLUG]);
    for (const m of MATES) expect(rmPierceDmg.t[m]).toBe(base.t[m]);
  });
});

describe('d-killer-wife S2a — "Full Charge for 8 time(s)" / all allies -> Burst CD -7s', () => {
  it('is a repeating burstCdr of 7s on all allies (not once-per-battle, not self-only)', () => {
    const b = allBlocks(OV).find((x: any) => hasEffect(x, (e: any) => e.kind === 'burstCdr'));
    expect(b, 'no burstCdr block — the CDR line is a rotation accelerant, not a skip').toBeTruthy();
    expect(b.slot).toBe('skill2');
    expect(b.target.kind).toBe('allies');
    expect(b.trigger.kind).toBe('chargeCounter');
    const count = Array.isArray(b.trigger.count) ? b.trigger.count[0] : b.trigger.count;
    expect(count).toBe(8);
    const eff = (b.effects ?? []).find((e: any) => e.kind === 'burstCdr');
    expect(eff.seconds).toBe(7);
    expect(eff.oncePerBattle ?? false).toBe(false); // kit states no once-per-battle limit
  });

  it('actually accelerates the rotation (removing it never yields MORE full bursts)', () => {
    expect(fbCount(base.events)).toBeGreaterThanOrEqual(fbCount(rmCdr.events));
    // Non-vacuity: the CDR must move the fight at all — an inert CDR means the block is dead code.
    expect(base.t[SLUG]).not.toBe(rmCdr.t[SLUG]);
  });

  it('the 8-charge threshold is load-bearing (firing it at 5 changes the fight)', () => {
    // Discriminates the S2a/S2b threshold swap — the single most likely blind mis-read.
    expect(fbCount(cdrAt5.events)).toBeGreaterThanOrEqual(fbCount(base.events));
    expect(cdrAt5.t[SLUG]).not.toBe(base.t[SLUG]);
  });
});

describe('d-killer-wife S2b — "Full Charge for 5 time(s)" / all allies -> Attack damage 5.06% / 10s', () => {
  const evs = () => applies(base.events, 'attackDamagePct', 5.06);

  it('lands in the Damage-Up bucket as attackDamagePct, never as atkPct', () => {
    // "Attack damage ▲" is the Damage Up bucket; encoding it as atkPct would scale the ATK
    // stat instead and interact differently with every other support buff in the comp.
    expect(evs().length).toBeGreaterThan(0);
    expect(applies(base.events, 'atkPct', 5.06).length).toBe(0);
    for (const e of evs()) expect(Number.isFinite(e.expiresFrame)).toBe(true); // 10s, not permanent
  });

  it('reaches ALL FOUR allies including herself', () => {
    const tgts = targetsOf(evs());
    expect(tgts.has(SLUG)).toBe(true);
    for (const m of MATES) expect(tgts.has(m)).toBe(true);
  });

  it('is keyed to a 5-count full-charge counter, distinct from the 8-count CDR block', () => {
    const b = allBlocks(OV).find((x: any) =>
      hasEffect(x, (e: any) => e.stat === 'attackDamagePct' && Math.abs(e.value - 5.06) < 1e-6),
    );
    expect(b).toBeTruthy();
    expect(b.slot).toBe('skill2');
    expect(b.trigger.kind).toBe('chargeCounter');
    const count = Array.isArray(b.trigger.count) ? b.trigger.count[0] : b.trigger.count;
    expect(count).toBe(5);
    // three SEPARATE counters exist (3 / 5 / 8) — none collapsed into another
    const counts = allBlocks(OV)
      .filter((x: any) => x.trigger?.kind === 'chargeCounter')
      .map((x: any) => (Array.isArray(x.trigger.count) ? x.trigger.count[0] : x.trigger.count));
    expect(new Set(counts)).toEqual(new Set([3, 5, 8]));
  });

  it('re-scoping it to self measurably robs the teammates (proves the ally target set)', () => {
    // Discriminating: under a self-only mis-scope the three mates must lose damage.
    for (const m of MATES) expect(atkDmgSelfOnly.t[m]).not.toBe(base.t[m]);
  });
});

describe('d-killer-wife burst A — 269.28% additional damage + Wipe Out (10s) on the enemy', () => {
  it('carries a flatDamage rider of 269.28% of final ATK', () => {
    const e = effectsOf(slotBlocks(OV, 'burst')).find((x: any) => x.kind === 'flatDamage');
    expect(e, 'burst nuke missing').toBeTruthy();
    expect(e.atkPct).toBeCloseTo(269.28, 2);
    // Burst-cast instant damage lands before the FB window opens -> FB-exempt by timing;
    // an explicit noFb here would double-count the exemption, so it must not be force-set true
    // unless measured (⚑ per-kit noFb is measured-only).
    expect(e.core ?? false).toBe(false); // no "core strike" wording in the kit line
  });

  it('is real damage for HER and inert for everyone else', () => {
    expect(base.t[SLUG]).toBeGreaterThan(burstNukeZero.t[SLUG]);
    for (const m of MATES) expect(burstNukeZero.t[m]).toBe(base.t[m]);
  });

  it('inflicts a named 10s targetStatus authored on an `enemy`-targeted block', () => {
    const b = slotBlocks(OV, 'burst').find((x: any) => hasEffect(x, (e: any) => e.kind === 'targetStatus'));
    expect(b, 'no targetStatus effect — Wipe Out is the gate the whole burst B rider hangs on').toBeTruthy();
    expect(b.target.kind).toBe('enemy'); // validator requires enemy scoping on this channel
    const eff = (b.effects ?? []).find((e: any) => e.kind === 'targetStatus');
    expect(eff.durationSec).toBe(10);
    expect(eff.name).toMatch(/wipe\s*out/i);
  });
});

describe('d-killer-wife burst B — area-dependent riders gated on Wipe Out', () => {
  const statusName = () =>
    (effectsOf(slotBlocks(OV, 'burst')).find((e: any) => e.kind === 'targetStatus') ?? {}).name;

  it('every rider block is name-keyed to the SAME status this burst inflicts', () => {
    // Name-keying is what stops an unrelated kit\'s status from opening this gate.
    const gated = allBlocks(OV).filter((b: any) => b.requiresTargetStatus);
    expect(gated.length).toBeGreaterThan(0);
    for (const b of gated) expect(b.requiresTargetStatus).toBe(statusName());
  });

  it('parts branch: Damage dealt when attacking core 16.26% for 10s, to allies', () => {
    const evs = applies(base.events, 'coreDamagePct', 16.26);
    expect(evs.length).toBeGreaterThan(0);
    for (const e of evs) expect(Number.isFinite(e.expiresFrame)).toBe(true); // 10s window
    // "Affects allies" — a self-only mis-scope would give a single target.
    expect(targetsOf(evs).size).toBeGreaterThanOrEqual(2);
  });

  it('body branch: ATK 12.19% OF THE SKILL USER\'S ATK — caster-scaled, flat-resolved', () => {
    // casterAtkPct re-emits as a FLAT ATK number at apply time, so a buffApply value of 12.19
    // would mean the % was mis-encoded as a plain atkPct-style percentage.
    const mine = applies(base.events, 'casterAtkPct').filter((e) => e.value > 12.19 * 10);
    const gone = applies(rmStatus.events, 'casterAtkPct').filter((e) => e.value > 12.19 * 10);
    const attributable = mine.length - gone.length; // hers = the ones the status gate kills
    const unmodeled = JSON.stringify(OV.unmodeled ?? {});
    // No silent drops: model it, or record the line verbatim in `unmodeled`.
    expect(attributable > 0 || /12\.19/.test(unmodeled)).toBe(true);
    if (attributable > 0) {
      const vals = new Set(mine.map((e) => Math.round(e.value)));
      expect(vals.size).toBe(1); // caster staticAtk is constant -> one flat value
    }
  });

  it('the Wipe Out gate is LIVE both ways (non-vacuity)', () => {
    // Active case asserted above; inactive case here: with no status inflicted the riders must
    // never apply, and the team must measurably lose the buffs.
    expect(applies(rmStatus.events, 'coreDamagePct', 16.26).length).toBe(0);
    for (const m of MATES) expect(rmStatus.t[m]).not.toBe(base.t[m]);
  });

  it.skip('GAP: parts-hit vs body-hit branch selection — the v1 boss is partless', () => {
    // The scope-lock boss exposes core vs non-core only; there is no destructible-part channel
    // and no `requiresNonCore` gate, so the two branches cannot be separated observably. The
    // parts branch is a documented core-proxy; the body branch has no faithful complement gate.
  });

  it.skip('GAP: trigger identity "when ALLIES\' normal attack hits" — triggers are owner-scoped', () => {
    // hitCount/shotFired count the OWNER\'s rounds; there is no cross-unit "any ally hit"
    // trigger, so any encoding under-counts (her shots only) or over-counts (ungated cadence).
  });
});


==========================================================================================
## SECTION 6 — S6 BLIND OVERRIDE (claude-opus-5) + diff vs the DRIVER override
==========================================================================================
CONVERGENCE: the blind override independently arrived at the SAME magnitudes (13.55 / 7 / 5.06 /
269.28 / 16.26 / 12.19) and the SAME mechanisms (SR-scoped FB-enter pierceDamagePct; recurring
burstCdr; attackDamagePct Damage-Up; pre-FB flatDamage nuke; targetStatus gate; flat-resolved
casterAtkPct). DIVERGENCES (all defensible):
  - S1a gainPierce: blind models it (chargeCounter:3 -> gainPierce 1.2s, flagged ⚑ inert); driver
    omits it (inert, documented). Blind's own caveat: "pierceDamagePct is documented as inert in v1
    ... retained verbatim for kit completeness."
  - parts branch coreDamagePct 16.26: blind models it (gated requiresCore + requiresTargetStatus)
    BUT its OWN caveat says "a strict reading would leave the parts branch fully inert ... This dual
    model can OVER-CREDIT when core exposure is high" and its recipe says to "drop [it] to unmodeled"
    when per-hitter targeting is impossible — i.e. the blind writer's strict reading == the driver's
    removal.
  - chargeCounter vs hitCount (S2a/S2b): behavioral-equivalent for an always-full-charge SR.
  - body branch: blind uses trigger hitCount:1 (no requiresCore); driver uses burstCast + requiresCore
    (core-only proxy). Both encode casterAtkPct 12.19 flat-resolved, Wipe-Out-gated; minor proxy shape.
  - nuke noFb:true (blind, explicit) vs timing-based FB-exemption (driver, implicit) — both FB-exempt.
  - targetStatus name "wipeOut" (blind) vs "Wipe Out" (driver) — arbitrary self-consistent name-key.

----- blind override (scripts/kit-autonomy/blind/d-killer-wife.override.json) -----
{
  "slug": "d-killer-wife",
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "chargeCounter",
        "count": 3
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "gainPierce",
          "durationSec": 1.2
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "fullBurstEnter"
      },
      "target": {
        "kind": "alliesOfWeapon",
        "weapon": "SR"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "pierceDamagePct",
          "value": 13.55,
          "durationSec": 10
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "chargeCounter",
        "count": 8
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "burstCdr",
          "seconds": 7
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "chargeCounter",
        "count": 5
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 5.06,
          "durationSec": 10
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
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 269.28,
          "noFb": true
        },
        {
          "kind": "targetStatus",
          "name": "wipeOut",
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "burst",
      "trigger": {
        "kind": "hitCount",
        "count": 1
      },
      "target": {
        "kind": "allies"
      },
      "requiresTargetStatus": "wipeOut",
      "requiresCore": true,
      "effects": [
        {
          "kind": "buff",
          "stat": "coreDamagePct",
          "value": 16.26,
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "burst",
      "trigger": {
        "kind": "hitCount",
        "count": 1
      },
      "target": {
        "kind": "allies"
      },
      "requiresTargetStatus": "wipeOut",
      "effects": [
        {
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 12.19,
          "durationSec": 10
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [],
    "skill2": [],
    "burst": [
      "Buff takes effect depending on the area hit."
    ]
  },
  "caveats": [
    "⚑ skill1 gainPierce is kit-scoped 'for 1 shot' — the engine's gainPierce has only durationSec (no durationShots), so 1.2s is an UNMEASURED stand-in for exactly one full-charge shot (chargeFrames 60 = 1.0s + inter-shot delay). Too long = extra pierce-tagged shots feeding the 13.55% Pierce Damage buff.",
    "⚑ Cadence tuple (pullsPerSec / reloadFrames 141 / chargeFrames 60) is datamined and unreliable, and it drives EVERY threshold in this kit: the 3/5/8-full-charge counters and therefore the team burstCdr rate and the 5.06% uptime. Treat all downstream uptimes as estimates.",
    "⚑ The burst rider block's two branches (parts-hit → coreDamagePct, body-hit → casterAtkPct) are MUTUALLY EXCLUSIVE per ally per hit in-game; the engine has no per-hitter targeting, so both are authored team-wide. The parts branch is gated requiresCore as a documented proxy (the scope-lock boss has no destructible parts; core is the only non-body area the engine models) — a strict reading would leave the parts branch fully inert. This dual model can OVER-CREDIT when core exposure is high.",
    "⚑ 'allies' normal attack hits …' is an ALLY-hit trigger; engine triggers are owner-scoped, so hitCount:1 on the owner is a stand-in that keeps the 10s riders topped up while Wipe Out is live. It couples the riders' uptime to HER cadence, not the team's.",
    "noFb:true on the 269.28% burst hit follows the burst-cast pre-FB convention (a burst cast lands before the FB window opens), not a measurement.",
    "crit on the 269.28% hit is left unset — flat-damage rider crit eligibility is handled by the engine's global rider-crit path; no core (the text says no core strike).",
    "pierceDamagePct is documented as inert in v1 for the static-tag path; retained verbatim for kit completeness and because this kit self-sources a real pierce tag via skill1.",
    "Methodology note (not a value leak): the types.ts requiresTargetStatus comment discusses a 'Wipe Out' status and a core-only proxy for a parts-hit branch. No slug and no magnitudes for this unit appeared, so I did not declare a leak — but the gate choice above was reachable from the schema comment as well as from the prose."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Blind prose→JSON read of D: Killer Wife (SR/Fire/Supporter/Burst I, ammo 6, chargeFrames 60). Full-kit audit: 8 kit lines, 7 IMPLEMENTED, 1 SKIPPED (the descriptive 'depending on the area hit' umbrella, kept verbatim in unmodeled.burst). Key reads: (1) all three 'attacking with Full Charge for N time(s)' lines are chargeCounter triggers (per-block counters at 3 / 5 / 8), NOT intervals or hit counts; (2) the S1 pierce is a step-gated gainPierce EFFECT, never the whole-fight hasPierce flag — it turns on only after 3 full charges and lasts one shot; (3) the FB-enter Pierce Damage buff is weapon-scoped (alliesOfWeapon SR, self included), not all allies; (4) the burst block is enemy-targeted and carries both the 269.28% instant hit and the 10s wipeOut targetStatus that opens the two rider gates; (5) 'ATK ▲12.19% of the skill user's ATK' is casterAtkPct (flat add resolved at apply time), not atkPct. The burstCdr line is recurring (no oncePerBattle) and is this unit's main support channel — its real value hinges entirely on the ⚑ charge cadence."
}

==========================================================================================
## SECTION 7 — DRIVER IMPLEMENTATION under judgment (test + override)
==========================================================================================
----- driver test (scripts/tests/units/d-killer-wife.test.ts) — 18 assertions, all green -----
// PER-UNIT KIT SPEC — `d-killer-wife` (D: Killer Wife, Supporter/SR/Fire, Burst I, cd 20s, ammo 6,
// chargeFrames 60, hitsPerShot 1, normalMult 69.04 / coreMult 200 / chargeMult 250, critRate 15 /
// critDamage 150). The SR/Fire VARIANT of the SMG/Wind base unit `d` — a wholly different kit; the
// two slugs are never conflated (lint: full name "D: Killer Wife" passes NO AMBIGUOUS; the only hit
// is a false-positive on the canonical slug's "d-" prefix).
//
// Kit-autonomy gauntlet 2026-07-25 (driver-authored S2a; tests FIRST; reconciled vs blind S2b
// claude-fable-5). The override under test is the VALIDATED, tuned encoding (kit-status tier
// VALIDATED, evidence "Run G: 0.98-1.11"); this spec pins its faithfulness line-by-line and guards
// the two documented regression fixes (the S2 hitCount parser-bug and the burst parts-branch removal).
//
// One assertion group per KIT LINE (W1..W7 below), asserted against the override loaded from disk.
// `withPatchedOverride` builds COUNTERFACTUALS only (the nearest-wrong reading each assertion must
// discriminate against) — never the encoding under test.
//
// Kit (data/characters.json → characters['d-killer-wife'].skills, levels 10/10/10 — the normalized
// `skills` prose is the SSOT):
//   S1 ■ Full Charge x3 → self: Gain Pierce for 1 shot                                          [W1 UNMODELED]
//      ■ entering Full Burst → all allies with a Sniper Rifle: Pierce Damage ▲13.55% for 10 sec  [W2]
//   S2 ■ Full Charge x8 → all allies: Cooldown of Burst Skill ▼ 7 sec                           [W3]
//      ■ Full Charge x5 → all allies: Attack damage ▲ 5.06% for 10 sec                          [W4]
//   BU ■ nearest enemy: 269.28% of final ATK as additional damage + inflicts Wipe Out 10 sec     [W5]
//      ■ allies' normal attack hits a Wipe-Out area → allies, by area hit:
//          hit parts: Damage dealt when attacking core ▲ 16.26% for 10 sec                      [W6 UNMODELED / skipped-conditional]
//          hit body:  ATK ▲ 12.19% of the skill user's ATK for 10 sec                            [W7]
//
// WHY EACH LINE IS DISPOSITIONED AS IT IS:
//   W1 UNMODELED (inert, documented): "Gain Pierce for 1 shot" every 3 full charges is a SELF pierce
//      TAG (engine `gainPierce` sets pierceUntilFrame, emits NO buffApply). On the partless single-
//      target boss the Pierce tag adds no extra targets; its only effect would be to make a tagged
//      shot eligible for the W2 Pierce Damage ▲ during Full Burst (a small own-damage undercount).
//      The override leaves it out; the S1 SLOT is still active (it emits W2), so this is a specific
//      within-slot skip. PIN: the skill1 slot emits EXACTLY {pierceDamagePct} and no self-tag/damage
//      stat — the documented skip, distinguished from a silent drop or a mis-encoding of the tag.
//   W2 FAITHFUL: fullBurstEnter → alliesOfWeapon SR → pierceDamagePct 13.55/10s. alliesOfWeapon has
//      no excludeSelf, so the SR caster (herself SR) is included. Nearest-wrong: the pre-2026-07-20
//      encoding targeted ALL allies (reached the non-SR ally). The pierceDamagePct buff is APPLIED on
//      FB entry regardless of pierce tags; translating to DAMAGE additionally needs a pierce tag
//      (W1's domain, unmodeled) — so this line is pinned at the buffApply event, not at damage.
//   W3 FAITHFUL (no event — observed via team Full-Burst cadence): hitCount 8 → all allies → burstCdr
//      7s. `burstCdr` directly lowers burstCdFrames and emits NO event, so it is only observable
//      downstream. The 2026-07-16 PARSER-BUG FIX: this line previously parsed as shotFired → the 7s
//      team CDR fired on EVERY shot (~105×/fight), FLOODING cooldowns. Now hitCount 8 → ~floor(shots/8)
//      firings. PIN: the shipped model completes a bounded team FB cadence; the every-shot parser-bug
//      counterfactual completes STRICTLY MORE Full Bursts (flooded). hitCount counts the unit's OWN
//      shots; an SR full-charges every pull, so hitCount 8 ≈ every 8 full charges (matches the kit).
//   W4 FAITHFUL: hitCount 5 → all allies → attackDamagePct 5.06/10s. Fires floor(shots/5)× over the
//      fight, each firing reaching all 3 allies (the buff refreshes its 10s window). Nearest-wrong:
//      hitCount 1 (≈ the same parser-bug class) → fires every shot. PIN: distinct firing frames ===
//      floor(shots/5); the hitCount-1 counterfactual fires far more.
//   W5 FAITHFUL: burstCast → enemy → flatDamage 269.28 (the lv10 magnitude, not the lv1 159.12) +
//      targetStatus "Wipe Out" 10s. The nuke lands once per cast in the burst bucket BEFORE the Full
//      Burst window opens, so it never takes the +50% FB major (verified engine convention). The Wipe
//      Out status emits NO event but is the gate that opens W7 (block order is load-bearing: the
//      status-inflicting burst block precedes the W7 gated block, both fire on the same burstCast
//      frame, so the gate reads a status written earlier that frame).
//   W6 UNMODELED / skipped-conditional (out-of-domain): the PARTS branch "coreDamagePct ▲16.26%" is
//      parts-gated — on the partless v1 scope-lock boss no ally can hit parts, so it can never be
//      earned. It was previously modeled as an UNGATED all-ally coreDamagePct buff, which OVER-CREDITED
//      every ally's core bucket (core hits DO exist on a partless boss's core). The 2026-07-17 fix
//      REMOVED it (repo convention for v1-partless-inert lines, cf. brid's Wind-Code debuffs). PIN: the
//      burst slot emits NO coreDamagePct; re-adding the ungated parts branch (counterfactual) makes
//      coreDamagePct appear and lifts every ally's total — i.e. the shipped encoding is the one that
//      does NOT over-credit. Re-enable only for a boss with destructible parts (OUT OF SCOPE for v1);
//      ⚑ needs a parts-hit trigger + destructible-part modeling (estimate: small own-comp core bucket;
//      recipe: requiresTargetStatus 'Wipe Out' + parts-hit trigger; tier: out-of-domain/v1-partless).
//   W7 FAITHFUL (gated): burstCast → all allies → casterAtkPct 12.19 (% of caster ATK), gated on
//      requiresTargetStatus "Wipe Out" ONLY. casterAtkPct resolves to flat ATK = (12.19/100)×caster.
//      staticAtk. Fires once per cast (the Wipe Out gate is satisfied same-frame by W5's status block),
//      reaching all 3 allies for 10s. [2026-07-25 reconciling-judge REAL-GOTCHA fix] this block previously
//      ALSO carried requiresCore:true — a STRANDED parts→core proxy gate left behind when the parts branch
//      was deleted (2026-07-17). That inverted the kit: "Allies that hit the BODY" = non-core on the
//      partless boss, so the body branch must be MAXIMALLY live at coreHitRate 0 (every hit is a body
//      hit), NOT gated out. requiresCore was REMOVED; the gate is now Wipe Out alone, so the body branch
//      fires IDENTICALLY at coreHitRate 0 and 1 — pinned below. (The requiresCore proxy now belongs only
//      on the parked W6 parts branch, where it will gate the parts→core mapping once parts are modeled.)
//      The requiresTargetStatus gate is FAITHFUL but in-fixture-neutral (her burst ALWAYS inflicts Wipe Out
//      same-frame, so removing the gate changes nothing here); it matters for the future W6 parts wiring
//      and for comps where the status could be absent — documented, not asserted as a damage discriminator.
//
// FIXTURE: d-killer-wife is BURST I, so the B3-carry controlComp does not apply. Custom 3-unit chain
// d-killer-wife(B1,SR slot 0) / crown(B2,MG slot 1) / helm(B3,SR slot 2), boss Fire (d-killer-wife Fire
// is neutral vs Fire — clean), focus d-killer-wife (×2.5 charge gauge so she casts often). One unit per
// burst stage → a clean B1→B2→B3 chain that completes Full Bursts. The weapon split is deliberate: SR
// allies = {d-killer-wife slot 0, helm slot 2}, non-SR ally = {crown slot 1 (MG)} — exactly what the W2
// SR-scoping discrimination needs. Deterministic (no seed → EV pass, byte-stable totals). Measured base:
// d-killer-wife 105 shots / 13 casts, team 6 Full Bursts.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
/** Fixture slot order: d-killer-wife 0 / crown 1 / helm 2. */
const DKW = 0;
const CROWN = 1;
const HELM = 2;
const SR_ALLIES = [DKW, HELM]; // SR wielders in the fixture
const ALL_ALLIES = [DKW, CROWN, HELM];

const comp = {
  slugs: ['d-killer-wife', 'crown', 'helm'],
  bossElement: 'Fire' as const,
  focusSlug: 'd-killer-wife',
};

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(
  overrides: Record<string, any> = {},
  cfg: Record<string, any> = {},
) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...comp,
    overrides,
    cfg: { onEvent: (e) => events.push(e), ...cfg },
  });
  return { events, totals: totals(res), res };
}

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const dkwShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'd-killer-wife');
const dkwCasts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'd-killer-wife',
  );
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart');
const castFrames = (evs: SimEvent[]) =>
  dkwCasts(evs)
    .map((c) => c.frame)
    .sort((a, b) => a - b);
const fbFrames = (evs: SimEvent[]) =>
  fbStarts(evs)
    .map((e) => e.frame)
    .sort((a, b) => a - b);
/** d-killer-wife-caster buffs, optionally filtered to a slot (via the buff key `<caster>:<slot>:…`). */
const dkwBuffs = (evs: SimEvent[], slot?: 'skill1' | 'skill2' | 'burst') =>
  buffs(evs).filter(
    (b) =>
      b.casterIdx === DKW &&
      (slot == null || b.key.startsWith(`${DKW}:${slot}:`)),
  );
const distinctFrames = (bs: BuffApply[]) =>
  [...new Set(bs.map((b) => b.frame))].sort((a, b) => a - b);
const targetsOf = (bs: BuffApply[]) =>
  [...new Set(bs.map((b) => b.targetIdx))].sort(
    (a, b) => (a ?? -1) - (b ?? -1),
  );
const dursOf = (bs: BuffApply[]) => [
  ...new Set(
    bs.map((b) => (b.expiresFrame == null ? null : b.expiresFrame - b.frame)),
  ),
];

// ---- counterfactual patches (nearest-wrong readings) -----------------------------------------
/** W2 nearest-wrong: the pre-2026-07-20 encoding — Pierce Damage to ALL allies (reaches the MG). */
const cfPierceAll = withPatchedOverride('d-killer-wife', (ov: any) => {
  const b = ov.skill1.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'pierceDamagePct'),
  );
  if (!b)
    throw new Error(
      'd-killer-wife S1 pierceDamagePct block missing — fixture is stale',
    );
  b.target = { kind: 'allies' };
});
/** W3 nearest-wrong: the 2026-07-16 parser bug — team Burst CDR firing on EVERY shot (shotFired). */
const cfCdrEveryShot = withPatchedOverride('d-killer-wife', (ov: any) => {
  const b = ov.skill2.find((x: any) =>
    x.effects.some((e: any) => e.kind === 'burstCdr'),
  );
  if (!b)
    throw new Error(
      'd-killer-wife S2 burstCdr block missing — fixture is stale',
    );
  b.trigger = { kind: 'shotFired' };
});
/** W4 nearest-wrong: the same parser-bug class — Attack Damage firing every shot (hitCount 5 → 1). */
const cfAtkEveryShot = withPatchedOverride('d-killer-wife', (ov: any) => {
  const b = ov.skill2.find(
    (x: any) =>
      x.trigger?.kind === 'hitCount' &&
      x.effects.some((e: any) => e.stat === 'attackDamagePct'),
  );
  if (!b)
    throw new Error(
      'd-killer-wife S2 attackDamagePct block missing — fixture is stale',
    );
  b.trigger.count = 1;
});
/** W5 nearest-wrong: the lv1 burst magnitude 159.12 instead of the lv10 269.28. */
const cfNukeLv1 = withPatchedOverride('d-killer-wife', (ov: any) => {
  const b = ov.burst.find((x: any) =>
    x.effects.some((e: any) => e.kind === 'flatDamage'),
  );
  if (!b)
    throw new Error(
      'd-killer-wife burst flatDamage block missing — fixture is stale',
    );
  b.effects.find((e: any) => e.kind === 'flatDamage').atkPct = 159.12;
});
/** W6 nearest-wrong: re-add the REMOVED ungated parts branch (all-ally coreDamagePct 16.26) — the
 *  pre-2026-07-17 over-credit. */
const cfPartsReadded = withPatchedOverride('d-killer-wife', (ov: any) => {
  ov.burst.push({
    slot: 'burst',
    trigger: { kind: 'burstCast' },
    target: { kind: 'allies' },
    effects: [
      { kind: 'buff', stat: 'coreDamagePct', value: 16.26, durationSec: 10 },
    ],
  });
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const pierceAll = run({ 'd-killer-wife': cfPierceAll });
const cdrEveryShot = run({ 'd-killer-wife': cfCdrEveryShot });
const atkEveryShot = run({ 'd-killer-wife': cfAtkEveryShot });
const nukeLv1 = run({ 'd-killer-wife': cfNukeLv1 });
const partsReadded = run({ 'd-killer-wife': cfPartsReadded });
// W7 gate-DIRECTION probe: OFF-BASIS coreHitRate 0 (the scope-lock basis is coreHitRate 1). The body
// branch is gated on Wipe Out ONLY (no requiresCore — that stranded proxy was removed 2026-07-25), so
// it must fire IDENTICALLY at coreHitRate 0 and 1: "hit the body" = non-core, maximally live when no
// core hits exist. A regression that re-adds requiresCore would gate it out here (0 apps) — caught.
const core0 = run({}, { coreHitRate: 0 });

const shots = dkwShots(base.events).length;
const casts = dkwCasts(base.events).length;
const fbs = fbStarts(base.events).length;
const dkwStaticAtk = base.res.units[DKW].staticAtk;

describe('d-killer-wife — kit spec', () => {
  describe('fixture sanity — she casts, the team completes Full Bursts, a cast precedes the FB it opens', () => {
    it('d-killer-wife casts >0 bursts and the team completes >0 Full Bursts', () => {
      expect(casts).toBeGreaterThan(0);
      expect(fbs).toBeGreaterThan(0);
    });
    it('her cast frames are distinct from Full-Burst-start frames (a cast lands before the FB it opens)', () => {
      const cf = castFrames(base.events);
      const fs = fbFrames(base.events);
      expect(cf.every((f) => !fs.includes(f))).toBe(true);
    });
  });

  describe('W1 — S1 "Gain Pierce for 1 shot" (self, every 3 full charges) is UNMODELED (inert on partless boss)', () => {
    it('PIN: the skill1 slot emits EXACTLY {pierceDamagePct} — no self pierce-tag / damage stat', () => {
      const stats = [
        ...new Set(dkwBuffs(base.events, 'skill1').map((b) => b.stat)),
      ].sort();
      expect(stats).toEqual(['pierceDamagePct']);
    });
  });

  describe('W2 — S1 entering Full Burst → SR allies: Pierce Damage ▲13.55% for 10 sec', () => {
    const pierce = dkwBuffs(base.events, 'skill1').filter(
      (b) => b.stat === 'pierceDamagePct',
    );
    it('is 13.55%, fires on every Full Burst entry, for 10 sec', () => {
      expect(pierce.length).toBeGreaterThan(0);
      expect([...new Set(pierce.map((b) => b.value))]).toEqual([13.55]);
      expect(distinctFrames(pierce)).toEqual(fbFrames(base.events)); // once per FB entry
      expect(dursOf(pierce)).toEqual([10 * FPS]);
    });
    it('reaches ONLY the Sniper-Rifle allies (herself + helm), never the MG', () => {
      expect(targetsOf(pierce)).toEqual(SR_ALLIES);
      expect(targetsOf(pierce)).not.toContain(CROWN);
    });
    it('DISCRIMINATING: the all-allies encoding (pre-2026-07-20) would reach the MG too', () => {
      const cf = dkwBuffs(pierceAll.events, 'skill1').filter(
        (b) => b.stat === 'pierceDamagePct',
      );
      expect(targetsOf(cf)).toEqual(ALL_ALLIES);
      expect(targetsOf(cf)).toContain(CROWN);
    });
  });

  describe('W3 — S2 Full Charge x8 → all allies: Burst CDR ▼7 sec (no event; observed via FB cadence)', () => {
    it('the shipped hitCount-8 model completes a bounded team Full-Burst cadence', () => {
      expect(fbs).toBe(6); // measured: hitCount 8 → ~floor(105/8) CDR firings, 6 team FBs
    });
    it('DISCRIMINATING: the every-shot parser bug FLOODS cooldowns → strictly more Full Bursts', () => {
      const cfFbs = fbStarts(cdrEveryShot.events).length;
      expect(cfFbs).toBeGreaterThan(fbs);
    });
  });

  describe('W4 — S2 Full Charge x5 → all allies: Attack damage ▲5.06% for 10 sec', () => {
    const atk = dkwBuffs(base.events, 'skill2').filter(
      (b) => b.stat === 'attackDamagePct' && b.value === 5.06,
    );
    it('fires floor(shots/5)× (every 5 of her own full charges), reaching all 3 allies for 10 sec', () => {
      expect(atk.length).toBeGreaterThan(0);
      expect(distinctFrames(atk).length).toBe(Math.floor(shots / 5));
      // every firing reaches all three allies
      for (const f of distinctFrames(atk))
        expect(atk.filter((b) => b.frame === f).length).toBe(3);
      expect(targetsOf(atk)).toEqual(ALL_ALLIES);
      expect(dursOf(atk)).toEqual([10 * FPS]);
    });
    it('DISCRIMINATING: hitCount 1 (parser-bug class) fires every shot — far more firings', () => {
      const cf = dkwBuffs(atkEveryShot.events, 'skill2').filter(
        (b) => b.stat === 'attackDamagePct' && b.value === 5.06,
      );
      expect(distinctFrames(cf).length).toBeGreaterThan(
        distinctFrames(atk).length,
      );
    });
  });

  describe('W5 — Burst: 269.28% of final ATK additional damage + inflicts Wipe Out 10 sec', () => {
    const nukes = dmg(base.events).filter(
      (d) => d.slug === 'd-killer-wife' && d.srcSlot === 'burst',
    );
    it('lands once per cast at the lv10 magnitude, in the burst bucket', () => {
      expect(nukes.length).toBe(casts);
      expect(nukes.length).toBeGreaterThan(0);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([269.28]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
    });
    it('never takes the +50% Full Burst major (the cast lands before the FB window opens)', () => {
      expect(nukes.filter((d) => d.fbMajorApplied).map((d) => d.sec)).toEqual(
        [],
      );
    });
    it('DISCRIMINATING: the lv1 magnitude 159.12 is NOT the shipped value', () => {
      const cf = dmg(nukeLv1.events).filter(
        (d) => d.slug === 'd-killer-wife' && d.srcSlot === 'burst',
      );
      expect([...new Set(cf.map((d) => d.atkPct))]).toEqual([159.12]);
      expect([...new Set(nukes.map((d) => d.atkPct))]).not.toEqual([159.12]);
    });
  });

  describe('W6 — Burst parts branch "coreDamagePct ▲16.26%" is UNMODELED (skipped-conditional, out-of-domain)', () => {
    it('PIN: the burst slot emits NO coreDamagePct (the ungated over-credit was removed 2026-07-17)', () => {
      const burstStats = [
        ...new Set(dkwBuffs(base.events, 'burst').map((b) => b.stat)),
      ].sort();
      expect(burstStats).not.toContain('coreDamagePct');
      expect(burstStats).toEqual(['casterAtkPct']); // body branch (W7) is the only burst buff
    });
    it('DISCRIMINATING: re-adding the ungated parts branch makes coreDamagePct appear and lifts every total', () => {
      const cfCore = buffs(partsReadded.events).filter(
        (b) => b.stat === 'coreDamagePct',
      );
      expect(cfCore.length).toBeGreaterThan(0);
      for (const s of comp.slugs)
        expect(partsReadded.totals[s]).toBeGreaterThan(base.totals[s]);
    });
  });

  describe('W7 — Burst body branch → all allies: ATK ▲12.19% of caster ATK for 10 sec (gated)', () => {
    const body = dkwBuffs(base.events, 'burst').filter(
      (b) => b.stat === 'casterAtkPct',
    );
    it('fires once per cast, reaching all 3 allies for 10 sec, on her cast frames', () => {
      expect(body.length).toBeGreaterThan(0);
      expect(distinctFrames(body)).toEqual(castFrames(base.events)); // once per own cast
      expect(targetsOf(body)).toEqual(ALL_ALLIES);
      expect(dursOf(body)).toEqual([10 * FPS]);
    });
    it("is 12.19% of the caster's ATK (casterAtkPct resolves to flat ATK)", () => {
      const expected = (12.19 / 100) * dkwStaticAtk;
      for (const b of body) expect(b.value).toBeCloseTo(expected, 6);
    });
    it('GATE DIRECTION: NOT core-gated — fires identically at coreHitRate 0 and 1 (body = non-core)', () => {
      // "Allies that hit the body" = non-core on the partless boss, so the body branch is MAXIMALLY
      // live at coreHitRate 0 (every hit is a body hit). The gate is Wipe Out alone. A regression that
      // re-adds the stranded requiresCore proxy would gate it OUT at coreHitRate 0 — this catches it
      // (the S7 reconciling-judge REAL-GOTCHA: requiresCore inverts the kit's body condition).
      const atCore0 = dkwBuffs(core0.events, 'burst').filter(
        (b) => b.stat === 'casterAtkPct',
      );
      expect(atCore0.length).toBeGreaterThan(0);
      expect(atCore0.length).toBe(body.length); // unchanged by core exposure → gate is Wipe Out, not core
    });
  });
});


----- driver override (src/skills/overrides/d-killer-wife.json) — VALIDATED, tuned -----
{
  "note": "Tier audit (Bossing A). PARSER BUG FIXED: S2's 'Activates when attacking with Full Charge for 8 time(s)' (and 5 times) parsed as shotFired -> the team burst-CDR 7s fired on EVERY shot, flooding cooldowns (an SR fires ~120 shots/fight; real cadence is ~once per rotation per Prydwen: '8 Full Charges ... roughly once per rotation'). Now hitCount 8 -> team burstCdr 7, hitCount 5 -> team Attack Damage 5.06%/10s (~permanent, matching the review). S1 (FB-enter Pierce Damage 13.55%/10s team) parser-faithful, kept in parser. Burst kept in parser: 269.28% nuke; the Wipe-Out area-hit riders parse approximately (hitCount-gated). [2026-07-17 PARTS-BRANCH FIX] the PARTS branch (coreDamagePct 16.26, 'Allies that hit parts') was NOT inert as previously assumed — it was a live all-ally core-bucket over-credit on the partless boss; now REMOVED (SKIPPED-CONDITIONAL, see caveat). The BODY branch (casterAtkPct 12.19, 'Allies that hit the body') is correct and KEPT. [materialized 2026-07-16: skill1/burst auto-filled from the offline parser (blablalink prose) — behavior-identical to the prior runtime parse; NOT hand-verified] [re-materialized 2026-07-16: burst re-frozen with the upgraded offline parser (skill-user's-ATK→casterAtkPct, used-their-Burst→burstCasters, Reload Speed stat, DEF→defPct, shield event) — still NOT hand-verified] [Kit-autonomy gauntlet 2026-07-25: test-first faithfulness re-audit (scripts/tests/units/d-killer-wife.test.ts, 18 assertions W1-W7 over a custom B1 chain dkw/crown/helm) confirmed this VALIDATED encoding faithful line-by-line — S1-B FB-enter SR Pierce 13.55, S2-A hitCount8 burstCdr 7, S2-B hitCount5 attackDamagePct 5.06, burst 269.28 nuke + Wipe Out, body-branch casterAtkPct 12.19 (Wipe-Out-gated). Cross-family S2b (claude-fable-5) converged; blind S5/S6/S7 (claude-opus-5) reconciled. The S7 reconciling judge ruled ONE REAL-GOTCHA (ENCODING, low): the body branch carried a STRANDED requiresCore:true gate (the parts→core proxy left behind when the parts branch was deleted 2026-07-17), inverting 'Allies that hit the body' (= non-core on the partless boss). FIXED: requiresCore REMOVED from the body branch (board-inert at scope-lock coreHitRate 1 — byte-identical totals); the proxy is re-pointed onto the parked parts branch where it belongs. Residual ⚑: S1-A self 'Gain Pierce for 1 shot' left unmodeled — damage-inert on the partless scope-lock boss (pierce tag adds no targets); the burst parts-branch coreDamagePct 16.26 stays skipped-conditional (out-of-domain, needs destructible-part modeling).]",
  "unmodeled": {
    "skill1": [
      "■ Activates when attacking with Full Charge for 3 time(s). Affects self.",
      "Gain Pierce for 1 shot."
    ],
    "skill2": [],
    "burst": [
      "Buff takes effect depending on the area hit — the PARTS branch ('Allies that hit parts: Damage dealt when attacking core ▲16.26%/10s') is unmodeled (TODO: needs destructible-part modeling; core-only proxy for now — see caveats)."
    ]
  },
  "caveats": [
    "burst: unrecognized target \"allies\" — applied to all allies",
    "skill1: Full Burst Pierce Damage ▲13.55% now targets alliesOfWeapon SR (fixed 2026-07-20, kit-audit Phase C ENACT-NOW — kit targets only Sniper-Rifle-wielding allies). d-killer-wife is herself SR so keeps it; the only board effect was removing the spurious buff from grave (AR, Pierce-tagged during her Prediction window in comp N1), cooling that over-modeled HOT unit grave 1.179→1.162. Fable pre-op APPROVED.",
    "skill1: the self 'Gain Pierce for 1 shot' (every 3 full charges) is unmodeled — on a partless single-target boss the Pierce tag adds no targets, but a tagged shot would become eligible for the Pierce Damage ▲13.55% Damage-Up during Full Burst (small own-damage undercount)",
    "burst: the body-branch ATK buff (casterAtkPct 12.19%, 'Allies that hit the body') is GATED on the Wipe Out status: her burst inflicts targetStatus 'Wipe Out' (10s window) and the buff fires at burstCast for that window with requiresTargetStatus 'Wipe Out'. Faithful to '≈71% uptime = 10s Wipe Out of a ~14s rotation'; 12.19 is the kit value, not tuned. Block order matters and is load-bearing: the status-inflicting block precedes the gated block in the burst array, and both fire on the same burstCast frame, so the gate reads a status written earlier that same frame. [2026-07-25 kit-autonomy gauntlet, reconciling-judge REAL-GOTCHA fix] this block previously ALSO carried requiresCore:true — a stranded parts→core proxy gate left behind when the parts branch was deleted (2026-07-17). That inverted the kit: 'Allies that hit the BODY' = non-core on the partless boss, so the body branch must be LIVE whenever Wipe Out is up (maximally live at coreHitRate 0, where every hit is a body hit), NOT gated OUT by requiresCore. requiresCore was REMOVED from this block (board-inert at the scope-lock coreHitRate 1 — byte-identical totals). The requiresCore proxy now belongs ONLY on the parked parts branch (below), where it will gate the parts→core mapping once destructible parts are modeled. TODO PARTS: the parts branch 'Allies that hit parts → coreDamagePct 16.26%' still needs destructible-part modeling (currently core is the only modelable 'area'); wire it as requiresTargetStatus 'Wipe Out' + requiresCore (parts→core proxy) + a parts-hit trigger when parts enter scope.",
    "burst: [SKIPPED-CONDITIONAL, fixed 2026-07-17] the parts branch 'Allies that hit parts: Damage dealt when attacking core ▲16.26%/10s' is parts-gated — on the partless v1 scope-lock boss no ally can hit parts, so it can never be earned. It was previously modeled as an ungated all-ally coreDamagePct buff, which over-credited every ally's core bucket (core hits DO exist on a partless boss's core). Now REMOVED from the effects array (repo convention for v1-partless-inert lines, cf. brid's Wind-Code debuffs); the body branch 'Allies that hit the body: ATK ▲12.19% of skill user's ATK' (casterAtkPct, always active on the partless body) is KEPT. Re-enable the parts branch (as a parts-hit-gated coreDamagePct) only for a boss with destructible parts (OUT OF SCOPE for v1)."
  ],
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "fullBurstEnter"
      },
      "target": {
        "kind": "alliesOfWeapon",
        "weapon": "SR"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "pierceDamagePct",
          "value": 13.55,
          "durationSec": 10
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "hitCount",
        "count": 8
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "burstCdr",
          "seconds": 7
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "hitCount",
        "count": 5
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 5.06,
          "durationSec": 10
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
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 269.28
        },
        {
          "kind": "targetStatus",
          "name": "Wipe Out",
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
        "kind": "allies"
      },
      "requiresTargetStatus": "Wipe Out",
      "effects": [
        {
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 12.19,
          "durationSec": 10
        }
      ]
    }
  ]
}


==========================================================================================
## YOUR TASK
==========================================================================================
Adjudicate per the Section-1 contract. Decide for EACH kit line whether the driver override is
FAITHFUL to the Section-3 ground truth under the Section-2 mechanics SSOT. Rule on whether ANY of
the 6 blind-test reds (Section 5) is a REAL-GOTCHA (a genuine faithfulness error in the driver
override) versus a defensible modeling divergence (inert-line omission / over-credit removal /
primitive-name / fixture-leak). Confirm the ⚑s (parts-branch out-of-domain; S1a inert; body-branch
proxy) carry estimate+recipe+tier. Emit the binding verdict JSON.
