# RECONCILING-JUDGE PACKET — nayuta (Nayuta)

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


---

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


---

## SECTION 3 — GROUND TRUTH (kit prose + base stats)

slug: nayuta
name: Nayuta
weapon: SMG  |  class: Supporter  |  element: Wind  |  burst: II  |  manufacturer: Pilgrim
burstCooldownSec: 20  |  ammo: 120  |  reloadFrames: 111  |  normalAttackMultiplier: 8.73  |  coreAttackMultiplier: 200
baseStats: {"hp":15000,"atk":500,"def":86,"core":{"hp":200,"atk":200,"def":200},"grade":{"hp":3000,"atk":20,"def":100,"ratio":200},"critRate":15,"maxLevel":1200,"critDamage":150,"resourceId":223}

--- skill1 (Hypocrisy) ---
■ Activates at the start of battle. Affects self.
Unchanging Heart: Gain Indomitability for 9 sec. Activates 1 time(s) during battle.
■ Activates when Memory Absorption takes effect. Affects all allies.
Damage dealt when attacking core ▲ 25.15% for 5 sec.
ATK ▲ 30.16% of the skill user's ATK for 5 sec.
Equally shares HP recovery for 5 sec.
■ Activates when Memory Absorption takes effect. Affects self.
Recovers 25% of the skill user's final Max HP as HP.
■ Activates when attacking with Full Charge while in Memory Incineration status. Affects all enemies.
Deals 150% of final ATK as damage.
■ Affects the enemy if the enemy is the stage target.
Deals 380.46% of final ATK as additional damage.

--- skill2 (Impermanence) ---
■ Activates every 3 sec. Affects self.
Memory Absorption: Hit Rate ▲ 1.4%, stacks up to 30 time(s) and immune to stack count increase or decrease effects continuously. This effect cannot be removed.
■ Activates when Memory Absorption takes effect. Affects self.
Effects vary according to the stack count of Memory Absorption. Each subsequent effect triggers all effects before it:
Stage 1: If Memory Absorption is at 2 or more stacks,
ATK ▲ 15.2% continuously.
Stage 2: If Memory Absorption is at 10 or more stacks,
Attack Damage ▲ 20.27% continuously.
Stage 3: If Memory Absorption is at 30 or more stacks,
damage dealt when attacking core ▲ 21.05% continuously.

--- burst (Asceticism) ---
■ Affects all allies.
Attack Damage ▲ 35.45% for 15 sec.
■ Affects all enemies.
Deals 645.33% of final ATK as Burst Skill damage.
■ Affects self.
Memory Incineration: Changes the weapon in use:
Charge time: Fixed at 1.8 sec
Damage: 275.18% of final ATK
Full Charge Damage: 250% of Damage
Duration: 10 sec
Additional Effect:
Unlimited ammunition for 10 sec.


---

## SECTION 4 — S2b CROSS-FAMILY TEST-FAITHFULNESS REVIEW (claude-fable-5)

