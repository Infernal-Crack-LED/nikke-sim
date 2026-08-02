# S7 RECONCILING-JUDGE PACKET — neve (Neve)

Driver: Qwen. Cross-family blind roles: S2b claude-fable-5, S5/S6 claude-opus-5. Binding judge: kimi-code/k3 (you).
Date: 2026-08-02. Unit: neve — SG / Attacker / Water / Burst III, cd 40s, ammo 9, hitsPerShot 10.

## DRIVER CONVERGENCE SUMMARY (orienting context — grade the artifacts below vs ground truth, do not trust this summary)
- All 5 load-bearing kit lines independently derived identically by the blind S6 override-writer and the driver: S1 interval-10s enemy flatDamage 145.45; S2 fullBurstEnter/self atkPct 124.8 durationShots:2 + gainPierce(2-round ⚑); burst burstCast/self critRatePct 31.95/20s + hitRatePct 22.04/20s.
- Tier 2 (round-count durationShots + fullBurstEnter-vs-burstCast trigger discrimination), exercised on the dual-B3 controlComp('neve').
S5 BLIND TEST RUN vs DRIVER OVERRIDE (run UNMODIFIED — copied verbatim into scripts/tests/units/ so its relative '../lib/harness.js' import resolves; temp copy removed after): 12 PASSED / 5 SKIPPED / 1 RED.
- The 5 skips are the blind model's own ALWAYS-⚑ gaps and match the driver's dispositions 1:1 (S1 cadence not in kit text; lowest-HP enemy unobservable on single boss; gainPierce has no round-count primitive; no Pierce Damage carrier in comp; hitRate->core magnitude measured-only).
- The 1 RED is a FALSE-RED / blind over-assertion, NOT a driver-override divergence: blind line 353 asserts others(hitRateZero).toEqual(others(base)) — perfect teammate isolation when neve's SELF hitRatePct is zeroed. The engine's deterministic EV pass couples SG hitRate->core-geometry into teammate totals by <0.5% (probe: neve base 219.3M / hrZero 202.7M / critZero 202.3M; critZero's others() PASSES, so ONLY the hitRate->SG-core path couples — an engine EV artifact, not a buff leak). The buff is proven self-only (blind 'both buffs are self-only' PASSED; driver N6 targetIdx===NEVE PASSED). The driver test deliberately pins only the buffApply event for hitRate (stat/value/duration/target/cadence) and does NOT assert perfect isolation or a damage delta, correctly avoiding this trap. All kit-faithfulness claims in the blind test PASSED.

SUBSTANTIVE DIFFERENCES (blind S6 vs driver):
1. skill1 target: DRIVER {kind:'enemy'} (CORRECT — kit "Affects 1 enemy unit") vs BLIND {kind:'self'} (mis-scope; damage-NEUTRAL because flatDamage always resolves to the single boss — there is no enemy entity, resolveTargets({kind:'enemy'}) returns []). Driver is more faithful.
2. skill1 flatDamage crit: DRIVER bare (engine default crit:true) vs BLIND explicit crit:true — damage-EQUIVALENT.
3. skill2 gainPierce durationSec: DRIVER 2 vs BLIND 2.4 — BOTH flagged ⚑ rounds->seconds estimates (gainPierce has no round granularity); damage-INERT (pierceDamagePct inert in v1, no Pierce Damage carrier). Equivalent approach, trivially different number.
IDENTICAL: skill2 atkPct 124.8 durationShots:2 (fullBurstEnter/self); entire burst block (burstCast/self, critRatePct 31.95/20s + hitRatePct 22.04/20s); no top-level hasPierce; unmodeled all empty.

---
## SECTION 1 — RECONCILING-JUDGE CONTRACT (your role + return JSON shape)

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


---
## SECTION 2 — MECHANICS SSOT (formula + mechanics source of truth)

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
confirmed). **`flavor:"true"` (true-damage) dots crit too** (owner ruling 2026-07-25, in-game
confirmed; reverses the 2026-07-21 "true damage cannot crit" ruling — recorded but never implemented:
there is no `crit && !trueFlavor` guard; ada's grenade DoT crits at the caster rate). A dot's
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
ON by default (`DOT_CRIT`, U13 2026-07-21). **TRUE DAMAGE CAN CRIT** (owner ruling 2026-07-25,
in-game confirmed; reverses the 2026-07-21 "true damage never crits" ruling — which was recorded
but never implemented in the engine: there is no `crit && !trueFlavor` guard, `dealDamage` gates crit on
`opts.crit` alone. So `flavor:"true"` dots/flatDamage + `trueNormals` windows crit at the caster's rate
like any other hit. Sustained/True/Sequential Damage ▲ buffs gate on hit flavor.
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
## SECTION 3 — GROUND TRUTH: neve kit prose + base stats (data/characters.json → characters.neve)

```json
{
  "slug": "neve",
  "name": "Neve",
  "weapon": "SG",
  "class": "Attacker",
  "element": "Water",
  "burst": "III",
  "burstCooldownSec": 40,
  "ammo": 9,
  "hitsPerShot": 10,
  "reloadFrames": 111,
  "chargeFrames": 0,
  "normalAttackMultiplier": 201.5,
  "coreAttackMultiplier": 200,
  "burstGaugePerShot": 2,
  "skillCooldownsSec": {
    "skill1": 10,
    "skill2": null,
    "burst": 40
  },
  "skills": {
    "skill1": "■ Affects 1 enemy unit(s) with the lowest remaining HP. \nDeals 145.45% of final ATK as damage.",
    "skill2": "■ Activates when entering Full Burst. Affects self.\nGain Pierce for 2 round(s).\nATK ▲ 124.8% for 2 round(s).",
    "burst": "■ Affects self. \nCritical Rate ▲ 31.95% for 20 sec. \nHit Rate ▲ 22.04% for 20 sec."
  },
  "baseStats": {
    "hp": 10350,
    "atk": 540,
    "def": 78,
    "core": {
      "hp": 200,
      "atk": 200,
      "def": 200
    },
    "grade": {
      "hp": 2300,
      "atk": 18,
      "def": 90,
      "ratio": 200
    },
    "critRate": 15,
    "maxLevel": 1200,
    "critDamage": 150,
    "resourceId": 193
  },
  "shot_detail_rate_of_fire": 90
}
```

---
## SECTION 4 — S2b PRE-OP TEST-FAITHFULNESS REVIEW (claude-fable-5)

```json
{
  "slug": "neve",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "■ Affects 1 enemy lowest HP; 145.45% dmg",
      "disposition": "FAITHFUL",
      "scope": "Standalone flat-damage rider (% of final ATK), not a stat buff; per methodology #9 it takes the +50% Full Burst by landing timing (noFb default OFF), crits at caster's sheet rate (RIDERCRIT), gets NO core (text never says core strike), and is range-excluded (noRange on riders).",
      "durationSemantics": "Instant hit, no duration.",
      "triggerIdentity": "The line has NO activation clause ('Affects…' + a damage sentence only) → per the taxonomy this is an INTERVAL trigger (internal cooldown). The interval seconds are NOT in the kit text — ALWAYS-⚑ field #2 (a damage line the text gives no trigger for): the cadence must be a flagged ⚑ estimate or a datamined skill CD, never a silent invention. First-fire phase (t=sec vs t=0) is itself a ⚑ convention.",
      "targetSet": "Enemy ('1 enemy unit with the lowest remaining HP'). Single partless boss → the lowest-HP selection clause is inert; target resolves to the boss.",
      "nearestWrongModel": "Two plausible misreads: (a) inventing a per-shot/hitCount or burstCast trigger instead of interval — cadence then scales with fire rate or burst rotation instead of wall clock; (b) misreading 'lowest remaining HP' as an ALLY target (schema has alliesLowestHp) and emitting an ally-targeted effect instead of enemy damage.",
      "distinguishingAssertion": "runComp(controlComp('neve')) with cfg.onEvent: collect damage events from neve whose mult===145.45 (skill1 bucket). GREEN-faithful: count === floor(180/intervalSec) and inter-fire gaps are constant wall-clock, uncorrelated with shot events, burstCast events, or fullBurstStart events. RED-nearest-wrong: (a) count tracks neve's shot count or equals her ~4 own burst casts; (b) zero such damage events but a spurious buffApply with targetIdx pointing at an ally slot.",
      "inertness": "Must emit NO buffApply (it is pure damage); must not move any teammate's total; count must not change when the comp's FB cadence changes (interval is wall-clock).",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "■ Entering Full Burst; ATK ▲124.8% 2 rd",
      "disposition": "FAITHFUL",
      "scope": "Generic ATK buff (atkPct — scales own ATK; no 'of caster's ATK' phrasing so NOT casterAtkPct flat-add).",
      "durationSemantics": "'for 2 round(s)' is a ROUND count → durationShots: 2 with NO durationSec. A round for this SG = one trigger pull (hitsPerShot 10 pellets ≠ 10 rounds). The window ends right after her 2nd pull post-FB-entry and would span a reload if she enters FB at ≤1 ammo.",
      "triggerIdentity": "'Activates when entering Full Burst' — literally fullBurstEnter: fires on EVERY team Full Burst, including rotations where helm (the fixture's co-B3) bursts instead of neve. NOT burstCast.",
      "targetSet": "Self only ('Affects self').",
      "nearestWrongModel": "durationSec: 2 (seconds-for-rounds — the canonical duration misread; numerically similar for an SG so damage totals barely distinguish it) and/or keying to burstCast so the buff only fires on neve's own ~4 casts instead of all ~7 FBs (UNDER-credits in the dual-B3 control comp).",
      "distinguishingAssertion": "Filter buffApply events with stat==='atkPct' && value===124.8 && targetIdx===casterIdx===neve's idx. GREEN-faithful: each event carries durationShots===2 (field is exposed on buffApply) and event count === count of fullBurstStart events. RED-nearest-wrong: durationShots undefined (seconds encoding), or count === neve's own burstCast count < FB count.",
      "inertness": "targetIdx must never be an ally; no application outside FB entries; the buff must NOT be alive at t=0 (not passive).",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "■ Entering Full Burst; Pierce 2 round(s)",
      "disposition": "GAP",
      "scope": "Pierce tagging on her own attacks for the window (feeds Pierce Damage ▲ buckets; pierceDamagePct is parsed-but-inert in v1, so damage-neutral on a partless boss with no pierce-buff carrier).",
      "durationSemantics": "'for 2 round(s)' — a ROUND count again. GAP: the gainPierce effect schema exposes only durationSec (no durationShots), so the round-count window is not literally expressible. Faithful fallback: gainPierce on the fullBurstEnter block with a ⚑ durationSec derived from her measured pull cadence (≈2 pulls), documented in the note — NEVER a top-level hasPierce.",
      "triggerIdentity": "Same fullBurstEnter block as the ATK line.",
      "targetSet": "Self.",
      "nearestWrongModel": "Top-level hasPierce: true — whole-fight Pierce tagging for a 2-round FB-gated window (the boolean cannot step/time-gate; this is the exact ade-agent-bunny failure shape). Secondary misread: dropping the line silently with no unmodeled entry.",
      "distinguishingAssertion": "Override-shape assertion: the committed override must have NO top-level hasPierce, and the fullBurstEnter block must carry a gainPierce effect (with a bounded ⚑ durationSec). Damage-inertness assertion: totals(runComp(controlComp('neve'))) must be IDENTICAL with the gainPierce effect stripped via withPatchedOverride('neve', o => remove gainPierce) — pierce moves zero damage in this comp (green under both encodings for damage, so the shape assertion is the discriminator).",
      "inertness": "Zero damage movement on the control comp (no Pierce Damage ▲ carrier, partless boss); pierce must not be live at t=0 or outside the post-FB window.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "■ Self; Critical Rate ▲31.95% 20 sec",
      "disposition": "FAITHFUL",
      "scope": "GENERIC crit (kit says 'Critical Rate', no 'of normal attacks' qualifier) → unscoped critRatePct, applying to normal pellets AND the skill1 rider's crit roll.",
      "durationSemantics": "durationSec: 20 — genuine wall-clock seconds; outlives the ~10s FB window by ~10s, so it must persist after fullBurstEnd.",
      "triggerIdentity": "Self-buff in her OWN burst block with no other activation clause → burstCast (fires ONLY on rotations neve herself bursts; ~40s cd → not every FB in the dual-B3 fixture). NOT fullBurstEnter.",
      "targetSet": "Self only.",
      "nearestWrongModel": "Keying to fullBurstEnter — in controlComp the co-B3 helm takes alternate rotations, so fullBurstEnter keying OVER-credits by applying the crit buff on FBs neve did not cast. Secondary: critRateNormalPct scoping (under-credits the skill1 rider's crit).",
      "distinguishingAssertion": "Filter buffApply stat==='critRatePct' && value===31.95. GREEN-faithful: count === neve's own burstCast event count, each targetIdx===neve, expiresFrame−applyFrame≈1200 frames (20s). RED-nearest-wrong: count === fullBurstStart count (> her own casts), or the stat arrives as critRateNormalPct.",
      "inertness": "No application on FBs cast by helm; no ally ever receives it; buff must remain past fullBurstEnd until the 20s lapse (do NOT assert a buffRemove — none is emitted on time expiry; read expiresFrame).",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "■ Self; Hit Rate ▲22.04% for 20 sec",
      "disposition": "FAITHFUL",
      "scope": "hitRatePct — the accuracy stat whose sim effect is the core-hit lift (hrCoreMult path, live by default). For an SG this tightens pellet landing/core exposure; it is NOT defensive and NOT skippable.",
      "durationSemantics": "durationSec: 20, wall-clock, same window as the crit line.",
      "triggerIdentity": "Same burstCast self-block as the crit line.",
      "targetSet": "Self only.",
      "nearestWrongModel": "Dropping the line as 'accuracy is defensive/inert' (weapon-state taxonomy trap #6 adjacent), or the same fullBurstEnter over-crediting as the crit line. The buff VALUE 22.04 is kit-literal, but the Hit-Rate→core conversion magnitude is ALWAYS-⚑ #7 (measured-only) — the test must not pin a specific core-rate delta, only that the stat is applied and the core channel responds.",
      "distinguishingAssertion": "Filter buffApply stat==='hitRatePct' && value===22.04: count === neve's burstCast count, self-targeted, 20s expiry. Plus a movement assertion: totals for neve with the hitRatePct effect stripped via withPatchedOverride must be ≤ the shipped total (core-bucket damage drops when the lift is removed) — RED if identical, which is the 'dropped as inert' misread.",
      "inertness": "Must not apply on helm-cast FBs; must not appear on allies; must not be encoded as a permanent passive.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:interval 145.45% enemy damage rider",
    "skill2:fullBurstEnter ATK ▲124.8% durationShots 2 (self)",
    "skill2:fullBurstEnter gainPierce 2-round window (shape: no top-level hasPierce)",
    "burst:burstCast critRatePct 31.95 / 20s (self)",
    "burst:burstCast hitRatePct 22.04 / 20s (self)"
  ],
  "unmodeledVerbatim": {
    "skill1": [],
    "skill2": [],
    "burst": []
  },
  "notes": "Expected shared-prior misreads, in order of likelihood: (1) skill2 'for 2 round(s)' encoded as durationSec — for this SG the damage delta is tiny, so the test MUST assert the buffApply's durationShots field directly, not totals; (2) skill2 keyed to burstCast instead of the literal fullBurstEnter (UNDER-credits in the dual-B3 controlComp — direction is opposite the usual over-credit trap, note it explicitly); (3) burst self-buffs keyed to fullBurstEnter instead of burstCast (OVER-credits via helm's rotations) — the two triggers diverge only because the fixture has a co-B3, which is exactly why controlComp's helm slot must stay in; (4) skill1's cadence: the kit gives NO interval — any concrete intervalSec is a ⚑ (or datamined skill-CD) and the test should assert cadence relative to the encoded interval, flagging the value's tier rather than treating it as kit truth; first-fire phase (t=interval vs t=0) is also convention-⚑; (5) the gainPierce schema has no durationShots — a round-count pierce window is inexpressible literally; reconcile whether the shipped encoding used a ⚑ durationSec on gainPierce (acceptable, damage-inert here) or a whole-fight hasPierce flag (wrong shape even though damage-identical on the control comp — assert the override shape, not damage). Also confirm the skill1 rider follows rider defaults: FB-major by landing timing, crit-eligible, no core, no range — none of these are stated in the prose and all come from the methodology's rider rules, so a divergent driver encoding (e.g. core:true) is a FIX. All four magnitudes (145.45/124.8/31.95/22.04) are kit-literal DATAMINED; nothing here is CALIBRATED except the skill1 cadence and any pierce-window durationSec approximation.",
  "model": "claude-fable-5"
}

```

---
## SECTION 5 — S5 BLIND TEST (claude-opus-5) + green/red count vs driver override

S5 BLIND TEST RUN vs DRIVER OVERRIDE (run UNMODIFIED — copied verbatim into scripts/tests/units/ so its relative '../lib/harness.js' import resolves; temp copy removed after): 12 PASSED / 5 SKIPPED / 1 RED.
- The 5 skips are the blind model's own ALWAYS-⚑ gaps and match the driver's dispositions 1:1 (S1 cadence not in kit text; lowest-HP enemy unobservable on single boss; gainPierce has no round-count primitive; no Pierce Damage carrier in comp; hitRate->core magnitude measured-only).
- The 1 RED is a FALSE-RED / blind over-assertion, NOT a driver-override divergence: blind line 353 asserts others(hitRateZero).toEqual(others(base)) — perfect teammate isolation when neve's SELF hitRatePct is zeroed. The engine's deterministic EV pass couples SG hitRate->core-geometry into teammate totals by <0.5% (probe: neve base 219.3M / hrZero 202.7M / critZero 202.3M; critZero's others() PASSES, so ONLY the hitRate->SG-core path couples — an engine EV artifact, not a buff leak). The buff is proven self-only (blind 'both buffs are self-only' PASSED; driver N6 targetIdx===NEVE PASSED). The driver test deliberately pins only the buffApply event for hitRate (stat/value/duration/target/cadence) and does NOT assert perfect isolation or a damage delta, correctly avoiding this trap. All kit-faithfulness claims in the blind test PASSED.

```typescript
/**
 * neve — Neve. BLIND kit-spec test (S5 cross-family), written from the kit prose ALONE.
 *
 * KIT (SG / Water / Attacker / Burst III, cd 40s, ammo 9, 10 hits/shot, no charge):
 *   skill1  "Affects 1 enemy ... lowest remaining HP" + "Deals 145.45% of final ATK"
 *           -> NO activation clause => INTERVAL rider. The cadence itself is NOT in the kit text
 *              (ALWAYS-⚑ #2), so this file pins the MAGNITUDE, the target set, the flavor and the
 *              trigger KIND, and leaves the interval seconds unasserted (it.skip below).
 *   skill2  "Activates when entering Full Burst. Affects self."
 *           "Gain Pierce for 2 round(s)" + "ATK ▲ 124.8% for 2 round(s)"
 *           -> fullBurstEnter (fires on ANY team Full Burst, not only neve's own cast), self,
 *              ROUND-count duration (durationShots), never wall-clock seconds.
 *   burst   "Affects self." Critical Rate ▲ 31.95% / Hit Rate ▲ 22.04%, both "for 20 sec"
 *           -> burstCast (self-buffs living in her OWN burst slot), wall-clock seconds, no damage.
 *
 * FIXTURE — controlComp('neve', true): liter B1 + crown B2 make bursts actually chain (a lone B3
 * makes ZERO Full Bursts), and the fixed SECOND Burst-III slot is what makes the two trigger
 * identities separable. Neve's own burst cd is 40s while the comp opens a Full Burst far more
 * often, so she cannot cast on every Full Burst. That yields two counts that are ORDER-INDEPENDENT
 * (no reliance on intra-frame event ordering between fullBurstStart and buff dispatch):
 *     skill2 applies  == fullBurstStart count   (fullBurstEnter)   — RED if keyed to burstCast
 *     burst  applies  <  fullBurstStart count   (burstCast)        — RED if keyed to fullBurstEnter
 * Each is the other's nearest-wrong model, so the pair is mutually reinforcing.
 * controlComp('neve', false) (neve sole B3) is a secondary fixture used only for liveness.
 *
 * Structural assertions read the COMMITTED override through withPatchedOverride(slug, no-op),
 * which returns a clone (disk untouched). They pin literal kit values that the damage totals
 * cannot distinguish (e.g. 145.45 vs a scaled re-authoring). Behavioural counterfactuals pin that
 * each line is LIVE and correctly scoped.
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

const SLUG = 'neve';

// kit literals
const RIDER_PCT = 145.45;
const ATK_PCT = 124.8;
const ATK_ROUNDS = 2;
const CRIT_PCT = 31.95;
const HITRATE_PCT = 22.04;
const BURST_SEC = 20;

type Comp = ReturnType<typeof controlComp>;
type Res = ReturnType<typeof runComp>;
type Ov = ReturnType<typeof withPatchedOverride>;
type Slot = 'skill1' | 'skill2' | 'burst';

/** Loose structural views — the override FILE is slot-keyed; tolerate both the bare Block[] slot
 *  shape and a slot object carrying its own blocks[] so the structural checks can't false-RED on
 *  container shape rather than on kit faithfulness. */
type LooseEffect = {
  kind: string;
  stat?: string;
  value?: number;
  atkPct?: number;
  durationSec?: number;
  durationShots?: number;
  core?: boolean;
  flavor?: string;
  [k: string]: unknown;
};
type LooseBlock = {
  slot?: string;
  trigger?: { kind?: string; sec?: number };
  target?: { kind?: string };
  effects?: LooseEffect[];
  [k: string]: unknown;
};
type LooseOv = { hasPierce?: boolean; [k: string]: unknown };

const loose = (ov: Ov): LooseOv => ov as unknown as LooseOv;

function blocksOf(ov: Ov, slot: Slot): LooseBlock[] {
  const s = loose(ov)[slot];
  if (!s) return [];
  if (Array.isArray(s)) return s as LooseBlock[];
  const inner = (s as { blocks?: unknown }).blocks;
  return Array.isArray(inner) ? (inner as LooseBlock[]) : [];
}

function effectsOf(ov: Ov, slot: Slot): LooseEffect[] {
  return blocksOf(ov, slot).flatMap((b) => b.effects ?? []);
}

// ---------------------------------------------------------------- harness plumbing

function run(opts: Comp): { res: Res; events: SimEvent[] } {
  const events: SimEvent[] = [];
  const tapped = {
    ...opts,
    cfg: {
      ...(opts as { cfg?: Record<string, unknown> }).cfg,
      onEvent: (ev: SimEvent) => events.push(ev),
    },
  } as Comp;
  return { res: runComp(tapped), events };
}

function comp(ov?: Ov, helm = true): Comp {
  const base = controlComp(SLUG, helm);
  return ov ? ({ ...base, overrides: { [SLUG]: ov } } as Comp) : base;
}

type BuffEv = {
  kind: 'buffApply';
  stat: string;
  value: number;
  targetSlug?: string;
  durationShots?: number;
  durationSec?: number;
  expiresFrame?: number;
};

const buffApplies = (events: SimEvent[]): BuffEv[] =>
  events.filter((e) => e.kind === 'buffApply') as unknown as BuffEv[];

const countKind = (events: SimEvent[], kind: string): number =>
  events.filter((e) => (e as { kind: string }).kind === kind).length;

/** buff applications identified by their kit-literal magnitude (no other unit in the control comp
 *  carries these exact values), so the filter never depends on caster indices. */
const byValue = (events: SimEvent[], stat: string, value: number): BuffEv[] =>
  buffApplies(events).filter((e) => e.stat === stat && e.value === value);

const neveTotal = (r: Res): number => totals(r)[SLUG];

const others = (r: Res): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(totals(r))) if (k !== SLUG) out[k] = v;
  return out;
};

// ---------------------------------------------------------------- overrides (clones)

const OV = withPatchedOverride(SLUG, () => {});

const ovRiderZero = withPatchedOverride(SLUG, (ov) => {
  for (const e of effectsOf(ov, 'skill1')) if (e.kind === 'flatDamage') e.atkPct = 0;
});
const ovRiderDouble = withPatchedOverride(SLUG, (ov) => {
  for (const e of effectsOf(ov, 'skill1')) if (e.kind === 'flatDamage') e.atkPct = RIDER_PCT * 2;
});
const ovS2AsBurstCast = withPatchedOverride(SLUG, (ov) => {
  for (const b of blocksOf(ov, 'skill2')) {
    if (b.trigger?.kind === 'fullBurstEnter') b.trigger = { kind: 'burstCast' };
  }
});
const ovAtkAsSeconds = withPatchedOverride(SLUG, (ov) => {
  for (const e of effectsOf(ov, 'skill2')) {
    if (e.kind === 'buff' && e.stat === 'atkPct') {
      delete e.durationShots;
      e.durationSec = ATK_ROUNDS; // the nearest-wrong reading: "2 round(s)" as 2 wall-clock sec
    }
  }
});
const ovAtkZero = withPatchedOverride(SLUG, (ov) => {
  for (const e of effectsOf(ov, 'skill2')) if (e.kind === 'buff' && e.stat === 'atkPct') e.value = 0;
});
const ovCritZero = withPatchedOverride(SLUG, (ov) => {
  for (const e of effectsOf(ov, 'burst')) if (e.kind === 'buff' && e.stat === 'critRatePct') e.value = 0;
});
const ovHitRateZero = withPatchedOverride(SLUG, (ov) => {
  for (const e of effectsOf(ov, 'burst')) if (e.kind === 'buff' && e.stat === 'hitRatePct') e.value = 0;
});

// ---------------------------------------------------------------- hoisted runs (9 sims)

const base = run(comp());
const sole = run(comp(undefined, false));
const riderZero = run(comp(ovRiderZero));
const riderDouble = run(comp(ovRiderDouble));
const s2AsBurstCast = run(comp(ovS2AsBurstCast));
const atkAsSeconds = run(comp(ovAtkAsSeconds));
const atkZero = run(comp(ovAtkZero));
const critZero = run(comp(ovCritZero));
const hitRateZero = run(comp(ovHitRateZero));

const FB_STARTS = countKind(base.events, 'fullBurstStart');

describe('neve — fixture sanity', () => {
  it('the control comp actually bursts and neve deals damage', () => {
    expect(unitOf(base.res, SLUG).totalDamage).toBeGreaterThan(0);
    // Non-vacuity for every Full-Burst-keyed assertion in this file.
    expect(FB_STARTS).toBeGreaterThan(1);
    expect(countKind(sole.events, 'fullBurstStart')).toBeGreaterThan(0);
  });
});

describe('neve skill1 — "Deals 145.45% of final ATK", 1 enemy, no activation clause', () => {
  it('is ONE interval-triggered enemy-targeted flatDamage rider at exactly 145.45%', () => {
    const dmgBlocks = blocksOf(OV, 'skill1').filter((b) =>
      (b.effects ?? []).some((e) => e.kind === 'flatDamage'),
    );
    // The kit carries exactly one damage line; splitting it would double-count.
    expect(dmgBlocks.length).toBe(1);
    // Nearest-wrong trigger identities: passive (fires once at t=0) or an invented event trigger.
    // The prose has no "Activates when" clause, so the disposition is interval.
    expect(dmgBlocks[0].trigger?.kind).toBe('interval');
    expect(dmgBlocks[0].target?.kind).toBe('enemy');

    const eff = (dmgBlocks[0].effects ?? []).find((e) => e.kind === 'flatDamage');
    expect(eff?.atkPct).toBe(RIDER_PCT);
    // The text says neither "core strike" nor any sustained/sequential/true flavour.
    expect(eff?.core).not.toBe(true);
    expect(eff?.flavor).toBeUndefined();
  });

  it('the rider is LIVE and scales linearly with its atkPct (so 145.45 is the real magnitude)', () => {
    const d1 = neveTotal(base.res) - neveTotal(riderZero.res);
    const d2 = neveTotal(riderDouble.res) - neveTotal(riderZero.res);
    // Non-vacuity: the rider fires at least once in the 180s fixture.
    expect(d1).toBeGreaterThan(0);
    // Doubling the kit % must exactly double the contribution — RED if the rider is authored at a
    // fudged/absorbed magnitude that does not track the kit number, or if it is gated off.
    expect(d2 / d1).toBeCloseTo(2, 6);
  });

  it('the rider is self-sourced only — teammates are byte-identical when it is zeroed', () => {
    expect(others(riderZero.res)).toEqual(others(base.res));
  });

  // ⚑ ALWAYS-⚑ #2: the kit text gives this damage line NO trigger, so its cadence (interval
  // seconds / first-fire phase) is outside the input domain of a blind read. Pin from the
  // datamined skill cooldown or from popup footage; not assertable from prose.
  it.skip('rider cadence (interval seconds + first-fire phase) — ⚑ not in the kit text', () => {});

  // "1 enemy unit(s) with the lowest remaining HP" — v1 has a single immortal boss and no HP
  // pool, so the selection rule is unobservable; only target.kind === 'enemy' is testable.
  it.skip('lowest-remaining-HP enemy selection — unobservable (single partless boss)', () => {});
});

describe('neve skill2 — "Activates when entering Full Burst. Affects self."', () => {
  it('fires on EVERY team Full Burst (fullBurstEnter), not only on neve\'s own burst', () => {
    const applies = byValue(base.events, 'atkPct', ATK_PCT);
    // Order-independent count identity: one application per Full Burst.
    expect(applies.length).toBe(FB_STARTS);
    // Nearest-wrong (burstCast-keyed) demonstrably UNDER-fires in this fixture, which proves the
    // assertion above actually discriminates rather than passing vacuously.
    const wrong = byValue(s2AsBurstCast.events, 'atkPct', ATK_PCT);
    expect(wrong.length).toBeLessThan(FB_STARTS);
    expect(wrong.length).toBeGreaterThan(0);
  });

  it('ATK ▲ 124.8% is a self-scaling atkPct on SELF only', () => {
    const applies = byValue(base.events, 'atkPct', ATK_PCT);
    expect(applies.length).toBeGreaterThan(0);
    // Raw percentage => atkPct. A casterAtkPct mis-encoding would emit a FLAT ATK number
    // ((124.8/100)×staticAtk), so the literal 124.8 filter would find nothing.
    for (const e of applies) expect(e.targetSlug).toBe(SLUG);
    // Inertness: no teammate is ever granted this buff.
    expect(buffApplies(base.events).filter((e) => e.value === ATK_PCT && e.targetSlug !== SLUG)).toHaveLength(0);
  });

  it('"for 2 round(s)" is a ROUND count, not 2 wall-clock seconds', () => {
    const eff = effectsOf(OV, 'skill2').find((e) => e.kind === 'buff' && e.stat === 'atkPct');
    expect(eff?.durationShots).toBe(ATK_ROUNDS);
    expect(eff?.durationSec).toBeUndefined();

    for (const e of byValue(base.events, 'atkPct', ATK_PCT)) {
      expect(e.durationShots).toBe(ATK_ROUNDS);
    }
    // Behavioural discrimination: a round window stretches across reloads / shrinks with fire
    // rate, so re-reading it as durationSec:2 moves neve's total.
    expect(neveTotal(atkAsSeconds.res)).not.toBe(neveTotal(base.res));
  });

  it('the ATK buff is live and self-scoped (teammates unmoved when zeroed)', () => {
    expect(neveTotal(base.res)).toBeGreaterThan(neveTotal(atkZero.res));
    expect(others(atkZero.res)).toEqual(others(base.res));
  });

  it('"Gain Pierce" is a gainPierce EFFECT on the FB-enter block, not a whole-fight hasPierce flag', () => {
    const fbBlocks = blocksOf(OV, 'skill2').filter((b) => b.trigger?.kind === 'fullBurstEnter');
    expect(fbBlocks.length).toBeGreaterThan(0);
    expect(fbBlocks.every((b) => b.target?.kind === 'self')).toBe(true);
    expect(fbBlocks.flatMap((b) => b.effects ?? []).some((e) => e.kind === 'gainPierce')).toBe(true);
    // Nearest-wrong: the boolean flag tags EVERY shot of the fight as Pierce, but the kit grants
    // it only for 2 rounds after entering Full Burst.
    expect(loose(OV).hasPierce).not.toBe(true);
  });

  // The gainPierce effect carries only durationSec — there is no round-count primitive for it, so
  // "Gain Pierce for 2 round(s)" cannot be expressed faithfully; any seconds value is a ⚑ estimate.
  it.skip('Pierce expiry after 2 ROUNDS — GAP: gainPierce has no durationShots primitive', () => {});

  // The control comp carries no Pierce Damage ▲ consumer, so the pierce tag moves no damage here;
  // its effect is only measurable in a comp with a pierce-damage buff.
  it.skip('Pierce damage contribution — no Pierce Damage ▲ carrier in the control comp', () => {});
});

describe('neve burst — self Critical Rate ▲ 31.95% / Hit Rate ▲ 22.04%, 20 sec', () => {
  it('fires on neve\'s OWN burst cast (burstCast), NOT on every team Full Burst', () => {
    const crit = byValue(base.events, 'critRatePct', CRIT_PCT);
    expect(crit.length).toBeGreaterThan(0);
    // Her cd is 40s and the comp opens Full Bursts far more often, so a burstCast-keyed block
    // MUST fire strictly fewer times than there are Full Bursts. RED under a fullBurstEnter
    // mis-key (which would over-credit her crit window on rotations she never cast).
    expect(crit.length).toBeLessThan(FB_STARTS);
    // Hit Rate rides the same cast.
    expect(byValue(base.events, 'hitRatePct', HITRATE_PCT).length).toBe(crit.length);
  });

  it('both buffs are self-only, wall-clock 20s, and share one window', () => {
    const bBlocks = blocksOf(OV, 'burst');
    expect(bBlocks.length).toBeGreaterThan(0);
    expect(bBlocks.every((b) => b.trigger?.kind === 'burstCast')).toBe(true);
    expect(bBlocks.every((b) => b.target?.kind === 'self')).toBe(true);

    const bEff = effectsOf(OV, 'burst');
    const crit = bEff.find((e) => e.kind === 'buff' && e.stat === 'critRatePct');
    const hr = bEff.find((e) => e.kind === 'buff' && e.stat === 'hitRatePct');
    expect(crit?.value).toBe(CRIT_PCT);
    expect(crit?.durationSec).toBe(BURST_SEC);
    expect(crit?.durationShots).toBeUndefined();
    expect(hr?.value).toBe(HITRATE_PCT);
    expect(hr?.durationSec).toBe(BURST_SEC);
    expect(hr?.durationShots).toBeUndefined();

    // Scope trap: the prose says plain "Critical Rate ▲", NOT "Critical Rate of normal attacks",
    // so the normal-attack-scoped stat would under-credit her skill1 rider.
    expect(bEff.some((e) => e.stat === 'critRateNormalPct')).toBe(false);

    // Same cast, same 20s window => identical expiry for the pair (frame-free duration check).
    const critEv = byValue(base.events, 'critRatePct', CRIT_PCT);
    const hrEv = byValue(base.events, 'hitRatePct', HITRATE_PCT);
    for (let i = 0; i < critEv.length; i++) {
      expect(critEv[i].targetSlug).toBe(SLUG);
      expect(hrEv[i].targetSlug).toBe(SLUG);
      expect(hrEv[i].expiresFrame).toBe(critEv[i].expiresFrame);
    }
    // Inertness: no ally receives either buff.
    expect(
      buffApplies(base.events).filter(
        (e) => (e.value === CRIT_PCT || e.value === HITRATE_PCT) && e.targetSlug !== SLUG,
      ),
    ).toHaveLength(0);
  });

  it('the burst self-buffs are LIVE (zeroing each lowers neve\'s damage) and move nobody else', () => {
    expect(neveTotal(base.res)).toBeGreaterThan(neveTotal(critZero.res));
    expect(others(critZero.res)).toEqual(others(base.res));
    // Hit Rate lifts the core-hit rate (engine hrCoreMult, live by default); on a SG with a 200%
    // core multiplier that is strictly damage-positive. Equality here would mean the line is inert.
    expect(neveTotal(base.res)).toBeGreaterThan(neveTotal(hitRateZero.res));
    expect(others(hitRateZero.res)).toEqual(others(base.res));
  });

  it('the burst deals NO damage of its own', () => {
    // The burst prose is two self-buff lines only — a flatDamage/dot/storedHit in the burst slot
    // would be invented damage.
    const kinds = effectsOf(OV, 'burst').map((e) => e.kind);
    for (const k of ['flatDamage', 'dot', 'storedHit', 'weaponSwap']) {
      expect(kinds).not.toContain(k);
    }
  });

  // ⚑ ALWAYS-⚑ #7: the Hit-Rate → core-rate conversion magnitude is measured-only (engine-side
  // hrCoreMult), so only the DIRECTION of the 22.04% grant is assertable from prose.
  it.skip('Hit Rate → core-rate magnitude — ⚑ measured-only, not derivable from kit text', () => {});
});

```

---
## SECTION 6 — S6 BLIND OVERRIDE (claude-opus-5) + diff vs driver override

SUBSTANTIVE DIFFERENCES (blind S6 vs driver):
1. skill1 target: DRIVER {kind:'enemy'} (CORRECT — kit "Affects 1 enemy unit") vs BLIND {kind:'self'} (mis-scope; damage-NEUTRAL because flatDamage always resolves to the single boss — there is no enemy entity, resolveTargets({kind:'enemy'}) returns []). Driver is more faithful.
2. skill1 flatDamage crit: DRIVER bare (engine default crit:true) vs BLIND explicit crit:true — damage-EQUIVALENT.
3. skill2 gainPierce durationSec: DRIVER 2 vs BLIND 2.4 — BOTH flagged ⚑ rounds->seconds estimates (gainPierce has no round granularity); damage-INERT (pierceDamagePct inert in v1, no Pierce Damage carrier). Equivalent approach, trivially different number.
IDENTICAL: skill2 atkPct 124.8 durationShots:2 (fullBurstEnter/self); entire burst block (burstCast/self, critRatePct 31.95/20s + hitRatePct 22.04/20s); no top-level hasPierce; unmodeled all empty.

```json
{
  "slug": "neve",
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "interval",
        "sec": 10
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 145.45,
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
          "kind": "gainPierce",
          "durationSec": 2.4
        },
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 124.8,
          "durationShots": 2
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
          "stat": "critRatePct",
          "value": 31.95,
          "durationSec": 20
        },
        {
          "kind": "buff",
          "stat": "hitRatePct",
          "value": 22.04,
          "durationSec": 20
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
    "⚑ skill1 cadence INVENTED: the kit line carries no activation clause, so it is modeled as an interval trigger at an unmeasured 10s. Every skill1 damage number scales linearly with this guess.",
    "⚑ skill2 Pierce window is a ROUND count (2 rounds) but gainPierce has no round-count field; the 2.4s durationSec is a shots→seconds conversion off an unmeasured SG cadence.",
    "⚑ Hit Rate ▲22.04% → core-rate lift goes through the engine's hrCoreMult derivation; the damage magnitude of the conversion is unmeasured for this unit.",
    "⚑ SG pellet split-vs-merge (hitsPerShot 10) is kit-silent and left to the engine's SG landing path; not verified against popups.",
    "noFb deliberately NOT set on the skill1 rider (FB-by-timing default ON) — noFb is measurement-only.",
    "The skill2 ATK buff is keyed to fullBurstEnter (any team Full Burst) per the literal activation text, NOT to Neve's own burst cast."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Neve (SG/Water/Attacker/B3, cd 40s, ammo 9, hitsPerShot 10) is modeled as: S1 a single-target 145.45%-of-final-ATK rider on an invented 10s interval (the kit line states no trigger); S2 a Full-Burst-entry self package — Pierce plus ATK ▲124.8%, both bounded by a 2-ROUND count (the ATK buff uses durationShots:2, one round = one SG trigger pull, so it survives at most two shots and can span a reload); burst a pure self-buff cast with Critical Rate ▲31.95% and Hit Rate ▲22.04% for 20s, no burst damage component. The S1 rider is crit-eligible at the caster's sheet rate and takes no core (the text says plain damage, not core strike) and no range bonus (engine-automatic). Pierce is windowed via a gainPierce effect rather than the whole-fight hasPierce flag, since the kit grants it only inside the post-FB-entry round window."
}
```

---
## SECTION 7 — DRIVER IMPLEMENTATION (tests + override)

### scripts/tests/units/neve.test.ts
```typescript
// PER-UNIT KIT SPEC — `neve` (Neve, SG/Attacker/Water, Burst III, cd 40s, ammo 9, hitsPerShot 10).
// Kit-autonomy gauntlet 2026-08-02 — test-first independent re-derivation.
//
// One assertion group per kit line (N1..N6), asserted against the SHIPPED override loaded from
// disk. `withPatchedOverride` builds COUNTERFACTUALS only (the nearest wrong model each PIN must
// discriminate against) and ISOLATES the damage-inert Pierce line — never the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.neve.skills):
//   S1 "Bear Power" (10s CD) ■ 1 enemy lowest remaining HP: 145.45% of final ATK as damage   [N1,N2]
//   S2 "Hibernation" (on Full Burst enter, self) ■ Gain Pierce for 2 round(s)                [N4]
//                                                ■ ATK ▲124.8% for 2 round(s)                [N3]
//   BU "Roar" (burstCast, self) ■ Critical Rate ▲31.95% for 20 sec                           [N5]
//                               ■ Hit Rate ▲22.04% for 20 sec                                [N6]
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   N1  the S1 magnitude is 145.45% (skill level 10), NOT the level-1 value 63.63 — pinned, with
//       the level-1 counterfactual provably failing the same assertion. The hit is a bare flatDamage
//       rider, so it takes the engine rider defaults (crit-eligible, no core, skill bucket) — the
//       crit-eligibility is pinned (helm H6 convention). Target is {kind:'enemy'}: the kit reads
//       "1 enemy with the lowest remaining HP", but v1 fields a SINGLE immortal boss (no HP pool),
//       so lowest-HP is indeterminate AND moot — exactly one enemy to hit (documented stand-in).
//   N2  S1 is a 10s-CD damage proc (interval 10s — the DATAMINED skill cooldown; first fire t=10,
//       the engine interval phase convention ⚑), NOT a passive. The parser baseline mis-keyed it
//       `passive` (one hit at t=0). Pinned on cadence: ~18 fires on a 600f wall-clock grid,
//       uncorrelated with shot/burst events — the passive model fires exactly once and provably
//       fails. The interval is wall-clock, so the count is invariant to the FB cadence.
//   N3  S2 ATK is a ROUND count (durationShots:2, NO wall-clock expiry), self-scoped, keyed to
//       fullBurstEnter (fires on EVERY team Full Burst). Pinned four ways: value 124.8; durationShots
//       2 with expiresFrame null; target = neve alone; application count === Full Burst count (NOT
//       neve's own cast count). The permanent baseline (durationShots null), a timed-seconds
//       counterfactual (expiresFrame != null), and a burstCast re-key (count collapses to neve's own
//       casts < FB count) all provably fail.
//   N4  "Gain Pierce for 2 round(s)": gainPierce sets pierceUntilFrame but emits NO event, and the
//       only thing a pierce tag feeds (pierceDamagePct) is inert in v1 — so the line is unobservable
//       from the log AND damage-inert at scope lock (neve is Water/SG; helm's kit carries no Pierce
//       Damage ▲ either). Modeled for kit-completeness (naga/alice convention) as a gainPierce effect
//       on the fullBurstEnter block — NEVER a top-level hasPierce (the boolean cannot time-gate a
//       2-round FB window; the ade-agent-bunny failure shape). Proven faithfully inert by
//       byte-identical totals with the effect removed. The 2-rounds→seconds duration is a flagged ⚑
//       estimate (gainPierce has no round granularity).
//   N5  burst Critical Rate is the UNSCOPED critRatePct (lifts every neve hit, incl. the S1 rider's
//       crit roll), self-scoped, 20s, keyed to burstCast (fires ONLY on neve's own casts). Pinned:
//       value 31.95, 20s expiry, self, count === neve's burstCast count (NOT the FB count). A
//       fullBurstEnter re-key over-credits (count === FB count > neve casts) and a scoped
//       critRateNormalPct emits no critRatePct buff — both counterfactuals provably fail.
//   N6  burst Hit Rate ▲22.04% is hitRatePct (a real primitive — sim.ts hrCoreMult core-hit lift,
//       live by default; for an SG it tightens pellet landing/core exposure — NOT defensive, NOT
//       skippable), self-scoped, 20s, burstCast. The parser baseline DROPPED it — pinned red vs
//       shipped, green in S3. The Hit-Rate→core conversion MAGNITUDE is measured-only (⚑), so the
//       test pins the stat application, not a specific core-rate delta.
//
// Fixture: controlComp('neve') = [liter (B1) / crown (B2) / neve (B3) / helm (B3)] — the canonical
// 720-kit-audit control comp with neve as the carry. The co-B3 helm is DELIBERATE: neve and helm
// alternate Full Bursts, so the Full Burst count EXCEEDS neve's own cast count — the only way to
// discriminate S2's fullBurstEnter (fires every FB) from the burst lines' burstCast (fires on neve's
// casts alone). A sole-B3 fixture would make the two triggers count-equal and gate nothing. boss Fire
// (neve Water → advantaged), focus neve. Deterministic (no seed).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
/** controlComp slot order: liter 0 / crown 1 / neve 2 / helm 3. */
const NEVE = 2;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type FbStart = Extract<SimEvent, { kind: 'fullBurstStart' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp('neve'),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactuals / isolation (nearest wrong model each PIN discriminates against) ---------
/** N1 counterfactual: S1 damage at the level-1 magnitude (63.63) instead of level-10 (145.45). */
const neveS1LowLevel = withPatchedOverride('neve', (ov) => {
  const e = ov.skill1
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'flatDamage');
  if (!e) {
    throw new Error('neve S1 flatDamage missing — fixture is stale');
  }
  e.atkPct = 63.63;
});
/** N3 counterfactual (duration): S2 ATK as a TIMED 20s buff instead of a 2-round count. */
const neveS2Timed = withPatchedOverride('neve', (ov) => {
  const e = ov.skill2
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'atkPct');
  if (!e) {
    throw new Error('neve S2 atkPct effect missing — fixture is stale');
  }
  delete e.durationShots;
  e.durationSec = 20;
});
/** N3 counterfactual (trigger): S2 re-keyed fullBurstEnter → burstCast (fires only on neve's own
 *  casts, UNDER-crediting in the dual-B3 comp). */
const neveS2BurstCast = withPatchedOverride('neve', (ov) => {
  const b = ov.skill2.find((x: any) => x.trigger?.kind === 'fullBurstEnter');
  if (!b) {
    throw new Error('neve S2 fullBurstEnter block missing — fixture is stale');
  }
  b.trigger = { kind: 'burstCast' };
});
/** N4 isolation: drop the gainPierce effect, leaving the rest of the S2 block intact — proves the
 *  Pierce line is damage-inert at scope lock (byte-identical totals). */
const neveNoPierce = withPatchedOverride('neve', (ov) => {
  for (const b of ov.skill2) {
    b.effects = b.effects.filter((e: any) => e.kind !== 'gainPierce');
  }
  const anyPierce = ov.skill2.some((b: any) =>
    b.effects.some((e: any) => e.kind === 'gainPierce')
  );
  if (anyPierce) {
    throw new Error('neve S2 gainPierce still present — patch failed');
  }
});
/** N5 counterfactual (trigger): burst re-keyed burstCast → fullBurstEnter (fires on EVERY FB,
 *  OVER-crediting via helm's rotations). */
const neveBurstFbEnter = withPatchedOverride('neve', (ov) => {
  const b = ov.burst.find((x: any) => x.trigger?.kind === 'burstCast');
  if (!b) {
    throw new Error('neve burst burstCast block missing — fixture is stale');
  }
  b.trigger = { kind: 'fullBurstEnter' };
});
/** N5 counterfactual (scope): burst crit rate as the SCOPED critRateNormalPct (normals only). */
const neveCritScoped = withPatchedOverride('neve', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'critRatePct');
  if (!e) {
    throw new Error('neve burst critRatePct effect missing — fixture is stale');
  }
  e.stat = 'critRateNormalPct';
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const s1LowLevel = run({ neve: neveS1LowLevel });
const s2Timed = run({ neve: neveS2Timed });
const s2BurstCast = run({ neve: neveS2BurstCast });
const noPierce = run({ neve: neveNoPierce });
const burstFbEnter = run({ neve: neveBurstFbEnter });
const critScoped = run({ neve: neveCritScoped });

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const neveS1Damage = (evs: SimEvent[]) =>
  dmg(evs).filter((d) => d.slug === 'neve' && d.srcSlot === 'skill1');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const neveBuffs = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === NEVE && b.stat === stat);
const neveBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'neve');
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e): e is FbStart => e.kind === 'fullBurstStart');

describe('neve — kit spec', () => {
  // The fixture's dual-B3 divergence is what makes the trigger pins meaningful — guard it once.
  it('fixture: Full Bursts outnumber neve\'s own casts (co-B3 helm alternates)', () => {
    const fb = fbStarts(base.events).length;
    const casts = neveBursts(base.events).length;
    expect(fb).toBeGreaterThan(0);
    expect(casts).toBeGreaterThan(0);
    expect(
      fb,
      `${fb} Full Bursts vs ${casts} neve casts — the co-B3 must make FB count exceed neve's casts`
    ).toBeGreaterThan(casts);
  });

  describe('N1 — S1 deals 145.45% of final ATK to the (single) enemy, as a crit-eligible rider', () => {
    it('is the level-10 magnitude, in the skill bucket, crit-eligible (rider default)', () => {
      const hits = neveS1Damage(base.events);
      expect(hits.length).toBeGreaterThan(0);
      expect([...new Set(hits.map((d) => d.atkPct))]).toEqual([145.45]);
      expect([...new Set(hits.map((d) => d.bucket))]).toEqual(['skill']);
      expect(hits.every((d) => d.critEligible)).toBe(true);
    });

    it('DISCRIMINATING: the level-1 magnitude (63.63) fails the same pin', () => {
      expect(
        [...new Set(neveS1Damage(s1LowLevel.events).map((d) => d.atkPct))]
      ).toEqual([63.63]);
    });
  });

  describe('N2 — S1 is a 10s-CD damage proc (interval), not a one-shot passive', () => {
    it('fires on a wall-clock 10s grid starting at t=10, ~18 times over 180s', () => {
      const hits = neveS1Damage(base.events);
      const frames = [...new Set(hits.map((d) => d.frame))].sort(
        (a, b) => a - b
      );
      expect(
        hits.length,
        `${hits.length} S1 hits — a passive fires exactly once (t=0); the 10s CD fires ~18×`
      ).toBeGreaterThanOrEqual(16);
      expect(frames[0], 'first fire must be at t=10s (the CD), not t=0').toBe(
        10 * FPS
      );
      for (let i = 1; i < frames.length; i++) {
        expect(
          frames[i] - frames[i - 1],
          `gap ${frames[i] - frames[i - 1]}f between fires ${i - 1}/${i} — expected 600f (10s)`
        ).toBe(10 * FPS);
      }
    });
  });

  describe('N3 — S2 ATK ▲124.8% is a 2-ROUND count, self-scoped, on EVERY Full Burst entry', () => {
    const atk = neveBuffs(base.events, 'atkPct');

    it('is 124.8% for 2 rounds (durationShots 2, NO wall-clock expiry)', () => {
      expect(atk.length).toBeGreaterThan(0);
      expect([...new Set(atk.map((b) => b.value))]).toEqual([124.8]);
      expect([...new Set(atk.map((b) => b.durationShots))]).toEqual([2]);
      expect(
        [...new Set(atk.map((b) => b.expiresFrame))],
        'a round-count buff must not also carry a timed expiry'
      ).toEqual([null]);
    });

    it('fires on every Full Burst entry (fullBurstEnter), held by neve alone', () => {
      const fb = fbStarts(base.events).length;
      expect(atk.length, 'fullBurstEnter fires once per FB, not per neve cast').toBe(
        fb
      );
      expect([...new Set(atk.map((b) => b.targetIdx))]).toEqual([NEVE]);
    });

    it('DISCRIMINATING (duration): a timed-seconds encoding carries a wall-clock expiry', () => {
      const timed = neveBuffs(s2Timed.events, 'atkPct');
      expect(timed.length).toBeGreaterThan(0);
      expect(
        timed.every((b) => b.expiresFrame != null),
        'the timed counterfactual must carry an expiry the round-count model lacks'
      ).toBe(true);
      expect([...new Set(timed.map((b) => b.durationShots))]).toEqual([null]);
    });

    it('DISCRIMINATING (trigger): a burstCast re-key collapses the count to neve\'s own casts', () => {
      const rekeyed = neveBuffs(s2BurstCast.events, 'atkPct');
      const casts = neveBursts(base.events).length;
      const fb = fbStarts(base.events).length;
      expect(rekeyed.length).toBe(casts);
      expect(rekeyed.length).toBeLessThan(fb);
    });
  });

  describe('N4 — S2 "Gain Pierce for 2 round(s)" is faithfully inert at scope lock', () => {
    it('removing the gainPierce effect changes NO unit total by a single point', () => {
      // gainPierce emits no event and pierceDamagePct is inert in v1, so the line's only correct
      // observable is exactly this: byte-identical totals with the effect present vs removed.
      expect(base.totals).toEqual(noPierce.totals);
    });
  });

  describe('N5 — burst Critical Rate ▲31.95% is the UNSCOPED critRatePct, self, 20s, on burstCast', () => {
    const crit = neveBuffs(base.events, 'critRatePct');

    it('is 31.95% for 20 sec on neve, once per neve burst cast (NOT every FB)', () => {
      const casts = neveBursts(base.events).length;
      expect(crit.length, 'burstCast fires on neve\'s own casts only').toBe(casts);
      expect([...new Set(crit.map((b) => b.value))]).toEqual([31.95]);
      expect([...new Set(crit.map((b) => b.targetIdx))]).toEqual([NEVE]);
      for (const b of crit) {
        expect(b.expiresFrame! - b.frame).toBe(20 * FPS);
      }
    });

    it('DISCRIMINATING (trigger): a fullBurstEnter re-key over-credits to the FB count', () => {
      const rekeyed = neveBuffs(burstFbEnter.events, 'critRatePct');
      const fb = fbStarts(base.events).length;
      const casts = neveBursts(base.events).length;
      expect(rekeyed.length).toBe(fb);
      expect(rekeyed.length).toBeGreaterThan(casts);
    });

    it('DISCRIMINATING (scope): a scoped critRateNormalPct emits no critRatePct buff', () => {
      expect(neveBuffs(critScoped.events, 'critRatePct').length).toBe(0);
      expect(
        neveBuffs(critScoped.events, 'critRateNormalPct').length
      ).toBeGreaterThan(0);
    });
  });

  describe('N6 — burst Hit Rate ▲22.04% is hitRatePct, self-scoped, 20s, on burstCast', () => {
    const hr = neveBuffs(base.events, 'hitRatePct');

    it('is 22.04% for 20 sec on neve, once per neve burst cast', () => {
      const casts = neveBursts(base.events).length;
      expect(
        hr.length,
        'no hitRatePct buff was applied — the line is still unmodeled'
      ).toBe(casts);
      expect([...new Set(hr.map((b) => b.value))]).toEqual([22.04]);
      expect([...new Set(hr.map((b) => b.targetIdx))]).toEqual([NEVE]);
      for (const b of hr) {
        expect(b.expiresFrame! - b.frame).toBe(20 * FPS);
      }
    });
  });
});

