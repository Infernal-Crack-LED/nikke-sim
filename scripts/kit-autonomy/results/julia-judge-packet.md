# S7 RECONCILING-JUDGE PACKET — `julia` (Julia (Treasure), AR/Attacker/Iron/Burst III)

Assembled 2026-07-31 by the gauntlet driver. Sections in contract order.

---

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

---

## SECTION 2 — MECHANICS SSOT

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

---

## SECTION 3 — GROUND TRUTH: julia kit prose + base stats (data/characters.json → characters.julia)

```json
{
  "slug": "julia",
  "name": "Julia (Treasure)",
  "weapon": "AR",
  "burst": "III",
  "burstCooldownSec": 40,
  "class": "Attacker",
  "element": "Iron",
  "normalAttackMultiplier": 14.07,
  "coreAttackMultiplier": 200,
  "ammo": 60,
  "reloadFrames": 93,
  "hitsPerShot": 1,
  "burstGaugePerShot": 0.2,
  "treasure": true,
  "skills": {
    "skill1": "\u25a0 Affects self.\nCritical Rate \u25b2 26.04% for 10 sec.\nATK \u25b2 20% for 10 sec.\nNormal Attack Critical Rate \u25b2 36.16% for 10 sec.",
    "skill2": "\u25a0 Activates after landing 6 critical hit(s) with normal attacks. Affects self.\nCrescendo: Critical Damage \u25b2 24.79%, stacks up to 5 time(s) and lasts for 15 sec.\n\u25a0 Activates after landing 8 critical hit(s) with normal attacks. Affects the target(s).\nMarcato: Deals 88% of final ATK as additional damage.\n\u25a0 Activates if Marcato lands as a crit attack. Affects the same target.\nDeals 100% of final ATK as additional damage.\n\u25a0 Activates at the start of battle. Affects self.\nForcefully uses Skill 1.",
    "burst": "\u25a0 Affects random enemies.\nDeals 544.5% of final ATK as damage. Attacks sequentially 5 times.\n\u25a0 Activates when Crescendo is at max stacks. Affects the same target.\nDeals 544.5% of final ATK as additional damage."
  },
  "skillCooldownsSec": {
    "skill1": 40,
    "skill2": null,
    "burst": 40
  },
  "baseStats": {
    "hp": 13500,
    "atk": 600,
    "def": 90,
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
    "resourceId": 150
  }
}
```

NOTE: the ulti_skill_detail datamined table text says '5 enemies with the highest final DEF'; the Treasure PROSE above ('Affects random enemies … Attacks sequentially 5 times') is the displayed kit and is authoritative. Both collapse to the single immortal sim boss.

---

## SECTION 4 — S2b CROSS-FAMILY TEST REVIEW (claude-fable-5, leakDetected null)

File: scripts/kit-autonomy/reviews/julia.test-review.json

```json
{
  "slug": "julia",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "Critical Rate ▲ 26.04% for 10 sec",
      "disposition": "FAITHFUL",
      "scope": "Generic crit rate (unscoped) — applies to normal attacks, skill procs (Marcato), and burst hits alike.",
      "durationSemantics": "Wall-clock 10 sec (durationSec: 10). Not rounds, not permanent — skill1 has no 'Activates when' clause, so it is an interval-CD active whose buffs have <100% uptime unless CD ≤ 10s.",
      "triggerIdentity": "interval (no activation clause = internal skill CD, ⚑ cadence from datamined skillCooldownsSec); first fire forced to t=0 by skill2's 'Forcefully uses Skill 1' start-of-battle block.",
      "targetSet": "self",
      "nearestWrongModel": "Passive/permanent always-on buff (trigger kind 'passive', no durationSec) — over-credits every second the real 10s window is down; or first fire at t=CD, losing the forced opening window.",
      "distinguishingAssertion": "buffApply {stat:'critRatePct', value:26.04, casterIdx===targetIdx===julia} present at frame 0 (forced cast) with expiresFrame ≈ +600 frames; a second buffApply appears at the next CD tick, NOT continuously. Red under passive (single apply, no expiry) and red under first-fire-at-CD (no frame-0 apply).",
      "inertness": "No buffApply of this stat on any non-julia targetIdx; teammates' crit-sourced damage unchanged when julia's override is stubbed out.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "ATK ▲ 20% for 10 sec",
      "disposition": "FAITHFUL",
      "scope": "Generic ATK, self.",
      "durationSemantics": "durationSec: 10, same windowed uptime as the crit line — never permanent.",
      "triggerIdentity": "Same interval block as line 1 (one block, three buff effects), forced t=0 first fire.",
      "targetSet": "self",
      "nearestWrongModel": "casterAtkPct is degenerate-equal on self, so the plausible misreads are (a) permanent passive, (b) missing the forced t=0 cast so the opening burst-gauge ramp and first Marcatos run unbuffed.",
      "distinguishingAssertion": "buffApply {stat:'atkPct', value:20, self} at frame 0 with expiresFrame ≈ +600. Damage events in a window at t≈12s (if CD>10s+2s) show mult path WITHOUT the 20% — red under permanent encoding.",
      "inertness": "No ally receives the ATK buff (targetIdx===casterIdx on every apply).",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Normal Attack Critical Rate ▲ 36.16%",
      "disposition": "FAITHFUL",
      "scope": "SCOPED — crit rate for NORMAL-ATTACK hits only (taxonomy trap #1). Must be critRateNormalPct, never generic critRatePct. Critically: this scoped crit feeds skill2's 'critical hits with normal attacks' counters, but must NOT raise Marcato's own crit chance (Marcato is skill damage, not a normal attack) and must NOT raise burst-hit crit.",
      "durationSemantics": "durationSec: 10, same window as the other two skill1 lines.",
      "triggerIdentity": "Same interval block, forced t=0 first fire.",
      "targetSet": "self",
      "nearestWrongModel": "Generic critRatePct 36.16 — over-credits Marcato's crit-rider proc probability and burst crit; combined with line 1 that misread puts julia's skill/burst crit at 15+26.04+36.16 ≈ 77% instead of ≈ 41%.",
      "distinguishingAssertion": "buffApply {stat:'critRateNormalPct', value:36.16} exists AND no buffApply {stat:'critRatePct', value:36.16} exists. Stronger: damage events with bucket/category 'normal' inside the window carry crit rate ≈ 0.15+0.2604+0.3616 while burst damage events in the same window carry crit ≈ 0.15+0.2604 only.",
      "inertness": "Skill (Marcato/rider) and burst damage-event crit rates must NOT move when only this line's value is zeroed via withPatchedOverride.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "After landing 6 critical hit(s), normal",
      "disposition": "GAP",
      "scope": "Counter counts CRITICAL normal-attack hits only — not all rounds. The engine's hitCount trigger counts ROUNDS unconditionally; there is no crit-conditioned counter primitive, so the faithful encoding is an effective threshold ⚑ ≈ 6 / (julia's time-averaged normal-attack crit rate), which is itself dynamic (much higher inside skill1's 10s windows).",
      "durationSemantics": "Crescendo buff: durationSec 15, maxStacks 5, refresh-on-reapply. NOT rounds, NOT permanent.",
      "triggerIdentity": "hitCount-style with a crit gate the schema lacks. Faithful test pins the RATE: stack accrual per unit time ≈ fireRate × critRate / 6, not fireRate / 6.",
      "targetSet": "self",
      "nearestWrongModel": "hitCount: {count: 6} counting every normal round — over-fast stacking by 1/critRate (≈2.5× too fast at ~41% crit), reaching 5 stacks and the burst rider gate far too early.",
      "distinguishingAssertion": "Frame of the FIRST Crescendo buffApply {stat:'critDamagePct', value:24.79} is strictly LATER than the frame of julia's 6th shot event (red under raw count:6), and consistent with ≈6/critRate rounds; buffApply carries maxStacks:5 and stacks ramps 1→5 across subsequent applies.",
      "inertness": "Crescendo applies to self only; zero buffApply of critDamagePct on teammates.",
      "evidenceTier": "CALIBRATED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "After 8 crit hits: Marcato 88% add'l dmg",
      "disposition": "GAP",
      "scope": "Same crit-counted trigger family (threshold 8). Marcato is a flatDamage hit at 88% of final ATK on the target; no core (text never says 'core strike'), crit-eligible (the next kit line requires Marcato to be able to crit → crit: true), FB bonus by landing timing (rider default ON), noRange forced by engine on riders.",
      "durationSemantics": "Instant hit, no duration.",
      "triggerIdentity": "Crit-gated hit counter, threshold 8 — same missing primitive, effective ⚑ count ≈ 8/critRate rounds.",
      "targetSet": "enemy (the target)",
      "nearestWrongModel": "hitCount: {count: 8} counting ALL normal rounds — Marcato fires ≈1/critRate× too often (≈2.4× at ~41% crit), a direct damage over-credit on julia's largest skill channel.",
      "distinguishingAssertion": "Count of flatDamage events with mult 88 over 180s ≈ (total julia normal rounds × critRate)/8, and strictly < (total rounds)/8. Also each such event has core rate 0 and crit-eligibility on (crit field observable via event crit rate > 0).",
      "inertness": "Marcato events must NOT carry core bucket damage; count must not scale with teammates' hits (counter is julia-only).",
      "evidenceTier": "CALIBRATED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "If Marcato lands as crit: +100% dmg",
      "disposition": "GAP",
      "scope": "Conditional follow-up: fires only when the Marcato HIT ITSELF crits. Probability = julia's GENERIC crit rate (base 15% + 26.04% when skill1 is up) — the normal-scoped 36.16% must NOT enter, because Marcato is not a normal attack.",
      "durationSemantics": "Instant hit, no duration.",
      "triggerIdentity": "No 'previous-hit-crit' trigger exists in the schema → expected-value encoding ⚑: a companion flatDamage of 100% × P(crit) per Marcato, or an explicit crit-branch if the engine gained one. Same target as Marcato.",
      "targetSet": "enemy (the same target)",
      "nearestWrongModel": "Unconditional 100% rider on every Marcato (over-credits by 1/critRate ≈ 2.4×); second-nearest: using the normal-scoped crit (15+26.04+36.16) as the proc probability instead of generic (15+26.04); third: dropping it entirely (MISSING).",
      "distinguishingAssertion": "Total 100%-mult rider damage ≈ marcatoCount × genericCritRate × 1.00 × finalATK (window-weighted for skill1 uptime). Red under always-fire (rider events == marcato events at full value) and red if the implied probability includes the 36.16 normal-scoped term.",
      "inertness": "Rider total must not move when critRateNormalPct alone is patched to 0 (only the counter cadence may shift, isolate via fixed-crit patching).",
      "evidenceTier": "CALIBRATED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Start of battle: Forcefully uses Skill 1",
      "disposition": "FAITHFUL",
      "scope": "Meta-trigger: skill1's three self-buffs apply at t=0 instead of first firing at t=CD.",
      "durationSemantics": "One-shot at battle start; skill1's own 10s durations then run normally, subsequent casts on skill1's interval CD.",
      "triggerIdentity": "Start-of-battle force-cast — per the interval convention, encoded as skill1's interval trigger first-firing at t=0 (not t=CD).",
      "targetSet": "self",
      "nearestWrongModel": "Dropping this line so skill1 first fires at t=CD — the opening magazine (60 rounds, first Crescendo/Marcato ramp) runs at base 15% crit instead of ≈77% normal-crit, slowing every skill2 counter and starving the first burst's max-stack gate.",
      "distinguishingAssertion": "All three skill1 buffApply events (26.04 / 20 / 36.16) present at frame 0. Red if the earliest apply is at t=CD.",
      "inertness": "Must not re-fire mid-battle (exactly the interval cadence after t=0, no extra t=0-style resets).",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "544.5% dmg, attacks sequentially 5 times",
      "disposition": "FAITHFUL",
      "scope": "Burst damage: FIVE sequential hits of 544.5% each (the standard 'Deals X%. Attacks sequentially N times' reading = X per hit), sequential FLAVOR (feeds sequentialDamagePct/sequentialMultPct consumers). Single partless boss → 'random enemies' collapses to the boss for all 5 hits. Burst-cast damage lands PRE-Full-Burst (verified: no +50%, no entry auras); crits at generic rate; no core.",
      "durationSemantics": "Instant multi-hit at burst cast, 40s CD rotation.",
      "triggerIdentity": "burstCast (julia's OWN burst) — never fullBurstEnter.",
      "targetSet": "enemy",
      "nearestWrongModel": "544.5% TOTAL split across 5 hits (5× under-credit); second-nearest: one 544.5% hit (also under-credit, and breaks the sequential-hit count any flavor consumer sees); third: keying to fullBurstEnter with fbMajorApplied (over-credits +50% and fires on rotations julia doesn't burst).",
      "distinguishingAssertion": "Per julia burstCast event, exactly 5 damage events with mult 544.5, each with inFullBurst===false / fbMajorApplied===false, flavor sequential. Red under split-total (mult 108.9) and under single-hit (count 1).",
      "inertness": "Zero burst damage in a comp where julia cannot chain (controlComp provides B1+B2 — a lone B3 makes ZERO full bursts; assert the fixture dependency, and that no burst events fire on rotations another B3 takes).",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "When Crescendo at max stacks: +544.5%",
      "disposition": "GAP",
      "scope": "Conditional ONE additional 544.5% hit (the line states it once — NOT ×5), same target, gated on the Crescendo buff sitting at 5 stacks at burst-cast time. No buff-stack gate primitive exists in the schema (resourceGate reads resource pools, not buff stacks) → either a resource-mirrored Crescendo counter with resourceGate {min:5}, or a ⚑ probability/uptime encoding.",
      "durationSemantics": "Instant hit at cast; the GATE is evaluated at cast time against live stacks (15s Crescendo duration means stacks can lapse during reload/downtime right before a cast).",
      "triggerIdentity": "burstCast + max-stack gate. Pre-FB by timing like the main burst hits.",
      "targetSet": "enemy (the same target)",
      "nearestWrongModel": "Ungated — the extra 544.5% fires on every burst cast (over-credits early casts before 5 stacks accrue, especially the FIRST burst at ~t≤5s when ≈30 crit-normals cannot have landed); second-nearest: applying it 5× ('sequentially' bleeding over from the previous line).",
      "distinguishingAssertion": "On julia's FIRST burst cast (before 5 Crescendo stacks are reachable given 6-crit-per-stack accrual), the count of 544.5-mult events is exactly 5; on a later cast verifiably preceded by a buffApply {stat:'critDamagePct', stacks:5}, exactly 6. Red under ungated (first cast shows 6) and under ×5 (later casts show 10).",
      "inertness": "Never more than ONE gated extra hit per cast; gate must read julia's OWN Crescendo (name-keyed), never a teammate's critDamagePct buff.",
      "evidenceTier": "CALIBRATED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:critRate-26.04-10s",
    "skill1:atk-20-10s",
    "skill1:normalAttackCritRate-36.16-10s",
    "skill2:crescendo-6crit-critDmg-24.79-x5-15s",
    "skill2:marcato-8crit-88pct",
    "skill2:marcato-crit-rider-100pct",
    "skill2:forced-skill1-t0",
    "burst:544.5-x5-sequential",
    "burst:maxstack-extra-544.5"
  ],
  "unmodeledVerbatim": {
    "skill1": [],
    "skill2": [],
    "burst": []
  },
  "notes": "Expected shared-prior misreads, in descending likelihood: (1) skill2's 6/8 thresholds counted as ALL normal rounds instead of CRITICAL normal hits — the engine hitCount primitive counts rounds unconditionally, so a driver who wires hitCount:{count:6}/{count:8} verbatim over-fires every skill2 channel by ~1/critRate (≈2.4×); the faithful encoding needs a ⚑ crit-rate-scaled effective count, and the tests must pin proc RATE, not just proc existence. (2) The 36.16% line encoded as generic critRatePct — this both over-credits burst/Marcato crit AND corrupts the crit-rider probability; assert stat identity critRateNormalPct explicitly. (3) The burst max-stack rider left ungated or fired ×5 — the first-burst-cast event count (exactly 5, never 6) is the cheapest discriminator because 5 stacks × 6 crits = ≥30 crit normals cannot precede a t≈5s opening burst. (4) Skill1 modeled passive/permanent — it is an interval-CD active with 10s windows; the force-cast only moves first fire to t=0, it does not make the buffs permanent; skill1 CD is not in the kit text and is an ALWAYS-⚑ cadence input (datamined skillCooldownsSec), so uptime fraction is the load-bearing derived quantity. (5) Marcato's crit-rider probability must use GENERIC crit (15+26.04 when skill1 is up), excluding the normal-scoped 36.16 — a subtle scope bleed a reasonable model makes. Interaction to reconcile: skill1 uptime gates skill2's crit-counters, which gate the burst rider — a single scope/duration error propagates through all three slots, so at least one test should assert the coupled chain (e.g. Crescendo stack timeline consistent with windowed crit rate, not flat). Also assert the burst fixture uses controlComp (B1+B2 present) — a lone-B3 julia comp makes zero full bursts and vacuously greens every burst assertion.",
  "model": "claude-fable-5"
}
```

