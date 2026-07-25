# S7 JUDGE PACKET — `rei-ayanami` (self-contained, answer-faithful compilation of the gauntlet artifacts)

You are the S7 RECONCILING JUDGE (binding go/no-go) for the kit-autonomy gauntlet on this unit. Grade the
driver's IMPLEMENTATION against ground truth (the real kit prose + the damage-formula SSOT + two INDEPENDENT
blind re-derivations from the OTHER model family, claude-opus-5). You grade ARTIFACTS, not intent: you do NOT
trust the driver's self-report. EXACT SLUG: `rei-ayanami` (Rei Ayanami, MG/Attacker/Fire/Burst III, cd 40s, ammo 300,
reloadFrames 171, hitsPerShot 1, normalMult 5.57; nicknamed "ra" — there is NO other Rei variant).

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

## 1. Ground truth — kit prose + base stats (data/characters.json → characters['rei-ayanami'])

```json
{
  "slug": "rei-ayanami",
  "name": "Rei Ayanami",
  "weapon": "MG",
  "burst": "III",
  "class": "Attacker",
  "element": "Fire",
  "manufacturer": "Abnormal",
  "burstCooldownSec": 40,
  "normalAttackMultiplier": 5.57,
  "coreAttackMultiplier": 200,
  "ammo": 300,
  "reloadFrames": 171,
  "chargeFrames": 0,
  "hitsPerShot": 1,
  "burstGaugePerShot": 0.05,
  "baseStats": {
    "hp": 13500,
    "atk": 600,
    "def": 75,
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
    "resourceId": 831
  },
  "skills": {
    "skill1": "■ Activates after 100 normal attack(s). Affects self.\nElemental Advantage Attack Damage ▲ 30.23% for 3 sec.\n■ Activates after landing 100 normal attack(s). Affects the enemy within attack range nearest to the crosshair.\nDeals 112.37% of final ATK as damage.",
    "skill2": "■ Activates at the start of battle. Affects self. \nDamage dealt to Shield ▲ 700.5% continuously.\n■ Activates when entering Burst stage 3. Affects all Fire Code allies.\nATK ▲ 25.03% of the skill user's ATK for 10 sec.",
    "burst": "■ Affects all Fire Code allies.\nCreates a Shield equal to 13.44% of the skill user's final Max HP for 10 sec.\nAttack damage ▲ 48.02% for 10 sec.\n■ Affects all enemies.\nDeals 990.2% of final ATK as damage."
  }
}
```

---

## 2. Damage-formula + mechanics SSOT (docs/data/damage-calculation.md + docs/data/game-mechanics.md)

### 2a. damage-calculation.md
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


### 2b. game-mechanics.md
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

## 3. Verified engine facts (use when classifying)

(a) The schema HAS `casterAtkPct` (a FLAT add of the CASTER's ATK, resolved at apply — the event `value` is the
    flat ATK grant, the buff `key` carries the raw kit %) and `elemAdvantageDamagePct` ( Elemental Advantage
    Attack Damage). Both are real StatKeys; neither is a redaction artifact.
(b) `elemAdvantageDamagePct` lives in the ELEMENT bucket and the engine SELF-GATES on real elemental advantage:
    `advantaged(u) = BEATS[u.element] === bossElement || u.advantageVs.has(bossElement)`, and
    `BEATS = { Electric:Water, Iron:Electric, Wind:Iron, Fire:Wind, Water:Fire }`. So Rei (Fire) is advantaged
    ONLY vs a Wind boss; vs Fire/Iron/etc. the buff is inert (moves zero damage).
(c) `hitCount` trigger: each shot adds `hitsPerShot` (1 for this MG) to a per-block counter; when it reaches
    `count` the block fires and the counter wraps. So proc count == floor(totalShots / count). The two skill1
    blocks (both hitCount 100) have independent counters but fire on the same frames.
(d) `stageEnter { stage: 3 }` fires for EVERY unit carrying such a block whenever the burst chain reaches stage 3
    (i.e. on ANY Burst III cast — Rei's own OR a co-B3 teammate's). This is distinct from `burstCast` (own-cast
    only) and from `fullBurstEnter` (FB window open).
(e) `flatDamage` riders: crit at the caster's sheet rate by default (`crit !== false`), NEVER core unless
    `core:true`, noRange forced; a `burstCast`-keyed flatDamage is FB-EXEMPT (the cast lands before the FB window
    opens → no +50% major), while a skill1/skill2 proc takes FB by actual landing timing (no noFb ⇒ in-FB procs
    DO take the +50% major).
(f) flatDamage procs call `skillGauge()` — skill-damage hits generate weapon-base burst gauge. So removing a
    flatDamage rider shifts the caster's burst timing and therefore the team's Full-Burst cadence: a rider is NOT
    pure personal damage — it can move teammates' totals by a tiny amount via gauge coupling.
(g) `shield { maxHpPct, durationSec }` models NO HP pool (the v1 boss deals no damage); it emits NO damage/buff
    log event — it only sets a `shieldedUntilFrame` state window and fires recipients' `shielded` triggers /
    opens `requiresShielded` gates. With no shield-synergy consumer in the comp it is unobservable end-to-end.
(h) "Damage dealt to Shield" scopes ONLY to enemy shield HP; the partless scope-lock boss has no shield pool and
    the schema has no shield-damage StatKey, so that line is mechanically inert (belongs in `unmodeled`).
(i) buff `key` format: `${casterIdx}:${slot}:${stat}:${rawValue}`. buffApply event fields: frame, sec, key, stat,
    value (flat-resolved for casterAtkPct; raw % for plain stats), stacks, maxStacks, casterIdx, targetIdx,
    targetSlug, refresh, expiresFrame, durationShots.

---

## 4. Driver's shipped override (src/skills/overrides/rei-ayanami.json)

