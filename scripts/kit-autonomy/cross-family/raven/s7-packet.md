# kit-autonomy — S7 RECONCILING JUDGE (binding go/no-go) — `raven` (Raven)

## SECTION 1 — RECONCILING-JUDGE contract + return JSON shape

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

## SECTION 2 — MECHANICS SSOT (docs/data/damage-calculation.md)

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

## SECTION 2b — MECHANICS SSOT (docs/data/game-mechanics.md)

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

## SECTION 3 — GROUND TRUTH: raven kit prose + base stats (data/characters.json → characters.raven)

```json
{
  "slug": "raven",
  "name": "Raven",
  "imageUrl": "https://sg-tools-cdn.blablalink.com/aw-64/gb-76/039511dd44f55895c077b112a402f093.png",
  "weapon": "RL",
  "burst": "III",
  "burstCooldownSec": 40,
  "class": "Attacker",
  "element": "Iron",
  "manufacturer": "Abnormal",
  "normalAttackMultiplier": 61.3,
  "coreAttackMultiplier": 200,
  "ammo": 6,
  "reloadFrames": 141,
  "chargeFrames": 60,
  "chargeMultiplier": 0,
  "hitsPerShot": 1,
  "rl3": 16.8,
  "burstGaugePerShot": 1.4,
  "treasure": false,
  "skills": {
    "skill1": "■ Activates when performing a Full Charge attack. Affects the enemy unit nearest to the crosshair.\nDeals 68.46% of final ATK as sustained damage every 1 sec, stacks up to 10 times and lasts for 5 sec.\n■ Activates when entering Full Burst. Affects self.\nATK ▲ 47.52% of the skill user's ATK for 10 sec.",
    "skill2": "■ Activates at the start of battle. Affects self.\nVital Attack: Damage to Parts ▲ 21.12% for 5 sec.\n■ Activates when entering Full Burst. Affects self.\nVital Attack: Damage to Parts ▲ 21.12% for 5 sec.\n■ Activates when an ally or self destroys an enemy's part. Affects self if self is not in A.N. Mode status.\nSingle Point Attack: Sustained damage ▲ 47.32% for 15 sec.\nRemoves Vital Attack.",
    "burst": "■ Affects all enemies (including parts).\nDeals 492.3% of final ATK as Burst Skill damage.\n■ Affects self.\nA.N. Mode:\nEffect 1: Removes Single Point Attack.\nEffect 2: Sustained damage ▲ 89.44% for 10 sec."
  },
  "skillCooldownsSec": {
    "skill1": null,
    "skill2": null,
    "burst": 40
  },
  "role": {
    "weapon": {
      "shot_id": 1085101,
      "shot_detail": {
        "id": 1085101,
        "damage": 6130,
        "max_ammo": 6,
        "shake_id": 2,
        "ShakeType": "Fire_RL",
        "fire_type": "ProjectileDirect",
        "zoom_rate": 0,
        "input_type": "UP",
        "shot_count": 1,
        "ShakeWeight": 120,
        "attack_type": "Metal",
        "camera_work": "camera_work_01",
        "charge_time": 100,
        "penetration": 0,
        "reload_time": 200,
        "shot_timing": "Concurrence",
        "spot_radius": 50,
        "weapon_type": "RL",
        "is_targeting": false,
        "muzzle_count": 1,
        "rate_of_fire": 60,
        "homing_script": "lv1",
        "name_localkey": "Rocket Launcher",
        "prefer_target": "TargetGL",
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
        "spot_radius_object": 2,
        "uptype_fire_timing": 3200,
        "burst_energy_pershot": 14000,
        "description_localkey": "■ Affects target(s).\n<color=#00AEFF>Deals {damage}% of ATK as damage.\nCharge Time: {charge_time} sec.\nFull Charge Damage: {full_charge_damage}% of damage.\nDeals {core_damage_rate}% damage when attacking core.</color>",
        "maintain_fire_stance": 83,
        "spot_explosion_range": 500,
        "use_function_id_list": [
          0
        ],
        "accuracy_change_speed": 0,
        "hurt_function_id_list": [
          0
        ],
        "spot_projectile_speed": 400,
        "accuracy_change_pershot": 0,
        "prefer_target_condition": "None",
        "rate_of_fire_reset_time": 0,
        "full_charge_burst_energy": 25000,
        "end_accuracy_circle_scale": 10,
        "auto_accuracy_change_speed": 0,
        "rate_of_fire_change_pershot": 0,
        "start_accuracy_circle_scale": 10,
        "target_burst_energy_pershot": 28000,
        "auto_accuracy_change_pershot": 0,
        "auto_end_accuracy_circle_scale": 10,
        "auto_start_accuracy_circle_scale": 10
      },
      "bonusrange_max": 0,
      "bonusrange_min": 0
    },
    "burstMeta": {
      "burst_duration": 1000,
      "use_burst_skill": "Step3",
      "burst_apply_delay": 1,
      "change_burst_step": "StepFull"
    },
    "skillDetails": {
      "skill1_id": 2851101,
      "skill2_id": 2851201,
      "skill1_table": "StateEffect",
      "skill2_table": "StateEffect",
      "skill1_detail": {
        "id": 2851101,
        "icon": "icn_skill_damage_01",
        "group_id": 28511,
        "skill_level": 1,
        "name_localkey": "Shock Wave",
        "next_level_id": 2851102,
        "level_up_cost_id": 50102,
        "description_localkey": "■ Activates when performing a Full Charge attack. Affects the enemy unit nearest to the crosshair.\n<color=#00AEFF>Deals {description_value_01}% of <word_group=10025>final</word_group> ATK as sustained damage every 1 sec, stacks up to {description_value_05} times and lasts for {description_value_02} sec.</color>\n■ Activates when entering Full Burst. Affects self.\n<color=#00AEFF>ATK ▲ {description_value_03}% of the skill user's ATK for {description_value_04} sec.</color>",
        "description_value_list": [
          {
            "description_value": [
              "40.45",
              "43.56",
              "46.67",
              "49.78",
              "52.9",
              "56.01",
              "59.12",
              "62.23",
              "65.34",
              "68.46"
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
              "28.08",
              "30.24",
              "32.4",
              "34.56",
              "36.72",
              "38.88",
              "41.04",
              "43.2",
              "45.36",
              "47.52"
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
          {},
          {},
          {},
          {},
          {}
        ],
        "info_description_localkey": "Skill 1"
      },
      "skill2_detail": {
        "id": 2851201,
        "icon": "icn_skill_atkup_01",
        "group_id": 28512,
        "skill_level": 1,
        "name_localkey": "Blue Blade",
        "next_level_id": 2851202,
        "level_up_cost_id": 50202,
        "description_localkey": "■ Activates at the start of battle. Affects self.\n<color=#00AEFF>Vital Attack: <word_group=10011>Damage to Parts</word_group> ▲ {description_value_01}% for {description_value_02} sec.</color>\n■ Activates when entering Full Burst. Affects self.\n<color=#00AEFF>Vital Attack: <word_group=10011>Damage to Parts</word_group> ▲ {description_value_01}% for {description_value_02} sec.</color>\n■ Activates when an ally or self <word_group=10052>destroys an enemy's part</word_group>. Affects self if self is not in A.N. Mode status.\n<color=#00AEFF>Single Point Attack: Sustained damage ▲ {description_value_03}% for {description_value_04} sec.\nRemoves Vital Attack.</color>",
        "description_value_list": [
          {
            "description_value": [
              "12.48",
              "13.44",
              "14.4",
              "15.36",
              "16.32",
              "17.28",
              "18.24",
              "19.2",
              "20.16",
              "21.12"
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
              "27.96",
              "30.11",
              "32.26",
              "34.41",
              "36.56",
              "38.72",
              "40.87",
              "43.02",
              "45.17",
              "47.32"
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
      "ulti_skill_id": 1851301,
      "ulti_skill_detail": {
        "id": 1851301,
        "icon": "icn_skill_c851_ult",
        "group_id": 18513,
        "shake_id": 1,
        "skill_type": "InstantAllParts",
        "attack_type": "Iron",
        "skill_level": 1,
        "counter_type": "Metal_Type",
        "duration_type": "None",
        "name_localkey": "Tempest",
        "next_level_id": 1851302,
        "prefer_target": "Random",
        "resource_name": "c851_ulti",
        "duration_value": 0,
        "skill_cooltime": 4000,
        "level_up_cost_id": 50302,
        "skill_value_data": [
          {
            "skill_value": 29090,
            "skill_value_type": "Percent"
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
        "description_localkey": "■ Affects all enemies (including parts).\n<color=#00AEFF>Deals {description_value_01}% of <word_group=10025>final</word_group> ATK as Burst Skill damage.</color>\n■ Affects self.\n<color=#00AEFF>A.N. Mode:\nEffect 1: Removes Single Point Attack.\nEffect 2: Sustained damage ▲ {description_value_02}% for {description_value_03} sec.</color>",
        "description_value_list": [
          {
            "description_value": [
              "290.9",
              "313.28",
              "335.66",
              "358.04",
              "380.41",
              "402.79",
              "425.17",
              "447.55",
              "469.92",
              "492.3"
            ]
          },
          {
            "description_value": [
              "52.85",
              "56.91",
              "60.98",
              "65.04",
              "69.11",
              "73.18",
              "77.24",
              "81.31",
              "85.37",
              "89.44"
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
        "prefer_target_condition": "IncludeNoneTargetLast",
        "info_description_localkey": "Burst Skill",
        "after_use_function_id_list": [
          185130101
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
      "grow_grade": 585102,
      "grade_core_id": 1,
      "stat_enhance_id": 5105,
      "stat_enhance_detail": {
        "id": 5105,
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
      "piece_id": 5100851,
      "piece_detail": {
        "id": 5100851,
        "class": "Attacker",
        "order": 85100,
        "use_id": 0,
        "use_type": "None",
        "item_rare": "SSR",
        "item_type": "Piece",
        "stack_max": 9999999,
        "use_value": 0,
        "corporation": "ABNORMAL",
        "resource_id": 851,
        "item_sub_type": "CharacterPiece",
        "name_localkey": "Raven's Spare Body",
        "use_limit_count": false,
        "inventory_filter": [
          "etc"
        ],
        "description_localkey": "Can be used for Nikkes' Limit Breaks.\nIf a Nikke's Limit Break has reached the max level, any additional Spare Bodies for that Nikke will be converted to Body Labels."
      }
    },
    "meta": {
      "id": 585101,
      "class": "Attacker",
      "order": 10173,
      "name_code": 5143,
      "corporation": "ABNORMAL",
      "resource_id": 851,
      "name_localkey": "Raven",
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
    "def": 88,
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
    "resourceId": 851
  }
}
```