---

## SECTION 5 — S5 BLIND TEST (claude-opus-5, leakDetected null) + RESULT vs DRIVER OVERRIDE

Run: `npx vitest run --config .vitest.blind-julia.config.mts` (blind/julia.test.ts vs the driver's shipped override).
Result: **17 passed / 4 failed / 4 skipped** (25 total).

The 4 SKIPS are the blind author's OWN documented primitive-gap skips: (a) the 6-crit and 8-crit
trigger identities (no crit-hit counter — hitCount counts rounds); (b) the Marcato-crit 100% rider
(no previous-hit-crit conditional); (c) the max-stacks burst gate (no buff-stack gate). The driver
override resolves (b) as a calibrated EV companion rider (takina uptime-average precedent) and (c)
via a shadow `crescendo` resource + resourceGate (soda-twinkling-bunny precedent) — empirically,
the driver's gate withholds the bonus from julia's t=5.4s opening cast (stacks max at t=9.1s),
exactly the case an unconditional encoding over-credits.

The 4 FAILURES, triaged (driver asserts none is a REAL-GOTCHA against the driver override):
F1 'S1b … not casterAtkPct' — BLIND-TEST ATTRIBUTION BUG: their selfBuffs filter is
targetSlug==='julia' && casterIdx!==null, which catches CROWN's casterAtkPct team grant
(6 applies). The driver override contains NO casterAtkPct; the driver's J1 pins atkPct 20
with casterIdx===targetIdx===julia.
F2 'Marcato … teammates unmoved' — BLIND-TEST TOLERANCE BUG: toBeCloseTo(base, 6) = ±5e-7
ABSOLUTE on ~129M totals. The observed 66,579 delta (0.05%) is emergent rotation feedback:
flatDamage calls skillGauge (skill hits generate weapon-base gauge), so removing Marcato
shifts julia's cast timing → the shared rotation → teammate windows. No teammate-targeted
effect exists in the driver override.
F3 'exactly 5 sequential 544.5% hits per cast' — D2 DIVERGENCE + slug-filter bug: their
burstCasts filter has NO slug field, so it counts all 4 units' casts (expected 165 = 33
team casts × 5). The driver consolidates the 5 sequential hits into ONE 2722.5% instance
(eve's 457.14×6→2742.84 and 2b's 2439.36 are the same consolidation for the same
'sequentially N times' wording; damage-identical in the deterministic expected-value pass).
F4 '5-hit count is load-bearing' — D2 consequence: their counterfactual patches a 5×544.5
structure the driver override does not have (no-op patch → totals equal). The driver's OWN
J4 counterfactual (2722.5 → 544.5) proves the magnitude load-bearing (strict total drop).

DRIVER ADAPTATION applied to the blind test (documented inline): (1) import path depth
(../lib/harness.js → ../../tests/lib/harness.js); (2) onEvent moved into cfg (the harness
threads it through CompOptions.cfg; at the top level the event log is empty and every event-log
assertion fails vacuously — pre-adaptation run was 7/25). Assertion logic untouched.

### Blind test source (adapted)

