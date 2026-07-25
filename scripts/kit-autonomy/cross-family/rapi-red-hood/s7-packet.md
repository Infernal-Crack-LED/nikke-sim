# S7 RECONCILING JUDGE — rapi-red-hood (Rapi: Red Hood)
You are the BINDING reconciling judge for the kit-autonomy gauntlet on `rapi-red-hood` (Rapi: Red Hood, MG/Attacker/Fire/Burst III; "rrh"/"rapipi" — NOT base `rapi`, NOT `red-hood`). Grade the DRIVER's implementation against the kit prose + mechanics SSOT + the independent blind roles. Return the binding verdict JSON per the contract below.

---

## 1. JUDGE CONTRACT + RETURN JSON SHAPE

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

## 2. MECHANICS SSOT — docs/data/damage-calculation.md

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


---

## 2b. MECHANICS SSOT — docs/data/game-mechanics.md

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

## 3. GROUND TRUTH — kit prose + base stats (data/characters.json extract)

```json
{
  "slug": "rapi-red-hood",
  "name": "Rapi: Red Hood",
  "imageUrl": "https://sg-tools-cdn.blablalink.com/eh-57/qq-25/d40646fc55c16832bc2e573d0607c291.png",
  "weapon": "MG",
  "burst": "III",
  "burstCooldownSec": 40,
  "class": "Attacker",
  "element": "Fire",
  "countsAsElements": [
    "Fire",
    "Iron"
  ],
  "manufacturer": "Elysion Overspec",
  "normalAttackMultiplier": 5.57,
  "coreAttackMultiplier": 200,
  "ammo": 300,
  "reloadFrames": 171,
  "chargeFrames": 0,
  "chargeMultiplier": 0,
  "hitsPerShot": 1,
  "rl3": 3.55,
  "burstGaugePerShot": 0.05,
  "treasure": false,
  "nicknames": [
    "rrh",
    "rapipi"
  ],
  "skills": {
    "skill1": "■ Activates at the start of battle and when Full Burst ends.\nEffect varies according to squad formation. Only one effect is applied.\nAffects self if there are no Burst 1 allies..\nCombat Assist: Changes to Burst Stage 1. This effect is continuous.\nAffects self if there are Burst 1 allies.\nCancels Combat Assist.\n■ Activates when entering Full Burst while in Combat Assist status. Affects all allies.\nCooldown of Burst Skill ▼ 7.48 sec.\nAttack Damage ▲ 8.02% for 10 sec.\n■ Activates when entering Full Burst while not in Combat Assist status. Affects self.\nATK ▲ 95.04% for 10 sec.\nDamage to Interruption Parts ▲ 48% for 10 sec.",
    "skill2": "■ Activates at the start of battle. Affects self.\nApplies Elemental Advantage damage to Electric Code enemies continuously.\nProjectile Attachment Damage ▲ 150.72% continuously.\nProjectile Explosion Damage ▲ 100.6% continuously.\n■ Activates after 120 normal attack(s). Affects self. \nAttachable Projectiles\nEffect: Launches attachable projectiles that attach to hit locations. When entering Full Burst, the projectiles explode.\nProjectile Attachment Damage: Deals 88.11% of final ATK as damage.\nProjectile Explosion Damage: Deals 88.11% of final ATK as damage.\nMax Ammunition Capacity: 1 round(s).",
    "burst": "When used in Stage 1: Squad Support Action Style\n■ Affects self.\nCooldown of Burst Skill ▼ 20 sec.\nExplosion Radius ▲ 100.62% for 10 sec.\n■ Affects all allies.\nATK ▲ 18.01% of the skill user's ATK for 10 sec.\nWhen used in Stage 3: High-Mobility Close-Range Combat Weapon\n■ Affects the enemy nearest to the crosshair.\nDeals 2808% of final ATK as additional damage.\n■ Affects self.\nExplosion Radius ▲ 100.62% for 10 sec.\nProjectile Attachment Damage ▲ 421.2% for 10 sec.\nSkill 2's requirement for triggering attachable projectiles ▼ 60 for 10 sec."
  },
  "skillCooldownsSec": {
    "skill1": null,
    "skill2": null,
    "burst": 40
  },
  "role": {
    "weapon": {
      "shot_id": 1001601,
      "shot_detail": {
        "id": 1001601,
        "damage": 557,
        "max_ammo": 300,
        "shake_id": 2,
        "ShakeType": "Fire_MG",
        "fire_type": "Instant",
        "zoom_rate": 0,
        "aim_prefab": "base_aim_reference_c016",
        "input_type": "DOWN",
        "shot_count": 1,
        "ShakeWeight": 120,
        "attack_type": "Metal",
        "camera_work": "camera_work_01",
        "charge_time": 0,
        "penetration": 0,
        "reload_time": 250,
        "shot_timing": "Concurrence",
        "spot_radius": 0,
        "weapon_type": "MG",
        "is_targeting": false,
        "muzzle_count": 1,
        "rate_of_fire": 60,
        "name_localkey": "Machine Gun",
        "prefer_target": "TargetPS",
        "reload_bullet": 10000,
        "counter_enermy": "Metal_Type",
        "multi_aim_range": 0,
        "spot_last_delay": 20,
        "core_damage_rate": 20000,
        "end_rate_of_fire": 4200,
        "spot_first_delay": 20,
        "center_shot_count": 0,
        "reload_start_ammo": 299,
        "full_charge_damage": 10000,
        "multi_target_count": 0,
        "spot_radius_object": 0,
        "uptype_fire_timing": 0,
        "burst_energy_pershot": 500,
        "description_localkey": "■ Affects target(s).\n<color=#00AEFF>Deals {damage}% of ATK as damage.\nDeals {core_damage_rate}% damage when attacking core.</color>",
        "maintain_fire_stance": 0,
        "spot_explosion_range": 0,
        "use_function_id_list": [
          0
        ],
        "accuracy_change_speed": 150,
        "hurt_function_id_list": [
          0
        ],
        "spot_projectile_speed": 0,
        "accuracy_change_pershot": 7,
        "prefer_target_condition": "None",
        "rate_of_fire_reset_time": 100,
        "full_charge_burst_energy": 0,
        "end_accuracy_circle_scale": 10,
        "auto_accuracy_change_speed": 150,
        "rate_of_fire_change_pershot": 100,
        "start_accuracy_circle_scale": 250,
        "target_burst_energy_pershot": 1000,
        "auto_accuracy_change_pershot": 7,
        "auto_end_accuracy_circle_scale": 10,
        "auto_start_accuracy_circle_scale": 250
      },
      "bonusrange_max": 55,
      "bonusrange_min": 35
    },
    "burstMeta": {
      "burst_duration": 1000,
      "use_burst_skill": "Step3",
      "burst_apply_delay": 1,
      "change_burst_step": "StepFull"
    },
    "skillDetails": {
      "skill1_id": 2016101,
      "skill2_id": 2016201,
      "skill1_table": "StateEffect",
      "skill2_table": "StateEffect",
      "skill1_detail": {
        "id": 2016101,
        "icon": "icn_skill_atkup_01",
        "group_id": 20161,
        "skill_level": 1,
        "name_localkey": "Battlefield Assessment",
        "next_level_id": 2016102,
        "level_up_cost_id": 10102,
        "description_localkey": "■ Activates at the start of battle and when Full Burst ends.\n<color=#00AEFF>Effect varies according to squad formation. Only one effect is applied.</color>\nAffects self if there are no <word_group=10067>Burst 1 allies.</word_group>.\n<color=#00AEFF>Combat Assist: <word_group=10062>Changes to Burst Stage {description_value_01}</word_group>. This effect is continuous.</color>\nAffects self if there are <word_group=10067>Burst 1 allies.</word_group>\n<color=#00AEFF><word_group=10101>Cancels</word_group> Combat Assist.</color>\n■ Activates when entering Full Burst while in Combat Assist status. Affects all allies.\n<color=#00AEFF><word_group=10031>Cooldown</word_group> of Burst Skill ▼ {description_value_02} sec.\nAttack Damage ▲ {description_value_07}% for {description_value_08} sec.</color>\n■ Activates when entering Full Burst while not in Combat Assist status. Affects self.\n<color=#00AEFF>ATK ▲ {description_value_03}% for {description_value_04} sec.\n<word_group=10000>Damage to Interruption Parts</word_group> ▲ {description_value_05}% for {description_value_06} sec.</color>",
        "description_value_list": [
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
              "5.34",
              "5.58",
              "5.82",
              "6.05",
              "6.29",
              "6.53",
              "6.77",
              "7",
              "7.24",
              "7.48"
            ]
          },
          {
            "description_value": [
              "59.4",
              "63.36",
              "67.32",
              "71.28",
              "75.24",
              "79.2",
              "83.16",
              "87.12",
              "91.08",
              "95.04"
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
              "30",
              "32",
              "34",
              "36",
              "38",
              "40",
              "42",
              "44",
              "46",
              "48"
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
              "5.01",
              "5.35",
              "5.68",
              "6.01",
              "6.35",
              "6.68",
              "7.02",
              "7.35",
              "7.69",
              "8.02"
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
          {}
        ],
        "info_description_localkey": "Skill 1"
      },
      "skill2_detail": {
        "id": 2016201,
        "icon": "icn_skill_stickyprojectile_01",
        "group_id": 20162,
        "skill_level": 1,
        "name_localkey": "Attachable Projectiles",
        "next_level_id": 2016202,
        "level_up_cost_id": 10202,
        "description_localkey": "■ Activates at the start of battle. Affects self.\n<color=#00AEFF><word_group=10063>Applies Elemental Advantage damage</word_group> to Electric Code enemies continuously.\n<word_group=10065>Projectile Attachment Damage</word_group> ▲ {description_value_05}% continuously.\n<word_group=10066>Projectile Explosion Damage</word_group> ▲ {description_value_06}% continuously.</color>\n■ Activates after {description_value_01} normal attack(s). Affects self. \n<color=#00AEFF>Attachable Projectiles\nEffect: Launches <word_group=10064>attachable projectiles</word_group> that attach to hit locations. When entering Full Burst, the projectiles explode.\n<word_group=10065>Projectile Attachment Damage</word_group>: Deals {description_value_02}% of <word_group=10025>final</word_group> ATK as damage.\n<word_group=10066>Projectile Explosion Damage</word_group>: Deals {description_value_03}% of <word_group=10025>final</word_group> ATK as damage.\nMax Ammunition Capacity: {description_value_04} round(s).</color>",
        "description_value_list": [
          {
            "description_value": [
              "120",
              "120",
              "120",
              "120",
              "120",
              "120",
              "120",
              "120",
              "120",
              "120"
            ]
          },
          {
            "description_value": [
              "49.71",
              "53.98",
              "58.25",
              "62.51",
              "66.78",
              "71.05",
              "75.31",
              "79.58",
              "83.85",
              "88.11"
            ]
          },
          {
            "description_value": [
              "49.71",
              "53.98",
              "58.25",
              "62.51",
              "66.78",
              "71.05",
              "75.31",
              "79.58",
              "83.85",
              "88.11"
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
              "94.2",
              "100.48",
              "106.76",
              "113.04",
              "119.32",
              "125.6",
              "131.88",
              "138.16",
              "144.44",
              "150.72"
            ]
          },
          {
            "description_value": [
              "59.44",
              "64.02",
              "68.59",
              "73.16",
              "77.74",
              "82.31",
              "86.88",
              "91.46",
              "96.03",
              "100.6"
            ]
          },
          {},
          {},
          {},
          {},
          {}
        ],
        "info_description_localkey": "Skill 2"
      },
      "ulti_skill_id": 1016301,
      "ulti_skill_detail": {
        "id": 1016301,
        "icon": "icn_skill_c016_ult",
        "group_id": 10163,
        "shake_id": 1,
        "skill_type": "SetBuff",
        "attack_type": "Fire",
        "skill_level": 1,
        "counter_type": "Metal_Type",
        "duration_type": "None",
        "name_localkey": "Power of Inheritance",
        "next_level_id": 1016302,
        "prefer_target": "Random",
        "resource_name": "c016_ulti",
        "duration_value": 0,
        "skill_cooltime": 4000,
        "level_up_cost_id": 10302,
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
        "description_localkey": "When used in Stage 1: Squad Support Action Style\n■ Affects self.\n<color=#00AEFF><word_group=10031>Cooldown</word_group> of Burst Skill ▼ 20 sec.\nExplosion Radius ▲ {description_value_01}% for {description_value_02} sec.</color>\n■ Affects all allies.\n<color=#00AEFF>ATK ▲ {description_value_03}% of the skill user's ATK for {description_value_04} sec.</color>\nWhen used in Stage 3: High-Mobility Close-Range Combat Weapon\n■ Affects the enemy nearest to the crosshair.\n<color=#00AEFF>Deals {description_value_05}% of <word_group=10025>final</word_group> ATK as additional damage.</color>\n■ Affects self.\n<color=#00AEFF>Explosion Radius ▲ {description_value_01}% for {description_value_02} sec.\n<word_group=10065>Projectile Attachment Damage</word_group> ▲ {description_value_06}% for {description_value_07} sec.\nSkill 2's requirement for triggering attachable projectiles ▼ {description_value_08} for {description_value_09} sec.</color>",
        "description_value_list": [
          {
            "description_value": [
              "62.88",
              "67.08",
              "71.27",
              "75.46",
              "79.65",
              "83.85",
              "88.04",
              "92.23",
              "96.42",
              "100.62"
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
              "11.16",
              "11.92",
              "12.68",
              "13.44",
              "14.2",
              "14.96",
              "15.72",
              "16.48",
              "17.24",
              "18.01"
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
              "1512",
              "1656",
              "1800",
              "1944",
              "2088",
              "2232",
              "2376",
              "2520",
              "2664",
              "2808"
            ]
          },
          {
            "description_value": [
              "216",
              "238.8",
              "261.6",
              "284.4",
              "307.2",
              "330",
              "352.8",
              "375.6",
              "398.4",
              "421.2"
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
              "60",
              "60",
              "60",
              "60",
              "60",
              "60",
              "60",
              "60",
              "60",
              "60"
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
          {}
        ],
        "prefer_target_condition": "None",
        "info_description_localkey": "Burst Skill",
        "after_use_function_id_list": [
          101630102,
          101630105
        ],
        "after_hurt_function_id_list": [
          0
        ],
        "before_use_function_id_list": [
          101630103,
          101630104,
          101630109,
          101630106,
          101630111
        ],
        "before_hurt_function_id_list": [
          0
        ]
      }
    },
    "statScaling": {
      "grow_grade": 201602,
      "grade_core_id": 1,
      "stat_enhance_id": 5106,
      "stat_enhance_detail": {
        "id": 5106,
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
        100001
      ],
      "element_details": [
        {
          "id": 100001,
          "element": "Fire",
          "group_id": 5000001,
          "element_icon": "icn_element_fire",
          "weak_element_id": 200001,
          "element_desc_localekey": "Injects Code: H.S.T.A. to all wind-type enemies, dealing 10% additional damage.",
          "element_name_localekey": "Fire",
          "element_code_name_localekey": "Code: H.S.T.A."
        }
      ]
    },
    "piece": {
      "piece_id": 5100016,
      "piece_detail": {
        "id": 5100016,
        "class": "Attacker",
        "order": 1600,
        "use_id": 0,
        "use_type": "None",
        "item_rare": "SSR",
        "item_type": "Piece",
        "stack_max": 9999999,
        "use_value": 0,
        "corporation": "ELYSION",
        "resource_id": 16,
        "item_sub_type": "CharacterPiece",
        "name_localkey": "Rapi: Red Hood's Spare Body",
        "use_limit_count": false,
        "inventory_filter": [
          "etc"
        ],
        "corporation_sub_type": "OVERSPEC",
        "description_localkey": "Can be used for Nikkes' Limit Breaks.\nIf a Nikke's Limit Break has reached the max level, any additional Spare Bodies for that Nikke will be converted to Body Labels."
      }
    },
    "meta": {
      "id": 201601,
      "class": "Attacker",
      "order": 10031,
      "name_code": 5129,
      "corporation": "ELYSION",
      "resource_id": 16,
      "name_localkey": "Rapi: Red Hood",
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
  "generatorSupported": true,
  "simSupported": true,
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
    "resourceId": 16
  }
}
```

