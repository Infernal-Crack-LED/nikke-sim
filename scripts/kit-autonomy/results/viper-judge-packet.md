==========================================================================================

## PART 1 — YOUR ROLE & RETURN CONTRACT (RECONCILING-JUDGE.md)

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

==========================================================================================

## PART 2a — MECHANICS SSOT: docs/data/damage-calculation.md

==========================================================================================

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

==========================================================================================

## PART 2b — MECHANICS SSOT: docs/data/game-mechanics.md

==========================================================================================

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

==========================================================================================

## PART 3 — GROUND TRUTH: kit prose + base stats + engine facts

==========================================================================================

UNIT: Viper (Treasure) (slug `viper`) — SG / Attacker / Water / Burst II, cd 20s, treasure=True.
normalAttackMultiplier=220.4 coreAttackMultiplier=200 ammo=9 reloadFrames=122 hitsPerShot=10 burstGaugePerShot=4.5.
baseStats: {"hp": 13500, "atk": 600, "def": 86, "core": {"hp": 200, "atk": 200, "def": 200}, "grade": {"hp": 3000, "atk": 20, "def": 100, "ratio": 200}, "critRate": 15, "maxLevel": 1200, "critDamage": 150, "resourceId": 112}
burstMeta: {"burst_duration": 1000, "use_burst_skill": "Step2", "burst_apply_delay": 1, "change_burst_step": "Step3"}

KIT PROSE (data/characters.json -> characters.viper.skills — the blablalink TREASURE prose, the authoritative favorite-item SSOT per DECISIONS 2026-07-17):

[skill1]
■ Activates when the stage target appears. Affects all allies.
ATK ▲ 25.98% for 10 sec.
Hit Rate ▲ 11.13% for 10 sec.
■ Only activates when attacking in Vamp status. Affects self.
Sustained Damage ▲ 4.4%. Stacks up to 10 times and lasts for 10 sec.
Hit Rate ▲ 1.84%. Stacks up to 10 times and lasts for 10 sec.

[skill2]
■ Affects self.
Hit Rate ▲ 21.96% continuously.
■ Activates when entering Full Burst. Affects self.
Vamp: Prevents being targeted by single-target attacks continuously. This effect is removed upon taking a direct hit.
Invulnerable for 1 sec.
■ Activates when using Burst Skill. Affects all allies.
Re-enters Burst Stage 2.

[burst]
■ Affects 1 designated enemy unit(s).
Deals 1029.6% of final ATK as damage.
■ Affects the enemy if the enemy is the stage target.
DEF ▼ 19.83% for 10 sec.
Deals 105.3% of final ATK as sustained damage every 1 sec for 10 sec.

BURST VALUE PROVENANCE (load-bearing for the nuke magnitude): the prose above says 1029.6% direct damage. The datamine ulti_skill_detail table in the SAME data file carries the UNTREASURED base value: description_value_02 (damage%) level10 = 462.85, skill_value_data[0] = 23142 (=231.42% at L1). DEF▼ 19.83% matches in BOTH prose and table. This is the same prose-vs-base-table split as helm (prose 8236.8 vs base 1237.5) and phantom; DECISIONS 2026-07-17 rules the favorite-item PROSE authoritative. So the faithful nuke magnitude is 1029.6%, and 462.85% is the nearest-wrong (base) value.

ENGINE FACTS (verified in source for this adjudication):

- sim.ts:1719 baseAtk = max(0, effectiveAtk(u,frame) - cfg.bossDef). Boss DEF is a FIXED config constant; NO buff/debuff channel feeds it. The engine cannot apply an enemy DEF reduction at all. SSOT damage-calculation.md: measured boss DEF ~140, a negligible flat subtractive term at scope-lock ATK (=> DEF▼19.83% ~ 0.01% damage). phantom/guilty/marciana all hold DEF▼ magnitude inert/verbatim-unmodeled.
- sustainedDamagePct feeds ONLY sustained-flavored hits (sim.ts:1688, opts.sustained). hitRatePct feeds the SG core-hit lift (sim.ts hrCoreMult / SG cone geometry, LIVE by default).
- reenterStage detection (sim.ts ~2995): requires trigger.kind==='burstCast' AND reenterStage.stage===castStage AND another eligible unit; holds the stage so a 2nd caster goes.
- fbGate:'inFb' blocks activate only during Full Burst. There is NO 'permanent-after-first-FB' gate primitive.

==========================================================================================

## PART 4 — S2b CROSS-FAMILY TEST-FAITHFULNESS REVIEW (claude-fable-5) + DRIVER RECONCILIATION

==========================================================================================

{
"slug": "viper",
"stage": "S2b/S2c",
"reviewerModel": "claude-fable-5",
"reviewerProvenance": "cross-family blind test-faithfulness review (canonical S2b routing)",
"verdict": "CONVERGED",
"leakDetected": null,
"loadBearingSet": [
"skill1:stage-target ATK ▲25.98% 10s (all allies, battle-start, lapses, no refire)",
"skill1:stage-target Hit Rate ▲11.13% 10s (all allies, same window)",
"skill1:Vamp-gated Sustained Damage ▲4.4%×10 (self, sustained-flavor coupling to the burst DoT)",
"skill1:Vamp-gated Hit Rate ▲1.84%×10 (self)",
"skill2:Hit Rate ▲21.96% passive self continuous (no expiry, self-only)",
"skill2:Vamp status grant on fullBurstEnter (the S1b gate; defensive text inert)",
"skill2:Re-enters Burst Stage 2 on burstCast (meta-defining; both B2s cast in chain)",
"burst:1029.6% nuke (TREASURE prose; pre-FB, no +50% major; PLAIN flavor, not sustained)",
"burst:105.3%/s ×10 sustained DoT (sole consumer of the S1b sustainedDamagePct stacks)",
"burst:DEF ▼19.83% — INERT/UNENACTABLE (driver) vs load-bearing boss debuff (reviewer) — reconciled to driver, see below"
],
"convergences": [
"S1a = battle-start team ATK 25.98 + Hit Rate 11.13, ALL allies, one-shot 10s opener window that lapses and never refires — both (driver: passive+durationSec; reviewer: 'exactly one buffApply per ally at t≈0, expiresFrame≈600, zero after t=10s')",
"S1b = Vamp-gated self sustainedDamagePct 4.4 + hitRatePct 1.84, maxStacks 10, 10s refresh; sustainedDamagePct boosts ONLY the sustained-flavored DoT, never normals/nuke — both flagged the flavor-coupling trap (encode stat as attackDamagePct OR DoT unflavored and the pair silently breaks while totals-moved tests stay green)",
"S2a = passive self hitRatePct 21.96, no expiry, SELF-only (not allies) — both",
"S2c reenterStage stage 2 on burstCast (viper's OWN burst) — both; reviewer independently noted it is invisible in single-B2 comps and that controlComp's crown (B2) is exactly the fixture that exposes an omission; driver pins count-of-B2-casts-before-B3 = 2 shipped vs 1 removed",
"B1 nuke = 1029.6 TREASURE prose (not the base-table 462.85), burstCast, pre-FB fbMajorApplied=false, PLAIN flavor so S1b stacks don't double-dip — both",
"B3 DoT = 105.3 sustained, exactly 10 ticks/cast (no runaway accumulation), never core, crit default OFF — both",
"Invulnerable 1s = UNMODELED defensive (no boss damage in v1) — both",
"all hit-rate magnitudes DATAMINED but their damage YIELD routes through the derived hrCoreMult (always-⚑) — both assert buffApply values + stack/duration shape, not a derived core-rate delta"
],
"reconciliations": [
"DEF ▼ 19.83% (the ONE disposition divergence): reviewer ruled it a load-bearing boss DEF debuff raising every team member's per-hit damage, and warned against dropping it as inert ('the types.ts defPct-inert comment covers SELF DEF, not the boss's DEF, which is a live formula term'). DRIVER OVERRIDES, on ground truth: (a) UNENACTABLE — boss DEF enters the formula only as the FIXED config constant cfg.bossDef subtracted at sim.ts:1719 (baseAtk = max(0, effectiveAtk − cfg.bossDef)); NO buff/debuff channel feeds it, so the engine literally cannot apply an enemy DEF reduction (verified in source — there is no enemy-DEF-debuff branch). (b) NEGLIGIBLE — SSOT docs/data/damage-calculation.md §enemy-DEF: measured boss DEF ≈140, a small flat subtractive term; 19.83% of 140 ≈ 28 ATK against scope-lock ATK in the hundreds of thousands ≈ 0.01% damage, below noise. (c) PRECEDENT — phantom (2026-07-26), guilty, marciana all hold DEF▼ magnitude inert/verbatim-unmodeled for the same reason. The reviewer's valid procedural point ('never a silent skip') is satisfied: the line is VERBATIM in unmodeled.burst with the sim.ts:1719 + SSOT rationale, not silently dropped. The reviewer ALSO agreed damageTakenPct is a wrong encoding ('different bucket/math'), corroborating the driver's rejection of the damageTakenPct over-credit. Disposition: INERT/UNMODELED (not a measurement GAP — there is nothing to measure; the magnitude is ~0.01% and unenactable).",
"Vamp gating precision: reviewer correctly notes Vamp, once granted on first fullBurstEnter, is PERMANENT in v1 (no boss damage → the removal-on-direct-hit clause never fires), so S1b stacks should strictly accrue on every shot after the first FB, not only inside FB windows; reviewer flags fbGate:'inFb' as an under-credit and ungated-from-t=0 as the opposite over-credit. DRIVER ADOPTS the framing but holds fbGate:'inFb' as the closest AVAILABLE primitive: the engine has no 'permanent-after-first-FB' block gate (fbGate is inFb/outFb only) and S4 forbids an engine change. The load-bearing coupling — sustainedDamagePct boosting the sustained burst DoT — is FULLY captured (the DoT's 10s post-cast window lies inside FB + the stacks' own 10s durationSec persistence; probe confirms FB DoT tick damage drops when S1b is removed). What is conservatively under-credited is the 1.84%×10 hit-rate stack refresh on NORMAL attacks during the ~10s between-FB gap — a second-order effect that itself routes through the derived hrCoreMult. Estimate <~1% of total. ⚑1 refined to state this precisely (was 'Vamp uptime ≈ FB uptime'); recipe = focus-video Vamp-icon uptime + between-FB core fraction; a 'permanent-after-first-FB' gate would enact it exactly. The ungated alternative was rejected (over-credits the pre-first-FB opening)."
],
"adoptedFromReviewer": [
"⚑1 refinement: state Vamp is permanent-after-first-FB in v1 and that fbGate:'inFb' under-credits only the between-FB hit-rate refresh (load-bearing sustained-DoT coupling fully captured) — sharper than the driver's original 'Vamp uptime ≈ FB uptime'",
"nuke PLAIN-flavor pin: the test already asserts the nuke is the 1029.6 burst-bucket hit and fbMajorApplied=false; the reviewer's 'must NOT be sustained-flavored (no double-dip from S1b)' is corroborated by the V2 load-bearing assertion (only the 105.3 DoT ticks shrink when S1b is removed, not the nuke)",
"reentry fixture rationale documented: controlComp's crown (B2) is the discriminator — the V4 counterfactual (count of B2 casts before the B3 = 2 vs 1) is exactly the reviewer's 'assert crown's per-rotation burstCast, judge by FB-count preservation'",
"DEF▼ documentation hardened with the sim.ts:1719 cfg.bossDef citation + the ~0.01% magnitude, so the inert disposition is auditable as 'declared inert', not a silent skip"
],
"driverDeviations": [
"DEF▼ held INERT/UNMODELED against the reviewer's load-bearing ruling — on sim.ts:1719 (no enemy-DEF-debuff channel) + SSOT negligible-magnitude + phantom/guilty/marciana precedent (see reconciliation 1)",
"Vamp gate held fbGate:'inFb' (closest available primitive, no engine change per S4) against the reviewer's 'permanent-after-first-FB' ideal — load-bearing coupling captured, residual is a declared ⚑ (see reconciliation 2)"
],
"notes": "Reviewer's expected-shared-prior misreads (notes field) were each independently matched by the driver's design: (1) Vamp gating trap — driver uses fbGate, reviewer refines to permanent-after-FB (reconciled); (2) flavor coupling — driver pins the sustained DoT shrinks without S1b while the nuke/normals don't; (3) DEF▼ — reviewer's 'don't silently skip' adopted as hardened documentation, inert disposition held on ground truth; (4) reentry invisible in single-B2 comps — driver's fixture deliberately includes crown; (5) 'stage target appears' refire on boss transitions — driver models one t=0 application (conservative faithful read; refire is MEASUREMENT-GATED, not assumable) — matches reviewer; (6) hit-rate yield is derived ⚑ — both; (7) fixture sanity (viper B2 needs B1+B3+partner-B2) — driver's [liter,viper,crown,helm] Fire focus viper. leakDetected null."
}

