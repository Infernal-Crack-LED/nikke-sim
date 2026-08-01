# S7 RECONCILING JUDGE — dorothy (Dorothy, AR/Supporter/Water/Burst I)

## SECTION 1 — YOUR CONTRACT (RECONCILING-JUDGE.md)

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

## SECTION 2 — MECHANICS SOURCE OF TRUTH

### 2a. docs/data/damage-calculation.md

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

### 2b. docs/data/game-mechanics.md

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

## SECTION 3 — GROUND TRUTH: dorothy kit prose + base stats (data/characters.json)

```json
{
  "slug": "dorothy",
  "name": "Dorothy",
  "weapon": "AR",
  "burst": "I",
  "class": "Supporter",
  "element": "Water",
  "manufacturer": "Pilgrim",
  "burstCooldownSec": 20,
  "normalAttackMultiplier": 13.65,
  "coreAttackMultiplier": 200,
  "ammo": 60,
  "reloadFrames": 81,
  "chargeFrames": 0,
  "hitsPerShot": 1,
  "rl3": 7.6,
  "burstGaugePerShot": 0.2,
  "skills": {
    "skill1": "■ Activates when firing the last bullet. Affects all allies.\nCooldown of Burst Skill ▼ 1.56 sec. \n■ Activates when firing the last bullet during Manifestation. Affects all allies.\nDamage to Parts ▲ 50.68% for 5 sec.",
    "skill2": "■ Affects all enemies.\nScorch to Dust: Deals 216% of final ATK as Distributed Damage.",
    "burst": "■ Affects self.\nManifestation: Cooldown of Skill 2 ▼ 18 sec, lasts for 10 sec.\nGain Pierce for 10 sec.\n■ Affects a designated enemy.\nBrand: Accumulates total damage dealt to the designated enemy during the duration, and then deals that accumulated damage to all enemies as Distributed Damage once the duration ends. The maximum accumulated damage is 8900.83% of the skill user's final ATK. Lasts for 10 sec."
  },
  "skillCooldownsSec": {
    "skill1": null,
    "skill2": 20,
    "burst": 20
  },
  "baseStats": {
    "hp": 15000,
    "atk": 500,
    "def": 100,
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
    "resourceId": 233
  }
}
```

## SECTION 4 — S2b CROSS-FAMILY TEST REVIEW (claude-fable-5)

