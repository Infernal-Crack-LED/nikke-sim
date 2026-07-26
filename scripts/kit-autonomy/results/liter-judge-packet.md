# S7 RECONCILING-JUDGE PACKET — unit `liter` (Liter)
# Assembled by the gauntlet driver. You are the BINDING cross-family judge (kimi-code/k3).
# Grade the DRIVER's implementation against the kit prose + the mechanics SSOT, reconciling the two blind re-derivations.
# Return the binding verdict JSON per the contract in section 1.

================================================================================
## SECTION 1 — RECONCILING-JUDGE CONTRACT (your role + return JSON shape)
================================================================================
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


================================================================================
## SECTION 2 — MECHANICS SOURCE-OF-TRUTH (grade faithfulness against these)
================================================================================
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


================================================================================
## SECTION 3 — GROUND TRUTH: kit prose + base stats (data/characters.json -> characters.liter)
================================================================================
Unit: Liter (liter) — SMG / Supporter / Iron / Burst I
baseStats: hp 15000 / atk 500 / def 86; critRate 15 / critDamage 150
burstCooldownSec 20; ammo 120; reloadFrames 111; chargeFrames 0; hitsPerShot 1; normalAttackMultiplier 8.73; coreAttackMultiplier 200; burstGaugePerShot 0.1
skillCooldownsSec: {"skill1":null,"skill2":15,"burst":20}

skill1:
■ Activates when entering Full Burst. Affects all allies.
Effects vary according to the number of times entered. Each subsequent effect triggers all effects before it:
Once: Cooldown of Burst Skill ▼ 2.34 sec.
Twice: Cooldown of Burst Skill ▼ 2.7 sec.
Three times: Cooldown of Burst Skill ▼ 3.17 sec.
■ Activates when using Burst Skill. Affects all allies.
Effects vary according to the number of times used. Each subsequent effect triggers all effects before it:
Once: Max Ammunition Capacity ▲ 45.17% for 5 sec.
Twice: Critical Damage ▲ 12.46% for 5 sec.
Three times: ATK ▲ 14.42% for 5 sec.

skill2:
■ Affects 2 ally unit(s) with the lowest remaining cover HP.
Restores 52.5% of Cover HP.

burst:
■ Affects all allies.
ATK ▲ 66% for 5 sec.

================================================================================
## SECTION 4 — S2b cross-family test-faithfulness REVIEW (claude-fable-5) + driver reconciliation
================================================================================
{
  "slug": "liter",
  "stage": "S2c-reconciliation",
  "date": "2026-07-26",
  "reviewerModel": "claude-fable-5",
  "driverModel": "qwen",
  "leakDetected": null,
  "reconciliation": {
    "converged": true,
    "summary": "Blind claude-fable-5 re-derivation converges with the driver on EVERY kit line — dispositions, triggers, target sets, durations, cumulative-ladder semantics, and the nearest-wrong counterfactuals all match. No REAL-GOTCHA. The reviewer independently named the same traps the driver's test pins: non-cumulative 3.17s-vs-8.21s CDR misread, burstCast-vs-fullBurstEnter timing (count-coincident in the 4-unit controlComp because liter is the sole B1, separable only by frame-level assertion), the maxAmmo weapon-state line that must not be dropped as defensive, the 5s-vs-10s duration inflation trap, and the skill2 cover-restore-must-not-be-a-heal trap (would fire crown's on-recovery consumers).",
    "lineByLine": [
      {
        "line": "S1 block A — FB-enter burst-CD ladder 2.34/2.7/3.17s cumulative",
        "driver": "FAITHFUL (escalating burstCdr [2.34,2.7,3.17], trigger fullBurstEnter, target allies, cumulative-with-cap min(N,3) -> 8.21s from 3rd FB)",
        "reviewer": "FAITHFUL, load-bearing (cumulative 2.34/5.04/8.21s, fullBurstEnter, all allies incl. self, saturates at tier 3 but keeps firing every FB)",
        "agree": true
      },
      {
        "line": "S1 block B — burstCast escalating buffs maxAmmo 45.17% / critDmg 12.46% / atk 14.42%, 5s",
        "driver": "FAITHFUL (escalating buff steps, trigger burstCast, target allies, each 5s, cumulative; ramps to all three by 3rd cast)",
        "reviewer": "FAITHFUL, load-bearing (burstCast, all allies, 5s durationSec, cumulative; 3rd cast emits all three in the same frame; atkPct raw % not caster-flat)",
        "agree": true
      },
      {
        "line": "S2 — 2 lowest cover-HP allies restore 52.5% cover",
        "driver": "UNMODELED NO-OP (owner ruling 2026-07-21: cover HP not unit HP, no sim HP pool, must not fire recovery consumers; recorded verbatim in unmodeled)",
        "reviewer": "UNMODELED (cover durability only, no cover-HP pool in v1, must NOT be encoded as a heal — would fire crown's on-recovery consumers; no activation clause in prose so any modeled trigger would be invented)",
        "agree": true
      },
      {
        "line": "Burst — all allies ATK ▲ 66% for 5s",
        "driver": "FAITHFUL (buff atkPct 66, 5s, trigger burstCast, target allies)",
        "reviewer": "FAITHFUL, load-bearing (atkPct 66 raw %, burstCast stage 1, all allies, durationSec 5 NOT the 10s FB window — lapses mid-FB)",
        "agree": true
      }
    ],
    "blindFixtureSizeSlip": "Reviewer guessed 'all 5 units' / '5 targets' in two distinguishingAssertions; the harness controlComp is 4 units (liter/crown/carry/helm). A blind fixture-size guess, NOT a kit-faithfulness divergence — the driver's test correctly uses TEAM_SIZE=4 and asserts all 4 allies. No action.",
    "verdict": "GO",
    "verdictBasis": "All lines accounted for (7 FAITHFUL pinned + 1 UNMODELED-with-ruling), dispositions converge cross-family, no REAL-GOTCHA, leak check clean, discrimination strong (driver test is GREEN vs shipped and RED vs the exact counterfactuals the reviewer independently named)."
  }
}


================================================================================
## SECTION 5 — S5 BLIND TEST (claude-opus-5) + its green/red count vs the driver override + reconciliation
================================================================================
S5 blind test (scripts/kit-autonomy/blind/liter.test.ts) run vs the DRIVER override: 21 tests = 10 passed / 8 failed / 3 skipped.
RECONCILIATION (full detail in scripts/kit-autonomy/reviews/liter.s5-reconciliation.json): ALL 8 failures are de-contamination / event-shape artifacts, NOT faithfulness divergences:
  [1][2][5] structural assertions search TOP-LEVEL block.effects for burstCdr/buff and find 0 carriers, because the driver nests both ladders inside {kind:'escalating', steps:[...]} and the blind traversal never descends into e.steps (escalating was redacted from the blind schema).
  [3][4][6] patch-counterfactuals (strip CDR / retarget self / zero tier-3 ATK) filter/zero TOP-LEVEL effects, so they are NO-OPS against the escalating wrapper -> patched run is byte-identical to base -> strict-inequality assertions tie (11==11 FB count; identical carry total).
  [7][8] expect(durationShots).toBeUndefined() but the engine emits durationShots:null for time-based buffs (event-shape convention guess; the companion finite-expiresFrame assertions hold and the 'permanent encoding over-credits' test PASSES).
CORROBORATING PASSES (event-stream, structure-independent — these independently confirm the driver override): cumulative tier1 maxAmmo 45.17% fires EVERY cast to all allies incl self; tier2 critDmg 12.46% starts one cast later and never stops; tier3 atkPct 14.42% starts two casts later and never stops; burst 66% ATK moves BOTH teammate and self damage; narrowing burst to self costs the carry but leaves liter byte-identical; the 5s window is real (permanent over-credits); skill2 is offensively inert (totals byte-identical with/without -> no recovery consumer fired).

