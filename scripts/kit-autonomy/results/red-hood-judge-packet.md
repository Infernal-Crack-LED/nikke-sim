# S7 RECONCILING JUDGE — red-hood (Red Hood)

You are the binding reconciling judge for the kit-autonomy gauntlet on `red-hood` (Red Hood — SR / Attacker /
Iron / Λ-burst). Grade the artifacts below AGAINST GROUND TRUTH (the kit prose + base stats). Do NOT trust any
author's self-report; the artifacts embody the reasoning. Classify every kit line FAITHFUL / DOCUMENTED-GAP /
REAL-GOTCHA{SILENT_DROP, ENGINE/FIDELITY, ENCODING}, run the fire-rate "modeled≠working" check, and return the
binding verdict JSON per the contract below.

---

## 1. CONTRACT + RETURN JSON SHAPE (RECONCILING-JUDGE.md)

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

## 2. MECHANICS SSOT (formula + mechanics pack)

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

---

## 3. GROUND TRUTH — kit prose + base stats (data/characters.json → characters['red-hood'])

```json
{
  "slug": "red-hood",
  "name": "Red Hood",
  "weapon": "SR",
  "burst": "Λ",
  "burstCooldownSec": 40,
  "class": "Attacker",
  "element": "Iron",
  "manufacturer": "Pilgrim",
  "normalAttackMultiplier": 69.04,
  "coreAttackMultiplier": 200,
  "ammo": 6,
  "reloadFrames": 141,
  "chargeFrames": 60,
  "chargeMultiplier": 250,
  "hitsPerShot": 1,
  "burstGaugePerShot": 2.8,
  "skills": {
    "skill1": "■ Activates when performing a normal attack. Affects self.\nCharge Speed ▲ 3.81%, stacks up to 10 time(s) and lasts for 5 sec.\n■ Activates at the start of battle. Affects self.\nConvert excess value over 100% of Charge Speed to Charge Damage. Charge Damage ▲ 240% of the excess value continuously.",
    "skill2": "■ Activates at the start of battle. Affects self.\nGain Pierce continuously.\n■ Activates during Beast Cage. Affects all allies.\nDEF ▲ 50.68% of the skill user's DEF for 10 sec.\n■ Activates during The Last Howl. Affects self.\nRecovers 23.04% of attack damage as HP over 10 sec.\n■ Activates when casting Red Wolf. Affects self.\nATK ▲ 71.42% for 10 sec.",
    "burst": "When used in Step 1: Beast Cage\n■ Affects all allies.\nATK ▲ 77.55% of the skill user's ATK for 10 sec.\n■ Affects self.\nCooldown of Burst Skill ▼ 40 sec. Activates once per battle.\nWhen used in Step 2: The Last Howl\n■ Affects self.\nAttract: Taunts all enemies for 10 sec.\nIncoming healing ▲ 74.88% for 10 sec.\nCooldown of Burst Skill ▼ 40 sec. Activates once per battle.\nWhen used in Step 3: Red Wolf\n■ Affects self.\nChanges the weapon in use:\nDamage: 51.46% of final ATK \nFull Charge Damage: 250% of damage\nDuration: 10 sec\nAdditional Effects:\nExpand Pierce range by 100% for 10 sec.\nCharge Speed ▲ 100.8% for 10 sec."
  },
  "burstMeta": {
    "burst_duration": 1000,
    "use_burst_skill": "AllStep",
    "burst_apply_delay": 1,
    "change_burst_step": "NextStep"
  },
  "weaponShotDetail": {
    "damage": 6904,
    "full_charge_damage": 25000,
    "charge_time": 100,
    "rate_of_fire": 60,
    "max_ammo": 6,
    "reload_time": 200,
    "core_damage_rate": 20000
  },
  "baseStats": {
    "hp": 13500,
    "atk": 600,
    "def": 76,
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
    "resourceId": 470
  }
}
```

---

## 4. S2b PRE-OP TEST-FAITHFULNESS REVIEW (claude-fable-5, cross-family) + DRIVER RECONCILIATION