```json
{
  "note": "HAND-AUTHORED from kit prose (NOT measured/hand-tuned against a real fight). Every ⚑ below is an UNMEASURED estimate; record against a real fight before trusting any number. — Rei Ayanami (`rei-ayanami`, MG B3 Attacker Fire Abnormal, ammo 300 / reloadFrames 171 / hitsPerShot 1 / normalMult 5.57 / burstGaugePerShot 0.05): S1 block A = 'after 100 normal attacks, self, Elemental Advantage Attack Damage ▲ 30.23% for 3 sec' → hitCount 100 self elemAdvantageDamagePct 30.23 dur 3 — Damage-Up-bucket entry active ONLY with elemental advantage (Fire vs a Fire-weak boss); inert vs a non-advantaged/neutral boss (⚑1). S1 block B = 'after landing 100 normal attacks, enemy nearest crosshair, Deals 112.37% of final ATK as damage' → hitCount 100 enemy flatDamage 112.37 — function-type skill damage: crit at caster rate (engine default), never core, noRange automatic for flatDamage, FB by landing timing. S2 block A = 'start of battle, self, Damage dealt to Shield ▲ 700.5% continuously' → UNMODELED: the schema has no shield-damage StatKey and the scope-lock boss is partless (no shield), so this buff moves no damage (inert). S2 block B = 'entering Burst stage 3, all Fire Code allies, ATK ▲ 25.03% of the skill user's ATK for 10 sec' → stageEnter stage 3 alliesOfElement Fire casterAtkPct 25.03 dur 10 — flat caster-static-ATK add (casterAtkPct). Burst block A = 'all Fire Code allies, Shield 13.44% of caster final Max HP 10s + Attack damage ▲ 48.02% 10s' → burstCast alliesOfElement Fire [shield maxHpPct 13.44 dur 10 (event-only, no HP pool modeled), buff attackDamagePct 48.02 dur 10 (Damage-Up bucket)]. Burst block B = 'all enemies, Deals 990.2% of final ATK as damage' → burstCast enemy flatDamage 990.2 — burst nuke: crit at caster rate, never core, noRange, FB-exempt by cast-instant timing (lands before Full Burst begins). ⚑ LIST: (1) elemAdvantageDamagePct active only vs a Fire-weak boss; inert on the neutral scope-lock boss unless the graded comp is Fire-advantaged. (2) hitCount-100 proc cadence depends on MG fire rate (MG wind-up ladder + full-spin are measured engine constants, but her reloadFrames 171 is unverified datamine). (3) burst shield is event-only (no HP pool in v1; fires shielded triggers only). Kit-autonomy gauntlet 2026-07-25: all 6 kit lines verified FAITHFUL by test-first gauntlet (scripts/tests/units/rei-ayanami.test.ts, 25 assertions green); S2 block A Damage-to-Shield confirmed correctly UNMODELED/inert (the ~8x over-credit trap); cross-family S2b(claude-fable-5) converged with driver.",
  "caveats": [
    "skill1: Elemental Advantage Attack Damage ▲ 30.23% is active only with elemental advantage (Fire vs a Fire-weak boss); inert on a non-advantaged/neutral boss (⚑1)",
    "skill1: the 112.37% proc cadence (hitCount 100) depends on MG fire rate; reloadFrames 171 is unverified datamine (⚑2)",
    "burst: the 13.44% caster-Max-HP shield is event-only (no HP pool modeled in v1); fires shielded triggers only (⚑3)"
  ],
  "unmodeled": {
    "skill1": [],
    "skill2": [
      "Damage dealt to Shield ▲ 700.5% continuously — no shield-damage StatKey in the schema; inert vs the partless scope-lock boss (no shield)."
    ],
    "burst": []
  },
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "hitCount",
        "count": 100
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "elemAdvantageDamagePct",
          "value": 30.23,
          "durationSec": 3
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "hitCount",
        "count": 100
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 112.37
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "stageEnter",
        "stage": 3
      },
      "target": {
        "kind": "alliesOfElement",
        "element": "Fire"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 25.03,
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
        "kind": "alliesOfElement",
        "element": "Fire"
      },
      "effects": [
        {
          "kind": "shield",
          "maxHpPct": 13.44,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 48.02,
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
          "kind": "flatDamage",
          "atkPct": 990.2
        }
      ]
    }
  ]
}

```

---

## 5. S6 BLIND override (claude-opus-5, independent prose→JSON, leakDetected:null) — block structure + diff vs driver

```json
{
  "slug": "rei-ayanami",
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "hitCount",
        "count": 100
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "elemAdvantageDamagePct",
          "value": 30.23,
          "durationSec": 3
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "hitCount",
        "count": 100
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 112.37,
          "crit": true
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "stageEnter",
        "stage": 3
      },
      "target": {
        "kind": "alliesOfElement",
        "element": "Fire"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 25.03,
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
        "kind": "alliesOfElement",
        "element": "Fire"
      },
      "effects": [
        {
          "kind": "shield",
          "maxHpPct": 13.44,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 48.02,
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
          "kind": "flatDamage",
          "atkPct": 990.2,
          "crit": true
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [],
    "skill2": [
      "■ Activates at the start of battle. Affects self. Damage dealt to Shield ▲ 700.5% continuously."
    ],
    "burst": []
  },
  "caveats": [
    "⚑ CADENCE: both skill1 blocks key off hitCount:100 rounds. Real-world proc rate is set by the MG's datamined cadence (rate_of_fire is a known-unreliable field) and the 300-round belt + 171f reload — a 100-round threshold means roughly one proc per third of a magazine. Wall-clock proc rate is UNVERIFIED.",
    "⚑ TWO COUNTERS, ONE THRESHOLD: the kit distinguishes 'after 100 normal attack(s)' (skill1a) from 'after landing 100 normal attack(s)' (skill1b). Modeled as two independent hitCount:100 blocks, i.e. both fire on the same round. If the sim ever models misses on normal attacks, the LANDED counter would lag the FIRED counter and the two would desync.",
    "⚑ RIDER CRIT: skill1b (112.37%) and the burst nuke (990.2%) are authored crit:true per the rider prior (riders crit at the caster's sheet rate). No core (the text never says 'core strike damage'). noRange is engine-automatic and not authored.",
    "⚑ noFb: NOT set on either damage rider (default OFF, measured-only). The burst 990.2% is cast-timed and should land pre-FB by timing; skill1b's 112.37% takes FB by timing. If popup reads show the burst nuke carrying/not carrying the +50% FB major, pin noFb from that.",
    "ELEMENT GATE: elemAdvantageDamagePct is only live when the caster actually has elemental advantage. rei-ayanami is Fire, so on the Fire scope-lock boss this buff contributes ZERO — it is a real mechanic that happens to be inert on the graded fixture. Do not delete it on an 'it moves nothing' reading.",
    "TRIGGER IDENTITY: skill2b reads 'when entering Burst stage 3' → stageEnter:{stage:3} (fires when ANY ally casts a stage-3 burst), NOT burstCast. In a comp with a second Burst III unit this fires on that unit's cast too; keying it to burstCast would UNDER-credit.",
    "SHIELD/TANDEM: the burst shield is offensively inert alone (no HP pool modeled) but is kept because it emits a shield event that fires teammates' 'shielded' triggers and satisfies requiresShielded gates.",
    "The skill2 'Damage dealt to Shield ▲ 700.5%' line is a large multiplier that is fully unmodeled — the v1 boss has no shield phase and StatKey has no shield-damage channel. If a shielded boss is ever in scope this is the single biggest missing piece of this kit."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Blind second read of the kit prose only (no override/test/board access). MG/Fire/Attacker/Burst III. skill1 = two independent 100-normal-attack counters: a 3s self elemental-advantage damage window (inert vs a Fire boss) and a 112.37% single-target rider. skill2 = an unmodeled 700.5% damage-to-Shield passive (no shield in v1, no StatKey) plus a stage-3-entry 25.03%-of-caster-ATK grant to Fire allies for 10s. Burst = Fire-ally shield (13.44% of caster final Max HP) + 48.02% Attack Damage for 10s, and a 990.2% AoE nuke. No ignored blocks; every skipped line is verbatim in unmodeled."
}
```

