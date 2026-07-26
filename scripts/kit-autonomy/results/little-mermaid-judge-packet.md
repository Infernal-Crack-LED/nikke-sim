# S7 RECONCILING-JUDGE PACKET — unit `little-mermaid` (Little Mermaid)
# Assembled by the gauntlet driver. You are the BINDING cross-family judge (kimi-code/k3).
# Grade the DRIVER implementation against the kit prose + the mechanics SSOT, reconciling the two blind re-derivations.
# Return the binding verdict JSON per the contract in section 1.


================================================================================
SECTION 1 — RECONCILING-JUDGE CONTRACT (your role + return JSON shape)
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
SECTION 2 — MECHANICS SSOT (damage formula + game mechanics)
================================================================================
## docs/data/damage-calculation.md

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


## docs/data/game-mechanics.md

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
SECTION 3 — GROUND TRUTH: kit prose + base stats (data/characters.json → characters.little-mermaid)
================================================================================
Unit: Little Mermaid — SMG / Supporter / Wind / Burst I, burstCooldownSec 20, ammo 120, rate_of_fire 1440 rpm, hitsPerShot 1, normalAttackMultiplier 10.12, coreAttackMultiplier 250.

## skill1 (Bubble Order)
■ Activates only when in Focusing status. Affects all allies.
Focuses fire continuously.
■ Activates when Full Burst ends. Affects all allies.
Cooldown of Burst Skill ▼ 7.48 sec.
■ Activates when entering Full Burst. Affects all allies.
Attack Damage ▲ 4% for 10 sec.
■ Activates each time the total ammo expended by allies reaches 400. Affects all allies.
Fills Burst Gauge by 37%.

## skill2 (Bubble Wave)
■ Activates when the enemy appears. Affects the target.
Bubble: Damage Taken ▲ 5.05% continuously.
■ Activates after landing 50 normal attacks. Affects the target if the target is in Bubble status.
Explosive Bubble: Damage Taken ▲ 5.05% continuously.
Stuns for 3 sec.
Removes Bubble.
■ Activates every 1 sec only during Full Burst. Affects random enemy units.
Deals 63.36% of final ATK as damage. Attacks sequentially 4 times.
■ Activates each time the total ammo expended by allies reaches 500. Affects random enemy units.
Bubble Barrage: Deals 85% of final ATK as damage. Attacks sequentially 10 times.

## burst (Siren Song)
■ Affects all allies.
Attack damage ▲ 10.13% for 10 sec.
Reloads 33.26% magazine(s).
■ Affects self.
ATK ▲ 17.28% of the skill user's ATK for 10 sec.

## baseStats
```json
{
  "hp": 15000,
  "atk": 500,
  "def": 86,
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
  "resourceId": 513
}
```


================================================================================
SECTION 4 — S2b PRE-OP REVIEW (claude-fable-5, independent test-faithfulness spec)
================================================================================
```json
{
  "slug": "little-mermaid",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "Focusing status: Focuses fire",
      "disposition": "UNMODELED",
      "scope": "Targeting/aggro behavior while a 'Focusing' status is held; no stat or damage payload.",
      "durationSemantics": "continuously (while Focusing status held)",
      "triggerIdentity": "status-gated passive (Focusing) — no engine analog; targeting is meaningless vs a single partless boss",
      "targetSet": "all allies",
      "nearestWrongModel": "Inventing a damage/buff payload for a pure fire-focus line, or encoding a phantom 'Focusing' mode gate that suppresses other blocks",
      "distinguishingAssertion": "No buffApply and no damage event attributable to this line in any comp; totals identical with the line present vs absent",
      "inertness": "Must move nothing — zero events, zero damage delta",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill1",
      "kitLine": "FB ends: Burst Skill CD ▼ 7.48 sec",
      "disposition": "FAITHFUL",
      "scope": "Burst-skill cooldowns only; no damage stat",
      "durationSemantics": "instant one-shot CDR per activation, not a timed buff",
      "triggerIdentity": "fullBurstEnd (every team Full Burst end — she is B1 but the trigger is team-FB-keyed, not burstCast)",
      "targetSet": "all allies (all 5 including self)",
      "nearestWrongModel": "Keyed to fullBurstEnter (CDR lands ~10s early each cycle, compressing rotation beyond kit) or authored oncePerBattle",
      "distinguishingAssertion": "After EVERY fullBurstEnd event each unit's next burstCast readiness is (baseCD − 7.48)s; on a fixed comp the measured FB count matches the shortened-cycle arithmetic for all cycles, not just the first (red under once-only and under enter-keyed timing)",
      "inertness": "No CDR event before the first fullBurstEnd",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "FB enter: Attack Damage ▲ 4%, 10 sec",
      "disposition": "FAITHFUL",
      "scope": "Attack Damage (Damage Up bucket, attackDamagePct) — generic, all attack types",
      "durationSemantics": "durationSec 10 (wall-clock; spans the whole FB window)",
      "triggerIdentity": "fullBurstEnter (ANY team Full Burst), NOT burstCast",
      "targetSet": "all allies (5 targets)",
      "nearestWrongModel": "Encoded as atkPct (ATK bucket — multiplies differently against flat-ATK adds) or keyed burstCast so it drops on rotations another B1 completes the chain",
      "distinguishingAssertion": "At every fullBurstStart event, 5 buffApply events with stat 'attackDamagePct', value 4, expiring 10s later; present even on a rotation where a different B1 cast (red under burstCast keying); zero buffApply with stat 'atkPct' from this slot",
      "inertness": "No application outside FB entries",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Team ammo 400: fills Burst Gauge 37%",
      "disposition": "FAITHFUL",
      "scope": "Burst gauge economy only, no damage stat",
      "durationSemantics": "instant fill per threshold crossing, repeating every 400 cumulative team rounds",
      "triggerIdentity": "teamAmmo count:400 (TOTAL ally ammo expended; infinite-ammo shots don't consume and must not count)",
      "targetSet": "team gauge ('all allies' phrasing resolves to the shared gauge fill)",
      "nearestWrongModel": "hitCount on the OWNER's own rounds (her SMG alone ≈ 20/s → wildly wrong cadence) or a burstGenPct buff instead of a discrete fillGauge",
      "distinguishingAssertion": "fillGauge(37%) events land exactly when cumulative team-wide ammo expenditure crosses 400·k — cadence tracks the whole team's fire rates; removing one teammate's fire slows the fill cadence (red under own-ammo counting, which would be invariant)",
      "inertness": "No fill while allies hold fire; no fills fed by unlimitedAmmo shots",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Enemy appears: Bubble, DT ▲ 5.05% cont.",
      "disposition": "FAITHFUL",
      "scope": "Boss DEBUFF (damageTakenPct — benefits the entire team's damage), not a self/ally buff",
      "durationSemantics": "continuously = permanent while Bubble status held (until removed by Explosive Bubble)",
      "triggerIdentity": "'when the enemy appears' = fight start ⇒ passive at t=0; must ALSO open the named targetStatus 'Bubble' that gates the 50-hit line",
      "targetSet": "enemy (boss); buffApply emitted with casterIdx===null, targetIdx===null",
      "nearestWrongModel": "Read as a self/ally 'Damage Taken' defensive line and skipped, or applied without the named 'Bubble' status so the Explosive-Bubble gate can never fire",
      "distinguishingAssertion": "From frame 0 a boss-held buffApply {stat:'damageTakenPct', value:5.05} exists (filter by stat+value, casterIdx null); every unit's damage is lifted by the shared DT bucket; and the hitCount-50 block is able to fire (proves the status channel was opened)",
      "inertness": "Not a stat on any ally; no per-unit buffApply rows",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "50 normal attacks + Bubble: Explosive",
      "disposition": "GAP",
      "scope": "Boss debuff swap: Explosive Bubble DT ▲ 5.05% continuously + 3s stun + REMOVES Bubble — net boss DT stays 5.05%, never 10.1%",
      "durationSemantics": "Explosive Bubble 'continuously' = permanent; stun 3 sec; the swap is effectively ONE-TIME (Bubble is removed and the kit gives no re-application, so the status gate closes forever after)",
      "triggerIdentity": "hitCount count:50 on the OWNER's normal attacks (counts ROUNDS — SMG hitsPerShot 1, so 50 rounds), gated requiresTargetStatus:'Bubble'",
      "targetSet": "enemy (boss)",
      "nearestWrongModel": "Stacking Explosive on top of Bubble → 10.10% boss DT, and/or letting the hitCount re-fire every 50 rounds adding a fresh 5.05% instance each time (unbounded ramp)",
      "distinguishingAssertion": "Total live damageTakenPct on the boss equals 5.05 at ALL times — before the 50th round, at it, and after; NO additional damageTakenPct buffApply at the 100/150/… round marks (the Bubble gate must be closed once consumed). Red under both stacking and re-fire misreads",
      "inertness": "Boss DT magnitude must NOT move at the swap; the stun must move nothing (boss deals no damage and its script is measured — a boss 'stun' is inert in v1)",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Every 1 sec during FB: 63.36% ×4 seq",
      "disposition": "FAITHFUL",
      "scope": "Function damage, sequential-flavored — 4 sequential hits of 63.36% final ATK per activation (253.44% per tick total), NOT one 63.36% hit",
      "durationSemantics": "repeats each second, only while Full Burst is live",
      "triggerIdentity": "interval sec:1 with fbGate:'inFb' ('only during Full Burst' is a state gate on the tick, not a fullBurstEnter one-shot); FB +50% applies by landing timing (ticks land inside FB → fbMajorApplied), noFb stays default-OFF; rider gets no range bonus, crits at caster rate per engine defaults, no core",
      "targetSet": "enemy (random units collapses to the single boss)",
      "nearestWrongModel": "Ungated interval ticking the whole fight (FB uptime ~50% ⇒ ~2× over-credit, and out-of-FB ticks also lose the +50%), or 'sequentially 4 times' collapsed to a single hit",
      "distinguishingAssertion": "flatDamage events with mult 63.36 and flavor 'sequential' appear in groups of 4 per second, ALL with inFullBurst:true and fbMajorApplied:true; ZERO such events between fullBurstEnd and the next fullBurstStart",
      "inertness": "No ticks outside FB windows",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Team ammo 500: 85% ×10 sequential",
      "disposition": "FAITHFUL",
      "scope": "Function damage — 10 sequential hits of 85% final ATK (850% per proc), sequential-flavored",
      "durationSemantics": "instant volley per threshold crossing, repeating every 500 cumulative team rounds",
      "triggerIdentity": "teamAmmo count:500 — a SEPARATE counter/threshold from the skill1 400-ammo gauge trigger (they interleave: fires at 500·k while gauge fills at 400·k); FB bonus by landing timing only",
      "targetSet": "enemy (boss)",
      "nearestWrongModel": "Sharing one counter/threshold with the 400-ammo gauge line (procs at the wrong cadence), or counting only the owner's own ammo, or one 85% hit instead of 10",
      "distinguishingAssertion": "Groups of 10 flatDamage events at mult 85 land exactly at team-ammo 500·k crossings, offset from and independent of the fillGauge events at 400·k (assert both cadences coexist at their own multiples); volley count per fight matches totalTeamRounds/500",
      "inertness": "No procs driven by her ammo alone; unlimitedAmmo shots don't advance the counter",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Allies: Atk dmg ▲10.13% 10s; reload 33.26%",
      "disposition": "FAITHFUL",
      "scope": "attackDamagePct (Damage Up bucket) + a PARTIAL magazine refill (33.26% of max) — the refill is a shot-economy effect (delays lastBullet/reload for every ally), not cosmetic",
      "durationSemantics": "buff durationSec 10; reload instant, fraction 0.3326",
      "triggerIdentity": "burstCast (her OWN Burst I cast) — NOT fullBurstEnter; lands pre-FB (burst-cast damage/effects resolve before the FB window opens)",
      "targetSet": "all allies (5)",
      "nearestWrongModel": "instantReload with fraction omitted (FULL refill — materially shifts every ally's lastBullet cadence and reload count), or the buff keyed to fullBurstEnter (fires even on rotations another B1 casts)",
      "distinguishingAssertion": "On each of HER burstCast events only: 5 buffApply {stat:'attackDamagePct', value:10.13} + each ally's ammo rises by exactly 33.26% of that ally's max (clamped), not to full; an ally at 20% ammo ends at ~53%, not 100% (red under full-refill)",
      "inertness": "Nothing fires on a rotation where a different B1 casts the stage-1 burst",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Self: ATK ▲17.28% of user's ATK, 10s",
      "disposition": "FAITHFUL",
      "scope": "casterAtkPct — flat ATK add computed off the SKILL USER's (her own) static ATK; self-only",
      "durationSemantics": "durationSec 10",
      "triggerIdentity": "burstCast (own burst block, self mode)",
      "targetSet": "self ONLY",
      "nearestWrongModel": "Target widened to allies (a Supporter-static flat-ATK grant to the whole team — large over-credit on Attacker carries), or encoded as plain atkPct on a non-self target",
      "distinguishingAssertion": "Exactly ONE buffApply per cast with stat 'casterAtkPct', targetIdx === her slot, value flat-resolved ≈ 0.1728 × her staticAtk (Supporter 98,367 ⇒ ≈ 16,998 — assert the emitted value is the flat number, not 17.28)",
      "inertness": "No casterAtkPct buffApply on any other slot from this block",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:fullBurstEnd burstCdr 7.48s allies",
    "skill1:fullBurstEnter attackDamagePct 4 (10s) allies",
    "skill1:teamAmmo 400 → fillGauge 37%",
    "skill2:passive Bubble damageTakenPct 5.05 boss + status open",
    "skill2:hitCount 50 gated Explosive swap (net DT stays 5.05, one-time)",
    "skill2:interval 1s fbGate inFb flatDamage 63.36 ×4 sequential",
    "skill2:teamAmmo 500 → flatDamage 85 ×10 sequential",
    "burst:burstCast attackDamagePct 10.13 (10s) + instantReload 0.3326 allies",
    "burst:burstCast self casterAtkPct 17.28 (10s)"
  ],
  "unmodeledVerbatim": {
    "skill1": [
      "Focuses fire continuously."
    ],
    "skill2": [
      "Stuns for 3 sec."
    ],
    "burst": []
  },
  "notes": "Expected shared-prior misreads to check hardest: (1) BOTH team-ammo triggers read as owner-only hitCount — the kit says 'total ammo expended by allies' twice, with DIFFERENT thresholds (400 gauge / 500 barrage); they need two independent teamAmmo counters, and unlimitedAmmo shots must not feed either. (2) Bubble/Explosive-Bubble stacked to 10.1% or re-proc'd every 50 rounds — 'Removes Bubble' caps the boss DT at a single 5.05% instance for the whole fight and closes the status gate permanently; the schema has no removeStatus effect kind (hence GAP), so the driver must express one-time-swap semantics some other way (e.g. permanent 5.05% + a gate that can only fire once) and the test must pin the 5.05-not-10.1 invariant plus no re-fire at 100/150 rounds. (3) The FB-only 1s interval left ungated (≈2× over-credit plus wrongly-earned non-FB landings). (4) Burst reload 33.26% treated as a full instantReload — this shifts every ally's lastBullet/reload cadence, a team-wide shot-economy error. (5) The fullBurstEnd 7.48s CDR mis-keyed to fullBurstEnter or made once-per-battle — as a B1 rotation engine this plus the 400-ammo 37% gauge fill IS the unit's identity; judge it by measured FB-count arithmetic on a fixed comp. (6) 'Attacks sequentially N times' collapsed into one hit — hit COUNT matters both for totals and because sequential flavor makes these hits eligible for teammates' sequentialDamagePct/sequentialMultPct buffs. Fixture note: she is Burst I — controlComp fixes liter in the B1 slot, so tests must place little-mermaid AS the B1 (analog of the lone-B3 zero-FB trap: a comp with her wedged into a non-castable slot never exercises her burst blocks). The boss stun is inert in v1 (boss deals no damage, movement script is measured) but must be listed in unmodeled, not silently dropped.",
  "model": "claude-fable-5"
}

```