==========================================================================================

## PART 5 — S5 BLIND TEST (claude-opus-5) + green/red count vs driver override

==========================================================================================

S5 BLIND TEST-WRITER: claude-opus-5 (leakDetected null). Wrote blind/viper.test.ts from the prose ALONE.
GREEN/RED vs the DRIVER override:

- RAW (blind's own fixture controlComp('viper')): 10 pass / 10 fail / 5 skip. BUT the blind fixture places `crown` LEFT of `viper` in the B2 slot, so crown wins the stage-2 tie and VIPER CASTS 0 TIMES (probe-confirmed: viper 0 casts, crown 10) — vacuating every burst claim. This is a blind-FIXTURE artifact (a B2 re-entry unit must be the leftmost/sole B2 to cast), not driver infidelity.
- ADAPTED (blind/viper.adapted.test.ts — identical assertions, fixture corrected so viper is the leftmost B2 = the correct B2-reentry fixture): 15 PASS / 5 FAIL / 5 SKIP.
  The 15 PASSES include EVERY encoding-identity assertion: battle-start ATK 25.98 + HR 11.13 to ALL allies + exactly-10s window + team-lift; S1b self stacks capped at 10 + reach cap + GATED before first FB; S2a permanent self no-expiry; reenterStage 2 on OWN burstCast + adds burst casts in a two-B2 fixture; viper-casts non-vacuity; nuke 1029.6 instant + FB-EXEMPT; DoT 105.3 sustained 10s one-instance-per-cast; sustained-SCOPED-not-generic-Damage-Up.
  The 5 FAILS, each adjudicated:
  (1) 'Vamp persists AFTER the FB window closes' — the blind asserts stacks accrue between FB windows (Vamp permanent after first FB). Driver uses fbGate:'inFb'. RECONCILED ⚑1: the engine has no permanent-after-first-FB gate primitive (S4 forbids engine edits); fbGate:'inFb' fully captures the LOAD-BEARING sustained-DoT coupling (DoT 10s window ⊂ FB + 10s buff persistence; probe: FB DoT tick damage drops when S1b removed). Residual = between-FB hit-rate-stack refresh on normals, <~1%, itself derived (hrCoreMult). The ungated alternative over-credits the pre-first-FB opening (opposite error).
  (2,3) 'DEF 19.83% is a BOSS-held debuff' + 'DEF debuff lifts the WHOLE team' — the blind models DEF▼ as a load-bearing boss debuff. Driver holds it INERT/UNMODELED. RECONCILED to driver on GROUND TRUTH: sim.ts:1719 (cfg.bossDef fixed, no debuff channel — unenactable) + SSOT negligible (~0.01%) + phantom/guilty/marciana precedent. The blind test ITSELF agrees damageTakenPct is wrong.
  (4,5) S1b/S2a 'removing them costs viper damage and moves NO teammate' — the 'costs viper damage' half PASSES (driver probe: removing S2a = -7.2% viper total, removing S1b = -5.2%; both strongly load-bearing). The failure is the blind's `relDiff < 1e-9` BYTE-IDENTICAL-teammate tolerance catching a ~0.07% multi-unit coupling artifact; the driver scopes both lines self via target:'self'/targetIdx (the correct discrimination), and does NOT assert byte-identical teammates. Blind over-strictness, not driver infidelity.
  CONCLUSION: 0 of the 5 failures indicate driver infidelity; the blind writer independently re-derived the driver's exact encoding set.

--- blind/viper.test.ts (raw blind output; harness import path adapted, assertions unchanged) ---
/**

- viper (Viper) — SG / Water / Attacker / Burst II — BLIND per-unit kit spec test.
- Written from the kit prose ALONE (S5 cross-family post-op role); the driver's test, override and
- reasoning were not consulted.
-
- KIT, READ LITERALLY
- ***
- skill1 B1 'Activates when the stage target appears. Affects all allies.'
-              ATK 25.98% for 10 sec / Hit Rate 11.13% for 10 sec.
-            => a ONE-SHOT team window at battle start. Not permanent, not self-only.
- skill1 B2 'Only activates when attacking in Vamp status. Affects self.'
-              Sustained Damage 4.4% and Hit Rate 1.84%, each 'Stacks up to 10 times and lasts for
-              10 sec' => per-attack SELF stacks, hard cap 10, GATED on holding Vamp.
- skill2 B1 'Affects self. Hit Rate 21.96% continuously.' => permanent self buff, no expiry.
- skill2 B2 'Activates when entering Full Burst. Affects self.' Vamp (untargetable, removed upon a
-              direct hit) + Invulnerable 1 sec. Both are defensive => GAP in v1 (the boss deals no
-              damage). The DAMAGE-RELEVANT consequence is the gate above: Vamp is acquired at the
-              FIRST Full Burst entry and, since nothing can land a direct hit, is then held for the
-              rest of the fight — so skill1 B2 is DEAD before the first Full Burst and LIVE after
-              it, INCLUDING outside Full Burst. No self-status primitive is needed to express that:
-              a resource pool (initial 0, +1 on fullBurstEnter, shot-trigger resourceGate min 1)
-              encodes exactly this shape.
- skill2 B3 'Activates when using Burst Skill. Affects all allies. Re-enters Burst Stage 2.'
-            => own burstCast trigger + reenterStage 2 (a second Burst II ally may also cast).
-              Trigger identity matters: keying this to fullBurstEnter would fire it on ANY team
-              Full Burst, including rotations viper never bursts in.
- burst B1 1029.6% of final ATK to 1 designated enemy — instant, resolves AT CAST, i.e. before the
-              Full Burst window opens => it never takes the +50% Full-Burst major.
- burst B2 DEF 19.83% down for 10 sec on the stage target => a BOSS-held debuff: it lifts the
-              WHOLE team's damage, not viper's alone.
- burst B3 105.3% of final ATK as SUSTAINED damage every 1 sec for 10 sec => the consumer of the
-              Sustained Damage stacks; one DoT instance per cast, duration exactly the stated 10 s.
-
- FIXTURE — controlComp('viper', true): liter (B1) + crown (B2) + viper + helm (B3). viper is
- Burst II, so the fixed B3 slot is REQUIRED: without it the chain never reaches stage 3, no Full
- Burst ever starts, and the entire Vamp-gated half of her kit would be untestable (vacuous). The
- second Burst II in the fixture (crown) is also what makes 'Re-enters Burst Stage 2' observable.
-
- METHOD — every magnitude claim is a COUNTERFACTUAL DELTA against the same fixture
- (withPatchedOverride), so teammate auras cannot confound it, and every counterfactual asserts its
- mutation actually hit an effect (a no-op patch would silently test nothing). Counterfactual
- predicates match on VALUE, not on stat name, so the deltas survive a different-but-still-faithful
- stat encoding; the event assertions are what police the encoding itself.
  */
  import { describe, expect, it } from 'vitest';
  import type { SimEvent } from '../../../src/types.js';
  import { controlComp, runComp, totals, withPatchedOverride } from '../../tests/lib/harness.js';

const SLUG = 'viper';
const S1_ATK = 25.98;
const S1_HR = 11.13;
const VAMP_SUS = 4.4;
const VAMP_HR = 1.84;
const VAMP_STACKS = 10;
const S2_HR = 21.96;
const NUKE = 1029.6;
const DEF_DOWN = 19.83;
const DOT = 105.3;
const FPS = 60;

type Eff = {
kind: string;
stat?: string;
value?: number;
atkPct?: number;
durationSec?: number;
intervalSec?: number;
maxStacks?: number;
flavor?: string;
noFb?: boolean;
stage?: number;
};
type Blk = { trigger?: { kind?: string }; target?: { kind?: string }; effects?: Eff[] };
type Ov = Record<string, unknown>;
type Comp = ReturnType<typeof controlComp>;
type BuffEv = {
kind: string;
stat?: string;
value?: number;
stacks?: number;
maxStacks?: number;
casterIdx?: number | null;
targetIdx?: number | null;
targetSlug?: string | null;
expiresFrame?: number | null;
};

const SLOTS = ['skill1', 'skill2', 'burst'] as const;
const near = (a: number | undefined | null, b: number) =>
a !== undefined && a !== null && Math.abs(a - b) < 1e-6;

/** The override FILE is slot-keyed; tolerate both `slot: Block[]` and `slot: { blocks: Block[] }`. */
function blocksOf(ov: Ov, slot: string): Blk[] {
const raw = ov[slot];
if (!raw) return [];
if (Array.isArray(raw)) return raw as Blk[];
const nested = (raw as { blocks?: Blk[] }).blocks;
return Array.isArray(nested) ? nested : [];
}
const allBlocks = (ov: Ov): Blk[] => SLOTS.flatMap((s) => blocksOf(ov, s));
const findEffects = (ov: Ov, pred: (e: Eff) => boolean): Eff[] =>
allBlocks(ov).flatMap((b) => (b.effects ?? []).filter(pred));
const blocksWith = (ov: Ov, pred: (e: Eff) => boolean): Blk[] =>
allBlocks(ov).filter((b) => (b.effects ?? []).some(pred));
function dropEffects(ov: Ov, pred: (e: Eff) => boolean): number {
let n = 0;
for (const b of allBlocks(ov)) {
const before = (b.effects ?? []).length;
b.effects = (b.effects ?? []).filter((e) => !pred(e));
n += before - b.effects.length;
}
return n;
}
function editEffects(ov: Ov, pred: (e: Eff) => boolean, fn: (e: Eff) => void): number {
let n = 0;
for (const b of allBlocks(ov)) {
for (const e of b.effects ?? []) {
if (pred(e)) {
fn(e);
n += 1;
}
}
}
return n;
}
function clearSlot(ov: Ov, slot: string): void {
const raw = ov[slot];
if (raw && !Array.isArray(raw) && Array.isArray((raw as { blocks?: Blk[] }).blocks)) {
(raw as { blocks: Blk[] }).blocks = [];
} else {
ov[slot] = [];
}
}
const buffOfValue = (v: number) => (e: Eff) => e.kind === 'buff' && near(e.value, v);

/** Unmutated clone of the shipped override — for structural (encoding) assertions. */
const SHIPPED = withPatchedOverride(SLUG, () => {}) as unknown as Ov;

const hits: Record<string, number> = {};
function patched(name: string, mutate: (ov: Ov) => number) {
return withPatchedOverride(SLUG, (ov) => {
hits[name] = mutate(ov as unknown as Ov);
});
}
function comp(patch?: unknown): Comp {
const base = controlComp(SLUG, true) as Comp & { overrides?: Record<string, unknown> };
if (patch === undefined) return base as Comp;
return { ...base, overrides: { ...(base.overrides ?? {}), [SLUG]: patch } } as Comp;
}
function run(opts: Comp) {
const events: SimEvent[] = [];
const o = opts as Comp & { cfg?: Record<string, unknown> };
const res = runComp({
...o,
cfg: { ...(o.cfg ?? {}), onEvent: (ev: SimEvent) => events.push(ev) },
} as Comp);
return { res, events, tot: totals(res) };
}

const evKind = (e: SimEvent) => (e as unknown as BuffEv).kind;
const buffEvents = (evs: SimEvent[]): BuffEv[] =>
evs.filter((e) => evKind(e) === 'buffApply') as unknown as BuffEv[];
const byValue = (evs: SimEvent[], v: number): BuffEv[] =>
buffEvents(evs).filter((b) => near(b.value, v));
const kindIdx = (evs: SimEvent[], kind: string) => evs.findIndex((e) => evKind(e) === kind);
const idxsOf = (evs: SimEvent[], kind: string) =>
evs.map((e, i) => (evKind(e) === kind ? i : -1)).filter((i) => i >= 0);
const isVampSusApply = (e: SimEvent) => {
const b = e as unknown as BuffEv;
return b.kind === 'buffApply' && near(b.value, VAMP_SUS);
};
const relDiff = (a: number, b: number) => Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), 1);
const others = (t: Record<string, number>) => Object.keys(t).filter((s) => s !== SLUG);
const sumAll = (t: Record<string, number>) => Object.values(t).reduce((a, b) => a + b, 0);