---

## 4. S2b CROSS-FAMILY TEST REVIEW (claude-fable-5) + DRIVER RECONCILIATION

```json
{
  "slug": "rapi-red-hood",
  "leakDetected": "The effect schema (claimed target-name-stripped) leaks this unit twice: the stored-charge effect's `core` comment cites 'RRH attached-rocket explosions core ~1/3, MEASURED 2026-07-16' and its `crit` comment cites 'RRH explosions crit — orange bodies observed; 2026-07-16 DECISIONS'. RRH is rapi-red-hood's approved nickname, and these name the exact answer for skill2's explosion core/crit encoding. All dispositions below were re-derived from the kit prose; the explosion core-rate MAGNITUDE is treated as measurement-gated ⚑, not as the leaked value.",
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "Activates at start of battle / FB ends",
      "disposition": "FAITHFUL",
      "scope": "whole-kit mode selector (Combat Assist = acts as Burst Stage 1), not a stat",
      "durationSemantics": "'This effect is continuous' — permanent status; re-evaluated at battle start and each fullBurstEnd, but squad formation is static so a setup-time gate is equivalent",
      "triggerIdentity": "battle-start + fullBurstEnd re-evaluation; encode as static formation gate: 'noB1' → Combat Assist ON (she bursts at stage 1), 'hasB1' → cancelled (she bursts at stage 3). She herself must never count as the B1 ally",
      "targetSet": "self",
      "nearestWrongModel": "Combat Assist always-on (or user-mode-selected) regardless of squad formation — or counting her own stage-1 conversion as satisfying 'there are Burst 1 allies', flapping the gate",
      "distinguishingAssertion": "controlComp (liter is B1): her burstCast events are stage 3 and the 2808% nuke fires; in a no-B1 fixture (crown B2 + helm B3, no liter) her burstCast events are stage 1 and the nuke never fires",
      "inertness": "in controlComp, zero Combat-Assist-branch effects (no 7.48s team CDR, no 8.02% team Attack Damage)",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "entering FB while in Combat Assist",
      "disposition": "FAITHFUL",
      "scope": "generic — Burst CDR + Attack Damage (Damage-Up bucket attackDamagePct), team-wide",
      "durationSemantics": "CDR is an instantaneous one-shot per FB entry; the 8.02% is durationSec 10 (true seconds, text says 'sec')",
      "triggerIdentity": "fullBurstEnter (any team FB), gated on Combat Assist status — i.e. only live in noB1 formations",
      "targetSet": "all allies (including self)",
      "nearestWrongModel": "block active in hasB1 comps too (formation gate dropped) — over-credits every standard comp with team burstCdr 7.48 + 8.02% Attack Damage per FB; or mis-targeted self-only",
      "distinguishingAssertion": "controlComp: NO buffApply with stat attackDamagePct value 8.02 anywhere in the event log; no-B1 fixture: on each fullBurstStart, attackDamagePct 8.02 buffApply lands on every ally AND subsequent burst rotations arrive ~7.48s earlier than the no-override control",
      "inertness": "must move nothing in any comp containing a Burst 1 unit",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "entering FB while NOT in Combat Assist",
      "disposition": "FAITHFUL",
      "scope": "generic self ATK (atkPct — scales own ATK, not caster-flat)",
      "durationSemantics": "durationSec 10",
      "triggerIdentity": "fullBurstEnter — fires on ANY team Full Burst, not only rotations she bursts; gated on hasB1 formation",
      "targetSet": "self",
      "nearestWrongModel": "keyed to burstCast (fires only when SHE casts) — under-credits in a two-B3 comp (helm co-B3) on any FB she didn't cast; burstCast vs fullBurstEnter is exactly the taxonomy-3 trap",
      "distinguishingAssertion": "controlComp with helm co-B3: buffApply atkPct 95.04 (target self) follows EVERY fullBurstStart, including full bursts where the B3 cast was not hers",
      "inertness": "must not fire in a no-B1 comp (Combat Assist active) — there the 95.04% never applies",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Damage to Interruption Parts ▲ 48%",
      "disposition": "FAITHFUL",
      "scope": "parts-scoped damage only",
      "durationSemantics": "durationSec 10, alongside the 95.04%",
      "triggerIdentity": "same fullBurstEnter / not-Combat-Assist block",
      "targetSet": "self",
      "nearestWrongModel": "encoded as generic attackDamagePct or partsDamagePct treated as live — the v1 boss is partless and hit location never changes damage, so any nonzero contribution is over-credit",
      "distinguishingAssertion": "toggling this effect's value 48↔0 via withPatchedOverride leaves totals(res)['rapi-red-hood'] bit-identical",
      "inertness": "entire line must be damage-inert (partsDamagePct is schema-declared inert in v1)",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "Elemental Advantage vs Electric Code",
      "disposition": "FAITHFUL",
      "scope": "element-advantage ELIGIBILITY vs Electric bosses only (advantageVs), not a damage % buff",
      "durationSemantics": "continuously — permanent passive",
      "triggerIdentity": "passive from battle start",
      "targetSet": "self",
      "nearestWrongModel": "encoded as elementDamagePct/elemAdvantageDamagePct active vs any boss — over-credits ~10% vs the Fire control boss; or replacing (instead of extending) her native Fire-vs-Wind advantage",
      "distinguishingAssertion": "vs the Fire control boss, removing this effect changes nothing; vs an Electric boss fixture her damage events carry the ×1.10 advantage multiplier",
      "inertness": "exactly zero effect vs any non-Electric boss, including controlComp's Fire boss",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Proj Attach ▲150.72% / Expl ▲100.6% cont.",
      "disposition": "FIX",
      "scope": "flavor-scoped: boosts ONLY projectileAttachment-flavored and projectileExplosion-flavored hits respectively — never her normal attacks, nuke, or generic Damage-Up bucket",
      "durationSemantics": "continuously — permanent passive",
      "triggerIdentity": "passive",
      "targetSet": "self",
      "nearestWrongModel": "(a) encoded as generic attackDamagePct — boosts her ENTIRE output including 300-round magazines, a massive over-credit; (b) silently dropped because no projectileAttachmentDamagePct StatKey exists in the schema. The faithful encoding must bake the multipliers into the proc atkPct (attach 88.11×(1+1.5072)≈220.94% ATK, explosion 88.11×(1+1.006)≈176.74% ATK) or extend the schema — and the burst's +421.2% must stack ADDITIVELY in the same pot, not multiplicatively",
      "distinguishingAssertion": "an attachment hit outside the burst window deals ≈2.2094× staticAtk-scaled base (not 0.8811×, not boosted normals); a normal-attack damage event's mult is unchanged by these two lines",
      "inertness": "normal-attack, burst-nuke, and DoT-free buckets must not move when these two values are zeroed",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Activates after 120 normal attack(s)",
      "disposition": "FAITHFUL",
      "scope": "counts her own normal-attack ROUNDS (MG hitsPerShot 1: 1 round per pull; the same count the ammo economy spends, spanning reloads)",
      "durationSemantics": "recurring counter, resets per launch; capacity-capped (see next line)",
      "triggerIdentity": "hitCount 120 — NOT interval-seconds and NOT per-magazine/lastBullet; the attachment DAMAGE (88.11%) lands at launch time, mid-rotation",
      "targetSet": "self (launcher); damage to the enemy",
      "nearestWrongModel": "attachment damage deferred to FB (both 88.11% hits paid at explosion time) — shifts the attach hit into the FB window, wrongly granting it the +50% FB major and the 10s buff states; or the counter approximated as interval:'~Xs' losing reload-stretch",
      "distinguishingAssertion": "projectileAttachment-flavored damage events occur OUTSIDE full burst at frames matching 120-round accumulation (inFullBurst false on steady-state launches), temporally separated from the projectileExplosion events at fullBurstStart",
      "inertness": "no launch before 120 rounds have been fired from battle start",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "entering Full Burst, projectiles explode",
      "disposition": "FAITHFUL",
      "scope": "stored-hit release; explosion 88.11% of final ATK snapshotted at FB entry (inside FB → takes the FB major by timing, taxonomy-9)",
      "durationSemantics": "stored until next FB entry; released once",
      "triggerIdentity": "fullBurstEnter (ANY team FB) — not her burstCast (which lands pre-FB and would strip the +50% and the FB-window buff state)",
      "targetSet": "enemy",
      "nearestWrongModel": "release keyed to burstCast (pre-FB snapshot, loses FB major + the 95.04% ATK which applies at FB entry) or exploding immediately at attach time",
      "distinguishingAssertion": "each projectileExplosion damage event has inFullBurst true and a timestamp equal to a fullBurstStart frame; its snapshot includes the atkPct 95.04 buff applied that same FB entry",
      "inertness": "no explosion event on an FB entered with no projectile attached (e.g. the first FB if <120 rounds fired)",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Max Ammunition Capacity: 1 round(s)",
      "disposition": "FAITHFUL",
      "scope": "capacity of the attachable-projectile pool: at most ONE stored/attached projectile at a time; while one is attached, further 120-round completions launch nothing",
      "durationSemantics": "'1 round(s)' here is the LAUNCHER's magazine size — it is NOT a durationShots round-count buff and NOT her MG ammo (300)",
      "triggerIdentity": "static cap on the hitCount block (charges cap 1)",
      "targetSet": "self",
      "nearestWrongModel": "uncapped accumulation — with an MG round cadence, a >24s inter-FB gap banks 2+ projectiles and each FB releases a multi-explosion volley, over-crediting; alternatively misread as a 1-round duration on some buff",
      "distinguishingAssertion": "at every fullBurstStart, the count of projectileExplosion damage events released is ≤1, even when >240 rounds were fired since the previous explosion",
      "inertness": "her 300-round MG magazine and reload cadence are untouched by this line",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Stage 1: Cooldown of Burst Skill ▼ 20 sec",
      "disposition": "FAITHFUL",
      "scope": "her OWN burst cooldown only (base 40s → effective 20s cycle in Combat-Assist rotations)",
      "durationSemantics": "instantaneous CDR on cast",
      "triggerIdentity": "burstCast stage:1 — stage-keyed; fires only when she casts at Burst Stage 1 (i.e. only in noB1/Combat-Assist comps)",
      "targetSet": "self",
      "nearestWrongModel": "granted to all allies (over-credits team rotation), or applied on her stage-3 casts too (would collapse her 40s B3 cadence to 20s in standard comps)",
      "distinguishingAssertion": "no-B1 fixture: intervals between her consecutive burstCast events ≈20s; controlComp (stage 3): her burstCast interval reflects the full 40s cd, and no ally receives a 20s burstCdr",
      "inertness": "inert in every hasB1 comp",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Explosion Radius ▲ 100.62% for 10 sec",
      "disposition": "UNMODELED",
      "scope": "AoE radius — no radius model exists and the fight is a single partless boss",
      "durationSemantics": "durationSec 10 (moot)",
      "triggerIdentity": "burstCast (appears in BOTH the stage-1 and stage-3 self blocks)",
      "targetSet": "self",
      "nearestWrongModel": "encoded as a damage buff (e.g. explosion-flavor damage ▲100.62%) — would roughly double explosion output for 10s per burst with zero kit basis",
      "distinguishingAssertion": "the string appears verbatim in unmodeled.burst; no buffApply within ±1 frame of her burstCast carries value 100.62",
      "inertness": "zero damage contribution; must be recorded verbatim, not silently dropped",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "burst",
      "kitLine": "ATK ▲ 18.01% of the skill user's ATK",
      "disposition": "FAITHFUL",
      "scope": "caster-scaled flat ATK add (casterAtkPct), not target-scaled",
      "durationSemantics": "durationSec 10",
      "triggerIdentity": "burstCast stage:1 only",
      "targetSet": "all allies (including self)",
      "nearestWrongModel": "encoded as plain atkPct 18.01 (each target scales its OWN ATK) — mis-credits every ally whose staticAtk differs from hers; or leaking onto stage-3 casts",
      "distinguishingAssertion": "no-B1 fixture: buffApply events carry stat 'casterAtkPct' with an identical FLAT value ≈0.1801×her staticAtk on every ally (the harness flat-resolves caster-scaled stats at apply time — the emitted value is a flat ATK number, not 18.01); controlComp: no such buffApply ever",
      "inertness": "absent from all stage-3 (hasB1) rotations",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Stage 3: Deals 2808% of final ATK",
      "disposition": "FAITHFUL",
      "scope": "single instant flatDamage rider, 2808% of her final ATK at cast",
      "durationSemantics": "one hit per stage-3 cast",
      "triggerIdentity": "burstCast stage:3 — pre-FB timing, therefore FB-exempt (noFb: burst-cast damage always lands before the FB window opens, taxonomy-9); noRange per the universal rider rule",
      "targetSet": "enemy (nearest to crosshair — single boss, no targeting ambiguity)",
      "nearestWrongModel": "FB major +50% applied (treating it as landing inside full burst), or the nuke firing on stage-1 casts in noB1 comps",
      "distinguishingAssertion": "controlComp: exactly one 2808%-scaled damage event per her burstCast, with fbMajorApplied false and rangeApplied false; no-B1 fixture: zero such events across the whole run",
      "inertness": "never fires from stage-1 casts; count per rotation is exactly 1",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Stage 3: Proj Attach Dmg ▲ 421.2% 10s",
      "disposition": "FAITHFUL",
      "scope": "attachment-flavor ONLY — does not touch the explosion flavor or any other bucket; stacks ADDITIVELY with the passive 150.72% in the same flavor pot",
      "durationSemantics": "durationSec 10 from her stage-3 cast",
      "triggerIdentity": "burstCast stage:3",
      "targetSet": "self",
      "nearestWrongModel": "generic damage buff for 10s, or multiplied against (rather than added to) the passive 150.72%, or also boosting explosions — each inflates the burst window differently",
      "distinguishingAssertion": "an attachment launched inside the window deals ≈88.11×(1+1.5072+4.212)=592.0% ATK vs ≈220.9% outside it; explosion events inside the same window remain at the ≈176.7% level",
      "inertness": "explosion-flavored and normal-attack damage unchanged; window absent on stage-1 casts",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "S2 requirement ▼ 60 for 10 sec",
      "disposition": "FAITHFUL",
      "scope": "modifies skill2's launch threshold during the window: 120−60=60 rounds",
      "durationSemantics": "durationSec 10 from her stage-3 cast, then reverts to 120; NOT permanent",
      "triggerIdentity": "burstCast stage:3",
      "targetSet": "self",
      "nearestWrongModel": "permanent threshold reduction (never reverting — roughly doubles long-run proc rate), or resetting the accumulated round counter on cast. Note: '▼ 60' as subtract-60 vs set-to-60 are numerically identical here (120−60=60) — this ambiguity is untestable and harmless for this unit",
      "distinguishingAssertion": "within 10s of a stage-3 cast a launch fires after 60 rounds since the prior launch; a launch initiated >10s after the cast requires the full 120 again",
      "inertness": "threshold outside every window is exactly 120; no effect on stage-1 rotations",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1: formation switch (Combat Assist ⇄ cancelled, stage-1 vs stage-3 burst identity)",
    "skill1: FB-enter while Combat Assist → allies burstCdr 7.48 + attackDamagePct 8.02 (10s)",
    "skill1: FB-enter while NOT Combat Assist → self atkPct 95.04 (10s), fullBurstEnter not burstCast",
    "skill2: advantageVs Electric (inert vs Fire control boss)",
    "skill2: flavor-scoped passive multipliers 150.72%/100.6% (baked ≈220.94%/176.74%, never generic)",
    "skill2: hitCount 120 launch, attachment 88.11% lands at launch time outside FB",
    "skill2: explosion 88.11% released at fullBurstEnter, inFullBurst true",
    "skill2: capacity 1 — ≤1 explosion per FB entry",
    "burst: stage-1 self burstCdr 20 (≈20s cycle in noB1 comps only)",
    "burst: stage-1 allies casterAtkPct 18.01 flat-resolved (10s)",
    "burst: stage-3 flatDamage 2808% noFb/noRange, exactly once per cast",
    "burst: stage-3 attachment-flavor +421.2% additive window (10s)",
    "burst: stage-3 threshold 120→60 for 10s, reverting"
  ],
  "unmodeledVerbatim": {
    "skill1": [],
    "skill2": [
      "Launches attachable projectiles that attach to hit locations."
    ],
    "burst": [
      "When used in Stage 1: Squad Support Action Style",
      "Explosion Radius ▲ 100.62% for 10 sec.",
      "When used in Stage 3: High-Mobility Close-Range Combat Weapon"
    ]
  },
  "notes": "Reconciliation points for the driver, ranked by expected shared-prior risk. (1) TWO FIXTURES ARE MANDATORY: controlComp contains liter (B1), so it can only ever exercise the hasB1 branch — stage-3 burst, the 95.04% self path, no Combat Assist. Every Combat-Assist line (team 7.48s CDR, 8.02% AD, stage-1 CDR-20, casterAtkPct 18.01) is structurally unreachable there; a test file with only controlComp silently proves nothing about half the kit. A no-B1 fixture (e.g. crown B2 + helm B3, RRH as acting B1) is required, and its FB chain must be verified viable (burst-eligibility rule). (2) The flavor-scoped passives (150.72%/100.6%) have NO StatKey — the plausible shared misread is generic attackDamagePct (over-credits her whole MG output) or a silent drop; expect baking into proc atkPct, and check the burst's +421.2% is added into the SAME pot (88.11×6.7192≈592.0%), not chained multiplicatively (×2.5072×5.212≈1151%). (3) Explosion release must be fullBurstEnter (post-FB snapshot: gets the +50% major AND the just-applied 95.04%), while the 2808% nuke is burstCast (pre-FB: gets NEITHER) — a driver who keys both to the same trigger is wrong on one of them. (4) Capacity-1 with MG round cadence: steady-state is ~1 attach + 1 explosion per rotation; uncapped banking is the over-credit to hunt. (5) Explosion core-rate and crit-eligibility are NOT in the prose — from a blind stance they are measurement-gated ⚑ (the schema leak names measured values; the driver must cite the measurement provenance, not the prose, if they encode core≈1/3/crit-on). (6) MG cadence tuple is ALWAYS-⚑ (datamine-unreliable rate_of_fire; effective rate is frame-quantized) — it sets the real-time spacing of 120-round launches, so any wall-clock assertion about launch timing must derive from the sim's own shot events, not an assumed pulls/sec. (7) '▼60' subtract-vs-set is numerically indistinguishable at 120→60; record the ambiguity, don't invent a discriminator.",
  "model": "claude-fable-5",
  "driverReconciliation": {
    "reconciledBy": "qwen-driver",
    "date": "2026-07-25",
    "overall": "CONVERGED — reviewer independently re-derived the load-bearing structure (formation gate noB1/hasB1, flavor-scoped 150.72/100.6 passives as a multiplicative bucket, hitCount-120 launch with attachment at launch time, fullBurstEnter explosion release, stage-1 casterAtkPct 18.01 flat, stage-3 2808 nuke). All driver-vs-reviewer deltas are MEASUREMENT-GATED: the blind reviewer had prose only (de-contaminated), the driver carries owner focus-recording evidence.",
    "leak": {
      "detected": true,
      "detail": "types-redacted.ts leaked the target twice via storedHit comments citing the approved nickname \"RRH\" (explosion core ~1/3 MEASURED 2026-07-16; explosion crit orange bodies). prepare-cross-family-packet.ts redacts the slug + supplied tokens but NOT the approved-nickname list, so \"RRH\" survived.",
      "impact": "NONE on verdict — reviewer flagged it openly, re-derived every disposition from prose, and treated the explosion core/crit MAGNITUDES as measurement-gated ⚑ rather than trusting the leaked value. Driver cites the measurement provenance (docs/probe-data/rrh-explosion-core.json, N=9) for core 0.33 + crit-on.",
      "orchestratorFlag": "prepare-cross-family-packet.ts should also redact the unit\\u0027s approved nicknames (data/characters.json nicknames[]) — \"RRH\"/\"rapipi\" here."
    },
    "deltas": [
      {
        "line": "burst stage-3 2808% nuke FB timing",
        "reviewer": "fbMajorApplied FALSE (pre-FB burstCast, FB-exempt, taxonomy-9)",
        "driver": "fbMajorApplied TRUE — nuke is FLIGHTED (delaySec 0.4), a missile landing ~0.4s post-banner INSIDE the FB window at full buffed state",
        "resolution": "DRIVER WINS, measurement-gated. Owner 3 focus recordings + recipe fit (27.9M/25.1M/32.0M at +0.02%/-0.4%/+1.1%); flight time is not prose-derivable. Test RRH5 pins fbMajorApplied true."
      },
      {
        "line": "burst stage-3 Projectile Attachment Damage +421.2%",
        "reviewer": "FAITHFUL + loadBearing (expects in-window attachment 88.11x6.7192~592%)",
        "driver": "REMOVED — MEASURED-INERT on every visible class (0.13% precision, 3 comps); dead datamine entry 101631006",
        "resolution": "DRIVER WINS, measurement-gated. Prose has the line; measurement shows it inert. Shipped omits it (documented in note). Test does NOT assert it. Surfaced for owner in manual-review."
      },
      {
        "line": "skill2 explosion core x0.33 + crit-on",
        "reviewer": "measurement-gated ⚑ (not in prose; leak named the value, reviewer declined to use it)",
        "driver": "core 0.33 (MEASURED, docs/probe-data/rrh-explosion-core.json N=9, range 0.30-0.45) + crit true (consistency ruling 2026-07-16: every other RRH hit crits; removes the stored-hit crit exemption)",
        "resolution": "CONVERGED on framing — both treat as measurement-gated. Test RRH4 pins coreRate 0.330 + critEligible true with provenance cited."
      },
      {
        "line": "skill2 Proj Attach/Expl 150.72/100.6 routing (reviewer FIX)",
        "reviewer": "FIX — must be a flavor-scoped MULTIPLICATIVE bucket on the proc (baked ~220.94%/176.74%), never generic attackDamagePct, never on normals",
        "driver": "shipped already routes as its own multiplicative bucket (engine-verified sim.ts:1387 projFactor=1+(projExpl+projAttach)/100, multiplicative with Damage Up)",
        "resolution": "RECONCILED — the FIX is the reviewer\\u0027s correct requirement that shipped already satisfies. Test RRH3 pins projFactor 2.5072 (attach) / 2.0060 (explode) and projFactor 1.0 on normals; RRH3 counterfactual collapses both to 1.0 when buffs removed."
      },
      {
        "line": "skill2 Max Ammo: 1 (capacity)",
        "reviewer": "loadBearing — <=1 explosion per FB entry; uncapped banking is the over-credit to hunt",
        "driver": "shipped follows OWNER MEASUREMENT of batch accumulation (meter fills 0->100%, rockets accumulate out-of-burst, first explosion of each FB is a BATCH; probe shows batches of 2/4/9/8). \"Max Ammo: 1\" listed UNMODELED.",
        "resolution": "PROSE-vs-MEASUREMENT tension — driver defers to owner measurement (MEASURED > prose-literal); line documented unmodeled. Test RRH4 asserts atkPct is an integer multiple of 88.11 (allows batches), consistent with shipped. Surfaced as a residual for owner confirmation in manual-review."
      }
    ],
    "reviewerNotesAdopted": [
      "Two fixtures mandatory (hasB1 control + noB1) — adopted; test runs both.",
      "fullBurstEnter-not-burstCast for the 95.04% self path — shipped uses fullBurstEnter; in the hasB1 fixture rrh casts every FB so the two coincide (not separately discriminable there); formation gate is the binding discrimination and is pinned.",
      "MG cadence is always-⚑; launch-timing assertions derive from sim shot events, not assumed pulls/sec — test makes no wall-clock launch-timing assertion.",
      "▼60 subtract-vs-set numerically identical at 120->60 — recorded as untestable ambiguity, no discriminator invented."
    ],
    "verdict": "GO (cross-family corroborated) — structure independently confirmed; residual deltas are measurement-gated and documented"
  }
}
```

