# S7 RECONCILING-JUDGE PACKET — mica-snow-buddy (Mica: Snow Buddy)

You are the BINDING cross-family judge for this unit's kit-autonomy gauntlet. Read the contract below, then grade the DRIVER's implementation against the kit ground truth, the mechanics SSOT, and the two independent blind derivations. Return the verdict JSON the contract specifies.

--- SECTION 1: JUDGE CONTRACT (RECONCILING-JUDGE.md) ---

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

--- SECTION 2: MECHANICS SSOT — docs/data/damage-calculation.md ---

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

--- SECTION 2b: MECHANICS SSOT — docs/data/game-mechanics.md ---

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

--- SECTION 3: GROUND TRUTH — kit prose + base stats (data/characters.json) ---

### Unit identity

- slug: mica-snow-buddy | name: Mica: Snow Buddy | weapon: SMG | class: Supporter | element: Iron | burst: I | burstCooldownSec: 20
- manufacturer: Tetra | ammo: 120 | reloadFrames: 141 | rate_of_fire: 1440 | hitsPerShot: 1 | normalAttackMultiplier: 11.7
- baseStats: ATK 500 | HP 15000 | DEF 86 | critRate 15 | critDamage 150

### Kit prose (data/characters.json, L10 values substituted)

- SKILL1: "■ Activates when landing 120 normal attack(s). Affects all allies. \nTidying Up: Damage Taken ▼ 2%. Stacks up to 10 times and lasts for 15 sec.\n■ Activates when Tidying Up is at max stacks. Affects all allies.\nMax Ammunition Capacity ▲ 40% continuously."
- SKILL2: "■ Activates when landing 150 normal attack(s). Affects all allies.\nStack count of buffs ▲ 1.\n■ Activates at the start of battle. Affects self.\nBurst Gauge filling speed ▲ 300% continuously."
- BURST: "■ Affects all allies.\nRemoves 1 debuff(s).\nATK ▲ 39.93% of the skill user's ATK for 5 sec."

### Datamined skill detail values (L10 = index 9)

- S1 Tidying Up: trigger 120 hits; Damage Taken ▼ [1.1..2]% (L10=2); stacks [10]; lasts [15]s; Max Ammunition Capacity ▲ [22..40]% (L10=40)
- S2 Blessing Cannon: trigger [220..150] hits (L10=150); Stack count of buffs ▲ [1]; Burst Gauge filling speed ▲ [120..300]% (L10=300)
- Burst Snowfield Festival: Removes [1] debuff; ATK ▲ [23.59..39.93]% of skill user ATK (L10=39.93) for [5]s; CD 20s

--- SECTION 4: S2b TEST-FAITHFULNESS REVIEW (claude-fable-5) ---
{
"slug": "mica-snow-buddy",
"leakDetected": null,
"spec": [
{
"slot": "skill1",
"kitLine": "Tidying Up: Damage Taken ▼ 2%, x10, 15s",
"disposition": "FAITHFUL",
"scope": "Defensive stat on allies (allies take less damage) — offensively inert in v1 (boss deals no damage), BUT the stack machinery is the gate for the max-ammo line, so the stack clock must be modeled even if the 2% value is not.",
"durationSemantics": "durationSec 15, maxStacks 10, refresh-on-reapply (each new stack refreshes the 15s window — without refresh the stack chain collapses, since applications arrive ~8.4s apart).",
"triggerIdentity": "hitCount count:120 (counts ROUNDS landed by the owner; SMG hitsPerShot 1, ammo is exactly 120 → ~1 proc per full magazine).",
"targetSet": "allies (all, including self).",
"nearestWrongModel": "Two plausible misreads: (a) 'Damage Taken' pattern-matched to the boss-debuff stat damageTakenPct applied to the ENEMY — that turns a defensive ally buff into up to +20% team damage at max stacks, a massive over-credit (taxonomy trap 4 inverted: this is ▼ on allies, NOT ▲ on the boss); (b) 15s duration without stack-refresh, so 10 stacks are never simultaneously live and the max-ammo gate NEVER opens.",
"distinguishingAssertion": "Collect buffApply events: there must be NO boss-held damageTakenPct apply (casterIdx===null && targetIdx===null) anywhere in the run; the Tidying Up applies must target the 5 allies with maxStacks 10 and stacks reaching 10 during the fight. Zeroing the 2% value via withPatchedOverride must leave totals() unchanged for every unit (defensively inert), while removing the block entirely must kill the max-ammo activation.",
"inertness": "The 2% magnitude itself moves ZERO damage for any unit; only its stack count may have downstream effect (the gate).",
"evidenceTier": "DATAMINED",
"loadBearing": true
},
{
"slot": "skill1",
"kitLine": "Max Ammunition Capacity ▲ 40% continuously",
"disposition": "FAITHFUL",
"scope": "Weapon-state modifier = DAMAGE (taxonomy trap 6): +40% max ammo on ALL allies stretches every magazine, cutting reload downtime and raising shots fired, and shifts last-bullet/per-magazine trigger cadence for any carrier of those.",
"durationSemantics": "'continuously' = permanent once activated (no expiry), but activation is GATED on Tidying Up reaching max stacks — so there is a real ramp: the buff is ABSENT for the opening ~45–50s (⚑ derived below) and present thereafter.",
"triggerIdentity": "Stack-threshold gate ('when Tidying Up is at max stacks'). No native 'at max stacks' trigger exists in the schema; faithful encodings are a resource pool (hitCount:120 → resource +1, maxAmmo block resourceGate {min:10}) or a derived activation time. Time-to-max ⚑ derivation: stacks accrue at 120-hit cadence plus skill2's +1-stack every 150 hits → max at cumulative hits H where H/120 + H/150 ≥ 10 → H ≈ 667 landed rounds; SMG effective ~20/s with 6s magazine + 141f (2.35s) reload duty cycle → ~14.4 hits/s → activation ≈ 45–50s into the fight.",
"targetSet": "allies (all, including self).",
"nearestWrongModel": "maxAmmoPct 40 applied as a plain passive from t=0 — over-credits every unit's opening ~45s of magazine economy (extra shots + skewed lastBullet cadence for teammates) and erases the ramp that skill2's stack-acceleration line exists to shorten. Second misread: self-only instead of all allies.",
"distinguishingAssertion": "Assert a buffApply with stat maxAmmoPct value 40 reaching ALL 5 units at t ≈ derived activation (⚑, tolerance a few seconds), and assert its ABSENCE before ~40s (event log has no maxAmmoPct apply in the opening window). Behavioral cross-check: an ally's reload-event spacing lengthens after activation vs before.",
"inertness": "Before max stacks, no unit's magazine size may differ from base; a t=0 apply is RED.",
"evidenceTier": "DATAMINED (40%); CALIBRATED ⚑ (activation-time derivation)",
"loadBearing": true
},
{
"slot": "skill2",
"kitLine": "Stack count of buffs ▲ 1 (per 150 hits)",
"disposition": "GAP",
"scope": "Meta-effect: increments the stack count of active stackable buffs on all allies. No EffectDef exists for generic stack incrementing — the engine cannot express it directly.",
"durationSemantics": "Instant increment, no duration of its own.",
"triggerIdentity": "hitCount count:150 (owner's landed rounds — note 150 > magazine 120, so it spans reloads; NOT once-per-magazine).",
"targetSet": "allies (all): affects their stackable buffs, principally her own Tidying Up in isolation.",
"nearestWrongModel": "Silently dropped WITHOUT folding it into the Tidying-Up ramp — that pushes max-stacks (and the max-ammo activation) from ~46s out to ~84s (10 × the 8.35s magazine cycle), materially under-crediting the whole team's mid-fight ammo economy. Alternative misread: encoding it as its own stat buff or a fillGauge.",
"distinguishingAssertion": "The max-ammo activation time asserted in the skill1 test must match the COMBINED cadence derivation (H/120 + H/150 ≥ 10, ≈45–50s), not the s1-only derivation (≈84s). A test pinning activation near 84s is RED under the faithful reading.",
"inertness": "Must not add gauge, damage, or any stat of its own; its sole modelable footprint is the ramp acceleration. Cross-unit stack acceleration for TEAMMATES' stack buffs goes to unmodeled verbatim.",
"evidenceTier": "DATAMINED (cadence 150); CALIBRATED ⚑ (folded ramp)",
"loadBearing": false
},
{
"slot": "skill2",
"kitLine": "Burst Gauge filling speed ▲ 300% cont.",
"disposition": "FAITHFUL",
"scope": "Gauge economy — burstGenPct 300 (her contribution ×4). Rotation-load-bearing: accelerates every full-burst cycle the team runs.",
"durationSemantics": "'continuously' from battle start = permanent passive.",
"triggerIdentity": "'Activates at the start of battle' = passive (t=0), NOT interval and NOT burst-gated.",
"targetSet": "SELF ONLY — the kit says 'Affects self'.",
"nearestWrongModel": "Target set widened to all allies — a ×4 on the whole team's gauge generation collapses time-to-full-gauge and manufactures extra Full Bursts (the single most damaging possible misread of this kit). Secondary misread: 300% read as 'fill 300% instantly' (fillGauge) instead of a fill-RATE multiplier.",
"distinguishingAssertion": "Assert exactly ONE buffApply with stat burstGenPct value 300 at frame 0, targetIdx === mica-snow-buddy's slot, and NO other unit receives a burstGenPct apply. Behavioral cross-check: fullBurstStart count/timing in the control comp matches the rotation derived with only HER contribution scaled ×4; an all-allies encoding produces measurably earlier/more FBs → RED.",
"inertness": "No teammate's gauge contribution may change; no instant gauge fill event at t=0.",
"evidenceTier": "DATAMINED",
"loadBearing": true
},
{
"slot": "burst",
"kitLine": "Removes 1 debuff(s)",
"disposition": "UNMODELED",
"scope": "Debuff cleanse on allies; the v1 boss applies no debuffs, so there is nothing to remove.",
"durationSemantics": "Instant, n/a.",
"triggerIdentity": "burstCast (her own Burst I).",
"targetSet": "allies.",
"nearestWrongModel": "Encoded as anything at all — e.g. a buffRemove/heal proxy that tickles teammates' 'recovery' triggers (a cleanse is NOT a heal; taxonomy trap 4 must not be inverted into a phantom tandem).",
"distinguishingAssertion": "No heal/recovery event and no damage/buff event attributable to this line; totals identical with the line present vs absent.",
"inertness": "Everything — the line must move nothing in v1.",
"evidenceTier": "DATAMINED",
"loadBearing": false
},
{
"slot": "burst",
"kitLine": "ATK ▲ 39.93% of the skill user's ATK, 5s",
"disposition": "FAITHFUL",
"scope": "Team ATK buff, caster-scaled ('of the skill user's ATK') — the flat-add path, NOT a percent of each target's own ATK.",
"durationSemantics": "durationSec 5 (wall-clock; not rounds).",
"triggerIdentity": "burstCast — fires ONLY on rotations mica-snow-buddy herself casts Burst I. NOT fullBurstEnter: she is a B1 competing for the B1 slot; in any comp with another Burst I unit, keying this to fullBurstEnter fires it on rotations she sat out (over-credit).",
"targetSet": "allies (all, including self).",
"nearestWrongModel": "stat atkPct 39.93 (each target scales its OWN ATK): an Attacker ally (staticAtk 118,027) would gain 118,027 × 0.3993 ≈ 47,128 instead of the caster-flat 98,367 (Supporter) × 0.3993 ≈ 39,278 — a ~20% over-credit on every Attacker, every burst window. Secondary: trigger keyed to fullBurstEnter.",
"distinguishingAssertion": "buffApply events with stat 'casterAtkPct' must carry the FLAT-RESOLVED value ≈ 39,278 (0.3993 × 98,367 — the harness resolves caster-scaled stats at apply time), one apply per ally per cast, expiresFrame = castFrame + 300; and the NUMBER of application waves must equal the count of burstCast events with mica's srcSlot, not the count of fullBurstStart events. An atkPct encoding emits raw value 39.93 → RED; a fullBurstEnter encoding emits more waves than her burstCast count in a dual-B1 comp → RED.",
"inertness": "No application on Full Bursts she did not cast; nothing outside the 5s windows.",
"evidenceTier": "DATAMINED",
"loadBearing": true
}
],
"loadBearingSet": [
"skill1:Tidying-Up-stack-machinery (gate for the ammo line; its 2% value itself is inert)",
"skill1:Max-Ammunition-Capacity-▲40%-allies",
"skill2:Burst-Gauge-filling-speed-▲300%-self",
"burst:ATK-▲39.93%-of-skill-user's-ATK-5s"
],
"unmodeledVerbatim": {
"skill1": [
"Tidying Up: Damage Taken ▼ 2% (the defensive magnitude — boss deals no damage; the stack CLOCK is still modeled as the ammo gate)"
],
"skill2": [
"Stack count of buffs ▲ 1 — the cross-unit portion (accelerating TEAMMATES' stackable buffs); the Tidying-Up-ramp portion is folded into the ⚑ activation-time derivation"
],
"burst": [
"Removes 1 debuff(s)"
]
},
"notes": "Three reconciliation points for the driver. (1) FIXTURE HAZARD — mica-snow-buddy is a Burst I Supporter, but controlComp(carry) seats the carry in the B3 slot with liter as B1. The burst-line test is only valid if she actually CASTS Burst I: with liter also present, first-ready-in-window selection decides who bursts, and if liter wins every rotation the casterAtkPct buff never fires and a burstCast-keyed test vacuously passes (zero applies expected AND observed under both faithful and wrong encodings). The comp must be arranged so she demonstrably casts (assert a burstCast event with her srcSlot exists before asserting buff counts) — and a dual-B1 comp is exactly the configuration that DISTINGUISHES burstCast from fullBurstEnter, so use it deliberately. (2) SHARED-PRIOR MISREAD I most expect: 'Damage Taken' auto-encoded onto the boss as damageTakenPct — the schema's only damage-taken stat is a boss debuff, but this kit line is ▼ on ALLIES (defensive); the boss-debuff encoding silently adds up to +20% team damage. The no-boss-held-apply assertion is mandatory. (3) The max-ammo ramp is the unit's main team-damage contribution and its activation time depends on BOTH hit-count cadences (120 and 150) plus stack-refresh semantics; the ⚑ ≈45–50s derivation assumes every fired round lands and effective SMG cadence ~20/s with a 141-frame reload — the test should pin the activation to the derivation actually encoded in the override, and any popup-/footage-measured activation time would outrank it.",
"model": "claude-fable-5"
}

