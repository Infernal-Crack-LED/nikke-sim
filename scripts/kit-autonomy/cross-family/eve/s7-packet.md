# S7 RECONCILING-JUDGE PACKET — unit eve (EVE)
# Assembled by the driver per the gauntlet S7 contract. NOT de-contaminated: the judge grades the
# driver's artifacts and has full access to ground truth, the blind roles' output, and the driver's
# implementation. Return the binding verdict JSON described in the contract below.

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


## 2. MECHANICS SSOT (authoritative ruling basis)
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


## 3. GROUND TRUTH — unit kit prose + base stats (data/characters.json extract)
{
  "slug": "eve",
  "name": "EVE",
  "imageUrl": "https://sg-tools-cdn.blablalink.com/kh-60/iq-96/523a2ff8a65fda7e9fa648e89c359743.png",
  "weapon": "AR",
  "burst": "III",
  "burstCooldownSec": 40,
  "class": "Attacker",
  "element": "Iron",
  "manufacturer": "Abnormal",
  "normalAttackMultiplier": 13.65,
  "coreAttackMultiplier": 200,
  "ammo": 60,
  "reloadFrames": 81,
  "chargeFrames": 0,
  "chargeMultiplier": 0,
  "hitsPerShot": 1,
  "rl3": 7.6,
  "burstGaugePerShot": 0.2,
  "treasure": false,
  "skills": {
    "skill1": "■ Activates at the start of battle. Affects self.\nImpact-Type Exospine: Critical Rate ▲ 60% continuously.\n■ Activates after landing 44 critical hit(s) with normal attacks. Affects random enemy units.\nUnstable Energy: Deals 240% of final ATK as damage. Attacks sequentially 3 time(s).\n■ Activates when Unstable Energy hits an Electric Code target. Affects the target.\nDamage Taken ▲ 10% for 10 sec.",
    "skill2": "■ Activates at the start of battle. Affects self.\nEagle Eye-Type Exospine.\nPrevious effects trigger repeatedly.\nATK ▲ 50% of the skill user's ATK continuously.\nMax Ammunition Capacity ▲ 25% continuously.\n■ Activates when landing 10 normal attack(s) on an Electric Code target. Affects self.\nReloads 3 round(s).",
    "burst": "■ Affects random enemy units.\nDeals 457.14% of final ATK as damage. Attacks sequentially for 6 time(s). \n■ Affects self.\nExospine Mk2\nFunction: Enhances Exospine.\nDuration: 10 sec\nTriggers Impact-Type Exospine Mk2.\nEffect: Damage multiplier of Unstable Energy sequential attacks is scaled by 100%.\nTriggers Eagle Eye-Type Exospine Mk2.\nEffect: Damage multiplier of Eagle Eye-Type Exospine is scaled by 100%."
  },
  "skillCooldownsSec": {
    "skill1": null,
    "skill2": null,
    "burst": 40
  },
  "role": {
    "weapon": {
      "shot_id": 1085001,
      "shot_detail": {
        "id": 1085001,
        "damage": 1365,
        "max_ammo": 60,
        "shake_id": 2,
        "ShakeType": "Fire_AR",
        "fire_type": "Instant",
        "zoom_rate": 0,
        "input_type": "DOWN",
        "shot_count": 1,
        "ShakeWeight": 120,
        "attack_type": "Metal",
        "camera_work": "camera_work_01",
        "charge_time": 0,
        "penetration": 0,
        "reload_time": 100,
        "shot_timing": "Concurrence",
        "spot_radius": 0,
        "weapon_type": "AR",
        "is_targeting": true,
        "muzzle_count": 1,
        "rate_of_fire": 720,
        "name_localkey": "Assault Rifle",
        "prefer_target": "TargetAR",
        "reload_bullet": 10000,
        "counter_enermy": "Metal_Type",
        "multi_aim_range": 0,
        "spot_last_delay": 20,
        "core_damage_rate": 20000,
        "end_rate_of_fire": 720,
        "spot_first_delay": 20,
        "center_shot_count": 0,
        "reload_start_ammo": 59,
        "full_charge_damage": 10000,
        "multi_target_count": 0,
        "spot_radius_object": 0,
        "uptype_fire_timing": 0,
        "burst_energy_pershot": 2000,
        "description_localkey": "■ Affects target(s).\n<color=#00AEFF>Deals {damage}% of ATK as damage.\nDeals {core_damage_rate}% damage when attacking core.</color>",
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
        "full_charge_burst_energy": 0,
        "end_accuracy_circle_scale": 75,
        "auto_accuracy_change_speed": 0,
        "rate_of_fire_change_pershot": 0,
        "start_accuracy_circle_scale": 75,
        "target_burst_energy_pershot": 4000,
        "auto_accuracy_change_pershot": 0,
        "auto_end_accuracy_circle_scale": 75,
        "auto_start_accuracy_circle_scale": 75
      },
      "bonusrange_max": 45,
      "bonusrange_min": 25
    },
    "burstMeta": {
      "burst_duration": 1000,
      "use_burst_skill": "Step3",
      "burst_apply_delay": 1,
      "change_burst_step": "StepFull"
    },
    "skillDetails": {
      "skill1_id": 2850101,
      "skill2_id": 2850201,
      "skill1_table": "StateEffect",
      "skill2_table": "StateEffect",
      "skill1_detail": {
        "id": 2850101,
        "icon": "icn_skill_statcritical_01",
        "group_id": 28501,
        "skill_level": 1,
        "name_localkey": "Impact-Type Exospine",
        "next_level_id": 2850102,
        "level_up_cost_id": 50102,
        "description_localkey": "■ Activates at the start of battle. Affects self.\n<color=#00AEFF>Impact-Type Exospine: Critical Rate ▲ {description_value_01}% continuously.</color>\n■ Activates after landing {description_value_06} critical hit(s) with normal attacks. Affects random enemy units.\n<color=#00AEFF>Unstable Energy: Deals {description_value_02}% of <word_group=10025>final</word_group> ATK as damage. <word_group=10050>Attacks sequentially</word_group> {description_value_03} time(s).</color>\n■ Activates when Unstable Energy hits an Electric Code target. Affects the target.\n<color=#00AEFF>Damage Taken ▲ {description_value_04}% for {description_value_05} sec.</color>",
        "description_value_list": [
          {
            "description_value": [
              "35.45",
              "38.18",
              "40.91",
              "43.63",
              "46.36",
              "49.09",
              "51.82",
              "54.54",
              "57.27",
              "60"
            ]
          },
          {
            "description_value": [
              "141.82",
              "152.72",
              "163.63",
              "174.54",
              "185.45",
              "196.36",
              "207.27",
              "218.18",
              "229.09",
              "240"
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
              "5.91",
              "6.36",
              "6.82",
              "7.27",
              "7.73",
              "8.18",
              "8.64",
              "9.09",
              "9.55",
              "10"
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
              "44",
              "44",
              "44",
              "44",
              "44",
              "44",
              "44",
              "44",
              "44",
              "44"
            ]
          },
          {},
          {},
          {},
          {},
          {}
        ],
        "info_description_localkey": "Skill 1"
      },
      "skill2_detail": {
        "id": 2850201,
        "icon": "icn_skill_atkup_01",
        "group_id": 28502,
        "skill_level": 1,
        "name_localkey": "Eagle Eye-Type Exospine",
        "next_level_id": 2850202,
        "level_up_cost_id": 50202,
        "description_localkey": "■ Activates at the start of battle. Affects self.\n<color=#00AEFF>Eagle Eye-Type Exospine.\nPrevious effects trigger repeatedly.\nATK ▲ {description_value_01}% of the skill user's ATK continuously.\nMax Ammunition Capacity ▲ {description_value_02}% continuously.</color>\n■ Activates when landing {description_value_03} normal attack(s) on an Electric Code target. Affects self.\n<color=#00AEFF>Reloads {description_value_04} round(s).</color>",
        "description_value_list": [
          {
            "description_value": [
              "29.55",
              "31.82",
              "34.09",
              "36.36",
              "38.64",
              "40.91",
              "43.18",
              "45.46",
              "47.73",
              "50"
            ]
          },
          {
            "description_value": [
              "14.77",
              "15.91",
              "17.04",
              "18.18",
              "19.32",
              "20.45",
              "21.59",
              "22.73",
              "23.86",
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
          {},
          {},
          {},
          {},
          {},
          {}
        ],
        "info_description_localkey": "Skill 2"
      },
      "ulti_skill_id": 1850301,
      "ulti_skill_detail": {
        "id": 1850301,
        "icon": "icn_skill_c850_ult",
        "group_id": 18503,
        "shake_id": 1,
        "skill_type": "InstantSequentialAttack",
        "attack_type": "Iron",
        "skill_level": 1,
        "counter_type": "Metal_Type",
        "duration_type": "None",
        "name_localkey": "Counter Chain",
        "next_level_id": 1850302,
        "prefer_target": "Random",
        "resource_name": "c850_ulti",
        "duration_value": 0,
        "skill_cooltime": 4000,
        "level_up_cost_id": 50302,
        "skill_value_data": [
          {
            "skill_value": 27013,
            "skill_value_type": "Percent"
          },
          {
            "skill_value": 6,
            "skill_value_type": "Integer"
          },
          {
            "skill_value": 20,
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
        "description_localkey": "■ Affects random enemy units.\n<color=#00AEFF>Deals {description_value_01}% of <word_group=10025>final</word_group> ATK as damage. <word_group=10050>Attacks sequentially</word_group> for {description_value_02} time(s). </color>\n■ Affects self.\n<color=#00AEFF>Exospine Mk2\nFunction: Enhances Exospine.\nDuration: {description_value_03} sec\nTriggers Impact-Type Exospine Mk2.\nEffect: Damage multiplier of Unstable Energy sequential attacks is <word_group=10084>scaled</word_group> by 100%.\nTriggers Eagle Eye-Type Exospine Mk2.\nEffect: Damage multiplier of Eagle Eye-Type Exospine is <word_group=10084>scaled</word_group> by 100%.</color>",
        "description_value_list": [
          {
            "description_value": [
              "270.13",
              "290.91",
              "311.69",
              "332.47",
              "353.25",
              "374.03",
              "394.8",
              "415.58",
              "436.36",
              "457.14"
            ]
          },
          {
            "description_value": [
              "6",
              "6",
              "6",
              "6",
              "6",
              "6",
              "6",
              "6",
              "6",
              "6"
            ]
          },
          {
            "description_value": [
              "3",
              "3",
              "3",
              "5",
              "5",
              "5",
              "7",
              "7",
              "7",
              "10"
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
        "prefer_target_condition": "IncludeNoneTargetLast",
        "info_description_localkey": "Burst Skill",
        "after_use_function_id_list": [
          185030103,
          185030102,
          185030101
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
      "grow_grade": 585002,
      "grade_core_id": 1,
      "stat_enhance_id": 5101,
      "stat_enhance_detail": {
        "id": 5101,
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
        500001
      ],
      "element_details": [
        {
          "id": 500001,
          "element": "Iron",
          "group_id": 5000005,
          "element_icon": "icn_element_iron",
          "weak_element_id": 300001,
          "element_desc_localekey": "Injects Code: D.M.T.R. to all electric-type enemies, dealing 10% additional damage.",
          "element_name_localekey": "Iron",
          "element_code_name_localekey": "Code: D.M.T.R."
        }
      ]
    },
    "piece": {
      "piece_id": 5100850,
      "piece_detail": {
        "id": 5100850,
        "class": "Attacker",
        "order": 85000,
        "use_id": 0,
        "use_type": "None",
        "item_rare": "SSR",
        "item_type": "Piece",
        "stack_max": 9999999,
        "use_value": 0,
        "corporation": "ABNORMAL",
        "resource_id": 850,
        "item_sub_type": "CharacterPiece",
        "name_localkey": "EVE's Spare Body",
        "use_limit_count": false,
        "inventory_filter": [
          "etc"
        ],
        "description_localkey": "Can be used for Nikkes' Limit Breaks.\nIf a Nikke's Limit Break has reached the max level, any additional Spare Bodies for that Nikke will be converted to Body Labels."
      }
    },
    "meta": {
      "id": 585001,
      "class": "Attacker",
      "order": 10172,
      "name_code": 5142,
      "corporation": "ABNORMAL",
      "resource_id": 850,
      "name_localkey": "EVE",
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
    "resourceId": 850
  }
}

## 4. S2b CROSS-FAMILY TEST-FAITHFULNESS REVIEW (claude-fable-5)
{
  "slug": "eve",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "Critical Rate ▲ 60% continuously",
      "disposition": "FAITHFUL",
      "scope": "GENERIC crit — prose says 'Critical Rate', NOT 'of normal attacks'; applies to every crit-eligible hit (normals + any proc/burst hit flagged crit:true)",
      "durationSemantics": "permanent ('continuously') — no durationSec, no expiresFrame",
      "triggerIdentity": "passive (start of battle)",
      "targetSet": "self only",
      "nearestWrongModel": "critRateNormalPct 60 (scoped to normals — under-credits Unstable Energy / burst crit), or a durationSec window, or ally-shared",
      "distinguishingAssertion": "buffApply {stat:'critRatePct', key~skill1, value:60, casterIdx===targetIdx===eve, no expiresFrame} present from frame 0; NO buffApply with stat 'critRateNormalPct' for eve",
      "inertness": "no other unit in controlComp receives a critRatePct buffApply from eve",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "after landing 44 critical hit(s) w/ normals",
      "disposition": "FIX",
      "scope": "counts CRITICAL hits from NORMAL ATTACKS only — not all rounds, not skill/burst hits",
      "durationSemantics": "instant proc, repeating counter (repeat license from skill2 'Previous effects trigger repeatedly')",
      "triggerIdentity": "schema has NO crit-filtered hitCount → GAP closed by derivation: hitCount ≈ ceil(44 / effectiveCritRate). With base AR crit + S1's +60 (≈75%), threshold ≈ 58–59 ROUNDS ⚑ (derive from the unit's sheet crit; static — cannot track team crit buffs, flag that too)",
      "targetSet": "enemy (random enemy units → sole boss)",
      "nearestWrongModel": "hitCount:44 counting ALL rounds (~33% over-fire at 75% crit); secondary misread: 240% as the TOTAL split across 3 hits instead of per-hit",
      "distinguishingAssertion": "each proc emits exactly 3 damage events with mult 240 (flavor 'sequential', srcSlot skill1) — 720% per proc; proc cadence over a fixed run ≈ one per ~59 eve rounds fired, NOT one per 44 (count shot events between proc batches)",
      "inertness": "procs must NOT be core-boosted (no 'core strike' text); whether they CRIT is measured-only ⚑ (flatDamage crit defaults off — do not silently set crit:true to spend the +60%)",
      "evidenceTier": "CALIBRATED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "UE hits Electric Code → DT ▲10% 10s",
      "disposition": "FAITHFUL",
      "scope": "rider on Unstable Energy landing, only vs an Electric-element boss",
      "durationSemantics": "durationSec 10, wall-clock, refreshable per proc",
      "triggerIdentity": "same hitCount block (or chained), gated bossElementGate:'Electric'",
      "targetSet": "ENEMY debuff (taxonomy #4: Damage Taken ▲ is a boss debuff benefiting the whole team — never a self buff)",
      "nearestWrongModel": "ungated damageTakenPct 10 (team-wide +10% vs ANY boss — large over-credit), or mis-targeted as a self buff",
      "distinguishingAssertion": "vs the controlComp Fire boss: ZERO buffApply events with stat 'damageTakenPct' value 10 (boss-held debuffs have casterIdx===null); override block must carry bossElementGate:'Electric'",
      "inertness": "must move NOTHING on the Fire/neutral test boss — graded comps unchanged with the line present vs deleted",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Previous effects trigger repeatedly.",
      "disposition": "FAITHFUL",
      "scope": "licenses skill1's Unstable Energy counter to loop (not once-per-battle)",
      "durationSemantics": "permanent",
      "triggerIdentity": "implicit — engine hitCount already fires every N hits repeatedly, so faithful encoding is the plain repeating counter",
      "targetSet": "self (modifies own skill1)",
      "nearestWrongModel": "Unstable Energy modeled as once-per-battle, or this line inventing a NEW damage instance",
      "distinguishingAssertion": "≥2 distinct Unstable Energy proc batches (3-hit groups) occur in a standard-length run",
      "inertness": "adds no new effect of its own — no extra buffApply/damage beyond the repetition",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "ATK ▲ 50% of the skill user's ATK",
      "disposition": "FAITHFUL",
      "scope": "generic ATK, all damage",
      "durationSemantics": "permanent ('continuously')",
      "triggerIdentity": "passive (start of battle)",
      "targetSet": "self — 'of the skill user's ATK' = caster-scaled FLAT add, i.e. casterAtkPct 50, not atkPct",
      "nearestWrongModel": "atkPct 50 (percentage of own ATK — different stacking vs other flat/pct buffs; buffApply would emit raw 50 instead of a flat ATK number)",
      "distinguishingAssertion": "buffApply {stat:'casterAtkPct', value ≈ 0.5 × eve.staticAtk} (flat-resolved per harness note), permanent, self-targeted; no atkPct:50 buffApply from skill2",
      "inertness": "no ally receives it",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Max Ammunition Capacity ▲ 25%",
      "disposition": "FAITHFUL",
      "scope": "weapon-state modifier — IS damage (taxonomy #6: gates shots fired / reload frequency)",
      "durationSemantics": "permanent",
      "triggerIdentity": "passive",
      "targetSet": "self",
      "nearestWrongModel": "dropped as 'QoL/defensive, no damage', or encoded maxAmmoFlat 25 (+25 rounds vs +15)",
      "distinguishingAssertion": "buffApply {stat:'maxAmmoPct', value:25}; eve's reload events are spaced 75 rounds apart (60×1.25), not 60 — count shot events between consecutive reload events",
      "inertness": "n/a — must be live",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "10 normals on Electric → Reloads 3 round(s)",
      "disposition": "FAITHFUL",
      "scope": "normal-attack landings vs an Electric boss only",
      "durationSemantics": "instant ammo refund, repeating",
      "triggerIdentity": "hitCount:10 (counts ROUNDS) + bossElementGate:'Electric'; effect instantReload fraction ≈ 3/75 ⚑ (fraction-of-max encoding of a flat 3-round refund — document that it assumes the +25% capacity)",
      "targetSet": "self",
      "nearestWrongModel": "ungated on any boss — a 30% ammo-sustain loop (3 back per 10 fired) that materially stretches magazines and cuts reloads on the Fire test boss",
      "distinguishingAssertion": "vs the Fire controlComp boss: eve's reload cadence equals the natural 75-round magazine exactly, and no instantReload fires; block carries bossElementGate:'Electric'",
      "inertness": "zero effect on the neutral/Fire boss — graded comps unmoved",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "457.14% … sequentially for 6 time(s)",
      "disposition": "FAITHFUL",
      "scope": "instant burst damage, per-hit multiplier",
      "durationSemantics": "instant (6 sequential hits at cast)",
      "triggerIdentity": "burstCast (eve's OWN cast) — burst-cast instant damage is FB-exempt by timing (methodology #9): lands before the FB window opens",
      "targetSet": "enemy (random → boss)",
      "nearestWrongModel": "a single 457.14% hit (dropping ×6 → 2742.84% total lost to 457%), or +50% FB major applied, or keyed to fullBurstEnter",
      "distinguishingAssertion": "each eve burstCast event is followed by exactly 6 damage events with mult 457.14 (flavor 'sequential', srcSlot burst), each with fbMajorApplied === false",
      "inertness": "no procs on FBs where eve did not cast (helm-B3 rotations)",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Mk2 10s: UE seq mult scaled by 100%",
      "disposition": "FIX",
      "scope": "scales Unstable Energy's BASE multiplier (240 → 480 per hit) — a base-mult scaling, NOT an additive Damage-Up entry",
      "durationSemantics": "durationSec 10 from eve's own burst cast",
      "triggerIdentity": "burstCast — the mode sits in eve's OWN burst block; burstCast ≠ fullBurstEnter, and controlComp has helm as co-B3, so the divergence is LIVE in the standard fixture",
      "targetSet": "self (modifies own skill1 proc)",
      "nearestWrongModel": "two, both plausible: (1) fullBurstEnter keying — window opens on EVERY team FB incl. helm's rotations (over-credits ~2×); (2) sequentialDamagePct 100 buff — additive in the diluted Damage-Up bucket instead of doubling the 240 base (under-credits whenever any other Damage-Up buff is live)",
      "distinguishingAssertion": "an Unstable Energy proc landing inside the window emits damage events with mult 480 (vs 240 outside); count of Mk2 window openings === count of eve burstCast events, NOT count of fullBurstStart events",
      "inertness": "'scaled by 100%' read as ×2 is a convention ⚑ — if read as no-op the whole line is dead; assert in-window/out-window proc ratio is exactly 2.0",
      "evidenceTier": "CALIBRATED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Mk2 10s: Eagle Eye mult scaled by 100%",
      "disposition": "FIX",
      "scope": "doubles Eagle Eye's damage-side effect — the only damage-bearing Eagle Eye stat is the ATK ▲ 50% of user's ATK, so faithful reading = 50 → 100 (an EXTRA casterAtkPct 50 flat) for 10s; the ammo line is capacity, not a 'damage multiplier' ⚑ interpretation",
      "durationSemantics": "durationSec 10 from eve's own burst cast",
      "triggerIdentity": "burstCast (same window as the other Mk2 rider)",
      "targetSet": "self",
      "nearestWrongModel": "ignored as flavor text (drops a full +50% caster-ATK window), or over-read to also double max ammo for 10s, or encoded as a generic attackDamagePct 100",
      "distinguishingAssertion": "on each eve burstCast, a buffApply {stat:'casterAtkPct', value ≈ 0.5 × staticAtk, durationSec-derived expiresFrame ≈ cast + 600 frames} appears IN ADDITION to the permanent skill2 grant; absent on helm-cast FBs",
      "inertness": "max-ammo must NOT change during the window (no maxAmmoPct buffApply at burst cast)",
      "evidenceTier": "CALIBRATED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:critRate60-passive",
    "skill1:unstableEnergy-44crit-240x3",
    "skill1:electric-damageTaken10-gate-inertness",
    "skill2:repeat-license",
    "skill2:casterAtk50-flat",
    "skill2:maxAmmo25pct",
    "skill2:electric-reload3-gate-inertness",
    "burst:457.14x6-burstCast-noFbMajor",
    "burst:mk2-UE-x2-burstCast-window",
    "burst:mk2-eagleEye-atk-doubling"
  ],
  "unmodeledVerbatim": {
    "skill1": [],
    "skill2": [
      "Eagle Eye-Type Exospine."
    ],
    "burst": [
      "Exospine Mk2",
      "Function: Enhances Exospine."
    ]
  },
  "notes": "Expected shared-prior misreads to force apart: (1) the 44-counter counts CRITICAL normal hits, not rounds — schema has no crit-gated hitCount, so any faithful encoding is a derived threshold ⚑ (~ceil(44/0.75)≈59 at sheet crit incl. S1's +60); a raw hitCount:44 over-fires ~33% and a static derived threshold silently breaks if team crit buffs exist — the driver must state which they shipped and why. (2) BOTH Mk2 riders key to burstCast, never fullBurstEnter — controlComp's helm co-B3 makes this divergence live, so assert window-count === eve burstCast count. (3) 'scaled by 100%' = ×2 of the BASE multiplier (240→480 event mult), not an additive sequentialDamagePct 100 in the diluted Damage-Up bucket and not a no-op — the in/out window ratio must be exactly 2.0. (4) Sequential damage is PER-HIT (240×3, 457.14×6); a total-split reading loses 3–6×. (5) Both Electric-gated lines (Damage Taken ▲10%, Reloads 3) must carry bossElementGate:'Electric' and be provably inert on the Fire/neutral test boss — the reload rider ungated is a ~30% ammo-sustain over-credit. (6) Whether Unstable Energy hits themselves crit (spending the +60%) is flatDamage crit:false by default and measured-only ⚑ — flag, don't guess. (7) 'ATK ▲ 50% of the skill user's ATK' is casterAtkPct (flat vs static) not atkPct; the buffApply value assertion (≈0.5×staticAtk flat) distinguishes them. Could not write the file to scripts/kit-autonomy/reviews/eve.test-review.json — no tools available in this run; JSON returned inline.",
  "model": "claude-fable-5"
}


## 5. S5 BLIND TEST (claude-opus-5) + its green/red count vs the driver override
/**
 * EVE (`eve`) — AR / Iron / Attacker / Burst III; ammo 60, reload 81f, normal mult 13.65, core mult 200.
 * BLIND kit-spec test: written from the kit prose ALONE (no sight of any override, driver test, or truth file).
 *
 * KIT LINES (structural read of the prose; per-line disposition lives in the spec JSON):
 *   S1-a passive / self      : Impact-Type Exospine — Critical Rate ▲60% continuously. UNSCOPED — the text does
 *                              NOT say of normal attacks ⇒ critRatePct, never the normals-scoped variant.
 *   S1-b after 44 CRITICAL normal hits / random enemy : Unstable Energy — 240% of final ATK, 3 sequential hits.
 *                              The counter is CRIT-gated, so a faithful hitCount threshold must be ~44/critRate,
 *                              i.e. STRICTLY MORE than 44 raw normal hits per proc.
 *   S1-c when Unstable Energy hits an ELECTRIC target : Damage Taken ▲10% for 10 sec — a BOSS debuff (team-wide),
 *                              element-gated, therefore INERT on the non-Electric scope-lock boss.
 *   S2-a passive / self      : Eagle Eye-Type Exospine — ATK ▲50% OF THE SKILL USER ATK (caster-scaled ⇒ emitted
 *                              flat-resolved, not as the raw 50) + Max Ammunition Capacity ▲25% continuously.
 *   S2-b every 10 normal hits on an ELECTRIC target / self : reloads 3 rounds — element-gated ⇒ inert here.
 *   B-a  burst / random enemy : 457.14% of final ATK, 6 sequential hits (burst-cast ⇒ lands pre-Full-Burst).
 *   B-b  burst / self, 10 sec : Exospine Mk2 — Unstable Energy sequential multiplier scaled by 100% (×2).
 *                              The second Mk2 clause scales the damage multiplier of Eagle Eye-Type Exospine,
 *                              but the modeled Eagle Eye lines carry NO damage multiplier at all ⇒ GAP (it.skip).
 *
 * FIXTURE: controlComp('eve', true) — liter B1 / crown B2 / eve B3 / helm B3, Fire boss, 180 s, deterministic.
 *   eve is a Burst III carry: without the B1+B2 the team makes ZERO Full Bursts and B-a / B-b would be vacuous.
 *   helm stays in (second B3) so the burst-cast vs full-burst-enter distinction is actually exercised: eve does
 *   not necessarily cast on every rotation, so B-b is measured per-CAST window, not per Full Burst.
 *   The scope-lock boss is NOT Electric ⇒ S1-c and S2-b are inert BY KIT GATE here; they are proved
 *   modeled-but-gated with gate-stripping counterfactuals, never by a bare absence (absence == dropped line).
 *
 * COUNTERFACTUALS (all via withPatchedOverride — in-memory clone, committed JSON untouched; no writes to the tree):
 *   critZero   crit 60 → 0                       : a dropped or inert crit line cannot move damage.
 *   critScoped critRatePct → critRateNormalPct    : the nearest-wrong SCOPE. Only moves her NON-normal damage if
 *                                                   the faithful unscoped reading is what is in the model.
 *   atkZero    casterAtkPct → 0                   : proves the ATK line is live AND self-only (allies unmoved).
 *   ammoZero   maxAmmoPct → 0                     : a weapon-state line IS damage — fewer rounds ⇒ MORE reloads.
 *   s1GateOff  drop bossElementGate on skill1     : the Damage Taken debuff must APPEAR and lift TEAM damage.
 *   s2GateOff  drop bossElementGate on skill2     : the 3-round reload rider must APPEAR and lift eve damage.
 *   mk2Off     strip the burst SELF block effects : isolates Exospine Mk2 from the Full-Burst / ally-buff confound
 *                                                   by comparing the in-window vs out-window Unstable Energy
 *                                                   damage RATIO in base against the same ratio with Mk2 gone —
 *                                                   both runs share the FB uplift, so only Mk2 can move the ratio.
 *
 * Event field NAMES beyond the documented set are read permissively (num()/rate()/amount()) so a shape guess
 * never silently turns an assertion vacuous; the sanity block asserts the readers actually resolved.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
  // Driver path-fix (2026-07-25): the blind author assumed a scripts/tests/units/ home; this
  // artifact lives in scripts/kit-autonomy/blind/, so the harness is two levels up under tests/.
  // Mechanical import correction ONLY — no assertion or fixture logic was touched.
} from '../../tests/lib/harness.js';

const SLUG = 'eve';

/** Blind-shape safety: not every event field name is documented, so read them permissively. */
type Ev = SimEvent & Record<string, any>;

// ------------------------------------------------------------------ override walkers

const SLOTS = ['skill1', 'skill2', 'burst'] as const;

/** The override file is slot-keyed; a slot is either a Block[] or a CharacterSkills carrying blocks[]. */
function blocksOf(ov: any, slot: string): any[] {
  const s = ov?.[slot];
  if (!s) return [];
  if (Array.isArray(s)) return s;
  return Array.isArray(s.blocks) ? s.blocks : [];
}
function eachEffect(
  ov: any,
  fn: (eff: any, block: any, slot: string) => void,
): void {
  for (const slot of SLOTS) {
    for (const b of blocksOf(ov, slot)) {
      for (const eff of b.effects ?? []) fn(eff, b, slot);
    }
  }
}
function setStat(ov: any, stat: string, value: number): void {
  eachEffect(ov, (eff) => {
    if (eff.kind === 'buff' && eff.stat === stat) eff.value = value;
  });
}
function renameStat(ov: any, from: string, to: string): void {
  eachEffect(ov, (eff) => {
    if (eff.kind === 'buff' && eff.stat === from) eff.stat = to;
  });
}

// ------------------------------------------------------------------ run harness

type Run = { res: any; evs: Ev[]; tot: Record<string, number> };

function runWith(patch?: (ov: any) => void): Run {
  const opts: any = controlComp(SLUG, true);
  if (patch) {
    opts.overrides = {
      ...(opts.overrides ?? {}),
      [SLUG]: withPatchedOverride(SLUG, patch as any),
    };
  }
  const evs: Ev[] = [];
  opts.cfg = {
    ...(opts.cfg ?? {}),
    onEvent: (ev: SimEvent) => {
      evs.push(ev as Ev);
    },
  };
  const res = runComp(opts);
  return { res, evs, tot: totals(res) as Record<string, number> };
}

// ------------------------------------------------------------------ permissive event readers

function num(e: Ev, keys: string[]): number | undefined {
  for (const k of keys) {
    const v = (e as any)[k];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
  }
  return undefined;
}
const CRIT_KEYS = ['critRate', 'critChance', 'critPct', 'crit'];
const CORE_KEYS = ['coreRate', 'coreChance', 'corePct', 'core'];
const AMOUNT_KEYS = ['amount', 'damage', 'dmg', 'dealt', 'value', 'total'];
const TIME_KEYS = ['t', 'time', 'sec', 'seconds'];
const FRAME_KEYS = ['frame', 'tick', 'f'];

/** rates may be emitted as 0..1 or as percentage points; normalise to 0..1. */
function rate(e: Ev, keys: string[]): number {
  const v = num(e, keys);
  if (v === undefined) return 0;
  return v > 1 ? v / 100 : v;
}
function amount(e: Ev): number | undefined {
  return num(e, AMOUNT_KEYS);
}
function timeSec(e: Ev): number | undefined {
  const t = num(e, TIME_KEYS);
  if (t !== undefined) return t;
  const f = num(e, FRAME_KEYS);
  return f === undefined ? undefined : f / 60;
}
function srcSlot(e: Ev): string {
  return String(e.srcSlot ?? e.slot ?? 'normal');
}
function isNormalHit(e: Ev): boolean {
  return srcSlot(e) === 'normal' || String(e.bucket ?? '') === 'normal';
}

/** eve unit index, taken from a self buffApply (targetSlug is documented on buffApply). */
function eveIdx(evs: Ev[]): number | null {
  for (const e of evs) {
    if (
      e.kind === 'buffApply' &&
      e.targetSlug === SLUG &&
      typeof e.targetIdx === 'number'
    )
      return e.targetIdx;
  }
  return null;
}
function isOwn(e: Ev, idx: number | null): boolean {
  const owner = e.slug ?? e.unit ?? e.casterSlug ?? e.sourceSlug ?? e.srcSlug;
  if (owner === SLUG) return true;
  const i = e.srcIdx ?? e.casterIdx ?? e.unitIdx ?? e.idx;
  return idx !== null && typeof i === 'number' && i === idx;
}
/** eve-attributed damage events: prefer the per-unit result row, else attribute from the global log. */
function eveDamage(r: Run): Ev[] {
  const row: any = unitOf(r.res, SLUG);
  if (Array.isArray(row?.events)) {
    const own = (row.events as Ev[]).filter((e) => e.kind === 'damage');
    if (own.length) return own;
  }
  const idx = eveIdx(r.evs);
  return r.evs.filter((e) => e.kind === 'damage' && isOwn(e, idx));
}
function eveEvents(r: Run, kind: string): Ev[] {
  const idx = eveIdx(r.evs);
  return r.evs.filter((e) => e.kind === kind && isOwn(e, idx));
}
function selfBuffs(r: Run): Ev[] {
  return r.evs.filter(
    (e) =>
      e.kind === 'buffApply' &&
      e.targetSlug === SLUG &&
      e.casterIdx != null &&
      e.targetIdx != null &&
      e.casterIdx === e.targetIdx,
  );
}
function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN;
}
function teamTotal(t: Record<string, number>): number {
  return Object.values(t).reduce((a, b) => a + b, 0);
}

/** Unstable Energy damage split by the 10 s window that follows each of eve OWN burst casts. */
function ueWindows(r: Run): { inW: number[]; outW: number[]; casts: number } {
  const castTimes = eveEvents(r, 'burstCast')
    .map((e) => timeSec(e))
    .filter((t): t is number => t !== undefined);
  const inW: number[] = [];
  const outW: number[] = [];
  for (const e of eveDamage(r).filter((d) => srcSlot(d) === 'skill1')) {
    const t = timeSec(e);
    const a = amount(e);
    if (t === undefined || a === undefined) continue;
    (castTimes.some((c) => t >= c && t <= c + 10) ? inW : outW).push(a);
  }
  return { inW, outW, casts: castTimes.length };
}

// ------------------------------------------------------------------ hoisted runs (8 sims)

const base = runWith();
const critZero = runWith((ov) => setStat(ov, 'critRatePct', 0));
const critScoped = runWith((ov) =>
  renameStat(ov, 'critRatePct', 'critRateNormalPct'),
);
const atkZero = runWith((ov) => setStat(ov, 'casterAtkPct', 0));
const ammoZero = runWith((ov) => setStat(ov, 'maxAmmoPct', 0));
const s1GateOff = runWith((ov) => {
  for (const b of blocksOf(ov, 'skill1')) delete b.bossElementGate;
});
const s2GateOff = runWith((ov) => {
  for (const b of blocksOf(ov, 'skill2')) delete b.bossElementGate;
});
const mk2Off = runWith((ov) => {
  for (const b of blocksOf(ov, 'burst'))
    if (b.target?.kind === 'self') b.effects = [];
});

const ALLIES = Object.keys(base.tot).filter((s) => s !== SLUG);
const baseDmg = eveDamage(base);
const baseNormals = baseDmg.filter(isNormalHit);
const baseUE = baseDmg.filter((e) => srcSlot(e) === 'skill1');
const baseBurstHits = baseDmg.filter((e) => srcSlot(e) === 'burst');

// ------------------------------------------------------------------ tests

describe('eve — fixture sanity (non-vacuity floor for everything below)', () => {
  it('eve fires, procs Unstable Energy, and the team reaches Full Burst', () => {
    expect(base.tot[SLUG]).toBeGreaterThan(0);
    expect(baseNormals.length).toBeGreaterThan(0);
    expect(baseUE.length).toBeGreaterThan(0);
    expect(base.evs.some((e) => e.kind === 'fullBurstStart')).toBe(true);
    expect(ALLIES.length).toBe(3);
  });

  it('the permissive event readers actually resolved (else assertions would be vacuous)', () => {
    expect(baseNormals.some((e) => amount(e) !== undefined)).toBe(true);
    expect(
      baseNormals.reduce((s, e) => s + rate(e, CRIT_KEYS), 0),
    ).toBeGreaterThan(0);
    expect(
      Math.max(...baseNormals.map((e) => rate(e, CORE_KEYS))),
    ).toBeGreaterThan(0);
  });
});

describe('eve S1-a — Impact-Type Exospine: Critical Rate ▲60%, self, continuous, UNSCOPED', () => {
  it('applies an unscoped critRatePct 60 self-buff, not the normal-attack-scoped stat', () => {
    const stats = new Set(
      selfBuffs(base)
        .filter((e) => e.value === 60)
        .map((e) => String(e.stat)),
    );
    expect(stats.has('critRatePct')).toBe(true);
    expect(stats.has('critRateNormalPct')).toBe(false);
  });

  it('is load-bearing: zeroing it strictly lowers eve damage', () => {
    expect(critZero.tot[SLUG]).toBeLessThan(base.tot[SLUG]);
  });

  it('UNSCOPED is discriminating: re-scoping to normals-only strictly lowers her NON-normal damage', () => {
    // nearest-wrong = critRateNormalPct. Under the faithful reading her skill/burst riders are crit-eligible
    // at the 60% sheet lift; under the scoped model they are not, so the non-normal damage must fall.
    const nonNormal = (r: Run) =>
      eveDamage(r)
        .filter((e) => !isNormalHit(e))
        .reduce((s, e) => s + (amount(e) ?? 0), 0);
    expect(nonNormal(base)).toBeGreaterThan(0);
    expect(nonNormal(critScoped)).toBeLessThan(nonNormal(base));
  });

  it('is self-scoped: allies are byte-identical when eve crit is zeroed', () => {
    for (const a of ALLIES) expect(critZero.tot[a]).toBe(base.tot[a]);
  });
});

describe('eve S1-b — Unstable Energy: 240% x3 sequential, after 44 CRITICAL normal hits', () => {
  it('procs in groups of exactly 3 sequential hits', () => {
    expect(baseUE.length).toBeGreaterThanOrEqual(3);
    expect(baseUE.length % 3).toBe(0);
  });

  it('the counter is CRIT-gated: proc count tracks 44 CRITICAL hits, not 44 raw normal hits', () => {
    // Crit hits landed = the crit-rate-weighted sum over her normal hits (the engine resolves crit as a rate),
    // read live off the log so no cadence or sheet-crit assumption is baked in.
    const critHits = baseNormals.reduce((s, e) => s + rate(e, CRIT_KEYS), 0);
    const activations = baseUE.length / 3;
    const expected = critHits / 44;
    const naive = baseNormals.length / 44; // the nearest-wrong: hitCount 44 on RAW hits
    expect(critHits).toBeGreaterThan(0);
    expect(activations).toBeGreaterThan(0);
    expect(Math.abs(activations - expected)).toBeLessThanOrEqual(
      Math.max(2, 0.25 * expected),
    );
    // non-vacuity: only assert the separation when the two models genuinely differ (crit rate well under 100%)
    if (naive > expected * 1.15) expect(activations).toBeLessThan(naive * 0.95);
  });

  it('Unstable Energy hits take NO core bonus and NO range bonus (rider convention)', () => {
    // the kit says nothing about core strikes, and function-damage riders are force-set no-range.
    expect(baseUE.every((e) => rate(e, CORE_KEYS) === 0)).toBe(true);
    expect(baseUE.every((e) => e.rangeApplied !== true)).toBe(true);
  });
});

describe('eve S1-c — Damage Taken ▲10% / 10 s, gated on an ELECTRIC target', () => {
  it('is INERT against the non-Electric scope-lock boss', () => {
    const dt = base.evs.filter(
      (e) =>
        e.kind === 'buffApply' && e.stat === 'damageTakenPct' && e.value === 10,
    );
    expect(dt.length).toBe(0);
  });

  it('non-vacuity: with the element gate removed it fires as a boss-held debuff and lifts TEAM damage', () => {
    const dt = s1GateOff.evs.filter(
      (e) =>
        e.kind === 'buffApply' && e.stat === 'damageTakenPct' && e.value === 10,
    );
    expect(dt.length).toBeGreaterThan(0); // RED if the line was dropped instead of gated
    expect(dt.every((e) => e.casterIdx === null && e.targetIdx === null)).toBe(
      true,
    ); // boss-held, not a self buff
    expect(teamTotal(s1GateOff.tot)).toBeGreaterThan(teamTotal(base.tot));
    for (const a of ALLIES)
      expect(s1GateOff.tot[a]).toBeGreaterThan(base.tot[a]); // team-wide, not eve-only
  });

  it('the window is a bounded 10 s, not permanent', () => {
    const dt = s1GateOff.evs.filter(
      (e) =>
        e.kind === 'buffApply' && e.stat === 'damageTakenPct' && e.value === 10,
    );
    expect(dt.every((e) => Number.isFinite(e.expiresFrame))).toBe(true);
    const first = dt.find(
      (e) => typeof e.expiresFrame === 'number' && timeSec(e) !== undefined,
    );
    if (first) {
      const held =
        (first.expiresFrame as number) / 60 - (timeSec(first) as number);
      expect(Math.abs(held - 10)).toBeLessThan(0.6);
    }
  });
});

describe('eve S2-a — Eagle Eye-Type Exospine: ATK ▲50% of the skill user ATK, Max Ammo ▲25%', () => {
  it('the ATK line is CASTER-scaled (flat-resolved), not a self-scaling atkPct 50', () => {
    const sb = selfBuffs(base);
    const caster = sb.filter((e) => e.stat === 'casterAtkPct');
    expect(caster.length).toBeGreaterThan(0);
    expect(caster[0].value).toBeGreaterThan(100); // flat ATK at apply time, never the raw kit 50
    expect(sb.some((e) => e.stat === 'atkPct' && e.value === 50)).toBe(false); // the nearest-wrong encoding
  });

  it('the ATK line is live and SELF-only: zeroing it drops eve, allies byte-identical', () => {
    expect(atkZero.tot[SLUG]).toBeLessThan(base.tot[SLUG]);
    for (const a of ALLIES) expect(atkZero.tot[a]).toBe(base.tot[a]);
  });

  it('Max Ammunition Capacity ▲25% is applied to eve', () => {
    expect(
      selfBuffs(base).some((e) => e.stat === 'maxAmmoPct' && e.value === 25),
    ).toBe(true);
  });

  it('the ammo line IS damage: removing it forces more reloads and less damage', () => {
    const reloads = (r: Run) => eveEvents(r, 'reload').length;
    expect(reloads(base)).toBeGreaterThan(0);
    expect(reloads(ammoZero)).toBeGreaterThan(reloads(base));
    expect(ammoZero.tot[SLUG]).toBeLessThan(base.tot[SLUG]);
  });
});

describe('eve S2-b — every 10 normal hits on an ELECTRIC target: reloads 3 rounds', () => {
  it('is INERT here by kit gate, but modeled: stripping the element gate raises eve damage', () => {
    // RED if the rider was silently dropped (a weapon-state line that gates shots fired is damage).
    expect(s2GateOff.tot[SLUG]).toBeGreaterThan(base.tot[SLUG]);
  });

  it('gating it off does not disturb the allies through anything but eve own economy', () => {
    // eve reloads less ⇒ she fires more; her allies must not receive any buff from this line.
    const s2Buffs = s2GateOff.evs.filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.targetSlug !== SLUG &&
        e.casterIdx === eveIdx(s2GateOff.evs),
    );
    const baseBuffs = base.evs.filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.targetSlug !== SLUG &&
        e.casterIdx === eveIdx(base.evs),
    );
    expect(s2Buffs.length).toBe(baseBuffs.length);
  });
});

describe('eve burst A — 457.14% of final ATK, 6 sequential hits, random enemy', () => {
  it('emits hits in multiples of 6, one group per eve burst cast', () => {
    expect(baseBurstHits.length).toBeGreaterThanOrEqual(6);
    expect(baseBurstHits.length % 6).toBe(0);
    const casts = eveEvents(base, 'burstCast').length;
    if (casts > 0) expect(baseBurstHits.length).toBe(6 * casts);
  });

  it('burst-cast damage is Full-Burst exempt (it resolves before the window opens)', () => {
    expect(baseBurstHits.every((e) => e.inFullBurst !== true)).toBe(true);
    expect(baseBurstHits.every((e) => e.fbMajorApplied !== true)).toBe(true);
  });

  it('burst hits take no range bonus and no core bonus', () => {
    expect(baseBurstHits.every((e) => e.rangeApplied !== true)).toBe(true);
    expect(baseBurstHits.every((e) => rate(e, CORE_KEYS) === 0)).toBe(true);
  });
});

describe('eve burst B — Exospine Mk2: Unstable Energy multiplier scaled by 100% for 10 s', () => {
  it('is modeled: stripping the burst SELF block strictly lowers eve damage', () => {
    expect(mk2Off.tot[SLUG]).toBeLessThan(base.tot[SLUG]);
  });

  it('scales UNSTABLE ENERGY specifically — the in-window / out-window UE ratio collapses without it', () => {
    // The 10 s post-cast window IS the Full Burst window, so in-window UE hits are inflated by the FB major and
    // the ally buffs REGARDLESS of Mk2. Comparing the RATIO across base and mk2Off cancels that confound: both
    // runs share the same FB uplift, so only the Mk2 multiplier can separate them.
    const b = ueWindows(base);
    const o = ueWindows(mk2Off);
    expect(b.casts).toBeGreaterThan(0);
    expect(b.inW.length).toBeGreaterThan(0);
    expect(b.outW.length).toBeGreaterThan(0);
    expect(o.inW.length).toBeGreaterThan(0);
    expect(o.outW.length).toBeGreaterThan(0);
    const ratioBase = mean(b.inW) / mean(b.outW);
    const ratioOff = mean(o.inW) / mean(o.outW);
    expect(ratioBase).toBeGreaterThan(ratioOff * 1.05);
  });

  it('the enhancement is a bounded 10 s self window, not a permanent upgrade', () => {
    const idx = eveIdx(base.evs);
    const mk2 = base.evs.filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.targetSlug === SLUG &&
        e.casterIdx === idx &&
        e.casterIdx === e.targetIdx,
    );
    const timed = mk2.filter((e) => Number.isFinite(e.expiresFrame));
    expect(timed.length).toBeGreaterThan(0); // the continuous S1/S2 passives are unbounded; Mk2 must not be
    const ten = timed.filter((e) => {
      const t = timeSec(e);
      return (
        t !== undefined &&
        Math.abs((e.expiresFrame as number) / 60 - t - 10) < 0.6
      );
    });
    expect(ten.length).toBeGreaterThan(0);
  });

  // GAP: the second Mk2 clause scales the damage multiplier of Eagle Eye-Type Exospine, but the Eagle Eye lines in
  // this kit prose are ATK ▲ and Max Ammo ▲ — there is no damage multiplier on them to scale. Either the clause has
  // an unstated damage payload (outside the input domain) or it is a no-op; a blind test cannot decide. ⚑
  it.skip('burst Mk2 clause 2 — Eagle Eye damage multiplier scaled by 100% (GAP: no multiplier referent in the prose)', () => {});

  // GAP: S2 line Previous effects trigger repeatedly has no referent the engine can resolve — it may mean the S1
  // Unstable Energy proc re-arms, or it may be display flavour for the continuous passives. No primitive for either
  // reading without a measurement of the proc cadence. ⚑
  it.skip('S2 — Previous effects trigger repeatedly (GAP: unresolvable referent / no primitive)', () => {});
});


=== S5 BLIND TEST vs DRIVER OVERRIDE — run result (driver-executed, deterministic) ===
Command: npx vitest run --config <temp include blind/> scripts/kit-autonomy/blind/eve.test.ts
Result: 20 PASSED / 4 FAILED / 2 SKIPPED (26 total).
Driver classification of the 4 failures (each verified against the engine, NOT asserted on faith):
  [RECON_ERROR granularity] "procs in groups of exactly 3 sequential hits" — blind expects 3 damage
     events per Unstable-Energy proc (3x240); driver override consolidates to ONE flatDamage atkPct:720
     (flavor sequential). baseUE.length % 3 === 1 because there is 1 event/proc. Arithmetically identical
     total (720 == 240x3) and board-inert: seqMult multiplies the whole packet (cinderella precedent), and
     crit is an expectation multiplier in the deterministic sim (linearity of expectation), so 1x720 and
     3x240 produce byte-identical damage with or without Mk2's seqMult.
  [RECON_ERROR granularity, SAME root cause] "the counter is CRIT-gated: proc count tracks 44 critical
     hits" — blind computes activations = baseUE.length / 3 (assumes 3 events/proc) then compares to
     critHits/44. Because driver emits 1 event/proc, the /3 undercounts activations ~3x (|activations -
     expected| = 24.0 vs tolerance 8.6). The cadence ITSELF is correct: driver hitCount:59 == ceil(44/0.75),
     which the blind override-writer (S6) independently derived as identical. This failure is the granularity
     difference again, not an independent cadence miss.
  [RECON_ERROR trigger-vs-gate] "non-vacuity: with the element gate removed it fires ... lifts TEAM damage"
     — blind's counterfactual strips a bossElementGate GATE field off skill1; driver encodes the Electric
     condition as a bossElement TRIGGER (trigger.kind:'bossElement', element:'Electric'), so stripping a
     (nonexistent) gate is a no-op and the debuff never fires on the Fire boss. Both encodings are
     kit-faithful ("activates when Unstable Energy hits an Electric target"). Driver test E3 proves the
     gating correctly via an Iron-boss discrimination (debuff present vs Electric, absent vs Iron, mult.taken
     1.1 vs 1.0).
  [RECON_ERROR granularity] "emits hits in multiples of 6, one group per eve burst cast" — blind expects 6
     burst damage events per cast (6x457.14 = 36 over 6 casts); driver consolidates to ONE flatDamage
     atkPct:2742.84 per cast (6 events total). 2742.84 == 457.14x6, identical total, board-inert.
The 2 SKIPS are the blind writer's conservative GAPs, BOTH modeled in the driver override:
  - "Eagle Eye Mk2 ... scaled by 100%" — blind saw no damage-multiplier referent; driver (and S2b fable)
    read it as doubling the Eagle Eye ATK buff => timed casterAtkPct 50 for 10s (E8).
  - "Previous effects trigger repeatedly" — inherent: the engine hitCount counter fires repeatedly; driver
    E2 cadence assertion exercises the repeating procs.
The 20 PASSING assertions independently confirm: unscoped critRatePct (not normals-scoped) + self-only +
load-bearing; UE no core/range bonus; damageTaken inert on non-Electric; 10s bounded Mk2 window; casterAtkPct
flat-resolved (not atkPct) + self-only + load-bearing; maxAmmoPct is damage (removing it forces more reloads);
reload refund inert-by-gate-but-modeled; burst FB-exempt (pre-window); Mk2 scales UNSTABLE ENERGY specifically
(in/out UE ratio collapses without it).
=== END S5 REPORT ===

## 6. S6 BLIND OVERRIDE (claude-opus-5) + diff vs the driver override
{
  "slug": "eve",
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
          "value": 60
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "hitCount",
        "count": 59
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 240,
          "flavor": "sequential",
          "crit": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 240,
          "flavor": "sequential",
          "crit": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 240,
          "flavor": "sequential",
          "crit": true
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "hitCount",
        "count": 59
      },
      "target": {
        "kind": "enemy"
      },
      "fbGate": "inFb",
      "ownBurstGate": "cast",
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 240,
          "flavor": "sequential",
          "crit": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 240,
          "flavor": "sequential",
          "crit": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 240,
          "flavor": "sequential",
          "crit": true
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "hitCount",
        "count": 59
      },
      "target": {
        "kind": "enemy"
      },
      "bossElementGate": "Electric",
      "effects": [
        {
          "kind": "buff",
          "stat": "damageTakenPct",
          "value": 10,
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
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 50
        },
        {
          "kind": "buff",
          "stat": "maxAmmoPct",
          "value": 25
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "hitCount",
        "count": 10
      },
      "target": {
        "kind": "self"
      },
      "bossElementGate": "Electric",
      "effects": [
        {
          "kind": "instantReload",
          "fraction": 0.04
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
          "atkPct": 457.14,
          "flavor": "sequential",
          "crit": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 457.14,
          "flavor": "sequential",
          "crit": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 457.14,
          "flavor": "sequential",
          "crit": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 457.14,
          "flavor": "sequential",
          "crit": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 457.14,
          "flavor": "sequential",
          "crit": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 457.14,
          "flavor": "sequential",
          "crit": true
        }
      ]
    },
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
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 50,
          "durationSec": 10
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [],
    "skill2": [
      "Eagle Eye-Type Exospine.",
      "Previous effects trigger repeatedly."
    ],
    "burst": [
      "Exospine Mk2",
      "Function: Enhances Exospine.",
      "Duration: 10 sec",
      "Triggers Impact-Type Exospine Mk2.",
      "Triggers Eagle Eye-Type Exospine Mk2."
    ]
  },
  "caveats": [
    "⚑ skill1 Unstable Energy trigger: the kit counts 44 CRITICAL normal-attack hits; the schema has no crit-hit counter, so it is proxied by hitCount:59 = 44 / (0.15 base sheet crit + 0.60 kit crit). Any change to the sheet crit rate (gear/cube/ally crit buffs) moves the true cadence and this constant does NOT track it — a support comp with extra crit rate makes the real trigger FASTER than modeled.",
    "⚑ skill1 Unstable Energy split-vs-merge: 'Attacks sequentially 3 time(s)' authored as 3 separate 240% hits (popup-unread).",
    "⚑ burst Exospine Mk2 doubling of Unstable Energy is modeled as a SECOND hitCount block carrying the +240%×3 increment, gated fbGate:'inFb' + ownBurstGate:'cast'. Mk2's real window is 10 s from HER burst cast; the FB window is a 10 s proxy that starts slightly later. Also, an Unstable Energy proc that fires inside the FB window credits the doubling for BOTH blocks only if the engine fires both on the same threshold crossing — verify with a buffApply/damage event trace before trusting the magnitude.",
    "⚑ burst 'Damage multiplier of Eagle Eye-Type Exospine is scaled by 100%' is ambiguous: Eagle Eye as written carries no damage multiplier, only ATK ▲50% + Max Ammo ▲25%. Read here as doubling the ATK component (+50 casterAtkPct for 10 s). It could instead double the ammo component, both, or neither.",
    "⚑ skill2 'Reloads 3 round(s)' authored as instantReload fraction 0.04 (3 / 75 = 60 base ammo × 1.25). The fraction is capacity-dependent, so OL/gear ammo lines silently change the refill size. Electric-gated → inert on the Fire/neutral scope-lock boss.",
    "⚑ Both Electric Code branches (Damage Taken ▲10%, the 10-hit reload) are INERT on every graded comp; they are authored for completeness and are unvalidated.",
    "noFb left unset everywhere (default FB-by-timing ON) per the ALWAYS-⚑ rule — measured-only. The burst's 6×457.14% is expected to be FB-exempt by cast timing (it lands pre-FB); this is NOT asserted here."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Blind second read of eve's kit prose only. Structure: S1 = permanent unscoped Critical Rate ▲60% + a crit-hit-counted 3×240% sequential enemy rider + an Electric-gated Damage Taken ▲10% debuff riding that same rider. S2 = permanent casterAtkPct 50 (kit says 'of the skill user's ATK', so caster-scaled flat, not atkPct) + maxAmmoPct 25 (a weapon-state modifier and therefore damage: it lengthens the magazine and lowers reload frequency), plus an Electric-gated 3-round partial reload every 10 normal hits. Burst = 6×457.14% sequential enemy nuke on burstCast + a 10 s self Exospine Mk2 window modeled as (a) +50 casterAtkPct for 10 s and (b) a duplicate Unstable Energy block carrying the +240%×3 doubling increment, gated fbGate:'inFb' + ownBurstGate:'cast'. The crit-hit trigger (44 crits → hitCount 59) is the single largest source of error in this file."
}

=== S6 BLIND OVERRIDE vs DRIVER OVERRIDE — block-by-block diff (driver-computed) ===
skill1:
  [1] critRatePct 60 passive self                  -> IDENTICAL (both).
  [2] UE proc: driver = 1x flatDamage atkPct:720 flavor:sequential (no crit field, default);
               blind  = 3x flatDamage atkPct:240 flavor:sequential crit:true.
               -> damage-EQUIVALENT (720 == 240x3; seqMult multiplies whole packet; crit is an expectation
                  multiplier). crit:true is a measured-only ⚑ (kit does not state UE procs crit); driver
                  leaves the default. hitCount:59 trigger IDENTICAL (both derived ceil(44/0.75)).
  [3] blind-ONLY: a SECOND hitCount:59 block (3x240 sequential) gated fbGate:'inFb'+ownBurstGate:'cast'.
               -> This is the blind writer's Mk2 UE-DOUBLING workaround: sequentialMultPct was REDACTED from
                  the blind schema (its types.ts comment names 'eve'), so the blind role improvised the x2 as
                  a duplicate proc block firing inside the FB window. Driver uses sequentialMultPct:100 (a TRUE
                  x2 in its own multiplicative bucket, 10s from burstCast). CONCEPT matches (x2 during a
                  post-cast window); MECHANISM differs (redaction-driven). The blind writer flags its own FB-
                  window proxy as a ⚑ ("real window is 10s from HER cast; FB window starts slightly later").
  [4] damageTaken 10% Electric: driver = trigger.kind:'bossElement' Electric -> damageTakenPct 10 (permanent
               while Electric, documented ⚑ approximating the 10s-per-proc refresh);
               blind = hitCount:59 + bossElementGate:'Electric' -> damageTakenPct 10 durationSec:10.
               -> both kit-faithful; driver's permanent-while-Electric over-credits only the opening seconds
                  (full uptime after first proc ~4.9s). ⚑-level, not a faithfulness failure.
skill2:
  [1] casterAtkPct 50 + maxAmmoPct 25 passive self -> IDENTICAL (both use casterAtkPct, NOT atkPct).
  [2] hitCount:10 + bossElementGate:'Electric' -> instantReload fraction:0.04 -> IDENTICAL (0.04 == 3/75).
burst:
  [1] nuke: driver = 1x flatDamage atkPct:2742.84, NO flavor (deliberate: so Mk2 cannot double the nuke —
               the kit authorizes doubling UNSTABLE ENERGY's sequential attacks only);
               blind = 6x flatDamage atkPct:457.14 flavor:sequential crit:true.
               -> damage-EQUIVALENT total (2742.84 == 457.14x6). Flavor differs, but in the BLIND encoding the
                  nuke's sequential flavor does NOT cause Mk2 over-credit either (blind's Mk2 UE doubling is the
                  duplicate skill1 block, not a sequentialMultPct that would catch sequential flavor). Both
                  encodings avoid doubling the nuke, by different means. crit:true measured-only ⚑.
  [2] Mk2 Eagle Eye: driver = burstCast -> sequentialMultPct:100 (10s) + casterAtkPct:50 (10s);
               blind = burstCast -> casterAtkPct:50 (10s) ONLY (the UE x2 lives in skill1[3]).
               -> casterAtkPct 50 / 10s IDENTICAL (the Eagle Eye ATK doubling). The UE x2 is split elsewhere in
                  the blind file (see skill1[3]).
unmodeled: driver = empty (all 8 lines modeled; header/flavor lines are not separate mechanics);
           blind = lists Mk2 header/flavor + "Previous effects trigger repeatedly" + "Eagle Eye-Type Exospine."
           -> documentation difference only; those are labels/flavor for effects that ARE modeled.
SUMMARY: 0 REAL-GOTCHA. Every load-bearing magnitude/mechanic converged (critRatePct60, hitCount59, UE720
sequential, damageTaken-Electric-gate, casterAtkPct50, maxAmmoPct25, instantReload0.04-Electric-gate,
nuke2742.84, Mk2 casterAtkPct50/10s, Mk2 UE x2). Residual diffs = event granularity (damage-equivalent),
trigger-vs-gate + permanent-vs-10s (⚑), crit:true (measured-only ⚑), and the UE-Mk2 mechanism (redaction-
driven workaround; driver's sequentialMultPct is the precise primitive).
=== END DIFF ===

## 7. DRIVER IMPLEMENTATION (the artifacts under judgment)
### 7a. driver test — scripts/tests/units/eve.test.ts
// PER-UNIT KIT SPEC — `eve` (EVE, Attacker/AR/Iron, Burst III, cd 40s, ammo 60, no charge).
// Kit-autonomy gauntlet 2026-07-25 (Tier 2: burstCast + bossElement status-gate + crit-count
// proxy + sequentialMultPct own-bucket multiplier).
//
// One assertion group per KIT LINE (E1..E8 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.eve.skills):
//   S1 ■ start of battle → self: Critical Rate ▲60% continuously                              [E1]
//      ■ after 44 critical normal hits → random enemy: Unstable Energy 240% × 3 sequential     [E2]
//        (= 720%; the 44-CRIT trigger is proxied as hitCount 59 = 44 / 0.75 crit — see ⚑)
//      ■ when Unstable Energy hits an Electric target → that target: Damage Taken ▲10% 10s     [E3]
//   S2 ■ start of battle → self: ATK ▲50% continuously + Max Ammunition Capacity ▲25%          [E4]
//      ■ every 10 normal hits on an Electric target → self: Reloads 3 round(s)                 [E5]
//   BU ■ random enemy: 457.14% × 6 sequential (= 2742.84%) — modeled UNFLAVORED (see E6)       [E6]
//      ■ self 10s: Exospine Mk2 — Unstable Energy sequential multiplier scaled by 100% (×2)    [E7]
//      ■ self 10s: Exospine Mk2 — Eagle Eye ATK multiplier scaled by 100% (ATK ▲50% again)     [E8]
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   E1  the +60 is a plain (unscoped) self critRatePct — her kit places NO scoping on it, so the
//       faithful model IS the generic buff. Proven live: shipped normal-attack critRate is 0.75
//       (15 base + 60), the buff-removed counterfactual is 0.15. Self-scoped: only eve's crit
//       moves, her allies' do not.
//   E2  magnitude 720 (240 × 3), NOT 240 — the counterfactual that forgets the ×3 sequential is
//       the nearest wrong model and the assertion fails under it. Cadence is the crit-count proxy
//       hitCount 59 (44 crits / 0.75): procs land ~once per 59 normal hits, asserted as a band the
//       literal-44 reading (≈34% more procs) falls outside.
//   E3  the debuff is GATED on an Electric boss. Vs Electric the boss carries damageTakenPct 10
//       (targetIdx null) and eve's mult.taken reads 1.1; vs an Iron boss BOTH vanish (gate inert)
//       and mult.taken is 1.0. The Iron==neutral element reading is asserted alongside.
//   E4  ATK ▲50% is encoded as casterAtkPct — "▲50% of the skill user's ATK" — which the engine
//       resolves to a FLAT ATK grant (= 50% of eve's scope-lock ATK, a large number, NOT a small
//       flat +50 and NOT a generic percentage atkPct). Max Ammo ▲25 is a permanent self passive.
//   E5  the 3-round refund is GATED on Electric (bossElementGate). Vs Electric the refund is live
//       (fewer magazine reloads than the refund-removed counterfactual); vs Iron it is inert
//       (reload count byte-identical to the removed counterfactual).
//   E6  the burst nuke is 2742.84 (457.14 × 6), in the burst bucket, cast BEFORE the FB window
//       (no +50% major), and — the subtle faithfulness point — carries NO sequential flavor, so
//       Mk2 cannot double it (the kit doubles Unstable Energy, not the nuke). Pinned by seqMult=1
//       on the nuke while, in the SAME fight, the Unstable Energy proc reaches seqMult=2 under
//       Mk2 — proving the engine routes flavor→seqMult here and the nuke genuinely opts out.
//   E7  Mk2's Unstable-Energy doubling is a TRUE ×2 via sequentialMultPct in its OWN multiplicative
//       bucket: the proc reads seqMult=2 inside the 10s window and 1 outside, exactly 2 (no
//       dilution). Counterfactual: the ADDITIVE sequentialDamagePct (snow-white-heavy-arms'
//       mechanic) leaves seqMult=1 and folds the bonus into dmgUp — the assertion fails under it.
//   E8  Mk2 also re-grants the Eagle Eye ATK as a TIMED (10s) casterAtkPct whose resolved flat
//       value EQUALS the permanent S2 grant — "scaled by 100%" re-grants the same 50%-of-ATK, so
//       eve runs at ×2 Eagle Eye ATK during Mk2. Distinct from the permanent passive by expiry.
//
// INERT / out-of-domain (no assertion, documented): the "Previous effects trigger repeatedly"
// flavor line is inherent (S1 keeps firing); the Max-Ammo DOUBLING under Mk2 is not modeled (Mk2
// scales the Eagle Eye *damage multiplier* = the ATK buff; a doubled mag is a second-order reload
// cadence effect, inert for DPS); the 10s REFRESH cadence of Damage Taken is approximated as
// permanent-while-Electric (over-credits only the opening seconds — see override caveat).
//
// Fixture: liter (B1) / crown (B2) / eve (B3), focus eve, deterministic (no seed). eve needs a
// real rotation to cast her burst at all (a lone B3 makes zero Full Bursts). Two boss elements:
// Electric (her intended target — every line live) and Iron (neutral for eve — the gated lines
// inert, element major 1.0), which is what makes the gate discriminations possible.
import { describe, expect, it } from 'vitest';
import type { Element, SimEvent } from '../../../src/types.js';
import {
  runComp,
  totals,
  withPatchedOverride,
  type CompOptions,
} from '../lib/harness.js';

const FPS = 60;
const MK2_FRAMES = 10 * FPS;
/** slugs order: liter 0 / crown 1 / eve 2. */
const EVE = 2;
/** eve's scope-lock ATK is 119,667; casterAtkPct 50 resolves to a flat grant of half of that. */
const EVE_ATK_GRANT_50PCT = 59833.5;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Reload = Extract<SimEvent, { kind: 'reload' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

const eveComp = (bossElement: Element | null): CompOptions => ({
  slugs: ['liter', 'crown', 'eve'],
  bossElement,
  focusSlug: 'eve',
});

function run(
  overrides: Record<string, any> = {},
  bossElement: Element | null = 'Electric',
) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...eveComp(bossElement),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual patches ------------------------------------------------------------------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);
const hasKind = (b: any, kind: string) =>
  b.effects.some((e: any) => e.kind === kind);

/** E1 counterfactual: her S1 crit-rate line removed entirely. */
const eveNoCrit = withPatchedOverride('eve', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'critRatePct'));
  if (ov.skill1.length === before)
    throw new Error('eve S1 critRatePct block missing — fixture is stale');
});
/** E2 counterfactual: Unstable Energy at 240% (the ×3 sequential forgotten). */
const eveUnstable240 = withPatchedOverride('eve', (ov) => {
  const e = ov.skill1
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'flatDamage');
  if (!e || e.atkPct !== 720)
    throw new Error('eve S1 720% flatDamage missing — fixture is stale');
  e.atkPct = 240;
});
/** E5 counterfactual: her S2 reload-refund line removed. */
const eveNoRefund = withPatchedOverride('eve', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasKind(b, 'instantReload'));
  if (ov.skill2.length === before)
    throw new Error('eve S2 instantReload block missing — fixture is stale');
});
/** E7 counterfactual: Mk2 doubling as the ADDITIVE sequentialDamagePct (the diluting bucket). */
const eveSeqDamage = withPatchedOverride('eve', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'sequentialMultPct');
  if (!e)
    throw new Error('eve burst sequentialMultPct missing — fixture is stale');
  e.stat = 'sequentialDamagePct';
});