---

## 5. S5 BLIND TEST (claude-opus-5) — green/red count vs the DRIVER override

**Result vs the driver override on disk: 23 PASSED, 2 SKIPPED (honest blind gaps: the +421.2% flavor buff and the ▼60 trigger-threshold primitive), 0 FAILED.** The blind test was written from prose alone and run against the driver's shipped override; it passes, corroborating faithfulness. (One initial false-failure — the blind test required the unmodeled parts-damage line to contain the word "Interruption"; the driver's unmodeled line was paraphrased "Damage to Parts". The driver corrected its unmodeled line to the VERBATIM kit wording "Damage to Interruption Parts ▲48% for 10 sec", after which the blind test passed cleanly. This was a documentation-verbatimness fix, not a functional change.)

```typescript
/**
 * rapi-red-hood (Rapi: Red Hood) — BLIND per-unit kit spec test.
 *
 * Written from the kit prose ALONE (no sight of the driver's override/tests/reasoning).
 * MG / Fire / Attacker / Burst III. cd 40s, ammo 300, hitsPerShot 1.
 *
 * WHAT THE KIT SAYS (structural read):
 *  skill1 — fires at battle start AND at Full-Burst END; the branch taken depends on a STATIC
 *    squad-formation fact ("no Burst 1 allies" -> Combat Assist / becomes Burst Stage 1;
 *    "there are Burst 1 allies" -> Combat Assist cancelled). Two mutually-exclusive FB-ENTER
 *    riders hang off that state:
 *      - in Combat Assist  -> ALL ALLIES: burst-CD -7.48s, Attack Damage +8.02% / 10s
 *      - not Combat Assist -> SELF:      ATK +95.04% / 10s, Interruption-Part dmg +48% / 10s
 *  skill2 — passive self: elemental advantage vs Electric (boss here is Fire => inert),
 *    Projectile Attachment/Explosion Damage up continuously; and after 120 normal attacks a
 *    projectile ATTACHES (88.11% of final ATK) and EXPLODES on entering Full Burst (88.11%).
 *    Pool capacity 1 round.
 *  burst — stage-1 branch (only reachable in Combat Assist, i.e. a no-B1 squad): self burst-CD
 *    -20s, Explosion Radius +100.62%; all allies ATK +18.01% OF THE CASTER'S ATK / 10s.
 *    stage-3 branch: 2808% of final ATK as additional damage to the nearest enemy, plus self
 *    Explosion Radius / Projectile-Attachment-Damage / threshold-reduction windows.
 *
 * FIXTURE: controlComp(SLUG, /* helm *\/ false) — liter (B1) + crown (B2) + rapi-red-hood (B3).
 *   - helm is DROPPED on purpose: helm is a second Burst III, so she would compete for the B3
 *     slot in the rotation and make "did RRH cast her own burst" non-deterministic. The 2808%
 *     stage-3 line and every burst-keyed assertion below need RRH to be the sole B3.
 *   - liter (B1) is PRESENT, so the squad HAS a Burst 1 ally => Combat Assist is CANCELLED.
 *     This fixture therefore exercises the "not in Combat Assist" half of skill1 and the
 *     stage-3 half of the burst; the Combat-Assist half must be provably INERT (and is proven
 *     non-vacuous by the ungated counterfactual run below).
 *
 * WHY EACH ASSERTION DISCRIMINATES is stated inline per `it`.
 * Runs are hoisted: 5 full 180s sims total.
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

const SLUG = 'rapi-red-hood';

// ---------------------------------------------------------------- helpers

type AnyEv = SimEvent & Record<string, any>;

function run(overrides?: Record<string, unknown>) {
  const events: AnyEv[] = [];
  const opts = controlComp(SLUG, false) as any;
  opts.cfg = { ...(opts.cfg ?? {}), onEvent: (ev: SimEvent) => events.push(ev as AnyEv) };
  if (overrides) opts.overrides = { ...(opts.overrides ?? {}), ...overrides };
  const res = runComp(opts);
  return { res, events, t: totals(res) };
}

/** every slug in the comp except the unit under test — used for inertness diffs */
function teammates(t: Record<string, number>) {
  return Object.keys(t)
    .filter((s) => s !== SLUG)
    .sort()
    .map((s) => [s, t[s]] as const);
}

function buffs(events: AnyEv[], stat: string, value?: number) {
  return events.filter(
    (e) =>
      e.kind === 'buffApply' &&
      e.stat === stat &&
      (value === undefined || Math.abs((e.value as number) - value) < 0.01),
  );
}

function effectsIn(blocks: any[]): any[] {
  return (blocks ?? []).flatMap((b: any) => b.effects ?? []);
}

/** committed override, read-only: withPatchedOverride with a no-op mutator returns the clone */
const OV = withPatchedOverride(SLUG, () => {}) as any;
const ALL_EFFECTS = [
  ...effectsIn(OV.skill1),
  ...effectsIn(OV.skill2),
  ...effectsIn(OV.burst),
];
const UNMODELED_TEXT = JSON.stringify(OV.unmodeled ?? {});

// ---------------------------------------------------------------- hoisted runs

const BASE = run();

// counterfactual 1 — kill the stage-3 burst nuke (2808%)
let nBurstZeroed = 0;
const OV_NO_NUKE = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of ov.burst ?? []) {
    for (const e of b.effects ?? []) {
      if (typeof e.atkPct === 'number' && e.atkPct > 0) {
        e.atkPct = 0;
        nBurstZeroed++;
      }
    }
  }
});
const NO_NUKE = run({ [SLUG]: OV_NO_NUKE });

// counterfactual 2 — kill the whole skill2 projectile channel (attachment + explosion)
let nProjZeroed = 0;
const OV_NO_PROJ = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of ov.skill2 ?? []) {
    for (const e of b.effects ?? []) {
      if (typeof e.atkPct === 'number' && e.atkPct > 0) {
        e.atkPct = 0;
        nProjZeroed++;
      }
    }
  }
});
const NO_PROJ = run({ [SLUG]: OV_NO_PROJ });

// counterfactual 3 — strip the formation gate off skill1 so the Combat-Assist branch fires too.
// This is the NON-VACUITY proof for every "Combat Assist is inert here" assertion.
let nFormationStripped = 0;
const OV_UNGATED = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of ov.skill1 ?? []) {
    if (b.formation) {
      delete b.formation;
      nFormationStripped++;
    }
  }
});
const UNGATED = run({ [SLUG]: OV_UNGATED });

// counterfactual 4 — zero the 95.04% self ATK buff (target-scope + magnitude discriminator)
let nAtkZeroed = 0;
const OV_NO_ATK = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of ov.skill1 ?? []) {
    for (const e of b.effects ?? []) {
      if (e.kind === 'buff' && e.stat === 'atkPct' && Math.abs(e.value - 95.04) < 0.01) {
        e.value = 0;
        nAtkZeroed++;
      }
    }
  }
});
const NO_ATK = run({ [SLUG]: OV_NO_ATK });

const FB_STARTS = BASE.events.filter((e) => e.kind === 'fullBurstStart').length;

// ---------------------------------------------------------------- fixture sanity

describe('rapi-red-hood — fixture non-vacuity', () => {
  it('the comp actually reaches Full Burst and RRH deals damage', () => {
    // Every skill1/burst assertion below keys off Full Burst. A lone B3 makes ZERO full
    // bursts; liter (B1) + crown (B2) are what make this fixture non-vacuous.
    expect(FB_STARTS).toBeGreaterThanOrEqual(2);
    expect(unitOf(BASE.res, SLUG).totalDamage).toBeGreaterThan(0);
  });

  it('RRH is the only Burst III in the fixture (helm dropped)', () => {
    expect(Object.keys(BASE.t)).not.toContain('helm');
  });
});

// ---------------------------------------------------------------- skill1

describe('rapi-red-hood skill1 — formation-gated Combat Assist', () => {
  it('both formation branches are encoded as static squad gates', () => {
    // "Affects self if there are no Burst 1 allies" / "...if there are Burst 1 allies" is a
    // STATIC squad fact, not a runtime trigger. Nearest-wrong: one ungated block that always
    // fires (over-credits the team in a hasB1 comp AND the self branch in a noB1 comp).
    const gates = (OV.skill1 ?? []).map((b: any) => b.formation).filter(Boolean);
    expect(gates).toContain('noB1');
    expect(gates).toContain('hasB1');
  });

  it('with a B1 ally present, the SELF branch fires once per Full Burst entry', () => {
    // "Activates when entering Full Burst while not in Combat Assist status. Affects self.
    //  ATK +95.04% for 10 sec."  liter is B1 => Combat Assist cancelled => this branch is live.
    // Nearest-wrong A: keyed to burstCast (would fire pre-FB / not at all on rotations RRH
    // does not cast). Nearest-wrong B: keyed to fullBurstEnd (count would be off by one).
    const hits = buffs(BASE.events, 'atkPct', 95.04);
    expect(hits.length).toBe(FB_STARTS);
  });

  it('the 95.04% ATK buff is SELF-scoped, not an ally buff', () => {
    // Target-set question. Nearest-wrong: target {kind:'allies'} — would show teammate slugs
    // here and would move teammate totals in the zeroed counterfactual below.
    for (const e of buffs(BASE.events, 'atkPct', 95.04)) {
      expect(e.targetSlug).toBe(SLUG);
    }
  });

  it('zeroing the 95.04% buff lowers ONLY RRH (self-scope, second method)', () => {
    expect(nAtkZeroed).toBeGreaterThan(0); // the patch found its target
    expect(NO_ATK.t[SLUG]).toBeLessThan(BASE.t[SLUG]);
    expect(teammates(NO_ATK.t)).toEqual(teammates(BASE.t)); // byte-identical teammates
  });

  it('the Combat-Assist ally rider is INERT in a squad that has a B1', () => {
    // "in Combat Assist -> all allies: Attack Damage +8.02% / 10s". RRH is NOT in Combat
    // Assist here, so this must never apply. Nearest-wrong: dropping the formation gate.
    expect(buffs(BASE.events, 'attackDamagePct', 8.02).length).toBe(0);
  });

  it('...and that inertness is NOT vacuous — ungating the branch makes it appear', () => {
    expect(nFormationStripped).toBeGreaterThan(0);
    expect(buffs(UNGATED.events, 'attackDamagePct', 8.02).length).toBeGreaterThan(0);
  });

  it('the Combat-Assist branch carries the 7.48s burst-CD reduction', () => {
    // "Cooldown of Burst Skill -7.48 sec" — a burstCdr EFFECT (no buffApply event), so this is
    // asserted structurally. Nearest-wrong: dropped as "defensive/utility" (it is a real
    // rotation-rate change) or mis-signed.
    const cdr = ALL_EFFECTS.filter(
      (e: any) => e.kind === 'burstCdr' && Math.abs(e.seconds - 7.48) < 0.01,
    );
    expect(cdr.length).toBeGreaterThan(0);
  });

  it('Damage to Interruption Parts +48% is modeled or explicitly recorded (no silent drop)', () => {
    // partsDamagePct is inert in v1 (partless boss) but must not vanish silently.
    const asStat = ALL_EFFECTS.some(
      (e: any) => e.stat === 'partsDamagePct' && Math.abs(e.value - 48) < 0.01,
    );
    expect(asStat || /Interruption/i.test(UNMODELED_TEXT)).toBe(true);
  });
});

// ---------------------------------------------------------------- skill2

describe('rapi-red-hood skill2 — attachable projectiles', () => {
  it('elemental advantage vs Electric is modeled and inert vs the Fire boss', () => {
    // "Applies Elemental Advantage damage to Electric Code enemies continuously."
    // Nearest-wrong: a flat elementDamagePct that would pay out against ANY boss.
    const adv = ALL_EFFECTS.some(
      (e: any) => e.kind === 'advantageVs' && String(e.element).toLowerCase() === 'electric',
    );
    expect(adv).toBe(true);
  });

  it('the projectile trigger is a 120-ROUND count, not a timer', () => {
    // "Activates after 120 normal attack(s)" — counts rounds fired (MG, hitsPerShot 1).
    // Nearest-wrong: an interval trigger, which would fire on a wall-clock cadence and
    // decouple the channel from fire rate / reloads entirely.
    const t120 = (OV.skill2 ?? []).some((b: any) => (b.trigger ?? {}).count === 120);
    expect(t120).toBe(true);
  });

  it('the projectile channel actually pays out damage', () => {
    const s2 = BASE.events.filter((e) => e.kind === 'damage' && e.srcSlot === 'skill2');
    expect(s2.length).toBeGreaterThan(0);
  });

  it('ATTACHMENT damage lands on the 120th round, before the first Full Burst', () => {
    // The kit gives attachment its OWN damage line (88.11% of final ATK) separate from the
    // explosion line. An MG at 300 ammo crosses 120 rounds well before the first FB.
    // Nearest-wrong: folding both 88.11% lines into a single FB-entry release — that model
    // has NO skill2 damage before the first fullBurstStart, so this assertion goes RED.
    const firstFb = BASE.events.findIndex((e) => e.kind === 'fullBurstStart');
    expect(firstFb).toBeGreaterThan(-1);
    const before = BASE.events
      .slice(0, firstFb)
      .some((e) => e.kind === 'damage' && e.srcSlot === 'skill2');
    expect(before).toBe(true);
  });

  it('EXPLOSION damage lands after a Full Burst has opened', () => {
    // "When entering Full Burst, the projectiles explode." Nearest-wrong: releasing the stored
    // charge on the accrual trigger (no FB dependency at all).
    const firstFb = BASE.events.findIndex((e) => e.kind === 'fullBurstStart');
    const after = BASE.events
      .slice(firstFb)
      .some((e) => e.kind === 'damage' && e.srcSlot === 'skill2');
    expect(after).toBe(true);
  });

  it('the projectile pool caps at 1 round (no unbounded stacking)', () => {
    // "Max Ammunition Capacity: 1 round(s)" — at most one stored projectile, so at most one
    // explosion per Full Burst. Nearest-wrong: charges accumulating across the whole fight and
    // dumping N-at-once into a late FB.
    const stored = ALL_EFFECTS.filter((e: any) => typeof e.charges === 'number');
    for (const e of stored) expect(e.charges).toBeLessThanOrEqual(1);
  });

  it('the projectile damage magnitude is at least the kit base of 88.11%', () => {
    // Either the raw 88.11% with the continuous +150.72% / +100.6% modeled separately, or a
    // baked value >= 88.11 (the schema has no projectile-damage StatKey — see gaps). A value
    // BELOW 88.11 means the base line was mis-transcribed.
    const proj = effectsIn(OV.skill2).filter((e: any) => typeof e.atkPct === 'number' && e.atkPct > 0);
    expect(proj.length).toBeGreaterThan(0);
    for (const e of proj) expect(e.atkPct).toBeGreaterThanOrEqual(88.11 - 0.01);
  });

  it('zeroing the projectile channel lowers ONLY RRH', () => {
    expect(nProjZeroed).toBeGreaterThan(0);
    expect(NO_PROJ.t[SLUG]).toBeLessThan(BASE.t[SLUG]);
    expect(teammates(NO_PROJ.t)).toEqual(teammates(BASE.t));
  });
});

// ---------------------------------------------------------------- burst

describe('rapi-red-hood burst — stage-3 branch', () => {
  it('the 2808% additional-damage line is encoded', () => {
    const nuke = effectsIn(OV.burst).some(
      (e: any) => typeof e.atkPct === 'number' && Math.abs(e.atkPct - 2808) < 1,
    );
    expect(nuke).toBe(true);
  });

  it('the burst nuke moves ONLY RRH', () => {
    // "Affects the enemy nearest to the crosshair. Deals 2808% of final ATK as additional
    // damage." Target set is the enemy, so no ally total may move.
    expect(nBurstZeroed).toBeGreaterThan(0);
    expect(NO_NUKE.t[SLUG]).toBeLessThan(BASE.t[SLUG]);
    expect(teammates(NO_NUKE.t)).toEqual(teammates(BASE.t));
  });

  it('the stage-1 branch exists but is INERT in a squad with a B1', () => {
    // "When used in Stage 1" is only reachable via Combat Assist (no-B1 squad). liter is B1,
    // so RRH stays Burst III and the stage-1 ATK grant (+18.01% OF THE CASTER'S ATK, all
    // allies) must never apply. Nearest-wrong: an ungated ally ATK grant that pays out in
    // every comp. Non-vacuity: the 95.04% self buff fires above, which is the mutually
    // exclusive not-in-Combat-Assist branch — so the fixture demonstrably resolves the gate.
    const stage1 = (OV.burst ?? []).filter(
      (b: any) => (b.trigger ?? {}).stage === 1 || b.formation === 'noB1' || b.mode,
    );
    expect(stage1.length).toBeGreaterThan(0);
    const flatFromCaster = BASE.events.filter(
      (e) => e.kind === 'buffApply' && e.stat === 'casterAtkPct' && e.targetSlug !== undefined && e.casterIdx !== null && e.targetSlug !== SLUG,
    );
    // no caster-scaled ATK grant sourced from RRH's stage-1 branch reaches an ally here
    expect(
      flatFromCaster.filter((e) => Math.abs((e.value as number)) > 0 && e.key && /18\.01|stage1|squadSupport/i.test(String(e.key))).length,
    ).toBe(0);
  });

  it('the 20s stage-1 burst-CD reduction is recorded', () => {
    const cdr = effectsIn(OV.burst).some(
      (e: any) => e.kind === 'burstCdr' && Math.abs(e.seconds - 20) < 0.01,
    );
    expect(cdr).toBe(true);
  });

  it('Explosion Radius +100.62% is explicitly recorded as unmodeled (no silent drop)', () => {
    // No StatKey expresses explosion radius and the sim has no spatial model — it must live in
    // `unmodeled`, not disappear.
    expect(/Explosion Radius/i.test(UNMODELED_TEXT)).toBe(true);
  });

  // GAP — no primitive exists for a scoped "Projectile Attachment Damage" multiplier. The
  // continuous skill2 lines (+150.72% / +100.6%) can be baked into the stored-hit atkPct, but
  // the burst's +421.2% is a 10-SECOND window and cannot be baked without over-crediting the
  // whole fight. Needs a projectileAttachmentDamagePct StatKey (or a flavor-scoped Damage-Up
  // bucket) before it can be asserted.
  it.skip('burst: Projectile Attachment Damage +421.2% for 10 sec [GAP: no flavor-scoped StatKey]', () => {});

  // GAP — "Skill 2's requirement for triggering attachable projectiles -60 for 10 sec" mutates
  // a TRIGGER THRESHOLD (120 -> 60) for a window. No primitive scales a trigger's `count`; the
  // nearest expressible model (a second block at count 60, time-gated) does not exist in the
  // schema either. Modeling it as a permanently-lower threshold would over-credit.
  it.skip('burst: skill2 trigger requirement -60 for 10 sec [GAP: no trigger-threshold primitive]', () => {});
});

```