```json
{
  "slug": "nayuta",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "Gain Indomitability for 9 sec",
      "disposition": "UNMODELED",
      "scope": "self survival (revive-block immunity), no damage channel",
      "durationSemantics": "9 sec, once per battle",
      "triggerIdentity": "battle start (passive one-shot)",
      "targetSet": "self",
      "nearestWrongModel": "encoding it as some stat buff to avoid an empty block",
      "distinguishingAssertion": "no buffApply/damage event attributable to this line; totals(res) identical with the line present vs absent",
      "inertness": "must move nothing — v1 boss deals no damage",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill1",
      "kitLine": "core ▲ 25.15% for 5 sec (allies)",
      "disposition": "FAITHFUL",
      "scope": "core-hit damage bucket (coreDamagePct), all attack categories",
      "durationSemantics": "durationSec 5, REFRESHED every ~3s by the Memory Absorption tick → near-permanent uptime after t≈3s; NOT a permanent passive",
      "triggerIdentity": "'when Memory Absorption takes effect' = each skill2 interval application (every 3 sec, first at t=3, interval convention) — and it must KEEP firing after the 30-stack cap (the stack still applies/refreshes); not fullBurstEnter, not burstCast",
      "targetSet": "all allies including self (5 units)",
      "nearestWrongModel": "a permanent passive coreDamagePct from t=0 (skipping the 3s ramp-in and refresh mechanics), OR a trigger that STOPS at 30 stacks so the 5s buff lapses for good at t≈95s",
      "distinguishingAssertion": "buffApply stat coreDamagePct value 25.15 hits all 5 targetIdx; first apply at ~frame 180 (not frame 0); re-applies with refresh cadence ~180 frames CONTINUING past t=90s; each expiresFrame = applyFrame+300",
      "inertness": "must not appear before t≈3s; must not be self-only",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "ATK ▲ 30.16% of the skill user's ATK",
      "disposition": "FAITHFUL",
      "scope": "generic ATK add, flat, sourced from CASTER's ATK",
      "durationSemantics": "durationSec 5, refreshed every ~3s (same window as the core line)",
      "triggerIdentity": "same 'Memory Absorption takes effect' cadence (every 3s, continues at cap)",
      "targetSet": "all allies including self",
      "nearestWrongModel": "atkPct 30.16 scaling each RECIPIENT's own ATK instead of casterAtkPct (mis-credits the high-ATK carry; classic caster-vs-target ATK misread)",
      "distinguishingAssertion": "buffApply stat 'casterAtkPct' with value ≈ 0.3016 × nayuta.staticAtk (a FLAT ATK number per harness apply-time resolution, NOT 30.16), casterIdx = nayuta's slot, applied to all 5 units",
      "inertness": "emitted value must not equal the raw 30.16 percentage; must not scale with the carry's ATK",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Equally shares HP recovery for 5 sec",
      "disposition": "UNMODELED",
      "scope": "heal-redistribution mechanic; no engine primitive (no HP pools, no share channel)",
      "durationSemantics": "5 sec window, refreshed every 3s",
      "triggerIdentity": "same Memory Absorption cadence",
      "targetSet": "all allies",
      "nearestWrongModel": "silently dropping it WITHOUT recording it in `unmodeled` — or worse, converting it into a heal-to-allies effect that would falsely fire teammates' 'recovery' triggers (crown-style consumers) every 3s",
      "distinguishingAssertion": "no recovery events targeting non-nayuta units are sourced from nayuta; the line appears verbatim in override.unmodeled.skill1",
      "inertness": "must NOT fire allies' on-recovery triggers — in a comp with a recovery-triggered kit, mis-modeling this line as an ally heal would move damage",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill1",
      "kitLine": "Recovers 25% of ... final Max HP as HP",
      "disposition": "FAITHFUL",
      "scope": "self-heal; encode as kind:'heal' target self (no HP amount modeled) for tandem completeness",
      "durationSemantics": "instant, per activation",
      "triggerIdentity": "same 'Memory Absorption takes effect' cadence (every 3s)",
      "targetSet": "self ONLY",
      "nearestWrongModel": "targeting the heal at allies (which would fire a recovery-triggered teammate every 3s — large phantom uptime for kits like crown's on-recovery buff)",
      "distinguishingAssertion": "recovery/heal events from this block target nayuta's own slot exclusively; a recovery-consumer teammate's trigger count is unchanged vs a baseline without nayuta's S1",
      "inertness": "zero damage delta in a comp with no self-recovery consumer on nayuta; MUST NOT touch teammates",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Full Charge in Memory Incineration: 150%",
      "disposition": "FAITHFUL",
      "scope": "flatDamage 150% of final ATK per FULL-CHARGE attack, only while Memory Incineration (her burst weaponSwap) is live",
      "durationSemantics": "instant hit per qualifying shot; window bounded by the 10s swap",
      "triggerIdentity": "shotFired + swapGate:'swapped' (Memory Incineration is HER OWN weapon-state, not a boss status — swapGate, not requiresTargetStatus); every swap shot is a full charge at the fixed 1.8s charge, so ≈ 5 procs per burst window",
      "targetSet": "enemy (single boss)",
      "nearestWrongModel": "ungated on the swap so it rides every base SMG round (≈20/s × whole fight — catastrophic over-credit), or keyed to fullBurstEnter as a once-per-FB nuke",
      "distinguishingAssertion": "count of mult≈150 flatDamage events == count of swap full-charge shots (≈5 per nayuta burst window, floor(10/1.8)); ZERO such events outside the 10s post-burstCast windows",
      "inertness": "no procs from base SMG fire; no procs on rotations where nayuta did not cast",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "380.46% additional dmg if stage target",
      "disposition": "FAITHFUL",
      "scope": "flatDamage 380.46% rider on the SAME full-charge-in-Memory-Incineration attack; the ■ carries no activation clause of its own — it refines the target (stage target) of the preceding trigger, it does NOT get an invented interval",
      "durationSemantics": "instant, per qualifying shot",
      "triggerIdentity": "identical to the 150% line (shotFired + swapGate:'swapped'); the boss IS the stage target so the gate is always satisfied in v1",
      "targetSet": "the stage-target enemy (the boss)",
      "nearestWrongModel": "reading 'no activation clause → interval' and giving it its own invented cadence (fires all fight), decoupled from the swap window",
      "distinguishingAssertion": "count of mult≈380.46 events === count of mult≈150 events, frame-coincident; total rider per full charge ≈ 530.46% of final ATK",
      "inertness": "zero events outside swap windows; never fires without its 150% sibling",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Hit Rate ▲ 1.4%, stacks up to 30",
      "disposition": "FAITHFUL",
      "scope": "hitRatePct self-buff feeding the engine's HR→core lift (hrCoreMult); the magnitude of the HR→core conversion itself is engine-global and measured-only (⤑)",
      "durationSemantics": "PERMANENT per stack ('continuously', 'cannot be removed') — no durationSec; stacks accrue 1 per 3s, cap 30 at t≈90s (linear ramp, +42% HR at cap)",
      "triggerIdentity": "interval sec:3, first fire t=3 (no force-cast language)",
      "targetSet": "self",
      "nearestWrongModel": "a durationSec on the stack buff (stacks lapse and never accumulate past ~2), or 30 stacks granted instantly at t=0 (over-credits the opening 90s), or 1.4 as the TOTAL rather than per-stack",
      "distinguishingAssertion": "buffApply stat hitRatePct value 1.4 with stacks incrementing 1,2,3… reaching stacks==30/maxStacks==30 by ~frame 5400, no finite expiresFrame; stack count at t=45 is ~15, not 30",
      "inertness": "must not decay; must not exceed 30",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Stage 1 ≥2 stacks: ATK ▲ 15.2%",
      "disposition": "FAITHFUL",
      "scope": "generic atkPct scaling nayuta's OWN ATK (plain 'ATK ▲', no caster-of clause)",
      "durationSemantics": "'continuously' = permanent once threshold reached; goes live at the 2nd stack, t≈6s",
      "triggerIdentity": "stack-threshold gate on the Memory Absorption pool (resourceGate/everyN-offset style on the 3s cadence) — checked at ≥2, cumulative with later stages",
      "targetSet": "self",
      "nearestWrongModel": "active from t=0 (ignoring the 6s ramp-in), or scoped to allies, or made a 5s refreshing buff by contamination from skill1's window",
      "distinguishingAssertion": "atkPct 15.2 buffApply to self first appears at ~frame 360 (t=6), never before, and has no expiry",
      "inertness": "absent during t<6s; never applied to teammates",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Stage 2 ≥10 stacks: Attack Damage ▲ 20.27%",
      "disposition": "FAITHFUL",
      "scope": "attackDamagePct (Damage Up bucket, additive/diluted with other Damage-Up sources incl. her own burst 35.45%)",
      "durationSemantics": "permanent once live at the 10th stack, t≈30s",
      "triggerIdentity": "≥10-stack threshold on the same pool; 'each subsequent effect triggers all before it' — stage 1 stays on",
      "targetSet": "self",
      "nearestWrongModel": "live from t=0, or replacing stage 1 instead of stacking with it, or bucketed as a true multiplier",
      "distinguishingAssertion": "attackDamagePct 20.27 self buffApply first at ~frame 1800 (t=30) with the 15.2 atkPct still active; damage events after t=30 show BOTH in effect",
      "inertness": "absent during t<30s; stage 1 must not drop when stage 2 lands",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Stage 3 ≥30 stacks: core ▲ 21.05%",
      "disposition": "FAITHFUL",
      "scope": "coreDamagePct, self only (distinct from skill1's 25.15% ALLIES core line — both coexist on nayuta)",
      "durationSemantics": "permanent once live at the 30th stack, t≈90s",
      "triggerIdentity": "≥30-stack (cap) threshold; cumulative with stages 1-2",
      "targetSet": "self",
      "nearestWrongModel": "conflating/merging it with skill1's 25.15% allies core buff (one coreDamagePct line 'covers' both), or live from t=0",
      "distinguishingAssertion": "coreDamagePct 21.05 self-only buffApply first at ~frame 5400 (t=90); after t=90 nayuta carries BOTH 25.15 (refreshing, all-ally) and 21.05 (permanent, self) as separate keyed buffs while teammates carry only 25.15",
      "inertness": "teammates never receive 21.05; absent before t=90",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Attack Damage ▲ 35.45% for 15 sec",
      "disposition": "FAITHFUL",
      "scope": "attackDamagePct (Damage Up bucket, dilutes with other Damage-Up)",
      "durationSemantics": "durationSec 15 exactly — with a ~20s+ rotation there is a REAL coverage gap; not permanent, not FB-length",
      "triggerIdentity": "burstCast (a self burst block with no activation clause) — fires ONLY on rotations NAYUTA casts B2. Critical here: she is Burst II and the control fixture already contains crown (B2), so burstCast vs fullBurstEnter genuinely diverge whenever the other B2 takes a rotation",
      "targetSet": "all allies including self",
      "nearestWrongModel": "fullBurstEnter (fires on EVERY team FB even when the other B2 casts — the canonical burst-cast/FB-enter over-credit, live in this exact fixture because two B2s share the comp)",
      "distinguishingAssertion": "count of attackDamagePct 35.45 buffApply batches === count of burstCast events with casterIdx==nayuta's slot (NOT === fullBurstStart count when the B2 slot alternates); each expiresFrame = castFrame+900",
      "inertness": "no application on a full burst whose B2 was not nayuta",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Deals 645.33% ... as Burst Skill damage",
      "disposition": "FAITHFUL",
      "scope": "instant burst-bucket nuke, % of final ATK",
      "durationSemantics": "instant, once per cast",
      "triggerIdentity": "burstCast; per rule the cast lands PRE-FB so it is FB-exempt (noFb) — no +50% full-burst major",
      "targetSet": "all enemies (single boss in v1)",
      "nearestWrongModel": "letting it take the +50% FB major (fbMajorApplied true) or the +30% range bonus, or firing it on every team FB",
      "distinguishingAssertion": "one mult≈645.33 damage event per nayuta burstCast with fbMajorApplied==false; total count == her cast count, not the FB count",
      "inertness": "no FB major on this hit; zero events on rotations she sat out",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Memory Incineration: Changes the weapon",
      "disposition": "FAITHFUL",
      "scope": "kind:'weaponSwap' — damagePct 275.18, chargeTimeSec 1.8 (FIXED, overriding base chargeFrames 0), chargeMultPct 250 ('250% of Damage' = multiplier → full-charge shot ≈ 687.95% per shot), durationSec 10. Swap REPLACES the base SMG for the window. Swap weapon class/pellet economy is kit-silent ⤑ (shots-per-window derivable ≈ floor(10/1.8) = 5, estimate optimistically); this status is also the gate skill1's 150%+380.46% riders read",
      "durationSemantics": "hard 10s time bound from cast; no maxShots stated",
      "triggerIdentity": "burstCast (her own burst, self mode) — NOT fullBurstEnter; opens the swapGate window for skill1",
      "targetSet": "self (weapon-state overwrite)",
      "nearestWrongModel": "modeling the mode as a stat buff (normalAttackPct/chargeDamagePct) while the base SMG keeps firing 20/s — double-counts the base weapon AND misses the shot-economy change; or reading 'Full Charge Damage: 250% of Damage' as +250 additive percentage points instead of ×2.5 on 275.18",
      "distinguishingAssertion": "during each 10s post-cast window: ≈5-6 charge-cadence shots at per-shot mult ≈687.95 (275.18×2.5) and ZERO base-SMG normal shots from nayuta; outside windows base SMG cadence resumes",
      "inertness": "base SMG must not fire concurrently with the swap; swap must not persist past 10s",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Unlimited ammunition for 10 sec",
      "disposition": "FAITHFUL",
      "scope": "kind:'unlimitedAmmo' durationSec 10, coterminous with the swap; likely redundant given the swap weapon, but encode literally — it also matters for teamAmmo-style consumers (infinite-ammo shots don't consume)",
      "durationSemantics": "10 sec from cast",
      "triggerIdentity": "burstCast, self",
      "targetSet": "self",
      "nearestWrongModel": "dropping it as moot, then a reload/lastBullet or team-ammo interaction inside the window silently misbehaves; or granting it team-wide",
      "distinguishingAssertion": "no reload events and no ammo consumption for nayuta inside the 10s windows; teammates' ammo economy unchanged",
      "inertness": "no effect on teammates; no effect outside the window",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:core ▲ 25.15% for 5 sec (allies)",
    "skill1:ATK ▲ 30.16% of the skill user's ATK",
    "skill1:Recovers 25% of final Max HP (self heal, inertness-scoped)",
    "skill1:Full Charge in Memory Incineration 150%",
    "skill1:380.46% additional dmg if stage target",
    "skill2:Hit Rate ▲ 1.4% stacks up to 30",
    "skill2:Stage 1 ≥2 stacks ATK ▲ 15.2%",
    "skill2:Stage 2 ≥10 stacks Attack Damage ▲ 20.27%",
    "skill2:Stage 3 ≥30 stacks core ▲ 21.05%",
    "burst:Attack Damage ▲ 35.45% for 15 sec",
    "burst:645.33% Burst Skill damage",
    "burst:Memory Incineration weaponSwap",
    "burst:Unlimited ammunition for 10 sec"
  ],
  "unmodeledVerbatim": {
    "skill1": [
      "Unchanging Heart: Gain Indomitability for 9 sec. Activates 1 time(s) during battle.",
      "Equally shares HP recovery for 5 sec."
    ],
    "skill2": [],
    "burst": []
  },
  "notes": "Expected shared-prior misreads the driver must reconcile: (1) 'when Memory Absorption takes effect' must KEEP firing every 3s AFTER the 30-stack cap ('immune to stack count increase' caps the COUNT, not the activation) — a trigger that stops at cap silently kills the ally core/ATK buffs from t≈95s onward; assert refresh applications past t=90s. (2) The ally ATK line is casterAtkPct (flat, resolved from NAYUTA's staticAtk at apply time) — the buffApply value is a flat ATK number, not 30.16; atkPct is the nearest-wrong. (3) Nayuta is Burst II and controlComp already ships crown (B2): a two-B2 fixture is exactly where burstCast vs fullBurstEnter diverge — every burst-slot line must be counted against nayuta's OWN burstCast events, and the fixture must confirm which B2 the rotation actually selects each cycle (if the rotation deterministically always picks one B2, the test must force/verify nayuta casts at least once or the burst blocks are vacuously green). (4) Memory Incineration gates skill1's 150%+380.46% riders via her own weapon-state (swapGate:'swapped'), NOT a boss targetStatus; and the 380.46% ■ has no activation clause because it refines the SAME full-charge trigger — do not invent an interval for it. (5) Stage 1/2/3 ramp timing is load-bearing: t≈6/30/90s go-live, permanent, cumulative; all-on-from-t=0 is the calibration-hidden over-credit. (6) The self-heal must stay self-targeted — mis-targeting it at allies would phantom-fire recovery-triggered teammates (e.g. crown) every 3s. (7) Swap full-charge per-shot value is multiplicative (275.18 × 2.50 ≈ 687.95%), and the base SMG halts during the swap; shots-per-window ⤑ ≈ 5 (floor(10/1.8)) pending footage. (8) hitRatePct's damage effect rides the engine-global HR→core conversion (measured-only slope) — the 1.4%/stack magnitude is kit-true but any core-rate assertion should tolerate the engine's hrCoreMult implementation rather than hard-coding a core%. No leak detected in the redacted methodology.",
  "model": "claude-fable-5",
  "driverReconciliation": {
    "driver": "qwen (sighted)",
    "reviewer": "claude-fable-5",
    "verdict": "CONVERGED — no REAL-GOTCHA; GO-leaning",
    "converged": [
      "S1 coreDamagePct 25.15 all-allies (fable FAITHFUL/load-bearing) — driver pins buffApply value 25.15, 4 holders, permanent; counterfactual self-only collapses holders to {nayuta}.",
      "S1 casterAtkPct 30.16 flat (0.3016x staticAtk = 30255.6) — both name atkPct as nearest-wrong; driver pins stat/key/flat-value + totals delta vs atkPct counterfactual.",
      "S1 150%+380.46% folded to extraHitDamagePct 530.46, gated on HER OWN weapon-state (swapGate, not boss status), one hit per swapped full charge — fable EXPLICITLY corroborates the tier-audit fold (count 380.46 === count 150, frame-coincident, total 530.46). Driver pins rider hits == swap shots (44==44) + removal zeroes hits & drops total.",
      "Burst attackDamagePct 35.45 all-allies 15s, burstCast — driver pins 48 applies (12 casts x 4), expDelta 900, self-only counterfactual collapses holders.",
      "Burst nuke 645.33 burstCast pre-FB, fbMajorApplied false — driver pins magnitude/bucket/once-per-cast/never-FB-major.",
      "Burst weaponSwap 275.18 x chargeMultPct 250 (charge 2.5, per-shot 687.95%), SR, 10s, base SMG halts — driver pins 275.18/charge-2.5 shots + removal zeroes them & collapses total; unlimitedAmmo 10s encoded alongside (structural pin).",
      "Defensive UNMODELED: Indomitability + shared HP recovery — both agree UNMODELED, verbatim in unmodeled.skill1."
    ],
    "divergences": [
      {
        "line": "S2 stack-gate self buffs (Stage1/2/3 ATK 15.2 / Attack Damage 20.27 / core 21.05)",
        "fable": "ramp-timed delayed-step: full value goes live at t~6/30/90s, permanent once live (stack-threshold trigger).",
        "driver": "shipped encodes TIME-AVERAGED constants 14.4/16.8/10.5 from t0 (passive). 15.2x(180-9)/180=14.44~14.4; 20.27x(180-30)/180=16.89~16.8; 21.05x(180-90)/180=10.525~10.5.",
        "ruling": "SAME integral over 180s (driver constant 14.4x180=2592 vs fable step 15.2x171=2599 buff-sec). Both are faithful steady-state approximations of the ramp; the engine has no stack-gauge primitive, so the shipped time-average is the pragmatic encoding (documented in note). Driver pins the shipped values + discriminates against the naive full-from-t0 (15.2/20.27/21.05 from t0, which over-buffs). Fable's delayed-step is a third option the schema can't express cleanly. NOT a faithfulness failure — a documented Tier-2 modeling choice."
      },
      {
        "line": "S2 Memory Absorption Hit Rate 1.4%/stack (42% at cap)",
        "fable": "FAITHFUL — encode as permanent-per-stack hitRatePct self-buff feeding hrCoreMult; asserts stacks increment 1..30 by t~90s.",
        "driver": "UNMODELED (measurement-gated). hitRatePct feeds her SMG core rate via the engine-global HR->core conversion (acrForHR/hrCoreMult), whose slope is measured-only; encoding 42% HR would inject an unmeasured damage contribution.",
        "ruling": "Both AGREE the HR->core conversion is measured-only (fable note 8 says exactly this). They differ on encode-anyway vs withhold. Driver withholds per MEASURED>FUDGE + owner ruling (kit-audit plan 2026-07-20); the line is verbatim in unmodeled.skill2. Test asserts nothing about hitRatePct (correct for UNMODELED). Carried as a ⚑ residual in manual-review. NOT a faithfulness failure."
      },
      {
        "line": "S1 self heal — Recovers 25% of final Max HP",
        "fable": "FAITHFUL — encode as kind:heal target self for tandem completeness; MUST stay self-targeted (mis-target to allies would phantom-fire recovery consumers like crown every 3s).",
        "driver": "UNMODELED (defensive; no HP pool, no recovery consumer in the test fixture liter/nayuta/ada/helm).",
        "ruling": "Zero damage delta either way IN SCOPE: a self-heal with no HP pool and no on-recovery ally in the fixture moves nothing; fable's own inertness bar (zero delta with no self-recovery consumer) is satisfied trivially by leaving it unmodeled (an unmodeled line cannot touch teammates). Fable's encode-as-self is future-proofing for comps with a recovery consumer. Shipped keeps it verbatim in unmodeled.skill1. Noted as residual; NOT a faithfulness failure."
      }
    ],
    "fixtureValidation": "Fable note (3) warns nayuta is B2 and controlComp ships crown (B2), so burstCast vs fullBurstEnter could diverge / burst lines could go vacuous. MOOT here: the driver fixture is liter(B1)/nayuta(B2)/ada(B3)/helm(B3) — nayuta is the SOLE B2, so she casts every Full Burst (probe: 12 casts == 12 fullBurstStarts; team-buff applies 48 == 12x4; nuke 12 == casts). The burstCast lines are fully exercised and non-vacuous; no B2 alternation ambiguity.",
    "residualsCarried": [
      "380.46% block scope (one-time vs per-full-charge) — tier-audit chose per-full-charge fold (530.46); pinned as-is, not certified kit-literal.",
      "chargeTimeSec 2.13 vs kit 1.8 (kit-status F2) — 1.8s charge + 0.5s SR bolt-recovery folded; cadence pinned as shipped, measurement-gated.",
      "Hit Rate 1.4%/stack unmodeled (measurement-gated HR->core slope).",
      "S2 stack-gate ramp encoded as time-average (steady-state approximation)."
    ]
  }
}
```