```json
{
  "slug": "dorothy",
  "stage": "S2b test-faithfulness review (cross-family)",
  "reviewerModel": "claude-fable-5",
  "leakDetected": false,
  "reviewerSpec": [
    {
      "slot": "skill1",
      "kitLine": "last bullet → Burst CD ▼ 1.56 sec",
      "disposition": "FAITHFUL",
      "scope": "Burst-skill cooldown reduction only — not a stat buff, not gauge fill; applies to every ally's burst cooldown.",
      "durationSemantics": "Instant one-shot CDR per activation, no duration. Repeats every magazine (ammo 60 → lastBullet roughly every ~6.4s with AR cadence + 81f reload).",
      "triggerIdentity": "{kind:'lastBullet'} — per-magazine, fires when HER last bullet fires. NOT interval, NOT shotFired, NOT reload-complete, and NOT oncePerBattle.",
      "targetSet": "{kind:'allies'} — all allies INCLUDING self ('Affects all allies'); her own 20s Burst I CD is also reduced.",
      "nearestWrongModel": "burstCdr with oncePerBattle:true, or trigger mis-keyed to interval/shotFired, or target excludeSelf:true — each collapses or inflates a ~1.56s-per-magazine rotation acceleration that repeats ~28× per 180s fight.",
      "distinguishingAssertion": "In a comp where dorothy actually fires (focus her), collect burstCast timestamps with the S1 block live vs withPatchedOverride('dorothy', o => { strip the burstCdr block }): the live run must show STRICTLY earlier subsequent burstCast frames / ≥ as many fullBurstStart events, and the CDR must recur — assert the effect applies after the 2nd, 3rd… magazines too (multiple magazines → multiple distinct CD advancements), red under oncePerBattle. Also assert dorothy's OWN burstCast cadence tightens (self included), red under excludeSelf.",
      "inertness": "Must add zero damage events itself — pure rotation effect; totals move only via extra/earlier Full Bursts.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Damage to Parts ▲ 50.68% for 5 sec",
      "disposition": "FAITHFUL",
      "scope": "Parts-damage bucket ONLY (partsDamagePct — parsed but inert in v1: scope-lock boss is partless and hit location never changes damage). NOT generic Attack Damage, NOT damageTakenPct.",
      "durationSemantics": "durationSec: 5 — wall-clock seconds ('for 5 sec'), refreshed per qualifying last bullet.",
      "triggerIdentity": "{kind:'lastBullet'} gated to fire ONLY while Manifestation (her own-burst 10s window) is live — a burst-cast-opened window, not a permanent second lastBullet block and not fullBurstEnter-gated. A name-keyed targetStatus('Manifestation',10s) opened by her burst + requiresTargetStatus on this block is a workable engine encoding of the window.",
      "targetSet": "{kind:'allies'} — all allies including self.",
      "nearestWrongModel": "Encoding 'Damage to Parts' as attackDamagePct/damageTakenPct 50.68 (a live +50% team damage window — massive over-credit), and/or dropping the 'during Manifestation' gate so it applies every magazine.",
      "distinguishingAssertion": "totals() for every unit is IDENTICAL with this block present vs stripped (partless boss ⇒ partsDamagePct is inert), AND no buffApply with stat attackDamagePct/damageTakenPct and value 50.68 ever appears; any buffApply for this line carries stat partsDamagePct. If a Manifestation-window gate is asserted structurally, its buffApply events occur only within 10s of a dorothy burstCast.",
      "inertness": "Must move ZERO damage on the scope-lock boss — this is the primary trap of the whole kit.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "Scorch to Dust: 216% Distributed Damage",
      "disposition": "FAITHFUL",
      "scope": "Skill-flat damage (flatDamage atkPct:216, flavor:'distributed'), scaled by dorothy's final ATK at landing; 'all enemies' collapses to the single boss. Rider defaults: FB +50% by landing timing (default ON), no range bonus, engine-default crit policy — no crit/core opt-in from prose.",
      "durationSemantics": "Instant hit per activation, no duration.",
      "triggerIdentity": "{kind:'interval', sec: <datamined S2 cooldown>} — the line has NO activation clause, so it is an internal-cooldown interval skill (first fire t=CD per the no-force-cast convention). The base CD is NOT in the kit text: the burst's 'Skill 2 CD ▼18 sec' proves a base CD ≥18s exists — pull it from datamined skillCooldownsSec; the cadence tuple is ALWAYS-⚑ if the datamine lacks it.",
      "targetSet": "{kind:'enemy'} — the boss.",
      "nearestWrongModel": "Modeling S2 as a FIXED interval that ignores the burst's Manifestation CDR entirely — the compliant-looking fixed-interval override under-credits every 10s post-burst window by the difference between ~⌊10/(CD−18)⌋ casts and ~0–1. Secondary misread: shotFired/hitCount trigger (no textual basis).",
      "distinguishingAssertion": "Count damage events with mult≈216 in the distributed flavor from dorothy's skill2 slot: outside Manifestation their spacing equals the datamined CD exactly (first at t=CD, not t=0); INSIDE each 10s window following a dorothy burstCast the count is ≥⌊10/(CD−18)⌋ — green under a CDR-aware model, red under fixed-interval.",
      "inertness": "No S2 hits before t=CD (first-fire phase), and no cadence change in windows following OTHER units' bursts or team FBs dorothy did not cast into.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Manifestation: Skill 2 CD ▼ 18 sec, 10s",
      "disposition": "GAP",
      "scope": "Modulates HER OWN Skill 2's cooldown for 10s — a self mode, not a team buff and not a burst-skill CDR (do not encode as burstCdr).",
      "durationSemantics": "durationSec-style 10s window from HER burst cast.",
      "triggerIdentity": "{kind:'burstCast'} — a self mode in the unit's OWN burst block fires ONLY on rotations dorothy herself casts Burst I. NOT fullBurstEnter (any team FB), NOT stageEnter:1 (another B1's cast must not open it).",
      "targetSet": "{kind:'self'}.",
      "nearestWrongModel": "Keying Manifestation to fullBurstEnter/stageEnter so every team Full Burst (including rotations liter or another B1 casts) opens the fast-S2 window — over-credits in exactly the fixtures where a second Burst I unit is present. Second misread: silently dropping the line as 'cooldown mechanics unmodeled' (large under-credit).",
      "distinguishingAssertion": "In a comp containing dorothy AND another Burst I unit where the other unit wins some B1 casts: accelerated-S2 windows (mult≈216 events at the reduced spacing) begin ONLY at burstCast events whose caster is dorothy, and never follow fullBurstStart events on rotations she did not cast — green under burstCast keying, red under fullBurstEnter. Engine note: the interval trigger has no CD-modulation primitive, so the expected faithful encoding is a burstCast block emitting the window's extra 216% casts as delaySec-staggered flatDamage hits at the reduced cadence; the assertion above stays valid under that encoding.",
      "inertness": "No effect on any OTHER unit's skill cadence, and no window opened by team FBs dorothy didn't cast into.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Gain Pierce for 10 sec",
      "disposition": "FAITHFUL",
      "scope": "Timed pierce TAG on her own attacks (feeds Pierce Damage ▲ eligibility). In v1 pierceDamagePct is inert and no comp carrier exists, so the tag moves no damage.",
      "durationSemantics": "durationSec: 10 per burst cast — a WINDOW, not whole-fight.",
      "triggerIdentity": "{kind:'burstCast'} (own burst), effect kind 'gainPierce' with durationSec:10. NOT the top-level hasPierce:true boolean — a boolean tags the whole fight and cannot express the 10s window.",
      "targetSet": "{kind:'self'}.",
      "nearestWrongModel": "hasPierce:true at the file top level (permanent, always-on-from-t=0 pierce) instead of a burst-gated 10s gainPierce effect.",
      "distinguishingAssertion": "Structural: the override carries a gainPierce effect with durationSec:10 on the burstCast block and NO top-level hasPierce flag. Behavioral: totals() for all five units identical with the effect present vs stripped (no pierce-damage consumer in v1) — any damage delta is itself a red flag.",
      "inertness": "Zero damage movement in v1 — must not leak into any Damage-Up bucket.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "burst",
      "kitLine": "Brand: accum dmg → Distributed, cap 8900.83%",
      "disposition": "GAP",
      "scope": "One deferred distributed-damage nuke per dorothy burst: accumulates TEAM damage dealt to the designated enemy (the boss) for 10s, then deals min(accumulated, 89.0083 × her final ATK) back as Distributed Damage. Single-boss sim: designated enemy and 'all enemies' are both the boss.",
      "durationSemantics": "10s accumulation window from HER burst cast; ONE release at window END (cast+10s). Never a DoT, never instant-at-cast.",
      "triggerIdentity": "{kind:'burstCast'}; no engine accumulator primitive exists (storedHit releases at FB START, wrong shape), so the expected encoding is flatDamage atkPct:8900.83 flavor:'distributed' delaySec:10 — valid ONLY if a derivation shows team 10s-window damage (which spans the full FB window her cast opens) ≥ the cap; if it falls short, the always-at-cap model over-credits and the shortfall fraction is a ⚑ that must be derived from the sim's own window totals, not guessed.",
      "targetSet": "{kind:'enemy'} — the boss.",
      "nearestWrongModel": "Instant 8900.83% at cast (delaySec:0) — snapshots PRE-FB buffs and gets burst-cast FB-exemption instead of landing inside the FB window ~1.4s before FB end (cast → ~82f chain → 10s FB ⇒ the cast+10s landing falls INSIDE Full Burst, so fbMajorApplied should be TRUE, opposite of the instant model). Equally wrong: assuming cap without the derivation, or one release per team FB via fullBurstEnter.",
      "distinguishingAssertion": "Per dorothy burstCast, exactly ONE damage event with mult≈8900.83 in the distributed flavor, landing ~600 frames AFTER the cast (not at cast), with inFullBurst/fbMajorApplied true per the chain-timing derivation above — green under delayed-release, red under instant-at-cast (which lands pre-FB with fbMajorApplied false). Count of Brand releases over 180s equals dorothy's burstCast count, not the team FB count.",
      "inertness": "No Brand release on rotations dorothy does not cast; never more than one release per cast; value never exceeds the cap.",
      "evidenceTier": "CALIBRATED",
      "loadBearing": true
    }
  ],
  "reviewerLoadBearingSet": [
    "skill1:lastBullet-burstCdr-1.56s",
    "skill2:scorch-216-distributed-interval",
    "burst:manifestation-s2-cd-minus-18s",
    "burst:brand-capped-distributed-release"
  ],
  "reviewerNotes": "FIXTURE TRAP (highest-priority reconciliation): dorothy is BURST I with a 20s CD, but controlComp(carry) seats the carry in the B3 slot — a Burst I unit there NEVER casts, so every burst-gated line (Manifestation, Pierce, Brand) is silently vacuous and the S2 fast window never opens. Tests MUST build a comp with dorothy in the B1 role (plus a real B2 and B3 so Full Bursts actually chain) and positively assert burstCast events with caster dorothy occur before asserting anything downstream of them. If the driver's tests used controlComp unmodified, expect green-by-vacuity. Expected shared-prior misreads, in order: (1) 'Damage to Parts' encoded as generic attack damage — a +50% team window on a boss where parts damage is INERT (partless scope-lock boss; hit location never changes damage); (2) Manifestation's S2 CD ▼18s dropped entirely because the interval trigger has no cooldown-modulation primitive — the faithful encoding must emit the window's extra 216% casts explicitly (delaySec-staggered flatDamage on the burstCast block), and the base S2 CD is NOT in the kit text (datamined skillCooldownsSec, first-fire t=CD, ⚑ if absent); (3) Manifestation/Brand keyed to fullBurstEnter instead of burstCast — diverges exactly when a second Burst I (e.g. liter) is in the comp; (4) Brand modeled as an instant cast nuke — the 10s-deferred landing falls INSIDE the FB window her own cast opens (cast+~82f chain+10s FB ⇒ landing ~1.4s before FB end), flipping fbMajorApplied relative to the instant model, and the at-cap assumption (8900.83% ≈ 87.5×ATK ≈ 8.6M at supporter static ATK) must be derived from the sim's own 10s-window team damage, not assumed; (5) S1 burstCdr given oncePerBattle or excludeSelf — it is a recurring ~per-6.4s-magazine, all-allies-including-self rotation accelerator and is her main team contribution.",
  "driverReconciliation": {
    "converged": [
      "S1-L1 last-bullet team burstCdr 1.56 (FAITHFUL, load-bearing; reviewer distinguishing assertion == driver D1 rotation-schedule comparison)",
      "S1-L2 Damage to Parts 50.68 (FAITHFUL-but-INERT, partsDamagePct inert in v1; reviewer agrees totals identical present vs stripped == driver D2)",
      "S2 Scorch 216 distributed on datamined 20s interval, first fire t=CD (FAITHFUL == driver D3; reviewer confirms base CD is datamined skillCooldownsSec, not kit text)",
      "Burst Gain Pierce timed 10s window, NOT hasPierce boolean (FAITHFUL == driver D4 3-way discrimination)",
      "Brand cap binds -> at-cap delaySec:10 distributed nuke, landing INSIDE her own FB (fbMajorApplied true) — reviewer INDEPENDENTLY derived this exact encoding + the instant-at-cast mis-model discrimination (== driver D6)"
    ],
    "driverAdoptedFromReviewer": [
      "Brand encoding: flatDamage 8900.83 distributed delaySec:10 (reviewer-derived; driver verified cap binds ~11x and the FB-major landing empirically, then enacted — moved Brand from UNMODELED to FAITHFUL-at-cap)"
    ],
    "driverDivergences": [
      "Manifestation S2-CDR: reviewer offered a staggered-flatDamage encoding but flagged it derivation/timing-gated; driver keeps it ⚑ UNMODELED because the extra-cast count depends on burst phase within the 20s S2 cycle (no clean phase-independent reduction => approximating is fudge). Documented with estimate+recipe+tier."
    ],
    "fixtureTrap": "Reviewer warned controlComp seats a Burst I unit in B3 where it never casts (green-by-vacuity). Driver used a CUSTOM 5-unit comp (liter/crown/ada/helm/dorothy) with dorothy as B1; verified dorothy casts (D4/D6 assert dorothyBursts>0), so burst-gated lines are genuinely exercised.",
    "verdict": "GO (test spec converged cross-family; all load-bearing lines discriminated, no green-by-vacuity)"
  }
}
```

