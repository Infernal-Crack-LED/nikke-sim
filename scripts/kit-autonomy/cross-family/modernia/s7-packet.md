# RECONCILING-JUDGE PACKET — modernia (Modernia)

## SECTION 1 — RECONCILING-JUDGE CONTRACT

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


## SECTION 2 — MECHANICS SSOT

### docs/data/damage-calculation.md

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


### docs/data/game-mechanics.md

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


## SECTION 3 — GROUND TRUTH (kit prose + base stats)

Source: data/characters.json → characters.modernia (extracted verbatim).

```json
{
  "slug": "modernia",
  "name": "Modernia",
  "imageUrl": "https://sg-tools-cdn.blablalink.com/ia-77/xv-06/90c452c41a9c84fe5c308d79271dcaa4.png",
  "weapon": "MG",
  "burst": "III",
  "burstCooldownSec": 40,
  "class": "Attacker",
  "element": "Fire",
  "manufacturer": "Pilgrim",
  "normalAttackMultiplier": 7.71,
  "coreAttackMultiplier": 200,
  "ammo": 300,
  "reloadFrames": 159,
  "chargeFrames": 0,
  "chargeMultiplier": 0,
  "hitsPerShot": 2,
  "rl3": 7.1,
  "burstGaugePerShot": 0.05,
  "treasure": false,
  "skills": {
    "skill1": "■ Activates when normal attack hits. Affects the target(s).\nDeals 3.05% of final ATK as additional damage. \n■ Activates when normal attack hits 200 time(s). Affects self.\nCritical Damage ▲ 14.25%, stacks up to 5 time(s) and lasts for 10 sec.\nMax Ammunition Capacity ▼ 5.04%, stacks up to 5 time(s) and lasts for 10 sec.",
    "skill2": "■ Affects all allies. Activates when entering Full Burst.\nHit Rate ▲ 8.56% for 15 sec.\n■ Affects self. Activates when normal attack hits 200 time(s) during increasing Hit Rate status.\n ATK ▲ 29.38% for 10 sec.",
    "burst": "■ Affects all allies.\nFull Burst Duration ▲ 5 sec.\n■ Affects self.\nUnlimited ammunition for 15 sec.\nDestroy Mode:\nExtends her line of sight and auto-aims at all enemies within range. The stage target is treated as a single enemy regardless of whether it has parts (including interruption parts).\nDeals 2.24% of final ATK as damage for 15 sec."
  },
  "skillCooldownsSec": {
    "skill1": null,
    "skill2": null,
    "burst": 40
  },
  "role": {
    "weapon": {
      "shot_id": 1026001,
      "shot_detail": {
        "id": 1026001,
        "damage": 771,
        "max_ammo": 300,
        "shake_id": 1,
        "ShakeType": "Fire_MG",
        "fire_type": "Instant",
        "zoom_rate": 0,
        "input_type": "DOWN",
        "shot_count": 1,
        "ShakeWeight": 120,
        "attack_type": "Energy",
        "camera_work": "camera_work_02",
        "charge_time": 0,
        "penetration": 0,
        "reload_time": 230,
        "shot_timing": "Concurrence",
        "spot_radius": 0,
        "weapon_type": "MG",
        "is_targeting": false,
        "muzzle_count": 1,
        "rate_of_fire": 60,
        "name_localkey": "Machine Gun",
        "prefer_target": "TargetPS",
        "reload_bullet": 10000,
        "counter_enermy": "Energy_Type",
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
      "burst_duration": 1500,
      "use_burst_skill": "Step3",
      "burst_apply_delay": 1,
      "change_burst_step": "StepFull"
    },
    "skillDetails": {
      "skill1_id": 2260101,
      "skill2_id": 2260201,
      "skill1_table": "StateEffect",
      "skill2_table": "StateEffect",
      "skill1_detail": {
        "id": 2260101,
        "icon": "icn_skill_atkup_01",
        "group_id": 22601,
        "skill_level": 1,
        "name_localkey": "High-Speed Evolution",
        "next_level_id": 2260102,
        "level_up_cost_id": 10102,
        "description_localkey": "■ Activates when normal attack hits. Affects the target(s).\n<color=#00AEFF>Deals {description_value_01}% of <word_group=10025>final</word_group> ATK as additional damage.</color> \n■ Activates when normal attack hits {description_value_02} time(s). Affects self.\n<color=#00AEFF>Critical Damage ▲ {description_value_03}%, stacks up to {description_value_04} time(s) and lasts for {description_value_05} sec.\nMax Ammunition Capacity ▼ {description_value_06}%, stacks up to {description_value_07} time(s) and lasts for {description_value_08} sec.</color>",
        "description_value_list": [
          {
            "description_value": [
              "1.9",
              "2.03",
              "2.16",
              "2.29",
              "2.41",
              "2.54",
              "2.67",
              "2.8",
              "2.92",
              "3.05"
            ]
          },
          {
            "description_value": [
              "200",
              "200",
              "200",
              "200",
              "200",
              "200",
              "200",
              "200",
              "200",
              "200"
            ]
          },
          {
            "description_value": [
              "9.93",
              "10.41",
              "10.89",
              "11.37",
              "11.85",
              "12.33",
              "12.81",
              "13.29",
              "13.77",
              "14.25"
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
              "5.04",
              "5.04",
              "5.04",
              "5.04",
              "5.04",
              "5.04",
              "5.04",
              "5.04",
              "5.04",
              "5.04"
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
        "id": 2260201,
        "icon": "icn_skill_stataccuracycircle_01",
        "group_id": 22602,
        "skill_level": 1,
        "name_localkey": "Giant Leap",
        "next_level_id": 2260202,
        "level_up_cost_id": 10202,
        "description_localkey": "■ Affects all allies. Activates when entering Full Burst.\n<color=#00AEFF>Hit Rate ▲ {description_value_01}% for {description_value_02} sec.</color>\n■ Affects self. Activates when normal attack hits {description_value_03} time(s) during increasing Hit Rate status.\n<color=#00AEFF> ATK ▲ {description_value_04}% for {description_value_05} sec.</color>",
        "description_value_list": [
          {
            "description_value": [
              "5.35",
              "5.7",
              "6.06",
              "6.42",
              "6.77",
              "7.13",
              "7.49",
              "7.84",
              "8.2",
              "8.56"
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
              "200",
              "200",
              "200",
              "200",
              "200",
              "200",
              "200",
              "200",
              "200",
              "200"
            ]
          },
          {
            "description_value": [
              "18.36",
              "19.59",
              "20.81",
              "22.04",
              "23.26",
              "24.48",
              "25.71",
              "26.93",
              "28.16",
              "29.38"
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
          {}
        ],
        "info_description_localkey": "Skill 2"
      },
      "ulti_skill_id": 1260301,
      "ulti_skill_detail": {
        "id": 1260301,
        "icon": "icn_skill_c260_ult",
        "group_id": 12603,
        "shake_id": 1,
        "skill_type": "ChangeWeapon",
        "attack_type": "Fire",
        "skill_level": 1,
        "counter_type": "Metal_Type",
        "duration_type": "TimeSec",
        "name_localkey": "New World",
        "next_level_id": 1260302,
        "prefer_target": "LowHP",
        "resource_name": "c260_ulti",
        "duration_value": 1500,
        "skill_cooltime": 4000,
        "level_up_cost_id": 10302,
        "skill_value_data": [
          {
            "skill_value": 152,
            "skill_value_type": "Percent"
          },
          {
            "skill_value": 4200,
            "skill_value_type": "Integer"
          },
          {
            "skill_value": 1026002,
            "skill_value_type": "Integer"
          },
          {
            "skill_value": 0,
            "skill_value_type": "None"
          },
          {
            "skill_value": 1,
            "skill_value_type": "Integer"
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
        "description_localkey": "■ Affects all allies.\n<color=#00AEFF>Full Burst Duration ▲ 5 sec.</color>\n■ Affects self.\n<color=#00AEFF>Unlimited ammunition for {description_value_02} sec.\nDestroy Mode:\nExtends her line of sight and auto-aims at all enemies within range. The stage target is treated as a single enemy regardless of whether it has parts (including interruption parts).\nDeals {description_value_01}% of <word_group=10025>final</word_group> ATK as damage for {description_value_02} sec.</color>",
        "description_value_list": [
          {
            "description_value": [
              "1.52",
              "1.6",
              "1.68",
              "1.76",
              "1.84",
              "1.92",
              "2",
              "2.08",
              "2.16",
              "2.24"
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
          {},
          {},
          {}
        ],
        "prefer_target_condition": "None",
        "info_description_localkey": "Burst Skill",
        "after_use_function_id_list": [
          0
        ],
        "after_hurt_function_id_list": [
          0
        ],
        "before_use_function_id_list": [
          126030101
        ],
        "before_hurt_function_id_list": [
          0
        ]
      }
    },
    "statScaling": {
      "grow_grade": 426002,
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
      "piece_id": 5100260,
      "piece_detail": {
        "id": 5100260,
        "class": "Attacker",
        "order": 26000,
        "use_id": 0,
        "use_type": "None",
        "item_rare": "SSR",
        "item_type": "Piece",
        "stack_max": 9999999,
        "use_value": 0,
        "corporation": "PILGRIM",
        "resource_id": 260,
        "item_sub_type": "CharacterPiece",
        "name_localkey": "Modernia's Spare Body",
        "use_limit_count": false,
        "inventory_filter": [
          "etc"
        ],
        "corporation_sub_type": "OVERSPEC",
        "description_localkey": "Can be used for Nikkes' Limit Breaks.\nIf a Nikke's Limit Break has reached the max level, any additional Spare Bodies for that Nikke will be converted to Body Labels."
      }
    },
    "meta": {
      "id": 426001,
      "class": "Attacker",
      "order": 10144,
      "name_code": 5044,
      "corporation": "PILGRIM",
      "resource_id": 260,
      "name_localkey": "Modernia",
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
    "resourceId": 260
  }
}
```

## SECTION 4 — S2b CROSS-FAMILY TEST-FAITHFULNESS REVIEW (claude-fable-5)