## SECTION 4 — S2b pre-op adversarial test-faithfulness review (claude-fable-5)

```json
{
  "slug": "raven",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "Full Charge: 68.46% sustained /1s x10 5s",
      "disposition": "FAITHFUL",
      "scope": "Triggered by the unit's own Full Charge attacks only. RL base with chargeFrames 60 means every normal trigger pull is a full-charge shot, so in practice this rides every shot she fires — but it must be keyed to her shots, not to wall-clock.",
      "durationSemantics": "Each application is a 5-second DoT ticking every 1 s (5 ticks per instance). 'Stacks up to 10' = concurrent-instance cap, not a ramping stat. At her cadence (~1 shot/s charge + 6-round mag + 141f reload ≈ 0.7 shots/s average) concurrency peaks near 5, so the cap of 10 never binds at base cadence — the engine's no-dedup per-fire append is faithful WITHOUT modeling the cap. Flag if fire-rate/charge-speed buffs could push concurrency past 10.",
      "triggerIdentity": "Per full-charge shot fired by the owner (shotFired-equivalent for an always-charging RL). NOT interval — 'every 1 sec' is the tick interval inside each instance, not the trigger cadence.",
      "targetSet": "Enemy nearest crosshair — single boss, so the one enemy.",
      "nearestWrongModel": "A single refreshed/deduped DoT instance (or one passive continuous DoT), i.e. re-applying refreshes duration instead of stacking a new independent instance — under-credits ~3-4x since average live stacks ≈ 3.5. Second-nearest: misreading 'every 1 sec' as an interval trigger detached from her shots.",
      "distinguishingAssertion": "Over a window where she lands S shots (all ≥5 s before window end), count raven damage events in the dot bucket: faithful ≈ 5×S ticks (stacked instances); single-instance model gives ≈ windowSec/1 ticks. Assert dot-tick count scales with shots fired, i.e. strictly greater than windowSec ticks. Also assert flavor threads as sustained (see burst line: ticks inside the 89.44% window are larger than identical-state ticks outside it).",
      "inertness": "No dot ticks accrue while she cannot fire (reload gaps stop NEW instances but in-flight 5 s instances keep ticking).",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "FB enter: ATK ▲ 47.52% user ATK 10s",
      "disposition": "FAITHFUL",
      "scope": "Generic ATK buff, unscoped — applies to all her damage while up.",
      "durationSemantics": "10 s wall-clock (durationSec), spanning the full FB window; refreshed each FB entry.",
      "triggerIdentity": "fullBurstEnter — 'when entering Full Burst' fires on ANY team Full Burst, including rotations where a co-B3 (helm in the control comp) casts instead of raven. NOT burstCast.",
      "targetSet": "Self only.",
      "nearestWrongModel": "(a) stat misread: atkPct 47.52 (scales target's own ATK, emits raw 47.52) instead of casterAtkPct ('of the skill user's ATK' = flat add resolved at apply). (b) trigger misread: burstCast, which would skip helm-cast rotations.",
      "distinguishingAssertion": "buffApply with stat 'casterAtkPct' whose emitted value ≈ 0.4752 × raven.staticAtk (a FLAT ATK number, not 47.52), with count == fullBurstStart count (fires even on FBs raven did not cast), expiresFrame ≈ apply + 600.",
      "inertness": "No such buffApply before the first Full Burst; never applied to allies.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "battle start: Vital Attack parts ▲ 21.12% 5s",
      "disposition": "FAITHFUL",
      "scope": "Parts-damage only (partsDamagePct) — NOT generic attackDamagePct. The scope IS the inertness: the scope-lock boss is partless, so this must move zero damage.",
      "durationSemantics": "5 s wall-clock, once at battle start.",
      "triggerIdentity": "Battle-start one-shot (passive-applied at t=0 with durationSec 5).",
      "targetSet": "Self.",
      "nearestWrongModel": "Encoding 'Damage to Parts ▲' as a generic damage/attackDamage buff — over-credits the whole opening 5 s. Distant second: making it permanent.",
      "distinguishingAssertion": "buffApply stat 'partsDamagePct' value 21.12 at t=0 exists; totals(res)['raven'] is IDENTICAL with this block stripped via withPatchedOverride (parts stat inert on partless boss).",
      "inertness": "Zero damage movement on the partless boss; no ally receives it.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "FB enter: Vital Attack parts ▲ 21.12% 5s",
      "disposition": "FAITHFUL",
      "scope": "Same as the battle-start copy: partsDamagePct only, inert on a partless boss.",
      "durationSemantics": "5 s per Full Burst entry (re-applied/refreshed each FB).",
      "triggerIdentity": "fullBurstEnter (any team FB), not burstCast.",
      "targetSet": "Self.",
      "nearestWrongModel": "Generic damage-up on FB entry (over-credits every FB window by ~21%).",
      "distinguishingAssertion": "buffApply stat 'partsDamagePct' 21.12 at each fullBurstStart; board totals unchanged when the block is stripped.",
      "inertness": "Must move zero damage; must not appear as attackDamagePct.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "part destroyed → Single Point 47.32% 15s",
      "disposition": "GAP",
      "scope": "Sustained-damage buff (sustainedDamagePct, would feed her skill1 DoT flavor) gated on an ally-or-self part-destruction event, further gated on 'self NOT in A.N. Mode status'.",
      "durationSemantics": "15 s if it ever fired; 'Removes Vital Attack' rider on application.",
      "triggerIdentity": "Part-destruction event — NO such trigger exists in the engine and the v1 boss is partless, so this line is UNREACHABLE. It must not be re-keyed to anything else. The A.N.-Mode exclusion and the burst's 'Removes Single Point Attack' are the two halves of a mode-exclusivity mechanic that is entirely dormant in v1.",
      "targetSet": "Self.",
      "nearestWrongModel": "Charitably 'rescuing' the line as a passive/interval/FB-keyed sustained ▲ 47.32% because it looks load-bearing for her DoT — a ~47-percentage-point Damage-Up over-credit on every sustained tick. This is the single most damaging plausible misread in the kit.",
      "distinguishingAssertion": "Assert NO buffApply with stat 'sustainedDamagePct' value 47.32 ever occurs in a full-length run; the only sustainedDamagePct applications are the burst's 89.44.",
      "inertness": "Entire line inert; belongs verbatim in `unmodeled` (no ignored-effect blocks).",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "burst",
      "kitLine": "Deals 492.3% final ATK Burst Skill dmg",
      "disposition": "FAITHFUL",
      "scope": "One instant hit on the boss ('all enemies including parts' collapses to the single partless boss — one hit, no parts duplication). Crits at her sheet rate; NO core (text does not say core strike).",
      "durationSemantics": "Instant, once per own burst cast.",
      "triggerIdentity": "burstCast — and burst-cast instant damage is FB-EXEMPT by timing (lands before the FB window opens), so noFb applies.",
      "targetSet": "Enemy (the boss).",
      "nearestWrongModel": "(a) Omitting the FB exemption so the nuke collects the +50% Full-Burst major (×1.5 over-credit); (b) multiplying the hit by a parts count.",
      "distinguishingAssertion": "Exactly ONE burst-bucket damage event per raven burstCast, mult 492.3, with fbMajorApplied === false and no core contribution; count == number of raven burstCast events (zero on helm-cast rotations).",
      "inertness": "Does not fire on Full Bursts raven did not cast.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "A.N. Mode: Sustained dmg ▲ 89.44% 10s",
      "disposition": "FAITHFUL",
      "scope": "sustainedDamagePct — boosts ONLY her sustained-flavored damage (the skill1 DoT ticks, additive in the Damage-Up bucket), NOT a generic attackDamagePct on her weapon shots or burst nuke. Effect 1 'Removes Single Point Attack' is inert in v1 (Single Point can never be gained — see skill2 GAP line).",
      "durationSemantics": "10 s wall-clock from her own burst cast.",
      "triggerIdentity": "burstCast — a self mode granted inside her OWN burst block, NOT fullBurstEnter. This diverges exactly in the control comp: helm is a co-B3, so team Full Bursts occur on rotations raven does not burst; keying to fullBurstEnter would over-credit those windows.",
      "targetSet": "Self.",
      "nearestWrongModel": "(a) trigger: fullBurstEnter (applies the 89.44% on helm's rotations too — the canonical burstCast-vs-FB-enter over-credit); (b) stat: generic attackDamagePct/damage-up boosting her RL shots and 492.3% nuke instead of only sustained DoT ticks.",
      "distinguishingAssertion": "buffApply stat 'sustainedDamagePct' value 89.44 count == raven burstCast count and strictly < fullBurstStart count in controlComp('raven') (helm co-B3 present); and per-tick dot damage inside the 10 s window exceeds an identical-buff-state tick outside it by the diluted Damage-Up factor, while her normal-shot damage events show NO 89.44 contribution.",
      "inertness": "Her weapon-shot and burst-nuke events must not move when this buff is up (beyond the skill1-line ATK buff); no application on rotations she sat out.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:full-charge sustained DoT 68.46%/1s x10 5s",
    "skill1:FB-enter casterAtkPct 47.52% 10s",
    "skill2:battle-start Vital Attack partsDamagePct 21.12% 5s (inertness pin)",
    "skill2:FB-enter Vital Attack partsDamagePct 21.12% 5s (inertness pin)",
    "burst:492.3% burst nuke (noFb, once per own cast)",
    "burst:A.N. Mode sustainedDamagePct 89.44% 10s (burstCast-keyed)"
  ],
  "unmodeledVerbatim": {
    "skill1": [],
    "skill2": [
      "Activates when an ally or self destroys an enemy's part. Affects self if self is not in A.N. Mode status. Single Point Attack: Sustained damage ▲ 47.32% for 15 sec. Removes Vital Attack."
    ],
    "burst": [
      "A.N. Mode Effect 1: Removes Single Point Attack."
    ]
  },
  "notes": "Expected shared-prior misreads, in order of damage: (1) rescuing the unreachable part-destruction Single Point line (47.32% sustained) as some always-on/FB trigger — it must stay unmodeled on the partless boss; assert its magnitude never appears in buffApply. (2) Keying the A.N. Mode 89.44% sustained buff to fullBurstEnter instead of burstCast — controlComp includes helm as co-B3, so the two triggers measurably diverge there; the packet's own skill1/skill2 lines show this kit DOES distinguish the phrasings ('when entering Full Burst' vs a mode inside the burst block). (3) Flavor threading: both 47.32 and 89.44 are 'Sustained damage ▲', which must feed ONLY the sustained-flavored skill1 DoT ticks, not her RL shots or the 492.3% nuke — a generic damage-up encoding is the quiet over-credit. (4) skill1 DoT must be per-shot independent instances (engine no-dedup), not one refreshed instance; the 10-stack cap never binds at her base cadence (~0.7 shots/s × 5 s ≈ 3.5 concurrent) so no cap primitive is needed — ⚡ re-check if any fire-rate/charge-speed buff enters the comp. (5) The 47.52% is 'of the skill user's ATK' → casterAtkPct flat-resolved at apply (assert the emitted value is ≈ 0.4752×staticAtk, not the raw 47.52). ⚑ Cadence tuple (charge 60f, ammo 6, reloadFrames 141) is the standard ALWAYS-⚑ datamine-unreliable field — the DoT-stack concurrency argument above inherits that flag. All magnitudes are DATAMINED (kit-literal); no CALIBRATED values are needed anywhere in this kit.",
  "model": "claude-fable-5"
}

```
## SECTION 5 — S5 BLIND post-op test (claude-opus-5) + its result vs the DRIVER override