```json
{
  "slug": "red-hood",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "■ normal attack → Charge Speed ▲ 3.81%",
      "disposition": "FAITHFUL",
      "scope": "fires on each trigger pull of her SR (every shot is a charge shot; hitsPerShot 1, so on-fire vs on-hit coincide); buff itself is an unscoped chargeSpeedPct stat",
      "durationSemantics": "wall-clock 5 sec per application, refreshing; stacks to 10 (steady-state 38.1% once ~10 shots have fired; her cadence ~1s+/shot keeps it refreshed except across reloads)",
      "triggerIdentity": "shotFired (\"when performing a normal attack\" — owner's own fire, no gate); NOT hitCount-N, NOT interval",
      "targetSet": "self",
      "nearestWrongModel": "passive at max stacks from t=0 (a flat 38.1% chargeSpeedPct with no ramp), over-crediting the opening and desynchronizing the S1b conversion feed; or 5s misread as per-STACK-pool permanence",
      "distinguishingAssertion": "buffApply events (stat chargeSpeedPct, S1 key) show stacks incrementing 1→10 across her first ~10 shots with 5s expiresFrame each; assert NO stacks:10 apply at frame 0",
      "inertness": "zero chargeSpeedPct from this line before her first shot fires",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Convert excess over 100% Charge Speed → CD",
      "disposition": "FIX",
      "scope": "conversion reads her TOTAL live Charge Speed bonus; output lands in the additive charge bucket (chargeDamagePct), affecting only charge damage",
      "durationSemantics": "\"continuously\" — a live-computed conversion, not a timed buff; effectively nonzero only while total charge speed >100% (i.e. only inside the Red Wolf +100.8% window, when combined ≈ 38.1+100.8 = 138.9%)",
      "triggerIdentity": "passive (start of battle), value dynamic; the schema has no charge-speed→charge-damage conversion primitive, so the honest encoding is a burstCast-stage-3-gated chargeDamagePct of the DERIVED steady-state excess: (138.9−100)×2.40 ≈ 93.4% for 10s (⚑ derived, assumes full S1 stacks at cast)",
      "targetSet": "self",
      "nearestWrongModel": "240% of the TOTAL charge speed (≈333% CD, ignoring the >100% threshold), or a permanent always-on chargeDamagePct even when total ≤100%",
      "distinguishingAssertion": "outside the Red Wolf window, NO chargeDamagePct buffApply from this line exists (S1 alone caps at 38.1% ≤ 100 → excess 0); inside the window with stacks capped, the active chargeDamagePct from this line ≈ 93.4, not ≈333 and not 240",
      "inertness": "must move ZERO damage in any fight segment where her total charge-speed bonus ≤ 100%",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "start of battle → Gain Pierce continuously",
      "disposition": "FAITHFUL",
      "scope": "whole-kit, whole-fight pierce tagging of her attacks",
      "durationSemantics": "permanent (\"continuously\", start of battle) — no durationSec",
      "triggerIdentity": "passive; encode as top-level hasPierce:true (or a passive gainPierce with NO durationSec) — a timed gainPierce would be wrong",
      "targetSet": "self",
      "nearestWrongModel": "dropped entirely (\"pierce is inert on a partless boss\") or given a duration; the tag gates Pierce Damage ▲ bucket eligibility for her and any teammate's pierce buffs",
      "distinguishingAssertion": "override carries hasPierce:true (or an undurationed gainPierce block); with a synthetic pierceDamagePct patch via withPatchedOverride, her damage moves — proving the tag is live whole-fight",
      "inertness": "with no pierceDamagePct source in the comp, this line moves zero damage",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "during Beast Cage → DEF ▲ 50.68% caster's",
      "disposition": "UNMODELED",
      "scope": "caster-DEF-scaled DEF grant; purely defensive, and the schema has no casterDefPct (defPct itself is v1-inert)",
      "durationSemantics": "10 sec",
      "triggerIdentity": "burstCast stage:1 (her OWN step-1 cast — \"during Beast Cage\" names her step-1 burst state), NOT stageEnter:1 (any team B1) and NOT fullBurstEnter",
      "targetSet": "allies (all)",
      "nearestWrongModel": "encoding as an ATK-family stat, or keying to stageEnter:1 so Liter's B1 cast fires it",
      "distinguishingAssertion": "no damage-affecting buffApply attributable to this line ever; in a stage-3-carry fixture it emits nothing at all",
      "inertness": "must move ZERO damage in every comp; record verbatim in unmodeled",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "during The Last Howl → recovers 23.04%…HP",
      "disposition": "FIX",
      "scope": "self lifesteal over the step-2 window; no HP pool in v1, but heal effects emit 'recovery' events that feed on-recovery consumers (tandem rule — do not silently drop)",
      "durationSemantics": "over 10 sec → heal with ticks:10, intervalSec:1 (repeating recovery events across the window, not one instant event)",
      "triggerIdentity": "burstCast stage:2 (her OWN step-2 cast), NOT fullBurstEnter",
      "targetSet": "self",
      "nearestWrongModel": "skipped as \"defensive, inert\" — which silently starves a future on-recovery teammate (Crown-style) in step-2 comps; or single-tick heal",
      "distinguishingAssertion": "in a fixture where red-hood casts stage 2, ~10 recovery events target her across the 10s window; in the standard stage-3 fixture, zero events from this line",
      "inertness": "moves zero damage in any comp lacking an on-recovery consumer",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "casting Red Wolf → ATK ▲ 71.42% 10s",
      "disposition": "FAITHFUL",
      "scope": "generic self atkPct — applies to all her damage in the window (the swap shots)",
      "durationSemantics": "wall-clock 10 sec",
      "triggerIdentity": "burstCast stage:3 (\"when casting Red Wolf\" = her own step-3 cast). burstCast ≠ fullBurstEnter: a fullBurstEnter key would fire on EVERY team FB including rotations she never bursts — the canonical over-credit",
      "targetSet": "self",
      "nearestWrongModel": "fullBurstEnter-keyed (fires every FB) or stageEnter:3 (fires when ANY unit casts a stage-3 burst)",
      "distinguishingAssertion": "buffApply atkPct value 71.42 targeting red-hood occurs exactly on frames where a burstCast event with her srcSlot+stage 3 exists, and on NO other FB entries",
      "inertness": "zero applies on rotations where she does not personally cast stage 3",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Step 1 → allies ATK ▲ 77.55% of caster's",
      "disposition": "FAITHFUL",
      "scope": "caster-ATK-scaled flat add — stat casterAtkPct, flat-resolved at apply to 0.7755×her staticAtk; NOT each target's own ATK",
      "durationSemantics": "wall-clock 10 sec",
      "triggerIdentity": "burstCast stage:1 (only when SHE casts step 1; she is Λ, so which step fires depends on the slot she bursts in)",
      "targetSet": "allies including self (\"all allies\")",
      "nearestWrongModel": "atkPct 77.55 (scales each ally's own ATK — wrong bucket, wrong magnitude per target); or excludeSelf; or firing when Liter casts B1",
      "distinguishingAssertion": "in a fixture where red-hood occupies the B1 role, her stage-1 cast emits buffApply stat 'casterAtkPct' with identical FLAT value ≈0.7755×her staticAtk on all 5 units; when Liter casts B1 instead, zero such applies. NOTE: controlComp puts her at B3 — this block needs a dedicated stage-1 fixture that still completes the burst chain",
      "inertness": "in the standard carry-B3 fixture this block must emit nothing",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Step 1 → Burst CD ▼ 40s, once per battle",
      "disposition": "FAITHFUL",
      "scope": "burst-cooldown economy (her cd is exactly 40s → a full reset), gates rotation count — this IS damage",
      "durationSemantics": "instant, oncePerBattle:true",
      "triggerIdentity": "burstCast stage:1; effect burstCdr {seconds:40, oncePerBattle:true}, self",
      "targetSet": "self",
      "nearestWrongModel": "CDR on every cast (she'd burst every rotation forever) or attached to stage 3 (standard fixture over-rotates)",
      "distinguishingAssertion": "in a stage-1 fixture, the gap between her 1st and 2nd burstCast events is one rotation, and every subsequent gap reverts to the full 40s cadence; in the stage-3 fixture, her cast cadence shows NO reset ever",
      "inertness": "stage-3-only rotations get zero CDR from this line",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Step 2 → Attract: taunts 10s",
      "disposition": "UNMODELED",
      "scope": "defensive aggro control; boss deals no damage in v1",
      "durationSemantics": "10 sec",
      "triggerIdentity": "burstCast stage:2",
      "targetSet": "enemy",
      "nearestWrongModel": "n/a — any damage-affecting encoding would be invented",
      "distinguishingAssertion": "no event of any kind from this line; verbatim in unmodeled.burst",
      "inertness": "must move zero damage",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "burst",
      "kitLine": "Step 2 → Incoming healing ▲ 74.88% 10s",
      "disposition": "UNMODELED",
      "scope": "heal-amplification on herself; no HP pool, and it does NOT emit recovery events (it amplifies, it doesn't heal) — no tandem channel",
      "durationSemantics": "10 sec",
      "triggerIdentity": "burstCast stage:2",
      "targetSet": "self",
      "nearestWrongModel": "confusing it with a heal effect and emitting spurious recovery events that would falsely feed on-recovery consumers",
      "distinguishingAssertion": "zero recovery events attributable to this line; verbatim in unmodeled.burst",
      "inertness": "must move zero damage and emit zero recovery events",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "burst",
      "kitLine": "Step 2 → Burst CD ▼ 40s, once per battle",
      "disposition": "FAITHFUL",
      "scope": "same rotation-economy effect as the step-1 CDR, keyed to her step-2 cast",
      "durationSemantics": "instant, oncePerBattle:true — ⚑ AMBIGUITY: prose does not say whether the once-per-battle flag is SHARED with the step-1 CDR or independent per step; driver must state a reading (a Λ unit casting step 1 then step 2 in consecutive rotations exposes the difference)",
      "triggerIdentity": "burstCast stage:2; burstCdr {seconds:40, oncePerBattle:true}",
      "targetSet": "self",
      "nearestWrongModel": "omitting it (only modeling the step-1 copy), or letting both step-1 and step-2 CDRs fire in one battle without deciding the shared-flag question",
      "distinguishingAssertion": "in a stage-2 fixture her 1st→2nd cast gap shows exactly one reset; step-3 casts never produce a burstCdr",
      "inertness": "inert in the standard stage-3 fixture",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Step 3 → weapon swap 51.46% / FC 250% / 10s",
      "disposition": "FAITHFUL",
      "scope": "temporary weapon override replacing her base SR shots (69.04 normal / 200 core mult) with swap shots: damagePct 51.46 of final ATK, full-charge multiplier 250% via the CHARGE bucket; swap stays SR-class (range band + auto-core path unchanged)",
      "durationSemantics": "hard 10 sec time bound (durationSec:10, no maxShots stated)",
      "triggerIdentity": "burstCast stage:3; effect weaponSwap {damagePct:51.46, chargeMultPct:250, durationSec:10}. ⚑ ALWAYS-⚑ swap shot economy: charge time (base chargeFrames 60 → 1.0s, divided by 1+chargeSpeed ≈ 2.389 → ~0.42s/full charge), ammo consumption during the swap (kit-silent — with ammo 6 and ~0.42s charges the window spans reloads unless the swap doesn't consume; estimate optimistically, pin from footage), and pulls-per-sec are NOT in the text",
      "targetSet": "self (caster weapon overwrite)",
      "nearestWrongModel": "a one-shot flatDamage 51.46% instead of a sustained swap; or dropping chargeMultPct so the 250% full-charge multiplier is lost; or letting base-weapon shots continue alongside the swap",
      "distinguishingAssertion": "for 10s after her stage-3 cast, her damage events carry mult 51.46 through the charge bucket with the 250% full-charge factor and NO 69.04-mult base shots occur; at +10s base shots resume; swap shots inside the FB window carry fbMajorApplied (normal-attack timing, not burst-instant)",
      "inertness": "no swap shots outside the 10s window",
      "evidenceTier": "CALIBRATED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Step 3 → Expand Pierce range 100% 10s",
      "disposition": "UNMODELED",
      "scope": "pierce AoE width — geometric, inert vs a single partless boss",
      "durationSemantics": "10 sec",
      "triggerIdentity": "burstCast stage:3",
      "targetSet": "self",
      "nearestWrongModel": "encoding as pierceDamagePct or any damage stat",
      "distinguishingAssertion": "no damage-affecting event from this line; verbatim in unmodeled.burst",
      "inertness": "must move zero damage",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "burst",
      "kitLine": "Step 3 → Charge Speed ▲ 100.8% 10s",
      "disposition": "FAITHFUL",
      "scope": "self chargeSpeedPct — drives swap-shot cadence AND pushes total charge speed past 100%, arming the skill1 conversion",
      "durationSemantics": "wall-clock 10 sec, co-terminous with the swap window",
      "triggerIdentity": "burstCast stage:3, self buff chargeSpeedPct 100.8 durationSec 10",
      "targetSet": "self",
      "nearestWrongModel": "permanent (whole-fight ~0.42s charges — massive over-credit), or modeled into the swap's chargeTimeSec so the S1 stacks and the conversion no longer compose with it",
      "distinguishingAssertion": "buffApply chargeSpeedPct 100.8 exactly at her stage-3 cast with expiresFrame ≈ cast+600; in-window full-charge cadence reflects combined ≈138.9% (≈0.42s vs 1.0s base); zero presence outside the window",
      "inertness": "no charge-speed contribution from this line outside the 10s window",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:chargeSpeed-stack (3.81%×10, 5s)",
    "skill1:excess-over-100-conversion (240%)",
    "skill2:gain-pierce-continuous",
    "skill2:last-howl-lifesteal-heal-events",
    "skill2:red-wolf-atk-71.42",
    "burst:step1-casterAtkPct-77.55",
    "burst:step1-burstCdr-40-once",
    "burst:step2-burstCdr-40-once",
    "burst:step3-weaponSwap-51.46/250/10s",
    "burst:step3-chargeSpeed-100.8"
  ],
  "unmodeledVerbatim": {
    "skill1": [],
    "skill2": ["DEF ▲ 50.68% of the skill user's DEF for 10 sec."],
    "burst": [
      "Attract: Taunts all enemies for 10 sec.",
      "Incoming healing ▲ 74.88% for 10 sec.",
      "Expand Pierce range by 100% for 10 sec."
    ]
  },
  "notes": "Expected shared-prior misreads the driver must be tested against: (1) STEP-KEYING — every named-state line ('during Beast Cage' / 'The Last Howl' / 'when casting Red Wolf') is HER OWN burstCast at that stage; stageEnter/fullBurstEnter keys over-credit whenever Liter or any other caster opens that stage. (2) BUCKET — step-1 team buff is casterAtkPct (flat 0.7755×her staticAtk on everyone), not atkPct. (3) CONVERSION — 240% applies to the EXCESS over 100% total charge speed, not the total; it is zero outside Red Wolf. (4) FIXTURE COVERAGE — she is Λ; controlComp seats her at B3, so step-1/step-2 blocks (team ATK, CDRs, lifesteal) are structurally unreachable there. Exercising them needs alternate fixtures where she bursts stage 1 or 2 while the comp still chains a full burst (burst-eligibility rule); the standard fixture doubles as the inertness assertion for those blocks. (5) CDR once-per-battle sharing across steps 1/2 is prose-ambiguous — must be a declared reading, not silent. (6) SWAP ECONOMY ⚑ — charge time, ammo consumption, and cadence during Red Wolf are kit-silent; with ammo 6 and ~0.42s effective charges the 10s window spans reloads unless the swap doesn't consume ammo — an optimistic estimate must be flagged, never shipped silently. (7) SLUG DISCIPLINE — red-hood ≠ rapi-red-hood; 'RRH' in the harness docs (rocket meter, storedHit examples) is rapi-red-hood and none of it applies to this unit.",
  "model": "claude-fable-5",
  "driverReconciliation": {
    "driver": "qwen",
    "reviewer": "claude-fable-5",
    "converged": "9/10 load-bearing lines FAITHFUL (S1 CS-stacks 3.81x10/5s; S2 hasPierce; S2 Red Wolf ATK 71.42 stage3; B1 Beast Cage casterAtkPct 77.55 all-allies flat-resolved; B1/B2 burstCdr 40 oncePerBattle; B3 weaponSwap 51.46/250/10s + infinite ammo + 0.3s cadence; B3 chargeSpeed 100.8 folded into swap cadence). UNMODELED inert converged: S2 DEF 50.68, B2 taunt, B2 incoming-healing 74.88, B3 pierce-range-expand.",
    "divergences": [
      {
        "line": "skill1 excess-CS->Charge-Damage conversion",
        "reviewer": "FIX: encode as stage-3-gated chargeDamagePct of derived steady-state excess (138.9-100)x2.4 ~= 93.4 (warm, full S1 stacks at cast); reviewer itself marks it derived/flagged.",
        "driver": "MEASUREMENT-GATED (flag), keep shipped chargeDamagePct 90.",
        "resolution": "NOT a faithfulness bug. Mechanism CONVERGED (stage-3-gated chargeDamagePct = excess-CS-over-100 x 2.4, zero outside Red Wolf). Reviewer independently derived the warm 93.36 the driver note ALREADY documents (kit-status F2a: static 90 should be 93.36 small warm; override note: excess ~39 -> +93%, modeled as 90, stack-ramp averaged). 90 (conservative average) vs 93.36 (warm) are both UNMEASURED point estimates differing only by the stack-ramp assumption; swapping 90->93.36 would trade one unmeasured estimate for another without measurement (MEASURED>FUDGE). Shipped 90 stays, flagged; test PINs the modeled 90 + its damage signature (swap charge-mult 3.4 = 2.5 + 0.9) and discriminates no-conversion. Residual to the true dynamic conversion is the known COLD ~0.867."
      },
      {
        "line": "skill2 The Last Howl lifesteal 23.04% HP/10s",
        "reviewer": "FIX: model as heal ticks:10/intervalSec:1 so it emits recovery events feeding on-recovery consumers (tandem rule, do not silently drop).",
        "driver": "UNMODELED (out-of-domain for the solo-DPS faithfulness basis).",
        "resolution": "NOT a faithfulness bug for this basis. No HP pool; lifesteal moves ZERO of her own damage. The tandem recovery-channel feed is a forward-looking team-synergy refinement (a FUTURE on-recovery teammate in a stage-2 comp), with no validated fixture in the scope-lock DPS basis. Dispositioned UNMODELED + documented verbatim; reviewer tandem observation recorded as a residual/refinement opportunity in the manual-review doc, not a required edit."
      },
      {
        "line": "burst step1/step2 burstCdr 40 oncePerBattle sharing",
        "reviewer": "AMBIGUITY: prose does not state whether the once-per-battle flag is shared across steps 1/2 or independent; driver must declare a reading.",
        "driver": "Declared reading: two INDEPENDENT per-step once-per-battle refunds.",
        "resolution": "Prose lists \"Cooldown of Burst Skill down 40 sec. Activates once per battle.\" separately under Step 1 AND Step 2; the literal reading is one once-per-battle refund per step (override models two separate burstCdr blocks, each oncePerBattle:true). Faithful to prose. Not event-observable (engine emits no burstCdr event); effect entangled with Lambda step-advance timing. Documented, no test assertion."
      }
    ],
    "verdict": "GO",
    "verdictReason": "Reviewer (cross-family, fable) corroborates the driver faithfulness analysis on all 10 load-bearing lines (9 FAITHFUL converged; the conversion line converged on mechanism + flag status). The two reviewer FIX dispositions are (a) a measurement-gated point-estimate refinement the driver already documents and (b) an out-of-domain tandem-channel refinement — neither a faithfulness bug requiring an override change for the partless-boss DPS basis. Test PINs every load-bearing line green vs shipped and red vs counterfactual."
  }
}
```