**DIFF vs driver — classified (EVERY divergence is a no-op; the blind converged on all load-bearing mechanics):**
- **skill1:** identical except the blind adds explicit `"crit":true` on the 112.37% flatDamage. Engine default is
  crit-ON (`crit !== false`), so `crit:true` is a SEMANTIC NO-OP, not a divergence.
- **skill2:** EXACT MATCH — `stageEnter { stage: 3 }` → `alliesOfElement Fire` → `casterAtkPct 25.03 / 10s`.
- **burst:** identical except the blind adds explicit `"crit":true` on the 990.2% flatDamage nuke (same no-op).
  The Fire-allied package [shield 13.44%/10s + attackDamagePct 48.02%/10s] and the enemy 990.2% nuke match exactly.
- **unmodeled.skill2:** both record "Damage dealt to Shield ▲ 700.5%" as unmodeled/inert (wording differs; both
  correct). NO real divergence anywhere.

---

## 6. Driver's test (scripts/tests/units/rei-ayanami.test.ts — 25 assertions, all GREEN vs shipped)

```ts
// PER-UNIT KIT SPEC — `rei-ayanami` (Rei Ayanami, Attacker/MG/Fire, Burst III, cd 40s, ammo 300,
// reloadFrames 171, hitsPerShot 1, normalMult 5.57). Kit-autonomy gauntlet 2026-07-25
// (driver-authored, test-first). EXACT SLUG: this is `rei-ayanami` (nicknamed "ra") — reason from
// the slug; there is no other Rei variant in the roster.
//
// One assertion group per KIT LINE (RA1..RA5 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters['rei-ayanami'].skills):
//   S1 ■ after 100 normal attacks → self:
//        Elemental Advantage Attack Damage ▲ 30.23% for 3 sec                         [RA1]
//      ■ after landing 100 normal attacks → enemy nearest crosshair:
//        Deals 112.37% of final ATK as damage                                         [RA2]
//   S2 ■ start of battle → self:
//        Damage dealt to Shield ▲ 700.5% continuously                                 [UNMODELED]
//      ■ entering Burst stage 3 → all Fire Code allies:
//        ATK ▲ 25.03% OF THE SKILL USER'S ATK for 10 sec                              [RA3]
//   BU ■ all Fire Code allies:
//        Shield = 13.44% of caster final Max HP for 10 sec                            [⚑ event-only]
//        Attack damage ▲ 48.02% for 10 sec                                            [RA4]
//      ■ all enemies:
//        Deals 990.2% of final ATK as damage                                          [RA5]
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   RA1 elemAdvantageDamagePct 30.23 lives in the ELEMENT bucket and pays ONLY under real Fire
//       advantage (BEATS[Fire]=Wind). Proven three ways: vs a Wind boss removing it changes her
//       total (LIVE); vs an Iron boss (no advantage) removing it changes NOTHING (GATED,
//       byte-identical); and an ungated attackDamagePct counterfactual WOULD change the Iron-boss
//       total (over-credits) — i.e. the shipped gating is one the generic damage buff provably
//       fails. Cadence is the hitCount-100 proc: apply count == floor(her shots / 100) (MG
//       hitsPerShot 1 ⇒ one hit per shot), self-scoped, 3s window.
//   RA2 the hitCount-100 nuke: fires once per 100 landed hits (NOT every shot, NOT once per burst),
//       magnitude 112.37, in the SKILL bucket, crit-eligible (function-type "additional damage"
//       convention), NOT core-eligible (text "as damage", not "core strike damage"). The
//       "enemy nearest crosshair" collapses to the single partless boss (one instance).
//   RA3 casterAtkPct = a FLAT add of HER ATK, never a % of the target's own ATK. Target is
//       element-scoped ("all Fire Code allies"): in this fixture rei is the ONLY Fire unit, so the
//       buff must reach her (targetIdx REI) and EXCLUDE liter/crown (Iron/Iron). Proven two ways:
//       shipped reaches {REI} only, and a generic `allies` counterfactual reaches all three. For
//       the SELF-only Fire target the flat-vs-self-% axis is damage-identical (caster===target ⇒
//       flat 0.2503×herATK == +25.03% of her own ATK), so the mechanic is pinned by the buffApply
//       `stat`/`key` (casterAtkPct, raw 25.03), not a damage delta. Trigger is stageEnter stage 3:
//       rei is the SOLE Burst III unit in the fixture, so it fires precisely on her burstCast
//       frames (apply count == her burst casts), 10s window.
//   RA4 the burst Attack damage ▲48.02% is the load-bearing Damage-Up line: removing it changes her
//       total (LIVE). Element-scoped to Fire allies (reaches {REI} only; generic `allies` reaches
//       all three), burstCast-keyed (once per cast), 10s window. The co-listed Shield (13.44% of
//       caster Max HP) is EVENT-ONLY: the engine models no HP pool, the shield emits NO log event
//       (it only sets a shielded-state window), and no unit in this fixture has a shielded trigger
//       — so it is unobservable here and asserted nowhere (⚑3; documented, not silently dropped).
//   RA5 the burst nuke: 990.2% of final ATK, fires once per burst cast in the BURST bucket,
//       crit-eligible, NOT core-eligible, and FB-EXEMPT — a burst CAST lands BEFORE the Full Burst
//       window opens, so it must never take the +50% major (verified engine fact).
//
// Fixture: liter (B1) / crown (B2) / rei-ayanami (B3), helm OMITTED so rei is the SOLE Burst III
// caster — her stageEnter-3 (RA3) and burstCast (RA4/RA5) blocks then fire exactly on her own burst
// frames, with no second B3 to share the stage. She needs the B1→B2→B3 chain to cast at all (a lone
// Burst III unit makes ZERO Full Bursts). Boss element varies per line: Wind makes rei (Fire) the
// ONLY advantaged unit (RA1 LIVE); Iron makes nobody advantaged (RA1 gating control). Deterministic
// (no seed). Inert UNMODELED stats: S2's "Damage dealt to Shield ▲700.5%" — no shield-damage StatKey
// in the schema and the scope-lock boss is partless (no shield), so it moves no damage; it lives in
// the override's `unmodeled.skill2` and is asserted nowhere.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
const SLUG = 'rei-ayanami';
/** controlComp(SLUG, false) slot order: liter 0 / crown 1 / rei-ayanami 2 (helm omitted). */
const REI = 2;
/** controlComp(SLUG, true) slot order: liter 0 / crown 1 / rei-ayanami 2 / helm 3. */
const HELM = 3;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

type Boss = 'Wind' | 'Iron';

/** Primary fixture: boss Wind ⇒ rei (Fire) is the ONLY advantaged unit (BEATS[Fire]=Wind; liter and
 *  crown are Iron, not advantaged). `Iron` is the no-advantage control for RA1. helm is OMITTED so
 *  rei is the sole Burst III caster — her stageEnter-3 and burstCast blocks then fire exactly on her
 *  own burst frames (clean per-line cadence). */
function run(overrides: Record<string, any> = {}, bossElement: Boss = 'Wind') {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp(SLUG, false),
    bossElement,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

/** Trigger-identity fixture: helm RESTORED as a second Burst III caster. Now "entering stage 3"
 *  (stageEnter) fires on EVERY B3 cast — rei's AND helm's — while rei's OWN burstCast blocks fire on
 *  rei's casts only. The divergent cadences are the stageEnter-vs-burstCast discriminator (RA3 vs
 *  RA4/RA5). Boss Wind keeps rei the only advantaged unit. */
function runHelm(
  overrides: Record<string, any> = {},
  bossElement: Boss = 'Wind',
) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp(SLUG, true),
    bossElement,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual / reference patches -------------------------------------------------------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);

/** RA1 reference: her S1 elemental-advantage line removed. */
const reiNoElemAdv = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill1.flatMap((b: any) => b.effects).length;
  for (const b of ov.skill1)
    b.effects = b.effects.filter(
      (e: any) => e.stat !== 'elemAdvantageDamagePct',
    );
  if (ov.skill1.flatMap((b: any) => b.effects).length === before)
    throw new Error(
      'rei S1 elemAdvantageDamagePct effect missing — fixture is stale',
    );
});
/** RA1 counterfactual: the same line as an UNGATED Damage-Up buff (over-credits when not advantaged). */
const reiUngatedElemAdv = withPatchedOverride(SLUG, (ov) => {
  const e = ov.skill1
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'elemAdvantageDamagePct');
  if (!e)
    throw new Error(
      'rei S1 elemAdvantageDamagePct effect missing — fixture is stale',
    );
  e.stat = 'attackDamagePct';
});
/** RA2/RA5 encoding reference: both flatDamage riders made core-eligible (text says "as damage"). */
const reiCoreRider = withPatchedOverride(SLUG, (ov) => {
  let patched = 0;
  for (const slot of ['skill1', 'burst'] as const)
    for (const b of ov[slot])
      for (const e of b.effects)
        if (e.kind === 'flatDamage') {
          e.core = true;
          patched++;
        }
  if (patched !== 2)
    throw new Error(
      'rei expected 2 flatDamage riders (S1 + burst) — fixture is stale',
    );
});
/** RA3 encoding reference: casterAtkPct → atkPct (self-scaling % instead of flat caster add). */
const reiAtkPct = withPatchedOverride(SLUG, (ov) => {
  const e = ov.skill2
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'casterAtkPct');
  if (!e)
    throw new Error('rei S2 casterAtkPct effect missing — fixture is stale');
  e.stat = 'atkPct';
});
/** RA3/RA4 counterfactual: re-target every Fire-element-scoped block to ALL allies. */
const reiGenericAllies = withPatchedOverride(SLUG, (ov) => {
  let patched = 0;
  for (const slot of ['skill2', 'burst'] as const)
    for (const b of ov[slot])
      if (b.target?.kind === 'alliesOfElement') {
        b.target = { kind: 'allies' };
        patched++;
      }
  if (patched !== 2)
    throw new Error(
      'rei expected 2 alliesOfElement blocks (S2 + burst) — fixture is stale',
    );
});
/** RA4 reference: her burst Attack-damage line removed (the load-bearing Damage-Up buff). */
const reiNoBurstDmgUp = withPatchedOverride(SLUG, (ov) => {
  const before = ov.burst.flatMap((b: any) => b.effects).length;
  for (const b of ov.burst)
    b.effects = b.effects.filter((e: any) => e.stat !== 'attackDamagePct');
  if (ov.burst.flatMap((b: any) => b.effects).length === before)
    throw new Error(
      'rei burst attackDamagePct effect missing — fixture is stale',
    );
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run(); // boss Wind, shipped
const noElemAdv = run({ [SLUG]: reiNoElemAdv });
const coreRider = run({ [SLUG]: reiCoreRider });
const atkPct = run({ [SLUG]: reiAtkPct });
const genericAllies = run({ [SLUG]: reiGenericAllies });
const noBurstDmgUp = run({ [SLUG]: reiNoBurstDmgUp });
const baseIron = run({}, 'Iron'); // no advantage control
const noElemAdvIron = run({ [SLUG]: reiNoElemAdv }, 'Iron');
const ungatedElemAdvIron = run({ [SLUG]: reiUngatedElemAdv }, 'Iron');
const withHelm = runHelm(); // 2nd B3 ⇒ trigger-identity triangle

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const reiDamage = (evs: SimEvent[], srcSlot: Damage['srcSlot']) =>
  dmg(evs).filter((d) => d.slug === SLUG && d.srcSlot === srcSlot);
const reiShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === SLUG);
const reiBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === SLUG);
const helmBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'helm',
  );
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
/** Buffs emitted by rei's own kit on the given stat. */
const reiBuffs = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === REI && b.stat === stat);
/** Distinct holder slot indices a given rei buff key reached. */
const holdersOf = (evs: SimEvent[], key: string): Set<number> =>
  new Set(
    buffs(evs)
      .filter((b) => b.key === key)
      .map((b) => b.targetIdx as number),
  );

const S1_ELEMADV_KEY = `${REI}:skill1:elemAdvantageDamagePct:30.23`;
const S2_ATK_KEY = `${REI}:skill2:casterAtkPct:25.03`;
const BU_DMGUP_KEY = `${REI}:burst:attackDamagePct:48.02`;

describe('rei-ayanami — kit spec', () => {
  it('fixture sanity: rei actually casts her burst (needs the B1→B2→B3 chain)', () => {
    expect(
      reiBursts(base.events).length,
      'no rei burst was cast — fixture cannot exercise burst lines',
    ).toBeGreaterThan(0);
  });

  describe('RA1 — S1 Elemental Advantage Attack Damage ▲30.23%, hitCount 100, self, gated on advantage', () => {
    const applied = buffs(base.events).filter((b) => b.key === S1_ELEMADV_KEY);
    const procsExpected = Math.floor(reiShots(base.events).length / 100);

    it('is 30.23% on herself, one proc per 100 landed hits, 3 sec window', () => {
      expect(
        applied.length,
        'no S1 elemAdvantageDamagePct buff was applied',
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.stat))]).toEqual([
        'elemAdvantageDamagePct',
      ]);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([30.23]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([REI]);
      expect(
        applied.length,
        `${applied.length} procs vs ${procsExpected} = floor(shots/100)`,
      ).toBe(procsExpected);
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(3 * FPS);
    });

    it('is LIVE under Fire advantage (Wind boss): removing it changes her total', () => {
      expect(base.totals[SLUG]).not.toEqual(noElemAdv.totals[SLUG]);
    });

    it('is GATED with no advantage (Iron boss): removing it changes NOTHING (byte-identical)', () => {
      expect(baseIron.totals).toEqual(noElemAdvIron.totals);
    });

    it('DISCRIMINATING: an ungated Damage-Up buff WOULD change the no-advantage total', () => {
      expect(baseIron.totals[SLUG]).not.toEqual(
        ungatedElemAdvIron.totals[SLUG],
      );
    });
  });

  describe('RA2 — S1 hitCount-100 nuke: 112.37% of final ATK, skill bucket, crit not core', () => {
    const riders = reiDamage(base.events, 'skill1');
    const procsExpected = Math.floor(reiShots(base.events).length / 100);

    it('lands once per 100 hits (NOT every shot, NOT once per burst)', () => {
      expect(riders.length, 'no S1 nuke landed').toBeGreaterThan(0);
      expect(
        riders.length,
        `${riders.length} procs vs ${procsExpected} = floor(shots/100)`,
      ).toBe(procsExpected);
      expect(riders.length).toBeLessThan(reiShots(base.events).length);
    });

    it('is the kit magnitude, crit-eligible, NOT core-eligible, in the skill bucket', () => {
      expect([...new Set(riders.map((d) => d.atkPct))]).toEqual([112.37]);
      expect([...new Set(riders.map((d) => d.bucket))]).toEqual(['skill']);
      expect(riders.every((d) => d.critEligible)).toBe(true);
      expect(riders.every((d) => !d.coreEligible)).toBe(true);
    });

    it('DISCRIMINATING: a core:true rider would become core-eligible (text says "as damage")', () => {
      expect(
        reiDamage(coreRider.events, 'skill1').every((d) => d.coreEligible),
      ).toBe(true);
    });

    it('is FB-by-timing, NOT noFb: procs landing inside Full Burst take the +50% major', () => {
      // The rider has no noFb flag, so a proc that lands while the FB window is open is FB-eligible.
      // Over 180s several procs land in-window; a wrongly-set noFb would make this empty.
      expect(riders.some((d) => d.fbMajorApplied)).toBe(true);
    });
  });

  describe('RA3 — S2 entering Burst Stage 3: ATK ▲25.03% of HER ATK, Fire allies, 10 sec (stageEnter)', () => {
    const applied = buffs(base.events).filter((b) => b.key === S2_ATK_KEY);

    it("is casterAtkPct (flat add of the skill user's ATK), magnitude 25.03, for 10 sec", () => {
      expect(
        applied.length,
        'no stageEnter-3 casterAtkPct buff was applied',
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.stat))]).toEqual([
        'casterAtkPct',
      ]);
      for (const b of applied) expect(b.key).toBe(S2_ATK_KEY);
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });

    it('fires on her burstCast frames (sole B3 in fixture ⇒ once per burst cast)', () => {
      expect(applied.length).toBe(reiBursts(base.events).length);
    });

    it('reaches the Fire ally (herself) and EXCLUDES every non-Fire ally', () => {
      expect([...holdersOf(base.events, S2_ATK_KEY)].sort()).toEqual([REI]);
    });

    it('DISCRIMINATING: a generic `allies` target would reach all three units', () => {
      expect([...holdersOf(genericAllies.events, S2_ATK_KEY)].sort()).toEqual([
        0,
        1,
        REI,
      ]);
    });

    it('ENCODING: shipped logs casterAtkPct, the atkPct counterfactual logs atkPct (distinct mechanic)', () => {
      expect(reiBuffs(base.events, 'casterAtkPct').length).toBeGreaterThan(0);
      expect(
        reiBuffs(atkPct.events, 'casterAtkPct').filter((b) =>
          b.key.startsWith(`${REI}:skill2:`),
        ).length,
      ).toBe(0);
      expect(reiBuffs(atkPct.events, 'atkPct').length).toBeGreaterThan(0);
    });
  });

  describe('RA4 — burst Attack damage ▲48.02%, Fire allies, 10 sec (the load-bearing Damage-Up line)', () => {
    const applied = buffs(base.events).filter((b) => b.key === BU_DMGUP_KEY);

    it('is 48.02% for 10 sec, burstCast-keyed (once per cast)', () => {
      expect(
        applied.length,
        'no burst attackDamagePct buff was applied',
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([48.02]);
      expect(applied.length).toBe(reiBursts(base.events).length);
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });

    it('reaches the Fire ally (herself) and EXCLUDES every non-Fire ally', () => {
      expect([...holdersOf(base.events, BU_DMGUP_KEY)].sort()).toEqual([REI]);
    });

    it('DISCRIMINATING: a generic `allies` target would reach all three units', () => {
      expect([...holdersOf(genericAllies.events, BU_DMGUP_KEY)].sort()).toEqual(
        [0, 1, REI],
      );
    });

    it('is LIVE: removing it changes her total (the FB-window Damage-Up is not inert)', () => {
      expect(base.totals[SLUG]).not.toEqual(noBurstDmgUp.totals[SLUG]);
    });
  });

  describe('RA5 — burst nuke: 990.2% of final ATK, cast BEFORE the Full Burst window', () => {
    const nukes = reiDamage(base.events, 'burst');

    it('fires once per burst cast at the kit magnitude, in the burst bucket, crit not core', () => {
      expect(nukes.length).toBe(reiBursts(base.events).length);
      expect(nukes.length).toBeGreaterThan(0);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([990.2]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
      expect(nukes.every((d) => d.critEligible)).toBe(true);
      expect(nukes.every((d) => !d.coreEligible)).toBe(true);
    });

    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      const took = nukes.filter((d) => d.fbMajorApplied);
      expect(
        took.map((d) => d.sec),
        'burst-cast damage must precede the FB window',
      ).toEqual([]);
    });

    it('DISCRIMINATING: a core:true nuke would become core-eligible (text says "as damage")', () => {
      expect(
        reiDamage(coreRider.events, 'burst').every((d) => d.coreEligible),
      ).toBe(true);
    });
  });

  describe("trigger identity — stageEnter:3 (RA3) fires on ANY B3 cast; burstCast (RA4/RA5) on rei's own", () => {
    // helm is a second Burst III caster in this fixture. "Entering Burst stage 3" happens on EVERY
    // chain (whoever casts the B3), so rei's stageEnter-3 block (RA3) fires on both rei's AND
    // helm's casts; her burstCast blocks (RA4 Attack damage, RA5 nuke) fire on her OWN casts only.
    // The divergent cadences are the stageEnter-vs-burstCast discriminator.
    const reiCasts = reiBursts(withHelm.events).length;
    const helmCasts = helmBursts(withHelm.events).length;

    it('fixture sanity: both B3 casters actually burst', () => {
      expect(reiCasts).toBeGreaterThan(0);
      expect(helmCasts).toBeGreaterThan(0);
    });

    it("RA3 (stageEnter:3) fires on EVERY B3 cast — rei's AND helm's rotations", () => {
      const applied = buffs(withHelm.events).filter(
        (b) => b.key === S2_ATK_KEY,
      );
      expect(applied.length).toBe(reiCasts + helmCasts);
      expect(
        applied.length,
        'strictly more than rei-only ⇒ stageEnter, not burstCast',
      ).toBeGreaterThan(reiCasts);
    });

    it("RA4 (burstCast Attack damage) fires on rei's casts ONLY, not helm's", () => {
      const applied = buffs(withHelm.events).filter(
        (b) => b.key === BU_DMGUP_KEY,
      );
      expect(applied.length).toBe(reiCasts);
    });

    it("RA5 (burstCast nuke) fires on rei's casts ONLY — count == rei casts, not all B3 casts", () => {
      const nukes = reiDamage(withHelm.events, 'burst');
      expect(nukes.length).toBe(reiCasts);
      expect(
        nukes.length,
        'a stageEnter-keyed nuke would fire on helm rotations too',
      ).toBeLessThan(reiCasts + helmCasts);
    });
  });
});

```