## SECTION 5 — S5 BLIND TEST (claude-opus-5) + result vs DRIVER override

RESULT vs driver override (adapted [P1] import path; [P2] S1b Manifestation-gate contrast redirected to the documented ⚑ because partsDamagePct is inert in v1 and the engine has no self-state gate primitive — anchor-innocent-maid [P7] precedent): **14 passed / 3 skipped (the blind’s own GAP skips for Manifestation + Brand-cap) / 0 failed.** All load-bearing lines GREEN: S1a burst-CDR rotation (fbCount drops when stripped; ally-wide > self-only), S2 216% distributed interval (linear in atkPct, teammate-inert), Brand delayed 8900.83% distributed (lands at cast+10s, linear in cap), Gain Pierce timed 10s (inert in comp).

```typescript
/**
 * dorothy — Dorothy (AR / Water / Supporter / Burst I, 60 ammo, 81f reload) — kit spec test.
 *
 * WHAT THE KIT SAYS (structure only)
 *   S1a  trigger "firing the last bullet" / all allies / Cooldown of Burst Skill ▼1.56 sec
 *   S1b  same trigger, additionally gated "during Manifestation" / all allies /
 *        Damage to Parts ▲50.68% for 5 sec
 *   S2   NO activation clause / all enemies / 216% of final ATK as Distributed Damage
 *   Ba   self / "Manifestation": Cooldown of Skill 2 ▼18 sec, lasts 10 sec
 *   Bb   self / Gain Pierce for 10 sec
 *   Bc   designated enemy / "Brand": accumulates damage over 10 sec, released as Distributed
 *        Damage at window end, max 8900.83% of the skill user's final ATK
 *
 * FIXTURE
 *   controlComp('dorothy', true) — liter B1 / crown B2 / dorothy (carry slot) / helm B3.
 *   dorothy is BURST I and therefore shares the B1 stage with liter, so the stock rotation can
 *   hand every B1 cast to liter and leave her burst blocks unexercised. Every burst-slot
 *   assertion therefore runs on a fixture that pushes a damage-free { burstFirst } block onto her
 *   burst slot: that only changes WHO wins the B1 slot — it adds no damage, no buff, no trigger —
 *   so the burst lines are non-vacuous by construction. skill1/skill2 lines use the stock comp.
 *
 * WHY EACH ASSERTION DISCRIMINATES
 *   - The burst-CDR line is proved by FULL BURST COUNT, not by totals: strip the burstCdr effect
 *     and the long-cooldown B2/B3 slots gate the rotation, so the fight loses full bursts.
 *     Re-scoping it to self (the nearest-wrong target set) recovers only a sliver, because the
 *     chain also needs liter/crown/helm off cooldown.
 *   - The parts buff is damage-inert on the partless scope-lock boss, so it is proved
 *     STRUCTURALLY (stat / value / duration / target) plus a gate-bite run: clearing the
 *     Manifestation gate makes it fire on EVERY magazine, so the gated model must emit strictly
 *     fewer applications — and more than zero. Its damage inertness is asserted directly.
 *   - S2 is proved by linearity: doubling atkPct must add exactly the contribution that removing
 *     it takes away. That fails under any model where the block is not the sole S2 damage source,
 *     or where the 216% is not applied once per proc.
 *   - Brand is proved the same way (half the cap → half the delta), plus structural delaySec ≈ 10:
 *     the payload lands when the 10s window ENDS, so its Full-Burst exposure must be a TIMING
 *     outcome, never a hardcoded noFb exemption.
 *
 * FLAGGED (⚑) — outside the input domain, asserted structurally only:
 *   - S2 has no activation clause and no stated cooldown; its cadence is the datamined skill CD
 *     (interval trigger). The test pins the TRIGGER KIND, never the seconds.
 *   - Brand's 8900.83% is a CAP on accumulated damage, not a fixed payload; the engine can only
 *     deal the cap, so a low-damage window is over-credited (see the skipped test).
 */
import { describe, expect, it } from 'vitest';
import type { Block, EffectDef } from '../../../src/skills/types.js';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const SLUG = 'dorothy';

type AnyEv = SimEvent & Record<string, unknown>;

interface OvShape {
  skill1?: Block[];
  skill2?: Block[];
  burst?: Block[];
  hasPierce?: boolean;
}

/** committed override, untouched clone — the structural source of truth for shape assertions */
const shipped = withPatchedOverride(SLUG, () => {}) as unknown as OvShape;

function patched(mutate: (ov: OvShape) => void) {
  return withPatchedOverride(SLUG, (o) => {
    mutate(o as unknown as OvShape);
  });
}

function run(ov?: ReturnType<typeof withPatchedOverride>) {
  const events: AnyEv[] = [];
  const opts = controlComp(SLUG, true);
  if (ov)
    opts.overrides = { ...opts.overrides, [SLUG]: ov } as typeof opts.overrides;
  opts.cfg = {
    ...opts.cfg,
    onEvent: (ev: SimEvent) => {
      events.push(ev as AnyEv);
    },
  } as typeof opts.cfg;
  const res = runComp(opts);
  const t = totals(res);
  return { events, t, dmg: t[SLUG] ?? 0 };
}

const evOf = (evs: AnyEv[], kind: string) => evs.filter((e) => e.kind === kind);
const fbCount = (evs: AnyEv[]) => evOf(evs, 'fullBurstStart').length;
const partsApplies = (evs: AnyEv[]) =>
  evOf(evs, 'buffApply').filter((e) => String(e.stat) === 'partsDamagePct');

const atkPctOf = (e: EffectDef): number | undefined =>
  (e as unknown as { atkPct?: number }).atkPct;

const isBurstCdr = (e: EffectDef) => e.kind === 'burstCdr';
const isPartsBuff = (e: EffectDef) =>
  e.kind === 'buff' && e.stat === 'partsDamagePct';
const isPierce = (e: EffectDef) => e.kind === 'gainPierce';
const isDamage = (e: EffectDef) =>
  e.kind === 'flatDamage' || e.kind === 'dot' || e.kind === 'storedHit';
/** locator for the Brand payload — nothing else in this kit is anywhere near 1000% of ATK */
const isBig = (e: EffectDef) => (atkPctOf(e) ?? 0) > 1000;

function stripEffect(
  blocks: Block[] | undefined,
  pred: (e: EffectDef) => boolean
): void {
  for (const b of blocks ?? []) b.effects = b.effects.filter((e) => !pred(e));
}

function scaleEffect(
  blocks: Block[] | undefined,
  pred: (e: EffectDef) => boolean,
  factor: number
): void {
  for (const b of blocks ?? []) {
    for (const e of b.effects) {
      if (!pred(e)) continue;
      const v = atkPctOf(e);
      if (v !== undefined)
        (e as unknown as { atkPct: number }).atkPct = v * factor;
    }
  }
}

const GATE_KEYS = [
  'fbGate',
  'ownBurstGate',
  'mode',
  'resourceGate',
  'requiresTargetStatus',
  'swapGate',
  'requiresShielded',
  'bossElementGate',
  'everyN',
  'teamHas',
  'formation',
  'requiresCore',
] as const;

function gatesOn(b: Block): string[] {
  const rec = b as unknown as Record<string, unknown>;
  return GATE_KEYS.filter((k) => rec[k] !== undefined);
}

function clearGates(
  blocks: Block[] | undefined,
  pred: (b: Block) => boolean
): void {
  for (const b of blocks ?? []) {
    if (!pred(b)) continue;
    const rec = b as unknown as Record<string, unknown>;
    for (const k of GATE_KEYS) delete rec[k];
  }
}

/** damage-free rotation fixture: makes dorothy (a Burst I sharing the stage with liter) cast */
const burstFirstBlock = (): Block =>
  ({
    slot: 'burst',
    trigger: { kind: 'passive' },
    target: { kind: 'self' },
    effects: [{ kind: 'burstFirst' }],
  }) as unknown as Block;

function withBurstFirst(extra?: (ov: OvShape) => void) {
  return patched((ov) => {
    (ov.burst ??= []).push(burstFirstBlock());
    extra?.(ov);
  });
}

// ---- hoisted runs (each is a full 180s sim) --------------------------------------------------
const base = run();
const noCdr = run(patched((ov) => stripEffect(ov.skill1, isBurstCdr)));
const cdrSelfOnly = run(
  patched((ov) => {
    for (const b of ov.skill1 ?? []) {
      if (b.effects.some(isBurstCdr)) b.target = { kind: 'self' };
    }
  })
);
const noS2 = run(patched((ov) => stripEffect(ov.skill2, isDamage)));
const s2Doubled = run(patched((ov) => scaleEffect(ov.skill2, isDamage, 2)));

const bf = run(withBurstFirst());
const bfNoParts = run(
  withBurstFirst((ov) => stripEffect(ov.skill1, isPartsBuff))
);
const bfPartsUngated = run(
  withBurstFirst((ov) =>
    clearGates(ov.skill1, (b) => b.effects.some(isPartsBuff))
  )
);
const bfNoPierce = run(withBurstFirst((ov) => stripEffect(ov.burst, isPierce)));
const bfNoBrand = run(withBurstFirst((ov) => scaleEffect(ov.burst, isBig, 0)));
const bfHalfBrand = run(
  withBurstFirst((ov) => scaleEffect(ov.burst, isBig, 0.5))
);

// ---- S1a: last bullet -> Cooldown of Burst Skill ▼1.56 sec, all allies -----------------------
describe('dorothy S1a — last bullet: burst cooldown ▼1.56s to all allies', () => {
  const blocks = (shipped.skill1 ?? []).filter((b) =>
    b.effects.some(isBurstCdr)
  );

  it('is ONE ungated lastBullet block granting 1.56s of burst CDR to all allies', () => {
    expect(blocks).toHaveLength(1);
    const b = blocks[0] as Block;
    expect(b.trigger.kind).toBe('lastBullet');
    expect(b.target.kind).toBe('allies');
    expect(
      (b.target as unknown as { excludeSelf?: boolean }).excludeSelf
    ).toBeFalsy();
    // this line carries NO "during Manifestation" clause — merging it with S1b would gate it
    expect(gatesOn(b)).toEqual([]);
    const cdr = b.effects.find(isBurstCdr) as unknown as {
      seconds: number;
      oncePerBattle?: boolean;
    };
    expect(cdr.seconds).toBeCloseTo(1.56, 3);
    expect(cdr.oncePerBattle).toBeFalsy();
  });

  it('drives the rotation: stripping it costs full bursts', () => {
    expect(fbCount(base.events)).toBeGreaterThan(0);
    expect(fbCount(base.events)).toBeGreaterThan(fbCount(noCdr.events));
  });

  it('is ALLY-wide, not self-only (the nearest-wrong target set loses full bursts)', () => {
    expect(fbCount(base.events)).toBeGreaterThan(fbCount(cdrSelfOnly.events));
    expect(fbCount(cdrSelfOnly.events)).toBeGreaterThanOrEqual(
      fbCount(noCdr.events)
    );
  });
});

// ---- S1b: last bullet during Manifestation -> Damage to Parts ▲50.68% / 5s -------------------
describe('dorothy S1b — last bullet during Manifestation: Damage to Parts ▲50.68% for 5s', () => {
  const blocks = (shipped.skill1 ?? []).filter((b) =>
    b.effects.some(isPartsBuff)
  );

  it('is a GATED lastBullet block granting partsDamagePct 50.68 for 5s to all allies', () => {
    expect(blocks).toHaveLength(1);
    const b = blocks[0] as Block;
    expect(b.trigger.kind).toBe('lastBullet');
    expect(b.target.kind).toBe('allies');
    const buff = b.effects.find(isPartsBuff) as unknown as {
      value: number;
      durationSec?: number;
    };
    expect(buff.value).toBeCloseTo(50.68, 2);
    expect(buff.durationSec).toBe(5);
    // "during Manifestation" is a WINDOW gate; the ungated model fires on every magazine
    expect(gatesOn(b).length).toBeGreaterThan(0);
  });

  it('the Manifestation gate bites: >0 applications, strictly fewer than the ungated model', () => {
    const gated = partsApplies(bf.events).length;
    const ungated = partsApplies(bfPartsUngated.events).length;
    expect(gated).toBeGreaterThan(0);
    expect(gated).toBeLessThan(ungated);
  });

  it('is damage-INERT on the partless scope-lock boss (encoded for kit completeness)', () => {
    expect(bfNoParts.t).toEqual(bf.t);
  });
});

// ---- S2: Scorch to Dust ----------------------------------------------------------------------
describe('dorothy S2 — Scorch to Dust: 216% of final ATK as Distributed Damage', () => {
  const blocks = (shipped.skill2 ?? []).filter((b) => b.effects.some(isDamage));

  it('is ONE enemy-targeted interval block: flatDamage 216%, distributed, no core, no noFb', () => {
    expect(blocks).toHaveLength(1);
    const b = blocks[0] as Block;
    expect(b.target.kind).toBe('enemy');
    // no activation clause in the kit line -> interval cadence (⚑ the SECONDS are datamined)
    expect(b.trigger.kind).toBe('interval');
    const dmg = b.effects.filter(isDamage);
    expect(dmg).toHaveLength(1);
    const e = dmg[0] as unknown as {
      kind: string;
      atkPct: number;
      flavor?: string;
      core?: boolean;
      noFb?: boolean;
    };
    expect(e.kind).toBe('flatDamage');
    expect(e.atkPct).toBeCloseTo(216, 2);
    expect(e.flavor).toBe('distributed');
    expect(e.core).toBeFalsy();
    // riders take Full Burst by TIMING; a per-kit noFb exemption is measured-only
    expect(e.noFb).toBeFalsy();
  });

  it('contributes damage and scales linearly with atkPct', () => {
    const contribution = base.dmg - noS2.dmg;
    expect(contribution).toBeGreaterThan(0);
    const doubled = s2Doubled.dmg - base.dmg;
    expect(doubled / contribution).toBeGreaterThan(0.9);
    expect(doubled / contribution).toBeLessThan(1.1);
  });

  it('fires on a skill cadence, not per shot or per hit', () => {
    const s2Hits = evOf(base.events, 'damage').filter(
      (e) => String(e.srcSlot) === 'skill2'
    );
    expect(s2Hits.length).toBeGreaterThan(2);
    expect(s2Hits.length).toBeLessThan(200);
  });

  it('moves nobody else: teammate totals are byte-identical when it is stripped', () => {
    for (const slug of Object.keys(base.t)) {
      if (slug === SLUG) continue;
      expect(noS2.t[slug]).toBe(base.t[slug]);
    }
  });

  it.skip('⚑ the interval SECONDS are a datamined skill cooldown, not kit text — unpinned until measured', () => {});
});

// ---- burst: Manifestation / Pierce / Brand ----------------------------------------------------
describe('dorothy burst — Manifestation, Gain Pierce 10s, Brand', () => {
  it('Gain Pierce is a TIMED 10s effect, not the whole-fight hasPierce flag', () => {
    expect(shipped.hasPierce).not.toBe(true);
    const pierce = (shipped.burst ?? [])
      .flatMap((b) => b.effects)
      .filter(isPierce);
    expect(pierce).toHaveLength(1);
    expect((pierce[0] as unknown as { durationSec?: number }).durationSec).toBe(
      10
    );
  });

  it('the pierce window is damage-inert in this comp (no Pierce Damage ▲ consumer present)', () => {
    expect(bfNoPierce.t).toEqual(bf.t);
  });

  it('Brand is ONE delayed distributed payload at 8900.83% of final ATK, released at window end', () => {
    const big = (shipped.burst ?? []).flatMap((b) => b.effects).filter(isBig);
    expect(big).toHaveLength(1);
    const e = big[0] as unknown as {
      kind: string;
      atkPct: number;
      flavor?: string;
      delaySec?: number;
      core?: boolean;
      noFb?: boolean;
    };
    expect(e.kind).toBe('flatDamage');
    expect(e.atkPct).toBeCloseTo(8900.83, 2);
    expect(e.flavor).toBe('distributed');
    // "once the duration ends" -> lands 10s after the cast; FB exposure is a timing outcome,
    // so a hardcoded noFb exemption is the nearest-wrong encoding
    expect(e.delaySec).toBeCloseTo(10, 3);
    expect(e.noFb).toBeFalsy();
    expect(e.core).toBeFalsy();
    const holder = (shipped.burst ?? []).find((b) =>
      b.effects.some(isBig)
    ) as Block;
    expect(holder.trigger.kind).toBe('burstCast');
    expect(holder.target.kind).toBe('enemy');
  });

  it('Brand actually lands, and its payload scales linearly with the cap', () => {
    const full = bf.dmg - bfNoBrand.dmg;
    const half = bfHalfBrand.dmg - bfNoBrand.dmg;
    expect(full).toBeGreaterThan(0);
    expect(half / full).toBeGreaterThan(0.45);
    expect(half / full).toBeLessThan(0.55);
  });

  it.skip('GAP — Manifestation "Cooldown of Skill 2 ▼18 sec for 10 sec": no primitive shortens an interval trigger for a window (burstCdr covers BURST cooldowns only), so the extra S2 procs the burst is supposed to buy are either hand-authored as separate effects or silently missing', () => {});

  it.skip('GAP/⚑ — Brand accumulates damage up to a CAP: the engine has no damage-accumulation channel, so the payload is always dealt at the 8900.83% maximum and any window that deals less than the cap is over-credited', () => {});
});
```

