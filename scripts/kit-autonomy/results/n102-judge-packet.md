# S7 RECONCILING-JUDGE PACKET — n102 (N102)

You are the binding reconciling judge for the kit-autonomy gauntlet on `n102`. Read the contract below, then rule on the driver's implementation faithfulness. Return the verdict JSON exactly as the contract specifies.

====================================================================
## (1) CONTRACT + RETURN JSON SHAPE
====================================================================
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

====================================================================
## (2) MECHANICS SOURCE-OF-TRUTH (damage formula + game mechanics)
====================================================================
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

====================================================================
## (3) GROUND TRUTH — n102 kit prose + base stats (data/characters.json)
====================================================================
name: N102
weapon: RL | class: Supporter | element: Water | burst: I | burstCooldownSec: 20
ammo: 6 | chargeFrames: 90 | reloadFrames: 141 | chargeMultiplier: 350 | hitsPerShot: 1
baseStats.atk: 450 | hp: 11500 | def: 88 | critRate: 15 | critDamage: 150
skillCooldownsSec: {"skill1":null,"skill2":15,"burst":20}

SKILL PROSE:
skill1: ■ Activates when performing a Full Charge attack. Affects the 1 ally unit(s) with the highest final ATK. 
Max Ammunition Capacity ▲ 3 for 10 sec. 
Critical Damage ▲ 10.34% for 10 sec.

skill2: ■ Affects 1 ally unit(s) with the highest final ATK. 
Charge Damage ▲ 25.84% for 5 sec.

burst: ■ Affects all allies.
ATK ▲ 25.86% for 10 sec.