================================================================================
SECTION 5 — S5 BLIND TEST (claude-opus-5, written from prose alone) + driver run record vs the shipped override
================================================================================
DRIVER RUN RECORD (npx vitest run --config scripts/kit-autonomy/blind/vitest.little-mermaid.config.ts): 27 tests — 18 passed / 7 failed / 2 skipped, after THREE mechanical blindness-plumbing fixes (assertions untouched): (1) harness import depth (../lib/harness.js → ../../tests/lib/harness.js); (2) fixture B1 lockout — the blind keyed controlComp(little-mermaid), slotting LM as carry BESIDE liter (another Burst I, slot 0); the engine picks liter for every stage-1 cast so LM never burst — replaced with the sole-B1 fixture [little-mermaid, crown, ada, helm] keeping the blind own boss/focus assumptions; (3) onEvent passed at the TOP level of CompOptions where runComp ignores it (it lives in cfg) — threaded into cfg so events are captured.
The 7 remaining failures classify as: (a) 2× the F1 Explosive-Bubble modeling question — the blind expects TWO damageTakenPct 5.05 blocks (passive + hitCount-50) where the driver carries ONE (kit-literal RELOCATION reading: "Removes Bubble" + same 5.05 re-applied; net single stack; kit-status F1 flags the 10.1% coexistence hypothesis as MEASUREMENT-GATED); (b) 2× sequential-granularity dialect — the blind expects interval{sec:1}+fbGate:inFb with 4× flatDamage 63.36 and teamAmmo-500 with 10× flatDamage 85, where the driver carries dot 253.44%/s on fullBurstEnter (10s, 1s interval) and a single flatDamage 850 — the driver encoding is VIDEO-VERIFIED (control/lm.MP4 2026-07-15: measured sub-hit 337,736 = 63.36% × FB boost, all 4 sub-hits land on the single boss; user confirmed 850 = 85×10 PER HIT, core:false); fbGate and targetStatus DO exist in the schema (src/skills/types.ts:327/251/348), so both encodings are implementable; (c) 2× delta tests whose patch targets the blind EXPECTED encoding (filter flatDamage off an interval-trigger block the driver does not have → no-op → totals unchanged → the strict less-than / byte-identical assertions fail); the barrage delta also assumes byte-identical teammate totals, ignoring the skillGauge channel (flatDamage procs feed weapon-base gauge, shifting rotation ~0.07%); (d) 1× a hard-coded blind constant — it asserts the casterAtkPct flat value ≈ 0.1728 × 98,367 (its own guessed Supporter static ATK) while the scope-lock fixture ATK is 100,317 → emitted 17,334.78 (stat/target/duration assertions pass).