> **Driver-measured outcome of running the S5 blind test against the driver's shipped override
> (scripts/tests/units/raven.test.ts loads src/skills/overrides/raven.json from disk):
> 18 active assertions → **17 GREEN / 1 RED / 3 skipped** (the 3 skips are the blind agent's own
> intentional it.skip GAP/measurement-gated lines: the 10-stack cap, DoT crit gating, and the
> part-destroy 47.32% line).
>
> **The single RED is a BLIND-TEST-LOGIC false positive, NOT a real gotcha about the override.**
> The failing assertion ('S1b ... is SELF-scoped (no teammate receives it)') filters for
> `casterAtkPct` buffApply where `casterIdx === targetIdx && targetSlug !== 'raven'` and expects 0,
> but got 12. Driver probe confirms those 12 are ALL **crown's** self-casterAtkPct buffs (crown grants
> casterAtkPct to every ally including itself); the blind filter forgot to restrict to raven-as-caster.
> Raven's OWN casterAtkPct (casterIdx = raven's slot) targets ONLY raven — 12 applications, all
> self-scoped — which the driver test pins directly (`targetIdx === RAVEN`). So raven's R2 self-scoping
> is faithful; the blind assertion's stray-detector is simply mis-scoped to the comp. Treat this RED as
> a test-authoring bug, not an encoding defect.