====================================================================
## (4) S2b CROSS-FAMILY TEST REVIEW (claude-fable-5)
====================================================================
{
  "slug": "n102",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "Max Ammunition Capacity ▲ 3 for 10 sec",
      "disposition": "FAITHFUL",
      "scope": "Weapon-state modifier (ammo capacity), not a damage stat — but it IS damage (taxonomy #6): +3 on a 6-round magazine = 50% fewer reloads for the holder, more shots fired. FLAT rounds ('▲ 3', no %) → maxAmmoFlat, not maxAmmoPct.",
      "durationSemantics": "durationSec 10 (wall-clock 'for 10 sec'); refreshed on each of n102's full-charge shots (~every 2–2.5s given chargeFrames 90 + release latency + RL cycle), so effectively continuous uptime on the target after the first shot — but encoded as a refreshing 10s buff, NOT permanent.",
      "triggerIdentity": "Owner-side trigger: 'Activates when performing a Full Charge attack' — fires on n102's own full-charge shot (shotFired for an always-full-charging RL; a fullCharge-scoped per-shot trigger). NOT passive, NOT lastBullet, NOT interval.",
      "targetSet": "alliesTopAtk {count:1, byFinalAtk:true} — kit literally says 'highest final ATK', so live effectiveAtk ranking, self included in the pool (no 'except self' clause). In a control fixture the Attacker-class carry (118,027 static) wins.",
      "nearestWrongModel": "maxAmmoPct 3 (percent misread — 3% of 6 rounds ≈ +0 rounds, silently inert) and/or trigger read as passive/always-on from t=0, and/or static-ATK ranking (byFinalAtk omitted).",
      "distinguishingAssertion": "buffApply events with stat 'maxAmmoFlat', value 3, targetSlug === carry, first emitted only AFTER n102's first shot event (frame > 0, red under passive-at-t0); A/B via withPatchedOverride removing the effect → carry's reload-event count rises and carry totalDamage drops (red if encoded as maxAmmoPct 3, which moves neither).",
      "inertness": "No buffApply targeting n102 herself or the three non-top-ATK allies; n102's own reload count and damage unmoved by this line.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Critical Damage ▲ 10.34% for 10 sec",
      "disposition": "FAITHFUL",
      "scope": "Generic Critical Damage (no 'of normal attacks' scoping clause) → unscoped critDamagePct; applies to all the target's crit-eligible hits.",
      "durationSemantics": "durationSec 10, refreshed per full-charge shot — same near-continuous uptime as the ammo line.",
      "triggerIdentity": "Same block as the ammo line: n102's own full-charge attack.",
      "targetSet": "Same alliesTopAtk {count:1, byFinalAtk:true}.",
      "nearestWrongModel": "critRatePct 10.34 (rate/damage confusion — changes crit FREQUENCY instead of crit magnitude), or targeting self instead of the top-ATK ally.",
      "distinguishingAssertion": "buffApply with stat 'critDamagePct' (NOT 'critRatePct'), value 10.34, targetSlug === carry; damage events for the carry show unchanged crit RATE between patched/unpatched runs while crit-portion damage scales.",
      "inertness": "Carry's crit rate unmoved; n102's own damage unmoved by this line.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Charge Damage ▲ 25.84% for 5 sec",
      "disposition": "FAITHFUL",
      "scope": "Charge bucket ONLY — chargeDamagePct (additive percentage points in the charge bucket), NOT attackDamagePct and NOT chargeDamageMultPct. Fully inert on a target with no charge damage.",
      "durationSemantics": "durationSec 5 — critically SHORTER than any plausible skill cooldown, so this is a PARTIAL-UPTIME pulse (~5/CD duty cycle), never always-on.",
      "triggerIdentity": "The ■ header has NO activation clause ('Affects…' only) → interval trigger on the datamined skill cooldown, first fire at t=CD (no force-cast wording → not t=0). ⚑ the interval seconds are NOT in the kit text — must come from datamined skillCooldownsSec, flagged if absent.",
      "targetSet": "alliesTopAtk {count:1, byFinalAtk:true} — same 'highest final ATK' literal.",
      "nearestWrongModel": "Passive/always-on encoding (the highest-damage misread: 100% uptime instead of ~5/CD ≈ 25–50%, over-crediting the carry's charge bucket by 2–4×); second-nearest: attackDamagePct (leaks into non-charge damage).",
      "distinguishingAssertion": "buffApply events with stat 'chargeDamagePct' value 25.84 recur with consecutive apply-frame spacing ≈ CD×60 (multiple applies over 180s, count ≈ 180/CD), each with expiresFrame ≈ applyFrame + 300; red under passive (single t=0 apply, no recurrence). Plus: patching the effect out moves ONLY the target's charge-bucket damage, not normal/skill buckets.",
      "inertness": "Non-charge buckets of the target unmoved; zero effect if the top-final-ATK ally is a non-charge weapon; no self-application in a fixture where n102 is not the ATK leader.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "ATK ▲ 25.86% for 10 sec (all allies)",
      "disposition": "FAITHFUL",
      "scope": "Generic ATK — atkPct scaling each TARGET'S OWN ATK (plain 'ATK ▲ x%'), NOT casterAtkPct (n102 is a Supporter with low static ATK; a caster-scaled flat add would materially under-credit the Attacker carry).",
      "durationSemantics": "durationSec 10 — covers the full-burst window since the cast lands pre-FB (gauge-full→…→22f→FB chain).",
      "triggerIdentity": "burstCast — fires ONLY on rotations n102 herself casts Burst I (cd 20s). NOT fullBurstEnter: with another B1 in the team (the fixture's liter), the two diverge on every rotation the other B1 takes.",
      "targetSet": "allies, all-including-self ('Affects all allies', no except-self clause) — expect 5 buffApply events per cast.",
      "nearestWrongModel": "fullBurstEnter keying — the buff fires on EVERY team Full Burst including rotations liter cast B1, over-crediting the whole team; or casterAtkPct (flat ≈ 0.2586 × 98,367 ≈ 25,438 emitted under 'casterAtkPct' instead of raw 25.86 under 'atkPct').",
      "distinguishingAssertion": "Count of buffApply groups with stat 'atkPct' value 25.86 (raw percentage, 5 targets each) === count of burstCast events with n102's srcSlot, and each apply frame precedes the next fullBurstStart frame; red under fullBurstEnter (apply count === fullBurstStart count > n102's cast count when liter shares B1 duty, applies at/after FB start).",
      "inertness": "Rotations where liter (or any other unit) casts B1: zero atkPct applies from n102; stat emitted is 'atkPct' with raw 25.86, never a flat-resolved casterAtkPct number.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:maxAmmoFlat+3-fullcharge",
    "skill1:critDamagePct+10.34-fullcharge",
    "skill2:chargeDamagePct+25.84-interval",
    "burst:atkPct+25.86-burstCast-allAllies"
  ],
  "unmodeledVerbatim": {
    "skill1": [],
    "skill2": [],
    "burst": []
  },
  "notes": "FIXTURE HAZARD: n102 is Burst I, and controlComp() hard-slots liter into B1 — adding n102 creates a B1 contention where first-ready in-window selection decides who casts each rotation. Tests MUST verify n102 actually casts (assert ≥1 burstCast with her srcSlot) before asserting downstream buff counts, and the burstCast-vs-fullBurstEnter distinguisher only has teeth in exactly this two-B1 fixture — do not 'fix' the contention by removing liter, that removes the discriminating comp. Expected shared-prior misreads to check hardest: (1) skill2 encoded passive/always-on — the 5s-duration-with-no-activation-clause shape is the classic interval trap and the largest damage inflator here; (2) skill1's 'Max Ammunition Capacity ▲ 3' skipped as utility or encoded as maxAmmoPct — it is a flat +3 rounds on the ally and IS damage via shot economy; (3) burst keyed to fullBurstEnter; (4) 'highest final ATK' encoded with static ranking (byFinalAtk omitted) — the kit says FINAL, which is the owner-ruled literal trigger for byFinalAtk:true on all three targeted blocks; (5) skill1 trigger encoded passive-from-t0 instead of first-full-charge-shot onward. ⚑ open cadence: skill2's interval seconds are outside the kit text (datamined skillCooldownsSec needed; first fire t=CD per convention). All four magnitudes are kit-literal → DATAMINED; no line is UNMODELED — every primitive needed (maxAmmoFlat, critDamagePct, chargeDamagePct, atkPct, alliesTopAtk byFinalAtk, burstCast, interval) exists in the schema.",
  "model": "claude-fable-5"
}

====================================================================
## (5) S5 BLIND TEST (claude-opus-5, prose-only) + RESULT vs DRIVER OVERRIDE
====================================================================
RESULT: run GREEN against the driver override on disk — 18 passed / 4 skipped (22 total).
The 4 skips are the blind author's honest measurement-gated flags: (a) byFinalAtk live-vs-static
ranking unobservable in this comp; (b) Full-Charge vs shotFired identical on a charge weapon;
(c) skill2 trigger cadence outside the prose input domain; (d) skill1 10s duration ~100% uptime.