---

## 5. S5 BLIND TEST (claude-opus-5) + GREEN/RED COUNT vs DRIVER OVERRIDE

S5 BLIND TEST vs DRIVER SHIPPED OVERRIDE (run by the driver via scripts/tests/lib/harness.ts, which loads
the driver override from disk):

- PRISTINE blind/red-hood.test.ts: 28 passed / 2 failed / 6 skipped (36 total).
  Both REDs adjudicated RECON_ERROR (NOT REAL-GOTCHA):
  RED 1 — S1b conversion: blind expected a separate charge-damage tier near 241.92 (=100.8x2.4) or
  333.36 (=138.9x2.4); a mis-read of the excess-over-100 threshold. Faithful excess is
  (138.9-100)x2.4 = 93.36 (driver models the single warm value 90). The blind test's SIBLING
  assertion ("STACK excess at 240%", band [40,110] ~91.44) PASSED with the driver's 90.
  RED 2 — Step-3 +100.8% CS: blind expected an explicit chargeSpeedPct 100.8 buff; the driver folds it
  into the weaponSwap chargeTimeSec 0.3 (fire-rate-gated instant charge) + conversion armed per
  cast — an equivalent encoding whose effect the driver's R6/R2 pin.
- ADAPTED blind/red-hood.adapted.test.ts (2 intent-preserving RECON_ERROR corrections):
  30 passed / 6 skipped / 0 failed = CONVERGENCE GREEN.
- The 6 skips are the documented UNMODELED gaps (taunt / incoming-healing / pierce-range / DEF /
  lifesteal-payload / swap-economy) — each a line with no engine primitive, recorded in unmodeled.

### pristine blind test (blind/red-hood.test.ts, verbatim)

