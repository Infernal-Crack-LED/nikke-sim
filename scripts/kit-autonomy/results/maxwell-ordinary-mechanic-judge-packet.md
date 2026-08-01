# S7 RECONCILING-JUDGE PACKET — `maxwell-ordinary-mechanic` (Maxwell: Ordinary Mechanic)

You are the BINDING cross-family reconciling judge for ONE unit's kit-autonomy gauntlet. Grade the DRIVER's implementation against the real kit text + the damage-formula SSOT, reconciling the two blind derivations. Return the verdict JSON the contract specifies. Read every section; do not skip the SSOT.

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

---

## SECTION 3 — GROUND TRUTH: the unit's kit prose + datamined base stats

(data/characters.json → characters['maxwell-ordinary-mechanic']; level-10 values are the last entry of each description_value list.)

````json
{
  "slug": "maxwell-ordinary-mechanic",
  "name": "Maxwell: Ordinary Mechanic",
  "imageUrl": "https://sg-tools-cdn.blablalink.com/hi-13/bk-24/b75e9eeb212dec55a984d10b45edcf11.png",
  "weapon": "SR",
  "burst": "II",
  "burstCooldownSec": 20,
  "class": "Supporter",
  "element": "Wind",
  "manufacturer": "Missilis",
  "normalAttackMultiplier": 69.04,
  "coreAttackMultiplier": 200,
  "ammo": 6,
  "reloadFrames": 141,
  "chargeFrames": 60,
  "chargeMultiplier": 250,
  "hitsPerShot": 1,
  "rl3": 29.85,
  "releaseDate": "2026-07-30",
  "burstGaugePerShot": 2.8,
  "treasure": false,
  "nicknames": [
    "mom"
  ],
  "skills": {
    "skill1": "■ Activates when performing a Full Charge attack. Affects all allies.\nMax HP ▲ 1% of the skill user's max HP continuously. Stacks up to 30 times.\n■ Activates when entering Burst Stage 3. Affects all allies.\nAttack Damage ▲ 10% for 5 sec.",
    "skill2": "■ Activates when using Burst Skill. Affects all allies.\nATK ▲ 1% of the skill user's final max HP for 15 sec.\n■ Activates when using Burst Skill. Affects self.\nOvercurrent: ATK ▲ 30% continuously. Up to 5 stages in total.\n■ Activates when performing a Full Charge attack. Affects all allies.\nFills Burst Gauge by 7.15%.",
    "burst": "■ Affects self.\nChanges the weapon in use: Matis UberBuster\nCharge Time is fixed. Effect varies according to the stage of Overcurrent. Only one effect is triggered at a time.\nCharge Time: 3sec.\nStage 1 or below: Fixed at 3 sec.\nStage 2: Fixed at 2.5 sec.\nStage 3: Fixed at 2 sec.\nStage 4: Fixed at 1.5 sec.\nStage 5 or above: Fixed at 0.4 sec.\nDamage: 350% of final ATK\nFull Charge Damage: 300%\nMax Ammunition Capacity: 1\nAdditional Effect: Gains Pierce.\n■ Affects all allies.\nAttack Damage ▲ 25% for 10 sec."
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
      "use_burst_skill": "Step2",
      "burst_apply_delay": 1,
      "change_burst_step": "Step3"
    },
    "skillDetails": {
      "skill1_id": 2105101,
      "skill2_id": 2105201,
      "skill1_table": "StateEffect",
      "skill2_table": "StateEffect",
      "skill1_detail": {
        "id": 2105101,
        "icon": "icn_skill_stathp_01",
        "group_id": 21051,
        "skill_level": 1,
        "name_localkey": "Sequential Limit Release",
        "next_level_id": 2105102,
        "level_up_cost_id": 30102,
        "description_localkey": "■ Activates when performing a Full Charge attack. Affects all allies.\n<color=#00AEFF>Max HP ▲ {description_value_01}% of the skill user's max HP continuously. Stacks up to {description_value_02} times.</color>\n■ Activates when entering Burst Stage {description_value_03}. Affects all allies.\n<color=#00AEFF>Attack Damage ▲ {description_value_04}% for {description_value_05} sec.</color>",
        "description_value_list": [
          {
            "description_value": [
              "0.5",
              "0.56",
              "0.61",
              "0.67",
              "0.72",
              "0.78",
              "0.84",
              "0.89",
              "0.95",
              "1"
            ]
          },
          {
            "description_value": [
              "30",
              "30",
              "30",
              "30",
              "30",
              "30",
              "30",
              "30",
              "30",
              "30"
            ]
          },
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
              "6.25",
              "6.67",
              "7.08",
              "7.5",
              "7.92",
              "8.33",
              "8.75",
              "9.16",
              "9.58",
              "10"
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
        "id": 2105201,
        "icon": "icn_skill_atkup_01",
        "group_id": 21052,
        "skill_level": 1,
        "name_localkey": "Output Switching Sequence",
        "next_level_id": 2105202,
        "level_up_cost_id": 30202,
        "description_localkey": "■ Activates when using Burst Skill. Affects all allies.\n<color=#00AEFF>ATK ▲ {description_value_01}% of the skill user's <word_group=10025>final</word_group> max HP for {description_value_02} sec.</color>\n■ Activates when using Burst Skill. Affects self.\n<color=#00AEFF>Overcurrent: ATK ▲ {description_value_05}% continuously. Up to {description_value_06} stages in total.</color>\n■ Activates when performing a Full Charge attack. Affects all allies.\n<color=#00AEFF><word_group=10015>Fills Burst Gauge</word_group> by {description_value_07}%.</color>",
        "description_value_list": [
          {
            "description_value": [
              "0.5",
              "0.56",
              "0.61",
              "0.67",
              "0.72",
              "0.78",
              "0.84",
              "0.89",
              "0.95",
              "1"
            ]
          },
          {
            "description_value": [
              "15",
              "15",
              "15",
              "15",
              "15",
              "15",
              "15",
              "15",
              "15",
              "15"
            ]
          },
          {
            "description_value": [
              "3.58",
              "3.98",
              "4.38",
              "4.77",
              "5.17",
              "5.57",
              "5.96",
              "6.36",
              "6.76",
              "7.15"
            ]
          },
          {
            "description_value": [
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0"
            ]
          },
          {
            "description_value": [
              "15",
              "16.67",
              "18.34",
              "20",
              "21.67",
              "23.33",
              "25",
              "26.67",
              "28.33",
              "30"
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
              "3.58",
              "3.98",
              "4.38",
              "4.77",
              "5.17",
              "5.57",
              "5.96",
              "6.36",
              "6.76",
              "7.15"
            ]
          },
          {},
          {},
          {},
          {}
        ],
        "info_description_localkey": "Skill 2"
      },
      "ulti_skill_id": 1105301,
      "ulti_skill_detail": {
        "id": 1105301,
        "icon": "icn_skill_c105_ult",
        "group_id": 11053,
        "shake_id": 1,
        "skill_type": "ChangeWeapon",
        "attack_type": "Wind",
        "skill_level": 1,
        "counter_type": "Metal_Type",
        "duration_type": "Shots",
        "name_localkey": "Matis UberBuster",
        "next_level_id": 1105302,
        "prefer_target": "HighAttack",
        "resource_name": "c105_ulti",
        "duration_value": 1,
        "skill_cooltime": 2000,
        "level_up_cost_id": 30302,
        "skill_value_data": [
          {
            "skill_value": 17500,
            "skill_value_type": "Percent"
          },
          {
            "skill_value": 60,
            "skill_value_type": "Integer"
          },
          {
            "skill_value": 1010502,
            "skill_value_type": "Integer"
          },
          {
            "skill_value": 0,
            "skill_value_type": "None"
          },
          {
            "skill_value": 0,
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
        "description_localkey": "■ Affects self.\n<color=#00AEFF>Changes the weapon in use: Matis UberBuster\nCharge Time is fixed. Effect varies according to the stage of Overcurrent. Only one effect is triggered at a time.\nCharge Time: {description_value_09}sec.\nStage 1 or below: Fixed at {description_value_09} sec.\nStage 2: Fixed at {description_value_01} sec.\nStage 3: Fixed at {description_value_02} sec.\nStage 4: Fixed at {description_value_03} sec.\nStage 5 or above: Fixed at {description_value_04} sec.\nDamage: {description_value_05}% of <word_group=10025>final</word_group> ATK\nFull Charge Damage: 300%\nMax Ammunition Capacity: {description_value_06}\nAdditional Effect: Gains Pierce.</color>\n■ Affects all allies.\n<color=#00AEFF>Attack Damage ▲ {description_value_07}% for {description_value_08} sec.</color>",
        "description_value_list": [
          {
            "description_value": [
              "2.5",
              "2.5",
              "2.5",
              "2.5",
              "2.5",
              "2.5",
              "2.5",
              "2.5",
              "2.5",
              "2.5"
            ]
          },
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
              "1.5",
              "1.5",
              "1.5",
              "1.5",
              "1.5",
              "1.5",
              "1.5",
              "1.5",
              "1.5",
              "1.5"
            ]
          },
          {
            "description_value": [
              "0.4",
              "0.4",
              "0.4",
              "0.4",
              "0.4",
              "0.4",
              "0.4",
              "0.4",
              "0.4",
              "0.4"
            ]
          },
          {
            "description_value": [
              "175",
              "194.44",
              "213.89",
              "233.33",
              "252.78",
              "272.22",
              "291.67",
              "311.11",
              "330.56",
              "350"
            ]
          },
          {
            "description_value": [
              "1",
              "1",
              "1",
              "1",
              "1",
              "1",
              "1",
              "1",
              "1",
              "1"
            ]
          },
          {
            "description_value": [
              "12.5",
              "13.89",
              "15.28",
              "16.67",
              "18.06",
              "19.44",
              "20.83",
              "22.22",
              "23.61",
              "25"
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
          {},
          {}
        ],
        "prefer_target_condition": "None",
        "info_description_localkey": "Burst Skill",
        "after_use_function_id_list": [
          110530106,
          110530104,
          110530103,
          110530102,
          110530101,
          110530105
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
      "grow_grade": 110502,
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
        300001
      ],
      "element_details": [
        {
          "id": 300001,
          "element": "Wind",
          "group_id": 5000003,
          "element_icon": "icn_element_wind",
          "weak_element_id": 100001,
          "element_desc_localekey": "Injects Code: A.N.M.I. to all iron-type enemies, dealing 10% additional damage.",
          "element_name_localekey": "Wind",
          "element_code_name_localekey": "Code: A.N.M.I."
        }
      ]
    },
    "piece": {
      "piece_id": 5100105,
      "piece_detail": {
        "id": 5100105,
        "class": "Attacker",
        "order": 10500,
        "use_id": 0,
        "use_type": "None",
        "item_rare": "SSR",
        "item_type": "Piece",
        "stack_max": 9999999,
        "use_value": 0,
        "corporation": "MISSILIS",
        "resource_id": 105,
        "item_sub_type": "CharacterPiece",
        "name_localkey": "Maxwell: Ordinary Mechanic's Spare Body",
        "use_limit_count": false,
        "inventory_filter": [
          "etc"
        ],
        "description_localkey": "Used for a Nikke's Limit Break.\nSpare Bodies for a fully enhanced Nikke will be converted into Body Labels."
      }
    },
    "meta": {
      "id": 110501,
      "class": "Supporter",
      "order": 10088,
      "name_code": 5178,
      "corporation": "MISSILIS",
      "resource_id": 105,
      "name_localkey": "Maxwell: Ordinary Mechanic",
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
    "maxLevel": 1400,
    "critDamage": 150,
    "resourceId": 105
  }
}```

---

## SECTION 4 — S2b TEST-FAITHFULNESS REVIEW (claude-fable-5, blind)

```json
{
  "slug": "maxwell-ordinary-mechanic",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "Full Charge → Max HP ▲ 1% of user, x30",
      "disposition": "FAITHFUL",
      "scope": "Procs on the owner's Full Charge attacks only (SR base weapon full-charges every pull in-sim; the burst-swap UberBuster's shots are ALSO Full Charge attacks and must keep proccing this — see notes).",
      "durationSemantics": "'continuously' = permanent, no durationSec, no expiry; stack counter caps at maxStacks 30.",
      "triggerIdentity": "Per full-charge shot by the owner (shotFired on an always-full-charging SR; a charge-gated trigger if partial charges exist). NOT interval, NOT hitCount-on-allies.",
      "targetSet": "All allies INCLUDING self — the self-application is the load-bearing half (caster===target feeds her own 'final max HP').",
      "nearestWrongModel": "Encoded as targetMaxHpPct (1% of each TARGET's own HP) instead of casterMaxHpPct, or given a durationSec, or stack cap dropped — worst: treated as offensively inert and skipped because ally Max-HP grants don't feed teammates' conversions (her SELF-grant feeds skill2a).",
      "distinguishingAssertion": "buffApply events stat 'maxHpFlat' with casterIdx = maxwell's slot hitting all 5 targets, the SAME flat value on every target (1% of Maxwell's max HP — targetMaxHpPct would emit per-target-different values), stacks climbing 1→30 then holding, no time expiry (expiresFrame absent/∞); apply count tracks her full-charge shot count.",
      "inertness": "Ally-side grants move NO ally damage (ally-granted Max HP does not feed teammate atkOfMaxHpPct). Zeroing this line must NOT change liter/crown/helm damage — but MUST shrink the skill2a flat-ATK grant value at later casts.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Enter Burst Stage 3 → Atk Dmg ▲10% 5s",
      "disposition": "FAITHFUL",
      "scope": "Generic Attack Damage (Damage-Up bucket) on all allies' damage, 5s window.",
      "durationSemantics": "durationSec 5, wall-clock.",
      "triggerIdentity": "stageEnter stage:3 — fires when ANY unit casts a stage-3 burst, every rotation. NOT Maxwell's own burstCast (she is B2), NOT fullBurstEnter.",
      "targetSet": "All allies including self.",
      "nearestWrongModel": "Keyed to fullBurstEnter — shifts the 5s window ~22f later (past B3 cast, so the B3 unit's burst-cast damage no longer sits inside it) ; or keyed to her own burstCast (fires at B2 timing, 30f early, and dies if she ever doesn't burst).",
      "distinguishingAssertion": "attackDamagePct=10 buffApply frame equals the B3 burstCast event frame each rotation (strictly BEFORE the fullBurstStart frame), and the B3 carry's burst-cast damage event falls inside the 5s window under faithful but outside it under the fullBurstEnter misread.",
      "inertness": "Must fire on rotations regardless of whether Maxwell herself bursts (it is team-B3-keyed).",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Burst Skill → ATK ▲1% user final HP 15s",
      "disposition": "FAITHFUL",
      "scope": "Flat ATK add to all allies, sized off the CASTER's FINAL (live, buffed) Max HP at cast time.",
      "durationSemantics": "durationSec 15, wall-clock.",
      "triggerIdentity": "burstCast — Maxwell's OWN burst only (\"when using Burst Skill\"). NOT fullBurstEnter (diverges if another B2 ever chains).",
      "targetSet": "All allies including self.",
      "nearestWrongModel": "(a) Resolved off BASE max HP, ignoring 'final' — misses the skill1 stack ramp; (b) encoded as atkPct 1 (a percentage of each target's own ATK — tiny) instead of a caster-HP-scaled FLAT add; (c) keyed to fullBurstEnter.",
      "distinguishingAssertion": "buffApply on maxwell's burstCast frames emits a FLAT ATK value (HP-magnitude number, not raw '1'), identical across all 5 targets, and the value at her Nth cast is STRICTLY GREATER than at her 1st cast (skill1 stacks grew her final Max HP between casts). Red under base-HP static resolution (equal values every cast) and under atkPct encoding (value=1).",
      "inertness": "Fires zero times in any fixture where Maxwell never casts her burst — a fixture without her in the B2 rotation makes this line (and all of skill2/burst) vacuously dead; the test comp MUST have her actually bursting.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Burst → Overcurrent ATK ▲30% x5 self",
      "disposition": "FAITHFUL",
      "scope": "Self-only generic atkPct, +30 percentage points per stage.",
      "durationSemantics": "'continuously' = permanent stacks, no expiry; 'Up to 5 stages' = maxStacks 5 (+150% at cap). One stage gained per own burst cast.",
      "triggerIdentity": "burstCast (own burst). Doubles as the RESOURCE the burst weapon's charge-time ladder reads — the stack count must be queryable/gateable at burst-cast time.",
      "targetSet": "Self only.",
      "nearestWrongModel": "durationSec attached (stacks decay), or value read as 30% TOTAL across 5 stages (6%/stage), or keyed to fullBurstEnter (stacks on every team FB — indistinguishable while she is the sole B2 bursting every rotation, wrong the moment she skips one), or the stack count not wired to the burst charge-time selection.",
      "distinguishingAssertion": "buffApply stat atkPct value 30, targetIdx==casterIdx==maxwell, stacks sequence 1,2,3,4,5 across her first five burst casts then capped at 5 on later casts, expiresFrame absent/∞ (no re-application lapse between 20s-CD casts).",
      "inertness": "Zero effect on any ally's damage events; only Maxwell's own effective ATK moves.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Full Charge → Fills Burst Gauge 7.15%",
      "disposition": "FAITHFUL",
      "scope": "Team burst gauge, +7.15% per full-charge attack by the owner — a ROTATION line, not a damage line.",
      "durationSemantics": "Instant fill per proc; no duration.",
      "triggerIdentity": "Per full-charge shot by the owner (same trigger identity as skill1-line-1); fillGauge effect. The UberBuster swap shots are full charges too and must keep pumping (at stage 5's 0.4s charge this accelerates sharply).",
      "targetSet": "Team gauge ('Affects all allies' is flavor for the shared gauge).",
      "nearestWrongModel": "Dropped as 'utility, no damage' (it moves FB counts), or misread as 7.15% ATK damage per shot, or applied per-hit/per-interval instead of per-full-charge.",
      "distinguishingAssertion": "With the fillGauge block zeroed via withPatchedOverride, the fixture's fullBurstStart count drops or the first fullBurstStart frame moves later; with it live, first-FB timing is earlier. (No direct gauge event kind — assert through fullBurstStart timing/count delta.)",
      "inertness": "Patching it out must not change any per-shot damage mult — only rotation timing/FB counts.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Swap: Matis UberBuster 350%/FC 300%",
      "disposition": "FAITHFUL",
      "scope": "Self weaponSwap: damagePct 350, chargeMultPct 300 (full-charge shot ≈ 350×3.0 = 1050% of final ATK), maxAmmo 1 (a reload after EVERY swap shot — reloadFrames 141 ≈ 2.35s dominates the cycle), 'Gains Pierce' scoped to the swap.",
      "durationSemantics": "Swap duration is KIT-SILENT — ⚑ (convention: the ~10s burst window). Shot economy per burst = duration / (chargeTime + reload + release latency) — ALWAYS-⚑ field 3, estimate optimistically, never ship silently.",
      "triggerIdentity": "burstCast, self. Burst-cast damage of the swap's first shot follows normal charge timing (the swap changes the weapon; it is not an instant nuke).",
      "targetSet": "Self (weapon state); the trailing 25% line is the ally-facing half.",
      "nearestWrongModel": "hasPierce set as the TOP-LEVEL whole-fight flag (tags her base SR shots pierce all fight) instead of weaponSwap-scoped hasPierce; or maxAmmo 1 ignored (no reload between swap shots — roughly doubles+ swap shot count); or full-charge damage read as 300% flat instead of 350%×300%.",
      "distinguishingAssertion": "During the swap window: damage events with mult ≈ 1050% of ATK in the charge bucket, exactly ONE shot per magazine with a reload event between consecutive swap shots; OUTSIDE the window base-SR shots at normalAttackMultiplier 69.04 and no pierce tagging (override file has no top-level hasPierce:true).",
      "inertness": "Pierce is bucket-eligibility only — with no Pierce Damage ▲ carrier in the comp it must move zero damage; base-weapon shots before/after the window must be untouched.",
      "evidenceTier": "CALIBRATED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Charge Time fixed by Overcurrent stage",
      "disposition": "FAITHFUL",
      "scope": "The swap's chargeTimeSec is selected by the LIVE Overcurrent stage count at cast: ≤1→3.0s, 2→2.5s, 3→2.0s, 4→1.5s, ≥5→0.4s. 'Only one effect is triggered at a time' = a lookup, not additive. 'Charge Time is fixed' also implies charge-speed buffs do NOT shorten it (a clamp).",
      "durationSemantics": "Per-cast snapshot of the stage ladder for that swap window.",
      "triggerIdentity": "Resolved at her burstCast; encodable as resourceGate-banded weaponSwap blocks over an 'overcurrent' pool (or equivalent). Order-of-operations ambiguity: whether the stack gained ON this cast counts for THIS cast's ladder is kit-ambiguous — the driver must pick one and document it.",
      "targetSet": "Self.",
      "nearestWrongModel": "A single fixed 3s charge for the whole fight (massively undercounts late-fight swap shots: 0.4s vs 3.0s charge), or the inverse — 0.4s from the first burst (over-credits early); or the ladder read as additive stacking of the listed times.",
      "distinguishingAssertion": "Inter-shot spacing of swap-window damage events SHRINKS across successive bursts: the interval at her 5th+ burst (0.4s charge + 141f reload) is measurably smaller than at her 1st (3.0s charge + 141f reload), yielding MORE swap shots per window late-fight. Red under any fixed-charge-time model (spacing constant across all bursts).",
      "inertness": "chargeSpeedPct buffs from teammates must NOT alter the fixed times (clamp semantics) — if the engine can't express the clamp, that residue goes in unmodeled/note, not silently.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Atk Dmg ▲25% for 10 sec, all allies",
      "disposition": "FAITHFUL",
      "scope": "Generic Attack Damage (Damage-Up bucket), all allies.",
      "durationSemantics": "durationSec 10, wall-clock.",
      "triggerIdentity": "burstCast (her own burst block) — lands PRE-FB, so the window opens before fullBurstStart and covers the FB.",
      "targetSet": "All allies including self.",
      "nearestWrongModel": "Keyed to fullBurstEnter (window starts ~52f later and would fire on team FBs even in a hypothetical rotation she sat out).",
      "distinguishingAssertion": "attackDamagePct=25 buffApply frame equals Maxwell's burstCast frame (strictly before that rotation's fullBurstStart), once per rotation she bursts.",
      "inertness": "Dilutes additively with the skill1 10% Attack Damage line when windows overlap (same bucket) — the two must be separate buff keys, not merged.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:full-charge Max HP stack (x30)",
    "skill1:stage-3-enter Attack Damage 10%/5s",
    "skill2:burst-cast ATK = 1% caster final Max HP /15s",
    "skill2:burst-cast Overcurrent atkPct 30 x5 self",
    "skill2:full-charge fillGauge 7.15%",
    "burst:weaponSwap UberBuster 350/300, ammo 1, pierce",
    "burst:Overcurrent charge-time ladder 3.0→0.4s",
    "burst:burst-cast Attack Damage 25%/10s"
  ],
  "unmodeledVerbatim": {
    "skill1": [],
    "skill2": [],
    "burst": []
  },
  "notes": "Every line is modelable — expect an EMPTY unmodeled set; anything parked there is a divergence to reconcile. Three couplings are where a shared-prior misread will hide: (1) skill1's SELF Max-HP stacks feed skill2a's 'final max HP' ATK conversion (caster===target self-grant feeds the conversion even though ally grants don't) — the flat ATK grant must GROW across successive burst casts; a model that resolves it off base HP once passes a single-cast test and is wrong. (2) The Overcurrent stack count is a live resource read by the burst charge-time ladder — a test asserting only the atkPct side misses the ladder wiring entirely. (3) UberBuster swap shots ARE Full Charge attacks, so they must keep proccing skill1 stacks and the 7.15% gauge fill — at stage 5 (0.4s charge) this becomes a fast gauge pump; a swap that suppresses full-charge procs silently under-rotates. FIXTURE TRAP (highest risk): Maxwell is Burst II, but controlComp pins crown into the B2 slot — a naive controlComp(maxwell) fixture leaves her never casting, making skill2 AND burst vacuously inert while tests stay green; the fixture must put Maxwell in the actual B2 rotation slot and assert her burstCast events exist (nonzero count) before anything downstream. Also verify the two Attack Damage lines (10% and 25%) stay separate additive keys in the Damage-Up bucket, and that swap-shot economy (kit-silent duration + ammo-1 reload cycle) is carried as ⚑ with the recipe stated.",
  "model": "claude-fable-5"
}
````

## SECTION 5 — S5 BLIND TEST (claude-opus-5) + its green/red count vs the DRIVER override

The S5 blind wrote this per-unit test INDEPENDENTLY from prose alone (no peeking at the driver
override). It was then run against the DRIVER's shipped override. Result: **21 passed | 17 failed |
4 skipped (42 total)**.

DRIVER ANALYSIS OF THE 17 REDS (verified, not asserted): the blind chose `controlComp(SLUG, true)` =
[liter(B1), crown(B2/Defender), mom(B2), helm(B3)], bossElement Fire. mom is Burst II and crown is ALSO
Burst II, so they compete for the single stage-2 slot; crown wins it and mom casts her burst 0 times.
The blind DECLARED this trap verbatim in its test header: "If THOSE [non-vacuity tests] go red, the
fixture — not the model — is the fault, and the burst-keyed groups below are VOID rather than refuted."
Every one of the 17 reds is a burst-keyed group (S2a/S2b/S2c-dynamic/B1-dynamic/B2) whose non-vacuity
check fails first ("expected 0 > 0", "expected 0 > 5", scope "expected +0 to be 4"). They are VOID,
not refuted. The groups that CAN fire are GREEN and corroborate the driver:

- S1a (shotFired): per-full-charge trigger, stack cap 30, all-ally scope, continuous, 1% base HP — GREEN.
- S1b (stageEnter:3): stage-3-entry trigger, lands before FB, all-ally scope, binding 5s window — GREEN.
- B1 STATIC STRUCTURE (reads override shape, needs no burst): swap modeled w/ kit numbers, "the
  Overcurrent charge-time LADDER is modeled: 3/2.5/2/1.5/0.4s", "the ladder is stage-gated on an
  Overcurrent counter, not on time or mode", Pierce swap-scoped — ALL GREEN. The blind INDEPENDENTLY
  derived the resourceGate-banded ladder the driver implemented.
- The single S1a red ("stacked Max HP feeds S2a") is also fixture-driven: S2a is burst-keyed and mom
  never bursts, so deleting S1a changes nothing. The S2a caster-basis gap the blind probes is the
  driver's flag-1 (atkOfMaxHpPct resolves vs target's OWN HP; no caster-HP-stat primitive) — a genuine
  schema limitation, documented not enacted.

```typescript
/**
 * maxwell-ordinary-mechanic — BLIND per-unit kit spec test (S5).
 *
 * Base: SR / Wind / Supporter / Burst II — cd 20s, ammo 6, reload 141f, charge 60f,
 * hitsPerShot 1, normal 69.04%, core 200%. A charge weapon: every trigger pull is a
 * Full Charge attack, so "when performing a Full Charge attack" is a per-shot trigger.
 *
 * WHAT THE KIT SAYS (read literally; each line gets one assertion group below):
 *   S1a  "Full Charge attack" → ALL ALLIES: Max HP ▲ 1% of the SKILL USER's max HP,
 *        "continuously", stacks up to 30.
 *   S1b  "entering Burst Stage 3" → ALL ALLIES: Attack Damage ▲ 10% for 5 sec.
 *   S2a  "using Burst Skill" → ALL ALLIES: ATK ▲ 1% of the SKILL USER's FINAL max HP,
 *        for 15 sec.  ("final" = after S1a's 30 stacks, so the grant GROWS over the fight.)
 *   S2b  "using Burst Skill" → SELF: Overcurrent ATK ▲ 30% "continuously", up to 5 stages.
 *   S2c  "Full Charge attack" → ALL ALLIES: fills Burst Gauge by 7.15%.
 *   B1   SELF weapon swap "Matis UberBuster": 350% of final ATK, Full Charge 300%,
 *        Max Ammunition 1, Additional Effect: Gains Pierce. Charge time is FIXED and
 *        varies with the Overcurrent stage: ≤1 → 3s, 2 → 2.5s, 3 → 2s, 4 → 1.5s, ≥5 → 0.4s.
 *   B2   ALL ALLIES: Attack Damage ▲ 25% for 10 sec.
 *
 * FIXTURE: controlComp(SLUG, true) — liter B1 / crown B2 / helm B3 supply a real burst
 * chain so Full Bursts actually happen (a unit that never sees a B3 cast makes ZERO Full
 * Bursts and every stage-3 / FB-keyed assertion below would be vacuous). Deterministic,
 * no seed.
 *
 * ⚠ FIXTURE CAVEAT (declared up front, not discovered): maxwell-ordinary-mechanic is
 * BURST II and the control comp already contains a Burst II unit (crown), so the two
 * compete for the single stage-2 slot each rotation. Every S2a / S2b / B1 / B2 assertion
 * is keyed to HIS OWN burst cast. The `non-vacuity` test in each of those groups asserts
 * he casts at all (and ≥6 times for the Overcurrent cap). If THOSE go red, the fixture —
 * not the model — is the fault, and the burst-keyed groups below are VOID rather than
 * refuted.
 *
 * IDENTITY WITHOUT INDICES: the comp roster/slot order is not part of the harness API, so
 * maxwell's caster index is recovered encoding-agnostically as the casterIdx of the first
 * buffApply whose targetSlug is his AND whose casterIdx === targetIdx (a self-application —
 * every faithful encoding of this kit produces at least one, since all four of his
 * ally-targeted lines include himself and Overcurrent is self-only).
 *
 * FRAME-FREE DURATION CHECKS: buffApply carries expiresFrame but not the apply frame, and
 * there is NO buffRemove on natural lapse. S2a (15s) and B2 (10s) both fire on the SAME
 * event — his burst cast — so their expiry frames differ by exactly 5s = 300 frames. That
 * difference is asserted directly; it needs no apply frame and it fails under any 15↔10
 * mix-up.
 *
 * SCHEMA-SHAPE TOLERANCE: the packet documents the override file both as slot → Block[]
 * and as slot → { blocks: Block[] }. blocksOf() accepts either, so the counterfactual
 * patches below are shape-agnostic.
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

const SLUG = 'maxwell-ordinary-mechanic';
const FIGHT_FRAMES = 180 * 60;

// ATK-ish stat keys an "ATK ▲ x% of max HP" line could legitimately be emitted under
// (casterAtkPct re-emits flat; atkOfMaxHpPct may emit raw). Kept wide on purpose.
const ATK_STATS = new Set([
  'atkPct',
  'casterAtkPct',
  'atkOfMaxHpPct',
  'highestAllyAtkPct',
]);
// Max-HP grant keys, override-side and event-side (casterMaxHpPct re-emits as maxHpFlat).
const HP_STATS = new Set([
  'casterMaxHpPct',
  'targetMaxHpPct',
  'maxHpPct',
  'maxHpFlat',
]);

interface BuffEv {
  kind: 'buffApply';
  stat: string;
  key?: string;
  value: number;
  stacks?: number;
  maxStacks?: number;
  casterIdx: number | null;
  targetIdx: number | null;
  targetSlug?: string;
  expiresFrame?: number | null;
  durationShots?: number;
}

interface EffLike {
  kind: string;
  stat?: string;
  value?: number;
  durationSec?: number;
  maxStacks?: number;
  pct?: number;
  atkPct?: number;
  damagePct?: number;
  chargeTimeSec?: number;
  chargeMultPct?: number;
  maxAmmo?: number;
  hasPierce?: boolean;
  name?: string;
  delta?: number;
}

interface BlockLike {
  slot?: string;
  trigger?: {
    kind?: string;
    count?: number | number[];
    sec?: number;
    stage?: number;
  };
  target?: { kind?: string; excludeSelf?: boolean; count?: number };
  effects?: EffLike[];
  resourceGate?: { name?: string; min?: number; max?: number };
  mode?: string;
}

type Patch = ReturnType<typeof withPatchedOverride>;

function blocksOf(ov: unknown): { slot: string; block: BlockLike }[] {
  const rec = ov as Record<string, unknown>;
  const out: { slot: string; block: BlockLike }[] = [];
  for (const slot of ['skill1', 'skill2', 'burst']) {
    const v = rec[slot];
    if (!v) continue;
    const arr = Array.isArray(v) ? v : (v as { blocks?: unknown }).blocks;
    if (Array.isArray(arr)) {
      for (const b of arr) out.push({ slot, block: b as BlockLike });
    }
  }
  return out;
}

const effectsOf = (b: BlockLike): EffLike[] =>
  Array.isArray(b.effects) ? b.effects : [];

const allEffects = (ov: unknown, slot?: string): EffLike[] =>
  blocksOf(ov)
    .filter((x) => (slot ? x.slot === slot : true))
    .flatMap((x) => effectsOf(x.block));

function run(overrides?: Record<string, Patch>) {
  const evs: SimEvent[] = [];
  const base = controlComp(SLUG, true) as unknown as Record<string, unknown>;
  const cfg = {
    ...((base.cfg as Record<string, unknown>) ?? {}),
    onEvent: (e: SimEvent) => {
      evs.push(e);
    },
  };
  const opts = { ...base, cfg, ...(overrides ? { overrides } : {}) };
  const res = runComp(opts as Parameters<typeof runComp>[0]);
  return { res, evs };
}

const buffsOf = (evs: SimEvent[]): BuffEv[] =>
  evs.filter((e) => e.kind === 'buffApply') as unknown as BuffEv[];

const countOf = (evs: SimEvent[], kind: string): number =>
  evs.filter((e) => e.kind === kind).length;

/** maxwell's caster index: the first self-application landing on his own slug. */
function selfCasterIdx(evs: SimEvent[]): number | null {
  for (const b of buffsOf(evs)) {
    if (
      b.targetSlug === SLUG &&
      b.casterIdx !== null &&
      b.targetIdx !== null &&
      b.casterIdx === b.targetIdx
    ) {
      return b.casterIdx;
    }
  }
  return null;
}

const permanent = (b: BuffEv): boolean =>
  !(typeof b.expiresFrame === 'number' && b.expiresFrame < FIGHT_FRAMES);

// ── runs (hoisted; each is a full 180s sim) ─────────────────────────────────────
const BASE = run();
const MX = selfCasterIdx(BASE.evs);
const MXB = buffsOf(BASE.evs).filter((b) => MX !== null && b.casterIdx === MX);
const BASE_T = totals(BASE.res);
const TEAMMATES = Object.keys(BASE_T).filter((s) => s !== SLUG);

// S2c counterfactuals
const NO_GAUGE = run({
  [SLUG]: withPatchedOverride(SLUG, (ov) => {
    for (const { block } of blocksOf(ov)) {
      block.effects = effectsOf(block).filter((e) => e.kind !== 'fillGauge');
    }
  }),
});
const GAUGE_SELF = run({
  [SLUG]: withPatchedOverride(SLUG, (ov) => {
    for (const { block } of blocksOf(ov)) {
      if (effectsOf(block).some((e) => e.kind === 'fillGauge')) {
        block.target = { kind: 'self' };
      }
    }
  }),
});
// S1b counterfactual: 5s → 10s
const S1B_LONG = run({
  [SLUG]: withPatchedOverride(SLUG, (ov) => {
    for (const e of allEffects(ov)) {
      if (e.kind === 'buff' && e.stat === 'attackDamagePct' && e.value === 10) {
        e.durationSec = 10;
      }
    }
  }),
});
// S2b counterfactual: Overcurrent cap 5 → 30
const OC_UNCAPPED = run({
  [SLUG]: withPatchedOverride(SLUG, (ov) => {
    for (const e of allEffects(ov)) {
      if (e.kind === 'buff' && e.stat === 'atkPct' && e.value === 30) {
        e.maxStacks = 30;
      }
    }
  }),
});
// S2a counterfactual: the 15s ATK grant scoped to self instead of all allies
const S2A_SELF = run({
  [SLUG]: withPatchedOverride(SLUG, (ov) => {
    for (const { block } of blocksOf(ov)) {
      const hit = effectsOf(block).some(
        (e) =>
          e.kind === 'buff' &&
          ATK_STATS.has(e.stat ?? '') &&
          e.durationSec === 15
      );
      if (hit) block.target = { kind: 'self' };
    }
  }),
});
// B2 counterfactual: the 25%/10s ally buff scoped to self
const B2_SELF = run({
  [SLUG]: withPatchedOverride(SLUG, (ov) => {
    for (const { slot, block } of blocksOf(ov)) {
      if (slot !== 'burst') continue;
      const hit = effectsOf(block).some(
        (e) =>
          e.kind === 'buff' && e.stat === 'attackDamagePct' && e.value === 25
      );
      if (hit) block.target = { kind: 'self' };
    }
  }),
});
// B1 counterfactuals: flatten the Overcurrent charge-time ladder / delete the swap
const FLAT_CHARGE = run({
  [SLUG]: withPatchedOverride(SLUG, (ov) => {
    for (const e of allEffects(ov)) {
      if (e.kind === 'weaponSwap') e.chargeTimeSec = 3;
    }
  }),
});
const NO_SWAP = run({
  [SLUG]: withPatchedOverride(SLUG, (ov) => {
    for (const { slot, block } of blocksOf(ov)) {
      if (slot !== 'burst') continue;
      block.effects = effectsOf(block).filter((e) => e.kind !== 'weaponSwap');
    }
  }),
});
// S1a→S2a coupling counterfactual: delete the Max HP stacks
const NO_HP_STACKS = run({
  [SLUG]: withPatchedOverride(SLUG, (ov) => {
    for (const { slot, block } of blocksOf(ov)) {
      if (slot !== 'skill1') continue;
      block.effects = effectsOf(block).filter(
        (e) => !(e.kind === 'buff' && HP_STATS.has(e.stat ?? ''))
      );
    }
  }),
});

const OV = withPatchedOverride(SLUG, () => {});

describe('maxwell-ordinary-mechanic — fixture sanity', () => {
  it('the control comp actually bursts (stage chain reaches Full Burst)', () => {
    // Every stage-3 / FB-keyed assertion in this file is vacuous without this.
    expect(countOf(BASE.evs, 'fullBurstStart')).toBeGreaterThan(0);
    expect(countOf(BASE.evs, 'burstCast')).toBeGreaterThan(0);
  });

  it('maxwell is identifiable as a caster in the event log', () => {
    expect(MX).not.toBeNull();
    expect(MXB.length).toBeGreaterThan(0);
  });
});

describe("S1a — Full Charge → all allies: Max HP ▲1% of the SKILL USER's max HP, 30 stacks, continuous", () => {
  const hp = MXB.filter((b) => HP_STATS.has(b.stat));

  it('non-vacuity: the line fires (he full-charges repeatedly)', () => {
    expect(hp.length).toBeGreaterThan(0);
  });

  it('trigger is the per-full-charge shot, not passive / FB-enter', () => {
    // A `passive` encoding applies once (stacks stay 1); a fullBurstEnter encoding tops out
    // near the FB count (<10 over 180s). Only a per-shot trigger reaches 30 stacks —
    // ~0.7 charges/s (6 rounds + a 141f reload) caps the stack in roughly 43s.
    expect(hp.length).toBeGreaterThanOrEqual(30);
    expect(Math.max(...hp.map((b) => b.stacks ?? 1))).toBe(30);
  });

  it('stacks are capped at 30 and never exceed it', () => {
    for (const b of hp) {
      expect(b.maxStacks).toBe(30);
      expect(b.stacks ?? 1).toBeLessThanOrEqual(30);
    }
  });

  it('scope is ALL ALLIES, not self-only', () => {
    const targets = new Set(hp.map((b) => b.targetSlug));
    expect(targets.has(SLUG)).toBe(true);
    expect(targets.size).toBe(Object.keys(BASE_T).length);
  });

  it('"continuously" — the grant never expires inside the fight', () => {
    expect(hp.every(permanent)).toBe(true);
    // and it is a time buff, not a round-count buff
    expect(
      hp.every((b) => b.durationShots === undefined || b.durationShots === null)
    ).toBe(true);
  });

  it('each stack is 1% of BASE max HP — the grant does not compound off its own boost', () => {
    // caster-scaled HP re-emits flat at apply time. Under a faithful linear reading every
    // stack contributes the same flat number (+30% at cap). If the flat value is recomputed
    // against an already-boosted max HP the emitted values grow stack-over-stack — a silent
    // 1.01^30 (≈ +35%) over-credit. Per-target, so unequal ally HP pools cannot alias it.
    const mine = hp.filter((b) => b.targetSlug === SLUG).map((b) => b.value);
    expect(mine.length).toBeGreaterThan(1);
    expect(new Set(mine).size).toBe(1);
  });

  it('the stacked Max HP FEEDS the S2a ATK conversion ("final" max HP)', () => {
    // Deleting the stacks must lower team damage. If it does not, the ATK-from-max-HP line
    // is reading BASE max HP and the word "final" is unmodeled.
    const base = Object.values(BASE_T).reduce((a, b) => a + b, 0);
    const cut = Object.values(totals(NO_HP_STACKS.res)).reduce(
      (a, b) => a + b,
      0
    );
    expect(cut).toBeLessThan(base);
  });
});

describe('S1b — entering Burst Stage 3 → all allies: Attack Damage ▲10% for 5 sec', () => {
  const ad10 = MXB.filter(
    (b) => b.stat === 'attackDamagePct' && b.value === 10
  );

  it('non-vacuity: the line fires', () => {
    expect(ad10.length).toBeGreaterThan(0);
  });

  it("trigger is stage-3 ENTRY (any ally's B3 cast), not his own burst cast", () => {
    // He is Burst II — he can never enter stage 3 himself, so a burstCast keying would
    // desynchronise the count from the rotation entirely.
    const fbs = countOf(BASE.evs, 'fullBurstStart');
    const rounds = ad10.length / Object.keys(BASE_T).length;
    expect(Math.round(rounds)).toBe(fbs);
  });

  it('lands BEFORE Full Burst opens, not at FB entry', () => {
    // The measured chain is B3 cast → 22f → Full Burst. A fullBurstEnter keying would put
    // the first application at/after the first fullBurstStart in the (chronological) log.
    const firstBuff = BASE.evs.findIndex(
      (e) =>
        e.kind === 'buffApply' &&
        (e as unknown as BuffEv).casterIdx === MX &&
        (e as unknown as BuffEv).stat === 'attackDamagePct' &&
        (e as unknown as BuffEv).value === 10
    );
    const firstFb = BASE.evs.findIndex((e) => e.kind === 'fullBurstStart');
    expect(firstBuff).toBeGreaterThanOrEqual(0);
    expect(firstFb).toBeGreaterThanOrEqual(0);
    expect(firstBuff).toBeLessThan(firstFb);
  });

  it('scope is ALL ALLIES', () => {
    expect(new Set(ad10.map((b) => b.targetSlug)).size).toBe(
      Object.keys(BASE_T).length
    );
  });

  it('the 5s window is real and binding (not 10s, not permanent)', () => {
    expect(ad10.every((b) => typeof b.expiresFrame === 'number')).toBe(true);
    const base = Object.values(BASE_T).reduce((a, b) => a + b, 0);
    const longer = Object.values(totals(S1B_LONG.res)).reduce(
      (a, b) => a + b,
      0
    );
    // stretching 5s → 10s covers the whole Full Burst window ⇒ strictly more damage
    expect(longer).toBeGreaterThan(base);
  });
});

describe("S2a — his burst → all allies: ATK ▲1% of the SKILL USER's final max HP, 15 sec", () => {
  const atk = MXB.filter(
    (b) => ATK_STATS.has(b.stat) && !(b.stat === 'atkPct' && b.value === 30)
  );
  const allyAtk = atk.filter((b) => b.targetSlug !== SLUG);

  it('non-vacuity: he casts his own burst and the grant lands on allies', () => {
    // If this is red, the Burst-II slot collision with crown starved his cast — fixture
    // fault, and every assertion in this group plus S2b / B1 / B2 is VOID, not refuted.
    expect(allyAtk.length).toBeGreaterThan(0);
  });

  it('scope is ALL ALLIES including self', () => {
    expect(new Set(atk.map((b) => b.targetSlug)).size).toBe(
      Object.keys(BASE_T).length
    );
    const base = Object.values(BASE_T).reduce((a, b) => a + b, 0);
    const selfOnly = Object.values(totals(S2A_SELF.res)).reduce(
      (a, b) => a + b,
      0
    );
    expect(selfOnly).toBeLessThan(base);
  });

  it("the basis is the CASTER's max HP — every ally gets the SAME flat ATK", () => {
    // "1% of the skill user's final max HP". A per-target basis (each ally converting its
    // OWN max HP) is the nearest-wrong model and emits five different values in one
    // dispatch — Attacker/Supporter/Defender HP pools differ.
    const firstRound = atk.slice(0, Object.keys(BASE_T).length);
    expect(firstRound.length).toBe(Object.keys(BASE_T).length);
    expect(new Set(firstRound.map((b) => b.value)).size).toBe(1);
  });

  it('"FINAL" max HP — the grant grows as S1a stacks accrue', () => {
    const mine = atk.filter((b) => b.targetSlug === SLUG).map((b) => b.value);
    expect(mine.length).toBeGreaterThan(1);
    expect(mine[mine.length - 1]).toBeGreaterThan(mine[0]);
  });

  it("the window is 15s — exactly 5s longer than the burst's own 10s ally buff", () => {
    // Both fire on the SAME burst cast, so the expiry-frame gap IS the duration gap.
    const ad25 = MXB.filter(
      (b) => b.stat === 'attackDamagePct' && b.value === 25
    );
    expect(ad25.length).toBeGreaterThan(0);
    const a = atk.find((b) => typeof b.expiresFrame === 'number');
    const d = ad25.find((b) => typeof b.expiresFrame === 'number');
    expect(a).toBeDefined();
    expect(d).toBeDefined();
    expect(
      Math.abs((a!.expiresFrame as number) - (d!.expiresFrame as number) - 300)
    ).toBeLessThanOrEqual(2);
  });
});

describe('S2b — his burst → self: Overcurrent ATK ▲30% continuously, max 5 stages', () => {
  const oc = MXB.filter((b) => b.stat === 'atkPct' && b.value === 30);

  it('non-vacuity: he bursts more than 5 times, so the cap is exercised', () => {
    expect(oc.length).toBeGreaterThan(5);
  });

  it('scope is SELF ONLY — no ally ever receives it', () => {
    expect(new Set(oc.map((b) => b.targetSlug))).toEqual(new Set([SLUG]));
  });

  it('capped at 5 stages', () => {
    for (const b of oc) {
      expect(b.maxStacks).toBe(5);
      expect(b.stacks ?? 1).toBeLessThanOrEqual(5);
    }
    expect(Math.max(...oc.map((b) => b.stacks ?? 1))).toBe(5);
  });

  it('"continuously" — never expires', () => {
    expect(oc.every(permanent)).toBe(true);
  });

  it('the 5-stage cap is binding (an uncapped model over-credits)', () => {
    expect(unitOf(OC_UNCAPPED.res, SLUG).totalDamage).toBeGreaterThan(
      unitOf(BASE.res, SLUG).totalDamage
    );
  });

  it('inertness: a self-ATK change moves nobody else', () => {
    const after = totals(OC_UNCAPPED.res);
    for (const s of TEAMMATES) expect(after[s]).toBe(BASE_T[s]);
  });
});

describe('S2c — Full Charge → Fills Burst Gauge by 7.15%', () => {
  it('the effect exists at 7.15%', () => {
    const fills = allEffects(OV).filter((e) => e.kind === 'fillGauge');
    expect(fills.length).toBeGreaterThan(0);
    expect(fills.some((e) => e.pct === 7.15)).toBe(true);
  });

  it('it materially accelerates the rotation (more Full Bursts than without it)', () => {
    expect(countOf(BASE.evs, 'fullBurstStart')).toBeGreaterThan(
      countOf(NO_GAUGE.evs, 'fullBurstStart')
    );
  });

  it('ONE fill per full charge — "affects all allies" must not multiply by the ally count', () => {
    // The burst gauge is a single team pool. At ~0.7 charges/s a per-target fill would be
    // 5 × 7.15% ≈ 25%/s of gauge — a Full Burst every few seconds, which no fight shows.
    // Retargeting the block to self must therefore change nothing.
    expect(countOf(GAUGE_SELF.evs, 'fullBurstStart')).toBe(
      countOf(BASE.evs, 'fullBurstStart')
    );
  });
});

describe('burst B1 — weapon swap "Matis UberBuster" (350% / FC 300% / 1 ammo / Pierce)', () => {
  const swaps = allEffects(OV, 'burst').filter((e) => e.kind === 'weaponSwap');

  it("the swap is modeled and carries the kit's numbers", () => {
    expect(swaps.length).toBeGreaterThan(0);
    for (const s of swaps) {
      expect(s.damagePct).toBe(350);
      expect(s.chargeMultPct).toBe(300);
      expect(s.maxAmmo).toBe(1);
      expect(typeof s.durationSec).toBe('number');
      expect(s.durationSec as number).toBeGreaterThan(0);
    }
  });

  it('the swap actually fires damage (deleting it costs him damage)', () => {
    expect(unitOf(NO_SWAP.res, SLUG).totalDamage).toBeLessThan(
      unitOf(BASE.res, SLUG).totalDamage
    );
  });

  it('the Overcurrent charge-time LADDER is modeled: 3 / 2.5 / 2 / 1.5 / 0.4 s', () => {
    // Structural, because a single stage-agnostic charge time also passes the behavioural
    // check below. The ladder is the whole point of the burst: at stage 5 the charge time
    // collapses 3s → 0.4s, a ~7× shot-rate swing inside the swap window.
    const times = new Set(
      swaps
        .map((s) => s.chargeTimeSec)
        .filter((t): t is number => typeof t === 'number')
    );
    expect(times).toEqual(new Set([3, 2.5, 2, 1.5, 0.4]));
  });

  it('the ladder is binding — flattening every stage to 3s costs damage', () => {
    expect(unitOf(FLAT_CHARGE.res, SLUG).totalDamage).toBeLessThan(
      unitOf(BASE.res, SLUG).totalDamage
    );
  });

  it('the ladder is stage-gated on an Overcurrent counter, not on time or mode', () => {
    const gated = blocksOf(OV).filter(
      (x) =>
        x.slot === 'burst' &&
        effectsOf(x.block).some((e) => e.kind === 'weaponSwap') &&
        x.block.resourceGate !== undefined
    );
    expect(gated.length).toBeGreaterThanOrEqual(2);
    const pool = new Set(gated.map((x) => x.block.resourceGate?.name));
    expect(pool.size).toBe(1);
  });

  it('Pierce is SWAP-SCOPED, not a whole-fight tag', () => {
    // "Additional Effect: Gains Pierce" sits under the weapon-change block, so it applies
    // only while the UberBuster is out. A top-level hasPierce flag tags all 180s of his
    // base SR fire and over-credits every Pierce Damage ▲ consumer on the team.
    expect((OV as unknown as { hasPierce?: boolean }).hasPierce).not.toBe(true);
    const scoped =
      swaps.some((s) => s.hasPierce === true) ||
      allEffects(OV, 'burst').some((e) => e.kind === 'gainPierce');
    expect(scoped).toBe(true);
  });
});

describe('burst B2 — all allies: Attack Damage ▲25% for 10 sec', () => {
  const ad25 = MXB.filter(
    (b) => b.stat === 'attackDamagePct' && b.value === 25
  );

  it('non-vacuity: it fires on his burst', () => {
    expect(ad25.length).toBeGreaterThan(0);
  });

  it('scope is ALL ALLIES — self-scoping strips every teammate', () => {
    expect(new Set(ad25.map((b) => b.targetSlug)).size).toBe(
      Object.keys(BASE_T).length
    );
    const after = totals(B2_SELF.res);
    for (const s of TEAMMATES) expect(after[s]).toBeLessThan(BASE_T[s]);
  });

  it('applied at his BURST CAST, before Full Burst opens', () => {
    const firstBuff = BASE.evs.findIndex(
      (e) =>
        e.kind === 'buffApply' &&
        (e as unknown as BuffEv).casterIdx === MX &&
        (e as unknown as BuffEv).stat === 'attackDamagePct' &&
        (e as unknown as BuffEv).value === 25
    );
    const firstFb = BASE.evs.findIndex((e) => e.kind === 'fullBurstStart');
    expect(firstBuff).toBeGreaterThanOrEqual(0);
    expect(firstBuff).toBeLessThan(firstFb);
  });

  it('it is a timed 10s window, not permanent', () => {
    expect(ad25.every((b) => typeof b.expiresFrame === 'number')).toBe(true);
  });
});

describe('kit-silent / unrepresentable — declared gaps', () => {
  it.skip("swap window length: the kit states NO duration for the UberBuster (⚑ estimate = the 10s Full Burst window, matching the burst's own 10s ally buff) — measurement-gated, no assertion", () => {});

  it.skip('swap shot economy: "Max Ammunition Capacity: 1" means a reload between every shot, and the kit is silent on the swap weapon\'s reload time (⚑). At a 0.4s stage-5 charge the reload, not the charge time, dominates the shot rate — the ladder\'s real value cannot be pinned from prose', () => {});

  it.skip('"Charge Time is FIXED": the value is a CLAMP that charge-speed buffs must not move. The schema has chargeSpeedPct but no clamp primitive, so a chargeSpeedPct support would illegally shorten it', () => {});

  it.skip('S2a basis: no StatKey expresses "ATK = x% of the CASTER\'s max HP granted to allies" (atkOfMaxHpPct is documented as the target\'s OWN max HP). The caster-basis equality test above is the live probe for this gap', () => {});
});
```

---

## SECTION 6 — S6 BLIND OVERRIDE (claude-opus-5) + a short diff vs the DRIVER override

The S6 blind rebuilt the override INDEPENDENTLY from prose alone. Its audit converged with the driver
on 7 of 8 lines; on the 8th (the charge-time ladder) it SKIPPED it as a single-value approximation
(chargeTimeSec 2 = stage 3), flagged it as "the single largest modeling error in the override", and
prescribed EXACTLY the recipe the driver implemented: "request a stage-gated weaponSwap (a resourceGate
on an Overcurrent resource pool with one swap block per rung) so the ladder can be expressed faithfully."
The blind did not know the laplace-ultimate-hero multi-band pattern (weaponSwap carries one chargeTimeSec
PER BLOCK, but you can band MULTIPLE swap blocks by resourceGate); the driver did, and enacted it. So the
driver's re-opened S3 ladder is independently validated by BOTH blinds (S5 derived it via resourceGate;
S6 prescribed the resourceGate recipe).

