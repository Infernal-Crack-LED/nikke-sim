# S7 RECONCILING-JUDGE PACKET — unit `helm` (Helm (Treasure), SR/Water/Attacker/Burst III)
# Assembled by the Qwen driver per the gauntlet S7 contract. You are the BINDING judge.
# Grade the DRIVER's artifacts against ground truth + the independent blind evidence. Return the contract JSON.

==========================================================================
## SECTION 1 — JUDGE CONTRACT + RETURN JSON SHAPE
==========================================================================
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

==========================================================================
## SECTION 2 — MECHANICS SSOT (damage formula + game mechanics)
==========================================================================
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

==========================================================================
## SECTION 3 — GROUND TRUTH: unit kit prose + base stats (data/characters.json → characters.helm)
==========================================================================
{
  "slug": "helm",
  "name": "Helm (Treasure)",
  "imageUrl": "https://sg-tools-cdn.blablalink.com/xd-83/rp-68/6b5661c6704ed53d273b2b428a4dada4.png",
  "weapon": "SR",
  "burst": "III",
  "burstCooldownSec": 40,
  "class": "Attacker",
  "element": "Water",
  "manufacturer": "Elysion",
  "normalAttackMultiplier": 69.04,
  "coreAttackMultiplier": 200,
  "ammo": 6,
  "reloadFrames": 141,
  "chargeFrames": 60,
  "chargeMultiplier": 250,
  "hitsPerShot": 1,
  "rl3": 59.73,
  "burstGaugePerShot": 2.8,
  "treasure": true,
  "nicknames": [
    "thelm"
  ],
  "skills": {
    "skill1": "■ Activates when the last bullet hits the target. Affects all allies.\nCritical Rate of normal attacks ▲ 14.64% for 5 sec.\n■ Activates when attacking with Full Charge. Affects all allies.\nRecovers 0.59% of the skill user's final Max HP.\nFills Burst Gauge by 14.31%.",
    "skill2": "■ Affects all allies.\nDamage to Interruption Parts ▲ 3.08% continuously.\n■ Activates when entering Full Burst. Affects all allies.\nAttack Damage ▲ 27.87% for 10 sec.\n■ Activates when hitting a target with Full Charge. Affects the target.\nDeals 178.98% of final ATK as additional damage.",
    "burst": "■ Affects the enemy with the highest final ATK.\nDeals 8236.8% of final ATK as Burst Skill damage.\n■ Affects all allies.\nRecovers 54.45% of attack damage as HP for 10 sec.\n■ Affects self.\nCharge Damage Multiplier ▲ 158.4% for 10 round(s)."
  },
  "role": {
    "weapon": {
      "shot_id": 1035201,
      "shot_detail": {
        "id": 1035201,
        "damage": 6904,
        "max_ammo": 6,
        "shake_id": 2,
        "ShakeType": "Fire_SR",
        "fire_type": "Instant",
        "zoom_rate": 30,
        "input_type": "UP",
        "shot_count": 1,
        "ShakeWeight": 120,
        "attack_type": "Metal",
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
        "counter_enermy": "Metal_Type",
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
      "use_burst_skill": "Step3",
      "burst_apply_delay": 1,
      "change_burst_step": "StepFull"
    },
    "skillDetails": {
      "skill1_id": 2352101,
      "skill2_id": 2352201,
      "skill1_table": "StateEffect",
      "skill2_table": "StateEffect",
      "skill1_detail": {
        "id": 2352101,
        "icon": "icn_skill_statcritical_01",
        "group_id": 23521,
        "skill_level": 1,
        "name_localkey": "Frontline Command",
        "next_level_id": 2352102,
        "level_up_cost_id": 20102,
        "description_localkey": "■ Activates when the last bullet hits the target. Affects all allies. \n<color=#00AEFF>Critical Rate of normal attack ▲ {description_value_01}% for {description_value_02} sec.</color>",
        "description_value_list": [
          {
            "description_value": [
              "8.65",
              "9.31",
              "9.98",
              "10.64",
              "11.31",
              "11.98",
              "12.64",
              "13.31",
              "13.97",
              "14.64"
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
          {},
          {},
          {},
          {}
        ],
        "info_description_localkey": "Skill 1"
      },
      "skill2_detail": {
        "id": 2352201,
        "icon": "icn_skill_atkup_01",
        "group_id": 23522,
        "skill_level": 1,
        "name_localkey": "Fire Away",
        "next_level_id": 2352202,
        "level_up_cost_id": 20202,
        "description_localkey": "■ Affects all allies.\n<color=#00AEFF><word_group=10000>Damage to Interruption Parts</word_group> ▲{description_value_01}% permanently.</color>\n■ Activates when entering Full Burst. Affects all allies.\n<color=#00AEFF>Attack damage ▲{description_value_02}% for {description_value_03} sec.</color>",
        "description_value_list": [
          {
            "description_value": [
              "1.82",
              "1.96",
              "2.1",
              "2.24",
              "2.38",
              "2.52",
              "2.66",
              "2.8",
              "2.94",
              "3.08"
            ]
          },
          {
            "description_value": [
              "7",
              "7.54",
              "8.08",
              "8.62",
              "9.15",
              "9.69",
              "10.23",
              "10.77",
              "11.31",
              "11.85"
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
          {},
          {},
          {},
          {},
          {},
          {}
        ],
        "info_description_localkey": "Skill 2"
      },
      "ulti_skill_id": 1352301,
      "ulti_skill_detail": {
        "id": 1352301,
        "icon": "icn_skill_c352_ult",
        "group_id": 13523,
        "shake_id": 1,
        "skill_type": "InstantNumber",
        "attack_type": "Water",
        "skill_level": 1,
        "counter_type": "Metal_Type",
        "duration_type": "None",
        "name_localkey": "Aegis Cannon",
        "next_level_id": 1352302,
        "prefer_target": "HighAttack",
        "resource_name": "c352_ulti",
        "duration_value": 0,
        "skill_cooltime": 4000,
        "level_up_cost_id": 20302,
        "skill_value_data": [
          {
            "skill_value": 73125,
            "skill_value_type": "Percent"
          },
          {
            "skill_value": 1,
            "skill_value_type": "Integer"
          },
          {
            "skill_value": 0,
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
        "description_localkey": "■ Affects the enemy with the highest <word_group=10025>final</word_group> ATK. \n<color=#00AEFF>Deals {description_value_01}% of <word_group=10025>final</word_group> ATK as Burst Skill damage.</color> \n■ Affects all allies. \n<color=#00AEFF>Recovers {description_value_02}% of attack damage as HP over {description_value_03} sec.</color>",
        "description_value_list": [
          {
            "description_value": [
              "731.25",
              "787.5",
              "843.75",
              "900",
              "956.25",
              "1012.5",
              "1068.75",
              "1125",
              "1181.25",
              "1237.5"
            ]
          },
          {
            "description_value": [
              "32.17",
              "34.65",
              "37.12",
              "39.6",
              "42.07",
              "44.55",
              "47.02",
              "49.5",
              "51.97",
              "54.45"
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
              "21",
              "22",
              "23",
              "24",
              "25",
              "26",
              "27",
              "28",
              "29",
              "30"
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
          135230102
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
      "grow_grade": 235202,
      "grade_core_id": 1,
      "stat_enhance_id": 5102,
      "stat_enhance_detail": {
        "id": 5102,
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
        200001
      ],
      "element_details": [
        {
          "id": 200001,
          "element": "Water",
          "group_id": 5000002,
          "element_icon": "icn_element_water",
          "weak_element_id": 400001,
          "element_desc_localekey": "Injects Code: P.S.I.D. to all fire-type enemies, dealing 10% additional damage.",
          "element_name_localekey": "Water",
          "element_code_name_localekey": "Code: P.S.I.D."
        }
      ]
    },
    "piece": {
      "piece_id": 5100352,
      "piece_detail": {
        "id": 5100352,
        "class": "Attacker",
        "order": 35200,
        "use_id": 0,
        "use_type": "None",
        "item_rare": "SSR",
        "item_type": "Piece",
        "stack_max": 9999999,
        "use_value": 0,
        "corporation": "ELYSION",
        "resource_id": 352,
        "item_sub_type": "CharacterPiece",
        "name_localkey": "Helm's Spare Body",
        "use_limit_count": false,
        "inventory_filter": [
          "etc"
        ],
        "description_localkey": "Can be used for Nikkes' Limit Breaks.\nIf a Nikke's Limit Break has reached the max level, any additional Spare Bodies for that Nikke will be converted to Body Labels."
      }
    },
    "meta": {
      "id": 235201,
      "class": "Attacker",
      "order": 10017,
      "name_code": 5066,
      "corporation": "ELYSION",
      "resource_id": 352,
      "name_localkey": "Helm",
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
    "def": 76,
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
    "resourceId": 352
  }
}
==========================================================================
## SECTION 4 — S2b CROSS-FAMILY TEST-FAITHFULNESS REVIEW (claude-fable-5) + DRIVER RECONCILIATION
==========================================================================
{
  "slug": "helm",
  "driverModel": "qwen",
  "reviewerModel": "claude-fable-5",
  "verdict": "GO (cross-family corroborated)",
  "leakDetected": null,
  "reconciliation": {
    "H1_S1_lastBullet_critRateNormal_14.64": {
      "driver": "FAITHFUL — critRateNormalPct 14.64/5s, scoped to NORMAL ATTACKS only, all allies; H1 pins shipped==noCrit on skill/burst buckets, differs on normal, AND genericCrit counterfactual moves skill/burst",
      "reviewer": "FAITHFUL — scoped critRateNormalPct (never generic critRatePct), lastBullet per-magazine, 5s wall-clock with real downtime; nearest-wrong is generic critRatePct over-crediting team skill/burst crit",
      "agreement": "CONVERGED"
    },
    "H2_S1_fullCharge_heal_0.59": {
      "driver": "FAITHFUL (event-only) — shotFired -> allies heal event every full charge (~1.5s); H2 asserts crown recovery firings >= 0.9x helm shot count (her cadence, not burst cadence)",
      "reviewer": "FAITHFUL, load-bearing — per-shot recovery event drives crown's 'when recovery takes effect' block; dropping it silently changes crown output in every helm comp",
      "agreement": "CONVERGED"
    },
    "H3_S1_fullCharge_fillGauge_14.31": {
      "driver": "FAITHFUL — carried by data/gauge-per-shot.json (helm.flatPerTrigger 1431, datamined 2-way confirmed), a per-trigger FLAT fill unscaled by focus and suppressed during FB/chain; NOT an override block; H3 asserts flatPerTrigger===1431",
      "reviewer": "FAITHFUL, load-bearing — per-shot fillGauge (not a passive burstGenPct scaler); massive rotation accelerator shifting every FB timestamp",
      "agreement": "CONVERGED (location differs: driver models it in the gauge data pipeline as a per-trigger flat term; reviewer expected an override fillGauge effect because the gauge-data location was de-contaminated — both agree it is a per-trigger fill, load-bearing through rotation, not a passive scaler)"
    },
    "H4_S2_passive_partsDamage_3.08": {
      "driver": "FAITHFUL (recognized-INERT) — partsDamagePct 3.08 passive, all allies; H4 asserts base.totals === noParts.totals byte-identical (partless boss)",
      "reviewer": "FAITHFUL, load-bearing-inert — live buffApply that moves nothing; ZERO board movement is the assertion",
      "agreement": "CONVERGED"
    },
    "H5_S2_fullBurstEnter_attackDamage_27.87": {
      "driver": "FAITHFUL — fullBurstEnter -> allies attackDamagePct 27.87/10s (TREASURE value, base 11.85); H5 pins value [27.87], 4 allies incl self, expiresFrame-frame === 600",
      "reviewer": "FAITHFUL, load-bearing — fullBurstEnter (NOT burstCast), generic Damage-Up bucket, 10s; flags dual-B3 fixture caveat: where helm is sole caster the two triggers coincide",
      "agreement": "CONVERGED on value/scope/target/duration. Reviewer's trigger-identity counterfactual (fullBurstEnter vs burstCast) is advisory: the override correctly uses fullBurstEnter; H5 pins the load-bearing TREASURE magnitude (27.87 vs 11.85) and the 4-ally/10s shape. The rounds/seconds and burstCast/FB-exempt discriminations the reviewer ranks highest are pinned at H9 and H7 respectively."
    },
    "H6_S2_fullCharge_rider_178.98": {
      "driver": "FAITHFUL — shotFired -> enemy flatDamage atkPct 178.98, crit-eligible (engine rider convention), once per pull; H6 asserts rider count == shot count, atkPct [178.98], critEligible all true",
      "reviewer": "FAITHFUL, load-bearing — per full-charge hit rider, 1:1 with shots, no core, no range, DOES take FB major by landing timing",
      "agreement": "CONVERGED (driver pins count/magnitude/crit-eligibility; reviewer's no-core/no-range/FB-by-timing notes are engine rider defaults the override inherits)"
    },
    "H7_burst_burstCast_nuke_8236.8": {
      "driver": "FAITHFUL — burstCast -> enemy flatDamage atkPct 8236.8 (TREASURE nuke, base 1237.5), burst bucket, FB-exempt; H7 asserts count == burstCast count, atkPct [8236.8], bucket [burst], fbMajorApplied none",
      "reviewer": "FAITHFUL, load-bearing — burstCast, FB-EXEMPT (lands before FB window), highest-ATK selector collapses to boss; nearest-wrong is the +50% FB major",
      "agreement": "CONVERGED"
    },
    "H8_burst_burstCast_lifesteal_54.45_window": {
      "driver": "FAITHFUL (event-only window) — burstCast -> allies heal ticks:10 intervalSec:1, modeling the kit-literal 'for 10 sec' recovery WINDOW (no HP pool, magnitude not fabricated); H8 isolates S1+crown heals and asserts recovery keeps firing across ~10s after each cast",
      "reviewer": "GAP / unmodeled-verbatim — no schema lifesteal primitive; warns a per-hit heal stream would machine-gun crown's recovery trigger; non-load-bearing",
      "agreement": "PARTIAL — both refuse to fabricate the 54.45 magnitude and both refuse a per-hit stream. Driver models a FIXED 10-tick/1s window (not per-hit), so the reviewer's machine-gun concern does not apply; the window's only observable (on-recovery consumers refreshed across its length) is kit-literal and H8 pins it under isolation. Reviewer preferred unmodeled-verbatim; driver's event-window is a defensible, documented superset (override caveats name the tick-cadence approximation explicitly). Non-load-bearing; not a faithfulness blocker."
    },
    "H9_burst_burstCast_self_chargeMult_158.4_10rounds": {
      "driver": "FAITHFUL — burstCast -> self chargeDamageMultPct 158.4 durationShots:10 (ROUND count, no wall-clock expiry), self-scoped; H9 asserts value [158.4], durationShots [10], expiresFrame [null], targetIdx [HELM]; rounds-vs-seconds discrimination lives in engine/duration-shots.test.ts",
      "reviewer": "FAITHFUL, load-bearing — durationShots:10 NOT durationSec:10; window spans her reload (~12.4s), shots 7-10 post-reload still buffed; self-only; nearest-wrong (highest-leverage) is durationSec:10",
      "agreement": "CONVERGED (reviewer's stat-name guess 'chargeDamagePct' is a de-contamination artifact; the schema-correct key is chargeDamageMultPct, which the override + H9 use)"
    }
  },
  "testDiscrimination": {
    "H1": "shipped==noCrit on skill/burst, differs on normal; genericCrit counterfactual MOVES skill/burst (proves the scoped assertion is one the generic model fails)",
    "H2": "crown recovery firings >= 0.9x helm shot count (per-shot cadence, not burst/magazine)",
    "H3": "gauge-per-shot.json flatPerTrigger===1431 (per-trigger flat fill, datamined)",
    "H4": "base.totals byte-identical to noParts.totals (exact inertness)",
    "H5": "value pinned [27.87] (TREASURE, not base 11.85), 4 allies, 600-frame expiry",
    "H6": "rider count == shot count, atkPct [178.98], crit-eligible",
    "H7": "nuke count == burstCast count, atkPct [8236.8], burst bucket, fbMajorApplied none",
    "H8": "under S1+crown-heal isolation, recovery fires across ~10s after each cast (>=8 firings, span >=8s) — not a single instant",
    "H9": "durationShots [10], expiresFrame [null] (round-count, no timed expiry), targetIdx [HELM] (self-scoped)"
  },
  "residualFlags": [
    "H3: gauge fill modeled in data/gauge-per-shot.json (flatPerTrigger 1431), not an override block — reviewer expected an override effect (gauge-data location was de-contaminated); both agree per-trigger fill, load-bearing through rotation",
    "H5: trigger-identity counterfactual (fullBurstEnter vs burstCast) not separately asserted; advisory only — override is correct (fullBurstEnter) and the TREASURE magnitude is pinned",
    "H8: burst lifesteal is event-only (10-tick/1s window, no magnitude, no HP pool); reviewer preferred unmodeled-verbatim; driver's window is a documented approximation pinned under isolation; non-load-bearing",
    "override ⚑ (carried): the 178.98% full-charge rider trigger read as shotFired (every SR pull = full charge) — verify against a helm focus video; MEASUREMENT-GATED, does not block GO"
  ]
}

==========================================================================
## SECTION 5 — S5 BLIND TEST (claude-opus-5, written from kit prose alone) + RESULT vs DRIVER OVERRIDE
==========================================================================
DRIVER ANNOTATION — blind test run against the DRIVER override (src/skills/overrides/helm.json):
  - Out-of-box: 23 passed / 6 failed / 1 skipped (30 total).
  - The 6 failures were TWO RECON_ERROR groups (encoding-detail guesses, NOT kit-line errors):
      (a) charge stat-key: blind predicate used 'chargeDamagePct'; the schema-correct StatKey the
          driver uses is 'chargeDamageMultPct' (4 tests). The kit line (158.4% / 10 ROUNDS / self)
          was derived correctly — only the stat KEY guess differed.
      (b) gauge fill LOCATION: blind expected an override 'fillGauge' block in skill1; the driver
          carries the 14.31%-per-full-charge fill in data/gauge-per-shot.json (helm.flatPerTrigger
          1431, datamined 2-way). The kit line (14.31% per charge, load-bearing) was derived
          correctly — only the encoding LOCATION differed (2 tests).
  - NO REAL-GOTCHA: every kit-line assertion the blind test got right (scoped critRateNormalPct,
    27.87 treasure attackDamage on fullBurstEnter, 178.98 rider, 8236.8 FB-exempt nuke, inert
    partsDamage) PASSED against the driver override unchanged.
  - After adapting ONLY those two encoding-detail guesses (blind/helm.adapted.test.ts: global
    chargeDamagePct→chargeDamageMultPct; two gauge assertions repointed at gauge-per-shot.json;
    all kit-line assertions preserved): 29 passed / 1 skipped vs the driver override.

### 5a. blind test source (blind/helm.test.ts, as written by opus)
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

/**
 * helm — SR / Water / Attacker / Burst III (cd 40s, ammo 6, 141f reload, 60f charge,
 * normal mult 69.04, core 200). BLIND per-unit spec test: written from the kit prose alone.
 *
 * FIXTURE: controlComp('helm', false) → liter (B1) / crown (B2) / helm (B3), boss Fire.
 *   The fixed-B3 flag is OFF *because the harness's fixed B3 slot is helm herself* — with the
 *   carry also helm the comp would carry a duplicate slug and the per-slug totals map would
 *   collapse. liter + crown still complete the I→II→III chain, so bursts really cast
 *   (a lone Burst III unit makes ZERO Full Bursts).
 *   Premise used by the damage-event filters below: in this comp only helm carries damage
 *   blocks in the skill2 / burst slots (liter and crown are pure support kits), so
 *   srcSlot-filtered damage events are helm's.
 *
 * KIT LINES (structural digest, each ≤ ~40 chars of quoted text):
 *   s1a  last bullet hits → "Critical Rate of normal attacks ▲" 14.64% / 5s / all allies
 *   s1b  full charge     → recovers 0.59% of caster final Max HP; "Fills Burst Gauge by 14.31%"
 *   s2a  passive         → "Damage to Interruption Parts ▲" 3.08% continuously / all allies
 *   s2b  entering FB     → "Attack Damage ▲" 27.87% for 10 sec / all allies
 *   s2c  full-charge hit → 178.98% of final ATK as additional damage, on the target
 *   b1   burst           → 8236.8% of final ATK as Burst Skill damage, on the enemy
 *   b2   burst           → recovers 54.45% of attack damage as HP for 10s  (GAP — see below)
 *   b3   burst, self     → "Charge Damage Multiplier ▲" 158.4% for 10 ROUND(S)
 *
 * WHY EACH GROUP DISCRIMINATES — every counterfactual is an in-memory withPatchedOverride
 * clone (committed JSON untouched), run against the SAME deterministic fixture:
 *   s1a scope     critRateNormalPct vs unscoped critRatePct — under the wrong model NO
 *                 critRateNormalPct buffApply exists at all (event-visible, not just structural)
 *   s1a targets   allies vs self — liter/crown normal-attack damage must move
 *   s1a duration  5s vs 60s — a 5s window must leave real downtime across a 180s fight
 *   s1a trigger   lastBullet (1 per 6-round magazine) vs shotFired (1 per round) — apply count
 *   s1b gauge     14.31% per full charge is load-bearing for the Full Burst count
 *   s2a inert     parts damage must move NOTHING on the partless scope-lock boss
 *   s2b trigger   fullBurstEnter vs burstCast — helm is the sole B3 so both fire on the same
 *                 rotations; they separate by ORDER in the event stream (a burstCast-keyed apply
 *                 necessarily precedes the fullBurstStart event)
 *   s2b bucket    attackDamagePct (Damage Up) vs atkPct (ATK bucket)
 *   s2c gate      ungated per-full-charge vs fbGate 'inFb'; rider takes no +30% range bonus
 *   b1  FB exempt burst-cast damage never takes the +50% Full-Burst major
 *   b3  duration  durationShots 10 (ROUNDS — spans reloads, ≈17s here) vs durationSec 10
 *   b3  bucket    chargeDamagePct vs attackDamagePct; self-scoped (teammates byte-identical)
 */

const CRIT_PCT = 14.64;
const CRIT_SEC = 5;
const GAUGE_PCT = 14.31;
const PARTS_PCT = 3.08;
const ATKDMG_PCT = 27.87;
const ATKDMG_SEC = 10;
const RIDER_PCT = 178.98;
const NUKE_PCT = 8236.8;
const CHARGE_PCT = 158.4;
const CHARGE_ROUNDS = 10;

type Ev = SimEvent & Record<string, any>;
interface Run {
  res: any;
  events: Ev[];
}

function baseOpts(): any {
  return controlComp('helm', false) as any;
}

function exec(opts: any): Run {
  const events: Ev[] = [];
  const res = runComp({
    ...opts,
    cfg: { ...(opts.cfg ?? {}), onEvent: (ev: SimEvent) => events.push(ev as Ev) },
  } as any);
  return { res, events };
}

function patched(mutate: (ov: any) => void): Run {
  const ov = withPatchedOverride('helm', mutate as any);
  const base = baseOpts();
  return exec({ ...base, overrides: { ...(base.overrides ?? {}), helm: ov } });
}

// Lazily memoised counterfactual runs: each is one full 180s sim, executed at most once, and a
// mis-encoded block makes only its OWN test red instead of collapsing the file at import time.
const memo = new Map<string, Run>();
function once(key: string, f: () => Run): Run {
  const hit = memo.get(key);
  if (hit) return hit;
  const r = f();
  memo.set(key, r);
  return r;
}

const BASE = exec(baseOpts());
const OV: any = withPatchedOverride('helm', () => {});

const dmgOf = (slug: string, r: Run): number => totals(r.res)[slug] ?? 0;
const fbCount = (r: Run): number => r.events.filter((e) => e.kind === 'fullBurstStart').length;
const applies = (r: Run, stat: string, value?: number): Ev[] =>
  r.events.filter(
    (e) =>
      e.kind === 'buffApply' &&
      e.stat === stat &&
      (value === undefined || Math.abs(Number(e.value) - value) < 1e-6),
  );
const dmgEvents = (r: Run, slot: string): Ev[] =>
  r.events.filter((e) => e.kind === 'damage' && e.srcSlot === slot);

const slotBlocks = (ov: any, slot: string): any[] => (ov[slot] ?? []) as any[];
function findBlock(ov: any, slot: string, pred: (b: any) => boolean): any {
  const hit = slotBlocks(ov, slot).find(pred);
  if (!hit) throw new Error(`helm ${slot}: no block matching the kit line under test`);
  return hit;
}
const hasBuff =
  (stat: string, value?: number) =>
  (b: any): boolean =>
    (b.effects ?? []).some(
      (e: any) =>
        e.kind === 'buff' &&
        e.stat === stat &&
        (value === undefined || Math.abs(Number(e.value) - value) < 1e-6),
    );
const hasEffKind =
  (kind: string) =>
  (b: any): boolean =>
    (b.effects ?? []).some((e: any) => e.kind === kind);
const hasFlat =
  (atkPct: number) =>
  (b: any): boolean =>
    (b.effects ?? []).some(
      (e: any) => e.kind === 'flatDamage' && Math.abs(Number(e.atkPct) - atkPct) < 1e-6,
    );
const buffEff = (b: any, stat: string): any =>
  (b.effects as any[]).find((e) => e.kind === 'buff' && e.stat === stat);
const flatEff = (b: any, atkPct: number): any =>
  (b.effects as any[]).find(
    (e) => e.kind === 'flatDamage' && Math.abs(Number(e.atkPct) - atkPct) < 1e-6,
  );
// "Activates when attacking with Full Charge" on a charge weapon: every trigger pull IS a full
// charge, so shotFired is the faithful encoding; a chargeCounter with threshold 1 is equivalent.
const fullChargeTrigger = (t: any): boolean =>
  t?.kind === 'shotFired' ||
  (t?.kind === 'chargeCounter' &&
    (t.count === 1 || (Array.isArray(t.count) && t.count.every((c: number) => c === 1))));

describe('helm — fixture sanity', () => {
  it('bursts, and all three units deal damage (no vacuous inertness checks)', () => {
    expect(fbCount(BASE)).toBeGreaterThan(0);
    expect(unitOf(BASE.res, 'helm').totalDamage).toBeGreaterThan(0);
    expect(unitOf(BASE.res, 'helm').totalDamage).toBeCloseTo(dmgOf('helm', BASE), 3);
    expect(dmgOf('liter', BASE)).toBeGreaterThan(0);
    expect(dmgOf('crown', BASE)).toBeGreaterThan(0);
  });
});

describe('helm — override hygiene', () => {
  it('is slot-keyed, all three slots populated, no ignored/unsupported effects', () => {
    for (const slot of ['skill1', 'skill2', 'burst'] as const) {
      expect(Array.isArray(OV[slot])).toBe(true);
      expect((OV[slot] as any[]).length).toBeGreaterThan(0);
      for (const b of OV[slot] as any[]) {
        expect(b.slot).toBe(slot);
        for (const e of (b.effects ?? []) as any[]) {
          expect(['ignored', 'unsupported']).not.toContain(e.kind);
        }
      }
    }
    expect(OV.blocks).toBeUndefined();
  });
});

describe('helm — s1a: last-bullet normal-attack crit 14.64% / 5s / all allies', () => {
  it('is encoded as lastBullet → allies → critRateNormalPct, 5s, time-bounded', () => {
    const b = findBlock(OV, 'skill1', hasBuff('critRateNormalPct', CRIT_PCT));
    expect(b.trigger.kind).toBe('lastBullet');
    expect(b.target.kind).toBe('allies');
    expect(b.target.excludeSelf ?? false).toBe(false);
    const e = buffEff(b, 'critRateNormalPct');
    expect(e.durationSec).toBe(CRIT_SEC);
    expect(e.durationShots).toBeUndefined();
  });

  it('emits a NORMAL-SCOPED crit buff to all three allies, with real downtime', () => {
    // Discriminator: under the nearest-wrong unscoped model (critRatePct) this filter is EMPTY.
    const evs = applies(BASE, 'critRateNormalPct', CRIT_PCT);
    expect(evs.length).toBeGreaterThan(0);
    const perAlly = new Map<string, number>();
    for (const e of evs) {
      const k = String(e.targetSlug);
      perAlly.set(k, (perAlly.get(k) ?? 0) + 1);
    }
    expect([...perAlly.keys()].sort()).toEqual(['crown', 'helm', 'liter']);
    // Non-vacuity of the 5s window: the applies cannot tile the 180s fight.
    expect((perAlly.get('helm') ?? 0) * CRIT_SEC).toBeLessThan(180);
  });

  it('an unscoped crit model cannot LOSE damage (directional corroboration of scope)', () => {
    const wrong = once('critUnscoped', () =>
      patched((ov) => {
        buffEff(
          findBlock(ov, 'skill1', hasBuff('critRateNormalPct', CRIT_PCT)),
          'critRateNormalPct',
        ).stat = 'critRatePct';
      }),
    );
    // Unscoped crit also feeds any crit-eligible skill/burst hit; it is never smaller.
    // (The hard discrimination lives in the event-stream test above.)
    expect(dmgOf('helm', wrong)).toBeGreaterThanOrEqual(dmgOf('helm', BASE) - 1e-6);
  });

  it('is ally-wide, not self-only', () => {
    const wrong = once('critSelf', () =>
      patched((ov) => {
        findBlock(ov, 'skill1', hasBuff('critRateNormalPct', CRIT_PCT)).target = { kind: 'self' };
      }),
    );
    expect(dmgOf('liter', wrong)).toBeLessThan(dmgOf('liter', BASE));
    expect(dmgOf('crown', wrong)).toBeLessThan(dmgOf('crown', BASE));
  });

  it('the 5s duration binds (a 60s window strictly out-damages it)', () => {
    const wrong = once('critLong', () =>
      patched((ov) => {
        buffEff(
          findBlock(ov, 'skill1', hasBuff('critRateNormalPct', CRIT_PCT)),
          'critRateNormalPct',
        ).durationSec = 60;
      }),
    );
    expect(dmgOf('liter', wrong)).toBeGreaterThan(dmgOf('liter', BASE));
  });

  it('fires once per 6-round magazine (lastBullet), not once per round (shotFired)', () => {
    const wrong = once('critShotFired', () =>
      patched((ov) => {
        findBlock(ov, 'skill1', hasBuff('critRateNormalPct', CRIT_PCT)).trigger = {
          kind: 'shotFired',
        };
      }),
    );
    const b = applies(BASE, 'critRateNormalPct', CRIT_PCT).length;
    const w = applies(wrong, 'critRateNormalPct', CRIT_PCT).length;
    expect(w).toBeGreaterThan(b * 2); // a 6-round magazine ⇒ ≈6× more applications
  });
});

describe('helm — s1b: full-charge team heal + 14.31% burst-gauge fill', () => {
  it('fills the gauge 14.31% per full charge, for all allies', () => {
    const b = findBlock(OV, 'skill1', hasEffKind('fillGauge'));
    expect(fullChargeTrigger(b.trigger)).toBe(true);
    expect(b.target.kind).toBe('allies');
    const e = (b.effects as any[]).find((x) => x.kind === 'fillGauge');
    expect(Number(e.pct)).toBeCloseTo(GAUGE_PCT, 5);
  });

  it('the gauge fill is load-bearing for rotation cadence', () => {
    const wrong = once('noGauge', () =>
      patched((ov) => {
        const b = findBlock(ov, 'skill1', hasEffKind('fillGauge'));
        (b.effects as any[]).find((x) => x.kind === 'fillGauge').pct = 0;
      }),
    );
    // Directional: with liter+crown also generating, cooldowns may bind the count — removing
    // helm's contribution must never BUY full bursts.
    expect(fbCount(wrong)).toBeLessThanOrEqual(fbCount(BASE));
  });

  it('does not silently drop the 0.59%-of-caster-Max-HP recovery', () => {
    // Tandem risk (why this matters even with no HP pool): a heal feeds an ally's `recovery`
    // trigger — crown is in this very fixture.
    const encoded = slotBlocks(OV, 'skill1').some((b) =>
      ((b.effects ?? []) as any[]).some((e) => /heal|recover/i.test(String(e.kind))),
    );
    const documented = ((OV.unmodeled?.skill1 ?? []) as string[]).some((t) => /0\.59/.test(t));
    expect(encoded || documented).toBe(true);
  });
});

describe('helm — s2a: 3.08% interruption-parts damage (continuous, all allies)', () => {
  it('is a passive ally-wide partsDamagePct buff with no duration', () => {
    const b = findBlock(OV, 'skill2', hasBuff('partsDamagePct', PARTS_PCT));
    expect(b.trigger.kind).toBe('passive');
    expect(b.target.kind).toBe('allies');
    expect(buffEff(b, 'partsDamagePct').durationSec).toBeUndefined();
  });

  it('is damage-inert on the partless scope-lock boss', () => {
    const zeroed = once('partsZero', () =>
      patched((ov) => {
        buffEff(
          findBlock(ov, 'skill2', hasBuff('partsDamagePct', PARTS_PCT)),
          'partsDamagePct',
        ).value = 0;
      }),
    );
    for (const u of ['helm', 'liter', 'crown']) {
      expect(dmgOf(u, zeroed)).toBeCloseTo(dmgOf(u, BASE), 3);
    }
  });
});

describe('helm — s2b: Full-Burst-enter Attack Damage ▲27.87% for 10s (all allies)', () => {
  it('is fullBurstEnter → allies → attackDamagePct 27.87 / 10s, ungated', () => {
    const b = findBlock(OV, 'skill2', hasBuff('attackDamagePct', ATKDMG_PCT));
    expect(b.trigger.kind).toBe('fullBurstEnter');
    expect(b.target.kind).toBe('allies');
    expect(b.ownBurstGate).toBeUndefined();
    expect(buffEff(b, 'attackDamagePct').durationSec).toBe(ATKDMG_SEC);
  });

  it('applies once per Full Burst to every ally, AFTER the FB opens (not at burst cast)', () => {
    const evs = applies(BASE, 'attackDamagePct', ATKDMG_PCT);
    expect(evs.length).toBe(fbCount(BASE) * 3);
    const firstFb = BASE.events.findIndex((e) => e.kind === 'fullBurstStart');
    const firstApply = BASE.events.findIndex(
      (e) =>
        e.kind === 'buffApply' &&
        e.stat === 'attackDamagePct' &&
        Math.abs(Number(e.value) - ATKDMG_PCT) < 1e-6,
    );
    expect(firstFb).toBeGreaterThanOrEqual(0);
    // A burstCast-keyed apply would necessarily land BEFORE the FB window opened.
    expect(firstApply).toBeGreaterThan(firstFb);
  });

  it('lands in the Damage-Up bucket, not the ATK bucket', () => {
    const wrong = once('atkBucket', () =>
      patched((ov) => {
        buffEff(
          findBlock(ov, 'skill2', hasBuff('attackDamagePct', ATKDMG_PCT)),
          'attackDamagePct',
        ).stat = 'atkPct';
      }),
    );
    expect(dmgOf('helm', wrong)).not.toBeCloseTo(dmgOf('helm', BASE), 1);
  });

  it('the 10s window binds (a 40s window strictly out-damages it)', () => {
    const wrong = once('atkDmgLong', () =>
      patched((ov) => {
        buffEff(
          findBlock(ov, 'skill2', hasBuff('attackDamagePct', ATKDMG_PCT)),
          'attackDamagePct',
        ).durationSec = 40;
      }),
    );
    expect(dmgOf('helm', wrong)).toBeGreaterThan(dmgOf('helm', BASE));
  });
});

describe('helm — s2c: 178.98%-of-final-ATK full-charge rider (on the target)', () => {
  it('is a per-full-charge flatDamage on the enemy, no core gate, FB-eligible by timing', () => {
    const b = findBlock(OV, 'skill2', hasFlat(RIDER_PCT));
    expect(fullChargeTrigger(b.trigger)).toBe(true);
    expect(b.target.kind).toBe('enemy');
    expect(b.fbGate).toBeUndefined();
    expect(b.requiresCore ?? false).toBe(false);
    const e = flatEff(b, RIDER_PCT);
    expect(e.core ?? false).toBe(false); // the text does not say "core strike"
    expect(e.noFb ?? false).toBe(false); // riders take Full Burst by timing (default ON)
  });

  it('fires outside Full Burst as well as inside, and never takes the +30% range bonus', () => {
    const riders = dmgEvents(BASE, 'skill2'); // only helm carries a skill2 damage block here
    expect(riders.length).toBeGreaterThan(fbCount(BASE));
    expect(riders.every((e) => e.rangeApplied === false)).toBe(true);
    // Non-vacuity: the fixture genuinely exercises BOTH FB states for this rider.
    expect(riders.some((e) => e.inFullBurst === false)).toBe(true);
    expect(riders.some((e) => e.inFullBurst === true)).toBe(true);
  });

  it('is load-bearing and helm-local', () => {
    const zeroed = once('riderZero', () =>
      patched((ov) => {
        flatEff(findBlock(ov, 'skill2', hasFlat(RIDER_PCT)), RIDER_PCT).atkPct = 0;
      }),
    );
    expect(dmgOf('helm', zeroed)).toBeLessThan(dmgOf('helm', BASE));
    expect(dmgOf('liter', zeroed)).toBeCloseTo(dmgOf('liter', BASE), 3);
    expect(dmgOf('crown', zeroed)).toBeCloseTo(dmgOf('crown', BASE), 3);
  });

  it('is NOT Full-Burst-gated', () => {
    const wrong = once('riderFbGate', () =>
      patched((ov) => {
        findBlock(ov, 'skill2', hasFlat(RIDER_PCT)).fbGate = 'inFb';
      }),
    );
    expect(dmgOf('helm', wrong)).toBeLessThan(dmgOf('helm', BASE));
  });
});

describe('helm — burst: 8236.8%-of-final-ATK Burst Skill damage', () => {
  it('is a burstCast flatDamage on the enemy', () => {
    const b = findBlock(OV, 'burst', hasFlat(NUKE_PCT));
    expect(b.trigger.kind).toBe('burstCast');
    expect(b.target.kind).toBe('enemy');
  });

  it('lands once per rotation and never takes the +50% Full-Burst major', () => {
    const hits = dmgEvents(BASE, 'burst'); // helm is the only burst-damage carrier in this comp
    expect(hits.length).toBe(fbCount(BASE));
    expect(hits.every((e) => e.fbMajorApplied === false)).toBe(true);
  });

  it('is load-bearing and helm-local', () => {
    const zeroed = once('nukeZero', () =>
      patched((ov) => {
        flatEff(findBlock(ov, 'burst', hasFlat(NUKE_PCT)), NUKE_PCT).atkPct = 0;
      }),
    );
    expect(dmgOf('helm', zeroed)).toBeLessThan(dmgOf('helm', BASE));
    expect(dmgOf('liter', zeroed)).toBeCloseTo(dmgOf('liter', BASE), 3);
    expect(dmgOf('crown', zeroed)).toBeCloseTo(dmgOf('crown', BASE), 3);
  });
});

describe('helm — burst: Charge Damage Multiplier ▲158.4% for 10 ROUND(S) (self)', () => {
  it('is a self chargeDamagePct buff with a ROUND-count duration, not seconds', () => {
    const b = findBlock(OV, 'burst', hasBuff('chargeDamagePct', CHARGE_PCT));
    expect(b.trigger.kind).toBe('burstCast');
    expect(b.target.kind).toBe('self');
    const e = buffEff(b, 'chargeDamagePct');
    expect(e.durationShots).toBe(CHARGE_ROUNDS);
    expect(e.durationSec).toBeUndefined();
  });

  it('emits on helm only, once per burst, carrying durationShots 10', () => {
    const evs = applies(BASE, 'chargeDamagePct', CHARGE_PCT);
    expect(evs.length).toBe(fbCount(BASE));
    expect(evs.every((e) => e.targetSlug === 'helm')).toBe(true);
    expect(evs.every((e) => e.durationShots === CHARGE_ROUNDS)).toBe(true);
  });

  it('rounds ≠ seconds: a durationSec-10 model moves helm damage, and it is self-scoped', () => {
    // 10 rounds on a 6-round magazine spans a full reload (≈17s of firing) — a 10s wall-clock
    // window is a strictly different exposure.
    const wrong = once('chargeSeconds', () =>
      patched((ov) => {
        const e = buffEff(
          findBlock(ov, 'burst', hasBuff('chargeDamagePct', CHARGE_PCT)),
          'chargeDamagePct',
        );
        delete e.durationShots;
        e.durationSec = 10;
      }),
    );
    expect(dmgOf('helm', wrong)).not.toBeCloseTo(dmgOf('helm', BASE), 1);
    expect(dmgOf('liter', wrong)).toBeCloseTo(dmgOf('liter', BASE), 3);
    expect(dmgOf('crown', wrong)).toBeCloseTo(dmgOf('crown', BASE), 3);
  });

  it('sits in the charge bucket, not the generic Damage-Up bucket', () => {
    const wrong = once('chargeBucket', () =>
      patched((ov) => {
        buffEff(
          findBlock(ov, 'burst', hasBuff('chargeDamagePct', CHARGE_PCT)),
          'chargeDamagePct',
        ).stat = 'attackDamagePct';
      }),
    );
    expect(dmgOf('helm', wrong)).not.toBeCloseTo(dmgOf('helm', BASE), 1);
  });
});

describe('helm — burst: 54.45%-of-attack-damage recovery for 10s', () => {
  it('records the un-modelable lifesteal line rather than silently dropping it', () => {
    const documented = ((OV.unmodeled?.burst ?? []) as string[]).some((t) => /54\.45/.test(t));
    const encoded = slotBlocks(OV, 'burst').some((b) =>
      ((b.effects ?? []) as any[]).some((e) => /heal|lifesteal|recover/i.test(String(e.kind))),
    );
    expect(documented || encoded).toBe(true);
  });

  it.skip('GAP: damage-proportional lifesteal has no primitive (no HP pool in v1, and no lifesteal EffectDef kind); consequence to flag — an ally with a `recovery` trigger (crown, in this very fixture) is under-fed by helm in-sim', () => {
    /* unobservable payload: no heal magnitude is emitted on the event stream */
  });
});


==========================================================================
## SECTION 6 — S6 BLIND OVERRIDE (claude-opus-5) + DIFF vs DRIVER OVERRIDE
==========================================================================
DRIVER ANNOTATION — diff of blind override vs driver override (src/skills/overrides/helm.json):
  CONVERGED (all load-bearing): skill1 lastBullet→allies critRateNormalPct 14.64/5s (SCOPED, not
    generic critRatePct); skill2 passive→allies partsDamagePct 3.08 (inert); skill2 fullBurstEnter
    (NOT burstCast)→allies attackDamagePct 27.87/10s; skill2 shotFired→enemy flatDamage 178.98;
    burst burstCast→enemy flatDamage 8236.8 (FB-exempt); burst burstCast→self charge buff 158.4
    with durationShots:10 (ROUNDS, not durationSec).
  DIVERGED — 3 RECON_ERRORs (driver is schema-correct):
    (1) charge stat key: blind 'chargeDamagePct' vs driver 'chargeDamageMultPct' (the valid StatKey).
    (2) gauge fill: blind override 'fillGauge' block in skill1 vs driver data/gauge-per-shot.json
        flatPerTrigger 1431 (the real, datamined mechanism).
    (3) skill1 heal: blind '{kind:heal, maxHpPct:0.59}' (field guessed, blind flagged 'verify field
        name') vs driver event-only '{kind:heal}' (no HP pool; the engine heal effect is event-only).
  DIVERGED — 1 defensible disagreement (NON-load-bearing): burst lifesteal '54.45% of attack damage
    as HP for 10 sec'. Blind = unmodeled-verbatim (no lifesteal primitive; tandem-channel caveat).
    Driver = event-only heal window (ticks:10/intervalSec:1) modeling the kit-literal 'for 10 sec'
    recovery window — NO magnitude fabricated, NOT a per-hit stream (fixed 1s cadence, so it does
    not machine-gun Crown's recovery trigger), board-inert in practice (S1's ~1.5s full-charge heal
    already saturates Crown-style consumers), pinned by driver test H8 under isolation. NOTE: both
    blind roles (fable S2b + opus S6) independently chose unmodeled; the driver's event-window is a
    documented superset. Judge: rule whether the event-window or unmodeled-verbatim is the more
    faithful treatment for a line with no engine primitive.

### 6a. blind override (blind/helm.override.json)
{
  "slug": "helm",
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
          "kind": "buff",
          "stat": "critRateNormalPct",
          "value": 14.64,
          "durationSec": 5
        }
      ]
    },
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
          "kind": "heal",
          "maxHpPct": 0.59
        },
        {
          "kind": "fillGauge",
          "pct": 14.31
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
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "partsDamagePct",
          "value": 3.08
        }
      ]
    },
    {
      "slot": "skill2",
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
          "value": 27.87,
          "durationSec": 10
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
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 178.98,
          "crit": true
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
          "atkPct": 8236.8,
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
          "stat": "chargeDamagePct",
          "value": 158.4,
          "durationShots": 10
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [],
    "skill2": [],
    "burst": [
      "Affects all allies. Recovers 54.45% of attack damage as HP for 10 sec."
    ]
  },
  "caveats": [
    "⚑ Both full-charge-keyed blocks (skill1 heal+gauge, skill2 178.98% rider) are encoded as `shotFired`: helm is an SR with chargeFrames 60, so every modeled trigger pull is assumed to be a FULL charge. If the engine ever models partial-charge shots, or if a charge-specific trigger kind exists, these over-fire. `chargeCounter` was rejected for the skill1 block because it phase-cycles across effects[] (heal and gauge would alternate instead of both firing per charge).",
    "⚑ `heal` effect kind is NOT present in the redacted types.ts EffectDef union handed to me, but the `recovery` TriggerDef comment states 'a heal effect targets them', so the kind exists; field name `maxHpPct` copied from the `shield` effect ('% of CASTER final Max HP'), matching the kit's 'skill user's final Max HP' wording. Validator may want a different field name — verify before landing.",
    "⚑ Burst nuke noFb: NOT set. HARD RULE 9 says burst-cast damage is FB-exempt because the cast lands before the FB window opens — that is a TIMING property the engine already resolves, and per-kit noFb is measured-only (ALWAYS-⚑ #6). If the engine credits the +50% FB major to burstCast-triggered flatDamage, this over-credits and noFb:true is the fix.",
    "⚑ crit:true set on both flatDamage effects (skill2 rider, burst nuke) per the prior 'riders crit at the caster's rate'. Neither line says 'core strike damage', so no core on either.",
    "SKIPPED lifesteal (burst line 2, 54.45% of attack damage as HP for 10s): no lifesteal StatKey and no continuous-heal primitive in the schema. Beyond the lost HP, this drops a TANDEM channel — an ally with a `recovery` trigger (Crown-style 'when recovery takes effect') will not fire during helm's 10s window. If such an ally is graded with helm, this override under-credits the team.",
    "durationShots:10 on the burst charge-damage buff is the literal 'for 10 round(s)' reading. With datamined ammo 6, the window necessarily spans a reload — that is the intended round-count semantics, not a bug.",
    "partsDamagePct 3.08 is inert on the partless scope-lock boss; kept for kit completeness."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Blind second read of helm (Helm: Treasure, SR/Water/Attacker/B3) from kit prose only. Structure: S1 = team scoped-crit on last bullet + per-full-charge team heal & 14.31% gauge fill; S2 = passive parts buff, FB-enter team Attack Damage, per-full-charge 178.98% rider on the target; Burst = 8236.8% single-target nuke, a skipped 10s team lifesteal (no schema primitive), and a self Charge Damage Multiplier for 10 ROUNDS (durationShots, not seconds). Scoped `critRateNormalPct` used deliberately over generic `critRatePct` — the kit says 'Critical Rate of normal attacks'. The gauge-fill magnitude compounds per charge shot; if board burst cadence looks fast, the suspect is the shotFired cadence (datamined chargeFrames/reloadFrames), not the 14.31% figure."
}

==========================================================================
## SECTION 7 — DRIVER IMPLEMENTATION UNDER REVIEW
==========================================================================
### 7a. driver test (scripts/tests/units/helm.test.ts) — 16 pass / 1 documented skip vs shipped
// PER-UNIT KIT SPEC — `helm` (Helm (Treasure), Attacker/SR/Water, Burst III, cd 40s, ammo 6,
// chargeFrames 60). TDD transition step 3; owner-driven spec review 2026-07-23.
//
// One assertion group per KIT LINE (H1..H9 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) and to ISOLATE a line whose effect is otherwise masked
// by another of her own lines — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.helm.skills):
//   S1 ■ last bullet hits → all allies: Critical Rate OF NORMAL ATTACKS ▲14.64% for 5 sec.   [H1]
//      ■ attacking with Full Charge → all allies: recovers 0.59% of Max HP                   [H2]
//                                                  fills Burst Gauge by 14.31%               [H3]
//   S2 ■ all allies: Damage to Interruption Parts ▲3.08% continuously                        [H4]
//      ■ entering Full Burst → all allies: Attack Damage ▲27.87% for 10 sec                  [H5]
//      ■ hitting with Full Charge → the target: 178.98% of final ATK as additional damage    [H6]
//   BU ■ highest-final-ATK enemy: 8236.8% of final ATK as Burst Skill damage                 [H7]
//      ■ all allies: recovers 54.45% of attack damage as HP FOR 10 SEC                       [H8]
//      ■ self: Charge Damage Multiplier ▲158.4% FOR 10 ROUND(S)                              [H9]
//
// Why each assertion discriminates (the point of the file — a test that cannot fail under the
// nearest wrong model gates nothing):
//   H1  a GENERIC critRatePct would lift crit on every skill proc and burst nuke in the team,
//       because this buff targets ALL ALLIES. Proven three ways at once: shipped vs buff-removed
//       must be IDENTICAL on skill/burst buckets and DIFFERENT on normal, and the generic
//       counterfactual must MOVE the skill/burst buckets — i.e. the shipped assertion is one the
//       generic model provably fails.
//   H2  the heal is an event, not a number: it drives crown's "when recovery takes effect" block.
//       Asserted at HER CADENCE (once per charged pull), which a burst-only heal cannot produce.
//   H4  partsDamagePct must be exactly inert against the partless scope-lock boss — byte-identical
//       totals for every unit, not "small".
//   H5  the TREASURE value 27.87, not the untreasured base 11.85 (the 0.591-COLD regression).
//   H7  a burst CAST lands BEFORE the Full Burst window opens, so it must never take the +50%
//       major (verified fact, 2026-07-13).
//   H9  round-count, not seconds: durationShots 10 with NO wall-clock expiry, holder-scoped.
//       The rounds-beat-seconds discrimination itself lives in engine/duration-shots.test.ts.
//
// Fixture: the 720-kit-audit control comp (liter B1 / crown B2 / ada B3 / helm B3, boss Fire,
// focus ada) — helm needs a real rotation to cast her burst at all. Deterministic (no seed).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { controlComp, runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const CARRY = 'ada';
/** controlComp slot order: liter 0 / crown 1 / ada 2 / helm 3. */
const CROWN = 1;
const HELM = 3;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp(CARRY),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual / isolation patches -------------------------------------------------------
const hasStat = (b: any, stat: string) => b.effects.some((e: any) => e.stat === stat);
const hasHeal = (b: any) => b.effects.some((e: any) => e.kind === 'heal');

/** H1 reference: her S1 crit line removed entirely. */
const helmNoCrit = withPatchedOverride('helm', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'critRateNormalPct'));
  if (ov.skill1.length === before) throw new Error('helm S1 critRateNormalPct block missing — fixture is stale');
});
/** H1 counterfactual: the same line as a GENERIC (unscoped) crit-rate buff. */
const helmGenericCrit = withPatchedOverride('helm', (ov) => {
  const e = ov.skill1.flatMap((b: any) => b.effects).find((x: any) => x.stat === 'critRateNormalPct');
  if (!e) throw new Error('helm S1 critRateNormalPct effect missing — fixture is stale');
  e.stat = 'critRatePct';
});
/** H4 reference: her parts-damage line removed. */
const helmNoParts = withPatchedOverride('helm', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasStat(b, 'partsDamagePct'));
  if (ov.skill2.length === before) throw new Error('helm S2 partsDamagePct block missing — fixture is stale');
});
/** H8 isolation: her S1 full-charge heal fires every ~1.5s and SATURATES crown's recovery
 *  consumer, which would mask the burst heal's window entirely. Removing S1's heal (and crown's
 *  own hitCount heal) leaves helm's BURST heal — the shipped, unpatched line under test — as the
 *  only recovery source in the fight, so every recovery firing is attributable to it. */
const helmNoS1Heal = withPatchedOverride('helm', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasHeal(b));
  if (ov.skill1.length === before) throw new Error('helm S1 heal block missing — fixture is stale');
});
const crownNoHeal = withPatchedOverride('crown', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasHeal(b));
  if (ov.skill2.length === before) throw new Error('crown S2 heal block missing — fixture is stale');
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noCrit = run({ helm: helmNoCrit });
const genericCrit = run({ helm: helmGenericCrit });
const noParts = run({ helm: helmNoParts });
const isolated = run({ helm: helmNoS1Heal, crown: crownNoHeal });

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) => evs.filter((e): e is Damage => e.kind === 'damage');
const helmDamage = (evs: SimEvent[], srcSlot: Damage['srcSlot']) =>
  dmg(evs).filter((d) => d.slug === 'helm' && d.srcSlot === srcSlot);
const helmShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'helm');
const helmBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'helm');
const buffs = (evs: SimEvent[]) => evs.filter((e): e is BuffApply => e.kind === 'buffApply');

/** Distinct crit rates seen per unit on the given buckets — the H1 discriminator. */
function critRatesByUnit(evs: SimEvent[], buckets: Damage['bucket'][]): Record<string, string> {
  const out: Record<string, Set<string>> = {};
  for (const d of dmg(evs)) {
    if (!buckets.includes(d.bucket)) continue;
    (out[d.slug] ??= new Set()).add(d.critRate.toFixed(9));
  }
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, [...v].sort().join(',')]));
}

/** Frames at which crown's recovery-triggered team buff fired (one firing = one frame, even
 *  though the block targets all allies and so emits one buffApply per holder). */
const recoveryFrames = (evs: SimEvent[]): number[] =>
  [...new Set(
    buffs(evs)
      .filter((b) => b.casterIdx === CROWN && b.stat === 'attackDamagePct' && b.value === 20.99)
      .map((b) => b.frame),
  )].sort((a, b) => a - b);

describe('helm (Treasure) — kit spec', () => {
  describe('H1 — S1 crit rate is scoped to NORMAL ATTACKS, for every ally', () => {
    it('does NOT lift crit on any skill or burst damage, team-wide', () => {
      // Shipped must be byte-identical to buff-REMOVED on the non-normal buckets.
      expect(critRatesByUnit(base.events, ['skill', 'burst'])).toEqual(
        critRatesByUnit(noCrit.events, ['skill', 'burst']),
      );
    });

    it('DOES lift crit on normal attacks (the buff is live, not inert)', () => {
      expect(critRatesByUnit(base.events, ['normal'])).not.toEqual(
        critRatesByUnit(noCrit.events, ['normal']),
      );
    });

    it('DISCRIMINATING: an unscoped critRatePct would move the skill/burst buckets', () => {
      // Proves the first assertion is one the generic (pre-2026-07-23) model provably fails.
      expect(critRatesByUnit(genericCrit.events, ['skill', 'burst'])).not.toEqual(
        critRatesByUnit(noCrit.events, ['skill', 'burst']),
      );
    });
  });

  describe('H2 — S1 full-charge heal fires a recovery event on every charged pull', () => {
    it('drives crown\'s recovery consumer at HER shot cadence, not once per burst', () => {
      const frames = recoveryFrames(base.events).length;
      const shots = helmShots(base.events).length;
      const bursts = helmBursts(base.events).length;
      expect(
        frames,
        `${frames} recovery firings vs ${shots} helm pulls / ${bursts} bursts — a burst-only or ` +
          'magazine-only trigger would land near the burst count',
      ).toBeGreaterThanOrEqual(Math.floor(shots * 0.9));
    });
  });

  describe('H3 — S1 fills Burst Gauge by 14.31% (carried by gauge data, not an override block)', () => {
    it('is the datamined flat per-trigger term, not an override effect', () => {
      const gauge = JSON.parse(
        readFileSync(new URL('../../../data/gauge-per-shot.json', import.meta.url), 'utf8'),
      );
      expect(gauge.helm.flatPerTrigger, 'kit 14.31% → flatPerTrigger 1431').toBe(1431);
    });

    it.skip('is unscaled by camera focus and suppressed during FB/chain — step-2 gauge backfill', () => {
      // GAP: the gauge pipeline emits no event, so this is not assertable from the log today.
      // Owned by the step-2 "gauge suppression during FB/chain" row (plan doc), not by this file.
    });
  });

  describe('H4 — S2 interruption-parts damage is exactly inert vs the partless boss', () => {
    it('removing it changes NO unit\'s total by a single point', () => {
      expect(base.totals).toEqual(noParts.totals);
    });
  });

  describe('H5 — S2 grants the TREASURE Attack Damage on Full Burst entry', () => {
    const applied = buffs(base.events).filter(
      (b) => b.casterIdx === HELM && b.stat === 'attackDamagePct',
    );

    it('is 27.87% (treasure), not the untreasured base 11.85%', () => {
      expect([...new Set(applied.map((b) => b.value))]).toEqual([27.87]);
    });

    it('reaches all four allies, including herself, for 10 sec', () => {
      expect(applied.length, 'no FB-entry attackDamagePct buff was applied').toBeGreaterThan(0);
      const perFrame = new Map<number, Set<number | null>>();
      for (const b of applied) (perFrame.get(b.frame) ?? perFrame.set(b.frame, new Set()).get(b.frame)!).add(b.targetIdx);
      for (const [frame, holders] of perFrame) {
        expect(holders.size, `frame ${frame} reached ${holders.size} allies, expected 4`).toBe(4);
      }
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });
  });

  describe('H6 — S2 full-charge rider deals 178.98% of final ATK, once per charged pull', () => {
    const riders = helmDamage(base.events, 'skill2');

    it('lands exactly once per pull', () => {
      expect(riders.length).toBe(helmShots(base.events).length);
    });

    it('is the kit magnitude and is crit-eligible (engine rider convention)', () => {
      expect([...new Set(riders.map((d) => d.atkPct))]).toEqual([178.98]);
      expect(riders.every((d) => d.critEligible)).toBe(true);
    });
  });

  describe('H7 — burst nuke: 8236.8% of final ATK, cast BEFORE the Full Burst window', () => {
    const nukes = helmDamage(base.events, 'burst');

    it('fires once per burst cast at the kit magnitude, in the burst bucket', () => {
      expect(nukes.length).toBe(helmBursts(base.events).length);
      expect(nukes.length).toBeGreaterThan(0);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([8236.8]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      const took = nukes.filter((d) => d.fbMajorApplied);
      expect(took.map((d) => d.sec), 'burst-cast damage must precede the FB window').toEqual([]);
    });
  });

  describe('H8 — burst recovery is a 10-SECOND window, not a single instant', () => {
    // The kit reads "Recovers 54.45% of attack damage as HP FOR 10 SEC" — recovery keeps taking
    // effect across the window, so a recovery CONSUMER stays refreshed for its whole length. No HP
    // pool is modeled, so the window's only observable is exactly that consumer behaviour.
    // Only casts whose FULL window fits inside the 180s fight are measurable — helm's last cast
    // lands at ~179.7s and its window is truncated by the end of the fight, which is a property of
    // the fixture, not of the kit.
    const FIGHT_FRAMES = 180 * FPS;
    const casts = helmBursts(isolated.events).filter((c) => c.frame + 10 * FPS <= FIGHT_FRAMES);
    const frames = recoveryFrames(isolated.events);

    it('has bursts with a complete window to measure', () => {
      expect(casts.length, 'no helm burst has a full 10s window inside the fight').toBeGreaterThan(0);
    });

    it('keeps recovery firing across the whole 10 sec after each cast', () => {
      for (const cast of casts) {
        const inWindow = frames.filter((f) => f >= cast.frame && f <= cast.frame + 10 * FPS);
        const spanSec = inWindow.length ? (inWindow[inWindow.length - 1] - cast.frame) / FPS : 0;
        expect(
          inWindow.length,
          `burst at ${cast.sec.toFixed(2)}s produced ${inWindow.length} recovery firing(s) ` +
            `spanning ${spanSec.toFixed(1)}s — a single instant heal produces exactly 1 at 0.0s`,
        ).toBeGreaterThanOrEqual(8);
        expect(spanSec, 'the window must reach ~10s, not collapse to the cast frame').toBeGreaterThanOrEqual(8);
      }
    });
  });

  describe('H9 — burst Charge Damage Multiplier is a ROUND count, self-scoped', () => {
    const applied = buffs(base.events).filter(
      (b) => b.casterIdx === HELM && b.stat === 'chargeDamageMultPct',
    );

    it('is 158.4% for 10 rounds with NO wall-clock expiry', () => {
      expect(applied.length).toBe(helmBursts(base.events).length);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([158.4]);
      expect([...new Set(applied.map((b) => b.durationShots))]).toEqual([10]);
      expect(
        [...new Set(applied.map((b) => b.expiresFrame))],
        'a round-count buff must not also carry a timed expiry',
      ).toEqual([null]);
    });

    it('is held by helm alone (self-scoped, no ally shares the round budget)', () => {
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([HELM]);
    });
  });
});

### 7b. driver override (src/skills/overrides/helm.json) — validate-overrides: valid, dmg 398.2M (43.8%), 6 bursts
{
  "note": "TREASURE (favorite-item) KIT — reconciled 2026-07-17 after the DB sync gained helm's favorite-item prose (was previously the UNTREASURED base kit; the materializer froze that, giving the ~0.59 cold board read). Phase 1/2/3 map to skill1/skill2/burst, unlocked sequentially by item count and coexisting once unlocked, so the strongest steady state (long solo raid) has all three active — modeled as such. SKILL1 (both full-charge tiers): lastBullet -> allies critRateNormalPct 14.64/5s — Critical Rate scoped to NORMAL ATTACKS ONLY, exactly as the kit reads ('Critical Rate of normal attacks'); it never lifts crit on skill procs or burst damage, for her or for any ally. The 'Fills Burst Gauge by 14.31%' line is NOT an override block and never was: it is carried by data/gauge-per-shot.json (helm.flatPerTrigger 1431, datamined with two independent confirmations — synergy fixed_add 14.31 AND rl3 arithmetic 59.73 = 8.4 + 3x14.31), added per trigger pull in gaugePerShot() as a flat term that the focus/unfocused charge multiplier deliberately does NOT scale (it is a kit fill, not weapon generation), and suppressed during Full Burst / the burst chain by the global addGauge rule. Every full charge (shotFired, SR = one full charge per pull, liberalio precedent) -> allies heal. The 0.59% Max HP full-charge heal is MODELED as a `heal` event (event-only, no HP value) — NOT defensive-noise: it emits a recovery event to all allies every full charge (~1.5s), driving Crown's 'when recovery takes effect -> team ATK +20.99%' to near-permanent uptime (skipping it left every Crown+Helm team ~15% cold). SKILL2: partsDamagePct 3.08 (inert vs partless boss, kept); fullBurstEnter -> allies attackDamagePct **27.87**/10s (TREASURE value; base kit was 11.85); every full charge (shotFired) -> enemy flatDamage **178.98** (TREASURE 'when hitting a target with Full Charge -> deals 178.98% of final ATK as additional damage' — fires each charged shot, ~doubles her sustained charged-shot damage; crit-default per engine convention, FB by timing). BURST: burstCast -> enemy flatDamage 8236.8 (TREASURE nuke; base kit 1237.5); burstCast -> self chargeDamageMultPct 158.4 for durationShots 10, the kit's literal 'for 10 round(s)' — a ROUND count, not a timed window (multiplies BASE charge damage x2.5 -> +396 points, per the collection-item charge rule). Her magazine is 6, so the ten rounds genuinely span a reload (~6 charged shots, reload, ~4 more) and no durationSec could express it; burstCast -> allies heal models the 'Recovers 54.45% of attack damage as HP for 10 sec' as a TEN-SECOND recovery WINDOW (ticks 10 / intervalSec 1), not a single instant event: no HP pool is modeled, so the window's only observable is that on-recovery consumers stay refreshed across its whole length. In game the recovery is attack-driven lifesteal; the 1 sec tick is the engine's available approximation of 'recovery keeps taking effect for 10 sec'. Board-inert in practice — S1's full-charge heal already fires every ~1.5 sec and saturates Crown-style consumers — so the window is asserted in the unit spec on a fixture with S1's heal isolated out (scripts/tests/units/helm.test.ts, H8). CHARFIX: universal SR bolt-recovery rule (60f charge + 30f recovery) reproduces the validated 90-frame cycle (no charFixes needed). Her modeled kit INCLUDES treasure (see the treasure-phase SSOT); the untreasured build is not the shipped state. ⚑ full-charge additional-hit trigger read as shotFired (every SR pull = full charge) — verify against a helm focus video that the 178.98% popup lands once per charged shot. Kit-autonomy gauntlet 2026-07-25: cross-family S2b (claude-fable-5) review converged FAITHFUL on all 8 load-bearing lines (leakDetected null); burst lifesteal kept as event-only 10-sec recovery window (reviewer preferred unmodeled-verbatim; non-load-bearing, pinned by H8 under isolation).",
  "unmodeled": {
    "skill1": [],
    "skill2": [],
    "burst": []
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
          "kind": "buff",
          "stat": "critRateNormalPct",
          "value": 14.64,
          "durationSec": 5
        }
      ]
    },
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
          "kind": "heal"
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
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "partsDamagePct",
          "value": 3.08
        }
      ]
    },
    {
      "slot": "skill2",
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
          "value": 27.87,
          "durationSec": 10
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
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 178.98
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
          "atkPct": 8236.8
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
          "stat": "chargeDamageMultPct",
          "value": 158.4,
          "durationShots": 10
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
          "kind": "heal",
          "ticks": 10,
          "intervalSec": 1
        }
      ]
    }
  ],
  "caveats": [
    "skill2: the 178.98% full-charge additional hit is modeled on shotFired (every SR pull = one full charge); if a focus video shows it not firing every charged shot, retune the trigger",
    "burst: the 158.4% Charge Damage window is the kit's literal 10 rounds (durationShots), so it stretches across her reload — it is NOT a fixed-length timed window and will shorten if she is ever given attack-speed support",
    "burst: the 10 sec recovery window is emitted as 10 ticks at 1 sec (the engine's heal-over-time primitive). The real mechanic is attack-driven lifesteal, so the TICK CADENCE is an approximation — only the window LENGTH and the fact that on-recovery consumers stay refreshed across it are kit-literal"
  ]
}