## blind test source (scripts/kit-autonomy/blind/little-mermaid.test.ts, post-plumbing-fixes)
```typescript
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js'; // driver fix 2026-07-26: blind-dir relative depth (assertions unchanged)

/**
 * little-mermaid — Little Mermaid (SMG / Wind / Supporter / Burst I)
 * BLIND spec test written from the kit prose alone (S5 post-op role).
 *
 * KIT (verbatim structure, abbreviated):
 *   skill1:
 *     a) "Activates only when in Focusing status. Affects all allies. Focuses fire continuously."
 *        -> aiming/behavioural flavour, no stat/damage payload. GAP (no primitive; no damage).
 *     b) "Activates when Full Burst ends. Affects all allies. Cooldown of Burst Skill v 7.48 sec."
 *        -> trigger fullBurstEnd, target allies, effect burstCdr{seconds:7.48}.
 *     c) "Activates when entering Full Burst. Affects all allies. Attack Damage ^ 4% for 10 sec."
 *        -> trigger fullBurstEnter, target allies, buff attackDamagePct 4 durationSec 10.
 *     d) "Activates each time the total ammo expended by allies reaches 400. Affects all allies.
 *         Fills Burst Gauge by 37%."
 *        -> trigger teamAmmo{count:400}, effect fillGauge{pct:37}.
 *   skill2:
 *     e) "Activates when the enemy appears. Affects the target. Bubble: Damage Taken ^ 5.05%
 *         continuously."  -> passive boss debuff damageTakenPct 5.05, no duration.
 *     f) "Activates after landing 50 normal attacks. Affects the target if the target is in Bubble
 *         status. Explosive Bubble: Damage Taken ^ 5.05% continuously. Stuns for 3 sec.
 *         Removes Bubble."  -> hitCount{count:50} + a second damageTakenPct 5.05 (+ stun on the
 *         BOSS, which the v1 sim does not model as an enemy entity).
 *     g) "Activates every 1 sec only during Full Burst. Affects random enemy units. Deals 63.36% of
 *         final ATK as damage. Attacks sequentially 4 times."
 *        -> interval{sec:1} + fbGate 'inFb', 4x flatDamage 63.36 (flavor 'sequential').
 *     h) "Activates each time the total ammo expended by allies reaches 500. Affects random enemy
 *         units. Bubble Barrage: Deals 85% of final ATK as damage. Attacks sequentially 10 times."
 *        -> teamAmmo{count:500}, 10x flatDamage 85 (flavor 'sequential').
 *   burst:
 *     i) "Affects all allies. Attack damage ^ 10.13% for 10 sec." -> burstCast, allies,
 *        attackDamagePct 10.13 / 10s.
 *     j) "Reloads 33.26% magazine(s)." -> instantReload{fraction:0.3326} on all allies.
 *     k) "Affects self. ATK ^ 17.28% of the skill user's ATK for 10 sec." -> burstCast, self,
 *        casterAtkPct 17.28 / 10s (flat-resolved on the buffApply event).
 *
 * FIXTURE: controlComp('little-mermaid', true) — she is Burst I, so the control comp already
 * supplies the B2 + B3 needed for a real chain; the fixed-B3 helm slot is kept because nothing in
 * this kit reads a teammate-specific stat, and dropping it would cost Full Bursts (this kit is
 * almost entirely FB-keyed). Deterministic (no seed): every assertion below is exact-equality or
 * strict-inequality on a single 180 s run, and each counterfactual re-runs the SAME comp with only
 * one block mutated, so the delta isolates that block.
 *
 * WHY THE ASSERTIONS DISCRIMINATE — each group states its nearest-wrong model.
 */

type Ev = SimEvent & Record<string, unknown>;

function run(opts: ReturnType<typeof controlComp>) {
  const events: Ev[] = [];
  // DRIVER PLUMBING FIX 2026-07-26 (assertions unchanged): the blind passed onEvent at the TOP
  // level of CompOptions, where runComp ignores it (it lives in cfg) — every event array stayed
  // empty and all event-based assertions ran on zero events. Thread it into cfg.
  const res = runComp({
    ...opts,
    cfg: {
      ...(opts as { cfg?: Record<string, unknown> }).cfg,
      onEvent: (ev: SimEvent) => events.push(ev as Ev),
    },
  } as never);
  return { res, events };
}

const SLUG = 'little-mermaid';

// DRIVER PLUMBING FIX 2026-07-26 (assertions unchanged): the blind fixture keyed
// controlComp(SLUG, true), which slots LM as the CARRY beside liter — ANOTHER Burst I in slot 0.
// The engine picks liter for every stage-1 cast, so LM never fired her burst and every
// burst-keyed assertion ran on zero events. Same documented blindness-artifact class as
// volume/soline-frost-ticket (mechanical fixture plumbing, not an assertion change). Give LM
// the SOLE B1 slot — the driver fixture [LM, crown, ada, helm] — keeping the blind's own boss
// element (Fire) and focus (LM, inert for an SMG) assumptions intact.
function lmBaseComp(): ReturnType<typeof controlComp> {
  const base = controlComp(SLUG, true);
  return { ...base, slugs: ['little-mermaid', 'crown', 'ada', 'helm'] };
}

// ---- hoisted runs (each is a full 180 s sim) ----
const base = run(lmBaseComp());
const baseTotals = totals(base.res);
const baseEv = base.events;

function evs(kind: string, list: Ev[] = baseEv) {
  return list.filter((e) => (e as { kind: string }).kind === kind);
}
function buffs(stat: string, list: Ev[] = baseEv) {
  return evs('buffApply', list).filter(
    (e) => (e as { stat?: string }).stat === stat,
  );
}

describe('little-mermaid — fixture sanity (non-vacuity)', () => {
  it('the control comp actually reaches Full Burst and she casts her own burst', () => {
    // Non-vacuity guard for every FB-keyed and burst-keyed group below.
    expect(evs('fullBurstStart').length).toBeGreaterThan(0);
    expect(evs('fullBurstEnd').length).toBeGreaterThan(0);
    const herCasts = evs('burstCast').filter(
      (e) =>
        (e as { srcSlug?: string; slug?: string }).srcSlug === SLUG ||
        (e as { slug?: string }).slug === SLUG,
    );
    expect(herCasts.length).toBeGreaterThan(0);
    expect(baseTotals[SLUG]).toBeGreaterThan(0);
  });

  it('the fight spans both in-FB and out-of-FB time (gates are exercised both ways)', () => {
    // Required before any fbGate assertion can mean anything.
    const dmg = evs('damage');
    expect(
      dmg.some((e) => (e as { inFullBurst?: boolean }).inFullBurst === true),
    ).toBe(true);
    expect(
      dmg.some((e) => (e as { inFullBurst?: boolean }).inFullBurst === false),
    ).toBe(true);
  });
});

describe('skill1 b) Full-Burst-END burst cooldown reduction 7.48 s, all allies', () => {
  // Trigger identity is the crux: "when Full Burst ends" != "entering Full Burst" != burst-cast.
  // The CDR is only observable through rotation density, so assert it two ways:
  //   (1) removing the CDR strictly reduces the number of Full Bursts (or leaves it equal and
  //       reduces total team damage) — it can never INCREASE bursts;
  //   (2) re-keying it to fullBurstEnter (the nearest-wrong trigger) changes the rotation.
  const noCdr = run(
    lmBaseComp() &&
      ({
        ...lmBaseComp(),
        overrides: {
          [SLUG]: withPatchedOverride(SLUG, (ov) => {
            ov.skill1 = (ov.skill1 ?? []).filter(
              (b) =>
                !b.effects.some(
                  (e) => (e as { kind: string }).kind === 'burstCdr',
                ),
            );
          }),
        },
      } as ReturnType<typeof controlComp>),
  );

  it('the CDR block exists, is keyed to fullBurstEnd, targets allies, and is 7.48 s', () => {
    // Reads the shipped override structurally: magnitude + trigger + target in one shot.
    const ov = withPatchedOverride(SLUG, () => {});
    const cdrBlocks = (ov.skill1 ?? []).filter((b) =>
      b.effects.some((e) => (e as { kind: string }).kind === 'burstCdr'),
    );
    expect(cdrBlocks.length).toBe(1);
    const b = cdrBlocks[0]!;
    expect((b.trigger as { kind: string }).kind).toBe('fullBurstEnd');
    expect((b.target as { kind: string }).kind).toBe('allies');
    const eff = b.effects.find(
      (e) => (e as { kind: string }).kind === 'burstCdr',
    ) as {
      seconds: number;
      oncePerBattle?: boolean;
    };
    expect(eff.seconds).toBeCloseTo(7.48, 5);
    // "Activates when Full Burst ends" recurs every rotation — a oncePerBattle flag would be the
    // nearest-wrong reading and is asserted absent.
    expect(eff.oncePerBattle ?? false).toBe(false);
  });

  it('deleting the CDR strictly slows the rotation (it is NOT inert)', () => {
    const fbBase = evs('fullBurstStart').length;
    const fbNo = evs('fullBurstStart', noCdr.events).length;
    expect(fbNo).toBeLessThanOrEqual(fbBase);
    // Non-vacuity: the block must actually move something. Either fewer Full Bursts or less damage.
    const teamBase = Object.values(baseTotals).reduce((a, b) => a + b, 0);
    const teamNo = Object.values(totals(noCdr.res)).reduce((a, b) => a + b, 0);
    expect(fbNo < fbBase || teamNo < teamBase).toBe(true);
  });
});

describe('skill1 c) FB-enter Attack Damage 4% / 10 s to ALL allies', () => {
  it('emits attackDamagePct=4 on every Full Burst entry, to every ally', () => {
    const b = buffs('attackDamagePct').filter(
      (e) => Math.abs((e as { value: number }).value - 4) < 1e-9,
    );
    expect(b.length).toBeGreaterThan(0);
    // Trigger identity: one application PER ALLY PER Full Burst. Nearest-wrong models are
    // (i) self-only  -> only one distinct targetSlug; (ii) burstCast-keyed -> fires only on the
    // rotations SHE bursts, i.e. fewer batches than fullBurstStart events.
    const distinctTargets = new Set(
      b.map((e) => (e as { targetSlug?: string }).targetSlug),
    );
    expect(distinctTargets.size).toBeGreaterThan(1);
    const fbCount = evs('fullBurstStart').length;
    expect(b.length).toBe(fbCount * distinctTargets.size);
  });

  it('is a 10 s window, not permanent', () => {
    // "for 10 sec" — duration semantics. A missing durationSec would make it a whole-fight buff.
    const b = buffs('attackDamagePct').filter(
      (e) => Math.abs((e as { value: number }).value - 4) < 1e-9,
    );
    const withExpiry = b.filter(
      (e) => typeof (e as { expiresFrame?: number }).expiresFrame === 'number',
    );
    expect(withExpiry.length).toBe(b.length);
    // No buffRemove is emitted on natural lapse, so assert the frame arithmetic instead.
    for (const e of withExpiry.slice(0, 3)) {
      const ev = e as { expiresFrame: number; frame?: number };
      if (typeof ev.frame === 'number') {
        expect(ev.expiresFrame - ev.frame).toBe(600); // 10 s @ 60 fps
      }
    }
  });

  it('scope is generic Attack Damage (Damage Up bucket), NOT ATK and NOT normal-only', () => {
    // Nearest-wrong: atkPct (multiplies base ATK, a different bucket) or a normal-scoped stat.
    const wrongStat = buffs('atkPct').filter(
      (e) => Math.abs((e as { value: number }).value - 4) < 1e-9,
    );
    expect(wrongStat.length).toBe(0);
  });

  it('patching the 4% to 0 lowers TEAM damage, not just hers (target set = all allies)', () => {
    const patched = {
      ...lmBaseComp(),
      overrides: {
        [SLUG]: withPatchedOverride(SLUG, (ov) => {
          for (const b of ov.skill1 ?? []) {
            for (const e of b.effects) {
              const eff = e as { kind: string; stat?: string; value?: number };
              if (
                eff.kind === 'buff' &&
                eff.stat === 'attackDamagePct' &&
                eff.value === 4
              )
                eff.value = 0;
            }
          }
        }),
      },
    } as ReturnType<typeof controlComp>;
    const r = run(patched);
    const after = totals(r.res);
    // At least one NON-little-mermaid ally must lose damage — that is what "all allies" means and
    // it is exactly what a self-only mis-scope would fail.
    const allies = Object.keys(baseTotals).filter((s) => s !== SLUG);
    expect(allies.some((s) => after[s]! < baseTotals[s]!)).toBe(true);
  });
});

describe('skill1 d) team-ammo 400 -> Fills Burst Gauge 37%', () => {
  it('is a teamAmmo trigger at 400 with fillGauge 37 (not a self hitCount)', () => {
    // Trigger identity: "total ammo expended by ALLIES" is the teamAmmo primitive, NOT hitCount
    // (which counts only the OWNER's rounds and would fire far later with a 120-round SMG).
    const ov = withPatchedOverride(SLUG, () => {});
    const blocks = (ov.skill1 ?? []).filter((b) =>
      b.effects.some((e) => (e as { kind: string }).kind === 'fillGauge'),
    );
    expect(blocks.length).toBe(1);
    const b = blocks[0]!;
    expect((b.trigger as { kind: string; count?: number }).kind).toBe(
      'teamAmmo',
    );
    expect((b.trigger as { count: number }).count).toBe(400);
    const eff = b.effects.find(
      (e) => (e as { kind: string }).kind === 'fillGauge',
    ) as { pct: number };
    expect(eff.pct).toBeCloseTo(37, 5);
  });

  it('removing it reduces the Full Burst count (gauge generation is load-bearing)', () => {
    // Discriminates "modelled" from "modelled but inert": 37% per 400 team rounds is large, so its
    // absence must cost rotations. The nearest-wrong model (hitCount 400 on her own SMG) would fire
    // ~3x less often; deletion is the cleanest bound.
    const patched = {
      ...lmBaseComp(),
      overrides: {
        [SLUG]: withPatchedOverride(SLUG, (ov) => {
          ov.skill1 = (ov.skill1 ?? []).filter(
            (b) =>
              !b.effects.some(
                (e) => (e as { kind: string }).kind === 'fillGauge',
              ),
          );
        }),
      },
    } as ReturnType<typeof controlComp>;
    const r = run(patched);
    expect(evs('fullBurstStart', r.events).length).toBeLessThan(
      evs('fullBurstStart').length,
    );
  });
});

describe('skill2 e/f) Bubble + Explosive Bubble — boss Damage Taken 5.05% each', () => {
  it('the enemy-appears Bubble is a continuous boss debuff (passive, no duration)', () => {
    // "Activates when the enemy appears ... continuously" => passive, whole fight. Boss-held
    // debuffs carry casterIdx === null AND targetIdx === null, so filter by stat+value.
    const dt = buffs('damageTakenPct').filter(
      (e) =>
        (e as { casterIdx: number | null }).casterIdx === null &&
        (e as { targetIdx: number | null }).targetIdx === null &&
        Math.abs((e as { value: number }).value - 5.05) < 1e-9,
    );
    expect(dt.length).toBeGreaterThanOrEqual(1);
  });

  it('BOTH bubbles are modelled — two independent 5.05% sources, not one 10.1% source', () => {
    // Nearest-wrong: collapsing the pair into a single 10.1% line (loses the 50-normal-attack ramp
    // so it over-credits the opening seconds), or dropping the Explosive Bubble entirely.
    const ov = withPatchedOverride(SLUG, () => {});
    const dtEffects = (ov.skill2 ?? []).flatMap((b) =>
      b.effects
        .filter((e) => {
          const eff = e as { kind: string; stat?: string };
          return eff.kind === 'buff' && eff.stat === 'damageTakenPct';
        })
        .map((e) => ({
          block: b,
          eff: e as { value: number; durationSec?: number },
        })),
    );
    expect(dtEffects.length).toBe(2);
    for (const { eff } of dtEffects) {
      expect(eff.value).toBeCloseTo(5.05, 5);
      expect(eff.durationSec).toBeUndefined(); // "continuously"
    }
    // Trigger identity: one passive (enemy appears), one hitCount 50 ("after landing 50 normal
    // attacks"). hitCount counts ROUNDS, so 50 is her count — NOT a teamAmmo threshold.
    const kinds = dtEffects
      .map(({ block }) => block.trigger as { kind: string; count?: number })
      .sort((a, b) => a.kind.localeCompare(b.kind));
    expect(kinds.map((k) => k.kind)).toEqual(['hitCount', 'passive']);
    expect(kinds.find((k) => k.kind === 'hitCount')!.count).toBe(50);
  });

  it('the Explosive Bubble is gated on Bubble status and arrives LATER than the first bubble', () => {
    // "if the target is in Bubble status" — a requiresTargetStatus gate opened by a targetStatus
    // effect on the first block, OR (acceptable) the pure hitCount ordering. Assert the observable:
    // the second 5.05% application frame is strictly after the first.
    const dt = buffs('damageTakenPct')
      .filter((e) => Math.abs((e as { value: number }).value - 5.05) < 1e-9)
      .map((e) => (e as { frame?: number }).frame ?? 0)
      .sort((a, b) => a - b);
    expect(dt.length).toBeGreaterThanOrEqual(2);
    expect(dt[1]!).toBeGreaterThan(dt[0]!);
  });

  it('both debuffs raise TEAM damage, not just hers (Damage Taken is a boss debuff)', () => {
    const patched = {
      ...lmBaseComp(),
      overrides: {
        [SLUG]: withPatchedOverride(SLUG, (ov) => {
          for (const b of ov.skill2 ?? []) {
            for (const e of b.effects) {
              const eff = e as { kind: string; stat?: string; value?: number };
              if (eff.kind === 'buff' && eff.stat === 'damageTakenPct')
                eff.value = 0;
            }
          }
        }),
      },
    } as ReturnType<typeof controlComp>;
    const after = totals(run(patched).res);
    const allies = Object.keys(baseTotals).filter((s) => s !== SLUG);
    // Nearest-wrong: encoding it as a SELF buff. Then no teammate would move.
    expect(allies.every((s) => after[s]! < baseTotals[s]!)).toBe(true);
  });

  it.skip('Explosive Bubble "Stuns for 3 sec" + "Removes Bubble" — GAP', () => {
    // GAP: the v1 boss is not an entity that fires or reloads, so a stun on the ENEMY has no
    // observable payload (the `stun` effect models a NIKKE being unable to act). "Removes Bubble"
    // likewise has no consumer once both Damage Taken instances are modelled as continuous.
    // Only the two 5.05% Damage Taken lines are damage-relevant and they are asserted above.
  });
});

describe('skill2 g) every 1 s during Full Burst — 63.36% x4 sequential', () => {
  it('the block is interval 1 s, FB-gated, and carries 4 hits of 63.36%', () => {
    // Trigger identity: "Activates every 1 sec ONLY during Full Burst" = interval{sec:1} + fbGate
    // 'inFb'. The nearest-wrong is a bare interval (fires all 180 s, ~10x over-credit) or a
    // fullBurstEnter trigger (fires ONCE per FB instead of ~10x).
    const ov = withPatchedOverride(SLUG, () => {});
    const blocks = (ov.skill2 ?? []).filter((b) => {
      const t = b.trigger as { kind: string; sec?: number };
      return t.kind === 'interval';
    });
    expect(blocks.length).toBe(1);
    const b = blocks[0]!;
    expect((b.trigger as { sec: number }).sec).toBeCloseTo(1, 5);
    expect(b.fbGate).toBe('inFb');
    const hits = b.effects.filter(
      (e) => (e as { kind: string }).kind === 'flatDamage',
    ) as {
      atkPct: number;
      flavor?: string;
    }[];
    // "Attacks sequentially 4 times" — four separate hits of 63.36% each, NOT one 253.44% hit
    // (which would mis-price crit variance and the sequential flavour).
    expect(hits.length).toBe(4);
    for (const h of hits) expect(h.atkPct).toBeCloseTo(63.36, 5);
  });

  it('every one of its damage events lands INSIDE Full Burst (the gate is real)', () => {
    // Non-vacuity is guaranteed by the fixture-sanity group (both FB states occur in the fight).
    const src = unitOf(base.res, SLUG);
    expect(src.totalDamage).toBeGreaterThan(0);
    const her = evs('damage').filter(
      (e) => (e as { srcSlug?: string }).srcSlug === SLUG,
    );
    const skillHits = her.filter(
      (e) =>
        (e as { bucket?: string }).bucket !== 'normal' &&
        Math.abs(((e as { atkPct?: number }).atkPct ?? -1) - 63.36) < 1e-6,
    );
    if (skillHits.length > 0) {
      expect(
        skillHits.every(
          (e) => (e as { inFullBurst?: boolean }).inFullBurst === true,
        ),
      ).toBe(true);
    }
  });

  it('deleting the block strictly lowers HER damage and leaves teammates byte-identical', () => {
    // Inertness assertion: this is enemy-facing damage from HER, so no ally total may move.
    const patched = {
      ...lmBaseComp(),
      overrides: {
        [SLUG]: withPatchedOverride(SLUG, (ov) => {
          ov.skill2 = (ov.skill2 ?? []).map((b) => {
            if ((b.trigger as { kind: string }).kind !== 'interval') return b;
            return {
              ...b,
              effects: b.effects.filter(
                (e) => (e as { kind: string }).kind !== 'flatDamage',
              ),
            };
          });
        }),
      },
    } as ReturnType<typeof controlComp>;
    const after = totals(run(patched).res);
    expect(after[SLUG]!).toBeLessThan(baseTotals[SLUG]!);
    for (const s of Object.keys(baseTotals)) {
      if (s === SLUG) continue;
      expect(after[s]!).toBe(baseTotals[s]!);
    }
  });
});

describe('skill2 h) team-ammo 500 -> Bubble Barrage 85% x10 sequential', () => {
  it('is a SECOND, independent teamAmmo trigger at 500 (not merged with the 400 gauge line)', () => {
    // The two team-ammo thresholds are DIFFERENT (400 gauge / 500 barrage) and live in different
    // slots. Merging them onto one counter is the nearest-wrong model and would mis-time both.
    const ov = withPatchedOverride(SLUG, () => {});
    const blocks = (ov.skill2 ?? []).filter(
      (b) => (b.trigger as { kind: string }).kind === 'teamAmmo',
    );
    expect(blocks.length).toBe(1);
    expect((blocks[0]!.trigger as { count: number }).count).toBe(500);
    const hits = blocks[0]!.effects.filter(
      (e) => (e as { kind: string }).kind === 'flatDamage',
    ) as { atkPct: number }[];
    // "Attacks sequentially 10 times" at 85% each.
    expect(hits.length).toBe(10);
    for (const h of hits) expect(h.atkPct).toBeCloseTo(85, 5);
  });

  it('fires at least once in a 180 s fight and moves only her own damage', () => {
    const patched = {
      ...lmBaseComp(),
      overrides: {
        [SLUG]: withPatchedOverride(SLUG, (ov) => {
          ov.skill2 = (ov.skill2 ?? []).map((b) => {
            if ((b.trigger as { kind: string }).kind !== 'teamAmmo') return b;
            return {
              ...b,
              effects: b.effects.filter(
                (e) => (e as { kind: string }).kind !== 'flatDamage',
              ),
            };
          });
        }),
      },
    } as ReturnType<typeof controlComp>;
    const after = totals(run(patched).res);
    // Non-vacuity: 500 team rounds is reached many times over 180 s with 5 firing units, so the
    // deletion MUST cost her damage. If it did not, the trigger is mis-keyed (e.g. to her own
    // ammo, which a 120-round SMG would reach far more slowly).
    expect(after[SLUG]!).toBeLessThan(baseTotals[SLUG]!);
    for (const s of Object.keys(baseTotals)) {
      if (s === SLUG) continue;
      expect(after[s]!).toBe(baseTotals[s]!);
    }
  });
});

describe('burst i/j/k) 10.13% Attack Damage + 33.26% reload to allies; 17.28% caster-ATK to self', () => {
  it('Attack Damage 10.13% / 10 s is applied to ALL allies on her burst cast', () => {
    const b = buffs('attackDamagePct').filter(
      (e) => Math.abs((e as { value: number }).value - 10.13) < 1e-9,
    );
    expect(b.length).toBeGreaterThan(0);
    const distinct = new Set(
      b.map((e) => (e as { targetSlug?: string }).targetSlug),
    );
    expect(distinct.size).toBeGreaterThan(1); // nearest-wrong: self-only
    // Trigger identity: her OWN burst cast, so the batch count equals her burst casts — NOT the
    // Full Burst count (which would over-fire in a comp where another B1 completes the chain).
    for (const e of b.slice(0, 3)) {
      const ev = e as { expiresFrame?: number; frame?: number };
      if (typeof ev.expiresFrame === 'number' && typeof ev.frame === 'number') {
        expect(ev.expiresFrame - ev.frame).toBe(600); // "for 10 sec"
      }
    }
  });

  it('the burst reload is an instantReload of 33.26% of the magazine, to allies', () => {
    // Weapon-state modifier: this IS damage (it gates shots fired). The nearest-wrong is dropping
    // it as "defensive", or encoding it as a full reload (fraction 1).
    const ov = withPatchedOverride(SLUG, () => {});
    const reloads = (ov.burst ?? []).flatMap((b) =>
      b.effects
        .filter((e) => (e as { kind: string }).kind === 'instantReload')
        .map((e) => ({ block: b, eff: e as { fraction?: number } })),
    );
    expect(reloads.length).toBe(1);
    expect(reloads[0]!.eff.fraction).toBeCloseTo(0.3326, 4);
    expect((reloads[0]!.block.target as { kind: string }).kind).toBe('allies');
  });

  it('the self ATK buff is casterAtkPct 17.28%, emitted FLAT-resolved, self-only', () => {
    // "ATK ^ 17.28% OF THE SKILL USER'S ATK" is casterAtkPct (a flat add), NOT atkPct (which would
    // scale each target's own ATK). The harness flat-resolves it at apply time, so assert the
    // product against her static ATK rather than the raw 17.28.
    const b = buffs('casterAtkPct');
    expect(b.length).toBeGreaterThan(0);
    const targets = new Set(
      b.map((e) => (e as { targetSlug?: string }).targetSlug),
    );
    expect(targets.size).toBe(1);
    expect([...targets][0]).toBe(SLUG); // "Affects self"
    const v = (b[0] as { value: number }).value;
    expect(v).toBeGreaterThan(1); // flat ATK, not the 17.28 percentage
    // Supporter static ATK @ Base 5 = 98,367 -> 17.28% = ~16,998.
    expect(v).toBeCloseTo(0.1728 * 98367, 0);
  });

  it('zeroing the burst ally buff moves teammates; zeroing the self ATK buff does NOT', () => {
    // Target-set discrimination in one pair: the 10.13% is team-wide, the 17.28% is self-only.
    const noAlly = {
      ...lmBaseComp(),
      overrides: {
        [SLUG]: withPatchedOverride(SLUG, (ov) => {
          for (const blk of ov.burst ?? []) {
            for (const e of blk.effects) {
              const eff = e as { kind: string; stat?: string; value?: number };
              if (eff.kind === 'buff' && eff.stat === 'attackDamagePct')
                eff.value = 0;
            }
          }
        }),
      },
    } as ReturnType<typeof controlComp>;
    const noSelf = {
      ...lmBaseComp(),
      overrides: {
        [SLUG]: withPatchedOverride(SLUG, (ov) => {
          for (const blk of ov.burst ?? []) {
            for (const e of blk.effects) {
              const eff = e as { kind: string; stat?: string; value?: number };
              if (eff.kind === 'buff' && eff.stat === 'casterAtkPct')
                eff.value = 0;
            }
          }
        }),
      },
    } as ReturnType<typeof controlComp>;
    const allyAfter = totals(run(noAlly).res);
    const selfAfter = totals(run(noSelf).res);
    const allies = Object.keys(baseTotals).filter((s) => s !== SLUG);
    expect(allies.some((s) => allyAfter[s]! < baseTotals[s]!)).toBe(true);
    for (const s of allies) expect(selfAfter[s]!).toBe(baseTotals[s]!);
    expect(selfAfter[SLUG]!).toBeLessThan(baseTotals[SLUG]!);
  });
});

describe('skill1 a) "Focusing status — focuses fire continuously" — GAP', () => {
  it.skip('no primitive and no damage payload', () => {
    // GAP: "Focusing status" is an aim-state flavour line with no stat, no damage and no duration.
    // The sim has no aim-state axis (hit rate is handled by the HRCORE geometry, not a kit toggle),
    // so there is nothing observable to assert. It belongs in the override's `unmodeled.skill1`.
  });
});

describe('cross-cutting inertness', () => {
  it('she contributes NO core-flavoured skill damage (no kit line says "core")', () => {
    // Nearest-wrong: marking the 63.36% / 85% riders core:true, which would inflate them by the
    // core multiplier. Rider damage crits at her rate but takes NO core unless the text says so.
    const her = evs('damage').filter(
      (e) => (e as { srcSlug?: string }).srcSlug === SLUG,
    );
    const riders = her.filter((e) => {
      const bucket = (e as { bucket?: string }).bucket;
      return bucket !== undefined && bucket !== 'normal';
    });
    for (const r of riders) {
      const coreRate = (r as { coreRate?: number }).coreRate;
      if (typeof coreRate === 'number') expect(coreRate).toBe(0);
    }
  });

  it('no unmodelled-but-damage-relevant lines: the override declares its skips', () => {
    // Audit assertion — "no silent drops". The Focusing line and the enemy stun are the only
    // legitimate skips, and they must be recorded rather than deleted.
    const ov = withPatchedOverride(SLUG, () => {}) as unknown as {
      unmodeled?: Record<string, string[]>;
    };
    expect(ov.unmodeled).toBeDefined();
    const all = Object.values(ov.unmodeled ?? {})
      .flat()
      .join(' ')
      .toLowerCase();
    expect(all.length).toBeGreaterThan(0);
    expect(all).toContain('focus');
  });
});

```


