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



==========================================================================================
## SECTION 2 — MECHANICS SSOT (docs/data/damage-calculation.md)
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



==========================================================================================
## SECTION 2b — MECHANICS SSOT (docs/data/game-mechanics.md)
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



==========================================================================================
## SECTION 3 — GROUND TRUTH: kit prose + base stats (data/characters.json → characters['rosanna-chic-ocean'])
==========================================================================================

```json
{
  "slug": "rosanna-chic-ocean",
  "name": "Rosanna: Chic Ocean",
  "weapon": "AR",
  "burst": "II",
  "class": "Supporter",
  "element": "Wind",
  "manufacturer": "Tetra",
  "burstCooldownSec": 20,
  "ammo": 60,
  "reloadFrames": 81,
  "normalAttackMultiplier": 13.65,
  "coreAttackMultiplier": 200,
  "hitsPerShot": 1,
  "burstGaugePerShot": 0.2,
  "skills": {
    "skill1": "■ Activates at the start of battle. Affects all allies.\nDamage to Parts ▲ 24.26% for 15 sec.\n■ Activates when an ally or self destroys an enemy's part. Affects all allies.\nATK ▲ 3% of the skill user's ATK, stacks up to 5 time(s) and lasts for 30 sec.",
    "skill2": "■ Affects all allies.\nDamage to Parts ▲ 24.26% for 15 sec.\n■ Affects the enemy nearest to the crosshair.\nDeals 70.4% of final ATK as sustained damage every 1 sec for 15 sec.",
    "burst": "■ Affects all allies.\nSustained Damage ▲ 20.32% for 10 sec.\n■ Affects all enemies.\nDamage Taken ▲ 32.23% for 10 sec."
  },
  "skillCooldownsSec": {
    "skill1": null,
    "skill2": 30,
    "burst": 20
  },
  "baseStats": {
    "hp": 15000,
    "atk": 500,
    "def": 100,
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
    "resourceId": 283
  }
}
```

NOTE: skillCooldownsSec.skill2 = 30 is DATAMINED ground truth (the skill-2 re-activation cooldown). The kit prose gives skill2 NO activation clause; the owner ruling (2026-07-20) is that this datamined CD is the re-activation CD → skill2 auto-casts every 30s, each cast a 15s window, first fire at t=CD (no force-cast clause).


==========================================================================================
## SECTION 4 — S2b PRE-OP TEST-FAITHFULNESS REVIEW (claude-fable-5) + driver reconciliation
==========================================================================================

```json
{
  "slug": "rosanna-chic-ocean",
  "stage": "S2b/S2c — cross-family test-faithfulness review (claude-fable-5) + driver reconciliation",
  "date": "2026-07-25",
  "reviewerModel": "claude-fable-5",
  "reviewerPacket": "scripts/kit-autonomy/cross-family/rosanna-chic-ocean/s2b-packet.md",
  "reviewerResult": "scripts/kit-autonomy/cross-family/rosanna-chic-ocean/s2b-result.json",
  "leakDetected": null,
  "reviewerDispositionSummary": {
    "skill1_parts_battleStart": "FAITHFUL (inert vs partless; single t=0 apply)",
    "skill1_partDestroy_stacks": "GAP -> unmodeled (trigger never fires partless; stat is casterAtkPct not atkPct)",
    "skill2_parts_interval": "FAITHFUL (inert; recurring on CD, distinct from S1 one-shot)",
    "skill2_sustained_dot_70_4": "FAITHFUL (dot flavor sustained, ~1 tick/sec, NOT overlapping)",
    "burst_sustainedDamage_20_32": "FAITHFUL (burstCast not fullBurstEnter; feeds sustained DoT only)",
    "burst_damageTaken_32_23": "FAITHFUL (burstCast; boss-held debuff, casterIdx+targetIdx null; team-wide taken)"
  },
  "driverAgreement": "CONVERGED — driver and reviewer agree on every line disposition. The shipped override JSON is the faithful resolved encoding (interval:30 DoT cadence first-fire t=30, sustained flavor, burstCast burst buffs, inert parts, part-destroy correctly unmodeled).",
  "reviewerRecommendedStrengthenings": [
    {
      "id": 1,
      "issue": "burstCast vs fullBurstEnter trigger identity is not discriminable in a solo-B2 fixture (the reviewer's #1 damage-at-stake misread).",
      "driverAction": "ADOPTED via cast-frame timing (helm H7 fact: a burst cast lands BEFORE the FB window). A co-B2 divergence fixture was probed and is DEGENERATE — crown monopolizes all 10 B2 casts, leaving rosanna 0 casts — so it cannot test rosanna's own casts. Instead the test pins: sustainedDamagePct/damageTakenPct apply on rosanna's 9 burstCast frames (each < the FB-start frame), whereas a fullBurstEnter counterfactual applies on the 5 fullBurstStart frames (different count AND timing).",
      "verified": "shipped apply-frames === burstCast frames [9.50,30.27,...]; fullBurstEnter CF apply-frames === fullBurstStart frames [10.37,51.13,...]; cast[0]=9.50 < fbStart[0]=10.37."
    },
    {
      "id": 2,
      "issue": "sustainedDamagePct must be flavor-scoped (lifts sustained DoT, NOT her AR normal shots) to kill the attackDamagePct misread.",
      "driverAction": "ADOPTED — R2 asserts DoT dmgUp set {1.0000,1.2032} while normal-shot dmgUp set is exactly {1.0000} (1648 normals, never 1.2032).",
      "verified": "normal-shot dmgUp set === ['1.0000']; DoT dmgUp set === ['1.0000','1.2032']."
    },
    {
      "id": 3,
      "issue": "The duplicated Damage-to-Parts line must stay two DISTINCT blocks (S1 one-shot t=0 vs S2 CD-recurring); inertness must be asserted, not assumed.",
      "driverAction": "ADOPTED — R4 asserts exactly 3 applies at frame 0 (S1 battle-start, 3 allies) AND recurring applies at t=30/60/90/120/150 (S2 interval:30), plus byte-identical totals on removal of both.",
      "verified": "frame-0 apply count = 3; recurring distinct frames (sec) = [30,60,90,120,150]; noParts.totals === base.totals (byte-identical)."
    }
  ],
  "finalTestStatus": {
    "file": "scripts/tests/units/rosanna-chic-ocean.test.ts",
    "result": "17 passed | 1 documented skip (R5 unmodeled part-destroy) | 0 failed",
    "verifyLog": "scripts/kit-autonomy/reviews/rosanna-chic-ocean.verify.txt",
    "greenVsShipped": true,
    "counterfactualsRed": [
      "cfContinuous (invented passive dur999): 179 ticks from t=1 != 75/t=31",
      "cfDotLvl9 (67.2): atkPct [67.2] != [70.4]",
      "cfFbEnter (fullBurstEnter): apply on 5 FB-start frames != 9 burstCast frames",
      "cfNoSust (sustained removed): DoT dmgUp {1.0} only, total drops",
      "cfSustLvl9 (19.4): applied value [19.4] != [20.32]",
      "cfNoTaken (taken removed): DoT taken {1.0} only, total drops",
      "cfTakenLvl9 (30.76): applied value [30.76] != [32.23]",
      "cfNoParts (both parts removed): totals byte-identical (inert proof)"
    ]
  },
  "verdict": "GO (cross-family corroborated) — reviewer converged on all dispositions; 3 recommended discriminators adopted and verified GREEN vs shipped / RED vs counterfactual."
}

```