Line-by-line diff (blind → driver):

- S1a Max HP x30: blind = casterMaxHpPct 1 maxStacks 30 allies continuous (+rampSec 60 ⚑ estimate);
  driver = casterMaxHpPct 1 maxStacks 30 allies continuous (instant stacking, no ramp — kit says only
  'stacks up to 30', no ramp). CONVERGED (ramp is a cadence ⚑, not a magnitude).
- S1b stage-3 AD 10%/5s: blind = stageEnter:3 attackDamagePct 10 /5s allies; driver = IDENTICAL. CONVERGED.
- S2a ATK 1% caster final HP /15s: blind = casterAtkPct 1 PLACEHOLDER, explicitly flagged magnitude-wrong
  ('the schema exposes only self-scoped atkOfMaxHpPct'); driver = atkOfMaxHpPct 1 /15s allies (exact for
  self, approx for allies = flag-1). CONVERGED on the gap; driver used the better available primitive.
- S2b Overcurrent atkPct 30 x5 self continuous: blind = atkPct 30 maxStacks 5 self continuous burstCast;
  driver = IDENTICAL (+ a parallel 'overcurrent' resource pool the ladder reads). CONVERGED.
- S2c gauge 7.15%: blind = fillGauge 7.15 override block on shotFired; driver = data/gauge-per-shot.json
  flatPerTrigger 715 (helm convention — the gauge pipeline emits no event). CONVERGED on the value;
  different encoding convention.