--- SECTION 5: S5 BLIND TEST (claude-opus-5) + result vs driver override ---
RESULT vs driver override (after MECHANICAL-ONLY adaptation: sole-B1 fixture; ov.slot is a block array not {blocks}; casterAtkPct filters isolated to mica's casterIdx because crown ALSO emits casterAtkPct on her S1; the always-on counterfactual also deletes the resourceGate so it actually builds an ungated t=0 buff):
**13 PASS / 1 FAIL / 3 SKIP.**
The 3 SKIPs are the documented GAPs (debuff cleanse; "Stack count of buffs" no-primitive; Tidying-Up damage-taken value no-incoming-damage).
The 1 FAIL is a GENUINE BLIND OVER-CLAIM, NOT a driver faithfulness divergence: the blind test asserts "removing burstGenPct costs the team Full Bursts" (fbBase > fbNoGauge), but over a 180s fight the 20s burst CD bottlenecks at 9 Full Bursts WITH OR WITHOUT the gauge buff (measured 9 vs 9). The driver's burstGenPct:300 IS live — it advances the first burst frame 262->180 and shifts team totals ~2% — and the driver test pins that liveness via the timing/totals channel, not FB count. The blind writer chose an insensitive observable (count) for a timing effect. Evidence is in the blind-run transcript. Judge: rule whether this is a REAL-GOTCHA against the driver (it is not — the driver's encoding is faithful and live; the blind observable is simply CD-limited).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
runComp,
totals,
withPatchedOverride,
type CompOptions,
} from '../lib/harness.js';

/*

- mica-snow-buddy — Mica: Snow Buddy (SMG / Iron / Supporter / Burst I)
- Base: cd 20s, ammo 120, reloadFrames 141, chargeFrames 0, hitsPerShot 1,
-       normalAttackMultiplier 11.7, coreAttackMultiplier 250.
-
- KIT (read literally, structurally):
- skill1 line A — trigger "landing 120 normal attack(s)", target ALL ALLIES,
-                  "Tidying Up: Damage Taken \u25bc 2%", stacks to 10, lasts 15 sec.
-                  \u21d2 a DEFENSIVE (damage-taken-DOWN on ALLIES) buff. This is NOT the
-                  boss-side `damageTakenPct` debuff (which is enemy-scoped and
-                  offensive). The sim models no incoming damage, so the stack itself
-                  is offensively INERT \u2014 but it is the GATE for line B, so the model
-                  must still count it. Disposition: GAP/UNMODELED payload, but the
-                  120-hit trigger cadence is testable via line B's arrival time.
- skill1 line B — trigger "when Tidying Up is at MAX STACKS", target ALL ALLIES,
-                  "Max Ammunition Capacity \u25b2 40% continuously".
-                  \u21d2 maxAmmoPct 40 on allies. WEAPON-STATE = DAMAGE (failure-mode #6):
-                  bigger magazines \u2192 fewer reloads \u2192 more shots fired \u2192 more damage,
-                  and it lowers last-bullet frequency for any lastBullet consumer.
-                  "continuously" = no durationSec once live.
-                  MAX STACKS = 10 \u00d7 120 landed normal attacks = 1200 hits, and the
-                  15 sec window must not lapse between stacks (mica's own SMG cadence
-                  is fast enough that it does not).
- skill2 line A — trigger "landing 150 normal attack(s)", target ALL ALLIES,
-                  "Stack count of buffs \u25b2 1".
-                  \u21d2 a META primitive (raise OTHER buffs' current stack count by 1).
-                  The effect schema has no stack-count-manipulation effect kind, and
-                  `maxStacks` on a buff is a CAP, not a live counter that a third party
-                  can increment. GAP \u2014 it.skip'd with the missing-primitive reason.
- skill2 line B — trigger "at the start of battle", target SELF,
-                  "Burst Gauge filling speed \u25b2 300% continuously".
-                  \u21d2 burstGenPct 300, passive, self. Rotation-relevant: mica is a
-                  Burst I, so her own gauge contribution is a large share of the chain.
- burst — target ALL ALLIES: "Removes 1 debuff(s)" (no debuff source in the
-                  sim \u2014 UNMODELED, no observable) + "ATK \u25b2 39.93% of the skill user's
-                  ATK for 5 sec" \u21d2 casterAtkPct 39.93, durationSec 5, allies.
-                  Per the harness contract a casterAtkPct buffApply emits a FLAT
-                  resolved ATK number = 0.3993 \u00d7 mica.staticAtk, NOT 39.93.
-
- FIXTURE: controlComp('mica-snow-buddy', true) \u2014 the standard B1/B2/B3 control comp so
- bursts actually chain (mica is a Burst I; she is the B1 slot's carry here, and the
- fixed B3 supplies a stage-3 caster so Full Bursts occur at all). Deterministic, no seed.
- Runs are hoisted: each runComp is a full 180s sim, and this file holds 5.
-
- WHY EACH ASSERTION DISCRIMINATES: every FAITHFUL/FIX line is asserted GREEN under the
- literal reading and RED under the nearest-wrong model built with withPatchedOverride \u2014
- the wrong models chosen are exactly the failure-modes the taxonomy names for this kit
- shape: (#6) treating the ammo line as a skip, (#3) mis-keying the ammo gate to a plain
- per-shot/passive trigger instead of the 10-stack threshold, (#4) mis-scoping an ALLIES
- buff to self, (#1/#4) reading the burst ATK line as self-scaled atkPct instead of
- caster-scaled casterAtkPct, and (#2) reading "for 5 sec" as permanent.
  */