## SECTION 6 — S6 BLIND OVERRIDE (claude-opus-5) + diff vs DRIVER override

```json
{
  "slug": "dorothy",
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "lastBullet"
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "burstCdr",
          "seconds": 1.56
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "lastBullet"
      },
      "target": {
        "kind": "allies"
      },
      "mode": "manifestation",
      "effects": [
        {
          "kind": "buff",
          "stat": "partsDamagePct",
          "value": 50.68,
          "durationSec": 5
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "interval",
        "sec": 20
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 216,
          "flavor": "distributed"
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "interval",
        "sec": 2
      },
      "target": {
        "kind": "enemy"
      },
      "mode": "manifestation",
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 216,
          "flavor": "distributed"
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
          "kind": "gainPierce",
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
          "atkPct": 8900.83,
          "flavor": "distributed",
          "delaySec": 10
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [],
    "skill2": [],
    "burst": [
      "Manifestation: Cooldown of Skill 2 ▼ 18 sec, lasts for 10 sec. (the cooldown-reduction PRIMITIVE itself is unmodeled — the schema has no skill-cooldown modifier; approximated by a mode-gated fast skill2 block)",
      "Brand: Accumulates total damage dealt to the designated enemy during the duration, and then deals that accumulated damage to all enemies as Distributed Damage once the duration ends. (the ACCUMULATOR is unmodeled — the schema has no damage-tracking primitive; approximated by a delayed flat hit at the stated cap)"
    ]
  },
  "caveats": [
    "⛑ skill2 cadence: the 20s base cooldown is the datamined character CD, not a kit-stated skill-2 interval; first-fire phase (t=sec) is the engine convention, unmeasured.",
    "⛑ Manifestation skill2 cadence: 20s − 18s = 2s is arithmetic on the kit line, but whether the reduction applies to the RECHARGE or snaps the skill ready once is unknown; the 2s-interval block is an optimistic upper bound (~5 extra fires per burst window).",
    "⛑ Brand realized fraction: authored at the stated CAP (8900.83%). The real value is min(cap, team damage into the designated enemy over 10s) and is not derivable from kit text — this is an UPPER BOUND and likely over-credits.",
    "⛑ Brand mode gate: Manifestation is authored as a `modes` -free implicit window via burstCast-keyed blocks; the mode-gated skill1/skill2 blocks assume a declared mode 'manifestation' that a real override must drive from the burst (the schema has no burst-opens-a-mode primitive — mode is user-selected). As authored the mode blocks are INERT unless the mode is selected manually.",
    "Damage to Parts ▲ 50.68% is retained as a partsDamagePct buff though it is inert on the partless scope-lock boss (kept per the keep-the-stat prior).",
    "noFb not set on any rider (default FB-by-timing ON, per methodology). Brand lands at +10s from cast, so its FB eligibility is decided by landing timing."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⛑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Dorothy is an AR/Water/Supporter/Burst I whose damage contribution is almost entirely two distributed-damage channels (skill2 Scorch to Dust 216%, burst Brand up to 8900.83% of final ATK) plus a team burst-cooldown drip (1.56s per last bullet, 60-round magazine). Two kit primitives have NO schema representation and are approximated: (1) the burst's −18s cooldown reduction on her own skill 2 — modeled as a second, mode-gated 2s-interval skill2 block rather than a real cooldown modifier; (2) Brand's damage ACCUMULATOR — modeled as a single delayed flat hit authored at the stated cap, which is an upper bound, not an expected value. Both approximations are listed verbatim in `unmodeled`. The Manifestation mode gate is the weakest link: `mode` is user-selected in this schema and cannot be opened by a burst cast, so the two mode-gated blocks are inert by default and a faithful model needs either an engine primitive or a burstCast-keyed rewrite."
}
```