- burst swap 350/FC300/ammo1/Pierce: blind = weaponSwap damagePct 350 chargeMultPct 300 maxAmmo 1
  hasPierce (swap-scoped); driver = IDENTICAL. CONVERGED.
- burst charge-time ladder: blind = SKIPPED, single chargeTimeSec 2 (stage-3 approx), flagged largest
  error, prescribed resourceGate recipe; driver = MODELED as 5 resourceGate-banded weaponSwap blocks
  (max:1→3s, 2→2.5s, 3→2s, 4→1.5s, min:5→0.4s) on the 'overcurrent' pool. DRIVER WENT FURTHER, matching
  the blind's prescribed recipe.
- burst B2 AD 25%/10s: blind = attackDamagePct 25 /10s allies burstCast; driver = IDENTICAL. CONVERGED.

```json
{
  "slug": "maxwell-ordinary-mechanic",
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "shotFired"
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "casterMaxHpPct",
          "value": 1,
          "maxStacks": 30,
          "rampSec": 60
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "stageEnter",
        "stage": 3
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 10,
          "durationSec": 5
        }
      ]
    }
  ],
  "skill2": [
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
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 1,
          "durationSec": 15
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "burstCast"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 30,
          "maxStacks": 5
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "shotFired"
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "fillGauge",
          "pct": 7.15
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
          "kind": "weaponSwap",
          "damagePct": 350,
          "chargeMultPct": 300,
          "chargeTimeSec": 2,
          "maxAmmo": 1,
          "hasPierce": true,
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
      "effects": [
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 25,
          "durationSec": 10
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [],
    "skill2": [],
    "burst": [
      "Charge Time is fixed. Effect varies according to the stage of Overcurrent. Only one effect is triggered at a time.",
      "Stage 1 or below: Fixed at 3 sec.",
      "Stage 2: Fixed at 2.5 sec.",
      "Stage 4: Fixed at 1.5 sec.",
      "Stage 5 or above: Fixed at 0.4 sec."
    ]
  },
  "caveats": [
    "⚑ skill1a/skill2c trigger is 'performing a Full Charge attack' — the engine has no fullCharge trigger kind; encoded as shotFired, which for this charge weapon (chargeFrames 60, ammo 6) is one trigger pull ≈ one full charge IF the player always full-charges. If the sim models partial-charge shots, shotFired OVER-fires both the HP stack ramp and the 7.15% gauge fill.",
    "⚑ skill1a Max HP stack (1% of user's max HP ×30) is ally-granted Max HP — offensively inert per the e3 ally-grant rule except on self; kept for completeness and for any future HP-scaling consumer. rampSec 60 is an UNMEASURED estimate of the time to reach 30 stacks.",
    "⚑ skill2b Overcurrent ATK ▲30% 'Up to 5 stages' is authored at per-stage value 30 with maxStacks 5 on a burstCast trigger — one stage per own-burst cast, so it ramps 30/60/90/120/150% across the fight. Whether a stage is gained per burst cast (the literal read) or by some other economy is kit-silent.",
    "⚑ burst weaponSwap charge time is Overcurrent-stage dependent (3.0/2.5/2.0/1.5/0.4 s). The engine's weaponSwap has ONE chargeTimeSec; 2.0 s (stage 3) is a mid-fight estimate, not a measured value. Whichever single value is chosen mis-models the early and late fight in opposite directions.",
    "⚑ burst weaponSwap durationSec 10 and shot economy are kit-silent (the kit states no swap duration). 10 s = the Full Burst window, an optimistic estimate; maxAmmo 1 means the swap reloads (141 base reloadFrames) between each shot, so the real shot count is likely 1-3.",
    "⚑ 'Damage: 350% of final ATK / Full Charge Damage: 300%' is read as damagePct 350 with chargeMultPct 300 (the full-charge multiplier applied to the shot). An alternative read is 300% being an absolute replacement rather than a multiplier."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Maxwell: Ordinary Mechanic is a Wind/SR/Supporter Burst II charge unit whose value is (a) a team gauge pump on every full charge, (b) an HP-scaled team ATK grant on her own burst, (c) a self ATK ramp (Overcurrent) that also shortens her burst weapon's charge time, and (d) a burst weapon swap with Pierce plus a 25%/10s team Attack Damage buff. The two load-bearing unknowns are the full-charge trigger fidelity (encoded as shotFired) and the Overcurrent-stage-dependent charge time, which the single-valued weaponSwap primitive cannot express."
}
```