### 5b. S5 blind test source (scripts/kit-autonomy/blind/liter.test.ts)
```ts
/**
 * liter - BLIND kit-spec test (S5 post-op author). Written from the kit prose ALONE:
 * no sight of the driver's override, the driver's tests, or any truth file.
 *
 * KIT LINES (structure as read off the prose)
 *  s1-A  header 'Activates when entering Full Burst' + 'Affects all allies'.
 *        Cumulative burst-cooldown reduction, tiered by entry count, and the prose says
 *        'Each subsequent effect triggers all effects before it' => the tiers ADD, they do
 *        NOT replace: entry 1 = -2.34s, entry 2 = -2.34-2.7 = -5.04s, entry 3+ = -8.21s.
 *  s1-B  header 'Activates when using Burst Skill' + 'Affects all allies'. Cumulative again,
 *        every tier 'for 5 sec': cast 1 = Max Ammunition +45.17%; cast 2 = that PLUS Critical
 *        Damage +12.46%; cast 3 and later = that PLUS ATK +14.42%.
 *  s2    'Affects 2 ally unit(s) with the lowest remaining cover HP' / 'Restores 52.5% of Cover HP.'
 *  burst 'Affects all allies.' / 'ATK 66% for 5 sec.'
 *
 * FIXTURE
 *  controlComp('rapi-red-hood', true). liter OCCUPIES THE B1 SLOT OF controlComp BY
 *  CONSTRUCTION, so the carry argument must be a DIFFERENT unit - a Burst III carry is required
 *  anyway (a lone B3 makes zero Full Bursts) and a long-cooldown B3 is what makes liter's burst-CD
 *  reduction actually bite. helm=true keeps the 4-unit team so the gauge fills fast enough that the
 *  BURST COOLDOWN, not the gauge, is the binding constraint - otherwise a CDR test cannot discriminate.
 *  Deterministic (no seed). Every counterfactual below is damage-only (shot counts and rotation are
 *  untouched, so strict damage inequalities are safe) EXCEPT the two CDR patches, which are expected
 *  to move the rotation and are therefore judged on Full-Burst counts.
 *
 * WHY EACH ASSERTION DISCRIMINATES - see the per-test comments. The recurring nearest-wrong models
 * covered here: tiers-replace instead of tiers-accumulate; all tiers from cast 1 (no tiering);
 * the s1-B tiers keyed to full-burst-enter instead of the owner's OWN burst cast (over-credits in
 * any multi-burst comp); 'all allies' narrowed to self; 'for 5 sec' encoded as permanent; a plain
 * percentage stat encoded as a caster-scaled one (which would emit a flat ATK number instead of 66).
 *
 * SHAPE DEFENSE: the two harness briefs disagree on whether an override slot is a bare Block[] or a
 * CharacterSkills carrying .blocks, so blocksOf() handles both rather than guessing. Likewise the
 * event sink is wired on BOTH opts.onEvent and opts.cfg.onEvent into SEPARATE arrays, and the cfg
 * one wins when populated - so if the engine honours both, events are never double-counted (the
 * count arithmetic below would silently break if they were).
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

const LITER = 'liter';
const CARRY = 'rapi-red-hood';

const SLOTS = ['skill1', 'skill2', 'burst'] as const;

const near = (a: number, b: number) => typeof a === 'number' && Math.abs(a - b) < 0.005;

const blocksOf = (ov: any, slot: string): any[] => {
  const s = ov?.[slot];
  if (!s) return [];
  if (Array.isArray(s)) return s;
  if (Array.isArray(s.blocks)) return s.blocks;
  return [];
};

const eachBlock = (ov: any, fn: (b: any) => void) => {
  for (const slot of SLOTS) for (const b of blocksOf(ov, slot)) fn(b);
};

const eachEffect = (ov: any, fn: (eff: any, block: any) => void) => {
  eachBlock(ov, (b) => {
    for (const e of b?.effects ?? []) fn(e, b);
  });
};

type Run = { res: any; events: any[] };

function run(patch?: Record<string, any>): Run {
  const base: any = controlComp(CARRY, true);
  const viaTop: any[] = [];
  const viaCfg: any[] = [];
  const opts: any = {
    ...base,
    overrides: { ...(base.overrides ?? {}), ...(patch ?? {}) },
    onEvent: (ev: SimEvent) => viaTop.push(ev),
    cfg: { ...(base.cfg ?? {}), onEvent: (ev: SimEvent) => viaCfg.push(ev) },
  };
  const res = runComp(opts);
  return { res, events: viaCfg.length ? viaCfg : viaTop };
}

const evOf = (r: Run, kind: string) => r.events.filter((e: any) => e.kind === kind);
const buffsOf = (r: Run) => evOf(r, 'buffApply');
const fbStarts = (r: Run) => evOf(r, 'fullBurstStart');

// ---------------------------------------------------------------- counterfactual overrides

// Reader clone: an empty mutate returns an untouched deep clone of the committed override.
const literOv: any = withPatchedOverride(LITER, () => {});

// s1-A: strip every burst-cooldown reduction.
const ovNoCdr = withPatchedOverride(LITER, (ov: any) => {
  eachBlock(ov, (b) => {
    if (Array.isArray(b?.effects)) b.effects = b.effects.filter((e: any) => e.kind !== 'burstCdr');
  });
});

// s1-A nearest-wrong: 'Affects all allies' narrowed to the caster.
const ovCdrSelfOnly = withPatchedOverride(LITER, (ov: any) => {
  eachBlock(ov, (b) => {
    if ((b?.effects ?? []).some((e: any) => e.kind === 'burstCdr')) b.target = { kind: 'self' };
  });
});

// burst: neutralise the 66% ATK.
const ovBurstAtkZero = withPatchedOverride(LITER, (ov: any) => {
  eachEffect(ov, (e: any) => {
    if (e.kind === 'buff' && e.stat === 'atkPct' && near(e.value, 66)) e.value = 0;
  });
});

// burst nearest-wrong: 'all allies' narrowed to self.
const ovBurstAtkSelfOnly = withPatchedOverride(LITER, (ov: any) => {
  eachEffect(ov, (e: any, b: any) => {
    if (e.kind === 'buff' && e.stat === 'atkPct' && near(e.value, 66)) b.target = { kind: 'self' };
  });
});

// burst nearest-wrong: 'for 5 sec' encoded as permanent.
const ovBurstAtkPermanent = withPatchedOverride(LITER, (ov: any) => {
  eachEffect(ov, (e: any) => {
    if (e.kind === 'buff' && e.stat === 'atkPct' && near(e.value, 66)) {
      delete e.durationSec;
      delete e.durationShots;
    }
  });
});

// s1-B tier 3: neutralise the 14.42% ATK.
const ovTierAtkZero = withPatchedOverride(LITER, (ov: any) => {
  eachEffect(ov, (e: any) => {
    if (e.kind === 'buff' && e.stat === 'atkPct' && near(e.value, 14.42)) e.value = 0;
  });
});

// s2: remove the cover-HP restore entirely.
const ovNoSkill2 = withPatchedOverride(LITER, (ov: any) => {
  if (Array.isArray(ov.skill2)) ov.skill2 = [];
  else if (ov.skill2 && Array.isArray(ov.skill2.blocks)) ov.skill2.blocks = [];
});

// ---------------------------------------------------------------- hoisted runs (8 sims)

const base = run();
const rNoCdr = run({ [LITER]: ovNoCdr });
const rCdrSelf = run({ [LITER]: ovCdrSelfOnly });
const rBurstZero = run({ [LITER]: ovBurstAtkZero });
const rBurstSelf = run({ [LITER]: ovBurstAtkSelfOnly });
const rBurstPerm = run({ [LITER]: ovBurstAtkPermanent });
const rTierZero = run({ [LITER]: ovTierAtkZero });
const rNoS2 = run({ [LITER]: ovNoSkill2 });

const teamSize = Object.keys(totals(base.res)).length;
const baseBuffs = buffsOf(base);
const ammoEvents = baseBuffs.filter((e: any) => e.stat === 'maxAmmoPct' && near(e.value, 45.17));
const literIdx = ammoEvents[0]?.casterIdx;
const literBuffs = baseBuffs.filter((e: any) => e.casterIdx === literIdx);
const critEvents = literBuffs.filter((e: any) => e.stat === 'critDamagePct' && near(e.value, 12.46));
const tierAtkEvents = literBuffs.filter((e: any) => e.stat === 'atkPct' && near(e.value, 14.42));
const burstAtkEvents = literBuffs.filter((e: any) => e.stat === 'atkPct' && near(e.value, 66));
const literCasts = teamSize > 0 ? ammoEvents.length / teamSize : 0;

describe('liter - fixture sanity (non-vacuity guards)', () => {
  it('the event sink is wired and liter is in the comp', () => {
    // If this fails, every count assertion below would pass vacuously.
    expect(base.events.length).toBeGreaterThan(0);
    expect(unitOf(base.res, LITER).totalDamage).toBeGreaterThan(0);
    expect(teamSize).toBeGreaterThanOrEqual(4);
  });

  it('liter casts her burst at least 3 times, so all three cumulative tiers are exercised', () => {
    // Tier 3 ('Three times') is unreachable in a fixture with fewer than 3 casts; without this
    // guard the tier-3 assertions would test nothing.
    expect(ammoEvents.length).toBeGreaterThan(0);
    expect(Number.isInteger(literCasts)).toBe(true);
    expect(literCasts).toBeGreaterThanOrEqual(3);
  });

  it('the team enters Full Burst at least 3 times, so all three CDR tiers are exercised', () => {
    expect(fbStarts(base).length).toBeGreaterThanOrEqual(3);
  });
});

describe("liter s1-A - 'Activates when entering Full Burst' burst-cooldown reduction, all allies", () => {
  it('is modelled as burstCdr on a fullBurstEnter trigger targeting all allies', () => {
    // Trigger identity is the taxonomy trap here and it is NOT behaviourally separable in this
    // fixture (liter is the B1, so every one of her casts leads to a Full Burst - burstCast and
    // fullBurstEnter fire the same number of times, ~1.5s apart). The primitive choice is
    // therefore asserted structurally: 'entering Full Burst' has exactly one right trigger.
    const carriers: any[] = [];
    eachBlock(literOv, (b) => {
      if ((b?.effects ?? []).some((e: any) => e.kind === 'burstCdr')) carriers.push(b);
    });
    expect(carriers.length).toBeGreaterThan(0);
    for (const b of carriers) {
      expect(b.trigger?.kind).toBe('fullBurstEnter');
      expect(b.target?.kind).toBe('allies');
      expect(b.target?.excludeSelf ?? false).toBe(false);
    }
  });

  it('uses only magnitudes from the kit ladder and is not a once-per-battle effect', () => {
    // The ladder is 2.34 / 2.7 / 3.17 as increments, or 2.34 / 5.04 / 8.21 as running totals -
    // both are legitimate authorings of the same behaviour, so the assertion is that EVERY
    // authored magnitude comes from that set (catches a fudged or rounded number) and that the
    // top tier is present. RED under a flat-2.34-forever model, which never reaches 3.17.
    const secs: number[] = [];
    eachEffect(literOv, (e: any) => {
      if (e.kind === 'burstCdr') {
        secs.push(e.seconds);
        expect(e.oncePerBattle ?? false).toBe(false); // fires on EVERY Full Burst entry
      }
    });
    expect(secs.length).toBeGreaterThan(0);
    const ladder = [2.34, 2.7, 3.17, 5.04, 8.21];
    for (const s of secs) expect(ladder.some((l) => near(s, l))).toBe(true);
    expect(secs.some((s) => s >= 3.17 - 0.005)).toBe(true);
  });

  it('actually accelerates the rotation - stripping it costs Full Bursts', () => {
    // The headline claim. GREEN when the CDR binds the rotation; RED if the reduction is absent,
    // inert, or applied to a target set that never gates the chain.
    expect(fbStarts(base).length).toBeGreaterThan(fbStarts(rNoCdr).length);
  });

  it("reaches TEAMMATES - 'all allies', not the caster alone", () => {
    // Nearest-wrong: target {kind:'self'}. liter's own 20s cooldown is not what gates the chain
    // (the Burst III carry's is), so a self-only CDR must yield strictly fewer Full Bursts.
    expect(fbStarts(rCdrSelf).length).toBeLessThan(fbStarts(base).length);
  });

  it.skip('exact cumulative ladder 2.34 / 5.04 / 8.21 per entry index - UNOBSERVABLE', () => {
    // burstCdr emits no event; only its downstream effect on rotation timing is visible, and the
    // per-entry magnitude cannot be separated from the gauge/chain constraints. The magnitude set
    // + the accumulate-vs-replace shape are covered structurally above; pinning the per-entry
    // value needs either a burstCdr event kind or a measured Full-Burst timeline.
  });
});

describe("liter s1-B - 'Activates when using Burst Skill' cumulative 5s buffs, all allies", () => {
  it('is keyed to the OWNER-S OWN burst cast, not to full-burst entry', () => {
    // Taxonomy trap 3: 'when using Burst Skill' is burstCast. Keying it to fullBurstEnter
    // over-credits in any comp where another unit completes the chain. Structural, for the same
    // reason as s1-A: the two triggers are behaviourally degenerate in this fixture.
    const carriers: any[] = [];
    eachBlock(literOv, (b) => {
      const hit = (b?.effects ?? []).some(
        (e: any) =>
          e.kind === 'buff' &&
          ((e.stat === 'maxAmmoPct' && near(e.value, 45.17)) ||
            (e.stat === 'critDamagePct' && near(e.value, 12.46)) ||
            (e.stat === 'atkPct' && near(e.value, 14.42))),
      );
      if (hit) carriers.push(b);
    });
    expect(carriers.length).toBeGreaterThan(0);
    for (const b of carriers) {
      expect(b.trigger?.kind).toBe('burstCast');
      expect(b.target?.kind).toBe('allies');
      expect(b.target?.excludeSelf ?? false).toBe(false);
    }
  });

  it('tier 1 Max Ammunition 45.17% fires on EVERY cast, to every ally including liter', () => {
    // 'Each subsequent effect triggers all effects before it' => tier 1 never stops firing.
    // RED under replace-semantics (ammo only on cast 1) and under an excludeSelf target.
    expect(ammoEvents.length).toBe(literCasts * teamSize);
    const targets = new Set(ammoEvents.map((e: any) => e.targetIdx));
    expect(targets.size).toBe(teamSize);
    expect(targets.has(literIdx)).toBe(true);
    for (const e of ammoEvents) expect(e.stat).toBe('maxAmmoPct'); // %, not maxAmmoFlat rounds
  });

  it('tier 2 Critical Damage 12.46% starts one cast LATER and then never stops', () => {
    // The cumulative shape encoded as arithmetic: casts 2..n => exactly one cast fewer than ammo.
    // RED under 'all three from cast 1' (counts would be equal) and under replace-semantics
    // (crit would fire on cast 2 only, i.e. exactly teamSize events).
    expect(critEvents.length).toBe(ammoEvents.length - teamSize);
    expect(critEvents.length).toBeGreaterThan(0);
    const targets = new Set(critEvents.map((e: any) => e.targetIdx));
    expect(targets.size).toBe(teamSize);
  });

  it('tier 3 ATK 14.42% starts two casts later and then never stops', () => {
    // casts 3..n. RED under replace-semantics, under no-tiering, and under an off-by-one gate
    // (e.g. a resource counter incremented AFTER the gated blocks read it).
    expect(tierAtkEvents.length).toBe(ammoEvents.length - 2 * teamSize);
    expect(tierAtkEvents.length).toBeGreaterThan(0);
    const targets = new Set(tierAtkEvents.map((e: any) => e.targetIdx));
    expect(targets.size).toBe(teamSize);
  });

  it('tier 3 ATK is a plain percentage buff that moves teammate damage', () => {
    // Nearest-wrong 1: casterAtkPct/highestAllyAtkPct, which would re-emit as a FLAT ATK number
    // (thousands), not 14.42. Nearest-wrong 2: authored but inert.
    for (const e of tierAtkEvents) expect(e.value).toBeCloseTo(14.42, 3);
    expect(literBuffs.filter((e: any) => e.stat === 'casterAtkPct')).toHaveLength(0);
    expect(totals(rTierZero.res)[CARRY]).toBeLessThan(totals(base.res)[CARRY]);
  });

  it("all three tiers are second-based windows, not round-count windows", () => {
    // Taxonomy trap 2: 'for 5 sec' is wall-clock. durationShots must be absent, and a finite
    // expiry must exist (a permanent encoding would carry no finite expiresFrame).
    for (const e of [...ammoEvents, ...critEvents, ...tierAtkEvents]) {
      expect(e.durationShots).toBeUndefined();
      expect(Number.isFinite(e.expiresFrame)).toBe(true);
    }
  });
});

describe("liter s2 - 'Restores 52.5% of Cover HP' to the 2 lowest-cover-HP allies", () => {
  it('is offensively inert in the control comp', () => {
    // v1 models no HP pool and no cover, so the restore itself moves nothing. This assertion is
    // ALSO the deliberate adjudication probe for the tandem trap: the control comp contains an
    // on-recovery consumer, so if this line were modelled as a `heal` effect it would fire that
    // consumer's recovery trigger every cycle and this test goes RED. FLAG: cover-HP restoration
    // is read here as NOT an HP recovery (cover HP is a separate resource in game), so it must
    // not emit recovery events. If the owner rules the opposite, this is the line to revisit.
    const b = totals(base.res);
    const n = totals(rNoS2.res);
    for (const slug of Object.keys(b)) expect(n[slug]).toBe(b[slug]);
  });

  it.skip('cover-HP restore amount (52.5%) and the 2-lowest-cover-HP target set - GAP', () => {
    // No cover-HP pool exists in v1 and there is no target kind for 'lowest remaining COVER HP'
    // (alliesLowestHp is the HP-pool analogue, itself a documented stand-in). Unobservable payload.
  });

  it.skip('s2 firing cadence - FLAG: the prose carries NO activation clause', () => {
    // Per the no-activation-clause convention this is an interval trigger at the datamined skill
    // cooldown, but that cooldown is not in this packet (the 20s quoted is the BURST cooldown).
    // Cadence is therefore an always-flag field; it is damage-inert here either way.
  });
});

describe("liter burst - 'ATK 66% for 5 sec' to all allies", () => {
  it('applies ATK 66% once per cast to every ally, as a plain percentage', () => {
    // Same cast count as the tier-1 ammo buff - a cross-check that both ride the same cast.
    // 66 (not a flat ATK number) rules out casterAtkPct / highestAllyAtkPct mis-encoding.
    expect(burstAtkEvents.length).toBe(ammoEvents.length);
    for (const e of burstAtkEvents) {
      expect(e.stat).toBe('atkPct');
      expect(e.value).toBeCloseTo(66, 3);
      expect(e.durationShots).toBeUndefined();
      expect(Number.isFinite(e.expiresFrame)).toBe(true);
    }
    const targets = new Set(burstAtkEvents.map((e: any) => e.targetIdx));
    expect(targets.size).toBe(teamSize);
    expect(targets.has(literIdx)).toBe(true);
  });

  it('moves both teammate and self damage (all allies INCLUDES the caster)', () => {
    // Damage-only patch: shot counts and rotation are unchanged, so both inequalities are strict.
    expect(totals(rBurstZero.res)[CARRY]).toBeLessThan(totals(base.res)[CARRY]);
    expect(totals(rBurstZero.res)[LITER]).toBeLessThan(totals(base.res)[LITER]);
  });

  it("narrowing it to self costs the carry but leaves liter's own damage byte-identical", () => {
    // The clean discriminator for the target set: self-only removes the teammate half and nothing
    // else. If liter's own total moved too, the buff is not reaching her under the faithful model.
    expect(totals(rBurstSelf.res)[CARRY]).toBeLessThan(totals(base.res)[CARRY]);
    expect(totals(rBurstSelf.res)[LITER]).toBe(totals(base.res)[LITER]);
  });

  it("the 5s window is real - a permanent encoding over-credits", () => {
    // Duration semantics. RED if 'for 5 sec' were dropped (buff already permanent => no delta).
    expect(totals(rBurstPerm.res)[CARRY]).toBeGreaterThan(totals(base.res)[CARRY]);
  });
});

```