// ---- runs (hoisted: each is a full 180s sim) -------------------------------------------------
const base = run(); // Electric, shipped
const noCrit = run({ eve: eveNoCrit }); // Electric
const unstable240 = run({ eve: eveUnstable240 }); // Electric
const noRefund = run({ eve: eveNoRefund }); // Electric
const seqDamage = run({ eve: eveSeqDamage }); // Electric
const iron = run({}, 'Iron'); // Iron, shipped (gates inert, elem neutral)
const ironNoRefund = run({ eve: eveNoRefund }, 'Iron');

// ---- readers ---------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const eveDamage = (evs: SimEvent[], srcSlot: Damage['srcSlot']) =>
  dmg(evs).filter((d) => d.slug === 'eve' && d.srcSlot === srcSlot);
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const eveBuffs = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === EVE && b.stat === stat);
const eveBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'eve');
const eveReloads = (evs: SimEvent[]) =>
  evs.filter((e): e is Reload => e.kind === 'reload' && e.slug === 'eve');
const eveShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'eve');

/** Dedup precision-sensitive floats (critRate / mult decomposition / kit magnitudes). */
const distinctNum = (xs: number[], dp = 6) =>
  [...new Set(xs.map((x) => Number(x.toFixed(dp))))].sort((a, b) => a - b);