---

## SECTION 7 — THE DRIVER'S IMPLEMENTATION UNDER REVIEW

### 7a. driver per-unit test (scripts/tests/units/maxwell-ordinary-mechanic.test.ts) — 24 passed | 1 skipped

```typescript
// PER-UNIT KIT SPEC — `maxwell-ordinary-mechanic` (Maxwell: Ordinary Mechanic, aka "mom";
// Supporter/SR/Wind, Burst II, cd 20s, ammo 6, chargeFrames 60). Kit-autonomy gauntlet
// 2026-07-31; from-scratch MODEL_ONLY build (no recording — simSupported was false).
//
// One assertion group per KIT LINE (M1..M7 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters['maxwell-ordinary-mechanic'].skills,
// level-10 datamined values):
//   S1 ■ Full Charge attack → all allies: Max HP ▲ 1% of the skill user's max HP, continuously,
//                                                stacks up to 30                              [M1]
//      ■ entering Burst Stage 3 → all allies: Attack Damage ▲ 10% for 5 sec                   [M2]
//   S2 ■ Burst Skill → all allies: ATK ▲ 1% of the skill user's final max HP for 15 sec       [M3]
//      ■ Burst Skill → self: Overcurrent: ATK ▲ 30% continuously, up to 5 stages              [M4]
//      ■ Full Charge attack → all allies: Fills Burst Gauge by 7.15%                          [M5]
//   BU ■ self: changes the weapon in use (Matis UberBuster): Damage 350% of final ATK,
//                  Full Charge Damage 300%, Max Ammunition 1, Gains Pierce,
//                  charge time fixed by Overcurrent stage (3/2.5/2/1.5/0.4 sec)               [M6]
//      ■ all allies: Attack Damage ▲ 25% for 10 sec                                           [M7]
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   M1  casterMaxHpPct arrives as a flat maxHpFlat grant keyed to the CASTER. Proven by value
//       (== 1% of mom's final Max HP), the stack cap (maxes at 30 despite ~68 full-charge shots,
//       so it is capped — not unlimited, not 1), the all-ally scope, the shotFired cadence (one
//       application per shot per ally) and the continuous (no-expiry) duration. Ally-granted Max
//       HP is offensively inert by the cindy e3 rule, so the line's only damage path is mom's OWN
//       stacks feeding her own M3 atkOfMaxHpPct — the buff-application signature is the pin.
//   M2  stageEnter:3, NOT burstCast: the value-10 buff fires EXACTLY on the B3 caster's (ada's)
//       cast frames, which are distinct from mom's own B2 cast frames. A burstCast-keyed model
//       fires on mom's frames — the frame-set equality is the discriminator.
//   M3  the stat IS atkOfMaxHpPct (ATK from Max HP), not atkPct/casterAtkPct; burstCast-keyed
//       (fires on mom's B2 frames), all-ally scope, 15 sec.
//   M4  Overcurrent: self-ONLY scope (targetIdx === mom, no ally shares it), stack cap 5 (maxes
//       at 5 despite ~10 burst casts), continuous (no expiry), one stack per burst cast.
//   M5  gauge generation is carried by data/gauge-per-shot.json (helm-H3 precedent), NOT an
//       override block — the gauge pipeline emits no event, so it is pinned by reading the data
//       file. 7.15% → flatPerTrigger 715.
//   M6  the weapon swap shows up in the NORMAL bucket (the swap replaces the normal weapon): swap
//       shots carry atkPct 350 and mult.charge 3.0 (the 300% full-charge multiplier), base shots
//       carry 69.04 / 2.5. Presence + 350 + 300%-charge are pinned (these are constant across all
//       five Overcurrent bands). maxAmmo 1 / Pierce are inert/unpinnable in a single-target
//       no-Pierce-Up comp. The swap is now FIVE resourceGate-banded blocks (one per Overcurrent
//       stage), so the counterfactual helpers patch EVERY band.
//   M7  burstCast-keyed (mom's B2 frames), value 25 (≠ M2's 10), 10 sec (600 frames ≠ M2's 300),
//       all-ally scope.
//   M8  the swap's CHARGE TIME is fixed by the live Overcurrent stage (Stage 1 or below 3s / 2 2.5s
//       / 3 2s / 4 1.5s / 5 or above 0.4s) — encoded as five resourceGate-banded weaponSwap blocks
//       reading the 'overcurrent' resource pool that S2-B increments per cast (the laplace
//       oeStage exemplar). Slot order skill2→burst means the stack gained on cast N counts for
//       cast N's ladder, so the swap cadence ACCELERATES across the first five bursts. Pinned by
//       (a) the ladder out-shooting a fixed-3s counterfactual over the fight and (b) a late-fight
//       burst window (stage 5, 0.4s) out-shooting the first (stage 1, 3s). Red under any
//       fixed-charge-time model (constant spacing). This line was parked as a 'missing primitive'
//       in the first S3 pass; the S2b blind reviewer derived it as encodable and the engine verify
//       confirmed resourceGate exists — re-opened and modeled (faithful > fit).
//
// Fixture: liter (B1) / mom (B2) / ada (B3), boss Iron (Wind-advantaged for mom), focus mom. A
// minimal B1/B2/B3 chain so mom casts her burst (≈10× in 180s) AND a B3 casts (ada, cd 40 → 5×)
// to exercise the stageEnter:3 line. Deterministic (no seed). mom is slot 1 → casterIdx 1.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, unitOf, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const SLUG = 'maxwell-ordinary-mechanic';
const MOM = 1; // fixture slot order: liter 0 / mom 1 / ada 2

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: ['liter', SLUG, 'ada'],
    bossElement: 'Iron',
    focusSlug: SLUG,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, res };
}

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
/** mom's own buff applications (casterIdx === MOM), optionally by stat + value. */
const momBuffs = (evs: SimEvent[], stat: string, value?: number) =>
  buffs(evs).filter(
    (b) =>
      b.casterIdx === MOM &&
      b.stat === stat &&
      (value === undefined || b.value === value)
  );
const distinctFrames = (bs: BuffApply[]) =>
  [...new Set(bs.map((b) => b.frame))].sort((a, b) => a - b);
const burstFrames = (evs: SimEvent[], slug: string) =>
  evs
    .filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === slug)
    .map((e) => e.frame)
    .sort((a, b) => a - b);
const momShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === SLUG);
const momDamage = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage' && e.slug === SLUG);
/** Swap shots: normal-bucket hits at the swap's 350% multiplier (base SR shots are 69.04%). */
const swapShots = (evs: SimEvent[]) =>
  momDamage(evs).filter((d) => Math.round(d.atkPct) === 350);

// ---- counterfactual patches (nearest-wrong models) -------------------------------------------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);

/** M1 reference: S1-A Max-HP stack line removed. */
const momNoS1A = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'casterMaxHpPct'));
  if (ov.skill1.length === before) {
    throw new Error('mom S1-A casterMaxHpPct block missing — fixture is stale');
  }
});
/** M2 counterfactual: S1-B re-keyed from stageEnter:3 to mom's OWN burstCast. */
const momS1BOnBurstCast = withPatchedOverride(SLUG, (ov) => {
  const b = ov.skill1.find((x: any) => x.trigger.kind === 'stageEnter');
  if (!b) {
    throw new Error('mom S1-B stageEnter block missing — fixture is stale');
  }
  b.trigger = { kind: 'burstCast' };
});
/** M3 reference: S2-A ATK-from-HP line removed. */
const momNoS2A = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasStat(b, 'atkOfMaxHpPct'));
  if (ov.skill2.length === before) {
    throw new Error('mom S2-A atkOfMaxHpPct block missing — fixture is stale');
  }
});
/** M4 reference: S2-B Overcurrent line removed. */
const momNoS2B = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) => !(b.target.kind === 'self' && hasStat(b, 'atkPct'))
  );
  if (ov.skill2.length === before) {
    throw new Error('mom S2-B self atkPct block missing — fixture is stale');
  }
});
/** M4 counterfactual: Overcurrent re-scoped from self to ALL allies. */
const momS2BAllies = withPatchedOverride(SLUG, (ov) => {
  const b = ov.skill2.find(
    (x: any) => x.target.kind === 'self' && hasStat(x, 'atkPct')
  );
  if (!b) {
    throw new Error('mom S2-B self atkPct block missing — fixture is stale');
  }
  b.target = { kind: 'allies' };
});
/** All weaponSwap effects across the (now resourceGate-banded) burst blocks. */
const swapsOf = (ov: any) => {
  const swaps = ov.burst.flatMap((b: any) =>
    b.effects.filter((e: any) => e.kind === 'weaponSwap')
  );
  if (swaps.length === 0) {
    throw new Error('mom burst weaponSwap block missing — fixture is stale');
  }
  return swaps;
};
/** M6 reference: the weapon swap removed entirely (every band). */
const momNoSwap = withPatchedOverride(SLUG, (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'weaponSwap')
  );
  if (ov.burst.length === before) {
    throw new Error('mom burst weaponSwap block missing — fixture is stale');
  }
});
/** M6 counterfactual: swap damage halved (175% instead of 350%) on EVERY band. */
const momSwap175 = withPatchedOverride(SLUG, (ov) => {
  swapsOf(ov).forEach((e: any) => (e.damagePct = 175));
});
/** M6 counterfactual: swap full-charge multiplier 100% instead of 300% on EVERY band. */
const momSwapCharge100 = withPatchedOverride(SLUG, (ov) => {
  swapsOf(ov).forEach((e: any) => (e.chargeMultPct = 100));
});
/** M8 counterfactual: the Overcurrent charge-time ladder collapsed to a FIXED 3s charge — the
 *  nearest-wrong model (the pre-gauntlet encoding). The 'overcurrent' resource still tracks the
 *  stage (S2-B is untouched) but the single swap block ignores it and always charges 3s, so the
 *  cadence never accelerates. */
const momFixed3sCharge = withPatchedOverride(SLUG, (ov) => {
  ov.burst = ov.burst.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'weaponSwap')
  );
  ov.burst.push({
    slot: 'burst',
    trigger: { kind: 'burstCast' },
    target: { kind: 'self' },
    effects: [
      {
        kind: 'weaponSwap',
        damagePct: 350,
        chargeTimeSec: 3,
        chargeMultPct: 300,
        maxAmmo: 1,
        hasPierce: true,
        durationSec: 10,
      },
    ],
  });
});
/** M7 reference: the burst team Attack Damage buff removed. */
const momNoBurstBuff = withPatchedOverride(SLUG, (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !hasStat(b, 'attackDamagePct'));
  if (ov.burst.length === before) {
    throw new Error(
      'mom burst attackDamagePct block missing — fixture is stale'
    );
  }
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noS1A = run({ [SLUG]: momNoS1A });
const s1BOnBurstCast = run({ [SLUG]: momS1BOnBurstCast });
const noS2A = run({ [SLUG]: momNoS2A });
const noS2B = run({ [SLUG]: momNoS2B });
const s2BAllies = run({ [SLUG]: momS2BAllies });
const noSwap = run({ [SLUG]: momNoSwap });
const swap175 = run({ [SLUG]: momSwap175 });
const swapCharge100 = run({ [SLUG]: momSwapCharge100 });
const fixed3sCharge = run({ [SLUG]: momFixed3sCharge });
const noBurstBuff = run({ [SLUG]: momNoBurstBuff });

const momMaxHp = unitOf(base.res, SLUG).maxHp;
const adaFrames = burstFrames(base.events, 'ada');
const momFrames = burstFrames(base.events, SLUG);

describe('maxwell-ordinary-mechanic — kit spec', () => {
  describe('M1 — S1 Full Charge grants all allies Max HP ▲ 1% of the user Max HP, stack 30, continuous', () => {
    const applied = momBuffs(base.events, 'maxHpFlat');

    it('is a flat grant of exactly 1% of mom final Max HP, to all three allies', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([
        (1 / 100) * momMaxHp,
      ]);
      expect([...new Set(applied.map((b) => b.targetIdx))].sort()).toEqual([
        0, 1, 2,
      ]);
    });

    it('caps at 30 stacks (not unlimited, not 1) despite far more than 30 full-charge shots', () => {
      const stacks = applied.map((b) => b.stacks);
      expect(Math.max(...stacks)).toBe(30);
      expect([...new Set(applied.map((b) => b.maxStacks))]).toEqual([30]);
      // ~68 shots in the fight → uncapped would reach ~68; the cap is what holds it at 30.
      expect(momShots(base.events).length).toBeGreaterThan(30);
    });

    it('is continuous (no wall-clock expiry) and fires on the shotFired cadence (one per shot per ally)', () => {
      expect([...new Set(applied.map((b) => b.expiresFrame))]).toEqual([null]);
      // each full-charge shot applies to all 3 allies → applications == shots × 3.
      expect(applied.length).toBe(momShots(base.events).length * 3);
    });

    it('DISCRIMINATING: removing the line strips every mom maxHpFlat grant', () => {
      expect(momBuffs(noS1A.events, 'maxHpFlat').length).toBe(0);
    });
  });

  describe('M2 — S1 entering Burst Stage 3 grants all allies Attack Damage ▲ 10% for 5 sec', () => {
    const applied = momBuffs(base.events, 'attackDamagePct', 10);

    it('fires EXACTLY on the B3 (ada) cast frames — stageEnter:3, not mom own-burstCast', () => {
      expect(adaFrames.length).toBeGreaterThan(0);
      expect(distinctFrames(applied)).toEqual(adaFrames);
      // …which are distinct from mom's own B2 cast frames.
      expect(distinctFrames(applied)).not.toEqual(momFrames);
    });

    it('reaches all three allies for 5 sec (300 frames)', () => {
      expect([...new Set(applied.map((b) => b.targetIdx))].sort()).toEqual([
        0, 1, 2,
      ]);
      expect([
        ...new Set(applied.map((b) => b.expiresFrame! - b.frame)),
      ]).toEqual([5 * FPS]);
    });

    it('DISCRIMINATING: re-keyed to mom own-burstCast, it fires on mom B2 frames instead', () => {
      const wrong = momBuffs(s1BOnBurstCast.events, 'attackDamagePct', 10);
      expect(distinctFrames(wrong)).toEqual(momFrames);
      expect(distinctFrames(wrong)).not.toEqual(adaFrames);
    });
  });

  describe('M3 — S2 Burst Skill grants all allies ATK ▲ 1% of final Max HP for 15 sec', () => {
    const applied = momBuffs(base.events, 'atkOfMaxHpPct', 1);

    it('is the HP-scaling ATK stat (atkOfMaxHpPct), burstCast-keyed, all allies, 15 sec', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect(distinctFrames(applied)).toEqual(momFrames);
      expect([...new Set(applied.map((b) => b.targetIdx))].sort()).toEqual([
        0, 1, 2,
      ]);
      expect([
        ...new Set(applied.map((b) => b.expiresFrame! - b.frame)),
      ]).toEqual([15 * FPS]);
    });

    it('DISCRIMINATING: removing the line strips every atkOfMaxHpPct grant', () => {
      expect(momBuffs(noS2A.events, 'atkOfMaxHpPct').length).toBe(0);
    });
  });

  describe('M4 — S2 Burst Skill grants SELF Overcurrent: ATK ▲ 30% continuously, up to 5 stages', () => {
    const applied = momBuffs(base.events, 'atkPct', 30);

    it('is self-only (no ally shares the Overcurrent stack budget)', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([MOM]);
    });

    it('caps at 5 stacks despite ~10 burst casts, and is continuous (no expiry)', () => {
      expect(Math.max(...applied.map((b) => b.stacks))).toBe(5);
      expect([...new Set(applied.map((b) => b.maxStacks))]).toEqual([5]);
      expect(momFrames.length).toBeGreaterThan(5);
      expect([...new Set(applied.map((b) => b.expiresFrame))]).toEqual([null]);
      // one stack accrues per burst cast.
      expect(distinctFrames(applied)).toEqual(momFrames);
    });

    it('DISCRIMINATING (presence): removing the line strips the self atkPct grant', () => {
      expect(momBuffs(noS2B.events, 'atkPct', 30).length).toBe(0);
    });

    it('DISCRIMINATING (scope): re-scoped to allies, it lands on allies 0 and 2 too', () => {
      const wrong = momBuffs(s2BAllies.events, 'atkPct', 30);
      expect([...new Set(wrong.map((b) => b.targetIdx))].sort()).toEqual([
        0, 1, 2,
      ]);
    });
  });

  describe('M5 — S2 Full Charge fills Burst Gauge by 7.15% (gauge data, not an override block)', () => {
    it('is the datamined flat per-trigger term flatPerTrigger 715', () => {
      const gauge = JSON.parse(
        readFileSync(
          new URL('../../../data/gauge-per-shot.json', import.meta.url),
          'utf8'
        )
      );
      expect(
        gauge['maxwell-ordinary-mechanic'].flatPerTrigger,
        'kit 7.15% → flatPerTrigger 715'
      ).toBe(715);
    });

    it.skip('is unscaled by camera focus and suppressed during FB/chain — the gauge pipeline emits no event (helm-H3 gap)', () => {
      // Not assertable from the event log today; pinned by the data-file read above.
    });
  });

  describe('M6 — Burst changes the weapon (Matis UberBuster): 350% final ATK, 300% full charge, Pierce', () => {
    it('produces swap shots in the normal bucket at 350% with a ×3.0 full-charge multiplier', () => {
      const shots = swapShots(base.events);
      expect(shots.length).toBeGreaterThan(0);
      expect([...new Set(shots.map((d) => d.atkPct))]).toEqual([350]);
      expect([...new Set(shots.map((d) => d.mult.charge))]).toEqual([3]);
      expect([...new Set(shots.map((d) => d.bucket))]).toEqual(['normal']);
    });

    it('base (non-swap) SR shots stay at 69.04% / ×2.5 charge', () => {
      const baseShots = momDamage(base.events).filter(
        (d) => Math.abs(d.atkPct - 69.04) < 0.01
      );
      expect(baseShots.length).toBeGreaterThan(0);
      expect([...new Set(baseShots.map((d) => d.mult.charge))]).toEqual([2.5]);
    });

    it('DISCRIMINATING (presence): removing the swap leaves only 69.04% base shots', () => {
      expect(swapShots(noSwap.events).length).toBe(0);
    });

    it('DISCRIMINATING (damage): a 175% swap produces no 350% shots', () => {
      expect(swapShots(swap175.events).length).toBe(0);
      expect(
        momDamage(swap175.events).filter((d) => Math.round(d.atkPct) === 175)
          .length
      ).toBeGreaterThan(0);
    });

    it('DISCRIMINATING (full charge): a 100% full-charge swap drops mult.charge to 1.0', () => {
      const shots = swapShots(swapCharge100.events);
      expect(shots.length).toBeGreaterThan(0);
      expect([...new Set(shots.map((d) => d.mult.charge))]).toEqual([1]);
    });
  });

  describe('M7 — Burst grants all allies Attack Damage ▲ 25% for 10 sec', () => {
    const applied = momBuffs(base.events, 'attackDamagePct', 25);

    it('is burstCast-keyed (mom B2 frames), value 25, all allies, 10 sec (600 frames)', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect(distinctFrames(applied)).toEqual(momFrames);
      expect([...new Set(applied.map((b) => b.targetIdx))].sort()).toEqual([
        0, 1, 2,
      ]);
      expect([
        ...new Set(applied.map((b) => b.expiresFrame! - b.frame)),
      ]).toEqual([10 * FPS]);
    });

    it('DISCRIMINATING: removing the burst buff strips the value-25 grant (M2 value-10 remains)', () => {
      expect(momBuffs(noBurstBuff.events, 'attackDamagePct', 25).length).toBe(
        0
      );
      expect(
        momBuffs(noBurstBuff.events, 'attackDamagePct', 10).length
      ).toBeGreaterThan(0);
    });
  });

  describe('M8 — Burst swap charge time is fixed by the Overcurrent stage (3/2.5/2/1.5/0.4s ladder)', () => {
    const swapShotFrames = (evs: SimEvent[]) =>
      swapShots(evs)
        .map((d) => d.frame)
        .sort((a, b) => a - b);
    /** 350% swap shots landing inside the 10s (600f) window opening at a burst-cast frame. */
    const shotsInWindow = (frames: number[], start: number) =>
      frames.filter((f) => f >= start && f < start + 10 * FPS).length;

    it('accelerates the cadence: the ladder out-shoots a fixed-3s charge over the fight', () => {
      const ladder = swapShotFrames(base.events);
      const fixed = swapShotFrames(fixed3sCharge.events);
      expect(ladder.length).toBeGreaterThan(0);
      expect(fixed.length).toBeGreaterThan(0);
      // late-fight bursts (stage 5, 0.4s charge) land far more shots per 10s window than the
      // first burst (stage 1, 3s charge); summed over the fight the ladder beats the fixed model.
      expect(ladder.length).toBeGreaterThan(fixed.length);
    });

    it('a late-fight burst window (stage 5, 0.4s) out-shots the first (stage 1, 3s)', () => {
      expect(momFrames.length).toBeGreaterThanOrEqual(5);
      const frames = swapShotFrames(base.events);
      const first = shotsInWindow(frames, momFrames[0]);
      const fifth = shotsInWindow(frames, momFrames[4]);
      expect(first).toBeGreaterThan(0);
      expect(fifth).toBeGreaterThan(first);
    });

    it('DISCRIMINATING: under a fixed-3s charge the per-window count stays flat (no acceleration)', () => {
      // bucket against the FIXED run's OWN burst frames — burst timing differs between the two
      // runs (the ladder changes the sim dynamics), so the ladder-run windows would misalign.
      const fixedFrames = burstFrames(fixed3sCharge.events, SLUG);
      expect(fixedFrames.length).toBeGreaterThanOrEqual(5);
      const frames = swapShotFrames(fixed3sCharge.events);
      const first = shotsInWindow(frames, fixedFrames[0]);
      const fifth = shotsInWindow(frames, fixedFrames[4]);
      expect(first).toBeGreaterThan(0);
      // fixed charge => identical economy every window; the ladder's fifth-window lift is gone.
      expect(fifth).toBe(first);
    });
  });
});
```