### 5c. S5 per-failure reconciliation (scripts/kit-autonomy/reviews/liter.s5-reconciliation.json)
{
  "slug": "liter",
  "stage": "S5-blind-test-reconciliation",
  "date": "2026-07-26",
  "blindModel": "claude-opus-5",
  "blindTestPath": "scripts/kit-autonomy/blind/liter.test.ts",
  "runVs": "driver override (src/skills/overrides/liter.json)",
  "tally": { "passed": 10, "failed": 8, "skipped": 3, "total": 21 },
  "leakDetected": null,
  "verdict": "NO-REAL-GOTCHA",
  "rootCause": "The driver wraps BOTH ladders (the S1-block-A burstCdr ladder and the S1-block-B buff ladder) inside a {kind:'escalating', steps:[...]} effect. The 'escalating' union arm in types.ts is commented '// Liter-style \"Once:/Twice:/…\"' — a genuine target-naming line that the de-contamination protocol MUST strip from this unit's blind schema. The blind writer therefore never learned the 'escalating' kind exists, and its override traversal helpers (blocksOf/eachBlock/eachEffect) iterate ONLY top-level block.effects and never descend into e.steps. Every STRUCTURAL assertion that searches top-level effects for burstCdr/buff finds 0 carriers, and every patch-counterfactual that filters/zeroes top-level burstCdr/buff effects is a NO-OP (the escalating wrapper is left untouched), so the patched run is byte-identical to base and the strict-inequality assertions tie.",
  "failureClassification": [
    { "n": 1, "test": "s1-A: modelled as burstCdr on fullBurstEnter targeting all allies", "error": "expected 0 > 0", "class": "escalating-redaction artifact", "why": "eachBlock collects blocks whose TOP-LEVEL effects include kind==='burstCdr'; the burstCdr lives in escalating.steps, so 0 carriers found. Driver override IS burstCdr-on-fullBurstEnter-allies (nested in escalating.steps) — confirmed by driver green test + S2b." },
    { "n": 2, "test": "s1-A: uses only kit-ladder magnitudes, not once-per-battle", "error": "expected 0 > 0", "class": "escalating-redaction artifact", "why": "eachEffect finds no top-level burstCdr → secs[] empty → 0. Driver's nested seconds are exactly 2.34/2.7/3.17." },
    { "n": 3, "test": "s1-A: stripping CDR costs Full Bursts", "error": "expected 11 > 11", "class": "escalating-redaction artifact (no-op patch)", "why": "ovNoCdr filters top-level effects kind!=='burstCdr'; the escalating wrapper is kept, so nothing is removed → rNoCdr ≡ base → 11==11 tie. The CDR was never actually stripped." },
    { "n": 4, "test": "s1-A: reaches teammates, not self alone", "error": "expected 11 < 11", "class": "escalating-redaction artifact (no-op patch)", "why": "ovCdrSelfOnly retargets blocks whose top-level effects include burstCdr; never true (nested) → patch no-op → rCdrSelf ≡ base → tie." },
    { "n": 5, "test": "s1-B: keyed to owner's own burstCast not fullBurstEnter", "error": "expected 0 > 0", "class": "escalating-redaction artifact", "why": "eachBlock searches top-level effects for kind==='buff' with the ladder stats; the buffs are nested in escalating.steps → 0 carriers. The blind test's OWN event-stream assertions confirm burstCast timing behaviourally (tier 1 every cast / tier 2 from cast 2 / tier 3 from cast 3 all PASS)." },
    { "n": 6, "test": "s1-B: tier-3 ATK is a plain % that moves teammate damage", "error": "expected 916908652.208 < 916908652.208 (identical)", "class": "escalating-redaction artifact (no-op patch)", "why": "ovTierAtkZero zeroes top-level buff atkPct~14.42; nested → never found → rTierZero ≡ base → identical carry total. Within the same test, expect(value).toBeCloseTo(14.42) PASSES and casterAtkPct count is 0 (plain %, not caster-flat) — the buff IS a faithful plain-percentage atkPct 14.42; only the damage-differential line ties because the patch is a no-op." },
    { "n": 7, "test": "s1-B: all three tiers are second-based windows", "error": "expected null to be undefined", "class": "event-shape guess", "why": "expect(e.durationShots).toBeUndefined() but the engine emits durationShots:null for time-based buffs. The companion assertion Number.isFinite(e.expiresFrame) holds, and the burst 'permanent encoding over-credits' test PASSES — the 5s time-based window IS real." },
    { "n": 8, "test": "burst: applies ATK 66% once per cast to every ally, plain %", "error": "expected null to be undefined", "class": "event-shape guess", "why": "Same durationShots null-vs-undefined. All OTHER assertions in this test PASS: burstAtkEvents.length===ammoEvents.length (same cast), value≈66, targets===teamSize, includes literIdx. The burst 66% ATK is faithful." }
  ],
  "corroboratingPasses": [
    "fixture sanity (3 guards): event sink wired; liter casts ≥3; team FB ≥3",
    "s1-B tier 1 maxAmmo 45.17% fires on EVERY cast, to every ally including liter, stat is maxAmmoPct (plain %, not maxAmmoFlat)",
    "s1-B tier 2 critDmg 12.46% starts one cast LATER and then never stops (cumulative count = ammo − teamSize)",
    "s1-B tier 3 atkPct 14.42% starts two casts later and then never stops (cumulative count = ammo − 2·teamSize)",
    "s2 offensively inert: totals byte-identical with/without skill2 → no recovery consumer fired (matches owner ruling 2026-07-21)",
    "burst moves BOTH teammate and self damage (all allies includes the caster)",
    "narrowing burst to self costs the carry but leaves liter byte-identical (target = all allies)",
    "the 5s burst window is real — a permanent encoding over-credits"
  ],
  "conclusion": "The blind test's event-stream (structure-independent) assertions independently corroborate the driver's faithful override on every kit line. Its 8 failures are fully explained by (a) the escalating-redaction de-contamination artifact — the blind traversal/patches cannot see effects nested in escalating.steps, so structural searches find 0 and patch-counterfactuals tie base-vs-base — and (b) a durationShots null-vs-undefined event-shape convention guess. None reflects a faithfulness divergence in the driver override. Recommend the S7 judge rule NOT-REAL-GOTCHA and grade faithfulness on the kit prose + event-stream behaviour, not on the structurally-blind patch assertions."
}