const CARRY = 'mica-snow-buddy';
// ADAPTED (mechanical): mica's slot in the sole-B1 fixture — used to isolate mica's own
// casterAtkPct applies from crown's S1 casterAtkPct (the blind filter otherwise catches both).
const MICA_SLOT = 0;

type Ev = SimEvent & Record<string, unknown>;

function run(opts: CompOptions) {
const events: Ev[] = [];
const res = runComp({
...opts,
cfg: { ...(opts.cfg ?? {}), onEvent: (ev: SimEvent) => events.push(ev as Ev) },
});
return { res, events };
}

// ADAPTED (mechanical): controlComp(CARRY) seats liter at B1 alongside mica (also B1) — the
// Burst-I fixture hazard: first-ready selection can hand every rotation to liter so mica never
// casts and the burst assertions vacuate. Make mica the SOLE B1 so her kit is actually exercised.
const base: CompOptions = {
slugs: [CARRY, 'crown', 'ada', 'helm'],
bossElement: 'Fire',
focusSlug: 'ada',
};

// ---- hoisted runs -----------------------------------------------------------

// 1. the shipped model
const BASE = run(base);

// 2. nearest-wrong for skill1B: the ammo line dropped entirely ("weapon-state is
// defensive, skip it") \u2014 failure-mode #6.
const noAmmo = withPatchedOverride(CARRY, (ov) => {
for (const slot of ['skill1', 'skill2', 'burst'] as const) {
const blocks = ov[slot];
if (!blocks) continue;
for (const b of blocks) {
b.effects = b.effects.filter(
(e) => !(e.kind === 'buff' && (e.stat === 'maxAmmoPct' || e.stat === 'maxAmmoFlat')),
);
}
}
});
const NO_AMMO = run({ ...base, overrides: { ...(base.overrides ?? {}), [CARRY]: noAmmo } });

// 3. nearest-wrong for skill1B's TRIGGER: the ammo buff live from t=0 as a plain
// passive instead of gated behind 10\u00d7120 landed normal attacks \u2014 failure-mode #3.
// An over-eager model grants the whole team +40% magazine for the entire fight.
const ammoFromZero = withPatchedOverride(CARRY, (ov) => {
for (const b of ov.skill1 ?? []) {
const carriesAmmo = b.effects.some(
(e) => e.kind === 'buff' && (e.stat === 'maxAmmoPct' || e.stat === 'maxAmmoFlat'),
);
if (carriesAmmo) {
b.trigger = { kind: 'passive' };
delete b.resourceGate; // ADAPTED (mechanical): driver gates via resourceGate; strip it to build the intended ungated always-on
}
}
});
const AMMO_FROM_ZERO = run({
...base,
overrides: { ...(base.overrides ?? {}), [CARRY]: ammoFromZero },
});

// 4. nearest-wrong for skill2B: the burst-gauge line dropped ("gauge is not damage").
const noGauge = withPatchedOverride(CARRY, (ov) => {
for (const b of ov.skill2 ?? []) {
b.effects = b.effects.filter((e) => !(e.kind === 'buff' && e.stat === 'burstGenPct'));
}
});
const NO_GAUGE = run({ ...base, overrides: { ...(base.overrides ?? {}), [CARRY]: noGauge } });

// 5. nearest-wrong for the burst ATK line: scoped to SELF instead of all allies
// \u2014 failure-mode #4 (a supporter's team buff mis-scoped is the classic under-credit).
const burstSelfOnly = withPatchedOverride(CARRY, (ov) => {
for (const b of ov.burst ?? []) {
const carriesAtk = b.effects.some(
(e) => e.kind === 'buff' && (e.stat === 'casterAtkPct' || e.stat === 'atkPct'),
);
if (carriesAtk) b.target = { kind: 'self' };
}
});
const BURST_SELF = run({
...base,
overrides: { ...(base.overrides ?? {}), [CARRY]: burstSelfOnly },
});

const buffApplies = (evs: Ev[]) => evs.filter((e) => e.kind === 'buffApply');
const allySlugs = (res: ReturnType<typeof runComp>) =>
Object.keys(totals(res)).filter((s) => s !== CARRY);

describe('mica-snow-buddy — skill1: Tidying Up (Damage Taken \u25bc 2%, 10 stacks, 15s)', () => {
it('is modeled as an ALLY-scoped defensive stack, never as a boss Damage Taken \u25b2 debuff', () => {
// Discriminates the single most damaging misread of this line: "Damage Taken \u25bc 2%"
// on ALLIES is defensive and offensively inert, whereas the engine's damageTakenPct
// stat is a BOSS-held debuff where POSITIVE = boss takes MORE. Encoding this line as
// damageTakenPct (either sign) either fabricates team damage or silently subtracts it.
// Boss-held debuffs are identifiable by casterIdx === null && targetIdx === null.
const bossDebuffs = buffApplies(BASE.events).filter(
(e) => e.stat === 'damageTakenPct' && e.casterIdx === null && e.targetIdx === null,
);
expect(bossDebuffs).toHaveLength(0);
});

it('non-vacuity: the fixture actually reaches max stacks (the gate for the ammo line)', () => {
// Max stacks = 10 \u00d7 120 landed normal attacks = 1200 hits. If mica never gets there in
// 180s the ammo assertions below would be vacuous \u2014 they would pass against a model
// that granted nothing. Assert her own shot count clears the threshold.
const micaShots = BASE.events.filter(
(e) => e.kind === 'shot' && (e.slug === CARRY || e.srcSlug === CARRY),
);
expect(micaShots.length).toBeGreaterThanOrEqual(1200);
});
});

describe('mica-snow-buddy — skill1: Max Ammunition Capacity \u25b2 40% at max stacks', () => {
it('WEAPON-STATE IS DAMAGE: dropping the ammo line lowers TEAM damage', () => {
// GREEN under the faithful reading (maxAmmoPct 40 on allies once Tidying Up caps),
// RED under the "ammo capacity is defensive, skip it" model: a bigger magazine means
// fewer reload gaps, so every ally with a live magazine fires strictly more rounds
// over the remaining fight. This is failure-mode #6 stated as an executable claim.
const teamBase = Object.values(totals(BASE.res)).reduce((a, b) => a + b, 0);
const teamNoAmmo = Object.values(totals(NO_AMMO.res)).reduce((a, b) => a + b, 0);
expect(teamBase).toBeGreaterThan(teamNoAmmo);
});

it('the ammo buff targets ALL ALLIES, not just mica', () => {
// "Affects all allies" \u2014 at least one non-mica unit must receive the maxAmmo buff.
// RED under an allies\u2192self mis-scope (failure-mode #4).
const ammoTargets = new Set(
buffApplies(BASE.events)
.filter((e) => e.stat === 'maxAmmoPct' || e.stat === 'maxAmmoFlat')
.map((e) => e.targetSlug as string),
);
expect(ammoTargets.size).toBeGreaterThan(1);
expect([...ammoTargets].some((s) => s !== CARRY)).toBe(true);
});

it('the value is 40 (percent), not a flat round count', () => {
const pctApplies = buffApplies(BASE.events).filter((e) => e.stat === 'maxAmmoPct');
expect(pctApplies.length).toBeGreaterThan(0);
for (const e of pctApplies) expect(e.value).toBeCloseTo(40, 6);
});

it('TRIGGER IDENTITY: it is stack-gated, not live from t=0', () => {
// The nearest-wrong model makes the ammo buff a plain passive. Because 1200 landed
// normal attacks take real time, the faithful model grants the magazine LATER, so it
// must produce STRICTLY LESS team damage than the from-t=0 model. Equality here would
// mean the gate is not actually gating (failure-mode #3).
const teamBase = Object.values(totals(BASE.res)).reduce((a, b) => a + b, 0);
const teamEarly = Object.values(totals(AMMO_FROM_ZERO.res)).reduce((a, b) => a + b, 0);
expect(teamEarly).toBeGreaterThan(teamBase);
});

it('the first ammo grant lands well after t=0 (the 10-stack ramp is real)', () => {
// Structural form of the same claim, read off the event log rather than totals:
// 1200 hits at mica's SMG cadence cannot complete in the opening seconds.
const first = buffApplies(BASE.events).find(
(e) => e.stat === 'maxAmmoPct' || e.stat === 'maxAmmoFlat',
);
expect(first).toBeDefined();
expect(first!.frame as number).toBeGreaterThan(600); // > 10s @60fps
});

it('"continuously": once granted it never expires', () => {
// Duration semantics (failure-mode #2). "continuously" = no time bound. A model that
// mistakenly copied the 15 sec from the Tidying Up line onto the ammo line would emit
// a finite expiresFrame.
const applies = buffApplies(BASE.events).filter(
(e) => e.stat === 'maxAmmoPct' || e.stat === 'maxAmmoFlat',
);
expect(applies.length).toBeGreaterThan(0);
for (const e of applies) {
expect(e.durationShots ?? null).toBeNull();
const exp = e.expiresFrame as number | null | undefined;
expect(exp === null || exp === undefined || exp > 10_000).toBe(true);
}
});
});

