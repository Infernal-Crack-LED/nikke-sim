# S7 RECONCILING-JUDGE PACKET — dorothy-serendipity (Dorothy: Serendipity)
# Binding go/no-go. Grade the driver's IMPLEMENTATION against ground truth + two independent blind re-derivations.
# NOTE: this is the SG OVERSPEC variant (slug dorothy-serendipity), a DIFFERENT unit from the AR/Water base (slug dorothy).

## ===== (1) JUDGE CONTRACT + RETURN JSON SHAPE =====
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

## ===== (2) MECHANICS SSOT — docs/data/damage-calculation.md =====
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

## ===== (2b) MECHANICS SSOT — docs/data/game-mechanics.md =====
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

## ===== (3) GROUND TRUTH — kit prose + base stats (data/characters.json extract) =====
{
  "slug": "dorothy-serendipity",
  "name": "Dorothy: Serendipity",
  "imageUrl": "https://sg-tools-cdn.blablalink.com/ad-64/tf-12/a5157c03de127fd65974c2b0ef49f90f.png",
  "weapon": "SG",
  "burst": "III",
  "burstCooldownSec": 40,
  "class": "Attacker",
  "element": "Water",
  "manufacturer": "Pilgrim",
  "normalAttackMultiplier": 201.5,
  "coreAttackMultiplier": 200,
  "ammo": 9,
  "reloadFrames": 111,
  "chargeFrames": 0,
  "chargeMultiplier": 0,
  "hitsPerShot": 10,
  "rl3": 12,
  "burstGaugePerShot": 2,
  "treasure": false,
  "nicknames": [
    "ds",
    "sdoro"
  ],
  "skills": {
    "skill1": "■ Activates when hitting the target with 80 pellets. Affects self.\nGains Pierce for 3 round(s).\nHit Rate ▲ 98.18% for 3 round(s).\nAttack damage ▲ 72% for 3 round(s).\nPellet count is fixed at 1 for 3 round(s).\n■ Activates when hitting the target with 160 pellets. Affects self.\nExpands Pierce range by 200% for 3 round(s).",
    "skill2": "■ Activates at the start of battle. Affects self.\nPierce damage ▲ 55.08% continuously.\n■ Activates only during Full Burst. Affects self.\nATK ▲ 75.24% continuously.\nHit Rate ▲ 40.68% continuously.",
    "burst": "■ Affects self.\nAttack speed ▲ 65% for 15 sec.\nATK ▲ 88.12% for 15 sec.\nNumber of pellets ▲ 5 for 15 sec."
  },
  "skillCooldownsSec": {
    "skill1": null,
    "skill2": null,
    "burst": 40
  },
  "role": {
    "weapon": {
      "shot_id": 1023401,
      "shot_detail": {
        "id": 1023401,
        "damage": 20150,
        "max_ammo": 9,
        "shake_id": 2,
        "ShakeType": "Fire_SG",
        "fire_type": "Instant",
        "zoom_rate": 0,
        "aim_prefab": "base_aim_reference_c234",
        "input_type": "DOWN",
        "shot_count": 10,
        "ShakeWeight": 120,
        "attack_type": "Metal",
        "camera_work": "camera_work_02",
        "charge_time": 0,
        "penetration": 0,
        "reload_time": 150,
        "shot_timing": "Concurrence",
        "spot_radius": 0,
        "weapon_type": "SG",
        "is_targeting": true,
        "muzzle_count": 1,
        "rate_of_fire": 90,
        "name_localkey": "Shotgun",
        "prefer_target": "Front",
        "reload_bullet": 10000,
        "counter_enermy": "Metal_Type",
        "multi_aim_range": 0,
        "spot_last_delay": 20,
        "core_damage_rate": 20000,
        "end_rate_of_fire": 90,
        "spot_first_delay": 20,
        "center_shot_count": 0,
        "reload_start_ammo": 8,
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
        "end_accuracy_circle_scale": 250,
        "auto_accuracy_change_speed": 0,
        "rate_of_fire_change_pershot": 0,
        "start_accuracy_circle_scale": 250,
        "target_burst_energy_pershot": 4000,
        "auto_accuracy_change_pershot": 0,
        "auto_end_accuracy_circle_scale": 250,
        "auto_start_accuracy_circle_scale": 250
      },
      "bonusrange_max": 25,
      "bonusrange_min": 0
    },
    "burstMeta": {
      "burst_duration": 1000,
      "use_burst_skill": "Step3",
      "burst_apply_delay": 1,
      "change_burst_step": "StepFull"
    },
    "skillDetails": {
      "skill1_id": 2234101,
      "skill2_id": 2234201,
      "skill1_table": "StateEffect",
      "skill2_table": "StateEffect",
      "skill1_detail": {
        "id": 2234101,
        "icon": "icn_skill_statpenetration_01",
        "group_id": 22341,
        "skill_level": 1,
        "name_localkey": "Flash",
        "next_level_id": 2234102,
        "level_up_cost_id": 20102,
        "description_localkey": "■ Activates when hitting the target with {description_value_01} <word_group=10038>pellets</word_group>. Affects self.\n<color=#00AEFF>Gains Pierce for {description_value_02} round(s).\nHit Rate ▲ {description_value_03}% for {description_value_02} round(s).\nAttack damage ▲ {description_value_04}% for {description_value_02} round(s).\n<word_group=10038>Pellet</word_group> count is fixed at 1 for {description_value_02} round(s).</color>\n■ Activates when hitting the target with {description_value_05} <word_group=10038>pellets</word_group>. Affects self.\n<color=#00AEFF>Expands Pierce range by {description_value_06}% for {description_value_07} round(s).</color>",
        "description_value_list": [
          {
            "description_value": [
              "80",
              "80",
              "80",
              "80",
              "80",
              "80",
              "80",
              "80",
              "80",
              "80"
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
              "78.54",
              "80.72",
              "82.9",
              "85.09",
              "87.27",
              "89.45",
              "91.63",
              "93.81",
              "96",
              "98.18"
            ]
          },
          {
            "description_value": [
              "43.2",
              "46.4",
              "49.6",
              "52.8",
              "56",
              "59.2",
              "62.4",
              "65.6",
              "68.8",
              "72"
            ]
          },
          {
            "description_value": [
              "160",
              "160",
              "160",
              "160",
              "160",
              "160",
              "160",
              "160",
              "160",
              "160"
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
          {}
        ],
        "info_description_localkey": "Skill 1"
      },
      "skill2_detail": {
        "id": 2234201,
        "icon": "icn_skill_atkup_01",
        "group_id": 22342,
        "skill_level": 1,
        "name_localkey": "Radiant Wings",
        "next_level_id": 2234202,
        "level_up_cost_id": 20202,
        "description_localkey": "■ Activates at the start of battle. Affects self.\n<color=#00AEFF><word_group=10042>Pierce damage</word_group> ▲ {description_value_01}% continuously.</color>\n■ Activates only during Full Burst. Affects self.\n<color=#00AEFF>ATK ▲ {description_value_02}% continuously.\nHit Rate ▲ {description_value_03}% continuously.</color>",
        "description_value_list": [
          {
            "description_value": [
              "31.68",
              "34.28",
              "36.88",
              "39.48",
              "42.08",
              "44.68",
              "47.28",
              "49.88",
              "52.48",
              "55.08"
            ]
          },
          {
            "description_value": [
              "45",
              "48.36",
              "51.72",
              "55.08",
              "58.44",
              "61.8",
              "65.16",
              "68.52",
              "71.88",
              "75.24"
            ]
          },
          {
            "description_value": [
              "23.4",
              "25.32",
              "27.24",
              "29.16",
              "31.08",
              "33",
              "34.92",
              "36.84",
              "38.76",
              "40.68"
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
      "ulti_skill_id": 1234301,
      "ulti_skill_detail": {
        "id": 1234301,
        "icon": "icn_skill_c234_ult",
        "group_id": 12343,
        "shake_id": 1,
        "skill_type": "SetBuff",
        "attack_type": "Water",
        "skill_level": 1,
        "counter_type": "Metal_Type",
        "duration_type": "None",
        "name_localkey": "False Salvation",
        "next_level_id": 1234302,
        "prefer_target": "Random",
        "resource_name": "c234_ulti",
        "duration_value": 0,
        "skill_cooltime": 4000,
        "level_up_cost_id": 20302,
        "skill_value_data": [
          {
            "skill_value": 0,
            "skill_value_type": "None"
          },
          {
            "skill_value": 1,
            "skill_value_type": "Integer"
          },
          {
            "skill_value": 1,
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
        "description_localkey": "■ Affects self.\n<color=#00AEFF>Attack speed ▲ {description_value_01}% for {description_value_02} sec.\nATK ▲ {description_value_03}% for {description_value_04} sec.\nNumber of <word_group=10038>pellets</word_group> ▲ {description_value_05} for {description_value_06} sec.</color>",
        "description_value_list": [
          {
            "description_value": [
              "36.72",
              "39.86",
              "43",
              "46.14",
              "49.29",
              "52.43",
              "55.57",
              "58.71",
              "61.86",
              "65"
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
              "51.08",
              "55.19",
              "59.31",
              "63.42",
              "67.54",
              "71.65",
              "75.77",
              "79.89",
              "84",
              "88.12"
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
              "3",
              "3",
              "3",
              "4",
              "4",
              "4",
              "5",
              "5",
              "5",
              "5"
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
          {}
        ],
        "prefer_target_condition": "None",
        "info_description_localkey": "Burst Skill",
        "after_use_function_id_list": [
          123430101,
          123430102,
          123430103,
          123430104
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
      "grow_grade": 423402,
      "grade_core_id": 1,
      "stat_enhance_id": 5104,
      "stat_enhance_detail": {
        "id": 5104,
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
      "piece_id": 5100234,
      "piece_detail": {
        "id": 5100234,
        "class": "Attacker",
        "order": 23400,
        "use_id": 0,
        "use_type": "None",
        "item_rare": "SSR",
        "item_type": "Piece",
        "stack_max": 9999999,
        "use_value": 0,
        "corporation": "PILGRIM",
        "resource_id": 234,
        "item_sub_type": "CharacterPiece",
        "name_localkey": "Dorothy: Serendipity's Spare Body",
        "use_limit_count": false,
        "inventory_filter": [
          "etc"
        ],
        "corporation_sub_type": "OVERSPEC",
        "description_localkey": "Can be used for Nikkes' Limit Breaks.\nIf a Nikke's Limit Break has reached the max level, any additional Spare Bodies for that Nikke will be converted to Body Labels."
      }
    },
    "meta": {
      "id": 423401,
      "class": "Attacker",
      "order": 10155,
      "name_code": 5145,
      "corporation": "PILGRIM",
      "resource_id": 234,
      "name_localkey": "Dorothy: Serendipity",
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
    "resourceId": 234
  }
}
## ===== (4) S2b PRE-OP REVIEW (claude-fable-5, independent test-faithfulness spec) =====
{
  "slug": "dorothy-serendipity",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "hitting the target with 80 pellets",
      "disposition": "FIX",
      "scope": "Trigger accrual line: counts landed PELLETS on the target, not trigger pulls and not rounds. SG hitsPerShot=10, so 80 pellets ≈ 8 pulls at 100% landing, more at real landing fraction.",
      "durationSemantics": "Repeating cumulative counter (fires every 80 landed pellets); counter economics change during the 1-pellet window (accrual ~1/shot, near-stall).",
      "triggerIdentity": "Pellet-hit counter. The stock hitCount trigger counts ROUNDS (1/pull for SG) — a raw hitCount:80 is wrong by ~10x. Needs the landed-pellet accumulator (triggerLandedPellets path), scaled by the per-pellet landing fraction.",
      "targetSet": "self",
      "nearestWrongModel": "hitCount:{count:80} counting trigger pulls — first proc after ~9 magazines (~80 shots) instead of within roughly the first magazine (9 ammo × 10 pellets = 90 pellet attempts).",
      "distinguishingAssertion": "Count shot events for dorothy-serendipity before the first skill1 buffApply (stat 'attackDamagePct' value 72): faithful ≤ ~12 shots (80/(10×landing fraction)); nearest-wrong = exactly 80 shots. Also assert the proc RECURS (second buffApply after the next ~80 landed pellets, delayed by the 3 one-pellet shots).",
      "inertness": "Must not fire off pellets that MISS (landing fraction < 1 slows accrual); must not fire per-pull.",
      "evidenceTier": "CALIBRATED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Gains Pierce for 3 round(s)",
      "disposition": "GAP",
      "scope": "Pierce tag on her own attacks only, only inside the 3-round window.",
      "durationSemantics": "3 ROUNDS (expires right after her 3rd shell post-proc; spans a reload if one intervenes; window wall-clock shrinks under the burst's +65% attack speed). Never durationSec.",
      "triggerIdentity": "Rides the 80-pellet proc block.",
      "targetSet": "self",
      "nearestWrongModel": "Top-level hasPierce:true (whole-fight pierce tag) or gainPierce with durationSec:3. Either makes skill2's Pierce Damage ▲55.08% live on every shot of the fight — a permanent ~55% Damage-Up over-credit on all non-window shots.",
      "distinguishingAssertion": "gainPierce effect schema carries only durationSec — a rounds-scoped pierce is a schema gap; the encoding must end pierce exactly with the 3rd post-proc shot. Assert: damage events for shots OUTSIDE the 3-round windows do not carry the pierceDamagePct 55.08 contribution in their Damage-Up bucket; the 3 window shots do. Zeroing skill2's 55.08 via withPatchedOverride must change ONLY window-shot damage.",
      "inertness": "Non-window shots and the override's static hasPierce flag (should be absent/false).",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Hit Rate ▲ 98.18% for 3 round(s)",
      "disposition": "FAITHFUL",
      "scope": "Self hit-rate lift; in-engine effect is the hitRatePct→core/landing path (hrCoreMult). During the same window pellet count is 1, so this is what makes the 3 consolidated slugs land/core reliably.",
      "durationSemantics": "durationShots:3 — never durationSec:3.",
      "triggerIdentity": "Same 80-pellet proc block.",
      "targetSet": "self",
      "nearestWrongModel": "durationSec:3 (window collapses to ~3s of wall clock and dies mid-reload) — or misfiling 98.18 as critRatePct.",
      "distinguishingAssertion": "buffApply {stat:'hitRatePct', value:98.18} must carry durationShots===3 and no time-based expiresFrame; the buff must still be live on the 3rd post-proc shot even when a reload (111 frames) intervenes between proc and 3rd shot.",
      "inertness": "Crit rate must not move; nothing team-wide.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Attack damage ▲ 72% for 3 round(s)",
      "disposition": "FAITHFUL",
      "scope": "Damage-Up bucket (attackDamagePct), self, window-scoped.",
      "durationSemantics": "durationShots:3.",
      "triggerIdentity": "Same 80-pellet proc block.",
      "targetSet": "self",
      "nearestWrongModel": "atkPct:72 (ATK bucket — compounds differently against the FB +75.24 and burst +88.12 ATK buffs, over-crediting) or durationSec:3.",
      "distinguishingAssertion": "buffApply {stat:'attackDamagePct', value:72, durationShots:3}; damage events for the 3 window shots carry it in the Damage-Up bucket additively alongside pierceDamagePct 55.08 (not multiplied into ATK).",
      "inertness": "The 4th shot after a proc must not carry it.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Pellet count is fixed at 1 for 3 round(s)",
      "disposition": "GAP",
      "scope": "SG pellet-count CLAMP on her own next 3 shells — the consolidation that defines the unit.",
      "durationSemantics": "durationShots:3.",
      "triggerIdentity": "Same 80-pellet proc block.",
      "targetSet": "self",
      "nearestWrongModel": "pelletCountFlat:-9 (a flat ADD to reach 1). Breaks the moment the burst's pelletCountFlat:+5 is co-active: 10−9+5 = 6 pellets instead of the literal 'fixed at 1'. Second-nearest: skipping the line as a self-nerf no-op.",
      "distinguishingAssertion": "Schema has only pelletCountFlat (an add), no clamp primitive — same family as the reload-FIXED clamp gap. Assert: in a run where the S1 proc lands INSIDE the burst's 15s window, effectivePellets===1 for the 3 window shells (not 6, not 15). Separately ⚑: whether the single pellet carries the FULL 201.5% shot multiplier (merge) or 1/10 of it (split) is kit-silent and popup-read-only (ALWAYS-⚑ #5); split would make the skill a self-nerf, so merge is the plausible prior — but it must be measured, not shipped silently.",
      "inertness": "Non-window shells keep base 10 (15 under burst); gauge/energy per-trigger economics must not be pumped by the clamp.",
      "evidenceTier": "CALIBRATED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Expands Pierce range by 200% for 3 round(s)",
      "disposition": "UNMODELED",
      "scope": "Geometric pierce-range widening (more targets behind/around the pierce line).",
      "durationSemantics": "3 rounds, moot.",
      "triggerIdentity": "Separate 160-pellet counter block. ⚑ ambiguity: one shared accumulator (this fires on every second 80-proc) vs an independent every-160 counter — coincident firing either way, but the driver should state which.",
      "targetSet": "self",
      "nearestWrongModel": "pierceDamagePct:200 ('range' misread as damage — a massive over-credit), or any Damage-Up encoding.",
      "distinguishingAssertion": "Against the single partless scope-lock boss there is nothing extra to pierce: zeroing/removing this line via withPatchedOverride must change totals(res)['dorothy-serendipity'] by exactly 0.",
      "inertness": "Everything — this line must move zero damage; it belongs verbatim in unmodeled.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "Pierce damage ▲ 55.08% continuously",
      "disposition": "FAITHFUL",
      "scope": "pierceDamagePct — Damage-Up eligibility ONLY on pierce-tagged hits, i.e. only during the S1 3-round windows (her base SG shots carry no pierce tag).",
      "durationSemantics": "Permanent passive from battle start ('continuously' + 'start of battle').",
      "triggerIdentity": "passive, applied at t=0.",
      "targetSet": "self",
      "nearestWrongModel": "attackDamagePct:55.08 always-on (or hasPierce:true making the pierce bucket permanently live) — a fight-long ~55% Damage-Up over-credit on the ~80%+ of shots outside pierce windows.",
      "distinguishingAssertion": "buffApply {stat:'pierceDamagePct', value:55.08} at frame 0; zeroing it via withPatchedOverride changes damage ONLY on events within the S1 pierce windows and leaves every non-window shot byte-identical.",
      "inertness": "Non-pierce-window shots.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "during Full Burst … ATK ▲ 75.24%",
      "disposition": "FAITHFUL",
      "scope": "Self ATK, generic (all her damage while in FB).",
      "durationSemantics": "'Continuously' WITHIN the FB state only — active exactly for each Full-Burst window, off outside; not permanent-after-first-FB.",
      "triggerIdentity": "Full-Burst STATE ('Activates only during Full Burst'), i.e. fullBurstEnter-keyed with FB-window duration (or fbGate:'inFb') — fires on ANY team FB, including rotations where the co-B3 (helm in controlComp) casts, NOT burstCast-gated to her own rotations.",
      "targetSet": "self",
      "nearestWrongModel": "Two-sided: (a) permanent passive from t=0 or from first FB ('continuously' misread) — over-credits all out-of-FB uptime; (b) ownBurstGate/burstCast keying — under-credits every helm-cast FB in a two-B3 comp.",
      "distinguishingAssertion": "In controlComp(dorothy-serendipity, helm=true): count buffApply {stat:'atkPct', value~=75.24-scaled} events === count of fullBurstStart events (every FB, both casters' rotations); assert damage events with inFullBurst:false never reflect it.",
      "inertness": "Out-of-FB shots; teammates.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "during Full Burst … Hit Rate ▲ 40.68%",
      "disposition": "FAITHFUL",
      "scope": "Self hitRatePct (core/landing lift path), FB-state-scoped. Stacks with S1's 98.18 when a pierce window overlaps FB.",
      "durationSemantics": "FB-window-scoped, same as the ATK line.",
      "triggerIdentity": "Same FB-state block (any team FB).",
      "targetSet": "self",
      "nearestWrongModel": "Permanent passive, or critRatePct misfiling; secondarily burstCast-only keying.",
      "distinguishingAssertion": "buffApply {stat:'hitRatePct', value:40.68} on every fullBurstStart; no hitRatePct 40.68 active on shots outside FB windows. HR→core magnitude conversion rides the ⚑ hrCoreMult path (measured-only, ALWAYS-⚑ #7) — assert the buff plumbing, not a hand-derived core rate.",
      "inertness": "Out-of-FB core rate.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Attack speed ▲ 65% for 15 sec",
      "disposition": "FAITHFUL",
      "scope": "Self attackSpeedPct — a shot-economy (weapon-state) line, NOT skippable as non-damage: it raises shells fired, pellet accrual toward the 80-counter, and window throughput.",
      "durationSemantics": "durationSec:15 — genuinely seconds, and 5s LONGER than the ~10s FB window: it must survive fullBurstEnd.",
      "triggerIdentity": "burstCast (her OWN burst block; no activation clause = on cast) — never fullBurstEnter.",
      "targetSet": "self",
      "nearestWrongModel": "fullBurstEnter keying — with helm as co-B3 it would fire on helm's FBs too, roughly doubling uptime; second: truncating duration to the 10s FB window.",
      "distinguishingAssertion": "In controlComp with helm co-B3: buffApply count for attackSpeedPct 65 === dorothy's own burstCast count (strictly fewer than fullBurstStart count); expiresFrame ≈ castFrame + 15×60; her shot cadence in the (fullBurstEnd, fullBurstEnd+5s] gap is still elevated.",
      "inertness": "Helm-cast rotations without a dorothy cast must apply nothing.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "ATK ▲ 88.12% for 15 sec",
      "disposition": "FAITHFUL",
      "scope": "Self atkPct, generic; additive with skill2's FB 75.24 in the ATK bucket while both live.",
      "durationSemantics": "durationSec:15, outlives the FB window by ~5s.",
      "triggerIdentity": "burstCast, self.",
      "targetSet": "self",
      "nearestWrongModel": "fullBurstEnter keying (over-fires on helm rotations); or 10s duration.",
      "distinguishingAssertion": "buffApply {stat:'atkPct'} for 88.12 only on her own burstCast events; a damage event at FB-end+3s still carries the 88.12 but NOT the FB-scoped 75.24 — that ordering (burst buff outlives, skill2 FB buff drops at fullBurstEnd) separates the two ATK sources cleanly.",
      "inertness": "The 75.24 FB buff must not be the thing persisting past FB end.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Number of pellets ▲ 5 for 15 sec",
      "disposition": "FAITHFUL",
      "scope": "pelletCountFlat:+5 (base 10 → 15 effective pellets/shell), SG-only path: each extra pellet = 1/base of shot damage, passes the same landing fraction / falloff / shot-level core; also accelerates the 80-pellet counter (~1.5×).",
      "durationSemantics": "durationSec:15.",
      "triggerIdentity": "burstCast, self.",
      "targetSet": "self",
      "nearestWrongModel": "normalAttackPct:+50 proxy (loses the queryable pellet count and the interaction with the S1 fixed-at-1 clamp), or treating +5 as five full-damage extra hits (5× over-credit per pellet), or fullBurstEnter keying.",
      "distinguishingAssertion": "effectivePellets===15 on shells inside her own burst's 15s window (and ===1 when an S1 window overlaps — the clamp wins per the literal 'fixed at 1'); per-shell damage scales ×1.5 through the landing path, not ×6. Gauge must not be pumped by the extra pellets (energy is per-trigger).",
      "inertness": "Non-SG semantics; burst gauge; helm-cast rotations.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:80-pellet trigger cadence",
    "skill1:Gains Pierce (3 rounds)",
    "skill1:Hit Rate ▲98.18 (3 rounds)",
    "skill1:Attack damage ▲72 (3 rounds)",
    "skill1:Pellet count fixed at 1 (3 rounds)",
    "skill2:Pierce damage ▲55.08 passive",
    "skill2:FB ATK ▲75.24",
    "skill2:FB Hit Rate ▲40.68",
    "burst:Attack speed ▲65 15s",
    "burst:ATK ▲88.12 15s",
    "burst:pellets ▲5 15s"
  ],
  "unmodeledVerbatim": {
    "skill1": [
      "Expands Pierce range by 200% for 3 round(s)."
    ],
    "skill2": [],
    "burst": []
  },
  "notes": "Where I expect shared-prior misreads: (1) THE unit-defining trap is the 80-pellet counter — the stock hitCount trigger counts ROUNDS (1/pull for SG), so hitCount:80 is ~10x too slow; accrual must be landed-pellet-based (triggerLandedPellets), scaled by the ⚑ per-pellet landing fraction, and must near-stall during the 1-pellet windows (1 landed pellet/shell), which sets the whole proc cadence: roughly one cycle per ~magazine (9 shells × 10 pellets = 90 attempts) + 3 big shells + 111-frame reload. Whether the 3 big-shell pellets themselves feed the next-80/160 counters, and whether 80/160 share one accumulator, are kit-silent — the driver must state a convention. (2) Merge-vs-split on the fixed-at-1 slug (full 201.5% in one pellet vs 1/10) is ALWAYS-⚑ #5, popup-read-only; split renders S1 a self-nerf so merge is the sane prior, but it must be flagged, not silently shipped. (3) 'Fixed at 1' is a CLAMP with no schema primitive — a pelletCountFlat:-9 add silently breaks to 6 pellets under the burst's +5; test the overlap explicitly. (4) All four skill1 'for 3 round(s)' lines are durationShots:3, never seconds — and gainPierce only supports durationSec, so the pierce window is a schema GAP the driver must close or approximate with an argued bound. (5) Trigger-identity split with the helm co-B3 fixture: skill2's block is FB-STATE (fires on EVERY team FB, helm's included) while all three burst lines are burstCast (her rotations only, persisting 5s past FB end) — flipping either keying is the classic over/under-credit and is directly countable from fullBurstStart vs burstCast events. (6) Pierce-tag hygiene: no whole-fight hasPierce; skill2's 55.08% must bind exclusively inside S1 windows, which also means the S1 proc cadence directly gates a second damage line — errors compound.",
  "model": "claude-fable-5"
}

## ===== (5) S5 BLIND POST-OP TEST (claude-opus-5, written from kit prose alone) =====
### S5 blind test run UNMODIFIED against the driver's SHIPPED override: 10 passed / 7 failed / 3 skipped (20 total).
### The 7 RED assertions (all in the S1 '80 pellets' group + one burst inertness claim):
###   - 'grants Attack Damage +72% repeatedly, as a self buff' (expects buffApply attackDamagePct=72; driver emits NONE — folded into the consolidation bullet's extraDmgUpPct)
###   - 'the window is 3 ROUNDS not 3 seconds' (asserts durationShots=3 on that buff; no such buff exists in the driver)
###   - 'the trigger counts landed PELLETS (80) not rounds (8)' (patches a hitCount:80 trigger; the driver has NO hitCount block — it uses consolidation.triggerLandedPellets)
###   - 'Hit Rate +98.18% rides the same 3-round window' (expects buffApply hitRatePct=98.18; driver models the EFFECT via the consolidation config's all-bands firing + coreRate 0.9, stat itself unmodeled)
###   - 'is self-scoped: zeroing the +72% ...' (setBuff attackDamagePct 72->0 matched 0 effects; driver carries 72 in consolidation.attackDamagePct, not a buff effect)
###   - 'Pierce is granted BY the 80-pellet trigger ...' (expects a gainPierce block; driver tags pierce per-shot on the consolidation bullet via pierceActive, no gainPierce block)
###   - burst '+5 pellets adds HER damage without pumping the team burst gauge' (asserts teammates BYTE-identical when pelletCountFlat removed; they differ ~0.05% via consolidation->gauge->rotation coupling — gauge IS base-capped per the engine, but the consolidation cadence shift moves the team FB rotation slightly)
### ROOT CAUSE OF THE REDs: the driver models S1 with the unit-specific 'consolidation' primitive (ConsolidationConfig). That primitive's schema was REDACTED from the S5/S6 blind packets (it names the target), so the blind model could not see it and re-derived S1 with generic primitives (hitCount trigger + buff effects + gainPierce). The divergence is structural/encoding, not a kit-faithfulness disagreement: both encode the SAME kit lines (80-pellet trigger, 3-round window, +72% attack damage, pierce, pellet-fixed-at-1 full-shot carry). Classify per Method A/B accordingly.

/**
 * dorothy-serendipity — BLIND per-unit kit spec test (S5 post-op; written from kit prose alone).
 *
 * KIT (SG / Water / Attacker / Burst III, cd 40s, ammo 9, hitsPerShot 10, reload 111f):
 *   S1a  activates on hitting with 80 pellets  -> self: gain Pierce (3 rounds),
 *        Hit Rate +98.18% (3 rounds), Attack damage +72% (3 rounds),
 *        pellet count FIXED at 1 (3 rounds)
 *   S1b  activates on hitting with 160 pellets -> self: Pierce range +200% (3 rounds)
 *   S2a  start of battle                       -> self: Pierce damage +55.08% continuously
 *   S2b  only during Full Burst                -> self: ATK +75.24%, Hit Rate +40.68%
 *   B    self                                  -> Attack speed +65%, ATK +88.12%,
 *                                                 pellets +5, each for 15 sec
 *
 * FIXTURE: controlComp('dorothy-serendipity', true) = liter(B1) / crown(B2) / dorothy(B3) / helm(B3).
 *   A lone Burst III unit casts ZERO bursts, so B1+B2 are mandatory for the burst lines to fire at
 *   all. The second B3 (helm) is kept deliberately: it makes the burst-CAST vs full-burst-ENTER
 *   distinction non-vacuous, because she does not necessarily burst on every team Full Burst.
 *   Deterministic (no seed). 8 hoisted runs.
 *
 * DISCRIMINATION METHOD: every counterfactual is built with withPatchedOverride (committed JSON is
 *   untouched) and every patch helper RETURNS the number of effects it touched; each test asserts
 *   that count >= 1, so a patch that matched nothing fails LOUDLY instead of quietly testing nothing.
 *   That same assertion is what pins the magnitude/stat-key the kit line demands.
 *
 * SHAPE NOTE: the harness packet documents two conflicting OverrideFile shapes for a slot
 *   (slot -> Block[] vs slot -> { blocks: Block[] }). blocksOf() accepts BOTH, so the
 *   counterfactuals cannot silently degrade into no-ops on either shape.
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

const SLUG = 'dorothy-serendipity';
const SLOTS = ['skill1', 'skill2', 'burst'] as const;

type Ev = SimEvent & Record<string, any>;

const near = (a: unknown, b: number) => typeof a === 'number' && Math.abs(a - b) < 1e-6;

function blocksOf(ov: any, slot: (typeof SLOTS)[number]): any[] {
  const s = ov?.[slot];
  if (!s) return [];
  if (Array.isArray(s)) return s;
  return Array.isArray(s.blocks) ? s.blocks : [];
}

function allBlocks(ov: any): any[] {
  return SLOTS.flatMap((s) => blocksOf(ov, s));
}

function allEffects(ov: any): any[] {
  const out: any[] = [];
  const walk = (es: any[]) => {
    for (const e of es ?? []) {
      out.push(e);
      if (Array.isArray(e?.steps)) walk(e.steps);
    }
  };
  for (const b of allBlocks(ov)) walk(b?.effects);
  return out;
}

/** zero (or re-value) every buff effect carrying `stat` at magnitude `from`; returns how many matched. */
function setBuff(ov: any, stat: string, from: number, to: number): number {
  let n = 0;
  for (const e of allEffects(ov)) {
    if (e?.kind === 'buff' && e.stat === stat && near(e.value, from)) {
      e.value = to;
      n += 1;
    }
  }
  return n;
}

/** the nearest-wrong duration model: re-read 'for N round(s)' as N wall-clock seconds. */
function roundsToSeconds(ov: any, rounds: number): number {
  let n = 0;
  for (const e of allEffects(ov)) {
    if (e?.kind === 'buff' && e.durationShots === rounds) {
      delete e.durationShots;
      e.durationSec = rounds;
      n += 1;
    }
  }
  return n;
}

/** the nearest-wrong trigger model: read '80 pellets' as 80/hitsPerShot = 8 ROUNDS. */
function retargetHitCount(ov: any, from: number, to: number): number {
  let n = 0;
  for (const b of allBlocks(ov)) {
    if (b?.trigger?.kind === 'hitCount' && b.trigger.count === from) {
      b.trigger.count = to;
      n += 1;
    }
  }
  return n;
}

function run(baseOpts: any, overrides?: Record<string, any>) {
  const evs: Ev[] = [];
  const opts: any = { ...baseOpts };
  if (overrides) opts.overrides = { ...(baseOpts.overrides ?? {}), ...overrides };
  opts.cfg = {
    ...(opts.cfg ?? {}),
    onEvent: (e: Ev) => {
      evs.push(e);
    },
  };
  const res = runComp(opts);
  return { res, evs, total: totals(res)[SLUG] };
}

/** indices of self-targeted buffApply events for (stat, value) — index order == sim order. */
const idxs = (evs: Ev[], stat: string, value: number): number[] =>
  evs
    .map((e, i) => ({ e, i }))
    .filter(
      ({ e }) =>
        e.kind === 'buffApply' &&
        e.stat === stat &&
        near(e.value, value) &&
        (e.targetSlug === undefined || e.targetSlug === SLUG),
    )
    .map(({ i }) => i);

const applies = (evs: Ev[], stat: string, value: number): Ev[] =>
  idxs(evs, stat, value).map((i) => evs[i]);

const lastIdxBefore = (evs: Ev[], idx: number, kind: string): number => {
  for (let i = idx - 1; i >= 0; i -= 1) if (evs[i].kind === kind) return i;
  return -1;
};

const others = (t: Record<string, number>) =>
  Object.fromEntries(Object.entries(t).filter(([k]) => k !== SLUG));

function shotCount(r: any, evs: Ev[]): number {
  const row: any = unitOf(r, SLUG);
  if (typeof row?.shots === 'number') return row.shots;
  return evs.filter(
    (e) => e.kind === 'shot' && (e.slug ?? e.unitSlug ?? e.targetSlug) === SLUG,
  ).length;
}

/* ------------------------------------------------------------------ hoisted runs (8 x 180s) */

const BASE = controlComp(SLUG, true);

// structural snapshot of the committed override (deep clone; disk untouched)
let committed: any = null;
withPatchedOverride(SLUG, (ov: any) => {
  committed = ov;
});

const base = run(BASE);

let nAtkDmg = 0;
const ovNoAtkDmg = withPatchedOverride(SLUG, (ov: any) => {
  nAtkDmg = setBuff(ov, 'attackDamagePct', 72, 0);
});
const noAtkDmg = run(BASE, { [SLUG]: ovNoAtkDmg });

let nRounds = 0;
const ovSeconds = withPatchedOverride(SLUG, (ov: any) => {
  nRounds = roundsToSeconds(ov, 3);
});
const asSeconds = run(BASE, { [SLUG]: ovSeconds });

let nTrigger = 0;
const ovRoundsTrigger = withPatchedOverride(SLUG, (ov: any) => {
  nTrigger = retargetHitCount(ov, 80, 8);
});
const roundsTrigger = run(BASE, { [SLUG]: ovRoundsTrigger });

let nPellets = 0;
const ovNoPellets = withPatchedOverride(SLUG, (ov: any) => {
  nPellets = setBuff(ov, 'pelletCountFlat', 5, 0);
});
const noPellets = run(BASE, { [SLUG]: ovNoPellets });

let nSpeed = 0;
const ovNoSpeed = withPatchedOverride(SLUG, (ov: any) => {
  nSpeed = setBuff(ov, 'attackSpeedPct', 65, 0);
});
const noSpeed = run(BASE, { [SLUG]: ovNoSpeed });

let nPierceDmg = 0;
const ovNoPierceDmg = withPatchedOverride(SLUG, (ov: any) => {
  nPierceDmg = setBuff(ov, 'pierceDamagePct', 55.08, 0);
});
const noPierceDmg = run(BASE, { [SLUG]: ovNoPierceDmg });

let nHitRate = 0;
const ovNoHitRate = withPatchedOverride(SLUG, (ov: any) => {
  nHitRate = setBuff(ov, 'hitRatePct', 98.18, 0);
});
const noHitRate = run(BASE, { [SLUG]: ovNoHitRate });

const fbStartIdxs = base.evs
  .map((e, i) => ({ e, i }))
  .filter(({ e }) => e.kind === 'fullBurstStart')
  .map(({ i }) => i);

/* ------------------------------------------------------------------------------- assertions */

describe('dorothy-serendipity — fixture', () => {
  it('the carry fires and the comp actually chains Full Bursts (a lone B3 would make ZERO)', () => {
    expect(base.total).toBeGreaterThan(0);
    expect(fbStartIdxs.length).toBeGreaterThanOrEqual(2);
    expect(base.evs.some((e) => e.kind === 'burstCast')).toBe(true);
  });
});

describe('S1a — activates on hitting with 80 pellets (self)', () => {
  it('grants Attack Damage +72% repeatedly, as a self buff', () => {
    // RED if the line is missing, mis-magnitude, or mis-keyed to a generic ATK stat.
    const a = applies(base.evs, 'attackDamagePct', 72);
    expect(a.length).toBeGreaterThanOrEqual(2);
    for (const e of a) expect(e.targetSlug ?? SLUG).toBe(SLUG);
  });

  it('the window is 3 ROUNDS, not 3 seconds', () => {
    // durationShots is the round-count primitive; a durationSec:3 model is the nearest wrong one.
    // Her magazine is 9 with a 111f reload, so a 3-round window and a 3-second window cannot
    // coincide — the counterfactual must MOVE total damage.
    for (const e of applies(base.evs, 'attackDamagePct', 72)) expect(e.durationShots).toBe(3);
    expect(nRounds).toBeGreaterThanOrEqual(1);
    expect(asSeconds.total).not.toBe(base.total);
  });

  it('the trigger counts landed PELLETS (80), not rounds (8)', () => {
    // hitsPerShot is 10, so a rounds-reading of the same line would be count:8 and would fire far
    // more often. GREEN only if the committed model is the coarser, pellet-counting one.
    expect(nTrigger).toBeGreaterThanOrEqual(1);
    const baseFires = applies(base.evs, 'attackDamagePct', 72).length;
    const roundsFires = applies(roundsTrigger.evs, 'attackDamagePct', 72).length;
    expect(roundsFires).toBeGreaterThan(baseFires);
  });

  it('Hit Rate +98.18% rides the same 3-round window and lifts her own damage', () => {
    const a = applies(base.evs, 'hitRatePct', 98.18);
    expect(a.length).toBeGreaterThanOrEqual(1);
    for (const e of a) expect(e.durationShots).toBe(3);
    expect(nHitRate).toBeGreaterThanOrEqual(1);
    // hitRatePct is the core-hit lift (live by default); zeroing it must cost her damage.
    expect(noHitRate.total).toBeLessThan(base.total);
  });

  it('is self-scoped: zeroing the +72% costs HER damage and moves no teammate at all', () => {
    // Inertness. attackDamagePct is a pure damage multiplier — it cannot touch shot count or
    // burst-gauge generation, so every other unit must come back byte-identical.
    expect(nAtkDmg).toBeGreaterThanOrEqual(1);
    expect(noAtkDmg.total).toBeLessThan(base.total);
    expect(others(totals(noAtkDmg.res))).toEqual(others(totals(base.res)));
  });

  it('Pierce is granted BY the 80-pellet trigger, not tagged for the whole fight', () => {
    // The kit grants Pierce only after 80 pellets land, for 3 rounds. A static hasPierce:true
    // would make S2a Pierce Damage +55.08% live from t=0 for the entire 180s — a large
    // over-credit that a boolean cannot step-gate (that is exactly what gainPierce exists for).
    expect(committed?.hasPierce === true).toBe(false);
    const pierceBlocks = allBlocks(committed).filter((b: any) =>
      (b?.effects ?? []).some((e: any) => e?.kind === 'gainPierce'),
    );
    expect(pierceBlocks.length).toBeGreaterThanOrEqual(1);
    for (const b of pierceBlocks) expect(b.trigger?.kind).toBe('hitCount');
  });

  it.skip('pellet count is FIXED at 1 for 3 rounds — no clamp primitive, and the damage payload is kit-silent', () => {
    // GAP (two-fold):
    //  (1) the schema has pelletCountFlat, a flat ADD; there is no stat-CLAMP primitive, so
    //      'fixed at 1' can only be approximated as -9 from hitsPerShot 10 — and it then composes
    //      wrongly with the burst's +5 (10-9+5 = 6 pellets, not 1).
    //  (2) MEASUREMENT-GATED: pelletCountFlat is documented as 'each pellet = 1/base of the shot',
    //      so 1 pellet would deal ~1/10 of a shot. Whether the consolidated single pellet instead
    //      carries the FULL shot payload (with Hit Rate +98.18% and Attack Damage +72% on top) is
    //      not stated anywhere in the kit text. Flag with a recipe: read the popup value of the
    //      3 post-threshold shots against a pre-threshold shot on footage. Do NOT guess a number.
  });

  it.skip('gain Pierce for 3 ROUND(s) — gainPierce has no durationShots', () => {
    // GAP: gainPierce takes only durationSec (absent = continuous). A round-count window is
    // inexpressible, so any committed durationSec is a per-unit estimate (flag). Recipe: measure
    // her pulls/sec, then window = 3 pulls (+ one reload, ~1.85s, if the 3 rounds span one).
  });
});

describe('S1b — activates on hitting with 160 pellets (self)', () => {
  it.skip('expands Pierce range by 200% for 3 rounds — no primitive', () => {
    // GAP: pierce DEPTH/range (how many targets or how far a pierce shot carries) has no schema
    // representation, and the v1 boss is a single target anyway. Unobservable payload here.
  });

  it('the unmodelable S1 lines are recorded in `unmodeled`, not silently dropped', () => {
    const text = SLOTS.flatMap((s) => (committed?.unmodeled?.[s] ?? []) as string[]).join(' | ');
    expect(text.length).toBeGreaterThan(0);
    expect(/range/i.test(text)).toBe(true);
  });
});

describe('S2a — start of battle: Pierce damage +55.08% continuously (self)', () => {
  it('applies from battle start, before any Full Burst', () => {
    const i = idxs(base.evs, 'pierceDamagePct', 55.08);
    expect(i.length).toBeGreaterThanOrEqual(1);
    expect(i[0]).toBeLessThan(fbStartIdxs[0]);
  });

  it('zeroing it never RAISES her damage', () => {
    // Monotonic, deliberately one-sided: pierceDamagePct only feeds the Damage-Up bucket while her
    // attacks are Pierce-tagged (the 3-round S1a window), and the schema notes it may still be
    // inert in v1. Equality here is legitimate; an increase would mean the sign is inverted.
    expect(nPierceDmg).toBeGreaterThanOrEqual(1);
    expect(noPierceDmg.total).toBeLessThanOrEqual(base.total);
  });
});

describe('S2b — only during Full Burst (self)', () => {
  it('ATK +75.24% applies once per team Full Burst, and never before the first one', () => {
    // Trigger identity: `during Full Burst` = full-burst-ENTER (any team FB), not burst-cast and
    // not a passive. A passive model would emit once at frame 0 -> both assertions RED.
    const i = idxs(base.evs, 'atkPct', 75.24);
    expect(i.length).toBe(fbStartIdxs.length);
    expect(i[0]).toBeGreaterThan(fbStartIdxs[0]);
  });

  it('Hit Rate +40.68% shares that same Full-Burst trigger', () => {
    const i = idxs(base.evs, 'hitRatePct', 40.68);
    expect(i.length).toBe(fbStartIdxs.length);
    expect(i[0]).toBeGreaterThan(fbStartIdxs[0]);
  });

  it('neither buff outlives the 10s Full Burst window', () => {
    // `continuously` here is scoped to the FB window by the activation clause; a 15s duration
    // (copied from the burst lines) would leak the buff past Full Burst.
    const fb = allEffects(committed).filter(
      (e: any) =>
        e?.kind === 'buff' &&
        ((e.stat === 'atkPct' && near(e.value, 75.24)) ||
          (e.stat === 'hitRatePct' && near(e.value, 40.68))),
    );
    expect(fb.length).toBe(2);
    for (const e of fb) {
      expect(typeof e.durationSec).toBe('number');
      expect(e.durationSec).toBeLessThanOrEqual(10);
    }
  });
});

describe('burst — self, 15 sec', () => {
  it('all three lines key to HER burst CAST, not to team Full-Burst entry', () => {
    // Discriminator without needing frames: at each application, the most recent burst-ish event
    // before it must be a burstCast, not a fullBurstStart. A fullBurstEnter mis-key inverts that
    // ordering (and over-credits on rotations where the OTHER B3 completes the chain).
    const groups = [
      idxs(base.evs, 'atkPct', 88.12),
      idxs(base.evs, 'pelletCountFlat', 5),
      idxs(base.evs, 'attackSpeedPct', 65),
    ];
    for (const g of groups) {
      expect(g.length).toBeGreaterThanOrEqual(1);
      for (const i of g) {
        expect(lastIdxBefore(base.evs, i, 'burstCast')).toBeGreaterThan(
          lastIdxBefore(base.evs, i, 'fullBurstStart'),
        );
      }
    }
    expect(groups[1].length).toBe(groups[0].length);
    expect(groups[2].length).toBe(groups[0].length);
  });

  it('each of the three buffs lasts 15 sec (not clamped to the 10s FB window)', () => {
    const want: Array<[string, number]> = [
      ['atkPct', 88.12],
      ['pelletCountFlat', 5],
      ['attackSpeedPct', 65],
    ];
    for (const [stat, value] of want) {
      const hits = allEffects(committed).filter(
        (e: any) => e?.kind === 'buff' && e.stat === stat && near(e.value, value),
      );
      expect(hits.length).toBeGreaterThanOrEqual(1);
      for (const e of hits) expect(e.durationSec).toBe(15);
    }
  });

  it('+5 pellets adds HER damage without pumping the team burst gauge', () => {
    // pelletCountFlat is SG-only and documented as gauge-neutral (energy is per-trigger), so
    // teammates must be byte-identical; a normalAttackPct proxy would be a different mechanic.
    expect(nPellets).toBeGreaterThanOrEqual(1);
    expect(noPellets.total).toBeLessThan(base.total);
    expect(others(totals(noPellets.res))).toEqual(others(totals(base.res)));
  });

  it('+65% attack speed is DAMAGE: it adds shots fired', () => {
    // A weapon-state modifier gates shot count; dropping it as `defensive` is the classic miss.
    // No teammate-inertness assertion here on purpose: more shots = more gauge = shifted rotation.
    expect(nSpeed).toBeGreaterThanOrEqual(1);
    const withSpeed = shotCount(base.res, base.evs);
    const without = shotCount(noSpeed.res, noSpeed.evs);
    expect(withSpeed).toBeGreaterThan(0);
    expect(withSpeed).toBeGreaterThan(without);
  });
});


## ===== (6) S6 BLIND POST-OP OVERRIDE (claude-opus-5, written from kit prose alone) + audit/flags =====
### Short diff vs the driver's override:
###   skill1: DRIVER = skill1:[] + consolidation{triggerLandedPellets:80, shots:3, coreRate:0.9, pelletFraction:1.0, attackDamagePct:72, pierce:true}. BLIND = skill1:[{trigger:hitCount count:80, effects:[gainPierce durationSec:2.2, buff hitRatePct 98.18 durationShots:3, buff attackDamagePct 72 durationShots:3]}].
###     (a) TRIGGER: driver landed-pellet accumulator (triggerLandedPellets:80); blind hitCount:80 round-counter — the blind's OWN flag #1 marks this 10x-ambiguous and gives a recipe; the driver resolved it to landed pellets (owner ruling).
###     (b) PELLET-FIXED-AT-1 / FULL-SHOT CARRY: driver consolidation.pelletFraction:1.0 (MEASURED full-shot merge, atkPct 201.5); blind has NO clamp primitive (its flag #2 notes the gap) — it cannot express 'fixed at 1'.
###     (c) PIERCE: driver per-shot pierceActive on the consolidation bullet (window-scoped, no whole-fight tag); blind gainPierce durationSec:2.2 (an argued seconds-approximation of 3 rounds).
###     (d) S1 HIT RATE 98.18%: driver unmodeled (in-mode effect carried by the consolidation config); blind explicit hitRatePct 98.18 durationShots:3 buff.
###   skill2: IDENTICAL semantics — passive pierceDamagePct 55.08 (continuous) + fullBurstEnter atkPct 75.24 / hitRatePct 40.68 (FB-window). Both agree on fullBurstEnter (NOT burstCast) keying.
###   burst: IDENTICAL — burstCast attackSpeedPct 65 / atkPct 88.12 / pelletCountFlat 5, all 15s.
###   unmodeled: driver lists S1 'Hit Rate 98.18%' + '160 pellets Pierce range 200%' (both inert on the partless boss); blind lists the Pierce-range 200% line.

### S6 blind override JSON:
{
  "slug": "dorothy-serendipity",
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "hitCount",
        "count": 80
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "gainPierce",
          "durationSec": 2.2
        },
        {
          "kind": "buff",
          "stat": "hitRatePct",
          "value": 98.18,
          "durationShots": 3
        },
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 72,
          "durationShots": 3
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
          "stat": "pierceDamagePct",
          "value": 55.08
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
          "stat": "atkPct",
          "value": 75.24,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "hitRatePct",
          "value": 40.68,
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
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "attackSpeedPct",
          "value": 65,
          "durationSec": 15
        },
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 88.12,
          "durationSec": 15
        },
        {
          "kind": "buff",
          "stat": "pelletCountFlat",
          "value": 5,
          "durationSec": 15
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [
      "Pellet count is fixed at 1 for 3 round(s).",
      "Expands Pierce range by 200% for 3 round(s)."
    ],
    "skill2": [],
    "burst": []
  },
  "caveats": [
    "⚑ hitCount:80 — kit counts landed PELLETS, not trigger pulls. Whether the engine's hitCount accumulator counts pellets/hits or rounds is UNVERIFIED from the schema alone; if it counts rounds, this block fires ~10x too often and must become count:8-ish (SG hitsPerShot=10, ammo=9).",
    "⚑ 'Pellet count is fixed at 1' is a stat CLAMP with damage consolidation (1 pellet carrying the whole shot's damage), which the EffectDef schema cannot express — pelletCountFlat is an ADDITIVE pellet count whose per-pellet share stays 1/base, so pelletCountFlat:-9 would DIVIDE the shot by 10, the opposite of the real mechanic. Left unmodeled rather than encoded wrong. Net damage effect of the real mechanic ≈ forcing landing fraction to 1 for 3 rounds; the co-active Hit Rate ▲98.18% covers only the CORE lift (sim.ts hrCoreMult), NOT the landing fraction, so this override UNDER-credits the 3-round window by the (1 - landedFraction) share.",
    "⚑ gainPierce has no durationShots field, so the '3 round(s)' pierce window is approximated as durationSec 2.2 (≈3 SG rounds at an assumed base cadence). Every other line of the same block uses durationShots:3 and is faithful.",
    "noFb NOT set anywhere (default OFF / FB-by-timing) — per methodology, per-kit noFb is measured-only and there are no function-damage riders in this kit regardless.",
    "hasPierce top-level flag deliberately NOT set: this kit's Pierce is STEP-GATED behind the 80-pellet threshold, which a whole-fight boolean cannot express (schema's stated gainPierce use case)."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Blind second read of the kit prose only (S6 cross-family). Structure: S1 is a single 80-landed-pellet threshold block granting pierce + Hit Rate + Attack Damage for 3 ROUNDS (durationShots, not seconds — the window spans reloads); its 4th line (pellet count fixed at 1) and the 160-pellet pierce-range expansion are unmodeled (see caveats: no clamp primitive; pierce range is inert vs a single-target boss). S2 is a battle-start Pierce Damage passive (inert in v1 unless the S1 gainPierce is live) plus an FB-scoped ATK/Hit Rate pair keyed to fullBurstEnter with durationSec 10 (assumed FB length). Burst is a self-only 15s attack-speed / ATK / +5-pellet package on burstCast. Interaction worth measuring FIRST: the burst's pelletCountFlat +5 and S1's fix-at-1 clamp are directly contradictory during overlap, and the clamp also lengthens re-accumulation of the next 80 pellets (1 pellet/round instead of 10), so S1 uptime is self-limiting in a way this baseline does not reproduce."
}

### S6 audit + ⚑ flags (estimate + reasoning + recipe):
{
  "flags": [
    {
      "field": "override.skill1[0].trigger.count",
      "estimate": "80 (as written), assuming the engine's hitCount accumulator counts landed PELLETS/hits",
      "reasoning": "The kit says 'hitting the target with 80 pellets'. The methodology's trigger taxonomy warns that hit-count 'counts ROUNDS not pulls', which for an SG (hitsPerShot 10) would make 80 mean 80 SHOTS — ~9 magazines — instead of ~8-16 shots. Off by 10x in one direction. The schema comment for hitCount says 'cumulative hits', which favours pellets, but I cannot read sim.ts's accumulator from this packet.",
      "recipe": "Grep the hitCount increment site in src/sim.ts for whether it adds 1 per trigger pull or hitsPerShot/landed pellets; cross-check against footage by timing the first proc (first appearance of the consolidated single-slug shot) — pellet-counting predicts the proc inside magazine 1-2, round-counting predicts ~t=40s+."
    },
    {
      "field": "override.skill1[0].effects[0].durationSec (gainPierce)",
      "estimate": "2.2 sec ≈ 3 SG rounds",
      "reasoning": "The kit duration is 3 ROUNDS, but gainPierce exposes only durationSec — no durationShots. 2.2s assumes ~1.4 rounds/sec at base cadence; the true window shrinks to ~1.3s under the burst's Attack Speed ▲65% and stretches across a reload if the proc lands on the last round of a magazine.",
      "recipe": "Either (a) extend gainPierce with durationShots in types.ts so it matches the sibling buffs exactly, or (b) measure the pierce window in a probe recording (pierce is visible as through-hits) and pin durationSec per fire-rate state. Until then the 55.08% Pierce Damage passive's uptime is an estimate."
    },
    {
      "field": "override.skill1 — 'Pellet count is fixed at 1' (unmodeled)",
      "estimate": "Real mechanic ≈ landing fraction forced to 1.0 for 3 rounds; baseline under-credits those 3 rounds by roughly (1 − landedFraction) of shot damage, plus whatever the consolidated slug does to core-hit eligibility",
      "reasoning": "The clamp makes one pellet carry the shot's whole damage, so the SG's partial-spray landing loss vanishes. pelletCountFlat is additive with a fixed 1/base per-pellet share, so encoding it as -9 would divide the shot by ~10 — a large wrong number is worse than an honest omission. Also self-limiting: at 1 pellet/round the next 80-pellet threshold takes ~10x longer, which this baseline does not reproduce (S1 uptime here will be too HIGH).",
      "recipe": "Add a pellet-count clamp primitive (e.g. pelletCountFixed:N on the buff, consuming the whole shot multiplier for the clamped pellet) OR a landingFractionOverride. Validate with a solo Dorothy: Serendipity recording: count damage popups per shot (10 small vs 1 large) and compare total damage across the 3-round window against the unclamped sim."
    },
    {
      "field": "override.skill2[1] trigger/durationSec (FB-scoped ATK + Hit Rate)",
      "estimate": "fullBurstEnter + durationSec 10",
      "reasoning": "'Activates only during Full Burst … continuously' is a state gate, not a timed buff. Encoding it as fullBurstEnter+10s assumes the standard FB window; any fullBurstExtend in the comp would leave the tail of FB unbuffed. The alternative encoding (passive trigger + fbGate:'inFb') is state-exact but the fbGate doc says it is 'checked when the trigger fires', which is ill-defined for a passive.",
      "recipe": "Confirm how the engine evaluates fbGate on a passive-trigger block; if it is re-evaluated per frame, switch to passive+fbGate:'inFb' (exact) and drop the durationSec assumption. Otherwise verify no graded comp extends FB beyond 10s."
    },
    {
      "field": "base cadence (pullsPerSec) / reloadFrames — not authored, but load-bearing",
      "estimate": "SG base cadence as datamined; reloadFrames 111",
      "reasoning": "ALWAYS-⚑ #1: rate_of_fire and reloadFrames are known-unreliable datamine fields, and this unit is unusually cadence-sensitive — cadence sets how fast 80 pellets accrue (proc frequency), how long '3 round(s)' lasts in wall-clock, and how much the burst's Attack Speed ▲65% is worth. A cadence error compounds across all three.",
      "recipe": "Read shots/sec directly off an ammo counter in a recording (the instrument that measures the disputed quantity), not off burst-gauge or FB counts; nominal rates must be frame-quantized to 60/ceil(60/nominal)."
    },
    {
      "field": "override.skill1[0].effects[1] hitRatePct magnitude → core",
      "estimate": "98.18 as written, passed straight to the hrCoreMult path",
      "reasoning": "ALWAYS-⚑ #7: the Hit-Rate→core conversion is a derived engine relationship, not a kit number; a 98.18% Hit Rate buff plus S2's 40.68% in FB is a very large combined input, and whether the conversion saturates is unknown to me.",
      "recipe": "Check hrCoreMult's saturation behaviour in sim.ts at ~139% combined Hit Rate; validate the resulting core rate against CORE-HIT popup counts in a Dorothy: Serendipity recording (red 'CORE HIT' popups / total popups) during the S1 window inside Full Burst."
    }
  ],
  "audit": [
    {
      "slot": "skill1",
      "kitLine": "Activates when hitting w/ 80 pellets",
      "status": "IMPLEMENTED",
      "effectOrReason": "trigger {kind:'hitCount', count:80}, target self — recurring threshold trigger, not one-shot. ⚑ pellet-vs-round accounting."
    },
    {
      "slot": "skill1",
      "kitLine": "Gains Pierce for 3 round(s).",
      "status": "IMPLEMENTED",
      "effectOrReason": "gainPierce (durationSec 2.2 ⚑ — no durationShots field on gainPierce). NOT the top-level hasPierce flag: step-gated pierce."
    },
    {
      "slot": "skill1",
      "kitLine": "Hit Rate ▲ 98.18% for 3 round(s).",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff hitRatePct 98.18, durationShots 3 (core-hit lift path). ⚑ HR→core magnitude is measured-only."
    },
    {
      "slot": "skill1",
      "kitLine": "Attack damage ▲ 72% for 3 round(s).",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff attackDamagePct 72 (Damage Up bucket), durationShots 3. Unscoped in the prose — no normal/charge/crit qualifier."
    },
    {
      "slot": "skill1",
      "kitLine": "Pellet count is fixed at 1 for 3 rnd",
      "status": "SKIPPED",
      "effectOrReason": "Stat CLAMP + damage consolidation; schema has no clamp primitive and pelletCountFlat's per-pellet share semantics would invert the mechanic. Verbatim in unmodeled.skill1. Under-credits the window."
    },
    {
      "slot": "skill1",
      "kitLine": "Activates when hitting w/ 160 pellets",
      "status": "SKIPPED",
      "effectOrReason": "Header for the pierce-range line only; carries no other effect, so no empty block authored."
    },
    {
      "slot": "skill1",
      "kitLine": "Expands Pierce range by 200% 3 rnd",
      "status": "SKIPPED",
      "effectOrReason": "Pierce RANGE (how far the piercing shot travels through targets) — inert against a single partless boss; no schema field. Verbatim in unmodeled.skill1."
    },
    {
      "slot": "skill2",
      "kitLine": "Activates at the start of battle",
      "status": "IMPLEMENTED",
      "effectOrReason": "trigger {kind:'passive'}, target self."
    },
    {
      "slot": "skill2",
      "kitLine": "Pierce damage ▲ 55.08% continuously.",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff pierceDamagePct 55.08, no duration (permanent). Schema notes it is v1-inert; kept for completeness + future consumer, and it is the payoff for S1's gainPierce."
    },
    {
      "slot": "skill2",
      "kitLine": "Activates only during Full Burst",
      "status": "IMPLEMENTED",
      "effectOrReason": "trigger {kind:'fullBurstEnter'} + durationSec 10 (team FB, fires on ANY team full burst — prose says 'during Full Burst', not 'when using Burst Skill', so NOT burstCast)."
    },
    {
      "slot": "skill2",
      "kitLine": "ATK ▲ 75.24% continuously.",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff atkPct 75.24, durationSec 10 (⚑ FB length assumption)."
    },
    {
      "slot": "skill2",
      "kitLine": "Hit Rate ▲ 40.68% continuously.",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff hitRatePct 40.68, durationSec 10. Stacks additively with the S1 98.18% when both are live."
    },
    {
      "slot": "burst",
      "kitLine": "Affects self.",
      "status": "IMPLEMENTED",
      "effectOrReason": "trigger {kind:'burstCast'}, target self — own-burst block, so burstCast (not fullBurstEnter); diverges in multi-B3 comps."
    },
    {
      "slot": "burst",
      "kitLine": "Attack speed ▲ 65% for 15 sec.",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff attackSpeedPct 65, durationSec 15 — weapon-state modifier, gates shot count, NOT skippable."
    },
    {
      "slot": "burst",
      "kitLine": "ATK ▲ 88.12% for 15 sec.",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff atkPct 88.12, durationSec 15."
    },
    {
      "slot": "burst",
      "kitLine": "Number of pellets ▲ 5 for 15 sec.",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff pelletCountFlat 5, durationSec 15 — the schema's literal carrier line ('Number of pellets ▲ N', SG-only, threaded through the landing/gauge path)."
    }
  ]
}

## ===== (7) DRIVER'S IMPLEMENTATION =====
### (7a) driver's per-unit spec test — scripts/tests/units/dorothy-serendipity.test.ts (22 assertions, GREEN vs shipped; S2d verified):
// PER-UNIT KIT SPEC — `dorothy-serendipity` (Dorothy: Serendipity, Attacker/SG/Water, Burst III,
// cd 40s, ammo 9, hitsPerShot 10). Kit-autonomy gauntlet 2026-07-25. The SG OVERSPEC variant —
// a DIFFERENT unit from the AR/Water base at slug `dorothy`; never conflate them (P0).
//
// One assertion group per KIT LINE (D1..D9 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters['dorothy-serendipity'].skills):
//   S1 ■ hitting the target with 80 pellets → self: Gains Pierce for 3 round(s)            [D1/D2]
//                                             Hit Rate ▲ 98.18% for 3 round(s)             [U1 — UNMODELED]
//                                             Attack damage ▲ 72% for 3 round(s)           [D3]
//                                             Pellet count fixed at 1 for 3 round(s)       [D1/D2]
//      ■ hitting the target with 160 pellets → self: Expands Pierce range 200% 3 round(s)  [U2 — UNMODELED]
//   S2 ■ start of battle → self: Pierce damage ▲ 55.08% continuously                        [D4]
//      ■ only during Full Burst → self: ATK ▲ 75.24% continuously                           [D5]
//                                 Hit Rate ▲ 40.68% continuously                            [D6]
//   BU ■ self: Attack speed ▲ 65% for 15 sec                                                [D7]
//             ATK ▲ 88.12% for 15 sec                                                       [D8]
//             Number of pellets ▲ 5 for 15 sec                                              [D9]
//
// S1 is NOT a skill-effect block — it is the engine's config-driven `consolidation` primitive
// (src/skills/types.ts ConsolidationConfig): "after landing 80 pellets, for 3 SHOTS fire ONE
// aligned bullet carrying the FULL shot (pelletFraction 1.0) at coreRate, +attackDamagePct,
// Pierce-tagged, no range bonus". The skill1 array is empty by design; the whole S1 mechanic
// lives in `consolidation`. Its observable signature in the event log is a normal-bucket damage
// instance with coreRate === 0.9 (the consolidation coreOverride) — no ordinary SG spray shot
// ever cores at 0.9 (the cone gives 0.01–0.10), so that tag uniquely identifies a consolidated
// bullet. MEASURED facts (owner-confirmed, dorothy-solo-reanalysis.json): the single bullet
// carries the FULL shot (pelletFraction 1.0, atkPct 201.5 = normalAttackMultiplier), cores at
// 0.9, takes NO effective-range bonus. "3 rounds" = 3 shots/episode (the ammo counter drops 3).
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   D1  delete the consolidation block → ZERO coreRate-0.9 bullets and a ~26% total drop. The
//       mechanic is load-bearing, not decorative.
//   D2  the consolidated bullet's atkPct === 201.5 (the WHOLE shot). The naive "1 of 10 pellets"
//       model (pelletFraction 0.1) would give 20.15 — proven by the counterfactual. This is the
//       measured full-shot carry, the single most damage-defining fact of the kit.
//   D3  the +72% Attack Damage is live ON the consolidated bullet: frame-matched against an
//       attackDamagePct=0 run, every consolidated bullet's dmgUp is exactly +0.72 higher.
//   D4  the S2 passive Pierce damage is NOT inert: it feeds the consolidated bullet's dmgUp via
//       the per-shot pierceActive tag. Frame-matched against a pierce-removed run, every
//       consolidated bullet's dmgUp is exactly +0.5508 higher (and the total drops ~9%).
//   D5  the S2 ATK is gated on fullBurstEnter, NOT burstCast: it applies on EVERY team Full Burst
//       window (11× here), and its apply frames are exactly the fullBurstStart frames — whereas a
//       burstCast trigger would apply only on her own 6 casts. dur 600 (10s) discriminates vs a
//       passive (dur null).
//   D6  the S2 FB Hit Rate is live (not the inert stat U1): it lifts her SG core fraction during
//       the FB window via CONE_DELTA, so removing it drops the total ~28%. FB-gated (11× = FB
//       windows, dur 600).
//   D7/D8/D9  each burst buff is pinned to its verbatim value + 15s (900f) duration + one apply
//       per burst cast (6×); removing each individual effect drops the total (load-bearing).
//
// UNMODELED (inert on the partless scope-lock boss; documented, NOT asserted):
//   U1  S1 "Hit Rate ▲ 98.18% for 3 round(s)" — a hit-rate stat the engine does not model as a
//       damage stat. Its in-mode effect (the consolidated bullet lands at ALL bands, even at
//       range) is already baked into the measured consolidation config (it fires the whole fight,
//       not near-only). Carried verbatim in override.unmodeled.skill1.
//   U2  S1 "hitting the target with 160 pellets → Expands Pierce range by 200% for 3 round(s)" —
//       Pierce range is inert against a single partless boss (nothing to pass through to). Carried
//       verbatim in override.unmodeled.skill1.
//
// Fixture: the 720-kit-audit control comp (liter B1 / crown B2 / dorothy-serendipity B3 / helm B3,
// boss Fire — Water's favorable matchup, matching the kit-status PH-water board). The B1/B2 core
// gives her a real rotation so the B3 actually casts (a lone B3 makes ZERO Full Bursts).
// Deterministic (no seed) → totals are byte-stable and the frame-matched dmgUp deltas are exact.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import { controlComp, runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const DS = 'dorothy-serendipity';
/** controlComp slot order: liter 0 / crown 1 / dorothy-serendipity 2 / helm 3. */
const DS_SLOT = 2;
/** normalAttackMultiplier — the full-shot magnitude a consolidated bullet must carry. */
const NORMAL_MULT = 201.5;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp(DS),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, total: totals(res)[DS] };
}

// ---- readers ----------------------------------------------------------------------------------
/** Consolidated bullets: normal-bucket damage at the consolidation coreOverride (0.9). No
 *  ordinary SG spray shot cores at 0.9, so this tag is unique to the consolidation mechanic. */
const consol = (evs: SimEvent[]): Damage[] =>
  evs.filter(
    (e): e is Damage =>
      e.kind === 'damage' && e.slug === DS && e.bucket === 'normal' && Math.abs(e.coreRate - 0.9) < 1e-6,
  );
/** dorothy-serendipity's OWN self-buffs (caster = holder = her slot), one stat/value. */
const selfBuff = (evs: SimEvent[], stat: string, value: number): BuffApply[] =>
  evs.filter(
    (e): e is BuffApply =>
      e.kind === 'buffApply' &&
      e.casterIdx === DS_SLOT &&
      e.targetIdx === DS_SLOT &&
      e.stat === stat &&
      e.value === value,
  );
const fbStartFrames = (evs: SimEvent[]): number[] =>
  evs.filter((e) => e.kind === 'fullBurstStart').map((e) => e.frame);
const dsBurstCount = (evs: SimEvent[]): number =>
  evs.filter((e) => e.kind === 'burstCast' && e.slug === DS).length;
/** Frame-match consolidated bullets between two runs and collect the per-bullet dmgUp delta
 *  (base − other). The consolidation trigger timing is independent of attackDamagePct /
 *  pierceDamagePct (those affect damage, not the landed-pellet accrual), so the frames align. */
function consolDmgUpDelta(base: SimEvent[], other: SimEvent[]): number[] {
  const byFrame = new Map(consol(other).map((d) => [d.frame, d]));
  const out: number[] = [];
  for (const d of consol(base)) {
    const m = byFrame.get(d.frame);
    if (m) out.push(Math.round((d.mult.dmgUp - m.mult.dmgUp) * 1e4) / 1e4);
  }
  return out;
}

// ---- counterfactual / isolation patches -------------------------------------------------------
/** D1: the whole consolidation mechanic removed. */
const dsNoConsol = withPatchedOverride(DS, (ov) => {
  if (!ov.consolidation) throw new Error('dorothy-serendipity consolidation block missing — fixture is stale');
  delete ov.consolidation;
});
/** D2: the nearest wrong model — the consolidated bullet carries ONE pellet (1/10 shot), not the
 *  full shot. */
const dsPelletTenth = withPatchedOverride(DS, (ov) => {
  ov.consolidation.pelletFraction = 0.1;
});
/** D3: the consolidation's +72% Attack Damage zeroed. */
const dsNoAtkDmg = withPatchedOverride(DS, (ov) => {
  ov.consolidation.attackDamagePct = 0;
});
/** D4: the S2 passive Pierce damage removed. */
const dsNoPierce = withPatchedOverride(DS, (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !b.effects.some((e: any) => e.stat === 'pierceDamagePct'));
  if (ov.skill2.length === before) throw new Error('dorothy-serendipity S2 pierceDamagePct block missing — fixture is stale');
});
/** D5: the S2 FB block re-triggered on burstCast (the nearest wrong gate). */
const dsFbToCast = withPatchedOverride(DS, (ov) => {
  const b = ov.skill2.find((x: any) => x.trigger.kind === 'fullBurstEnter');
  if (!b) throw new Error('dorothy-serendipity S2 fullBurstEnter block missing — fixture is stale');
  b.trigger.kind = 'burstCast';
});
/** D6: the S2 FB Hit Rate removed. */
const dsNoHitRate = withPatchedOverride(DS, (ov) => {
  const b = ov.skill2.find((x: any) => x.trigger.kind === 'fullBurstEnter');
  if (!b) throw new Error('dorothy-serendipity S2 fullBurstEnter block missing — fixture is stale');
  b.effects = b.effects.filter((e: any) => e.stat !== 'hitRatePct');
});
/** Remove ONE effect from the burst block (D7/D8/D9 isolation). */
const rmBurstEffect = (stat: string) =>
  withPatchedOverride(DS, (ov) => {
    const b = ov.burst.find((x: any) => x.effects.some((e: any) => e.stat === stat));
    if (!b) throw new Error(`dorothy-serendipity burst ${stat} effect missing — fixture is stale`);
    b.effects = b.effects.filter((e: any) => e.stat !== stat);
  });
const dsNoAtkSpd = rmBurstEffect('attackSpeedPct');
const dsNoBurstAtk = rmBurstEffect('atkPct');
const dsNoPellets = rmBurstEffect('pelletCountFlat');

// ---- runs (hoisted: each is a full 180s deterministic sim) ------------------------------------
const base = run();
const noConsol = run({ [DS]: dsNoConsol });
const pelletTenth = run({ [DS]: dsPelletTenth });
const noAtkDmg = run({ [DS]: dsNoAtkDmg });
const noPierce = run({ [DS]: dsNoPierce });
const fbToCast = run({ [DS]: dsFbToCast });
const noHitRate = run({ [DS]: dsNoHitRate });
const noAtkSpd = run({ [DS]: dsNoAtkSpd });
const noBurstAtk = run({ [DS]: dsNoBurstAtk });
const noPellets = run({ [DS]: dsNoPellets });

describe('dorothy-serendipity — kit spec', () => {
  describe('consolidation config — verbatim kit values + measured carry/core', () => {
    const shipped: any = loadOverride(DS);
    it('encodes the S1 mechanic as the consolidation primitive (skill1 array empty)', () => {
      expect(shipped.skill1).toEqual([]);
      expect(shipped.consolidation, 'consolidation block missing').toBeTruthy();
    });
    it('pins the verbatim kit numbers and the two measured constants', () => {
      expect(shipped.consolidation).toMatchObject({
        triggerLandedPellets: 80, // kit: "hitting the target with 80 pellets"
        shots: 3, // kit: "for 3 round(s)" = 3 shots/episode (owner-confirmed)
        attackDamagePct: 72, // kit: "Attack damage ▲ 72%"
        pierce: true, // kit: "Gains Pierce"
        pelletFraction: 1, // MEASURED: the single bullet carries the FULL shot
        coreRate: 0.9, // MEASURED: reliable core on the aligned bullet
      });
    });
    it('carries the two inert S1 lines verbatim in unmodeled (not dropped, not ignored)', () => {
      expect(shipped.unmodeled.skill1).toContain('Hit 160 pellets: Expands Pierce range 200% 3 rounds');
      expect(shipped.unmodeled.skill1).toContain('Hit Rate ▲ 98.18% 3 rounds');
    });
  });

  describe('D1 — S1 consolidation fires (80 landed pellets → 3 single-bullet rounds)', () => {
    it('produces consolidated bullets (coreRate 0.9) across the fight', () => {
      expect(consol(base.events).length).toBeGreaterThan(0);
    });
    it('DISCRIMINATING: removing the consolidation block produces none and drops the total', () => {
      expect(consol(noConsol.events).length).toBe(0);
      expect(noConsol.total).toBeLessThan(base.total);
    });
  });

  describe('D2 — the consolidated bullet carries the FULL shot (pelletFraction 1.0)', () => {
    it('every consolidated bullet is at the full normal-attack magnitude (201.5), not a pellet', () => {
      const atkPcts = [...new Set(consol(base.events).map((d) => d.atkPct))];
      expect(atkPcts).toEqual([NORMAL_MULT]);
    });
    it('DISCRIMINATING: a 1-of-10-pellet model (pelletFraction 0.1) collapses the bullet to ~20.15', () => {
      for (const d of consol(pelletTenth.events)) {
        expect(d.atkPct, 'a per-pellet bullet would be ~20.15, far below the full shot').toBeLessThan(100);
      }
      expect(consol(pelletTenth.events).length).toBeGreaterThan(0);
    });
  });

  describe('D3 — S1 Attack damage ▲72% is live on the consolidated bullet', () => {
    it('every consolidated bullet carries exactly +0.72 dmgUp vs an attackDamagePct=0 run', () => {
      const deltas = consolDmgUpDelta(base.events, noAtkDmg.events);
      expect(deltas.length, 'no frame-matched consolidated bullets').toBe(consol(base.events).length);
      expect([...new Set(deltas)]).toEqual([0.72]);
    });
    it('DISCRIMINATING: zeroing the 72% drops the total', () => {
      expect(noAtkDmg.total).toBeLessThan(base.total);
    });
  });

  describe('D4 — S2 Pierce damage ▲55.08% (continuous passive, live on the consolidated bullet)', () => {
    const applied = selfBuff(base.events, 'pierceDamagePct', 55.08);
    it('is a single continuous passive (dur null), applied once', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.expiresFrame))]).toEqual([null]);
    });
    it('DISCRIMINATING: it feeds the consolidated bullet — removing it drops every bullet\'s dmgUp by 0.5508', () => {
      const deltas = consolDmgUpDelta(base.events, noPierce.events);
      expect(deltas.length).toBe(consol(base.events).length);
      expect([...new Set(deltas)]).toEqual([0.5508]);
      expect(noPierce.total).toBeLessThan(base.total);
    });
  });

  describe('D5 — S2 ATK ▲75.24% is gated on Full Burst entry, not on her own burst cast', () => {
    const applied = selfBuff(base.events, 'atkPct', 75.24);
    it('applies on EVERY team Full Burst window (== fullBurstStart count), not just her casts', () => {
      const fb = fbStartFrames(base.events);
      expect(applied.length).toBe(fb.length);
      expect(applied.length).toBeGreaterThan(dsBurstCount(base.events));
    });
    it('its apply frames are exactly the fullBurstStart frames, for a 10s window', () => {
      expect(applied.map((b) => b.frame).sort((a, b) => a - b)).toEqual(
        [...fbStartFrames(base.events)].sort((a, b) => a - b),
      );
      expect([...new Set(applied.map((b) => b.expiresFrame! - b.frame))]).toEqual([10 * FPS]);
    });
    it('DISCRIMINATING: a burstCast trigger would apply only on her own casts', () => {
      expect(selfBuff(fbToCast.events, 'atkPct', 75.24).length).toBe(dsBurstCount(fbToCast.events));
    });
  });

  describe('D6 — S2 Hit Rate ▲40.68% during Full Burst is live (CONE_DELTA), not the inert U1 stat', () => {
    const applied = selfBuff(base.events, 'hitRatePct', 40.68);
    it('is FB-gated (== fullBurstStart count) for a 10s window', () => {
      expect(applied.length).toBe(fbStartFrames(base.events).length);
      expect([...new Set(applied.map((b) => b.expiresFrame! - b.frame))]).toEqual([10 * FPS]);
    });
    it('DISCRIMINATING: removing it drops the total (it lifts the SG core fraction in the FB window)', () => {
      expect(noHitRate.total).toBeLessThan(base.total);
    });
  });

  describe('D7 — burst Attack speed ▲65% for 15s', () => {
    const applied = selfBuff(base.events, 'attackSpeedPct', 65);
    it('applies once per burst cast (6×) for 15s (900f)', () => {
      expect(applied.length).toBe(dsBurstCount(base.events));
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.expiresFrame! - b.frame))]).toEqual([15 * FPS]);
    });
    it('DISCRIMINATING: removing it drops the total', () => {
      expect(selfBuff(noAtkSpd.events, 'attackSpeedPct', 65).length).toBe(0);
      expect(noAtkSpd.total).toBeLessThan(base.total);
    });
  });

  describe('D8 — burst ATK ▲88.12% for 15s', () => {
    const applied = selfBuff(base.events, 'atkPct', 88.12);
    it('applies once per burst cast (6×) for 15s (900f)', () => {
      expect(applied.length).toBe(dsBurstCount(base.events));
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.expiresFrame! - b.frame))]).toEqual([15 * FPS]);
    });
    it('DISCRIMINATING: removing it drops the total', () => {
      expect(selfBuff(noBurstAtk.events, 'atkPct', 88.12).length).toBe(0);
      expect(noBurstAtk.total).toBeLessThan(base.total);
    });
  });

  describe('D9 — burst Number of pellets ▲5 (pelletCountFlat) for 15s', () => {
    const applied = selfBuff(base.events, 'pelletCountFlat', 5);
    it('applies once per burst cast (6×) for 15s (900f)', () => {
      expect(applied.length).toBe(dsBurstCount(base.events));
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.expiresFrame! - b.frame))]).toEqual([15 * FPS]);
    });
    it('DISCRIMINATING: removing it drops the total', () => {
      expect(selfBuff(noPellets.events, 'pelletCountFlat', 5).length).toBe(0);
      expect(noPellets.total).toBeLessThan(base.total);
    });
  });
});