// ---- hoisted runs (each is a full 180 s sim) --------------------------------------------------
const BASE = run(comp());
const NO_TEAM_WINDOW = run(
comp(
patched('teamWindow', (ov) =>
dropEffects(ov, (e) => buffOfValue(S1_ATK)(e) || buffOfValue(S1_HR)(e)),
),
),
);
const TEAM_WINDOW_PERMANENT = run(
comp(
patched('teamPermanent', (ov) =>
editEffects(
ov,
(e) => buffOfValue(S1_ATK)(e) || buffOfValue(S1_HR)(e),
(e) => {
e.durationSec = 9999;
},
),
),
),
);
const NO_VAMP_STACKS = run(
comp(
patched('vampOff', (ov) =>
dropEffects(ov, (e) => buffOfValue(VAMP_SUS)(e) || buffOfValue(VAMP_HR)(e)),
),
),
);
const VAMP_UNCAPPED = run(
comp(
patched('vampUncapped', (ov) =>
editEffects(
ov,
(e) => buffOfValue(VAMP_SUS)(e) || buffOfValue(VAMP_HR)(e),
(e) => {
e.maxStacks = 100;
},
),
),
),
);
const NO_S2_HR = run(comp(patched('s2HrOff', (ov) => dropEffects(ov, buffOfValue(S2_HR)))));
const NO_REENTER = run(
comp(patched('reenterOff', (ov) => dropEffects(ov, (e) => e.kind === 'reenterStage'))),
);
const NO_BURST = run(
comp(
patched('burstEmpty', (ov) => {
clearSlot(ov, 'burst');
return 1;
}),
),
);
const NO_NUKE = run(comp(patched('nukeOff', (ov) => dropEffects(ov, (e) => e.kind === 'flatDamage'))));
const NUKE_NOFB = run(
comp(
patched('nukeNoFb', (ov) =>
editEffects(
ov,
(e) => e.kind === 'flatDamage',
(e) => {
e.noFb = true;
},
),
),
),
);
const NO_DOT = run(comp(patched('dotOff', (ov) => dropEffects(ov, (e) => e.kind === 'dot'))));
const DOT_LONG = run(
comp(
patched('dotLong', (ov) =>
editEffects(
ov,
(e) => e.kind === 'dot',
(e) => {
e.durationSec = 30;
},
),
),
),
);
const SUS_X10 = run(
comp(
patched('susX10', (ov) =>
editEffects(ov, buffOfValue(VAMP_SUS), (e) => {
e.value = VAMP_SUS * 10;
}),
),
),
);
const NO_DOT_SUS_X10 = run(
comp(
patched(
'dotOffSusX10',
(ov) =>
dropEffects(ov, (e) => e.kind === 'dot') +
editEffects(ov, buffOfValue(VAMP_SUS), (e) => {
e.value = VAMP_SUS * 10;
}),
),
),
);

describe('viper skill1 B1 — stage-target team window (all allies, 10 sec)', () => {
it('ATK 25.98% reaches EVERY ally exactly once (target set: all allies, incl. self)', () => {
// Nearest-wrong: self-only (1 event) or enemy-scoped (targetSlug null).
const evs = byValue(BASE.events, S1_ATK);
const unitCount = Object.keys(BASE.tot).length;
expect(unitCount).toBeGreaterThan(1);
expect(evs.length).toBe(unitCount);
expect(new Set(evs.map((e) => e.targetSlug)).size).toBe(unitCount);
expect(evs.map((e) => e.targetSlug)).toContain(SLUG);
for (const e of evs) {
expect(e.stat).toBe('atkPct');
expect(e.targetSlug).toBeTruthy();
}
});

it('Hit Rate 11.13% reaches every ally the same way', () => {
const evs = byValue(BASE.events, S1_HR);
expect(evs.length).toBe(Object.keys(BASE.tot).length);
for (const e of evs) {
expect(e.stat).toBe('hitRatePct');
expect(e.targetSlug).toBeTruthy();
}
});

it('the window really is 10 sec, not a permanent aura (duration semantics)', () => {
// Every application expires inside the opening ~11 s; a permanent encoding would have no/huge
// expiry. The counterfactual makes it permanent and the whole team gains damage => the 10 s
// bound is load-bearing, not decorative.
for (const e of [...byValue(BASE.events, S1_ATK), ...byValue(BASE.events, S1_HR)]) {
const exp = e.expiresFrame ?? Number.POSITIVE_INFINITY;
expect(exp).toBeGreaterThan(0);
expect(exp).toBeLessThanOrEqual(11 * FPS);
}
expect(hits.teamPermanent).toBeGreaterThanOrEqual(2);
expect(sumAll(TEAM_WINDOW_PERMANENT.tot)).toBeGreaterThan(sumAll(BASE.tot) * 1.001);
});

it('the window lifts the WHOLE team, not just viper', () => {
expect(hits.teamWindow).toBeGreaterThanOrEqual(2);
expect(BASE.tot[SLUG]).toBeGreaterThan(NO_TEAM_WINDOW.tot[SLUG]);
for (const s of others(BASE.tot)) {
expect(BASE.tot[s]).toBeGreaterThan(NO_TEAM_WINDOW.tot[s]);
}
});
});