```typescript
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
 * julia — Julia (AR / Iron / Attacker / Burst III), cd 40s, ammo 60, reload 93f,
 * hitsPerShot 1, normal mult 14.07, core mult 200.
 *
 * KIT (read literally, line by line):
 *
 * skill1 — "Affects self."
 *   S1a  Critical Rate ▲ 26.04% for 10 sec               → generic critRatePct, self, 10s
 *   S1b  ATK ▲ 20% for 10 sec                            → atkPct, self, 10s
 *   S1c  Normal Attack Critical Rate ▲ 36.16% for 10 sec → critRateNormalPct (SCOPED — normal
 *        attacks only). The nearest-wrong model is encoding this as a second generic critRatePct,
 *        which would over-credit burst/rider crit.
 *   S1 has NO activation clause of its own; it is fired by the skill2 "Forcefully uses Skill 1"
 *   line at battle start, and thereafter on its datamined skill cooldown (interval).
 *
 * skill2 —
 *   S2a  "Activates after landing 6 critical hit(s) with normal attacks. Affects self."
 *        Crescendo: Critical Damage ▲ 24.79%, stacks up to 5, lasts 15 sec
 *        → hitCount-flavored trigger on CRIT normal hits; critDamagePct, maxStacks 5, 15s.
 *        The engine has no crit-hit-only counter primitive (hitCount counts ROUNDS, not crits),
 *        so the trigger threshold is a ⚑ derived count (6 crits ÷ effective normal crit rate).
 *   S2b  "Activates after landing 8 critical hit(s) with normal attacks. Affects the target(s)."
 *        Marcato: 88% of final ATK as additional damage → flatDamage, crit-eligible, no core,
 *        noRange (rider), FB by timing.
 *   S2c  "Activates if Marcato lands as a crit attack. Affects the same target."
 *        100% of final ATK as additional damage → a CONDITIONAL rider on S2b's crit outcome.
 *        The engine has no "previous rider crit" conditional primitive → GAP (see it.skip).
 *   S2d  "Activates at the start of battle. Affects self. Forcefully uses Skill 1."
 *        → S1 first-fires at t=0 (the force-cast convention), not at t=CD.
 *
 * burst —
 *   B1   "Affects random enemies. Deals 544.5% of final ATK as damage. Attacks sequentially 5
 *        times." → 5 × flatDamage 544.5% on burstCast. Burst-cast damage lands BEFORE Full Burst
 *        opens (verified fact) → FB-exempt.
 *   B2   "Activates when Crescendo is at max stacks. Affects the same target. Deals 544.5% of
 *        final ATK as additional damage." → a 6th 544.5% hit, GATED on Crescendo == 5 stacks.
 *        The engine has no "buff at max stacks" block gate → GAP (see it.skip).
 *
 * FIXTURE: controlComp('julia', true) — julia is Burst III, so the fixture MUST supply B1+B2
 * (a lone B3 makes ZERO Full Bursts). Deterministic, no seed. Every assertion below is either
 * (a) a structural event-log claim, or (b) a totals delta against a nearest-wrong counterfactual
 * built with withPatchedOverride, so a GREEN here is RED under the wrong model.
 *
 * RUN BUDGET: 1 control run + 6 counterfactual runs = 7 full 180s sims, all hoisted.
 */

const SLUG = 'julia';

function run(opts: ReturnType<typeof controlComp>) {
  const events: SimEvent[] = [];
  // DRIVER ADAPTATION (2026-07-31): the blind author placed `onEvent` at the CompOptions top
  // level; the harness threads it through `cfg` (scripts/tests/lib/harness.ts runComp). Without
  // this, the event log is empty and every event-log assertion fails vacuously. Assertion logic
  // untouched — only the event plumbing was corrected to the real harness API.
  const res = runComp({
    ...opts,
    cfg: { ...opts.cfg, onEvent: (ev: SimEvent) => events.push(ev) },
  });
  return { res, events };
}

// ---------------------------------------------------------------- control
const control = run(controlComp(SLUG, true));
const juliaEvents = control.events;
const juliaTotal = totals(control.res)[SLUG];

const juliaIdx = unitOf(control.res, SLUG).slotIndex ?? null;

const buffApplies = juliaEvents.filter(
  (e) => e.kind === 'buffApply'
) as Extract<SimEvent, { kind: 'buffApply' }>[];
const damages = juliaEvents.filter((e) => e.kind === 'damage') as Extract<
  SimEvent,
  { kind: 'damage' }
>[];
const burstCasts = juliaEvents.filter((e) => e.kind === 'burstCast');

// Buffs julia applied to HERSELF (all of skill1 + Crescendo are "Affects self").
const selfBuffs = buffApplies.filter(
  (e) => e.targetSlug === SLUG && e.casterIdx !== null
);

// ---------------------------------------------------- counterfactual runs
// Each patched override is the NEAREST-WRONG reading of one kit line.

// CF1 — S1c encoded as a second GENERIC critRatePct instead of the normal-scoped stat.
// Wrong model over-credits burst + rider crit; totals must differ.
const cfNormalCritGeneric = run(
  controlComp(SLUG, true) &&
    ({
      ...controlComp(SLUG, true),
      overrides: {
        [SLUG]: withPatchedOverride(SLUG, (ov) => {
          for (const b of ov.skill1 ?? []) {
            for (const e of b.effects) {
              if (e.kind === 'buff' && e.stat === 'critRateNormalPct') {
                (e as { stat: string }).stat = 'critRatePct';
              }
            }
          }
        }),
      },
    } as ReturnType<typeof controlComp>)
);

// CF2 — skill1 stripped entirely (no crit, no ATK). Proves skill1 is live and load-bearing,
// and is the non-vacuity anchor for the whole slot.
const cfNoSkill1 = run({
  ...controlComp(SLUG, true),
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      ov.skill1 = [];
    }),
  },
} as ReturnType<typeof controlComp>);

// CF3 — S1b ATK ▲20% dropped only. Isolates the ATK line from the crit lines.
const cfNoAtk = run({
  ...controlComp(SLUG, true),
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill1 ?? []) {
        b.effects = b.effects.filter(
          (e) => !(e.kind === 'buff' && e.stat === 'atkPct')
        );
      }
    }),
  },
} as ReturnType<typeof controlComp>);

// CF4 — Crescendo capped at 1 stack instead of 5. Proves the stack cap is actually reached
// and actually pays (a maxStacks that never accrues would make the line vacuous).
const cfCrescendo1Stack = run({
  ...controlComp(SLUG, true),
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill2 ?? []) {
        for (const e of b.effects) {
          if (e.kind === 'buff' && e.stat === 'critDamagePct') {
            (e as { maxStacks?: number }).maxStacks = 1;
          }
        }
      }
    }),
  },
} as ReturnType<typeof controlComp>);

// CF5 — Marcato (88%) removed. Isolates the skill2 rider from the burst.
const cfNoMarcato = run({
  ...controlComp(SLUG, true),
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill2 ?? []) {
        b.effects = b.effects.filter(
          (e) => !(e.kind === 'flatDamage' && Math.abs(e.atkPct - 88) < 0.01)
        );
      }
    }),
  },
} as ReturnType<typeof controlComp>);

// CF6 — burst reduced from 5 sequential hits to 1. Proves the "sequentially 5 times" count.
const cfBurstOneHit = run({
  ...controlComp(SLUG, true),
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.burst ?? []) {
        let seen = 0;
        b.effects = b.effects.filter((e) => {
          if (e.kind === 'flatDamage' && Math.abs(e.atkPct - 544.5) < 0.01) {
            seen += 1;
            return seen === 1;
          }
          return true;
        });
      }
    }),
  },
} as ReturnType<typeof controlComp>);

describe('julia — skill1 (self buffs, 10 sec)', () => {
  it('S1a: applies generic Critical Rate ▲ 26.04% to self', () => {
    const hits = selfBuffs.filter(
      (e) => e.stat === 'critRatePct' && Math.abs(e.value - 26.04) < 0.01
    );
    expect(hits.length).toBeGreaterThan(0);
  });

  it('S1b: applies ATK ▲ 20% to self as a plain percentage (atkPct, not casterAtkPct)', () => {
    // "ATK ▲ 20%" with no "of the skill user's ATK" qualifier scales the TARGET's own ATK.
    // Nearest-wrong: casterAtkPct, which would emit a FLAT resolved ATK number instead of 20.
    const hits = selfBuffs.filter(
      (e) => e.stat === 'atkPct' && Math.abs(e.value - 20) < 0.01
    );
    expect(hits.length).toBeGreaterThan(0);
    const flatMisencoding = selfBuffs.filter((e) => e.stat === 'casterAtkPct');
    expect(flatMisencoding).toHaveLength(0);
  });

  it('S1c: Normal Attack Critical Rate ▲ 36.16% is SCOPED (critRateNormalPct), not generic', () => {
    const scoped = selfBuffs.filter(
      (e) => e.stat === 'critRateNormalPct' && Math.abs(e.value - 36.16) < 0.01
    );
    expect(scoped.length).toBeGreaterThan(0);

    // Discriminator: no generic critRatePct carries the 36.16 magnitude.
    const genericAt36 = selfBuffs.filter(
      (e) => e.stat === 'critRatePct' && Math.abs(e.value - 36.16) < 0.01
    );
    expect(genericAt36).toHaveLength(0);
  });

  it('S1c: the scoped model is NOT damage-equivalent to the generic model (non-vacuity)', () => {
    // If julia had no crit-eligible non-normal damage, scoped-vs-generic would be a no-op and
    // the assertion above would be cosmetic. Her burst (544.5% ×5) and Marcato are crit-eligible,
    // so the generic mis-encoding MUST move her total upward.
    const wrong = totals(cfNormalCritGeneric.res)[SLUG];
    expect(wrong).not.toBeCloseTo(juliaTotal, 0);
    expect(wrong).toBeGreaterThan(juliaTotal);
  });

  it('S1a/S1c: buffs carry a 10 sec window (expiresFrame set, not permanent)', () => {
    const crit = selfBuffs.find(
      (e) => e.stat === 'critRatePct' && Math.abs(e.value - 26.04) < 0.01
    )!;
    expect(crit.expiresFrame).toBeGreaterThan(0);
    expect(crit.expiresFrame).toBeLessThan(180 * 60);
    // 10 sec = 600 frames from apply; the buff is windowed, so it re-applies over the fight.
    const critApplies = selfBuffs.filter(
      (e) => e.stat === 'critRatePct' && Math.abs(e.value - 26.04) < 0.01
    );
    expect(critApplies.length).toBeGreaterThan(1);
  });

  it('skill1 is load-bearing: stripping it lowers julia damage and leaves teammates alone', () => {
    const stripped = totals(cfNoSkill1.res)[SLUG];
    expect(stripped).toBeLessThan(juliaTotal);

    // Inertness: skill1 is "Affects self" — no teammate total may move.
    const base = totals(control.res);
    const cf = totals(cfNoSkill1.res);
    for (const slug of Object.keys(base)) {
      if (slug === SLUG) continue;
      expect(cf[slug]).toBeCloseTo(base[slug], 6);
    }
  });

  it('S1b: the ATK line alone is load-bearing (isolated from the crit lines)', () => {
    expect(totals(cfNoAtk.res)[SLUG]).toBeLessThan(juliaTotal);
  });
});

describe('julia — skill1 first-fire (S2d: "Forcefully uses Skill 1" at battle start)', () => {
  it('skill1 fires at t=0, not at t=cooldown', () => {
    // Force-cast convention: a kit line "Forcefully uses Skill N" first-fires at frame 0.
    // Nearest-wrong: a plain interval trigger, whose first apply would be at t=CD (>0).
    const first = selfBuffs
      .filter((e) => e.stat === 'atkPct' && Math.abs(e.value - 20) < 0.01)
      .map((e) => e.frame)
      .sort((a, b) => a - b)[0];
    expect(first).toBeLessThanOrEqual(1);
  });

  it('skill1 re-fires on an interval thereafter (more than the single forced cast)', () => {
    const applies = selfBuffs.filter(
      (e) => e.stat === 'atkPct' && Math.abs(e.value - 20) < 0.01
    );
    expect(applies.length).toBeGreaterThan(1);
  });
});

describe('julia — skill2 Crescendo (Critical Damage ▲ 24.79%, ≤5 stacks, 15 sec)', () => {
  it('applies critDamagePct 24.79% to self with maxStacks 5', () => {
    const cres = selfBuffs.filter(
      (e) => e.stat === 'critDamagePct' && Math.abs(e.value - 24.79) < 0.01
    );
    expect(cres.length).toBeGreaterThan(0);
    expect(cres[0].maxStacks).toBe(5);
  });

  it('Crescendo actually accrues past 1 stack (non-vacuity of the stack cap)', () => {
    const cres = selfBuffs.filter(
      (e) => e.stat === 'critDamagePct' && Math.abs(e.value - 24.79) < 0.01
    );
    const maxSeen = Math.max(...cres.map((e) => e.stacks ?? 1));
    expect(maxSeen).toBeGreaterThan(1);

    // And the cap pays: capping at 1 stack must lower julia's damage.
    expect(totals(cfCrescendo1Stack.res)[SLUG]).toBeLessThan(juliaTotal);
  });

  it('Crescendo is self-only (no teammate receives critDamagePct 24.79%)', () => {
    const leaked = buffApplies.filter(
      (e) =>
        e.targetSlug !== SLUG &&
        e.stat === 'critDamagePct' &&
        Math.abs(e.value - 24.79) < 0.01
    );
    expect(leaked).toHaveLength(0);
  });

  it('Crescendo is windowed (15 sec), not permanent', () => {
    const cres = selfBuffs.find(
      (e) => e.stat === 'critDamagePct' && Math.abs(e.value - 24.79) < 0.01
    )!;
    expect(cres.expiresFrame).toBeGreaterThan(0);
    expect(cres.expiresFrame).toBeLessThan(180 * 60);
  });
});

describe('julia — skill2 Marcato (88% of final ATK, additional damage)', () => {
  it('emits an 88%-of-ATK rider hit that is crit-eligible and takes no core', () => {
    // "additional damage" riders: crit at the caster's rate, NO core unless the text says
    // "core strike" (it does not), and no +30% range bonus.
    const marcato = damages.filter(
      (e) =>
        e.srcSlot === 'skill2' &&
        e.mult !== undefined &&
        Math.abs((e.atkPct ?? 0) - 88) < 0.01
    );
    expect(marcato.length).toBeGreaterThan(0);
    expect(marcato.every((e) => e.rangeApplied === false)).toBe(true);
    expect(marcato.every((e) => (e.coreRate ?? 0) === 0)).toBe(true);
  });

  it('Marcato is load-bearing and self-sourced (teammates unmoved)', () => {
    expect(totals(cfNoMarcato.res)[SLUG]).toBeLessThan(juliaTotal);

    const base = totals(control.res);
    const cf = totals(cfNoMarcato.res);
    for (const slug of Object.keys(base)) {
      if (slug === SLUG) continue;
      expect(cf[slug]).toBeCloseTo(base[slug], 6);
    }
  });

  it('Marcato takes the Full Burst major by TIMING (not FB-exempt)', () => {
    // A skill-2 rider is a function-damage hit: default FB-eligible by landing timing.
    // Nearest-wrong: noFb:true, which would leave every instance fbMajorApplied === false.
    const marcato = damages.filter(
      (e) => e.srcSlot === 'skill2' && Math.abs((e.atkPct ?? 0) - 88) < 0.01
    );
    const inFb = marcato.filter((e) => e.inFullBurst);
    expect(inFb.length).toBeGreaterThan(0);
    expect(inFb.every((e) => e.fbMajorApplied)).toBe(true);
  });
});

describe('julia — burst (544.5% of final ATK, sequentially 5 times)', () => {
  it('julia actually casts her burst in the fixture (non-vacuity)', () => {
    expect(burstCasts.length).toBeGreaterThan(0);
  });

  it('emits exactly 5 sequential 544.5% hits per burst cast', () => {
    const burstHits = damages.filter(
      (e) => e.srcSlot === 'burst' && Math.abs((e.atkPct ?? 0) - 544.5) < 0.01
    );
    expect(burstHits.length).toBe(burstCasts.length * 5);
  });

  it('burst damage is Full-Burst-exempt (it lands before the FB window opens)', () => {
    // Verified project fact: burst-cast damage lands BEFORE Full Burst begins — no +50%.
    // Nearest-wrong: keying the 5 hits to fullBurstEnter, which would stamp fbMajorApplied.
    const burstHits = damages.filter(
      (e) => e.srcSlot === 'burst' && Math.abs((e.atkPct ?? 0) - 544.5) < 0.01
    );
    expect(burstHits.every((e) => e.fbMajorApplied === false)).toBe(true);
  });

  it('the 5-hit count is load-bearing (a single hit lowers damage materially)', () => {
    expect(totals(cfBurstOneHit.res)[SLUG]).toBeLessThan(juliaTotal);
  });

  it('burst hits are enemy-directed only — no teammate buff is emitted by the burst slot', () => {
    const burstBuffs = buffApplies.filter(
      (e) => e.targetSlug !== SLUG && e.casterIdx === juliaIdx
    );
    expect(burstBuffs).toHaveLength(0);
  });
});

describe('julia — GAPs (missing engine primitives)', () => {
  it.skip('S2a trigger identity: "after landing 6 CRITICAL hits with normal attacks" — the engine has no crit-hit counter (hitCount counts ROUNDS, not crits), so the threshold is a ⚑ derived value (6 ÷ effective normal crit rate), not a kit-stated one', () => {});

  it.skip('S2b trigger identity: "after landing 8 CRITICAL hits with normal attacks" — same missing primitive; Marcato\'s cadence is a ⚑ derived round-count, unverifiable from the kit text alone', () => {});

  it.skip("S2c: \"Activates if Marcato lands as a crit attack → 100% of final ATK\" — there is no conditional-on-a-prior-rider's-crit-outcome primitive; the faithful model is a probabilistic 100% rider weighted by julia's crit rate at Marcato's landing frame, which no block gate expresses", () => {});

  it.skip('burst line 2: "Activates when Crescendo is at max stacks → additional 544.5%" — there is no buff-at-max-stacks block gate (resourceGate reads named resources, not buff stacks), so the 6th hit cannot be conditioned faithfully', () => {});
});
```