---

## 7. S5 BLIND test convergence (claude-opus-5, leakDetected:null)

**PRISTINE blind test (blind/rei-ayanami.test.ts) run UNMODIFIED vs the driver's shipped override: 9 passed / 1 FAILED
/ 2 skipped (12 total).**

- The **2 skips** are documented GAPs the blind filed correctly: (i) burst shield MAGNITUDE (no HP pool, no
  shield-synergy consumer ⇒ only existence/inertness assertable); (ii) S1a elemAdvantage MAGNITUDE
  (measurement-gated — the blind used a Fire boss, so Rei has no advantage and only the buffApply structure +
  inertness is pinnable; the driver instead used a Wind boss to make S1a LIVE — both valid, convergent).
- The **1 FAILURE** is a BLIND-TEST ASSERTION BUG, NOT an override defect: the blind asserts `noRider.team` is
  byte-identical to `base.team` when Rei's S1B 112.37% rider is removed ("her own rider must not move a
  teammate's number"). This fails because of engine fact (f): the flatDamage rider generates burst gauge
  (`skillGauge()`), so removing it shifts Rei's burst timing → shifts the team's Full-Burst cadence → moves
  crown/liter totals by ~0.02% (helm identical). The rider IS pure personal DAMAGE, but it is NOT gauge-neutral;
  the blind's byte-identical-team inertness assumption is too strict. **Classify this RED: RECON_ERROR (the blind
  misread the gauge-coupling side effect; the driver override + formula agree the rider is faithful).**