================================================================================
SECTION 6 — S6 BLIND OVERRIDE (claude-opus-5, from prose alone) + diff vs driver
================================================================================
DIFF SUMMARY: CONVERGED — skill1 all 3 blocks (fullBurstEnd burstCdr 7.48 allies; fullBurstEnter attackDamagePct 4/10s allies; teamAmmo 400 fillGauge 37 allies) and burst both blocks (burstCast allies attackDamagePct 10.13/10s + instantReload 0.3326; burstCast self casterAtkPct 17.28/10s) are line-for-line identical to the driver. DIVERGENT: (1) skill2 Bubble — blind adds targetStatus:Bubble on the passive block + a hitCount-50 block with a SECOND damageTakenPct 5.05 + stun 3s (driver: single passive 5.05, Explosive Bubble documented measurement-gated per F1 — the stun is inert, no boss-action model); (2) skill2 FB nuke — blind: interval{sec:1} + fbGate:inFb + 4× flatDamage 63.36 (driver: dot 253.44 on fullBurstEnter, 10s, 1s interval, noRange — video-verified); (3) skill2 barrage — blind: 10× flatDamage 85 (driver: single flatDamage 850, core:false — user-confirmed). The blind S6 flags list independently names the Explosive-Bubble additivity question (5.05 vs 10.1) as "highest-leverage unknown in this kit" — cross-family corroboration of the driver measurement-gate.