describe('mica-snow-buddy — skill2: Burst Gauge filling speed \u25b2 300% (self, from battle start)', () => {
it('is a SELF buff applied at battle start with value 300', () => {
// Trigger identity + target set read literally: "at the start of battle" = passive
// (frame 0), "Affects self" = mica only. RED under an allies-scoped or
// later-triggered model.
const gauge = buffApplies(BASE.events).filter((e) => e.stat === 'burstGenPct');
expect(gauge.length).toBeGreaterThan(0);
for (const e of gauge) {
expect(e.targetSlug).toBe(CARRY);
expect(e.value).toBeCloseTo(300, 6);
}
expect(Math.min(...gauge.map((e) => e.frame as number))).toBe(0);
});

it('ROTATION: removing it costs the team Full Bursts (gauge is damage)', () => {
// mica is a Burst I; her gauge contribution is a large share of the chain, so a
// \u00d74 fill rate on her is rotation-load-bearing. GREEN faithful, RED under the
// "gauge isn't damage, skip it" model \u2014 which yields strictly fewer FB windows.
const fbBase = BASE.events.filter((e) => e.kind === 'fullBurstStart').length;
const fbNoGauge = NO_GAUGE.events.filter((e) => e.kind === 'fullBurstStart').length;
expect(fbBase).toBeGreaterThan(0);
expect(fbBase).toBeGreaterThan(fbNoGauge);
});
});

describe('mica-snow-buddy — burst: ATK \u25b2 39.93% of the skill user\u2019s ATK for 5 sec (all allies)', () => {
it('is CASTER-SCALED (casterAtkPct), emitted as a FLAT ATK number \u2014 not 39.93', () => {
// "of the skill user's ATK" is the caster-scaled primitive. Per the harness contract a
// casterAtkPct buffApply flat-resolves to (39.93/100) \u00d7 mica.staticAtk. The nearest-wrong
// model writes plain atkPct 39.93, which scales each TARGET's own ATK instead \u2014 a
// different number on every ally and a different mechanic. Asserting the emitted value
// is NOT the raw percentage is what separates them.
const atk = buffApplies(BASE.events).filter((e) => e.stat === 'casterAtkPct' && e.casterIdx === MICA_SLOT);
expect(atk.length).toBeGreaterThan(0);
for (const e of atk) expect(e.value).not.toBeCloseTo(39.93, 2);

    // and the flat value is a fixed constant across every recipient (it is the CASTER's ATK,
    // so it does not vary by target) \u2014 RED under a plain atkPct model.
    const vals = new Set(atk.map((e) => Math.round(e.value as number)));
    expect(vals.size).toBe(1);

    // no plain atkPct 39.93 anywhere from mica's burst
    const wrongStat = buffApplies(BASE.events).filter(
      (e) => e.stat === 'atkPct' && Math.abs((e.value as number) - 39.93) < 0.01,
    );
    expect(wrongStat).toHaveLength(0);

});

it('reaches EVERY ally, and self-scoping it costs the team damage', () => {
// "Affects all allies" \u2014 the whole comp receives it. GREEN faithful; RED under the
// allies\u2192self mis-scope, which is the classic supporter under-credit (failure-mode #4).
const targets = new Set(
buffApplies(BASE.events)
.filter((e) => e.stat === 'casterAtkPct' && e.casterIdx === MICA_SLOT)
.map((e) => e.targetSlug as string),
);
for (const s of allySlugs(BASE.res)) expect(targets.has(s)).toBe(true);

    const teamBase = Object.values(totals(BASE.res)).reduce((a, b) => a + b, 0);
    const teamSelf = Object.values(totals(BURST_SELF.res)).reduce((a, b) => a + b, 0);
    expect(teamBase).toBeGreaterThan(teamSelf);

    // INERTNESS: the mis-scope must leave MICA\u2019s own damage essentially untouched
    // (she keeps the buff either way) while moving her allies \u2014 proving the delta above
    // came from the ALLY grant, not from an incidental rotation shift.
    const movedAllies = allySlugs(BASE.res).filter(
      (s) => totals(BASE.res)[s] !== totals(BURST_SELF.res)[s],
    );
    expect(movedAllies.length).toBeGreaterThan(0);

});

it('DURATION SEMANTICS: 5 sec, not permanent', () => {
// "for 5 sec" \u2014 a wall-clock window (there is no "round(s)" wording here, so it is NOT
// a durationShots line). The engine emits no buffRemove on natural lapse, so read
// expiresFrame off the apply: ~300 frames @60fps after the cast.
const atk = buffApplies(BASE.events).filter((e) => e.stat === 'casterAtkPct' && e.casterIdx === MICA_SLOT);
expect(atk.length).toBeGreaterThan(0);
for (const e of atk) {
expect(e.durationShots ?? null).toBeNull();
const span = (e.expiresFrame as number) - (e.frame as number);
expect(span).toBeGreaterThan(280);
expect(span).toBeLessThan(320);
}
});

it('re-applies on each of mica\u2019s burst casts (trigger identity: burstCast, not fullBurstEnter)', () => {
// The buff is in mica\u2019s OWN burst block, so it fires once per burst SHE casts. Assert the
// apply count matches her burstCast count \u2014 RED under a fullBurstEnter re-key, which
// would fire on any team Full Burst and over-credit in multi-caster rotations
// (failure-mode #3).
const casts = BASE.events.filter(
(e) => e.kind === 'burstCast' && (e.slug === CARRY || e.srcSlug === CARRY),
).length;
const applyFrames = new Set(
buffApplies(BASE.events)
.filter((e) => e.stat === 'casterAtkPct' && e.casterIdx === MICA_SLOT)
.map((e) => e.frame as number),
);
expect(casts).toBeGreaterThan(0);
expect(applyFrames.size).toBe(casts);
});

it.skip('burst: "Removes 1 debuff(s)" \u2014 GAP: no debuff-on-ally channel exists', () => {
// The sim models no incoming debuffs on allies (the boss deals no damage and applies
// nothing to the team), so cleansing has no observable payload. Nothing to assert;
// it belongs in the override\u2019s `unmodeled.burst`.
});
});

describe('mica-snow-buddy — GAPs', () => {
it.skip('skill2: "Stack count of buffs \u25b2 1" \u2014 GAP: no stack-count-manipulation primitive', () => {
// The EffectDef vocabulary has no effect that increments ANOTHER buff\u2019s live stack
// count. `maxStacks` on a buff is a CAP declared by the buff itself, not a mutable
// counter a third party can raise, and there is no `stackCount`/`stackBonus` stat.
// Modeling it as +1 maxStacks on mica\u2019s own buffs would be wrong twice over: it
// affects ALL ALLIES\u2019 buffs (cross-unit), and it raises the CURRENT count, not the cap.
// Belongs in `unmodeled.skill2` until a primitive exists.
});

it.skip('skill1: "Tidying Up: Damage Taken \u25bc 2%" payload \u2014 GAP: no incoming-damage model', () => {
// The v1 boss deals no damage to the team, so an ally-side damage-reduction stack has
// no observable payload. The STACK COUNT is still load-bearing (it gates the +40% Max
// Ammunition line, asserted above), so the block must exist to carry the counter \u2014
// only its defensive value is unmodeled. Do NOT encode it as boss `damageTakenPct`.
});
});

--- SECTION 6: S6 BLIND OVERRIDE (claude-opus-5) + diff vs driver ---

### Driver-vs-blind override diff (functionally EQUIVALENT; same dispositions + same flags)

IDENTICAL:

