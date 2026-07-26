# S7 RECONCILING-JUDGE PACKET — helm-aquamarine (Helm: Aquamarine)
AR / Attacker / Iron / Burst II (cd 20s). Variant of base helm (SR/Water/Attacker/Burst III, "thelm") — a DIFFERENT unit; do not conflate.
Driver: Qwen. Blind roles: claude-fable-5 (S2b pre-op), claude-opus-5 (S5 blind test, S6 blind override).
Your job (per RECONCILING-JUDGE.md): issue the BINDING verdict + faithfulnessScore for this unit's kit encoding.

==============================================================================
## 1. RECONCILING-JUDGE CONTRACT + RETURN JSON SHAPE
==============================================================================

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


==============================================================================
## 2a. MECHANICS SSOT — damage-calculation.md
==============================================================================

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


==============================================================================
## 2b. MECHANICS SSOT — game-mechanics.md
==============================================================================

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


==============================================================================
## 3. GROUND TRUTH — kit prose + base stats (data/characters.json -> characters["helm-aquamarine"], levels 10/10/10)
==============================================================================

### Skills prose (SSOT)
```
{
  "skill1": "■ Activates after landing 30 normal attacks. Affects the target.\nDeals 131.34% of final ATK as additional damage.\n■ Activates when entering Full Burst. Affects all allies.\nEffects vary according to the number of times entered. Each subsequent effect triggers all effects before it:\nOnce: Cooldown of Burst Skill ▼ 1.82 sec.\nTwice: Cooldown of Burst Skill ▼ 2.2 sec.\nThree times: Cooldown of Burst Skill ▼ 2.6 sec.",
  "skill2": "■ Affects 1 enemy unit(s) randomly.\nDeals 105.58% of final ATK as damage.\n■ Activates when attacking an Electric Code target. Affects the target.\nDamage Taken ▲ 5.64%, stacks up to 5 time(s) and lasts for 5 sec.",
  "burst": "■ Affects all enemies.\nDeals 164.83% of final ATK as Burst Skill damage. \n■ Activates when attacking an Electric Code target. Affects the target.\nDeals 164.83% of final ATK as additional damage."
}
```

### Datamined cooldowns + key fields
```
{
  "skillCooldownsSec": {
    "skill1": null,
    "skill2": 4,
    "burst": 20
  },
  "weapon": "AR",
  "burst": "II",
  "burstCooldownSec": 20,
  "class": "Attacker",
  "element": "Iron",
  "normalAttackMultiplier": 13.65,
  "hitsPerShot": 1,
  "ammo": 60,
  "reloadFrames": 81,
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
    "resourceId": 353
  }
}
```

==============================================================================
## 4. S2b CROSS-FAMILY TEST REVIEW (claude-fable-5) — reviews/helm-aquamarine.test-review.json
==============================================================================

```json
{
  "slug": "helm-aquamarine",
  "leakDetected": "The bossElementGate comment in the redacted effect schema retains a stripped-name example reading 'attacking an Electric Code target → +164.83%' — that magnitude+phrasing is exactly this unit's burst rider, so the target unit's answer leaked into the schema doc (name removed, magnitude kept). Also present but NOT leaks: 'helm' references in critRateNormalPct/durationShots/chargeDamageMultPct comments describe the base unit `helm` (SR/B3), a different unit from `helm-aquamarine` (AR/Iron/B2) — reasoned from prose regardless.",
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "after landing 30 normal attacks: 131.34%",
      "disposition": "FAITHFUL",
      "scope": "Counts LANDED normal-attack rounds only (AR hitsPerShot=1, so pulls==rounds; skill/burst proc hits must NOT advance the counter). Rider damage: crit-eligible at caster's sheet rate (engine-wide rider rule), NO core, engine force-sets noRange.",
      "durationSemantics": "Instant hit per proc; counter is cumulative across reloads and resets only on fire.",
      "triggerIdentity": "hitCount count:30 (counts rounds). No countInFb — prose gives no in-FB acceleration. Takes the +50% FB major by landing TIMING (default ON; not a burst-cast hit).",
      "targetSet": "enemy (the attacked target)",
      "nearestWrongModel": "interval trigger with a cadence-derived sec (~30 shots ÷ fire rate): keeps firing through reload downtime and drifts from the true round-counted proc schedule; second-nearest: noFb:true applied by over-generalizing the burst-cast FB exemption to all riders.",
      "distinguishingAssertion": "Collect damage events for the skill1 flat rider: proc count === floor(totalRoundsFired/30), and no proc's frame falls inside a reload window (procs pause while the magazine refills); a rider landing inside FB has fbMajorApplied true. Interval model fails the reload-pause check; noFb misread fails the fbMajorApplied check.",
      "inertness": "Zero procs before 30 rounds fired; counter unaffected by skill2/burst proc damage events; rangeApplied false on every rider hit.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "entering Full Burst: Burst CD ▼ escalating",
      "disposition": "FAITHFUL",
      "scope": "Burst-skill cooldown reduction only — moves rotation cadence, never per-hit damage.",
      "durationSemantics": "Instantaneous CDR application per FB entry; the Once/Twice/Three-times ladder is per-battle escalation state. 'Each subsequent effect triggers all effects before it' = CUMULATIVE: entry 1 → 1.82s; entry 2 → 1.82+2.2 = 4.02s; entry 3 (and every later entry, ladder capped) → 1.82+2.2+2.6 = 6.62s.",
      "triggerIdentity": "fullBurstEnter (prose: 'when entering Full Burst') — fires on ANY team FB, including rotations where the other B2 (crown in the control fixture) casts stage 2. NOT burstCast.",
      "targetSet": "allies (all allies — every unit's burst CD is reduced, compressing the whole chain)",
      "nearestWrongModel": "Non-cumulative ladder: Nth entry applies ONLY step N (−2.6 at entry 3 instead of −6.62), i.e. plain stepped buff instead of escalating steps-1..N. Second-nearest: burstCast keying (silent whenever crown takes stage 2) or target self-only.",
      "distinguishingAssertion": "burstCdr emits no event, so assert on rotation timing: gap between fullBurstStart N and N+1 shrinks by the cumulative CDR vs the 20s-CD baseline — by rotation 4 the compression per rotation is ~6.62s, not ~2.6s; and vs withPatchedOverride('helm-aquamarine', zero the CDR block) the committed override produces strictly more fullBurstStart events over a fixed sim length. Non-cumulative model yields measurably fewer FB cycles.",
      "inertness": "Zero damage events sourced from this block; per-shot damage values identical with the block removed (only event TIMING/count moves).",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "1 enemy randomly: 105.58% damage",
      "disposition": "FAITHFUL",
      "scope": "Skill proc damage; random single-enemy targeting collapses to the lone boss in this sim. Crit-eligible rider, no core, noRange.",
      "durationSemantics": "Instant hit per activation.",
      "triggerIdentity": "NO activation clause in prose → interval trigger by convention, first fire t=sec. ⚑ ALWAYS-FLAG #2: the cadence is NOT in the kit text — take sec from the datamined skillCooldownsSec if present, else flag with an estimate + recipe (pin from footage popup cadence). Never ship a silent guess.",
      "targetSet": "enemy",
      "nearestWrongModel": "shotFired keying (105.58% per trigger pull — an AR at ~12 pulls/s would add >1200%/s, a massive over-credit) or hitCount with an invented count. Also plausible: pausing the proc during reloads (interval must be wall-clock).",
      "distinguishingAssertion": "Damage events for this bucket occur at fixed wall-clock spacing sec apart (first at t=sec), CONTINUE through reload windows, and total floor(fightLen/sec) — independent of rounds fired. A shotFired model produces counts proportional to shots and pauses during reloads; both fail.",
      "inertness": "Proc count must not change when ammo/fire-rate buffs change shots fired; no core bucket contribution.",
      "evidenceTier": "CALIBRATED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "vs Electric: Dmg Taken ▲5.64% ×5, 5 sec",
      "disposition": "FAITHFUL",
      "scope": "Boss DEBUFF ('Damage Taken ▲' benefits the WHOLE TEAM's damage, not a self buff — taxonomy #4), gated on the boss being Electric Code.",
      "durationSemantics": "durationSec 5, maxStacks 5, stacks refresh on re-application ('lasts for 5 sec' is literal seconds — no round-count language here). Steady-state = pinned at 5 stacks while she keeps attacking (AR cadence ≪ 5s).",
      "triggerIdentity": "'Activates when attacking' = shotFired (per pull, on-hit), composed with bossElementGate:'Electric'. NOT the bossElement permanent-passive trigger — the gate composes with the real per-attack trigger.",
      "targetSet": "enemy (boss-held debuff — buffApply with casterIdx===null AND targetIdx===null; filter by stat+value)",
      "nearestWrongModel": "Dropping the element gate (ungated damageTakenPct 5.64×5 ≈ +28.2% team damage vs the FIRE control boss — the largest possible over-credit in this kit); second-nearest: encoding as a self attackDamagePct buff so only helm-aquamarine benefits.",
      "distinguishingAssertion": "Vs the default Fire boss: ZERO buffApply events with stat 'damageTakenPct' value 5.64, and totals(res) for every slug identical with this block deleted via withPatchedOverride. Vs an Electric boss (if CompOptions allows boss element): buffApply events with casterIdx===null, stat 'damageTakenPct', value 5.64, stacks ramping to maxStacks 5, and ALL units' totals rise — not just hers.",
      "inertness": "Entire block board-inert on the neutral/Fire control fixture — this is the primary assertion; any movement on the graded comp means the gate is missing.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "164.83% Burst Skill damage, all enemies",
      "disposition": "FAITHFUL",
      "scope": "Burst-skill-bucket damage on her own burst cast; all-enemies collapses to the boss.",
      "durationSemantics": "Instant on cast; 20s burst CD (shortened by her own S1 CDR).",
      "triggerIdentity": "burstCast (stage 2) — fires ONLY on rotations helm-aquamarine herself casts. Burst-cast damage is FB-EXEMPT by timing (lands before the FB window opens — noFb per rule 9).",
      "targetSet": "enemy",
      "nearestWrongModel": "fullBurstEnter keying — the canonical B2-contention trap: the control fixture carries crown (also Burst II), so an FB-enter model deals this damage on EVERY team FB including rotations crown takes stage 2, over-crediting exactly when another same-tier unit is present. Second-nearest: fbMajorApplied true on the cast hit.",
      "distinguishingAssertion": "Count of burst-bucket damage events with her srcSlot === count of HER burstCast events (never the fullBurstStart count); on any rotation where crown casts stage 2, zero helm-aquamarine burst damage; every such hit has fbMajorApplied false. FB-enter model fails whenever burstCast count < fullBurstStart count.",
      "inertness": "No burst damage on rotations she does not cast; no +50% FB major on the cast hit.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "vs Electric: 164.83% additional damage",
      "disposition": "FAITHFUL",
      "scope": "Element-gated flat rider on her burst attack — same 164.83% magnitude again as ADDITIONAL damage when the burst attacks an Electric Code target.",
      "durationSemantics": "Instant, once per qualifying burst cast.",
      "triggerIdentity": "burstCast composed with bossElementGate:'Electric' (the gate composes with the real trigger; NOT the permanent bossElement passive, NOT a separate always-on proc). FB-exempt like the base hit (burst-cast timing).",
      "targetSet": "enemy",
      "nearestWrongModel": "Ungated (rider fires vs the Fire control boss, double-dipping her burst to ~329.66% every cast); second-nearest: merging it into the base hit as a single 329.66% burst-bucket line, which mis-buckets the rider (additional-damage rider vs Burst Skill damage may diverge under bucket-scoped buffs).",
      "distinguishingAssertion": "Vs the Fire control boss: exactly ONE damage event per burstCast from her burst slot (the 164.83% base), totals identical with the rider block deleted. Vs an Electric boss: exactly TWO (base + rider), the rider carrying the additional/rider bucket, both scaling 164.83.",
      "inertness": "Rider contributes ZERO vs any non-Electric boss including the neutral scope-lock boss — must not disturb graded comps.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:hitCount-30-rider-131.34",
    "skill1:fb-enter-escalating-burst-cdr",
    "skill2:interval-105.58-random-enemy",
    "skill2:electric-gated-dmg-taken-stack-debuff",
    "burst:burstcast-164.83-base",
    "burst:electric-gated-164.83-rider"
  ],
  "unmodeledVerbatim": {
    "skill1": [],
    "skill2": [],
    "burst": []
  },
  "notes": "(1) FIXTURE VALIDITY IS THE FIRST ASSERTION: helm-aquamarine is Burst II, and controlComp fixes crown (also Burst II) in the comp — stage-2 contention means she may never win the burst slot depending on the engine's tie-break, which would leave the ENTIRE burst slot untested (and a fullBurstEnter misread of her burst would silently pass with nonzero damage!). The test must assert unitOf(res,'helm-aquamarine') has ≥1 burstCast event before any burst-slot assertion; if crown always wins stage 2, the fixture cannot exercise her burst and the driver must say so, not fake it. Note helm=true must stay — dropping the base `helm` (B3) removes the only Burst III and kills ALL full bursts. (2) Expected shared-prior misreads, in priority order: (a) skill2/burst Electric gates dropped → both blocks over-credit vs the Fire control boss (Damage-Taken debuff alone ≈ +28% TEAM damage at 5 stacks) — the inertness assertions vs the default boss are the highest-value tests; (b) burst keyed fullBurstEnter instead of burstCast — diverges precisely because crown shares her tier; (c) S1 CDR ladder applied non-cumulatively (−2.6 at entry 3 instead of −6.62) or targeted self-only — 'Each subsequent effect triggers all effects before it' is explicit cumulative, target 'all allies'; (d) skill2 105.58% keyed shotFired instead of interval. (3) The skill2 interval cadence is the ONLY value not in prose — ALWAYS-⚑; prefer the datamined skillCooldownsSec, first-fire t=sec (no force-cast language). (4) 'Damage Taken ▲' assertions must filter boss-held buffApply by stat+value with casterIdx===null. (5) Leak declared above: the schema's bossElementGate example retains this unit's '+164.83% vs Electric' answer with the name stripped — my dispositions were derived from the kit prose, which independently states it.",
  "model": "claude-fable-5"
}

```