- The 9 passing assertions independently corroborate the driver: S1a elemAdvantage buffApply structure +
  advantage-gating (inert vs Fire boss), S1b 112.37% rider live + 100-hit-gated (not per-shot) + no-core/no-range,
  S2b stageEnter-3 casterAtkPct Fire-only (fires on any B3 cast via the helm co-B3), burst 48.02% Damage-Up
  Fire-only + live, burst 990.2% nuke FB-exempt + no-range, and the S2A 700.5% shield-damage line correctly
  absent (no buff with value 700.5).

---

## 8. S2b pre-op adversarial review (claude-fable-5, reviews — dispositions, leakDetected:null)

```json
{
  "slug": "rei-ayanami",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "after 100 normal attack(s) → self",
      "disposition": "FAITHFUL",
      "scope": "Elemental-advantage-scoped Attack Damage — active ONLY when the caster has elemental advantage over the boss (Fire > Wind). Rei is Fire; the controlComp boss is Fire, so this buff is INERT in the control fixture.",
      "durationSemantics": "durationSec: 3 — genuine wall-clock seconds ('for 3 sec'), not rounds. With hitCount 100 on an MG (hitsPerShot 1, ammo 300), it fires ~3×/magazine, giving partial sawtooth uptime.",
      "triggerIdentity": "hitCount count:100 (counts ROUNDS = bullets; MG hitsPerShot 1 so 100 pulls = 100 hits). No FB gate, no status gate.",
      "targetSet": "self only",
      "nearestWrongModel": "Encoding as generic attackDamagePct (unscoped Damage-Up) — over-credits +30.23% against ANY boss element including the no-advantage Fire control boss; secondarily, misreading the trigger as interval instead of hitCount.",
      "distinguishingAssertion": "withPatchedOverride('rei-ayanami', o => strip this buff block) → totals(res)['rei-ayanami'] UNCHANGED vs baseline on the Fire control boss (faithful elemAdvantageDamagePct is inert without advantage); under the nearest-wrong attackDamagePct encoding the delta is nonzero. Also assert the buffApply events carry stat 'elemAdvantageDamagePct', value 30.23, targetIdx === casterIdx, and that apply frames track cumulative shot events crossing multiples of 100 (not a fixed clock).",
      "inertness": "Must move ZERO damage on the Fire control boss; must never buffApply to any ally other than self.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "after landing 100 normal attack(s) → enemy",
      "disposition": "FAITHFUL",
      "scope": "Instant function-damage rider: flatDamage 112.37% of caster final ATK, single-target. Per rider rules: crits at caster's sheet rate, NO core (text lacks 'core strike'), noRange forced (riders excluded from +30% range), FB bonus by landing TIMING (default ON — no noFb).",
      "durationSemantics": "Instant hit, no duration.",
      "triggerIdentity": "hitCount count:100 — 'landing 100 normal attack(s)' counts landed ROUNDS. On a hitscan MG this coincides with skill1-a's counter (both every 100 bullets); they should proc on the same frames.",
      "targetSet": "enemy (boss). resolveTargets({kind:'enemy'}) semantics: the flatDamage lands on the boss.",
      "nearestWrongModel": "(a) Modeling it as an interval/CD trigger instead of hitCount — cadence then stops tracking reload downtime (no hits accrue during the 171-frame reload, so proc rate must dip around reloads); (b) granting core:true; (c) setting noFb:true, stripping the FB +50% from procs that land inside Full Burst.",
      "distinguishingAssertion": "Collect damage events with mult 112.37: (1) inter-proc gaps stretch across reloads (gap in shot events ⇒ equal gap in proc timing) — RED under a fixed interval; (2) every such event has core rate 0 and rangeApplied false; (3) procs landing while inFullBurst===true have fbMajorApplied===true — RED if noFb was wrongly set.",
      "inertness": "Proc count over the fight must equal floor(totalRoundsFired/100) — no extra procs during reloads or from non-normal hits.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "start of battle → self, Dmg to Shield ▲700.5%",
      "disposition": "UNMODELED",
      "scope": "'Damage dealt to Shield' scopes ONLY to enemy shield HP — the v1 partless scope-lock boss has no shield pool, so the line is mechanically inert. There is no StatKey for shield-damage; it belongs verbatim in `unmodeled`.",
      "durationSemantics": "'continuously' = permanent passive (would be a passive trigger if it were modelable).",
      "triggerIdentity": "passive (start of battle).",
      "targetSet": "self",
      "nearestWrongModel": "The catastrophic misread: encoding 700.5% as a generic damage buff (attackDamagePct / damageTakenPct) — a ~8× over-credit that would dominate the entire unit. Any nonzero encoding of this line is wrong.",
      "distinguishingAssertion": "No buffApply event with value 700.5 (any stat) exists in the run; the override's skill2 array contains no block encoding this line, and unmodeled.skill2 quotes it verbatim. withPatchedOverride removal of skill2's other blocks must account for ALL skill2-attributable damage movement.",
      "inertness": "Must move ZERO damage for anyone — this is the single biggest over-credit trap in the kit.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "entering Burst stage 3 → all Fire allies",
      "disposition": "FAITHFUL",
      "scope": "Flat ATK grant scaled by the CASTER's ATK ('of the skill user's ATK') — casterAtkPct 25.03, NOT atkPct (which would scale each target's own ATK).",
      "durationSemantics": "durationSec: 10 — genuine seconds.",
      "triggerIdentity": "stageEnter stage:3 — 'when entering Burst stage 3' fires when ANY unit casts a stage-3 burst, not only Rei. This is neither burstCast (own-cast only) nor fullBurstEnter (FB window open). In controlComp the helm co-B3 makes these diverge: rotations where helm bursts must still fire this block.",
      "targetSet": "alliesOfElement 'Fire' (self included — no 'except self' clause). In the control fixture Rei is plausibly the only Fire unit, so buffApply lands on her alone.",
      "nearestWrongModel": "(a) Trigger as burstCast (Rei-only) — under-fires on every helm-burst rotation; or fullBurstEnter — shifts timing to FB open and fires even if the stage-3 cast semantics differ. (b) Stat as atkPct 25.03 (target-scaled) instead of casterAtkPct. (c) Target as all allies, over-crediting non-Fire teammates.",
      "distinguishingAssertion": "Filter buffApply stat==='casterAtkPct' from casterIdx===rei's slot: (1) an application occurs on rotations where the burstCast event's caster is helm, NOT rei — GREEN under stageEnter, RED under burstCast(own); (2) the emitted value is a FLAT number ≈ 0.2503 × rei.staticAtk (flat-resolved at apply), not 25.03; (3) targetSlug set contains only Fire-element comp members (rei herself in controlComp) — no buffApply on liter/crown/helm.",
      "inertness": "Non-Fire allies' totals must not move when this block is stripped via withPatchedOverride.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Shield = 13.44% caster Max HP, 10s → Fire allies",
      "disposition": "FAITHFUL",
      "scope": "shield effect {maxHpPct:13.44, durationSec:10} — no HP pool modeled, but it MUST be encoded (tandem rule: shields fire recipients' 'shielded' triggers and open requiresShielded gates on teammates; skipping as 'defensive' is the trap).",
      "durationSemantics": "durationSec: 10.",
      "triggerIdentity": "burstCast (Rei's own burst block — fires only on rotations Rei casts, never on helm's).",
      "targetSet": "alliesOfElement 'Fire' (self included).",
      "nearestWrongModel": "(a) Dropped entirely as a no-damage defensive line — kills any shield-synergy tandem; (b) targeted at all allies — would wrongly open a shield-gated teammate's block (e.g. a naga-style requiresShielded) for non-Fire units; (c) keyed to fullBurstEnter, emitting shields on helm-led rotations too.",
      "distinguishingAssertion": "A shield event (with 'shielded' triggers firing on recipients) is emitted exactly once per REI burstCast event and never on helm's burstCast rotations; recipient set is Fire-only. RED under drop (zero shield events), RED under fullBurstEnter (events on helm rotations).",
      "inertness": "Zero direct damage from this line; solo-comp totals unchanged whether present or stripped (its value is tandem-only).",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Attack damage ▲ 48.02% for 10 sec → Fire allies",
      "disposition": "FAITHFUL",
      "scope": "attackDamagePct 48.02 — the additive Damage-Up bucket ('Attack damage'), NOT atkPct (ATK stat) and NOT crit/element scoped.",
      "durationSemantics": "durationSec: 10 — spans the FB window.",
      "triggerIdentity": "burstCast (own burst) — applied at cast, i.e. slightly BEFORE the FB window opens, so it covers the full 10s FB.",
      "targetSet": "alliesOfElement 'Fire' (self included).",
      "nearestWrongModel": "(a) atkPct 48.02 — wrong bucket, multiplies differently against existing ATK buffs (crown/liter support) and materially changes totals; (b) target all allies — over-credits every non-Fire teammate by ~48% Damage-Up for 10s.",
      "distinguishingAssertion": "buffApply on Rei's burstCast frame with stat 'attackDamagePct', value 48.02 (raw percentage — plain % stats keep raw value), targets restricted to Fire slugs. Cross-check bucket: with the block stripped, Rei's per-hit damage during her burst window scales by the Damage-Up dilution factor, not the ATK factor.",
      "inertness": "No buffApply of this key on non-Fire allies; nothing outside the 10s windows.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Deals 990.2% of final ATK → all enemies",
      "disposition": "FAITHFUL",
      "scope": "flatDamage atkPct 990.2 on burst cast, single boss (all-enemies collapses to one target). Rider rules: crit at caster's sheet rate, NO core, noRange; and burst-cast/instant damage is ALWAYS FB-exempt (noFb:true) — the cast lands before the FB window opens.",
      "durationSemantics": "Instant, once per own burst cast.",
      "triggerIdentity": "burstCast — NOT fullBurstEnter. With helm co-B3 in controlComp, this nuke must fire only on Rei's burst rotations.",
      "targetSet": "enemy.",
      "nearestWrongModel": "(a) Omitting noFb — the hit picks up the +50% FB major it cannot have (cast pre-FB), a ~50% over-credit on a 990% hit; (b) keying to fullBurstEnter — fires on helm-led rotations too, roughly doubling nuke count in a 2×B3 comp.",
      "distinguishingAssertion": "Every damage event with mult 990.2 has fbMajorApplied===false and its count over the fight equals Rei's burstCast event count (not the fullBurstStart count). RED under missing-noFb (fbMajorApplied true) and RED under fullBurstEnter keying (count == FB count > Rei's cast count).",
      "inertness": "Zero events with mult 990.2 on rotations where helm is the B3 caster; core contribution of these events is 0.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:elemAdvantage-hitCount100-buff",
    "skill1:hitCount100-flatDamage-112.37",
    "skill2:stageEnter3-casterAtkPct-25.03-fireAllies",
    "burst:shield-13.44-casterMaxHp-fireAllies",
    "burst:attackDamagePct-48.02-fireAllies",
    "burst:flatDamage-990.2-noFb"
  ],
  "unmodeledVerbatim": {
    "skill1": [],
    "skill2": [
      "Damage dealt to Shield ▲ 700.5% continuously."
    ],
    "burst": []
  },
  "notes": "Expected shared-prior misreads to force-test: (1) skill2's 700.5% shield-damage line is the kit's dominant number and MUST be inert/unmodeled — any generic-damage encoding is an ~8× over-credit; assert no buff with value 700.5 exists. (2) skill1's elemAdvantageDamagePct is inert vs the Fire control boss (Fire has no advantage vs Fire) — a strip-the-block totals-unchanged assertion cleanly separates it from a generic attackDamagePct misread; if the test never varies boss element, that inertness check IS the discriminator. (3) Trigger-identity triangle: skill2-b is stageEnter:3 (any B3 cast — must fire on helm's rotations), while ALL three burst-slot lines are burstCast (Rei-only — must NOT fire on helm's rotations); controlComp's helm co-B3 makes both directions observable, so tests should assert both the presence (skill2-b on helm rotations) and the absence (burst lines on helm rotations). (4) The 990.2% nuke needs noFb:true (burst-cast pre-FB) — check fbMajorApplied===false explicitly. (5) casterAtkPct buffApply values are FLAT-resolved (0.2503×staticAtk), so an assertion expecting 25.03 raw would be wrong for skill2-b but right for the plain-percentage 48.02 attackDamagePct. (6) All magnitudes are literal kit text (DATAMINED); the only ALWAYS-⚑ field in play is the MG cadence tuple, which lives in base stats, not these lines.",
  "model": "claude-fable-5"
}

```