/**
 * n102 - N102 (RL / Water / Supporter / Burst I) - BLIND kit-spec test.
 * Written from the kit prose ALONE; this author never saw the shipped override, its tests,
 * or any driver reasoning.
 *
 * KIT (structure + short quotes):
 *   skill1  header carries an activation clause (Full Charge attack) + Affects the 1 ally
 *           unit(s) with the highest final ATK.
 *             - Max Ammunition Capacity 3 for 10 sec
 *             - Critical Damage 10.34% for 10 sec
 *   skill2  header carries NO activation clause + Affects 1 ally unit(s) with the highest
 *           final ATK.
 *             - Charge Damage 25.84% for 5 sec
 *   burst   header: Affects all allies.
 *             - ATK 25.86% for 10 sec
 *
 * FIXTURE: controlComp('n102', true) - liter (B1) / crown (B2) / n102 (carry slot, focus) /
 * helm (fixed B3, SR + Water). n102 is a Burst I unit, so she SHARES burst stage 1 with liter;
 * with ~20 s burst cooldowns against a ~13-15 s rotation cycle the two B1 units alternate, so
 * n102 does cast several times across 180 s. That is ASSERTED (group F non-vacuity) rather than
 * assumed - a zero-cast result is a fixture block, not an override defect.
 *
 * WHY THE TARGETING TESTS DISCRIMINATE: class static ATK at the scope-lock preset is
 * Attacker 118,027 > Supporter 98,367 > Defender 78,707, so 1 ally with the highest final ATK
 * must resolve to an ally OTHER than n102 (a Supporter). A self-scoped or allies-scoped
 * mis-encoding therefore shows up directly in the buffApply target set, and the single-target
 * scope is proved by the teammates-byte-identical inertness assertions.
 *
 * FLAGGED (outside the input domain - it.skip, never guessed):
 *   - skill2 has no activation clause and the packet supplies no skill cooldown, so its trigger
 *     identity and cadence are invented by whoever models it. Structure (stat / magnitude /
 *     single target / bounded window / re-fires) is asserted; the period is measurement-gated.
 *   - highest FINAL ATK (live) vs static ATK ranking is not discriminable in this comp - both
 *     rank the same Attacker first.
 *   - The base weapon is a charge weapon (chargeFrames 90), so every modeled shot IS a full
 *     charge; a Full Charge trigger and a shot-fired trigger are observationally identical here.
 *   - skill1 re-fires roughly every 1.5-2 s, so its 10 sec window sits at ~100% uptime and the
 *     exact duration is not observable in totals. Only boundedness is asserted.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js'; // path fixed by driver (gauntlet S5): blind/ sits under kit-autonomy/, not tests/units/

const SLUG = 'n102';
const FIGHT_FRAMES = 180 * 60;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type Slot = 'skill1' | 'skill2' | 'burst';
const ALL_SLOTS: Slot[] = ['skill1', 'skill2', 'burst'];

interface EffectLike {
  kind?: string;
  stat?: string;
  value?: number;
  durationSec?: number;
}
interface BlockLike {
  trigger?: unknown;
  target?: unknown;
  effects?: EffectLike[];
}

// The override FILE is slot-keyed; a slot is either Block[] or { blocks: Block[] } depending on
// which shape the loader hands back. Read both so a counterfactual is never a silent no-op.
function slotBlocks(ov: unknown, slot: Slot): BlockLike[] {
  const raw = (ov as Record<string, unknown>)[slot];
  if (Array.isArray(raw)) return raw as BlockLike[];
  if (raw && typeof raw === 'object') {
    const inner = (raw as { blocks?: unknown }).blocks;
    if (Array.isArray(inner)) return inner as BlockLike[];
  }
  return [];
}

function stripStat(ov: unknown, re: RegExp, only?: Slot): void {
  for (const slot of only ? [only] : ALL_SLOTS) {
    for (const b of slotBlocks(ov, slot)) {
      if (!Array.isArray(b.effects)) continue;
      b.effects = b.effects.filter(
        (e) => !(typeof e.stat === 'string' && re.test(e.stat)),
      );
    }
  }
}

function setDuration(ov: unknown, re: RegExp, sec: number, only?: Slot): void {
  for (const slot of only ? [only] : ALL_SLOTS) {
    for (const b of slotBlocks(ov, slot)) {
      for (const e of b.effects ?? []) {
        if (typeof e.stat === 'string' && re.test(e.stat)) e.durationSec = sec;
      }
    }
  }
}

function retarget(ov: unknown, slot: Slot, target: unknown): void {
  for (const b of slotBlocks(ov, slot)) b.target = target;
}

// Attach an event sink on both plausible carriers so the collection can never be silently empty
// (group A asserts it is not).
function run(opts: ReturnType<typeof controlComp>) {
  const events: SimEvent[] = [];
  const onEvent = (ev: SimEvent) => {
    events.push(ev);
  };
  const bag = opts as unknown as Record<string, unknown>;
  const merged = {
    ...bag,
    onEvent,
    cfg: { ...((bag.cfg as Record<string, unknown>) ?? {}), onEvent },
  } as unknown as ReturnType<typeof controlComp>;
  return { res: runComp(merged), events };
}

function compWith(mutate: (ov: unknown) => void) {
  const patched = withPatchedOverride(SLUG, mutate);
  const bag = controlComp(SLUG, true) as unknown as Record<string, unknown>;
  return {
    ...bag,
    overrides: {
      ...((bag.overrides as Record<string, unknown>) ?? {}),
      [SLUG]: patched,
    },
  } as unknown as ReturnType<typeof controlComp>;
}

const buffs = (evs: SimEvent[]): BuffApply[] =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const near = (a: number | undefined, b: number): boolean =>
  typeof a === 'number' && Math.abs(a - b) < 1e-6;
function pick(evs: SimEvent[], stat: RegExp, value: number): BuffApply[] {
  return buffs(evs).filter(
    (e) => typeof e.stat === 'string' && stat.test(e.stat) && near(e.value, value),
  );
}
// A bounded (for N sec) window has a real expiry frame inside the fight; a permanent buff has
// none, or a sentinel far past the fight.
const bounded = (e: BuffApply): boolean =>
  typeof e.expiresFrame === 'number' &&
  Number.isFinite(e.expiresFrame) &&
  e.expiresFrame < FIGHT_FRAMES * 2;

const dmg = (t: Record<string, number>, slug: string): number => t[slug] ?? 0;
const sum = (t: Record<string, number>): number =>
  Object.values(t).reduce((a, b) => a + b, 0);

// ---- hoisted runs (8 full 180 s sims) -------------------------------------------------------
const BASE = run(controlComp(SLUG, true));
const baseTotals = totals(BASE.res);
const TEAM = Object.keys(baseTotals);

const CRIT = pick(BASE.events, /critDamage/i, 10.34);
const AMMO = pick(BASE.events, /ammo/i, 3);
const CHARGE = pick(BASE.events, /chargeDamage/i, 25.84);
// A caster-scaled encoding would re-emit as a FLAT ATK number, so a 25.86-valued atk event
// existing at all is itself the stat-choice discriminator.
const ATK = pick(BASE.events, /atk/i, 25.86);

const s1Targets = [...new Set(CRIT.map((e) => e.targetSlug))];
const S1_TARGET = (s1Targets[0] ?? '') as string;

const noCrit = run(compWith((ov) => stripStat(ov, /critDamage/i)));
const noAmmo = run(compWith((ov) => stripStat(ov, /ammo/i)));
const noCharge = run(compWith((ov) => stripStat(ov, /chargeDamage/i)));
const noBurstAtk = run(compWith((ov) => stripStat(ov, /atk/i, 'burst')));
const burstNarrow = run(
  compWith((ov) =>
    retarget(ov, 'burst', { kind: 'alliesTopAtk', count: 1, byFinalAtk: true }),
  ),
);
const burstLong = run(compWith((ov) => setDuration(ov, /atk/i, 60, 'burst')));
const s1Self = run(compWith((ov) => retarget(ov, 'skill1', { kind: 'self' })));

describe('n102 - fixture wiring and non-vacuity', () => {
  it('collects events, fields a full team, and n102 deals damage', () => {
    expect(BASE.events.length).toBeGreaterThan(0);
    expect(TEAM.length).toBeGreaterThanOrEqual(4);
    expect(TEAM).toContain(SLUG);
    expect(unitOf(BASE.res, SLUG).totalDamage).toBeGreaterThan(0);
  });
});

describe('n102 skill1 - Full Charge trigger, 1 highest-final-ATK ally', () => {
  it('re-fires per full charge (rules out passive / burstCast / fullBurstEnter keying)', () => {
    // RL: 90-frame charge, 6 rounds, 141-frame reload => roughly 75-95 full charges in 180 s.
    // Nearest-wrong keyings over the same fight: passive = 1, burstCast ~5-9,
    // fullBurstEnter ~8-10, lastBullet ~15. A floor of 40 separates the faithful reading from
    // every one of them. (buffApply carries a refresh flag, so re-applications do emit.)
    expect(CRIT.length).toBeGreaterThanOrEqual(40);
    expect(AMMO.length).toBeGreaterThanOrEqual(40);
  });

  it('resolves to exactly ONE ally, and never to n102 herself', () => {
    expect(s1Targets).toHaveLength(1);
    expect(TEAM).toContain(S1_TARGET);
    // Attacker 118,027 static ATK outranks n102 (Supporter, 98,367), so the highest-final-ATK
    // ally is someone else - a self-scoped mis-encoding fails here.
    expect(S1_TARGET).not.toBe(SLUG);
  });

  it('the self-scoped nearest-wrong model changes both the target and the board', () => {
    const selfTargets = [
      ...new Set(pick(s1Self.events, /critDamage/i, 10.34).map((e) => e.targetSlug)),
    ];
    expect(selfTargets).toEqual([SLUG]);
    expect(dmg(totals(s1Self.res), S1_TARGET)).not.toBe(dmg(baseTotals, S1_TARGET));
  });
});

describe('n102 skill1 - Max Ammunition Capacity 3 (a FLAT round count that gates shots)', () => {
  it('is emitted as maxAmmoFlat 3, not a percentage capacity bump', () => {
    expect(AMMO.length).toBeGreaterThan(0);
    // Nearest-wrong: maxAmmoPct 3, i.e. a ~3% capacity nudge instead of +3 whole rounds.
    for (const e of AMMO) expect(e.stat).toBe('maxAmmoFlat');
  });

  it('carries a bounded window rather than a permanent grant', () => {
    expect(AMMO.every(bounded)).toBe(true);
  });

  it('removing it moves the recipient (weapon-state modifiers ARE damage)', () => {
    // Ammo capacity changes magazine boundaries => shot count => damage. Teammates may also
    // move here because shot counts feed burst gauge, so only the recipient is asserted.
    expect(dmg(totals(noAmmo.res), S1_TARGET)).not.toBe(dmg(baseTotals, S1_TARGET));
  });
});

describe('n102 skill1 - Critical Damage 10.34%', () => {
  it('emits critDamagePct 10.34 with a bounded window', () => {
    expect(CRIT.length).toBeGreaterThan(0);
    for (const e of CRIT) expect(e.stat).toBe('critDamagePct');
    expect(CRIT.every(bounded)).toBe(true);
  });

  it('lowers ONLY the highest-final-ATK ally - teammates byte-identical', () => {
    // Crit damage feeds no gauge or rotation path, so a count-1 scope must leave every other
    // unit bit-for-bit unchanged. An allies-scoped mis-encoding moves them all.
    const t = totals(noCrit.res);
    expect(dmg(t, S1_TARGET)).toBeLessThan(dmg(baseTotals, S1_TARGET));
    for (const slug of TEAM) {
      if (slug === S1_TARGET) continue;
      expect(dmg(t, slug)).toBe(dmg(baseTotals, slug));
    }
  });
});

describe('n102 skill2 - Charge Damage 25.84% to 1 highest-final-ATK ally', () => {
  it('emits chargeDamagePct 25.84 to the SAME single ally skill1 picks', () => {
    expect(CHARGE.length).toBeGreaterThan(0);
    // Nearest-wrong: chargeDamageMultPct, a true multiplier on base charge damage rather than
    // additive percentage points in the charge bucket.
    for (const e of CHARGE) expect(e.stat).toBe('chargeDamagePct');
    expect([...new Set(CHARGE.map((e) => e.targetSlug))]).toEqual([S1_TARGET]);
  });

  it('is a bounded 5 sec window that re-fires, not a one-shot t=0 application', () => {
    expect(CHARGE.every(bounded)).toBe(true);
    // A passive encoding (with or without the 5 sec duration) applies exactly once at frame 0.
    expect(CHARGE.length).toBeGreaterThan(1);
  });

  it('lowers ONLY that ally - teammates byte-identical', () => {
    const t = totals(noCharge.res);
    expect(dmg(t, S1_TARGET)).toBeLessThan(dmg(baseTotals, S1_TARGET));
    for (const slug of TEAM) {
      if (slug === S1_TARGET) continue;
      expect(dmg(t, slug)).toBe(dmg(baseTotals, slug));
    }
  });

  it.skip('FLAG - skill2 trigger identity and cadence are outside the input domain: the kit prose gives no activation clause and no skill cooldown is supplied. Measurement-gated; only structure is asserted above.', () => {});
});

describe('n102 burst - all allies, ATK 25.86% for 10 sec', () => {
  it('n102 actually casts in this fixture (two Burst I units share stage 1)', () => {
    expect(ATK.length).toBeGreaterThan(0);
  });

  it('is a plain percentage ATK buff, bounded in time', () => {
    for (const e of ATK) expect(e.stat).toBe('atkPct');
    expect(ATK.every(bounded)).toBe(true);
  });

  it('reaches EVERY ally including n102 herself', () => {
    const targets = [...new Set(ATK.map((e) => e.targetSlug))];
    for (const slug of TEAM) expect(targets).toContain(slug);
  });

  it('narrowing the target to the single top-ATK ally loses damage', () => {
    expect(sum(totals(burstNarrow.res))).toBeLessThan(sum(baseTotals));
  });

  it('removing it lowers every ally, n102 included (discriminates vs excludeSelf)', () => {
    const t = totals(noBurstAtk.res);
    for (const slug of TEAM) {
      if (dmg(baseTotals, slug) <= 0) continue;
      expect(dmg(t, slug)).toBeLessThan(dmg(baseTotals, slug));
    }
  });

  it('the 10 sec window is real: stretching it to 60 sec raises damage', () => {
    // Burst cooldown is 20 s and n102 alternates stage 1 with liter, so a 10 sec buff is well
    // under 100% uptime. An unbounded (permanent) encoding would show no gain here.
    expect(sum(totals(burstLong.res))).toBeGreaterThan(sum(baseTotals));
  });
});

describe('n102 - flagged, non-discriminable in this fixture', () => {
  it.skip('FLAG - highest FINAL ATK (live) vs static ATK ranking: both rank the same Attacker first in this comp, so byFinalAtk is unobservable here. Needs a comp where a buff flips the ranking.', () => {});

  it.skip('FLAG - Full Charge attack vs any shot fired: the base weapon is a charge weapon (90-frame charge), so every modeled shot is a full charge and the two triggers are observationally identical.', () => {});

  it.skip('FLAG - the exact 10 sec skill1 window: skill1 re-fires roughly every 1.5-2 s, holding ~100% uptime, so duration is not observable in totals. Only boundedness is asserted above.', () => {});
});

====================================================================
## (6) S6 BLIND OVERRIDE (claude-opus-5) + DIFF vs DRIVER OVERRIDE
====================================================================
DIFF (blind vs driver): structurally IDENTICAL on all three slots — same triggers (shotFired /
interval / burstCast), same targets (alliesTopAtk{count:1,byFinalAtk} / allies), same stats
(maxAmmoFlat 3 + critDamagePct 10.34 / chargeDamagePct 25.84 / atkPct 25.86), same durations
(10s / 5s / 10s). SOLE numeric divergence: skill2 interval period — blind authored sec:10 and
explicitly flagged it ⚑ INVENTED ('prose carries no activation clause... read the datamined
skillCooldownsSec'); the driver authored sec:15 from the datamined skillCooldownsSec.skill2 = 15
(see ground truth above). The blind's own recipe points at exactly the value the driver used.

### blind override (claude-opus-5):
{
  "slug": "n102",
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "shotFired"
      },
      "target": {
        "kind": "alliesTopAtk",
        "count": 1,
        "byFinalAtk": true
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "maxAmmoFlat",
          "value": 3,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "critDamagePct",
          "value": 10.34,
          "durationSec": 10
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "interval",
        "sec": 10
      },
      "target": {
        "kind": "alliesTopAtk",
        "count": 1,
        "byFinalAtk": true
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "chargeDamagePct",
          "value": 25.84,
          "durationSec": 5
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
          "kind": "buff",
          "stat": "atkPct",
          "value": 25.86,
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
    "⚑ skill1 trigger: the kit says 'when performing a Full Charge attack'; there is no full-charge TriggerDef, so it is keyed to shotFired on the assumption that every RL trigger pull is a full charge (chargeFrames 90). If the engine ever fires an uncharged RL shot, this over-fires.",
    "⚑ skill2 trigger + cadence are INVENTED: the prose carries no activation clause, so it is modeled as interval sec 10 (a 5 s buff on an unstated cooldown ⇒ ~50% uptime). The real cooldown is datamined, not in the kit text.",
    "⚑ cadence tuple (reloadFrames 141 / chargeFrames 90 / 6 ammo) is datamine-sourced and known-unreliable; it drives how often the skill1 refresh lands.",
    "skill1 refreshes on every full charge, so on a fight where n102 fires freely the 10 s Max Ammo +3 / Crit DMG +10.34% buff is effectively continuous on the top-ATK ally — the 10 s duration only bites during long idle/burst-cast gaps.",
    "Target pools do NOT exclude self (no 'except self' in the prose), so n102 can be her own skill1/skill2 target if she has the highest final ATK.",
    "Both single-target lines rank by LIVE effective ATK (byFinalAtk) because the prose says 'highest final ATK' literally."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. n102 (RL/Water/Supporter/Burst I) is modeled as a pure single-target + team ATK support with no damage riders. skill1 fires on each full-charge shot and grants the highest-final-ATK ally Max Ammunition +3 (flat rounds — a weapon-state/shot-count modifier, so it IS damage) and Critical Damage +10.34%, both 10 s. skill2 grants the same single ally Charge Damage +25.84% for 5 s; the kit text gives NO activation clause, so it is keyed to an interval trigger with a ⚑ estimated 10 s cadence. The burst grants all allies (self included) ATK +25.86% for 10 s on burst cast. Nothing in the kit is a damage line, a DoT, a weapon swap, a stack/currency pool, a heal/shield, or a Hit-Rate line, so no noFb / core / pierce / resource machinery applies."
}
====================================================================
## (7) DRIVER IMPLEMENTATION (test + override under review)
====================================================================
### scripts/tests/units/n102.test.ts (driver test — 10/10 green):
// PER-UNIT KIT SPEC — `n102` (N102, RL/Supporter/Water, Burst I, cd 20s, ammo 6, chargeFrames 90).
// Kit-autonomy gauntlet 2026-08-02 — test-first re-derivation.
//
// N102 is a PURE single-target buffer: she has NO personal-damage lines (no riders / DoTs / nukes).
// Her entire kit is three grants, so the whole assertable surface is the buffApply events she emits —
// their STAT, VALUE, DURATION, TARGET SET, and CADENCE. One assertion group per kit line (N1..N5).
// `withPatchedOverride` builds COUNTERFACTUALS only (the nearest wrong model each PIN must
// discriminate against) — never the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.n102.skills):
//   S1 ■ on Full Charge attack → 1 highest-final-ATK ally: Max Ammunition Capacity ▲3 / 10s   [N1,N2,N3]
//                                       Critical Damage ▲10.34% / 10s
//   S2 ■ (15s CD) → 1 highest-final-ATK ally: Charge Damage ▲25.84% / 5s                      [N4]
//   BU ■ (burstCast) → all allies: ATK ▲25.86% / 10s                                          [N5]
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   N1  S1 fires on EVERY full charge (shotFired — RL fires only full-charge shots), so the
//       application count equals her shot count. A burst-only or interval encoding would land near
//       the burst count (9) or a 15s cadence (11), not the 79-shot cadence.
//   N2  the S1 grants are SCOPED to the single highest-final-ATK ally. Proven two ways: shipped
//       reaches EXACTLY ONE target (helm, the 600-ATK carry) and the unscoped counterfactual
//       (target:allies) reaches all three — i.e. the shipped assertion is one the generic model
//       provably fails.
//   N3  'Max Ammunition Capacity ▲ 3' is a FLAT round count (maxAmmoFlat 3), not a percent
//       (maxAmmoPct). The stat identity + integer value are pinned; a percent encoding would be a
//       different stat entirely.
//   N4  S2 is a 15s-CD skill (interval 15s, first fire t=15): applications land on a 900-frame
//       grid, NOT at burst frames and NOT once-at-t=0 (passive). Scoped to one ally like S1.
//   N5  the burst ATK grant reaches ALL allies (including self). A scoped/self counterfactual
//       reaches one — the shipped per-cast application count is bursts × team-size.
//
// Fixture: [n102 (B1) / crown (B2) / helm (B3)] — a complete burst chain with N102 the SOLE B1, so
// she casts every Full Burst (9 casts / 180s); helm (base ATK 600 > n102 450 > crown 400) is the
// unambiguous highest-final-ATK target for the scoped grants. boss Fire (helm Water → advantaged),
// focus helm (charge weapon → ×2.5 gauge). Deterministic (no seed).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
/** comp slot order: n102 0 / crown 1 / helm 2. */
const N102 = 0;
const HELM = 2;
const TEAM = 3;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  runComp({
    slugs: ['n102', 'crown', 'helm'],
    bossElement: 'Fire',
    focusSlug: 'helm',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return events;
}

// ---- counterfactuals (nearest wrong model each PIN discriminates against) ---------------------
/** N2 counterfactual: S1 grants as GENERIC all-allies buffs (drop the highest-ATK scope). */
const n102S1Unscoped = withPatchedOverride('n102', (ov) => {
  const t = ov.skill1[0]?.target;
  if (t?.kind !== 'alliesTopAtk') {
    throw new Error('n102 S1 alliesTopAtk target missing — fixture is stale');
  }
  ov.skill1[0].target = { kind: 'allies' };
});
/** N4 counterfactual: S2 grant as a generic all-allies buff. */
const n102S2Unscoped = withPatchedOverride('n102', (ov) => {
  const t = ov.skill2[0]?.target;
  if (t?.kind !== 'alliesTopAtk') {
    throw new Error('n102 S2 alliesTopAtk target missing — fixture is stale');
  }
  ov.skill2[0].target = { kind: 'allies' };
});
/** N5 counterfactual: burst ATK grant scoped to one ally instead of all. */
const n102BurstScoped = withPatchedOverride('n102', (ov) => {
  const t = ov.burst[0]?.target;
  if (t?.kind !== 'allies') {
    throw new Error('n102 burst allies target missing — fixture is stale');
  }
  ov.burst[0].target = { kind: 'alliesTopAtk', count: 1, byFinalAtk: true };
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const s1Unscoped = run({ n102: n102S1Unscoped });
const s2Unscoped = run({ n102: n102S2Unscoped });
const burstScoped = run({ n102: n102BurstScoped });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const n102Buffs = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === N102 && b.stat === stat);
const distinctTargets = (bs: BuffApply[]) =>
  [...new Set(bs.map((b) => b.targetIdx))].sort((a, b) => a - b);
const distinctFrames = (bs: BuffApply[]) =>
  [...new Set(bs.map((b) => b.frame))].sort((a, b) => a - b);
const n102Shots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'n102');
const n102Bursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'n102');