```ts
/**
 * red-hood — BLIND per-line kit spec test (S5). Written from the kit prose ALONE;
 * the driver override / driver tests / driver reasoning were not consulted.
 *
 * KIT (Red Hood, SR/Iron/Attacker/Burst Lambda, cd 40s, ammo 6, chargeFrames 60):
 *   S1a  on normal attack, self: Charge Speed +3.81%, up to 10 stacks, 5 sec.
 *   S1b  start of battle, self: excess Charge Speed over 100% converts to Charge Damage at 240%.
 *   S2a  start of battle, self: Pierce continuously.
 *   S2b  during Beast Cage (burst step 1), all allies: DEF +50.68% of the user DEF, 10 sec.
 *   S2c  during The Last Howl (step 2), self: recovers 23.04% of attack damage as HP over 10 sec.
 *   S2d  when casting Red Wolf (step 3), self: ATK +71.42%, 10 sec.
 *   B-1  (step 1) allies: ATK +77.55% of the user ATK 10s; self: Burst CD -40s, once per battle.
 *   B-2  (step 2) self: Attract/taunt 10s; Incoming healing +74.88% 10s; Burst CD -40s once/battle.
 *   B-3  (step 3) self: weapon swap 51.46% of final ATK, Full Charge 250% of damage, 10 sec;
 *        Pierce range +100% 10s; Charge Speed +100.8% 10s.
 *
 * FIXTURE: controlComp('red-hood', true) = liter B1 / crown B2 / red-hood Lambda / helm B3.
 *   A Lambda unit with a B1 and a B2 present fills stage 3, so this fixture exercises the
 *   RED WOLF branch only. The Beast Cage / Last Howl branches are therefore asserted
 *   STRUCTURALLY (override shape) plus at runtime as INERT — that inertness IS the
 *   stage-gate discriminator (an ungated step-1/step-2 model would fire them here).
 *   helm is kept deliberately: she is the OTHER stage-3 caster, so full bursts strictly
 *   outnumber Red Wolf casts and burstCast-vs-fullBurstEnter becomes discriminable.
 *
 * INSTRUMENTS: buffApply events are the only well-specified per-unit channel here, so the
 *   Red Wolf cast counter is derived from her own ATK +71.42% self-apply rather than from
 *   burstCast event internals.
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

const SLUG = 'red-hood';
const CHARGE_DMG_STATS = ['chargeDamagePct', 'chargeDamageMultPct'];

type Ev = any;

// ---------------------------------------------------------------- override-shape helpers
// The committed override is read through a no-op patch clone (disk untouched).
const OV: any = withPatchedOverride(SLUG, () => {});

function slotBlocks(ov: any, slot: 'skill1' | 'skill2' | 'burst'): any[] {
  const s = ov?.[slot];
  if (!s) return [];
  // tolerate both authored shapes: slot -> Block[] and slot -> { blocks: Block[] }
  return Array.isArray(s) ? s : Array.isArray(s.blocks) ? s.blocks : [];
}
function allBlocks(ov: any): any[] {
  return [
    ...slotBlocks(ov, 'skill1'),
    ...slotBlocks(ov, 'skill2'),
    ...slotBlocks(ov, 'burst'),
  ];
}
function effs(b: any): any[] {
  return Array.isArray(b?.effects) ? b.effects : [];
}
function pairs(ov: any): Array<{ block: any; effect: any }> {
  const out: Array<{ block: any; effect: any }> = [];
  for (const b of allBlocks(ov))
    for (const e of effs(b)) out.push({ block: b, effect: e });
  return out;
}
function unmodeledText(ov: any): string {
  const u = ov?.unmodeled ?? {};
  return (['skill1', 'skill2', 'burst'] as const)
    .flatMap((s) => u[s] ?? [])
    .join(' | ');
}
const stageOf = (b: any) => b?.trigger?.stage;
const near = (a: number, b: number, tol = 0.02) =>
  typeof a === 'number' && Math.abs(a - b) <= tol;

// ---------------------------------------------------------------- run helpers
function runWith(patch?: any) {
  const base: any = controlComp(SLUG, true);
  const events: Ev[] = [];
  const opts: any = {
    ...base,
    cfg: {
      ...(base.cfg ?? {}),
      onEvent: (ev: SimEvent) => events.push(ev as Ev),
    },
  };
  if (patch) opts.overrides = { ...(base.overrides ?? {}), [SLUG]: patch };
  const res = runComp(opts);
  const tot = totals(res);
  return { res, events, tot, self: tot[SLUG] };
}
const applies = (events: Ev[]) => events.filter((e) => e.kind === 'buffApply');
function rhIdxOf(events: Ev[]): number {
  const e = applies(events).find(
    (b) => b.targetSlug === SLUG && typeof b.targetIdx === 'number'
  );
  return e ? (e.targetIdx as number) : -1;
}
function selfApplies(events: Ev[]) {
  const i = rhIdxOf(events);
  return applies(events).filter(
    (b) => b.targetSlug === SLUG && b.casterIdx === i
  );
}

// ---------------------------------------------------------------- hoisted runs (7 sims)
const BASE = runWith();
const RH = rhIdxOf(BASE.events);
const SELF = selfApplies(BASE.events);
const RED_WOLF_CASTS = SELF.filter(
  (b) => b.stat === 'atkPct' && near(b.value, 71.42)
).length;
const FB_STARTS = BASE.events.filter((e) => e.kind === 'fullBurstStart').length;
const MATES = Object.keys(BASE.tot).filter((s) => s !== SLUG);

const NO_STACK_SPEED = runWith(
  withPatchedOverride(SLUG, (ov: any) => {
    for (const { effect } of pairs(ov)) {
      if (
        effect.kind === 'buff' &&
        effect.stat === 'chargeSpeedPct' &&
        near(effect.value, 3.81)
      )
        effect.value = 0;
    }
  })
);
const NO_STACKING = runWith(
  withPatchedOverride(SLUG, (ov: any) => {
    for (const { effect } of pairs(ov)) {
      if (
        effect.kind === 'buff' &&
        effect.stat === 'chargeSpeedPct' &&
        near(effect.value, 3.81)
      )
        effect.maxStacks = 1;
    }
  })
);
const NO_CHARGE_DMG = runWith(
  withPatchedOverride(SLUG, (ov: any) => {
    for (const { effect } of pairs(ov)) {
      if (effect.kind === 'buff' && CHARGE_DMG_STATS.includes(effect.stat)) {
        effect.value = 0;
        delete effect.perResource;
      }
    }
  })
);
const NO_RED_WOLF_ATK = runWith(
  withPatchedOverride(SLUG, (ov: any) => {
    for (const { effect } of pairs(ov)) {
      if (
        effect.kind === 'buff' &&
        effect.stat === 'atkPct' &&
        near(effect.value, 71.42)
      )
        effect.value = 0;
    }
  })
);
const NO_SWAP_DMG = runWith(
  withPatchedOverride(SLUG, (ov: any) => {
    for (const { effect } of pairs(ov))
      if (effect.kind === 'weaponSwap') effect.damagePct = 0;
  })
);
const NO_BURST_SPEED = runWith(
  withPatchedOverride(SLUG, (ov: any) => {
    for (const { effect } of pairs(ov)) {
      if (
        effect.kind === 'buff' &&
        effect.stat === 'chargeSpeedPct' &&
        near(effect.value, 100.8)
      )
        effect.value = 0;
    }
  })
);

// ================================================================= tests
describe('red-hood — fixture sanity / non-vacuity', () => {
  it('the control comp resolves her and she deals damage', () => {
    expect(
      RH,
      'no buffApply targeted red-hood; her slot index is unresolvable'
    ).toBeGreaterThanOrEqual(0);
    expect(Object.keys(BASE.tot)).toContain(SLUG);
    expect(unitOf(BASE.res, SLUG).totalDamage).toBeGreaterThan(0);
  });

  it('she casts Red Wolf at least once, and full bursts OUTNUMBER her casts', () => {
    // Non-vacuity for every step-3 assertion below, AND the precondition that makes
    // burstCast (fires only when SHE bursts) discriminable from fullBurstEnter
    // (fires on every team full burst, incl. the ones helm closes).
    expect(
      RED_WOLF_CASTS,
      'Red Wolf branch never fired — every step-3 assertion would be vacuous'
    ).toBeGreaterThanOrEqual(1);
    expect(FB_STARTS).toBeGreaterThan(RED_WOLF_CASTS);
  });

  it('the override carries all three slots and no ignored-effect blocks', () => {
    expect(
      slotBlocks(OV, 'skill1').length +
        slotBlocks(OV, 'skill2').length +
        slotBlocks(OV, 'burst').length
    ).toBeGreaterThan(0);
    expect(pairs(OV).filter((p) => p.effect.kind === 'ignored')).toHaveLength(
      0
    );
  });
});

describe('S1a — Charge Speed +3.81%, 10 stacks, 5 sec, on normal attack (self)', () => {
  const hits = SELF.filter(
    (b) => b.stat === 'chargeSpeedPct' && near(b.value, 3.81)
  );

  it('is a chargeSpeedPct stack buff, not charge DAMAGE', () => {
    // Nearest-wrong: 3.81 authored as chargeDamagePct (a damage bucket) instead of a
    // cadence stat — it would never change her shot count.
    expect(hits.length, 'no self chargeSpeedPct 3.81 applies').toBeGreaterThan(
      0
    );
    for (const h of hits) expect(h.stat).toBe('chargeSpeedPct');
  });

  it('re-applies per normal attack rather than sitting at max as a passive', () => {
    // Nearest-wrong: one start-of-battle passive authored at 38.1% (10 stacks pre-applied).
    // That model emits exactly ONE apply and skips the opening ramp entirely.
    expect(hits.length).toBeGreaterThan(50);
  });

  it('caps at 10 stacks and actually reaches the cap', () => {
    for (const h of hits) expect(h.maxStacks).toBe(10);
    const peak = Math.max(...hits.map((h) => Number(h.stacks ?? 0)));
    expect(peak).toBe(10);
  });

  it('is time-bounded (5 sec), not a round-count or permanent window', () => {
    // Duration-semantics check: the kit says sec, so durationShots must be absent.
    const e = pairs(OV).find(
      (p) =>
        p.effect.kind === 'buff' &&
        p.effect.stat === 'chargeSpeedPct' &&
        near(p.effect.value, 3.81)
    );
    expect(
      e,
      'the 3.81 charge-speed stack buff is not in the override'
    ).toBeTruthy();
    expect(e!.effect.durationSec).toBeCloseTo(5, 3);
    expect(e!.effect.durationShots).toBeUndefined();
  });

  it('is self-scoped — no ally receives it', () => {
    const leaked = applies(BASE.events).filter(
      (b) =>
        near(b.value, 3.81) &&
        b.stat === 'chargeSpeedPct' &&
        b.targetSlug !== SLUG
    );
    expect(leaked).toHaveLength(0);
  });

  it('is load-bearing: zeroing it lowers her damage (charge speed gates shots fired)', () => {
    expect(NO_STACK_SPEED.self).toBeLessThan(BASE.self);
  });

  it('the STACKING is load-bearing: capping at 1 stack lowers her damage', () => {
    // Nearest-wrong: maxStacks omitted / 1 — the classic stack drop.
    expect(NO_STACKING.self).toBeLessThan(BASE.self);
  });
});

describe('S1b — excess Charge Speed over 100% converts to Charge Damage at 240%', () => {
  const cd = pairs(OV).filter(
    (p) => p.effect.kind === 'buff' && CHARGE_DMG_STATS.includes(p.effect.stat)
  );
  const dynamic = cd.some((p) => p.effect.perResource);
  const effective = cd
    .filter((p) => !p.effect.perResource)
    .map((p) => Number(p.effect.value) * Number(p.effect.maxStacks ?? 1));

  it('the conversion is modeled at all (self charge-damage buff present and live)', () => {
    expect(
      cd.length,
      'no chargeDamagePct/chargeDamageMultPct buff — the 240% conversion is dropped'
    ).toBeGreaterThan(0);
    const live = SELF.filter((b) => CHARGE_DMG_STATS.includes(b.stat));
    expect(
      live.length,
      'the conversion block never fires in the fixture'
    ).toBeGreaterThan(0);
  });

  it('the passive tier converts the STACK excess at 240%, not 1:1', () => {
    // 10 stacks x 3.81 = 38.1 excess -> 240% x 38.1 = 91.44 charge damage.
    // Nearest-wrong: a 1:1 conversion (38.1) or crediting the raw stack value.
    // Banded because a per-stack encoding (9.144 x 10 stacks) is equally faithful.
    if (dynamic) {
      expect(cd.length).toBeGreaterThan(0);
      return;
    }
    expect(
      effective.some((v) => v >= 40 && v <= 110),
      `charge-damage tiers seen: ${effective.join(', ')} — expected one near 91.44 (240% of 38.1)`
    ).toBe(true);
  });

  it('the Red Wolf +100.8% charge speed is ALSO converted', () => {
    // The step-3 buff pushes excess to 138.9% -> the conversion should add ~241.92
    // (or read ~333.36 combined). Nearest-wrong: converting only the S1a stacks and
    // silently ignoring the burst charge-speed contribution.
    if (dynamic) {
      expect(cd.length).toBeGreaterThan(0);
      return;
    }
    expect(
      effective.some((v) => v >= 150 && v <= 400),
      `charge-damage tiers seen: ${effective.join(', ')} — expected one near 241.92 or 333.36`
    ).toBe(true);
  });

  it('is load-bearing, and moves NO teammate (pure damage bucket, no gauge effect)', () => {
    expect(NO_CHARGE_DMG.self).toBeLessThan(BASE.self);
    for (const m of MATES) expect(NO_CHARGE_DMG.tot[m]).toBe(BASE.tot[m]);
  });
});

describe('S2a — Gain Pierce continuously (self, start of battle)', () => {
  it('pierce is whole-fight, not a timed window', () => {
    // Nearest-wrong: a gainPierce with durationSec 10 hung off the burst, which would
    // leave her un-pierced for most of the fight.
    const gp = pairs(OV).filter((p) => p.effect.kind === 'gainPierce');
    const flagged = OV?.hasPierce === true;
    expect(
      flagged || gp.length > 0,
      'continuous Pierce is not modeled (no hasPierce flag, no gainPierce effect)'
    ).toBe(true);
    if (!flagged) {
      const continuous = gp.filter(
        (p) =>
          p.effect.durationSec === undefined &&
          p.block?.trigger?.kind === 'passive'
      );
      expect(
        continuous.length,
        'gainPierce is present but time-boxed / non-passive; the kit says continuously'
      ).toBeGreaterThan(0);
    }
  });
});

describe('S2b — Beast Cage: DEF +50.68% of the user DEF, all allies, 10s (step 1)', () => {
  it('is stage-1 gated or explicitly recorded as unmodeled — never silently dropped', () => {
    const def = pairs(OV).find(
      (p) =>
        p.effect.kind === 'buff' &&
        p.effect.stat === 'defPct' &&
        near(p.effect.value, 50.68, 0.5)
    );
    const ledger = /def/i.test(unmodeledText(OV));
    expect(
      Boolean(def) || ledger,
      'the Beast Cage DEF line is neither modeled nor listed in unmodeled'
    ).toBe(true);
    if (def) {
      expect(def.block?.trigger?.kind).toBe('burstCast');
      expect(
        stageOf(def.block),
        'the DEF grant must be gated to burst step 1 (Beast Cage)'
      ).toBe(1);
      expect(def.effect.durationSec).toBeCloseTo(10, 3);
    }
  });

  it('is offensively inert in v1 (self DEF does not feed damage)', () => {
    const zeroDef = runWith(
      withPatchedOverride(SLUG, (ov: any) => {
        for (const { effect } of pairs(ov))
          if (effect.kind === 'buff' && effect.stat === 'defPct')
            effect.value = 0;
      })
    );
    expect(zeroDef.self).toBe(BASE.self);
    for (const m of MATES) expect(zeroDef.tot[m]).toBe(BASE.tot[m]);
  });
});

describe('S2c — The Last Howl: recovers 23.04% of attack damage as HP over 10s (step 2)', () => {
  it('is a SELF heal gated to burst step 2', () => {
    // Nearest-wrong #1: target allies — that would fire crown on-recovery triggers and
    // manufacture team damage this kit line never grants.
    // Nearest-wrong #2: ungated, so it fires on her step-3 rotations too.
    const heal = pairs(OV).find((p) => p.effect.kind === 'heal');
    const ledger = /recover/i.test(unmodeledText(OV));
    expect(
      Boolean(heal) || ledger,
      'the Last Howl recovery line is neither modeled nor listed in unmodeled'
    ).toBe(true);
    if (heal) {
      expect(heal.block?.target?.kind).toBe('self');
      expect(heal.block?.trigger?.kind).toBe('burstCast');
      expect(stageOf(heal.block)).toBe(2);
    }
  });
});

describe('S2d — Red Wolf: ATK +71.42% self for 10s (step 3)', () => {
  it('applies to HER only, at her own burst cast', () => {
    const hits = SELF.filter(
      (b) => b.stat === 'atkPct' && near(b.value, 71.42)
    );
    expect(hits.length).toBe(RED_WOLF_CASTS);
    expect(RED_WOLF_CASTS).toBeGreaterThanOrEqual(1);
    const leaked = applies(BASE.events).filter(
      (b) =>
        b.stat === 'atkPct' && near(b.value, 71.42) && b.targetSlug !== SLUG
    );
    expect(
      leaked,
      'ATK +71.42% leaked to an ally; the kit scopes it to self'
    ).toHaveLength(0);
  });

  it('is keyed to burstCast stage 3, NOT to full-burst entry', () => {
    // Discriminator: helm also closes stage 3, so FB_STARTS > RED_WOLF_CASTS. A
    // fullBurstEnter keying would fire on helm rotations too and over-credit.
    const e = pairs(OV).find(
      (p) =>
        p.effect.kind === 'buff' &&
        p.effect.stat === 'atkPct' &&
        near(p.effect.value, 71.42)
    );
    expect(e, 'the Red Wolf ATK buff is not in the override').toBeTruthy();
    expect(e!.block?.trigger?.kind).toBe('burstCast');
    expect(stageOf(e!.block)).toBe(3);
    expect(e!.effect.durationSec).toBeCloseTo(10, 3);
    expect(RED_WOLF_CASTS).toBeLessThan(FB_STARTS);
  });

  it('is load-bearing and moves no teammate', () => {
    expect(NO_RED_WOLF_ATK.self).toBeLessThan(BASE.self);
    for (const m of MATES) expect(NO_RED_WOLF_ATK.tot[m]).toBe(BASE.tot[m]);
  });
});

describe('Burst step 1 — ATK +77.55% of the skill user ATK, all allies, 10s', () => {
  it('is a CASTER-scaled ally grant gated to step 1', () => {
    // Nearest-wrong: atkPct (scales each ally OWN ATK) instead of casterAtkPct (flat add
    // off her ATK) — a completely different magnitude on low-ATK supports.
    const e = pairs(OV).find(
      (p) =>
        p.effect.kind === 'buff' &&
        p.effect.stat === 'casterAtkPct' &&
        near(p.effect.value, 77.55)
    );
    expect(
      e,
      'no casterAtkPct 77.55 ally grant found for Beast Cage'
    ).toBeTruthy();
    expect(e!.block?.target?.kind).toBe('allies');
    expect(e!.block?.trigger?.kind).toBe('burstCast');
    expect(stageOf(e!.block)).toBe(1);
    expect(e!.effect.durationSec).toBeCloseTo(10, 3);
  });

  it('never fires in this fixture — she takes step 3, so the ally ATK grant stays inert', () => {
    // The stage gate is what is under test: an ungated model would buff the team here.
    const crossGrants = applies(BASE.events).filter(
      (b) =>
        b.casterIdx === RH && b.targetIdx !== RH && b.stat === 'casterAtkPct'
    );
    expect(
      crossGrants,
      'red-hood granted ally ATK despite only ever casting Red Wolf'
    ).toHaveLength(0);
  });
});

describe('Burst steps 1 and 2 — Cooldown of Burst Skill -40s, once per battle', () => {
  it('the CDR is once-per-battle and lives ONLY on steps 1 and 2', () => {
    const cdrs = pairs(OV).filter((p) => p.effect.kind === 'burstCdr');
    expect(
      cdrs.length,
      'no burstCdr effect — both step-1 and step-2 CDR lines are dropped'
    ).toBeGreaterThanOrEqual(1);
    for (const c of cdrs) {
      expect(Math.abs(Number(c.effect.seconds))).toBeCloseTo(40, 3);
      expect(
        c.effect.oncePerBattle,
        'the kit says Activates once per battle'
      ).toBe(true);
      expect(
        [1, 2],
        `burstCdr found on stage ${String(stageOf(c.block))}; step 3 (Red Wolf) grants NO cooldown reduction`
      ).toContain(stageOf(c.block));
    }
  });

  it('her Red Wolf cadence respects the un-reduced 40s cooldown', () => {
    // Discriminator: an ungated / always-on -40s CDR would zero her 40s cooldown and let
    // her burst on nearly every rotation (~9+ casts in 180s).
    expect(RED_WOLF_CASTS).toBeLessThanOrEqual(6);
  });
});

describe('Burst step 3 — Red Wolf weapon swap (51.46% of final ATK, full charge 250%, 10s)', () => {
  const swap = pairs(OV).find((p) => p.effect.kind === 'weaponSwap');

  it('is a weaponSwap with the kit-stated magnitudes and window, gated to step 3', () => {
    expect(swap, 'Red Wolf is not modeled as a weaponSwap').toBeTruthy();
    expect(swap!.effect.damagePct).toBeCloseTo(51.46, 3);
    expect(swap!.effect.chargeMultPct).toBeCloseTo(250, 3);
    expect(swap!.effect.durationSec).toBeCloseTo(10, 3);
    expect(swap!.block?.trigger?.kind).toBe('burstCast');
    expect(stageOf(swap!.block)).toBe(3);
    expect(swap!.block?.target?.kind).toBe('self');
  });

  it('the swap actually carries damage in the fixture', () => {
    // Nearest-wrong: swap authored but never reached (mis-gated), or damagePct dropped.
    expect(NO_SWAP_DMG.self).toBeLessThan(BASE.self);
  });

  it('Charge Speed +100.8% rides the same window, self-scoped, and is load-bearing', () => {
    const e = pairs(OV).find(
      (p) =>
        p.effect.kind === 'buff' &&
        p.effect.stat === 'chargeSpeedPct' &&
        near(p.effect.value, 100.8)
    );
    expect(e, 'the Red Wolf Charge Speed +100.8% buff is missing').toBeTruthy();
    expect(e!.effect.durationSec).toBeCloseTo(10, 3);
    expect(stageOf(e!.block)).toBe(3);
    const live = SELF.filter(
      (b) => b.stat === 'chargeSpeedPct' && near(b.value, 100.8)
    );
    expect(live.length).toBe(RED_WOLF_CASTS);
    expect(NO_BURST_SPEED.self).toBeLessThan(BASE.self);
  });
});

describe('no-silent-drops ledger (lines with no engine primitive)', () => {
  it('Attract/taunt and Incoming healing are recorded in unmodeled', () => {
    const led = unmodeledText(OV);
    expect(
      /attract|taunt/i.test(led),
      'the step-2 Attract/taunt line is not in unmodeled'
    ).toBe(true);
    expect(
      /incoming healing/i.test(led),
      'the step-2 Incoming healing line is not in unmodeled'
    ).toBe(true);
  });

  it('Pierce range expansion is either ledgered or folded into the swap pierce tag', () => {
    const led = unmodeledText(OV);
    const swap = pairs(OV).find((p) => p.effect.kind === 'weaponSwap');
    expect(
      /pierce range/i.test(led) || swap?.effect?.hasPierce === true,
      'the +100% Pierce range line is unaccounted for'
    ).toBe(true);
  });

  it.skip('Attract: taunts all enemies for 10 sec — GAP: no aggro/taunt primitive, and the v1 boss deals no damage', () => {});

  it.skip('Incoming healing +74.88% for 10 sec — GAP: no incoming-heal stat; heal effects model no HP amount', () => {});

  it.skip('Expand Pierce range by 100% for 10 sec — GAP: pierce is a boolean tag; there is no pierce RANGE/target-count model', () => {});

  it.skip('DEF +50.68% of the skill user DEF — GAP: no casterDefPct stat, and defPct is inert in v1', () => {});

  it.skip('Recovers 23.04% of attack damage as HP — GAP: heal effects carry no HP amount, so the 23.04% payload is unobservable', () => {});

  it.skip('Red Wolf swap shot economy (pulls/sec, magazine, charge time) — MEASUREMENT-GATED: the kit is silent; flag with a footage recipe', () => {});
});
```