describe('viper skill1 B2 — Vamp-gated self stacks (10 stacks, 10 sec)', () => {
it('Sustained Damage 4.4% is a SELF stack capped at 10 and it reaches the cap', () => {
const evs = byValue(BASE.events, VAMP_SUS);
expect(evs.length).toBeGreaterThan(0);
for (const e of evs) {
expect(e.stat).toBe('sustainedDamagePct');
expect(e.targetSlug).toBe(SLUG); // self only — nearest-wrong: allies
expect(e.maxStacks).toBe(VAMP_STACKS);
}
expect(Math.max(...evs.map((e) => e.stacks ?? 0))).toBe(VAMP_STACKS);
});

it('Hit Rate 1.84% is the same self stack (10 max)', () => {
const evs = byValue(BASE.events, VAMP_HR);
expect(evs.length).toBeGreaterThan(0);
for (const e of evs) {
expect(e.stat).toBe('hitRatePct');
expect(e.targetSlug).toBe(SLUG);
expect(e.maxStacks).toBe(VAMP_STACKS);
}
});

it('the stacks are GATED on Vamp: none exist before the first Full Burst entry', () => {
// Vamp is granted on entering Full Burst (skill2). Nearest-wrong: an ungated per-shot stack,
// which would apply from t=0. Non-vacuity: shots DO occur before the first Full Burst, so the
// wrong model would visibly stack there.
const fbIdx = kindIdx(BASE.events, 'fullBurstStart');
expect(fbIdx).toBeGreaterThan(-1);
const shotIdx = kindIdx(BASE.events, 'shot');
expect(shotIdx).toBeGreaterThanOrEqual(0);
expect(shotIdx).toBeLessThan(fbIdx);
const firstStack = BASE.events.findIndex(isVampSusApply);
expect(firstStack).toBeGreaterThan(fbIdx);
});

it('Vamp persists AFTER the Full Burst window closes (not an in-Full-Burst-only gate)', () => {
// Vamp is 'continuously' held and is only removed by a direct hit, which cannot happen in v1.
// Nearest-wrong: fbGate 'inFb', which would produce zero stack applies between windows.
const fbEnds = idxsOf(BASE.events, 'fullBurstEnd');
const fbStarts = idxsOf(BASE.events, 'fullBurstStart');
expect(fbEnds.length).toBeGreaterThan(0);
const gapEnd = fbStarts.find((i) => i > fbEnds[0]) ?? BASE.events.length;
const gap = BASE.events.slice(fbEnds[0] + 1, gapEnd);
expect(gap.some((e) => evKind(e) === 'shot')).toBe(true); // non-vacuity: she attacks in the gap
expect(gap.some(isVampSusApply)).toBe(true);
});

it('the 10-stack cap binds (an uncapped model over-credits)', () => {
expect(hits.vampUncapped).toBeGreaterThanOrEqual(2);
expect(VAMP_UNCAPPED.tot[SLUG]).toBeGreaterThan(BASE.tot[SLUG]);
});

it('the stacks are self-scoped: removing them costs viper damage and moves NO teammate', () => {
expect(hits.vampOff).toBeGreaterThanOrEqual(2);
expect(BASE.tot[SLUG]).toBeGreaterThan(NO_VAMP_STACKS.tot[SLUG]);
for (const s of others(BASE.tot)) {
expect(relDiff(BASE.tot[s], NO_VAMP_STACKS.tot[s])).toBeLessThan(1e-9);
}
});

it('Sustained Damage is SCOPED to sustained damage, not a generic Damage Up', () => {
// x10 the buff: with the DoT present viper gains; with the DoT removed the same x10 must be
// perfectly inert. Nearest-wrong: encoded as attackDamagePct/trueDamagePct, which would still
// move her normal-attack damage in the DoT-less run.
expect(SUS_X10.tot[SLUG]).toBeGreaterThan(BASE.tot[SLUG]);
expect(hits.dotOffSusX10).toBeGreaterThanOrEqual(2);
expect(relDiff(NO_DOT_SUS_X10.tot[SLUG], NO_DOT.tot[SLUG])).toBeLessThan(1e-9);
});
});

describe('viper skill2 B1 — continuous self Hit Rate 21.96%', () => {
it('is a permanent SELF buff with no 10-sec-style expiry', () => {
const evs = byValue(BASE.events, S2_HR);
expect(evs.length).toBeGreaterThanOrEqual(1);
for (const e of evs) {
expect(e.stat).toBe('hitRatePct');
expect(e.targetSlug).toBe(SLUG);
const exp = e.expiresFrame;
expect(exp === undefined || exp === null || exp > 180 * FPS).toBe(true);
}
});

it('is live: removing it costs viper damage (hit rate feeds the core lift) and moves no ally', () => {
expect(hits.s2HrOff).toBeGreaterThanOrEqual(1);
expect(BASE.tot[SLUG]).toBeGreaterThan(NO_S2_HR.tot[SLUG]);
for (const s of others(BASE.tot)) {
expect(relDiff(BASE.tot[s], NO_S2_HR.tot[s])).toBeLessThan(1e-9);
}
});
});

describe('viper skill2 B3 — Re-enters Burst Stage 2', () => {
it('is encoded as reenterStage 2 on an OWN burst-cast trigger', () => {
// Trigger identity: 'when using Burst Skill' = burstCast. Nearest-wrong: fullBurstEnter (fires
// on any team Full Burst) or burstEligibility (a different primitive entirely).
const eff = findEffects(SHIPPED, (e) => e.kind === 'reenterStage');
expect(eff.length).toBe(1);
expect(eff[0].stage).toBe(2);
const blk = blocksWith(SHIPPED, (e) => e.kind === 'reenterStage')[0];
expect(blk).toBeTruthy();
expect(blk.trigger?.kind).toBe('burstCast');
});

it('is NOT inert: it adds burst casts in a two-Burst-II fixture', () => {
expect(hits.reenterOff).toBe(1);
const casts = (evs: SimEvent[]) => evs.filter((e) => evKind(e) === 'burstCast').length;
expect(casts(BASE.events)).toBeGreaterThanOrEqual(2);
expect(casts(BASE.events)).toBeGreaterThan(casts(NO_REENTER.events));
});
});

describe('viper burst', () => {
it('viper actually casts her burst in this fixture (non-vacuity for every burst claim below)', () => {
expect(BASE.tot[SLUG]).toBeGreaterThan(NO_BURST.tot[SLUG]);
});

it('1029.6% single-target hit is instant and Full-Burst-EXEMPT (it resolves at cast)', () => {
const nuke = findEffects(SHIPPED, (e) => e.kind === 'flatDamage' && near(e.atkPct, NUKE));
expect(nuke.length).toBe(1);
expect(hits.nukeOff).toBeGreaterThanOrEqual(1);
expect(BASE.tot[SLUG]).toBeGreaterThan(NO_NUKE.tot[SLUG]);
// Forcing noFb changes nothing => the cast never received the +50% Full-Burst major.
// Nearest-wrong: the hit modelled at Full-Burst entry, where noFb would visibly cut it.
expect(hits.nukeNoFb).toBeGreaterThanOrEqual(1);
expect(relDiff(NUKE_NOFB.tot[SLUG], BASE.tot[SLUG])).toBeLessThan(1e-9);
});

it('105.3% sustained DoT every 1 sec for 10 sec — one instance per cast, duration read literally', () => {
const dots = findEffects(SHIPPED, (e) => e.kind === 'dot');
expect(dots.length).toBe(1); // one instance; a repeating trigger would multiply it
expect(dots[0].atkPct).toBeCloseTo(DOT, 6);
expect(dots[0].durationSec).toBe(10);
expect(dots[0].intervalSec ?? 1).toBe(1);
expect(dots[0].flavor).toBe('sustained');
expect(hits.dotOff).toBeGreaterThanOrEqual(1);
expect(BASE.tot[SLUG]).toBeGreaterThan(NO_DOT.tot[SLUG]);
// 10 s is not a free parameter: stretching it to 30 s adds ticks and damage.
expect(DOT_LONG.tot[SLUG]).toBeGreaterThan(BASE.tot[SLUG]);
});

it('DEF 19.83% down is a BOSS-held debuff, never an ally buff', () => {
const d = byValue(BASE.events, DEF_DOWN);
expect(d.length).toBeGreaterThanOrEqual(1);
for (const e of d) {
expect(e.casterIdx == null).toBe(true);
expect(e.targetIdx == null).toBe(true);
expect(e.stat).toBe('defPct');
}
expect(buffEvents(BASE.events).filter((b) => near(b.value, DEF_DOWN) && b.targetSlug).length).toBe(0);
});

it('the DEF debuff lifts the WHOLE team, not just viper', () => {
// NO_BURST strips the nuke + DoT (viper-only) AND the DEF debuff (team-wide); burst casting
// itself is unaffected by emptying the slot, so any TEAMMATE delta is the debuff.
// Nearest-wrong: a self-scoped or inert DEF encoding => teammates byte-identical.
for (const s of others(BASE.tot)) {
expect(BASE.tot[s]).toBeGreaterThan(NO_BURST.tot[s]);
}
});
});

describe('viper — GAP lines (no primitive / unobservable in v1)', () => {
it.skip('skill2 Vamp: prevents being targeted by single-target attacks — GAP: the v1 boss deals no damage and there is no targeting model', () => {});
it.skip('skill2 Vamp: removed upon taking a direct hit — GAP: no incoming-damage model, so Vamp is held for the rest of the fight once acquired', () => {});
it.skip('skill2 Invulnerable for 1 sec — GAP: defensive, no HP pool', () => {});
it.skip("burst 'Affects 1 designated enemy unit(s)' — GAP: v1 has exactly one enemy, so single-target scoping is unobservable", () => {});
it.skip("burst 'if the enemy is the stage target' — GAP: the scope-lock boss IS the stage target, so the condition can never be falsified here", () => {});
});