### (7b) driver's override — src/skills/overrides/dorothy-serendipity.json:
{
  "note": "SG water attacker; pellets = hits (hitsPerShot 10), so pellet-count triggers map to hitCount. S1: hitting the target with 80 pellets (hitCount:80, re-triggers every ~8 shots -> effectively permanent in sustained fire) grants Attack Damage 72%; Hit Rate 98.18% kept for fidelity (unmodeled as a stat; its in-mode effect is already carried by the measured consolidation config). 'Pellet count fixed at 1' + 'Gains Pierce' are NOT modeled: the engine fires a fixed 10 hits/shot and Pierce is inert on a single boss, so the pellet-consolidation mechanic can't be expressed - left as-is and flagged uncertain (net effect on a lone boss is roughly a wash but genuinely unclear). S1 second block (160 pellets -> Expand Pierce range 200%) omitted: pierce is inert on a single boss. S2: passive Pierce Damage 55.08% kept (inert, fidelity); the 'only during Full Burst' ATK 75.24% (which the parser dropped as an unsupported trigger) is modeled on fullBurstEnter for 10s (~full-burst length); Hit Rate 40.68% kept for fidelity — now LIVE via CONE_DELTA (2026-07-19): lifts her SG core fraction during the team-FB window (a previously unaccounted HOT-direction contributor; board 1.115). Burst: Attack Speed 65% and ATK 88.12% kept; 'Number of pellets +5 for 15s' is now modeled with the real pelletCountFlat primitive (2026-07-21, A4): +5 effective SG pellets (10->15) for 15s, threaded through the SG landing/gauge path so the extra pellets take the SAME per-pellet cone landing / range falloff / shot-level core as the base spread (each pellet = 1/10 of the shot). SUPERSEDES the prior normalAttackPct +50% proxy — DAMAGE-NEUTRAL for her (single normal-mult; landing byte-identical, verified regression-stable + a standalone byte-identity unit test), the gain is a faithful queryable pellet count. Gauge is base-capped (a +pellets buff does not pump per-trigger burst energy). Consolidation interaction: while 'pellet fixed at 1' is active the burst +5 is dropped (normalScale/pellet path zeroed to the consolidated single bullet). The consolidation trigger accrual now uses LANDED pellets (owner ruling 2026-07-21, A4 ruling #2 — kit reads 'after hitting the target with 80 pellets'): landedAcc += bandSg.dmg×hitsPerShot = the cone remodel's per-shot count of pellets landing on the boss body (BAND_SG_HIT_FRAC 0.47–0.8× at scope-lock bands on the default 'small' profile; ≈ eff on 'large'), INCLUDING the +5 burst pellets. Net board: 1.125→1.130 (spread 1.05–1.21; one comp +0.46%, the other −4.16% COLD — the +5 speeds the in-burst trigger while fired→landed slows it overall). ⚑ MEASUREMENT CONFLICT (unresolved, owner-accepted): the earlier fired/all-land accrual was CALIBRATED to her solo (dorothy-solo-reanalysis.json, ~55–64 episodes); landed-count triggers ~1.5–2× less often, so the solo consolidation count now reads LOW — NEEDS solo re-validation before this is trusted. Her residual HOT is a separate composite (SG-spray under-model + gotcha #2 HRCORE), NOT this. See docs/handoffs/2026-07-21-a4-pellet-count-prereg.md. All numbers verbatim from skill text. CONSOLIDATION MODE — CORRECTLY MODELED 2026-07-15 (exact-counter re-read `docs/probe-data/dorothy-solo-reanalysis.json` + owner ammo-count confirmation; SUPERSEDES an earlier misread). Config-driven `consolidation` block: 'after hitting the target with 80 pellets, for 3 rounds pellet count fixed at 1' + Pierce + 98% hit + Attack-dmg 72%. KEY FACTS (all measured/owner-confirmed): (1) the single consolidated bullet carries the FULL shot's damage (pelletFraction 1.0, NOT 0.1 — an earlier '110k' anchor was a DROPPED-DIGIT MISREAD of 1,103,595); it decomposes as full-shot base 237,824 × dmgUp(1+0.72 attack+0.5508 pierce=2.27) × major, body-pierce 540,052 vs measured 551,797 (+2%), core-pierce (major 2.0, NO range) 1,080,103 vs measured 1,103,595 (+2%). (2) NO effective-range bonus on the bullet (range would over-predict 12.6%; engine passes noRange). (3) '3 rounds' = 3 SHOTS/episode (owner: the ammo counter drops by 3), NOT 3 magazines. (4) fires at ALL bands the whole fight (98% hit lands it even at range), NOT near-only; trigger accrues fired pellets (10/shot 'hit the target' on a large boss) -> 80 = ~8 spray shots/episode -> ~30% of shots consolidate = ~58 (measured ~55-64). (5) late 1.27-1.55M values = self-buff ramp (S2 pierce+55%, ATK buildup), NOT burst — she is SOLO and a lone B3 CANNOT burst (0 bursts, correct). Pierce DOUBLE-hit stays OFF (K=1, one number/shot, counter-confirmed). RESULT: dorothy solo 0.44->0.87, comps PH 0.44->0.83, N9 0.35->0.81. REMAINING ~0.13 residual is the shared SG SPRAY under-model (sim spray bucket ~23M vs measured ~32M, ~1.4x short — same as noir 1.56x, an owned clean-anchor solo confirming a real ~1.5x SG-spray under-model; noir reconciliation localizes it). Do NOT close dorothy's residual by tuning consolidation. See open-questions A26. Kit-autonomy gauntlet 2026-07-25: cross-family CORROBORATED — S2b blind re-derivation (claude-fable-5) converged on all 11 load-bearing lines; it independently derived the landed-pellet trigger (triggerLandedPellets, not a hitCount:80 round-counter ~10x too slow), window-scoped pierce (per-shot pierceActive on the consolidation bullet, not whole-fight hasPierce), the MEASURED full-shot MERGE (pelletFraction 1.0 -> atkPct 201.5, not the per-pellet 20.15 self-nerf), and the FB-state vs burstCast keying split (S2 75.24 fires on every team FB window; burst 65/88.12/+5 on her own casts, 15s outliving the 10s FB). No REAL-GOTCHA. New per-unit spec scripts/tests/units/dorothy-serendipity.test.ts (22 assertions) pins every line GREEN vs shipped + RED vs counterfactual. S1 Hit Rate 98.18% stays a documented encoding choice (in-mode effect carried by the consolidation config's all-bands firing + coreRate 0.9; the stat itself is unmodeled).",
  "consolidation": {
    "triggerLandedPellets": 80,
    "shots": 3,
    "coreRate": 0.9,
    "pelletFraction": 1,
    "attackDamagePct": 72,
    "pierce": true
  },
  "unmodeled": {
    "skill1": [
      "Hit 160 pellets: Expands Pierce range 200% 3 rounds",
      "Hit Rate ▲ 98.18% 3 rounds"
    ],
    "skill2": [],
    "burst": []
  },
  "skill1": [],
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
          "stat": "pierceDamagePct",
          "value": 55.08
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
          "stat": "atkPct",
          "value": 75.24,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "hitRatePct",
          "value": 40.68,
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
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "attackSpeedPct",
          "value": 65,
          "durationSec": 15
        },
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 88.12,
          "durationSec": 15
        },
        {
          "kind": "buff",
          "stat": "pelletCountFlat",
          "value": 5,
          "durationSec": 15
        }
      ]
    }
  ]
}

## ===== END OF PACKET — return ONLY the verdict JSON per the contract, saved to scripts/kit-autonomy/results/dorothy-serendipity.json =====