================================================================================
## SECTION 6 — S6 BLIND OVERRIDE (claude-opus-5) + diff vs the driver override
================================================================================
DRIVER override (src/skills/overrides/liter.json):
  skill1[0]: trigger fullBurstEnter, target allies, effects=[ {kind:'escalating', steps:[burstCdr 2.34, burstCdr 2.7, burstCdr 3.17]} ]  (cumulative-with-cap min(N,3) -> 2.34 / 5.04 / 8.21 by entry)
  skill1[1]: trigger burstCast, target allies, effects=[ {kind:'escalating', steps:[buff maxAmmoPct 45.17 5s, buff critDamagePct 12.46 5s, buff atkPct 14.42 5s]} ]  (cumulative; all three from 3rd cast)
  skill2: []  (NO-OP; cover-HP restore recorded verbatim in unmodeled.skill2 per OWNER RULING 2026-07-21 — cover HP is not unit HP, emits NO recovery event, must not fire recovery consumers e.g. Crown)
  burst[0]: trigger burstCast, target allies, effects=[ buff atkPct 66 5s ]

BLIND override (scripts/kit-autonomy/blind/liter.override.json):
  skill1[0]: trigger fullBurstEnter, target allies, effects=[ burstCdr seconds:8.21 ]  (FLAT steady-state sum; escalation NOT modeled)
  skill1[1]: trigger burstCast, target allies, effects=[ buff maxAmmoPct 45.17 5s, buff critDamagePct 12.46 5s, buff atkPct 14.42 5s ]  (ALL THREE from cast 1; escalation NOT modeled)
  skill2[0]: trigger interval sec:20, target alliesLowestHp count:2, effects=[ heal ticks:1 ]  (modeled as heal, but flagged ⚑ as the load-bearing risk)
  burst[0]: trigger burstCast, target allies, effects=[ buff atkPct 66 5s ]  (IDENTICAL to driver)

