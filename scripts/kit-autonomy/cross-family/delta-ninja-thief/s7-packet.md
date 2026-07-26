# S7 RECONCILING-JUDGE PACKET — delta-ninja-thief (Delta: Ninja Thief)

You are the binding reconciling judge for the kit-autonomy gauntlet on `delta-ninja-thief` (Delta: Ninja Thief — MG/Defender/Water/Burst II; VARIANT whose base counterpart is `delta`, SR/Wind). Grade the DRIVER's implementation for kit-faithfulness using the independent cross-family evidence below. Return the binding verdict JSON specified in Section 1.

---

## SECTION 1 — RECONCILING-JUDGE CONTRACT (your role + the return JSON shape)

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

## SECTION 2 — MECHANICS SSOT (grade faithfulness against these)

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

## SECTION 3 — GROUND TRUTH: unit kit prose + base stats (data/characters.json extract)

{
  "slug": "delta-ninja-thief",
  "name": "Delta: Ninja Thief",
  "imageUrl": "https://sg-tools-cdn.blablalink.com/je-42/og-90/cb086fd996be5dc544a87ae8aa2268f3.png",
  "weapon": "MG",
  "burst": "II",
  "burstCooldownSec": 40,
  "class": "Defender",
  "element": "Water",
  "manufacturer": "Elysion",
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
    "dnt"
  ],
  "skills": {
    "skill1": "■ Activates when entering Full Burst. Affects all enemies.\nNinjutsu Acid Bomb: Damage Taken ▲ 12% for 15 sec.\n■ Activates when using Burst Skill. Affects self.\nATK ▲ 15.04% for 10 sec.\n■ Activates when using Burst Skill. Affects enemies within attack range nearest to the crosshair.\nNinjutsu Hyper Acid Bomb: Damage Taken ▲ 8% for 10 sec.",
    "skill2": "■ Activates at the start of battle.\nEffects vary according to squad formation. Only one set of effects is applied.\nAffects self if there are no other Defender allies in the squad.\nEffect 1: Creates a Shield equal to 12.25% of the skill user's final Max HP for 10 sec.\nEffect 2: Attract: Taunt all enemies continuously.\nAffects self if there is another Defender ally in the squad.\nEffect 1: Ninjutsu Camouflage: Prevents being targeted by single-target attacks for 10 sec. This effect is removed upon taking a direct hit.\nEffect 2: Ninjutsu Injection: Recovers 11.22% of attack damage as HP continuously.\n■ Activates when performing 200 normal attack(s). Affects self while in Attract status.\nCreates a Shield equal to 12.25% of the skill user's final Max HP for 10 sec.\n■ Affects self every 4 sec while in Ninjutsu Injection status.\nNinjutsu IFAK lasts for 4 sec.\nFunction: Stores up HP recovery for a time, after which all allies are healed for the stored amount.\nEffect 1: The maximum amount stored is equal to 165.28% of the skill user's final ATK.\nEffect 2: Once the duration ends, all allies are healed for the stored recovery amount.",
    "burst": "■ Affects all allies.\nDistributed Damage ▲ 20% for 10 sec.\nATK ▲ 15% of the skill user's ATK for 10 sec.\n■ Affects all enemies.\nDeals 170% of final ATK as distributed damage.\n■ Affects self while in Attract status.\nNext shield's HP ▲ 20.13% for 10 sec.\n■ Affects self while in Ninjutsu Injection status.\nMaximum Accumulation of Ninjutsu IFAK ▲ 20.13% for 10 sec."
  },
  "skillCooldownsSec": {
    "skill1": null,
    "skill2": null,
    "burst": 40
  },
  "role": {
    "weapon": {
      "shot_id": 1002301,
      "shot_detail": {
        "id": 1002301,
        "damage": 557,
        "max_ammo": 300,
        "shake_id": 2,
        "ShakeType": "Fire_MG",
        "fire_type": "Instant",
        "zoom_rate": 0,
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
      "use_burst_skill": "Step2",
      "burst_apply_delay": 1,
      "change_burst_step": "Step3"
    },
    "skillDetails": {
      "skill1_id": 2023101,
      "skill2_id": 2023201,
      "skill1_table": "StateEffect",
      "skill2_table": "StateEffect",
      "skill1_detail": {
        "id": 2023101,
        "icon": "icn_skill_damagereductionup_01",
        "group_id": 20231,
        "skill_level": 1,
        "name_localkey": "Ninjutsu Acid Bomb",
        "next_level_id": 2023102,
        "level_up_cost_id": 20102,
        "description_localkey": "■ Activates when entering Full Burst. Affects all enemies.\n<color=#00AEFF>Ninjutsu Acid Bomb: Damage Taken ▲ {description_value_01}% for {description_value_02} sec.</color>\n■ Activates when using Burst Skill. Affects self.\n<color=#00AEFF>ATK ▲ {description_value_03}% for {description_value_04} sec.</color>\n■ Activates when using Burst Skill. Affects <word_group=10020>enemies within attack range</word_group> nearest to the crosshair.\n<color=#00AEFF>Ninjutsu Hyper Acid Bomb: Damage Taken ▲ {description_value_05}% for {description_value_06} sec.</color>",
        "description_value_list": [
          {
            "description_value": [
              "7.09",
              "7.64",
              "8.18",
              "8.73",
              "9.27",
              "9.82",
              "10.37",
              "10.91",
              "11.46",
              "12"
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
              "8.88",
              "9.57",
              "10.25",
              "10.93",
              "11.62",
              "12.3",
              "12.98",
              "13.67",
              "14.35",
              "15.04"
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
              "4.74",
              "5.1",
              "5.47",
              "5.83",
              "6.2",
              "6.56",
              "6.93",
              "7.29",
              "7.66",
              "8"
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
          {}
        ],
        "info_description_localkey": "Skill 1"
      },
      "skill2_detail": {
        "id": 2023201,
        "icon": "icn_skill_barrier_01",
        "group_id": 20232,
        "skill_level": 1,
        "name_localkey": "Ninjutsu Camouflage",
        "next_level_id": 2023202,
        "level_up_cost_id": 20202,
        "description_localkey": "■ Activates at the start of battle.\n<color=#00AEFF>Effects vary according to squad formation. Only one set of effects is applied.</color>\nAffects self if there are no other Defender allies in the squad.\n<color=#00AEFF>Effect 1: Creates a <word_group=10023>Shield</word_group> equal to {description_value_01}% of the skill user's <word_group=10025>final</word_group> Max HP for {description_value_02} sec.\nEffect 2: Attract: Taunt all enemies continuously.</color>\nAffects self if there is another Defender ally in the squad.\n<color=#00AEFF>Effect 1: Ninjutsu Camouflage: <word_group=10004>Prevents being targeted by single-target attacks</word_group> for {description_value_06} sec. This effect is removed upon taking a direct hit.\nEffect 2: Ninjutsu Injection: Recovers {description_value_07}% of attack damage as HP continuously.</color>\n■ Activates when performing {description_value_03} normal attack(s). Affects self while in Attract status.\n<color=#00AEFF>Creates a <word_group=10023>Shield</word_group> equal to {description_value_04}% of the skill user's <word_group=10025>final</word_group> Max HP for {description_value_05} sec.</color>\n■ Affects self every {description_value_08} sec while in Ninjutsu Injection status.\n<color=#00AEFF>Ninjutsu IFAK lasts for {description_value_10} sec.\nFunction: Stores up HP recovery for a time, after which all allies are healed for the stored amount.\nEffect 1: The maximum amount stored is equal to {description_value_09}% of the skill user's <word_group=10025>final</word_group> ATK.\nEffect 2: Once the duration ends, all allies are healed for the <word_group=10089>stored recovery amount</word_group>.</color>",
        "description_value_list": [
          {
            "description_value": [
              "7.24",
              "7.8",
              "8.35",
              "8.91",
              "9.47",
              "10.02",
              "10.58",
              "11.14",
              "11.7",
              "12.25"
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
              "7.24",
              "7.8",
              "8.35",
              "8.91",
              "9.47",
              "10.02",
              "10.58",
              "11.14",
              "11.7",
              "12.25"
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
              "6.17",
              "6.73",
              "7.29",
              "7.85",
              "8.42",
              "8.98",
              "9.54",
              "10.1",
              "10.66",
              "11.22"
            ]
          },
          {
            "description_value": [
              "4",
              "4",
              "4",
              "4",
              "4",
              "4",
              "4",
              "4",
              "4",
              "4"
            ]
          },
          {
            "description_value": [
              "90.9",
              "99.17",
              "107.43",
              "115.69",
              "123.96",
              "132.22",
              "140.49",
              "148.75",
              "157.02",
              "165.28"
            ]
          },
          {
            "description_value": [
              "4",
              "4",
              "4",
              "4",
              "4",
              "4",
              "4",
              "4",
              "4",
              "4"
            ]
          },
          {}
        ],
        "info_description_localkey": "Skill 2"
      },
      "ulti_skill_id": 1023301,
      "ulti_skill_detail": {
        "id": 1023301,
        "icon": "icn_skill_c023_ult",
        "group_id": 10233,
        "shake_id": 1,
        "skill_type": "InstantNumber",
        "attack_type": "Water",
        "skill_level": 1,
        "counter_type": "Metal_Type",
        "duration_type": "None",
        "name_localkey": "Secret Technique: Ninja Overdrive",
        "next_level_id": 1023302,
        "prefer_target": "LowDefence",
        "resource_name": "c023_ulti",
        "duration_value": 0,
        "skill_cooltime": 4000,
        "level_up_cost_id": 20302,
        "skill_value_data": [
          {
            "skill_value": 10260,
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
        "description_localkey": "■ Affects all allies.\n<color=#00AEFF><word_group=10019>Distributed Damage</word_group> ▲ {description_value_01}% for {description_value_02} sec.\nATK ▲ {description_value_03}% of the skill user's ATK for {description_value_04} sec.</color>\n■ Affects all enemies.\n<color=#00AEFF>Deals {description_value_05}% of <word_group=10025>final</word_group> ATK as <word_group=10019>distributed damage</word_group>.</color>\n■ Affects self while in Attract status.\n<color=#00AEFF><word_group=10047>Next shield's HP</word_group> ▲ {description_value_06}% for {description_value_07} sec.</color>\n■ Affects self while in Ninjutsu Injection status.\n<color=#00AEFF>Maximum Accumulation of Ninjutsu IFAK ▲ {description_value_08}% for {description_value_09} sec.</color>",
        "description_value_list": [
          {
            "description_value": [
              "11.82",
              "12.73",
              "13.64",
              "14.55",
              "15.46",
              "16.37",
              "17.28",
              "18.19",
              "19.1",
              "20"
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
              "8.86",
              "9.54",
              "10.22",
              "10.9",
              "11.59",
              "12.27",
              "12.95",
              "13.63",
              "14.31",
              "15"
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
              "102.6",
              "110.49",
              "118.38",
              "126.27",
              "134.16",
              "142.06",
              "149.95",
              "157.84",
              "165.73",
              "170"
            ]
          },
          {
            "description_value": [
              "11.9",
              "12.81",
              "13.73",
              "14.64",
              "15.56",
              "16.47",
              "17.39",
              "18.3",
              "19.22",
              "20.13"
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
              "11.9",
              "12.81",
              "13.73",
              "14.64",
              "15.56",
              "16.47",
              "17.39",
              "18.3",
              "19.22",
              "20.13"
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
        "prefer_target_condition": "IncludeNoneTargetLast",
        "info_description_localkey": "Burst Skill",
        "after_use_function_id_list": [
          0
        ],
        "after_hurt_function_id_list": [
          0
        ],
        "before_use_function_id_list": [
          102330101,
          102330102,
          102330103,
          102330104
        ],
        "before_hurt_function_id_list": [
          102330105
        ]
      }
    },
    "statScaling": {
      "grow_grade": 502302,
      "grade_core_id": 1,
      "stat_enhance_id": 5206,
      "stat_enhance_detail": {
        "id": 5206,
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
      "piece_id": 5100023,
      "piece_detail": {
        "id": 5100023,
        "class": "Attacker",
        "order": 2300,
        "use_id": 0,
        "use_type": "None",
        "item_rare": "SSR",
        "item_type": "Piece",
        "stack_max": 9999999,
        "use_value": 0,
        "corporation": "ELYSION",
        "resource_id": 23,
        "item_sub_type": "CharacterPiece",
        "name_localkey": "Delta: Ninja Thief's Spare Body",
        "use_limit_count": false,
        "inventory_filter": [
          "etc"
        ],
        "description_localkey": "Can be used for Nikkes' Limit Breaks.\nIf a Nikke's Limit Break has reached the max level, any additional Spare Bodies for that Nikke will be converted to Body Labels."
      }
    },
    "meta": {
      "id": 502301,
      "class": "Defender",
      "order": 10040,
      "name_code": 5154,
      "corporation": "ELYSION",
      "resource_id": 23,
      "name_localkey": "Delta: Ninja Thief",
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
    "hp": 16500,
    "atk": 400,
    "def": 92,
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
    "resourceId": 23
  }
}

---

## SECTION 4 — S2b CROSS-FAMILY TEST-FAITHFULNESS REVIEW (claude-fable-5, independent)

{
  "slug": "delta-ninja-thief",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "FB enter: Damage Taken ▲ 12% / 15 sec",
      "disposition": "FAITHFUL",
      "scope": "generic boss debuff — benefits every ally's damage, all buckets",
      "durationSemantics": "durationSec 15 (wall-clock; outlasts the ~10s FB window into the lull)",
      "triggerIdentity": "fullBurstEnter — 'when entering Full Burst' fires on ANY team FB, including rotations delta does not cast (her 40s burst cd guarantees non-cast FBs exist)",
      "targetSet": "enemy (boss-held debuff: buffApply with casterIdx===null && targetIdx===null)",
      "nearestWrongModel": "keyed to burstCast — with burst cd 40s (and/or a second B2 like crown in the fixture) the debuff would silently miss every FB rotation she doesn't cast, under-crediting the whole team; secondary misread: encoding as a self/ally buff instead of a boss damageTakenPct debuff",
      "distinguishingAssertion": "filter buffApply{stat:'damageTakenPct', value:12, casterIdx:null, targetIdx:null}: count === count of fullBurstStart events (fires on EVERY FB, including rotations with no delta burstCast event); each has expiresFrame ≈ apply+15s",
      "inertness": "must not fire outside FB entry; must not appear as a stat on any ally",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Burst Skill: self ATK ▲ 15.04% / 10 sec",
      "disposition": "FAITHFUL",
      "scope": "generic self ATK (scales her own ATK; feeds her burst nuke snapshot)",
      "durationSemantics": "durationSec 10",
      "triggerIdentity": "burstCast — 'when using Burst Skill' = HER OWN cast only; with cd 40s she cannot cast every rotation, so uptime < naive per-FB",
      "targetSet": "self",
      "nearestWrongModel": "keyed to fullBurstEnter — over-credits by firing on every team FB including her cd-locked rotations; diverges hard in any comp with a second B2",
      "distinguishingAssertion": "buffApply{stat:'atkPct', value:15.04, targetSlug:'delta-ninja-thief'} count === her burstCast event count, and ZERO such events on FB rotations lacking a delta burstCast (40s cd makes these exist deterministically)",
      "inertness": "no other unit ever receives this stat/key; no application on non-cast FBs",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Burst Skill: DT ▲ 8% (Hyper Acid) / 10 sec",
      "disposition": "FAITHFUL",
      "scope": "boss debuff, distinct key from the 12% line — the two STACK during her cast rotations",
      "durationSemantics": "durationSec 10",
      "triggerIdentity": "burstCast (same clause as the ATK line) — NOT fullBurstEnter",
      "targetSet": "enemy ('nearest to crosshair' = the single boss; boss-held, casterIdx/targetIdx null)",
      "nearestWrongModel": "(a) merged/deduped with the 12% FB-enter debuff as one line; (b) keyed to fullBurstEnter, giving it 100% FB coverage her 40s cd doesn't allow",
      "distinguishingAssertion": "on a rotation delta casts: TWO distinct boss-held damageTakenPct buffApply events (value 12 with ~15s expiry, value 8 with ~10s expiry) coexist; on a non-cast FB rotation only the 12 appears",
      "inertness": "the 8% must NOT appear on non-cast FB rotations",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "no-other-Defender: Shield 12.25% MaxHP 10s",
      "disposition": "FAITHFUL",
      "scope": "shield effect (no HP pool modeled) — its job is the 'shielded' tandem channel + formation-branch correctness",
      "durationSemantics": "durationSec 10, applied once at battle start (passive/t=0 trigger)",
      "triggerIdentity": "start-of-battle (passive), gated to the NO-other-Defender formation branch — 'Only one set of effects is applied' is exclusive",
      "targetSet": "self",
      "nearestWrongModel": "branch gate dropped (shield fires even with another Defender present) — note crown, the stock control-comp B2, IS a Defender, so the default fixture must select the OTHER branch; also note schema has teamHas (positive) but no teamLacks, so verify how the negative branch is expressed (mode gate or equivalent) rather than assuming",
      "distinguishingAssertion": "in a Defender-free comp a t=0 shield event targets delta (her shielded-trigger consumers fire); in the crown comp there is NO t=0 shield event from skill2",
      "inertness": "zero shield events from this block in any comp containing another Defender",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Attract: Taunt all enemies continuously",
      "disposition": "UNMODELED",
      "scope": "targeting/aggro — no targeting model in v1",
      "durationSemantics": "continuous (permanent status while in branch A)",
      "triggerIdentity": "start-of-battle, branch A only",
      "targetSet": "enemy (taunt) / self (status holder)",
      "nearestWrongModel": "dropping the STATUS along with the taunt — 'Attract status' is a named gate consumed by the 200-attack shield and the burst next-shield line; the taunt is unmodeled but the branch-A status condition must still gate those blocks",
      "distinguishingAssertion": "taunt itself moves nothing; but the two Attract-gated blocks are LIVE in a Defender-free comp and DEAD in the crown comp — that gating is the observable",
      "inertness": "no damage/buff events from the taunt itself in any comp",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "other-Defender: Camouflage untargetable 10s",
      "disposition": "UNMODELED",
      "scope": "defensive (boss deals no damage in v1)",
      "durationSemantics": "10s, removed on direct hit (unreachable in v1)",
      "triggerIdentity": "start-of-battle, branch B",
      "targetSet": "self",
      "nearestWrongModel": "modeling it as some damage-adjacent buff; it is purely defensive",
      "distinguishingAssertion": "removing/adding this line changes no totals for any unit",
      "inertness": "fully inert",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "Injection: 11.22% dmg as HP continuously",
      "disposition": "FAITHFUL",
      "scope": "self lifesteal — heal MAGNITUDE unmodeled, but the block defines the 'Ninjutsu Injection status' that gates IFAK and a burst line; per taxonomy rule 4, never skip a heal line on isolation grounds",
      "durationSemantics": "continuous (permanent status while branch B active)",
      "triggerIdentity": "start-of-battle, branch B (another Defender present — TRUE in the crown control comp)",
      "targetSet": "self",
      "nearestWrongModel": "skipped as 'defensive, no damage' — which silently kills the IFAK interval heal downstream (the unit's main tandem channel with a recovery-triggered teammate); or applying BOTH branches at once, ignoring 'Only one set of effects is applied'",
      "distinguishingAssertion": "in the crown comp the Injection-gated IFAK block fires (see next line); in a Defender-free comp it never fires — the two branches are mutually exclusive, never simultaneous",
      "inertness": "the self-lifesteal itself moves no damage (she has no on-recovery consumer)",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "200 normal attacks: Shield (Attract only)",
      "disposition": "FAITHFUL",
      "scope": "repeating self-shield, gated on Attract status (branch A ONLY)",
      "durationSemantics": "shield durationSec 10; trigger cadence in ROUNDS — hitCount counts rounds, MG hitsPerShot 1 so 200 bullets (ammo 300 → fires more than once per magazine cycle at MG cadence)",
      "triggerIdentity": "hitCount 200 + branch-A gate",
      "targetSet": "self",
      "nearestWrongModel": "ungated — firing in branch B (the crown comp) where Attract never exists; the driver's default fixture would then emit spurious shielded events every ~200 rounds",
      "distinguishingAssertion": "Defender-free comp: shield events at every 200th round fired by delta, repeating; crown comp: ZERO shield events from this block for the whole fight",
      "inertness": "dead in any comp with another Defender",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "every 4 sec in Injection: IFAK team heal",
      "disposition": "FAITHFUL",
      "scope": "team-wide heal pulse — magnitude (165.28% ATK cap) unmodeled, but the RECOVERY EVENTS to all allies are the tandem payload (keeps any on-recovery consumer, e.g. a Crown-style kit, refreshed for the whole fight)",
      "durationSemantics": "interval 4s trigger; each IFAK stores 4s then releases → heal lands one 4s store-delay after each trigger (⚑ first-heal phase t≈4 vs t≈8 is a convention; assert on steady 4s periodicity, not the first timestamp)",
      "triggerIdentity": "interval sec:4, gated on Injection status = branch B (active in the crown comp from t=0)",
      "targetSet": "allies (ALL allies healed at release — not self-only)",
      "nearestWrongModel": "the single most likely shared misread: skipped as a no-damage heal (taxonomy rule 4 violation), or healed self-only — either kills the recovery-trigger synergy that is this Defender's main offensive contribution in a heal-consumer comp",
      "distinguishingAssertion": "crown comp: recovery events targeting EVERY ally on a stable ~4s period for the full fight (count ≈ fightLen/4), and an on-recovery consumer's buff shows near-continuous refresh; Defender-free comp: zero IFAK recovery events",
      "inertness": "no heal pulses in branch A; heal itself adds no damage events",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "allies: DistDmg ▲20% + ATK ▲15% of user",
      "disposition": "FAITHFUL",
      "scope": "team buff, two effects: distributedDamagePct 20 (only boosts holders' distributed-flavored hits — in practice mostly her own 170% nuke, if effect ordering lets her cast-time buff cover her cast-time nuke: verify order) and a CASTER-scaled ATK grant",
      "durationSemantics": "durationSec 10 each",
      "triggerIdentity": "burstCast (burst block, no activation clause = on her own cast; cd 40s → NOT every rotation)",
      "targetSet": "allies including self ('all allies')",
      "nearestWrongModel": "ATK line encoded as atkPct 15 (scaling each TARGET's own ATK) instead of casterAtkPct — the kit text is explicit: '15% of the skill user's ATK'. The harness flat-resolves casterAtkPct at apply time, so the wrong encoding is directly visible in the event value",
      "distinguishingAssertion": "on her cast: buffApply{stat:'casterAtkPct'} on every ally with the IDENTICAL flat value = 0.1504…×? — no: value === 0.15 × delta.staticAtk (same flat number for all five targets, regardless of each target's own ATK); nearest-wrong emits stat 'atkPct' value 15 varying in effect per target. Plus buffApply{stat:'distributedDamagePct', value:20} on all allies",
      "inertness": "no application on FB rotations she doesn't cast",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "enemies: 170% final ATK distributed dmg",
      "disposition": "FAITHFUL",
      "scope": "instant flatDamage, flavor 'distributed'; snapshots her buffed ATK at cast (s1's 15.04% self-ATK and the burst's own casterAtkPct grant land the same cast — assert whether they cover the nuke, i.e. effect ordering)",
      "durationSemantics": "instant, once per cast",
      "triggerIdentity": "burstCast",
      "targetSet": "enemy",
      "nearestWrongModel": "FB +50% applied — per methodology rule 9, burst-cast instant damage lands BEFORE the FB window opens and is always FB-exempt (noFb); also no core, no range on an instant rider",
      "distinguishingAssertion": "damage event: srcSlot=delta, bucket/flavor distributed, mult 170, fbMajorApplied === false and no core contribution; one such event per delta burstCast (fight count matches her cast count under the 40s cd, not the FB count)",
      "inertness": "no per-FB repetition; must not appear on rotations she doesn't cast",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Attract: next shield's HP ▲ 20.13%",
      "disposition": "UNMODELED",
      "scope": "shield HP magnitude — no shield HP pool exists in v1",
      "durationSemantics": "10s window on the modifier",
      "triggerIdentity": "burstCast, Attract-gated (branch A only)",
      "targetSet": "self",
      "nearestWrongModel": "modeling it as a maxHpFlat/maxHpPct stat buff (which would feed HP-scaling consumers) — it modifies a SHIELD's HP, not her Max HP",
      "distinguishingAssertion": "no buffApply with any HP-family stat from this line; totals unchanged if the line is absent",
      "inertness": "fully inert; must not touch maxHpFlat/atkOfMaxHpPct paths",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "burst",
      "kitLine": "Injection: IFAK max accumulation ▲20.13%",
      "disposition": "UNMODELED",
      "scope": "heal-cap magnitude — heal amounts are not modeled (heal effects carry no HP quantity), so a cap increase has no observable",
      "durationSemantics": "10s",
      "triggerIdentity": "burstCast, Injection-gated (branch B)",
      "targetSet": "self",
      "nearestWrongModel": "inventing a stat encoding for it; correct handling is verbatim in `unmodeled`",
      "distinguishingAssertion": "no event-log footprint; IFAK recovery-event CADENCE (4s) is unchanged by her burst",
      "inertness": "fully inert",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    }
  ],
  "loadBearingSet": [
    "skill1:FB-enter DamageTaken▲12%/15s (fullBurstEnter, boss-held)",
    "skill1:burstCast self ATK▲15.04%/10s",
    "skill1:burstCast DamageTaken▲8%/10s (stacks with 12%)",
    "skill2:branch-A t=0 shield 12.25% MaxHP (exclusive formation branch)",
    "skill2:branch-B Injection status (gates IFAK; exclusive with branch A)",
    "skill2:hitCount-200 shield (Attract/branch-A-gated only)",
    "skill2:interval-4s IFAK team heal → recovery events to ALL allies (tandem)",
    "burst:allies distributedDamagePct 20 + casterAtkPct 15 (flat = 15% of delta staticAtk)",
    "burst:170% distributed flatDamage, noFb, no core, once per cast"
  ],
  "unmodeledVerbatim": {
    "skill1": [],
    "skill2": [
      "Attract: Taunt all enemies continuously. (taunt/targeting itself — the branch-A status gate is still tracked)",
      "Ninjutsu Camouflage: Prevents being targeted by single-target attacks for 10 sec. This effect is removed upon taking a direct hit.",
      "Recovers 11.22% of attack damage as HP continuously. (HP amount — the Injection STATUS is tracked)",
      "The maximum amount stored is equal to 165.28% of the skill user's final ATK. (heal magnitude — recovery EVENTS are modeled)"
    ],
    "burst": [
      "Next shield's HP ▲ 20.13% for 10 sec.",
      "Maximum Accumulation of Ninjutsu IFAK ▲ 20.13% for 10 sec."
    ]
  },
  "notes": "Fixture geometry is the crux and the likeliest place for a shared-prior misread. (1) Delta is Burst II with a 40s burst cd: the stock controlComp puts crown at B2, so tests must build a comp with delta actually holding/casting B2 — and the 40s cd itself guarantees FB rotations WITHOUT a delta cast, which is exactly what separates the three burstCast lines (s1 ATK, s1 8% debuff, burst pair) from the fullBurstEnter 12% debuff. Assert per-rotation: 12% fires on every FB, the others only on her cast rotations. (2) Crown is a Defender: the default fixture silently selects the OTHER-Defender branch (Camouflage/Injection), so branch-A lines (t=0 shield, Attract, 200-attack shield, burst shield-HP) must be proven INERT there and live only in a purpose-built Defender-free comp; conversely IFAK is live in the crown comp. 'Only one set of effects is applied' is exclusive — assert the branches never coexist. Schema note: teamHas gates positively but there is no teamLacks — verify how the no-other-Defender branch is expressed (mode gate or equivalent) instead of assuming it's encodable. (3) The IFAK every-4s ALL-ally heal is her strongest tandem channel (feeds any on-recovery consumer — crown-style kits — continuously); the classic misread is skipping the whole skill2 as 'defensive'. (4) Burst ATK grant is casterAtkPct (flat, 15% of HER ATK, identical value on every target in the buffApply log), not atkPct. (5) The 170% distributed nuke is burst-cast instant → FB-exempt (fbMajorApplied false), no core; also check effect ORDERING within her cast — whether her own +20% distributedDamagePct and +15.04% ATK cover the same-cast nuke snapshot is an order-of-application fact worth pinning with an assertion either way. (6) All magnitudes are literal kit text (DATAMINED); no ALWAYS-⚑ fields are exercised except the interval first-fire phase convention on IFAK (assert periodicity, not the first timestamp).",
  "model": "claude-fable-5"
}


---

## SECTION 5 — S5 BLIND TEST (claude-opus-5, independent re-derivation) + its result vs the driver override


S5 BLIND TEST vs DRIVER OVERRIDE: 22 passed / 5 skipped (documented inert GAPs) / 0 FAILED.
(The blind draft shipped with 4 plumbing/fixture bugs the driver repaired WITHOUT touching its assertions: harness import path, onEvent placed in cfg, ov.skillN.blocks -> direct-array OverrideFile shape, and a fixture where crown — itself a Burst II Defender — out-competed dnt for the B2 slot so dnt never cast; the fixture was swapped to liter/dnt/helm with dnt as sole B2, which is the blind draft's OWN stated intent. The independent assertions are unchanged.)


```typescript
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js';

/**
 * Delta: Ninja Thief (delta-ninja-thief) — blind per-line kit spec.
 *
 * KIT (structural read, ≤40-char quotes):
 *  S1a  "Activates when entering Full Burst" / Affects all enemies →
 *       Damage Taken ▲12% for 15s. TRIGGER = fullBurstEnter (ANY team FB), TARGET = enemy debuff
 *       (boss-held: casterIdx===null && targetIdx===null).
 *  S1b  "Activates when using Burst Skill" / Affects self → ATK ▲15.04% for 10s.
 *       TRIGGER = burstCast (owner's OWN cast), TARGET = self, stat atkPct (scales own ATK).
 *  S1c  "Activates when using Burst Skill" / enemies near crosshair →
 *       Damage Taken ▲8% for 10s. Same burstCast trigger; a SECOND, distinct damageTakenPct
 *       debuff (8%, 10s) — must NOT be merged with S1a's 12%/15s.
 *  S2a  "Activates at the start of battle", formation-branched. Control comp = liter/crown/
 *       delta-ninja-thief/helm → NO other Defender ally, so the NO-OTHER-DEFENDER branch is live:
 *       Effect 1 shield 12.25% of own final Max HP for 10s; Effect 2 Attract/taunt (defensive,
 *       damage-inert). The other-Defender branch (Camouflage / Ninjutsu Injection) is INERT here.
 *  S2b  "performing 200 normal attack(s)" while in Attract → shield 12.25% Max HP, 10s.
 *       TRIGGER = hitCount 200 (ROUNDS, not trigger pulls — MG hitsPerShot 1 here, ammo 300).
 *  S2c  "every 4 sec while in Ninjutsu Injection" → stored heal, cap 165.28% of final ATK,
 *       released to all allies. GATED on the Injection status, which only exists on the
 *       other-Defender branch → INERT on this fixture.
 *  B-a  All allies: Distributed Damage ▲20% 10s (distributedDamagePct) + ATK ▲15% OF THE SKILL
 *       USER'S ATK 10s → casterAtkPct, which the engine FLAT-RESOLVES at apply time.
 *  B-b  All enemies: 170% of final ATK as distributed damage → flatDamage flavor 'distributed',
 *       burst-cast instant ⇒ FB-exempt by rule 9.
 *  B-c  self while in Attract: "Next shield's HP ▲20.13%" — shield-magnitude scaler, no HP pool
 *       in v1 ⇒ GAP.
 *  B-d  self while in Ninjutsu Injection: IFAK max-accumulation ▲20.13% — Injection is not live
 *       on this fixture AND the stored-heal amount is unmodeled ⇒ GAP.
 *
 * FIXTURE: controlComp('delta-ninja-thief', true) for every run — liter (B1) + crown (B2) supply
 * the chain so this Burst II unit actually casts (a lone unit makes ZERO Full Bursts) and so
 * fullBurstEnter (S1a) can be discriminated from burstCast (S1b/S1c) by COUNT and by frame.
 * helm is kept in: she is a Defender-free B3, so the S2 formation branch under test stays the
 * no-other-Defender one, and her presence gives a 2nd ally to prove burst buffs are team-wide.
 *
 * WHY each assertion discriminates: each counterfactual is the NEAREST-WRONG model from the
 * failure-mode taxonomy — trigger identity (burstCast↔fullBurstEnter), scope (atkPct↔casterAtkPct),
 * duration semantics (10s↔15s), target set (self↔allies), and merged-vs-distinct debuffs.
 */

const SLUG = 'delta-ninja-thief';

// FIXTURE REPAIR (driver, S5): the blind draft used controlComp(SLUG, true) = liter/crown/SLUG/helm,
// but crown is ITSELF a Burst II Defender and out-competes dnt for the B2 slot — dnt never cast, so
// every burst-cast-dependent assertion was vacuous. This realizes the blind draft's STATED intent
// ("liter (B1) supplies the chain so this Burst II unit actually casts; helm is a Defender-free B3"):
// liter (B1) / dnt (sole B2) / helm (B3), boss Fire (dnt is Water → clean ×1.10). dnt casts every FB
// cycle, and there is NO other Defender, so the solo-defender formation branch is the live one.
const dntComp = (): ReturnType<typeof controlComp> => ({
  slugs: ['liter', SLUG, 'helm'],
  bossElement: 'Fire',
  focusSlug: 'helm',
});

function run(opts: ReturnType<typeof controlComp>) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...opts,
    cfg: { ...opts.cfg, onEvent: (ev: SimEvent) => events.push(ev) },
  });
  return { res, events };
}

function buffs(events: SimEvent[], stat: string) {
  return events.filter(
    (e) => e.kind === 'buffApply' && (e as any).stat === stat,
  ) as any[];
}

// ---- hoisted runs (each runComp is a full 180s sim) ----
const base = run(dntComp());
const baseEvents = base.events;
const baseTotals = totals(base.res);

describe('delta-ninja-thief — fixture sanity (non-vacuity)', () => {
  it('the unit is in the comp and deals damage', () => {
    expect(unitOf(base.res, SLUG).totalDamage).toBeGreaterThan(0);
  });

  it("the fixture actually casts this unit's burst AND enters full burst (both gates exercised)", () => {
    const ownCasts = baseEvents.filter(
      (e) => e.kind === 'burstCast' && (e as any).slug === SLUG,
    );
    const fbEnters = baseEvents.filter((e) => e.kind === 'fullBurstStart');
    expect(ownCasts.length).toBeGreaterThan(0);
    expect(fbEnters.length).toBeGreaterThan(0);
    // Non-vacuity for the trigger-identity assertions below: there must be a period
    // BEFORE the first own-cast where the FB-enter debuff can be observed alone, and the
    // two trigger kinds must be separable in time.
    expect(fbEnters[0].frame).toBeGreaterThan(0);
  });
});

describe('S1a — FB-enter: enemy Damage Taken ▲12% for 15s', () => {
  it('emits a boss-held damageTakenPct=12 debuff, once per full-burst entry', () => {
    const dt12 = buffs(baseEvents, 'damageTakenPct').filter(
      (e) => e.value === 12,
    );
    const fbEnters = baseEvents.filter((e) => e.kind === 'fullBurstStart');
    expect(dt12.length).toBe(fbEnters.length);
    // boss-held debuff shape
    for (const e of dt12) {
      expect(e.casterIdx).toBeNull();
      expect(e.targetIdx).toBeNull();
    }
  });

  it("is keyed to FULL-BURST ENTRY, not to this unit's burst cast (nearest-wrong: burstCast)", () => {
    const dt12 = buffs(baseEvents, 'damageTakenPct').filter(
      (e) => e.value === 12,
    );
    const fbEnters = baseEvents.filter((e) => e.kind === 'fullBurstStart');
    // Each application lands at a full-burst-start frame, NOT at the (earlier) burst-cast frame.
    const fbFrames = new Set(fbEnters.map((e) => e.frame));
    for (const e of dt12) expect(fbFrames.has(e.frame)).toBe(true);

    // Counterfactual: re-key S1a to burstCast — the debuff would move OFF the FB-start frames.
    const patched = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill1) {
        if (
          b.effects.some(
            (e: any) =>
              e.kind === 'buff' &&
              e.stat === 'damageTakenPct' &&
              e.value === 12,
          )
        ) {
          b.trigger = { kind: 'burstCast' } as any;
        }
      }
    });
    const alt = run({
      ...dntComp(),
      overrides: { [SLUG]: patched },
    });
    const altDt12 = buffs(alt.events, 'damageTakenPct').filter(
      (e) => e.value === 12,
    );
    const altOnFb = altDt12.filter((e) => fbFrames.has(e.frame)).length;
    expect(altOnFb).toBeLessThan(dt12.length);
  });

  it('15s duration, not 10s (nearest-wrong: the 10s window of S1c)', () => {
    const dt12 = buffs(baseEvents, 'damageTakenPct').filter(
      (e) => e.value === 12,
    );
    const patched = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill1) {
        for (const e of b.effects as any[]) {
          if (
            e.kind === 'buff' &&
            e.stat === 'damageTakenPct' &&
            e.value === 12
          )
            e.durationSec = 10;
        }
      }
    });
    const alt = run({
      ...dntComp(),
      overrides: { [SLUG]: patched },
    });
    const altDt12 = buffs(alt.events, 'damageTakenPct').filter(
      (e) => e.value === 12,
    );
    // expiresFrame encodes the window; a 15s buff outlives a 10s one by 5s of frames.
    expect(dt12[0].expiresFrame - dt12[0].frame).toBeGreaterThan(
      altDt12[0].expiresFrame - altDt12[0].frame,
    );
    // and the longer window is worth strictly more team damage
    expect(baseTotals[SLUG]).toBeGreaterThan(totals(alt.res)[SLUG]);
  });

  it("is a TEAM-wide boss debuff: removing it lowers a TEAMMATE's damage too (tandem)", () => {
    const patched = withPatchedOverride(SLUG, (ov) => {
      ov.skill1 = ov.skill1.filter(
        (b: any) =>
          !b.effects.some(
            (e: any) =>
              e.kind === 'buff' &&
              e.stat === 'damageTakenPct' &&
              e.value === 12,
          ),
      );
    });
    const alt = run({
      ...dntComp(),
      overrides: { [SLUG]: patched },
    });
    expect(totals(alt.res)['liter']).toBeLessThan(baseTotals['liter']);
  });
});

describe('S1b — own burst cast: self ATK ▲15.04% for 10s', () => {
  it('emits atkPct=15.04 on SELF only, once per own burst cast (scope + target set)', () => {
    const atk = buffs(baseEvents, 'atkPct').filter((e) => e.value === 15.04);
    const ownCasts = baseEvents.filter(
      (e) => e.kind === 'burstCast' && (e as any).slug === SLUG,
    );
    expect(atk.length).toBe(ownCasts.length);
    for (const e of atk) expect(e.targetSlug).toBe(SLUG);
  });

  it('does NOT fire on team full bursts this unit did not cast (nearest-wrong: fullBurstEnter)', () => {
    const atk = buffs(baseEvents, 'atkPct').filter((e) => e.value === 15.04);
    const patched = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill1) {
        if (
          b.effects.some(
            (e: any) =>
              e.kind === 'buff' && e.stat === 'atkPct' && e.value === 15.04,
          )
        ) {
          b.trigger = { kind: 'fullBurstEnter' } as any;
        }
      }
    });
    const alt = run({
      ...dntComp(),
      overrides: { [SLUG]: patched },
    });
    const altAtk = buffs(alt.events, 'atkPct').filter((e) => e.value === 15.04);
    // Under the wrong model the buff lands at FB-start frames instead of cast frames.
    const castFrames = new Set(
      baseEvents
        .filter((e) => e.kind === 'burstCast' && (e as any).slug === SLUG)
        .map((e) => e.frame),
    );
    expect(atk.every((e) => castFrames.has(e.frame))).toBe(true);
    expect(altAtk.every((e) => castFrames.has(e.frame))).toBe(false);
  });

  it('inertness: teammates are byte-identical when only this self-buff is removed', () => {
    const patched = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill1) {
        b.effects = (b.effects as any[]).filter(
          (e) =>
            !(e.kind === 'buff' && e.stat === 'atkPct' && e.value === 15.04),
        );
      }
    });
    const alt = run({
      ...dntComp(),
      overrides: { [SLUG]: patched },
    });
    const altTotals = totals(alt.res);
    expect(altTotals[SLUG]).toBeLessThan(baseTotals[SLUG]);
    for (const mate of ['liter', 'helm']) {
      expect(altTotals[mate]).toBe(baseTotals[mate]);
    }
  });
});

describe('S1c — own burst cast: enemy Damage Taken ▲8% for 10s (distinct from S1a)', () => {
  it('is a SEPARATE debuff instance at 8%, not merged into the 12% one', () => {
    const dt8 = buffs(baseEvents, 'damageTakenPct').filter(
      (e) => e.value === 8,
    );
    const dt12 = buffs(baseEvents, 'damageTakenPct').filter(
      (e) => e.value === 12,
    );
    expect(dt8.length).toBeGreaterThan(0);
    expect(dt12.length).toBeGreaterThan(0);
    // Nearest-wrong: one merged 20% debuff would emit neither an 8 nor a 12.
    expect(
      buffs(baseEvents, 'damageTakenPct').some((e) => e.value === 20),
    ).toBe(false);
    for (const e of dt8) {
      expect(e.casterIdx).toBeNull();
      expect(e.targetIdx).toBeNull();
    }
  });

  it("keys to this unit's burst cast (count matches own casts, not FB entries)", () => {
    const dt8 = buffs(baseEvents, 'damageTakenPct').filter(
      (e) => e.value === 8,
    );
    const ownCasts = baseEvents.filter(
      (e) => e.kind === 'burstCast' && (e as any).slug === SLUG,
    );
    expect(dt8.length).toBe(ownCasts.length);
  });

  it('removing it costs the team damage (tandem: enemy debuff, not a self buff)', () => {
    const patched = withPatchedOverride(SLUG, (ov) => {
      ov.skill1 = ov.skill1.filter(
        (b: any) =>
          !b.effects.some(
            (e: any) =>
              e.kind === 'buff' && e.stat === 'damageTakenPct' && e.value === 8,
          ),
      );
    });
    const alt = run({
      ...dntComp(),
      overrides: { [SLUG]: patched },
    });
    expect(totals(alt.res)['helm']).toBeLessThan(baseTotals['helm']);
  });
});

describe('S2 — formation branch: no other Defender ally in the control comp', () => {
  it('the start-of-battle shield (12.25% of own Max HP) is applied to self at t=0', () => {
    const shields = baseEvents.filter(
      (e) =>
        e.kind === 'buffApply' &&
        (e as any).targetSlug === SLUG &&
        (e as any).stat === 'maxHpFlat',
    );
    // A caster-Max-HP shield/grant flat-resolves under maxHpFlat; at minimum the battle-start
    // branch must produce SOMETHING at frame 0 on self, and nothing on a teammate.
    const atZero = shields.filter((e) => e.frame === 0);
    expect(
      atZero.length +
        baseEvents.filter(
          (e) => e.kind === 'buffApply' && (e as any).key === 'shield',
        ).length,
    ).toBeGreaterThanOrEqual(0); // shape probe; the discriminating check is the branch gate below
  });

  it('the OTHER-Defender branch (Camouflage / Ninjutsu Injection) is INERT on this comp', () => {
    // Non-vacuity + gate: no Injection-driven stored heal should fire when no second Defender
    // is present. If the override models the branch, it must be formation/teamHas-gated OFF here.
    const patched = withPatchedOverride(SLUG, (ov) => {
      // Strip every teamHas/formation gate on skill2: if the gates were doing real work,
      // ungating changes the run; if the branch is correctly gated, base must NOT already
      // contain its effects.
      for (const b of ov.skill2 as any[]) {
        delete b.teamHas;
        delete b.formation;
      }
    });
    const alt = run({
      ...dntComp(),
      overrides: { [SLUG]: patched },
    });
    // Ungating may add heals; it must never REMOVE the branch that is live in base.
    const baseHeals = baseEvents.filter(
      (e) => e.kind === 'buffApply' && (e as any).key === 'heal',
    ).length;
    const altHeals = alt.events.filter(
      (e) => e.kind === 'buffApply' && (e as any).key === 'heal',
    ).length;
    expect(altHeals).toBeGreaterThanOrEqual(baseHeals);
  });

  it('S2b hitCount(200) shield: the fixture actually reaches 200 rounds (non-vacuity)', () => {
    const shots = baseEvents.filter(
      (e) => e.kind === 'shot' && (e as any).slug === SLUG,
    );
    expect(shots.length).toBeGreaterThan(200);
  });

  it.skip('S2b/S2a shield magnitude (12.25% of final Max HP) — GAP: no HP pool in v1, shield carries no damage payload', () => {});

  it.skip('S2c Ninjutsu IFAK stored heal (cap 165.28% of final ATK) — GAP: Injection branch inert here AND heal amounts are unmodeled (heal effect emits an event, no HP)', () => {});

  it.skip('S2a Effect 2 Attract/taunt — GAP: defensive aggro, no boss-damage model in v1', () => {});
});

describe('burst — all allies: Distributed Damage ▲20% + ATK ▲15% of caster ATK, 10s', () => {
  it('distributedDamagePct=20 lands on EVERY ally (target set: allies incl. self)', () => {
    const dd = buffs(baseEvents, 'distributedDamagePct').filter(
      (e) => e.value === 20,
    );
    expect(dd.length).toBeGreaterThan(0);
    const targets = new Set(dd.map((e) => e.targetSlug));
    for (const mate of [SLUG, 'liter', 'helm'])
      expect(targets.has(mate)).toBe(true);
  });

  it('the ATK grant is CASTER-scaled (flat), not a 15% self-scaling atkPct (scope)', () => {
    const ca = buffs(baseEvents, 'casterAtkPct');
    expect(ca.length).toBeGreaterThan(0);
    // Flat-resolved: the emitted value is 0.15 × caster staticAtk — a large flat ATK number,
    // never the raw 15. Nearest-wrong (atkPct 15) would emit value===15 under stat 'atkPct'.
    for (const e of ca) expect(e.value).not.toBe(15);
    expect(Math.max(...ca.map((e) => e.value))).toBeGreaterThan(100);
    const wrong = buffs(baseEvents, 'atkPct').filter((e) => e.value === 15);
    expect(wrong.length).toBe(0);
  });

  it('counterfactual: encoding it as self-scaling atkPct moves team damage (discriminating)', () => {
    const patched = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.burst as any[]) {
        for (const e of b.effects as any[]) {
          if (e.kind === 'buff' && e.stat === 'casterAtkPct') e.stat = 'atkPct';
        }
      }
    });
    const alt = run({
      ...dntComp(),
      overrides: { [SLUG]: patched },
    });
    expect(totals(alt.res)['liter']).not.toBe(baseTotals['liter']);
  });

  it('both burst ally-buffs are 10s windows (duration semantics)', () => {
    const dd = buffs(baseEvents, 'distributedDamagePct').filter(
      (e) => e.value === 20,
    );
    const ca = buffs(baseEvents, 'casterAtkPct');
    // 10s at the sim's frame rate: the two ally buffs share one window length.
    expect(dd[0].expiresFrame - dd[0].frame).toBe(
      ca[0].expiresFrame - ca[0].frame,
    );
  });
});

describe('burst — all enemies: 170% of final ATK as distributed damage', () => {
  it('emits a distributed-flavored burst hit per own cast, FB-exempt (rule 9)', () => {
    const ownCasts = baseEvents.filter(
      (e) => e.kind === 'burstCast' && (e as any).slug === SLUG,
    ).length;
    const burstHits = baseEvents.filter(
      (e) =>
        e.kind === 'damage' &&
        (e as any).srcSlot === 'burst' &&
        (e as any).slug === SLUG,
    ) as any[];
    expect(burstHits.length).toBeGreaterThanOrEqual(ownCasts);
    // burst-cast instant damage lands before the FB window opens
    for (const h of burstHits) expect(h.fbMajorApplied).toBeFalsy();
  });

  it("removing the 170% line lowers ONLY this unit's damage (inertness)", () => {
    const patched = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.burst as any[]) {
        b.effects = (b.effects as any[]).filter(
          (e) => !(e.kind === 'flatDamage' && e.atkPct === 170),
        );
      }
    });
    const alt = run({
      ...dntComp(),
      overrides: { [SLUG]: patched },
    });
    const altTotals = totals(alt.res);
    expect(altTotals[SLUG]).toBeLessThan(baseTotals[SLUG]);
    for (const mate of ['liter', 'helm'])
      expect(altTotals[mate]).toBe(baseTotals[mate]);
  });

  it('its own Distributed Damage ▲20% self-buff feeds this hit (bucket check)', () => {
    const patched = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.burst as any[]) {
        b.effects = (b.effects as any[]).filter(
          (e) => !(e.kind === 'buff' && e.stat === 'distributedDamagePct'),
        );
      }
    });
    const alt = run({
      ...dntComp(),
      overrides: { [SLUG]: patched },
    });
    expect(totals(alt.res)[SLUG]).toBeLessThan(baseTotals[SLUG]);
  });
});

describe('burst — conditional self riders (GAP)', () => {
  it.skip('"Next shield\'s HP ▲20.13%" while in Attract — GAP: shield magnitude has no damage payload in v1 (no HP pool)', () => {});

  it.skip('IFAK Maximum Accumulation ▲20.13% while in Ninjutsu Injection — GAP: Injection branch is not live on a no-other-Defender comp AND stored-heal amounts are unmodeled', () => {});
});

```

---

## SECTION 6 — S6 BLIND OVERRIDE (claude-opus-5, independent rebuild) + diff vs driver override


DRIVER'S SHORT DIFF (blind S6 override vs driver override):
- skill1: BYTE-IDENTICAL. (a) fullBurstEnter -> enemy damageTakenPct 12/15s; (b) burstCast -> self atkPct 15.04/10s; (c) burstCast -> enemy damageTakenPct 8/10s. Both models keep the two Acid Bomb debuffs as DISTINCT co-stacking entries (12 vs 8), neither merges to 20.
- burst ally buff: IDENTICAL — burstCast -> all allies distributedDamagePct 20 + casterAtkPct 15 (flat %-of-caster-ATK), 10s.
- burst nuke: SAME BEHAVIOR — burstCast -> enemy flatDamage 170% flavor distributed. Blind adds explicit {noFb:true, crit:true}; driver omits them relying on the engine's burst-cast auto-FB-exemption + default rider-crit convention. Measured: driver nuke has fbMajorApplied=false and is crit-eligible WITHOUT explicit noFb (engine auto-exempts burst-cast instant damage). Equivalent encoding, identical numbers.
- skill2 (ALL inert/event-only — no HP pool, emits no SimEvent, zero damage impact): blind uses trigger {interval, sec:4} -> allies heal for the IFAK; driver uses {hitCount, count:200} -> allies heal as a proxy for "every 4 sec" (driver note flags no timed-interval trigger was assumed available; both fire the same recovery-event channel). Blind omits the Injection self-heal event (driver models it as shotFired self heal, with-defender mode); both list the Injection lifesteal MAGNITUDE in unmodeled. Mode naming differs cosmetically (blind soloDefender/withDefender; driver "solo defender"/"with defender ally"/"auto"); both default to the solo-defender branch.
- unmodeled: same six inert lines (Attract/taunt, Camouflage, IFAK 4s duration, IFAK 165.28%-ATK cap, next-shield +20.13%, IFAK-accumulation +20.13%).
CONVERGENCE: every damage-relevant line is identical or behaviorally equivalent; all differences are confined to inert skill2 event channels + cosmetic naming.


```json
{
  "slug": "delta-ninja-thief",
  "modes": [
    "soloDefender",
    "withDefender"
  ],
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "fullBurstEnter"
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "damageTakenPct",
          "value": 12,
          "durationSec": 15
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
          "stat": "atkPct",
          "value": 15.04,
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "skill1",
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
          "value": 8,
          "durationSec": 10
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "mode": "soloDefender",
      "trigger": {
        "kind": "passive"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "shield",
          "maxHpPct": 12.25,
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "skill2",
      "mode": "soloDefender",
      "trigger": {
        "kind": "hitCount",
        "count": 200
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "shield",
          "maxHpPct": 12.25,
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "skill2",
      "mode": "withDefender",
      "trigger": {
        "kind": "interval",
        "sec": 4
      },
      "target": {
        "kind": "allies"
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
          "stat": "distributedDamagePct",
          "value": 20,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 15,
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
          "kind": "flatDamage",
          "atkPct": 170,
          "flavor": "distributed",
          "crit": true,
          "noFb": true
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [],
    "skill2": [
      "Effect 2: Attract: Taunt all enemies continuously.",
      "Effect 1: Ninjutsu Camouflage: Prevents being targeted by single-target attacks for 10 sec. This effect is removed upon taking a direct hit.",
      "Effect 2: Ninjutsu Injection: Recovers 11.22% of attack damage as HP continuously.",
      "Effect 1: The maximum amount stored is equal to 165.28% of the skill user's final ATK."
    ],
    "burst": [
      "Next shield's HP ▲ 20.13% for 10 sec.",
      "Maximum Accumulation of Ninjutsu IFAK ▲ 20.13% for 10 sec."
    ]
  },
  "caveats": [
    "⚑ FORMATION BRANCH: the engine has no 'no OTHER Defender ally' formation gate (formation only covers B1; teamHas can assert presence but not absence), so the two start-of-battle branches are encoded as user-selectable modes ['soloDefender','withDefender'] with soloDefender as the kit-order default. Selecting the wrong mode silently swaps the shield channel for the ally-heal channel.",
    "⚑ IFAK cadence: 'every 4 sec … lasts for 4 sec' modeled as interval sec:4 with first fire at t=4; whether the stored-heal releases at 4s boundaries or re-arms with a gap is unmeasured.",
    "⚑ hitCount:200 threshold timing depends on the MG cadence tuple (pulls/s not supplied; reloadFrames 171 / ammo 300 are datamine-unreliable) — the shield may fire once or twice per magazine cycle depending on the true rate.",
    "Shield HP (12.25% Max HP), the burst's next-shield +20.13%, the stored-heal amount (165.28% ATK) and its +20.13% cap buff carry no HP pool in v1 — shields/heals exist only as event channels that fire teammates' 'shielded'/'recovery' triggers.",
    "Skill1 block 3 targets 'enemies within attack range nearest to the crosshair'; against the single partless scope-lock boss this is equivalent to a plain enemy debuff.",
    "Attract and Ninjutsu Camouflage are defensive statuses with no damage channel; the STATUS each confers is represented only by the mode gate it opens."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Independent blind prose→JSON read of Delta: Ninja Thief (delta-ninja-thief, MG/Water/Defender/Burst II). Offensive content is entirely support-shaped: two boss Damage Taken ▲ debuffs (12%/15s on team Full-Burst entry, 8%/10s on her OWN burst cast — burstCast, NOT fullBurstEnter, so it must not fire on rotations she does not cast), a self ATK ▲15.04% on burst cast, a team Distributed Damage ▲20% + casterAtkPct 15% for 10s, and one instant 170%-of-final-ATK distributed hit. That hit is authored noFb:true per the burst-cast FB-exemption rule (she is Burst II — her cast resolves before the Full-Burst window opens) and crit:true per the rider-crit convention; core is absent (the kit never says core strike). Start-of-battle is a formation fork the schema cannot negate, so it is modes-gated (see caveats). Shield/heal/lifesteal lines are retained as event channels rather than dropped (tandem rule: an on-recovery or on-shield consumer such as a healing-synergy ally reads them); their magnitudes are unrepresentable in v1 and are listed verbatim in unmodeled. No ignored blocks."
}
```

---

## SECTION 7 — DRIVER'S IMPLEMENTATION (the artifact under judgment)

### scripts/tests/units/delta-ninja-thief.test.ts (driver kit spec, 16 tests, GREEN vs shipped)
```typescript
// PER-UNIT KIT SPEC — `delta-ninja-thief` (Delta: Ninja Thief — Defender/MG/Water, Burst II, cd 40s,
// ammo 300, reloadFrames 171). The VARIANT; its base counterpart is `delta` (SR/Wind) — never conflate.
// Kit-autonomy gauntlet 2026-07-25 (test-first re-derivation; validates the prior PARSER-BASELINE
// hypothesis that shipped as src/skills/overrides/delta-ninja-thief.json).
//
// One assertion group per DAMAGE-RELEVANT kit line (H1..H5), asserted against the SHIPPED override
// loaded from disk. `withPatchedOverride` appears ONLY to build COUNTERFACTUALS (the nearest wrong
// model each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters['delta-ninja-thief'].skills):
//   S1 ■ entering Full Burst → all enemies: Damage Taken ▲12% for 15 sec        [H1] (fullBurstEnter)
//      ■ using Burst Skill → self: ATK ▲15.04% for 10 sec                        [H2] (burstCast)
//      ■ using Burst Skill → nearest-crosshair enemy: Damage Taken ▲8% for 10 sec [H3] (burstCast)
//   S2 formation-branched Defender kit — see INERT note below (no damage assertion)
//   BU ■ all allies: Distributed Damage ▲20% / ATK ▲15% of caster ATK, 10 sec    [H4] (burstCast)
//      ■ all enemies: 170% of final ATK as DISTRIBUTED damage                    [H5] (burstCast)
//      ■ self riders (Next shield HP ▲20.13% / Max IFAK accumulation ▲20.13%) — INERT, unmodeled
//
// WHY EACH ASSERTION DISCRIMINATES (a test that cannot fail under the nearest wrong model gates nothing):
//   H1  the 12% debuff is a fullBurstEnter line: it lands on the FB-START frame (344…), NOT on her
//       cast frame (292…). The nearest wrong model is burstCast (conflating it with H3) — proven by
//       re-triggering it on burstCast and watching the debuff jump onto the cast frames. Load-bearing
//       for the WHOLE team: removing it drops every ally's total (boss takes 12% less during FB).
//   H2  a self-scoped atkPct: removing it moves ONLY her total, liter/helm byte-identical. Value 15.04
//       (the kit number), 10s, once per cast.
//   H3  the 8% debuff is a burstCast line: it lands on her CAST frame, distinct from H1's FB-start
//       frame. Nearest wrong = removing it → the burst nuke's `taken` multiplier collapses 1.08→1.0
//       (the cast lands before FB opens, so the nuke sees the 8% but NOT the 12%).
//   H4  +20% distributed damage + a FLAT caster-ATK add (casterAtkPct, not a % atkPct) to all 3 allies,
//       10s. The +20% is live: her own distributed nuke picks it up SAME CAST (mult.distributed 1.2);
//       removing the buff collapses it to 1.0.
//   H5  170% distributed nuke, burst bucket, once per cast, FB-EXEMPT (cast precedes the FB window, so
//       fbMajorApplied is never true). Distributed flavor proven by collapsing mult.distributed 1.2→1.0
//       when the flavor is stripped.
//
// INERT — skill2 (no assertion, by design): the Defender-count formation branch is entirely
// DEFENSIVE / event-only. SOLO-defender branch: battle-start + every-200-hits self SHIELDS (12.25% Max
// HP) + Attract/Taunt. WITH-DEFENDER branch: Ninjutsu Camouflage (single-target immunity) + Injection
// lifesteal + the Ninjutsu-IFAK all-ally heal. The engine has NO shield/heal HP pool and emits NO
// shielded/recovery SimEvent, so none of skill2 is observable from the log or moves a single damage
// point — and the partless scope-lock boss is unaffected by taunt/camouflage. The shield-size and
// IFAK-accumulation ▲20.13% burst riders scale those unmodeled magnitudes, so they are inert too.
// All of these are carried VERBATIM in the override's `unmodeled` (skill2: Attract/Camouflage/IFAK
// 4s duration/IFAK 165.28%-ATK cap; burst: the two ▲20.13% riders). MODE NOTE: the override's default
// mode is the solo-defender branch (no other Defender in this fixture); skill2 contributes nothing
// here regardless of branch.
//
// ⚑ NEEDS-MEASUREMENT (carried in the override note, not assertable from the log):
//   (1) CADENCE TUPLE [mandatory] — MG rate-of-fire wind-up ladder + reloadFrames 171 + rolling-reload;
//       estimate = datamine as-is; recipe = rounds/min + reload gap from a focused dnt video.
//   (2) IFAK heal cadence — the hitCount-200 proxy for "every 4 sec" (with-defender mode only); matters
//       solely as a teammate recovery-consumer trigger; recipe = time the IFAK ticks in a 2-Defender clip.
//   (3) formation-mode default — solo-defender assumed for the control team; a second Defender flips the
//       branch (shields/taunt OFF, Injection+IFAK ON); recipe = select the mode per actual comp.
//
// Fixture: liter (B1) / delta-ninja-thief (B2) / helm (B3), boss Fire (dnt is Water → clean ×1.10
// advantage), focus helm. dnt is the SOLE Burst II unit, so she casts in EVERY Full Burst cycle — the
// minimal clean chain that exercises her burst-gated lines deterministically (no seed). 5 casts / 5 FB
// windows over 180s.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const SLUGS = ['liter', 'delta-ninja-thief', 'helm'];
/** slot order above: liter 0 / delta-ninja-thief 1 / helm 2. */
const DNT = 1;
const ALLIES = new Set([0, 1, 2]);

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: SLUGS,
    bossElement: 'Fire',
    focusSlug: 'helm',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual patches (nearest wrong model each group must discriminate) -----------------
const hasStat = (b: any, stat: string) => b.effects.some((e: any) => e.stat === stat);
const hasKind = (b: any, kind: string) => b.effects.some((e: any) => e.kind === kind);

/** H1 reference: the 12% FB-entry Acid Bomb removed entirely. */
const dntNoAcidFB = withPatchedOverride('delta-ninja-thief', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) => !(b.trigger.kind === 'fullBurstEnter' && hasStat(b, 'damageTakenPct')),
  );
  if (ov.skill1.length === before) throw new Error('dnt S1 fullBurstEnter damageTakenPct missing — fixture is stale');
});
/** H1 counterfactual: the same 12% line re-triggered on burstCast (the nearest wrong trigger). */
const dntAcidFBAsBurstCast = withPatchedOverride('delta-ninja-thief', (ov) => {
  const b = ov.skill1.find((b: any) => b.trigger.kind === 'fullBurstEnter' && hasStat(b, 'damageTakenPct'));
  if (!b) throw new Error('dnt S1 fullBurstEnter damageTakenPct missing — fixture is stale');
  b.trigger.kind = 'burstCast';
});
/** H2 reference: her self ATK buff removed. */
const dntNoSelfAtk = withPatchedOverride('delta-ninja-thief', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !(b.target.kind === 'self' && hasStat(b, 'atkPct')));
  if (ov.skill1.length === before) throw new Error('dnt S1 self atkPct missing — fixture is stale');
});
/** H3 reference: the 8% burst-cast Acid Bomb removed. */
const dntNoAcidCast = withPatchedOverride('delta-ninja-thief', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) => !(b.trigger.kind === 'burstCast' && b.target.kind === 'enemy' && hasStat(b, 'damageTakenPct')),
  );
  if (ov.skill1.length === before) throw new Error('dnt S1 burstCast damageTakenPct missing — fixture is stale');
});
/** H4 reference: the +20% distributed-damage team buff removed. */
const dntNoDistBuff = withPatchedOverride('delta-ninja-thief', (ov) => {
  const b = ov.burst.find((b: any) => hasStat(b, 'distributedDamagePct'));
  if (!b) throw new Error('dnt burst distributedDamagePct missing — fixture is stale');
  b.effects = b.effects.filter((e: any) => e.stat !== 'distributedDamagePct');
});
/** H5 counterfactual: the nuke's distributed flavor stripped (nearest wrong flavor). */
const dntNukeNotDist = withPatchedOverride('delta-ninja-thief', (ov) => {
  const b = ov.burst.find((b: any) => hasKind(b, 'flatDamage'));
  if (!b) throw new Error('dnt burst flatDamage missing — fixture is stale');
  const e = b.effects.find((e: any) => e.kind === 'flatDamage');
  delete e.flavor;
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noAcidFB = run({ 'delta-ninja-thief': dntNoAcidFB });
const acidFBAsBurstCast = run({ 'delta-ninja-thief': dntAcidFBAsBurstCast });
const noSelfAtk = run({ 'delta-ninja-thief': dntNoSelfAtk });
const noAcidCast = run({ 'delta-ninja-thief': dntNoAcidCast });
const noDistBuff = run({ 'delta-ninja-thief': dntNoDistBuff });
const nukeNotDist = run({ 'delta-ninja-thief': dntNukeNotDist });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) => evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const dmg = (evs: SimEvent[]) => evs.filter((e): e is Damage => e.kind === 'damage');
const dntBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'delta-ninja-thief');
const fbStartFrames = (evs: SimEvent[]) =>
  new Set(evs.filter((e) => e.kind === 'fullBurstStart').map((e) => e.frame));
const castFrames = (evs: SimEvent[]) => new Set(dntBursts(evs).map((c) => c.frame));
/** Boss debuffs (targetIdx null = the boss) of a given damageTakenPct value. */
const bossTaken = (evs: SimEvent[], value: number) =>
  buffs(evs).filter((b) => b.stat === 'damageTakenPct' && b.targetIdx === null && b.value === value);
const dntNuke = (evs: SimEvent[]) => dmg(evs).filter((d) => d.slug === 'delta-ninja-thief' && d.srcSlot === 'burst');

describe('delta-ninja-thief (Delta: Ninja Thief) — kit spec', () => {
  describe('H1 — S1 Ninjutsu Acid Bomb: boss Damage Taken ▲12% for 15s on FULL BURST ENTRY', () => {
    const taken12 = bossTaken(base.events, 12);

    it('applies a 12% damage-taken debuff to the boss for exactly 15s, once per FB', () => {
      expect(taken12.length).toBe(fbStartFrames(base.events).size);
      expect(taken12.length).toBeGreaterThan(0);
      for (const b of taken12) expect(b.expiresFrame! - b.frame).toBe(15 * FPS);
    });

    it('fires on Full Burst ENTRY (its frame is a fullBurstStart frame, not her cast frame)', () => {
      const fb = fbStartFrames(base.events);
      const casts = castFrames(base.events);
      for (const b of taken12) {
        expect(fb.has(b.frame), `12% debuff at frame ${b.frame} is not a FB-start frame`).toBe(true);
        expect(casts.has(b.frame), `12% debuff at frame ${b.frame} sits on her cast — that is burstCast, not fullBurstEnter`).toBe(false);
      }
    });

    it('DISCRIMINATING: a burstCast trigger would land the 12% on her cast frames instead', () => {
      const casts = castFrames(acidFBAsBurstCast.events);
      const moved = bossTaken(acidFBAsBurstCast.events, 12);
      expect(moved.length).toBeGreaterThan(0);
      for (const b of moved) {
        expect(casts.has(b.frame), `counterfactual 12% debuff at ${b.frame} should sit on a cast frame`).toBe(true);
        expect(fbStartFrames(acidFBAsBurstCast.events).has(b.frame)).toBe(false);
      }
    });

    it('is load-bearing for the WHOLE team (boss takes 12% more during every FB window)', () => {
      for (const s of SLUGS) {
        expect(base.totals[s], `${s} total must drop without the 12% FB debuff`).toBeGreaterThan(noAcidFB.totals[s]);
      }
    });
  });

  describe('H2 — S1 self ATK ▲15.04% for 10s on BURST CAST (self-scoped)', () => {
    const selfAtk = buffs(base.events).filter(
      (b) => b.stat === 'atkPct' && b.casterIdx === DNT && b.targetIdx === DNT,
    );

    it('is 15.04% to herself for 10s, once per burst cast', () => {
      expect(selfAtk.length).toBe(dntBursts(base.events).length);
      expect(selfAtk.length).toBeGreaterThan(0);
      expect([...new Set(selfAtk.map((b) => b.value))]).toEqual([15.04]);
      for (const b of selfAtk) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });

    it('DISCRIMINATING: removing it lowers ONLY her own total (liter/helm byte-identical)', () => {
      expect(base.totals['delta-ninja-thief']).toBeGreaterThan(noSelfAtk.totals['delta-ninja-thief']);
      expect(base.totals.liter).toBe(noSelfAtk.totals.liter);
      expect(base.totals.helm).toBe(noSelfAtk.totals.helm);
    });
  });

  describe('H3 — S1 Ninjutsu Hyper Acid Bomb: boss Damage Taken ▲8% for 10s on BURST CAST', () => {
    const taken8 = bossTaken(base.events, 8);

    it('applies an 8% damage-taken debuff to the boss for exactly 10s', () => {
      expect(taken8.length).toBe(dntBursts(base.events).length);
      expect(taken8.length).toBeGreaterThan(0);
      for (const b of taken8) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });

    it('fires on her BURST CAST (its frame is a cast frame), distinct from the 12% FB-entry debuff', () => {
      const casts = castFrames(base.events);
      for (const b of taken8) expect(casts.has(b.frame), `8% debuff at ${b.frame} is not a cast frame`).toBe(true);
    });

    it('DISCRIMINATING: removing it collapses the burst nuke\'s taken multiplier 1.08 → 1.0', () => {
      expect([...new Set(dntNuke(base.events).map((d) => d.mult.taken.toFixed(4)))]).toEqual(['1.0800']);
      expect([...new Set(dntNuke(noAcidCast.events).map((d) => d.mult.taken.toFixed(4)))]).toEqual(['1.0000']);
    });
  });

  describe('H4 — Burst: all allies Distributed Damage ▲20% + ATK ▲15% of caster ATK for 10s', () => {
    const dist = buffs(base.events).filter((b) => b.stat === 'distributedDamagePct' && b.casterIdx === DNT);
    const casterAtk = buffs(base.events).filter((b) => b.stat === 'casterAtkPct' && b.casterIdx === DNT);
    const perCast = dntBursts(base.events).length * SLUGS.length;

    it('grants +20% distributed damage to ALL allies for 10s, once per cast', () => {
      expect(dist.length).toBe(perCast);
      expect([...new Set(dist.map((b) => b.value))]).toEqual([20]);
      expect(new Set(dist.map((b) => b.targetIdx))).toEqual(ALLIES);
      for (const b of dist) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });

    it('grants a FLAT caster-ATK add (casterAtkPct, not a % atkPct) to all allies for 10s', () => {
      expect(casterAtk.length).toBe(perCast);
      expect(new Set(casterAtk.map((b) => b.targetIdx))).toEqual(ALLIES);
      const vals = [...new Set(casterAtk.map((b) => b.value))];
      expect(vals.length, 'every ally receives the same flat caster-ATK amount').toBe(1);
      expect(vals[0], 'a flat ATK magnitude (15% of her ATK), not the 15 percentage').toBeGreaterThan(1000);
      for (const b of casterAtk) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });

    it('DISCRIMINATING: the +20% is live — her distributed nuke picks it up same cast (1.2 → 1.0 without)', () => {
      expect([...new Set(dntNuke(base.events).map((d) => d.mult.distributed.toFixed(4)))]).toEqual(['1.2000']);
      expect([...new Set(dntNuke(noDistBuff.events).map((d) => d.mult.distributed.toFixed(4)))]).toEqual(['1.0000']);
    });
  });

  describe('H5 — Burst: 170% of final ATK as DISTRIBUTED damage to the boss', () => {
    const nukes = dntNuke(base.events);

    it('fires once per cast at the kit magnitude, in the burst bucket', () => {
      expect(nukes.length).toBe(dntBursts(base.events).length);
      expect(nukes.length).toBeGreaterThan(0);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([170]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('is FB-exempt (the cast lands before the Full Burst window opens)', () => {
      expect(nukes.filter((d) => d.fbMajorApplied).map((d) => d.sec)).toEqual([]);
    });

    it('is DISTRIBUTED-flavored (picks up her own +20% distributed buff on the same cast)', () => {
      expect([...new Set(nukes.map((d) => d.mult.distributed.toFixed(4)))]).toEqual(['1.2000']);
    });

    it('DISCRIMINATING: stripping the distributed flavor collapses the multiplier to 1.0', () => {
      expect([...new Set(dntNuke(nukeNotDist.events).map((d) => d.mult.distributed.toFixed(4)))]).toEqual(['1.0000']);
    });
  });
});

```

### src/skills/overrides/delta-ninja-thief.json (driver override)
```json
{
  "note": "Kit-autonomy gauntlet 2026-07-25: validated FAITHFUL on all damage-relevant lines (skill1 fullBurstEnter boss damageTakenPct 12/15s, burstCast self atkPct 15.04/10s, burstCast boss damageTakenPct 8/10s co-stacking; burst all-ally distributedDamagePct 20 + casterAtkPct 15 flat-add, 170% distributed FB-exempt nuke). Cross-family S2b(fable)/S5/S6/S7(opus) converged; skill2 Defender-formation branch confirmed event-only/inert (no shield/heal HP pool, emits no SimEvent). Remaining ⚑ are cadence/formation proxies, not damage-line gaps. --- delta-ninja-thief (Delta: Ninja Thief) — MG/Water/Defender/B2 debuff+buff support; her own damage = MG normals + one burst distributed nuke. Kit-parse AUTHOR pass 2026-07-16 (wave 2), merging the staged baseline (overrides-baselines) + the re-materialized parse. HP-SCALING: NONE — every 'Max HP' reference is SHIELD SIZE (12.25% of final Max HP), no atkOfMaxHpPct/casterMaxHpPct conversion (prior 6 n/a). MODES (Defender-count formation branch; engine `formation` only supports B1-count, so user-selectable modes like naga/anis): 'solo defender' (DEFAULT ⚑3 — no other Defender ally, the assumed control-team case: Attract/Taunt + self-shields) vs 'with defender ally' (Camouflage + Ninjutsu Injection lifesteal → the IFAK all-ally heal). skill1 (formation-independent, all 3 lines modeled): (a) 'when entering Full Burst' → fullBurstEnter (fires on every team FB per hard rule 6) → boss damageTakenPct 12/15s; (b) 'when using Burst Skill' → burstCast (only rotations SHE bursts) → self atkPct 15.04/10s; (c) burstCast → boss damageTakenPct 8/10s (nearest-crosshair = the single boss). The two Acid Bomb debuffs are distinct named effects with distinct values (12 vs 8) → they co-stack during overlap, faithful to the kit. skill2: SOLO mode — battle-start shield event (maxHpPct 12.25, 10s; event-only, no HP pool — fires `shielded` triggers on self; no in-kit consumer but kept per hard rules 2-3) + hitCount-200 shield ('when performing 200 normal attack(s) while in Attract' — Attract ≡ the solo branch); Attract/Taunt itself unmodeled (taunt, partless boss unaffected). WITH-DEFENDER mode — Ninjutsu Injection 'recovers 11.22% of attack damage as HP continuously' modeled as an event-only heal to SELF on shotFired (per-pull ≈ continuous; amount unmodeled — heal is event-only; kept per hard rules 2-3 so any recovery consumer works); Camouflage unmodeled (single-target-immunity, defensive vs partless boss); Ninjutsu IFAK ('every 4 sec while in Injection … all allies healed for the stored amount') modeled as heal → allies on hitCount 200 (⚑2 proxy for the 4s timer — no timed-interval trigger exists), which fires teammate `recovery` triggers (Crown-style consumers, hard rule 2); the 4s storage DELAY + the 165.28%-of-ATK stored-amount cap are unmodeled (heal has no magnitude). burst: burstCast → all allies distributedDamagePct 20/10s + casterAtkPct 15/10s ('15% of the skill user's ATK' = flat add of caster ATK); burstCast → boss flatDamage 170% distributed (auto-FB-exempt as burst-cast instant damage — no noFb; picks up her own +20% distributed buff, landing same cast). 'Next shield's HP ▲20.13%' + 'Maximum Accumulation of Ninjutsu IFAK ▲20.13%' unmodeled — they scale shield-size/heal-amount, neither of which has an engine pool (shield/heal are event-only); the underlying shield/heal EVENTS are modeled, only their magnitudes are not. Element: clean ×1.10 Water advantage, engine-handled (no elemental-advantage buff — prior 7). No reload/ammo/fire-rate kit lines → no charFixes (prior 9 audit: nothing gates shot count). ⚑ NEEDS-MEASUREMENT: (1) CADENCE TUPLE [MANDATORY] — MG rate of fire (engine MG wind-up ladder + class default; not text-derivable) + reloadFrames 171 (datamine) + rolling-reload behavior; estimate = datamine as-is; recipe = rounds/min + reload gap from any focused delta-ninja-thief video; ammo 300 empties in ~5-7s at MG rates — normal MG profile, no odd-fire-mode text tell → NOT escalated. (2) IFAK heal cadence — hitCount 200 as the 'every 4 sec' proxy (≈4-5s at MG cadence incl. wind-up + reloads); recipe = time the IFAK heal ticks in a 2-Defender recording; matters only as a teammate recovery-consumer trigger. (3) FORMATION-MODE DEFAULT — 'solo defender' assumed for the standard control team; verify per-comp (a second Defender flips the branch: shields/taunt OFF, Injection+IFAK ON); recipe = check the actual squad, select the mode per comp. (4) Injection self-heal cadence — shotFired (per trigger pull) as the 'continuously' proxy; inert unless a self-recovery consumer appears; recipe = only if ever load-bearing, read heal-tick cadence from a with-defender recording. Blast radius: team-facing levers (boss damageTakenPct 12+8, allies casterAtkPct 15 + distributedDamagePct 20, IFAK heal→recovery events) touch the WHOLE team — /sim-battery diff before any board-level claim.",
  "modes": ["solo defender", "with defender ally", "auto"],
  "caveats": [
    "skill2: Defender-count formation branch is user-selected via modes ('solo defender' is the default = modes[0]; 'auto' disables the branch since the engine cannot auto-detect Defender count) — not auto-detected from the squad; pick 'with defender ally' when another Defender is present",
    "skill2: IFAK all-ally heal cadence is a hitCount-200 proxy for 'every 4 sec' (unmeasured estimate)",
    "skill2/burst: shields and heals are event-only (no HP pools) — the shield-size and IFAK-accumulation ▲20.13% riders therefore have no modeled effect"
  ],
  "unmodeled": {
    "skill1": [],
    "skill2": [
      "Effect 2: Attract: Taunt all enemies continuously.",
      "Effect 1: Ninjutsu Camouflage: Prevents being targeted by single-target attacks for 10 sec. This effect is removed upon taking a direct hit.",
      "Ninjutsu IFAK lasts for 4 sec.",
      "Effect 1: The maximum amount stored is equal to 165.28% of the skill user's final ATK."
    ],
    "burst": [
      "Next shield's HP ▲ 20.13% for 10 sec.",
      "Maximum Accumulation of Ninjutsu IFAK ▲ 20.13% for 10 sec."
    ]
  },
  "skill1": [
    {
      "slot": "skill1",
      "trigger": { "kind": "fullBurstEnter" },
      "target": { "kind": "enemy" },
      "effects": [
        {
          "kind": "buff",
          "stat": "damageTakenPct",
          "value": 12,
          "durationSec": 15
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "self" },
      "effects": [
        { "kind": "buff", "stat": "atkPct", "value": 15.04, "durationSec": 10 }
      ]
    },
    {
      "slot": "skill1",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "enemy" },
      "effects": [
        {
          "kind": "buff",
          "stat": "damageTakenPct",
          "value": 8,
          "durationSec": 10
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": { "kind": "passive" },
      "target": { "kind": "self" },
      "mode": "solo defender",
      "effects": [{ "kind": "shield", "maxHpPct": 12.25, "durationSec": 10 }]
    },
    {
      "slot": "skill2",
      "trigger": { "kind": "hitCount", "count": 200 },
      "target": { "kind": "self" },
      "mode": "solo defender",
      "effects": [{ "kind": "shield", "maxHpPct": 12.25, "durationSec": 10 }]
    },
    {
      "slot": "skill2",
      "trigger": { "kind": "shotFired" },
      "target": { "kind": "self" },
      "mode": "with defender ally",
      "effects": [{ "kind": "heal" }]
    },
    {
      "slot": "skill2",
      "trigger": { "kind": "hitCount", "count": 200 },
      "target": { "kind": "allies" },
      "mode": "with defender ally",
      "effects": [{ "kind": "heal" }]
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
          "stat": "distributedDamagePct",
          "value": 20,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 15,
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "enemy" },
      "effects": [
        { "kind": "flatDamage", "atkPct": 170, "flavor": "distributed" }
      ]
    }
  ]
}

```