```json
{
  "slug": "little-mermaid",
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "fullBurstEnd"
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "burstCdr",
          "seconds": 7.48
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
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 4,
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "teamAmmo",
        "count": 400
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "fillGauge",
          "pct": 37
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
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "targetStatus",
          "name": "Bubble",
          "durationSec": 180
        },
        {
          "kind": "buff",
          "stat": "damageTakenPct",
          "value": 5.05
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "hitCount",
        "count": 50
      },
      "target": {
        "kind": "enemy"
      },
      "requiresTargetStatus": "Bubble",
      "effects": [
        {
          "kind": "buff",
          "stat": "damageTakenPct",
          "value": 5.05
        },
        {
          "kind": "stun",
          "durationSec": 3
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "interval",
        "sec": 1
      },
      "target": {
        "kind": "enemy"
      },
      "fbGate": "inFb",
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 63.36,
          "flavor": "sequential",
          "crit": true,
          "noRange": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 63.36,
          "flavor": "sequential",
          "crit": true,
          "noRange": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 63.36,
          "flavor": "sequential",
          "crit": true,
          "noRange": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 63.36,
          "flavor": "sequential",
          "crit": true,
          "noRange": true
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "teamAmmo",
        "count": 500
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 85,
          "flavor": "sequential",
          "crit": true,
          "noRange": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 85,
          "flavor": "sequential",
          "crit": true,
          "noRange": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 85,
          "flavor": "sequential",
          "crit": true,
          "noRange": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 85,
          "flavor": "sequential",
          "crit": true,
          "noRange": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 85,
          "flavor": "sequential",
          "crit": true,
          "noRange": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 85,
          "flavor": "sequential",
          "crit": true,
          "noRange": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 85,
          "flavor": "sequential",
          "crit": true,
          "noRange": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 85,
          "flavor": "sequential",
          "crit": true,
          "noRange": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 85,
          "flavor": "sequential",
          "crit": true,
          "noRange": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 85,
          "flavor": "sequential",
          "crit": true,
          "noRange": true
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
          "stat": "attackDamagePct",
          "value": 10.13,
          "durationSec": 10
        },
        {
          "kind": "instantReload",
          "fraction": 0.3326
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
          "value": 17.28,
          "durationSec": 10
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [
      "Activates only when in Focusing status. Affects all allies. Focuses fire continuously."
    ],
    "skill2": [
      "Removes Bubble."
    ],
    "burst": []
  },
  "caveats": [
    "⚑ skill2 block 1 Bubble status durationSec=180 is a stand-in for \"continuously\" (fight length); the paired Damage Taken ▲5.05% is authored as a permanent (no-duration) boss debuff. If the engine's status window must outlast the fight, raise it.",
    "⚑ skill2 block 2 (Explosive Bubble) is modeled as an ADDITIVE SECOND Damage Taken ▲5.05% stacking on top of block 1's, because the kit says \"Removes Bubble\" only (it never says it removes the Damage Taken debuff). If the real behaviour is a REPLACEMENT (net 5.05% total, not 10.10%), this over-credits ~5% team-wide damage for the rest of the fight — measure a popup pair before/after the 50th normal attack.",
    "⚑ \"Removes Bubble\" is unmodeled: the engine has no status-removal primitive, so the Bubble window stays open after the explosive proc. Consequence: if the 50-hit trigger could re-arm (kit does not say it repeats — read as once-per-battle by the absence of \"each time\"), a same-status re-fire would be wrongly gated OPEN. Modeled as a single fire; verify whether it repeats every 50 normals.",
    "⚑ skill2 block 3 trigger \"every 1 sec only during Full Burst\" is authored as interval sec=1 + fbGate inFb — the interval's first fire is at t=1s of battle-relative ticks, NOT 1s after FB entry, and the gate merely suppresses out-of-FB ticks. That yields ~10 fires per 10s FB window but the PHASE inside the window is a convention (worst case ±1 fire per FB). Pin from popup timing.",
    "⚑ The two multi-hit lines (4× 63.36%, 10× 85%) are authored as SPLIT hits (N separate flatDamage effects) rather than one merged hit, per the sequential-attack reading of \"Attacks sequentially N times\". Split vs merge is damage-identical for a flat rider but differs for popup counting and for any per-hit core/crit roll — read popups to confirm N distinct numbers.",
    "⚑ Both damage riders are authored crit:true / noRange:true / core-absent (no \"core strike\" wording) and take Full Burst by TIMING (noFb NOT set, per the default-ON rule). \"Affects random enemy units\" is single-target on a solo boss, so no target-count division is applied.",
    "⚑ burst \"Reloads 33.26% magazine(s)\" is modeled as instantReload fraction=0.3326 (a fraction of MAX capacity) on all allies. If the game instead grants 33.26% of a magazine as a whole-magazine count (i.e. rounds up to a partial belt differently), the shot economy shifts slightly; the literal reading is a fractional refill.",
    "⚑ Both teamAmmo thresholds (400 / 500) count TOTAL ally ammo expended and re-arm each time (\"each time … reaches\"); infinite-ammo shots do not consume. Cadence of these procs is therefore a function of the whole team's fire economy, not this unit's — expect high comp sensitivity.",
    "⚑ Cadence tuple (SMG 120 ammo / 81 reloadFrames / normalAttackMultiplier 10.12) comes from the datamine and is unverified for this unit; the effective SMG rate is frame-quantized (60/ceil(60/nominal)). It gates the 50-normal-attack trigger's timing."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Little Mermaid (little-mermaid, SMG/Wind/Supporter/Burst I) is modeled as a team-wide damage/gauge support with two boss debuff layers and two multi-hit riders. S1: an FB-end team burst-CDR of 7.48s, an FB-enter team Attack Damage ▲4%/10s, and a team-ammo-400 gauge fill of 37%; the \"Focusing status\" line is unmodeled (a targeting/aim behaviour with no damage primitive — the sim has no aim state, and \"focuses fire continuously\" grants no stat). S2: a battle-start permanent Damage Taken ▲5.05% boss debuff paired with a named 'Bubble' targetStatus, a 50-normal-attack Explosive Bubble adding a second 5.05% plus a 3s stun (Bubble-gated via requiresTargetStatus), an in-FB 1s interval 4×63.36% rider, and a team-ammo-500 10×85% Bubble Barrage. Burst: team Attack Damage ▲10.13%/10s + a 33.26%-magazine reload, and a self ATK ▲17.28% of own ATK for 10s (authored casterAtkPct on a self target — the kit says \"of the skill user's ATK\", so it resolves flat, not as a self-scaling atkPct). Damage Taken ▲ is treated as a boss debuff benefiting the whole team, never a self buff; the stun and the reload are kept as real weapon-state/economy effects, not skipped as defensive."
}
```