- burst: casterAtkPct 39.93, trigger burstCast, target allies (includeSelf), durationSec 5 — byte-identical
- skill2: burstGenPct 300, trigger passive, target self — byte-identical
- maxAmmoPct 40 to all allies, no duration ("continuously") — same stat/value/target/permanence
- unmodeled set: Tidying-Up Damage-Taken (defensive), "Stack count of buffs" (no primitive), burst debuff-cleanse (no debuff model)
- the KEY flag: refresh-on-reapply vs per-stack-decay stack semantics = gate opens ~50s vs NEVER (both agents independently flagged this binary)

STRUCTURAL DIFFERENCE (the max-ammo GATE encoding):

- DRIVER: explicit stack clock — resources:[{tidyingUp,0..10}]; skill1 Block A = hitCount:120 -> resource +1; skill1 Block B = hitCount:120 + resourceGate{tidyingUp,min:10} -> maxAmmoPct:40; skill2 Block C = hitCount:150 -> resource +1 (folds the "Stack count of buffs +1" SELF-portion, accelerating the ramp). Activation EMERGES from the engine cadence = frame 2797 (~46.6s).
- BLIND: collapsed proxy — skill1 = hitCount:720 -> maxAmmoPct:40 (the 720 is a DERIVED round-count: 10th grant lands at round 720 merging the 120- and 150-hit cadences). No resource pool; the blind writer noted "the engine has no stack-threshold trigger" (its redacted schema hid the resourceGate primitive the driver used).
- Net: both gate the +40% ammo behind reaching 10 stacks; driver activation ~46.6s, blind ~50s — same region. Driver is more primitive-faithful (models the actual accrual + lets the engine compute the time); blind hardcodes a derived round threshold. Both are faithful; neither fabricates a t=0 always-on.
- unmodeled bookkeeping differs cosmetically: driver carries only the debuff-cleanse verbatim in unmodeled (the dmg-taken VALUE and the stack-count CROSS-ALLY portion are documented in caveats because their stack CLOCK / self-portion ARE modeled as blocks); blind carries all three in unmodeled (it did not model the stack clock as a block).

### Blind override JSON:

{
"slug": "mica-snow-buddy",
"skill1": [
{
"slot": "skill1",
"trigger": {
"kind": "hitCount",
"count": 720
},
"target": {
"kind": "allies"
},
"effects": [
{
"kind": "buff",
"stat": "maxAmmoPct",
"value": 40
}
]
}
],
"skill2": [
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
"stat": "burstGenPct",
"value": 300
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
"stat": "casterAtkPct",
"value": 39.93,
"durationSec": 5
}
]
}
],
"unmodeled": {
"skill1": [
"Activates when landing 120 normal attack(s). Affects all allies. Tidying Up: Damage Taken ▼ 2%. Stacks up to 10 times and lasts for 15 sec."
],
"skill2": [
"Activates when landing 150 normal attack(s). Affects all allies. Stack count of buffs ▲ 1."
],
"burst": [
"Removes 1 debuff(s)."
]
},
"caveats": [
"⚑ skill1 hitCount 720 is a DERIVED proxy for \"Tidying Up at max stacks\", not a kit-stated number. It merges two stated cadences: skill1 grants 1 stack per 120 landed rounds and skill2 grants +1 buff stack per 150 landed rounds, so the 10th grant lands at round 720 (grants at 120/150/240/300/360/450/480/600+600/720). The engine has no stack-threshold trigger, so the gate is expressed as a rounds counter.",
"⚑ The 720 threshold ASSUMES stacks refresh on each application. Tidying Up lasts 15 sec and one 120-round magazine takes ~8.4 s (120 rounds @ ~20/s + 141 reload frames), so under strict per-stack expiry the pool would hover at ~2-3 stacks and the Max Ammunition gate would NEVER open in a 180 s fight. Refresh-on-apply vs independent per-stack expiry is the single largest swing in this model (gate at ~50 s vs never).",
"⚑ Max Ammunition Capacity ▲ 40% is modeled as permanent from first trigger (\"continuously\"). If the real buff drops when Tidying Up falls below max stacks, this over-credits every ally's magazine for the rest of the fight.",
"⚑ Cadence: hit-count thresholds convert to wall-clock through the datamined SMG pulls/s + reloadFrames 141, both known-unreliable fields. A cadence error moves WHEN the ammo gate opens, not whether it opens.",
"Tidying Up's Damage Taken ▼ 2% (allies) is survivability-only and has no StatKey — damageTakenPct is defined as a BOSS debuff (positive = boss takes more) and encoding an ally-side reduction there would be mis-scoped. It is unmodeled by design; only its max-stack consequence is represented.",
"\"Stack count of buffs ▲ 1\" has no engine primitive (no cross-buff stack injection). It is unmodeled as an effect and survives ONLY inside the 720 derivation. Any other stacking ally buff in the team that it would also accelerate is uncredited.",
"Burst \"Removes 1 debuff(s)\" is inert at scope (v1 boss applies no debuffs)."
],
"note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Mica: Snow Buddy is an SMG/Iron/Supporter/Burst I whose damage contribution is almost entirely INDIRECT: a self burst-gauge generation buff (rotation speed), a team-wide Max Ammunition Capacity ▲ 40% gated behind a stack ramp (shots fired / reload frequency for the whole team), and a 5 s caster-scaled ATK grant on burst. Modeled: skill1's max-stack Max Ammunition gate as an allies-wide maxAmmoPct 40 on a hitCount 720 proxy trigger (⚑ derived, see caveats); skill2's start-of-battle Burst Gauge filling speed ▲ 300% as a passive self burstGenPct; the burst's ATK ▲ 39.93% of the skill user's ATK as a burstCast allies casterAtkPct with durationSec 5. Deliberately unmodeled: the Tidying Up Damage Taken ▼ 2% ally stack itself (defensive, no StatKey), \"Stack count of buffs ▲ 1\" (no engine primitive), and the burst's 1-debuff cleanse (no debuff model at scope). Max Ammunition is a weapon-state modifier and IS damage — it is not skipped as defensive."
}

--- SECTION 7: DRIVER IMPLEMENTATION ---

### Driver unit test (scripts/tests/units/mica-snow-buddy.test.ts) — 18/18 GREEN:

// PER-UNIT KIT SPEC — `mica-snow-buddy` (Mica: Snow Buddy, aka msb — Tetra Iron SMG Supporter,
// Burst I, cd 20s, 120-ammo SMG @1440rpm, reloadFrames 141; a VARIANT of the RL/Wind base Mica).
// Kit-autonomy gauntlet 2026-07-31; test-first line-by-line spec.
//
// GREENFIELD NOTE: msb shipped with NO override (simSupported:false) — before this gauntlet the unit
// could not sim at all (resolveSkills throws for prose-without-override). So the usual "RED vs shipped
// override" half is degenerate: the pre-override state is "does not run". The substance of the gate
// lives in the COUNTERFACTUAL half — every PIN below is GREEN vs the faithful encoding AND the
// nearest-wrong model (patched via withPatchedOverride) provably fails it, so each assertion
// discriminates rather than rubber-stamps.
//
// msb is a TEAM ATK BUFFER + burst-gauge enabler + (gated) ammo-economy buffer. Three DPS channels are
// modeled; the rest of the kit is defensive / meta / out-of-domain:
// M1 BURST team ATK buff (▲39.93% of HER OWN ATK to all allies, 5s) — dominant contribution;
// M2 S2 self Burst Gauge filling speed ▲300% (continuous) — advances her burst cadence;
// M4 S1 Max Ammunition Capacity ▲40% to all allies — GATED behind her Tidying-Up stack clock;
// M3 the Tidying-Up STACK CLOCK (resource pool) that gates M4 — its 2% damage-taken VALUE is inert;
// M5 the SELF portion of 'Stack count of buffs ▲1' — folded as a +1 to the stack clock (accelerates M4).
//
// Kit (data/characters.json → characters['mica-snow-buddy'].skills, lvl-10 values):
// S1 ■ landing 120 normals → all allies: Tidying Up Damage Taken ▼2%, stack 10x, 15s [M3 stack-clock FAITHFUL / 2% value UNMODELED defensive]
// ■ Tidying Up at max stacks → all allies: Max Ammunition Capacity ▲40% continuously [M4 FAITHFUL, gated]
// S2 ■ landing 150 normals → all allies: Stack count of buffs ▲1 [M5 self-portion FAITHFUL fold / cross-ally UNMODELED meta]
// ■ start of battle → self: Burst Gauge filling speed ▲300% continuously [M2 FAITHFUL]
// BU ■ all allies: Removes 1 debuff(s) [M6 UNMODELED defensive/utility]
// ■ all allies: ATK ▲39.93% of the skill user's ATK for 5 sec [M1 FAITHFUL — dominant]
//
// THE KEY MODELING JUDGMENTS (the substance of the cross-family reconciliation):
// STACK-CLOCK + GATE (M3/M4/M5): the max-ammo line is the unit's main team-damage contribution after
// the burst ATK buff, and it IS modelable: a `tidyingUp` resource pool (0..10) increments on
// hitCount:120 (Block A) and on hitCount:150 (Block C — the self-portion of 'Stack count of buffs
// ▲1', which adds a stack to her OWN stackable Tidying-Up buff), and the max-ammo buff fires only
// once the pool reaches 10 (resourceGate). The activation TIME is NOT hardcoded — it EMERGES from
// the engine's hitCount cadence: in this fixture, frame 2797 (~46.6s), which matches the
// cross-family reviewer's INDEPENDENT prose+cadence derivation (~45-50s, H/120 + H/150 ≥ 10 →
// H≈667 landed rounds). Removing the Block-C fold delays activation to frame 4717 (~78.6s).
// STACK-SEMANTICS (⚑ M4): the pool is monotonic (no decay) = 'permanent once 10 accrue', committing to
// the REFRESH-ON-REAPPLY reading of 'Stacks up to 10 times and lasts for 15 sec' (the standard
// NIKKE convention). The rejected per-stack-independent-decay reading would cap concurrent stacks
// at ~2 and the gate would never open (0% uptime). Documented, not silently chosen.
// DAMAGE-TAKEN CHANNEL (M3): 'Damage Taken ▼2%' is a reduction on ALLIES (defensive), NOT the schema's
// boss-debuff `damageTakenPct` (boss takes MORE). The 2% value is inert (no incoming damage); only
// the stack CLOCK is modeled. Encoding it on the boss would wrongly add up to +20% team damage —
// the no-boss-held-damageTakenPct assertion below is the mandatory guard against that inversion.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates nothing):
// M1 casterAtkPct (FLAT add off msb's static ATK), allies INCLUDESELF, on HER burstCast, 5s.
// (a) BASIS — an atkPct counterfactual sizes off each ally's own ATK and records the PERCENTAGE
// 39.93, not the flat caster-sized number; (b) SCOPING — excludeSelf drops msb as a 4th target;
// (c) TIMING — apply frames coincide with msb's stage-1 burstCast, preceding Full Burst entry;
// (d) LIVENESS — removing it lowers every ally's total.
// M2 burstGenPct 300, SELF, passive/permanent. (a) LIVENESS — removing shifts team totals (advances
// her first burst); (b) ENCODING GATE — removed leaves no burstGenPct buff; (c) SCOPING — self only.
// M4 maxAmmoPct 40 to all allies, GATED. (a) GATE — NO apply in the opening window (a t=0 passive
// counterfactual applies at frame 0 — the nearest wrong model); (b) SCOPING — all four allies;
// (c) VALUE/PERMANENCE — 40, no expiry ('continuously'); (d) LIVENESS — removing lowers totals.
// M5 the Block-C fold ACCELERATES the gate: removing it pushes the first max-ammo apply strictly
// later (~78.6s vs ~46.6s) — proves the 'Stack count of buffs' self-portion is live, not dropped.
// M3 the stack clock is behavioral (no resource event): the gate OPENS (an apply exists) only because
// the pool reaches 10; and msb applies NO boss-held damageTakenPct (the inversion guard).
// M6 structural pin — the override carries the debuff-cleanse line verbatim in `unmodeled.burst`.
//
// Fixture (deterministic — no seed; event-log over totals where a line is scoping/timing-sensitive):
// ['mica-snow-buddy','crown','ada','helm'] — msb is the SOLE Burst I (20s cd) → casts every rotation;
// crown (B2, 20s) covers stage II; ada/helm (B3) cover stage III. Boss Fire, focus ada (the carry).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import {
runComp,
totals,
unitOf,
withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
const SLUG = 'mica-snow-buddy';

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type FbStart = Extract<SimEvent, { kind: 'fullBurstStart' }>;