---

## SECTION 6 — S6 BLIND OVERRIDE (claude-opus-5, leakDetected null) + DIFF vs DRIVER

DIFF (blind → driver):

| line                    | S6 blind                                                                                                  | driver                                                                                  | adjudication point                                                                                                                        |
| ----------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| S1 trio                 | interval:40 only; FLAG claims 'first fire at battle start' but interval first-fires at t=40 (not enacted) | fused passive (t=0, 10s decay) + interval:40                                            | driver ENACTS the force-cast (frame-0 buffApply pinned); blind's note claims it but its blocks don't produce it                           |
| Crescendo cadence       | hitCount:12 (6 ÷ ~0.50 'effective crit rate')                                                             | hitCount:19 (6 ÷ 0.323 fight-averaged NA crit = 27.8% uptime × 77.2% + 72.2% × 15%)     | both ⚑-derived; driver's derivation is uptime-weighted from her own kit numbers                                                           |
| Marcato cadence         | hitCount:16 (8 ÷ 0.50)                                                                                    | hitCount:25 (8 ÷ 0.323)                                                                 | same                                                                                                                                      |
| Marcato-crit 100% rider | UNCONDITIONAL flatDamage 100 in Marcato's block (flag: 'optimistic bound; true EV ≈ 100% × critRate')     | EV companion flatDamage 22.23 crit:false (= 100% × 22.23% window-weighted generic crit) | driver = faithful expectation (takina precedent); blind over-credits ~4.5× by its own flag                                                |
| Burst main              | 5 separate flatDamage 544.5, flavor 'sequential'                                                          | one consolidated flatDamage 2722.5, unflavored                                          | blind's own flag: split-vs-merge 'affects nothing in aggregate damage — only per-popup validation'; flavor is a kit-silent consumer guess |
| Max-stacks bonus        | 6th flatDamage 544.5 UNCONDITIONAL (flag: 'nearly correct IF stacks at cap by first burst')               | flatDamage 544.5 + resourceGate{crescendo, min:5} over a shadow resource                | driver gates faithfully; empirically withholds the bonus from the t=5.4s opening cast (blind's model over-credits that cast)              |
| resources               | none                                                                                                      | crescendo {initial 0, min 0, max 5}                                                     | gate substrate                                                                                                                            |

### Blind override JSON

```json
{
  "slug": "julia",
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "interval",
        "sec": 40
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "critRatePct",
          "value": 26.04,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 20,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "critRateNormalPct",
          "value": 36.16,
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
        "count": 12
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "critDamagePct",
          "value": 24.79,
          "durationSec": 15,
          "maxStacks": 5
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "hitCount",
        "count": 16
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 88,
          "crit": true,
          "noRange": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 100,
          "crit": true,
          "noRange": true
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "passive"
      },
      "target": {
        "kind": "self"
      },
      "effects": []
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
          "atkPct": 544.5,
          "flavor": "sequential",
          "crit": true,
          "noFb": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 544.5,
          "flavor": "sequential",
          "crit": true,
          "noFb": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 544.5,
          "flavor": "sequential",
          "crit": true,
          "noFb": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 544.5,
          "flavor": "sequential",
          "crit": true,
          "noFb": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 544.5,
          "flavor": "sequential",
          "crit": true,
          "noFb": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 544.5,
          "flavor": "sequential",
          "crit": true,
          "noFb": true
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [],
    "skill2": [
      "\u25a0 Activates at the start of battle. Affects self.",
      "Forcefully uses Skill 1."
    ],
    "burst": [
      "\u25a0 Activates when Crescendo is at max stacks. Affects the same target.",
      "Deals 544.5% of final ATK as additional damage."
    ]
  },
  "caveats": [
    "\u2691 Crescendo/Marcato triggers are CRITICAL-hit counters ('after landing 6/8 critical hit(s) with normal attacks'); the engine's hitCount trigger counts ALL normal-attack rounds, not crits. Modeled as hitCount 12 / 16 = the crit thresholds divided by an ESTIMATED ~50% effective crit rate under her own S1 crit buffs. This is the single largest source of error in this baseline and is UNMEASURED.",
    "\u2691 Crescendo stack steady-state is modeled as a maxStacks:5 buff refreshed on each 12-hit trigger; whether real stacks sit at cap for most of the fight (15s duration vs the rebuild rate) is unverified. If they ramp, the Critical Damage contribution is over-credited early.",
    "\u2691 The burst's max-Crescendo rider (6th 544.5% instance) is modeled as UNCONDITIONAL \u2014 the engine has no Crescendo-stack resource gate exposed to a burst block. If Crescendo is NOT at 5 stacks at burst time, this over-credits by 544.5% of final ATK per burst. Listed verbatim in unmodeled/burst to keep the audit honest.",
    "\u2691 Marcato's crit-conditional second hit (100%) is modeled as ALWAYS landing alongside the 88%; the kit gates it on Marcato itself critting. Expected value should be 100% \u00d7 critRate, so this over-credits by (1 \u2212 critRate) \u00d7 100% of final ATK per proc.",
    "\u2691 skill1 cadence: no activation clause, so it is modeled as an interval keyed to the datamined 40s skill cooldown with a t=0 first fire implied by skill2's force-cast. Both the 40s value (datamine-unreliable) and the first-fire phase are unpinned.",
    "\u2691 Burst 'Attacks sequentially 5 times' is modeled as 5 discrete flatDamage instances rather than one merged hit; split-vs-merge is kit-silent and must be read from popups."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS \u2014 NOT a validated model). Every \u2691 below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Julia (AR/Iron/Attacker/B3) is a self-contained crit carry: S1 is a self-only crit/ATK window (note the SCOPED Normal Attack Critical Rate 36.16% \u2192 critRateNormalPct, distinct from the generic 26.04% critRatePct \u2014 an unscoped model would over-credit her skill and burst damage). S2 is a crit-hit-counter engine: Crescendo (Critical Damage, 5 stacks, 15s) at 6 crits, Marcato (88%) at 8 crits, plus a 100% rider if Marcato crits. The engine has no critical-hit counter trigger, so both thresholds are approximated on hitCount with an estimated effective crit rate \u2014 see caveats. S2's battle-start 'Forcefully uses Skill 1' is carried as an empty passive block and listed verbatim in unmodeled: the force-cast is expressed by S1's t=0 first fire, not by a separate effect. Burst is 5\u00d7544.5% sequential to random enemies plus a 6th 544.5% gated on max Crescendo; the gate is not expressible as a burst-block condition here, so the 6th instance is modeled unconditionally and flagged. Burst damage is burstCast-triggered and therefore FB-exempt (noFb) \u2014 a burst cast lands before the Full Burst window opens."
}
```

### S6 flags (verbatim)

```json
[
  {
    "field": "skill2[0].trigger.count / skill2[1].trigger.count",
    "estimate": "12 and 16 (crit thresholds 6 and 8 \u00f7 ~0.50 effective crit rate)",
    "reasoning": "The kit counts CRITICAL hits with normal attacks; the engine's hitCount trigger counts rounds. The conversion factor is her effective normal-attack crit rate, which under her own S1 window is base sheet crit + 26.04% + 36.16% \u2014 but the sheet base is not in the kit text and the S1 window is only 10s of every ~40s, so the rate swings hard between in-window and out-of-window firing. 50% is a mid estimate across the fight, not a derivation.",
    "recipe": "From a recording: count her normal-attack rounds between consecutive Crescendo stack applications (the stack icon increments) and between Marcato popups. Round-count \u00f7 6 and \u00f7 8 gives the true effective crit rate directly. Alternatively read the sheet crit rate off the character screen under scope lock and compute 6/rate and 8/rate, then check the popup cadence agrees."
  },
  {
    "field": "skill2[0].effects[0] (Crescendo steady-state)",
    "estimate": "Sits at or near 5 stacks for most of the fight after an opening ramp",
    "reasoning": "15s duration against a 12-round rebuild interval suggests stacks outpace expiry once firing is steady, so cap is plausible \u2014 but reloads (93 reload frames, 60 ammo) and the S1 window gaps interrupt accrual. Authored at full value with no rampSec, which over-credits the opening seconds.",
    "recipe": "Read the Crescendo stack pip count off the unit's buff row at 5s intervals through a recording; if it takes >5s to reach 5, set rampSec to the observed time-to-cap on the buff effect."
  },
  {
    "field": "burst[0].effects[5] (max-Crescendo rider)",
    "estimate": "Fires on every burst (modeled unconditional)",
    "reasoning": "Depends entirely on whether Crescendo is at 5 stacks when she bursts. If the stack pool is at cap by her first burst (~40s in), unconditional is nearly correct; if she bursts early or stacks lapse during the pre-burst chain, this over-credits by 544.5% of final ATK per burst.",
    "recipe": "Count burst popups in a recording: 6 large sequential numbers = the rider fired, 5 = it did not. Cross-check against the Crescendo pip count on the frame the burst banner appears. If it fires inconsistently, declare Crescendo as a resource and add a resourceGate {name:'crescendo', min:5} to a separate 6th-instance block."
  },
  {
    "field": "skill2[1].effects[1] (Marcato crit rider)",
    "estimate": "Always lands (modeled unconditional); true expected value \u2248 100% \u00d7 critRate",
    "reasoning": "The kit gates the 100% on Marcato itself critting, and the engine has no 'did the previous effect crit' condition. Unconditional is the optimistic bound; the faithful expected value is lower by (1\u2212critRate)\u00d7100% of final ATK per proc.",
    "recipe": "Count Marcato popup pairs in footage \u2014 an 88% popup followed by a 100% popup means the rider fired; a lone 88% means it did not. The ratio of paired to total Marcato procs IS the crit rate on that hit, which also independently validates the crit-rate estimate used for the hitCount conversion above."
  },
  {
    "field": "skill1[0].trigger.sec",
    "estimate": "40s interval, first fire at battle start",
    "reasoning": "Taken from the datamined cd 40s field, which the methodology marks as an unreliable source class. The battle-start first fire is implied by S2's 'Forcefully uses Skill 1' line per the force-cast convention (force-cast \u2192 t=0; plain interval \u2192 t=cd).",
    "recipe": "Time the gap between successive S1 buff-icon appearances on her buff row in a recording; confirm the first appearance is at or within a frame or two of t=0."
  },
  {
    "field": "burst[0].effects[0..4] (split vs merge)",
    "estimate": "5 separate hits of 544.5% each",
    "reasoning": "'Attacks sequentially 5 times' reads as 5 discrete instances, but whether the game renders 5 popups or one merged number is kit-silent and affects nothing in aggregate damage \u2014 only per-popup validation.",
    "recipe": "Count damage popups during her burst window in a recording; 5 (or 6 with the rider) distinct numbers confirms the split."
  },
  {
    "field": "burst[0].effects[*].flavor",
    "estimate": "'sequential'",
    "reasoning": "The kit says 'Attacks sequentially 5 times', which is the literal wording that feeds sequentialDamagePct / sequentialMultPct consumers. Tagged so a teammate carrying a Sequential Attack Damage \u25b2 buff correctly feeds these hits. If the flavor is wrong the hits still land, but cross-unit sequential buffs would mis-apply.",
    "recipe": "Run her in a comp with a known Sequential Attack Damage \u25b2 carrier and check whether the burst numbers scale with that buff active vs absent."
  }
]
```

---

## SECTION 7 — DRIVER IMPLEMENTATION (under judgment)

### 7a. Driver override (src/skills/overrides/julia.json)

```json
{
  "note": "Kit-autonomy gauntlet 2026-07-31 — first modeling (no prior override / kit-status row). julia = Julia (Treasure) — AR/Attacker/Iron/Burst III, cd 40s, ammo 60, 720 RPM, treasure:true; the datamined roster carries ONLY this Treasure variant (slug `julia`), the untreasured base kit is not in the sim. Ground truth is the top-level prose (data/characters.json → characters.julia.skills); the ulti_skill_detail table text ('5 enemies with the highest final DEF') is the stale base-variant targeting — the Treasure prose ('random enemies … attacks sequentially 5 times') is authoritative and collapses to the single immortal boss either way. SKILL1 'Decrescendo' (self, 10s): Critical Rate ▲26.04% (critRatePct, unscoped) + ATK ▲20% (atkPct) + Normal Attack Critical Rate ▲36.16% (critRateNormalPct — NA-SCOPED, helm precedent: feeds the crit roll ONLY for category 'normal', never Marcato/burst; sim.ts:1586). S1 has a 40s cooldown (datamined skillCooldownsSec.skill1 = 40) AND skill2's 'Forcefully uses Skill 1' start-of-battle line force-casts it at t=0: encoded as TWO blocks — a fused passive (on at frame 0, durationSec 10 — the chisato fused-passive pattern; sim.ts's alwaysOn rule keeps a durationLESS passive permanent, but a passive WITH durationSec decays from t=0, which is exactly the forced opening cast; this supersedes takina's 2026-07-24 'battle-start activation is not override-expressible' note, which predates the pattern) PLUS an interval:40 block (fires t=40/80/120/160, first fire at t=sec per the interval convention). 180s uptime = 5×10s = 50s (27.8%). Both blocks share the KR buff key (same slot+stat+value) so the interval fire cleanly refreshes the expired opening instance — no co-stack (maxStacks default 1). SKILL2 'Crescendo/Marcato' (passive, no CD): the kit counts CRITICAL normal-attack hits ('after landing 6/8 critical hit(s) with normal attacks') and the engine's hitCount trigger counts ALL rounds — there is no crit-conditioned counter (sim.ts:1606 marks on-crit trigger coupling as future work). Following eve's validated precedent (44 crits ÷ 0.75 → hitCount 59), each threshold is converted to rounds at julia's fight-averaged NA crit rate: 27.8% of the fight inside S1 windows at 77.2% (15 base + 26.04 + 36.16) and 72.2% outside at 15% → 32.3% average → 6 crits = ceil(6/0.323) = 19 rounds, 8 crits = ceil(8/0.323) = 25 rounds. CRESCENDO = hitCount:19 → self critDamagePct 24.79, maxStacks 5, durationSec 15 (each fire adds+refreshes a stack per applyBuff; 5 stacks = +123.95% Critical Damage; AR continuous fire rebuilds well inside the 15s window so stacks hold at 5 once earned ~8s in). The same fire advances a shadow `crescendo` resource (max 5, no decay) that feeds the burst bonus's resourceGate (soda-twinkling-bunny precedent) — the engine has no buff-stack gate, and the resource's no-decay diverges from the buff's 15s expiry ONLY if she stops landing NA crits for 15s+, which continuous sim fire never does. MARCATO = hitCount:25 → enemy flatDamage 88 (crit-eligible by the U1 default — 'function-type additional damage CRITS at the caster's rate, never cores, never gets range; FB by actual proc timing' — and the kit CONFIRMS it can crit: the very next line triggers on 'Marcato lands as a crit attack'; its crit rate is base+unscoped ONLY, 0.15/0.4104, the NA-scoped 36.16 correctly excluded because it is skill damage). MARCATO-CRIT RIDER 'if Marcato lands as a crit → 100% of final ATK additional damage' = a hit conditional on ANOTHER hit's crit result, which the schema cannot trigger — encoded as its CALIBRATED EXPECTATION (the takina uptime-average precedent for an unexpressible conditional: ⚑, not fudge): a companion flatDamage of 100% × P(Marcato crits) on the same hitCount:25 cadence, crit:false (an EV rider that rolled crit again would double-count). P = julia's GENERIC crit rate window-weighted over the 180s basis: 50/180 × (15+26.04)% + 130/180 × 15% = 11.40% + 10.83% = 22.23% → atkPct 22.23 (the NA-scoped 36.16 EXCLUDED — Marcato is not a normal attack). BURST 'Climax' (burstCast — her OWN burst, never fullBurstEnter; instant InstantNumber cast lands PRE-FB so neither hit takes the +50% FB major, verified fact 2026-07-13 helm/exia precedent): 'Deals 544.5% of final ATK as damage. Attacks sequentially 5 times' = one consolidated flatDamage 2722.5 (5×544.5 — the single immortal boss takes all 5 sequential hits; the deterministic expected-value crit pass makes 5 rolls at one rate ≡ 1 roll, so the consolidation is damage-identical; eve's 457.14×6 → 2742.84 and 2b's 2439.36 are the same consolidation for the same 'sequentially N times' wording). Deliberately UNFLAVORED (no 'sequential' flavor): julia's kit names no sequential-damage consumer, so the flavor is board-inert today and asserting it would be an unverified game-side claim (eve deliberately unflavored her burst for the same reason — her Mk2 doubles only Unstable Energy's sequential attacks). 'Activates when Crescendo is at max stacks → same target: 544.5% additional' = a SECOND burstCast flatDamage 544.5 gated on resourceGate {crescendo, min:5} — the shadow resource reaches 5 at ~8s of continuous fire, so every real cast (first at ~40s) fires it; the gate is load-bearing (ungated it would also fire on a hypothetical pre-stack cast). Crit-eligible/no-core/no-range per the U1 rider rule; unflavored like the main hit. NO heal/shield/DEF/HP/gauge/ammo/Hit-Rate lines exist in this kit (hard rules vacuous); 'Affects random enemies' / highest-DEF targeting collapses to the single boss (no targeting model). Cross-family: S2b claude-fable-5 independently re-derived every line from prose and converged (crit-rate-scaled hitCount proxy 'pinning proc RATE not existence', critRateNormalPct scoping with Marcato/burst at 0.15/0.4104, fused interval+t=0 S1, resourceGate max-stacks mirror, EV Marcato-crit rider — the reviewer PROPOSED the EV encoding the driver adopted; the reviewer's 5-separate-sequential-burst-events proposal was reconciled to the consolidated 2722.5 — damage-identical in the EV pass, eve precedent). scripts/tests/units/julia.test.ts pins every line GREEN vs shipped and RED vs its nearest-wrong counterfactual.",
  "caveats": [
    "⚑ CRIT-COUNT PROXY (derived, CALIBRATED — eve precedent): Crescendo hitCount:19 and Marcato hitCount:25 convert the kit's '6/8 critical hit(s) with normal attacks' to rounds at julia's 180s fight-averaged NA crit rate 32.3% (= 27.8% S1 uptime × 77.2% + 72.2% × 15%). STATIC on two axes: (a) it cannot track the S1 window PHASE — real procs cluster inside the 77.2% windows and thin out to 15% between them; the model spreads them evenly (same long-run RATE, different phase); (b) external team crit-rate buffs would shorten the real cadence and the static threshold cannot respond (eve's documented residual class). Estimate: the phase smoothing moves proc timing by <~3s per proc, damage-neutral to first order since buff uptime is near-saturated either way. Recipe: popup-read the Crescendo icon's 5-stack accrual time + Marcato popup cadence in a focused julia recording and rescale (threshold = N crits ÷ measured crit rate). Tier 2.",
    "⚑ MARCATO-CRIT RIDER is an EXPECTED-VALUE encoding (CALIBRATED — takina uptime-average precedent): flatDamage 22.23 = 100% × P(Marcato crits), P = 50/180 × 41.04% + 130/180 × 15% = 22.23% (generic crit only — the NA-scoped 36.16% excluded; 180s scope-lock S1 uptime). The engine has no on-crit trigger (sim.ts:1606), so the real per-proc crit CONDITIONAL is smeared into its mean: the model deals the right TOTAL rider damage but cannot correlate it with individual Marcato crits (and pays it on a fixed cadence rather than in crit-cluster bursts). Recipe: focused recording — count Marcato's orange (crit) popups and their 100% follow-ups to read the true proc probability; replace the EV rider with a real crit branch if the engine gains an on-crit trigger. Tier 2.",
    "⚑ CRESCENDO GATE RESOURCE does not decay (the critDamage buff's 15s expiry does): once the shadow `crescendo` pool reaches 5 the burst bonus gate stays open forever, whereas the real stacks lapse after 15s without a NA crit. Diverges ONLY if julia stops landing NA crits for 15+ continuous seconds — impossible in continuous sim fire (she lands ~1.8 NA crits/s even OUTSIDE her S1 windows, ~9.3/s inside). Tier 3.",
    "⚑ BURST CONSOLIDATION: the five sequential 544.5% hits are one 2722.5% instance (eve/2b precedent) — damage-identical in the deterministic EV pass (5 crit rolls at one rate ≡ 1), but the event MULTIPLICITY and any future per-hit interaction (a per-hit-on-sequential consumer, a parts model) would see 1 hit where the kit deals 5. Unflavored: the kit names no sequential-damage consumer, so 'sequential' flavor is an unverified game-side claim held off (eve precedent). Recipe: if a Sequential Attack Damage support is ever graded on her team, popup-read whether her 5-hit burst scales with it and flavor accordingly. Tier 3.",
    "⚑ TARGETING COLLAPSE: 'Affects random enemies' (prose) / '5 enemies with the highest final DEF' (stale base-variant table text) both collapse to the single immortal boss — no targeting model in v1; all 5 sequential hits and the max-stack bonus land on it. Tier 3."
  ],
  "unmodeled": {
    "skill1": [],
    "skill2": [],
    "burst": []
  },
  "resources": [
    {
      "name": "crescendo",
      "initial": 0,
      "min": 0,
      "max": 5
    }
  ],
  "skill1": [
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
          "stat": "critRatePct",
          "value": 26.04,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 20,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "critRateNormalPct",
          "value": 36.16,
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "interval",
        "sec": 40
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "critRatePct",
          "value": 26.04,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 20,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "critRateNormalPct",
          "value": 36.16,
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
        "count": 19
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "critDamagePct",
          "value": 24.79,
          "durationSec": 15,
          "maxStacks": 5
        },
        {
          "kind": "resource",
          "name": "crescendo",
          "delta": 1
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "hitCount",
        "count": 25
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 88
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "hitCount",
        "count": 25
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 22.23,
          "crit": false
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
          "atkPct": 2722.5
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
      "resourceGate": {
        "name": "crescendo",
        "min": 5
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 544.5
        }
      ]
    }
  ]
}
```

### 7b. Driver unit test (scripts/tests/units/julia.test.ts — 22/22 GREEN vs shipped)

```typescript
// PER-UNIT KIT SPEC — `julia` (Julia (Treasure), Attacker/AR/Iron, Burst III, cd 40s, ammo 60,
// 720 RPM, treasure variant of base Julia). Kit-autonomy gauntlet 2026-07-31, test-first (S2a).
//
// One assertion group per KIT LINE (J1..J5 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.julia.skills):
//   S1 ■ self: Critical Rate ▲26.04% for 10 sec                                              [J1a]
//      ■ self: ATK ▲20% for 10 sec                                                           [J1b]
//      ■ self: Critical Rate OF NORMAL ATTACKS ▲36.16% for 10 sec                            [J1c]
//      (S1 has a 40s cooldown AND is force-cast at battle start — see S2's last line)
//   S2 ■ after landing 6 NA crits → self: Crescendo: Critical Damage ▲24.79%, max 5, 15 sec  [J2]
//      ■ after landing 8 NA crits → the target: Marcato: 88% of final ATK additional damage [J3]
//      ■ if Marcato lands as a crit → same target: 100% of final ATK additional damage       [J3b EV]
//      ■ at battle start → self: Forcefully uses Skill 1                                     [J1 timing]
//   BU ■ random enemies: 544.5% of final ATK, attacks sequentially 5 times                   [J4a]
//      ■ when Crescendo is at max stacks → same target: 544.5% of final ATK additional       [J4b]
//
// Encodings under test (see src/skills/overrides/julia.json for the full note):
//   - S1 = a fused-passive block (on at frame 0, expires after 10s — the battle-start force-cast,
//     chisato precedent; sim.ts alwaysOn rule keeps a durationSec-less passive permanent, but a
//     passive WITH durationSec decays from t=0) PLUS an interval:40 block (t=40/80/120/160).
//   - "landing N crits" has no engine trigger (hitCount counts ALL hits; sim.ts:1606 notes on-crit
//     trigger coupling is future work). Following eve's validated precedent, the crit thresholds
//     are converted to hit thresholds at her fight-averaged NA crit rate: S1 uptime 5×10s/180s
//     = 27.8% at 77.2% (15 base + 26.04 + 36.16) and 72.2% at 15% → 32.3% average → 6 crits =
//     ceil(6/0.323) = 19 hits, 8 crits = ceil(8/0.323) = 25 hits. Static proxy ⚑ (cannot track
//     the S1 window phase or external team crit buffs — eve's documented residual class).
//   - Crescendo stacks are a maxStacks-5 / 15s buff; a shadow `crescendo` resource (max 5, no
//     decay) feeds the burst bonus's resourceGate min:5 (soda-twinkling-bunny precedent). The
//     resource's no-decay diverges from the buff's 15s expiry ONLY if she stops landing NA crits
//     for 15s+ — impossible in continuous sim fire.
//   - Burst = one consolidated 2722.5% (5×544.5) burstCast instance (single immortal boss = all 5
//     sequential hits land; the expected-value crit pass makes 5 rolls ≡ 1 — eve/2b precedent),
//     plus the 544.5% max-stacks bonus gated on the crescendo resource.
//
// The Marcato-crit rider ("if Marcato lands as a crit → 100% of final ATK additional damage") is
// a hit conditional on ANOTHER hit's crit result — the engine has no on-crit trigger (sim.ts:1606
// marks that coupling future work). Following the takina uptime-average precedent (an unexpressible
// conditional encoded as its CALIBRATED expectation, ⚑ not fudge), it rides as a companion
// flatDamage of 100% × P(Marcato crits) on the SAME hitCount-25 trigger, crit:false (an EV rider
// must not roll crit again). P is julia's GENERIC crit rate — base 15% + 26.04% inside her S1
// windows, the NA-scoped 36.16% EXCLUDED (Marcato is skill damage) — weighted by her 180s S1
// uptime (5×10s): 50/180 × 41.04% + 130/180 × 15% = 22.23% → atkPct 22.23. [J3b]
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   J1  the battle-start cast is a distinct fused-passive block: remove it and the frame-0 apply
//       vanishes (first cast slips to t=40). The 36.16 line is NA-SCOPED (critRateNormalPct):
//       julia's skill/burst buckets must NEVER see it (they resolve at base+unscoped only), and
//       the generic-critRatePct counterfactual provably DOES lift them — i.e. the shipped scope
//       assertion is one the generic model fails (helm H1 pattern).
//   J2  Crescendo is a STACKING 24.79×5 buff on a hitCount-19 cadence: fires === floor(shots/19)
//       exactly (the counter is per-shot), stacks reach 5, and a maxStacks-1 counterfactual loses
//       the 4 upper stacks' crit damage (strictly less total).
//   J3  Marcato is an 88% skill-bucket rider on hitCount-25: count === floor(shots/25), and its
//       crit rate is base+unscoped ONLY (≤0.4104) — it never picks up the 36.16 NA-scoped line.
//   J3b the EV companion rider is 22.23% (100% × 22.23% generic-crit probability), fires on the
//       same cadence, and is crit-INELIGIBLE (an EV rider that rolled crit would double-count).
//       The unconditional-100% counterfactual over-credits by ~1/P ≈ 4.5×; removing it under-credits.
//   J4  the burst is 2722.5 (not one 544.5 hit) cast BEFORE the FB window (never takes the +50%
//       major), and the 544.5 bonus is GATED: with Crescendo removed the shipped gate holds the
//       bonus at zero while an ungated counterfactual fires it every cast — the three-state proof
//       that the resourceGate is the discriminator.
//
// Fixture: the 720-kit-audit control comp (liter B1 / crown B2 / julia B3 / helm B3, boss Fire —
// neutral for Iron, focus julia). julia needs a real rotation to cast her burst at all (a lone B3
// makes zero Full Bursts); helm is the second ≤40s B3 that makes the stage sustainable. helm's own
// kit is deterministic here and touches julia only through NA-scoped crit (S1) and Damage-Up/ATK
// buffs — none of which contaminate the unscoped-crit assertions below. Deterministic (no seed).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
/** controlComp slot order: liter 0 / crown 1 / julia 2 / helm 3. */
const JULIA = 2;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp('julia'),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res), res };
}

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const juliaDamage = (evs: SimEvent[], srcSlot: Damage['srcSlot']) =>
  dmg(evs).filter((d) => d.slug === 'julia' && d.srcSlot === srcSlot);
const juliaBucket = (evs: SimEvent[], bucket: Damage['bucket']) =>
  dmg(evs).filter((d) => d.slug === 'julia' && d.bucket === bucket);
const juliaShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'julia');
const juliaBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'julia'
  );
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
/** julia's own self-buff applies for one stat (caster AND holder = julia). */
const juliaSelfBuffs = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter(
    (b) => b.casterIdx === JULIA && b.targetIdx === JULIA && b.stat === stat
  );
const critRateSet = (hits: Damage[]) =>
  [...new Set(hits.map((d) => d.critRate.toFixed(4)))].sort();

// ---- counterfactual patches (nearest wrong models) --------------------------------------------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);

/** J1: the battle-start force-cast block removed (S1 first fires at t=40, not t=0). */
const juliaNoBattleStart = withPatchedOverride('julia', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !(b.trigger.kind === 'passive'));
  if (ov.skill1.length === before) {
    throw new Error('julia S1 fused-passive block missing — fixture is stale');
  }
});
/** J1c: the NA-scoped crit line as a GENERIC (unscoped) crit-rate buff — would lift Marcato/burst. */
const juliaGenericCrit = withPatchedOverride('julia', (ov) => {
  let n = 0;
  for (const b of ov.skill1) {
    for (const e of b.effects) {
      if (e.stat === 'critRateNormalPct') {
        e.stat = 'critRatePct';
        n++;
      }
    }
  }
  if (n === 0) {
    throw new Error(
      'julia S1 critRateNormalPct effect missing — fixture is stale'
    );
  }
});
/** J2: Crescendo as a non-stacking buff (one stack forever — loses the 4 upper stacks). */
const juliaMaxStacks1 = withPatchedOverride('julia', (ov) => {
  const e = ov.skill2
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'buff' && x.stat === 'critDamagePct');
  if (!e) {
    throw new Error('julia Crescendo buff missing — fixture is stale');
  }
  e.maxStacks = 1;
});
/** J2/J4b: Crescendo removed entirely — the shadow resource stays at 0, so the max-stacks gate
 *  can never open (the burst's 2722.5 main hit is untouched). */
const juliaNoCrescendo = withPatchedOverride('julia', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasStat(b, 'critDamagePct'));
  if (ov.skill2.length === before) {
    throw new Error('julia Crescendo block missing — fixture is stale');
  }
});
/** J3: Marcato removed. */
const juliaNoMarcato = withPatchedOverride('julia', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) =>
      !b.effects.some((e: any) => e.kind === 'flatDamage' && e.atkPct === 88)
  );
  if (ov.skill2.length === before) {
    throw new Error('julia Marcato block missing — fixture is stale');
  }
});
/** J3b: the EV Marcato-crit rider removed (under-credit counterfactual). */
const juliaNoRiderEV = withPatchedOverride('julia', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) =>
      !b.effects.some((e: any) => e.kind === 'flatDamage' && e.atkPct === 22.23)
  );
  if (ov.skill2.length === before) {
    throw new Error('julia EV rider block missing — fixture is stale');
  }
});
/** J3b: the rider as an UNCONDITIONAL full 100% on every Marcato (over-credit counterfactual —
 *  the nearest wrong model; ignores that it fires only when Marcato crits). */
const juliaUnconditionalRider = withPatchedOverride('julia', (ov) => {
  const e = ov.skill2
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'flatDamage' && x.atkPct === 22.23);
  if (!e) {
    throw new Error('julia EV rider block missing — fixture is stale');
  }
  e.atkPct = 100;
});
/** J4b: the max-stacks bonus with its resourceGate stripped — fires on EVERY cast regardless of
 *  Crescendo state. Paired with juliaNoCrescendo to prove the gate is the discriminator. */
const juliaUngatedBonus = withPatchedOverride('julia', (ov) => {
  let n = 0;
  for (const b of ov.burst) {
    if (b.resourceGate?.name === 'crescendo') {
      delete b.resourceGate;
      n++;
    }
  }
  if (n === 0) {
    throw new Error(
      'julia crescendo-gated burst block missing — fixture is stale'
    );
  }
});
/** J4a: only ONE of the five sequential burst hits (nearest wrong magnitude: 544.5, not 2722.5). */
const juliaSingleHitBurst = withPatchedOverride('julia', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'flatDamage' && x.atkPct === 2722.5);
  if (!e) {
    throw new Error('julia burst 2722.5 hit missing — fixture is stale');
  }
  e.atkPct = 544.5;
});
/** J5: the whole kit removed (weapon only). */
const juliaEmpty = withPatchedOverride('julia', (ov) => {
  ov.skill1 = [];
  ov.skill2 = [];
  ov.burst = [];
  ov.resources = [];
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noBattleStart = run({ julia: juliaNoBattleStart });
const genericCrit = run({ julia: juliaGenericCrit });
const maxStacks1 = run({ julia: juliaMaxStacks1 });
const noCrescendo = run({ julia: juliaNoCrescendo });
const noMarcato = run({ julia: juliaNoMarcato });
const noRiderEV = run({ julia: juliaNoRiderEV });
const unconditionalRider = run({ julia: juliaUnconditionalRider });
const ungatedNoCrescendo = run({
  julia: (() => {
    // noCrescendo AND ungated in one override
    const ov = JSON.parse(JSON.stringify(juliaNoCrescendo));
    for (const b of ov.burst) {
      if (b.resourceGate?.name === 'crescendo') {
        delete b.resourceGate;
      }
    }
    return ov;
  })(),
});
const singleHit = run({ julia: juliaSingleHitBurst });
const empty = run({ julia: juliaEmpty });

const shots = juliaShots(base.events).length;
const casts = juliaBursts(base.events);

describe('julia (Treasure) — kit spec', () => {
  it('fixture sanity: julia fires, bursts, and the kit does damage', () => {
    expect(shots).toBeGreaterThan(1000);
    expect(casts.length).toBeGreaterThanOrEqual(3);
    expect(base.totals.julia).toBeGreaterThan(empty.totals.julia);
  });

  describe('J1 — S1 self-buff trio: battle-start force-cast + every 40s, 10s windows', () => {
    const STATS = [
      ['critRatePct', 26.04],
      ['atkPct', 20],
      ['critRateNormalPct', 36.16],
    ] as const;

    it.each(STATS)(
      'applies %s %d at t=0 (battle start) and t=40/80/120/160, each for 10s, self-only',
      (stat, value) => {
        const applied = juliaSelfBuffs(base.events, stat);
        expect(
          applied.map((b) => b.frame),
          'battle-start cast (frame 0) + interval:40 — a pure interval would start at 2400'
        ).toEqual([0, 2400, 4800, 7200, 9600]);
        expect([...new Set(applied.map((b) => b.value))]).toEqual([value]);
        for (const b of applied) {
          expect(b.expiresFrame! - b.frame, '10s window').toBe(10 * FPS);
        }
      }
    );

    it('DISCRIMINATING: without the fused-passive block there is NO frame-0 cast', () => {
      expect(
        juliaSelfBuffs(noBattleStart.events, 'critRatePct').map((b) => b.frame)
      ).toEqual([2400, 4800, 7200, 9600]);
    });

    it('the 36.16 line is NA-SCOPED: skill and burst buckets resolve at base+unscoped only', () => {
      // julia's skill bucket = Marcato + its EV companion; burst bucket = her two burst hits.
      // None is a normal attack, so none may see the 36.16 (or helm's 14.64) NA-scoped crit —
      // only 0.15 bare, 0.4104 inside her own S1 window (15 + 26.04 unscoped), and 0.0000 for the
      // crit-INELIGIBLE EV rider. The window rate 0.7720 must NEVER appear off the normal bucket.
      expect(critRateSet(juliaBucket(base.events, 'skill'))).toEqual([
        '0.0000',
        '0.1500',
        '0.4104',
      ]);
      expect(critRateSet(juliaBucket(base.events, 'burst'))).toEqual([
        '0.1500',
        '0.4104',
      ]);
      // her normal attacks DO carry the scoped line (0.772+ inside the S1 window; helm's own
      // NA-scoped buff can push the max higher — the floor is the discrimination).
      const normals = juliaBucket(base.events, 'normal');
      expect(Math.min(...normals.map((d) => d.critRate))).toBeCloseTo(0.15, 4);
      expect(
        Math.max(...normals.map((d) => d.critRate))
      ).toBeGreaterThanOrEqual(0.772 - 1e-9);
    });

    it('DISCRIMINATING: a generic critRatePct WOULD lift the skill/burst buckets', () => {
      expect(critRateSet(juliaBucket(genericCrit.events, 'skill'))).not.toEqual(
        critRateSet(juliaBucket(base.events, 'skill'))
      );
      expect(critRateSet(juliaBucket(genericCrit.events, 'burst'))).not.toEqual(
        critRateSet(juliaBucket(base.events, 'burst'))
      );
    });
  });

  describe('J2 — Crescendo: Critical Damage ▲24.79% per stack, max 5, 15s, every ~6 NA crits', () => {
    const applied = juliaSelfBuffs(base.events, 'critDamagePct');

    it('is 24.79 per stack, caps at 5 stacks, 15s per refresh', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([24.79]);
      expect([...new Set(applied.map((b) => b.maxStacks))]).toEqual([5]);
      expect(
        Math.max(...applied.map((b) => b.stacks)),
        'stacks must reach 5'
      ).toBe(5);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame, '15s duration').toBe(15 * FPS);
      }
    });

    it('fires on the hitCount-19 crit proxy (6 crits at the 32.3% fight-averaged NA crit rate)', () => {
      // the hitCount counter advances once per shot (AR hitsPerShot 1) → exact.
      expect(applied.length).toBe(Math.floor(shots / 19));
    });

    it('DISCRIMINATING: a maxStacks-1 Crescendo loses the upper stacks and her total drops', () => {
      expect(
        Math.max(
          ...juliaSelfBuffs(maxStacks1.events, 'critDamagePct').map(
            (b) => b.stacks
          )
        )
      ).toBe(1);
      expect(unitOf(base.res, 'julia').totalDamage).toBeGreaterThan(
        unitOf(maxStacks1.res, 'julia').totalDamage
      );
    });
  });

  describe('J3 — Marcato: 88% of final ATK additional damage every ~8 NA crits', () => {
    const skill2Hits = juliaDamage(base.events, 'skill2');
    const marcato = skill2Hits.filter((d) => d.atkPct === 88);

    it('lands at the kit magnitude, crit-eligible, in the skill bucket', () => {
      expect(marcato.length).toBeGreaterThan(0);
      expect([...new Set(marcato.map((d) => d.bucket))]).toEqual(['skill']);
      expect(marcato.every((d) => d.critEligible)).toBe(true);
    });

    it('fires on the hitCount-25 crit proxy (8 crits at the 32.3% averaged rate)', () => {
      expect(marcato.length).toBe(Math.floor(shots / 25));
    });

    it('never picks up the NA-scoped crit line (proc, not a normal attack)', () => {
      expect(critRateSet(marcato)).toEqual(['0.1500', '0.4104']);
    });

    it('DISCRIMINATING: removing Marcato leaves zero 88% instances and less total', () => {
      expect(
        juliaDamage(noMarcato.events, 'skill2').filter((d) => d.atkPct === 88)
          .length
      ).toBe(0);
      expect(unitOf(base.res, 'julia').totalDamage).toBeGreaterThan(
        unitOf(noMarcato.res, 'julia').totalDamage
      );
    });
  });

  describe('J3b — Marcato-crit rider: EV companion of 100% × P(Marcato crits) = 22.23%', () => {
    const rider = juliaDamage(base.events, 'skill2').filter(
      (d) => d.atkPct === 22.23
    );

    it('rides at the calibrated expectation, on Marcato\u2019s cadence, crit-INELIGIBLE', () => {
      const marcatoCount = juliaDamage(base.events, 'skill2').filter(
        (d) => d.atkPct === 88
      ).length;
      expect(rider.length).toBeGreaterThan(0);
      expect(rider.length, 'one EV companion per Marcato proc').toBe(
        marcatoCount
      );
      // an EV rider that rolled crit again would double-count the expectation
      expect(rider.every((d) => !d.critEligible)).toBe(true);
      expect([...new Set(rider.map((d) => d.critRate))]).toEqual([0]);
    });

    it('DISCRIMINATING: removing it under-credits; the unconditional full 100% over-credits', () => {
      expect(
        juliaDamage(noRiderEV.events, 'skill2').filter(
          (d) => d.atkPct === 22.23
        ).length
      ).toBe(0);
      expect(unitOf(base.res, 'julia').totalDamage).toBeGreaterThan(
        unitOf(noRiderEV.res, 'julia').totalDamage
      );
      expect(
        unitOf(unconditionalRider.res, 'julia').totalDamage
      ).toBeGreaterThan(unitOf(base.res, 'julia').totalDamage);
    });
  });

  describe('J4 — burst: 5×544.5% sequential (consolidated) + 544.5% at max Crescendo stacks', () => {
    const burstHits = juliaBucket(base.events, 'burst');
    const main = burstHits.filter((d) => d.atkPct === 2722.5);
    const bonus = burstHits.filter((d) => d.atkPct === 544.5);

    it('deals 2722.5% (5 sequential hits) once per cast, before the FB window, crit-eligible', () => {
      expect(casts.length).toBeGreaterThanOrEqual(3);
      expect(main.length).toBe(casts.length);
      expect(
        main.every((d) => d.fbMajorApplied),
        'burstCast lands pre-FB'
      ).toBe(false);
      expect(main.every((d) => d.critEligible)).toBe(true);
    });

    it('gates the bonus on max stacks: the ~5s opening cast (pre-stacks) gets NONE, every later cast gets it', () => {
      const firstMaxed = juliaSelfBuffs(base.events, 'critDamagePct').find(
        (b) => b.stacks === 5
      );
      expect(firstMaxed, 'Crescendo never reached 5 stacks').toBeDefined();
      // the opening cast lands before 5 stacks (5×6 NA crits) are reachable — the gate must hold it
      expect(casts[0].frame).toBeLessThan(firstMaxed!.frame);
      expect(bonus.length).toBe(casts.length - 1);
      // every cast from stacks-maxed onward carries exactly one bonus, resolving right after the
      // cast (cast event → damage resolution is a few frames; casts are ~30s apart, so index
      // pairing is unambiguous)
      const gatedFrames = casts
        .filter((c) => c.frame >= firstMaxed!.frame)
        .map((c) => c.frame);
      expect(gatedFrames.length).toBe(bonus.length);
      const bonusFrames = bonus.map((b) => b.frame).sort((a, b) => a - b);
      gatedFrames.forEach((cf, i) => {
        const delta = bonusFrames[i] - cf;
        expect(
          delta,
          `bonus ${i} resolved ${delta}f after its gated cast — not a per-cast rider`
        ).toBeGreaterThanOrEqual(0);
        expect(delta).toBeLessThanOrEqual(10);
      });
    });

    it('DISCRIMINATING: with Crescendo removed the gate holds the bonus at zero (main hit intact)', () => {
      const nCast = juliaBursts(noCrescendo.events).length;
      expect(
        juliaBucket(noCrescendo.events, 'burst').filter(
          (d) => d.atkPct === 544.5
        ).length
      ).toBe(0);
      expect(
        juliaBucket(noCrescendo.events, 'burst').filter(
          (d) => d.atkPct === 2722.5
        ).length
      ).toBe(nCast);
    });

    it('DISCRIMINATING: ungated, the bonus fires every cast EVEN with Crescendo removed', () => {
      const nCast = juliaBursts(ungatedNoCrescendo.events).length;
      expect(
        juliaBucket(ungatedNoCrescendo.events, 'burst').filter(
          (d) => d.atkPct === 544.5
        ).length
      ).toBe(nCast);
    });

    it('DISCRIMINATING: a single-hit burst (544.5) is strictly less damage than the 5-hit 2722.5', () => {
      expect(
        juliaBucket(singleHit.events, 'burst').filter(
          (d) => d.atkPct === 2722.5
        ).length
      ).toBe(0);
      expect(unitOf(base.res, 'julia').totalDamage).toBeGreaterThan(
        unitOf(singleHit.res, 'julia').totalDamage
      );
    });
  });

  describe('J5 — whole-kit sanity', () => {
    it('her kit is a strict damage gain over the bare weapon', () => {
      expect(unitOf(base.res, 'julia').totalDamage).toBeGreaterThan(
        unitOf(empty.res, 'julia').totalDamage
      );
    });
  });
});
```

### 7c. Empirical fight anatomy (deterministic EV pass, controlComp liter/crown/julia/helm, boss Fire, 180s)

- julia bursts at t = 5.4 / 39.6 / 72.8 / 104.5 / 134.6 / 164.6 s (6 casts)
- Crescendo reaches 5 stacks at t = 9.1 s → the 544.5% bonus fires on casts 2-6 (5 instances), correctly NOT on the t=5.4s opener
- validate-overrides: valid | 222.7M total (35.4% share) | 5+ bursts | warnings = the 5 authored ⚑ caveats only