```ts
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
 * raven - blind per-line kit spec, written from the kit prose ALONE (blind to the
 * committed override, to the driver's tests and to the driver's reasoning).
 *
 * KIT (RL / Iron / Attacker / Burst III; ammo 6, chargeFrames 60, reloadFrames 141,
 * normalAttackMultiplier 61.3, coreAttackMultiplier 200)
 *
 *   S1a  on a Full Charge attack -> enemy nearest the crosshair:
 *        68.46% of final ATK as sustained damage every 1 sec, stacks up to 10,
 *        lasts 5 sec.
 *        => dot { atkPct 68.46, intervalSec 1, durationSec 5, flavor sustained }
 *           on a per-full-charge-shot trigger. An RL pull IS a full charge
 *           (chargeFrames 60), so shot-keyed and charge-keyed encodings coincide
 *           here; what the spec pins is that ONE instance is appended PER SHOT and
 *           that instances OVERLAP for 5 sec (the engine never dedups DoTs), which
 *           is exactly what the kit's up-to-10-stacks wording describes.
 *
 *   S1b  on ENTERING FULL BURST -> self: ATK up 47.52% of the SKILL USER's ATK,
 *        10 sec.
 *        => casterAtkPct 47.52, durationSec 10, trigger fullBurstEnter, target self.
 *        Nearest-wrongs: (a) plain atkPct (target-scaled, emits the raw 47.52),
 *        (b) keying it to burstCast (under-fires whenever another B3 completes the
 *        chain), (c) a duration other than 10 sec.
 *
 *   S2a  at start of battle -> self: Vital Attack, Damage to Parts up 21.12%, 5 sec.
 *   S2b  on entering Full Burst -> self: the same 21.12%, 5 sec.
 *        => partsDamagePct is schema-inert in v1 (the scope-lock boss is PARTLESS).
 *        The spec claim is therefore: accounted for (encoded inert OR recorded in
 *        `unmodeled`), and NEVER laundered into a live damage stat.
 *
 *   S2c  when an ally or self DESTROYS AN ENEMY PART -> self, gated on not being in
 *        A.N. Mode: Single Point Attack, Sustained damage up 47.32%, 15 sec;
 *        removes Vital Attack.
 *        => GAP. There is no part-destruction trigger in the schema and the boss has
 *        no parts, so the line is unreachable. it.skip + an OVER-CREDIT GUARD below
 *        (it must not be smuggled in as a passive / FB-enter sustained buff, which
 *        would hand raven a permanent +47.32% on her dominant damage channel).
 *
 *   B1   all enemies (including parts): 492.3% of final ATK as Burst Skill damage.
 *        => flatDamage at burst cast. Burst-cast damage is FB-exempt (it lands
 *           before the Full Burst window opens).
 *   B2   self, A.N. Mode: Effect 1 removes Single Point Attack (moot - S2c is a GAP);
 *        Effect 2 Sustained damage up 89.44%, 10 sec.
 *        => burstCast self buff, sustainedDamagePct 89.44. This is the line that
 *           makes the S1a FLAVOR observable: zeroing it may only move damage if the
 *           DoT really is sustained-flavored.
 *
 * FIXTURE
 *   controlComp('raven', helm) - liter B1 + crown B2 supply the burst chain so the
 *   B3 carry actually casts (a lone B3 makes ZERO Full Bursts).
 *   BASE = helm=true (the standard control; helm is a second B3, so raven does NOT
 *          necessarily own every Full Burst -> this is the comp where FB-enter and
 *          burst-cast keying can diverge).
 *   SOLO = helm=false (raven is the ONLY B3 -> every Full Burst is hers, and
 *          srcSlot-filtered damage events are attributable to her: liter and crown
 *          carry no damage riders).
 *
 * DISCRIMINATION STYLE
 *   Counterfactuals mutate effect FIELDS in place (atkPct/value/durationSec -> 0 or
 *   x2) rather than deleting blocks, so shot counts, gauge generation and rotation
 *   timing stay byte-identical between control and counterfactual; only the damage
 *   attributable to the patched line moves. Every patch carries a hit counter and
 *   the test asserts the counter fired - a patch that silently matched NOTHING is a
 *   divergence in the encoding, not a passing test.
 */

const SLUG = 'raven';

// --- shape-tolerant override access ---------------------------------------
// The packet describes the override file two ways (slot -> Block[] vs slot ->
// CharacterSkills{blocks}). Both are handled so the spec tests the SEMANTICS, not
// the container.
function blocksOf(ov: any, slot: string): any[] {
  const s = ov?.[slot];
  if (!s) return [];
  return Array.isArray(s) ? s : (s.blocks ?? []);
}

function eachEffect(ov: any, fn: (e: any, b: any, slot: string) => void): void {
  for (const slot of ['skill1', 'skill2', 'burst']) {
    for (const b of blocksOf(ov, slot)) {
      for (const e of (b.effects ?? [])) fn(e, b, slot);
    }
  }
}

function patch(mutate: (ov: any) => void): any {
  return { [SLUG]: withPatchedOverride(SLUG, mutate as any) };
}

function run(overrides?: any, helm = true): { res: any; events: any[] } {
  const events: SimEvent[] = [];
  const base: any = controlComp(SLUG, helm);
  const res = runComp({
    ...base,
    ...(overrides ? { overrides } : {}),
    cfg: { ...(base.cfg ?? {}), onEvent: (ev: SimEvent) => events.push(ev) },
  } as any);
  return { res, events: events as any[] };
}

const rav = (r: { res: any }): number => totals(r.res)[SLUG];

// --- hoisted runs (each is a full 180s sim) --------------------------------
let nDotZero = 0;
let nDotDouble = 0;
let nDotShort = 0;
let nBurstSust = 0;
let nAtkZero = 0;
let nAtkShort = 0;
let nNukeZero = 0;
let nParts = 0;

const BASE = run();
const SOLO = run(undefined, false);

// S1a magnitude: 68.46 -> 0 and 68.46 -> 136.92 (linearity of the DoT channel).
const DOT_ZERO = run(patch((ov) => eachEffect(ov, (e) => {
  if (e.kind === 'dot') { e.atkPct = 0; nDotZero++; }
})));
const DOT_DOUBLE = run(patch((ov) => eachEffect(ov, (e) => {
  if (e.kind === 'dot') { e.atkPct = e.atkPct * 2; nDotDouble++; }
})));
// S1a duration/stacking: 5 sec -> 1 sec collapses the overlap to (at most) one
// live instance at a time.
const DOT_SHORT = run(patch((ov) => eachEffect(ov, (e) => {
  if (e.kind === 'dot') { e.durationSec = 1; nDotShort++; }
})));
// B2 magnitude (also the S1a FLAVOR probe).
const BURST_SUST_ZERO = run(patch((ov) => eachEffect(ov, (e) => {
  if (e.kind === 'buff' && e.stat === 'sustainedDamagePct') { e.value = 0; nBurstSust++; }
})));
// S1b magnitude + duration.
const ATK_ZERO = run(patch((ov) => eachEffect(ov, (e) => {
  if (e.kind === 'buff' && e.stat === 'casterAtkPct') { e.value = 0; nAtkZero++; }
})));
const ATK_SHORT = run(patch((ov) => eachEffect(ov, (e) => {
  if (e.kind === 'buff' && e.stat === 'casterAtkPct') { e.durationSec = 2; nAtkShort++; }
})));
// B1 magnitude.
const NUKE_ZERO = run(patch((ov) => eachEffect(ov, (e) => {
  if (e.kind === 'flatDamage') { e.atkPct = 0; nNukeZero++; }
})));
// S2a/S2b inertness.
const PARTS_ZERO = run(patch((ov) => eachEffect(ov, (e) => {
  if (e.kind === 'buff' && e.stat === 'partsDamagePct') { e.value = 0; nParts++; }
})));

// --- event slices ----------------------------------------------------------
const baseEv = BASE.events;
const soloEv = SOLO.events;
const fbStartsBase = baseEv.filter((e) => e.kind === 'fullBurstStart');
const fbStartsSolo = soloEv.filter((e) => e.kind === 'fullBurstStart');

// SELF-cast caster-scaled ATK grants only: crown also hands out casterAtkPct, so
// the self filter is casterIdx === targetIdx (both non-null).
const selfAtkBase = baseEv.filter((e) =>
  e.kind === 'buffApply' && e.stat === 'casterAtkPct' && e.targetSlug === SLUG
  && e.casterIdx !== null && e.casterIdx === e.targetIdx);
const selfAtkShort = ATK_SHORT.events.filter((e) =>
  e.kind === 'buffApply' && e.stat === 'casterAtkPct' && e.targetSlug === SLUG
  && e.casterIdx !== null && e.casterIdx === e.targetIdx);

const sustBase = baseEv.filter((e) =>
  e.kind === 'buffApply' && e.stat === 'sustainedDamagePct' && e.targetSlug === SLUG
  && e.value === 89.44);
const sustSolo = soloEv.filter((e) =>
  e.kind === 'buffApply' && e.stat === 'sustainedDamagePct' && e.targetSlug === SLUG
  && e.value === 89.44);

const committed: any = withPatchedOverride(SLUG, () => {});
const partsEffects: any[] = [];
eachEffect(committed, (e) => {
  if (e.kind === 'buff' && e.stat === 'partsDamagePct') partsEffects.push(e);
});
const unmodeledBlob = JSON.stringify(committed?.unmodeled ?? {});

const teammates = Object.keys(totals(BASE.res)).filter((s) => s !== SLUG);

describe('raven S1a - full-charge sustained DoT (68.46%/sec, 5 sec)', () => {
  it('is encoded as a DoT and is load-bearing', () => {
    // A patch that matched nothing would make every DoT assertion below vacuous.
    expect(nDotZero).toBeGreaterThan(0);
    expect(unitOf(BASE.res, SLUG).totalDamage).toBeGreaterThan(0);
    // 68.46%/sec x several overlapping instances dwarfs an RL normal (61.3% at
    // roughly one charged shot per second), so a faithful model is far above the
    // DoT-less counterfactual. RED if the line is missing or encoded as a single
    // one-shot rider.
    expect(rav(BASE)).toBeGreaterThan(rav(DOT_ZERO) * 1.25);
  });

  it('scales linearly in atkPct, pinning 68.46 as the live per-tick magnitude', () => {
    expect(nDotDouble).toBeGreaterThan(0);
    const oneX = rav(BASE) - rav(DOT_ZERO);
    const twoX = rav(DOT_DOUBLE) - rav(DOT_ZERO);
    expect(oneX).toBeGreaterThan(0);
    // RED under any model where the DoT channel is entangled with a second
    // (mis-flavoured or duplicated) damage source, or where the magnitude is
    // sourced from something other than this atkPct field.
    expect(twoX / oneX).toBeGreaterThan(1.98);
    expect(twoX / oneX).toBeLessThan(2.02);
  });

  it('instances STACK: the 5 sec window overlaps several full-charge shots', () => {
    expect(nDotShort).toBeGreaterThan(0);
    const stacked = rav(BASE) - rav(DOT_ZERO);
    const unstacked = rav(DOT_SHORT) - rav(DOT_ZERO);
    expect(stacked).toBeGreaterThan(0);
    // Raven charges roughly one shot per second (chargeFrames 60) between 6-round
    // magazines, so a 5 sec window holds ~3-4 concurrent instances. RED under the
    // nearest-wrong REFRESH model (one instance whose duration is merely reset per
    // shot), which would leave the two runs nearly equal.
    expect(stacked).toBeGreaterThan(unstacked * 2.0);
  });

  it('carries the SUSTAINED flavor (the burst buff must reach it)', () => {
    expect(nBurstSust).toBeGreaterThan(0);
    // The only sustained-flavored damage raven owns is this DoT. Zeroing the burst's
    // Sustained damage up 89.44% must therefore LOWER her total. RED if the DoT is
    // flavor-less / true-flavored / sequential (the buff would then be inert and the
    // two runs identical), and RED if the burst buff is missing.
    expect(rav(BURST_SUST_ZERO)).toBeLessThan(rav(BASE));
  });

  it('ticks both inside and outside Full Burst (non-vacuity of the FB timing rule)', () => {
    // SOLO comp: liter/crown carry no damage riders, so skill1-sourced damage is
    // raven's DoT. A DoT gated to one FB state would fail one of these.
    const ticks = soloEv.filter((e) => e.kind === 'damage' && e.srcSlot === 'skill1');
    expect(ticks.length).toBeGreaterThan(0);
    expect(ticks.filter((e) => e.inFullBurst === true).length).toBeGreaterThan(0);
    expect(ticks.filter((e) => e.inFullBurst === false).length).toBeGreaterThan(0);
  });

  it.skip('stacks up to 10 - the CAP is non-binding at RL cadence (GAP)', () => {
    // The engine appends one DoT instance per fire and has no per-DoT stack cap.
    // At ~1 charged shot/sec with a 5 sec window (and a 141-frame reload every 6
    // rounds) the live instance count peaks around 4, so a cap-enforcing model and
    // a cap-free model are INDISTINGUISHABLE in this fixture. Enforcing the cap
    // would need either a stack primitive on `dot` or a fixture that fires >10
    // charges inside 5 sec (raven cannot). Flagged, not faked.
  });

  it.skip('DoT crit gating is MEASUREMENT-GATED (default OFF)', () => {
    // The global DOT_CRIT gate is default-off and per-DoT crit:true is opt-in ONLY
    // where measured (isabel). No raven footage is cited in this packet, so the
    // faithful blind reading leaves crit unset. Needs a popup read (orange bodies
    // on the 68.46% ticks) to settle. Same for a per-kit noFb exemption: default
    // OFF, measured-only.
  });
});

describe('raven S1b - Full-Burst-enter self ATK (47.52% of skill user ATK, 10 sec)', () => {
  it('is CASTER-scaled and flat-resolved, not a target-scaled atkPct', () => {
    expect(nAtkZero).toBeGreaterThan(0);
    expect(selfAtkBase.length).toBeGreaterThan(0);
    for (const ev of selfAtkBase) {
      // casterAtkPct re-emits as FLAT ATK at apply time. A plain atkPct model emits
      // the raw 47.52 under a different stat, so this is RED for the nearest-wrong.
      expect(ev.value).toBeGreaterThan(1000);
      expect(ev.value).not.toBe(47.52);
    }
    // Resolved against the caster's STATIC ATK, so every application is identical -
    // RED under a final-ATK (buff-compounding) model.
    const distinct = new Set(selfAtkBase.map((e) => e.value));
    expect(distinct.size).toBe(1);
    expect(rav(ATK_ZERO)).toBeLessThan(rav(BASE));
  });

  it('is SELF-scoped (no teammate receives it)', () => {
    const strays = baseEv.filter((e) =>
      e.kind === 'buffApply' && e.stat === 'casterAtkPct'
      && e.casterIdx !== null && e.casterIdx === e.targetIdx && e.targetSlug !== SLUG);
    // Only raven self-casts a caster-scaled ATK grant in this comp; crown's grants
    // are cross-unit (casterIdx !== targetIdx) and are excluded by the filter.
    expect(strays.length).toBe(selfAtkBase.length - selfAtkBase.length);
  });

  it('fires on FULL-BURST ENTRY, i.e. once per team Full Burst', () => {
    expect(fbStartsBase.length).toBeGreaterThan(0);
    // helm is a second Burst III in the BASE comp, so any rotation helm completes is
    // a Full Burst raven did not cast. Keying this line to burstCast (the nearest
    // wrong for a self buff) under-fires there; keying it to fullBurstEnter gives
    // exactly one application per Full Burst.
    expect(selfAtkBase.length).toBe(fbStartsBase.length);
  });

  it('lasts exactly 10 sec', () => {
    expect(nAtkShort).toBeGreaterThan(0);
    expect(selfAtkShort.length).toBeGreaterThan(0);
    // Same deterministic run, same first application frame; only durationSec moved
    // 10 -> 2, so the expiry must shift by exactly 8 sec of frames. RED for 5s/15s
    // or a round-count reading.
    expect(selfAtkBase[0].expiresFrame - selfAtkShort[0].expiresFrame).toBe(8 * 60);
  });
});

describe('raven S2a/S2b - Vital Attack, Damage to Parts up 21.12% for 5 sec', () => {
  it('is accounted for, not silently dropped', () => {
    // Two independent applications exist in the kit (start of battle + FB entry).
    // Either they are encoded on the schema-inert partsDamagePct stat, or the lines
    // are recorded verbatim in `unmodeled`. Silence in both places is a drop.
    const accounted = partsEffects.length >= 2
      || /[Pp]art/.test(unmodeledBlob)
      || /Vital/.test(unmodeledBlob);
    expect(accounted).toBe(true);
    for (const e of partsEffects) {
      expect(e.value).toBe(21.12);
      expect(e.durationSec).toBe(5);
    }
  });

  it('moves NO damage (the scope-lock boss is partless)', () => {
    // Byte-identical totals for every unit: parts damage is inert in v1.
    for (const slug of Object.keys(totals(BASE.res))) {
      expect(totals(PARTS_ZERO.res)[slug]).toBe(totals(BASE.res)[slug]);
    }
  });

  it('is not laundered into a live damage stat (over-credit guard)', () => {
    // The nearest wrong is encoding 21.12% as attackDamagePct / sustainedDamagePct
    // so the line stops being inert. Nothing raven-targeted may carry 21.12 on a
    // stat other than partsDamagePct.
    const laundered = baseEv.filter((e) =>
      e.kind === 'buffApply' && e.targetSlug === SLUG && e.value === 21.12
      && e.stat !== 'partsDamagePct');
    expect(laundered).toHaveLength(0);
  });
});

describe('raven S2c - Single Point Attack (sustained up 47.32%, 15 sec)', () => {
  it('is NOT modeled as a live buff (over-credit guard)', () => {
    // The trigger is an ally/self destroying an enemy PART. The scope-lock boss has
    // no parts and the schema has no part-destruction trigger, so the line can never
    // fire. Encoding it as passive / fullBurstEnter would hand raven a near-permanent
    // +47.32% on her dominant (sustained) channel - the single largest over-credit
    // available in this kit. RED if any 47.32 sustained grant reaches her.
    const smuggled = baseEv.filter((e) =>
      e.kind === 'buffApply' && e.targetSlug === SLUG && e.value === 47.32);
    expect(smuggled).toHaveLength(0);
  });

  it.skip('sustained up 47.32% for 15 sec on part destruction (GAP)', () => {
    // Missing primitive: no part-destruction trigger, and the v1 boss is partless.
    // The A.N. Mode exclusion gate (self only if NOT in A.N. Mode) and the burst's
    // Effect 1 (removes Single Point Attack) are moot while the grant is unreachable
    // - a mode gate over a buff that never exists is untestable. Both belong in the
    // override's `unmodeled` record.
  });
});

describe('raven burst - 492.3% nuke + A.N. Mode sustained up 89.44% (10 sec)', () => {
  it('the 492.3% burst hit exists and is load-bearing', () => {
    expect(nNukeZero).toBeGreaterThan(0);
    expect(rav(NUKE_ZERO)).toBeLessThan(rav(BASE));
  });

  it('burst-cast damage takes no Full Burst major', () => {
    // A burst cast lands before the Full Burst window opens, so the +50% FB major
    // must not be stamped on it. SOLO comp keeps burst-sourced damage attributable
    // (liter/crown deal no burst damage).
    const burstHits = soloEv.filter((e) => e.kind === 'damage' && e.srcSlot === 'burst');
    expect(burstHits.length).toBeGreaterThan(0);
    for (const h of burstHits) expect(h.fbMajorApplied).not.toBe(true);
  });

  it('A.N. Mode sustained buff is self-scoped, 89.44, and burst-CAST keyed', () => {
    expect(sustSolo.length).toBeGreaterThan(0);
    for (const e of sustSolo) expect(e.targetSlug).toBe(SLUG);
    // SOLO: raven is the only Burst III, so she casts on every Full Burst and the
    // counts coincide (non-vacuity - the buff really does fire every rotation).
    expect(sustSolo.length).toBe(fbStartsSolo.length);
    // BASE: helm is a second Burst III. A self mode declared in raven's OWN burst
    // block is burst-cast keyed, so it can only ever fire on a SUBSET of team Full
    // Bursts. RED if it were keyed to fullBurstEnter and helm ever completes a
    // rotation raven sat out.
    expect(sustBase.length).toBeLessThanOrEqual(fbStartsBase.length);
    expect(sustBase.length).toBeGreaterThan(0);
  });

  it('lasts long enough to cover a Full Burst window (10 sec)', () => {
    // expiresFrame is a hard frame stamp; the window must be 10 sec of frames past
    // the cast. Read structurally off the committed effect so a 5s/15s mis-read is
    // caught even though the engine emits no lapse event.
    const sustEffects: any[] = [];
    eachEffect(committed, (e) => {
      if (e.kind === 'buff' && e.stat === 'sustainedDamagePct' && e.value === 89.44) {
        sustEffects.push(e);
      }
    });
    expect(sustEffects.length).toBeGreaterThan(0);
    for (const e of sustEffects) expect(e.durationSec).toBe(10);
  });
});

describe('raven - inertness on teammates', () => {
  it('none of raven damage lines move an ally total', () => {
    // Raven's kit is entirely self-scoped: a DoT on the enemy, a self ATK grant, a
    // self sustained grant and a burst nuke. Every counterfactual zeroes a MAGNITUDE
    // (never a block), so shot counts and gauge generation are untouched and each
    // teammate total must be byte-identical. RED if any of these lines were mis-scoped
    // to allies or perturbed the rotation.
    for (const mate of teammates) {
      expect(totals(DOT_ZERO.res)[mate]).toBe(totals(BASE.res)[mate]);
      expect(totals(ATK_ZERO.res)[mate]).toBe(totals(BASE.res)[mate]);
      expect(totals(NUKE_ZERO.res)[mate]).toBe(totals(BASE.res)[mate]);
      expect(totals(BURST_SUST_ZERO.res)[mate]).toBe(totals(BASE.res)[mate]);
    }
  });
});

```