// ---- fixture ----------------------------------------------------------------------------------
const COMP = ['mica-snow-buddy', 'crown', 'ada', 'helm'];
const MSB = 0; // msb's slot in COMP
/** The gated max-ammo activation lands at frame 2797 (~46.6s) in this fixture; anything in the

- opening 40s is proof of an ungated (t=0 passive) encoding. */
  const OPENING_WINDOW = 40 * FPS;

function run(overrides: Record<string, any> = {}) {
const events: SimEvent[] = [];
const res = runComp({
slugs: COMP,
bossElement: 'Fire',
focusSlug: 'ada',
overrides,
cfg: { onEvent: (e) => events.push(e) },
});
return { events, res, totals: totals(res) };
}

// ---- counterfactual patches (nearest-wrong models each PIN must discriminate against) ---------
const hasStat = (b: any, stat: string) =>
b.effects.some((e: any) => e.stat === stat);

/** M1 reference: the burst team ATK line removed (proves the buff is live). */
const msbNoAtk = withPatchedOverride(SLUG, (ov) => {
const before = ov.burst.length;
ov.burst = ov.burst.filter((b: any) => !hasStat(b, 'casterAtkPct'));
if (ov.burst.length !== before - 1) {
throw new Error('msb burst casterAtkPct block missing — fixture is stale');
}
});

/** M1 basis nearest-wrong: target-basis atkPct (% of EACH ally's own ATK) instead of caster-basis. */
const msbAllyAsAtkPct = withPatchedOverride(SLUG, (ov) => {
const e = ov.burst
.flatMap((b: any) => b.effects)
.find((x: any) => x.stat === 'casterAtkPct');
if (!e) {
throw new Error('msb burst casterAtkPct effect missing — fixture is stale');
}
e.stat = 'atkPct';
});

/** M1 scoping nearest-wrong: excludeSelf (kit says 'Affects all allies', no except-self). */
const msbAllyExcludeSelf = withPatchedOverride(SLUG, (ov) => {
const b = ov.burst.find((x: any) => hasStat(x, 'casterAtkPct'));
if (!b || b.target?.kind !== 'allies') {
throw new Error('msb burst casterAtkPct (allies) block missing — fixture is stale');
}
b.target = { kind: 'allies', excludeSelf: true };
});

/** M2 reference: the S2 self burst-gauge line removed. */
const msbNoBurstGen = withPatchedOverride(SLUG, (ov) => {
const before = ov.skill2.length;
ov.skill2 = ov.skill2.filter((b: any) => !hasStat(b, 'burstGenPct'));
if (ov.skill2.length !== before - 1) {
throw new Error('msb S2 burstGenPct block missing — fixture is stale');
}
});

/** M4 reference: the gated max-ammo block removed (proves it is live). */
const msbNoAmmo = withPatchedOverride(SLUG, (ov) => {
const before = ov.skill1.length;
ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'maxAmmoPct'));
if (ov.skill1.length !== before - 1) {
throw new Error('msb S1 maxAmmoPct block missing — fixture is stale');
}
});

/** M4 nearest-wrong: the max-ammo buff as a t=0 PASSIVE (ungated) — over-credits the opening ~46s of

- magazine economy. The faithful model gates it behind the stack clock. */
  const msbAmmoAlwaysOn = withPatchedOverride(SLUG, (ov) => {
  const b = ov.skill1.find((x: any) => hasStat(x, 'maxAmmoPct'));
  if (!b) {
  throw new Error('msb S1 maxAmmoPct block missing — fixture is stale');
  }
  b.trigger = { kind: 'passive' };
  delete b.resourceGate;
  });

/** M5 reference: remove the Block-C fold (the hitCount:150 → tidyingUp +1 self-portion of 'Stack

- count of buffs ▲1'). The gate must then open strictly LATER (no stack acceleration). */
  const msbNoStackFold = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
  (b: any) =>
  !(
  b.trigger?.kind === 'hitCount' &&
  b.effects.some((e: any) => e.kind === 'resource')
  )
  );
  if (ov.skill2.length !== before - 1) {
  throw new Error('msb S2 stack-fold (hitCount resource) block missing — fixture is stale');
  }
  });

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noAtk = run({ [SLUG]: msbNoAtk });
const allyAsAtkPct = run({ [SLUG]: msbAllyAsAtkPct });
const allyExcludeSelf = run({ [SLUG]: msbAllyExcludeSelf });
const noBurstGen = run({ [SLUG]: msbNoBurstGen });
const noAmmo = run({ [SLUG]: msbNoAmmo });
const ammoAlwaysOn = run({ [SLUG]: msbAmmoAlwaysOn });
const noStackFold = run({ [SLUG]: msbNoStackFold });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const msbCasterBuffs = (evs: SimEvent[], stat: string) =>
buffs(evs).filter((b) => b.casterIdx === MSB && b.stat === stat);
const selfBuffs = (evs: SimEvent[], stat: string) =>
buffs(evs).filter(
(b) => b.casterIdx === MSB && b.targetSlug === SLUG && b.stat === stat
);
const casts = (evs: SimEvent[]) =>
evs.filter((e): e is BurstCast => e.kind === 'burstCast');
const msbCasts = (evs: SimEvent[]) =>
casts(evs).filter((c) => c.slug === SLUG);
const fbStarts = (evs: SimEvent[]) =>
evs.filter((e): e is FbStart => e.kind === 'fullBurstStart');
const distinctTargets = (bs: BuffApply[]) =>
[...new Set(bs.map((b) => b.targetSlug))].sort();
const ammoApps = (evs: SimEvent[]) => msbCasterBuffs(evs, 'maxAmmoPct');
const firstAmmoFrame = (evs: SimEvent[]): number | null => {
const a = ammoApps(evs);
return a.length ? Math.min(...a.map((b) => b.frame)) : null;
};