describe('n102 — kit spec', () => {
  describe('N1 — S1 fires on every Full Charge attack (RL shots are full charges)', () => {
    it('applies the S1 crit-damage grant once per shot, not per burst or per interval', () => {
      const applies = n102Buffs(base, 'critDamagePct').length;
      const shots = n102Shots(base).length;
      const bursts = n102Bursts(base).length;
      expect(shots).toBeGreaterThan(0);
      expect(
        applies,
        `${applies} critDamagePct applies vs ${shots} shots / ${bursts} bursts — a burst/interval ` +
          'trigger would land near the burst or 15s count, not the shot count'
      ).toBe(shots);
    });
  });

  describe('N2 — S1 grants are scoped to the single highest-final-ATK ally', () => {
    const crit = n102Buffs(base, 'critDamagePct');
    const ammo = n102Buffs(base, 'maxAmmoFlat');

    it('reach EXACTLY ONE ally — the highest-final-ATK carry (helm), for 10 sec', () => {
      expect(crit.length).toBeGreaterThan(0);
      expect(distinctTargets(crit)).toEqual([HELM]);
      expect(distinctTargets(ammo)).toEqual([HELM]);
      expect([...new Set(crit.map((b) => b.value))]).toEqual([10.34]);
      for (const b of [...crit, ...ammo]) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('DISCRIMINATING: an unscoped (all-allies) S1 would reach the whole team', () => {
      expect(distinctTargets(n102Buffs(s1Unscoped, 'critDamagePct')).length).toBe(
        TEAM
      );
      expect(distinctTargets(n102Buffs(s1Unscoped, 'maxAmmoFlat')).length).toBe(
        TEAM
      );
    });
  });

  describe('N3 — S1 Max Ammunition Capacity is a FLAT +3 rounds (maxAmmoFlat), not a percent', () => {
    it('is the integer flat-round encoding at the kit magnitude', () => {
      const ammo = n102Buffs(base, 'maxAmmoFlat');
      expect(ammo.length).toBeGreaterThan(0);
      expect([...new Set(ammo.map((b) => b.value))]).toEqual([3]);
    });
  });

  describe('N4 — S2 is a 15s-CD Charge Damage grant, scoped to one ally', () => {
    const cd = n102Buffs(base, 'chargeDamagePct');

    it('is 25.84% for 5 sec on the highest-final-ATK ally', () => {
      expect(cd.length).toBeGreaterThan(0);
      expect([...new Set(cd.map((b) => b.value))]).toEqual([25.84]);
      expect(distinctTargets(cd)).toEqual([HELM]);
      for (const b of cd) {
        expect(b.expiresFrame! - b.frame).toBe(5 * FPS);
      }
    });

    it('fires on a 15s grid starting at t=15 (interval CD, not burst-cast, not passive)', () => {
      const frames = distinctFrames(cd);
      expect(frames.length).toBeGreaterThanOrEqual(10);
      expect(frames[0], 'first fire must be at t=15s (the CD), not t=0').toBe(
        15 * FPS
      );
      for (let i = 1; i < frames.length; i++) {
        expect(
          frames[i] - frames[i - 1],
          `gap ${frames[i] - frames[i - 1]}f between fires ${i - 1}/${i} — expected 900f (15s)`
        ).toBe(15 * FPS);
      }
    });

    it('DISCRIMINATING: an unscoped (all-allies) S2 would reach the whole team', () => {
      expect(
        distinctTargets(n102Buffs(s2Unscoped, 'chargeDamagePct')).length
      ).toBe(TEAM);
    });
  });

  describe('N5 — burst ATK grant reaches ALL allies (including self)', () => {
    const atk = n102Buffs(base, 'atkPct');

    it('is 25.86% for 10 sec, applied once per cast to every ally', () => {
      const bursts = n102Bursts(base).length;
      expect(bursts).toBeGreaterThan(0);
      expect([...new Set(atk.map((b) => b.value))]).toEqual([25.86]);
      expect(atk.length).toBe(bursts * TEAM);
      for (const b of atk) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('reaches all three allies on every cast', () => {
      const perFrame = new Map<number, Set<number>>();
      for (const b of atk) {
        (perFrame.get(b.frame) ?? perFrame.set(b.frame, new Set()).get(b.frame)!).add(
          b.targetIdx
        );
      }
      for (const [frame, holders] of perFrame) {
        expect(
          [...holders].sort((a, b) => a - b),
          `frame ${frame} reached ${holders.size} allies, expected ${TEAM}`
        ).toEqual([0, 1, 2]);
      }
    });

    it('DISCRIMINATING: a scoped/self burst would reach one ally, not the team', () => {
      expect(
        distinctTargets(n102Buffs(burstScoped, 'atkPct')).length
      ).toBe(1);
    });
  });
});

### src/skills/overrides/n102.json (driver override):
{
  "note": "n102 (N102) — RL / Supporter / Water / Burst I, cd 20s, ammo 6, chargeFrames 90. A pure single-target buffer whose entire kit is three ATK-seeking grants: she has NO personal-damage lines (no riders, no DoTs, no nukes) — her value is the buffs she puts on the team's highest-final-ATK carry. || S1 'Written Memories' (shotFired trigger — RL fires ONLY full-charge shots, so every trigger pull IS a 'Full Charge attack'; the same encoding helm uses for her 'attacking with Full Charge' line): 'Affects the 1 ally unit(s) with the highest final ATK. Max Ammunition Capacity ▲ 3 for 10 sec. Critical Damage ▲ 10.34% for 10 sec.' → ONE block, target alliesTopAtk{count:1, byFinalAtk:true} (kit says 'highest FINAL ATK' → live effectiveAtk ranking per A3; no 'except self' so self is eligible but a 450-ATK Supporter is never the top), two effects: maxAmmoFlat 3 / 10s + critDamagePct 10.34 / 10s. At the RL charge cadence (~1.5-2s/charge) the 10s window is refreshed continuously, so both grants sit at ~100% uptime on the carry after the first charge. maxAmmoFlat is wired into maxAmmo() (sim.ts) — +3 rounds on the carry's magazine = fewer reloads = a small real damage gain; critDamagePct is the standard crit-damage bucket. || S2 'Impaired Memory' (interval 15s — the 15s skill cooldown; first fire t=15 then every 15s, the snow-white 15s-CD precedent): 'Affects 1 ally unit(s) with the highest final ATK. Charge Damage ▲ 25.84% for 5 sec.' → target alliesTopAtk{count:1, byFinalAtk:true}, chargeDamagePct 25.84 / 5s (additive percentage points in the charge bucket). 5s duration on a 15s CD = 33% uptime. || BURST 'Memories of Blue Butterflies' (burstCast — the cast lands BEFORE the Full Burst window opens): 'Affects all allies. ATK ▲ 25.86% for 10 sec.' → target allies (all, includes self), atkPct 25.86 / 10s (plain 'ATK ▲' = percent of each recipient's OWN ATK, NOT casterAtkPct). || TIER 2: scoped highest-final-ATK single-target buffs (S1/S2) vs all-allies burst; byFinalAtk live-ranking; shotFired-as-full-charge trigger. Faithful>fit; measured>fudge. || Kit-autonomy gauntlet 2026-08-02.",
  "caveats": [
    "skill1: 'Max Ammunition Capacity ▲ 3' is maxAmmoFlat (a flat +3 rounds on the recipient's magazine, wired into maxAmmo()); the damage gain is the carry's reduced reload frequency — a real but secondary effect, faithfully encoded rather than fudged",
    "skill1: trigger is shotFired — RL fires only full-charge shots so every trigger pull is a 'Full Charge attack' (helm precedent for the same kit phrasing on a charge weapon)",
    "skill2: modeled as interval 15s (the skill cooldown; first fire t=15) — a CD skill that fires whenever off-CD in a sustained fight; 5s duration ⇒ 33% uptime on the carry's charge bucket",
    "cadence: pullsPerSec / chargeFrames 90 / bolt-gap are datamine values affecting N102's OWN shot cadence (and thus her S1 refresh rate / burst gauge) only; her SUPPORT buff magnitudes are kit-exact, not cadence-dependent"
  ],
  "unmodeled": {
    "skill1": [],
    "skill2": [],
    "burst": []
  },
  "skill1": [
    {
      "slot": "skill1",
      "trigger": { "kind": "shotFired" },
      "target": {
        "kind": "alliesTopAtk",
        "count": 1,
        "byFinalAtk": true
      },
      "effects": [
        { "kind": "buff", "stat": "maxAmmoFlat", "value": 3, "durationSec": 10 },
        { "kind": "buff", "stat": "critDamagePct", "value": 10.34, "durationSec": 10 }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": { "kind": "interval", "sec": 15 },
      "target": {
        "kind": "alliesTopAtk",
        "count": 1,
        "byFinalAtk": true
      },
      "effects": [
        { "kind": "buff", "stat": "chargeDamagePct", "value": 25.84, "durationSec": 5 }
      ]
    }
  ],
  "burst": [
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "allies" },
      "effects": [
        { "kind": "buff", "stat": "atkPct", "value": 25.86, "durationSec": 10 }
      ]
    }
  ]
}