---

## 6. S6 BLIND OVERRIDE (claude-opus-5) + DIFF vs the DRIVER override

### 6a. Short structural diff (blind S6 vs driver)

CONVERGED (blind == driver): skill1 formation gate (noB1/hasB1) on fullBurstEnter; noB1 allies burstCdr 7.48 + attackDamagePct 8.02/10s; hasB1 self atkPct 95.04/10s; skill2 advantageVs Electric; skill2 hitCount 120 -> flatDamage 88.11 projectileAttachment + storedHit 88.11 projectileExplosion core 0.33 crit; burst stage-1 self burstCdr 20 + allies casterAtkPct 18.01/10s; burst stage-3 enemy flatDamage 2808.

DIVERGED (all measurement- or schema-gated; blind had prose + a redacted schema only):
1. PROJECTILE BUFFS (150.72/100.6): blind authored them as GENERIC attackDamagePct and ITSELF flags this as a ⚑ SCOPE defect (taxonomy #1) that "OVER-CREDITS every non-projectile hit (all normal MG fire + the 2808% nuke) by ~251pp of Damage Up ... almost certainly WRONG". Driver uses the dedicated flavor-scoped StatKeys projectileAttachmentPct 150.72 / projectileExplosionPct 100.6, which the engine routes as their OWN multiplicative bucket on flavored hits ONLY (sim.ts projFactor = 1+(projExpl+projAttach)/100; normals stay projFactor 1.0). DRIVER IS MORE FAITHFUL; the blind writer's own caveat refutes its encoding and the driver resolves it. Driver test RRH3 pins projFactor 2.5072 (attach) / 2.0060 (explode) on rocket hits and 1.0 on normals.
2. NUKE FB TIMING: blind = noFb:true (pre-FB, FB-exempt). Driver = delaySec 0.4 + requiresPulls 120 (a FLIGHTED missile landing ~0.4s post-banner INSIDE the FB window at full buffed state; charge-gated). MEASUREMENT-GATED — owner 3 focus recordings + recipe fit (27.9M/25.1M/32.0M). Driver test RRH5 pins fbMajorApplied true.
3. +421.2% ATTACHMENT BUFF: blind includes it (generic attackDamagePct 421.2). Driver REMOVED it — MEASURED-INERT on every visible class (0.13% precision, 3 comps; dead datamine entry 101631006). MEASUREMENT-GATED.
4. storedHit instantInFb: blind absent (explosion only at FB start). Driver instantInFb:true (in-burst attaches detonate immediately). MEASUREMENT-GATED (owner-measured red rocket meter).
5. countInFb 60: blind hitCount 120 only (notes the ▼60 threshold is unmodeled, under-credits in-FB procs). Driver count 120 + countInFb 60. MEASUREMENT-GATED.
6. partsDamagePct 48: blind IMPLEMENTED inert (in the hasB1 block). Driver UNMODELED verbatim (inert on the partless boss either way). Documentation choice; both damage-inert.
7. storedHit capacity: blind charges:1 (Max Ammo capacity cap). Driver no cap -> batch accumulation/release (probe shows batches of 2/4/9/8). PROSE-vs-MEASUREMENT tension; driver follows owner measurement, "Max Ammo: 1" documented unmodeled, surfaced to owner as a residual.

NOTE on a de-contamination leak: the S2b reviewer flagged that the redacted effect schema leaked the target via storedHit comments citing the approved nickname "RRH" (explosion core ~1/3, crit). Both S5/S6 reported leakDetected:null but the S6 blind override's core 0.33 + crit:true are labeled by the blind writer as "priors-sourced estimates, not derived from this kit text" — i.e. the blind writer did NOT treat them as prose-derived. The driver cites the measurement provenance (docs/probe-data/rrh-explosion-core.json, N=9, range 0.30-0.45) for core 0.33 and the 2026-07-16 consistency ruling for crit-on.

### 6b. S6 blind override (full)

```json
{
  "slug": "rapi-red-hood",
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "fullBurstEnter"
      },
      "target": {
        "kind": "allies"
      },
      "formation": "noB1",
      "effects": [
        {
          "kind": "burstCdr",
          "seconds": 7.48
        },
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 8.02,
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "fullBurstEnter"
      },
      "target": {
        "kind": "self"
      },
      "formation": "hasB1",
      "effects": [
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 95.04,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "partsDamagePct",
          "value": 48,
          "durationSec": 10
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
          "kind": "advantageVs",
          "element": "Electric"
        },
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 150.72
        },
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 100.6
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "hitCount",
        "count": 120
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 88.11,
          "flavor": "projectileAttachment",
          "crit": true
        },
        {
          "kind": "storedHit",
          "atkPct": 88.11,
          "charges": 1,
          "flavor": "projectileExplosion",
          "core": 0.33,
          "crit": true
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
        "kind": "self"
      },
      "effects": [
        {
          "kind": "burstCdr",
          "seconds": 20
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
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 18.01,
          "durationSec": 10
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
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 2808,
          "crit": true,
          "noFb": true
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
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 421.2,
          "durationSec": 10
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [
      "Combat Assist: Changes to Burst Stage 1. This effect is continuous.",
      "Cancels Combat Assist."
    ],
    "skill2": [
      "Max Ammunition Capacity: 1 round(s)."
    ],
    "burst": [
      "Explosion Radius ▲ 100.62% for 10 sec. (Stage 1)",
      "Explosion Radius ▲ 100.62% for 10 sec. (Stage 3)",
      "Skill 2's requirement for triggering attachable projectiles ▼ 60 for 10 sec."
    ]
  },
  "caveats": [
    "⚑ The 150.72% Projectile Attachment / 100.6% Projectile Explosion continuous buffs are authored as generic attackDamagePct because the schema has no flavor-scoped stat key. This OVER-CREDITS every non-projectile hit (all normal MG fire + the 2808% nuke) by ~251pp of Damage Up and is almost certainly WRONG in magnitude distribution — it needs a flavor-scoped stat (projectileAttachmentDamagePct / projectileExplosionDamagePct) or the buffs must be folded into the projectile effects' own atkPct. Same defect applies to the burst's 421.2% Projectile Attachment line.",
    "⚑ The 120-normal-attack counter: MG hitsPerShot is 1, so 120 rounds ≈ one 300-ammo magazine's first 40%. Whether the counter counts ROUNDS or trigger PULLS is kit-silent; assumed rounds.",
    "⚑ Split-vs-merge for the attachable projectile is kit-silent: modeled as ONE attachment hit + ONE stored explosion charge (Max Ammunition Capacity 1 round supports a single projectile in flight).",
    "⚑ The stage-3 burst's Skill-2 threshold reduction (120→60 for 10s) is NOT modeled — the engine has no dynamic-trigger-count primitive. This UNDER-credits projectile procs during the burst window.",
    "⚑ Explosion core rate 0.33 and crit:true on both projectile components are priors-sourced estimates, not derived from this kit text."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Structure: S1 is a formation-gated pair — with NO Burst-1 ally the unit holds Combat Assist (acts as B1) and its FB-enter branch buffs ALL allies (CDR 7.48s + Attack Damage 8.02%); with a Burst-1 ally present Combat Assist is cancelled and the FB-enter branch instead self-buffs ATK 95.04% + Interruption-Part damage 48%. Modeled with formation:'noB1' / 'hasB1' respectively. S2 grants Electric elemental advantage (advantageVs) plus two continuous projectile-flavor Damage-Up buffs and a 120-normal-attack attachable projectile whose explosion is held until Full Burst (storedHit). Burst is stage-split via burstCast stage 1 (self CDR 20s + ally caster-scaled ATK 18.01%) vs stage 3 (2808% nuke + Projectile Attachment 421.2%). Combat Assist's stage-change itself is unmodeled: the engine has no runtime burst-stage reassignment, so the noB1 case is expressed only through the formation gate, NOT by actually casting the unit at stage 1 — this is the single largest structural approximation here and it makes the stage-1 burst branch effectively unreachable in a normal B1+B2+B3 comp."
}
```

---

## 7. DRIVER'S IMPLEMENTATION (test + override)

### 7a. scripts/tests/units/rapi-red-hood.test.ts (20 pins, all GREEN vs shipped)

```typescript
// PER-UNIT KIT SPEC — `rapi-red-hood` (Rapi: Red Hood, Attacker/MG/Fire, Burst III, cd 40s,
// ammo 300). Kit-autonomy gauntlet 2026-07-25 — test-first independent re-derivation.
//
// EXACT SLUG: this is `rapi-red-hood` ("rrh"/"rapipi"), the MG/Fire Overspec variant — NOT base
// `rapi` (AR/Fire) and NOT `red-hood` (the Λ SR unit). The lint flags the bare "Rapi" substring
// inside her full name; every assertion below keys on the exact slug.
//
// She is a TIER-2 unit: her kit is FORMATION-GATED (S1 reads whether the squad has a Burst I ally)
// and STAGE-GATED (her burst does different things at Stage 1 vs Stage 3), and her damage core is a
// STORED-HIT rocket mechanic. Two fixtures exercise the two formation branches:
//
//   hasB1  — liter(B1)/crown(B2)/rrh(B3)/helm(B3), focus rrh.  A B1 ally IS present, so rrh is in
//            "hasB1" formation: she does NOT fill B1, casts her burst at STAGE 3, and S1 self-buffs
//            ATK 95.04% on each Full Burst entry.
//   noB1   — crown(B2)/rrh/ada(B3), focus rrh.  NO B1 ally, so rrh is in "noB1" formation: Combat
//            Assist makes her fill the B1 slot (burstEligibility stage 1), she casts at STAGE 1, and
//            S1 grants the WHOLE TEAM Attack Damage 8.02% + burst CDR on each Full Burst entry.
//
// Kit (blablalink prose, data/characters.json → characters['rapi-red-hood'].skills):
//   S1 ■ noB1: Combat Assist → fills Burst Stage 1 (continuous)                              [RRH2]
//      ■ noB1, entering Full Burst → all allies: Burst CDR ▼7.48s + Attack Damage ▲8.02% 10s  [RRH2]
//      ■ hasB1, entering Full Burst → self: ATK ▲95.04% for 10 sec                          [RRH1]
//      (hasB1 "Damage to Interruption Parts ▲48%" — UNMODELED, inert on the partless boss)
//   S2 ■ passive: Elemental Advantage vs Electric; Projectile Attachment Damage ▲150.72%,
//                 Projectile Explosion Damage ▲100.6% (continuous)                           [RRH3]
//      ■ every 120 normals (60 in FB): attachable rocket — 88.11% attachment (immediate, no
//                 core) + 88.11% explosion (STORED, releases on FB, cores ×0.33, crits)       [RRH4]
//      (Max Ammo: 1 — UNMODELED, the meter is modeled as a fill threshold not an ammo slot)
//   BU ■ Stage 1 → self: Burst CDR ▼20s; all allies: ATK ▲18.01% of caster ATK for 10 sec    [RRH6]
//      ■ Stage 3 → nearest enemy: 2808% of final ATK as additional damage (flighted ~0.4s,
//                 lands INSIDE the FB window; charge-gated, requires ≥120 pulls)             [RRH5]
//      (Stage 1 & 3 "Explosion Radius ▲100.62%" — UNMODELED, inert on the partless boss;
//       Stage 3 "Projectile Attachment Damage ▲421.2%" — MEASURED-INERT, removed 2026-07-14)
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing). Counterfactuals are built with `withPatchedOverride` ONLY to prove the shipped encoding
// is the one under test, never to supply it:
//   RRH1  the formation gate: 95.04% fires ONLY in hasB1. Proven by its absence in noB1 and by the
//       total dropping when the block is removed. A mis-gated (always-on) buff would appear in both.
//   RRH2  the OTHER side of the gate: 8.02% team buff + a STAGE-1 cast fire ONLY in noB1. A unit
//       that fails to fill B1 could not open the chain at all (zero stage-1 casts).
//   RRH3  the 150.72/100.6 buffs are their OWN multiplicative bucket and route ONLY to the flavored
//       rocket hits — attachment hits carry projFactor 2.5072, explosion hits 2.0060, and removing
//       the buffs collapses both to 1.0 (normals are never touched, projFactor 1.0 throughout).
//   RRH4  the explosion is a STORED hit that cores at ×0.33 and crits, the attachment does NOT core.
//       Removing the storedHit erases every explosion-flavor instance (projFactor 2.0060 gone).
//   RRH5  the 2808% nuke is a flighted burst-bucket hit that takes the +50% FB major (it lands inside
//       the window, ~0.4s after the cast banner), once per cast. Removing the block erases it.
//   RRH6  the Stage-1 ATK grant is caster-scaled flat ATK to ALL allies; the 18.01→11.16 counterfactual
//       moves it by exactly 18.01/11.16, pinning the magnitude without depending on absolute ATK.
//
// Fixture is deterministic (no seed); assertions read the event log, not totals, except where a
// counterfactual's whole point is that the total moves.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { controlComp, runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const SLUG = 'rapi-red-hood';

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(opts: ReturnType<typeof controlComp> | any) {
  const events: SimEvent[] = [];
  const res = runComp({ ...opts, cfg: { ...opts.cfg, onEvent: (e) => events.push(e) } });
  return { events, totals: totals(res) };
}

/** hasB1 fixture: the control comp with rrh as the focused B3 carry (liter is the B1 ally). */
const hasB1Comp = controlComp(SLUG);
const HASB1_RRH = 2; // liter 0 / crown 1 / rrh 2 / helm 3

/** noB1 fixture: no Burst I ally, so rrh fills the B1 slot herself via Combat Assist. */
const noB1Comp = {
  slugs: ['crown', SLUG, 'ada'],
  bossElement: 'Fire' as const,
  focusSlug: SLUG,
};
const NOB1_RRH = 1; // crown 0 / rrh 1 / ada 2

// ---- counterfactual patches (nearest-wrong model each assertion must beat) -------------------
/** RRH1: her hasB1 self-ATK line removed. */
const rrhNoAtk = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => b.formation !== 'hasB1');
  if (ov.skill1.length === before) throw new Error('rrh S1 hasB1 block missing — fixture stale');
});
/** RRH3: her S2 passive projectile Attachment/Explosion buffs removed. */
const rrhNoProj = withPatchedOverride(SLUG, (ov) => {
  let n = 0;
  for (const b of ov.skill2)
    b.effects = b.effects.filter((e: any) => {
      const drop = e.stat === 'projectileAttachmentPct' || e.stat === 'projectileExplosionPct';
      if (drop) n++;
      return !drop;
    });
  if (n !== 2) throw new Error('rrh S2 projectile buffs missing — fixture stale');
});
/** RRH4: her S2 stored explosion (storedHit) removed — the attachment flatDamage stays. */
const rrhNoExpl = withPatchedOverride(SLUG, (ov) => {
  let n = 0;
  for (const b of ov.skill2)
    b.effects = b.effects.filter((e: any) => {
      if (e.kind !== 'storedHit') return true;
      n++;
      return false;
    });
  if (n !== 1) throw new Error('rrh S2 storedHit missing — fixture stale');
});
/** RRH5: her Stage-3 burst nuke removed. */
const rrhNoNuke = withPatchedOverride(SLUG, (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) => !(b.trigger.kind === 'burstCast' && b.trigger.stage === 3),
  );
  if (ov.burst.length === before) throw new Error('rrh burst stage-3 nuke missing — fixture stale');
});
/** RRH2: her noB1 Full-Burst-enter team block removed. */
const rrhNoAssist = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) => !(b.formation === 'noB1' && b.trigger.kind === 'fullBurstEnter'),
  );
  if (ov.skill1.length === before) throw new Error('rrh S1 noB1 FB-enter block missing — fixture stale');
});
/** RRH6: her Stage-1 casterAtkPct magnitude knocked to the level-1 value (11.16 vs 18.01). */
const rrhCasterWrong = withPatchedOverride(SLUG, (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'casterAtkPct');
  if (!e) throw new Error('rrh burst casterAtkPct missing — fixture stale');
  e.value = 11.16;
});

// ---- runs (hoisted: each is a full 180s sim) -------------------------------------------------
const hBase = run(hasB1Comp);
const hNoAtk = run({ ...hasB1Comp, overrides: { [SLUG]: rrhNoAtk } });
const hNoProj = run({ ...hasB1Comp, overrides: { [SLUG]: rrhNoProj } });
const hNoExpl = run({ ...hasB1Comp, overrides: { [SLUG]: rrhNoExpl } });
const hNoNuke = run({ ...hasB1Comp, overrides: { [SLUG]: rrhNoNuke } });
const nBase = run(noB1Comp);
const nNoAssist = run({ ...noB1Comp, overrides: { [SLUG]: rrhNoAssist } });
const nCasterWrong = run({ ...noB1Comp, overrides: { [SLUG]: rrhCasterWrong } });

// ---- readers ---------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) => evs.filter((e): e is Damage => e.kind === 'damage');
const rrhDmg = (evs: SimEvent[], srcSlot: Damage['srcSlot']) =>
  dmg(evs).filter((d) => d.slug === SLUG && d.srcSlot === srcSlot);
const buffs = (evs: SimEvent[]) => evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const rrhBuffs = (evs: SimEvent[], stat: string, rrhSlot: number) =>
  buffs(evs).filter((b) => b.casterIdx === rrhSlot && b.stat === stat);
const rrhBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === SLUG);

/** Distinct holders a buff reached, per frame — for all-allies assertions. */
function holdersPerFrame(bs: BuffApply[]): Map<number, Set<number | null>> {
  const m = new Map<number, Set<number | null>>();
  for (const b of bs) (m.get(b.frame) ?? m.set(b.frame, new Set()).get(b.frame)!).add(b.targetIdx);
  return m;
}

const PROJ_ATTACH = 2.5072; // 1 + 150.72/100
const PROJ_EXPLODE = 2.006; // 1 + 100.6/100
const near = (a: number, b: number, eps = 1e-3) => Math.abs(a - b) < eps;

describe('rapi-red-hood — kit spec', () => {
  describe('RRH1 — S1 hasB1: self ATK ▲95.04% on Full Burst entry (formation-gated)', () => {
    const applied = rrhBuffs(hBase.events, 'atkPct', HASB1_RRH).filter((b) => b.value === 95.04);

    it('fires in hasB1, self-scoped, for 10 sec', () => {
      expect(applied.length, 'no hasB1 atkPct 95.04 buff applied').toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([HASB1_RRH]);
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });

    it('is LIVE (removing it drops her total)', () => {
      expect(hNoAtk.totals[SLUG]).toBeLessThan(hBase.totals[SLUG]);
      expect(rrhBuffs(hNoAtk.events, 'atkPct', HASB1_RRH).filter((b) => b.value === 95.04)).toEqual([]);
    });

    it('DISCRIMINATING: does NOT fire in noB1 formation (the gate is real)', () => {
      expect(rrhBuffs(nBase.events, 'atkPct', NOB1_RRH).filter((b) => b.value === 95.04)).toEqual([]);
    });
  });

  describe('RRH2 — S1 noB1: Combat Assist fills B1 + team Attack Damage ▲8.02% on FB entry', () => {
    const applied = rrhBuffs(nBase.events, 'attackDamagePct', NOB1_RRH).filter((b) => b.value === 8.02);

    it('fills the B1 slot — she casts her burst at STAGE 1 in noB1', () => {
      const stages = rrhBursts(nBase.events).map((b) => b.stage);
      expect(stages.length, 'noB1 chain never opened — rrh did not fill B1').toBeGreaterThan(0);
      expect([...new Set(stages)]).toEqual([1]);
    });

    it('grants 8.02% Attack Damage to ALL allies for 10 sec on each FB entry', () => {
      expect(applied.length, 'no noB1 attackDamagePct 8.02 buff applied').toBeGreaterThan(0);
      for (const [, holders] of holdersPerFrame(applied)) {
        expect(holders.size, `reached ${holders.size} allies, expected 3`).toBe(3);
      }
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });

    it('DISCRIMINATING: removing the noB1 FB-enter block erases the team buff', () => {
      expect(rrhBuffs(nNoAssist.events, 'attackDamagePct', NOB1_RRH).filter((b) => b.value === 8.02)).toEqual([]);
    });

    it('DISCRIMINATING: does NOT fire in hasB1 formation, where she casts STAGE 3', () => {
      expect(rrhBuffs(hBase.events, 'attackDamagePct', HASB1_RRH).filter((b) => b.value === 8.02)).toEqual([]);
      expect([...new Set(rrhBursts(hBase.events).map((b) => b.stage))]).toEqual([3]);
    });
  });

  describe('RRH3 — S2 passive: 150.72% attachment / 100.6% explosion route ONLY to the rocket hits', () => {
    const s2 = rrhDmg(hBase.events, 'skill2');
    const attach = s2.filter((d) => near(d.mult.projFactor, PROJ_ATTACH));
    const explode = s2.filter((d) => near(d.mult.projFactor, PROJ_EXPLODE));

    it('attachment hits carry projFactor 2.5072, explosion hits 2.0060', () => {
      expect(attach.length, 'no attachment-flavored rocket hit').toBeGreaterThan(0);
      expect(explode.length, 'no explosion-flavored rocket hit').toBeGreaterThan(0);
    });

    it('normals are never touched by the projectile bucket', () => {
      const normals = rrhDmg(hBase.events, 'normal');
      expect(normals.length).toBeGreaterThan(0);
      expect([...new Set(normals.map((d) => d.mult.projFactor.toFixed(4)))]).toEqual(['1.0000']);
    });

    it('DISCRIMINATING: removing the buffs collapses every rocket projFactor to 1.0', () => {
      const s2p = rrhDmg(hNoProj.events, 'skill2');
      expect(s2p.length).toBeGreaterThan(0);
      expect([...new Set(s2p.map((d) => d.mult.projFactor.toFixed(4)))]).toEqual(['1.0000']);
    });
  });

  describe('RRH4 — S2 rocket: 88.11% attachment (no core) + 88.11% explosion (stored, core ×0.33, crits)', () => {
    const s2 = rrhDmg(hBase.events, 'skill2');
    const attach = s2.filter((d) => near(d.mult.projFactor, PROJ_ATTACH));
    const explode = s2.filter((d) => near(d.mult.projFactor, PROJ_EXPLODE));
    const isMultipleOf8811 = (a: number) => Math.abs(a / 88.11 - Math.round(a / 88.11)) < 1e-6;

    it('every rocket instance is an integer multiple of 88.11% of final ATK', () => {
      expect(s2.length).toBeGreaterThan(0);
      for (const d of s2) expect(isMultipleOf8811(d.atkPct), `atkPct ${d.atkPct} not ×88.11`).toBe(true);
    });

    it('the attachment is immediate and does NOT core; the explosion cores at ×0.33', () => {
      expect(attach.every((d) => d.coreEligible === false), 'attachment must not core').toBe(true);
      expect(explode.every((d) => d.coreEligible === true), 'explosion must core').toBe(true);
      expect([...new Set(explode.map((d) => d.coreRate.toFixed(3)))]).toEqual(['0.330']);
    });

    it('both flavors crit-eligible (the stored explosion is NOT crit-exempt)', () => {
      expect(attach.every((d) => d.critEligible)).toBe(true);
      expect(explode.every((d) => d.critEligible)).toBe(true);
    });

    it('DISCRIMINATING: removing the storedHit erases every explosion-flavor instance', () => {
      const explodeGone = rrhDmg(hNoExpl.events, 'skill2').filter((d) => near(d.mult.projFactor, PROJ_EXPLODE));
      expect(explodeGone).toEqual([]);
      expect(hNoExpl.totals[SLUG]).toBeLessThan(hBase.totals[SLUG]);
    });
  });

  describe('RRH5 — burst Stage 3: 2808% of final ATK, flighted INSIDE the FB window, once per cast', () => {
    const nukes = rrhDmg(hBase.events, 'burst');
    const casts = rrhBursts(hBase.events);

    it('fires once per burst cast at the kit magnitude, in the burst bucket', () => {
      expect(casts.length).toBeGreaterThan(0);
      expect(nukes.length).toBe(casts.length);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([2808]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('takes the +50% Full Burst major (it lands ~0.4s after the cast, inside the window)', () => {
      expect(nukes.every((d) => d.fbMajorApplied), 'nuke must land inside FB').toBe(true);
      expect(nukes.every((d) => d.critEligible)).toBe(true);
    });

    it('DISCRIMINATING: removing the stage-3 block erases her burst-bucket damage', () => {
      expect(rrhDmg(hNoNuke.events, 'burst')).toEqual([]);
      expect(hNoNuke.totals[SLUG]).toBeLessThan(hBase.totals[SLUG]);
    });
  });

  describe('RRH6 — burst Stage 1: ATK ▲18.01% of caster ATK to ALL allies (noB1 only)', () => {
    const applied = rrhBuffs(nBase.events, 'casterAtkPct', NOB1_RRH);

    it('reaches all three allies for 10 sec, in noB1 (stage 1)', () => {
      expect(applied.length, 'no stage-1 casterAtkPct grant').toBeGreaterThan(0);
      for (const [, holders] of holdersPerFrame(applied)) {
        expect(holders.size, `reached ${holders.size} allies, expected 3`).toBe(3);
      }
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });

    it('is 18.01% of caster ATK (magnitude pinned vs the 11.16 counterfactual)', () => {
      const wrong = rrhBuffs(nCasterWrong.events, 'casterAtkPct', NOB1_RRH);
      expect(wrong.length).toBeGreaterThan(0);
      const ratio = applied[0].value / wrong[0].value;
      expect(ratio).toBeCloseTo(18.01 / 11.16, 4);
    });

    it('DISCRIMINATING: does NOT fire in hasB1 formation (stage-3 cast)', () => {
      expect(rrhBuffs(hBase.events, 'casterAtkPct', HASB1_RRH)).toEqual([]);
    });
  });
});

```

### 7b. src/skills/overrides/rapi-red-hood.json (the encoding under test)

```json
{
  "note": "Whole-kit model; her three skills only make sense together. S1 Combat Assist: with NO Burst 1 ally she fills the B1 slot (stage-1 eligibility) and grants team CDR 7.48s + Attack Damage 8.02% on each full burst; WITH a B1 ally she instead self-buffs ATK 95.04% on full burst. S2: counts as elementally advantaged vs Electric, and launches an attachable rocket off a fill meter (one rocket per 120 normal attacks OUT of Full Burst, per 60 IN her FB — countInFb:60; each rocket = 88.11% attach [immediate] + 88.11% explosion [stored], scaled by her passive attachment/explosion buffs). MECHANIC (owner-measured red rocket meter, 2026-07-15): the meter right of the crosshair fills 0->100%; at 100% one rocket attaches. A rocket that attaches DURING Full Burst explodes INSTANTLY (storedHit.instantInFb); rockets attached OUT of burst do NOT explode until FB begins, so they ACCUMULATE and the FIRST explosion of each FB is a BATCH of all accumulated rockets. Meter carries over across the FB boundary (the faster in-FB threshold just consumes the accrued fill). 2026-07-14 STRUCTURAL CORRECTIONS (MEASURED): (1) the 2808% burst nuke is a FLIGHTED missile landing ~0.4s post-banner INSIDE her window at the full buffed state (delaySec 0.4 — landing-time snapshot grants FB +0.5, entry auras; recipe fits 27.9M/25.1M/32.0M at +0.02%/−0.4%/+1.1%) and is CHARGE-GATED (requiresPulls 120 — fire-weak banner-1 at ~68 shots had no nuke; every >=120 banner did); (2) her burst's +421.2% attachment self-buff is MEASURED-INERT on every visible class (0.13% precision, 3 comps) — REMOVED (dead datamine entry 101631006; the same-branch S1 +95.04 IS live). 2026-07-16 INVISIBLE-X REOPEN — LANDED (Fable pre-op APPROVED-W-6-REVISIONS; MEASURED core fraction; whole-picture reconciliation). Replaced the OLD magnitude hack — a fictional stage-3 2s dot pair + a storedHit charges:5 batch whose popups were invented placeholders standing in for the ~44-52% no-popup 'invisible X'. Now her explosion damage is DERIVED from the real S2 rocket mechanic, not fit: (a) MEASURED explosion core fraction ~1/3 (0.30-0.45, N=9; docs/probe-data/rrh-explosion-core.json) applied as storedHit.core:0.33 on the coreOverride path — aim/range-INDEPENDENT, NOT the weapon/band acr table (explosions detonate on the boss body regardless of aim); explosions DO core but MOSTLY don't (white body dominant, red 'CORE HIT' the minority). Earlier 'near-full coring' was a ~3× over-assumption — corrected. (b) 120->60 in-FB cadence (countInFb:60) so rockets generate 2× inside FB where they instantly explode; instances are now DERIVED from her wind-up-aware shot count, not fit. (c) storedHit.instantInFb:true — the new permanent in-FB release path detonates in-burst attaches immediately (was ENV.XINSTEXPL experiment-only). This does NOT contradict the landed 'stickies never core' ruling — that was the small out-of-burst ATTACH class (~340-620k, still no core), a DIFFERENT hit type from the in-burst EXPLOSION. RESIDUAL IS A PREDICTION, NOT A FIT (Fable R6): the recorded totals (~899.6M solo-class) are the target but the corrected mechanic under-shoots — the exposed residual is left visible, part of it likely generic MG-cold (board ~0.947) and part the OBSERVED-but-unmodeled explosion CRIT (measurement showed crit steps ×1.5 on explosion bodies; NOT modeled here — outside the approved core-only plan, deferred to its own Fable-gated pass). Do NOT trim the 0.33 fraction or inflate atkPct to zero the residual. CARRYOVER SEMANTICS (Fable post-op note): the 2×-faster in-FB meter is modeled as a THRESHOLD switch (120->60), not a +2-fill-per-hit rate — these agree in steady state but differ at the FB boundary (a meter carried in ≥60 can double-fire on FB entry); rocket count is conserved to O(1), only cross-boundary timing moves. A future meter-carryover measurement can discriminate the two. CRIT LANDED (2026-07-16, Fable pre-op ACCEPTED under a CONSISTENCY framing + blind post-op): explosions crit like every other hit (storedHit.crit:true). JUSTIFICATION is consistency, NOT the ×1.5 magnitude — that step (6,621,606/4,414,404) is CONFOUNDED (bodies span 1.6-4.5M across multiple sub-hit coefficients, so it may be a mis-associated sub-hit ratio, not a clean crit pair). What IS solid: explosions crit (orange bodies observed), and every OTHER RRH hit (normals, attachment, nuke) already crits additively at her sheet rate in the validated model — only the storedHit release was crit-OFF, an artifact exemption of the stored-hit path. So this REMOVES the exemption; no new mechanic, no new constant (uses her sheet crit rate on the existing additive path). EMPIRICAL: the sim explosion body (~2.75M in FB2) is UNDER the measured white 4,414,404 — the explosion is under-modeled, so crit legitimately moves toward 1.0 from below (NOT over-credit; FB +50% on explosions is corroborated, stripping it worsens the fit). Impact: T7 0.81→0.83, N1 0.98→0.99, T3 0.91→0.92, T8 0.90→0.91 (uniform +0.01-0.02, MG-cold residual PRESERVED — T7 stays 0.83, well under the 0.90 residual-preservation guard). LEDGERED as a FOUNDATIONAL open item (U15, does NOT block): whether the game's crit/core bracket is additive (as the sim models) or multiplicative — the ×1.80 core+crit body (7,948,092) doesn't cleanly compose under additive constants; this applies to ALL 86 readings, not just explosions, bounded ~0.3-0.4% of her total. Kit-autonomy gauntlet 2026-07-25: test-first independent re-derivation (scripts/tests/units/rapi-red-hood.test.ts, 20 pins across both formation branches) cross-family corroborated (S2b fable / S5-S6-S7 opus); structure converged, residual deltas measurement-gated (flighted-nuke FB timing, +421.2% measured-inert removal, explosion core 0.33 + crit, batch-accumulation vs prose 'Max Ammo:1').",
  "unmodeled": {
    "skill1": [
      "Damage to Interruption Parts ▲48% for 10 sec (self; activates when entering Full Burst while NOT in Combat Assist, i.e. team has a Burst I ally)"
    ],
    "skill2": ["Attachable Projectile — Max Ammo: 1"],
    "burst": [
      "Explosion Radius ▲100.62% for 10 sec (self; Burst Stage 1)",
      "Explosion Radius ▲100.62% for 10 sec (self; Burst Stage 3 — a second, separate kit line from the Stage 1 instance; inert on the partless boss)"
    ]
  },
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "passive"
      },
      "target": {
        "kind": "self"
      },
      "formation": "noB1",
      "effects": [
        {
          "kind": "burstEligibility",
          "stage": 1
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "fullBurstEnter"
      },
      "target": {
        "kind": "allies"
      },
      "formation": "noB1",
      "effects": [
        {
          "kind": "burstCdr",
          "seconds": 7.48
        },
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 8.02,
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "fullBurstEnter"
      },
      "target": {
        "kind": "self"
      },
      "formation": "hasB1",
      "effects": [
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 95.04,
          "durationSec": 10
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
          "kind": "advantageVs",
          "element": "Electric"
        },
        {
          "kind": "buff",
          "stat": "projectileAttachmentPct",
          "value": 150.72
        },
        {
          "kind": "buff",
          "stat": "projectileExplosionPct",
          "value": 100.6
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "hitCount",
        "count": 120,
        "countInFb": 60
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 88.11,
          "flavor": "projectileAttachment"
        },
        {
          "kind": "storedHit",
          "atkPct": 88.11,
          "flavor": "projectileExplosion",
          "core": 0.33,
          "crit": true,
          "instantInFb": true
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
        "kind": "self"
      },
      "effects": [
        {
          "kind": "burstCdr",
          "seconds": 20
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
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 18.01,
          "durationSec": 10
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
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 2808,
          "delaySec": 0.4,
          "requiresPulls": 120
        }
      ]
    }
  ]
}

```