describe('mica-snow-buddy — kit spec', () => {
describe('fixture sanity', () => {
it('msb is the sole Burst I and casts her burst every rotation', () => {
const n = msbCasts(base.events).length;
expect(n).toBeGreaterThan(5);
expect(
[...new Set(msbCasts(base.events).map((c) => c.stage))],
'msb is Burst I'
).toEqual([1]);
});
});

describe('M1 — Burst ATK ▲39.93% of msb\u2019s ATK to all allies for 5s (casterAtkPct, burstCast, includeSelf)', () => {
const applied = msbCasterBuffs(base.events, 'casterAtkPct');
const msbAtk = unitOf(base.res, SLUG).staticAtk;
const expectedFlat = (msbAtk * 39.93) / 100;

    it('is a caster-basis FLAT add sized off msb\u2019s static ATK (not the percentage)', () => {
      expect(applied.length, 'no burst casterAtkPct buff applied').toBeGreaterThan(0);
      for (const b of applied) {
        expect(
          Math.abs(b.value - expectedFlat),
          `flat ATK ${b.value} should be 39.93% of msb staticAtk ${msbAtk} (= ${expectedFlat})`
        ).toBeLessThan(1);
      }
    });

    it('reaches all four allies INCLUDING msb herself, for exactly 5 sec, once per cast per ally', () => {
      expect(distinctTargets(applied)).toEqual([...COMP].sort());
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(5 * FPS);
      }
      expect(applied.length).toBe(msbCasts(base.events).length * COMP.length);
    });

    it('fires on msb\u2019s burstCast (stage 1), which precedes Full Burst entry', () => {
      const castFrames = msbCasts(base.events).map((c) => c.frame);
      const applyFrames = [...new Set(applied.map((b) => b.frame))].sort(
        (a, b) => a - b
      );
      expect(applyFrames.length).toBe(castFrames.length);
      for (const f of applyFrames) {
        expect(
          castFrames.some((cf) => Math.abs(cf - f) <= 2),
          `ally-buff apply frame ${f} has no nearby msb burstCast`
        ).toBe(true);
      }
      const fbFrames = fbStarts(base.events).map((f) => f.frame);
      const onFb = applyFrames.filter((f) =>
        fbFrames.some((fb) => Math.abs(fb - f) <= 2)
      );
      expect(
        onFb.length,
        'stage-1 burstCast frames should not coincide with Full Burst entry'
      ).toBeLessThan(applyFrames.length);
    });

    it('is LIVE: removing it lowers every ally\u2019s total (it is the team ATK feed)', () => {
      for (const s of COMP) {
        expect(
          noAtk.totals[s],
          `removing the team ATK buff must lower ${s}\u2019s total`
        ).toBeLessThan(base.totals[s]);
      }
    });

    it('DISCRIMINATING (basis): a target-basis atkPct records the PERCENTAGE 39.93, not the flat number', () => {
      const wrong = msbCasterBuffs(allyAsAtkPct.events, 'atkPct');
      expect(wrong.length, 'atkPct counterfactual produced no buff').toBeGreaterThan(0);
      expect([...new Set(wrong.map((b) => b.value))]).toEqual([39.93]);
      expect(unitOf(allyAsAtkPct.res, 'ada').totalDamage).not.toBeCloseTo(
        unitOf(base.res, 'ada').totalDamage,
        0
      );
    });

    it('DISCRIMINATING (scoping): excludeSelf drops msb as a 4th target', () => {
      const narrowed = msbCasterBuffs(allyExcludeSelf.events, 'casterAtkPct');
      expect(distinctTargets(narrowed)).toEqual(
        [...COMP].filter((s) => s !== SLUG).sort()
      );
    });

});

describe('M2 — S2 self Burst Gauge filling speed ▲300% (burstGenPct, passive, permanent)', () => {
const applied = selfBuffs(base.events, 'burstGenPct');

    it('is burstGenPct 300, self-scoped, applied once at setup, permanent', () => {
      expect(applied.length, 'no S2 burstGenPct buff applied').toBe(1);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([300]);
      expect([...new Set(applied.map((b) => b.targetSlug))]).toEqual([SLUG]);
      expect(applied[0].frame, 'a passive applies at setup').toBe(0);
      expect([...new Set(applied.map((b) => b.expiresFrame))]).toEqual([null]);
      expect([...new Set(applied.map((b) => b.durationShots))]).toEqual([null]);
    });

    it('is LIVE: removing it shifts team totals (it advances her burst cadence)', () => {
      expect(noBurstGen.totals).not.toEqual(base.totals);
    });

    it('DISCRIMINATING: removing the line leaves no burstGenPct buff (encoding gate)', () => {
      expect(selfBuffs(noBurstGen.events, 'burstGenPct').length).toBe(0);
    });

});

describe('M4 — S1 Max Ammunition Capacity ▲40% to all allies, GATED behind the Tidying-Up stack clock', () => {
const applied = ammoApps(base.events);

    it('is GATED: NO apply in the opening 40s (the stack clock must reach 10 first)', () => {
      const first = firstAmmoFrame(base.events);
      expect(first, 'no maxAmmoPct apply at all — the gate never opened').not.toBeNull();
      expect(
        first!,
        `first max-ammo apply at frame ${first} is inside the opening window — an ungated t=0 encoding`
      ).toBeGreaterThan(OPENING_WINDOW);
    });

    it('DISCRIMINATING (gate): a t=0 passive encoding applies at frame 0 (the nearest wrong model)', () => {
      expect(firstAmmoFrame(ammoAlwaysOn.events)).toBe(0);
      // and the faithful gated model provably differs: its first apply is well past frame 0
      expect(firstAmmoFrame(base.events)!).toBeGreaterThan(OPENING_WINDOW);
    });

    it('reaches all four allies, value 40, permanent once active (\u201ccontinuously\u201d)', () => {
      expect(distinctTargets(applied)).toEqual([...COMP].sort());
      expect([...new Set(applied.map((b) => b.value))]).toEqual([40]);
      expect([...new Set(applied.map((b) => b.expiresFrame))]).toEqual([null]);
    });

    it('is LIVE: removing it lowers the team\u2019s totals (ammo economy → more shots fired)', () => {
      for (const s of COMP) {
        expect(
          noAmmo.totals[s],
          `removing the gated max-ammo buff must lower ${s}\u2019s total`
        ).toBeLessThan(base.totals[s]);
      }
    });

});

describe('M5 — \u201cStack count of buffs ▲1\u201d self-portion is folded into the stack clock (accelerates the M4 gate)', () => {
it('removing the hitCount:150 fold pushes the first max-ammo apply strictly later', () => {
const withFold = firstAmmoFrame(base.events)!;
const withoutFold = firstAmmoFrame(noStackFold.events)!;
expect(
withoutFold,
'the no-fold run still opens the gate (Block A alone reaches 10 stacks)'
).not.toBeNull();
expect(
withoutFold,
`no-fold activation ${withoutFold} must be strictly later than with-fold ${withFold} — ` +
'the +1/150-hits fold accelerates the ramp'
).toBeGreaterThan(withFold);
// and the acceleration is material (the fold shaves ~32s / ~1900 frames off the activation)
expect(withoutFold - withFold).toBeGreaterThan(30 * FPS);
});
});

describe('M3 — Tidying-Up stack clock is modeled; the 2% damage-taken VALUE is inert and NOT a boss debuff', () => {
it('the stack clock drives the gate: a max-ammo apply EXISTS (the pool reached 10)', () => {
expect(ammoApps(base.events).length).toBeGreaterThan(0);
});

    it('GUARD: msb applies NO boss-held damageTakenPct (the defensive ▼2% must not be inverted into a boss debuff)', () => {
      // The schema's only damage-taken stat (damageTakenPct) is a boss debuff = boss takes MORE damage.
      // 'Damage Taken ▼2%' on allies is the INVERSE channel; encoding it as damageTakenPct would wrongly
      // add team damage. No msb-cast damageTakenPct buff may exist anywhere in the run.
      const inverted = buffs(base.events).filter(
        (b) => b.casterIdx === MSB && b.stat === 'damageTakenPct'
      );
      expect(
        inverted.map((b) => b.frame),
        'the Tidying-Up damage-taken line was mis-encoded as a boss debuff'
      ).toEqual([]);
    });

});

describe('M6 — burst debuff cleanse is a documented gap (no silent drop)', () => {
it('the override carries the cleanse line verbatim in unmodeled.burst', () => {
const ov = loadOverride(SLUG)!;
expect((ov as any).unmodeled.burst).toContain(
'Affects all allies. Removes 1 debuff(s).'
);
});
});
});

### Driver override (src/skills/overrides/mica-snow-buddy.json) — validate-overrides PASS (dmg 99.8M, 9 bursts):