/** Dedup exact values (ints, strings, null) — no rounding. */
const distinct = <T>(xs: T[]): T[] => [...new Set(xs)];

/** Unstable Energy procs: her skill1 flat hits (720% in shipped). */
const unstableProcs = (evs: SimEvent[]) => eveDamage(evs, 'skill1');

/** [start, end] frames of each Mk2 window = each eve burst cast + 10s. */
const mk2Windows = (evs: SimEvent[]): Array<[number, number]> =>
  eveBursts(evs).map((c) => [c.frame, c.frame + MK2_FRAMES]);

const inMk2 = (windows: Array<[number, number]>, frame: number) =>
  windows.some(([a, b]) => frame >= a && frame <= b);

describe('eve — kit spec', () => {
  describe('E1 — S1 Critical Rate ▲60% is a live, self-scoped passive (15 → 75%)', () => {
    it("lifts eve's normal-attack crit rate to exactly 0.75", () => {
      expect(
        distinctNum(eveDamage(base.events, 'normal').map((d) => d.critRate)),
      ).toEqual([0.75]);
    });
    it('DISCRIMINATING: removing the line drops her to the 0.15 base', () => {
      expect(
        distinctNum(eveDamage(noCrit.events, 'normal').map((d) => d.critRate)),
      ).toEqual([0.15]);
    });
    it('is self-scoped: a permanent critRatePct=60 buff held by eve alone', () => {
      const applied = eveBuffs(base.events, 'critRatePct');
      expect(distinctNum(applied.map((b) => b.value))).toEqual([60]);
      expect(distinct(applied.map((b) => b.targetIdx))).toEqual([EVE]);
      expect(distinct(applied.map((b) => b.expiresFrame))).toEqual([null]);
    });
  });

  describe('E2 — S1 Unstable Energy: 720% (240×3) sequential, on the crit-count proxy cadence', () => {
    it('procs at the kit magnitude 720 in the skill bucket, srcSlot skill1', () => {
      const procs = unstableProcs(base.events);
      expect(procs.length).toBeGreaterThan(0);
      expect(
        distinctNum(
          procs.map((d) => d.atkPct),
          4,
        ),
      ).toEqual([720]);
      expect(distinct(procs.map((d) => d.bucket))).toEqual(['skill']);
    });
    it('DISCRIMINATING magnitude: the ×3-forgotten model lands at 240, not 720', () => {
      expect(
        distinctNum(
          unstableProcs(unstable240.events).map((d) => d.atkPct),
          4,
        ),
      ).toEqual([240]);
    });
    it('fires on the hitCount-59 proxy cadence (44 crits / 0.75), not the literal 44', () => {
      const shots = eveShots(base.events).length;
      const procs = unstableProcs(base.events).length;
      const expect59 = shots / 59;
      const expect44 = shots / 44;
      expect(
        procs,
        `${procs} procs / ${shots} shots — expected ≈${expect59.toFixed(1)} (÷59), not ≈${expect44.toFixed(1)} (÷44)`,
      ).toBeGreaterThanOrEqual(Math.floor(expect59 * 0.8));
      expect(
        procs,
        'proc count is implausibly high for the ÷59 cadence',
      ).toBeLessThanOrEqual(Math.ceil(expect59 * 1.2));
      expect(
        procs,
        'proc count must sit well below the literal-÷44 reading',
      ).toBeLessThan(expect44 * 0.85);
    });
  });

  describe('E3 — S1 Damage Taken ▲10% is gated on an Electric boss', () => {
    it('vs Electric: the boss carries damageTakenPct 10 (enemy debuff, targetIdx null)', () => {
      const debuff = buffs(base.events).filter(
        (b) => b.stat === 'damageTakenPct' && b.targetIdx === null,
      );
      expect(
        debuff.length,
        'no boss damageTakenPct debuff vs Electric',
      ).toBeGreaterThan(0);
      expect(distinctNum(debuff.map((b) => b.value))).toEqual([10]);
    });
    it("vs Electric: eve's damage actually takes the +10% (mult.taken 1.1 once live)", () => {
      const taken = distinctNum(
        eveDamage(base.events, 'normal').map((d) => d.mult.taken),
        4,
      );
      expect(
        taken.some((t) => Math.abs(t - 1.1) < 1e-3),
        `mult.taken values ${taken} never reach 1.1`,
      ).toBe(true);
    });
    it('DISCRIMINATING gate: vs an Iron boss the debuff is absent and mult.taken stays 1.0', () => {
      const debuff = buffs(iron.events).filter(
        (b) => b.stat === 'damageTakenPct' && b.targetIdx === null,
      );
      expect(debuff).toEqual([]);
      expect(
        distinctNum(
          eveDamage(iron.events, 'normal').map((d) => d.mult.taken),
          4,
        ),
      ).toEqual([1]);
    });
    it('Iron is element-neutral for eve (Iron major 1.0, the "Iron == neutral" caveat)', () => {
      expect(
        distinctNum(
          eveDamage(iron.events, 'normal').map((d) => d.mult.elem),
          4,
        ),
      ).toEqual([1]);
      expect(
        distinctNum(
          eveDamage(base.events, 'normal').map((d) => d.mult.elem),
          4,
        ),
      ).toEqual([1.1]);
    });
  });

  describe('E4 — S2 Eagle Eye: ATK ▲50% (casterAtkPct flat grant) + Max Ammunition ▲25%, permanent self', () => {
    it("grants casterAtkPct as a flat ATK grant = 50% of eve's ATK, self-held, no expiry", () => {
      const applied = eveBuffs(base.events, 'casterAtkPct').filter(
        (b) => b.expiresFrame === null,
      );
      expect(
        applied.length,
        'no permanent casterAtkPct passive',
      ).toBeGreaterThan(0);
      // casterAtkPct is "▲50% of the skill user's ATK": the engine resolves it to a FLAT grant
      // (59833.5 = 0.5 × 119667), NOT a generic percentage atkPct and NOT a small flat +50.
      expect(
        distinctNum(
          applied.map((b) => b.value),
          1,
        ),
      ).toEqual([EVE_ATK_GRANT_50PCT]);
      expect(distinct(applied.map((b) => b.targetIdx))).toEqual([EVE]);
    });
    it('grants maxAmmoPct 25, self-held, no expiry', () => {
      const applied = eveBuffs(base.events, 'maxAmmoPct').filter(
        (b) => b.expiresFrame === null,
      );
      expect(distinctNum(applied.map((b) => b.value))).toEqual([25]);
      expect(distinct(applied.map((b) => b.targetIdx))).toEqual([EVE]);
    });
  });

  describe('E5 — S2 reload refund (3 rounds / 10 hits) is gated on an Electric boss', () => {
    it('vs Electric the refund is live: fewer magazine reloads than with it removed', () => {
      const withRefund = eveReloads(base.events).length;
      const without = eveReloads(noRefund.events).length;
      expect(
        without,
        'removing the refund did not increase reloads — refund is inert vs Electric',
      ).toBeGreaterThan(withRefund);
    });
    it('DISCRIMINATING gate: vs Iron the refund is inert (reload count identical to removed)', () => {
      expect(eveReloads(iron.events).length).toBe(
        eveReloads(ironNoRefund.events).length,
      );
    });
  });

  describe('E6 — burst nuke: 2742.84% (457.14×6), unflavored, cast before the FB window', () => {
    const nukes = (evs: SimEvent[]) => eveDamage(evs, 'burst');
    it('fires once per cast at the kit magnitude, in the burst bucket', () => {
      expect(nukes(base.events).length).toBe(eveBursts(base.events).length);
      expect(nukes(base.events).length).toBeGreaterThan(0);
      expect(
        distinctNum(
          nukes(base.events).map((d) => d.atkPct),
          4,
        ),
      ).toEqual([2742.84]);
      expect(distinct(nukes(base.events).map((d) => d.bucket))).toEqual([
        'burst',
      ]);
    });
    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      expect(
        nukes(base.events)
          .filter((d) => d.fbMajorApplied)
          .map((d) => d.sec),
      ).toEqual([]);
    });
    it('carries NO sequential flavor: seqMult 1 on every nuke, while the same fight routes the proc to seqMult 2 under Mk2', () => {
      expect(
        distinctNum(
          nukes(base.events).map((d) => d.mult.seqMult),
          4,
        ),
      ).toEqual([1]);
      const windows = mk2Windows(base.events);
      const procsInMk2 = unstableProcs(base.events).filter((d) =>
        inMk2(windows, d.frame),
      );
      expect(
        procsInMk2.length,
        'no Unstable Energy proc landed inside an Mk2 window to contrast against',
      ).toBeGreaterThan(0);
      expect(
        distinctNum(
          procsInMk2.map((d) => d.mult.seqMult),
          4,
        ),
      ).toEqual([2]);
    });
  });

  describe('E7 — Mk2 doubles Unstable Energy via sequentialMultPct: a TRUE ×2 in its own bucket', () => {
    it('applies sequentialMultPct 100 for exactly 10s on every burst cast, self-held', () => {
      const applied = eveBuffs(base.events, 'sequentialMultPct');
      expect(applied.length).toBe(eveBursts(base.events).length);
      expect(distinctNum(applied.map((b) => b.value))).toEqual([100]);
      expect(distinct(applied.map((b) => b.targetIdx))).toEqual([EVE]);
      expect(distinct(applied.map((b) => b.expiresFrame! - b.frame))).toEqual([
        MK2_FRAMES,
      ]);
    });
    it('procs read seqMult 2 inside the Mk2 window and 1 outside (exactly ×2, undiluted)', () => {
      const windows = mk2Windows(base.events);
      const procs = unstableProcs(base.events);
      const inside = procs.filter((d) => inMk2(windows, d.frame));
      const outside = procs.filter((d) => !inMk2(windows, d.frame));
      expect(inside.length).toBeGreaterThan(0);
      expect(outside.length).toBeGreaterThan(0);
      expect(
        distinctNum(
          inside.map((d) => d.mult.seqMult),
          4,
        ),
      ).toEqual([2]);
      expect(
        distinctNum(
          outside.map((d) => d.mult.seqMult),
          4,
        ),
      ).toEqual([1]);
    });
    it('DISCRIMINATING bucket: the additive sequentialDamagePct leaves seqMult 1 (bonus folds into dmgUp)', () => {
      const windows = mk2Windows(seqDamage.events);
      const inside = unstableProcs(seqDamage.events).filter((d) =>
        inMk2(windows, d.frame),
      );
      expect(
        inside.length,
        'no proc inside an Mk2 window in the counterfactual run',
      ).toBeGreaterThan(0);
      expect(
        distinctNum(
          inside.map((d) => d.mult.seqMult),
          4,
        ),
      ).toEqual([1]);
    });
  });

  describe('E8 — Mk2 re-grants the Eagle Eye ATK as a TIMED (10s) casterAtkPct, equal to the passive', () => {
    it('emits a timed casterAtkPct whose flat value EQUALS the permanent grant (×2 Eagle Eye ATK)', () => {
      const passive = eveBuffs(base.events, 'casterAtkPct').filter(
        (b) => b.expiresFrame === null,
      );
      const timed = eveBuffs(base.events, 'casterAtkPct').filter(
        (b) => b.expiresFrame !== null,
      );
      expect(timed.length).toBe(eveBursts(base.events).length);
      const passiveVal = distinctNum(
        passive.map((b) => b.value),
        1,
      );
      expect(passiveVal).toEqual([EVE_ATK_GRANT_50PCT]);
      // "scaled by 100%" re-grants the SAME 50%-of-ATK, so the timed grant equals the passive.
      expect(
        distinctNum(
          timed.map((b) => b.value),
          1,
        ),
      ).toEqual(passiveVal);
      expect(distinct(timed.map((b) => b.expiresFrame! - b.frame))).toEqual([
        MK2_FRAMES,
      ]);
      expect(distinct(timed.map((b) => b.targetIdx))).toEqual([EVE]);
    });
  });
});