==========================================================================================

## PART 6 — S6 BLIND OVERRIDE (claude-opus-5) + diff vs driver

==========================================================================================

S6 BLIND OVERRIDE-WRITER: claude-opus-5 (leakDetected null). Wrote blind/viper.override.json from the prose ALONE.
DIFF vs the DRIVER override (src/skills/overrides/viper.json):
IDENTICAL encodings (independent convergence on every load-bearing line):

- skill1[0]: passive -> allies atkPct 25.98/dur10 + hitRatePct 11.13/dur10 (battle-start team window) — SAME
- skill1[1]: shotFired -> self, fbGate:'inFb', sustainedDamagePct 4.4/max10/dur10 + hitRatePct 1.84/max10/dur10 — SAME (incl. the non-obvious fbGate:'inFb' Vamp reading)
- skill2[0]: passive -> self hitRatePct 21.96 (continuous) — SAME
- skill2[1]: burstCast -> allies reenterStage stage 2 — SAME
- burst nuke: burstCast -> enemy flatDamage 1029.6 (TREASURE value, NOT base 462.85) — SAME
- burst DoT: burstCast -> enemy dot 105.3/dur10/flavor sustained — SAME
  ONLY DIFFERENCE — the DEF▼19.83% inert-encoding STYLE:
- blind: models it as `defPct -19.83` target enemy (the guilty-style 'inert-visible' convention; defPct on the enemy is inert — the engine drops it). NOT damageTakenPct.
- driver: places it VERBATIM in unmodeled.burst (the phantom-style convention), documented inert (sim.ts:1719 + SSOT negligible).
  Both treat DEF▼ as INERT (neither uses damageTakenPct); the difference is visibility style only, not faithfulness. Both are repo-sanctioned inert treatments.
  unmodeled: blind lists Vamp/invulnerable in skill2 (as driver); driver additionally lists DEF▼ in burst (blind modeled it inert instead).
  CONCLUSION: the blind override converges on the driver's full encoding set; the single divergence is a cosmetic inert-encoding choice on a line both agree is inert.

--- blind/viper.override.json ---
{
"slug": "viper",
"skill1": [
{
"slot": "skill1",
"trigger": {
"kind": "passive"
},
"target": {
"kind": "allies"
},
"effects": [
{
"kind": "buff",
"stat": "atkPct",
"value": 25.98,
"durationSec": 10
},
{
"kind": "buff",
"stat": "hitRatePct",
"value": 11.13,
"durationSec": 10
}
]
},
{
"slot": "skill1",
"trigger": {
"kind": "shotFired"
},
"target": {
"kind": "self"
},
"fbGate": "inFb",
"effects": [
{
"kind": "buff",
"stat": "sustainedDamagePct",
"value": 4.4,
"durationSec": 10,
"maxStacks": 10
},
{
"kind": "buff",
"stat": "hitRatePct",
"value": 1.84,
"durationSec": 10,
"maxStacks": 10
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
"stat": "hitRatePct",
"value": 21.96
}
]
},
{
"slot": "skill2",
"trigger": {
"kind": "burstCast"
},
"target": {
"kind": "allies"
},
"effects": [
{
"kind": "reenterStage",
"stage": 2
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
"atkPct": 1029.6
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
"kind": "buff",
"stat": "defPct",
"value": -19.83,
"durationSec": 10
},
{
"kind": "dot",
"atkPct": 105.3,
"durationSec": 10,
"intervalSec": 1,
"flavor": "sustained"
}
]
}
],
"unmodeled": {
"skill1": [],
"skill2": [
"Vamp: Prevents being targeted by single-target attacks continuously. This effect is removed upon taking a direct hit.",
"Invulnerable for 1 sec."
],
"burst": []
},
"caveats": [
"\u2691 skill1 block A trigger: kit says the buff fires \"when the stage target appears\"; modeled as a passive self-applying 10s window at t=0. Whether it re-fires on boss transitions/phase changes is kit-silent and unmeasured.",
"\u2691 skill1 block B is gated on the unit being in Vamp status (granted by skill2 on Full Burst entry, lost on a direct hit). The schema has no self-status gate (requiresTargetStatus is boss-scoped), so this is proxied with fbGate:'inFb' \u2014 CONSERVATIVE: real Vamp persists after the FB window until a direct hit, so the model under-credits post-FB stacking. Do not treat the proxy as the measured mechanic.",
"\u2691 The self stacks (4.4% Sustained Damage / 1.84% Hit Rate, cap 10, 10s) are modeled as per-trigger-pull accrual via shotFired; the kit says only \"when attacking\", so pellets-vs-pulls accrual is unmeasured. With 9 rounds/magazine the cap is only reachable inside a single FB window if the accrual is per pull and no reload intervenes.",
"\u2691 Total Hit Rate on this unit is large (21.96 continuous + 11.13 team-wide opener + up to 18.4 stacked). The Hit-Rate\u2192core conversion magnitude is engine-derived and unmeasured for this unit \u2014 it is the single biggest lever on her modeled damage.",
"\u2691 DEF \u25bc 19.83% is authored as an enemy-targeted buff with stat 'defPct' and a NEGATIVE value; the sign/stat convention for boss DEF reduction was not verifiable from the schema comments (which describe defPct in its self/Endurance-cube role). If the engine expects a different channel, this line is wrong in encoding, not in magnitude.",
"The burst's Sustained Damage DoT is boosted by this unit's own skill1 Sustained Damage stacks \u2014 the two lines are coupled, so a stack-model error propagates into burst damage.",
"DoT append-not-refresh: each burst cast appends an independent 10s instance. With a 20s burst cooldown, instances should not overlap; if measured rotation lets her burst faster, verify no double-counting.",
"noFb is deliberately NOT set anywhere (default FB-by-timing ON, measured-only). The burst-cast instant hit is FB-exempt by cast timing, not by an override flag.",
"Weapon cadence (9 ammo, 122 reload frames, 10 pellets/shot) comes from the datamine and is unreliable per the standing prior; it was not adjusted here."
],
"note": "PARSER BASELINE (HYPOTHESIS \u2014 NOT a validated model). Every \u2691 below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Viper (SG/Water/Attacker/Burst II) is modeled as: (skill1) a fight-open 10s team ATK+Hit-Rate window, plus a self-stacking Sustained-Damage/Hit-Rate ramp gated on Vamp status (proxied by fbGate:'inFb' \u2014 no self-status primitive exists); (skill2) a continuous self Hit-Rate passive and a rotation effect \u2014 her burst re-enters Burst Stage 2, letting a second Burst II ally cast in the same chain; (burst) a 1029.6% single-target nuke, a 10s boss DEF \u25bc, and a 10s 105.3%/sec Sustained DoT that her own skill1 stacks amplify. Defensive Vamp untargetability and the 1s invulnerability are deliberately unmodeled (no boss damage in v1) \u2014 but Vamp is NOT inert in principle: it is the enabling condition for the skill1 stack block, which is why that block carries a proxy gate rather than being skipped. The rotation-facing reenterStage effect is the highest-leverage line in this override and is the first thing to verify against a rotation log."
}

==========================================================================================

## PART 7a — DRIVER IMPLEMENTATION: scripts/tests/units/viper.test.ts

==========================================================================================

// PER-UNIT KIT SPEC — `viper` (Viper (Treasure), Attacker/SG/Water, Burst II, cd 20s, ammo 9,
// hitsPerShot 10). Kit-autonomy gauntlet 2026-08-01; test-first re-derivation from the blablalink
// TREASURE prose (data/characters.json → characters.viper.skills — the authoritative favorite-item
// SSOT, DECISIONS 2026-07-17).
//
// One assertion group per KIT LINE (V1..V8 below), asserted against the SHIPPED override loaded from
// disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model each
// assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink treasure prose, characters.viper.skills):
// S1 ■ stage target appears → all allies: ATK ▲25.98% / Hit Rate ▲11.13% for 10 sec [V1]
// ■ attacking in Vamp status → self: Sustained Damage ▲4.4% / Hit Rate ▲1.84%, ×10, 10s [V2]
// S2 ■ self: Hit Rate ▲21.96% continuously [V3]
// ■ entering Full Burst → self: Vamp (no single-target) + Invulnerable 1 sec DEFENSIVE [V8 unmodeled]
// ■ using Burst Skill → all allies: Re-enters Burst Stage 2 META-DEFINING [V4]
// BU ■ 1 designated enemy: 1029.6% of final ATK as damage [V5]
// ■ stage target: DEF ▼19.83% for 10 sec INERT [V7 unmodeled]
// ■ stage target: 105.3% of final ATK as sustained damage every 1 sec for 10 sec [V6]
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
// V1 a SELF-only reading of the stage-start buff would leave the other three allies cold; the
// shipped line targets ALL ALLIES. Proven by asserting the buff reaches four distinct holders
// (incl. non-viper allies) at frame 0 for exactly 10s, and that removing the line deletes it.
// V2 the stacks are GATED to the Vamp status = the Full-Burst window (fbGate:'inFb'). Without the
// gate they would accrue from battle start; proven by first-apply frame landing AFTER FB entry
// (shipped) vs BEFORE it (gate-removed counterfactual). sustainedDamagePct is load-bearing: it
// feeds the sustained-flavored burst DoT (sim.ts:1688), so removing the line drops FB DoT ticks.
// V3 the continuous self Hit Rate is a distinct line from the two V1/V2 hit-rate grants; pinned by
// value 21.96 / self / no expiry, and live via the hrCoreMult core-hit lift (⚑ derived).
// V4 Re-enters Burst Stage 2 is her IDENTITY: after her B2 cast the stage HOLDS so a second B2
// (crown) casts in the same chain, exactly one STAGE_CAST_GAP (30f) later (Tia T6 pattern).
// Removed, the stage advances after her and crown gets no chain-1 B2 window.
// V5 the nuke is the TREASURE prose 1029.6%, NOT the untreasured datamine-table 462.85% (same
// prose-vs-base split as helm 8236.8 vs 1237.5). A B2 cast lands BEFORE Full Burst opens, so it
// must never take the +50% major (verified fbMajorApplied=false).
// V6 the sustained damage is a 10-tick DoT (1/s for 10s), sustained-flavored — proven per-cast tick
// count for casts whose window fits the fight, and by the V2 coupling (FB ticks shrink without
// her sustainedDamagePct stacks).
// V7 DEF ▼ is INERT (enemy DEF is a negligible flat subtractive term at scope-lock; the engine drops
// enemy DEF debuffs, docs/data/damage-calculation.md). The nearest-wrong model — encoding it as a
// damageTakenPct team vuln — would over-credit ~19.83% team damage the kit does NOT deliver. Pinned
// structurally: NO damageTakenPct block, and the line sits VERBATIM in unmodeled.burst.
// V8 Vamp/invulnerable is DEFENSIVE (no HP pool / targeting / boss damage in v1). Pinned structurally:
// no shield/invulnerable block, line VERBATIM in unmodeled.skill2; only its offensive GATE (V2's
// FB window) is modeled.
//
// Fixture: viper is Burst II, so she needs a B1 + a B3 to complete a chain AND a partner B2 for her
// re-entry to be observable. Comp = liter(B1) / viper(B2) / crown(B2) / helm(B3), boss Fire (viper is
// Water → clean ×1.10 advantage, constant across base/counterfactual), focus viper. Viper is the
// LEFTMOST B2, so she wins the stage-2 tie and casts first every chain (probe: viper B2 f251 → crown B2
// f281 re-entry → helm B3 f311); her re-entry is what lets crown cast too. Deterministic (no seed);
// assertions read the event log, not totals, except where a load-bearing coupling needs a damage delta.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const FIGHT_FRAMES = 180 * FPS;
/** comp slot order: liter 0 / viper 1 / crown 2 / helm 3. */
const VIPER = 1;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