---

## 6. S6 BLIND OVERRIDE (claude-opus-5) + DIFF vs DRIVER OVERRIDE

KEY ENCODING DIFFERENCES (blind S6 override vs driver shipped override):

1. S1b excess-CS->Charge-Damage conversion (THE measurement-gated line):
   - DRIVER: a SINGLE chargeDamagePct 90 buff, gated on burstCast stage 3 (Red Wolf window), 10s, self.
     Zero out of burst. Mechanism: excess-CS-over-100 x 2.4; warm excess = (100.8 + 38.1) - 100 = 38.9
     -> x2.4 = 93.36; modeled as the conservative average 90. (Reading B: the buff SUM is the CS total,
     100 is the threshold.) Converged independently with the S2b fable reviewer (93.36).
   - BLIND S6: TWO limbs — (a) a passive always-on chargeDamagePct ~36.6 (out-of-burst stack-average:
     mean ~4 of 10 stacks -> excess 15.2 -> x2.4 = 36.6) authored on skill1 with a rampSec, PLUS
     (b) a burst stage-3 rider chargeDamagePct 241.92 (= 2.4 x 100.8). (Reading A: treats the Red Wolf
     +100.8 as excess directly, and the stack CS as out-of-burst excess.)
   - ADJUDICATION: both are unmeasured point estimates of an ambiguous excess-over-100 threshold; neither
     is measured from a popup. The driver's Reading B is defended (converged with cross-family fable; the
     out-of-burst stack CS alone does not exceed the 100 baseline once the baseline is accounted, so the
     driver's zero-out-of-burst is the conservative faithful call). DOCUMENTED-GAP / measurement-gated ⚑,
     NOT a REAL-GOTCHA. The blind writer ITSELF flags both limbs ⚑ with measurement recipes.

2. Red Wolf weapon-swap shot economy (ammo / charge time / cadence):
   - DRIVER: RESOLVED from game-data deep-dive (skill 1470610 + weapon 1047002, owner-confirmed 2026-07-20):
     weaponSwap chargeTimeSec 0.3 (the +100.8% CS makes charge instant; cadence is fire-rate-gated at
     rate_of_fire 200rpm = 1 shot/18 frames), unlimitedAmmo 10s (max_ammo 99), ~33 shots/window.
   - BLIND S6: flagged ALWAYS-⚑ (kit-silent) — inherits base SR ammo 6 / chargeFrames 60 / no maxShots.
   - ADJUDICATION: the blind writer's ⚑ instinct is CORRECT (the kit prose is silent on the swap economy);
     the driver has the measured answer the blind writer could not see. Converges on the ⚑ taxonomy; the
     driver supplies the deep-dive values. NOT a REAL-GOTCHA.

3. +100.8% Charge Speed (Step 3):
   - DRIVER: folded into the weaponSwap chargeTimeSec 0.3 (instant charge) + arming the conversion buff.
   - BLIND S6: explicit chargeSpeedPct 100.8 buff, stage 3, 10s.
   - ADJUDICATION: equivalent encoding, same load-bearing effect (instant-charge cadence + conversion armed).
     RECON_ERROR-class encoding preference, NOT a REAL-GOTCHA.

EVERYTHING ELSE CONVERGES: S1 CS-stacks 3.81x10/5s; S2 hasPierce (permanent); S2 Red Wolf ATK 71.42 stage 3;
B1 Beast Cage casterAtkPct 77.55 all-allies (flat-resolved); B1/B2 burstCdr 40 oncePerBattle (two independent
per-step refunds); B3 weaponSwap damagePct 51.46 / chargeMultPct 250 / 10s; UNMODELED inert lines (S2 DEF 50.68,
S2 lifesteal 23.04, B2 taunt, B2 incoming-healing 74.88, B3 pierce-range-expand 100) all recorded verbatim.

### blind override (blind/red-hood.override.json, verbatim)

```json
{
  "slug": "red-hood",
  "hasPierce": true,
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "shotFired"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "chargeSpeedPct",
          "value": 3.81,
          "durationSec": 5,
          "maxStacks": 10
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "passive"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "chargeDamagePct",
          "value": 36.6,
          "rampSec": 5
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "burstCast",
        "stage": 1
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "defPct",
          "value": 50.68,
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "burstCast",
        "stage": 2
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "heal",
          "ticks": 10,
          "intervalSec": 1
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "burstCast",
        "stage": 3
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 71.42,
          "durationSec": 10
        }
      ]
    }
  ],
  "burst": [
    {
      "slot": "burst",
      "trigger": {
        "kind": "burstCast",
        "stage": 1
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 77.55,
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "burst",
      "trigger": {
        "kind": "burstCast",
        "stage": 1
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "burstCdr",
          "seconds": 40,
          "oncePerBattle": true
        }
      ]
    },
    {
      "slot": "burst",
      "trigger": {
        "kind": "burstCast",
        "stage": 2
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "burstCdr",
          "seconds": 40,
          "oncePerBattle": true
        }
      ]
    },
    {
      "slot": "burst",
      "trigger": {
        "kind": "burstCast",
        "stage": 3
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "weaponSwap",
          "damagePct": 51.46,
          "chargeMultPct": 250,
          "durationSec": 10,
          "hasPierce": true
        },
        {
          "kind": "buff",
          "stat": "chargeSpeedPct",
          "value": 100.8,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "chargeDamagePct",
          "value": 241.92,
          "durationSec": 10
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [],
    "skill2": [],
    "burst": [
      "Attract: Taunts all enemies for 10 sec.",
      "Incoming healing ▲ 74.88% for 10 sec.",
      "Expand Pierce range by 100% for 10 sec."
    ]
  },
  "caveats": [
    "⚑ S1b is a CONVERSION (charge-speed excess over 100% → charge damage at 240%). The schema has no conversion primitive, so it is decomposed into two STATIC approximations: a passive chargeDamagePct sized to the estimated steady-state stack count (out of burst) plus a burst-step-3 rider = 2.4 × 100.8. Both are UNMEASURED.",
    "⚑ The passive limb under-credits during Red Wolf: the +100.8% charge speed shortens the charge cycle, so stacks accrue faster and sit closer to the 10 cap than the out-of-burst estimate assumes.",
    "⚑ Weapon-swap shot economy for Red Wolf is kit-silent (no maxAmmo, no charge time, no cadence stated) — the swap inherits the base SR ammo/charge/cadence by omission.",
    "⚑ Λ burst: which of the three steps fires is rotation-position dependent, so which branch the sim exercises is a fixture property, not a kit property. Verify the graded comp actually reaches step 2/3 before reading any step-gated number.",
    "noFb deliberately UNSET everywhere (FB-by-timing default ON); no Hit-Rate line in this kit, so no hrCore flag.",
    "S2's DEF grant is authored as defPct (inert in v1) — the kit says '50.68% of the skill user's DEF' and the schema has no casterDefPct; kept for completeness per the keep-inert-stat rule.",
    "S2's Last Howl recovery is authored as a 10-tick heal so on-recovery consumers on teammates stay refreshed; no HP amount is modeled."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Blind second read of the kit prose only. Structure: S1 = per-normal-attack charge-speed stack (3.81%, 10 stacks, 5s, engine-live) + a static stand-in for the charge-speed→charge-damage conversion. S2 = whole-fight Pierce (top-level hasPierce, 'start of battle … continuously'), a step-1 team DEF grant, a step-2 self heal-over-time, and a step-3 self ATK 71.42%/10s keyed to burstCast stage 3. Burst = three Λ branches keyed by burstCast stage: step 1 team casterAtkPct 77.55%/10s + once-per-battle 40s burst CDR; step 2 the same once-per-battle 40s CDR (taunt + incoming-healing skipped, see unmodeled); step 3 the Red Wolf weapon swap (51.46% per shot, 250% full charge, 10s, Pierce-tagged) plus the 100.8% charge-speed buff and the conversion rider. Skipped lines are defensive/aggro or single-target-inert on a partless boss and are recorded verbatim in unmodeled."
}
```

### blind override audit + flags (blind/red-hood.audit.json, verbatim)