==========================================================================================
## SECTION 5 — S5 BLIND POST-OP TEST (claude-opus-5, written from prose alone)
==========================================================================================

/**
 * rosanna-chic-ocean — Rosanna: Chic Ocean (AR / Wind / Supporter / Burst II)
 *
 * BLIND post-op spec test: written from the kit prose ALONE (no sight of the driver's
 * override, tests, or reasoning). One assertion group per kit line.
 *
 * KIT — structural read (header / scope clause / stat keyword before the arrow):
 *   skill1 #1  "Activates at the start of battle" + "Affects all allies" +
 *              "Damage to Parts \u25b2 24.26%" for 15 sec
 *              -> ally buff, stat partsDamagePct. Parsed-but-INERT in v1 (partless boss).
 *   skill1 #2  "Activates when an ally or self destroys an enemy's part" + allies +
 *              "ATK \u25b2 3% of the skill user's ATK", 5 stacks, 30 sec
 *              -> GAP: there is no part-destruction TriggerDef primitive, AND the scope-lock
 *                 boss has no parts, so the real trigger can never fire. Belongs in
 *                 `unmodeled`; proxying it to any live trigger OVER-CREDITS the whole team.
 *   skill2 #1  no activation clause + allies + "Damage to Parts \u25b2 24.26%" 15 sec
 *              -> a SECOND, independent parts source (same magnitude, different slot). Inert.
 *   skill2 #2  "Affects the enemy nearest to the crosshair" + 70.4% of final ATK as
 *              SUSTAINED damage "every 1 sec for 15 sec", NO activation clause
 *              -> maintained DoT: intervalSec 1, flavor 'sustained', one instance at a time.
 *                 \u2691 the RE-FIRE cadence is not in the kit text (skill cooldown); what the text
 *                 does pin is (a) 1 tick/sec, (b) the line is a standing skill, not a one-shot,
 *                 and (c) it must NOT stack instances on itself.
 *   burst  #1  allies + "Sustained Damage \u25b2 20.32%" for 10 sec -> sustainedDamagePct, burstCast
 *   burst  #2  "Affects all enemies" + "Damage Taken \u25b2 32.23%" for 10 sec -> boss debuff, so the
 *                 benefit is TEAM-WIDE (not a self/ally ATK buff).
 *
 * FIXTURE: controlComp(SLUG, true) -> liter (B1) / crown (B2) / carry / helm (B3), so a burst
 * chain completes. rosanna-chic-ocean is Burst II and therefore competes with crown for stage 2;
 * the non-vacuity test below proves her burst actually casts before any burst-slot assertion is
 * trusted (a RED there is a FIXTURE diagnosis, not a kit-model finding).
 *
 * Counterfactuals are built with withPatchedOverride (committed JSON untouched) and every run is
 * hoisted — 6 full 180s sims total.
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

const SLUG = 'rosanna-chic-ocean';

// kit magnitudes, read literally off the prose
const PARTS_PCT = 24.26;
const SUSTAINED_PCT = 20.32;
const DMG_TAKEN_PCT = 32.23;

interface Run {
  res: ReturnType<typeof runComp>;
  events: any[];
  tot: Record<string, number>;
}

function run(overrides?: Record<string, unknown>): Run {
  const events: any[] = [];
  const base = controlComp(SLUG, true) as any;
  const opts: any = {
    ...base,
    cfg: { ...(base.cfg ?? {}), onEvent: (ev: SimEvent) => events.push(ev) },
  };
  if (overrides) opts.overrides = { ...(base.overrides ?? {}), ...overrides };
  const res = runComp(opts);
  return { res, events, tot: totals(res) };
}

// The override FILE is slot-keyed; the two documented shapes for a slot are a bare Block[]
// and a CharacterSkills carrying its own blocks[]. Handle both, and mutate IN PLACE so the
// patch lands whichever shape the clone has.
function slotBlocks(ov: any, slot: 'skill1' | 'skill2' | 'burst'): any[] {
  const s = ov?.[slot];
  if (!s) return [];
  if (Array.isArray(s)) return s;
  return Array.isArray(s.blocks) ? s.blocks : [];
}
function allBlocks(ov: any): any[] {
  return (['skill1', 'skill2', 'burst'] as const).flatMap((s) => slotBlocks(ov, s));
}

const dmg = (evs: any[]) => evs.filter((e) => e.kind === 'damage');
const buffs = (evs: any[], stat: string, value?: number) =>
  evs.filter(
    (e) =>
      e.kind === 'buffApply' &&
      e.stat === stat &&
      (value === undefined || Math.abs(e.value - value) < 0.01),
  );
const rel = (after: number, before: number) => (after - before) / before;

// ---- counterfactual overrides -------------------------------------------------------------

// Parts buffs blown up 400x: if partsDamagePct were wired to a live damage path, totals move.
const OV_PARTS_BOOST = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of allBlocks(ov))
    for (const e of b.effects ?? [])
      if (e.kind === 'buff' && e.stat === 'partsDamagePct') e.value = PARTS_PCT * 400;
});

// DoT deleted: the damage-event COUNT delta vs base IS the tick count (slot-attribution free).
const OV_NO_DOT = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of allBlocks(ov))
    if (Array.isArray(b.effects)) b.effects = b.effects.filter((e: any) => e.kind !== 'dot');
});

// Boss debuff deleted.
const OV_NO_DMG_TAKEN = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of allBlocks(ov))
    if (Array.isArray(b.effects))
      b.effects = b.effects.filter(
        (e: any) => !(e.kind === 'buff' && e.stat === 'damageTakenPct'),
      );
});

// Sustained Damage buff blown up: must move sustained-flavored damage ONLY.
const OV_SUSTAINED_BOOST = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of allBlocks(ov))
    for (const e of b.effects ?? [])
      if (e.kind === 'buff' && e.stat === 'sustainedDamagePct') e.value = 400;
});

// Sustained Damage window stretched 10s -> 120s: discriminates "for 10 sec" from permanent.
const OV_SUSTAINED_LONG = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of allBlocks(ov))
    for (const e of b.effects ?? [])
      if (e.kind === 'buff' && e.stat === 'sustainedDamagePct') e.durationSec = 120;
});

// ---- hoisted runs (6 x 180s) --------------------------------------------------------------

const BASE = run();
const PARTS = run({ [SLUG]: OV_PARTS_BOOST });
const NODOT = run({ [SLUG]: OV_NO_DOT });
const NODT = run({ [SLUG]: OV_NO_DMG_TAKEN });
const SUSBOOST = run({ [SLUG]: OV_SUSTAINED_BOOST });
const SUSLONG = run({ [SLUG]: OV_SUSTAINED_LONG });

const ALLIES = Object.keys(BASE.tot);
const TEAMMATES = ALLIES.filter((s) => s !== SLUG);

describe('rosanna-chic-ocean — fixture sanity', () => {
  it('the carry is in the comp and deals damage', () => {
    expect(ALLIES).toContain(SLUG);
    expect(unitOf(BASE.res, SLUG).totalDamage).toBeGreaterThan(0);
    // 4-unit control comp: liter / crown / carry / helm
    expect(ALLIES.length).toBe(4);
  });
});

describe('skill1 #1 + skill2 #1 — "Damage to Parts \u25b2 24.26%" x2, all allies, 15 sec', () => {
  const applies = buffs(BASE.events, 'partsDamagePct', PARTS_PCT);

  it('lands on EVERY ally (scope = all allies, self included)', () => {
    // Nearest-wrong: self-only or excludeSelf scoping -> coverage set is short.
    expect(applies.length).toBeGreaterThan(0);
    const covered = new Set(applies.map((e) => e.targetSlug));
    for (const s of ALLIES) expect(covered.has(s)).toBe(true);
  });

  it('BOTH parts lines are encoded — no silent drop of the duplicate source', () => {
    // The kit carries the SAME magnitude twice (skill1 and skill2). Two ally-wide sources =>
    // at least 2 applications per ally. Nearest-wrong: one line dropped as "already covered"
    // -> exactly one apply per ally. (Bookkeeping check: partsDamagePct is damage-inert, so a
    // RED here is a completeness divergence, not a damage error.)
    expect(applies.length).toBeGreaterThanOrEqual(2 * ALLIES.length);
  });

  it('is damage-inert on the partless scope-lock boss', () => {
    // Nearest-wrong: encoded as attackDamagePct / trueDamagePct "because parts are inert anyway"
    // -> a 400x boost would explode the board. Faithful: partsDamagePct moves nothing.
    for (const s of ALLIES) expect(PARTS.tot[s]).toBe(BASE.tot[s]);
  });
});

describe('skill1 #2 — part-destruction ATK stacks (GAP)', () => {
  it.skip('GAP: "ATK \u25b2 3% of the skill user\'s ATK", 5 stacks, 30 sec — trigger is "an ally or self destroys an enemy\'s part". No part-destruction TriggerDef primitive exists and the scope-lock boss is partless, so the payload is structurally unobservable; it belongs in `unmodeled`.', () => {
    /* unreachable by construction */
  });

  it('is NOT proxied onto a live trigger (no over-credit)', () => {
    // Her casterIdx is identified from her own 24.26% parts applies (a magnitude no other
    // control-comp unit carries). Nearest-wrong: the stack line keyed to fullBurstEnter /
    // hitCount / passive-at-cap -> a caster-scaled ATK grant from HER index appears.
    const partsApplies = buffs(BASE.events, 'partsDamagePct', PARTS_PCT);
    expect(partsApplies.length).toBeGreaterThan(0);
    const rosIdx = partsApplies[0].casterIdx;
    expect(rosIdx === null || rosIdx === undefined).toBe(false);

    const fromHer = BASE.events.filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.casterIdx === rosIdx &&
        (e.stat === 'casterAtkPct' || e.stat === 'atkPct' || e.stat === 'highestAllyAtkPct'),
    );
    expect(fromHer).toEqual([]);
  });
});