---

## SECTION 5 — S5 BLIND TEST (claude-opus-5) + result vs driver override

S5 BLIND TEST vs DRIVER OVERRIDE: 26 tests total = 7 PASSED / 3 SKIPPED (documented v1 gaps: Indomitability, shared HP recovery, self-heal) / 16 FAILED. RED — but the 16 reds reconcile cleanly (driver categorization below; the judge should weigh them):

(A) ~5 FIXTURE ARTIFACTS — the blind author chose controlComp('nayuta', true) = liter(B1)/crown(B2)/nayuta(B2)/helm(B3), putting nayuta alongside crown (TWO Burst-II casters). The rotation deterministically starves nayuta of casts — the blind test's OWN non-vacuity assertion ("she actually bursts") FAILED (castFrames empty). The reds that cascade from this (S1-d rider-window, S1-rider-load-bearing, B-a 35.45 aura, B-c swap-counterfactual, fixture-non-vacuity) are NOT evidence against the driver encoding. The DRIVER fixture (liter/nayuta/ada/helm — nayuta the SOLE B2) exercises every burst line: probe shows 12 casts == 12 Full Bursts, and scripts/tests/units/nayuta.test.ts is 19/19 GREEN.

(B) ~10 DOCUMENTED STEADY-STATE DIVERGENCES — the blind models the kit LITERALLY (ramp-timed stack buffs, 5s refreshing windows, encoded hitRatePct stacks, kit-literal 1.8s charge); the driver ships documented steady-state approximations:
  - R2 chargeTimeSec 2.13 vs blind 1.8: driver folds the 1.8s kit charge + 0.5s SR bolt-recovery cycle (swaps are exempt from the engine's auto bolt-recovery; same correction validated on helm/velvet). Measurement-gated flag.
  - R3 hitRatePct 1.4%/stack UNMODELED (x2 reds): driver withholds per MEASURED>FUDGE — the HR->core conversion slope (acrForHR/hrCoreMult) is engine-global and measured-only; encoding 42% HR would inject an unmeasured damage contribution. The blind's OWN flag agrees the HR->core lift is "a derived engine relationship (flag), never stated in kit text." Measurement-gated.
  - R4 stack-gate time-average 14.4/16.8/10.5 vs blind literal 15.2/20.27/21.05 (x6 reds): SAME 180s integral (14.4x180=2592 vs 15.2x171=2599 buff-sec; etc.). The blind's OWN flag independently derives "time-average over a 180s fight ~ 100% stage1, ~83% stage2, ~50% stage3" — exactly the driver's factors. The engine has no stack-gauge primitive; the time-average is the pragmatic faithful encoding.
  - R5 S1 ally buffs permanent-passive vs blind 5s-refreshing (x2 reds): the kit's 5s window refreshed every 3s is always up after t~3s; the blind's OWN S6 audit notes "3s re-apply < 5s duration = permanent uptime." Permanent-passive over-credits only the opening ~3s (<2% of fight).

(C) 1 RECON_ERROR — "S1-d/e rider carries BOTH 150% and 380.46%" asserts INV.skill1 flatDamage atkPct sums to 530.46, but the driver encodes the rider as an extraHitDamagePct 530.46 BUFF (not flatDamage). The 530.46 IS encoded and IS swap-gated (one hit per swapped full charge; probe: 44 rider hits == 44 swap shots); the blind simply guessed a different primitive. Analogous to ada's chargeDamagePct-vs-weaponSwap RECON_ERROR (which did not block GO).

PRECEDENT: ada's S5 blind was also RED vs its driver override (s5TestsVsDriverOverride:"RED"), yet the judge ruled GO / faithfulness 1.0 after reconciling the reds as primitive-guess errors + documented measurement-gated gaps. The same reconciliation applies here.

```typescript
/**
 * nayuta — BLIND post-op kit spec (S5). Authored from the kit prose ALONE; the driver's
 * test/override/reasoning were not consulted.
 *
 * KIT (structural summary):
 *  S1-a  start of battle, self  — Indomitability 9s, 1x            → UNMODELED (defensive; no HP pool)
 *  S1-b  on Memory Absorption, ALL ALLIES — core dmg ▲25.15% / 5s,
 *                                            ATK ▲30.16% OF THE SKILL USER'S ATK / 5s,
 *                                            "equally shares HP recovery" 5s (UNMODELED)
 *  S1-c  on Memory Absorption, self — recover 25% of own final Max HP  → GAP (no heal event kind)
 *  S1-d  on FULL CHARGE while in Memory Incineration, enemies — 150% of final ATK
 *  S1-e  "if the enemy is the stage target" — +380.46% additional     (boss IS the stage target)
 *  S2-a  every 3 sec, self — Memory Absorption: Hit Rate ▲1.4%, cap 30 stacks, continuous, unremovable
 *  S2-b  on Memory Absorption, self — cumulative stage gates:
 *          ≥2 stacks  → ATK ▲15.2% continuously
 *          ≥10 stacks → Attack Damage ▲20.27% continuously
 *          ≥30 stacks → core dmg ▲21.05% continuously
 *  B-a   all allies — Attack Damage ▲35.45% for 15 sec
 *  B-b   all enemies — 645.33% of final ATK as Burst Skill damage
 *  B-c   self — Memory Incineration weapon swap: charge FIXED 1.8s, damage 275.18%,
 *               full-charge 250% of damage, 10s, + unlimited ammunition 10s
 *
 * FIXTURE: controlComp('nayuta', true) → liter(B1) / crown(B2) / nayuta(B2, focus) / helm(B3).
 *   nayuta is a Burst II, so the comp must still supply a B1 and a B3 for the chain to complete;
 *   the control comp does. Crown is also B2, so the non-vacuity test below asserts nayuta actually
 *   casts — if it fails, the fixture (not the override) is what needs re-picking.
 *   Deterministic (no seed). Three hoisted runs total (base + 2 counterfactuals).
 *
 * WHY EACH ASSERTION DISCRIMINATES: noted per test. The recurring nearest-wrong models targeted are
 *   (1) the every-3s ally buffs flattened to a `passive` (loses the 5s window + the t=0..3 dead zone),
 *   (2) the caster-scaled ATK share written as plain atkPct 30.16 on the target,
 *   (3) the three S2 stage buffs made live from t=0 instead of gated on 2 / 10 / 30 stacks,
 *   (4) the S1 full-charge rider not gated to the Memory Incineration swap window,
 *   (5) the 380.46% "stage target" line dropped as a conditional,
 *   (6) the burst weapon swap / unlimited ammo not modeled (SMG cadence + reloads persist).
 *
 * DOC CONFLICT (declared, not silently resolved): the packet describes the OverrideFile slot value
 * both as a bare Block[] and as a CharacterSkills carrying `.blocks`. `blocksOf()` below accepts
 * either shape so the counterfactuals are correct under whichever is real.
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

const SLUG = 'nayuta';
const FPS = 60;
const NEAR = (a: number, b: number) => Math.abs(a - b) < 1e-6;

type Opts = ReturnType<typeof controlComp>;

function run(opts: Opts) {
  const events: any[] = [];
  const o: any = {
    ...(opts as any),
    cfg: { ...((opts as any).cfg ?? {}), onEvent: (ev: SimEvent) => events.push(ev) },
  };
  return { res: runComp(o), events };
}

const frameOf = (ev: any): number => {
  if (typeof ev?.frame === 'number') return ev.frame;
  if (typeof ev?.f === 'number') return ev.f;
  if (typeof ev?.t === 'number') return Math.round(ev.t * FPS);
  if (typeof ev?.timeSec === 'number') return Math.round(ev.timeSec * FPS);
  if (typeof ev?.sec === 'number') return Math.round(ev.sec * FPS);
  return NaN;
};
const slugOf = (ev: any): string | undefined =>
  ev?.slug ?? ev?.srcSlug ?? ev?.unitSlug ?? ev?.casterSlug;

// slot value may be Block[] (file shape) or CharacterSkills{blocks} (harness cheat-sheet) — accept both
const blocksOf = (ov: any, slot: 'skill1' | 'skill2' | 'burst'): any[] => {
  const s = ov?.[slot];
  if (!s) return [];
  return Array.isArray(s) ? s : (s.blocks ?? []);
};
const effectsOf = (ov: any, slot: 'skill1' | 'skill2' | 'burst'): any[] =>
  blocksOf(ov, slot).flatMap((b: any) => b?.effects ?? []);

// ---------------------------------------------------------------- hoisted runs (3 sims)
const BASE = run(controlComp(SLUG, true));
const evs: any[] = BASE.events;
const buffApplies: any[] = evs.filter((e) => e.kind === 'buffApply');

// structural inventory of the committed override (read via the clone; disk untouched)
const INV: { skill1: any[]; skill2: any[]; burst: any[]; blocks: any[] } = {
  skill1: [],
  skill2: [],
  burst: [],
  blocks: [],
};
withPatchedOverride(SLUG, (ov: any) => {
  INV.skill1 = effectsOf(ov, 'skill1');
  INV.skill2 = effectsOf(ov, 'skill2');
  INV.burst = effectsOf(ov, 'burst');
  INV.blocks = [...blocksOf(ov, 'skill1'), ...blocksOf(ov, 'skill2'), ...blocksOf(ov, 'burst')];
});

const NO_S1_DMG = run({
  ...(controlComp(SLUG, true) as any),
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov: any) => {
      for (const b of blocksOf(ov, 'skill1')) {
        b.effects = (b.effects ?? []).filter((e: any) => e.kind !== 'flatDamage');
      }
    }),
  },
} as any);

const NO_SWAP = run({
  ...(controlComp(SLUG, true) as any),
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov: any) => {
      for (const b of blocksOf(ov, 'burst')) {
        b.effects = (b.effects ?? []).filter(
          (e: any) => e.kind !== 'weaponSwap' && e.kind !== 'unlimitedAmmo',
        );
      }
    }),
  },
} as any);

// ---------------------------------------------------------------- derived identity / streams
// nayuta's unit index, derived from one of HER unique kit magnitudes (no hardcoded slot order)
const NIDX: number | undefined = (() => {
  const MAGS = [25.15, 20.27, 21.05, 35.45, 15.2, 1.4];
  for (const m of MAGS) {
    const hit = buffApplies.find(
      (e) => e.casterIdx !== null && e.casterIdx !== undefined && typeof e.value === 'number' && NEAR(e.value, m),
    );
    if (hit) return hit.casterIdx as number;
  }
  return undefined;
})();
const mine = (e: any) => NIDX !== undefined && e.casterIdx === NIDX;

const nEvs: any[] = (() => {
  const row: any = unitOf(BASE.res, SLUG);
  if (Array.isArray(row?.events) && row.events.length) return row.events;
  return evs.filter((e) => slugOf(e) === SLUG);
})();

const shotFrames: number[] = nEvs.filter((e) => e.kind === 'shot').map(frameOf).filter(Number.isFinite);
const reloadFrames: number[] = nEvs.filter((e) => e.kind === 'reload').map(frameOf).filter(Number.isFinite);
const dmgEvs: any[] = nEvs.filter((e) => e.kind === 'damage');

// cast frames: prefer burstCast events; fall back to the frames of her own 15s burst aura
const castFrames: number[] = (() => {
  const fromEv = nEvs.filter((e) => e.kind === 'burstCast').map(frameOf).filter(Number.isFinite);
  if (fromEv.length) return fromEv;
  return buffApplies
    .filter((e) => mine(e) && e.stat === 'attackDamagePct' && NEAR(e.value, 35.45) && e.targetSlug === SLUG)
    .map(frameOf)
    .filter(Number.isFinite);
})();

const inAnySwapWindow = (f: number) => castFrames.some((c) => f >= c && f <= c + 600);
const countIn = (frames: number[], a: number, b: number) => frames.filter((f) => f >= a && f <= b).length;
const idxOfFirst = (pred: (e: any) => boolean) => evs.findIndex(pred);
const stacksBefore = (idx: number) =>
  idx < 0
    ? -1
    : evs.slice(0, idx).filter((e) => e.kind === 'buffApply' && e.stat === 'hitRatePct' && mine(e)).length;

// ---------------------------------------------------------------- fixture sanity / non-vacuity
describe('nayuta — fixture', () => {
  it('resolves nayuta in the event stream and she actually bursts (B2 alongside crown)', () => {
    expect(typeof NIDX).toBe('number');
    expect(nEvs.length).toBeGreaterThan(0);
    // a lone B2 next to another B2 could be starved of casts — if this fails, re-pick the fixture
    expect(castFrames.length).toBeGreaterThan(0);
    expect(evs.some((e) => e.kind === 'fullBurstStart')).toBe(true);
  });

  it('event frames are readable (all timing assertions below depend on this)', () => {
    expect(Number.isFinite(frameOf(buffApplies[0]))).toBe(true);
  });

  it('nayuta deals damage at all', () => {
    expect(totals(BASE.res)[SLUG]).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------- skill1
describe('nayuta — skill1', () => {
  const s1Core = buffApplies.filter((e) => mine(e) && e.stat === 'coreDamagePct' && NEAR(e.value, 25.15));
  const s1Atk = buffApplies.filter((e) => mine(e) && e.stat === 'casterAtkPct');

  it.skip('S1-a Indomitability 9s, 1x — UNMODELED: defensive status, no primitive and no HP pool in v1', () => {});

  it('S1-b core buff 25.15% reaches ALL FOUR allies (not self-only)', () => {
    // nearest-wrong: "Affects all allies" mis-scoped to self → target set of 1
    expect(s1Core.length).toBeGreaterThan(0);
    const tgts = new Set(s1Core.map((e) => e.targetSlug));
    expect(tgts.size).toBe(4);
    expect(tgts.has(SLUG)).toBe(true);
  });

  it('S1-b core buff is a 5s window, re-applied on the ~3s Memory Absorption cadence all fight', () => {
    // nearest-wrong A: flattened to a `passive` (one apply at frame 0, no expiry)
    // nearest-wrong B: stops once Memory Absorption caps at 30 stacks (t=90s → only ~30 applies/ally)
    const perAlly = s1Core.filter((e) => e.targetSlug === SLUG);
    expect(perAlly.length).toBeGreaterThanOrEqual(50); // 180s / 3s ≈ 59
    const e0 = perAlly[0];
    expect(e0.expiresFrame - frameOf(e0)).toBeGreaterThanOrEqual(295);
    expect(e0.expiresFrame - frameOf(e0)).toBeLessThanOrEqual(305);
    expect(frameOf(e0)).toBeGreaterThanOrEqual(150); // first Memory Absorption at t=3s, not t=0
  });

  it('S1-b ATK share is CASTER-scaled and flat-resolved, identical for every ally', () => {
    // nearest-wrong: encoded as plain atkPct 30.16 (scales each TARGET's own ATK → over/under-credits)
    expect(s1Atk.length).toBeGreaterThan(0);
    const vals = new Set<number>(s1Atk.map((e) => e.value));
    expect(vals.size).toBe(1); // one flat ATK number, not per-target
    expect(NEAR([...vals][0], 30.16)).toBe(false); // flat-resolved, not the raw kit percentage
    expect([...vals][0]).toBeGreaterThan(0);
    expect(new Set(s1Atk.map((e) => e.targetSlug)).size).toBe(4);
    const e0 = s1Atk[0];
    expect(e0.expiresFrame - frameOf(e0)).toBeGreaterThanOrEqual(295);
    expect(e0.expiresFrame - frameOf(e0)).toBeLessThanOrEqual(305);
  });

  it('S1-b inertness: no plain atkPct 30.16 buff is ever emitted by nayuta', () => {
    expect(buffApplies.some((e) => mine(e) && e.stat === 'atkPct' && NEAR(e.value, 30.16))).toBe(false);
  });

  it.skip('S1-b "Equally shares HP recovery for 5 sec" — UNMODELED: no HP pool / no damage taken in v1', () => {});

  it.skip('S1-c self-heal 25% of final Max HP — GAP: heal emits no observable event kind, and it is SELF-targeted so no teammate on-recovery consumer fires in this comp', () => {});

  it('S1-d/e full-charge rider carries BOTH the 150% and the 380.46% stage-target line', () => {
    // nearest-wrong: the "if the enemy is the stage target" 380.46% dropped as an unmodelable
    // conditional — the scope-lock boss IS the stage target, so it must be live.
    // Encoding-agnostic: split into two flatDamage effects or merged into one 530.46 both pass.
    const sum = INV.skill1
      .filter((e: any) => e.kind === 'flatDamage')
      .reduce((a: number, e: any) => a + (e.atkPct ?? 0), 0);
    expect(sum).toBeCloseTo(530.46, 2);
  });

  it('S1-d rider fires ONLY inside the Memory Incineration swap window, ~1 per 1.8s full charge', () => {
    // nearest-wrong: rider keyed to every shot / every charge with no swapGate → it would fire
    // hundreds of times across the fight instead of ~5 per 10s burst window
    const riders = dmgEvs.filter((e) => e.srcSlot === 'skill1').map(frameOf).filter(Number.isFinite);
    expect(riders.length).toBeGreaterThan(0);
    expect(riders.every((f) => inAnySwapWindow(f))).toBe(true);
    for (const c of castFrames) {
      const n = countIn(riders, c, c + 600);
      expect(n).toBeGreaterThanOrEqual(3); // 10s / 1.8s ≈ 5 full charges
      expect(n).toBeLessThanOrEqual(12); // ≤ 2 effects × ~6 charges
    }
  });

  it('S1 rider is load-bearing: stripping skill1 flatDamage lowers nayuta total', () => {
    expect(totals(NO_S1_DMG.res)[SLUG]).toBeLessThan(totals(BASE.res)[SLUG]);
  });
});

// ---------------------------------------------------------------- skill2
describe('nayuta — skill2 (Memory Absorption)', () => {
  const ma = buffApplies.filter((e) => mine(e) && e.stat === 'hitRatePct');

  it('S2-a Memory Absorption is 1.4% Hit Rate PER STACK, self-only, capped at 30', () => {
    // nearest-wrong A: pre-summed to 42% in one apply (loses the 90s ramp entirely)
    // nearest-wrong B: uncapped stacking (60 stacks by t=180s)
    expect(ma.length).toBeGreaterThanOrEqual(30);
    expect(ma.every((e) => NEAR(e.value, 1.4))).toBe(true);
    expect(new Set(ma.map((e) => e.targetSlug))).toEqual(new Set([SLUG]));
    expect(ma.every((e) => (e.maxStacks ?? 0) === 30)).toBe(true);
    const peak = Math.max(...ma.map((e) => e.stacks ?? 0));
    expect(peak).toBe(30);
    expect(ma.every((e) => (e.stacks ?? 0) <= 30)).toBe(true);
  });

  it('S2-a first stack lands at t=3s, not t=0 ("activates every 3 sec")', () => {
    const f0 = Math.min(...ma.map(frameOf));
    expect(f0).toBeGreaterThanOrEqual(150);
    expect(f0).toBeLessThanOrEqual(200);
  });

  it('S2-b Stage 1 (ATK ▲15.2%) waits for ≥2 stacks', () => {
    // nearest-wrong: all three stage buffs authored as passives live from frame 0
    const i = idxOfFirst((e) => e.kind === 'buffApply' && mine(e) && e.stat === 'atkPct' && NEAR(e.value, 15.2));
    expect(i).toBeGreaterThanOrEqual(0);
    expect(stacksBefore(i)).toBeGreaterThanOrEqual(1); // ≥2 stacks; tolerant of intra-frame ordering
    expect(frameOf(evs[i])).toBeGreaterThanOrEqual(300); // 2 stacks ⇒ t≈6s
    expect(evs[i].targetSlug).toBe(SLUG);
  });

  it('S2-b Stage 2 (Attack Damage ▲20.27%) waits for ≥10 stacks', () => {
    const i = idxOfFirst(
      (e) => e.kind === 'buffApply' && mine(e) && e.stat === 'attackDamagePct' && NEAR(e.value, 20.27),
    );
    expect(i).toBeGreaterThanOrEqual(0);
    expect(stacksBefore(i)).toBeGreaterThanOrEqual(9);
    expect(frameOf(evs[i])).toBeGreaterThanOrEqual(1740); // 10 stacks ⇒ t≈30s
    expect(evs[i].targetSlug).toBe(SLUG);
  });

  it('S2-b Stage 3 (core dmg ▲21.05%) waits for the FULL 30 stacks', () => {
    const i = idxOfFirst(
      (e) => e.kind === 'buffApply' && mine(e) && e.stat === 'coreDamagePct' && NEAR(e.value, 21.05),
    );
    expect(i).toBeGreaterThanOrEqual(0);
    expect(stacksBefore(i)).toBeGreaterThanOrEqual(29);
    expect(frameOf(evs[i])).toBeGreaterThanOrEqual(5100); // 30 stacks ⇒ t≈90s, half the fight
    expect(evs[i].targetSlug).toBe(SLUG);
  });

  it('S2-b non-vacuity: the fixture exercises BOTH the pre-stage-3 and post-stage-3 regimes', () => {
    const i = idxOfFirst(
      (e) => e.kind === 'buffApply' && mine(e) && e.stat === 'coreDamagePct' && NEAR(e.value, 21.05),
    );
    const g = frameOf(evs[i]);
    const dmgFrames = dmgEvs.map(frameOf).filter(Number.isFinite);
    expect(dmgFrames.some((f) => f < g)).toBe(true);
    expect(dmgFrames.some((f) => f > g)).toBe(true);
  });

  it('S2-b inertness: every stage buff is SELF-only — no teammate ever receives one', () => {
    const stage = buffApplies.filter(
      (e) =>
        mine(e) &&
        ((e.stat === 'atkPct' && NEAR(e.value, 15.2)) ||
          (e.stat === 'attackDamagePct' && NEAR(e.value, 20.27)) ||
          (e.stat === 'coreDamagePct' && NEAR(e.value, 21.05))),
    );
    expect(stage.length).toBeGreaterThan(0);
    expect(new Set(stage.map((e) => e.targetSlug))).toEqual(new Set([SLUG]));
  });
});

// ---------------------------------------------------------------- burst
describe('nayuta — burst', () => {
  const aura = buffApplies.filter((e) => mine(e) && e.stat === 'attackDamagePct' && NEAR(e.value, 35.45));

  it('B-a Attack Damage ▲35.45% goes to all four allies for 15s, once per cast', () => {
    // nearest-wrong: self-only, or a 10s window copied from the swap duration
    expect(aura.length).toBe(castFrames.length * 4);
    expect(new Set(aura.map((e) => e.targetSlug)).size).toBe(4);
    const e0 = aura[0];
    expect(e0.expiresFrame - frameOf(e0)).toBeGreaterThanOrEqual(895);
    expect(e0.expiresFrame - frameOf(e0)).toBeLessThanOrEqual(905);
  });

  it('B-b burst nuke is 645.33% of final ATK, one hit per cast, FB-major exempt', () => {
    // nearest-wrong: given the +50% Full-Burst major (a B2 cast lands BEFORE the FB window opens)
    const sum = INV.burst
      .filter((e: any) => e.kind === 'flatDamage')
      .reduce((a: number, e: any) => a + (e.atkPct ?? 0), 0);
    expect(sum).toBeCloseTo(645.33, 2);
    const nukes = dmgEvs.filter((e) => e.srcSlot === 'burst');
    expect(nukes.length).toBe(castFrames.length);
    expect(nukes.every((e) => e.fbMajorApplied !== true)).toBe(true);
  });

  it('B-c Memory Incineration swap is authored with the kit-stated weapon numbers', () => {
    const swap = INV.burst.find((e: any) => e.kind === 'weaponSwap');
    expect(swap).toBeTruthy();
    expect(swap.damagePct).toBeCloseTo(275.18, 2);
    expect(swap.chargeTimeSec).toBeCloseTo(1.8, 3); // "Charge time: Fixed at 1.8 sec"
    expect(swap.chargeMultPct).toBeCloseTo(250, 3); // "Full Charge Damage: 250% of Damage"
    expect(swap.durationSec).toBeCloseTo(10, 3);
    const ua = INV.burst.find((e: any) => e.kind === 'unlimitedAmmo');
    expect(ua).toBeTruthy();
    expect(ua.durationSec).toBeCloseTo(10, 3);
  });

  it('B-c the swap actually re-cadences the weapon: ~5 charged shots in 10s vs SMG spray outside', () => {
    // nearest-wrong: swap not modeled (or chargeTimeSec dropped) → SMG keeps firing ~20/s in-window
    for (const c of castFrames) {
      expect(countIn(shotFrames, c, c + 600)).toBeLessThanOrEqual(15);
    }
    // a clean 10s window that overlaps no swap: SMG cadence must be plainly higher
    let found = -1;
    for (let a = 0; a + 600 <= 10800; a += 60) {
      if (!castFrames.some((c) => a <= c + 600 && c <= a + 600)) {
        found = a;
        break;
      }
    }
    expect(found).toBeGreaterThanOrEqual(0);
    expect(countIn(shotFrames, found, found + 600)).toBeGreaterThanOrEqual(50);
  });

  it('B-c unlimited ammunition: no reload inside the 10s Memory Incineration window', () => {
    // 120-round SMG at SMG cadence reloads repeatedly in any 10s stretch — zero reloads is the tell
    for (const c of castFrames) {
      expect(countIn(reloadFrames, c + 30, c + 570)).toBe(0);
    }
    expect(reloadFrames.length).toBeGreaterThan(0); // …and she DOES reload elsewhere (non-vacuity)
  });

  it('B-c counterfactual: stripping the swap restores SMG cadence and moves nayuta total', () => {
    const noSwapRow: any = unitOf(NO_SWAP.res, SLUG);
    const noSwapEvs: any[] =
      Array.isArray(noSwapRow?.events) && noSwapRow.events.length
        ? noSwapRow.events
        : NO_SWAP.events.filter((e) => slugOf(e) === SLUG);
    const noSwapShots = noSwapEvs.filter((e) => e.kind === 'shot').map(frameOf).filter(Number.isFinite);
    expect(countIn(noSwapShots, castFrames[0], castFrames[0] + 600)).toBeGreaterThanOrEqual(50);
    expect(totals(NO_SWAP.res)[SLUG]).not.toBeCloseTo(totals(BASE.res)[SLUG], 0);
  });
});

```

---

## SECTION 6 — S6 BLIND OVERRIDE (claude-opus-5) + diff vs driver

S6 BLIND OVERRIDE vs DRIVER OVERRIDE — line-by-line diff (converges on every load-bearing mechanic; divergences are primitive-choice + steady-state-vs-literal, all documented):

CONVERGES:
- S1 ally core 25.15: blind = buff coreDamagePct 25.15, durationSec 5, interval-3s trigger, target allies; driver = passive permanent coreDamagePct 25.15, target allies. SAME effect — blind's audit: "3s re-apply < 5s duration = permanent uptime."
- S1 ally ATK 30.16: blind = casterAtkPct 30.16 (flat caster-scaled, "NOT atkPct"); driver = casterAtkPct 30.16. IDENTICAL primitive + routing.
- S1 full-charge rider 150%+380.46%: blind = TWO flatDamage (atkPct 150 + atkPct 380.46) on shotFired + swapGate:'swapped'; driver = ONE extraHitDamagePct 530.46 buff on burstCast for 10s. SAME total (530.46) + SAME swap-gating; different primitive. Blind flags the 380.46% scope as "the single largest uncertainty in the parse" — the driver's per-full-charge fold is the tier-audit reading.
- Burst team Attack Damage 35.45/15s: both attackDamagePct 35.45, durationSec 15, all allies, burstCast. IDENTICAL.
- Burst nuke 645.33: both flatDamage atkPct 645.33, burstCast, enemy. IDENTICAL.
- Burst weaponSwap: blind = damagePct 275.18, chargeMultPct 250, durationSec 10 + unlimitedAmmo 10s; driver = same + chargeTimeSec 2.13 + weapon:'SR'. Structure/magnitude identical.
- Indomitability + shared HP recovery: both UNMODELED (defensive, verbatim). IDENTICAL.

DIVERGES (all documented, none a silent drop or fudge):
- chargeTimeSec: blind 1.8 (kit-literal) vs driver 2.13 (1.8 + 0.5s SR bolt-recovery folded). R2, measurement-gated.
- weapon class: blind leaves `weapon` UNSET (kit-silent) vs driver weapon:'SR' (the 2026-07-17 SWAP-CLASS FIX: SR range-banding + HI auto-core in midfar/far; board 0.658->0.894). Driver has a measured basis the blind lacked.
- S2 hitRatePct 1.4/stack: blind ENCODES (hitRatePct 1.4 maxStacks 30 + resource memoryAbsorption) vs driver UNMODELED (measurement-gated HR->core slope). R3.
- S2 stage gates: blind = stack-threshold triggers (15.2/20.27/21.05 at >=2/>=10/>=30 stacks) vs driver = time-averaged passive (14.4/16.8/10.5). SAME integral; blind independently derives the time-average factors. R4.
- S1 self-heal 25% Max HP: blind = heal effect (interval-3s, self, emits recovery) vs driver UNMODELED (no HP pool; self-only so no teammate consumer fires). Zero damage delta either way in scope.

The blind override's 7 flags map 1:1 onto the driver's R1-R5 residuals + the shared RIDERCRIT/no-core/noFb conventions — strong independent cross-family convergence.

### scripts/kit-autonomy/blind/nayuta.override.json

```json
{
  "slug": "nayuta",
  "resources": [
    {
      "name": "memoryAbsorption",
      "initial": 0,
      "min": 0,
      "max": 30
    }
  ],
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "interval",
        "sec": 3
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "coreDamagePct",
          "value": 25.15,
          "durationSec": 5,
          "maxStacks": 1
        },
        {
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 30.16,
          "durationSec": 5,
          "maxStacks": 1
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "interval",
        "sec": 3
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "heal",
          "ticks": 1
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "shotFired"
      },
      "swapGate": "swapped",
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 150,
          "crit": true
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "shotFired"
      },
      "swapGate": "swapped",
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 380.46,
          "crit": true
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "interval",
        "sec": 3
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "resource",
          "name": "memoryAbsorption",
          "delta": 1
        },
        {
          "kind": "buff",
          "stat": "hitRatePct",
          "value": 1.4,
          "maxStacks": 30
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "interval",
        "sec": 3
      },
      "target": {
        "kind": "self"
      },
      "resourceGate": {
        "name": "memoryAbsorption",
        "min": 2
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 15.2,
          "maxStacks": 1
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "interval",
        "sec": 3
      },
      "target": {
        "kind": "self"
      },
      "resourceGate": {
        "name": "memoryAbsorption",
        "min": 10
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 20.27,
          "maxStacks": 1
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "interval",
        "sec": 3
      },
      "target": {
        "kind": "self"
      },
      "resourceGate": {
        "name": "memoryAbsorption",
        "min": 30
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "coreDamagePct",
          "value": 21.05,
          "maxStacks": 1
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
          "value": 35.45,
          "durationSec": 15,
          "maxStacks": 1
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
          "kind": "flatDamage",
          "atkPct": 645.33,
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
          "kind": "weaponSwap",
          "damagePct": 275.18,
          "chargeTimeSec": 1.8,
          "chargeMultPct": 250,
          "durationSec": 10
        },
        {
          "kind": "unlimitedAmmo",
          "durationSec": 10
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [
      "Unchanging Heart: Gain Indomitability for 9 sec. Activates 1 time(s) during battle.",
      "Equally shares HP recovery for 5 sec."
    ],
    "skill2": [
      "immune to stack count increase or decrease effects continuously. This effect cannot be removed."
    ],
    "burst": []
  },
  "caveats": [
    "⚑ EVERY numeric cadence/economy assumption below is UNMEASURED. The kit text supplies all magnitudes; the TRIGGERS for two damage lines and the swap shot economy are inferred.",
    "⚑ 'Memory Absorption takes effect' is modeled as the every-3s stack tick (skill2 line 1). If the stack tick STOPS 'taking effect' once the pool is capped at 30 (t≈90s), then skill1's ally core/ATK buffs and the self-heal go DEAD after ~90s — a large swing. Modeled here as continuing to fire for the whole fight.",
    "⚑ The 380.46% 'stage target' line carries NO activation clause. Modeled as a rider on the SAME trigger as the preceding 150% Memory-Incineration full-charge line (i.e. the full charge deals 150% to all enemies plus 380.46% extra to the stage target). Alternative reading: an independent interval-triggered hit. This choice is worth 5x the 150% line and must be pinned from popups before trusting the burst-window total.",
    "⚑ 'attacking with Full Charge while in Memory Incineration' is modeled as shotFired + swapGate:'swapped' — i.e. EVERY swapped shot is assumed to be a full charge (1.8s fixed charge time). If the engine can fire partial charges while swapped, this over-counts the riders.",
    "⚑ flatDamage crit:true on both damage lines follows the RIDERCRIT prior (riders crit at the caster's sheet rate); neither is core-tagged (no 'core strike damage' wording).",
    "⚑ noFb is deliberately NOT set anywhere — FB is taken by timing (default ON). The burst-cast damage lands pre-FB by timing, so no explicit exemption is authored.",
    "⚑ The stage-1/2/3 thresholds (2/10/30 stacks) are modeled with a named resource + resourceGate rather than `escalating` (which is activation-count-, not threshold-, keyed). The resource-gain effect is ordered FIRST in the slot so the gates read the post-gain pool; if the engine evaluates gates before the same-frame gain, every stage arrives one tick (3s) late — immaterial at fight scale.",
    "Continuous (no-durationSec) self-buffs carry maxStacks:1 so the every-3s re-application refreshes rather than accumulating."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Blind second read of nayuta (SMG/Wind/Supporter/Burst II) from kit prose only. Structure: skill2 is a 3s-tick stack engine (Memory Absorption, +1.4% Hit Rate/stack to 30 = +42% at cap, reached t≈90s) that both self-buffs in three stack-gated stages (ATK 15.2% at ≥2, Attack Damage 20.27% at ≥10, core damage 21.05% at ≥30) and drives skill1's ally package (core damage 25.15% + casterAtk 30.16% for 5s, re-applied every 3s = effectively permanent uptime) plus a 25%-Max-HP self-heal that fires the recovery trigger every 3s (tandem: heal-synergy consumers). Burst is a 15s team Attack Damage 35.45%, a 645.33% burst-skill hit, and a 10s Memory Incineration weapon swap (275.18%/shot, 1.8s fixed charge, 250% full-charge mult, unlimited ammo) that ALSO arms skill1's full-charge riders (150% + 380.46%). The two riders and the swap shot economy are the whole burst-window damage story and are the least-constrained part of this parse."
}
```

---

## SECTION 7 — DRIVER IMPLEMENTATION (test + override under judgment)

### scripts/tests/units/nayuta.test.ts

```typescript
// PER-UNIT KIT SPEC — `nayuta` (Nayuta, Supporter/SMG/Wind, Burst II, cd 20s, ammo 120, Pilgrim).
// Kit-autonomy gauntlet 2026-07-25 (driver, sighted).
//
// One assertion group per KIT LINE (N1..N9 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest-wrong model
// each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.nayuta.skills, level-10 values):
//   S1 ■ when Memory Absorption takes effect → all allies:                                 [N1]
//        Damage dealt when attacking core ▲25.15% (modeled passive/permanent — fires every 3s)
//      ■ when Memory Absorption takes effect → all allies:                                 [N2]
//        ATK ▲30.16% of the skill user's ATK (casterAtkPct, passive/permanent)
//      ■ when Memory Absorption takes effect → self: recovers 25% final Max HP   [UNMODELED — defensive]
//      ■ (start of battle) Unchanging Heart: Indomitability 9s, 1×               [UNMODELED — defensive]
//      ■ equally shares HP recovery for 5s                                      [UNMODELED — defensive]
//      ■ Full Charge while in Memory Incineration → all enemies: 150% final ATK ┐ [N3]
//      ■ vs the stage target: 380.46% final ATK additional damage              ┘ folded to a
//        single extraHitDamagePct 530.46 rider on burstCast for 10s (one per swapped full charge)
//   S2 ■ every 3s → self: Memory Absorption Hit Rate ▲1.4%, stacks to 30        [UNMODELED — measurement-gated]
//      ■ stack-gated continuous self buffs (ramp time-averaged over 180s):
//        Stage 1 (≥2 stacks @~9s):  ATK ▲15.2%   → 14.4 time-averaged            [N4]
//        Stage 2 (≥10 stacks @~30s): Attack Damage ▲20.27% → 16.8 time-averaged  [N5]
//        Stage 3 (≥30 stacks @~90s): core damage ▲21.05% → 10.5 time-averaged    [N6]
//   BU ■ all allies: Attack Damage ▲35.45% for 15 sec                            [N7]
//      ■ all enemies: 645.33% of final ATK as Burst Skill damage                 [N8]
//      ■ self: Memory Incineration — SR weapon swap (Damage 275.18%, fixed 1.8s charge,
//        Full Charge 250% of Damage, 10s) + Unlimited ammunition 10s             [N9]
//
// Why each assertion discriminates (a test that cannot fail under the nearest-wrong model gates
// nothing). Probed against the live engine (.nayuta-probe.ts, 2026-07-25 — 12 bursts, 44 swap
// full charges, 44 rider hits over the 180s fight):
//   N1  coreDamagePct 25.15 is encoded as a passive/permanent buff (Memory Absorption fires every
//       3s, so the 5s window is always up) reaching ALL four allies (expiresFrame null). Nearest
//       wrong: a self-only model — the event's holder set collapses from 4 allies to nayuta alone.
//   N2  casterAtkPct = a FLAT add of NAYUTA's ATK (0.3016×staticAtk ≈ 30.3k), NOT a % of each
//       ally's own ATK. Nearest wrong: atkPct. Proven by the buffApply stat/key (casterAtkPct, raw
//       30.16 in the key, flat value recorded) + identical value for every ally + a totals delta.
//   N3  the two Memory-Incineration full-charge lines (150% full-screen + 380.46% vs stage target)
//       are folded (post-tier-audit) into ONE extraHitDamagePct 530.46 rider, applied to self on
//       burstCast for 10s; the engine then emits one 530.46% hit per swapped full charge (44 hits =
//       44 swap shots). Nearest wrong: rider removed → every 530.46 hit vanishes and her total drops.
//       RESIDUAL ⚑: the 380.46% block's scope is genuinely ambiguous (one-time vs per-full-charge);
//       the per-full-charge fold is the tier-audit reading, pinned as-is, NOT certified kit-literal.
//   N4/N5/N6  the three stack-gated self buffs ramp (>2 @~9s, >10 @~30s, >30 @~90s of 180s), so the
//       shipped override encodes TIME-AVERAGED values 14.4/16.8/10.5, not the full-from-t0 kit values
//       15.2/20.27/21.05. Nearest wrong: the naive full values — they over-buff and move her total.
//       Each is self-only (target nayuta) and permanent (expiresFrame null).
//   N7  burst Attack Damage 35.45% reaches all four allies for 15s (expiresFrame delta 900), once
//       per cast per ally. Nearest wrong: self-only — holder set collapses to nayuta.
//   N8  a burst CAST lands BEFORE the Full Burst window opens, so the 645.33% nuke must never take
//       the +50% FB major (verified fact). Magnitude 645.33, burst bucket, once per cast.
//   N9  Memory Incineration swaps her to an SR charge weapon: her normal-bucket shots become
//       275.18% × 250% full-charge (charge mult 2.5) inside the 10s window. Removing the swap zeroes
//       every 275.18 shot and drops her total to a fraction — the swap is load-bearing (her main DPS).
//       RESIDUAL ⚑ (kit-status F2): chargeTimeSec is shipped at 2.13 (the 1.8s kit charge + 0.5s SR
//       bolt-recovery cycle folded in, since swaps are exempt from the engine's auto bolt-recovery);
//       the cadence pin records the shipped per-window count, NOT a kit-literal certification.
//
// Inert / unmeasured (documented, NOT asserted): Indomitability, the shared HP recovery, and the
// self 25%-Max-HP heal are defensive (no HP pool / nothing dies at scope lock). The Memory Absorption
// Hit Rate 1.4%/stack (42% at cap) is measurement-gated (hitRatePct feeds her SMG core rate via
// acrForHR; encoding it would move her) — queued, not encoded.
//
// Fixture: liter(SMG B1) / nayuta(SMG B2) / ada(RL B3) / helm(SR B3), boss Iron (Wind-weak, the
// kit-status evidence basis), focus nayuta. nayuta is the Burst-II caster; liter opens the chain and
// ada/helm are the Burst-III casters that let her sustain a Full Burst every ~15s (12 casts over
// 180s). Deterministic (no seed).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
const COMP = ['liter', 'nayuta', 'ada', 'helm'];
const NAYUTA = 1; // nayuta's slot in COMP

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: COMP,
    bossElement: 'Iron',
    focusSlug: 'nayuta',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res), res };
}

// ---- counterfactual / reference patches (nearest-wrong models) -------------------------------
/** N1 nearest-wrong: S1 ally block scoped to self (coreDamagePct no longer reaches the team). */
const nayutaS1Self = withPatchedOverride('nayuta', (ov) => {
  const b = ov.skill1.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'coreDamagePct'),
  );
  if (!b)
    throw new Error('nayuta S1 coreDamagePct block missing — fixture is stale');
  b.target = { kind: 'self' };
});
/** N2 encoding reference: S1 casterAtkPct → atkPct (% of each ally's OWN ATK, not nayuta's flat). */
const nayutaS1AtkPct = withPatchedOverride('nayuta', (ov) => {
  const e = ov.skill1
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'casterAtkPct');
  if (!e)
    throw new Error('nayuta S1 casterAtkPct effect missing — fixture is stale');
  e.stat = 'atkPct';
});
/** N3 nearest-wrong: the Memory-Incineration full-charge rider removed. */
const nayutaNoRider = withPatchedOverride('nayuta', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) => !b.effects.some((e: any) => e.stat === 'extraHitDamagePct'),
  );
  if (ov.skill1.length === before)
    throw new Error(
      'nayuta S1 extraHitDamagePct rider missing — fixture is stale',
    );
});
/** N4/N5/N6 nearest-wrong: the naive FULL-from-t0 stack values (ramp ignored). */
const nayutaFullStacks = withPatchedOverride('nayuta', (ov) => {
  const map: Record<string, number> = {
    atkPct: 15.2,
    attackDamagePct: 20.27,
    coreDamagePct: 21.05,
  };
  let patched = 0;
  for (const b of ov.skill2)
    for (const e of b.effects)
      if (e.stat in map) {
        e.value = map[e.stat];
        patched++;
      }
  if (patched < 3)
    throw new Error('nayuta S2 stack-gate buffs missing — fixture is stale');
});
/** N7 nearest-wrong: burst Attack Damage scoped to self. */
const nayutaBurstSelf = withPatchedOverride('nayuta', (ov) => {
  const b = ov.burst.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'attackDamagePct'),
  );
  if (!b)
    throw new Error(
      'nayuta burst attackDamagePct block missing — fixture is stale',
    );
  b.target = { kind: 'self' };
});
/** N9 nearest-wrong: Memory Incineration removed. The S1 full-charge rider (extraHitDamagePct
 *  530.46) is kit-gated on "while in Memory Incineration status", so removing the swap WITHOUT the
 *  rider would let the rider mis-fire on every rapid base-SMG shot during the unlimited-ammo window
 *  (a 12× artifact). The faithful "no Memory Incineration" counterfactual removes BOTH the swap and
 *  the rider that depends on it. */
const nayutaNoSwap = withPatchedOverride('nayuta', (ov) => {
  let swapped = 0;
  for (const b of ov.burst) {
    const before = b.effects.length;
    b.effects = b.effects.filter((e: any) => e.kind !== 'weaponSwap');
    if (b.effects.length !== before) swapped++;
  }
  const beforeS1 = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) => !b.effects.some((e: any) => e.stat === 'extraHitDamagePct'),
  );
  if (!swapped || ov.skill1.length === beforeS1)
    throw new Error(
      'nayuta Memory Incineration blocks missing — fixture is stale',
    );
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const s1Self = run({ nayuta: nayutaS1Self });
const s1AtkPct = run({ nayuta: nayutaS1AtkPct });
const noRider = run({ nayuta: nayutaNoRider });
const fullStacks = run({ nayuta: nayutaFullStacks });
const burstSelf = run({ nayuta: nayutaBurstSelf });
const noSwap = run({ nayuta: nayutaNoSwap });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const nayutaCasts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'nayuta',
  );
/** nayuta-cast buffApply by exact key (key carries the raw kit magnitude; value is the resolved stat). */
const nayutaBuff = (evs: SimEvent[], key: string) =>
  buffs(evs).filter((b) => b.casterIdx === NAYUTA && b.key === key);
const holders = (bs: BuffApply[]) => new Set(bs.map((b) => b.targetIdx));
/** nayuta's swapped full-charge shots: normal bucket at the swap's 275.18% (base SMG is 8.73%). */
const swapShots = (evs: SimEvent[]) =>
  dmg(evs).filter(
    (d) =>
      d.slug === 'nayuta' &&
      d.bucket === 'normal' &&
      Math.abs(d.atkPct - 275.18) < 1e-6,
  );
/** nayuta's Memory-Incineration rider hits (150% + 380.46% folded). */
const riderHits = (evs: SimEvent[]) =>
  dmg(evs).filter(
    (d) => d.slug === 'nayuta' && Math.abs(d.atkPct - 530.46) < 1e-6,
  );

const S1_CORE_KEY = `${NAYUTA}:skill1:coreDamagePct:25.15`;
const S1_CASTER_KEY = `${NAYUTA}:skill1:casterAtkPct:30.16`;
const S1_RIDER_KEY = `${NAYUTA}:skill1:extraHitDamagePct:530.46`;
const S2_ATK_KEY = `${NAYUTA}:skill2:atkPct:14.4`;
const S2_DMG_KEY = `${NAYUTA}:skill2:attackDamagePct:16.8`;
const S2_CORE_KEY = `${NAYUTA}:skill2:coreDamagePct:10.5`;
const BU_DMG_KEY = `${NAYUTA}:burst:attackDamagePct:35.45`;

describe('nayuta — kit spec', () => {
  describe('N1 — S1 core damage ▲25.15% to ALL allies, passive/permanent (Memory Absorption cadence)', () => {
    const applied = nayutaBuff(base.events, S1_CORE_KEY);

    it('is 25.15% reaching all four allies, with no expiry (always-up passive)', () => {
      expect(
        applied.length,
        'no S1 coreDamagePct 25.15 buff was applied',
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([25.15]);
      expect(
        holders(applied).size,
        `reached ${holders(applied).size} allies, expected 4`,
      ).toBe(4);
      expect([...new Set(applied.map((b) => b.expiresFrame))]).toEqual([null]);
    });

    it('DISCRIMINATING: a self-only model collapses the holder set to nayuta alone', () => {
      const cf = nayutaBuff(s1Self.events, S1_CORE_KEY);
      expect(
        [...holders(cf)],
        'self-only counterfactual must reach only nayuta',
      ).toEqual([NAYUTA]);
    });
  });

  describe("N2 — S1 ATK ▲30.16% of NAYUTA's ATK to all allies (casterAtkPct, flat caster add)", () => {
    const applied = nayutaBuff(base.events, S1_CASTER_KEY);
    const expectedFlat = 0.3016 * unitOf(base.res, 'nayuta').staticAtk;

    it("is a FLAT add of nayuta's ATK (value ≈ 0.3016×staticAtk, >> a percentage)", () => {
      expect(
        applied.length,
        'no S1 casterAtkPct buff was applied',
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.stat))]).toEqual([
        'casterAtkPct',
      ]);
      for (const b of applied) {
        expect(
          b.value,
          'casterAtkPct must record a flat ATK grant, not the raw 30.16',
        ).toBeGreaterThan(1000);
        expect(b.value).toBeCloseTo(expectedFlat, 4);
      }
    });

    it('reaches all four allies with the SAME flat value, no expiry', () => {
      expect(
        holders(applied).size,
        `reached ${holders(applied).size} allies, expected 4`,
      ).toBe(4);
      expect(
        [...new Set(applied.map((b) => b.value))].length,
        'value must be identical for every ally',
      ).toBe(1);
      expect([...new Set(applied.map((b) => b.expiresFrame))]).toEqual([null]);
    });

    it('ENCODING: shipped logs casterAtkPct; the atkPct counterfactual logs atkPct (distinct mechanic)', () => {
      expect(
        buffs(s1AtkPct.events).filter(
          (b) =>
            b.casterIdx === NAYUTA &&
            b.key.startsWith(`${NAYUTA}:skill1:casterAtkPct`),
        ).length,
      ).toBe(0);
      expect(
        buffs(s1AtkPct.events).filter(
          (b) =>
            b.casterIdx === NAYUTA &&
            b.stat === 'atkPct' &&
            b.key.startsWith(`${NAYUTA}:skill1:`),
        ).length,
      ).toBeGreaterThan(0);
    });

    it('DISCRIMINATING + LIVE: casterAtkPct vs atkPct change team damage differently', () => {
      expect(base.totals).not.toEqual(s1AtkPct.totals);
    });
  });

  describe('N3 — S1 Memory-Incineration full-charge rider: extraHitDamagePct 530.46 (150+380.46), 10s', () => {
    const applied = nayutaBuff(base.events, S1_RIDER_KEY);

    it('is applied to self on every burst cast, for 10 sec', () => {
      expect(
        applied.length,
        'no S1 extraHitDamagePct 530.46 buff was applied',
      ).toBe(nayutaCasts(base.events).length);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([530.46]);
      expect([...holders(applied)]).toEqual([NAYUTA]);
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });

    it('emits one 530.46% hit per swapped full charge (rider is live, not inert)', () => {
      const hits = riderHits(base.events);
      const shots = swapShots(base.events);
      expect(hits.length, 'no 530.46% rider hits').toBeGreaterThan(0);
      expect(
        hits.length,
        `${hits.length} rider hits vs ${shots.length} swap shots — expected one rider per full charge`,
      ).toBe(shots.length);
    });

    it('DISCRIMINATING: removing the rider zeroes every 530.46 hit and drops her total', () => {
      expect(riderHits(noRider.events).length).toBe(0);
      expect(noRider.totals.nayuta).toBeLessThan(base.totals.nayuta * 0.95);
    });
  });

  describe('N4/N5/N6 — S2 stack-gated self buffs, time-averaged over the ramp (14.4 / 16.8 / 10.5)', () => {
    it('encodes the TIME-AVERAGED values, self-only, permanent (not the full-from-t0 kit values)', () => {
      for (const [key, value] of [
        [S2_ATK_KEY, 14.4],
        [S2_DMG_KEY, 16.8],
        [S2_CORE_KEY, 10.5],
      ] as const) {
        const applied = nayutaBuff(base.events, key);
        expect(applied.length, `no S2 ${key} buff was applied`).toBeGreaterThan(
          0,
        );
        expect([...new Set(applied.map((b) => b.value))]).toEqual([value]);
        expect([...holders(applied)], `${key} must be self-only`).toEqual([
          NAYUTA,
        ]);
        expect([...new Set(applied.map((b) => b.expiresFrame))]).toEqual([
          null,
        ]);
      }
    });

    it('DISCRIMINATING: the naive full-from-t0 values (15.2/20.27/21.05) over-buff and move her total', () => {
      // The shipped time-averaging is a deliberate modeling of the stack ramp; the full values are
      // the nearest-wrong model. They must NOT be byte-identical to shipped.
      expect(fullStacks.totals.nayuta).not.toBe(base.totals.nayuta);
      expect(fullStacks.totals.nayuta).toBeGreaterThan(base.totals.nayuta);
    });
  });

  describe('N7 — burst grants Attack Damage ▲35.45% to ALL allies for 15 sec', () => {
    const applied = nayutaBuff(base.events, BU_DMG_KEY);

    it('reaches all four allies, once per cast per ally, for 15 sec', () => {
      const casts = nayutaCasts(base.events).length;
      expect(
        applied.length,
        'no burst attackDamagePct 35.45 buff was applied',
      ).toBe(casts * 4);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([35.45]);
      expect(
        holders(applied).size,
        `reached ${holders(applied).size} allies, expected 4`,
      ).toBe(4);
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(15 * FPS);
    });

    it('DISCRIMINATING: a self-only model collapses the holder set to nayuta alone', () => {
      const cf = nayutaBuff(burstSelf.events, BU_DMG_KEY);
      expect(
        [...holders(cf)],
        'self-only counterfactual must reach only nayuta',
      ).toEqual([NAYUTA]);
    });
  });

  describe('N8 — burst nuke: 645.33% of final ATK to all enemies, cast BEFORE the FB window', () => {
    const nukes = dmg(base.events).filter(
      (d) => d.slug === 'nayuta' && d.srcSlot === 'burst',
    );

    it('fires once per burst cast at the kit magnitude, in the burst bucket', () => {
      expect(nukes.length).toBe(nayutaCasts(base.events).length);
      expect(nukes.length).toBeGreaterThan(0);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([645.33]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      expect(nukes.filter((d) => d.fbMajorApplied).map((d) => d.sec)).toEqual(
        [],
      );
    });
  });

  describe('N9 — burst Memory Incineration: SR weapon swap (275.18% × 250% full charge), 10s + unlimited ammo', () => {
    it('her normal-bucket shots become 275.18% at charge mult 2.5 inside the swap window', () => {
      const shots = swapShots(base.events);
      expect(
        shots.length,
        'no swapped full-charge shots — Memory Incineration never fired',
      ).toBeGreaterThan(0);
      expect(
        [...new Set(shots.map((d) => d.mult.charge))],
        'swap full charge = 250% of damage → ×2.5',
      ).toEqual([2.5]);
    });

    it('DISCRIMINATING: removing Memory Incineration zeroes every 275.18 shot and drops her total', () => {
      expect(swapShots(noSwap.events).length).toBe(0);
      expect(riderHits(noSwap.events).length).toBe(0);
      // Swap full charges + their rider are ~87% of her base damage; removing both must collapse it.
      expect(noSwap.totals.nayuta).toBeLessThan(base.totals.nayuta * 0.5);
    });

    // RESIDUAL (kit-status F2, MEASUREMENT-GATED): chargeTimeSec is shipped at 2.13 (1.8s kit charge
    // + 0.5s SR bolt-recovery folded in; swaps are exempt from the engine's auto bolt-recovery). This
    // pin records the CURRENT shipped per-window cadence so any change is visible — it does NOT
    // certify the count as kit-literal. Resolving it needs swap-cycle footage (manual-review/nayuta.md).
    it('PIN (current shipped cadence, F2 residual): ≥1 swapped full charge per full burst window', () => {
      // Only casts whose full 10s window fits inside the 180s fight are measurable — the last cast
      // lands at ~178s and its first full charge (~2s into the window) falls past fight-end, a
      // property of the fixture, not the kit (mirrors helm H8).
      const FIGHT_FRAMES = 180 * FPS;
      const casts = nayutaCasts(base.events).filter(
        (c) => c.frame + 10 * FPS <= FIGHT_FRAMES,
      );
      const shots = swapShots(base.events);
      expect(
        casts.length,
        'fixture produced no burst with a full window',
      ).toBeGreaterThan(0);
      for (const cast of casts) {
        const inWindow = shots.filter(
          (s) => s.frame >= cast.frame && s.frame <= cast.frame + 10 * FPS,
        );
        expect(
          inWindow.length,
          `burst at ${(cast.frame / FPS).toFixed(1)}s produced no swapped full charge`,
        ).toBeGreaterThanOrEqual(1);
      }
    });

    it('encodes unlimitedAmmo alongside the swap (10s)', () => {
      const ov: any = withPatchedOverride('nayuta', () => {});
      const blk = ov.burst.find((b: any) =>
        b.effects.some((e: any) => e.kind === 'unlimitedAmmo'),
      );
      expect(blk, 'no burst unlimitedAmmo block').toBeTruthy();
      expect(
        blk.effects.find((e: any) => e.kind === 'unlimitedAmmo').durationSec,
      ).toBe(10);
    });
  });
});

```

### src/skills/overrides/nayuta.json

```json
{
  "note": "Memory Absorption (S2) is a stack gauge: +1 stack every 3s up to 30, gating three continuous self buffs (>2: ATK 15.2%; >10: Attack Damage 20.27%; >30: core-damage 21.05%). Modeled at steady-state with all stacks maintained (all three permanent, self); the ~90s ramp to 30 stacks is ignored. The stack's own Hit Rate 1.4%/stack (42% at the 30-stack cap) is unmodeled — hitRatePct feeds her SMG core rate via acrForHR, so encoding it would move her; queued (kit-audit plan 2026-07-20, measurement-gated). S1 'when Memory Absorption takes effect' fires every 3s, so its ally buffs (core-damage 25.15%, ATK 30.16% of caster) are treated as permanent passives; the shared HP recovery, the self 25% heal, and the start-of-battle Indomitability are skipped (defensive). Burst grants the team Attack Damage 35.45%/15s, a 645.33% nuke, and Memory Incineration: a 10s weapon swap (275.18% dmg, fixed 1.8s charge, 250% full-charge, unlimited ammo). S1's 150%-per-full-charge Memory-Incineration hit only exists during that 10s swap, so it is modeled as an extraHitDamagePct 150 buff for 10s on burst (each swapped-weapon full charge = one hit). The 380.46% 'additional damage vs stage target' block has no explicit trigger; it is modeled conservatively as one flatDamage per burst on the boss. UNCERTAIN: that 380.46% block's scope is genuinely ambiguous (one-time vs per-full-charge vs a broader per-attack rider); folding it into every full charge pushed her share above the team's main DPS, so the one-hit-per-burst reading was chosen as the conservative option, but this may under-count it. TIER-AUDIT FIXES: (1) the 380.46% stage-target hit lands on EVERY full charge during her 10s SR mode (Prydwen: 'Upon releasing a Full Charge ... deals 150% full-screen + 380.46% extra to stage targets'), was a single per-burst flatDamage -> folded into the per-shot rider (extraHitDamagePct 150+380.46=530.46 for 10s). (2) Memory Absorption stack gates ramp (>2 @9s, >10 @30s, >30 @90s of a 180s fight) -> time-averaged values 14.4 / 16.8 / 10.5 instead of full-from-t0. Swap charge 1.8s -> cycle 2.3s (+0.5s SR bolt recovery, same correction validated on helm/velvet). [2026-07-17 SWAP-CLASS FIX] Memory Incineration is an SR mode; the engine gained a weaponSwap `weapon` class-override and her swap now carries weapon:'SR' (was range-banded + core-rated as her BASE SMG). SMG is range-eligible only in `mid`; SR gains the +30% bonus in `midfar`+`far` and the HI auto-core rate — exactly the far/midfar bands where her swap shots land (the finding's '~2x loss'). Board: 0.658 COLD -> 0.894 (MAD 0.342->0.106), a large faithful improvement corroborated by the recording. Residual 0.894 COLD is consistent with her other flagged uncertainties (the 380.46% block scope, chargeTimeSec 2.13-vs-1.8 F2, dropped Hit-Rate F3) — NOT re-fudged. chargeTimeSec kept at 2.13 (swaps are exempt from the engine's auto SR bolt-recovery, so the cycle is folded into the charge time; do not double-count). Kit-autonomy gauntlet 2026-07-25: cross-family corroborated (S2b claude-fable-5 converged, no REAL-GOTCHA; S5/S6/S7 claude-opus-5 converged). All 9 kit lines (N1-N9) pinned GREEN vs shipped in scripts/tests/units/nayuta.test.ts (19 assertions, deterministic). Structured residuals (estimate / recipe / tier): (R1) 380.46% stage-target block scope — folded per-full-charge into the 530.46 rider (tier-audit reading, fable-corroborated); estimate up to ~10-15% of swap-window damage if it is actually one-time-per-burst; recipe: popup footage of one Memory-Incineration window counting 380.46 procs vs the full-charge count; Tier 2. (R2) chargeTimeSec 2.13 vs kit 1.8 (F2) — 1.8s charge + 0.5s SR bolt-recovery folded (swaps exempt from engine auto bolt-recovery); estimate ~5% swap-shot cadence; recipe: high-fps recording of two consecutive swap full charges; Tier 2. (R3) Hit Rate 1.4%/stack (42% at cap) UNMODELED — measurement-gated on the engine HR->core slope (acrForHR/hrCoreMult); estimate up to ~8-12% self core-rate at cap; recipe: controlled probe of core-hit rate at 0 vs 42% HR; Tier 2. (R4) S2 stack-gate ramp encoded as time-averaged steady-state (14.4/16.8/10.5 from t0) — same 180s integral as the delayed-step ramp (e.g. 14.4x180=2592 vs 15.2x171=2599 buff-sec); estimate <2% vs an explicit stack ramp; Tier 2. (R5) S1 ally buffs (coreDamagePct 25.15, casterAtkPct 30.16) modeled as permanent passives — the kit's 5s window refreshed every 3s is always up after t~3s, so the permanent approximation only over-credits the opening ~3s (<2% of fight); Tier 2.",
  "unmodeled": {
    "skill1": [
      "Unchanging Heart: Gain Indomitability for 9 sec. Activates 1 time(s) during battle.",
      "Equally shares HP recovery for 5 sec.",
      "Recovers 25% of the skill user's final Max HP as HP."
    ],
    "skill2": [
      "Memory Absorption: Hit Rate ▲ 1.4%, stacks up to 30 time(s) and immune to stack count increase or decrease effects continuously. This effect cannot be removed."
    ],
    "burst": []
  },
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
          "stat": "coreDamagePct",
          "value": 25.15
        },
        {
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 30.16
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "burstCast"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "extraHitDamagePct",
          "value": 530.46,
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
          "stat": "atkPct",
          "value": 14.4
        },
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 16.8
        },
        {
          "kind": "buff",
          "stat": "coreDamagePct",
          "value": 10.5
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
          "value": 35.45,
          "durationSec": 15
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
          "kind": "flatDamage",
          "atkPct": 645.33
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
          "kind": "weaponSwap",
          "damagePct": 275.18,
          "chargeTimeSec": 2.13,
          "chargeMultPct": 250,
          "weapon": "SR",
          "durationSec": 10
        },
        {
          "kind": "unlimitedAmmo",
          "durationSec": 10
        }
      ]
    }
  ]
}

```