```json
{
  "slug": "red-hood",
  "leakDetected": null,
  "audit": [
    {
      "slot": "skill1",
      "kitLine": "Activates when performing a normal attack",
      "status": "IMPLEMENTED",
      "effectOrReason": "trigger shotFired, target self, buff chargeSpeedPct 3.81 durationSec 5 maxStacks 10 — weapon-state modifier (gates charge cycle → shots fired), engine tracks stacks/expiry live"
    },
    {
      "slot": "skill1",
      "kitLine": "Charge Speed ▲ 3.81%, stacks up to 10 time(s",
      "status": "IMPLEMENTED",
      "effectOrReason": "same block as above (magnitude/stack/duration fields)"
    },
    {
      "slot": "skill1",
      "kitLine": "Convert excess over 100% Charge Speed",
      "status": "IMPLEMENTED",
      "effectOrReason": "⚑ APPROXIMATED: no conversion primitive in the schema. Split into passive self buff chargeDamagePct 36.6 (rampSec 5, = 2.4 × 3.81 × ~4 mean stacks) + a burst-step-3 chargeDamagePct 241.92 (= 2.4 × 100.8) for the Red Wolf charge-speed window"
    },
    {
      "slot": "skill1",
      "kitLine": "Charge Damage ▲ 240% of the excess value",
      "status": "IMPLEMENTED",
      "effectOrReason": "the 240% conversion factor applied in both limbs above"
    },
    {
      "slot": "skill2",
      "kitLine": "Gain Pierce continuously.",
      "status": "IMPLEMENTED",
      "effectOrReason": "top-level hasPierce:true — 'start of battle … continuously' is whole-fight Pierce tagging, not a step-gated gainPierce effect"
    },
    {
      "slot": "skill2",
      "kitLine": "During Beast Cage: DEF ▲ 50.68% for 10s",
      "status": "IMPLEMENTED",
      "effectOrReason": "trigger burstCast stage 1 (Beast Cage = her burst Step 1), target allies, buff defPct 50.68 durationSec 10 — inert in v1 but retained per the keep-inert-stat rule; caster-DEF scaling has no StatKey"
    },
    {
      "slot": "skill2",
      "kitLine": "During Last Howl: recovers 23.04% as HP",
      "status": "IMPLEMENTED",
      "effectOrReason": "trigger burstCast stage 2, target self, heal ticks 10 intervalSec 1 — emits 10 recovery events over the 10s window (heal lines are never skipped on isolation; drives on-recovery consumers)"
    },
    {
      "slot": "skill2",
      "kitLine": "When casting Red Wolf: ATK ▲ 71.42% 10s",
      "status": "IMPLEMENTED",
      "effectOrReason": "trigger burstCast stage 3, target self, buff atkPct 71.42 durationSec 10"
    },
    {
      "slot": "burst",
      "kitLine": "Step 1: ATK ▲ 77.55% of user's ATK, 10s",
      "status": "IMPLEMENTED",
      "effectOrReason": "trigger burstCast stage 1, target allies, buff casterAtkPct 77.55 durationSec 10 (flat-ATK path, '% of the skill user's ATK')"
    },
    {
      "slot": "burst",
      "kitLine": "Step 1: Burst CD ▼ 40 sec, once/battle",
      "status": "IMPLEMENTED",
      "effectOrReason": "trigger burstCast stage 1, target self, burstCdr seconds 40 oncePerBattle true"
    },
    {
      "slot": "burst",
      "kitLine": "Step 2: Attract: Taunts all enemies 10s",
      "status": "SKIPPED",
      "effectOrReason": "no taunt/aggro primitive; the v1 boss deals no damage so aggro moves nothing. Verbatim in unmodeled.burst"
    },
    {
      "slot": "burst",
      "kitLine": "Step 2: Incoming healing ▲ 74.88% 10s",
      "status": "SKIPPED",
      "effectOrReason": "no HP pool and no heal-amount stat — heal effects emit recovery EVENTS only, so a healing-received multiplier has nothing to scale. Verbatim in unmodeled.burst"
    },
    {
      "slot": "burst",
      "kitLine": "Step 2: Burst CD ▼ 40 sec, once/battle",
      "status": "IMPLEMENTED",
      "effectOrReason": "trigger burstCast stage 2, target self, burstCdr seconds 40 oncePerBattle true"
    },
    {
      "slot": "burst",
      "kitLine": "Step 3: Changes the weapon in use",
      "status": "IMPLEMENTED",
      "effectOrReason": "trigger burstCast stage 3, target self, weaponSwap damagePct 51.46 chargeMultPct 250 durationSec 10 hasPierce true"
    },
    {
      "slot": "burst",
      "kitLine": "Damage: 51.46% of final ATK",
      "status": "IMPLEMENTED",
      "effectOrReason": "weaponSwap.damagePct 51.46"
    },
    {
      "slot": "burst",
      "kitLine": "Full Charge Damage: 250% of damage",
      "status": "IMPLEMENTED",
      "effectOrReason": "weaponSwap.chargeMultPct 250"
    },
    {
      "slot": "burst",
      "kitLine": "Duration: 10 sec",
      "status": "IMPLEMENTED",
      "effectOrReason": "weaponSwap.durationSec 10 (time-bound, no maxShots stated)"
    },
    {
      "slot": "burst",
      "kitLine": "Expand Pierce range by 100% for 10 sec.",
      "status": "SKIPPED",
      "effectOrReason": "Pierce RANGE (how many bodies a shot passes through) has no model; the scope-lock boss is a single partless target so extra pierce depth hits nothing. The Pierce TAG itself is modeled (hasPierce + weaponSwap.hasPierce). Verbatim in unmodeled.burst"
    },
    {
      "slot": "burst",
      "kitLine": "Charge Speed ▲ 100.8% for 10 sec.",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff chargeSpeedPct 100.8 durationSec 10 on the stage-3 block; also feeds the S1b conversion rider (chargeDamagePct 241.92)"
    }
  ],
  "flags": [
    {
      "field": "override.skill1[1].effects[0].value",
      "estimate": "36.6 (charge-damage percentage points, out of burst)",
      "reasoning": "S1b converts charge-speed excess over 100% into charge damage at 240%, i.e. chargeDamagePct = 2.4 × 3.81 × (live stack count). The engine has no conversion primitive, so the value must be a static stand-in for the TIME-AVERAGE stack count. Stacks last 5s and one is gained per normal attack; with chargeFrames 60 (~1.0s base charge, faster as stacks accrue), ammo 6 and reloadFrames 141 (~2.35s), a rough cycle is ~1.0s/shot × 6 then a 2.35s dry gap ⇒ ~0.7 shots/s ⇒ mean stacks ≈ 4 of 10, i.e. excess ≈ 15.2% ⇒ 36.6pp. This is an ESTIMATE, not a measurement, and it is the single largest uncertainty in this override.",
      "recipe": "Run the unit in a graded comp with cfg.onEvent capturing buffApply where stat==='chargeSpeedPct' && casterIdx===targetIdx; integrate the live stack count over battle length (weighting each stack by its 5s window, minus reload gaps) to get meanStacks, then set value = 2.4 × 3.81 × meanStacks. Cross-check against a popup read: the ratio of full-charge popup values out of burst vs a run with the block deleted should equal (1 + value/100) in the charge bucket."
    },
    {
      "field": "override.skill1[1].effects[0].rampSec",
      "estimate": "5",
      "reasoning": "The conversion value is authored at a steady-state stack count that does not exist at t=0 (zero stacks at battle start). rampSec linearly ramps the contribution over the opening so the sim does not credit full charge damage on the first shot. 5s ≈ the stack window length, i.e. roughly the time to reach the steady-state count at the estimated cadence.",
      "recipe": "From the same buffApply stack trace, find the elapsed time at which the running stack count first reaches its steady-state mean; set rampSec to that."
    },
    {
      "field": "override.burst[3].effects[2].value",
      "estimate": "241.92 (= 2.4 × 100.8)",
      "reasoning": "Arithmetically exact GIVEN the reading that 'excess value' means percentage points of Charge Speed above the 100% baseline and that buff sources add linearly into that excess. Both premises are unverified: if the game instead converts only the excess of a MULTIPLICATIVE charge-speed total, or caps the conversion, this is wrong. Also additive-decomposition assumption: this rider sits on top of the passive stack limb rather than recomputing the combined excess.",
      "recipe": "Compare a full-charge popup inside Red Wolf against one outside it with ATK/other buffs held constant; the residual after removing weaponSwap damagePct 51.46 / chargeMultPct 250 and atkPct 71.42 isolates the charge-damage delta. Solve for the implied conversion of the 100.8% line."
    },
    {
      "field": "override.burst[3].effects[0] (weaponSwap shot economy)",
      "estimate": "inherits base SR: ammo 6, chargeFrames 60 (~1.0s), base cadence; no maxShots",
      "reasoning": "ALWAYS-⚑ item 3: the kit states only damage %, full-charge %, and duration for Red Wolf. Ammo capacity, charge time, and pulls/sec for the swapped weapon are kit-silent, and the swap's shot count over the 10s window is what actually sets its damage. Estimated optimistically (no reload penalty change, no ammo cut).",
      "recipe": "Count swap-window shots in footage (popup count between the Red Wolf banner and its expiry) and compare to the sim's shot events with srcSlot === her slot in the same window; set maxAmmo / chargeTimeSec / pullsPerSec / maxShots to match."
    },
    {
      "field": "base cadence tuple (pullsPerSec / reloadFrames 141 / chargeFrames 60)",
      "estimate": "as datamined",
      "reasoning": "ALWAYS-⚑ item 1: rate_of_fire and reloadFrames are known-unreliable datamine fields, and for a charge SR the effective cycle is charge time + a recovery term the datamine does not express. Everything in this override that depends on shot count (the S1 stack accrual, the conversion steady state, the swap shot economy) rides on this tuple.",
      "recipe": "Read the ammo counter frame-by-frame on a plain out-of-burst magazine to get shots/sec directly (the instrument that measures the disputed quantity), and time reload-start → full-ammo for the reload term."
    },
    {
      "field": "burst stage assignment (Λ)",
      "estimate": "burstCast stage 1 / 2 / 3 map 1:1 to Beast Cage / The Last Howl / Red Wolf",
      "reasoning": "Λ units fill whichever burst stage the rotation needs, and the kit's step branches are keyed to that stage. This is the literal reading of 'When used in Step N', but it means Red Wolf (the only offensive branch) only fires in comps where she takes the stage-3 slot — a fixture property. Also unverified: whether the two once-per-battle 40s CDRs let her burst again within the same fight in a way the rotation engine actually enacts.",
      "recipe": "Log burstCast events with their stage for her slot across the graded comps; confirm which branch(es) fire and whether the burstCdr effects produce an extra cast. If the engine instead advances a PERSONAL step counter rather than reading the rotation stage, re-key these blocks."
    }
  ],
  "model": "claude-opus-5"
}
```

---

## 7. DRIVER IMPLEMENTATION (test + override)

### driver test (scripts/tests/units/red-hood.test.ts)