Summary: all 6 kit lines FAITHFUL; S2A "Damage dealt to Shield ▲700.5%" UNMODELED/inert (the ~8× over-credit
trap — any generic-damage encoding is wrong). The reviewer's load-bearing set = {S1a elemAdvantage hitCount100,
S1b 112.37 flatDamage, S2b stageEnter3 casterAtkPct Fire, burst shield 13.44 tandem, burst attackDamagePct 48.02
Fire, burst 990.2 noFb}. The reviewer flagged the stageEnter-vs-burstCast trigger-identity triangle (the driver
test discriminates it with a helm co-B3 fixture) and the casterAtkPct flat-resolved event value — both adopted.

---

## 9. Line inventory + driver ⚑ flags

| line | disposition | encoding |
|---|---|---|
| S1a Elemental Advantage Attack Damage ▲30.23%/3s, hitCount100, self | FAITHFUL | elemAdvantageDamagePct 30.23 dur 3; engine-gated on Fire-vs-Wind advantage (⚑1) |
| S1b Deals 112.37% of final ATK, hitCount100, enemy | FAITHFUL | flatDamage 112.37 skill-bucket crit-not-core FB-by-timing |
| S2a Damage dealt to Shield ▲700.5% continuously, self | DOCUMENTED-GAP (unmodeled) | inert — no shield-damage StatKey, partless boss |
| S2b ATK ▲25.03% of caster ATK/10s, stageEnter3, Fire allies | FAITHFUL | casterAtkPct 25.03 dur 10 |
| Burst Shield 13.44% caster Max HP/10s, Fire allies | DOCUMENTED-GAP (⚑ event-only) | shield maxHpPct 13.44 dur 10 — no HP pool, no log event, tandem-only |
| Burst Attack damage ▲48.02%/10s, Fire allies | FAITHFUL | attackDamagePct 48.02 dur 10 (Damage-Up bucket) |
| Burst Deals 990.2% of final ATK, enemy | FAITHFUL | flatDamage 990.2 burst-bucket FB-exempt crit-not-core |