================================================================================
SECTION 7 — DRIVER IMPLEMENTATION (scripts/tests/units/little-mermaid.test.ts + src/skills/overrides/little-mermaid.json)
================================================================================
S2d: all 22 driver tests GREEN vs shipped (scripts/kit-autonomy/reviews/little-mermaid.verify.txt). No engine change (S4): every primitive exists.

## driver test (scripts/tests/units/little-mermaid.test.ts)
```typescript
// PER-UNIT KIT SPEC — `little-mermaid` (Little Mermaid, Supporter/SMG/Wind, Burst I, cd 20s,
// ammo 120, SMG 1440 rpm). Kit-autonomy gauntlet 2026-07-26, S2a test-first spec.
//
// One assertion group per KIT LINE (M2..M10 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.little-mermaid.skills):
//   S1 ■ only in Focusing status → all allies: focuses fire continuously                    [M1]
//      ■ when Full Burst ENDS → all allies: Cooldown of Burst Skill ▼ 7.48 sec              [M2]
//      ■ when entering Full Burst → all allies: Attack Damage ▲ 4% for 10 sec               [M3]
//      ■ each time TOTAL ALLY ammo expended reaches 400 → all allies: Fills Burst Gauge 37% [M4]
//   S2 ■ when the enemy appears → the target: Bubble: Damage Taken ▲ 5.05% continuously     [M5]
//      ■ after landing 50 normals → target in Bubble: Explosive Bubble: Damage Taken ▲ 5.05%
//        continuously, stuns 3 sec, REMOVES Bubble                                          [M6]
//      ■ every 1 sec only during Full Burst → random enemies: 63.36% of final ATK,
//        attacks sequentially 4 times                                                       [M7]
//      ■ each time TOTAL ALLY ammo expended reaches 500 → random enemies: Bubble Barrage:
//        85% of final ATK, attacks sequentially 10 times                                    [M8]
//   BU ■ all allies: Attack damage ▲ 10.13% for 10 sec; Reloads 33.26% magazine(s)          [M9]
//      ■ self: ATK ▲ 17.28% of the skill user's ATK for 10 sec                              [M10]
//
// Dispositions:
//   M1 UNMODELED-INERT — no assertion. "Focusing status / focuses fire" is targeting flavor:
//      the sim's scope-lock already focus-fires every unit onto the single boss, and the line
//      carries no numeric effect. Documented verbatim in the override's `unmodeled.skill1`.
//   M6 UNMODELED-MEASUREMENT-GATED — no assertion (kit-status F1). The kit-literal reading is a
//      RELOCATION: Explosive Bubble removes Bubble and re-applies the SAME 5.05% debuff, so the
//      boss carries exactly one 5.05% stack in steady state (what M5 pins). The stun is inert —
//      the engine models no boss actions. ⚑ F1 coexistence hypothesis: if in-game the Bubble
//      debuff icon persists beside Explosive Bubble, steady state is 10.1% (M5's counterfactual
//      below quantifies exactly that misread). Estimate: 5.05% (shipped, kit-literal relocation)
//      vs 10.1% (coexistence). Recipe: in-game debuff-icon / popup-delta read on a boss ~5s into
//      the fight (she lands 50 normals in ~2s at 1440 rpm). Tier: MEASUREMENT-GATED.
//   M2/M4/M9-reload emit NO event (burstCdr lowers burstCdFrames directly; fillGauge bumps the
//      gauge; instantReload tops up ammo) — observed through cadence/ammo, as in volume.test V2.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   M2  burstCdr 7.48 on FB-END accelerates the whole rotation: 12 LM casts / 12 FBs with it vs
//       9/9 without. A burstCast-keyed or absent CDR provably loses that cadence.
//   M3  the buff must land on the FB-ENTER frame (fullBurstStart), not her burstCast frame (the
//       cast lands ~1.4s BEFORE the window opens) — frame-exact against the fbStart events.
//   M4  structural pin of the teamAmmo(400)→fillGauge(37) encoding (the pre-Q6 hitCount-400
//       proxy underfilled 5–8× in MG comps) + a behavioural total-difference check.
//   M5  mult.taken is uniformly 1.0505 fight-wide — the F1 coexistence counterfactual (10.1)
//       would make it 1.101, so the single-stack pin is the one that model provably fails.
//   M7  10 ticks per full FB window, 9 of them FB-boosted (the +10s boundary tick lands exactly
//       at window end and loses the major by the engine's 'timing' FBRULE); a burstCast-keyed
//       DoT shifts the ticks early (<10 per window), and a missing ×4 shows 63.36, not 253.44.
//       All four sub-hits landing on the single boss is video-verified (control/lm.MP4, 2026-07-15).
//   M8  850 = 85×10 PER HIT (user-confirmed), on TEAM ammo (18 barrages here) — the pre-Q6
//       hitCount-500 proxy fires only ~6× (her own 3115 shots / 500). core:false user-confirmed.
//   M9  the 33.26% magazine refill is observable only as fewer magazine reloads / more shots.
//   M10 casterAtkPct ("17.28% of the skill USER'S ATK") resolves to a flat ATK grant at cast —
//       the buffApply carries the resolved magnitude, self-scoped; the nearest wrong (a generic
//       team attackDamagePct 17.28) is pinned absent.
//
// Fixture: little-mermaid B1 (slot 0) / crown B2 / ada B3 (focus) / helm B3, boss Iron (Wind's
// advantage element), 180s. LM is the SOLE Burst I, so she casts every Full Burst cycle and her
// FB-gated lines are never vacuous. Deterministic (no seed).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
const FIGHT_FRAMES = 180 * FPS;
/** Fixture slot order: little-mermaid 0 / crown 1 / ada 2 / helm 3. */
const LM = 0;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;
type Reload = Extract<SimEvent, { kind: 'reload' }>;
type FbStart = Extract<SimEvent, { kind: 'fullBurstStart' }>;

/** The fixture: the control core (crown B2 / ada B3 / helm B3) with liter's B1 slot replaced
 *  by little-mermaid, on Wind's advantage boss. */
const lmComp = {
  ...controlComp('ada'),
  slugs: ['little-mermaid', 'crown', 'ada', 'helm'],
  bossElement: 'Iron' as const,
};

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...lmComp,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const lmCasts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast =>
      e.kind === 'burstCast' && e.slug === 'little-mermaid',
  );
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e): e is FbStart => e.kind === 'fullBurstStart');
const lmShots = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is Shot => e.kind === 'shot' && e.slug === 'little-mermaid',
  );
const lmReloads = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is Reload => e.kind === 'reload' && e.slug === 'little-mermaid',
  );
/** LM's skill2 damage instances at a given kit magnitude. */
const lmS2 = (evs: SimEvent[], atkPct: number) =>
  dmg(evs).filter(
    (d) =>
      d.slug === 'little-mermaid' &&
      d.srcSlot === 'skill2' &&
      d.atkPct === atkPct,
  );
/** LM-caster buff applications of a stat (optionally at an exact value). */
const lmBuffs = (evs: SimEvent[], stat: string, value?: number) =>
  buffs(evs).filter(
    (b) =>
      b.casterIdx === LM &&
      b.stat === stat &&
      (value === undefined || b.value === value),
  );

// ---- counterfactual patches (nearest wrong model per line) ------------------------------------
/** M2 nearest-wrong (absent): the FB-end burstCdr block removed entirely. */
const cfNoCdr = withPatchedOverride('little-mermaid', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'burstCdr'),
  );
  if (ov.skill1.length === before)
    throw new Error('LM S1 burstCdr block missing — fixture is stale');
});
/** M3 nearest-wrong (trigger): the 4% team buff re-keyed fullBurstEnter → burstCast (lands ~1.4s
 *  before the window actually opens). */
const cfAtk4BurstCast = withPatchedOverride('little-mermaid', (ov) => {
  const b = ov.skill1.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'attackDamagePct' && e.value === 4),
  );
  if (!b)
    throw new Error('LM S1 attackDamagePct 4 block missing — fixture is stale');
  b.trigger = { kind: 'burstCast' };
});
/** M4 nearest-wrong (absent): the teamAmmo-400 gauge fill removed. */
const cfNoFill = withPatchedOverride('little-mermaid', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'fillGauge'),
  );
  if (ov.skill1.length === before)
    throw new Error('LM S1 fillGauge block missing — fixture is stale');
});
/** M5 nearest-wrong (F1 coexistence): Bubble + Explosive Bubble both persist → 10.1% taken. */
const cfStack10 = withPatchedOverride('little-mermaid', (ov) => {
  const e = ov.skill2
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'damageTakenPct');
  if (!e)
    throw new Error('LM S2 damageTakenPct effect missing — fixture is stale');
  e.value = 10.1;
});
/** M7 nearest-wrong (trigger): the DoT re-keyed fullBurstEnter → burstCast. The cast lands
 *  ~1.3s BEFORE the FB window opens, so the 10 ticks shift early and only ~8 land inside the
 *  window. (The pre-2026-07-15 noFb relic is no longer a counterfactual at all: the engine's
 *  default 'timing' FBRULE, 2026-07-23, grants FB by landing time regardless of any per-kit
 *  noFb flag — the video-verified FB-boost is pinned by the fbMajor counts in the PIN above.) */
const cfDotBurstCast = withPatchedOverride('little-mermaid', (ov) => {
  const b = ov.skill2.find((x: any) =>
    x.effects.some((e: any) => e.kind === 'dot'),
  );
  if (!b) throw new Error('LM S2 dot block missing — fixture is stale');
  b.trigger = { kind: 'burstCast' };
});
/** M7 nearest-wrong (magnitude): the ×4 sequential attacks dropped → 63.36%/s, not 253.44%/s. */
const cfDot63 = withPatchedOverride('little-mermaid', (ov) => {
  const e = ov.skill2
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'dot');
  if (!e) throw new Error('LM S2 dot effect missing — fixture is stale');
  e.atkPct = 63.36;
});
/** M8 nearest-wrong (trigger): the pre-Q6 hitCount-500 proxy (her OWN hits) for the team-ammo
 *  trigger — undercounts ~3× (3115 own shots vs ~9000 team ammo over 180s). */
const cfBarrageHitCount = withPatchedOverride('little-mermaid', (ov) => {
  const b = ov.skill2.find((x: any) =>
    x.effects.some((e: any) => e.kind === 'flatDamage'),
  );
  if (!b) throw new Error('LM S2 flatDamage block missing — fixture is stale');
  b.trigger = { kind: 'hitCount', count: 500 };
});
/** M8 nearest-wrong (core): Barrage made core-eligible (user-confirmed core:false). */
const cfBarrageCore = withPatchedOverride('little-mermaid', (ov) => {
  const e = ov.skill2
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'flatDamage');
  if (!e) throw new Error('LM S2 flatDamage effect missing — fixture is stale');
  e.core = true;
});
/** M9 nearest-wrong (reload absent): the 33.26% magazine refill removed from the burst. */
const cfNoReload = withPatchedOverride('little-mermaid', (ov) => {
  let hit = 0;
  for (const b of ov.burst) {
    const before = b.effects.length;
    b.effects = b.effects.filter((e: any) => e.kind !== 'instantReload');
    if (b.effects.length !== before) hit++;
  }
  if (!hit)
    throw new Error('LM burst instantReload effect missing — fixture is stale');
});
/** M10 nearest-wrong (stat/scope): "ATK ▲ 17.28% of the skill user's ATK" misread as a generic
 *  team attackDamagePct 17.28. */
const cfCasterTeam = withPatchedOverride('little-mermaid', (ov) => {
  const b = ov.burst.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'casterAtkPct'),
  );
  if (!b)
    throw new Error('LM burst casterAtkPct block missing — fixture is stale');
  b.target = { kind: 'allies' };
  b.effects.find((e: any) => e.stat === 'casterAtkPct').stat =
    'attackDamagePct';
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noCdr = run({ 'little-mermaid': cfNoCdr });
const atk4BurstCast = run({ 'little-mermaid': cfAtk4BurstCast });
const noFill = run({ 'little-mermaid': cfNoFill });
const stack10 = run({ 'little-mermaid': cfStack10 });
const dotBurstCast = run({ 'little-mermaid': cfDotBurstCast });
const dot63 = run({ 'little-mermaid': cfDot63 });
const barrageHitCount = run({ 'little-mermaid': cfBarrageHitCount });
const barrageCore = run({ 'little-mermaid': cfBarrageCore });
const noReload = run({ 'little-mermaid': cfNoReload });
const casterTeam = run({ 'little-mermaid': cfCasterTeam });

const casts = lmCasts(base.events).length;
const fbs = fbStarts(base.events).length;

describe('little-mermaid — kit spec', () => {
  describe('fixture sanity — LM casts every cycle and the team reaches Full Burst', () => {
    it('LM casts >0 bursts as sole B1, and the team completes >0 Full Bursts', () => {
      expect(casts).toBeGreaterThan(0);
      expect(fbs).toBeGreaterThan(0);
      // sole-B1 comp: she casts every cycle
      expect(casts).toBe(fbs);
    });
  });

  describe('M2 — S1 FB-END team Burst Skill cooldown ▼ 7.48 sec (burstCdr, all allies)', () => {
    it('is encoded fullBurstEnd → allies → burstCdr 7.48 (structural pin)', () => {
      // structural read straight off the shipped override, via a no-op patch clone
      const shipped = withPatchedOverride('little-mermaid', () => {});
      const blk = (shipped as any).skill1.find((x: any) =>
        x.effects.some((e: any) => e.kind === 'burstCdr'),
      );
      expect(blk.trigger).toEqual({ kind: 'fullBurstEnd' });
      expect(blk.target).toEqual({ kind: 'allies' });
      expect(blk.effects.find((e: any) => e.kind === 'burstCdr').seconds).toBe(
        7.48,
      );
    });
    it('FIRE-RATE: removing it slows BOTH her cast cadence and the team Full-Burst cadence', () => {
      // burstCdr emits no event; observe the cadence (volume.test V2 precedent).
      expect(lmCasts(base.events).length).toBeGreaterThan(
        lmCasts(noCdr.events).length,
      );
      expect(fbStarts(base.events).length).toBeGreaterThan(
        fbStarts(noCdr.events).length,
      );
    });
  });

  describe('M3 — S1 FB-ENTER team Attack Damage ▲ 4% for 10 sec', () => {
    const applied = lmBuffs(base.events, 'attackDamagePct', 4);
    it('lands on the Full-Burst-ENTER frame exactly, not on her (earlier) burstCast frame', () => {
      expect(applied.length).toBeGreaterThan(0);
      const buffFrames = [...new Set(applied.map((b) => b.frame))].sort(
        (a, b) => a - b,
      );
      const fbFrames = fbStarts(base.events)
        .map((f) => f.frame)
        .sort((a, b) => a - b);
      expect(buffFrames).toEqual(fbFrames);
      // DISCRIMINATING: the burstCast-keyed counterfactual lands on the cast frames instead
      const cfFrames = [
        ...new Set(
          lmBuffs(atk4BurstCast.events, 'attackDamagePct', 4).map(
            (b) => b.frame,
          ),
        ),
      ];
      expect(cfFrames).not.toEqual(fbFrames);
    });
    it('reaches all four allies for exactly 10 sec', () => {
      const perFrame = new Map<number, Set<number | null>>();
      for (const b of applied)
        (
          perFrame.get(b.frame) ??
          perFrame.set(b.frame, new Set()).get(b.frame)!
        ).add(b.targetIdx);
      for (const [frame, holders] of perFrame)
        expect(
          holders.size,
          `frame ${frame} reached ${holders.size} allies, expected 4`,
        ).toBe(4);
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });
  });

  describe('M4 — S1 team-ammo-400 → Fills Burst Gauge by 37% (all allies)', () => {
    it('is encoded teamAmmo(400) → fillGauge(37) → allies (the pre-Q6 hitCount proxy is wrong)', () => {
      const shipped = withPatchedOverride('little-mermaid', () => {});
      const blk = (shipped as any).skill1.find((x: any) =>
        x.effects.some((e: any) => e.kind === 'fillGauge'),
      );
      expect(blk.trigger).toEqual({ kind: 'teamAmmo', count: 400 });
      expect(blk.target).toEqual({ kind: 'allies' });
      expect(blk.effects.find((e: any) => e.kind === 'fillGauge').pct).toBe(37);
    });
    it('BEHAVIOURAL: the gauge fill is live — removing it lowers her 180s total (deterministic)', () => {
      // fillGauge emits no event; faster gauge → earlier casts → more buff/DoT uptime.
      expect(base.totals['little-mermaid']).toBeGreaterThan(
        noFill.totals['little-mermaid'],
      );
    });
  });

  describe('M5 — S2 Bubble: a SINGLE permanent Damage Taken ▲ 5.05% on the boss', () => {
    it('applies exactly one boss debuff: 5.05, no holder, no expiry', () => {
      const debuffs = buffs(base.events).filter(
        (b) => b.stat === 'damageTakenPct',
      );
      expect(debuffs.length).toBe(1);
      expect(debuffs[0].value).toBe(5.05);
      expect(debuffs[0].targetIdx).toBeNull(); // the boss
      expect(debuffs[0].expiresFrame).toBeNull(); // "continuously"
    });
    it('lifts mult.taken to exactly 1.0505 on EVERY damage instance fight-wide', () => {
      const taken = [
        ...new Set(dmg(base.events).map((d) => d.mult.taken.toFixed(4))),
      ].sort();
      expect(taken).toEqual(['1.0505']);
    });
    it('DISCRIMINATING (F1 coexistence): a 10.1% encoding would make taken 1.101, not 1.0505', () => {
      const taken = [
        ...new Set(dmg(stack10.events).map((d) => d.mult.taken.toFixed(4))),
      ].sort();
      expect(taken).toEqual(['1.1010']);
    });
  });

  describe('M7 — S2 Full-Burst DoT: 63.36% × 4 = 253.44%/sec for the 10s window, every 1s', () => {
    const dots = lmS2(base.events, 253.44);
    it('ticks at the kit magnitude, crit-eligible, never cores, never ranged', () => {
      expect(dots.length).toBeGreaterThan(0);
      expect(dots.every((d) => d.critEligible)).toBe(true);
      expect(dots.every((d) => !d.coreEligible)).toBe(true);
      expect(dots.every((d) => !d.rangeApplied)).toBe(true);
      expect([...new Set(dots.map((d) => d.bucket))]).toEqual(['skill']);
    });
    it('lands exactly 10 ticks per full window, 9 FB-boosted (the +10s boundary tick loses the major by timing)', () => {
      const complete = fbStarts(base.events).filter(
        (f) => f.endFrame <= FIGHT_FRAMES,
      );
      expect(complete.length).toBeGreaterThan(0);
      for (const fb of complete) {
        const inWin = dots.filter(
          (d) => d.frame > fb.frame && d.frame <= fb.endFrame + 2,
        );
        expect(inWin.length, `window @${fb.sec.toFixed(1)}s tick count`).toBe(
          10,
        );
        expect(
          inWin.filter((d) => d.fbMajorApplied).length,
          `window @${fb.sec.toFixed(1)}s FB-boosted ticks`,
        ).toBe(9);
        // nothing leaks past the 10s window
        expect(
          dots.filter(
            (d) => d.frame > fb.endFrame + 2 && d.frame <= fb.endFrame + 62,
          ).length,
        ).toBe(0);
      }
    });
    it('DISCRIMINATING (trigger): keyed to burstCast, the ticks shift early and windows hold <10', () => {
      const cf = lmS2(dotBurstCast.events, 253.44);
      expect(cf.length).toBeGreaterThan(0);
      const complete = fbStarts(dotBurstCast.events).filter(
        (f) => f.endFrame <= FIGHT_FRAMES,
      );
      const inWinTotal = complete.reduce(
        (n, fb) =>
          n +
          cf.filter((d) => d.frame > fb.frame && d.frame <= fb.endFrame + 2)
            .length,
        0,
      );
      // the cast precedes the window, so every full window loses its early ticks
      expect(inWinTotal).toBeLessThan(10 * complete.length);
    });
    it('DISCRIMINATING (missing ×4): a 63.36 encoding produces no 253.44 instances', () => {
      expect(lmS2(dot63.events, 253.44).length).toBe(0);
      expect(lmS2(dot63.events, 63.36).length).toBeGreaterThan(0);
    });
  });

  describe('M8 — S2 Bubble Barrage: 85% × 10 = 850% per team-ammo-500 crossing, core:false', () => {
    const barrages = lmS2(base.events, 850);
    it('lands at the kit magnitude, crit-eligible, NOT core-eligible, in the skill bucket', () => {
      expect(barrages.length).toBeGreaterThan(0);
      expect(barrages.every((d) => d.critEligible)).toBe(true);
      expect(barrages.every((d) => !d.coreEligible)).toBe(true);
      expect([...new Set(barrages.map((d) => d.bucket))]).toEqual(['skill']);
    });
    it('takes the FB major exactly when it lands inside a Full Burst window (FB is a timing gate)', () => {
      const windows = fbStarts(base.events);
      for (const d of barrages) {
        const inWindow = windows.some(
          (f) => d.frame >= f.frame && d.frame < f.endFrame,
        );
        expect(d.fbMajorApplied, `barrage @${d.sec.toFixed(1)}s`).toBe(
          inWindow,
        );
      }
    });
    it('DISCRIMINATING (trigger): team ammo fires it strictly more often than her OWN hits would', () => {
      // pre-Q6 hitCount-500 proxy: ~3115 own shots / 500 ≈ 6 firings vs ~9000 team ammo / 500 = 18.
      expect(barrages.length).toBeGreaterThan(
        lmS2(barrageHitCount.events, 850).length,
      );
    });
    it('DISCRIMINATING (core): a core:true encoding flips coreEligible on', () => {
      const cf = lmS2(barrageCore.events, 850);
      expect(cf.length).toBeGreaterThan(0);
      expect(cf.every((d) => d.coreEligible)).toBe(true);
    });
  });

  describe('M9 — burst: team Attack Damage ▲ 10.13% for 10s + reloads 33.26% of every ally magazine', () => {
    const applied = lmBuffs(base.events, 'attackDamagePct', 10.13);
    it('reaches all four allies, once per cast, for exactly 10 sec', () => {
      expect(applied.length).toBe(casts * 4);
      const perFrame = new Map<number, Set<number | null>>();
      for (const b of applied)
        (
          perFrame.get(b.frame) ??
          perFrame.set(b.frame, new Set()).get(b.frame)!
        ).add(b.targetIdx);
      expect(perFrame.size).toBe(casts);
      for (const [frame, holders] of perFrame)
        expect(
          holders.size,
          `frame ${frame} reached ${holders.size} allies, expected 4`,
        ).toBe(4);
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });
    it('the 33.26% refill is live: removing it costs her magazine reloads and shots', () => {
      // instantReload emits no event; observe the ammo economy (25 reloads / 3115 shots with it
      // vs 28 / 3048 without — deterministic).
      expect(lmReloads(base.events).length).toBeLessThan(
        lmReloads(noReload.events).length,
      );
      expect(lmShots(base.events).length).toBeGreaterThan(
        lmShots(noReload.events).length,
      );
    });
  });

  describe("M10 — burst: ATK ▲ 17.28% of the skill USER'S ATK, self-scoped, 10 sec (casterAtkPct)", () => {
    const applied = lmBuffs(base.events, 'casterAtkPct');
    it('applies once per cast, to HER alone, for exactly 10 sec', () => {
      expect(applied.length).toBe(casts);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([LM]);
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });
    it('DISCRIMINATING (misread): no generic team attackDamagePct 17.28 exists in the shipped model', () => {
      expect(lmBuffs(base.events, 'attackDamagePct', 17.28).length).toBe(0);
      // ...but the misread counterfactual produces exactly that
      expect(
        lmBuffs(casterTeam.events, 'attackDamagePct', 17.28).length,
      ).toBeGreaterThan(0);
    });
  });
});

```