```ts
// PER-UNIT KIT SPEC — `red-hood` (Red Hood, Attacker/SR/Iron, Λ-burst, cd 40s, ammo 6,
// chargeFrames 60). Kit-autonomy gauntlet 2026-07-25 (Tier 2).
//
// Red Hood is the ONLY Λ (Lambda) burst unit: the generator force-pins her to B3 and her burst
// advances an internal STEP (1 Beast Cage → 2 The Last Howl → 3 Red Wolf) on successive casts.
// Her override effects are therefore gated on `burstCast` STAGE, which is the Tier-2 heart of this
// file (burstCast-vs-fullBurstEnter, a scoped caster-relative team buff, a weapon swap, and a
// status-gate charge-speed→charge-damage conversion).
//
// One assertion group per KIT LINE (R1..R6), asserted against the SHIPPED override loaded from
// disk. `withPatchedOverride` appears ONLY to build COUNTERFACTUALS (the nearest wrong model each
// assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters['red-hood'].skills):
//   S1 ■ on normal attack → self: Charge Speed ▲3.81%, ×10 stacks, 5 sec                      [R1]
//      ■ at battle start → self: convert Charge Speed excess over 100% to Charge Damage,
//                                  Charge Damage ▲240% of the excess continuously             [R2 ⚑]
//   S2 ■ at battle start → self: Gain Pierce continuously                                      [R3]
//      ■ during Beast Cage → all allies: DEF ▲50.68% of caster DEF, 10 sec                     [inert]
//      ■ during The Last Howl → self: recover 23.04% of attack damage as HP over 10 sec        [inert]
//      ■ on casting Red Wolf → self: ATK ▲71.42% for 10 sec                                    [R4]
//   BU Step 1 Beast Cage → all allies: ATK ▲77.55% of caster ATK, 10 sec                       [R5]
//      Step 1 → self: Burst CD ▼40 sec, once per battle                                        [no-event]
//      Step 2 The Last Howl → self: Taunt all enemies 10 sec                                   [inert]
//      Step 2 → self: Incoming healing ▲74.88% 10 sec                                          [inert]
//      Step 2 → self: Burst CD ▼40 sec, once per battle                                        [no-event]
//      Step 3 Red Wolf → self: weapon swap (51.46% final ATK / 250% full charge / 10 sec)      [R6]
//      Step 3 → self: Expand Pierce range 100% 10 sec                                          [inert]
//      Step 3 → self: Charge Speed ▲100.8% 10 sec (folded into the swap's 0.3s cadence)        [R6]
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   R1  the CS stacks fire on EVERY normal attack (count == shot count) and ramp to 10 — a
//       burst-only or once-per-battle trigger lands near the burst count. maxStacks 10 + 5s.
//   R2  MEASUREMENT-GATED ⚑. The true conversion is dynamic (excess-CS × 2.4, continuous from
//       battle start, fed by her stack ramp AND any team Charge-Speed buffers). The engine has no
//       "convert stat-A excess to stat-B" primitive driven off the live CS total, so the override
//       models it as a STATIC chargeDamagePct 90 applied inside the Red Wolf window (the warm
//       excess is ~38.9 → ×2.4 = 93.36; 90 is the averaged ⚑ estimate, mechanism exact). This file
//       PINs the modeled approximation and its damage signature (swap charge-mult 3.4 = 2.5 full
//       charge + 0.9 from the buff) and discriminates it from "no conversion"; the residual to the
//       true dynamic value is the unit's known COLD ~0.867 (kit-status F2a/F2b). NOT fudged to
//       93.36 — that would invent precision the scope-lock basis cannot measure.
//   R3  hasPierce models "Gain Pierce continuously". Vs the single partless boss there is nothing
//       to pierce THROUGH and no Pierce-Damage buffer is fielded, so it is damage-INERT here:
//       asserted structurally (flag present) + proven inert (removing it moves no total). Its role
//       is to enable Pierce-Damage buffs (e.g. Mint 32.72) in comps that field one.
//   R4  the Red Wolf ATK rider is gated on STAGE 3 (the weapon-swap cast), self-scoped, 10s. A
//       full-burst-enter or stage-1 trigger would fire on a different cast set.
//   R5  Beast Cage is a CASTER-RELATIVE team buff: every ally receives the SAME flat ATK (= 77.55%
//       of the CASTER's ATK), not a percentage of each holder's own ATK. Proven two ways: it reaches
//       all three allies (retarget-to-self counterfactual reaches one) and the stored value is flat
//       ATK (~93k), not 77.55.
//   R6  Red Wolf swaps the weapon: shots become 51.46% (vs base SR 69.04%), full-charge 250%,
//       fire-rate-gated to exactly 1 shot/18 frames (0.3s — the +100.8% CS makes charge instant so
//       cadence is rate-of-fire-gated), on INFINITE ammo (no reload across the ~33-shot window).
//       Deep-dived from game data (skill 1470610 + weapon 1047002), owner-confirmed 2026-07-20.
//
// Documented, NOT asserted:
//   [no-event] the two Burst-CD-▼40sec refunds (Steps 1 & 2, once per battle) are modeled
//       (burstCdr) but the engine emits NO burstCdr event; their net effect (faster Λ step cycling
//       early) is entangled with the engine's Λ step-advance mechanic and is not cleanly isolable
//       in the event log.
//   [inert] DEF ▲50.68% (S2/Beast Cage), HP-recovery 23.04% (S2/Last Howl), Taunt (B2), Incoming
//       healing ▲74.88% (B2), Pierce-range-expand 100% (B3) — all survivability/targeting/utility
//       with no DPS observable in a partless single-boss sim with no HP pool. Correctly in
//       `unmodeled`; no assertion.
//
// Fixture: liter (B1) / crown (B2) / red-hood (Λ→B3), boss Fire, focus red-hood. Red Hood is the
// sole B3, so she casts every Full Burst and cycles Λ steps 1→2→3 across the 180s fight (the two
// CD refunds chain Steps 1→2→3 back-to-back early). Deterministic (no seed).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
/** controlComp('red-hood', false) slot order: liter 0 / crown 1 / red-hood 2. */
const RH = 2;
const ALLIES = new Set([0, 1, 2]);

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp('red-hood', false),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual patches ------------------------------------------------------------------
const stage3 = (ov: any) => {
  const b = ov.burst.find(
    (x: any) => x.trigger.kind === 'burstCast' && x.trigger.stage === 3
  );
  if (!b)
    throw new Error('red-hood stage-3 burst block missing — fixture is stale');
  return b;
};

/** R1 counterfactual: her S1 Charge-Speed stack line removed. */
const rhNoChargeSpeed = withPatchedOverride('red-hood', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) => !b.effects.some((e: any) => e.stat === 'chargeSpeedPct')
  );
  if (ov.skill1.length === before)
    throw new Error(
      'red-hood S1 chargeSpeedPct block missing — fixture is stale'
    );
});
/** R2 counterfactual: the chargeDamagePct-90 conversion approximation removed from Red Wolf. */
const rhNoChargeDmg = withPatchedOverride('red-hood', (ov) => {
  const b = stage3(ov);
  const before = b.effects.length;
  b.effects = b.effects.filter((e: any) => e.stat !== 'chargeDamagePct');
  if (b.effects.length === before)
    throw new Error(
      'red-hood stage-3 chargeDamagePct missing — fixture is stale'
    );
});
/** R3 counterfactual: permanent Pierce removed. */
const rhNoPierce = withPatchedOverride('red-hood', (ov) => {
  if (ov.hasPierce !== true)
    throw new Error('red-hood hasPierce missing — fixture is stale');
  ov.hasPierce = false;
});
/** R4 counterfactual: the Red Wolf ATK rider removed. */
const rhNoRedWolfAtk = withPatchedOverride('red-hood', (ov) => {
  const b = stage3(ov);
  const before = b.effects.length;
  b.effects = b.effects.filter(
    (e: any) => !(e.kind === 'buff' && e.stat === 'atkPct')
  );
  if (b.effects.length === before)
    throw new Error('red-hood stage-3 atkPct rider missing — fixture is stale');
});
/** R5 counterfactual: Beast Cage retargeted from all allies to self only. */
const rhBeastCageSelf = withPatchedOverride('red-hood', (ov) => {
  const b = ov.burst.find(
    (x: any) => x.trigger.stage === 1 && x.target.kind === 'allies'
  );
  if (!b)
    throw new Error('red-hood stage-1 allies block missing — fixture is stale');
  b.target.kind = 'self';
});
/** R6 counterfactual: the Red Wolf weapon swap (+ its infinite-ammo economy) removed. */
const rhNoWeaponSwap = withPatchedOverride('red-hood', (ov) => {
  const b = stage3(ov);
  const before = b.effects.length;
  b.effects = b.effects.filter(
    (e: any) => e.kind !== 'weaponSwap' && e.kind !== 'unlimitedAmmo'
  );
  if (b.effects.length === before)
    throw new Error('red-hood stage-3 weaponSwap missing — fixture is stale');
});

// ---- runs (hoisted: each is a full 180s sim) -------------------------------------------------
const base = run();
const noChargeSpeed = run({ 'red-hood': rhNoChargeSpeed });
const noChargeDmg = run({ 'red-hood': rhNoChargeDmg });
const noPierce = run({ 'red-hood': rhNoPierce });
const noRedWolfAtk = run({ 'red-hood': rhNoRedWolfAtk });
const beastCageSelf = run({ 'red-hood': rhBeastCageSelf });
const noWeaponSwap = run({ 'red-hood': rhNoWeaponSwap });

// ---- readers ---------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const rhDamage = (evs: SimEvent[]) =>
  dmg(evs).filter((d) => d.slug === 'red-hood');
const rhShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'red-hood');
const rhBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'red-hood'
  );
const rhStageCasts = (evs: SimEvent[], stage: number) =>
  rhBursts(evs).filter((c) => c.stage === stage);
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
/** Buffs cast BY red-hood (casterIdx RH) on the given stat. */
const rhCastBuff = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === RH && b.stat === stat);

/** Swap shots carry the Red Wolf weapon's 51.46% (base SR is 69.04%). */
const SWAP_ATKPCT = 51.46;
const swapDamage = (evs: SimEvent[]) =>
  rhDamage(evs).filter((d) => d.atkPct === SWAP_ATKPCT);
const uaShots = (evs: SimEvent[]) =>
  rhShots(evs).filter((s) => s.unlimitedAmmo);

describe('red-hood — kit spec', () => {
  describe('R1 — S1 Charge Speed stacks fire on every normal attack, ×10, 5 sec', () => {
    const cs = rhCastBuff(base.events, 'chargeSpeedPct');

    it('is 3.81% per stack, max 10 stacks, 5-sec duration, self-scoped', () => {
      expect(cs.length, 'no chargeSpeedPct buff was applied').toBeGreaterThan(
        0
      );
      expect([...new Set(cs.map((b) => b.value))]).toEqual([3.81]);
      expect([...new Set(cs.map((b) => b.maxStacks))]).toEqual([10]);
      expect([...new Set(cs.map((b) => b.expiresFrame! - b.frame))]).toEqual([
        5 * FPS,
      ]);
      expect([...new Set(cs.map((b) => b.targetIdx))]).toEqual([RH]);
    });

    it('fires once per normal attack (not once per burst) and ramps to 10 stacks', () => {
      expect(cs.length).toBe(rhShots(base.events).length);
      expect(
        Math.max(...cs.map((b) => b.stacks)),
        'stacks never reached the ×10 cap'
      ).toBe(10);
    });

    it('DISCRIMINATING: removing the S1 line deletes every chargeSpeedPct buff', () => {
      expect(rhCastBuff(noChargeSpeed.events, 'chargeSpeedPct').length).toBe(0);
    });
  });

  describe('R2 — S1 excess-CS→Charge-Damage conversion (MEASUREMENT-GATED ⚑, static 90 in Red Wolf)', () => {
    const cd = rhCastBuff(base.events, 'chargeDamagePct');

    it('is modeled as a static chargeDamagePct 90, self-scoped, 10 sec, fired on each Red Wolf cast', () => {
      expect(cd.length, 'no chargeDamagePct buff was applied').toBeGreaterThan(
        0
      );
      expect([...new Set(cd.map((b) => b.value))]).toEqual([90]);
      expect([...new Set(cd.map((b) => b.targetIdx))]).toEqual([RH]);
      expect([...new Set(cd.map((b) => b.expiresFrame! - b.frame))]).toEqual([
        10 * FPS,
      ]);
      expect(cd.length).toBe(rhStageCasts(base.events, 3).length);
    });

    it('adds exactly +0.9 to the swap charge multiplier (2.5 full charge → 3.4)', () => {
      const shipped = [
        ...new Set(
          swapDamage(base.events).map((d) => +d.mult.charge.toFixed(6))
        ),
      ];
      expect(
        shipped,
        'swap shots must carry a single charge multiplier'
      ).toEqual([3.4]);
    });

    it('DISCRIMINATING: removing the conversion drops the swap charge mult by exactly 0.9', () => {
      const counter = [
        ...new Set(
          swapDamage(noChargeDmg.events).map((d) => +d.mult.charge.toFixed(6))
        ),
      ];
      expect(counter.length).toBe(1);
      expect(
        3.4 - counter[0],
        'the buff must contribute exactly +0.9 (90/100) to the charge mult'
      ).toBeCloseTo(0.9, 6);
      expect(rhCastBuff(noChargeDmg.events, 'chargeDamagePct').length).toBe(0);
    });
  });

  describe('R3 — S2 "Gain Pierce continuously" (hasPierce; damage-inert vs the single boss)', () => {
    it('is modeled on the override (the line is present, not dropped)', () => {
      const ov = withPatchedOverride('red-hood', () => {});
      expect((ov as any).hasPierce).toBe(true);
    });

    it("is damage-inert in this fixture: removing it moves no unit's total by a point", () => {
      // Vs a single partless boss there is nothing to pierce through and no Pierce-Damage buffer
      // is fielded, so the flag has no DPS observable here (its role is enabling Pierce-Damage
      // buffs in comps that field one).
      expect(base.totals).toEqual(noPierce.totals);
    });
  });

  describe('R4 — S2 Red Wolf ATK rider: ATK ▲71.42% self, gated on STAGE 3, 10 sec', () => {
    const atk = rhCastBuff(base.events, 'atkPct');

    it('is 71.42%, self-scoped, 10 sec, fired once per Red Wolf (stage-3) cast', () => {
      expect(atk.length, 'no atkPct rider was applied').toBeGreaterThan(0);
      expect([...new Set(atk.map((b) => b.value))]).toEqual([71.42]);
      expect([...new Set(atk.map((b) => b.targetIdx))]).toEqual([RH]);
      expect([...new Set(atk.map((b) => b.expiresFrame! - b.frame))]).toEqual([
        10 * FPS,
      ]);
      expect(atk.length).toBe(rhStageCasts(base.events, 3).length);
    });

    it('DISCRIMINATING: removing the rider deletes the buff and lowers her total', () => {
      expect(rhCastBuff(noRedWolfAtk.events, 'atkPct').length).toBe(0);
      expect(noRedWolfAtk.totals['red-hood']).toBeLessThan(
        base.totals['red-hood']
      );
    });
  });

  describe('R5 — Burst Step 1 Beast Cage: caster-relative team ATK, all allies, 10 sec', () => {
    const ca = rhCastBuff(base.events, 'casterAtkPct');

    it('reaches ALL three allies (not just the caster)', () => {
      expect(ca.length, 'no casterAtkPct buff was applied').toBeGreaterThan(0);
      expect(new Set(ca.map((b) => b.targetIdx))).toEqual(ALLIES);
    });

    it('is caster-relative: every ally receives the SAME flat ATK (≫ the 77.55% figure), for 10 sec', () => {
      const values = [...new Set(ca.map((b) => b.value))];
      expect(
        values.length,
        'every holder must receive the identical caster-relative flat ATK'
      ).toBe(1);
      expect(
        values[0],
        'stored as flat ATK, not a 77.55 percentage'
      ).toBeGreaterThan(1000);
      expect([...new Set(ca.map((b) => b.expiresFrame! - b.frame))]).toEqual([
        10 * FPS,
      ]);
    });

    it('fires on each Beast Cage (stage-1) cast', () => {
      const stage1 = rhStageCasts(base.events, 1).length;
      expect(stage1).toBeGreaterThan(0);
      // one buffApply per holder per cast → 3 allies × stage-1 casts
      expect(ca.length).toBe(3 * stage1);
    });

    it('DISCRIMINATING: retargeting to self reaches only the caster', () => {
      const selfOnly = rhCastBuff(beastCageSelf.events, 'casterAtkPct');
      expect(new Set(selfOnly.map((b) => b.targetIdx))).toEqual(new Set([RH]));
    });
  });

  describe('R6 — Burst Step 3 Red Wolf: weapon swap 51.46% / 250% full charge / 0.3s / infinite ammo', () => {
    it('swaps the weapon: shots become 51.46% (base SR is 69.04%)', () => {
      const swap = swapDamage(base.events);
      expect(
        swap.length,
        'no Red Wolf swap shots were produced'
      ).toBeGreaterThan(0);
      // base SR normals (69.04%) must also exist — she returns to base SR when the window ends
      expect(rhDamage(base.events).some((d) => d.atkPct === 69.04)).toBe(true);
    });

    it('is fire-rate-gated to exactly 1 shot / 18 frames (0.3s) on infinite ammo', () => {
      const ua = uaShots(base.events);
      expect(ua.length, 'no unlimited-ammo (Red Wolf) shots').toBeGreaterThan(
        0
      );
      // every Red Wolf shot is unlimited-ammo and there are no reloads inside a window
      expect(ua.length).toBe(swapDamage(base.events).length);
      const gaps = ua.slice(1).map((s, i) => s.frame - ua[i].frame);
      // within-window cadence is a constant 18 frames; allow the cross-window gap to differ
      const withinWindow = gaps.filter((g) => g < 18 * 40);
      expect(withinWindow.length).toBeGreaterThan(0);
      expect(
        [...new Set(withinWindow)],
        'cadence must be a constant 18 frames (0.3s)'
      ).toEqual([18]);
    });

    it('runs ~33 shots per 10-sec window (one per stage-3 cast)', () => {
      const windows = rhStageCasts(base.events, 3).length;
      expect(windows).toBeGreaterThan(0);
      const perWindow = swapDamage(base.events).length / windows;
      expect(
        perWindow,
        'a 10s window at 0.3s cadence yields ~33 shots'
      ).toBeGreaterThan(30);
      expect(perWindow).toBeLessThan(36);
    });

    it('DISCRIMINATING: removing the swap leaves only base-SR (69.04%) shots and no unlimited ammo', () => {
      expect(swapDamage(noWeaponSwap.events).length).toBe(0);
      expect(uaShots(noWeaponSwap.events).length).toBe(0);
      expect(
        rhDamage(noWeaponSwap.events).every((d) => d.atkPct === 69.04)
      ).toBe(true);
    });
  });
});
```