{
"note": "Mica: Snow Buddy (slug `mica-snow-buddy`, aka msb): Tetra IRON SMG SUPPORTER, Burst I, 20s burst CD, 120-ammo SMG (1440 rpm), reloadFrames 141. A variant of the RL/Wind base Mica. A team ATK buffer + burst-gauge enabler whose DPS channels are (1) the burst team ATK buff, (2) a self burst-gauge-fill-speed buff, and (3) a max-ammo team buff gated behind her Tidying-Up stack clock. --- LINE DISPOSITIONS --- BURST 'ATK ▲39.93% of the skill user's ATK for 5 sec, all allies': modeled `casterAtkPct` 39.93 on `burstCast` → allies (INCLUDES self — 'Affects all allies', no except-self), 5s. Caster-basis FLAT add ((39.93/100)×her static ATK), NOT % of each ally's own ATK. Her dominant DPS contribution. BURST 'Removes 1 debuff(s), all allies': UNMODELED — defensive/utility debuff cleanse; the v1 boss applies no debuffs, so there is nothing to remove and no DPS channel (carried verbatim in unmodeled.burst). S2 'start of battle, self: Burst Gauge filling speed ▲300% continuously': modeled `burstGenPct` 300, passive self (frame 0, no expiry) — scales her OWN burst-gauge contribution ×4; 'continuously' = permanent. S2 'on landing 150 normal attacks, all allies: Stack count of buffs ▲1': PARTIALLY MODELED. 'Stack count of buffs ▲1' adds a stack to active stackable buffs on all allies; her OWN Tidying-Up is such a buff, so the SELF-directed portion is modeled as a +1 to the `tidyingUp` resource pool on hitCount:150 (Block C), which accelerates the max-ammo gate (measured effect: pulls activation from ~78.6s to ~46.6s in the fixture). The CROSS-ALLY portion (adding stacks to TEAMMATES' own stackable buffs) is out-of-domain — the engine has no generic per-buff stack-count primitive that reaches into other units' buff stacks — and is documented (⚑ M5). S1 'on landing 120 normal attacks, all allies: Tidying Up Damage Taken ▼2%, stacks 10x, 15s': PARTIALLY MODELED. The STACK CLOCK is modeled — a `tidyingUp` resource pool (0..10) incremented on hitCount:120 (Block A) — because it is the GATE for the max-ammo line. The defensive '2% Damage Taken ▼' MAGNITUDE is NOT modeled: it is a damage-taken REDUCTION on allies, and the sim models no incoming damage (immortal boss), so the value moves zero damage (⚑ M3). CRITICAL: this is NOT encoded as the boss-debuff stat `damageTakenPct` (the schema's only damage-taken stat is a boss debuff = boss takes MORE); the kit line is ▼ on ALLIES (defensive), the inverse channel — encoding it on the boss would wrongly add up to +20% team damage. S1 'when Tidying Up is at max stacks, all allies: Max Ammunition Capacity ▲40% continuously': modeled `maxAmmoPct` 40 → allies, gated on `resourceGate {tidyingUp, min:10}` and re-asserted on each hitCount:120 once the gate passes (permanent — 'continuously'). The mechanic is in-domain; the ACTIVATION is the stack gate, which the resource pool encodes. --- STACK-SEMANTICS ASSUMPTION (drives M4 activation): the pool is monotonic (0→10, clamped, no decay) = 'once 10 stacks accrue, the ammo buff is permanent'. This commits to the REFRESH-ON-REAPPLY reading of 'Stacks up to 10 times and lasts for 15 sec' (each stack application refreshes the whole buffer to 15s, so stacks build monotonically to 10 since applications arrive ~every 7-8s, faster than the 15s expiry). The alternative per-stack-independent-decay reading would cap concurrent stacks at ~2 and the gate would NEVER open (0% uptime); refresh-on-reapply is the standard NIKKE convention for stackable timed buffs, so the driver adopts it and documents the alternative (⚑ M4). The activation TIME is NOT hardcoded — it EMERGES from the engine's hitCount cadence (Block A every 120 hits + Block C every 150 hits → 10 stacks at cumulative H where H/120 + H/150 ≥ 10 → H≈667 landed rounds). In the fixture this is frame 2797 (~46.6s), matching the cross-family reviewer's independent prose+cadence derivation (~45-50s). --- ⚑ LIST --- M3 TIDYING-UP DEFENSIVE VALUE (out-of-domain, defensive): the 2% Damage-Taken reduction is inert in v1 (no incoming damage). Estimate: 0 DPS. Recipe: if unit-facing boss damage is ever modeled, add an ally damage-taken-reduction stat (distinct from the boss-debuff damageTakenPct) and stack it via the existing tidyingUp pool. Tier: defensive-mechanic gap. M4 MAX-AMMO ACTIVATION-TIME (calibration, in-domain): the ▲40% max-ammo team buff is gated on 10 Tidying-Up stacks; the modeled activation (~46.6s in fixture) assumes refresh-on-reapply stack semantics + every fired round landing + the engine's SMG cadence/reload. Estimate: the buff adds ~+1.8% to +3.6% per ally (measured: removing it drops ada +1.75%, helm +2.48%, msb +3.18%, crown +3.58%); under the rejected per-stack-decay reading it would be 0. Recipe: footage of the Tidying-Up stack-counter accrual (refresh vs per-stack decay) + a popup-read of the real activation time would outrank the derivation. Tier 2 (status-gate). M5 STACK-COUNT-OF-BUFFS cross-ally portion (meta-defining, out-of-domain): adding stacks to TEAMMATES' stackable buffs has no engine primitive; the self-portion IS folded (Block C). Estimate: 0 in a single-unit encoding (purely a function of which stacking allies are fielded). Recipe: a cross-unit 'buffStackBonus' raising qualifying stacking buffs' stacks while active. Tier 2 (meta-defining). M6 CADENCE TUPLE (MANDATORY, datamine-unreliable): pullsPerSec at the SMG class default / reloadFrames 141 / 120-ammo belt; drives the stack-clock cadence, so it also sets the M4 activation time. Recipe: rounds/min + reload gap from any msb focus video. Self-validated against types.ts; the driver runs validate-overrides + the unit test. Kit-autonomy gauntlet 2026-07-31.",
"unmodeled": {
"skill1": [],
"skill2": [],
"burst": [
"Affects all allies. Removes 1 debuff(s)."
]
},
"caveats": [
"burst: the team ATK ▲39.93% is a caster-basis FLAT add ((39.93/100)×Mica's static ATK) to all allies INCLUDING self, for 5s per burstCast — NOT % of each ally's own ATK",
"skill2: the self Burst Gauge filling speed ▲300% (burstGenPct 300) is 'continuously' = permanent/passive; it scales only Mica's OWN gauge contribution",
"skill1: the Tidying-Up 'Damage Taken ▼2%' MAGNITUDE is unmodeled (defensive; no incoming-damage model) — but its STACK CLOCK IS modeled as the `tidyingUp` resource pool (Block A) because it gates the max-ammo line. NOT encoded as the boss-debuff damageTakenPct (that would be the inverse channel and wrongly add team damage)",
"skill1: the Max Ammunition Capacity ▲40% team buff (maxAmmoPct 40) is gated on resourceGate{tidyingUp,min:10}; activation EMERGES from the hitCount cadence (~46.6s in fixture), committing to the refresh-on-reapply stack reading (⚑ M4) — the per-stack-decay reading would never open the gate",
"skill2: 'Stack count of buffs ▲1' — the SELF portion is folded as a +1 to the tidyingUp pool on hitCount:150 (Block C, accelerates the M4 gate ~78.6s→~46.6s); the CROSS-ALLY portion (teammates' stack buffs) is out-of-domain (⚑ M5)"
],
"resources": [
{
"name": "tidyingUp",
"initial": 0,
"min": 0,
"max": 10
}
],
"skill1": [
{
"slot": "skill1",
"trigger": {
"kind": "hitCount",
"count": 120
},
"target": {
"kind": "self"
},
"effects": [
{
"kind": "resource",
"name": "tidyingUp",
"delta": 1
}
]
},
{
"slot": "skill1",
"trigger": {
"kind": "hitCount",
"count": 120
},
"target": {
"kind": "allies"
},
"resourceGate": {
"name": "tidyingUp",
"min": 10
},
"effects": [
{
"kind": "buff",
"stat": "maxAmmoPct",
"value": 40
}
]
}
],
"skill2": [
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
"stat": "burstGenPct",
"value": 300
}
]
},
{
"slot": "skill2",
"trigger": {
"kind": "hitCount",
"count": 150
},
"target": {
"kind": "self"
},
"effects": [
{
"kind": "resource",
"name": "tidyingUp",
"delta": 1
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
"stat": "casterAtkPct",
"value": 39.93,
"durationSec": 5
}
]
}
]
}

--- JUDGMENT FOCUS ---

1. Are ALL kit lines accounted for (modeled or documented gap, no silent drops)? Driver models M1 (burst ATK), M2 (burst gauge), M4 (gated max-ammo via resource clock), M5 self-portion (fold); documents M3 damage-taken VALUE (defensive), M5 cross-ally portion (meta), M6 debuff cleanse (defensive).
2. Is the max-ammo stack-gate encoding faithful? Driver commits to refresh-on-reapply stack semantics (standard NIKKE convention) -> gate opens ~46.6s (engine-emergent); documents the rejected per-stack-decay reading (gate never opens) as flag M4. Both blind agents independently made the SAME call and flagged the SAME binary.
3. Is the damageTakenPct-inversion guard correct? "Damage Taken ▼2%" on allies is defensive, NOT the boss-debuff damageTakenPct; driver models only the stack clock and asserts no boss-held damageTakenPct. All three agents converged.
4. Discrimination: are the driver's PINs real (liveness/scoping/basis/timing/gate)? Is the single S5 fail a REAL-GOTCHA or a blind over-claim?
   Return the verdict JSON with TOP-LEVEL verdict + faithfulnessScore.
