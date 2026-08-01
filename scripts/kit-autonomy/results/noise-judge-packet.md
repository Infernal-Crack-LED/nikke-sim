# RECONCILING JUDGE — noise (RL / Supporter / Electric / Burst I)

You are the binding reconciling judge for ONE unit's kit-autonomy gauntlet. Read the contract below, then the materials, then return the verdict JSON it specifies.

=== SECTION 1 — JUDGE CONTRACT + RETURN JSON SHAPE ===

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

=== SECTION 2 — MECHANICS SOURCE OF TRUTH (formula + buckets + FB timing + crit/core + element + buff stacking) ===

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

=== SECTION 3 — GROUND TRUTH: noise kit prose + base stats (data/characters.json → characters.noise) ===

Max-level skill magnitudes (from description_value_list last column): S1 Damage Taken ▼10.66% / 20s when attacked 20×; S2 Taunt 2s + self Max HP ▲24.86% / 1.8s; burst recover 2.47% caster final Max HP every 1s for 10s + Max HP ▲49.5% / 10s.

{
"slug": "noise",
"name": "Noise",
"imageUrl": "https://sg-tools-cdn.blablalink.com/jn-24/iy-36/52ec2d882f6e5114d6cfd6f26d8800e9.png",
"weapon": "RL",
"burst": "I",
"burstCooldownSec": 40,
"class": "Supporter",
"element": "Electric",
"manufacturer": "Tetra",
"normalAttackMultiplier": 61.3,
"coreAttackMultiplier": 200,
"ammo": 6,
"reloadFrames": 141,
"chargeFrames": 60,
"chargeMultiplier": 250,
"hitsPerShot": 1,
"rl3": 16.8,
"releaseDate": "2022-11-04",
"burstGaugePerShot": 1.4,
"treasure": false,
"skills": {
"skill1": "■ Activates when attacked 20 time(s). Affects all allies.\nDamage Taken ▼ 10.66% for 20 sec.",
"skill2": "■ Activates when hitting a target with a Full Charge attack. Affects the target.\nTaunts for 2 sec.\n■ Activates when attacking with Full Charge. Affects self.\nMax HP ▲ 24.86% for 1.8 sec.",
"burst": "■ Affects all allies.\n Constantly recovers 2.47% of the skill user's final Max HP every 1 sec for 10 sec.\nMax HP ▲ 49.5% for 10 sec."
},
"skillCooldownsSec": {
"skill1": null,
"skill2": null,
"burst": 40
},
"role": {
"weapon": {
"shot_id": 1043001,
"shot_detail": {
"id": 1043001,
"damage": 6130,
"max_ammo": 6,
"shake_id": 2,
"ShakeType": "Fire_RL",
"fire_type": "HomingProjectile",
"zoom_rate": 0,
"input_type": "UP",
"shot_count": 1,
"ShakeWeight": 120,
"attack_type": "Metal",
"camera_work": "camera_work_01",
"charge_time": 100,
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
"reload_start_ammo": 5,
"full_charge_damage": 25000,
"multi_target_count": 0,
"spot_radius_object": 2,
"uptype_fire_timing": 0,
"burst_energy_pershot": 14000,
"description_localkey": "■ Affects target(s).\n<color=#00AEFF>Deals {damage}% of ATK as damage.\nCharge Time: {charge_time} sec.\nFull Charge Damage: {full_charge_damage}% of damage.\nDeals {core_damage_rate}% damage when attacking core.</color>",
"maintain_fire_stance": 0,
"spot_explosion_range": 500,
"use_function_id_list": [
0
],
"accuracy_change_speed": 0,
"hurt_function_id_list": [
0
],
"spot_projectile_speed": 100,
"accuracy_change_pershot": 0,
"prefer_target_condition": "None",
"rate_of_fire_reset_time": 0,
"full_charge_burst_energy": 25000,
"end_accuracy_circle_scale": 10,
"auto_accuracy_change_speed": 0,
"rate_of_fire_change_pershot": 0,
"start_accuracy_circle_scale": 10,
"target_burst_energy_pershot": 28000,
"auto_accuracy_change_pershot": 0,
"auto_end_accuracy_circle_scale": 10,
"auto_start_accuracy_circle_scale": 10
},
"bonusrange_max": 0,
"bonusrange_min": 0
},
"burstMeta": {
"burst_duration": 1000,
"use_burst_skill": "Step1",
"burst_apply_delay": 1,
"change_burst_step": "Step2"
},
"skillDetails": {
"skill1_id": 2430101,
"skill2_id": 2430201,
"skill1_table": "StateEffect",
"skill2_table": "StateEffect",
"skill1_detail": {
"id": 2430101,
"icon": "icn_skill_defup_01",
"group_id": 24301,
"skill_level": 1,
"name_localkey": "Chorus",
"next_level_id": 2430102,
"level_up_cost_id": 40102,
"description_localkey": "■ Activates when attacked {description_value_01} time(s). Affects all allies.\n<color=#00AEFF>Damage Taken ▼ {description_value_02}% for {description_value_03} sec.</color>",
"description_value_list": [
{
"description_value": [
"20",
"20",
"20",
"20",
"20",
"20",
"20",
"20",
"20",
"20"
]
},
{
"description_value": [
"5.86",
"6.4",
"6.93",
"7.46",
"8",
"8.53",
"9.06",
"9.59",
"10.13",
"10.66"
]
},
{
"description_value": [
"20",
"20",
"20",
"20",
"20",
"20",
"20",
"20",
"20",
"20"
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
"id": 2430201,
"icon": "icn_skill_attention_01",
"group_id": 24302,
"skill_level": 1,
"name_localkey": "Sing Together",
"next_level_id": 2430202,
"level_up_cost_id": 40202,
"description_localkey": "■ Activates when hitting a target with a Full Charge attack. Affects the target.\n<color=#00AEFF>Taunts for {description_value_01} sec.</color>\n■ Activates when attacking with Full Charge. Affects self.\n<color=#00AEFF>Max HP ▲ {description_value_02}% for {description_value_03} sec.</color>",
"description_value_list": [
{
"description_value": [
"2",
"2",
"2",
"2",
"2",
"2",
"2",
"2",
"2",
"2"
]
},
{
"description_value": [
"17.54",
"18.35",
"19.16",
"19.98",
"20.79",
"21.6",
"22.42",
"23.23",
"24.04",
"24.86"
]
},
{
"description_value": [
"1.8",
"1.8",
"1.8",
"1.8",
"1.8",
"1.8",
"1.8",
"1.8",
"1.8",
"1.8"
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
"info_description_localkey": "Skill 2"
},
"ulti_skill_id": 1430301,
"ulti_skill_detail": {
"id": 1430301,
"icon": "icn_skill_c430_ult",
"group_id": 14303,
"shake_id": 1,
"skill_type": "SetBuff",
"attack_type": "Electronic",
"skill_level": 1,
"counter_type": "Metal_Type",
"duration_type": "None",
"name_localkey": "Energetic Noise",
"next_level_id": 1430302,
"prefer_target": "HighAttack",
"resource_name": "c430_ulti",
"duration_value": 0,
"skill_cooltime": 4000,
"level_up_cost_id": 40302,
"skill_value_data": [
{
"skill_value": 0,
"skill_value_type": "None"
},
{
"skill_value": 5,
"skill_value_type": "Integer"
},
{
"skill_value": 10000,
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
"description_localkey": "■ Affects all allies.\n <color=#00AEFF>Constantly recovers {description_value_01}% of the skill user's <word_group=10025>final</word_group> Max HP every 1 sec for {description_value_02} sec.\nMax HP ▲ {description_value_03}% for {description_value_04} sec.</color>",
"description_value_list": [
{
"description_value": [
"1.36",
"1.48",
"1.6",
"1.73",
"1.85",
"1.98",
"2.1",
"2.22",
"2.35",
"2.47"
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
"27.22",
"29.7",
"32.17",
"34.65",
"37.12",
"39.6",
"42.07",
"44.55",
"47.02",
"49.5"
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
{}
],
"prefer_target_condition": "None",
"info_description_localkey": "Burst Skill",
"after_use_function_id_list": [
143030102,
143030101
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
"grow_grade": 343002,
"grade_core_id": 1,
"stat_enhance_id": 5305,
"stat_enhance_detail": {
"id": 5305,
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
400001
],
"element_details": [
{
"id": 400001,
"element": "Electronic",
"group_id": 5000004,
"element_icon": "icn_element_elect",
"weak_element_id": 500001,
"element_desc_localekey": "Injects Code: Z.E.U.S. to all water-type enemies, dealing 10% additional damage.",
"element_name_localekey": "Electric",
"element_code_name_localekey": "Code: Z.E.U.S."
}
]
},
"piece": {
"piece_id": 5100430,
"piece_detail": {
"id": 5100430,
"class": "Supporter",
"order": 43000,
"use_id": 0,
"use_type": "None",
"item_rare": "SSR",
"item_type": "Piece",
"stack_max": 9999999,
"use_value": 0,
"corporation": "TETRA",
"resource_id": 430,
"item_sub_type": "CharacterPiece",
"name_localkey": "Noise's Spare Body",
"use_limit_count": false,
"inventory_filter": [
"etc"
],
"description_localkey": "Can be used for Nikkes' Limit Breaks.\nIf a Nikke's Limit Break has reached the max level, any additional Spare Bodies for that Nikke will be converted to Body Labels."
}
},
"meta": {
"id": 343001,
"class": "Supporter",
"order": 10109,
"name_code": 5074,
"corporation": "TETRA",
"resource_id": 430,
"name_localkey": "Noise",
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
"generatorSupported": false,
"simSupported": false,
"baseStats": {
"hp": 15000,
"atk": 500,
"def": 98,
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
"resourceId": 430
}
}
=== SECTION 4 — S2b CROSS-FAMILY TEST REVIEW (claude-fable-5) ===

{
"slug": "noise",
"leakDetected": null,
"spec": [
{
"slot": "skill1",
"kitLine": "when attacked 20 time(s) → allies",
"disposition": "UNMODELED",
"scope": "Incoming-damage mitigation (Damage Taken ▼ 10.66%) on ALL ALLIES — a defensive received-damage stat, not an offensive one.",
"durationSemantics": "20 sec wall-clock (durationSec) — not rounds.",
"triggerIdentity": "On-being-attacked counter (attacked 20 times). No such trigger exists in the schema, and the v1 boss deals no damage, so the trigger can never accrue — untriggerable AND effect-inert.",
"targetSet": "allies (all, incl. self)",
"nearestWrongModel": "Sign/target flip: encoding 'Damage Taken ▼' as the boss debuff damageTakenPct (taxonomy trap #4 in reverse) — a phantom ~10.66% team-wide damage gain on some invented trigger (e.g. interval or hitCount:20).",
"distinguishingAssertion": "Run controlComp with noise; collect buffApply events — there must be ZERO events with stat 'damageTakenPct' attributable to noise (no boss-held casterIdx===null apply matching value 10.66). Additionally, withPatchedOverride('noise', o => { o.skill1 = [] }) must leave every unit's totals() entry bit-identical.",
"inertness": "Skill1 must move NO unit's damage — the whole slot is damage-inert.",
"evidenceTier": "DATAMINED",
"loadBearing": false
},
{
"slot": "skill2",
"kitLine": "Full Charge hit → Taunts for 2 sec",
"disposition": "UNMODELED",
"scope": "Enemy-targeted aggro control on full-charge HIT.",
"durationSemantics": "2 sec wall-clock.",
"triggerIdentity": "On-HIT with a Full Charge attack (on-hit, not on-cast). No taunt/aggro primitive exists; the boss script is fixed and hit location never changes damage, so taunt is mechanically inert.",
"targetSet": "enemy (the target)",
"nearestWrongModel": "Encoding the taunt as a targetStatus('Taunt') or, worse, as an enemy damageTakenPct debuff riding the full-charge trigger — manufacturing a boss debuff the kit does not state.",
"distinguishingAssertion": "No targetStatus effect and no boss-held debuff buffApply (casterIdx===null) may originate from noise's skill2; withPatchedOverride stripping this line changes no totals. The line belongs verbatim in unmodeled.skill2.",
"inertness": "Must move no damage for any unit; must not open any requiresTargetStatus gate.",
"evidenceTier": "DATAMINED",
"loadBearing": false
},
{
"slot": "skill2",
"kitLine": "Full Charge atk → self Max HP ▲24.86%",
"disposition": "FAITHFUL",
"scope": "Scoped to attacking with Full Charge. Noise is an RL (chargeFrames 60): in the sim every trigger pull is a full-charge shot, so the effective cadence is per shot — but the encoding should still ride the shot trigger, not a passive.",
"durationSemantics": "1.8 sec wall-clock (durationSec: 1.8 → expires ~108 frames after apply). NOT rounds. Note 1.8s is shorter than her fire cycle (60f charge + travel + 6-ammo/141f-reload economy), so the buff is intermittent, not continuous — a passive encoding would be wrong.",
"triggerIdentity": "shotFired (each pull = a full-charge attack for an always-full-charging RL). On-attack, not on-hit — the taunt line above is the on-hit one; this one fires at attack time.",
"targetSet": "self",
"nearestWrongModel": "Dropping it as 'defensive, no damage effect' (the Grave reload-line failure mode: skipping stat lines instead of encoding them), or encoding as a passive/permanent Max HP buff ignoring the 1.8s window.",
"distinguishingAssertion": "Filter buffApply for stat 'maxHpFlat' with casterIdx===targetIdx===noise's slot: one apply per noise shot event (refresh:true on subsequent shots inside 1.8s is acceptable), each with expiresFrame ≈ applyFrame + 108, and value = a flat HP number (24.86% resolved against her Max HP), NOT the raw 24.86. Under the nearest-wrong (skipped) model this event set is empty; under the passive misread expiresFrame is unbounded.",
"inertness": "Damage-inert: noise has no HP→ATK conversion (no atkOfMaxHpPct in her kit), so totals for ALL units must be identical with this block present vs stripped. The buff must exist in the event log anyway (future-consumer rule).",
"evidenceTier": "DATAMINED",
"loadBearing": true
},
{
"slot": "burst",
"kitLine": "recovers 2.47% … every 1 sec for 10 sec",
"disposition": "FAITHFUL",
"scope": "Heal-over-time to all allies; amount (% of caster final Max HP) is unmodeled by the heal primitive — the EVENT CADENCE is the mechanic.",
"durationSemantics": "10 ticks at 1s intervals over 10 sec — must be heal{ticks:10, intervalSec:1}, NOT a single instant heal.",
"triggerIdentity": "burstCast (stage 1 — fires only on rotations NOISE herself casts Burst I). NOT fullBurstEnter: keying to FB entry would fire the heal even on rotations where a competing B1 (e.g. liter) takes the slot — the classic burst-cast vs full-burst-enter over-credit.",
"targetSet": "allies (all, incl. self)",
"nearestWrongModel": "TWO stacked misreads to distinguish: (a) ticks defaulted to 1 (single recovery event per burst) starving on-recovery consumers; (b) trigger keyed to fullBurstEnter so the heal fires on every team FB regardless of who cast B1. This is the tandem trap (taxonomy #4): the heal looks inert alone but is the unit's ONLY damage-relevant channel, via teammates' 'recovery' triggers (crown sits in the control fixture as exactly such a consumer).",
"distinguishingAssertion": "In a comp where noise IS the casting B1, count heal-driven 'recovery'-consumer activity: crown's on-recovery buffApply events must refresh ~10 times per noise burst, spaced ~60 frames apart across the 10s window (green faithful / red under ticks:1, which yields exactly 1). Second assertion: in a comp where liter holds B1 and noise never casts, noise must emit ZERO heal-driven events (green faithful / red under fullBurstEnter).",
"inertness": "Noise's own totals unchanged; movement appears only in recovery-consumer teammates' buff uptime.",
"evidenceTier": "DATAMINED",
"loadBearing": true
},
{
"slot": "burst",
"kitLine": "Max HP ▲ 49.5% for 10 sec (allies)",
"disposition": "FAITHFUL",
"scope": "Generic Max HP stat buff to all allies.",
"durationSemantics": "10 sec wall-clock.",
"triggerIdentity": "burstCast (same block/cast as the heal — stage 1, her own burst).",
"targetSet": "allies (all, incl. self)",
"nearestWrongModel": "casterMaxHpPct instead of target-own-HP semantics: 'Max HP ▲ X%' is % of each TARGET's own Max HP (blanc/maiden shape), not a grant of 49.5% of NOISE's HP — the flat values per ally differ between the two encodings.",
"distinguishingAssertion": "buffApply events (stat 'maxHpFlat', key = this burst line) must carry DIFFERENT flat values per target, each ≈ 49.5% of that target's own Max HP; under the casterMaxHpPct misread every ally receives the SAME flat value (49.5% of noise's HP). Also assert expiresFrame ≈ castFrame + 600.",
"inertness": "Damage-inert everywhere: ally-granted Max HP never feeds a teammate's atkOfMaxHpPct (e3 rule), and noise has no own conversion — totals for all units identical with the line stripped. Encode it anyway.",
"evidenceTier": "DATAMINED",
"loadBearing": true
}
],
"loadBearingSet": [
"skill2:Full Charge → self Max HP ▲24.86% 1.8s",
"burst:heal 2.47% every 1s ×10 ticks (allies)",
"burst:Max HP ▲49.5% 10s (allies)"
],
"unmodeledVerbatim": {
"skill1": [
"■ Activates when attacked 20 time(s). Affects all allies.",
"Damage Taken ▼ 10.66% for 20 sec."
],
"skill2": [
"■ Activates when hitting a target with a Full Charge attack. Affects the target.",
"Taunts for 2 sec."
],
"burst": []
},
"notes": "Reconcile these with the driver: (1) SIGN-FLIP TRAP on skill1 — 'Damage Taken ▼ on allies' is defensive mitigation and must NOT appear as the boss damageTakenPct debuff; any damageTakenPct emission from noise is a phantom team buff. (2) The burst heal-over-time is noise's ONLY damage-relevant channel, and only via tandem (recovery-trigger consumers like crown, who is in the control fixture) — expect the shared-prior misread of ticks:1 (single instant heal) and/or fullBurstEnter keying; both assertions above are cheap and decisive. (3) FIXTURE HAZARD: noise is Burst I — in controlComp(noise) she coexists with liter (also B1) and first-ready in-window selection decides who casts; the test MUST pin/assert which unit actually casts B1 (burstCast events by slot) before asserting heal cadence, and remember a lone B3-less comp makes zero FBs (helm's fixed B3 slot covers this). (4) All durations here are genuine wall-clock seconds — no 'for N round(s)' lines — so a durationShots encoding anywhere in this kit is a misread. (5) Expected driver temptation: declaring the two Max HP buffs 'skip, defensive' — they are damage-inert but must be ENCODED (future-consumer rule), with inertness pinned by strip-diff assertions.",
"model": "claude-fable-5"
}

=== SECTION 5 — S5 BLIND TEST (claude-opus-5, derived from prose alone) + RESULT vs DRIVER OVERRIDE ===

RESULT vs driver override: 9 PASSED / 3 SKIPPED (12 total). The 3 skips are the blind test's OWN documented GAPs (it.skip): S1 'attacked 20x' was-attacked trigger (no incoming-damage model), S2a taunt (no aggro primitive), heal AMOUNT 2.47% (no HP pool). EVERY substantive discrimination is GREEN vs the driver override (S1 defensive/no-damage; S2b self-scoped per-full-charge 1.8s; burst Max HP all-allies target-scaled; burst heal 10-tick HoT feeds crown consumer; cross-cutting Max-HP inertness). Adapted only to (a) re-point the harness import and (b) drop emptied blocks in one counterfactual that otherwise crashed the engine's chargeCounter dispatch — no assertion changed.

import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
controlComp,
runComp,
totals,
unitOf,
withPatchedOverride,
} from '../lib/harness.js';

/**

- noise (RL / Electric / Supporter / Burst I) — BLIND kit-spec test.
- Written from the kit prose alone; the driver's override, tests and reasoning were not consulted.
-
- KIT TEXT (structural read):
- S1 trigger 'Activates when attacked 20 time(s)', target all allies:
-      Damage Taken ▼10.66% for 20 sec.
-      -> ALLY damage-reduction. v1 models no incoming damage and has no 'was attacked' trigger, so
-         the line is offensively INERT. The dangerous nearest-wrong is encoding it as the boss
-         debuff damageTakenPct (positive = boss takes MORE), which would gift the whole team a
-         free damage bucket off a purely defensive line.
- S2a trigger 'hitting a target with a Full Charge attack', target the enemy: Taunts for 2 sec.
-      -> aggro/threat; no engine primitive (stun is a different mechanic). GAP.
- S2b trigger 'attacking with Full Charge', target self: Max HP ▲24.86% for 1.8 sec.
-      -> SELF-scoped, fires on EVERY full charge (dozens of times over 180 s, not once per burst),
-         short 1.8 s window. noise carries no atkOfMaxHpPct conversion, so the grant is
-         damage-inert — but it is kept because Max HP is a real stat with future consumers.
- B target all allies: 'Constantly recovers 2.47% of the skill user's final Max HP every 1 sec
-      for 10 sec' + 'Max HP ▲49.5% for 10 sec'.
-      -> burstCast-keyed, allies INCLUDING self. The recovery line is a 10-TICK HoT
-         (ticks:10, intervalSec:1), not one instant heal: the tick count is what keeps a
-         teammate's on-recovery consumer refreshed. The Max HP line reads plain 'Max HP ▲ x%'
-         with NO 'of the skill user's', so it is TARGET-scaled (targetMaxHpPct -> per-target flat
-         HP), unlike the heal line which IS caster-scaled.
-
- FIXTURE: controlComp('noise', true) — liter B1 / crown B2 / noise / helm B3, deterministic, no seed.
- - crown is the canonical 'when recovery takes effect' consumer, and is the ONLY reason the burst
- HoT is observable at all: there is no heal/recovery event kind on the event log.
- - CAVEAT: noise is a Burst I sharing stage 1 with liter (cd 20 s vs her 40 s). If the rotation
- never hands noise a cast, the burst-slot assertions fail on their precondition expect() with
- that message — that is a fixture limit to re-fixture around, not a kit divergence.
-
- METHOD: every claim is proven by a COUNTERFACTUAL DIFF instead of slot-index bookkeeping. Each
- patched run differs from the base run in exactly one authored detail, and because Max HP is
- damage-inert for a unit with no HP->ATK conversion, every other event in the two runs is
- identical. The multiset difference of maxHpFlat buffApply events therefore IS the grant under
- test, with zero attribution guesswork (caster-scaled and target-scaled stats both re-emit as
- flat maxHpFlat, so the flat VALUE is what discriminates them).
  */

type Eff = {
kind: string;
stat?: string;
value?: number;
durationSec?: number;
ticks?: number;
intervalSec?: number;
};
type Blk = {
slot?: string;
trigger?: { kind: string };
target?: { kind: string; excludeSelf?: boolean };
effects?: Eff[];
};
type SlotName = 'skill1' | 'skill2' | 'burst';
type SlotLike = Blk[] | { blocks?: Blk[] } | undefined;
type OvView = Record<SlotName, SlotLike>;
type BuffEv = {
kind: string;
stat?: string;
key?: string;
value?: number;
casterIdx?: number | null;
targetIdx?: number | null;
targetSlug?: string;
expiresFrame?: number;
};

const SLOTS: SlotName[] = ['skill1', 'skill2', 'burst'];

// The override FILE is slot-keyed; a slot is either a bare Block[] or a CharacterSkills carrying
// its own blocks[]. Accept both so the patch helpers cannot silently no-op.
function blocksOf(ov: unknown, slot: SlotName): Blk[] {
const s = (ov as unknown as OvView)[slot];
if (!s) return [];
return Array.isArray(s) ? s : (s.blocks ?? []);
}

function isHpBuff(e: Eff): boolean {
return (
e.kind === 'buff' &&
['maxHpFlat', 'maxHpPct', 'targetMaxHpPct', 'casterMaxHpPct'].includes(
e.stat ?? '',
)
);
}

type Patch = (ov: unknown) => void;

function run(patch?: Patch) {
const opts = controlComp('noise', true);
if (patch) {
opts.overrides = {
...(opts.overrides ?? {}),
noise: withPatchedOverride('noise', (ov) => patch(ov)),
};
}
const raw: SimEvent[] = [];
opts.cfg = {
...(opts.cfg ?? {}),
onEvent: (e: SimEvent) => {
raw.push(e);
},
};
const res = runComp(opts);
const buffs = raw
.map((e) => e as unknown as BuffEv)
.filter((b) => b.kind === 'buffApply');
return { res, raw, buffs };
}
type Run = ReturnType<typeof run>;

function hpApplies(r: Run): BuffEv[] {
return r.buffs.filter((b) => b.stat === 'maxHpFlat');
}
function hpCounts(r: Run): Map<string, number> {
const m = new Map<string, number>();
for (const b of hpApplies(r)) {
const k = (b.targetSlug ?? '?') + '|' + Math.round(b.value ?? 0);
m.set(k, (m.get(k) ?? 0) + 1);
}
return m;
}
// events present in run A but not in run B == the grant that B's patch removed/rewrote
function grantsOnlyIn(
a: Run,
b: Run,
): { target: string; value: number; count: number }[] {
const bc = hpCounts(b);
const out: { target: string; value: number; count: number }[] = [];
for (const [k, n] of Array.from(hpCounts(a))) {
const d = n - (bc.get(k) ?? 0);
if (d > 0) {
const [target = '?', value = '0'] = k.split('|');
out.push({ target, value: Number(value), count: d });
}
}
return out;
}
function selfHpApplies(r: Run): number {
return hpApplies(r).filter((b) => b.targetSlug === 'noise').length;
}
function firstExpiry(r: Run, value: number): number {
const fs = hpApplies(r)
.filter(
(b) =>
b.targetSlug === 'noise' &&
Math.round(b.value ?? 0) === value &&
typeof b.expiresFrame === 'number',
)
.map((b) => b.expiresFrame as number);
return fs.length ? Math.min(...fs) : NaN;
}
function sumTotals(r: Run): number {
return Object.values(totals(r.res)).reduce((a, b) => a + b, 0);
}

// ---- hoisted runs (9 x 180 s sims) -------------------------------------------------------------
const base = run();
const noSkill1 = run((o) => {
for (const b of blocksOf(o, 'skill1')) b.effects = [];
});
const noSkill2Hp = run((o) => {
for (const b of blocksOf(o, 'skill2'))
b.effects = (b.effects ?? []).filter((e) => !isHpBuff(e));
});
const skill2BurstKeyed = run((o) => {
for (const b of blocksOf(o, 'skill2'))
if ((b.effects ?? []).some(isHpBuff)) b.trigger = { kind: 'burstCast' };
});
const skill2Long = run((o) => {
for (const b of blocksOf(o, 'skill2'))
for (const e of b.effects ?? []) if (isHpBuff(e)) e.durationSec = 18;
});
const noBurstHp = run((o) => {
for (const b of blocksOf(o, 'burst'))
b.effects = (b.effects ?? []).filter((e) => !isHpBuff(e));
});
const burstHpCasterScaled = run((o) => {
for (const b of blocksOf(o, 'burst'))
for (const e of b.effects ?? []) if (isHpBuff(e)) e.stat = 'casterMaxHpPct';
});
const hpValuesX10 = run((o) => {
for (const s of SLOTS)
for (const b of blocksOf(o, s))
for (const e of b.effects ?? [])
if (isHpBuff(e)) e.value = (e.value ?? 0) * 10;
});
const noHeal = run((o) => {
for (const b of blocksOf(o, 'burst'))
b.effects = (b.effects ?? []).filter((e) => e.kind !== 'heal');
});

const s2Grants = grantsOnlyIn(base, noSkill2Hp);
const burstGrants = grantsOnlyIn(base, noBurstHp);

describe('noise — skill 1 (Damage Taken ▼10.66%, all allies, on being attacked 20x)', () => {
it('is a DEFENSIVE ally line: it never becomes a boss damage-taken debuff and moves no damage', () => {
// Nearest-wrong: reading '▼ on allies' as damageTakenPct on the boss (positive = boss takes
// more). That model would light up a positive damageTakenPct apply that vanishes when S1 is
// emptied, and would move every unit's totals. Boss-held debuffs carry casterIdx/targetIdx null,
// so they are filtered by stat+sign, and teammates' own real debuffs cancel in the comparison.
const posDt = (r: Run) =>
r.buffs.filter((b) => b.stat === 'damageTakenPct' && (b.value ?? 0) > 0)
.length;
expect(posDt(base)).toBe(posDt(noSkill1));
expect(totals(noSkill1.res)).toEqual(totals(base.res));
expect(unitOf(noSkill1.res, 'noise').totalDamage).toBe(
unitOf(base.res, 'noise').totalDamage,
);
});

it.skip('trigger \u0027Activates when attacked 20 time(s)\u0027 — GAP: v1 has no incoming-damage model and no was-attacked trigger primitive', () => {});
});

describe('noise — skill 2', () => {
it('S2b Max HP ▲24.86% is SELF-scoped and never leaks onto an ally', () => {
expect(
s2Grants.length,
'S2 self Max HP grant is not observable — the line looks unmodeled',
).toBeGreaterThan(0);
// Nearest-wrong: target allies (the S1/burst lines are ally-scoped, so mis-copying the target
// set is the live risk). Under that model the diff carries teammate slugs too.
expect(Array.from(new Set(s2Grants.map((g) => g.target)))).toEqual([
'noise',
]);
});

it('S2b fires per FULL CHARGE, not once per burst cast', () => {
const applies = s2Grants.reduce((n, g) => n + g.count, 0);
// noise is a 6-round RL with a 60-frame charge: a full-charge-keyed grant re-applies dozens of
// times across a 180 s fight, while any burst-keyed model is bounded by her cast count (<= ~5).
expect(applies).toBeGreaterThanOrEqual(20);
expect(selfHpApplies(base) - selfHpApplies(skill2BurstKeyed)).toBeGreaterThanOrEqual(15);
});

it('S2b window is the short 1.8 s one, not a burst-length window', () => {
const v = s2Grants.length ? s2Grants[0]!.value : NaN;
// The grant is damage-inert, so patching only its durationSec leaves the apply FRAMES identical
// between the two runs — the whole delta lands in expiresFrame. Faithful 1.8 s -> the patched
// 18 s run expires (18 - 1.8) * 60 = 972 frames later; a 10 s model would show only 480.
const d = firstExpiry(skill2Long, v) - firstExpiry(base, v);
expect(d).toBeGreaterThan(942);
expect(d).toBeLessThan(1002);
});

it.skip('S2a \u0027Taunts for 2 sec\u0027 — GAP: no aggro/threat primitive (stun is a different mechanic and the boss is untargetable in v1)', () => {});
});

describe('noise — burst (all allies: 10-tick HoT + Max HP ▲49.5% for 10 sec)', () => {
it('Max HP ▲49.5% reaches ALL allies including self', () => {
expect(
burstGrants.length,
'noise (Burst I) never cast her burst in this fixture, or the burst Max HP line is unmodeled — re-fixture so stage 1 is hers before reading this as a divergence',
).toBeGreaterThan(0);
const targets = new Set(burstGrants.map((g) => g.target));
// Nearest-wrong: allies with excludeSelf, or a self-only grant. Self-inclusion is unconfounded
// here because S2b's grant carries a different flat value and cancels out of this diff.
expect(targets.size).toBeGreaterThanOrEqual(3);
expect(targets.has('noise')).toBe(true);
});

it('Max HP ▲49.5% is TARGET-scaled, not caster-scaled', () => {
expect(burstGrants.length).toBeGreaterThan(0);
// The kit says plain 'Max HP ▲ 49.5%' (contrast the heal line, which spells out 'of the skill
// user's final Max HP'). targetMaxHpPct resolves to 49.5% of EACH ally's own Max HP, so the
// flat values differ across a mixed-class team; casterMaxHpPct hands every ally the SAME number.
expect(
new Set(burstGrants.map((g) => g.value)).size,
).toBeGreaterThanOrEqual(2);
const casterScaled = grantsOnlyIn(burstHpCasterScaled, noBurstHp);
expect(new Set(casterScaled.map((g) => g.value)).size).toBe(1);
});

it('the recovery line is a 10-tick HoT at 1 s intervals, targeted at allies', () => {
// Structural, because the engine emits no heal/recovery event kind — tick COUNT is only
// observable through a consumer, and the consumer set is comp-dependent. Nearest-wrong: a
// single instant heal (ticks default 1), which refreshes an on-recovery teammate once per
// burst instead of ten times.
const ov = withPatchedOverride('noise', () => {});
const healBlocks = blocksOf(ov, 'burst').filter((b) =>
(b.effects ?? []).some((e) => e.kind === 'heal'),
);
const healEffs = healBlocks.flatMap((b) =>
(b.effects ?? []).filter((e) => e.kind === 'heal'),
);
expect(
healEffs.length,
'the 10 s recovery line must be modeled as a heal effect — it drives teammates on-recovery triggers',
).toBeGreaterThan(0);
expect(
healEffs.reduce((n, e) => n + (e.ticks ?? 1), 0),
).toBeGreaterThanOrEqual(10);
for (const e of healEffs) expect(e.intervalSec ?? 1).toBe(1);
for (const b of healBlocks) expect(b.target?.kind).toBe('allies');
});

it('the HoT is NOT inert — it feeds a teammate on-recovery consumer', () => {
// TANDEM: a heal with no HP pool still has a damage footprint through crown's
// 'when recovery takes effect' trigger in the control comp. Removing it must change either the
// buff stream or team damage; identical signatures mean the heal was dropped (or the fixture
// carries no recovery consumer, which is itself worth surfacing).
const sig = (r: Run) => r.buffs.length + '|' + sumTotals(r).toFixed(2);
expect(sig(base)).not.toBe(sig(noHeal));
});

it.skip('heal AMOUNT (2.47% of the skill user\u0027s final Max HP per tick) — GAP: the heal effect models no HP quantity (no HP pool in v1)', () => {});
});

describe('noise — cross-cutting inertness', () => {
it('every Max HP grant is HP, not damage: scaling them 10x moves nothing', () => {
// noise carries no atkOfMaxHpPct conversion and ally-granted Max HP never feeds a teammate's,
// so a faithful model is damage-inert here. Under the nearest-wrong encodings (atkPct,
// casterAtkPct, atkOfMaxHpPct) a 10x value would visibly move the board.
expect(totals(hpValuesX10.res)).toEqual(totals(base.res));
});
});

=== SECTION 6 — S6 BLIND OVERRIDE (claude-opus-5, derived from prose alone) + DIFF vs DRIVER OVERRIDE ===

DIFF vs driver (src/skills/overrides/noise.json):

- burst: IDENTICAL (burstCast -> allies -> heal{ticks:10,intervalSec:1} + targetMaxHpPct 49.5/10s).
- skill2 self Max HP: SAME effect (targetMaxHpPct 24.86/1.8s, self); trigger shotFired (blind) vs chargeCounter:1 (driver) — EQUIVALENT for an always-full-charging RL (every RL rocket is charged=true); chargeCounter is the more semantically precise 'attacking with Full Charge' primitive.
- skill2 taunt: BOTH unmodeled.
- skill1 Damage Taken ▼: DIVERGENCE. Driver = skill1:[] fully UNMODELED (no primitive; damageTakenPct is the wrong-direction boss debuff; no incoming-damage model). Blind = an inert placeholder block hitCount:20(outgoing-hit proxy) -> allies -> defPct value:0 / 20s, explicitly flagged as a damage-inert mis-keyed auditable placeholder. BOTH avoid the sign-flip trap and move no damage. Judge: which is the more faithful encoding of an unmodelable defensive line — a clean documented UNMODELED gap (driver) or a zero-valued inert placeholder block that mis-keys the trigger (blind)?
- Max HP grants: BOTH agree offensively inert (e3 rule; no atkOfMaxHpPct on noise), encoded for kit-SSOT.

{
"slug": "noise",
"skill1": [
{
"slot": "skill1",
"trigger": {
"kind": "hitCount",
"count": 20
},
"target": {
"kind": "allies"
},
"effects": [
{
"kind": "buff",
"stat": "defPct",
"value": 0,
"durationSec": 20
}
]
}
],
"skill2": [
{
"slot": "skill2",
"trigger": {
"kind": "shotFired"
},
"target": {
"kind": "self"
},
"effects": [
{
"kind": "buff",
"stat": "targetMaxHpPct",
"value": 24.86,
"durationSec": 1.8
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
"kind": "allies"
},
"effects": [
{
"kind": "heal",
"ticks": 10,
"intervalSec": 1
},
{
"kind": "buff",
"stat": "targetMaxHpPct",
"value": 49.5,
"durationSec": 10
}
]
}
],
"unmodeled": {
"skill1": [
"Damage Taken ▼ 10.66% for 20 sec. (defensive — boss deals no damage in v1; the trigger/duration are kept as a zero-valued defPct buff so the block is auditable)"
],
"skill2": [
"Taunts for 2 sec. (aggro redirection — no HP pool / no boss damage modeled in v1)"
],
"burst": []
},
"caveats": [
"⚑ skill1 trigger: 'when attacked 20 time(s)' is an INCOMING-hit counter the sim has no channel for (the boss deals no damage). Encoded as hitCount:20 on the owner's OUTGOING hits as the nearest available primitive; its only effect is a zero-valued defensive buff, so the mis-keying is damage-inert. Do NOT reuse this shape for an offensive line.",
"⚑ skill2 full-charge trigger: encoded as shotFired because Noise is an RL with chargeFrames 60 — every trigger pull is a charge shot in the default model. If she ever fires uncharged (tap-fire), this OVER-fires. A charge-specific trigger primitive does not exist in the schema.",
"⚑ The Max HP grants (skill2 24.86% / burst 49.5%) are offensively INERT unless a teammate converts Max HP → ATK; ally-granted Max HP does not feed a teammate's atkOfMaxHpPct. Kept for kit completeness and for any future consumer.",
"⚑ burst heal magnitude (2.47% of caster final Max HP/sec) is NOT modeled as an HP amount — the heal effect only emits 10 recovery events so on-recovery consumers (e.g. Crown-style 'when recovery takes effect') fire correctly. That tandem channel is the burst's real offensive value.",
"⚑ cadence tuple: base stats give chargeFrames 60 / reloadFrames 141 / ammo 6 from the datamine; rate_of_fire and reloadFrames are known-unreliable fields. Unverified against footage."
],
"note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Noise is a pure-sustain RL/Electric/Supporter Burst I: her entire kit is Damage Taken ▼, a taunt, and Max HP + heal-over-time. She carries NO ATK, crit, core, element, charge, ammo, reload, fire-rate, gauge, or damage line — so on the v1 partless-immortal-boss scope-lock she contributes essentially zero direct damage and her only cross-unit channel is the burst's 10 recovery ticks feeding a teammate's on-recovery trigger. The skill1 Damage Taken ▼ is a SELF/ALLY defensive line (allies take less), NOT the offensive 'Damage Taken ▲' boss debuff — it must never be encoded as damageTakenPct, which would be a boss debuff and would over-credit the whole team.",
"hasPierce": false
}
=== SECTION 7 — DRIVER IMPLEMENTATION UNDER REVIEW ===

----- scripts/tests/units/noise.test.ts (driver test; 10/10 green) -----
// PER-UNIT KIT SPEC — `noise` (Noise, RL / Supporter / Electric, Burst I, cd 40s, ammo 6,
// chargeFrames 60, chargeMultiplier 250). Kit-autonomy gauntlet 2026-07-31 (Tier 2). Test-first
// re-derivation; the override under test is src/skills/overrides/noise.json (authored this gauntlet
// — Noise had NO prior override; she could not sim at all before this run).
//
// Noise is a DEFENSIVE healer-buffer: her OWN RL damage is her only damage output, and EVERY skill
// line is survivability / team-preservation — Damage-Taken reduction, a taunt, Max-HP grants, and a
// heal. NONE of them scale damage she deals: she has NO atkOfMaxHpPct conversion (so Max-HP grants
// move no damage), the sim models no incoming ally damage (so Damage-Taken ▼ and the taunt are out
// of domain), and the heal restores HP the sim never spends. Her faithful encoding therefore models
// the lines the engine HAS a primitive for (the heal's recovery cadence + the Max-HP grants as
// kit-SSOT maxHpFlat events, exactly like blanc/flora) and documents the primitive-less lines
// (Damage-Taken ▼, taunt) as ⚑ unmodeled gaps. Her board DPS == her bare RL weapon.
//
// Kit (blablalink prose, data/characters.json → characters.noise.skills; magnitudes = max level):
// S1 ■ when attacked 20×, all allies: Damage Taken ▼ 10.66% for 20 sec [N0 UNMODELED ⚑]
// S2 ■ hitting a target with a Full Charge attack, the target: Taunts for 2 sec [N0 UNMODELED ⚑]
// ■ attacking with Full Charge, self: Max HP ▲ 24.86% for 1.8 sec [N1] (inert maxHpFlat)
// BU ■ all allies: recovers 2.47% of caster final Max HP every 1s for 10 sec [N2] (recovery cadence)
// ■ all allies: Max HP ▲ 49.5% for 10 sec [N3] (inert maxHpFlat)
//
// UNMODELED (documented in the override's `unmodeled` + `caveats`, NO assertion — spec rule for
// inert/out-of-domain lines; there is nothing to assert against in a no-incoming-damage sim):
// N0a S1 Damage Taken ▼ 10.66% (allies, when attacked 20×) — the only `damageTakenPct` primitive
// is a BOSS debuff (positive = boss takes MORE), the wrong direction/target entirely; v1 models
// no incoming ally damage and no ally HP pool, so the "attacked 20×" trigger never fires and
// "allies take less damage" has no effect. ⚑ engine-core / out-of-domain.
// N0b S2 Taunt for 2 sec (the full-charge target) — aggro/targeting; the sim is single-target with
// no aggro model and no `taunt` primitive. ⚑ inert / out-of-domain.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
// N1 targetMaxHpPct (self Max-HP grant → engine maxHpFlat self-grant, INERT because Noise has no
// atkOfMaxHpPct) vs the nearest wrong model atkPct (a 24.86% ATK self-buff that WOULD raise her
// damage). Proven two ways: removing the line leaves every team total BYTE-IDENTICAL (inert),
// AND swapping the stat to atkPct MOVES Noise's own total (so the shipped encoding is provably
// the inert one, not a smuggled damage buff). Magnitude pinned to 24.86% of her final Max HP.
// N2 the burst heal is a RECOVERY CADENCE, not a number: with crown's own self-heal removed, crown's
// "when recovery takes effect" consumer stays refreshed across the FULL 10s after each Noise burst
// (≥8 firings spanning ≥8s) — the ticks:10 heal-over-time shape. A nearest-wrong ticks:1 instant
// heal collapses that to one firing per burst. (The 2.47% HP magnitude is not modeled — no HP
// pool — only the per-second recovery cadence is, which is what recovery consumers key off.)
// N3 targetMaxHpPct 49.5% → engine maxHpFlat to all allies, INERT (ally-granted Max HP does not feed
// a teammate's atkOfMaxHpPct, e3 video rule; and Noise has no conversion herself). Proven: removing
// it leaves every total BYTE-IDENTICAL; the level-1 value 27.22 produces a strictly smaller flat
// grant (so 49.5 is the live magnitude). Reaches all three allies per cast for exactly 10s.
//
// Fixture: noise (B1) / crown (B2) / ada (B3), boss Fire, focus ada. One caster per burst stage → a
// clean Full Burst chain (noise→crown→ada) so Noise actually casts her burst (~4× in 180s). crown is the
// canonical recovery consumer (crown.test.ts / helm.test.ts / flora.test.ts pattern); ada is a heal-less
// carry (0 heal blocks) so crown's recovery consumer is driven ONLY by Noise once crown's own Relax
// self-heal is patched out. Deterministic (no seed); assertions read the event log + per-unit totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
runComp,
totals,
unitOf,
withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
const FIGHT_FRAMES = 180 * FPS;
const SLUGS = ['noise', 'crown', 'ada'] as const;
const NOISE = 0;
const CROWN = 1;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(overrides: Record<string, any> = {}) {
const events: SimEvent[] = [];
const res = runComp({
slugs: [...SLUGS],
bossElement: 'Fire',
focusSlug: 'ada',
overrides,
cfg: { onEvent: (e) => events.push(e) },
});
return { events, totals: totals(res), res };
}

// ---- counterfactual / isolation patches -------------------------------------------------------
const hasStat = (b: any, stat: string) =>
b.effects.some((e: any) => e.stat === stat);
const hasHeal = (b: any) => b.effects.some((e: any) => e.kind === 'heal');

/** N1 reference: Noise's S2 self Max-HP block removed entirely. _/
const noiseNoS2MaxHp = withPatchedOverride('noise', (ov) => {
const before = ov.skill2.length;
ov.skill2 = ov.skill2.filter((b: any) => !hasStat(b, 'targetMaxHpPct'));
if (ov.skill2.length === before) {
throw new Error('noise S2 targetMaxHpPct block missing — fixture is stale');
}
});
/_* N1 counterfactual: the same line as a GENERIC atkPct self-buff (would raise her damage). _/
const noiseS2Atk = withPatchedOverride('noise', (ov) => {
const e = ov.skill2
.flatMap((b: any) => b.effects)
.find((x: any) => x.stat === 'targetMaxHpPct');
if (!e) {
throw new Error('noise S2 targetMaxHpPct effect missing — fixture is stale');
}
e.stat = 'atkPct';
});
/_* N3 reference: Noise's burst Max-HP line removed (heal kept). _/
const noiseNoBurstMaxHp = withPatchedOverride('noise', (ov) => {
for (const b of ov.burst) {
const before = b.effects.length;
b.effects = b.effects.filter((e: any) => e.stat !== 'targetMaxHpPct');
if (b.effects.length !== before) {
return;
}
}
throw new Error('noise burst targetMaxHpPct effect missing — fixture is stale');
});
/_* N3 counterfactual: level-1 value 27.22 instead of 49.5. _/
const noiseBurstMaxHpWrong = withPatchedOverride('noise', (ov) => {
const e = ov.burst
.flatMap((b: any) => b.effects)
.find((x: any) => x.stat === 'targetMaxHpPct');
if (!e) {
throw new Error('noise burst targetMaxHpPct effect missing — fixture is stale');
}
e.value = 27.22;
});
/_* N2 counterfactual: the burst heal as a single instant event (ticks:1) instead of a 10s HoT. _/
const noiseBurstHealInstant = withPatchedOverride('noise', (ov) => {
const e = ov.burst
.flatMap((b: any) => b.effects)
.find((x: any) => x.kind === 'heal');
if (!e) {
throw new Error('noise burst heal effect missing — fixture is stale');
}
e.ticks = 1;
});
/_* N2 isolation: remove crown's OWN Relax self-heal so Noise's burst heal is the only recovery

- source (mirrors flora's crownNoSelfHeal / helm's crownNoHeal). */
  const crownNoSelfHeal = withPatchedOverride('crown', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasHeal(b));
  if (ov.skill2.length === before) {
  throw new Error('crown S2 self-heal block missing — fixture is stale');
  }
  });

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noS2MaxHp = run({ noise: noiseNoS2MaxHp });
const s2Atk = run({ noise: noiseS2Atk });
const noBurstMaxHp = run({ noise: noiseNoBurstMaxHp });
const burstMaxHpWrong = run({ noise: noiseBurstMaxHpWrong });
const isoBurstHeal = run({ crown: crownNoSelfHeal });
const burstHealInstant = run({
noise: noiseBurstHealInstant,
crown: crownNoSelfHeal,
});

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const noiseBursts = (evs: SimEvent[]) =>
evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'noise');
const noiseShots = (evs: SimEvent[]) =>
evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'noise');
/** Frames crown's recovery consumer fired (+20.99% Attack Damage), deduped per frame. */
const crownRecoveryFrames = (evs: SimEvent[]): number[] =>
[
...new Set(
buffs(evs)
.filter(
(b) =>
b.casterIdx === CROWN &&
b.stat === 'attackDamagePct' &&
Math.abs(b.value - 20.99) < 0.01
)
.map((b) => b.frame)
),
].sort((a, b) => a - b);

const noiseMaxHp = unitOf(base.res, 'noise').maxHp;

describe('noise — kit spec', () => {
describe('N1 — S2 self Max HP ▲ 24.86% on every full charge (inert maxHpFlat self-grant)', () => {
// Engine converts targetMaxHpPct → maxHpFlat (flat HP = 24.86% of Noise's own maxHp). The S2
// grant is a 1.8s SELF-buff (duration 108f); the burst Max-HP grant is a separate 10s (600f)
// line handled in N3, so filter on the 1.8s duration to isolate S2.
const applied = buffs(base.events).filter(
(b) =>
b.casterIdx === NOISE &&
b.stat === 'maxHpFlat' &&
b.targetIdx === NOISE &&
b.expiresFrame! - b.frame === Math.round(1.8 * FPS)
);

    it('fires once per full-charge rocket at 24.86% of her final Max HP', () => {
      const shots = noiseShots(base.events).length;
      expect(applied.length).toBeGreaterThan(0);
      expect(
        applied.length,
        `${applied.length} S2 grants vs ${shots} full-charge rockets`
      ).toBe(shots);
      const expected = (24.86 / 100) * noiseMaxHp;
      for (const b of applied) {
        expect(b.value).toBeCloseTo(expected, 3);
      }
    });

    it('is offensively INERT (no HP-scaling conversion → no team total changes)', () => {
      expect(base.totals).toEqual(noS2MaxHp.totals);
    });

    it('DISCRIMINATING: the nearest-wrong model (atkPct) WOULD move her damage', () => {
      // Proves the shipped line is the inert Max-HP grant, not a smuggled 24.86% ATK self-buff.
      expect(base.totals.noise).not.toBeCloseTo(s2Atk.totals.noise, 0);
    });

});

describe('N2 — burst heal keeps recovery consumers refreshed across the full 10s (ticks:10 HoT)', () => {
// Isolated: crown's own Relax self-heal removed, so Noise's burst heal is the ONLY recovery source.
// Only casts whose FULL 10s window fits inside the 180s fight are measurable (a property of the
// fixture, not the kit — the last cast's window is truncated by fight end).
const casts = noiseBursts(isoBurstHeal.events).filter(
(c) => c.frame + 10 * FPS <= FIGHT_FRAMES
);
const frames = crownRecoveryFrames(isoBurstHeal.events);

    it('has Noise bursts with a complete window to measure', () => {
      expect(
        casts.length,
        'no Noise burst has a full 10s window inside the fight'
      ).toBeGreaterThan(0);
    });

    it("fires crown's consumer across the whole 10s after each cast (not a single instant)", () => {
      for (const cast of casts) {
        const inWindow = frames.filter(
          (f) => f >= cast.frame && f <= cast.frame + 10 * FPS
        );
        const spanSec = inWindow.length
          ? (inWindow[inWindow.length - 1] - cast.frame) / FPS
          : 0;
        expect(
          inWindow.length,
          `burst at ${cast.sec.toFixed(2)}s produced ${inWindow.length} recovery firing(s) ` +
            `spanning ${spanSec.toFixed(1)}s — a single instant heal produces exactly 1 at 0.0s`
        ).toBeGreaterThanOrEqual(8);
        expect(
          spanSec,
          'the window must reach ~10s, not collapse to the cast frame'
        ).toBeGreaterThanOrEqual(8);
      }
    });

    it('DISCRIMINATING: a ticks:1 instant heal collapses the cadence to ~1 firing per burst', () => {
      const instantFrames = crownRecoveryFrames(burstHealInstant.events);
      const instantInWindow = casts.reduce(
        (n, cast) =>
          n +
          instantFrames.filter(
            (f) => f >= cast.frame && f <= cast.frame + 10 * FPS
          ).length,
        0
      );
      const faithfulInWindow = casts.reduce(
        (n, cast) =>
          n +
          frames.filter(
            (f) => f >= cast.frame && f <= cast.frame + 10 * FPS
          ).length,
        0
      );
      expect(
        faithfulInWindow,
        `${faithfulInWindow} faithful firings vs ${instantInWindow} instant — the HoT must ` +
          'produce far more recovery events than a single instant heal'
      ).toBeGreaterThan(instantInWindow * 3);
    });

});

describe('N3 — burst Max HP ▲ 49.5% to all allies for 10s (inert maxHpFlat)', () => {
// Engine converts targetMaxHpPct → maxHpFlat (flat HP = 49.5% of EACH target's own maxHp). The
// burst grant is the 10s (600f) line; the S2 self-grant is 1.8s (108f, handled in N1).
const applied = buffs(base.events).filter(
(b) =>
b.casterIdx === NOISE &&
b.stat === 'maxHpFlat' &&
b.expiresFrame! - b.frame === 10 * FPS
);

    it('reaches all three allies per burst cast for exactly 10 sec', () => {
      const casts = noiseBursts(base.events).length;
      expect(casts).toBeGreaterThan(0);
      expect(applied.length).toBe(casts * 3);
      const perFrame = new Map<number, Set<number | null>>();
      for (const b of applied) {
        (
          perFrame.get(b.frame) ??
          perFrame.set(b.frame, new Set()).get(b.frame)!
        ).add(b.targetIdx);
      }
      for (const [frame, holders] of perFrame) {
        expect(
          holders.size,
          `frame ${frame} reached ${holders.size} allies, expected 3`
        ).toBe(3);
      }
    });

    it('is 49.5% of each target’s own final Max HP', () => {
      const crownMaxHp = unitOf(base.res, 'crown').maxHp;
      const adaMaxHp = unitOf(base.res, 'ada').maxHp;
      const byTarget: Record<number, number> = {};
      for (const b of applied) {
        byTarget[b.targetIdx!] = b.value;
      }
      expect(byTarget[NOISE]).toBeCloseTo((49.5 / 100) * noiseMaxHp, 3);
      expect(byTarget[CROWN]).toBeCloseTo((49.5 / 100) * crownMaxHp, 3);
      expect(byTarget[2]).toBeCloseTo((49.5 / 100) * adaMaxHp, 3);
    });

    it('is offensively INERT (ally-granted Max HP feeds no conversion → no total changes)', () => {
      expect(base.totals).toEqual(noBurstMaxHp.totals);
    });

    it('DISCRIMINATING: level-1 value 27.22 produces a strictly smaller flat grant', () => {
      const wrong = buffs(burstMaxHpWrong.events).filter(
        (b) =>
          b.casterIdx === NOISE &&
          b.stat === 'maxHpFlat' &&
          b.expiresFrame! - b.frame === 10 * FPS
      );
      expect(wrong.length).toBeGreaterThan(0);
      expect(wrong[0].value).toBeLessThan(applied[0].value);
    });

});
});

----- src/skills/overrides/noise.json (driver override) -----
{
"note": "Kit-autonomy gauntlet 2026-07-31 (Tier 2). Noise (`noise`, RL / Supporter / Electric / Burst I, cd 40s, ammo 6, chargeFrames 60, chargeMultiplier 250): a DEFENSIVE healer-buffer whose OWN RL damage is her only damage output and whose EVERY skill line is survivability / team-preservation — Damage-Taken reduction, a taunt, Max-HP grants, and a heal. She had NO prior override (could not sim at all before this run). HP-SCALING DETERMINATION: NOT an HP-scaling kit — every Max-HP reference is a survival buff (S2 self Max HP ▲24.86% / 1.8s; burst team Max HP ▲49.5% / 10s), never an HP→ATK conversion, so no atkOfMaxHpPct scaler exists and BOTH Max-HP grants are offensively INERT (they move no damage); they are encoded anyway for kit-SSOT completeness + future recovery/HP consumers (blanc/flora precedent), as maxHpFlat events the engine converts from targetMaxHpPct. MODELED: (skill2) 'activates when attacking with Full Charge → self Max HP ▲24.86% for 1.8s' → chargeCounter:1 (every RL rocket is a full-charge shot, sim.ts charged=true) → self → targetMaxHpPct 24.86 / 1.8s (engine → maxHpFlat self-grant; inert — no conversion); (burst) 'recovers 2.47% of caster final Max HP every 1s for 10s' → burstCast → allies → heal{ticks:10, intervalSec:1} (the per-second RECOVERY CADENCE is modeled — what recovery-consumer teammates key off — not the 2.47% HP magnitude, v1 has no HP pool); (burst) 'Max HP ▲49.5% for 10s' (all allies) → burstCast → allies → targetMaxHpPct 49.5 / 10s (engine → per-target maxHpFlat = 49.5% of EACH target's own Max HP; inert — ally-granted Max HP does not feed a teammate's atkOfMaxHpPct, e3 video rule). TRIGGER: burst lines key to burstCast (stage I, fires only on rotations Noise herself casts), NOT fullBurstEnter — keying to FB entry would over-fire on rotations where a competing B1 takes the slot. UNMODELED (verbatim lines in `unmodeled`, each with a structured caveat below): S1 'Damage Taken ▼10.66% / 20s when attacked 20×' (allies) and S2 'Taunts for 2s' (the full-charge target) — both primitive-less survivability/aggro lines the no-incoming-damage v1 sim cannot represent. CONSEQUENCE: the sim represents Noise's full kit-SSOT surface (heal cadence + Max-HP grants as events) but her board DPS == her bare RL weapon; her real team value (damage mitigation, taunt, the HP pool her heals/Max-HP feed) is out-of-domain until an HP pool + incoming-damage model exists. PINNED end-to-end by scripts/tests/units/noise.test.ts (N1 S2 self maxHpFlat inert + atkPct counterfactual moves her damage; N2 burst heal ticks:10 keeps crown's recovery consumer refreshed across the full 10s vs a ticks:1 instant; N3 burst maxHpFlat 49.5 reaches all three allies per-target inert + level-1 27.22 smaller). Cross-family: S2b claude-fable-5 converged on all 5 lines.",
"unmodeled": {
"skill1": [
"■ Activates when attacked 20 time(s). Affects all allies. Damage Taken ▼ 10.66% for 20 sec. — ally received-damage mitigation; v1 models no incoming ally damage and no ally HP pool, so the 'attacked 20×' trigger never accrues and 'allies take less damage' has no effect. The only damageTakenPct primitive is a BOSS debuff (positive = boss takes MORE) — the wrong direction/target, so it is NOT used (encoding it would manufacture a phantom team damage gain). ⚑ engine-core / out-of-domain (see caveats)."
],
"skill2": [
"■ Activates when hitting a target with a Full Charge attack. Affects the target. Taunts for 2 sec. — aggro/targeting control; the sim is single-target with a fixed boss script and no taunt/aggro primitive, so hit location never changes damage. ⚑ inert / out-of-domain (see caveats)."
],
"burst": []
},
"caveats": [
"skill1 (Damage Taken ▼) ⚑ engine-core / out-of-domain: 'when attacked 20× → all allies Damage Taken ▼10.66% for 20s'. ESTIMATE: in a real fight this is a meaningful team survivability buff (≈10.66% less damage taken for 20s once the 20-hit counter accrues), but it scales only damage RECEIVED, which the v1 sim does not model — damage-neutral here. RECIPE: add an engine ally-HP-pool + incoming-boss-damage model and an 'allies take ▼X% damage' received-damage stat (distinct from the boss-facing damageTakenPct debuff), then encode S1 on an on-being-attacked hitCount:20 trigger to allies. TIER: engine-core (new primitive), out-of-domain for the no-incoming-damage v1 sim — same precedent as flora's HP-gated S2 and liter's cover-HP NO-OP.",
"skill2 (Taunt) ⚑ inert / out-of-domain: 'hitting a target with a Full Charge → Taunts for 2s'. ESTIMATE: damage-neutral — taunt redirects enemy aggro, which a single-target sim with a fixed boss script never exercises. RECIPE: none for DPS (would need a multi-target/aggro model). TIER: inert / out-of-domain.",
"skill2/burst Max-HP grants are encoded for kit-SSOT completeness but are OFFENSIVELY INERT: Noise has no atkOfMaxHpPct conversion, so the S2 self grant (casterIdx===self) feeds no HP-scaling, and the burst team grant lands on allies (casterIdx≠target) which the e3 video rule excludes from feeding a teammate's conversion anyway. Both emit maxHpFlat buffApply events (queryable, future HP-consumer ready) and move no team total — pinned by the strip-diff inertia assertions in noise.test.ts (N1/N3).",
"burst heal: the HP MAGNITUDE (2.47% of caster final Max HP per tick) is not modeled (no HP pool) — only the per-second recovery EVENT cadence (ticks:10 over 10s) is, which is what recovery-consumer teammates (crown-type) key off. The heal-over-time emits its first recovery event immediately, then 9 more at 1s intervals (≈10 events spanning ~9s per cast)."
],
"skill1": [],
"skill2": [
{
"slot": "skill2",
"trigger": { "kind": "chargeCounter", "count": 1 },
"target": { "kind": "self" },
"effects": [
{
"kind": "buff",
"stat": "targetMaxHpPct",
"value": 24.86,
"durationSec": 1.8
}
]
}
],
"burst": [
{
"slot": "burst",
"trigger": { "kind": "burstCast" },
"target": { "kind": "allies" },
"effects": [
{ "kind": "heal", "ticks": 10, "intervalSec": 1 },
{
"kind": "buff",
"stat": "targetMaxHpPct",
"value": 49.5,
"durationSec": 10
}
]
}
]
}