DIFF SUMMARY:
  * Triggers IDENTICAL (fullBurstEnter / burstCast / burstCast). Targets IDENTICAL (allies x3). Buff magnitudes IDENTICAL (45.17/12.46/14.42 + burst 66). Durations IDENTICAL (5s).
  * DIVERGENCE 1 — S1-A CDR ladder: driver = escalating exact ladder [2.34,2.7,3.17] (cumulative 2.34/5.04/8.21); blind = flat 8.21 steady-state. CAUSE: the 'escalating' EffectDef union arm in types.ts is commented "// Liter-style Once:/Twice:/…" — a genuine target-naming line the de-contamination protocol MUST strip for this unit, so the blind writer never learned 'escalating' exists and believed the schema had no Nth-activation gate. The blind writer flagged this as a ⚑ with estimate 8.21 and recipe "add a fromNthActivation gate (or activation-count resource + resourceGate) and split into three blocks at 2.34/2.70/3.17" — i.e. it independently prescribed EXACTLY the 'escalating' encoding the driver implements. The driver is the MORE faithful of the two; the blind flat-8.21 is precisely the nearest-wrong the driver's test discriminates against.
  * DIVERGENCE 2 — S1-B buff ladder: driver = escalating cumulative (ammo only cast1 / +critDmg cast2 / +atk cast3+); blind = all three from cast 1. SAME root cause (escalating redacted). Blind flagged ⚑ with the same recipe.
  * CONVERGENCE on skill2 — driver = NO-OP (owner ruling 2026-07-21); blind = modeled heal BUT flagged as "the single most consequential unknown in this file" and prescribed: "if the consumer's on-recovery buff never applies, remove the heal effect and record the line in unmodeled.skill2 instead." The blind writer independently arrived at the owner ruling as a hypothesis and named the exact discriminator the driver's L3 test pins (no recovery consumer fires with liter as the only source).

### 6b. S6 blind override source (scripts/kit-autonomy/blind/liter.override.json)
```json
{
  "slug": "liter",
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "fullBurstEnter"
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "burstCdr",
          "seconds": 8.21
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "burstCast"
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "maxAmmoPct",
          "value": 45.17,
          "durationSec": 5
        },
        {
          "kind": "buff",
          "stat": "critDamagePct",
          "value": 12.46,
          "durationSec": 5
        },
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 14.42,
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
        "kind": "alliesLowestHp",
        "count": 2
      },
      "effects": [
        {
          "kind": "heal",
          "ticks": 1
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
          "value": 66,
          "durationSec": 5
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [
      "Effects vary according to the number of times entered. Each subsequent effect triggers all effects before it:",
      "Effects vary according to the number of times used. Each subsequent effect triggers all effects before it:"
    ],
    "skill2": [],
    "burst": []
  },
  "caveats": [
    "⚑ Both S1 ladders are modeled at their STEADY-STATE (3rd-activation-onward) magnitude; the schema has no 'from the Nth activation onward' gate, so activations 1 and 2 are over-credited.",
    "⚑ FB-enter burstCdr: true ladder is 2.34 s (1st entry) / 5.04 s (2nd) / 8.21 s (3rd+). Flat 8.21 s over-grants 5.87 s + 3.17 s = 9.04 s of team CDR across the first two Full Bursts — enough to shift early rotation timing and possibly a Full-Burst count.",
    "⚑ Burst-cast ladder: true set is Max Ammo only (1st cast) / +Crit Damage (2nd) / +ATK (3rd+). All three are granted from her first cast.",
    "⚑ S2 has NO activation clause in the kit text — trigger identity is an inference (interval, first fire at t=sec), and the 20 s period is an unmeasured estimate.",
    "⚑ S2 restores COVER HP, not unit HP. It is encoded as a `heal` effect, which emits a recovery event and will fire teammates' `recovery` triggers. Whether an in-game Cover-HP restore satisfies an on-recovery consumer is UNVERIFIED and is the load-bearing risk in this file — if it does not, this block must not emit a recovery event.",
    "⚑ 'lowest remaining cover HP' has no sim analogue (no cover/HP pool); `alliesLowestHp:2` resolves to the leftmost 2 allies as a documented stand-in. The 52.5% restore amount is not modeled (no pool to restore).",
    "⚑ SMG cadence tuple (pulls/s, wind-up) is engine/datamine-side, not an override field, and is datamine-unreliable — a nominal rate_of_fire must be floored to 60fps frame boundaries before use.",
    "No damage riders in any slot: no flatDamage/dot/storedHit, so noFb, noRange, core and crit-eligibility decisions do not arise for this unit."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Liter (SMG/Iron/Supporter/Burst I, ammo 120) is a pure support — she carries no damage rider in any slot, so every value here is a buff/utility magnitude. S1 has two ladders keyed to activation count ('each subsequent effect triggers all effects before it'); both are modeled at their steady-state (3rd-activation-onward) magnitude because the schema has no 'from the Nth activation onward' gate. Ladder A (fullBurstEnter, all allies) grants burstCdr 2.34 + 2.70 + 3.17 = 8.21 s. Ladder B (her OWN burst cast — 'when using Burst Skill' is owner-scoped, hence burstCast not fullBurstEnter) grants all allies Max Ammunition ▲45.17%, Critical Damage ▲12.46% and ATK ▲14.42%, each for 5 s; the Max Ammunition line is a weapon-state modifier and is damage-relevant (it stretches the magazine and delays reloads). S2 is a Cover-HP restore to 2 allies with no activation clause in the kit text, modeled as an interval trigger at a ⚑ 20 s estimated period against `alliesLowestHp:2`, emitting a recovery event only — v1 models no cover or HP pool, so the 52.5% amount is inert and the block exists for its tandem on-recovery coupling. Burst is a flat ATK ▲66% to all allies for 5 s (her cast lands before the Full Burst window opens, so the 5 s window covers roughly the first half of it)."
}
```