const FIX = {
slugs: ['liter', 'viper', 'crown', 'helm'],
bossElement: 'Fire' as const,
focusSlug: 'viper',
};

function run(overrides: Record<string, any> = {}) {
const events: SimEvent[] = [];
const res = runComp({ ...FIX, overrides, cfg: { onEvent: (e) => events.push(e) } });
return { events, totals: totals(res) };
}

// ---- counterfactual / nearest-wrong patches --------------------------------------------------
const hasStat = (b: any, stat: string, value?: number) =>
b.effects.some((e: any) => e.stat === stat && (value === undefined || e.value === value));

/** V1 reference: the stage-start team ATK/Hit-Rate line removed. _/
const viperNoS1a = withPatchedOverride('viper', (ov) => {
const before = ov.skill1.length;
ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'atkPct', 25.98));
if (ov.skill1.length === before) throw new Error('viper S1a atkPct 25.98 block missing — fixture stale');
});
/_* V2 reference: the Vamp-gated self sustained/hit-rate stacker removed. _/
const viperNoS1b = withPatchedOverride('viper', (ov) => {
const before = ov.skill1.length;
ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'sustainedDamagePct'));
if (ov.skill1.length === before) throw new Error('viper S1b sustainedDamagePct block missing — fixture stale');
});
/_* V2 counterfactual: the same stacker with the Vamp (FB) gate removed — accrues from battle start. _/
const viperNoFbGate = withPatchedOverride('viper', (ov) => {
const b = ov.skill1.find((x: any) => hasStat(x, 'sustainedDamagePct'));
if (!b) throw new Error('viper S1b sustainedDamagePct block missing — fixture stale');
delete b.fbGate;
});
/_* V3 reference: the continuous self Hit-Rate line removed. _/
const viperNoS2a = withPatchedOverride('viper', (ov) => {
const before = ov.skill2.length;
ov.skill2 = ov.skill2.filter((b: any) => !hasStat(b, 'hitRatePct', 21.96));
if (ov.skill2.length === before) throw new Error('viper S2a hitRatePct 21.96 block missing — fixture stale');
});
/_* V4 reference: the burst re-entry line removed (stage advances after her). _/
const viperNoReenter = withPatchedOverride('viper', (ov) => {
const before = ov.skill2.length;
ov.skill2 = ov.skill2.filter((b: any) => !b.effects.some((e: any) => e.kind === 'reenterStage'));
if (ov.skill2.length === before) throw new Error('viper reenterStage block missing — fixture stale');
});
/_* V5 counterfactual: the nuke at the UNTREASURED datamine-table value (462.85) instead of treasure 1029.6. _/
const viperBaseNuke = withPatchedOverride('viper', (ov) => {
const e = ov.burst.flatMap((b: any) => b.effects).find((x: any) => x.kind === 'flatDamage' && x.atkPct === 1029.6);
if (!e) throw new Error('viper burst nuke 1029.6 missing — fixture stale');
e.atkPct = 462.85;
});
/_* V6 reference: the sustained-damage DoT removed. */
const viperNoDot = withPatchedOverride('viper', (ov) => {
const before = ov.burst.length;
ov.burst = ov.burst.filter((b: any) => !b.effects.some((e: any) => e.kind === 'dot'));
if (ov.burst.length === before) throw new Error('viper burst dot block missing — fixture stale');
});

// ---- runs (hoisted: each is a full 180s sim) -------------------------------------------------
const base = run();
const noS1a = run({ viper: viperNoS1a });
const noS1b = run({ viper: viperNoS1b });
const noFbGate = run({ viper: viperNoFbGate });
const noS2a = run({ viper: viperNoS2a });
const baseNuke = run({ viper: viperBaseNuke });
const noDot = run({ viper: viperNoDot });

// ---- readers ---------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) => evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) => evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const casts = (evs: SimEvent[]) => evs.filter((e): e is BurstCast => e.kind === 'burstCast');
const viperCasts = (evs: SimEvent[]) => casts(evs).filter((c) => c.slug === 'viper');
const viperDmg = (evs: SimEvent[]) => dmg(evs).filter((d) => d.slug === 'viper');
/** viper's burst-bucket hits split by kit line: the nuke (any magnitude ≠ the DoT's 105.3) vs the

- 105.3 sustained DoT ticks. Value-agnostic on the nuke so the base-value counterfactual is readable. _/
  const nukes = (evs: SimEvent[]) => viperDmg(evs).filter((d) => d.srcSlot === 'burst' && d.atkPct !== 105.3);
  const dotTicks = (evs: SimEvent[]) => viperDmg(evs).filter((d) => d.srcSlot === 'burst' && d.atkPct === 105.3);
  /_* First Full-Burst opening = helm's first stage-3 cast (helm is the comp's sole B3). */
  const firstFbFrame = (evs: SimEvent[]) =>
  casts(evs).find((c) => c.slug === 'helm' && c.stage === 3)?.frame ?? Infinity;