## SECTION 6 — S6 BLIND post-op override (claude-opus-5) + diff vs the DRIVER override

> **Driver diff (S6 blind override vs driver src/skills/overrides/raven.json): the two are
> ENCODING-IDENTICAL on every block.** skill1[0] shotFired→enemy dot 68.46/5s/1s/sustained; skill1[1]
> fullBurstEnter→self casterAtkPct 47.52/10s; skill2[0] passive→self partsDamagePct 21.12/5s; skill2[1]
> fullBurstEnter→self partsDamagePct 21.12/5s; burst[0] burstCast→enemy flatDamage 492.3; burst[1]
> burstCast→self sustainedDamagePct 89.44/10s; unmodeled = the same part-destroy Single Point Attack +
> A.N. Effect 1 lines. The ONLY textual difference: the blind override sets `crit:true, noFb:true`
> EXPLICITLY on the burst nuke, which the driver override omits because the engine already defaults
> flatDamage to crit-eligible (`e.crit !== false`) and auto-exempts burstCast damage from the FB major
> (`skillNoFb(..., slot==='burst' && trigger.kind==='burstCast', ...)`) — i.e. a cosmetic no-op, not a
> behavioral divergence. The blind override's caveats enumerate the same ⚑ residuals (cadence tuple,
> 10-stack cap unenforced, partless-boss inertness) the driver carries.