```json
{
  "slug": "modernia",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "when normal attack hits … 3.05%",
      "disposition": "FAITHFUL",
      "scope": "normal-attack hits ONLY (never skill/burst procs); per-HIT, and MG hitsPerShot=2 means 2 hits per trigger pull",
      "durationSemantics": "permanent passive rider (no duration)",
      "triggerIdentity": "per normal-attack hit — engine shape is a passive self-buff of the per-hit rider stat (extraHitDamagePct 3.05), NOT a shotFired flatDamage",
      "targetSet": "damage to the enemy; the enabling buff sits on self",
      "nearestWrongModel": "flatDamage 3.05% on a shotFired trigger — fires per trigger PULL, halving proc count vs per-hit on an hitsPerShot=2 MG; or letting the rider take core",
      "distinguishingAssertion": "count damage events in the extra-hit bucket over a no-reload window: procs == 2 × shots fired (hitsPerShot=2), each valued 3.05% of final ATK; RED if procs == shots",
      "inertness": "must add zero damage on frames with no normal attack (reload gaps, pre-first-shot); must not appear in charge/burst buckets",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "hits 200 time(s) … Crit Damage ▲14.25%",
      "disposition": "FAITHFUL",
      "scope": "generic Critical Damage (unscoped — applies to any crit), self only",
      "durationSemantics": "durationSec 10 per stack, maxStacks 5, refresh on re-proc; NOT rounds",
      "triggerIdentity": "hitCount count:200 — counts HITS/rounds (2 per MG pull → 200 hits = 100 pulls), cumulative, no FB gate on this line",
      "targetSet": "self",
      "nearestWrongModel": "hitCount interpreted as 200 trigger PULLS (doubles ramp time), or stacks applied instantly at max without the 200-hit cadence",
      "distinguishingAssertion": "first buffApply {stat:critDamagePct, value:14.25} lands after exactly 100 MG pulls (200 hits ≈ a few seconds), then stacks 1→5 at 100-pull intervals with stacks field incrementing; RED if first apply at 200 pulls or stacks=5 at t≈0",
      "inertness": "no crit-damage buffApply before the 200th hit; buff must lapse (expiresFrame) if firing pauses >10s (e.g. long reload/stun) — no buffRemove event expected on natural lapse",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Max Ammunition Capacity ▼ 5.04%",
      "disposition": "FAITHFUL",
      "scope": "self weapon-state DEBUFF — this IS damage-relevant (taxonomy #6): −25.2% ammo at 5 stacks shrinks the 300-round belt to ~224, raising reload frequency and cutting shots fired",
      "durationSemantics": "durationSec 10 per stack, maxStacks 5 — same stack clock as the crit-damage line (they share the 200-hit trigger)",
      "triggerIdentity": "same hitCount:200 block as the Critical Damage line",
      "targetSet": "self",
      "nearestWrongModel": "SKIPPED as 'defensive/no damage impact' — the classic weapon-state drop; or encoded with positive sign (ammo ▲)",
      "distinguishingAssertion": "buffApply {stat:maxAmmoPct, value:-5.04 (negative)} present; with stacks live, reload events occur more often than the 300-round baseline cadence (compare inter-reload shot counts pre-stack vs at 5 stacks: ~300 vs ~224 rounds); RED if reload cadence is stack-invariant or value is positive",
      "inertness": "must NOT change per-shot damage — only shots-fired economy; inert during the burst's unlimited-ammo window (no ammo consumed there)",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "all allies … Full Burst … Hit Rate ▲8.56%",
      "disposition": "FAITHFUL",
      "scope": "team-wide stat; in this engine hitRatePct = core-hit-rate lift (hrCoreMult)",
      "durationSemantics": "durationSec 15 — note it OUTLASTS a base 10s FB; matches a 15s FB only when her own burst's +5s extension is live",
      "triggerIdentity": "fullBurstEnter — ANY team Full Burst (text says 'entering Full Burst', not 'when using Burst Skill'); no ownBurstGate",
      "targetSet": "allies including self (all 5 units get the buffApply)",
      "nearestWrongModel": "keyed to burstCast (only her own rotations — under-credits every FB another B3 chains), or duration clipped to 10s, or Hit Rate treated as inert accuracy fluff",
      "distinguishingAssertion": "on a Full Burst chained by the OTHER B3 (helm in controlComp), buffApply {stat:hitRatePct, value:8.56} still fires for all 5 targetIdx values with a 15s expiresFrame; RED under burstCast keying (no apply on helm's rotations) or under a 10s duration",
      "inertness": "the 8.56 magnitude is kit-literal, but its damage effect flows ONLY through the HR→core conversion — with HRCORE disabled the line must move nothing",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "hits 200 … during … Hit Rate status → ATK",
      "disposition": "FIX",
      "scope": "self ATK ▲ 29.38%, generic",
      "durationSemantics": "durationSec 10 — seconds, no stacking stated (single instance, refresh on re-proc)",
      "triggerIdentity": "hitCount:200 GATED on the S2a Hit Rate buff being live on self ('during increasing Hit Rate status'). The schema has no requires-self-buff gate; nearest faithful proxy is fbGate:'inFb' + hitCount:200 — exact when her own burst extends FB to 15s (HR window == FB window), diverging only on 10s FBs where HR runs 5s past FB end. Hits should COUNT only inside the status window, resetting between windows",
      "targetSet": "self",
      "nearestWrongModel": "UNGATED hitCount:200 — the counter accrues from t=0 and the ATK buff cycles all fight, including the long pre-FB and inter-FB stretches (massive ATK-uptime over-credit)",
      "distinguishingAssertion": "no buffApply {stat:atkPct, value:29.38} occurs before the first fullBurstStart despite >200 hits accruing pre-FB; first apply lands mid-FB after 200 in-status hits (~100 pulls into the window); RED if an ATK apply appears before any FB",
      "inertness": "zero ATK procs in a hypothetical no-FB context; the buff must not persist stacking — one instance, value 29.38",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "all allies … Full Burst Duration ▲ 5 sec",
      "disposition": "FAITHFUL",
      "scope": "team FB window extension",
      "durationSemantics": "one-shot window edit (+5s to the FB her cast opens), not a timed buff",
      "triggerIdentity": "burstCast (it sits in HER burst block — fires only on rotations SHE bursts), effect kind fullBurstExtend seconds:5",
      "targetSet": "allies/team (the shared FB window)",
      "nearestWrongModel": "keyed to fullBurstEnter so EVERY FB (including the other B3's rotations) runs 15s — over-credits the whole team's FB uptime in any multi-B3 comp",
      "distinguishingAssertion": "in controlComp (helm co-B3): fullBurstEnd − fullBurstStart == 15s only for windows following HER burstCast, and == 10s for windows following helm's; RED if all windows are 15s",
      "inertness": "FBs she does not cast into must stay 10s; burst cd 40s paces her rotations",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "self … Unlimited ammunition for 15 sec",
      "disposition": "FAITHFUL",
      "scope": "self weapon-state: no ammo consumption for 15s",
      "durationSemantics": "durationSec 15 — outlasting even her extended 15s FB by cast-to-FB lead time",
      "triggerIdentity": "burstCast, effect kind unlimitedAmmo",
      "targetSet": "self",
      "nearestWrongModel": "durationSec 10 (pattern-matched to base FB length), or unlimited shots still decrementing ammo (so lastBullet/reloads fire mid-window and the S1 maxAmmo▼ stays consequential inside it)",
      "distinguishingAssertion": "zero reload events for self in [cast, cast+15s] even though 15s of MG fire vastly exceeds one ~224–300-round magazine; teamAmmo-style consumption from her is zero in-window; RED if a reload lands in-window or the window ends at 10s",
      "inertness": "allies' ammo untouched; her reload cadence resumes normally after 15s",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Destroy Mode … 2.24% … damage for 15 sec",
      "disposition": "MEASUREMENT-GATED",
      "scope": "self-sourced extra damage active during the 15s Destroy Mode window",
      "durationSemantics": "15s window; the CADENCE inside it is kit-silent — ALWAYS-⚑ field 2 (damage line with no stated trigger)",
      "triggerIdentity": "⚑ AMBIGUOUS: (a) per-normal-attack-hit rider for 15s (extraHitDamagePct 2.24 self-buff, durationSec 15) — structurally parallel to S1's identically-phrased per-hit 3.05% and consistent with the unlimited-ammo spray; or (b) DoT 2.24%/s × 15 ticks. These differ by ~40–60× at MG hit rate. Must ship as a ⚑ with the per-hit reading as the estimate + a popup-count recipe to pin it",
      "targetSet": "enemy (stage target as single entity)",
      "nearestWrongModel": "dot {atkPct:2.24, durationSec:15, intervalSec:1} — 15 tiny ticks, ~2 orders of magnitude under the per-hit reading; OR silently shipping either cadence unflagged",
      "distinguishingAssertion": "during [cast, cast+15s], count 2.24%-valued damage events: per-hit reading gives ≈ 2×(pulls in window) events tracking fire cadence; DoT reading gives exactly 15 at 1s spacing regardless of firing; the event-count-vs-shot-count ratio discriminates GREEN/RED",
      "inertness": "zero 2.24% events outside the 15s window; never core-boosted; must be flagged ⚑, not silently calibrated",
      "evidenceTier": "CALIBRATED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Extends her line of sight and auto-aims",
      "disposition": "UNMODELED",
      "scope": "targeting/AI flavor; the single-enemy-regardless-of-parts clause is inert on the partless scope-lock boss (parts never change damage there anyway)",
      "durationSemantics": "15s mode window",
      "triggerIdentity": "burstCast (mode flavor)",
      "targetSet": "self targeting behavior",
      "nearestWrongModel": "inventing a partsDamagePct or multi-target model from this clause",
      "distinguishingAssertion": "no damage event, buff, or bucket may be attributed to this clause — override's unmodeled field must carry it verbatim",
      "inertness": "entire clause must move zero damage",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    }
  ],
  "loadBearingSet": [
    "skill1:per-hit 3.05% rider",
    "skill1:200-hit Crit Damage ▲14.25% ×5",
    "skill1:200-hit Max Ammunition ▼5.04% ×5",
    "skill2:FB-enter Hit Rate ▲8.56% 15s (all allies)",
    "skill2:200-hit-in-status ATK ▲29.38% 10s",
    "burst:Full Burst Duration ▲5s",
    "burst:Unlimited ammunition 15s",
    "burst:Destroy Mode 2.24% damage (⚑ cadence)"
  ],
  "unmodeledVerbatim": {
    "skill1": [],
    "skill2": [],
    "burst": [
      "Destroy Mode: Extends her line of sight and auto-aims at all enemies within range. The stage target is treated as a single enemy regardless of whether it has parts (including interruption parts)."
    ]
  },
  "notes": "Five expected shared-prior misreads to reconcile: (1) the S1 Max Ammunition ▼ is the classic 'defensive, skip it' trap — it is a weapon-state damage mechanic (−25.2% belt at 5 stacks → more reloads → fewer shots) and must be encoded NEGATIVE; note it interacts with the burst (irrelevant during unlimited ammo, fully live outside it). (2) hitCount thresholds count HITS/rounds, and MG hitsPerShot=2 means 200 hits = 100 trigger pulls — a per-pull reading doubles every ramp. (3) Burst-block lines (FB +5s, unlimited ammo) are burstCast-keyed: in the controlComp helm-co-B3 fixture, only HER rotations get 15s windows; keying fullBurstExtend to fullBurstEnter is the over-credit to test hardest. (4) S2b's ATK proc is status-gated ('during increasing Hit Rate status'); no requires-self-buff gate exists in the schema, so expect an fbGate:'inFb' proxy — the divergence case is a 10s FB (other B3's rotation) where HR outlives FB by 5s; an UNGATED encoding is flatly wrong and shows up as pre-FB ATK applies. (5) The Destroy Mode 2.24% line has NO stated cadence — per-hit vs per-second differ by ~40–60×; it must ship as a ⚑ with a popup-count recipe, and any precise unflagged value is a guess. Also verify S2a's 15s duration is preserved (not clipped to FB length) and that unlimited-ammo shots emit no reload/lastBullet events. Cross-check: her 40s burst cd vs the standard rotation cadence determines how often the burstCast lines fire in the fixture.",
  "model": "claude-fable-5"
}

```