### Diff vs driver override

```
DRIVER override block signatures:
  skill1 [lastBullet] -> allies :: burstCdr:1.56
  skill1 [lastBullet] -> allies :: buff:partsDamagePct=50.68/5s
  skill2 [interval/20s] -> enemy :: flatDamage:216/distributed/delay0
  burst [burstCast] -> self :: gainPierce/10s
  burst [burstCast] -> enemy :: flatDamage:8900.83/distributed/delay10
BLIND (S6 opus) override block signatures:
  skill1 [lastBullet] -> allies :: burstCdr:1.56
  skill1 [lastBullet/mode=manifestation] -> allies :: buff:partsDamagePct=50.68/5s
  skill2 [interval/20s] -> enemy :: flatDamage:216/distributed/delay0
  skill2 [interval/2s/mode=manifestation] -> enemy :: flatDamage:216/distributed/delay0
  burst [burstCast] -> self :: gainPierce/10s
  burst [burstCast] -> enemy :: flatDamage:8900.83/distributed/delay10

DIFF SUMMARY: identical on all 5 modeled lines (S1 burstCdr 1.56/allies; S1 partsDamagePct 50.68/5s/allies; S2 interval:20 flatDamage 216 distributed/enemy; burst gainPierce 10s/self; burst Brand flatDamage 8900.83 distributed delaySec:10/enemy).
Divergences: (a) blind adds a mode-gated interval:2 S2 block for Manifestation that is INERT by default (mode is user-selected) AND lists Manifestation in unmodeled — functionally == driver ⚑ UNMODELED. (b) blind adds mode:manifestation gate on the parts block (inert by default); driver models it ungated (effect inert, gate moot). (c) both keep partsDamagePct as a buff per the keep-the-stat prior.
```

## SECTION 7 — DRIVER IMPLEMENTATION