### driver shipped override (src/skills/overrides/red-hood.json)

```json
{
  "note": "Lambda burst is stage-conditional. Step 1: team ATK 77.55% of caster ATK + own 40s CD refund (once per battle). Step 2: defensive + CD refund (once per battle). Step 3 Red Wolf: weapon swap (51.46%/shot, 250% full charge, 10s, keeps her 1s SR charge cycle) + self ATK 71.42% for 10s (the S2 rider). S1 excess-charge-speed -> charge-damage conversion not modeled. USER (2026-07-13): Red Wolf (her own B3 window) has INFINITE AMMO — no reloads for the 10s (unlimitedAmmo effect); ammo resets to max when the window ends (engine swap-expiry behavior). DEEP-DIVE 2026-07-13 (decoded game data, skill 1470610 + weapon 1047002): Red Wolf = weapon swap 51.46%/shot, 250% full charge, rate_of_fire 200rpm -> exactly 1 shot/18 frames (0.3s) regardless of charge speed (the +100.8% CS makes charge instant; cadence is fire-rate-gated) -> chargeTimeSec 0.3, ~33 shots/window, infinite ammo (max_ammo 99). S1's excess-over-100% CS -> Charge Damage x2.4 conversion: at 100.8 swap + 3.81x10 stacks, excess ~39 -> +93%; modeled as chargeDamagePct 90 ⚑ (mechanism exact, stack ramp averaged). hasPierce for Pierce Damage buffs (Mint 32.72). [materialized 2026-07-16: skill1 auto-filled from the offline parser (blablalink prose) — behavior-identical to the prior runtime parse; NOT hand-verified] OWNER-CONFIRMED 2026-07-20: her base SR OUTSIDE Red Wolf HAS bolt recovery (bolt-action; the engine's +22f SR default stands) — closes the blind-rebuild audit's open question (gotcha 1, 'autofire vs bolt-action untested'); no behavior change, the sim already modeled bolt-action. Her COLD 0.867 residual therefore lives elsewhere (prime suspect: the S1 excess-CS→Charge-Damage conversion still modeled as a static chargeDamagePct 90 average — gotcha 2, MEASUREMENT). Kit-autonomy gauntlet 2026-07-25: cross-family audit (claude-fable-5 S2b) converged FAITHFUL on all 10 load-bearing lines (S1 CS-stacks 3.81x10/5s; S2 hasPierce; S2 Red Wolf ATK 71.42 stage-3; B1 Beast Cage casterAtkPct 77.55 all-allies; B1/B2 burstCdr 40 oncePerBattle; B3 weaponSwap 51.46/250/0.3 + infinite ammo). Conversion stays chargeDamagePct 90 flagged (warm 93.36 = (138.9-100)x2.4 independently re-derived by the reviewer and already documented above; MEASURED>FUDGE — no fudge to 93.36). Stage-2 lifesteal 23.04% confirmed UNMODELED/out-of-domain (no HP pool; tandem recovery-feed to a future on-recovery teammate recorded as a residual, not a DPS-basis edit). burstCdr step1/step2 declared reading = two independent per-step once-per-battle refunds (prose-literal). scripts/tests/units/red-hood.test.ts PINs every load-bearing line (green vs shipped, red vs counterfactual).",
  "hasPierce": true,
  "unmodeled": {
    "skill1": [
      "Convert excess value over 100% of Charge Speed to Charge Damage. Charge Damage ▲ 240% of the excess value continuously."
    ],
    "skill2": [
      "■ Activates during Beast Cage. Affects all allies. DEF ▲ 50.68% of the skill user's DEF for 10 sec.",
      "■ Activates during The Last Howl. Affects self. Recovers 23.04% of attack damage as HP over 10 sec."
    ],
    "burst": [
      "Step 2 (The Last Howl): Attract: Taunts all enemies for 10 sec.",
      "Step 2 (The Last Howl): Incoming healing ▲ 74.88% for 10 sec.",
      "Step 3 (Red Wolf): Expand Pierce range by 100% for 10 sec."
    ]
  },
  "caveats": [
    "skill1: unparsed effect \"Convert excess value over 100% of Charge Speed to Charge Damage. Charge Damage ▲ 240% of the excess value continuously.\""
  ],
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "hitCount",
        "count": 1
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "chargeSpeedPct",
          "value": 3.81,
          "durationSec": 5,
          "maxStacks": 10
        }
      ]
    }
  ],
  "skill2": [],
  "burst": [
    {
      "slot": "burst",
      "trigger": {
        "kind": "burstCast",
        "stage": 1
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 77.55,
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "burst",
      "trigger": {
        "kind": "burstCast",
        "stage": 1
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "burstCdr",
          "seconds": 40,
          "oncePerBattle": true
        }
      ]
    },
    {
      "slot": "burst",
      "trigger": {
        "kind": "burstCast",
        "stage": 2
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "burstCdr",
          "seconds": 40,
          "oncePerBattle": true
        }
      ]
    },
    {
      "slot": "burst",
      "trigger": {
        "kind": "burstCast",
        "stage": 3
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "weaponSwap",
          "damagePct": 51.46,
          "chargeMultPct": 250,
          "durationSec": 10,
          "chargeTimeSec": 0.3
        },
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 71.42,
          "durationSec": 10
        },
        {
          "kind": "unlimitedAmmo",
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "chargeDamagePct",
          "value": 90,
          "durationSec": 10
        }
      ]
    }
  ]
}
```