describe('skill2 #2 — 70.4% of final ATK sustained, every 1 sec for 15 sec, nearest enemy', () => {
  const dotTicks = dmg(BASE.events).length - dmg(NODOT.events).length;

  it('ticks ~1/sec and is MAINTAINED across the fight, without stacking instances', () => {
    // The DoT-removal counterfactual makes the tick count slot-attribution-free.
    // Nearest-wrong #1: read as a ONE-SHOT 15s DoT (passive, fires once) -> ~15 ticks.
    // Nearest-wrong #2: repeating trigger + 15s duration that MULTIPLIES (the engine never
    //   dedups DoT instances) -> many hundreds/thousands of ticks.
    // Faithful (maintained, one instance at a time, 180s fight): ~150-180 ticks.
    expect(dotTicks).toBeGreaterThanOrEqual(100);
    expect(dotTicks).toBeLessThanOrEqual(200);
  });

  it('the DoT is real damage on her own row, and inert on teammates', () => {
    // Nearest-wrong: DoT authored on the wrong owner / as an ally-wide effect.
    expect(NODOT.tot[SLUG]).toBeLessThan(BASE.tot[SLUG]);
    expect(rel(NODOT.tot[SLUG], BASE.tot[SLUG])).toBeLessThan(-0.01);
    for (const s of TEAMMATES) expect(NODOT.tot[s]).toBe(BASE.tot[s]);
  });

  it('is SUSTAINED-flavored — her own "Sustained Damage \u25b2" moves it', () => {
    // Cross-line discriminator: the only sustained-flavored damage in the comp is this DoT,
    // and the only sustainedDamagePct source is her burst. Nearest-wrong: DoT written with no
    // flavor (or flavor 'true'/'distributed') -> a 400% Sustained Damage buff moves nothing.
    expect(SUSBOOST.tot[SLUG]).toBeGreaterThan(BASE.tot[SLUG]);
    expect(rel(SUSBOOST.tot[SLUG], BASE.tot[SLUG])).toBeGreaterThan(0.01);
  });
});

describe('burst — Sustained Damage \u25b2 20.32% (allies) + Damage Taken \u25b2 32.23% (all enemies), 10 sec', () => {
  const dtApplies = BASE.events.filter(
    (e) =>
      e.kind === 'buffApply' &&
      e.stat === 'damageTakenPct' &&
      Math.abs(e.value - DMG_TAKEN_PCT) < 0.01,
  );
  const susApplies = buffs(BASE.events, 'sustainedDamagePct', SUSTAINED_PCT);

  it('NON-VACUITY: she is Burst II and actually casts in this fixture', () => {
    // She shares stage 2 with crown. If this is RED, every burst assertion below is vacuous
    // and the FIXTURE is at fault (needs a comp where she owns stage 2), not the kit model.
    expect(dtApplies.length).toBeGreaterThan(0);
    expect(susApplies.length).toBeGreaterThan(0);
  });

  it('"Damage Taken \u25b2 32.23%" is a BOSS debuff (null caster + null target)', () => {
    // Nearest-wrong: modeled as an ally-side attackDamagePct -> it would carry a real
    // casterIdx/targetIdx and would not be boss-held.
    for (const e of dtApplies) {
      expect(e.casterIdx).toBeNull();
      expect(e.targetIdx).toBeNull();
    }
  });

  it('the boss debuff benefits the WHOLE team, not one unit', () => {
    // Nearest-wrong (taxonomy 4): "Damage Taken \u25b2" read as a self/caster buff -> only her row
    // moves. Faithful: removing it costs EVERY ally damage.
    for (const s of ALLIES) expect(NODT.tot[s]).toBeLessThan(BASE.tot[s]);
  });

  it('"Sustained Damage \u25b2 20.32%" lands on all allies at its raw percentage', () => {
    // Plain percentage stat -> value stays 20.32 (not flat-resolved like casterAtkPct).
    // Nearest-wrong: self-only scope -> coverage set is short.
    const covered = new Set(susApplies.map((e) => e.targetSlug));
    for (const s of ALLIES) expect(covered.has(s)).toBe(true);
  });

  it('is SCOPED to sustained damage — teammates (no sustained damage) do not move', () => {
    // Nearest-wrong: encoded as generic attackDamagePct -> a 400% boost would lift liter/crown/
    // helm too. Faithful: only her sustained DoT is eligible.
    for (const s of TEAMMATES) {
      expect(Math.abs(rel(SUSBOOST.tot[s], BASE.tot[s]))).toBeLessThan(0.001);
    }
  });

  it('duration is a 10-SECOND wall-clock window, not permanent', () => {
    // Stretching the window 10s -> 120s must ADD sustained-boosted DoT ticks.
    // Nearest-wrong: authored with no durationSec (permanent) -> imposing 120s cannot increase
    // her total (it can only cap an already-permanent buff).
    expect(SUSLONG.tot[SLUG]).toBeGreaterThan(BASE.tot[SLUG]);
  });
});