```json
{
  "slug": "raven",
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "shotFired"
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "dot",
          "atkPct": 68.46,
          "durationSec": 5,
          "intervalSec": 1,
          "flavor": "sustained"
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
      "effects": [
        {
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 47.52,
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
          "stat": "partsDamagePct",
          "value": 21.12,
          "durationSec": 5
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "fullBurstEnter"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "partsDamagePct",
          "value": 21.12,
          "durationSec": 5
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
          "atkPct": 492.3,
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
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "sustainedDamagePct",
          "value": 89.44,
          "durationSec": 10
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [],
    "skill2": [
      "■ Activates when an ally or self destroys an enemy's part. Affects self if self is not in A.N. Mode status.",
      "Single Point Attack: Sustained damage ▲ 47.32% for 15 sec.",
      "Removes Vital Attack."
    ],
    "burst": [
      "Effect 1: Removes Single Point Attack."
    ]
  },
  "caveats": [
    "⚑ TRIGGER MAPPING: skill1 sustained-damage line keys on 'performing a Full Charge attack'. Encoded as shotFired (an RL trigger pull in this engine is a full-charge shot). If the engine can fire an RL uncharged, or full charges are counted separately, the faithful key is chargeCounter {count:1}. UNVERIFIED.",
    "⚑ CADENCE TUPLE: DoT instance count is driven entirely by the datamine-unreliable RL cadence (chargeFrames 60, reloadFrames 141, ammo 6). Every damage number in this override moves with it.",
    "⚑ STACK CAP: kit caps the sustained damage at 10 stacks; the engine appends one independent DoT instance per fire with NO cap. At the estimated RL cadence only ~3-4 instances overlap inside the 5s window, so the cap is believed non-binding — but it is UNENFORCED, and a faster real cadence would over-credit.",
    "⚑ noFb on the burst nuke: set per the standing prior that burst-cast instant damage lands before the FB window opens. Not measured for this unit.",
    "⚑ crit on the burst nuke: set per the standing rider prior (riders crit at the caster's sheet rate, no core). Not measured.",
    "⚑ DoT crit: left OFF (default). Most DoTs are validated non-crit; opt in only if popup colour on a real recording shows orange sustained ticks.",
    "⚑ 'Start of battle' 5s window encoded as a passive trigger + durationSec 5, i.e. applied at frame 0 and expiring at t=5s. If the engine treats passive as unexpiring, this block would be permanently live — verify by inspection of the buff-expiry path.",
    "PARTLESS BOSS: both Vital Attack blocks (partsDamagePct) are INERT in v1, and the Single Point Attack chain (sustained ▲47.32%) is UNREACHABLE — its trigger is part destruction, which the scope-lock boss cannot produce. Raven loses a large sustained-damage multiplier on this fixture relative to a real parted boss; do not read the resulting board number as her real ceiling.",
    "A.N. Mode is modeled only as its damage effect (the burst self-buff). The mode STATUS itself (which suppresses the skill2 part-destruction branch and removes Single Point Attack) is not represented — harmless while that branch is unreachable, but it must be revisited if parts are ever modeled."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Raven (RL/Iron/Attacker/B3) is a sustained-damage carrier: S1 appends a 5s / 1s-tick 68.46% sustained DoT per full-charge shot (kit cap 10 stacks, engine-uncapped) and grants herself ATK ▲47.52% of her own ATK for 10s on Full Burst entry; her burst is a 492.3% instant nuke plus A.N. Mode's Sustained Damage ▲89.44% for 10s, which multiplies the S1 DoT. S2's Vital Attack part-damage buffs are parsed but inert on a partless boss, and the Single Point Attack branch (Sustained Damage ▲47.32%) is unmodeled because its part-destruction trigger has no schema representation and cannot fire in v1 — see unmodeled + caveats."
}
```

## SECTION 7 — DRIVER implementation under judgment

### 7a. Driver test (scripts/tests/units/raven.test.ts) — 18 assertions, all GREEN vs shipped