describe('viper (Treasure) — kit spec', () => {
describe('V1 — S1 stage-start team ATK + Hit Rate (all allies, 10 sec)', () => {
const atkApplies = buffs(base.events).filter(
(b) => b.casterIdx === VIPER && b.stat === 'atkPct' && b.value === 25.98
);
const hrApplies = buffs(base.events).filter(
(b) => b.casterIdx === VIPER && b.stat === 'hitRatePct' && b.value === 11.13
);

    it('grants ATK ▲25.98% to ALL FOUR allies at battle start, for exactly 10 sec', () => {
      expect(atkApplies.length).toBeGreaterThan(0);
      expect([...new Set(atkApplies.map((b) => b.targetIdx))].sort()).toEqual([0, 1, 2, 3]);
      for (const b of atkApplies) {
        expect(b.frame, 'stage-start buff must apply at t=0').toBe(0);
        expect(b.expiresFrame! - b.frame, '10 sec window').toBe(10 * FPS);
      }
    });

    it('grants the matching Hit Rate ▲11.13% to all four allies on the same window', () => {
      expect([...new Set(hrApplies.map((b) => b.targetIdx))].sort()).toEqual([0, 1, 2, 3]);
      for (const b of hrApplies) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });

    it('DISCRIMINATING: removing the line deletes the team buff (it is live, not inert)', () => {
      const gone = buffs(noS1a.events).filter((b) => b.casterIdx === VIPER && b.stat === 'atkPct' && b.value === 25.98);
      expect(gone).toEqual([]);
    });

});

describe('V2 — S1 Vamp-gated self Sustained Damage + Hit Rate stacks (×10, FB window)', () => {
const sdApplies = buffs(base.events).filter((b) => b.casterIdx === VIPER && b.stat === 'sustainedDamagePct');
const hrApplies = buffs(base.events).filter((b) => b.casterIdx === VIPER && b.stat === 'hitRatePct' && b.value === 1.84);

    it('is Sustained Damage ▲4.4% / Hit Rate ▲1.84%, self-scoped, stacking to 10', () => {
      expect([...new Set(sdApplies.map((b) => b.value))]).toEqual([4.4]);
      expect([...new Set(sdApplies.map((b) => b.maxStacks))]).toEqual([10]);
      expect([...new Set(sdApplies.map((b) => b.targetIdx))]).toEqual([VIPER]);
      expect(Math.max(...sdApplies.map((b) => b.stacks)), 'ramps to the 10-stack cap').toBe(10);
      expect([...new Set(hrApplies.map((b) => b.value))]).toEqual([1.84]);
      expect([...new Set(hrApplies.map((b) => b.maxStacks))]).toEqual([10]);
    });

    it('is GATED to the Full-Burst (Vamp) window — first stack lands AFTER FB entry, not at battle start', () => {
      const fb = firstFbFrame(base.events);
      const firstApply = Math.min(...sdApplies.map((b) => b.frame));
      expect(firstApply, 'Vamp gate: no stack before Full Burst').toBeGreaterThan(fb);
    });

    it('DISCRIMINATING: without the gate the stacks accrue from battle start (pre-FB)', () => {
      const fb = firstFbFrame(noFbGate.events);
      const ungated = buffs(noFbGate.events).filter((b) => b.casterIdx === VIPER && b.stat === 'sustainedDamagePct');
      const firstUngated = Math.min(...ungated.map((b) => b.frame));
      expect(firstUngated, 'gate removed → a stack lands before FB entry').toBeLessThan(fb);
    });

    it('DISCRIMINATING: sustainedDamagePct is LOAD-BEARING — it feeds the sustained burst DoT in FB', () => {
      const fbDots = (evs: SimEvent[]) =>
        dotTicks(evs).filter((d) => d.inFullBurst).reduce((s, d) => s + d.amount, 0);
      expect(fbDots(base.events), 'FB DoT ticks lose the sustainedDamagePct boost without S1b').toBeGreaterThan(
        fbDots(noS1b.events)
      );
    });

});

describe('V3 — S2 continuous self Hit Rate ▲21.96%', () => {
const applies = buffs(base.events).filter(
(b) => b.casterIdx === VIPER && b.stat === 'hitRatePct' && b.value === 21.96
);

    it('is 21.96%, self-scoped, with NO expiry (continuous)', () => {
      expect(applies.length).toBeGreaterThan(0);
      expect([...new Set(applies.map((b) => b.targetIdx))]).toEqual([VIPER]);
      expect([...new Set(applies.map((b) => b.expiresFrame))]).toEqual([null]);
    });

    it('DISCRIMINATING: removing the line deletes the 21.96 buff (distinct from the V1/V2 hit-rate grants)', () => {
      const gone = buffs(noS2a.events).filter((b) => b.casterIdx === VIPER && b.stat === 'hitRatePct' && b.value === 21.96);
      expect(gone).toEqual([]);
      // the other two hit-rate lines survive (this is a distinct line, not a shared block)
      expect(buffs(noS2a.events).some((b) => b.casterIdx === VIPER && b.stat === 'hitRatePct' && b.value === 11.13)).toBe(true);
    });

});

describe('V4 — S2 Re-enters Burst Stage 2 (meta-defining B2 re-entry)', () => {
// The chain-1 anatomy: the B2 casts that land before the first B3 (helm) opens Full Burst.
const chain1 = (overrides?: Record<string, any>) => {
const evs = run(overrides).events;
const viper1 = casts(evs).find((c) => c.slug === 'viper');
const crown1 = casts(evs).find((c) => c.slug === 'crown');
const helm1 = casts(evs).find((c) => c.slug === 'helm' && c.stage === 3);
const b2BeforeHelm = casts(evs)
.filter((c) => c.stage === 2 && helm1 && c.frame < helm1.frame)
.map((c) => c.slug);
return { viper1, crown1, helm1, b2BeforeHelm };
};

    it('viper casts Stage 2, then re-entry lets crown cast Stage 2 one stage-gap later, before the B3', () => {
      const { viper1, crown1, helm1, b2BeforeHelm } = chain1();
      expect(viper1!.stage).toBe(2);
      expect(crown1, 're-entry must let the partner B2 cast in chain 1').toBeDefined();
      expect(crown1!.stage).toBe(2);
      expect(helm1!.stage).toBe(3);
      expect(b2BeforeHelm, 'both B2s cast before the B3 only with re-entry').toEqual(['viper', 'crown']);
      expect(crown1!.frame - viper1!.frame, 'STAGE_CAST_GAP_FRAMES, no rng (unseeded)').toBe(30);
    });

    it('DISCRIMINATING: without re-entry only viper casts B2 in chain 1 (the stage advances after her)', () => {
      const { viper1, b2BeforeHelm } = chain1({ viper: viperNoReenter });
      expect(viper1).toBeDefined();
      expect(b2BeforeHelm, 'crown loses the B2 tie once re-entry is removed').toEqual(['viper']);
    });

});

describe('V5 — burst nuke: 1029.6% of final ATK (TREASURE), cast BEFORE Full Burst', () => {
it('fires once per burst cast at the TREASURE magnitude, in the burst bucket', () => {
const n = nukes(base.events);
expect(n.length).toBe(viperCasts(base.events).length);
expect(n.length).toBeGreaterThan(0);
expect([...new Set(n.map((d) => d.atkPct))]).toEqual([1029.6]);
expect([...new Set(n.map((d) => d.bucket))]).toEqual(['burst']);
});

    it('never takes the +50% Full Burst major (the B2 cast lands before FB opens)', () => {
      expect(nukes(base.events).filter((d) => d.fbMajorApplied).map((d) => d.frame)).toEqual([]);
    });

    it('DISCRIMINATING: the untreasured datamine-table value (462.85) is a different, wrong model', () => {
      expect([...new Set(nukes(baseNuke.events).map((d) => d.atkPct))]).toEqual([462.85]);
      expect([...new Set(nukes(base.events).map((d) => d.atkPct))]).not.toEqual([462.85]);
    });

});

describe('V6 — burst sustained damage: 105.3% of final ATK every 1 sec for 10 sec (stage target)', () => {
it('is a 10-tick DoT per cast (for casts whose full 10s window fits the fight)', () => {
const measurable = viperCasts(base.events).filter((c) => c.frame + 10 * FPS <= FIGHT_FRAMES);
expect(measurable.length, 'no burst has a full 10s window inside the fight').toBeGreaterThan(0);
for (const c of measurable) {
const ticks = dotTicks(base.events).filter((d) => d.frame > c.frame && d.frame <= c.frame + 10 * FPS);
expect(ticks.length, `burst at f${c.frame} produced ${ticks.length} ticks, expected 10`).toBe(10);
}
});

    it('DISCRIMINATING: removing the DoT deletes the 105.3 ticks', () => {
      expect(dotTicks(noDot.events)).toEqual([]);
      expect(dotTicks(base.events).length).toBeGreaterThan(0);
    });

});

describe('V7 — burst DEF ▼19.83% is INERT (not a damageTakenPct vuln) and recorded verbatim', () => {
const ov: any = loadOverride('viper');

    it('is NOT modeled as a damageTakenPct block (the nearest-wrong over-credit)', () => {
      const all = [...ov.skill1, ...ov.skill2, ...ov.burst];
      const taken = all.flatMap((b: any) => b.effects).filter((e: any) => e.stat === 'damageTakenPct');
      expect(taken, 'DEF▼ must not become a team damage-taken vuln').toEqual([]);
    });

    it('sits VERBATIM in unmodeled.burst (no silent drop)', () => {
      expect(ov.unmodeled.burst.some((s: string) => s.includes('DEF ▼ 19.83% for 10 sec'))).toBe(true);
    });

    it('DISCRIMINATING: a damageTakenPct model would change team totals; the inert model does not', () => {
      // sanity: the shipped fight carries no enemy damage-taken debuff event at all
      const bossVuln = buffs(base.events).filter((b) => b.targetIdx === null && b.stat === 'damageTakenPct');
      expect(bossVuln).toEqual([]);
    });

});

describe('V8 — S2 Vamp/Invulnerable is DEFENSIVE and recorded verbatim (only its offensive gate is modeled)', () => {
const ov: any = loadOverride('viper');

    it('is NOT modeled as a shield/invulnerable block', () => {
      const all = [...ov.skill1, ...ov.skill2, ...ov.burst];
      const defensive = all.flatMap((b: any) => b.effects).filter((e: any) => e.kind === 'shield');
      expect(defensive, 'no HP pool / targeting model in v1 — Vamp/invulnerable moves nothing').toEqual([]);
    });

    it('sits VERBATIM in unmodeled.skill2 (no silent drop)', () => {
      expect(ov.unmodeled.skill2.some((s: string) => s.includes('Vamp') && s.includes('Invulnerable for 1 sec'))).toBe(true);
    });

});
});

==========================================================================================

## PART 7b — DRIVER IMPLEMENTATION: src/skills/overrides/viper.json

==========================================================================================