### 6c. S6 blind audit + flags (the blind writer's own per-line status + ⚑ estimates/recipes)
[
 {
  "slot": "skill1",
  "kitLine": "■ Activates when entering Full Burst.",
  "status": "IMPLEMENTED",
  "effectOrReason": "Block 1 trigger {kind:'fullBurstEnter'} + target {kind:'allies'} (team event, fires on ANY team Full Burst; 'all allies' includes self)"
 },
 {
  "slot": "skill1",
  "kitLine": "Effects vary according to the number",
  "status": "SKIPPED",
  "effectOrReason": "Activation-count escalation is not expressible: no 'Nth-activation-onward' gate exists (everyN/everyNOffset is periodic, not monotone-step). Steady-state tier used; verbatim in unmodeled.skill1"
 },
 {
  "slot": "skill1",
  "kitLine": "Once: Cooldown of Burst Skill ▼ 2.34 sec",
  "status": "IMPLEMENTED",
  "effectOrReason": "Summed into burstCdr seconds 8.21 (cumulative tier 3)"
 },
 {
  "slot": "skill1",
  "kitLine": "Twice: Cooldown ▼ 2.7 sec",
  "status": "IMPLEMENTED",
  "effectOrReason": "Summed into burstCdr seconds 8.21"
 },
 {
  "slot": "skill1",
  "kitLine": "Three times: Cooldown ▼ 3.17 sec",
  "status": "IMPLEMENTED",
  "effectOrReason": "Summed into burstCdr seconds 8.21"
 },
 {
  "slot": "skill1",
  "kitLine": "■ Activates when using Burst Skill.",
  "status": "IMPLEMENTED",
  "effectOrReason": "Block 2 trigger {kind:'burstCast'} (owner-scoped, no stage gate) + target {kind:'allies'}"
 },
 {
  "slot": "skill1",
  "kitLine": "Effects vary according to times used",
  "status": "SKIPPED",
  "effectOrReason": "Same count-ladder limitation as above; all three buffs granted from the 1st cast. Verbatim in unmodeled.skill1"
 },
 {
  "slot": "skill1",
  "kitLine": "Once: Max Ammunition ▲ 45.17%, 5 sec",
  "status": "IMPLEMENTED",
  "effectOrReason": "buff maxAmmoPct 45.17 durationSec 5 — weapon-state modifier, gates shots fired (NOT skipped as defensive)"
 },
 {
  "slot": "skill1",
  "kitLine": "Twice: Critical Damage ▲ 12.46%, 5s",
  "status": "IMPLEMENTED",
  "effectOrReason": "buff critDamagePct 12.46 durationSec 5 (unscoped — kit text carries no normal-attack scope)"
 },
 {
  "slot": "skill1",
  "kitLine": "Three times: ATK ▲ 14.42% for 5 sec",
  "status": "IMPLEMENTED",
  "effectOrReason": "buff atkPct 14.42 durationSec 5 (plain 'ATK ▲ x%' → target's own ATK, not casterAtkPct)"
 },
 {
  "slot": "skill2",
  "kitLine": "■ Affects 2 allies, lowest cover HP",
  "status": "IMPLEMENTED",
  "effectOrReason": "target {kind:'alliesLowestHp', count:2} as the documented stand-in (no cover/HP pool in v1); trigger {kind:'interval', sec:20} ⚑ — kit gives no activation clause"
 },
 {
  "slot": "skill2",
  "kitLine": "Restores 52.5% of Cover HP.",
  "status": "IMPLEMENTED",
  "effectOrReason": "effect {kind:'heal', ticks:1} — emits a recovery event to fire teammates' 'recovery' triggers (heal/shield lines are never skipped on isolation); the 52.5% amount is inert with no pool modeled ⚑ cover-HP-vs-HP recovery coupling unverified"
 },
 {
  "slot": "burst",
  "kitLine": "■ Affects all allies.",
  "status": "IMPLEMENTED",
  "effectOrReason": "target {kind:'allies'}, trigger {kind:'burstCast'}"
 },
 {
  "slot": "burst",
  "kitLine": "ATK ▲ 66% for 5 sec.",
  "status": "IMPLEMENTED",
  "effectOrReason": "buff atkPct 66 durationSec 5"
 }
]
[
 {
  "field": "skill1[0].effects[0].seconds",
  "estimate": "8.21 (= 2.34 + 2.70 + 3.17, the 3rd-entry-onward cumulative tier)",
  "reasoning": "The kit ladder is monotone-stepped by cumulative Full-Burst-entry count (2.34 / 5.04 / 8.21), but the Block schema offers only periodic gates (everyN/everyNOffset) — there is no 'from the Nth activation onward' gate, so no encoding reproduces the step. Steady state is the correct single value because entries 3..N dominate a 180 s fight, but it over-grants 5.87 s on entry 1 and 3.17 s on entry 2 (9.04 s of team burst CDR total), which lands squarely on the early rotation and can manufacture a Full Burst.",
  "recipe": "Add a `fromNthActivation?: number` block gate (or an activation-count resource + resourceGate) and split into three blocks at 2.34 / 2.70 / 3.17. Validate by MEASURED full-burst count preservation on the graded comps in scripts/regression.ts (rotation changes are judged by FB count, not aggregate ratio) — an FB-count shift on a Liter comp between flat-8.21 and the true ladder is the discriminator."
 },
 {
  "field": "skill1[1].effects[0..2]",
  "estimate": "All three buffs (maxAmmoPct 45.17 / critDamagePct 12.46 / atkPct 14.42) active from her 1st burst cast",
  "reasoning": "Identical count-ladder limitation: the true grant is ammo-only on cast 1, ammo+crit-damage on cast 2, all three on cast 3+. As a Burst I unit she casts every rotation, so casts 1–2 occur in the first ~40 s; the over-credit is a real early-fight ATK/crit-damage inflation on every ally, not a rounding detail.",
  "recipe": "Same gate as the flag above, keyed to her own burstCast count. Pending that, quantify the error by A/B-ing this override against one whose ATK/crit-damage buffs are suppressed for the first two casts, and read the per-unit delta on a Liter-led graded comp."
 },
 {
  "field": "skill2[0].trigger",
  "estimate": "{kind:'interval', sec:20}, first fire at t=20 s",
  "reasoning": "ALWAYS-⚑ class: the kit text gives S2 NO activation clause ('Affects 2 ally unit(s)…' with no '■ Activates when…' header), so the trigger identity is inferred, not read. Per the classification rule, absence of an activation clause ⇒ interval trigger with first fire at t=sec (a force-cast 'Forcefully uses Skill N' line would first-fire at t=0; there is none). The 20 s period is a guess anchored to nothing in the prose — her listed 20 s cooldown is the BURST cooldown, a different quantity, and must not be borrowed for it.",
  "recipe": "Read liter's skill-2 cooldown from the datamined skillCooldownsSec table in data/ and set sec to it; if absent, the cadence is unresolvable from files and needs a recording (count cover-heal popups on the two lowest-cover allies over a full fight). Note the block is damage-inert on isolation, so this only matters via the recovery coupling below."
 },
 {
  "field": "skill2[0].effects[0] (kind:'heal')",
  "estimate": "Modeled as emitting a recovery event (ticks:1) per activation",
  "reasoning": "Load-bearing tandem risk and the single most consequential unknown in this file. The kit restores COVER HP, which is a distinct resource from unit HP. The engine's `heal` effect exists to fire teammates' `recovery` triggers (the Helm→Crown channel); if an in-game Cover-HP restore does NOT satisfy an on-recovery consumer, this block silently pumps a teammate's damage buff on a Liter team. I cannot resolve cover-HP-vs-HP recovery semantics from the kit text alone, and the honest position is HYPOTHESIS, not fact. The inverse error (dropping the line for being 'defensive') is also forbidden — heal/shield/DEF/HP/lifesteal lines are never skipped on isolation.",
  "recipe": "Independent-method check first (reuse before derive): grep scripts/tests/units/ and docs/probe-data/ for an existing recovery-trigger fixture pairing a cover-heal carrier with an on-recovery consumer — if one exists, run it and you are DONE. If none exists, the discriminator is a recorded fight of Liter + an on-recovery consumer with NO other heal source in the comp: if the consumer's on-recovery buff never applies, remove the heal effect and record the line in unmodeled.skill2 instead."
 },
 {
  "field": "skill2[0].target",
  "estimate": "{kind:'alliesLowestHp', count:2}",
  "reasoning": "'lowest remaining cover HP' has no sim analogue — v1 has an immortal boss, no incoming damage, and no cover pool, so the ranking is indeterminate and resolves to the leftmost 2 allies. Which 2 allies receive the event is arbitrary today, and becomes load-bearing the moment the recovery coupling above is confirmed live (it decides WHICH teammate's on-recovery buff fires).",
  "recipe": "Only resolvable alongside a cover-damage model. Until then, if the recovery coupling is confirmed, sanity-check whether the choice of recipients moves the board by A/B-ing count:2 leftmost vs an all-allies target on a Liter + on-recovery-consumer comp; if the delta is non-zero, the stand-in is no longer damage-neutral and must be documented as such."
 },
 {
  "field": "n/a — engine cadence (not an override field)",
  "estimate": "SMG base weapon; effective pulls/s = 60/ceil(60/nominal), not the raw datamined rate_of_fire",
  "reasoning": "ALWAYS-⚑ cadence tuple. A datamined rate_of_fire is NOMINAL; shots resolve on 60 fps frame boundaries, so the effective rate is floored (e.g. a nominal 24/s at 2.5 frames becomes 3 frames = 20/s). Liter's own damage contribution is negligible for a Supporter, but her cadence drives her burst-gauge generation and therefore team rotation timing — the same channel her S1 CDR feeds.",
  "recipe": "Do not refit from Full-Burst counts (that instrument measures gauge/s, downstream of cadence). Measure shots/sec directly off the ammo counter in footage, or confirm the frame-floored value against data/gauge-per-shot.json."
 }
]