Driver ⚑ flags: (1) elemAdvantageDamagePct active only vs a Fire-weak (Wind) boss; inert on the neutral scope-lock
boss. (2) hitCount-100 proc cadence depends on MG fire rate; reloadFrames 171 is unverified datamine (cadence
tuple, measurement-gated). (3) burst shield is event-only (no HP pool in v1; fires shielded triggers only).

---

## 10. Your task

Apply the method in §0 (the RECONCILING-JUDGE contract above). In particular:
- **A. Convergence:** the pristine S5 blind test vs the driver override is 9 GREEN / 1 RED / 2 skipped. Rule on
  the 1 RED (the gauge-coupling inertness assertion) — RECON_ERROR (blind misread the skillGauge side effect) vs
  REAL-GOTCHA.
- **B/E. S6 diff:** rule on the two `crit:true` additions (semantic no-ops — engine default is crit-ON) and the
  unmodeled-wording difference. Confirm there is NO real divergence.
- **C. Fire-rate:** each FAITHFUL block fires at the prose-implied cadence over 180s (driver test asserts S1a/S1b
  proc count == floor(shots/100); S2b/RA4/RA5 == burst-cast count; the trigger-identity triangle confirms
  stageEnter vs burstCast).
- **D. Discrimination:** each load-bearing test fails under its named nearest-wrong (ungated attackDamagePct for
  S1a; core:true for S1b/RA5; generic-allies + atkPct for S2b/RA4; noBurstDmgUp for RA4 LIVE; noElemAdv for S1a
  LIVE/GATED).
- **F. Magnitudes** are owner/measurement-gated (out of scope) — tag, don't flag.

### Return ONLY the contract JSON (the shape defined in §0 / RECONCILING-JUDGE.md). Save nothing — return it inline.