==============================================================================
## 5. S5 BLIND TEST (claude-opus-5) + GREEN/RED COUNT vs DRIVER OVERRIDE
==============================================================================

### Green/red count vs the DRIVER override (deterministic, no seed)
- PRISTINE blind test (blind/helm-aquamarine.test.ts, uses controlComp = liter/crown/helm-aquamarine/helm):
  **16 passed / 6 failed / 2 skipped** (of 24).
- ADAPTED blind test (blind/helm-aquamarine.adapted.test.ts, driver reconciliation — see notes below):
  **22 passed / 2 skipped** (GREEN; the 2 skips are the blind's own honest measurement-gated flags: S2a cadence + S1a noFb).

### Measured root-causes of the 6 pristine reds (driver evidence; NONE are encoding-faithfulness failures)
- **2 burst-slot reds** ("unconditional burst hit lands", "Electric rider gated off"): FIXTURE artifact. controlComp fixes
  crown (Burst II) beside this Burst II unit; the two contend for the single B2 slot and helm-aquamarine NEVER wins the cast
  (measured: removing her burst block changes her total by 0 in that comp — her burst contributes nothing). The blind's OWN
  non-vacuity gate ("if she never gets the cast this goes RED and that IS the finding") correctly caught this. The adapted
  test uses a sole-B2 fixture [liter / helm-aquamarine / helm] where she casts 10x/180s and BOTH burst assertions pass.
- **4 S1b behavioral reds** (all assert fbCount(committed) > fbCount(CDR-removed/flat/self-only)): the blind discriminated
  the event-SILENT burstCdr by Full-Burst COUNT. That proxy is INVALID in this fixture — measured: the modest escalating CDR
  (1.82/2.2/2.6) does NOT cross a Full-Burst-count threshold over 180s (FB count stays 5 whether the CDR is present, flat, or
  self-only; the 40s Burst III partner gates the rotation), so all four FB-count comparisons TIE. The adapted test preserves
  the assertion INTENT (CDR is live + escalating + all-ally + keyed to FB entry) via the discrimination that DOES hold —
  trigger identity: re-keying fullBurstEnter->burstCast over-accelerates the rotation (measured 10->12 of her casts, 5->6 FBs,
  +6.3% total) — plus the structural ladder/target checks.
- **ALL blind STRUCTURAL (kit-literal) assertions PASS** vs the driver override: S1a (131.34 flatDamage hitCount:30 enemy),
  S1b (fullBurstEnter->allies escalating burstCdr [1.82,2.2,2.6], not oncePerBattle), S2a (105.58 flatDamage skill2 enemy),
  S2b (bossElementGate Electric, damageTakenPct 5.64/maxStacks5/5s — passes after the driver adopted the granular encoding the
  blind independently derived, see section 6), Burst (exactly two 164.83% hits, one Electric-gated, both burstCast).

### Pristine blind test source
```typescript
/**
 * helm-aquamarine (AR / Iron / Attacker / Burst II, cd 20s, ammo 60, hitsPerShot 1) — BLIND kit-spec test.
 *
 * Written from the kit prose ALONE. The driver's override, the driver's tests and any truth file
 * were NOT consulted. Every assertion below is derived from the prose + the effect schema.
 *
 * WHAT THE KIT SAYS (structural read, quotes kept short):
 *   S1a  header: activates after landing 30 normal attacks / affects the target
 *        payload: 131.34% of final ATK as additional damage
 *        => hitCount{count:30} -> flatDamage 131.34 on the enemy. Rider: crits at the caster rate,
 *           no core (text does not say core strike), FB by timing. noFb/noRange are engine defaults.
 *   S1b  header: activates when entering Full Burst / affects all allies
 *        payload: escalating Burst-Skill cooldown reduction, Once 1.82s / Twice 2.2s / Three 2.6s,
 *                 and each subsequent tier triggers all tiers before it (cumulative: 1.82, 4.02, 6.62).
 *        => fullBurstEnter -> allies -> escalating[burstCdr 1.82, 2.2, 2.6]. NOT oncePerBattle.
 *   S2a  header: affects 1 enemy randomly (NO activation clause)
 *        payload: 105.58% of final ATK as damage
 *        => a damage line the prose gives NO trigger for. Per the ALWAYS-flag rules this is an
 *           invented trigger + invented cadence: interval, period unknowable from prose. FLAGGED.
 *   S2b  header: activates when attacking an Electric Code target / affects the target
 *        payload: Damage Taken +5.64%, 5 stacks, 5 sec
 *        => bossElementGate 'Electric' + buff damageTakenPct 5.64 / maxStacks 5 / durationSec 5.
 *           This is a BOSS DEBUFF: it lifts the WHOLE team, not just the caster.
 *   Ba   header: affects all enemies
 *        payload: 164.83% of final ATK as Burst Skill damage  => burstCast -> flatDamage 164.83.
 *   Bb   header: activates when attacking an Electric Code target / affects the target
 *        payload: 164.83% of final ATK as additional damage
 *        => the SAME magnitude again, but on a bossElementGate 'Electric' block. Two distinct hits.
 *
 * FIXTURE: controlComp('helm-aquamarine', true) — liter (B1) / crown (B2) / carry / helm (B3).
 * The fixed B3 is REQUIRED: helm-aquamarine is Burst II, so without a B3 the chain never completes
 * and ZERO Full Bursts happen, which would make every FB-keyed assertion vacuous.
 * The control boss is FIRE, so BOTH Electric-gated lines are INERT here by construction. Their
 * active case is reached by a counterfactual that strips only the bossElementGate — that proves the
 * block exists, is wired, and that the GATE is what suppresses it, without needing an Electric boss.
 *
 * WHY THE COUNTERFACTUALS DISCRIMINATE: damage `SimEvent`s carry no documented per-unit slug field,
 * so every damage-line claim is proven through totals(res)[slug] against a patched override (which
 * IS per-slug attributable) rather than through event attribution guessing. Buff/rotation claims use
 * the event log, where the field names ARE documented (buffApply stat/value/maxStacks/casterIdx/
 * targetIdx; fullBurstStart needs no slug at all).
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
  // Mechanical import correction ONLY — no assertion or fixture logic was touched.
} from '../../tests/lib/harness.js';

const SLUG = 'helm-aquamarine';

/* ------------------------------------------------------------------ helpers */

// The packet documents the slot value two ways (a bare Block[] on the JSON file vs a CharacterSkills
// carrying its own blocks[] after load). Accept both so a shape guess cannot silently zero a patch.
function slotBlocks(ov: any, slot: 'skill1' | 'skill2' | 'burst'): any[] {
  const s = ov?.[slot];
  if (!s) return [];
  return Array.isArray(s) ? s : (s.blocks ?? []);
}

function allBlocks(ov: any): any[] {
  return [
    ...slotBlocks(ov, 'skill1'),
    ...slotBlocks(ov, 'skill2'),
    ...slotBlocks(ov, 'burst'),
  ];
}

// Flatten a block's effects, descending into escalating.steps so nested burstCdr is reachable.
function effectsOf(b: any): any[] {
  const out: any[] = [];
  const walk = (es: any[]) => {
    for (const e of es ?? []) {
      out.push(e);
      if (Array.isArray(e?.steps)) walk(e.steps);
    }
  };
  walk(b?.effects ?? []);
  return out;
}

const near = (a: number, b: number) =>
  typeof a === 'number' && Math.abs(a - b) < 1e-6;
const hasFlat = (b: any, pct: number) =>
  effectsOf(b).some((e) => e.kind === 'flatDamage' && near(e.atkPct, pct));

function comp(patch?: any): any {
  const c: any = controlComp(SLUG, true);
  if (patch) c.overrides = { ...(c.overrides ?? {}), [SLUG]: patch };
  return c;
}

function run(opts: any) {
  const events: SimEvent[] = [];
  opts.cfg = {
    ...(opts.cfg ?? {}),
    onEvent: (ev: SimEvent) => events.push(ev),
  };
  const res = runComp(opts);
  return { res, events, t: totals(res) as Record<string, number> };
}

const fbCount = (events: SimEvent[]) =>
  (events as any[]).filter((e) => e.kind === 'fullBurstStart').length;
const buffApplies = (events: SimEvent[], stat: string) =>
  (events as any[]).filter((e) => e.kind === 'buffApply' && e.stat === stat);
const others = (t: Record<string, number>) =>
  Object.keys(t).filter((s) => s !== SLUG);

/* ------------------------------------------------- override + counterfactuals */

// Unmodified clone of the committed override — used for the structural (kit-literal) assertions.
const OV: any = withPatchedOverride(SLUG, () => {});

// S1a: kill the 131.34% rider entirely.
const NO_S1A = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of allBlocks(ov)) {
    for (const e of effectsOf(b))
      if (e.kind === 'flatDamage' && near(e.atkPct, 131.34)) e.atkPct = 0;
  }
});
// S1a nearest-wrong A: once per magazine instead of every 30 landed hits (ammo 60 => 2 procs/mag).
const S1A_LASTBULLET = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of allBlocks(ov))
    if (hasFlat(b, 131.34)) b.trigger = { kind: 'lastBullet' };
});
// S1a nearest-wrong B: every trigger pull (60 procs/mag).
const S1A_SHOTFIRED = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of allBlocks(ov))
    if (hasFlat(b, 131.34)) b.trigger = { kind: 'shotFired' };
});

// S1b: no cooldown reduction at all.
const NO_CDR = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of allBlocks(ov))
    for (const e of effectsOf(b)) if (e.kind === 'burstCdr') e.seconds = 0;
});
// S1b nearest-wrong A: flat 1.82s every Full Burst (the 'Once' tier only, no escalation).
const FLAT_CDR = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of slotBlocks(ov, 'skill1')) {
    if (effectsOf(b).some((e) => e.kind === 'burstCdr'))
      b.effects = [{ kind: 'burstCdr', seconds: 1.82 }];
  }
});
// S1b nearest-wrong B: self-only instead of all allies.
const SELF_CDR = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of slotBlocks(ov, 'skill1')) {
    if (effectsOf(b).some((e) => e.kind === 'burstCdr'))
      b.target = { kind: 'self' };
  }
});

// S2a: kill the 105.58% hit.
const NO_S2A = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of allBlocks(ov)) {
    for (const e of effectsOf(b))
      if (e.kind === 'flatDamage' && near(e.atkPct, 105.58)) e.atkPct = 0;
  }
});

// S2b: strip ONLY the Electric gate on the Damage-Taken block -> its active case on the Fire boss.
const S2B_UNGATED = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of slotBlocks(ov, 'skill2')) {
    if (
      effectsOf(b).some((e) => e.kind === 'buff' && e.stat === 'damageTakenPct')
    )
      delete b.bossElementGate;
  }
});

// Burst: strip ONLY the Electric gate on the burst rider.
const BURST_UNGATED = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of slotBlocks(ov, 'burst'))
    if (b.bossElementGate) delete b.bossElementGate;
});
// Burst: kill both 164.83% hits (on a Fire boss only the ungated one is live anyway).
const NO_BURST_HIT = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of slotBlocks(ov, 'burst')) {
    for (const e of effectsOf(b))
      if (e.kind === 'flatDamage' && near(e.atkPct, 164.83)) e.atkPct = 0;
  }
});

/* ------------------------------------------------------------ hoisted runs (11) */

const BASE = run(comp());
const R_NO_S1A = run(comp(NO_S1A));
const R_S1A_LB = run(comp(S1A_LASTBULLET));
const R_S1A_SF = run(comp(S1A_SHOTFIRED));
const R_NO_CDR = run(comp(NO_CDR));
const R_FLAT_CDR = run(comp(FLAT_CDR));
const R_SELF_CDR = run(comp(SELF_CDR));
const R_NO_S2A = run(comp(NO_S2A));
const R_S2B_UNGATED = run(comp(S2B_UNGATED));
const R_BURST_UNGATED = run(comp(BURST_UNGATED));
const R_NO_BURST = run(comp(NO_BURST_HIT));

/* -------------------------------------------------------------------- fixture */

describe('helm-aquamarine — fixture non-vacuity', () => {
  it('the unit is in the comp and deals damage', () => {
    expect(unitOf(BASE.res, SLUG).totalDamage).toBeGreaterThan(0);
    expect((BASE.events as any[]).some((e) => e.kind === 'damage')).toBe(true);
  });

  it('the comp actually reaches Full Burst repeatedly (S1b tiers need >= 3 entries)', () => {
    // A lone Burst II carry would make ZERO Full Bursts; the escalating tiers Once/Twice/Three
    // are only all exercised from the 3rd entry on.
    expect(fbCount(BASE.events)).toBeGreaterThanOrEqual(3);
  });
});

/* ------------------------------------------------------- S1a: 30 hits -> 131.34% */

describe('helm-aquamarine — S1a: after 30 landed normal attacks, 131.34% of final ATK', () => {
  it('the rider fires and contributes damage', () => {
    // RED if the line is MISSING or authored with a trigger that never fires.
    expect(BASE.t[SLUG]).toBeGreaterThan(R_NO_S1A.t[SLUG]);
  });

  it('its cadence is hit-count 30, bracketed between per-magazine and per-shot', () => {
    // ammo 60, hitsPerShot 1 => a faithful hitCount:30 procs ~2x per magazine.
    // lastBullet (1x/mag) must be strictly WORSE, shotFired (60x/mag) strictly BETTER.
    // Both bounds RED any model that mis-reads the activation as per-magazine or per-shot.
    expect(BASE.t[SLUG]).toBeGreaterThan(R_S1A_LB.t[SLUG]);
    expect(BASE.t[SLUG]).toBeLessThan(R_S1A_SF.t[SLUG]);
  });

  it('is enemy-facing only: it moves no teammate', () => {
    for (const s of others(BASE.t)) expect(R_NO_S1A.t[s]).toBe(BASE.t[s]);
  });

  it.skip('per-kit noFb on this rider is MEASURED-ONLY (default OFF) — not derivable from prose', () => {});
});

/* ------------------------------------ S1b: FB-enter escalating burst-CDR to allies */

describe('helm-aquamarine — S1b: entering Full Burst, escalating Burst CD reduction to all allies', () => {
  it('accelerates the team rotation (more Full Bursts than with the CDR removed)', () => {
    // RED if the CDR is MISSING, keyed to a trigger that never fires, or oncePerBattle.
    expect(fbCount(BASE.events)).toBeGreaterThan(fbCount(R_NO_CDR.events));
  });

  it('escalates cumulatively rather than granting a flat 1.82s every entry', () => {
    // Faithful: 1.82 / 4.02 / 6.62 per entry. Nearest-wrong: only the Once tier, forever.
    expect(fbCount(BASE.events)).toBeGreaterThan(fbCount(R_FLAT_CDR.events));
  });

  it('targets ALL ALLIES, not just the caster', () => {
    // Nearest-wrong: target self. The rotation is gated by the teammates' cooldowns too, so a
    // self-only CDR cannot reproduce the ally-wide Full Burst cadence.
    expect(fbCount(BASE.events)).toBeGreaterThan(fbCount(R_SELF_CDR.events));
  });

  it('lifts teammate damage (it is a team effect, not a self effect)', () => {
    for (const s of others(BASE.t))
      expect(BASE.t[s]).toBeGreaterThan(R_NO_CDR.t[s]);
  });
});

/* ------------------------------------------- S2a: 105.58% to 1 random enemy (FLAG) */

describe('helm-aquamarine — S2a: 105.58% of final ATK, 1 enemy, NO activation clause', () => {
  it('the hit exists and contributes damage', () => {
    expect(BASE.t[SLUG]).toBeGreaterThan(R_NO_S2A.t[SLUG]);
  });

  it('is enemy-facing only: it moves no teammate', () => {
    for (const s of others(BASE.t)) expect(R_NO_S2A.t[s]).toBe(BASE.t[s]);
  });

  it.skip('FLAG: the prose gives this line no trigger, so its cadence (interval period) is outside the input domain — measurement-gated, pin from popup spacing in footage', () => {});
});

/* ------------------------- S2b: Electric-gated Damage Taken +5.64%, 5 stacks, 5 sec */

describe('helm-aquamarine — S2b: attacking an Electric Code target, Damage Taken +5.64%', () => {
  it('is INERT against the non-Electric control boss', () => {
    const dt = buffApplies(BASE.events, 'damageTakenPct').filter((e) =>
      near(e.value, 5.64),
    );
    expect(dt.length).toBe(0);
  });

  it('goes live as a boss-held debuff once only the Electric gate is stripped', () => {
    const dt = buffApplies(R_S2B_UNGATED.events, 'damageTakenPct').filter((e) =>
      near(e.value, 5.64),
    );
    expect(dt.length).toBeGreaterThan(30); // per-attack cadence, not once per Full Burst (~8 in 180s)
    expect(dt[0].maxStacks).toBe(5);
    // Boss-held debuffs carry casterIdx === null AND targetIdx === null. Nearest-wrong: authored as
    // an ally/self buff, which would attach to a real unit index.
    expect(dt.every((e: any) => e.targetIdx === null)).toBe(true);
  });

  it('lifts the WHOLE team when live (Damage Taken is a debuff, not a self buff)', () => {
    for (const s of others(BASE.t))
      expect(R_S2B_UNGATED.t[s]).toBeGreaterThan(BASE.t[s]);
    expect(R_S2B_UNGATED.t[SLUG]).toBeGreaterThan(BASE.t[SLUG]);
  });
});

/* ---------------------------------------------------- Burst: 164.83% + 164.83% rider */

describe('helm-aquamarine — Burst: 164.83% to all enemies, +164.83% vs Electric Code', () => {
  it('the unconditional burst hit actually lands in this fixture', () => {
    // Doubles as the burst non-vacuity gate: helm-aquamarine is Burst II and the control comp also
    // holds a Burst II ally, so if she never gets the cast this goes RED and that IS the finding.
    expect(BASE.t[SLUG]).toBeGreaterThan(R_NO_BURST.t[SLUG]);
    expect((BASE.events as any[]).some((e) => e.kind === 'burstCast')).toBe(
      true,
    );
  });

  it('the Electric rider is present but gated off against the Fire control boss', () => {
    // Stripping ONLY the gate must ADD damage: proves the second 164.83% hit exists and that the
    // bossElementGate (not a missing block) is what silences it. Nearest-wrong: an ungated rider,
    // which would already be firing in BASE and leave this delta at zero.
    expect(R_BURST_UNGATED.t[SLUG]).toBeGreaterThan(BASE.t[SLUG]);
  });

  it('neither burst hit touches a teammate', () => {
    for (const s of others(BASE.t)) {
      expect(R_NO_BURST.t[s]).toBe(BASE.t[s]);
      expect(R_BURST_UNGATED.t[s]).toBe(BASE.t[s]);
    }
  });
});

/* ------------------------------------------------- structural (kit-literal) shape */

describe('helm-aquamarine — override structure matches the kit text literally', () => {
  it('S1a: 131.34% flatDamage on a hitCount(30) enemy-facing block', () => {
    const b = allBlocks(OV).find((x) => hasFlat(x, 131.34));
    expect(b).toBeTruthy();
    expect(b.slot).toBe('skill1');
    expect(b.trigger.kind).toBe('hitCount');
    expect(b.trigger.count).toBe(30);
    expect(b.target.kind).toBe('enemy');
  });

  it('S1b: fullBurstEnter -> allies, escalating burstCdr 1.82 / 2.2 / 2.6, not oncePerBattle', () => {
    const b = slotBlocks(OV, 'skill1').find((x) =>
      effectsOf(x).some((e) => e.kind === 'burstCdr'),
    );
    expect(b).toBeTruthy();
    expect(b.trigger.kind).toBe('fullBurstEnter');
    expect(b.target.kind).toBe('allies');
    expect(b.target.excludeSelf).toBeFalsy(); // the header says ALL allies
    expect((b.effects ?? []).some((e: any) => e.kind === 'escalating')).toBe(
      true,
    );
    const secs = effectsOf(b)
      .filter((e) => e.kind === 'burstCdr')
      .map((e) => e.seconds)
      .sort((x: number, y: number) => x - y);
    expect(secs).toEqual([1.82, 2.2, 2.6]);
    expect(
      effectsOf(b).some((e) => e.kind === 'burstCdr' && e.oncePerBattle),
    ).toBe(false);
  });

  it('S2a: 105.58% flatDamage lives on skill2 and faces the enemy', () => {
    const b = allBlocks(OV).find((x) => hasFlat(x, 105.58));
    expect(b).toBeTruthy();
    expect(b.slot).toBe('skill2');
    expect(b.target.kind).toBe('enemy');
    // trigger intentionally NOT asserted: the prose supplies none (flagged above).
  });

  it('S2b: damageTakenPct 5.64 / 5 stacks / 5 sec behind bossElementGate Electric', () => {
    const b = allBlocks(OV).find((x) =>
      effectsOf(x).some(
        (e) => e.kind === 'buff' && e.stat === 'damageTakenPct',
      ),
    );
    expect(b).toBeTruthy();
    expect(b.slot).toBe('skill2');
    expect(b.bossElementGate).toBe('Electric');
    expect(b.target.kind).toBe('enemy');
    const e = effectsOf(b).find(
      (x) => x.kind === 'buff' && x.stat === 'damageTakenPct',
    );
    expect(e.value).toBeCloseTo(5.64, 6);
    expect(e.maxStacks).toBe(5);
    expect(e.durationSec).toBe(5);
  });

  it('Burst: exactly two 164.83% hits, exactly one of them Electric-gated, both burstCast', () => {
    const hits = slotBlocks(OV, 'burst').flatMap((b) =>
      effectsOf(b)
        .filter((e) => e.kind === 'flatDamage' && near(e.atkPct, 164.83))
        .map((e) => ({ b, e })),
    );
    expect(hits.length).toBe(2);
    expect(hits.filter((h) => h.b.bossElementGate === 'Electric').length).toBe(
      1,
    );
    expect(hits.filter((h) => !h.b.bossElementGate).length).toBe(1);
    for (const h of hits) {
      expect(h.b.trigger.kind).toBe('burstCast');
      expect(h.b.target.kind).toBe('enemy');
    }
  });
});

```

==============================================================================
## 6. S6 BLIND OVERRIDE (claude-opus-5) + DIFF vs DRIVER OVERRIDE
==============================================================================

### Driver-authored diff summary (driver override vs S6 blind override, both independently derived)
- **skill1 (S1a hitCount:30 -> 131.34 flatDamage enemy): IDENTICAL.**
- **skill1 (S1b fullBurstEnter -> allies -> escalating burstCdr [1.82,2.2,2.6]): IDENTICAL.**
- **skill2 (S2a 105.58 flatDamage enemy): trigger CADENCE differs** — driver `interval:{sec:4}` (the DATAMINED
  skillCooldownsSec.skill2 = 4s, resolved 2026-07-20) vs blind `interval:{sec:10}` (an honest placeholder ⚑ — the prose gives
  this line NO activation clause, so the blind could not derive the cadence and flagged it). Driver is datamined-grounded;
  blind is a sanctioned always-⚑. Same trigger KIND (interval), same magnitude (105.58), same target.
- **skill2 (S2b Electric damageTaken): IDENTICAL** — both `shotFired + bossElementGate:'Electric' + buff damageTakenPct 5.64 /
  maxStacks 5 / durationSec 5`. (The driver REVISED to this granular stacking encoding during the gauntlet on cross-family
  evidence: fable S2b AND opus S5/S6 both independently derived it; leona precedent; engine supports maxStacks. The driver's
  prior bossElement-trigger permanent-28.2 steady-state collapse was sim-identical to 0.019% but less literally faithful.)
- **burst (Ba burstCast -> 164.83 flatDamage enemy): IDENTICAL.**
- **burst (Bb burstCast + bossElementGate:'Electric' -> 164.83 flatDamage enemy): IDENTICAL.**

So 5 of 6 lines are line-for-line identical between the independent blind override and the driver override; the 6th (S2a
cadence) differs only in the datamined-vs-placeholder interval period (same kind/magnitude/target).

### S6 blind override source
```json
{
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "hitCount",
        "count": 30
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 131.34,
          "crit": true
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
      "effects": [
        {
          "kind": "escalating",
          "steps": [
            {
              "kind": "burstCdr",
              "seconds": 1.82
            },
            {
              "kind": "burstCdr",
              "seconds": 2.2
            },
            {
              "kind": "burstCdr",
              "seconds": 2.6
            }
          ]
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
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 105.58,
          "crit": true
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "shotFired"
      },
      "target": {
        "kind": "enemy"
      },
      "bossElementGate": "Electric",
      "effects": [
        {
          "kind": "buff",
          "stat": "damageTakenPct",
          "value": 5.64,
          "durationSec": 5,
          "maxStacks": 5
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
          "atkPct": 164.83,
          "crit": true,
          "noFb": true
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
      "bossElementGate": "Electric",
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 164.83,
          "crit": true,
          "noFb": true
        }
      ]
    }
  ]
}
```

==============================================================================
## 7. DRIVER IMPLEMENTATION — scripts/tests/units/helm-aquamarine.test.ts + src/skills/overrides/helm-aquamarine.json
==============================================================================

### Driver override (the encoding under test)
```json
{
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Remove this banner only when the unit has been measured/hand-tuned. || helm-aquamarine (Helm: Aquamarine) — AR/Iron/ATTACKER/Burst II. NOT base `helm` (SR Supporter healer) — no heal anywhere in THIS kit; do not conflate. Kit-parse AUTHOR pass 2026-07-16 (wave 2), merging the reviewed staged baseline (src/skills/overrides-baselines/helm-aquamarine.json) — all its hypotheses + ⚑s carried forward. SCOPE-LOCK CONTEXT: boss is NOT Electric, so both 'Electric Code target' lines are faithfully INERT here (Iron is element-advantaged vs Electric — anti-Electric kit theme — the engine's ×1.10 + these gates would all wake vs an Electric boss). AUDIT (6 kit lines): (S1a) 'after landing 30 normal attacks → 131.34% additional damage' = recurring conditional rider (hard rule 5) → hitCount 30 → flatDamage 131.34 (crits at sheet rate by engine default; NO core — text doesn't say core strike; FB by TIMING per prior 2, no noFb; noRange automatic). (S1b) FB-enter escalating team burst-CDR Once 1.82/Twice 2.2/Thrice 2.6 → fullBurstEnter → allies → escalating[burstCdr 1.82, 2.2, 2.6]; the header line 'Each subsequent effect triggers all effects before it' IS the escalating semantics (steps 1..N on the Nth entry) — IMPLEMENTED, not unmodeled. ROTATION LEVER + BLAST RADIUS: touches every teammate's burst cadence — verify with a /sim-battery diff, never sim-vs-sim self-grade. (S2a) 'Affects 1 enemy randomly. Deals 105.58% as damage' — KIT-SILENT TRIGGER (no 'Activates when…' in the official prose) → pure internal timer. RESOLVED 2026-07-20: the datamined skill CD (characters.json skillCooldownsSec.skill2 = 4s) is the true firing cadence → interval:4 → flatDamage 105.58 (fires ~44×/180s, first at t=4). This REPLACES the prior INVENTED proxy hitCount:30 (borrowed from S1's genuine 30-normal-attack trigger — S2 has no such clause; the proxy over-fired at ~2.5s vs the true 4s). Solo total 51.499M→50.142M (−2.6%); MODEL_ONLY (no graded comp), backed by kit-text-has-no-activation-clause + datamined CD (docs/handoffs/2026-07-20-skill-cooldowns-to-sim.md, class-1 pure-timer). ⚑ first-fire phase (t=4 vs t=0) unpinned — worth ~1 proc; pin from a focused-solo popup if she is ever graded. (S2b) 'when attacking an Electric Code target: Damage Taken ▲5.64%, stacks 5, lasts 5s' → shotFired + bossElementGate:'Electric' → BOSS debuff damageTakenPct 5.64 / maxStacks 5 / durationSec 5 (REVISED 2026-07-25 from the prior bossElement-trigger steady-state-28.2 collapse, on the kit-autonomy gauntlet's cross-family evidence: BOTH blind reviewers — fable S2b and opus S5/S6 — independently derived this granular stacking encoding, the opus S6 blind override reproduces it line-for-line, and it follows the leona precedent for a stacking 5-stack/5s buff; the engine supports maxStacks, types.ts:195). 'When attacking' = shotFired (per pull); the bossElementGate composes with the real trigger (inert vs a non-Electric boss). AR continuous fire rebuilds 5 stacks in ~1s and refreshes well inside the 5s window → steady-state mult.taken 1.282 (= 5.64 x 5 = 28.2 effective), identical to the prior collapse to 0.019% (the only difference is the faithful ~0.5s stack ramp at fight start, which the old permanent-28.2 slightly over-credited). INERT under scope-lock (non-Electric boss). (Ba) 'all enemies: 164.83% Burst Skill damage' → burstCast → flatDamage 164.83 (burst-cast auto FB-exempt, snapshots pre-FB; single boss so all-enemies = the target). (Bb) 'when attacking an Electric Code target: 164.83% additional damage' (burst slot) — NOW MODELED (2026-07-20) via burstCast + bossElementGate:'Electric' (the schema gained the block gate, sim.ts:1706; brid-silent-track/eve/marciana-marine-study use the same pattern). Inert vs the non-Electric scope-lock boss (gate closed -> exactly ONE 164.83% burst hit per cast); vs an Electric boss it awakes as a SECOND 164.83% burst hit per cast. Modeling it ungated would add +164.83%/burst vs EVERY boss = fudge, so the gate is load-bearing. (This paragraph previously read UNMODELED — stale, pre-dating the bossElementGate feature; unmodeled.burst is and stays empty.) NO heal/shield/DEF/HP/lifesteal/gauge/reload/ammo/Hit-Rate lines exist in this kit (hard rules 1–4 vacuous). ⚑ LIST: [1] cadence tuple — pullsPerSec (datamine AR default) / reloadFrames 81 / rolling-reload; ammo 60 empties in several seconds at class rate, no text tells of a special fire mode → standard-priority; recipe: rounds/min + reload gap from any focus video. [2] S2a trigger+cadence RESOLVED 2026-07-20 → interval:4 from the datamined skill CD (was ⚑TOP invented hitCount:30); residual ⚑ = first-fire phase only (t=4 vs t=0). Optional confirm: focused solo, time the first 105.58% popup + its interval. [3] S2b steady-state 28.2 uptime assumption — untestable under scope-lock (needs an Electric boss). [4] Bb Electric burst rider — RESOLVED 2026-07-20 (burstCast + bossElementGate:'Electric'); residual flag = unmeasured vs a real Electric boss (inert under scope-lock). [5] burstCdr rotation blast radius — /sim-battery diff before any board-level claim. Faithful>fit; measured>fudge. || Kit-autonomy gauntlet 2026-07-25: re-validated test-first — scripts/tests/units/helm-aquamarine.test.ts (24 assertions GREEN vs this override; each of the 6 kit lines pinned GREEN vs shipped and RED vs its nearest-wrong counterfactual: removed / magnitude-121.05 S1 rider; burstCast-keyed + flat-2.6 CDR ladder; removed / hitCount-30-proxy S2 interval hit; ungated-passive Electric damageTaken; magnitude-157.33 burst nuke; removed / ungated Electric burst rider). The two Electric-gated lines (S2 damageTaken 28.2, Bb extra 164.83%) are pinned in BOTH states — inert vs Iron (the scope-lock basis: no debuff, mult.taken 1.0, 1 burst hit/cast) and live vs Electric (debuff 28.2, mult.taken 1.282, 2 burst hits/cast). Cross-family S2b (claude-fable-5) independently re-derived all 6 lines FAITHFUL from prose with matching discriminations, no REAL-GOTCHA; dispositions converge. Reconciled divergences (none load-bearing): the driver used a custom sole-B2 fixture [liter / helm-aquamarine / helm] (NOT controlComp — avoids the crown B2 contention the reviewer flagged); S2 damageTaken uses the documented bossElement steady-state collapse (28.2 = 5.64 x 5; the engine has no per-shot stack-accrual path), functionally equivalent to the reviewer's shotFired+gate at AR cadence; the S1 CDR is discriminated by trigger-identity (burstCast 12 casts > faithful fullBurstEnter 10) plus escalating-vs-flat 180s total, because the reviewer's suggested FB-count fire-rate does NOT discriminate here (measured: removing the CDR leaves the FB count at 5 — the 40s Burst III partner gates the rotation). TIER 2 (escalating burstCdr rotation lever + hitCount round-count + interval timer + burstCast-vs-fullBurstEnter + bossElement/bossElementGate status gates). Still MODEL_ONLY/unmeasured — the PARSER-BASELINE measurement banner above stands (the gauntlet validates kit FAITHFULNESS, not a real-fight tune). The S2b leak flag was packet-hygiene only (a redacted schema example retained the +164.83% magnitude); the reviewer reasoned from prose independently.",
  "unmodeled": {
    "skill1": [],
    "skill2": [],
    "burst": []
  },
  "caveats": [
    "skill2: the 105.58% random-enemy hit has NO kit-stated trigger — fires on its datamined internal cooldown (interval:4, skillCooldownsSec.skill2), resolved 2026-07-20 (was an invented hitCount:30 proxy)",
    "burst: the extra 164.83% vs Electric Code targets is now modeled (burstCast + bossElementGate 'Electric'); inert vs the non-Electric scope-lock boss, awakes as a second 164.83% burst hit vs an Electric boss",
    "skill2: the Damage Taken debuff only applies against Electric Code bosses (inert in the scope-lock context)",
    "cadence: assault-rifle fire rate and reload timing are datamined defaults, not yet measured from video"
  ],
  "skill1": [
    {
      "slot": "skill1",
      "trigger": { "kind": "hitCount", "count": 30 },
      "target": { "kind": "enemy" },
      "effects": [{ "kind": "flatDamage", "atkPct": 131.34 }]
    },
    {
      "slot": "skill1",
      "trigger": { "kind": "fullBurstEnter" },
      "target": { "kind": "allies" },
      "effects": [
        {
          "kind": "escalating",
          "steps": [
            { "kind": "burstCdr", "seconds": 1.82 },
            { "kind": "burstCdr", "seconds": 2.2 },
            { "kind": "burstCdr", "seconds": 2.6 }
          ]
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": { "kind": "interval", "sec": 4 },
      "target": { "kind": "enemy" },
      "effects": [{ "kind": "flatDamage", "atkPct": 105.58 }]
    },
    {
      "slot": "skill2",
      "trigger": { "kind": "shotFired" },
      "bossElementGate": "Electric",
      "target": { "kind": "enemy" },
      "effects": [
        {
          "kind": "buff",
          "stat": "damageTakenPct",
          "value": 5.64,
          "maxStacks": 5,
          "durationSec": 5
        }
      ]
    }
  ],
  "burst": [
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "enemy" },
      "effects": [{ "kind": "flatDamage", "atkPct": 164.83 }]
    },
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "bossElementGate": "Electric",
      "target": { "kind": "enemy" },
      "effects": [{ "kind": "flatDamage", "atkPct": 164.83 }]
    }
  ]
}

```

### Driver unit test (24 assertions, GREEN vs the driver override)
```typescript
// PER-UNIT KIT SPEC — `helm-aquamarine` (Helm: Aquamarine, Attacker/AR/Iron, Burst II, cd 20s,
// ammo 60, reloadFrames 81, hitsPerShot 1, normalMult 13.65 / coreMult 200, no charge, critRate 15 /
// critDamage 150). Kit-autonomy gauntlet 2026-07-25 (driver-authored S2a; tests FIRST).
//
// P0 DISAMBIGUATION: this is `helm-aquamarine` (AR/Iron/Attacker/Burst II, aka "shelm"/"ha") — a
// COMPLETELY DIFFERENT unit from base `helm` (SR/Water/Attacker/Burst III, aka "thelm"). No base-helm
// data, recordings, or encoding are cited or reused here; every magnitude below is read off
// characters['helm-aquamarine'] only. (Base `helm` appears in the fixture ONLY as a Burst III rotation
// partner so this Burst II unit can complete a chain — its kit is irrelevant; every assertion filters
// on slug === 'helm-aquamarine'.) The slug-disambiguation lint flags the bare slug "helm-aquamarine"
// (its "helm-" prefix matches the ambiguous base) — a known false positive; the full name and approved
// nicknames pass clean and there is no conflation.
//
// One assertion group per KIT LINE (HA1..HA6 below), asserted against the SHIPPED override loaded from
// disk. `withPatchedOverride` builds COUNTERFACTUALS only (the nearest-wrong reading each assertion must
// discriminate against) — never the encoding under test.
//
// Kit (data/characters.json → characters['helm-aquamarine'].skills, levels 10/10/10 — the normalized
// `skills` prose is the SSOT):
//   S1 ■ after landing 30 normal attacks → target: 131.34% of final ATK additional damage (recurring)   [HA1]
//      ■ entering Full Burst → all allies: Cooldown of Burst Skill ▼ 1.82 / 2.2 / 2.6 sec               [HA2]
//        (escalating — "Each subsequent effect triggers all effects before it")
//   S2 ■ Affects 1 enemy randomly: 105.58% of final ATK damage (NO kit-stated trigger → datamined 4s CD) [HA3]
//      ■ when attacking an Electric Code target → target: Damage Taken ▲5.64% ×5 stacks / 5s (= 28.2)    [HA4]
//   BU ■ all enemies: 164.83% of final ATK Burst Skill damage                                            [HA5]
//      ■ when attacking an Electric Code target → target: 164.83% of final ATK additional damage         [HA6]
//
// SCOPE-LOCK CONTEXT: the validation boss is NOT Electric, so the two "Electric Code target" lines
// (HA4 damageTaken, HA6 extra burst hit) are faithfully INERT there (Iron is element-advantaged vs
// Electric — this is an anti-Electric kit; the engine's ×1.10 element major + both gates all wake vs an
// Electric boss). The test pins BOTH states: Iron (gates inert — the scope-lock basis) and Electric
// (gates live — the discrimination that proves they are real, not dropped).
//
// Why each assertion discriminates (a test that cannot fail under the nearest-wrong gates nothing):
//   HA1 recurring hitCount-30 rider. PIN: skill-bucket damage at srcSlot skill1, atkPct 131.34, once per
//       30 normal shots (measured cadence shots/proc ≈ 30.27). Nearest-wrong (a) rider removed → zero
//       skill1 hits. (b) magnitude 121.05 (the level-9 value) instead of 131.34. Both discriminated.
//   HA2 "Cooldown of Burst Skill ▼" is a `burstCdr` effect (sim.ts:2047) — it directly refunds ally burst
//       cooldown frames and emits NO buffApply event, so it is observable only through its EFFECT on the
//       rotation. fullBurstEnter trigger (fires on each TEAM FB entry = 5×) vs nearest-wrong burstCast
//       (fires on this unit's OWN 10 casts). Discriminations: (a) STRUCTURAL pin — the shipped block is
//       fullBurstEnter → allies → escalating[burstCdr 1.82, 2.2, 2.6] (the datamined ladder + the engine's
//       escalating slice(0,activations) "triggers all before it" semantics, sim.ts:2056). (b) TRIGGER
//       IDENTITY — re-keying to burstCast over-applies the refund (10 activations vs 5) and over-accelerates
//       the rotation (this unit casts 12× vs 10×): the cadence under fullBurstEnter is provably distinct from
//       burstCast. (c) ESCALATING vs FLAT — a non-escalating "always 2.6" encoding refunds less total cooldown
//       than the ramping ladder (which reaches 1.82+2.2+2.6 from the 3rd FB), so it yields a strictly lower
//       180s total. NOTE: removing the block does NOT change this Burst II unit's own cast COUNT (her cadence
//       is chain-gated by the Burst I/III partners), so the fire-rate signal used for a Burst I carrier
//       (volume) is unavailable here — the trigger-identity + escalating-vs-total discriminations carry it.
//   HA3 the 105.58% random-enemy hit has NO "Activates when…" clause in the official prose → pure internal
//       timer = the datamined skill CD (skillCooldownsSec.skill2 = 4s) → interval:4 (first fire t=4, ~44×/180s).
//       PIN: skill-bucket damage at srcSlot skill2, atkPct 105.58, ≈44 procs. Nearest-wrong (a) removed → zero
//       skill2 hits. (b) the PRE-2026-07-20 invented proxy hitCount:30 (borrowed from HA1's genuine 30-normal
//       trigger) — it ties proc count to shot count and OVER-fires (≈55 vs the true ≈44): the interval cadence
//       is provably distinct from the hitCount proxy. This pins the 2026-07-20 resolution.
//   HA4 the Damage Taken debuff is GATED on an Electric boss (shotFired trigger composed with the
//       bossElementGate 'Electric' block gate). "Activates when attacking" = shotFired (per pull); each apply
//       is one 5.64% stack, maxStacks 5 / 5s — the kit's literal "▲5.64%, stacks up to 5 times, lasts 5 sec"
//       (the engine supports maxStacks, types.ts:195; leona precedent for a stacking 5-stack/5s buff). AR
//       continuous fire rebuilds 5 stacks in ~1s and refreshes inside the 5s window → steady-state mult.taken
//       1.282 (= 5.64×5 = 28.2 effective). Vs Electric the boss carries the stacking damageTakenPct 5.64 debuff
//       and this unit's mult.taken reaches 1.282; vs an Iron boss BOTH vanish (gate inert) and mult.taken is
//       1.0. Nearest-wrong: stripping the gate fires the stacking debuff vs EVERY boss — asserted present vs
//       Iron under the counterfactual (mult.taken reaches 1.282), absent under shipped. (REVISED 2026-07-25 from
//       a bossElement-trigger permanent-28.2 collapse, on cross-family evidence: both blind reviewers + the opus
//       S6 blind override independently derived this granular stacking encoding line-for-line.)
//   HA5 the burst nuke is 164.83% in the burst bucket, one hit per cast, cast BEFORE the FB window (no +50%
//       major — burst-skill damage is FB-exempt). Nearest-wrong: magnitude 157.33 (level-9 value).
//   HA6 the EXTRA 164.83% vs Electric Code targets is a SECOND burst hit composed of burstCast + the
//       bossElementGate 'Electric' block gate (sim.ts:1706). Vs Electric there are 2 burst hits per cast
//       (HA5 + HA6); vs Iron the gate blocks HA6 → 1 hit per cast. Nearest-wrong (a) the HA6 block removed →
//       only 1 hit/cast vs Electric. (b) the gate dropped (ungated) → 2 hits/cast vs EVERY boss (fudge) —
//       asserted vs Iron, where shipped keeps it at 1.
//
// Fixture: helm-aquamarine is Burst II, so a custom sole-B2 comp [liter(B1) / helm-aquamarine(B2) / helm(B3)]
// is used (NOT controlComp, which adds crown as a second B2). liter is the sole Burst I and helm the sole
// Burst III (cd 40s), so the team completes 5 Full Bursts over 180s while this unit casts her burst 10× —
// burstCast (10) ≠ fullBurstEnter (5), which is what lets HA2's trigger-identity assertion discriminate by
// count. Two boss elements: Iron (neutral for Iron — element major 1.0, both Electric gates inert; the
// scope-lock basis) and Electric (her intended target — ×1.10 major, both gates live). Focus helm-aquamarine
// (harmless for an AR — focus only matters on charge weapons). Deterministic (no seed). Slot order:
// liter 0 / helm-aquamarine 1 / helm 2.
import { describe, expect, it } from 'vitest';
import type { Element, SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import {
  runComp,
  totals,
  withPatchedOverride,
  type CompOptions,
} from '../lib/harness.js';

const HA = 1; // slot order: liter 0 / helm-aquamarine 1 / helm 2

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

const haComp = (bossElement: Element | null): CompOptions => ({
  slugs: ['liter', 'helm-aquamarine', 'helm'],
  bossElement,
  focusSlug: 'helm-aquamarine',
});

function run(
  overrides: Record<string, any> = {},
  bossElement: Element | null = 'Iron',
) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...haComp(bossElement),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- readers ---------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const haDamage = (evs: SimEvent[], srcSlot: Damage['srcSlot']) =>
  dmg(evs).filter((d) => d.slug === 'helm-aquamarine' && d.srcSlot === srcSlot);
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const haBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast =>
      e.kind === 'burstCast' && e.slug === 'helm-aquamarine',
  );
const haShots = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is Shot => e.kind === 'shot' && e.slug === 'helm-aquamarine',
  );

/** Dedup precision-sensitive floats (kit magnitudes / mult decomposition). */
const distinctNum = (xs: number[], dp = 6) =>
  [...new Set(xs.map((x) => Number(x.toFixed(dp))))].sort((a, b) => a - b);
/** Dedup exact values (strings / ints) — no rounding. */
const distinct = <T>(xs: T[]): T[] => [...new Set(xs)];

// ---- counterfactual patches (nearest-wrong readings) ----------------------------------------
/** HA1 nearest-wrong (presence): the 30-normal-attack rider removed entirely. */
const cfS1aRemoved = withPatchedOverride('helm-aquamarine', (ov: any) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => b.trigger?.kind !== 'hitCount');
  if (ov.skill1.length === before)
    throw new Error(
      'helm-aquamarine S1 hitCount rider missing — fixture is stale',
    );
});
/** HA1 nearest-wrong (magnitude): the rider at the level-9 value 121.05 instead of 131.34. */
const cfS1aMag = withPatchedOverride('helm-aquamarine', (ov: any) => {
  const e = ov.skill1
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'flatDamage');
  if (!e || e.atkPct !== 131.34)
    throw new Error(
      'helm-aquamarine S1 131.34% flatDamage missing — fixture is stale',
    );
  e.atkPct = 121.05;
});
const isCdrBlock = (b: any) =>
  b.trigger?.kind === 'fullBurstEnter' &&
  b.effects?.some(
    (e: any) =>
      e.kind === 'escalating' &&
      e.steps?.some((s: any) => s.kind === 'burstCdr'),
  );
/** HA2 nearest-wrong (trigger): the CDR ladder re-keyed fullBurstEnter → burstCast (over-applies). */
const cfS1bBurstCast = withPatchedOverride('helm-aquamarine', (ov: any) => {
  let hit = 0;
  for (const b of ov.skill1)
    if (isCdrBlock(b)) ((b.trigger = { kind: 'burstCast' }), hit++);
  if (!hit)
    throw new Error(
      'helm-aquamarine S1 burstCdr block missing — fixture is stale',
    );
});
/** HA2 nearest-wrong (escalating): the ladder collapsed to a flat "always 2.6" burstCdr. */
const cfS1bFlat = withPatchedOverride('helm-aquamarine', (ov: any) => {
  const b = ov.skill1.find((x: any) => isCdrBlock(x));
  if (!b)
    throw new Error(
      'helm-aquamarine S1 burstCdr block missing — fixture is stale',
    );
  b.effects = [{ kind: 'burstCdr', seconds: 2.6 }];
});
/** HA3 nearest-wrong (presence): the random-enemy hit removed entirely. */
const cfS2aRemoved = withPatchedOverride('helm-aquamarine', (ov: any) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => b.trigger?.kind !== 'interval');
  if (ov.skill2.length === before)
    throw new Error(
      'helm-aquamarine S2 interval hit missing — fixture is stale',
    );
});
/** HA3 nearest-wrong (cadence): the pre-2026-07-20 invented hitCount:30 proxy (ties to shot count). */
const cfS2aHitCount = withPatchedOverride('helm-aquamarine', (ov: any) => {
  let hit = 0;
  for (const b of ov.skill2)
    if (b.trigger?.kind === 'interval')
      ((b.trigger = { kind: 'hitCount', count: 30 }), hit++);
  if (!hit)
    throw new Error(
      'helm-aquamarine S2 interval hit missing — fixture is stale',
    );
});
/** HA4 nearest-wrong (gate): the Electric gate stripped → the stacking debuff fires vs every boss (fudge). */
const cfS2bUngated = withPatchedOverride('helm-aquamarine', (ov: any) => {
  let hit = 0;
  for (const b of ov.skill2)
    if (
      b.bossElementGate &&
      b.effects?.some((e: any) => e.stat === 'damageTakenPct')
    )
      (delete b.bossElementGate, hit++);
  if (!hit)
    throw new Error(
      'helm-aquamarine S2 Electric-gated debuff missing — fixture is stale',
    );
});
/** HA5 nearest-wrong (magnitude): the burst nuke at the level-9 value 157.33 instead of 164.83. */
const cfBaMag = withPatchedOverride('helm-aquamarine', (ov: any) => {
  const b = ov.burst.find(
    (x: any) => x.trigger?.kind === 'burstCast' && !x.bossElementGate,
  );
  if (!b || b.effects[0]?.atkPct !== 164.83)
    throw new Error(
      'helm-aquamarine burst 164.83% nuke missing — fixture is stale',
    );
  b.effects[0].atkPct = 157.33;
});
/** HA6 nearest-wrong (presence): the Electric extra-hit block removed. */
const cfBbRemoved = withPatchedOverride('helm-aquamarine', (ov: any) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !b.bossElementGate);
  if (ov.burst.length === before)
    throw new Error(
      'helm-aquamarine burst bossElementGate block missing — fixture is stale',
    );
});
/** HA6 nearest-wrong (gate): the bossElementGate dropped → the extra hit fires vs every boss (fudge). */
const cfBbUngated = withPatchedOverride('helm-aquamarine', (ov: any) => {
  let hit = 0;
  for (const b of ov.burst)
    if (b.bossElementGate) (delete b.bossElementGate, hit++);
  if (!hit)
    throw new Error(
      'helm-aquamarine burst bossElementGate block missing — fixture is stale',
    );
});

// ---- runs (hoisted: each is a full 180s sim) -------------------------------------------------
const base = run(); // Iron, shipped (Electric gates inert)
const elec = run({}, 'Electric'); // Electric, shipped (Electric gates live)
const s1aRemoved = run({ 'helm-aquamarine': cfS1aRemoved });
const s1aMag = run({ 'helm-aquamarine': cfS1aMag });
const s1bBurstCast = run({ 'helm-aquamarine': cfS1bBurstCast });
const s1bFlat = run({ 'helm-aquamarine': cfS1bFlat });
const s2aRemoved = run({ 'helm-aquamarine': cfS2aRemoved });
const s2aHitCount = run({ 'helm-aquamarine': cfS2aHitCount });
const s2bUngated = run({ 'helm-aquamarine': cfS2bUngated }); // Iron
const baMag = run({ 'helm-aquamarine': cfBaMag });
const bbRemoved = run({ 'helm-aquamarine': cfBbRemoved }, 'Electric');
const bbUngated = run({ 'helm-aquamarine': cfBbUngated }); // Iron

const casts = haBursts(base.events).length; // this unit's burst casts (10)

describe('helm-aquamarine — kit spec', () => {
  describe('fixture sanity — she casts her burst and the team reaches Full Burst', () => {
    it('casts >0 bursts and the team completes >0 Full Bursts (burst-gated lines are not vacuous)', () => {
      expect(casts).toBeGreaterThan(0);
      const fbs = base.events.filter((e) => e.kind === 'fullBurstStart').length;
      expect(fbs).toBeGreaterThan(0);
    });
  });

  describe('HA1 — S1 131.34% additional damage every 30 normal attacks (recurring hitCount rider)', () => {
    it('procs at the kit magnitude 131.34 in the skill bucket, srcSlot skill1', () => {
      const procs = haDamage(base.events, 'skill1');
      expect(procs.length).toBeGreaterThan(0);
      expect(
        distinctNum(
          procs.map((d) => d.atkPct),
          4,
        ),
      ).toEqual([131.34]);
      expect(distinct(procs.map((d) => d.bucket))).toEqual(['skill']);
    });
    it('fires once per 30 normal shots (the hitCount-30 cadence, not a proxy)', () => {
      const shots = haShots(base.events).length;
      const procs = haDamage(base.events, 'skill1').length;
      const ratio = shots / procs;
      expect(
        ratio,
        `${shots} shots / ${procs} procs = ${ratio.toFixed(2)} shots/proc — expected ≈30`,
      ).toBeGreaterThanOrEqual(29);
      expect(ratio).toBeLessThanOrEqual(31);
    });
    it('DISCRIMINATING (presence): removing the rider yields zero skill1 hits', () => {
      expect(haDamage(s1aRemoved.events, 'skill1').length).toBe(0);
    });
    it('DISCRIMINATING (magnitude): the level-9 reading lands at 121.05, not 131.34', () => {
      expect(
        distinctNum(
          haDamage(s1aMag.events, 'skill1').map((d) => d.atkPct),
          4,
        ),
      ).toEqual([121.05]);
    });
  });

  describe('HA2 — S1 FB-enter Cooldown of Burst Skill ▼ 1.82/2.2/2.6 sec (escalating burstCdr), all allies', () => {
    it('STRUCTURAL: shipped is fullBurstEnter → allies → escalating[burstCdr 1.82, 2.2, 2.6]', () => {
      const shipped: any = loadOverride('helm-aquamarine');
      const block = shipped.skill1.find((b: any) => isCdrBlock(b));
      expect(
        block,
        'no fullBurstEnter escalating-burstCdr block on skill1',
      ).toBeDefined();
      expect(block.trigger).toEqual({ kind: 'fullBurstEnter' });
      expect(block.target.kind).toBe('allies');
      const esc = block.effects.find((e: any) => e.kind === 'escalating');
      expect(esc.steps.map((s: any) => s.kind)).toEqual([
        'burstCdr',
        'burstCdr',
        'burstCdr',
      ]);
      // "Each subsequent effect triggers all effects before it" = the escalating ladder, datamined.
      expect(esc.steps.map((s: any) => s.seconds)).toEqual([1.82, 2.2, 2.6]);
    });
    it('DISCRIMINATING (trigger): fullBurstEnter (5 activations) ≠ burstCast (10) — burstCast over-accelerates', () => {
      // re-keying the refund to burstCast applies it twice as often → strictly more of this unit's casts
      // (deterministic: 10 under the faithful fullBurstEnter keying vs 12 under burstCast).
      expect(haBursts(s1bBurstCast.events).length).toBeGreaterThan(casts);
    });
    it('DISCRIMINATING (escalating): a flat always-2.6 encoding refunds less total CDR → strictly lower 180s total', () => {
      // the ramping ladder reaches 1.82+2.2+2.6 = 6.62s/FB from the 3rd entry, far more total refund than
      // a flat 2.6s/FB → the faithful escalating model rotates faster and out-damages the flat counterfactual.
      expect(base.totals['helm-aquamarine']).toBeGreaterThan(
        s1bFlat.totals['helm-aquamarine'],
      );
    });
  });

  describe('HA3 — S2 105.58% random-enemy hit on the datamined 4s internal timer (interval, NOT hitCount)', () => {
    it('procs at the kit magnitude 105.58 in the skill bucket, srcSlot skill2', () => {
      const procs = haDamage(base.events, 'skill2');
      expect(procs.length).toBeGreaterThan(0);
      expect(
        distinctNum(
          procs.map((d) => d.atkPct),
          4,
        ),
      ).toEqual([105.58]);
      expect(distinct(procs.map((d) => d.bucket))).toEqual(['skill']);
    });
    it('fires on the 4s interval cadence (≈44×/180s), independent of shot count', () => {
      const procs = haDamage(base.events, 'skill2').length;
      expect(procs).toBeGreaterThanOrEqual(43);
      expect(procs).toBeLessThanOrEqual(45);
    });
    it('DISCRIMINATING (presence): removing the hit yields zero skill2 hits', () => {
      expect(haDamage(s2aRemoved.events, 'skill2').length).toBe(0);
    });
    it('DISCRIMINATING (cadence): the invented hitCount:30 proxy over-fires vs the true 4s interval', () => {
      // the pre-2026-07-20 proxy ties proc count to shot count (~55) and over-fires the true ~44 interval;
      // the two cadences are provably distinct, pinning the interval:4 resolution.
      expect(haDamage(s2aHitCount.events, 'skill2').length).toBeGreaterThan(
        haDamage(base.events, 'skill2').length,
      );
    });
  });

  describe('HA4 — S2 Damage Taken ▲5.64%×5 stacks/5s (28.2 effective) is gated on an Electric boss', () => {
    it('vs Electric: the boss carries a stacking damageTakenPct 5.64 debuff (maxStacks 5, targetIdx null)', () => {
      const debuff = buffs(elec.events).filter(
        (b) => b.stat === 'damageTakenPct' && b.targetIdx === null,
      );
      expect(
        debuff.length,
        'no boss damageTakenPct debuff vs Electric',
      ).toBeGreaterThan(0);
      // granular stacking encoding (shotFired + bossElementGate): each apply is one 5.64% stack,
      // capped at 5 stacks (= 28.2 effective) — matches the kit's "▲5.64%, stacks up to 5 times".
      expect(distinctNum(debuff.map((b) => b.value))).toEqual([5.64]);
      expect(distinct(debuff.map((b) => (b as any).maxStacks))).toEqual([5]);
    });
    it('vs Electric: her damage actually takes the +28.2% (mult.taken reaches 1.282)', () => {
      const taken = distinctNum(
        dmg(elec.events)
          .filter((d) => d.slug === 'helm-aquamarine' && d.bucket === 'normal')
          .map((d) => d.mult.taken),
        4,
      );
      expect(
        taken.some((t) => Math.abs(t - 1.282) < 1e-3),
        `mult.taken values ${taken} never reach 1.282`,
      ).toBe(true);
    });
    it('DISCRIMINATING gate: vs an Iron boss the debuff is absent and mult.taken stays 1.0', () => {
      const debuff = buffs(base.events).filter(
        (b) => b.stat === 'damageTakenPct' && b.targetIdx === null,
      );
      expect(debuff).toEqual([]);
      expect(
        distinctNum(
          dmg(base.events)
            .filter(
              (d) => d.slug === 'helm-aquamarine' && d.bucket === 'normal',
            )
            .map((d) => d.mult.taken),
          4,
        ),
      ).toEqual([1]);
    });
    it('DISCRIMINATING (gate vs fudge): stripping the Electric gate fires the stacking debuff vs the Iron boss', () => {
      const debuff = buffs(s2bUngated.events).filter(
        (b) => b.stat === 'damageTakenPct' && b.targetIdx === null,
      );
      expect(
        debuff.length,
        'ungating the debuff did not apply it vs Iron — gate is inert anyway',
      ).toBeGreaterThan(0);
      expect(distinctNum(debuff.map((b) => b.value))).toEqual([5.64]);
      // …and her Iron-boss damage actually takes the stacked +28.2% (mult.taken reaches 1.282),
      // proving the gate is the ONLY thing holding the debuff off the non-Electric boss.
      const taken = distinctNum(
        dmg(s2bUngated.events)
          .filter((d) => d.slug === 'helm-aquamarine' && d.bucket === 'normal')
          .map((d) => d.mult.taken),
        4,
      );
      expect(
        taken.some((t) => Math.abs(t - 1.282) < 1e-3),
        `ungated mult.taken values ${taken} never reach 1.282`,
      ).toBe(true);
    });
    it('Iron is element-neutral for her (Iron major 1.0; Electric is the ×1.10 advantage)', () => {
      expect(
        distinctNum(
          dmg(base.events)
            .filter(
              (d) => d.slug === 'helm-aquamarine' && d.bucket === 'normal',
            )
            .map((d) => d.mult.elem),
          4,
        ),
      ).toEqual([1]);
      expect(
        distinctNum(
          dmg(elec.events)
            .filter(
              (d) => d.slug === 'helm-aquamarine' && d.bucket === 'normal',
            )
            .map((d) => d.mult.elem),
          4,
        ),
      ).toEqual([1.1]);
    });
  });

  describe('HA5 — burst 164.83% Burst Skill damage to all enemies (one hit/cast, FB-exempt)', () => {
    const nukes = (evs: SimEvent[]) => haDamage(evs, 'burst');
    it('fires once per cast at the kit magnitude, in the burst bucket', () => {
      expect(nukes(base.events).length).toBe(casts);
      expect(nukes(base.events).length).toBeGreaterThan(0);
      expect(
        distinctNum(
          nukes(base.events).map((d) => d.atkPct),
          4,
        ),
      ).toEqual([164.83]);
      expect(distinct(nukes(base.events).map((d) => d.bucket))).toEqual([
        'burst',
      ]);
    });
    it('never takes the +50% Full Burst major (burst-skill damage is cast before FB opens)', () => {
      expect(
        nukes(base.events)
          .filter((d) => d.fbMajorApplied)
          .map((d) => d.sec),
      ).toEqual([]);
    });
    it('DISCRIMINATING (magnitude): the level-9 reading lands at 157.33, not 164.83', () => {
      expect(
        distinctNum(
          nukes(baMag.events).map((d) => d.atkPct),
          4,
        ),
      ).toEqual([157.33]);
    });
  });

  describe('HA6 — burst extra 164.83% vs Electric Code targets (burstCast + bossElementGate, inert off-Electric)', () => {
    const nukes = (evs: SimEvent[]) => haDamage(evs, 'burst');
    it('vs Iron (scope-lock): exactly one burst hit per cast — the Electric rider is inert', () => {
      expect(nukes(base.events).length).toBe(casts);
    });
    it('vs Electric: a SECOND 164.83 burst hit per cast awakens (HA5 + HA6)', () => {
      expect(nukes(elec.events).length).toBe(casts * 2);
      expect(
        distinctNum(
          nukes(elec.events).map((d) => d.atkPct),
          4,
        ),
      ).toEqual([164.83]);
    });
    it('DISCRIMINATING (presence): removing the HA6 block leaves only 1 hit/cast vs Electric', () => {
      expect(nukes(bbRemoved.events).length).toBe(casts);
    });
    it('DISCRIMINATING (gate vs fudge): dropping the gate fires the extra hit vs the Iron boss (2/cast)', () => {
      expect(nukes(bbUngated.events).length).toBe(casts * 2);
    });
  });
});

```