================================================================================
## SECTION 7 — DRIVER IMPLEMENTATION (what you are grading)
================================================================================
### 7a. driver test (scripts/tests/units/liter.test.ts) — GREEN vs shipped, RED vs counterfactuals
```ts
// PER-UNIT KIT SPEC — `liter` (Liter, Supporter/SMG/Iron, Burst I, cd 20s, ammo 120,
// reloadFrames 111). TDD transition step 3; owner-driven spec review 2026-07-23.
//
// Kit (blablalink prose, data/characters.json → characters.liter.skills):
//   S1 ■ entering Full Burst → all allies. Effects vary by number of times entered; EACH
//        SUBSEQUENT EFFECT TRIGGERS ALL EFFECTS BEFORE IT:
//        Once: Burst CD ▼2.34s · Twice: ▼2.7s · Three times: ▼3.17s                        [L1]
//      ■ using Burst Skill → all allies, same escalation rule:
//        Once: Max Ammo ▲45.17% · Twice: Crit Damage ▲12.46% · Three times: ATK ▲14.42%,
//        5 sec each                                                                        [L2]
//   S2 ■ 2 allies with lowest cover HP: restores 52.5% of COVER HP                         [L3]
//   BU ■ all allies: ATK ▲66% for 5 sec                                                    [L4]
//
// WHY THIS FILE EXISTS EVEN THOUGH LITER READS 1.208 HOT: her kit has ZERO self-damage lines,
// so no assertion here can move that number — it lives in the shared SMG weapon model (SMG is the
// only class whose board mean is above 1.0). What this file protects is something the board cannot:
// L1 sets the WHOLE TEAM's rotation, so a regression in the escalation ladder changes full-burst
// counts board-wide, and rotation is graded by FB-count preservation, not by these ratios.
//
// L1 is pinned END-TO-END (owner ruling 2026-07-23 — verify the ladder against observed burst
// timings, don't trust the code path). Two independent instruments:
//   (a) EXACT ARITHMETIC on the one cooldown-bound interval in the fight. Liter's SECOND cast is
//       gated by her own cooldown, so its gap is exactly baseCD − (the FIRST tier alone). Every
//       later interval is rotation-bound (she is ready ~1.5s before the chain window lets her
//       cast), which is why the ladder's upper tiers are NOT readable from her gaps and need (b).
//   (b) DOSE-RESPONSE against three counterfactual ladders, each the nearest wrong reading:
//         no CDR         < flat 2.34 (never escalates)  < SHIPPED  < flat 8.21 (instant max)
//       on Full Burst count, and SHIPPED > flat 3.17 (the NON-CUMULATIVE misreading, where the
//       third tier replaces the earlier ones instead of adding to them) on total burst casts.
//       Ordering, not absolute counts — the mechanic is the ordering; the counts move with any
//       unrelated rotation change.
//
// Fixture: the 720-kit-audit control comp (liter B1 / crown B2 / ada B3 / helm B3 — the SR/Water
// Helm, boss Fire, focus ada). Deterministic (no seed).
//
// ⚠ The two ROTATION-COUNT discriminations below (ADD-UP, RAMP) run on a SEPARATE gauge-rich
// vehicle — see LADDER_COMP. On the 4-unit control comp they read liter's OWN SMG weapon fire as a
// large fraction of team gauge, so when the SMG cadence flipped 24→20 (frame quantization, DECISIONS
// 2026-07-23) the rotation slid from cooldown-bound to gauge-bound: liter's CDR ladder only moves
// counts while COOLDOWNS bind, so both discriminations tied at 20/s — a fixture artifact, not an L1
// regression. The gauge-rich vehicle keeps the rotation cooldown-bound and makes liter's cadence a
// negligible fraction of team gauge, so the discriminations hold IDENTICALLY at the default 20/s and
// the SMGRATE=24 revert. The measured-truth VALUES (2.34s tier, buff magnitudes) are untouched, on the control
// comp — the EXACT 2nd-cast-gap arithmetic is comp-independent.
import { describe, expect, it } from 'vitest';
import type { CompOptions } from '../lib/harness.js';
import type { SimEvent } from '../../../src/types.js';
import { controlComp, data, runComp, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const CARRY = 'ada';
/** controlComp slot order: liter 0 / crown 1 / ada 2 / helm 3. */
const LITER = 0;
const TEAM_SIZE = 4;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function runOn(comp: CompOptions, overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  runComp({ ...comp, overrides, cfg: { onEvent: (e) => events.push(e) } });
  return events;
}
const run = (overrides: Record<string, any> = {}) => runOn(controlComp(CARRY), overrides);

// Gauge-rich, SMG-cadence-robust vehicle for the two rotation-count discriminations (see header):
// liter B1 / blanc B2 / maiden-ice-rose B3 (focus, ×2.5 charge gauge) / helm B3. No claim about
// these units' own kits — only liter's ladder is varied; the rest are a constant gauge/cooldown bed.
const LADDER_COMP: CompOptions = {
  slugs: ['liter', 'blanc', 'maiden-ice-rose', 'helm'],
  bossElement: 'Fire',
  focusSlug: 'maiden-ice-rose',
};

/** Replace her S1 Full-Burst-entry escalating CDR ladder with a FLAT per-FB value (or drop it). */
const cdrLadder = (seconds: number | null) =>
  withPatchedOverride('liter', (ov) => {
    const before = ov.skill1.length;
    if (seconds === null) {
      ov.skill1 = ov.skill1.filter((b: any) => b.trigger.kind !== 'fullBurstEnter');
      if (ov.skill1.length === before) throw new Error('liter S1 fullBurstEnter block missing — fixture is stale');
      return;
    }
    const blk = ov.skill1.find((b: any) => b.trigger.kind === 'fullBurstEnter');
    if (!blk) throw new Error('liter S1 fullBurstEnter block missing — fixture is stale');
    blk.effects = [{ kind: 'burstCdr', seconds }];
  });

/** L3 isolation: strip every OTHER recovery source in the comp, so any recovery firing left is
 *  attributable to liter's cover-HP restore — the regression this line exists to prevent. */
const stripHeals = (slug: string) =>
  withPatchedOverride(slug, (ov) => {
    for (const slot of ['skill1', 'skill2', 'burst'] as const) {
      ov[slot] = (ov[slot] ?? []).filter((b: any) => !b.effects.some((e: any) => e.kind === 'heal'));
    }
  });

const base = run();
const noCdr = run({ liter: cdrLadder(null) });
const flatTier1 = run({ liter: cdrLadder(2.34) });
const noOtherHeals = run({ helm: stripHeals('helm'), crown: stripHeals('crown') });

// The two rotation-count discriminations run on the gauge-rich vehicle (see LADDER_COMP).
const ladderBase = runOn(LADDER_COMP);
const ladderNonCumulative = runOn(LADDER_COMP, { liter: cdrLadder(3.17) }); // 3rd tier REPLACES, not adds
const ladderSaturated = runOn(LADDER_COMP, { liter: cdrLadder(8.21) }); // instantly at max from entry 1

const fbCount = (evs: SimEvent[]) => evs.filter((e) => e.kind === 'fullBurstStart').length;
const fbFrames = (evs: SimEvent[]) => evs.filter((e) => e.kind === 'fullBurstStart').map((e) => e.frame);
const allCasts = (evs: SimEvent[]) => evs.filter((e): e is BurstCast => e.kind === 'burstCast');
const literCasts = (evs: SimEvent[]) => allCasts(evs).filter((c) => c.slug === 'liter');
const literBuffs = (evs: SimEvent[], stat: string, value?: number) =>
  evs.filter(
    (e): e is BuffApply =>
      e.kind === 'buffApply' &&
      e.casterIdx === LITER &&
      e.stat === stat &&
      (value === undefined || e.value === value),
  );

describe('liter — kit spec', () => {
  describe('L1 — S1 Full-Burst-entry burst-cooldown ladder (cumulative)', () => {
    it('EXACT: the first activation grants the FIRST TIER ALONE (2.34s), not the sum or the top tier', () => {
      // Her 2nd cast is the fight's one cooldown-bound interval: gap = baseCD − tier1.
      const casts = literCasts(base);
      expect(casts.length, 'liter never bursts twice').toBeGreaterThan(1);
      const gapFrames = casts[1].frame - casts[0].frame;
      const baseCd = data.characters.liter.burstCooldownSec * FPS;
      const tier1 = Math.round(2.34 * FPS);
      expect(
        gapFrames,
        `first cooldown ran ${(gapFrames / FPS).toFixed(3)}s; kit says ${data.characters.liter.burstCooldownSec}s ` +
          `− 2.34s = ${((baseCd - tier1) / FPS).toFixed(3)}s (the cumulative sum 5.04/8.21 would be shorter)`,
      ).toBe(baseCd - tier1);
    });

    it('ESCALATES past the first tier — more Full Bursts than a ladder stuck at 2.34s', () => {
      expect(fbCount(base)).toBeGreaterThan(fbCount(flatTier1));
      expect(fbCount(flatTier1)).toBeGreaterThan(fbCount(noCdr));
    });

    it('DISCRIMINATING: tiers ADD UP — beats a non-cumulative ladder that only ever grants 3.17s', () => {
      // "Each subsequent effect triggers all effects before it": the 3rd+ entry grants
      // 2.34+2.7+3.17 = 8.21s, NOT the third tier replacing the first two. On the gauge-rich vehicle
      // the rotation is cooldown-bound, so the extra cumulative reduction converts to more total
      // burst casts over the fight (margin 3 — robust to the SMG cadence, see header).
      expect(
        allCasts(ladderBase).length,
        'a non-cumulative reading would deliver strictly less cooldown reduction over the fight',
      ).toBeGreaterThan(allCasts(ladderNonCumulative).length);
    });

    it('RAMPS — the first entries grant LESS than the saturated 8.21s, so Full Bursts arrive LATER', () => {
      // The saturated ladder delivers all 8.21s from the FIRST entry; the real ramp reaches it only
      // by the 3rd. Measured by TIMING, not count: on the gauge-rich vehicle both eventually hit the
      // Full-Burst ceiling, so the coarse count ties — but the saturated arm's k-th Full Burst lands
      // no later than the ramp's for every k, and strictly earlier for at least one early entry. An
      // instantly-saturated ladder would make the two timelines identical and fail the strict clause.
      const rampFbs = fbFrames(ladderBase);
      const satFbs = fbFrames(ladderSaturated);
      const k = Math.min(rampFbs.length, satFbs.length);
      expect(k, 'no Full Bursts to compare').toBeGreaterThan(2);
      expect(
        satFbs.slice(0, k).every((f, i) => f <= rampFbs[i]),
        'a saturated ladder must never reach a Full Burst LATER than the real ramp',
      ).toBe(true);
      expect(
        satFbs.slice(0, k).some((f, i) => f < rampFbs[i]),
        'the real ramp delivers less early cooldown reduction, so some Full Burst must arrive later than under instant saturation',
      ).toBe(true);
    });
  });

  describe('L2 — S1 burst-cast ladder: Max Ammo → +Crit Damage → +ATK, 5 sec, all allies', () => {
    const STEPS: Array<[string, number]> = [
      ['maxAmmoPct', 45.17],
      ['critDamagePct', 12.46],
      ['atkPct', 14.42],
    ];

    it('unlocks one more step per cast, cumulatively, and holds all three from the 3rd on', () => {
      const castFrames = literCasts(base).map((c) => c.frame);
      expect(castFrames.length, 'need at least 3 liter casts').toBeGreaterThanOrEqual(3);
      for (const [i, frame] of castFrames.entries()) {
        const live = STEPS.filter(([stat, value]) =>
          literBuffs(base, stat, value).some((b) => b.frame === frame),
        ).map(([stat]) => stat);
        const expected = STEPS.slice(0, Math.min(i + 1, 3)).map(([stat]) => stat);
        expect(live, `cast #${i + 1} at ${(frame / FPS).toFixed(2)}s`).toEqual(expected);
      }
    });

    it('fires on HER OWN casts only, never on an ally\'s burst', () => {
      const applyFrames = new Set(literBuffs(base, 'maxAmmoPct', 45.17).map((b) => b.frame));
      expect([...applyFrames].sort((a, b) => a - b)).toEqual(literCasts(base).map((c) => c.frame));
      expect(applyFrames.size, 'the whole team bursts far more often than liter alone').toBeLessThan(
        allCasts(base).length,
      );
    });

    it('reaches all four allies for exactly 5 sec', () => {
      for (const [stat, value] of STEPS) {
        const applied = literBuffs(base, stat, value);
        expect(applied.length, `${stat} never applied`).toBeGreaterThan(0);
        for (const b of applied) expect(b.expiresFrame! - b.frame, `${stat} duration`).toBe(5 * FPS);
        const perFrame = new Map<number, Set<number | null>>();
        for (const b of applied) {
          if (!perFrame.has(b.frame)) perFrame.set(b.frame, new Set());
          perFrame.get(b.frame)!.add(b.targetIdx);
        }
        for (const [frame, holders] of perFrame) {
          expect(holders.size, `${stat} at frame ${frame} reached ${holders.size} allies`).toBe(TEAM_SIZE);
        }
      }
    });
  });

  describe('L3 — S2 restores COVER HP: no recovery event, ever', () => {
    it('drives no recovery consumer once every other heal in the comp is removed', () => {
      // Modeling this as a unit heal fired crown's "when recovery takes effect → all allies Attack
      // Damage ▲20.99%" on every Full Burst and inflated the whole team (owner ruling 2026-07-21).
      const fired = noOtherHeals.filter(
        (e): e is BuffApply =>
          e.kind === 'buffApply' && e.stat === 'attackDamagePct' && e.value === 20.99,
      );
      expect(
        fired.map((b) => (b.frame / FPS).toFixed(2)),
        'a recovery consumer fired with liter as the only possible source',
      ).toEqual([]);
    });

    it('has the cover-HP line recorded as a deliberate omission, not silently dropped', () => {
      const unmodeled = JSON.stringify(
        (withPatchedOverride('liter', () => {}) as any).unmodeled.skill2,
      );
      expect(unmodeled).toContain('Cover HP');
    });
  });

  describe('L4 — burst: ATK ▲66% for 5 sec, all allies', () => {
    it('grants exactly 66% to all four allies for 5 sec, once per cast', () => {
      const applied = literBuffs(base, 'atkPct', 66);
      const frames = new Set(applied.map((b) => b.frame));
      expect([...frames].sort((a, b) => a - b)).toEqual(literCasts(base).map((c) => c.frame));
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(5 * FPS);
      expect(new Set(applied.map((b) => b.targetIdx)).size).toBe(TEAM_SIZE);
    });

    it('is a SEPARATE buff from her S1 ladder ATK step (14.42%), not a merged one', () => {
      // Same stat, same caster, different skill slot → distinct keys, so both are live at once.
      const keys = new Set([
        ...literBuffs(base, 'atkPct', 66).map((b) => b.key),
        ...literBuffs(base, 'atkPct', 14.42).map((b) => b.key),
      ]);
      expect(keys.size, 'the two ATK buffs must not share a buff key').toBeGreaterThan(1);
    });
  });
});