```ts
// PER-UNIT KIT SPEC — `raven` (Raven, Attacker/RL/Iron, Burst III, cd 40s, ammo 6, chargeFrames 60).
// Kit-autonomy gauntlet 2026-07-25 (test-first; owner-driven spec review).
//
// One assertion group per KIT LINE (R1..R6 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) and references (a line removed to prove it is live /
// to isolate its bucket) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.raven.skills):
//   S1 ■ Full Charge attack → nearest enemy: 68.46% final ATK sustained dmg every 1s,
//                                          stacks ≤10, lasts 5s                          [R1]
//      ■ entering Full Burst → self: ATK ▲47.52% OF THE SKILL USER'S ATK for 10s          [R2]
//   S2 ■ start of battle → self: Vital Attack: Damage to Parts ▲21.12% for 5s             [R3]
//      ■ entering Full Burst → self: Vital Attack: Damage to Parts ▲21.12% for 5s         [R4]
//      ■ ally/self destroys an enemy part → Single Point Attack sustained ▲47.32%/15s
//                                            + Removes Vital Attack          [UNMODELED — parts]
//   BU ■ all enemies: 492.3% final ATK as Burst Skill damage                              [R5]
//      ■ self: A.N. Mode Effect 2: Sustained damage ▲89.44% for 10s                       [R6]
//        (A.N. Mode header + Effect 1 "Removes Single Point Attack" — UNMODELED, no-op v1)
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   R1  the DoT is a STACKING, per-shot APPEND: every full-charge pull spawns an INDEPENDENT 5s
//       instance (kit "stacks up to 10 times"), so total ticks ≈ 5 × shots. A single refreshing
//       / passive instance ticks ~once/sec regardless of shot count and collapses to a handful of
//       ticks — the counterfactual the assertion must beat. The 10-stack cap is NON-BINDING at the
//       datamined cadence (~2.8 concurrent 5s instances, peak ~3.7 < 10 — see override note) so the
//       engine's uncapped append == the capped kit here; the cap itself is a cadence ⚑, not pinned.
//   R2  "OF THE SKILL USER'S ATK" = casterAtkPct, a FLAT add of the caster's STATIC ATK. For a
//       SELF buff this is damage-equivalent to a generic atkPct (both add staticAtk×0.4752 — atkPct
//       multiplies static only, so it does NOT compound), so the total does not discriminate; the
//       faithful encoding is still casterAtkPct, and the discriminator is the buffApply VALUE the
//       engine records — flat ATK (~56.9k) for casterAtkPct vs the raw percent (47.52) for atkPct,
//       which is what diverges the moment such a buff targets another unit (caster≠holder).
//   R3/R4  partsDamagePct must be EXACTLY inert against the partless scope-lock boss — byte-identical
//       totals for every unit, not "small" — while the buffApply events prove the lines are MODELED
//       (present), not silently dropped (hard rule 3: never delete a stat buff a parts boss could use).
//   R5  a burst CAST lands BEFORE the Full Burst window opens, so the nuke must never take the +50%
//       major (verified fact, 2026-07-13), at the kit magnitude 492.3, once per cast.
//   R6  sustainedDamagePct is FLAVOR-SCOPED: it lifts the sustained DoT ticks (R1) during the A.N.
//       window but NOT raven's non-sustained normal RL shots. crown's attackDamagePct is present in
//       every run equally, so it cancels — the only thing that moves the sustained-vs-normal split is
//       the 89.44. A generic attackDamagePct counterfactual WOULD lift the normals, proving shipped
//       is specifically sustained-scoped.
//
// UNMODELED (documented, no assertion — genuinely-skippable "parts" class): S2's part-destroy branch
// (Single Point Attack sustained ▲47.32%/15s + "Removes Vital Attack") can never fire on the partless
// scope-lock boss, and the burst's "A.N. Mode" header + "Effect 1: Removes Single Point Attack" is a
// no-op because Single Point Attack never exists here. Kept VERBATIM in the override's `unmodeled`.
//
// Fixture: [liter B1 / crown B2 / raven B3], boss Fire, focus raven (RL charge → ×2.5 gauge so she
// casts). raven is slot index 2. A lone B3 makes zero Full Bursts, so she needs the liter/crown core
// to cast at all. Deterministic (no seed); event-log over totals.
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
/** controlComp('raven', false) slot order: liter 0 / crown 1 / raven 2. */
const RAVEN = 2;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;
type FbStart = Extract<SimEvent, { kind: 'fullBurstStart' }>;

function run(overrides: Record<string, any> = {}, helm = false) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp('raven', helm),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res), res };
}

// ---- counterfactual / reference patches --------------------------------------------------------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);
const hasKind = (b: any, kind: string) =>
  b.effects.some((e: any) => e.kind === kind);

/** R1 counterfactual: her S1 DoT as a SINGLE passive instance (fires once at t=0), not a
 *  per-shot append. The nearest wrong reading of "stacks up to 10 times" is a single refreshing
 *  sustained buff; a one-shot passive dot is its cleanest proxy (ticks ~5× total, never stacks). */
const ravenSingleDot = withPatchedOverride('raven', (ov) => {
  const b = ov.skill1.find((x: any) => hasKind(x, 'dot'));
  if (!b) throw new Error('raven S1 dot block missing — fixture is stale');
  b.trigger.kind = 'passive';
});
/** R2 counterfactual: the FB-enter ATK buff as a GENERIC (compounding) atkPct, not the flat
 *  caster-ATK add the kit's "of the skill user's ATK" demands. */
const ravenAtkPctS1 = withPatchedOverride('raven', (ov) => {
  const e = ov.skill1
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'casterAtkPct');
  if (!e)
    throw new Error('raven S1 casterAtkPct effect missing — fixture is stale');
  e.stat = 'atkPct';
});
/** R3/R4 reference: both Vital Attack parts-damage lines removed — totals must be byte-identical
 *  (inert vs the partless boss). */
const ravenNoParts = withPatchedOverride('raven', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasStat(b, 'partsDamagePct'));
  if (ov.skill2.length !== before - 2)
    throw new Error(
      'raven S2 expected 2 partsDamagePct blocks — fixture is stale',
    );
});
/** R6 reference: the burst's sustainedDamagePct buff removed — isolates what the 89.44 feeds. */
const ravenNoSustained = withPatchedOverride('raven', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !hasStat(b, 'sustainedDamagePct'));
  if (ov.burst.length !== before - 1)
    throw new Error(
      'raven burst sustainedDamagePct block missing — fixture is stale',
    );
});
/** R6 counterfactual: the same buff as a GENERIC attackDamagePct — would lift her normal shots too,
 *  which the sustained-scoped shipped encoding must NOT. */
const ravenSustainedAsAttack = withPatchedOverride('raven', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'sustainedDamagePct');
  if (!e)
    throw new Error(
      'raven burst sustainedDamagePct effect missing — fixture is stale',
    );
  e.stat = 'attackDamagePct';
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const singleDot = run({ raven: ravenSingleDot });
const atkPctS1 = run({ raven: ravenAtkPctS1 });
const noParts = run({ raven: ravenNoParts });
const noSustained = run({ raven: ravenNoSustained });
const sustainedAsAttack = run({ raven: ravenSustainedAsAttack });
// Co-B3 comp [liter / crown / raven / helm]: helm is a second Burst III, so the team completes
// Full Bursts that RAVEN did NOT cast. This is the only fixture that separates a `burstCast`
// trigger (fires on raven's own casts only) from a `fullBurstEnter` trigger (fires on EVERY team
// FB) — the canonical over-credit the S2b reviewer flagged for R6 (and the mirror misread for R2).
const coB3 = run({}, true);

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const ravenDmg = (evs: SimEvent[]) =>
  dmg(evs).filter((d) => d.slug === 'raven');
/** R1 sustained DoT ticks (skill1 bucket). */
const s1Ticks = (evs: SimEvent[]) =>
  ravenDmg(evs).filter((d) => d.srcSlot === 'skill1');
const ravenNormals = (evs: SimEvent[]) =>
  ravenDmg(evs).filter((d) => d.bucket === 'normal');
const ravenNukes = (evs: SimEvent[]) =>
  ravenDmg(evs).filter((d) => d.srcSlot === 'burst');
const sum = (ds: Damage[]) => ds.reduce((a, d) => a + d.amount, 0);
const maxDmgUp = (ds: Damage[]) => Math.max(...ds.map((d) => d.mult.dmgUp));

const ravenShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'raven');
const ravenBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'raven',
  );
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e): e is FbStart => e.kind === 'fullBurstStart');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const ravenBuffs = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === RAVEN && b.stat === stat);

const RAVEN_STATIC_ATK = unitOf(base.res, 'raven').staticAtk;

describe('raven — kit spec', () => {
  describe('R1 — S1 full-charge sustained DoT STACKS per shot (68.46%/s, 5s, append)', () => {
    it('ticks ~5× per shot (an independent 5s instance per full-charge pull)', () => {
      const ticks = s1Ticks(base.events).length;
      const shots = ravenShots(base.events).length;
      expect(shots).toBeGreaterThan(0);
      expect(
        ticks,
        `${ticks} skill1 ticks vs ${shots} shots — a per-shot 5s instance ticks ~5× (fight-end ` +
          'truncation shaves the ratio slightly below 5); a single refreshing instance ticks ~1/s',
      ).toBeGreaterThanOrEqual(4 * shots);
    });

    it('DISCRIMINATING: a single passive instance collapses the tick count', () => {
      const stacked = s1Ticks(base.events).length;
      const single = s1Ticks(singleDot.events).length;
      expect(
        single,
        `${single} ticks for the single-instance model — one 5s passive dot ticks ~5× total`,
      ).toBeLessThan(20);
      expect(stacked).toBeGreaterThan(4 * single);
    });

    it('is the kit magnitude on every tick, in the skill bucket', () => {
      const ticks = s1Ticks(base.events);
      expect(ticks.length).toBeGreaterThan(0);
      expect([...new Set(ticks.map((d) => d.atkPct))]).toEqual([68.46]);
      expect([...new Set(ticks.map((d) => d.bucket))]).toEqual(['skill']);
    });
  });

  describe('R2 — S1 FB-enter ATK buff is a FLAT caster-ATK add ("of the skill user\'s ATK")', () => {
    const applied = ravenBuffs(base.events, 'casterAtkPct');

    it('fires once per Full Burst, self-scoped, for 10 sec', () => {
      expect(
        applied.length,
        'no FB-entry casterAtkPct buff applied',
      ).toBeGreaterThan(0);
      expect(applied.length).toBe(fbStarts(base.events).length);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([RAVEN]);
      expect([
        ...new Set(applied.map((b) => b.expiresFrame! - b.frame)),
      ]).toEqual([10 * FPS]);
    });

    it('is 47.52% of her STATIC ATK as a flat add (constant across every cast)', () => {
      const expected = (47.52 / 100) * RAVEN_STATIC_ATK;
      for (const b of applied) expect(b.value).toBeCloseTo(expected, 1);
      // A flat add of static ATK does not vary with the team's buff state at cast time.
      expect(new Set(applied.map((b) => b.value.toFixed(4))).size).toBe(1);
    });

    it('is keyed to fullBurstEnter — fires even on Full Bursts raven did NOT cast', () => {
      const fb = fbStarts(coB3.events).length;
      const ownCasts = ravenBursts(coB3.events).length;
      const appliedCoB3 = ravenBuffs(coB3.events, 'casterAtkPct');
      expect(
        ownCasts,
        'co-B3 fixture must produce FBs raven sat out',
      ).toBeLessThan(fb);
      // "when entering Full Burst" = fullBurstEnter (any team FB); a burstCast misread would
      // match only her own casts and under-fire here.
      expect(appliedCoB3.length).toBe(fb);
      expect(appliedCoB3.length).toBeGreaterThan(ownCasts);
    });

    it('DISCRIMINATING: a generic atkPct stores the PERCENT, casterAtkPct stores the FLAT ATK', () => {
      // For a SELF-targeting ATK buff the two are damage-equivalent (effectiveAtk adds
      // staticAtk×(atkPct/100) and casterAtkPct flat — both equal staticAtk×0.4752 here), so the
      // total does NOT move; the faithful "of the skill user's ATK" encoding is nonetheless
      // casterAtkPct, and the discriminator is the buffApply VALUE the engine records: the flat
      // ATK (~56.9k) for casterAtkPct vs the raw percent (47.52) for atkPct. That representation
      // is what diverges the moment such a buff targets ANOTHER unit (caster≠holder).
      const asAtkPct = ravenBuffs(atkPctS1.events, 'atkPct');
      expect(asAtkPct.length).toBeGreaterThan(0);
      expect([...new Set(asAtkPct.map((b) => b.value))]).toEqual([47.52]); // percent form
      expect(applied[0].value).toBeGreaterThan(1000); // flat-ATK scale, not a percent
      expect(base.totals.raven).toBeCloseTo(atkPctS1.totals.raven, 3); // self-buff ⇒ equivalent
    });
  });

  describe('R3/R4 — S2 Vital Attack (Damage to Parts ▲21.12%) is modeled but exactly inert', () => {
    it("removing BOTH parts-damage lines changes NO unit's total by a single point", () => {
      expect(base.totals).toEqual(noParts.totals);
    });

    it('is present (battle-start + per-FB), self-scoped, 5 sec — modeled, not dropped', () => {
      const applied = ravenBuffs(base.events, 'partsDamagePct');
      // 1 battle-start (passive) + one per Full Burst entry.
      expect(applied.length).toBe(fbStarts(base.events).length + 1);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([21.12]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([RAVEN]);
      expect([
        ...new Set(applied.map((b) => b.expiresFrame! - b.frame)),
      ]).toEqual([5 * FPS]);
    });
  });

  describe('R5 — burst nuke: 492.3% of final ATK, cast BEFORE the Full Burst window', () => {
    const nukes = ravenNukes(base.events);

    it('fires once per burst cast at the kit magnitude, in the burst bucket', () => {
      expect(nukes.length).toBe(ravenBursts(base.events).length);
      expect(nukes.length).toBeGreaterThan(0);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([492.3]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      const took = nukes.filter((d) => d.fbMajorApplied);
      expect(
        took.map((d) => d.sec),
        'burst-cast damage must precede the FB window',
      ).toEqual([]);
    });
  });

  describe('R6 — burst A.N. Mode sustainedDamagePct 89.44% is FLAVOR-SCOPED (feeds the DoT, not normals)', () => {
    const applied = ravenBuffs(base.events, 'sustainedDamagePct');

    it('is 89.44% for 10 sec, self-scoped, once per burst cast', () => {
      expect(applied.length).toBe(ravenBursts(base.events).length);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([89.44]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([RAVEN]);
      expect([
        ...new Set(applied.map((b) => b.expiresFrame! - b.frame)),
      ]).toEqual([10 * FPS]);
    });

    it('is keyed to burstCast (her OWN casts only), NOT fullBurstEnter', () => {
      const fb = fbStarts(coB3.events).length;
      const ownCasts = ravenBursts(coB3.events).length;
      const appliedCoB3 = ravenBuffs(coB3.events, 'sustainedDamagePct');
      expect(
        ownCasts,
        'co-B3 fixture must produce FBs raven sat out',
      ).toBeLessThan(fb);
      // A.N. Mode is granted inside her OWN burst block → burstCast. The canonical over-credit is
      // keying it to fullBurstEnter, which would also fire on helm-cast rotations (count == FBs).
      expect(appliedCoB3.length).toBe(ownCasts);
      expect(appliedCoB3.length).toBeLessThan(fb);
    });

    it('feeds the sustained DoT: in-window ticks carry exactly +0.8944 dmgUp', () => {
      // crown's attackDamagePct is present in BOTH runs, so it cancels in the delta — the only
      // thing that changes the sustained-tick dmgUp here is the 89.44 sustainedDamagePct.
      const delta =
        maxDmgUp(s1Ticks(base.events)) - maxDmgUp(s1Ticks(noSustained.events));
      expect(delta).toBeCloseTo(0.8944, 2);
      expect(sum(s1Ticks(base.events))).toBeGreaterThan(
        sum(s1Ticks(noSustained.events)),
      );
    });

    it('does NOT touch her normal RL shots (sustained-scoped, not a generic damage buff)', () => {
      // Normal-bucket damage is byte-identical with the buff present vs removed.
      expect(sum(ravenNormals(base.events))).toBe(
        sum(ravenNormals(noSustained.events)),
      );
      expect(maxDmgUp(ravenNormals(base.events))).toBe(
        maxDmgUp(ravenNormals(noSustained.events)),
      );
    });

    it('DISCRIMINATING: a generic attackDamagePct WOULD lift the normal shots', () => {
      expect(maxDmgUp(ravenNormals(sustainedAsAttack.events))).toBeGreaterThan(
        maxDmgUp(ravenNormals(base.events)),
      );
    });
  });

  describe('UNMODELED — part-destroy Single Point Attack (sustained ▲47.32%) is correctly ABSENT', () => {
    // "when an ally or self destroys an enemy's part" can never fire on the partless scope-lock
    // boss, so Single Point Attack must NOT be modeled. The reviewer's most-damaging plausible
    // misread is "rescuing" it as an always-on/FB-keyed sustained ▲47.32% — a ~47pp Damage-Up
    // over-credit on every DoT tick. Pin that its magnitude never appears anywhere.
    it("no sustainedDamagePct 47.32 buff is ever applied (only the burst's 89.44)", () => {
      const sustValues = new Set(
        ravenBuffs(base.events, 'sustainedDamagePct').map((b) => b.value),
      );
      expect(sustValues).toEqual(new Set([89.44]));
      expect(
        ravenBuffs(base.events, 'sustainedDamagePct').some(
          (b) => b.value === 47.32,
        ),
      ).toBe(false);
    });

    it('no raven buff of any stat carries the 47.32 magnitude', () => {
      const any47 = buffs(base.events).filter(
        (b) => b.casterIdx === RAVEN && b.value === 47.32,
      );
      expect(any47).toEqual([]);
    });
  });
});

```

### 7b. Driver override (src/skills/overrides/raven.json)

```json
{
  "note": "Kit-autonomy gauntlet 2026-07-25: VALIDATED faithful (cross-family S2b claude-fable-5 / S5-S6-S7 claude-opus-5 converged; scripts/tests/units/raven.test.ts pins every load-bearing line GREEN vs shipped, RED vs counterfactual — incl. burstCast-vs-fullBurstEnter trigger discrimination via a co-B3 comp and a negative pin that the part-destroy Single Point Attack 47.32% never appears). The cadence ⚑ below remains a genuine residual (DoT concurrency could bind the 10-stack cap if real fire-rate exceeds the datamine estimate). — raven (Raven, RL/Iron/Attacker/B3), kit-parse AUTHOR wave-4 vs blablalink prose. MODEL: S1a = STACKING sustained DoT 68.46%/s, 5s, per Full Charge attack — kit says 'stacks up to 10 times', so the repeating-trigger DoT encoding is the FAITHFUL one (hard-rule-5 carve-out; engine appends an independent instance per shot). Trigger `shotFired` is the full-charge proxy: every RL pull in-engine is a full-charge shot. The 10-stack cap is not encodable on a `dot` effect but is NON-BINDING at datamined cadence: 60f charge + 22f bolt gap = 1.37s/shot, 6 ammo + 141f reload → ~0.57 shots/s avg → ~2.8 concurrent 5s instances (3.7 peak within a magazine), well under 10. WHOLE-PICTURE: this DoT is her DOMINANT bucket (~1.9×ATK/s vs ~0.35×ATK/s weapon at 61.3% normalMult), so the cadence ⚑ is TOP priority — DoT output scales linearly with shot rate. S1b: 'when entering Full Burst' → fullBurstEnter (literal wording, hard rule 6), self casterAtkPct 47.52 ('of the skill user's ATK') 10s. S2: both Vital Attack lines kept as partsDamagePct 21.12 stat buffs (battle-start 5s + FB-enter 5s) — INERT vs the partless scope-lock boss but kept per hard rule 3 (never delete a stat buff a future consumer/parts boss could use). S2c part-destroy branch → UNMODELED: 'when an ally or self destroys an enemy's part' can never fire on the partless boss (genuinely-skippable class: parts), so Single Point Attack (sustained ▲47.32, 15s) and 'Removes Vital Attack' never happen; no part-destroy trigger exists in types.ts either. NOTE this REPLACES the prior hand-authored steady-state passive sustainedDamagePct 47.32 — that model assumed destructible parts, contradicting the scope-lock partless basis, and its own note flagged it UNCERTAIN (never measured); see findings. BURST: 492.3% nuke on burstCast ('all enemies (including parts)' = the one boss; auto FB-exempt, never set noFb on burst-cast) + A.N. Mode Effect 2 self sustainedDamagePct 89.44 10s on burstCast (mode granted in her OWN burst block → burstCast, NOT fullBurstEnter). A.N. Mode header + 'Effect 1: Removes Single Point Attack' unmodeled — Single Point Attack never exists vs the partless boss, so the removal is a no-op (and the old double-count concern with the 47.32 passive dissolves with it). ⚑ LIST: (1) TOP cadence tuple — charge 60f / bolt-gap 22f default ON (autofire NOT set; verify — noBoltRecovery would be a ~15-20% shot swing) / reloadFrames 141 / rolling-reload unknown; estimate ~0.57 shots/s. (2) S1 DoT stacking vs cadence — confirm per-shot independent 5s instances + that the 10-cap never binds; count sustained ticks/s in a solo focus video (expect ≈3 × 68.46% popups/s steady-state). (3) DoT FB timing — default FB-by-timing ON (prior 2, no noFb); verify +50% on in-FB ticks. (4) RL projectile split — hitsPerShot 1, single instance assumed; read popups (prior 5). No stack-currency, no weapon-state lines, no heals/shields, no Hit Rate in this kit.",
  "unmodeled": {
    "skill1": [],
    "skill2": [
      "Activates when an ally or self destroys an enemy's part. Affects self if self is not in A.N. Mode status.",
      "Single Point Attack: Sustained damage ▲ 47.32% for 15 sec.",
      "Removes Vital Attack."
    ],
    "burst": ["A.N. Mode:", "Effect 1: Removes Single Point Attack."]
  },
  "caveats": [
    "skill1: full-charge DoT cadence (60f charge + 22f bolt gap + 141f reload, autofire unverified) is an unmeasured ⚑ estimate — the DoT is her dominant damage bucket and scales linearly with shot rate",
    "skill2: Single Point Attack (Sustained damage ▲ 47.32%) keys on destroying an enemy part — it can never fire against the partless scope-lock boss and is not modeled (previously approximated as an always-on passive)",
    "skill2: Vital Attack (Damage to Parts ▲ 21.12%) is modeled but inert in v1 (no parts on the boss)"
  ],
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "shotFired"
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "dot",
          "atkPct": 68.46,
          "durationSec": 5,
          "intervalSec": 1,
          "flavor": "sustained"
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
      "effects": [
        {
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 47.52,
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
          "stat": "partsDamagePct",
          "value": 21.12,
          "durationSec": 5
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "fullBurstEnter"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "partsDamagePct",
          "value": 21.12,
          "durationSec": 5
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
          "atkPct": 492.3
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
          "stat": "sustainedDamagePct",
          "value": 89.44,
          "durationSec": 10
        }
      ]
    }
  ]
}

```