==========================================================================================
## SECTION 5b — S5 blind test run vs DRIVER override (driver-reported; verify by tracing the artifacts)
==========================================================================================

Run result: 7 passed | 7 failed | 1 skipped (15 total).
DRIVER CLASSIFICATION OF THE 7 FAILURES (judge: verify against the artifacts + mechanics SSOT, do not take this on faith):
- 5 are FIXTURE-DEGENERACY: the blind test uses controlComp('rosanna-chic-ocean', true) = liter(B1)/crown(B2)/rosanna-chic-ocean(carry slot)/helm(B3). rosanna-chic-ocean is Burst II and competes with crown for stage 2; crown monopolizes all 10 B2 casts, so rosanna-chic-ocean casts 0 times → her burst buffs (sustainedDamagePct, damageTakenPct) never apply, making the non-vacuity, whole-team-taken, sustained-coverage, sustained-flavor, and 10s-window assertions no-ops. The blind writer's OWN non-vacuity canary flags this as a FIXTURE fault ("the FIXTURE is at fault, not the kit model").
  RECONCILIATION PROOF: re-running the blind test's assertions in a fixture where rosanna-chic-ocean OWNS B2 (liter/rosanna-chic-ocean/ada, 9 casts) flips 6/7 failures GREEN: non-vacuity (dtApplies=9, susApplies=27), whole-team taken debuff (all allies drop on removal), sustained all-ally coverage (ada/liter/rosanna-chic-ocean), sustained-flavor scoping (400x boost raises rosanna-chic-ocean only, teammates inert <0.1%), 10s window (stretching to 120s raises rosanna-chic-ocean), DoT-on-own-row (removal drops rosanna-chic-ocean -19.0%).