```

### 7b. driver override (src/skills/overrides/liter.json)
```json
{
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Remove this banner only when the unit has been measured/hand-tuned. — Liter (`liter`, SMG B1 Supporter Iron, ammo 120 / reloadFrames 111): the canonical B1 CDR/enabler; her own SMG damage is minor, her value is TEAM-WIDE (burst-CDR + escalating buffs + 66% burst ATK), so blast radius is the real check (/sim-battery diff), not a self-sim. S1 block A ('Activates when entering Full Burst', all allies) = escalating team burstCdr steps [2.34, 2.7, 3.17]s — trigger is fullBurstEnter per the literal text (hard rule 6; fires on EVERY team FB regardless of who bursted), and the engine's escalating case (sim.ts:1818) applies steps 1..min(N,3) on the Nth activation, so from the 3rd FB on every FB-enter grants the full 2.34+2.7+3.17=8.21s CDR, exactly matching 'Each subsequent effect triggers all effects before it'. S1 block B ('Activates when using Burst Skill', all allies) = burstCast (literal text — fires ONLY on rotations LITER bursts, never on another B1's) with escalating buff steps [maxAmmoPct 45.17% / critDamagePct 12.46% / atkPct 14.42%], each 5s; ramps to all three by her 3rd burst cast. maxAmmoPct is a WEAPON-STATE modifier (hard rule 1 / prior 9 — team ammo ▲ = more shots before reload on every teammate), NOT skippable as defensive. The two 'Effects vary according to the number of times…' header lines are IMPLEMENTED by the `escalating` kind. The escalating ladder is cumulative-with-cap — Once v01 → Twice v01+v02 → 3rd+ v01+v02+v03, capping at min(N,3) — matching 'Each subsequent effect triggers all effects before it', so from the 3rd Full Burst on she grants the full 8.21s to every ally. PINNED END-TO-END by scripts/tests/units/liter.test.ts (L1): the one cooldown-bound interval in the fight gives the tier-1 value as exact arithmetic (baseCD − 2.34s), and three counterfactual ladders (no CDR / flat 2.34 / flat 3.17 non-cumulative / flat 8.21 saturated) bracket the shipped behaviour on Full Burst count and total burst casts. Burst = team ATK ▲ 66% for 5s on burstCast. The 5s durations on a ~20s B1 cycle → low buff uptime is KIT-FAITHFUL (Liter's known short-buff character); do not extend without measurement. S2 ('Affects 2 ally unit(s) with the lowest remaining cover HP. Restores 52.5% of Cover HP.') is a NO-OP in the sim [OWNER RULING 2026-07-21]: skill2's icon is `icn_skill_healcover_01` and the text restores COVER HP, NOT a unit's HP. It does NOT emit a unit-RECOVERY event, so it must NOT trigger recovery-consumer teammates. Modeling it as a `heal`→allies on fullBurstEnter was SPURIOUSLY firing Crown's S2 ('when recovery takes effect' → all allies Attack Damage ▲ 20.99%) every Full Burst, inflating the WHOLE team's damage (the uniform ~1.3 HOT on the Liter/Crown/Chisato/Helm 720-kit-audit comp — liter 1.36 / crown 1.16 / chisato 1.30 / helm 1.27, on scope-lock). Cover-HP has no sim representation (v1 models no HP pools) and no recovery-consumer should key off it, so skill2 is dropped to unmodeled. (If a Liter+consumer recording ever shows a cover-repair proc firing a recovery consumer in-game, revisit.) ⚑1 cadence tuple is Liter's BASE SMG WEAPON cadence — the datamined SMG rate_of_fire 1440 + reloadFrames 111, an unverified blind ⚑ — NOT a skill1 concern (skill1 is burst-CDR + team buffs and has nothing to do with rate of fire; the caveat is the kit-parse boilerplate blind-cadence flag, conventionally slot-tagged skill1 by position). Low impact: her own SMG damage is minor. ⚑2 blast radius: team burstCdr accelerates the WHOLE team's rotation and can add full bursts board-wide — reviewer must run the /sim-battery diff before any board-level claim. Kit-autonomy gauntlet 2026-07-26: cross-family corroborated (S2b claude-fable-5 blind re-derivation converged on all 4 kit lines — L1 FB-enter cumulative CDR ladder 2.34/5.04/8.21s, L2 burstCast escalating buffs 45.17/12.46/14.42 5s, skill2 cover-HP NO-OP, burst atkPct 66 5s — same counterfactuals, no REAL-GOTCHA); no fix enacted, the shipped model is faithful, the landed TDD spec (scripts/tests/units/liter.test.ts) is the regression PIN.",
  "unmodeled": {
    "skill1": [],
    "skill2": [
      "■ Affects 2 ally unit(s) with the lowest remaining cover HP. Restores 52.5% of Cover HP. — NO-OP (owner ruling 2026-07-21): restores COVER HP, not a unit's HP; emits NO unit-recovery event, so it must not trigger recovery-consumer teammates (was spuriously firing Crown's +20.99% team Attack Damage every FB). No sim HP-pool representation."
    ],
    "burst": []
  },
  "caveats": [
    "skill1(weapon): the ⚑1 cadence tuple is Liter's BASE SMG weapon cadence (datamined rate_of_fire 1440, reloadFrames 111) — an unverified datamine, NOT related to skill1's mechanic (burst-CDR + team buffs). Low impact (her self-damage is minor); read rounds/min + reload gap from any focus video if ever needed.",
    "skill2: NO-OP in the sim (owner ruling 2026-07-21) — cover-HP restore is not a unit heal and must not fire recovery consumers (e.g. Crown). Previously modeled as a heal→allies, which over-inflated the whole team via Crown's recovery buff.",
    "burst: team buffs are short (5 sec) by kit text — low uptime on a ~20 sec cycle is faithful, not a modeling gap"
  ],
  "skill1": [
    {
      "slot": "skill1",
      "trigger": { "kind": "fullBurstEnter" },
      "target": { "kind": "allies" },
      "effects": [
        {
          "kind": "escalating",
          "steps": [
            { "kind": "burstCdr", "seconds": 2.34 },
            { "kind": "burstCdr", "seconds": 2.7 },
            { "kind": "burstCdr", "seconds": 3.17 }
          ]
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "allies" },
      "effects": [
        {
          "kind": "escalating",
          "steps": [
            {
              "kind": "buff",
              "stat": "maxAmmoPct",
              "value": 45.17,
              "durationSec": 5
            },
            {
              "kind": "buff",
              "stat": "critDamagePct",
              "value": 12.46,
              "durationSec": 5
            },
            {
              "kind": "buff",
              "stat": "atkPct",
              "value": 14.42,
              "durationSec": 5
            }
          ]
        }
      ]
    }
  ],
  "skill2": [],
  "burst": [
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "allies" },
      "effects": [
        { "kind": "buff", "stat": "atkPct", "value": 66, "durationSec": 5 }
      ]
    }
  ]
}

```