### 7b. driver override — src/skills/overrides/eve.json
{
  "note": "Tier audit straggler (Bossing A; queue miss — story-tier proxy). Exospine system rebuilt from kit text (review pending fetch). Impact Exospine: crit rate +60 passive (parser ok, restated). Unstable Energy: per 44 CRIT normal hits -> 240% x3 sequential = 720%; at ~75% crit (60+15 base) that's ~1 proc per 59 hits -> hitCount 59, flavor sequential (joins the sequential exempt class: noFb ⚑; range exemption universal). Its Damage Taken 10%/10s applies only vs Electric-code enemies -> bossElement Electric gate. Eagle Eye: casterAtk 50 + maxAmmo 25 passives. Burst: 457.14 x6 sequential nuke (parser 2742.84 kept, burst-class = full FB); Mk2 doubles Unstable and Eagle Eye for 10s -> sequentialDamagePct +100 (gates on the sequential flavor) + casterAtkPct +50, both 10s. S2's reload-3-per-10-hits-on-Electric skipped (minor, element-gated). REVIEW-RECONCILED: AR 12RPS -> S1 proc every ~4.9s matches hitCount 59 exactly; Mk2 'doubles S1+S2' -> casterAtk +50 correct; the S1 doubling is now a TRUE x2 via sequentialMultPct+100 (kit-audit Phase A4, 2026-07-20) — the new own-bucket multiplier (multiplicative with Damage Up, not additive into it), so it no longer dilutes below x2 when other Damage-Up buffs are live (superseding the prior 'undercounts ~20% via dilution — accepted ⚑'); ADDED the missed 3-rounds-per-10th-hit refund (instantReload 0.05, Electric-target condition holds in her Iron-weak-only usage; review: 60-mag lasts 12.5s not 5s). noFb RELIC status (2026-07-15, autonomous-invariant-audit): her 720% Unstable-Energy proc (sequential) had its noFb ALREADY removed in a prior session -> FB applies by timing (DECISIONS-mandated; sequential is not type-exempt). She grades ~1.14 (over). Her cadence (hitCount 59) is kit-math (44 crit hits at ~75% crit) and her values are datamined, so the residual is the known ⚑ 'Mk2 doubling via sequentialDamagePct+100 undercounts ~20% vs a true x2' interacting with the now-applied FB. NO focused eve video exists in the catalog, so this cannot be settled empirically tonight -- documented OPEN, do NOT fudge to close it. Revisit if eve focus footage is captured. Kit-autonomy gauntlet 2026-07-25: re-audited S0-S9; all 8 damage lines confirmed FAITHFUL (S1 critRatePct60 passive + Unstable Energy 720% sequential at the hitCount-59 crit-count proxy + Electric-gated damageTakenPct10; S2 casterAtkPct50 flat-grant + maxAmmoPct25 + Electric-gated 3-round instantReload refund; burst 2742.84 unflavored/noFbMajor + Mk2 sequentialMultPct100 TRUE-x2 own-bucket + Mk2 timed casterAtkPct50). Cross-family claude-fable-5 (S2b) independently converged from prose — derived hitCount ceil(44/0.75)~59, casterAtkPct-flat-not-atkPct, sequentialMultPct-own-bucket-not-additive-sequentialDamagePct, both Mk2 riders keyed burstCast-not-fullBurstEnter, both Electric gates inert off-Electric — no FIX/MISSING requiring a change, no REAL-GOTCHA. Documented residuals (NOT faithfulness failures): the crit-count proxy is static (cannot track external team crit buffs); damageTaken is modeled permanent-while-Electric (vs the kit's 10s-per-proc refresh — over-credits only the opening seconds); the burst nuke is deliberately UNFLAVORED sequential so Mk2 cannot double it (the kit authorizes doubling Unstable Energy's sequential attacks only); Mk2 scales the Eagle Eye *damage multiplier* = the ATK buff, not max ammo (ammo-doubling inert for DPS). 21/21 unit-test green (scripts/tests/units/eve.test.ts).",
  "unmodeled": {
    "skill1": [],
    "skill2": [],
    "burst": []
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
      "effects": [
        {
          "kind": "buff",
          "stat": "critRatePct",
          "value": 60
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "hitCount",
        "count": 59
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 720,
          "flavor": "sequential"
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "bossElement",
        "element": "Electric"
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "damageTakenPct",
          "value": 10
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
          "stat": "casterAtkPct",
          "value": 50
        },
        {
          "kind": "buff",
          "stat": "maxAmmoPct",
          "value": 25
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "hitCount",
        "count": 10
      },
      "target": {
        "kind": "self"
      },
      "bossElementGate": "Electric",
      "effects": [
        {
          "kind": "instantReload",
          "fraction": 0.04
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
          "atkPct": 2742.84
        }
      ]
    },
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
          "kind": "buff",
          "stat": "sequentialMultPct",
          "value": 100,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 50,
          "durationSec": 10
        }
      ]
    }
  ],
  "caveats": [
    "skill1: Unstable Energy cadence (hitCount 59) assumes 75% crit at scope lock (44 crit hits / 0.75 = 58.67); external crit-rate buffs on eve would shorten the real cadence — the static threshold cannot respond.",
    "skill1: Damage Taken ▲10% is modeled as permanent while the boss is Electric (kit: 10s per Unstable Energy hit on an Electric target; ~full uptime after the first proc at ~4.9s, so the approximation over-credits only the opening seconds).",
    "skill2: the 3-round reload refund is now GATED on Electric bosses (bossElementGate Electric — inert vs non-Electric, kit-faithful) and fraction 0.04 (0.04 × 75 buffed mag = exactly 3 rounds, matching the kit's flat 3; the prior 0.05 rounded to 4). Enacted 2026-07-20 (kit-audit Phase C ENACT-NOW; Fable pre-op APPROVED). eve is ungraded — validated by solo unit-test (off-Electric total is now element/refund-clean: Iron == neutral).",
    "burst: Mk2's Unstable Energy doubling is a TRUE ×2 via sequentialMultPct +100 — its OWN multiplicative bucket (multiplicative with Damage Up, not additive into it; engine seqMult, kit-audit Phase A4 2026-07-20), so the ×2 holds regardless of other live Damage-Up buffs (no dilution). Distinct from the additive sequentialDamagePct that snow-white-heavy-arms uses (her 'Sequential Attack Damage ▲158.4%' is a Damage-Up-bucket buff that SHOULD dilute — untouched). The burst nuke itself carries no sequential flavor: kit tags it sequential, but flavoring it would also let Mk2 double the nuke, which the kit does NOT say. Solo unit-test verified (eve is ungraded): the 720% proc is ×2 with Mk2 and does NOT dilute against a synthetic extra Damage-Up buff; normal attacks stay ×1 under Mk2."
  ]
}