## driver override (src/skills/overrides/little-mermaid.json)
```json
{
  "note": "Burst-I Wind supporter. skill1 overridden to recover the parser-dropped gauge fill: block1 'Focusing status / focuses fire' has no numeric effect and is skipped; block2 (team burst-CDR 7.48s on Full Burst end) and block3 (team Attack Damage 4% for 10s on Full Burst enter) are re-included verbatim; block4 'Fills Burst Gauge 37% each time allies expend 400 ammo' is a TEAM-ammo trigger with no engine equivalent, modeled conservatively as this unit's own hitCount 400 (she is an SMG, 1 hit/shot, so her hits == her ammo). Real team ammo hits 400 faster than she alone does, so this UNDERFILLS -- flagged; effect is mostly burst-cadence, not her own damage. skill2 overridden (parser skipped 3 of 4 blocks on unsupported triggers): block1 Bubble applies Damage Taken 5.05% to the boss continuously -> modeled as a passive enemy debuff; block2 Explosive Bubble (after 50 normals) REMOVES Bubble and re-applies the same 5.05% (plus a 3s stun) -- it relocates the debuff, it does NOT stack to 10.1%, so it is intentionally not added again (stun skipped, boss doesn't act); block3 'every 1s during Full Burst, 63.36% x4 to random enemies' = 253.44%/s modeled as a dot on Full Burst enter, interval 1s, duration 10s (one full-burst window); block4 Bubble Barrage '85% x10 each time allies expend 500 ammo' = 850%, modeled with the same self-ammo proxy as hitCount 500 (UNDERCOUNTS team ammo -- flagged). burst omitted: the parser's team Attack Damage 10.13% + 33.26% reload and self ATK 17.28%-of-caster blocks are already faithful. Q6 UPDATE (2026-07-13): the 37% gauge fill (per 400) and Bubble Barrage 850% = 85x10 PER-HIT (user-confirmed) now fire on TEAM ammo consumed via the new teamAmmo trigger (was her own hits, a 5-8x undercount in MG comps). Barrage core:false (user-confirmed; flatDamage default). noFb RELICS REMOVED (2026-07-15, autonomous-invariant-audit): the FB DoT (253.44%/s) and the 850% barrage were carrying noFb:true -- a calibration relic (DECISIONS 2026-07-14 names these exact 6 units' noFb flags as relics; FB is a TIMING gate, so her DoT ticks + barrage landing during FB get +50%; only Modernia Paradise Lost is type-exempt). noRange KEPT (range is universally skills-never). Per-component values are VIDEO-PLAUSIBLE (docs/probe-data/control-little-mermaid.json): normals 14-68k band ~= sim ~40k/shot; DoT sub-hits 63.36%x4 ~= 156-220k each ~= sim ~668k/tick. OPEN residual (post-removal she grades ~1.16-1.36 across the N-comps, avg ~1.23 hot; was ~1.24 hot in N-comps even fudged, so this over-model PRE-DATES the noFb removal): since per-hit values check out, the excess is in COUNTS/uptime, not coefficients -- two faithful unknowns: (a) whether all 4 DoT sub-hits ('x4 to random enemies') land on a SINGLE boss or fewer, (b) her real normal-fire uptime (sim fires her continuously). The existing control read was INCONCLUSIVE on the DoT band (parse note: 'Re-read needed targeting the ~156-220k band'). DoT-band re-read DONE (2026-07-15, control/lm.MP4, FB-countdown-timed): (1) DoT ticks DO get +50% FB -- measured sub-hit 337,736 matches the FB-boosted 330,467 (2.2%), nowhere near non-FB 220,311 -> CONFIRMS the noFb removal was CORRECT; (2) all 4 sub-hits land on the single boss (253.44%/s is right, count never exceeds 4); (3) her ~22% over is NOT the DoT (FB + count confirmed) -- it lives in her SMG NORMALS, i.e. the flat SMG core-rate over-count off-optimal-range (see docs/closed/range-dependent-core-model.md; teammates Crown/Helm/SW all match ~1.0, only LM's normals overshoot). So LM's residual will be fixed by the range-dependent core model (Chisato SMG recording), NOT an LM-specific change. BONUS FINDING (separate, broader): her DoT sub-hits CRIT in-game (measured orange 450,314 = 337,736 × 1.333 FB-crit), but the sim models DoT without crit (DOT_CRIT off) -> ~7.5% DoT under-count; this is the U13 DoT-crit question (ginmy-confirmed) -> a panel/Fable decision affecting ALL DoTs, do NOT flip in isolation (it would worsen LM's normal-driven over). Do NOT re-add noFb or fudge coefficients to cool her. [materialized 2026-07-16: burst auto-filled from the offline parser (blablalink prose) — behavior-identical to the prior runtime parse; NOT hand-verified] [re-materialized 2026-07-16: burst re-frozen with the upgraded offline parser (skill-user's-ATK→casterAtkPct, used-their-Burst→burstCasters, Reload Speed stat, DEF→defPct, shield event) — still NOT hand-verified] Kit-autonomy gauntlet 2026-07-26: FAITHFUL (cross-family corroborated — fable S2b converged on all 8 modeled lines + 2 UNMODELED). Every line pinned GREEN vs shipped + RED vs nearest-wrong counterfactual in a 22-test spec (scripts/tests/units/little-mermaid.test.ts): FB-end burstCdr 7.48 (cadence 12 vs 9 casts), FB-enter attackDamagePct 4 (frame-exact on fullBurstStart), teamAmmo-400 fillGauge 37 (structural + total delta), passive single-stack damageTakenPct 5.05 (mult.taken uniformly 1.0505; the F1 10.1 counterfactual would read 1.101), FB DoT 253.44%/s = 10 ticks/window, 9 FB-boosted (the +10s boundary tick loses the major by the engine 'timing' FBRULE; the per-kit noFb flag is inert since the 2026-07-23 default rule), teamAmmo-500 flatDamage 850 core:false (18 procs vs ~6 under the pre-Q6 hitCount proxy), burst attackDamagePct 10.13 + instantReload 0.3326 (25 vs 28 magazine reloads), self casterAtkPct 17.28. ⚑ F1 Explosive-Bubble coexistence remains MEASUREMENT-GATED (see caveats). Tier 2.",
  "unmodeled": {
    "skill1": [
      "■ Activates only when in Focusing status. Affects all allies.",
      "Focuses fire continuously."
    ],
    "skill2": [
      "■ Activates after landing 50 normal attacks. Affects the target if the target is in Bubble status.",
      "Explosive Bubble: Damage Taken ▲ 5.05% continuously. Stuns for 3 sec. Removes Bubble."
    ],
    "burst": []
  },
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "fullBurstEnd"
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "burstCdr",
          "seconds": 7.48
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
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 4,
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "teamAmmo",
        "count": 400
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "fillGauge",
          "pct": 37
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
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "damageTakenPct",
          "value": 5.05
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "fullBurstEnter"
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "dot",
          "atkPct": 253.44,
          "durationSec": 10,
          "intervalSec": 1,
          "noRange": true
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "teamAmmo",
        "count": 500
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 850,
          "noRange": true
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
          "stat": "attackDamagePct",
          "value": 10.13,
          "durationSec": 10
        },
        {
          "kind": "instantReload",
          "fraction": 0.3326
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
          "value": 17.28,
          "durationSec": 10
        }
      ]
    }
  ],
  "caveats": [
    "Explosive Bubble (skill 2) is not modeled: the override carries a single permanent Damage Taken ▲ 5.05% (Bubble). If Bubble re-applies after the explosion and Explosive Bubble's debuff persists, the boss would carry BOTH stacks (10.1%) in steady state — unverified, needs an in-game debuff-icon / popup-delta measurement before any change. ⚑ MEASUREMENT-GATED (kit-status F1; independently re-derived by the blind cross-family reviewer, gauntlet 2026-07-26 — the kit-literal reading is a one-time RELOCATION: 'Removes Bubble' + the same 5.05% re-applied, so boss DT stays 5.05% and the 50-hit gate closes forever; the 3s stun is inert, no boss-action model). Estimate: 5.05% (shipped, kit-literal) vs 10.1% (coexistence). Recipe: read the boss debuff icons / popup delta ~5s into a fight (she lands the 50 normals in ~2s at 1440 rpm); if coexistence holds, add a second passive damageTakenPct 5.05 block. Tier: MEASUREMENT-GATED.",
    "The 'every 1 sec only during Full Burst' nuke is encoded as a 10-second damage-over-time started at Full Burst entry — tick count assumes the nominal 10s Full Burst window and does not track shortened or extended Full Bursts."
  ]
}

```