```

### src/skills/overrides/neve.json
```json
{
  "note": "neve (Neve) — SG / Attacker / Water / Burst III, cd 40s, ammo 9, hitsPerShot 10. A self-buffing SG attacker: a timed single-target damage proc, a Full-Burst-gated self ATK+pierce window, and a burst self crit-rate + hit-rate window. || S1 'Bear Power' (10s CD): 'Affects 1 enemy unit(s) with the lowest remaining HP. Deals 145.45% of final ATK as damage.' → ONE block, trigger interval sec:10 (the DATAMINED skill cooldown skillCooldownsSec.skill1=10; engine interval phase fires first at t=10 then every 10s — the snow-white 15s-CD precedent), target enemy, flatDamage atkPct:145.45. The 'lowest remaining HP' clause is MOOT: v1 fields a single immortal boss (no HP pool), so lowest-HP is indeterminate and {kind:'enemy'} resolves to the one enemy — documented stand-in, moves no damage. The bare flatDamage takes the engine rider defaults (crit-eligible, no core, skill bucket; FB-major by landing timing) — none stated in prose, all rider convention (helm H6). || S2 'Hibernation' (on Full Burst enter, self): 'Gain Pierce for 2 round(s). ATK ▲ 124.8% for 2 round(s).' → ONE block, trigger fullBurstEnter (literal 'Activates when entering Full Burst' — fires on EVERY team Full Burst, NOT burstCast), target self, two effects in kit order: (1) gainPierce — the Pierce tag; the schema exposes only durationSec (NO round granularity), so the '2 round(s)' window is a flagged ⚑ durationSec:2 estimate (≈2 SG pulls; damage-INERT at scope lock — pierceDamagePct is parsed-but-inert in v1 and neve is a Water SG with no Pierce Damage ▲ carrier in the graded comp, proven byte-identical totals with the effect removed; naga/alice pierce-tag convention; NEVER a top-level hasPierce, which cannot time-gate a 2-round FB window). (2) buff atkPct 124.8 durationShots:2 — a ROUND count (kit 'for 2 round(s)'), NO wall-clock expiry, holder-scoped; a round = one SG trigger pull (hitsPerShot 10 pellets ≠ 10 rounds). || BURST 'Roar' (burstCast, self): 'Critical Rate ▲ 31.95% for 20 sec. Hit Rate ▲ 22.04% for 20 sec.' → ONE block, trigger burstCast (the burst skill's own effect on cast; fires ONLY on neve's own casts), target self, two effects: critRatePct 31.95 / 20s (UNSCOPED — kit says 'Critical Rate' with no 'of normal attacks' qualifier, so it lifts every neve hit incl. the S1 rider's crit roll) + hitRatePct 22.04 / 20s (a real primitive — sim.ts hrCoreMult core-hit lift, live by default; for an SG it tightens pellet landing/core exposure, NOT defensive, NOT skippable; the Hit-Rate→core conversion MAGNITUDE is measured-only ⚑ so only the stat application is pinned). || TIER 2: round-count durationShots (S2 ATK) + fullBurstEnter-vs-burstCast trigger discrimination (S2 vs burst), exercised on the dual-B3 controlComp('neve') where the co-B3 helm makes the Full Burst count exceed neve's own cast count. Faithful>fit; measured>fudge. || Kit-autonomy gauntlet 2026-08-02.",
  "caveats": [
    "skill1: cadence is the DATAMINED skill cooldown (interval 10s); first-fire phase (t=10 vs t=0) is the engine interval convention (⚑). 'lowest remaining HP' resolves to the single boss (v1 has no HP pool — moot, damage-inert stand-in)",
    "skill2: 'Gain Pierce for 2 round(s)' is modeled as gainPierce durationSec:2 — a ⚑ rounds→seconds estimate (gainPierce has no round granularity; ≈2 SG pulls, unmeasured — recipe: read Neve's SG pull cadence from footage). Damage-INERT at scope lock (pierceDamagePct inert in v1; no Pierce Damage ▲ carrier lands on a Water SG), proven byte-identical totals with the effect removed",
    "skill2: ATK ▲124.8% is a 2-ROUND count (durationShots:2, no wall-clock expiry) — the window spans her 2 SG pulls post-FB-entry and would stretch across a reload if she enters FB low on ammo",
    "burst: Hit Rate ▲22.04% feeds the sim's derived Hit-Rate→core-hit lift (hrCoreMult, live by default); the conversion magnitude is a measured-only ⚑, so the test pins the stat application, not a specific core-rate delta"
  ],
  "unmodeled": {
    "skill1": [],
    "skill2": [],
    "burst": []
  },
  "skill1": [
    {
      "slot": "skill1",
      "trigger": { "kind": "interval", "sec": 10 },
      "target": { "kind": "enemy" },
      "effects": [{ "kind": "flatDamage", "atkPct": 145.45 }]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": { "kind": "fullBurstEnter" },
      "target": { "kind": "self" },
      "effects": [
        { "kind": "gainPierce", "durationSec": 2 },
        { "kind": "buff", "stat": "atkPct", "value": 124.8, "durationShots": 2 }
      ]
    }
  ],
  "burst": [
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "self" },
      "effects": [
        { "kind": "buff", "stat": "critRatePct", "value": 31.95, "durationSec": 20 },
        { "kind": "buff", "stat": "hitRatePct", "value": 22.04, "durationSec": 20 }
      ]
    }
  ]
}

```