### 7b. driver override (src/skills/overrides/maxwell-ordinary-mechanic.json)

```json
{
  "note": "Maxwell: Ordinary Mechanic (aka mom) — SR/Supporter/Wind/Burst II variant of the SR/Iron base counterpart; from-scratch MODEL_ONLY build (no recording). Whole kit modeled line-by-line at level-10 datamined values. S1-A 'Full Charge -> all allies Max HP up 1% of the skill user's max HP, stack 30, continuous' = shotFired (every SR trigger pull IS a full charge) -> allies casterMaxHpPct 1% maxStacks 30 (no duration = continuous); the engine converts casterMaxHpPct to a flat maxHpFlat grant keyed to the caster. Ally-granted Max HP is OFFENSIVELY INERT by the cindy e3 video rule (a teammate's granted Max HP does not feed their own atkOfMaxHpPct conversion), so S1-A's only damage path is MAXWELL HERSELF: her own stacks feed her own S2-A atkOfMaxHpPct (caster===target is the one case the e3 rule admits). S1-B 'entering Burst Stage 3 -> all allies Attack Damage up 10% for 5 sec' = stageEnter:3 (fires when any B3 casts = the chain reaches stage 3) -> allies attackDamagePct 10% /5s. S2-A 'Burst Skill -> all allies ATK up 1% of the skill user's final max HP for 15 sec' = burstCast -> allies atkOfMaxHpPct 1% /15s. S2-B 'Burst Skill -> self Overcurrent: ATK up 30% continuously, up to 5 stages' = burstCast -> self atkPct 30% maxStacks 5 (no duration = continuous) PLUS a parallel live resource pool 'overcurrent' (cap 5) incremented on the same cast: the atkPct buff is the observable ATK effect, the resource is the stage tracker the burst weapon's charge-time ladder reads (below). S2-C 'Full Charge -> all allies Fills Burst Gauge by 7.15%' = datamined gauge generation, carried by data/gauge-per-shot.json flatPerTrigger 715 (NOT an override block — same convention as helm S2; the gauge pipeline emits no event so it is pinned by reading the data file, not the log). Burst-A 'self: changes the weapon in use Matis UberBuster; Damage 350% of final ATK; Full Charge Damage 300%; Max Ammunition Capacity 1; Gains Pierce; Charge Time fixed by the stage of Overcurrent (Stage 1 or below 3s / 2 2.5s / 3 2s / 4 1.5s / 5 or above 0.4s)' = burstCast -> self weaponSwap damagePct 350 / chargeMultPct 300 / maxAmmo 1 / hasPierce / durationSec 10, with the charge time SELECTED PER CAST from the live Overcurrent stage via FIVE resourceGate-banded weaponSwap blocks (the laplace-ultimate-hero oeStage exemplar): band max:1 -> chargeTimeSec 3, band 2 -> 2.5, band 3 -> 2, band 4 -> 1.5, band min:5 -> 0.4. The bands are mutually exclusive so exactly one swap fires per cast. ORDER-OF-OPERATIONS (deterministic from the engine's slot order skill1->skill2->burst, skills/index.ts SLOTS flatMap): the skill2 Overcurrent stack-gain dispatches BEFORE the burst swap blocks at the same burstCast frame, so the resourceGate reads the POST-increment pool — the stage gained on cast N counts for cast N's ladder (cast 1 -> stage 1 -> 3s ... cast 5 -> stage 5 -> 0.4s, held at 0.4s thereafter). This is the kit-natural reading of 'Effect varies according to the stage of Overcurrent'; the inverse (pre-increment) reading would lag the ladder one cast and is kit-ambiguous, documented not enacted. 'Charge Time is fixed' (charge-speed buffs do not shorten it) falls out for free: the swap's chargeFrames is a fixed per-band constant, never scaled by chargeSpeedPct. Burst-B 'all allies Attack Damage up 25% for 10 sec' = burstCast -> allies attackDamagePct 25% /10s. --- FLAGS (honest residuals, all MODEL_ONLY) --- [flag-1] S2-A CASTER-vs-OWN Max HP scaling: the kit reads 'ATK up 1% of the SKILL USER'S final max HP' (caster-scaled, a flat ATK add equal for every ally), but the only ATK-from-HP primitive (atkOfMaxHpPct) resolves against each TARGET'S OWN final max HP (src/engine/sim.ts effectiveAtk). Exact for Maxwell herself (self === caster); for allies it substitutes their own Max HP for the caster's. estimate = per-ally ATK error = 1% x (allyMaxHp - casterMaxHp), second-order (Max HP is broadly gear-correlated across a tuned team); does NOT change Maxwell's own damage. recipe = focus popup-read an ally's ATK-buff magnitude next to Maxwell's Max HP in a recorded comp to confirm caster- vs own-scaling. tier = MODEL_ONLY (no measurement). [flag-2] swap DURATION: the prose gives no explicit weapon-change duration; modeled at durationSec 10 = the Full Burst window (the standard burst-mode weapon length; datamined burst_duration 1000). estimate = 10s; recipe = focus recording of how long the UberBuster stays equipped after the B2 cast; tier = MODEL_ONLY. Pierce tagging is inert in a single-target comp with no Pierce Damage Up source (feeds only the per-shot pierce tag). New per-unit spec scripts/tests/units/maxwell-ordinary-mechanic.test.ts pins every modeled line GREEN vs shipped + RED vs its nearest-wrong counterfactual (shotFired cadence + stack-30 cap; stageEnter:3 vs burstCast; atkOfMaxHpPct vs casterAtkPct; Overcurrent stack-5 self-only; gauge 715; weaponSwap 350/300/1ammo/Pierce; the Overcurrent charge-time ladder accelerates the swap cadence vs a fixed-3s counterfactual; 25% vs 10% team buff). Kit-autonomy gauntlet 2026-07-31.",
  "resources": [{ "name": "overcurrent", "initial": 0, "min": 0, "max": 5 }],
  "unmodeled": {
    "skill1": [],
    "skill2": [],
    "burst": []
  },
  "skill1": [
    {
      "slot": "skill1",
      "trigger": { "kind": "shotFired" },
      "target": { "kind": "allies" },
      "effects": [
        {
          "kind": "buff",
          "stat": "casterMaxHpPct",
          "value": 1,
          "maxStacks": 30
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": { "kind": "stageEnter", "stage": 3 },
      "target": { "kind": "allies" },
      "effects": [
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 10,
          "durationSec": 5
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "allies" },
      "effects": [
        {
          "kind": "buff",
          "stat": "atkOfMaxHpPct",
          "value": 1,
          "durationSec": 15
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "self" },
      "effects": [
        { "kind": "buff", "stat": "atkPct", "value": 30, "maxStacks": 5 },
        { "kind": "resource", "name": "overcurrent", "delta": 1 }
      ]
    }
  ],
  "burst": [
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "self" },
      "resourceGate": { "name": "overcurrent", "max": 1 },
      "effects": [
        {
          "kind": "weaponSwap",
          "damagePct": 350,
          "chargeTimeSec": 3,
          "chargeMultPct": 300,
          "maxAmmo": 1,
          "hasPierce": true,
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "self" },
      "resourceGate": { "name": "overcurrent", "min": 2, "max": 2 },
      "effects": [
        {
          "kind": "weaponSwap",
          "damagePct": 350,
          "chargeTimeSec": 2.5,
          "chargeMultPct": 300,
          "maxAmmo": 1,
          "hasPierce": true,
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "self" },
      "resourceGate": { "name": "overcurrent", "min": 3, "max": 3 },
      "effects": [
        {
          "kind": "weaponSwap",
          "damagePct": 350,
          "chargeTimeSec": 2,
          "chargeMultPct": 300,
          "maxAmmo": 1,
          "hasPierce": true,
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "self" },
      "resourceGate": { "name": "overcurrent", "min": 4, "max": 4 },
      "effects": [
        {
          "kind": "weaponSwap",
          "damagePct": 350,
          "chargeTimeSec": 1.5,
          "chargeMultPct": 300,
          "maxAmmo": 1,
          "hasPierce": true,
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "self" },
      "resourceGate": { "name": "overcurrent", "min": 5 },
      "effects": [
        {
          "kind": "weaponSwap",
          "damagePct": 350,
          "chargeTimeSec": 0.4,
          "chargeMultPct": 300,
          "maxAmmo": 1,
          "hasPierce": true,
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "allies" },
      "effects": [
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 25,
          "durationSec": 10
        }
      ]
    }
  ]
}
```

---

## JUDGING NOTES

- validate-overrides: PASS, dmg 198.2M, 9 bursts, 0 warnings. Driver test: 24 passed | 1 skipped.
- All 8 kit lines are accounted for (none silently dropped); unmodeled.{skill1,skill2,burst} are EMPTY.
- The two documented residuals (flag-1 caster-vs-own HP scaling; flag-2 swap duration 10s) are MODEL_ONLY
  schema/measurement gaps with estimate+recipe+tier in the override note, NOT silent drops.
- Return the verdict JSON your contract specifies. verdict and faithfulnessScore MUST be top-level keys.