## SECTION 5 — S5 BLIND TEST (claude-opus-5) + result vs driver override

### S5 blind test result vs the DRIVER (shipped) override

Run UNMODIFIED against the driver override on disk (vitest, deterministic, no seed):
**27 passed / 2 failed / 2 skipped (31 total).** The 2 skips are the blind agent's own documented GAPs
(the S2b Hit-Rate-status gate ordering check, and the unobservable auto-aim clause) — both correctly skipped.

The 2 FAILURES are classified by the driver as BLIND-TEST OVER-ASSUMPTIONS (RECON_ERROR), each probe-confirmed
against the engine — NOT driver unfaithfulness. The judge should adjudicate:

FAILURE 1 — S2a "is a live team damage buff (zeroing it lowers her AND at least one teammate)":
  Assertion `expect(BASE.total).toBeGreaterThan(NO_HITRATE.total)` FAILED (447719881.87906307 == 447719881.87906307).
  ROOT CAUSE (probe-confirmed): zeroing hitRatePct leaves modernia/crown/helm totals BYTE-IDENTICAL; only liter
  moves (122801700 -> 121421900, -1.1%). modernia is an MG; the engine's hitRatePct->core-rate lift is live-wired
  ONLY for AR/SMG/SG (CONE_DELTA 2026-07-19) — MG/SR/RL keep the flat base core table, so Hit Rate yields NO core
  lift for modernia herself. This is documented in the driver override as ⚑2 and in the note. The blind test
  assumed Hit Rate lifts modernia's OWN damage; she is MG, so it does not. The line IS faithfully encoded
  (fullBurstEnter / all allies / 8.56 / 15s — all the blind test's STRUCTURAL S2a assertions PASSED) and IS live
  (liter benefits). The driver's M3 asserts the structural faithfulness WITHOUT a self-damage claim, precisely
  because of ⚑2. Classification: RECON_ERROR (blind over-assumption contradicted by a documented engine fact).

FAILURE 2 — burst FB+5s "genuinely lengthens the Full Burst window (more in-FB hits than without it)":
  The in-FB-hit-count half PASSED (BASE 16784 > NO_FBEXT 15466). The `expect(BASE.total).toBeGreaterThan(NO_FBEXT.total)`
  half FAILED: BASE modernia total 447719881.88 < NO_FBEXT 477103055.62.
  ROOT CAUSE (probe-confirmed): removing the +5s extend lets modernia fit 6 bursts / 11 FB windows into 180s vs
  5 bursts / 10 windows WITH it (BASE windows [15,10,15,10,...]; NO_FBEXT all 10s). The shorter windows cycle
  faster, so MORE Destroy-Mode/unlimited-ammo windows fire, raising her total despite fewer in-FB hits per window.
  This is the documented "FB-count anomaly" (kit-status findings: "Single read, confounded by that comp FB-count
  anomaly"). The blind test assumed longer-FB-window => more-total-damage (a monotonicity heuristic); the rotation
  dynamics invert it. The driver's M5 discriminates the extend via WINDOW DURATION (modernia-cast 15s vs helm-cast
  10s; removing the extend collapses the long windows by exactly 300 frames / 5s) — NOT via total damage — precisely
  because total is rotation-confounded. Classification: RECON_ERROR (blind over-assumption; the driver's
  window-duration discriminator is the correct observable and is GREEN).

Neither failure indicates an undocumented driver divergence; both are blind damage-monotonicity heuristics that
the engine violates for documented, probe-confirmed reasons. The driver did NOT weaken the override or test to
make them pass (that would fabricate an MG Hit-Rate core lift / a monotonic-FB mechanic — MEASURED>FUDGE).

### S5 blind test source (scripts/kit-autonomy/blind/modernia.test.ts)

```ts
/**
 * modernia — BLIND per-unit kit spec test (S5).
 * Written from the kit prose ALONE: the driver's override, tests and reasoning were NOT consulted.
 *
 * KIT, read literally:
 *   S1a  on normal-attack HIT              -> 3.05% of final ATK as additional damage (per hit)
 *   S1b  every 200 normal-attack HITS      -> self Crit Damage +14.25%, x5 stacks, 10s
 *                                          -> self Max Ammo -5.04%,   x5 stacks, 10s  (a DEBUFF)
 *   S2a  on entering FULL BURST            -> ALL ALLIES Hit Rate +8.56% for 15s
 *   S2b  every 200 hits while Hit-Rate-up  -> self ATK +29.38% for 10s   (the status gate is a GAP)
 *   Ba   own burst                         -> all allies Full Burst Duration +5s
 *   Bb   own burst                         -> self unlimited ammunition, 15s
 *   Bc   own burst, Destroy Mode           -> 2.24% of final ATK as damage for 15s
 *   Bc'  Destroy Mode's line-of-sight / auto-aim / 'parts treated as one enemy' text is unmodelable on
 *        the partless scope-lock boss -> belongs in `unmodeled`, not in blocks.
 *
 * FIXTURE: controlComp('modernia', true) = liter B1 / crown B2 / modernia B3 / helm B3, so bursts actually
 * chain. A lone B3 makes ZERO Full Bursts, which would make every FB-keyed line below vacuous. helm stays in:
 * her buffs raise absolute totals but gate nothing here — every damage claim is a DELTA between two runs of
 * the SAME fixture, so her contribution cancels.
 *
 * SHAPE TOLERANCE: the packet documents two containers for a slot (a bare Block[] and a CharacterSkills with
 * .blocks). blocksOf() reads both, so a RED here means the MODEL is wrong, never the container.
 *
 * ENCODING TOLERANCE: S1a and Bc are magnitude-matched (3.05 / 2.24 in their slot), not shape-matched — a
 * per-hit rider is legitimately either an `extraHitDamagePct` buff or a hitCount:1 `flatDamage`. What the
 * assertions pin is the per-HIT scale of the contribution, which is what actually distinguishes the faithful
 * reading from the nearest-wrong DoT/one-shot encodings.
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

const SLUG = 'modernia';
type Slot = 'skill1' | 'skill2' | 'burst';
const SLOTS: Slot[] = ['skill1', 'skill2', 'burst'];

/* ------------------------------ override readers ------------------------------ */
function blocksOf(ov: any, slot: Slot): any[] {
  const s = ov?.[slot];
  if (Array.isArray(s)) return s;
  if (s && Array.isArray(s.blocks)) return s.blocks;
  return [];
}
function eachBlock(ov: any, fn: (b: any, slot: Slot) => void): void {
  for (const slot of SLOTS) for (const b of blocksOf(ov, slot)) fn(b, slot);
}
function eachEffect(ov: any, fn: (e: any, b: any, slot: Slot) => void): void {
  eachBlock(ov, (b, slot) => {
    for (const e of b.effects ?? []) fn(e, b, slot);
  });
}
function find(ov: any, pred: (e: any, b: any, slot: Slot) => boolean) {
  const hits: { eff: any; block: any; slot: Slot }[] = [];
  eachEffect(ov, (e, b, slot) => {
    if (pred(e, b, slot)) hits.push({ eff: e, block: b, slot });
  });
  return hits;
}
const mag = (n: unknown) => (typeof n === 'number' ? Math.abs(n) : NaN);
const isMag = (e: any, want: number, tol = 0.03) =>
  Math.abs(mag(e.value) - want) <= tol || Math.abs(mag(e.atkPct) - want) <= tol;
function zeroMagnitude(e: any): void {
  if (typeof e.value === 'number') e.value = 0;
  if (typeof e.atkPct === 'number') e.atkPct = 0;
}
function dropEffects(ov: any, kind: string): void {
  eachBlock(ov, (b) => {
    b.effects = (b.effects ?? []).filter((e: any) => e.kind !== kind);
  });
}

/* ---------------------------------- runner ------------------------------------ */
type Run = { res: any; events: any[]; total: number; all: Record<string, number> };
function run(mutate?: (ov: any) => void): Run {
  const events: any[] = [];
  const base: any = controlComp(SLUG, true);
  const opts: any = {
    ...base,
    cfg: { ...(base.cfg ?? {}), onEvent: (ev: SimEvent) => events.push(ev) },
  };
  if (mutate) {
    opts.overrides = { ...(base.overrides ?? {}), [SLUG]: withPatchedOverride(SLUG, mutate) };
  }
  const res = runComp(opts);
  return {
    res,
    events,
    total: unitOf(res, SLUG).totalDamage,
    all: totals(res) as Record<string, number>,
  };
}
const evsOf = (r: Run, kind: string) => r.events.filter((e) => e.kind === kind);
const buffVals = (r: Run, stat: string, want: number, tol = 0.06) =>
  r.events.filter((e) => e.kind === 'buffApply' && e.stat === stat && Math.abs(mag(e.value) - want) <= tol);
const inFbHits = (r: Run) => r.events.filter((e) => e.kind === 'damage' && e.inFullBurst).length;
const drop = (base: number, cf: number) => (base - cf) / base;

/* -------- the committed override, read (not written) via an empty patch clone --- */
const OV: any = withPatchedOverride(SLUG, () => {});
const RIDER = find(OV, (e, _b, slot) => slot === 'skill1' && isMag(e, 3.05));
const CRIT = find(OV, (e) => e.kind === 'buff' && e.stat === 'critDamagePct' && isMag(e, 14.25, 0.06));
const AMMO = find(OV, (e) => e.kind === 'buff' && (e.stat === 'maxAmmoPct' || e.stat === 'maxAmmoFlat'));
const HITRATE = find(OV, (e) => e.kind === 'buff' && e.stat === 'hitRatePct');
const ATK29 = find(OV, (e) => e.kind === 'buff' && isMag(e, 29.38, 0.06) && e.stat !== 'hitRatePct');
const FBEXT = find(OV, (e) => e.kind === 'fullBurstExtend');
const UNLIM = find(OV, (e) => e.kind === 'unlimitedAmmo');
const DESTROY = find(OV, (e, _b, slot) => slot === 'burst' && isMag(e, 2.24));

/* ------------------------- hoisted runs (12 x 180s sims) ---------------------- */
const BASE = run();
const NO_RIDER = run((ov) =>
  find(ov, (e, _b, s) => s === 'skill1' && isMag(e, 3.05)).forEach((h) => zeroMagnitude(h.eff)),
);
const NO_CRITDMG = run((ov) =>
  find(ov, (e) => e.kind === 'buff' && e.stat === 'critDamagePct' && isMag(e, 14.25, 0.06)).forEach((h) =>
    zeroMagnitude(h.eff),
  ),
);
const CRIT_1STACK = run((ov) =>
  find(ov, (e) => e.kind === 'buff' && e.stat === 'critDamagePct' && isMag(e, 14.25, 0.06)).forEach((h) => {
    h.eff.maxStacks = 1;
  }),
);
const CRIT_SHORT = run((ov) =>
  find(ov, (e) => e.kind === 'buff' && e.stat === 'critDamagePct' && isMag(e, 14.25, 0.06)).forEach((h) => {
    h.eff.durationSec = 1;
  }),
);
const AMMO_POS = run((ov) =>
  find(ov, (e) => e.kind === 'buff' && (e.stat === 'maxAmmoPct' || e.stat === 'maxAmmoFlat')).forEach((h) => {
    h.eff.value = Math.abs(h.eff.value);
  }),
);
const NO_HITRATE = run((ov) =>
  find(ov, (e) => e.kind === 'buff' && e.stat === 'hitRatePct').forEach((h) => zeroMagnitude(h.eff)),
);
const HITRATE_10S = run((ov) =>
  find(ov, (e) => e.kind === 'buff' && e.stat === 'hitRatePct').forEach((h) => {
    h.eff.durationSec = 10;
  }),
);
const NO_FBEXT = run((ov) => dropEffects(ov, 'fullBurstExtend'));
const NO_UNLIM = run((ov) => dropEffects(ov, 'unlimitedAmmo'));
const NO_DESTROY = run((ov) =>
  find(ov, (e, _b, s) => s === 'burst' && isMag(e, 2.24)).forEach((h) => zeroMagnitude(h.eff)),
);
const DESTROY_LONG = run((ov) =>
  find(ov, (e, _b, s) => s === 'burst' && isMag(e, 2.24)).forEach((h) => {
    if (typeof h.eff.durationSec === 'number') h.eff.durationSec = 60;
  }),
);

const TEAM = Object.keys(BASE.all).filter((s) => s !== SLUG);

describe('modernia — fixture non-vacuity', () => {
  it('the control comp actually bursts (a lone B3 would make every FB line vacuous)', () => {
    expect(evsOf(BASE, 'burstCast').length).toBeGreaterThanOrEqual(3);
    expect(evsOf(BASE, 'fullBurstStart').length).toBeGreaterThanOrEqual(3);
    expect(inFbHits(BASE)).toBeGreaterThan(0);
  });

  it('all three skill slots carry blocks (no silently-empty slot)', () => {
    for (const slot of SLOTS) expect(blocksOf(OV, slot).length, `${slot} has no blocks`).toBeGreaterThan(0);
  });

  it('no `ignored` effects anywhere (validator rule; skips belong in `note`/`unmodeled`)', () => {
    expect(find(OV, (e) => e.kind === 'ignored' || e.kind === 'unsupported')).toHaveLength(0);
  });
});

describe('S1a — normal-attack hit: 3.05% of final ATK additional damage', () => {
  it('is present in skill1 at the kit magnitude', () => {
    expect(RIDER.length, 'no 3.05%-magnitude effect in skill1').toBeGreaterThan(0);
  });

  // DISCRIMINATES: a PER-HIT rider is worth a large slice of her total (she fires ~40 hits/s as a
  // 2-hits-per-shot MG for the whole fight). The nearest-wrong encodings — dropped as cosmetic, or
  // bolted onto a rare trigger (one-shot on burst / every-200-hits) — all leave the delta near zero.
  it('per-hit scale: zeroing it costs >1.5% of her total damage', () => {
    expect(drop(BASE.total, NO_RIDER.total)).toBeGreaterThan(0.015);
  });

  // INERTNESS: 'Affects the target(s)' = enemy-facing damage from HER hits; it must not touch allies.
  it('is self-sourced: teammates are byte-identical when it is zeroed', () => {
    for (const s of TEAM) expect(NO_RIDER.all[s], `${s} moved`).toBe(BASE.all[s]);
  });
});

describe('S1b — every 200 normal-attack hits: Crit Damage +14.25%, 5 stacks, 10s (self)', () => {
  it('is keyed to a hitCount:200 trigger (not shotFired, not interval)', () => {
    expect(CRIT.length, 'no critDamagePct 14.25 buff').toBeGreaterThan(0);
    for (const h of CRIT) {
      expect(h.block.trigger?.kind).toBe('hitCount');
      expect(h.block.trigger?.count).toBe(200);
      expect(h.block.target?.kind).toBe('self');
      expect(h.eff.maxStacks).toBe(5);
      expect(h.eff.durationSec).toBe(10);
    }
  });

  // NON-VACUITY: at ~40 hits/s the 200-hit threshold clears every ~5s, so the fixture must show many
  // applications and must actually REACH the 5-stack cap. Without this, a maxStacks assertion is dead text.
  it('fires repeatedly and reaches the 5-stack cap in the fixture', () => {
    const a = buffVals(BASE, 'critDamagePct', 14.25);
    expect(a.length).toBeGreaterThanOrEqual(5);
    expect(Math.max(...a.map((e) => e.stacks ?? 1))).toBeGreaterThanOrEqual(2);
    expect(a.every((e) => e.maxStacks === 5)).toBe(true);
  });

  it('is self-only — never lands on an ally', () => {
    const t = new Set(buffVals(BASE, 'critDamagePct', 14.25).map((e) => e.targetSlug));
    expect([...t]).toEqual([SLUG]);
  });

  // DISCRIMINATES value + stacking: the nearest-wrong reads are (a) dropped, (b) 1 stack instead of 5.
  it('is live and genuinely stacks: zeroing and 1-stack both cost damage, 1-stack costs less than zeroing', () => {
    expect(BASE.total).toBeGreaterThan(NO_CRITDMG.total);
    expect(BASE.total).toBeGreaterThan(CRIT_1STACK.total);
    expect(CRIT_1STACK.total).toBeGreaterThan(NO_CRITDMG.total);
  });

  // DURATION LIVENESS only. 10s is longer than the ~5s refresh cadence, so 10s vs 20s is board-inert
  // here by construction — the exact value is pinned structurally above, not by damage.
  it('the 10s window is a real bounded window (shrinking it below the refresh cadence costs damage)', () => {
    expect(BASE.total).toBeGreaterThan(CRIT_SHORT.total);
  });

  it('teammates are byte-identical when the self crit-damage buff is zeroed', () => {
    for (const s of TEAM) expect(NO_CRITDMG.all[s], `${s} moved`).toBe(BASE.all[s]);
  });
});

describe('S1b — every 200 hits: Max Ammunition Capacity DOWN 5.04%, 5 stacks, 10s (self)', () => {
  // A weapon-state modifier IS damage: fewer rounds per belt = more reloads = fewer shots fired.
  it('is modeled, self-scoped, and encoded as a DEBUFF (negative value)', () => {
    expect(AMMO.length, 'no maxAmmo effect — the DOWN line was dropped as defensive').toBeGreaterThan(0);
    for (const h of AMMO) {
      expect(h.eff.value, 'Max Ammo DOWN must be negative').toBeLessThan(0);
      expect(h.block.target?.kind).toBe('self');
      expect(h.eff.maxStacks).toBe(5);
      expect(h.eff.durationSec).toBe(10);
      if (h.eff.stat === 'maxAmmoPct') expect(Math.abs(h.eff.value)).toBeCloseTo(5.04, 1);
    }
  });

  // DISCRIMINATES the SIGN, which is the whole failure mode here: flipping it to +5.04% must produce
  // strictly FEWER reloads. If the effect were inert (or dropped), the two runs would be identical.
  it('the DOWN direction bites: the faithful model reloads more often than a sign-flipped one', () => {
    const faithful = evsOf(BASE, 'reload').length;
    const flipped = evsOf(AMMO_POS, 'reload').length;
    expect(faithful).toBeGreaterThan(0);
    expect(faithful).toBeGreaterThan(flipped);
    expect(AMMO_POS.total).not.toBe(BASE.total);
  });
});

describe('S2a — entering Full Burst: ALL ALLIES Hit Rate +8.56% for 15s', () => {
  it('is keyed to fullBurstEnter and targets allies (not self, not burstCast)', () => {
    expect(HITRATE.length, 'no hitRatePct buff').toBeGreaterThan(0);
    for (const h of HITRATE) {
      expect(h.block.trigger?.kind).toBe('fullBurstEnter');
      expect(h.block.target?.kind).toBe('allies');
      expect(h.block.target?.excludeSelf ?? false).toBe(false);
      expect(mag(h.eff.value)).toBeCloseTo(8.56, 1);
      expect(h.eff.durationSec).toBe(15);
    }
  });

  // TARGET SET: 'all allies' = every unit in the comp, self included. Nearest-wrong = self-only (1 slug).
  it('lands on the WHOLE team including self', () => {
    const t = new Set(buffVals(BASE, 'hitRatePct', 8.56).map((e) => e.targetSlug));
    expect(t.has(SLUG)).toBe(true);
    expect(t.size).toBe(Object.keys(BASE.all).length);
  });

  // TRIGGER IDENTITY: re-fires per Full Burst rather than being a passive — multiple distinct expiry frames.
  it('re-applies each Full Burst (>=2 distinct expiry frames), not once as a passive', () => {
    const exp = new Set(buffVals(BASE, 'hitRatePct', 8.56).map((e) => e.expiresFrame));
    expect(exp.size).toBeGreaterThanOrEqual(2);
  });

  // DURATION SEMANTICS, read off expiresFrame without needing an event frame: 15s vs the nearest-wrong
  // 10s (an FB-window-length guess) must differ by exactly 5s = 300 frames on the first application.
  it('the window is 15s, not the 10s Full Burst length', () => {
    const a = buffVals(BASE, 'hitRatePct', 8.56)[0];
    const b = buffVals(HITRATE_10S, 'hitRatePct', 8.56)[0];
    expect(a).toBeTruthy();
    expect(b).toBeTruthy();
    expect(a.expiresFrame - b.expiresFrame).toBeGreaterThanOrEqual(298);
    expect(a.expiresFrame - b.expiresFrame).toBeLessThanOrEqual(302);
  });

  // Hit Rate feeds the core-hit lift, so it is a TEAM damage buff: removing it must move teammates too.
  it('is a live team damage buff (zeroing it lowers her AND at least one teammate)', () => {
    expect(BASE.total).toBeGreaterThan(NO_HITRATE.total);
    expect(TEAM.some((s) => NO_HITRATE.all[s] < BASE.all[s])).toBe(true);
  });
});

describe('S2b — every 200 hits during Hit-Rate-up: self ATK +29.38% for 10s', () => {
  it('is present as an ATK buff (atkPct, not attackDamagePct), self, 10s, hitCount:200', () => {
    expect(ATK29.length, 'no 29.38 ATK buff').toBeGreaterThan(0);
    for (const h of ATK29) {
      expect(h.eff.stat, 'kit says ATK UP -> atkPct, not the Damage Up bucket').toBe('atkPct');
      expect(h.block.target?.kind).toBe('self');
      expect(h.eff.durationSec).toBe(10);
      expect(h.block.trigger?.kind).toBe('hitCount');
      expect(h.block.trigger?.count).toBe(200);
    }
  });

  it('lands only on modernia', () => {
    const t = new Set(buffVals(BASE, 'atkPct', 29.38).map((e) => e.targetSlug));
    expect([...t]).toEqual([SLUG]);
  });

  // GAP: 'during increasing Hit Rate status' is a REQUIRES-OWN-BUFF-ACTIVE gate. The schema has no such
  // primitive (fbGate/requiresTargetStatus/resourceGate all key off something else), so an ungated model
  // over-credits every pre-first-Full-Burst activation. Enable this once a buff-state gate exists.
  it.skip('GAP: the Hit-Rate-status gate — no ATK+29.38 application before the first Full Burst', () => {
    const firstFb = BASE.events.findIndex((e) => e.kind === 'fullBurstStart');
    const firstAtk = BASE.events.findIndex(
      (e) => e.kind === 'buffApply' && e.stat === 'atkPct' && Math.abs(mag(e.value) - 29.38) <= 0.06,
    );
    expect(firstAtk).toBeGreaterThan(firstFb);
  });
});

describe('burst — Full Burst Duration +5 sec (all allies)', () => {
  it('is modeled as fullBurstExtend of 5s on a burstCast trigger', () => {
    expect(FBEXT.length, 'no fullBurstExtend effect').toBeGreaterThan(0);
    for (const h of FBEXT) {
      expect(h.eff.seconds).toBe(5);
      expect(h.block.trigger?.kind).toBe('burstCast');
    }
  });

  // DISCRIMINATES via window LENGTH, not totals: a longer Full Burst means strictly more damage events
  // land with inFullBurst=true. Nearest-wrong (dropped, or 0s) collapses the delta to zero.
  it('genuinely lengthens the Full Burst window (more in-FB hits than without it)', () => {
    expect(inFbHits(BASE)).toBeGreaterThan(inFbHits(NO_FBEXT));
    expect(BASE.total).toBeGreaterThan(NO_FBEXT.total);
  });
});

describe('burst — unlimited ammunition for 15 sec (self)', () => {
  it('is modeled, self-scoped, burst-cast keyed, and time-bounded at 15s', () => {
    expect(UNLIM.length, 'no unlimitedAmmo effect').toBeGreaterThan(0);
    for (const h of UNLIM) {
      expect(h.eff.durationSec).toBe(15);
      expect(h.block.target?.kind).toBe('self');
      expect(h.block.trigger?.kind).toBe('burstCast');
    }
  });

  // DISCRIMINATES: unlimited ammo suppresses reloads only inside its window. Nearest-wrongs are
  // (a) dropped -> reload counts identical, (b) whole-fight -> she never reloads at all.
  it('suppresses reloads inside the window but not for the whole fight', () => {
    const withUl = evsOf(BASE, 'reload').length;
    const without = evsOf(NO_UNLIM, 'reload').length;
    expect(withUl).toBeLessThan(without);
    expect(withUl).toBeGreaterThan(0);
  });
});

describe('burst — Destroy Mode: 2.24% of final ATK as damage for 15 sec', () => {
  it('is present in the burst slot at the kit magnitude, on a burstCast trigger, self-scoped', () => {
    expect(DESTROY.length, 'no 2.24%-magnitude effect in the burst slot').toBeGreaterThan(0);
    for (const h of DESTROY) {
      expect(h.block.trigger?.kind).toBe('burstCast');
      expect(h.block.target?.kind).toBe('self');
    }
  });

  // READING (flagged): 'deals X% of final ATK as damage for 15 sec' on an auto-aiming firing mode is a
  // PER-HIT rider on every Destroy-Mode bullet, not a 1/sec DoT. This assertion is the discriminator:
  // per-hit at ~40 hits/s for 15s of each ~40s cycle is worth >1% of her total; a 15-tick DoT is worth
  // <0.1% and would fail here. A RED on this test is the encoding divergence, not a magnitude quibble.
  it('is a PER-HIT rider, not a per-second DoT: zeroing it costs >1% of her total', () => {
    expect(drop(BASE.total, NO_DESTROY.total)).toBeGreaterThan(0.01);
  });

  // DURATION: the window must be bounded at 15s, not the whole burst cycle.
  it('the 15s window is bounded (stretching it to 60s adds damage)', () => {
    expect(DESTROY_LONG.total).toBeGreaterThan(BASE.total);
  });

  it('does not leak onto teammates', () => {
    for (const s of TEAM) expect(NO_DESTROY.all[s], `${s} moved`).toBe(BASE.all[s]);
  });

  // The line-of-sight / auto-aim / 'parts treated as a single enemy' text has no engine primitive and
  // no observable on a partless boss. It must be recorded as unmodeled text, not silently dropped.
  it.skip('GAP: line-of-sight extension / auto-aim / parts-as-one-enemy — unobservable on the partless boss', () => {
    expect(OV.unmodeled?.burst?.length ?? 0).toBeGreaterThan(0);
  });
});

```

## SECTION 6 — S6 BLIND OVERRIDE (claude-opus-5) + diff vs driver

### S6 blind override diff vs the DRIVER override

The S6 blind override (opus, prose-only) CONVERGES with the driver on EVERY kit line, with ONE encoding-choice
divergence that is observationally equivalent on the damage log:

- skill1[0] per-hit 3.05% rider: BLIND = passive self buff `extraHitDamagePct 3.05`; DRIVER = `hitCount:1` enemy
  `flatDamage 3.05`. Both fire 2x/pull (hitsPerShot 2) at 3.05%, crit-ON. The driver chose flatDamage deliberately
  for burst-gauge economy: flatDamage emits skillGauge per proc (~+50% of her weapon's own gauge generation), which
  extraHitDamagePct does NOT; her measured-exact rotation on graded comps depends on that gauge (documented in the
  driver note). Damage-log equivalent; gauge-generation differs. The S2b reviewer (fable) independently noted the
  same encoding fork. NOT a faithfulness divergence — both are valid per-hit readings; the driver's is the
  gauge-economy choice.
- skill1[1] 200-hit stacks (critDamagePct 14.25 x5 10s + maxAmmoPct -5.04 x5 10s): IDENTICAL.
- skill2[0] hitRate (fullBurstEnter / allies / 8.56 / 15s): IDENTICAL.
- skill2[1] ATK gate (hitCount 200 / self / fbGate:'inFb' / atkPct 29.38 / 10s): IDENTICAL — the blind agent
  independently chose fbGate:'inFb' as the proxy for "during increasing Hit Rate status", exactly matching the
  driver (and the S2b reviewer's "nearest faithful proxy").
- burst[0] fullBurstExtend (burstCast / allies / 5s): IDENTICAL.
- burst[1] unlimitedAmmo 15s + extraHitDamagePct 2.24 15s (burstCast / self): IDENTICAL — blind chose
  extraHitDamagePct for Destroy Mode, matching the driver.
- unmodeled.burst (auto-aim / parts-consolidation clause): IDENTICAL verbatim.
- ⚑ set: the blind agent independently derived the same flags (cadence ⚑1, hitCount-rounds convention, fbGate
  proxy ⚑3, Destroy Mode per-hit-vs-DoT ⚑5, hitRate->core ⚑2, maxAmmo sign, noFb default).

Convergence is strong: 6/7 lines byte-identical, the 7th a documented gauge-economy encoding choice with identical
damage observables.

### S6 blind override (scripts/kit-autonomy/blind/modernia.override.json)

```json
{
  "slug": "modernia",
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
          "stat": "extraHitDamagePct",
          "value": 3.05
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "hitCount",
        "count": 200
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "critDamagePct",
          "value": 14.25,
          "durationSec": 10,
          "maxStacks": 5
        },
        {
          "kind": "buff",
          "stat": "maxAmmoPct",
          "value": -5.04,
          "durationSec": 10,
          "maxStacks": 5
        }
      ]
    }
  ],
  "skill2": [
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
          "stat": "hitRatePct",
          "value": 8.56,
          "durationSec": 15
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "hitCount",
        "count": 200
      },
      "target": {
        "kind": "self"
      },
      "fbGate": "inFb",
      "effects": [
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 29.38,
          "durationSec": 10
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
          "kind": "fullBurstExtend",
          "seconds": 5
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
          "kind": "unlimitedAmmo",
          "durationSec": 15
        },
        {
          "kind": "buff",
          "stat": "extraHitDamagePct",
          "value": 2.24,
          "durationSec": 15
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [],
    "skill2": [],
    "burst": [
      "Destroy Mode: Extends her line of sight and auto-aims at all enemies within range. The stage target is treated as a single enemy regardless of whether it has parts (including interruption parts)."
    ]
  },
  "caveats": [
    "⚑ MG cadence tuple (pullsPerSec / reloadFrames 159 / hitsPerShot 2) is datamine-sourced and unreliable; BOTH 200-hit triggers (S1 stacks, S2 ATK) and the maxAmmoPct feedback loop are cadence-driven, so the whole kit's proc rate inherits that uncertainty. Highest-leverage measurement for this unit.",
    "⚑ hitCount:200 is authored as 200 ROUNDS (engine convention: an MG spends hitsPerShot rounds per pull), matching the kit's 'normal attack hits 200 time(s)'. If the engine counts trigger pulls instead, the threshold halves and both procs double in frequency — verify against a buffApply-event count before trusting stack uptime.",
    "⚑ S2 rider gate: 'during increasing Hit Rate status' has no literal schema gate (no 'requiresBuff'). Modeled as fbGate:'inFb' because the Hit Rate window is opened at FB entry for 15 s and Full Burst with her own +5 s extension is 15 s, so the two windows coincide almost exactly. This UNDER-credits the tail whenever the team enters FB without her burst (FB 10 s, HR still live for 5 s more). Alternative encodings: ungated (over-credits every out-of-FB 200-hit proc) or a resource/status channel.",
    "⚑ hitRatePct 8.56 → core-rate lift magnitude is engine-derived (sim.ts hrCoreMult), not kit-stated; measured-only. The kit percentage is transcribed literally, but its damage consequence is an unvalidated conversion.",
    "⚑ Burst 'Deals 2.24% of final ATK as damage for 15 sec' is modeled as a PER-HIT rider (extraHitDamagePct) for the 15 s window, not a DoT. Whole-picture: a 1 s-interval DoT would total ~34% of ATK across an entire Burst III window — implausibly negligible for a burst skill — while the per-hit read matches the identical-shaped S1 line and MG hit density. Confirm by popup count (per-hit white numbers alongside normals vs a once-per-second tick).",
    "⚑ Max Ammunition ▼5.04% ×5 is kept (weapon-state modifier = damage): it shrinks the belt from 300 toward ~225 and raises reload frequency. It is INERT during the 15 s unlimited-ammo burst window, so its net cost depends on the burst-uptime fraction.",
    "⚑ noFb NOT set anywhere (default ON, i.e. riders take the +50% FB major by timing). Per-kit noFb is measured-only; leaving it off is the documented default, not a finding.",
    "⚑ Destroy Mode auto-aim is unmodeled. It plausibly changes effective hit/core landing (the real reason her burst is strong), but the kit text states no rate, so nothing was invented. If a measured Destroy-Mode core rate exists, it belongs here rather than in the 2.24% line.",
    "Stack steady-state for the S1 pair (5 stacks × 10 s, one stack per 200 hits) is left to the engine's native stacking rather than an authored time-average; no rampSec applied. If the engine refreshes rather than re-stacks, uptime will be wrong — check maxStacks on the buffApply events."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Blind second read of the kit prose only (no board, no probe data, no committed override). Structure: S1 = an always-on per-hit rider (extraHitDamagePct 3.05) + a 200-hit self stack pair (Crit DMG ▲14.25 ×5 / Max Ammo ▼5.04 ×5, 10 s). S2 = team Hit Rate ▲8.56 for 15 s on FB entry + a self ATK ▲29.38 (10 s) 200-hit rider whose kit gate ('during increasing Hit Rate status') is approximated by fbGate:'inFb'. Burst = team Full Burst Duration ▲5 s, self unlimited ammo 15 s, and the Destroy Mode 2.24% line encoded as a 15 s per-hit rider (see caveats for the per-hit-vs-DoT reasoning). Destroy Mode's aim/line-of-sight/partless-target text is unmodeled (v1 boss is partless; no aim model). No `ignored` blocks."
}
```

## SECTION 7 — DRIVER IMPLEMENTATION (test + override under judgment)

### Driver test (scripts/tests/units/modernia.test.ts)

```ts
// PER-UNIT KIT SPEC — `modernia` (Modernia, Attacker/MG/Fire, Burst III, cd 40s, ammo 300,
// hitsPerShot 2, normalMult 7.71). Kit-autonomy gauntlet 2026-07-25 (test-first S2a).
//
// One assertion group per KIT LINE (M1..M7 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.modernia.skills):
//   S1 ■ when normal attack hits → the target(s): 3.05% of final ATK as additional damage      [M1]
//      ■ when normal attack hits 200× → self: Critical Damage ▲14.25% ×5 stacks, 10 sec        [M2a]
//                                          Max Ammo Capacity ▼5.04% ×5 stacks, 10 sec          [M2b]
//   S2 ■ entering Full Burst → all allies: Hit Rate ▲8.56% for 15 sec                          [M3]
//      ■ when normal attack hits 200× DURING increasing-Hit-Rate status → self:
//                                          ATK ▲29.38% for 10 sec                              [M4]
//   BU ■ all allies: Full Burst Duration ▲5 sec                                                [M5]
//      ■ self: Unlimited ammunition for 15 sec                                                 [M6]
//      ■ self: Destroy Mode — Deals 2.24% of final ATK as damage for 15 sec                    [M7]
//         (+ "extends line of sight / auto-aims / parts consolidation" clause → UNMODELED:
//          inert vs the single partless scope-lock boss; documented in override.unmodeled.burst)
//
// Every line is FAITHFUL in the shipped override (the burst slot is hand-authored; skill1/skill2
// are a validated parser baseline). So every assertion is GREEN vs shipped and RED vs the nearest
// wrong model — there are no FIX/MISSING lines driving a RED-vs-shipped assertion.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   M1  per-HIT, not per-PULL: hitsPerShot 2, so the rider fires 2×/pull (hitCount count:1 with the
//       engine's +hitsPerShot counter). A per-pull model (count:2) halves the event count; removing
//       the line zeroes it. atkPct 3.05, crit-eligible (RIDERCRIT default ON), skill bucket.
//   M2  the 200-hit self stacker: value 14.25 / -5.04, maxStacks 5, SELF-scoped, 10s, with the
//       ammo-DOWN companion always alongside. Removing the block zeroes both.
//   M3  fullBurstEnter, NOT burstCast (Tier-2 trigger distinction): the Hit Rate buff reaches all 4
//       allies on EVERY team Full Burst (10 windows here), not only on Modernia's own 5 casts. A
//       burstCast trigger halves the application-frame count.
//   M4  the 'during increasing Hit Rate status' gate is approximated as fbGate:'inFb' (⚑3): EVERY
//       ATK▲29.38 application lands inside a Full Burst window. Ungated, the counter accrues out of
//       window and fires early/pre-FB — producing applications OUTSIDE every FB window (over-credit).
//   M5  fullBurstExtend +5s: Modernia-cast FB windows run 15s (base 10 + 5); helm-cast windows stay
//       10s. Removing the extend collapses the long windows to 10s — a 300-frame (5s) delta that pins
//       the `seconds: 5` magnitude.
//   M6  unlimitedAmmo 15s: Modernia fires thousands of unlimited-ammo shots (shot.unlimitedAmmo);
//       removing the effect zeroes them. The buff itself is a 15s self window.
//   M7  Destroy Mode rider rides extraHitDamagePct → one srcSlot=null damage instance per shot at
//       2.24%×hitsPerShot = 4.48%, crit-eligible (function additional damage crits, never cores).
//       Removing the buff zeroes the rider. (Whether this stream SHOULD crit is ⚑4; the engine
//       convention is crit-ON and the shipped model follows it.)
//
// Fixture: the 720-kit-audit control comp (liter B1 / crown B2 / modernia B3 / helm B3, boss Fire,
// focus modernia) — Modernia needs a real rotation to cast her burst at all, and the second B3
// (helm) is what makes the fullBurstEnter-vs-burstCast (M3) and the extend-only-on-her-cast (M5)
// discriminations observable. Deterministic (no seed).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { controlComp, runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
/** controlComp slot order: liter 0 / crown 1 / modernia 2 / helm 3. */
const MODERNIA = 2;
const ALL_ALLIES = [0, 1, 2, 3];

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;
type FullBurstStart = Extract<SimEvent, { kind: 'fullBurstStart' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp('modernia'),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual patches (nearest wrong model per line) ---------------------------------
const hasStat = (b: any, stat: string) => b.effects.some((e: any) => e.stat === stat);
const hasKind = (b: any, kind: string) => b.effects.some((e: any) => e.kind === kind);

/** M1 reference: the per-hit rider removed entirely. */
const modNoS1Rider = withPatchedOverride('modernia', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !b.effects.some((e: any) => e.kind === 'flatDamage'));
  if (ov.skill1.length === before) throw new Error('modernia S1 flatDamage rider missing — fixture is stale');
});
/** M1 counterfactual: the rider as a per-PULL proc (count 2) instead of per-HIT (count 1). */
const modS1PerPull = withPatchedOverride('modernia', (ov) => {
  const b = ov.skill1.find((x: any) => x.effects.some((e: any) => e.kind === 'flatDamage'));
  if (!b) throw new Error('modernia S1 flatDamage rider missing — fixture is stale');
  b.trigger.count = 2;
});
/** M2 reference: the 200-hit self stacker (crit-dmg + ammo-down) removed. */
const modNoStacks = withPatchedOverride('modernia', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'critDamagePct'));
  if (ov.skill1.length === before) throw new Error('modernia S1 critDamagePct stacker missing — fixture is stale');
});
/** M3 counterfactual: Hit Rate on burstCast (her own casts only) instead of fullBurstEnter. */
const modHitRateOnCast = withPatchedOverride('modernia', (ov) => {
  const b = ov.skill2.find((x: any) => hasStat(x, 'hitRatePct'));
  if (!b) throw new Error('modernia S2 hitRatePct block missing — fixture is stale');
  b.trigger = { kind: 'burstCast' };
});
/** M4 counterfactual: the ATK▲ gate removed (counter accrues/fires ungated, pre-FB). */
const modAtkUngated = withPatchedOverride('modernia', (ov) => {
  const b = ov.skill2.find((x: any) => hasStat(x, 'atkPct'));
  if (!b) throw new Error('modernia S2 atkPct block missing — fixture is stale');
  delete b.fbGate;
});
/** M5 reference: the team Full Burst Duration ▲5s removed. */
const modNoFbExtend = withPatchedOverride('modernia', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !hasKind(b, 'fullBurstExtend'));
  if (ov.burst.length === before) throw new Error('modernia burst fullBurstExtend missing — fixture is stale');
});
/** M6 reference: the unlimited-ammo effect removed (Destroy Mode keeps the rider). */
const modNoUnlimited = withPatchedOverride('modernia', (ov) => {
  const b = ov.burst.find((x: any) => hasKind(x, 'unlimitedAmmo'));
  if (!b) throw new Error('modernia burst unlimitedAmmo missing — fixture is stale');
  b.effects = b.effects.filter((e: any) => e.kind !== 'unlimitedAmmo');
});
/** M7 reference: the Destroy Mode extraHitDamagePct rider removed (unlimited ammo stays). */
const modNoDestroyRider = withPatchedOverride('modernia', (ov) => {
  const b = ov.burst.find((x: any) => hasStat(x, 'extraHitDamagePct'));
  if (!b) throw new Error('modernia burst extraHitDamagePct rider missing — fixture is stale');
  b.effects = b.effects.filter((e: any) => e.stat !== 'extraHitDamagePct');
});

// ---- runs (hoisted: each is a full 180s sim) ------------------------------------------------
const base = run();
const noS1Rider = run({ modernia: modNoS1Rider });
const s1PerPull = run({ modernia: modS1PerPull });
const noStacks = run({ modernia: modNoStacks });
const hitRateOnCast = run({ modernia: modHitRateOnCast });
const atkUngated = run({ modernia: modAtkUngated });
const noFbExtend = run({ modernia: modNoFbExtend });
const noUnlimited = run({ modernia: modNoUnlimited });
const noDestroyRider = run({ modernia: modNoDestroyRider });

// ---- readers --------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) => evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) => evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const modShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'modernia');
const fbWindows = (evs: SimEvent[]) =>
  evs.filter((e): e is FullBurstStart => e.kind === 'fullBurstStart');
/** Modernia-cast burst count (stage 3). */
const modCasts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'burstCast' && e.slug === 'modernia').length;
/** Buffs applied BY modernia (casterIdx). */
const modBuffs = (evs: SimEvent[], stat: string, value?: number) =>
  buffs(evs).filter(
    (b) => b.casterIdx === MODERNIA && b.stat === stat && (value === undefined || b.value === value),
  );
/** Full Burst windows as [startFrame, endFrame] pairs. */
const windows = (evs: SimEvent[]) => fbWindows(evs).map((f) => [f.frame, f.endFrame] as const);
const inAnyWindow = (evs: SimEvent[], frame: number) =>
  windows(evs).some(([s, e]) => frame >= s && frame < e);

describe('modernia — kit spec', () => {
  describe('M1 — S1 per-hit rider: 3.05% final ATK additional damage on EVERY hit', () => {
    const riders = (evs: SimEvent[]) =>
      dmg(evs).filter((d) => d.slug === 'modernia' && d.srcSlot === 'skill1');

    it('fires 2× per pull (per-HIT, hitsPerShot 2), not once per pull', () => {
      const shots = modShots(base.events).length;
      expect(riders(base.events).length).toBe(shots * 2);
    });

    it('is the kit magnitude, crit-eligible, in the skill bucket', () => {
      const r = riders(base.events);
      expect(r.length).toBeGreaterThan(0);
      expect([...new Set(r.map((d) => d.atkPct))]).toEqual([3.05]);
      expect(r.every((d) => d.critEligible)).toBe(true);
      expect([...new Set(r.map((d) => d.bucket))]).toEqual(['skill']);
    });

    it('DISCRIMINATING: a per-pull model halves the count; removal zeroes it', () => {
      const shots = modShots(base.events).length;
      expect(riders(s1PerPull.events).length).toBe(shots); // per-pull = 1×/pull
      expect(riders(noS1Rider.events).length).toBe(0);
    });
  });

  describe('M2 — S1 200-hit self stacker: Critical Damage ▲14.25% + Max Ammo ▼5.04%, ×5 / 10s', () => {
    it('grants Critical Damage ▲14.25%, 5-stack cap, self-scoped, 10 sec', () => {
      const apps = modBuffs(base.events, 'critDamagePct', 14.25);
      expect(apps.length).toBeGreaterThan(0);
      expect([...new Set(apps.map((b) => b.maxStacks))]).toEqual([5]);
      expect([...new Set(apps.map((b) => b.targetIdx))]).toEqual([MODERNIA]);
      expect([...new Set(apps.map((b) => (b.expiresFrame! - b.frame) / FPS))]).toEqual([10]);
      expect(Math.max(...apps.map((b) => b.stacks)), 'stacks must actually reach the 5 cap').toBe(5);
    });

    it('carries the Max Ammo ▼5.04% companion at the same cadence', () => {
      const ammo = modBuffs(base.events, 'maxAmmoPct', -5.04);
      const crit = modBuffs(base.events, 'critDamagePct', 14.25);
      expect(ammo.length).toBe(crit.length);
      expect([...new Set(ammo.map((b) => b.maxStacks))]).toEqual([5]);
      expect([...new Set(ammo.map((b) => b.targetIdx))]).toEqual([MODERNIA]);
    });

    it('DISCRIMINATING: removing the block zeroes both buffs', () => {
      expect(modBuffs(noStacks.events, 'critDamagePct').length).toBe(0);
      expect(modBuffs(noStacks.events, 'maxAmmoPct').length).toBe(0);
    });
  });

  describe('M3 — S2 Hit Rate ▲8.56% on Full Burst entry, for ALL allies (fullBurstEnter, not burstCast)', () => {
    it('reaches all four allies, 15 sec, at the kit magnitude', () => {
      const apps = modBuffs(base.events, 'hitRatePct', 8.56);
      expect(apps.length).toBeGreaterThan(0);
      expect([...new Set(apps.map((b) => b.value))]).toEqual([8.56]);
      expect([...new Set(apps.map((b) => (b.expiresFrame! - b.frame) / FPS))]).toEqual([15]);
      const perFrame = new Map<number, Set<number>>();
      for (const b of apps) {
        if (!perFrame.has(b.frame)) perFrame.set(b.frame, new Set());
        perFrame.get(b.frame)!.add(b.targetIdx!);
      }
      for (const holders of perFrame.values()) {
        expect([...holders].sort(), 'each FB entry must reach all 4 allies').toEqual(ALL_ALLIES);
      }
    });

    it('fires on EVERY team Full Burst, not only Modernia\'s own casts', () => {
      const baseFrames = new Set(modBuffs(base.events, 'hitRatePct').map((b) => b.frame));
      expect(baseFrames.size, 'one application-frame per FB window').toBe(fbWindows(base.events).length);
    });

    it('DISCRIMINATING: a burstCast trigger fires only on her own casts (fewer frames)', () => {
      const castFrames = new Set(modBuffs(hitRateOnCast.events, 'hitRatePct').map((b) => b.frame));
      expect(castFrames.size).toBe(modCasts(hitRateOnCast.events));
      expect(castFrames.size).toBeLessThan(fbWindows(hitRateOnCast.events).length);
    });
  });

  describe('M4 — S2 ATK ▲29.38% gated to the Hit-Rate status (fbGate inFb proxy, ⚑3)', () => {
    it('is 29.38%, self-scoped, 10 sec', () => {
      const apps = modBuffs(base.events, 'atkPct', 29.38);
      expect(apps.length).toBeGreaterThan(0);
      expect([...new Set(apps.map((b) => b.targetIdx))]).toEqual([MODERNIA]);
      expect([...new Set(apps.map((b) => (b.expiresFrame! - b.frame) / FPS))]).toEqual([10]);
    });

    it('EVERY application lands inside a Full Burst window (the gate is live)', () => {
      const apps = modBuffs(base.events, 'atkPct', 29.38);
      const outOfFb = apps.filter((b) => !inAnyWindow(base.events, b.frame));
      expect(outOfFb.map((b) => b.sec), 'gated ATK buff must never fire outside FB').toEqual([]);
    });

    it('DISCRIMINATING: ungated, the counter fires pre-FB / out-of-window (over-credit)', () => {
      const apps = modBuffs(atkUngated.events, 'atkPct', 29.38);
      const outOfFb = apps.filter((b) => !inAnyWindow(atkUngated.events, b.frame));
      expect(outOfFb.length, 'ungated must produce at least one out-of-FB application').toBeGreaterThan(0);
      expect(apps.length).toBeGreaterThan(modBuffs(base.events, 'atkPct', 29.38).length);
    });
  });

  describe('M5 — burst: Full Burst Duration ▲5s for the team (only her own casts extend)', () => {
    const winDurs = (evs: SimEvent[]) =>
      fbWindows(evs).map((f) => (f.endFrame - f.frame) / FPS);

    it('Modernia-cast windows run 15s (base 10 + 5); the longest window is 15s', () => {
      expect(Math.max(...winDurs(base.events))).toBe(15);
      expect(Math.min(...winDurs(base.events)), 'helm-cast windows stay at the 10s base').toBe(10);
    });

    it('DISCRIMINATING: removing the extend collapses the long windows by exactly 5s', () => {
      const baseMax = Math.max(...winDurs(base.events));
      const noExtMax = Math.max(...winDurs(noFbExtend.events));
      expect(baseMax - noExtMax, 'the extend magnitude is exactly 5s (300 frames)').toBe(5);
      expect(noExtMax).toBe(10);
    });
  });

  describe('M6 — burst: Unlimited ammunition for 15 sec (self)', () => {
    it('Modernia fires unlimited-ammo shots across the fight', () => {
      const unlimited = modShots(base.events).filter((s) => s.unlimitedAmmo);
      expect(unlimited.length).toBeGreaterThan(0);
    });

    it('is a 15s self window', () => {
      const apps = buffs(base.events).filter(
        (b) => b.stat === 'unlimitedAmmo' && b.targetIdx === MODERNIA,
      );
      expect(apps.length).toBeGreaterThan(0);
      expect([...new Set(apps.map((b) => (b.expiresFrame! - b.frame) / FPS))]).toEqual([15]);
    });

    it('DISCRIMINATING: removing the effect zeroes unlimited-ammo fire', () => {
      expect(modShots(noUnlimited.events).filter((s) => s.unlimitedAmmo).length).toBe(0);
    });
  });

  describe('M7 — burst: Destroy Mode rider, 2.24% final ATK per hit for 15s (extraHitDamagePct)', () => {
    const rider = (evs: SimEvent[]) =>
      dmg(evs).filter((d) => d.slug === 'modernia' && d.srcSlot === null);

    it('is 2.24%×hitsPerShot = 4.48% per shot, crit-eligible, srcSlot=null (summed stat)', () => {
      const r = rider(base.events);
      expect(r.length).toBeGreaterThan(0);
      expect([...new Set(r.map((d) => d.atkPct))]).toEqual([4.48]);
      expect(r.every((d) => d.critEligible), 'function additional damage crits (RIDERCRIT ON)').toBe(true);
    });

    it('is driven by a 2.24% extraHitDamagePct self buff, 15s, one per burst cast', () => {
      const apps = modBuffs(base.events, 'extraHitDamagePct', 2.24);
      expect(apps.length).toBe(modCasts(base.events));
      expect([...new Set(apps.map((b) => (b.expiresFrame! - b.frame) / FPS))]).toEqual([15]);
      expect([...new Set(apps.map((b) => b.targetIdx))]).toEqual([MODERNIA]);
    });

    it('DISCRIMINATING: removing the buff zeroes the rider', () => {
      expect(rider(noDestroyRider.events).length).toBe(0);
    });
  });
});

```

### Driver override (src/skills/overrides/modernia.json)

```json
{
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Remove this banner only when the unit has been measured/hand-tuned. — BANNER SCOPE: skill1/skill2 only (kit-parse AUTHOR 2026-07-16, wave 6); the BURST slot is HAND-AUTHORED and preserved VERBATIM (Destroy Mode fix: each hit deals +2.24% final ATK for 15s via extraHitDamagePct — the old parser read it as a 1/s DoT, massively undercounting at MG hit rates — + unlimitedAmmo 15s + fullBurstExtend +5s for the team; burstCast trigger is hard-rule-6 correct, fires only when SHE bursts). — Modernia (`modernia`, MG B3 Attacker Fire Pilgrim, ammo 300 / reloadFrames 159 / hitsPerShot 2 / normalMult 7.71): S1 block A = per-hit rider 'when normal attack hits … 3.05% of final ATK as additional damage' → hitCount count:1 (counter +2/pull, fires 2×/pull = per HIT) flatDamage 3.05 — crit-ON by engine default (U1: function additional damage crits), FB by timing (prior 2), noRange automatic; NOT re-encoded as extraHitDamagePct because that path generates NO burst gauge, whereas flatDamage emits skillGauge per proc (sim.ts skillGauge; ~+50% of her weapon's own generation at 2 procs/pull) — the established gauge economy her measured-exact rotation on graded comps depends on. Crit is no longer a differentiator: both paths crit since RIDERCRIT (2026-07-22). S1 block B = every 200 hits (=100 pulls) self critDamagePct 14.25 ×5 stacks 10s + maxAmmoPct -5.04 ×5 stacks 10s (kit-verbatim; ammo DOWN = shorter magazines = more reloads = fewer shots, engine clips live via maxAmmo(); at 5 stacks mag 300→~224). Steady-state (derived, not fitted): out of FB one mag = 150 pulls ≈ 4.3s spin + 2.65s reload → ~1.5 activations/mag ≈ every ~4.6s → ~2-3 crit-dmg stacks sustained; during Destroy Mode (unlimited ammo, no windup restart, full spin 60 pulls/s) activation every ~1.67s → caps 5 stacks ~8s in. S2 block A = 'entering Full Burst … Hit Rate ▲ 8.56% for 15 sec' all allies → fullBurstEnter buff hitRatePct 8.56 dur 15 — hitRatePct is live-wired for AR/SMG/SG since CONE_DELTA (2026-07-19), but modernia is MG and MG/SR/RL keep the flat base table, so it still yields no core lift for HER; HARD RULE 4: Hit Rate raises the CORE-HIT rate, in-game MG magnitude measured-only (⚑2); modeled so the stat exists for a future core-rate consumer and so S2 block B's gate is visible. S2 block B = 'when normal attack hits 200 time(s) DURING INCREASING HIT RATE STATUS … ATK ▲ 29.38% 10s self' → hitCount 200 self atkPct 29.38 dur 10 with fbGate:'inFb' — the status is 15s from every team-FB enter (source: her own S2a), the engine has no while-buff-active gate, so inFb is the closest proxy (⚑3): exact when she bursts (her burst extends FB to 15s ≡ the status window), undercounts the 5s post-FB tail when another B3 bursts, and the hit COUNTER accrues out-of-window (engine counts ungated; kit counts only in-status hits) — net small over-accrual into gated activations. The previous materialized file had this UNGATED, which fired the +29.38% from ~3.5s into the fight (pre-any-FB, no status) ≈ near-permanent — kit-unfaithful over-credit; the gate is text-driven, NOT a cool-the-board fudge (board 1.07 HOT n=1 noted, not fitted to). ⚑ LIST: (1) cadence tuple — MG wind-up ladder + full-spin 1 round/frame are MEASURED engine constants (identical across units), but reloadFrames 159 (datamine-unreliable class; raw shot_detail says reload_time 230 in its own units) + rolling-reload flavor (datamined reload_start_ammo 299) are unverified for her — read the reload gap + any partial-reload behavior from a focus video. (2) Hit-Rate→core-rate lift magnitude (hard rule 4, measured-only) — recipe: CORE HIT popup fraction inside vs outside the 15s post-FB-enter window in a focus video; note MG wind-up first 18 rounds never core, so compare at matched spin state. (3) S2b gate approximation (above) — recipe: count ATK▲29.38 buff-icon applications per rotation in a focus video vs sim DBG activations; also confirms whether the 200-hit counter persists across status windows. (4) PRESERVED-SLOT FINDING (no edit — hand slot): burst Destroy Mode rider rides the crit:false extraHitDamagePct path, but U1 says function-type additional damage CRITS at caster's rate — if it should crit, that is ~+crit-rate×critDmg on the 2.24% stream; ALSO datamine says the burst is skill_type ChangeWeapon (swap to shot 1026002) — the hand model keeps the base MG firing profile through Destroy Mode (windup state persists since she is already spinning), swapped-weapon cadence/multiplier deltas unverified. Skips: burst Destroy Mode auto-aim/line-of-sight/parts-consolidation clause → unmodeled.burst (inert vs the single partless scope-lock boss). Kit-autonomy gauntlet 2026-07-25: all seven kit lines independently re-derived FAITHFUL (cross-family S2b fable-5 converged; S1 per-hit rider 2×/pull, S2 fullBurstEnter-vs-burstCast, fbGate-inFb ATK gate, burstCast-keyed FB+5s, unlimited ammo, Destroy Mode rider all pinned green-vs-shipped/red-vs-counterfactual in scripts/tests/units/modernia.test.ts); added ⚑5 (Destroy Mode per-hit-vs-DoT cadence unmeasured) surfaced by the cross-family review — no encoding change, the per-hit reading and the fbGate:inFb proxy (⚑3) are the schema's best available models.",
  "caveats": [
    "skill1: reload tuple is unverified datamine — reloadFrames 159 + rolling-reload (reload_start_ammo 299); read the reload gap from any focus video (⚑1)",
    "skill2: Hit Rate ▲ 8.56% is modeled as hitRatePct — live-wired for AR/SMG/SG since CONE_DELTA (2026-07-19), but modernia is MG and MG/SR/RL keep the flat base table, so it still yields no core lift for her; whether Hit Rate lifts MG core rate in-game is unmeasured (⚑2)",
    "skill2: the ATK ▲ 29.38% 'during increasing Hit Rate status' gate is approximated as in-Full-Burst — exact when Modernia bursts (extended FB ≡ the 15s status), undercounts the 5s status tail on rotations another Burst III unit bursts (⚑3)",
    "burst: Destroy Mode per-hit 2.24% rides the extraHitDamagePct path and CRITS at her rate (SSOT damage-calculation.md §2b: function additional damage crits, never cores; RIDERCRIT default ON) — her S1 Critical Damage ▲ 14.25%×5 stacks make this term's crit lift ~+12% in-Full-Burst rather than the base +5%; the datamined ChangeWeapon (shot 1026002) fire profile is assumed identical to the base MG (⚑4)",
    "burst: Destroy Mode 2.24% CADENCE is unmeasured — shipped as a per-normal-hit rider (extraHitDamagePct, structurally parallel to S1's identically-phrased per-hit 3.05% line and consistent with the unlimited-ammo spray); the 1/s-DoT reading the parser baseline used is ~40-60× lower at MG fire rate and was rejected as a massive undercount, but no focus-video popup count confirms per-hit. Recipe: count 2.24%-valued popups per second inside the 15s Destroy Mode window — per-hit tracks fire cadence (~60/s at full spin), DoT gives exactly 1/s (⚑5)"
  ],
  "unmodeled": {
    "skill1": [],
    "skill2": [],
    "burst": [
      "Destroy Mode: Extends her line of sight and auto-aims at all enemies within range. The stage target is treated as a single enemy regardless of whether it has parts (including interruption parts)."
    ]
  },
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "hitCount",
        "count": 1
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 3.05
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "hitCount",
        "count": 200
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "critDamagePct",
          "value": 14.25,
          "durationSec": 10,
          "maxStacks": 5
        },
        {
          "kind": "buff",
          "stat": "maxAmmoPct",
          "value": -5.04,
          "durationSec": 10,
          "maxStacks": 5
        }
      ]
    }
  ],
  "skill2": [
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
          "stat": "hitRatePct",
          "value": 8.56,
          "durationSec": 15
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "hitCount",
        "count": 200
      },
      "target": {
        "kind": "self"
      },
      "fbGate": "inFb",
      "effects": [
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 29.38,
          "durationSec": 10
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
          "kind": "fullBurstExtend",
          "seconds": 5
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
          "kind": "unlimitedAmmo",
          "durationSec": 15
        },
        {
          "kind": "buff",
          "stat": "extraHitDamagePct",
          "value": 2.24,
          "durationSec": 15
        }
      ]
    }
  ]
}

```