{
"note": "TREASURE (favorite-item) KIT — modeled from the blablalink treasure prose in data/characters.json (characters.viper.skills), the authoritative SSOT (DECISIONS 2026-07-17 roster-wide treasure ruling). Viper (Treasure): SG / Attacker / Water / Burst II, cd 20s, ammo 9, reloadFrames 122, hitsPerShot 10 pellets, normalMult 220.4, coreMult 200. Her identity is the Burst-II RE-ENTRY: she casts at Stage 2 and re-enters Stage 2 so a SECOND B2 also casts in the same chain (the Tia/Anis:Star reenterStage mechanic), which is what lets her fire her burst every rotation alongside another B2. SKILL1 (Snake Sense): (S1a) 'Activates when the stage target appears → all allies: ATK ▲25.98% / Hit Rate ▲11.13% for 10 sec' = a battle-start team buff, modeled passive → allies atkPct 25.98 + hitRatePct 11.13, durationSec 10 (the stage target = the boss, present from t=0; the passive applies at setup and lapses at 10s, never refreshing — a once-at-start window). (S1b) 'Only activates when attacking in Vamp status → self: Sustained Damage ▲4.4% / Hit Rate ▲1.84%, stacks ×10, 10 sec' = shotFired → self sustainedDamagePct 4.4 + hitRatePct 1.84, maxStacks 10, durationSec 10, fbGate:'inFb'. Vamp is the Full-Burst status (granted by S2b on FB entry); the sim has no separate Vamp entity, so the offensive GATE ('attacking in Vamp status') is modeled as the Full-Burst window (fbGate:'inFb') — each shot during FB accrues a stack, ramping 1→10 over the opening FB shots (probe: first stack f367, max f806). sustainedDamagePct feeds her sustained-flavored burst DoT (sim.ts:1688 opts.sustained); hitRatePct is the live core-hit lift (sim.ts hrCoreMult, LIVE by default). See ⚑1 for the Vamp-permanence nuance (the load-bearing sustained-DoT coupling is fully captured; the between-FB hit-rate refresh is a conservative under-credit). SKILL2 (Snake Scale): (S2a) 'self: Hit Rate ▲21.96% continuously' = passive → self hitRatePct 21.96 (no expiry). (S2b) 'entering Full Burst → self: Vamp (prevents being targeted by single-target attacks, removed on a direct hit) + Invulnerable 1 sec' = DEFENSIVE, UNMODELED verbatim — v1 has no HP pool, no targeting model and no boss damage, so prevents-targeting/invulnerable move nothing; only its OFFENSIVE consequence (the Vamp status that gates S1b) is modeled, via the FB window. (S2c) 'using Burst Skill → all allies: Re-enters Burst Stage 2' = burstCast → allies reenterStage stage 2 — the meta-defining line. The engine holds the stage at 2 after her cast so a second eligible B2 casts in the same chain (sim.ts reenterStage detection requires trigger burstCast + reenterStage stage === castStage; probe: viper B2 f251 → crown B2 f281, exactly STAGE_CAST_GAP 30f, → helm B3 f311). BURST (Snake Bite, burstCast = her casts; B2 so the cast lands BEFORE Full Burst opens and takes NO +50% FB major, verified fbMajorApplied=false): (B1) '1 designated enemy: 1029.6% of final ATK as damage' = burstCast → enemy flatDamage 1029.6 (burst bucket, PLAIN flavor — NOT sustained, so the S1b sustainedDamagePct stacks do NOT double-dip into it). VALUE PROVENANCE: 1029.6 is the TREASURE prose (authoritative); the datamine ulti_skill_detail description_value_02 carries the UNTREASURED base 462.85% (L10) / skill_value_data 23142 = 231.42% (L1) — the same prose-vs-base-table split as helm (prose 8236.8 vs base 1237.5) and phantom; the favorite-item prose is the SSOT (DECISIONS 2026-07-17). (B2) 'if the enemy is the stage target: 105.3% of final ATK as sustained damage every 1 sec for 10 sec' = burstCast → enemy dot atkPct 105.3, durationSec 10, intervalSec 1, flavor 'sustained' (10 ticks; sustained-flavored so it is the SOLE consumer of her S1b sustainedDamagePct stacks; early ticks land pre-FB, later ticks inside FB). The stage-target condition collapses to always-true in the single-boss sim (the boss IS the stage target). UNMODELED (2 lines, verbatim): (i) the burst's 'DEF ▼ 19.83% for 10 sec' magnitude — INERT and UNENACTABLE: boss DEF enters the formula only as the FIXED config constant cfg.bossDef subtracted at sim.ts:1719 (baseAtk = max(0, effectiveAtk − cfg.bossDef)); NO buff/debuff channel feeds it, so the engine cannot apply an enemy DEF reduction at all, and the magnitude is negligible regardless (measured boss DEF ≈140 → 19.83% of 140 ≈ 28 ATK against scope-lock ATK in the hundreds of thousands ≈ 0.01% damage, docs/data/damage-calculation.md §enemy-DEF). Modeling it as damageTakenPct would over-credit a ~19.83% team vuln the kit does NOT deliver (a different bucket/math) — phantom/guilty/marciana precedent. (ii) the S2b Vamp/invulnerable defensive line (above). NO `ignored` blocks. ⚑1 (Vamp permanence, low): the kit's Vamp is granted on FB entry and 'removed upon taking a direct hit'; v1 has no boss damage, so once granted it is PERMANENT for the rest of the fight — strictly, S1b stacks should accrue on every shot after the first FB, not only inside FB windows. The engine has no 'permanent-after-first-FB' block gate (fbGate is inFb/outFb only; S4 forbids an engine change here), so fbGate:'inFb' is the closest available primitive. It is faithful where it matters: the LOAD-BEARING coupling — sustainedDamagePct boosting the sustained burst DoT — is fully captured, because the DoT's 10s post-cast window lies inside FB + the stacks' own 10s durationSec persistence (probe: FB DoT tick damage drops when S1b is removed). What it conservatively UNDER-credits is the 1.84%×10 hit-rate stack refresh on NORMAL attacks during the ~10s between-FB gap after the buff persistence lapses — a second-order effect that itself routes through the derived hrCoreMult (⚑2). The ungated alternative (stacks from t=0) was rejected: it over-credits the pre-first-FB opening (no Vamp yet) and is the opposite error. Estimate: <~1% of total (between-FB hit-rate-stack core lift on normals only; the sustained DoT — the primary consumer — is unaffected). Recipe: a focus video reading Vamp-icon uptime (expected ~100% after first FB) and the between-FB SG core-hit fraction; a 'permanent-after-first-FB' block gate would enact it exactly. Tier 2. ⚑2 (Hit Rate core yield, derived): the three hitRate lines (11.13 team / 21.96 self / 1.84×10 self) are kit-stated magnitudes but their damage YIELD flows through sim.ts hrCoreMult — a DERIVED reticle-shrink → core-fraction estimate (LIVE by default, HRCORE=0 disables), not a measured per-unit number (phantom ⚑4 class). Recipe: a viper focus video reading the in-window SG core-hit fraction. ⚑3 (SG cadence tuple, standard): ammo 9 / reloadFrames 122 / hitsPerShot 10 / RoF 90 are the datamine (unverified for this unit); the S1b stack ramp/hold derives from this cadence. Recipe: read fire cadence + the reload gap from any focus video. TIER 2: reenterStage (meta-defining B2 re-entry), FB-gated scoped stacks (fbGate + maxStacks), the treasure-prose value resolution, and the Vamp-status gate. Kit-autonomy gauntlet 2026-08-01: cross-family S2b (claude-fable-5) independently re-derived the same 9-line load-bearing set + the nearest-wrong traps (sustained-flavor coupling, reentry invisible in single-B2 comps, nuke-not-sustained, Vamp gating, DEF▼-as-damageTakenPct), leakDetected null; converged FAITHFUL. Two reconciliations: DEF▼ held INERT/unmodeled (reviewer's 'load-bearing boss debuff' framing overridden — cfg.bossDef is a fixed config constant with no debuff channel, sim.ts:1719, and the magnitude is negligible; reviewer agreed damageTakenPct is wrong); Vamp gate held fbGate:'inFb' with ⚑1 refined to the reviewer's 'permanent-after-first-FB' point (load-bearing sustained-DoT coupling fully captured; between-FB hit-rate refresh a conservative under-credit).",
"unmodeled": {
"skill1": [],
"skill2": [
"Activates when entering Full Burst. Affects self. Vamp: Prevents being targeted by single-target attacks continuously. This effect is removed upon taking a direct hit. Invulnerable for 1 sec. — DEFENSIVE: no HP pool / targeting model / boss damage in v1, so prevents-targeting + invulnerable move nothing; only the offensive Vamp GATE for skill1's stacks is modeled (via the Full-Burst window, fbGate:'inFb')."
],
"burst": [
"Affects the enemy if the enemy is the stage target. DEF ▼ 19.83% for 10 sec. — INERT and UNENACTABLE: boss DEF enters the formula only as the fixed config constant cfg.bossDef (sim.ts:1719 baseAtk = max(0, effectiveAtk − cfg.bossDef)); no buff/debuff channel feeds it, so the engine cannot apply an enemy DEF reduction at all, and the magnitude is negligible regardless (measured boss DEF ≈140 → ~0.01% damage at scope-lock ATK, docs/data/damage-calculation.md). NOT modeled as damageTakenPct (a different bucket/math that would over-credit a ~19.83% team vuln the kit does not deliver) — phantom/guilty/marciana precedent. The stage-target sustained-damage line that shares this header IS modeled (the dot block)."
]
},
"skill1": [
{
"slot": "skill1",
"trigger": { "kind": "passive" },
"target": { "kind": "allies" },
"effects": [
{ "kind": "buff", "stat": "atkPct", "value": 25.98, "durationSec": 10 },
{ "kind": "buff", "stat": "hitRatePct", "value": 11.13, "durationSec": 10 }
]
},
{
"slot": "skill1",
"trigger": { "kind": "shotFired" },
"target": { "kind": "self" },
"fbGate": "inFb",
"effects": [
{ "kind": "buff", "stat": "sustainedDamagePct", "value": 4.4, "maxStacks": 10, "durationSec": 10 },
{ "kind": "buff", "stat": "hitRatePct", "value": 1.84, "maxStacks": 10, "durationSec": 10 }
]
}
],
"skill2": [
{
"slot": "skill2",
"trigger": { "kind": "passive" },
"target": { "kind": "self" },
"effects": [
{ "kind": "buff", "stat": "hitRatePct", "value": 21.96 }
]
},
{
"slot": "skill2",
"trigger": { "kind": "burstCast" },
"target": { "kind": "allies" },
"effects": [
{ "kind": "reenterStage", "stage": 2 }
]
}
],
"burst": [
{
"slot": "burst",
"trigger": { "kind": "burstCast" },
"target": { "kind": "enemy" },
"effects": [
{ "kind": "flatDamage", "atkPct": 1029.6 }
]
},
{
"slot": "burst",
"trigger": { "kind": "burstCast" },
"target": { "kind": "enemy" },
"effects": [
{ "kind": "dot", "atkPct": 105.3, "durationSec": 10, "intervalSec": 1, "flavor": "sustained" }
]
}
],
"caveats": [
"skill1: the S1b 'in Vamp status' gate is modeled as the Full-Burst window (fbGate:'inFb'), the closest available primitive — Vamp is technically permanent after the first FB in v1 (no direct hits), so the between-FB hit-rate-stack refresh is conservatively under-credited; the load-bearing sustained-DoT coupling is fully captured (⚑1).",
"burst: the 1029.6% nuke is the TREASURE prose value (authoritative SSOT); the datamine ulti table carries the untreasured base 462.85%.",
"burst: the DEF ▼ 19.83% line is inert (enemy DEF negligible at scope-lock; engine drops enemy DEF debuffs) and is NOT modeled — see unmodeled.burst."
]
}