- 1 is the CADENCE DIVERGENCE: the blind test asserts 100-200 DoT ticks (continuous-maintenance assumption, because the re-fire cadence is "outside the input domain" blind). The driver override produces 75 ticks (5 windows × 15) using the datamined skillCooldownsSec.skill2 = 30 (ground truth, Section 3) per the owner ruling. The blind S6 override-writer independently made the same blind assumption (interval sec:15 = self-tiling continuous) and flagged it as the "dominant magnitude lever" with recipe "read the datamined skillCooldownsSec → set sec to it" — which resolves to the driver's CD=30.
- 1 is a BLIND MODELING ASSUMPTION: the blind test asserts teammate totals are BYTE-identical when the DoT is removed, but DoT ticks generate burst gauge, so removing them shifts the rotation slightly and perturbs teammate totals by a tiny amount (gauge coupling). Not a driver faithfulness issue.
The 7 PASSED include the substantive faithfulness checks: parts inert under 400x boost (byte-identical totals), both parts lines encoded (>=2 applies/ally), part-destroy NOT proxied onto any live trigger (no casterAtkPct/atkPct from her index), damageTakenPct is boss-held (casterIdx AND targetIdx null), sustainedDamagePct scoped to sustained (teammates don't move under 400x boost).


==========================================================================================
## SECTION 6 — S6 BLIND POST-OP OVERRIDE (claude-opus-5, written from prose alone)
==========================================================================================

```json
{
  "slug": "rosanna-chic-ocean",
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
          "stat": "partsDamagePct",
          "value": 24.26,
          "durationSec": 15
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "interval",
        "sec": 15
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "partsDamagePct",
          "value": 24.26,
          "durationSec": 15
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "interval",
        "sec": 15
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "dot",
          "atkPct": 70.4,
          "durationSec": 15,
          "intervalSec": 1,
          "flavor": "sustained"
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
          "stat": "sustainedDamagePct",
          "value": 20.32,
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
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "damageTakenPct",
          "value": 32.23,
          "durationSec": 10
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [
      "Activates when an ally or self destroys an enemy's part. Affects all allies. ATK ▲ 3% of the skill user's ATK, stacks up to 5 time(s) and lasts for 30 sec. — TriggerDef has no part-destruction kind and the v1 scope-lock boss is partless, so the condition is unreachable in scope; NOT a defensive skip. Would be worth up to +15% of caster ATK (flat) to all allies in parts content."
    ],
    "skill2": [],
    "burst": []
  },
  "caveats": [
    "⚑ skill2 cadence: the kit text gives NO activation clause for either skill2 line, so both are keyed to interval sec:15 (first fire t=15s) as a convention. The real datamined skillCooldownsSec was not available in blind mode. If the true CD is < 15s the 15s DoT instances OVERLAP (engine appends, never refreshes) and sustained damage MULTIPLIES; if > 15s there are DoT-free gaps. This is the single largest magnitude risk in this override.",
    "⚑ skill2 DoT first-fire phase (t=CD vs t=0) is a convention, not a measurement — t=0 vs t=15 is one full 15-tick instance of total damage on a 3-minute fight.",
    "⚑ DoT crit left OFF (global DOT_CRIT default-OFF; crit is opt-in only where measured). Not measured for this unit.",
    "⚑ skill1 part-destruction ATK stack unmodeled (see unmodeled.skill1) — this is a real team-wide flat-ATK buff, inert only because the scope boss has no parts.",
    "Both partsDamagePct buffs (skill1 + skill2, 24.26% each) are parsed but INERT in v1 (partless boss). Kept for kit completeness / future consumers; they move no damage today, so their trigger choice is damage-neutral.",
    "skill1's parts buff is one-shot (\"Activates at the start of battle\") — modeled as a passive with durationSec 15, i.e. live only for t=0..15s, not re-applied.",
    "noFb NOT set anywhere (FB-by-timing default ON); noRange not set (engine-automatic). No weapon-state, heal/shield/DEF/HP/lifesteal, Hit-Rate, pierce, resource/stack-currency, weapon-swap, or multi-projectile lines exist in this kit — nothing auto-skipped."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Rosanna: Chic Ocean (AR/Wind/Supporter/Burst II) is a support with exactly one damage channel of her own: the skill2 sustained DoT (70.4% of final ATK/sec for 15s on the nearest enemy). Her offensive team contribution is the burst pair — Sustained Damage ▲20.32% to all allies (additive Damage-Up bucket, so it lifts every ally's sustained-flavored damage including her own DoT) and a boss debuff Damage Taken ▲32.23%, both 10s and both keyed to burstCast (her own burst block carries no \"entering Full Burst\" clause, so keying them to fullBurstEnter would over-credit in any multi-B2 rotation). The two Damage to Parts ▲24.26% lines are modeled but inert on the partless v1 boss. The skill1 part-destruction ATK-stack line (3% of caster ATK ×5, 30s, all allies) is unreachable in v1 scope and is recorded verbatim in unmodeled rather than approximated with an invented trigger. Load-bearing unknown: the skill2 cooldown, which sets both DoT cadence and whether DoT instances tile or overlap."
}
```


==========================================================================================
## SECTION 6b — S6 blind override DIFF vs driver override (driver-reported; verify)
==========================================================================================

Structurally IDENTICAL on every line: S1 parts (passive/allies/partsDamagePct 24.26/15s), burst sustainedDamagePct (burstCast/allies/20.32/10s), burst damageTakenPct (burstCast/enemy/32.23/10s), S2 DoT (dot 70.4/15s/intervalSec 1/flavor sustained), S1 part-destroy → unmodeled (casterAtkPct 3 ×5 /30s, trigger never fires partless).
ONLY DIFFERENCE: skill2 interval CD — blind = sec:15 (a blind convention chosen to match the 15s durations, "self-tiling no overlap no gap", because the datamined skillCooldownsSec was withheld in blind mode); driver = sec:30 (the datamined skillCooldownsSec.skill2 = 30, ground truth Section 3, per owner ruling 2026-07-20). The blind writer flagged this exact field as its #1 flag ("the dominant magnitude lever on her whole output") with recipe "Read the unit's datamined skillCooldownsSec (skill-2 entry) and set sec to it" — which resolves to the driver's value. Consequence of the difference: blind CD15+dur15 = continuous self-tiling (~180 ticks, 100% uptime); driver CD30+dur15 = 5 windows × 15 = 75 ticks (50% uptime).


==========================================================================================
## SECTION 7 — DRIVER IMPLEMENTATION: scripts/tests/units/rosanna-chic-ocean.test.ts
==========================================================================================

// PER-UNIT KIT SPEC — `rosanna-chic-ocean` (Rosanna: Chic Ocean, Supporter/AR/Wind, Burst II,
// cd 20s, ammo 60). The AR/Wind variant — a DIFFERENT unit from the MG/Electric base (slug
// `rosanna`); never conflate them (P0). Kit-autonomy gauntlet 2026-07-25.
//
// One assertion group per KIT LINE (R1..R5 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters['rosanna-chic-ocean'].skills):
//   S1 ■ start of battle → all allies: Damage to Parts ▲24.26% for 15 sec                 [R4 inert]
//      ■ ally/self destroys an enemy part → all allies: ATK ▲3% of caster ATK, ×5, 30s    [R5 UNMODELED]
//   S2 ■ (CD 30s) all allies: Damage to Parts ▲24.26% for 15 sec                          [R4 inert]
//      ■ (CD 30s) enemy nearest crosshair: 70.4% of FINAL ATK as sustained dmg /1s for 15s [R1 LOAD-BEARING]
//   BU ■ all allies: Sustained Damage ▲20.32% for 10 sec                                  [R2 LOAD-BEARING]
//      ■ all enemies: Damage Taken ▲32.23% for 10 sec                                     [R3 LOAD-BEARING]
//
// She is a PARTS-support buffer; against the partless scope-lock boss both Damage-to-Parts buffs
// (R4) and the part-destroy ATK stacks (R5) are INERT, so she is EXPECTED to look weak here —
// faithful, not a bug. Her ONLY damage is the S2 sustained DoT (R1); her burst (R2/R3) amplifies
// it (sustainedDamagePct feeds the sustained-flavored DoT) and the whole team (damageTakenPct).
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   R1  the ⚑2 cadence resolution: skill2 has NO activation clause in the kit text, so the
//       datamined skillCooldownsSec.skill2 = 30 is the re-activation CD → auto-cast every 30s,
//       each cast a 15s window, FIRST fire at t=CD (no "Forcefully uses Skill 2" clause, so no
//       force-cast to t=0). That is 5 windows [31-45]…[151-165] = 75 ticks at exactly 1 tick/sec.
//       The REPLACED encoding (the invented passive-continuous "ONE passive instance dur 999",
//       100% uptime) would tick ~179× starting at t=1 — the counterfactual proves the 75/t=31 pin
//       is one it provably fails (and an interval+durationSec:15 overlap trap with CD<15s would
//       stack ~2 ticks/sec — the absolute cadence assertion kills that too). A lvl-9 magnitude
//       (67.2) keeps 75 ticks but moves atkPct — the second counterfactual.
//   R2  sustainedDamagePct is live ONLY because the DoT is flavored `sustained`: in-window DoT
//       ticks carry mult.dmgUp 1.2032, out-of-window 1.0, while her AR NORMAL shots NEVER carry
//       1.2032 (flavor-scoped — kills the attackDamagePct misread, which would lift every shot).
//       TRIGGER IDENTITY: the line fires on HER OWN burstCast (cd 20s), not fullBurstEnter — pinned
//       by application-frame timing: the buff lands on each of her 9 burstCast frames (each BEFORE
//       the FB window opens), whereas fullBurstEnter would land on the 5 fullBurstStart frames.
//       (A co-B2 divergence fixture is degenerate here — crown monopolizes every B2 cast, leaving
//       rosanna 0 casts — so cast-frame timing is the load-bearing discriminator.) Value 20.32 not
//       the lvl-9 19.4.
//   R3  damageTakenPct is a taken-bucket DEBUFF on the BOSS (targetIdx null, casterIdx null — the
//       engine attributes no caster to an enemy debuff, so filter by stat+value, NOT indices):
//       in-window DoT ticks carry mult.taken 1.3223. Same burstCast trigger identity as R2 (applies
//       on her cast frames). Removing it collapses to 1.0 and drops her total. Value 32.23 not
//       lvl-9 30.76.
//   R4  partsDamagePct must be EXACTLY inert vs the partless boss — byte-identical totals for every
//       unit on removal (not "small"), while the buffApply events still fire (the encoding is live,
//       just damage-inert). The two copies stay DISTINCT blocks: S1 applies once at frame 0
//       (battle-start), S2 recurs on the 30s CD — both asserted. Same inertness shape as helm H4.
//   R5  the part-destroy ATK stacks (3% caster ATK ×5 to all allies) are genuinely-skippable here:
//       the trigger "destroys an enemy's part" NEVER fires on the partless boss. Documented, not
//       asserted — but ⚑ a BIG hidden lever (casterAtkPct — flat 3% of HER ATK, not atkPct — ×5 =
//       15% to ALL allies) on parts bosses.
//
// Fixture: a minimal legal chain so the B2 under test actually CASTS — liter (B1) /
// rosanna-chic-ocean (B2) / ada (B3), forced-neutral boss (no elemental major confounds the
// sustained/taken bucket reads), focus ada. Deterministic (no seed). rosanna-chic-ocean is slot 1.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const SLUGS = ['liter', 'rosanna-chic-ocean', 'ada'] as const;
const RCO = 1; // slot index of rosanna-chic-ocean in SLUGS
const ALL_ALLIES = [0, 1, 2];

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: [...SLUGS],
    bossElement: null,
    focusSlug: 'ada',
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
/** rosanna's sustained DoT ticks (her only damage line). */
const rcoDot = (evs: SimEvent[]) =>
  dmg(evs).filter(
    (d) => d.slug === 'rosanna-chic-ocean' && d.srcSlot === 'skill2',
  );
/** rosanna's AR normal-shot damage. */
const rcoNormals = (evs: SimEvent[]) =>
  dmg(evs).filter(
    (d) => d.slug === 'rosanna-chic-ocean' && d.bucket === 'normal',
  );
const buffDurSec = (b: BuffApply) =>
  b.expiresFrame == null ? null : (b.expiresFrame - b.frame) / FPS;
/** Distinct frames rosanna cast her burst. */
const rcoCastFrames = (evs: SimEvent[]) =>
  evs
    .filter(
      (e): e is BurstCast =>
        e.kind === 'burstCast' && e.slug === 'rosanna-chic-ocean',
    )
    .map((b) => b.frame)
    .sort((a, b) => a - b);
/** Distinct frames a Full Burst window opened. */
const fbStartFrames = (evs: SimEvent[]) =>
  evs
    .filter((e) => e.kind === 'fullBurstStart')
    .map((e) => e.frame)
    .sort((a, b) => a - b);
/** Distinct frames rosanna applied a given stat. */
const applyFrames = (evs: SimEvent[], stat: string, byCaster = true) =>
  [
    ...new Set(
      buffs(evs)
        .filter((b) => b.stat === stat && (!byCaster || b.casterIdx === RCO))
        .map((b) => b.frame),
    ),
  ].sort((a, b) => a - b);

// ---- counterfactuals (nearest wrong model each pin must discriminate against) -----------------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);
const dotBlock = (ov: any) => {
  const b = ov.skill2.find((x: any) =>
    x.effects.some((e: any) => e.kind === 'dot'),
  );
  if (!b)
    throw new Error(
      'rosanna-chic-ocean S2 dot block missing — fixture is stale',
    );
  return b;
};
const dotEffect = (ov: any) => {
  const e = dotBlock(ov).effects.find((x: any) => x.kind === 'dot');
  if (!e)
    throw new Error(
      'rosanna-chic-ocean S2 dot effect missing — fixture is stale',
    );
  return e;
};

/** R1 counterfactual: the REPLACED invented encoding — passive-continuous, 100% uptime (dur 999). */
const cfContinuous = withPatchedOverride('rosanna-chic-ocean', (ov) => {
  dotBlock(ov).trigger = { kind: 'passive' };
  dotEffect(ov).durationSec = 999;
});
/** R1 counterfactual: lvl-9 magnitude 67.2 (keeps the cadence, moves the per-tick ATK%). */
const cfDotLvl9 = withPatchedOverride('rosanna-chic-ocean', (ov) => {
  dotEffect(ov).atkPct = 67.2;
});
/** R2/R3 counterfactual: burst trigger re-keyed to fullBurstEnter (trigger-identity misread). */
const cfFbEnter = withPatchedOverride('rosanna-chic-ocean', (ov) => {
  for (const b of ov.burst) b.trigger = { kind: 'fullBurstEnter' };
});
/** R2 counterfactual: sustained Damage line removed (functional — collapses in-window dmgUp). */
const cfNoSust = withPatchedOverride('rosanna-chic-ocean', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !hasStat(b, 'sustainedDamagePct'));
  if (ov.burst.length === before)
    throw new Error(
      'rosanna-chic-ocean burst sustainedDamagePct block missing — fixture is stale',
    );
});
/** R2 counterfactual: lvl-9 value 19.4 (value pin). */
const cfSustLvl9 = withPatchedOverride('rosanna-chic-ocean', (ov) => {
  ov.burst
    .find((b: any) => hasStat(b, 'sustainedDamagePct'))
    .effects.find((e: any) => e.stat === 'sustainedDamagePct').value = 19.4;
});
/** R3 counterfactual: Damage Taken line removed (functional — collapses in-window taken). */
const cfNoTaken = withPatchedOverride('rosanna-chic-ocean', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !hasStat(b, 'damageTakenPct'));
  if (ov.burst.length === before)
    throw new Error(
      'rosanna-chic-ocean burst damageTakenPct block missing — fixture is stale',
    );
});
/** R3 counterfactual: lvl-9 value 30.76 (value pin). */
const cfTakenLvl9 = withPatchedOverride('rosanna-chic-ocean', (ov) => {
  ov.burst
    .find((b: any) => hasStat(b, 'damageTakenPct'))
    .effects.find((e: any) => e.stat === 'damageTakenPct').value = 30.76;
});
/** R4 reference: both Damage-to-Parts lines removed (inert proof — totals must not move). */
const cfNoParts = withPatchedOverride('rosanna-chic-ocean', (ov) => {
  ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'partsDamagePct'));
  ov.skill2 = ov.skill2.filter((b: any) => !hasStat(b, 'partsDamagePct'));
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const continuous = run({ 'rosanna-chic-ocean': cfContinuous });
const dotLvl9 = run({ 'rosanna-chic-ocean': cfDotLvl9 });
const fbEnter = run({ 'rosanna-chic-ocean': cfFbEnter });
const noSust = run({ 'rosanna-chic-ocean': cfNoSust });
const sustLvl9 = run({ 'rosanna-chic-ocean': cfSustLvl9 });
const noTaken = run({ 'rosanna-chic-ocean': cfNoTaken });
const takenLvl9 = run({ 'rosanna-chic-ocean': cfTakenLvl9 });
const noParts = run({ 'rosanna-chic-ocean': cfNoParts });