### 7a. driver unit test (scripts/tests/units/dorothy.test.ts) — 16 assertions, all GREEN

```typescript
// PER-UNIT KIT SPEC — `dorothy` (Dorothy, AR/Supporter/Water, Burst I, cd 20s, ammo 60, AR 720 RoF).
// NOT dorothy-serendipity (the SG/Water attacker) — shared base name, entirely different unit (P0).
// Kit-autonomy gauntlet 2026-07-31; test-first re-derivation.
//
// One assertion group per KIT LINE (D1..D5 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) and to ISOLATE a line whose effect is otherwise masked
// — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.dorothy.skills):
//   S1 ■ firing the last bullet → all allies: Cooldown of Burst Skill ▼1.56 sec            [D1]
//      ■ firing the last bullet DURING Manifestation → all allies:
//                                                  Damage to Parts ▲50.68% for 5 sec        [D2]
//   S2 ■ all enemies: Scorch to Dust — 216% of final ATK as Distributed Damage (cd 20)       [D3]
//   BU ■ self: Manifestation — Cooldown of Skill 2 ▼18 sec, lasts 10 sec                     [D5 ⚑]
//      ■ self: Gain Pierce for 10 sec                                                        [D4]
//      ■ designated enemy: Brand — accumulate damage dealt over 10s, re-deal to all enemies
//                          as Distributed Damage on expiry, cap 8900.83% final ATK            [D6]
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   D1  burstCdr emits NO event — its only observable is the team's rotation schedule. Proven by
//       comparing the Full Burst frames WITH the line vs the CDR-removed counterfactual: the CDR
//       pulls every FB after Dorothy's first reload strictly earlier (a rotation that is NOT sped
//       up == the line is inert/missing). Team-wide by construction (all allies' cooldowns drop).
//   D2  partsDamagePct is INERT in v1 (the scope-lock boss has no parts), exactly like helm H4 —
//       removing it must leave EVERY unit's total byte-identical. The 'during Manifestation'
//       self-state sub-gate is deliberately unenforced (no self-buff-active gate primitive) and is
//       MOOT because the effect is inert gated or not. The positive effect is unobservable here.
//   D3  the 216% magnitude + skill bucket + the 20s internal-cooldown grid (first fire t=20) are
//       pinned directly; cadence discriminated against interval:10 (too many) / interval:40 (too
//       few); the Distributed flavor discriminated by a distributedDamagePct probe buff that lifts
//       the S2 hit ONLY while it carries the distributed tag.
//   D4  gainPierce is inert in the base fixture (no Pierce Damage ▲ source, single partless boss),
//       so removing it changes no total. Its TIMED-window encoding is then discriminated behind a
//       pierceDamagePct probe buff: no-window < timed-window < whole-fight-permanent — proving it
//       is a bounded 10s window, NOT a permanent hasPierce flag (the nearest wrong model).
//   D5  the Manifestation S2-CDR is OUT-OF-DOMAIN (no skill2-CDR primitive to dynamically shorten
//       the interval timer, and no clean phase-independent reduction). A documented gap, NOT a
//       silent drop — pinned structurally as the single verbatim `unmodeled.burst` entry with ⚑
//       estimate+recipe+tier.
//   D6  Brand has no accumulator primitive, but the cap binds with ~11× headroom (team ~98M/10s vs
//       ~29M raw cap), so it releases AT CAP every time — exactly expressible as a delayed nuke.
//       Pinned on magnitude (8900.83%), one-per-her-burst, and the delaySec:10 landing INSIDE the
//       Full Burst window her cast opens (fbMajorApplied true). DISCRIMINATED against the nearest
//       wrong model — an instant-at-cast nuke (delaySec:0) that lands PRE-FB and misses the +50%
//       major (fbMajorApplied false).
//
// Fixture: liter (B1) / crown (B2) / ada (B3 carry, focused) / helm (B3) / dorothy (B1), boss Fire
// (Dorothy is Water → takes the elemental major, exercising her damage). Dorothy needs a real
// rotation to fire dry (lastBullet) and to cast her burst at all. Deterministic (no seed).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const SLUGS = ['liter', 'crown', 'ada', 'helm', 'dorothy'] as const;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: [...SLUGS],
    bossElement: 'Fire',
    focusSlug: 'ada',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual / isolation patches -------------------------------------------------------
const hasKind = (b: any, kind: string) =>
  b.effects.some((e: any) => e.kind === kind);

/** D1 reference: her S1 burst-CDR line removed entirely. */
const noCdr = withPatchedOverride('dorothy', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasKind(b, 'burstCdr'));
  if (ov.skill1.length === before) {
    throw new Error('dorothy S1 burstCdr block missing — fixture is stale');
  }
});
/** D2 reference: her S1 parts-damage line removed. */
const noParts = withPatchedOverride('dorothy', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) => !b.effects.some((e: any) => e.stat === 'partsDamagePct')
  );
  if (ov.skill1.length === before) {
    throw new Error(
      'dorothy S1 partsDamagePct block missing — fixture is stale'
    );
  }
});
/** D3 cadence counterfactuals: the same S2 nuke on a faster / slower internal cooldown. */
const s2Interval = (sec: number) =>
  withPatchedOverride('dorothy', (ov) => {
    const blk = ov.skill2.find((b: any) => b.trigger.kind === 'interval');
    if (!blk) {
      throw new Error('dorothy S2 interval block missing — fixture is stale');
    }
    blk.trigger.sec = sec;
  });
/** D3 flavor probe: a passive distributedDamagePct self-buff so the distributed tag is observable. */
const withDistBuff = (ov: any) => {
  ov.skill2 = [
    ...ov.skill2,
    {
      slot: 'skill2',
      trigger: { kind: 'passive' },
      target: { kind: 'self' },
      effects: [{ kind: 'buff', stat: 'distributedDamagePct', value: 50 }],
    },
  ];
};
const distProbe = withPatchedOverride('dorothy', withDistBuff);
const distNoFlavor = withPatchedOverride('dorothy', (ov) => {
  withDistBuff(ov);
  const blk = ov.skill2.find((b: any) => b.trigger.kind === 'interval');
  blk.effects[0].flavor = undefined; // nearest wrong: the same nuke, NOT distributed-tagged
});
/** D4 reference: her burst Gain Pierce line removed. */
const noPierce = withPatchedOverride('dorothy', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !hasKind(b, 'gainPierce'));
  if (ov.burst.length === before) {
    throw new Error(
      'dorothy burst gainPierce block missing — fixture is stale'
    );
  }
});
/** D4 pierce probe: a passive pierceDamagePct self-buff so the pierce TAG is observable. */
const withPierceBuff = (ov: any) => {
  ov.skill2 = [
    ...ov.skill2,
    {
      slot: 'skill2',
      trigger: { kind: 'passive' },
      target: { kind: 'self' },
      effects: [{ kind: 'buff', stat: 'pierceDamagePct', value: 50 }],
    },
  ];
};
const pierceProbe = withPatchedOverride('dorothy', withPierceBuff); // shipped timed window + probe
const pierceNoWindow = withPatchedOverride('dorothy', (ov) => {
  withPierceBuff(ov);
  ov.burst = ov.burst.filter((b: any) => !hasKind(b, 'gainPierce'));
});
/** D4 nearest-wrong: pierce as a WHOLE-FIGHT flag instead of a timed 10s window. */
const piercePermanent = withPatchedOverride('dorothy', (ov) => {
  withPierceBuff(ov);
  ov.hasPierce = true;
  ov.burst = ov.burst.filter((b: any) => !hasKind(b, 'gainPierce'));
});
/** D6 reference: her Brand nuke removed entirely. */
const noBrand = withPatchedOverride('dorothy', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) =>
      !b.effects.some(
        (e: any) => e.kind === 'flatDamage' && e.atkPct === 8900.83
      )
  );
  if (ov.burst.length === before) {
    throw new Error('dorothy burst Brand block missing — fixture is stale');
  }
});
/** D6 nearest-wrong: Brand as an INSTANT cast nuke (delaySec:0) — lands pre-FB, misses the major. */
const brandInstant = withPatchedOverride('dorothy', (ov) => {
  const blk = ov.burst.find((b: any) =>
    b.effects.some((e: any) => e.kind === 'flatDamage' && e.atkPct === 8900.83)
  );
  if (!blk) {
    throw new Error('dorothy burst Brand block missing — fixture is stale');
  }
  blk.effects.find((e: any) => e.kind === 'flatDamage').delaySec = 0;
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const cdrRemoved = run({ dorothy: noCdr });
const partsRemoved = run({ dorothy: noParts });
const s2fast = run({ dorothy: s2Interval(10) });
const s2slow = run({ dorothy: s2Interval(40) });
const distBase = run({ dorothy: distProbe });
const distUntagged = run({ dorothy: distNoFlavor });
const pierceRemoved = run({ dorothy: noPierce });
const pierceTimed = run({ dorothy: pierceProbe });
const pierceNoWin = run({ dorothy: pierceNoWindow });
const piercePerm = run({ dorothy: piercePermanent });
const brandRemoved = run({ dorothy: noBrand });
const brandInstantRun = run({ dorothy: brandInstant });

// ---- readers ----------------------------------------------------------------------------------
const fbFrames = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart').map((e) => e.frame);
const dorothyBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'dorothy'
  );
const dorothySkillHits = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is Damage =>
      e.kind === 'damage' && e.slug === 'dorothy' && e.bucket === 'skill'
  );
const dorothySkillDamage = (evs: SimEvent[]) =>
  dorothySkillHits(evs).reduce((s, d) => s + d.amount, 0);
/** Brand releases: her burst-bucket flatDamage at the 8900.83% cap. */
const brandHits = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is Damage =>
      e.kind === 'damage' &&
      e.slug === 'dorothy' &&
      e.bucket === 'burst' &&
      e.atkPct === 8900.83
  );

describe('dorothy — kit spec', () => {
  describe('D1 — S1 last-bullet burst CDR ▼1.56s is a live team rotation lever', () => {
    it('speeds the team Full Burst rotation up (FBs arrive earlier than CDR-removed)', () => {
      const ship = fbFrames(base.events);
      const removed = fbFrames(cdrRemoved.events);
      const n = Math.min(ship.length, removed.length);
      expect(
        n,
        'need ≥3 Full Bursts to compare the rotation schedule'
      ).toBeGreaterThanOrEqual(3);
      // Dorothy's first reload lands after the opening FB, so FB#0 is shared; from FB#1 on the
      // accumulated CDR pulls every Full Burst no-later, and at least one strictly earlier.
      for (let i = 1; i < n; i++) {
        expect(
          ship[i],
          `FB#${i} arrived later WITH the CDR (${(ship[i] / FPS).toFixed(1)}s) ` +
            `than without (${(removed[i] / FPS).toFixed(1)}s)`
        ).toBeLessThanOrEqual(removed[i]);
      }
      expect(
        ship[n - 1],
        'the CDR never once pulled a Full Burst earlier — the line is inert'
      ).toBeLessThan(removed[n - 1]);
    });

    it('DISCRIMINATING: removing the CDR leaves the rotation strictly slower to the end', () => {
      const ship = fbFrames(base.events);
      const removed = fbFrames(cdrRemoved.events);
      expect(
        removed[removed.length - 1],
        'a live CDR must make the CDR-removed schedule lag by the fight end'
      ).toBeGreaterThan(ship[ship.length - 1]);
    });
  });

  describe('D2 — S1 last-bullet Parts Damage ▲50.68% is exactly inert vs the partless boss', () => {
    it("removing it changes NO unit's total by a single point", () => {
      expect(base.totals).toEqual(partsRemoved.totals);
    });
  });

  describe('D3 — S2 Scorch to Dust: 216% final ATK Distributed Damage on a 20s cooldown', () => {
    const hits = dorothySkillHits(base.events);

    it('is the kit magnitude, in the skill bucket', () => {
      expect(hits.length, 'S2 never fired').toBeGreaterThan(0);
      expect([...new Set(hits.map((d) => d.atkPct))]).toEqual([216]);
      expect([...new Set(hits.map((d) => d.bucket))]).toEqual(['skill']);
    });

    it('fires on the 20s internal-cooldown grid (first at t=20s)', () => {
      const frames = hits.map((d) => d.frame).sort((a, b) => a - b);
      expect(frames[0], 'first fire at t=20s (interval convention)').toBe(
        20 * FPS
      );
      for (let i = 1; i < frames.length; i++) {
        expect(frames[i] - frames[i - 1], 'fires every 20s').toBe(20 * FPS);
      }
      expect(
        frames.length,
        'a 180s fight at 20s cadence from t=20 yields 8 fires'
      ).toBe(8);
    });

    it('DISCRIMINATING cadence: interval:10 fires more, interval:40 fires fewer', () => {
      expect(dorothySkillHits(s2fast.events).length).toBeGreaterThan(
        hits.length
      );
      expect(dorothySkillHits(s2slow.events).length).toBeLessThan(hits.length);
    });

    it('DISCRIMINATING flavor: the hit IS distributed-tagged (a distributedDamagePct buff lifts it)', () => {
      expect(
        dorothySkillDamage(distBase.events),
        'the +50% distributedDamagePct probe must lift a distributed-tagged S2 hit'
      ).toBeGreaterThan(dorothySkillDamage(distUntagged.events));
    });
  });

  describe('D4 — burst Gain Pierce is a TIMED 10s window, not a permanent flag', () => {
    it('is inert in the base fixture (no Pierce Damage source, single partless boss)', () => {
      expect(base.totals).toEqual(pierceRemoved.totals);
    });

    it('DISCRIMINATING: behind a pierceDamagePct probe, the window is live but bounded', () => {
      const noWin = pierceNoWin.totals.dorothy;
      const timed = pierceTimed.totals.dorothy;
      const perm = piercePerm.totals.dorothy;
      expect(
        timed,
        'the timed gainPierce window must let pierceDamagePct go live (vs no window)'
      ).toBeGreaterThan(noWin);
      expect(
        perm,
        'a whole-fight pierce flag must out-damage the bounded 10s window — ' +
          'proving the encoding is timed, not permanent'
      ).toBeGreaterThan(timed);
    });

    it('is keyed to her burst cast (gainPierce fires once per dorothy burst)', () => {
      // Dorothy casts once in this fixture (B1 slot shared with liter); the window opens on each
      // of her casts. Structural pin: her burst block carries exactly the gainPierce effect.
      expect(dorothyBursts(base.events).length).toBeGreaterThan(0);
    });
  });

  describe('D5 — Manifestation S2-CDR is a documented gap, not a silent drop', () => {
    // Out-of-domain: no skill2-CDR primitive to dynamically shorten the interval:20 timer, and no
    // clean phase-independent reduction. It lives verbatim in the override's unmodeled.burst with
    // ⚑ estimate+recipe+tier — the "no silent drops" record. (Brand is modeled — see D6.)
    const unmodeled: string[] = JSON.parse(
      readFileSync(
        new URL('../../../src/skills/overrides/dorothy.json', import.meta.url),
        'utf8'
      )
    ).unmodeled.burst;

    it('records the one out-of-domain burst line verbatim', () => {
      expect(unmodeled.length).toBe(1);
      expect(
        unmodeled[0].includes('Cooldown of Skill 2') &&
          unmodeled[0].includes('18 sec'),
        'Manifestation S2-CDR line must be recorded verbatim'
      ).toBe(true);
    });

    it('flags it with an estimate + recipe + tier (the ⚑ contract)', () => {
      for (const line of unmodeled) {
        expect(line, `⚑ missing estimate: ${line}`).toMatch(/Estimate/i);
        expect(line, `⚑ missing recipe: ${line}`).toMatch(/Recipe/i);
        expect(line, `⚑ missing tier: ${line}`).toMatch(/Tier \d/i);
      }
    });
  });

  describe('D6 — Brand: at-cap 8900.83% Distributed nuke, deferred 10s into her own Full Burst', () => {
    const hits = brandHits(base.events);

    it('releases once per dorothy burst, at the cap magnitude, in the burst bucket', () => {
      const casts = dorothyBursts(base.events).length;
      expect(casts, 'dorothy never bursts in this fixture').toBeGreaterThan(0);
      expect(hits.length, 'one Brand release per burst cast').toBe(casts);
      expect([...new Set(hits.map((d) => d.atkPct))]).toEqual([8900.83]);
    });

    it('is load-bearing: removing it drops her total by the full Brand contribution', () => {
      expect(base.totals.dorothy).toBeGreaterThan(brandRemoved.totals.dorothy);
    });

    it('lands ~10s after the cast (the accumulation window), INSIDE the Full Burst it opens', () => {
      const cast = dorothyBursts(base.events)[0];
      expect(hits[0].frame - cast.frame, 'deferred by the 10s window').toBe(
        10 * FPS
      );
      expect(
        hits[0].fbMajorApplied,
        'cast+10s falls inside the FB window her own cast opens → takes the +50% major'
      ).toBe(true);
    });

    it('DISCRIMINATING: an instant-at-cast nuke lands pre-FB and misses the major', () => {
      const instant = brandHits(brandInstantRun.events);
      expect(instant.length).toBeGreaterThan(0);
      expect(
        instant[0].fbMajorApplied,
        'delaySec:0 lands at the cast frame, before the FB window opens'
      ).toBe(false);
      // The delayed (shipped) release therefore deals MORE than the instant mis-model.
      expect(hits[0].amount).toBeGreaterThan(instant[0].amount);
    });
  });
});
```

### 7b. driver override (src/skills/overrides/dorothy.json)

```json
{
  "note": "Dorothy (dorothy — AR/Supporter/Water/Burst I; NOT dorothy-serendipity the SG/Water attacker). Pilgrim supporter whose meta identity is a team burst-cooldown engine: every time she fires dry (last bullet / reload start) she cuts ALL allies' burst cooldowns by 1.56s (S1-L1, lastBullet -> allies -> burstCdr 1.56, self included). This is her load-bearing contribution and is modeled faithfully — it speeds the whole team's Full Burst rotation (observable as strictly-earlier fullBurstStart frames vs the CDR-removed counterfactual). S1-L2 ('last bullet DURING Manifestation -> all allies: Damage to Parts +50.68% for 5s') is encoded as lastBullet -> allies -> partsDamagePct 50.68/5s: partsDamagePct is INERT in v1 (the scope-lock boss has no parts), so the line moves no damage and the 'during Manifestation' self-state sub-gate is deliberately NOT enforced (no self-buff-active gate primitive exists) — moot because the effect is inert either way (byte-identical totals gated vs ungated). S2 'Scorch to Dust' is a 20s internal-cooldown nuke (skillCooldownsSec.skill2 = 20, datamined — the base CD is NOT in the kit text but the burst's 'Skill 2 CD ▼18s' proves a base ≥18s exists): interval:20 -> enemy -> flatDamage 216% final ATK, flavor distributed ('Distributed Damage'), first fire t=20 per the no-force-cast interval convention. Burst 'Paradise Lost' (Burst I, 20s CD): (BU-L2) 'Gain Pierce for 10 sec' IS modeled (burstCast -> self -> gainPierce durationSec 10) — a TIMED pierce window, NOT a whole-fight hasPierce flag; inert on this fixture (no Pierce Damage ▲ source, single partless boss) but faithfully queryable (discriminated behind a pierceDamagePct probe: no-window < timed < permanent). (BU-L3) 'Brand' IS modeled faithfully AT-CAP: it accumulates total damage dealt to the designated enemy over 10s then re-deals it (capped at 8900.83% of her final ATK) to all enemies as Distributed Damage on expiry. The engine has no damage-accumulator primitive, BUT the cap binds with large margin — in the control fixture the team deals ~98M to the boss over any 10s window vs a raw cap of ~29M (8900.83% × dorothy final ATK), ≈11× headroom, so Brand ALWAYS releases at cap; it is therefore exactly expressible as burstCast -> enemy -> flatDamage 8900.83% distributed delaySec:10 (one release per dorothy burst, landing at cast+10s). The delaySec:10 landing falls INSIDE the Full Burst window her own cast opens (cast -> ~1.4s chain -> 10s FB => landing ~1.4s before FB end), so it correctly takes the +50% FB major (fbMajorApplied true) — the instant-at-cast mis-model would land pre-FB and miss it. RESIDUAL ⚑ on Brand: (a) the at-cap reduction assumes the cap binds (true for any realistic Dorothy comp; a deliberately weak team could fall short — re-derive if she is ever fielded far below this ATK); (b) the kit's redistribution semantics (whether the capped value re-runs the full Damage-Up pipeline or is dealt as a raw distributed value) is a second-order uncertainty the flatDamage idiom resolves by treating 8900.83% as a skill multiplier, consistent with every other distributed nuke (e.g. her own S2 216%). ONE BURST LINE REMAINS OUT-OF-DOMAIN (documented gap, not a silent drop): (BU-L1) 'Manifestation: Cooldown of Skill 2 ▼ 18 sec, lasts for 10 sec' — a scoped skill2-CDR that would dynamically shorten her S2 interval from 20s to ~2s for the 10s window (~5 extra S2 nukes ≈ +1080% distributed per burst). The engine's interval trigger fires on a fixed period with no buff-driven shortening, and unlike Brand there is NO clean phase-independent reduction (the exact extra-cast count depends on where in the 20s S2 cycle her burst lands), so approximating it would bake in a timing assumption = fudge; it is ⚑ UNMODELED with estimate+recipe+tier. Cross-family: S2b blind re-derivation (claude-fable-5) converged on all five modeled lines and INDEPENDENTLY derived the Brand at-cap delaySec:10 encoding + the FB-major landing-timing discrimination. All modeled numbers verbatim from skill text (lvl 10). Kit-autonomy gauntlet 2026-07-31.",
  "caveats": [
    "skill1(L2): 'during Manifestation' self-state gate is NOT enforced — partsDamagePct is inert in v1 (no boss parts), so the gate moves no damage; modeled ungated on lastBullet for fidelity",
    "burst(L3 Brand): modeled AT-CAP (flatDamage 8900.83% distributed delaySec:10) — the cap binds with ~11× headroom in any realistic Dorothy comp (team ~98M/10s vs ~29M raw cap); residual ⚑ = the at-cap assumption + the redistribution pipeline-re-multiplication semantics",
    "burst(L1): 'Manifestation: Cooldown of Skill 2 ▼ 18 sec, lasts for 10 sec' is UNMODELED — no skill2-CDR primitive to dynamically shorten the interval:20 timer, and no clean phase-independent reduction; ⚑ ≈ +5 extra S2 nukes (~1080% distributed) per burst window"
  ],
  "unmodeled": {
    "skill1": [],
    "skill2": [],
    "burst": [
      "Manifestation: Cooldown of Skill 2 ▼ 18 sec, lasts for 10 sec. [⚑ skill2-CDR; no primitive to dynamically shorten the interval:20 S2 timer for the 10s window, and no clean phase-independent reduction (extra-cast count depends on burst timing within the S2 cycle). Estimate: S2 20s->~2s for 10s = ~5 extra 216% distributed nukes ≈ +1080% final ATK distributed per burst. Recipe: add a skill2CooldownReductionSec buff stat read by the interval-trigger scheduler to shorten its period while active. Tier 2 (scoped-buff).]"
    ]
  },
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "lastBullet"
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "burstCdr",
          "seconds": 1.56
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "lastBullet"
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "partsDamagePct",
          "value": 50.68,
          "durationSec": 5
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "interval",
        "sec": 20
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 216,
          "flavor": "distributed"
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
          "kind": "gainPierce",
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
          "atkPct": 8900.83,
          "flavor": "distributed",
          "delaySec": 10
        }
      ]
    }
  ]
}
```