describe('rosanna-chic-ocean (Rosanna: Chic Ocean) — kit spec', () => {
  describe('R1 — S2 sustained DoT: 70.4% final ATK /1s for 15s, re-cast on the 30s CD (first fire t=30)', () => {
    const ticks = rcoDot(base.events);

    it('is the kit magnitude, in the skill bucket off skill2', () => {
      expect(ticks.length, 'no S2 DoT ticks landed').toBeGreaterThan(0);
      expect([...new Set(ticks.map((d) => d.atkPct))]).toEqual([70.4]);
      expect([...new Set(ticks.map((d) => d.bucket))]).toEqual(['skill']);
    });

    it('ticks 75× = five 15s windows [31-45]…[151-165] at exactly 1 tick/sec, NOT continuous/overlapping', () => {
      expect(ticks.length, 'expected 5 windows × 15 ticks').toBe(75);
      const secs = ticks.map((d) => Math.round(d.sec)).sort((a, b) => a - b);
      expect(
        secs[0],
        'first tick must be t=31 (first cast t=30 + 1s), not t=1',
      ).toBe(31);
      expect(secs[secs.length - 1], 'last tick of the fifth window').toBe(165);
      // exactly five window-onsets, 30s apart
      expect([...new Set(secs.map((s) => Math.floor((s - 1) / 30)))]).toEqual([
        1, 2, 3, 4, 5,
      ]);
    });

    it('DISCRIMINATING: the invented passive-continuous (dur 999) encoding ticks ~179× from t=1', () => {
      const ct = rcoDot(continuous.events);
      expect(ct.length).not.toBe(75);
      expect(
        Math.round(ct[0].sec),
        'continuous encoding starts at t=1, not t=31',
      ).toBe(1);
    });

    it('DISCRIMINATING: a lvl-9 magnitude keeps 75 ticks but moves atkPct to 67.2', () => {
      expect([...new Set(rcoDot(dotLvl9.events).map((d) => d.atkPct))]).toEqual(
        [67.2],
      );
    });
  });

  describe('R2 — burst: all allies Sustained Damage ▲20.32% for 10s, feeds her own sustained DoT only', () => {
    const applied = buffs(base.events).filter(
      (b) => b.casterIdx === RCO && b.stat === 'sustainedDamagePct',
    );

    it('is 20.32% (not lvl-9 19.4), reaching all three allies incl. herself, for 10 sec', () => {
      expect(
        applied.length,
        'no sustainedDamagePct buff was applied',
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([20.32]);
      expect([...new Set(applied.map((b) => b.targetIdx))].sort()).toEqual(
        ALL_ALLIES,
      );
      expect([...new Set(applied.map((b) => buffDurSec(b)))]).toEqual([10]);
    });

    it('TRIGGER IDENTITY: fires on her burstCast frames (each before the FB window), NOT fullBurstEnter', () => {
      const casts = rcoCastFrames(base.events);
      expect(applyFrames(base.events, 'sustainedDamagePct')).toEqual(casts);
      // the cast lands BEFORE the FB window opens — burstCast, not the FB-entry frame
      expect(casts[0]).toBeLessThan(fbStartFrames(base.events)[0]);
      // fullBurstEnter would apply on the (fewer) FB-start frames, not her (more numerous) casts
      expect(applyFrames(fbEnter.events, 'sustainedDamagePct')).toEqual(
        fbStartFrames(fbEnter.events),
      );
      expect(applyFrames(fbEnter.events, 'sustainedDamagePct')).not.toEqual(
        casts,
      );
    });

    it('is LIVE and FLAVOR-SCOPED: lifts DoT ticks (dmgUp 1.2032) but never her AR normal shots', () => {
      expect(
        [
          ...new Set(rcoDot(base.events).map((d) => d.mult.dmgUp.toFixed(4))),
        ].sort(),
      ).toEqual(['1.0000', '1.2032']);
      // an attackDamagePct misread would lift the normals too — sustainedDamagePct must not
      expect(rcoNormals(base.events).length).toBeGreaterThan(0);
      expect([
        ...new Set(rcoNormals(base.events).map((d) => d.mult.dmgUp.toFixed(4))),
      ]).toEqual(['1.0000']);
    });

    it('DISCRIMINATING: removing the line collapses every DoT tick to dmgUp 1.0 and drops her total', () => {
      expect([
        ...new Set(rcoDot(noSust.events).map((d) => d.mult.dmgUp.toFixed(4))),
      ]).toEqual(['1.0000']);
      expect(noSust.totals['rosanna-chic-ocean']).toBeLessThan(
        base.totals['rosanna-chic-ocean'],
      );
    });

    it('DISCRIMINATING: lvl-9 19.4 moves the applied value', () => {
      const v = buffs(sustLvl9.events).filter(
        (b) => b.casterIdx === RCO && b.stat === 'sustainedDamagePct',
      );
      expect([...new Set(v.map((b) => b.value))]).toEqual([19.4]);
    });
  });

  describe('R3 — burst: all enemies Damage Taken ▲32.23% for 10s (a taken-bucket debuff on the boss)', () => {
    const applied = buffs(base.events).filter(
      (b) => b.stat === 'damageTakenPct',
    );

    it('is 32.23% (not lvl-9 30.76), boss-held (casterIdx AND targetIdx null), for 10 sec', () => {
      expect(
        applied.length,
        'no damageTakenPct debuff was applied',
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([32.23]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([null]);
      expect([...new Set(applied.map((b) => b.casterIdx))]).toEqual([null]);
      expect([...new Set(applied.map((b) => buffDurSec(b)))]).toEqual([10]);
    });

    it('TRIGGER IDENTITY: fires on her burstCast frames, NOT fullBurstEnter', () => {
      expect(applyFrames(base.events, 'damageTakenPct', false)).toEqual(
        rcoCastFrames(base.events),
      );
      expect(applyFrames(fbEnter.events, 'damageTakenPct', false)).toEqual(
        fbStartFrames(fbEnter.events),
      );
    });

    it('is LIVE: in-window DoT ticks carry mult.taken 1.3223', () => {
      expect(
        [
          ...new Set(rcoDot(base.events).map((d) => d.mult.taken.toFixed(4))),
        ].sort(),
      ).toEqual(['1.0000', '1.3223']);
    });

    it('DISCRIMINATING: removing the line collapses every tick to taken 1.0 and drops her total', () => {
      expect([
        ...new Set(rcoDot(noTaken.events).map((d) => d.mult.taken.toFixed(4))),
      ]).toEqual(['1.0000']);
      expect(noTaken.totals['rosanna-chic-ocean']).toBeLessThan(
        base.totals['rosanna-chic-ocean'],
      );
    });

    it('DISCRIMINATING: lvl-9 30.76 moves the applied value', () => {
      const v = buffs(takenLvl9.events).filter(
        (b) => b.stat === 'damageTakenPct',
      );
      expect([...new Set(v.map((b) => b.value))]).toEqual([30.76]);
    });
  });

  describe('R4 — S1/S2 Damage to Parts ▲24.26% is exactly inert vs the partless boss (kept for fidelity)', () => {
    const applied = buffs(base.events).filter(
      (b) => b.casterIdx === RCO && b.stat === 'partsDamagePct',
    );

    it('the encoding is LIVE: 24.26% reaches all three allies for 15 sec', () => {
      expect(
        applied.length,
        'no partsDamagePct buff was applied',
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([24.26]);
      expect([...new Set(applied.map((b) => b.targetIdx))].sort()).toEqual(
        ALL_ALLIES,
      );
      expect([...new Set(applied.map((b) => buffDurSec(b)))]).toEqual([15]);
    });

    it('keeps S1 (one-shot at battle start) and S2 (recurring on the 30s CD) as DISTINCT blocks', () => {
      // S1: exactly one application per ally at frame 0
      expect(
        applied.filter((b) => b.frame === 0).length,
        'S1 battle-start apply to 3 allies',
      ).toBe(3);
      // S2: recurring applications at t=30,60,90,120,150 (the interval:30 cadence)
      const recurSec = [
        ...new Set(
          applied.filter((b) => b.frame > 0).map((b) => b.frame / FPS),
        ),
      ].sort((a, b) => a - b);
      expect(recurSec).toEqual([30, 60, 90, 120, 150]);
    });

    it("removing BOTH parts lines changes NO unit's total by a single point", () => {
      expect(noParts.totals).toEqual(base.totals);
    });
  });

  describe('R5 — S1 part-destroy ATK stacks (×5 to all allies) are UNMODELED here', () => {
    it.skip('trigger "destroys an enemy\'s part" never fires on the partless boss — genuinely skippable', () => {
      // Not assertable in the scope-lock basis: the part-destroy trigger has no firing opportunity
      // against a partless boss, so the line contributes nothing and is correctly documented in the
      // override's `unmodeled`. ⚑ BIG hidden lever on parts bosses: casterAtkPct (flat 3% of HER
      // ATK, not atkPct) ×5 = 15% to ALL allies (out-of-domain for this basis; estimate + recipe in
      // the override note).
    });
  });
});



==========================================================================================
## SECTION 7b — DRIVER IMPLEMENTATION: src/skills/overrides/rosanna-chic-ocean.json
==========================================================================================

```json
{
  "note": "Kit-autonomy gauntlet 2026-07-25: VALIDATED faithful (cross-family S2b claude-fable-5 / S5-S6-S7 claude-opus-5 converged; scripts/tests/units/rosanna-chic-ocean.test.ts pins every load-bearing line GREEN vs shipped, RED vs counterfactual). rosanna-chic-ocean (Rosanna: Chic Ocean, AR/Wind/Supporter/B2) — parts-support BUFFER; most of her kit value (both Damage-to-Parts buffs + the part-destroy ATK stacks) is INERT vs the partless scope-lock boss, so she is EXPECTED to look weak here (faithful, not a bug). MODELED: S1a battle-start allies partsDamagePct 24.26 ×15s (inert v1, kept for fidelity/future parts consumer). S2a allies partsDamagePct 24.26 ×15s on the interval:30 CD (inert; a DISTINCT block from S1's one-shot — S1 applies once at frame 0, S2 recurs at t=30/60/90/120/150). S2b sustained DoT on the boss: 70.4% caster FINAL ATK per 1s tick, 15s window, re-cast on the skill2 CD — encoded as interval:30 + dot durationSec:15 (first fire t=30, no force-cast clause) ⇒ 5 windows [31-45]…[151-165] = 75 ticks at exactly 1 tick/sec; flavor 'sustained' so the burst's sustainedDamagePct feeds it (in-window DoT ticks carry dmgUp 1.2032). Burst (burstCast — fires on HER OWN cast frames, NOT fullBurstEnter; the cast lands before the FB window opens): allies sustainedDamagePct 20.32 ×10s (feeds her own sustained DoT + DoT teammates; FLAVOR-SCOPED — lifts sustained damage only, never her AR normal shots) + boss damageTakenPct 32.23 ×10s (taken-bucket DEBUFF, boss-held with casterIdx AND targetIdx null, team-wide ×1.3223 in-window). SKIPPED→unmodeled: S1b part-destroy ATK stacks (trigger 'destroys an enemy's part' NEVER fires vs the partless boss — genuinely-skippable class; see ⚑3). ⚑1 cadence tuple: AR pulls/s + reloadFrames 81 + rolling-reload unverified (datamine estimate; no text tell of a special fire mode — 60 ammo empties in ~5s at class rate, plausible). ⚑2 S2 activation/uptime RESOLVED 2026-07-20 (owner) + VALIDATED 2026-07-25 (gauntlet): the datamined skillCooldownsSec.skill2 = 30 is the real re-activation CD → skill2 auto-casts every 30s, each cast a 15s window, first fire t=CD (no 'Forcefully uses Skill 2' clause, unlike sakura-bloom-in-summer, so no force-cast to t=0). This REPLACED an earlier invented passive-continuous (100% uptime, ONE passive instance dur 999) encoding — DoT uptime is 75s (5×15), NOT 180s continuous; the continuous counterfactual ticks ~179× from t=1 and is discriminated by the test. ⚑3 (OUT-OF-DOMAIN, parts bosses) S1b part-destroy stacks — estimate: casterAtkPct 3%×5 = 15% of HER ATK to ALL allies (a BIG hidden lever on parts bosses); recipe: encode as a part-destroy-triggered casterAtkPct stack (maxStacks 5, durationSec 30) — NOTE the stat is casterAtkPct (flat % of the caster's ATK), NOT atkPct; tier: out-of-domain (requires a parts/destruction event primitive that does not exist on the partless scope-lock basis, so it cannot fire or be measured here). No noFb anywhere; burst buffs are buffs (no snapshot issue).",
  "unmodeled": {
    "skill1": [
      "■ Activates when an ally or self destroys an enemy's part. Affects all allies. ATK ▲ 3% of the skill user's ATK, stacks up to 5 time(s) and lasts for 30 sec."
    ],
    "skill2": [],
    "burst": []
  },
  "caveats": [
    "skill1: part-destroy ATK stacks (casterAtkPct 3% ×5 to all allies) are inert vs a partless boss and NOT modeled — big hidden lever on parts bosses (⚑3 out-of-domain)",
    "skill2: sustained DoT re-casts on its datamined 30s CD, 15s window each, first fire t=30 (no force-cast) — resolved 2026-07-20 (owner), validated 2026-07-25 (gauntlet); replaced an invented 100%-uptime passive-continuous encoding",
    "skill1/skill2: Damage to Parts ▲ 24.26% buffs are inert vs the partless boss (kept for fidelity; asserted byte-identical on removal)"
  ],
  "skill1": [
    {
      "slot": "skill1",
      "trigger": { "kind": "passive" },
      "target": { "kind": "allies" },
      "effects": [
        {
          "kind": "buff",
          "stat": "partsDamagePct",
          "value": 24.26,
          "durationSec": 15
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": { "kind": "interval", "sec": 30 },
      "target": { "kind": "allies" },
      "effects": [
        {
          "kind": "buff",
          "stat": "partsDamagePct",
          "value": 24.26,
          "durationSec": 15
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": { "kind": "interval", "sec": 30 },
      "target": { "kind": "enemy" },
      "effects": [
        {
          "kind": "dot",
          "atkPct": 70.4,
          "durationSec": 15,
          "intervalSec": 1,
          "flavor": "sustained"
        }
      ]
    }
  ],
  "burst": [
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "allies" },
      "effects": [
        {
          "kind": "buff",
          "stat": "sustainedDamagePct",
          "value": 20.32,
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "enemy" },
      "effects": [
        {
          "kind": "buff",
          "stat": "damageTakenPct",
          "value": 32.23,
          "durationSec": 10
        }
      ]
    }
  ]
}

```


==========================================================================================
## SECTION 7c — S2d independent verification (driver test vs shipped override)
==========================================================================================

17 passed | 1 documented skip (R5 unmodeled part-destroy) | 0 failed. Every load-bearing line pinned GREEN vs shipped, RED vs counterfactual (invented continuous dur999 → 179 ticks; lvl-9 magnitudes 67.2/19.4/30.76; burstCast-vs-fullBurstEnter timing; sustained/taken removals; parts inert byte-identical). See scripts/kit-autonomy/reviews/rosanna-chic-ocean.verify.txt.